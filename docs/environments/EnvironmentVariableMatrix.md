# 환경 변수 매트릭스

`값`은 문서 예시이며 실제 비밀값을 이 파일에 기록하지 않는다. 빈칸은 배포 승인을 받을 수 없다.

| 변수 | 1 로컬 | 2 ngrok | 3 AWS QA | 4 도메인 사전 | 5 운영 |
| --- | --- | --- | --- | --- | --- |
| `FRONTEND_URL` | localhost | ngrok HTTPS | QA HTTPS | 실제 테스트 origin | 운영 origin |
| `VITE_PUBLIC_SITE_URL` | localhost | ngrok HTTPS | QA HTTPS | 실제 테스트 origin | 운영 origin |
| `VITE_ALLOW_INDEXING` | false | false | false | false | true |
| `AUTH_SECURE_COOKIE` | false | true | true | true | true |
| `SERVER_FORWARD_HEADERS_STRATEGY` | 기본 | framework | framework | framework | framework |
| `SPRING_DATASOURCE_URL` | 로컬 DB | 로컬 DB | QA DB | 사전 DB | 운영 DB |
| `SPRING_JPA_HIBERNATE_DDL_AUTO` | validate | validate | validate | validate | validate |
| `JWT_SECRET` | 로컬 전용 | 로컬 전용 | QA secret | 사전 secret | 운영 secret |
| `MAIL_ENABLED` | false | 선택 | QA | true | true |
| `MAIL_FROM` | local | 테스트 | QA 주소 | 실제 도메인 | 운영 주소 |
| OAuth key | disabled/개발 | 개발 | QA 앱 | 운영 후보 앱 | 운영 앱 |
| `UPLOAD_LOCAL_ROOT` | 로컬 | 로컬 | QA EBS | 사전 저장소 | 운영 저장소 |
| Toss key | 테스트 | 테스트 | 테스트 | 운영상점 테스트 | 운영 |
| `PAYMENT_ENCRYPTION_KEY_BASE64` | 로컬 | 로컬 | QA | 사전 | 운영 전용 |
| `TOSS_TEST_MODE` | true | true | true | true | false |
| `DEMO_ENABLED` | true | 임시 | 선택 | 정책 결정 | 선택 |
| Search Console token | 없음 | 없음 | 없음 | 선택 | 운영 토큰 |
| 개인정보 문의 | local | 테스트 | QA | 실제 담당자 | 실제 담당자 |

## 비밀값 등급

### 공개 가능

- `VITE_PUBLIC_SITE_URL`
- `VITE_API_BASE_URL`
- Toss client key
- Search Console verification meta token
- 공개 사업자 정보

### 서버 전용

- DB 비밀번호
- `JWT_SECRET`
- OAuth client secret
- SMTP 비밀번호
- Toss secret key
- `PAYMENT_ENCRYPTION_KEY_BASE64`

서버 전용 값은 프런트 코드, `VITE_` 변수, 로그, 오류 응답, Git 문서에 넣지 않는다.

## 단계별 키 분리

같은 종류의 키라도 최소한 `local`, `qa`, `preproduction`, `production`을 구분한다. 운영키가 비운영 환경에서 사용된 경우 즉시 노출 사고로 취급해 폐기·재발급하고 접근 로그를 확인한다.
