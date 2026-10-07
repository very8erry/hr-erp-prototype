import type {PayrollEntry,PayrollEntryInput,PayrollResult,PayrollRun} from '../../domain/types'
export const amountLabels:Record<string,string>={P104:'식대',P105:'자가운전보조비',P108:'직책수당',P109:'자격수당',P110:'직무수당',P111:'해외근무수당',P121:'야간수당',P122:'휴일수당',P131:'성과상여',P134:'연차수당',P135:'보육수당',P136:'출산지원금',P137:'실비정산'}
export const inputLabels={monthlyBasePay:'월 기본급',prorationRate:'일할비율',taxableAllowance:'과세수당',nonTaxableAllowance:'비과세수당',overtimePay:'연장수당',bonus:'정기상여',retroPay:'소급지급',otherEarnings:'기타수당',unpaidDeduction:'무급차감',otherDeductions:'기타공제',pensionBaseMonthly:'연금기준소득',healthBaseMonthly:'건강보수월액',employmentInsuranceBaseMonthly:'고용보수월액',incomeTaxManual:'소득세 입력'} as const
export const insuranceLabels={nationalPension:'국민연금 수기',healthInsurance:'건강보험 수기',longTermCareInsurance:'장기요양 수기',employmentInsurance:'고용보험 수기',localIncomeTax:'지방소득세 수기'} as const
export type EditableKey=keyof typeof inputLabels
export type PayrollRow={run:PayrollRun;entry:PayrollEntry;result:PayrollResult|null}
type Column={label:string;read:(row:PayrollRow)=>string|number;editable?:boolean}
const identity:Column[]=[{label:'귀속월',read:r=>r.run.period},{label:'지급일',read:r=>r.run.payDate},{label:'사번',read:r=>r.entry.employeeNumberSnapshot},{label:'성명',read:r=>r.entry.employeeNameSnapshot},{label:'팀',read:r=>r.entry.organizationNameSnapshot},{label:'직급',read:r=>r.entry.gradeSnapshot??''},{label:'입사일',read:r=>r.entry.hireDateSnapshot??''},{label:'퇴사일',read:r=>r.entry.terminationDateSnapshot??''},{label:'지급 기본급',read:r=>r.result?.basePay??''}]
const results:Column[]=(Object.entries({taxableEarnings:'과세급여',nonTaxableEarnings:'비과세급여',incomeTax:'소득세',localIncomeTax:'지방소득세',nationalPension:'국민연금',healthInsurance:'건강보험',longTermCareInsurance:'장기요양',employmentInsurance:'고용보험',grossPay:'총지급',totalDeductions:'총공제',netPay:'실지급'}) as [keyof PayrollResult,string][]).map(([key,label])=>({label,read:r=>{const v=r.result?.[key];return typeof v==='number'?v:''}}))
export const payrollColumns:Column[]=[...identity,...Object.entries(inputLabels).map(([key,label])=>({label,editable:true,read:(r:PayrollRow)=>r.entry[key as EditableKey]})),...Object.entries(amountLabels).map(([code,label])=>({label,editable:true,read:(r:PayrollRow)=>r.entry.itemAmounts?.[code]??0})),...Object.entries(insuranceLabels).map(([key,label])=>({label,editable:true,read:(r:PayrollRow)=>r.entry.insuranceOverrides?.[key as keyof typeof insuranceLabels]??''})),...results,{label:'상태',read:r=>({DRAFT:'입력',CALCULATED:'계산',VALIDATED:'검증 완료',CONFIRMED:'확정',CLOSED:'마감',PAID:'지급 완료'})[r.run.status]},{label:'계산 경고',read:r=>r.result?.warnings.join(' / ')??''},{label:'오류',read:r=>r.result?.errors.join(' / ')??''},{label:'메모',editable:true,read:r=>r.entry.memo}]
export const payrollHeaders=payrollColumns.map(c=>c.label)
export const payrollValues=(row:PayrollRow)=>payrollColumns.map(c=>c.read(row))
export const payrollDetail=(row:PayrollRow)=>Object.fromEntries(payrollColumns.map(c=>[c.label,c.read(row)]))
export function parsePayrollRows(data:Record<string,unknown>[],run:PayrollRun,entries:PayrollEntry[]):PayrollEntryInput[]{
  if(!data.length)throw new Error('급여 입력 데이터가 없습니다.')
  const seen=new Set<string>()
  return data.map((row,i)=>{
    const no=String(row['사번']??row.employeeNumber??'').trim(),entry=entries.find(e=>e.employeeNumberSnapshot===no)
    if(!entry)throw new Error(`${i+2}행: 급여 대상 사번을 찾을 수 없습니다.`)
    if(seen.has(no))throw new Error(`${i+2}행: 중복 사번입니다.`);seen.add(no)
    if(row['귀속월']!==undefined&&String(row['귀속월'])!==run.period)throw new Error(`${i+2}행: 선택한 급여월과 파일의 귀속월이 다릅니다.`)
    if(row['성명']!==undefined&&String(row['성명'])!==entry.employeeNameSnapshot)throw new Error(`${i+2}행: 사번과 성명이 일치하지 않습니다.`)
    const next={...entry,insuranceOverrides:{...entry.insuranceOverrides},itemAmounts:{...entry.itemAmounts},memo:String(row['메모']??entry.memo)}
    const number=(raw:unknown,label:string)=>{if(raw===''||raw==null||typeof raw==='object'||typeof raw==='boolean'||!Number.isFinite(Number(raw))||Number(raw)<0)throw new Error(`${i+2}행: ${label}은 0 이상의 숫자여야 합니다.`);return Number(raw)}
    for(const [key,label] of Object.entries(inputLabels)){const raw=row[label]??row[key]??(key==='incomeTaxManual'&&!('귀속월' in row)?row['소득세']:undefined);if(raw!==undefined)Object.assign(next,{[key]:number(raw,label)})}
    for(const [code,label] of Object.entries(amountLabels))if(row[label]!==undefined)next.itemAmounts[code]=number(row[label],label)
    for(const [key,label] of Object.entries(insuranceLabels)){if(row[label]!==undefined){if(row[label]==='')delete next.insuranceOverrides[key as keyof typeof insuranceLabels];else next.insuranceOverrides[key as keyof typeof insuranceLabels]=number(row[label],label)}}
    if(next.prorationRate>1)throw new Error(`${i+2}행: 일할비율은 1 이하여야 합니다.`)
    return next
  })
}
export function batchPayrollValues(entries:PayrollEntry[],key:EditableKey|string,value:number,mode:'replace'|'add',memo:string):PayrollEntryInput[]{
  if(!Number.isFinite(value))throw new Error('적용값을 숫자로 입력하세요.')
  if(!entries.length)throw new Error('수정할 대상자를 선택하세요.')
  return entries.map(e=>{const item=key in amountLabels,old=item?e.itemAmounts?.[key]??0:e[key as EditableKey];const next=mode==='add'?old+value:value;if(!Number.isFinite(next)||next<0||(key==='prorationRate'&&next>1))throw new Error(`${e.employeeNameSnapshot}: 적용 결과가 입력 범위를 벗어납니다.`);return {...e,...(!item?{[key]:next}:{}),itemAmounts:{...e.itemAmounts,...(item?{[key]:next}:{})},memo:memo.trim()?`${e.memo}${e.memo?' / ':''}${memo.trim()}`:e.memo}})
}

export function parsePayrollQueryRows(data:Record<string,unknown>[],rows:PayrollRow[]):PayrollEntryInput[]{
 if(!data.length)throw new Error('급여 자료가 없습니다.');const seen=new Set<string>()
 return data.map((r,i)=>{const matches=rows.filter(x=>x.run.period===String(r['귀속월'])&&x.run.payDate===String(r['지급일'])&&x.entry.employeeNumberSnapshot===String(r['사번']));if(matches.length!==1)throw new Error(`${i+2}행: 귀속월·지급일·사번을 확인하세요.`);const match=matches[0];if(seen.has(match.entry.id))throw new Error('중복 급여 자료입니다.');seen.add(match.entry.id);return parsePayrollRows([r],match.run,[match.entry])[0]})
}
