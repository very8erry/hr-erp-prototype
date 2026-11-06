import {useState} from 'react'
import type {AnnualLeaveLedger,EmployeeView} from '../../domain/types'
import type {PayrollService} from '../payroll/payrollService'
import {Button} from '../../components/ui/button'
import {Input} from '../../components/ui/input'
import {NativeSelect} from '../../components/ui/native-select'
import {Modal} from '../../components/ui/modal'
import {annualPromotion,makeTask} from '../operations/workSchedule'
import {WorkDetail} from '../operations/WorkDetail'
import type {CompanyInfo} from '../payroll/companyInfo'
import type {CalendarEvent} from '../operations/operations'
import type {ScheduleSources} from '../operations/workSchedule'
export function AnnualPromotion({rows,employees,service,onClose}:{rows:AnnualLeaveLedger[];employees:EmployeeView[];service:PayrollService;onClose:()=>void}){
 const [selected,setSelected]=useState<string[]>(rows[0]?[rows[0].id]:[]),[sort,setSort]=useState<'asc'|'desc'>('desc'),[batch,setBatch]=useState(false),[expiry,setExpiry]=useState(`${rows[0]?.year??new Date().getFullYear()}-12-31`),[kind,setKind]=useState<'일반'|'1년 미만'|'추가 발생'>('일반'),[checked,setChecked]=useState(false),[error,setError]=useState(''),[edit,setEdit]=useState<{event:CalendarEvent;info:CompanyInfo;sources:ScheduleSources;events:CalendarEvent[]}|null>(null);
 const sorted=[...rows].sort((a,b)=>(a.remainingDays-b.remainingDays)*(sort==='asc'?1:-1)||a.id.localeCompare(b.id)),ledger=selected[0];
 const choose=(ids:string[])=>{setSelected(ids);if(ids[0]!==ledger){const year=rows.find(r=>r.id===ids[0])?.year??new Date().getFullYear();setExpiry(year+'-12-31');setKind('일반')}setChecked(false)};
 const open=async()=>{try{const l=rows.find(r=>r.id===ledger);if(!l||!expiry||!checked)throw new Error('원장·개별 소멸일을 확인하세요.');const [info,sources,ops]=await Promise.all([service.companyInfo(),service.scheduleSources(),service.operations()]);const event=annualPromotion(makeTask('ANNUAL-PROMOTION-'+kind,expiry,'직원별 연차 사용촉진','연차',[],l.employmentId),expiry,kind,l.id);const existing=ops.calendarEvents.find(e=>e.id===event.id);setEdit({event:existing??event,info,sources,events:ops.calendarEvents});setBatch(true)}catch(e){setError((e as Error).message)}};
 const advance=()=>{setEdit(null);if(selected.length<=1){onClose();return}const next=selected.slice(1);setSelected(next);setExpiry((rows.find(r=>r.id===next[0])?.year??new Date().getFullYear())+'-12-31');setChecked(false);setKind('일반');setError('')};
 if(edit)return <WorkDetail {...edit} service={service} employees={employees} runs={edit.sources.runs} onClose={()=>setEdit(null)} onSaved={advance}/>;
 return <Modal onClose={onClose}><div className="modal" role="dialog" aria-label="연차촉진"><h3>연차촉진</h3>{!batch&&<><div className="toolbar"><label><input type="checkbox" checked={!!rows.length&&rows.every(r=>selected.includes(r.id))} onChange={e=>{choose(e.target.checked?sorted.map(r=>r.id):[])}}/>전체 선택</label><Button onClick={()=>setSort(sort==='asc'?'desc':'asc')}>잔여일수 {sort==='asc'?'오름차순 ↑':'내림차순 ↓'}</Button></div><div className="annualPromotionList">{sorted.map(r=><label key={r.id}><input type="checkbox" checked={selected.includes(r.id)} onChange={e=>{choose(e.target.checked?[...selected,r.id]:selected.filter(id=>id!==r.id))}}/>{employees.find(e=>e.employmentId===r.employmentId)?.name} · {r.year}년 · 잔여 {r.remainingDays}일</label>)}</div></>}<p>선택 {selected.length}명 · 현재 검토: {employees.find(e=>e.employmentId===rows.find(r=>r.id===ledger)?.employmentId)?.name??'—'}</p><label>촉진 구분<NativeSelect value={kind} onChange={e=>{setKind(e.target.value as typeof kind);setChecked(false)}}><option>일반</option><option>1년 미만</option><option>추가 발생</option></NativeSelect></label><label>개별 소멸일<Input type="date" value={expiry} onChange={e=>{setExpiry(e.target.value);setChecked(false)}}/></label><p>1차: 미사용 일수 서면 안내·수령일·회신 확인 / 2차: 미회신자 사용시기 지정·서면 통보</p><label><input type="checkbox" checked={checked} onChange={e=>setChecked(e.target.checked)}/>이 직원의 발생구분과 소멸일을 확인했습니다.</label>{error&&<p role="alert">{error}</p>}<div className="modalActions"><Button onClick={onClose}>닫기</Button><Button disabled={!selected.length} onClick={()=>void open()}>촉진 일정 · 서면 증빙 작성</Button></div></div></Modal>
}
