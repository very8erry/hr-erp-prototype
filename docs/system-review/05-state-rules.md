# 상태 전이 및 업무 규칙

문서 1.0 · 분석 커밋 b4aeb300270a62273d3d5f0c2fea87f2a09ba800 · 관련 요구사항 R-01~17

| 규칙 | 업무 | 허용 조건·동작 | 거부·통제 |
|---|---|---|---|
| BR-01 | R-01 | 이름 검토 → 날짜·금액 검사 → Person 생성 → 회사·조직과 중복 사번 재조회 → 일괄 추가 | 같은 사번을 두 탭에서 등록해도 한 건만 남아야 한다. |
| BR-02 | R-02 | candidateId·offerId 대조 → 소속·사번 검사 → Person·Employment·배치·보상 생성 → 지원자에 두 ID 기록 | 이미 전환된 지원자나 타사 조직이면 전체 취소한다. |
| BR-03 | R-03 | 서비스에서 사유·값 검사 → 동일일 발령 확인 → 예약 저장 또는 적용 → 도래한 예약은 applyDueEvents에서 원천 재검사 | 예약 당시 원천이 달라지면 원본과 검토 사유를 남기고 적용을 보류한다. |
| BR-04 | R-04 | 고용·기간 확인 → 잠금 확인 → 쓰기 트랜잭션에서 revision·일별 원본·마감 재확인 → 일별·월별 저장 | 같은 원본을 본 두 탭 중 오래된 저장을 거부하고 앞선 값을 보존한다. |
| BR-05 | R-05 | 월 형식 검사 → 월 집계와 Run 대상 비교 → 미확정 행 confirmRecords → 회사 월 마감 시각 저장 | 대상 근태 누락 또는 빈 월은 거부한다. |
| BR-06 | R-06 | 기간 내 고용 조회 → Person·배치·보상 연결 → 월말 유효 이력 우선 선택 → Run과 직원별 Entry 구성 | 입사 전이거나 기간 전에 퇴직한 사람은 제외한다. 누락 원천의 조용한 제외는 I-03 참조. |
| BR-07 | R-07 | Run·Entry·항목·휴직·근태 조회 → calculatePayrollEntry → 직전 마감월 대비 변동 경고 → 결과·항목 스냅샷 저장 | 대상자가 없거나 확정 이후면 거부한다. 직전 총지급액 대비 20% 이상 변동은 경고한다. |
| BR-08 | R-08 | 전체 Entry 재계산 → 오류·경고 합산 → 오류 0이면 VALIDATED → 감사로그 작성 | 경고만으로 검증 실패가 되지는 않는다. 오류가 남으면 CALCULATED를 유지한다. |
| BR-09 | R-09 | Run 읽기 → 근태 변경 여부와 VALIDATED 검사 → CONFIRMED와 confirmedAt 기록 → 로그 추가 | 재검증 필요 상태에서는 전환을 거부한다. |
| BR-10 | R-10 | Run 읽기 → isAttendanceClosed 조회 → CONFIRMED 검사 → CLOSED·closedAt 기록 | 근태가 열려 있거나 급여가 미확정이면 거부한다. |
| BR-11 | R-11 | Run 상태 검사 → CLOSED에서 PAID로 변경 → paidAt 및 감사로그 기록 | 마감 전 지급 완료는 거부한다. 은행 송금 확인은 범위 밖이다. |
| BR-12 | R-12 | runId·employmentId 조회 → 단건 Entry 저장 → 개인 Result 삭제 → Run을 DRAFT로 복귀 → 재계산 | 일괄 입력은 해당 Run 결과 전체를 삭제한다. 확정 이후 정정 전표는 확인되지 않았다. |
| BR-13 | R-13 | 고용·퇴직일 조회 → 확정 건 확인 → 고용별 Run·Result·Entry 및 기존 설정을 retirementByPlan에 전달 → 초안 저장 | 퇴직일 누락·기확정은 거부한다. 수기 변경 시 별도 사유가 필요하다. |
| BR-14 | R-14 | listYearEndTaxCases가 비초안 Run을 직원·연도별 집계 → 수기 보존 → 입력 검증·원장 저장 → confirmRecords | 직원·연도 중복, 확정 원장 수정 또는 최종세액 없는 확정을 거부한다. |
| BR-15 | R-15 | 급여 결과 집계 → 수정값과 사유 확인 → Run.filingFormOverrides와 로그 동시 저장 | 확정 이후 대사 수정·음수·소수 인원을 거부한다. 신고서 초안 경로는 company.withholdingDrafts다. |
| BR-16 | R-16 | EdiInsuranceWorksheet → ediFields → validateEdi → ExcelJS 통합문서 생성 → 다운로드 | 행 수·보험별 필수열·일자를 검토한다. 파일 생성과 기관 접수는 별도다. |
| BR-17 | R-17 | exportDatabase → schemaVersion과 bundle → importDatabase 버전 분기 → 검증·교체 | v1에서 재구성할 수 없는 Person은 교체 전 거부한다. |
