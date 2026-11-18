from pathlib import Path
import json
B=Path(__file__).resolve().parents[1];root=B.parents[1]
r=json.loads((B/'sources/requirements.json').read_text());rules=json.loads((B/'sources/business-rules.json').read_text());trace=json.loads((B/'sources/traceability.json').read_text());findings=json.loads((B/'sources/issues.json').read_text())
ids={x['id'] for x in r};ruleids={x['id'] for x in rules};assert len(ids)==24 and len(ruleids)==16 and len(findings)==12
for item in trace:
 assert item['requirement'] in ids
 assert set(item['rules'])<=ruleids
 c=item['code']
 if c:
  text=(root/c['path']).read_text().splitlines();assert c['name'] in text[c['line']-1],c
 if item['test']:assert (root/item['test']).is_file()
assert next(x for x in r if x['id']=='FUT-01')['evidence'] is None
for f in json.loads((B/'sources/fields.json').read_text()):
 assert f['field'] in (root/f['path']).read_text().splitlines()[f['line']-1]
for n in ['class','components','erd','usecases','activity','sequence','states','dfd','bpmn','deployment']:
 assert list((B/'diagrams').glob('*-'+n+'.svg'))
print('PASS: 24 requirements / 16 rules / 12 issues; code anchors, field declarations, test paths and 10 diagram types')
