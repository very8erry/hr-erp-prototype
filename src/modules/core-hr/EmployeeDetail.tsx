import { useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from 'react'
import type {
  Dependent,
  DependentInput,
  EmployeeMasterDetail,
  EmployeeView,
  ManagerRelationshipInput,
  MilitaryServiceProfile,
  Organization,
  PayrollDependentInfo,
} from '../../domain/types'
import { HrService } from './hrService'
import { employmentTypeLabel, eventLabel, money, shortDate, statusLabel, todayLocal, yesNo } from './labels'

type DetailTab = 'summary' | 'personal' | 'employment' | 'payroll' | 'capability' | 'attendance' | 'history' | 'documents'

interface Props {
  service: HrService
  employee: EmployeeView
  employees: EmployeeView[]
  organizations: Organization[]
  onBack: () => void
  onChanged: (message: string) => Promise<void>
}

export function EmployeeDetail({ service, employee, employees, organizations, onBack, onChanged }: Props) {
  const [detail,setDetail]=useState<EmployeeMasterDetail|null>(null)
  const [payrollDependent,setPayrollDependent]=useState<PayrollDependentInfo|null>(null)
  const [tab,setTab]=useState<DetailTab>('summary')
  const [dependentEdit,setDependentEdit]=useState<Dependent|'NEW'|null>(null)
  const [showManager,setShowManager]=useState(false)
  const [showMilitary,setShowMilitary]=useState(false)
  const [error,setError]=useState('')

  const reload=async()=>{
    const [master,dep]=await Promise.all([
      service.employeeMaster(employee.employmentId),
      service.payrollDependentInfo(employee.employmentId,todayLocal()),
    ])
    setDetail(master); setPayrollDependent(dep)
  }

  useEffect(()=>{ void reload().catch(err=>setError(err instanceof Error?err.message:'직원 상세 조회 실패')) },[employee.employmentId])

  if (!detail) return <section><button className="back" onClick={onBack}>← 직원 목록</button><div className="panel">{error || 'Employee Master를 불러오는 중입니다…'}</div></section>

  const currentVisa=detail.visas.find(v=>v.effectiveEndDate===null)
  const currentBank=detail.bankAccounts.find(v=>v.effectiveEndDate===null && v.isPayrollAccount)
  const relation=detail.managerRelationship
  const managerName=(id:string|null|undefined)=>id ? employees.find(e=>e.employmentId===id)?.name ?? id : '-'

  const saved=async(message:string)=>{ await onChanged(message); await reload() }

  return <section>
    <button className="back" onClick={onBack}>← 직원 목록</button>
    <div className="employeeHero">
      <div><div className="avatar">{employee.name.slice(-2)}</div><div><h2>{employee.name} <small>{employee.employeeNumber}</small></h2><p>{employee.organizationName} · {employee.grade} · {employee.title} · {employee.job}</p><div className="heroTags"><span>{statusLabel[employee.status]}</span><span>{employee.domesticForeignType==='FOREIGN'?'외국인':'내국인'}</span>{currentVisa&&<VisaBadge expiryDate={currentVisa.expiryDate}/>}</div></div></div>
    </div>

    <div className="detailTabs" role="tablist">
      {([
        ['summary','요약'],['personal','개인정보'],['employment','고용정보'],['payroll','급여/세무'],
        ['capability','이력/역량'],['attendance','근태설정'],['history','인사이력'],['documents','첨부문서'],
      ] as Array<[DetailTab,string]>).map(([key,label])=><button key={key} className={tab===key?'active':''} onClick={()=>setTab(key)}>{label}</button>)}
    </div>

    {tab==='summary' && <SummaryTab detail={detail} payrollDependent={payrollDependent} currentVisa={currentVisa} currentBank={currentBank} managerName={managerName}/>} 
    {tab==='personal' && <PersonalTab detail={detail} currentVisa={currentVisa} currentBank={currentBank} onAddDependent={()=>setDependentEdit('NEW')} onEditDependent={setDependentEdit} onEditMilitary={()=>setShowMilitary(true)}/>} 
    {tab==='employment' && <EmploymentTab detail={detail} managerName={managerName} onEditManagers={()=>setShowManager(true)}/>} 
    {tab==='payroll' && <PayrollTaxTab detail={detail} payrollDependent={payrollDependent}/>} 
    {tab==='capability' && <CapabilityTab detail={detail}/>} 
    {tab==='attendance' && <AttendanceTab detail={detail} managerName={managerName} onEditManagers={()=>setShowManager(true)}/>} 
    {tab==='history' && <HistoryTab detail={detail} organizations={organizations}/>} 
    {tab==='documents' && <DocumentsTab detail={detail}/>} 

    {dependentEdit && <DependentModal service={service} employmentId={employee.employmentId} initial={dependentEdit==='NEW'?null:dependentEdit} onClose={()=>setDependentEdit(null)} onSaved={async()=>{setDependentEdit(null);await saved('가족/부양가족 정보를 저장했습니다.')}}/>}
    {showMilitary && <MilitaryServiceModal service={service} employmentId={employee.employmentId} initial={detail.militaryServiceProfile} onClose={()=>setShowMilitary(false)} onSaved={async()=>{setShowMilitary(false);await saved('병역정보를 저장했습니다.')}}/>}
    {showManager && <ManagerModal service={service} employmentId={employee.employmentId} employees={employees} initial={relation} onClose={()=>setShowManager(false)} onSaved={async()=>{setShowManager(false);await saved('Manager/Approver 관계를 저장했습니다.')}}/>}
  </section>
}

function SummaryTab({detail,payrollDependent,currentVisa,currentBank,managerName}:{detail:EmployeeMasterDetail;payrollDependent:PayrollDependentInfo|null;currentVisa:EmployeeMasterDetail['visas'][number]|undefined;currentBank:EmployeeMasterDetail['bankAccounts'][number]|undefined;managerName:(id:string|null|undefined)=>string}) {
  const {employee,person,address,managerRelationship}=detail
  return <>
    <div className="detailGrid">
      <Section title="현재 Employment"><Info label="재직상태" value={statusLabel[employee.status]}/><Info label="고용형태" value={employmentTypeLabel[employee.employmentType]}/><Info label="입사일" value={employee.hireDate}/><Info label="근무지" value={employee.workLocation}/><Info label="직무" value={employee.job}/></Section>
      <Section title="개인정보 요약"><Info label="생년월일" value={person.birthDate}/><Info label="국적" value={person.nationality}/><Info label="휴대전화" value={person.mobile}/><Info label="주소" value={address?`${address.addressLine1} ${address.addressLine2}`:'-'}/><Info label="가상 식별값" value={person.syntheticIdentifier}/></Section>
      <Section title="Downstream 기준정보"><Info label="현재 연봉" value={`${money(employee.annualSalary)}원`}/><Info label="급여계좌" value={currentBank?`${currentBank.bankName} ${currentBank.accountNumberMasked}`:'-'}/><Info label="기본공제 대상 가족" value={`${payrollDependent?.basicDeductionCount??0}명`}/><Info label="현재 비자" value={currentVisa?`${currentVisa.visaType} / ${currentVisa.expiryDate}`:'해당 없음'}/><Info label="직속 관리자" value={managerName(managerRelationship?.directManagerId)}/></Section>
    </div>
    <div className="panel sourceOfTruth"><h3>Employee Master = Single Source of Truth</h3><p>이 화면의 원천정보를 Payroll, 연말정산, 퇴직정산, 근태, Compliance가 참조합니다. 업무 계산 결과 자체는 Employee Master에 저장하지 않습니다.</p><div className="sourceFlow"><span>Dependent</span><b>→</b><span>Payroll / Year-end Tax</span><span>Employment</span><b>→</b><span>Leave / Retirement</span><span>Compensation</span><b>→</b><span>Payroll / Retirement</span></div></div>
  </>
}

function PersonalTab({detail,currentVisa,currentBank,onAddDependent,onEditDependent,onEditMilitary}:{detail:EmployeeMasterDetail;currentVisa:EmployeeMasterDetail['visas'][number]|undefined;currentBank:EmployeeMasterDetail['bankAccounts'][number]|undefined;onAddDependent:()=>void;onEditDependent:(d:Dependent)=>void;onEditMilitary:()=>void}) {
  const {person,address}=detail
  return <div className="stack">
    <div className="detailGrid">
      <Section title="기본정보"><Info label="성명" value={person.fullName}/><Info label="영문명" value={person.englishName||'-'}/><Info label="한자명" value={person.hanjaName||'-'}/><Info label="생년월일" value={person.birthDate}/><Info label="성별" value={person.gender==='F'?'여성':'남성'}/><Info label="구분" value={person.domesticForeignType==='FOREIGN'?'외국인':'내국인'}/><Info label="가상 식별번호" value={person.syntheticIdentifier}/></Section>
      <Section title="연락처 / 주소"><Info label="휴대전화" value={person.mobile}/><Info label="전화번호" value={person.phone}/><Info label="이메일" value={person.email}/><Info label="우편번호" value={address?.postalCode??'-'}/><Info label="주소" value={address?`${address.addressLine1} ${address.addressLine2}`:'-'}/><Info label="비상연락처" value={`${person.emergencyContactName} / ${person.emergencyContactPhone}`}/><Info label="관계" value={person.emergencyContactRelation}/></Section>
      <Section title="국적 / 거주자 기준"><Info label="국적" value={person.nationality}/><Info label="신고용 국적" value={person.reportingNationality}/><Info label="거주자 구분" value={detail.taxProfile?.residentType==='NON_RESIDENT'?'비거주자':'거주자'}/><Info label="거주지국" value={detail.taxProfile?.residenceCountry??'-'}/><Info label="거주지국 코드" value={detail.taxProfile?.residenceCountryCode??'-'}/></Section>
      <Section title="병역정보" action={<button className="smallButton" onClick={onEditMilitary}>병역 수정</button>}><Info label="병역상태" value={detail.militaryServiceProfile?militaryStatusLabel(detail.militaryServiceProfile.status):'-'}/><Info label="복무형태" value={detail.militaryServiceProfile?.serviceType||'-'}/><Info label="군별 / 계급" value={detail.militaryServiceProfile?.branch?`${detail.militaryServiceProfile.branch} / ${detail.militaryServiceProfile.rank}`:'-'}/><Info label="복무기간" value={detail.militaryServiceProfile?.serviceStartDate?`${detail.militaryServiceProfile.serviceStartDate} ~ ${detail.militaryServiceProfile.serviceEndDate??'-'}`:'-'}/><Info label="예비군/병역 공가 기준" value={detail.militaryServiceProfile?.militaryDutyLeaveEligible?'대상':'해당 없음'}/><Info label="비고" value={detail.militaryServiceProfile?.note||'-'}/></Section>
    </div>

    <Section title="가족 / 부양가족" action={<button className="smallButton" onClick={onAddDependent}>+ 가족 추가</button>}>
      {detail.dependents.length===0?<p className="empty">등록된 가족정보가 없습니다.</p>:<div className="miniTable"><div className="miniHead"><span>관계</span><span>성명</span><span>생년월일</span><span>기본공제</span><span>자녀공제</span><span></span></div>{detail.dependents.map(d=><div key={d.id}><span>{d.relation}</span><span>{d.name}</span><span>{d.birthDate}</span><span>{yesNo(d.basicDeductionEligible)}</span><span>{yesNo(d.childDeductionEligible)}</span><span><button className="linkButton" onClick={()=>onEditDependent(d)}>수정</button></span></div>)}</div>}
    </Section>

    <div className="grid2">
      <Section title="외국인 / 비자 / 체류정보">
        {currentVisa?<><Info label="비자" value={currentVisa.visaType}/><Info label="상태" value={currentVisa.visaStatus}/><Info label="근로허가" value={yesNo(currentVisa.workPermission)}/><Info label="만료일" value={currentVisa.expiryDate}/><Info label="외국인등록" value={currentVisa.foreignRegistrationNumberMasked}/><Info label="여권" value={currentVisa.passportNumberMasked}/></>:<p className="empty">현재 적용 중인 비자정보가 없습니다.</p>}
        {detail.visas.length>1&&<div className="subList"><strong>과거 비자이력</strong>{detail.visas.slice(1).map(v=><span key={v.id}>{v.visaType} · {v.effectiveStartDate} ~ {v.effectiveEndDate??v.expiryDate}</span>)}</div>}
      </Section>
      <Section title="계좌 / 지급정보">{currentBank?<><Info label="은행" value={currentBank.bankName}/><Info label="계좌번호" value={currentBank.accountNumberMasked}/><Info label="예금주" value={currentBank.accountHolder}/><Info label="급여지급계좌" value={yesNo(currentBank.isPayrollAccount)}/><Info label="적용시작" value={currentBank.effectiveStartDate}/></>:<p className="empty">급여지급계좌가 없습니다.</p>}</Section>
    </div>
  </div>
}

function EmploymentTab({detail,managerName,onEditManagers}:{detail:EmployeeMasterDetail;managerName:(id:string|null|undefined)=>string;onEditManagers:()=>void}) {
  const e=detail.employee; const r=detail.managerRelationship
  return <div className="detailGrid">
    <Section title="Employment"><Info label="사번" value={e.employeeNumber}/><Info label="재직상태" value={statusLabel[e.status]}/><Info label="고용형태" value={employmentTypeLabel[e.employmentType]}/><Info label="입사일" value={e.hireDate}/><Info label="퇴직일" value={shortDate(e.terminationDate)}/></Section>
    <Section title="Assignment"><Info label="조직" value={e.organizationName}/><Info label="직급" value={e.grade}/><Info label="직책" value={e.title}/><Info label="직무" value={e.job}/><Info label="근무지" value={e.workLocation}/><Info label="근무제" value={detail.workSchedule?.name??'-'}/></Section>
    <Section title="Manager / Approver" action={<button className="smallButton" onClick={onEditManagers}>관계 수정</button>}><Info label="직속 관리자" value={managerName(r?.directManagerId)}/><Info label="HR 담당자" value={managerName(r?.hrManagerId)}/><Info label="휴가 승인자" value={managerName(r?.leaveApproverId)}/><Info label="근태 승인자" value={managerName(r?.attendanceApproverId)}/><Info label="평가자" value={managerName(r?.performanceReviewerId)}/></Section>
  </div>
}

function PayrollTaxTab({detail,payrollDependent}:{detail:EmployeeMasterDetail;payrollDependent:PayrollDependentInfo|null}) {
  const tax=detail.taxProfile; const si=detail.socialInsuranceProfile
  return <div className="stack">
    <div className="detailGrid">
      <Section title="세무 기준정보"><Info label="거주자/비거주자" value={tax?.residentType==='NON_RESIDENT'?'비거주자':'거주자'}/><Info label="외국인 여부" value={yesNo(tax?.foreignEmployee)}/><Info label="외국인 단일세율 적용" value={yesNo(tax?.foreignFlatTaxApplied)}/><Info label="본인 기본공제 기준" value={yesNo(tax?.selfBasicDeductionEligible)}/><Info label="부양가족 수 (계산값)" value={`${payrollDependent?.dependents.length??0}명`}/><Info label="기본공제 대상 (계산값)" value={`${payrollDependent?.basicDeductionCount??0}명`}/><Info label="자녀공제 대상 (계산값)" value={`${payrollDependent?.childDeductionCount??0}명`}/></Section>
      <Section title="사회보험 기준정보"><Info label="국민연금 대상" value={yesNo(si?.nationalPensionEligible)}/><Info label="건강보험 대상" value={yesNo(si?.healthInsuranceEligible)}/><Info label="고용보험 대상" value={yesNo(si?.employmentInsuranceEligible)}/><Info label="산재보험 대상" value={yesNo(si?.industrialAccidentInsuranceEligible)}/><Info label="적용 시작일" value={si?.effectiveStartDate??'-'}/></Section>
      <Section title="현재 보상 / 지급"><Info label="연봉 기준액" value={`${money(detail.employee.annualSalary)}원`}/><Info label="급여계좌" value={detail.bankAccounts.find(v=>v.isPayrollAccount&&v.effectiveEndDate===null)?.accountNumberMasked??'-'}/><Info label="Compensation History" value={`${detail.compensationHistory.length}건`}/><p className="sectionNote">Payroll 계산 결과는 여기에 저장하지 않고, Payroll Module이 이 기준정보를 참조합니다.</p></Section>
    </div>
    <Section title="Compensation History"><HistoryRows rows={detail.compensationHistory.map(c=>[c.effectiveFrom,c.effectiveTo??'현재',`${money(c.annualSalary)}원`])}/></Section>
  </div>
}

function CapabilityTab({detail}:{detail:EmployeeMasterDetail}) {
  return <div className="stack">
    <div className="grid2">
      <Section title="학력">{detail.educations.map(e=><RecordCard key={e.id} title={`${e.schoolName} · ${e.degree}`} lines={[`전공 ${e.major}`,`${e.admissionDate} ~ ${e.graduationDate??'재학'}`,e.graduated?'졸업':'미졸업']}/>)}</Section>
      <Section title="이전 경력">{detail.careers.length?detail.careers.map(c=><RecordCard key={c.id} title={`${c.companyName} · ${c.title}`} lines={[`${c.organization} / ${c.job}`,`${c.startDate} ~ ${c.endDate} · ${c.careerMonths}개월`,c.responsibilities]}/>):<p className="empty">이전 경력이 없습니다.</p>}</Section>
    </div>
    <div className="grid2">
      <Section title="자격 / 면허">{detail.certifications.length?detail.certifications.map(c=><RecordCard key={c.id} title={c.name} lines={[c.issuer,`취득 ${c.acquiredDate}`,`상태 ${c.status}`]}/>):<p className="empty">등록된 자격이 없습니다.</p>}</Section>
      <Section title="어학 / Skill"><div className="skillGrid">{detail.skills.map(s=><div key={s.id}><small>{s.category}</small><strong>{s.skillName}</strong><span>{s.proficiency}{s.score?` · ${s.score}`:''}</span></div>)}</div></Section>
    </div>
    <Section title="Resume"><ResumeList rows={detail.resumes}/></Section>
  </div>
}

function AttendanceTab({detail,managerName,onEditManagers}:{detail:EmployeeMasterDetail;managerName:(id:string|null|undefined)=>string;onEditManagers:()=>void}) {
  const a=detail.attendanceSetting; const w=detail.workSchedule; const r=detail.managerRelationship
  return <div className="detailGrid">
    <Section title="Work Schedule"><Info label="근무제" value={w?.name??'-'}/><Info label="근무시간" value={w?`${w.startTime} ~ ${w.endTime}`:'-'}/><Info label="휴게" value={w?`${w.breakMinutes}분`:'-'}/><Info label="Timezone" value={a?.timezone??'Asia/Seoul'}/></Section>
    <Section title="근태 식별정보"><Info label="PIN" value={a?.attendancePin??'-'}/><Info label="Badge ID" value={a?.badgeId??'-'}/><Info label="RFID" value={a?.rfidId??'-'}/><p className="sectionNote">모든 값은 출퇴근 연동 실습을 위한 Dummy Value입니다.</p></Section>
    <Section title="승인자" action={<button className="smallButton" onClick={onEditManagers}>승인자 수정</button>}><Info label="휴가 승인자" value={managerName(r?.leaveApproverId)}/><Info label="근태 승인자" value={managerName(r?.attendanceApproverId)}/><Info label="평가자" value={managerName(r?.performanceReviewerId)}/></Section>
  </div>
}

function HistoryTab({detail,organizations}:{detail:EmployeeMasterDetail;organizations:Organization[]}) {
  const orgName=(id:string)=>organizations.find(o=>o.id===id)?.name??id
  return <div className="stack">
    <Section title="Personnel Action Timeline">{detail.personnelEvents.length===0?<p className="empty">등록된 인사발령이 없습니다.</p>:<div className="timeline">{detail.personnelEvents.map(e=><div key={e.id}><span>{e.effectiveDate}</span><i/><div><strong>{eventLabel[e.eventType]}</strong><p>{e.reason}</p><small>{e.status==='APPLIED'?'적용 완료':'효력일 대기'}</small></div></div>)}</div>}</Section>
    <div className="grid2">
      <Section title="Assignment History"><HistoryRows rows={detail.assignmentHistory.map(a=>[a.effectiveFrom,a.effectiveTo??'현재',`${orgName(a.organizationId)} / ${a.grade} / ${a.title} / ${a.job}`])}/></Section>
      <Section title="Compensation History"><HistoryRows rows={detail.compensationHistory.map(c=>[c.effectiveFrom,c.effectiveTo??'현재',`${money(c.annualSalary)}원`])}/></Section>
    </div>
  </div>
}

function DocumentsTab({detail}:{detail:EmployeeMasterDetail}) {
  const certDocs=detail.certifications.filter(c=>c.attachmentName)
  return <div className="grid2">
    <Section title="Resume / 경력문서"><ResumeList rows={detail.resumes}/></Section>
    <Section title="자격 첨부문서">{certDocs.length?certDocs.map(c=><RecordCard key={c.id} title={c.attachmentName??''} lines={[c.name,c.issuer,'Dummy File Metadata']}/>):<p className="empty">첨부문서 메타데이터가 없습니다.</p>}</Section>
  </div>
}

function militaryStatusLabel(status:MilitaryServiceProfile['status']) { return status==='COMPLETED'?'군필':status==='SERVING'?'복무중':status==='EXEMPT'?'면제':'해당없음' }

function VisaBadge({expiryDate}:{expiryDate:string}) {
  const today=new Date(`${todayLocal()}T00:00:00Z`).getTime(); const expiry=new Date(`${expiryDate}T00:00:00Z`).getTime(); const days=Math.ceil((expiry-today)/86400000)
  const className=days<0?'visaBadge expired':days<=30?'visaBadge urgent':days<=90?'visaBadge warning':'visaBadge'
  const label=days<0?'비자 만료':days<=30?`비자 ${days}일`:days<=90?`비자 ${days}일`:'비자 정상'
  return <span className={className}>{label}</span>
}

function Section({title,action,children}:{title:string;action?:ReactNode;children:ReactNode}) { return <div className="panel sectionPanel"><div className="sectionHead"><h3>{title}</h3>{action}</div>{children}</div> }
function Info({label,value}:{label:string;value:string}) { return <div className="info"><span>{label}</span><strong>{value}</strong></div> }
function RecordCard({title,lines}:{title:string;lines:string[]}) { return <div className="recordCard"><strong>{title}</strong>{lines.map((v,i)=><span key={`${v}-${i}`}>{v}</span>)}</div> }
function HistoryRows({rows}:{rows:string[][]}) { return rows.length?<div className="historyRows">{rows.map((r,i)=><div key={`${r.join('-')}-${i}`}><span>{r[0]}</span><span>{r[1]}</span><strong>{r[2]}</strong></div>)}</div>:<p className="empty">이력이 없습니다.</p> }
function ResumeList({rows}:{rows:EmployeeMasterDetail['resumes']}) { return rows.length?<div className="resumeList">{rows.map(r=><div key={r.id}><div><strong>{r.fileName}</strong><span>v{r.version} · {new Date(r.uploadedAt).toLocaleDateString('ko-KR')} · {r.uploadedBy}</span></div><em className={r.status==='CURRENT'?'badge':'badge muted'}>{r.status}</em></div>)}</div>:<p className="empty">Resume 메타데이터가 없습니다.</p> }

function DependentModal({service,employmentId,initial,onClose,onSaved}:{service:HrService;employmentId:string;initial:Dependent|null;onClose:()=>void;onSaved:()=>Promise<void>}) {
  const [relation,setRelation]=useState<Dependent['relation']>(initial?.relation??'자녀')
  const [name,setName]=useState(initial?.name??'')
  const [birthDate,setBirthDate]=useState(initial?.birthDate??'')
  const [cohabitation,setCohabitation]=useState(initial?.cohabitation??true)
  const [disabilityStatus,setDisabilityStatus]=useState(initial?.disabilityStatus??false)
  const [basicDeductionEligible,setBasic]=useState(initial?.basicDeductionEligible??true)
  const [childDeductionEligible,setChild]=useState(initial?.childDeductionEligible??true)
  const [effectiveStartDate,setStart]=useState(initial?.effectiveStartDate??todayLocal())
  const [effectiveEndDate,setEnd]=useState(initial?.effectiveEndDate??'')
  const [error,setError]=useState('')
  const submit=async()=>{
    const input:DependentInput={id:initial?.id,employmentId,relation,name,birthDate,cohabitation,disabilityStatus,basicDeductionEligible,childDeductionEligible:relation==='자녀'&&childDeductionEligible,effectiveStartDate,effectiveEndDate:effectiveEndDate||null}
    await service.saveDependent(input)
    await onSaved()
  }
  return <div className="modalBackdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><form className="modal wideModal" onSubmit={e=>{e.preventDefault();setError('');void submit().catch(err=>setError(err instanceof Error?err.message:'저장 실패'))}}><ModalHead title={initial?'가족정보 수정':'가족정보 추가'} onClose={onClose}/><div className="formGrid"><label>관계<select value={relation} onChange={e=>setRelation(e.target.value as Dependent['relation'])}>{['배우자','자녀','부','모','형제자매','기타'].map(v=><option key={v}>{v}</option>)}</select></label><label>성명<input value={name} onChange={e=>setName(e.target.value)} required/></label><label>생년월일<input type="date" value={birthDate} onChange={e=>setBirthDate(e.target.value)} required/></label><label>적용 시작일<input type="date" value={effectiveStartDate} onChange={e=>setStart(e.target.value)} required/></label><label>적용 종료일<input type="date" value={effectiveEndDate} onChange={e=>setEnd(e.target.value)}/></label></div><div className="checks"><label><input type="checkbox" checked={cohabitation} onChange={e=>setCohabitation(e.target.checked)}/> 동거</label><label><input type="checkbox" checked={disabilityStatus} onChange={e=>setDisabilityStatus(e.target.checked)}/> 장애 여부</label><label><input type="checkbox" checked={basicDeductionEligible} onChange={e=>setBasic(e.target.checked)}/> 기본공제 대상</label><label><input type="checkbox" disabled={relation!=='자녀'} checked={relation==='자녀'&&childDeductionEligible} onChange={e=>setChild(e.target.checked)}/> 자녀공제 대상</label></div><p className="hint">공제 여부는 Employee Master의 원천 기준값입니다. 실제 연말정산 계산은 별도 Module에서 수행합니다.</p>{error&&<p className="formError">{error}</p>}<ModalActions onClose={onClose}/></form></div>
}

function MilitaryServiceModal({service,employmentId,initial,onClose,onSaved}:{service:HrService;employmentId:string;initial:MilitaryServiceProfile|null;onClose:()=>void;onSaved:()=>Promise<void>}) {
  const [form,setForm]=useState<MilitaryServiceProfile>(initial ?? {id:`MIL-${employmentId}`,employmentId,status:'NOT_APPLICABLE',serviceType:'',branch:'',rank:'',serviceStartDate:null,serviceEndDate:null,dischargeType:'',exemptionReason:'',reserveForcesEligible:false,reserveForcesEndDate:null,militaryDutyLeaveEligible:false,note:''})
  const [error,setError]=useState('')
  const text=(key:keyof MilitaryServiceProfile)=>(e:ChangeEvent<HTMLInputElement|HTMLTextAreaElement>)=>setForm(v=>({...v,[key]:e.target.value||null}))
  return <div className="modalBackdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><form className="modal wideModal" onSubmit={e=>{e.preventDefault();setError('');void service.saveMilitaryServiceProfile(form).then(onSaved).catch(err=>setError(err instanceof Error?err.message:'저장 실패'))}}><ModalHead title="병역정보 수정" subtitle="향후 예비군·민방위·병역 관련 공가/휴가 Rule에서 참조하는 원천정보입니다." onClose={onClose}/><div className="formGrid"><label>병역상태<select value={form.status} onChange={e=>setForm({...form,status:e.target.value as MilitaryServiceProfile['status']})}><option value="COMPLETED">군필</option><option value="SERVING">복무중</option><option value="EXEMPT">면제</option><option value="NOT_APPLICABLE">해당없음</option></select></label><label>복무형태<input value={form.serviceType} onChange={text('serviceType')}/></label><label>군별<input value={form.branch} onChange={text('branch')}/></label><label>계급<input value={form.rank} onChange={text('rank')}/></label><label>복무 시작일<input type="date" value={form.serviceStartDate??''} onChange={e=>setForm({...form,serviceStartDate:e.target.value||null})}/></label><label>복무 종료일<input type="date" value={form.serviceEndDate??''} onChange={e=>setForm({...form,serviceEndDate:e.target.value||null})}/></label><label>전역구분<input value={form.dischargeType} onChange={text('dischargeType')}/></label><label>면제사유<input value={form.exemptionReason} onChange={text('exemptionReason')}/></label><label>예비군 종료일<input type="date" value={form.reserveForcesEndDate??''} onChange={e=>setForm({...form,reserveForcesEndDate:e.target.value||null})}/></label></div><div className="checks"><label><input type="checkbox" checked={form.reserveForcesEligible} onChange={e=>setForm({...form,reserveForcesEligible:e.target.checked})}/> 예비군 대상</label><label><input type="checkbox" checked={form.militaryDutyLeaveEligible} onChange={e=>setForm({...form,militaryDutyLeaveEligible:e.target.checked})}/> 병역 관련 공가/휴가 기준 대상</label></div><label>비고<textarea value={form.note} onChange={e=>setForm({...form,note:e.target.value})}/></label>{error&&<p className="formError">{error}</p>}<ModalActions onClose={onClose}/></form></div>
}

function ManagerModal({service,employmentId,employees,initial,onClose,onSaved}:{service:HrService;employmentId:string;employees:EmployeeView[];initial:EmployeeMasterDetail['managerRelationship'];onClose:()=>void;onSaved:()=>Promise<void>}) {
  const [query,setQuery]=useState('')
  const [form,setForm]=useState<ManagerRelationshipInput>({employmentId,directManagerId:initial?.directManagerId??null,hrManagerId:initial?.hrManagerId??null,leaveApproverId:initial?.leaveApproverId??null,attendanceApproverId:initial?.attendanceApproverId??null,performanceReviewerId:initial?.performanceReviewerId??null})
  const [error,setError]=useState('')
  const candidates=useMemo(()=>employees.filter(e=>e.employmentId!==employmentId&&e.status!=='TERMINATED'&&(`${e.name} ${e.employeeNumber} ${e.organizationName}`.toLowerCase().includes(query.toLowerCase()))),[employees,employmentId,query])
  const selectedIds=new Set([form.directManagerId,form.hrManagerId,form.leaveApproverId,form.attendanceApproverId,form.performanceReviewerId].filter(Boolean))
  const options=[...employees.filter(e=>selectedIds.has(e.employmentId)),...candidates].filter((v,i,a)=>a.findIndex(x=>x.employmentId===v.employmentId)===i)
  const row=(key:Exclude<keyof ManagerRelationshipInput,'employmentId'>,label:string)=><label>{label}<select value={form[key]??''} onChange={e=>setForm({...form,[key]:e.target.value||null})}><option value="">미지정</option>{options.map(e=><option key={e.employmentId} value={e.employmentId}>{e.name} · {e.employeeNumber} · {e.organizationName}</option>)}</select></label>
  return <div className="modalBackdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><form className="modal wideModal" onSubmit={e=>{e.preventDefault();setError('');void service.saveManagerRelationship(form).then(onSaved).catch(err=>setError(err instanceof Error?err.message:'저장 실패'))}}><ModalHead title="Manager / Approver 설정" onClose={onClose}/><label>직원 검색<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="이름, 사번, 조직 검색"/></label><div className="formGrid">{row('directManagerId','직속 관리자')}{row('hrManagerId','HR 담당자')}{row('leaveApproverId','휴가 승인자')}{row('attendanceApproverId','근태 승인자')}{row('performanceReviewerId','평가자')}</div>{error&&<p className="formError">{error}</p>}<ModalActions onClose={onClose}/></form></div>
}

function ModalHead({title,subtitle,onClose}:{title:string;subtitle?:string;onClose:()=>void}) { return <div className="modalHead"><div><h3>{title}</h3>{subtitle&&<p>{subtitle}</p>}</div><button type="button" onClick={onClose}>×</button></div> }
function ModalActions({onClose}:{onClose:()=>void}) { return <div className="modalActions"><button type="button" onClick={onClose}>취소</button><button className="primary" type="submit">저장</button></div> }
