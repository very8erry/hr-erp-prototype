# ERD 필드 사전 및 물리 인덱스

문서 1.0 · 분석 커밋 b4aeb300270a62273d3d5f0c2fea87f2a09ba800 · 관련 요구사항 R-01~17

타입 필수성은 TypeScript 선언 기준이다. null 허용 여부는 타입 열에 표시한다. DTO와 저장 엔터티가 함께 포함된다. 중첩 타입은 원본 선언을 우선한다.

| 선언 | 필드 | 타입 | 존재 | 근거 |
|---|---|---|---|---|
| Company | scheduleReview | import('../modules/operations/planningReview').PlanningReview | 선택 | src/domain/types.ts:17 |
| Company | withholdingDrafts | Record<string,import('../modules/payroll/withholdingForm').WithholdingDraft> | 선택 | src/domain/types.ts:19 |
| Company | recruiting | import("../modules/recruiting/recruiting").RecruitingState | 선택 | src/domain/types.ts:20 |
| Company | demoPayrollVersion | number | 선택 | src/domain/types.ts:21 |
| Company | reportingInfo | import("../modules/payroll/companyInfo").CompanyInfo | 선택 | src/domain/types.ts:22 |
| Company | settlements | import("../modules/payroll/companyInfo").SettlementSetting[] | 선택 | src/domain/types.ts:23 |
| Company | attendanceClosed | Record<string,string> | 선택 | src/domain/types.ts:24 |
| Company | dailyClosed | Record<string,string> | 선택 | src/domain/types.ts:25 |
| Company | demoScenarioVersion | number | 선택 | src/domain/types.ts:26 |
| Company | demoHistoryVersion | number | 선택 | src/domain/types.ts:27 |
| Company | id | string | 필수 | src/domain/types.ts:28 |
| Company | name | string | 필수 | src/domain/types.ts:29 |
| Company | countryCode | 'KR' | 필수 | src/domain/types.ts:30 |
| Company | employeeSizeBand | '300_PLUS' | 필수 | src/domain/types.ts:31 |
| Company | demoNotice | string | 필수 | src/domain/types.ts:32 |
| Organization | id | string | 필수 | src/domain/types.ts:36 |
| Organization | companyId | string | 필수 | src/domain/types.ts:37 |
| Organization | parentId | string \| null | 필수 | src/domain/types.ts:38 |
| Organization | name | string | 필수 | src/domain/types.ts:39 |
| Organization | type | 'COMPANY' \| 'DIVISION' \| 'DEPARTMENT' \| 'TEAM' | 필수 | src/domain/types.ts:40 |
| Person | id | string | 필수 | src/domain/types.ts:45 |
| Person | fullName | string | 필수 | src/domain/types.ts:46 |
| Person | englishName | string | 필수 | src/domain/types.ts:47 |
| Person | hanjaName | string | 필수 | src/domain/types.ts:48 |
| Person | birthDate | string | 필수 | src/domain/types.ts:49 |
| Person | gender | Gender | 필수 | src/domain/types.ts:50 |
| Person | domesticForeignType | DomesticForeignType | 필수 | src/domain/types.ts:51 |
| Person | nationality | string | 필수 | src/domain/types.ts:52 |
| Person | reportingNationality | string | 필수 | src/domain/types.ts:53 |
| Person | syntheticIdentifier | string | 필수 | src/domain/types.ts:54 |
| Person | profileImageUrl | string \| null | 필수 | src/domain/types.ts:55 |
| Person | mobile | string | 필수 | src/domain/types.ts:56 |
| Person | phone | string | 필수 | src/domain/types.ts:57 |
| Person | email | string | 필수 | src/domain/types.ts:58 |
| Person | emergencyContactName | string | 필수 | src/domain/types.ts:59 |
| Person | emergencyContactPhone | string | 필수 | src/domain/types.ts:60 |
| Person | emergencyContactRelation | string | 필수 | src/domain/types.ts:61 |
| Address | id | string | 필수 | src/domain/types.ts:65 |
| Address | personId | string | 필수 | src/domain/types.ts:66 |
| Address | postalCode | string | 필수 | src/domain/types.ts:67 |
| Address | addressLine1 | string | 필수 | src/domain/types.ts:68 |
| Address | addressLine2 | string | 필수 | src/domain/types.ts:69 |
| Address | effectiveStartDate | string | 필수 | src/domain/types.ts:70 |
| Address | effectiveEndDate | string \| null | 필수 | src/domain/types.ts:71 |
| Dependent | id | string | 필수 | src/domain/types.ts:75 |
| Dependent | employmentId | string | 필수 | src/domain/types.ts:76 |
| Dependent | relation | '배우자' \| '자녀' \| '부' \| '모' \| '형제자매' \| '기타' | 필수 | src/domain/types.ts:77 |
| Dependent | name | string | 필수 | src/domain/types.ts:78 |
| Dependent | birthDate | string | 필수 | src/domain/types.ts:79 |
| Dependent | cohabitation | boolean | 필수 | src/domain/types.ts:80 |
| Dependent | disabilityStatus | boolean | 필수 | src/domain/types.ts:81 |
| Dependent | basicDeductionEligible | boolean | 필수 | src/domain/types.ts:82 |
| Dependent | childDeductionEligible | boolean | 필수 | src/domain/types.ts:83 |
| Dependent | effectiveStartDate | string | 필수 | src/domain/types.ts:84 |
| Dependent | effectiveEndDate | string \| null | 필수 | src/domain/types.ts:85 |
| Dependent | createdAt | string | 필수 | src/domain/types.ts:86 |
| Dependent | updatedAt | string | 필수 | src/domain/types.ts:87 |
| Visa | id | string | 필수 | src/domain/types.ts:91 |
| Visa | employmentId | string | 필수 | src/domain/types.ts:92 |
| Visa | nationality | string | 필수 | src/domain/types.ts:93 |
| Visa | visaType | string | 필수 | src/domain/types.ts:94 |
| Visa | visaStatus | 'ACTIVE' \| 'EXPIRED' \| 'PENDING' \| 'NOT_REQUIRED' | 필수 | src/domain/types.ts:95 |
| Visa | issueDate | string | 필수 | src/domain/types.ts:96 |
| Visa | expiryDate | string | 필수 | src/domain/types.ts:97 |
| Visa | workPermission | boolean | 필수 | src/domain/types.ts:98 |
| Visa | foreignRegistrationStatus | 'REGISTERED' \| 'PENDING' \| 'NOT_REQUIRED' | 필수 | src/domain/types.ts:99 |
| Visa | foreignRegistrationNumberMasked | string | 필수 | src/domain/types.ts:100 |
| Visa | passportNumberMasked | string | 필수 | src/domain/types.ts:101 |
| Visa | passportExpiryDate | string | 필수 | src/domain/types.ts:102 |
| Visa | effectiveStartDate | string | 필수 | src/domain/types.ts:103 |
| Visa | effectiveEndDate | string \| null | 필수 | src/domain/types.ts:104 |
| BankAccount | id | string | 필수 | src/domain/types.ts:108 |
| BankAccount | employmentId | string | 필수 | src/domain/types.ts:109 |
| BankAccount | bankName | string | 필수 | src/domain/types.ts:110 |
| BankAccount | accountNumberMasked | string | 필수 | src/domain/types.ts:111 |
| BankAccount | accountHolder | string | 필수 | src/domain/types.ts:112 |
| BankAccount | isPayrollAccount | boolean | 필수 | src/domain/types.ts:113 |
| BankAccount | effectiveStartDate | string | 필수 | src/domain/types.ts:114 |
| BankAccount | effectiveEndDate | string \| null | 필수 | src/domain/types.ts:115 |
| Employment | id | string | 필수 | src/domain/types.ts:119 |
| Employment | personId | string | 필수 | src/domain/types.ts:120 |
| Employment | companyId | string | 필수 | src/domain/types.ts:121 |
| Employment | employeeNumber | string | 필수 | src/domain/types.ts:122 |
| Employment | hireDate | string | 필수 | src/domain/types.ts:123 |
| Employment | terminationDate | string \| null | 필수 | src/domain/types.ts:124 |
| Employment | employmentType | EmploymentType | 필수 | src/domain/types.ts:125 |
| Employment | status | EmploymentStatus | 필수 | src/domain/types.ts:126 |
| Assignment | occupationCode | string | 선택 | src/domain/types.ts:130 |
| Assignment | occupationCodeSource | string | 선택 | src/domain/types.ts:131 |
| Assignment | occupationCodeManual | boolean | 선택 | src/domain/types.ts:132 |
| Assignment | id | string | 필수 | src/domain/types.ts:133 |
| Assignment | employmentId | string | 필수 | src/domain/types.ts:134 |
| Assignment | organizationId | string | 필수 | src/domain/types.ts:135 |
| Assignment | grade | string | 필수 | src/domain/types.ts:136 |
| Assignment | title | string | 필수 | src/domain/types.ts:137 |
| Assignment | job | string | 필수 | src/domain/types.ts:138 |
| Assignment | workLocation | string | 필수 | src/domain/types.ts:139 |
| Assignment | effectiveFrom | string | 필수 | src/domain/types.ts:140 |
| Assignment | effectiveTo | string \| null | 필수 | src/domain/types.ts:141 |
| CompensationSnapshot | id | string | 필수 | src/domain/types.ts:145 |
| CompensationSnapshot | employmentId | string | 필수 | src/domain/types.ts:146 |
| CompensationSnapshot | annualSalary | number | 필수 | src/domain/types.ts:147 |
| CompensationSnapshot | effectiveFrom | string | 필수 | src/domain/types.ts:148 |
| CompensationSnapshot | effectiveTo | string \| null | 필수 | src/domain/types.ts:149 |
| TaxProfile | id | string | 필수 | src/domain/types.ts:153 |
| TaxProfile | employmentId | string | 필수 | src/domain/types.ts:154 |
| TaxProfile | residentType | ResidentType | 필수 | src/domain/types.ts:155 |
| TaxProfile | residenceCountry | string | 필수 | src/domain/types.ts:156 |
| TaxProfile | residenceCountryCode | string | 필수 | src/domain/types.ts:157 |
| TaxProfile | foreignEmployee | boolean | 필수 | src/domain/types.ts:158 |
| TaxProfile | foreignFlatTaxEligible | boolean | 필수 | src/domain/types.ts:159 |
| TaxProfile | foreignFlatTaxApplied | boolean | 필수 | src/domain/types.ts:160 |
| TaxProfile | selfBasicDeductionEligible | boolean | 필수 | src/domain/types.ts:161 |
| TaxProfile | effectiveStartDate | string | 필수 | src/domain/types.ts:162 |
| TaxProfile | effectiveEndDate | string \| null | 필수 | src/domain/types.ts:163 |
| SocialInsuranceProfile | longTermCareReduction | boolean | 선택 | src/domain/types.ts:167 |
| SocialInsuranceProfile | healthDependentRegistered | boolean | 선택 | src/domain/types.ts:168 |
| SocialInsuranceProfile | basicLivelihoodReduction | boolean | 선택 | src/domain/types.ts:169 |
| SocialInsuranceProfile | departureReasonCode | string | 선택 | src/domain/types.ts:171 |
| SocialInsuranceProfile | departureReason | string | 선택 | src/domain/types.ts:172 |
| SocialInsuranceProfile | id | string | 필수 | src/domain/types.ts:173 |
| SocialInsuranceProfile | employmentId | string | 필수 | src/domain/types.ts:174 |
| SocialInsuranceProfile | nationalPensionEligible | boolean | 필수 | src/domain/types.ts:175 |
| SocialInsuranceProfile | healthInsuranceEligible | boolean | 필수 | src/domain/types.ts:176 |
| SocialInsuranceProfile | employmentInsuranceEligible | boolean | 필수 | src/domain/types.ts:177 |
| SocialInsuranceProfile | industrialAccidentInsuranceEligible | boolean | 필수 | src/domain/types.ts:178 |
| SocialInsuranceProfile | effectiveStartDate | string | 필수 | src/domain/types.ts:179 |
| SocialInsuranceProfile | effectiveEndDate | string \| null | 필수 | src/domain/types.ts:180 |
| MilitaryServiceProfile | id | string | 필수 | src/domain/types.ts:184 |
| MilitaryServiceProfile | employmentId | string | 필수 | src/domain/types.ts:185 |
| MilitaryServiceProfile | status | MilitaryServiceStatus | 필수 | src/domain/types.ts:186 |
| MilitaryServiceProfile | serviceType | string | 필수 | src/domain/types.ts:187 |
| MilitaryServiceProfile | branch | string | 필수 | src/domain/types.ts:188 |
| MilitaryServiceProfile | rank | string | 필수 | src/domain/types.ts:189 |
| MilitaryServiceProfile | serviceStartDate | string \| null | 필수 | src/domain/types.ts:190 |
| MilitaryServiceProfile | serviceEndDate | string \| null | 필수 | src/domain/types.ts:191 |
| MilitaryServiceProfile | dischargeType | string | 필수 | src/domain/types.ts:192 |
| MilitaryServiceProfile | exemptionReason | string | 필수 | src/domain/types.ts:193 |
| MilitaryServiceProfile | reserveForcesEligible | boolean | 필수 | src/domain/types.ts:194 |
| MilitaryServiceProfile | reserveForcesEndDate | string \| null | 필수 | src/domain/types.ts:195 |
| MilitaryServiceProfile | militaryDutyLeaveEligible | boolean | 필수 | src/domain/types.ts:196 |
| MilitaryServiceProfile | note | string | 필수 | src/domain/types.ts:197 |
| Education | id | string | 필수 | src/domain/types.ts:201 |
| Education | employmentId | string | 필수 | src/domain/types.ts:202 |
| Education | schoolName | string | 필수 | src/domain/types.ts:203 |
| Education | major | string | 필수 | src/domain/types.ts:204 |
| Education | degree | string | 필수 | src/domain/types.ts:205 |
| Education | admissionDate | string | 필수 | src/domain/types.ts:206 |
| Education | graduationDate | string \| null | 필수 | src/domain/types.ts:207 |
| Education | graduated | boolean | 필수 | src/domain/types.ts:208 |
| Education | note | string | 필수 | src/domain/types.ts:209 |
| CareerHistory | id | string | 필수 | src/domain/types.ts:214 |
| CareerHistory | employmentId | string | 필수 | src/domain/types.ts:215 |
| CareerHistory | companyName | string | 필수 | src/domain/types.ts:216 |
| CareerHistory | organization | string | 필수 | src/domain/types.ts:217 |
| CareerHistory | job | string | 필수 | src/domain/types.ts:218 |
| CareerHistory | title | string | 필수 | src/domain/types.ts:219 |
| CareerHistory | startDate | string | 필수 | src/domain/types.ts:220 |
| CareerHistory | endDate | string | 필수 | src/domain/types.ts:221 |
| CareerHistory | responsibilities | string | 필수 | src/domain/types.ts:222 |
| CareerHistory | careerMonths | number | 필수 | src/domain/types.ts:223 |
| Certification | id | string | 필수 | src/domain/types.ts:227 |
| Certification | employmentId | string | 필수 | src/domain/types.ts:228 |
| Certification | name | string | 필수 | src/domain/types.ts:229 |
| Certification | issuer | string | 필수 | src/domain/types.ts:230 |
| Certification | certificateNumberMasked | string | 필수 | src/domain/types.ts:231 |
| Certification | acquiredDate | string | 필수 | src/domain/types.ts:232 |
| Certification | expiryDate | string \| null | 필수 | src/domain/types.ts:233 |
| Certification | status | 'ACTIVE' \| 'EXPIRED' \| 'PERMANENT' | 필수 | src/domain/types.ts:234 |
| Certification | attachmentName | string \| null | 필수 | src/domain/types.ts:235 |
| EmployeeSkill | id | string | 필수 | src/domain/types.ts:239 |
| EmployeeSkill | employmentId | string | 필수 | src/domain/types.ts:240 |
| EmployeeSkill | category | SkillCategory | 필수 | src/domain/types.ts:241 |
| EmployeeSkill | skillName | string | 필수 | src/domain/types.ts:242 |
| EmployeeSkill | proficiency | string | 필수 | src/domain/types.ts:243 |
| EmployeeSkill | score | string \| null | 필수 | src/domain/types.ts:244 |
| EmployeeSkill | acquiredDate | string \| null | 필수 | src/domain/types.ts:245 |
| ResumeDocument | storedFile | import('./attachments').StoredFile | 선택 | src/domain/types.ts:249 |
| ResumeDocument | id | string | 필수 | src/domain/types.ts:250 |
| ResumeDocument | employmentId | string | 필수 | src/domain/types.ts:251 |
| ResumeDocument | fileName | string | 필수 | src/domain/types.ts:252 |
| ResumeDocument | version | number | 필수 | src/domain/types.ts:253 |
| ResumeDocument | uploadedAt | string | 필수 | src/domain/types.ts:254 |
| ResumeDocument | uploadedBy | string | 필수 | src/domain/types.ts:255 |
| ResumeDocument | status | 'CURRENT' \| 'ARCHIVED' | 필수 | src/domain/types.ts:256 |
| WorkSchedule | id | string | 필수 | src/domain/types.ts:260 |
| WorkSchedule | name | string | 필수 | src/domain/types.ts:261 |
| WorkSchedule | timezone | string | 필수 | src/domain/types.ts:262 |
| WorkSchedule | workDays | string[] | 필수 | src/domain/types.ts:263 |
| WorkSchedule | startTime | string | 필수 | src/domain/types.ts:264 |
| WorkSchedule | endTime | string | 필수 | src/domain/types.ts:265 |
| WorkSchedule | breakMinutes | number | 필수 | src/domain/types.ts:266 |
| AttendanceSetting | id | string | 필수 | src/domain/types.ts:270 |
| AttendanceSetting | employmentId | string | 필수 | src/domain/types.ts:271 |
| AttendanceSetting | workScheduleId | string | 필수 | src/domain/types.ts:272 |
| AttendanceSetting | timezone | string | 필수 | src/domain/types.ts:273 |
| AttendanceSetting | attendancePin | string | 필수 | src/domain/types.ts:274 |
| AttendanceSetting | badgeId | string | 필수 | src/domain/types.ts:275 |
| AttendanceSetting | rfidId | string | 필수 | src/domain/types.ts:276 |
| ManagerRelationship | id | string | 필수 | src/domain/types.ts:280 |
| ManagerRelationship | employmentId | string | 필수 | src/domain/types.ts:281 |
| ManagerRelationship | directManagerId | string \| null | 필수 | src/domain/types.ts:282 |
| ManagerRelationship | hrManagerId | string \| null | 필수 | src/domain/types.ts:283 |
| ManagerRelationship | leaveApproverId | string \| null | 필수 | src/domain/types.ts:284 |
| ManagerRelationship | attendanceApproverId | string \| null | 필수 | src/domain/types.ts:285 |
| ManagerRelationship | performanceReviewerId | string \| null | 필수 | src/domain/types.ts:286 |
| ManagerRelationship | effectiveStartDate | string | 필수 | src/domain/types.ts:287 |
| ManagerRelationship | effectiveEndDate | string \| null | 필수 | src/domain/types.ts:288 |
| PersonnelEvent | reviewReason | string | 선택 | src/domain/types.ts:292 |
| PersonnelEvent | sourceAssignmentId | string | 선택 | src/domain/types.ts:293 |
| PersonnelEvent | sourceAssignmentSnapshot | Assignment | 선택 | src/domain/types.ts:294 |
| PersonnelEvent | sourceEmploymentStatus | Employment['status'] | 선택 | src/domain/types.ts:295 |
| PersonnelEvent | id | string | 필수 | src/domain/types.ts:297 |
| PersonnelEvent | employmentId | string | 필수 | src/domain/types.ts:298 |
| PersonnelEvent | eventType | PersonnelEventType | 필수 | src/domain/types.ts:299 |
| PersonnelEvent | effectiveDate | string | 필수 | src/domain/types.ts:300 |
| PersonnelEvent | before | Record<string, string \| number \| null> | 필수 | src/domain/types.ts:301 |
| PersonnelEvent | after | Record<string, string \| number \| null> | 필수 | src/domain/types.ts:302 |
| PersonnelEvent | reason | string | 필수 | src/domain/types.ts:303 |
| PersonnelEvent | createdAt | string | 필수 | src/domain/types.ts:304 |
| PersonnelEvent | status | PersonnelEventStatus | 필수 | src/domain/types.ts:305 |
| AuditLog | id | string | 필수 | src/domain/types.ts:309 |
| AuditLog | occurredAt | string | 필수 | src/domain/types.ts:310 |
| AuditLog | actor | string | 필수 | src/domain/types.ts:311 |
| AuditLog | action | string | 필수 | src/domain/types.ts:312 |
| AuditLog | entityType | string | 필수 | src/domain/types.ts:313 |
| AuditLog | entityId | string | 필수 | src/domain/types.ts:314 |
| AuditLog | detail | string | 필수 | src/domain/types.ts:315 |
| AttendanceMonthlySummary | paidCreditHours | number | 선택 | src/domain/types.ts:319 |
| AttendanceMonthlySummary | issueNote | string | 선택 | src/domain/types.ts:320 |
| AttendanceMonthlySummary | unpaidHours | number | 선택 | src/domain/types.ts:321 |
| AttendanceMonthlySummary | sickPaidHours | number | 선택 | src/domain/types.ts:322 |
| AttendanceMonthlySummary | sickUnpaidHours | number | 선택 | src/domain/types.ts:323 |
| AttendanceMonthlySummary | confirmedAt | string | 선택 | src/domain/types.ts:324 |
| AttendanceMonthlySummary | confirmedBy | string | 선택 | src/domain/types.ts:325 |
| AttendanceMonthlySummary | id | string | 필수 | src/domain/types.ts:326 |
| AttendanceMonthlySummary | employmentId | string | 필수 | src/domain/types.ts:327 |
| AttendanceMonthlySummary | period | string | 필수 | src/domain/types.ts:328 |
| AttendanceMonthlySummary | organizationNameSnapshot | string | 필수 | src/domain/types.ts:329 |
| AttendanceMonthlySummary | gradeSnapshot | string | 필수 | src/domain/types.ts:330 |
| AttendanceMonthlySummary | jobSnapshot | string | 필수 | src/domain/types.ts:331 |
| AttendanceMonthlySummary | scheduledHours | number | 필수 | src/domain/types.ts:332 |
| AttendanceMonthlySummary | workedHours | number | 필수 | src/domain/types.ts:333 |
| AttendanceMonthlySummary | overtimeHours | number | 필수 | src/domain/types.ts:334 |
| AttendanceMonthlySummary | nightHours | number | 필수 | src/domain/types.ts:335 |
| AttendanceMonthlySummary | holidayHours | number | 필수 | src/domain/types.ts:336 |
| AttendanceMonthlySummary | leaveDays | number | 필수 | src/domain/types.ts:337 |
| AttendanceMonthlySummary | absenceHours | number | 필수 | src/domain/types.ts:338 |
| AttendanceMonthlySummary | lateMinutes | number | 필수 | src/domain/types.ts:339 |
| AttendanceMonthlySummary | earlyLeaveMinutes | number | 필수 | src/domain/types.ts:340 |
| AttendanceMonthlySummary | manualEdited | boolean | 선택 | src/domain/types.ts:341 |
| AttendanceMonthlySummary | updatedAt | string | 선택 | src/domain/types.ts:342 |
| AttendanceMonthlySummary | updatedBy | string | 선택 | src/domain/types.ts:343 |
| AttendanceMonthlySummary | editReason | string | 선택 | src/domain/types.ts:344 |
| AttendanceMonthlySummary | revision | number | 선택 | src/domain/types.ts:345 |
| AnnualLeaveLedger | confirmedAt | string | 선택 | src/domain/types.ts:349 |
| AnnualLeaveLedger | confirmedBy | string | 선택 | src/domain/types.ts:350 |
| AnnualLeaveLedger | updatedAt | string | 선택 | src/domain/types.ts:351 |
| AnnualLeaveLedger | updatedBy | string | 선택 | src/domain/types.ts:352 |
| AnnualLeaveLedger | editReason | string | 선택 | src/domain/types.ts:353 |
| AnnualLeaveLedger | manualEdited | boolean | 선택 | src/domain/types.ts:354 |
| AnnualLeaveLedger | id | string | 필수 | src/domain/types.ts:355 |
| AnnualLeaveLedger | employmentId | string | 필수 | src/domain/types.ts:356 |
| AnnualLeaveLedger | year | number | 필수 | src/domain/types.ts:357 |
| AnnualLeaveLedger | grantedDays | number | 필수 | src/domain/types.ts:358 |
| AnnualLeaveLedger | carriedDays | number | 필수 | src/domain/types.ts:359 |
| AnnualLeaveLedger | adjustedDays | number | 필수 | src/domain/types.ts:360 |
| AnnualLeaveLedger | usedDays | number | 필수 | src/domain/types.ts:361 |
| AnnualLeaveLedger | remainingDays | number | 필수 | src/domain/types.ts:362 |
| AnnualLeaveLedger | ruleVersion | string | 필수 | src/domain/types.ts:363 |
| DailyWorker | occupationCode | string | 선택 | src/domain/types.ts:367 |
| DailyWorker | occupationCodeManual | boolean | 선택 | src/domain/types.ts:368 |
| DailyWorker | id | string | 필수 | src/domain/types.ts:369 |
| DailyWorker | personId | string | 필수 | src/domain/types.ts:370 |
| DailyWorker | workerNumber | string | 필수 | src/domain/types.ts:371 |
| DailyWorker | workerNameSnapshot | string | 필수 | src/domain/types.ts:372 |
| DailyWorker | organizationId | string | 필수 | src/domain/types.ts:373 |
| DailyWorker | job | string | 필수 | src/domain/types.ts:374 |
| DailyWorker | status | DailyWorkerStatus | 필수 | src/domain/types.ts:375 |
| DailyWorker | startDate | string | 필수 | src/domain/types.ts:376 |
| DailyWorker | endDate | string \| null | 필수 | src/domain/types.ts:377 |
| DailyWorker | dailyRate | number | 필수 | src/domain/types.ts:378 |
| DailyWorker | bankName | string | 필수 | src/domain/types.ts:379 |
| DailyWorker | accountNumberMasked | string | 필수 | src/domain/types.ts:380 |
| DailyWorkerInput | id | string | 선택 | src/domain/types.ts:384 |
| DailyWorkerInput | personId | string | 선택 | src/domain/types.ts:385 |
| DailyWorkerInput | workerNumber | string | 선택 | src/domain/types.ts:386 |
| DailyWorkerInput | name | string | 필수 | src/domain/types.ts:387 |
| DailyWorkerInput | birthDate | string | 필수 | src/domain/types.ts:388 |
| DailyWorkerInput | mobile | string | 필수 | src/domain/types.ts:389 |
| DailyWorkerInput | organizationId | string | 필수 | src/domain/types.ts:390 |
| DailyWorkerInput | job | string | 필수 | src/domain/types.ts:391 |
| DailyWorkerInput | status | DailyWorkerStatus | 필수 | src/domain/types.ts:392 |
| DailyWorkerInput | startDate | string | 필수 | src/domain/types.ts:393 |
| DailyWorkerInput | endDate | string \| null | 필수 | src/domain/types.ts:394 |
| DailyWorkerInput | dailyRate | number | 필수 | src/domain/types.ts:395 |
| DailyWorkerInput | bankName | string | 필수 | src/domain/types.ts:396 |
| DailyWorkerInput | accountNumberMasked | string | 필수 | src/domain/types.ts:397 |
| DailyWorkRecord | occupationCodeSnapshot | string | 선택 | src/domain/types.ts:401 |
| DailyWorkRecord | manualEdited | boolean | 선택 | src/domain/types.ts:402 |
| DailyWorkRecord | source | string | 선택 | src/domain/types.ts:403 |
| DailyWorkRecord | exceptionWork | boolean | 선택 | src/domain/types.ts:404 |
| DailyWorkRecord | confirmedAt | string | 선택 | src/domain/types.ts:405 |
| DailyWorkRecord | confirmedBy | string | 선택 | src/domain/types.ts:406 |
| DailyWorkRecord | overtimeAllowance | number | 선택 | src/domain/types.ts:407 |
| DailyWorkRecord | nightAllowance | number | 선택 | src/domain/types.ts:408 |
| DailyWorkRecord | holidayAllowance | number | 선택 | src/domain/types.ts:409 |
| DailyWorkRecord | otherAllowance | number | 선택 | src/domain/types.ts:410 |
| DailyWorkRecord | id | string | 필수 | src/domain/types.ts:411 |
| DailyWorkRecord | dailyWorkerId | string | 필수 | src/domain/types.ts:412 |
| DailyWorkRecord | workDate | string | 필수 | src/domain/types.ts:413 |
| DailyWorkRecord | hours | number | 필수 | src/domain/types.ts:414 |
| DailyWorkRecord | startTime | string | 선택 | src/domain/types.ts:415 |
| DailyWorkRecord | endTime | string | 선택 | src/domain/types.ts:416 |
| DailyWorkRecord | endNextDay | boolean | 선택 | src/domain/types.ts:417 |
| DailyWorkRecord | breakStart | string | 선택 | src/domain/types.ts:418 |
| DailyWorkRecord | breakMinutes | number | 선택 | src/domain/types.ts:419 |
| DailyWorkRecord | grossPay | number | 필수 | src/domain/types.ts:420 |
| DailyWorkRecord | nonTaxablePay | number | 필수 | src/domain/types.ts:421 |
| DailyWorkRecord | incomeTax | number | 필수 | src/domain/types.ts:422 |
| DailyWorkRecord | localIncomeTax | number | 필수 | src/domain/types.ts:423 |
| DailyWorkRecord | employmentInsurance | number | 필수 | src/domain/types.ts:424 |
| DailyWorkRecord | netPay | number | 필수 | src/domain/types.ts:425 |
| DailyWorkRecord | note | string | 필수 | src/domain/types.ts:426 |
| RetirementSettlement | planType | 'DB'\|'DC' | 선택 | src/domain/types.ts:430 |
| RetirementSettlement | dcSourceAnnualWages | number | 선택 | src/domain/types.ts:431 |
| RetirementSettlement | dcAnnualWages | number\|null | 선택 | src/domain/types.ts:432 |
| RetirementSettlement | dcAdditionalWages | number | 선택 | src/domain/types.ts:433 |
| RetirementSettlement | dcPaidContribution | number\|null | 선택 | src/domain/types.ts:434 |
| RetirementSettlement | dcAccountBalance | number\|null | 선택 | src/domain/types.ts:435 |
| RetirementSettlement | dcRequiredContribution | number | 선택 | src/domain/types.ts:436 |
| RetirementSettlement | dcUnpaidContribution | number | 선택 | src/domain/types.ts:437 |
| RetirementSettlement | dcExcludedMonths | number | 선택 | src/domain/types.ts:438 |
| RetirementSettlement | dcExcludedWages | number | 선택 | src/domain/types.ts:439 |
| RetirementSettlement | dcPriorAnnualContribution | number\|null | 선택 | src/domain/types.ts:440 |
| RetirementSettlement | weeklyContractHours | number | 선택 | src/domain/types.ts:441 |
| RetirementSettlement | demoSource | boolean | 선택 | src/domain/types.ts:442 |
| RetirementSettlement | annualBonus | number\|null | 선택 | src/domain/types.ts:444 |
| RetirementSettlement | annualLeaveAllowance | number\|null | 선택 | src/domain/types.ts:445 |
| RetirementSettlement | excludedDays | number | 선택 | src/domain/types.ts:446 |
| RetirementSettlement | excludedWages | number | 선택 | src/domain/types.ts:447 |
| RetirementSettlement | interimSettlementDate | string\|null | 선택 | src/domain/types.ts:448 |
| RetirementSettlement | calculationWindowStart | string | 선택 | src/domain/types.ts:449 |
| RetirementSettlement | calculationWindowEnd | string | 선택 | src/domain/types.ts:450 |
| RetirementSettlement | calendarDays | number | 선택 | src/domain/types.ts:451 |
| RetirementSettlement | sourcePayrollIds | string[] | 선택 | src/domain/types.ts:452 |
| RetirementSettlement | reviewRequired | boolean | 선택 | src/domain/types.ts:453 |
| RetirementSettlement | manualEdited | boolean | 선택 | src/domain/types.ts:454 |
| RetirementSettlement | editReason | string | 선택 | src/domain/types.ts:455 |
| RetirementSettlement | updatedAt | string | 선택 | src/domain/types.ts:456 |
| RetirementSettlement | id | string | 필수 | src/domain/types.ts:457 |
| RetirementSettlement | employmentId | string | 필수 | src/domain/types.ts:458 |
| RetirementSettlement | calculationDate | string | 필수 | src/domain/types.ts:459 |
| RetirementSettlement | terminationDate | string | 필수 | src/domain/types.ts:460 |
| RetirementSettlement | serviceDays | number | 필수 | src/domain/types.ts:461 |
| RetirementSettlement | averageDailyWage | number | 필수 | src/domain/types.ts:462 |
| RetirementSettlement | ordinaryDailyWage | number | 필수 | src/domain/types.ts:463 |
| RetirementSettlement | appliedDailyWage | number | 필수 | src/domain/types.ts:464 |
| RetirementSettlement | retirementPay | number | 필수 | src/domain/types.ts:465 |
| RetirementSettlement | status | 'DRAFT' \| 'CALCULATED' \| 'CONFIRMED' | 필수 | src/domain/types.ts:466 |
| RetirementSettlement | ruleVersion | string | 필수 | src/domain/types.ts:467 |
| RetirementSettlement | note | string | 필수 | src/domain/types.ts:468 |
| YearEndTaxCase | documentReview | import('../modules/payroll/yearEndDocuments').YearEndDocumentCheck[] | 선택 | src/domain/types.ts:472 |
| YearEndTaxCase | manualEdited | boolean | 선택 | src/domain/types.ts:473 |
| YearEndTaxCase | editReason | string | 선택 | src/domain/types.ts:474 |
| YearEndTaxCase | updatedAt | string | 선택 | src/domain/types.ts:475 |
| YearEndTaxCase | id | string | 필수 | src/domain/types.ts:476 |
| YearEndTaxCase | employmentId | string | 필수 | src/domain/types.ts:477 |
| YearEndTaxCase | taxYear | number | 필수 | src/domain/types.ts:478 |
| YearEndTaxCase | grossPay | number | 필수 | src/domain/types.ts:479 |
| YearEndTaxCase | incomeTaxWithheld | number | 필수 | src/domain/types.ts:480 |
| YearEndTaxCase | localTaxWithheld | number | 필수 | src/domain/types.ts:481 |
| YearEndTaxCase | basicDeductionCount | number | 필수 | src/domain/types.ts:482 |
| YearEndTaxCase | childCount | number | 필수 | src/domain/types.ts:483 |
| YearEndTaxCase | status | 'DRAFT' \| 'REVIEW' \| 'CONFIRMED' | 필수 | src/domain/types.ts:484 |
| YearEndTaxCase | estimatedFinalTax | number \| null | 필수 | src/domain/types.ts:485 |
| YearEndTaxCase | settlementAmount | number \| null | 필수 | src/domain/types.ts:486 |
| YearEndTaxCase | ruleVersion | string | 필수 | src/domain/types.ts:487 |
| PayrollItemMaster | id | string | 필수 | src/domain/types.ts:491 |
| PayrollItemMaster | code | string | 필수 | src/domain/types.ts:492 |
| PayrollItemMaster | name | string | 필수 | src/domain/types.ts:493 |
| PayrollItemMaster | category | PayrollItemCategory | 필수 | src/domain/types.ts:494 |
| PayrollItemMaster | calculationMode | 'DEFAULT' \| 'FORMULA' \| 'MANUAL' | 선택 | src/domain/types.ts:495 |
| PayrollItemMaster | formula | string | 선택 | src/domain/types.ts:496 |
| PayrollItemMaster | manualAmount | number | 선택 | src/domain/types.ts:497 |
| PayrollItemMaster | workMultiplier | number | 선택 | src/domain/types.ts:498 |
| PayrollItemMaster | holidayExtraMultiplier | number | 선택 | src/domain/types.ts:499 |
| PayrollItemMaster | calculationMethod | PayrollCalculationMethod | 필수 | src/domain/types.ts:500 |
| PayrollItemMaster | taxable | boolean | 필수 | src/domain/types.ts:501 |
| PayrollItemMaster | active | boolean | 필수 | src/domain/types.ts:502 |
| PayrollItemMaster | sortOrder | number | 필수 | src/domain/types.ts:503 |
| PayrollItemMaster | updatedAt | string | 선택 | src/domain/types.ts:504 |
| PayrollItemMaster | ordinaryWage | boolean | 선택 | src/domain/types.ts:505 |
| PayrollItemMaster | minimumWage | boolean | 선택 | src/domain/types.ts:506 |
| PayrollItemMaster | pensionIncluded | boolean | 선택 | src/domain/types.ts:507 |
| PayrollItemMaster | healthIncluded | boolean | 선택 | src/domain/types.ts:508 |
| PayrollItemMaster | employmentIncluded | boolean | 선택 | src/domain/types.ts:509 |
| EmployeeView | departureReasonCode | string | 선택 | src/domain/types.ts:513 |
| EmployeeView | departureReason | string | 선택 | src/domain/types.ts:514 |
| EmployeeView | occupationCode | string | 선택 | src/domain/types.ts:515 |
| EmployeeView | occupationCodeManual | boolean | 선택 | src/domain/types.ts:516 |
| EmployeeView | employmentId | string | 필수 | src/domain/types.ts:517 |
| EmployeeView | personId | string | 필수 | src/domain/types.ts:518 |
| EmployeeView | employeeNumber | string | 필수 | src/domain/types.ts:519 |
| EmployeeView | name | string | 필수 | src/domain/types.ts:520 |
| EmployeeView | englishName | string | 필수 | src/domain/types.ts:521 |
| EmployeeView | birthDate | string | 필수 | src/domain/types.ts:522 |
| EmployeeView | gender | Gender | 필수 | src/domain/types.ts:523 |
| EmployeeView | domesticForeignType | DomesticForeignType | 필수 | src/domain/types.ts:524 |
| EmployeeView | nationality | string | 필수 | src/domain/types.ts:525 |
| EmployeeView | mobile | string | 필수 | src/domain/types.ts:526 |
| EmployeeView | email | string | 필수 | src/domain/types.ts:527 |
| EmployeeView | address | string | 필수 | src/domain/types.ts:528 |
| EmployeeView | syntheticIdentifier | string | 필수 | src/domain/types.ts:529 |
| EmployeeView | bankName | string | 필수 | src/domain/types.ts:530 |
| EmployeeView | bankAccount | string | 필수 | src/domain/types.ts:531 |
| EmployeeView | hireDate | string | 필수 | src/domain/types.ts:532 |
| EmployeeView | terminationDate | string \| null | 필수 | src/domain/types.ts:533 |
| EmployeeView | employmentType | EmploymentType | 필수 | src/domain/types.ts:534 |
| EmployeeView | status | EmploymentStatus | 필수 | src/domain/types.ts:535 |
| EmployeeView | organizationId | string | 필수 | src/domain/types.ts:536 |
| EmployeeView | organizationName | string | 필수 | src/domain/types.ts:537 |
| EmployeeView | grade | string | 필수 | src/domain/types.ts:538 |
| EmployeeView | title | string | 필수 | src/domain/types.ts:539 |
| EmployeeView | job | string | 필수 | src/domain/types.ts:540 |
| EmployeeView | workLocation | string | 필수 | src/domain/types.ts:541 |
| EmployeeView | annualSalary | number | 필수 | src/domain/types.ts:542 |
| EmployeeMasterDetail | employee | EmployeeView | 필수 | src/domain/types.ts:546 |
| EmployeeMasterDetail | person | Person | 필수 | src/domain/types.ts:547 |
| EmployeeMasterDetail | address | Address \| null | 필수 | src/domain/types.ts:548 |
| EmployeeMasterDetail | dependents | Dependent[] | 필수 | src/domain/types.ts:549 |
| EmployeeMasterDetail | visas | Visa[] | 필수 | src/domain/types.ts:550 |
| EmployeeMasterDetail | bankAccounts | BankAccount[] | 필수 | src/domain/types.ts:551 |
| EmployeeMasterDetail | taxProfile | TaxProfile \| null | 필수 | src/domain/types.ts:552 |
| EmployeeMasterDetail | socialInsuranceProfile | SocialInsuranceProfile \| null | 필수 | src/domain/types.ts:553 |
| EmployeeMasterDetail | militaryServiceProfile | MilitaryServiceProfile \| null | 필수 | src/domain/types.ts:554 |
| EmployeeMasterDetail | educations | Education[] | 필수 | src/domain/types.ts:555 |
| EmployeeMasterDetail | careers | CareerHistory[] | 필수 | src/domain/types.ts:556 |
| EmployeeMasterDetail | certifications | Certification[] | 필수 | src/domain/types.ts:557 |
| EmployeeMasterDetail | skills | EmployeeSkill[] | 필수 | src/domain/types.ts:558 |
| EmployeeMasterDetail | resumes | ResumeDocument[] | 필수 | src/domain/types.ts:559 |
| EmployeeMasterDetail | attendanceSetting | AttendanceSetting \| null | 필수 | src/domain/types.ts:560 |
| EmployeeMasterDetail | workSchedule | WorkSchedule \| null | 필수 | src/domain/types.ts:561 |
| EmployeeMasterDetail | managerRelationship | ManagerRelationship \| null | 필수 | src/domain/types.ts:562 |
| EmployeeMasterDetail | assignmentHistory | Assignment[] | 필수 | src/domain/types.ts:563 |
| EmployeeMasterDetail | compensationHistory | CompensationSnapshot[] | 필수 | src/domain/types.ts:564 |
| EmployeeMasterDetail | personnelEvents | PersonnelEvent[] | 필수 | src/domain/types.ts:565 |
| PayrollDependentInfo | employmentId | string | 필수 | src/domain/types.ts:569 |
| PayrollDependentInfo | asOfDate | string | 필수 | src/domain/types.ts:570 |
| PayrollDependentInfo | dependents | Dependent[] | 필수 | src/domain/types.ts:571 |
| PayrollDependentInfo | basicDeductionCount | number | 필수 | src/domain/types.ts:572 |
| PayrollDependentInfo | childDeductionCount | number | 필수 | src/domain/types.ts:573 |
| SeedBundle | company | Company | 필수 | src/domain/types.ts:577 |
| SeedBundle | organizations | Organization[] | 필수 | src/domain/types.ts:578 |
| SeedBundle | persons | Person[] | 필수 | src/domain/types.ts:579 |
| SeedBundle | addresses | Address[] | 필수 | src/domain/types.ts:580 |
| SeedBundle | dependents | Dependent[] | 필수 | src/domain/types.ts:581 |
| SeedBundle | visas | Visa[] | 필수 | src/domain/types.ts:582 |
| SeedBundle | bankAccounts | BankAccount[] | 필수 | src/domain/types.ts:583 |
| SeedBundle | employments | Employment[] | 필수 | src/domain/types.ts:584 |
| SeedBundle | assignments | Assignment[] | 필수 | src/domain/types.ts:585 |
| SeedBundle | compensations | CompensationSnapshot[] | 필수 | src/domain/types.ts:586 |
| SeedBundle | taxProfiles | TaxProfile[] | 필수 | src/domain/types.ts:587 |
| SeedBundle | socialInsuranceProfiles | SocialInsuranceProfile[] | 필수 | src/domain/types.ts:588 |
| SeedBundle | militaryServiceProfiles | MilitaryServiceProfile[] | 필수 | src/domain/types.ts:589 |
| SeedBundle | educations | Education[] | 필수 | src/domain/types.ts:590 |
| SeedBundle | careers | CareerHistory[] | 필수 | src/domain/types.ts:591 |
| SeedBundle | certifications | Certification[] | 필수 | src/domain/types.ts:592 |
| SeedBundle | skills | EmployeeSkill[] | 필수 | src/domain/types.ts:593 |
| SeedBundle | resumes | ResumeDocument[] | 필수 | src/domain/types.ts:594 |
| SeedBundle | workSchedules | WorkSchedule[] | 필수 | src/domain/types.ts:595 |
| SeedBundle | attendanceSettings | AttendanceSetting[] | 필수 | src/domain/types.ts:596 |
| SeedBundle | managerRelationships | ManagerRelationship[] | 필수 | src/domain/types.ts:597 |
| SeedBundle | personnelEvents | PersonnelEvent[] | 필수 | src/domain/types.ts:598 |
| SeedBundle | auditLogs | AuditLog[] | 필수 | src/domain/types.ts:599 |
| SeedBundle | payrollRuns | PayrollRun[] | 필수 | src/domain/types.ts:600 |
| SeedBundle | payrollEntries | PayrollEntry[] | 필수 | src/domain/types.ts:601 |
| SeedBundle | payrollResults | PayrollResult[] | 필수 | src/domain/types.ts:602 |
| SeedBundle | attendanceMonthlySummaries | AttendanceMonthlySummary[] | 필수 | src/domain/types.ts:603 |
| SeedBundle | annualLeaveLedgers | AnnualLeaveLedger[] | 필수 | src/domain/types.ts:604 |
| SeedBundle | dailyWorkers | DailyWorker[] | 필수 | src/domain/types.ts:605 |
| SeedBundle | dailyWorkRecords | DailyWorkRecord[] | 필수 | src/domain/types.ts:606 |
| SeedBundle | retirementSettlements | RetirementSettlement[] | 필수 | src/domain/types.ts:607 |
| SeedBundle | yearEndTaxCases | YearEndTaxCase[] | 필수 | src/domain/types.ts:608 |
| SeedBundle | payrollItemMasters | PayrollItemMaster[] | 필수 | src/domain/types.ts:609 |
| SeedBundle | attendanceDailyRecords | AttendanceDailyRecord[] | 선택 | src/domain/types.ts:610 |
| SeedBundle | leaveCases | LeaveCase[] | 선택 | src/domain/types.ts:611 |
| SeedBundle | payrollSettingsHistory | {id:string; items:PayrollItemMaster[]}[] | 선택 | src/domain/types.ts:612 |
| PersonnelActionInput | employmentId | string | 필수 | src/domain/types.ts:616 |
| PersonnelActionInput | eventType | PersonnelEventType | 필수 | src/domain/types.ts:617 |
| PersonnelActionInput | effectiveDate | string | 필수 | src/domain/types.ts:618 |
| PersonnelActionInput | value | string | 필수 | src/domain/types.ts:619 |
| PersonnelActionInput | reason | string | 필수 | src/domain/types.ts:620 |
| DependentInput | id | string | 선택 | src/domain/types.ts:624 |
| DependentInput | employmentId | string | 필수 | src/domain/types.ts:625 |
| DependentInput | relation | Dependent['relation'] | 필수 | src/domain/types.ts:626 |
| DependentInput | name | string | 필수 | src/domain/types.ts:627 |
| DependentInput | birthDate | string | 필수 | src/domain/types.ts:628 |
| DependentInput | cohabitation | boolean | 필수 | src/domain/types.ts:629 |
| DependentInput | disabilityStatus | boolean | 필수 | src/domain/types.ts:630 |
| DependentInput | basicDeductionEligible | boolean | 필수 | src/domain/types.ts:631 |
| DependentInput | childDeductionEligible | boolean | 필수 | src/domain/types.ts:632 |
| DependentInput | effectiveStartDate | string | 필수 | src/domain/types.ts:633 |
| DependentInput | effectiveEndDate | string \| null | 필수 | src/domain/types.ts:634 |
| ManagerRelationshipInput | employmentId | string | 필수 | src/domain/types.ts:638 |
| ManagerRelationshipInput | directManagerId | string \| null | 필수 | src/domain/types.ts:639 |
| ManagerRelationshipInput | hrManagerId | string \| null | 필수 | src/domain/types.ts:640 |
| ManagerRelationshipInput | leaveApproverId | string \| null | 필수 | src/domain/types.ts:641 |
| ManagerRelationshipInput | attendanceApproverId | string \| null | 필수 | src/domain/types.ts:642 |
| ManagerRelationshipInput | performanceReviewerId | string \| null | 필수 | src/domain/types.ts:643 |
| DatabaseExport | exportedAt | string | 필수 | src/domain/types.ts:647 |
| DatabaseExport | schemaVersion | number | 필수 | src/domain/types.ts:648 |
| DatabaseExport | data | SeedBundle | 필수 | src/domain/types.ts:649 |
| FilingFormValues | incomeName | string | 필수 | src/domain/types.ts:658 |
| FilingFormValues | incomeCode | string | 필수 | src/domain/types.ts:658 |
| FilingFormValues | headcount | number | 필수 | src/domain/types.ts:658 |
| FilingFormValues | grossPay | number | 필수 | src/domain/types.ts:658 |
| FilingFormValues | incomeTax | number | 필수 | src/domain/types.ts:658 |
| FilingFormValues | localIncomeTax | number | 필수 | src/domain/types.ts:658 |
| FilingFormValues | note | string | 필수 | src/domain/types.ts:658 |
| FilingFormValues | updatedAt | string | 선택 | src/domain/types.ts:658 |
| FilingFormValues | editReason | string | 선택 | src/domain/types.ts:658 |
| PayrollRun | filingFormOverrides | FilingFormValues | 선택 | src/domain/types.ts:660 |
| PayrollRun | id | string | 필수 | src/domain/types.ts:661 |
| PayrollRun | companyId | string | 필수 | src/domain/types.ts:662 |
| PayrollRun | period | string | 필수 | src/domain/types.ts:663 |
| PayrollRun | payDate | string | 필수 | src/domain/types.ts:664 |
| PayrollRun | status | PayrollRunStatus | 필수 | src/domain/types.ts:665 |
| PayrollRun | ruleVersion | string | 필수 | src/domain/types.ts:666 |
| PayrollRun | note | string | 필수 | src/domain/types.ts:667 |
| PayrollRun | createdAt | string | 필수 | src/domain/types.ts:668 |
| PayrollRun | calculatedAt | string \| null | 필수 | src/domain/types.ts:669 |
| PayrollRun | validatedAt | string \| null | 필수 | src/domain/types.ts:670 |
| PayrollRun | confirmedAt | string \| null | 필수 | src/domain/types.ts:671 |
| PayrollRun | paidAt | string \| null | 선택 | src/domain/types.ts:672 |
| PayrollRun | closedAt | string \| null | 필수 | src/domain/types.ts:673 |
| PayrollRun | itemOverrides | Record<string, boolean> | 선택 | src/domain/types.ts:674 |
| PayrollRun | itemSnapshot | PayrollItemMaster[] | 선택 | src/domain/types.ts:675 |
| PayrollRun | attendanceStale | boolean | 선택 | src/domain/types.ts:676 |
| PayrollEntry | calculationInputs | {ordinaryMonthlyHours:number;overtimeHours:number;nightHours:number;holidayHours:number;holidayOvertimeHours:number}\|null | 선택 | src/domain/types.ts:681 |
| PayrollEntry | deriveEmploymentBase | boolean | 선택 | src/domain/types.ts:682 |
| PayrollEntry | nonTaxEligibility | import('../modules/payroll/nonTaxRules').NonTaxEligibility | 선택 | src/domain/types.ts:683 |
| PayrollEntry | insuranceOverrides | InsuranceOverrides | 선택 | src/domain/types.ts:685 |
| PayrollEntry | id | string | 필수 | src/domain/types.ts:686 |
| PayrollEntry | runId | string | 필수 | src/domain/types.ts:687 |
| PayrollEntry | employmentId | string | 필수 | src/domain/types.ts:688 |
| PayrollEntry | employeeNumberSnapshot | string | 필수 | src/domain/types.ts:689 |
| PayrollEntry | employeeNameSnapshot | string | 필수 | src/domain/types.ts:690 |
| PayrollEntry | organizationNameSnapshot | string | 필수 | src/domain/types.ts:691 |
| PayrollEntry | gradeSnapshot | string | 필수 | src/domain/types.ts:692 |
| PayrollEntry | titleSnapshot | string | 필수 | src/domain/types.ts:693 |
| PayrollEntry | jobSnapshot | string | 필수 | src/domain/types.ts:694 |
| PayrollEntry | hireDateSnapshot | string | 필수 | src/domain/types.ts:695 |
| PayrollEntry | terminationDateSnapshot | string \| null | 필수 | src/domain/types.ts:696 |
| PayrollEntry | annualSalarySnapshot | number | 필수 | src/domain/types.ts:697 |
| PayrollEntry | monthlyBasePay | number | 필수 | src/domain/types.ts:698 |
| PayrollEntry | prorationRate | number | 필수 | src/domain/types.ts:699 |
| PayrollEntry | taxableAllowance | number | 필수 | src/domain/types.ts:700 |
| PayrollEntry | nonTaxableAllowance | number | 필수 | src/domain/types.ts:701 |
| PayrollEntry | overtimePay | number | 필수 | src/domain/types.ts:702 |
| PayrollEntry | bonus | number | 필수 | src/domain/types.ts:703 |
| PayrollEntry | retroPay | number | 필수 | src/domain/types.ts:704 |
| PayrollEntry | otherEarnings | number | 필수 | src/domain/types.ts:705 |
| PayrollEntry | unpaidDeduction | number | 필수 | src/domain/types.ts:706 |
| PayrollEntry | otherDeductions | number | 필수 | src/domain/types.ts:707 |
| PayrollEntry | pensionBaseMonthly | number | 필수 | src/domain/types.ts:708 |
| PayrollEntry | healthBaseMonthly | number | 필수 | src/domain/types.ts:709 |
| PayrollEntry | employmentInsuranceBaseMonthly | number | 필수 | src/domain/types.ts:710 |
| PayrollEntry | nationalPensionEligible | boolean | 필수 | src/domain/types.ts:711 |
| PayrollEntry | healthInsuranceEligible | boolean | 필수 | src/domain/types.ts:712 |
| PayrollEntry | employmentInsuranceEligible | boolean | 필수 | src/domain/types.ts:713 |
| PayrollEntry | industrialAccidentInsuranceEligible | boolean | 필수 | src/domain/types.ts:714 |
| PayrollEntry | basicDeductionCount | number | 필수 | src/domain/types.ts:715 |
| PayrollEntry | childDeductionCount | number | 필수 | src/domain/types.ts:716 |
| PayrollEntry | incomeTaxManual | number | 필수 | src/domain/types.ts:717 |
| PayrollEntry | itemAmounts | Record<string, number> | 선택 | src/domain/types.ts:718 |
| PayrollEntry | attendanceRevision | number | 선택 | src/domain/types.ts:719 |
| PayrollEntry | memo | string | 필수 | src/domain/types.ts:720 |
| PayrollEntry | status | PayrollEntryStatus | 필수 | src/domain/types.ts:721 |
| PayrollEntry | updatedAt | string | 필수 | src/domain/types.ts:722 |
| PayrollResult | insuranceBaseCheck | {pension:number;health:number;employment:number;employmentApplied:number} | 선택 | src/domain/types.ts:726 |
| PayrollResult | appliedItemAmounts | Record<string,number> | 선택 | src/domain/types.ts:727 |
| PayrollResult | payrollRuleVersion | string | 선택 | src/domain/types.ts:728 |
| PayrollResult | insuranceRuleVersion | string | 선택 | src/domain/types.ts:729 |
| PayrollResult | taxTableVersion | string | 선택 | src/domain/types.ts:730 |
| PayrollResult | relevantRates | Record<string,number\|string> | 선택 | src/domain/types.ts:731 |
| PayrollResult | id | string | 필수 | src/domain/types.ts:732 |
| PayrollResult | runId | string | 필수 | src/domain/types.ts:733 |
| PayrollResult | employmentId | string | 필수 | src/domain/types.ts:734 |
| PayrollResult | basePay | number | 필수 | src/domain/types.ts:735 |
| PayrollResult | taxableEarnings | number | 필수 | src/domain/types.ts:736 |
| PayrollResult | nonTaxableEarnings | number | 필수 | src/domain/types.ts:737 |
| PayrollResult | grossPay | number | 필수 | src/domain/types.ts:738 |
| PayrollResult | nationalPension | number | 필수 | src/domain/types.ts:739 |
| PayrollResult | healthInsurance | number | 필수 | src/domain/types.ts:740 |
| PayrollResult | longTermCareInsurance | number | 필수 | src/domain/types.ts:741 |
| PayrollResult | employmentInsurance | number | 필수 | src/domain/types.ts:742 |
| PayrollResult | incomeTax | number | 필수 | src/domain/types.ts:743 |
| PayrollResult | localIncomeTax | number | 필수 | src/domain/types.ts:744 |
| PayrollResult | otherDeductions | number | 필수 | src/domain/types.ts:745 |
| PayrollResult | totalDeductions | number | 필수 | src/domain/types.ts:746 |
| PayrollResult | netPay | number | 필수 | src/domain/types.ts:747 |
| PayrollResult | calculatedAt | string | 필수 | src/domain/types.ts:748 |
| PayrollResult | ruleVersion | string | 필수 | src/domain/types.ts:749 |
| PayrollResult | warnings | string[] | 필수 | src/domain/types.ts:750 |
| PayrollResult | errors | string[] | 필수 | src/domain/types.ts:751 |
| PayrollEntryInput | calculationInputs | {ordinaryMonthlyHours:number;overtimeHours:number;nightHours:number;holidayHours:number;holidayOvertimeHours:number}\|null | 선택 | src/domain/types.ts:756 |
| PayrollEntryInput | deriveEmploymentBase | boolean | 선택 | src/domain/types.ts:757 |
| PayrollEntryInput | nonTaxEligibility | import('../modules/payroll/nonTaxRules').NonTaxEligibility | 선택 | src/domain/types.ts:758 |
| PayrollEntryInput | monthlyBasePay | number | 선택 | src/domain/types.ts:760 |
| PayrollEntryInput | insuranceOverrides | InsuranceOverrides | 선택 | src/domain/types.ts:761 |
| PayrollEntryInput | id | string | 선택 | src/domain/types.ts:762 |
| PayrollEntryInput | runId | string | 필수 | src/domain/types.ts:763 |
| PayrollEntryInput | employmentId | string | 필수 | src/domain/types.ts:764 |
| PayrollEntryInput | prorationRate | number | 필수 | src/domain/types.ts:765 |
| PayrollEntryInput | taxableAllowance | number | 필수 | src/domain/types.ts:766 |
| PayrollEntryInput | nonTaxableAllowance | number | 필수 | src/domain/types.ts:767 |
| PayrollEntryInput | overtimePay | number | 필수 | src/domain/types.ts:768 |
| PayrollEntryInput | bonus | number | 필수 | src/domain/types.ts:769 |
| PayrollEntryInput | retroPay | number | 필수 | src/domain/types.ts:770 |
| PayrollEntryInput | otherEarnings | number | 필수 | src/domain/types.ts:771 |
| PayrollEntryInput | unpaidDeduction | number | 필수 | src/domain/types.ts:772 |
| PayrollEntryInput | otherDeductions | number | 필수 | src/domain/types.ts:773 |
| PayrollEntryInput | pensionBaseMonthly | number | 필수 | src/domain/types.ts:774 |
| PayrollEntryInput | healthBaseMonthly | number | 필수 | src/domain/types.ts:775 |
| PayrollEntryInput | employmentInsuranceBaseMonthly | number | 필수 | src/domain/types.ts:776 |
| PayrollEntryInput | incomeTaxManual | number | 필수 | src/domain/types.ts:777 |
| PayrollEntryInput | itemAmounts | Record<string, number> | 선택 | src/domain/types.ts:778 |
| PayrollEntryInput | attendanceRevision | number | 선택 | src/domain/types.ts:779 |
| PayrollEntryInput | memo | string | 필수 | src/domain/types.ts:780 |
| PayrollRunInput | period | string | 필수 | src/domain/types.ts:784 |
| PayrollRunInput | payDate | string | 필수 | src/domain/types.ts:785 |
| PayrollRunInput | note | string | 필수 | src/domain/types.ts:786 |
| PayrollRunSummary | run | PayrollRun | 필수 | src/domain/types.ts:790 |
| PayrollRunSummary | employeeCount | number | 필수 | src/domain/types.ts:791 |
| PayrollRunSummary | grossPay | number | 필수 | src/domain/types.ts:792 |
| PayrollRunSummary | deductions | number | 필수 | src/domain/types.ts:793 |
| PayrollRunSummary | netPay | number | 필수 | src/domain/types.ts:794 |
| PayrollRunSummary | warningCount | number | 필수 | src/domain/types.ts:795 |
| PayrollRunSummary | errorCount | number | 필수 | src/domain/types.ts:796 |
| AttendanceDailyRecord | confirmedAt | string | 선택 | src/domain/types.ts:801 |
| AttendanceDailyRecord | manualEdited | boolean | 선택 | src/domain/types.ts:802 |
| AttendanceDailyRecord | source | string | 선택 | src/domain/types.ts:803 |
| AttendanceDailyRecord | exceptionWork | boolean | 선택 | src/domain/types.ts:804 |
| AttendanceDailyRecord | payTreatment | 'PAID'\|'UNPAID'\|'BENEFIT' | 선택 | src/domain/types.ts:805 |
| AttendanceDailyRecord | offKind | 'PERSONAL'\|'WEEKEND'\|'STATUTORY'\|'COMPANY' | 선택 | src/domain/types.ts:806 |
| AttendanceDailyRecord | note | string | 선택 | src/domain/types.ts:807 |
| AttendanceDailyRecord | paidCreditHours | number | 선택 | src/domain/types.ts:808 |
| AttendanceDailyRecord | attachments | import("./attachments").StoredFile[] | 선택 | src/domain/types.ts:809 |
| AttendanceDailyRecord | activity | AttendanceActivity | 선택 | src/domain/types.ts:810 |
| AttendanceDailyRecord | nonWorkKind | 'ANNUAL_LEAVE'\|'OFF'\|'SICK' | 선택 | src/domain/types.ts:811 |
| AttendanceDailyRecord | nonWorkStartTime | string | 선택 | src/domain/types.ts:812 |
| AttendanceDailyRecord | nonWorkEndTime | string | 선택 | src/domain/types.ts:813 |
| AttendanceDailyRecord | nonWorkNextDay | boolean | 선택 | src/domain/types.ts:814 |
| AttendanceDailyRecord | leaveHours | number | 선택 | src/domain/types.ts:815 |
| AttendanceDailyRecord | id | string | 필수 | src/domain/types.ts:816 |
| AttendanceDailyRecord | employmentId | string | 필수 | src/domain/types.ts:817 |
| AttendanceDailyRecord | workDate | string | 필수 | src/domain/types.ts:818 |
| AttendanceDailyRecord | startTime | string | 필수 | src/domain/types.ts:819 |
| AttendanceDailyRecord | endTime | string | 필수 | src/domain/types.ts:820 |
| AttendanceDailyRecord | endNextDay | boolean | 필수 | src/domain/types.ts:821 |
| AttendanceDailyRecord | breakStart | string | 필수 | src/domain/types.ts:822 |
| AttendanceDailyRecord | breakMinutes | number | 필수 | src/domain/types.ts:823 |
| AttendanceDailyRecord | holiday | boolean | 필수 | src/domain/types.ts:824 |
| AttendanceDailyRecord | absence | boolean | 필수 | src/domain/types.ts:825 |
| AttendanceDailyRecord | workedHours | number | 필수 | src/domain/types.ts:826 |
| AttendanceDailyRecord | overtimeHours | number | 필수 | src/domain/types.ts:827 |
| AttendanceDailyRecord | nightHours | number | 필수 | src/domain/types.ts:828 |
| AttendanceDailyRecord | holidayHours | number | 필수 | src/domain/types.ts:829 |
| AttendanceDailyRecord | holidayOvertimeHours | number | 필수 | src/domain/types.ts:830 |
| AttendanceDailyRecord | updatedAt | string | 필수 | src/domain/types.ts:831 |
| AttendanceDailyRecord | updatedBy | string | 필수 | src/domain/types.ts:832 |
| AttendanceDailyRecord | editReason | string | 필수 | src/domain/types.ts:833 |
| LeaveCase | id | string | 필수 | src/domain/types.ts:837 |
| LeaveCase | employmentId | string | 필수 | src/domain/types.ts:838 |
| LeaveCase | kind | LeaveKind | 필수 | src/domain/types.ts:839 |
| LeaveCase | startDate | string | 필수 | src/domain/types.ts:840 |
| LeaveCase | endDate | string \| null | 필수 | src/domain/types.ts:841 |
| LeaveCase | companyPayRate | number | 필수 | src/domain/types.ts:842 |
| LeaveCase | pensionExceptionApproved | boolean | 필수 | src/domain/types.ts:843 |
| LeaveCase | healthDeferred | boolean | 필수 | src/domain/types.ts:844 |
| LeaveCase | healthPremiumOverride | number \| null | 필수 | src/domain/types.ts:845 |
| LeaveCase | employmentBaseOverride | number \| null | 필수 | src/domain/types.ts:846 |
| LeaveCase | benefitAmount | number | 필수 | src/domain/types.ts:847 |
| LeaveCase | averageWageExcluded | boolean | 필수 | src/domain/types.ts:848 |
| LeaveCase | yearEndNote | string | 필수 | src/domain/types.ts:849 |
| LeaveCase | note | string | 필수 | src/domain/types.ts:850 |
| LeaveCase | updatedAt | string | 필수 | src/domain/types.ts:851 |

## 저장소별 인덱스

| 저장소 | 실제 인덱스 정의 |
|---|---|
| attendanceDailyRecords | , indexes: [{name:'byEmployeeDate',keyPath:['employmentId','workDate'],unique:true}] } |
| leaveCases | , indexes: [{name:'byEmploymentId',keyPath:'employmentId'}] } |
| payrollSettingsHistory | } |
| company | } |
| organizations | } |
| persons | , indexes: [{ name: 'byDomesticForeignType', keyPath: 'domesticForeignType' }] } |
| addresses | , indexes: [{ name: 'byPersonId', keyPath: 'personId' }] } |
| dependents | , indexes: [{ name: 'byEmploymentId', keyPath: 'employmentId' }] } |
| visas | , indexes: [{ name: 'byEmploymentId', keyPath: 'employmentId' }, { name: 'byExpiryDate', keyPath: 'expiryDate' }] } |
| bankAccounts | , indexes: [{ name: 'byEmploymentId', keyPath: 'employmentId' }] } |
| employments | , indexes: [{ name: 'byPersonId', keyPath: 'personId' }, { name: 'byStatus', keyPath: 'status' }] } |
| assignments | , indexes: [{ name: 'byEmploymentId', keyPath: 'employmentId' }, { name: 'byEffectiveTo', keyPath: 'effectiveTo' }] } |
| compensations | , indexes: [{ name: 'byEmploymentId', keyPath: 'employmentId' }, { name: 'byEffectiveTo', keyPath: 'effectiveTo' }] } |
| taxProfiles | , indexes: [{ name: 'byEmploymentId', keyPath: 'employmentId' }] } |
| socialInsuranceProfiles | , indexes: [{ name: 'byEmploymentId', keyPath: 'employmentId' }] } |
| militaryServiceProfiles | , indexes: [{ name: 'byEmploymentId', keyPath: 'employmentId', unique: true }] } |
| educations | , indexes: [{ name: 'byEmploymentId', keyPath: 'employmentId' }] } |
| careers | , indexes: [{ name: 'byEmploymentId', keyPath: 'employmentId' }] } |
| certifications | , indexes: [{ name: 'byEmploymentId', keyPath: 'employmentId' }] } |
| skills | , indexes: [{ name: 'byEmploymentId', keyPath: 'employmentId' }, { name: 'byCategory', keyPath: 'category' }] } |
| resumes | , indexes: [{ name: 'byEmploymentId', keyPath: 'employmentId' }] } |
| workSchedules | } |
| attendanceSettings | , indexes: [{ name: 'byEmploymentId', keyPath: 'employmentId' }] } |
| managerRelationships | , indexes: [{ name: 'byEmploymentId', keyPath: 'employmentId', unique: true }] } |
| personnelEvents | , indexes: [{ name: 'byEmploymentId', keyPath: 'employmentId' }, { name: 'byStatus', keyPath: 'status' }, { name: 'byEffectiveDate', keyPath: 'effectiveDate' }] } |
| auditLogs | , indexes: [{ name: 'byOccurredAt', keyPath: 'occurredAt' }, { name: 'byEntityId', keyPath: 'entityId' }] } |
| payrollRuns | , indexes: [{ name: 'byPeriod', keyPath: 'period', unique: true }, { name: 'byStatus', keyPath: 'status' }] } |
| payrollEntries | , indexes: [{ name: 'byRunId', keyPath: 'runId' }, { name: 'byEmploymentId', keyPath: 'employmentId' }, { name: 'byRunEmployment', keyPath: ['runId','employmentId'], unique: true }] } |
| payrollResults | , indexes: [{ name: 'byRunId', keyPath: 'runId' }, { name: 'byEmploymentId', keyPath: 'employmentId' }, { name: 'byRunEmployment', keyPath: ['runId','employmentId'], unique: true }] } |
| attendanceMonthlySummaries | , indexes: [{ name: 'byEmploymentId', keyPath: 'employmentId' }, { name: 'byPeriod', keyPath: 'period' }, { name: 'byEmploymentPeriod', keyPath: ['employmentId','period'], unique: true }] } |
| annualLeaveLedgers | , indexes: [{ name: 'byEmploymentId', keyPath: 'employmentId' }, { name: 'byYear', keyPath: 'year' }, { name: 'byEmploymentYear', keyPath: ['employmentId','year'], unique: true }] } |
| dailyWorkers | , indexes: [{ name: 'byPersonId', keyPath: 'personId' }, { name: 'byOrganizationId', keyPath: 'organizationId' }, { name: 'byStatus', keyPath: 'status' }] } |
| dailyWorkRecords | , indexes: [{ name: 'byDailyWorkerId', keyPath: 'dailyWorkerId' }, { name: 'byWorkDate', keyPath: 'workDate' }] } |
| retirementSettlements | , indexes: [{ name: 'byEmploymentId', keyPath: 'employmentId' }, { name: 'byStatus', keyPath: 'status' }] } |
| yearEndTaxCases | , indexes: [{ name: 'byEmploymentId', keyPath: 'employmentId' }, { name: 'byTaxYear', keyPath: 'taxYear' }, { name: 'byEmploymentYear', keyPath: ['employmentId','taxYear'], unique: true }] } |
| payrollItemMasters | , indexes: [{ name: 'byCode', keyPath: 'code', unique: true }, { name: 'byCategory', keyPath: 'category' }] } |
| calendarEvents | } |
| issues | } |
| complianceSettings | } |
| policyDocuments | } |
| welfareCases | } |
| occupationCodeMappings | } |
| filingDrafts | } |
| meta | } |
