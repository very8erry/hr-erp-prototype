import type { PayrollItemMaster } from '../../domain/types'
export const extraItems: PayrollItemMaster[] = [
  ['P130','정기상여'],['P131','성과상여'],['P132','소급지급'],['P133','기타수당'],['P134','연차수당'],['P135','보육수당'],['P136','출산지원금'],['P137','실비정산'],['P138','과세수당'],['P139','기타 비과세수당'],['P140','무급·결근차감'],['T107','기타공제']
].map(([code,name],i)=>({id:`PI-${code}`,code,name,category:code.startsWith('T')||code==='P140'?'DEDUCTION':'EARNING',calculationMethod:'MANUAL',taxable:!['P135','P136','P137','P139'].includes(code),active:true,sortOrder:110+i}))
export const entryCode:Record<string,string>={taxableAllowance:'P138',nonTaxableAllowance:'P139',overtimePay:'P120',bonus:'P130',retroPay:'P132',otherEarnings:'P133',unpaidDeduction:'P140',otherDeductions:'T107'}

/** Default classification for this demo company's fixed cash allowances, not a legal certification. */
export function withDemoClassification(item:PayrollItemMaster):PayrollItemMaster {
 const fixed=['P101','P104','P105','P108','P109','P110','P111','P130'].includes(item.code)
 const earning=item.category==='EARNING',insurance=earning&&item.taxable
 return {...item,ordinaryWage:item.ordinaryWage??fixed,minimumWage:item.minimumWage??(fixed||item.code==='P131'),pensionIncluded:item.pensionIncluded??insurance,healthIncluded:item.healthIncluded??insurance,employmentIncluded:item.employmentIncluded??insurance}
}
