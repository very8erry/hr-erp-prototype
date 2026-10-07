import type { DailyWorkRecord, DailyWorker } from '../../domain/types'

export const DAILY_WORKER_TAX_RULE_VERSION = 'KR-NTS-DAILY-2026-01'

/**
 * 교육용 일용근로 원천징수 계산.
 * 일급 비과세/기타 공제 및 사회보험 예외는 별도 Rule 확장 지점으로 둔다.
 */
export function calculateDailyWorkRecord(
  worker: DailyWorker,
  workDate: string,
  hours: number,
  note = '',
  allowances: Partial<Pick<DailyWorkRecord,'overtimeAllowance'|'nightAllowance'|'holidayAllowance'|'otherAllowance'>> = {},
): DailyWorkRecord {
  const safeHours = Math.max(0, Math.min(24, hours))
  const amounts={overtimeAllowance:allowances.overtimeAllowance??0,nightAllowance:allowances.nightAllowance??0,holidayAllowance:allowances.holidayAllowance??0,otherAllowance:allowances.otherAllowance??0}
  if(Object.values(amounts).some(v=>!Number.isFinite(v)||v<0))throw new Error('일용직 수당은 0 이상의 숫자여야 합니다.')
  const grossPay = Math.round(worker.dailyRate * (safeHours / 8)+Object.values(amounts).reduce((a,v)=>a+v,0))
  const nonTaxablePay = 0
  const dailyIncomeDeduction = 150_000
  const taxable = Math.max(0, grossPay - nonTaxablePay - dailyIncomeDeduction)
  // 산출세액 6%에서 근로소득 세액공제 55%를 반영한 교육용 Rule.
  const calculatedTax = Math.floor((taxable * 0.06 * 0.45) / 10) * 10
  const incomeTax = calculatedTax < 1000 ? 0 : calculatedTax
  const localIncomeTax = Math.floor((incomeTax * 0.1) / 10) * 10
  const employmentInsurance = 0 // 가입요건 판정은 향후 Social Insurance Rule과 연결.
  const netPay = grossPay - incomeTax - localIncomeTax - employmentInsurance

  return {
    id: `DWR-${worker.id}-${workDate}`,
    dailyWorkerId: worker.id,
    workDate,
    hours: safeHours,
    ...amounts,
    grossPay,
    nonTaxablePay,
    incomeTax,
    localIncomeTax,
    employmentInsurance,
    netPay,
    note,
  }
}
