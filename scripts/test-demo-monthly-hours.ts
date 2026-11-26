import assert from 'node:assert/strict'
import {createSeedBundle} from '../src/fixtures/seed'
import {demoScheduledHours,standardOrdinaryHours,demoMonthlyBasis} from '../src/fixtures/demoAttendance'
import {summaryFromDaily} from '../src/infrastructure/db/operationsUpgrade'
import {columns,attendanceRows,parseAttendance} from '../src/modules/attendance/attendanceFiles'
import type {AttendanceDailyRecord,EmployeeView} from '../src/domain/types'
const seed=createSeedBundle()
assert(seed.workSchedules.every(s=>standardOrdinaryHours(s)===209))
assert.equal(demoScheduledHours('2026-10','2026-10-01',null),160)
assert.equal(demoScheduledHours('2026-10','2026-10-12','2026-10-16'),40)
const employment=new Map(seed.employments.map(e=>[e.id,e]))
for(const r of seed.attendanceMonthlySummaries){
  const e=employment.get(r.employmentId)!
  assert.equal(r.ordinaryMonthlyHours,209)
  assert.equal(r.scheduledHours,demoScheduledHours(r.period,e.hireDate,e.terminationDate))
  assert(Math.abs(r.workedHours-(r.scheduledHours-r.leaveDays*8-r.absenceHours-(r.lateMinutes+r.earlyLeaveMinutes)/60+r.overtimeHours+r.holidayHours))<=0.005001)
  assert(r.nightHours<=r.workedHours)
}
const old=seed.attendanceMonthlySummaries[0]
const day=(workDate:string,extra:Partial<AttendanceDailyRecord>={}):AttendanceDailyRecord=>({id:workDate,employmentId:old.employmentId,workDate,startTime:'09:00',endTime:'18:00',endNextDay:false,breakStart:'12:00',breakMinutes:60,holiday:false,absence:false,activity:'WORK',workedHours:8,overtimeHours:0,nightHours:0,holidayHours:0,holidayOvertimeHours:0,updatedAt:'',updatedBy:'DEMO',editReason:'test',...extra})
const days=[day('2026-10-01'),day('2026-10-02',{activity:'ANNUAL_LEAVE',workedHours:0,leaveHours:8,paidCreditHours:8}),day('2026-10-03',{activity:'OFF',offKind:'STATUTORY',workedHours:0}),day('2026-10-05',{exceptionWork:true,holiday:true,holidayHours:8}),day('2026-10-06',{activity:'SICK',workedHours:0,payTreatment:'UNPAID'}),day('2026-10-07',{workedHours:10,overtimeHours:2})]
const summary=summaryFromDaily(old,days)
assert.equal(summary.ordinaryMonthlyHours,209)
assert.equal(summary.scheduledHours,32)
assert.equal(summary.workedHours,26)
assert.equal(summary.paidCreditHours,8)
assert.equal(summary.unpaidHours,8)
assert.equal(summary.overtimeHours,2)
assert.equal(summary.holidayHours,8)
assert.equal(summary.workedHours-summary.overtimeHours-summary.holidayHours+(summary.paidCreditHours??0)+(summary.unpaidHours??0),summary.scheduledHours)
const employee={employmentId:old.employmentId,employeeNumber:'TEST',name:'테스트',workSchedule:seed.workSchedules[0]} as EmployeeView
assert.equal(demoMonthlyBasis({...old,ordinaryMonthlyHours:undefined},employee),209)
const values=attendanceRows([summary],[employee])[0]
assert.equal(values[columns.indexOf('월 기준시간(주휴 포함)')],209)
assert.equal(values[columns.indexOf('월 예정근로시간')],32)
const imported=Object.fromEntries(columns.map((h,i)=>[h,values[i]]))
assert.equal(parseAttendance([imported],[employee],[summary])[0].scheduledHours,32)
const legacy={...imported,소정시간:32};delete (legacy as Record<string,unknown>)['월 예정근로시간']
assert.equal(parseAttendance([legacy],[employee],[summary])[0].ordinaryMonthlyHours,209)
console.log('PASS demo monthly basis, calendar hours, special cases, sum and legacy import')
