import type {AttendanceDailyRecord,LeaveCase} from '../domain/types'
import {dayPolicy,type CalendarEvent} from '../modules/operations/operations'
import type {Issue} from '../modules/operations/operations'
export function monthlyStatus(records:AttendanceDailyRecord[],date:string,leaves:LeaveCase[]=[],issues:Issue[]=[],today:string,calendar?:CalendarEvent[]){
 const rows=[...new Map(records.filter(r=>r.workDate===date).map(r=>[r.employmentId,r])).values()];const counts={sick:0,annual:0,off:0,other:0},details:Record<string,number>={'임신':0,'산재':0,'출산':0,'육아':0,'그 외':0};
 for(const r of rows){if(r.activity==='SICK'){counts.sick++;continue}if(r.activity==='ANNUAL_LEAVE'){counts.annual++;continue}if(r.activity==='OFF'){const shared=r.offKind==='WEEKEND'||r.offKind==='STATUTORY'||r.offKind==='COMPANY'||(!r.offKind&&dayPolicy(date,calendar).off);if(!shared)counts.off++;continue}
 const kinds=leaves.filter(l=>l.employmentId===r.employmentId&&l.startDate<=date&&(!l.endDate||l.endDate>=date)).map(l=>l.kind);
 // Open issues provide current status only; they are not used to reconstruct past closed cases.
 const current=issues.filter(i=>date===today&&i.status==='OPEN'&&i.employmentId===r.employmentId&&i.occurredDate<=date).map(i=>i.category).join(' ');
 const text=String(r.note??'')+' '+current,kind=kinds.includes('OCCUPATIONAL')||/산재|요양/.test(text)?'산재':r.activity==='PRENATAL'||/임신/.test(text)?'임신':kinds.includes('MATERNITY')||r.activity==='MATERNITY'?'출산':kinds.includes('PARENTAL')||r.activity==='PARENTAL'||/육아/.test(current)?'육아':null;
 if(kind||r.activity!=='WORK'||r.absence){counts.other++;details[kind??'그 외']++}
 }
 return {date,...counts,details,recorded:rows.length,total:counts.sick+counts.annual+counts.off+counts.other};
}
