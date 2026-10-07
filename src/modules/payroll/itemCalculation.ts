import type {PayrollItemMaster} from '../../domain/types'
export const formulaVariables=['기존금액','항목금액','월기준급여','일할비율','휴직차감비율','과세수당','비과세수당','연장수당','상여','소급금','기타지급','무급공제','기타공제','연금보수','건보보수','고용보수','수기소득세','총지급액','건강보험료','소득세','연금요율','건보전체요율','요양비율','고용요율','지방세율','연금하한','연금상한','건보최저','건보최고','건보총보험료','회사건보고지액','회사고용보수'] as const
export function standardFormula(code:string):string{
 const formulas:Record<string,string>={P101:'round(월기준급여 * max(0, 일할비율 - 휴직차감비율))',P138:'과세수당',P139:'비과세수당',P120:'연장수당',P130:'상여',P132:'소급금',P133:'기타지급',P140:'무급공제',T101:'floor10(수기소득세)',T102:'floor10(소득세 * 지방세율)',T103:'floor10(min(연금상한, max(연금하한, floor(연금보수 / 1000) * 1000)) * 연금요율)',T104:'floor10(min(건보최고, max(건보최저, floor10(건보보수 * 건보전체요율))) / 2)',T105:'floor10(floor10(건보총보험료 * 요양비율) / 2)',T106:'floor10(max(0, 회사고용보수) * 고용요율)',T107:'round(기타공제)'}
 return formulas[code]??'항목금액'
}
// Restricted arithmetic grammar: no eval, properties, statements, or executable JavaScript.
export function evaluateFormula(formula:string,values:Record<string,number>):number{
 if(!formula.trim()||formula.length>500)throw new Error('산출식은 1~500자로 입력하세요.')
 const tokens=formula.match(/\d+(?:\.\d+)?|[A-Za-z_가-힣][A-Za-z_가-힣0-9]*|[()+\-*/,]|\S/g)??[];let index=0
 const functions:Record<string,(...args:number[])=>number>={min:Math.min,max:Math.max,round:Math.round,floor:Math.floor,ceil:Math.ceil,floor10:n=>Math.floor(n/10)*10}
 const atom=():number=>{
  const token=tokens[index++];if(token==='+'||token==='-')return(token==='-'?-1:1)*atom()
  if(token==='('){const n=expression();if(tokens[index++]!==')')throw new Error('산출식 괄호를 확인하세요.');return n}
  if(/^\d/.test(token??''))return Number(token)
  if(token&&Object.hasOwn(functions,token)&&tokens[index]==='('){index++;const args=[expression()];while(tokens[index]===','){index++;args.push(expression())}if(tokens[index++]!==')'||(!['min','max'].includes(token)&&args.length!==1))throw new Error('함수 인수를 확인하세요.');return functions[token](...args)}
  if(token&&Object.hasOwn(values,token))return values[token]
  throw new Error(`사용할 수 없는 산출식 항목: ${token??'빈 값'}`)
 }
 const product=():number=>{let n=atom();while(tokens[index]==='*'||tokens[index]==='/'){const op=tokens[index++],rhs=atom();if(op==='/'&&rhs===0)throw new Error('산출식에서 0으로 나눌 수 없습니다.');n=op==='*'?n*rhs:n/rhs}return n}
 const expression=():number=>{let n=product();while(tokens[index]==='+'||tokens[index]==='-'){const op=tokens[index++],rhs=product();n=op==='+'?n+rhs:n-rhs}return n}
 const result=expression();if(index!==tokens.length||!Number.isFinite(result)||result<0)throw new Error('산출 결과는 0 이상의 유한한 금액이어야 합니다.');return Math.round(result)
}
export function validateItemCalculation(item:PayrollItemMaster){
 if(item.calculationMode&&!['DEFAULT','FORMULA','MANUAL'].includes(item.calculationMode))throw new Error(`${item.name}: 적용 방식을 확인하세요.`)
 if(item.calculationMode==='MANUAL'&&(!Number.isFinite(item.manualAmount)||item.manualAmount!<0))throw new Error(`${item.name}: 수기 금액은 0 이상이어야 합니다.`)
 if(item.calculationMode==='FORMULA')evaluateFormula(item.formula??'',Object.fromEntries(formulaVariables.map(v=>[v,100])))
}
export function configuredAmount(item:PayrollItemMaster|undefined,base:number,values:Record<string,number>):number{
 if(item?.calculationMode==='MANUAL')return Math.round(item.manualAmount??0)
 if(item?.calculationMode==='FORMULA')return evaluateFormula(item.formula??'',{...values,기존금액:base})
 return base
}
