import { Button } from '../../components/ui/button'
import { NativeSelect } from '../../components/ui/native-select'
import { Input } from '../../components/ui/input'
import {useState} from 'react'
import type {RecruitingState} from './recruiting'
import {EvaluationPanel} from './EvaluationPanel'
import {SelectionCatalog} from './SelectionCatalog'
import {SelectionReview} from './SelectionReview'
export function SelectionWorkspace({state,save,actor,role,onActor,onRole}:{state:RecruitingState;save:(s:RecruitingState)=>Promise<void>;actor:string;role:string;onActor:(s:string)=>void;onRole:(s:string)=>void}){
 const [tab,setTab]=useState('평가 진행'),[candidateId,setCandidateId]=useState(state.candidates.find(c=>c.id==='SEL-CAND-0')?.id??state.candidates[0]?.id??'')
 return <section className="atsScorecard"><h3>채용평가</h3><p className="sectionNote">이 로컬 교육용 앱의 역할 전환은 권한 시뮬레이션입니다. 실제 사용자 인증·서버 접근제어는 연결되어 있지 않습니다.</p><div className="formGrid"><label>현재 사용자<Input value={actor} onChange={e=>onActor(e.target.value)} placeholder="HR Manager / Payroll Lead / HRBP"/></label><label>작업 역할<NativeSelect value={role} onChange={e=>onRole(e.target.value)}><option value="EVALUATOR">평가자 · 독립 평가</option><option value="RECRUITER">채용담당자 · 비교 및 결정</option></NativeSelect></label></div><div className="moduleTabs evaluationTabs">{['평가 템플릿','역량 관리','면접 질문 관리','평가 진행','Calibration','최종결정'].map(t=><Button key={t} className={tab===t?'active':''} onClick={()=>setTab(t)}>{t==='Calibration'?'평가 조율':t}</Button>)}</div>{tab==='평가 진행'&&<EvaluationPanel key="progress" state={state} save={save} mode="progress" actor={actor} role={role} onActor={onActor}/>} {['평가 템플릿','역량 관리','면접 질문 관리'].includes(tab)&&(role!=='RECRUITER'?<p>채용담당자 역할에서 평가 기준을 관리할 수 있습니다.</p>:tab==='평가 템플릿'?<EvaluationPanel key="templates" state={state} save={save} mode="templates" actor={actor} role={role} onActor={onActor}/>:<SelectionCatalog key={tab} state={state} save={save} kind={tab==='역량 관리'?'competencies':'questions'}/>)}{(tab==='Calibration'||tab==='최종결정')&&<SelectionReview key={tab} state={state} save={save} kind={tab} actor={actor} role={role} candidateId={candidateId} onCandidate={setCandidateId}/>}</section>
}
