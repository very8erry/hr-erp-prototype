# DOC-07　테스트 명세·추적표

v1.0 · 2026-11-19 · b4aeb300270a62273d3d5f0c2fea87f2a09ba800

독자　검증 담당·PM

목적과 범위　기존 PR 기록과 고정 main에서 다시 실행한 결과를 구분한다.


| 시험 | 요구 | 사례 | 기대 | 실제 결과·한계 |
|---|---|---|---|---|
| T01 | R01 | duplicate employee number rejected | 중복 사번 제출 후 4개 핵심 원장과 로그의 행 수가 모두 그대로다. | PASS · Full data unchanged |
| T02 | R02 | ATS conversion and duplicate conversion | 승인된 합격·수락 오퍼를 두 번 전환하면 한 번만 성공하고 후보의 고용 ID가 원장과 같다. | PASS · One Person and Employment; company and candidate links; duplicate causes no writes |
| T03 | R03 | personnel transfer valid and invalid | 조직이동 시 기존 이력 종료일은 효력일 전날, 새 이력 시작일은 효력일이어야 한다. | PASS · New assignment preserves old ID with previous-day end; invalid input changes nothing |
| T04 | R04 | simultaneous native attendance writes serialize | 두 탭이 같은 revision에서 바꿀 때 하나만 반영되고 나머지는 재조회를 요청한다. | PASS · 오래된 근태 회귀도 통과 |
| T05 | R05 | probe-assertions.log / R05 | 한 급여 대상의 월 근태가 빠지면 회사 마감 시각이 생기지 않는다. | PASS · 급여 대상 근태 누락 시 월 표식 미생성 |
| T06 | R06 | payroll targets include new employment | 해당 월 중 입사한 등록 직원이 한 행으로 생성되고 고용 ID가 직원 원장과 같다. | PASS · New employment matches entry and Person, no duplicate entries |
| T07 | R07 | probe-assertions.log / R07 | 총지급액과 공제액의 차가 실지급액과 일치하고 직원 연봉 원장은 보존된다. | PASS · 가상 직원 총지급−공제와 실지급 일치 |
| T08 | R08 | payroll-probe.json (기존 정상 경로와 다른 순서) | 수당이 연결된 근태의 시간이 변경된 후 이전 시간으로 검증 완료할 수 없다. | 불충족 · 2시간이 최신 revision 2로 VALIDATED |
| T09 | R09 | probe-assertions.log / R09 및 정상 확정 통합시험 | DRAFT의 확정은 실패하고 VALIDATED 건에만 confirmedAt이 기록된다. | PASS · DRAFT 확정 거부 및 정상 VALIDATED 확정 |
| T10 | R10 | validation confirmation close and source edit protection | 급여 확정 후에도 근태 미마감이면 CLOSED 전이가 거부된다. | PASS · Closed entries/results unchanged; recalculation and attendance edit rejected |
| T11 | R11 | paid payroll remains immutable | 마감 전 지급 처리는 거부되고 마감 후 PAID와 paidAt이 재조회된다. | PASS · Paid state retained; entry and result snapshots unchanged |
| T12 | R12 | 원본 잠금은 검증, 차액 전표 미구현 | 지급 후 같은 사유의 차액 정정을 두 번 요청해도 원본은 보존되고 승인 차액은 한 번만 반영된다. | 원본 잠금 통과. 정정 장부 인수는 미구현 |
| T13 | R13 | retirement calculation and locked edit | 확정된 퇴사자의 재계산과 수기 변경이 거부되며 이전 결과가 보존된다. | PASS · Positive service days; confirmed result unchanged after errors |
| T14 | R14 | year-end settlement save and validation | 최종 75,000원, 기납부 100,000원이면 정산액은 –25,000원이고 확정 뒤 수정할 수 없다. | PASS · Settlement -25000; all error paths preserve stores |
| T15 | R15 | withholding generation and invalid draft | A01 대상의 급여 합계와 신고서 초안의 금액이 일치하고 미검토 출력 검사는 실패한다. | PASS · A01 totals match included results; company rendered; no source mutation |
| T16 | R16 | scripts/test-v078.tsx:23–26 / 양식·필수값 | 취득 양식 39열·상실 양식 22열을 생성하고 필수값 누락 행은 거부한다. | PASS · 취득·상실 샘플 XLSX 열 수와 빈 양식 거부 확인 |
| T17 | R17 | v1 unknown-person restore | 미지원 Person이 포함된 v1 입력 거부 후 모든 원본이 일치한다. | v1 미지원 사용자 거부 및 복원 통합 테스트 통과 |
| T18 | R18 | 암호화·인증 적용 인수 시험 미수행 | 허가·키 없는 사용자가 실제 자료를 반출·복원할 수 없어야 한다. | 보호 요구 미충족 · 전체 JSON 확인 |
| T19 | R19 | fault-probe.json / 강제 중단 | 감사 쓰기 실패를 주입하면 상태와 로그가 함께 취소된다. | FAIL · CONFIRMED와 해당 로그 부재가 함께 관찰됨 |
| T20 | R20 | 향후 인수 시험 | 실제 인사 식별자 없이 반복 시나리오 결과를 대조할 수 있다. | 미실행 · 시뮬레이션 미구현 |
| T21 | R21 | legacy-probe.json | 표식이 없는 v6 사용자 이메일이 v7에서 원문과 일치한다. | FAIL · 사용자 지정 이메일 도메인 변경 재현 |


## 통합 시험 실행 기록


| 시험명 | 절차 | 기대 결과 | 이번 main 결과 |
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


정적 문자열 검사·컴포넌트 렌더링·모의 IndexedDB 통합시험은 서로 다른 수준이다. scripts/verify-release.mjs가 실행하는 테스트와 추가 검증을 evidence에서 구분한다. 자료 생성 검증은 법정액 보증이나 기관 접수 확인에 해당하지 않는다.

## 추가 시험의 관찰값


| ID | 시험 입력·조건 | 관찰값 | 판정 |
|---|---|---|---|
| T08 | 2→10시간, 수당 재반영 생략 | 검증 424만 원 / 반영 후 448만 원 | 불충족 A01 |
| T19 | 확정 감사로그 저장 시 가상 abort | CONFIRMED, 해당 로그 없음 | 불충족 A03 |
| T05-중단 | 근태 확정 후 회사 표식 put abort | 336개 확정, 월 열림. 재시도 후 월 닫힘 | 부분 저장 재현 A04 |
| T21 | v6 이메일 보강 표식 없음 | custom@fixture.invalid의 도메인 변경 | 불충족 A02 |

