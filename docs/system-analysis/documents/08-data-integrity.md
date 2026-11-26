# 데이터 무결성·마이그레이션·백업·복구 명세서

문서 버전 1.0 | 작성 2026-11-18 KST | 분석 기준 b4aeb300270a62273d3d5f0c2fea87f2a09ba800

작성 근거: 고정 커밋의 src, config, 테스트 및 docs/verification 실행 기록. 문서 작업은 애플리케이션 코드를 변경하지 않는다.

관련 요구사항: 전체 요구사항

BR-02/03/04/05/11이 기준이다. schemaVersion은 JSON 형식, DB_VERSION은 IndexedDB 구조, SEED_VERSION은 더미자료 갱신 기준이다. 셋 모두 같은 숫자일 필요가 없다. 현재 DB/schema 7, seed 6.

업그레이드 흐름: openSharedDatabase → onupgradeneeded/upgradeDatabaseStructure → 기존 데이터 runDataMigrations/runSeedMigrations → 회사 소속 보완 → 운영 초기화 → 예약 적용. 새로고침 시 업무 상태가 변할 수 있으므로 초기화를 단순 read-only라고 부르지 않는다. 기존 v0.3.2 별도 DB는 canonical DB가 비었을 때만 복구를 시도한다.

백업 흐름: exportDatabase → bundle → schemaVersion/exportedAt/data. 복원은 입력 버전을 검사하고 변환 후 seed의 clear/put을 한 tx로 수행한다. 예외는 abort한다. 그러나 중복 PK는 put 자체가 오류가 아니므로 사전 검사 없이는 조용히 덮어쓴다(ISS-A01). 여러 회사의 회사 객체 전체를 보존하는 계약은 없다(ISS-B03).

운영 제안(아직 기능 아님): 원본 백업을 별도 파일로 보관 → schema/PK/논리참조/업무키 검증 → 격리 DB에 사전 복원 → 개수/ID/금액/상태/해시 대조 → 사용자가 전환 승인 → 오류 시 기존 백업 복원. 복원 자체가 실패 가능한 작업이므로 rollback 스냅샷 및 오류 보고가 필요하다.

삭제/병합/ID 재발급은 이번 작업에서 수행하지 않는다. 저장소별 정합성: 사람 존재, 고용 존재, Run 존재, Entry/Result composite key 대응, 유효기간 비중첩, 확정 스냅샷 불변성을 각각 확인한다. inspectIntegrity는 finding 생성이며 모든 쓰기에 FK처럼 자동 적용되는 제약이 아니다.

데이터 소유권: GitHub Pages 버전 교체는 브라우저 DB를 중앙 서버로 옮기지 않는다. 동일 origin/profile에서는 저장이 이어지지만 사이트 데이터 삭제·다른 프로필·다른 origin에는 별도 DB다. 백업 없는 브라우저 삭제 복구를 약속하지 않는다.
