import type {WorkSchedule,AttendanceMonthlySummary,EmployeeView} from '../domain/types'
import {calendarSeed,dayPolicy,type CalendarEvent} from '../modules/operations/operations'

// Full-time 40h/week + 8h paid weekly rest: rounded monthly ordinary-wage divisor.
// Not the calendar's actual scheduled work hours.
export const DEMO_ORDINARY_MONTHLY_HOURS=209
const minute=(t:string)=>{const [h,m]=t.split(':').map(Number);return h*60+m}
export function standardOrdinaryHours(schedule:WorkSchedule|null|undefined):number|undefined{
  if(!schedule||schedule.workDays.length!==5||!['MON','TUE','WED','THU','FRI'].every(d=>schedule.workDays.some(v=>v===d)))return undefined
  const span=(minute(schedule.endTime)-minute(schedule.startTime)+1440)%1440
  return span-schedule.breakMinutes===480?DEMO_ORDINARY_MONTHLY_HOURS:undefined
}
export function demoMonthlyBasis(row:AttendanceMonthlySummary,employee?:EmployeeView):number|undefined{
  return row.ordinaryMonthlyHours??(/^(ATTM-|ATT-DEMO-)/.test(row.id)?standardOrdinaryHours(employee?.workSchedule):undefined)
}
export function demoScheduledHours(period:string,hireDate:string,terminationDate:string|null,events:CalendarEvent[]=calendarSeed(),employee?:{employmentId:string;organizationId:string}):number{
  let hours=0
  for(const date=new Date(period+'-01T00:00:00Z');date.toISOString().slice(0,7)===period;date.setUTCDate(date.getUTCDate()+1)){
    const key=date.toISOString().slice(0,10)
    if(key>=hireDate&&(!terminationDate||key<=terminationDate)&&!dayPolicy(key,events,employee).off)hours+=8
  }
  return hours
}
