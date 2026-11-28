import type {PayrollItemMaster} from '../../domain/types'
import {insuranceRules} from './insuranceRules'
export const parameterDefinitions = {
 overtime:{label:'연장가산율',code:'P120',unit:'배',minimum:1.5},
 night:{label:'야간가산율',code:'P121',unit:'배',minimum:.5},
 holiday:{label:'휴일가산율 (8시간 이내)',code:'P122',unit:'배',minimum:1.5},
 holidayExtra:{label:'휴일 8시간 초과 추가가산율',code:'P122',unit:'배',minimum:.5},
 pension:{label:'국민연금 근로자 요율',code:'T103',unit:'비율',minimum:0},
 pensionMin:{label:'국민연금 기준소득 하한',code:'T103',unit:'원',minimum:0},
 pensionMax:{label:'국민연금 기준소득 상한',code:'T103',unit:'원',minimum:0},
 health:{label:'건강보험 전체 요율',code:'T104',unit:'비율',minimum:0},
 care:{label:'장기요양 / 건강보험 비율',code:'T105',unit:'비율',minimum:0},
 employment:{label:'고용보험 근로자 요율',code:'T106',unit:'비율',minimum:0},
 localTax:{label:'지방소득세 / 소득세 비율',code:'T102',unit:'비율',minimum:0},
} as const
export type ParameterKey=keyof typeof parameterDefinitions
export interface ParameterSource {title:string;url:string;keyword:string;location:string;checkedAt:string;sha256?:string}
export interface ParameterCandidate {key:ParameterKey;value:number;from:string;to:string;source:ParameterSource}
export interface ApprovedParameter extends ParameterCandidate {id:string;approvedAt:string;approvedBy:string}
const validDate=(v:string)=>/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v
export function validateParameter(p:ParameterCandidate){
 const def=parameterDefinitions[p.key]
 if(!def||!Number.isFinite(p.value)||p.value<def.minimum||(def.unit==='비율'&&p.value>1))throw new Error('요율·가산율 값과 단위를 확인하세요.')
 if(!validDate(p.from)||!validDate(p.to)||!p.from.endsWith('-01')||new Date(p.to+'T00:00:00Z').getUTCDate()!==new Date(Date.UTC(Number(p.to.slice(0,4)),Number(p.to.slice(5,7)),0)).getUTCDate()||p.from>p.to||!p.source.title.trim()||!p.source.keyword.trim()||!/^https:\/\//.test(p.source.url))throw new Error('원문·키워드·적용기간을 확인하세요.')
}
export function approveParameter(items:PayrollItemMaster[],p:ParameterCandidate,at:string):PayrollItemMaster[]{
 validateParameter(p)
 const code=parameterDefinitions[p.key].code,item=items.find(i=>i.code===code)
 if(!item)throw new Error('연결할 급여항목을 찾을 수 없습니다.')
 const existing=item.parameters??[]
 if(existing.some(x=>x.key===p.key&&x.from<=p.to&&x.to>=p.from))throw new Error('이미 승인된 적용기간과 겹칩니다. 승인 이력을 보존하고 다음 적용기간으로 등록하세요.')
 return items.map(i=>i.id===item.id?{...i,parameters:[...existing,{...p,id:crypto.randomUUID(),approvedAt:at,approvedBy:'HR_ADMIN'}]}:i)
}
export function activeParameter(items:PayrollItemMaster[],key:ParameterKey,period:string){
 // Rules are applied to an attribution month. A mid-month change requires separate payroll treatment.
 const at=`${period}-01`,matching=items.flatMap(i=>i.parameters??[]).filter(p=>p.key===key&&p.from<=at&&p.to>=at)
 if(matching.length>1)throw new Error(`${parameterDefinitions[key].label}: 승인된 적용기간이 중복됩니다.`)
 return matching[0]
}
export function effectiveItems(items:PayrollItemMaster[],period:string):PayrollItemMaster[]{
 const at=`${period}-01`
 return items.map(i=>{if(!i.effectiveFrom||i.effectiveFrom<=at)return i;const prior=i.previousRules?.find(r=>r.from<=at&&r.to>=at);return prior?{...prior.item,parameters:i.parameters}:{...i,active:false}})
}
export function effectiveInsuranceRules(items:PayrollItemMaster[],period:string){
 const legacy=insuranceRules(period)
 const v=(key:ParameterKey,fallback:number)=>activeParameter(items,key,period)?.value??fallback
 const health=v('health',legacy.healthInsuranceTotalRate),care=v('care',legacy.longTermCareHealthRatio)
 return {...legacy,nationalPensionEmployeeRate:v('pension',legacy.nationalPensionEmployeeRate),healthInsuranceTotalRate:health,healthInsuranceEmployeeRate:health/2,longTermCareHealthRatio:care,longTermCareRateOfIncome:health*care,employmentInsuranceEmployeeRate:v('employment',legacy.employmentInsuranceEmployeeRate),localIncomeTaxRate:v('localTax',legacy.localIncomeTaxRate),pensionMin:v('pensionMin',legacy.pensionMin),pensionMax:v('pensionMax',legacy.pensionMax)}
}
