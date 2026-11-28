import type {PayrollEntry,PayrollResult,PayrollRun} from '../../domain/types'
export interface ReopenPayrollInput {runId:string;reason:string;unpaidConfirmed:boolean;filingReviewed:boolean;unlockAttendance:boolean}
export interface PaidCorrectionInput {id:string;sourceRunId:string;targetRunId:string;employmentId:string;itemCode:string;kind:'ADDITIONAL'|'DEDUCTION'|'CLASSIFICATION';before:number;after:number;reason:string;confirmed:boolean}
export interface PayrollCorrectionRecord extends PaidCorrectionInput {delta:number;createdAt:string;actor:string;sourceStatus:'PAID';targetStatus:string;actualAdditionalPayment:number|null;impacts:string[]}
export const correctionImpacts=['원천세·지방소득세 신고 정정 검토','사회보험 보수·정산 검토','연말정산·퇴직정산 원천 검토','급여요약: 실제 지급과 정정 차액 구분']
export interface PayrollReopenArchive {run:PayrollRun;entries:PayrollEntry[];results:PayrollResult[];reason:string;at:string}
