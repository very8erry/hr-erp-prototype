import type {AttendanceSetting,WorkSchedule,PayrollItemMaster} from '../../domain/types'
import type {PolicyDocument,PolicyStandard} from '../operations/operations'
import type {CompanyInfo} from './companyInfo'
import {authority} from '../operations/planningReview'
import {resolveContract,contractHours} from '../attendance/workContract'
import {defaultWorkSettings} from '../operations/workSchedule'
export interface PolicyContext {settings:AttendanceSetting[];schedules:WorkSchedule[];documents:PolicyDocument[];items:PayrollItemMaster[];info:CompanyInfo}
export interface PolicyRegistryRow {id:string;documentId:string;version:number;title:string;category:string;key:string;label:string;ruleValue:string;actualValue:string;unit:string;from:string;to:string;condition:string;clause:string;sourceKind:string;formula:string;state:'일치'|'불일치'|'확인 필요'|'미연결'|'적용 제외';mismatch:boolean;sourcePath:string}
const contractKeys=['dailyHours','weeklyHours','ordinaryMonthlyHours','startTime','endTime','breakMinutes','workDays','spanHours','weeklyRestDay','weeklyPaidRestHours','averageMonthlyWork','averageMonthlyPaidRest']
const definitions:Record<string,[string,string,string]>={workDays:['근무요일','근로시간','요일'],spanHours:['일 체류시간','근로시간','시간'],weeklyRestDay:['주휴일','휴일','요일'],weeklyPaidRestHours:['계약상 주 유급주휴시간','휴일','시간'],averageMonthlyWork:['월평균 소정근로시간','근로시간','시간'],averageMonthlyPaidRest:['월평균 유급주휴시간','휴일','시간'],dailyHours:['1일 소정근로시간','근로시간','시간'],weeklyHours:['주 소정근로시간','근로시간','시간'],ordinaryMonthlyHours:['통상임금 월 환산시간','급여','시간'],startTime:['시업시간','근로시간','시각'],endTime:['종업시간','근로시간','시각'],breakMinutes:['휴게시간','근로시간','분'],payrollDay:['지급일','급여','일'],holidayPayRule:['휴일 지급일 처리','급여','문자'],attendanceClose:['근태 마감일','근태','일'],payPeriodDescription:['급여 산정기간','급여','문자'],retirementPlan:['퇴직급여 제도','퇴직정산','문자'],leavePolicy:['연차 운영기준','연차','문자']}
export function extractPolicyStandards(text:string,from:string):PolicyStandard[]{
 const rows:PolicyStandard[]=[],put=(key:string,value:string,clause:string)=>rows.push({key,value,from,to:'',condition:'통상근무자',label:definitions[key][0],category:definitions[key][1],unit:definitions[key][2],sourceKind:'LITERAL',clause})
 const daily=text.match(/1일\s*(\d+(?:\.\d+)?)시간/),weekly=text.match(/1주\s*(\d+(?:\.\d+)?)시간/),clock=text.match(/(\d{2}:\d{2})부터\s*(\d{2}:\d{2})까지/),pay=text.match(/(?:임금지급일|지급일)[^\n]{0,35}매월\s*(\d{1,2})일/)
 if(daily)put('dailyHours',daily[1],'소정근로시간 본문')
 if(weekly)put('weeklyHours',weekly[1],'소정근로시간 본문')
 if(clock){put('startTime',clock[1],'표준 시업·종업');put('endTime',clock[2],'표준 시업·종업')}
 if(/월요일부터\s*금요일까지/.test(text))put('workDays','MON,TUE,WED,THU,FRI','소정근로일 본문')
 const pause=text.match(/표준 휴게시간은[^\n]{0,50}?(\d+(?:\.\d+)?)시간/);if(pause)put('breakMinutes',String(Number(pause[1])*60),'표준 휴게시간 본문')
 if(/주휴일은\s*일요일/.test(text))put('weeklyRestDay','SUN','주휴일 본문')
 const derived=(key:string,value:number,formula:string,clause:string)=>rows.push({key,value:String(Math.round(value*100)/100),from,to:'',condition:'통상근무자',label:definitions[key][0],category:definitions[key][1],unit:definitions[key][2],sourceKind:'DERIVED',formula,clause})
 if(clock){const mins=(t:string)=>Number(t.slice(0,2))*60+Number(t.slice(3));derived('spanHours',(mins(clock[2])-mins(clock[1])+1440)%1440/60,'종업 - 시업','표준 시업·종업')}
 if(weekly)derived('averageMonthlyWork',Number(weekly[1])*365/7/12,'주 소정근로시간 × 365 ÷ 7 ÷ 12','소정근로시간 본문으로 월평균 환산')
 if(daily&&weekly&&Number(weekly[1])>=15&&/월요일부터\s*금요일까지/.test(text)&&/주휴일은\s*일요일/.test(text)){derived('weeklyPaidRestHours',Number(daily[1]),'통상 주5일 계약의 유급 주휴 1일 × 일 소정시간 (개근 요건 충족 시)','소정근로일·주휴일 기준');derived('averageMonthlyPaidRest',Number(daily[1])*365/7/12,'계약상 주 유급주휴시간 × 365 ÷ 7 ÷ 12','소정근로일·주휴일 기준')}
 if(/209\s*시간/.test(text))put('ordinaryMonthlyHours','209','209시간 명시 구절')
 if(pay)put('payrollDay',pay[1],'임금지급일 본문')
 // No fallback for missing provisions. Derived figures must be explicitly identified and reviewed.
 return rows
}
export function policyRegistry(ctx:PolicyContext,date:string):PolicyRegistryRow[]{
 const settings={...defaultWorkSettings,...ctx.info.workPlanning},values:Record<string,string>={payrollDay:String(ctx.info.defaultPayrollDay??25),holidayPayRule:settings.holidayPayRule,attendanceClose:settings.attendanceClose,payPeriodDescription:settings.payPeriodDescription,retirementPlan:settings.retirementPlan,leavePolicy:ctx.info.leavePolicy}
 const contracts=ctx.settings.map(s=>resolveContract(s,ctx.schedules.find(w=>w.id===s.workScheduleId),date)).filter(c=>c&&c.kind==='STANDARD')
 for(const key of contractKeys)values[key]=[...new Set(contracts.map(c=>{const value=({...c,...contractHours(c!)} as Record<string,unknown>)[key];return Array.isArray(value)?value.join(','):typeof value==='number'?String(Math.round(value*100)/100):String(value)}))].sort().join(' / ')
 return ctx.documents.flatMap(d=>(d.standards?.length?d.standards:[{key:'UNREAD',value:'',from:d.effectiveDate,to:d.effectiveTo??'',condition:''}]).map((s,i)=>{
  const actual=values[s.key]??'',match=s.value===actual,applicable=(!s.from||s.from<=date)&&(!s.to||s.to>=date),confirmed=authority(d,date).confirmed,unconditional=!s.condition||s.condition==='통상근무자'
  const state=!applicable?'적용 제외':!s.value||!actual?'미연결':!confirmed||!unconditional?'확인 필요':match?'일치':'불일치'
  return {id:d.id+':'+s.key+':'+i,documentId:d.id,version:d.version,title:d.title,category:s.category??definitions[s.key]?.[1]??'기타',key:s.key,label:s.label??definitions[s.key]?.[0]??s.key,ruleValue:s.value||'본문 추출 필요',actualValue:actual||'연결된 시스템 값 없음',unit:s.unit??definitions[s.key]?.[2]??'',from:s.from,to:s.to,condition:s.condition,clause:s.clause??'원문 조항 확인 필요',sourceKind:s.sourceKind??'LITERAL',formula:s.formula??'',state,mismatch:state==='불일치',sourcePath:contractKeys.includes(s.key)?'직원 관리 → 근태설정 → 근로계약':'급여설정 / 회사 운영일정'} satisfies PolicyRegistryRow
 }))
}
export function policyMarkdown(rows:PolicyRegistryRow[]){const esc=(s:unknown)=>String(s??'').replace(/\|/g,'\\|').replace(/\r?\n/g,' ');return '# HRIS 규정 기준표\n\n기준값과 실제 시스템 저장값을 대조한 열람용 사본입니다.\n\n|문서·버전|분류|코드|항목|규정값|시스템값|단위|상태|시행기간|대상|조항|명시·산식|연결 위치|\n|---|---|---|---|---|---|---|---|---|---|---|---|---|\n'+rows.map(r=>[r.title+' v'+r.version,r.category,r.key,r.label,r.ruleValue,r.actualValue,r.unit,r.state,r.from+' ~ '+r.to,r.condition,r.clause,r.sourceKind+' '+r.formula,r.sourcePath].map(esc).join('|')).map(s=>'|'+s+'|').join('\n')}
