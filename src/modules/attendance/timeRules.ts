import type { AttendanceDailyRecord } from '../../domain/types'
const minutes=(time:string)=>{if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))throw new Error('시간은 HH:MM 형식이어야 합니다.');const [h,m]=time.split(':').map(Number);return h*60+m}
export function clockHours(start:string,end:string,nextDay:boolean,breakStart:string,breakMinutes:number,holiday:boolean,absence=false) {
  const a=minutes(start),b=minutes(end)+(nextDay?1440:0),pause=minutes(breakStart)+(nextDay&&minutes(breakStart)<a?1440:0)
  if(b<=a||b-a>1440)throw new Error('퇴근 시각과 익일 여부를 확인하세요. 근무구간은 24시간 이내입니다.')
  if(!Number.isFinite(breakMinutes)||breakMinutes<0||!Number.isInteger(breakMinutes)||pause<a||pause+breakMinutes>b)throw new Error('휴게구간은 근무구간 안에 있어야 합니다.')
  let work=0,night=0
  for(let t=a;t<b;t++){if(t>=pause&&t<pause+breakMinutes)continue;work++;if(t%1440>=1320||t%1440<360)night++}
  const workedHours=absence?0:work/60
  return {workedHours,overtimeHours:holiday?0:Math.max(0,workedHours-8),nightHours:absence?0:night/60,holidayHours:holiday?workedHours:0,holidayOvertimeHours:holiday?Math.max(0,workedHours-8):0}
}
export function dailyTotals(rows:AttendanceDailyRecord[]){return rows.reduce((a,r)=>({workedHours:a.workedHours+r.workedHours,overtimeHours:a.overtimeHours+r.overtimeHours,nightHours:a.nightHours+r.nightHours,holidayHours:a.holidayHours+r.holidayHours,holidayOvertimeHours:a.holidayOvertimeHours+r.holidayOvertimeHours}),{workedHours:0,overtimeHours:0,nightHours:0,holidayHours:0,holidayOvertimeHours:0})}

export const activityLabels={WORK:'근무',ANNUAL_LEAVE:'연차',OFF:'휴무',SICK:'병가',ABSENT:'결근',MATERNITY:'출산전후휴가',TRAINING:'훈련',PRENATAL:'태아검진',FAMILY_CARE:'가족돌봄',PARENTAL:'육아휴직',SPOUSE_BIRTH:'배우자 출산휴가',FERTILITY:'난임치료휴가'} as const
export function calculateAttendanceDay(r:Pick<AttendanceDailyRecord,'startTime'|'endTime'|'endNextDay'|'breakStart'|'breakMinutes'|'holiday'|'absence'|'activity'|'nonWorkKind'|'nonWorkStartTime'|'nonWorkEndTime'|'nonWorkNextDay'>){
 const base=clockHours(r.startTime,r.endTime,r.endNextDay,r.breakStart,r.breakMinutes,r.holiday,false)
 const activity=r.activity??(r.absence?'ABSENT':'WORK');if(!(activity in activityLabels))throw new Error('근태 상태를 확인하세요.')
 const a=minutes(r.startTime),b=minutes(r.endTime)+(r.endNextDay?1440:0),pause=minutes(r.breakStart)+(r.endNextDay&&minutes(r.breakStart)<a?1440:0)
 let leave=0,work=0,night=0;let from=-1,to=-1
 if(activity==='WORK'&&r.nonWorkKind){if(!['ANNUAL_LEAVE','OFF','SICK'].includes(r.nonWorkKind))throw new Error('휴가 상태를 확인하세요.');from=minutes(r.nonWorkStartTime??'');if(r.endNextDay&&from<a)from+=1440;to=minutes(r.nonWorkEndTime??'')+(r.nonWorkNextDay?1440:0);if(to<=from||from<a||to>b)throw new Error('연차·휴무·병가 구간은 출퇴근 구간 안에 있어야 합니다.')}
 for(let t=a;t<b;t++){if(t>=pause&&t<pause+r.breakMinutes)continue;const excluded=activity!=='WORK'||(t>=from&&t<to);if(excluded){if(activity==='ANNUAL_LEAVE'||(activity==='WORK'&&r.nonWorkKind==='ANNUAL_LEAVE'))leave++;continue}work++;if(t%1440>=1320||t%1440<360)night++}
 const workedHours=work/60
 return {...base,workedHours,overtimeHours:r.holiday?0:Math.max(0,workedHours-8),nightHours:night/60,holidayHours:r.holiday?workedHours:0,holidayOvertimeHours:r.holiday?Math.max(0,workedHours-8):0,leaveHours:leave/60,absence:activity==='ABSENT',activity}
}
export function attendanceDayLabel(r:AttendanceDailyRecord){const kind=r.activity??(r.absence?'ABSENT':'WORK');const time=`${r.startTime}~${r.endTime}${r.endNextDay?' 익일':''}`;const label=`${kind==='WORK'?'':activityLabels[kind]+' '}${time} (${Number(r.workedHours.toFixed(2))}h)`;return label+(r.payTreatment?` · ${r.payTreatment==='PAID'?'유급':r.payTreatment==='UNPAID'?'무급':'고용보험 급여 구간'}`:'')+(r.note?` · ${r.note}`:'')+(kind==='WORK'&&r.nonWorkKind?` / ${activityLabels[r.nonWorkKind]} ${r.nonWorkStartTime}~${r.nonWorkEndTime}${r.nonWorkNextDay?' 익일':''}`:'')}
