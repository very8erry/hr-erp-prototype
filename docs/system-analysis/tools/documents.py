from pathlib import Path
import json
B=Path(__file__).resolve().parents[1];S=B/'sources';D=B/'documents';D.mkdir(exist_ok=True)
req=json.loads((S/'requirements.json').read_text());rules=json.loads((S/'business-rules.json').read_text());issues=json.loads((S/'issues.json').read_text());stores=json.loads((S/'physical-stores.json').read_text());fields=json.loads((S/'fields.json').read_text());SHA='b4aeb300270a62273d3d5f0c2fea87f2a09ba800'
meta=f'문서 버전 1.0 | 작성 2026-11-18 KST | 분석 기준 {SHA}\n\n작성 근거: 고정 커밋의 src, config, 테스트 및 docs/verification 실행 기록. 문서 작업은 애플리케이션 코드를 변경하지 않는다.\n\n'
def write(name,title,text,ids='전체 요구사항'):(D/(name+'.md')).write_text('# '+title+'\n\n'+meta+'관련 요구사항: '+ids+'\n\n'+text)
def ev(x):return f"[{x['path']}:{x['line']}]({x['url']}) / {x['name']}"
write('00-guide','문서 체계·범위·분석 기준','''현재 목적은 Payroll 업무 이해와 설계·활용 능력을 보여주는 로컬 HR Training Simulator다. 단기 목표는 자료 검토에 참고할 정확성·저장 안정성·재현성을 갖추는 것이며, 실제 운영 인증으로 해석하지 않는다. 장기 AI 업무 시뮬레이션은 FUT-01의 제안이다.

공통 규칙의 기준 위치는 04-business-rules.md 및 business-rules.json이다. 요구사항은 ID로 규칙을 참조하며 같은 규칙을 문서마다 재정의하지 않는다. 필드의 기술적 사실은 TypeScript AST 추출본 fields.json/data-dictionary.csv, 물리 저장소와 인덱스의 기준은 physical-stores.json이다. 06-code-mapping.md/traceability.json이 요구사항과 코드·테스트를 연결한다. 화면에 보이는 합계나 View 타입을 별도 저장소로 간주하지 않는다.

증거 분류: E-CODE=실제 코드 정적 확인, E-TEST=격리 테스트 실행 기록, E-DEPLOY=Actions와 배포 화면, E-PROPOSAL=추가 설계 제안. 정적 확인만으로 모든 런타임 경로를 검증했다고 표기하지 않는다. 법령의 현재 적합성은 이번 코드 구조 진단 범위 밖이며 앱의 2025~2026 산식 지원 범위와 법적 정확성 검증은 별개다.

PDF A는 의사결정 자료, PDF B는 개념과 구조·읽기 방법을 설명하는 교재다. 전체 1,290개 인터페이스 필드 추출본은 원본 CSV/JSON으로 제공한다. 모든 필드에 업무 의미나 런타임 검증이 구현되어 있다는 뜻은 아니다. 선언·저장·검증은 서로 다른 사실이다.

병합 전 PR HEAD ebe198d, main 이전 a3021607. PR 체크 0건(상태 집계 pending은 실행 중 CI가 아니라 상태 레코드 없음), main protected=false, rulesets=[] 확인 후 사용자 요청에 따라 Ready 및 squash 병합했다. 병합 SHA를 모든 근거 링크에 고정했다. main push Actions run 44210067857 성공. 세부 결과는 evidence/release.json 및 deployed-smoke.json 참조.

과거 PR #7 수정 내용과 이번 진단의 현재 미해결 문제를 구분한다. PR #7에서 회사 소속·예약충돌·근태경합 등을 개선했으나, 백업 중복 PK와 상태/감사 분리 커밋은 이번 전체 진단에서 새로 드러난 별도 경로다. 앱 코드는 변경하지 않았다.''')
text=[]
for q in req:
 text.append('## '+q['id']+' '+q['title']+'\n\n'+ '\n\n'.join(f'**{label}**: '+(str(q[k]) if not isinstance(q[k],list) else ', '.join(q[k])) for k,label in [('kind','구분'),('purpose','목적'),('owner','담당·이해관계자'),('input','입력·전제'),('flow','업무 절차'),('output','출력'),('stores','저장소'),('rules','규칙 참조'),('normal','정상'),('exception','예외'),('status','구현 상태'),('validation','검증 기준')])+f"\n\n코드: {ev(q['evidence'])}\n\n테스트: {q['test']}\n\n문제/우선순위: "+', '.join(i['id']+' '+i['priority'] for i in issues if i['requirement']==q['id']))
write('01-requirements','요구사항 정의서','\n\n'.join(text))
flows={
'HR-01':('EmployeeRegistrationModal → HrService.registerEmployee → repository.registerEmployee → company/org/employeeNumber reads → add 4 records → tx complete','필수값 실패는 쓰기 전 오류. 저장 요청 실패는 tx.abort. Person과 Employment ID는 각각 생성하고 employment.personId로 연결.'),
'ATS-02':('PayrollService.convertCandidate → repository.convertCandidate → PASS/ACCEPTED/조직 회사 확인 → Person/Employment/Assignment/Compensation.add → company.recruiting 링크 갱신 → tx complete','수락 없는 오퍼/기존 전환/중복 사번/다른 회사 조직을 거부한다. 기존 Person 재사용은 하지 않는다.'),
'HR-03':('HrService.createPersonnelAction → 사유/값 검사 → repository 예약 등록 → applyDueEvents → applyEvent(tx) → 원천 재검증 → 적용 또는 reviewReason','업무상 같은 날 두 건도 자동 통합하지 않는다. 기존 이력 종료일과 신규 시작일을 한 tx로 저장한다. 충돌 보류는 기존 원천을 수정하지 않는다.'),
'WFM-01':('PayrollService.saveAttendanceBatch → 근무기간/시간 검사 → 월·일 레코드 구성 → tx 내 최신 revision/updatedAt/마감 재검증 → 원천 저장 + Run DRAFT + Result 삭제','확정/마감 거부와 stale 탭 거부는 다르다. 후자는 새로 조회 후 편집해야 하며, 숫자 오류를 0으로 치환하지 않는다.'),
'WFM-02':('closeAttendance → 월 자료/급여 대상 누락 검사 → confirmRecords(attendance) → company.attendanceClosed 기록','전체 업무는 복수 단계다. 하나의 DB 트랜잭션과 같은 의미로 표현하지 않는다.'),
'PAY-01':('createPayrollRun → 월 중 재직 대상 조회 → 조직·보상·공제 정보로 Entry 생성 → Run/Entry 저장','사람 ID가 아닌 employmentId로 급여 대상이 연결된다. 동일 person의 복수 employment를 합치는 정책은 별도다.'),
'PAY-02':('PayrollService.syncAttendance → 월 합계·일별 휴일초과·항목 정보 조회 → entry.calculationInputs/itemAmounts 산출 → saveEntry','시간 원천을 급여 입력으로 변환한다. 입력 수당과 최종 계산 결과는 구분하며 재계산이 필요하다.'),
'PAY-03':('calculatePayrollRun → Run 잠금 검사 → entries/설정/근태/휴직 조회 → calculatePayrollEntry → results/entries/run 스냅샷 tx 저장','설정 화면 산식/수기 모드와 저장된 itemSnapshot을 확인한다. 근태 원천 전체가 자동 동기화되는 것으로 가정하지 않는다.'),
'PAY-04':('validatePayrollRun → calculatePayrollRun 재실행 → 오류/경고 집계 → VALIDATED 또는 CALCULATED → setPayrollRunStatus(CONFIRMED)','검증은 단순 조회가 아니라 계산 및 저장을 수행한다. 별도 검토자의 서버 서명 기능은 없다.'),
'PAY-05':('setPayrollRunStatus → 선행상태/stale/근태마감 조건 → payrollRuns.put → auditLogs.put','은행 송금은 없다. 상태와 감사로그는 현재 별도 put이므로 ISS-A02의 실패 경로가 있다.'),
'PAY-06':('원천 수정 → saveAttendanceBatch 또는 saveLeaveCase → 미확정 영향 검토/무효화 → syncAttendance → calculate → validate','마감된 결과를 직접 재작성하는 정상 경로는 없다. 차액 정정 프로세스는 ISS-C02.'),
'PAY-07':('calculateRetirementSettlement → 퇴사일/확정 여부 → 임금 및 Run/Entry/Result 조회 → calculateRetirement → 원장 저장','확정 재계산 거부. DB/DC 및 수기 입력은 검토 근거와 함께 관리해야 한다.'),
'PAY-08':('listYearEndTaxCases → 비DRAFT Run 결과 집계 + 수기 원장 우선 → saveYearEndBatch → 정산차액 → confirmRecords','자료 조회가 전 공제 세액 자동계산과 같지 않다. null 최종세액은 확정할 수 없다.'),
'FILE-01':('initialWithholding → calculateWithholding → validateWithholding → withholdingHtml / saveWithholdingDraft','신고 제외액·정산분·지급월 검토 표시가 필요하다. HTML 출력과 PDF 프린트 결과의 기관 수리는 별도 확인.'),
'FILE-02':('filingWorksheet.fieldsFor/blankFilingRow/importFilingRows → FilingDraft 작성 → saveOperation → 파일 출력','공단별 모든 서식의 접수 검증을 완료했다고 단정하지 않는다. 직원 ID 유효성 및 숫자/날짜 규칙과 기관 요구는 별개다.')}
write('02-processes','업무 프로세스 및 예외처리 정의서','\n\n'.join(f"## {k} {next(q['title'] for q in req if q['id']==k)}\n\nHR 관점: {next(q['flow'] for q in req if q['id']==k)}\n\n프로그램 관점: {v[0]}\n\n예외·책임: {v[1]}\n\n기준 규칙: {' / '.join(next(q['rules'] for q in req if q['id']==k))}" for k,v in flows.items()))
maptypes={'company':'Company','organizations':'Organization','persons':'Person','employments':'Employment','assignments':'Assignment','compensations':'CompensationSnapshot','personnelEvents':'PersonnelEvent','payrollRuns':'PayrollRun','payrollEntries':'PayrollEntry','payrollResults':'PayrollResult','attendanceMonthlySummaries':'AttendanceMonthlySummary','attendanceDailyRecords':'AttendanceDailyRecord','dailyWorkers':'DailyWorker','dailyWorkRecords':'DailyWorkRecord','yearEndTaxCases':'YearEndTaxCase','retirementSettlements':'RetirementSettlement','calendarEvents':'CalendarEvent','issues':'IssueCase','policyDocuments':'PolicyDocument','filingDrafts':'FilingDraft','auditLogs':'AuditLog'}
seedfields={f['field']:f['type'].removesuffix('[]') for f in fields if f['entity']=='SeedBundle'}
storemap=[]
for st in stores['stores']:
 n=st['name'];typ=maptypes.get(n,seedfields.get(n,'config/meta 또는 operations 선언 참조'));storemap.append(dict(store=n,type=typ,pk='id',indexes=st.get('indexes',[]),requirements=[q['id'] for q in req if n in q['stores']]))
(S/'store-type-map.json').write_text(json.dumps(storemap,ensure_ascii=False,indent=2))
write('03-data-dictionary','ERD 연계 필드 정의서',f'''기준은 D03 ERD와 sources/data-dictionary.csv(인터페이스 선언 {len(fields)}개 필드), physical-stores.json({len(stores['stores'])}개 물리 저장소), store-type-map.json이다. 모든 저장소는 keyPath=id. byPersonId/byEmploymentId는 참조 조회용 인덱스이며 FK 검증 장치가 아니다. unique:true만 중복 키를 DB가 거부한다.

선택성은 TypeScript의 ? 및 null과 구분한다. id 참조가 타입상 필수라도 대상 존재 여부를 IndexedDB가 보장하지 않는다. DTO/View/일시 계산 객체의 필드는 물리 저장소로 오인하지 않는다. CSV의 분류는 필드명 기반 검토 표식이며 개인정보 자동 판별의 완결된 결과가 아니다.

핵심 의미: personId는 사람, employmentId는 고용관계, runId는 월 급여 묶음이다. period는 YYYY-MM 귀속월, payDate는 지급일이며 같은 개념이 아니다. effectiveFrom/effectiveTo는 유효기간(끝 포함/null 열린 이력), revision/updatedAt은 근태 경합 검사, confirmedAt/confirmedBy는 개별 원장 잠금 표시다. company.attendanceClosed는 월 단위 마감 맵이다.

PayrollEntry의 monthlyBasePay·수당·보험기초·calculationInputs는 계산 입력, PayrollResult의 grossPay·공제·netPay는 결과다. itemSnapshot은 Run 계산 당시 항목 설정, hireDateSnapshot/terminationDateSnapshot 등은 원천의 시점 값이다. 원본과 스냅샷을 양방향 자동 동기화하지 않는다. monetary number 필드는 원 단위 계산 규칙을 각 함수에서 확인해야 하며 JavaScript number라는 사실만으로 정수 원 단위가 강제되지는 않는다.

PersonnelEvent.reviewReason은 상태 enum이 아니라 자동 적용 보류 사유다. sourceAssignmentSnapshot은 신규 예약 기준 이력이며 과거 데이터에는 없을 수 있다. absence/leave 속성의 유급·무급 의미는 timeRules/leaveCases 규칙과 함께 해석한다.

'''+ '\n\n'.join('## '+m['store']+' → '+m['type']+'\n\nPK id. 요구사항: '+', '.join(m['requirements'])+'\n\n인덱스: '+('; '.join(i['name']+'='+str(i['keyPath'])+(' [UNIQUE]' if i.get('unique') else ' [non-unique]') for i in m['indexes']) or '없음') for m in storemap))
write('04-business-rules','상태 전이 및 업무 규칙 정의서','\n\n'.join(f"## {r['id']} {r['title']}\n\n{r['text']}\n\n근거: {ev(r['evidence'])}" for r in rules)+'''\n\n## 상태 읽기 보충
급여 DRAFT→CALCULATED→VALIDATED→CONFIRMED→CLOSED→PAID는 BR-07/08 참조. 계산 오류 시 CALCULATED, 미확정 원천 정정 시 DRAFT 및 stale이 된다. 확정·마감 단계의 역전 화살표를 그리지 않는다.

근태는 단일 상태 enum 대신 confirmedAt과 company.attendanceClosed가 결합된다. 미확정→개별확정→월마감의 업무 상태를 그림에서 사용할 때 실제 저장 필드를 함께 표기한다.

인사발령 SCHEDULED→APPLIED. SCHEDULED+reviewReason은 보류 상태의 논리적 표현이며 새 enum이 아니다. 기존 pending 원천이 바뀌면 자동 적용 대신 수동 검토한다. 취소/재승인은 미래 정책이다.''')
concepts=[
('Interface / Type','컴파일 시 데이터 계약','TypeScript가 작성 중 누락·잘못된 값 종류를 점검한다. 런타임에 스스로 실행되거나 DB 테이블을 만들지 않는다. Employment.companyId 누락은 satisfies Employment로 구성 시 점검하도록 개선했다. 외부 JSON은 타입 선언만으로 검증되지 않는다.','src/domain/types.ts','등록 객체와 백업 JSON의 런타임 검증 차이를 확인한다.'),
('Object','실행 중 만들어지는 값','registerEmployee는 person 객체와 employment 객체를 별도 ID로 생성한다. 객체는 참조 필드로 연결되고 store.add로 저장될 때 영속 데이터가 된다. 스프레드 복사는 같은 사람의 정당한 신원 확인을 대신하지 않는다.','src/infrastructure/db/indexedDb.ts','객체 생성·부분실패 후 원자적 취소를 확인한다.'),
('Validation','입력 및 업무 선행조건 검사','폼 required, 서비스 숫자 검사, 저장소 상태·참조 검사는 책임이 다르다. 모든 기능이 하나의 Validator 클래스를 거치는 구조가 아니다. validatePayrollRun은 다시 계산하는 업무 명령이다.','src/modules/payroll/payrollService.ts','잘못된 숫자, stale, locked를 서로 다른 테스트로 확인한다.'),
('Service','UI의 업무 호출 창구','HrService는 많은 요청을 위임하고 일부 필드를 검사한다. PayrollService.syncAttendance는 원천 시간을 금액 입력으로 변환한다. 모든 서비스가 순수 전달 계층은 아니며 repo에도 업무 정책이 있다.','src/modules/payroll/payrollService.ts','호출 하나가 읽기인지 쓰기인지 구분한다.'),
('Repository','저장·트랜잭션과 업무 조정','IndexedDbHrRepository는 인사/ATS/급여/운영 저장을 폭넓게 수행한다. 공통 데이터에 걸친 tx를 쉽게 구성하지만 책임 집중은 테스트/변경 비용을 만든다. 저장소별 분리보다 원자적 업무 단위가 우선이다.','src/infrastructure/db/indexedDb.ts','실패 주입 시 저장과 로그의 원자성을 확인한다.'),
('IndexedDB / PK / logical FK','브라우저 로컬 비동기 저장소','PK id 및 unique 인덱스는 저장소가 강제한다. personId가 존재하는 Person을 가리키는지는 앱이 검사해야 한다. 트랜잭션은 포함한 저장소 범위에서만 원자적이다. 별개 put 두 번은 한 업무의 원자성 보장이 아니다.','src/infrastructure/db/config.ts','중복 키와 고아 참조는 다른 검증 항목이다.'),
('Snapshot / Migration','시점 값과 구조 변환','스냅샷은 과거 계산 재현의 입력이다. 현재 master 변경이 과거 snapshot을 자동 바꾸면 안 된다. 마이그레이션은 버전간 읽기·쓰기 계약의 변환이며 사용자 편집값을 더미 기본값으로 덮지 않아야 한다.','src/infrastructure/db/migrations.ts','백업 왕복, 버전 업그레이드, 오래된 입력 보존을 각각 시험한다.')]
(S/'concepts.json').write_text(json.dumps(concepts,ensure_ascii=False,indent=2))
write('05-architecture','시스템 아키텍처 및 모듈 책임 정의서','\n\n'.join(f'## {a}\n\n정의·목적: {b}\n\nHRIS 역할·연결: {c}\n\n구현: {d}\n\n검증 관점: {e}' for a,b,c,d,e in concepts)+'''\n\n## 구성과 범위
React UI→HrService/PayrollService→IndexedDbHrRepository→IndexedDB가 주요 호출 경로다. 순수 계산 helpers가 서비스와 저장소 양쪽에서 사용된다. ATS 상태는 company.recruiting 내부 객체이며 별도 candidates object store를 발명하지 않는다. 운영(일정·공지·취업규칙·이슈)에는 별도 stores와 company 설정이 혼재한다. 평가·보상 전체 ERP 기능을 구현 완료로 보지 않는다. UI의 확장 메뉴 표식과 실제 구현을 구분한다.

서버 실행 컴포넌트·인증 API·급여 송금 API는 현행 도식에 없다. GitHub Actions는 배포 시 build이고 업무 트랜잭션 서버가 아니다. TO-BE 서버/MCP는 ISS-D03에서만 제안한다.''')
write('06-code-mapping','요구사항·코드 구조 대응표','\n\n'.join(f"## {q['id']} {q['title']}\n\n실행 심볼: {ev(q['evidence'])}\n\n관련 타입/필드: store-type-map.json에서 {', '.join(q['stores'])}를 따라 data-dictionary.csv의 entity/field로 이동한다.\n\n규칙: {', '.join(q['rules'])}\n\n테스트: {q['test']}\n\n판정: {q['status']}" for q in req))
write('07-test-traceability','테스트 명세서 및 요구사항 추적표','''추적 키는 requirement ID→BR ID→코드 symbol/path/line→테스트 파일→실행 증거다. 파일 존재만 확인한 것과 테스트 통과는 구별한다. 원본 traceability.json과 pr7-integration-results.json을 함께 사용한다.

기존 최종 검증 재사용: 24개 repository/service 통합 시나리오, 11개 예약·근태 회귀, 실제 Chrome 8+1개 시나리오. npm run build는 prebuild verify:release를 포함한다. 이번 문서 작업은 이 전체 테스트를 불필요하게 다시 실행하지 않았다. 병합 후 Actions run 44210067857은 동일 build를 실행해 성공했다.

Chrome의 직원등록은 폼 UI, 이후 업무 흐름은 브라우저 안의 실제 service 호출이다. 모든 버튼을 누른 UI E2E로 기술하지 않는다. 업그레이드 fixture는 기존 회사 이메일 설정 마이그레이션 완료 상태였다. 실제 사용자 브라우저 DB를 검사하거나 초기화하지 않았다.

추가 진단 2건은 tools/diagnostic-probes.ts와 evidence/diagnostic-probes.json에 입력·예상·실제를 남겼다. 두 결과는 기능 통과가 아니라 결함 재현이다. 중복 Person PK의 뒤 행 값 보존/앞 행 유실, 감사 쓰기 오류 후 Run CONFIRMED 잔존을 확인했다.

새 수용조건은 각 ISS의 validation을 사용한다. 실제 신고기관 업로드, 전체 편집 조합, 저장공간 소진, 브라우저 강제 종료는 미검증이다. 미래 AI 성공률은 아직 측정하지 않았다.''')
write('08-data-integrity','데이터 무결성·마이그레이션·백업·복구 명세서','''BR-02/03/04/05/11이 기준이다. schemaVersion은 JSON 형식, DB_VERSION은 IndexedDB 구조, SEED_VERSION은 더미자료 갱신 기준이다. 셋 모두 같은 숫자일 필요가 없다. 현재 DB/schema 7, seed 6.

업그레이드 흐름: openSharedDatabase → onupgradeneeded/upgradeDatabaseStructure → 기존 데이터 runDataMigrations/runSeedMigrations → 회사 소속 보완 → 운영 초기화 → 예약 적용. 새로고침 시 업무 상태가 변할 수 있으므로 초기화를 단순 read-only라고 부르지 않는다. 기존 v0.3.2 별도 DB는 canonical DB가 비었을 때만 복구를 시도한다.

백업 흐름: exportDatabase → bundle → schemaVersion/exportedAt/data. 복원은 입력 버전을 검사하고 변환 후 seed의 clear/put을 한 tx로 수행한다. 예외는 abort한다. 그러나 중복 PK는 put 자체가 오류가 아니므로 사전 검사 없이는 조용히 덮어쓴다(ISS-A01). 여러 회사의 회사 객체 전체를 보존하는 계약은 없다(ISS-B03).

운영 제안(아직 기능 아님): 원본 백업을 별도 파일로 보관 → schema/PK/논리참조/업무키 검증 → 격리 DB에 사전 복원 → 개수/ID/금액/상태/해시 대조 → 사용자가 전환 승인 → 오류 시 기존 백업 복원. 복원 자체가 실패 가능한 작업이므로 rollback 스냅샷 및 오류 보고가 필요하다.

삭제/병합/ID 재발급은 이번 작업에서 수행하지 않는다. 저장소별 정합성: 사람 존재, 고용 존재, Run 존재, Entry/Result composite key 대응, 유효기간 비중첩, 확정 스냅샷 불변성을 각각 확인한다. inspectIntegrity는 finding 생성이며 모든 쓰기에 FK처럼 자동 적용되는 제약이 아니다.

데이터 소유권: GitHub Pages 버전 교체는 브라우저 DB를 중앙 서버로 옮기지 않는다. 동일 origin/profile에서는 저장이 이어지지만 사이트 데이터 삭제·다른 프로필·다른 origin에는 별도 DB다. 백업 없는 브라우저 삭제 복구를 약속하지 않는다.''')
write('09-security','권한 및 보안 통제 정의서','''BR-16과 ISS-B02/D02가 기준이다. 실제 actor는 로컬 브라우저 이용자다. HR/관리자/검토자 표시 및 ATS 역할 선택은 업무 시뮬레이션이며 서버 권한 경계가 아니다. 자료 전달자는 사용자이고 외부 기관으로의 제출은 별도 행위다.

현행 통제: 가상 데이터, 일부 입력/업무상태 검증, 임의 소속 추정 제한, 잠금 상태 수정 거부, 로컬 감사로그. 비밀 설정 파일 gitignore 규칙은 저장소 포함을 줄이는 예방 장치이며 이미 추적된 비밀이나 브라우저 백업의 보호를 보장하지 않는다.

위협별 경계: 공유 브라우저 사용자는 IndexedDB를 열 수 있음; 다운로드 JSON은 복사 가능; 악성 외부 파일은 타입 선언만으로 검증되지 않음; 로컬 감사로그는 동일 사용자가 변경할 수 있어 변조불가 증거가 아님; 공개 소스/정적 배포에 실제 식별정보를 넣으면 안 됨.

운영용 전환 제안: 인증된 사용자/역할별 명령 권한, 회사 테넌트 경계, 최소 데이터 수집, 접근감사·보관·파기, 서버 검증/암호화 및 키관리, 파일 형식·크기·내용 검사, 복원 승인과 비밀 탐지 CI. 실제 보존기간·접근승인·처리 근거는 조직 정책과 법률 검토가 필요하며 임의 숫자를 지정하지 않는다.

AI 확장: 읽기/제안/수정/확정·지급 명령을 분리하고, 실데이터 접근 대신 격리 복제본·도구 허용목록·멱등키·행동 로그·실패 후 복구를 먼저 정의한다. 현재 앱이 이 권한 모델을 제공한다고 주장하지 않는다.''')
adr=[('ADR-01','현행 복원','Person/Employment 분리 유지','복수 고용과 시점 이력을 구별하기 위한 데이터 구조다. 원저자의 공식 결정 기록이 아니라 코드에서 복원한 설계 해석이다. 이름 자동병합은 피한다.','BR-01 / ISS-C01'),('ADR-02','현행 복원','계산 입력/결과 분리','PayrollEntry의 시점 값과 PayrollResult를 구별해 검증·재현을 지원한다. 원천 변경 후 미확정 결과 무효화가 필요하다.','BR-05/06'),('ADR-03','현행 복원','브라우저 로컬 영속성','설치 없는 실습과 로컬 데이터를 제공한다. 중앙 권한/백업/다중사용자 동기화가 없다는 비용을 수용한다.','BR-16 / ISS-B02'),('ADR-04','현행 복원','충돌 시 보류','예약과 회사 소속을 임의 추론하지 않고 원본+검토 사유를 보존한다. 보류 재승인 UX는 추가 과제다.','BR-02/04'),('ADR-05','제안·미승인','복원 사전 검증','중복 PK/참조/업무키를 복원 전에 검증하는 명시적 계약. 자동중복제거보다 보존에 유리하다.','ISS-A01'),('ADR-06','제안·미승인','상태와 감사의 원자성','같은 tx로 전환 조건 재검증·Run·로그를 저장한다. 운영 서버화에서는 outbox/서명감사를 별도 검토한다.','ISS-A02/B01'),('ADR-07','제안·미승인','업무 단위 저장소 분해','테이블별 추출보다 업무 tx를 보존하는 명령 경계로 분리한다. 회귀 유지 비용을 먼저 측정한다.','ISS-D01'),('ADR-08','제안·미승인','AI 시뮬레이션은 격리부터','운영 권한을 주기 전에 시나리오 재현·행동로그·손상0 수용조건을 설계한다. 서버/MCP 도식은 TO-BE에만 둔다.','FUT-01 / ISS-D03')]
(S/'adr.json').write_text(json.dumps(adr,ensure_ascii=False,indent=2));write('10-adr','주요 설계 결정 기록','\n\n'.join(f'## {i} {t}\n\n상태: {st}\n\n결정·대안·영향: {body}\n\n관련: {refs}' for i,st,t,body,refs in adr))
write('11-diagnosis','시스템 진단·개선 과제 목록','총 12건: A 확인 결함 2, B 잠재 위험 4, C 정책 미정 3, D 확장 제안 3. 실제 결함 A의 재현은 격리 fake-indexeddb, 사용자 DB에 대한 손상을 일으키지 않았다.\n\n'+'\n\n'.join(f"## {i['id']} {i['title']}\n\n분류/우선순위: {i['category']} / {i['priority']}\n\nAS-IS/원인: {i['cause']}\n\n증거: {i['evidence']} / {ev(i['code'])}\n\n업무·데이터 영향: {i['impact']}\n\nTO-BE 제안: {i['proposal']}\n\n대안·비용: {i['tradeoff']}\n\n수용조건: {i['validation']}\n\n상태: {i['status']}" for i in issues))
diagrams=[('D01-class','클래스·인터페이스','타입 계약과 구현·의존성을 분리한다. 직사각형 구획은 속성/연산, 점선 빈 삼각형은 interface realization, 점선 의존 화살표는 사용이다. TypeScript interface는 런타임 참여자가 아니다.','HR-01 PAY-03','HrService→HrRepository 계약, IndexedDbHrRepository 구현. 등록 시 객체가 만들어지는 사례로 읽는다.'),('D02-components','컴포넌트','UI, 서비스, 규칙, 저장 책임의 연결을 읽는다. component 표식과 의존 화살표이며 실제 HTTP 서버 호출은 없다. 업무별 책임은 05 문서 참조.','HR-01 PAY-03 OPS-01','Core HR와 Payroll이 같은 repository를 공유하므로 변경이 서로 영향을 줄 수 있다.'),('D03-erd','논리 ERD','PK id, logical FK, UQ 복합키를 구분한다. 관계선의 1/0..*는 의도된 카디널리티이며 물리 FK 강제를 뜻하지 않는다. 핵심 원장 부분집합이고 모든 보조 store는 사전 참조.','HR-01 PAY-01 DAILY-01','Person 1→Employment 여러 건이 가능하지만 재입사 UI의 Person 재사용은 미구현. Entry→Result는 복합키 대응이지 별도 entryId FK가 아니다.'),('D04-usecases','유스케이스','«actor» 사각형은 UML actor의 분류자 표현, 타원은 사용자 목표, 경계는 로컬 앱이다. 선은 참여 관계이며 실행 순서를 나타내지 않는다.','ATS-01 NFR-01','평가자 역할이 표시돼도 별도 서버 보안 권한이라고 읽지 않는다.'),('D05-activity','액티비티','검은 시작점, 종료 이중원, 작업 사각형, 결정 마름모, 조건 라벨 화살표로 작업 순서를 읽는다. 오류 재작업 루프와 근태 선행 마감을 명시한다.','PAY-02 PAY-04 PAY-05','오류가 남으면 검증 통과하지 못해 입력으로 돌아간다. 반려 승인 서버가 아닌 로컬 업무 판단이다.'),('D06-sequence','시퀀스','상단 참여자·세로 생명선·가로 메시지를 시간 순으로 읽는다. 점선은 반환, alt frame은 유효/오류 분기다. 타입 정의를 참여자로 넣지 않는다.','HR-01','여러 add 요청 후 tx 완료를 기다리는 것이 포인트다. 한 add 성공만으로 전체 등록 성공이 아니다.'),('D07-states','상태 머신','라운드 상태 박스와 전이/조건 라벨을 읽는다. 점선 자기루프는 상태를 바꾸지 않는 거부 시도를 보충 표시한 것으로 허용 전환이 아니다.','PAY-04 PAY-05 PAY-06','근태/발령의 상태는 04 문서의 저장 필드 설명을 함께 본다. CONFIRMED 이후 임의 역전 화살표는 없다.'),('D08-dfd','데이터 흐름도','외부 사용자/파일 사각형, 처리 원, 원통형 저장소로 데이터가 어디서 만들어져 어디에 남는지 읽는다. DFD의 표현 관례를 사용하며 UML과 다르다.','WFM-01 PAY-01 FILE-01','근태는 시간 원천, Entry는 변환 입력, Result는 계산 출력이다. 전달선이 자동 실행 트리거를 보장하지는 않는다.'),('D09-bpmn','BPMN 책임 분담 도식','시작/종료 이벤트, 라운드 task, XOR gateway, lane, 데이터 저장소를 사용한 BPMN 부분집합 시각화다. DOT/SVG 편집원본이며 실행 가능한 BPMN 엔진 정의가 아니다.','PAY-04 PAY-05','하나의 업무 프로세스에서 HR 운영자 판단과 브라우저 처리를 분리한다. 같은 사용자에게 별도 승인 권한을 만들어내지 않는다.'),('D10-deployment','배포','«artifact» 저장소, 실행환경, 배포 node와 사용자 장치 경계를 읽는다. HTTPS는 코드 전달, IndexedDB 선은 장치 안의 읽기/쓰기다.','SYS-01 NFR-01','Pages 배포 성공이 중앙 DB 백업 성공을 의미하지 않는다. 사이트 데이터 삭제 위험은 로컬 경계 안에 있다.')]
(S/'diagram-guide.json').write_text(json.dumps(diagrams,ensure_ascii=False,indent=2));write('12-diagrams','다이어그램 목적·표기·검증 안내','\n\n'.join(f'## {i} {title}\n\n목적·기호: {meaning}\n\n읽기/사례/한계: {example}\n\n관련 요구사항: {ids}\n\n편집 원본: ../diagrams/{i}.dot 또는 .puml/.svg. 코드 연결은 해당 요구사항의 code anchor 참조.' for i,title,meaning,ids,example in diagrams))
print('13 source documents generated; shared rules referenced by ID')
