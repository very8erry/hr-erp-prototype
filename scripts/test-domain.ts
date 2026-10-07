import {calculateAttendanceDay,attendanceDayLabel} from '../src/modules/attendance/timeRules'
import {batchPayrollValues} from '../src/modules/payroll/payrollColumns'
import 'fake-indexeddb/auto'
import assert from 'node:assert/strict'
import { createSeedBundle } from '../src/fixtures/seed'
import { IndexedDbHrRepository } from '../src/infrastructure/db/indexedDb'
import { upgradeDatabaseStructure } from '../src/infrastructure/db/migrations'
import { STORES } from '../src/infrastructure/db/config'
import { transactionDone } from '../src/infrastructure/db/idbUtils'
import { PayrollService } from '../src/modules/payroll/payrollService'
import { calculatePayrollEntry } from '../src/modules/payroll/payrollRules'
import { calculateDailyWorkRecord } from '../src/modules/payroll/dailyWorkerRules'
import { clockHours } from '../src/modules/attendance/timeRules'
import { csvDecode,csvEncode,parseAttendance,attendanceRows,columns } from '../src/modules/attendance/attendanceFiles'
const seed=createSeedBundle()
// Create an actual v5 database, retaining edited attendance and master values.
const request=indexedDB.open('hr-training-simulator',5)
const oldDb=await new Promise<IDBDatabase>((resolve,reject)=>{request.onupgradeneeded=()=>{upgradeDatabaseStructure(request.result,request.transaction!,0);for(const name of [STORES.attendanceDailyRecords,STORES.leaveCases,STORES.payrollSettingsHistory])request.result.deleteObjectStore(name)};request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)})
const tx=oldDb.transaction(Array.from(oldDb.objectStoreNames),'readwrite');const done=transactionDone(tx)
for(const [name,data] of Object.entries(seed)){if(!oldDb.objectStoreNames.contains(name))continue;for(const row of Array.isArray(data)?data:[data])tx.objectStore(name).put(row)}
tx.objectStore(STORES.meta).put({id:'schemaVersion',value:'5'});tx.objectStore(STORES.meta).put({id:'seedVersion',value:'5'});await done;oldDb.close()
const repo=new IndexedDbHrRepository();await repo.initialize();const svc=new PayrollService(repo)
const employees=await repo.listEmployees();const before=await svc.attendance();assert.equal(before.length,seed.attendanceMonthlySummaries.length);assert.equal(before[0].revision,0);assert.equal((await svc.dailyAttendance()).length,0)
assert.equal((await repo.exportDatabase()).schemaVersion,6)
console.log('PASS v5→v6 migration preserves records and does not invent clock data')
const a=before.find(r=>r.period==='2026-09')!;const run=await svc.createRun({period:'2026-09',payDate:'2026-09-25',note:'test'});const entry=(await svc.entries(run.id)).find(e=>e.employmentId===a.employmentId)!
await svc.saveEntry({...entry,bonus:500000,otherEarnings:10000,incomeTaxManual:10000,itemAmounts:{P131:200000}})
const result1=await svc.calculate(run.id);const masterBefore=await svc.itemMasters();const target1=result1.find(r=>r.employmentId===a.employmentId)!
const temporary=Object.fromEntries(masterBefore.map(i=>[i.code,i.active]));temporary.P130=false
const result2=await svc.calculate(run.id,temporary);assert.equal(target1.grossPay-result2.find(r=>r.employmentId===a.employmentId)!.grossPay,500000)
await svc.validate(run.id);assert.equal((await svc.results(run.id)).find(r=>r.employmentId===a.employmentId)!.grossPay,result2.find(r=>r.employmentId===a.employmentId)!.grossPay)
assert.deepEqual(await svc.itemMasters(),masterBefore)
await svc.calculate(run.id,null);assert.equal((await svc.results(run.id)).find(r=>r.employmentId===a.employmentId)!.grossPay,target1.grossPay)
console.log('PASS temporary settings survive validation; reset preserves master')
const original=before.find(r=>r.period==='2026-09'&&employees.find(e=>e.employmentId===r.employmentId)?.hireDate<'2026-01-01')!
const changed={...original,workedHours:200}
await assert.rejects(()=>svc.saveAttendanceBatch([changed,{...changed,employmentId:'invalid'}],[],'invalid import'))
assert.equal((await svc.attendance()).find(r=>r.id===original.id)!.workedHours,original.workedHours)
await svc.saveAttendanceBatch([changed],[],'출퇴근 오류 정정');assert.equal((await svc.run(run.id))!.status,'DRAFT');assert.equal((await svc.results(run.id)).length,0);assert.equal((await svc.attendance()).find(r=>r.id===changed.id)!.manualEdited,true)
console.log('PASS atomic invalid import and payroll invalidation after attendance edit')
const batchEntry=(await svc.entries(run.id))[0];await assert.rejects(()=>svc.saveEntries([{...batchEntry,bonus:12345},{...batchEntry,employmentId:'missing'}]));assert.notEqual((await svc.entries(run.id))[0].bonus,12345);await svc.saveEntries([{...batchEntry,bonus:12345}]);assert.equal((await svc.entries(run.id))[0].bonus,12345);console.log('PASS Korean payroll batch import is atomic')
const targets=(await svc.entries(run.id)).slice(0,2);await svc.saveEntries(batchPayrollValues(targets,'P121',12300,'replace','야간수당 수기 정정'))
for(const t of targets)assert.equal((await svc.entries(run.id)).find(e=>e.id===t.id)!.itemAmounts?.P121,12300)
assert.throws(()=>batchPayrollValues(targets,'prorationRate',2,'replace','bad'))
const oldDaily=(await svc.dailyWorkRecords())[0],dailyWorker=(await svc.dailyWorkers()).find(w=>w.id===oldDaily.dailyWorkerId)!
const priorTotal=oldDaily.grossPay;await svc.saveDailyWorkRecord({...oldDaily,otherAllowance:50000,grossPay:999999999})
const savedDaily=(await svc.dailyWorkRecords()).find(r=>r.id===oldDaily.id)!;assert.equal(savedDaily.grossPay,Math.round(dailyWorker.dailyRate*oldDaily.hours/8+50000));assert.equal(savedDaily.otherAllowance,50000)
await assert.rejects(()=>svc.saveDailyWorkRecords([{...savedDaily,otherAllowance:60000},{...savedDaily,dailyWorkerId:'missing'}]))
assert.equal((await svc.dailyWorkRecords()).find(r=>r.id===oldDaily.id)!.otherAllowance,50000)
assert.equal(calculateDailyWorkRecord({...dailyWorker,dailyRate:200000},'2026-09-01',8,'',{otherAllowance:50000}).incomeTax,2700)
console.log('PASS selective payroll batch edit, daily allowance recalculation and atomic invalid batch')
const baseDay={id:'day',employmentId:original.employmentId,workDate:'2026-09-15',startTime:'09:00',endTime:'18:00',endNextDay:false,breakStart:'12:00',breakMinutes:60,holiday:false,absence:false,activity:'WORK' as const,updatedAt:'',updatedBy:'HR_ADMIN',editReason:'day test',...calculateAttendanceDay({startTime:'09:00',endTime:'18:00',endNextDay:false,breakStart:'12:00',breakMinutes:60,holiday:false,absence:false,activity:'WORK'})}
assert.equal(baseDay.workedHours,8);assert.equal(attendanceDayLabel(baseDay),'09:00~18:00 (8h)')
const halfDay={...baseDay,nonWorkKind:'ANNUAL_LEAVE' as const,nonWorkStartTime:'14:00',nonWorkEndTime:'18:00',nonWorkNextDay:false};assert.equal(calculateAttendanceDay(halfDay).workedHours,4);assert.equal(calculateAttendanceDay(halfDay).leaveHours,4)
for(const activity of ['OFF','SICK','ANNUAL_LEAVE','ABSENT'] as const){const r=calculateAttendanceDay({...baseDay,activity});assert.equal(r.workedHours,0);assert.equal(r.leaveHours,activity==='ANNUAL_LEAVE'?8:0)}
assert.throws(()=>calculateAttendanceDay({...halfDay,nonWorkEndTime:'19:00'}))
await svc.saveAttendanceBatch([], [halfDay], '반차 구간 정정');const persistedDay=(await svc.dailyAttendance()).find(r=>r.workDate==='2026-09-15'&&r.employmentId===original.employmentId)!;assert.equal(persistedDay.workedHours,4);assert.equal(persistedDay.leaveHours,4);assert.match(attendanceDayLabel(persistedDay),/연차 14:00~18:00/)
const annualOriginal=(await svc.annualLeave())[0];await svc.saveAnnualLeave([{...annualOriginal,grantedDays:15,carriedDays:2,adjustedDays:-1,usedDays:5,remainingDays:999}], '연차 증빙 정정');const annualUpdated=(await svc.annualLeave()).find(r=>r.id===annualOriginal.id)!;assert.equal(annualUpdated.remainingDays,11);assert.equal(annualUpdated.manualEdited,true)
await assert.rejects(()=>svc.saveAnnualLeave([{...annualUpdated,grantedDays:20},{...annualUpdated,employmentId:'missing'}], 'bad batch'));assert.equal((await svc.annualLeave()).find(r=>r.id===annualOriginal.id)!.grantedDays,15)
await assert.rejects(()=>svc.saveAnnualLeave([{...annualUpdated,usedDays:999}], 'overuse'))
const r8=await svc.createRun({period:'2026-08',payDate:'2026-08-25',note:'multi month'}),r7=await svc.createRun({period:'2026-07',payDate:'2026-07-25',note:'multi month'}),e8=(await svc.entries(r8.id))[0],e7=(await svc.entries(r7.id))[0]
await svc.saveEntries([{...e8,bonus:32001},{...e7,bonus:32002}]);assert.equal((await svc.entries(r8.id))[0].bonus,32001);assert.equal((await svc.entries(r7.id))[0].bonus,32002)
await assert.rejects(()=>svc.saveEntries([{...e8,bonus:987654},{...e7,bonus:-1}]));assert.equal((await svc.entries(r8.id))[0].bonus,32001)
await svc.saveEntry({...e8,monthlyBasePay:3123456,insuranceOverrides:{nationalPension:1000,healthInsurance:2000,longTermCareInsurance:300,employmentInsurance:400,localIncomeTax:50}});const manualInsurance=(await svc.calculate(r8.id)).find(r=>r.employmentId===e8.employmentId)!;assert.equal(manualInsurance.nationalPension,1000);assert.equal(manualInsurance.healthInsurance,2000);assert.equal(manualInsurance.longTermCareInsurance,300);assert.equal(manualInsurance.employmentInsurance,400);assert.equal(manualInsurance.localIncomeTax,50);assert.equal((await svc.entries(r8.id))[0].monthlyBasePay,3123456)
const dailyMaster=(await svc.dailyWorkers())[0];await assert.rejects(()=>svc.saveDailyWorkers([{...dailyMaster,dailyRate:12345},{...dailyMaster,id:'missing'}]));assert.equal((await svc.dailyWorkers())[0].dailyRate,dailyMaster.dailyRate)
const retired=employees.find(e=>e.terminationDate)!;await svc.saveRetirement([{id:'unused',employmentId:retired.employmentId,calculationDate:'2026-09-30',terminationDate:retired.terminationDate!,serviceDays:1000,averageDailyWage:100000,ordinaryDailyWage:90000,appliedDailyWage:100000,retirementPay:8000000,status:'DRAFT',ruleVersion:'MANUAL-REVIEW',note:'임금 증빙 검토'}],'수기 정산');assert.equal((await svc.retirementSettlements()).find(r=>r.employmentId===retired.employmentId)!.retirementPay,8000000)
await svc.saveYearEnd([{id:'unused',employmentId:e8.employmentId,taxYear:2026,grossPay:12345678,incomeTaxWithheld:100000,localTaxWithheld:10000,basicDeductionCount:1,childCount:0,status:'DRAFT',estimatedFinalTax:75000,settlementAmount:999,ruleVersion:'MANUAL-REVIEW'}],'최종 소득세 증빙');assert.equal((await svc.yearEndTaxCases()).find(r=>r.employmentId===e8.employmentId&&r.taxYear===2026)!.settlementAmount,-25000)
await svc.saveFilingForm(r8.id,{incomeName:'상용근로소득',incomeCode:'A01',headcount:2,grossPay:5000000,incomeTax:50000,localIncomeTax:5000,note:'수기 대사'},'신고 증빙');assert.equal((await svc.run(r8.id))!.filingFormOverrides?.incomeTax,50000)
await assert.rejects(()=>svc.saveFilingForm(r8.id,{incomeName:'상용근로소득',incomeCode:'A01',headcount:1.5,grossPay:1,incomeTax:0,localIncomeTax:0,note:''},'invalid'))
console.log('PASS attendance work/leave intervals, annual individual/batch persistence, cross-month atomic import, salary/insurance overrides and manual settlements')

const h=clockHours('20:00','08:00',true,'01:00',60,true);assert.equal(h.workedHours,11);assert.equal(h.nightHours,7);assert.equal(h.holidayOvertimeHours,3)
assert.throws(()=>clockHours('09:00','08:00',false,'12:00',60,false))
const emp=employees.find(e=>e.employmentId===original.employmentId)!
const records=attendanceRows([original],[emp]);const matrix=csvDecode(csvEncode([columns,...records]));const obj=matrix.slice(1).map(r=>Object.fromEntries(columns.map((h,i)=>[h,r[i]])));const roundTrip=parseAttendance(obj,[emp],[original]);assert.equal(roundTrip[0].workedHours,original.workedHours)
assert.deepEqual(csvDecode(csvEncode([['한글','쉼표, 따옴표 "와\n줄바꿈']])),[['한글','쉼표, 따옴표 "와\n줄바꿈']])
assert.throws(()=>parseAttendance([{...obj[0],실근로시간:'bad'}],[emp],[original]))
console.log('PASS clock/night/holiday overlap and Korean CSV round trip')
const worker={...seed.dailyWorkers[0],dailyRate:180000};assert.equal(calculateDailyWorkRecord(worker,'2026-09-01',8).incomeTax,0);assert.equal(calculateDailyWorkRecord({...worker,dailyRate:200000},'2026-09-01',8).incomeTax,1350)
const base={...entry,pensionBaseMonthly:99999999};const june=calculatePayrollEntry(base,'2026-06'),july=calculatePayrollEntry(base,'2026-07');assert.equal(june.nationalPension,302570);assert.equal(july.nationalPension,313020)
console.log('PASS daily small-tax exemption and July pension ceiling')
const settings=await svc.itemMasters();await svc.saveSettings(settings.map(i=>i.code==='P130'?{...i,active:false}:i));assert.equal((await svc.itemMasters()).find(i=>i.code==='P130')!.active,false);await svc.restoreSettings();assert.equal((await svc.itemMasters()).find(i=>i.code==='P130')!.active,true)
await svc.saveLeaveCase({id:'LC-test',employmentId:emp.employmentId,kind:'PARENTAL',startDate:'2026-09-01',endDate:'2026-09-30',companyPayRate:0,pensionExceptionApproved:true,healthDeferred:true,healthPremiumOverride:null,employmentBaseOverride:0,benefitAmount:2000000,averageWageExcluded:true,yearEndNote:'지원금 별도',note:'승인서',updatedAt:''})
const leaveResult=calculatePayrollEntry({...entry,employmentId:emp.employmentId,hireDateSnapshot:emp.hireDate,prorationRate:1},'2026-09',await svc.itemMasters(),undefined,await svc.leaveCases());assert.equal(leaveResult.basePay,0);assert.equal(leaveResult.nationalPension,0);assert.equal(leaveResult.healthInsurance,0);assert.equal(leaveResult.employmentInsurance,0)
console.log('PASS settings restoration and approved leave payroll/insurance treatment')
await svc.calculate(run.id);await svc.validate(run.id);await svc.status(run.id,'CONFIRMED');await assert.rejects(()=>svc.status(run.id,'CLOSED'),/근태 마감/);await svc.closeAttendance(run.period);await svc.status(run.id,'CLOSED');await assert.rejects(()=>svc.saveAttendanceBatch([original],[],'locked edit'));await assert.rejects(()=>svc.calculate(run.id));await assert.rejects(()=>svc.status(run.id,'DRAFT'))
await assert.rejects(()=>svc.saveEntries(batchPayrollValues(targets,'bonus',1,'replace','locked')))
await assert.rejects(()=>svc.saveFilingForm(run.id,{incomeName:'상용근로소득',incomeCode:'A01',headcount:1,grossPay:1,incomeTax:0,localIncomeTax:0,note:''},'locked'))
console.log('PASS closed payroll cannot be recalculated or modified')
const backup=await repo.exportDatabase();await repo.importDatabase(backup);assert.deepEqual((await repo.exportDatabase()).data.leaveCases,backup.data.leaveCases)
assert.deepEqual((await svc.run(r8.id))!.filingFormOverrides,backup.data.payrollRuns.find(r=>r.id===r8.id)!.filingFormOverrides);assert.equal((await svc.annualLeave()).find(r=>r.id===annualOriginal.id)!.remainingDays,11);assert.equal((await svc.dailyAttendance()).find(r=>r.id===persistedDay.id)!.nonWorkKind,'ANNUAL_LEAVE');assert.equal((await svc.yearEndTaxCases()).find(r=>r.employmentId===e8.employmentId&&r.taxYear===2026)!.settlementAmount,-25000)
console.log('PASS full backup preserves leave intervals, annual/manual settlements/filing overrides and new stores')

// Confirmation lives in the database and survives every editing path and backup.
const unlocked=(await svc.attendance()).find(r=>r.period==='2026-07')!
await assert.rejects(()=>svc.confirmRecords('attendance',[unlocked.id,'missing']))
assert.equal((await svc.attendance()).find(r=>r.id===unlocked.id)!.confirmedAt,undefined)
await svc.confirmRecords('attendance',[unlocked.id])
await assert.rejects(()=>svc.saveAttendanceBatch([{...unlocked,workedHours:1}],[],'locked upload'))
await assert.rejects(()=>svc.saveAttendanceBatch([],[{...persistedDay,employmentId:unlocked.employmentId,workDate:'2026-07-01'}],'locked daily'))
await svc.confirmRecords('annual',[annualUpdated.id])
await assert.rejects(()=>svc.saveAnnualLeave([{...annualUpdated,usedDays:1}],'locked annual'))
const dr=(await svc.dailyWorkRecords())[0]
await svc.confirmRecords('daily',[dr.id])
await assert.rejects(()=>svc.saveDailyWorkRecords([{...dr,otherAllowance:999}]))
await assert.rejects(()=>svc.deleteDailyWorkRecord(dr.id))
await assert.rejects(()=>svc.deleteDailyWorker(dr.dailyWorkerId))
const dw=(await svc.dailyWorkers()).find(w=>w.id===dr.dailyWorkerId)!
await assert.rejects(()=>svc.saveDailyWorker({...dw,dailyRate:1}))
const ret=(await svc.retirementSettlements()).find(r=>r.employmentId===retired.employmentId)!
await svc.confirmRecords('retirement',[ret.id])
await assert.rejects(()=>svc.saveRetirement([{...ret,retirementPay:1}],'locked retirement'))
await assert.rejects(()=>svc.calculateRetirement(ret.employmentId))
const yt=(await svc.yearEndTaxCases()).find(r=>r.employmentId===e8.employmentId&&r.taxYear===2026)!
await svc.confirmRecords('yearend',[yt.id])
await assert.rejects(()=>svc.saveYearEnd([{...yt,estimatedFinalTax:1}],'locked yearend'))
assert.equal((await svc.yearEndTaxCases()).find(r=>r.id===yt.id)!.status,'CONFIRMED')
const lockedBackup=await repo.exportDatabase();await repo.importDatabase(lockedBackup)
assert((await svc.attendance()).find(r=>r.id===unlocked.id)!.confirmedAt)
assert((await svc.annualLeave()).find(r=>r.id===annualUpdated.id)!.confirmedAt)
assert((await svc.dailyWorkRecords()).find(r=>r.id===dr.id)!.confirmedAt)
await assert.rejects(()=>svc.saveDailyWorkRecords([{...dr,otherAllowance:1}]))
console.log('PASS atomic confirmation, all five ledger locks, daily/master/delete/calculate guards and backup preservation')
