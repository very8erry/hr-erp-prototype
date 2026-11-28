import {spawn} from 'node:child_process'
import {createServer} from 'vite'
// Refuse an occupied port; never attach this test to another running app.
const server=await createServer({server:{host:'127.0.0.1',port:5197,strictPort:true,watch:{ignored:['**/test-output/**','**/dist/**','**/docs/**','**/public/manuals/**']}}})
try{
 await server.listen()
 const test=spawn(process.execPath,['scripts/browser/policy-payroll.mjs'],{stdio:'inherit',env:process.env})
 process.exitCode=await new Promise((resolve,reject)=>{test.on('error',reject);test.on('exit',code=>resolve(code??1))})
}finally{await server.close()}
