import fs from 'node:fs'
import {spawnSync} from 'node:child_process'
import path from 'node:path'

const root=process.cwd()
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8')
const pkg=JSON.parse(read('package.json'))
const version=read('src/app/version.ts').match(/BUILD_VERSION\s*=\s*'([^']+)'/)?.[1]
const app=read('src/app/App.tsx')
const payroll=read('src/modules/payroll/PayrollPage.tsx')
const attendance=read('src/modules/attendance/AttendancePage.tsx')
const index=read('index.html')
const macStart=read('scripts/start-mac.mjs')
const devServer=pkg.scripts?.['dev:server']??''
const dev=pkg.scripts?.dev??''

const tools=read('src/modules/payroll/PayrollTools.tsx')
const db=read('src/infrastructure/db/indexedDb.ts')
const files=read('src/modules/attendance/attendanceFiles.ts')
const toolbar=read('src/app/DataToolbar.tsx')
const checks=[
  ['다운로드 팝업·샘플',read('src/components/DownloadActions.tsx').includes('다운로드 형식 선택')&&read('src/components/DownloadActions.tsx').includes('샘플 다운로드'),'export dialog'],
  ['확정 저장·잠금',db.includes('async confirmRecords')&&db.includes('확정된 연차는 수정할 수 없습니다.')&&db.includes('확정된 일용직 근무·수당은 수정할 수 없습니다.'),'persisted locks'],
  ['급여 조회 버튼·일괄수정 재확인',payroll.includes('setPeriod({from:f.from,to:f.to})')&&payroll.includes('급여 변경 재확인'),'query and preview'],
  ['근태 합계 행·요약박스 제거',attendance.includes('<tfoot>')&&!attendance.includes('<Mini'),'attendance totals'],
  ['화면·파일 공통 급여 열',payroll.includes('payrollColumns.map')&&payroll.includes('payrollHeaders')&&payroll.includes('parsePayrollRows'),'shared columns'],
  ['개인 다운로드·일괄 수정',tools.includes('개인 내역 다운로드')&&payroll.includes('BatchEditModal'),'detail and batch'],
  ['테이블 내부 가로 스크롤',read('src/components/ScrollTable.tsx').includes('dataTableViewport')&&!read('src/components/ScrollTable.tsx').includes('fixedXScroll'),'native table scrollbar'],
  ['일용직 수당·파일 재입력',read('src/modules/payroll/DailyWorkerPage.tsx').includes('dailyAllowanceLabels')&&read('src/modules/payroll/dailyFiles.ts').includes('parseDailyRows'),'daily round trip'],
  ['보고서 메뉴 이동', !payroll.includes("['reports',")&&payroll.includes('보고서파일 다운받기'),'query report'],
  ['수기 근태·캘린더',attendance.includes('AttendanceEditor')&&attendance.includes('AttendanceCalendar')&&db.includes('saveAttendanceBatch'),'attendance persistence'],
  ['CSV/XLSX/JSON 공통 양식',files.includes('parseAttendance')&&files.includes('exceljs')&&toolbar.includes('샘플데이터 다운받기'),'round trip'],
  ['급여 일시적용·설정 복원',tools.includes('일시 적용')&&tools.includes('저장·적용')&&tools.includes('이전양식으로 초기화')&&db.includes('restorePayrollSettings'),'settings'],
  ['v6 마이그레이션',read('src/infrastructure/db/config.ts').includes('DB_VERSION = 6')&&read('src/infrastructure/db/migrations.ts').includes('schemaVersion < 6'),'migration'],
  ['GitHub Pages 상대 경로',read('vite.config.ts').includes("base: './'"),'pages base'],
  ['package/version 일치', version===pkg.version, `package=${pkg.version}, build=${version}`],
  ['브라우저 title 버전 일치', index.includes(`HR Training Lab v${version}`), 'index.html title'],
  ['근태 WFM 활성 메뉴', /<Nav[^>]*view==='attendance'[\s\S]*?>근태 WFM/.test(app) && app.includes("{view==='attendance'&&<AttendancePage"), 'App.tsx attendance route/nav'],
  ['급여 Payroll 활성 메뉴', /<Nav[^>]*view==='payroll'[\s\S]*?>급여 Payroll/.test(app) && app.includes("{view==='payroll'&&<PayrollPage"), 'App.tsx payroll route/nav'],
  ['일용직 활성 메뉴', /<Nav[^>]*view==='daily'[\s\S]*?>일용직/.test(app) && app.includes("{view==='daily'&&<DailyWorkerPage"), 'App.tsx daily route/nav'],
  ['근태/급여 disabled 잔존 없음', !/근태 WFM[^\n]{0,120}disabled/.test(app) && !/급여 Payroll[^\n]{0,120}disabled/.test(app), 'active modules must not be disabled'],
  ['Payroll 필수 탭', ['급여 입력','급여 조회','근태 조회','연차','일용직 급여','퇴직정산','연말정산','원천세 신고'].every(x=>payroll.includes(x)), 'PayrollPage required tabs'],
  ['WFM 필수 탭', ['근태 조회','연차 조회'].every(x=>attendance.includes(x)), 'AttendancePage required tabs'],
  ['WFM 필터', ['전체 팀','전체 직급','전체 개인'].every(x=>attendance.includes(x)) && attendance.includes('type="month"'), 'team/grade/person/period filters'],
  ['초록 버전 안내 제거·버전 식별 유지',!app.includes('runtimeProof')&&app.includes('Build {BUILD_VERSION}'),'quiet build identity'],
  ['대시보드 조회대상 없음',!app.includes('조회대상'),'dashboard'],
  ['Core HR 검색 드롭다운·퇴사일',app.includes('SearchSelect')&&app.includes('<th>퇴사일</th>'),'core filters'],
  ['연차 개별·일괄 저장',read('src/modules/attendance/AnnualLeavePanel.tsx').includes('일괄 적용')&&db.includes('saveAnnualLeaveBatch'),'annual leave persistence'],
  ['근태 일괄 수정·휴가 구간',attendance.includes('AttendanceBatchEditor')&&read('src/modules/attendance/AttendanceTools.tsx').includes('nonWorkKind'),'attendance intervals'],
  ['정산 수기·파일 재입력',payroll.includes('RetirementPanel')&&payroll.includes('YearEndPanel')&&read('src/modules/payroll/ManualLedger.tsx').includes('parseLedgerRows'),'manual settlements'],
  ['macOS 터미널 실행', dev==='node scripts/start-mac.mjs' && macStart.includes("spawn('open'") && macStart.includes('waitForPort'), 'npm run dev -> start-mac.mjs'],
  ['5173 strictPort', devServer.includes('--host 127.0.0.1') && devServer.includes('--port 5173') && devServer.includes('--strictPort'), devServer],
  ['Finder 실행파일 제거', !fs.existsSync(path.join(root,'START_HR_TRAINING.command')) && !fs.existsSync(path.join(root,'STOP_HR_TRAINING.command')), '.command files must not ship'],
  ['구버전 Build 문자열 없음', ![app,index,macStart].some(t=>t.includes('0.3.3')||t.includes('0.5.2')), 'old runtime build strings must not remain'],
]

let failed=false
for(const [name,ok,detail] of checks){
  if(ok) console.log(`✅ ${name}`)
  else {failed=true; console.error(`❌ ${name}: ${detail}`)}
}
if(failed){
  console.error('\nRelease verification failed. dev/build를 시작하지 않습니다.')
  process.exit(1)
}
const filesTest=spawnSync(process.execPath,['--import','tsx',path.join(root,'scripts/test-files.ts')],{cwd:root,stdio:'inherit'})
if(filesTest.status!==0)process.exit(1)
const tests=spawnSync(process.execPath,['--import','tsx',path.join(root,'scripts/test-domain.ts')],{cwd:root,stdio:'inherit'})
if(tests.status!==0){console.error('Release gate: domain/migration regression failed');process.exit(1)}
const uiTest=spawnSync(process.execPath,['--import','tsx',path.join(root,'scripts/test-ui.tsx')],{cwd:root,stdio:'inherit'});if(uiTest.status!==0)process.exit(1)
const revisionTest=spawnSync(process.execPath,['--import','tsx',path.join(root,'scripts/test-revision.tsx')],{cwd:root,stdio:'inherit'});if(revisionTest.status!==0)process.exit(1)
const summaryTest=spawnSync(process.execPath,['--import','tsx',path.join(root,'scripts/test-summary.tsx')],{cwd:root,stdio:'inherit'});if(summaryTest.status!==0)process.exit(1)
const latestTest=spawnSync(process.execPath,['--import','tsx',path.join(root,'scripts/test-v073.tsx')],{cwd:root,stdio:'inherit'});if(latestTest.status!==0)process.exit(1)
const currentTest=spawnSync(process.execPath,['--import','tsx',path.join(root,'scripts/test-v074.ts')],{cwd:root,stdio:'inherit'});if(currentTest.status!==0)process.exit(1)
console.log(`\nRelease verification passed: v${version}`)
