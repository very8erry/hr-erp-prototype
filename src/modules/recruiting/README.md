# 채용 ATS 0.7.3

공고 상태(작성·승인대기·모집·마감), 지원자 파이프라인, 평가·메모, 면접 일정과 중복 검사, 취소·캘린더(ICS), 자동화 대기함을 제공합니다. 입력은 브라우저 데이터베이스의 회사 자료에 저장되어 전체 백업과 교육환경 초기화에 포함됩니다.

## 실제 연동

자동화 연동에서 HTTPS 웹훅 주소를 저장합니다. Notion 데이터베이스·문자 서비스·캘린더에 대한 비밀 키는 브라우저에 입력하지 않고 n8n/Make 또는 별도 서버에서 관리합니다. `웹훅 전달`은 지원자의 연락·외부연동 동의가 체크된 경우에만 요청하며, 실패는 재시도할 수 있습니다. 문자 내용을 대기함에 등록해도 발송하지 않습니다. 응답 성공은 웹훅 전달 완료이며 문자 배달 성공을 뜻하지 않습니다.

POST JSON: `{event:{id,type,candidateId,message,created,status},candidate,job}`. `Idempotency-Key` 헤더와 event.id를 서버에서 중복 방지 키로 사용하세요. 이벤트: CANDIDATE_STAGE_CHANGED, INTERVIEW_SCHEDULED, SMS_REQUESTED. Notion 페이지는 candidate.id를 외부 키로 생성·갱신하고, 문자 이벤트는 공급자 API로 전달하며 공급자 배달 결과는 서버에서 확인합니다. 자동화 URL은 허용된 서비스 주소만 설정해야 합니다. 가상 지원자의 전화번호·메일은 테스트 값이므로 실제 발송 대상이 아닙니다.

## 설계 참고

- SAP SuccessFactors: 공고, 지원자 단계, 면접 평가, 일정, 메시지의 통합 흐름 https://learning.sap.com/courses/navigating-the-employee-lifecycle-through-sap-successfactors/overview-of-sap-successfactors-recruiting
- Oracle Recruiting: 면접 일정 중앙 관리와 취소 시 이력 유지 https://docs.oracle.com/en/cloud/saas/talent-management/faush/candidate-interviews.html

실제 외부 공고 게시·전자서명·입사자 자동 전환·문자 공급자 연결은 이 버전의 기능에 포함되지 않습니다.
