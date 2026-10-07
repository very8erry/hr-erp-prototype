import type { AttendanceMonthlySummary, EmployeeView, LeaveCase } from '../../domain/types'
import {leaveLabels} from './leaveLabels'
export type FileFormat='csv'|'xlsx'|'json'
export const columns=['귀속월','지급일','사번','성명','팀','직급','입사일','퇴사일','직무','소정시간','실근로시간','연장시간','야간시간','휴일시간','휴가일수','결근시간','지각분','조퇴분','수정이력','수정사유','휴직 유형','휴직 기간','유급병가 시간','무급병가 시간','무급근태 시간','기타메모']
const keys=['scheduledHours','workedHours','overtimeHours','nightHours','holidayHours','leaveDays','absenceHours','lateMinutes','earlyLeaveMinutes'] as const
const numberLabels=['소정시간','실근로시간','연장시간','야간시간','휴일시간','휴가일수','결근시간','지각분','조퇴분']
export function attendanceIssue(r:AttendanceMonthlySummary){const gap=Math.max(0,r.scheduledHours-(r.workedHours+Math.max(r.paidCreditHours??0,r.leaveDays*8)));const issues=[gap>0?`소정시간 ${gap.toFixed(1)}시간 미달`:'',r.absenceHours?`결근 ${r.absenceHours}시간`:'',r.lateMinutes?`지각 ${r.lateMinutes}분`:'',r.earlyLeaveMinutes?`조퇴 ${r.earlyLeaveMinutes}분`:'',r.issueNote??''].filter(Boolean);return issues.length?issues.join(' · '):'정상'}
export function downloadBlob(blob:Blob,name:string){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.hidden=true;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000)}
export function csvEncode(rows:unknown[][]){return '\ufeff'+rows.map(row=>row.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\r\n')}
export function csvDecode(text:string):string[][]{
  const rows:string[][]=[];let row:string[]=[],field='',quoted=false
  const input=text.replace(/^\ufeff/,'')
  for(let i=0;i<input.length;i++){const c=input[i];if(c==='"'){if(quoted&&input[i+1]==='"'){field+='"';i++}else quoted=!quoted}else if(c===','&&!quoted){row.push(field);field=''}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&input[i+1]==='\n')i++;row.push(field);if(row.some(v=>v!==''))rows.push(row);row=[];field=''}else field+=c}
  if(quoted)throw new Error('CSV 따옴표가 닫히지 않았습니다.')
  row.push(field);if(row.some(v=>v!==''))rows.push(row);return rows
}
export async function exportTable(name:string,headers:string[],rows:unknown[][],format:FileFormat){
  if(format==='csv')return downloadBlob(new Blob([csvEncode([headers,...rows])],{type:'text/csv;charset=utf-8'}),`${name}.csv`)
  if(format==='json')return downloadBlob(new Blob([JSON.stringify(rows.map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]??'']))),null,2)],{type:'application/json'}),`${name}.json`)
  const {default:ExcelJS}=await import('exceljs');const book=new ExcelJS.Workbook();const sheet=book.addWorksheet('자료');sheet.addRow(headers);rows.forEach(r=>{const added=sheet.addRow(r);r.forEach((v,i)=>{if(typeof v==='string')added.getCell(i+1).numFmt='@'})});sheet.views=[{state:'frozen',ySplit:1}];sheet.getRow(1).font={bold:true};sheet.columns.forEach(c=>c.width=20)
  const buffer=await book.xlsx.writeBuffer();downloadBlob(new Blob([buffer as BlobPart],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),`${name}.xlsx`)
}
export async function readTable(file:File):Promise<Record<string,unknown>[]> {
  if(file.name.toLowerCase().endsWith('.json')){const data=JSON.parse(await file.text());if(!Array.isArray(data))throw new Error('근태 JSON은 행 배열이어야 합니다. 전체 백업은 JSON 백업 가져오기를 사용하세요.');return data}
  let matrix:unknown[][]
  if(file.name.toLowerCase().endsWith('.xlsx')){const {default:ExcelJS}=await import('exceljs');const book=new ExcelJS.Workbook();await book.xlsx.load(await file.arrayBuffer());const sheet=book.worksheets[0];if(!sheet)throw new Error('워크시트가 없습니다.');matrix=[];sheet.eachRow(r=>{const v=r.values as unknown[];matrix.push(v.slice(1))})}
  else matrix=csvDecode(await file.text())
  const headers=matrix.shift()?.map(v=>String(v??'').trim())??[]
  if(new Set(headers).size!==headers.length)throw new Error('중복된 열 이름이 있습니다.')
  return matrix.map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]??''])))
}
export function attendanceRows(rows:AttendanceMonthlySummary[],employees:EmployeeView[],leaves:LeaveCase[]=[],payDates:Record<string,string>={}){return rows.map(r=>{
 const e=employees.find(e=>e.employmentId===r.employmentId),end=new Date(Number(r.period.slice(0,4)),Number(r.period.slice(5)),0).getDate()
 const cases=leaves.filter(l=>l.employmentId===r.employmentId&&l.startDate<=`${r.period}-${end}`&&(!l.endDate||l.endDate>=`${r.period}-01`))
 return [r.period,payDates[r.period]??'',e?.employeeNumber??'',e?.name??'',r.organizationNameSnapshot,r.gradeSnapshot,e?.hireDate??'',e?.terminationDate??'',r.jobSnapshot,...keys.map(k=>r[k]),r.manualEdited?`수기 수정 · ${r.revision}차`:'원본',r.editReason??'자료 재업로드',cases.map(l=>leaveLabels[l.kind]).join(' / ')||'—',cases.map(l=>`${l.startDate} ~ ${l.endDate??'미정'}`).join(' / ')||'—',r.sickPaidHours??0,r.sickUnpaidHours??0,r.unpaidHours??0,r.issueNote??'']
})}
export function parseAttendance(data:Record<string,unknown>[],employees:EmployeeView[],existing:AttendanceMonthlySummary[]):AttendanceMonthlySummary[]{
  if(!data.length)throw new Error('근태 데이터가 없습니다.')
  return data.map((r,i)=>{if(['사번','귀속월',...numberLabels,'수정사유'].some(h=>!(h in r)))throw new Error(`${i+2}행: 필수 한글 열이 누락되었습니다.`)
    const e=employees.find(e=>e.employeeNumber===String(r['사번']).trim());if(!e)throw new Error(`${i+2}행: 존재하지 않는 사번입니다.`)
    if(r['성명']!==undefined&&String(r['성명'])!==e.name)throw new Error(`${i+2}행: 사번과 성명이 일치하지 않습니다.`)
    const period=String(r['귀속월']).trim();const old=existing.find(a=>a.employmentId===e.employmentId&&a.period===period)
    const values=Object.fromEntries(keys.map((k,j)=>{const raw=r[numberLabels[j]];if(raw===''||raw==null||typeof raw==='object'||typeof raw==='boolean'||!Number.isFinite(Number(raw)))throw new Error(`${i+2}행: ${numberLabels[j]}은 숫자로 입력하세요.`);return [k,Number(raw)]}))
    return {...old,...values,id:old?.id??`ATT-${e.employmentId}-${period}`,employmentId:e.employmentId,period,organizationNameSnapshot:old?.organizationNameSnapshot??e.organizationName,gradeSnapshot:old?.gradeSnapshot??e.grade,jobSnapshot:old?.jobSnapshot??e.job,editReason:String(r['수정사유']??'')} as AttendanceMonthlySummary
  })
}
