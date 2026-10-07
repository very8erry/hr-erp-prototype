import type {
  FilingFormValues,
  AttendanceDailyRecord,
  LeaveCase,
  AnnualLeaveLedger,
  AttendanceMonthlySummary,
  DailyWorkRecord,
  DailyWorker,
  DailyWorkerInput,
  PayrollEntry,
  PayrollEntryInput,
  PayrollItemMaster,
  PayrollResult,
  PayrollRun,
  PayrollRunInput,
  PayrollRunStatus,
  RetirementSettlement,
  YearEndTaxCase,
} from '../../domain/types'

export type ConfirmSection='attendance'|'annual'|'daily'|'retirement'|'yearend'
export interface PayrollRepository {
  recruiting():Promise<import("../recruiting/recruiting").RecruitingState>
  saveRecruiting(state:import("../recruiting/recruiting").RecruitingState):Promise<void>
  companyInfo():Promise<import('./companyInfo').CompanyInfo>
  saveCompanyInfo(info:import('./companyInfo').CompanyInfo):Promise<void>
  settlements():Promise<import('./companyInfo').SettlementSetting[]>
  saveSettlements(rows:import('./companyInfo').SettlementSetting[]):Promise<void>
  isAttendanceClosed(period:string):Promise<boolean>
  closeAttendance(period:string):Promise<void>
  closeDaily(period:string):Promise<void>
  dailyClosedPeriods():Promise<Record<string,string>>
  ensureDemoHistory():Promise<void>

  confirmRecords(section:ConfirmSection,ids:string[]):Promise<void>
  listAttendanceDailyRecords():Promise<AttendanceDailyRecord[]>
  listLeaveCases():Promise<LeaveCase[]>
  saveLeaveCase(row:LeaveCase):Promise<void>
  saveAttendanceBatch(summaries:AttendanceMonthlySummary[],daily:AttendanceDailyRecord[],reason:string):Promise<void>
  savePayrollSettings(items:PayrollItemMaster[]):Promise<void>
  restorePayrollSettings():Promise<void>
  savePayrollEntriesBatch(inputs:PayrollEntryInput[]):Promise<void>
  saveFilingForm(runId:string,values:FilingFormValues,reason:string):Promise<void>
  listPayrollRuns(): Promise<PayrollRun[]>
  getPayrollRun(runId: string): Promise<PayrollRun | null>
  createPayrollRun(input: PayrollRunInput): Promise<PayrollRun>
  deletePayrollRun(runId: string): Promise<void>
  listPayrollEntries(runId: string): Promise<PayrollEntry[]>
  getPayrollEntry(runId: string, employmentId: string): Promise<PayrollEntry | null>
  addPayrollEntry(runId: string, employmentId: string): Promise<PayrollEntry>
  upsertPayrollEntry(input: PayrollEntryInput): Promise<PayrollEntry>
  deletePayrollEntry(runId: string, employmentId: string): Promise<void>
  listPayrollResults(runId: string): Promise<PayrollResult[]>
  calculatePayrollRun(runId: string, overrides?:Record<string,boolean>|null): Promise<PayrollResult[]>
  validatePayrollRun(runId: string): Promise<{ warnings: number; errors: number }>
  setPayrollRunStatus(runId: string, status: PayrollRunStatus): Promise<PayrollRun>
  listAttendanceMonthlySummaries(): Promise<AttendanceMonthlySummary[]>
  saveAnnualLeaveBatch(rows:AnnualLeaveLedger[],reason:string):Promise<void>
  listAnnualLeaveLedgers(): Promise<AnnualLeaveLedger[]>
  listDailyWorkers(): Promise<DailyWorker[]>
  listDailyWorkRecords(): Promise<DailyWorkRecord[]>
  saveDailyWorkersBatch(workers:DailyWorker[]):Promise<void>
  upsertDailyWorker(worker: DailyWorker): Promise<DailyWorker>
  createDailyWorker(input: DailyWorkerInput): Promise<DailyWorker>
  deleteDailyWorker(workerId: string): Promise<void>
  saveDailyWorkRecordsBatch(records:DailyWorkRecord[]):Promise<void>
  upsertDailyWorkRecord(record: DailyWorkRecord): Promise<DailyWorkRecord>
  deleteDailyWorkRecord(recordId: string): Promise<void>
  saveRetirementBatch(rows:RetirementSettlement[],reason:string):Promise<void>
  saveYearEndBatch(rows:YearEndTaxCase[],reason:string):Promise<void>
  listRetirementSettlements(): Promise<RetirementSettlement[]>
  calculateRetirementSettlement(employmentId: string): Promise<RetirementSettlement>
  listYearEndTaxCases(): Promise<YearEndTaxCase[]>
  listPayrollItemMasters(): Promise<PayrollItemMaster[]>
  updatePayrollItemMaster(item: PayrollItemMaster): Promise<PayrollItemMaster>
}
