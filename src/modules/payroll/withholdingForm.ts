import type {PayrollEntry,PayrollResult,PayrollRun,DailyWorkRecord} from '../../domain/types'
import type {CompanyInfo} from './companyInfo'
export const incomeCodes=[['A01','근로소득 · 간이세액'],['A02','근로소득 · 중도퇴사'],['A03','일용근로'],['A04','연말정산 합계'],['A05','연말정산 분납신청'],['A06','연말정산 납부금액'],['A10','근로소득 가감계'],['A21','퇴직소득 · 연금계좌'],['A22','퇴직소득 · 그 외'],['A20','퇴직소득 가감계'],['A25','사업소득 · 매월징수'],['A26','사업소득 · 연말정산 합계'],['A27','사업소득 · 분납신청'],['A28','사업소득 · 납부금액'],['A30','사업소득 가감계'],['A41','기타소득 · 연금계좌'],['A43','종교인소득 · 매월징수'],['A44','종교인소득 · 연말정산'],['A49','가상자산'],['A59','인적용역 기타소득'],['A42','기타소득 · 그 외'],['A40','기타소득 가감계'],['A48','연금계좌'],['A45','공적연금 · 매월'],['A46','공적연금 · 연말정산'],['A47','연금소득 가감계'],['A50','이자소득'],['A60','배당소득'],['A69','저축 등 해지 추징세액'],['A70','비거주자 양도소득'],['A80','법인원천'],['A90','수정신고 세액'],['A99','총합계']] as const
export interface TaxLine {code:string;count:number;gross:number;tax:number;rural:number;penalty:number;adjust:number;ruralPenalty:number}
export interface WithholdingDraft {period:string;payPeriod:string;kind:'매월'|'반기'|'수정'|'연말'|'소득처분';lines:TaxLine[];previous:number;requestedPrevious:number;trust:number;otherRefund:number;application:number;bank:string;account:string;taxOffice:string;email:string;reviewed:boolean;note:string}
export const derivedCodes=['A10','A20','A30','A40','A47','A99']
const empty=(code:string):TaxLine=>({code,count:0,gross:0,tax:0,rural:0,penalty:0,adjust:0,ruralPenalty:0})
export function initialWithholding(run:PayrollRun,results:PayrollResult[],entries:PayrollEntry[],daily:DailyWorkRecord[]):WithholdingDraft{
 const lines=incomeCodes.map(([c])=>empty(c));const row=(c:string)=>lines.find(l=>l.code===c)!;
 const regular=results.filter(r=>!entries.find(e=>e.employmentId===r.employmentId)?.terminationDateSnapshot?.startsWith(run.period));row('A01').count=regular.length;row('A01').gross=regular.reduce((s,r)=>s+r.grossPay,0);row('A01').tax=regular.reduce((s,r)=>s+r.incomeTax,0);
 const dr=daily.filter(r=>r.workDate.startsWith(run.period));row('A03').count=new Set(dr.map(r=>r.dailyWorkerId)).size;row('A03').gross=dr.reduce((s,r)=>s+r.grossPay,0);row('A03').tax=dr.reduce((s,r)=>s+r.incomeTax,0);
 return {period:run.period,payPeriod:run.payDate.slice(0,7),kind:'매월',lines,previous:0,requestedPrevious:0,trust:0,otherRefund:0,application:0,bank:'',account:'',taxOffice:'',email:'',reviewed:false,note:'중도퇴사 누적 정산·비과세 신고 제외액·일용직 지급월·추가 소득 지급을 확인'}
}
export function calculateWithholding(d:WithholdingDraft){
 const rows=incomeCodes.map(([code])=>({...empty(code),...d.lines.find(r=>r.code===code)}));const get=(c:string)=>rows.find(r=>r.code===c)!;
 const group=(code:string,amountCodes:string[],taxCodes=amountCodes)=>{const target=get(code);for(const key of ['count','gross','tax','rural','penalty'] as const)target[key]=(key==='count'||key==='gross'?amountCodes:taxCodes).reduce((s,c)=>s+get(c)[key],0)};
 group('A10',['A01','A02','A03','A04'],['A01','A02','A03','A06']);group('A20',['A21','A22']);group('A30',['A25','A26'],['A25','A28']);group('A40',['A41','A43','A44','A49','A59','A42']);group('A47',['A48','A45','A46']);
 const tops=['A10','A20','A30','A40','A47','A50','A60','A69','A70','A80','A90'];let general=0,adjusted=0;
 const payable=Object.fromEntries(rows.map(r=>[r.code,{income:0,rural:0}]));for(const code of tops){const r=get(code);general+=Math.max(0,-r.tax)+Math.max(0,-r.rural);const income=Math.max(0,r.tax)+r.penalty,rural=Math.max(0,r.rural)+r.ruralPenalty;payable[code]={income:Math.max(0,income-r.adjust),rural};adjusted+=r.adjust;}
 const total=get('A99');total.tax=tops.reduce((s,c)=>s+Math.max(0,get(c).tax),0);total.rural=tops.reduce((s,c)=>s+Math.max(0,get(c).rural),0);total.penalty=tops.reduce((s,c)=>s+get(c).penalty,0);total.adjust=adjusted;payable.A99={income:tops.reduce((s,c)=>s+payable[c].income,0),rural:tops.reduce((s,c)=>s+payable[c].rural,0)};
 const remainder=d.previous-d.requestedPrevious,available=remainder+general+d.trust+d.otherRefund,carry=available-adjusted;
 return {rows,payable,refund:{remainder,general,available,adjusted,carry,application:d.application}};
}
export function validateWithholding(d:WithholdingDraft){
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(d.period)||!/^\d{4}-(0[1-9]|1[0-2])$/.test(d.payPeriod))throw new Error('귀속·지급연월을 확인하세요.');
 if(new Set(d.lines.map(r=>r.code)).size!==d.lines.length)throw new Error('소득코드가 중복되었습니다.');
 for(const r of d.lines){if(!incomeCodes.some(([c])=>c===r.code))throw new Error('소득코드를 확인하세요.');for(const k of ['count','gross','tax','rural','penalty','adjust','ruralPenalty'] as const){if(!Number.isFinite(r[k])||!Number.isInteger(r[k])||(!['tax','rural'].includes(k)&&r[k]<0))throw new Error(`${r.code} ${k}: 원 단위 정수값을 확인하세요.`)}if(r.code==='A49'&&d.period<'2027-01'&&(r.count||r.gross||r.tax))throw new Error('A49 가상자산은 첨부 작성방법상 2027년 이후 적용입니다.');}
 for(const value of [d.previous,d.requestedPrevious,d.trust,d.otherRefund,d.application])if(!Number.isInteger(value)||value<0)throw new Error('환급 금액은 0 이상 정수로 입력하세요.');
 if(d.requestedPrevious>d.previous)throw new Error('기환급 신청세액이 전월 미환급세액보다 큽니다.');const c=calculateWithholding(d);if(c.refund.carry<0||d.application>c.refund.carry)throw new Error('조정환급·환급 신청액이 사용 가능한 환급세액보다 큽니다.');
 for(const r of c.rows)if(r.adjust>Math.max(0,r.tax)+r.penalty)throw new Error(`${r.code}: 조정환급액이 납부세액보다 큽니다.`);
 for(const [all,split,pay] of [['A04','A05','A06'],['A26','A27','A28']])for(const key of ['tax','rural','penalty'] as const)if(c.rows.find(r=>r.code===all)![key]!==c.rows.find(r=>r.code===split)![key]+c.rows.find(r=>r.code===pay)![key])throw new Error(`${all} = ${split} + ${pay} 정산 세액을 확인하세요.`);
 if(!d.reviewed)throw new Error('신고 제외액·정산분·지급월 검토를 완료하세요.');
 if(d.application>0)throw new Error('환급 신청은 원본 7~9쪽의 부표·기납부 명세를 별도 작성해야 합니다. 이 화면은 제1쪽 신고서와 환급 조정까지만 출력합니다.');
}
const escape=(s:unknown)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function withholdingHtml(d:WithholdingDraft,company:CompanyInfo,imageDataUrl:string){validateWithholding(d);const c=calculateWithholding(d),fmt=(v:number)=>v<0?'△'+Math.abs(v).toLocaleString('ko-KR'):v?v.toLocaleString('ko-KR'):'';const overlay:(string)[]=[];const place=(x:number,y:number,w:number,value:unknown)=>overlay.push(`<span style="left:${x}px;top:${y}px;width:${w}px">${escape(value)}</span>`);
 place(159,132,108,company.name);place(348,132,117,company.representative);place(159,162,109,company.businessNumber);place(348,158,117,company.address);place(525,154,91,company.telephone);place(525,181,91,d.email);place(525,89,90,d.period.replace('-',' / '));place(525,110,90,d.payPeriod.replace('-',' / '));
 place(46+['매월','반기','수정','연말','소득처분'].indexOf(d.kind)*46,119,20,'○');
 const shadedCounts=['A05','A06','A27','A28','A69','A90','A99'];c.rows.forEach((r,i)=>{const y=i<30?269+i*13.35:i===30?673:i===31?699:715;const values=[r.count,r.gross,r.tax,r.rural,r.penalty,r.adjust,c.payable[r.code].income,c.payable[r.code].rural];const xs=[190,236,300,360,414,460,512,573],ws=[44,63,59,53,45,51,60,45];values.forEach((v,j)=>{if(j<2&&shadedCounts.includes(r.code)||j===5&&!['A10','A20','A30','A40','A47','A50','A60','A69','A70','A80','A90','A99'].includes(r.code)||j>=6&&!['A10','A20','A30','A40','A47','A50','A60','A69','A70','A80','A90','A99'].includes(r.code))return;place(xs[j],y,ws[j],fmt(v))})});
 [d.previous,d.requestedPrevious,c.refund.remainder,c.refund.general,d.trust,d.otherRefund,0,c.refund.available,c.refund.adjusted,c.refund.carry,0].forEach((v,i)=>place(39+i*52.8,800,51,fmt(v)));place(158,890,232,company.representative);place(102,961,167,d.taxOffice);place(523,916,92,d.bank);place(523,960,92,d.account);
 return `<!doctype html><html lang="ko"><meta charset="utf-8"><title>원천징수이행상황신고서 ${escape(d.period)}</title><style>@page{size:A4;margin:0}body{margin:0;font-family:Arial,'Apple SD Gothic Neo',sans-serif}.sheet{position:relative;width:724px;height:1024px;margin:auto}.sheet img{width:724px;height:1024px}.sheet span{position:absolute;font-size:7px;line-height:10px;min-height:10px;text-align:center;overflow-wrap:anywhere;background:white}button{margin:15px}@media print{button{display:none}.sheet{zoom:1.0962;margin:0}}</style><button onclick="print()">인쇄 / PDF 저장</button><div class="sheet"><img alt="별지 제21호 원본 2026.5.22" src="${escape(imageDataUrl)}">${overlay.join('')}</div></html>`;
}
