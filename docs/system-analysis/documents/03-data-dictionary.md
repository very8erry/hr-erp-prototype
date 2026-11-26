# ERD 연계 필드 정의서

문서 버전 1.0 | 작성 2026-11-18 KST | 분석 기준 b4aeb300270a62273d3d5f0c2fea87f2a09ba800

작성 근거: 고정 커밋의 src, config, 테스트 및 docs/verification 실행 기록. 문서 작업은 애플리케이션 코드를 변경하지 않는다.

관련 요구사항: 전체 요구사항

기준은 D03 ERD와 sources/data-dictionary.csv(인터페이스 선언 1290개 필드), physical-stores.json(44개 물리 저장소), store-type-map.json이다. 모든 저장소는 keyPath=id. byPersonId/byEmploymentId는 참조 조회용 인덱스이며 FK 검증 장치가 아니다. unique:true만 중복 키를 DB가 거부한다.

선택성은 TypeScript의 ? 및 null과 구분한다. id 참조가 타입상 필수라도 대상 존재 여부를 IndexedDB가 보장하지 않는다. DTO/View/일시 계산 객체의 필드는 물리 저장소로 오인하지 않는다. CSV의 분류는 필드명 기반 검토 표식이며 개인정보 자동 판별의 완결된 결과가 아니다.

핵심 의미: personId는 사람, employmentId는 고용관계, runId는 월 급여 묶음이다. period는 YYYY-MM 귀속월, payDate는 지급일이며 같은 개념이 아니다. effectiveFrom/effectiveTo는 유효기간(끝 포함/null 열린 이력), revision/updatedAt은 근태 경합 검사, confirmedAt/confirmedBy는 개별 원장 잠금 표시다. company.attendanceClosed는 월 단위 마감 맵이다.

PayrollEntry의 monthlyBasePay·수당·보험기초·calculationInputs는 계산 입력, PayrollResult의 grossPay·공제·netPay는 결과다. itemSnapshot은 Run 계산 당시 항목 설정, hireDateSnapshot/terminationDateSnapshot 등은 원천의 시점 값이다. 원본과 스냅샷을 양방향 자동 동기화하지 않는다. monetary number 필드는 원 단위 계산 규칙을 각 함수에서 확인해야 하며 JavaScript number라는 사실만으로 정수 원 단위가 강제되지는 않는다.

PersonnelEvent.reviewReason은 상태 enum이 아니라 자동 적용 보류 사유다. sourceAssignmentSnapshot은 신규 예약 기준 이력이며 과거 데이터에는 없을 수 있다. absence/leave 속성의 유급·무급 의미는 timeRules/leaveCases 규칙과 함께 해석한다.

## attendanceDailyRecords → AttendanceDailyRecord

PK id. 요구사항: WFM-01

인덱스: byEmployeeDate=['employmentId', 'workDate'] [UNIQUE]

## leaveCases → LeaveCase

PK id. 요구사항:

인덱스: byEmploymentId=employmentId [non-unique]

## payrollSettingsHistory → {id:string; items:PayrollItemMaster[]}

PK id. 요구사항:

인덱스: 없음

## company → Company

PK id. 요구사항: ATS-01, ATS-02, WFM-02, WFM-03, FILE-01, DAILY-01, OPS-01, SYS-01

인덱스: 없음

## organizations → Organization

PK id. 요구사항:

인덱스: 없음

## persons → Person

PK id. 요구사항: HR-01, HR-02, ATS-02, DAILY-01, SYS-01

인덱스: byDomesticForeignType=domesticForeignType [non-unique]

## addresses → Address

PK id. 요구사항:

인덱스: byPersonId=personId [non-unique]

## dependents → Dependent

PK id. 요구사항:

인덱스: byEmploymentId=employmentId [non-unique]

## visas → Visa

PK id. 요구사항:

인덱스: byEmploymentId=employmentId [non-unique]; byExpiryDate=expiryDate [non-unique]

## bankAccounts → BankAccount

PK id. 요구사항: HR-01

인덱스: byEmploymentId=employmentId [non-unique]

## employments → Employment

PK id. 요구사항: HR-01, HR-02, HR-03, ATS-02, SYS-01

인덱스: byPersonId=personId [non-unique]; byStatus=status [non-unique]

## assignments → Assignment

PK id. 요구사항: HR-01, HR-03, ATS-02

인덱스: byEmploymentId=employmentId [non-unique]; byEffectiveTo=effectiveTo [non-unique]

## compensations → CompensationSnapshot

PK id. 요구사항: HR-01, ATS-02

인덱스: byEmploymentId=employmentId [non-unique]; byEffectiveTo=effectiveTo [non-unique]

## taxProfiles → TaxProfile

PK id. 요구사항: HR-02

인덱스: byEmploymentId=employmentId [non-unique]

## socialInsuranceProfiles → SocialInsuranceProfile

PK id. 요구사항: HR-02

인덱스: byEmploymentId=employmentId [non-unique]

## militaryServiceProfiles → MilitaryServiceProfile

PK id. 요구사항:

인덱스: byEmploymentId=employmentId [UNIQUE]

## educations → Education

PK id. 요구사항:

인덱스: byEmploymentId=employmentId [non-unique]

## careers → CareerHistory

PK id. 요구사항:

인덱스: byEmploymentId=employmentId [non-unique]

## certifications → Certification

PK id. 요구사항:

인덱스: byEmploymentId=employmentId [non-unique]

## skills → EmployeeSkill

PK id. 요구사항:

인덱스: byEmploymentId=employmentId [non-unique]; byCategory=category [non-unique]

## resumes → ResumeDocument

PK id. 요구사항:

인덱스: byEmploymentId=employmentId [non-unique]

## workSchedules → WorkSchedule

PK id. 요구사항:

인덱스: 없음

## attendanceSettings → AttendanceSetting

PK id. 요구사항:

인덱스: byEmploymentId=employmentId [non-unique]

## managerRelationships → ManagerRelationship

PK id. 요구사항:

인덱스: byEmploymentId=employmentId [UNIQUE]

## personnelEvents → PersonnelEvent

PK id. 요구사항: HR-03

인덱스: byEmploymentId=employmentId [non-unique]; byStatus=status [non-unique]; byEffectiveDate=effectiveDate [non-unique]

## auditLogs → AuditLog

PK id. 요구사항: HR-01, HR-02, HR-03, ATS-02, WFM-01, PAY-04, PAY-05

인덱스: byOccurredAt=occurredAt [non-unique]; byEntityId=entityId [non-unique]

## payrollRuns → PayrollRun

PK id. 요구사항: WFM-01, PAY-01, PAY-03, PAY-04, PAY-05, PAY-06, SYS-01

인덱스: byPeriod=period [UNIQUE]; byStatus=status [non-unique]

## payrollEntries → PayrollEntry

PK id. 요구사항: PAY-01, PAY-02, PAY-03, PAY-04, PAY-06

인덱스: byRunId=runId [non-unique]; byEmploymentId=employmentId [non-unique]; byRunEmployment=['runId', 'employmentId'] [UNIQUE]

## payrollResults → PayrollResult

PK id. 요구사항: WFM-01, PAY-03, PAY-04, PAY-06, SYS-01

인덱스: byRunId=runId [non-unique]; byEmploymentId=employmentId [non-unique]; byRunEmployment=['runId', 'employmentId'] [UNIQUE]

## attendanceMonthlySummaries → AttendanceMonthlySummary

PK id. 요구사항: WFM-01, WFM-02

인덱스: byEmploymentId=employmentId [non-unique]; byPeriod=period [non-unique]; byEmploymentPeriod=['employmentId', 'period'] [UNIQUE]

## annualLeaveLedgers → AnnualLeaveLedger

PK id. 요구사항: WFM-03

인덱스: byEmploymentId=employmentId [non-unique]; byYear=year [non-unique]; byEmploymentYear=['employmentId', 'year'] [UNIQUE]

## dailyWorkers → DailyWorker

PK id. 요구사항: DAILY-01

인덱스: byPersonId=personId [non-unique]; byOrganizationId=organizationId [non-unique]; byStatus=status [non-unique]

## dailyWorkRecords → DailyWorkRecord

PK id. 요구사항: DAILY-01

인덱스: byDailyWorkerId=dailyWorkerId [non-unique]; byWorkDate=workDate [non-unique]

## retirementSettlements → RetirementSettlement

PK id. 요구사항: PAY-07

인덱스: byEmploymentId=employmentId [non-unique]; byStatus=status [non-unique]

## yearEndTaxCases → YearEndTaxCase

PK id. 요구사항: PAY-08

인덱스: byEmploymentId=employmentId [non-unique]; byTaxYear=taxYear [non-unique]; byEmploymentYear=['employmentId', 'taxYear'] [UNIQUE]

## payrollItemMasters → PayrollItemMaster

PK id. 요구사항: PAY-03

인덱스: byCode=code [UNIQUE]; byCategory=category [non-unique]

## calendarEvents → CalendarEvent

PK id. 요구사항: WFM-03, OPS-01

인덱스: 없음

## issues → IssueCase

PK id. 요구사항: OPS-01

인덱스: 없음

## complianceSettings → config/meta 또는 operations 선언 참조

PK id. 요구사항:

인덱스: 없음

## policyDocuments → PolicyDocument

PK id. 요구사항: OPS-01

인덱스: 없음

## welfareCases → config/meta 또는 operations 선언 참조

PK id. 요구사항:

인덱스: 없음

## occupationCodeMappings → config/meta 또는 operations 선언 참조

PK id. 요구사항:

인덱스: 없음

## filingDrafts → FilingDraft

PK id. 요구사항: FILE-02

인덱스: 없음

## meta → config/meta 또는 operations 선언 참조

PK id. 요구사항: SYS-01

인덱스: 없음
