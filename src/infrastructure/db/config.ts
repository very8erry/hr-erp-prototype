export const DB_NAME = 'hr-training-simulator'
export const TRANSIENT_V032_DB_NAME = 'hr-training-simulator-v2'
export const DB_VERSION = 6
export const SCHEMA_VERSION = 6
export const SEED_VERSION = 5

export const STORES = {
  company: 'company',
  organizations: 'organizations',
  persons: 'persons',
  addresses: 'addresses',
  dependents: 'dependents',
  visas: 'visas',
  bankAccounts: 'bankAccounts',
  employments: 'employments',
  assignments: 'assignments',
  compensations: 'compensations',
  taxProfiles: 'taxProfiles',
  socialInsuranceProfiles: 'socialInsuranceProfiles',
  militaryServiceProfiles: 'militaryServiceProfiles',
  educations: 'educations',
  careers: 'careers',
  certifications: 'certifications',
  skills: 'skills',
  resumes: 'resumes',
  workSchedules: 'workSchedules',
  attendanceSettings: 'attendanceSettings',
  managerRelationships: 'managerRelationships',
  personnelEvents: 'personnelEvents',
  auditLogs: 'auditLogs',
  payrollRuns: 'payrollRuns',
  payrollEntries: 'payrollEntries',
  payrollResults: 'payrollResults',
  attendanceMonthlySummaries: 'attendanceMonthlySummaries',
  annualLeaveLedgers: 'annualLeaveLedgers',
  dailyWorkers: 'dailyWorkers',
  dailyWorkRecords: 'dailyWorkRecords',
  retirementSettlements: 'retirementSettlements',
  yearEndTaxCases: 'yearEndTaxCases',
  payrollItemMasters: 'payrollItemMasters',
  attendanceDailyRecords: 'attendanceDailyRecords',
  leaveCases: 'leaveCases',
  payrollSettingsHistory: 'payrollSettingsHistory',
  meta: 'meta',
} as const

export type StoreName = (typeof STORES)[keyof typeof STORES]

export interface StoreDefinition {
  name: StoreName
  indexes?: Array<{ name: string; keyPath: string | string[]; unique?: boolean }>
}

export const STORE_DEFINITIONS: StoreDefinition[] = [
  { name: STORES.attendanceDailyRecords, indexes: [{name:'byEmployeeDate',keyPath:['employmentId','workDate'],unique:true}] },
  { name: STORES.leaveCases, indexes: [{name:'byEmploymentId',keyPath:'employmentId'}] },
  { name: STORES.payrollSettingsHistory },
  { name: STORES.company },
  { name: STORES.organizations },
  { name: STORES.persons, indexes: [{ name: 'byDomesticForeignType', keyPath: 'domesticForeignType' }] },
  { name: STORES.addresses, indexes: [{ name: 'byPersonId', keyPath: 'personId' }] },
  { name: STORES.dependents, indexes: [{ name: 'byEmploymentId', keyPath: 'employmentId' }] },
  { name: STORES.visas, indexes: [{ name: 'byEmploymentId', keyPath: 'employmentId' }, { name: 'byExpiryDate', keyPath: 'expiryDate' }] },
  { name: STORES.bankAccounts, indexes: [{ name: 'byEmploymentId', keyPath: 'employmentId' }] },
  { name: STORES.employments, indexes: [{ name: 'byPersonId', keyPath: 'personId' }, { name: 'byStatus', keyPath: 'status' }] },
  { name: STORES.assignments, indexes: [{ name: 'byEmploymentId', keyPath: 'employmentId' }, { name: 'byEffectiveTo', keyPath: 'effectiveTo' }] },
  { name: STORES.compensations, indexes: [{ name: 'byEmploymentId', keyPath: 'employmentId' }, { name: 'byEffectiveTo', keyPath: 'effectiveTo' }] },
  { name: STORES.taxProfiles, indexes: [{ name: 'byEmploymentId', keyPath: 'employmentId' }] },
  { name: STORES.socialInsuranceProfiles, indexes: [{ name: 'byEmploymentId', keyPath: 'employmentId' }] },
  { name: STORES.militaryServiceProfiles, indexes: [{ name: 'byEmploymentId', keyPath: 'employmentId', unique: true }] },
  { name: STORES.educations, indexes: [{ name: 'byEmploymentId', keyPath: 'employmentId' }] },
  { name: STORES.careers, indexes: [{ name: 'byEmploymentId', keyPath: 'employmentId' }] },
  { name: STORES.certifications, indexes: [{ name: 'byEmploymentId', keyPath: 'employmentId' }] },
  { name: STORES.skills, indexes: [{ name: 'byEmploymentId', keyPath: 'employmentId' }, { name: 'byCategory', keyPath: 'category' }] },
  { name: STORES.resumes, indexes: [{ name: 'byEmploymentId', keyPath: 'employmentId' }] },
  { name: STORES.workSchedules },
  { name: STORES.attendanceSettings, indexes: [{ name: 'byEmploymentId', keyPath: 'employmentId' }] },
  { name: STORES.managerRelationships, indexes: [{ name: 'byEmploymentId', keyPath: 'employmentId', unique: true }] },
  { name: STORES.personnelEvents, indexes: [{ name: 'byEmploymentId', keyPath: 'employmentId' }, { name: 'byStatus', keyPath: 'status' }, { name: 'byEffectiveDate', keyPath: 'effectiveDate' }] },
  { name: STORES.auditLogs, indexes: [{ name: 'byOccurredAt', keyPath: 'occurredAt' }, { name: 'byEntityId', keyPath: 'entityId' }] },
  { name: STORES.payrollRuns, indexes: [{ name: 'byPeriod', keyPath: 'period', unique: true }, { name: 'byStatus', keyPath: 'status' }] },
  { name: STORES.payrollEntries, indexes: [{ name: 'byRunId', keyPath: 'runId' }, { name: 'byEmploymentId', keyPath: 'employmentId' }, { name: 'byRunEmployment', keyPath: ['runId','employmentId'], unique: true }] },
  { name: STORES.payrollResults, indexes: [{ name: 'byRunId', keyPath: 'runId' }, { name: 'byEmploymentId', keyPath: 'employmentId' }, { name: 'byRunEmployment', keyPath: ['runId','employmentId'], unique: true }] },
  { name: STORES.attendanceMonthlySummaries, indexes: [{ name: 'byEmploymentId', keyPath: 'employmentId' }, { name: 'byPeriod', keyPath: 'period' }, { name: 'byEmploymentPeriod', keyPath: ['employmentId','period'], unique: true }] },
  { name: STORES.annualLeaveLedgers, indexes: [{ name: 'byEmploymentId', keyPath: 'employmentId' }, { name: 'byYear', keyPath: 'year' }, { name: 'byEmploymentYear', keyPath: ['employmentId','year'], unique: true }] },
  { name: STORES.dailyWorkers, indexes: [{ name: 'byPersonId', keyPath: 'personId' }, { name: 'byOrganizationId', keyPath: 'organizationId' }, { name: 'byStatus', keyPath: 'status' }] },
  { name: STORES.dailyWorkRecords, indexes: [{ name: 'byDailyWorkerId', keyPath: 'dailyWorkerId' }, { name: 'byWorkDate', keyPath: 'workDate' }] },
  { name: STORES.retirementSettlements, indexes: [{ name: 'byEmploymentId', keyPath: 'employmentId' }, { name: 'byStatus', keyPath: 'status' }] },
  { name: STORES.yearEndTaxCases, indexes: [{ name: 'byEmploymentId', keyPath: 'employmentId' }, { name: 'byTaxYear', keyPath: 'taxYear' }, { name: 'byEmploymentYear', keyPath: ['employmentId','taxYear'], unique: true }] },
  { name: STORES.payrollItemMasters, indexes: [{ name: 'byCode', keyPath: 'code', unique: true }, { name: 'byCategory', keyPath: 'category' }] },
  { name: STORES.meta },
]

export const CORE_V1_STORES = [
  STORES.company,
  STORES.organizations,
  STORES.persons,
  STORES.employments,
  STORES.assignments,
  STORES.compensations,
  STORES.personnelEvents,
  STORES.auditLogs,
  STORES.meta,
] as const

export const EMPLOYEE_MASTER_V2_STORES = [
  STORES.addresses,
  STORES.dependents,
  STORES.visas,
  STORES.bankAccounts,
  STORES.taxProfiles,
  STORES.socialInsuranceProfiles,
  STORES.educations,
  STORES.careers,
  STORES.certifications,
  STORES.skills,
  STORES.resumes,
  STORES.workSchedules,
  STORES.attendanceSettings,
  STORES.managerRelationships,
] as const

export const INDEX_V3_STORES = [...CORE_V1_STORES, ...EMPLOYEE_MASTER_V2_STORES] as const

export const PAYROLL_V3_STORES = [STORES.payrollRuns, STORES.payrollEntries, STORES.payrollResults] as const

export const HR_OPERATIONS_V4_STORES = [
  STORES.militaryServiceProfiles,
  STORES.attendanceMonthlySummaries,
  STORES.annualLeaveLedgers,
  STORES.dailyWorkers,
  STORES.dailyWorkRecords,
  STORES.retirementSettlements,
  STORES.yearEndTaxCases,
  STORES.payrollItemMasters,
] as const
