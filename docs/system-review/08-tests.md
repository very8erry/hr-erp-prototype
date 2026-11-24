# 테스트 명세 및 추적표

문서 1.0 · 분석 커밋 b4aeb300270a62273d3d5f0c2fea87f2a09ba800 · 관련 요구사항 R-01~17

기존 결과를 인용한다. 아래의 업무별 수용 기준은 설계된 검증 항목이며 기존 PASS 건수와 별도다.

| ID | 업무 | 입력·행위 | 예상 결과 |
|---|---|---|---|
| R-01 | 직원등록 | 사번·생년월일·입사일·연봉과 조직을 입력한다. | 같은 사번을 두 탭에서 등록해도 한 건만 남아야 한다. |
| R-02 | ATS 입사전환 | 최종 합격자와 수락한 오퍼를 선택해 입사정보를 제출한다. | 이미 전환된 지원자나 타사 조직이면 전체 취소한다. |
| R-03 | 인사발령 | 직원·시행일·변경값·사유를 정하고 예약 또는 즉시 적용 결과를 확인한다. | 예약 당시 원천이 달라지면 원본과 검토 사유를 남기고 적용을 보류한다. |
| R-04 | 근태 입력·수정 | 근무일 또는 월 집계를 수정하고 사유와 함께 저장한다. | 같은 원본을 본 두 탭 중 오래된 저장을 거부하고 앞선 값을 보존한다. |
| R-05 | 근태 마감 | 급여 대상자의 근태 누락을 대조한 후 대상 월을 마감한다. | 대상 근태 누락 또는 빈 월은 거부한다. |
| R-06 | 급여 대상 생성 | 귀속월과 지급일을 정하고 급여 대상자·기준금액을 확인한다. | 입사 전이거나 기간 전에 퇴직한 사람은 제외한다. 누락 원천의 조용한 제외는 I-03 참조. |
| R-07 | 급여 계산 | 항목 적용 여부를 확인하고 해당 월 급여를 산출한다. | 대상자가 없거나 확정 이후면 거부한다. 직전 총지급액 대비 20% 이상 변동은 경고한다. |
| R-08 | 급여 검증 | 경고와 오류를 구분해 확인하고 오류 입력을 수정한다. | 경고만으로 검증 실패가 되지는 않는다. 오류가 남으면 CALCULATED를 유지한다. |
| R-09 | 급여 확정 | 검증 결과를 검토해 확정한다. | 재검증 필요 상태에서는 전환을 거부한다. |
| R-10 | 급여 마감 | 근태 마감과 급여 확정을 확인하고 월을 잠근다. | 근태가 열려 있거나 급여가 미확정이면 거부한다. |
| R-11 | 급여 지급 완료 | 마감월의 지급 완료를 표시한다. | 마감 전 지급 완료는 거부한다. 은행 송금 확인은 범위 밖이다. |
| R-12 | 급여 입력 정정 | 확정 전 개인 입력을 정정하고 월 전체를 다시 검증한다. | 일괄 입력은 해당 Run 결과 전체를 삭제한다. 확정 이후 정정 전표는 확인되지 않았다. |
| R-13 | 퇴직정산 | 퇴직일 등록 후 기초 급여와 제도를 검토해 정산 초안을 계산한다. | 퇴직일 누락·기확정은 거부한다. 수기 변경 시 별도 사유가 필요하다. |
| R-14 | 연말정산 | 연도별 급여·기납부액을 확인하고 서류 검토 및 최종세액을 입력한다. | 직원·연도 중복, 확정 원장 수정 또는 최종세액 없는 확정을 거부한다. |
| R-15 | 원천세 신고 대사 | 귀속월과 지급월을 확인하고 인원·총액·세액 대사 차이를 기록한다. | 확정 이후 대사 수정·음수·소수 인원을 거부한다. 신고서 초안 경로는 company.withholdingDrafts다. |
| R-16 | 보험 취득·상실 자료 | 취득 또는 상실 양식에 대상과 보험별 정보를 입력해 파일을 생성한다. | 행 수·보험별 필수열·일자를 검토한다. 파일 생성과 기관 접수는 별도다. |
| R-17 | 백업·복원 | 교체할 백업의 버전을 확인하고 원천과 복원 결과를 대조한다. | v1에서 재구성할 수 없는 Person은 교체 전 거부한다. |

## 저장소·서비스 통합 검증

| 기존 케이스 | 절차 | 기대 | 기록 |
|---|---|---|---|
| normal initialization is idempotent | initialize new repository twice | All exported records including audit timestamps unchanged | PASS |
| employee registration | registerEmployee, export linked records | Exactly one Person, Employment, Assignment and Compensation added; companyId set | PASS |
| duplicate employee number rejected | register same employeeNumber | Full data unchanged | PASS |
| missing company repair and repeated initialization | remove companyId only, initialize twice | Only companyId and one repair audit change; histories and PKs unchanged | PASS |
| ambiguous organization stays unresolved | remove companyId; change assignment organization to missing ID; initialize twice | Original employment remains; single stable review audit; no invented company | PASS |
| personnel transfer valid and invalid | transfer to existing organization, reject pre-hire date | New assignment preserves old ID with previous-day end; invalid input changes nothing | PASS |
| same-day personnel action cannot create reversed interval | submit promotion on current assignment start date | Reject without creating effectiveTo before effectiveFrom | PASS |
| payroll targets include new employment | createRun and inspect entries | New employment matches entry and Person, no duplicate entries | PASS |
| attendance change and allowance sync | save monthly attendance; invalid batch; syncAttendance; calculate | Invalid batch atomic; overtime input 10; positive overtime calculated | PASS |
| validation confirmation close and source edit protection | validate, confirm, reject premature close, close attendance, close payroll; edit name | Closed entries/results unchanged; recalculation and attendance edit rejected | PASS |
| withholding generation and invalid draft | generate draft from closed results; validate reviewed draft; generate HTML; reject unreviewed | A01 totals match included results; company rendered; no source mutation | PASS |
| retirement calculation and locked edit | calculateRetirement; confirm; attempt recalculation and missing employment | Positive service days; confirmed result unchanged after errors | PASS |
| year-end settlement save and validation | save; verify derived settlement; reject invalid employee; confirm; reject edit | Settlement -25000; all error paths preserve stores | PASS |
| ATS rejects unaccepted offer | convertCandidate with DRAFT offer | All stores unchanged | PASS |
| ATS conversion and duplicate conversion | convert accepted candidate; repeat conversion | One Person and Employment; company and candidate links; duplicate causes no writes | PASS |
| ATS rejects organization from another company | convert accepted candidate with foreign company organization | Reject without Person or Employment writes | PASS |
| personnel rejects nonexistent organization | submit immediate organization transfer | Reject without assignment/event/audit changes | PASS |
| daily registration cannot overwrite existing Person | createDailyWorker with existing regular Person ID | Reject and preserve original Person and linked payroll | PASS |
| daily registration creates separate linked person | createDailyWorker | New daily worker and Person; no Employment mutation | PASS |
| paid payroll remains immutable | mark closed run paid; edit source name; attempt calculate, validate, delete run, edit entry | Paid state retained; entry and result snapshots unchanged | PASS |
| registration mid-write failure rolls back | inject synchronous Assignment.add error after Person and Employment requests | No partial Person/Employment/Assignment/Compensation or audit saved | PASS |
| company repair preserves nonempty closed payroll and attendance | remove companyId; reopen after closed payroll exists | Only companyId and repair audit change; entries/results/attendance and all IDs preserved | PASS |
| missing Person and conflicting organization never inferred | register isolated employee; remove companyId; point Person to missing ID; then conflicting organization | No company invention; stable review record; other histories preserved | PASS |
| multiple companies do not cause arbitrary repair | add second company; remove companyId; reopen | Missing company preserved; stable review marker available | PASS |

## 실제 Chrome

| 케이스 | 결과 |
|---|---|
| UI employee registration | PASS |
| attendance payroll validation confirmation closure | PASS |
| two tabs same employee number race | PASS |
| refresh persistence and closed lock | PASS |
| backup restore preserves payroll attendance and IDs | PASS |
| stale attendance edit from second tab rejected | PASS |
| simultaneous native attendance writes serialize | PASS |
| native upgrade blocked and recovery | PASS |

별도 canonical 업그레이드 1건 PASS. 원본은 docs/verification/pr7-{integration,native,upgrade}-results.json. 신규 예약·근태 회귀 11건은 pr7-final-build.log 참조.
## 업무별 증거 색인

| 요구 | 규칙 | 필드 | 직접 또는 인접한 실행 증거 |
|---|---|---|---|
| R-01 | BR-01 | Person.id, Employment.personId | employee registration, duplicate employee number rejected, registration mid-write failure rolls back |
| R-02 | BR-02 | Company.recruiting, Employment.companyId | ATS rejects unaccepted offer, ATS conversion and duplicate conversion, ATS rejects organization from another company |
| R-03 | BR-03 | PersonnelEvent.reviewReason | personnel transfer valid and invalid, same-day personnel action cannot create reversed interval, personnel rejects nonexistent organization |
| R-04 | BR-04 | AttendanceMonthlySummary.revision | attendance change and allowance sync |
| R-05 | BR-05 | Company.attendanceClosed | validation confirmation close and source edit protection |
| R-06 | BR-06 | PayrollEntry.employmentId | payroll targets include new employment |
| R-07 | BR-07 | PayrollEntry.attendanceRevision | attendance change and allowance sync, validation confirmation close and source edit protection |
| R-08 | BR-08 | PayrollRun.validatedAt | validation confirmation close and source edit protection |
| R-09 | BR-09 | PayrollRun.confirmedAt | validation confirmation close and source edit protection |
| R-10 | BR-10 | PayrollRun.closedAt | validation confirmation close and source edit protection |
| R-11 | BR-11 | PayrollRun.paidAt | paid payroll remains immutable |
| R-12 | BR-12 | PayrollEntry.runId | paid payroll remains immutable |
| R-13 | BR-13 | RetirementSettlement.terminationDate | retirement calculation and locked edit |
| R-14 | BR-14 | YearEndTaxCase.taxYear | year-end settlement save and validation |
| R-15 | BR-15 | PayrollRun.filingFormOverrides | withholding generation and invalid draft |
| R-16 | BR-16 | EdiRow / ediColumns.json | ediFiling.ts 정적 검토. 지정된 EDI 제출파일의 기관 수리는 미검증 |
| R-17 | BR-17 | DatabaseExport.schemaVersion | pr7-native-results.json의 backup/restore 및 pr7-upgrade-results.json |
