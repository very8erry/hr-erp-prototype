from pathlib import Path
import re,json,html
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4,landscape
from reportlab.platypus import BaseDocTemplate,PageTemplate,Frame,Paragraph,Spacer,PageBreak,Image,KeepTogether,Table,TableStyle,NextPageTemplate
from reportlab.platypus.tableofcontents import TableOfContents
from PIL import Image as PILImage
B=Path(__file__).resolve().parents[1];O=B/'output/pdf';O.mkdir(exist_ok=True,parents=True)
import os
FONT=os.environ.get('HRIS_PDF_FONT','/Library/Fonts/Arial Unicode.ttf');pdfmetrics.registerFont(TTFont('KR',FONT));pdfmetrics.registerFontFamily('KR',normal='KR',bold='KR',italic='KR',boldItalic='KR')
NAVY=colors.HexColor('#162F46');TEAL=colors.HexColor('#147C82');GRAY=colors.HexColor('#536679');LIGHT=colors.HexColor('#EEF3F6');SHA='b4aeb300270a62273d3d5f0c2fea87f2a09ba800'
styles={k:ParagraphStyle(k,fontName='KR',fontSize=size,leading=lead,textColor=NAVY,wordWrap='CJK',spaceAfter=after,keepWithNext=keep) for k,size,lead,after,keep in [('body',10.5,16.5,9,False),('h1',21,29,18,True),('h2',15,22,11,True),('h3',12,18,8,True),('small',8.5,13,7,False),('cover',32,44,18,False)]}
def markup(t):
 t=re.sub(r'\[([^\]]+)\]\(([^)]+)\)',lambda m:'@@LINK'+str(len(links))+'@@' if False else m.group(1)+' ('+m.group(2)+')',t)
 # Keep source labels readable; exact commit URLs reside in source and metadata.
 t=re.sub(r' \(https://github.com/[^)]+\)','',t)
 t=html.escape(t);t=re.sub(r'\*\*(.*?)\*\*',r'<b>\1</b>',t);t=t.replace('`','');return t
class Book(BaseDocTemplate):
 def afterFlowable(self,f):
  if isinstance(f,Paragraph) and f.style.name=='h1':self.notify('TOCEntry',(0,f.getPlainText(),self.page))
def footer(c,d):
 w,h=c._pagesize;c.setStrokeColor(colors.HexColor('#D9E2E9'));c.line(40,36,w-40,36);c.setFont('KR',8);c.setFillColor(GRAY);c.drawString(40,23,'HRIS 구조·업무·진단 | v1.0 | '+SHA[:12]);c.drawRightString(w-40,23,str(d.page))
book=Book(str(O/'HRIS_System_Architecture_Study.pdf'),pagesize=A4,rightMargin=43,leftMargin=43,topMargin=45,bottomMargin=48,title='HRIS System Architecture Study',author='HRIS Analysis',pageCompression=1)
book.addPageTemplates([PageTemplate(id='normal',frames=[Frame(43,48,A4[0]-86,A4[1]-93,id='body')],onPage=footer),PageTemplate(id='wide',pagesize=landscape(A4),frames=[Frame(43,48,A4[1]-86,A4[0]-93,id='widebody')],onPage=footer)])
story=[Spacer(1,90),Paragraph('HRIS 시스템 구조와<br/>업무·데이터 진단',styles['cover']),Paragraph('Payroll 중심 HR Training Simulator',styles['h2']),Spacer(1,22),Paragraph('상세 학습 및 시스템 진단용 · 문서 버전 1.0',styles['body']),Paragraph('2026-11-18 KST<br/>분석 기준 '+SHA,styles['body']),Spacer(1,28),Paragraph('타입은 실행 단계가 아니다. 원천정보는 계산 결과가 아니다.<br/>마감은 값의 변경 가능 범위를 통제하는 업무 규칙이다.',styles['h2']),Paragraph('독자를 위한 안내: 먼저 00 문서 체계와 05 개념·구조를 읽고, 관심 업무의 요구사항 ID를 통해 규칙·필드·코드·테스트로 이동한다. 현재 결함·잠재 위험·정책·미래 제안은 분리해 표시한다.',styles['body']),PageBreak(),Paragraph('목차',styles['h1'])]
toc=TableOfContents();toc.levelStyles=[ParagraphStyle('toc',fontName='KR',fontSize=10.5,leading=21,leftIndent=0,firstLineIndent=0,wordWrap='CJK')];story.extend([toc,PageBreak()])
for f in sorted((B/'documents').glob('*.md')):
 text=f.read_text();paras=text.split('\n\n')
 for k,p in enumerate(paras):
  if p.startswith('문서 버전') or p.startswith('작성 근거:') or p.startswith('관련 요구사항:'):continue
  if p.startswith('# '):story.append(Paragraph(markup(f.stem[:2]+' · '+p[2:]),styles['h1']))
  elif p.startswith('## '):
   title,*rest=p[3:].split('\n',1);story.append(Paragraph(markup(title),styles['h2']))
   if rest:story.append(Paragraph(markup(rest[0]),styles['body']))
  else:story.append(Paragraph(markup(p).replace('\n','<br/>'),styles['body']))
 story.append(PageBreak())
story.pop() # remove trailing document break before landscape transition
# All diagrams get an independent landscape page with explicit interpretation and evidence.
guides=json.loads((B/'sources/diagram-guide.json').read_text())
for name,title,meaning,ids,example in guides:
 names=['D03a-identity','D03b-payroll'] if name=='D03-erd' else [name]
 for n in names:
  portrait=n=='D04-usecases'
  story.extend([NextPageTemplate('normal' if portrait else 'wide'),PageBreak(),Paragraph(n+' · '+title,styles['h1'])])
  im=PILImage.open(B/'diagrams'/f'{n}.png');w,h=im.size;scale=min((500 if portrait else 755)/w,(520 if portrait else 310)/h)
  story.append(Image(str(B/'diagrams'/f'{n}.png'),width=w*scale,height=h*scale))
  story.append(Spacer(1,10));story.append(Paragraph(markup(meaning),styles['body']));story.append(Paragraph(markup('읽기·예외: '+example),styles['body']));story.append(Paragraph('요구사항 '+ids+' | 실제 코드 연결: 06 대응표 | 편집 원본: diagrams/'+n,styles['small']))
book.multiBuild(story)
# PM slides
W,H=960,540;c=canvas.Canvas(str(O/'HRIS_PM_Review.pdf'),pagesize=(W,H));c.setTitle('HRIS PM Review');c.setAuthor('HRIS Analysis');page=0
slideStyle=ParagraphStyle('slide',fontName='KR',fontSize=17,leading=25,textColor=NAVY,wordWrap='CJK')
def para(t,x,y,w=850,size=17,color=NAVY):
 st=ParagraphStyle('x',parent=slideStyle,fontSize=size,leading=size*1.5,textColor=color);p=Paragraph(markup(t).replace('\n','<br/>'),st);ww,hh=p.wrap(w,1000);p.drawOn(c,x,y-hh);return hh

def slide(title,sub=''):
 global page
 page+=1;c.setFillColor(colors.white);c.rect(0,0,W,H,fill=1,stroke=0);c.setFillColor(TEAL);c.rect(40,H-47,35,5,fill=1,stroke=0);para(title,40,H-65,880,27);para(sub,40,H-113,880,11,GRAY);c.setStrokeColor(colors.HexColor('#DBE4EB'));c.line(40,35,920,35);c.setFont('KR',9);c.setFillColor(GRAY);c.drawString(40,20,'v1.0 · 2026-11-18 · 기준 '+SHA[:12]);c.drawRightString(920,20,str(page))
def done():c.showPage()
def bullets(rows,x=55,y=380,w=850,size=18,gap=18):
 for label,body in rows:
  h=para(label,x,y,w,size,TEAL);y-=h+7;h=para(body,x,y,w,size-2);y-=h+gap
 return y
def diagram(n,x=60,y=80,w=840,h=315):
 im=PILImage.open(B/'diagrams'/f'{n}.png');iw,ih=im.size;s=min(w/iw,h/ih);c.drawImage(str(B/'diagrams'/f'{n}.png'),x+(w-iw*s)/2,y+(h-ih*s)/2,width=iw*s,height=ih*s,mask='auto')
slide('Payroll 중심 HRIS · 구조와 개선 의사결정','PM 사내 협의·발표용 | 현재 기능과 운영용 안전성은 구분');bullets([('목적','HR 업무 판단 → 데이터 연결 → 계산·검증 → 상태 통제를 설명한다.'),('기준 버전 확정','PR #7 squash 병합 및 Pages 자동 배포 성공. 이 커밋을 고정 분석한다.'),('이번 작업의 경계','앱 코드 추가 수정 없음. 설계 원본·진단·테스트 근거와 PDF 2종 제작.')]);done()
slide('먼저 결정할 세 가지','현재 결함 2건과 정책 미정은 별도 승인·개선 과제로 관리');bullets([('P1 · 복원 전 입력 검증','ISS-A01: 중복 PK 백업의 조용한 덮어쓰기 차단을 우선한다.'),('P1 · 급여 상태와 감사의 원자성','ISS-A02: 상태는 바뀌고 감사는 실패하는 경로를 하나의 트랜잭션으로 묶는다.'),('정책 · 재입사와 마감 후 정정','동일인 확인·사번 재사용·차액 정정 절차를 먼저 결정한다. 자동 병합은 제안하지 않는다.')]);done()
slide('근거와 검증 범위','E-CODE / E-TEST / E-DEPLOY / E-PROPOSAL을 혼동하지 않음');bullets([('기존 검증','24개 통합 + 11개 예약·근태 회귀 + 실제 Chrome 9개. 이전 실행 증거를 재사용했다.'),('이번 진단','인터페이스 필드 1,290개·코드 심볼 768개 추출. 격리 실패 주입으로 현재 결함 2건 확인.'),('한계','실제 사용자의 DB·정부 신고 수리·모든 UI 버튼 및 동시 편집 조합은 검증하지 않았다.')]);done()
slide('현행 아키텍처','D02 · 정적 사이트 안에서 서비스·저장·계산이 실행됨');diagram('D02-components');done()
slide('실제 데이터 연결의 중심은 employmentId','D03a · Person과 Employment를 분리해 읽어야 함');diagram('D03a-identity');done()
slide('급여 입력과 결과를 분리한다','D03b · PK/논리적 FK/복합 unique는 서로 다른 제약');diagram('D03b-payroll');done()
slide('급여 상태는 업무 통제다','BR-07~09 · CLOSED 전 근태 마감 필요, PAID는 송금 API가 아님');diagram('D07-states');done()
slide('업무 흐름과 코드 호출을 나눠 본다','HR 관점: 검토·판단 / 프로그램 관점: 읽기·계산·저장');bullets([('직원등록','UI → HrService → repository → company/org/사번 검사 → 4개 연결 객체 저장.'),('근태 정정','시간 원천 저장 → 미확정 Run stale/DRAFT → 결과 무효화 → 다시 연동·계산·검증.'),('잠금 이후','확정·마감·지급 결과를 직접 덮어쓰지 않는다. 정정 급여는 별도 정책이 필요하다.')]);done()
slide('요구사항 현황과 책임','24개 요구사항 · 16개 공통 규칙 · 13개 원본 문서');bullets([('구현 영역','Core HR, ATS 평가/전환, 근태·연차, Payroll, 일용직, 정산·신고 자료, 운영 일정/문서.'),('명시적 한계','로컬 역할 ≠ 서버 권한. 파일 생성 ≠ 신고 수리. PAID ≠ 은행 지급.'),('미래 영역','AI 업무 수행, 운영용 인증·권한·복구는 TO-BE. 기존 화면의 확장 표시를 완성 기능으로 소개하지 않는다.')]);done()
slide('AS-IS / TO-BE ① 백업 중복 PK','ISS-A01 · 격리 재현: 399개 입력 → 398개 저장');bullets([('AS-IS','clear → 배열 put → 같은 id의 마지막 값이 앞 레코드를 덮음. 오류 없이 완료된다.'),('TO-BE 제안','clear 이전에 PK·업무키·참조를 검사 → 오류 보고 → 원본 유지 → 검토 후 재시도.'),('수용조건','중복 PK/참조 오류 입력에서 전체 기존 데이터의 ID·금액·상태·해시가 그대로여야 한다.')]);done()
slide('AS-IS / TO-BE ② 급여 상태·감사','ISS-A02 · 감사 쓰기 실패 주입 후 CONFIRMED 잔존');bullets([('AS-IS','Run put 성공 → 별도 audit put 실패. 상태와 근거가 분리된다.'),('TO-BE 제안','같은 tx 안에서 최신 상태 재검증 + Run 전환 + audit 추가. 모두 저장 또는 모두 취소.'),('대안과 비용','단순 재시도는 경합/중복 로그를 해결하지 못한다. 서버 outbox는 향후 구조에서 검토한다.')]);done()
slide('진단 과제 12건의 분류','PR #7에서 이미 해결된 결함은 현재 미해결 목록에 다시 세지 않음');bullets([('A 2건 / B 4건','확인 결함: 복원 중복 PK·감사 원자성. 잠재 위험: 상태 경합·로컬 보안·다중 회사·일용 번호.'),('C 3건','재입사 동일인·마감 후 정정·보류 발령 재승인 정책.'),('D 3건','업무별 저장 책임 분리·PR CI 게이트·격리 AI 시뮬레이션.')]);done()
slide('우선순위와 협업 로드맵','기간·효과 수치는 산정하지 않았음. 아래는 제안 순서');bullets([('1 · 안정성 경계','개발 + QA: 복원 사전검증·감사 tx 및 경합 테스트. HR: 실패/정정 시 업무 처리 정의.'),('2 · 정책과 통제','HR + 관리자: 본인 확인·사번·마감 정정·보류 재승인. 보안 담당: 로컬 실제자료 사용 경계.'),('3 · 구조와 자동화','개발 + PM: 트랜잭션을 보존하는 모듈 분해, PR 게이트, 격리 AI 실행·로그 평가.')]);done()
slide('배포와 데이터 보존의 경계','D10 · Pages는 정적 코드 배포, 데이터는 사용자 브라우저에 남음');diagram('D10-deployment');done()
slide('완료 기준과 다음 승인','문서 PR은 별도 제출하며 자동 병합하지 않음');bullets([('실행 근거','PR #7 병합·Actions 성공·배포 화면 확인. 기존 회귀 결과와 새 결함 재현을 분리했다.'),('개선 완료 기준','ISS별 오류 재현이 사라지고 정상 회귀·기존 데이터 보존·새 오류 메시지 검토를 통과해야 한다.'),('결정 요청','P1 두 결함 개선 착수 여부, 정책 담당자와 검토자 지정, 실제자료 취급 범위 승인.')]);done()
slide('근거를 찾는 방법 · 예상 질문','상세 정의와 원본은 System Architecture Study 및 sources/ 참조');bullets([('“모든 필드가 저장되나요?”','아니다. Interface/DTO/View와 물리 store를 store-type-map 및 config 인덱스로 구분한다.'),('“PR #7 통과인데 왜 새 결함인가요?”','24+11+9의 한정된 시나리오 통과와 전체 시스템 무결성은 다르다. 이번에는 중복 PK·감사 실패 경로를 추가 검사했다.'),('“AI가 바로 운영할 수 있나요?”','아니다. 격리 데이터·허용 명령·멱등성·행동로그·권한·복구 수용조건이 먼저다.')]);done();c.save()
print('PDFs generated')
