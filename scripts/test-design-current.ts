import fs from 'node:fs'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
const data=JSON.parse(fs.readFileSync('docs/design-review/data.json','utf8'))
assert(data.analysisSources.length>100)
for(const source of data.analysisSources)assert.equal(createHash('sha256').update(fs.readFileSync(source.file)).digest('hex'),source.sha256,'설계 문서 갱신 필요: '+source.file)
const ids=data.requirements.map((r:{id:string})=>r.id);assert.equal(new Set(ids).size,ids.length)
const schema=JSON.parse(fs.readFileSync('docs/design-review/schema.json','utf8'))
for(const name of Object.keys(data.pairs))assert(schema[name],'ERD type missing: '+name)
const html=fs.readFileSync('public/hris-design.html','utf8'),script=html.split('<script>')[1].split('</script>')[0]
assert(!/indexedDB\s*\.|fetch\s*\(|XMLHttpRequest|navigator\.sendBeacon|localStorage\.(?:setItem|clear|removeItem)/.test(script),'설계 문서는 HRIS 데이터에 접근할 수 없음')
for(const file of ['급여지급_사용설명서.pdf','이슈직원_처리안내.pdf'])assert(fs.existsSync('public/manuals/'+file))
console.log('PASS design code fingerprints, requirement IDs, ERD type links, read-only HTML and reviewed manual files')
