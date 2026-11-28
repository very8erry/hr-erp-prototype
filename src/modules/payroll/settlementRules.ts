import type {SettlementSetting} from './companyInfo'
export const settlementItems=[
 {key:'incomeTax',name:'연말정산 소득세',group:'연말·중도정산'},
 {key:'localIncomeTax',name:'연말정산 주민세',group:'연말·중도정산'},
 {key:'healthInsurance',name:'건강보험정산',group:'건강·장기요양 정산'},
 {key:'longTermCareInsurance',name:'장기요양보험정산',group:'건강·장기요양 정산'},
] as const
export interface SettlementInput {kind:'INTERIM'|'YEAR_END';installment:'완납·1차분'|'2차분'|'3차분';amounts:Partial<Record<typeof settlementItems[number]['key'],number>>;reason:string}
export function settlementDeductions(input:SettlementInput|undefined,settings:SettlementSetting[]){
 const amounts={incomeTax:0,localIncomeTax:0,healthInsurance:0,longTermCareInsurance:0},errors:string[]=[],warnings:string[]=[]
 if(!input)return {amounts,errors,warnings}
 if(!input.reason.trim())errors.push('정산 반영 근거를 입력하세요.')
 for(const item of settlementItems){const n=input.amounts[item.key]??0;if(!Number.isSafeInteger(n)){errors.push(`${item.name}: 원 단위 정산금액을 확인하세요.`);continue}
 const s=settings.find(s=>s.name===item.name),enabled=s?.selected!==false&&(input.kind==='INTERIM'?s?.interim:s?.yearEnd===input.installment)
 if(n&&!enabled)errors.push(`${item.name}: 선택한 정산 구분·차수가 설정에서 제외되어 있습니다.`)
 if(enabled)amounts[item.key]=n
 }
 if((amounts.healthInsurance!==0)!==(amounts.longTermCareInsurance!==0))warnings.push('건강·장기요양 정산은 동일 고지의 각각 금액을 확인하세요. 다른 항목 금액을 자동 복제하지 않습니다.')
 if((amounts.incomeTax!==0)!==(amounts.localIncomeTax!==0))warnings.push('소득세·지방소득세 정산은 각각 결정세액과 기납부세액을 확인하세요.')
 return {amounts,errors,warnings}
}
