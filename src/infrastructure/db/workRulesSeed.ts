import fixture from '../../fixtures/workRulesAttachments.json'
import type {PolicyDocument} from '../../modules/operations/operations'
import {getOneFromStore,transactionDone} from './idbUtils'
import {STORES} from './config'
export const workRuleSteps=['현행 취업규칙 확인','법령/회사제도 변경사항 체크','개정안 작성','노무사나 법무 검토','의견청취·동의 등 필요한 절차','신고/게시·공지','HR시스템·사내규정 반영'];
export async function seedWorkRules(db:IDBDatabase){
 if(await getOneFromStore(db,STORES.meta,'workRules20261012'))return;
 const policy:PolicyDocument={id:'WORK-RULES-202610',purpose:'WORK_RULES',category:'COMPANY_OPERATION',title:'취업규칙 개정 검토 · 2026년 10월',version:1,effectiveDate:'',source:'사용자 첨부 문서',status:'검토중',contents:fixture.paragraphs.join('\n'),reviewRequired:true,history:[],attachments:[fixture.files[0]],workflow:workRuleSteps.map((_,i)=>({id:i+1,status:i===0?'진행중':'대기',owner:'',dueDate:'',note:''}))};
 const notice:PolicyDocument={id:'NOTICE-WORK-RULES-202610',purpose:'NOTICE',category:'COMPANY_OPERATION',title:'취업규칙 검토안 안내',version:1,effectiveDate:'',source:'인사팀',status:'Draft',contents:'2026년 10월 취업규칙 검토안을 공유합니다. 첨부파일은 검토용 원본에서 배경색을 제거한 공지용 사본입니다. 확정·시행본 여부 및 시행일은 검토와 필요한 절차 완료 후 별도로 안내합니다.',reviewRequired:true,history:[],attachments:[fixture.files[1]],notice:{state:'게시',postedAt:new Date().toISOString(),author:'인사팀',linkedPolicyId:policy.id}};
 const exists=await Promise.all([policy,notice].map(d=>getOneFromStore(db,STORES.policyDocuments,d.id)));
 const tx=db.transaction([STORES.policyDocuments,STORES.meta],'readwrite'),done=transactionDone(tx);[policy,notice].forEach((d,i)=>{if(!exists[i])tx.objectStore(STORES.policyDocuments).put(d)});tx.objectStore(STORES.meta).put({id:'workRules20261012',value:'1'});await done;
}
