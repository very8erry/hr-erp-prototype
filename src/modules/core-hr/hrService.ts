import type {
  DatabaseExport,
  DependentInput,
  EmployeeView,
  ManagerRelationshipInput,
  MilitaryServiceProfile,
  PersonnelActionInput,
} from '../../domain/types'
import type { HrRepository } from '../../infrastructure/repositories/hrRepository'

export class HrService {
  constructor(private readonly repository: HrRepository) {}

  initialize() { return this.repository.initialize() }
  company() { return this.repository.getCompany() }
  employees() { return this.repository.listEmployees() }
  employee(id: string) { return this.repository.getEmployee(id) }
  employeeMaster(id: string) { return this.repository.getEmployeeMaster(id) }
  organizations() { return this.repository.listOrganizations() }
  events(employmentId?: string) { return this.repository.listPersonnelEvents(employmentId) }
  auditLogs() { return this.repository.listAuditLogs() }
  resetDemo() { return this.repository.resetDemo() }
  exportDatabase() { return this.repository.exportDatabase() }
  importDatabase(payload: DatabaseExport) { return this.repository.importDatabase(payload) }
  dependentsAt(employmentId: string, date: string) { return this.repository.getDependentsAtDate(employmentId,date) }
  payrollDependentInfo(employmentId: string, date: string) { return this.repository.getPayrollDependentInfo(employmentId,date) }

  async saveDependent(input: DependentInput) {
    if (!input.name.trim()) throw new Error('가족 성명을 입력하세요.')
    if (!input.birthDate) throw new Error('생년월일을 입력하세요.')
    if (!input.effectiveStartDate) throw new Error('적용 시작일을 입력하세요.')
    if (input.effectiveEndDate && input.effectiveEndDate < input.effectiveStartDate) throw new Error('적용 종료일은 시작일보다 빠를 수 없습니다.')
    return this.repository.upsertDependent(input)
  }

  async saveManagerRelationship(input: ManagerRelationshipInput) {
    const values=[input.directManagerId,input.hrManagerId,input.leaveApproverId,input.attendanceApproverId,input.performanceReviewerId]
    if (values.some((id)=>id===input.employmentId)) throw new Error('본인을 승인자 또는 관리자에 지정할 수 없습니다.')
    return this.repository.updateManagerRelationship(input)
  }


  async saveMilitaryServiceProfile(profile: MilitaryServiceProfile) {
    if (profile.serviceStartDate && profile.serviceEndDate && profile.serviceEndDate < profile.serviceStartDate) {
      throw new Error('복무 종료일은 시작일보다 빠를 수 없습니다.')
    }
    return this.repository.updateMilitaryServiceProfile(profile)
  }

  async createPersonnelAction(input: PersonnelActionInput) {
    if (!input.reason.trim()) throw new Error('발령 사유를 입력하세요.')
    if (!input.value.trim()) throw new Error('변경값을 선택하거나 입력하세요.')
    return this.repository.createPersonnelAction(input)
  }

  static summary(rows: EmployeeView[]) {
    const active = rows.filter((e) => e.status === 'ACTIVE').length
    const leave = rows.filter((e) => e.status === 'LEAVE').length
    const terminated = rows.filter((e) => e.status === 'TERMINATED').length
    const foreign = rows.filter((e) => e.domesticForeignType === 'FOREIGN').length
    const annualPayroll = rows.filter((e) => e.status !== 'TERMINATED').reduce((sum, e) => sum + e.annualSalary, 0)
    return { total: rows.length, active, leave, terminated, foreign, annualPayroll }
  }
}
