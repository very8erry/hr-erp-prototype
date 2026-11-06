/// <reference types="vite/client" />
import type {StoredFile} from '../../domain/attachments'
import {readPolicyFile} from '../operations/policyReading'

export async function candidateText(doc:StoredFile){
 if(/\.pdf$/i.test(doc.name)){
  const [pdf,{default:worker}]=await Promise.all([import('pdfjs-dist'),import('pdfjs-dist/build/pdf.worker.min.mjs?url')]);
  pdf.GlobalWorkerOptions.workerSrc=worker;
  const task=pdf.getDocument({data:Uint8Array.from(atob(doc.dataUrl.split(',')[1]),s=>s.charCodeAt(0))});
  try{
   const file=await task.promise,paragraphs:string[]=[];
   for(let i=1;i<=file.numPages;i++){
    const page=await file.getPage(i),text=await page.getTextContent();
    paragraphs.push(text.items.map(x=>'str' in x?x.str+(x.hasEOL?'\n':' '):'').join(''));
   }
   const text=paragraphs.join('\n').trim();if(!text)throw new Error('텍스트가 없는 PDF입니다. 스캔 문서는 원본에서 확인하세요.');
   return text
  }finally{await task.destroy()}
 }
 const result=await readPolicyFile({...doc,mimeType:doc.type});
 if(result.status!=='본문 읽음'||!result.text.trim())throw new Error('본문을 읽을 수 없는 문서입니다.');
 return result.text
}
export function keywordMatches(text:string,keywords:string[]){
 const normalized=text.normalize('NFKC'),hay=normalized.toLowerCase();
 return keywords.flatMap(keyword=>{
  const key=keyword.normalize('NFKC').toLowerCase(),snippets:string[]=[];
  let at=0,count=0;
  while(key&&at<hay.length){
   const hit=hay.indexOf(key,at);if(hit<0)break;
   if(snippets.length<3)snippets.push(normalized.slice(Math.max(0,hit-34),hit+key.length+34).replace(/\s+/g,' '));
   count++;at=hit+key.length
  }
  return count?[{keyword,count,snippets}]:[]
 })
}
