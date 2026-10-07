import { execFileSync, spawn } from 'node:child_process'
import fs from 'node:fs'
import net from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
process.chdir(root)

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
const port = Number(process.env.HR_PORT??5173)
if(!Number.isInteger(port)||port<1024||port>65535)throw new Error('HR_PORT는 1024~65535 범위의 포트여야 합니다.')
const url = `http://127.0.0.1:${port}/?expectedBuild=${encodeURIComponent(pkg.version)}`

function runVerify() {
  const r = spawn(process.execPath, [path.join(root, 'scripts/verify-release.mjs')], { stdio: 'inherit' })
  return new Promise((resolve, reject) => {
    r.on('exit', code => code === 0 ? resolve() : reject(new Error('Release verification failed')))
    r.on('error', reject)
  })
}

function listeners() {
  try {
    const out = execFileSync('lsof', [`-tiTCP:${port}`, '-sTCP:LISTEN'], { encoding: 'utf8' }).trim()
    return out ? [...new Set(out.split(/\s+/).map(Number).filter(Boolean))] : []
  } catch {
    return []
  }
}

function commandFor(pid) {
  try { return execFileSync('ps', ['-p', String(pid), '-o', 'command='], { encoding: 'utf8' }).trim() } catch { return '' }
}

function stopOldVite() {
  const pids = listeners()
  for (const pid of pids) {
    const cmd = commandFor(pid)
    if (/vite/i.test(cmd)) {
      console.log(`기존 Vite 서버 종료: PID ${pid}`)
      try { process.kill(pid, 'SIGTERM') } catch {}
    } else {
      throw new Error(`포트 ${port}을 다른 프로그램이 사용 중입니다. PID ${pid}: ${cmd || 'unknown'}\n해당 프로그램을 종료한 뒤 다시 실행하세요.`)
    }
  }
}

function waitForPort(timeoutMs = 30000) {
  const start = Date.now()
  return new Promise((resolve, reject) => {
    const tryOnce = () => {
      const socket = net.createConnection({ host: '127.0.0.1', port })
      socket.once('connect', () => { socket.destroy(); resolve() })
      socket.once('error', () => {
        socket.destroy()
        if (Date.now() - start >= timeoutMs) reject(new Error('Vite 서버가 30초 안에 시작되지 않았습니다.'))
        else setTimeout(tryOnce, 350)
      })
    }
    tryOnce()
  })
}

async function main() {
  console.log(`HR Training Lab Build ${pkg.version} — macOS 안전 실행`)
  await runVerify()
  stopOldVite()
  await new Promise(r => setTimeout(r, 700))

  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
  const child = spawn(npm, ['run', 'dev:server', '--', '--port', String(port)], { cwd: root, stdio: 'inherit' })
  child.on('error', err => { console.error(err); process.exit(1) })

  const stop = () => {
    if (!child.killed) child.kill('SIGINT')
  }
  process.on('SIGINT', stop)
  process.on('SIGTERM', stop)

  try {
    await waitForPort()
    console.log(`브라우저 열기: ${url}`)
    const opener = spawn('open', [url], { stdio: 'ignore', detached: true })
    opener.unref()
  } catch (err) {
    console.error(`\n실행 확인 실패: ${err.message}`)
    stop()
    process.exit(1)
  }

  child.on('exit', code => process.exit(code ?? 0))
}

main().catch(err => {
  console.error(`\n실행 실패: ${err.message}`)
  process.exit(1)
})
