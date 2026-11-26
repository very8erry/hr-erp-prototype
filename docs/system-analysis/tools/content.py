from pathlib import Path
import json,csv
ROOT=Path(__file__).resolve().parents[1];S=ROOT/'sources'
SHA='b4aeb300270a62273d3d5f0c2fea87f2a09ba800';VERSION='1.0';DATE='2026-11-18'
symbols=json.loads((S/'symbols.json').read_text())
repo='src/infrastructure/db/indexedDb.ts'
def evidence(name,path=repo):
 matches=[s for s in symbols if s['name']==name and s['path']==path]
 if not matches:raise ValueError((name,path))
 return dict(matches[0],url=f'https://github.com/very8erry/hr-erp-prototype/blob/{SHA}/{path}#L{matches[0]["line"]}')
rules=[
('BR-01','사람과 고용의 분리','Person.id는 사람 기본정보, Employment.id는 고용관계 식별자다. 이름은 결합 키가 아니다. 신규 일반등록과 ATS는 새 Person을 생성한다. 기존 인물 재사용은 미구현이다.','registerEmployee'),
('BR-02','회사 소속 추론 제한','회사 1개, 유효 Person, 모든 조직 이력의 회사 일치를 확인할 때만 누락 companyId를 보완한다. 모호한 데이터는 검토 로그와 함께 보존한다.','repairEmploymentCompanies'),
('BR-03','등록의 원자성','일반등록은 회사·조직·사번을 동일 쓰기 트랜잭션에서 검사하고 Person/Employment/Assignment/Compensation을 add한다. 사번 unique 인덱스는 없으며 애플리케이션 검사가 담당한다.','registerEmployee'),
('BR-04','예약 발령 보류','적용 시 최신 원천·회사·상태·기간·동일일 충돌을 검사한다. 충돌은 reviewReason과 감사로그를 남기며 재적용하지 않는다. SCHEDULED+reviewReason이므로 별도 REVIEW 상태값과 혼동하지 않는다.','applyEvent'),
('BR-05','근태 정정의 파급','근태 수정은 관련 미확정 Run을 DRAFT/attendanceStale로 바꾸고 계산 결과를 제거한다. 월별 revision과 저장 시점 값, 마감 상태를 재검증한다. 결과를 지우는 것은 미확정 재계산 준비다.','saveAttendanceBatch'),
('BR-06','계산 입력과 결과','PayrollEntry는 급여월 생성 시 원천의 스냅샷과 수기 입력을 보유한다. PayrollResult는 calculatePayrollEntry의 결과다. 근태 변경만으로 결과가 즉시 확정되는 것이 아니며 syncAttendance/재계산을 거친다.','calculatePayrollRun'),
('BR-07','급여 검증','validatePayrollRun은 현재 입력을 다시 계산한다. 오류 0건일 때 VALIDATED, 오류가 있으면 CALCULATED에 남는다. 경고 건수와 오류 건수는 별개다.','validatePayrollRun'),
('BR-08','확정·마감·지급','VALIDATED→CONFIRMED→CLOSED→PAID. CLOSED에는 해당 월 근태 마감이 필요하며 attendanceStale가 있으면 전환하지 않는다. PAID는 은행 이체 수행이 아니라 로컬 상태 표시다.','setPayrollRunStatus'),
('BR-09','확정 데이터 보호','확정·마감·지급 Run의 재계산/수정은 차단한다. 마감 후 DRAFT 되돌리기나 취소 재지급 프로세스는 구현돼 있지 않다. 실수 정정은 별도 정책·기능이 필요하다.','calculatePayrollRun'),
('BR-10','원장 확정','근태/연차/일용직/퇴직/연말정산은 confirmRecords가 담당한다. 연말정산 확정은 최종 소득세가 null이면 거부한다. 급여 Run 상태와 원장 confirmedAt은 다른 통제다.','confirmRecords'),
('BR-11','백업 복원','schemaVersion에 따라 변환 후 seed가 모든 저장소를 단일 트랜잭션으로 대체한다. 동기 오류는 abort한다. v1의 미지 Person은 수동 검토 오류다. 중복 PK 사전검증은 아직 없으므로 ISS-A01 참조.','importDatabase'),
('BR-12','정산 계산 범위','퇴직정산은 등록된 퇴사일과 저장된 임금 자료를 사용한다. 연말정산의 estimatedFinalTax 수기 입력 후 settlementAmount=최종세액-기납부세액이다. 이 앱이 모든 공제 증빙을 자동 심사하지 않는다.','saveYearEndBatch'),
('BR-13','ATS 전환 선행조건','최종 PASS 및 ACCEPTED 오퍼, 유효 생년월일·사번·조직 회사 일치를 확인한다. 후보자/Person/Employment 연결을 같은 트랜잭션으로 기록하며 중복 전환을 거부한다.','convertCandidate'),
('BR-14','신고는 자료 생성','원천세 초안과 4대보험 목록은 로컬 검토·파일 생성이다. 신고처 홈페이지 링크가 있어도 신고기관 접수·수리 API 연결을 뜻하지 않는다.','saveWithholdingDraft'),
('BR-15','일용직 원천 보호','일용직 등록의 기존 Person/worker PK 덮어쓰기는 add 및 rollback으로 차단한다. 근로자 번호 중복 검사와 Person 본인 확인은 별개이며 동일인 자동 재사용은 없다.','createDailyWorker'),
('BR-16','사용자 권한의 경계','브라우저 로컬 역할은 업무 시뮬레이션이다. 서버 인증·접근제어·서버 감사 저장소가 존재한다고 설명하지 않는다. IndexedDB/백업에 접근할 수 있는 사용자는 데이터를 읽고 변경할 수 있다.','exportDatabase')]
R=[dict(id=i,title=t,text=x,evidence=evidence(f)) for i,t,x,f in rules];(S/'business-rules.json').write_text(json.dumps(R,ensure_ascii=False,indent=2))
# id,title,kind,owner,input,flow,output,stores,rule,symbol,test,status
raw=[
('HR-01','일반 직원등록','업무','HR 운영자','성명·사번·생년월일·입사일·연봉·조직','직원 관리 → 등록 폼 → 필수값/이름 검토 → 저장 → 연결 확인','고용 ID 및 기본 인사·조직·보상 원장','persons employments assignments compensations bankAccounts auditLogs','BR-01 BR-02 BR-03','registerEmployee','test-registration-integrity.ts','구현·회귀 통과'),
('HR-02','직원 원천 수정','업무','HR 운영자','고용 ID, 허용 필드, 수정 사유','직원 상세 → 원천정보 수정 → 필드 검증 → before/after 로그 확인','변경된 원천 레코드; 과거 급여 스냅샷은 별개','persons employments taxProfiles socialInsuranceProfiles auditLogs','BR-01 BR-09','editMaster','test-pr7-integration.ts','구현·이름 변경 시 잠금 결과 보존 확인'),
('HR-03','인사발령 등록·예약','업무','HR 운영자','고용 ID·종류·효력일·변경값·사유','발령 등록 → 동일일/기간 검사 → 즉시 적용 또는 예약 → 검토 필요 확인','PersonnelEvent 및 적용 시 새 Assignment/종료일','personnelEvents assignments employments auditLogs','BR-04','createPersonnelAction','test-pr7-scheduled.ts','구현·정상/충돌 회귀 통과'),
('ATS-01','채용 평가와 오퍼','업무','로컬 평가자/HR 역할','지원자·평가표·점수·최종 결정·오퍼','지원자 접수 → 서류/면접 평가 → 최종 판단 → 오퍼','회사 레코드 내부 recruiting 상태','company','BR-13 BR-16','saveRecruiting','test-selection.tsx','구현·로컬 역할, 외부 ATS 동기화 미확정'),
('ATS-02','ATS 입사전환','업무','HR 운영자','수락 오퍼 ID·후보자 ID·사번·생년월일','합격/수락 확인 → 입사전환 → 고용 연결 확인','신규 Person/Employment, candidate 연결','company persons employments assignments compensations auditLogs','BR-01 BR-13','convertCandidate','test-pr7-integration.ts','구현·정상/중복/다른 회사 조직 검사 통과'),
('WFM-01','월별·일별 근태 수정','업무','HR 운영자','고용 ID·귀속월/일·시간·수정 사유·revision','근태 조회 → 원천 수정 → 잠금/충돌 검사 → 급여 재검토','근태 저장, 미확정 급여 결과 무효화','attendanceMonthlySummaries attendanceDailyRecords payrollRuns payrollResults auditLogs','BR-05','saveAttendanceBatch','test-pr7-scheduled.ts','구현·실제 Chrome stale/동시 저장 통과'),
('WFM-02','근태 마감','업무','HR 운영자','귀속월 및 저장된 근태','대상·누락 검토 → 원장 확정 → 월 마감 → 급여 마감 가능','회사 attendanceClosed 및 confirmedAt','company attendanceMonthlySummaries','BR-08 BR-10','closeAttendance','test-pr7-integration.ts','구현·선행 마감 검사 통과'),
('WFM-03','연차 원장·촉진','업무','HR 운영자','입사일·연도·발생/사용·회사 운영기준','연차 조회 → 기준 비교/원장 검토 → 수기 저장·확정 → 촉진 자료 검토','연차 원장과 업무일정/문서','annualLeaveLedgers company calendarEvents','BR-10','saveAnnualLeaveBatch','test-domain.ts','원장 구현; 법정 개별 사례 전수검증 아님'),
('PAY-01','급여월·대상 생성','업무','급여 담당','귀속월·지급일·대상 고용관계','급여월 생성 → 재직기간 대상 추출 → 조직·보상·세금 기초 스냅샷','PayrollRun 및 PayrollEntry','payrollRuns payrollEntries','BR-06','createPayrollRun','test-pr7-integration.ts','구현·employmentId 매칭 확인'),
('PAY-02','근태 수당 연동','업무','급여 담당','Run ID, 월별 근태와 일별 휴일초과시간','근태 원천 검토 → 연동 호출 → 시간·수당을 급여 입력에 반영','calculationInputs와 수당 입력','payrollEntries','BR-05 BR-06','syncAttendance','test-pr7-integration.ts','구현·서비스 계층에서 실행'),
('PAY-03','급여 계산·설정','업무','급여 담당','수기 입력·항목 사용/산식·근태시간·보험기초','항목 설정 검토 → 입력 저장 → 계산 → 결과 대조','PayrollResult 및 Run.itemSnapshot','payrollItemMasters payrollEntries payrollResults payrollRuns','BR-06','calculatePayrollRun','test-revision.tsx','구현·저장 산식 적용/스냅샷 회귀'),
('PAY-04','급여 검증·확정','업무','급여 담당/검토 역할','계산 가능한 Run ID','검증 → 오류 수정 → 재검증 → 확정','VALIDATED/CONFIRMED 및 시각','payrollRuns payrollEntries payrollResults auditLogs','BR-07 BR-08','validatePayrollRun','test-domain.ts','구현·별도 사용자 승인 서버는 없음'),
('PAY-05','급여 마감·지급','업무','급여 담당','확정 Run, 근태 마감 여부','근태 마감 → 급여 마감 → 지급 완료 표시','CLOSED/PAID 및 시각','payrollRuns auditLogs','BR-08 BR-09','setPayrollRunStatus','test-pr7-integration.ts','구현·실제 은행 이체 아님'),
('PAY-06','원천 정정·재계산','업무','급여 담당','미확정 Run/원천 및 사유','수정 → stale/결과 삭제 → 근태 연동/계산 → 검증','새 미확정 결과; 잠금 상태는 거부','payrollRuns payrollResults payrollEntries','BR-05 BR-09','saveAttendanceBatch','test-domain.ts','미확정 정정 구현; 마감 후 정정 Run 미구현'),
('PAY-07','퇴직정산','업무','급여 담당','퇴사일·임금자료·DB/DC 관련 수기값','퇴사일 확인 → 임금 기준 산정 → 검토/수기 보완 → 확정','퇴직정산 원장','retirementSettlements','BR-10 BR-12','calculateRetirementSettlement','test-pr7-integration.ts','구현·증빙 및 법률 전체 자동판정 아님'),
('PAY-08','연말정산','업무','급여 담당','급여 합계·기납부세액·최종세액·서류검토','자료 대조 → 최종세액 입력 → 차액 계산 → 확정','정산액 원장과 서류검토 상태','yearEndTaxCases','BR-10 BR-12','saveYearEndBatch','test-pr7-integration.ts','구현·세액/서류 수기 검토 포함'),
('FILE-01','원천세 신고 초안','업무','급여 담당','Run 결과·일용 지급·회사정보·수기 검토','초안 생성 → 코드별 합계 → 검토 표시 → HTML/PDF 출력','WithholdingDraft/출력','company','BR-14','saveWithholdingDraft','test-v075.ts','구현·수리 여부 미검증'),
('FILE-02','보험 신고 목록','업무','HR/급여 담당','입퇴사·직종·보수·회사 관리번호','대상 자동 불러오기/수기 → 작성 → 파일 생성 → 별도 신고처 확인','filingDrafts와 파일','filingDrafts','BR-14','saveOperation','test-v078.tsx','목록 작성 구현·기관 업로드 보증 아님'),
('DAILY-01','일용직·근무수당','업무','HR/급여 담당','일용직 번호·기간·일급·일별 시간/수당','근로자 생성 → 근무기록 입력 → 계산 → 확정·월 마감','일용직 원장·근로내용 신고 자료','persons dailyWorkers dailyWorkRecords company','BR-10 BR-15','createDailyWorker','test-pr7-integration.ts','구현·별도 고용 원장, Person 재사용 미구현'),
('OPS-01','업무일정·이슈·문서','업무','HR 운영자','공지·임금일·이슈·수기 일정·중요도','원천 일정 연동 → 변경안 검토 → 캘린더/이슈 추적','운영 저장소 레코드','calendarEvents issues policyDocuments company','BR-16','saveOperation','test-planning-review.ts','구현·일부 승인/역할 시뮬레이션'),
('SYS-01','전체 백업·복원','시스템','로컬 사용자','schemaVersion 및 전체 JSON','백업 저장 → 외부 보관 → 복원 전 스키마 검사 → 변환·원자 교체','로컬 전체 저장소','meta company persons employments payrollRuns payrollResults','BR-11','importDatabase','test-registration-integrity.ts','구현·중복 PK 결함 ISS-A01'),
('SYS-02','무결성 진단','시스템','개발/검토자','전체 SeedBundle','참조·중복·기간 검사 → finding → 수동 검토','finding 목록, 임의 수정 없음','조회 전용','BR-01 BR-02','integrityFindings','test-registration-integrity.ts','함수 구현·모든 쓰기의 FK 강제는 아님'),
('NFR-01','권한·개인정보','비기능','관리자/설계자','가상 데이터·로컬 접근권한·백업 관리','실습 데이터 사용 → 외부 전달 전 점검 → 정책 수립','보안 경계·운영 정책','브라우저 전체','BR-16','exportDatabase','test-selection.tsx','로컬 통제; 운영 서버 권한 미구현'),
('FUT-01','AI 업무 시뮬레이션','미래','HR/PM/개발','정의된 업무 상태·시나리오·평가지표','격리 시나리오 → 도구 계약 → 실행 기록 → 결과/오류 평가','TO-BE 계획, 현재 구현 주장 없음','신규 저장/서버 제안은 별도 승인','BR-16','initialize','test-pr7-scheduled.ts','제안·미구현')]
req=[]
for i,title,kind,owner,inp,flow,output,stores,rule,fn,test,status in raw:
 path='src/modules/payroll/payrollService.ts' if fn=='syncAttendance' else repo
 req.append(dict(id=i,title=title,kind=kind,owner=owner,purpose=f'{title}의 판단 근거와 데이터 연결을 추적하여 후속 급여 업무의 누락·오연결을 줄인다.',input=inp,flow=flow,output=output,stores=stores.split(),rules=rule.split(),evidence=evidence(fn,path),test='scripts/'+test,status=status,normal='지정된 입력과 선행조건을 만족하면 저장 결과 및 후속 상태를 확인한다.',exception='관련 BR의 거부·보류·잠금 조건을 적용하고 오류를 임의로 무시하지 않는다.',validation=f'{test}와 관련 BR을 대조한다. 테스트 파일 존재만으로 모든 경로 통과를 뜻하지 않으며 evidence 실행 기록에 한정한다.'))
(S/'requirements.json').write_text(json.dumps(req,ensure_ascii=False,indent=2))
issues=[
('ISS-A01','A 확인 결함','P1','백업의 중복 PK 덮어쓰기','importDatabase/seed는 배열 레코드를 put으로 저장하며 중복 id 사전 검증이 없다.','399 Person 입력이 398개로 저장되고 마지막 값이 남음. diagnostic-probes.json','기존 백업 일부 행이 조용히 소실될 수 있다.','복원 전 PK/업무키 중복·참조 검사 후 전체 교체. 실패 시 원본 유지.','중복 정리 후 자동복원은 잘못된 동일인 병합 위험. 명시적 오류와 수동 검토가 안전하다.','중복 PK/복합키/잘못된 참조 fixture별 복원 거부와 원본 동일성 검사','SYS-01','importDatabase'),
('ISS-A02','A 확인 결함','P1','급여 상태와 감사로그의 분리 커밋','setPayrollRunStatus는 Run put 후 audit put을 별도 트랜잭션으로 실행한다.','감사 쓰기 실패 주입 시 CONFIRMED가 남고 해당 감사로그는 없음.','상태가 바뀌었으나 감사 근거가 없어 추적성이 약해진다.','상태 재검증·Run·audit를 하나의 readwrite 트랜잭션으로 묶기.','재시도만으로는 중복 감사/상태 경합을 해결하지 못함. outbox는 서버화 시 대안이다.','각 쓰기 시점 실패 주입; 상태·로그가 모두 저장되거나 모두 취소됨을 검사','PAY-05','setPayrollRunStatus'),
('ISS-B01','B 잠재 위험','P1','잠금 전환의 동시성 범위','상태 전환은 읽기/조건 확인과 저장이 분리된다. 근태 저장의 새 경합 검사가 모든 저장 경로를 보호하지 않는다.','setPayrollRunStatus 코드 정적 확인; 경합 전체 조합 미실행','두 탭의 다른 작업 순서에 따라 판단 시점과 저장 시점이 달라질 수 있다.','Run 상태 전이와 잠금 관련 변경의 원자적 경계 정리.','전역 UI 잠금은 같은 브라우저 탭 밖에서 강제되지 않는다.','확정/마감 vs 입력/삭제 interleaving 테스트','PAY-04','setPayrollRunStatus'),
('ISS-B02','B 잠재 위험','P1','로컬 데이터와 백업의 접근 경계','IndexedDB 및 JSON 백업은 서버 권한 경계가 아니다.','exportDatabase/로컬 아키텍처 확인','실제 개인정보 입력 시 공유 프로필·백업 유출 위험','실습 가상자료 원칙 유지; 실제 운영 전 인증/권한/보관·암호화 설계.','브라우저 암호화만으로 실행 중 권한 우회를 막지는 못함.','권한별 위협 모델 및 백업 접근 테스트','NFR-01','exportDatabase'),
('ISS-B03','B 잠재 위험','P2','단일 회사 가정과 전체 백업','getCompany는 첫 회사, SeedBundle.company는 단일 객체다.','코드 및 다중회사 보완 테스트 범위 확인','여러 회사가 저장돼 있으면 백업 대표 범위가 불명확하다.','단일회사 불변식 명시·검사 또는 다중회사 스키마를 별도 설계.','즉시 배열로 바꾸면 기존 파일 호환성 비용 발생.','2회사 입력 시 거부/보존 요구사항 결정 후 테스트','SYS-01','getCompany'),
('ISS-B04','B 잠재 위험','P2','일용직 번호 경합','번호 중복 조회는 새 worker 쓰기 트랜잭션 밖이다. unique workerNumber 인덱스 없음.','createDailyWorker/config 정적 확인, 동시 번호 시험 미실행','다른 PK에 같은 번호가 연결될 가능성','번호 검사와 add를 같은 tx로 이동; 기존 중복 정리 승인 후 unique 검토.','인덱스 즉시 추가는 기존 중복으로 업그레이드 중단 가능.','두 탭 동일 번호 등록 시 1건만 성공','DAILY-01','createDailyWorker'),
('ISS-C01','C 정책 미정','P1','재입사·사번·동일인','일반등록/ATS는 새 Person; 이름은 확인 근거가 아니다.','BR-01/BR-13 및 실제 코드','인물 이력이 분산되고 누적 집계가 달라질 수 있다.','권한 있는 본인 확인과 기존 Person 선택/오연결 정정 정책부터 확정.','이름 자동병합은 동명이인 손상 위험. 민감번호 무조건 수집도 부적절.','동명이인/사번 변경/복수 고용/ATS 재지원 사례','HR-01','registerEmployee'),
('ISS-C02','C 정책 미정','P1','마감 후 정정 급여','잠금 Run은 DRAFT 되돌리기가 금지되고 별도 정정 Run이 없다.','BR-09 코드와 잠금 회귀','실제 업무의 소급 정정/취소·재지급 절차가 완결되지 않음','원본 보존한 차액 정정·승인·신고 수정 정책 설계.','기존 결과 덮어쓰기는 과거 재현성 훼손.','차액원장/원Run 연결/취소 권한 테스트','PAY-06','setPayrollRunStatus'),
('ISS-C03','C 정책 미정','P2','보류 발령 재검토','reviewReason이 있으면 자동 적용하지 않으며 재승인 UI가 없다.','BR-04와 타임라인 표시 코드','사용자 검토 이후의 승인·취소 경로 정의 필요','원본 보존·새 승인기록·기준 스냅샷 갱신 정책.','플래그 단순 삭제는 판단 근거 유실.','보류→재검토→취소/새 발령의 감사 테스트','HR-03','applyEvent'),
('ISS-D01','D 확장 제안','P2','저장소 책임 분리','Core HR/ATS/Payroll/운영 쓰기가 큰 IndexedDbHrRepository에 모인다.','클래스 메서드/소스 목록 측정','변경 파급과 테스트 탐색 비용','현재 트랜잭션 경계를 보존하는 업무별 쓰기 단위 추출.','store별 단순 분리는 원자성을 깨뜨릴 수 있음.','기존 회귀 동일성 및 모듈 의존 검사','SYS-02','initialize'),
('ISS-D02','D 확장 제안','P2','PR 검증 게이트','workflow는 main push/workflow_dispatch 전용, main 보호 및 rulesets 없음.','병합 전 API 조회 + deploy.yml','병합 후에야 CI 오류가 드러날 수 있음','PR 빌드·검증과 보호 규칙을 운영 결정 후 설정.','현재 문서 작업은 workflow를 변경하지 않음.','실패 PR 병합 차단 확인','NFR-01','initialize'),
('ISS-D03','D 확장 제안','P3','AI 업무 실행 계약','현재 서비스는 브라우저 업무 호출, 서버/MCP 실행 계약 없음.','현행 컴포넌트 구조','안전한 자동화·평가·복구 체계가 선행되어야 함','격리 데이터셋·명령 멱등키·허용 작업·실행 추적·평가지표부터 설계.','화면 좌표만 자동화하면 변경에 취약.','시나리오 성공률/손상0/복구시간을 측정','FUT-01','initialize')]
I=[dict(zip(['id','category','priority','title','cause','evidence','impact','proposal','tradeoff','validation','requirement','symbol'],x)) for x in issues]
for i in I:i['code']=evidence(i['symbol']);i['status']='진단/제안만 작성; 이번 문서 작업에서 앱 코드 수정 없음'
(S/'issues.json').write_text(json.dumps(I,ensure_ascii=False,indent=2))
for name,rows in [('requirements',req),('issues',I),('business-rules',R)]:
 keys=list(rows[0]);f=(S/(name+'.csv')).open('w',encoding='utf-8-sig',newline='');w=csv.DictWriter(f,fieldnames=keys);w.writeheader();w.writerows([{k:json.dumps(v,ensure_ascii=False) if isinstance(v,(dict,list)) else v for k,v in x.items()} for x in rows]);f.close()
# Every requirement has exact code anchor and test-file existence check (not a fresh test run).
trace=[]
for q in req:
 assert (ROOT.parents[1]/q['test']).exists(),q['test']
 trace.append(dict(requirement=q['id'],rules=q['rules'],code=q['evidence'],test=q['test'],verification='기존 실행기록 재사용; FUT-01은 미래 수용조건 제안',scope=q['status']))
(S/'traceability.json').write_text(json.dumps(trace,ensure_ascii=False,indent=2))
print(len(req),'requirements',len(R),'rules',len(I),'issues')
