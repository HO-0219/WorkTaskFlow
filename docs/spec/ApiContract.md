# API 계약 기준선

상태: 로컬 알파 API 구현 계약(Flyway V12 기준)

## 공통 규칙

- Base path: `/api/v1`
- JSON 필드: `camelCase`
- 인증: `Authorization: Bearer <accessToken>`
- refresh token: HttpOnly cookie, 응답 JSON에 반환하지 않음
- 생성 성공: `201 Created`와 생성 자원 또는 식별자
- 변경 성공: `200 OK` 또는 응답 본문이 없으면 `204 No Content`
- 목록: 알림은 `items`, `nextCursor`, `hasNext` 커서 페이지를 사용한다. 현재 규모가 작은 그룹·멤버·업무·댓글 목록은 배열로 응답한다.
- 날짜/시각: 업무 마감은 그룹 현지 `LocalDateTime`, 캘린더는 현지 시각과 UTC 시각을 함께 응답한다.
- 요청 추적이 필요해지면 `X-Request-Id`를 도입하되 비밀정보를 담지 않음

공통 오류 형태:

```json
{
  "code": "ERROR_CODE",
  "message": "사용자에게 보여 줄 안전한 메시지",
  "fieldErrors": {
    "title": "제목을 입력해 주세요."
  }
}
```

- DTO 검증 실패는 `VALIDATION_FAILED`와 필드별 `fieldErrors`를 반환한다.
- 깨진 JSON, 필수 쿼리 누락, 경로·쿼리 타입 변환 실패는 안전한 `INVALID_REQUEST`를 반환한다.
- 브라우저가 서버에 연결하지 못하면 프런트에서 `OFFLINE` 또는 `NETWORK_ERROR` 안내로 변환한다.

## 시스템 API

| Method | Path | 인증 | 성공 | 설명 |
|---|---|:---:|---|---|
| GET | `/health` | X | 200 | 로컬 백엔드 상태 확인 |

## 현재 인증 API

| Method | Path | 인증 | 성공 | 설명 |
|---|---|:---:|---|---|
| POST | `/auth/email-verifications` | X | 204 | 가입 인증번호 발송 |
| POST | `/auth/email-verifications/confirm` | X | 204 | 인증번호 확인 |
| POST | `/auth/signup` | X | 200(현행) | 회원가입 |
| POST | `/auth/login` | X | 200 | access token + refresh cookie |
| POST | `/auth/refresh` | Cookie | 200 | refresh 회전 후 access 재발급 |
| POST | `/auth/logout` | 선택 | 204 | refresh 폐기와 cookie 삭제 |
| POST | `/auth/username-reminders` | X | 204 | 아이디 안내 요청 |
| POST | `/auth/password-resets` | X | 204 | 재설정 요청 |
| POST | `/auth/password-resets/confirm` | X | 204 | 새 비밀번호 저장 |
| GET | `/auth/providers` | X | 200 | 활성 OAuth 제공자 |
| GET | `/auth/me` | O | 200 | 현재 사용자 |

현재 경로·JSON 필드·성공 코드는 인증 안정화가 끝날 때까지 호환성을 유지한다. REST 의미를 다듬어야 하면 버전 변경 또는 명시적 마이그레이션으로 처리한다.

## Phase 1 사용자 API

| Method | Path | 설명 |
|---|---|---|
| GET | `/users/me` | 내 프로필 조회(구현) |
| PATCH | `/users/me` | 닉네임·전화번호·프로필 이미지 URL 수정(구현) |
| PUT | `/users/me/password` | 현재 비밀번호 확인 후 변경(구현) |
| DELETE | `/users/me` | 재인증 후 탈퇴(구현) |

`PATCH /users/me`는 `nickname`을 필수로 받고 `phoneNumber`, `profileImageUrl`은 빈 값으로 보내면 제거한다. 응답의 `status`와 `systemRole`은 서버가 관리하며 클라이언트가 변경할 수 없다. 기존 `/auth/me` 응답의 `role` 필드와 JWT `role` claim은 하위 호환을 위해 유지한다.

비밀번호 변경은 `currentPassword`, `newPassword`를 받고 성공 시 모든 refresh token을 폐기한다. 탈퇴는 일반 계정의 현재 비밀번호를 재검증한다. 소셜 계정은 최근 5분 안에 해당 제공자로 다시 로그인한 기록이 필요하다. 탈퇴 성공 시 계정 행과 참조용 ID는 유지하되 개인정보를 익명화하고 OAuth 연결·일회용 토큰을 삭제하며 refresh token을 모두 폐기한다.

## Phase 2 그룹 API

| Method | Path | 권한 | 설명 |
|---|---|---|---|
| GET | `/groups` | 로그인 | 내 활성 그룹 목록 |
| POST | `/groups` | 로그인 | TEAM 그룹 생성 |
| GET | `/groups/{groupId}` | MEMBER+ | 그룹 상세 (구현) |
| PATCH | `/groups/{groupId}` | LEADER | 그룹 설정 변경 (구현) |
| GET | `/groups/{groupId}/members` | MEMBER+ | 멤버 목록 (구현) |
| POST | `/groups/{groupId}/invitations` | LEADER | 초대 생성 (구현) |
| GET | `/groups/{groupId}/invitations` | LEADER | 초대 목록 (구현) |
| DELETE | `/groups/{groupId}/invitations/{invitationId}` | LEADER | 초대 취소 (구현) |
| POST | `/group-invitations/{token}/accept` | 초대 대상 | 초대 수락 (구현) |
| PATCH | `/groups/{groupId}/members/{memberId}/role` | LEADER | 역할 변경 (구현) |
| DELETE | `/groups/{groupId}/members/{memberId}` | LEADER | 멤버 내보내기 (구현) |
| DELETE | `/groups/{groupId}/members/me` | MEMBER+ | 그룹 탈퇴 (구현) |

역할 변경 요청 예시:

```json
{ "role": "LEADER" }
```

그룹 설정 변경은 `name`, `description`, `timezone`, `dashboardVisibility` 중 변경할 필드만 보낸다. 비멤버의 상세 접근은 그룹 존재 노출을 줄이기 위해 `404 GROUP_NOT_FOUND`, 활성 MEMBER의 수정 요청은 `403 GROUP_LEADER_REQUIRED`를 반환한다. PERSONAL 그룹은 이름·설명·시간대만 수정할 수 있고 대시보드 공개 범위는 `MEMBERS`로 고정한다.

초대 생성 요청은 `{ "email": "member@example.com" }` 형식이다. 원문 초대 토큰은 DB에 저장하지 않고 해시만 저장하며 기본 만료 시간은 72시간이다. 초대 수락 시 로그인 사용자의 현재 이메일과 초대 이메일이 같아야 하고, 수락·취소·만료된 토큰은 다시 사용할 수 없다. PERSONAL 그룹은 초대를 지원하지 않는다.

역할 변경·탈퇴·내보내기는 그룹 행을 잠근 트랜잭션 안에서 처리한다. 마지막 활성 LEADER는 MEMBER로 변경하거나 탈퇴·내보내기 할 수 없다. 탈퇴·제거된 멤버십은 `LEFT`·`REMOVED` 이력으로 남으며, 새 초대를 수락하면 기존 행을 MEMBER로 재활성화한다.

## Phase 3 업무 API

| Method | Path | 권한 | 설명 |
|---|---|---|---|
| GET | `/groups/{groupId}/tasks` | MEMBER+ | 그룹 업무 목록 (구현) |
| POST | `/groups/{groupId}/tasks` | MEMBER+ | 업무 등록·제안 (구현) |
| GET | `/tasks/{taskId}` | MEMBER+ | 업무 상세 (구현) |
| PATCH | `/tasks/{taskId}` | 조건부 | 제목·설명·우선순위·마감 수정 (구현) |
| POST | `/tasks/{taskId}/transitions` | 조건부 | 상태 전이 (구현) |
| PUT | `/tasks/{taskId}/assignee` | LEADER | 담당자 할당·변경 (구현) |
| GET | `/tasks/{taskId}/histories` | MEMBER+ | 상태 이력 (구현) |

상태 전이를 하나의 계약으로 모아 허용 규칙과 사유를 검증한다.

등록 시 `title`은 필수이며 `description`, `priority`, `dueAt`은 선택이다. 우선순위 기본값은 `NORMAL`이다. PERSONAL 그룹은 `TODO`와 요청자 담당으로, TEAM 그룹은 `REQUESTED`와 담당자 미지정으로 생성한다. `delayed`는 마감 시각과 현재 상태로 계산하며 DB에 별도 저장하지 않는다.

수정 요청은 변경할 `title`, `description`, `priority`, `dueAt`과 필수 `expectedVersion`을 보낸다. 설명의 빈 문자열은 삭제로, `clearDueAt: true`는 마감일 삭제로 처리한다. TEAM 업무는 `REQUESTED` 상태에서 요청자 또는 LEADER만 수정할 수 있고 PERSONAL 업무는 종료 전까지 본인이 수정할 수 있다.

```json
{
  "action": "HOLD",
  "reason": "외부 검토 결과 대기",
  "expectedVersion": 7
}
```

성공 응답은 변경된 `status`, `version`, `updatedAt`을 반환한다. 버전 충돌은 `409 Conflict`, 허용되지 않은 상태 전이는 `409`, 역할 부족은 `403`을 사용한다.

지원 action은 `ACCEPT`, `REJECT`, `START`, `HOLD`, `RESUME`, `COMPLETE`, `CANCEL`이다. `REJECT`, `HOLD`, `CANCEL`은 500자 이하 사유가 필수다. 팀장만 승인·반려·담당자 지정을 할 수 있고, 시작·보류·재개·완료는 현재 담당자만 가능하다. 요청자는 `REQUESTED` 상태의 본인 제안을 취소할 수 있으며 팀장은 모든 미종료 업무를 취소할 수 있다.

## Phase 4 체크리스트 API

| Method | Path | 권한 | 설명 |
|---|---|---|---|
| GET | `/tasks/{taskId}/checklist-items` | MEMBER+ | 정렬된 항목과 진행률 조회 (구현) |
| POST | `/tasks/{taskId}/checklist-items` | 담당자/LEADER | 항목 생성 (구현) |
| PATCH | `/checklist-items/{itemId}` | 담당자/LEADER | 내용·완료·순서 변경 (구현) |
| DELETE | `/checklist-items/{itemId}?expectedVersion={version}` | 담당자/LEADER | 항목 삭제 (구현) |

활성 그룹 멤버는 모두 조회할 수 있고 현재 담당자 또는 LEADER만 변경할 수 있다. `COMPLETED`, `REJECTED`, `CANCELLED` 업무는 읽기 전용이다. 생성 시 `content`는 필수이며 `sortOrder`를 생략하면 마지막 순서로 추가한다. 수정·삭제에는 항목의 `expectedVersion`을 보내며 오래된 버전은 `409 CHECKLIST_VERSION_CONFLICT`로 차단한다.

목록 응답은 `items`, `totalCount`, `completedCount`, `progressPercent`를 포함한다. 진행률은 `완료 항목 수 / 전체 항목 수 * 100`의 정수이며, 항목이 하나도 없으면 `progressPercent`는 `null`이다. 완료 처리 시 `completedByMemberId`와 `completedAt`을 기록하고 다시 미완료로 바꾸면 두 값을 비운다.

## Phase 4 댓글 API

| Method | Path | 권한 | 설명 |
|---|---|---|---|
| GET | `/tasks/{taskId}/comments` | MEMBER+ | 작성 시각순 댓글 조회 (구현) |
| POST | `/tasks/{taskId}/comments` | MEMBER+ | 댓글 작성 (구현) |
| PATCH | `/comments/{commentId}` | 작성자 | 댓글 내용 수정 (구현) |
| DELETE | `/comments/{commentId}?expectedVersion={version}` | 작성자 | 댓글 소프트 삭제 (구현) |

활성 그룹 멤버는 업무 상태와 관계없이 댓글을 조회·작성할 수 있다. 수정·삭제는 LEADER를 포함해 작성자 본인만 가능하며 `expectedVersion`으로 오래된 요청을 `409 COMMENT_VERSION_CONFLICT`로 차단한다. 댓글은 2,000자 이하의 빈 값이 아닌 문자열이다. 등록·수정 요청의 선택 `mentionedMemberIds`에는 최대 20명의 그룹 멤버 ID를 보낼 수 있다.

삭제 시 행과 작성자·작성 시각은 유지한다. 조회 응답은 삭제된 댓글의 원문 대신 `content: "삭제된 댓글입니다."`, `deleted: true`, `deletedAt`을 반환한다. 수정하지 않은 댓글의 `updatedAt`은 `null`이며, 삭제된 댓글은 다시 수정하거나 삭제할 수 없다.

멘션은 변경 가능한 닉네임이나 전역 사용자 ID 대신 해당 그룹의 `groupMemberId`로 입력한다. 서버는 같은 그룹의 현재 ACTIVE 멤버만 허용하고 중복 ID는 한 번만 저장한다. 댓글 수정 시 멘션 목록 전체를 교체하며, 응답의 `mentions`는 `id`, `memberId`, `userId`, 현재 `nickname`을 포함한다. 삭제된 댓글의 멘션 응답은 빈 배열이다.

### Phase 4 알림 API

| Method | Path | 권한 | 설명 |
|---|---|---|---|
| GET | `/notifications?size=20&cursor={id}` | 인증 사용자 | 최신순 내 알림 커서 페이지 조회 (구현) |
| PATCH | `/notifications/{id}/read` | 수신자 본인 | 단일 알림 읽음 처리 (구현) |
| PATCH | `/notifications/read-all` | 인증 사용자 | 내 미확인 알림 전체 읽음 처리 (구현) |

목록의 `size`는 1~50이며 응답은 `items`, `nextCursor`, `hasNext`, `unreadCount`를 포함한다. 커서는 마지막으로 받은 알림 ID이고 다음 요청은 그보다 작은 ID만 조회해 새 알림이 추가되어도 페이지가 겹치지 않는다. 다른 사용자의 알림 ID는 존재 여부를 숨기기 위해 `404 NOTIFICATION_NOT_FOUND`로 응답한다.

TEAM 업무 요청은 활성 LEADER, 담당자 지정은 해당 담당자, 완료는 요청자와 활성 LEADER, 반려·취소는 요청자에게 알린다. 댓글 등록은 담당자와 멘션 대상, 댓글 수정은 새로 추가된 멘션 대상에게 알린다. 모든 이벤트는 행위자 본인을 제외하며 사용자 ID 기준으로 수신자를 중복 제거한다. `(recipient_user_id, event_key)` 유일키가 같은 이벤트의 중복 저장도 차단한다.

알림 응답은 대상 `groupId`, `taskId`, 선택 `commentId`를 포함한다. 현재 화면은 알림을 읽음 처리한 뒤 `/tasks/{taskId}`로 이동하며 30초 간격으로 읽지 않은 개수를 갱신한다.

### Phase 5 캘린더 API

| Method | Path | 권한 | 설명 |
|---|---|---|---|
| GET | `/calendars/events?groupId=&from=&to=` | 활성 멤버 | 일정과 업무 마감 통합 조회 (구현) |
| POST | `/groups/{groupId}/calendar-events` | LEADER | 개인·그룹 일정 등록 (구현) |
| PATCH | `/calendar-events/{eventId}` | LEADER | 일정 수정과 버전 확인 (구현) |
| DELETE | `/calendar-events/{eventId}?expectedVersion=` | LEADER | 일정 삭제와 버전 확인 (구현) |

`from`, `to`는 `YYYY-MM-DD` 형식의 시작 포함·종료 미포함 날짜이며 최대 366일을 조회한다. `groupId`를 생략하면 사용자가 ACTIVE 멤버인 모든 개인·팀 그룹을 통합 조회하고, 지정하면 해당 그룹의 활성 멤버십을 확인한다.

일정 입력의 `startAt`, `endAt`은 선택한 그룹의 timezone 현지 시각이다. 서버는 DST 공백·중복 시각을 거부하고 UTC로 변환해 저장한다. 응답은 현지 `startAt`, `endAt`, `timezone`과 절대 시각 `startAtUtc`, `endAtUtc`를 함께 제공한다. 종료는 시작보다 늦어야 하며 종일 일정은 현지 자정부터 종료일 미포함 자정까지 입력한다.

TEAM 일정 변경은 기본 정책대로 LEADER만 가능하고 PERSONAL 그룹의 단일 LEADER는 본인 일정을 CRUD한다. `SCHEDULE`, `MEETING`, `VACATION`, `TODO`만 직접 저장하며 `DEADLINE`은 `tasks.due_at`에서 조회 시 합성한다. 따라서 업무 마감 변경·삭제는 별도 캘린더 행 동기화 없이 다음 조회에 즉시 반영된다. 일정 수정·삭제에는 `expectedVersion`이 필요하다.

### Phase 5 대시보드 API

| Method | Path | 권한 | 설명 |
|---|---|---|---|
| GET | `/dashboard/me` | 인증 사용자 | 활성 그룹의 내 담당 업무·일정·알림 통합 조회 (구현) |
| GET | `/groups/{groupId}/dashboard?from=&to=` | 공개 범위 허용 멤버 | 그룹 지표와 팀원별 현황 조회 (구현) |

개인 대시보드는 오늘 마감·현재 지연·진행 중·미확인 알림 수, 지연과 우선순위 기준 상위 담당 업무 10건, 그룹별 담당 현황, 향후 7일 일정 10건, 최근 알림 5건을 제공한다. 탈퇴·제거된 멤버십의 담당 업무는 통합 대상에서 제외한다.

그룹 대시보드는 그룹 timezone 기준 기본 최근 30일을 사용하고 `from` 포함·`to` 미포함 최대 366일 기간을 허용한다. `LEADER_ONLY` 그룹은 ACTIVE LEADER만 조회하며 MEMBER는 `403 DASHBOARD_FORBIDDEN`, 비멤버는 `404 GROUP_NOT_FOUND`다. 개인정보는 사용자 ID·그룹 멤버 ID·닉네임·그룹 역할만 제공한다.

지표 공식은 다음과 같다.

- 기간 완료율: 기간 내 생성되어 현재 `COMPLETED`인 업무 수 / 기간 내 생성 업무 수
- 기한 준수율: `completedAt <= dueAt`인 업무 수 / 마감일이 있는 완료 업무 수
- 흐름 진행률: `REQUESTED=0`, `TODO=25`, `IN_PROGRESS·ON_HOLD=50`, `COMPLETED=100` 가중치 평균이며 `REJECTED·CANCELLED`는 분모에서 제외
- 평균 완료 시간: 완료 업무별 `completedAt - createdAt` 분 단위 평균을 반올림한 시간
- 지연: 현재 현지 시각이 `dueAt` 이후이고 상태가 완료·반려·취소가 아닌 업무

분모가 0인 비율과 평균은 `null`로 반환해 `0%`와 구분한다. 원본 상태 건수와 분자·분모를 함께 반환한다. 그룹 업무 최신순 조회는 Flyway V12의 `(group_id, created_at, id)` 인덱스를 사용한다.

## Phase 5 이후 경로 기준

- 자료: `/groups/{groupId}/resources`, `/tasks/{taskId}/resources`
- 리포트: `/groups/{groupId}/reports`

## 계약 검증 원칙

- Controller 테스트는 HTTP 상태, 오류 코드, JSON 필드를 검증한다.
- application 테스트는 역할·소유자·상태 전이 규칙을 검증한다.
- 저장소 통합 테스트는 unique/FK/마이그레이션을 실제 DB 규칙으로 검증한다.
- 새 필드는 가능한 한 하위 호환으로 추가하고 제거·이름 변경은 API 버전 정책을 따른다.
