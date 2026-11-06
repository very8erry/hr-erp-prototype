import 'fake-indexeddb/auto'
import assert from 'node:assert/strict'
import {IndexedDbHrRepository} from '../src/infrastructure/db/indexedDb'
import {calculatePayrollEntry} from '../src/modules/payroll/payrollRules'
import {splitNonTax} from '../src/modules/payroll/nonTaxRules'
import {importSettings,settingsFields,settingsValues} from '../src/modules/payroll/payrollSettingsFiles'
import {parseApplicantRows,applicantIdentity} from '../src/modules/recruiting/ApplicantIntake'
import {candidateText,keywordMatches} from '../src/modules/recruiting/candidateText'
import {demoFile} from '../src/domain/attachments'

const repo=new IndexedDbHrRepository();await repo.initialize();
await repo.populateWorkYear(2026);
const task=(await repo.operations()).calendarEvents.find(e=>e.work);
assert(task);await repo.setScheduleImportance(task.id,true);
await repo.populateWorkYear(2026);
const saved=(await repo.operations()).calendarEvents.find(e=>e.id===task.id);
assert.deepEqual(saved,{...task,important:true});
await repo.setScheduleImportance(task.id,false);
const employee=(await repo.listEmployees()).find(e=>e.employeeNumber==='E00001')!;
await repo.editMaster({employmentId:employee.employmentId,section:'insurance',values:{longTermCareReduction:true,healthDependentRegistered:true,basicLivelihoodReduction:true},reason:'기준정보 시험'});
assert((await repo.getEmployeeMaster(employee.employmentId))?.socialInsuranceProfile?.longTermCareReduction);
await repo.editMaster({employmentId:employee.employmentId,section:'occupation',values:{occupationCode:'029'},reason:'직종 코드 시험'});
assert.equal((await repo.listEmployees()).find(e=>e.employmentId===employee.employmentId)?.occupationCodeManual,true);
await repo.editMaster({employmentId:employee.employmentId,section:'occupation',values:{occupationCode:''},reason:'자동 매핑 복구 시험'});
assert.equal((await repo.listEmployees()).find(e=>e.employmentId===employee.employmentId)?.occupationCodeManual,false);

const run=await repo.createPayrollRun({period:'2026-11',payDate:'2026-11-25',note:'배율 검증'}),master=await repo.listPayrollItemMasters();
const base=(await repo.listPayrollEntries(run.id))[0];
const entry={...base,monthlyBasePay:2_090_000,prorationRate:1,taxableAllowance:0,nonTaxableAllowance:0,bonus:0,retroPay:0,otherEarnings:0,unpaidDeduction:0,otherDeductions:0,deriveEmploymentBase:true,employmentInsuranceEligible:true,pensionBaseMonthly:2_090_000,healthBaseMonthly:2_090_000,calculationInputs:{ordinaryMonthlyHours:209,overtimeHours:2,nightHours:0,holidayHours:0,holidayOvertimeHours:0},itemAmounts:{P104:220_000,P141:240_000},nonTaxEligibility:{mealNoProvision:true,researchCategory:'QUALIFIED' as const}};
const edit=master.map(i=>i.code==='P120'?{...i,workMultiplier:2}:i);
const r=calculatePayrollEntry(entry,run.period,edit);
assert.equal(r.nonTaxableEarnings,400_000);
const ot=r.appliedItemAmounts?.P120??0;assert(ot>=40_000);
assert.equal(r.insuranceBaseCheck?.employmentApplied,2_090_000+ot+20_000+40_000);
assert.equal(r.employmentInsurance,Math.floor((r.insuranceBaseCheck!.employmentApplied*.009)/10)*10);
const legacy=calculatePayrollEntry({...entry,deriveEmploymentBase:false,employmentInsuranceBaseMonthly:2_000_000},run.period,edit);
assert.equal(legacy.employmentInsurance,18_000);
assert.equal(legacy.healthInsurance,r.healthInsurance);
assert.deepEqual(splitNonTax('P141',240_000,run.payDate),{nonTaxable:0,taxable:240_000});
const row=edit.find(i=>i.code==='P120')!, table=Object.fromEntries(settingsFields.map(([,l],i)=>[l,settingsValues({...row,calculationMode:'DEFAULT'})[i]]));
assert.equal(importSettings([table],master).find(i=>i.code==='P120')?.workMultiplier,2);
const apps=parseApplicantRows([{성명:'가상 지원자',플랫폼:'wanted',이메일:'Demo@example.test'},{성명:'제외',플랫폼:'사람인'}],['원티드'],'JOB');
assert.equal(apps.length,1);assert.equal(apps[0].stage,'지원접수');assert.equal(applicantIdentity(apps[0]),'JOB|demo@example.test');
assert.deepEqual(keywordMatches(await candidateText(demoFile('resume.txt','React · React · TypeScript')),['react','없는 단어']).map(r=>r.count),[2]);
console.log('PASS v079: importance survives regeneration; insurance eligibility and occupation edits persist; overtime multiplier and taxable excess reconcile; applicant import and keyword review')
