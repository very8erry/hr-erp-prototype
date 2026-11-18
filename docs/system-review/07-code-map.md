# 요구사항·코드 구조 대응표

문서 1.0 · 분석 커밋 b4aeb300270a62273d3d5f0c2fea87f2a09ba800 · 관련 요구사항 R-01~17

| ID | 함수 | 구현 | 화면·서비스 참조 후보 | 저장 또는 출력 |
|---|---|---|---|---|
| R-01 | registerEmployee | src/infrastructure/db/indexedDb.ts:241 | src/app/App.tsx:106, src/modules/core-hr/hrService.ts:17 | persons, employments, assignments, compensations, auditLogs |
| R-02 | convertCandidate | src/infrastructure/db/indexedDb.ts:899 | src/modules/recruiting/OffersPanel.tsx:17, src/modules/payroll/payrollService.ts:22 | company.recruiting, persons, employments, assignments, compensations, auditLogs |
| R-03 | createPersonnelAction | src/infrastructure/db/indexedDb.ts:582 | src/modules/core-hr/EmployeeDetail.tsx:92, src/modules/core-hr/hrService.ts:54, src/modules/core-hr/hrService.ts:57 | personnelEvents, assignments, employments, auditLogs |
| R-04 | saveAttendanceBatch | src/infrastructure/db/indexedDb.ts:1049 | src/app/DataToolbar.tsx:18, src/modules/attendance/AttendanceTools.tsx:41, src/modules/attendance/AttendanceTools.tsx:56, src/modules/payroll/payrollService.ts:46 | attendanceDailyRecords, attendanceMonthlySummaries, payrollRuns, auditLogs |
| R-05 | closeAttendance | src/infrastructure/db/indexedDb.ts:933 | src/modules/attendance/AttendancePage.tsx:101, src/modules/payroll/payrollService.ts:34 | attendanceMonthlySummaries, company.attendanceClosed |
| R-06 | createPayrollRun | src/infrastructure/db/indexedDb.ts:631 | src/modules/payroll/PayrollPage.tsx:160, src/modules/payroll/payrollService.ts:67 | payrollRuns, payrollEntries |
| R-07 | calculatePayrollRun | src/infrastructure/db/indexedDb.ts:780 | src/modules/payroll/PayrollPage.tsx:109, src/modules/payroll/PayrollPage.tsx:127, src/modules/payroll/payrollService.ts:99 | payrollEntries, payrollResults, payrollRuns, auditLogs |
| R-08 | validatePayrollRun | src/infrastructure/db/indexedDb.ts:809 | src/modules/payroll/PayrollPage.tsx:128, src/modules/payroll/payrollService.ts:100 | payrollResults, payrollRuns, auditLogs |
| R-09 | setPayrollRunStatus | src/infrastructure/db/indexedDb.ts:822 | src/modules/payroll/PayrollPage.tsx:119, src/modules/payroll/PayrollPage.tsx:125, src/modules/payroll/PayrollPage.tsx:128, src/modules/payroll/payrollService.ts:101, src/modules/core-hr/hrService.ts:61 | payrollRuns, auditLogs |
| R-10 | setPayrollRunStatus | src/infrastructure/db/indexedDb.ts:822 | src/modules/payroll/PayrollPage.tsx:119, src/modules/payroll/PayrollPage.tsx:125, src/modules/payroll/PayrollPage.tsx:128, src/modules/payroll/payrollService.ts:101, src/modules/core-hr/hrService.ts:61 | payrollRuns, auditLogs |
| R-11 | setPayrollRunStatus | src/infrastructure/db/indexedDb.ts:822 | src/modules/payroll/PayrollPage.tsx:119, src/modules/payroll/PayrollPage.tsx:125, src/modules/payroll/PayrollPage.tsx:128, src/modules/payroll/payrollService.ts:101, src/modules/core-hr/hrService.ts:61 | payrollRuns, auditLogs |
| R-12 | upsertPayrollEntry | src/infrastructure/db/indexedDb.ts:754 | src/modules/payroll/PayrollPage.tsx:83, src/modules/payroll/PayrollPage.tsx:108, src/modules/payroll/PayrollPage.tsx:155, src/modules/payroll/payrollService.ts:77, src/modules/payroll/payrollService.ts:96 | payrollEntries, payrollResults, payrollRuns, auditLogs |
| R-13 | calculateRetirementSettlement | src/infrastructure/db/indexedDb.ts:1233 | src/modules/payroll/PayrollPage.tsx:99, src/modules/payroll/payrollService.ts:62 | retirementSettlements |
| R-14 | saveYearEndBatch | src/infrastructure/db/indexedDb.ts:1227 | src/modules/payroll/PayrollPage.tsx:100, src/modules/payroll/YearEndDocumentReview.tsx:13, src/modules/payroll/payrollService.ts:60 | yearEndTaxCases, auditLogs |
| R-15 | saveFilingForm | src/infrastructure/db/indexedDb.ts:733 | src/modules/payroll/FilingPanel.tsx:24, src/modules/payroll/payrollService.ts:49 | payrollRuns, auditLogs |
| R-16 | exportEdi | src/modules/payroll/ediFiling.ts:12 | src/modules/payroll/EdiInsuranceWorksheet.tsx:11, src/modules/payroll/EdiInsuranceWorksheet.tsx:19 | 브라우저 다운로드 파일 |
| R-17 | importDatabase | src/infrastructure/db/indexedDb.ts:1285 | src/app/DataToolbar.tsx:19, src/modules/core-hr/hrService.ts:28 | DatabaseExport.data 및 저장소 묶음 |
