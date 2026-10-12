import 'fake-indexeddb/auto'
import assert from 'node:assert/strict'
import React from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {retirementByPlan} from '../src/modules/payroll/retirementCalculation'
import {occupationDictionary,codeForItJob} from '../src/modules/operations/occupationDictionary'
import {calendarSeed,hrCalendarSeed,nextBusinessDay} from '../src/modules/operations/scheduleData'
import {dayPolicy} from '../src/modules/operations/operations'
import {HeadcountChart,ChangeChart} from '../src/app/DashboardCharts'
import {IndexedDbHrRepository} from '../src/infrastructure/db/indexedDb'
import {seedLemonRetirement,upgradeLemonOperations,repairLemonOccupationMapping} from '../src/infrastructure/db/lemonUpgrade'
import {DB_NAME,DB_VERSION,STORES} from '../src/infrastructure/db/config'
import {getAllFromStore,getOneFromStore,transactionDone} from '../src/infrastructure/db/idbUtils'
import {RetirementPanel} from '../src/modules/payroll/SettlementPanels'
Object.assign(globalThis,{React})
const basis:any={planType:'DB',annualBonus:0,annualLeaveAllowance:0,ordinaryDailyWage:200000,weeklyContractHours:40};
const runs:any[]=Array.from({length:9},(_,i)=>({id:'R'+i,period:'2026-'+String(i+1).padStart(2,'0')}));
const results:any[]=runs.map(r=>({runId:r.id,employmentId:'A',grossPay:5000000}));
const db=retirementByPlan('2023-10-01','2026-09-30',runs,results,[],basis);
assert.equal(db.calendarDays,92);assert(Math.abs(db.averageDailyWage-15000000/92)<0.000001);assert.equal(db.appliedDailyWage,200000);assert.equal(db.retirementPay,Math.round(200000*30*1096/365));assert.equal(db.reviewRequired,false);
const dcBasis:any={...basis,planType:'DC',dcPaidContribution:3000000,dcAccountBalance:12000000};
const dc=retirementByPlan('2023-10-01','2026-09-30',runs,results,[],dcBasis);
assert.equal(dc.dcRequiredContribution,3750000);assert.equal(dc.dcUnpaidContribution,750000);assert.equal(dc.retirementPay,12750000);assert.equal(dc.reviewRequired,false);assert.notEqual(dc.retirementPay,db.retirementPay);
assert.equal(retirementByPlan('2023-10-01','2026-09-30',runs,[...results,{runId:'OLD',grossPay:999999999}],[],dcBasis).dcRequiredContribution,3750000);
assert.equal(retirementByPlan('2025-10-01','2026-09-30',runs,results,[],basis).retirementPay,6000000); // Inclusive full year
assert.equal(retirementByPlan('2025-10-02','2026-09-30',runs,results,[],basis).retirementPay,0);
assert.equal(retirementByPlan('2023-10-01','2026-09-30',runs,results,[],{...basis,weeklyContractHours:14}).retirementPay,0);
assert.equal(retirementByPlan('2023-10-01','2026-09-30',runs,results,[],{...dcBasis,dcPaidContribution:5000000}).dcUnpaidContribution,0);
assert(retirementByPlan('2023-10-01','2026-09-30',runs,results.slice(1),[],{...dcBasis,dcAccountBalance:null}).reviewRequired);
assert.equal(retirementByPlan('2023-10-01','2026-09-30',runs,results,[],{...dcBasis,dcAnnualWages:60000000}).dcRequiredContribution,5000000);
assert.throws(()=>retirementByPlan('2023-10-01','2026-09-30',runs,results,[],{...dcBasis,dcExcludedMonths:3}),/별도 산정/);
assert.throws(()=>retirementByPlan('2023-10-01','2026-09-30',runs,results,[],{...dcBasis,interimSettlementDate:'2025-12-31'}),/DC형/);
const full=retirementByPlan('2020-01-01','2026-12-31',runs,results,[],{...dcBasis,dcAnnualWages:48000000,dcExcludedMonths:3,dcExcludedWages:12000000});assert.equal(full.dcRequiredContribution,4000000);
assert.equal(occupationDictionary.length,136);assert.equal(new Set(occupationDictionary.map(r=>r.code)).size,136);assert.equal(codeForItJob('백엔드 개발','플랫폼팀'),'133');assert.equal(codeForItJob('데이터 엔지니어','데이터팀'),'134');assert.equal(codeForItJob('정보보안','보안팀'),'135');assert.equal(codeForItJob('영업','인사운영팀'),'612');assert.equal(codeForItJob('회계','제품기획팀'),'027');
assert.equal(nextBusinessDay('2026-10-10'),'2026-10-12');assert.equal(nextBusinessDay('2026-03-15'),'2026-03-16');assert(hrCalendarSeed(2026).some(e=>e.startDate==='2026-10-12'&&e.title.includes('원천세')));assert(dayPolicy('2026-07-17',calendarSeed()).off);assert(dayPolicy('2026-10-03',calendarSeed()).off);assert(!dayPolicy('2026-10-06',calendarSeed()).off);assert(calendarSeed().some(e=>e.startDate==='2027-02-09'));
const chart=renderToStaticMarkup(<HeadcountChart rows={[{period:'2026-01',active:193,hired:3,terminated:10}]}/>);for(const n of ['0','50','100','150','200'])assert(chart.includes('>'+n+'</text>'));assert(chart.includes('data-chart-period="2026-01"'));assert(chart.includes('tabindex="0"'));
const change=renderToStaticMarkup(<ChangeChart rows={[]} records={[]}/>);assert(change.includes('출근자 제외'));assert(!change.includes('● 출근'));
const repo=new IndexedDbHrRepository();await repo.initialize();const employees=await repo.listEmployees(),request=indexedDB.open(DB_NAME,DB_VERSION),idb=await new Promise<IDBDatabase>((resolve,reject)=>{request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)});
const terminated=employees.filter(e=>e.terminationDate);assert(terminated.length>2);
const saved:any={...basis,id:'USER-RET',employmentId:terminated[0].employmentId,terminationDate:terminated[0].terminationDate,retirementPay:123456,status:'CONFIRMED',note:'user-preserve'};
let tx=idb.transaction([STORES.retirementSettlements,STORES.calendarEvents],'readwrite'),done=transactionDone(tx);tx.objectStore(STORES.retirementSettlements).put(saved);tx.objectStore(STORES.calendarEvents).put({...calendarSeed()[0],title:'사용자 변경 공휴일'});await done;
await seedLemonRetirement(idb,employees);const rows=await getAllFromStore<any>(idb,STORES.retirementSettlements);assert.deepEqual(rows.find(r=>r.id==='USER-RET'),saved);assert(rows.some(r=>r.planType==='DB'&&r.demoSource));assert(rows.some(r=>r.planType==='DC'&&r.demoSource));
await seedLemonRetirement(idb,employees);assert.deepEqual(await getAllFromStore(idb,STORES.retirementSettlements),rows);
// Re-run additive operations upgrade to verify saved events and mappings survive.
tx=idb.transaction([STORES.meta,STORES.occupationCodeMappings],'readwrite');done=transactionDone(tx);tx.objectStore(STORES.meta).delete('lemonOps20261011');const custom={id:'USER-OCC',organizationId:employees[0].organizationId,job:employees[0].job,defaultOccupationCode:'132',effectiveFrom:'2025-01-01',source:'user',manualOverride:true};tx.objectStore(STORES.occupationCodeMappings).put(custom);await done;await upgradeLemonOperations(idb,employees);await repairLemonOccupationMapping(idb,employees);assert.deepEqual(await getOneFromStore(idb,STORES.occupationCodeMappings,'USER-OCC'),custom);assert.equal((await getOneFromStore<any>(idb,STORES.calendarEvents,calendarSeed()[0].id)).title,'사용자 변경 공휴일');
const dcDraft=rows.find(r=>r.planType==='DC'&&r.demoSource);tx=idb.transaction(STORES.retirementSettlements,'readwrite');done=transactionDone(tx);tx.objectStore(STORES.retirementSettlements).delete(dcDraft.id);tx.objectStore(STORES.retirementSettlements).put({...dcDraft,id:'CUSTOM-DC',dcAnnualWages:48000000,dcPaidContribution:3000000,dcAccountBalance:12000000});await done;const recalculated=await repo.calculateRetirementSettlement(dcDraft.employmentId);assert.equal(recalculated.id,'CUSTOM-DC');assert.equal(recalculated.retirementPay,13000000);assert.equal((await repo.listRetirementSettlements()).filter(r=>r.employmentId===dcDraft.employmentId).length,1);await assert.rejects(()=>repo.calculateRetirementSettlement(saved.employmentId),/확정/);
const markup=renderToStaticMarkup(<RetirementPanel rows={rows} employees={employees} onSave={async()=>{}} onCalculate={async()=>{}} onConfirm={async()=>{}}/>);assert(markup.includes('DC 법정부담금'));assert(markup.includes('DB · 확정급여형'));assert(markup.includes('DC · 확정기여형'));
idb.close();console.log('PASS lemonpAI: DB/DC independent calculations, inclusive one-year eligibility, incomplete-source review, exclusion guards, 136 official occupation codes, business-day schedules, chart 50-unit ticks/accessibility, additive/idempotent DB+DC dummy seeding and confirmed/custom data preservation')
