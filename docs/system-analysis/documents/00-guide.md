# 문서 체계·범위·분석 기준

문서 버전 1.0 | 작성 2026-11-18 KST | 분석 기준 b4aeb300270a62273d3d5f0c2fea87f2a09ba800

작성 근거: 고정 커밋의 src, config, 테스트 및 docs/verification 실행 기록. 문서 작업은 애플리케이션 코드를 변경하지 않는다.

관련 요구사항: 전체 요구사항

현재 목적은 Payroll 업무 이해와 설계·활용 능력을 보여주는 로컬 HR Training Simulator다. 단기 목표는 자료 검토에 참고할 정확성·저장 안정성·재현성을 갖추는 것이며, 실제 운영 인증으로 해석하지 않는다. 장기 AI 업무 시뮬레이션은 FUT-01의 제안이다.

공통 규칙의 기준 위치는 04-business-rules.md 및 business-rules.json이다. 요구사항은 ID로 규칙을 참조하며 같은 규칙을 문서마다 재정의하지 않는다. 필드의 기술적 사실은 TypeScript AST 추출본 fields.json/data-dictionary.csv, 물리 저장소와 인덱스의 기준은 physical-stores.json이다. 06-code-mapping.md/traceability.json이 요구사항과 코드·테스트를 연결한다. 화면에 보이는 합계나 View 타입을 별도 저장소로 간주하지 않는다.

증거 분류: E-CODE=실제 코드 정적 확인, E-TEST=격리 테스트 실행 기록, E-DEPLOY=Actions와 배포 화면, E-PROPOSAL=추가 설계 제안. 정적 확인만으로 모든 런타임 경로를 검증했다고 표기하지 않는다. 법령의 현재 적합성은 이번 코드 구조 진단 범위 밖이며 앱의 2025~2026 산식 지원 범위와 법적 정확성 검증은 별개다.

PDF A는 의사결정 자료, PDF B는 개념과 구조·읽기 방법을 설명하는 교재다. 전체 1,290개 인터페이스 필드 추출본은 원본 CSV/JSON으로 제공한다. 모든 필드에 업무 의미나 런타임 검증이 구현되어 있다는 뜻은 아니다. 선언·저장·검증은 서로 다른 사실이다.

병합 전 PR HEAD ebe198d, main 이전 a3021607. PR 체크 0건(상태 집계 pending은 실행 중 CI가 아니라 상태 레코드 없음), main protected=false, rulesets=[] 확인 후 사용자 요청에 따라 Ready 및 squash 병합했다. 병합 SHA를 모든 근거 링크에 고정했다. main push Actions run 44210067857 성공. 세부 결과는 evidence/release.json 및 deployed-smoke.json 참조.

과거 PR #7 수정 내용과 이번 진단의 현재 미해결 문제를 구분한다. PR #7에서 회사 소속·예약충돌·근태경합 등을 개선했으나, 백업 중복 PK와 상태/감사 분리 커밋은 이번 전체 진단에서 새로 드러난 별도 경로다. 앱 코드는 변경하지 않았다.
