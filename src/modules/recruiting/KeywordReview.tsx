import {useState} from 'react'
import {Button} from '../../components/ui/button'
import {Input} from '../../components/ui/input'
import {NativeSelect} from '../../components/ui/native-select'
import {candidateText,keywordMatches} from './candidateText'
import type {Candidate} from './recruiting'

export function KeywordReview({candidates}:{candidates:Candidate[]}){
 const [id,setId]=useState(''),[query,setQuery]=useState(''),[busy,setBusy]=useState(false),[results,setResults]=useState<{name:string;matches:ReturnType<typeof keywordMatches>;error?:string}[]>([])
 const selected=candidates.find(c=>c.id===id);
 async function run(){
  const keys=[...new Set(query.trim().split(/[,\n]+/).map(s=>s.trim()).filter(Boolean))];if(!keys.length||!selected?.documents?.length)return;
  setBusy(true);try{setResults(await Promise.all(selected.documents.map(async d=>{
   try{return {name:d.name,matches:keywordMatches(await candidateText(d),keys)}}
   catch(e){return {name:d.name,matches:[],error:(e as Error).message}}
  })))}finally{setBusy(false)}
 }
 return <section className="panel"><h3>이력서·자기소개서 키워드 검토</h3><div className="filters"><NativeSelect aria-label="지원자" disabled={busy} value={id} onChange={e=>{setId(e.target.value);setResults([])}}><option value="">지원자 선택</option>{candidates.filter(c=>c.documents?.length).map(c=><option key={c.id} value={c.id}>{c.name} · {c.source}</option>)}</NativeSelect><Input aria-label="검색 키워드" disabled={busy} placeholder="키워드 (쉼표로 구분)" value={query} onChange={e=>{setQuery(e.target.value);setResults([])}}/><Button disabled={busy||!selected||!query.trim()} onClick={()=>void run()}>{busy?'검토 중…':'검토'}</Button></div>{results.map((r,i)=><article className="panel" key={i}><strong>{r.name}</strong>{r.error?<p>{r.error}</p>:r.matches.length?r.matches.map(m=><div key={m.keyword}><strong>{m.keyword} · {m.count}회</strong><ul>{m.snippets.map((s,i)=><li key={i}>{s}</li>)}</ul></div>):<p>일치하는 키워드가 없습니다.</p>}</article>)}</section>
}
