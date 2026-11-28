import { Button } from '../../components/ui/button'
import { NativeSelect } from '../../components/ui/native-select'
import { Card } from '../../components/ui/card'
import {useEffect,useState} from 'react'
import {defaultSettlements} from './companyInfo'
import type {PayrollService} from './payrollService'
export function SettlementSettings({service}:{service:PayrollService}){
 const [rows,setRows]=useState(defaultSettlements),[message,setMessage]=useState('')
 useEffect(()=>{void service.settlements().then(setRows)},[service])
 return <Card className="panel"><h3>정산항목설정</h3><div className="tableWrap"><table><thead><tr><th>선택</th><th>공제항목</th><th>표시여부</th><th>중도정산포함여부</th><th>연말정산포함여부</th></tr></thead><tbody>{rows.map((r,i)=><tr key={r.name}><td><input type="checkbox" aria-label={`${r.name} 정산 적용`} checked={r.selected!==false} onChange={e=>setRows(rows.map((v,j)=>i===j?{...v,selected:e.target.checked}:v))}/></td><td>{r.name}</td><td><input type="checkbox" aria-label={`${r.name} 표시`} checked={r.visible} onChange={e=>setRows(rows.map((v,j)=>i===j?{...v,visible:e.target.checked}:v))}/></td><td><input type="checkbox" aria-label={`${r.name} 중도정산 포함`} checked={r.interim} onChange={e=>setRows(rows.map((v,j)=>i===j?{...v,interim:e.target.checked}:v))}/></td><td><NativeSelect aria-label={`${r.name} 연말정산 포함`} value={r.yearEnd} onChange={e=>setRows(rows.map((v,j)=>i===j?{...v,yearEnd:e.target.value}:v))}>{['안함','완납·1차분','2차분','3차분'].map(v=><option key={v}>{v}</option>)}</NativeSelect></td></tr>)}</tbody></table></div><div className="toolbar"><Button onClick={()=>{const base=rows[0];setRows(rows.map((r,i)=>i===1||i===2?{...r,selected:base.selected,interim:base.interim,yearEnd:base.yearEnd}:r))}}>연말·중도 공통조건을 소득세·주민세에 적용</Button><Button onClick={()=>{const base=rows[3];setRows(rows.map((r,i)=>i===4?{...r,selected:base.selected,interim:base.interim,yearEnd:base.yearEnd}:r))}}>건강보험 조건을 장기요양에 적용</Button></div><Button onClick={()=>void service.saveSettlements(rows).then(()=>setMessage('정산항목설정을 저장했습니다.')).catch(e=>setMessage(e.message))}>정산항목 적용 / 저장</Button><p role="status">{message}</p></Card>
}
