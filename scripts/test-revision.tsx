import 'fake-indexeddb/auto'
import React from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {IndexedDbHrRepository} from '../src/infrastructure/db/indexedDb'
import {PayrollService} from '../src/modules/payroll/payrollService'
import {evaluateFormula,standardFormula} from '../src/modules/payroll/itemCalculation'
import {calculatePayrollEntry} from '../src/modules/payroll/payrollRules'
import {PayrollSettingsPanel} from '../src/modules/payroll/PayrollTools'
import {DailyWorkerPage} from '../src/modules/payroll/DailyWorkerPage'
import {ScrollTable} from '../src/components/ScrollTable'
import {attendanceRows,columns,parseAttendance} from '../src/modules/attendance/attendanceFiles'
import type {LeaveCase} from '../src/domain/types'
Object.assign(globalThis,{React})
assert.equal(evaluateFormula('floor10(max(0, 월기준급여 * 0.0475))',{월기준급여:3000000}),142500)
for(const expression of ['globalThis.process.exit()','1 / 0','1; alert(1)','未知','-1'])assert.throws(()=>evaluateFormula(expression,{}))
const repo=new IndexedDbHrRepository();await repo.initialize();const svc=new PayrollService(repo)
const run=await svc.createRun({period:'2026-09',payDate:'2026-09-25',note:'revision tests'}),entry=(await svc.entries(run.id)).find(e=>e.hireDateSnapshot<'2026-01-01'&&e.prorationRate===1)!
const originalItems=await svc.itemMasters();await svc.calculate(run.id)
const updated=originalItems.map(i=>i.code==='P101'?{...i,calculationMode:'FORMULA' as const,formula:'round(월기준급여 * 일할비율) + 12345'}:i.code==='P130'?{...i,calculationMode:'MANUAL' as const,manualAmount:54321}:i.code==='T103'?{...i,calculationMode:'MANUAL' as const,manualAmount:12340}:i)
await svc.saveSettings(updated);assert.equal((await svc.run(run.id))!.status,'DRAFT');assert.equal((await svc.results(run.id)).length,0)
const calculated=(await svc.calculate(run.id)).find(r=>r.employmentId===entry.employmentId)!
assert.equal(calculated.basePay,Math.round(entry.monthlyBasePay*entry.prorationRate)+12345);if(entry.nationalPensionEligible)assert.equal(calculated.nationalPension,12340)
const reference=calculatePayrollEntry(entry,run.period,originalItems);assert.equal(calculated.grossPay-reference.grossPay,12345+54321-entry.bonus)
const saved=await svc.itemMasters();assert.equal(saved.find(i=>i.code==='P101')!.formula,'round(월기준급여 * 일할비율) + 12345')
await assert.rejects(()=>svc.saveSettings(saved.map(i=>i.code==='P101'?{...i,formula:'1 / 0'}:i)));assert.deepEqual(await svc.itemMasters(),saved)
await svc.restoreSettings();const restored=(await svc.calculate(run.id)).find(r=>r.employmentId===entry.employmentId)!;assert.equal(restored.grossPay,reference.grossPay)
const itemsWithoutFixed=originalItems.map(i=>i.code==='P131'?{...i,calculationMode:'MANUAL' as const,manualAmount:200000}:i)
const manualExtra=calculatePayrollEntry({...entry,itemAmounts:{}},run.period,itemsWithoutFixed);const noExtra=calculatePayrollEntry({...entry,itemAmounts:{}},run.period,originalItems);assert.equal(manualExtra.grossPay-noExtra.grossPay,200000)
const disabled=calculatePayrollEntry(entry,run.period,updated,{P130:false});assert.equal(calculated.grossPay-disabled.grossPay,54321)
await assert.rejects(()=>svc.status(run.id,'PAID'),/마감 후/)
await svc.validate(run.id);await svc.status(run.id,'CONFIRMED');await svc.closeAttendance(run.period);await svc.status(run.id,'CLOSED');await svc.status(run.id,'PAID')
assert.equal((await svc.run(run.id))!.status,'PAID');assert((await svc.run(run.id))!.paidAt)
await assert.rejects(()=>svc.saveEntry({...entry,bonus:1}));await assert.rejects(()=>svc.calculate(run.id));await assert.rejects(()=>svc.deleteRun(run.id))
await svc.saveSettings(updated);assert.equal((await svc.run(run.id))!.status,'PAID');assert.equal((await svc.results(run.id)).find(r=>r.employmentId===entry.employmentId)!.grossPay,restored.grossPay)
const employees=await repo.listEmployees(),row=(await svc.attendance()).find(r=>r.employmentId===entry.employmentId&&r.period===run.period)!
const leave:LeaveCase={id:'test-leave',employmentId:row.employmentId,kind:'PARENTAL',startDate:'2026-09-01',endDate:'2026-09-30',companyPayRate:.5,pensionExceptionApproved:true,healthDeferred:true,healthPremiumOverride:null,employmentBaseOverride:0,benefitAmount:0,averageWageExcluded:true,yearEndNote:'검토',note:'검증',updatedAt:''}
const values=attendanceRows([row],employees,[leave])[0];assert.equal(values.length,columns.length);assert.equal(values[columns.indexOf('입사일')],entry.hireDateSnapshot);assert.equal(values[columns.indexOf('휴직 유형')],'육아휴직');assert(!columns.includes('회사 지급비율'));assert.deepEqual(columns.slice(0,7),['귀속월','지급일','사번','성명','팀','직급','입사일'])
// Old exports without new read-only columns still import unchanged.
const old=Object.fromEntries(['귀속월','사번','성명','팀','직급','직무','소정시간','실근로시간','연장시간','야간시간','휴일시간','휴가일수','결근시간','지각분','조퇴분','수정이력','수정사유'].map(h=>[h,values[columns.indexOf(h)]]));assert.equal(parseAttendance([old],employees,[row])[0].workedHours,row.workedHours)
const settings=renderToStaticMarkup(<PayrollSettingsPanel items={updated} onSave={async()=>{}} onRestore={async()=>{}}/>);assert(settings.includes('산출식 / 수기 금액'));assert(settings.includes('확인·수기 수정'));assert(settings.includes('round(월기준급여 * 일할비율) + 12345'));assert(!settings.includes('국민연금 기준'));assert(!settings.includes('마지막 수정일'))
const daily=renderToStaticMarkup(<DailyWorkerPage service={svc} organizations={[]} onNotice={()=>{}}/>);assert(daily.includes('일용직 목록 다운로드'));assert(daily.includes('일용직 목록 업로드'));assert(!daily.includes('기간 설정 후 조회'));assert(!daily.includes('Employee Master'))
const filter=daily.slice(daily.indexOf('class="filters dailyFilters"'),daily.indexOf('class="moduleTabs"'));assert(filter.includes('조회 시작일'));assert(filter.includes('조회 종료일'));assert(filter.includes('>조회</button>'))
const actions=daily.slice(daily.indexOf('class="payrollActions dailyActions"'),daily.indexOf('<input hidden'));for(const text of ['신고자료 확정','근로내용확인신고 내보내기','일용직 목록 다운로드','샘플 다운로드','일용직 목록 업로드'])assert(actions.includes(text))
const scrollbar=renderToStaticMarkup(<ScrollTable><table><tbody><tr><td>test</td></tr></tbody></table></ScrollTable>);assert(!scrollbar.includes('fixedXScroll'));assert(scrollbar.includes('dataTableViewport'))
const attendance=fs.readFileSync('src/modules/attendance/AttendancePage.tsx','utf8');assert(attendance.includes('setApplied({...filters})'));assert(attendance.includes('r.period<applied.from'));assert(!attendance.includes('마감 귀속월'));assert(!attendance.includes('LeaveCasesPanel'));assert(attendance.includes('allowLeaveRegistration&&leaveEditing'))
console.log('PASS actual formula/manual payroll calculation, persistence/atomic rejection/restore, stale snapshot invalidation, paid lifecycle and locks, leave/hire/termination export compatibility, rendered daily single-row controls/settings/native scrollbar')

const resetDaily=await svc.dailyWorkRecords();await svc.confirmRecords('daily',resetDaily.map(r=>r.id));for(const month of new Set(resetDaily.map(r=>r.workDate.slice(0,7))))await svc.closeDaily(month)
await repo.resetDemo();assert.deepEqual(await svc.dailyClosedPeriods(),{});assert((await svc.dailyWorkRecords()).every(r=>!r.confirmedAt));assert((await svc.attendance()).every(r=>!r.confirmedAt));assert.equal((await repo.getCompany()).attendanceClosed,undefined)
console.log('PASS initialization clears actual confirmed rows and daily/month closures')
