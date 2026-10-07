import type { EmploymentStatus, PersonnelEventType } from '../../domain/types'

export const statusLabel: Record<EmploymentStatus,string> = {
  ACTIVE:'재직', LEAVE:'휴직', TERMINATED:'퇴직', PRE_HIRE:'입사예정',
}

export const employmentTypeLabel = {
  REGULAR:'정규직', CONTRACT:'계약직', INTERN:'인턴', DAILY:'일용직', DISPATCH:'파견계약직',
} as const

export const eventLabel: Record<PersonnelEventType,string> = {
  ORG_TRANSFER:'부서이동', PROMOTION:'승진/직급변경', TITLE_CHANGE:'직책변경', STATUS_CHANGE:'재직상태변경',
}

export function money(value:number) { return new Intl.NumberFormat('ko-KR').format(value) }
export function shortDate(value:string|null|undefined) { return value ? value.slice(0,10) : '-' }
export function yesNo(value:boolean|undefined) { return value ? '예' : '아니오' }
export function todayLocal() {
  const d=new Date(); const y=d.getFullYear(); const m=String(d.getMonth()+1).padStart(2,'0'); const day=String(d.getDate()).padStart(2,'0')
  return `${y}-${m}-${day}`
}
