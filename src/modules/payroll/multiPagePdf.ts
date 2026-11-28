export function jpegPagesPdf(pages:{jpeg:Uint8Array;width:number;height:number}[]){
 if(!pages.length)throw new Error('PDF 페이지가 없습니다.')
 const enc=new TextEncoder(),chunks:Uint8Array[]=[],offsets=[0];let length=0
 const add=(v:string|Uint8Array)=>{const b=typeof v==='string'?enc.encode(v):v;chunks.push(b);length+=b.length},object=(id:number,text:string)=>{offsets[id]=length;add(`${id} 0 obj\n${text}\nendobj\n`)}
 add('%PDF-1.4\n');object(1,'<< /Type /Catalog /Pages 2 0 R >>');object(2,`<< /Type /Pages /Kids [${pages.map((_,i)=>`${3+i*3} 0 R`).join(' ')}] /Count ${pages.length} >>`)
 pages.forEach((p,i)=>{const page=3+i*3,img=page+1,stream=page+2;object(page,`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.276 841.89] /Resources << /XObject << /Im0 ${img} 0 R >> >> /Contents ${stream} 0 R >>`);offsets[img]=length;add(`${img} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${p.width} /Height ${p.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.jpeg.length} >>\nstream\n`);add(p.jpeg);add('\nendstream\nendobj\n');const content='q 595.276 0 0 841.89 0 0 cm /Im0 Do Q';object(stream,`<< /Length ${enc.encode(content).length} >>\nstream\n${content}\nendstream`)})
 const start=length,n=3+pages.length*3;add(`xref\n0 ${n}\n0000000000 65535 f \n`);for(let i=1;i<n;i++)add(String(offsets[i]).padStart(10,'0')+' 00000 n \n');add(`trailer\n<< /Size ${n} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`);return new Blob(chunks as BlobPart[],{type:'application/pdf'})
}
