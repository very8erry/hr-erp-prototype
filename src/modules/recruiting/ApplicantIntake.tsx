import {useState} from 'react'
import {Button} from '../../components/ui/button'
import {Input} from '../../components/ui/input'
import {Modal} from '../../components/ui/modal'
import {NativeSelect} from '../../components/ui/native-select'
import {storeFile} from '../../domain/attachments'
import {readTable} from '../attendance/attendanceFiles'
import {seoulDate} from '../payroll/companyInfo'
import {candidateText} from './candidateText'
import type {Candidate,RecruitingState} from './recruiting'

export const applicantSources=['알바몬','리멤버','사람인','원티드','잡코리아','직접지원'] as const
const normalize=(s:string)=>s.normalize('NFKC').toLowerCase().replace(/[\s_()/·-]/g,'')
export function intakeSource(value:string){
 const v=normalize(value)
 return applicantSources.find(s=>v===normalize(s))??({albamon:'알바몬',remember:'리멤버',saramin:'사람인',wanted:'원티드',jobkorea:'잡코리아'} as Record<string,string>)[v]
}
const read=(row:Record<string,unknown>,aliases:string[])=>{
 for(const [k,v] of Object.entries(row))if(aliases.map(normalize).includes(normalize(k))&&v!=null){
  if(typeof v==='object'&&'text' in v)return String(v.text).trim()
  if(typeof v==='string'||typeof v==='number')return String(v).trim()
 }
 return ''
}
export function parseApplicantRows(rows:Record<string,unknown>[],sources:string[],jobId:string,fallback?:string):Candidate[]{
 return rows.flatMap(r=>{
  const sourceValue=read(r,['지원경로','지원채널','채용플랫폼','플랫폼','유입경로','출처','채널','source']);
  const source=sourceValue?intakeSource(sourceValue):fallback;
  const name=read(r,['성명','이름','지원자명','지원자 이름','지원자','name']);
  if(!name||!source||!sources.includes(source))return [];
  const date=read(r,['지원일','접수일','applied']).replace(/[./]/g,'-');
  return [{id:crypto.randomUUID(),name,jobId,source,email:read(r,['이메일','전자우편','email']),phone:read(r,['전화번호','휴대폰','휴대전화','연락처','phone']),applied:/^\d{4}-\d{2}-\d{2}$/.test(date)?date:seoulDate(),stage:'지원접수',note:'',consent:false}];
 })
}
export function applicantIdentity(c:Candidate){
 const contact=c.email.trim().toLowerCase()||c.phone.replace(/\D/g,'')||c.name.trim().normalize('NFKC');
 return c.jobId+'|'+contact
}
export function ApplicantIntake({state,onSave,onClose}:{state:RecruitingState;onSave:(rows:Candidate[])=>Promise<void>;onClose:()=>void}){
 const [sources,setSources]=useState<string[]>([]),[fallback,setFallback]=useState(''),[jobId,setJobId]=useState(state.jobs[0]?.id??''),[rows,setRows]=useState<Candidate[]>([]),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false)
 async function parse(files:File[]){
  setRows([]);setNotice('');setBusy(true)
  try{
   if(!sources.length||!jobId)throw new Error('지원 경로와 공고를 선택하세요.');
   const defaultSource=sources.length===1?sources[0]:fallback;
   const next:Candidate[]=[];let skipped=0;
   for(const file of files){
    if(file.size>10*1024*1024)throw new Error(file.name+': 파일은 10MB 이하로 선택하세요.');
    if(/\.(csv|xlsx)$/i.test(file.name)){
     const table=await readTable(file);
     const accepted=parseApplicantRows(table,sources,jobId,defaultSource||undefined);
     skipped+=table.length-accepted.length;next.push(...accepted)
    }else{
     if(!defaultSource)throw new Error('채널 열이 없는 파일의 기본 지원 경로를 선택하세요.');
     const doc=await storeFile(file),body=await candidateText(doc).catch(()=>'');
     const name=body.match(/(?:^|\n)\s*(?:성명|이름|지원자명)\s*[:：]?\s*([가-힣]{2,6}|[A-Za-z][A-Za-z .'-]{1,60})/m)?.[1]??'';
     const email=body.match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i)?.[0]??'';
     next.push({id:crypto.randomUUID(),name,email,phone:body.match(/01[016789][- ]?\d{3,4}[- ]?\d{4}/)?.[0]??'',source:defaultSource,jobId,applied:seoulDate(),stage:'지원접수',consent:false,note:'',documents:[doc]})
    }
   }
   setRows(next);setNotice(`미리보기 ${next.length}건 · 필터 제외 또는 성명 누락 ${skipped}건`);
  }catch(e){setNotice((e as Error).message)}finally{setBusy(false)}
 }
 async function commit(){
  const seen=new Set(state.candidates.map(applicantIdentity)),next:Candidate[]=[];
  for(const c of rows){
   if(!c.name.trim()){setNotice('이름을 확인하세요.');return}
   const key=applicantIdentity(c);
   if(!seen.has(key)){seen.add(key);next.push({...c,name:c.name.trim()})}
  }
  if(!next.length){setNotice('등록 가능한 신규 지원자가 없습니다.');return}
  setBusy(true);try{await onSave(next);onClose()}catch(e){setNotice((e as Error).message)}finally{setBusy(false)}
 }
 const reset=()=>{setRows([]);setNotice('')};
 return <Modal onClose={onClose}><div className="modal wideModal"><h3>지원자 파일 등록</h3><fieldset disabled={busy}><legend>지원 경로 필터</legend><div className="toolbar">{applicantSources.map(s=><label key={s}><input type="checkbox" checked={sources.includes(s)} onChange={e=>{setSources(e.target.checked?[...sources,s]:sources.filter(x=>x!==s));setFallback('');reset()}}/>{s}</label>)}</div></fieldset><div className="formGrid"><label>채용공고<NativeSelect disabled={busy} value={jobId} onChange={e=>{setJobId(e.target.value);reset()}}>{state.jobs.map(j=><option key={j.id} value={j.id}>{j.title}</option>)}</NativeSelect></label>{sources.length>1&&<label>경로 열 없는 파일의 기본 채널<NativeSelect disabled={busy} value={fallback} onChange={e=>{setFallback(e.target.value);reset()}}><option value="">선택</option>{sources.map(s=><option key={s}>{s}</option>)}</NativeSelect></label>}</div><label>지원자 명단 또는 이력서<Input aria-label="채용 파일 업로드" type="file" multiple accept=".csv,.xlsx,.pdf,.docx,.txt" disabled={busy||!sources.length||!jobId} onChange={e=>{const f=Array.from(e.target.files??[]);e.currentTarget.value='';if(f.length)void parse(f)}}/></label><p>명단은 첫 줄에 성명·지원경로·이메일·전화번호를 넣으세요. 이력서는 원본을 첨부하고 추출한 정보는 등록 전 확인할 수 있습니다.</p>{rows.length>0&&<div className="annualPromotionList">{rows.map(c=><div className="formGrid three" key={c.id}><label>{c.source} · {c.documents?.[0]?.name??'성명'}<Input value={c.name} onChange={e=>setRows(v=>v.map(r=>r.id===c.id?{...r,name:e.target.value}:r))}/></label><label>이메일<Input value={c.email} onChange={e=>setRows(v=>v.map(r=>r.id===c.id?{...r,email:e.target.value}:r))}/></label><label>전화번호<Input value={c.phone} onChange={e=>setRows(v=>v.map(r=>r.id===c.id?{...r,phone:e.target.value}:r))}/></label></div>)}</div>}<p role="status">{notice}</p><div className="modalActions"><Button onClick={onClose}>닫기</Button><Button disabled={busy||!rows.length} onClick={()=>void commit()}>신규 지원자 등록</Button></div></div></Modal>
}
