const date=(s:string)=>new Date(s+'T00:00:00Z')
function anniversary(hire:string,year:number){const d=date(hire);const month=d.getUTCMonth();const day=d.getUTCDate();const end=new Date(Date.UTC(year,month+1,0)).getUTCDate();return new Date(Date.UTC(year,month,Math.min(day,end))).toISOString().slice(0,10)}
const round=(n:number)=>Math.round(n*100)/100
/** Projection under >=80% attendance and first-year perfect-attendance assumptions.
 * Statutory eligibility must be verified from actual attendance; cumulative grants are not balances.
 */
export function leaveComparison(hire:string,asOf:string,termination:string|null,policy:'FAVORABLE'|'HIRE'='FAVORABLE'){
 const end=termination&&termination<asOf?termination:asOf
 if(hire>end)return {hire:0,fiscal:0,applied:0,basis:'입사일 기준',difference:0,reversed:false}
 const firstYear=Number(hire.slice(0,4)),events:{day:string;hire:number;fiscal:number}[]=[]
 const h=date(hire)
 for(let m=1;m<=11;m++){const base=new Date(Date.UTC(h.getUTCFullYear(),h.getUTCMonth()+m,1)),last=new Date(Date.UTC(base.getUTCFullYear(),base.getUTCMonth()+1,0)).getUTCDate();const day=new Date(Date.UTC(base.getUTCFullYear(),base.getUTCMonth(),Math.min(h.getUTCDate(),last))).toISOString().slice(0,10);events.push({day,hire:1,fiscal:1})}
 for(let y=firstYear+1;y<=Number(end.slice(0,4));y++){
  const completed=y-firstYear,grant=Math.min(25,15+Math.floor((completed-1)/2));events.push({day:anniversary(hire,y),hire:grant,fiscal:0})
  const january=`${y}-01-01`
  // Company rule: first January grants prior-year service days / calendar-year days × 15.
  const priorStart=`${y-1}-01-01`,priorEnd=`${y}-01-01`,days=(date(priorEnd).getTime()-date(priorStart).getTime())/86400000
  const fiscal=y===firstYear+1?15*(date(priorEnd).getTime()-date(hire).getTime())/86400000/days:Math.min(25,15+Math.floor(Math.max(0,y-firstYear-2)/2))
  events.push({day:january,hire:0,fiscal})
 }
 const grouped=new Map<string,{hire:number;fiscal:number}>();events.filter(e=>e.day<=end).forEach(e=>{const prior=grouped.get(e.day)??{hire:0,fiscal:0};grouped.set(e.day,{hire:prior.hire+e.hire,fiscal:prior.fiscal+e.fiscal})})
 let hireTotal=0,fiscalTotal=0,lastSign=0,reversed=false
 for(const [,e] of [...grouped].sort(([a],[b])=>a.localeCompare(b))){hireTotal+=e.hire;fiscalTotal+=e.fiscal;const sign=Math.sign(round(fiscalTotal-hireTotal));if(sign&&lastSign&&sign!==lastSign)reversed=true;if(sign)lastSign=sign}
 const basis=policy==='FAVORABLE'&&fiscalTotal>hireTotal?'회계연도 기준':'입사일 기준'
 return {hire:round(hireTotal),fiscal:round(fiscalTotal),applied:round(basis==='회계연도 기준'?fiscalTotal:hireTotal),basis,difference:round(fiscalTotal-hireTotal),reversed}
}
