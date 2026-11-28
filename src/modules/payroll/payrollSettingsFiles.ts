import type {PayrollItemMaster} from '../../domain/types'
import {standardFormula,validateItemCalculation} from './itemCalculation'
const baseFields=[['code','코드'],['name','급여항목'],['active','사용'],['calculationMode','적용방식'],['formula','산출식'],['manualAmount','공통 고정금액'],['workMultiplier','근로수당 배율'],['holidayExtraMultiplier','휴일초과 추가배율'],['taxable','과세'],['ordinaryWage','통상임금'],['minimumWage','최저임금'],['pensionIncluded','연금보수'],['healthIncluded','건강보수'],['employmentIncluded','고용보수']] as const
export const settingsFields=[...baseFields,['effectiveFrom','적용 시작일'],['fixedIds','공통 고정금액 대상 고용ID'],['fixedCondition','공통 고정금액 지급요건'],['approvedParameters','승인 요율 이력(읽기전용)']] as const
export function settingsValues(r:PayrollItemMaster){return settingsFields.map(([k])=>k==='formula'?r.formula??standardFormula(r.code):k==='fixedIds'?r.fixedEligibility?.employmentIds.join(',')??'':k==='fixedCondition'?r.fixedEligibility?.condition??'':k==='approvedParameters'?JSON.stringify(r.parameters??[]):r[k]??'')}
export function importSettings(rows:Record<string,unknown>[],existing:PayrollItemMaster[]){
 const ids=new Set<string>(),next=structuredClone(existing)
 if(!rows.length)throw new Error('가져올 설정이 없습니다.')
 for(const original of rows){
  const row={...original};if(!('공통 고정금액' in row)&&'수기금액' in row)row['공통 고정금액']=row['수기금액']
  const code=String(row['코드']??''),i=next.findIndex(r=>r.code===code)
  if(i<0||ids.has(code))throw new Error('알 수 없거나 중복된 항목코드: '+code);ids.add(code)
  const item=next[i]
  for(const [key,label] of baseFields){
   if(!(label in row)&&['workMultiplier','holidayExtraMultiplier'].includes(key))continue
   if(!(label in row))throw new Error(label+' 열이 없습니다.')
   const raw=row[label]
   if(key==='code'||key==='name'){if(String(raw)!==String(item[key]))throw new Error('항목코드와 이름은 원본을 유지하세요.');continue}
   if(['active','taxable','ordinaryWage','minimumWage','pensionIncluded','healthIncluded','employmentIncluded'].includes(key)){
    if(!['true','false','1','0',''].includes(String(raw??'').toLowerCase()))throw new Error(label+': true/false 값을 사용하세요.')
    ;(item as unknown as Record<string,unknown>)[key]=['true','1'].includes(String(raw).toLowerCase())
   }else if(key==='workMultiplier'||key==='holidayExtraMultiplier')item[key]=raw===''||raw==null?undefined:Number(raw)
   else if(key==='manualAmount'){const n=raw===''?0:Number(raw);if(!Number.isFinite(n)||n<0)throw new Error('공통 고정금액을 확인하세요.');item.manualAmount=n}
   else if(key==='formula')item.formula=String(raw??'')
   else item.calculationMode=String(raw) as PayrollItemMaster['calculationMode']
  }
  if('적용 시작일' in row)item.effectiveFrom=String(row['적용 시작일']??'')||undefined
  if('공통 고정금액 대상 고용ID' in row||'공통 고정금액 지급요건' in row){const employmentIds=String(row['공통 고정금액 대상 고용ID']??'').split(',').map(s=>s.trim()).filter(Boolean),condition=String(row['공통 고정금액 지급요건']??'');item.fixedEligibility=employmentIds.length||condition?{employmentIds,condition}:undefined}
  if('승인 요율 이력(읽기전용)' in row&&String(row['승인 요율 이력(읽기전용)'])!==JSON.stringify(item.parameters??[]))throw new Error('승인 요율 이력은 파일로 변경할 수 없습니다. 원문 검토·승인을 사용하세요.')
  if(item.calculationMode==='DEFAULT'&&item.formula!==standardFormula(code))item.calculationMode='FORMULA'
  validateItemCalculation(item)
 }
 return next
}
export function formulaExplanation(code:string){return ({P101:'월 기준 기본급 × (일할비율 − 휴직차감비율), 0 미만 제외',P120:'통상시급 × 연장근로시간 × 설정 연장배율. 근태 미연동 시 입력 연장수당',P121:'통상시급 × 야간근로시간 × 설정 야간배율 (22~06시 가산분). 근태 미연동 시 입력 야간수당',P122:'통상시급 × (휴일근로시간 × 설정 휴일배율 + 8시간 초과 휴일시간 × 설정 추가배율). 근태 미연동 시 입력 휴일수당',T101:'과세급여·가족·자녀·지급일에 해당하는 간이세액표 세액',P104:'입력 식대 지급액. 비과세 여부는 요건·월 한도로 별도 분리',P105:'입력 자가운전 지급액. 비과세 여부는 요건·월 한도로 별도 분리'} as Record<string,string>)[code]??'항목별 입력금액 또는 아래 산출식 적용'}
