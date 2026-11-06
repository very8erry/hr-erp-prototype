export interface CompanyInfo {
  foundedOn?:string
  yearEndRequirements?:import('./yearEndDocuments').YearEndRequirement[]
  withholdingChecklists?:Record<string,import('./WithholdingChecklist').WithholdingCheck[]>

  defaultPayrollDay?:number

  workPlanning?:import('../operations/workSchedule').WorkSettings

  industrialAccidentEmployerRate?:number|null;employmentInsuranceEmployerAdditionalRate?:number|null;insuranceRateSource?:string;insuranceRateEffectiveFrom?:string;
  externalContracts?:{id:string;name:string;project:string;startDate:string;endDate:string;monthlyFee:number;documents?:import("../../domain/attachments").StoredFile[]}[]
  industry?:string;industryCode?:string;
  email?:string;
  name:string; businessNumber:string; managementNumber:string; address:string; representative:string; telephone:string;
  occupationCode:string; insuranceCode:number; departureCode:number; leavePolicy:'FAVORABLE'|'HIRE';
}
export interface SettlementSetting {name:string; visible:boolean; interim:boolean; yearEnd:string}
export const defaultCompanyInfo:CompanyInfo={email:'lemonpai314@lemonpai314.com',industrialAccidentEmployerRate:0.66,employmentInsuranceEmployerAdditionalRate:0.65,insuranceRateEffectiveFrom:'2026-01-01',externalContracts:[{id:'FREELANCE-DEMO-1',name:'가상 이도현',project:'클라우드 서비스 구축',startDate:'2026-07-01',endDate:'2026-12-31',monthlyFee:5000000}],industry:'IT · 응용 소프트웨어 개발',industryCode:'58222',name:'lemonpAI',businessNumber:'847-86-39261',managementNumber:'84786392610',address:'서울특별시 가상구 기술로 100 (실습용 IT 사업장)',representative:'김가온',telephone:'02-6847-3926',occupationCode:'029',insuranceCode:5,departureCode:1,leavePolicy:'FAVORABLE'}
export const defaultSettlements:SettlementSetting[]=['연말(중도)정산','연말정산 소득세','연말정산 주민세','건강보험정산','장기요양보험정산'].map((name,i)=>({name,visible:i<3,interim:i===1||i===2,yearEnd:i<3?'완납·1차분':'안함'}))
export function seoulDate(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}
