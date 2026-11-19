import 'fake-indexeddb/auto'
import assert from 'node:assert/strict'
import {IndexedDbHrRepository} from '../src/infrastructure/db/indexedDb'
import {DB_NAME} from '../src/infrastructure/db/config'
import {PayrollService} from '../src/modules/payroll/payrollService'
const repo=new IndexedDbHrRepository();await repo.initialize();const svc=new PayrollService(repo)
const run=await svc.createRun({period:'2026-11',payDate:'2026-11-25',note:'consistency regression'})
const entry=(await svc.entries(run.id))[0]
const template=(await svc.attendance())[0]
await svc.saveAttendanceBatch([{...template,id:'CONSISTENCY-ATT',employmentId:entry.employmentId,period:run.period,overtimeHours:2,nightHours:0,holidayHours:0,confirmedAt:undefined,confirmedBy:undefined}],[],'regression setup')
await svc.syncAttendance(run.id)
await svc.calculate(run.id)
const before=(await svc.results(run.id)).find(r=>r.employmentId===entry.employmentId)!
const attendance=(await svc.attendance()).find(a=>a.employmentId===entry.employmentId&&a.period===run.period)!
await svc.saveAttendanceBatch([{...attendance,overtimeHours:10}],[],'2 to 10 hours')
await svc.validate(run.id)
const updated=(await svc.entries(run.id)).find(e=>e.id===entry.id)!
assert.equal(updated.calculationInputs?.overtimeHours,10,'validation must consume latest hours before recording latest revision')
assert.equal(updated.attendanceRevision,(await svc.attendance()).find(a=>a.id===attendance.id)!.revision)
const after=(await svc.results(run.id)).find(r=>r.employmentId===entry.employmentId)!
assert(Math.abs(after.appliedItemAmounts!.P120-before.appliedItemAmounts!.P120*5)<=3,'2→10 hours produces five times the allowance, allowing won rounding')
const info=await svc.companyInfo();await svc.saveCompanyInfo({...info,foundedOn:'2018-11-05'});assert.equal((await svc.companyInfo()).foundedOn,'2018-11-05')
const db=await new Promise<IDBDatabase>((resolve,reject)=>{const request=indexedDB.open(DB_NAME);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)})
await new Promise<void>((resolve,reject)=>{const tx=db.transaction('payrollEntries','readwrite');tx.objectStore('payrollEntries').put({...updated,calculationInputs:{...updated.calculationInputs!,overtimeHours:2}});tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)})
await assert.rejects(svc.status(run.id,'CONFIRMED'),/원본이 다릅니다/)
await svc.validate(run.id)
await svc.status(run.id,'CONFIRMED')
db.close()
const snapshot=await svc.results(run.id)
await assert.rejects(svc.calculate(run.id))
assert.deepEqual(await svc.results(run.id),snapshot)
console.log('PASS latest attendance consumed atomically during validation; confirmed results protected')
const manualRun=await svc.createRun({period:'2026-12',payDate:'2026-12-25',note:'manual/source safety'})
const manual=(await svc.entries(manualRun.id))[0]
await svc.saveEntry({...manual,calculationInputs:null,overtimePay:123456})
await svc.calculate(manualRun.id)
assert.equal((await svc.entries(manualRun.id)).find(e=>e.id===manual.id)!.overtimePay,123456)
await svc.saveEntry({...manual,calculationInputs:{ordinaryMonthlyHours:209,overtimeHours:2,nightHours:0,holidayHours:0,holidayOvertimeHours:0}})
const prior=(await repo.exportDatabase()).data
await assert.rejects(svc.validate(manualRun.id),/근태 연동 원본/)
assert.deepEqual((await repo.exportDatabase()).data,prior,'missing source must not partially update payroll or audits')
console.log('PASS manual amounts preserved; missing source rejected without partial writes; company establishment date persists')
