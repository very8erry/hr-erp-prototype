import {calculateDailyWorkRecord} from './dailyWorkerRules'
import type { FilingFormValues,RetirementSettlement,YearEndTaxCase,AnnualLeaveLedger, AttendanceDailyRecord, AttendanceMonthlySummary, LeaveCase, DailyWorkRecord, DailyWorker, DailyWorkerInput, PayrollEntryInput, PayrollItemMaster, PayrollRunInput, PayrollRunStatus } from '../../domain/types'
import type { PayrollRepository,ConfirmSection } from './payrollRepository'

export class PayrollService {
  recruiting(){return this.repository.recruiting()}
  saveRecruiting(state:import("../recruiting/recruiting").RecruitingState){return this.repository.saveRecruiting(state)}
  companyInfo(){return this.repository.companyInfo()}
  saveCompanyInfo(info:import('./companyInfo').CompanyInfo){return this.repository.saveCompanyInfo(info)}
  settlements(){return this.repository.settlements()}
  saveSettlements(rows:import('./companyInfo').SettlementSetting[]){return this.repository.saveSettlements(rows)}
  isAttendanceClosed(period:string){return this.repository.isAttendanceClosed(period)}
  closeAttendance(period:string){return this.repository.closeAttendance(period)}
  closeDaily(period:string){return this.repository.closeDaily(period)}
  dailyClosedPeriods(){return this.repository.dailyClosedPeriods()}
  ensureDemoHistory(){return this.repository.ensureDemoHistory()}

  constructor(private readonly repository: PayrollRepository) {}

  confirmRecords(section:ConfirmSection,ids:string[]){return this.repository.confirmRecords(section,ids)}
  dailyAttendance(){return this.repository.listAttendanceDailyRecords()}
  leaveCases(){return this.repository.listLeaveCases()}
  saveLeaveCase(row:LeaveCase){return this.repository.saveLeaveCase(row)}
  saveAttendanceBatch(rows:AttendanceMonthlySummary[],daily:AttendanceDailyRecord[],reason:string){return this.repository.saveAttendanceBatch(rows,daily,reason)}
  saveSettings(items:PayrollItemMaster[]){return this.repository.savePayrollSettings(items)}
  restoreSettings(){return this.repository.restorePayrollSettings()}
  saveFilingForm(runId:string,values:FilingFormValues,reason:string){return this.repository.saveFilingForm(runId,values,reason)}
  runs() { return this.repository.listPayrollRuns() }
  run(id: string) { return this.repository.getPayrollRun(id) }
  entries(runId: string) { return this.repository.listPayrollEntries(runId) }
  results(runId: string) { return this.repository.listPayrollResults(runId) }
  attendance() { return this.repository.listAttendanceMonthlySummaries() }
  saveAnnualLeave(rows:AnnualLeaveLedger[],reason:string){return this.repository.saveAnnualLeaveBatch(rows,reason)}
  annualLeave() { return this.repository.listAnnualLeaveLedgers() }
  dailyWorkers() { return this.repository.listDailyWorkers() }
  dailyWorkRecords() { return this.repository.listDailyWorkRecords() }
  saveRetirement(rows:RetirementSettlement[],reason:string){return this.repository.saveRetirementBatch(rows,reason)}
  saveYearEnd(rows:YearEndTaxCase[],reason:string){return this.repository.saveYearEndBatch(rows,reason)}
  retirementSettlements() { return this.repository.listRetirementSettlements() }
  calculateRetirement(employmentId:string) { return this.repository.calculateRetirementSettlement(employmentId) }
  yearEndTaxCases() { return this.repository.listYearEndTaxCases() }
  itemMasters() { return this.repository.listPayrollItemMasters() }
  updateItemMaster(item:PayrollItemMaster) { return this.repository.updatePayrollItemMaster(item) }

  async createRun(input: PayrollRunInput) {
    if (!/^\d{4}-\d{2}$/.test(input.period)) throw new Error('급여 귀속월을 선택하세요.')
    if (!input.payDate) throw new Error('지급일을 입력하세요.')
    return this.repository.createPayrollRun(input)
  }

  deleteRun(id: string) { return this.repository.deletePayrollRun(id) }
  addEntry(runId:string, employmentId:string) { return this.repository.addPayrollEntry(runId,employmentId) }

  async saveEntries(inputs:PayrollEntryInput[]){return this.repository.savePayrollEntriesBatch(inputs)}
  async saveEntry(input: PayrollEntryInput) {
    const numeric = [...Object.values(input.insuranceOverrides??{}),input.monthlyBasePay??0,input.prorationRate,input.taxableAllowance,input.nonTaxableAllowance,input.overtimePay,input.bonus,input.retroPay,input.otherEarnings,input.unpaidDeduction,input.otherDeductions,input.pensionBaseMonthly,input.healthBaseMonthly,input.employmentInsuranceBaseMonthly,input.incomeTaxManual]
    if (Object.values(input.itemAmounts??{}).some(v=>!Number.isFinite(v)||v<0)) throw new Error('수당은 0 이상의 숫자여야 합니다.')
    if (numeric.some((v)=>!Number.isFinite(v) || v < 0)) throw new Error('급여 입력값은 0 이상의 숫자여야 합니다.')
    if (input.prorationRate > 1) throw new Error('일할계산 비율은 1을 초과할 수 없습니다.')
    return this.repository.upsertPayrollEntry(input)
  }

  deleteEntry(runId:string, employmentId:string) { return this.repository.deletePayrollEntry(runId,employmentId) }
  async syncAttendance(runId:string){
    const run=await this.repository.getPayrollRun(runId);if(!run)throw new Error('급여월을 찾을 수 없습니다.')
    const [entries,summaries,daily,items]=await Promise.all([this.entries(runId),this.attendance(),this.dailyAttendance(),this.itemMasters()])
    for(const e of entries){
      const a=summaries.find(r=>r.employmentId===e.employmentId&&r.period===run.period);if(!a)continue
      const extraOrdinary=Object.entries(e.itemAmounts??{}).reduce((sum,[code,v])=>sum+(items.find(i=>i.code===code)?.ordinaryWage?v:0),0)
      const hourly=(e.monthlyBasePay+extraOrdinary)/209
      const over8=daily.filter(r=>r.employmentId===e.employmentId&&r.workDate.startsWith(run.period)).reduce((s,r)=>s+r.holidayOvertimeHours,0)
      await this.saveEntry({...e,overtimePay:Math.round(hourly*a.overtimeHours*1.5),itemAmounts:{...e.itemAmounts,P121:Math.round(hourly*a.nightHours*0.5),P122:Math.round(hourly*(a.holidayHours*1.5+over8*0.5))},memo:`${e.memo} / 근태 ${a.revision??0}차: 통상시급 ${Math.round(hourly)}원, 연장 ${a.overtimeHours}h, 야간 ${a.nightHours}h, 휴일 ${a.holidayHours}h, 휴일8h초과 ${over8}h (월209h 기준 검토)`})
    }
  }
  calculate(runId:string, overrides?:Record<string,boolean>|null) { return this.repository.calculatePayrollRun(runId,overrides) }
  validate(runId:string) { return this.repository.validatePayrollRun(runId) }
  status(runId:string,status:PayrollRunStatus) { return this.repository.setPayrollRunStatus(runId,status) }
  saveDailyWorkers(workers:DailyWorker[]){return this.repository.saveDailyWorkersBatch(workers)}
  async saveDailyWorker(worker:DailyWorker) {
    if (!worker.job.trim()) throw new Error('직무를 입력하세요.')
    if (!Number.isFinite(worker.dailyRate) || worker.dailyRate < 0) throw new Error('일급은 0 이상의 숫자여야 합니다.')
    if (worker.endDate && worker.endDate < worker.startDate) throw new Error('근무 종료일은 시작일보다 빠를 수 없습니다.')
    return this.repository.upsertDailyWorker(worker)
  }
  async createDailyWorker(input:DailyWorkerInput) {
    if (!input.name.trim()) throw new Error('성명을 입력하세요.')
    if (!input.organizationId) throw new Error('조직을 선택하세요.')
    if (!Number.isFinite(input.dailyRate) || input.dailyRate < 0) throw new Error('일급은 0 이상의 숫자여야 합니다.')
    if (input.endDate && input.endDate < input.startDate) throw new Error('근무 종료일은 시작일보다 빠를 수 없습니다.')
    return this.repository.createDailyWorker(input)
  }
  deleteDailyWorker(id:string) { return this.repository.deleteDailyWorker(id) }
  async saveDailyWorkRecords(rows:DailyWorkRecord[]) {
    const workers=await this.repository.listDailyWorkers();const seen=new Set<string>()
    const records=rows.map(row=>{
      const worker=workers.find(v=>v.id===row.dailyWorkerId)
      if(!worker)throw new Error('일용직 정보를 찾을 수 없습니다.')
      if(!/^\d{4}-\d{2}-\d{2}$/.test(row.workDate)||!Number.isFinite(Date.parse(row.workDate))||new Date(row.workDate).toISOString().slice(0,10)!==row.workDate)throw new Error('근무일을 확인하세요.')
      if(row.workDate<worker.startDate||(worker.endDate&&row.workDate>worker.endDate))throw new Error('근무일이 일용직 근무기간 밖에 있습니다.')
      if(!Number.isFinite(row.hours)||row.hours<=0||row.hours>24)throw new Error('근무시간은 0시간 초과 24시간 이하여야 합니다.')
      const calculated=calculateDailyWorkRecord(worker,row.workDate,row.hours,row.note,row)
      if(seen.has(calculated.id))throw new Error('중복된 일용 근무일입니다.');seen.add(calculated.id)
      return {...row,...calculated}
    })
    await this.repository.saveDailyWorkRecordsBatch(records)
    return records
  }
  async saveDailyWorkRecord(row:DailyWorkRecord) {return (await this.saveDailyWorkRecords([row]))[0]}
  deleteDailyWorkRecord(id:string) { return this.repository.deleteDailyWorkRecord(id) }
}
