import type {AttendanceSetting,WorkSchedule,EmployeeView,AttendanceDailyRecord,AttendanceMonthlySummary} from '../../domain/types'
import type {CalendarEvent} from '../operations/operations'
import {dayPolicy} from '../operations/operations'
import {resolveContract,contractHours,weekDays,type WorkContract} from './workContract'
export interface PremiumTimeBasis {date:string;ordinaryMonthlyHours:number;contractKind:WorkContract['kind'];overtimeHours:number;nightHours:number;holidayHours:number;holidayOvertimeHours:number}
export interface AttendanceBasis {premiumTimes?:PremiumTimeBasis[];contracts:WorkContract[];contractIds:string[];plannedDays:number;plannedHours:number;ordinaryMonthlyHours:number;actualHours:number;paidWeeklyRestHours:number;paidHolidayHours:number;paidLeaveHours:number;paidOtherHours:number;unpaidShortfallHours:number;missingDates:string[];weeklyRest:{date:string;hours:number;status:'ELIGIBLE'|'NOT_ELIGIBLE'|'REVIEW'}[];warnings:string[]}
export function monthDates(period:string){if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(period))throw new Error('귀속월을 확인하세요.');return Array.from({length:new Date(Date.UTC(Number(period.slice(0,4)),Number(period.slice(5)),0)).getUTCDate()},(_,i)=>`${period}-${String(i+1).padStart(2,'0')}`)}
export function attendanceBasis(period:string,employee:Pick<EmployeeView,'employmentId'|'organizationId'|'hireDate'|'terminationDate'>,setting:AttendanceSetting|undefined,schedule:WorkSchedule|undefined,records:AttendanceDailyRecord[],events:CalendarEvent[]):AttendanceBasis{
 const inEmployment=(d:string)=>d>=employee.hireDate&&(!employee.terminationDate||d<=employee.terminationDate),rows=new Map(records.filter(r=>r.employmentId===employee.employmentId).map(r=>[r.workDate,r])),warnings:string[]=[]
 const out:AttendanceBasis={premiumTimes:[],contracts:[],contractIds:[],plannedDays:0,plannedHours:0,ordinaryMonthlyHours:0,actualHours:0,paidWeeklyRestHours:0,paidHolidayHours:0,paidLeaveHours:0,paidOtherHours:0,unpaidShortfallHours:0,missingDates:[],weeklyRest:[],warnings}
 const daily=(date:string)=>{const c=resolveContract(setting,schedule,date);return {c,h:c?contractHours(c).dailyHours:0,p:dayPolicy(date,events,employee),day:weekDays[new Date(date+'T00:00:00Z').getUTCDay()]}}
 for(const date of monthDates(period).filter(inEmployment)){
  const {c,h,p,day}=daily(date),r=rows.get(date);if(!c){warnings.push('계약 근무일정 미연결');continue}
  if(!out.contractIds.includes(c.id)){out.contractIds.push(c.id);out.contracts.push(structuredClone(c))};out.ordinaryMonthlyHours=c.ordinaryMonthlyHours
  if(r&&(r.overtimeHours||r.nightHours||r.holidayHours||r.holidayOvertimeHours))out.premiumTimes!.push({date,ordinaryMonthlyHours:c.ordinaryMonthlyHours,contractKind:c.kind,overtimeHours:r.overtimeHours,nightHours:r.nightHours,holidayHours:r.holidayHours,holidayOvertimeHours:r.holidayOvertimeHours})
  const workday=c.workDays.includes(day),planned=workday&&!p.statutory&&!p.companyOff
  const paidLeave=r&&r.payTreatment!=='UNPAID'&&r.payTreatment!=='BENEFIT'?(r.leaveHours??0):0,paidOther=r?.payTreatment==='BENEFIT'?0:r?.paidCreditHours??0
  out.actualHours+=r?.workedHours??0;out.paidLeaveHours+=paidLeave;out.paidOtherHours+=Math.max(0,paidOther-paidLeave)
  if(planned){out.plannedDays++;out.plannedHours+=h;if(!r)out.missingDates.push(date);else out.unpaidShortfallHours+=Math.max(0,h-Math.min(h,Math.max(0,r.workedHours-r.overtimeHours-r.holidayHours)+Math.max(paidLeave,paidOther)))}
  if(workday&&(p.statutory||p.companyOff))out.paidHolidayHours+=h
  if(day===c.weeklyRestDay){
   const week=Array.from({length:7},(_,i)=>{const d=new Date(date+'T00:00:00Z');d.setUTCDate(d.getUTCDate()-6+i);return d.toISOString().slice(0,10)}),scheduled=week.filter(d=>{const v=daily(d);return !!v.c&&v.c.workDays.includes(v.day)&&!v.p.statutory&&!v.p.companyOff})
   const allRecords=scheduled.every(d=>inEmployment(d)&&rows.has(d)),absence=scheduled.some(d=>(rows.get(d)?.absence||rows.get(d)?.payTreatment==='UNPAID'&&rows.get(d)?.workedHours===0)),benefit=scheduled.some(d=>rows.get(d)?.payTreatment==='BENEFIT')
   const status=contractHours(c).weeklyHours<15||absence?'NOT_ELIGIBLE':!allRecords||!scheduled.length||benefit?'REVIEW':'ELIGIBLE',hours=status==='ELIGIBLE'?c.weeklyPaidRestHours:0
   out.weeklyRest.push({date,hours,status});out.paidWeeklyRestHours+=hours
  }
 }
 if(out.contractIds.length>1)warnings.push('월 중 계약 변경: 날짜별 소정시간·기본 수당 단가 적용, 표시 환산시간은 마지막 유효 계약 기준')
 if(out.weeklyRest.some(w=>w.status==='REVIEW'))warnings.push('주휴: 경계 주·미입력·지원금 구간 확인 필요')
 out.warnings=[...new Set(warnings)];return out
}
export function summaryWithBasis(old:AttendanceMonthlySummary,records:AttendanceDailyRecord[],basis:AttendanceBasis):AttendanceMonthlySummary{
 const rows=records.filter(r=>r.employmentId===old.employmentId&&r.workDate.startsWith(old.period)),sum=(k:'workedHours'|'overtimeHours'|'nightHours'|'holidayHours'|'leaveHours'|'paidCreditHours')=>rows.reduce((s,r)=>s+(r[k]??0),0)
 return {...old,basis,scheduledHours:basis.plannedHours,workedHours:sum('workedHours'),overtimeHours:sum('overtimeHours'),nightHours:sum('nightHours'),holidayHours:sum('holidayHours'),leaveDays:rows.reduce((s,r)=>s+(r.leaveHours??0)/Math.max(1,r.scheduledHours??8),0),paidCreditHours:basis.paidLeaveHours+basis.paidOtherHours,unpaidHours:basis.unpaidShortfallHours,absenceHours:rows.filter(r=>r.absence).reduce((s,r)=>s+(r.scheduledHours??8),0),sickPaidHours:rows.filter(r=>r.activity==='SICK'&&r.payTreatment==='PAID').reduce((s,r)=>s+(r.paidCreditHours??0),0),sickUnpaidHours:rows.filter(r=>r.activity==='SICK'&&r.payTreatment==='UNPAID').reduce((s,r)=>s+(r.scheduledHours??8),0),revision:(old.revision??0)+1}
}
