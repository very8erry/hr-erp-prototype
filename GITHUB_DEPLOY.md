# lemonpAI GitHub Pages 배포

대상 저장소: https://github.com/very8erry/hr-erp-prototype
예상 사이트 주소: https://very8erry.github.io/hr-erp-prototype/

## 최초 설정

1. 저장소 루트에 최신 v0.7.5 소스를 올립니다. package.json, package-lock.json, src, scripts, index.html, vite.config.ts, tsconfig 파일과 .github/workflows/deploy.yml을 포함합니다.
2. GitHub 저장소의 Settings → Pages → Build and deployment → Source에서 GitHub Actions를 선택합니다.
3. main에 변경사항을 반영하거나 Actions → Build and deploy to GitHub Pages → Run workflow를 누릅니다.
4. Actions의 build와 deploy가 모두 초록색이면 배포된 사이트를 엽니다. 실제 배포 주소는 github-pages 환경 링크로 확인합니다.

서버용 터미널을 켜둘 필요는 없습니다. 이후 main에 올린 변경사항은 자동으로 다시 빌드하여 배포됩니다. node_modules, dist, 로컬 캐시, .env 파일은 업로드하지 않습니다. GitHub 웹에서 폴더를 올릴 때 숨김 폴더인 .github도 반드시 포함되어야 합니다.

## 배포되는 내용과 데이터 저장

이 앱은 로그인이나 공용 서버 DB가 없는 교육용 시뮬레이터입니다. 직원·급여 등의 변경 데이터는 각 브라우저의 IndexedDB에 저장되어 서로 공유되지 않습니다. 로컬 주소와 GitHub Pages는 별도 저장소이므로 기존 로컬 데이터가 자동 이전되지 않습니다. 필요한 데이터는 앱에서 내보낸 뒤 배포 사이트에서 가져옵니다.

초기 더미 데이터와 공지 첨부 문서(취업규칙 및 사내 배치자료 10개)는 사이트에 포함됩니다. 공개 사이트 이용자가 다운로드할 수 있으므로 공개 가능한 자료인지 확인한 뒤 게시합니다. 실제 직원 정보나 민감한 자료를 공개 저장소에 올리지 않습니다.

## 자동 검증

GitHub Actions는 Node 22.16.0에서 npm ci, 최신 대시보드·공지 회귀 검사, npm run build를 실행합니다. 검증 실패 시 배포하지 않습니다. Vite의 상대 경로 설정(base: './')으로 저장소 하위 경로를 지원합니다.

공식 설명: https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
