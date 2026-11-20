import 'fake-indexeddb/auto'
import assert from 'node:assert/strict'
import {IndexedDbHrRepository} from './src/infrastructure/db/indexedDb.ts'
import {PayrollService} from './src/modules/payroll/payrollService.ts'
const repo=new IndexedDbHrRepository();await repo.initialize();const s=new PayrollService(repo)
const period='2026-11',run=await s.createRun({period,payDate:period+'-25',note:'가상 중단 시험'})
const entries=await s.entries(run.id),template=(await s.attendance())[0]
await s.saveAttendanceBatch(entries.map(e=>({...template,employmentId:e.employmentId,period,revision:undefined,confirmedAt:undefined,confirmedBy:undefined,workedHours:160,overtimeHours:0,nightHours:0,holidayHours:0})),[],'시험 준비')
await s.validate(run.id)
async function abortOnce(store,predicate,action){
const fn=IDBObjectStore.prototype.put;let hit=false
IDBObjectStore.prototype.put=function(value,...args){const request=fn.call(this,value,...args);if(!hit&&this.name===store&&predicate(value)){hit=true;this.transaction.abort()}return request}
try{await assert.rejects(action);assert(hit)}finally{IDBObjectStore.prototype.put=fn}
}
await abortOnce('auditLogs',v=>v.action==='PAYROLL_CONFIRMED',()=>s.status(run.id,'CONFIRMED'))
const afterState={status:(await s.run(run.id)).status,confirmationLog:(await repo.listAuditLogs()).some(l=>l.entityId===run.id&&l.action==='PAYROLL_CONFIRMED')}
assert.equal(afterState.status,'CONFIRMED');assert.equal(afterState.confirmationLog,false)
await abortOnce('company',v=>Boolean(v.attendanceClosed?.[period]),()=>s.closeAttendance(period))
const partial={confirmedRows:(await s.attendance()).filter(a=>a.period===period&&a.confirmedAt).length,monthClosed:await s.isAttendanceClosed(period)}
assert(partial.confirmedRows>0);assert.equal(partial.monthClosed,false)
await s.closeAttendance(period)
console.log(JSON.stringify({environment:'fault injection in fake-indexeddb, synthetic records',confirmation:afterState,attendance:partial,monthClosedAfterRetry:await s.isAttendanceClosed(period)},null,2))
