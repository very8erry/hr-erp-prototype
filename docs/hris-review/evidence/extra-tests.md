# 부가 시험 결과

v1.0 · 2026-11-19 · b4aeb300270a62273d3d5f0c2fea87f2a09ba800

릴리스 게이트 외 추가로 실행한 6개 스크립트 중 5개 통과, 1개 실패. 통과한 스크립트는 test-requested.ts(21개월 교육 이력과 파일 출력), test-selection.tsx(채용 선발), test-lemon.tsx(DB/DC·직종코드), test-work-rules.ts(규정·첨부), test-notice-revision.ts(공지·이력)다.

test-hris-v7.tsx는 20행에서 v6 seed와 초기화 후 Person 배열의 deepEqual이 실패했다. 첫 차이는 demo1@example.invalid → demo1@lemonpai314.com이었다. 해당 스크립트의 이후 단언은 실행되지 않았다. 이 실패를 릴리스 빌드 실패로 합산하지 않았다. 별도 legacy-probe.tsx로 사용자 지정 도메인도 확인했다.
