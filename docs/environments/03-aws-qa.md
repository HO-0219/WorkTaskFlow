# 3단계: AWS 테스트 QA

## 목적

EC2, Nginx, 영속 DB·파일 저장소, HTTPS, 로그와 백업을 실제 배포 구조에서 검증한다. 일반 고객에게 공개하는 환경이 아니다.

## 권장 분리

- 운영과 다른 AWS 계정 또는 최소한 다른 VPC·리소스·IAM 역할
- QA 전용 서브도메인: `qa.example.com`
- QA 전용 EC2, DB, 업로드 볼륨, 메일 발송자, OAuth 앱, Toss 테스트키
- AWS Budget 비용 알림과 리소스 태그 `Environment=qa`

## 수정할 정보

| 항목 | AWS QA 값 |
| --- | --- |
| `FRONTEND_URL` | `https://qa.example.com` |
| `VITE_PUBLIC_SITE_URL` | `https://qa.example.com` |
| `AUTH_SECURE_COOKIE` | `true` |
| `SERVER_FORWARD_HEADERS_STRATEGY` | `framework` |
| `SPRING_DATASOURCE_URL` | QA 전용 MySQL/RDS TLS 연결 |
| `SPRING_JPA_HIBERNATE_DDL_AUTO` | `validate` |
| `UPLOAD_LOCAL_ROOT` | EC2 재배포 후에도 유지되는 전용 EBS 경로 |
| `MAIL_*` | QA 전용 발송자 또는 샌드박스 |
| `TOSS_TEST_MODE` | `true` |
| `DEMO_ENABLED` | `true` 또는 테스트 시간에만 활성화 |
| `VITE_ALLOW_INDEXING` | `false` |
| 비밀값 | Secrets Manager/SSM, EC2 인스턴스 역할로 최소 권한 조회 |

현재 구현의 이미지는 로컬 파일 저장 방식이다. 3단계에서는 영속 EBS와 백업으로 검증하고, 여러 인스턴스로 확장하기 전 S3 방식으로 교체해야 한다.

## 인프라 QA

- 보안 그룹은 80/443만 공개하고 8081·3306은 인터넷에 공개하지 않음
- SSH 키 대신 SSM Session Manager 또는 제한된 관리 경로 사용
- Nginx가 `/api`, OAuth callback, 권한 검사 이미지 요청을 백엔드로 전달
- TLS 인증서 자동 갱신과 HTTP→HTTPS 리다이렉트
- EC2 재부팅·애플리케이션 재시작 후 자동 복구
- DB 자동 백업과 실제 복원 리허설
- 업로드 볼륨 스냅샷과 복원 리허설
- CloudWatch 로그·CPU·디스크·5xx·헬스체크 알림
- 로그 로테이션과 개인정보/시크릿 마스킹
- Flyway 실패 시 배포 중단 및 이전 버전 롤백

## 애플리케이션 QA

- 전체 가입·로그인·복구·초대·업무·이미지·결제 테스트 흐름
- 동시 요청, 중복 결제, 재전송, 세션 회전
- 401/403/404 권한 경계
- Nginx 요청 크기 제한과 이미지 형식 검증
- `/robots.txt`가 `Disallow: /`인지 확인
- QA DB와 운영 DB가 물리적으로 분리됐는지 확인

## 4단계 진입 조건

- 배포·롤백·백업 복원 리허설 성공
- 24시간 이상 모니터링에서 치명 오류 없음
- 실제 사용할 도메인·메일·OAuth 제공자 설정 준비
- 개인정보 처리방침과 약관의 미확정 정보 목록 작성

## 공식 참고

- [AWS EC2 보안 책임과 권장 사항](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-security.html)
- [AWS Secrets Manager 모범 사례](https://docs.aws.amazon.com/secretsmanager/latest/userguide/best-practices.html)
- [Amazon RDS 모범 사례](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_BestPractices.html)
- [Amazon RDS 암호화](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Overview.Encryption.html)
