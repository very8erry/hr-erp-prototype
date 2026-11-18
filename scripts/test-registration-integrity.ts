import 'fake-indexeddb/auto'
import assert from 'node:assert/strict'
import {IndexedDbHrRepository} from '../src/infrastructure/db/indexedDb'
const repo=new IndexedDbHrRepository();await repo.initialize()
const before=await repo.exportDatabase(),org=before.data.organizations.find(o=>o.companyId===before.data.company.id)!
const input={fullName:'가상테스트',englishName:'Test User',hanjaName:'',birthDate:'1995-01-01',employeeNumber:'INTEGRITY-1',hireDate:'2026-10-01',annualSalary:36000000,organizationId:org.id,grade:'사원',job:'개발',gender:'F' as const,mobile:'',nameReviewed:false}
const id=await repo.registerEmployee(input)
const after=await repo.exportDatabase(),employment=after.data.employments.find(e=>e.id===id)!
assert.equal(employment.companyId,before.data.company.id)
assert(after.data.persons.some(p=>p.id===employment.personId))
assert(after.data.assignments.some(a=>a.employmentId===id))
assert(after.data.compensations.some(c=>c.employmentId===id))
const concurrent=await Promise.allSettled([repo.registerEmployee({...input,employeeNumber:'RACE'}),repo.registerEmployee({...input,employeeNumber:'RACE'})])
assert.equal(concurrent.filter(r=>r.status==='fulfilled').length,1)
const sameName=await repo.registerEmployee({...input,employeeNumber:'OTHER'})
assert.notEqual((await repo.getEmployeeMaster(sameName))!.person.id,employment.personId)
const snapshot=await repo.exportDatabase()
await assert.rejects(repo.registerEmployee({...input,employeeNumber:'BAD',organizationId:'MISSING'}))
assert.deepEqual((await repo.exportDatabase()).data,snapshot.data)
console.log('PASS registration company, required links, concurrent duplicate prevention, same-name isolation, failed write preservation')
const {companyRepairs,inspectIntegrity}=await import('../src/domain/dataIntegrity')
const legacy=structuredClone(snapshot.data),target=legacy.employments.find(e=>e.id===id)!;
delete (target as Partial<typeof target>).companyId
assert.equal(companyRepairs(legacy).find(e=>e.id===id)?.companyId,legacy.company.id)
const ambiguous=structuredClone(legacy);ambiguous.assignments=ambiguous.assignments.filter(a=>a.employmentId!==id)
assert(!companyRepairs(ambiguous).some(e=>e.id===id))
assert(inspectIntegrity(ambiguous).some(f=>f.id===id&&f.code==='COMPANY_REVIEW'))
await repo.importDatabase({...snapshot,data:legacy})
const restored=await repo.exportDatabase()
assert.equal(restored.data.employments.find(e=>e.id===id)?.companyId,legacy.company.id)
assert.deepEqual(restored.data.payrollEntries,snapshot.data.payrollEntries)
assert.deepEqual(restored.data.payrollResults,snapshot.data.payrollResults)
assert.deepEqual(restored.data.persons,snapshot.data.persons)
console.log('PASS legacy company inference, ambiguous company preservation, backup restore preserves payroll and people')

const intact=(await repo.exportDatabase()).data
const malformed=structuredClone(intact)
;(malformed.persons[0] as unknown as {id:unknown}).id={}
await assert.rejects(repo.importDatabase({...snapshot,data:malformed}))
await new Promise(resolve=>setTimeout(resolve,20))
assert.deepEqual((await repo.exportDatabase()).data,intact)
console.log('PASS synchronous restore failure rolls back all cleared stores')
const corrupt=structuredClone(intact)
corrupt.employments[0].personId='absent-person'
corrupt.assignments[0].employmentId='absent-employment'
corrupt.payrollResults=[{id:'orphan-result',runId:'absent-run',employmentId:corrupt.employments[0].id} as typeof corrupt.payrollResults[number]]
corrupt.payrollEntries=[{id:'entry-one',runId:'test-run',employmentId:corrupt.employments[0].id} as typeof corrupt.payrollEntries[number],{id:'entry-two',runId:'test-run',employmentId:corrupt.employments[0].id} as typeof corrupt.payrollEntries[number]]
corrupt.compensations.push({...corrupt.compensations[0],id:'overlap'})
const findings=inspectIntegrity(corrupt)
for(const code of ['MISSING_PERSON','MISSING_EMPLOYMENT','MISSING_RUN','MISSING_PAYROLL_ENTRY','DUPLICATE_BUSINESS_KEY','OVERLAPPING_PERIOD'])assert(findings.some(f=>f.code===code),code)
assert.deepEqual((await repo.exportDatabase()).data,intact)
console.log('PASS non-mutating orphan, duplicate payroll and overlapping-history diagnostics')
await assert.rejects(repo.importDatabase({...snapshot,schemaVersion:1,data:intact}),/수동 검토/)
assert.deepEqual((await repo.exportDatabase()).data,intact)
console.log('PASS v1 unknown-person restore refused without silent person deletion')
