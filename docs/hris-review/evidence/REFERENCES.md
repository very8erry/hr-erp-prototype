# 근거·자료 목록

v1.0 · 2026-11-19 · b4aeb300270a62273d3d5f0c2fea87f2a09ba800
 
## 기준 자료
 
- 저장소 https://github.com/very8erry/hr-erp-prototype/tree/b4aeb300270a62273d3d5f0c2fea87f2a09ba800
- PR #7 https://github.com/very8erry/hr-erp-prototype/pull/7 · merged 확인. 이전 문제와 수정 이력 대조용. PR의 당시 명칭·의견으로 현재 동작을 확정하지 않았다.
- docs/verification/pr7-final-gate.md, pr7-native-results.json, pr7-upgrade-results.json, pr7-integration-results.json은 기존 기록이다. 이번 실행 결과는 이 폴더에 별도로 보존했다.
- ISO/IEC 25010:2023 제2판, ISO 공개 초록 https://www.iso.org/standard/78176.html · 제목·판·발행월·제품 품질 모델의 목적과 9개 특성이라는 설명만 열람. 유료 전문·세부 조항과 대조하지 않았다.
- MDN, IndexedDB key characteristics and basic terminology, 공개 웹 문서 https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Basic_Terminology · IndexedDB 용어 참고. 실제 저장 제약은 config.ts와 migrations.ts에서 확인했다.
- PlantUML 1.2024.8 · UML 관점 및 IE 데이터 모델 원본을 SVG로 렌더링. UML 표준 전문 준수 심사를 수행하지 않았다.
 
## 실행 및 재사용
 
Node v24.22.3, 격리된 체크아웃, npm ci 후 npm run build. main-build.log는 원 실행 로그, main-integration.json은 24개 시나리오의 입력·단계·예상·결과 추출본이다. 기존 Chrome 157 기록과 이번 Chromium headless 153.0.8010.0 실제 IndexedDB의 8+1건은 구분한다. 브라우저 시험은 scripts/browser/pr7-native.mjs, pr7-upgrade.mjs이며 복원된 가상 fixture에서 실행했다. ui.json은 별도 임시 프로필에서 직접 누른 8개 메뉴의 화면 제목이다. 빈 buttons 배열은 선별한 레이블이 없었다는 뜻이다.
 
재현할 때는 고정 SHA의 새 체크아웃에서 npm ci를 실행하고, 이 폴더의 payroll-probe.mjs와 legacy-probe.tsx를 그 체크아웃 최상위에 복사한다. 각각 node --import tsx payroll-probe.mjs 및 node --import tsx legacy-probe.tsx로 실행한다. fake-indexeddb는 프로세스마다 독립적이다. payroll-probe.json, probe-assertions.log 및 legacy-probe.json이 비교 기준이다. 운영 DB나 실제 직원 파일은 사용하지 않았다.
 
fields.csv는 types.ts, operations.ts, recruiting.ts에서 TypeScript AST로 추출한 interface 멤버 856개의 선언(선택 표기·타입·행)이다. 타입 별칭과 인라인 타입 전체를 물리 스토어로 환산하지 않았다. stores.json은 앱의 STORE_DEFINITIONS에서 읽은 44개 저장소·인덱스 원본이다.

중단 검사는 fault-probe.mjs를 같은 격리 체크아웃 최상위에 복사한 뒤 node --import tsx fault-probe.mjs로 실행한다. fake-indexeddb의 지정된 objectStore 쓰기에서 일회성 abort를 주입한다. 결과는 fault-probe.json이다. 실제 브라우저의 디스크 부족·정전·발생 빈도는 재현 대상에 포함하지 않았다.
