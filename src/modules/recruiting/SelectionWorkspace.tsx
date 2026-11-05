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
 return <section className="atsScorecard"><h3>채용평가</h3><div className="moduleTabs evaluationTabs">{['평가 템플릿','역량 관리','면접 질문 관리','평가 진행','Calibration','최종결정'].map(t=><Button key={t} className={tab===t?'active':''} onClick={()=>setTab(t)}>{t==='Calibration'?'평가 조율':t}</Button>)}</div>{tab==='평가 진행'&&<EvaluationPanel key="progress" state={state} save={save} mode="progress" actor={actor} role={role} onActor={onActor}/>} {['평가 템플릿','역량 관리','면접 질문 관리'].includes(tab)&&(role!=='RECRUITER'?<p>채용담당자 역할에서 평가 기준을 관리할 수 있습니다.</p>:tab==='평가 템플릿'?<EvaluationPanel key="templates" state={state} save={save} mode="templates" actor={actor} role={role} onActor={onActor}/>:<SelectionCatalog key={tab} state={state} save={save} kind={tab==='역량 관리'?'competencies':'questions'}/>)}{(tab==='Calibration'||tab==='최종결정')&&<SelectionReview key={tab} state={state} save={save} kind={tab} actor={actor} role={role} candidateId={candidateId} onCandidate={setCandidateId}/>}</section>
}
