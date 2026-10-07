import assert from 'node:assert/strict'
import React from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import fs from 'node:fs'
import {payrollSummary,summaryTotal} from '../src/modules/payroll/UnifiedPayroll'
import {dayCounts,OperationsDashboard} from '../src/app/OperationsDashboard'
import {attendanceIssue,columns} from '../src/modules/attendance/attendanceFiles'
import {payrollHeaders} from '../src/modules/payroll/payrollColumns'
import {dailyWorkerHeaders} from '../src/modules/payroll/dailyWorkerFiles'
Object.assign(globalThis,{React})
const results=[{employmentId:'E1',grossPay:1000,incomeTax:100,localIncomeTax:10,nationalPension:20,healthInsurance:20,longTermCareInsurance:10,employmentInsurance:10,otherDeductions:30,totalDeductions:200,netPay:800},{employmentId:'E2',grossPay:2000,incomeTax:200,localIncomeTax:20,nationalPension:40,healthInsurance:40,longTermCareInsurance:20,employmentInsurance:20,otherDeductions:60,totalDeductions:400,netPay:1600}]
const service={runs:async()=>[{id:'1',period:'2026-01'},{id:'2',period:'2026-02'}],results:async(id:string)=>id==='1'?results:results.slice(0,1),dailyWorkRecords:async()=>[{dailyWorkerId:'D1',workDate:'2026-01-02',grossPay:200,netPay:180,incomeTax:18,localIncomeTax:2},{dailyWorkerId:'D1',workDate:'2026-01-03',grossPay:300,netPay:270,incomeTax:27,localIncomeTax:3},{dailyWorkerId:'D1',workDate:'2026-02-03',grossPay:100,netPay:90,incomeTax:9,localIncomeTax:1}]} as any
const summary=await payrollSummary(service);assert.equal(summary[0].workerIds.length,1);assert.equal(summary[0].employeeIds.length,2);assert.equal(summary[0].ded,650);assert.equal(summary[0].regular+summary[0].daily-summary[0].ded,summary[0].net)
const total=summaryTotal(summary);assert.equal(total.employeeIds.length,3);assert.equal(total.workerIds.length,2);assert.equal(total.regular+total.daily-total.ded,total.net);assert.equal(total.income+total.local+total.pension+total.health+total.care+total.employment+total.other,total.ded)
const days=[{employmentId:'A',workDate:'2026-10-05',activity:'WORK'},{employmentId:'B',workDate:'2026-10-05',activity:'SICK'},{employmentId:'C',workDate:'2026-10-05',activity:'OFF'},{employmentId:'D',workDate:'2026-10-05',activity:'ANNUAL_LEAVE'}] as any
assert.deepEqual(dayCounts(days,'2026-10-05'),{date:'2026-10-05',work:1,sick:1,off:1,annual:1,personal:0,weekend:0,statutory:1,other:0,recorded:4});assert.equal(dayCounts(days,'2026-10-04').recorded,0)
assert(attendanceIssue({scheduledHours:24,workedHours:16,leaveDays:0,absenceHours:8,lateMinutes:0,earlyLeaveMinutes:0} as any).includes('8.0時間'.replace('時間','시간')));assert.equal(attendanceIssue({scheduledHours:24,workedHours:24,leaveDays:0,absenceHours:0,lateMinutes:0,earlyLeaveMinutes:0} as any),'정상')
assert.deepEqual(columns.slice(0,7),payrollHeaders.slice(0,7));assert(!dailyWorkerHeaders.includes('상태'))
const dashboard=renderToStaticMarkup(<OperationsDashboard employees={[]} service={service}/>);for(const name of ['일년 대시보드','월별 대시보드','꺾은선 그래프','막대 그래프','전일','증감'])assert(dashboard.includes(name))
const app=fs.readFileSync('src/app/App.tsx','utf8'),daily=fs.readFileSync('src/modules/payroll/DailyWorkerPage.tsx','utf8'),attendance=fs.readFileSync('src/modules/attendance/AttendancePage.tsx','utf8'),payroll=fs.readFileSync('src/modules/payroll/PayrollPage.tsx','utf8'),scroll=fs.readFileSync('src/components/ScrollTable.tsx','utf8')
assert(!app.includes("view==='unified'"));assert(payroll.includes("['filing','원천세 신고'],['summary','급여요약'],['settings'"));assert(daily.includes("useState(seoulDate().slice(0,7)+'-01')"));assert(!daily.includes('회사정보_${reportMonth}.json'));assert(!attendance.includes('setPage'));assert(attendance.includes('전체 {filtered.length}건'));assert(fs.readFileSync('src/components/tableFreeze.ts','utf8').includes("==='직급'"));assert(app.includes('setDataRevision(v=>v+1);setSelectedId(null)'))
console.log('PASS monthly/yearly unique headcounts, deduction reconciliation, recorded-day categories, missing-day handling, dashboard chart markup, shared identity order, payroll summary location, report-only download, reset remount and grade freeze')
