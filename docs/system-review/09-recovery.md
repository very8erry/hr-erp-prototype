# 데이터 무결성·마이그레이션·복원

문서 1.0 · 분석 커밋 b4aeb300270a62273d3d5f0c2fea87f2a09ba800 · 관련 요구사항 R-01~04 / R-17

DB 이름 hr-training-simulator, DB 및 스키마 버전 7. PR에서 기존 PK를 유지했다. 원천·결과는 다른 저장소로 분리한다. 복구 전에는 schemaVersion, 고용 연결, 원천·결과 수를 기록한다. 실제 사용자 프로필에서 초기화하지 않는다.

복원 실습은 별도 브라우저 프로필에서 exportDatabase로 원본을 보관하고 importDatabase로 교체한 뒤 고용 ID·이력·근태·급여 결과를 전후 대조한다. 지원되지 않는 v1 사용자 Person은 변환 전에 거부한다. 구 탭으로 인한 blocked 오류는 해당 연결 종료 후 재시도한다. 기존 Chrome fixture에서 배치 374건·월 근태 2,906건 보존을 검증했다. 저장공간 부족과 강제 종료는 미검증이다.

근거 · src/infrastructure/db/indexedDb.ts:1281 / src/infrastructure/db/indexedDb.ts:1285 / docs/verification/pr7-upgrade-results.json