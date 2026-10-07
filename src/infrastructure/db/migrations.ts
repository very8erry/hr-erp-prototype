import type {
  Address,
  Assignment,
  AttendanceMonthlySummary,
  AuditLog,
  BankAccount,
  Employment,
  Organization,
  Person,
  SeedBundle,
} from '../../domain/types'
import { createSeedBundle } from '../../fixtures/seed'
import {
  CORE_V1_STORES,
  DB_VERSION,
  EMPLOYEE_MASTER_V2_STORES,
  INDEX_V3_STORES,
  PAYROLL_V3_STORES,
  HR_OPERATIONS_V4_STORES,
  SCHEMA_VERSION,
  SEED_VERSION,
  STORES,
  STORE_DEFINITIONS,
  TRANSIENT_V032_DB_NAME,
  type StoreName,
} from './config'
import { getAllFromStore, getOneFromStore, transactionDone } from './idbUtils'

interface LegacyPersonV1 {
  id: string
  fullName: string
  birthDate: string
  gender: Person['gender']
  nationality: string
  mobile: string
  email: string
  address?: string
  syntheticIdentifier: string
  bankName?: string
  bankAccount?: string
}

async function openExistingDatabase(name: string): Promise<IDBDatabase | null> {
  const databases = typeof indexedDB.databases === 'function' ? await indexedDB.databases() : []
  if (databases.length > 0 && !databases.some((item) => item.name === name)) return null

  return new Promise((resolve, reject) => {
    let createdFresh = false
    const request = indexedDB.open(name)
    request.onupgradeneeded = (event) => {
      if (event.oldVersion === 0) createdFresh = true
    }
    request.onerror = () => reject(request.error ?? new Error(`Legacy IndexedDB를 열 수 없습니다: ${name}`))
    request.onsuccess = () => {
      const db = request.result
      if (createdFresh || db.objectStoreNames.length === 0) {
        db.close()
        if (createdFresh) indexedDB.deleteDatabase(name)
        resolve(null)
        return
      }
      resolve(db)
    }
  })
}

/**
 * V0.3.2에서 임시로 사용했던 별도 DB 이름의 데이터를 잃지 않기 위한 1회성 복구 경로.
 * canonical DB가 비어 있을 때만 호출한다.
 */
export async function readTransientV032Bundle(): Promise<SeedBundle | null> {
  const legacyDb = await openExistingDatabase(TRANSIENT_V032_DB_NAME)
  if (!legacyDb) return null

  try {
    const requiredStores = [STORES.company,STORES.organizations,STORES.persons,STORES.employments,STORES.assignments,STORES.compensations,STORES.personnelEvents,STORES.auditLogs]
    if (requiredStores.some((name) => !legacyDb.objectStoreNames.contains(name))) return null

    const company = (await getAllFromStore<SeedBundle['company']>(legacyDb, STORES.company))[0]
    if (!company) return null

    const bundle: SeedBundle = {
      company,
      organizations: await getAllFromStore<SeedBundle['organizations'][number]>(legacyDb, STORES.organizations),
      persons: await getAllFromStore<SeedBundle['persons'][number]>(legacyDb, STORES.persons),
      addresses: await getAllFromStore<SeedBundle['addresses'][number]>(legacyDb, STORES.addresses),
      dependents: await getAllFromStore<SeedBundle['dependents'][number]>(legacyDb, STORES.dependents),
      visas: await getAllFromStore<SeedBundle['visas'][number]>(legacyDb, STORES.visas),
      bankAccounts: await getAllFromStore<SeedBundle['bankAccounts'][number]>(legacyDb, STORES.bankAccounts),
      employments: await getAllFromStore<SeedBundle['employments'][number]>(legacyDb, STORES.employments),
      assignments: await getAllFromStore<SeedBundle['assignments'][number]>(legacyDb, STORES.assignments),
      compensations: await getAllFromStore<SeedBundle['compensations'][number]>(legacyDb, STORES.compensations),
      taxProfiles: await getAllFromStore<SeedBundle['taxProfiles'][number]>(legacyDb, STORES.taxProfiles),
      socialInsuranceProfiles: await getAllFromStore<SeedBundle['socialInsuranceProfiles'][number]>(legacyDb, STORES.socialInsuranceProfiles),
      militaryServiceProfiles: [],
      educations: await getAllFromStore<SeedBundle['educations'][number]>(legacyDb, STORES.educations),
      careers: await getAllFromStore<SeedBundle['careers'][number]>(legacyDb, STORES.careers),
      certifications: await getAllFromStore<SeedBundle['certifications'][number]>(legacyDb, STORES.certifications),
      skills: await getAllFromStore<SeedBundle['skills'][number]>(legacyDb, STORES.skills),
      resumes: await getAllFromStore<SeedBundle['resumes'][number]>(legacyDb, STORES.resumes),
      workSchedules: await getAllFromStore<SeedBundle['workSchedules'][number]>(legacyDb, STORES.workSchedules),
      attendanceSettings: await getAllFromStore<SeedBundle['attendanceSettings'][number]>(legacyDb, STORES.attendanceSettings),
      managerRelationships: await getAllFromStore<SeedBundle['managerRelationships'][number]>(legacyDb, STORES.managerRelationships),
      personnelEvents: await getAllFromStore<SeedBundle['personnelEvents'][number]>(legacyDb, STORES.personnelEvents),
      auditLogs: await getAllFromStore<SeedBundle['auditLogs'][number]>(legacyDb, STORES.auditLogs),
      payrollRuns: [],
      payrollEntries: [],
      payrollResults: [],
      attendanceMonthlySummaries: [],
      annualLeaveLedgers: [],
      dailyWorkers: [],
      dailyWorkRecords: [],
      retirementSettlements: [],
      yearEndTaxCases: [],
      payrollItemMasters: [],
    }
    return bundle
  } finally {
    legacyDb.close()
  }
}

function ensureObjectStore(db: IDBDatabase, tx: IDBTransaction, storeName: StoreName): IDBObjectStore {
  if (!db.objectStoreNames.contains(storeName)) {
    return db.createObjectStore(storeName, { keyPath: 'id' })
  }
  return tx.objectStore(storeName)
}

function ensureIndexes(store: IDBObjectStore, storeName: StoreName): void {
  const definition = STORE_DEFINITIONS.find((item) => item.name === storeName)
  for (const index of definition?.indexes ?? []) {
    if (!store.indexNames.contains(index.name)) {
      store.createIndex(index.name, index.keyPath, { unique: index.unique ?? false })
    }
  }
}

/**
 * IndexedDB 구조 마이그레이션.
 * - v1: Core HR stores
 * - v2: Employee Master stores
 * - v3: 검색/관계 조회용 index 보강
 * - v4: Payroll Run / Entry / Result stores
 * - v5: 병역·근태·연차·일용직·퇴직·연말정산·급여항목 Master stores
 *
 * 데이터 변환은 onupgradeneeded 안에서 하지 않는다. 구조 변경과 데이터 변환을 분리해
 * upgrade transaction이 길어지거나 중간에 끊기는 것을 피한다.
 */
export function upgradeDatabaseStructure(db: IDBDatabase, tx: IDBTransaction, oldVersion: number): void {
  if (oldVersion < 1) {
    for (const storeName of CORE_V1_STORES) ensureObjectStore(db, tx, storeName)
  }

  if (oldVersion < 2) {
    for (const storeName of EMPLOYEE_MASTER_V2_STORES) ensureObjectStore(db, tx, storeName)
  }

  if (oldVersion < 3) {
    for (const storeName of INDEX_V3_STORES) {
      const store = ensureObjectStore(db, tx, storeName)
      ensureIndexes(store, storeName)
    }
  }

  if (oldVersion < 4) {
    for (const storeName of PAYROLL_V3_STORES) {
      const store = ensureObjectStore(db, tx, storeName)
      ensureIndexes(store, storeName)
    }
  }

  if (oldVersion < 5) {
    for (const storeName of HR_OPERATIONS_V4_STORES) {
      const store = ensureObjectStore(db, tx, storeName)
      ensureIndexes(store, storeName)
    }
  }

  if (oldVersion < 6) {
    for (const name of [STORES.attendanceDailyRecords, STORES.leaveCases, STORES.payrollSettingsHistory]) ensureIndexes(ensureObjectStore(db,tx,name),name)
  }
  const meta = ensureObjectStore(db, tx, STORES.meta)
  meta.put({ id: 'dbVersion', value: String(DB_VERSION) })
}

async function existingIdSet(db: IDBDatabase, storeName: StoreName): Promise<Set<string>> {
  const rows = await getAllFromStore<{ id: string }>(db, storeName)
  return new Set(rows.map((row) => row.id))
}

function migratedPerson(old: LegacyPersonV1, fallback?: Person): Person {
  const nationality = old.nationality || fallback?.nationality || '대한민국'
  return {
    id: old.id,
    fullName: old.fullName || fallback?.fullName || '가상직원',
    englishName: fallback?.englishName ?? '',
    hanjaName: fallback?.hanjaName ?? '',
    birthDate: old.birthDate || fallback?.birthDate || '1990-01-01',
    gender: old.gender ?? fallback?.gender ?? 'F',
    domesticForeignType: nationality === '대한민국' ? 'DOMESTIC' : 'FOREIGN',
    nationality,
    reportingNationality: nationality,
    syntheticIdentifier: old.syntheticIdentifier || fallback?.syntheticIdentifier || `SYN-${old.id}`,
    profileImageUrl: fallback?.profileImageUrl ?? null,
    mobile: old.mobile || fallback?.mobile || '',
    phone: fallback?.phone ?? '',
    email: old.email || fallback?.email || '',
    emergencyContactName: fallback?.emergencyContactName ?? '',
    emergencyContactPhone: fallback?.emergencyContactPhone ?? '',
    emergencyContactRelation: fallback?.emergencyContactRelation ?? '',
  }
}

function migratedAddress(person: LegacyPersonV1, employment: Employment | undefined, fallback?: Address): Address {
  const rawAddress = person.address?.trim()
  return {
    id: fallback?.id ?? `ADDR-MIG-${person.id}`,
    personId: person.id,
    postalCode: fallback?.postalCode ?? '00000',
    addressLine1: rawAddress || fallback?.addressLine1 || '가상 주소',
    addressLine2: fallback?.addressLine2 ?? '',
    effectiveStartDate: employment?.hireDate ?? fallback?.effectiveStartDate ?? '2000-01-01',
    effectiveEndDate: null,
  }
}

function migratedBankAccount(person: LegacyPersonV1, employment: Employment, fallback?: BankAccount): BankAccount {
  return {
    id: fallback?.id ?? `BANK-MIG-${employment.id}`,
    employmentId: employment.id,
    bankName: person.bankName || fallback?.bankName || '가상은행',
    accountNumberMasked: person.bankAccount || fallback?.accountNumberMasked || 'DEMO-00000000',
    accountHolder: person.fullName || fallback?.accountHolder || '가상직원',
    isPayrollAccount: true,
    effectiveStartDate: employment.hireDate,
    effectiveEndDate: null,
  }
}

async function putMissingRows<T extends { id: string }>(
  db: IDBDatabase,
  storeName: StoreName,
  rows: T[],
): Promise<void> {
  if (rows.length === 0) return
  const ids = await existingIdSet(db, storeName)
  const missing = rows.filter((row) => !ids.has(row.id))
  if (missing.length === 0) return
  const tx = db.transaction(storeName, 'readwrite')
  const done = transactionDone(tx)
  const store = tx.objectStore(storeName)
  missing.forEach((row) => store.put(row))
  await done
}

/**
 * Core HR schema v1 -> Employee Master schema v2 데이터 마이그레이션.
 * 반복 실행해도 이미 생성된 새 Entity를 덮어쓰지 않도록 idempotent하게 작성한다.
 */
async function migrateDataV1ToV2(db: IDBDatabase): Promise<void> {
  const fresh = createSeedBundle()
  const legacyPersons = await getAllFromStore<LegacyPersonV1>(db, STORES.persons)
  const employments = await getAllFromStore<Employment>(db, STORES.employments)

  if (legacyPersons.length === 0 || employments.length === 0) return

  const freshPersonMap = new Map(fresh.persons.map((person) => [person.id, person]))
  const freshAddressMap = new Map(fresh.addresses.map((address) => [address.personId, address]))
  const freshBankMap = new Map(fresh.bankAccounts.map((bank) => [bank.employmentId, bank]))
  const firstEmploymentByPerson = new Map<string, Employment>()
  for (const employment of [...employments].sort((a, b) => a.hireDate.localeCompare(b.hireDate))) {
    if (!firstEmploymentByPerson.has(employment.personId)) firstEmploymentByPerson.set(employment.personId, employment)
  }

  // Person 자체는 기존 사용자가 입력/수정한 값을 우선 보존하고, 신규 필드만 보강한다.
  {
    const tx = db.transaction(STORES.persons, 'readwrite')
    const done = transactionDone(tx)
    const store = tx.objectStore(STORES.persons)
    legacyPersons.forEach((person) => store.put(migratedPerson(person, freshPersonMap.get(person.id))))
    await done
  }

  // V1 Person 안에 있던 주소/계좌는 V2 Entity로 이동한다.
  await putMissingRows(
    db,
    STORES.addresses,
    legacyPersons.map((person) => migratedAddress(person, firstEmploymentByPerson.get(person.id), freshAddressMap.get(person.id))),
  )

  const legacyPersonMap = new Map(legacyPersons.map((person) => [person.id, person]))
  await putMissingRows(
    db,
    STORES.bankAccounts,
    employments.map((employment) => {
      const person = legacyPersonMap.get(employment.personId)
      if (!person) {
        const fallback = freshBankMap.get(employment.id)
        if (fallback) return fallback
        return {
          id: `BANK-MIG-${employment.id}`,
          employmentId: employment.id,
          bankName: '가상은행',
          accountNumberMasked: 'DEMO-00000000',
          accountHolder: '가상직원',
          isPayrollAccount: true,
          effectiveStartDate: employment.hireDate,
          effectiveEndDate: null,
        } satisfies BankAccount
      }
      return migratedBankAccount(person, employment, freshBankMap.get(employment.id))
    }),
  )

  const employmentIds = new Set(employments.map((employment) => employment.id))
  await putMissingRows(db, STORES.dependents, fresh.dependents.filter((row) => employmentIds.has(row.employmentId)))
  await putMissingRows(db, STORES.visas, fresh.visas.filter((row) => employmentIds.has(row.employmentId)))
  await putMissingRows(db, STORES.taxProfiles, fresh.taxProfiles.filter((row) => employmentIds.has(row.employmentId)))
  await putMissingRows(db, STORES.socialInsuranceProfiles, fresh.socialInsuranceProfiles.filter((row) => employmentIds.has(row.employmentId)))
  await putMissingRows(db, STORES.militaryServiceProfiles, fresh.militaryServiceProfiles.filter((row) => employmentIds.has(row.employmentId)))
  await putMissingRows(db, STORES.educations, fresh.educations.filter((row) => employmentIds.has(row.employmentId)))
  await putMissingRows(db, STORES.careers, fresh.careers.filter((row) => employmentIds.has(row.employmentId)))
  await putMissingRows(db, STORES.certifications, fresh.certifications.filter((row) => employmentIds.has(row.employmentId)))
  await putMissingRows(db, STORES.skills, fresh.skills.filter((row) => employmentIds.has(row.employmentId)))
  await putMissingRows(db, STORES.resumes, fresh.resumes.filter((row) => employmentIds.has(row.employmentId)))
  await putMissingRows(db, STORES.workSchedules, fresh.workSchedules)
  await putMissingRows(db, STORES.attendanceSettings, fresh.attendanceSettings.filter((row) => employmentIds.has(row.employmentId)))
  await putMissingRows(db, STORES.managerRelationships, fresh.managerRelationships.filter((row) => employmentIds.has(row.employmentId)))

}


async function migrateAttendanceSnapshotsV4ToV5(db: IDBDatabase): Promise<void> {
  const [rows,assignments,organizations] = await Promise.all([
    getAllFromStore<AttendanceMonthlySummary>(db, STORES.attendanceMonthlySummaries),
    getAllFromStore<Assignment>(db, STORES.assignments),
    getAllFromStore<Organization>(db, STORES.organizations),
  ])
  if (rows.length === 0) return
  const orgMap = new Map(organizations.map((row) => [row.id,row.name]))
  const assignmentsByEmployment = new Map<string,Assignment[]>()
  for (const assignment of assignments) {
    const list=assignmentsByEmployment.get(assignment.employmentId) ?? []
    list.push(assignment); assignmentsByEmployment.set(assignment.employmentId,list)
  }
  const upgraded = rows.map((row) => {
    if (row.organizationNameSnapshot && row.gradeSnapshot && row.jobSnapshot) return row
    const start=`${row.period}-01`; const end=`${row.period}-31`
    const list=(assignmentsByEmployment.get(row.employmentId) ?? []).slice().sort((a,b)=>b.effectiveFrom.localeCompare(a.effectiveFrom))
    const assignment=list.find(a=>a.effectiveFrom<=end && (!a.effectiveTo || a.effectiveTo>=start)) ?? list[0]
    return {
      ...row,
      organizationNameSnapshot: assignment ? (orgMap.get(assignment.organizationId) ?? assignment.organizationId) : '-',
      gradeSnapshot: assignment?.grade ?? '-',
      jobSnapshot: assignment?.job ?? '-',
    }
  })
  const tx=db.transaction(STORES.attendanceMonthlySummaries,'readwrite'); const done=transactionDone(tx); const store=tx.objectStore(STORES.attendanceMonthlySummaries)
  upgraded.forEach(row=>store.put(row)); await done
}

async function writeMigrationMeta(db: IDBDatabase, fromSchema: number, toSchema: number): Promise<void> {
  const tx = db.transaction([STORES.meta, STORES.auditLogs], 'readwrite')
  const done = transactionDone(tx)
  const meta = tx.objectStore(STORES.meta)
  meta.put({ id: 'schemaVersion', value: String(toSchema) })
  meta.put({ id: 'dbVersion', value: String(DB_VERSION) })
  meta.put({ id: 'lastMigrationAt', value: new Date().toISOString() })
  tx.objectStore(STORES.auditLogs).put({
    id: `AUD-MIGRATE-${crypto.randomUUID()}`,
    occurredAt: new Date().toISOString(),
    actor: 'SYSTEM',
    action: 'MIGRATE_SCHEMA',
    entityType: 'DATABASE',
    entityId: 'DEMO-COMPANY',
    detail: `HR 데이터 스키마를 v${fromSchema}에서 v${toSchema}로 마이그레이션했습니다.`,
  } satisfies AuditLog)
  await done
}

/** DB 구조 업그레이드 이후 실행되는 데이터 스키마 마이그레이션. */
export async function runDataMigrations(db: IDBDatabase): Promise<void> {
  const schemaMeta = await getOneFromStore<{ id: string; value: string }>(db, STORES.meta, 'schemaVersion')
  let schemaVersion = Number(schemaMeta?.value ?? '1')
  if (!Number.isFinite(schemaVersion) || schemaVersion < 1) schemaVersion = 1

  if (schemaVersion < 2) {
    await migrateDataV1ToV2(db)
    await writeMigrationMeta(db, schemaVersion, 2)
    schemaVersion = 2
  }

  if (schemaVersion < 3) {
    await writeMigrationMeta(db, schemaVersion, 3)
    schemaVersion = 3
  }

  if (schemaVersion < 4) {
    const fresh = createSeedBundle()
    const employments = await getAllFromStore<Employment>(db, STORES.employments)
    const employmentIds = new Set(employments.map((row) => row.id))
    await putMissingRows(db, STORES.militaryServiceProfiles, fresh.militaryServiceProfiles.filter((row) => employmentIds.has(row.employmentId)))
    await putMissingRows(db, STORES.attendanceMonthlySummaries, fresh.attendanceMonthlySummaries.filter((row) => employmentIds.has(row.employmentId)))
    await putMissingRows(db, STORES.annualLeaveLedgers, fresh.annualLeaveLedgers.filter((row) => employmentIds.has(row.employmentId)))
    await putMissingRows(db, STORES.dailyWorkers, fresh.dailyWorkers)
    await putMissingRows(db, STORES.dailyWorkRecords, fresh.dailyWorkRecords)
    await putMissingRows(db, STORES.retirementSettlements, fresh.retirementSettlements)
    await putMissingRows(db, STORES.yearEndTaxCases, fresh.yearEndTaxCases)
    await putMissingRows(db, STORES.payrollItemMasters, fresh.payrollItemMasters)
    await writeMigrationMeta(db, schemaVersion, 4)
    schemaVersion = 4
  }

  if (schemaVersion < 5) {
    await migrateAttendanceSnapshotsV4ToV5(db)
    await writeMigrationMeta(db, schemaVersion, 5)
    schemaVersion = 5
  }

  if (schemaVersion < 6) {
    // Preserve monthly totals. No fabricated clock records or inferred leave reasons.
    const rows=await getAllFromStore<AttendanceMonthlySummary>(db,STORES.attendanceMonthlySummaries)
    const tx=db.transaction([STORES.attendanceMonthlySummaries],'readwrite'); const done=transactionDone(tx)
    rows.forEach(r=>tx.objectStore(STORES.attendanceMonthlySummaries).put({...r,revision:r.revision??0,manualEdited:r.manualEdited??false}))
    await done
    await writeMigrationMeta(db,schemaVersion,6)
    schemaVersion=6
  }
  if (schemaVersion > SCHEMA_VERSION) {
    throw new Error(`현재 앱보다 새로운 데이터 스키마(v${schemaVersion})입니다. 앱을 업데이트한 뒤 다시 시도하세요.`)
  }
}

export async function isDatabaseSeeded(db: IDBDatabase): Promise<boolean> {
  const companyRows = await getAllFromStore<{ id: string }>(db, STORES.company)
  const employmentRows = await getAllFromStore<{ id: string }>(db, STORES.employments)
  return companyRows.length > 0 || employmentRows.length > 0
}

export async function currentSeedVersion(db: IDBDatabase): Promise<number> {
  const meta = await getOneFromStore<{ id: string; value: string }>(db, STORES.meta, 'seedVersion')
  const value = Number(meta?.value ?? '0')
  return Number.isFinite(value) ? value : 0
}

export async function runSeedMigrations(db: IDBDatabase): Promise<void> {
  const current = await currentSeedVersion(db)
  if (current > SEED_VERSION) {
    throw new Error(`현재 앱보다 새로운 Seed 버전(v${current})입니다. 앱을 업데이트한 뒤 다시 시도하세요.`)
  }
  if (current < SEED_VERSION) {
    // v2 Seed의 Employee Master 보강은 schema v1→v2 migration에서 실제 데이터를 생성한다.
    // 여기서는 seed 생성 규칙의 버전만 독립적으로 확정한다.
    const tx = db.transaction(STORES.meta, 'readwrite')
    const done = transactionDone(tx)
    tx.objectStore(STORES.meta).put({ id: 'seedVersion', value: String(SEED_VERSION) })
    await done
  }
}

export async function markCurrentDbVersion(db: IDBDatabase): Promise<void> {
  const tx = db.transaction(STORES.meta, 'readwrite')
  const done = transactionDone(tx)
  tx.objectStore(STORES.meta).put({ id: 'dbVersion', value: String(DB_VERSION) })
  await done
}

export function currentVersions(): { dbVersion: number; schemaVersion: number; seedVersion: number } {
  return { dbVersion: DB_VERSION, schemaVersion: SCHEMA_VERSION, seedVersion: SEED_VERSION }
}

export type { SeedBundle }
