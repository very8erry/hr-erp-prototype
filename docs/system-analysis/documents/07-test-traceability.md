# 테스트 명세서 및 요구사항 추적표

문서 버전 1.0 | 작성 2026-11-18 KST | 분석 기준 b4aeb300270a62273d3d5f0c2fea87f2a09ba800

작성 근거: 고정 커밋의 src, config, 테스트 및 docs/verification 실행 기록. 문서 작업은 애플리케이션 코드를 변경하지 않는다.

관련 요구사항: 전체 요구사항

추적 키는 requirement ID→BR ID→코드 symbol/path/line→테스트 파일→실행 증거다. 파일 존재만 확인한 것과 테스트 통과는 구별한다. 원본 traceability.json과 pr7-integration-results.json을 함께 사용한다.

기존 최종 검증 재사용: 24개 repository/service 통합 시나리오, 11개 예약·근태 회귀, 실제 Chrome 8+1개 시나리오. npm run build는 prebuild verify:release를 포함한다. 이번 문서 작업은 이 전체 테스트를 불필요하게 다시 실행하지 않았다. 병합 후 Actions run 44210067857은 동일 build를 실행해 성공했다.

Chrome의 직원등록은 폼 UI, 이후 업무 흐름은 브라우저 안의 실제 service 호출이다. 모든 버튼을 누른 UI E2E로 기술하지 않는다. 업그레이드 fixture는 기존 회사 이메일 설정 마이그레이션 완료 상태였다. 실제 사용자 브라우저 DB를 검사하거나 초기화하지 않았다.

추가 진단 2건은 tools/diagnostic-probes.ts와 evidence/diagnostic-probes.json에 입력·예상·실제를 남겼다. 두 결과는 기능 통과가 아니라 결함 재현이다. 중복 Person PK의 뒤 행 값 보존/앞 행 유실, 감사 쓰기 오류 후 Run CONFIRMED 잔존을 확인했다.

새 수용조건은 각 ISS의 validation을 사용한다. 실제 신고기관 업로드, 전체 편집 조합, 저장공간 소진, 브라우저 강제 종료는 미검증이다. 미래 AI 성공률은 아직 측정하지 않았다.
