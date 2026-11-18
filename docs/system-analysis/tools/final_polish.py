from pathlib import Path
import re,json,csv
B=Path(__file__).resolve().parents[1]
# Correct future traceability: no existing method/test implements FUT-01.
for file,key in [('requirements.json','id'),('traceability.json','requirement')]:
 p=B/'sources'/file;a=json.loads(p.read_text())
 for r in a:
  if r.get(key)=='FUT-01':
   r['code']=None;r['test']=None;r['verification']='미구현·미실행. ISS-D03 수용조건은 향후 설계안.'
 p.write_text(json.dumps(a,ensure_ascii=False,indent=2))
p=B/'documents/01-requirements.md';s=p.read_text();s=re.sub(r'문제/우선순위: *\n', '문제/우선순위: 별도 신규 과제 없음\n',s);a,b=s.split('## FUT-01',1);b=re.sub(r'코드: .*?\n\n','코드: 현행 구현 없음. ISS-D03의 제안.\n\n',b);b=re.sub(r'테스트: .*?\n\n','테스트: 미실행. 향후 격리 시나리오 수용조건을 설계한다.\n\n',b);b=re.sub(r'검증 기준: .*?\n\n','검증 기준: ISS-D03 제안 수용조건. 현재 통과 주장 없음.\n\n',b);p.write_text(a+'## FUT-01'+b)
p=B/'documents/06-code-mapping.md';s=p.read_text();a,b=s.split('## FUT-01',1);b=re.sub(r'실행 심볼: .*?\n\n','실행 심볼: 없음. 향후 설계 대상.\n\n',b);b=re.sub(r'관련 타입/필드: .*?\n\n','관련 타입/필드: 현행 필드 대응 없음. 정책·도구 계약부터 설계한다.\n\n',b);b=re.sub(r'테스트: .*?\n\n','테스트: 없음. 미래 수용조건 제안.\n\n',b);p.write_text(a+'## FUT-01'+b)
p=B/'documents/12-diagrams.md';s=p.read_text();s=re.sub(r'편집 원본: ../diagrams/(\S+)\.dot 또는 .puml/.svg. 코드 연결은 해당 요구사항의 code anchor 참조.',r'편집 원본: diagrams/\1.svg. 코드 연결: 06 대응표.',s);p.write_text(s)
p=B/'documents/05-architecture.md';s=p.read_text().replace('BR-15의 실행 검증 경계','BR-11의 실행 검증 경계');p.write_text(s)
p=B/'tools/build_pdfs.py';s=p.read_text().replace("('h1',23,32,18,True)","('h1',21,29,18,True)");s=s.replace("elif p.startswith('## '):story.append(Paragraph(markup(p[3:]),styles['h2']))","elif p.startswith('## '):\n   title,*rest=p[3:].split('\\n',1);story.append(Paragraph(markup(title),styles['h2']))\n   if rest:story.append(Paragraph(markup(rest[0]),styles['body']))")
p.write_text(s)
p=B/'tools/compact_diagrams.py';s=p.read_text().replace("['attendanceMonthly','PK id / employmentId'","['attendanceMonthlySummaries','PK id / employmentId'");p.write_text(s)
# CSV human readable future row matches JSON.
p=B/'sources/requirements.csv';rows=list(csv.DictReader(p.open(encoding='utf-8-sig')))
for row in rows:
 if row.get('id')=='FUT-01':
  for k in row:
   if k in ('code','test'):row[k]='미구현 / 없음'
with p.open('w',encoding='utf-8-sig',newline='') as f:
 w=csv.DictWriter(f,fieldnames=rows[0].keys());w.writeheader();w.writerows(rows)
