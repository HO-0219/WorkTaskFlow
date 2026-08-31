# Gearvia (기어비아) — AI 기반 협업 업무 관리 PWA

업무 요청·승인·담당·협업·프로젝트·리포트와 AI 실행 비서를 한 흐름으로 연결하는 팀 업무관리 서비스입니다.

`Gear + Via`의 합성어로, 업무와 구성원이 톱니처럼 맞물려 움직이고 요청부터 실행·보고까지 하나의 경로로 연결된다는 의미를 담았습니다.

- 브랜드 이름: **Gearvia**
- 저장소 이름: `WorkTaskFlow`
- 운영 도메인: `https://totaskflow.com`
- 백엔드 패키지 루트: `com.teamproject` / 기준 DB 이름: `teamProject`

로컬 MySQL을 기준으로 인증, 그룹·멤버십, 업무, 프로젝트·이슈, 협업 채팅, 알림, 캘린더, 파일 자원, 구독·결제, 리포트, AI 비서를 제공하는 팀 프로젝트입니다. 단일 Spring Boot 애플리케이션(모놀리식) + React SPA로 구성하고, 배포는 단일 EC2에 Docker Compose로 올립니다.

개발 순서, 환경별 체크리스트, 로컬 QA 절차 등 운영 세부 문서는 공개 저장소에 포함하지 않고 로컬 문서로 관리합니다. 실제 환경변수와 자격 증명은 커밋하지 않으며, `.env.example`에는 이름과 예시값만 둡니다. `.md`/`.txt` 파일은 CI(`repository-safety`)에서 `README.md`, `infra/GITHUB_ACTIONS_SECRETS_SETUP.md`, `.env.example`만 허용하므로 새 문서는 다른 확장자로 두거나 로컬 관리합니다.

## 핵심 기능

### 인증 · 계정
- 아이디/비밀번호 회원가입·로그인, 회원가입 이메일 인증(6자리 코드)
- 아이디 찾기(가입 이메일 안내), 비밀번호 찾기(일회용 재설정 링크)
- JWT access token + 회전식 HttpOnly refresh token, PWA용 슬라이딩(유휴/절대 만료) 세션과 디바이스 메타데이터 기록
- 로그아웃 / 전체 로그아웃(모든 세션 폐기), 세션 목록 조회·개별 폐기
- Google·Kakao OAuth 2.0 로그인. 신규 소셜 사용자는 인증 직후 계정을 만들지 않고 별도 동의 화면을 거침
- 프로필 조회·수정, 비밀번호 변경(전체 refresh token 폐기), 재인증 후 탈퇴·개인정보 익명화

계정 존재 여부는 아이디/비밀번호 찾기 API 응답으로 노출하지 않습니다. 같은 이메일의 일반 계정과 소셜 계정도 자동 연결하지 않습니다.

### 그룹 · 멤버십
- PERSONAL(개인) 그룹과 TEAM 그룹, 그룹별 LEADER/MEMBER 역할
- 이메일 초대, 초대 링크, 참여 코드(해시 저장) 기반 가입
- 멤버 역할 변경·내보내기·본인 탈퇴, 그룹 이미지

### 업무 · 협업
- 업무 등록·제안, 상태 이력, 체크리스트, 댓글(수정 이력·소프트 삭제), 같은 그룹 멤버 멘션
- PERSONAL 그룹 업무는 생성 즉시 `TODO`이며 요청자가 담당자, TEAM 그룹 업무는 담당자 없이 `REQUESTED`로 시작
- LEADER 승인·반려·담당자 지정, 담당자 시작·보류·재개·완료, 담당자 변경 요청·승인
- 업무 리마인더, 업무 활동 이벤트 기록

### 프로젝트
- 그룹 내 프로젝트, 프로젝트 이슈 플로우(이슈·체크리스트·이미지), 프로젝트 문서(업로드·링크)
- 업무-프로젝트 연결, 긴급 이슈 등록·상태 관리

### 실시간 채팅
- 그룹 채팅 채널, WebSocket(`/ws/chat`) 기반 실시간 메시지, 소켓 티켓 발급
- 무료/유료 등급별 메시지 보존 기간과 채널 수 제한

### 알림 · 캘린더 · 대시보드
- 최신순 커서 페이지 알림, 읽음/전체 읽음, Web Push(VAPID) 구독
- 개인·그룹 일정과 업무 마감 통합 캘린더(버전 확인 수정·삭제)
- 내 담당 업무·일정·알림 통합 개인 대시보드, 공개 범위가 허용된 그룹 지표 대시보드

### 파일 자원
- 그룹 파일시스템 뷰, 파일 업로드·링크 자원, 업무별 자원 첨부, 다운로드
- 등급별 그룹 저장 용량 한도(`GROUP_FREE_STORAGE_BYTES` / `GROUP_PAID_STORAGE_BYTES`)

### 구독 · 결제
- 팀 구독(체험 → 유료), 토스페이먼츠 연동(테스트 키·`TOSS_TEST_MODE=true` 고정)
- 결제 수단 등록·테스트 결제, 청구 하드닝, 연체(dunning) 상태, 저장 빌링키 암호화
- 로컬에서 등급 전환을 시험하는 `membership/test-plan` 스위치(`MEMBERSHIP_TEST_SWITCH_ENABLED`)

### 리포트
- 주간 목표(weekly objective), 그룹 주간 리포트 편집 라이프사이클, 리포트 다운로드·전달 이력
- AI 주간 리포트: 스냅샷 → 정책 → 구조화 출력 → 검증/복구 → 폴백 → 리비전 (`AI_REPORT_ENABLED`)
- 메일 발송·재시도 크론(`REPORT_MAIL_CRON`, `REPORT_RETRY_CRON`)

### AI 실행 비서
- 대화형 비서: context → tool → RAG → 인용(quoted_text) 흐름, 메시지 영속화·보존 기간
- 그룹 자료와 프로젝트 문서를 임베딩 색인해 검색(RAG), 자동 색인 실패분 주기적 재시도, 삭제 자료 즉시 검색 제외, 임베딩 모델 교체 시 재색인
- 비서가 제안한 실행 액션은 **명시적 사용자 승인(confirm/cancel) 후에만** 도메인에 반영

### 관리자(Admin)
- 운영용 admin 화면은 별도 프런트엔드 앱(포트 19091)으로 분리하고 격리 TLS 리스너로 노출
- QR 기반 MFA 등록(복구 코드 없음), 감사 로그, 사용자 상태 관리, 결제/구독/리포트 운영 조회
- `ADMIN_ENABLED`, `ADMIN_ALLOWED_IPS`, `ADMIN_MFA_ENCRYPTION_KEY_BASE64` 등으로 제어

### 플랫폼
- Flyway 기반 DB 스키마 버전 관리 + Hibernate `validate`
- PWA(설치·오프라인 앱 셸), 개발 서버에서는 Service Worker 미등록
- SMTP 발송은 best-effort. 외부 메일 장애가 나도 이메일 인증·비밀번호 재설정 토큰과 그룹 초대 저장은 롤백하지 않으며, 실패 로그는 수신자를 마스킹하고 본문·토큰을 남기지 않음. 로컬 MVP에는 자동 재시도·Outbox가 없어 사용자가 다시 요청해야 함

## 아키텍처

Spring Boot 3.3 / Java 21 모놀리식 + React 18 / Vite SPA. Nginx가 정적 자산 서빙과 `/api`·`/ws/chat` 리버스 프록시, TLS를 담당합니다.

### 백엔드 패키지 경계

```text
com.teamproject
├── TeamProjectApplication.java  # 최상위 Spring Boot 스캔 루트
├── user/            # User 데이터와 계정 생명주기
├── authentication/  # 가입·로그인·복구·세션·OAuth(도메인/토큰 포함)
├── authorization/   # 공개/보호 API 경계와 역할·멤버십 정책, SecurityConfig
├── jwt/             # Access JWT 발급·검증·Bearer 필터
├── group/           # 개인·팀 그룹, 멤버십, 초대·초대링크·참여코드
├── task/            # 업무·상태 이력·체크리스트·리마인더·담당자 변경
├── comment/         # 업무 댓글·수정 이력·멘션
├── project/         # 프로젝트·이슈 플로우·프로젝트 문서·긴급 이슈
├── chat/            # 그룹 채팅 채널·메시지·WebSocket
├── notification/    # 알림·Web Push 구독
├── calendar/        # 개인·그룹 일정과 업무 마감 통합
├── dashboard/       # 개인·그룹 대시보드 집계
├── resource/        # 그룹 파일시스템·업로드·링크 자원
├── subscription/    # 팀 구독·체험·등급·연체 상태
├── payment/         # 토스페이먼츠 결제 수단·결제·빌링키
├── report/          # 주간 목표·리포트 편집 라이프사이클·AI 주간 리포트
├── assistant/       # AI 실행 비서·RAG 색인·실행 액션 승인
├── admin/           # 운영 admin API·MFA·감사 로그
└── common/          # 공통 예외·API 오류·헬스체크·스케줄러
```

Refresh Token은 JWT가 아닌 난수 기반 세션 토큰이므로 `authentication` 하위 토큰 영역에 둡니다. `/api/v1/auth/**`, DB 테이블, JWT Claim, Refresh Cookie 계약은 유지합니다.

### 프런트엔드 경계

```text
frontend/src
├── app/                  # 라우팅과 홈 조합
├── api/                  # HTTP client와 도메인별 API
├── features/auth/        # 로그인·가입·복구·OAuth 화면과 인증 UI
├── features/user/        # 프로필·계정 설정
├── features/group/       # 그룹 목록·생성·멤버·초대 UI
├── features/task/        # 업무 등록·목록·상세·체크리스트·댓글 UI
├── features/project/     # 프로젝트·이슈·문서 UI
├── features/chat/        # 그룹 실시간 채팅 UI
├── features/calendar/    # 캘린더 UI
├── features/notification/# 알림 목록·푸시 구독 UI
├── features/dashboard/   # 개인·그룹 대시보드 UI
├── features/resource/    # 그룹 파일시스템 UI
├── features/subscription/# 구독·등급 UI
├── features/payment/     # 결제 수단·결제 UI
├── features/report/      # 주간 목표·리포트 UI
├── features/assistant/   # AI 비서 대화·실행 승인 UI
├── features/admin/       # 운영 admin 화면(admin 모드 빌드 전용)
└── main.tsx              # 애플리케이션 진입점
```

의존 방향은 `app → features → api`이며, API 계층은 화면이나 라우팅을 참조하지 않습니다. admin 화면은 `--mode admin` 빌드에서만 노출합니다.

시스템 아키텍처 다이어그램: [docs/gearvia-overall-architecture.mmd](docs/gearvia-overall-architecture.mmd) (`.svg` 동봉).

## 로컬 실행

필요 환경: Java 21, Node.js 20 이상, 로컬 MySQL 8.x (또는 Docker). Maven은 Wrapper가 자동으로 준비합니다.

```bash
cp .env.example .env
# .env에서 최소한 아래 값을 로컬 값으로 교체
#   SPRING_DATASOURCE_USERNAME / SPRING_DATASOURCE_PASSWORD
#   MYSQL_ROOT_PASSWORD
#   JWT_SECRET (64바이트 이상 임의값: openssl rand -base64 64)
```

### DB 준비

옵션 A — 로컬 MySQL에 직접 생성:

```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS teamProject CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

옵션 B — Docker로 MySQL만 띄우기:

```bash
docker compose up -d mysql
```

### 백엔드 · 프런트엔드

```bash
cd backend
./mvnw spring-boot:run
```

다른 터미널에서:

```bash
cd frontend
npm ci
npm run dev
```

- 프런트엔드: http://localhost:5174
- 백엔드: http://localhost:8081
- 헬스 체크: http://localhost:8081/api/v1/health (준비 확인: `/api/v1/health/ready`)

루트의 `.env`를 Spring Boot와 Vite가 함께 사용합니다. 개발 기준 DB는 `localhost:3306/teamProject`. 이메일 발송은 꺼져 있어 인증번호·비밀번호 재설정·그룹 초대 링크가 백엔드 로그의 `[LOCAL MAIL]`에 출력됩니다. 그룹 초대 링크 기본 만료는 `GROUP_INVITATION_HOURS`(기본 72시간)로 조정합니다.

### PWA 확인 (배포용 로컬 빌드)

개발 서버에서는 캐시 간섭을 피하려고 Service Worker를 등록하지 않습니다. 설치·업데이트·오프라인 동작은 빌드로 확인합니다.

```bash
cd frontend
npm run build
npm run preview   # http://localhost:5174
```

앱 셸 정적 파일만 캐시하고 `/api` 응답은 캐시하지 않습니다. 오프라인에서는 저장된 화면과 연결 안내만 보이며 조회·등록·수정은 온라인 복귀 후 사용합니다. 처음부터 다시 확인하려면 개발자 도구에서 사이트 데이터를 삭제하고 새로고침합니다.

### 관리자(admin) 앱

```bash
cd frontend
npm run dev:admin       # http://localhost:19091 (또는 npm run preview:admin)
```

`ADMIN_ENABLED=true`와 `ADMIN_ALLOWED_IPS`, `ADMIN_MFA_ENCRYPTION_KEY_BASE64`를 설정해야 백엔드 admin API가 열립니다.

### 로컬 시연 데이터

로컬 `teamProject` DB에 재현 가능한 시연 계정과 협업 데이터를 만들거나 초기 상태로 되돌립니다.

```bash
cd backend
./scripts/seed-demo-data.sh
```

계정, 공통 비밀번호와 권장 발표 순서는 로컬 QA 문서를 참고합니다. 스크립트는 로컬 개발 DB만 허용하며 일반 사용자 데이터는 삭제하지 않습니다. `DEMO_ENABLED` / `DEMO_USERNAME`로 데모 세션 로그인을 제어합니다.

## `.env` 설정

**`.env.example`이 항상 최신 기준입니다.** `replace-with-...` / `disabled` / 빈 값은 로컬 값으로 바꿔야 하며, 아래는 주요 그룹만 정리한 것입니다.

| 그룹 | 키(발췌) | 비고 |
|---|---|---|
| DB | `SPRING_DATASOURCE_URL/USERNAME/PASSWORD`, `MYSQL_DATABASE`, `MYSQL_ROOT_PASSWORD`, `SPRING_JPA_HIBERNATE_DDL_AUTO=validate` | 로컬은 `localhost:3306/teamProject` |
| 서버 | `SERVER_PORT=8081`, `FRONTEND_URL`, `VITE_API_BASE_URL=/api/v1`, `APP_ENVIRONMENT`, `LOG_FILE` | |
| JWT / 세션 | `JWT_SECRET`(64바이트+), `JWT_ACCESS_SECONDS`, `JWT_REFRESH_SECONDS`, `JWT_PWA_REFRESH_IDLE/ABSOLUTE_SECONDS`, `AUTH_SECURE_COOKIE` | 운영은 `AUTH_SECURE_COOKIE=true` |
| 메일 | `MAIL_ENABLED`, `MAIL_HOST/PORT`, `MAIL_SMTP_AUTH`, `MAIL_STARTTLS`, `MAIL_USERNAME/PASSWORD`, `MAIL_FROM` | Gmail은 앱 비밀번호 |
| Web Push | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | `npx web-push generate-vapid-keys` |
| OAuth | `OAUTH2_GOOGLE_CLIENT_ID/SECRET`, `OAUTH2_KAKAO_CLIENT_ID/SECRET`, `OAUTH_SIGNUP_CLEANUP_MS` | 자리표시자면 해당 버튼 비활성화 |
| 업로드 / 스토리지 | `UPLOAD_LOCAL_ROOT`, `UPLOAD_MAX_FILE_SIZE`, `UPLOAD_MAX_REQUEST_SIZE`, `STORAGE_PROVIDER`, `GROUP_FREE/PAID_STORAGE_BYTES` | |
| 결제 / 구독 | `TOSS_CLIENT_KEY`(`test_ck_`/`test_gck_`), `TOSS_SECRET_KEY`(`test_sk_`/`test_gsk_`), `PAYMENT_ENCRYPTION_KEY_BASE64`(32바이트), `TOSS_TEST_MODE=true`, `SUBSCRIPTION_LIVE_BILLING_ENABLED=false`, `SUBSCRIPTION_TRIAL_DAYS`, `SUBSCRIPTION_TEAM_MONTHLY_PRICE`, `SUBSCRIPTION_PAYMENT_GRACE_DAYS` | 라이브 청구는 항상 off 고정 |
| 채팅 | `CHAT_FREE_RETENTION_DAYS`, `CHAT_PAID_RETENTION_DAYS`, `CHAT_PAID_CHANNEL_LIMIT` | |
| 관리자 | `ADMIN_ENABLED`, `ADMIN_PORT`, `ADMIN_ALLOWED_IPS`, `ADMIN_TRUSTED_PROXIES`, `ADMIN_MFA_ENCRYPTION_KEY_BASE64`, `ADMIN_FRONTEND_URL`, `VITE_ADMIN_PORT` | |
| 리포트 / AI | `REPORT_MAIL_CRON`, `REPORT_RETRY_CRON`, `AI_REPORT_ENABLED`, `OPENAI_API_KEY`, `OPENAI_MODEL`, `AI_ASSISTANT_ENABLED`, `AI_ASSISTANT_MODEL`, `AI_ASSISTANT_EMBEDDING_MODEL`, `AI_ASSISTANT_MESSAGE_RETENTION_DAYS`, `AI_ASSISTANT_AUTO_INDEX_RETRY_CRON` | 키 없으면 AI 기능만 비활성 |
| 데모 / 스위치 | `DEMO_ENABLED`, `DEMO_USERNAME`, `MEMBERSHIP_TEST_SWITCH_ENABLED`, `CALENDAR_REJECTED_TASK_RETENTION_HOURS` | 로컬/QA 전용 |
| 프런트 공개 | `VITE_PUBLIC_SITE_URL`, `VITE_ALLOW_INDEXING` | |

실제 `.env`는 Git에 포함하지 않습니다.

## DB 마이그레이션

새 로컬 MySQL DB에서는 Flyway가 순서대로 스키마를 만든 뒤 Hibernate가 엔티티와 스키마를 `validate`합니다. 버전 구간 요약:

| 구간 | 내용 |
|---|---|
| V1 | 인증 스키마 기준선 |
| V2–V3 | 사용자 프로필 확장·탈퇴 |
| V4–V5 | 그룹·멤버십·초대 (V4는 기존 사용자 PERSONAL 그룹 보충) |
| V6–V9 | 업무·상태 이력·체크리스트·댓글·멘션 |
| V10–V11 | 알림·캘린더 |
| V12–V13 | 대시보드·리마인더 인덱스 |
| V14–V17 | 그룹 초대 링크·참여 코드(해시)·리포트 다운로드 |
| V18–V19 | 댓글 수정 이력·그룹 이미지 |
| V20–V23 | 결제 연동·사용자 동의·OAuth 가입 요청·그룹 유료 기간 |
| V24–V25 | 슬라이딩 refresh 세션·디바이스 메타데이터 |
| V26–V27 | 자원·구독·리포트 스케줄·연체(dunning) 상태 |
| V28 | 관리자 MFA·감사 로그 |
| V29 | `personal_spaces` → `personal_schedules` 리네임 |
| V30 | Web Push 구독 |
| V31–V35 | 리포트·업무 활동 이벤트·리포트 컨텍스트/편집 라이프사이클·AI 주간 리포트 리비전 |
| V36–V37 | 구독 청구·업무 리마인더 하드닝 |
| V38–V39 | AI 비서 실행 액션·메시지 영속화 |
| V40–V44 | 프로젝트·이슈 플로우·프로젝트 문서·그룹 채팅·업무-프로젝트 연결 |
| V45 | 긴급 이슈·담당자 변경 요청 |
| V46–V48 | AI 문서 청크(RAG) 및 프로젝트 문서 색인·관리자 MFA 복구 코드 제거 |

규칙:

- 앞으로 DB 변경은 `V49__...sql`처럼 새 migration을 추가한다. 이미 공유·실행된 migration은 수정하지 않는다.
- Hibernate `update`로 이미 테이블을 만든 로컬 DB만 최초 1회 `SPRING_FLYWAY_BASELINE_ON_MIGRATE=true`로 실행해 현재 스키마를 version 1로 등록한다. 현재 개발 DB는 등록 완료됐고 기본값도 `false`이므로 계속 끈 상태로 둔다.
- MySQL 통합 테스트는 개발 DB 보호를 위해 반드시 전용 `teamProject_test` DB에서 실행한다. 아래 스크립트가 DB를 만들고 테스트 URL을 분리한다(`create-drop`이므로 루트 `.env`의 `teamProject` URL을 `-Dspring.datasource.url`로 직접 넘기면 안 된다).

```bash
cd backend
./scripts/test-mysql.sh
```

## 소셜 로그인 설정

`.env`의 자리표시자를 실제 비밀 저장소 값으로 교체하면 로그인 화면의 Google·Kakao 버튼이 활성화됩니다.

```properties
OAUTH2_GOOGLE_CLIENT_ID=실제_클라이언트_ID
OAUTH2_GOOGLE_CLIENT_SECRET=실제_클라이언트_보안_비밀
OAUTH2_KAKAO_CLIENT_ID=실제_REST_API_키
OAUTH2_KAKAO_CLIENT_SECRET=실제_클라이언트_보안_비밀
```

개발 Redirect URI:

- Google: `http://localhost:5174/login/oauth2/code/google`
- Kakao: `http://localhost:5174/login/oauth2/code/kakao`

신규 소셜 사용자는 인증 직후 계정을 만들지 않고 별도 동의 화면(`/api/v1/auth/oauth-signup`)을 거칩니다. 운영 배포 시 `https://totaskflow.com/login/oauth2/code/{google|kakao}`를 정확히 등록하고 `FRONTEND_URL`, `AUTH_SECURE_COOKIE=true`, 강한 `JWT_SECRET`을 반드시 설정하세요.

## 배포

Docker Compose 기반. 단일 EC2에 Nginx(TLS) + Spring Boot + MySQL 8.4 + Certbot을 올리고, GitHub Actions가 애플리케이션만 배포합니다(인프라는 생성·변경하지 않음).

- CI: [.github/workflows/ci.yml](.github/workflows/ci.yml) — `pull_request` / `main` push에서 실행, `repository-safety`(추적 금지 파일·시크릿 패턴 스캔) → backend/frontend 빌드·테스트
- 배포: [.github/workflows/deploy-single-ec2.yml](.github/workflows/deploy-single-ec2.yml) — CI 성공 후(또는 `workflow_dispatch`) GHCR에 `sha-<commit>` 태그로 backend/web 이미지 빌드 → SSH로 `/opt/totaskflow`에 설정 업로드 → MySQL → Spring Boot → Nginx 순 상태 확인 → Certbot 발급·갱신 → `https://totaskflow.com` 공개 health check
- 인프라 자산: [infra/single-ec2/](infra/single-ec2/) (compose·nginx 템플릿·인증서 갱신 systemd timer), [infra/nginx/](infra/nginx/)
- 필요한 GitHub Actions Variables/Secrets 목록과 EC2·DNS·HTTPS 준비 절차: [infra/GITHUB_ACTIONS_SECRETS_SETUP.md](infra/GITHUB_ACTIONS_SECRETS_SETUP.md)

로컬에서 운영 구성을 재현하려면:

```bash
docker compose -f infra/docker-compose.production-local.yml up -d --build
```

백엔드만 별도 패키징:

```bash
cd backend
./mvnw clean package
java -jar target/auth-api-0.0.1-SNAPSHOT.jar
```

`.env`에는 비밀번호·비밀키가 들어가므로 `.gitignore`에서 계속 제외합니다. EC2에는 Git으로 올리지 말고 GitHub Actions Secrets로 전달해 서버 전용 환경 파일로 관리하세요. 토스페이먼츠는 테스트 키와 `TOSS_TEST_MODE=true`, `SUBSCRIPTION_LIVE_BILLING_ENABLED=false`로만 실행합니다. 3306·8081·19091·19092 포트는 외부에 열지 않습니다.

## 주요 API

기준 경로는 `/api/v1`. 전체·정확한 계약은 `backend/src/main/java/com/teamproject/**/*Controller.java`가 기준이며, 아래는 도메인별 대표 엔드포인트입니다.

### 인증 · 사용자 (`/auth`, `/auth/oauth-signup`, `/users/me`)
`POST /auth/email-verifications`(+`/confirm`), `POST /auth/signup`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `POST /auth/logout-all`, `POST /auth/username-reminders`, `POST /auth/password-resets`(+`/confirm`), `GET /auth/providers`, `GET /auth/me`, `GET|PATCH /users/me`, `PUT /users/me/password`, `DELETE /users/me`, `GET /users/me/sessions`, `DELETE /users/me/sessions/{sessionId}`

### 그룹 (`/groups`, `/group-invitations`)
`GET|POST /groups`, `GET|PATCH /groups/{groupId}`, `GET /groups/{groupId}/members`, 역할 변경·내보내기·본인 탈퇴, `POST|GET /groups/{groupId}/invitations`·`invite-links`·`join-code`, `POST /group-invitations/{token}/accept`, `POST /groups/{groupId}/join`

### 업무 · 댓글 · 체크리스트
`GET|POST /groups/{groupId}/tasks`, `GET|PATCH /tasks/{taskId}`, `POST /tasks/{taskId}/transitions`, `PUT /tasks/{taskId}/assignee`(+`/me`), `GET /tasks/{taskId}/histories`, `GET|POST /tasks/{taskId}/checklist-items`·`PATCH|DELETE /checklist-items/{itemId}`, `GET|POST /tasks/{taskId}/comments`·`PATCH|DELETE /comments/{commentId}`, `POST /tasks/{taskId}/assignee-change-requests`

### 프로젝트 · 긴급 이슈
`GET|POST /groups/{groupId}/projects`, `GET|PUT|DELETE /projects/{projectId}`, `GET|POST /projects/{projectId}/issues`·`PUT|DELETE /project-issues/{issueId}`, `POST /project-issues/{issueId}/checklist`, `GET|POST /projects/{projectId}/documents`(+`/links`)·`download`, `GET|POST /groups/{groupId}/emergency-issues`·`PATCH /emergency-issues/{issueId}/status`

### 채팅 (`/groups/{groupId}/chat`, `/chat`, `ws://.../ws/chat`)
`GET|POST /groups/{groupId}/chat/channels`, `GET|POST /chat/channels/{channelId}/messages`, `GET /chat/messages/{messageId}/content`, `POST /chat/socket-tickets`

### 알림 · 캘린더 · 대시보드
`GET /notifications`, `PATCH /notifications/{id}/read`, `PATCH /notifications/read-all`, `GET|POST|DELETE /push-subscriptions`, `GET /calendars/events`, `POST /groups/{groupId}/calendar-events`·`PATCH|DELETE /calendar-events/{eventId}`, `GET /dashboard/me`, `GET /groups/{groupId}/dashboard`

### 파일 자원
`GET /groups/{groupId}/resources`, `POST /groups/{groupId}/resources/links`, `GET /tasks/{taskId}/resources`, `GET /resources/{resourceId}/download`, `DELETE /resources/{resourceId}`

### 구독 · 결제
`GET /groups/{groupId}/subscription`, `POST .../subscription/trial`·`/activate`·`/cancel`·`/conversion-choice`, `GET|POST /payments/methods`·`POST /payments/methods/{methodId}/test-charge`, `GET /payments/payments`, `PUT /groups/{groupId}/membership/test-plan`

### 리포트
`GET|POST /groups/{groupId}/weekly-objectives`·`PATCH|DELETE /weekly-objectives/{objectiveId}`, `GET|PUT /tasks/{taskId}/weekly-objective`, `GET /groups/{groupId}/reports/me`, `GET /groups/{groupId}/reports/{reportId}`, `POST /groups/{groupId}/reports/access`, `GET /groups/{groupId}/reports/ai-weekly/...`

### AI 비서 (`/assistant`)
`GET|POST /assistant/messages`, `POST /assistant/actions/{actionId}/confirm`·`/cancel`, `POST /assistant/documents/reindex`

### 관리자 (`/admin`, `/admin/mfa`)
`GET /admin/overview`·`/audit-logs`·`/users`·`/payments`·`/subscriptions`·`/report-deliveries`, `PATCH /admin/users/{userId}/status`, `POST /admin/mfa/setup`·`/activate`, `GET /admin/mfa/status`

### 헬스
`GET /api/v1/health`, `GET /api/v1/health/ready`

## 다음 개발 기준 / 배포 전 체크리스트

- 이메일 템플릿, 로그인·재설정 요청 IP 제한, 감사 로그 범위, 비밀키 저장소를 팀 운영 환경에 맞게 보강
- `AUTH_SECURE_COOKIE=true`, 강한 `JWT_SECRET`, `SPRING_JPA_HIBERNATE_DDL_AUTO=validate`, `SPRING_FLYWAY_BASELINE_ON_MIGRATE=false` 고정
- 결제는 테스트 모드 고정(`TOSS_TEST_MODE=true`, `SUBSCRIPTION_LIVE_BILLING_ENABLED=false`)
- MySQL 데이터·`uploads`·`letsencrypt` 볼륨 정기 백업·복원 테스트
- 로컬 브라우저 검증 순서는 공개 저장소에 포함되지 않는 로컬 QA 체크리스트를 따름
