import type {SeedBundle} from './types'
export interface IntegrityFinding {store:string;id:string;code:string}
export function inspectIntegrity(data:SeedBundle):IntegrityFinding[]{
 const findings:IntegrityFinding[]=[]
 const add=(store:string,id:string,code:string)=>findings.push({store,id,code})
 const persons=new Set(data.persons.map(r=>r.id)),employments=new Set(data.employments.map(r=>r.id)),runs=new Map(data.payrollRuns.map(r=>[r.id,r]))
 for(const [store,rows] of Object.entries(data))if(Array.isArray(rows)){
  const seen=new Set<string>();for(const r of rows){if(seen.has(r.id))add(store,r.id,'DUPLICATE_ID');seen.add(r.id)}
 }
 for(const e of data.employments){if(!persons.has(e.personId))add('employments',e.id,'MISSING_PERSON');if(!e.companyId)add('employments',e.id,'COMPANY_REVIEW');else if(e.companyId!==data.company.id)add('employments',e.id,'UNKNOWN_COMPANY')}
 for(const store of ['assignments','compensations','attendanceMonthlySummaries','attendanceDailyRecords','payrollEntries','payrollResults'] as const){
  for(const r of data[store]??[])if(!employments.has(r.employmentId))add(store,r.id,'MISSING_EMPLOYMENT')
 }
 for(const store of ['payrollEntries','payrollResults'] as const)for(const r of data[store]){
  if(!runs.has(r.runId))add(store,r.id,'MISSING_RUN')
  if(store==='payrollResults'&&!data.payrollEntries.some(e=>e.runId===r.runId&&e.employmentId===r.employmentId))add(store,r.id,'MISSING_PAYROLL_ENTRY')
 }
 for(const [store,keys] of [
  ['employments',['employeeNumber']],['payrollRuns',['period']],['payrollEntries',['runId','employmentId']],['payrollResults',['runId','employmentId']],['attendanceMonthlySummaries',['employmentId','period']],['attendanceDailyRecords',['employmentId','workDate']]
 ] as const){
  const seen=new Set<string>();for(const row of data[store]??[]){
   const r=row as unknown as Record<string,string>,key=JSON.stringify(keys.map(k=>r[k]));
   if(seen.has(key))add(store,r.id,'DUPLICATE_BUSINESS_KEY');seen.add(key)
  }
 }
 for(const store of ['assignments','compensations'] as const){
  const groups=new Map<string,Array<{id:string;employmentId:string;effectiveFrom:string;effectiveTo:string|null}>>();
  for(const row of data[store]){const list=groups.get(row.employmentId)??[];list.push(row);groups.set(row.employmentId,list)}
  for(const rows of groups.values()){rows.sort((a,b)=>a.effectiveFrom.localeCompare(b.effectiveFrom));let end='';for(const r of rows){if(r.effectiveFrom<=end)add(store,r.id,'OVERLAPPING_PERIOD');if(r.effectiveTo&&r.effectiveTo<r.effectiveFrom)add(store,r.id,'INVALID_PERIOD');end=end>(r.effectiveTo??'9999-12-31')?end:r.effectiveTo??'9999-12-31'}}
 }
 return findings
}
export function companyRepairs(data:Pick<SeedBundle,'company'|'persons'|'employments'|'organizations'|'assignments'>){
 const persons=new Set(data.persons.map(p=>p.id)),orgs=new Map(data.organizations.map(o=>[o.id,o.companyId]));
 return data.employments.filter(e=>!e.companyId&&persons.has(e.personId)).flatMap(e=>{
  const history=data.assignments.filter(a=>a.employmentId===e.id),ids=history.map(a=>orgs.get(a.organizationId));
  return history.length&&ids.every(id=>id===data.company.id)?[{...e,companyId:data.company.id}]:[]
 })
}
