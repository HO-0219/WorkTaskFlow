# 로컬 알파 문서·구현 정합성 검토

검토일: 2026-07-22
범위: 디자인 경로, 서버 권한, ERD, API 계약. AWS·S3·Docker·CI/CD 제외

## 결론

로컬 알파의 실제 프런트 라우트, Spring MVC API, Flyway V1~V12 스키마와 권한 회귀 테스트를 기준 문서와 대조했다. 구현 변경이 필요한 차단 불일치는 없었고, 초기 설계 표현으로 남아 있던 문서 불일치를 현재 구현 계약에 맞게 수정했다.

## 대조 결과

| 영역 | 구현 근거 | 검토 결과 |
|---|---|---|
| 화면 경로 | `frontend/src/app/App.tsx`의 실제 사용자 경로 17개 | 사이트맵을 실제 평면·그룹 경로와 일치시킴 |
| API | presentation controller의 HTTP 동작 52개(health 포함) | API 계약의 인증~대시보드 경로와 일치 |
| 데이터 | Flyway V1~V12, 애플리케이션 테이블 14개 | ERD의 관계·컬럼·인덱스 기준과 일치 |
| 권한 | `LocalAlphaAuthorizationMatrixApiTest`와 도메인별 API 테스트 | 비멤버 404, 역할 부족 403, 소유자·담당자 규칙과 일치 |
| 반응형·접근성 | `frontend/src/styles.css`, 사용성 QA 보고서 | 현재 상단 링크·카드 셸과 320px·44px 기준을 명시 |

## 수정한 문서 불일치

1. 사이트맵에만 있던 `/my-tasks`, `/settings/**`, 그룹 중첩 `members/settings/calendar` 경로를 제거하고 현재 17개 라우트를 기록했다.
2. 좌측 사이드바·모바일 하단 탭을 현재 구현으로 오해하지 않도록 목표 와이어프레임과 로컬 알파 셸을 구분했다.
3. 모든 목록이 커서 페이지를 쓴다는 초안을 알림 커서 페이지와 소규모 배열 목록의 실제 계약으로 수정했다.
4. access token 자동 refresh는 홈 진입에만 적용되고 다른 화면의 만료 처리는 재로그인이 필요하다는 동결 정책을 반영했다.
5. TEAM 업무는 등록자가 LEADER여도 `REQUESTED`로 시작하고 승인·담당 지정 후 수행한다는 규칙을 명시했다.
6. ERD의 Java 필드명 `systemRole` 표기를 실제 DB 컬럼 `role`로 바로잡고 `work_groups.updated_at`, 업무 생명주기·사유·시각 컬럼을 보완했다.
7. 그룹 비멤버 응답을 실제 정보 은닉 정책인 `404 GROUP_NOT_FOUND`로 통일했다.
8. 디자인 토큰·공통 UI의 목표 폴더와 현재 단일 `styles.css` 구현을 구분했다.

## 기준 커밋 포함 조건

- H2와 전용 로컬 MySQL 전체 테스트 68개 성공
- 프런트 프로덕션 빌드 61 modules 성공
- 깨끗한 별도 환경에서 `npm ci`, Flyway V12, preview 로그인 재현 성공
- `.env` 제외, `.env.example` 추적 대상, 비밀키·인증서 패턴 없음
- `git diff --check` 성공
- 생성물 `backend/target`, `frontend/node_modules`, `frontend/dist` 제외

검토 시점에 로컬 알파를 차단하는 미결정 정책이나 문서·구현 불일치는 없다.
