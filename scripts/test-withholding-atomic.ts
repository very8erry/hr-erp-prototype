import 'fake-indexeddb/auto'
import assert from 'node:assert/strict'
import {IndexedDbHrRepository} from '../src/infrastructure/db/indexedDb'
import {initialWithholding} from '../src/modules/payroll/withholdingForm'
const repo=new IndexedDbHrRepository();await repo.initialize()
const run=await repo.createPayrollRun({period:'2027-02',payDate:'2027-02-25',note:'atomic draft fixture'})
const draft=initialWithholding(run,[],[],[])
const before=(await repo.exportDatabase()).data
const original=IDBObjectStore.prototype.put
IDBObjectStore.prototype.put=function(...args:Parameters<IDBObjectStore['put']>){if(this.name==='auditLogs')throw new Error('injected audit failure');return original.apply(this,args)}
try{await assert.rejects(repo.saveWithholdingDraft(run.id,draft),/injected/)}finally{IDBObjectStore.prototype.put=original}
assert.deepEqual((await repo.exportDatabase()).data,before,'audit failure must preserve all original stores')
await repo.saveWithholdingDraft(run.id,draft)
assert.deepEqual(await repo.withholdingDraft(run.id),draft)
assert((await repo.listAuditLogs()).some(x=>x.action==='SAVE_WITHHOLDING_FORM'&&x.entityId===run.id))
const next={...draft,reviewed:true}
await Promise.all([repo.saveWithholdingDraft(run.id,next),repo.saveCompanyInfo({...await repo.companyInfo(),foundedOn:'2020-01-01'})])
assert.deepEqual(await repo.withholdingDraft(run.id),next)
assert.equal((await repo.companyInfo()).foundedOn,'2020-01-01')
console.log('PASS withholding audit failure rollback; successful draft and log; concurrent company fields preserved')
