from pathlib import Path
import json,csv,shutil
B=Path(__file__).resolve().parents[1]
for n in ['pr7-integration-results.json','pr7-native-results.json','pr7-upgrade-results.json','pr7-final-gate.md','pr7-review.md','pr7-final-build.log']:
 dest=B/'evidence/pr7';dest.mkdir(exist_ok=True);shutil.copy2(Path('docs/verification')/n,dest/n)
p=B/'sources/requirements.json';rows=json.loads(p.read_text())
for r in rows:
 if r['id']=='FUT-01':r.update(evidence=None,test=None,stores=[],validation='미실행. ISS-D03의 미래 수용조건 제안.',normal='향후 격리 시나리오의 상태·로그·결과 일치를 수용조건으로 제안한다.',exception='향후 허용되지 않은 작업 거부와 데이터 복구를 수용조건으로 제안한다.')
p.write_text(json.dumps(rows,ensure_ascii=False,indent=2))
with (B/'sources/requirements.csv').open('w',encoding='utf-8-sig',newline='') as f:
 w=csv.DictWriter(f,fieldnames=list(dict.fromkeys(k for r in rows for k in r)));w.writeheader();w.writerows({k:json.dumps(v,ensure_ascii=False) if isinstance(v,(list,dict)) else v for k,v in r.items()} for r in rows)
fields=json.loads((B/'sources/fields.json').read_text())
core=[
('Person','id','사람 식별자','문자열 ID','PK','HR-01','BR-01'),('Person','fullName','성명; 동일인 자동 판정 키로 사용하지 않음','문자열','개인정보','HR-01','BR-01'),('Person','syntheticIdentifier','실습용 가상 식별번호','문자열','개인정보성 식별값','HR-01','BR-16'),
('Employment','personId','이 고용의 사람','Person.id','논리 FK, DB 강제 아님','HR-01','BR-01'),('Employment','companyId','이 고용의 회사','Company.id','논리 FK; 누락 보완은 근거 제한','HR-01','BR-02'),('Employment','employeeNumber','사번; 사람 식별자와 다름','문자열','등록 시 앱 중복 검사','HR-01','BR-03'),('Employment','hireDate','입사일','YYYY-MM-DD','고용·급여 대상 기간','PAY-01','BR-06'),('Employment','terminationDate','퇴사일; 재직 중 null','YYYY-MM-DD 또는 null','종료 기간/정산','PAY-07','BR-12'),
('Assignment','organizationId','소속 조직','Organization.id','논리 FK, 회사 일치 검증','HR-03','BR-04'),('Assignment','effectiveFrom','조직 이력 시작일','YYYY-MM-DD','유효기간 시작','HR-03','BR-04'),('Assignment','effectiveTo','조직 이력 종료일','YYYY-MM-DD 또는 null','종료일 null은 열린 이력','HR-03','BR-04'),('CompensationSnapshot','annualSalary','연봉 기준액','원/년','보상 유효기간 별 입력','PAY-01','BR-06'),
('AttendanceMonthlySummary','period','귀속월','YYYY-MM','employmentId와 복합 unique','WFM-01','BR-05'),('AttendanceMonthlySummary','scheduledHours','소정 근로시간','시간','실근로와 구분','WFM-01','BR-05'),('AttendanceMonthlySummary','workedHours','실근로 집계','시간','월 근태 원천','PAY-02','BR-05'),('AttendanceMonthlySummary','revision','동시 편집 버전','정수','선택적; 저장 직전 비교','WFM-01','BR-05'),('AttendanceMonthlySummary','confirmedAt','개별 원장 확정 시각','ISO timestamp','회사 월 마감과 별개','WFM-02','BR-10'),
('PayrollRun','period','급여 귀속월','YYYY-MM','byPeriod unique','PAY-01','BR-06'),('PayrollRun','status','급여 업무 상태','PayrollRunStatus','BR-07~09 상태표','PAY-05','BR-08'),('PayrollRun','attendanceStale','근태 정정으로 재검토 필요','boolean','확정 전 선행검사','PAY-06','BR-05'),('PayrollRun','itemSnapshot','계산 시 항목 설정 사본','PayrollItemMaster[]','현재 설정과 시점 구분','PAY-03','BR-06'),
('PayrollEntry','runId','급여 실행 단위','PayrollRun.id','employmentId와 복합 unique','PAY-01','BR-06'),('PayrollEntry','employmentId','급여 대상 고용','Employment.id','Person.id를 대입하지 않음','PAY-01','BR-01'),('PayrollEntry','monthlyBasePay','계산에 공급하는 월 기본급','원/월','계산 입력; Result.basePay와 구분','PAY-03','BR-06'),('PayrollEntry','calculationInputs','통상시간·연장시간 등의 산식 변수','복합 객체; 내부 필드 타입 참조','근태 연동 입력','PAY-02','BR-06'),('PayrollEntry','incomeTaxManual','입력된 소득세','원','계산/검증 규칙과 대조','PAY-03','BR-06'),
('PayrollResult','grossPay','총 지급액 계산 결과','원','직접 원천입력과 구분','PAY-03','BR-06'),('PayrollResult','totalDeductions','공제 합계 계산 결과','원','지급액과 구분','PAY-03','BR-06'),('PayrollResult','netPay','실지급액 계산 결과','원','지급 완료는 송금 증빙 아님','PAY-05','BR-09'),('PayrollResult','errors','계산 검증 오류 목록','문자열 배열','오류가 있으면 검증 완료 불가','PAY-04','BR-07')]
out=[]
for entity,field,meaning,unit,relation,req,rule in core:
 a=next(x for x in fields if x['entity']==entity and x['field']==field)
 out.append({**a,'businessMeaning':meaning,'formatOrUnit':unit,'relationOrConstraint':relation,'requirement':req,'rule':rule,'default':'타입 선언에는 기본값 없음. 생성·수정 경로의 계산/대입을 확인.','runtimeValidation':'관련 BR 및 코드 대응표 참조; 선언 required와 런타임 검증은 별개.'})
(B/'sources/core-field-dictionary.json').write_text(json.dumps(out,ensure_ascii=False,indent=2))
with (B/'sources/core-field-dictionary.csv').open('w',encoding='utf-8-sig',newline='') as f:
 w=csv.DictWriter(f,fieldnames=out[0]);w.writeheader();w.writerows(out)
# Detailed prior integration records retained verbatim; do not recast them as new runs.
tests=json.loads((B/'evidence/pr7/pr7-integration-results.json').read_text())['records']
with (B/'sources/test-specifications.csv').open('w',encoding='utf-8-sig',newline='') as f:
 w=csv.DictWriter(f,fieldnames=['id','name','input','steps','expected','actualStatus','error','storeChanges','evidence']);w.writeheader()
 for i,r in enumerate(tests,1):w.writerow({'id':f'T-INT-{i:02}','name':r['name'],'input':json.dumps(r.get('input'),ensure_ascii=False),'steps':r.get('steps'),'expected':r.get('expected'),'actualStatus':r.get('status'),'error':r.get('error'),'storeChanges':json.dumps(r.get('storeChanges'),ensure_ascii=False),'evidence':'evidence/pr7/pr7-integration-results.json (prior execution)'})
