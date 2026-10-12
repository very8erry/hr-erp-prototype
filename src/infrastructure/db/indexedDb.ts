import {seedStaffNotices} from './staffNoticesSeed'
import {seedWorkRules} from './workRulesSeed'
import {upgradeLemonOperations,seedLemonRetirement,repairLemonOccupationMapping} from './lemonUpgrade'
import {validateConnection} from '../../modules/recruiting/integrationValidation'
import {retirementByPlan} from '../../modules/payroll/retirementCalculation'
import {correctedDemoDay,repairDemoOperations,summaryFromDaily} from './operationsUpgrade'
import {operationStores,calendarSeed,validateOperation,exceptionEmployeeIds,issueForAttendance,dayPolicy,occupationCode,type OperationsData,type OperationStore,type CalendarEvent,type OccupationMapping} from '../../modules/operations/operations'
import {upgradeRecruiting,saveEvaluation,saveTemplate,saveOffer,decideCandidate,type OnboardingInput} from '../../modules/recruiting/evaluations'
import {selectionAuditChanges} from '../../modules/recruiting/selectionAudit'
import {reviewNames,demoNames,type EmployeeRegistration} from '../../modules/core-hr/nameValidation'
import {demoDay,scenarioIds,holidays2026} from '../../fixtures/scenarios'
import {simplifiedTax} from '../../modules/payroll/ntsTax'
import {recruitingSeed,type RecruitingState} from '../../modules/recruiting/recruiting'
import {validateItemCalculation} from '../../modules/payroll/itemCalculation'
import type {
  FilingFormValues,
  AttendanceDailyRecord,
  LeaveCase,
  Address,
  Assignment,
  AttendanceSetting,
  AttendanceMonthlySummary,
  AnnualLeaveLedger,
  AuditLog,
  BankAccount,
  CareerHistory,
  Certification,
  Company,
  CompensationSnapshot,
  DatabaseExport,
  Dependent,
  DependentInput,
  Education,
  EmployeeMasterDetail,
  EmployeeSkill,
  EmployeeView,
  Employment,
  ManagerRelationship,
  MilitaryServiceProfile,
  ManagerRelationshipInput,
  Organization,
  PayrollDependentInfo,
  PayrollEntry,
  PayrollEntryInput,
  PayrollResult,
  PayrollRun,
  PayrollRunInput,
  PayrollRunStatus,
  PayrollItemMaster,
  Person,
  DailyWorker,
  DailyWorkerInput,
  DailyWorkRecord,
  RetirementSettlement,
  YearEndTaxCase,
  PersonnelActionInput,
  PersonnelEvent,
  ResumeDocument,
  SeedBundle,
  SocialInsuranceProfile,
  TaxProfile,
  Visa,
  WorkSchedule,
} from '../../domain/types'
import {defaultCompanyInfo,defaultSettlements,seoulDate,type CompanyInfo,type SettlementSetting} from '../../modules/payroll/companyInfo'
import {calculateDailyWorkRecord} from '../../modules/payroll/dailyWorkerRules'
import { extraItems } from '../../modules/payroll/itemDefaults'
import { calculateAttendanceDay } from '../../modules/attendance/timeRules'
import { createSeedBundle } from '../../fixtures/seed'
import type { HrRepository } from '../repositories/hrRepository'
import type { PayrollRepository } from '../../modules/payroll/payrollRepository'
import { calculatePayrollEntry, PAYROLL_RULE_VERSION } from '../../modules/payroll/payrollRules'
import { DB_NAME, DB_VERSION, SCHEMA_VERSION, SEED_VERSION, STORES, type StoreName } from './config'
import { requestToPromise, transactionDone as txDone } from './idbUtils'
import { isDatabaseSeeded, markCurrentDbVersion, readTransientV032Bundle, runDataMigrations, runSeedMigrations, upgradeDatabaseStructure } from './migrations'

let sharedOpenPromise: Promise<IDBDatabase> | null = null

function openSharedDatabase(): Promise<IDBDatabase> {
  if (sharedOpenPromise) return sharedOpenPromise

  sharedOpenPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    let blocked = false

    request.onupgradeneeded = (event) => {
      upgradeDatabaseStructure(request.result, request.transaction!, event.oldVersion)
    }

    request.onblocked = () => {
      blocked = true
      reject(new Error('데이터베이스 업그레이드가 다른 탭의 이전 연결에 의해 차단되었습니다. 이 앱의 다른 localhost 탭을 닫은 뒤 새로고침하세요. 데이터 삭제는 필요하지 않습니다.'))
    }

    request.onerror = () => reject(request.error ?? new Error('IndexedDB를 열 수 없습니다.'))

    request.onsuccess = () => {
      const db = request.result
      if (blocked) {
        db.close()
        return
      }
      db.onversionchange = () => {
        db.close()
        sharedOpenPromise = null
      }
      db.onclose = () => {
        sharedOpenPromise = null
      }
      resolve(db)
    }
  }).catch((error) => {
    sharedOpenPromise = null
    throw error
  })

  return sharedOpenPromise
}

function dayBefore(date: string): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

function today(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function inEffect(start: string, end: string | null, date: string): boolean {
  return start <= date && (end === null || end >= date)
}

function monthStart(period: string): string { return `${period}-01` }
function monthEnd(period: string): string {
  const [year,month] = period.split('-').map(Number)
  return new Date(Date.UTC(year,month,0)).toISOString().slice(0,10)
}
function calendarProration(hireDate: string, terminationDate: string | null, period: string): number {
  const start = monthStart(period); const end = monthEnd(period)
  const activeStart = hireDate > start ? hireDate : start
  const activeEnd = terminationDate && terminationDate < end ? terminationDate : end
  if (activeStart > activeEnd) return 0
  const daysInMonth = Number(end.slice(8,10))
  const startDay = Number(activeStart.slice(8,10)); const endDay = Number(activeEnd.slice(8,10))
  return Math.max(0, Math.min(1, (endDay - startDay + 1) / daysInMonth))
}

export class IndexedDbHrRepository implements HrRepository, PayrollRepository {
  private db: IDBDatabase | null = null
  private initializePromise: Promise<void> | null = null

  initialize(): Promise<void> {
    if (!this.initializePromise) {
      this.initializePromise = this.initializeOnce().catch((error) => {
        this.db = null
        this.initializePromise = null
        throw error
      })
    }
    return this.initializePromise
  }

  private async initializeOnce(): Promise<void> {
    this.db = await openSharedDatabase()

    if (!(await isDatabaseSeeded(this.db))) {
      const transientV032 = await readTransientV032Bundle()
      await this.seed(transientV032 ?? createSeedBundle())
      if (transientV032) {
        await this.put(STORES.auditLogs, {
          id: `AUD-RECOVER-${crypto.randomUUID()}`,
          occurredAt: new Date().toISOString(),
          actor: 'SYSTEM',
          action: 'RECOVER_TRANSIENT_DATABASE',
          entityType: 'DATABASE',
          entityId: transientV032.company.id,
          detail: 'V0.3.2 임시 데이터베이스의 데이터를 canonical IndexedDB로 복구했습니다.',
        } satisfies AuditLog)
      }
    } else {
      await runDataMigrations(this.db)
      await runSeedMigrations(this.db)
      await markCurrentDbVersion(this.db)
    }


    await this.persistSelectionUpgrade()
    await this.initializeOperations()
    await upgradeLemonOperations(this.requireDb(),await this.listEmployees());await repairLemonOccupationMapping(this.requireDb(),await this.listEmployees());await seedWorkRules(this.requireDb());await seedStaffNotices(this.requireDb())
    await this.applyDueEvents()
  }

  async saveResume(employmentId:string,file:import('../../domain/attachments').StoredFile):Promise<void>{if(!await this.getEmployee(employmentId))throw new Error('직원을 찾을 수 없습니다.');if(file.size>10*1024*1024||!file.dataUrl.startsWith('data:'))throw new Error('첨부파일을 확인하세요.');const resumes=(await this.getAll<ResumeDocument>(STORES.resumes)).filter(r=>r.employmentId===employmentId),row:ResumeDocument={id:crypto.randomUUID(),employmentId,fileName:file.name,version:Math.max(0,...resumes.map(r=>r.version))+1,uploadedAt:new Date().toISOString(),uploadedBy:'HR_ADMIN',status:'CURRENT',storedFile:file};const tx=this.requireDb().transaction([STORES.resumes,STORES.auditLogs],'readwrite'),done=txDone(tx);resumes.filter(r=>r.status==='CURRENT').forEach(r=>tx.objectStore(STORES.resumes).put({...r,status:'ARCHIVED'}));tx.objectStore(STORES.resumes).put(row);tx.objectStore(STORES.auditLogs).put({id:crypto.randomUUID(),occurredAt:row.uploadedAt,actor:'HR_ADMIN',action:'UPLOAD_RESUME',entityType:'RESUME',entityId:row.id,detail:JSON.stringify({employmentId,fileName:file.name,size:file.size,version:row.version})});await done}
  async editMaster(input:import('../../domain/masterEdit').MasterEdit):Promise<void>{
    if(!input.reason.trim())throw new Error('수정 사유가 필요합니다.');const detail=await this.getEmployeeMaster(input.employmentId);if(!detail)throw new Error('직원을 찾을 수 없습니다.');const {masterFields}=await import('../../domain/masterEdit');const fields:readonly string[]=masterFields[input.section];if(!fields||Object.keys(input.values).some(k=>!fields.includes(k)))throw new Error('수정할 수 없는 필드입니다.');const old=input.section==='occupation'?detail.assignmentHistory.find(a=>!a.effectiveTo):input.section==='person'?detail.person:input.section==='employment'?await this.getOne<Employment>(STORES.employments,input.employmentId):input.section==='address'?detail.address:input.section==='bank'?detail.bankAccounts.find(r=>!r.effectiveEndDate&&r.isPayrollAccount):input.section==='tax'?detail.taxProfile:detail.socialInsuranceProfile;if(!old)throw new Error('현재 원천정보가 없습니다. 해당 등록 기능을 먼저 사용하세요.');const next={...old,...input.values} as Record<string,unknown>;for(const [key,value]of Object.entries(input.values)){if(typeof (old as unknown as Record<string,unknown>)[key]==='boolean'&&typeof value!=='boolean')throw new Error('참/거짓 값을 확인하세요.')}if(input.section==='person'&&(!String(next.fullName).trim()||!['M','F'].includes(String(next.gender))))throw new Error('이름·성별 값을 확인하세요.');if(input.section==='employment'&&(!/^\d{4}-\d{2}-\d{2}$/.test(String(next.hireDate))||next.terminationDate&&String(next.terminationDate)<String(next.hireDate)))throw new Error('입사·퇴사일을 확인하세요.');if(input.section==='occupation'&&next.occupationCodeManual&&!/^\d{3}$/.test(String(next.occupationCode)))throw new Error('수동 신고 직종코드는 3자리입니다.');const store=input.section==='occupation'?STORES.assignments:input.section==='person'?STORES.persons:input.section==='employment'?STORES.employments:input.section==='address'?STORES.addresses:input.section==='bank'?STORES.bankAccounts:input.section==='tax'?STORES.taxProfiles:STORES.socialInsuranceProfiles;const tx=this.requireDb().transaction([store,STORES.auditLogs],'readwrite'),done=txDone(tx);tx.objectStore(store).put(next);tx.objectStore(STORES.auditLogs).put({id:crypto.randomUUID(),occurredAt:new Date().toISOString(),actor:'HR_ADMIN',action:'EDIT_EMPLOYEE_MASTER',entityType:input.section,entityId:old.id,detail:JSON.stringify({reason:input.reason,before:old,after:next})});await done
  }
  async savePersonNames(id:string,names:{fullName:string;englishName:string;hanjaName:string},reviewed:boolean){
    const check=reviewNames(names.fullName,names.englishName,names.hanjaName);if(check.errors.length||check.warnings.length&&!reviewed)throw new Error([...check.errors,...check.warnings].join(' '));
    const person=await this.getOne<Person>(STORES.persons,id);if(!person)throw new Error('직원을 찾을 수 없습니다.');
    const tx=this.requireDb().transaction([STORES.persons,STORES.auditLogs],'readwrite');const done=txDone(tx);tx.objectStore(STORES.persons).put({...person,...names,fullName:names.fullName.trim()});tx.objectStore(STORES.auditLogs).put({id:crypto.randomUUID(),occurredAt:new Date().toISOString(),actor:'HR_ADMIN',action:'UPDATE_PERSON_NAMES',entityType:'PERSON',entityId:id,detail:'성명·영문명·한자명 검토 및 저장'});await done;
  }
  async registerEmployee(input:EmployeeRegistration){
    const check=reviewNames(input.fullName,input.englishName,input.hanjaName);if(check.errors.length||check.warnings.length&&!input.nameReviewed)throw new Error([...check.errors,...check.warnings].join(' '));
    if(!input.employeeNumber.trim()||!input.birthDate||!input.hireDate||input.birthDate>=input.hireDate||!Number.isFinite(input.annualSalary)||input.annualSalary<=0)throw new Error('사번·생년월일·입사일·연봉을 확인하세요.');
    if((await this.listEmployees()).some(e=>e.employeeNumber===input.employeeNumber.trim()))throw new Error('이미 등록된 사번입니다.');
    if(!(await this.listOrganizations()).some(o=>o.id===input.organizationId))throw new Error('조직을 선택하세요.');
    if(!!input.bankName!==!!input.accountNumberMasked)throw new Error('은행과 실습용 계좌를 함께 입력하세요.');
    const id='EMPLOY-'+crypto.randomUUID(),personId='PER-'+crypto.randomUUID(),stamp=new Date().toISOString();
    const person:Person={id:personId,fullName:input.fullName.trim(),englishName:input.englishName.trim(),hanjaName:input.hanjaName.trim(),birthDate:input.birthDate,gender:input.gender,domesticForeignType:'DOMESTIC',nationality:'대한민국',reportingNationality:'대한민국',syntheticIdentifier:'SYN-'+crypto.randomUUID(),profileImageUrl:null,mobile:input.mobile,phone:'',email:'',emergencyContactName:'',emergencyContactPhone:'',emergencyContactRelation:''};
    const tx=this.requireDb().transaction([STORES.persons,STORES.employments,STORES.assignments,STORES.compensations,STORES.bankAccounts,STORES.auditLogs],'readwrite'),done=txDone(tx);
    tx.objectStore(STORES.persons).put(person);tx.objectStore(STORES.employments).put({id,personId,employeeNumber:input.employeeNumber.trim(),hireDate:input.hireDate,terminationDate:null,employmentType:'REGULAR',status:input.hireDate>stamp.slice(0,10)?'PRE_HIRE':'ACTIVE'});
    tx.objectStore(STORES.assignments).put({id:crypto.randomUUID(),employmentId:id,organizationId:input.organizationId,grade:input.grade,title:'팀원',job:input.job,workLocation:'본사',effectiveFrom:input.hireDate,effectiveTo:null});tx.objectStore(STORES.compensations).put({id:crypto.randomUUID(),employmentId:id,annualSalary:input.annualSalary,effectiveFrom:input.hireDate,effectiveTo:null});
    if(input.bankName)tx.objectStore(STORES.bankAccounts).put({id:crypto.randomUUID(),employmentId:id,bankName:input.bankName,accountNumberMasked:input.accountNumberMasked,accountHolder:input.fullName.trim(),isPayrollAccount:true,effectiveStartDate:input.hireDate,effectiveEndDate:null});
    tx.objectStore(STORES.auditLogs).put({id:crypto.randomUUID(),occurredAt:stamp,actor:'HR_ADMIN',action:'REGISTER_EMPLOYEE',entityType:'EMPLOYMENT',entityId:id,detail:'직원 기본정보·조직·연봉 등록'});await done;return id;
  }

  private requireDb(): IDBDatabase {
    if (!this.db) throw new Error('Repository is not initialized')
    return this.db
  }

  private async indexedRows<T>(storeName:StoreName,indexName:string,key:IDBValidKey):Promise<T[]>{
    const tx=this.requireDb().transaction(storeName,'readonly')
    return requestToPromise(tx.objectStore(storeName).index(indexName).getAll(key)) as Promise<T[]>
  }
  private async getAll<T>(storeName: StoreName): Promise<T[]> {
    const db = this.requireDb()
    const tx = db.transaction(storeName, 'readonly')
    const done = txDone(tx)
    const data = await requestToPromise(tx.objectStore(storeName).getAll())
    await done
    return data as T[]
  }

  private async getOne<T>(storeName: StoreName, id: string): Promise<T | undefined> {
    const db = this.requireDb()
    const tx = db.transaction(storeName, 'readonly')
    const done = txDone(tx)
    const data = await requestToPromise(tx.objectStore(storeName).get(id))
    await done
    return data as T | undefined
  }

  private async put(storeName: StoreName, value: unknown): Promise<void> {
    const db = this.requireDb()
    const tx = db.transaction(storeName, 'readwrite')
    const done = txDone(tx)
    tx.objectStore(storeName).put(value)
    await done
  }

  private async deleteOne(storeName: StoreName, id: string): Promise<void> {
    const db = this.requireDb()
    const tx = db.transaction(storeName, 'readwrite')
    const done = txDone(tx)
    tx.objectStore(storeName).delete(id)
    await done
  }

  private async seed(bundle: SeedBundle): Promise<void> {
    const db = this.requireDb()
    const names = Object.values(STORES)
    const tx = db.transaction(names, 'readwrite')
    const done = txDone(tx)
    names.forEach((name) => tx.objectStore(name).clear())

    tx.objectStore(STORES.company).put(bundle.company)
    bundle.organizations.forEach((v) => tx.objectStore(STORES.organizations).put(v))
    bundle.persons.forEach((v) => tx.objectStore(STORES.persons).put(v))
    bundle.addresses.forEach((v) => tx.objectStore(STORES.addresses).put(v))
    bundle.dependents.forEach((v) => tx.objectStore(STORES.dependents).put(v))
    bundle.visas.forEach((v) => tx.objectStore(STORES.visas).put(v))
    bundle.bankAccounts.forEach((v) => tx.objectStore(STORES.bankAccounts).put(v))
    bundle.employments.forEach((v) => tx.objectStore(STORES.employments).put(v))
    bundle.assignments.forEach((v) => tx.objectStore(STORES.assignments).put(v))
    bundle.compensations.forEach((v) => tx.objectStore(STORES.compensations).put(v))
    bundle.taxProfiles.forEach((v) => tx.objectStore(STORES.taxProfiles).put(v))
    bundle.socialInsuranceProfiles.forEach((v) => tx.objectStore(STORES.socialInsuranceProfiles).put(v))
    bundle.militaryServiceProfiles.forEach((v) => tx.objectStore(STORES.militaryServiceProfiles).put(v))
    bundle.educations.forEach((v) => tx.objectStore(STORES.educations).put(v))
    bundle.careers.forEach((v) => tx.objectStore(STORES.careers).put(v))
    bundle.certifications.forEach((v) => tx.objectStore(STORES.certifications).put(v))
    bundle.skills.forEach((v) => tx.objectStore(STORES.skills).put(v))
    bundle.resumes.forEach((v) => tx.objectStore(STORES.resumes).put(v))
    bundle.workSchedules.forEach((v) => tx.objectStore(STORES.workSchedules).put(v))
    bundle.attendanceSettings.forEach((v) => tx.objectStore(STORES.attendanceSettings).put(v))
    bundle.managerRelationships.forEach((v) => tx.objectStore(STORES.managerRelationships).put(v))
    bundle.personnelEvents.forEach((v) => tx.objectStore(STORES.personnelEvents).put(v))
    bundle.auditLogs.forEach((v) => tx.objectStore(STORES.auditLogs).put(v))
    bundle.payrollRuns.forEach((v) => tx.objectStore(STORES.payrollRuns).put(v))
    bundle.payrollEntries.forEach((v) => tx.objectStore(STORES.payrollEntries).put(v))
    bundle.payrollResults.forEach((v) => tx.objectStore(STORES.payrollResults).put(v))
    bundle.attendanceMonthlySummaries.forEach((v) => tx.objectStore(STORES.attendanceMonthlySummaries).put(v))
    bundle.annualLeaveLedgers.forEach((v) => tx.objectStore(STORES.annualLeaveLedgers).put(v))
    bundle.dailyWorkers.forEach((v) => tx.objectStore(STORES.dailyWorkers).put(v))
    bundle.dailyWorkRecords.forEach((v) => tx.objectStore(STORES.dailyWorkRecords).put(v))
    bundle.retirementSettlements.forEach((v) => tx.objectStore(STORES.retirementSettlements).put(v))
    bundle.yearEndTaxCases.forEach((v) => tx.objectStore(STORES.yearEndTaxCases).put(v))
    bundle.payrollItemMasters.forEach((v) => tx.objectStore(STORES.payrollItemMasters).put(v))
    ;(bundle.attendanceDailyRecords??[]).forEach(v=>tx.objectStore(STORES.attendanceDailyRecords).put(v))
    ;(bundle.leaveCases??[]).forEach(v=>tx.objectStore(STORES.leaveCases).put(v))
    ;(bundle.payrollSettingsHistory??[]).forEach(v=>tx.objectStore(STORES.payrollSettingsHistory).put(v))
    for(const name of operationStores)(bundle[name]??[]).forEach(v=>tx.objectStore(STORES[name]).put(v))
    tx.objectStore(STORES.meta).put({ id: 'dbVersion' , value: String(DB_VERSION) })
    tx.objectStore(STORES.meta).put({ id: 'seedVersion', value: String(SEED_VERSION) })
    tx.objectStore(STORES.meta).put({ id: 'schemaVersion', value: String(SCHEMA_VERSION) })
    await done
  }

  async getCompany(): Promise<Company> {
    const all = await this.getAll<Company>(STORES.company)
    if (!all[0]) throw new Error('Company data is missing')
    return all[0]
  }

  private async employeeViews(): Promise<EmployeeView[]> {
    const [persons, addresses, bankAccounts, employments, assignments, compensations, orgs] = await Promise.all([
      this.getAll<Person>(STORES.persons), this.getAll<Address>(STORES.addresses), this.getAll<BankAccount>(STORES.bankAccounts),
      this.getAll<Employment>(STORES.employments), this.getAll<Assignment>(STORES.assignments),
      this.getAll<CompensationSnapshot>(STORES.compensations), this.getAll<Organization>(STORES.organizations),
    ])
    const pMap = new Map(persons.map((p) => [p.id, p]))
    const oMap = new Map(orgs.map((o) => [o.id, o]))
    const currentAddress = new Map<string, Address>()
    addresses.filter((a) => a.effectiveEndDate === null).forEach((a) => currentAddress.set(a.personId, a))
    const currentBank = new Map<string, BankAccount>()
    bankAccounts.filter((b) => b.effectiveEndDate === null && b.isPayrollAccount).forEach((b) => currentBank.set(b.employmentId, b))
    const currentAssignment = new Map<string, Assignment>()
    assignments.filter((a) => a.effectiveTo === null).forEach((a) => currentAssignment.set(a.employmentId, a))
    const currentComp = new Map<string, CompensationSnapshot>()
    compensations.filter((c) => c.effectiveTo === null).forEach((c) => currentComp.set(c.employmentId, c))

    return employments.flatMap((employment) => {
      const person = pMap.get(employment.personId)
      const assignment = currentAssignment.get(employment.id)
      const comp = currentComp.get(employment.id)
      if (!person || !assignment || !comp) return []
      const address = currentAddress.get(person.id)
      const bank = currentBank.get(employment.id)
      return [{
        employmentId:employment.id, personId:person.id, employeeNumber:employment.employeeNumber, name:person.fullName,
        englishName:person.englishName, birthDate:person.birthDate, gender:person.gender,
        domesticForeignType:person.domesticForeignType, nationality:person.nationality, mobile:person.mobile, email:person.email,
        address:address ? `${address.addressLine1} ${address.addressLine2}` : '-', syntheticIdentifier:person.syntheticIdentifier,
        bankName:bank?.bankName ?? '-', bankAccount:bank?.accountNumberMasked ?? '-', hireDate:employment.hireDate,
        terminationDate:employment.terminationDate, employmentType:employment.employmentType, status:employment.status,
        organizationId:assignment.organizationId, organizationName:oMap.get(assignment.organizationId)?.name ?? '미지정',
        occupationCode:assignment.occupationCode,occupationCodeManual:assignment.occupationCodeManual,grade:assignment.grade, title:assignment.title, job:assignment.job, workLocation:assignment.workLocation,
        annualSalary:comp.annualSalary,
      }]
    })
  }

  async listEmployees(): Promise<EmployeeView[]> {
    await this.applyDueEvents()
    return (await this.employeeViews()).sort((a,b) => a.employeeNumber.localeCompare(b.employeeNumber))
  }

  async getEmployee(employmentId: string): Promise<EmployeeView | null> {
    await this.applyDueEvents()
    return (await this.employeeViews()).find((row) => row.employmentId === employmentId) ?? null
  }

  async getEmployeeMaster(employmentId: string): Promise<EmployeeMasterDetail | null> {
    await this.applyDueEvents()
    const employee = await this.getEmployee(employmentId)
    if (!employee) return null
    const person = await this.getOne<Person>(STORES.persons, employee.personId)
    if (!person) return null
    const [addresses, dependents, visas, bankAccounts, taxProfiles, insuranceProfiles, militaryProfiles, educations, careers, certifications, skills, resumes, attendanceSettings, schedules, relationships, assignments, compensations, personnelEvents] = await Promise.all([
      this.getAll<Address>(STORES.addresses), this.getAll<Dependent>(STORES.dependents), this.getAll<Visa>(STORES.visas),
      this.getAll<BankAccount>(STORES.bankAccounts), this.getAll<TaxProfile>(STORES.taxProfiles), this.getAll<SocialInsuranceProfile>(STORES.socialInsuranceProfiles), this.getAll<MilitaryServiceProfile>(STORES.militaryServiceProfiles),
      this.getAll<Education>(STORES.educations), this.getAll<CareerHistory>(STORES.careers), this.getAll<Certification>(STORES.certifications),
      this.getAll<EmployeeSkill>(STORES.skills), this.getAll<ResumeDocument>(STORES.resumes), this.getAll<AttendanceSetting>(STORES.attendanceSettings),
      this.getAll<WorkSchedule>(STORES.workSchedules), this.getAll<ManagerRelationship>(STORES.managerRelationships), this.getAll<Assignment>(STORES.assignments),
      this.getAll<CompensationSnapshot>(STORES.compensations), this.getAll<PersonnelEvent>(STORES.personnelEvents),
    ])
    const address = addresses.find((v) => v.personId === person.id && v.effectiveEndDate === null) ?? null
    const attendanceSetting = attendanceSettings.find((v) => v.employmentId === employmentId) ?? null
    return {
      employee, person, address,
      dependents:dependents.filter((v) => v.employmentId===employmentId).sort((a,b)=>a.relation.localeCompare(b.relation,'ko')),
      visas:visas.filter((v)=>v.employmentId===employmentId).sort((a,b)=>b.effectiveStartDate.localeCompare(a.effectiveStartDate)),
      bankAccounts:bankAccounts.filter((v)=>v.employmentId===employmentId).sort((a,b)=>b.effectiveStartDate.localeCompare(a.effectiveStartDate)),
      taxProfile:taxProfiles.find((v)=>v.employmentId===employmentId && v.effectiveEndDate===null) ?? null,
      socialInsuranceProfile:insuranceProfiles.find((v)=>v.employmentId===employmentId && v.effectiveEndDate===null) ?? null,
      militaryServiceProfile:militaryProfiles.find((v)=>v.employmentId===employmentId) ?? null,
      educations:educations.filter((v)=>v.employmentId===employmentId).sort((a,b)=>(b.graduationDate??'').localeCompare(a.graduationDate??'')),
      careers:careers.filter((v)=>v.employmentId===employmentId).sort((a,b)=>b.endDate.localeCompare(a.endDate)),
      certifications:certifications.filter((v)=>v.employmentId===employmentId).sort((a,b)=>b.acquiredDate.localeCompare(a.acquiredDate)),
      skills:skills.filter((v)=>v.employmentId===employmentId).sort((a,b)=>a.category.localeCompare(b.category)),
      resumes:resumes.filter((v)=>v.employmentId===employmentId).sort((a,b)=>b.version-a.version),
      attendanceSetting,
      workSchedule:attendanceSetting ? schedules.find((v)=>v.id===attendanceSetting.workScheduleId) ?? null : null,
      managerRelationship:relationships.find((v)=>v.employmentId===employmentId && v.effectiveEndDate===null) ?? null,
      assignmentHistory:assignments.filter((v)=>v.employmentId===employmentId).sort((a,b)=>b.effectiveFrom.localeCompare(a.effectiveFrom)),
      compensationHistory:compensations.filter((v)=>v.employmentId===employmentId).sort((a,b)=>b.effectiveFrom.localeCompare(a.effectiveFrom)),
      personnelEvents:personnelEvents.filter((v)=>v.employmentId===employmentId).sort((a,b)=>b.effectiveDate.localeCompare(a.effectiveDate)),
    }
  }

  async getDependentsAtDate(employmentId: string, date: string): Promise<Dependent[]> {
    return (await this.getAll<Dependent>(STORES.dependents))
      .filter((v)=>v.employmentId===employmentId && inEffect(v.effectiveStartDate,v.effectiveEndDate,date))
      .sort((a,b)=>a.relation.localeCompare(b.relation,'ko'))
  }

  async getPayrollDependentInfo(employmentId: string, date: string): Promise<PayrollDependentInfo> {
    const dependents = await this.getDependentsAtDate(employmentId,date)
    return {
      employmentId, asOfDate:date, dependents,
      basicDeductionCount:dependents.filter((v)=>v.basicDeductionEligible).length,
      childDeductionCount:dependents.filter((v)=>v.childDeductionEligible).length,
    }
  }

  async upsertDependent(input: DependentInput): Promise<Dependent> {
    const now = new Date().toISOString()
    const existing = input.id ? await this.getOne<Dependent>(STORES.dependents,input.id) : undefined
    const dependent: Dependent = {
      id:input.id ?? `DEP-${crypto.randomUUID()}`, employmentId:input.employmentId, relation:input.relation,
      name:input.name.trim(), birthDate:input.birthDate, cohabitation:input.cohabitation,
      disabilityStatus:input.disabilityStatus, basicDeductionEligible:input.basicDeductionEligible,
      childDeductionEligible:input.childDeductionEligible, effectiveStartDate:input.effectiveStartDate,
      effectiveEndDate:input.effectiveEndDate, createdAt:existing?.createdAt ?? now, updatedAt:now,
    }
    await this.put(STORES.dependents,dependent)
    await this.put(STORES.auditLogs,{
      id:`AUD-${crypto.randomUUID()}`,occurredAt:now,actor:'HR_ADMIN',action:existing?'UPDATE_DEPENDENT':'CREATE_DEPENDENT',
      entityType:'DEPENDENT',entityId:dependent.id,detail:`${dependent.relation} ${dependent.name} 가족정보를 ${existing?'수정':'등록'}했습니다.`,
    } satisfies AuditLog)
    return dependent
  }

  async updateManagerRelationship(input: ManagerRelationshipInput): Promise<ManagerRelationship> {
    const all = await this.getAll<ManagerRelationship>(STORES.managerRelationships)
    const existing = all.find((v)=>v.employmentId===input.employmentId && v.effectiveEndDate===null)
    const relationship: ManagerRelationship = {
      id:existing?.id ?? `MGR-${crypto.randomUUID()}`, employmentId:input.employmentId,
      directManagerId:input.directManagerId, hrManagerId:input.hrManagerId, leaveApproverId:input.leaveApproverId,
      attendanceApproverId:input.attendanceApproverId, performanceReviewerId:input.performanceReviewerId,
      effectiveStartDate:existing?.effectiveStartDate ?? today(), effectiveEndDate:null,
    }
    await this.put(STORES.managerRelationships,relationship)
    await this.put(STORES.auditLogs,{
      id:`AUD-${crypto.randomUUID()}`,occurredAt:new Date().toISOString(),actor:'HR_ADMIN',action:'UPDATE_APPROVER_RELATIONSHIP',
      entityType:'EMPLOYMENT',entityId:input.employmentId,detail:'Manager/Approver 관계를 변경했습니다.',
    } satisfies AuditLog)
    return relationship
  }

  async updateMilitaryServiceProfile(profile: MilitaryServiceProfile): Promise<MilitaryServiceProfile> {
    const row: MilitaryServiceProfile = { ...profile, id: profile.id || `MIL-${profile.employmentId}` }
    await this.put(STORES.militaryServiceProfiles, row)
    await this.put(STORES.auditLogs,{id:`AUD-${crypto.randomUUID()}`,occurredAt:new Date().toISOString(),actor:'HR_ADMIN',action:'UPDATE_MILITARY_SERVICE',entityType:'MILITARY_SERVICE_PROFILE',entityId:row.id,detail:`${profile.employmentId} 병역정보를 저장했습니다.`} satisfies AuditLog)
    return row
  }

  async listOrganizations(): Promise<Organization[]> {
    return (await this.getAll<Organization>(STORES.organizations)).sort((a,b)=>a.name.localeCompare(b.name,'ko'))
  }

  async listPersonnelEvents(employmentId?: string): Promise<PersonnelEvent[]> {
    return (await this.getAll<PersonnelEvent>(STORES.personnelEvents))
      .filter((e)=>!employmentId || e.employmentId===employmentId)
      .sort((a,b)=>b.effectiveDate.localeCompare(a.effectiveDate))
  }

  private async currentAssignment(employmentId: string): Promise<Assignment> {
    const current = (await this.getAll<Assignment>(STORES.assignments)).find((a)=>a.employmentId===employmentId && a.effectiveTo===null)
    if (!current) throw new Error('Current assignment not found')
    return current
  }

  private async applyEvent(event: PersonnelEvent): Promise<void> {
    const db = this.requireDb()
    const current = await this.currentAssignment(event.employmentId)
    const employment = await this.getOne<Employment>(STORES.employments,event.employmentId)
    if (!employment) throw new Error('Employment not found')
    const mappings=(await this.operations()).occupationCodeMappings
    const tx = db.transaction([STORES.assignments,STORES.employments,STORES.personnelEvents,STORES.auditLogs],'readwrite')
    const done = txDone(tx)

    if (event.eventType==='STATUS_CHANGE') {
      const nextStatus=String(event.after.status) as Employment['status']
      tx.objectStore(STORES.employments).put({...employment,status:nextStatus,terminationDate:nextStatus==='TERMINATED'?event.effectiveDate:null})
    } else {
      tx.objectStore(STORES.assignments).put({...current,effectiveTo:dayBefore(event.effectiveDate)})
      const next: Assignment={...current,id:`ASN-${crypto.randomUUID()}`,effectiveFrom:event.effectiveDate,effectiveTo:null}
      if (event.eventType==='ORG_TRANSFER') next.organizationId=String(event.after.organizationId)
      if (event.eventType==='PROMOTION') next.grade=String(event.after.grade)
      if (event.eventType==='TITLE_CHANGE') next.title=String(event.after.title)
      if(event.eventType==='JOB_CHANGE')next.job=String(event.after.job)
      if(event.eventType==='LOCATION_CHANGE')next.workLocation=String(event.after.workLocation)
      if(!next.occupationCodeManual){next.occupationCode=occupationCode(mappings,event.effectiveDate,next.organizationId,next.job,'');next.occupationCodeSource='직종 매핑 · '+event.effectiveDate}
      tx.objectStore(STORES.assignments).put(next)
    }
    tx.objectStore(STORES.personnelEvents).put({...event,status:'APPLIED'})
    tx.objectStore(STORES.auditLogs).put({
      id:`AUD-${crypto.randomUUID()}`,occurredAt:new Date().toISOString(),actor:'HR_ADMIN',action:'APPLY_PERSONNEL_EVENT',
      entityType:'EMPLOYMENT',entityId:event.employmentId,detail:`${event.eventType} 발령을 ${event.effectiveDate} 기준으로 적용`,
    } satisfies AuditLog)
    await done
  }

  private async applyDueEvents(): Promise<void> {
    const due=(await this.getAll<PersonnelEvent>(STORES.personnelEvents))
      .filter((e)=>e.status==='SCHEDULED' && e.effectiveDate<=today()).sort((a,b)=>a.effectiveDate.localeCompare(b.effectiveDate))
    for (const event of due) await this.applyEvent(event)
  }

  async createPersonnelAction(input: PersonnelActionInput): Promise<PersonnelEvent> {
    const employee=await this.getEmployee(input.employmentId)
    if (!employee) throw new Error('Employee not found')
    if (input.effectiveDate<employee.hireDate) throw new Error('효력일은 입사일보다 빠를 수 없습니다.')
    if (input.eventType!=='STATUS_CHANGE') {
      const assignment=await this.currentAssignment(input.employmentId)
      if (input.effectiveDate<assignment.effectiveFrom) throw new Error('현재 Assignment 시작일보다 이전 날짜로 발령할 수 없습니다.')
    }
    let before: Record<string,string|number|null>={}
    let after: Record<string,string|number|null>={}
    if (input.eventType==='ORG_TRANSFER') { before={organizationId:employee.organizationId,organizationName:employee.organizationName}; after={organizationId:input.value} }
    else if (input.eventType==='PROMOTION') { before={grade:employee.grade}; after={grade:input.value} }
    else if(input.eventType==='JOB_CHANGE'){before={job:employee.job};after={job:input.value}}
    else if(input.eventType==='LOCATION_CHANGE'){before={workLocation:employee.workLocation};after={workLocation:input.value}}
    else if (input.eventType==='TITLE_CHANGE') { before={title:employee.title}; after={title:input.value} }
    else { before={status:employee.status}; after={status:input.value} }
    const event: PersonnelEvent={
      id:`PE-${crypto.randomUUID()}`,employmentId:input.employmentId,eventType:input.eventType,effectiveDate:input.effectiveDate,
      before,after,reason:input.reason,createdAt:new Date().toISOString(),status:input.effectiveDate<=today()?'APPLIED':'SCHEDULED',
    }
    if (event.status==='APPLIED') {
      await this.put(STORES.personnelEvents,{...event,status:'SCHEDULED'})
      await this.applyEvent({...event,status:'SCHEDULED'})
      return {...event,status:'APPLIED'}
    }
    await this.put(STORES.personnelEvents,event)
    await this.put(STORES.auditLogs,{
      id:`AUD-${crypto.randomUUID()}`,occurredAt:new Date().toISOString(),actor:'HR_ADMIN',action:'SCHEDULE_PERSONNEL_EVENT',
      entityType:'EMPLOYMENT',entityId:event.employmentId,detail:`${event.eventType} 발령을 ${event.effectiveDate}로 예약`,
    } satisfies AuditLog)
    return event
  }

  async listPayrollRuns(): Promise<PayrollRun[]> {
    return (await this.getAll<PayrollRun>(STORES.payrollRuns)).sort((a,b)=>b.period.localeCompare(a.period))
  }

  async getPayrollRun(runId: string): Promise<PayrollRun | null> {
    return (await this.getOne<PayrollRun>(STORES.payrollRuns,runId)) ?? null
  }

  async createPayrollRun(input: PayrollRunInput, demo=false): Promise<PayrollRun> {
    const existing=(await this.getAll<PayrollRun>(STORES.payrollRuns)).find((run)=>run.period===input.period)
    if (existing) throw new Error(`${input.period} 급여 Run이 이미 존재합니다.`)
    const company=await this.getCompany()
    const periodEnd=monthEnd(input.period)
    const periodStart=monthStart(input.period)
    const [persons,employments,assignments,compensations,orgs,socialProfiles,dependents]=await Promise.all([
      this.getAll<Person>(STORES.persons), this.getAll<Employment>(STORES.employments), this.getAll<Assignment>(STORES.assignments),
      this.getAll<CompensationSnapshot>(STORES.compensations), this.getAll<Organization>(STORES.organizations),
      this.getAll<SocialInsuranceProfile>(STORES.socialInsuranceProfiles), this.getAll<Dependent>(STORES.dependents),
    ])
    const pMap=new Map(persons.map((v)=>[v.id,v])); const oMap=new Map(orgs.map((v)=>[v.id,v]))
    const now=new Date().toISOString()
    const run:PayrollRun={id:`PAYRUN-${input.period}`,companyId:company.id,period:input.period,payDate:input.payDate,status:'DRAFT',ruleVersion:PAYROLL_RULE_VERSION,note:input.note.trim(),createdAt:now,calculatedAt:null,validatedAt:null,confirmedAt:null,closedAt:null}
    const entries:PayrollEntry[]=[]
    for (const employment of employments) {
      if (employment.status==='PRE_HIRE') continue
      if (employment.hireDate>periodEnd) continue
      if (employment.terminationDate && employment.terminationDate<periodStart) continue
      const person=pMap.get(employment.personId); if(!person) continue
      const assignment=assignments.filter((v)=>v.employmentId===employment.id && v.effectiveFrom<=periodEnd && (v.effectiveTo===null || v.effectiveTo>=periodEnd)).sort((a,b)=>b.effectiveFrom.localeCompare(a.effectiveFrom))[0]
        ?? assignments.filter((v)=>v.employmentId===employment.id && v.effectiveFrom<=periodEnd).sort((a,b)=>b.effectiveFrom.localeCompare(a.effectiveFrom))[0]
      const compensation=compensations.filter((v)=>v.employmentId===employment.id && v.effectiveFrom<=periodEnd && (v.effectiveTo===null || v.effectiveTo>=periodEnd)).sort((a,b)=>b.effectiveFrom.localeCompare(a.effectiveFrom))[0]
        ?? compensations.filter((v)=>v.employmentId===employment.id && v.effectiveFrom<=periodEnd).sort((a,b)=>b.effectiveFrom.localeCompare(a.effectiveFrom))[0]
      if(!assignment || !compensation) continue
      const social=socialProfiles.find((v)=>v.employmentId===employment.id && inEffect(v.effectiveStartDate,v.effectiveEndDate,periodEnd))
      const activeDeps=dependents.filter((v)=>v.employmentId===employment.id && inEffect(v.effectiveStartDate,v.effectiveEndDate,periodEnd))
      const monthlyBase=Math.round(compensation.annualSalary/12)
      entries.push({
        id:`PAYENT-${run.id}-${employment.id}`,runId:run.id,employmentId:employment.id,employeeNumberSnapshot:employment.employeeNumber,
        employeeNameSnapshot:person.fullName,organizationNameSnapshot:oMap.get(assignment.organizationId)?.name ?? assignment.organizationId,
        gradeSnapshot:assignment.grade,titleSnapshot:assignment.title,jobSnapshot:assignment.job,hireDateSnapshot:employment.hireDate,terminationDateSnapshot:employment.terminationDate,
        annualSalarySnapshot:compensation.annualSalary,monthlyBasePay:monthlyBase,prorationRate:calendarProration(employment.hireDate,employment.terminationDate,input.period),
        taxableAllowance:0,nonTaxableAllowance:0,overtimePay:0,bonus:0,retroPay:0,otherEarnings:0,unpaidDeduction:0,otherDeductions:0,
        pensionBaseMonthly:monthlyBase,healthBaseMonthly:monthlyBase,employmentInsuranceBaseMonthly:monthlyBase,
        nationalPensionEligible:social?.nationalPensionEligible ?? false,healthInsuranceEligible:social?.healthInsuranceEligible ?? false,
        employmentInsuranceEligible:social?.employmentInsuranceEligible ?? false,industrialAccidentInsuranceEligible:social?.industrialAccidentInsuranceEligible ?? false,
        basicDeductionCount:activeDeps.filter((v)=>v.basicDeductionEligible).length,childDeductionCount:activeDeps.filter((v)=>v.childDeductionEligible).length,
        incomeTaxManual:0,memo:'',status:'DRAFT',updatedAt:now,
      })
    }
    if(demo||company.demoScenarioVersion){const items=await this.listPayrollItemMasters(),leaves=await this.listLeaveCases();for(let i=0;i<entries.length;i++)entries[i]=this.demoEntry(entries[i],run,items,leaves,dependents).entry}
    const db=this.requireDb(); const tx=db.transaction([STORES.payrollRuns,STORES.payrollEntries,STORES.auditLogs],'readwrite'); const done=txDone(tx)
    tx.objectStore(STORES.payrollRuns).put(run); entries.forEach((entry)=>tx.objectStore(STORES.payrollEntries).put(entry))
    tx.objectStore(STORES.auditLogs).put({id:`AUD-${crypto.randomUUID()}`,occurredAt:now,actor:'HR_ADMIN',action:'CREATE_PAYROLL_RUN',entityType:'PAYROLL_RUN',entityId:run.id,detail:`${input.period} 급여 Run을 ${entries.length}명 대상으로 생성했습니다.`} satisfies AuditLog)
    await done; return run
  }

  async deletePayrollRun(runId:string):Promise<void>{
    const run=await this.getPayrollRun(runId); if(!run) return
    if(['CONFIRMED','CLOSED','PAID'].includes(run.status)) throw new Error('확정 또는 마감된 급여 Run은 삭제할 수 없습니다.')
    const entries=await this.listPayrollEntries(runId); const results=await this.listPayrollResults(runId)
    const db=this.requireDb(); const tx=db.transaction([STORES.payrollRuns,STORES.payrollEntries,STORES.payrollResults,STORES.auditLogs],'readwrite'); const done=txDone(tx)
    entries.forEach((v)=>tx.objectStore(STORES.payrollEntries).delete(v.id)); results.forEach((v)=>tx.objectStore(STORES.payrollResults).delete(v.id)); tx.objectStore(STORES.payrollRuns).delete(runId)
    tx.objectStore(STORES.auditLogs).put({id:`AUD-${crypto.randomUUID()}`,occurredAt:new Date().toISOString(),actor:'HR_ADMIN',action:'DELETE_PAYROLL_RUN',entityType:'PAYROLL_RUN',entityId:runId,detail:`${run.period} 급여 Run을 삭제했습니다.`} satisfies AuditLog)
    await done
  }

  async listPayrollEntries(runId:string):Promise<PayrollEntry[]>{
    return (await this.indexedRows<PayrollEntry>(STORES.payrollEntries,'byRunId',runId)).sort((a,b)=>a.employeeNumberSnapshot.localeCompare(b.employeeNumberSnapshot))
  }

  async getPayrollEntry(runId:string,employmentId:string):Promise<PayrollEntry|null>{
    return (await this.getAll<PayrollEntry>(STORES.payrollEntries)).find((v)=>v.runId===runId && v.employmentId===employmentId) ?? null
  }

  async addPayrollEntry(runId:string,employmentId:string):Promise<PayrollEntry>{
    const run=await this.getPayrollRun(runId); if(!run) throw new Error('급여 Run을 찾을 수 없습니다.')
    if(['CONFIRMED','CLOSED','PAID'].includes(run.status)) throw new Error('확정 또는 마감된 급여 Run에는 대상자를 추가할 수 없습니다.')
    if(await this.getPayrollEntry(runId,employmentId)) throw new Error('이미 급여 대상에 포함된 직원입니다.')
    const periodEnd=monthEnd(run.period); const periodStart=monthStart(run.period)
    const employment=await this.getOne<Employment>(STORES.employments,employmentId); if(!employment) throw new Error('Employment를 찾을 수 없습니다.')
    if(employment.hireDate>periodEnd || (employment.terminationDate && employment.terminationDate<periodStart)) throw new Error('해당 귀속월의 급여 대상 기간에 포함되지 않는 직원입니다.')
    const [person,assignments,compensations,orgs,socialProfiles,dependents]=await Promise.all([
      this.getOne<Person>(STORES.persons,employment.personId),this.getAll<Assignment>(STORES.assignments),this.getAll<CompensationSnapshot>(STORES.compensations),
      this.getAll<Organization>(STORES.organizations),this.getAll<SocialInsuranceProfile>(STORES.socialInsuranceProfiles),this.getAll<Dependent>(STORES.dependents),
    ])
    if(!person) throw new Error('Person 정보를 찾을 수 없습니다.')
    const assignment=assignments.filter((v)=>v.employmentId===employment.id && v.effectiveFrom<=periodEnd).sort((a,b)=>b.effectiveFrom.localeCompare(a.effectiveFrom))[0]
    const compensation=compensations.filter((v)=>v.employmentId===employment.id && v.effectiveFrom<=periodEnd).sort((a,b)=>b.effectiveFrom.localeCompare(a.effectiveFrom))[0]
    if(!assignment || !compensation) throw new Error('해당 월의 Assignment 또는 Compensation Snapshot이 없습니다.')
    const social=socialProfiles.find((v)=>v.employmentId===employment.id && inEffect(v.effectiveStartDate,v.effectiveEndDate,periodEnd))
    const activeDeps=dependents.filter((v)=>v.employmentId===employment.id && inEffect(v.effectiveStartDate,v.effectiveEndDate,periodEnd))
    const monthlyBase=Math.round(compensation.annualSalary/12); const now=new Date().toISOString()
    const entry:PayrollEntry={
      id:`PAYENT-${run.id}-${employment.id}`,runId:run.id,employmentId:employment.id,employeeNumberSnapshot:employment.employeeNumber,
      employeeNameSnapshot:person.fullName,organizationNameSnapshot:orgs.find((v)=>v.id===assignment.organizationId)?.name ?? assignment.organizationId,
      gradeSnapshot:assignment.grade,titleSnapshot:assignment.title,jobSnapshot:assignment.job,hireDateSnapshot:employment.hireDate,terminationDateSnapshot:employment.terminationDate,
      annualSalarySnapshot:compensation.annualSalary,monthlyBasePay:monthlyBase,prorationRate:calendarProration(employment.hireDate,employment.terminationDate,run.period),
      taxableAllowance:0,nonTaxableAllowance:0,overtimePay:0,bonus:0,retroPay:0,otherEarnings:0,unpaidDeduction:0,otherDeductions:0,
      pensionBaseMonthly:monthlyBase,healthBaseMonthly:monthlyBase,employmentInsuranceBaseMonthly:monthlyBase,
      nationalPensionEligible:social?.nationalPensionEligible ?? false,healthInsuranceEligible:social?.healthInsuranceEligible ?? false,
      employmentInsuranceEligible:social?.employmentInsuranceEligible ?? false,industrialAccidentInsuranceEligible:social?.industrialAccidentInsuranceEligible ?? false,
      basicDeductionCount:activeDeps.filter((v)=>v.basicDeductionEligible).length,childDeductionCount:activeDeps.filter((v)=>v.childDeductionEligible).length,
      incomeTaxManual:0,memo:'수동 추가',status:'DRAFT',updatedAt:now,
    }
    const db=this.requireDb(); const tx=db.transaction([STORES.payrollEntries,STORES.payrollRuns,STORES.auditLogs],'readwrite'); const done=txDone(tx)
    tx.objectStore(STORES.payrollEntries).put(entry); tx.objectStore(STORES.payrollRuns).put({...run,status:'DRAFT',calculatedAt:null,validatedAt:null,confirmedAt:null})
    tx.objectStore(STORES.auditLogs).put({id:`AUD-${crypto.randomUUID()}`,occurredAt:now,actor:'HR_ADMIN',action:'ADD_PAYROLL_ENTRY',entityType:'PAYROLL_ENTRY',entityId:entry.id,detail:`${entry.employeeNameSnapshot}을(를) ${run.period} 급여 대상에 추가했습니다.`} satisfies AuditLog)
    await done; return entry
  }

  async saveFilingForm(runId:string,values:FilingFormValues,reason:string):Promise<void>{
    const run=await this.getPayrollRun(runId);if(!run||['CONFIRMED','CLOSED','PAID'].includes(run.status))throw new Error('확정·마감월 신고 대사는 수정할 수 없습니다.');if(!reason.trim()||!values.incomeName.trim()||!values.incomeCode.trim())throw new Error('소득명·코드·수정 사유를 입력하세요.');if([values.headcount,values.grossPay,values.incomeTax,values.localIncomeTax].some(v=>!Number.isFinite(v)||v<0)||!Number.isInteger(values.headcount))throw new Error('신고 대사 인원·금액을 확인하세요.')
    const next={incomeName:values.incomeName,incomeCode:values.incomeCode,headcount:values.headcount,grossPay:values.grossPay,incomeTax:values.incomeTax,localIncomeTax:values.localIncomeTax,note:values.note,updatedAt:new Date().toISOString(),editReason:reason};const tx=this.requireDb().transaction([STORES.payrollRuns,STORES.auditLogs],'readwrite'),done=txDone(tx);tx.objectStore(STORES.payrollRuns).put({...run,filingFormOverrides:next});tx.objectStore(STORES.auditLogs).put({id:`AUD-${crypto.randomUUID()}`,occurredAt:new Date().toISOString(),actor:'HR_ADMIN',action:'EDIT_FILING_FORM',entityType:'PAYROLL_RUN',entityId:runId,detail:JSON.stringify({reason,before:run.filingFormOverrides,after:next})});await done
  }
  async savePayrollEntriesBatch(inputs:PayrollEntryInput[]):Promise<void>{
    if(!inputs.length)return
    const allRuns=await this.listPayrollRuns(),runIds=new Set(inputs.map(i=>i.runId)),runs=allRuns.filter(r=>runIds.has(r.id))
    if(runs.length!==runIds.size||runs.some(r=>['CONFIRMED','CLOSED','PAID'].includes(r.status)))throw new Error('수정 가능한 급여월이 아닙니다.')
    const entries=(await Promise.all(runs.map(r=>this.listPayrollEntries(r.id)))).flat(),seen=new Set<string>()
    const next=inputs.map(input=>{
      const old=entries.find(e=>e.runId===input.runId&&e.employmentId===input.employmentId),key=`${input.runId}-${input.employmentId}`
      if(!old||seen.has(key))throw new Error('중복·잘못된 급여 대상입니다.');seen.add(key)
      const numbers=[...Object.values(input.insuranceOverrides??{}),input.monthlyBasePay??0,input.prorationRate,input.taxableAllowance,input.nonTaxableAllowance,input.overtimePay,input.bonus,input.retroPay,input.otherEarnings,input.unpaidDeduction,input.otherDeductions,input.pensionBaseMonthly,input.healthBaseMonthly,input.employmentInsuranceBaseMonthly,input.incomeTaxManual,...Object.values(input.itemAmounts??{})]
      if(numbers.some(v=>!Number.isFinite(v)||v<0)||input.prorationRate>1)throw new Error('급여 숫자·일할비율을 확인하세요.')
      return {...old,...input,id:old.id,status:'DRAFT',updatedAt:new Date().toISOString()}
    })
    const tx=this.requireDb().transaction([STORES.payrollEntries,STORES.payrollResults,STORES.payrollRuns,STORES.auditLogs],'readwrite'),done=txDone(tx)
    next.forEach(e=>tx.objectStore(STORES.payrollEntries).put(e));runs.forEach(run=>tx.objectStore(STORES.payrollRuns).put({...run,status:'DRAFT',calculatedAt:null,validatedAt:null}))
    const req=tx.objectStore(STORES.payrollResults).openCursor();req.onsuccess=()=>{const c=req.result;if(c){if(runIds.has(c.value.runId))c.delete();c.continue()}}
    tx.objectStore(STORES.auditLogs).put({id:`AUD-${crypto.randomUUID()}`,occurredAt:new Date().toISOString(),actor:'HR_ADMIN',action:'IMPORT_PAYROLL_INPUT',entityType:'PAYROLL_RUN',entityId:[...runIds].join(','),detail:JSON.stringify({before:entries.filter(e=>seen.has(`${e.runId}-${e.employmentId}`)),after:next})});await done
  }
  async upsertPayrollEntry(input:PayrollEntryInput):Promise<PayrollEntry>{
    const run=await this.getPayrollRun(input.runId); if(!run) throw new Error('급여 Run을 찾을 수 없습니다.')
    if(['CONFIRMED','CLOSED','PAID'].includes(run.status)) throw new Error('확정 또는 마감된 급여 Run은 수정할 수 없습니다.')
    const existing=await this.getPayrollEntry(input.runId,input.employmentId); if(!existing) throw new Error('급여 대상자를 찾을 수 없습니다.')
    const next:PayrollEntry={...existing,monthlyBasePay:input.monthlyBasePay??existing.monthlyBasePay,insuranceOverrides:input.insuranceOverrides??existing.insuranceOverrides,prorationRate:input.prorationRate,taxableAllowance:input.taxableAllowance,nonTaxableAllowance:input.nonTaxableAllowance,overtimePay:input.overtimePay,bonus:input.bonus,retroPay:input.retroPay,otherEarnings:input.otherEarnings,unpaidDeduction:input.unpaidDeduction,otherDeductions:input.otherDeductions,pensionBaseMonthly:input.pensionBaseMonthly,healthBaseMonthly:input.healthBaseMonthly,employmentInsuranceBaseMonthly:input.employmentInsuranceBaseMonthly,incomeTaxManual:input.incomeTaxManual,itemAmounts:input.itemAmounts??existing.itemAmounts,memo:input.memo.trim(),status:'DRAFT',updatedAt:new Date().toISOString()}
    const db=this.requireDb(); const tx=db.transaction([STORES.payrollEntries,STORES.payrollResults,STORES.payrollRuns,STORES.auditLogs],'readwrite'); const done=txDone(tx)
    tx.objectStore(STORES.payrollEntries).put(next); tx.objectStore(STORES.payrollResults).delete(`PAYRES-${input.runId}-${input.employmentId}`)
    tx.objectStore(STORES.payrollRuns).put({...run,status:'DRAFT',calculatedAt:null,validatedAt:null,confirmedAt:null})
    tx.objectStore(STORES.auditLogs).put({id:`AUD-${crypto.randomUUID()}`,occurredAt:new Date().toISOString(),actor:'HR_ADMIN',action:'UPDATE_PAYROLL_ENTRY',entityType:'PAYROLL_ENTRY',entityId:next.id,detail:`${next.employeeNameSnapshot} 급여 입력값을 수정했습니다.`} satisfies AuditLog)
    await done; return next
  }

  async deletePayrollEntry(runId:string,employmentId:string):Promise<void>{
    const run=await this.getPayrollRun(runId); if(!run) return
    if(['CONFIRMED','CLOSED','PAID'].includes(run.status)) throw new Error('확정 또는 마감된 급여 Run은 대상자를 삭제할 수 없습니다.')
    const entry=await this.getPayrollEntry(runId,employmentId); if(!entry) return
    const db=this.requireDb(); const tx=db.transaction([STORES.payrollEntries,STORES.payrollResults,STORES.payrollRuns,STORES.auditLogs],'readwrite'); const done=txDone(tx)
    tx.objectStore(STORES.payrollEntries).delete(entry.id); tx.objectStore(STORES.payrollResults).delete(`PAYRES-${runId}-${employmentId}`); tx.objectStore(STORES.payrollRuns).put({...run,status:'DRAFT',calculatedAt:null,validatedAt:null,confirmedAt:null})
    tx.objectStore(STORES.auditLogs).put({id:`AUD-${crypto.randomUUID()}`,occurredAt:new Date().toISOString(),actor:'HR_ADMIN',action:'DELETE_PAYROLL_ENTRY',entityType:'PAYROLL_ENTRY',entityId:entry.id,detail:`${entry.employeeNameSnapshot}을(를) 급여 대상에서 제외했습니다.`} satisfies AuditLog)
    await done
  }

  async listPayrollResults(runId:string):Promise<PayrollResult[]>{
    return await this.indexedRows<PayrollResult>(STORES.payrollResults,'byRunId',runId)
  }

  async calculatePayrollRun(runId:string, overrides?:Record<string,boolean>|null):Promise<PayrollResult[]>{
    const run=await this.getPayrollRun(runId); if(!run) throw new Error('급여 Run을 찾을 수 없습니다.')
    if(['CONFIRMED','CLOSED','PAID'].includes(run.status)) throw new Error('확정 또는 마감된 급여 Run은 재계산할 수 없습니다.')
    const entries=await this.listPayrollEntries(runId); if(entries.length===0) throw new Error('급여 대상자가 없습니다.')
    const currentItems=await this.listPayrollItemMasters()
    const items=overrides===undefined&&run.itemSnapshot?run.itemSnapshot:currentItems
    const effectiveOverrides=overrides===undefined&&run.itemOverrides?run.itemOverrides:Object.fromEntries(items.map(i=>[i.code,overrides?.[i.code]??i.active]))
    const attendance=await this.indexedRows<AttendanceMonthlySummary>(STORES.attendanceMonthlySummaries,'byPeriod',run.period)
    const leaves=await this.listLeaveCases()
    const previousRun=(await this.listPayrollRuns()).find((candidate)=>candidate.period<run.period && ['CLOSED','PAID'].includes(candidate.status))
    const previousResults=previousRun?await this.listPayrollResults(previousRun.id):[]
    const previousMap=new Map(previousResults.map((result)=>[result.employmentId,result]))
    const results=entries.map((entry)=>{
      const result=calculatePayrollEntry(entry,run.period,items,effectiveOverrides,leaves,run.payDate)
      const previous=previousMap.get(entry.employmentId)
      if(previous && previous.grossPay>0){
        const change=(result.grossPay-previous.grossPay)/previous.grossPay
        if(Math.abs(change)>=0.2) result.warnings.push(`직전 마감월 대비 총지급액이 ${change>=0?'+':''}${Math.round(change*100)}% 변동했습니다.`)
      }
      return result
    }); const now=new Date().toISOString()
    const db=this.requireDb(); const tx=db.transaction([STORES.payrollEntries,STORES.payrollResults,STORES.payrollRuns,STORES.auditLogs],'readwrite'); const done=txDone(tx)
    const entryStore=tx.objectStore(STORES.payrollEntries); const resultStore=tx.objectStore(STORES.payrollResults)
    results.forEach((result)=>resultStore.put(result)); entries.forEach((entry)=>entryStore.put({...entry,attendanceRevision:attendance.find(a=>a.employmentId===entry.employmentId&&a.period===run.period)?.revision??0,status:results.find((r)=>r.employmentId===entry.employmentId)?.errors.length?'ERROR':'CALCULATED',updatedAt:now}))
    tx.objectStore(STORES.payrollRuns).put({...run,itemSnapshot:items,itemOverrides:effectiveOverrides,attendanceStale:false,status:'CALCULATED',calculatedAt:now,validatedAt:null,confirmedAt:null})
    tx.objectStore(STORES.auditLogs).put({id:`AUD-${crypto.randomUUID()}`,occurredAt:now,actor:'HR_ADMIN',action:'CALCULATE_PAYROLL_RUN',entityType:'PAYROLL_RUN',entityId:runId,detail:`${run.period} 급여를 ${entries.length}명 대상으로 계산했습니다.`} satisfies AuditLog)
    await done; return results
  }

  async validatePayrollRun(runId:string):Promise<{warnings:number;errors:number}>{
    const run=await this.getPayrollRun(runId); if(!run) throw new Error('급여 Run을 찾을 수 없습니다.')
    if(['CONFIRMED','CLOSED','PAID'].includes(run.status)) throw new Error('확정 또는 마감된 급여 Run은 다시 검증할 수 없습니다.')
    // 검증은 항상 현재 입력 Snapshot 전체를 다시 계산한 결과를 사용한다.
    // 일부 행 수정 시 해당 행의 기존 Result가 삭제되므로, 남아 있는 과거 Result만 검증하면 누락될 수 있다.
    const results=await this.calculatePayrollRun(runId)
    const latestRun=(await this.getPayrollRun(runId)) ?? run
    const warnings=results.reduce((sum,v)=>sum+v.warnings.length,0); const errors=results.reduce((sum,v)=>sum+v.errors.length,0)
    const now=new Date().toISOString(); await this.put(STORES.payrollRuns,{...latestRun,status:errors===0?'VALIDATED':'CALCULATED',validatedAt:errors===0?now:null})
    await this.put(STORES.auditLogs,{id:`AUD-${crypto.randomUUID()}`,occurredAt:now,actor:'HR_ADMIN',action:'VALIDATE_PAYROLL_RUN',entityType:'PAYROLL_RUN',entityId:runId,detail:`검증 결과 경고 ${warnings}건, 오류 ${errors}건`} satisfies AuditLog)
    return {warnings,errors}
  }

  async setPayrollRunStatus(runId:string,status:PayrollRunStatus):Promise<PayrollRun>{
    const run=await this.getPayrollRun(runId); if(!run) throw new Error('급여 Run을 찾을 수 없습니다.')
    if(!['CONFIRMED','CLOSED','PAID'].includes(status)) throw new Error('확정 또는 마감 전환만 허용됩니다.')
    if(run.attendanceStale) throw new Error('근태 또는 휴직이 변경되었습니다. 다시 계산·검증하세요.')
    if(run.status==='PAID'||run.status==='CLOSED'&&status!=='PAID') throw new Error('마감된 급여 Run은 상태를 변경할 수 없습니다.')
    if(status==='CONFIRMED' && run.status!=='VALIDATED') throw new Error('검증 완료 후에만 급여를 확정할 수 있습니다.')
    if(status==='CLOSED' && !(await this.isAttendanceClosed(run.period)))throw new Error('먼저 해당 월의 근태 마감을 완료하세요.')
    if(status==='CLOSED' && run.status!=='CONFIRMED') throw new Error('확정된 급여만 마감할 수 있습니다.')
    if(status==='PAID'&&run.status!=='CLOSED')throw new Error('급여 마감 후에만 지급 완료할 수 있습니다.')
    const now=new Date().toISOString(); const next:PayrollRun={...run,status,paidAt:status==='PAID'?now:run.paidAt,confirmedAt:status==='CONFIRMED'?now:run.confirmedAt,closedAt:status==='CLOSED'?now:run.closedAt}
    await this.put(STORES.payrollRuns,next); await this.put(STORES.auditLogs,{id:`AUD-${crypto.randomUUID()}`,occurredAt:now,actor:'HR_ADMIN',action:`PAYROLL_${status}`,entityType:'PAYROLL_RUN',entityId:runId,detail:`${run.period} 급여 Run 상태를 ${status}로 변경했습니다.`} satisfies AuditLog)
    return next
  }

  async confirmRecords(section:import('../../modules/payroll/payrollRepository').ConfirmSection,ids:string[]):Promise<void>{
    const stores={attendance:STORES.attendanceMonthlySummaries,annual:STORES.annualLeaveLedgers,daily:STORES.dailyWorkRecords,retirement:STORES.retirementSettlements,yearend:STORES.yearEndTaxCases}
    if(!ids.length||new Set(ids).size!==ids.length)throw new Error('확정할 자료를 선택하세요.')
    const store=stores[section],now=new Date().toISOString()
    const tx=this.requireDb().transaction([store,STORES.auditLogs],'readwrite'),done=txDone(tx)
    const requests=ids.map(id=>requestToPromise(tx.objectStore(store).get(id)))
    try{
      const rows=await Promise.all(requests)
      if(rows.some(r=>!r))throw new Error('먼저 입력값을 저장한 뒤 확정하세요.')
      if(section==='yearend'&&rows.some(r=>r.estimatedFinalTax===null))throw new Error('최종 소득세를 입력한 뒤 확정하세요.')
      if(rows.some(r=>r.confirmedAt||r.status==='CONFIRMED'))throw new Error('이미 확정된 자료입니다.')
      for(const r of rows)tx.objectStore(store).put({...r,confirmedAt:now,confirmedBy:'HR_ADMIN',...(['retirement','yearend'].includes(section)?{status:'CONFIRMED',manualEdited:true}:{})})
      tx.objectStore(STORES.auditLogs).put({id:`AUD-${crypto.randomUUID()}`,occurredAt:now,actor:'HR_ADMIN',action:'CONFIRM_'+section.toUpperCase(),entityType:section,entityId:ids.join(','),detail:JSON.stringify({before:rows,confirmedAt:now})})
      await done
    }catch(e){try{tx.abort()}catch{}await done.catch(()=>{});throw e}
  }

  private async persistSelectionUpgrade(){const c=await this.getCompany();if(c.recruiting?.selectionVersion)return;const next=upgradeRecruiting(c.recruiting??recruitingSeed()),tx=this.requireDb().transaction([STORES.company,STORES.auditLogs],'readwrite'),done=txDone(tx);tx.objectStore(STORES.company).put({...c,recruiting:next});tx.objectStore(STORES.auditLogs).put({id:`AUD-${crypto.randomUUID()}`,occurredAt:new Date().toISOString(),actor:'SYSTEM',action:'UPGRADE_SELECTION_EVALUATION',entityType:'RECRUITING',entityId:c.id,detail:'기존 평가 사본과 원점수를 보존하며 역량·질문·Calibration 저장구조와 Payroll 평가 실습자료를 보강했습니다.'} satisfies AuditLog);await done}
  async refreshIssues():Promise<void>{const [ops,employees,attendance,leaves,daily,runs,results,recruiting]=await Promise.all([this.operations(),this.listEmployees(),this.listAttendanceDailyRecords(),this.listLeaveCases(),this.listDailyWorkRecords(),this.listPayrollRuns(),this.getAll<PayrollResult>(STORES.payrollResults),this.recruiting()]);const generated:import('../../modules/operations/operations').Issue[]=[],now=new Date().toISOString();const add=(sourceType:string,sourceId:string,date:string,title:string,description:string,employmentId?:string,category=sourceType)=>generated.push({id:'ISS-'+sourceType+'-'+sourceId,occurredDate:date,title,description,sourceType,sourceId,employmentId,organizationId:employees.find(e=>e.employmentId===employmentId)?.organizationId,category,severity:'MEDIUM',status:'OPEN',manual:false,createdAt:now});const em=new Map(employees.map(e=>[e.employmentId,e]));for(const r of attendance){const issue=issueForAttendance(r,em.get(r.employmentId),ops.calendarEvents);if(issue)generated.push(issue);else if(r.absence||r.activity==='SICK')add('AttendanceDailyRecord',r.id,r.workDate,r.absence?'결근 확인':'병가 처리 확인',r.note||r.editReason||'근태·급여 지급 구분 확인',r.employmentId,'근태')}for(const l of leaves)add('LeaveCase',l.id,l.startDate,'휴직 및 보험 처리 검토',l.note,l.employmentId,'휴직');for(const r of daily)if(r.hours>0&&dayPolicy(r.workDate,ops.calendarEvents).off)add('DailyWorkRecord',r.id,r.workDate,'일용직 휴무일 근로',r.note||'실제 근로·휴일수당 근거 확인',undefined,'일용직');for(const r of results)if(r.errors.length||r.warnings.length){const run=runs.find(v=>v.id===r.runId);add('PayrollResult',r.id,(run?.period??now.slice(0,7))+'-01',r.errors.length?'급여 오류':'급여 검토사항',[...r.errors,...r.warnings].join(' / '),r.employmentId,'급여')}for(const e of ops.calendarEvents.filter(e=>e.scope==='HR'&&e.startDate===seoulDate()))add('CalendarEvent',e.id,e.startDate,'오늘 HR 일정 · '+e.title,e.note||'HR 일정 확인',undefined,'HR스케줄');for(const e of recruiting.events.filter(e=>e.status==='실패'))add('RecruitingEvent',e.id,now.slice(0,10),'채용 자동화 전달 실패',e.error||'연결 설정 확인',undefined,'채용');for(const e of employees)if(e.terminationDate&&e.terminationDate<e.hireDate)add('Employment',e.employmentId,seoulDate(),'고용기간 오류','입사·퇴사일 원천정보 확인',e.employmentId,'직원');const known=new Set(ops.issues.map(i=>i.id)),fresh=generated.filter(i=>!known.has(i.id));if(!fresh.length)return;const tx=this.requireDb().transaction([STORES.issues,STORES.auditLogs],'readwrite'),done=txDone(tx);fresh.forEach(i=>tx.objectStore(STORES.issues).put(i));tx.objectStore(STORES.auditLogs).put({id:crypto.randomUUID(),occurredAt:now,actor:'SYSTEM',action:'DERIVE_ISSUES',entityType:'ISSUE',entityId:'BATCH',detail:JSON.stringify({added:fresh.length,sourceIds:fresh.map(i=>i.sourceId)})});await done}
  async operations():Promise<OperationsData>{const entries=await Promise.all(operationStores.map(async name=>[name,await this.getAll(STORES[name])] as const));return Object.fromEntries(entries) as unknown as OperationsData}
  async saveOperation<K extends OperationStore>(name:K,row:OperationsData[K][number]){validateOperation(name,row,await this.listEmployees());const before=await this.getOne(STORES[name],row.id);if(name==='filingDrafts'&&before&&JSON.stringify(before)!==JSON.stringify(row))throw new Error('신고 초안 원천 스냅샷은 변경할 수 없습니다. 새 초안을 생성하세요.');const tx=this.requireDb().transaction([STORES[name],STORES.auditLogs],'readwrite'),done=txDone(tx);tx.objectStore(STORES[name]).put(structuredClone(row));tx.objectStore(STORES.auditLogs).put({id:crypto.randomUUID(),occurredAt:new Date().toISOString(),actor:'HR_ADMIN',action:before?'UPDATE':'CREATE',entityType:name,entityId:row.id,detail:JSON.stringify({before,after:row})});await done}
  private async initializeOperations(){const marker=await this.getOne(STORES.meta,'operationsV7');if(marker)return;const existing=await this.operations(),now=new Date().toISOString(),tx=this.requireDb().transaction([STORES.calendarEvents,STORES.policyDocuments,STORES.meta,STORES.auditLogs],'readwrite'),done=txDone(tx);for(const event of calendarSeed())if(!existing.calendarEvents.some(x=>x.id===event.id))tx.objectStore(STORES.calendarEvents).put(event);for(const doc of [{id:'POL-MOEL-2026',category:'MOEL_STANDARD',title:'2026년 표준취업규칙 · 고용노동부 원문 기준',source:'https://www.moel.go.kr/policy/policydata/view.do?bbs_seq=20260200740',contents:'고용노동부 2026년 표준취업규칙 (2026.2.13 게시). 위 출처의 원본 첨부파일을 기준으로 회사 적용안과 비교·검토하세요. 이 레코드는 정부 문서를 대체하는 원문 복제본이 아닌 원본 연결 정보입니다.'},{id:'POL-COMPANY',category:'COMPANY_OPERATION',title:'회사 운영 정책 초안',source:'회사 HR 검토 초안',contents:'근로조건: 근로계약서와 적용 법령을 따른다. 연장·야간·휴일근로는 실제 근로시간을 기록하고 법정 가산수당을 검토한다. 법정 휴가·휴직을 회사 승인 여부로 축소하지 않는다. 변경 시 근로자 의견청취 및 불이익 변경 동의 요건을 검토한다.'},{id:'POL-TECH',category:'TECH_OPERATION',title:'기술기업 운영 정책 초안',source:'회사 운영 초안 · 정부 표준과 별도',contents:'장애대응·온콜: 대기와 실제 근로를 구분하여 기록한다. 야간·휴일 실제 대응시간과 휴게를 기록하고 수당·대체휴일을 법령과 합의에 따라 검토한다. 유연근무는 해당 제도 요건과 근로자 동의를 확인한다. 보안·원격근무 규정은 법정 근로조건을 축소하지 않는다.'},{id:'POL-BYLAW',category:'BYLAW',title:'사규 초안',source:'회사 사규 · HR 검토 필요',contents:'규정 관리: 담당자·시행일·버전·변경 사유를 기록한다. 보안·복무·복리후생 세부 규칙은 근로계약·취업규칙·법령과 충돌하지 않도록 검토한다.'}])if(!existing.policyDocuments.some(d=>d.id===doc.id))tx.objectStore(STORES.policyDocuments).put({...doc,version:1,effectiveDate:'2026-02-13',status:'Draft',reviewRequired:true,history:[]});tx.objectStore(STORES.meta).put({id:'operationsV7' ,value:'1'});tx.objectStore(STORES.auditLogs).put({id:crypto.randomUUID(),occurredAt:now,actor:'SYSTEM',action:'MIGRATE_V7_ADDITIVE',entityType:'DATABASE',entityId:'v7',detail:'v0.7.5 기반 7개 신규 저장소와 법정 캘린더를 추가. 직원·급여·확정·수기·가져오기 데이터는 보존.'});await done}
  async recruiting(){return upgradeRecruiting((await this.getCompany()).recruiting??recruitingSeed())}
  async saveRecruiting(state:RecruitingState){
    const c=await this.getCompany(),before=upgradeRecruiting(c.recruiting??recruitingSeed()),next=upgradeRecruiting(state),logs:AuditLog[]=[],now=new Date().toISOString()
    const audit=(action:string,id:string,detail:unknown,actor='HR_ADMIN')=>logs.push({id:`AUD-${crypto.randomUUID()}`,occurredAt:now,actor,action,entityType:'RECRUITING',entityId:id,detail:JSON.stringify(detail)})
    for(const connection of next.integrationConnections??[])validateConnection(connection)
    logs.push(...selectionAuditChanges(before,next))
    for(const t of next.templates??[]){saveTemplate(next,t);const old=before.templates?.find(x=>x.id===t.id);if(old&&JSON.stringify(old)!==JSON.stringify(t)&&t.version!==old.version+1)throw new Error('평가표 수정 시 새 버전이 필요합니다.')}
    for(const e of next.evaluations??[]){const old=before.evaluations?.find(x=>x.id===e.id);if(JSON.stringify(old)===JSON.stringify(e)||old&&old.status!=='DRAFT')continue;saveEvaluation({...before,candidates:next.candidates,interviews:next.interviews},e,e.status==='SUBMITTED');if(e.status==='SUBMITTED'){const checked=saveEvaluation({...before,candidates:next.candidates,interviews:next.interviews},e,true).evaluations!.find(x=>x.id===e.id)!;if(e.overallScore!==checked.overallScore)throw new Error('평가 총점을 확인하세요.')}if(e.status==='SUBMITTED')audit('SUBMIT_EVALUATION',e.id,e,e.evaluator)}
    for(const d of next.decisions??[])if(JSON.stringify(before.decisions?.find(x=>x.candidateId===d.candidateId))!==JSON.stringify(d)){decideCandidate(before,d);audit('HIRING_DECISION',d.candidateId,d,d.decidedBy)}
    for(const o of next.offers??[])if(JSON.stringify(before.offers?.find(x=>x.id===o.id))!==JSON.stringify(o)){saveOffer({...before,decisions:next.decisions},o);audit(before.offers?.some(x=>x.id===o.id)?'OFFER_STATUS_CHANGED':'CREATE_OFFER',o.id,o)}
    for(const candidate of before.candidates){const updated=next.candidates.find(x=>x.id===candidate.id);if(candidate.employmentId&&(!updated||updated.employmentId!==candidate.employmentId||updated.personId!==candidate.personId||updated.stage!=='채용완료'))throw new Error('입사전환 연결을 변경할 수 없습니다.');if(!candidate.employmentId&&updated?.employmentId)throw new Error('입사전환 기능을 사용하세요.')}
    const tx=this.requireDb().transaction([STORES.company,STORES.auditLogs],'readwrite'),done=txDone(tx);tx.objectStore(STORES.company).put({...c,recruiting:next});logs.forEach(l=>tx.objectStore(STORES.auditLogs).put(l));await done
  }
  async convertCandidate(input:OnboardingInput):Promise<{personId:string;employmentId:string}>{
    const stores=[STORES.company,STORES.persons,STORES.employments,STORES.assignments,STORES.compensations,STORES.organizations,STORES.auditLogs]
    const tx=this.requireDb().transaction(stores,'readwrite'),done=txDone(tx)
    try{
      const company=(await requestToPromise(tx.objectStore(STORES.company).getAll()))[0] as Company,state=upgradeRecruiting(company.recruiting??recruitingSeed()),candidate=state.candidates.find(c=>c.id===input.candidateId),offer=state.offers?.find(o=>o.id===input.offerId&&o.candidateId===input.candidateId)
      if(!candidate||candidate.employmentId)throw new Error('이미 입사전환되었거나 지원자가 없습니다.')
      if(!offer||offer.status!=='ACCEPTED')throw new Error('수락된 오퍼만 입사전환할 수 있습니다.')
      if(!state.decisions?.some(d=>d.candidateId===candidate.id&&d.decision==='PASS'))throw new Error('최종 합격을 확인하세요.')
      if(!/^\d{4}-\d{2}-\d{2}$/.test(input.birthDate)||Number.isNaN(Date.parse(input.birthDate))||new Date(input.birthDate).toISOString().slice(0,10)!==input.birthDate||input.birthDate>=offer.startDate)throw new Error('생년월일을 확인하세요.')
      if(!input.employeeNumber.trim()||!input.birthDate||!input.nationality.trim()||!input.workLocation.trim())throw new Error('사번·생년월일·국적·근무지를 입력하세요.')
      const org=await requestToPromise(tx.objectStore(STORES.organizations).get(offer.organizationId));if(!org)throw new Error('오퍼 조직을 확인하세요.')
      const existing=await requestToPromise(tx.objectStore(STORES.employments).getAll()) as Employment[];if(existing.some(e=>e.employeeNumber===input.employeeNumber.trim()))throw new Error('이미 사용 중인 사번입니다.')
      const personId=`PERSON-${crypto.randomUUID()}`,employmentId=`EMPLOY-${crypto.randomUUID()}`,now=new Date().toISOString()
      const person:Person={id:personId,fullName:candidate.name,englishName:'',hanjaName:'',birthDate:input.birthDate,gender:input.gender,domesticForeignType:input.nationality==='대한민국'?'DOMESTIC':'FOREIGN',nationality:input.nationality,reportingNationality:input.nationality,syntheticIdentifier:'',profileImageUrl:null,mobile:candidate.phone,phone:'',email:candidate.email,emergencyContactName:'',emergencyContactPhone:'',emergencyContactRelation:''}
      tx.objectStore(STORES.persons).add(person)
      tx.objectStore(STORES.employments).add({id:employmentId,personId,companyId:company.id,employeeNumber:input.employeeNumber.trim(),hireDate:offer.startDate,terminationDate:null,employmentType:'REGULAR',status:offer.startDate>seoulDate()?'PRE_HIRE':'ACTIVE'} satisfies Employment)
      tx.objectStore(STORES.assignments).add({id:`ASN-${crypto.randomUUID()}`,employmentId,organizationId:offer.organizationId,job:offer.job,grade:offer.grade,title:offer.title,workLocation:input.workLocation,effectiveFrom:offer.startDate,effectiveTo:null} satisfies Assignment)
      tx.objectStore(STORES.compensations).add({id:`COMP-${crypto.randomUUID()}`,employmentId,annualSalary:offer.annualSalary,effectiveFrom:offer.startDate,effectiveTo:null} satisfies CompensationSnapshot)
      tx.objectStore(STORES.company).put({...company,recruiting:{...state,candidates:state.candidates.map(c=>c.id===candidate.id?{...c,personId,employmentId,stage:'채용완료',history:[...(c.history??[]),{date:now,stage:'채용완료'}]}:c)}})
      tx.objectStore(STORES.auditLogs).add({id:`AUD-${crypto.randomUUID()}`,occurredAt:now,actor:'HR_ADMIN',action:'CONVERT_CANDIDATE_TO_EMPLOYEE',entityType:'CANDIDATE',entityId:candidate.id,detail:JSON.stringify({personId,employmentId,offerId:offer.id})} satisfies AuditLog)
      await done;return {personId,employmentId}
    }catch(e){try{tx.abort()}catch{}await done.catch(()=>{});throw e}
  }
  async withholdingDraft(id:string){return (await this.getCompany()).withholdingDrafts?.[id]}
  async saveWithholdingDraft(id:string,draft:import('../../modules/payroll/withholdingForm').WithholdingDraft){const c=await this.getCompany();await this.put(STORES.company,{...c,withholdingDrafts:{...c.withholdingDrafts,[id]:structuredClone(draft)}});await this.put(STORES.auditLogs,{id:crypto.randomUUID(),occurredAt:new Date().toISOString(),actor:'HR_ADMIN',action:'SAVE_WITHHOLDING_FORM',entityType:'PAYROLL_RUN',entityId:id,detail:'별지 제21호 신고서 작성값 저장'});}
  async companyInfo():Promise<CompanyInfo>{const c=await this.getCompany();return {...defaultCompanyInfo,name:c.name,...c.reportingInfo}}
  async saveCompanyInfo(info:CompanyInfo){
    if(!info.name.trim()||!info.address.trim()||!info.representative.trim()||!/^\d{3}-?\d{2}-?\d{5}$/.test(info.businessNumber)||!/^\d{11}$/.test(info.managementNumber)||!/^\d{2,3}-\d{3,4}-\d{4}$/.test(info.telephone)||!/^\d{3}$/.test(info.occupationCode)||![1,3,5].includes(info.insuranceCode)||![1,2,3].includes(info.departureCode))throw new Error('회사정보의 필수값·번호 형식을 확인하세요. 회사 전화번호는 02-0000-0000 형태로 입력하세요.')
    const c=await this.getCompany();await this.put(STORES.company,{...c,name:info.name,reportingInfo:info})
  }
  async settlements():Promise<SettlementSetting[]>{return (await this.getCompany()).settlements??defaultSettlements}
  async saveSettlements(rows:SettlementSetting[]){const c=await this.getCompany();await this.put(STORES.company,{...c,settlements:rows})}
  async isAttendanceClosed(period:string){return !!(await this.getCompany()).attendanceClosed?.[period]}
  async closeAttendance(period:string){
    if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(period))throw new Error('마감월을 선택하세요.')
    const rows=await this.indexedRows<AttendanceMonthlySummary>(STORES.attendanceMonthlySummaries,'byPeriod',period)
    if(!rows.length)throw new Error('마감할 근태가 없습니다.')
    const periodRuns=(await this.listPayrollRuns()).filter(r=>r.period===period);const entries=(await Promise.all(periodRuns.map(r=>this.listPayrollEntries(r.id)))).flat()
    if(entries.some(e=>!rows.some(r=>r.employmentId===e.employmentId)))throw new Error('급여 대상자의 근태가 누락되었습니다.')
    const pending=rows.filter(r=>!r.confirmedAt);if(pending.length)await this.confirmRecords('attendance',pending.map(r=>r.id))
    const c=await this.getCompany();await this.put(STORES.company,{...c,attendanceClosed:{...c.attendanceClosed,[period]:new Date().toISOString()}})
  }
  async dailyClosedPeriods(){return (await this.getCompany()).dailyClosed??{}}
  async closeDaily(period:string){
    const rows=(await this.listDailyWorkRecords()).filter(r=>r.workDate.startsWith(period))
    if(!rows.length||rows.some(r=>!r.confirmedAt))throw new Error('해당 월 전체 신고자료를 먼저 확정하세요.')
    const c=await this.getCompany();await this.put(STORES.company,{...c,dailyClosed:{...c.dailyClosed,[period]:new Date().toISOString()}})
  }
  private demoEntry(entry:PayrollEntry,run:PayrollRun,items:PayrollItemMaster[],leaves:LeaveCase[],dependents:Dependent[]){
    const month=Number(run.period.slice(5)),seq=Number(entry.employeeNumberSnapshot.replace(/\D/g,''))||1
    const seasonal=[0,120000,70000,0,180000,90000,0,150000,50000,220000,80000,300000][month-1]
    const next={...entry,taxableAllowance:seasonal+(seq%7)*12000,bonus:month===2||month===9?Math.round(entry.monthlyBasePay*(0.1+(seq%3)*0.05)):0,memo:'가상 계절수당 · 국세청 간이세액표'}
    const ds=dependents.filter(d=>d.employmentId===entry.employmentId&&d.basicDeductionEligible&&inEffect(d.effectiveStartDate,d.effectiveEndDate,run.payDate)),children=ds.filter(d=>d.relation==='자녀'&&Number(run.payDate.slice(0,4))-Number(d.birthDate.slice(0,4))>=8&&Number(run.payDate.slice(0,4))-Number(d.birthDate.slice(0,4))<=20).length
    next.basicDeductionCount=ds.length+1;next.childDeductionCount=children;const full=leaves.find(l=>l.employmentId===entry.employmentId&&l.companyPayRate===0&&l.startDate<=monthStart(run.period)&&(!l.endDate||l.endDate>=monthEnd(run.period)));if(full)next.employmentInsuranceBaseMonthly=next.taxableAllowance+next.bonus+next.otherEarnings
    const estimate=calculatePayrollEntry(next,run.period,run.itemSnapshot??items,run.itemOverrides,leaves,run.payDate)
    next.incomeTaxManual=simplifiedTax(estimate.taxableEarnings,ds.length+1,children,run.payDate)
    const result=calculatePayrollEntry(next,run.period,run.itemSnapshot??items,run.itemOverrides,leaves,run.payDate)
    if(result.errors.length)throw new Error(run.period+': '+entry.employeeNameSnapshot+' 더미 급여 변경 검증 실패: '+result.errors.join(' / '))
    return {entry:next,result}
  }
  async ensureDemoHistory(){
    if(await this.getOne(STORES.meta,'importedData'))return
    const c=await this.getCompany(),date=seoulDate(),employees=await this.listEmployees(),existing=await this.listAttendanceMonthlySummaries(),daily=await this.listAttendanceDailyRecords(),workers=await this.listDailyWorkers(),records=await this.listDailyWorkRecords()
    const calendar=(await this.operations()).calendarEvents
    const additions:AttendanceMonthlySummary[]=[],newDaily:AttendanceDailyRecord[]=[],newRecords:DailyWorkRecord[]=[]
    const issueDays:AttendanceDailyRecord[]=[]
    // Only add absent demo rows. Imported/manual/confirmed records remain authoritative.
    if(!c.demoHistoryVersion){
      for(let n=0;n<21;n++){const period=`${2025+Math.floor(n/12)}-${String(n%12+1).padStart(2,'0')}`
        for(const e of employees){if(e.hireDate>monthEnd(period)||(e.terminationDate&&e.terminationDate<monthStart(period))||existing.some(r=>r.employmentId===e.employmentId&&r.period===period))continue
          additions.push({id:`ATT-DEMO-${e.employmentId}-${period}`,employmentId:e.employmentId,period,organizationNameSnapshot:e.organizationName,gradeSnapshot:e.grade,jobSnapshot:e.job,scheduledHours:160,workedHours:160,overtimeHours:0,nightHours:0,holidayHours:0,leaveDays:0,absenceHours:0,lateMinutes:0,earlyLeaveMinutes:0})}
        for(const w of workers){if(w.startDate>monthEnd(period)||w.endDate&&w.endDate<monthStart(period)||records.some(r=>r.dailyWorkerId===w.id&&r.workDate.startsWith(period)))continue
          for(const day of Array.from({length:28},(_,i)=>i+1).filter(day=>!dayPolicy(`${period}-${String(day).padStart(2,'0')}`,calendar).off).filter((_,i)=>i%5===0).slice(0,2+(n+workers.indexOf(w))%3)){const workDate=`${period}-${String(day).padStart(2,'0')}`;if(workDate>=w.startDate&&(!w.endDate||workDate<=w.endDate))newRecords.push(calculateDailyWorkRecord(w,workDate,8,'가상 IT 이벤트 운영지원',{otherAllowance:20000,holidayAllowance:holidays2026[workDate]?Math.round(w.dailyRate*.5):0}))}}
      }
    }
    const cutoff=date<'2026-10-31'?date:'2026-10-31'
    if(date>='2026-10-01')for(const e of employees){if(c.attendanceClosed?.['2026-10'])continue;const old=existing.find(r=>r.period==='2026-10'&&r.employmentId===e.employmentId);if(old?.confirmedAt||old?.manualEdited)continue
      for(let day=1;day<=Number(cutoff.slice(8));day++){const workDate=`2026-10-${String(day).padStart(2,'0')}`;if(e.hireDate>workDate||e.terminationDate&&e.terminationDate<workDate||daily.some(r=>r.employmentId===e.employmentId&&r.workDate===workDate))continue
        if(c.demoScenarioVersion){newDaily.push(correctedDemoDay(e,workDate,employees,calendar));continue}const sick=workDate==='2026-10-02'&&employees.indexOf(e)%19===0;const off=[0,6].includes(new Date(workDate+'T00:00:00Z').getUTCDay());newDaily.push({id:`ATTD-DEMO-${e.employmentId}-${workDate}`,employmentId:e.employmentId,workDate,startTime:'09:00',endTime:'18:00',endNextDay:false,breakStart:'12:00',breakMinutes:60,holiday:false,absence:false,activity:off?'OFF':sick?'SICK':'WORK',workedHours:off||sick?0:8,overtimeHours:0,nightHours:0,holidayHours:0,holidayOvertimeHours:0,updatedAt:new Date().toISOString(),updatedBy:'DEMO',editReason:'서울 날짜까지 일별 누적'})}
      const days=[...daily,...newDaily].filter(r=>r.employmentId===e.employmentId&&r.workDate.startsWith('2026-10'));if(days.length)additions.push({id:old?.id??`ATT-DEMO-${e.employmentId}-2026-10`,employmentId:e.employmentId,period:'2026-10',organizationNameSnapshot:e.organizationName,gradeSnapshot:e.grade,jobSnapshot:e.job,scheduledHours:days.filter(r=>r.offKind!=='WEEKEND'&&r.offKind!=='STATUTORY'&&(r.activity!=='OFF'||r.offKind==='PERSONAL')).length*8,workedHours:days.reduce((s,r)=>s+r.workedHours,0),overtimeHours:days.reduce((s,r)=>s+r.overtimeHours,0),nightHours:days.reduce((s,r)=>s+r.nightHours,0),holidayHours:days.reduce((s,r)=>s+r.holidayHours,0),leaveDays:days.reduce((s,r)=>s+(r.leaveHours??0)/8,0),absenceHours:days.filter(r=>r.activity==='ABSENT').length*8,paidCreditHours:days.reduce((s,r)=>s+(r.paidCreditHours??0),0),unpaidHours:days.filter(r=>r.payTreatment==='UNPAID').length*8,sickPaidHours:days.filter(r=>r.activity==='SICK'&&r.payTreatment==='PAID').length*8,sickUnpaidHours:days.filter(r=>r.activity==='SICK'&&r.payTreatment==='UNPAID').length*8,issueNote:[...new Set(days.filter(r=>!['WORK','OFF'].includes(r.activity??'WORK')||r.paidCreditHours).map(r=>`${r.workDate.slice(5)} ${r.note??r.activity} (${r.payTreatment==='UNPAID'?'무급':r.payTreatment==='BENEFIT'?'보험급여':'유급'})`))].join(' / '),lateMinutes:0,earlyLeaveMinutes:0})
    }
    if(date>='2026-10-01'&&!c.dailyClosed?.['2026-10'])for(const w of workers)for(let day=1;day<=Number(cutoff.slice(8));day++){
      const workDate=`2026-10-${String(day).padStart(2,'0')}`
      if(dayPolicy(workDate,calendar).off||w.startDate>workDate||w.endDate&&w.endDate<workDate||records.some(r=>r.dailyWorkerId===w.id&&r.workDate===workDate))continue
      newRecords.push(calculateDailyWorkRecord(w,workDate,8,'가상 IT 이벤트 운영지원',{otherAllowance:20000,holidayAllowance:holidays2026[workDate]?Math.round(w.dailyRate*.5):0}))
    }
    const tx=this.requireDb().transaction([STORES.attendanceMonthlySummaries,STORES.attendanceDailyRecords,STORES.dailyWorkRecords],'readwrite'),done=txDone(tx)
    additions.forEach(r=>tx.objectStore(STORES.attendanceMonthlySummaries).put(r));[...newDaily,...issueDays].forEach(r=>tx.objectStore(STORES.attendanceDailyRecords).put(r));newRecords.forEach(r=>tx.objectStore(STORES.dailyWorkRecords).put(r));await done
    await this.upgradeDemoScenarios()
    if(!c.demoHistoryVersion){const runs=await this.listPayrollRuns();for(let n=0;n<21;n++){const period=`${2025+Math.floor(n/12)}-${String(n%12+1).padStart(2,'0')}`;if(!runs.some(r=>r.period===period)){const run=await this.createPayrollRun({period,payDate:`${period}-25`,note:'가상 월별 실습 급여'},true);await this.calculatePayrollRun(run.id)}}await this.put(STORES.company,{...(await this.getCompany()),demoHistoryVersion:1,demoPayrollVersion:1})}
    if(!(await this.getCompany()).demoPayrollVersion){
      const runs=(await this.listPayrollRuns()).filter(r=>r.note==='가상 월별 실습 급여'),items=await this.listPayrollItemMasters(),leaves=await this.listLeaveCases(),dependents=await this.getAll<Dependent>(STORES.dependents)
      const edits:PayrollEntry[]=[],results:PayrollResult[]=[]
      for(const run of runs)for(const entry of await this.listPayrollEntries(run.id)){
        if(['CONFIRMED','CLOSED','PAID'].includes(run.status)||entry.memo||entry.incomeTaxManual!==0||entry.taxableAllowance||entry.bonus||entry.overtimePay||entry.otherEarnings||entry.nonTaxableAllowance||entry.unpaidDeduction||entry.otherDeductions||Object.keys(entry.itemAmounts??{}).length)continue
        const {entry:next,result}=this.demoEntry(entry,run,items,leaves,dependents)
        edits.push(next);results.push(result)
      }
      const company=await this.getCompany(),tx=this.requireDb().transaction([STORES.payrollEntries,STORES.payrollResults,STORES.company,STORES.auditLogs],'readwrite'),done=txDone(tx)
      edits.forEach(e=>tx.objectStore(STORES.payrollEntries).put(e));results.forEach(r=>tx.objectStore(STORES.payrollResults).put(r));tx.objectStore(STORES.company).put({...company,demoPayrollVersion:1});tx.objectStore(STORES.auditLogs).put({id:'AUD-DEMO-TAX-V073',occurredAt:new Date().toISOString(),actor:'HR_ADMIN',action:'UPGRADE_GENERATED_DEMO_PAYROLL',entityType:'PAYROLL_ENTRY',entityId:'DEMO',detail:JSON.stringify({count:edits.length,scope:'untouched generated entries only',taxSource:'소득세법 시행령 별표2 2026.2.27'})});await done
    }
    const historical=(await this.listPayrollRuns()).filter(r=>r.note==='가상 월별 실습 급여'&&r.period>='2025-01'&&r.period<='2026-09'&&!['CONFIRMED','CLOSED','PAID'].includes(r.status))
    if(historical.length){
      // Validate snapshots once and atomically install the historical demo baseline.
      const allEntries=await this.getAll<PayrollEntry>(STORES.payrollEntries),allResults=await this.getAll<PayrollResult>(STORES.payrollResults)
      const attendance=await this.listAttendanceMonthlySummaries(),nextRuns:PayrollRun[]=[],now=new Date().toISOString()
      for(const run of historical){
        const entries=allEntries.filter(e=>e.runId===run.id),results=allResults.filter(r=>r.runId===run.id),rows=attendance.filter(r=>r.period===run.period)
        if(!entries.length||entries.some(e=>!rows.some(r=>r.employmentId===e.employmentId)))throw new Error(`${run.period}: 급여 대상자의 근태가 누락되었습니다.`)
        let latest=run
        const reusable=run.status!=='DRAFT'&&!run.attendanceStale&&results.length===entries.length&&results.every(r=>!r.errors.length)&&entries.every(e=>e.status==='CALCULATED')
        if(!reusable){const validation=await this.validatePayrollRun(run.id);if(validation.errors)throw new Error(`${run.period}: 급여 입력 오류를 먼저 수정하세요.`);latest=(await this.getPayrollRun(run.id))!}
        nextRuns.push({...latest,status:'PAID',validatedAt:latest.validatedAt??now,confirmedAt:latest.confirmedAt??now,closedAt:latest.closedAt??now,paidAt:`${latest.payDate}T09:00:00+09:00`})
      }
      const company=await this.getCompany(),attendanceClosed={...company.attendanceClosed};nextRuns.forEach(r=>attendanceClosed[r.period]=now)
      const tx=this.requireDb().transaction([STORES.payrollRuns,STORES.attendanceMonthlySummaries,STORES.company,STORES.leaveCases,STORES.auditLogs],'readwrite'),done=txDone(tx)
      nextRuns.forEach(r=>tx.objectStore(STORES.payrollRuns).put(r))
      attendance.filter(r=>nextRuns.some(run=>run.period===r.period)&&!r.confirmedAt).forEach(r=>tx.objectStore(STORES.attendanceMonthlySummaries).put({...r,confirmedAt:now,confirmedBy:'HR_ADMIN'}))
      tx.objectStore(STORES.company).put({...company,attendanceClosed})
      tx.objectStore(STORES.auditLogs).put({id:`AUD-${crypto.randomUUID()}`,occurredAt:now,actor:'HR_ADMIN',action:'INITIALIZE_PAID_DEMO_HISTORY',entityType:'PAYROLL_RUN',entityId:nextRuns.map(r=>r.id).join(','),detail:JSON.stringify({periods:nextRuns.map(r=>r.period),validation:'complete results without errors',status:'PAID'})})
      await done
    }
    await this.upgradeDemoScenarios()
    await repairDemoOperations(this.requireDb(),await this.listEmployees())
    await seedLemonRetirement(this.requireDb(),await this.listEmployees())
  }
  private async upgradeDemoScenarios(){
    const company=await this.getCompany();if((company.demoScenarioVersion??0)>=3||await this.getOne(STORES.meta,'importedData'))return
    const employees=await this.listEmployees(),calendar=(await this.operations()).calendarEvents,daily=await this.listAttendanceDailyRecords(),summaries=await this.listAttendanceMonthlySummaries(),runs=await this.listPayrollRuns(),now=new Date().toISOString(),days:AttendanceDailyRecord[]=[],months:AttendanceMonthlySummary[]=[]
    const summaryMap=new Map(summaries.map(r=>[r.employmentId+'|'+r.period,r]));const existing=new Map(daily.map(r=>[r.employmentId+'|'+r.workDate,r])),closed=(period:string)=>company.attendanceClosed?.[period]||runs.some(r=>r.period===period&&['CONFIRMED','CLOSED','PAID'].includes(r.status))
    for(const e of employees){const byMonth=new Map<string,AttendanceDailyRecord[]>();for(let time=new Date('2026-01-01T00:00:00Z');time.toISOString().slice(0,10)<=seoulDate();time.setUTCDate(time.getUTCDate()+1)){const date=time.toISOString().slice(0,10),period=date.slice(0,7),summary=summaryMap.get(e.employmentId+'|'+period);if(e.hireDate>date||e.terminationDate&&e.terminationDate<date||closed(period)||summary?.confirmedAt||summary?.manualEdited)continue;const old=existing.get(e.employmentId+'|'+date);const row=old&&(old.updatedBy!=='DEMO'||old.manualEdited||old.confirmedAt)?old:correctedDemoDay(e,date,employees,calendar);if(row!==old)days.push({...row,id:old?.id??row.id});byMonth.set(period,[...(byMonth.get(period)??[]),row])}for(const [period,rows] of byMonth){const old=summaryMap.get(e.employmentId+'|'+period);if(old)months.push(summaryFromDaily(old,rows))}}
    const leaves=await this.listLeaveCases(),added:LeaveCase[]=[],ids=scenarioIds(employees)
    const add=(key:string,kind:LeaveCase['kind'],startDate:string,endDate:string,companyPayRate:number,note:string)=>added.push({id:'LC-DEMO-V074-'+key,employmentId:ids[key],kind,startDate,endDate,companyPayRate,pensionExceptionApproved:false,healthDeferred:false,healthPremiumOverride:null,employmentBaseOverride:null,benefitAmount:0,averageWageExcluded:kind==='MATERNITY',yearEndNote:'회사 고정수당 계속 지급',note,updatedAt:new Date().toISOString()})
    add('maternity','MATERNITY','2026-07-19','2026-09-16',1,'출산전후휴가 최초 60일 · 회사 통상임금 지급')
    added.push({...added[0],id:'LC-DEMO-V074-maternity-benefit',startDate:'2026-09-17',endDate:'2026-10-16',companyPayRate:0,benefitAmount:2200000,note:'출산전후휴가 나머지 30일 · 고용보험 급여 예상 상한 · 회사 고정수당 별도 지급'})
    add('parental','PARENTAL','2026-07-01','2026-09-30',0,'육아휴직 3개월 · 회사 고정수당 지급 · 고용보험 급여 별도 신청')
    added[added.length-1].benefitAmount=2500000;added[added.length-1].pensionExceptionApproved=true;added[added.length-1].healthDeferred=true
    add('unpaid','SICK','2026-10-02','2026-10-02',0,'감기 · 무급병가 · 고정수당 지급')
    add('absent','PERSONAL','2026-10-02','2026-10-02',0,'무단 결근 · 고정수당 지급')
    add('family','FAMILY_CARE','2026-10-02','2026-10-02',0,'부모 병원 동행 · 무급 가족돌봄휴가 · 고정수당 지급')
    add('fertility','PERSONAL','2026-09-09','2026-09-14',0,'난임치료휴가 무급 4근무일 · 주말은 차감 제외')
    added[added.length-1].endDate='2026-09-11';added.push({...added[added.length-1],id:'LC-DEMO-V074-fertility-last',startDate:'2026-09-14',endDate:'2026-09-14'})
    const safeAdded=added.filter(l=>!leaves.some(old=>old.id===l.id||old.employmentId===l.employmentId&&old.startDate<=(l.endDate??'9999-12-31')&&(old.endDate??'9999-12-31')>=l.startDate)&&!runs.some(r=>r.period>=l.startDate.slice(0,7)&&r.period<=(l.endDate??'9999-12-31').slice(0,7)&&['CONFIRMED','CLOSED','PAID'].includes(r.status)))
    const tx=this.requireDb().transaction([STORES.attendanceDailyRecords,STORES.attendanceMonthlySummaries,STORES.company,STORES.leaveCases,STORES.auditLogs],'readwrite'),done=txDone(tx);safeAdded.forEach(r=>tx.objectStore(STORES.leaveCases).put(r));days.forEach(r=>tx.objectStore(STORES.attendanceDailyRecords).put(r));months.forEach(r=>tx.objectStore(STORES.attendanceMonthlySummaries).put(r));tx.objectStore(STORES.company).put({...company,demoScenarioVersion:3});tx.objectStore(STORES.auditLogs).put({id:crypto.randomUUID(),occurredAt:now,actor:'SYSTEM',action:'ADD_UNCONFIRMED_DEMO_SCENARIOS_V7',entityType:'ATTENDANCE',entityId:'DEMO',detail:JSON.stringify({daily:days.length,months:months.length,protected:'master / confirmed / closed / manual / imported'})});await done
  }
  async listAttendanceDailyRecords():Promise<AttendanceDailyRecord[]> { return this.getAll(STORES.attendanceDailyRecords) }
  async listLeaveCases():Promise<LeaveCase[]> { return this.getAll(STORES.leaveCases) }

  async saveAttendanceBatch(summaries:AttendanceMonthlySummary[], daily:AttendanceDailyRecord[], reason:string):Promise<void> {
    if(!reason.trim()) throw new Error('수정 사유를 입력하세요.')
    const employees=await this.listEmployees()
    const employeeMap=new Map(employees.map(e=>[e.employmentId,e]))
    const runs=await this.listPayrollRuns()
    const existing=await this.listAttendanceMonthlySummaries()
    const now=new Date().toISOString()
    const company=await this.getCompany();if([...summaries.map(r=>r.period),...daily.map(r=>r.workDate.slice(0,7))].some(p=>company.attendanceClosed?.[p]))throw new Error('근태 마감월은 수정할 수 없습니다.')
    const periods=new Set([...summaries.map(r=>r.period),...daily.map(r=>r.workDate.slice(0,7))])
    if(runs.some(r=>periods.has(r.period)&&['CONFIRMED','CLOSED','PAID'].includes(r.status))) throw new Error('확정·마감 급여월 근태는 수정할 수 없습니다. 정정 급여 절차가 필요합니다.')
    for(const d of daily)if(existing.some(r=>r.employmentId===d.employmentId&&r.period===d.workDate.slice(0,7)&&r.confirmedAt))throw new Error('확정된 월의 일별 근태는 수정할 수 없습니다.')
    const seen=new Set<string>()
    const next:AttendanceMonthlySummary[]=summaries.map(r=>{
      const e=employeeMap.get(r.employmentId);if(!e)throw new Error('사번에 해당하는 직원을 찾을 수 없습니다.')
      if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(r.period))throw new Error('귀속월 형식을 확인하세요.')
      const key=`${r.employmentId}-${r.period}`;if(seen.has(key))throw new Error('직원·귀속월이 중복되었습니다.');seen.add(key)
      const old=existing.find(x=>x.employmentId===r.employmentId&&x.period===r.period)
      if(old?.confirmedAt)throw new Error('확정된 근태는 수정할 수 없습니다.')
      const values=[r.scheduledHours,r.workedHours,r.overtimeHours,r.nightHours,r.holidayHours,r.leaveDays,r.absenceHours,r.lateMinutes,r.earlyLeaveMinutes]
      if(values.some(v=>!Number.isFinite(v)||v<0)||r.workedHours>744||r.nightHours>r.workedHours||r.holidayHours>r.workedHours||r.overtimeHours>r.workedHours)throw new Error('근태 합계·수당시간 범위를 확인하세요.')
      return {...r,confirmedAt:old?.confirmedAt,confirmedBy:old?.confirmedBy,id:old?.id??`ATT-${key}`,organizationNameSnapshot:old?.organizationNameSnapshot??e.organizationName,gradeSnapshot:old?.gradeSnapshot??e.grade,jobSnapshot:old?.jobSnapshot??e.job,manualEdited:true,revision:(old?.revision??0)+1,updatedAt:now,updatedBy:'HR_ADMIN',editReason:reason}
    })
    const dailySeen=new Set<string>()
    const calendar=(await this.operations()).calendarEvents
    const nextDaily=daily.map(r=>{
      const e=employeeMap.get(r.employmentId)
      if(!e||!/^\d{4}-\d{2}-\d{2}$/.test(r.workDate)||new Date(r.workDate+'T00:00:00Z').toISOString().slice(0,10)!==r.workDate||r.workDate<e.hireDate||(e.terminationDate&&r.workDate>e.terminationDate))throw new Error('근무일과 재직기간을 확인하세요.')
      const key=`${r.employmentId}-${r.workDate}`;if(dailySeen.has(key))throw new Error('직원·근무일이 중복되었습니다.');dailySeen.add(key)
      const policy=dayPolicy(r.workDate,calendar,e),effective={...r,holiday:r.holiday||policy.off};return {...effective,...calculateAttendanceDay(effective),manualEdited:true,source:'MANUAL',exceptionWork:policy.off&&r.workedHours>0,id:`ATTD-${key}`,updatedAt:now,updatedBy:'HR_ADMIN',editReason:reason}
    })
    const existingDaily=await this.listAttendanceDailyRecords();const mergedDaily=new Map(existingDaily.map(r=>[r.employmentId+'|'+r.workDate,r]));nextDaily.forEach(r=>mergedDaily.set(r.employmentId+'|'+r.workDate,r));for(const r of nextDaily){const period=r.workDate.slice(0,7);if(next.some(n=>n.employmentId===r.employmentId&&n.period===period))continue;const e=employeeMap.get(r.employmentId)!;const old=existing.find(n=>n.employmentId===r.employmentId&&n.period===period)??{id:`ATT-${r.employmentId}-${period}`,employmentId:r.employmentId,period,organizationNameSnapshot:e.organizationName,gradeSnapshot:e.grade,jobSnapshot:e.job,scheduledHours:0,workedHours:0,overtimeHours:0,nightHours:0,holidayHours:0,leaveDays:0,absenceHours:0,lateMinutes:0,earlyLeaveMinutes:0};next.push({...summaryFromDaily(old,[...mergedDaily.values()].filter(d=>d.employmentId===r.employmentId&&d.workDate.startsWith(period))),manualEdited:true,updatedBy:'HR_ADMIN',updatedAt:now,editReason:reason})}
    const tx=this.requireDb().transaction([STORES.attendanceMonthlySummaries,STORES.attendanceDailyRecords,STORES.payrollRuns,STORES.payrollResults,STORES.auditLogs],'readwrite');const done=txDone(tx)
    next.forEach(r=>tx.objectStore(STORES.attendanceMonthlySummaries).put(r));nextDaily.forEach(r=>tx.objectStore(STORES.attendanceDailyRecords).put(r))
    runs.filter(r=>periods.has(r.period)).forEach(r=>{tx.objectStore(STORES.payrollRuns).put({...r,status:'DRAFT',attendanceStale:true,validatedAt:null,calculatedAt:null});})
    const affected=new Set(runs.filter(r=>periods.has(r.period)).map(r=>r.id))
    const resultReq=tx.objectStore(STORES.payrollResults).openCursor();resultReq.onsuccess=()=>{const c=resultReq.result;if(c){if(affected.has(c.value.runId))c.delete();c.continue()}}
    tx.objectStore(STORES.auditLogs).put({id:`AUD-${crypto.randomUUID()}`,occurredAt:now,actor:'HR_ADMIN',action:'EDIT_ATTENDANCE',entityType:'ATTENDANCE',entityId:[...periods].join(','),detail:JSON.stringify({reason,before:existing.filter(r=>next.some(n=>n.id===r.id)),after:next,daily:nextDaily})})
    await done
  }

  async saveLeaveCase(row:LeaveCase):Promise<void> {
    if(!row.note.trim())throw new Error('휴직 처리 근거를 입력하세요.')
    if(!Number.isFinite(row.companyPayRate)||row.companyPayRate<0||row.companyPayRate>1||!Number.isFinite(row.benefitAmount)||row.benefitAmount<0)throw new Error('휴직 지급비율·지원액을 확인하세요.')
    if(!/^\d{4}-\d{2}-\d{2}$/.test(row.startDate)||new Date(row.startDate+'T00:00:00Z').toISOString().slice(0,10)!==row.startDate||(row.endDate&&(!/^\d{4}-\d{2}-\d{2}$/.test(row.endDate)||new Date(row.endDate+'T00:00:00Z').toISOString().slice(0,10)!==row.endDate)))throw new Error('휴직 날짜 형식을 확인하세요.')
    for(const n of [row.healthPremiumOverride,row.employmentBaseOverride])if(n!==null&&(!Number.isFinite(n)||n<0))throw new Error('보험 고지값은 0 이상의 숫자여야 합니다.')
    if(row.endDate&&row.endDate<row.startDate)throw new Error('휴직 종료일을 확인하세요.')
    if(!(await this.listEmployees()).some(e=>e.employmentId===row.employmentId))throw new Error('직원을 찾을 수 없습니다.')
    const existing=await this.listLeaveCases()
    const end=row.endDate??'9999-12-31'
    if(existing.some(x=>x.id!==row.id&&x.employmentId===row.employmentId&&x.startDate<=end&&(x.endDate??'9999-12-31')>=row.startDate))throw new Error('동일 직원의 휴직기간이 중복됩니다.')
    const old=existing.find(r=>r.id===row.id)
    const runs=(await this.listPayrollRuns()).filter(r=>(r.period>=row.startDate.slice(0,7)&&r.period<=end.slice(0,7))||(old&&r.period>=old.startDate.slice(0,7)&&r.period<=(old.endDate??'9999-12-31').slice(0,7)))
    if(runs.some(r=>['CONFIRMED','CLOSED','PAID'].includes(r.status)))throw new Error('확정·마감월 휴직정보는 변경할 수 없습니다.')
    const tx=this.requireDb().transaction([STORES.leaveCases,STORES.payrollRuns,STORES.payrollResults,STORES.auditLogs],'readwrite');const done=txDone(tx)
    tx.objectStore(STORES.leaveCases).put({...row,updatedAt:new Date().toISOString()})
    runs.forEach(r=>tx.objectStore(STORES.payrollRuns).put({...r,status:'DRAFT',attendanceStale:true,validatedAt:null,calculatedAt:null}))
    const ids=new Set(runs.map(r=>r.id));const req=tx.objectStore(STORES.payrollResults).openCursor();req.onsuccess=()=>{const c=req.result;if(c){if(ids.has(c.value.runId))c.delete();c.continue()}}
    tx.objectStore(STORES.auditLogs).put({id:`AUD-${crypto.randomUUID()}`,occurredAt:new Date().toISOString(),actor:'HR_ADMIN',action:'EDIT_LEAVE_CASE',entityType:'LEAVE_CASE',entityId:row.id,detail:JSON.stringify({before:existing.find(x=>x.id===row.id),after:row})})
    await done
  }

  async restorePayrollSettings():Promise<void> {
    const history=await this.getOne<{id:string;items:PayrollItemMaster[]}>(STORES.payrollSettingsHistory,'previous')
    if(!history)throw new Error('복원할 이전 양식이 없습니다.')
    await this.savePayrollSettings(history.items)
  }
  async savePayrollSettings(items:PayrollItemMaster[]):Promise<void> {
    items.forEach(validateItemCalculation)
    const before=await this.listPayrollItemMasters(),runs=(await this.listPayrollRuns()).filter(r=>!['CONFIRMED','CLOSED','PAID'].includes(r.status)),now=new Date().toISOString()
    const affected=new Set(runs.map(r=>r.id))
    const tx=this.requireDb().transaction([STORES.payrollItemMasters,STORES.payrollSettingsHistory,STORES.payrollRuns,STORES.payrollResults,STORES.auditLogs],'readwrite');const done=txDone(tx)
    tx.objectStore(STORES.payrollSettingsHistory).put({id:'previous',items:before})
    items.forEach(i=>tx.objectStore(STORES.payrollItemMasters).put({...i,updatedAt:now}))
    runs.forEach(r=>tx.objectStore(STORES.payrollRuns).put({...r,itemSnapshot:undefined,itemOverrides:undefined,status:'DRAFT',calculatedAt:null,validatedAt:null}))
    const cursor=tx.objectStore(STORES.payrollResults).openCursor();cursor.onsuccess=()=>{const c=cursor.result;if(c){if(affected.has(c.value.runId))c.delete();c.continue()}}
    tx.objectStore(STORES.auditLogs).put({id:`AUD-${crypto.randomUUID()}`,occurredAt:now,actor:'HR_ADMIN',action:'UPDATE_PAYROLL_SETTINGS',entityType:'PAYROLL_SETTINGS',entityId:'master',detail:JSON.stringify({before,after:items})})
    await done
  }
  async listAttendanceMonthlySummaries(): Promise<AttendanceMonthlySummary[]> {
    return (await this.getAll<AttendanceMonthlySummary>(STORES.attendanceMonthlySummaries)).sort((a,b)=>b.period.localeCompare(a.period))
  }

  async saveAnnualLeaveBatch(rows:AnnualLeaveLedger[],reason:string):Promise<void>{
    if(!reason.trim())throw new Error('연차 수정 사유를 입력하세요.')
    const employees=await this.listEmployees(),existing=await this.listAnnualLeaveLedgers();const seen=new Set<string>(),now=new Date().toISOString()
    const next=rows.map(r=>{if(!employees.some(e=>e.employmentId===r.employmentId)||!Number.isInteger(r.year)||r.year<1900||r.year>2100)throw new Error('연차 개인·연도를 확인하세요.');const key=`${r.employmentId}-${r.year}`;if(seen.has(key))throw new Error('중복된 연차 개인·연도입니다.');seen.add(key);if([r.grantedDays,r.carriedDays,r.adjustedDays,r.usedDays].some(v=>!Number.isFinite(v))||r.grantedDays<0||r.carriedDays<0||r.usedDays<0)throw new Error('연차 발생·이월·사용은 0 이상, 조정은 유한한 숫자여야 합니다.');const remainingDays=r.grantedDays+r.carriedDays+r.adjustedDays-r.usedDays;if(remainingDays<0)throw new Error('사용일수가 총 보유 연차를 초과합니다.');const old=existing.find(e=>e.employmentId===r.employmentId&&e.year===r.year);if(old?.confirmedAt)throw new Error('확정된 연차는 수정할 수 없습니다.');return {...r,confirmedAt:old?.confirmedAt,confirmedBy:old?.confirmedBy,id:old?.id??`AL-${key}`,remainingDays,manualEdited:true,updatedAt:now,updatedBy:'HR_ADMIN',editReason:reason}})
    const tx=this.requireDb().transaction([STORES.annualLeaveLedgers,STORES.auditLogs],'readwrite'),done=txDone(tx)
    next.forEach(r=>tx.objectStore(STORES.annualLeaveLedgers).put(r));tx.objectStore(STORES.auditLogs).put({id:`AUD-${crypto.randomUUID()}`,occurredAt:now,actor:'HR_ADMIN',action:'EDIT_ANNUAL_LEAVE',entityType:'ANNUAL_LEAVE',entityId:[...seen].join(','),detail:JSON.stringify({reason,before:existing.filter(r=>next.some(n=>n.id===r.id)),after:next})});await done
  }
  async listAnnualLeaveLedgers(): Promise<AnnualLeaveLedger[]> {
    return (await this.getAll<AnnualLeaveLedger>(STORES.annualLeaveLedgers)).sort((a,b)=>b.year-a.year)
  }

  async listDailyWorkers(): Promise<DailyWorker[]> {
    return (await this.getAll<DailyWorker>(STORES.dailyWorkers)).sort((a,b)=>a.workerNumber.localeCompare(b.workerNumber))
  }

  async listDailyWorkRecords(): Promise<DailyWorkRecord[]> {
    return (await this.getAll<DailyWorkRecord>(STORES.dailyWorkRecords)).sort((a,b)=>b.workDate.localeCompare(a.workDate))
  }

  async saveDailyWorkersBatch(workers:DailyWorker[]):Promise<void>{
    const mappings=(await this.operations()).occupationCodeMappings,company=await this.getCompany();const existing=await this.listDailyWorkers(),records=await this.listDailyWorkRecords(),orgs=await this.listOrganizations(),seen=new Set<string>()
    const validDate=(d:string)=>/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d))&&new Date(d).toISOString().slice(0,10)===d
    const next=workers.map(w=>{const old=existing.find(e=>e.id===w.id);if(!old||seen.has(w.id))throw new Error('중복·잘못된 일용직입니다.');seen.add(w.id);if(records.some(r=>r.dailyWorkerId===w.id&&r.confirmedAt))throw new Error('확정된 근무기록이 있는 일용직 정보는 수정할 수 없습니다.');if(!orgs.some(o=>o.id===w.organizationId)||!w.job.trim()||!['ACTIVE','ENDED'].includes(w.status))throw new Error('일용직 조직·직무·상태를 확인하세요.');if(!Number.isFinite(w.dailyRate)||w.dailyRate<0||!validDate(w.startDate)||(w.endDate&&(!validDate(w.endDate)||w.endDate<w.startDate)))throw new Error('일용직 일급·기간을 확인하세요.');if(records.some(r=>r.dailyWorkerId===w.id&&(r.workDate<w.startDate||(w.endDate&&r.workDate>w.endDate))))throw new Error('기존 근무기록을 포함하는 근무기간으로 입력하세요.');return {...w,occupationCode:w.occupationCodeManual?w.occupationCode:occupationCode(mappings,w.startDate,w.organizationId,w.job,company.reportingInfo?.occupationCode??defaultCompanyInfo.occupationCode),personId:old.personId,workerNumber:old.workerNumber,workerNameSnapshot:old.workerNameSnapshot}})
    const tx=this.requireDb().transaction([STORES.dailyWorkers,STORES.auditLogs],'readwrite'),done=txDone(tx);next.forEach(w=>tx.objectStore(STORES.dailyWorkers).put(w));tx.objectStore(STORES.auditLogs).put({id:`AUD-${crypto.randomUUID()}`,occurredAt:new Date().toISOString(),actor:'HR_ADMIN',action:'EDIT_DAILY_WORKERS',entityType:'DAILY_WORKER',entityId:[...seen].join(','),detail:JSON.stringify({before:existing.filter(w=>seen.has(w.id)),after:next})});await done
  }
  async upsertDailyWorker(worker:DailyWorker):Promise<DailyWorker>{await this.saveDailyWorkersBatch([worker]);return worker}

  async createDailyWorker(input: DailyWorkerInput): Promise<DailyWorker> {
    if (!input.name.trim()) throw new Error('일용직 성명을 입력하세요.')
    const personId=input.personId ?? `PER-DW-${crypto.randomUUID()}`
    const id=input.id ?? `DW-${crypto.randomUUID()}`
    const existingNumbers=new Set((await this.listDailyWorkers()).map(v=>v.workerNumber))
    const workerNumber=input.workerNumber?.trim() || `D${String(existingNumbers.size+1).padStart(4,'0')}`
    if(existingNumbers.has(workerNumber)) throw new Error('이미 사용 중인 일용직 번호입니다.')
    const person:Person={id:personId,fullName:input.name.trim(),englishName:'',hanjaName:'',birthDate:input.birthDate||'1990-01-01',gender:'F',domesticForeignType:'DOMESTIC',nationality:'대한민국',reportingNationality:'대한민국',syntheticIdentifier:`SYN-DW-${crypto.randomUUID().slice(0,8)}`,profileImageUrl:null,mobile:input.mobile,phone:'',email:'',emergencyContactName:'',emergencyContactPhone:'',emergencyContactRelation:''}
    const company=await this.getCompany(),mappings=(await this.operations()).occupationCodeMappings
    const worker:DailyWorker={occupationCode:occupationCode(mappings,input.startDate,input.organizationId,input.job,company.reportingInfo?.occupationCode??defaultCompanyInfo.occupationCode),occupationCodeManual:false,id,personId,workerNumber,workerNameSnapshot:person.fullName,organizationId:input.organizationId,job:input.job,status:input.status,startDate:input.startDate,endDate:input.endDate,dailyRate:input.dailyRate,bankName:input.bankName,accountNumberMasked:input.accountNumberMasked}
    const db=this.requireDb(); const tx=db.transaction([STORES.persons,STORES.dailyWorkers,STORES.auditLogs],'readwrite'); const done=txDone(tx)
    tx.objectStore(STORES.persons).put(person); tx.objectStore(STORES.dailyWorkers).put(worker)
    tx.objectStore(STORES.auditLogs).put({id:`AUD-${crypto.randomUUID()}`,occurredAt:new Date().toISOString(),actor:'HR_ADMIN',action:'CREATE_DAILY_WORKER',entityType:'DAILY_WORKER',entityId:id,detail:`일용직 ${workerNumber} ${person.fullName}을 등록했습니다.`} satisfies AuditLog)
    await done; return worker
  }

  async deleteDailyWorker(workerId:string): Promise<void> {
    const worker=await this.getOne<DailyWorker>(STORES.dailyWorkers,workerId)
    const [records,employments,otherWorkers]=await Promise.all([this.listDailyWorkRecords(),this.getAll<Employment>(STORES.employments),this.listDailyWorkers()])
    const workerRecords=records.filter(r=>r.dailyWorkerId===workerId)
    if(workerRecords.some(r=>r.confirmedAt))throw new Error('확정된 기록이 있는 일용직은 삭제할 수 없습니다.')
    const canDeletePerson=!!worker && !employments.some(e=>e.personId===worker.personId) && !otherWorkers.some(w=>w.id!==workerId&&w.personId===worker.personId)
    const db=this.requireDb(); const tx=db.transaction([STORES.persons,STORES.dailyWorkers,STORES.dailyWorkRecords,STORES.auditLogs],'readwrite'); const done=txDone(tx)
    tx.objectStore(STORES.dailyWorkers).delete(workerId); workerRecords.forEach(r=>tx.objectStore(STORES.dailyWorkRecords).delete(r.id)); if(worker&&canDeletePerson) tx.objectStore(STORES.persons).delete(worker.personId)
    tx.objectStore(STORES.auditLogs).put({id:`AUD-${crypto.randomUUID()}`,occurredAt:new Date().toISOString(),actor:'HR_ADMIN',action:'DELETE_DAILY_WORKER',entityType:'DAILY_WORKER',entityId:workerId,detail:'일용직과 근무기록 및 전용 Person 데이터를 삭제했습니다.'} satisfies AuditLog)
    await done
  }

  async saveDailyWorkRecordsBatch(records:DailyWorkRecord[]):Promise<void>{
    const company=await this.getCompany();if(records.some(r=>company.dailyClosed?.[r.workDate.slice(0,7)]))throw new Error('마감된 일용직 귀속월에는 자료를 추가·수정할 수 없습니다.')
    const existing=await this.listDailyWorkRecords()
    if(records.some(r=>existing.some(o=>o.dailyWorkerId===r.dailyWorkerId&&o.workDate===r.workDate&&o.confirmedAt)))throw new Error('확정된 일용직 근무·수당은 수정할 수 없습니다.')
    const tx=this.requireDb().transaction([STORES.dailyWorkRecords,STORES.auditLogs],'readwrite');const done=txDone(tx)
    records.forEach(r=>tx.objectStore(STORES.dailyWorkRecords).put({...r,confirmedAt:undefined,confirmedBy:undefined}))
    tx.objectStore(STORES.auditLogs).put({id:`AUD-${crypto.randomUUID()}`,occurredAt:new Date().toISOString(),actor:'HR_ADMIN',action:'UPDATE_DAILY_WORK_RECORDS',entityType:'DAILY_WORK_RECORD',entityId:records.map(r=>r.id).join(','),detail:JSON.stringify({before:existing.filter(r=>records.some(n=>n.id===r.id)),after:records})})
    await done
  }
  async upsertDailyWorkRecord(record:DailyWorkRecord): Promise<DailyWorkRecord> { await this.saveDailyWorkRecordsBatch([record]); return record }
  async deleteDailyWorkRecord(recordId:string): Promise<void> {
    if((await this.getOne<DailyWorkRecord>(STORES.dailyWorkRecords,recordId))?.confirmedAt)throw new Error('확정된 기록은 삭제할 수 없습니다.'); await this.deleteOne(STORES.dailyWorkRecords,recordId) }

  private async saveManualLedger(store:string,rows:unknown[],before:unknown[],reason:string):Promise<void>{
    const tx=this.requireDb().transaction([store,STORES.auditLogs],'readwrite'),done=txDone(tx);rows.forEach(r=>tx.objectStore(store).put(r));tx.objectStore(STORES.auditLogs).put({id:`AUD-${crypto.randomUUID()}`,occurredAt:new Date().toISOString(),actor:'HR_ADMIN',action:'EDIT_MANUAL_LEDGER',entityType:store,entityId:store,detail:JSON.stringify({reason,before,after:rows})});await done
  }
  async saveRetirementBatch(rows:RetirementSettlement[],reason:string):Promise<void>{
    if(!reason.trim())throw new Error('퇴직정산 수정 사유를 입력하세요.');const employees=await this.listEmployees(),existing=await this.listRetirementSettlements(),seen=new Set<string>()
    const next=rows.map(r=>{const e=employees.find(e=>e.employmentId===r.employmentId);if(!e?.terminationDate||r.terminationDate!==e.terminationDate)throw new Error('직원 퇴사일을 확인하세요.');if(existing.some(x=>x.employmentId===r.employmentId&&x.status==='CONFIRMED'))throw new Error('확정된 퇴직정산은 수정할 수 없습니다.');if(seen.has(r.employmentId))throw new Error('중복 퇴직정산입니다.');seen.add(r.employmentId);if(r.planType&&!['DB','DC'].includes(r.planType))throw new Error('DB 또는 DC 제도를 선택하세요.');if([r.dcAnnualWages,r.dcAdditionalWages,r.dcPaidContribution,r.dcAccountBalance,r.dcExcludedMonths,r.dcExcludedWages,r.dcPriorAnnualContribution,r.weeklyContractHours].some(v=>v!=null&&(!Number.isFinite(v)||v<0))||(r.dcExcludedMonths??0)>12)throw new Error('DC 부담금 기초자료를 확인하세요.');if([r.serviceDays,r.averageDailyWage,r.ordinaryDailyWage,r.appliedDailyWage,r.retirementPay].some(v=>!Number.isFinite(v)||v<0)||!Number.isInteger(r.serviceDays))throw new Error('퇴직정산 숫자를 확인하세요.');if(!/^\d{4}-\d{2}-\d{2}$/.test(r.calculationDate)||!Number.isFinite(Date.parse(r.calculationDate))||new Date(r.calculationDate).toISOString().slice(0,10)!==r.calculationDate)throw new Error('계산일을 확인하세요.');return {...r,id:existing.find(x=>x.employmentId===r.employmentId)?.id??`RET-${r.employmentId}`,status:'DRAFT' as const,manualEdited:true,updatedAt:new Date().toISOString(),editReason:reason}})
    await this.saveManualLedger(STORES.retirementSettlements,next,existing.filter(r=>seen.has(r.employmentId)),reason)
  }
  async saveYearEndBatch(rows:YearEndTaxCase[],reason:string):Promise<void>{
    if(!reason.trim())throw new Error('연말정산 수정 사유를 입력하세요.');const employees=await this.listEmployees(),existing=await this.getAll<YearEndTaxCase>(STORES.yearEndTaxCases),seen=new Set<string>()
    const next=rows.map(r=>{if(!employees.some(e=>e.employmentId===r.employmentId)||!Number.isInteger(r.taxYear)||r.taxYear<1900||r.taxYear>2100)throw new Error('연말정산 개인·연도를 확인하세요.');const key=`${r.employmentId}-${r.taxYear}`,old=existing.find(x=>x.employmentId===r.employmentId&&x.taxYear===r.taxYear);if(old?.status==='CONFIRMED')throw new Error('확정된 연말정산은 수정할 수 없습니다.');if(seen.has(key))throw new Error('중복된 연말정산입니다.');seen.add(key);if([r.grossPay,r.incomeTaxWithheld,r.localTaxWithheld,r.basicDeductionCount,r.childCount,...(r.estimatedFinalTax===null?[]:[r.estimatedFinalTax])].some(v=>!Number.isFinite(v)||v<0)||!Number.isInteger(r.basicDeductionCount)||!Number.isInteger(r.childCount))throw new Error('연말정산 숫자를 확인하세요.');return {...r,id:old?.id??`YET-${key}`,settlementAmount:r.estimatedFinalTax===null?null:r.estimatedFinalTax-r.incomeTaxWithheld,status:'REVIEW' as const,manualEdited:true,updatedAt:new Date().toISOString(),editReason:reason}})
    await this.saveManualLedger(STORES.yearEndTaxCases,next,existing.filter(r=>seen.has(`${r.employmentId}-${r.taxYear}`)),reason)
  }
  async listRetirementSettlements(): Promise<RetirementSettlement[]> { return this.getAll<RetirementSettlement>(STORES.retirementSettlements) }
  async calculateRetirementSettlement(employmentId:string): Promise<RetirementSettlement> {
    const employee=await this.getEmployee(employmentId); if(!employee) throw new Error('직원을 찾을 수 없습니다.')
    if(!employee.terminationDate) throw new Error('퇴직일이 등록된 직원만 퇴직정산할 수 있습니다.')
    if((await this.listRetirementSettlements()).some(r=>r.employmentId===employmentId&&r.status==='CONFIRMED'))throw new Error('확정된 퇴직정산은 재계산할 수 없습니다.')
    const terminationDate=employee.terminationDate
    const [results,runs,entries,settlements]=await Promise.all([this.getAll<PayrollResult>(STORES.payrollResults),this.listPayrollRuns(),this.getAll<PayrollEntry>(STORES.payrollEntries),this.listRetirementSettlements()]);const basis=settlements.find(r=>r.employmentId===employmentId),retirement=retirementByPlan(employee.hireDate,terminationDate,runs,results.filter(r=>r.employmentId===employmentId),entries.filter(e=>e.employmentId===employmentId),basis)
    const row:RetirementSettlement={...basis,id:basis?.id??`RET-${employmentId}`,employmentId,calculationDate:today(),terminationDate,...retirement,status:'DRAFT',ruleVersion:'KR-RBA-2026-DB-DC-1'}
    await this.put(STORES.retirementSettlements,row); return row
  }

  async listYearEndTaxCases():Promise<YearEndTaxCase[]> {
    const saved=await this.getAll<YearEndTaxCase>(STORES.yearEndTaxCases)
    const runs=await this.listPayrollRuns();const results=await this.getAll<PayrollResult>(STORES.payrollResults);const entries=await this.getAll<PayrollEntry>(STORES.payrollEntries)
    const cases=new Map<string,YearEndTaxCase>()
    for(const r of results){const run=runs.find(v=>v.id===r.runId);if(!run||run.status==='DRAFT')continue;const year=Number(run.period.slice(0,4));const key=`${r.employmentId}-${year}`;const e=entries.find(e=>e.runId===run.id&&e.employmentId===r.employmentId);const prior=saved.find(v=>v.employmentId===r.employmentId&&v.taxYear===year)
      const row=cases.get(key)??{id:prior?.id??`YET-${key}`,employmentId:r.employmentId,taxYear:year,grossPay:0,incomeTaxWithheld:0,localTaxWithheld:0,basicDeductionCount:e?.basicDeductionCount??1,childCount:e?.childDeductionCount??0,status:'REVIEW',estimatedFinalTax:null,settlementAmount:null,ruleVersion:PAYROLL_RULE_VERSION}
      row.grossPay+=r.taxableEarnings;row.incomeTaxWithheld+=r.incomeTax;row.localTaxWithheld+=r.localIncomeTax;cases.set(key,row)
    }
    return [...saved.filter(v=>v.manualEdited||!cases.has(`${v.employmentId}-${v.taxYear}`)),...[...cases.values()].filter(v=>!saved.some(s=>s.manualEdited&&s.employmentId===v.employmentId&&s.taxYear===v.taxYear))].sort((a,b)=>b.taxYear-a.taxYear)
  }
  async listPayrollItemMasters():Promise<PayrollItemMaster[]> {
    const rows=(await this.getAll<PayrollItemMaster>(STORES.payrollItemMasters)).map(i=>i.code==='P101'?{ordinaryWage:true,minimumWage:true,pensionIncluded:true,healthIncluded:true,employmentIncluded:true,...i}:i)
    return [...rows,...extraItems.filter(i=>!rows.some(r=>r.code===i.code))].sort((a,b)=>a.sortOrder-b.sortOrder)
  }
  async updatePayrollItemMaster(item:PayrollItemMaster):Promise<PayrollItemMaster>{
    const items=await this.listPayrollItemMasters();await this.savePayrollSettings(items.map(i=>i.id===item.id?item:i));return item
  }

  async listAuditLogs():Promise<AuditLog[]>{return (await this.getAll<AuditLog>(STORES.auditLogs)).sort((a,b)=>b.occurredAt.localeCompare(a.occurredAt))}
  async resetDemo():Promise<void>{await this.seed(createSeedBundle());await this.persistSelectionUpgrade();await this.initializeOperations();await upgradeLemonOperations(this.requireDb(),await this.listEmployees());await repairLemonOccupationMapping(this.requireDb(),await this.listEmployees());await seedWorkRules(this.requireDb());await seedStaffNotices(this.requireDb())}
  private async bundle(): Promise<SeedBundle> {
    const company=await this.getCompany()
    const [organizations,persons,addresses,dependents,visas,bankAccounts,employments,assignments,compensations,taxProfiles,socialInsuranceProfiles,militaryServiceProfiles,educations,careers,certifications,skills,resumes,workSchedules,attendanceSettings,managerRelationships,personnelEvents,auditLogs,payrollRuns,payrollEntries,payrollResults,attendanceMonthlySummaries,annualLeaveLedgers,dailyWorkers,dailyWorkRecords,retirementSettlements,yearEndTaxCases,payrollItemMasters]=await Promise.all([
      this.getAll<Organization>(STORES.organizations),this.getAll<Person>(STORES.persons),this.getAll<Address>(STORES.addresses),
      this.getAll<Dependent>(STORES.dependents),this.getAll<Visa>(STORES.visas),this.getAll<BankAccount>(STORES.bankAccounts),
      this.getAll<Employment>(STORES.employments),this.getAll<Assignment>(STORES.assignments),this.getAll<CompensationSnapshot>(STORES.compensations),
      this.getAll<TaxProfile>(STORES.taxProfiles),this.getAll<SocialInsuranceProfile>(STORES.socialInsuranceProfiles),this.getAll<MilitaryServiceProfile>(STORES.militaryServiceProfiles),this.getAll<Education>(STORES.educations),
      this.getAll<CareerHistory>(STORES.careers),this.getAll<Certification>(STORES.certifications),this.getAll<EmployeeSkill>(STORES.skills),
      this.getAll<ResumeDocument>(STORES.resumes),this.getAll<WorkSchedule>(STORES.workSchedules),this.getAll<AttendanceSetting>(STORES.attendanceSettings),
      this.getAll<ManagerRelationship>(STORES.managerRelationships),this.getAll<PersonnelEvent>(STORES.personnelEvents),this.getAll<AuditLog>(STORES.auditLogs),
      this.getAll<PayrollRun>(STORES.payrollRuns),this.getAll<PayrollEntry>(STORES.payrollEntries),this.getAll<PayrollResult>(STORES.payrollResults),
      this.getAll<AttendanceMonthlySummary>(STORES.attendanceMonthlySummaries),this.getAll<AnnualLeaveLedger>(STORES.annualLeaveLedgers),
      this.getAll<DailyWorker>(STORES.dailyWorkers),this.getAll<DailyWorkRecord>(STORES.dailyWorkRecords),this.getAll<RetirementSettlement>(STORES.retirementSettlements),
      this.getAll<YearEndTaxCase>(STORES.yearEndTaxCases),this.getAll<PayrollItemMaster>(STORES.payrollItemMasters),
    ])
    return {...await this.operations(),attendanceDailyRecords:await this.listAttendanceDailyRecords(),leaveCases:await this.listLeaveCases(),payrollSettingsHistory:await this.getAll(STORES.payrollSettingsHistory),company,organizations,persons,addresses,dependents,visas,bankAccounts,employments,assignments,compensations,taxProfiles,socialInsuranceProfiles,militaryServiceProfiles,educations,careers,certifications,skills,resumes,workSchedules,attendanceSettings,managerRelationships,personnelEvents,auditLogs,payrollRuns,payrollEntries,payrollResults,attendanceMonthlySummaries,annualLeaveLedgers,dailyWorkers,dailyWorkRecords,retirementSettlements,yearEndTaxCases,payrollItemMasters}
  }

  async exportDatabase(): Promise<DatabaseExport> {
    return {exportedAt:new Date().toISOString(),schemaVersion:SCHEMA_VERSION,data:await this.bundle()}
  }

  async importDatabase(payload: DatabaseExport): Promise<void> {
    const raw=payload as unknown as {schemaVersion:number;exportedAt:string;data:Record<string,unknown>}
    if (raw.schemaVersion===1) {
      const legacy=raw.data as unknown as {
        company:Company;organizations:Organization[];persons:Array<Record<string,unknown>>;employments:Employment[];
        assignments:Assignment[];compensations:CompensationSnapshot[];personnelEvents:PersonnelEvent[];auditLogs:AuditLog[]
      }
      const fresh=createSeedBundle()
      const freshPersonMap=new Map(fresh.persons.map((v)=>[v.id,v]))
      const upgradedPersons=legacy.persons.map((old)=>{
        const id=String(old.id)
        const base=freshPersonMap.get(id)
        if (!base) return null
        return {...base,fullName:String(old.fullName??base.fullName),birthDate:String(old.birthDate??base.birthDate),nationality:String(old.nationality??base.nationality),mobile:String(old.mobile??base.mobile),email:String(old.email??base.email),syntheticIdentifier:String(old.syntheticIdentifier??base.syntheticIdentifier)}
      }).filter((v):v is Person=>v!==null)
      const employmentIds=new Set(legacy.employments.map((v)=>v.id)); const personIds=new Set(legacy.employments.map((v)=>v.personId))
      const upgraded: SeedBundle={
        ...fresh, company:legacy.company, organizations:legacy.organizations, persons:upgradedPersons,
        employments:legacy.employments, assignments:legacy.assignments, compensations:legacy.compensations,
        personnelEvents:legacy.personnelEvents, auditLogs:legacy.auditLogs,
        addresses:fresh.addresses.filter((v)=>personIds.has(v.personId)), dependents:fresh.dependents.filter((v)=>employmentIds.has(v.employmentId)),
        visas:fresh.visas.filter((v)=>employmentIds.has(v.employmentId)), bankAccounts:fresh.bankAccounts.filter((v)=>employmentIds.has(v.employmentId)),
        taxProfiles:fresh.taxProfiles.filter((v)=>employmentIds.has(v.employmentId)), socialInsuranceProfiles:fresh.socialInsuranceProfiles.filter((v)=>employmentIds.has(v.employmentId)),
        educations:fresh.educations.filter((v)=>employmentIds.has(v.employmentId)), careers:fresh.careers.filter((v)=>employmentIds.has(v.employmentId)),
        certifications:fresh.certifications.filter((v)=>employmentIds.has(v.employmentId)), skills:fresh.skills.filter((v)=>employmentIds.has(v.employmentId)),
        resumes:fresh.resumes.filter((v)=>employmentIds.has(v.employmentId)), attendanceSettings:fresh.attendanceSettings.filter((v)=>employmentIds.has(v.employmentId)),
        managerRelationships:fresh.managerRelationships.filter((v)=>employmentIds.has(v.employmentId)),
      }
      await this.seed(upgraded)
    } else {
      if (![2,3,4,5,6,SCHEMA_VERSION].includes(raw.schemaVersion)) throw new Error(`지원하지 않는 스키마 버전입니다: ${raw.schemaVersion}`)
      if (!payload.data?.company || !Array.isArray(payload.data.persons)) throw new Error('올바른 HR Simulator 백업 파일이 아닙니다.')
      if (raw.schemaVersion < SCHEMA_VERSION) {
        const legacy = payload.data as unknown as Partial<SeedBundle>
        const fresh=createSeedBundle()
        const freshAttendance=new Map(fresh.attendanceMonthlySummaries.map(row=>[row.id,row]))
        const legacyAttendance=(legacy.attendanceMonthlySummaries??fresh.attendanceMonthlySummaries).map(row=>({...(freshAttendance.get(row.id)??{}),...row})) as AttendanceMonthlySummary[]
        await this.seed({...fresh,...legacy,
          payrollRuns:legacy.payrollRuns??[],payrollEntries:legacy.payrollEntries??[],payrollResults:legacy.payrollResults??[],
          attendanceMonthlySummaries:legacyAttendance,
          annualLeaveLedgers:legacy.annualLeaveLedgers??fresh.annualLeaveLedgers,dailyWorkers:legacy.dailyWorkers??fresh.dailyWorkers,
          dailyWorkRecords:legacy.dailyWorkRecords??fresh.dailyWorkRecords,retirementSettlements:legacy.retirementSettlements??[],
          yearEndTaxCases:legacy.yearEndTaxCases??fresh.yearEndTaxCases,payrollItemMasters:legacy.payrollItemMasters??fresh.payrollItemMasters,
          militaryServiceProfiles:legacy.militaryServiceProfiles??fresh.militaryServiceProfiles,
        } as SeedBundle)
      } else {
        await this.seed(payload.data)
      }
    }
    await this.put(STORES.meta,{id:'importedData',value:'1'})
    await this.persistSelectionUpgrade();await this.initializeOperations()
    await this.put(STORES.auditLogs,{
      id:`AUD-${crypto.randomUUID()}`,occurredAt:new Date().toISOString(),actor:'HR_ADMIN',action:'IMPORT_DATABASE',
      entityType:'DATABASE',entityId:(await this.getCompany()).id,detail:`${raw.exportedAt} 백업을 가져왔습니다.`,
    } satisfies AuditLog)
  }
}
