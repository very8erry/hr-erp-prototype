import {STORES} from './config'
import {requestToPromise,transactionDone} from './idbUtils'
import type {Company,PayrollRun,PayrollEntry,PayrollResult,AttendanceMonthlySummary,AttendanceDailyRecord,DailyWorkRecord,AuditLog} from '../../domain/types'
import type {FilingDraft,Issue} from '../../modules/operations/operations'
export type ResetScope='PAYROLL'|'ATTENDANCE_PAYROLL'|'DAILY_STATUS'
export async function resetScope(db:IDBDatabase,scope:ResetScope,period:string,backupConfirmed:boolean){
 if(!backupConfirmed||!/^\d{4}-(0[1-9]|1[0-2])$/.test(period))throw new Error('전체 백업 저장과 초기화 귀속월을 확인하세요.')
 if(!['PAYROLL','ATTENDANCE_PAYROLL','DAILY_STATUS'].includes(scope))throw new Error('초기화 범위를 선택하세요.')
 const tx=db.transaction([STORES.company,STORES.payrollRuns,STORES.payrollEntries,STORES.payrollResults,STORES.attendanceMonthlySummaries,STORES.attendanceDailyRecords,STORES.dailyWorkRecords,STORES.filingDrafts,STORES.issues,STORES.auditLogs],'readwrite'),done=transactionDone(tx)
 try{const all=<T>(s:string)=>requestToPromise<T[]>(tx.objectStore(s).getAll()),company=(await all<Company>(STORES.company))[0],before:Record<string,unknown[]>={},now=new Date().toISOString()
 if(scope==='DAILY_STATUS'){const rows=(await all<DailyWorkRecord>(STORES.dailyWorkRecords)).filter(r=>r.workDate.startsWith(period));before.dailyWorkRecords=rows;rows.forEach(r=>tx.objectStore(STORES.dailyWorkRecords).put({...r,confirmedAt:undefined,confirmedBy:undefined}));const closed={...company.dailyClosed};delete closed[period];tx.objectStore(STORES.company).put({...company,dailyClosed:closed})}
 else{
  const runs=(await all<PayrollRun>(STORES.payrollRuns)).filter(r=>r.period===period),ids=new Set(runs.map(r=>r.id));before.payrollRuns=runs;runs.forEach(r=>tx.objectStore(STORES.payrollRuns).delete(r.id))
  for(const name of [STORES.payrollEntries,STORES.payrollResults] as const){const rows=(await all<PayrollEntry|PayrollResult>(name)).filter(r=>ids.has(r.runId));before[name]=rows;rows.forEach(r=>tx.objectStore(name).delete(r.id))}
  const drafts=(await all<FilingDraft>(STORES.filingDrafts)).filter(d=>d.sourcePayroll.some(id=>ids.has(id)));before.filingDrafts=drafts;drafts.forEach(d=>tx.objectStore(STORES.filingDrafts).delete(d.id))
  if(scope==='ATTENDANCE_PAYROLL'){
   const monthly=(await all<AttendanceMonthlySummary>(STORES.attendanceMonthlySummaries)).filter(r=>r.period===period),daily=(await all<AttendanceDailyRecord>(STORES.attendanceDailyRecords)).filter(r=>r.workDate.startsWith(period));before.attendanceMonthlySummaries=monthly;before.attendanceDailyRecords=daily;monthly.forEach(r=>tx.objectStore(STORES.attendanceMonthlySummaries).delete(r.id));daily.forEach(r=>tx.objectStore(STORES.attendanceDailyRecords).delete(r.id));const dailyIds=new Set(daily.map(d=>d.id)),issues=(await all<Issue>(STORES.issues)).filter(i=>!i.manual&&dailyIds.has(i.sourceId));before.issues=issues;issues.forEach(i=>tx.objectStore(STORES.issues).delete(i.id));const closed={...company.attendanceClosed};delete closed[period];tx.objectStore(STORES.company).put({...company,attendanceClosed:closed,demoRebuiltPeriods:[...new Set([...company.demoRebuiltPeriods??[],period])]})
  }else tx.objectStore(STORES.company).put({...company,demoRebuiltPeriods:[...new Set([...company.demoRebuiltPeriods??[],period])]})
 }
 tx.objectStore(STORES.auditLogs).put({id:'AUD-'+crypto.randomUUID(),occurredAt:now,actor:'HR_ADMIN',action:'SCOPED_RESET',entityType:'COMPANY',entityId:company.id,detail:JSON.stringify({scope,period,before,companyBefore:company})} satisfies AuditLog);await done
 }catch(e){try{tx.abort()}catch{}await done.catch(()=>{});throw e}
}
