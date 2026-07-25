# ToTaskFlow Google OAuth 2.0 설정

## 저장소의 자리표시자

루트 `.env.example`에는 실제 비밀값 대신 아래 자리표시자만 둔다.

```properties
OAUTH2_GOOGLE_CLIENT_ID=googlecloudeconsole_id
OAUTH2_GOOGLE_CLIENT_SECRET=googlecloudeconsole_key
```

자리표시자는 연동 활성화 값으로 취급하지 않는다. 실제 값은 Git에 커밋하지 않고 로컬 `.env`, AWS Secrets Manager 또는 배포 비밀 저장소에만 설정한다. 클라이언트 보안 비밀은 브라우저 번들, 문서, 로그, 스크린샷에 노출하지 않는다.

## Google Cloud Console

OAuth 동의 화면의 앱 이름은 `ToTaskFlow`, 홈페이지는 `https://totaskflow.com`, 개인정보 처리방침은 `https://totaskflow.com/privacy`, 이용약관은 `https://totaskflow.com/terms`로 설정한다. 승인된 도메인에는 `totaskflow.com`을 등록하고 Search Console에서 도메인 소유권을 확인한다.

웹 애플리케이션 OAuth 클라이언트의 승인된 리디렉션 URI는 환경별로 정확히 일치해야 한다.

| 환경 | 승인된 리디렉션 URI |
| --- | --- |
| 로컬 | `http://localhost:5174/login/oauth2/code/google` |
| ngrok | `https://{고정-ngrok-도메인}/login/oauth2/code/google` |
| AWS QA | `https://qa.totaskflow.com/login/oauth2/code/google` |
| 도메인 사전 서비스·운영 | `https://totaskflow.com/login/oauth2/code/google` |

ngrok 주소가 바뀌면 Console의 URI도 바꿔야 한다. 운영과 QA는 OAuth 클라이언트를 분리하는 것을 권장한다.

요청 범위는 `openid`, `profile`, `email`뿐이다. 추가 Google API 권한이 필요해질 때는 기능과 개인정보 처리방침을 먼저 갱신하고 최소 범위만 별도로 검수한다.

## 구현된 가입·로그인 흐름

1. 기존 Google 연결 계정은 인증 성공 후 바로 로그인한다.
2. 신규 Google 계정은 즉시 사용자로 만들지 않고 10분짜리 일회성 가입 요청을 생성한다. 완료·취소 시 즉시 삭제하고 만료 요청은 기본 15분 주기로 파기한다.
3. 원문 가입 토큰은 `HttpOnly`, `SameSite=Lax` 쿠키에만 두고 DB에는 SHA-256 해시만 저장한다.
4. `/oauth/consent`에서 이용약관, 개인정보 수집·이용, 만 14세 이상을 필수로 받고 업무 알림·마케팅은 각각 선택으로 받는다.
5. 필수 동의가 완료된 뒤에만 사용자, 개인 그룹, Google 연결과 동의 이력을 한 트랜잭션에서 생성한다.
6. Google의 확인된 이메일만 신규 가입에 사용한다. 같은 이메일의 기존 계정이 있으면 자동 연결하지 않는다.
7. Google 비밀번호와 Google 액세스·리프레시 토큰은 ToTaskFlow DB에 저장하지 않는다.

## 활성화와 점검

실제 비밀 저장소에 두 값을 설정하고 서버를 재시작한다. 로그인 화면의 Google 버튼이 활성화되는지, 신규 사용자가 동의 화면으로 이동하는지, 동의를 취소하거나 10분이 지나면 가입할 수 없는지 확인한다.

- 필수 항목을 거부하면 계정이 생성되지 않는다.
- 선택 항목 `false`도 동의 이력에 정책 버전과 함께 남는다.
- 재사용한 가입 요청은 거부된다.
- 실패 URL, 서버 로그, 브라우저 저장소에 토큰·이메일이 출력되지 않는다.
- 운영에서는 `AUTH_SECURE_COOKIE=true`와 HTTPS를 사용한다.

Google 공식 참고 문서:

- [OAuth 2.0 웹 서버 애플리케이션](https://developers.google.com/identity/protocols/oauth2/web-server)
- [OAuth 동의 화면 브랜딩](https://support.google.com/cloud/answer/15549049?hl=en)
- [OAuth 앱 검증 준비](https://support.google.com/cloud/answer/13464321?hl=en)
- [승인된 도메인 소유권 확인](https://support.google.com/cloud/answer/13804266?hl=en)
