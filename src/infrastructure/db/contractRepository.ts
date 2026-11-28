import type {AttendanceSetting,AttendanceMonthlySummary,AttendanceDailyRecord,WorkSchedule,Company,PayrollRun,PayrollResult,AuditLog,EmployeeView} from '../../domain/types'
import type {CalendarEvent} from '../../modules/operations/operations'
import {validateContract,type WorkContract} from '../../modules/attendance/workContract'
import {attendanceBasis,summaryWithBasis} from '../../modules/attendance/attendanceBasis'
import {STORES} from './config'
import {requestToPromise,transactionDone} from './idbUtils'
export async function saveWorkContract(db:IDBDatabase,employee:EmployeeView,contract:WorkContract,expectedRevision:number){
 validateContract(contract)
 const tx=db.transaction([STORES.attendanceSettings,STORES.workSchedules,STORES.attendanceMonthlySummaries,STORES.attendanceDailyRecords,STORES.calendarEvents,STORES.company,STORES.payrollRuns,STORES.payrollResults,STORES.auditLogs],'readwrite'),done=transactionDone(tx)
 try{
  const all=<T>(s:string)=>requestToPromise<T[]>(tx.objectStore(s).getAll()),setting=(await all<AttendanceSetting>(STORES.attendanceSettings)).find(s=>s.employmentId===employee.employmentId)
  if(!setting||(setting.contractRevision??0)!==expectedRevision)throw new Error('근태설정이 변경되었거나 없습니다. 새로 조회하세요.')
  const runs=(await all<PayrollRun>(STORES.payrollRuns)).filter(r=>r.period>=contract.from.slice(0,7)&&r.period<=contract.to.slice(0,7)),company=(await all<Company>(STORES.company))[0]
  if(runs.some(r=>['CONFIRMED','CLOSED','PAID'].includes(r.status))||Object.keys(company.attendanceClosed??{}).some(p=>p>=contract.from.slice(0,7)&&p<=contract.to.slice(0,7)))throw new Error('확정·마감·지급된 기간의 계약은 정정 절차를 먼저 진행하세요.')
  const histories=setting.contracts??[]
  if(histories.some(c=>c.from>=contract.from&&c.from<=contract.to||c.id===contract.id))throw new Error('동일·후속 계약과 적용기간이 겹칩니다. 기존 이력을 보존하세요.')
  const until=new Date(contract.from+'T00:00:00Z');until.setUTCDate(until.getUTCDate()-1)
  const resume=new Date(contract.to+'T00:00:00Z');resume.setUTCDate(resume.getUTCDate()+1)
  const next={...setting,contractRevision:expectedRevision+1,contracts:[...histories.flatMap(c=>c.from<contract.from&&c.to>=contract.from?[{...c,to:until.toISOString().slice(0,10)},...(c.to>contract.to?[{...c,id:c.id+'-RESUME-'+resume.toISOString().slice(0,10),from:resume.toISOString().slice(0,10)}]:[])]:[c]),{...contract,recordedAt:new Date().toISOString()}]}
  const monthly=(await all<AttendanceMonthlySummary>(STORES.attendanceMonthlySummaries)).filter(m=>m.employmentId===employee.employmentId&&m.period>=contract.from.slice(0,7)&&m.period<=contract.to.slice(0,7))
  if(monthly.some(m=>m.confirmedAt))throw new Error('확정 근태의 계약은 정정 절차를 먼저 진행하세요.')
  const schedule=(await all<WorkSchedule>(STORES.workSchedules)).find(s=>s.id===setting.workScheduleId),daily=(await all<AttendanceDailyRecord>(STORES.attendanceDailyRecords)).filter(r=>r.employmentId===employee.employmentId),events=await all<CalendarEvent>(STORES.calendarEvents)
  tx.objectStore(STORES.attendanceSettings).put(next)
  monthly.forEach(m=>tx.objectStore(STORES.attendanceMonthlySummaries).put(summaryWithBasis(m,daily,attendanceBasis(m.period,employee,next,schedule,daily,events))))
  const ids=new Set(runs.map(r=>r.id));runs.forEach(r=>tx.objectStore(STORES.payrollRuns).put({...r,status:'DRAFT',attendanceStale:true,calculatedAt:null,validatedAt:null}));(await all<PayrollResult>(STORES.payrollResults)).filter(r=>ids.has(r.runId)).forEach(r=>tx.objectStore(STORES.payrollResults).delete(r.id))
  tx.objectStore(STORES.auditLogs).put({id:'AUD-'+crypto.randomUUID(),occurredAt:new Date().toISOString(),actor:'HR_ADMIN',action:'UPDATE_WORK_CONTRACT',entityType:'ATTENDANCE_SETTING',entityId:setting.id,detail:JSON.stringify({before:setting,after:next})} satisfies AuditLog)
  await done
 }catch(e){try{tx.abort()}catch{}await done.catch(()=>{});throw e}
}
