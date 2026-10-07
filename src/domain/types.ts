export type EmploymentStatus = 'ACTIVE' | 'LEAVE' | 'TERMINATED' | 'PRE_HIRE'
export type EmploymentType = 'REGULAR' | 'CONTRACT' | 'INTERN' | 'DAILY' | 'DISPATCH'
export type Gender = 'F' | 'M'
export type DomesticForeignType = 'DOMESTIC' | 'FOREIGN'
export type ResidentType = 'RESIDENT' | 'NON_RESIDENT'
export type PersonnelEventType = 'ORG_TRANSFER' | 'PROMOTION' | 'TITLE_CHANGE' | 'STATUS_CHANGE'
export type PersonnelEventStatus = 'SCHEDULED' | 'APPLIED'
export type SkillCategory = 'Language' | 'IT' | 'Soft Skill' | 'Programming' | 'HR' | 'Finance' | 'Other'
export type MilitaryServiceStatus = 'COMPLETED' | 'SERVING' | 'EXEMPT' | 'NOT_APPLICABLE'
export type DailyWorkerStatus = 'ACTIVE' | 'ENDED'
export type PayrollItemCategory = 'EARNING' | 'DEDUCTION'
export type PayrollCalculationMethod = 'MASTER' | 'FORMULA' | 'OVERTIME' | 'MANUAL'


export interface Company {
  recruiting?: import("../modules/recruiting/recruiting").RecruitingState
  demoPayrollVersion?:number
  reportingInfo?: import("../modules/payroll/companyInfo").CompanyInfo
  settlements?: import("../modules/payroll/companyInfo").SettlementSetting[]
  attendanceClosed?: Record<string,string>
  dailyClosed?: Record<string,string>
  demoScenarioVersion?:number
  demoHistoryVersion?: number
  id: string
  name: string
  countryCode: 'KR'
  employeeSizeBand: '300_PLUS'
  demoNotice: string
}

export interface Organization {
  id: string
  companyId: string
  parentId: string | null
  name: string
  type: 'COMPANY' | 'DIVISION' | 'DEPARTMENT' | 'TEAM'
}

/** 사람 자체의 최소 원천정보. 고용/급여/비자 등의 업무정보는 별도 Entity에서 관리한다. */
export interface Person {
  id: string
  fullName: string
  englishName: string
  hanjaName: string
  birthDate: string
  gender: Gender
  domesticForeignType: DomesticForeignType
  nationality: string
  reportingNationality: string
  syntheticIdentifier: string
  profileImageUrl: string | null
  mobile: string
  phone: string
  email: string
  emergencyContactName: string
  emergencyContactPhone: string
  emergencyContactRelation: string
}

export interface Address {
  id: string
  personId: string
  postalCode: string
  addressLine1: string
  addressLine2: string
  effectiveStartDate: string
  effectiveEndDate: string | null
}

export interface Dependent {
  id: string
  employmentId: string
  relation: '배우자' | '자녀' | '부' | '모' | '형제자매' | '기타'
  name: string
  birthDate: string
  cohabitation: boolean
  disabilityStatus: boolean
  basicDeductionEligible: boolean
  childDeductionEligible: boolean
  effectiveStartDate: string
  effectiveEndDate: string | null
  createdAt: string
  updatedAt: string
}

export interface Visa {
  id: string
  employmentId: string
  nationality: string
  visaType: string
  visaStatus: 'ACTIVE' | 'EXPIRED' | 'PENDING' | 'NOT_REQUIRED'
  issueDate: string
  expiryDate: string
  workPermission: boolean
  foreignRegistrationStatus: 'REGISTERED' | 'PENDING' | 'NOT_REQUIRED'
  foreignRegistrationNumberMasked: string
  passportNumberMasked: string
  passportExpiryDate: string
  effectiveStartDate: string
  effectiveEndDate: string | null
}

export interface BankAccount {
  id: string
  employmentId: string
  bankName: string
  accountNumberMasked: string
  accountHolder: string
  isPayrollAccount: boolean
  effectiveStartDate: string
  effectiveEndDate: string | null
}

export interface Employment {
  id: string
  personId: string
  companyId: string
  employeeNumber: string
  hireDate: string
  terminationDate: string | null
  employmentType: EmploymentType
  status: EmploymentStatus
}

export interface Assignment {
  id: string
  employmentId: string
  organizationId: string
  grade: string
  title: string
  job: string
  workLocation: string
  effectiveFrom: string
  effectiveTo: string | null
}

export interface CompensationSnapshot {
  id: string
  employmentId: string
  annualSalary: number
  effectiveFrom: string
  effectiveTo: string | null
}

export interface TaxProfile {
  id: string
  employmentId: string
  residentType: ResidentType
  residenceCountry: string
  residenceCountryCode: string
  foreignEmployee: boolean
  foreignFlatTaxEligible: boolean
  foreignFlatTaxApplied: boolean
  selfBasicDeductionEligible: boolean
  effectiveStartDate: string
  effectiveEndDate: string | null
}

export interface SocialInsuranceProfile {
  id: string
  employmentId: string
  nationalPensionEligible: boolean
  healthInsuranceEligible: boolean
  employmentInsuranceEligible: boolean
  industrialAccidentInsuranceEligible: boolean
  effectiveStartDate: string
  effectiveEndDate: string | null
}

export interface MilitaryServiceProfile {
  id: string
  employmentId: string
  status: MilitaryServiceStatus
  serviceType: string
  branch: string
  rank: string
  serviceStartDate: string | null
  serviceEndDate: string | null
  dischargeType: string
  exemptionReason: string
  reserveForcesEligible: boolean
  reserveForcesEndDate: string | null
  militaryDutyLeaveEligible: boolean
  note: string
}

export interface Education {
  id: string
  employmentId: string
  schoolName: string
  major: string
  degree: string
  admissionDate: string
  graduationDate: string | null
  graduated: boolean
  note: string
}

/** 현재 회사 Assignment History와 분리되는 이전 회사 경력 */
export interface CareerHistory {
  id: string
  employmentId: string
  companyName: string
  organization: string
  job: string
  title: string
  startDate: string
  endDate: string
  responsibilities: string
  careerMonths: number
}

export interface Certification {
  id: string
  employmentId: string
  name: string
  issuer: string
  certificateNumberMasked: string
  acquiredDate: string
  expiryDate: string | null
  status: 'ACTIVE' | 'EXPIRED' | 'PERMANENT'
  attachmentName: string | null
}

export interface EmployeeSkill {
  id: string
  employmentId: string
  category: SkillCategory
  skillName: string
  proficiency: string
  score: string | null
  acquiredDate: string | null
}

export interface ResumeDocument {
  id: string
  employmentId: string
  fileName: string
  version: number
  uploadedAt: string
  uploadedBy: string
  status: 'CURRENT' | 'ARCHIVED'
}

export interface WorkSchedule {
  id: string
  name: string
  timezone: string
  workDays: string[]
  startTime: string
  endTime: string
  breakMinutes: number
}

export interface AttendanceSetting {
  id: string
  employmentId: string
  workScheduleId: string
  timezone: string
  attendancePin: string
  badgeId: string
  rfidId: string
}

export interface ManagerRelationship {
  id: string
  employmentId: string
  directManagerId: string | null
  hrManagerId: string | null
  leaveApproverId: string | null
  attendanceApproverId: string | null
  performanceReviewerId: string | null
  effectiveStartDate: string
  effectiveEndDate: string | null
}

export interface PersonnelEvent {
  id: string
  employmentId: string
  eventType: PersonnelEventType
  effectiveDate: string
  before: Record<string, string | number | null>
  after: Record<string, string | number | null>
  reason: string
  createdAt: string
  status: PersonnelEventStatus
}

export interface AuditLog {
  id: string
  occurredAt: string
  actor: string
  action: string
  entityType: string
  entityId: string
  detail: string
}

export interface AttendanceMonthlySummary {
  paidCreditHours?:number
  issueNote?:string
  unpaidHours?:number
  sickPaidHours?:number
  sickUnpaidHours?:number
  confirmedAt?: string
  confirmedBy?: string
  id: string
  employmentId: string
  period: string
  organizationNameSnapshot: string
  gradeSnapshot: string
  jobSnapshot: string
  scheduledHours: number
  workedHours: number
  overtimeHours: number
  nightHours: number
  holidayHours: number
  leaveDays: number
  absenceHours: number
  lateMinutes: number
  earlyLeaveMinutes: number
  manualEdited?: boolean
  updatedAt?: string
  updatedBy?: string
  editReason?: string
  revision?: number
}

export interface AnnualLeaveLedger {
  confirmedAt?: string
  confirmedBy?: string
  updatedAt?: string
  updatedBy?: string
  editReason?: string
  manualEdited?: boolean
  id: string
  employmentId: string
  year: number
  grantedDays: number
  carriedDays: number
  adjustedDays: number
  usedDays: number
  remainingDays: number
  ruleVersion: string
}

export interface DailyWorker {
  id: string
  personId: string
  workerNumber: string
  workerNameSnapshot: string
  organizationId: string
  job: string
  status: DailyWorkerStatus
  startDate: string
  endDate: string | null
  dailyRate: number
  bankName: string
  accountNumberMasked: string
}

export interface DailyWorkerInput {
  id?: string
  personId?: string
  workerNumber?: string
  name: string
  birthDate: string
  mobile: string
  organizationId: string
  job: string
  status: DailyWorkerStatus
  startDate: string
  endDate: string | null
  dailyRate: number
  bankName: string
  accountNumberMasked: string
}

export interface DailyWorkRecord {
  confirmedAt?: string
  confirmedBy?: string
  overtimeAllowance?: number
  nightAllowance?: number
  holidayAllowance?: number
  otherAllowance?: number
  id: string
  dailyWorkerId: string
  workDate: string
  hours: number
  startTime?: string
  endTime?: string
  endNextDay?: boolean
  breakStart?: string
  breakMinutes?: number
  grossPay: number
  nonTaxablePay: number
  incomeTax: number
  localIncomeTax: number
  employmentInsurance: number
  netPay: number
  note: string
}

export interface RetirementSettlement {
  manualEdited?: boolean
  editReason?: string
  updatedAt?: string
  id: string
  employmentId: string
  calculationDate: string
  terminationDate: string
  serviceDays: number
  averageDailyWage: number
  ordinaryDailyWage: number
  appliedDailyWage: number
  retirementPay: number
  status: 'DRAFT' | 'CALCULATED' | 'CONFIRMED'
  ruleVersion: string
  note: string
}

export interface YearEndTaxCase {
  manualEdited?: boolean
  editReason?: string
  updatedAt?: string
  id: string
  employmentId: string
  taxYear: number
  grossPay: number
  incomeTaxWithheld: number
  localTaxWithheld: number
  basicDeductionCount: number
  childCount: number
  status: 'DRAFT' | 'REVIEW' | 'CONFIRMED'
  estimatedFinalTax: number | null
  settlementAmount: number | null
  ruleVersion: string
}

export interface PayrollItemMaster {
  id: string
  code: string
  name: string
  category: PayrollItemCategory
  calculationMode?: 'DEFAULT' | 'FORMULA' | 'MANUAL'
  formula?: string
  manualAmount?: number
  calculationMethod: PayrollCalculationMethod
  taxable: boolean
  active: boolean
  sortOrder: number
  updatedAt?: string
  ordinaryWage?: boolean
  minimumWage?: boolean
  pensionIncluded?: boolean
  healthIncluded?: boolean
  employmentIncluded?: boolean
}

export interface EmployeeView {
  employmentId: string
  personId: string
  employeeNumber: string
  name: string
  englishName: string
  birthDate: string
  gender: Gender
  domesticForeignType: DomesticForeignType
  nationality: string
  mobile: string
  email: string
  address: string
  syntheticIdentifier: string
  bankName: string
  bankAccount: string
  hireDate: string
  terminationDate: string | null
  employmentType: EmploymentType
  status: EmploymentStatus
  organizationId: string
  organizationName: string
  grade: string
  title: string
  job: string
  workLocation: string
  annualSalary: number
}

export interface EmployeeMasterDetail {
  employee: EmployeeView
  person: Person
  address: Address | null
  dependents: Dependent[]
  visas: Visa[]
  bankAccounts: BankAccount[]
  taxProfile: TaxProfile | null
  socialInsuranceProfile: SocialInsuranceProfile | null
  militaryServiceProfile: MilitaryServiceProfile | null
  educations: Education[]
  careers: CareerHistory[]
  certifications: Certification[]
  skills: EmployeeSkill[]
  resumes: ResumeDocument[]
  attendanceSetting: AttendanceSetting | null
  workSchedule: WorkSchedule | null
  managerRelationship: ManagerRelationship | null
  assignmentHistory: Assignment[]
  compensationHistory: CompensationSnapshot[]
  personnelEvents: PersonnelEvent[]
}

export interface PayrollDependentInfo {
  employmentId: string
  asOfDate: string
  dependents: Dependent[]
  basicDeductionCount: number
  childDeductionCount: number
}

export interface SeedBundle {
  company: Company
  organizations: Organization[]
  persons: Person[]
  addresses: Address[]
  dependents: Dependent[]
  visas: Visa[]
  bankAccounts: BankAccount[]
  employments: Employment[]
  assignments: Assignment[]
  compensations: CompensationSnapshot[]
  taxProfiles: TaxProfile[]
  socialInsuranceProfiles: SocialInsuranceProfile[]
  militaryServiceProfiles: MilitaryServiceProfile[]
  educations: Education[]
  careers: CareerHistory[]
  certifications: Certification[]
  skills: EmployeeSkill[]
  resumes: ResumeDocument[]
  workSchedules: WorkSchedule[]
  attendanceSettings: AttendanceSetting[]
  managerRelationships: ManagerRelationship[]
  personnelEvents: PersonnelEvent[]
  auditLogs: AuditLog[]
  payrollRuns: PayrollRun[]
  payrollEntries: PayrollEntry[]
  payrollResults: PayrollResult[]
  attendanceMonthlySummaries: AttendanceMonthlySummary[]
  annualLeaveLedgers: AnnualLeaveLedger[]
  dailyWorkers: DailyWorker[]
  dailyWorkRecords: DailyWorkRecord[]
  retirementSettlements: RetirementSettlement[]
  yearEndTaxCases: YearEndTaxCase[]
  payrollItemMasters: PayrollItemMaster[]
  attendanceDailyRecords?: AttendanceDailyRecord[]
  leaveCases?: LeaveCase[]
  payrollSettingsHistory?: {id:string; items:PayrollItemMaster[]}[]
}

export interface PersonnelActionInput {
  employmentId: string
  eventType: PersonnelEventType
  effectiveDate: string
  value: string
  reason: string
}

export interface DependentInput {
  id?: string
  employmentId: string
  relation: Dependent['relation']
  name: string
  birthDate: string
  cohabitation: boolean
  disabilityStatus: boolean
  basicDeductionEligible: boolean
  childDeductionEligible: boolean
  effectiveStartDate: string
  effectiveEndDate: string | null
}

export interface ManagerRelationshipInput {
  employmentId: string
  directManagerId: string | null
  hrManagerId: string | null
  leaveApproverId: string | null
  attendanceApproverId: string | null
  performanceReviewerId: string | null
}

export interface DatabaseExport {
  exportedAt: string
  schemaVersion: number
  data: SeedBundle
}

// ==================================================
// Payroll v0.5
// ==================================================
export type PayrollRunStatus = 'DRAFT' | 'CALCULATED' | 'VALIDATED' | 'CONFIRMED' | 'CLOSED' | 'PAID'
export type PayrollEntryStatus = 'DRAFT' | 'CALCULATED' | 'ERROR'

export interface FilingFormValues {incomeName:string;incomeCode:string;headcount:number;grossPay:number;incomeTax:number;localIncomeTax:number;note:string;updatedAt?:string;editReason?:string}
export interface PayrollRun {
  filingFormOverrides?: FilingFormValues
  id: string
  companyId: string
  period: string // YYYY-MM
  payDate: string
  status: PayrollRunStatus
  ruleVersion: string
  note: string
  createdAt: string
  calculatedAt: string | null
  validatedAt: string | null
  confirmedAt: string | null
  paidAt?: string | null
  closedAt: string | null
  itemOverrides?: Record<string, boolean>
  itemSnapshot?: PayrollItemMaster[]
  attendanceStale?: boolean
}

/** Payroll Run 시점의 입력 Snapshot. 마감 후 원본 HR Master 변경에 영향을 받지 않는다. */
export interface PayrollEntry {
  insuranceOverrides?: InsuranceOverrides
  id: string
  runId: string
  employmentId: string
  employeeNumberSnapshot: string
  employeeNameSnapshot: string
  organizationNameSnapshot: string
  gradeSnapshot: string
  titleSnapshot: string
  jobSnapshot: string
  hireDateSnapshot: string
  terminationDateSnapshot: string | null
  annualSalarySnapshot: number
  monthlyBasePay: number
  prorationRate: number
  taxableAllowance: number
  nonTaxableAllowance: number
  overtimePay: number
  bonus: number
  retroPay: number
  otherEarnings: number
  unpaidDeduction: number
  otherDeductions: number
  pensionBaseMonthly: number
  healthBaseMonthly: number
  employmentInsuranceBaseMonthly: number
  nationalPensionEligible: boolean
  healthInsuranceEligible: boolean
  employmentInsuranceEligible: boolean
  industrialAccidentInsuranceEligible: boolean
  basicDeductionCount: number
  childDeductionCount: number
  incomeTaxManual: number
  itemAmounts?: Record<string, number>
  attendanceRevision?: number
  memo: string
  status: PayrollEntryStatus
  updatedAt: string
}

export interface PayrollResult {
  id: string
  runId: string
  employmentId: string
  basePay: number
  taxableEarnings: number
  nonTaxableEarnings: number
  grossPay: number
  nationalPension: number
  healthInsurance: number
  longTermCareInsurance: number
  employmentInsurance: number
  incomeTax: number
  localIncomeTax: number
  otherDeductions: number
  totalDeductions: number
  netPay: number
  calculatedAt: string
  ruleVersion: string
  warnings: string[]
  errors: string[]
}

export type InsuranceOverrides=Partial<Pick<PayrollResult,'nationalPension'|'healthInsurance'|'longTermCareInsurance'|'employmentInsurance'|'localIncomeTax'>>
export interface PayrollEntryInput {
  monthlyBasePay?: number
  insuranceOverrides?: InsuranceOverrides
  id?: string
  runId: string
  employmentId: string
  prorationRate: number
  taxableAllowance: number
  nonTaxableAllowance: number
  overtimePay: number
  bonus: number
  retroPay: number
  otherEarnings: number
  unpaidDeduction: number
  otherDeductions: number
  pensionBaseMonthly: number
  healthBaseMonthly: number
  employmentInsuranceBaseMonthly: number
  incomeTaxManual: number
  itemAmounts?: Record<string, number>
  attendanceRevision?: number
  memo: string
}

export interface PayrollRunInput {
  period: string
  payDate: string
  note: string
}

export interface PayrollRunSummary {
  run: PayrollRun
  employeeCount: number
  grossPay: number
  deductions: number
  netPay: number
  warningCount: number
  errorCount: number
}

export type AttendanceActivity='WORK'|'ANNUAL_LEAVE'|'OFF'|'SICK'|'ABSENT'|'MATERNITY'|'TRAINING'|'PRENATAL'|'FAMILY_CARE'|'PARENTAL'|'SPOUSE_BIRTH'|'FERTILITY'
export interface AttendanceDailyRecord {
  payTreatment?: 'PAID'|'UNPAID'|'BENEFIT'
  offKind?: 'PERSONAL'|'WEEKEND'|'STATUTORY'
  note?:string
  paidCreditHours?:number
  attachments?:import("./attachments").StoredFile[]
  activity?: AttendanceActivity
  nonWorkKind?: 'ANNUAL_LEAVE'|'OFF'|'SICK'
  nonWorkStartTime?: string
  nonWorkEndTime?: string
  nonWorkNextDay?: boolean
  leaveHours?: number
  id: string
  employmentId: string
  workDate: string
  startTime: string
  endTime: string
  endNextDay: boolean
  breakStart: string
  breakMinutes: number
  holiday: boolean
  absence: boolean
  workedHours: number
  overtimeHours: number
  nightHours: number
  holidayHours: number
  holidayOvertimeHours: number
  updatedAt: string
  updatedBy: string
  editReason: string
}
export type LeaveKind = 'PARENTAL' | 'MATERNITY' | 'FAMILY_CARE' | 'SICK' | 'OCCUPATIONAL' | 'PERSONAL' | 'UNCLASSIFIED'
export interface LeaveCase {
  id: string
  employmentId: string
  kind: LeaveKind
  startDate: string
  endDate: string | null
  companyPayRate: number
  pensionExceptionApproved: boolean
  healthDeferred: boolean
  healthPremiumOverride: number | null
  employmentBaseOverride: number | null
  benefitAmount: number
  averageWageExcluded: boolean
  yearEndNote: string
  note: string
  updatedAt: string
}
