import 'fake-indexeddb/auto'
import assert from 'node:assert/strict'
import {IndexedDbHrRepository} from '../src/infrastructure/db/indexedDb'
import {DB_NAME,DB_VERSION,STORES} from '../src/infrastructure/db/config'
import {transactionDone} from '../src/infrastructure/db/idbUtils'
import {scenarioIds} from '../src/fixtures/scenarios'
const repo=new IndexedDbHrRepository();await repo.initialize()
const db=await new Promise<IDBDatabase>(resolve=>{const r=indexedDB.open(DB_NAME,DB_VERSION);r.onsuccess=()=>resolve(r.result)})
async function put(store:string,row:unknown){const t=db.transaction(store,'readwrite'),d=transactionDone(t);t.objectStore(store).put(row);await d}
// Limit generated workload to the existing issue employees; persisted master records stay intact.
const all=await repo.listEmployees(),ids=scenarioIds(all),employees=all.filter(e=>Object.values(ids).includes(e.employmentId));repo.listEmployees=async()=>employees
const company=await repo.getCompany();await put(STORES.company,{...company,demoHistoryVersion:1,demoPayrollVersion:1,demoScenarioVersion:3,attendanceClosed:{'2026-01':'locked'}})
const old=(await repo.listAttendanceMonthlySummaries())[0]
await put(STORES.attendanceMonthlySummaries,{...old,id:'MANUAL-POLICY',employmentId:ids.sick,period:'2026-10',manualEdited:true,workedHours:123})
await put(STORES.payrollRuns,{id:'PAID-POLICY',period:'2026-02',status:'PAID'})
await put(STORES.payrollRuns,{id:'DRAFT-POLICY',period:'2026-11',status:'VALIDATED'})
await put(STORES.payrollResults,{id:'RESULT-POLICY',runId:'DRAFT-POLICY',employmentId:ids.maternity,netPay:123})
const before=(await repo.exportDatabase()).data
const upgrade=()=> (repo as unknown as {upgradeDemoScenarios():Promise<void>}).upgradeDemoScenarios()
await upgrade()
const after=(await repo.exportDatabase()).data
for(const key of ['persons','employments','assignments','compensations'] as const)assert.deepEqual(after[key],before[key],key)
assert.deepEqual(after.attendanceMonthlySummaries.filter(a=>['2026-01','2026-02'].includes(a.period)),before.attendanceMonthlySummaries.filter(a=>['2026-01','2026-02'].includes(a.period)))
assert.deepEqual(after.attendanceMonthlySummaries.find(a=>a.id==='MANUAL-POLICY'),before.attendanceMonthlySummaries.find(a=>a.id==='MANUAL-POLICY'))
assert.deepEqual(after.payrollRuns.find(r=>r.id==='PAID-POLICY'),before.payrollRuns.find(r=>r.id==='PAID-POLICY'))
assert.equal(after.payrollRuns.find(r=>r.id==='DRAFT-POLICY')?.status,'DRAFT')
assert.equal(after.payrollRuns.find(r=>r.id==='DRAFT-POLICY')?.attendanceStale,true)
assert(!after.payrollResults.some(r=>r.id==='RESULT-POLICY'))
await upgrade();assert.deepEqual((await repo.exportDatabase()).data,after,'second policy migration must be a no-op, including audit logs')
const october=after.attendanceMonthlySummaries.find(a=>a.employmentId===ids.maternity&&a.period==='2026-10')!
await repo.ensureDemoHistory()
assert.deepEqual((await repo.listAttendanceMonthlySummaries()).find(a=>a.id===october.id),october,'repeated history generation must retain reduced contract hours and revision')
const backup=await repo.exportDatabase();await repo.importDatabase(backup);await repo.ensureDemoHistory()
const restored=(await repo.exportDatabase()).data
for(const key of ['persons','employments','attendanceMonthlySummaries','attendanceDailyRecords','payrollRuns','payrollEntries','payrollResults','attendanceSettings'] as const)assert.deepEqual(restored[key],backup.data[key],key+' restore')
console.log('PASS policy migration preserves master/manual/locked/paid data, invalidates draft results, is idempotent and survives backup/restore')
