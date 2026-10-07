export type RuleType = 'LEGAL' | 'COMPANY' | 'RESEARCH' | 'SIMULATION'
export type RuleStatus = 'DRAFT' | 'ACTIVE' | 'RETIRED'

export interface RuleDefinition {
  id: string
  category: string
  name: string
  type: RuleType
  version: number
  effectiveFrom: string
  effectiveTo: string | null
  source: string
  status: RuleStatus
}

// 실제 계산 Rule은 Payroll/WFM 개발 단계에서 이 공통 메타데이터를 기반으로 확장한다.
