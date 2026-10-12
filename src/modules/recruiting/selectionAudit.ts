import type {AuditLog} from '../../domain/types'
import type {RecruitingState} from './recruiting'
import type {Evaluation} from './evaluations'
import {saveCalibration,saveCompetency,saveQuestion,finalizeSelection} from './selection'
export function evaluationPayload(e:Evaluation){const {status,finalizedAt,...payload}=e;return payload}
export function selectionAuditChanges(before:RecruitingState,next:RecruitingState):AuditLog[]{
 const logs:AuditLog[]=[],now=new Date().toISOString(),audit=(entityType:string,entityId:string,action:string,old:unknown,row:unknown,userId='HR_ADMIN')=>logs.push({id:`AUD-${crypto.randomUUID()}`,occurredAt:now,actor:userId,action,entityType,entityId,detail:JSON.stringify({userId,before:old??null,after:row,createdAt:now})})
 for(const c of next.competencies??[]){const old=before.competencies?.find(x=>x.id===c.id);if(JSON.stringify(c)!==JSON.stringify(old)){saveCompetency(next,c);audit('COMPETENCY',c.id,old?'UPDATE':'CREATE',old,c)}}
 for(const q of next.questions??[]){const old=before.questions?.find(x=>x.id===q.id);if(JSON.stringify(q)!==JSON.stringify(old)){saveQuestion(next,q);audit('INTERVIEW_QUESTION',q.id,old?'UPDATE':'CREATE',old,q)}}
 for(const t of next.templates??[]){const old=before.templates?.find(x=>x.id===t.id);if(JSON.stringify(t)!==JSON.stringify(old))audit('EVALUATION_TEMPLATE',t.id,old?'UPDATE':'CREATE',old,t)}
 const calibrated=new Set<string>(),finalized=new Set<string>()
 for(const old of before.calibrations??[])if(JSON.stringify(next.calibrations?.find(x=>x.id===old.id))!==JSON.stringify(old))throw new Error('Calibration 이력은 변경하거나 삭제할 수 없습니다. 새 차수로 저장하세요.')
 for(const c of next.calibrations??[]){if(before.calibrations?.some(x=>x.id===c.id))continue;saveCalibration(before,c);c.evaluationIds.forEach(id=>calibrated.add(id));audit('CALIBRATION',c.id,'CALIBRATE',null,c,c.calibratedBy)}
 for(const d of next.decisions??[]){const old=before.decisions?.find(x=>x.candidateId===d.candidateId);if(JSON.stringify(old)===JSON.stringify(d)||!d.selectionDecision)continue;const verified=finalizeSelection(before,d.candidateId,d.selectionDecision,d.reason,d.decidedBy).decisions!.find(x=>x.candidateId===d.candidateId)!;if(JSON.stringify(verified.summarySnapshot)!==JSON.stringify(d.summarySnapshot)||JSON.stringify(verified.evaluationIds)!==JSON.stringify(d.evaluationIds)||JSON.stringify(verified.calibrationIds)!==JSON.stringify(d.calibrationIds))throw new Error('최종 결정 시점의 평가와 Calibration 근거를 보존해야 합니다.');d.evaluationIds?.forEach(id=>finalized.add(id));audit('HIRING_DECISION',d.candidateId,'FINALIZE',old,d,d.decidedBy)}
 for(const old of before.evaluations??[]){const row=next.evaluations?.find(x=>x.id===old.id);if(old.status!=='DRAFT'){if(!row||JSON.stringify(evaluationPayload(old))!==JSON.stringify(evaluationPayload(row)))throw new Error('제출된 평가의 원점수·Evidence·기준은 변경하거나 삭제할 수 없습니다.');if(row.status!==old.status){if(row.status==='CALIBRATION'&&calibrated.has(row.id)&&old.status!=='FINALIZED')continue;if(row.status==='FINALIZED'&&finalized.has(row.id))continue;throw new Error('Calibration 또는 최종결정 기능으로만 평가상태를 변경할 수 있습니다.')}if(row.finalizedAt!==old.finalizedAt)throw new Error('평가 확정 시각을 변경할 수 없습니다.')}}
 for(const e of next.evaluations??[]){const old=before.evaluations?.find(x=>x.id===e.id);if(JSON.stringify(e)===JSON.stringify(old))continue;if(!old||old.status==='DRAFT'){if(!['DRAFT','SUBMITTED'].includes(e.status))throw new Error('평가 초안 저장 또는 제출부터 진행하세요.');audit('EVALUATION',e.id,e.status==='SUBMITTED'?'SUBMIT':old?'UPDATE':'CREATE',old,e,e.evaluatorId??e.evaluator)}}
 return logs
}
