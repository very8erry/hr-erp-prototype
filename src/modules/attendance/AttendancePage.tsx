import {attendanceDayLabel} from './timeRules'
import {DownloadActions} from '../../components/DownloadActions'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { AnnualLeaveLedger, AttendanceDailyRecord, AttendanceMonthlySummary, EmployeeView, LeaveCase } from '../../domain/types'
import type { PayrollService } from '../payroll/payrollService'

import { attendanceFields, AttendanceBatchEditor, AttendanceEditor, AttendanceCalendar, LeaveCaseEditor } from './AttendanceTools'

import {columns,attendanceIssue,attendanceRows,parseAttendance,readTable,exportTable} from './attendanceFiles'
import {PersonalDetail} from '../payroll/PayrollTools'
import {AnnualLeavePanel} from './AnnualLeavePanel'
import {ScrollTable} from '../../components/ScrollTable'

type AttendanceView = 'summary' | 'leave'

type Filters = {
  query: string
  org: string
  grade: string
  employeeId: string
  from: string
  to: string
}

function moneyHours(v:number){return Number.isInteger(v)?String(v):v.toFixed(1)}

export function AttendancePage({service,employees,allowLeaveRegistration=true}:{service:PayrollService;employees:EmployeeView[];allowLeaveRegistration?:boolean}){
  const today=new Date(); const currentMonth=`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}`
  const [payDates,setPayDates]=useState<Record<string,string>>({})
  const [closed,setClosed]=useState(false),[cases,setCases]=useState<LeaveCase[]>([]),[leaveEditing,setLeaveEditing]=useState<LeaveCase|null>(null)
  const importFile=useRef<HTMLInputElement>(null);const [fileError,setFileError]=useState('')
  const [detail,setDetail]=useState<AttendanceMonthlySummary|null>(null)
  const [editing,setEditing]=useState<AttendanceMonthlySummary|null>(null)
  const [batch,setBatch]=useState(false)
  const [calendar,setCalendar]=useState(false)
  const refresh=async()=>{setDaily(await service.dailyAttendance());setRows(await service.attendance());setLeave(await service.annualLeave());setCases(await service.leaveCases());setPayDates(Object.fromEntries((await service.runs()).map(r=>[r.period,r.payDate])))}
  const [view,setView]=useState<AttendanceView>('summary')
  const [rows,setRows]=useState<AttendanceMonthlySummary[]>([]),[daily,setDaily]=useState<AttendanceDailyRecord[]>([])
  const [leave,setLeave]=useState<AnnualLeaveLedger[]>([])
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  const [filters,setFilters]=useState<Filters>({query:'',org:'ALL',grade:'ALL',employeeId:'ALL',from:currentMonth,to:currentMonth})

  const [applied,setApplied]=useState(filters)
  const closeMonth=applied.to
  useEffect(()=>{let active=true;setClosed(false);void service.isAttendanceClosed(closeMonth).then(v=>{if(active)setClosed(v)});return()=>{active=false}},[service,closeMonth])
  const editLeave=(employeeId:string,period:string)=>{
    const row=cases.find(l=>l.employmentId===employeeId&&l.startDate<=`${period}-31`&&(!l.endDate||l.endDate>=`${period}-01`))
    setLeaveEditing(row??{id:`LC-${crypto.randomUUID()}`,employmentId:employeeId,kind:'UNCLASSIFIED',startDate:`${period}-01`,endDate:null,companyPayRate:0,pensionExceptionApproved:false,healthDeferred:false,healthPremiumOverride:null,employmentBaseOverride:null,benefitAmount:0,averageWageExcluded:false,yearEndNote:'',note:'',updatedAt:''})
  }
  useEffect(()=>{let active=true; void Promise.all([service.attendance(),service.annualLeave(),service.leaveCases(),service.runs(),service.dailyAttendance()]).then(([a,l,c,runs,daily])=>{if(!active)return;setDaily(daily);setRows(a);setLeave(l);setCases(c);setPayDates(Object.fromEntries(runs.map(r=>[r.period,r.payDate])));setLoading(false)}).catch(err=>{if(!active)return;setError(err instanceof Error?err.message:'근태 데이터를 불러오지 못했습니다.');setLoading(false)});return()=>{active=false}},[service])

  const orgs=useMemo(()=>[...new Set(employees.map(e=>e.organizationName))].sort(),[employees])
  const grades=useMemo(()=>[...new Set(employees.map(e=>e.grade))].sort(),[employees])
  const employeeMap=useMemo(()=>new Map(employees.map(e=>[e.employmentId,e])),[employees])
  const filtered=useMemo(()=>rows.filter(r=>{
    const e=employeeMap.get(r.employmentId)
    if(!e) return false
    if(applied.query&&!`${e.name} ${e.employeeNumber}`.toLowerCase().includes(applied.query.trim().toLowerCase()))return false
    if(applied.org!=='ALL' && r.organizationNameSnapshot!==applied.org) return false
    if(applied.grade!=='ALL' && r.gradeSnapshot!==applied.grade) return false
    if(applied.employeeId!=='ALL' && r.employmentId!==applied.employeeId) return false
    if(r.period<applied.from || r.period>applied.to) return false
    return true
  }),[rows,employeeMap,applied])
  const leaveYear=Number(applied.to.slice(0,4))
  const filteredLeave=useMemo(()=>leave.filter(r=>{
    const e=employeeMap.get(r.employmentId)
    if(!e || r.year!==leaveYear) return false
    if(applied.org!=='ALL' && e.organizationName!==applied.org) return false
    if(applied.grade!=='ALL' && e.grade!==applied.grade) return false
    if(applied.employeeId!=='ALL' && r.employmentId!==applied.employeeId) return false
    return true
  }),[leave,leaveYear,employeeMap,applied])

  const displayColumns=allowLeaveRegistration?columns:[...columns,'회사 지급비율','연금 처리','건보 처리','건보 고지액','고용보험 신고보수','연말정산']
  const displayRows=(data:AttendanceMonthlySummary[])=>attendanceRows(data,employees,cases,payDates).map((values,index)=>{
    if(allowLeaveRegistration)return values
    const r=data[index],l=cases.find(l=>l.employmentId===r.employmentId&&l.startDate<=`${r.period}-31`&&(!l.endDate||l.endDate>=`${r.period}-01`))
    return [...values,l?`${l.companyPayRate*100}%`:'—',l?.pensionExceptionApproved?'납부예외 승인':l?'일반 부과':'—',l?.healthDeferred?'고지 유예':l?'일반 부과':'—',l?.healthPremiumOverride??'—',l?.employmentBaseOverride??'—',l?.yearEndNote??'—']
  })
  if(loading) return <section><div className="pageTitle"><div><h2>근태 WFM</h2><p>근태 데이터를 불러오는 중입니다.</p></div></div></section>
  if(error) return <section><div className="pageTitle"><div><h2>근태 WFM</h2><p>{error}</p></div></div></section>

  return <section>
    <div className="pageTitle"><div><h2>근태 WFM</h2></div><div className="pageActions"><button onClick={()=>setBatch(true)}>근태 일괄 수기 수정</button><button onClick={()=>setCalendar(true)}>근태 캘린더</button></div></div>
    <div className="moduleTabs"><button className={view==='summary'?'active':''} onClick={()=>setView('summary')}>근태 조회</button><button className={view==='leave'?'active':''} onClick={()=>setView('leave')}>연차 조회</button></div>
    <div className="filters attendanceFilters"><input aria-label="근태 이름 검색" placeholder="이름 / 사번 검색" value={filters.query} onChange={e=>{setFilters(v=>({...v,query:e.target.value}));setApplied(v=>({...v,query:e.target.value}))}}/>
      <select value={filters.org} onChange={e=>setFilters(v=>({...v,org:e.target.value}))}><option value="ALL">전체 팀</option>{orgs.map(v=><option key={v}>{v}</option>)}</select>
      <select value={filters.grade} onChange={e=>setFilters(v=>({...v,grade:e.target.value}))}><option value="ALL">전체 직급</option>{grades.map(v=><option key={v}>{v}</option>)}</select>
      <select value={filters.employeeId} onChange={e=>setFilters(v=>({...v,employeeId:e.target.value}))}><option value="ALL">전체 개인</option>{employees.map(e=><option key={e.employmentId} value={e.employmentId}>{e.name} ({e.employeeNumber})</option>)}</select>
      <input type="month" value={filters.from} onChange={e=>setFilters(v=>({...v,from:e.target.value}))}/>
      <span className="rangeMark">~</span>
      <input type="month" value={filters.to} onChange={e=>setFilters(v=>({...v,to:e.target.value}))}/><button onClick={()=>{if(!filters.from||!filters.to||filters.from>filters.to){setFileError('조회 기간을 확인하세요.');return}setApplied({...filters});setFileError('')}}>조회</button>
    </div>
    {view==='summary'&&<><div className="payrollActions"><DownloadActions name={'근태_조회목록'} headers={displayColumns} rows={displayRows(filtered)} label="근태 내보내기"/><button onClick={()=>importFile.current?.click()}>근태 가져오기</button><input ref={importFile} hidden type="file" accept=".xlsx,.json,.csv" onChange={e=>{const f=e.target.files?.[0];e.currentTarget.value='';if(f)void (async()=>{setFileError('');const next=parseAttendance(await readTable(f),employees,await service.attendance());await service.saveAttendanceBatch(next,[],next.map(r=>r.editReason).filter(Boolean).join(' / ')||'파일 수기 정정');await refresh()})().catch(e=>setFileError(e.message))}}/></div>{fileError&&<p role="alert">{fileError}</p>}<div className="payrollActions"><span>전체 {filtered.length}건</span><button disabled={closed} title={`${closeMonth} 근태 마감`} onClick={()=>void service.closeAttendance(closeMonth).then(async()=>{setClosed(true);await refresh()}).catch(e=>setFileError(e.message))}>{closed?'근태 마감 완료':'근태 마감'}</button></div><div className="attendanceTable"><ScrollTable><table><thead><tr>{displayColumns.map(h=><th key={h}>{h}</th>)}<th>관리</th>{allowLeaveRegistration&&<th>휴직 등록·수정</th>}<th>(정상) 이슈사항</th></tr></thead><tbody>{filtered.map(r=><tr className={r.confirmedAt?'confirmedRow':''} key={r.id} tabIndex={0} onClick={()=>setDetail(r)} onKeyDown={e=>{if(e.key==='Enter')setDetail(r)}}>{displayRows([r])[0].map((v,i)=><td key={displayColumns[i]}>{v}</td>)}<td>{r.confirmedAt?<span className="confirmedMark">확정</span>:<><button onClick={e=>{e.stopPropagation();setEditing(r)}}>수정</button><button onClick={e=>{e.stopPropagation();if(window.confirm('확정 후 해당 월의 근태와 일별 기록을 수정할 수 없습니다. 확정하시겠습니까?'))void service.confirmRecords('attendance',[r.id]).then(refresh).catch(e=>setFileError(e.message))}}>확정</button></>}</td>{allowLeaveRegistration&&<td><button disabled={!!r.confirmedAt} onClick={e=>{e.stopPropagation();editLeave(r.employmentId,r.period)}}>휴직 등록·수정</button></td>}<td className={attendanceIssue(r)==='정상'?'issueNormal':'issueWarning'}>{attendanceIssue(r)}</td></tr>)}</tbody><tfoot><tr><td colSpan={9}>총 {new Set(filtered.map(r=>r.employmentId)).size}명</td>{Object.keys(attendanceFields).map(k=><td key={k}>{moneyHours(filtered.reduce((sum,r)=>sum+r[k as keyof typeof attendanceFields],0))}</td>)}<td colSpan={10+(allowLeaveRegistration?1:6)}/></tr></tfoot></table></ScrollTable></div></>}
    {view==='leave'&&<AnnualLeavePanel rows={filteredLeave} employees={employees} service={service} onChanged={refresh}/>}
    {allowLeaveRegistration&&leaveEditing&&<LeaveCaseEditor employees={employees} service={service} initial={leaveEditing} onClose={()=>setLeaveEditing(null)} onChanged={refresh}/>}
    {detail&&<PersonalDetail title={`${employeeMap.get(detail.employmentId)?.name} · ${detail.period} 근태 상세`} values={Object.fromEntries(columns.map((h,i)=>[h,attendanceRows([detail],employees,cases,payDates)[0][i]]))} onClose={()=>setDetail(null)} onEdit={detail.confirmedAt?undefined:()=>{setEditing(detail);setDetail(null)}}><h4>일별 근태 상세</h4><ScrollTable><table><thead><tr><th>날짜</th><th>근태 / 유급·무급</th><th>기타메모</th><th>파일첨부</th></tr></thead><tbody>{daily.filter(r=>r.employmentId===detail.employmentId&&r.workDate.startsWith(detail.period)).map(r=><tr key={r.id}><td>{r.workDate}</td><td>{attendanceDayLabel(r)}</td><td>{r.note??''}</td><td>{r.attachments?.map(f=><a key={f.id} href={f.dataUrl} download={f.name}>{f.name}</a>)}</td></tr>)}</tbody></table></ScrollTable></PersonalDetail>}
    {editing&&<AttendanceEditor employees={employees} service={service} onChanged={refresh} row={editing} onClose={()=>setEditing(null)} onSave={async(r)=>{await service.saveAttendanceBatch([r],[],r.editReason??'');await refresh();setEditing(null)}}/>}
    {batch&&<AttendanceBatchEditor service={service} rows={filtered.filter(r=>!r.confirmedAt)} employees={employees} onClose={()=>setBatch(false)} onSave={async(next,reason)=>{await service.saveAttendanceBatch(next,[],reason);await refresh();setBatch(false)}}/>}
    {calendar&&<AttendanceCalendar employees={employees} service={service} onClose={()=>setCalendar(false)} onSaved={refresh}/>}
  </section>
}

