import JSZip from 'jszip'
import type {DailyWorker,DailyWorkRecord} from '../../domain/types'
import type {CompanyInfo} from './companyInfo'
const escape=(s:string)=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
const column=(n:number)=>{let s='';for(;n;n=Math.floor((n-1)/26))s=String.fromCharCode(65+(n-1)%26)+s;return s}
export function reportRows(workers:DailyWorker[],records:DailyWorkRecord[],period:string,company:CompanyInfo){
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(period))throw new Error('신고 귀속월을 선택하세요.')
 const phone=company.telephone.split('-');if(phone.length!==3)throw new Error('회사 전화번호를 확인하세요.')
 return workers.flatMap((w,index)=>{const rows=records.filter(r=>r.dailyWorkerId===w.id&&r.workDate.startsWith(period));if(!rows.length)return []
 const days=[...new Set(rows.map(r=>Number(r.workDate.slice(8))))];const sum=(key:keyof DailyWorkRecord)=>rows.reduce((s,r)=>s+Number(r[key]??0),0)
 const values:(string|number)[]=Array(54).fill('');values[0]=company.insuranceCode;values[1]=w.workerNameSnapshot;
 // Deliberately invalid identifiers: test data cannot be mistaken for real registration numbers.
 values[2]=`0000000${String(index+1).padStart(6,'0')}`;values[3]='100';values[4]='';values[5]=phone[0];values[6]=phone[1];values[7]=phone[2];values[8]=({'사무보조':'029','데이터정리':'029','행사지원':'617','매장지원':'616','물류지원':'624'} as Record<string,string>)[w.job]??company.occupationCode
 days.forEach(d=>{values[8+d]=1});values[40]=days.length;values[41]=Math.round(sum('hours')/days.length*100)/100;values[42]=days.length;values[43]=sum('grossPay')-sum('nonTaxablePay');values[44]=sum('grossPay');values[45]=company.insuranceCode===1?'':company.departureCode;values[48]='Y';values[49]=period.replace('-','');values[50]=sum('grossPay')-sum('nonTaxablePay');values[51]=sum('nonTaxablePay');values[52]=sum('incomeTax');values[53]=sum('localIncomeTax');return [values]
 })
}
export async function buildWorkReport(template:ArrayBuffer|Uint8Array,workers:DailyWorker[],records:DailyWorkRecord[],period:string,company:CompanyInfo){
 const rows=reportRows(workers,records,period,company);if(!rows.length)throw new Error('해당 귀속월에 신고할 근무기록이 없습니다.')
 const zip=await JSZip.loadAsync(template),entry=zip.file('xl/worksheets/sheet1.xml');if(!entry)throw new Error('원본 신고양식의 서식 시트를 찾을 수 없습니다.')
 let xml=await entry.async('string');if(!xml.includes('r="BB1"'))throw new Error('신고양식의 열 구조가 변경되었습니다.')
 const data=rows.map((values,i)=>`<row r="${i+2}">${values.map((v,j)=>v===''?'':typeof v==='number'?`<c r="${column(j+1)}${i+2}"><v>${v}</v></c>`:`<c r="${column(j+1)}${i+2}" t="inlineStr"><is><t>${escape(v)}</t></is></c>`).join('')}</row>`).join('')
 // Patch only the data rows. Every other XML part (examples, validation, styles, merges) is untouched.
 xml=xml.replace(/<sheetData>([\s\S]*?)<\/sheetData>/,(_all,body:string)=>`<sheetData>${body.replace(/<row\b[^>]*\br="(?:[2-9]|\d{2,})"[\s\S]*?<\/row>/g,'')}${data}</sheetData>`).replace(/<dimension ref="[^"]*"\/>/,`<dimension ref="A1:BB${rows.length+1}"/>`)
 zip.file('xl/worksheets/sheet1.xml',xml,{createFolders:false});return zip.generateAsync({type:'uint8array'})
}
export function downloadFile(data:BlobPart,name:string,type:string){const url=URL.createObjectURL(new Blob([data],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
