import {settlementDeductions} from './settlementRules'
import {defaultSettlements,type SettlementSetting} from './companyInfo'
import {splitNonTax,nonTaxDescriptions} from './nonTaxRules'
import {effectiveInsuranceRules,effectiveItems} from './payrollParameters'
import {simplifiedTax} from './ntsTax'
import {configuredAmount,workMultipliers} from './itemCalculation'
import type { PayrollEntry, PayrollResult, PayrollItemMaster, LeaveCase } from '../../domain/types'

export const PAYROLL_RULE_VERSION = 'KR-2026-PAYROLL-0.7.7'

export const payrollRuleInfo = {
  nationalPensionEmployeeRate: 0.0475,
  healthInsuranceEmployeeRate: 0.03595,
  longTermCareRateOfIncome: 0.009448,
  healthInsuranceTotalRate: 0.0719,
  employmentInsuranceEmployeeRate: 0.009,
  localIncomeTaxRate: 0.1,
} as const

function floor10(value: number): number {
  return Math.max(0, Math.floor(value / 10) * 10)
}

function roundWon(value: number): number {
  return Math.max(0, Math.round(value))
}

export function calculatePayrollEntry(entry: PayrollEntry, period: string, items:PayrollItemMaster[]=[],overrides?:Record<string,boolean>,leaves:LeaveCase[]=[],payDate=`${period}-25`,settlementSettings:SettlementSetting[]=defaultSettlements): PayrollResult {
  const outsidePeriod=new Set(items.filter(i=>i.effectiveFrom&&i.effectiveFrom>period+'-01'&&!i.previousRules?.some(r=>r.from<=period+'-01'&&r.to>=period+'-01')).map(i=>i.code))
  items=effectiveItems(items,period)
  const appliedItemAmounts:Record<string,number>={}
  const nonTaxInsuranceBreakdown:NonNullable<PayrollResult["nonTaxInsuranceBreakdown"]>=[]
  const enabled=(code:string)=>!outsidePeriod.has(code)&&(overrides?.[code]??items.find(i=>i.code===code)?.active??true)
  const premiumCalculationDetails:NonNullable<PayrollResult['premiumCalculationDetails']>=[]
  const value=(code:string,n:number)=>{
    if(!enabled(code)){appliedItemAmounts[code]=0;return 0}
    try{
      const item=items.find(i=>i.code===code),basis=entry.attendanceBasisSnapshot
      if(['P120','P121','P122'].includes(code)&&entry.calculationInputs&&item?.calculationMode!=='MANUAL'&&basis?.premiumTimes?.length){
        const totals=basis.premiumTimes.reduce((a,d)=>({overtimeHours:a.overtimeHours+d.overtimeHours,nightHours:a.nightHours+d.nightHours,holidayHours:a.holidayHours+d.holidayHours}),{overtimeHours:0,nightHours:0,holidayHours:0})
        if(Object.entries(totals).some(([k,v])=>Math.abs(v-entry.calculationInputs![k as keyof typeof totals])>.001))throw new Error('일별 수당시간과 급여 입력시간이 다릅니다. 근태를 다시 합산하세요.')
        const groups=new Map<string,{monthlyHours:number;payRate:number;ot:number;night:number;holiday:number;extra:number}>()
        for(const d of basis.premiumTimes){const payRate=d.contractKind==='CHILDCARE_REDUCTION'?(applicable.find(l=>l.startDate<=d.date&&(!l.endDate||l.endDate>=d.date))?.companyPayRate??1):1,key=d.ordinaryMonthlyHours+'|'+payRate,g=groups.get(key)??{monthlyHours:d.ordinaryMonthlyHours,payRate,ot:0,night:0,holiday:0,extra:0};g.ot+=d.overtimeHours;g.night+=d.nightHours;g.holiday+=d.holidayHours;g.extra+=d.holidayOvertimeHours;groups.set(key,g)}
        if(item?.calculationMode==='FORMULA'&&groups.size>1)throw new Error('계약 변경월 사용자 산출식은 적용 단위 검토가 필요합니다. 기본 산출식 또는 검토한 직원별 수기 금액을 적용하세요.')
        let total=0
        for(const g of groups.values()){
          const hourly=(entry.monthlyBasePay*g.payRate+ordinaryExtra)/g.monthlyHours,values={...context,통상시급:hourly,통상임금월액:entry.monthlyBasePay*g.payRate+ordinaryExtra,월소정시간:g.monthlyHours,연장시간:g.ot,야간시간:g.night,휴일시간:g.holiday,휴일초과시간:g.extra,항목금액:entry.itemAmounts?.[code]??0}
          const amount=configuredAmount(item,n,values,{id:entry.employmentId,explicitAmount:entry.itemAmounts?.[code]});total+=amount;premiumCalculationDetails.push({code,monthlyHours:g.monthlyHours,companyPayRate:g.payRate,hours:code==='P120'?g.ot:code==='P121'?g.night:g.holiday,hourlyRate:hourly,amount})
        }
        return appliedItemAmounts[code]=total
      }
      return appliedItemAmounts[code]=configuredAmount(item,n,{...context,항목금액:entry.itemAmounts?.[code]??0},{id:entry.employmentId,explicitAmount:entry.itemAmounts?.[code]})
    }catch(e){errors.push(`${code}: ${(e as Error).message}`);return 0}
  }
  const monthStart=`${period}-01`;const days=new Date(Number(period.slice(0,4)),Number(period.slice(5)),0).getDate()
  const monthEnd=`${period}-${String(days).padStart(2,'0')}`
  const applicable=leaves.filter(l=>l.employmentId===entry.employmentId&&l.startDate<=monthEnd&&(!l.endDate||l.endDate>=monthStart))
  let leaveDeductionRate=0
  for(let d=1;d<=days;d++){const date=`${period}-${String(d).padStart(2,'0')}`;if(date<entry.hireDateSnapshot||(entry.terminationDateSnapshot&&date>entry.terminationDateSnapshot))continue;const l=applicable.find(l=>l.startDate<=date&&(!l.endDate||l.endDate>=date));if(l)leaveDeductionRate+=(1-l.companyPayRate)/days}
  const fullLeave=applicable.find(l=>l.startDate<=monthStart&&(!l.endDate||l.endDate>=monthEnd))
  const warnings: string[] = []
  const errors: string[] = []

  if (entry.prorationRate < 0 || entry.prorationRate > 1) errors.push('일할계산 비율은 0~1 범위여야 합니다.')
  if (entry.monthlyBasePay < 0) errors.push('월 기준급여는 음수일 수 없습니다.')
  if (entry.incomeTaxManual < 0) errors.push('소득세 입력값은 음수일 수 없습니다.')

  if(entry.attendanceBasisSnapshot){warnings.push(...entry.attendanceBasisSnapshot.warnings);if(entry.attendanceBasisSnapshot.unpaidShortfallHours>0)warnings.push(`무급 부재 ${entry.attendanceBasisSnapshot.unpaidShortfallHours}시간: 휴직 지급비율·무급공제와 중복/누락을 대조하세요.`)}
  const proration = Math.min(1, Math.max(0, entry.prorationRate))
  const rate=effectiveInsuranceRules(items,period)
  const bounds={min:rate.pensionMin,max:rate.pensionMax}
  const inputs=entry.calculationInputs,monthlyHours=inputs?.ordinaryMonthlyHours??entry.ordinaryMonthlyHoursSnapshot??209;
  if(monthlyHours<=0||!Number.isFinite(monthlyHours))errors.push('월 소정시간을 확인하세요.');
  const context:Record<string,number>={통상임금월액:entry.monthlyBasePay,통상시급:entry.monthlyBasePay/Math.max(1,monthlyHours),월소정시간:monthlyHours,근태연동:inputs?1:0,연장시간:inputs?.overtimeHours??0,야간시간:inputs?.nightHours??0,휴일시간:inputs?.holidayHours??0,휴일초과시간:inputs?.holidayOvertimeHours??0,...workMultipliers(items,period),휴직요양산정:fullLeave?1:0,간이세액표세액:0,월기준급여:entry.monthlyBasePay,일할비율:proration,휴직차감비율:leaveDeductionRate,과세수당:entry.taxableAllowance,비과세수당:entry.nonTaxableAllowance,연장수당:entry.overtimePay,상여:entry.bonus,소급금:entry.retroPay,기타지급:entry.otherEarnings,무급공제:entry.unpaidDeduction,기타공제:entry.otherDeductions,연금보수:entry.pensionBaseMonthly,건보보수:entry.healthBaseMonthly,고용보수:entry.employmentInsuranceBaseMonthly,수기소득세:entry.incomeTaxManual,총지급액:0,건강보험료:0,소득세:0,연금요율:rate.nationalPensionEmployeeRate,건보전체요율:rate.healthInsuranceTotalRate,요양비율:rate.longTermCareHealthRatio,고용요율:rate.employmentInsuranceEmployeeRate,지방세율:rate.localIncomeTaxRate,연금하한:bounds.min,연금상한:bounds.max,건보최저:period<'2026-01'?19780:20160,건보최고:period<'2026-01'?9008340:9183480,건보총보험료:0,회사건보고지액:fullLeave?.healthPremiumOverride??0,회사고용보수:fullLeave?.employmentBaseOverride??entry.employmentInsuranceBaseMonthly}
  const basePay = value('P101',roundWon(entry.monthlyBasePay * Math.max(0,proration-leaveDeductionRate)))
  const ordinarySource:Record<string,number>={P130:entry.bonus,P138:entry.taxableAllowance,P139:entry.nonTaxableAllowance};
  const ordinaryExtra=items.filter(i=>i.ordinaryWage&&i.code!=='P101'&&!['P120','P121','P122'].includes(i.code)).reduce((sum,i)=>sum+value(i.code,ordinarySource[i.code]??entry.itemAmounts?.[i.code]??0),0);context.통상임금월액=entry.monthlyBasePay+ordinaryExtra;context.통상시급=context.통상임금월액/Math.max(1,monthlyHours);
  const insuredAmounts:Record<string,number>={};
  let additionalTax=0,additionalNonTax=0
  const legacyCodes=['P101','P138','P120','P130','P132','P133','P139','P140']
  const additionalCodes=new Set([...(inputs?['P121','P122']:[]),...Object.keys(entry.itemAmounts??{}),...items.filter(i=>i.category==='EARNING'&&i.calculationMode&&i.calculationMode!=='DEFAULT'&&!legacyCodes.includes(i.code)).map(i=>i.code)])
  for(const code of additionalCodes){
    const amount=entry.itemAmounts?.[code]??0
    if(!enabled(code))continue
    const item=items.find(i=>i.code===code)
    if(!item||!Number.isFinite(amount)||amount<0){errors.push(`${code} 수당 설정·금액을 확인하세요.`);continue}
    const applied=value(code,amount)
    const split=item.taxable?{taxable:applied,nonTaxable:0}:nonTaxDescriptions[code]?splitNonTax(code,applied,payDate,entry.nonTaxEligibility):{taxable:0,nonTaxable:applied}
    additionalTax+=split.taxable;insuredAmounts[code]=split.taxable;additionalNonTax+=split.nonTaxable
    nonTaxInsuranceBreakdown.push({code,name:item.name,paid:applied,exempt:split.nonTaxable,taxable:split.taxable,pension:item.pensionIncluded===false?0:split.taxable,health:item.healthIncluded===false?0:split.taxable,employment:item.employmentIncluded===false?0:split.taxable,basis:item.taxable?'과세항목':nonTaxDescriptions[code]??'별도 비과세 요건 확인 필요'})
    if(!item.taxable&&split.taxable)warnings.push(`${item.name}: 요건 미충족·한도 초과 ${split.taxable.toLocaleString()}원 과세 · 보험 보수 포함 설정에 따라 후보액 반영`)

    if(['P104','P105','P135','P136','P137'].includes(code)&&amount>0)warnings.push(`${item.name}: 비과세 요건·한도와 증빙을 검토하세요.`)
  }
  const legacyAmounts:Array<[string,number,boolean]>=[['P101',basePay,true],['P138',value('P138',entry.taxableAllowance),true],['P120',value('P120',entry.overtimePay),true],['P130',value('P130',entry.bonus),true],['P132',value('P132',entry.retroPay),true],['P133',value('P133',entry.otherEarnings),true],['P139',value('P139',entry.nonTaxableAllowance),false]]
  let taxableEarnings=additionalTax,nonTaxableEarnings=additionalNonTax
  for(const [code,amount,fallback] of legacyAmounts){if(items.find(i=>i.code===code)?.taxable??fallback){taxableEarnings+=amount;insuredAmounts[code]=amount;}else nonTaxableEarnings+=amount}
  const classification=entry.classificationAdjustment??0
  if(!Number.isSafeInteger(classification)||classification>nonTaxableEarnings||-classification>taxableEarnings)errors.push('과세·비과세 정정액이 기존 금액 범위를 초과합니다.')
  else {taxableEarnings+=classification;nonTaxableEarnings-=classification;insuredAmounts.CLASSIFICATION=classification}
  taxableEarnings=Math.max(0,taxableEarnings-value('P140',entry.unpaidDeduction))
  nonTaxableEarnings=Math.max(0,nonTaxableEarnings)
  if(applicable.length)warnings.push('휴직 회사 지급비율을 기본급에 반영했습니다. 고용보험 지원금은 회사 급여·과세총액에 합산하지 않습니다.')
  if(applicable.some(l=>l.kind==='UNCLASSIFIED'))errors.push('휴직 사유가 미분류입니다. 휴직 유형을 확인하세요.')
  const grossPay = taxableEarnings + nonTaxableEarnings
  context.총지급액=grossPay
  // Review amounts are current-month remuneration; notified pension/health bases remain authoritative.
  const insuranceEstimate=(key:'pensionIncluded'|'healthIncluded'|'employmentIncluded')=>Math.max(0,Object.entries(insuredAmounts).reduce((sum,[code,amount])=>sum+(items.find(i=>i.code===code)?.[key]===false?0:amount),0)-(appliedItemAmounts.P140??0));
  const employment=insuranceEstimate('employmentIncluded'),employmentApplied=fullLeave?.employmentBaseOverride??(entry.deriveEmploymentBase?employment:entry.employmentInsuranceBaseMonthly);
  const insuranceBaseCheck={pension:insuranceEstimate('pensionIncluded'),health:insuranceEstimate('healthIncluded'),employment,employmentApplied};
  context.고용보수=context.회사고용보수=employmentApplied;

  let nationalPension = 0
  if (entry.nationalPensionEligible && enabled('T103') && !fullLeave?.pensionExceptionApproved) {
    const bounds={min:rate.pensionMin,max:rate.pensionMax}
    const declaredBase = Math.max(0, Math.floor(entry.pensionBaseMonthly / 1000) * 1000)
    const pensionBase = Math.min(bounds.max, Math.max(bounds.min, declaredBase))
    nationalPension = value('T103',floor10(pensionBase * rate.nationalPensionEmployeeRate))
  }

  let healthInsurance = 0
  let longTermCareInsurance = 0
  if (entry.healthInsuranceEligible && enabled('T104')) {
    const base = Math.max(0, entry.healthBaseMonthly)
    const totalHealthPremium = Math.min(period<'2026-01'?9_008_340:9_183_480, Math.max(period<'2026-01'?19_780:20_160, floor10(base * rate.healthInsuranceTotalRate)))
    context.건보총보험료=totalHealthPremium
    healthInsurance = fullLeave?.healthDeferred ? 0 : fullLeave?.healthPremiumOverride!=null ? floor10(fullLeave.healthPremiumOverride) : floor10(totalHealthPremium / 2)
    if(!fullLeave?.healthDeferred&&fullLeave?.healthPremiumOverride==null)healthInsurance=value('T104',healthInsurance)
    context.건강보험료=healthInsurance
    if(fullLeave?.healthDeferred) warnings.push('건강보험 납입고지 유예: 면제가 아니며 복직 정산이 필요합니다.')
    const totalLongTermCare = floor10(totalHealthPremium * (rate.longTermCareHealthRatio))
    longTermCareInsurance = enabled('T105')&&!fullLeave?.healthDeferred ? value('T105',fullLeave ? floor10(healthInsurance*(rate.longTermCareHealthRatio)) : floor10(totalLongTermCare / 2)) : 0
  }

  let employmentInsurance = entry.employmentInsuranceEligible && enabled('T106')
    ? value('T106',floor10(Math.max(0, employmentApplied) * rate.employmentInsuranceEmployeeRate))
    : 0

  context.간이세액표세액=simplifiedTax(taxableEarnings,Math.max(1,entry.basicDeductionCount),Math.min(Math.max(0,entry.childDeductionCount),Math.max(0,entry.basicDeductionCount-1)),payDate);
  let incomeTax=value('T101',context.간이세액표세액)
  context.소득세=incomeTax
  let localIncomeTax = value('T102',floor10(incomeTax * rate.localIncomeTaxRate))
  const otherDeductions = value('T107',Math.max(0, roundWon(entry.otherDeductions)))
  const manual=entry.insuranceOverrides
  if(manual){for(const [key,v] of Object.entries(manual)){if(v===undefined)continue;if(!Number.isFinite(v)||v<0){errors.push(`수기 보험·지방세 금액 오류: ${key}`);continue}const amount=roundWon(v);if(key==='nationalPension')nationalPension=amount;if(key==='healthInsurance')healthInsurance=amount;if(key==='longTermCareInsurance')longTermCareInsurance=amount;if(key==='employmentInsurance')employmentInsurance=amount;if(key==='localIncomeTax')localIncomeTax=amount}if(Object.keys(manual).length)warnings.push('보험·지방소득세 수기 적용: 고지·정산 근거를 확인하세요.')}
  const settlement=settlementDeductions(entry.settlementInput,settlementSettings)
  errors.push(...settlement.errors);warnings.push(...settlement.warnings)
  incomeTax+=settlement.amounts.incomeTax;localIncomeTax+=settlement.amounts.localIncomeTax;healthInsurance+=settlement.amounts.healthInsurance;longTermCareInsurance+=settlement.amounts.longTermCareInsurance
  const totalDeductions = nationalPension + healthInsurance + longTermCareInsurance + employmentInsurance + incomeTax + localIncomeTax + otherDeductions
  const netPay = grossPay - totalDeductions

  if(entry.nonTaxableAllowance>0)warnings.push('기타 비과세수당은 지급 요건·한도·증빙을 별도 확인해야 합니다.')
  if (taxableEarnings >= 1_000_000 && incomeTax === 0) warnings.push('소득세 0원: 가족 공제 또는 수기 입력값을 확인하세요.')
  if (proration < 1) warnings.push(`일할계산 ${Math.round(proration * 100)}%가 적용되었습니다.`)
  if (entry.monthlyBasePay > 0 && grossPay > entry.monthlyBasePay * 1.5) warnings.push('총지급액이 월 기준급여의 150%를 초과합니다. 상여·소급·변동급을 확인하세요.')
  if (entry.monthlyBasePay > 0 && grossPay < entry.monthlyBasePay * 0.5) warnings.push('총지급액이 월 기준급여의 50% 미만입니다. 휴직·무급·일할계산 여부를 확인하세요.')
  if (netPay < 0) errors.push('실지급액이 음수입니다. 공제항목을 확인하세요.')

  return {
    id: `PAYRES-${entry.runId}-${entry.employmentId}`,
    runId: entry.runId,
    employmentId: entry.employmentId,
    basePay,
    premiumCalculationDetails,appliedItemAmounts,insuranceBaseCheck,nonTaxInsuranceBreakdown,appliedSettlements:settlement.amounts,
    taxableEarnings,
    nonTaxableEarnings,
    grossPay,
    nationalPension,
    healthInsurance,
    longTermCareInsurance,
    employmentInsurance,
    incomeTax,
    localIncomeTax,
    otherDeductions,
    totalDeductions,
    netPay,
    calculatedAt: new Date().toISOString(),
    ruleVersion: PAYROLL_RULE_VERSION,
    payrollRuleVersion:PAYROLL_RULE_VERSION,insuranceRuleVersion:rate.version,taxTableVersion:"NTS-2026-02-27",relevantRates:{...rate,...workMultipliers(items,period)},
    warnings,
    errors,
  }
}


export interface RetirementRuleResult {
  averageDailyWage: number
  ordinaryDailyWage: number
  appliedDailyWage: number
  retirementPay: number
}

/** Persistence와 분리된 교육용 퇴직급여 계산 Rule. */
export function calculateRetirementRule(serviceDays:number, recentGrossPays:number[], annualSalary:number):RetirementRuleResult {
  const averageMonthly = recentGrossPays.length > 0
    ? recentGrossPays.reduce((sum,value)=>sum+value,0) / recentGrossPays.length
    : annualSalary / 12
  const averageDailyWage = averageMonthly / 30
  const ordinaryDailyWage = (annualSalary / 12) / 30
  const appliedDailyWage = Math.max(averageDailyWage, ordinaryDailyWage)
  const retirementPay = Math.round(appliedDailyWage * 30 * (Math.max(0,serviceDays) / 365))
  return { averageDailyWage, ordinaryDailyWage, appliedDailyWage, retirementPay }
}
