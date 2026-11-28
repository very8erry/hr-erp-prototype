from pathlib import Path
import json,hashlib
root=Path(__file__).resolve().parent.parent
paths=['src/fixtures/workRulesAttachments.json','src/fixtures/staffNotices.json','src/modules/core-hr/registrationPolicy.ts','src/fixtures/scenarios.ts','src/fixtures/seed.ts','src/infrastructure/db/operationsUpgrade.ts','src/modules/payroll/payrollRules.ts','src/modules/payroll/policyRegistry.ts','src/modules/payroll/payrollParameters.ts','src/modules/attendance/workContract.ts','src/modules/attendance/attendanceBasis.ts']
rules=json.loads((root/paths[0]).read_text());notices=json.loads((root/paths[1]).read_text())
data={'version':'2026-11-28.1','scope':'공지 첨부를 기반으로 한 HR 실습 기준. 기존 문서는 검토안이며 법정 신고·승인 완료로 바꾸지 않음.','sources':[{'file':p,'sha256':hashlib.sha256((root/p).read_bytes()).hexdigest()} for p in paths],
'workflow':['공지·취업규칙 확인','인사등록 및 계약 근로시간 검토','일별 근태와 휴가·단축 사유 기록','근태 합산 및 급여 수당 반영','검증·확정·마감·지급'],
'workRules':[t for t in rules['paragraphs'] if any(k in t for k in ['1일 8시간','1주 40시간','임금지급일','서면명시사항','연장·야간·휴일근로','제29조','태아검진','육아기 근로시간'])],
'registration':{'required':['사번','성명·생년월일','회사·조직','입사일','직급·직무','연봉','근로계약 시간·휴게','급여계좌(입력 시 은행과 함께)'],'standard':{'dailyHours':8,'weeklyHours':40,'startTime':'09:00','endTime':'18:00','breakMinutes':60,'ordinaryMonthlyHours':209},'209Meaning':'주 40시간+유급주휴 8시간을 월 평균 환산한 급여 기준. 실제 월 출근시간 209시간을 강제하지 않음.','exceptions':'임신·육아 단축, 휴직, 유급/무급병가, 연차, 공가·훈련, 입퇴사 구간. 동일 이슈 대상자의 사유·증빙을 보존.','warning':'항목별 입력값/공지 기준을 비교. 재검토 후 예외 근거 저장. 적용 중인 문서의 구조화 운영기준과 충돌하면 재검토.'},
'noticeIndex':[{'id':n['id'],'title':n['title'],'contents':n['contents']} for n in notices],
'scenarios':{'pregnancy':'2026-01-01~02-16, 07-07~07-18: 실근로 6h+유급인정 2h','maternity':'07-19~10-16: 실근로 0h, 기존 출산휴가/고용보험 구분 유지','childcare':'10-17~12-31: 실근로 6h, 주30h 단축계약, 기본급 75%, 고정수당 유지','other':'병가·결근·연차·훈련·가족돌봄 등 기존 지정 대상/일자/증빙 유지. 일반 직원은 계약상 정상근무. 기존 지정 이슈에 한해 연장·야간·휴일근로 보존.'},
'preservation':'수기·가져오기·확정·마감·지급완료 원본은 자동 교체하지 않음. 과거 지급완료 자료는 기존 스냅샷 보존; 신규 생성 이력에 수정 기준 적용. 자동 수정 근태에 연결된 미확정 계산 결과는 재계산 필요 상태로 변경.',
'references':['https://moel.go.kr/news/cardinfo/view.do?bbs_seq=20240700152']}
(root/'public/hris-policy-reference.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
