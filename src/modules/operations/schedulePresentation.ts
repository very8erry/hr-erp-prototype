import type {CalendarEvent} from './operations'
/** One shared projection for calendar, day agenda and both Excel views. */
export function scheduleTopic(e:CalendarEvent){if(!e.work)return e.scope==='COMPANY'?'회사일정':'일반';const text=e.title+' '+e.work.category;if(e.work.issueId||/직원 이슈|산재|임신|출산|육아/.test(e.title))return '직원이슈';if(/안전|보건|MSDS|경영방침|위험성/.test(e.title))return '안전보건';if(/채용/.test(text))return '채용';if(/급여|보험|세무|일용|외주|연말정산|퇴직연금|명세서/.test(text))return '급여·신고';if(/근태|연차/.test(text))return '근태·휴가';if(/게시 위치/.test(text))return '공지·게시';if(/규정|취업규칙|괴롭힘|성희롱|개인정보|법령|노사|고충/.test(text))return '규정·노무';if(/교육|복지/.test(text))return '교육·복지';return '인사운영'}

export function activeSchedules(events:CalendarEvent[]){const keys=new Set<string>();return events.filter(e=>!e.supersededBy&&!e.work?.deletedAt).filter(e=>{const key=[e.title.trim(),e.startDate,e.endDate,e.employmentIds?.join(','),e.work?.workflowDocumentId??''].join('|');if(keys.has(key))return false;keys.add(key);return true})}
export function schedulesForDay(events:CalendarEvent[],date:string){return activeSchedules(events).filter(e=>e.startDate<=date&&e.endDate>=date)}
