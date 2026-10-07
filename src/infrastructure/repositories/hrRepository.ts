import type {
  AuditLog,
  Company,
  DatabaseExport,
  Dependent,
  DependentInput,
  EmployeeMasterDetail,
  EmployeeView,
  ManagerRelationship,
  ManagerRelationshipInput,
  MilitaryServiceProfile,
  Organization,
  PayrollDependentInfo,
  PersonnelActionInput,
  PersonnelEvent,
} from '../../domain/types'

export interface HrRepository {
  initialize(): Promise<void>
  getCompany(): Promise<Company>
  listEmployees(): Promise<EmployeeView[]>
  getEmployee(employmentId: string): Promise<EmployeeView | null>
  getEmployeeMaster(employmentId: string): Promise<EmployeeMasterDetail | null>
  getDependentsAtDate(employmentId: string, date: string): Promise<Dependent[]>
  getPayrollDependentInfo(employmentId: string, date: string): Promise<PayrollDependentInfo>
  upsertDependent(input: DependentInput): Promise<Dependent>
  updateManagerRelationship(input: ManagerRelationshipInput): Promise<ManagerRelationship>
  updateMilitaryServiceProfile(profile: MilitaryServiceProfile): Promise<MilitaryServiceProfile>
  listOrganizations(): Promise<Organization[]>
  listPersonnelEvents(employmentId?: string): Promise<PersonnelEvent[]>
  createPersonnelAction(input: PersonnelActionInput): Promise<PersonnelEvent>
  listAuditLogs(): Promise<AuditLog[]>
  resetDemo(): Promise<void>
  exportDatabase(): Promise<DatabaseExport>
  importDatabase(payload: DatabaseExport): Promise<void>
}
