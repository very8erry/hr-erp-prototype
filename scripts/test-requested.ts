import {payrollSummary,summaryTotal} from '../src/modules/payroll/UnifiedPayroll'
import {summaryWorkbook} from '../src/modules/payroll/summaryExport'
import 'fake-indexeddb/auto'
import assert from 'node:assert/strict'
import {scenarioIds} from '../src/fixtures/scenarios'
import fs from 'node:fs/promises'
import JSZip from 'jszip'
import ExcelJS from 'exceljs'
import {IndexedDbHrRepository} from '../src/infrastructure/db/indexedDb'
import {PayrollService} from '../src/modules/payroll/payrollService'
import {buildWorkReport,reportRows} from '../src/modules/payroll/workReport'
import {leaveComparison} from '../src/modules/attendance/leaveComparison'
import {seoulDate} from '../src/modules/payroll/companyInfo'
const repo=new IndexedDbHrRepository();await repo.initialize();const svc=new PayrollService(repo)
const start=Date.now();await svc.ensureDemoHistory();console.log('Demo initialization seconds',(Date.now()-start)/1000)
const runs=await svc.runs();assert.equal(runs.length,21);assert(runs.some(r=>r.period==='2025-01'));assert(runs.some(r=>r.period==='2026-09'))
const summary=await payrollSummary(svc);assert(summary.some(r=>r.income>0));assert(new Set(summary.map(r=>r.employeeIds.length)).size>3);assert(new Set(summary.map(r=>r.regular)).size>12)
const headers=['귀속월','정규직 총인원','일용직 총인원','정규직 총지급','일용직 총지급','총지급','소득세','지방소득세','국민연금','건강보험','장기요양','고용보험','기타공제','총공제','실지급'],summaryValues=(r:typeof summary[number])=>[r.period,r.employeeIds.length,r.workerIds.length,r.regular,r.daily,r.regular+r.daily,r.income,r.local,r.pension,r.health,r.care,r.employment,r.other,r.ded,r.net]
const summarySheets=['2026','2025'].map(y=>{const rows=summary.filter(r=>r.period.startsWith(y));return {name:y+'년',headers,rows:rows.map(summaryValues),total:summaryValues(summaryTotal(rows))}}),summaryExcel=await summaryWorkbook(summarySheets)
await fs.mkdir('test-output',{recursive:true});await fs.writeFile('test-output/급여요약_예시.xlsx',Buffer.from(summaryExcel));const summaryBook=new ExcelJS.Workbook();await summaryBook.xlsx.load(summaryExcel as never);for(const data of summarySheets){const sheet=summaryBook.getWorksheet(data.name)!;assert.equal(sheet.rowCount,data.rows.length+2);assert.deepEqual(sheet.getRow(sheet.rowCount).values.slice(1),data.total);assert.equal(sheet.getCell('G2').value,data.rows[0][6])}
console.log('PASS generated history has varied monthly headcounts/pay, NTS income tax, and year-separated real Excel matching summary values/totals')
const daily=await svc.dailyAttendance();assert(daily.length>0);assert(daily.every(r=>r.workDate<=seoulDate()));assert(daily.some(r=>r.workDate==='2026-10-04'))
const employees=await repo.listEmployees(),ids=scenarioIds(employees),attendance=await svc.attendance(),cases=await svc.leaveCases();assert.equal((await repo.getCompany()).demoScenarioVersion,3);assert.equal(daily.find(r=>r.employmentId===ids.sick&&r.workDate==='2026-10-02')?.payTreatment,'PAID');assert(daily.find(r=>r.employmentId===ids.training&&r.workDate==='2026-10-01')?.attachments?.length);assert.equal(attendance.find(r=>r.employmentId===ids.sick&&r.period==='2026-10')?.absenceHours,0);assert(cases.some(c=>c.kind==='PARENTAL'));assert((await svc.results('PAYRUN-2026-08')).every(r=>r.netPay>=0));assert((await payrollSummary(svc)).every(r=>r.period!=='2026-10'));const latest=await svc.results('PAYRUN-2026-09');assert(latest.find(r=>r.employmentId===ids.maternity)!.grossPay>0);console.log('PASS persisted v074 cases, attachment bytes, corrected sick absence, parental payroll nonnegative, existing-run-only summary and maternity allowances')
const counts=[(await svc.attendance()).length,daily.length,(await svc.dailyWorkRecords()).length]
await svc.ensureDemoHistory();assert.deepEqual([(await svc.attendance()).length,(await svc.dailyAttendance()).length,(await svc.dailyWorkRecords()).length],counts)
const company={...await svc.companyInfo(),telephone:'02-1234-5678'};await svc.saveCompanyInfo(company);assert.equal((await svc.companyInfo()).telephone,'02-1234-5678')
const settings=await svc.settlements();settings[0]={...settings[0],visible:false,yearEnd:'2차분'};await svc.saveSettlements(settings);assert.deepEqual(await svc.settlements(),settings)
const period='2026-09',records=await svc.dailyWorkRecords(),workers=await svc.dailyWorkers();await assert.rejects(()=>svc.closeDaily(period),/확정/)
const rows=records.filter(r=>r.workDate.startsWith(period));await svc.confirmRecords('daily',rows.map(r=>r.id));await svc.closeDaily(period);await assert.rejects(()=>svc.saveDailyWorkRecord({...rows[0],workDate:'2026-09-30'}),/마감/)
assert.equal(runs.find(r=>r.period==='2026-09')?.status,'PAID');await assert.rejects(()=>svc.calculate('PAYRUN-2026-09'),/재계산/);assert(runs.every(r=>r.status==='PAID'));const future=await svc.createRun({period:'2026-10',payDate:'2026-10-25',note:'close sequencing test'});await assert.rejects(()=>svc.status(future.id,'CLOSED'),/근태 마감/);await svc.closeAttendance(period);assert.equal(await svc.isAttendanceClosed(period),true);await assert.rejects(async()=>svc.saveAttendanceBatch([(await svc.attendance()).find(r=>r.period===period)!],[],'test'),/마감/)
const comparison=leaveComparison('2022-05-10','2026-10-04',null);assert.equal(comparison.hire,73);assert(comparison.reversed);assert.equal(leaveComparison('2026-01-01','2026-10-04',null).hire,9)
assert.equal(leaveComparison('2022-05-10','2026-10-04','2023-05-09').hire,11);assert.equal(leaveComparison('2020-02-29','2021-02-28',null).hire,26)
const template=await fs.readFile('public/work-report-template.xlsx'),data=await buildWorkReport(template,workers,records,period,company)
const before=await JSZip.loadAsync(template),after=await JSZip.loadAsync(data);assert.deepEqual(Object.keys(after.files),Object.keys(before.files))
for(const name of Object.keys(before.files)){if(name!=='xl/worksheets/sheet1.xml'&&!before.files[name].dir)assert.deepEqual(await before.files[name].async('uint8array'),await after.files[name].async('uint8array'),name)}
const wb=new ExcelJS.Workbook();await wb.xlsx.load(Buffer.from(data) as never);const sheet=wb.getWorksheet('서식')!;const values=reportRows(workers,records,period,company);assert.equal(sheet.rowCount,values.length+1);assert.equal(sheet.getCell('F2').value,'02');assert.equal(sheet.getCell('G2').value,'1234');assert.equal(sheet.getCell('H2').value,'5678');assert.equal(sheet.getCell('AX2').value,'202609');assert.equal(sheet.getCell('AO2').value,values[0][40]);assert.equal(sheet.getCell('AR2').value,values[0][43]);assert(wb.getWorksheet('Sheet1')?.state==='hidden')
assert.equal(sheet.getCell('C2').value,'0000000000001');assert.equal((await after.file('xl/worksheets/sheet1.xml')!.async('string')).match(/<dataValidation /g)?.length,15)
const output=process.env.REPORT_EXAMPLE_DIR??'test-output';await fs.mkdir(output,{recursive:true});await fs.writeFile(output+'/근로내용확인신고_2026-09_예시.xlsx',data)
await repo.resetDemo();assert.deepEqual(await svc.dailyClosedPeriods(),{});assert((await svc.dailyWorkRecords()).every(r=>!r.confirmedAt));assert((await svc.attendance()).every(r=>!r.confirmedAt));assert.equal((await repo.getCompany()).attendanceClosed,undefined)
console.log('PASS reset clears daily confirmations/closures and attendance locks')
console.log('PASS 21-month history, idempotent daily accumulation, company/settings persistence, close sequencing and locks, anniversary/leap-day/reversal comparison, exact template preservation, company phone and output amounts')
