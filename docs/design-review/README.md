# HRIS 기획·설계 검토 v3.1

분석 기준: main `3fc7b8ce91cb2fe2b11716e11fa86b631a8984dc` + `codex/policy-payroll-workflow` 변경안. 작성/검증일: 2026-11-28.

`public/hris-design.html`은 기존 메뉴 구조를 유지하는 독립 열람용 문서다. 실제 HRIS IndexedDB·API를 조회하거나 수정하지 않는다. 170개 요구사항, 14개 영역, 68개 타입 정의와 기존 개념/논리/물리 모델을 포함한다. 요구 연결이 모든 세부 기능의 테스트 완료를 의미하지 않는다.

## 편집 원본

- `data.json`: 요구·기능·대응표·근거·남은 범위와 소스 지문.
- `schema.json`: 실제 TypeScript 필드·타입·소스 위치. `node scripts/refresh-design-schema.mjs`로 갱신.
- `physical.json`: 기존 DB 저장소/인덱스. 이번 변경은 DB 이름·버전·PK를 변경하지 않는다.
- `base.html`, `extension.js`, `extension.css`: 화면·도식 편집 원본.
- `python3 scripts/build-design-review.py`: 단일 HTML 생성.
- `python3 scripts/build-policy-reference.py`: 열람용 규정 참고 파일 갱신.
- `docs/manuals/*.html`: 최신 설명서 PDF의 편집 원본.

## 최신성 및 검증

`test-design-current.ts`가 소스 지문, 요구 ID, ERD 타입, HTML의 데이터 접근 금지, 설명서 파일을 검사한다. 릴리스 검사에 포함되어 소스가 바뀌면 문서 갱신 없이 빌드가 통과하지 않는다. 지문 갱신만으로 의미 검토를 대신하지 않으며 변경된 요구/기능/상태 설명을 함께 검토한다.

이번 실제 변경, 테스트 입력·기대/실제 결과, 보존 범위, 미지원·승인 항목은 [최종 검증 기록](../verification/policy-payroll-20261128.md)을 기준으로 한다. 과거 보고서의 성공을 이번 변경에 그대로 적용하지 않는다.

공식 2026 반기 신고서 작성 및 로컬 XLSX 왕복은 검증 대상이다. 실제 기관 접수·송금·자동 교부·2027 월별 공식 PDF 지원을 완료로 표시하지 않는다. 근거가 확정되지 않은 규정과 회사별 판단은 확인 필요로 유지한다.
