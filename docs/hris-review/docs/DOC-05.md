# DOC-05　시스템 아키텍처 정의서

v1.0 · 2026-11-19 · b4aeb300270a62273d3d5f0c2fea87f2a09ba800

독자　PM·개발·인사 담당

목적과 범위　실행 시작과 데이터 흐름, 실제 화면의 기능 경계와 모듈 결합을 기술한다.

index.html → src/main.tsx의 createRoot → App. App.tsx:35–37에서 한 IndexedDbHrRepository 인스턴스를 두 서비스가 공유한다. initialize는 중복 실행 Promise를 재사용하고 실패하면 재시도 가능하도록 초기화한다. 신규 DB는 seed, 기존 DB는 마이그레이션을 수행한다. initializeOnce의 예약 발령 처리 뒤 App이 ensureDemoHistory와 refresh를 호출한다. 조회 과정에도 기한이 된 발령이 적용될 수 있다.
 
React 폼은 입력과 메시지를 관리하고 Service는 업무 요청의 진입점이다. HrRepository와 PayrollRepository는 타입 계약, IndexedDbHrRepository는 런타임 구현이다. 규칙 함수 calculatePayrollEntry는 값을 계산하고 DB 쓰기는 호출자가 담당한다. requestToPromise는 개별 요청 결과를, transactionDone은 전체 커밋·abort를 전달한다. 예외가 발생하면 UI의 각 핸들러에서 오류 표시 또는 재조회가 이어진다.
 

| 영역 | 화면·기능 | 입력 → 저장·결과 | 구성요소 | 영향·한계 |
|---|---|---|---|---|
| Core HR | 직원 목록·상세·등록, 인사발령 | Person·Employment·Assignment·CompensationSnapshot → EmployeeView | HrService / IndexedDbHrRepository | 고용 ID가 근태·급여의 연결점이다. 직원정보 조회용 결합 객체를 저장 원장과 구별한다. |
| ATS | 지원자·선발·평가·오퍼·채용완료 | company.recruiting → 신규 원장·후보 연결 | RecruitingPage / OffersPanel / convertCandidate | 채용 평가와 재직자 성과평가의 목적과 자료가 다르다. |
| WFM·Leave | 근태·일자별 근무·연차·휴직 | 일별 기록 → 월 집계 / annualLeaveLedgers / leaveCases | AttendancePage / AnnualLeavePanel / saveLeaveCase | 근태 수정은 급여월 무효화로 이어진다. 휴직 기간과 회사 지급률은 급여 계산에 사용된다. |
| Payroll | 월 생성·입력·계산·검증·마감·지급 표시 | 월별 Entry → Result, 과세·비과세·보험·세금 | PayrollPage / payrollRules / PayrollService | 인별 스냅샷과 운영 규칙을 구분한다. 정정 전표는 정책 결정 대상이다. |
| 일용직 | 근무자 등록·근로일·수당·파일 | persons + dailyWorkers → dailyWorkRecords | DailyWorkerPage / calculateDailyWorkRecord | 정규직 고용 ID 대신 dailyWorkerId로 근무 기록을 찾는다. 근무기간 밖·중복일·시간을 검증한다. |
| 정산·신고 | 퇴직·연말·원천세·보험 | 급여 결과·보수 기준액 → 정산 원장·신고 초안 | SettlementPanels / WithholdingEditor / EdiInsuranceWorksheet | 파일 생성과 외부 기관 접수는 처리 경계가 다르다. |
| 일정·규정·공지 | 업무일정·변경안 검토·규정 개정 및 배포 기록 | calendarEvents·policyDocuments·회사 설정 → 변경·전달 이력 | WorkSchedulePage / planningRepository / WorkRulesPanel | 제안과 승인 처리의 저장 지점을 구분한다. 업무별 검토 담당은 시스템 로그인과 별개다. |
| 수시업무·대시보드·복지 | 현황·기한·진행상태 및 복지 안건 | 직원·근태·급여 오류 → issues / welfareCases | OperationsDashboard / EmployeeIssueBoard / WelfarePanel | 운영 화면의 인원 집계나 업무 카드가 급여의 지급 여부를 결정하지 않는다. |
| 회사정보·로그 | 회사 설정·신고 기본값·작업 기록 | company.reportingInfo / auditLogs | CompanyInfoPage / DataToolbar / AuditList | 여러 모듈이 같은 회사 레코드를 수정한다. 전체 백업에는 급여 원장도 포함된다. |
| 인사평가·보상·AI | 인사평가·AI·시뮬레이션 메뉴 비활성 | 보상 이력은 현재 사용. 독립 보상 시뮬레이션 원장은 확인되지 않음 | App.tsx:96 / performance·compensation README | 향후 모듈의 화면·계산·결과표를 현재 성과로 산입하지 않는다. |


GitHub Actions의 deploy.yml은 main push 또는 수동 실행에서 dist를 Pages에 전달한다. 배포 파일에는 앱 코드와 예시 자료가 있고 사용자 변경값은 해당 origin의 브라우저 IndexedDB에 있다. 서버 API가 사용자 인사원장을 보관하는 실행 경로는 확인되지 않았다. 앱 버전 0.7.9, DB·스키마 버전 7, seed 버전 6, 급여 규칙 버전 KR-2026-PAYROLL-0.7.7은 목적이 다른 값이다.
