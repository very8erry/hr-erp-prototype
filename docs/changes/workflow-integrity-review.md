# Workflow integrity review — 2026-11-23

Baseline: 55281cd2a7de4ab4fc2191d04c06bfd2b05a227b. Scope: payroll/dashboard, attendance/leave, shared audit and registered-employee welfare linkage.

## Confirmed defects and changes

- Dashboard combined paid regular payroll (payment month) with daily earnings (work month). `dashboardPayroll.ts` now separates calculated regular net by attribution month, PAID regular net by payment month, and daily accrued net by work month. The dashboard shows each explicitly. No payment or calculation records are changed.
- Leave overlap checks ran before the write transaction, allowing simultaneous overlapping writes. Employee existence, overlap, stale-edit and payroll-lock checks now run in the same readwrite transaction as the leave, payroll invalidation and audit writes. Stale edits fail; protected payroll is preserved. Existing month-wide lock policy is unchanged.
- Leave editor did not show the underlying attendance. It now reads the selected employee/date range and shows daily classifications, hours, pay treatment and notes, with a work-record warning. Leave remains an approved case; attendance does not automatically create leave or overwrite approved cases.
- Company information and settlement settings were saved without audit records. Each now saves the latest company record and before/after audit atomically. Audit failure rolls back the company write.
- Welfare already validates the registered employment reference. No duplicate feature or eligibility-policy change was made.

## Files

- `src/infrastructure/db/indexedDb.ts`: leave serialization and company/settings audit transaction.
- `src/app/auditDescription.ts`: company/settings audit labels.
- `src/app/dashboardPayroll.ts`, `src/app/OperationsDashboard.tsx`: explicit aggregation semantics and columns.
- `src/modules/attendance/AttendanceTools.tsx`: attendance source cross-check in leave editor.
- `scripts/test-workflow-links.ts`: seven repository regression cases, including full exported-data equality after rejected writes and injected audit failure.
- `scripts/test-dashboard-payroll.ts`: status/month separation, missing-run handling and empty inputs.
- `scripts/verify-release.mjs`: include both new tests in release verification.

## Executed checks

Before fixes, the new tests reproduced missing company audit, missing settlement audit and both overlapping leave writes succeeding.

After fixes:
- `node --import tsx scripts/test-workflow-links.ts`: 7/7 passed.
- `node --import tsx scripts/test-dashboard-payroll.ts`: passed.
- `npm run build`: release verification (including both new scripts), TypeScript and Vite passed.
- `git diff --check`: passed.
- Chrome, isolated localhost origin with actual IndexedDB: dashboard displayed distinct calculated/paid/daily columns; attendance search → leave editor displayed daily records and the work-record warning. Modal cancelled, no manual business write performed.

## Preservation and limits

No database/schema/seed version change, reset, identifier rewrite, bulk merge, or migration. Tests compare every exported store after rejected welfare, locked payroll, stale leave and audit-failure writes. Fake IndexedDB concurrency tests do not constitute a new real-browser multi-tab concurrency test.

The existing individual payroll-detail/download path exists; dedicated statutory payslip delivery and recipient evidence remain unverified. External tax/insurance submission and real messaging were not executed. Common audit means business change records, not every view/click. All legacy write paths have not been exhaustively audited; for example withholding draft persistence still deserves a separate atomicity review. Rehire/person matching and welfare eligibility policies remain unchanged.
