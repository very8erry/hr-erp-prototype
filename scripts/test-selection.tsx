import 'fake-indexeddb/auto'
import assert from 'node:assert/strict'
import React from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {recruitingSeed} from '../src/modules/recruiting/recruiting'
import {createEvaluation,saveEvaluation,saveTemplate,visibleEvaluations,upgradeRecruiting} from '../src/modules/recruiting/evaluations'
import {saveCompetency,saveQuestion,competencyCriterion,candidateSelectionSummary,newCalibration,saveCalibration,finalizeSelection,upgradeSelectionState} from '../src/modules/recruiting/selection'
import {calculateAverageScore,calculateWeightedScore,calculateFinalScore,calculateEvaluatorVariance} from '../src/modules/recruiting/scoring'
import {evaluationPayload} from '../src/modules/recruiting/selectionAudit'
import {CandidateEvaluationSummary,canCompareSelection,SelectionReview} from '../src/modules/recruiting/SelectionReview'
import {IndexedDbHrRepository} from '../src/infrastructure/db/indexedDb'
Object.assign(globalThis,{React})
const repo=new IndexedDbHrRepository();await repo.initialize();let state=await repo.recruiting()
assert.deepEqual(upgradeSelectionState(state),state)
assert.equal(new Set(state.candidates.map(c=>c.id)).size,state.candidates.length)
const sample=candidateSelectionSummary(state,'SEL-CAND-0');assert(sample.groups[0].criteria[2].variance.needsCalibration);assert(sample.groups[0].variance.needsCalibration)
const high=candidateSelectionSummary(state,'SEL-CAND-2');assert(high.score!>70);assert.equal(high.hurdlePass,false);assert(high.failures.length)
assert.equal(canCompareSelection(state,'SEL-CAND-1','HRBP','RECRUITER'),false)
const hidden=renderToStaticMarkup(<SelectionReview state={state} save={async()=>{}} kind="Calibration" actor="HRBP" role="RECRUITER" candidateId="SEL-CAND-1" onCandidate={()=>{}}/>);assert(!hidden.includes('가상 답변 관찰'));assert(!hidden.includes('selectionMatrix'))
const chart=renderToStaticMarkup(<CandidateEvaluationSummary state={state} candidateId="SEL-CAND-0" actor="HR Manager" role="RECRUITER"/>);for(const item of sample.groups[0].criteria)assert(chart.includes(`value="${item.average}"`));assert(chart.includes('max="5"'))
const comp={...structuredClone(state.competencies!.find(c=>c.id==='SEL-COMP-2')!),id:'TEST-COMP',name:'검증 역량'};state=saveCompetency(state,comp);await repo.saveRecruiting(state)
const q={...structuredClone(state.questions!.find(q=>q.id==='SEL-Q-2')!),id:'TEST-QUESTION',competencyId:comp.id};state=saveQuestion(state,q);await repo.saveRecruiting(state)
const source=state.templates!.find(t=>t.id==='SEL-TEMPLATE-PAYROLL')!,t={...structuredClone(source),id:'TEST-TEMPLATE',name:'실습 전체 흐름',jobId:undefined,criteria:[{...competencyCriterion(comp,[q],100),hurdleMin:3}]};state=saveTemplate(state,t);await repo.saveRecruiting(state)
assert.throws(()=>saveTemplate(state,{...t,criteria:[{...t.criteria[0],weight:90}]}),/100%/)
assert.equal(calculateAverageScore([{score:5,max:5,weight:3},{score:2,max:5,weight:1}]),70)
assert.equal(calculateWeightedScore([{score:5,max:5,weight:3},{score:2,max:5,weight:1}]),85)
assert(calculateEvaluatorVariance([92,88,50]).needsCalibration)
const cid=state.candidates[0].id
const a=createEvaluation(t,cid,'TEST-A','TEST-INTERVIEW'),b=createEvaluation(t,cid,'TEST-B','TEST-INTERVIEW')
state={...state,interviews:[...state.interviews,{id:'TEST-INTERVIEW',candidateId:cid,start:'2026-10-10T10:00',end:'2026-10-10T11:00',interviewer:'TEST-A/TEST-B',location:'실습',status:'예정',note:''}]};await repo.saveRecruiting(state)
a.criterionScores[0]={...a.criterionScores[0],score:5,evidence:'오류 원인과 검증 결과를 설명함',comment:'추가 질문 필요'};a.overallComment='검증 절차를 구체적으로 설명함'
b.criterionScores[0]={...b.criterionScores[0],score:2,evidence:'원인 분석 근거를 설명하지 못함',comment:'근거 부족'};b.overallComment='근거 재확인 필요'
state=saveEvaluation(state,a);await repo.saveRecruiting(state);state=saveEvaluation(state,b,true);await repo.saveRecruiting(state)
assert(!canCompareSelection(state,cid,'TEST-A','RECRUITER'));assert(visibleEvaluations(state,'TEST-A').every(e=>e.evaluator==='TEST-A'))
state=saveEvaluation(state,a,true);await repo.saveRecruiting(state);assert(canCompareSelection(state,cid,'TEST-A','RECRUITER'))
const originals=state.evaluations!.filter(e=>e.candidateId===cid).map(evaluationPayload)
const group=candidateSelectionSummary(state,cid).groups[0];assert.equal(group.score,70);assert.equal(group.hurdlePass,false)
assert.equal(calculateFinalScore({...a,templateSnapshot:{...t,calculationMode:'HURDLE'}}).score,100)
const cal=newCalibration(group,cid,'채용담당');cal.reason='근거 비교 후 업무상 확인 수준에 합의';cal.items[0].calibratedScore=4;cal.items[0].reason='후속 답변에서 원인 확인 절차를 확인함'
const invalid=structuredClone(cal);invalid.items[0].originalScores[0].evidence='변조';assert.throws(()=>saveCalibration(state,invalid),/원점수/)
state=saveCalibration(state,cal);await repo.saveRecruiting(state);assert.deepEqual(state.evaluations!.filter(e=>e.candidateId===cid).map(evaluationPayload),originals);assert.equal(candidateSelectionSummary(state,cid).score,80)
const tamper=structuredClone(state);tamper.evaluations!.find(e=>e.candidateId===cid)!.criterionScores[0].score=1;await assert.rejects(()=>repo.saveRecruiting(tamper),/원점수/)
const tamperHistory=structuredClone(state);tamperHistory.calibrations![0].reason='변조';await assert.rejects(()=>repo.saveRecruiting(tamperHistory),/이력/)
state=finalizeSelection(state,cid,'HIRE','구조화 면접과 추가 Evidence에서 역할 수행 기준 충족','채용담당');await repo.saveRecruiting(state)
assert(state.evaluations!.filter(e=>e.candidateId===cid).every(e=>e.status==='FINALIZED'));assert.equal(state.decisions!.find(d=>d.candidateId===cid)!.decision,'PASS');assert.deepEqual(state.evaluations!.filter(e=>e.candidateId===cid).map(evaluationPayload),originals)
await assert.rejects(()=>repo.saveRecruiting({...state,evaluations:state.evaluations!.filter(e=>e.candidateId!==cid)}),/삭제/)
const reload=new IndexedDbHrRepository();await reload.initialize();assert.deepEqual(await reload.recruiting(),state)
const backup=await repo.exportDatabase();await repo.importDatabase(backup);assert.deepEqual(await repo.recruiting(),state)
const logs=await repo.listAuditLogs();for(const action of ['CREATE','UPDATE','SUBMIT','CALIBRATE','FINALIZE']){if(action==='UPDATE'){const updated=saveQuestion(state,{...q,question:'질문 수정'});await repo.saveRecruiting(updated);assert((await repo.listAuditLogs()).some(l=>l.action===action))}else assert(logs.some(l=>l.action===action))}
const finalized=logs.find(l=>l.action==='FINALIZE')!;assert.equal(JSON.parse(finalized.detail).userId,'채용담당');assert(JSON.parse(finalized.detail).after.summarySnapshot)
const legacy=structuredClone(recruitingSeed());delete legacy.selectionVersion;delete legacy.competencies;delete legacy.questions;delete legacy.calibrations;const beforeLegacy=structuredClone(legacy.evaluations);const migrated=upgradeRecruiting(legacy);assert.deepEqual(migrated.evaluations,beforeLegacy);assert.equal(new Set(migrated.candidates.map(c=>c.id)).size,migrated.candidates.length)
console.log('PASS Selection A–F: entities/questions/templates → independent draft/submit → calibration → human final decision; strict weights; high-score hurdle failure; evidence/privacy; immutable originals/history; exact progress values; IndexedDB reload/backup; audits; idempotent legacy migration')
