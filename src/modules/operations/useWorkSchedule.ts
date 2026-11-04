import {projectIssueEvent} from '../../app/issueProgress'
import {useCallback,useEffect,useRef,useState} from 'react'
import type {CalendarEvent} from './operations'
import type {PayrollService} from '../payroll/payrollService'
import type {CompanyInfo} from '../payroll/companyInfo'
import type {ScheduleSources} from './workSchedule'
import {operatingEvents,projectWork,emptyReview,type PlanningReview} from './planningReview'
import type {PolicyDocument} from './operations'
import {hrCalendarSeed} from './scheduleData'
// Old generated HR defaults are projected into work tasks. Custom overrides survive.
export function visibleCalendar(events:CalendarEvent[],year:number){return operatingEvents(events)}
export function useWorkSchedule(service:PayrollService,year:number){const [events,setEvents]=useState<CalendarEvent[]>([]),[review,setReview]=useState<PlanningReview>(emptyReview()),[documents,setDocuments]=useState<PolicyDocument[]>([]),[references,setReferences]=useState<CalendarEvent[]>([]),[info,setInfo]=useState<CompanyInfo|null>(null),[sources,setSources]=useState<ScheduleSources|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(true),seq=useRef(0);
 const load=useCallback(async()=>{const token=++seq.current;try{await service.populateWorkYear(year);const [ops,i,s,r]=await Promise.all([service.operations(),service.companyInfo(),service.scheduleSources(),service.planningReview()]);if(token!==seq.current)return;setEvents(visibleCalendar(ops.calendarEvents,year).map(e=>{const projected=projectWork(e,ops.policyDocuments),issue=s.issues?.find(i=>i.id===e.work?.issueId);return issue?projectIssueEvent(projected,issue):projected}));setReview(r);setDocuments(ops.policyDocuments);setReferences([...new Map([...hrCalendarSeed(year),...ops.calendarEvents.filter(e=>!operatingEvents([e]).length&&!e.work?.deletedAt)].map(e=>[e.id,e])).values()]);setInfo(i);setSources(s);setError('')}catch(e){if(token===seq.current)setError(e instanceof Error?e.message:String(e))}finally{if(token===seq.current)setBusy(false)}},[service,year]);
 useEffect(()=>{void load();const refresh=()=>void load(),visible=()=>{if(document.visibilityState==='visible')refresh()},storage=(e:StorageEvent)=>{if(e.key==='workScheduleRevision')refresh()};window.addEventListener('focus',refresh);window.addEventListener('work-schedule-changed',refresh);window.addEventListener('storage',storage);document.addEventListener('visibilitychange',visible);return()=>{seq.current++;window.removeEventListener('focus',refresh);window.removeEventListener('work-schedule-changed',refresh);window.removeEventListener('storage',storage);document.removeEventListener('visibilitychange',visible)}},[load]);return {events,review,documents,references,info,sources,error,setError,busy,reload:load}}
