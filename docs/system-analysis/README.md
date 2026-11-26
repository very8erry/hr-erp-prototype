# HRIS 시스템 분석 패키지 v1.0

작성일: 2026-11-18 KST. 분석 기준: `b4aeb300270a62273d3d5f0c2fea87f2a09ba800`.
관련 요구사항: HR-01~03, ATS-01~02, WFM-01~03, PAY-01~08, FILE-01~02, DAILY-01, OPS-01, SYS-01~02, NFR-01, FUT-01.
작성 근거: 해당 커밋의 실제 코드·타입·IndexedDB 설정, 보존된 PR #7 실행 기록, 이번 격리 진단 2건, GitHub API·배포 화면.

## 읽는 순서

- `output/pdf/HRIS_PM_Review.pdf`: 16:9 PM 발표용.
- `output/pdf/HRIS_System_Architecture_Study.pdf`: A4 학습·진단용. 개념별 10문답과 전체 문서 체계, 도식 설명.
- `documents/00-guide.md`: 문서·규칙의 기준 위치. 규칙은 `04-business-rules.md`와 `sources/business-rules.json`에서 관리한다.
- `documents/01`~`12`: 요구사항, 프로세스, 필드, 상태, 아키텍처, 코드 대응, 테스트, 무결성, 보안, ADR, 개선 과제, 도식 안내.

## 편집 원본과 추적

`documents/*.md`와 `diagrams/*.svg`가 검수된 문서·도식 원본이다. SVG는 벡터 편집기에서 수정할 수 있다. DOT와 D06 PlantUML은 초기 관계 정의도 보존한다. 일부 DOT와 최종 SVG의 레이아웃·표현 수준은 다르므로 최종 PDF를 재생성할 때는 SVG/PNG를 사용한다.

`sources/requirements.json/csv`는 24개 요구사항, `business-rules`는 16개 공통 규칙, `issues`는 12개 A/B/C/D 분류 과제다. `traceability.json`은 요구사항→규칙→실제 코드 선언→관련 테스트 파일을 연결한다. 미래 FUT-01에는 구현/테스트가 없으며 null로 표시한다.

`data-dictionary.csv`는 1,290개 **interface 속성 선언**을 추출한 기술 사전이다. 모든 type alias 내부 속성, 상속 펼침 및 모든 업무 유효성 검사를 완전 분석한 목록은 아니다. `physical-stores.json`의 44개 store/인덱스와 `store-type-map.json`을 통해 ERD에 연결한다. DTO/View를 저장 테이블로 오해하지 않는다. `core-field-dictionary.csv/json`에는 Payroll 핵심 30개 필드의 업무 의미·단위·관계·규칙·요구사항을 보완했다. 선택적 속성과 null은 구분한다. 타입의 필수 선언은 런타임 검증 또는 기본값이 아니다.

`test-specifications.csv`는 앞서 실행한 24개 통합 사례의 입력·순서·예상·결과·저장소 변화다. 전체 원문은 `evidence/pr7`에 보존했다. 테스트 파일 연결만으로 모든 경로 통과를 주장하지 않는다. 기존 24개 통합/11개 회귀/Chrome 9개와 이번 실패 주입 진단을 분리한다.

각 원본은 이 README의 버전·SHA를 공통 메타데이터로 상속한다. 문서별 관련 ID는 본문, 구조화 자료는 requirement/rules/code 필드로 연결한다. 파일별 SHA-256은 `manifest.json`에 있다.

## 실행·검증 근거

- `evidence/release.json`: PR #7 squash 병합과 정확한 커밋의 Pages Actions 성공.
- `evidence/deployed-smoke.json`: 격리 Chrome에서 배포 페이지 로딩·오류 확인. 사용자 프로필/IndexedDB 미사용.
- `evidence/diagnostic-probes.json`: A01 중복 PK 뒤 행 덮어쓰기, A02 감사 실패 후 CONFIRMED 잔존. **두 건은 결함 재현이며 기능 통과가 아니다.**
- `evidence/pdf-automated-qa.json`, `evidence/pdf-review.md`: 최종 PDF 검사 범위·결과.
- `evidence/pr7`: 이전 실행 기록의 사본. 당시 Draft/미병합 문구는 역사적 기록이며 현재 병합 상태는 release.json을 따른다.

이번 문서 PR은 앱 소스·의존성·배포 설정을 변경하지 않는다. 진단용 TypeScript는 Node의 fake-indexeddb만 사용하며 사용자 브라우저 데이터를 열지 않는다. 미확인 범위: 실제 사용자 DB, 실제 정부 신고 수리, 모든 화면 버튼의 E2E, 전체 다중 탭 조합, 저장공간 부족·강제 종료. 법령 전체의 최신성 인증 자료가 아니다.

## PDF 재생성

저장소 루트에서 실행한다. Python 3의 reportlab/Pillow/pypdf/pdfplumber, 한글 TrueType 폰트, Poppler가 필요하다. 의존성은 별도 환경에 설치하고 앱 package.json/lockfile을 변경하지 않는다.

```sh
HRIS_PDF_FONT=/path/to/korean-font.ttf python3 docs/system-analysis/tools/build_pdfs.py
pdftoppm -png docs/system-analysis/output/pdf/HRIS_PM_Review.pdf /tmp/hris-pm-page
pdftoppm -png docs/system-analysis/output/pdf/HRIS_System_Architecture_Study.pdf /tmp/hris-study-page
```

기본 폰트는 macOS `/Library/Fonts/Arial Unicode.ttf`. 최종본은 해당 폰트를 PDF에 부분 포함했다. SVG 수정 시 `tools/render-diagrams.mjs`로 PNG를 먼저 갱신한다. 별도 환경의 playwright-core 경로와 Chrome 실행파일을 환경변수로 지정한다.

```sh
HRIS_PLAYWRIGHT_MODULE=/path/to/playwright-core/index.mjs HRIS_CHROME_PATH=/path/to/chrome node docs/system-analysis/tools/render-diagrams.mjs
```

`tools/extract.mjs`는 저장소 TypeScript 의존성으로 선언 자료를 다시 추출한다. 나머지 content/documents/concept/diagram 생성 스크립트는 제작 과정을 보존한 보조 자료다. 이들을 실행하면 편집된 원본을 덮을 수 있으므로 먼저 별도 브랜치에서 diff를 확인한다. 최종본 재출력은 위 PDF 빌더만으로 가능하다.

격리 결함 재현: 저장소의 tsx/fake-indexeddb 환경에서 `npx tsx docs/system-analysis/tools/diagnostic-probes.ts`. 테스트 데이터와 진단 결과 파일만 새로 만들며, 실행 결과는 두 결함의 존재를 기록한다.

보존 로그의 개인 홈/임시 작업 경로는 배포용 사본에서 가림 처리했다. 원본 실행 내용·PASS/FAIL·종료 결과는 바꾸지 않았다. 원본 로그의 위치는 고정 커밋의 `docs/verification/pr7-final-build.log`다.
