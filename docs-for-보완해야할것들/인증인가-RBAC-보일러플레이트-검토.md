# 인증/인가 RBAC 보일러플레이트 검토

## 1. 결론

현재 프로젝트는 `Next.js + Spring Boot + PostgreSQL` 기반의 **인증/인가 중심 파일럿 보일러플레이트**로는 좋은 출발점이다.

다만 스타트업, SI, 솔루션 개발, 엔터프라이즈 초기 구현에 바로 쓰는 **검증된 표준 보일러플레이트**라고 보기에는 아직 부족하다. 지금 상태는 “AI가 구조를 이해하고 확장하기 좋은 뼈대”에 가깝고, “팀이 반복 프로젝트에 바로 복제해서 쓰는 템플릿”이 되려면 테스트, CI, DB 마이그레이션, 운영 보안, 배포 자동화가 보강되어야 한다.

정리하면 다음과 같다.

| 구분 | 현재 판단 |
| --- | --- |
| 학습/파일럿/AI 확장 실험 | 적합 |
| 스타트업 MVP | 조건부 적합 |
| SI 관리자 시스템 시작 템플릿 | 조건부 적합 |
| 솔루션 제품 베이스 | 보완 필요 |
| 엔터프라이즈 초기 구현 | 아직 부족 |

## 2. 현재 프로젝트의 강점

### 2-1. 구조 방향이 좋다

백엔드는 DDD 4-Layer 구조를 지향한다.

```text
presentation -> application -> domain
infrastructure -> domain
```

프론트엔드는 FSD 구조를 지향한다.

```text
app -> widgets -> features -> entities -> shared
```

이런 구조는 AI에게 “어디에 무엇을 추가해야 하는지”를 설명하기 좋다. 즉, AI가 무작위로 파일을 만들기보다 기존 구조를 따라 확장하도록 유도할 수 있다.

### 2-2. 반복 재사용 가치가 높은 기능이 있다

현재 포함된 기능은 많은 B2B/SI/관리자 시스템에서 반복된다.

- 이메일 회원가입
- 로그인
- JWT 인증
- Access Token / Refresh Token
- Role CRUD
- Permission CRUD
- Role-Permission 매핑
- 유저 역할 변경
- 관리자 페이지 가드
- DB 기반 메뉴 관리
- 다국어 i18n
- 테마 스위처
- 공통 에러 응답
- Swagger 문서

이 정도 기능은 단순 CRUD 샘플보다 훨씬 보일러플레이트 가치가 있다.

### 2-3. SI/솔루션 관리자 시스템의 기본 골격이 있다

SI 프로젝트나 B2B 솔루션에서는 보통 다음 기능이 반복된다.

- 관리자 로그인
- 사용자 관리
- 역할/권한 관리
- 메뉴 관리
- 사이트 설정
- 파일 업로드
- API 문서
- 공통 예외 처리

현재 프로젝트는 이 반복 영역을 일부 갖추고 있으므로 “관리자 콘솔 스타터”로 발전시킬 수 있다.

## 3. 현재 한계

### 3-1. 프론트 lint가 실패한다

검증 명령 기준으로 프론트 `npm run lint`가 실패한다.

주요 유형은 다음과 같다.

- `no-explicit-any`
- `setState in effect`
- unused eslint-disable
- unused expression

보일러플레이트는 복제 출발점이므로 `lint`, `typecheck`, `build`, `test`가 기본적으로 통과해야 한다. 시작부터 lint가 깨져 있으면 “검증된 템플릿”이라는 신뢰가 떨어진다.

### 3-2. 테스트가 거의 없다

백엔드 `./gradlew test`는 통과하지만, 현재 테스트는 기본 컨텍스트 로딩 수준에 가깝다.

보일러플레이트라면 최소한 아래 흐름은 자동 테스트가 있어야 한다.

- 회원가입 성공
- 중복 이메일 차단
- 로그인 성공/실패
- Refresh Token 재발급
- 일반 유저의 관리자 API 접근 차단
- 관리자의 Role/Permission 변경
- 메뉴 가시성 필터
- 공통 에러 응답 포맷

테스트가 없으면 AI가 확장 과정에서 인증/권한을 깨뜨려도 바로 감지하기 어렵다.

### 3-3. CI/CD가 없다

현재 `.github/workflows` 기준의 CI 파이프라인이 없다.

최소 CI는 다음을 포함해야 한다.

- frontend lint
- frontend build
- backend test
- backend build
- Docker image build 검증

보일러플레이트의 핵심은 “반복 사용 시 안정성”이다. CI가 없으면 안정성 검증이 사람 손에 남는다.

### 3-4. DB 마이그레이션 전략이 약하다

현재 Spring JPA 설정이 개발 편의 중심이다.

```yaml
spring:
  jpa:
    hibernate:
      ddl-auto: update
```

`ddl-auto: update`는 로컬 개발에는 편하지만 운영/엔터프라이즈에서는 위험하다. 운영에서는 DB 스키마 변경 이력을 명시적으로 관리해야 한다.

권장 방향은 다음 중 하나다.

- Flyway
- Liquibase

보일러플레이트라면 `V1__init.sql`, `V2__seed_roles_permissions.sql` 같은 마이그레이션 파일로 초기 스키마와 seed 데이터를 재현 가능하게 만들어야 한다.

### 3-5. 토큰 저장 방식이 프로덕션 보안 기준에 부족하다

현재 프론트는 토큰을 `localStorage`에 저장하는 구조다.

```ts
const ACCESS_KEY = "twilio.accessToken";
const REFRESH_KEY = "twilio.refreshToken";
```

문제는 두 가지다.

- `localStorage`에 refresh token을 저장하면 XSS에 취약하다.
- `twilio.*` 네이밍이 남아 있어 파일럿 프로젝트 흔적이 보인다.

프로덕션 보일러플레이트라면 다음 구조가 더 적합하다.

- Access Token: 짧은 만료 시간
- Refresh Token: `httpOnly`, `Secure`, `SameSite=Lax` 쿠키
- 401 발생 시 silent refresh
- 로그아웃 시 서버 refresh token 무효화
- refresh token rotation

### 3-6. 범용화가 덜 됐다

보일러플레이트는 특정 프로젝트 이름이 강하게 남아 있으면 재사용성이 떨어진다.

현재 남아 있는 흔적은 예를 들면 다음과 같다.

- `BeautyBook`
- `pilot-callcenter-front`
- `twilio.accessToken`
- `com.cj.beautybook`
- `beauty_book`

공개용 또는 팀 공통 템플릿으로 만들려면 다음 중 하나가 필요하다.

- 중립 네이밍으로 변경
- 템플릿 변수화
- `rename guide` 제공
- 생성 스크립트 제공

### 3-7. 전체 스택 실행성이 부족하다

현재 Docker Compose는 PostgreSQL 중심이다.

실제 보일러플레이트라면 다음이 있으면 좋다.

- backend Dockerfile
- frontend Dockerfile
- full-stack docker-compose
- `.env.example`
- local/dev/prod 프로필 분리
- healthcheck
- one command 실행

예:

```bash
docker compose up --build
```

이 명령 하나로 DB, 백엔드, 프론트가 모두 뜨면 팀 온보딩 비용이 크게 줄어든다.

## 4. 사용처별 평가

### 4-1. 학습/파일럿/AI 확장 실험

현재 상태로도 충분히 가치가 있다.

이유는 다음과 같다.

- 구조가 명확하다.
- 문서가 있다.
- 인증/인가/메뉴/관리자 기능이 연결되어 있다.
- AI에게 “기존 패턴대로 기능 추가”를 시키기 좋다.

이 프로젝트는 사용자가 말한 “검증된 프로토타입 + 보일러플레이트 기반 개발”의 파일럿 예시로 적합하다.

### 4-2. 스타트업 MVP

조건부로 적합하다.

내부 관리자 기능이 필요한 MVP라면 빠르게 시작할 수 있다. 다만 실제 사용자 대상 서비스라면 아래 기능이 빠져 있다.

- 이메일 인증
- 비밀번호 재설정
- OAuth 로그인
- 계정 설정
- 탈퇴
- 약관/개인정보 동의
- 운영 배포 자동화
- 에러 모니터링

즉, 관리자 기반 MVP에는 쓸 수 있지만 외부 유저 가입 서비스에는 추가 개발이 필요하다.

### 4-3. SI 프로젝트

조건부로 적합하다.

SI에서 반복되는 관리자 시스템의 시작점으로는 좋다. 특히 사용자/역할/권한/메뉴 관리는 여러 업무 시스템에서 반복된다.

다만 SI 표준 템플릿으로 쓰려면 다음이 필요하다.

- 프로젝트명 제거
- 마이그레이션 도입
- 공통 테이블 정책 정리
- API 응답 규격 문서화
- 권한 설계 가이드
- 화면 추가 가이드
- 배포 가이드
- 운영 로그 가이드

### 4-4. 솔루션 개발

현재는 부족하다.

솔루션 제품 베이스라면 보통 다음이 필요하다.

- 멀티테넌시
- 조직/팀/멤버십 모델
- 플랜/라이선스
- 감사 로그
- 설정 확장성
- 플러그인 또는 모듈 구조
- 운영자 콘솔
- 데이터 격리 전략

현재는 단일 조직/단일 서비스 기준의 RBAC 구조에 가깝다.

### 4-5. 엔터프라이즈 초기 구현

아직 부족하다.

엔터프라이즈에서는 보통 다음 요구가 빠르게 나온다.

- SSO
- SAML 또는 OIDC
- MFA/2FA
- Audit Log
- 권한 변경 이력
- 관리자 액션 추적
- 보안 헤더
- Rate Limiting
- 계정 잠금
- 비밀번호 정책
- 운영 DB 마이그레이션
- CI/CD
- 테스트 커버리지
- Observability
- 장애 대응 문서

따라서 현재 프로젝트는 엔터프라이즈의 “개념 검증”에는 좋지만, “프로덕션 착수 표준”으로는 추가 보강이 필요하다.

## 5. 보강 우선순위

### Phase 1. 신뢰 가능한 스타터 만들기

가장 먼저 해야 할 일은 “시작점이 깨져 있지 않다”는 신뢰를 만드는 것이다.

- 프론트 lint 에러 해결
- frontend build 통과
- backend test 통과 유지
- GitHub Actions 추가
- `.env.example` 정리
- README 실행 절차 최신화
- 프로젝트명/토큰 키 네이밍 정리

완료 기준:

```bash
cd beauty-book--front
npm run lint
npm run build

cd ../beauty-book-server
./gradlew test
./gradlew build
```

위 명령이 모두 통과해야 한다.

### Phase 2. 운영 가능한 인증 보일러플레이트 만들기

다음은 인증/인가 보일러플레이트로서 실사용 가능한 보안 수준을 맞추는 단계다.

- 이메일 인증
- 비밀번호 재설정
- refresh token httpOnly 쿠키 전환
- refresh token rotation
- 로그아웃 시 서버 토큰 무효화
- 로그인 실패 rate limit
- 계정 잠금 정책
- 비밀번호 정책

이 단계까지 완료하면 스타트업 MVP나 SI 내부 시스템에서 실사용 가능성이 높아진다.

### Phase 3. DB/배포/운영 표준화

운영 환경에 올리기 위한 기반이다.

- Flyway 또는 Liquibase 도입
- `ddl-auto: update` 제거
- dev/local/prod 프로필 분리
- backend Dockerfile
- frontend Dockerfile
- full-stack docker-compose
- healthcheck
- 운영 로그 설정
- Sentry 또는 모니터링 훅

### Phase 4. 엔터프라이즈 기능 보강

RBAC 보일러플레이트를 엔터프라이즈 방향으로 끌어올리는 단계다.

- Audit Log
- 2FA/TOTP
- OAuth
- OIDC
- SAML SSO
- 조직/팀 모델
- 멀티테넌시
- 권한 변경 이력
- 관리자 액션 추적
- OpenAPI 기반 TypeScript client 자동 생성

## 6. 보일러플레이트라는 말을 실제로 쓰는가

실제로 많이 쓴다.

다만 문맥에 따라 표현이 조금 다르다.

| 문맥 | 자주 쓰는 표현 |
| --- | --- |
| 개인/오픈소스 | boilerplate, starter, template |
| 스타트업/SaaS | SaaS boilerplate, starter kit, launch kit |
| SI/에이전시 | project template, starter kit, accelerator |
| 엔터프라이즈 | reference architecture, platform blueprint, golden path |
| 플랫폼 엔지니어링 | paved road, golden path, internal developer platform |

즉, “보일러플레이트”라는 말은 실제로 쓰이지만, 엔터프라이즈 내부에서는 `reference architecture`, `starter kit`, `accelerator`, `golden path` 같은 표현이 더 자연스러울 때도 있다.

## 7. 참고할 만한 공개 사례

### 7-1. GitHub SaaS Boilerplate Topic

URL: https://github.com/topics/saas-boilerplate

GitHub에는 `saas-boilerplate` topic이 따로 있다.

여기에 올라온 프로젝트들은 보통 다음 키워드를 포함한다.

- auth
- multi-tenancy
- roles & permissions
- i18n
- database
- logging
- testing
- billing
- dashboard

이 기준과 비교하면 현재 프로젝트는 `auth`, `roles & permissions`, `i18n`, `dashboard/admin` 일부는 갖췄지만, `testing`, `logging`, `billing`, `multi-tenancy`는 부족하다.

### 7-2. BoxyHQ SaaS Starter Kit

URL: https://github.com/boxyhq/saas-starter-kit

BoxyHQ는 스스로를 `Enterprise SaaS Starter Kit`와 `Next.js SaaS boilerplate`라고 부른다.

강조 기능은 다음과 같다.

- account
- team
- SAML SSO
- Directory Sync
- webhooks
- audit logs
- roles and permissions
- payments
- E2E tests
- Docker Compose
- security headers

현재 프로젝트가 엔터프라이즈 보일러플레이트를 목표로 한다면 BoxyHQ의 기능 구성이 좋은 비교 기준이다.

### 7-3. JHipster

URL: https://www.jhipster.tech/

JHipster는 보일러플레이트라기보다 애플리케이션 생성 플랫폼에 가깝다.

특징은 다음과 같다.

- Spring Boot 기반 백엔드 생성
- React/Angular/Vue 프론트 지원
- Docker/Kubernetes 배포 지원
- Liquibase 지원
- 테스트 도구 지원
- CI/CD 옵션
- 마이크로서비스 아키텍처 지원

엔터프라이즈 관점에서는 단순 코드 템플릿보다 JHipster 같은 “생성기 + 표준 구조 + 운영 옵션”에 가까워질수록 신뢰도가 높아진다.

### 7-4. Next.js Multi-tenant SaaS Boilerplate

URL: https://nextjs-boilerplate.com/nextjs-multi-tenant-saas-boilerplate

이 유형의 상용 보일러플레이트는 보통 다음을 강조한다.

- auth
- billing
- multi-tenancy
- permissions
- dashboard
- production-ready features
- tested thoroughly

현재 프로젝트와 가장 큰 차이는 `billing`, `multi-tenancy`, `테스트 완성도`, `프로덕션 준비도`다.

### 7-5. Supajump

URL: https://supajump.dev/

Supajump는 멀티테넌트 SaaS 스타터킷을 표방한다.

강조점은 다음과 같다.

- Organizations
- Teams
- Users
- dynamic RBAC
- Postgres Row Level Security
- Turborepo
- TanStack Query

솔루션/SaaS 제품으로 발전시키려면 현재 프로젝트도 단순 `User -> Role`에서 `Organization -> Team -> User -> Membership -> Role` 형태로 확장할 수 있어야 한다.

## 8. 이 프로젝트를 좋은 AI 보일러플레이트로 만드는 기준

AI는 “빈 프로젝트에서 생성”할 때보다 “검증된 구조 안에서 확장”할 때 훨씬 안정적이다.

따라서 보일러플레이트는 단순히 기능이 많은 코드가 아니라, AI가 실수하지 않도록 제약과 검증 장치를 제공해야 한다.

좋은 AI 보일러플레이트의 조건은 다음과 같다.

- 아키텍처 의존 방향이 문서화되어 있다.
- 새 기능 추가 위치가 명확하다.
- 예제 도메인이 2~3개 이상 있다.
- 테스트가 있어서 회귀를 잡는다.
- lint/typecheck/build가 CI에서 돈다.
- DB 마이그레이션이 재현 가능하다.
- API 응답/에러 포맷이 표준화되어 있다.
- 인증/권한 정책이 자동 테스트된다.
- README에 “기능 추가 방법”이 있다.
- 프로젝트명 변경 가이드가 있다.

현재 프로젝트는 앞쪽 조건 일부는 만족하지만, 검증 장치가 아직 약하다.

## 9. 최종 판단

현재 프로젝트는 “보일러플레이트가 될 수 있는 좋은 파일럿”이다.

하지만 지금 바로 “실무 표준 보일러플레이트”라고 부르기보다는 다음 표현이 더 정확하다.

> Next.js + Spring Boot 기반 인증/인가 RBAC 파일럿 스타터

또는

> AI 확장형 관리자 콘솔 보일러플레이트 초안

다음 4가지를 완료하면 “팀 공용 보일러플레이트”라고 불러도 설득력이 생긴다.

1. lint/build/test/CI 통과
2. Flyway 또는 Liquibase 기반 DB 마이그레이션
3. httpOnly refresh token 기반 인증 보안 강화
4. 프로젝트 네이밍 범용화와 문서 정리

엔터프라이즈까지 목표로 한다면 여기에 다음이 추가되어야 한다.

1. Audit Log
2. 2FA
3. OAuth/OIDC/SAML
4. 멀티테넌시
5. 운영 모니터링
6. 권한 변경 이력

