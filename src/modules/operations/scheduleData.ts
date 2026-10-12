import type {CalendarEvent} from './operations'
import {holidays2026} from '../../fixtures/scenarios'
export const holidaySource='https://astro.kasi.re.kr/kor/life/post/calendarData'
export const statutorySource='https://law.go.kr/lsLawLinkInfo.do?chrClsCd=010202&lsJoLnkSeq=1013464627'
const holidays2025:Record<string,string>={'2025-01-01':'신정','2025-01-27':'임시공휴일','2025-01-28':'설날 연휴','2025-01-29':'설날','2025-01-30':'설날 연휴','2025-03-01':'삼일절','2025-03-03':'삼일절 대체공휴일','2025-05-01':'근로자의 날','2025-05-05':'어린이날·부처님오신날','2025-05-06':'대체공휴일','2025-06-03':'대통령선거','2025-06-06':'현충일','2025-08-15':'광복절','2025-10-03':'개천절','2025-10-05':'추석 연휴','2025-10-06':'추석','2025-10-07':'추석 연휴','2025-10-08':'추석 대체공휴일','2025-10-09':'한글날','2025-12-25':'성탄절'}
const holidays2027:Record<string,string>={'2027-01-01':'신정','2027-02-06':'설날 연휴','2027-02-07':'설날','2027-02-08':'설날 연휴','2027-02-09':'설날 대체공휴일','2027-03-01':'삼일절','2027-05-01':'노동절','2027-05-03':'노동절 대체공휴일','2027-05-05':'어린이날','2027-05-13':'부처님오신날','2027-06-06':'현충일','2027-07-17':'제헌절','2027-07-19':'제헌절 대체공휴일','2027-08-15':'광복절','2027-08-16':'광복절 대체공휴일','2027-09-14':'추석 연휴','2027-09-15':'추석','2027-09-16':'추석 연휴','2027-10-03':'개천절','2027-10-04':'개천절 대체공휴일','2027-10-09':'한글날','2027-10-11':'한글날 대체공휴일','2027-12-25':'성탄절','2027-12-27':'성탄절 대체공휴일'}
export const officialHolidays={...holidays2025,...holidays2026,...holidays2027}
const stamp='2026-10-11T00:00:00Z'
export function calendarSeed():CalendarEvent[]{return Object.entries(officialHolidays).map(([date,title])=>({id:'CAL-KR-'+date,scope:'COMPANY',title,eventType:'STATUTORY',startDate:date,endDate:date,appliesTo:'ALL',affectsAttendance:true,affectsPayroll:true,note:date==='2025-05-01'?'근로기준법상 근로자의 날 유급휴일':'대한민국 법정공휴일 · 대체공휴일 포함',source:['2026-05-01','2026-07-17'].includes(date)?statutorySource:holidaySource+'?search_year='+date.slice(0,4),createdAt:stamp,updatedAt:stamp}))}
export function nextBusinessDay(date:string){let d=new Date(date+'T00:00:00Z');while([0,6].includes(d.getUTCDay())||officialHolidays[d.toISOString().slice(0,10)])d.setUTCDate(d.getUTCDate()+1);return d.toISOString().slice(0,10)}
export function hrCalendarSeed(year:number):CalendarEvent[]{
 const out:CalendarEvent[]=[],add=(id:string,date:string,title:string,note:string,source:string)=>out.push({id:`HR-${year}-${id}`,scope:'HR',title,eventType:'PAYDAY',startDate:date,endDate:date,appliesTo:'ALL',affectsAttendance:false,affectsPayroll:false,note,source,createdAt:stamp,updatedAt:stamp}),nts='https://www.nts.go.kr/nts/ad/taxSchdul/selectList.do?mi=135747';
 for(let m=1;m<=12;m++){const month=`${year}-${String(m).padStart(2,'0')}`;add(`TAX-${m}`,nextBusinessDay(month+'-10'),'원천세·지방소득세 신고·납부','세무사 전달·홈택스 원천세·위택스 특별징수 확인. 월납 사업장 기준, 휴일이면 다음 업무일.',nts);add(`REVIEW-${m}`,nextBusinessDay(month+'-05'),'세무사 전달자료 점검','회사 내부 준비 일정: 전월 급여·입퇴사·비과세·퇴직 자료 검토. 법정 제출기한이 아닙니다.','회사 인사 운영 일정');add(`LABOR-${m}`,nextBusinessDay(month+'-20'),'노무사 인사 이슈 검토','회사 내부 점검 일정: 출산·육아·산재·근로시간·복귀 계획 및 규정 개정 확인. 법정 기한이 아닙니다.','회사 인사 운영 일정')}
 add('YEAR-END',nextBusinessDay(`${year}-02-20`),'연말정산 정산자료 최종 검토','회사 내부 준비 일정: 공제 증빙·전직장 원천징수영수증·중도입사자 확인.','회사 인사 운영 일정');
 add('WAGE-STATEMENT',nextBusinessDay(`${year}-03-10`),'근로소득 지급명세서 제출','전년도 근로소득 지급명세서 · 세무사 제출 결과 확인.', 'https://t.nts.go.kr/nts/cm/cntnts/cntntsView.do?cntntsId=7701&mi=2413');
 add('TOTAL-PAY',nextBusinessDay(`${year}-03-15`),'고용·산재 보수총액 신고','전년도 보수총액 확인·신고 · 대상 및 공단 공고 확인.','https://www.goe.go.kr/resource/old/BBSMSTR_000000030111/BBS_202502170406580510.pdf');
 return out
}
