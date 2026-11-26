import 'fake-indexeddb/auto'
import assert from 'node:assert/strict'
import {IndexedDbHrRepository} from '../src/infrastructure/db/indexedDb'
import {registrationBaseline,reviewRegistrationPolicy} from '../src/modules/core-hr/registrationPolicy'
const repo=new IndexedDbHrRepository();await repo.initialize()
const org=(await repo.listOrganizations())[0]
const input={fullName:'정책시험',englishName:'Policy Test',hanjaName:'',birthDate:'1990-01-01',gender:'F' as const,employeeNumber:'POLICY-TEST',organizationId:org.id,grade:'사원',job:'개발',hireDate:'2026-11-01',annualSalary:36000000,mobile:'',nameReviewed:true,workTerms:{...registrationBaseline,ordinaryMonthlyHours:174}}
const before=(await repo.exportDatabase()).data
await assert.rejects(repo.registerEmployee(input),/월 급여 환산시간 상이/)
assert.deepEqual((await repo.exportDatabase()).data,before)
const rules=reviewRegistrationPolicy(input,(await repo.operations()).policyDocuments)
await assert.rejects(repo.registerEmployee({...input,policyReviewReason:'검토함',policyReviewSignature:'stale'}),/재검토/)
const id=await repo.registerEmployee({...input,policyReviewReason:'별도 근로계약 확인',policyReviewSignature:rules.signature})
const master=await repo.getEmployeeMaster(id)
assert.equal(master?.attendanceSetting?.ordinaryMonthlyHours,174)
assert.equal(master?.workSchedule?.startTime,'09:00')
assert.equal(master?.attendanceSetting?.policyReview?.reason,'별도 근로계약 확인')
const original=IDBObjectStore.prototype.put
const snapshot=(await repo.exportDatabase()).data
IDBObjectStore.prototype.put=function(...args:Parameters<IDBObjectStore['put']>){if(this.name==='auditLogs')throw new Error('test audit failure');return original.apply(this,args)}
try{await assert.rejects(repo.registerEmployee({...input,employeeNumber:'ROLLBACK',workTerms:registrationBaseline}),/test audit/)}finally{IDBObjectStore.prototype.put=original}
assert.deepEqual((await repo.exportDatabase()).data,snapshot)
console.log('PASS registration warning, stale review, contract storage and all-store rollback')
const {PayrollService}=await import('../src/modules/payroll/payrollService')
const svc=new PayrollService(repo),run=await svc.createRun({period:'2026-11',payDate:'2026-11-25',note:'policy integration'})
assert.equal((await svc.entries(run.id)).find(e=>e.employmentId===id)?.ordinaryMonthlyHoursSnapshot,174)
const template=(await svc.attendance())[0]
await svc.saveAttendanceBatch([{...template,id:'POLICY-ATT',employmentId:id,period:run.period,overtimeHours:2,nightHours:0,holidayHours:0,confirmedAt:undefined,confirmedBy:undefined}],[],'계약 시간 연동 검증')
await svc.syncAttendance(run.id);await svc.calculate(run.id)
const entry=(await svc.entries(run.id)).find(e=>e.employmentId===id)!
assert.equal(entry.calculationInputs?.ordinaryMonthlyHours,174)
assert.equal((await svc.results(run.id)).find(r=>r.employmentId===id)?.appliedItemAmounts?.P120,Math.round(3000000/174*1.5*2))
console.log('PASS registration contract snapshot → attendance linkage → configured overtime calculation')
