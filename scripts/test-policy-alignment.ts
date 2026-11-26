import assert from 'node:assert/strict'
import {demoDay} from '../src/fixtures/scenarios'
import {correctedDemoDay,summaryFromDaily} from '../src/infrastructure/db/operationsUpgrade'
import {registrationBaseline,reviewRegistrationPolicy,validateWorkTerms} from '../src/modules/core-hr/registrationPolicy'
import type {EmployeeView,AttendanceMonthlySummary} from '../src/domain/types'
import {createSeedBundle} from '../src/fixtures/seed'
const e={employmentId:'M',gender:'F',hireDate:'2020-01-01'} as EmployeeView
const ids={maternity:'M'}
assert.equal(demoDay(e,'2026-01-06',ids).workedHours,6)
assert.equal(demoDay(e,'2026-01-06',ids).paidCreditHours,2)
assert.equal(demoDay(e,'2026-08-04',ids).workedHours,0)
assert(!demoDay(e,'2026-11-02',ids).note?.includes('임신'),'postpartum must not remain pregnancy reduction')
assert.equal(demoDay(e,'2027-01-04',ids).workedHours,8,'reduction must have an end date')
const input={hireDate:'2026-11-01',workTerms:{...registrationBaseline,ordinaryMonthlyHours:174}} as any
assert(reviewRegistrationPolicy(input,[]).warnings.some(w=>w.includes('월 급여 환산시간 상이')))
assert.throws(()=>validateWorkTerms({...input,workTerms:{...registrationBaseline,dailyHours:9}}))
assert.equal(reviewRegistrationPolicy({...input,workTerms:registrationBaseline},[]).warnings.length,0)
const docs=[{id:'RULE',version:2,status:'적용',reviewRequired:false,effectiveDate:'2026-01-01',standards:[{key:'startTime',value:'10:00',from:'2026-01-01',to:'',condition:''}]}] as any
assert(reviewRegistrationPolicy({...input,workTerms:registrationBaseline},docs).warnings.some(w=>w.includes('시업시간')))
const bundle=createSeedBundle();assert(bundle.attendanceSettings.every(s=>s.workScheduleId==='WS-STD-0900'),'baseline contracts must use notice schedule')
console.log('PASS notice registration comparison, pregnancy/childcare date bounds and baseline work schedule')
const normal={id:'month',employmentId:'M',period:'2026-01'} as AttendanceMonthlySummary
const pregnancy=[demoDay(e,'2026-01-06',ids),demoDay(e,'2026-01-07',ids)]
const total=summaryFromDaily(normal,pregnancy)
assert.equal(total.workedHours,12);assert.equal(total.scheduledHours,12);assert.equal(total.paidCreditHours,4)
const child=demoDay(e,'2026-11-02',ids);assert.equal(child.workedHours,6);assert.equal(child.paidCreditHours,0)
assert.equal(summaryFromDaily(normal,[child]).scheduledHours,6)
console.log('PASS reduced scheduled/actual/paid-credit hours remain distinct')

const prenatal=demoDay(e,'2026-07-14',ids);assert.equal(prenatal.workedHours,2);assert.equal(prenatal.paidCreditHours,6);assert.equal(prenatal.endTime,'11:00');assert.equal(summaryFromDaily(normal,[prenatal]).scheduledHours,6);
console.log('PASS prenatal exam during pregnancy reduction avoids duplicated paid hours')

const {readFileSync}=await import('node:fs');const {createHash}=await import('node:crypto');
const reference=JSON.parse(readFileSync('public/hris-policy-reference.json','utf8'));
for(const source of reference.sources)assert.equal(createHash('sha256').update(readFileSync(source.file)).digest('hex'),source.sha256,source.file+' reference is stale; run python3 scripts/build-policy-reference.py');
console.log('PASS accessible policy reference matches its source files')

assert.equal(summaryFromDaily({...normal,lateMinutes:27,earlyLeaveMinutes:11},pregnancy).lateMinutes,0);assert.equal(summaryFromDaily({...normal,lateMinutes:27,earlyLeaveMinutes:11},pregnancy).earlyLeaveMinutes,0);
console.log('PASS generated on-time days clear unrelated random lateness and early-leave totals')
