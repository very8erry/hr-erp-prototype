import type {Company,Organization,EmployeeView,RetirementSettlement,PayrollRun,PayrollResult,PayrollEntry} from '../../domain/types'
import {calendarSeed,hrCalendarSeed} from '../../modules/operations/scheduleData'
import {itOccupationSeed,codeForItJob} from '../../modules/operations/occupationDictionary'
import {retirementByPlan} from '../../modules/payroll/retirementCalculation'
import type {CalendarEvent,OccupationMapping,Issue} from '../../modules/operations/operations'
import {getAllFromStore,getOneFromStore,transactionDone} from './idbUtils'
import {STORES} from './config'
export async function upgradeLemonOperations(db:IDBDatabase,employees:EmployeeView[]){
 if(await getOneFromStore(db,STORES.meta,'lemonOps20261011'))return;
 const [company,events,mappings,orgs]=await Promise.all([getAllFromStore<Company>(db,STORES.company),getAllFromStore<CalendarEvent>(db,STORES.calendarEvents),getAllFromStore<OccupationMapping>(db,STORES.occupationCodeMappings),getAllFromStore<Organization>(db,STORES.organizations)]),imported=await getOneFromStore(db,STORES.meta,'importedData'),c=company[0],isDemo=c.id.startsWith('DEMO')&&!imported,now=new Date().toISOString();
 const tx=db.transaction([STORES.company,STORES.calendarEvents,STORES.occupationCodeMappings,STORES.organizations,STORES.issues,STORES.meta,STORES.auditLogs],'readwrite'),done=transactionDone(tx);
 for(const event of [...calendarSeed(),...hrCalendarSeed(2026),...hrCalendarSeed(2027)])if(!events.some(e=>e.id===event.id))tx.objectStore(STORES.calendarEvents).put(event);
 if(isDemo){
  if(c.name==='가상 넥스트코드 주식회사')tx.objectStore(STORES.company).put({...c,name:'lemonpAI',reportingInfo:c.reportingInfo?{...c.reportingInfo,name:'lemonpAI'}:undefined});
  orgs.filter(o=>o.name==='가상 넥스트코드 주식회사').forEach(o=>tx.objectStore(STORES.organizations).put({...o,name:'lemonpAI'}));
  for(const m of itOccupationSeed(employees))if(!mappings.some(old=>old.organizationId===m.organizationId&&old.job===m.job))tx.objectStore(STORES.occupationCodeMappings).put(m);
  const people=employees.filter(e=>!e.terminationDate&&e.hireDate<'2026-01-01').slice(4,6);
  for(const [i,e] of people.entries()){const issue:Issue={id:'ISS-LEMON-PERSONAL-'+i,occurredDate:'2026-10-01',employmentId:e.employmentId,organizationId:e.organizationId,category:i?'육아':'산재·요양',severity:'HIGH',title:i?'육아휴직 복귀 지원 준비':'산재 요양 신청·직무 복귀 검토',description:i?'가상 실습 이슈 · 복귀 면담·단축근무 신청자료 검토':'가상 실습 이슈 · 요양 승인서 확인·휴업급여 담당자 협의·복귀 계획 수립',sourceType:'MANUAL',sourceId:'LEMON-PERSONAL-'+i,status:'OPEN',manual:true,createdAt:now};tx.objectStore(STORES.issues).put(issue)}
 }
 tx.objectStore(STORES.meta).put({id:'lemonOps20261011',value:'1'});tx.objectStore(STORES.auditLogs).put({id:crypto.randomUUID(),occurredAt:now,actor:'SYSTEM',action:'ADD_LEMON_OPERATIONS',entityType:'DATABASE',entityId:c.id,detail:'공휴일·인사 일정·실습 직종 매핑·개인 이슈 추가. 기존 자료·확정 원장은 덮어쓰지 않음.'});await done
}
export async function seedLemonRetirement(db:IDBDatabase,employees:EmployeeView[]){
 if(await getOneFromStore(db,STORES.meta,'lemonRetirement20261011')||await getOneFromStore(db,STORES.meta,'importedData'))return;
 const companies=await getAllFromStore<Company>(db,STORES.company);if(!companies[0].id.startsWith('DEMO'))return;
 const [rows,runs,results,entries]=await Promise.all([getAllFromStore<RetirementSettlement>(db,STORES.retirementSettlements),getAllFromStore<PayrollRun>(db,STORES.payrollRuns),getAllFromStore<PayrollResult>(db,STORES.payrollResults),getAllFromStore<PayrollEntry>(db,STORES.payrollEntries)]),added:RetirementSettlement[]=[];
 for(const [i,e] of employees.filter(e=>e.terminationDate).entries()){
  if(rows.some(r=>r.employmentId===e.employmentId))continue;
  const end=e.terminationDate!,source=results.filter(r=>r.employmentId===e.employmentId),personEntries=entries.filter(r=>r.employmentId===e.employmentId),annual=source.filter(r=>runs.some(run=>run.id===r.runId&&run.period.startsWith(end.slice(0,4)))).reduce((n,r)=>n+r.grossPay,0),paid=Math.round(annual/12*.8),years=Math.max(0,(new Date(end).getTime()-new Date(e.hireDate).getTime())/86400000/365),plan=i%2?'DC':'DB';
  const basis:RetirementSettlement={id:'RET-'+e.employmentId,employmentId:e.employmentId,calculationDate:'2026-10-11',terminationDate:end,serviceDays:0,averageDailyWage:0,ordinaryDailyWage:Math.round(e.annualSalary/12/209*8),appliedDailyWage:0,retirementPay:0,status:'DRAFT',ruleVersion:'KR-RBA-2026-DB-DC-1',note:'실습용 퇴직정산',planType:plan,annualBonus:personEntries.filter(r=>runs.some(run=>run.id===r.runId&&run.period<=end.slice(0,7)&&run.period>=String(Number(end.slice(0,4))-1)+end.slice(4,7))).reduce((n,r)=>n+r.bonus,0),annualLeaveAllowance:0,excludedDays:0,excludedWages:0,weeklyContractHours:40,demoSource:true,...(plan==='DC'?{dcPaidContribution:paid,dcAccountBalance:Math.round(e.annualSalary/12*Math.max(0,years-Number(end.slice(5,7))/12))+paid}: {})};
  added.push({...basis,...retirementByPlan(e.hireDate,end,runs,source,personEntries,basis)})
 }
 const tx=db.transaction([STORES.retirementSettlements,STORES.meta,STORES.auditLogs],'readwrite'),done=transactionDone(tx);added.forEach(r=>tx.objectStore(STORES.retirementSettlements).put(r));tx.objectStore(STORES.meta).put({id:'lemonRetirement20261011',value:'1'});tx.objectStore(STORES.auditLogs).put({id:crypto.randomUUID(),occurredAt:new Date().toISOString(),actor:'SYSTEM',action:'ADD_DB_DC_DEMO',entityType:'RETIREMENT',entityId:'DEMO',detail:JSON.stringify({added:added.map(r=>r.id),preserved:rows.map(r=>r.id)})});await done
}

export async function repairLemonOccupationMapping(db:IDBDatabase,employees:EmployeeView[]){
 if(await getOneFromStore(db,STORES.meta,'lemonOccupation20261012')||await getOneFromStore(db,STORES.meta,'importedData'))return;
 const companies=await getAllFromStore<Company>(db,STORES.company);if(!companies[0]?.id.startsWith('DEMO'))return;
 const maps=await getAllFromStore<OccupationMapping>(db,STORES.occupationCodeMappings),fix=maps.filter(m=>m.id.startsWith('OCC-IT-')&&!m.manualOverride).flatMap(m=>{const e=employees.find(e=>e.organizationId===m.organizationId&&e.job===m.job);if(!e)return [];const code=codeForItJob(e.job,e.organizationName);return code===m.defaultOccupationCode?[]:[{...m,defaultOccupationCode:code}]});
 const tx=db.transaction([STORES.occupationCodeMappings,STORES.meta],'readwrite'),done=transactionDone(tx);fix.forEach(m=>tx.objectStore(STORES.occupationCodeMappings).put(m));tx.objectStore(STORES.meta).put({id:'lemonOccupation20261012',value:'1'});await done
}
