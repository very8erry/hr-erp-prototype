# 요구사항·코드 구조 대응표

문서 버전 1.0 | 작성 2026-11-18 KST | 분석 기준 b4aeb300270a62273d3d5f0c2fea87f2a09ba800

작성 근거: 고정 커밋의 src, config, 테스트 및 docs/verification 실행 기록. 문서 작업은 애플리케이션 코드를 변경하지 않는다.

관련 요구사항: 전체 요구사항

## HR-01 일반 직원등록

실행 심볼: [src/infrastructure/db/indexedDb.ts:241](https://github.com/very8erry/hr-erp-prototype/blob/b4aeb300270a62273d3d5f0c2fea87f2a09ba800/src/infrastructure/db/indexedDb.ts#L241) / registerEmployee

관련 타입/필드: store-type-map.json에서 persons, employments, assignments, compensations, bankAccounts, auditLogs를 따라 data-dictionary.csv의 entity/field로 이동한다.

규칙: BR-01, BR-02, BR-03

테스트: scripts/test-registration-integrity.ts

판정: 구현·회귀 통과

## HR-02 직원 원천 수정

실행 심볼: [src/infrastructure/db/indexedDb.ts:233](https://github.com/very8erry/hr-erp-prototype/blob/b4aeb300270a62273d3d5f0c2fea87f2a09ba800/src/infrastructure/db/indexedDb.ts#L233) / editMaster

관련 타입/필드: store-type-map.json에서 persons, employments, taxProfiles, socialInsuranceProfiles, auditLogs를 따라 data-dictionary.csv의 entity/field로 이동한다.

규칙: BR-01, BR-09

테스트: scripts/test-pr7-integration.ts

판정: 구현·이름 변경 시 잠금 결과 보존 확인

## HR-03 인사발령 등록·예약

실행 심볼: [src/infrastructure/db/indexedDb.ts:582](https://github.com/very8erry/hr-erp-prototype/blob/b4aeb300270a62273d3d5f0c2fea87f2a09ba800/src/infrastructure/db/indexedDb.ts#L582) / createPersonnelAction

관련 타입/필드: store-type-map.json에서 personnelEvents, assignments, employments, auditLogs를 따라 data-dictionary.csv의 entity/field로 이동한다.

규칙: BR-04

테스트: scripts/test-pr7-scheduled.ts

판정: 구현·정상/충돌 회귀 통과

## ATS-01 채용 평가와 오퍼

실행 심볼: [src/infrastructure/db/indexedDb.ts:887](https://github.com/very8erry/hr-erp-prototype/blob/b4aeb300270a62273d3d5f0c2fea87f2a09ba800/src/infrastructure/db/indexedDb.ts#L887) / saveRecruiting

관련 타입/필드: store-type-map.json에서 company를 따라 data-dictionary.csv의 entity/field로 이동한다.

규칙: BR-13, BR-16

테스트: scripts/test-selection.tsx

판정: 구현·로컬 역할, 외부 ATS 동기화 미확정

## ATS-02 ATS 입사전환

실행 심볼: [src/infrastructure/db/indexedDb.ts:899](https://github.com/very8erry/hr-erp-prototype/blob/b4aeb300270a62273d3d5f0c2fea87f2a09ba800/src/infrastructure/db/indexedDb.ts#L899) / convertCandidate

관련 타입/필드: store-type-map.json에서 company, persons, employments, assignments, compensations, auditLogs를 따라 data-dictionary.csv의 entity/field로 이동한다.

규칙: BR-01, BR-13

테스트: scripts/test-pr7-integration.ts

판정: 구현·정상/중복/다른 회사 조직 검사 통과

## WFM-01 월별·일별 근태 수정

실행 심볼: [src/infrastructure/db/indexedDb.ts:1049](https://github.com/very8erry/hr-erp-prototype/blob/b4aeb300270a62273d3d5f0c2fea87f2a09ba800/src/infrastructure/db/indexedDb.ts#L1049) / saveAttendanceBatch

관련 타입/필드: store-type-map.json에서 attendanceMonthlySummaries, attendanceDailyRecords, payrollRuns, payrollResults, auditLogs를 따라 data-dictionary.csv의 entity/field로 이동한다.

규칙: BR-05

테스트: scripts/test-pr7-scheduled.ts

판정: 구현·실제 Chrome stale/동시 저장 통과

## WFM-02 근태 마감

실행 심볼: [src/infrastructure/db/indexedDb.ts:933](https://github.com/very8erry/hr-erp-prototype/blob/b4aeb300270a62273d3d5f0c2fea87f2a09ba800/src/infrastructure/db/indexedDb.ts#L933) / closeAttendance

관련 타입/필드: store-type-map.json에서 company, attendanceMonthlySummaries를 따라 data-dictionary.csv의 entity/field로 이동한다.

규칙: BR-08, BR-10

테스트: scripts/test-pr7-integration.ts

판정: 구현·선행 마감 검사 통과

## WFM-03 연차 원장·촉진

실행 심볼: [src/infrastructure/db/indexedDb.ts:1149](https://github.com/very8erry/hr-erp-prototype/blob/b4aeb300270a62273d3d5f0c2fea87f2a09ba800/src/infrastructure/db/indexedDb.ts#L1149) / saveAnnualLeaveBatch

관련 타입/필드: store-type-map.json에서 annualLeaveLedgers, company, calendarEvents를 따라 data-dictionary.csv의 entity/field로 이동한다.

규칙: BR-10

테스트: scripts/test-domain.ts

판정: 원장 구현; 법정 개별 사례 전수검증 아님

## PAY-01 급여월·대상 생성

실행 심볼: [src/infrastructure/db/indexedDb.ts:631](https://github.com/very8erry/hr-erp-prototype/blob/b4aeb300270a62273d3d5f0c2fea87f2a09ba800/src/infrastructure/db/indexedDb.ts#L631) / createPayrollRun

관련 타입/필드: store-type-map.json에서 payrollRuns, payrollEntries를 따라 data-dictionary.csv의 entity/field로 이동한다.

규칙: BR-06

테스트: scripts/test-pr7-integration.ts

판정: 구현·employmentId 매칭 확인

## PAY-02 근태 수당 연동

실행 심볼: [src/modules/payroll/payrollService.ts:88](https://github.com/very8erry/hr-erp-prototype/blob/b4aeb300270a62273d3d5f0c2fea87f2a09ba800/src/modules/payroll/payrollService.ts#L88) / syncAttendance

관련 타입/필드: store-type-map.json에서 payrollEntries를 따라 data-dictionary.csv의 entity/field로 이동한다.

규칙: BR-05, BR-06

테스트: scripts/test-pr7-integration.ts

판정: 구현·서비스 계층에서 실행

## PAY-03 급여 계산·설정

실행 심볼: [src/infrastructure/db/indexedDb.ts:780](https://github.com/very8erry/hr-erp-prototype/blob/b4aeb300270a62273d3d5f0c2fea87f2a09ba800/src/infrastructure/db/indexedDb.ts#L780) / calculatePayrollRun

관련 타입/필드: store-type-map.json에서 payrollItemMasters, payrollEntries, payrollResults, payrollRuns를 따라 data-dictionary.csv의 entity/field로 이동한다.

규칙: BR-06

테스트: scripts/test-revision.tsx

판정: 구현·저장 산식 적용/스냅샷 회귀

## PAY-04 급여 검증·확정

실행 심볼: [src/infrastructure/db/indexedDb.ts:809](https://github.com/very8erry/hr-erp-prototype/blob/b4aeb300270a62273d3d5f0c2fea87f2a09ba800/src/infrastructure/db/indexedDb.ts#L809) / validatePayrollRun

관련 타입/필드: store-type-map.json에서 payrollRuns, payrollEntries, payrollResults, auditLogs를 따라 data-dictionary.csv의 entity/field로 이동한다.

규칙: BR-07, BR-08

테스트: scripts/test-domain.ts

판정: 구현·별도 사용자 승인 서버는 없음

## PAY-05 급여 마감·지급

실행 심볼: [src/infrastructure/db/indexedDb.ts:822](https://github.com/very8erry/hr-erp-prototype/blob/b4aeb300270a62273d3d5f0c2fea87f2a09ba800/src/infrastructure/db/indexedDb.ts#L822) / setPayrollRunStatus

관련 타입/필드: store-type-map.json에서 payrollRuns, auditLogs를 따라 data-dictionary.csv의 entity/field로 이동한다.

규칙: BR-08, BR-09

테스트: scripts/test-pr7-integration.ts

판정: 구현·실제 은행 이체 아님

## PAY-06 원천 정정·재계산

실행 심볼: [src/infrastructure/db/indexedDb.ts:1049](https://github.com/very8erry/hr-erp-prototype/blob/b4aeb300270a62273d3d5f0c2fea87f2a09ba800/src/infrastructure/db/indexedDb.ts#L1049) / saveAttendanceBatch

관련 타입/필드: store-type-map.json에서 payrollRuns, payrollResults, payrollEntries를 따라 data-dictionary.csv의 entity/field로 이동한다.

규칙: BR-05, BR-09

테스트: scripts/test-domain.ts

판정: 미확정 정정 구현; 마감 후 정정 Run 미구현

## PAY-07 퇴직정산

실행 심볼: [src/infrastructure/db/indexedDb.ts:1233](https://github.com/very8erry/hr-erp-prototype/blob/b4aeb300270a62273d3d5f0c2fea87f2a09ba800/src/infrastructure/db/indexedDb.ts#L1233) / calculateRetirementSettlement

관련 타입/필드: store-type-map.json에서 retirementSettlements를 따라 data-dictionary.csv의 entity/field로 이동한다.

규칙: BR-10, BR-12

테스트: scripts/test-pr7-integration.ts

판정: 구현·증빙 및 법률 전체 자동판정 아님

## PAY-08 연말정산

실행 심볼: [src/infrastructure/db/indexedDb.ts:1227](https://github.com/very8erry/hr-erp-prototype/blob/b4aeb300270a62273d3d5f0c2fea87f2a09ba800/src/infrastructure/db/indexedDb.ts#L1227) / saveYearEndBatch

관련 타입/필드: store-type-map.json에서 yearEndTaxCases를 따라 data-dictionary.csv의 entity/field로 이동한다.

규칙: BR-10, BR-12

테스트: scripts/test-pr7-integration.ts

판정: 구현·세액/서류 수기 검토 포함

## FILE-01 원천세 신고 초안

실행 심볼: [src/infrastructure/db/indexedDb.ts:923](https://github.com/very8erry/hr-erp-prototype/blob/b4aeb300270a62273d3d5f0c2fea87f2a09ba800/src/infrastructure/db/indexedDb.ts#L923) / saveWithholdingDraft

관련 타입/필드: store-type-map.json에서 company를 따라 data-dictionary.csv의 entity/field로 이동한다.

규칙: BR-14

테스트: scripts/test-v075.ts

판정: 구현·수리 여부 미검증

## FILE-02 보험 신고 목록

실행 심볼: [src/infrastructure/db/indexedDb.ts:884](https://github.com/very8erry/hr-erp-prototype/blob/b4aeb300270a62273d3d5f0c2fea87f2a09ba800/src/infrastructure/db/indexedDb.ts#L884) / saveOperation

관련 타입/필드: store-type-map.json에서 filingDrafts를 따라 data-dictionary.csv의 entity/field로 이동한다.

규칙: BR-14

테스트: scripts/test-v078.tsx

판정: 목록 작성 구현·기관 업로드 보증 아님

## DAILY-01 일용직·근무수당

실행 심볼: [src/infrastructure/db/indexedDb.ts:1176](https://github.com/very8erry/hr-erp-prototype/blob/b4aeb300270a62273d3d5f0c2fea87f2a09ba800/src/infrastructure/db/indexedDb.ts#L1176) / createDailyWorker

관련 타입/필드: store-type-map.json에서 persons, dailyWorkers, dailyWorkRecords, company를 따라 data-dictionary.csv의 entity/field로 이동한다.

규칙: BR-10, BR-15

테스트: scripts/test-pr7-integration.ts

판정: 구현·별도 고용 원장, Person 재사용 미구현

## OPS-01 업무일정·이슈·문서

실행 심볼: [src/infrastructure/db/indexedDb.ts:884](https://github.com/very8erry/hr-erp-prototype/blob/b4aeb300270a62273d3d5f0c2fea87f2a09ba800/src/infrastructure/db/indexedDb.ts#L884) / saveOperation

관련 타입/필드: store-type-map.json에서 calendarEvents, issues, policyDocuments, company를 따라 data-dictionary.csv의 entity/field로 이동한다.

규칙: BR-16

테스트: scripts/test-planning-review.ts

판정: 구현·일부 승인/역할 시뮬레이션

## SYS-01 전체 백업·복원

실행 심볼: [src/infrastructure/db/indexedDb.ts:1285](https://github.com/very8erry/hr-erp-prototype/blob/b4aeb300270a62273d3d5f0c2fea87f2a09ba800/src/infrastructure/db/indexedDb.ts#L1285) / importDatabase

관련 타입/필드: store-type-map.json에서 meta, company, persons, employments, payrollRuns, payrollResults를 따라 data-dictionary.csv의 entity/field로 이동한다.

규칙: BR-11

테스트: scripts/test-registration-integrity.ts

판정: 구현·중복 PK 결함 ISS-A01

## SYS-02 무결성 진단

실행 심볼: [src/infrastructure/db/indexedDb.ts:208](https://github.com/very8erry/hr-erp-prototype/blob/b4aeb300270a62273d3d5f0c2fea87f2a09ba800/src/infrastructure/db/indexedDb.ts#L208) / integrityFindings

관련 타입/필드: store-type-map.json에서 조회, 전용를 따라 data-dictionary.csv의 entity/field로 이동한다.

규칙: BR-01, BR-02

테스트: scripts/test-registration-integrity.ts

판정: 함수 구현·모든 쓰기의 FK 강제는 아님

## NFR-01 권한·개인정보

실행 심볼: [src/infrastructure/db/indexedDb.ts:1281](https://github.com/very8erry/hr-erp-prototype/blob/b4aeb300270a62273d3d5f0c2fea87f2a09ba800/src/infrastructure/db/indexedDb.ts#L1281) / exportDatabase

관련 타입/필드: store-type-map.json에서 브라우저, 전체를 따라 data-dictionary.csv의 entity/field로 이동한다.

규칙: BR-16

테스트: scripts/test-selection.tsx

판정: 로컬 통제; 운영 서버 권한 미구현

## FUT-01 AI 업무 시뮬레이션

실행 심볼: 없음. 향후 설계 대상.

관련 타입/필드: 현행 필드 대응 없음. 정책·도구 계약부터 설계한다.

규칙: BR-16

테스트: 없음. 미래 수용조건 제안.

판정: 제안·미구현
