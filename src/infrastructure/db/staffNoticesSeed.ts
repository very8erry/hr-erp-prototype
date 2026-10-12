import fixture from '../../fixtures/staffNotices.json'
import type {PolicyDocument} from '../../modules/operations/operations'
import {getOneFromStore,transactionDone} from './idbUtils'
import {STORES} from './config'
export async function seedStaffNotices(db:IDBDatabase){
 if(await getOneFromStore(db,STORES.meta,'staffNotices20261012'))return;
 const existing=await Promise.all(fixture.map(d=>getOneFromStore(db,STORES.policyDocuments,d.id))),now=new Date().toISOString();
 const tx=db.transaction([STORES.policyDocuments,STORES.meta,STORES.auditLogs],'readwrite'),done=transactionDone(tx);let added=0;
 fixture.forEach((d,i)=>{if(existing[i])return;const row:PolicyDocument={id:d.id,purpose:'NOTICE',category:'COMPANY_OPERATION',title:d.title,contents:d.contents,version:1,effectiveDate:'',source:'사용자 첨부 자료',status:'Draft',reviewRequired:true,history:[],attachments:[d.file],notice:{state:'게시',postedAt:now,author:'인사팀'}};tx.objectStore(STORES.policyDocuments).put(row);added++});
 tx.objectStore(STORES.meta).put({id:'staffNotices20261012',value:'1'});if(added)tx.objectStore(STORES.auditLogs).put({id:crypto.randomUUID(),occurredAt:now,actor:'HR_ADMIN',action:'PUBLISH_STAFF_NOTICES',entityType:'policyDocuments',entityId:'STAFF-MATERIAL-202610',detail:JSON.stringify({reason:'사용자가 첨부한 사내 배치자료의 공지게시판 등록 요청',count:added,method:'문서별 안내 공지 작성 및 원본 첨부파일 등록'})});await done;
}
