import 'fake-indexeddb/auto'
import assert from 'node:assert/strict'
import {IndexedDbHrRepository} from '../src/infrastructure/db/indexedDb'
import {PayrollService} from '../src/modules/payroll/payrollService'
import {DB_NAME,STORES} from '../src/infrastructure/db/config'
import {requestToPromise,transactionDone} from '../src/infrastructure/db/idbUtils'
import {resolveContract} from '../src/modules/attendance/workContract'
import {rebuildPolicyDemo} from '../src/infrastructure/db/rebuildPolicyDemo'
import {repairDemoOperations} from '../src/infrastructure/db/operationsUpgrade'
import {scenarioIds} from '../src/fixtures/scenarios'
import {buildSimplifiedEarned,importSimplified,simplifiedFields,simplifiedValues,validateSimplified,simplifiedPeriod} from '../src/modules/payroll/simplifiedEarned'
const repo=new IndexedDbHrRepository();await repo.initialize();const svc=new PayrollService(repo),employees=await repo.listEmployees(),ctx=await repo.policyContext(),e=employees.find(e=>ctx.settings.some(s=>s.employmentId===e.employmentId))!,setting=ctx.settings.find(s=>s.employmentId===e.employmentId)!,schedule=ctx.schedules.find(s=>s.id===setting.workScheduleId)!
const c={...resolveContract(setting,schedule,'2026-11-01')!,id:'CONTRACT-TEST',from:'2026-11-01',to:'2026-12-31',reason:'기간별 계약 회귀',recordedAt:''}
await repo.saveWorkContract(e.employmentId,c,0);await assert.rejects(repo.saveWorkContract(e.employmentId,{...c,id:'STALE'},0),/변경/)
await repo.saveWorkContract(e.employmentId,{...c,id:'CONTRACT-NEXT',from:'2026-12-01',endTime:'16:00',weeklyPaidRestHours:6,ordinaryMonthlyHours:157,kind:'CHILDCARE_REDUCTION'},1)
assert.equal((await repo.policyContext()).settings.find(s=>s.id===setting.id)!.contracts![0].to,'2026-11-30')
const run=await svc.createRun({period:'2026-11',payDate:'2026-11-25',note:'manual run'});await svc.calculate(run.id);await svc.status(run.id,'CONFIRMED')
const beforeContract=await repo.exportDatabase();await assert.rejects(repo.saveWorkContract(e.employmentId,{...c,id:'LOCKED',from:'2026-11-02'},2),/확정/);assert.deepEqual((await repo.exportDatabase()).data,beforeContract.data)
const temporaryEmployee=employees.find(x=>x.employmentId!==e.employmentId&&ctx.settings.some(s=>s.employmentId===x.employmentId))!
await repo.saveWorkContract(temporaryEmployee.employmentId,{...c,id:'BASE-2027',from:'2027-01-01',to:'2027-12-31',endTime:'17:00'},0)
await repo.saveWorkContract(temporaryEmployee.employmentId,{...c,id:'TEMP-2027',from:'2027-06-01',to:'2027-06-30',endTime:'16:00'},1)
const restoredContract=(await repo.policyContext()).settings.find(s=>s.employmentId===temporaryEmployee.employmentId)!;assert.equal(restoredContract.contracts!.length,3);assert.equal(resolveContract(restoredContract,schedule,'2027-07-01')!.endTime,'17:00')
console.log('PASS work contract effective history, stale revision rejection, locked period and atomic preservation')
// Scope operations must not remove the other months, source employees, or settings.
const other=await svc.createRun({period:'2026-12',payDate:'2026-12-25',note:'untouched'}),snapshot=await repo.exportDatabase()
await assert.rejects(repo.resetScope('PAYROLL','2026-11',false));assert.deepEqual((await repo.exportDatabase()).data,snapshot.data)
await repo.resetScope('PAYROLL','2026-11',true);assert.equal(await repo.getPayrollRun(run.id),null);assert.deepEqual(await repo.getPayrollRun(other.id),other)
const afterReset=await repo.exportDatabase();assert.deepEqual(afterReset.data.persons,snapshot.data.persons);assert.deepEqual(afterReset.data.attendanceSettings,snapshot.data.attendanceSettings)
await repo.importDatabase(snapshot);const restored=(await repo.exportDatabase()).data;for(const [key,value] of Object.entries(snapshot.data)){if(key==='auditLogs'){for(const log of value as {id:string}[])assert(restored.auditLogs.some(l=>l.id===log.id));continue}assert.equal(JSON.stringify(restored[key as keyof typeof restored]),JSON.stringify(value),'restored '+key)}
console.log('PASS scoped reset backup guard, dependent deletion, unselected source preservation and backup restore with additive import audit')
// A fresh known fixture may be rebuilt, but imported data must never be rewritten.
const db=await requestToPromise(indexedDB.open(DB_NAME));await assert.rejects(rebuildPolicyDemo(db,employees,'2026-10','2026-10','2026-11-27',true),/가져온/)
await repo.resetDemo();const demoPeople=await repo.listEmployees();const generated=await repo.createPayrollRun({period:'2026-09',payDate:'2026-09-25',note:'가상 월별 실습 급여'},true);await svc.calculate(generated.id);await svc.status(generated.id,'CONFIRMED');await svc.closeAttendance(generated.period);await svc.status(generated.id,'CLOSED');await svc.status(generated.id,'PAID');const before=await repo.exportDatabase()
const rebuilt=await rebuildPolicyDemo(db,demoPeople,'2026-09','2026-10','2026-11-27',true);assert(rebuilt.daily>0);assert.equal(rebuilt.periods.length,2);assert(rebuilt.payroll>200);assert.equal((await repo.getPayrollRun(generated.id))!.status,'VALIDATED');assert.equal((await repo.getPayrollRun(generated.id))!.paidAt,null);assert.equal(await svc.isAttendanceClosed(generated.period),false);const rebuiltEntries=await svc.entries(generated.id);assert.deepEqual(rebuiltEntries.map(e=>e.id),before.data.payrollEntries.filter(e=>e.runId===generated.id).map(e=>e.id));assert((await svc.results(generated.id)).every(r=>!r.errors.length));const log=(await repo.exportDatabase()).data.auditLogs.find(l=>l.action==='REBUILD_POLICY_DEMO')!;assert.deepEqual(JSON.parse(log.detail).before.results,before.data.payrollResults)
const rebuiltData=await repo.exportDatabase();assert.deepEqual(rebuiltData.data.persons,before.data.persons);assert.deepEqual(rebuiltData.data.employments,before.data.employments)
const allMonthly=await svc.attendance(),october=allMonthly.filter(m=>m.period==='2026-10');assert(october.length>200);assert(october.every(m=>m.basis&&m.basis.ordinaryMonthlyHours>0));assert(october.every(m=>!m.confirmedAt))
const auditCount=rebuiltData.data.auditLogs.length;const repeated=await rebuildPolicyDemo(db,demoPeople,'2026-09','2026-10','2026-11-27',true);assert.equal(repeated.alreadyApplied,true);assert.equal((await repo.exportDatabase()).data.auditLogs.length,auditCount)
await repairDemoOperations(db,demoPeople);const repaired=await repo.exportDatabase();assert.deepEqual(repaired.data.attendanceDailyRecords,rebuiltData.data.attendanceDailyRecords);assert.deepEqual(repaired.data.attendanceMonthlySummaries,rebuiltData.data.attendanceMonthlySummaries)
// Selecting another month later must append its fixture contract, without replacing prior periods.
const maternityId=scenarioIds(demoPeople).maternity,oldMaternity=(await repo.policyContext()).settings.find(s=>s.employmentId===maternityId)!,octoberContracts=structuredClone(oldMaternity.contracts!)
await rebuildPolicyDemo(db,demoPeople,'2026-01','2026-01','2026-11-27',true)
const laterContext=await repo.policyContext(),laterMaternity=laterContext.settings.find(s=>s.employmentId===maternityId)!,maternitySchedule=laterContext.schedules.find(s=>s.id===laterMaternity.workScheduleId)!
assert.equal(resolveContract(laterMaternity,maternitySchedule,'2026-01-12')!.kind,'PREGNANCY_REDUCTION')
assert.equal(resolveContract(laterMaternity,maternitySchedule,'2026-01-12')!.endTime,'16:00')
for(const old of octoberContracts)assert.deepEqual(laterMaternity.contracts!.find(c=>c.id===old.id),old)
assert(laterMaternity.contracts!.every(c=>c.from.startsWith('2026-01')||c.from.startsWith('2026-10')))
console.log('PASS sequential selected-month demo rebuild preserves earlier contracts and adds pregnancy reduction only in selected months')
// Mark one source as manual; whole-period reconstruction must be skipped atomically.
const tx=db.transaction(STORES.attendanceMonthlySummaries,'readwrite'),done=transactionDone(tx),r=october[0];tx.objectStore(STORES.attendanceMonthlySummaries).put({...r,period:'2026-08',id:allMonthly.find(m=>m.employmentId===r.employmentId&&m.period==='2026-08')?.id??'MANUAL-TEST',manualEdited:true});await done
const skipped=await rebuildPolicyDemo(db,demoPeople,'2026-08','2026-08','2026-11-27',true);assert.equal(skipped.periods.length,0);assert(skipped.skipped.some(s=>s.includes('수기')))
console.log('PASS imported/manual protection; fixture identity preservation, rebuilt month planning, repeated rebuild and refresh stability')
// Real filing projection: only paid source, actual payment half, correct Korean field round trip.
const filingRun=await svc.createRun({period:'2026-11',payDate:'2026-12-25',note:'filing projection'});await svc.calculate(filingRun.id)
const en=await svc.entries(filingRun.id),re=await svc.results(filingRun.id),paid={...filingRun,status:'PAID' as const},profiles=await repo.filingTaxProfiles()
assert.equal(buildSimplifiedEarned(2026,2,demoPeople,[filingRun],en,re,false,'2026-11-27',profiles).length,0)
const filing=buildSimplifiedEarned(2026,2,demoPeople,[paid],en,re,false,'2026-12-31',profiles);assert(filing.length>200);assert(filing.every(r=>r.paymentMonth==='2026-12'));validateSimplified(filing,2026,2,true)
const wire=filing.map(r=>Object.fromEntries(simplifiedFields.map(([,l],i)=>[l,simplifiedValues(r)[i]])));assert.deepEqual(importSimplified(wire,demoPeople,2026,2),filing)
assert.throws(()=>importSimplified([...wire,{...wire[0],가상식별번호:'changed'}],demoPeople,2026,2));assert.throws(()=>validateSimplified([...filing,filing[0]],2026,2))
assert.deepEqual(simplifiedPeriod(2027,4),{from:'2027-04',to:'2027-04',monthly:true})
const late={...paid,payDate:'2027-01-25'},lateRows=buildSimplifiedEarned(2026,2,demoPeople,[late],en,re,false,'2027-01-26',profiles);assert(lateRows.every(r=>r.paymentMonth==='2026-12'))
assert.equal(buildSimplifiedEarned(2027,1,demoPeople,[late],en,re,false,'2027-01-26',profiles).length,0)
console.log('PASS simplified earned-income paid/deemed period, Korean schema import/export, duplicates and identifier protection')
// OPS-14: changing planned task estimates cannot touch payroll source or output.
const beforeOps=await repo.exportDatabase(),info=await svc.companyInfo();await svc.applyWorkSettings({...info.workPlanning!,templateOverrides:{...info.workPlanning?.templateOverrides,TEST:{enabled:true,estimateMin:500,estimateMax:900}}})
const afterOps=await repo.exportDatabase();for(const key of ['payrollRuns','payrollEntries','payrollResults','attendanceMonthlySummaries','attendanceDailyRecords'] as const)assert.deepEqual(afterOps.data[key],beforeOps.data[key])
console.log('PASS OPS-14 estimated task duration has no payroll or attendance writes')
db.close()
