# DOC-03　데이터·필드 정의서

v1.0 · 2026-11-19 · b4aeb300270a62273d3d5f0c2fea87f2a09ba800

독자　데이터 설계·Payroll·검증 담당

목적과 범위　물리 스토어와 업무상 참조를 구분한다. 전체 필드의 선언 위치와 필수·선택 여부는 evidence/fields.csv, 인덱스 정의는 evidence/stores.json이 원본이다.

모든 물리 스토어의 기본키 경로는 id이다(migrations.ts:125). 아래 unique는 객체 저장소가 강제한다. 참조 대상의 존재·회사 일치·유효기간은 쓰기 경로의 검사에 의존한다. 타입에서 필수인 필드도 구버전 백업에는 누락될 수 있다.
 

| 스토어 | 인덱스 → 키 경로 (U = 유일) |
|---|---|
| attendanceDailyRecords | byEmployeeDate → ['employmentId', 'workDate'] [U] |
| leaveCases | byEmploymentId → employmentId |
| payrollSettingsHistory | 추가 인덱스 없음 |
| company | 추가 인덱스 없음 |
| organizations | 추가 인덱스 없음 |
| persons | byDomesticForeignType → domesticForeignType |
| addresses | byPersonId → personId |
| dependents | byEmploymentId → employmentId |
| visas | byEmploymentId → employmentId, byExpiryDate → expiryDate |
| bankAccounts | byEmploymentId → employmentId |
| employments | byPersonId → personId, byStatus → status |
| assignments | byEmploymentId → employmentId, byEffectiveTo → effectiveTo |
| compensations | byEmploymentId → employmentId, byEffectiveTo → effectiveTo |
| taxProfiles | byEmploymentId → employmentId |
| socialInsuranceProfiles | byEmploymentId → employmentId |
| militaryServiceProfiles | byEmploymentId → employmentId [U] |
| educations | byEmploymentId → employmentId |
| careers | byEmploymentId → employmentId |
| certifications | byEmploymentId → employmentId |
| skills | byEmploymentId → employmentId, byCategory → category |
| resumes | byEmploymentId → employmentId |
| workSchedules | 추가 인덱스 없음 |
| attendanceSettings | byEmploymentId → employmentId |
| managerRelationships | byEmploymentId → employmentId [U] |
| personnelEvents | byEmploymentId → employmentId, byStatus → status, byEffectiveDate → effectiveDate |
| auditLogs | byOccurredAt → occurredAt, byEntityId → entityId |
| payrollRuns | byPeriod → period [U], byStatus → status |
| payrollEntries | byRunId → runId, byEmploymentId → employmentId, byRunEmployment → ['runId', 'employmentId'] [U] |
| payrollResults | byRunId → runId, byEmploymentId → employmentId, byRunEmployment → ['runId', 'employmentId'] [U] |
| attendanceMonthlySummaries | byEmploymentId → employmentId, byPeriod → period, byEmploymentPeriod → ['employmentId', 'period'] [U] |
| annualLeaveLedgers | byEmploymentId → employmentId, byYear → year, byEmploymentYear → ['employmentId', 'year'] [U] |
| dailyWorkers | byPersonId → personId, byOrganizationId → organizationId, byStatus → status |
| dailyWorkRecords | byDailyWorkerId → dailyWorkerId, byWorkDate → workDate |
| retirementSettlements | byEmploymentId → employmentId, byStatus → status |
| yearEndTaxCases | byEmploymentId → employmentId, byTaxYear → taxYear, byEmploymentYear → ['employmentId', 'taxYear'] [U] |
| payrollItemMasters | byCode → code [U], byCategory → category |
| calendarEvents | 추가 인덱스 없음 |
| issues | 추가 인덱스 없음 |
| complianceSettings | 추가 인덱스 없음 |
| policyDocuments | 추가 인덱스 없음 |
| welfareCases | 추가 인덱스 없음 |
| occupationCodeMappings | 추가 인덱스 없음 |
| filingDrafts | 추가 인덱스 없음 |
| meta | 추가 인덱스 없음 |


## 시간에 따른 원천과 결과

Person은 개인, Employment는 해당 고용, Assignment와 CompensationSnapshot은 유효기간이 있는 이력이다. 논리적으로 개인에 여러 고용이 연결될 수 있다. 일반 등록과 ATS는 새 Person ID를 만들므로 재입사자를 자동 식별·통합한다는 근거는 없다. 퇴사 후 재입사 시 동일인 연결 기준은 조직 결정이 필요하다. 일용직은 DailyWorker.personId와 DailyWorkRecord.dailyWorkerId로 연결된다.
 
월 근태 고유키는 고용과 귀속월이다. 급여 입력과 결과는 각각 Run과 고용의 복합 유일 인덱스를 갖는다. 월 근태 ID를 Result에 직접 복사하지 않는다. 변경 시 Entry가 참조한 근태의 의미는 A01을 함께 읽어야 한다.
 
고용 생성 → 월말 이력 선택 → Entry 스냅샷 생성 → Result 계산 → 마감 보존 순이다. 근태는 열린 기간에 사유·revision을 기록하고, 계산 결과는 입력 변경 시 삭제·재생성한다. 확정 이후 연봉이나 성명을 바꾸더라도 이전 Entry와 Result는 별도 보관된다. 직원 상세 조회 모델과 원천 테이블을 혼동하면 원장에 산출 결과를 중복 저장하는 설계가 된다. 전체 삭제·영구 보존기간은 코드에서 조직 정책으로 확인되지 않았다.
