import {annualHeaders,annualValues,parseAnnualRows} from '../src/modules/attendance/annualLeaveFiles'
import {attendanceDailyHeaders,attendanceDailyValues,parseAttendanceDaily} from '../src/modules/attendance/dailyAttendanceFiles'
import {dailyWorkerHeaders,dailyWorkerValues,parseDailyWorkers} from '../src/modules/payroll/dailyWorkerFiles'
import {parsePayrollQueryRows} from '../src/modules/payroll/payrollColumns'
import {ledgerValues,parseLedgerRows,type LedgerColumn} from '../src/modules/payroll/ManualLedger'
import {payrollHeaders,payrollValues,parsePayrollRows} from '../src/modules/payroll/payrollColumns'
import {dailyHeaders,dailyValues,parseDailyRows} from '../src/modules/payroll/dailyFiles'
import assert from 'node:assert/strict'
import {exportTable,readTable,parseAttendance,attendanceRows,columns,type FileFormat} from '../src/modules/attendance/attendanceFiles'
import {createSeedBundle} from '../src/fixtures/seed'
let saved:Blob|undefined
let attached=false
Object.assign(globalThis,{document:{body:{appendChild(){attached=true}},createElement:()=>({href:'',download:'',hidden:false,click(){assert(attached)},remove(){attached=false}})}})
const actualTimer=globalThis.setTimeout;globalThis.setTimeout=((callback:()=>void,delay:number,...args:unknown[])=>{const timer=actualTimer(callback,delay,...args);if(delay===60000)timer.unref();return timer}) as typeof setTimeout
URL.createObjectURL=(blob:Blob)=>{saved=blob;return 'blob:test'};URL.revokeObjectURL=()=>{}
const seed=createSeedBundle();const employee={name:'검증 직원',employmentId:seed.employments[0].id,employeeNumber:seed.employments[0].employeeNumber,organizationName:'개발',grade:'대리',job:'개발'} as any
const summary=seed.attendanceMonthlySummaries.find(r=>r.employmentId===employee.employmentId)!
for(const format of ['csv','xlsx','json'] as FileFormat[]){
  const rows=attendanceRows([{...summary,editReason:'쉼표, "한글"\n수정'}],[employee])
  await exportTable('test',columns,rows,format)
  assert(saved);const file=new File([saved],`test.${format}`)
  const loaded=await readTable(file);const parsed=parseAttendance(loaded,[employee],[summary])
  assert.equal(parsed[0].workedHours,summary.workedHours);assert.equal(parsed[0].editReason,'쉼표, "한글"\n수정')
  loaded[0]['실근로시간']=199;assert.equal(parseAttendance(loaded,[employee],[summary])[0].workedHours,199)
  console.log(`PASS real ${format.toUpperCase()} writer→reader Korean numeric/text round trip`)
}

const run={id:'TEST',period:'2026-09',payDate:'2026-09-25',status:'DRAFT'} as any,entry={id:'TEST-ENTRY',runId:'TEST',employmentId:employee.employmentId,employeeNumberSnapshot:employee.employeeNumber,employeeNameSnapshot:employee.name,organizationNameSnapshot:'개발',gradeSnapshot:'대리',monthlyBasePay:3000000,prorationRate:1,taxableAllowance:0,nonTaxableAllowance:0,overtimePay:0,bonus:0,retroPay:0,otherEarnings:0,unpaidDeduction:0,otherDeductions:0,pensionBaseMonthly:3000000,healthBaseMonthly:3000000,employmentInsuranceBaseMonthly:3000000,incomeTaxManual:0,memo:'한글 메모',itemAmounts:{}} as any,worker=seed.dailyWorkers[0],daily=seed.dailyWorkRecords.find(r=>r.dailyWorkerId===worker.id)!
for(const format of ['csv','xlsx','json'] as FileFormat[]){
 await exportTable('payroll',payrollHeaders,[payrollValues({run,entry,result:null})],format)
 const data=await readTable(new File([saved!],`payroll.${format}`));assert.deepEqual(Object.keys(data[0]),payrollHeaders)
 data[0]['기타수당']=76543;data[0]['야간수당']=12000;data[0]['총지급']=999999999
 const next=parsePayrollRows(data,run,[entry])[0];assert.equal(next.otherEarnings,76543);assert.equal(next.itemAmounts?.P121,12000);assert.equal((next as any).grossPay,undefined)
 assert.throws(()=>parsePayrollRows([{...data[0],귀속월:'1900-01'}],run,[entry]))
 await exportTable('daily',dailyHeaders,[dailyValues(worker,daily)],format)
 const dailyData=await readTable(new File([saved!],`daily.${format}`));assert.deepEqual(Object.keys(dailyData[0]),dailyHeaders)
 dailyData[0]['기타수당']=50000;dailyData[0]['총지급']=999999999
 const nextDaily=parseDailyRows(dailyData,worker,[daily])[0];assert.equal(nextDaily.otherAllowance,50000);assert.equal(nextDaily.grossPay,Math.round(worker.dailyRate*daily.hours/8+50000))
 console.log(`PASS ${format.toUpperCase()} shared UI column order, payroll/daily value edit and computed-field isolation`)
}

const annual=seed.annualLeaveLedgers.find(r=>r.employmentId===employee.employmentId)!
const clockRecord={id:'day',employmentId:employee.employmentId,workDate:'2026-09-15',activity:'WORK',startTime:'09:00',endTime:'18:00',endNextDay:false,breakStart:'12:00',breakMinutes:60,holiday:false,absence:false,workedHours:8,overtimeHours:0,nightHours:0,holidayHours:0,holidayOvertimeHours:0,updatedAt:'',updatedBy:'HR_ADMIN',editReason:'출퇴근 증빙'} as any
const manual={id:'row',employmentId:'EMP',year:2026,amount:10000,tax:null},manualColumns:LedgerColumn<typeof manual>[]=[{label:'사번',key:'employmentId',identity:true},{label:'연도',key:'year',identity:true},{label:'수기 지급액',key:'amount',type:'number'},{label:'최종세액',key:'tax',type:'number',nullable:true}]
for(const format of ['csv','xlsx','json'] as FileFormat[]){
 await exportTable('annual',annualHeaders,[annualValues(annual,[employee])],format);const a=await readTable(new File([saved!],`annual.${format}`));assert.deepEqual(Object.keys(a[0]),annualHeaders);a[0]['발생']=21;a[0]['사용']=7;a[0]['조정']=-1;assert.equal(parseAnnualRows(a,[employee],[annual])[0].grantedDays,21);assert.equal(parseAnnualRows(a,[employee],[annual])[0].adjustedDays,-1)
 await exportTable('clock',attendanceDailyHeaders,[attendanceDailyValues(clockRecord,[employee])],format);const d=await readTable(new File([saved!],`clock.${format}`));assert.deepEqual(Object.keys(d[0]),attendanceDailyHeaders);d[0]['구간휴가']='연차';d[0]['휴가시작']='14:00';d[0]['휴가종료']='18:00';assert.equal(parseAttendanceDaily(d,[employee])[0].workedHours,4);assert.equal(parseAttendanceDaily(d,[employee])[0].leaveHours,4)
 await exportTable('workers',dailyWorkerHeaders,[dailyWorkerValues(worker,[daily],seed.organizations,'2026-01-01','2026-12-31')],format);const w=await readTable(new File([saved!],`workers.${format}`));assert.deepEqual(Object.keys(w[0]),dailyWorkerHeaders);w[0]['일급']=210000;assert.equal(parseDailyWorkers(w,[worker],seed.organizations)[0].dailyRate,210000)
 await exportTable('manual',manualColumns.map(c=>c.label),[ledgerValues(manual,manualColumns)],format);const m=await readTable(new File([saved!],`manual.${format}`));m[0]['수기 지급액']=21000;m[0]['최종세액']=300;assert.equal(parseLedgerRows(m,manualColumns,[manual])[0].amount,21000);assert.equal(parseLedgerRows(m,manualColumns,[manual])[0].tax,300)
 const row={run,entry,result:null};const payrollData=[Object.fromEntries(payrollHeaders.map((h,i)=>[h,payrollValues(row)[i]]))];payrollData[0]['국민연금 수기']=4321;payrollData[0]['월 기본급']=3123456;assert.equal(parsePayrollQueryRows(payrollData,[row])[0].insuranceOverrides?.nationalPension,4321);assert.equal(parsePayrollQueryRows(payrollData,[row])[0].monthlyBasePay,3123456)
 console.log(`PASS real ${format.toUpperCase()} annual/day-interval/daily-master/manual-settlement edit and shared order`)
}
