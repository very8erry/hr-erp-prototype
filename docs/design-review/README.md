# HRIS 기획·설계 검토 v3.0

분석 기준: `55281cd2a7de4ab4fc2191d04c06bfd2b05a227b` + `codex/workflow-integrity-review`의 수정 사항. 작성일 2026-11-24.

## 산출물과 편집

`public/hris-design.html`은 외부 라이브러리 없이 열 수 있는 단일 HTML이다. GitHub Pages의 `/hris-design.html`로 배포된다.

- `data.json`: 사용자 요구 165건, 14개 업무영역, 35개 대표 기능, 검토 근거와 남은 범위. 요구사항을 기능에 연결한 것은 개별 요구 전체의 검증 완료를 의미하지 않는다.
- `schema.json`: 실제 TypeScript 인터페이스의 필드·타입·소스 위치.
- `physical.json`: 실제 DB 이름·버전 및 44개 저장소의 인덱스 정의.
- `base.html`, `extension.js`, `extension.css`: 문서 UI 및 SVG 편집 원본.
- `python3 scripts/build-design-review.py`: 단일 HTML 재생성. 이후 `npm run build`로 배포 파일을 생성한다.

논리적 ERD는 Google 이미지 검색에서 살펴본 10개 예시의 공통 표기인 엔터티 표, PK/FK, 관계선, crow's-foot를 적용했다. 참고 URL은 HTML의 작성 근거에서 확인한다. 타인의 도식 이미지를 복제하지 않았다. 42개 타입-저장소 대응과 607개 필드를 사전에 포함한다. 나머지 메타/설정 이력 저장소는 물리 모델에서 확인한다. IndexedDB에 SQL 외래키 제약이 있다고 표현하지 않는다.

## 재검토 판정

- 31개 기능: 표기된 코드·테스트 사례의 범위에서 일치.
- 2개 기능: 코드 경로 확인. 해당 기능 전체의 브라우저 저장/통지 검증으로 확대하지 않는다.
- 1개 기능: 개인 지급·공제 내역 출력 경로가 있으므로 기존 '경로 미확인' 표현 수정. 법정 명세서 자동 교부와는 별개다.
- 1개 기능: 로컬 역할 시뮬레이션과 서버 인증의 제품 범위 구분.

각 기능의 `evidence`, `remaining`, `previousStatus`가 근거 기준이다. 미실행 외부 접수/통지 및 정책 판단을 성공으로 바꾸지 않았다.

## 실행한 검증

- `npm run build`: PASS. prebuild의 전체 릴리스 검사, TypeScript, Vite 포함. 번들 크기 및 기존 혼합 import 경고는 남는다.
- `node --import tsx scripts/test-requested.ts`: PASS. 21개월 더미 이력, NTS 소득세, 연도별 요약 Excel, 원본 신고양식 보존·회사 전화번호, 마감 순서·잠금, 초기화 검증.
- `node --import tsx scripts/test-withholding-atomic.ts`: 수정 전 실패 재현, 수정 후 PASS. 로그 저장 실패 시 전체 저장소 보존, 정상 초안/로그 저장, 회사정보와 동시 저장 시 양쪽 변경 보존.
- `scripts/test-workflow-links.ts`, `scripts/test-dashboard-payroll.ts`: 릴리스 검사에 포함되어 PASS. 휴직 충돌/잠금·로그 원자성, 계산액/지급액/일용 발생액 분리.
- 생성 HTML JavaScript 구문 검사, 요구 ID 중복, ERD 참조 필드와 실제 타입·저장소 매칭, 근거 파일 존재, `git diff --check`: PASS.
- Chrome 실제 문서: 15개 메뉴, 전체 기능·전체 흐름, ERD 표시, 데이터 사전 검색, 기획/설계 대조 상세 표시 확인. 콘솔 오류 없음. 이 검사는 실제 급여 저장 흐름 전체를 재수행했다는 의미가 아니다.

## 변경·보존

휴직 저장과 회사/정산설정 변경의 검증·감사로그를 같은 트랜잭션에 포함한다. 원천세 신고초안도 회사정보 및 로그와 함께 원자적으로 저장한다. 대시보드에서 계산액과 지급 완료액을 구분한다. DB 이름/버전/PK 변경 및 기존 데이터 초기화는 없다. 사용자의 실제 IndexedDB 데이터는 문서 작성/배포 과정에서 수정하지 않았다.

남은 범위: 실제 기관 업로드 접수, 법정 통지 도달, 실제 문자/메일 전송, 서버 인증·중앙 감사, 전체 요구 165건의 개별 E2E 검증. 이번 문서와 로컬 시험의 통과가 이 범위의 완료를 의미하지 않는다.
