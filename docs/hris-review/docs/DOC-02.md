# DOC-02　업무 프로세스·예외처리 정의서

v1.0 · 2026-11-19 · b4aeb300270a62273d3d5f0c2fea87f2a09ba800

독자　HR 실무자·UI 및 저장 담당

목적과 범위　업무에서 판단하는 순서와 실제 호출을 나란히 대조한다. 기능 간 확정 순서와 같은 화면에서 선택 가능한 절차는 구별한다.

## P01　직원등록


| 단계 | 담당자 행동 | 프로그램 대응 |
|---|---|---|
| 준비 | 입사 서류의 성명·사번·입사일·연봉·소속 조직을 확인한다. | 직원 관리 > 직원 등록 > 저장 |
| 처리 | 이름 경고는 검토 표시 후 제출한다. 이미 사용한 사번이면 입력을 바로잡는다. | EmployeeRegistrationModal.onSave → HrService.registerEmployee → registerEmployee |
| 결과 확인 | 중복 사번 제출 후 4개 핵심 원장과 로그의 행 수가 모두 그대로다. | 이름·급여·계좌 쌍 확인 → UUID 발급 → 트랜잭션 안에서 회사·조직·사번 조회 → Person·Employment·Assignment·CompensationSnapshot 추가 → 로그와 함께 커밋 → 고용 ID 반환·목록 갱신 |


관련 데이터　employments.personId / companyId　·　근거　src/app/App.tsx:106 / src/infrastructure/db/indexedDb.ts:241　·　R01

## P02　ATS 입사전환


| 단계 | 담당자 행동 | 프로그램 대응 |
|---|---|---|
| 준비 | 합격 결정과 수락된 오퍼를 찾아 생년월일·사번·국적·근무지를 보완한다. | 채용 > 오퍼 > 입사정보 보완 |
| 처리 | 오퍼 조직의 회사와 기존 전환 여부를 확인한다. 거부되면 후보 상태를 유지한다. | OffersPanel.onSubmit → PayrollService.convertCandidate → convertCandidate |
| 결과 확인 | 승인된 합격·수락 오퍼를 두 번 전환하면 한 번만 성공하고 후보의 고용 ID가 원장과 같다. | 쓰기 트랜잭션에서 PASS·ACCEPTED·고용 연결·사번을 검사한다. 기본 원장 4종과 company.recruiting 후보의 고용 ID·채용완료 이력 및 로그를 저장하고 두 ID를 반환한다. |


관련 데이터　company.recruiting.candidates / employmentId　·　근거　src/modules/recruiting/OffersPanel.tsx:17 / src/infrastructure/db/indexedDb.ts:899　·　R02

## P03　인사발령


| 단계 | 담당자 행동 | 프로그램 대응 |
|---|---|---|
| 준비 | 직원·발령 종류·효력일·사유·변경값을 확인한다. | 직원 상세 > 인사발령 등록 |
| 처리 | 동일일 충돌이나 소속 불일치면 재검토한다. 예약 이후 원천 이력이 바뀌면 검토 사유를 확인한다. | HrService.createPersonnelAction → createPersonnelAction → applyEvent 또는 applyDueEvents |
| 결과 확인 | 조직이동 시 기존 이력 종료일은 효력일 전날, 새 이력 시작일은 효력일이어야 한다. | 발령 당시 이력과 상태를 스냅샷으로 채운다. 먼저 SCHEDULED와 로그를 저장하고 즉시 효력이면 별도 적용한다. 조직이동은 이전 구간 종료와 새 Assignment를 기록한다. |


관련 데이터　personnelEvents.sourceAssignmentId / effectiveDate　·　근거　src/modules/core-hr/EmployeeDetail.tsx:92 / src/infrastructure/db/indexedDb.ts:582　·　R03

## P04　근태 입력·수정


| 단계 | 담당자 행동 | 프로그램 대응 |
|---|---|---|
| 준비 | 일별 기록 또는 직원·월별 집계에 시간과 수정 사유를 입력한다. | 근태 > 편집·일괄 적용 |
| 처리 | 재직기간·중복·시간 범위·확정 여부를 확인한다. 오래된 화면 오류면 다시 조회해 최신값과 대조한다. | AttendancePage.onSave → PayrollService.saveAttendanceBatch → saveAttendanceBatch |
| 결과 확인 | 두 탭이 같은 revision에서 바꿀 때 하나만 반영되고 나머지는 재조회를 요청한다. | 일별 입력으로 월 집계를 보완하고 쓰기 트랜잭션 안에서 마감·급여·기존 행을 재조회한다. 월 revision을 올리고 해당 기간 열린 Run을 DRAFT·stale로 바꾸며 기존 결과를 삭제한다. 실패 시 abort한다. |


관련 데이터　attendanceMonthlySummaries.revision / attendanceDailyRecords.updatedAt　·　근거　src/modules/attendance/AttendancePage.tsx:105 / src/infrastructure/db/indexedDb.ts:1049　·　R04

## P05　근태 마감


| 단계 | 담당자 행동 | 프로그램 대응 |
|---|---|---|
| 준비 | 급여 대상 명단과 월 근태를 대조하고 미확정 행을 확인한다. | 근태 > 월 마감 |
| 처리 | 대상자에게 누락 행이 있으면 보완한다. 급여월 생성보다 먼저 마감하면 대조할 Entry 범위가 달라진다. | PayrollService.closeAttendance → closeAttendance → confirmRecords → put |
| 결과 확인 | 한 급여 대상의 월 근태가 빠지면 회사 마감 시각이 생기지 않는다. | 월 형식·근태 존재·급여 대상 전원 포함을 검사한다. 미확정 행을 먼저 확정한 뒤 회사 레코드에 월 마감 시각을 별도로 저장한다. |


관련 데이터　company.attendanceClosed[period] / confirmedAt　·　근거　src/modules/attendance/AttendancePage.tsx:101 / src/infrastructure/db/indexedDb.ts:933　·　R05

## P06　급여 대상 생성


| 단계 | 담당자 행동 | 프로그램 대응 |
|---|---|---|
| 준비 | 귀속월·지급일을 지정한 뒤 입퇴사 명단과 자동 생성 인원을 대조한다. | 급여 > 급여월 생성 |
| 처리 | 입사예정·월 밖의 고용은 제외된다. 원장에 보상·배치 이력이 없으면 건너뛰므로 제외 명단 검토가 필요하다. | CreateRunModal → PayrollService.createRun → createPayrollRun |
| 결과 확인 | 해당 월 중 입사한 등록 직원이 한 행으로 생성되고 고용 ID가 직원 원장과 같다. | 기간 중 고용과 월말 이력을 선택한다. 유효 이력이 없으면 월말 이전 최근 이력으로 대체한다. 성명·조직·연봉·일할률을 복사해 Run·Entry·로그를 한 번에 저장한다. |


관련 데이터　payrollEntries.runId / employmentId / annualSalarySnapshot　·　근거　src/modules/payroll/PayrollPage.tsx:160 / src/infrastructure/db/indexedDb.ts:631　·　R06

## P07　급여 계산


| 단계 | 담당자 행동 | 프로그램 대응 |
|---|---|---|
| 준비 | 수당 설정과 월 소정시간을 검토하고 근태 연동 수당을 반영한 후 계산한다. | 급여 > 근태 수당 반영 > 급여 계산 |
| 처리 | 개별 입력과 계산 결과를 대조한다. 확정·마감·지급 완료월 재계산은 거부된다. | syncAttendance → saveEntry / calculate → calculatePayrollRun → calculatePayrollEntry |
| 결과 확인 | 총지급액과 공제액의 차가 실지급액과 일치하고 직원 연봉 원장은 보존된다. | 근태 반영은 대상자별 저장이다. 계산은 Entry와 수당 스냅샷·휴직·지급일을 읽어 금액을 산출한다. Run·Entry·Result·로그는 계산 단계에서 한 거래로 쓴다. |


관련 데이터　payrollResults.grossPay / totalDeductions / netPay　·　근거　src/modules/payroll/PayrollPage.tsx:127 / src/infrastructure/db/indexedDb.ts:780　·　R07

## P08　급여 검증


| 단계 | 담당자 행동 | 프로그램 대응 |
|---|---|---|
| 준비 | 오류 인원과 경고 내역을 열고 원장·수당을 대조한다. | 급여 > 검증 |
| 처리 | 오류가 0이면 검증 완료가 가능하다. 경고만 있는 경우의 최종 승인 책임은 별도 정책이다. | PayrollService.validate → validatePayrollRun → calculatePayrollRun → put |
| 결과 확인 | 수당이 연결된 근태의 시간이 변경된 후 이전 시간으로 검증 완료할 수 없다. | 현재 Entry 전체를 재계산해 경고·오류를 합산한다. 오류 0이면 VALIDATED를 기록하고 별도 로그를 쓴다. 수정된 근태를 Entry에 다시 반영하는 단계는 호출하지 않는다. |


관련 데이터　payrollRuns.validatedAt / payrollEntries.attendanceRevision　·　근거　src/modules/payroll/PayrollPage.tsx:128 / src/infrastructure/db/indexedDb.ts:809　·　R08

## P09　급여 확정


| 단계 | 담당자 행동 | 프로그램 대응 |
|---|---|---|
| 준비 | 검증 결과와 인별 금액을 확인한 뒤 확정한다. | 급여 > 확정 |
| 처리 | VALIDATED와 stale 해제가 전제다. 담당자 교차 승인은 확인되지 않았다. | PayrollService.status → setPayrollRunStatus(CONFIRMED) |
| 결과 확인 | DRAFT의 확정은 실패하고 VALIDATED 건에만 confirmedAt이 기록된다. | 저장 상태를 검사하고 confirmedAt과 상태를 저장한 뒤 로그를 별도로 기록한다. 이후 입력·재계산 잠금이 적용된다. |


관련 데이터　payrollRuns.status / confirmedAt　·　근거　src/modules/payroll/PayrollPage.tsx:128 / src/infrastructure/db/indexedDb.ts:822　·　R09

## P10　급여 마감


| 단계 | 담당자 행동 | 프로그램 대응 |
|---|---|---|
| 준비 | 급여 확정과 해당 월 근태 마감을 확인한다. | 급여 > 급여 마감 |
| 처리 | 선행 단계가 빠지면 마감 버튼 또는 저장 경로가 거부한다. | PayrollService.status → setPayrollRunStatus(CLOSED) → isAttendanceClosed |
| 결과 확인 | 급여 확정 후에도 근태 미마감이면 CLOSED 전이가 거부된다. | CONFIRMED 및 월 마감 표식을 조회하고 closedAt을 기록한다. 원천 마감과 급여 마감은 서로 다른 레코드에 있다. |


관련 데이터　payrollRuns.closedAt / company.attendanceClosed　·　근거　src/modules/payroll/PayrollPage.tsx:128 / src/infrastructure/db/indexedDb.ts:822　·　R10

## P11　지급 완료 기록


| 단계 | 담당자 행동 | 프로그램 대응 |
|---|---|---|
| 준비 | 외부에서 확인한 지급 결과를 기준으로 마감월에 완료 표시한다. 외부 대사 기준은 조직 결정 사항이다. | 급여 > 지급 완료 |
| 처리 | CLOSED에서만 허용한다. 이 화면의 완료 표시는 은행 거래 성공을 증명하지 않는다. | PayrollService.status → setPayrollRunStatus(PAID) |
| 결과 확인 | 마감 전 지급 처리는 거부되고 마감 후 PAID와 paidAt이 재조회된다. | 로컬 Run에 paidAt과 PAID를 쓰고 감사로그를 남긴다. 이 경로에 은행 전송이나 응답 수신은 없다. |


관련 데이터　payrollRuns.paidAt　·　근거　src/modules/payroll/PayrollPage.tsx:128 / src/infrastructure/db/indexedDb.ts:822　·　R11

## P12　급여 정정


| 단계 | 담당자 행동 | 프로그램 대응 |
|---|---|---|
| 준비 | 열린 급여월에서 입력을 수정하고 재계산한다. 지급 후 발견한 차액은 별도 설계가 필요하다. | 급여 > 입력 수정 또는 파일 일괄 반영 |
| 처리 | 확정 이후 원 Run의 입력 수정·재계산이 차단된다. 별도 소급 항목의 금액 입력만으로 정정 원장과 승인 이력이 성립하지 않는다. | saveEntry → upsertPayrollEntry / saveEntries → savePayrollEntriesBatch |
| 결과 확인 | 지급 후 같은 사유의 차액 정정을 두 번 요청해도 원본은 보존되고 승인 차액은 한 번만 반영된다. | 개별 수정은 해당 Result를 지우고 Run을 DRAFT로 되돌린다. 일괄 수정은 관련 Run의 결과 전체를 무효화한다. 확정 이후 원본과 연결되는 차액 전표의 생성 경로는 식별되지 않았다. |


관련 데이터　payrollEntries.retroPay / payrollResults.id　·　근거　src/modules/payroll/PayrollEntryEditor.tsx / src/infrastructure/db/indexedDb.ts:754　·　R12

## P13　퇴직정산


| 단계 | 담당자 행동 | 프로그램 대응 |
|---|---|---|
| 준비 | 퇴사일·제도(DB/DC)·과거 급여 및 제외 자료를 확인하고 계산·보완·확정한다. | 급여 > 퇴직정산 > 재계산 |
| 처리 | 퇴사일 미등록 또는 확정 건 재계산을 거부한다. 계산 기초와 수기 보정을 검토한다. | calculateRetirement → calculateRetirementSettlement → retirementByPlan → put |
| 결과 확인 | 확정된 퇴사자의 재계산과 수기 변경이 거부되며 이전 결과가 보존된다. | 고용 ID로 급여 결과와 입력을 추려 제도별 계산 후 ruleVersion이 있는 초안을 기록한다. 수기는 saveRetirementBatch가 사유·숫자·제도를 검사해 원장과 로그를 저장한다. |


관련 데이터　retirementSettlements.employmentId / retirementPay　·　근거　src/modules/payroll/SettlementPanels.tsx:8 / src/infrastructure/db/indexedDb.ts:1233　·　R13

## P14　연말정산


| 단계 | 담당자 행동 | 프로그램 대응 |
|---|---|---|
| 준비 | 귀속연도·개인별 누계와 증빙을 검토하고 최종 소득세를 입력한다. | 급여 > 연말정산 > 저장·확정 |
| 처리 | 최종세액이 비어 있으면 확정할 수 없다. 입력 수정은 사유를 남긴다. | yearEndTaxCases → listYearEndTaxCases / saveYearEnd → saveYearEndBatch → confirmRecords |
| 결과 확인 | 최종 75,000원, 기납부 100,000원이면 정산액은 –25,000원이고 확정 뒤 수정할 수 없다. | DRAFT 이외 Run에서 과세급여와 기납부세액을 합산한다. 수기 편집본을 우선한다. 최종 소득세에서 기납부 소득세를 빼 차액을 저장한다. |


관련 데이터　yearEndTaxCases.taxYear / estimatedFinalTax / settlementAmount　·　근거　src/modules/payroll/SettlementPanels.tsx:14 / src/infrastructure/db/indexedDb.ts:1227　·　R14

## P15　원천세 자료 생성


| 단계 | 담당자 행동 | 프로그램 대응 |
|---|---|---|
| 준비 | 귀속월 지급 내역에서 소득 구분별 인원·금액·세액을 대조하고 신고서 초안을 확인한다. | 급여 > 원천세 신고 > 작성·출력 |
| 처리 | 퇴사월·일용 구분과 검토 완료 여부를 확인한다. 전자 신고와 접수번호는 외부에서 관리한다. | initialWithholding → calculateWithholding → validateWithholding / saveWithholdingDraft |
| 결과 확인 | A01 대상의 급여 합계와 신고서 초안의 금액이 일치하고 미검토 출력 검사는 실패한다. | 급여 결과·입력·일용 기록을 초안으로 구성한다. 작성값 저장은 회사의 withholdingDrafts[ID]와 로그 쓰기로 나뉜다. 출력 형식과 기관 신고 성공은 다른 검증 대상이다. |


관련 데이터　company.withholdingDrafts / payrollResults.incomeTax　·　근거　src/modules/payroll/WithholdingEditor.tsx / src/infrastructure/db/indexedDb.ts:923　·　R15

## P16　4대보험 취득·상실 자료


| 단계 | 담당자 행동 | 프로그램 대응 |
|---|---|---|
| 준비 | 귀속월 입·퇴사자를 불러와 보수월액·직종·상실사유와 날짜를 대조한 뒤 양식을 내보낸다. | 급여 > 4대보험 신고 > 자격취득·자격상실 |
| 처리 | 취득은 입사월, 상실은 퇴사월로 대상을 고르고 상실일에 퇴사 다음날을 채운다. 기관 접수 여부는 외부 확인이다. | EdiInsuranceWorksheet.autoLoad → emptyEdi → setRows / exportEdi 또는 saveOperation |
| 결과 확인 | 취득 양식 39열·상실 양식 22열을 생성하고 필수값 누락 행은 거부한다. | 회사정보와 해당 월 Entry의 보험 기준액을 조합한다. 화면 행은 임시 상태이며 파일 출력과 filingDrafts 저장은 각각 별도 동작이다. |


관련 데이터　filingDrafts / employeeId(고용 ID) / ruleVersion　·　근거　src/modules/payroll/EdiInsuranceWorksheet.tsx:17 / src/infrastructure/db/indexedDb.ts:884　·　R16

