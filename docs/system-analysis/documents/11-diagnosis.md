# 시스템 진단·개선 과제 목록

문서 버전 1.0 | 작성 2026-11-18 KST | 분석 기준 b4aeb300270a62273d3d5f0c2fea87f2a09ba800

작성 근거: 고정 커밋의 src, config, 테스트 및 docs/verification 실행 기록. 문서 작업은 애플리케이션 코드를 변경하지 않는다.

관련 요구사항: 전체 요구사항

총 12건: A 확인 결함 2, B 잠재 위험 4, C 정책 미정 3, D 확장 제안 3. 실제 결함 A의 재현은 격리 fake-indexeddb, 사용자 DB에 대한 손상을 일으키지 않았다.

## ISS-A01 백업의 중복 PK 덮어쓰기

분류/우선순위: A 확인 결함 / P1

AS-IS/원인: importDatabase/seed는 배열 레코드를 put으로 저장하며 중복 id 사전 검증이 없다.

증거: 399 Person 입력이 398개로 저장되고 마지막 값이 남음. diagnostic-probes.json / [src/infrastructure/db/indexedDb.ts:1285](https://github.com/very8erry/hr-erp-prototype/blob/b4aeb300270a62273d3d5f0c2fea87f2a09ba800/src/infrastructure/db/indexedDb.ts#L1285) / importDatabase

업무·데이터 영향: 기존 백업 일부 행이 조용히 소실될 수 있다.

TO-BE 제안: 복원 전 PK/업무키 중복·참조 검사 후 전체 교체. 실패 시 원본 유지.

대안·비용: 중복 정리 후 자동복원은 잘못된 동일인 병합 위험. 명시적 오류와 수동 검토가 안전하다.

수용조건: 중복 PK/복합키/잘못된 참조 fixture별 복원 거부와 원본 동일성 검사

상태: 진단/제안만 작성; 이번 문서 작업에서 앱 코드 수정 없음

## ISS-A02 급여 상태와 감사로그의 분리 커밋

분류/우선순위: A 확인 결함 / P1

AS-IS/원인: setPayrollRunStatus는 Run put 후 audit put을 별도 트랜잭션으로 실행한다.

증거: 감사 쓰기 실패 주입 시 CONFIRMED가 남고 해당 감사로그는 없음. / [src/infrastructure/db/indexedDb.ts:822](https://github.com/very8erry/hr-erp-prototype/blob/b4aeb300270a62273d3d5f0c2fea87f2a09ba800/src/infrastructure/db/indexedDb.ts#L822) / setPayrollRunStatus

업무·데이터 영향: 상태가 바뀌었으나 감사 근거가 없어 추적성이 약해진다.

TO-BE 제안: 상태 재검증·Run·audit를 하나의 readwrite 트랜잭션으로 묶기.

대안·비용: 재시도만으로는 중복 감사/상태 경합을 해결하지 못함. outbox는 서버화 시 대안이다.

수용조건: 각 쓰기 시점 실패 주입; 상태·로그가 모두 저장되거나 모두 취소됨을 검사

상태: 진단/제안만 작성; 이번 문서 작업에서 앱 코드 수정 없음

## ISS-B01 잠금 전환의 동시성 범위

분류/우선순위: B 잠재 위험 / P1

AS-IS/원인: 상태 전환은 읽기/조건 확인과 저장이 분리된다. 근태 저장의 새 경합 검사가 모든 저장 경로를 보호하지 않는다.

증거: setPayrollRunStatus 코드 정적 확인; 경합 전체 조합 미실행 / [src/infrastructure/db/indexedDb.ts:822](https://github.com/very8erry/hr-erp-prototype/blob/b4aeb300270a62273d3d5f0c2fea87f2a09ba800/src/infrastructure/db/indexedDb.ts#L822) / setPayrollRunStatus

업무·데이터 영향: 두 탭의 다른 작업 순서에 따라 판단 시점과 저장 시점이 달라질 수 있다.

TO-BE 제안: Run 상태 전이와 잠금 관련 변경의 원자적 경계 정리.

대안·비용: 전역 UI 잠금은 같은 브라우저 탭 밖에서 강제되지 않는다.

수용조건: 확정/마감 vs 입력/삭제 interleaving 테스트

상태: 진단/제안만 작성; 이번 문서 작업에서 앱 코드 수정 없음

## ISS-B02 로컬 데이터와 백업의 접근 경계

분류/우선순위: B 잠재 위험 / P1

AS-IS/원인: IndexedDB 및 JSON 백업은 서버 권한 경계가 아니다.

증거: exportDatabase/로컬 아키텍처 확인 / [src/infrastructure/db/indexedDb.ts:1281](https://github.com/very8erry/hr-erp-prototype/blob/b4aeb300270a62273d3d5f0c2fea87f2a09ba800/src/infrastructure/db/indexedDb.ts#L1281) / exportDatabase

업무·데이터 영향: 실제 개인정보 입력 시 공유 프로필·백업 유출 위험

TO-BE 제안: 실습 가상자료 원칙 유지; 실제 운영 전 인증/권한/보관·암호화 설계.

대안·비용: 브라우저 암호화만으로 실행 중 권한 우회를 막지는 못함.

수용조건: 권한별 위협 모델 및 백업 접근 테스트

상태: 진단/제안만 작성; 이번 문서 작업에서 앱 코드 수정 없음

## ISS-B03 단일 회사 가정과 전체 백업

분류/우선순위: B 잠재 위험 / P2

AS-IS/원인: getCompany는 첫 회사, SeedBundle.company는 단일 객체다.

증거: 코드 및 다중회사 보완 테스트 범위 확인 / [src/infrastructure/db/indexedDb.ts:361](https://github.com/very8erry/hr-erp-prototype/blob/b4aeb300270a62273d3d5f0c2fea87f2a09ba800/src/infrastructure/db/indexedDb.ts#L361) / getCompany

업무·데이터 영향: 여러 회사가 저장돼 있으면 백업 대표 범위가 불명확하다.

TO-BE 제안: 단일회사 불변식 명시·검사 또는 다중회사 스키마를 별도 설계.

대안·비용: 즉시 배열로 바꾸면 기존 파일 호환성 비용 발생.

수용조건: 2회사 입력 시 거부/보존 요구사항 결정 후 테스트

상태: 진단/제안만 작성; 이번 문서 작업에서 앱 코드 수정 없음

## ISS-B04 일용직 번호 경합

분류/우선순위: B 잠재 위험 / P2

AS-IS/원인: 번호 중복 조회는 새 worker 쓰기 트랜잭션 밖이다. unique workerNumber 인덱스 없음.

증거: createDailyWorker/config 정적 확인, 동시 번호 시험 미실행 / [src/infrastructure/db/indexedDb.ts:1176](https://github.com/very8erry/hr-erp-prototype/blob/b4aeb300270a62273d3d5f0c2fea87f2a09ba800/src/infrastructure/db/indexedDb.ts#L1176) / createDailyWorker

업무·데이터 영향: 다른 PK에 같은 번호가 연결될 가능성

TO-BE 제안: 번호 검사와 add를 같은 tx로 이동; 기존 중복 정리 승인 후 unique 검토.

대안·비용: 인덱스 즉시 추가는 기존 중복으로 업그레이드 중단 가능.

수용조건: 두 탭 동일 번호 등록 시 1건만 성공

상태: 진단/제안만 작성; 이번 문서 작업에서 앱 코드 수정 없음

## ISS-C01 재입사·사번·동일인

분류/우선순위: C 정책 미정 / P1

AS-IS/원인: 일반등록/ATS는 새 Person; 이름은 확인 근거가 아니다.

증거: BR-01/BR-13 및 실제 코드 / [src/infrastructure/db/indexedDb.ts:241](https://github.com/very8erry/hr-erp-prototype/blob/b4aeb300270a62273d3d5f0c2fea87f2a09ba800/src/infrastructure/db/indexedDb.ts#L241) / registerEmployee

업무·데이터 영향: 인물 이력이 분산되고 누적 집계가 달라질 수 있다.

TO-BE 제안: 권한 있는 본인 확인과 기존 Person 선택/오연결 정정 정책부터 확정.

대안·비용: 이름 자동병합은 동명이인 손상 위험. 민감번호 무조건 수집도 부적절.

수용조건: 동명이인/사번 변경/복수 고용/ATS 재지원 사례

상태: 진단/제안만 작성; 이번 문서 작업에서 앱 코드 수정 없음

## ISS-C02 마감 후 정정 급여

분류/우선순위: C 정책 미정 / P1

AS-IS/원인: 잠금 Run은 DRAFT 되돌리기가 금지되고 별도 정정 Run이 없다.

증거: BR-09 코드와 잠금 회귀 / [src/infrastructure/db/indexedDb.ts:822](https://github.com/very8erry/hr-erp-prototype/blob/b4aeb300270a62273d3d5f0c2fea87f2a09ba800/src/infrastructure/db/indexedDb.ts#L822) / setPayrollRunStatus

업무·데이터 영향: 실제 업무의 소급 정정/취소·재지급 절차가 완결되지 않음

TO-BE 제안: 원본 보존한 차액 정정·승인·신고 수정 정책 설계.

대안·비용: 기존 결과 덮어쓰기는 과거 재현성 훼손.

수용조건: 차액원장/원Run 연결/취소 권한 테스트

상태: 진단/제안만 작성; 이번 문서 작업에서 앱 코드 수정 없음

## ISS-C03 보류 발령 재검토

분류/우선순위: C 정책 미정 / P2

AS-IS/원인: reviewReason이 있으면 자동 적용하지 않으며 재승인 UI가 없다.

증거: BR-04와 타임라인 표시 코드 / [src/infrastructure/db/indexedDb.ts:530](https://github.com/very8erry/hr-erp-prototype/blob/b4aeb300270a62273d3d5f0c2fea87f2a09ba800/src/infrastructure/db/indexedDb.ts#L530) / applyEvent

업무·데이터 영향: 사용자 검토 이후의 승인·취소 경로 정의 필요

TO-BE 제안: 원본 보존·새 승인기록·기준 스냅샷 갱신 정책.

대안·비용: 플래그 단순 삭제는 판단 근거 유실.

수용조건: 보류→재검토→취소/새 발령의 감사 테스트

상태: 진단/제안만 작성; 이번 문서 작업에서 앱 코드 수정 없음

## ISS-D01 저장소 책임 분리

분류/우선순위: D 확장 제안 / P2

AS-IS/원인: Core HR/ATS/Payroll/운영 쓰기가 큰 IndexedDbHrRepository에 모인다.

증거: 클래스 메서드/소스 목록 측정 / [src/infrastructure/db/indexedDb.ts:165](https://github.com/very8erry/hr-erp-prototype/blob/b4aeb300270a62273d3d5f0c2fea87f2a09ba800/src/infrastructure/db/indexedDb.ts#L165) / initialize

업무·데이터 영향: 변경 파급과 테스트 탐색 비용

TO-BE 제안: 현재 트랜잭션 경계를 보존하는 업무별 쓰기 단위 추출.

대안·비용: store별 단순 분리는 원자성을 깨뜨릴 수 있음.

수용조건: 기존 회귀 동일성 및 모듈 의존 검사

상태: 진단/제안만 작성; 이번 문서 작업에서 앱 코드 수정 없음

## ISS-D02 PR 검증 게이트

분류/우선순위: D 확장 제안 / P2

AS-IS/원인: workflow는 main push/workflow_dispatch 전용, main 보호 및 rulesets 없음.

증거: 병합 전 API 조회 + deploy.yml / [.github/workflows/deploy.yml:1](https://github.com/very8erry/hr-erp-prototype/blob/b4aeb300270a62273d3d5f0c2fea87f2a09ba800/.github/workflows/deploy.yml#L1) / workflow trigger

업무·데이터 영향: 병합 후에야 CI 오류가 드러날 수 있음

TO-BE 제안: PR 빌드·검증과 보호 규칙을 운영 결정 후 설정.

대안·비용: 현재 문서 작업은 workflow를 변경하지 않음.

수용조건: 실패 PR 병합 차단 확인

상태: 진단/제안만 작성; 이번 문서 작업에서 앱 코드 수정 없음

## ISS-D03 AI 업무 실행 계약

분류/우선순위: D 확장 제안 / P3

AS-IS/원인: 현재 서비스는 브라우저 업무 호출, 서버/MCP 실행 계약 없음.

증거: 현행 컴포넌트 구조 / [src/infrastructure/db/indexedDb.ts:165](https://github.com/very8erry/hr-erp-prototype/blob/b4aeb300270a62273d3d5f0c2fea87f2a09ba800/src/infrastructure/db/indexedDb.ts#L165) / initialize

업무·데이터 영향: 안전한 자동화·평가·복구 체계가 선행되어야 함

TO-BE 제안: 격리 데이터셋·명령 멱등키·허용 작업·실행 추적·평가지표부터 설계.

대안·비용: 화면 좌표만 자동화하면 변경에 취약.

수용조건: 시나리오 성공률/손상0/복구시간을 측정

상태: 진단/제안만 작성; 이번 문서 작업에서 앱 코드 수정 없음
