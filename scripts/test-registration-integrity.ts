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
