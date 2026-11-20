import 'fake-indexeddb/auto'
import {IndexedDbHrRepository} from './src/infrastructure/db/indexedDb.ts'
import {PayrollService} from './src/modules/payroll/payrollService.ts'
const repo=new IndexedDbHrRepository();await repo.initialize();const s=new PayrollService(repo)
const org=(await repo.listOrganizations())[0]
const id=await repo.registerEmployee({fullName:'가상검증',englishName:'Sample Person',hanjaName:'',birthDate:'1990-01-01',employeeNumber:'CHECK-01',hireDate:'2020-01-01',annualSalary:50160000,organizationId:org.id,grade:'사원',job:'검증',gender:'F',mobile:'',nameReviewed:true})
const run=await s.createRun({period:'2026-11',payDate:'2026-11-25',note:'isolated'})
const model=(await s.attendance())[0]
const row={...model,employmentId:id,period:run.period,confirmedAt:undefined,confirmedBy:undefined,revision:undefined,workedHours:160,overtimeHours:2,holidayHours:0,nightHours:0}
await s.saveAttendanceBatch([row],[],'2시간');await s.syncAttendance(run.id);await s.calculate(run.id)
const inspect=async()=>{const e=(await s.entries(run.id)).find(x=>x.employmentId===id),r=(await s.results(run.id)).find(x=>x.employmentId===id),a=(await s.attendance()).find(x=>x.employmentId===id&&x.period===run.period);return {sourceHours:a.overtimeHours,sourceRevision:a.revision,inputHours:e.calculationInputs?.overtimeHours,markedRevision:e.attendanceRevision,gross:r?.grossPay,stale:(await s.run(run.id)).attendanceStale,status:(await s.run(run.id)).status}}
const before=await inspect(),old=(await s.attendance()).find(x=>x.employmentId===id&&x.period===run.period)
await s.saveAttendanceBatch([{...old,overtimeHours:10}],[],'10시간');const changed=await inspect();const verify=await s.validate(run.id);const after=await inspect()
await s.syncAttendance(run.id);await s.validate(run.id);const synced=await inspect()
console.log(JSON.stringify({before,changed,verify,after,synced},null,2))
import assert from 'node:assert/strict'
const payrollResult=(await s.results(run.id)).find(x=>x.employmentId===id)
assert.equal(payrollResult.netPay,payrollResult.grossPay-payrollResult.totalDeductions)
await assert.rejects(()=>s.closeAttendance(run.period),/누락/)
assert.equal(await s.isAttendanceClosed(run.period),false)
await s.saveEntry({...((await s.entries(run.id)).find(x=>x.employmentId===id)),memo:'입력 갱신'})
await assert.rejects(()=>s.status(run.id,'CONFIRMED'),/검증/)
console.error('PASS R05 missing attendance rejected, month open; R07 gross minus deductions equals net; R09 DRAFT confirmation rejected')
