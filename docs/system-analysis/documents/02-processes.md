# 업무 프로세스 및 예외처리 정의서

문서 버전 1.0 | 작성 2026-11-18 KST | 분석 기준 b4aeb300270a62273d3d5f0c2fea87f2a09ba800

작성 근거: 고정 커밋의 src, config, 테스트 및 docs/verification 실행 기록. 문서 작업은 애플리케이션 코드를 변경하지 않는다.

관련 요구사항: 전체 요구사항

## HR-01 일반 직원등록

HR 관점: 직원 관리 → 등록 폼 → 필수값/이름 검토 → 저장 → 연결 확인

프로그램 관점: EmployeeRegistrationModal → HrService.registerEmployee → repository.registerEmployee → company/org/employeeNumber reads → add 4 records → tx complete

예외·책임: 필수값 실패는 쓰기 전 오류. 저장 요청 실패는 tx.abort. Person과 Employment ID는 각각 생성하고 employment.personId로 연결.

기준 규칙: BR-01 / BR-02 / BR-03

## ATS-02 ATS 입사전환

HR 관점: 합격/수락 확인 → 입사전환 → 고용 연결 확인

프로그램 관점: PayrollService.convertCandidate → repository.convertCandidate → PASS/ACCEPTED/조직 회사 확인 → Person/Employment/Assignment/Compensation.add → company.recruiting 링크 갱신 → tx complete

예외·책임: 수락 없는 오퍼/기존 전환/중복 사번/다른 회사 조직을 거부한다. 기존 Person 재사용은 하지 않는다.

기준 규칙: BR-01 / BR-13

## HR-03 인사발령 등록·예약

HR 관점: 발령 등록 → 동일일/기간 검사 → 즉시 적용 또는 예약 → 검토 필요 확인

프로그램 관점: HrService.createPersonnelAction → 사유/값 검사 → repository 예약 등록 → applyDueEvents → applyEvent(tx) → 원천 재검증 → 적용 또는 reviewReason

예외·책임: 업무상 같은 날 두 건도 자동 통합하지 않는다. 기존 이력 종료일과 신규 시작일을 한 tx로 저장한다. 충돌 보류는 기존 원천을 수정하지 않는다.

기준 규칙: BR-04

## WFM-01 월별·일별 근태 수정

HR 관점: 근태 조회 → 원천 수정 → 잠금/충돌 검사 → 급여 재검토

프로그램 관점: PayrollService.saveAttendanceBatch → 근무기간/시간 검사 → 월·일 레코드 구성 → tx 내 최신 revision/updatedAt/마감 재검증 → 원천 저장 + Run DRAFT + Result 삭제

예외·책임: 확정/마감 거부와 stale 탭 거부는 다르다. 후자는 새로 조회 후 편집해야 하며, 숫자 오류를 0으로 치환하지 않는다.

기준 규칙: BR-05

## WFM-02 근태 마감

HR 관점: 대상·누락 검토 → 원장 확정 → 월 마감 → 급여 마감 가능

프로그램 관점: closeAttendance → 월 자료/급여 대상 누락 검사 → confirmRecords(attendance) → company.attendanceClosed 기록

예외·책임: 전체 업무는 복수 단계다. 하나의 DB 트랜잭션과 같은 의미로 표현하지 않는다.

기준 규칙: BR-08 / BR-10

## PAY-01 급여월·대상 생성

HR 관점: 급여월 생성 → 재직기간 대상 추출 → 조직·보상·세금 기초 스냅샷

프로그램 관점: createPayrollRun → 월 중 재직 대상 조회 → 조직·보상·공제 정보로 Entry 생성 → Run/Entry 저장

예외·책임: 사람 ID가 아닌 employmentId로 급여 대상이 연결된다. 동일 person의 복수 employment를 합치는 정책은 별도다.

기준 규칙: BR-06

## PAY-02 근태 수당 연동

HR 관점: 근태 원천 검토 → 연동 호출 → 시간·수당을 급여 입력에 반영

프로그램 관점: PayrollService.syncAttendance → 월 합계·일별 휴일초과·항목 정보 조회 → entry.calculationInputs/itemAmounts 산출 → saveEntry

예외·책임: 시간 원천을 급여 입력으로 변환한다. 입력 수당과 최종 계산 결과는 구분하며 재계산이 필요하다.

기준 규칙: BR-05 / BR-06

## PAY-03 급여 계산·설정

HR 관점: 항목 설정 검토 → 입력 저장 → 계산 → 결과 대조

프로그램 관점: calculatePayrollRun → Run 잠금 검사 → entries/설정/근태/휴직 조회 → calculatePayrollEntry → results/entries/run 스냅샷 tx 저장

예외·책임: 설정 화면 산식/수기 모드와 저장된 itemSnapshot을 확인한다. 근태 원천 전체가 자동 동기화되는 것으로 가정하지 않는다.

기준 규칙: BR-06

## PAY-04 급여 검증·확정

HR 관점: 검증 → 오류 수정 → 재검증 → 확정

프로그램 관점: validatePayrollRun → calculatePayrollRun 재실행 → 오류/경고 집계 → VALIDATED 또는 CALCULATED → setPayrollRunStatus(CONFIRMED)

예외·책임: 검증은 단순 조회가 아니라 계산 및 저장을 수행한다. 별도 검토자의 서버 서명 기능은 없다.

기준 규칙: BR-07 / BR-08

## PAY-05 급여 마감·지급

HR 관점: 근태 마감 → 급여 마감 → 지급 완료 표시

프로그램 관점: setPayrollRunStatus → 선행상태/stale/근태마감 조건 → payrollRuns.put → auditLogs.put

예외·책임: 은행 송금은 없다. 상태와 감사로그는 현재 별도 put이므로 ISS-A02의 실패 경로가 있다.

기준 규칙: BR-08 / BR-09

## PAY-06 원천 정정·재계산

HR 관점: 수정 → stale/결과 삭제 → 근태 연동/계산 → 검증

프로그램 관점: 원천 수정 → saveAttendanceBatch 또는 saveLeaveCase → 미확정 영향 검토/무효화 → syncAttendance → calculate → validate

예외·책임: 마감된 결과를 직접 재작성하는 정상 경로는 없다. 차액 정정 프로세스는 ISS-C02.

기준 규칙: BR-05 / BR-09

## PAY-07 퇴직정산

HR 관점: 퇴사일 확인 → 임금 기준 산정 → 검토/수기 보완 → 확정

프로그램 관점: calculateRetirementSettlement → 퇴사일/확정 여부 → 임금 및 Run/Entry/Result 조회 → calculateRetirement → 원장 저장

예외·책임: 확정 재계산 거부. DB/DC 및 수기 입력은 검토 근거와 함께 관리해야 한다.

기준 규칙: BR-10 / BR-12

## PAY-08 연말정산

HR 관점: 자료 대조 → 최종세액 입력 → 차액 계산 → 확정

프로그램 관점: listYearEndTaxCases → 비DRAFT Run 결과 집계 + 수기 원장 우선 → saveYearEndBatch → 정산차액 → confirmRecords

예외·책임: 자료 조회가 전 공제 세액 자동계산과 같지 않다. null 최종세액은 확정할 수 없다.

기준 규칙: BR-10 / BR-12

## FILE-01 원천세 신고 초안

HR 관점: 초안 생성 → 코드별 합계 → 검토 표시 → HTML/PDF 출력

프로그램 관점: initialWithholding → calculateWithholding → validateWithholding → withholdingHtml / saveWithholdingDraft

예외·책임: 신고 제외액·정산분·지급월 검토 표시가 필요하다. HTML 출력과 PDF 프린트 결과의 기관 수리는 별도 확인.

기준 규칙: BR-14

## FILE-02 보험 신고 목록

HR 관점: 대상 자동 불러오기/수기 → 작성 → 파일 생성 → 별도 신고처 확인

프로그램 관점: filingWorksheet.fieldsFor/blankFilingRow/importFilingRows → FilingDraft 작성 → saveOperation → 파일 출력

예외·책임: 공단별 모든 서식의 접수 검증을 완료했다고 단정하지 않는다. 직원 ID 유효성 및 숫자/날짜 규칙과 기관 요구는 별개다.

기준 규칙: BR-14
