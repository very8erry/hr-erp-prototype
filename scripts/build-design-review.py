from pathlib import Path
import json,re
root=Path(__file__).resolve().parent.parent;p=root/'docs/design-review'
base=(p/'base.html').read_text()
for name in ['render','links','erdDiagram','comparison','filterCompare','compareDetail']:base=base.replace('function '+name+'(', 'function legacy_'+name+'(')
s=base.replace('render();\n</script>','\n'+(p/'extension.js').read_text()+'\n</script>')
s=s.replace('</style>',(p/'extension.css').read_text()+'</style>')
for token,file in [('__DATA__','data.json'),('__SCHEMA__','schema.json'),('__PHYSICAL__','physical.json')]:s=s.replace(token,(p/file).read_text().replace('</','<\\/'))
s=s.replace('__VERIFICATION__','기존 릴리스 검증·TypeScript·Vite 빌드 통과. 신고초안 원자성 테스트 통과. 시험 범위는 각 기능의 근거 파일에 표시했습니다. 브라우저 및 추가 양식 시험 결과는 최종 검증 기록을 참조하세요.')
s=s.replace('v2.0','v3.0').replace('수정 검증 1a8f0fa · GitHub 업로드 보류','수정 검증 브랜치 · workflow-integrity-review')
s=s.replace('HRIS / 설계 리뷰','HRIS / 기획·설계').replace('실제 서비스에서 출발한 기획과 설계','전체 구조 · 요구 · 화면 · 데이터')
# Inline handlers must not collide with HTMLElement.title, all generated data escaped.
(root/'public/hris-design.html').write_text(s)
(Path('/private/tmp')/'hris-design-check.js').write_text(s.split('<script>')[1].split('</script>')[0])
print('Built public/hris-design.html:',len(s),'characters')
