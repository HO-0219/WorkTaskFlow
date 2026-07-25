# 2단계: 로컬 + ngrok 테스트 QA

## 목적

로컬 서버를 임시 HTTPS 주소로 노출해 모바일 기기, PWA 설치, 외부 OAuth 리다이렉트와 결제 테스트 화면을 확인한다.

## 시작

백엔드와 프런트를 로컬에서 실행한 뒤 프런트 포트만 터널로 연결한다.

```bash
ngrok http 5174
```

## 수정할 정보

| 항목 | ngrok 값 |
| --- | --- |
| `FRONTEND_URL` | `https://발급주소.ngrok-free.app` |
| `VITE_PUBLIC_SITE_URL` | 같은 ngrok HTTPS 주소 |
| `AUTH_SECURE_COOKIE` | `true` |
| `SERVER_FORWARD_HEADERS_STRATEGY` | `framework` |
| `VITE_ALLOW_INDEXING` | `false` |
| `MAIL_ENABLED` | 기본 `false`; 외부 메일 시험 시 테스트 계정만 `true` |
| `TOSS_TEST_MODE` | `true` |
| `DEMO_ENABLED` | 필요한 시간에만 `true` |

환경값을 변경한 뒤 백엔드를 재시작하고, `VITE_` 값이 바뀌었으면 프런트도 다시 시작하거나 빌드한다.

## 외부 콘솔 수정

- Google Redirect URI: `https://발급주소/login/oauth2/code/google`
- Kakao Redirect URI: `https://발급주소/login/oauth2/code/kakao`
- Toss Payments 성공·실패·리다이렉트 주소를 사용하는 기능은 동일 ngrok origin으로 지정
- 허용 origin 또는 callback allowlist가 있는 공급자에 임시 주소 등록

## 필수 QA

- iOS Safari와 Android Chrome에서 반응형 화면 확인
- PWA 안내 후 설치, 실행, 제거, 업데이트 확인
- Secure refresh cookie 발급과 재로그인 확인
- OAuth 성공·취소·이메일 미제공 흐름 확인
- 결제 테스트 성공·실패·중복 요청·재전송 확인
- 터널 종료 후 외부 접근이 즉시 끊기는지 확인
- `/robots.txt`가 전체 검색 차단인지 확인

## 보안 주의

- ngrok URL은 인터넷에 공개된다. 실제 개인정보와 운영 비밀값을 사용하지 않는다.
- 시연이 끝나면 터널을 종료하고 외부 공급자 콘솔에서 임시 Redirect URI를 제거한다.
- 로컬로 복귀할 때 `FRONTEND_URL`, `AUTH_SECURE_COOKIE`, 전달 헤더 설정을 1단계 값으로 되돌린다.

## 3단계 진입 조건

- 모바일·PWA·HTTPS·외부 콜백 검증 완료
- 임시 URL 의존 항목 목록 작성
- AWS QA용 별도 계정/리소스/도메인과 비용 알림 준비
