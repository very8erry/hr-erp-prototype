# 코드 근거와 검증 결과

문서 1.0 · 분석 커밋 b4aeb300270a62273d3d5f0c2fea87f2a09ba800 · 관련 요구사항 R-01~17

PR #7 HEAD ebe198d1a39c55573796fa4250856284ec68d5da. 병합된 main의 부모는 기존 main 한 개이고 PR HEAD와 트리 차이 0건이다. 조사 시점에 이미 squash 병합 완료. PR HEAD check runs는 빈 목록, 조회한 main 보호는 false, 적용 rules 목록은 비어 있었다. 과거 특정 시점의 보호 설정은 재구성하지 않았다.

Actions 실행 44210067857의 build·deploy 모두 success. evidence/jobs.json에 배포 SHA와 작업 URL이 있다. Pages의 HTML은 HR Training Lab v0.7.9를 반환했다. 이번 환경에서 Chromium 로컬 소켓 생성이 거부되어 배포 화면의 상호작용·콘솔 오류는 확인하지 못했다.

최종 검증 문서와 저장된 결과를 재사용했다. pr7-review.md의 앞선 판정을 pr7-final-gate.md와 교차 확인한다. 예약 발령 충돌과 오래된 탭의 근태 덮어쓰기는 수정 이력이다. 전체 UI E2E, 실제 기관 접수, 모든 브라우저·동시 편집 조합은 미확인이다.
## 문서 검수

PM 10쪽, 상세 교재 39쪽을 페이지별 이미지로 렌더링했다. 한글이 표시되지 않는 중간 출력의 글꼴을 바꾸고 최종본을 다시 렌더링했다. 목차 쪽수, 본문 범위, 한글 표시 및 도식 배치를 확인했다. 기호와 세부 속성은 diagrams의 원본 및 확대 가능한 SVG로도 제공한다.
