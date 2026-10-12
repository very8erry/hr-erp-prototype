import { NativeSelect } from '../../components/ui/native-select'
import { Button } from '../../components/ui/button'
import {useEffect,useState} from 'react'
import type {PayrollRun} from '../../domain/types'
import type {PayrollService} from './payrollService'
import {DownloadActions} from '../../components/DownloadActions'
import {ScrollTable} from '../../components/ScrollTable'
import {payrollColumns,type PayrollRow} from './payrollColumns'
import {WithholdingEditor} from './WithholdingEditor'
import {ManualLedger,type LedgerColumn} from './ManualLedger'
export function FilingPanel({runs,service,insurance=false}:{runs:PayrollRun[];service:PayrollService;insurance?:boolean}){
 const [destination,setDestination]=useState(insurance?'nps':'hometax'),[id,setId]=useState(runs[0]?.id??''),[rows,setRows]=useState<PayrollRow[]>([]),[error,setError]=useState(''),[form,setForm]=useState(false),[reconcile,setReconcile]=useState(false);
 useEffect(()=>{setDestination(insurance?'nps':'hometax')},[insurance]);
 const refresh=async()=>{const [run,entries,results]=await Promise.all([service.run(id),service.entries(id),service.results(id)]);setRows(run?entries.map(entry=>({run,entry,result:results.find(r=>r.employmentId===entry.employmentId)??null})):[])};
 useEffect(()=>{if(id)void refresh().catch(e=>setError(e.message));else setRows([])},[id,service]);
 const destinations=insurance?[['nps','국민연금공단'],['nhis','건강보험공단'],['comwel','근로복지공단']]:[['hometax','원천세(홈택스)'],['wetax','지방소득세(위택스)']];
 const included:Record<string,string[]>={hometax:['총지급','과세급여','비과세급여','소득세'],wetax:['소득세','지방소득세'],nps:['연금기준소득','국민연금'],nhis:['건강보수월액','건강보험','장기요양'],comwel:['고용보수월액','고용보험']};
 const columns=payrollColumns.filter((c,i)=>i<8||included[destination]?.includes(c.label));const selected=runs.find(r=>r.id===id),values=rows.map(r=>columns.map(c=>c.read(r)));
 const links:Record<string,string>={hometax:'https://www.hometax.go.kr/',wetax:'https://www.wetax.go.kr/',nps:'https://edi.nps.or.kr/',nhis:'https://edi.nhis.or.kr/',comwel:'https://total.comwel.or.kr/'};
 const results=rows.flatMap(r=>r.result?[r.result]:[]),existing=selected?{id:selected.id,period:selected.period,payPeriod:selected.payDate.slice(0,7),incomeName:'상용근로소득',incomeCode:'A01',headcount:results.length,grossPay:results.reduce((s,r)=>s+r.grossPay,0),incomeTax:results.reduce((s,r)=>s+r.incomeTax,0),localIncomeTax:results.reduce((s,r)=>s+r.localIncomeTax,0),note:'',...selected.filingFormOverrides}:null;
 type Reconciliation=NonNullable<typeof existing>;const ledgerColumns:LedgerColumn<Reconciliation>[]=[{label:'귀속연월',key:'period',identity:true},{label:'지급연월',key:'payPeriod',identity:true},{label:'소득구분',key:'incomeName',type:'text'},{label:'코드',key:'incomeCode',type:'text'},{label:'인원',key:'headcount',type:'number'},{label:'총지급액 대사',key:'grossPay',type:'number'},{label:'소득세',key:'incomeTax',type:'number'},{label:'지방소득세',key:'localIncomeTax',type:'number'},{label:'검토사항',key:'note',type:'text'}];
 return <><div className="moduleTabs">{destinations.map(([key,label])=><Button key={key} className={destination===key?'active':''} onClick={()=>{setDestination(key);setReconcile(false)}}>{label}</Button>)}</div><div className="filingToolbar"><NativeSelect aria-label="신고 급여월" value={id} onChange={e=>setId(e.target.value)}>{runs.map(r=><option key={r.id} value={r.id}>{r.period}</option>)}</NativeSelect><a href={links[destination]} target="_blank" rel="noreferrer">신고처 열기</a><DownloadActions name={destinations.find(([k])=>k===destination)?.[1].replace(/ · /g,'_')+'_자료'} headers={columns.map(c=>c.label)} rows={values} label="자료다운로드"/>{destination==='hometax'&&<><Button disabled={!selected} onClick={()=>setForm(true)}>원천징수이행상황신고서 작성</Button><Button onClick={()=>setReconcile(v=>!v)}>원천징수이행상황신고자료 대사</Button></>}</div>{error&&<p role="alert">{error}</p>}{reconcile&&existing?<ManualLedger title="원천징수이행상황신고자료 대사" rows={[existing]} columns={ledgerColumns} onSave={async(data,reason)=>{await service.saveFilingForm(id,data[0],reason);await refresh()}}/>:<ScrollTable><table><thead><tr>{columns.map(c=><th key={c.label}>{c.label}</th>)}</tr></thead><tbody>{values.map((r,i)=><tr key={rows[i].entry.id}>{r.map((v,j)=><td key={j}>{typeof v==='number'?v.toLocaleString('ko-KR'):v||'—'}</td>)}</tr>)}</tbody></table></ScrollTable>}{form&&selected&&<WithholdingEditor key={selected.id} run={selected} service={service} onClose={()=>setForm(false)}/>}</>
}
