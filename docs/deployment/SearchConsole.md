# 공개 사이트맵과 Google Search Console 등록

## 검색에 공개하는 경로

| 경로 | 역할 | 검색 노출 |
| --- | --- | --- |
| `/` | 서비스 소개, 읽기 전용 데모, PWA 설치 안내 | 허용 |
| `/product` | 제품 기능과 업무 흐름 소개 | 허용 |
| `/b2b` | 팀·기업 도입 안내 | 허용 |
| `/pricing` | 무료 베타와 향후 플랜 안내 | 허용 |
| `/contact` | 제품·도입·개발 문의 안내 | 허용 |
| `/privacy` | 개인정보 처리방침 | 허용 |
| `/terms` | 서비스 이용약관 | 허용 |
| `/site-map` | 사용자용 전체 사이트맵 | 허용 |
| `/app`, `/groups/**`, `/tasks/**`, `/calendar`, `/notifications` | 로그인 후 협업 화면 | 차단 |
| `/profile`, `/account`, `/payments` | 개인정보·계정·결제 화면 | 차단 |
| `/login`, `/signup`, `/oauth/**`, `/group-invitations/**` | 인증·초대 화면 | 차단 |

빌드 시 `robots.txt`와 검색엔진용 `sitemap.xml`이 `frontend/dist` 루트에 자동 생성된다.
화면의 `/site-map`은 사용자가 서비스 구조를 탐색하는 HTML 페이지이고, `/sitemap.xml`은 검색엔진 제출용 파일이다.

## 운영 빌드 전 환경값

루트 `.env`에 실제 HTTPS 도메인과 개인정보 문의 주소를 넣는다.

```properties
VITE_PUBLIC_SITE_URL=https://example.com
VITE_ALLOW_INDEXING=true
VITE_PRIVACY_CONTACT=privacy@example.com
VITE_GOOGLE_SITE_VERIFICATION=google이_제공한_HTML_태그의_content_값
```

`VITE_GOOGLE_SITE_VERIFICATION`에는 전체 `<meta>` 태그가 아니라 `content="..."` 안의 값만 넣는다.
Vite 환경값은 빌드 시 정적 파일에 포함되므로 변경 후에는 프런트엔드를 다시 빌드해야 한다.

```bash
cd frontend
npm ci
npm run build
```

## Nginx 배포 확인

SPA 경로를 새로고침해도 `index.html`이 반환되고, 실제 정적 SEO 파일은 우선 제공되어야 한다.

```nginx
location = /robots.txt { try_files $uri =404; }
location = /sitemap.xml { try_files $uri =404; }
location / { try_files $uri $uri/ /index.html; }
```

배포 후 다음 주소를 시크릿 창에서 확인한다.

- `https://example.com/`
- `https://example.com/robots.txt`
- `https://example.com/sitemap.xml`
- `https://example.com/privacy`
- `https://example.com/terms`
- `https://example.com/site-map`
- `https://example.com/product`
- `https://example.com/b2b`
- `https://example.com/pricing`
- `https://example.com/contact`

## Search Console 등록 순서

1. 실제 도메인을 Search Console 속성으로 추가한다. DNS를 관리할 수 있으면 도메인 속성을 우선 사용한다.
2. URL 접두어 속성을 사용할 경우 환경값에 HTML 태그 인증 토큰을 넣고 다시 빌드·배포한다.
3. `Sitemaps` 메뉴에 `sitemap.xml`을 제출한다.
4. URL 검사에서 랜딩 페이지와 공개 정책 페이지의 색인 가능 여부를 확인한다.
5. 운영 도메인이 바뀌면 `VITE_PUBLIC_SITE_URL`을 바꾸고 다시 빌드한 뒤 새 속성에 사이트맵을 제출한다.

`robots.txt`는 크롤러에 대한 요청일 뿐 접근 통제 수단이 아니다. 개인정보·업무·결제 데이터는 계속 서버 인증과 권한 검사로 보호해야 한다.

## 운영 전 확정할 항목

- 개인정보 처리방침의 사업자명, 주소, 개인정보 보호책임자, 실제 수탁사와 정확한 보유기간
- 이용약관의 유료 서비스, 청약철회·환불, 준거법과 사업자 정보
- 소셜 로그인을 활성화할 경우 최초 소셜 가입자의 별도 필수 동의 절차
- 실제 도메인의 HTTPS, canonical URL, OG 공유 이미지
