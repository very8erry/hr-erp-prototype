import 'fake-indexeddb/auto'
import assert from 'node:assert/strict'
import { IndexedDbHrRepository } from '../src/infrastructure/db/indexedDb'

const editor = new IndexedDbHrRepository()
const confirmer = new IndexedDbHrRepository()
await editor.initialize()
await confirmer.initialize()
const run = await editor.createPayrollRun({period:'2026-12',payDate:'2026-12-25',note:'integrity regression'})
const [entry] = await editor.listPayrollEntries(run.id)
assert.ok(entry)

const draft = await editor.upsertPayrollEntry({...entry,memo:'ordinary edit'})
assert.equal(draft.memo,'ordinary edit')
assert.equal((await editor.getPayrollRun(run.id))?.status,'DRAFT')
assert.equal((await editor.validatePayrollRun(run.id)).errors,0)

// On the old path, pause after its pre-transaction status read. On the fixed
// path this hook is never reached, since status and entry are read together.
const original = editor.getPayrollEntry.bind(editor)
let reached!: () => void
let release!: () => void
const paused = new Promise<void>(resolve => { reached = resolve })
const resume = new Promise<void>(resolve => { release = resolve })
editor.getPayrollEntry = async (...args) => { reached(); await resume; return original(...args) }
const outcome = editor.upsertPayrollEntry({...entry,memo:'concurrent edit'}).then(
  () => 'edited' as const, () => 'rejected' as const,
)
const phase = await Promise.race([paused.then(() => 'paused' as const), outcome])
if (phase === 'paused') {
  try {
    await confirmer.setPayrollRunStatus(run.id,'CONFIRMED')
  } finally {
    release()
  }
  await outcome
  assert.equal((await confirmer.getPayrollRun(run.id))?.status,'CONFIRMED','a late edit must not revert confirmation')
} else {
  assert.equal(phase,'edited')
  await assert.rejects(confirmer.setPayrollRunStatus(run.id,'CONFIRMED'),/검증 완료/)
  assert.equal((await confirmer.validatePayrollRun(run.id)).errors,0)
  const [confirmed, edit] = await Promise.allSettled([
    confirmer.setPayrollRunStatus(run.id,'CONFIRMED'),
    editor.upsertPayrollEntry({...entry,memo:'after confirmation'}),
  ])
  assert.equal(confirmed.status,'fulfilled')
  assert.equal(edit.status,'rejected')
}
editor.getPayrollEntry = original
const protectedState=(await editor.exportDatabase()).data
for (const event of [
  () => editor.upsertPayrollEntry({...entry,memo:'edit'}),
  () => editor.savePayrollEntriesBatch([{...entry,memo:'batch'}]),
  () => editor.deletePayrollEntry(run.id,entry.employmentId),
  () => editor.deletePayrollRun(run.id),
  () => editor.addPayrollEntry(run.id,entry.employmentId),
  () => editor.calculatePayrollRun(run.id),
  () => editor.validatePayrollRun(run.id),
]) await assert.rejects(event)
assert.deepEqual((await editor.exportDatabase()).data,protectedState)
console.log('PASS concurrent confirmation and edit, ordinary edit, and protected write paths')

const nextRun={period:'2026-11',payDate:'2026-11-25',note:'simultaneous'}
const created=await Promise.allSettled([editor.createPayrollRun(nextRun),confirmer.createPayrollRun(nextRun)])
assert.equal(created.filter(outcome=>outcome.status==='fulfilled').length,1)
assert.equal((await editor.listPayrollRuns()).filter(row=>row.period===nextRun.period).length,1)
console.log('PASS duplicate run rejects one writer across connections')

const before=await editor.exportDatabase()
const incoming=structuredClone(before)
incoming.data.company.name='Isolated restored company'
const hooks=editor as unknown as Record<string,(...args:unknown[])=>Promise<void>>
for(const phase of ['repairEmploymentCompanies','persistSelectionUpgrade','initializeOperations']){
  const originalPhase=hooks[phase]
  hooks[phase]=async function (...args) {
    // Fail after this phase has had a chance to queue its writes.
    await originalPhase.apply(this,args)
    throw new Error('injected '+phase)
  }
  try {
    await assert.rejects(editor.importDatabase(incoming),new RegExp('injected '+phase))
  } finally {
    hooks[phase]=originalPhase
  }
  assert.deepEqual((await confirmer.exportDatabase()).data,before.data,phase+' must roll back all stores')
}
const malformed=structuredClone(incoming)
malformed.data.persons.push(malformed.data.persons[0])
await assert.rejects(editor.importDatabase(malformed),/중복된 ID/)
assert.deepEqual((await confirmer.exportDatabase()).data,before.data)
await editor.importDatabase(incoming)
const after=(await confirmer.exportDatabase()).data
assert.equal(after.company.name,incoming.data.company.name)
assert.deepEqual(after.payrollRuns,incoming.data.payrollRuns)
assert.ok(after.auditLogs.some(row=>row.action==='IMPORT_DATABASE'))
console.log('PASS all-store restore rollback, invalid backup preservation, and successful retry')
