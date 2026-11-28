import type {AuditLog,Company,PayrollEntry,PayrollResult,PayrollRun,AttendanceMonthlySummary,AttendanceDailyRecord} from '../../domain/types'
import {STORES} from './config'
import {requestToPromise,transactionDone} from './idbUtils'
import {correctionImpacts,type ReopenPayrollInput,type PaidCorrectionInput,type PayrollCorrectionRecord} from '../../modules/payroll/payrollCorrections'
export async function reopenPayroll(db:IDBDatabase,input:ReopenPayrollInput){
 if(!input.reason.trim()||!input.unpaidConfirmed||!input.filingReviewed)throw new Error('정정 사유·미지급 여부·신고 영향 검토를 확인하세요.')
 const tx=db.transaction([STORES.payrollRuns,STORES.payrollEntries,STORES.payrollResults,STORES.company,STORES.attendanceMonthlySummaries,STORES.attendanceDailyRecords,STORES.auditLogs],'readwrite'),done=transactionDone(tx)
 try{
  const all=<T>(s:string)=>requestToPromise<T[]>(tx.objectStore(s).getAll()),runs=await all<PayrollRun>(STORES.payrollRuns),run=runs.find(r=>r.id===input.runId)
  if(!run||!['CONFIRMED','CLOSED'].includes(run.status)||run.paidAt)throw new Error('확정·마감 상태의 미지급 급여만 정정 시작할 수 있습니다. 지급완료 원본은 보존됩니다.')
  const entries=(await all<PayrollEntry>(STORES.payrollEntries)).filter(e=>e.runId===run.id),results=(await all<PayrollResult>(STORES.payrollResults)).filter(r=>r.runId===run.id),company=(await all<Company>(STORES.company))[0]
  const monthly=(await all<AttendanceMonthlySummary>(STORES.attendanceMonthlySummaries)).filter(r=>r.period===run.period),daily=(await all<AttendanceDailyRecord>(STORES.attendanceDailyRecords)).filter(r=>r.workDate.startsWith(run.period)),at=new Date().toISOString()
  if(input.unlockAttendance&&runs.some(r=>r.id!==run.id&&r.period===run.period&&['CONFIRMED','CLOSED','PAID'].includes(r.status)))throw new Error('동일 귀속월의 다른 확정 급여가 있어 근태 잠금을 해제할 수 없습니다.')
  tx.objectStore(STORES.auditLogs).put({id:'AUD-'+crypto.randomUUID(),occurredAt:at,actor:'HR_ADMIN',action:'REOPEN_PAYROLL_ARCHIVE',entityType:'PAYROLL_RUN',entityId:run.id,detail:JSON.stringify({run,entries,results,reason:input.reason,at,impacts:correctionImpacts,attendance:input.unlockAttendance?{closed:company.attendanceClosed?.[run.period],monthly,daily}:undefined})} satisfies AuditLog)
  tx.objectStore(STORES.payrollRuns).put({...run,status:'DRAFT',validatedAt:null,calculatedAt:null,confirmedAt:null,closedAt:null,attendanceStale:input.unlockAttendance})
  entries.forEach(e=>tx.objectStore(STORES.payrollEntries).put({...e,status:'DRAFT',updatedAt:at}));results.forEach(r=>tx.objectStore(STORES.payrollResults).delete(r.id))
  if(input.unlockAttendance){const closed={...company.attendanceClosed};delete closed[run.period];tx.objectStore(STORES.company).put({...company,attendanceClosed:closed});monthly.forEach(r=>tx.objectStore(STORES.attendanceMonthlySummaries).put({...r,confirmedAt:undefined,confirmedBy:undefined}));daily.forEach(r=>tx.objectStore(STORES.attendanceDailyRecords).put({...r,confirmedAt:undefined,confirmedBy:undefined}))}
  await done
 }catch(e){try{tx.abort()}catch{}await done.catch(()=>{});throw e}
}
export async function applyPaidCorrection(db:IDBDatabase,input:PaidCorrectionInput):Promise<void>{
 if(!input.id||!input.reason.trim()||!input.confirmed||![input.before,input.after].every(n=>Number.isSafeInteger(n)&&n>=0))throw new Error('정정 전후 금액·사유·적용 확인을 입력하세요.')
 const delta=input.after-input.before;if(!delta)throw new Error('정정 차액이 없습니다.')
 if(input.kind==='ADDITIONAL'&&delta<0||input.kind==='DEDUCTION'&&delta>0)throw new Error('정정 구분과 차액 부호가 다릅니다.')
 const tx=db.transaction([STORES.payrollRuns,STORES.payrollEntries,STORES.payrollResults,STORES.auditLogs],'readwrite'),done=transactionDone(tx)
 try{
  const all=<T>(s:string)=>requestToPromise<T[]>(tx.objectStore(s).getAll()),runs=await all<PayrollRun>(STORES.payrollRuns),source=runs.find(r=>r.id===input.sourceRunId),target=runs.find(r=>r.id===input.targetRunId)
  const logs=await all<AuditLog>(STORES.auditLogs)
  if(logs.some(l=>l.action==='PAID_PAYROLL_CORRECTION'&&JSON.parse(l.detail).id===input.id))throw new Error('이미 반영된 정정 요청입니다.')
  if(!source||source.status!=='PAID'||!target||['CONFIRMED','CLOSED','PAID'].includes(target.status)||target.period<=source.period)throw new Error('지급완료 원본과 이후 미확정 반영월을 선택하세요.')
  const entries=await all<PayrollEntry>(STORES.payrollEntries),sourceEntry=entries.find(e=>e.runId===source.id&&e.employmentId===input.employmentId),entry=entries.find(e=>e.runId===target.id&&e.employmentId===input.employmentId),results=await all<PayrollResult>(STORES.payrollResults),sourceResult=results.find(r=>r.runId===source.id&&r.employmentId===input.employmentId)
  if(!entry||!sourceEntry||!sourceResult)throw new Error('원본·반영월의 직원 급여가 필요합니다.')
  const expected=input.kind==='CLASSIFICATION'?sourceResult.taxableEarnings:sourceResult.appliedItemAmounts?.[input.itemCode]
  if(expected===undefined||expected!==input.before)throw new Error('정정 전 금액이 지급완료 원본과 다릅니다.')
  if(input.kind!=='CLASSIFICATION'&&!/^P\d{3}$/.test(input.itemCode))throw new Error('지급항목 정정은 지급코드를 선택하세요. 세금·보험은 정산 항목을 사용하세요.')
  if(logs.some(l=>{if(l.action!=='PAID_PAYROLL_CORRECTION')return false;const c=JSON.parse(l.detail);return c.sourceRunId===source.id&&c.employmentId===input.employmentId&&c.itemCode===input.itemCode&&c.kind===input.kind}))throw new Error('같은 원본 항목에 정정이 이미 존재합니다. 중복 반영하지 않습니다.')
  if(input.kind==='CLASSIFICATION'&&(input.after>sourceResult.grossPay||delta>(entry.nonTaxableAllowance+Object.values(entry.itemAmounts??{}).reduce((s,n)=>s+n,0))))throw new Error('분류 정정 금액과 반영월의 비과세 잔액을 확인하세요.')
  const at=new Date().toISOString(),next={...entry,status:'DRAFT',updatedAt:at,retroPay:entry.retroPay+(input.kind==='ADDITIONAL'?delta:0),otherDeductions:entry.otherDeductions+(input.kind==='DEDUCTION'?-delta:0),classificationAdjustment:(entry.classificationAdjustment??0)+(input.kind==='CLASSIFICATION'?delta:0),memo:entry.memo+' / 원급여 '+source.period+' 정정: '+input.reason}
  tx.objectStore(STORES.payrollEntries).put(next);tx.objectStore(STORES.payrollRuns).put({...target,status:'DRAFT',calculatedAt:null,validatedAt:null});results.filter(r=>r.runId===target.id).forEach(r=>tx.objectStore(STORES.payrollResults).delete(r.id))
  const record:PayrollCorrectionRecord={...input,delta,createdAt:at,actor:'HR_ADMIN',sourceStatus:'PAID',targetStatus:'DRAFT',actualAdditionalPayment:null,impacts:correctionImpacts}
  tx.objectStore(STORES.auditLogs).put({id:'AUD-'+crypto.randomUUID(),occurredAt:at,actor:'HR_ADMIN',action:'PAID_PAYROLL_CORRECTION',entityType:'PAYROLL_RUN',entityId:source.id,detail:JSON.stringify({...record,beforeEntry:entry,afterEntry:next,originalResult:sourceResult})} satisfies AuditLog)
  await done
 }catch(e){try{tx.abort()}catch{}await done.catch(()=>{});throw e}
}
