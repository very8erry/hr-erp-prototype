import React from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import assert from 'node:assert/strict'
import {createSeedBundle} from '../src/fixtures/seed'
import {AnnualLeavePanel} from '../src/modules/attendance/AnnualLeavePanel'
import {AttendanceEditor,AttendanceCalendar,AttendanceBatchEditor} from '../src/modules/attendance/AttendanceTools'
import {SearchSelect} from '../src/components/SearchSelect'
import {EntryModal} from '../src/modules/payroll/PayrollEntryEditor'
import {annualHeaders} from '../src/modules/attendance/annualLeaveFiles'
import {EmployeeList} from '../src/app/App'
import {BatchEditModal} from '../src/modules/payroll/PayrollPage'
import {ManualLedger} from '../src/modules/payroll/ManualLedger'
import fs from 'node:fs'
Object.assign(globalThis,{React})
const seed=createSeedBundle(),employee={name:'검증 개인',employmentId:seed.employments[0].id,employeeNumber:seed.employments[0].employeeNumber,organizationName:'검증 팀',grade:'대리',job:'개발'} as any
const svc={} as any,noop=async()=>{}
const annual=renderToStaticMarkup(<AnnualLeavePanel rows={[seed.annualLeaveLedgers[0]]} employees={[employee]} service={svc} onChanged={noop}/>);assert(annual.includes('연차 수기 입력'));assert(annual.includes('수정 파일 업로드'));let previous=-1;for(const h of annualHeaders){const index=annual.indexOf(`<th>${h}</th>`);assert(index>previous);previous=index}
const monthly=seed.attendanceMonthlySummaries.find(r=>r.employmentId===employee.employmentId)!
const editor=renderToStaticMarkup(<AttendanceEditor row={monthly} employees={[employee]} service={svc} onClose={()=>{}} onSave={noop} onChanged={noop}/>);assert(editor.includes('일별 출퇴근·휴가 구간'));assert(editor.includes('일별 근무·휴가 수기 수정'))
const batch=renderToStaticMarkup(<AttendanceBatchEditor rows={[monthly]} employees={[employee]} service={svc} onClose={()=>{}} onSave={noop}/>);assert(batch.includes('일별 출퇴근·실근로 보기'))
const calendar=renderToStaticMarkup(<AttendanceCalendar initialMonth="2026-09" initialEmployee={employee.employmentId} employees={[employee]} service={svc} onClose={()=>{}} onSaved={noop}/>);assert(calendar.includes('연차'));assert(calendar.includes('휴무'));assert(calendar.includes('병가'));assert(calendar.includes('개인 일별 내역 다운로드'))
const search=renderToStaticMarkup(<SearchSelect label="조직" value="ALL" options={[{label:'전체 조직',value:'ALL'},{label:'개발팀',value:'dev'}]} onChange={()=>{}}/>);assert(search.includes('aria-haspopup="listbox"'));assert(search.includes('조직 선택'))
const entry={id:'T',runId:'R',employmentId:employee.employmentId,employeeNameSnapshot:'검증 개인',monthlyBasePay:3000000,prorationRate:1,taxableAllowance:0,nonTaxableAllowance:0,overtimePay:0,bonus:0,retroPay:0,otherEarnings:0,unpaidDeduction:0,otherDeductions:0,pensionBaseMonthly:3000000,healthBaseMonthly:3000000,employmentInsuranceBaseMonthly:3000000,incomeTaxManual:0,memo:''} as any
const payroll=renderToStaticMarkup(<EntryModal run={{period:'2026-09',payDate:'2026-09-25'} as any} entry={entry} result={null} onClose={()=>{}} onSave={noop} onDelete={noop}/>);assert(payroll.includes('월 기본급'));assert(payroll.includes('보험·지방소득세 수기 적용'));assert(payroll.includes('국민연금 수기'))
const ledger=renderToStaticMarkup(<ManualLedger title="검증" rows={[{id:'1',amount:100}]} columns={[{label:'금액',key:'amount',type:'number'}]} onSave={noop}/>);assert(ledger.includes('검증 수기 입력'));assert(ledger.includes('수정 파일 업로드'))
const core=renderToStaticMarkup(<EmployeeList employees={[{...employee,englishName:'',status:'TERMINATED',hireDate:'2020-01-01',terminationDate:'2026-01-31'}]} onSelect={()=>{}} leaveCases={[]}/>);assert(core.includes('<th>퇴사일</th>'));assert(core.includes('2026-01-31'));assert(core.includes('검색 분류'));for(const label of ['재직상태','조직','직무','직급'])assert(core.includes(label))
const app=fs.readFileSync('src/app/App.tsx','utf8'),css=fs.readFileSync('src/styles.css','utf8');assert(!app.includes('runtimeProof'));assert(!app.includes('조회대상'));assert(app.includes('<th>퇴사일</th>'));assert(css.includes('.compactColumns th,.compactColumns td,.attendanceTable th,.attendanceTable td{white-space:nowrap;padding:9px 12px'))
console.log('PASS rendered annual/attendance/payroll manual controls and shared table order; dropdown semantics, termination column, compact/no-wrap CSS and banner removal')

const settlement=renderToStaticMarkup(<ManualLedger title="퇴직정산" rows={[{id:'1',status:'CONFIRMED',year:2026,note:'근거'}]} columns={[{label:'귀속연도',key:'year'},{label:'상태',key:'status'},{label:'계산근거',key:'note'}]} onSave={noop} onCalculate={noop} onConfirm={noop}/>);assert(settlement.includes('confirmedRow'));assert(!settlement.includes('2,026'));assert(settlement.indexOf('<th>상태</th>')<settlement.indexOf('<th>추정 계산</th>'));assert(settlement.indexOf('<th>추정 계산</th>')<settlement.indexOf('<th>계산근거</th>'));assert(settlement.includes('샘플 다운로드'));assert(batch.includes('연차 · 날짜별 일괄 적용'));assert(batch.includes('휴무 · 날짜별 일괄 적용'));assert(batch.includes('병가 · 날짜별 일괄 적용'));assert(css.includes('.dataTableViewport{overflow-x:auto;overflow-y:auto;'))
console.log('PASS confirmation color/disabled controls, plain year, row estimate placement, sample buttons and daily-state batch options')

const batchPay=renderToStaticMarkup(<BatchEditModal entries={[{...entry,otherEarnings:123450}]} onClose={()=>{}} onSave={noop}/>);assert(batchPay.includes('value="123450"'));assert(batchPay.includes('123,450'));assert(batchPay.includes('현재 값'));assert(batchPay.includes('변경 내용 확인'))
const mixed=renderToStaticMarkup(<BatchEditModal entries={[{...entry,otherEarnings:123450},{...entry,id:'T2',otherEarnings:999}]} onClose={()=>{}} onSave={noop}/>);assert(mixed.includes('123,450'));assert(mixed.includes('999'));assert(mixed.includes('현재 값이 다르면'))
console.log('PASS batch payroll shows actual existing individual allowances; mixed values stay distinct')
