import type {PayrollRun,PayrollResult,DailyWorkRecord} from '../domain/types'
// Paid payroll and daily earnings have different evidence/date semantics.
export function dashboardPayroll(runs:PayrollRun[],results:PayrollResult[],daily:DailyWorkRecord[]){
 const paid:Record<string,number>={},calculated:Record<string,number>={},dailyEarnings:Record<string,number>={}
 const add=(target:Record<string,number>,month:string,value:number)=>{target[month]=(target[month]??0)+value}
 const byId=new Map(runs.map(r=>[r.id,r]))
 for(const result of results){const run=byId.get(result.runId);if(!run)continue;add(calculated,run.period,result.netPay);if(run.status==='PAID')add(paid,run.payDate.slice(0,7),result.netPay)}
 for(const row of daily)add(dailyEarnings,row.workDate.slice(0,7),row.netPay)
 return {paid,calculated,dailyEarnings}
}
