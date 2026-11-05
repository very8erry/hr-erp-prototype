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
 const [ledger,setLedger]=useState(rows[0]?.id??''),[expiry,setExpiry]=useState(`${rows[0]?.year??new Date().getFullYear()}-12-31`),[kind,setKind]=useState<'일반'|'1년 미만'|'추가 발생'>('일반'),[checked,setChecked]=useState(false),[error,setError]=useState(''),[edit,setEdit]=useState<{event:CalendarEvent;info:CompanyInfo;sources:ScheduleSources;events:CalendarEvent[]}|null>(null);
 const open=async()=>{try{const l=rows.find(r=>r.id===ledger);if(!l||!expiry||!checked)throw new Error('원장·개별 소멸일을 확인하세요.');const [info,sources,ops]=await Promise.all([service.companyInfo(),service.scheduleSources(),service.operations()]);const event=annualPromotion(makeTask('ANNUAL-PROMOTION-'+kind,expiry,'직원별 연차 사용촉진','연차',[],l.employmentId),expiry,kind,l.id);const existing=ops.calendarEvents.find(e=>e.id===event.id);setEdit({event:existing??event,info,sources,events:ops.calendarEvents})}catch(e){setError((e as Error).message)}};
 if(edit)return <WorkDetail {...edit} service={service} employees={employees} runs={edit.sources.runs} onClose={onClose} onSaved={onClose}/>;
 return <Modal onClose={onClose}><div className="modal" role="dialog" aria-label="연차촉진"><h3>연차촉진</h3><label>직원 · 연차 원장<NativeSelect value={ledger} onChange={e=>{setLedger(e.target.value);setChecked(false)}}>{rows.map(r=><option key={r.id} value={r.id}>{employees.find(e=>e.employmentId===r.employmentId)?.name} · {r.year}년 · 잔여 {r.remainingDays}일</option>)}</NativeSelect></label><label>촉진 구분<NativeSelect value={kind} onChange={e=>{setKind(e.target.value as typeof kind);setChecked(false)}}><option>일반</option><option>1년 미만</option><option>추가 발생</option></NativeSelect></label><label>개별 소멸일<Input type="date" value={expiry} onChange={e=>{setExpiry(e.target.value);setChecked(false)}}/></label><p>1차: 미사용 일수 서면 안내·수령일·회신 확인 / 2차: 미회신자 사용시기 지정·서면 통보</p><label><input type="checkbox" checked={checked} onChange={e=>setChecked(e.target.checked)}/>이 직원의 발생구분과 소멸일을 확인했습니다.</label>{error&&<p role="alert">{error}</p>}<div className="modalActions"><Button onClick={onClose}>닫기</Button><Button onClick={()=>void open()}>촉진 일정 · 서면 증빙 작성</Button></div></div></Modal>
}
