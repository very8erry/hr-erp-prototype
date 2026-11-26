import type {PolicyDocument} from '../operations/operations'
import {fingerprint} from '../operations/planningReview'
import type {EmployeeRegistration} from './nameValidation'

// Training baseline extracted from the supplied notice attachment, not a statutory approval.
export const registrationBaseline={dailyHours:8,weeklyHours:40,ordinaryMonthlyHours:209,startTime:'09:00',endTime:'18:00',breakMinutes:60}
export const policyKeys=Object.keys(registrationBaseline) as (keyof typeof registrationBaseline)[]
export function registrationRules(docs:PolicyDocument[],date:string){
 const values={...registrationBaseline},sources=['NOTICE-WORK-RULES-202610 · 첨부 제29조 / 급여 환산 209시간'],warnings:string[]=[]
 const applicable=docs.filter(d=>d.status==='적용'&&!d.reviewRequired&&(!d.notice||d.notice.state==='게시')&&d.effectiveDate&&d.effectiveDate<=date&&(!d.effectiveTo||d.effectiveTo>=date))
 for(const key of policyKeys){
  const rows=applicable.flatMap(d=>(d.standards??[]).filter(s=>s.key===key&&s.from<=date&&(!s.to||s.to>=date)).map(s=>({d,s})))
  const unconditional=rows.filter(r=>!r.s.condition.trim()||r.s.condition==='통상근무자')
  if(rows.length!==unconditional.length)warnings.push(`${key}: 대상별 적용조건 확인 필요`)
  if(new Set(unconditional.map(r=>r.s.value)).size>1){warnings.push(`${key}: 공지 운영기준 충돌, 재검토 요망`);continue}
  const row=unconditional[0];if(!row)continue
  const value=typeof values[key]==='number'?Number(row.s.value):row.s.value
  if(typeof value==='number'&&(!Number.isFinite(value)||value<=0)||typeof value==='string'&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)){warnings.push(`${key}: 공지 운영기준 형식 확인 필요`);continue}
  Object.assign(values,{[key]:value});sources.push(`${row.d.id} v${row.d.version} · ${key}`)
 }
 return {values,sources,warnings,signature:fingerprint({values,sources,warnings})}
}
export function reviewRegistrationPolicy(input:EmployeeRegistration,docs:PolicyDocument[]){
 const rule=registrationRules(docs,input.hireDate),hours={...registrationBaseline,...input.workTerms}
 const labels:Record<string,string>={dailyHours:'1일 소정근로시간',weeklyHours:'주 소정근로시간',ordinaryMonthlyHours:'월 급여 환산시간',startTime:'시업시간',endTime:'종업시간',breakMinutes:'휴게시간'}
 const warnings=[...rule.warnings,...policyKeys.filter(k=>hours[k]!==rule.values[k]).map(k=>`${labels[k]} 상이, 재검토 요망 (입력 ${hours[k]} / 공지 기준 ${rule.values[k]})`)]
 return {...rule,hours,warnings}
}
export function validateWorkTerms(input:EmployeeRegistration){
 const t={...registrationBaseline,...input.workTerms},minutes=(s:string)=>{if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(s))throw new Error('시업·종업시간 형식을 확인하세요.');return Number(s.slice(0,2))*60+Number(s.slice(3))}
 if([t.dailyHours,t.weeklyHours,t.ordinaryMonthlyHours,t.breakMinutes].some(v=>!Number.isFinite(v)||v<=0)||t.dailyHours>8||t.weeklyHours>40||t.ordinaryMonthlyHours>300||t.weeklyHours!==t.dailyHours*5||minutes(t.endTime)-minutes(t.startTime)-t.breakMinutes!==t.dailyHours*60||t.breakMinutes<(t.dailyHours>=8?60:t.dailyHours>=4?30:0))throw new Error('근무시간·주 5일 합계·휴게시간을 확인하세요. 단축계약은 소정시간과 시업·종업을 함께 조정하세요.')
 return t
}
