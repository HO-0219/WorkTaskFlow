# Team Project Auth Starter

`studydevflow`와 분리해서 사용할 팀 프로젝트용 인증 기본 템플릿입니다. 도메인 기능은 넣지 않고 계정 기능만 포함합니다.

## 포함 기능

- 아이디/비밀번호 회원가입과 로그인
- 회원가입 이메일 인증(6자리 코드)
- 아이디 찾기(가입 이메일로 안내)
- 비밀번호 찾기(일회용 재설정 링크)
- JWT access token + 회전식 HttpOnly refresh token
- 로그아웃과 현재 사용자 조회
- Google/Kakao OAuth2 설정 및 신규 소셜 회원 생성
- React 인증 화면과 로그인 확인용 첫 화면
- Docker MySQL 기반 로컬 개발 환경

아이디 찾기와 비밀번호 찾기는 계정 존재 여부를 API 응답으로 노출하지 않습니다. 같은 이메일의 일반 계정과 소셜 계정도 자동 연결하지 않으므로, 추후 로그인 상태에서 명시적인 `계정 연결` 기능을 추가해야 합니다.

## 로컬 실행

필요 환경: Java 21, Node.js 20 이상 (Maven은 Wrapper가 자동으로 준비)

```bash
docker compose up -d

cd backend
./mvnw spring-boot:run
```

다른 터미널에서:

```bash
cd frontend
npm install
npm run dev
```

- 프런트엔드: http://localhost:5174
- 백엔드: http://localhost:8081
- 헬스 체크: http://localhost:8081/api/v1/health

루트의 `.env`를 Docker Compose, Spring Boot, Vite가 함께 사용합니다. 로컬에서는 MySQL 기본 포트인 `3306`을 사용하며, 이메일 발송은 꺼져 있어서 인증번호와 비밀번호 재설정 링크가 백엔드 로그의 `[LOCAL MAIL]`에 출력됩니다.

## `.env` 설정

별도의 예제 파일을 복사할 필요 없이 루트 `.env`의 값을 바로 수정하면 됩니다. 실제 SMTP 발송 시 아래 값을 변경합니다.

```properties
MAIL_ENABLED=true
MAIL_SMTP_AUTH=true
MAIL_STARTTLS=true
MAIL_USERNAME=your-account@gmail.com
MAIL_PASSWORD=your-app-password
MAIL_FROM=your-account@gmail.com
```

Gmail은 일반 비밀번호가 아니라 앱 비밀번호를 사용하세요. 운영 환경에서는 `SPRING_JPA_HIBERNATE_DDL_AUTO=validate`와 Flyway 같은 명시적 마이그레이션 도구 사용을 권장합니다.

## 소셜 로그인 설정

환경변수에 클라이언트 키를 넣으면 로그인 화면의 버튼이 활성화됩니다.

```properties
OAUTH2_GOOGLE_CLIENT_ID=...
OAUTH2_GOOGLE_CLIENT_SECRET=...
OAUTH2_KAKAO_CLIENT_ID=...
OAUTH2_KAKAO_CLIENT_SECRET=...
```

개발자 콘솔의 Redirect URI:

- Google: `http://localhost:8081/login/oauth2/code/google`
- Kakao: `http://localhost:8081/login/oauth2/code/kakao`

Kakao 동의 항목에서 닉네임과 이메일을 허용해야 합니다. 운영 배포 시 백엔드 도메인으로 Redirect URI를 바꾸고 `FRONTEND_URL`, `AUTH_SECURE_COOKIE=true`, 강한 `JWT_SECRET`을 반드시 설정하세요.

## AWS EC2 배포 시 변경할 값

EC2에서도 프로젝트 루트에 있는 `.env`를 사용합니다. 최소한 아래 항목은 운영 환경에 맞게 변경하세요.

```properties
SPRING_DATASOURCE_URL=jdbc:mysql://운영-DB-주소:3306/teamProject?serverTimezone=Asia/Seoul
SPRING_DATASOURCE_USERNAME=운영_DB_사용자
SPRING_DATASOURCE_PASSWORD=강한_DB_비밀번호
SPRING_JPA_HIBERNATE_DDL_AUTO=validate
JWT_SECRET=충분히_길고_무작위인_운영용_비밀키
FRONTEND_URL=https://서비스-도메인
VITE_API_BASE_URL=/api/v1
AUTH_SECURE_COOKIE=true
```

백엔드 빌드와 실행은 Maven 기준입니다.

```bash
cd backend
./mvnw clean package
java -jar target/auth-api-0.0.1-SNAPSHOT.jar
```

`.env`에는 비밀번호와 비밀키가 들어가므로 `.gitignore`에서 계속 제외합니다. EC2에는 Git으로 올리지 말고 서버에서 직접 생성하거나 AWS Systems Manager Parameter Store/Secrets Manager로 관리하세요.

## 주요 API

| Method | Path | 기능 |
|---|---|---|
| POST | `/api/v1/auth/email-verifications` | 가입 인증번호 발송 |
| POST | `/api/v1/auth/email-verifications/confirm` | 인증번호 확인 |
| POST | `/api/v1/auth/signup` | 회원가입 |
| POST | `/api/v1/auth/login` | 로그인 |
| POST | `/api/v1/auth/refresh` | access token 갱신 |
| POST | `/api/v1/auth/logout` | 로그아웃 |
| POST | `/api/v1/auth/username-reminders` | 아이디 안내 메일 |
| POST | `/api/v1/auth/password-resets` | 재설정 링크 메일 |
| POST | `/api/v1/auth/password-resets/confirm` | 새 비밀번호 저장 |
| GET | `/api/v1/auth/providers` | 활성화된 소셜 제공자 |
| GET | `/api/v1/auth/me` | 현재 사용자 |

## 다음 개발 기준

이 폴더를 새 Git 저장소로 분리한 뒤 팀 도메인 기능을 추가하면 됩니다. 배포 전에는 이메일 템플릿, 로그인/재설정 요청 IP 제한, 감사 로그, DB 마이그레이션, CI, 비밀키 저장소를 팀 운영 환경에 맞게 보강하세요.
