import fs from 'node:fs/promises'
import JSZip from 'jszip'
import ExcelJS from 'exceljs'
import assert from 'node:assert/strict'
import {createSeedBundle} from '../src/fixtures/seed'
import {defaultCompanyInfo} from '../src/modules/payroll/companyInfo'
import {calculateDailyWorkRecord} from '../src/modules/payroll/dailyWorkerRules'
import {holidays2026} from '../src/fixtures/scenarios'
import {buildWorkReport,reportRows} from '../src/modules/payroll/workReport'
const seed=createSeedBundle(), workers=seed.dailyWorkers.map(w=>({...w,job:'IT 이벤트 운영지원'})),records=seed.dailyWorkRecords.map(r=>{const w=workers.find(w=>w.id===r.dailyWorkerId)!;return calculateDailyWorkRecord(w,r.workDate,r.hours,'가상 IT 이벤트 운영지원',{otherAllowance:20000,holidayAllowance:holidays2026[r.workDate]?Math.round(w.dailyRate*.5):0})})
const template=await fs.readFile('public/work-report-template.xlsx'), data=await buildWorkReport(template,workers,records,'2026-09',defaultCompanyInfo)
const before=await JSZip.loadAsync(template),after=await JSZip.loadAsync(data)
for(const name of Object.keys(before.files))if(name!=='xl/worksheets/sheet1.xml'&&!before.files[name].dir)assert.deepEqual(await before.files[name].async('uint8array'),await after.files[name].async('uint8array'))
const book=new ExcelJS.Workbook();await book.xlsx.load(Buffer.from(data) as never);const sheet=book.getWorksheet('서식')!,values=reportRows(workers,records,'2026-09',defaultCompanyInfo)
assert.equal(sheet.rowCount,values.length+1);assert.deepEqual(['F2','G2','H2'].map(c=>sheet.getCell(c).value),['02','6847','3926']);assert.equal(sheet.getCell('AX2').value,'202609');assert.equal(sheet.getCell('AR2').value,values[0][43]);assert.equal(sheet.getCell('I2').value,'029')
await fs.writeFile('test-output/근로내용확인신고_2026-09_예시.xlsx',data)
console.log('PASS example report: original template parts intact, company phone, IT occupation, income, workdays and reporting month')
