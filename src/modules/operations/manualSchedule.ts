import type {CalendarEvent} from './operations'
import {addDays,makeTask,stage,validDate} from './workSchedule'
export interface ManualScheduleInput {id?:string;title:string;start:string;end:string;repeat:'NONE'|'WEEK'|'MONTH'|'YEAR';interval:number;until:string;note:string}
export function manualScheduleRows(v:ManualScheduleInput):CalendarEvent[]{
 if(!v.title.trim()||!validDate(v.start)||!validDate(v.end)||v.end<v.start)throw new Error('제목과 시작·종료일을 확인하세요.')
 if(!Number.isInteger(v.interval)||v.interval<1||v.interval>120||!['NONE','WEEK','MONTH','YEAR'].includes(v.repeat))throw new Error('반복 간격은 1~120의 정수입니다.')
 if(v.repeat!=='NONE'&&(!validDate(v.until)||v.until<v.start))throw new Error('반복 종료일을 확인하세요.')
 const group=v.id??crypto.randomUUID(),duration=Math.round((Date.parse(v.end)-Date.parse(v.start))/86400000),base=new Date(v.start+'T00:00:00Z'),rows:CalendarEvent[]=[]
 for(let i=0;i<730;i++){
  let start=v.start
  if(v.repeat==='WEEK')start=addDays(v.start,i*v.interval*7)
  if(v.repeat==='MONTH'||v.repeat==='YEAR'){const month=base.getUTCMonth()+i*v.interval*(v.repeat==='YEAR'?12:1),last=new Date(Date.UTC(base.getUTCFullYear(),month+1,0)).getUTCDate();start=new Date(Date.UTC(base.getUTCFullYear(),month,Math.min(base.getUTCDate(),last))).toISOString().slice(0,10)}
  if(i>0&&(v.repeat==='NONE'||start>v.until))break
  const e=makeTask('MANUAL-'+group+'-'+start,start.slice(0,7),v.title.trim(),'수기 일정',[stage(v.title.trim(),start,addDays(start,duration))]);e.id='MANUAL-'+group+'-'+start;e.startDate=start;e.endDate=addDays(start,duration);e.note=v.note;e.work!.purpose=v.note;e.work!.manual=true;e.work!.recurrence={group,frequency:v.repeat,interval:v.interval,until:v.until};rows.push(e)
  if(i===729&&v.repeat!=='NONE'&&start<v.until)throw new Error('반복은 한 번에 730건까지 등록할 수 있습니다.')
 }
 return rows
}
