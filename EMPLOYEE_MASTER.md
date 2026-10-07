# Employee Master v3

Employee Detail은 통합 View이지만 데이터는 Person/Address/Dependent/Visa/BankAccount/Employment/Assignment/Compensation/TaxProfile/SocialInsuranceProfile/MilitaryServiceProfile 등으로 분리합니다. Payroll, Year-end Tax, Retirement, Leave는 Employee Master를 Single Source of Truth로 참조합니다.

병역정보는 병역상태/복무형태/군별/계급/복무기간/전역구분/면제사유/예비군/병역 관련 공가 기준/비고를 별도 Entity로 관리하며 수정할 수 있습니다.
