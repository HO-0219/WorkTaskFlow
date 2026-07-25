# 토스페이먼츠 테스트 연동 및 보안 운영

## 구성

- 브라우저는 서버에서 공개 가능한 클라이언트 키와 무작위 `customerKey`만 받습니다.
- 카드 정보는 토스페이먼츠 SDK에서 직접 입력합니다. 애플리케이션 서버로 카드번호·CVC·유효기간을 보내지 않습니다.
- 성공 리다이렉트의 일회용 `authKey`는 로그인된 서버 API가 받아 빌링키로 교환합니다.
- 빌링키는 `PAYMENT_ENCRYPTION_KEY_BASE64`의 AES-256-GCM 키로 암호화한 값만 DB에 저장합니다.
- 호출 로그에는 사용자/결제수단/시도 ID, HTTP 상태, 토스 오류 코드만 남깁니다. 시크릿 키, 인증 키, 빌링키, 전체 요청·응답은 기록하지 않습니다.
- POST 호출마다 UUID 멱등키를 저장합니다. 재전송은 같은 멱등키와 주문번호를 사용하며 실패한 테스트 호출에 한해 최대 3회 허용합니다.
- 100원 테스트 호출은 `TOSS_TEST_MODE=true`이면서 시크릿 키가 공식 테스트 접두사 `test_sk` 또는 `test_gsk`일 때만 열립니다.

## 로컬 설정

실제 키는 `.env`에만 넣고 커밋하지 않습니다.

```properties
TOSS_CLIENT_KEY=발급받은_테스트_클라이언트_키
TOSS_SECRET_KEY=발급받은_테스트_시크릿_키
PAYMENT_ENCRYPTION_KEY_BASE64=32바이트_랜덤키의_Base64
TOSS_TEST_MODE=true
```

암호화 키는 한 번 만든 뒤 안전한 비밀 저장소에 백업하고 계속 같은 값을 사용합니다. 이 값을 잃거나 바꾸면 기존 빌링키를 복호화할 수 없습니다.

```bash
openssl rand -base64 32
```

로그인 후 `계정 설정 → 결제수단 및 테스트 관리`에서 카드 등록, 테스트 호출, 실패 호출 재전송 및 마스킹된 로그를 확인합니다. 자동결제 API는 별도 계약이 필요할 수 있습니다.

## 운영 전 체크

1. 대화, 메신저 또는 이슈에 노출된 시크릿 키를 토스 개발자센터에서 재발급합니다.
2. EC2 환경변수 대신 가능하면 AWS Secrets Manager 또는 SSM Parameter Store를 사용하고, 인스턴스 역할에 최소 읽기 권한만 부여합니다.
3. `TOSS_TEST_MODE=false`로 배포하고 라이브/테스트 키와 DB를 분리합니다.
4. HTTPS만 허용하고 Nginx에서 TLS 1.2 이상, HSTS, 요청 크기 제한을 적용합니다.
5. 결제 API 로그의 접근 권한과 보존 기간을 제한하고 CloudWatch 경보를 연결합니다.
6. 키 교체 시 새 키를 먼저 배포해 확인한 뒤 이전 키를 폐기합니다.

참고: [토스페이먼츠 인증 및 멱등키](https://docs.tosspayments.com/reference/using-api/authorization), [자동결제 API](https://docs.tosspayments.com/reference)
