import {summaryWorkbook,visibleSummarySheets} from './summaryExport'
import {downloadBlob} from '../attendance/attendanceFiles'
import {useEffect,useState} from 'react'
import {ScrollTable} from '../../components/ScrollTable'
import type {PayrollService} from './payrollService'
export type SummaryRow={period:string;employeeIds:string[];workerIds:string[];regular:number;daily:number;income:number;local:number;pension:number;health:number;care:number;employment:number;other:number;ded:number;net:number}
export async function payrollSummary(service:PayrollService):Promise<SummaryRow[]>{
 const [runs,records]=await Promise.all([service.runs(),service.dailyWorkRecords()]);const bundles=await Promise.all(runs.map(async run=>({run,results:await service.results(run.id)})))
 return [...new Set(runs.map(r=>r.period))].sort().map(period=>{
 const regular=bundles.filter(b=>b.run.period===period).flatMap(b=>b.results),daily=records.filter(r=>r.workDate.startsWith(period)),sum=(key:string)=>regular.reduce((s,r)=>s+Number((r as unknown as Record<string,unknown>)[key]??0),0),ds=(key:string)=>daily.reduce((s,r)=>s+Number((r as unknown as Record<string,unknown>)[key]??0),0)
 return {period,employeeIds:[...new Set(regular.map(r=>r.employmentId))],workerIds:[...new Set(daily.map(r=>r.dailyWorkerId))],regular:sum('grossPay'),daily:ds('grossPay'),income:sum('incomeTax')+ds('incomeTax'),local:sum('localIncomeTax')+ds('localIncomeTax'),pension:sum('nationalPension'),health:sum('healthInsurance'),care:sum('longTermCareInsurance'),employment:sum('employmentInsurance'),other:sum('otherDeductions'),ded:sum('totalDeductions')+ds('grossPay')-ds('netPay'),net:sum('netPay')+ds('netPay')}
 })
}
export function summaryTotal(rows:SummaryRow[]):SummaryRow{return {...rows[0],period:'합계',employeeIds:rows.flatMap(r=>r.employeeIds),workerIds:rows.flatMap(r=>r.workerIds),...Object.fromEntries(['regular','daily','income','local','pension','health','care','employment','other','ded','net'].map(k=>[k,rows.reduce((s,r)=>s+Number(r[k as keyof SummaryRow]),0)]))} as SummaryRow}
const values=(r:SummaryRow)=>[r.employeeIds.length,r.workerIds.length,r.regular,r.daily,r.regular+r.daily,r.income,r.local,r.pension,r.health,r.care,r.employment,r.other,r.ded,r.net]
export function UnifiedPayroll({service}:{service:PayrollService}){
 const [rows,setRows]=useState<SummaryRow[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState(false);useEffect(()=>{void payrollSummary(service).then(setRows).catch(e=>setError(e.message))},[service]);const years=[...new Set(rows.map(r=>r.period.slice(0,4)))].sort().reverse()
 return <section><h2>급여요약</h2><button disabled={busy} onClick={()=>{setBusy(true);void exportSummary().catch(e=>setError(String(e))).finally(()=>setBusy(false))}}>엑셀 내보내기</button>{error&&<p role="alert">{error}</p>}{years.map(year=>{const data=rows.filter(r=>r.period.startsWith(year)),total=summaryTotal(data);return <div key={year} className="summaryYear"><h3>{year}년</h3><ScrollTable><table><thead><tr>{['귀속월','정규직 총인원','일용직 총인원','정규직 총지급','일용직 총지급','총지급','소득세','지방소득세','국민연금','건강보험','장기요양','고용보험','기타공제','총공제','실지급'].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{data.map(r=><tr key={r.period}><td>{r.period}</td>{values(r).map((v,i)=><td key={i}>{v.toLocaleString('ko-KR')}</td>)}</tr>)}</tbody><tfoot><tr><td>합계</td>{values(total).map((v,i)=><td key={i} >{v.toLocaleString('ko-KR')}</td>)}</tr></tfoot></table></ScrollTable></div>})}</section>
}

async function exportSummary(){const data=await summaryWorkbook(visibleSummarySheets());const blob=new Blob([data as BlobPart],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});downloadBlob(blob,'급여요약.xlsx')}
