import assert from 'node:assert/strict'
import {dashboardPayroll} from '../src/app/dashboardPayroll'
import type {PayrollRun,PayrollResult,DailyWorkRecord} from '../src/domain/types'
const runs=[{id:'calculated',period:'2026-10',payDate:'2026-11-01',status:'CALCULATED'},{id:'paid',period:'2026-09',payDate:'2026-10-01',status:'PAID'}] as PayrollRun[]
const results=[{runId:'calculated',netPay:200},{runId:'paid',netPay:100},{runId:'missing',netPay:999}] as PayrollResult[]
const daily=[{workDate:'2026-10-01',netPay:50}] as DailyWorkRecord[]
const actual=dashboardPayroll(runs,results,daily)
assert.deepEqual(actual,{paid:{'2026-10':100},calculated:{'2026-10':200,'2026-09':100},dailyEarnings:{'2026-10':50}})
assert.deepEqual(dashboardPayroll([],[],[]),{paid:{},calculated:{},dailyEarnings:{}})
console.log('PASS calculated vs paid vs daily earnings; attribution vs payment month; orphan results; empty data')
