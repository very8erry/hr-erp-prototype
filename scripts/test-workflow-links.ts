import 'fake-indexeddb/auto'
import assert from 'node:assert/strict'
import {IndexedDbHrRepository} from '../src/infrastructure/db/indexedDb'
import {DB_NAME} from '../src/infrastructure/db/config'
import type {LeaveCase} from '../src/domain/types'
console.log("START repository initialization");const repo=new IndexedDbHrRepository();await repo.initialize();console.log("READY")
let failed=0
async function test(name:string,fn:()=>Promise<void>){try{await fn();console.log('PASS',name)}catch(e){failed++;console.error('FAIL',name,(e as Error).message)}}
await test('company information writes an audit atomically',async()=>{const before=await repo.listAuditLogs();await repo.saveCompanyInfo({...await repo.companyInfo(),foundedOn:'2018-11-05'});const logs=await repo.listAuditLogs();assert.equal(logs.length,before.length+1);assert(logs.some(x=>x.action==='UPDATE_COMPANY_INFO'))})
await test('settlement settings write an audit',async()=>{const before=await repo.listAuditLogs();await repo.saveSettlements(await repo.settlements());assert.equal((await repo.listAuditLogs()).length,before.length+1)})
const emp=(await repo.listEmployees()).find(e=>!e.terminationDate)!
const row:LeaveCase={id:'LINK-LEAVE-1',employmentId:emp.employmentId,kind:'PERSONAL',startDate:'2027-01-01',endDate:'2027-01-31',companyPayRate:0,pensionExceptionApproved:false,healthDeferred:false,healthPremiumOverride:null,employmentBaseOverride:null,benefitAmount:0,averageWageExcluded:false,yearEndNote:'',note:'test approval',updatedAt:''}
await test('simultaneous overlapping leave has only one winner',async()=>{const r=await Promise.allSettled([repo.saveLeaveCase(row),repo.saveLeaveCase({...row,id:'LINK-LEAVE-2'})]);assert.equal(r.filter(x=>x.status==='fulfilled').length,1)})
await test('unregistered welfare employee is rejected with no writes',async()=>{const before=(await repo.exportDatabase()).data;await assert.rejects(repo.saveOperation('welfareCases',{id:'NOEMP',employeeId:'missing',status:'APPLIED',evaluationCriteria:[{name:'test',weight:100,score:0}],score:0,result:'',reviewer:'',reason:'',history:[]}));assert.deepEqual((await repo.exportDatabase()).data,before)})
const lock=await repo.createPayrollRun({period:'2026-09',payDate:'2026-09-25',note:'locked fixture'})
const db=await new Promise<IDBDatabase>(resolve=>{const q=indexedDB.open(DB_NAME);q.onsuccess=()=>resolve(q.result)})
await new Promise<void>((resolve,reject)=>{const tx=db.transaction('payrollRuns','readwrite');tx.objectStore('payrollRuns').put({...lock,status:'PAID'});tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)});db.close()
await test('locked payroll protects leave and retains all records',async()=>{const before=(await repo.exportDatabase()).data;await assert.rejects(repo.saveLeaveCase({...row,id:'LOCKED-LEAVE',startDate:'2026-09-01',endDate:'2026-09-30'}));assert.deepEqual((await repo.exportDatabase()).data,before)})
await test('stale leave edit is rejected without writes',async()=>{const saved=(await repo.listLeaveCases()).find(r=>r.id.startsWith('LINK-LEAVE'))!;await repo.saveLeaveCase({...saved,note:'changed'});const before=(await repo.exportDatabase()).data;await assert.rejects(repo.saveLeaveCase({...saved,note:'stale'}),/변경/);assert.deepEqual((await repo.exportDatabase()).data,before)})
await test('audit failure rolls company data back',async()=>{const before=(await repo.exportDatabase()).data;const original=IDBObjectStore.prototype.add;IDBObjectStore.prototype.add=function(...args:Parameters<IDBObjectStore['add']>){if(this.name==='auditLogs')throw new Error('injected audit failure');return original.apply(this,args)};try{await assert.rejects(repo.saveCompanyInfo({...await repo.companyInfo(),name:'must roll back'}),/injected/)}finally{IDBObjectStore.prototype.add=original}assert.deepEqual((await repo.exportDatabase()).data,before)})
if(failed)process.exitCode=1
