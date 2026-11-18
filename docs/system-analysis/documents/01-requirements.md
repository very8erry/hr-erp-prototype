# 요구사항 정의서

문서 버전 1.0 | 작성 2026-11-18 KST | 분석 기준 b4aeb300270a62273d3d5f0c2fea87f2a09ba800

작성 근거: 고정 커밋의 src, config, 테스트 및 docs/verification 실행 기록. 문서 작업은 애플리케이션 코드를 변경하지 않는다.

관련 요구사항: 전체 요구사항

## HR-01 일반 직원등록

**구분**: 업무

**목적**: 일반 직원등록의 판단 근거와 데이터 연결을 추적하여 후속 급여 업무의 누락·오연결을 줄인다.

**담당·이해관계자**: HR 운영자

**입력·전제**: 성명·사번·생년월일·입사일·연봉·조직

**업무 절차**: 직원 관리 → 등록 폼 → 필수값/이름 검토 → 저장 → 연결 확인

**출력**: 고용 ID 및 기본 인사·조직·보상 원장

**저장소**: persons, employments, assignments, compensations, bankAccounts, auditLogs

**규칙 참조**: BR-01, BR-02, BR-03

**정상**: 지정된 입력과 선행조건을 만족하면 저장 결과 및 후속 상태를 확인한다.

**예외**: 관련 BR의 거부·보류·잠금 조건을 적용하고 오류를 임의로 무시하지 않는다.

**구현 상태**: 구현·회귀 통과

**검증 기준**: test-registration-integrity.ts와 관련 BR을 대조한다. 테스트 파일 존재만으로 모든 경로 통과를 뜻하지 않으며 evidence 실행 기록에 한정한다.

코드: [src/infrastructure/db/indexedDb.ts:241](https://github.com/very8erry/hr-erp-prototype/blob/b4aeb300270a62273d3d5f0c2fea87f2a09ba800/src/infrastructure/db/indexedDb.ts#L241) / registerEmployee

테스트: scripts/test-registration-integrity.ts

문제/우선순위: ISS-C01 P1

## HR-02 직원 원천 수정

**구분**: 업무

**목적**: 직원 원천 수정의 판단 근거와 데이터 연결을 추적하여 후속 급여 업무의 누락·오연결을 줄인다.

**담당·이해관계자**: HR 운영자

**입력·전제**: 고용 ID, 허용 필드, 수정 사유

**업무 절차**: 직원 상세 → 원천정보 수정 → 필드 검증 → before/after 로그 확인

**출력**: 변경된 원천 레코드; 과거 급여 스냅샷은 별개

**저장소**: persons, employments, taxProfiles, socialInsuranceProfiles, auditLogs

**규칙 참조**: BR-01, BR-09

**정상**: 지정된 입력과 선행조건을 만족하면 저장 결과 및 후속 상태를 확인한다.

**예외**: 관련 BR의 거부·보류·잠금 조건을 적용하고 오류를 임의로 무시하지 않는다.

**구현 상태**: 구현·이름 변경 시 잠금 결과 보존 확인

**검증 기준**: test-pr7-integration.ts와 관련 BR을 대조한다. 테스트 파일 존재만으로 모든 경로 통과를 뜻하지 않으며 evidence 실행 기록에 한정한다.

코드: [src/infrastructure/db/indexedDb.ts:233](https://github.com/very8erry/hr-erp-prototype/blob/b4aeb300270a62273d3d5f0c2fea87f2a09ba800/src/infrastructure/db/indexedDb.ts#L233) / editMaster

테스트: scripts/test-pr7-integration.ts

문제/우선순위: 별도 신규 과제 없음

## HR-03 인사발령 등록·예약

**구분**: 업무

**목적**: 인사발령 등록·예약의 판단 근거와 데이터 연결을 추적하여 후속 급여 업무의 누락·오연결을 줄인다.

**담당·이해관계자**: HR 운영자

**입력·전제**: 고용 ID·종류·효력일·변경값·사유

**업무 절차**: 발령 등록 → 동일일/기간 검사 → 즉시 적용 또는 예약 → 검토 필요 확인

**출력**: PersonnelEvent 및 적용 시 새 Assignment/종료일

**저장소**: personnelEvents, assignments, employments, auditLogs

**규칙 참조**: BR-04

**정상**: 지정된 입력과 선행조건을 만족하면 저장 결과 및 후속 상태를 확인한다.

**예외**: 관련 BR의 거부·보류·잠금 조건을 적용하고 오류를 임의로 무시하지 않는다.

**구현 상태**: 구현·정상/충돌 회귀 통과

**검증 기준**: test-pr7-scheduled.ts와 관련 BR을 대조한다. 테스트 파일 존재만으로 모든 경로 통과를 뜻하지 않으며 evidence 실행 기록에 한정한다.

코드: [src/infrastructure/db/indexedDb.ts:582](https://github.com/very8erry/hr-erp-prototype/blob/b4aeb300270a62273d3d5f0c2fea87f2a09ba800/src/infrastructure/db/indexedDb.ts#L582) / createPersonnelAction

테스트: scripts/test-pr7-scheduled.ts

문제/우선순위: ISS-C03 P2

## ATS-01 채용 평가와 오퍼

**구분**: 업무

**목적**: 채용 평가와 오퍼의 판단 근거와 데이터 연결을 추적하여 후속 급여 업무의 누락·오연결을 줄인다.

**담당·이해관계자**: 로컬 평가자/HR 역할

**입력·전제**: 지원자·평가표·점수·최종 결정·오퍼

**업무 절차**: 지원자 접수 → 서류/면접 평가 → 최종 판단 → 오퍼

**출력**: 회사 레코드 내부 recruiting 상태

**저장소**: company

**규칙 참조**: BR-13, BR-16

**정상**: 지정된 입력과 선행조건을 만족하면 저장 결과 및 후속 상태를 확인한다.

**예외**: 관련 BR의 거부·보류·잠금 조건을 적용하고 오류를 임의로 무시하지 않는다.

**구현 상태**: 구현·로컬 역할, 외부 ATS 동기화 미확정

**검증 기준**: test-selection.tsx와 관련 BR을 대조한다. 테스트 파일 존재만으로 모든 경로 통과를 뜻하지 않으며 evidence 실행 기록에 한정한다.

코드: [src/infrastructure/db/indexedDb.ts:887](https://github.com/very8erry/hr-erp-prototype/blob/b4aeb300270a62273d3d5f0c2fea87f2a09ba800/src/infrastructure/db/indexedDb.ts#L887) / saveRecruiting

테스트: scripts/test-selection.tsx

문제/우선순위: 별도 신규 과제 없음

## ATS-02 ATS 입사전환

**구분**: 업무

**목적**: ATS 입사전환의 판단 근거와 데이터 연결을 추적하여 후속 급여 업무의 누락·오연결을 줄인다.

**담당·이해관계자**: HR 운영자

**입력·전제**: 수락 오퍼 ID·후보자 ID·사번·생년월일

**업무 절차**: 합격/수락 확인 → 입사전환 → 고용 연결 확인

**출력**: 신규 Person/Employment, candidate 연결

**저장소**: company, persons, employments, assignments, compensations, auditLogs

**규칙 참조**: BR-01, BR-13

**정상**: 지정된 입력과 선행조건을 만족하면 저장 결과 및 후속 상태를 확인한다.

**예외**: 관련 BR의 거부·보류·잠금 조건을 적용하고 오류를 임의로 무시하지 않는다.

**구현 상태**: 구현·정상/중복/다른 회사 조직 검사 통과

**검증 기준**: test-pr7-integration.ts와 관련 BR을 대조한다. 테스트 파일 존재만으로 모든 경로 통과를 뜻하지 않으며 evidence 실행 기록에 한정한다.

코드: [src/infrastructure/db/indexedDb.ts:899](https://github.com/very8erry/hr-erp-prototype/blob/b4aeb300270a62273d3d5f0c2fea87f2a09ba800/src/infrastructure/db/indexedDb.ts#L899) / convertCandidate

테스트: scripts/test-pr7-integration.ts

문제/우선순위: 별도 신규 과제 없음

## WFM-01 월별·일별 근태 수정

**구분**: 업무

**목적**: 월별·일별 근태 수정의 판단 근거와 데이터 연결을 추적하여 후속 급여 업무의 누락·오연결을 줄인다.

**담당·이해관계자**: HR 운영자

**입력·전제**: 고용 ID·귀속월/일·시간·수정 사유·revision

**업무 절차**: 근태 조회 → 원천 수정 → 잠금/충돌 검사 → 급여 재검토

**출력**: 근태 저장, 미확정 급여 결과 무효화

**저장소**: attendanceMonthlySummaries, attendanceDailyRecords, payrollRuns, payrollResults, auditLogs

**규칙 참조**: BR-05

**정상**: 지정된 입력과 선행조건을 만족하면 저장 결과 및 후속 상태를 확인한다.

**예외**: 관련 BR의 거부·보류·잠금 조건을 적용하고 오류를 임의로 무시하지 않는다.

**구현 상태**: 구현·실제 Chrome stale/동시 저장 통과

**검증 기준**: test-pr7-scheduled.ts와 관련 BR을 대조한다. 테스트 파일 존재만으로 모든 경로 통과를 뜻하지 않으며 evidence 실행 기록에 한정한다.

코드: [src/infrastructure/db/indexedDb.ts:1049](https://github.com/very8erry/hr-erp-prototype/blob/b4aeb300270a62273d3d5f0c2fea87f2a09ba800/src/infrastructure/db/indexedDb.ts#L1049) / saveAttendanceBatch

테스트: scripts/test-pr7-scheduled.ts

문제/우선순위: 별도 신규 과제 없음

## WFM-02 근태 마감

**구분**: 업무

**목적**: 근태 마감의 판단 근거와 데이터 연결을 추적하여 후속 급여 업무의 누락·오연결을 줄인다.

**담당·이해관계자**: HR 운영자

**입력·전제**: 귀속월 및 저장된 근태

**업무 절차**: 대상·누락 검토 → 원장 확정 → 월 마감 → 급여 마감 가능

**출력**: 회사 attendanceClosed 및 confirmedAt

**저장소**: company, attendanceMonthlySummaries

**규칙 참조**: BR-08, BR-10

**정상**: 지정된 입력과 선행조건을 만족하면 저장 결과 및 후속 상태를 확인한다.

**예외**: 관련 BR의 거부·보류·잠금 조건을 적용하고 오류를 임의로 무시하지 않는다.

**구현 상태**: 구현·선행 마감 검사 통과

**검증 기준**: test-pr7-integration.ts와 관련 BR을 대조한다. 테스트 파일 존재만으로 모든 경로 통과를 뜻하지 않으며 evidence 실행 기록에 한정한다.

코드: [src/infrastructure/db/indexedDb.ts:933](https://github.com/very8erry/hr-erp-prototype/blob/b4aeb300270a62273d3d5f0c2fea87f2a09ba800/src/infrastructure/db/indexedDb.ts#L933) / closeAttendance

테스트: scripts/test-pr7-integration.ts

문제/우선순위: 별도 신규 과제 없음

## WFM-03 연차 원장·촉진

**구분**: 업무

**목적**: 연차 원장·촉진의 판단 근거와 데이터 연결을 추적하여 후속 급여 업무의 누락·오연결을 줄인다.

**담당·이해관계자**: HR 운영자

**입력·전제**: 입사일·연도·발생/사용·회사 운영기준

**업무 절차**: 연차 조회 → 기준 비교/원장 검토 → 수기 저장·확정 → 촉진 자료 검토

**출력**: 연차 원장과 업무일정/문서

**저장소**: annualLeaveLedgers, company, calendarEvents

**규칙 참조**: BR-10

**정상**: 지정된 입력과 선행조건을 만족하면 저장 결과 및 후속 상태를 확인한다.

**예외**: 관련 BR의 거부·보류·잠금 조건을 적용하고 오류를 임의로 무시하지 않는다.

**구현 상태**: 원장 구현; 법정 개별 사례 전수검증 아님

**검증 기준**: test-domain.ts와 관련 BR을 대조한다. 테스트 파일 존재만으로 모든 경로 통과를 뜻하지 않으며 evidence 실행 기록에 한정한다.

코드: [src/infrastructure/db/indexedDb.ts:1149](https://github.com/very8erry/hr-erp-prototype/blob/b4aeb300270a62273d3d5f0c2fea87f2a09ba800/src/infrastructure/db/indexedDb.ts#L1149) / saveAnnualLeaveBatch

테스트: scripts/test-domain.ts

문제/우선순위: 별도 신규 과제 없음

## PAY-01 급여월·대상 생성

**구분**: 업무

**목적**: 급여월·대상 생성의 판단 근거와 데이터 연결을 추적하여 후속 급여 업무의 누락·오연결을 줄인다.

**담당·이해관계자**: 급여 담당

**입력·전제**: 귀속월·지급일·대상 고용관계

**업무 절차**: 급여월 생성 → 재직기간 대상 추출 → 조직·보상·세금 기초 스냅샷

**출력**: PayrollRun 및 PayrollEntry

**저장소**: payrollRuns, payrollEntries

**규칙 참조**: BR-06

**정상**: 지정된 입력과 선행조건을 만족하면 저장 결과 및 후속 상태를 확인한다.

**예외**: 관련 BR의 거부·보류·잠금 조건을 적용하고 오류를 임의로 무시하지 않는다.

**구현 상태**: 구현·employmentId 매칭 확인

**검증 기준**: test-pr7-integration.ts와 관련 BR을 대조한다. 테스트 파일 존재만으로 모든 경로 통과를 뜻하지 않으며 evidence 실행 기록에 한정한다.

코드: [src/infrastructure/db/indexedDb.ts:631](https://github.com/very8erry/hr-erp-prototype/blob/b4aeb300270a62273d3d5f0c2fea87f2a09ba800/src/infrastructure/db/indexedDb.ts#L631) / createPayrollRun

테스트: scripts/test-pr7-integration.ts

문제/우선순위: 별도 신규 과제 없음

## PAY-02 근태 수당 연동

**구분**: 업무

**목적**: 근태 수당 연동의 판단 근거와 데이터 연결을 추적하여 후속 급여 업무의 누락·오연결을 줄인다.

**담당·이해관계자**: 급여 담당

**입력·전제**: Run ID, 월별 근태와 일별 휴일초과시간

**업무 절차**: 근태 원천 검토 → 연동 호출 → 시간·수당을 급여 입력에 반영

**출력**: calculationInputs와 수당 입력

**저장소**: payrollEntries

**규칙 참조**: BR-05, BR-06

**정상**: 지정된 입력과 선행조건을 만족하면 저장 결과 및 후속 상태를 확인한다.

**예외**: 관련 BR의 거부·보류·잠금 조건을 적용하고 오류를 임의로 무시하지 않는다.

**구현 상태**: 구현·서비스 계층에서 실행

**검증 기준**: test-pr7-integration.ts와 관련 BR을 대조한다. 테스트 파일 존재만으로 모든 경로 통과를 뜻하지 않으며 evidence 실행 기록에 한정한다.

코드: [src/modules/payroll/payrollService.ts:88](https://github.com/very8erry/hr-erp-prototype/blob/b4aeb300270a62273d3d5f0c2fea87f2a09ba800/src/modules/payroll/payrollService.ts#L88) / syncAttendance

테스트: scripts/test-pr7-integration.ts

문제/우선순위: 별도 신규 과제 없음

## PAY-03 급여 계산·설정

**구분**: 업무

**목적**: 급여 계산·설정의 판단 근거와 데이터 연결을 추적하여 후속 급여 업무의 누락·오연결을 줄인다.

**담당·이해관계자**: 급여 담당

**입력·전제**: 수기 입력·항목 사용/산식·근태시간·보험기초

**업무 절차**: 항목 설정 검토 → 입력 저장 → 계산 → 결과 대조

**출력**: PayrollResult 및 Run.itemSnapshot

**저장소**: payrollItemMasters, payrollEntries, payrollResults, payrollRuns

**규칙 참조**: BR-06

**정상**: 지정된 입력과 선행조건을 만족하면 저장 결과 및 후속 상태를 확인한다.

**예외**: 관련 BR의 거부·보류·잠금 조건을 적용하고 오류를 임의로 무시하지 않는다.

**구현 상태**: 구현·저장 산식 적용/스냅샷 회귀

**검증 기준**: test-revision.tsx와 관련 BR을 대조한다. 테스트 파일 존재만으로 모든 경로 통과를 뜻하지 않으며 evidence 실행 기록에 한정한다.

코드: [src/infrastructure/db/indexedDb.ts:780](https://github.com/very8erry/hr-erp-prototype/blob/b4aeb300270a62273d3d5f0c2fea87f2a09ba800/src/infrastructure/db/indexedDb.ts#L780) / calculatePayrollRun

테스트: scripts/test-revision.tsx

문제/우선순위: 별도 신규 과제 없음

## PAY-04 급여 검증·확정

**구분**: 업무

**목적**: 급여 검증·확정의 판단 근거와 데이터 연결을 추적하여 후속 급여 업무의 누락·오연결을 줄인다.

**담당·이해관계자**: 급여 담당/검토 역할

**입력·전제**: 계산 가능한 Run ID

**업무 절차**: 검증 → 오류 수정 → 재검증 → 확정

**출력**: VALIDATED/CONFIRMED 및 시각

**저장소**: payrollRuns, payrollEntries, payrollResults, auditLogs

**규칙 참조**: BR-07, BR-08

**정상**: 지정된 입력과 선행조건을 만족하면 저장 결과 및 후속 상태를 확인한다.

**예외**: 관련 BR의 거부·보류·잠금 조건을 적용하고 오류를 임의로 무시하지 않는다.

**구현 상태**: 구현·별도 사용자 승인 서버는 없음

**검증 기준**: test-domain.ts와 관련 BR을 대조한다. 테스트 파일 존재만으로 모든 경로 통과를 뜻하지 않으며 evidence 실행 기록에 한정한다.

코드: [src/infrastructure/db/indexedDb.ts:809](https://github.com/very8erry/hr-erp-prototype/blob/b4aeb300270a62273d3d5f0c2fea87f2a09ba800/src/infrastructure/db/indexedDb.ts#L809) / validatePayrollRun

테스트: scripts/test-domain.ts

문제/우선순위: ISS-B01 P1

## PAY-05 급여 마감·지급

**구분**: 업무

**목적**: 급여 마감·지급의 판단 근거와 데이터 연결을 추적하여 후속 급여 업무의 누락·오연결을 줄인다.

**담당·이해관계자**: 급여 담당

**입력·전제**: 확정 Run, 근태 마감 여부

**업무 절차**: 근태 마감 → 급여 마감 → 지급 완료 표시

**출력**: CLOSED/PAID 및 시각

**저장소**: payrollRuns, auditLogs

**규칙 참조**: BR-08, BR-09

**정상**: 지정된 입력과 선행조건을 만족하면 저장 결과 및 후속 상태를 확인한다.

**예외**: 관련 BR의 거부·보류·잠금 조건을 적용하고 오류를 임의로 무시하지 않는다.

**구현 상태**: 구현·실제 은행 이체 아님

**검증 기준**: test-pr7-integration.ts와 관련 BR을 대조한다. 테스트 파일 존재만으로 모든 경로 통과를 뜻하지 않으며 evidence 실행 기록에 한정한다.

코드: [src/infrastructure/db/indexedDb.ts:822](https://github.com/very8erry/hr-erp-prototype/blob/b4aeb300270a62273d3d5f0c2fea87f2a09ba800/src/infrastructure/db/indexedDb.ts#L822) / setPayrollRunStatus

테스트: scripts/test-pr7-integration.ts

문제/우선순위: ISS-A02 P1

## PAY-06 원천 정정·재계산

**구분**: 업무

**목적**: 원천 정정·재계산의 판단 근거와 데이터 연결을 추적하여 후속 급여 업무의 누락·오연결을 줄인다.

**담당·이해관계자**: 급여 담당

**입력·전제**: 미확정 Run/원천 및 사유

**업무 절차**: 수정 → stale/결과 삭제 → 근태 연동/계산 → 검증

**출력**: 새 미확정 결과; 잠금 상태는 거부

**저장소**: payrollRuns, payrollResults, payrollEntries

**규칙 참조**: BR-05, BR-09

**정상**: 지정된 입력과 선행조건을 만족하면 저장 결과 및 후속 상태를 확인한다.

**예외**: 관련 BR의 거부·보류·잠금 조건을 적용하고 오류를 임의로 무시하지 않는다.

**구현 상태**: 미확정 정정 구현; 마감 후 정정 Run 미구현

**검증 기준**: test-domain.ts와 관련 BR을 대조한다. 테스트 파일 존재만으로 모든 경로 통과를 뜻하지 않으며 evidence 실행 기록에 한정한다.

코드: [src/infrastructure/db/indexedDb.ts:1049](https://github.com/very8erry/hr-erp-prototype/blob/b4aeb300270a62273d3d5f0c2fea87f2a09ba800/src/infrastructure/db/indexedDb.ts#L1049) / saveAttendanceBatch

테스트: scripts/test-domain.ts

문제/우선순위: ISS-C02 P1

## PAY-07 퇴직정산

**구분**: 업무

**목적**: 퇴직정산의 판단 근거와 데이터 연결을 추적하여 후속 급여 업무의 누락·오연결을 줄인다.

**담당·이해관계자**: 급여 담당

**입력·전제**: 퇴사일·임금자료·DB/DC 관련 수기값

**업무 절차**: 퇴사일 확인 → 임금 기준 산정 → 검토/수기 보완 → 확정

**출력**: 퇴직정산 원장

**저장소**: retirementSettlements

**규칙 참조**: BR-10, BR-12

**정상**: 지정된 입력과 선행조건을 만족하면 저장 결과 및 후속 상태를 확인한다.

**예외**: 관련 BR의 거부·보류·잠금 조건을 적용하고 오류를 임의로 무시하지 않는다.

**구현 상태**: 구현·증빙 및 법률 전체 자동판정 아님

**검증 기준**: test-pr7-integration.ts와 관련 BR을 대조한다. 테스트 파일 존재만으로 모든 경로 통과를 뜻하지 않으며 evidence 실행 기록에 한정한다.

코드: [src/infrastructure/db/indexedDb.ts:1233](https://github.com/very8erry/hr-erp-prototype/blob/b4aeb300270a62273d3d5f0c2fea87f2a09ba800/src/infrastructure/db/indexedDb.ts#L1233) / calculateRetirementSettlement

테스트: scripts/test-pr7-integration.ts

문제/우선순위: 별도 신규 과제 없음

## PAY-08 연말정산

**구분**: 업무

**목적**: 연말정산의 판단 근거와 데이터 연결을 추적하여 후속 급여 업무의 누락·오연결을 줄인다.

**담당·이해관계자**: 급여 담당

**입력·전제**: 급여 합계·기납부세액·최종세액·서류검토

**업무 절차**: 자료 대조 → 최종세액 입력 → 차액 계산 → 확정

**출력**: 정산액 원장과 서류검토 상태

**저장소**: yearEndTaxCases

**규칙 참조**: BR-10, BR-12

**정상**: 지정된 입력과 선행조건을 만족하면 저장 결과 및 후속 상태를 확인한다.

**예외**: 관련 BR의 거부·보류·잠금 조건을 적용하고 오류를 임의로 무시하지 않는다.

**구현 상태**: 구현·세액/서류 수기 검토 포함

**검증 기준**: test-pr7-integration.ts와 관련 BR을 대조한다. 테스트 파일 존재만으로 모든 경로 통과를 뜻하지 않으며 evidence 실행 기록에 한정한다.

코드: [src/infrastructure/db/indexedDb.ts:1227](https://github.com/very8erry/hr-erp-prototype/blob/b4aeb300270a62273d3d5f0c2fea87f2a09ba800/src/infrastructure/db/indexedDb.ts#L1227) / saveYearEndBatch

테스트: scripts/test-pr7-integration.ts

문제/우선순위: 별도 신규 과제 없음

## FILE-01 원천세 신고 초안

**구분**: 업무

**목적**: 원천세 신고 초안의 판단 근거와 데이터 연결을 추적하여 후속 급여 업무의 누락·오연결을 줄인다.

**담당·이해관계자**: 급여 담당

**입력·전제**: Run 결과·일용 지급·회사정보·수기 검토

**업무 절차**: 초안 생성 → 코드별 합계 → 검토 표시 → HTML/PDF 출력

**출력**: WithholdingDraft/출력

**저장소**: company

**규칙 참조**: BR-14

**정상**: 지정된 입력과 선행조건을 만족하면 저장 결과 및 후속 상태를 확인한다.

**예외**: 관련 BR의 거부·보류·잠금 조건을 적용하고 오류를 임의로 무시하지 않는다.

**구현 상태**: 구현·수리 여부 미검증

**검증 기준**: test-v075.ts와 관련 BR을 대조한다. 테스트 파일 존재만으로 모든 경로 통과를 뜻하지 않으며 evidence 실행 기록에 한정한다.

코드: [src/infrastructure/db/indexedDb.ts:923](https://github.com/very8erry/hr-erp-prototype/blob/b4aeb300270a62273d3d5f0c2fea87f2a09ba800/src/infrastructure/db/indexedDb.ts#L923) / saveWithholdingDraft

테스트: scripts/test-v075.ts

문제/우선순위: 별도 신규 과제 없음

## FILE-02 보험 신고 목록

**구분**: 업무

**목적**: 보험 신고 목록의 판단 근거와 데이터 연결을 추적하여 후속 급여 업무의 누락·오연결을 줄인다.

**담당·이해관계자**: HR/급여 담당

**입력·전제**: 입퇴사·직종·보수·회사 관리번호

**업무 절차**: 대상 자동 불러오기/수기 → 작성 → 파일 생성 → 별도 신고처 확인

**출력**: filingDrafts와 파일

**저장소**: filingDrafts

**규칙 참조**: BR-14

**정상**: 지정된 입력과 선행조건을 만족하면 저장 결과 및 후속 상태를 확인한다.

**예외**: 관련 BR의 거부·보류·잠금 조건을 적용하고 오류를 임의로 무시하지 않는다.

**구현 상태**: 목록 작성 구현·기관 업로드 보증 아님

**검증 기준**: test-v078.tsx와 관련 BR을 대조한다. 테스트 파일 존재만으로 모든 경로 통과를 뜻하지 않으며 evidence 실행 기록에 한정한다.

코드: [src/infrastructure/db/indexedDb.ts:884](https://github.com/very8erry/hr-erp-prototype/blob/b4aeb300270a62273d3d5f0c2fea87f2a09ba800/src/infrastructure/db/indexedDb.ts#L884) / saveOperation

테스트: scripts/test-v078.tsx

문제/우선순위: 별도 신규 과제 없음

## DAILY-01 일용직·근무수당

**구분**: 업무

**목적**: 일용직·근무수당의 판단 근거와 데이터 연결을 추적하여 후속 급여 업무의 누락·오연결을 줄인다.

**담당·이해관계자**: HR/급여 담당

**입력·전제**: 일용직 번호·기간·일급·일별 시간/수당

**업무 절차**: 근로자 생성 → 근무기록 입력 → 계산 → 확정·월 마감

**출력**: 일용직 원장·근로내용 신고 자료

**저장소**: persons, dailyWorkers, dailyWorkRecords, company

**규칙 참조**: BR-10, BR-15

**정상**: 지정된 입력과 선행조건을 만족하면 저장 결과 및 후속 상태를 확인한다.

**예외**: 관련 BR의 거부·보류·잠금 조건을 적용하고 오류를 임의로 무시하지 않는다.

**구현 상태**: 구현·별도 고용 원장, Person 재사용 미구현

**검증 기준**: test-pr7-integration.ts와 관련 BR을 대조한다. 테스트 파일 존재만으로 모든 경로 통과를 뜻하지 않으며 evidence 실행 기록에 한정한다.

코드: [src/infrastructure/db/indexedDb.ts:1176](https://github.com/very8erry/hr-erp-prototype/blob/b4aeb300270a62273d3d5f0c2fea87f2a09ba800/src/infrastructure/db/indexedDb.ts#L1176) / createDailyWorker

테스트: scripts/test-pr7-integration.ts

문제/우선순위: ISS-B04 P2

## OPS-01 업무일정·이슈·문서

**구분**: 업무

**목적**: 업무일정·이슈·문서의 판단 근거와 데이터 연결을 추적하여 후속 급여 업무의 누락·오연결을 줄인다.

**담당·이해관계자**: HR 운영자

**입력·전제**: 공지·임금일·이슈·수기 일정·중요도

**업무 절차**: 원천 일정 연동 → 변경안 검토 → 캘린더/이슈 추적

**출력**: 운영 저장소 레코드

**저장소**: calendarEvents, issues, policyDocuments, company

**규칙 참조**: BR-16

**정상**: 지정된 입력과 선행조건을 만족하면 저장 결과 및 후속 상태를 확인한다.

**예외**: 관련 BR의 거부·보류·잠금 조건을 적용하고 오류를 임의로 무시하지 않는다.

**구현 상태**: 구현·일부 승인/역할 시뮬레이션

**검증 기준**: test-planning-review.ts와 관련 BR을 대조한다. 테스트 파일 존재만으로 모든 경로 통과를 뜻하지 않으며 evidence 실행 기록에 한정한다.

코드: [src/infrastructure/db/indexedDb.ts:884](https://github.com/very8erry/hr-erp-prototype/blob/b4aeb300270a62273d3d5f0c2fea87f2a09ba800/src/infrastructure/db/indexedDb.ts#L884) / saveOperation

테스트: scripts/test-planning-review.ts

문제/우선순위: 별도 신규 과제 없음

## SYS-01 전체 백업·복원

**구분**: 시스템

**목적**: 전체 백업·복원의 판단 근거와 데이터 연결을 추적하여 후속 급여 업무의 누락·오연결을 줄인다.

**담당·이해관계자**: 로컬 사용자

**입력·전제**: schemaVersion 및 전체 JSON

**업무 절차**: 백업 저장 → 외부 보관 → 복원 전 스키마 검사 → 변환·원자 교체

**출력**: 로컬 전체 저장소

**저장소**: meta, company, persons, employments, payrollRuns, payrollResults

**규칙 참조**: BR-11

**정상**: 지정된 입력과 선행조건을 만족하면 저장 결과 및 후속 상태를 확인한다.

**예외**: 관련 BR의 거부·보류·잠금 조건을 적용하고 오류를 임의로 무시하지 않는다.

**구현 상태**: 구현·중복 PK 결함 ISS-A01

**검증 기준**: test-registration-integrity.ts와 관련 BR을 대조한다. 테스트 파일 존재만으로 모든 경로 통과를 뜻하지 않으며 evidence 실행 기록에 한정한다.

코드: [src/infrastructure/db/indexedDb.ts:1285](https://github.com/very8erry/hr-erp-prototype/blob/b4aeb300270a62273d3d5f0c2fea87f2a09ba800/src/infrastructure/db/indexedDb.ts#L1285) / importDatabase

테스트: scripts/test-registration-integrity.ts

문제/우선순위: ISS-A01 P1, ISS-B03 P2

## SYS-02 무결성 진단

**구분**: 시스템

**목적**: 무결성 진단의 판단 근거와 데이터 연결을 추적하여 후속 급여 업무의 누락·오연결을 줄인다.

**담당·이해관계자**: 개발/검토자

**입력·전제**: 전체 SeedBundle

**업무 절차**: 참조·중복·기간 검사 → finding → 수동 검토

**출력**: finding 목록, 임의 수정 없음

**저장소**: 조회, 전용

**규칙 참조**: BR-01, BR-02

**정상**: 지정된 입력과 선행조건을 만족하면 저장 결과 및 후속 상태를 확인한다.

**예외**: 관련 BR의 거부·보류·잠금 조건을 적용하고 오류를 임의로 무시하지 않는다.

**구현 상태**: 함수 구현·모든 쓰기의 FK 강제는 아님

**검증 기준**: test-registration-integrity.ts와 관련 BR을 대조한다. 테스트 파일 존재만으로 모든 경로 통과를 뜻하지 않으며 evidence 실행 기록에 한정한다.

코드: [src/infrastructure/db/indexedDb.ts:208](https://github.com/very8erry/hr-erp-prototype/blob/b4aeb300270a62273d3d5f0c2fea87f2a09ba800/src/infrastructure/db/indexedDb.ts#L208) / integrityFindings

테스트: scripts/test-registration-integrity.ts

문제/우선순위: ISS-D01 P2

## NFR-01 권한·개인정보

**구분**: 비기능

**목적**: 권한·개인정보의 판단 근거와 데이터 연결을 추적하여 후속 급여 업무의 누락·오연결을 줄인다.

**담당·이해관계자**: 관리자/설계자

**입력·전제**: 가상 데이터·로컬 접근권한·백업 관리

**업무 절차**: 실습 데이터 사용 → 외부 전달 전 점검 → 정책 수립

**출력**: 보안 경계·운영 정책

**저장소**: 브라우저, 전체

**규칙 참조**: BR-16

**정상**: 지정된 입력과 선행조건을 만족하면 저장 결과 및 후속 상태를 확인한다.

**예외**: 관련 BR의 거부·보류·잠금 조건을 적용하고 오류를 임의로 무시하지 않는다.

**구현 상태**: 로컬 통제; 운영 서버 권한 미구현

**검증 기준**: test-selection.tsx와 관련 BR을 대조한다. 테스트 파일 존재만으로 모든 경로 통과를 뜻하지 않으며 evidence 실행 기록에 한정한다.

코드: [src/infrastructure/db/indexedDb.ts:1281](https://github.com/very8erry/hr-erp-prototype/blob/b4aeb300270a62273d3d5f0c2fea87f2a09ba800/src/infrastructure/db/indexedDb.ts#L1281) / exportDatabase

테스트: scripts/test-selection.tsx

문제/우선순위: ISS-B02 P1, ISS-D02 P2

## FUT-01 AI 업무 시뮬레이션

구분·목적: 미래 제안. 격리된 가상 업무 실행을 기록하고 오류·반복 작업을 평가한다.

담당: HR / PM / 개발. 입력은 승인된 시나리오·시작 상태·허용 명령·평가지표다.

제안 절차: 격리 데이터 준비 → 도구 계약 → 실행 기록 → 결과·실패·복구 평가.

출력·저장: 실행 결과와 행동로그를 제안한다. 현재 대응 저장소는 없다.

규칙·예외: BR-16의 보안 경계를 지키고, 미허용 작업 거부·실패 시 복구를 미래 수용조건으로 정의한다.

구현·코드·테스트: 미구현·미실행. 현행 구현 함수나 통과 테스트를 연결하지 않는다.

검증 기준: ISS-D03의 성공률·손상 0건·복구시간 측정은 향후 검증 제안이다.

문제·우선순위: ISS-D03 / P3. 별도 정책 승인과 구현이 필요하다.
