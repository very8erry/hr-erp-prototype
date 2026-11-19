# DOC-06　요구사항·코드 대응표

v1.0 · 2026-11-19 · b4aeb300270a62273d3d5f0c2fea87f2a09ba800

독자　PM·개발·QA

목적과 범위　DOC-06.csv의 각 행이 한 요구에 대응한다. 같은 실행 시험이 여러 요구의 일부를 뒷받침할 수 있다.


| 요구 | 규칙 | 주요 필드 | 시험 | 판정 | 과제 |
|---|---|---|---|---|---|
| R01 | BR01 | employments.personId / companyId | T01 | 충족 | — |
| R02 | BR02 | company.recruiting.candidates / employmentId | T02 | 충족 | — |
| R03 | BR03 | personnelEvents.sourceAssignmentId / effectiveDate | T03 | 충족 | — |
| R04 | BR04 | attendanceMonthlySummaries.revision / attendanceDailyRecords.updatedAt | T04 | 충족 | — |
| R05 | BR05 | company.attendanceClosed[period] / confirmedAt | T05 | 충족 | A04 |
| R06 | BR06 | payrollEntries.runId / employmentId / annualSalarySnapshot | T06 | 충족 | — |
| R07 | BR07 | payrollResults.grossPay / totalDeductions / netPay | T07 | 충족 | — |
| R08 | BR08 | payrollRuns.validatedAt / payrollEntries.attendanceRevision | T08 | 미충족 | A01 |
| R09 | BR09 | payrollRuns.status / confirmedAt | T09 | 충족 | A03 |
| R10 | BR10 | payrollRuns.closedAt / company.attendanceClosed | T10 | 충족 | — |
| R11 | BR11 | payrollRuns.paidAt | T11 | 충족 | — |
| R12 | BR12 | payrollEntries.retroPay / payrollResults.id | T12 | 미구현 | C01 |
| R13 | BR13 | retirementSettlements.employmentId / retirementPay | T13 | 충족 | — |
| R14 | BR14 | yearEndTaxCases.taxYear / estimatedFinalTax / settlementAmount | T14 | 충족 | C02 |
| R15 | BR15 | company.withholdingDrafts / payrollResults.incomeTax | T15 | 충족 | — |
| R16 | BR16 | filingDrafts / employeeId(고용 ID) / ruleVersion | T16 | 충족 | — |
| R17 | BR17 | DatabaseExport.schemaVersion | T17 | 충족 | — |
| R18 | BR18 | DatabaseExport.data | T18 | 미충족 | B03 |
| R19 | BR19 | AuditLog.entityId / PayrollRun.status | T19 | 미충족 | A03 |
| R20 | BR20 | 제안 simulationRunId | T20 | 미구현 | D01 |
| R21 | BR21 | Person.email | T21 | 미충족 | A02 |


근거 위치는 고정 SHA에 한한다. 요구의 수용 기준, 테스트의 실제 확인 범위 및 비교 결과를 함께 보고 판정한다. R05·R07·R09의 추가 검사 결과는 evidence/probe-assertions.log에서 확인한다.
