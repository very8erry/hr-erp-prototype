import React from 'react'
import 'fake-indexeddb/auto'
import assert from 'node:assert/strict'
import {renderToStaticMarkup} from 'react-dom/server'
import {readFileSync} from 'node:fs'
import {IndexedDbHrRepository} from '../src/infrastructure/db/indexedDb'
import {PayrollService} from '../src/modules/payroll/payrollService'
import {ediFields,emptyEdi,validateEdi,exportEdi,readEdi} from '../src/modules/payroll/ediFiling'
import {activeSchedules,schedulesForDay,scheduleTopic} from '../src/modules/operations/schedulePresentation'
import {exportSchedules} from '../src/modules/operations/ScheduleExports'
import {PeriodCalendar} from '../src/modules/operations/PeriodCalendar'
import {annualPromotion,makeTask} from '../src/modules/operations/workSchedule'
import {CompanyInfoPage} from '../src/modules/payroll/CompanyInfoPage'
import ExcelJS from 'exceljs'
Object.assign(globalThis,{React})
const repo=new IndexedDbHrRepository();await repo.initialize();const service=new PayrollService(repo),info=await service.companyInfo(),employees=await repo.listEmployees();
assert.equal(info.email,'lemonpai314@lemonpai314.com');assert.equal(info.industrialAccidentEmployerRate,.66);assert.equal(info.employmentInsuranceEmployerAdditionalRate,.65);assert(employees.filter(e=>e.email).every(e=>e.email.endsWith('@lemonpai314.com')));
await service.populateWorkYear(2026);const events=(await service.operations()).calendarEvents,anniversary=schedulesForDay(events,'2026-11-05').find(e=>e.title==='회사 창립기념일');assert(anniversary);assert.equal(anniversary.scope,'COMPANY');assert.equal(anniversary.affectsAttendance,false);assert.equal(activeSchedules([anniversary,anniversary]).length,1);
const safety=events.find(e=>/안전보건 규정/.test(e.title))!;assert.equal(scheduleTopic(safety),'안전보건');const calendar=renderToStaticMarkup(<PeriodCalendar month="2026-11" events={[safety,anniversary]} topicsOnly onSelect={()=>{}}/>);assert(calendar.includes('안전보건'));assert(!calendar.includes('<span>안전보건 규정'));assert(calendar.includes('aria-label="2026-11-05"'));
const companyHtml=renderToStaticMarkup(<CompanyInfoPage employees={employees} service={service} onNotice={()=>{}}/>);for(const removed of ['이직사유 기본값','고지 근거 / 출처','기능설정','보험구분'])assert(!companyHtml.includes(removed));assert(companyHtml.includes('회사 공용 이메일'));assert(companyHtml.includes('공지게시판'));
const person=employees[0],master=await repo.getEmployeeMaster(person.employmentId);assert(master);if(master.socialInsuranceProfile){await repo.editMaster({employmentId:person.employmentId,section:'insurance',values:{departureReasonCode:'32',departureReason:'가상 프로젝트 계약기간 만료'},reason:'이직사유 저장 검증'});const next=await repo.getEmployeeMaster(person.employmentId);assert.equal(next?.socialInsuranceProfile?.departureReasonCode,'32');assert.equal((await repo.listEmployees()).find(e=>e.employmentId===person.employmentId)?.departureReason,'가상 프로젝트 계약기간 만료')}
const promotion=annualPromotion(makeTask('PROMO-TEST','2026-12-31','직원별 연차 사용촉진','연차',[],person.employmentId),'2026-12-31','일반','LEDGER-TEST');assert.equal(promotion.startDate,'2026-07-01');assert.equal(promotion.work?.stages.length,4);assert(promotion.work?.stages[2].title.includes('시기 지정'));
assert.equal(ediFields('ACQUISITION').length,39);assert.equal(ediFields('LOSS').length,22);assert.throws(()=>validateEdi('ACQUISITION',[emptyEdi('ACQUISITION')]),/공단구분/);assert.throws(()=>validateEdi('LOSS',[{...emptyEdi('LOSS'),c0:'YYYY',c1:'가상 검증',c2:'SYN-TEST'}]),/등록번호/);
const row={...emptyEdi('LOSS'),c0:'YNNN',c1:'파일형식검증',c2:'0000000000000',c4:'2026-11-01',c5:'03',c6:'2'};assert.equal(validateEdi('LOSS',[row])[0].c4,'20261101'); // Pattern-only zero dummy; never submit to agency.
const blobs:Blob[]=[],originalSetTimeout=globalThis.setTimeout;Object.assign(globalThis,{setTimeout:()=>0,URL:Object.assign(URL,{createObjectURL:(b:Blob)=>{blobs.push(b);return 'blob:qa'},revokeObjectURL:()=>{}}),document:{createElement:()=>({click(){},remove(){}}),body:{appendChild(){}}}});
for(const kind of ['ACQUISITION','LOSS'] as const){await exportEdi(kind,[],true);const data=blobs.pop()!,book=new ExcelJS.Workbook();await book.xlsx.load(await data.arrayBuffer());assert.equal(book.worksheets[0].columnCount,ediFields(kind).length);const parsed=await readEdi(new File([data],'sample.xlsx'),kind).catch(e=>e);assert(parsed instanceof Error);}
await exportEdi('LOSS',[row]);let data=blobs.pop()!,book=new ExcelJS.Workbook();await book.xlsx.load(await data.arrayBuffer());assert.equal(book.worksheets[0].rowCount,1);assert.equal(book.worksheets[0].getCell(1,1).value,'YNNN');assert.equal(book.worksheets[0].getCell(1,3).value,'0000000000000');const imported=await readEdi(new File([data],'loss.xlsx'),'LOSS');assert.equal(imported[0].c2,'0000000000000');
for(const mode of ['calendar','list'] as const){await exportSchedules('2026-11',[anniversary,safety],mode);data=blobs.pop()!;book=new ExcelJS.Workbook();await book.xlsx.load(await data.arrayBuffer());assert(book.worksheets[0].rowCount>1);if(mode==='calendar'){assert.equal(book.worksheets[0].columnCount,7);assert(JSON.stringify(book.worksheets[0].model).includes('회사 창립기념일'))}else assert.equal(book.worksheets[0].getCell(1,1).value,'분야')}
Object.assign(globalThis,{setTimeout:originalSetTimeout});
const css=readFileSync('src/styles.css','utf8');assert(css.includes('padding-right:1cm!important'));assert(css.includes('.columnFilterModal table.columnChooser{min-width:0!important;width:max-content!important'));assert(css.includes('.columnFilterModal table.columnChooser th:not(:first-child)'));assert(css.includes('.compactLog td'));const app=readFileSync('src/app/App.tsx','utf8');assert(app.includes("view==='issues'"));assert(!app.includes('>감사로그<'));assert(!app.includes("'인사평가','보상'"));
console.log('PASS v078: safe/idempotent company migration, anniversary calendar linkage, topic/day projection, employee occupation/reason sources, annual promotion stages, exact NHIS 39/22 columns, headerless XLSX and zero-prefixed ID round trip, calendar/list XLSX, compact/filter UI contracts')
