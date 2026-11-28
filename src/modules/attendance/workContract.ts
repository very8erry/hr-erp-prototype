import type {AttendanceSetting,WorkSchedule} from '../../domain/types'
export const weekDays=['SUN','MON','TUE','WED','THU','FRI','SAT'] as const
export interface WorkContract {id:string;from:string;to:string;workDays:string[];startTime:string;endTime:string;breakMinutes:number;weeklyRestDay:string;weeklyPaidRestHours:number;ordinaryMonthlyHours:number;kind:'STANDARD'|'PREGNANCY_REDUCTION'|'CHILDCARE_REDUCTION'|'PART_TIME';reason:string;recordedAt:string}
export function contractHours(c:WorkContract){const minute=(v:string)=>Number(v.slice(0,2))*60+Number(v.slice(3)),span=(minute(c.endTime)-minute(c.startTime)+1440)%1440,daily=(span-c.breakMinutes)/60,weekly=daily*c.workDays.length;return {spanHours:span/60,dailyHours:daily,weeklyHours:weekly,averageMonthlyWork:weekly*365/7/12,averageMonthlyPaidRest:c.weeklyPaidRestHours*365/7/12}}
const validDate=(v:string)=>/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v
export function validateContract(c:WorkContract){
 if(!validDate(c.from)||!validDate(c.to)||c.to<c.from||!c.reason.trim())throw new Error('계약 적용기간·변경 사유를 입력하세요.')
 if(!c.workDays.length||c.workDays.length>6||new Set(c.workDays).size!==c.workDays.length||c.workDays.some(d=>!weekDays.includes(d as typeof weekDays[number]))||!weekDays.includes(c.weeklyRestDay as typeof weekDays[number])||c.workDays.includes(c.weeklyRestDay))throw new Error('근무요일·주휴일을 확인하세요.')
 if(![c.startTime,c.endTime].every(t=>/^([01]\d|2[0-3]):[0-5]\d$/.test(t)))throw new Error('계약 시간을 확인하세요.')
 const h=contractHours(c)
 if(![c.breakMinutes,c.weeklyPaidRestHours,c.ordinaryMonthlyHours].every(Number.isFinite)||h.dailyHours<=0||h.dailyHours>8||h.weeklyHours>40||c.weeklyPaidRestHours<0||c.weeklyPaidRestHours>8||c.ordinaryMonthlyHours<=0||c.ordinaryMonthlyHours>300||c.breakMinutes<(h.dailyHours>=8?60:h.dailyHours>=4?30:0))throw new Error('계약 근로시간·휴게·주휴·환산시간 범위를 확인하세요.')
}
export function resolveContract(setting:AttendanceSetting|undefined,schedule:WorkSchedule|undefined,date:string):WorkContract|null{
 const saved=setting?.contracts?.filter(c=>c.from<=date&&c.to>=date)??[]
 if(saved.length>1)throw new Error('동일 날짜의 근로계약 유효기간이 중복됩니다.')
 if(saved.length)return saved[0]
 if(!schedule)return null
 const base:WorkContract={id:setting?.id??schedule.id,from:'1900-01-01',to:'9999-12-31',workDays:schedule.workDays,startTime:schedule.startTime,endTime:schedule.endTime,breakMinutes:schedule.breakMinutes,weeklyRestDay:'SUN',weeklyPaidRestHours:0,ordinaryMonthlyHours:setting?.ordinaryMonthlyHours??0,kind:'STANDARD',reason:'기존 근무일정·환산시간',recordedAt:''}
 const hours=contractHours(base);base.weeklyPaidRestHours=hours.weeklyHours>=15?hours.weeklyHours/40*8:0;base.ordinaryMonthlyHours=setting?.ordinaryMonthlyHours??Math.round((hours.weeklyHours+base.weeklyPaidRestHours)*365/7/12)
 return base
}
