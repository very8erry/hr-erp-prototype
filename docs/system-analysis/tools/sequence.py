from pathlib import Path
p=Path('docs/system-analysis/diagrams');svg=['<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="670" viewBox="0 0 1000 670"><rect width="1000" height="670" fill="white"/><defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto"><path d="M0,0 L10,5 L0,10 Z" fill="#48647d"/></marker></defs>']
def text(x,y,s,size=15):svg.append(f'<text x="{x}" y="{y}" text-anchor="middle" font-family="Arial" font-size="{size}" fill="#142c45">{s}</text>')
xs=[120,365,620,875]
for x,n in zip(xs,['Registration UI','HrService','IndexedDbHrRepository','IndexedDB']):
 svg.append(f'<rect x="{x-105}" y="30" width="210" height="50" fill="#eef3f7" stroke="#48647d"/><path d="M{x},80 V630" stroke="#8393a3" stroke-dasharray="6,5"/>');text(x,60,n,14)
def msg(a,b,y,label,dash=False):
 svg.append(f'<line x1="{xs[a]}" y1="{y}" x2="{xs[b]}" y2="{y}" stroke="#48647d" marker-end="url(#arrow)"'+(' stroke-dasharray="5,4"' if dash else '')+'/>');text((xs[a]+xs[b])/2,y-9,label,13)
msg(0,1,120,'registerEmployee(input)');msg(1,2,165,'registerEmployee(input)');msg(2,3,220,'transaction(readwrite) / read company, org, numbers');msg(3,2,270,'current source records',True)
svg.append('<rect x="485" y="300" width="500" height="245" fill="white" fill-opacity="0.8" stroke="#48647d"/><path d="M485,430 H985" stroke="#48647d" stroke-dasharray="6,4"/>');text(540,322,'alt',14);text(735,350,'[valid] add Person / Employment / Assignment / Compensation',12)
msg(2,3,380,'add(...) / await transaction completion');text(735,458,'[invalid or request failure] no partial write',12);msg(2,3,493,'abort transaction');msg(2,1,580,'employmentId OR rejected promise',True);msg(1,0,620,'show result / show error',True)
svg.append('</svg>');(p/'D06-sequence.svg').write_text(''.join(svg))
(p/'D06-sequence.puml').write_text('''@startuml
participant "Registration UI" as UI
participant HrService as S
participant IndexedDbHrRepository as R
database IndexedDB as DB
UI -> S: registerEmployee(input)
S -> R: registerEmployee(input)
R -> DB: transaction(readwrite), source reads
DB --> R: company, organization, employments
alt valid
R -> DB: add Person / Employment / Assignment / Compensation
DB --> R: transaction complete
else invalid or request error
R -> DB: abort
end
R --> S: employmentId or rejected promise
S --> UI: result or error
@enduml''')
