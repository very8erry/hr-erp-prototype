import assert from 'node:assert/strict'
import {attendanceBasis,monthDates} from '../src/modules/attendance/attendanceBasis'
import {contractHours,validateContract,resolveContract,type WorkContract} from '../src/modules/attendance/workContract'
import {policyRegistry,extractPolicyStandards,policyMarkdown} from '../src/modules/payroll/policyRegistry'
import {defaultCompanyInfo} from '../src/modules/payroll/companyInfo'
import {dayPolicy,type PolicyDocument} from '../src/modules/operations/operations'
import type {AttendanceDailyRecord,AttendanceSetting,WorkSchedule} from '../src/domain/types'
const schedule:WorkSchedule={id:'WS',name:'통상',timezone:'Asia/Seoul',workDays:['MON','TUE','WED','THU','FRI'],startTime:'09:00',endTime:'18:00',breakMinutes:60},setting:AttendanceSetting={id:'AS',employmentId:'E1',workScheduleId:'WS',timezone:'Asia/Seoul',attendancePin:'',badgeId:'',rfidId:'',ordinaryMonthlyHours:209},employee={employmentId:'E1',organizationId:'O1',hireDate:'2025-01-01',terminationDate:null}
const daily=(date:string,h=8):AttendanceDailyRecord=>({id:date,employmentId:'E1',workDate:date,startTime:'09:00',endTime:'18:00',endNextDay:false,breakStart:'12:00',breakMinutes:60,holiday:false,absence:false,activity:dayPolicy(date,[]).weekend?'OFF':'WORK',workedHours:dayPolicy(date,[]).weekend?0:h,overtimeHours:0,nightHours:0,holidayHours:0,holidayOvertimeHours:0,updatedAt:'',updatedBy:'DEMO',editReason:'',payTreatment:'PAID'})
const rows=[...monthDates('2026-10'),...monthDates('2026-11')].map(d=>daily(d)),basis=attendanceBasis('2026-11',employee,setting,schedule,rows,[])
assert.equal(basis.plannedDays,21);assert.equal(basis.plannedHours,168);assert.equal(basis.ordinaryMonthlyHours,209);assert.equal(basis.actualHours,168);assert.equal(basis.paidWeeklyRestHours,40);assert.equal(basis.unpaidShortfallHours,0)
const absence=rows.map(d=>d.workDate==='2026-11-02'?{...d,workedHours:0,activity:'ABSENT' as const,absence:true,payTreatment:'UNPAID' as const}:d),absent=attendanceBasis('2026-11',employee,setting,schedule,absence,[])
assert.equal(absent.unpaidShortfallHours,8);assert.equal(absent.paidWeeklyRestHours,32)
const overlap=rows.map(d=>d.workDate==='2026-11-04'?{...d,workedHours:10,overtimeHours:2,nightHours:2}:d),over=attendanceBasis('2026-11',employee,setting,schedule,overlap,[])
assert.equal(over.actualHours,170,'night is a premium overlap, not additional actual work');assert.equal(over.unpaidShortfallHours,0)
const annual=rows.map(d=>d.workDate==='2026-11-02'?{...d,workedHours:0,activity:'ANNUAL_LEAVE' as const,leaveHours:8,paidCreditHours:8}:d),leave=attendanceBasis('2026-11',employee,setting,schedule,annual,[])
assert.equal(leave.actualHours,160);assert.equal(leave.paidLeaveHours,8);assert.equal(leave.unpaidShortfallHours,0);assert.equal(leave.paidWeeklyRestHours,40)
const missing=attendanceBasis('2026-11',employee,setting,schedule,[],[]);assert.equal(missing.paidWeeklyRestHours,0);assert.equal(missing.missingDates.length,21);assert(missing.weeklyRest.every(w=>w.status==='REVIEW'))
const c:WorkContract={...resolveContract(setting,schedule,'2026-11-01')!,id:'REDUCED',from:'2026-11-16',to:'2026-12-31',endTime:'16:00',weeklyPaidRestHours:6,ordinaryMonthlyHours:157,kind:'CHILDCARE_REDUCTION',reason:'육아기 단축',recordedAt:''};validateContract(c)
const reducedRows=rows.map(r=>r.workDate>='2026-11-16'&&r.activity==='WORK'?{...r,workedHours:6}:r),reduced=attendanceBasis('2026-11',employee,{...setting,contracts:[c]},schedule,reducedRows,[])
assert.equal(reduced.plannedHours,80+66);assert.equal(reduced.actualHours,reduced.plannedHours);assert.equal(reduced.ordinaryMonthlyHours,157);assert(reduced.warnings.some(w=>w.includes('월 중')))
const hired=attendanceBasis('2026-11',{...employee,hireDate:'2026-11-16',terminationDate:'2026-11-20'},setting,schedule,rows,[]);assert.equal(hired.plannedHours,40);assert.equal(hired.actualHours,40)
const short={...c,from:'2026-11-01',endTime:'12:00',breakMinutes:0,weeklyPaidRestHours:0,ordinaryMonthlyHours:65,kind:'PART_TIME' as const};assert.equal(contractHours(short).weeklyHours,15)
const none=attendanceBasis('2026-11',employee,undefined,undefined,rows,[]);assert.equal(none.plannedHours,0);assert(none.warnings.length)
const standards=extractPolicyStandards('제29조 1일 8시간, 1주 40시간. 09:00부터 18:00까지. 월 209시간. 임금지급일 매월 25일','2026-01-01');assert.equal(standards.length,8)
assert.equal(extractPolicyStandards('월 소정시간은 회사에서 정한다','2026-01-01').length,0)
const document:PolicyDocument={id:'P1',title:'확정 근로기준',version:2,category:'BYLAW',status:'적용',contents:'확정 기준',effectiveDate:'2026-01-01',source:'첨부 제29조',reviewRequired:false,history:[],standards}
const ctx={settings:[setting],schedules:[schedule],documents:[document],items:[],info:defaultCompanyInfo},registry=policyRegistry(ctx,'2026-11-01');assert(registry.every(r=>r.state==='일치'));assert(policyMarkdown(registry).includes('시스템값'))
const mismatched=policyRegistry({...ctx,settings:[{...setting,ordinaryMonthlyHours:180}]},'2026-11-01');assert.equal(mismatched.find(r=>r.key==='ordinaryMonthlyHours')!.state,'불일치')
const pending=policyRegistry({...ctx,documents:[{...document,reviewRequired:true}]},'2026-11-01');assert(pending.every(r=>r.state==='확인 필요'))
console.log('PASS contractual/calendar month planning; 209 denominator separate; leave, absence, weekly rest, missing records, overtime overlap, hire/termination and effective-date changes; registry compares actual persisted sources')

const full=extractPolicyStandards('월요일부터 금요일까지, 1일 8시간, 1주 40시간. 09:00부터 18:00까지. 표준 휴게시간은 12:00부터 13:00까지 1시간. 주휴일은 일요일. 월 209시간. 임금지급일 매월 25일','2026-01-01');const fullRows=policyRegistry({...ctx,documents:[{...document,standards:full}]},'2026-11-01');assert.equal(fullRows.length,13);assert(fullRows.every(r=>r.state==='일치'));assert(fullRows.some(r=>r.sourceKind==='DERIVED'&&r.key==='averageMonthlyPaidRest'));assert.equal(policyRegistry({...ctx,settings:[{...setting,ordinaryMonthlyHours:180}],documents:[{...document,reviewRequired:true}]},'2026-11-01').filter(r=>r.mismatch).length,0);console.log('PASS explicit document schedule/rest extraction, derived monthly figures and unapproved-rule warning separation')
