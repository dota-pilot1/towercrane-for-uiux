# Deployment Scripts

Towercrane 운영 배포 스크립트입니다. 상세 운영 값은 `docs-for-배포/` 문서를 기준으로 하며, 민감 정보는 커밋하지 않습니다.

## 전체 배포

```bash
WAIT_FOR_INVALIDATION=true ./scripts/deploy-all.sh
```

순서:

1. 로컬 `main`/clean tree/`origin/main` 동기화 확인
2. 백엔드 EC2 배포 lock 획득
3. 백엔드 직전 커밋 기록, `origin/main` pull
4. 백엔드 의존성 설치, 빌드, SQLite 백업, PM2 재시작
5. 백엔드 헬스체크 실패 시 직전 커밋으로 롤백 시도
6. 프론트 로컬 빌드
7. S3에 hashed asset 먼저 업로드
8. `index.html` 마지막 업로드
9. CloudFront invalidation

## 개별 배포

```bash
./scripts/deploy-backend.sh
./scripts/deploy-frontend.sh
```

## 주요 환경변수

```bash
EC2_HOST=54.180.215.129
EC2_USER=ubuntu
SSH_KEY=docs-for-배포/hibot-d-server-key.pem
REMOTE_REPO_DIR=/home/ubuntu/towercrane
PM2_APP_NAME=towercrane-back

AWS_REGION=ap-northeast-2
S3_BUCKET=hibot-docu-front-hyun0316
CLOUDFRONT_DISTRIBUTION_ID=E1L7QZR4LQV4LE
WAIT_FOR_INVALIDATION=false
PRUNE_STALE_ASSETS=false
REQUIRE_CLEAN_GIT=true
REQUIRE_SYNCED_MAIN=true
HEALTH_RETRIES=12
HEALTH_SLEEP_SECONDS=5
```

## 사전 조건

- 로컬 AWS CLI 인증이 `aws sts get-caller-identity`를 통과해야 합니다.
- `towercrane-for-uiux-front/.env.production`이 운영 API를 바라봐야 합니다.
- EC2에 repo가 `REMOTE_REPO_DIR`에 clone되어 있어야 합니다.
- EC2에 Node.js, `pnpm` 또는 `npm`, PM2가 있어야 합니다.

## 긴급 옵션

일반 배포에서는 쓰지 않습니다.

```bash
# 로컬 변경/branch 동기화 검사를 우회
REQUIRE_CLEAN_GIT=false REQUIRE_SYNCED_MAIN=false ./scripts/deploy-all.sh

# 오래된 S3 asset 삭제
PRUNE_STALE_ASSETS=true ./scripts/deploy-frontend.sh
```
