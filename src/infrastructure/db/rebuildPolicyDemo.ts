import type {AttendanceDailyRecord,AttendanceMonthlySummary,AttendanceSetting,AuditLog,Company,EmployeeView,LeaveCase,PayrollEntry,PayrollItemMaster,PayrollResult,PayrollRun,WorkSchedule} from '../../domain/types'
import type {CalendarEvent} from '../../modules/operations/operations'
import {STORES} from './config'
import {requestToPromise,transactionDone} from './idbUtils'
import {correctedDemoDay} from './operationsUpgrade'
import {scenarioIds} from '../../fixtures/scenarios'
import {attendanceBasis,monthDates,summaryWithBasis} from '../../modules/attendance/attendanceBasis'
import {resolveContract,contractHours,type WorkContract} from '../../modules/attendance/workContract'
import {calculatePayrollEntry} from '../../modules/payroll/payrollRules'
import {extraItems} from '../../modules/payroll/itemDefaults'
import {defaultSettlements} from '../../modules/payroll/companyInfo'
export interface RebuildDemoReport {periods:string[];employees:number;daily:number;monthly:number;payroll:number;skipped:string[];alreadyApplied:boolean}
export async function rebuildPolicyDemo(db:IDBDatabase,employees:EmployeeView[],from:string,to:string,date:string,backupConfirmed:boolean):Promise<RebuildDemoReport>{
 if(!backupConfirmed||!/^202[56]-(0[1-9]|1[0-2])$/.test(from)||!/^202[56]-(0[1-9]|1[0-2])$/.test(to)||from>to||to>date.slice(0,7))throw new Error('백업 저장·재구성 기간을 확인하세요. 미래 월은 재구성하지 않습니다.')
 const names=[STORES.company,STORES.meta,STORES.attendanceDailyRecords,STORES.attendanceMonthlySummaries,STORES.attendanceSettings,STORES.workSchedules,STORES.calendarEvents,STORES.payrollRuns,STORES.payrollEntries,STORES.payrollResults,STORES.payrollItemMasters,STORES.leaveCases,STORES.auditLogs]
 const tx=db.transaction(names,'readwrite'),done=transactionDone(tx)
 try{
 const all=<T>(s:string)=>requestToPromise<T[]>(tx.objectStore(s).getAll()),company=(await all<Company>(STORES.company))[0]
 if(!company.id.startsWith('DEMO')||await requestToPromise(tx.objectStore(STORES.meta).get('importedData')))throw new Error('출처가 확인된 기본 가상회사에서만 재구성할 수 있습니다. 가져온 데이터는 변경하지 않습니다.')
 const periods:string[]=[];for(let y=2025;y<=2026;y++)for(let m=1;m<=12;m++){const p=`${y}-${String(m).padStart(2,'0')}`;if(p>=from&&p<=to&&!company.demoRebuiltPeriods?.includes(p))periods.push(p)}
 const report:RebuildDemoReport={periods:[],employees:0,daily:0,monthly:0,payroll:0,skipped:[],alreadyApplied:!periods.length};if(!periods.length){await done;return report}
 const [daily,monthly,settings,schedules,events,runs,entries,results,storedItems,leaves,logs]=await Promise.all([all<AttendanceDailyRecord>(STORES.attendanceDailyRecords),all<AttendanceMonthlySummary>(STORES.attendanceMonthlySummaries),all<AttendanceSetting>(STORES.attendanceSettings),all<WorkSchedule>(STORES.workSchedules),all<CalendarEvent>(STORES.calendarEvents),all<PayrollRun>(STORES.payrollRuns),all<PayrollEntry>(STORES.payrollEntries),all<PayrollResult>(STORES.payrollResults),all<PayrollItemMaster>(STORES.payrollItemMasters),all<LeaveCase>(STORES.leaveCases),all<AuditLog>(STORES.auditLogs)])
 const items=[...storedItems,...extraItems.filter(i=>!storedItems.some(r=>r.code===i.code))].sort((a,b)=>a.sortOrder-b.sortOrder)
 const originalSettings=structuredClone(settings)
 const eligible=employees.filter(e=>/^EMPLOY-\d{5}$/.test(e.employmentId)),ids=scenarioIds(eligible),manualEntries=new Set<string>();for(const log of logs){if(log.action==='UPDATE_PAYROLL_ENTRY')manualEntries.add(log.entityId);if(log.action==='IMPORT_PAYROLL_INPUT')try{const parsed=JSON.parse(log.detail);for(const e of parsed.after??[])manualEntries.add(e.id)}catch{throw new Error('급여 수정 이력을 해석할 수 없어 재구성을 중단했습니다: '+log.id)}}
 const safePeriods=periods.filter(period=>{const run=runs.find(r=>r.period===period),monthRows=monthly.filter(m=>m.period===period),days=daily.filter(d=>d.workDate.startsWith(period));const reason=run&&run.note!=='가상 월별 실습 급여'?'사용자가 생성한 급여월':entries.some(e=>e.runId===run?.id&&(manualEntries.has(e.id)||!eligible.some(x=>x.employmentId===e.employmentId)))?'수기 급여·사용자 직원 포함':monthRows.some(m=>m.manualEdited||!/^ATTM-\d{5}-|^ATT-DEMO-/.test(m.id))?'수기·출처 불명 월 근태':days.some(d=>d.manualEdited||d.updatedBy!=='DEMO')?'수기 일별 근태':undefined;if(reason){report.skipped.push(`${period}: ${reason}`);return false}return true})
 const at=new Date().toISOString(),settingMap=new Map(settings.map(s=>[s.employmentId,s])),dailyMap=new Map(daily.map(r=>[r.employmentId+'|'+r.workDate,r])),monthlyMap=new Map(monthly.map(m=>[m.employmentId+'|'+m.period,m])),newDaily:AttendanceDailyRecord[]=[],newMonthly:AttendanceMonthlySummary[]=[],touched=new Set<string>()
 for(const e of eligible){const setting=settingMap.get(e.employmentId),schedule=schedules.find(s=>s.id===setting?.workScheduleId);if(!setting||!schedule){report.skipped.push(e.employeeNumber+': 계약 근무일정 미연결');continue}
  if(e.employmentId===ids.maternity&&(setting.contracts??[]).every(c=>c.id.startsWith('DEMO-CONTRACT-'))){
   const baseline=resolveContract({...setting,contracts:[]},schedule,date)!
   const intervals:[string,string,WorkContract['kind'],number,number][]=[['2026-01-01','2026-02-16','PREGNANCY_REDUCTION',8,209],['2026-07-07','2026-07-18','PREGNANCY_REDUCTION',8,209],['2026-10-17','2026-12-31','CHILDCARE_REDUCTION',6,157]]
   const existing=setting.contracts??[]
   const additions=intervals.flatMap(([a,b,kind,rest,monthly])=>safePeriods.filter(p=>p>=a.slice(0,7)&&p<=b.slice(0,7)).map(p=>{
    const dates=monthDates(p),start=a>dates[0]?a:dates[0],end=b<dates.at(-1)!?b:dates.at(-1)!
    return {...baseline,id:'DEMO-CONTRACT-'+e.employmentId+'-'+start,from:start,to:end,kind,startTime:'09:00',endTime:'16:00',weeklyPaidRestHours:rest,ordinaryMonthlyHours:monthly,reason:kind==='PREGNANCY_REDUCTION'?'기존 임신기 단축 이슈 유지 · 임금보전':'기존 육아기 단축 이슈 유지 · 주30시간',recordedAt:at}
   })).filter(c=>!existing.some(old=>old.from<=c.to&&old.to>=c.from))
   if(additions.length){setting.contracts=[...existing,...additions].sort((a,b)=>a.from.localeCompare(b.from));setting.contractRevision=(setting.contractRevision??0)+1;tx.objectStore(STORES.attendanceSettings).put(setting)}
  }
  const allDays=daily.filter(d=>d.employmentId===e.employmentId&&!safePeriods.includes(d.workDate.slice(0,7))),byMonth=new Map<string,AttendanceDailyRecord[]>()
  for(const period of safePeriods){const rows=monthDates(period).filter(d=>d<=date&&d>=e.hireDate&&(!e.terminationDate||d<=e.terminationDate)).map(d=>{
    const old=dailyMap.get(e.employmentId+'|'+d),generated=correctedDemoDay(e,d,eligible,events),contract=resolveContract(setting,schedule,d)!,h=contractHours(contract),isNormal=generated.activity==='WORK'&&!generated.exceptionWork&&!generated.note
    const row={...generated,...(isNormal?{startTime:contract.startTime,endTime:contract.endTime,breakMinutes:contract.breakMinutes,workedHours:h.dailyHours,overtimeHours:0,nightHours:0,holidayHours:0,holidayOvertimeHours:0}:{}),paidCreditHours:generated.payTreatment==='BENEFIT'?0:generated.paidCreditHours,id:old?.id??generated.id,attachments:old?.attachments??generated.attachments,scheduledHours:h.dailyHours,confirmedAt:undefined,confirmedBy:undefined,updatedAt:at}
    newDaily.push(row);return row
   });if(rows.length){byMonth.set(period,rows);allDays.push(...rows);touched.add(e.employmentId)}}
  for(const [period,rows] of byMonth){const old=monthlyMap.get(e.employmentId+'|'+period)??{id:`ATT-DEMO-${e.employmentId}-${period}`,employmentId:e.employmentId,period,organizationNameSnapshot:e.organizationName,gradeSnapshot:e.grade,jobSnapshot:e.job,scheduledHours:0,workedHours:0,overtimeHours:0,nightHours:0,holidayHours:0,leaveDays:0,absenceHours:0,lateMinutes:0,earlyLeaveMinutes:0},basis=attendanceBasis(period,e,setting,schedule,allDays,events);newMonthly.push({...summaryWithBasis(old,allDays,basis),issueNote:[...new Set(rows.filter(r=>r.note&&!['WORK','OFF'].includes(r.activity??'WORK')||r.note?.includes('단축')).map(r=>r.workDate.slice(5)+' '+r.note))].join(' / '),lateMinutes:0,earlyLeaveMinutes:0,confirmedAt:undefined,confirmedBy:undefined,updatedAt:at,updatedBy:'DEMO',editReason:'규정·계약 기준 더미 재구성'})}
 }
 const holidayExtras=new Map<string,number>();newDaily.forEach(d=>{const k=d.employmentId+'|'+d.workDate.slice(0,7);holidayExtras.set(k,(holidayExtras.get(k)??0)+d.holidayOvertimeHours)})
 const rebuilt=new Map(newMonthly.map(m=>[m.employmentId+'|'+m.period,m])),updatedEntries:PayrollEntry[]=[],updatedResults:PayrollResult[]=[],updatedRuns:PayrollRun[]=[]
 for(const run of runs.filter(r=>safePeriods.includes(r.period))){const runEntries=entries.filter(e=>e.runId===run.id);if(runEntries.some(e=>!rebuilt.has(e.employmentId+'|'+run.period)))throw new Error(`${run.period}: 모든 급여 대상자의 계약 근태가 필요합니다.`)
  for(const e of runEntries){const m=rebuilt.get(e.employmentId+'|'+run.period)!,next={...e,ordinaryMonthlyHoursSnapshot:m.basis!.ordinaryMonthlyHours,attendanceBasisSnapshot:m.basis,calculationInputs:{ordinaryMonthlyHours:m.basis!.ordinaryMonthlyHours,overtimeHours:m.overtimeHours,nightHours:m.nightHours,holidayHours:m.holidayHours,holidayOvertimeHours:holidayExtras.get(e.employmentId+'|'+run.period)??0},attendanceRevision:m.revision,status:'CALCULATED' as const,updatedAt:at},result=calculatePayrollEntry(next,run.period,items,run.itemOverrides,leaves,run.payDate,company.settlements??defaultSettlements);if(result.errors.length)throw new Error(run.period+' '+e.employeeNumberSnapshot+': '+result.errors.join(' / '));updatedEntries.push(next);updatedResults.push(result)}
  updatedRuns.push({...run,status:'VALIDATED',itemSnapshot:items,settlementSnapshot:company.settlements??defaultSettlements,calculatedAt:at,validatedAt:at,confirmedAt:null,closedAt:null,paidAt:null,attendanceStale:false})
 }
 const closed={...company.attendanceClosed};safePeriods.forEach(p=>delete closed[p]);const before={company,runs:runs.filter(r=>safePeriods.includes(r.period)),entries:entries.filter(e=>updatedRuns.some(r=>r.id===e.runId)),results:results.filter(e=>updatedRuns.some(r=>r.id===e.runId)),settings:originalSettings.filter(s=>touched.has(s.employmentId)),monthly:monthly.filter(m=>safePeriods.includes(m.period))}
 tx.objectStore(STORES.auditLogs).put({id:'AUD-'+crypto.randomUUID(),occurredAt:at,actor:'HR_ADMIN',action:'REBUILD_POLICY_DEMO',entityType:'COMPANY',entityId:company.id,detail:JSON.stringify({before,periods:safePeriods,backupConfirmed,afterState:'VALIDATED · 미확정',dailyOriginalPreservedInDownloadedBackup:true})} satisfies AuditLog)
 newDaily.forEach(r=>tx.objectStore(STORES.attendanceDailyRecords).put(r));newMonthly.forEach(r=>tx.objectStore(STORES.attendanceMonthlySummaries).put(r));updatedEntries.forEach(r=>tx.objectStore(STORES.payrollEntries).put(r));updatedResults.forEach(r=>tx.objectStore(STORES.payrollResults).put(r));updatedRuns.forEach(r=>tx.objectStore(STORES.payrollRuns).put(r));tx.objectStore(STORES.company).put({...company,attendanceClosed:closed,demoPolicyRebuildVersion:1,demoRebuiltPeriods:[...new Set([...company.demoRebuiltPeriods??[],...safePeriods])]})
 Object.assign(report,{periods:safePeriods,employees:touched.size,daily:newDaily.length,monthly:newMonthly.length,payroll:updatedEntries.length});await done;return report
 }catch(e){try{tx.abort()}catch{}await done.catch(()=>{});throw e}
}
