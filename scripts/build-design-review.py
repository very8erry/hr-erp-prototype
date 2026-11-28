from pathlib import Path
import json,re
root=Path(__file__).resolve().parent.parent;p=root/'docs/design-review'
base=(p/'base.html').read_text()
for name in ['render','links','erdDiagram','comparison','filterCompare','compareDetail']:base=base.replace('function '+name+'(', 'function legacy_'+name+'(')
s=base.replace('render();\n</script>','\n'+(p/'extension.js').read_text()+'\n</script>')
s=s.replace('</style>',(p/'extension.css').read_text()+'</style>')
for token,file in [('__DATA__','data.json'),('__SCHEMA__','schema.json'),('__PHYSICAL__','physical.json')]:s=s.replace(token,(p/file).read_text().replace('</','<\\/'))
s=s.replace('__VERIFICATION__','2026-11-28 규정·계약·급여 변경 검증은 docs/verification/policy-payroll-20261128.md에 기록합니다. 이전 기록과 이번 실행 결과를 구분합니다. <a href="./manuals/급여지급_사용설명서.pdf">최신 사용설명서</a> · <a href="./manuals/이슈직원_처리안내.pdf">이슈 처리 안내</a>')
s=s.replace('v2.0','v3.0').replace('수정 검증 1a8f0fa · GitHub 업로드 보류','수정 검증 브랜치 · workflow-integrity-review')
s=s.replace('HRIS / 설계 리뷰','HRIS / 기획·설계').replace('실제 서비스에서 출발한 기획과 설계','전체 구조 · 요구 · 화면 · 데이터')
# Inline handlers must not collide with HTMLElement.title, all generated data escaped.
(root/'public/hris-design.html').write_text(s)
(Path('/private/tmp')/'hris-design-check.js').write_text(s.split('<script>')[1].split('</script>')[0])
print('Built public/hris-design.html:',len(s),'characters')
