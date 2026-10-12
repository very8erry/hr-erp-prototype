import {calculateFinalScore,validateWeights,submittedEvaluation} from './scoring'
import {upgradeSelectionState} from './selection'
import type {RecruitingState} from './recruiting'
export type EvaluationType='DOCUMENT'|'INTERVIEW'
export type ScaleType='FIVE'|'YES_NO'|'HUNDRED'
export type Recommendation='매우 추천'|'추천'|'보류'|'비추천'|'매우 비추천'
export interface EvaluationCriterion {competencyId?:string;hurdleMin?:number;questionSnapshots?:import("./selection").InterviewQuestion[];id:string;category:string;name:string;description:string;question:string;required:boolean;weight:number;allowNA:boolean;scaleType:ScaleType;anchors:Record<string,string>;knockout?:boolean}
export interface EvaluationTemplate {jobRole?:string;strictWeights?:boolean;passScore?:number;varianceThreshold?:number;id:string;name:string;type:EvaluationType;stage:string;jobId?:string;version:number;instructions:string;calculationMode:'MANUAL'|'AVERAGE'|'WEIGHTED'|'HURDLE'|'HYBRID';scaleType:ScaleType;active:boolean;criteria:EvaluationCriterion[]}
export interface CriterionScore {competencyId?:string;evidence?:string;criterionId:string;score:number|null;na:boolean;comment:string}
export interface Evaluation {evaluatorId?:string;finalizedAt?:string;id:string;templateId:string;templateVersion:number;templateSnapshot:EvaluationTemplate;candidateId:string;interviewId?:string;evaluator:string;status:'DRAFT'|'SUBMITTED'|'CALIBRATION'|'FINALIZED';criterionScores:CriterionScore[];overallScore:number|null;overallRecommendation:Recommendation;overallComment:string;createdAt:string;submittedAt?:string}
export interface HiringDecision {selectionDecision?:'HIRE'|'HOLD'|'REJECT';evaluationIds?:string[];calibrationIds?:string[];summarySnapshot?:import("./selection").SelectionSummary;candidateId:string;decision:'PASS'|'HOLD'|'FAIL';reason:string;decidedBy:string;decidedAt:string}
export interface Offer {id:string;candidateId:string;organizationId:string;job:string;grade:string;title:string;annualSalary:number;startDate:string;status:'DRAFT'|'SENT'|'ACCEPTED'|'DECLINED';note:string}
export interface OnboardingInput {candidateId:string;offerId:string;employeeNumber:string;birthDate:string;gender:'F'|'M';nationality:string;workLocation:string}
export const recommendations:Recommendation[]=['매우 추천','추천','보류','비추천','매우 비추천']
const docs=['필수 자격요건 충족','관련 경력 및 직무 연관성','담당 업무 범위','주요 성과','직무 전문성','관련 자격/지식','지원동기 및 역할 이해','포트폴리오/과제']
const interviews=['직무 전문성','문제해결 및 판단','의사소통','협업 및 이해관계자 대응','실행력','지원동기 및 역할 이해']
export function newCriterion(name='새 평가항목'):EvaluationCriterion{return {id:crypto.randomUUID(),category:'직무 역량',name,description:'직무 수행에 관련된 구체적인 경험과 성과를 확인합니다.',question:'본인이 맡은 역할, 판단 과정, 결과를 구체적인 사례로 설명해 주세요.',required:true,weight:1,allowNA:false,scaleType:'FIVE',anchors:{1:'관련 경험과 근거가 부족함',2:'일부 경험은 있으나 판단과 확인 근거가 제한적임',3:'역할 수행에 필요한 경험과 판단 근거를 제시함',4:'대안을 비교하고 이해관계자를 고려하여 수행함',5:'복잡한 상황에서 주도적으로 성과를 내고 재현 가능한 근거를 제시함'}}}
export function defaultTemplates():EvaluationTemplate[]{return (['DOCUMENT','INTERVIEW'] as const).map(type=>({id:'EVAL-'+type,name:type==='DOCUMENT'?'공통 서류평가':'공통 면접평가',type,stage:type==='DOCUMENT'?'서류검토':'면접',version:1,instructions:'직무 관련 근거를 기록하세요. 종합추천은 점수와 별도로 판단합니다.',calculationMode:'WEIGHTED',scaleType:'FIVE',active:true,criteria:(type==='DOCUMENT'?docs:interviews).map((name,i)=>({...newCriterion(name),id:type+'-'+i,...(type==='DOCUMENT'&&i===0?{scaleType:'YES_NO' as const,knockout:true,anchors:{0:'필수 자격 미충족',1:'필수 자격 충족'},question:'공고에 명시된 필수 자격요건을 모두 충족하는가?'}:{}),...(type==='DOCUMENT'&&i===7?{required:false,allowNA:true}:{})}))}))}
export function upgradeRecruiting(state:RecruitingState):RecruitingState {
 const base={...state,jobs:state.jobs.map(j=>j.id==='JOB-1'&&j.title==='HR Operations 담당자'?{...j,title:'인사운영 담당자'}:j),templates:state.templates??defaultTemplates(),evaluations:state.evaluations??[],decisions:state.decisions??[],offers:state.offers??[]}
 return upgradeSelectionState({...base,candidates:base.candidates.map(c=>{const {rating,...rest}=c;return rating&&rest.legacyRating===undefined?{...rest,legacyRating:rating}:rest})})
}
export function evaluationTotal(e:Evaluation):number|null{return calculateFinalScore(e).score}
export function validateTemplate(t:EvaluationTemplate){if(!t.name.trim()||!t.criteria.length)throw new Error('평가표 이름과 평가항목을 입력하세요.');if(new Set(t.criteria.map(c=>c.id)).size!==t.criteria.length)throw new Error('평가항목 ID가 중복됩니다.');for(const c of t.criteria)if(!c.name.trim()||!Number.isFinite(c.weight)||c.weight<=0)throw new Error('평가항목 이름과 양수 가중치를 확인하세요.');validateWeights(t);if(t.passScore!==undefined&&(!Number.isFinite(t.passScore)||t.passScore<0||t.passScore>100))throw new Error('합격기준은 0~100점입니다.');if(t.varianceThreshold!==undefined&&(!Number.isFinite(t.varianceThreshold)||t.varianceThreshold<=0||t.varianceThreshold>100))throw new Error('평가자 편차 기준은 0 초과 100 이하입니다.');for(const c of t.criteria)if(c.hurdleMin!==undefined&&(!Number.isFinite(c.hurdleMin)||c.hurdleMin<0||c.hurdleMin>(c.scaleType==='FIVE'?5:c.scaleType==='YES_NO'?1:100)))throw new Error('필수 통과 점수 범위를 확인하세요.')}
export function saveTemplate(state:RecruitingState,t:EvaluationTemplate):RecruitingState{
 validateTemplate(t);if(t.strictWeights&&t.criteria.some(c=>!c.competencyId||!state.competencies?.some(x=>x.id===c.competencyId)))throw new Error('평가항목마다 재사용 역량을 선택하세요.');const old=state.templates?.find(x=>x.id===t.id);const version=old?old.version+1:1
 return {...state,templates:[...(state.templates??[]).filter(x=>x.id!==t.id),structuredClone({...t,version})]}
}
export function createEvaluation(t:EvaluationTemplate,candidateId:string,evaluator:string,interviewId?:string):Evaluation{return {id:crypto.randomUUID(),templateId:t.id,templateVersion:t.version,templateSnapshot:structuredClone(t),candidateId,evaluator,evaluatorId:evaluator,interviewId,status:'DRAFT',criterionScores:t.criteria.map(c=>({criterionId:c.id,competencyId:c.competencyId,score:null,na:false,evidence:'',comment:''})),overallScore:null,overallRecommendation:'보류',overallComment:'',createdAt:new Date().toISOString()}}
export function saveEvaluation(state:RecruitingState,e:Evaluation,submit=false):RecruitingState{
 const old=state.evaluations?.find(x=>x.id===e.id)
 if(old&&submittedEvaluation(old))throw new Error('제출된 평가는 수정할 수 없습니다.')
 if(e.evaluatorId&&e.evaluatorId!==e.evaluator)throw new Error('평가자 식별자를 확인하세요.');if(!state.candidates.some(c=>c.id===e.candidateId)||!e.evaluator.trim())throw new Error('지원자와 평가자를 확인하세요.')
 if(e.interviewId&&!state.interviews.some(i=>i.id===e.interviewId&&i.candidateId===e.candidateId&&i.status!=='취소'))throw new Error('지원자의 유효한 면접 일정을 선택하세요.')
 if(state.evaluations?.some(x=>x.id!==e.id&&x.candidateId===e.candidateId&&x.templateId===e.templateId&&x.interviewId===e.interviewId&&x.evaluator===e.evaluator))throw new Error('동일 평가자의 평가가 이미 있습니다. 기존 초안을 이어서 작성하세요.')
 const canonical=state.templates?.find(t=>t.id===e.templateId)
 if(!old&&(!canonical||!canonical.active||canonical.version!==e.templateVersion))throw new Error('현재 사용 가능한 평가표 버전을 선택하세요.')
 const t=old?.templateSnapshot??canonical!
 if(JSON.stringify(t)!==JSON.stringify(e.templateSnapshot))throw new Error('평가표 기준은 직접 변경할 수 없습니다.')
 if(old&&(old.candidateId!==e.candidateId||old.evaluator!==e.evaluator||old.interviewId!==e.interviewId&&old.interviewId!==undefined))throw new Error('평가 대상과 평가자를 변경할 수 없습니다.')
 if(t.jobId&&state.candidates.find(c=>c.id===e.candidateId)?.jobId!==t.jobId)throw new Error('공고에 연결된 평가표를 선택하세요.')
 if(submit&&t.type==='INTERVIEW'&&!e.interviewId)throw new Error('면접 일정을 선택하세요.')
 if(e.criterionScores.length!==t.criteria.length||new Set(e.criterionScores.map(s=>s.criterionId)).size!==t.criteria.length||e.criterionScores.some(s=>!t.criteria.some(c=>c.id===s.criterionId)))throw new Error('평가항목을 확인하세요.');if(t.strictWeights&&e.criterionScores.some(s=>s.competencyId!==t.criteria.find(c=>c.id===s.criterionId)?.competencyId))throw new Error('평가항목의 역량 연결을 확인하세요.');if(submit){for(const c of t.criteria){const s=e.criterionScores.find(s=>s.criterionId===c.id);if(s?.na&&!c.allowNA)throw new Error(c.name+': N/A를 허용하지 않습니다.');if(c.required&&(!s||!s.na&&s.score===null))throw new Error(c.name+': 필수 점수를 입력하세요.');if(s&&!s.na&&s.score!==null){const max=c.scaleType==='HUNDRED'?100:c.scaleType==='YES_NO'?1:5,min=c.scaleType==='FIVE'?1:0;if(!Number.isFinite(s.score)||s.score<min||s.score>max||c.scaleType!=='HUNDRED'&&!Number.isInteger(s.score))throw new Error(c.name+': 점수 범위를 확인하세요.');if(t.strictWeights?!s.evidence?.trim():!s.comment.trim()&&!s.evidence?.trim())throw new Error(c.name+': 평가근거(Evidence)를 기록하세요.')}}if(!e.overallComment.trim())throw new Error('종합의견을 입력하세요.');if(t.calculationMode==='MANUAL'&&(e.overallScore===null||e.overallScore<0||e.overallScore>100||!Number.isFinite(e.overallScore)))throw new Error('수동 총점은 0~100점입니다.')}
 const next={...e,templateSnapshot:structuredClone(t),templateVersion:t.version,overallScore:evaluationTotal({...e,templateSnapshot:t}),status:submit?'SUBMITTED' as const:'DRAFT' as const,submittedAt:submit?new Date().toISOString():undefined}
 return {...state,evaluations:[...(state.evaluations??[]).filter(x=>x.id!==e.id),structuredClone(next)]}
}
// Evaluator mode reveals only the current evaluator's drafts/results. Recruiter comparison reveals submitted results only.
export function visibleEvaluations(state:RecruitingState,evaluator:string,comparison=false):Evaluation[]{return (state.evaluations??[]).filter(e=>comparison?submittedEvaluation(e):e.evaluator===evaluator)}
export function decideCandidate(state:RecruitingState,d:HiringDecision):RecruitingState{
 if(!d.reason.trim()||!d.decidedBy.trim())throw new Error('결정자와 결정 사유를 입력하세요.')
 const c=state.candidates.find(c=>c.id===d.candidateId);if(!c||c.employmentId)throw new Error('결정할 지원자를 확인하세요.')
 if(d.decision!=='PASS'&&state.offers?.some(o=>o.candidateId===d.candidateId&&o.status==='ACCEPTED'))throw new Error('수락된 오퍼가 있습니다. 결정 변경 전에 오퍼를 확인하세요.')
 const stage=d.decision==='PASS'?'처우협의':d.decision==='FAIL'?'불합격':c.stage
 return {...state,decisions:[...(state.decisions??[]).filter(x=>x.candidateId!==d.candidateId),d],candidates:state.candidates.map(c=>c.id===d.candidateId?{...c,stage,history:[...(c.history??[]),{date:d.decidedAt,stage}]}:c),interviews:state.interviews.map(i=>d.decision==='FAIL'&&i.candidateId===d.candidateId&&i.status==='예정'?{...i,status:'취소'}:i)}
}
export function saveOffer(state:RecruitingState,o:Offer):RecruitingState{
 if(!state.decisions?.some(d=>d.candidateId===o.candidateId&&d.decision==='PASS'))throw new Error('최종 합격 지원자에게만 오퍼를 작성할 수 있습니다.')
 if(!o.organizationId||!o.job.trim()||!/^\d{4}-\d{2}-\d{2}$/.test(o.startDate)||!Number.isFinite(o.annualSalary)||o.annualSalary<=0)throw new Error('조직·직무·연봉·입사예정일을 확인하세요.')
 if(state.candidates.find(c=>c.id===o.candidateId)?.employmentId)throw new Error('입사전환된 지원자의 오퍼는 변경할 수 없습니다.')
 if(state.offers?.some(x=>x.id!==o.id&&x.candidateId===o.candidateId&&x.status!=='DECLINED'))throw new Error('기존 오퍼를 수정하세요.')
 const old=state.offers?.find(x=>x.id===o.id),allowed={DRAFT:['DRAFT','SENT'],SENT:['SENT','ACCEPTED','DECLINED'],ACCEPTED:['ACCEPTED'],DECLINED:['DECLINED','DRAFT']}
 if(!allowed[old?.status??'DRAFT'].includes(o.status))throw new Error('오퍼는 작성중 → 발송 → 수락/거절 순서로 변경하세요.')
 return {...state,offers:[...(state.offers??[]).filter(x=>x.id!==o.id),o]}
}
