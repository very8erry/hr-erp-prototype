# 요구사항 정의서

문서 1.0 · 분석 커밋 b4aeb300270a62273d3d5f0c2fea87f2a09ba800 · 관련 요구사항 R-01~17 / N-01~04

현재 목적은 Payroll 업무 판단의 시연이다. 단기 목표는 재현 가능한 로컬 검토 환경, 장기 목표는 가상 담당자의 업무 시뮬레이션이다. 운영 적합성 판정에는 권한·복구·대사에 대한 별도 증거가 필요하다.

## R-01 직원등록

업무 요구 · Core HR 담당자. 사번·생년월일·입사일·연봉과 조직을 입력한다.

시스템 요구 · 이름 검토 → 날짜·금액 검사 → Person 생성 → 회사·조직과 중복 사번 재조회 → 일괄 추가. 결과 위치는 persons, employments, assignments, compensations, auditLogs.

검수 기준 · 같은 사번을 두 탭에서 등록해도 한 건만 남아야 한다.

구현 근거 · src/infrastructure/db/indexedDb.ts:241. 연관 위험 및 정책은 03번 문서 참조.

## R-02 ATS 입사전환

업무 요구 · ATS 담당자. 최종 합격자와 수락한 오퍼를 선택해 입사정보를 제출한다.

시스템 요구 · candidateId·offerId 대조 → 소속·사번 검사 → Person·Employment·배치·보상 생성 → 지원자에 두 ID 기록. 결과 위치는 company.recruiting, persons, employments, assignments, compensations, auditLogs.

검수 기준 · 이미 전환된 지원자나 타사 조직이면 전체 취소한다.

구현 근거 · src/infrastructure/db/indexedDb.ts:899. 연관 위험 및 정책은 03번 문서 참조.

## R-03 인사발령

업무 요구 · Core HR 담당자. 직원·시행일·변경값·사유를 정하고 예약 또는 즉시 적용 결과를 확인한다.

시스템 요구 · 서비스에서 사유·값 검사 → 동일일 발령 확인 → 예약 저장 또는 적용 → 도래한 예약은 applyDueEvents에서 원천 재검사. 결과 위치는 personnelEvents, assignments, employments, auditLogs.

검수 기준 · 예약 당시 원천이 달라지면 원본과 검토 사유를 남기고 적용을 보류한다.

구현 근거 · src/infrastructure/db/indexedDb.ts:582. 연관 위험 및 정책은 03번 문서 참조.

## R-04 근태 입력·수정

업무 요구 · WFM 담당자. 근무일 또는 월 집계를 수정하고 사유와 함께 저장한다.

시스템 요구 · 고용·기간 확인 → 잠금 확인 → 쓰기 트랜잭션에서 revision·일별 원본·마감 재확인 → 일별·월별 저장. 결과 위치는 attendanceDailyRecords, attendanceMonthlySummaries, payrollRuns, auditLogs.

검수 기준 · 같은 원본을 본 두 탭 중 오래된 저장을 거부하고 앞선 값을 보존한다.

구현 근거 · src/infrastructure/db/indexedDb.ts:1049. 연관 위험 및 정책은 03번 문서 참조.

## R-05 근태 마감

업무 요구 · WFM 담당자. 급여 대상자의 근태 누락을 대조한 후 대상 월을 마감한다.

시스템 요구 · 월 형식 검사 → 월 집계와 Run 대상 비교 → 미확정 행 confirmRecords → 회사 월 마감 시각 저장. 결과 위치는 attendanceMonthlySummaries, company.attendanceClosed.

검수 기준 · 대상 근태 누락 또는 빈 월은 거부한다.

구현 근거 · src/infrastructure/db/indexedDb.ts:933. 연관 위험 및 정책은 03번 문서 참조.

## R-06 급여 대상 생성

업무 요구 · Payroll 담당자. 귀속월과 지급일을 정하고 급여 대상자·기준금액을 확인한다.

시스템 요구 · 기간 내 고용 조회 → Person·배치·보상 연결 → 월말 유효 이력 우선 선택 → Run과 직원별 Entry 구성. 결과 위치는 payrollRuns, payrollEntries.

검수 기준 · 입사 전이거나 기간 전에 퇴직한 사람은 제외한다. 누락 원천의 조용한 제외는 I-03 참조.

구현 근거 · src/infrastructure/db/indexedDb.ts:631. 연관 위험 및 정책은 03번 문서 참조.

## R-07 급여 계산

업무 요구 · Payroll 담당자. 항목 적용 여부를 확인하고 해당 월 급여를 산출한다.

시스템 요구 · Run·Entry·항목·휴직·근태 조회 → calculatePayrollEntry → 직전 마감월 대비 변동 경고 → 결과·항목 스냅샷 저장. 결과 위치는 payrollEntries, payrollResults, payrollRuns, auditLogs.

검수 기준 · 대상자가 없거나 확정 이후면 거부한다. 직전 총지급액 대비 20% 이상 변동은 경고한다.

구현 근거 · src/infrastructure/db/indexedDb.ts:780. 연관 위험 및 정책은 03번 문서 참조.

## R-08 급여 검증

업무 요구 · Payroll 담당자. 경고와 오류를 구분해 확인하고 오류 입력을 수정한다.

시스템 요구 · 전체 Entry 재계산 → 오류·경고 합산 → 오류 0이면 VALIDATED → 감사로그 작성. 결과 위치는 payrollResults, payrollRuns, auditLogs.

검수 기준 · 경고만으로 검증 실패가 되지는 않는다. 오류가 남으면 CALCULATED를 유지한다.

구현 근거 · src/infrastructure/db/indexedDb.ts:809. 연관 위험 및 정책은 03번 문서 참조.

## R-09 급여 확정

업무 요구 · Payroll 담당자. 검증 결과를 검토해 확정한다.

시스템 요구 · Run 읽기 → 근태 변경 여부와 VALIDATED 검사 → CONFIRMED와 confirmedAt 기록 → 로그 추가. 결과 위치는 payrollRuns, auditLogs.

검수 기준 · 재검증 필요 상태에서는 전환을 거부한다.

구현 근거 · src/infrastructure/db/indexedDb.ts:822. 연관 위험 및 정책은 03번 문서 참조.

## R-10 급여 마감

업무 요구 · Payroll 담당자. 근태 마감과 급여 확정을 확인하고 월을 잠근다.

시스템 요구 · Run 읽기 → isAttendanceClosed 조회 → CONFIRMED 검사 → CLOSED·closedAt 기록. 결과 위치는 payrollRuns, auditLogs.

검수 기준 · 근태가 열려 있거나 급여가 미확정이면 거부한다.

구현 근거 · src/infrastructure/db/indexedDb.ts:822. 연관 위험 및 정책은 03번 문서 참조.

## R-11 급여 지급 완료

업무 요구 · Payroll 담당자. 마감월의 지급 완료를 표시한다.

시스템 요구 · Run 상태 검사 → CLOSED에서 PAID로 변경 → paidAt 및 감사로그 기록. 결과 위치는 payrollRuns, auditLogs.

검수 기준 · 마감 전 지급 완료는 거부한다. 은행 송금 확인은 범위 밖이다.

구현 근거 · src/infrastructure/db/indexedDb.ts:822. 연관 위험 및 정책은 03번 문서 참조.

## R-12 급여 입력 정정

업무 요구 · Payroll 담당자. 확정 전 개인 입력을 정정하고 월 전체를 다시 검증한다.

시스템 요구 · runId·employmentId 조회 → 단건 Entry 저장 → 개인 Result 삭제 → Run을 DRAFT로 복귀 → 재계산. 결과 위치는 payrollEntries, payrollResults, payrollRuns, auditLogs.

검수 기준 · 일괄 입력은 해당 Run 결과 전체를 삭제한다. 확정 이후 정정 전표는 확인되지 않았다.

구현 근거 · src/infrastructure/db/indexedDb.ts:754. 연관 위험 및 정책은 03번 문서 참조.

## R-13 퇴직정산

업무 요구 · 정산 담당자. 퇴직일 등록 후 기초 급여와 제도를 검토해 정산 초안을 계산한다.

시스템 요구 · 고용·퇴직일 조회 → 확정 건 확인 → 고용별 Run·Result·Entry 및 기존 설정을 retirementByPlan에 전달 → 초안 저장. 결과 위치는 retirementSettlements.

검수 기준 · 퇴직일 누락·기확정은 거부한다. 수기 변경 시 별도 사유가 필요하다.

구현 근거 · src/infrastructure/db/indexedDb.ts:1233. 연관 위험 및 정책은 03번 문서 참조.

## R-14 연말정산

업무 요구 · 정산 담당자. 연도별 급여·기납부액을 확인하고 서류 검토 및 최종세액을 입력한다.

시스템 요구 · listYearEndTaxCases가 비초안 Run을 직원·연도별 집계 → 수기 보존 → 입력 검증·원장 저장 → confirmRecords. 결과 위치는 yearEndTaxCases, auditLogs.

검수 기준 · 직원·연도 중복, 확정 원장 수정 또는 최종세액 없는 확정을 거부한다.

구현 근거 · src/infrastructure/db/indexedDb.ts:1227. 연관 위험 및 정책은 03번 문서 참조.

## R-15 원천세 신고 대사

업무 요구 · 신고 담당자. 귀속월과 지급월을 확인하고 인원·총액·세액 대사 차이를 기록한다.

시스템 요구 · 급여 결과 집계 → 수정값과 사유 확인 → Run.filingFormOverrides와 로그 동시 저장. 결과 위치는 payrollRuns, auditLogs.

검수 기준 · 확정 이후 대사 수정·음수·소수 인원을 거부한다. 신고서 초안 경로는 company.withholdingDrafts다.

구현 근거 · src/infrastructure/db/indexedDb.ts:733. 연관 위험 및 정책은 03번 문서 참조.

## R-16 보험 취득·상실 자료

업무 요구 · 신고 담당자. 취득 또는 상실 양식에 대상과 보험별 정보를 입력해 파일을 생성한다.

시스템 요구 · EdiInsuranceWorksheet → ediFields → validateEdi → ExcelJS 통합문서 생성 → 다운로드. 결과 위치는 브라우저 다운로드 파일.

검수 기준 · 행 수·보험별 필수열·일자를 검토한다. 파일 생성과 기관 접수는 별도다.

구현 근거 · src/modules/payroll/ediFiling.ts:12. 연관 위험 및 정책은 03번 문서 참조.

## R-17 백업·복원

업무 요구 · 데이터 담당자. 교체할 백업의 버전을 확인하고 원천과 복원 결과를 대조한다.

시스템 요구 · exportDatabase → schemaVersion과 bundle → importDatabase 버전 분기 → 검증·교체. 결과 위치는 DatabaseExport.data 및 저장소 묶음.

검수 기준 · v1에서 재구성할 수 없는 Person은 교체 전 거부한다.

구현 근거 · src/infrastructure/db/indexedDb.ts:1285. 연관 위험 및 정책은 03번 문서 참조.

## 비기능 요구

N-01 원자성 및 이력 보존은 I-01·02, N-02 참조 무결성은 I-03·04, N-03 개인정보와 접근 통제는 I-07, N-04 복원 가능성은 R-17로 추적한다.