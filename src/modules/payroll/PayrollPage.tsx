import {UnifiedPayroll} from './UnifiedPayroll'
import {SettlementSettings} from './SettlementSettings'
import {DownloadActions} from '../../components/DownloadActions'
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import type {
  AnnualLeaveLedger,
  AttendanceMonthlySummary,
  EmployeeView,
  PayrollEntry,
  PayrollEntryInput,
  PayrollItemMaster,
  PayrollResult,
  PayrollRun,
  RetirementSettlement,
  Organization,
  YearEndTaxCase,
} from '../../domain/types'
import { PayrollService } from './payrollService'
import { FilingPanel } from './FilingPanel'
import {AnnualLeavePanel} from '../attendance/AnnualLeavePanel'
import { AttendancePage } from '../attendance/AttendancePage'
import { readTable, exportTable, type FileFormat } from '../attendance/attendanceFiles'
import { PayrollSettingsPanel, CalculationOptions, PersonalDetail } from './PayrollTools'

import {DailyWorkerPage} from './DailyWorkerPage'
import {RetirementPanel,YearEndPanel} from './SettlementPanels'
import {EntryModal} from './PayrollEntryEditor'
import {ScrollTable} from '../../components/ScrollTable'
import {amountLabels,inputLabels,payrollColumns,payrollHeaders,payrollValues,payrollDetail,parsePayrollRows,parsePayrollQueryRows,batchPayrollValues,type PayrollRow} from './payrollColumns'
const won = new Intl.NumberFormat('ko-KR')
const money = (value:number) => `${won.format(Math.round(value))}원`
const currentMonth = () => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}` }
const defaultPayDate = (period:string) => `${period}-25`
type PayrollView='input'|'query'|'attendance'|'leave'|'daily'|'retirement'|'yearend'|'filing'|'summary'|'settings'

export function PayrollPage({service,onNotice,employees,organizations}:{service:PayrollService;onNotice:(message:string)=>void;employees:EmployeeView[];organizations:Organization[]}) {
  const [view,setView]=useState<PayrollView>('input')
  const [runs,setRuns]=useState<PayrollRun[]>([])
  const [selectedId,setSelectedId]=useState<string|null>(null)
  const [entries,setEntries]=useState<PayrollEntry[]>([])
  const [results,setResults]=useState<PayrollResult[]>([])
  const [attendance,setAttendance]=useState<AttendanceMonthlySummary[]>([])
  const [leave,setLeave]=useState<AnnualLeaveLedger[]>([])
  const [retirement,setRetirement]=useState<RetirementSettlement[]>([])
  const [yearEnd,setYearEnd]=useState<YearEndTaxCase[]>([])
  const [items,setItems]=useState<PayrollItemMaster[]>([])
  const [createOpen,setCreateOpen]=useState(false)
  const [editEntry,setEditEntry]=useState<PayrollEntry|null>(null)
  const [addTargetOpen,setAddTargetOpen]=useState(false)
  const [calcOpen,setCalcOpen]=useState(false)
  const [busy,setBusy]=useState(false)
  const [selectedRows,setSelectedRows]=useState<Set<string>>(new Set())
  const uploadRef=useRef<HTMLInputElement>(null)

  const selected=runs.find((v)=>v.id===selectedId)??null
  const resultMap=useMemo(()=>new Map(results.map((v)=>[v.employmentId,v])),[results])
  const totals=useMemo(()=>results.reduce((acc,v)=>({gross:acc.gross+v.grossPay,ded:acc.ded+v.totalDeductions,net:acc.net+v.netPay,warnings:acc.warnings+v.warnings.length,errors:acc.errors+v.errors.length}),{gross:0,ded:0,net:0,warnings:0,errors:0}),[results])

  const refreshRuns=async()=>setRuns(await service.runs())
  const refreshSelected=async(id:string)=>{ setEntries(await service.entries(id)); setResults(await service.results(id)) }
  const refreshReference=async()=>{const [a,l,r,y,i]=await Promise.all([service.attendance(),service.annualLeave(),service.retirementSettlements(),service.yearEndTaxCases(),service.itemMasters()]);setAttendance(a);setLeave(l);setRetirement(r);setYearEnd(y);setItems(i)}
  useEffect(()=>{void Promise.all([refreshRuns(),refreshReference()])},[])
  useEffect(()=>{if(selectedId)void refreshSelected(selectedId);else{setEntries([]);setResults([]);setSelectedRows(new Set())}},[selectedId])

  const act=async(fn:()=>Promise<unknown>,message?:string)=>{ setBusy(true); try{await fn();await refreshRuns();await refreshReference();if(selectedId)await refreshSelected(selectedId);if(message)onNotice(message)}catch(err){onNotice(err instanceof Error?err.message:'급여 처리 중 오류가 발생했습니다.')}finally{setBusy(false)} }

  const copyPrevious=async()=>{
  if(!selected) return
    const prev=runs.filter(r=>r.period<selected.period).sort((a,b)=>b.period.localeCompare(a.period))[0]
    if(!prev) throw new Error('복사할 이전 급여월이 없습니다.')
    const prevEntries=await service.entries(prev.id); const map=new Map(prevEntries.map(e=>[e.employmentId,e]))
    for(const row of entries){const p=map.get(row.employmentId);if(!p) continue;await service.saveEntry({id:row.id,runId:row.runId,employmentId:row.employmentId,prorationRate:row.prorationRate,taxableAllowance:p.taxableAllowance,nonTaxableAllowance:p.nonTaxableAllowance,overtimePay:p.overtimePay,bonus:p.bonus,retroPay:0,otherEarnings:p.otherEarnings,unpaidDeduction:row.unpaidDeduction,otherDeductions:p.otherDeductions,pensionBaseMonthly:row.pensionBaseMonthly,healthBaseMonthly:row.healthBaseMonthly,employmentInsuranceBaseMonthly:row.employmentInsuranceBaseMonthly,incomeTaxManual:p.incomeTaxManual,memo:`${prev.period} 급여 복사`})}
  }

  const importCsv=async(file:File)=>{
  if(!selected) return
    await service.saveEntries(parsePayrollRows(await readTable(file),selected,entries))
  }

  return <section className="payrollWorkspace">
    <div className="pageTitle"><div><h2>급여 Payroll</h2></div>{view==='input'&&<button className="primary" onClick={()=>setCreateOpen(true)}>+ 급여월 생성</button>}</div>
    <div className="moduleTabs">{([['input','급여 입력'],['query','급여 조회'],['attendance','근태 조회'],['leave','연차'],['daily','일용직 급여'],['retirement','퇴직정산'],['yearend','연말정산'],['filing','원천세 신고'],['summary','급여요약'],['settings','급여 설정']] as Array<[PayrollView,string]>).map(([k,l])=><button key={k} className={view===k?'active':''} onClick={()=>setView(k)}>{l}</button>)}</div>
    {view==='input'&&<PayrollInputPanel service={service} runs={runs} selected={selected} selectedId={selectedId} setSelectedId={setSelectedId} entries={entries} results={results} resultMap={resultMap} employees={employees} totals={totals} busy={busy} act={act} onNotice={onNotice} setEditEntry={setEditEntry} setAddTargetOpen={setAddTargetOpen} selectedRows={selectedRows} setSelectedRows={setSelectedRows} setCalcOpen={setCalcOpen} copyPrevious={()=>act(copyPrevious,'이전 급여월의 입력항목을 복사했습니다.')} uploadRef={uploadRef} onDeleteSelected={()=>act(async()=>{for(const id of selectedRows) await service.deleteEntry(selected!.id,id);setSelectedRows(new Set())},'선택한 급여대상자를 삭제했습니다.')} onGoQuery={()=>setView('query')}/>} 
    {view==='query'&&<PayrollQuery runs={runs} service={service} employees={employees} onChanged={async()=>{await refreshRuns();await refreshReference();if(selectedId)await refreshSelected(selectedId)}}/>} 
    {view==='attendance'&&<AttendancePage service={service} employees={employees} allowLeaveRegistration={false}/>} 
    {view==='leave'&&<LeaveQuery rows={leave} employees={employees} service={service} onChanged={refreshReference}/>} 
    {view==='daily'&&<DailyWorkerPage service={service} organizations={organizations} onNotice={onNotice}/>} 
    {view==='retirement'&&<RetirementPanel onConfirm={async(rows)=>{await service.confirmRecords('retirement',rows.map(r=>r.id));await refreshReference()}} rows={retirement} employees={employees} onSave={async(rows,reason)=>{await service.saveRetirement(rows,reason);await refreshReference()}} onCalculate={async(id)=>{await act(()=>service.calculateRetirement(id),'퇴직정산을 계산했습니다.')}}/>}
    {view==='yearend'&&<YearEndPanel onConfirm={async(rows)=>{await service.confirmRecords('yearend',rows.map(r=>r.id));await refreshReference()}} rows={yearEnd} employees={employees} onSave={async(rows,reason)=>{await service.saveYearEnd(rows,reason);await refreshReference()}}/>} 
    {view==='filing'&&<FilingPanel runs={runs} service={service}/>} 
    {view==='summary'&&<UnifiedPayroll service={service}/>}
    {view==='settings'&&<><SettlementSettings service={service}/><PayrollSettingsPanel items={items} onSave={async(next)=>{await service.saveSettings(next);await refreshReference();await refreshRuns();if(selectedId)await refreshSelected(selectedId)}} onRestore={async()=>{await service.restoreSettings();await refreshReference();await refreshRuns();if(selectedId)await refreshSelected(selectedId)}}/></>}

    {createOpen&&<CreateRunModal service={service} onClose={()=>setCreateOpen(false)} onCreated={async(run)=>{setCreateOpen(false);await refreshRuns();setSelectedId(run.id);onNotice(`${run.period} 급여 Run을 생성했습니다.`)}}/>}
    {addTargetOpen&&selected&&<AddTargetModal employees={employees.filter(e=>!entries.some(row=>row.employmentId===e.employmentId))} onClose={()=>setAddTargetOpen(false)} onAdd={async(employmentId)=>{await act(()=>service.addEntry(selected.id,employmentId),'급여 대상자를 추가했습니다.');setAddTargetOpen(false)}}/>}
    {editEntry&&<EntryModal run={selected!} entry={editEntry} result={resultMap.get(editEntry.employmentId)??null} onClose={()=>setEditEntry(null)} onSave={async(input)=>{await service.saveEntry(input);await refreshRuns();await refreshSelected(input.runId);onNotice('급여 입력값을 저장했습니다. 재계산 후 합계가 갱신됩니다.');setEditEntry(null)}} onDelete={async()=>{if(window.confirm(`${editEntry.employeeNameSnapshot}을 급여 대상에서 제외할까요?`)){await act(()=>service.deleteEntry(editEntry.runId,editEntry.employmentId),'급여 대상에서 제외했습니다.');setEditEntry(null)}}}/>} 
    {calcOpen&&selected&&<CalculationOptions items={items} overrides={selected.itemOverrides} onClose={()=>setCalcOpen(false)} onApply={async(next)=>{await service.calculate(selected.id,next);await refreshRuns();await refreshSelected(selected.id);setCalcOpen(false);onNotice('이번 급여월에 일시 적용해 계산했습니다.')}}/>}
    <input ref={uploadRef} type="file" accept=".csv,.xlsx,.json" hidden onChange={e=>{const f=e.target.files?.[0];if(f)void act(()=>importCsv(f),'급여 입력 파일을 반영했습니다.');e.currentTarget.value=''}}/>
  </section>
}

function PayrollInputPanel({service,runs,selected,selectedId,setSelectedId,entries,results,resultMap,employees,totals,busy,act,onNotice,setEditEntry,setAddTargetOpen,selectedRows,setSelectedRows,setCalcOpen,copyPrevious,uploadRef,onDeleteSelected,onGoQuery}:{service:PayrollService;runs:PayrollRun[];selected:PayrollRun|null;selectedId:string|null;setSelectedId:(v:string|null)=>void;entries:PayrollEntry[];results:PayrollResult[];resultMap:Map<string,PayrollResult>;employees:EmployeeView[];totals:{gross:number;ded:number;net:number;warnings:number;errors:number};busy:boolean;act:(fn:()=>Promise<unknown>,m?:string)=>Promise<void>;onNotice:(m:string)=>void;setEditEntry:(e:PayrollEntry|null)=>void;setAddTargetOpen:(v:boolean)=>void;selectedRows:Set<string>;setSelectedRows:(v:Set<string>)=>void;setCalcOpen:(v:boolean)=>void;copyPrevious:()=>Promise<void>;uploadRef:RefObject<HTMLInputElement|null>;onDeleteSelected:()=>Promise<void>;onGoQuery:()=>void}){
  const [batchOpen,setBatchOpen]=useState(false);const [detail,setDetail]=useState<PayrollRow|null>(null);const [org,setOrg]=useState('ALL');const [name,setName]=useState('');
  const [attendanceClosed,setAttendanceClosed]=useState(false)
  useEffect(()=>{let active=true;setAttendanceClosed(false);if(selected)void service.isAttendanceClosed(selected.period).then(v=>{if(active)setAttendanceClosed(v)});return()=>{active=false}},[service,selected?.period])
  if(!selected) return <><div className="tableWrap payrollRunViewport"><table><thead><tr><th>귀속월</th><th>지급일</th><th>상태</th><th>대상</th><th>비고</th></tr></thead><tbody>{runs.map(run=><RunRow key={run.id} run={run} service={service} onClick={()=>setSelectedId(run.id)}/>)}</tbody></table>{runs.length===0&&<p className="empty padded">급여월을 먼저 생성하세요.</p>}</div></>
  const editable=!['CONFIRMED','CLOSED','PAID'].includes(selected.status)
  const orgs=[...new Set(entries.map(e=>e.organizationNameSnapshot))].sort()
  const filtered=entries.filter(e=>(org==='ALL'||e.organizationNameSnapshot===org)&&`${e.employeeNameSnapshot} ${e.employeeNumberSnapshot}`.toLowerCase().includes(name.toLowerCase()))
  const allChecked=filtered.length>0&&filtered.every(e=>selectedRows.has(e.employmentId))
  return <>
    <button className="back" onClick={()=>setSelectedId(null)}>← 급여월 목록</button>
    <div className="payrollRunHeader"><div><label>급여월<select value={selectedId??''} onChange={e=>setSelectedId(e.target.value)}>{runs.map(r=><option key={r.id} value={r.id}>{r.period} · {r.payDate}</option>)}</select></label></div><RunBadge status={selected.status}/></div>
    <div className="filters"><select value={org} onChange={e=>setOrg(e.target.value)}><option value="ALL">부서</option>{orgs.map(v=><option key={v}>{v}</option>)}</select><input value={name} onChange={e=>setName(e.target.value)} placeholder="이름 / 사번 검색"/></div>
    <div className="payrollActions referenceActions"><button disabled={busy||!editable} onClick={()=>setCalcOpen(true)}>＋ 급여 계산</button><button disabled={busy||!editable} onClick={()=>void act(()=>service.calculate(selected.id,null),'일시 적용을 초기화하고 급여 설정으로 재계산했습니다.')}>급여계산 초기화</button><button disabled={busy||!editable} onClick={()=>void copyPrevious()}>＋ 급여 복사</button><button disabled={busy||!editable} onClick={()=>void act(()=>service.syncAttendance(selected.id),'근태 수당을 반영했습니다. 209시간·통상임금 포함항목·휴일 초과시간을 확인하고 재계산하세요.')}>근태 수당 반영</button><button disabled={busy||!editable} onClick={()=>uploadRef.current?.click()}>⇧ 업로드</button><DownloadActions name={'급여_입력양식'} headers={payrollHeaders} rows={filtered.map(entry=>payrollValues({run:selected,entry,result:resultMap.get(entry.employmentId)??null}))} label="급여 입력양식 내보내기"/><button disabled={busy||!editable} onClick={()=>void act(()=>service.calculate(selected.id),'원천세·4대보험을 다시 계산했습니다.')}>＋ 원천세 및 4대보험 계산</button><button disabled={busy||!editable} onClick={()=>void act(()=>service.calculate(selected.id),'건강/고용보험료를 재계산했습니다.')}>＋ 건강/고용보험료 정산</button><button disabled={busy||!editable||selectedRows.size===0} onClick={()=>void onDeleteSelected()}>⌫ 삭제</button><button onClick={onGoQuery}>◉ 급여 자료 조회</button></div>
    <div className="payrollActions"><button disabled={busy||!editable} onClick={()=>setAddTargetOpen(true)}>대상자 추가</button><button disabled={busy||!editable} onClick={()=>void act(async()=>{const r=await service.validate(selected.id);onNotice(`검증 완료: 경고 ${r.warnings}건 / 오류 ${r.errors}건`)})}>검증</button><button disabled={busy||selected.status!=='VALIDATED'} onClick={()=>void act(()=>service.status(selected.id,'CONFIRMED'),'급여를 확정했습니다.')}>확정</button><button disabled={busy||selected.status!=='CONFIRMED'||!attendanceClosed} title={!attendanceClosed?'먼저 해당 월의 근태 마감을 완료하세요.':selected.status!=='CONFIRMED'?'급여 확정 후 마감할 수 있습니다.':''} onClick={()=>void act(()=>service.status(selected.id,'CLOSED'),'급여를 마감했습니다.')}>급여 마감</button><button disabled={busy||selected.status!=='CLOSED'} onClick={()=>void act(()=>service.status(selected.id,'PAID'),'지급 완료로 저장했습니다.')}>지급 완료</button></div>
    <div className="stats payrollStats"><Stat label="총지급" value={money(totals.gross)} note={`${entries.length}명`}/><Stat label="총공제" value={money(totals.ded)} note="보험·세금·기타"/><Stat label="실지급" value={money(totals.net)} note="Net Pay"/><Stat label="검증" value={`경고 ${totals.warnings}`} note={`오류 ${totals.errors}`}/></div>
    <div className="payrollActions"><button disabled={busy||!editable||selectedRows.size===0} onClick={()=>setBatchOpen(true)}>선택 {selectedRows.size}명 일괄 수정</button><span className="sectionNote">화면과 파일의 열 순서가 같습니다. 입력 항목은 개인 수정·일괄 수정·재업로드로 변경하고 계산 결과는 급여 계산 후 갱신됩니다.</span></div>
    {!attendanceClosed&&<p className="sectionNote">급여 마감 비활성: 먼저 {selected.period} 근태 마감을 완료하세요.</p>}<ScrollTable><table><thead><tr><th><input aria-label="조회된 대상 전체 선택" type="checkbox" checked={allChecked} onChange={e=>setSelectedRows(e.target.checked?new Set(filtered.map(x=>x.employmentId)):new Set())}/></th>{payrollColumns.map(c=><th key={c.label} className={c.editable?'editableColumn':''}>{c.label}</th>)}<th>관리</th></tr></thead><tbody>{filtered.map(entry=>{const row={run:selected,entry,result:resultMap.get(entry.employmentId)??null};return <tr className={!editable?'confirmedRow':''} key={entry.id} tabIndex={0} onClick={()=>setDetail(row)} onKeyDown={e=>{if(e.key==='Enter')setDetail(row)}}><td onClick={e=>e.stopPropagation()}><input aria-label={`${entry.employeeNameSnapshot} 선택`} type="checkbox" checked={selectedRows.has(entry.employmentId)} onChange={ev=>{const n=new Set(selectedRows);ev.target.checked?n.add(entry.employmentId):n.delete(entry.employmentId);setSelectedRows(n)}}/></td>{payrollValues(row).map((v,i)=><td key={payrollHeaders[i]}>{typeof v==='number'?v.toLocaleString('ko-KR'):v||'—'}</td>)}<td><button className="linkButton" disabled={!editable} onClick={e=>{e.stopPropagation();setEditEntry(entry)}}>수기 수정</button></td></tr>})}</tbody></table></ScrollTable>
    {detail&&<PersonalDetail title={`${detail.entry.employeeNameSnapshot} · ${selected.period} 급여 상세`} values={payrollDetail(detail)} onClose={()=>setDetail(null)} onEdit={editable?()=>{setEditEntry(detail.entry);setDetail(null)}:undefined}/>}
    {batchOpen&&<BatchEditModal entries={entries.filter(e=>selectedRows.has(e.employmentId))} onClose={()=>setBatchOpen(false)} onSave={async inputs=>{await service.saveEntries(inputs);setBatchOpen(false);await act(async()=>{},'선택한 대상의 입력값을 일괄 수정했습니다. 급여를 다시 계산하세요.')}}/>}

    {!editable&&<p className="sectionNote">확정/마감된 급여는 Snapshot 보존을 위해 수정·삭제할 수 없습니다.</p>}
  </>
}

function RunRow({run,service,onClick}:{run:PayrollRun;service:PayrollService;onClick:()=>void}){const [count,setCount]=useState<number|null>(null);useEffect(()=>{void service.entries(run.id).then(r=>setCount(r.length))},[run.id]);return <tr onClick={onClick}><td><strong>{run.period}</strong></td><td>{run.payDate}</td><td><RunBadge status={run.status}/></td><td>{count??'-'}명</td><td>{run.note||'-'}</td></tr>}

function FilterBar({employees,from,to,onFrom,onTo,org,grade,employeeId,onOrg,onGrade,onEmployee}:{employees:EmployeeView[];from:string;to:string;onFrom:(v:string)=>void;onTo:(v:string)=>void;org:string;grade:string;employeeId:string;onOrg:(v:string)=>void;onGrade:(v:string)=>void;onEmployee:(v:string)=>void}){
  const orgs=[...new Set(employees.map(e=>e.organizationName))].sort();const grades=[...new Set(employees.map(e=>e.grade))]
  return <div className="filters six"><select value={org} onChange={e=>onOrg(e.target.value)}><option value="ALL">팀</option>{orgs.map(v=><option key={v}>{v}</option>)}</select><select value={grade} onChange={e=>onGrade(e.target.value)}><option value="ALL">직급</option>{grades.map(v=><option key={v}>{v}</option>)}</select><select value={employeeId} onChange={e=>onEmployee(e.target.value)}><option value="ALL">개인</option>{employees.filter(e=>(org==='ALL'||e.organizationName===org)&&(grade==='ALL'||e.grade===grade)).map(e=><option key={e.employmentId} value={e.employmentId}>{e.name} · {e.employeeNumber}</option>)}</select><input type="month" value={from} onChange={e=>onFrom(e.target.value)}/><span className="rangeMark">~</span><input type="month" value={to} onChange={e=>onTo(e.target.value)}/></div>
}
function useFilterState(){const [from,setFrom]=useState(currentMonth());const [to,setTo]=useState(currentMonth());const [org,setOrg]=useState('ALL');const [grade,setGrade]=useState('ALL');const [employeeId,setEmployeeId]=useState('ALL');return {from,to,org,grade,employeeId,setFrom,setTo,setOrg,setGrade,setEmployeeId}}
function matchEmployee(e:EmployeeView|undefined,f:ReturnType<typeof useFilterState>){return !!e&&(f.org==='ALL'||e.organizationName===f.org)&&(f.grade==='ALL'||e.grade===f.grade)&&(f.employeeId==='ALL'||e.employmentId===f.employeeId)}

function PayrollQuery({runs,service,employees,onChanged}:{runs:PayrollRun[];service:PayrollService;employees:EmployeeView[];onChanged:()=>Promise<void>}){
  const upload=useRef<HTMLInputElement>(null);const [editing,setEditing]=useState<PayrollRow|null>(null);const [detail,setDetail]=useState<PayrollRow|null>(null),[rows,setRows]=useState<PayrollRow[]>([]),[error,setError]=useState('');const f=useFilterState();const [period,setPeriod]=useState({from:f.from,to:f.to})
  useEffect(()=>{let active=true;void (async()=>{const out:PayrollRow[]=[];for(const run of runs.filter(r=>r.period>=period.from&&r.period<=period.to)){const [es,rs]=await Promise.all([service.entries(run.id),service.results(run.id)]);const rm=new Map(rs.map(r=>[r.employmentId,r]));for(const entry of es)out.push({run,entry,result:rm.get(entry.employmentId)??null})}if(active)setRows(out)})().catch(e=>{if(active)setError(e.message)});return()=>{active=false}},[runs,period,service])
  const filtered=rows.filter(r=>(f.org==='ALL'||r.entry.organizationNameSnapshot===f.org)&&(f.grade==='ALL'||r.entry.gradeSnapshot===f.grade)&&(f.employeeId==='ALL'||r.entry.employmentId===f.employeeId))
  return <><div className="payrollQueryFilterRow"><FilterBar employees={employees} {...f} onFrom={f.setFrom} onTo={f.setTo} onOrg={f.setOrg} onGrade={f.setGrade} onEmployee={f.setEmployeeId}/><button className="queryButton primary" onClick={()=>{if(f.from>f.to){setError('조회 시작월과 종료월을 확인하세요.');return}setError('');setPeriod({from:f.from,to:f.to})}}>조회</button></div><div className="payrollActions"><DownloadActions name={'급여조회_보고서'} headers={payrollHeaders} rows={filtered.map(payrollValues)} label="보고서파일 다운받기"/><button onClick={()=>upload.current?.click()}>수정 파일 업로드</button><input ref={upload} type="file" accept=".xlsx,.json,.csv" hidden onChange={e=>{const file=e.target.files?.[0];e.currentTarget.value='';if(file)void (async()=>{setError('');await service.saveEntries(parsePayrollQueryRows(await readTable(file),rows));await onChanged()})().catch(e=>setError(e.message))}}/><span>{period.from} ~ {period.to} · {filtered.length}건</span></div>{error&&<p className="formError">{error}</p>}
  <ScrollTable><table><thead><tr>{payrollColumns.map(c=><th key={c.label} className={c.editable?'editableColumn':''}>{c.label}</th>)}</tr></thead><tbody>{filtered.map(row=><tr className={['CONFIRMED','CLOSED','PAID'].includes(row.run.status)?'confirmedRow':''} key={row.entry.id} tabIndex={0} onClick={()=>setDetail(row)} onKeyDown={e=>{if(e.key==='Enter')setDetail(row)}}>{payrollValues(row).map((v,i)=><td key={payrollHeaders[i]}>{typeof v==='number'?v.toLocaleString('ko-KR'):v||'—'}</td>)}</tr>)}</tbody></table>{!filtered.length&&<p className="empty padded">조회 기간에 해당하는 급여가 없습니다.</p>}</ScrollTable>
  {detail&&<PersonalDetail title={`${detail.entry.employeeNameSnapshot} · ${detail.run.period} 급여 상세`} values={payrollDetail(detail)} onClose={()=>setDetail(null)} onEdit={!['CONFIRMED','CLOSED','PAID'].includes(detail.run.status)?()=>{setEditing(detail);setDetail(null)}:undefined}/>}
  {editing&&<EntryModal run={editing.run} entry={editing.entry} result={editing.result} onClose={()=>setEditing(null)} onSave={async input=>{await service.saveEntry(input);await onChanged();setEditing(null)}} onDelete={async()=>{await service.deleteEntry(editing.run.id,editing.entry.employmentId);await onChanged();setEditing(null)}}/>}</>
}
function LeaveQuery({rows,employees,service,onChanged}:{rows:AnnualLeaveLedger[];employees:EmployeeView[];service:PayrollService;onChanged:()=>Promise<void>}){const [year,setYear]=useState(new Date().getFullYear());const f=useFilterState();const filtered=rows.filter(r=>r.year===year&&matchEmployee(employees.find(e=>e.employmentId===r.employmentId),f));return <><div className="filters four"><select value={f.org} onChange={e=>f.setOrg(e.target.value)}><option value="ALL">팀</option>{[...new Set(employees.map(e=>e.organizationName))].sort().map(v=><option key={v}>{v}</option>)}</select><select value={f.grade} onChange={e=>f.setGrade(e.target.value)}><option value="ALL">직급</option>{[...new Set(employees.map(e=>e.grade))].map(v=><option key={v}>{v}</option>)}</select><select value={f.employeeId} onChange={e=>f.setEmployeeId(e.target.value)}><option value="ALL">개인</option>{employees.map(e=><option key={e.employmentId} value={e.employmentId}>{e.name}</option>)}</select><input aria-label="연차 조회 연도" type="number" value={year} onChange={e=>setYear(Number(e.target.value))}/></div><AnnualLeavePanel rows={filtered} employees={employees} service={service} onChanged={onChanged}/></>}
function RunBadge({status}:{status:PayrollRun['status']}){return <span className={`runBadge ${status.toLowerCase()}`}>{({DRAFT:'입력',CALCULATED:'계산',VALIDATED:'검증 완료',CONFIRMED:'확정',CLOSED:'마감',PAID:'지급 완료'})[status]}</span>}
function Stat({label,value,note}:{label:string;value:string;note:string}){return <div className="stat"><span>{label}</span><strong>{value}</strong><small>{note}</small></div>}
function CreateRunModal({service,onClose,onCreated}:{service:PayrollService;onClose:()=>void;onCreated:(run:PayrollRun)=>void|Promise<void>}){const [period,setPeriod]=useState(currentMonth());const [payDate,setPayDate]=useState(defaultPayDate(currentMonth()));const [note,setNote]=useState('');const [error,setError]=useState('');const [saving,setSaving]=useState(false);return <div className="modalBackdrop"><form className="modal" onSubmit={e=>{e.preventDefault();setSaving(true);setError('');void service.createRun({period,payDate,note}).then(onCreated).catch(err=>setError(err instanceof Error?err.message:'생성 실패')).finally(()=>setSaving(false))}}><div className="modalHead"><div><h3>급여월 생성</h3><p>재직·중도입퇴사·Compensation Snapshot을 기준으로 대상자를 생성합니다.</p></div><button type="button" onClick={onClose}>×</button></div><label>귀속월<input type="month" value={period} onChange={e=>{setPeriod(e.target.value);setPayDate(defaultPayDate(e.target.value))}} required/></label><label>지급일<input type="date" value={payDate} onChange={e=>setPayDate(e.target.value)} required/></label><label>비고<textarea value={note} onChange={e=>setNote(e.target.value)}/></label>{error&&<p className="formError">{error}</p>}<div className="modalActions"><button type="button" onClick={onClose}>취소</button><button className="primary" disabled={saving}>{saving?'생성 중…':'생성'}</button></div></form></div>}
function AddTargetModal({employees,onClose,onAdd}:{employees:EmployeeView[];onClose:()=>void;onAdd:(employmentId:string)=>Promise<void>}){const [query,setQuery]=useState('');const [selected,setSelected]=useState('');const filtered=employees.filter(e=>`${e.name} ${e.employeeNumber} ${e.organizationName}`.toLowerCase().includes(query.toLowerCase())).slice(0,80);return <div className="modalBackdrop"><form className="modal wideModal" onSubmit={e=>{e.preventDefault();if(selected)void onAdd(selected)}}><div className="modalHead"><div><h3>급여 대상자 추가</h3></div><button type="button" onClick={onClose}>×</button></div><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="이름, 사번, 조직 검색"/><div className="candidateList">{filtered.map(e=><label key={e.employmentId}><input type="radio" name="employee" checked={selected===e.employmentId} onChange={()=>setSelected(e.employmentId)}/><span><strong>{e.name}</strong><small>{e.employeeNumber} · {e.organizationName}</small></span></label>)}</div><div className="modalActions"><button type="button" onClick={onClose}>취소</button><button className="primary">추가</button></div></form></div>}

export function BatchEditModal({entries,onClose,onSave}:{entries:PayrollEntry[];onClose:()=>void;onSave:(inputs:PayrollEntryInput[])=>Promise<void>}){
 const labels:Record<string,string>={...inputLabels,...amountLabels}
 const current=(e:PayrollEntry,k:string)=>k in inputLabels?Number(e[k as keyof PayrollEntry]??0):Number(e.itemAmounts?.[k]??0)
 const initial=current(entries[0],'otherEarnings')
 const [key,setKey]=useState('otherEarnings'),[value,setValue]=useState(entries.every(e=>current(e,'otherEarnings')===initial)?String(initial):''),[mode,setMode]=useState<'replace'|'add'>('replace'),[memo,setMemo]=useState('일괄 수기 수정'),[error,setError]=useState(''),[saving,setSaving]=useState(false),[pending,setPending]=useState<PayrollEntryInput[]|null>(null)
 const preview=()=>{setError('');try{if(!value.trim())throw new Error('적용값을 입력하세요.');setPending(batchPayrollValues(entries,key,Number(value),mode,memo))}catch(e){setError((e as Error).message)}}
 return <div className="modalBackdrop"><form className="modal wideModal" role="dialog" aria-modal="true" aria-label="급여 일괄 수정" onSubmit={e=>{e.preventDefault();preview()}}><div className="modalHead"><h3>선택 {entries.length}명 일괄 수정</h3><button type="button" onClick={onClose}>×</button></div><label>수정 항목<select value={key} onChange={e=>{const k=e.target.value;setKey(k);const v=current(entries[0],k);setValue(mode==='add'?'0':entries.every(e=>current(e,k)===v)?String(v):'');setPending(null)}}>{Object.entries(labels).map(([k,l])=><option key={k} value={k}>{l}</option>)}</select></label><div className="changePreview"><table><thead><tr><th>개인</th><th>{labels[key]} 현재 값</th></tr></thead><tbody>{entries.map(e=><tr key={e.id}><td>{e.employeeNameSnapshot}</td><td>{current(e,key).toLocaleString('ko-KR')}</td></tr>)}</tbody></table></div><label>적용 방식<select value={mode} onChange={e=>{const m=e.target.value as 'replace'|'add';setMode(m);const v=current(entries[0],key);setValue(m==='add'?'0':entries.every(e=>current(e,key)===v)?String(v):'');setPending(null)}}><option value="replace">같은 값으로 변경</option><option value="add">현재 값에 더하기 / 빼기</option></select></label><label>적용값<input type="number" placeholder="현재 값이 다르면 변경할 값을 입력하세요" step={key==='prorationRate'?'0.01':'1'} value={value} onChange={e=>{setValue(e.target.value);setPending(null)}} required/></label><label>수정 메모<input value={memo} onChange={e=>{setMemo(e.target.value);setPending(null)}}/></label>{error&&<p role="alert">{error}</p>}<div className="modalActions"><button type="button" onClick={onClose}>취소</button><button className="primary" disabled={saving}>변경 내용 확인</button></div>{pending&&<div className="modalBackdrop"><div className="modal wideModal" role="dialog" aria-modal="true" aria-label="급여 변경 재확인"><h3>{labels[key]} 변경을 적용하시겠습니까?</h3><div className="changePreview"><table><thead><tr><th>개인</th><th>변경 전</th><th>변경 후</th></tr></thead><tbody>{entries.map((e,i)=><tr key={e.id}><td>{e.employeeNameSnapshot}</td><td>{current(e,key).toLocaleString('ko-KR')}</td><td>{(key in inputLabels?Number(pending[i][key as keyof PayrollEntryInput]):Number(pending[i].itemAmounts?.[key]??0)).toLocaleString('ko-KR')}</td></tr>)}</tbody></table></div>{error&&<p role="alert">{error}</p>}<div className="modalActions"><button type="button" disabled={saving} onClick={()=>setPending(null)}>돌아가기</button><button type="button" className="primary" disabled={saving} onClick={()=>{setSaving(true);void onSave(pending).catch(e=>setError(e.message)).finally(()=>setSaving(false))}}>확인하고 적용</button></div></div></div>}</form></div>
}
