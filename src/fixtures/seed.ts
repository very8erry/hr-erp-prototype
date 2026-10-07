import type {
  Address,
  Assignment,
  AttendanceSetting,
  AuditLog,
  BankAccount,
  CareerHistory,
  Certification,
  Company,
  CompensationSnapshot,
  Dependent,
  Education,
  EmployeeSkill,
  Employment,
  EmploymentStatus,
  ManagerRelationship,
  MilitaryServiceProfile,
  AttendanceMonthlySummary,
  AnnualLeaveLedger,
  DailyWorker,
  DailyWorkRecord,
  RetirementSettlement,
  YearEndTaxCase,
  PayrollItemMaster,
  Organization,
  Person,
  ResumeDocument,
  SeedBundle,
  SocialInsuranceProfile,
  TaxProfile,
  Visa,
  WorkSchedule,
} from '../domain/types'
import { calculateDailyWorkRecord } from '../modules/payroll/dailyWorkerRules'

const firstNames = ['민준','서준','도윤','예준','시우','하준','지호','준서','서연','서윤','지우','하윤','민서','지민','수아','유진','현우','지훈','지원','예은']
const surnames = ['김','이','박','최','정','강','조','윤','장','임','한','오','서','신','권']
const grades = ['사원','대리','과장','차장','부장']
const titles = ['팀원','팀원','팀원','파트장','팀장']
const jobs = ['인사 운영','채용 운영','급여 운영','재무 관리','회계','영업','마케팅','제품 기획','서버 개발','프론트엔드 개발','데이터 분석','고객 성공','사업 운영']
const locations = ['서울 본사','판교 오피스','안양 오피스']
const banks = ['가상은행 A','가상은행 B','가상은행 C']
const schools = ['가상대학교','대한교육대학교','서울가상전문대학','한국학습대학교']
const majors = ['경영학','경제학','컴퓨터공학','통계학','심리학','행정학','회계학']
const priorCompanies = ['알파테크','베타서비스','가상커머스','샘플소프트','교육산업']
const foreignProfiles = [
  { nationality: '일본', reportingNationality: '일본', countryCode: 'JP', visaType: 'E-7-1' },
  { nationality: '미국', reportingNationality: '미국', countryCode: 'US', visaType: 'E-7-1' },
  { nationality: '중국', reportingNationality: '중국', countryCode: 'CN', visaType: 'F-2' },
  { nationality: '베트남', reportingNationality: '베트남', countryCode: 'VN', visaType: 'E-7-1' },
]

export const organizations: Organization[] = [
  { id:'ORG-000', companyId:'DEMO-CO-001', parentId:null, name:'가상 넥스트코드 주식회사', type:'COMPANY' },
  { id:'ORG-100', companyId:'DEMO-CO-001', parentId:'ORG-000', name:'경영지원본부', type:'DIVISION' },
  { id:'ORG-110', companyId:'DEMO-CO-001', parentId:'ORG-100', name:'인사팀', type:'TEAM' },
  { id:'ORG-111', companyId:'DEMO-CO-001', parentId:'ORG-110', name:'인사운영팀', type:'TEAM' },
  { id:'ORG-112', companyId:'DEMO-CO-001', parentId:'ORG-110', name:'채용팀', type:'TEAM' },
  { id:'ORG-120', companyId:'DEMO-CO-001', parentId:'ORG-100', name:'재무팀', type:'TEAM' },
  { id:'ORG-121', companyId:'DEMO-CO-001', parentId:'ORG-120', name:'회계팀', type:'TEAM' },
  { id:'ORG-122', companyId:'DEMO-CO-001', parentId:'ORG-120', name:'재무기획팀', type:'TEAM' },
  { id:'ORG-200', companyId:'DEMO-CO-001', parentId:'ORG-000', name:'사업본부', type:'DIVISION' },
  { id:'ORG-210', companyId:'DEMO-CO-001', parentId:'ORG-200', name:'영업1팀', type:'TEAM' },
  { id:'ORG-211', companyId:'DEMO-CO-001', parentId:'ORG-200', name:'영업2팀', type:'TEAM' },
  { id:'ORG-220', companyId:'DEMO-CO-001', parentId:'ORG-200', name:'마케팅팀', type:'TEAM' },
  { id:'ORG-221', companyId:'DEMO-CO-001', parentId:'ORG-220', name:'브랜드팀', type:'TEAM' },
  { id:'ORG-222', companyId:'DEMO-CO-001', parentId:'ORG-220', name:'성장전략팀', type:'TEAM' },
  { id:'ORG-300', companyId:'DEMO-CO-001', parentId:'ORG-000', name:'제품본부', type:'DIVISION' },
  { id:'ORG-310', companyId:'DEMO-CO-001', parentId:'ORG-300', name:'제품기획팀', type:'TEAM' },
  { id:'ORG-320', companyId:'DEMO-CO-001', parentId:'ORG-300', name:'개발1팀', type:'TEAM' },
  { id:'ORG-321', companyId:'DEMO-CO-001', parentId:'ORG-300', name:'개발2팀', type:'TEAM' },
  { id:'ORG-322', companyId:'DEMO-CO-001', parentId:'ORG-300', name:'데이터팀', type:'TEAM' },
  { id:'ORG-400', companyId:'DEMO-CO-001', parentId:'ORG-000', name:'고객본부', type:'DIVISION' },
  { id:'ORG-410', companyId:'DEMO-CO-001', parentId:'ORG-400', name:'고객성공1팀', type:'TEAM' },
  { id:'ORG-411', companyId:'DEMO-CO-001', parentId:'ORG-400', name:'고객성공2팀', type:'TEAM' },
  { id:'ORG-420', companyId:'DEMO-CO-001', parentId:'ORG-400', name:'운영팀', type:'TEAM' },
  { id:'ORG-421', companyId:'DEMO-CO-001', parentId:'ORG-420', name:'품질관리팀', type:'TEAM' },
]

const workSchedules: WorkSchedule[] = [
  { id:'WS-STD-0900', name:'일반근무 09-18', timezone:'Asia/Seoul', workDays:['MON','TUE','WED','THU','FRI'], startTime:'09:00', endTime:'18:00', breakMinutes:60 },
  { id:'WS-FLEX-0800', name:'시차근무 08-17', timezone:'Asia/Seoul', workDays:['MON','TUE','WED','THU','FRI'], startTime:'08:00', endTime:'17:00', breakMinutes:60 },
  { id:'WS-FLEX-1000', name:'시차근무 10-19', timezone:'Asia/Seoul', workDays:['MON','TUE','WED','THU','FRI'], startTime:'10:00', endTime:'19:00', breakMinutes:60 },
]

function mulberry32(seed: number) {
  return () => {
    let t = seed += 0x6D2B79F5
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const pad = (n: number, size = 4) => String(n).padStart(size, '0')

function isoDate(rand: () => number, yearStart: number, yearEnd: number): string {
  const year = yearStart + Math.floor(rand() * (yearEnd - yearStart + 1))
  const month = 1 + Math.floor(rand() * 12)
  const day = 1 + Math.floor(rand() * 27)
  return `${year}-${pad(month,2)}-${pad(day,2)}`
}

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0,10)
}

function monthsBetween(start: string, end: string): number {
  const s = new Date(`${start}T00:00:00Z`)
  const e = new Date(`${end}T00:00:00Z`)
  return Math.max(1, (e.getUTCFullYear()-s.getUTCFullYear())*12 + e.getUTCMonth()-s.getUTCMonth())
}

function salaryForGrade(rand: () => number, grade: string): number {
  const base: Record<string, number> = { '사원': 36_000_000, '대리': 44_000_000, '과장': 54_000_000, '차장': 66_000_000, '부장': 82_000_000 }
  return base[grade] + Math.floor(rand() * 8) * 1_000_000
}

function safeTerminationDate(rand: () => number, hireDate: string): string {
  const year = Math.max(2024, Number(hireDate.slice(0,4)) + 1)
  return isoDate(rand, year, 2026)
}

function serviceYearsAt(hireDate: string, asOf: string): number {
  const start = new Date(`${hireDate}T00:00:00Z`)
  const end = new Date(`${asOf}T00:00:00Z`)
  return Math.max(0, (end.getTime()-start.getTime())/(365.2425*86400000))
}

function annualLeaveGranted(hireDate: string, year: number): number {
  const asOf = `${year}-12-31`
  const years = serviceYearsAt(hireDate, asOf)
  if (years < 1) {
    const start = new Date(`${hireDate}T00:00:00Z`)
    const end = new Date(`${asOf}T00:00:00Z`)
    const months = Math.max(0, (end.getUTCFullYear()-start.getUTCFullYear())*12 + end.getUTCMonth()-start.getUTCMonth())
    return Math.min(11, months)
  }
  return Math.min(25, 15 + Math.max(0, Math.floor((years - 1) / 2)))
}

const payrollItemMasters: PayrollItemMaster[] = [
  {id:'PI-P101',code:'P101',name:'기본급',category:'EARNING',calculationMethod:'MASTER',taxable:true,active:true,sortOrder:10},
  {id:'PI-P104',code:'P104',name:'식대',category:'EARNING',calculationMethod:'MASTER',taxable:false,active:true,sortOrder:20},
  {id:'PI-P105',code:'P105',name:'자가운전보조비',category:'EARNING',calculationMethod:'MASTER',taxable:false,active:true,sortOrder:30},
  {id:'PI-P108',code:'P108',name:'직책수당',category:'EARNING',calculationMethod:'MASTER',taxable:true,active:true,sortOrder:40},
  {id:'PI-P109',code:'P109',name:'자격수당',category:'EARNING',calculationMethod:'MASTER',taxable:true,active:true,sortOrder:50},
  {id:'PI-P110',code:'P110',name:'직무수당',category:'EARNING',calculationMethod:'MASTER',taxable:true,active:true,sortOrder:60},
  {id:'PI-P111',code:'P111',name:'해외근무수당',category:'EARNING',calculationMethod:'MASTER',taxable:true,active:false,sortOrder:70},
  {id:'PI-P120',code:'P120',name:'연장근로수당',category:'EARNING',calculationMethod:'OVERTIME',taxable:true,active:true,sortOrder:80},
  {id:'PI-P121',code:'P121',name:'야간근로수당',category:'EARNING',calculationMethod:'OVERTIME',taxable:true,active:true,sortOrder:90},
  {id:'PI-P122',code:'P122',name:'휴일근로수당',category:'EARNING',calculationMethod:'OVERTIME',taxable:true,active:true,sortOrder:100},
  {id:'PI-T101',code:'T101',name:'소득세',category:'DEDUCTION',calculationMethod:'FORMULA',taxable:false,active:true,sortOrder:210},
  {id:'PI-T102',code:'T102',name:'지방소득세',category:'DEDUCTION',calculationMethod:'FORMULA',taxable:false,active:true,sortOrder:220},
  {id:'PI-T103',code:'T103',name:'국민연금',category:'DEDUCTION',calculationMethod:'FORMULA',taxable:false,active:true,sortOrder:230},
  {id:'PI-T104',code:'T104',name:'건강보험',category:'DEDUCTION',calculationMethod:'FORMULA',taxable:false,active:true,sortOrder:240},
  {id:'PI-T105',code:'T105',name:'장기요양보험',category:'DEDUCTION',calculationMethod:'FORMULA',taxable:false,active:true,sortOrder:250},
  {id:'PI-T106',code:'T106',name:'고용보험',category:'DEDUCTION',calculationMethod:'FORMULA',taxable:false,active:true,sortOrder:260},
]

export function createSeedBundle(): SeedBundle {
  const rand = mulberry32(260929)
  const pick = <T,>(values: T[]): T => values[Math.floor(rand() * values.length)]

  const company: Company = {
    id: 'DEMO-CO-001',
    name: '가상 넥스트코드 주식회사',
    countryCode: 'KR',
    employeeSizeBand: '300_PLUS',
    demoNotice: '모든 개인정보·식별번호·계좌·이력 데이터는 HR 실습을 위해 생성된 가상 정보입니다.',
  }

  const persons: Person[] = []
  const addresses: Address[] = []
  const dependents: Dependent[] = []
  const visas: Visa[] = []
  const bankAccounts: BankAccount[] = []
  const employments: Employment[] = []
  const assignments: Assignment[] = []
  const compensations: CompensationSnapshot[] = []
  const taxProfiles: TaxProfile[] = []
  const socialInsuranceProfiles: SocialInsuranceProfile[] = []
  const militaryServiceProfiles: MilitaryServiceProfile[] = []
  const educations: Education[] = []
  const careers: CareerHistory[] = []
  const certifications: Certification[] = []
  const skills: EmployeeSkill[] = []
  const resumes: ResumeDocument[] = []
  const attendanceSettings: AttendanceSetting[] = []
  const managerRelationships: ManagerRelationship[] = []
  const attendanceMonthlySummaries: AttendanceMonthlySummary[] = []
  const annualLeaveLedgers: AnnualLeaveLedger[] = []
  const dailyWorkers: DailyWorker[] = []
  const dailyWorkRecords: DailyWorkRecord[] = []
  const retirementSettlements: RetirementSettlement[] = []
  const yearEndTaxCases: YearEndTaxCase[] = []
  const auditLogs: AuditLog[] = []

  const teamOrgs = organizations.filter((org) => org.type === 'TEAM' && !['인사팀','재무팀','마케팅팀','운영팀'].includes(org.name))
  const total = 374

  for (let i = 1; i <= total; i += 1) {
    const personId = `PER-${pad(i,5)}`
    const employmentId = `EMPLOY-${pad(i,5)}`
    const employeeNumber = `E${pad(i,5)}`
    const name = `${pick(surnames)}${pick(firstNames)}`
    const gender = rand() > 0.5 ? 'F' : 'M'
    const birthDate = isoDate(rand, 1972, 2003)
    const org = pick(teamOrgs)
    const grade = pick(grades)
    const status: EmploymentStatus = i <= 327 ? 'ACTIVE' : i <= 336 ? 'LEAVE' : 'TERMINATED'
    const originalHireDate = status === 'TERMINATED' ? isoDate(rand, 2012, 2023) : isoDate(rand, 2012, 2026)
    const hireDate = status!=='TERMINATED'&&i<=90?`${2025+Math.floor((i%21)/12)}-${String(i%21%12+1).padStart(2,'0')}-${String(1+i%20).padStart(2,'0')}`:originalHireDate>'2026-09-30'?'2026-09-01':originalHireDate
    const originalTerminationDate = status === 'TERMINATED' ? safeTerminationDate(rand, hireDate) : null
    const terminationDate = originalTerminationDate?`${2025+Math.floor(([2,2,2,3,5,5,7,8,8,8,11,11,13,13,14,17,17,17,17,20,20,20,20,20][(i-337)%24])/12)}-${String([2,2,2,3,5,5,7,8,8,8,11,11,13,13,14,17,17,17,17,20,20,20,20,20][(i-337)%24]%12+1).padStart(2,'0')}-20`:null
    const seq = pad(i)
    const isForeign = i % 23 === 0
    const foreign = isForeign ? pick(foreignProfiles) : null
    const nationality = foreign?.nationality ?? '대한민국'
    const accountHolder = name
    const residenceCountryCode = foreign?.countryCode ?? 'KR'

    persons.push({
      id: personId,
      fullName: name,
      englishName: isForeign ? `Demo ${employeeNumber}` : `${pick(['Min','Seo','Ji','Ha','Yu'])} ${pick(['Kim','Lee','Park','Choi','Jung'])}`,
      hanjaName: isForeign ? '' : '假想職員',
      birthDate,
      gender,
      domesticForeignType: isForeign ? 'FOREIGN' : 'DOMESTIC',
      nationality,
      reportingNationality: foreign?.reportingNationality ?? '대한민국',
      syntheticIdentifier: `SYN-${birthDate.replaceAll('-','')}-${pad(i,5)}`,
      profileImageUrl: null,
      mobile: `010-0000-${seq}`,
      phone: `02-000-${seq}`,
      email: `demo${i}@example.invalid`,
      emergencyContactName: `${pick(surnames)}가상`,
      emergencyContactPhone: `010-9999-${seq}`,
      emergencyContactRelation: pick(['부','모','배우자','형제자매']),
    })

    addresses.push({
      id: `ADDR-${pad(i,5)}-001`, personId, postalCode:`0${pad(1000+(i%8999),4)}`,
      addressLine1:`서울특별시 가상구 교육로 ${10 + (i % 90)}`,
      addressLine2:`샘플빌딩 ${100 + (i % 900)}호`, effectiveStartDate:hireDate, effectiveEndDate:null,
    })

    employments.push({
      id: employmentId, personId, companyId: company.id, employeeNumber, hireDate, terminationDate,
      employmentType: i===201?'DISPATCH':i===202||i===203?'INTERN':'REGULAR', status,
    })

    const currentTitle=pick(titles)
    const currentJob=pick(jobs)
    assignments.push({
      id:`ASN-${pad(i,5)}-001`, employmentId, organizationId:org.id, grade, title:currentTitle, job:currentJob,
      workLocation:pick(locations), effectiveFrom:hireDate, effectiveTo:null,
    })

    compensations.push({
      id:`COMP-${pad(i,5)}-001`, employmentId, annualSalary:salaryForGrade(rand, grade), effectiveFrom:hireDate, effectiveTo:null,
    })

    bankAccounts.push({
      id:`BANK-${pad(i,5)}-001`, employmentId, bankName:pick(banks), accountNumberMasked:`DEMO-****-${pad(i,6)}`,
      accountHolder, isPayrollAccount:true, effectiveStartDate:hireDate, effectiveEndDate:null,
    })

    taxProfiles.push({
      id:`TAX-${pad(i,5)}-001`, employmentId, residentType: i % 89 === 0 ? 'NON_RESIDENT' : 'RESIDENT',
      residenceCountry:nationality, residenceCountryCode, foreignEmployee:isForeign,
      foreignFlatTaxEligible:isForeign && i % 2 === 0, foreignFlatTaxApplied:isForeign && i % 4 === 0,
      selfBasicDeductionEligible:true, effectiveStartDate:hireDate, effectiveEndDate:null,
    })

    socialInsuranceProfiles.push({
      id:`SI-${pad(i,5)}-001`, employmentId,
      nationalPensionEligible:status !== 'TERMINATED', healthInsuranceEligible:status !== 'TERMINATED',
      employmentInsuranceEligible:status !== 'TERMINATED', industrialAccidentInsuranceEligible:status !== 'TERMINATED',
      effectiveStartDate:hireDate, effectiveEndDate:terminationDate,
    })


    const militaryApplicable = !isForeign && gender === 'M'
    const militaryCompleted = militaryApplicable && Number(birthDate.slice(0,4)) <= 2001
    militaryServiceProfiles.push({
      id:`MIL-${pad(i,5)}-001`, employmentId,
      status: militaryApplicable ? (militaryCompleted ? 'COMPLETED' : 'NOT_APPLICABLE') : 'NOT_APPLICABLE',
      serviceType: militaryCompleted ? '현역' : '', branch: militaryCompleted ? pick(['육군','해군','공군','해병대']) : '',
      rank: militaryCompleted ? pick(['병장','하사','중위']) : '',
      serviceStartDate: militaryCompleted ? `${Math.max(1992, Number(birthDate.slice(0,4))+20)}-03-01` : null,
      serviceEndDate: militaryCompleted ? `${Math.max(1994, Number(birthDate.slice(0,4))+22)}-01-15` : null,
      dischargeType: militaryCompleted ? '만기전역' : '', exemptionReason:'',
      reserveForcesEligible: militaryCompleted && Number(birthDate.slice(0,4)) >= 1988,
      reserveForcesEndDate: militaryCompleted ? '2028-12-31' : null,
      militaryDutyLeaveEligible: militaryCompleted, note:'가상 병역정보',
    })

    for (let month=1; month<=9; month += 1) {
      const period=`2026-${pad(month,2)}`
      if (hireDate > `${period}-28` || (terminationDate && terminationDate < `${period}-01`)) continue
      const scheduled=160 + Math.floor(rand()*16)
      const leaveDays=Math.round(rand()*3*2)/2
      const overtime=Math.round(rand()*22*10)/10
      const absence=status==='LEAVE' && period>='2026-07' ? scheduled : (rand()>.97 ? 8 : 0)
      attendanceMonthlySummaries.push({
        id:`ATTM-${pad(i,5)}-${period}`,employmentId,period,organizationNameSnapshot:org.name,gradeSnapshot:grade,jobSnapshot:currentJob,scheduledHours:scheduled,
        workedHours:Math.max(0,scheduled-leaveDays*8-absence+overtime),overtimeHours:overtime,
        nightHours:Math.round(rand()*4*10)/10,holidayHours:Math.round(rand()*8*10)/10,
        leaveDays,absenceHours:absence,lateMinutes:Math.floor(rand()*30),earlyLeaveMinutes:Math.floor(rand()*15),
      })
    }

    const leaveGranted=annualLeaveGranted(hireDate,2026)
    const leaveUsed=Math.min(leaveGranted,Math.round(rand()*Math.max(1,leaveGranted)*2)/2)
    annualLeaveLedgers.push({id:`LEAVE-${pad(i,5)}-2026`,employmentId,year:2026,grantedDays:leaveGranted,carriedDays:0,adjustedDays:0,usedDays:leaveUsed,remainingDays:Math.max(0,leaveGranted-leaveUsed),ruleVersion:'KR-LSA-2026-60'})

    const dependentCount = i % 5 === 0 ? 0 : 1 + (i % 3)
    for (let d = 1; d <= dependentCount; d += 1) {
      const relation: Dependent['relation'] = d === 1 && i % 2 === 0 ? '배우자' : d === 1 ? pick<Dependent['relation']>(['부','모']) : '자녀'
      const child = relation === '자녀'
      const depBirth = child ? isoDate(rand, 2008, 2025) : isoDate(rand, 1945, 1998)
      dependents.push({
        id:`DEP-${pad(i,5)}-${pad(d,2)}`, employmentId, relation, name:`${pick(surnames)}가족${d}`, birthDate:depBirth,
        cohabitation:rand()>.25, disabilityStatus:i % 97 === 0 && d === 1,
        basicDeductionEligible:rand()>.2, childDeductionEligible:child && Number(depBirth.slice(0,4)) >= 2008,
        effectiveStartDate:hireDate, effectiveEndDate:null, createdAt:`${hireDate}T00:00:00.000Z`, updatedAt:`${hireDate}T00:00:00.000Z`,
      })
    }

    if (isForeign && foreign) {
      const visaIssue = isoDate(rand, 2024, 2026)
      const expiryOffset = i % 4 === 0 ? -10 : i % 4 === 1 ? 20 : i % 4 === 2 ? 75 : 520
      const expiryDate = addDays('2026-09-29', expiryOffset)
      visas.push({
        id:`VISA-${pad(i,5)}-001`, employmentId, nationality, visaType:foreign.visaType,
        visaStatus:expiryDate < '2026-09-29' ? 'EXPIRED' : 'ACTIVE', issueDate:visaIssue, expiryDate,
        workPermission:true, foreignRegistrationStatus:'REGISTERED', foreignRegistrationNumberMasked:`******-${pad(i,5)}*`,
        passportNumberMasked:`P****${pad(i,4)}`, passportExpiryDate:addDays(expiryDate, 365),
        effectiveStartDate:visaIssue, effectiveEndDate:null,
      })
      if (i % 46 === 0) {
        visas.push({
          id:`VISA-${pad(i,5)}-000`, employmentId, nationality, visaType:'D-10', visaStatus:'EXPIRED',
          issueDate:'2024-01-15', expiryDate:'2025-01-14', workPermission:true, foreignRegistrationStatus:'REGISTERED',
          foreignRegistrationNumberMasked:`******-${pad(i,5)}*`, passportNumberMasked:`P****${pad(i,4)}`,
          passportExpiryDate:'2028-12-31', effectiveStartDate:'2024-01-15', effectiveEndDate:'2025-01-14',
        })
      }
    }

    educations.push({
      id:`EDU-${pad(i,5)}-001`, employmentId, schoolName:pick(schools), major:pick(majors), degree:pick(['전문학사','학사','석사']),
      admissionDate:isoDate(rand, 1993, 2018), graduationDate:isoDate(rand, 1997, 2023), graduated:true, note:'가상 학력 데이터',
    })

    if (i % 3 !== 0) {
      const careerStart = isoDate(rand, 2005, 2021)
      const careerEnd = isoDate(rand, Math.min(2022, Number(careerStart.slice(0,4))+1), 2024)
      careers.push({
        id:`CAREER-${pad(i,5)}-001`, employmentId, companyName:pick(priorCompanies), organization:pick(['경영지원','사업운영','제품','개발']),
        job:pick(jobs), title:pick(['사원','대리','과장']), startDate:careerStart, endDate:careerEnd,
        responsibilities:'가상 이전 경력의 주요 업무 기록', careerMonths:monthsBetween(careerStart,careerEnd),
      })
    }

    if (i % 4 === 0) {
      certifications.push({
        id:`CERT-${pad(i,5)}-001`, employmentId, name:pick(['MOS Excel','SQLD','ADsP','ERP 인사정보관리사','정보처리기사']),
        issuer:'가상 발급기관', certificateNumberMasked:`CERT-****-${pad(i,5)}`, acquiredDate:isoDate(rand, 2018, 2026),
        expiryDate:null, status:'PERMANENT', attachmentName:`certificate_${employeeNumber}.pdf`,
      })
    }

    const baseSkills: EmployeeSkill[] = [
      { id:`SKILL-${pad(i,5)}-001`, employmentId, category:'IT', skillName:'Excel', proficiency:pick(['Intermediate','Advanced']), score:null, acquiredDate:null },
      { id:`SKILL-${pad(i,5)}-002`, employmentId, category:'Language', skillName:'English', proficiency:pick(['A2','B1','B2','C1']), score:null, acquiredDate:null },
    ]
    if (i % 3 === 0) baseSkills.push({ id:`SKILL-${pad(i,5)}-003`, employmentId, category:'Programming', skillName:'Python', proficiency:pick(['Beginner','Intermediate']), score:null, acquiredDate:null })
    skills.push(...baseSkills)

    resumes.push({
      id:`RES-${pad(i,5)}-001`, employmentId, fileName:`${employeeNumber}_resume_v1.pdf`, version:1,
      uploadedAt:`${hireDate}T09:00:00.000Z`, uploadedBy:'HR_ADMIN', status:i%7===0?'ARCHIVED':'CURRENT',
    })
    if (i % 7 === 0) resumes.push({
      id:`RES-${pad(i,5)}-002`, employmentId, fileName:`${employeeNumber}_resume_v2.pdf`, version:2,
      uploadedAt:'2026-05-01T09:00:00.000Z', uploadedBy:'HR_ADMIN', status:'CURRENT',
    })

    attendanceSettings.push({
      id:`ATTSET-${pad(i,5)}-001`, employmentId, workScheduleId:pick(workSchedules).id, timezone:'Asia/Seoul',
      attendancePin:`${100000 + i}`, badgeId:`BADGE-${pad(i,6)}`, rfidId:`RFID-${pad(i,8)}`,
    })


    if (status !== 'TERMINATED') {
      const annualSalary = compensations[compensations.length-1]?.annualSalary ?? 0
      yearEndTaxCases.push({
        id:`YET-${pad(i,5)}-2025`,employmentId,taxYear:2025,grossPay:annualSalary,
        incomeTaxWithheld:Math.round(annualSalary*0.035),localTaxWithheld:Math.round(annualSalary*0.0035),
        basicDeductionCount:dependentCount+1,childCount:dependents.filter(d=>d.employmentId===employmentId&&d.relation==='자녀').length,
        status:i%4===0?'REVIEW':'DRAFT',estimatedFinalTax:null,settlementAmount:null,ruleVersion:'KR-NTS-YET-2025-DATA',
      })
    }
  }

  // 일용직은 정규 Employee Master와 UI를 분리하지만 Person 원천 식별정보는 공유한다.
  for (let i=1;i<=24;i+=1) {
    const personId=`PER-DW-${pad(i,4)}`
    const name=`${pick(surnames)}${pick(firstNames)}`
    persons.push({id:personId,fullName:name,englishName:`Daily Worker ${i}`,hanjaName:'',birthDate:isoDate(rand,1970,2004),gender:rand()>.5?'F':'M',domesticForeignType:'DOMESTIC',nationality:'대한민국',reportingNationality:'대한민국',syntheticIdentifier:`SYN-DW-${pad(i,5)}`,profileImageUrl:null,mobile:`010-7777-${pad(i,4)}`,phone:'',email:`daily${i}@example.invalid`,emergencyContactName:'',emergencyContactPhone:'',emergencyContactRelation:''})
    const org=pick(teamOrgs); const workerId=`DW-${pad(i,4)}`
    dailyWorkers.push({id:workerId,personId,workerNumber:`D${pad(i,4)}`,workerNameSnapshot:name,organizationId:org.id,job:pick(['IT 이벤트 등록지원','IT 이벤트 운영보조','IT 행사 데이터정리','개발자 행사 안내','IT 이벤트 사무보조']),status:i%9===0?'ENDED':'ACTIVE',startDate:'2025-01-01',endDate:i%9===0?'2026-08-31':null,dailyRate:100000+(i%5)*10000,bankName:pick(banks),accountNumberMasked:`DW-****-${pad(i,5)}`})
    for (let m=7;m<=9;m+=1) {
      for (let d=1;d<=6+(i%5);d+=1) {
        const workDate=`2026-${pad(m,2)}-${pad(1+((d*3+i)%25),2)}`
        const hours=6+(d%3)
        const worker=dailyWorkers[dailyWorkers.length-1]
        if(workDate>=worker.startDate&&(!worker.endDate||workDate<=worker.endDate))dailyWorkRecords.push(calculateDailyWorkRecord(worker,workDate,hours,'가상 일용근로 기록'))
      }
    }
  }

  // 관리자/승인자 관계는 Employment 생성 이후 연결한다.
  const defaultHrManagerId = employments[0]?.id ?? null
  employments.forEach((employment, index) => {
    const directManagerId = index < 5 ? null : employments[Math.max(0, index - (1 + (index % 5)))]?.id ?? null
    const hrManagerId = defaultHrManagerId === employment.id ? (employments[1]?.id ?? null) : defaultHrManagerId
    managerRelationships.push({
      id:`MGR-${pad(index+1,5)}-001`, employmentId:employment.id, directManagerId, hrManagerId,
      leaveApproverId:directManagerId ?? hrManagerId, attendanceApproverId:directManagerId ?? hrManagerId,
      performanceReviewerId:directManagerId ?? hrManagerId, effectiveStartDate:employment.hireDate, effectiveEndDate:null,
    })
  })

  auditLogs.push({
    id:'AUD-SEED-001', occurredAt:new Date().toISOString(), actor:'SYSTEM', action:'SEED_DATABASE', entityType:'DATABASE', entityId:company.id,
    detail:`가상 Employment ${total}명과 Employee Master 확장 데이터를 생성했습니다.`,
  })

  return {
    company, organizations, persons, addresses, dependents, visas, bankAccounts, employments, assignments, compensations,
    taxProfiles, socialInsuranceProfiles, militaryServiceProfiles, educations, careers, certifications, skills, resumes, workSchedules,
    attendanceSettings, managerRelationships, personnelEvents:[], auditLogs, payrollRuns:[], payrollEntries:[], payrollResults:[],
    attendanceMonthlySummaries, annualLeaveLedgers, dailyWorkers, dailyWorkRecords, retirementSettlements, yearEndTaxCases, payrollItemMasters,
  }
}
