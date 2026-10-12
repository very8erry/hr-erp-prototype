import 'fake-indexeddb/auto'
import assert from 'node:assert/strict'
import {seedStaffNotices} from '../src/infrastructure/db/staffNoticesSeed'
import {STORES} from '../src/infrastructure/db/config'
import {getAllFromStore,transactionDone} from '../src/infrastructure/db/idbUtils'
import {monthlyStatus} from '../src/app/monthlyStatus'
import {describeAudit} from '../src/app/auditDescription'
import {createHash} from 'node:crypto'
import {readFileSync} from 'node:fs'
import type {PolicyDocument} from '../src/modules/operations/operations'
const db=await new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('notice-revision-test',1);r.onupgradeneeded=()=>{for(const name of [STORES.meta,STORES.policyDocuments,STORES.auditLogs])r.result.createObjectStore(name,{keyPath:'id'})};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
await seedStaffNotices(db);let docs=await getAllFromStore<PolicyDocument>(db,STORES.policyDocuments);assert.equal(docs.length,10);for(const d of docs){assert.equal(d.notice?.state,'게시');assert.equal(d.attachments?.length,1);const f=d.attachments![0],bytes=Buffer.from(f.dataUrl.split(',')[1],'base64');assert.equal(createHash('sha256').update(bytes).digest('hex'),f.sha256);assert.deepEqual(bytes,readFileSync('docs/notices/'+f.name));assert(d.contents.includes('미확정'));}
const first=docs[0],tx=db.transaction(STORES.policyDocuments,'readwrite'),done=transactionDone(tx);tx.objectStore(STORES.policyDocuments).put({...first,attachments:[],contents:'사용자 수정본'});await done;await seedStaffNotices(db);docs=await getAllFromStore<PolicyDocument>(db,STORES.policyDocuments);assert.equal(docs.length,10);assert.equal(docs.find(d=>d.id===first.id)?.attachments?.length,0);assert.equal(docs.find(d=>d.id===first.id)?.contents,'사용자 수정본');assert.equal((await getAllFromStore(db,STORES.auditLogs)).length,1);db.close();
const date='2026-10-10',record=(id:string,offKind?:string)=>({employmentId:id,workDate:date,activity:'OFF',offKind}) as any;
assert.equal(monthlyStatus([record('A','WEEKEND'),record('B','STATUTORY'),record('C','COMPANY'),record('D'),record('E','PERSONAL')],date,[],[],date).off,1);
const weekday='2026-10-12',event:any={scope:'COMPANY',affectsAttendance:true,appliesTo:'ALL',eventType:'COMPANY_OFF',startDate:weekday,endDate:weekday,title:'창립기념일'};
assert.equal(monthlyStatus([{...record('A'),workDate:weekday}],weekday,[],[],weekday,[event]).off,0);assert.equal(monthlyStatus([{...record('A'),workDate:weekday}],weekday,[],[],weekday,[]).off,1);
const log:any={occurredAt:'2026-10-12T01:00:00Z',actor:'HR_ADMIN',action:'UPDATE',entityType:'policyDocuments',entityId:'N1',detail:JSON.stringify({reason:'첨부자료 교체 요청',before:{title:'안내',attachments:[{}]},after:{title:'안내',attachments:[]}})};const audit=describeAudit(log);assert.equal(audit.who,'인사 관리자');assert.equal(audit.where,'취업규칙·공지게시판');assert.equal(audit.what,'자료 수정');assert(audit.how.includes('첨부 1개 → 0개'));assert.equal(audit.why,'첨부자료 교체 요청');assert.equal(describeAudit({...log,detail:'{}'}).why,'사유 미기록');assert(!JSON.stringify(audit).includes('data:'));
console.log('PASS 10 original notice attachments, publication, deleted attachment preservation, repeated seed safety, shared holidays exclusion and Korean six-question audit descriptions')
