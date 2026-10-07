import type {AnnualLeaveLedger,EmployeeView} from '../../domain/types'
export const annualHeaders=['연도','사번','개인','팀','직급','입사일','발생','이월','조정','사용','잔여','수정사유']
export const annualFields={grantedDays:'발생',carriedDays:'이월',adjustedDays:'조정',usedDays:'사용'} as const
export function annualValues(r:AnnualLeaveLedger,employees:EmployeeView[]){const e=employees.find(e=>e.employmentId===r.employmentId);return [r.year,e?.employeeNumber??'',e?.name??'',e?.organizationName??'',e?.grade??'',e?.hireDate??'',r.grantedDays,r.carriedDays,r.adjustedDays,r.usedDays,r.remainingDays,r.editReason??'연차 파일 정정']}
export function parseAnnualRows(data:Record<string,unknown>[],employees:EmployeeView[],existing:AnnualLeaveLedger[]):AnnualLeaveLedger[]{
 if(!data.length)throw new Error('연차 자료가 없습니다.');const seen=new Set<string>()
 return data.map((r,i)=>{const e=employees.find(e=>e.employeeNumber===String(r['사번']));if(!e||e.name!==String(r['개인']))throw new Error(`${i+2}행: 사번·개인을 확인하세요.`);const year=Number(r['연도']);const old=existing.find(a=>a.employmentId===e.employmentId&&a.year===year);if(!old)throw new Error(`${i+2}행: 기존 연차 연도를 유지하세요.`);if(seen.has(old.id))throw new Error('중복 연차 자료입니다.');seen.add(old.id);const next={...old,editReason:String(r['수정사유']??'')};for(const [k,label] of Object.entries(annualFields)){const v=r[label];if(v===''||v==null||typeof v==='object'||typeof v==='boolean'||!Number.isFinite(Number(v)))throw new Error(`${i+2}행: ${label}은 숫자로 입력하세요.`);Object.assign(next,{[k]:Number(v)})}return next})
}
