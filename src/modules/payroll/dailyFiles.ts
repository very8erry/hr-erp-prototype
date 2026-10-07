import type {DailyWorker,DailyWorkRecord} from '../../domain/types'
import {clockHours} from '../attendance/timeRules'
import {calculateDailyWorkRecord} from './dailyWorkerRules'
export const dailyAllowanceLabels={overtimeAllowance:'연장수당',nightAllowance:'야간수당',holidayAllowance:'휴일수당',otherAllowance:'기타수당'} as const
export const dailyHeaders=['번호','성명','근무일','출근','퇴근','익일퇴근','휴게시작','휴게분','실근로시간',...Object.values(dailyAllowanceLabels),'총지급','소득세','지방소득세','고용보험','실지급','메모']
export function dailyValues(worker:DailyWorker,r:DailyWorkRecord){return [worker.workerNumber,worker.workerNameSnapshot,r.workDate,r.startTime??'',r.endTime??'',r.endNextDay?1:0,r.breakStart??'',r.breakMinutes??'',r.hours,...Object.keys(dailyAllowanceLabels).map(k=>r[k as keyof typeof dailyAllowanceLabels]??0),r.grossPay,r.incomeTax,r.localIncomeTax,r.employmentInsurance,r.netPay,r.note]}
export function parseDailyRows(data:Record<string,unknown>[],worker:DailyWorker,existing:DailyWorkRecord[]):DailyWorkRecord[]{
  if(!data.length)throw new Error('일용 근무기록이 없습니다.')
  const seen=new Set<string>()
  return data.map((r,i)=>{
    if(String(r['번호'])!==worker.workerNumber||String(r['성명'])!==worker.workerNameSnapshot)throw new Error(`${i+2}행: 선택한 일용직과 번호·성명이 다릅니다.`)
    const date=String(r['근무일']);if(seen.has(date))throw new Error(`${i+2}행: 중복 근무일입니다.`);seen.add(date)
    const old=existing.find(v=>v.workDate===date);if(!old)throw new Error(`${i+2}행: 기존 근무일을 유지하세요. 신규 근무일은 화면에서 등록하세요.`)
    const number=(raw:unknown,label:string)=>{if(raw===''||raw==null||typeof raw==='boolean'||typeof raw==='object'||!Number.isFinite(Number(raw))||Number(raw)<0)throw new Error(`${i+2}행: ${label}은 0 이상의 숫자여야 합니다.`);return Number(raw)}
    const allowances=Object.fromEntries(Object.entries(dailyAllowanceLabels).map(([k,label])=>[k,number(r[label],label)]))
    const start=String(r['출근']??''),end=String(r['퇴근']??''),pause=String(r['휴게시작']??'');const next=number(r['익일퇴근'],'익일퇴근');if(next!==0&&next!==1)throw new Error('익일퇴근은 0 또는 1을 입력하세요.')
    const rest=r['휴게분']===''?undefined:number(r['휴게분'],'휴게분')
    const hours=start||end?clockHours(start,end,next===1,pause,rest??0,false).workedHours:number(r['실근로시간'],'실근로시간')
    return {...old,...calculateDailyWorkRecord(worker,date,hours,String(r['메모']??''),allowances),startTime:start||undefined,endTime:end||undefined,endNextDay:next===1,breakStart:pause||undefined,breakMinutes:rest}
  })
}
