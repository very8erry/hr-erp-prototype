from pathlib import Path
from html import escape
P=Path(__file__).resolve().parents[1]/'diagrams'
def start(title):return ['<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="620" viewBox="0 0 1000 620"><rect width="1000" height="620" fill="white"/><defs><marker id="a" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#456078"/></marker></defs>',f'<text x="25" y="30" font-family="Arial" font-size="22">{title}</text>']
def txt(s,x,y,t,size=18):s.append(f'<text x="{x}" y="{y}" font-family="Arial" font-size="{size}" fill="#163047">{escape(t)}</text>')
def box(s,x,y,w,h,lines,kind='task'):
 if kind=='decision':s.append(f'<polygon points="{x+w/2},{y} {x+w},{y+h/2} {x+w/2},{y+h} {x},{y+h/2}" fill="#f2f7fa" stroke="#456078" stroke-width="2"/>')
 elif kind=='process':s.append(f'<ellipse cx="{x+w/2}" cy="{y+h/2}" rx="{w/2}" ry="{h/2}" fill="#f2f7fa" stroke="#456078" stroke-width="2"/>')
 elif kind=='store':s.append(f'<path d="M{x+w},{y} H{x} V{y+h} H{x+w} M{x+12},{y} V{y+h}" fill="none" stroke="#456078" stroke-width="2"/>')
 else:s.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{12 if kind=="task" else 0}" fill="#f2f7fa" stroke="#456078" stroke-width="2"/>')
 for i,l in enumerate(lines):
  if kind=='decision':s.append(f'<text x="{x+w/2}" y="{y+h/2+6+i*20}" text-anchor="middle" font-family="Arial" font-size="16" fill="#163047">{escape(l.strip())}</text>')
  else:txt(s,x+18,y+26+i*23,l)
def line(s,pts,label='',x=0,y=0,dash=False):
 s.append(f'<polyline points="{pts}" fill="none" stroke="#456078" stroke-width="2" marker-end="url(#a)"'+(' stroke-dasharray="5,4"' if dash else '')+'/>')
 if label:txt(s,x,y,label,16)
def circle(s,x,y,end=False):s.append(f'<circle cx="{x}" cy="{y}" r="10" fill="{"white" if end else "#163047"}" stroke="#163047" stroke-width="2"/>'+ (f'<circle cx="{x}" cy="{y}" r="6" fill="#163047"/>' if end else ''))
def save(s,name):s.append('</svg>');(P/(name+'.svg')).write_text(''.join(s))
s=start('Payroll activity / decision gates');circle(s,60,110);box(s,110,80,220,65,['Review / edit inputs']);box(s,390,80,230,65,['Sync attendance','Calculate payroll']);box(s,700,80,240,65,['Validate (recalculates)']);box(s,710,220,220,90,['   errors = 0?'],'decision');box(s,390,235,230,65,['Review / correct']);box(s,710,380,220,65,['Confirm payroll']);box(s,390,370,230,90,[' attendance closed?'],'decision');box(s,75,380,230,65,['Close payroll']);box(s,390,530,240,65,['Confirm / close','attendance']);box(s,75,530,230,65,['Mark paid (status)']);circle(s,30,562,True)
for a in [('70,110 110,110','','',0),('330,110 390,110','',0,0),('620,110 700,110','',0,0),('820,145 820,220','',0,0),('710,265 620,265','no',650,250),('505,235 505,185 220,185 220,145','correct input',300,175),('820,310 820,380','yes',835,350),('710,412 620,412','',0,0),('390,415 305,415','yes',335,402),('505,460 505,530','no',520,500),('630,563 665,563 665,340 505,340 505,370','recheck',550,330),('190,445 190,530','',0,0),('75,562 40,562','',0,0)]:line(s,*a)
save(s,'D05-activity')
s=start('Data flow / sources, transformed inputs and outputs');box(s,30,70,210,65,['HR operator / files'],'external');box(s,350,60,270,90,['1. Register / edit','source information'],'process');box(s,735,70,240,65,['D1 Master / histories'],'store');box(s,350,230,270,90,['2. Sync attendance','to payroll input'],'process');box(s,30,240,240,65,['D2 Attendance'],'store');box(s,735,240,240,65,['D3 Payroll entries'],'store');box(s,350,420,270,90,['3. Calculate / validate'],'process');box(s,735,430,240,65,['D4 Runs / results'],'store');box(s,30,420,240,90,['4. Build filing draft','/ export'],'process');box(s,30,555,240,45,['Review files (external)'],'external')
for a in [('240,102 350,102','input',275,90),('620,102 735,102','master values',625,90),('240,115 290,115 290,220 150,220 150,240','time / leave',50,208),('270,272 350,272','hours',280,260),('620,272 735,272','amounts',640,260),('855,135 855,195 485,195 485,230','source snapshots',575,185),('855,305 855,360 485,360 485,420','calculation inputs',570,350),('620,462 735,462','computed values',630,450),('855,495 855,535 300,535 300,465 270,465','filing totals',500,525),('150,510 150,555','output',165,545)]:line(s,*a)
txt(s,340,585,'Source edits invalidate affected unconfirmed runs (BR-05).',18);save(s,'D08-dfd')
s=start('BPMN subset / responsibilities and exception loop');s.append('<rect x="20" y="50" width="960" height="550" fill="none" stroke="#456078"/><path d="M490,50 V600" stroke="#456078"/>');txt(s,40,75,'Lane: HR operator',18);txt(s,510,75,'Lane: Browser application',18)
circle(s,65,130);box(s,110,100,300,65,['Review attendance / inputs']);box(s,600,100,300,65,['Calculate and validate']);box(s,640,220,220,90,['   errors = 0?'],'decision');box(s,110,235,300,65,['Inspect errors / correct']);box(s,110,400,300,65,['Request confirmation','Close after attendance']);box(s,600,400,300,65,['Confirm / close guards','Persist allowed status']);circle(s,920,530,True);box(s,110,530,300,50,['Data: Payroll run + results'],'store')
for a in [('75,130 110,130','',0,0),('410,130 600,130','',0,0),('750,165 750,220','',0,0),('640,265 410,265','no',510,252),('260,235 260,165','',0,0),('750,310 750,350 260,350 260,400','yes',510,338),('410,432 600,432','',0,0),('900,432 920,432 920,520','',0,0)]:line(s,*a)
line(s,'750,465 750,555 410,555','data association',480,545,True)
# BPMN uses an unfilled start event and thick end event; data store cylinder.
s=[v.replace('<circle cx="65" cy="130" r="10" fill="#163047"','<circle cx="65" cy="130" r="10" fill="white"').replace('<circle cx="920" cy="530" r="10" fill="white" stroke="#163047" stroke-width="2"/><circle cx="920" cy="530" r="6" fill="#163047"/>','<circle cx="920" cy="530" r="10" fill="white" stroke="#163047" stroke-width="4"/>') for v in s]
s=[v.replace('<path d="M410,530 H110 V580 H410 M122,530 V580" fill="none" stroke="#456078" stroke-width="2"/>','<path d="M110,540 C110,522 410,522 410,540 L410,580 C410,598 110,598 110,580 Z M110,540 C110,558 410,558 410,540" fill="white" stroke="#456078" stroke-width="2"/>').replace('x="128" y="556"','x="128" y="575"') for v in s]
save(s,'D09-bpmn')
