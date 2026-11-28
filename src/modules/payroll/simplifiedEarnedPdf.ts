import type {CompanyInfo} from './companyInfo'
import {simplifiedPeriod,validateSimplified,type SimplifiedEarnedRow} from './simplifiedEarned'
import {jpegPagesPdf} from './multiPagePdf'
export async function simplifiedEarnedPdf(rows:SimplifiedEarnedRow[],company:CompanyInfo,year:number,selection:number){
 validateSimplified(rows,year,selection,true)
 if(year>=2027)throw new Error('2027년 월별 제출 서식은 변경 서식 검증 후 지원합니다. 현재 공식 반기 서식에 월별 자료를 잘못 출력하지 않습니다.')
 const p=simplifiedPeriod(year,selection),groups=[...new Set(rows.map(r=>r.employmentId+'|'+r.attributionYear))].map(k=>rows.filter(r=>r.employmentId+'|'+r.attributionYear===k)),pages:{jpeg:Uint8Array;width:number;height:number}[]=[]
 for(const attr of [...new Set(groups.map(g=>g[0].attributionYear))]){
  const people=groups.filter(g=>g[0].attributionYear===attr),pageGroups=[people.slice(0,2),...Array.from({length:Math.ceil(Math.max(0,people.length-2)/4)},(_,i)=>people.slice(2+i*4,6+i*4))]
  for(let page=0;page<pageGroups.length;page++){
   const front=page===0,response=await fetch(`./simplified-earned-${front?'front':'continuation'}.png`);if(!response.ok)throw new Error('공식 신고서 원본을 불러오지 못했습니다.');const url=URL.createObjectURL(await response.blob())
   try{const img=new Image();img.src=url;await img.decode();await document.fonts.ready;const canvas=document.createElement('canvas');canvas.width=1191;canvas.height=1684;const c=canvas.getContext('2d');if(!c)throw new Error('PDF 화면을 만들지 못했습니다.');c.scale(2,2);c.drawImage(img,0,0,595.5,842);c.textBaseline='top';c.fillStyle='#111'
    const put=(v:unknown,x:number,y:number,w:number,size=8)=>{c.font=`${size}px Arial, 'Apple SD Gothic Neo', sans-serif`;const text=String(v??'');c.fillText(text,x,y,w)}
    put('실습용 · 가상식별번호 · 전자신고 제출파일 아님',60,45,480,10)
    if(front){put(company.name,86,179,182);put(company.representative,274,179,86);put(company.businessNumber,368,179,163);put(company.corporateNumber??'',86,211,180);put(company.address,275,211,260);put(company.telephone,86,240,180);put(company.email??'',274,240,260);put(attr,165,269,80);put('✓',407,selection===1?260:274,10,10);put(people.length,188,300,60);put(people.flat().reduce((s,r)=>s+r.salary+r.recognizedBonus,0).toLocaleString(),395,300,130)}else{put(company.businessNumber,58,164,110);put(attr,195,164,60);put('✓',selection===1?278:400,166,10,10)}
    if(!front)for(let row=0;row<4;row++){c.fillStyle='#fff';c.fillRect(37,276+row*89.55,13,14);c.fillStyle='#111';if(pageGroups[page][row])put(3+(page-1)*4+row,39.5,278+row*89.55,12,9)}
    pageGroups[page].forEach((group,index)=>{const r=group[0],top=front?389+index*96.65:239+index*89.55,step=front?13.82:12.79
     put(r.identifier,66,top+15,front?60:113,7);put(r.name,66,top+60,front?60:113,9);put(r.domestic,front?155:205,top+17,20);put(r.resident,front?155:205,top+59,20);put(r.workFrom.slice(5),front?200:253,top+26,65);put('~ '+r.workTo.slice(5),front?200:253,top+39,65)
     for(let i=0;i<6;i++){const month=Number(p.from.slice(5))+i,row=group.filter(r=>Number(r.paymentMonth.slice(5))===month);put(row.reduce((s,r)=>s+r.salary,0).toLocaleString(),front?354:380,top+i*step,front?98:72);put(row.reduce((s,r)=>s+r.recognizedBonus,0).toLocaleString(),front?458:461,top+i*step,74)}
     put(group.reduce((s,r)=>s+r.salary,0).toLocaleString(),front?354:380,top+6*step,front?98:72);put(group.reduce((s,r)=>s+r.recognizedBonus,0).toLocaleString(),front?458:461,top+6*step,74)
    })
    const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('PDF 페이지 생성 실패')),'image/jpeg',.96));pages.push({jpeg:new Uint8Array(await blob.arrayBuffer()),width:canvas.width,height:canvas.height})
   }finally{URL.revokeObjectURL(url)}
  }
 }
 return jpegPagesPdf(pages)
}
