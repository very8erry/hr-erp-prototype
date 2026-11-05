import {withholdingHtml,type WithholdingDraft} from './withholdingForm'
import type {CompanyInfo} from './companyInfo'
/** Image-backed A4 PDF: Korean glyphs rendered by canvas, no external font dependency. */
export function jpegPdf(jpeg:Uint8Array,width:number,height:number){
 const enc=new TextEncoder(),chunks:Uint8Array[]=[],offsets=[0];let length=0;const add=(v:string|Uint8Array)=>{const b=typeof v==='string'?enc.encode(v):v;chunks.push(b);length+=b.length};
 add('%PDF-1.4\n');const object=(id:number,text:string)=>{offsets[id]=length;add(`${id} 0 obj\n${text}\nendobj\n`)};
 object(1,'<< /Type /Catalog /Pages 2 0 R >>');object(2,'<< /Type /Pages /Kids [3 0 R] /Count 1 >>');object(3,'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.276 841.89] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>');
 offsets[4]=length;add(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`);add(jpeg);add('\nendstream\nendobj\n');
 const content='q 595.276 0 0 841.89 0 0 cm /Im0 Do Q';object(5,`<< /Length ${enc.encode(content).length} >>\nstream\n${content}\nendstream`);const start=length;add('xref\n0 6\n0000000000 65535 f \n');for(let i=1;i<=5;i++)add(String(offsets[i]).padStart(10,'0')+' 00000 n \n');add(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`);return new Blob(chunks as BlobPart[],{type:'application/pdf'})
}
export async function withholdingPdf(draft?:WithholdingDraft,company?:CompanyInfo){
 const response=await fetch('./withholding-form-v20260522.png');if(!response.ok)throw new Error('신고서 양식을 불러오지 못했습니다.');const url=URL.createObjectURL(await response.blob());
 try{const img=new Image();img.src=url;await img.decode();await document.fonts.ready;const canvas=document.createElement('canvas');canvas.width=2172;canvas.height=3072;const ctx=canvas.getContext('2d');if(!ctx)throw new Error('PDF 렌더러를 열지 못했습니다.');ctx.scale(3,3);ctx.fillStyle='white';ctx.fillRect(0,0,724,1024);ctx.drawImage(img,0,0,724,1024);
 if(draft&&company){const parsed=new DOMParser().parseFromString(withholdingHtml(draft,company,''),'text/html');ctx.font="7px Arial, 'Apple SD Gothic Neo', sans-serif";ctx.textBaseline='top';for(const span of parsed.querySelectorAll<HTMLElement>('.sheet span')){const x=parseFloat(span.style.left),y=parseFloat(span.style.top),width=parseFloat(span.style.width),text=span.textContent??'';const lines:string[]=[];let line='';for(const ch of text){if(ctx.measureText(line+ch).width>width-2&&line){lines.push(line);line=''}line+=ch}if(line)lines.push(line);if(!lines.length)continue;ctx.fillStyle='white';ctx.fillRect(x,y,width,Math.max(10,lines.length*10));ctx.fillStyle='#111';lines.forEach((t,i)=>ctx.fillText(t,x+(width-ctx.measureText(t).width)/2,y+i*10))}}
 const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('PDF 이미지 생성 실패')),'image/jpeg',.98));return jpegPdf(new Uint8Array(await blob.arrayBuffer()),canvas.width,canvas.height)
 }finally{URL.revokeObjectURL(url)}
}
