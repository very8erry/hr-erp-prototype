import dns from 'node:dns/promises'
import { execFileSync } from 'node:child_process'

console.log(`Node ${process.version}`)
try {
  console.log(`npm ${execFileSync('npm', ['-v'], { encoding: 'utf8' }).trim()}`)
} catch {
  console.error('npm을 실행할 수 없습니다.')
  process.exitCode = 1
}

try {
  const result = await dns.lookup('registry.npmjs.org')
  console.log(`npm registry DNS OK: ${result.address}`)
} catch (error) {
  console.error('npm registry DNS 실패:', error?.code ?? error)
  console.error('프로젝트 코드 문제가 아니라 현재 실행환경의 외부 DNS/네트워크 제한입니다.')
  process.exitCode = 2
}
