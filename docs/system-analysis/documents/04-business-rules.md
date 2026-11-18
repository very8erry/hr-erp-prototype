# 상태 전이 및 업무 규칙 정의서

문서 버전 1.0 | 작성 2026-11-18 KST | 분석 기준 b4aeb300270a62273d3d5f0c2fea87f2a09ba800

작성 근거: 고정 커밋의 src, config, 테스트 및 docs/verification 실행 기록. 문서 작업은 애플리케이션 코드를 변경하지 않는다.

관련 요구사항: 전체 요구사항

## BR-01 사람과 고용의 분리

Person.id는 사람 기본정보, Employment.id는 고용관계 식별자다. 이름은 결합 키가 아니다. 신규 일반등록과 ATS는 새 Person을 생성한다. 기존 인물 재사용은 미구현이다.

근거: [src/infrastructure/db/indexedDb.ts:241](https://github.com/very8erry/hr-erp-prototype/blob/b4aeb300270a62273d3d5f0c2fea87f2a09ba800/src/infrastructure/db/indexedDb.ts#L241) / registerEmployee

## BR-02 회사 소속 추론 제한

회사 1개, 유효 Person, 모든 조직 이력의 회사 일치를 확인할 때만 누락 companyId를 보완한다. 모호한 데이터는 검토 로그와 함께 보존한다.

근거: [src/infrastructure/db/indexedDb.ts:209](https://github.com/very8erry/hr-erp-prototype/blob/b4aeb300270a62273d3d5f0c2fea87f2a09ba800/src/infrastructure/db/indexedDb.ts#L209) / repairEmploymentCompanies

## BR-03 등록의 원자성

일반등록은 회사·조직·사번을 동일 쓰기 트랜잭션에서 검사하고 Person/Employment/Assignment/Compensation을 add한다. 사번 unique 인덱스는 없으며 애플리케이션 검사가 담당한다.

근거: [src/infrastructure/db/indexedDb.ts:241](https://github.com/very8erry/hr-erp-prototype/blob/b4aeb300270a62273d3d5f0c2fea87f2a09ba800/src/infrastructure/db/indexedDb.ts#L241) / registerEmployee

## BR-04 예약 발령 보류

적용 시 최신 원천·회사·상태·기간·동일일 충돌을 검사한다. 충돌은 reviewReason과 감사로그를 남기며 재적용하지 않는다. SCHEDULED+reviewReason이므로 별도 REVIEW 상태값과 혼동하지 않는다.

근거: [src/infrastructure/db/indexedDb.ts:530](https://github.com/very8erry/hr-erp-prototype/blob/b4aeb300270a62273d3d5f0c2fea87f2a09ba800/src/infrastructure/db/indexedDb.ts#L530) / applyEvent

## BR-05 근태 정정의 파급

근태 수정은 관련 미확정 Run을 DRAFT/attendanceStale로 바꾸고 계산 결과를 제거한다. 월별 revision과 저장 시점 값, 마감 상태를 재검증한다. 결과를 지우는 것은 미확정 재계산 준비다.

근거: [src/infrastructure/db/indexedDb.ts:1049](https://github.com/very8erry/hr-erp-prototype/blob/b4aeb300270a62273d3d5f0c2fea87f2a09ba800/src/infrastructure/db/indexedDb.ts#L1049) / saveAttendanceBatch

## BR-06 계산 입력과 결과

PayrollEntry는 급여월 생성 시 원천의 스냅샷과 수기 입력을 보유한다. PayrollResult는 calculatePayrollEntry의 결과다. 근태 변경만으로 결과가 즉시 확정되는 것이 아니며 syncAttendance/재계산을 거친다.

근거: [src/infrastructure/db/indexedDb.ts:780](https://github.com/very8erry/hr-erp-prototype/blob/b4aeb300270a62273d3d5f0c2fea87f2a09ba800/src/infrastructure/db/indexedDb.ts#L780) / calculatePayrollRun

## BR-07 급여 검증

validatePayrollRun은 현재 입력을 다시 계산한다. 오류 0건일 때 VALIDATED, 오류가 있으면 CALCULATED에 남는다. 경고 건수와 오류 건수는 별개다.

근거: [src/infrastructure/db/indexedDb.ts:809](https://github.com/very8erry/hr-erp-prototype/blob/b4aeb300270a62273d3d5f0c2fea87f2a09ba800/src/infrastructure/db/indexedDb.ts#L809) / validatePayrollRun

## BR-08 확정·마감·지급

VALIDATED→CONFIRMED→CLOSED→PAID. CLOSED에는 해당 월 근태 마감이 필요하며 attendanceStale가 있으면 전환하지 않는다. PAID는 은행 이체 수행이 아니라 로컬 상태 표시다.

근거: [src/infrastructure/db/indexedDb.ts:822](https://github.com/very8erry/hr-erp-prototype/blob/b4aeb300270a62273d3d5f0c2fea87f2a09ba800/src/infrastructure/db/indexedDb.ts#L822) / setPayrollRunStatus

## BR-09 확정 데이터 보호

확정·마감·지급 Run의 재계산/수정은 차단한다. 마감 후 DRAFT 되돌리기나 취소 재지급 프로세스는 구현돼 있지 않다. 실수 정정은 별도 정책·기능이 필요하다.

근거: [src/infrastructure/db/indexedDb.ts:780](https://github.com/very8erry/hr-erp-prototype/blob/b4aeb300270a62273d3d5f0c2fea87f2a09ba800/src/infrastructure/db/indexedDb.ts#L780) / calculatePayrollRun

## BR-10 원장 확정

근태/연차/일용직/퇴직/연말정산은 confirmRecords가 담당한다. 연말정산 확정은 최종 소득세가 null이면 거부한다. 급여 Run 상태와 원장 confirmedAt은 다른 통제다.

근거: [src/infrastructure/db/indexedDb.ts:836](https://github.com/very8erry/hr-erp-prototype/blob/b4aeb300270a62273d3d5f0c2fea87f2a09ba800/src/infrastructure/db/indexedDb.ts#L836) / confirmRecords

## BR-11 백업 복원

schemaVersion에 따라 변환 후 seed가 모든 저장소를 단일 트랜잭션으로 대체한다. 동기 오류는 abort한다. v1의 미지 Person은 수동 검토 오류다. 중복 PK 사전검증은 아직 없으므로 ISS-A01 참조.

근거: [src/infrastructure/db/indexedDb.ts:1285](https://github.com/very8erry/hr-erp-prototype/blob/b4aeb300270a62273d3d5f0c2fea87f2a09ba800/src/infrastructure/db/indexedDb.ts#L1285) / importDatabase

## BR-12 정산 계산 범위

퇴직정산은 등록된 퇴사일과 저장된 임금 자료를 사용한다. 연말정산의 estimatedFinalTax 수기 입력 후 settlementAmount=최종세액-기납부세액이다. 이 앱이 모든 공제 증빙을 자동 심사하지 않는다.

근거: [src/infrastructure/db/indexedDb.ts:1227](https://github.com/very8erry/hr-erp-prototype/blob/b4aeb300270a62273d3d5f0c2fea87f2a09ba800/src/infrastructure/db/indexedDb.ts#L1227) / saveYearEndBatch

## BR-13 ATS 전환 선행조건

최종 PASS 및 ACCEPTED 오퍼, 유효 생년월일·사번·조직 회사 일치를 확인한다. 후보자/Person/Employment 연결을 같은 트랜잭션으로 기록하며 중복 전환을 거부한다.

근거: [src/infrastructure/db/indexedDb.ts:899](https://github.com/very8erry/hr-erp-prototype/blob/b4aeb300270a62273d3d5f0c2fea87f2a09ba800/src/infrastructure/db/indexedDb.ts#L899) / convertCandidate

## BR-14 신고는 자료 생성

원천세 초안과 4대보험 목록은 로컬 검토·파일 생성이다. 신고처 홈페이지 링크가 있어도 신고기관 접수·수리 API 연결을 뜻하지 않는다.

근거: [src/infrastructure/db/indexedDb.ts:923](https://github.com/very8erry/hr-erp-prototype/blob/b4aeb300270a62273d3d5f0c2fea87f2a09ba800/src/infrastructure/db/indexedDb.ts#L923) / saveWithholdingDraft

## BR-15 일용직 원천 보호

일용직 등록의 기존 Person/worker PK 덮어쓰기는 add 및 rollback으로 차단한다. 근로자 번호 중복 검사와 Person 본인 확인은 별개이며 동일인 자동 재사용은 없다.

근거: [src/infrastructure/db/indexedDb.ts:1176](https://github.com/very8erry/hr-erp-prototype/blob/b4aeb300270a62273d3d5f0c2fea87f2a09ba800/src/infrastructure/db/indexedDb.ts#L1176) / createDailyWorker

## BR-16 사용자 권한의 경계

브라우저 로컬 역할은 업무 시뮬레이션이다. 서버 인증·접근제어·서버 감사 저장소가 존재한다고 설명하지 않는다. IndexedDB/백업에 접근할 수 있는 사용자는 데이터를 읽고 변경할 수 있다.

근거: [src/infrastructure/db/indexedDb.ts:1281](https://github.com/very8erry/hr-erp-prototype/blob/b4aeb300270a62273d3d5f0c2fea87f2a09ba800/src/infrastructure/db/indexedDb.ts#L1281) / exportDatabase

## 상태 읽기 보충
급여 DRAFT→CALCULATED→VALIDATED→CONFIRMED→CLOSED→PAID는 BR-07/08 참조. 계산 오류 시 CALCULATED, 미확정 원천 정정 시 DRAFT 및 stale이 된다. 확정·마감 단계의 역전 화살표를 그리지 않는다.

근태는 단일 상태 enum 대신 confirmedAt과 company.attendanceClosed가 결합된다. 미확정→개별확정→월마감의 업무 상태를 그림에서 사용할 때 실제 저장 필드를 함께 표기한다.

인사발령 SCHEDULED→APPLIED. SCHEDULED+reviewReason은 보류 상태의 논리적 표현이며 새 enum이 아니다. 기존 pending 원천이 바뀌면 자동 적용 대신 수동 검토한다. 취소/재승인은 미래 정책이다.
