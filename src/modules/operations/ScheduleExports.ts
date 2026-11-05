import type {CalendarEvent} from './operations'
import {activeSchedules,schedulesForDay,scheduleTopic} from './schedulePresentation'
import {addDays} from './workSchedule'
import {downloadBlob} from '../attendance/attendanceFiles'
export async function exportSchedules(month:string,events:CalendarEvent[],layout:'calendar'|'list'){
 const Excel=(await import('exceljs')).default,book=new Excel.Workbook(),sheet=book.addWorksheet(layout==='calendar'?'월별 달력':'월별 업무목록');book.creator='lemonpAI';
 const rows=activeSchedules(events).filter(e=>e.startDate<=month+'-31'&&e.endDate>=month+'-01');
 if(layout==='calendar'){
 sheet.columns=Array.from({length:7},()=>({width:28}));sheet.mergeCells('A1:G1');sheet.getCell('A1').value=month+' 업무일정';sheet.getRow(1).height=32;sheet.addRow(['일','월','화','수','목','금','토']);
 const first=month+'-01',offset=new Date(first+'T00:00:00Z').getUTCDay(),days=new Date(Number(month.slice(0,4)),Number(month.slice(5)),0).getDate();
 for(let i=0;i<Math.ceil((offset+days)/7)*7;i++){const date=addDays(first,i-offset),cell=sheet.getCell(3+Math.floor(i/7),1+i%7);cell.value=date.startsWith(month)?Number(date.slice(8))+'\n'+[...new Set(schedulesForDay(rows,date).map(scheduleTopic))].join('\n'):'';cell.note=schedulesForDay(rows,date).map(e=>e.title).join('\n');cell.alignment={vertical:'top',wrapText:true};cell.border={top:{style:'thin',color:{argb:'FFE2E8F0'}},bottom:{style:'thin',color:{argb:'FFE2E8F0'}},left:{style:'thin',color:{argb:'FFE2E8F0'}},right:{style:'thin',color:{argb:'FFE2E8F0'}}};if(i%7===0)cell.font={color:{argb:'FFB91C1C'}};sheet.getRow(3+Math.floor(i/7)).height=Math.min(409,Math.max(sheet.getRow(3+Math.floor(i/7)).height??100,40+new Set(schedulesForDay(rows,date).map(scheduleTopic)).size*18))}
 sheet.pageSetup={paperSize:9,orientation:'landscape',fitToPage:true,fitToWidth:1,fitToHeight:0};
 }else{sheet.addRow(['분야','업무','단계','시작일','종료일','담당자','상태','다음 행동']);for(const e of rows){if(e.work)for(const s of e.work.stages)sheet.addRow([scheduleTopic(e),e.title,s.title,s.startDate,s.endDate,s.owner||e.work.owner,s.status,s.todo]);else sheet.addRow([scheduleTopic(e),e.title,'',e.startDate,e.endDate,'','',''])}sheet.columns=[{width:18},{width:45},{width:40},{width:14},{width:14},{width:18},{width:16},{width:45}];sheet.autoFilter={from:'A1',to:'H1'};sheet.views=[{state:'frozen',ySplit:1}];sheet.eachRow(r=>{r.alignment={vertical:'top',wrapText:true}})}
 sheet.getRow(layout==='calendar'?2:1).eachCell(c=>{c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF334155'}};c.font={color:{argb:'FFFFFFFF'},bold:true}});
 const bytes=await book.xlsx.writeBuffer();downloadBlob(new Blob([bytes as BlobPart],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),`업무일정_${month}_${layout==='calendar'?'달력형':'리스트형'}.xlsx`)
}
