# Deployment Scripts

Towercrane 운영 배포 스크립트입니다. 상세 운영 값은 `docs-for-배포/` 문서를 기준으로 하며, 민감 정보는 커밋하지 않습니다.

## 전체 배포

```bash
./scripts/deploy-all.sh
```

순서:

1. 백엔드 EC2에서 `origin/main` pull
2. 백엔드 의존성 설치, 빌드, SQLite 백업, PM2 재시작
3. 프론트 로컬 빌드
4. S3 sync
5. CloudFront invalidation

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
```

## 사전 조건

- 로컬 AWS CLI 인증이 `aws sts get-caller-identity`를 통과해야 합니다.
- `towercrane-for-uiux-front/.env.production`이 운영 API를 바라봐야 합니다.
- EC2에 repo가 `REMOTE_REPO_DIR`에 clone되어 있어야 합니다.
- EC2에 Node.js, `pnpm` 또는 `npm`, PM2가 있어야 합니다.
