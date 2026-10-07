import table from './ntsTaxTable.json'
export const NTS_TAX_SOURCE='https://www.law.go.kr/LSW/flDownload.do?flSeq=164357181&bylClsCd=110201'
/** Official simplified table. Salary excludes non-taxable income; family includes self. */
export function simplifiedTax(salary:number,family=1,children=0,payDate='2026-10-01',ratio=1){
 if(!Number.isFinite(salary)||salary<0||!Number.isInteger(family)||family<1||!Number.isInteger(children)||children<0||children>=family||![0.8,1,1.2].includes(ratio))throw new Error('간이세액표 입력값을 확인하세요.')
 if(salary<770000)return 0
 const row=salary<10000000?table.find(r=>r[0]*1000<=salary&&salary<r[1]*1000):[10000,10001,1507400,1431570,1200840,1170840,1140840,1110840,1080840,1050840,1020840,990840,960840]
 if(!row)throw new Error('간이세액표 구간이 없습니다.')
 let tax=row[Math.min(11,family)+1];if(family>11)tax-=(row[11]-row[12])*(family-11)
 if(salary>10000000){tax+=salary<=14000000?(salary-10000000)*0.98*0.35+25000:salary<=28000000?1397000+(salary-14000000)*0.98*0.38:salary<=30000000?6610600+(salary-28000000)*0.98*0.4:salary<=45000000?7394600+(salary-30000000)*0.4:salary<=87000000?13394600+(salary-45000000)*0.42:31034600+(salary-87000000)*0.45}
 const revised=payDate>='2026-03-01',deduction=children===0?0:children===1?(revised?20830:12500):(revised?45830:29160)+Math.max(0,children-2)*(revised?33330:25000)
 return Math.floor(Math.max(0,tax-deduction)*ratio/10)*10
}
