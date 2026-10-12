import {describeAudit} from './auditDescription'
import {NoticeBoard} from '../modules/operations/WorkRulesPanel'
import { LayoutDashboard, Users, CalendarDays, Wallet, HardHat, Building2, ScrollText, BriefcaseBusiness, HeartHandshake, PanelLeft, FlaskConical, CircleUserRound, ChevronRight, type LucideIcon } from 'lucide-react'
import { Card } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { NativeSelect } from '../components/ui/native-select'
import { Modal } from '../components/ui/modal'
import { Button } from '../components/ui/button'
import {WelfarePanel} from '../modules/operations/OperationsPanels'
import {EmployeeRegistrationModal} from '../modules/core-hr/EmployeeRegistration'
import {RecruitingPage} from '../modules/recruiting/RecruitingPage'
import {TableControls} from '../components/TableControls'
import {ScrollTable} from '../components/ScrollTable'
import { useEffect, useMemo, useState, Children, type ReactNode } from 'react'
import type { AuditLog, Company, EmployeeView, Organization } from '../domain/types'
import { IndexedDbHrRepository } from '../infrastructure/db/indexedDb'
import { EmployeeDetail } from '../modules/core-hr/EmployeeDetail'
import { statusLabel } from '../modules/core-hr/labels'
import { HrService } from '../modules/core-hr/hrService'
import { DailyWorkerPage } from '../modules/payroll/DailyWorkerPage'
import { PayrollPage } from '../modules/payroll/PayrollPage'
import { PayrollService } from '../modules/payroll/payrollService'
import { AttendancePage } from '../modules/attendance/AttendancePage'
import type { LeaveCase } from '../domain/types'
import { leaveLabels } from '../modules/attendance/AttendanceTools'
import { DataToolbar } from './DataToolbar'
import {SearchSelect} from '../components/SearchSelect'
import {seoulDate} from '../modules/payroll/companyInfo'
import {CompanyInfoPage} from '../modules/payroll/CompanyInfoPage'
import {OperationsDashboard} from './OperationsDashboard'
import { BUILD_VERSION } from './version'

const repository = new IndexedDbHrRepository()
const service = new HrService(repository)
const payrollService = new PayrollService(repository)

type View = 'dashboard' | 'employees' | 'audit' | 'attendance' | 'payroll' | 'daily' | 'company' | 'recruiting' | 'welfare' | 'notices'

export default function App() {
  const [showBuildNotice,setShowBuildNotice]=useState(()=>typeof localStorage!=='undefined'&&localStorage.getItem('dismissedBuild')!==BUILD_VERSION)
  const [leaveCases,setLeaveCases]=useState<LeaveCase[]>([])
  const [ready,setReady]=useState(false)
  const [readyService,setReadyService]=useState<PayrollService|null>(null)
  const [initError,setInitError]=useState('')
  const [view,setView]=useState<View>('dashboard')
  const [sidebarOpen,setSidebarOpen]=useState(false)
  useEffect(()=>setSidebarOpen(false),[view])
  const [company,setCompany]=useState<Company|null>(null)
  const [showRegister,setShowRegister]=useState(false)
  const [employees,setEmployees]=useState<EmployeeView[]>([])
  const [organizations,setOrganizations]=useState<Organization[]>([])
  const [auditLogs,setAuditLogs]=useState<AuditLog[]>([])
  const [selectedId,setSelectedId]=useState<string|null>(null)
  const [notice,setNotice]=useState('')
  const [dataRevision,setDataRevision]=useState(0)

  const refresh=async()=>{
    const [c,e,o,al]=await Promise.all([service.company(),service.employees(),service.organizations(),service.auditLogs()])
    setLeaveCases(await payrollService.leaveCases());setCompany(c); setEmployees(e); setOrganizations(o); setAuditLogs(al)
  }

  useEffect(()=>{
    let active=true
    setReady(false);setInitError('')
    const timeout=new Promise<never>((_,reject)=>window.setTimeout(()=>reject(new Error('초기화가 600초 이상 완료되지 않았습니다. IndexedDB 연결 또는 마이그레이션 상태를 확인해야 합니다.')),600000))
    void Promise.race([(async()=>{await service.initialize();await payrollService.ensureDemoHistory();await refresh()})(),timeout]).then(()=>{if(active){setReadyService(payrollService);setReady(true)}}).catch(err=>{if(active)setInitError(err instanceof Error?err.message:'초기화 중 오류가 발생했습니다.')})
    return()=>{active=false}
  },[payrollService])

  useEffect(()=>{if(!ready)return;let lastDate=seoulDate();const timer=window.setInterval(()=>{const date=seoulDate();if(date===lastDate)return;lastDate=date;void payrollService.ensureDemoHistory().then(refresh).then(()=>setDataRevision(v=>v+1)).catch(e=>setNotice(e.message))},60000);return()=>clearInterval(timer)},[ready])
  const summary=useMemo(()=>HrService.summary(employees),[employees])
  const selected=employees.find(e=>e.employmentId===selectedId)??null
  const resetDemo=async()=>{if(!window.confirm('현재 브라우저의 실습 데이터를 모두 지우고 초기 가상회사로 되돌릴까요?'))return;await service.resetDemo();await payrollService.ensureDemoHistory();await refresh();setDataRevision(v=>v+1);setSelectedId(null);setNotice('교육환경을 초기화했습니다.')}

  const expectedBuild = new URLSearchParams(window.location.search).get('expectedBuild')
  if(expectedBuild && expectedBuild!==BUILD_VERSION) return <div className="loadingError"><h2>다른 버전 서버가 실행 중입니다</h2><p>브라우저가 Build {BUILD_VERSION}이 아닌 {expectedBuild} 실행을 기대하고 있습니다. 기존 Vite 서버를 종료하고 이 버전을 다시 실행하세요.</p></div>
  if(initError) return <div className="loadingError"><h2>초기화에 실패했습니다</h2><p>{initError}</p><Button onClick={()=>window.location.reload()}>다시 시도</Button></div>
  if(!ready||readyService!==payrollService) return <div className="loading">HR 실습환경을 준비하고 있습니다… 첫 실행에는 21개월 가상자료 생성에 약 1~2분이 걸릴 수 있습니다.<small>Build {BUILD_VERSION} · WFM/Payroll 활성 연결을 검증하고 데이터를 준비합니다.</small></div>

  return <div className="shell">
    <TableControls/>{sidebarOpen&&<button className="mobileSidebarScrim" aria-label="메뉴 닫기" onClick={()=>setSidebarOpen(false)}/>}<aside className={`sidebar ${sidebarOpen?'isOpen':''}`}>
      {showBuildNotice&&<Modal onClose={()=>{localStorage.setItem('dismissedBuild',BUILD_VERSION);setShowBuildNotice(false)}} className="modalBackdrop"><div className="modal" role="dialog" aria-modal="true" aria-label="개선사항 안내"><Button className="noticeClose" aria-label="닫기" onClick={()=>{localStorage.setItem('dismissedBuild',BUILD_VERSION);setShowBuildNotice(false)}}>×</Button><p>HRIS 개선사항 테스트 중.</p></div></Modal>}<div className="brand"><span className="brandMark">HR</span><div><strong>lemonpAI</strong><small>인사 실습 시스템</small><em className="buildBadge">Build {BUILD_VERSION}</em></div></div>
      <nav aria-label="주요 메뉴"><div className="navGroup">워크스페이스</div>
        <Nav active={view==='dashboard'} onClick={()=>setView('dashboard')}>대시보드</Nav>
        <Nav active={view==='employees'} onClick={()=>{setView('employees');setSelectedId(null)}}>직원 관리</Nav>
        <Nav active={view==='attendance'} onClick={()=>setView('attendance')}>근태</Nav>
        <Nav active={view==='payroll'} onClick={()=>setView('payroll')}>급여</Nav>
        <Nav active={view==='daily'} onClick={()=>setView('daily')}>일용직</Nav>
        <Nav active={view==='company'} onClick={()=>setView('company')}>회사정보</Nav>
        <Nav active={view==='notices'} onClick={()=>setView('notices')}>공지게시판</Nav><Nav active={view==='audit'} onClick={()=>{setView('audit');void refresh()}}>감사로그</Nav>
        <Nav active={view==='recruiting'} onClick={()=>setView('recruiting')}>채용 <span className="badge muted">구조화중</span></Nav><Nav active={view==='welfare'} onClick={()=>setView('welfare')}>복지</Nav><div className="navGroup">확장 모듈</div>
        {['인사평가','보상','인공지능 실습','인재개발','시뮬레이션'].map(label=><Button key={label} className="nav disabled" disabled title="다음 개발 단계에서 연결됩니다."><FlaskConical aria-hidden="true"/><span className="navLabel">{label}<span>추후</span></span></Button>)}
      </nav><div className="sidebarFooter"><div><span className="adminAvatar"><CircleUserRound size={18} aria-hidden="true"/></span><div><strong>인사 관리자 모드</strong><small>교육용 가상 워크스페이스</small></div><ChevronRight size={14} aria-hidden="true"/></div></div>
    </aside>
    <main className="main">
      <header className="topbar"><div><div className="topbarTitleRow"><Button variant="outline" className="mobileMenuButton" aria-label="메뉴 열기" aria-expanded={sidebarOpen} onClick={()=>setSidebarOpen(true)}><PanelLeft aria-hidden="true"/></Button><h1>{company?.name}</h1></div><p>인사 통합 운영 워크스페이스 · 대한민국 · Build {BUILD_VERSION}</p><p className="demoNotice">{company?.demoNotice}</p></div><DataToolbar attendance={view==='attendance'} employees={employees} hr={service} payroll={payrollService} onImported={async()=>{await refresh();setSelectedId(null);setDataRevision(v=>v+1)}} onNotice={setNotice} onReset={resetDemo}/></header>
      {notice&&<div className="toast" role="status">{notice}<Button onClick={()=>setNotice('')}>×</Button></div>}
      {view==='dashboard'&&<OperationsDashboard key={dataRevision} employees={employees} service={payrollService}/>} 
      {view==='employees'&&!selected&&<EmployeeList onRegister={()=>setShowRegister(true)} leaveCases={leaveCases} employees={employees} onSelect={setSelectedId}/>} 
      {showRegister&&<EmployeeRegistrationModal organizations={organizations} onClose={()=>setShowRegister(false)} onSave={async data=>{await service.registerEmployee(data);setShowRegister(false);await refresh()}}/>}
      {view==='employees'&&selected&&<EmployeeDetail service={service} employee={selected} employees={employees} organizations={organizations} onBack={()=>setSelectedId(null)} onChanged={async(message)=>{await refresh();setNotice(message)}}/>} 
      {view==='attendance'&&<AttendancePage key={dataRevision} service={payrollService} employees={employees}/>} 
      {view==='payroll'&&<PayrollPage key={dataRevision} service={payrollService} onNotice={setNotice} employees={employees} organizations={organizations}/>} 
      {view==='daily'&&<DailyWorkerPage key={dataRevision} service={payrollService} organizations={organizations} onNotice={setNotice}/>} 
      {view==='company'&&<CompanyInfoPage employees={employees} service={payrollService} onNotice={m=>{void refresh();setNotice(m)}}/>}
      {view==='recruiting'&&<RecruitingPage key={dataRevision} service={payrollService} organizations={organizations} onChanged={refresh}/>}
      {view==='notices'&&<NoticeBoard service={payrollService}/>} {view==='welfare'&&<WelfarePanel service={payrollService} employees={employees}/>} {view==='audit'&&<AuditList rows={auditLogs}/>} 
    </main>
  </div>
}

const navIcons:Record<string,LucideIcon>={'대시보드':LayoutDashboard,'직원 관리':Users,'근태':CalendarDays,'급여':Wallet,'일용직':HardHat,'회사정보':Building2,'공지게시판':ScrollText,'감사로그':ScrollText,'채용':BriefcaseBusiness,'복지':HeartHandshake}
function Nav({active,onClick,children}:{active:boolean;onClick:()=>void;children:ReactNode}) { const label=Children.toArray(children).find(c=>typeof c==='string')?.toString().trim()??'';const Icon=navIcons[label]??LayoutDashboard;return <Button variant="ghost" className={`nav ${active?'active':''}`} aria-current={active?'page':undefined} onClick={onClick}><Icon aria-hidden="true"/><span className="navLabel">{children}</span></Button> }

function Dashboard({summary,employees}:{summary:ReturnType<typeof HrService.summary>;employees:EmployeeView[]}) {
  const year=new Date().getFullYear();const today=new Date().toISOString().slice(0,10)
  const [metric,setMetric]=useState<'HEADCOUNT'|'HIRES'|'TERMINATIONS'>('HEADCOUNT')
  const [from,setFrom]=useState(`${year}-01-01`);const [to,setTo]=useState(today)
  const asOf=(date:string)=>employees.filter(e=>e.hireDate<=date&&(!e.terminationDate||e.terminationDate>=date))
  const startHeadcount=asOf(from).length
  const rows=useMemo(()=>employees.filter(e=>metric==='HEADCOUNT'?e.hireDate<=to&&(!e.terminationDate||e.terminationDate>=to):metric==='HIRES'?e.hireDate>=from&&e.hireDate<=to:!!e.terminationDate&&e.terminationDate>=from&&e.terminationDate<=to),[employees,metric,from,to])
  const orgCounts=Object.entries(rows.reduce<Record<string,number>>((acc,e)=>{acc[e.organizationName]=(acc[e.organizationName]??0)+1;return acc},{})).sort((a,b)=>b[1]-a[1]).slice(0,8);const max=Math.max(1,...orgCounts.map(x=>x[1]))
  const metricName=metric==='HEADCOUNT'?'기준일 총인원':metric==='HIRES'?'기간 입사자':'기간 퇴사자'
  return <section><div className="pageTitle"><div><h2>HR 운영 대시보드</h2><p>총인원·입사자·퇴사자를 드롭다운과 기간 기준으로 조회합니다.</p></div></div><div className="dashboardQuery"><NativeSelect value={metric} onChange={e=>setMetric(e.target.value as typeof metric)}><option value="HEADCOUNT">총인원</option><option value="HIRES">입사자</option><option value="TERMINATIONS">퇴사자</option></NativeSelect><Input type="date" value={from} onChange={e=>setFrom(e.target.value)}/><Input type="date" value={to} onChange={e=>setTo(e.target.value)}/><div className="metricResult"><span>{metricName}</span><strong>{metric==='HEADCOUNT'?`${startHeadcount} → ${rows.length}명`:`${rows.length}명`}</strong></div></div><div className="stats"><Stat label="현재 재직" value={`${summary.active}명`} note="ACTIVE"/><Stat label="현재 휴직" value={`${summary.leave}명`} note="LEAVE"/><Stat label="누적 퇴직" value={`${summary.terminated}명`} note="이력 보존"/><Stat label="외국인" value={`${summary.foreign}명`} note="Visa/Tax 연결"/><Stat label="연간 보상 기준액" value={`${Math.round(summary.annualPayroll/100_000_000)}억`} note="퇴직자 제외"/></div><div className="grid2"><Card className="panel"><h3>{metricName} · 조직별</h3><div className="bars">{orgCounts.map(([name,count])=><div className="barRow" key={name}><span>{name}</span><div><i style={{width:`${count/max*100}%`}}/></div><strong>{count}</strong></div>)}</div></Card></div></section>
}
function Stat({label,value,note}:{label:string;value:string;note:string}) { return <Card className="stat"><span>{label}</span><strong>{value}</strong><small>{note}</small></Card> }
export function EmployeeList({employees,onSelect,leaveCases,onRegister}:{onRegister?:()=>void;employees:EmployeeView[];leaveCases:LeaveCase[];onSelect:(id:string)=>void}){
 const [query,setQuery]=useState(''),[category,setCategory]=useState<'status'|'organizationName'|'job'|'grade'>('status'),[filters,setFilters]=useState({status:'ALL',organizationName:'ALL',job:'ALL',grade:'ALL'})
 const labels={status:'재직상태',organizationName:'조직',job:'직무',grade:'직급'}
 const options=category==='status'?[{value:'ALL',label:'전체 재직상태'},{value:'ACTIVE',label:'재직자'},{value:'LEAVE',label:'휴직자'},{value:'TERMINATED',label:'퇴사자'}]:[{value:'ALL',label:`전체 ${labels[category]}`},...[...new Set(employees.map(e=>e[category]))].sort().map(v=>({value:v,label:v}))]
 const filtered=employees.filter(e=>Object.entries(filters).every(([k,v])=>v==='ALL'||e[k as keyof typeof filters]===v)&&`${e.name} ${e.englishName} ${e.employeeNumber}`.toLowerCase().includes(query.toLowerCase()))
 return <section><div className="pageTitle"><div><h2>직원 관리</h2></div><div className="toolbar">{onRegister&&<Button onClick={onRegister}>직원 등록</Button>}<span className="count">{filtered.length}명</span></div></div><div className="filters coreFilters"><Input value={query} onChange={e=>setQuery(e.target.value)} placeholder="이름 / 영문명 / 사번 검색"/><NativeSelect aria-label="검색 분류" value={category} onChange={e=>setCategory(e.target.value as typeof category)}>{Object.entries(labels).map(([k,v])=><option key={k} value={k}>{v}</option>)}</NativeSelect><SearchSelect key={category} label={labels[category]} value={filters[category]} options={options} onChange={v=>setFilters({...filters,[category]:v})}/><Button onClick={()=>{setFilters({status:'ALL',organizationName:'ALL',job:'ALL',grade:'ALL'});setQuery('')}}>필터 초기화</Button></div><ScrollTable><table><thead><tr><th>사번</th><th>성명</th><th>구분</th><th>상태</th><th>조직</th><th>직급</th><th>직책</th><th>직무</th><th>입사일</th><th>퇴사일</th></tr></thead><tbody>{filtered.map(e=><tr key={e.employmentId} onClick={()=>onSelect(e.employmentId)}><td>{e.employeeNumber}</td><td><strong>{e.name}</strong><small className="cellSub">{e.englishName}</small></td><td>{e.domesticForeignType==='FOREIGN'?'외국인':'내국인'}</td><td><span className={`status ${e.status.toLowerCase()}`}>{statusLabel[e.status]}{e.status==='LEAVE'&&` · ${leaveLabels[leaveCases.find(r=>r.employmentId===e.employmentId&&r.startDate<=new Date().toISOString().slice(0,10)&&(!r.endDate||r.endDate>=new Date().toISOString().slice(0,10)))?.kind??'UNCLASSIFIED']}`}</span></td><td>{e.organizationName}</td><td>{e.grade}</td><td>{e.title}</td><td>{e.job}</td><td>{e.hireDate}</td><td>{e.terminationDate??'—'}</td></tr>)}</tbody></table></ScrollTable></section>
}
function AuditList({rows}:{rows:AuditLog[]}) { return <section><div className="pageTitle"><div><h2>감사로그</h2><p>누가 · 언제 · 어디서 · 무엇을 · 어떻게 · 왜 변경했는지 확인합니다.</p></div><span className="count">{rows.length}건</span></div><div className="auditCards">{rows.map(r=>{const a=describeAudit(r);return <article className="auditCard" key={r.id}><dl>{([['언제',a.when],['누가',a.who],['어디서',a.where],['무엇을',a.what],['어떻게',a.how],['왜',a.why]] as const).map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}{label==='무엇을'&&<small className="cellSub">대상: {a.target}</small>}</dd></div>)}</dl></article>})}{!rows.length&&<p>아직 기록된 변경 내역이 없습니다.</p>}</div></section> }
