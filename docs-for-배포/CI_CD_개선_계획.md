# Towercrane CI/CD 개선 계획

## 왜 필요한가

현재 백엔드 배포는 운영 EC2 안에서 `pnpm install`과 `pnpm build`를 직접 실행한다. 이 방식은 단순하지만 운영 서버의 CPU/메모리를 배포 빌드가 그대로 사용한다. 서버 사양이 작거나 CPU 크레딧이 낮은 상태에서는 `nest build` 중 SSH와 API 응답까지 밀릴 수 있다.

이번에 관찰된 증상은 아래와 같다.

- `./scripts/deploy-backend.sh`가 원격 `nest build` 이후 장시간 출력 없이 대기
- `ssh`가 `Connection timed out during banner exchange`로 실패
- `https://api.hibot-docu.com/api/menus`가 10~15초 타임아웃
- 로컬 `npm run build`와 `cargo check`는 정상 통과

따라서 문제의 중심은 코드 컴파일 오류가 아니라 운영 서버에서 직접 빌드하는 배포 구조와 복구 권한 부족이다.

## 목표 구조

1. GitHub Actions에서 백엔드 의존성 설치와 빌드를 수행한다.
2. 빌드 산출물과 운영에 필요한 파일만 artifact로 묶는다.
3. EC2에는 artifact를 업로드하고 압축 해제한다.
4. EC2에서는 DB 백업, 파일 교체, PM2 재시작, 헬스체크만 수행한다.
5. 실패하면 이전 릴리즈 디렉터리로 symlink를 되돌린다.

운영 서버는 빌드 서버가 아니라 런타임 서버로만 사용한다.

## 1차 구현 범위

1차는 현재 구조를 크게 바꾸지 않고 위험을 줄이는 데 집중한다.

- GitHub Actions workflow 추가: `.github/workflows/backend-deploy.yml`
- trigger: `workflow_dispatch` 우선, 이후 `main` push 자동 배포 검토
- Actions runner에서 `towercrane-for-uiux-server` 빌드
- artifact 구성:
  - `towercrane-for-uiux-server/dist/`
  - `towercrane-for-uiux-server/package.json`
  - lockfile: `pnpm-lock.yaml` 또는 `package-lock.json`
  - 런타임에 필요한 정적 파일이 있으면 함께 포함
- EC2 배포:
  - `/home/ubuntu/towercrane-releases/backend/<commit-sha>/`에 업로드
  - `.env`는 기존 운영 서버 파일을 복사하거나 symlink
  - `node_modules`는 서버에서 `pnpm install --prod --frozen-lockfile` 또는 artifact에 포함하는 방식 중 선택
  - `current-backend` symlink 전환
  - PM2 entrypoint를 `current-backend/dist/main.js` 또는 `dist/src/main.js`로 실행
- 헬스체크 실패 시 이전 symlink로 롤백

## 2차 구현 범위

1차가 안정화되면 아래를 검토한다.

- Docker image build 후 ECR/EC2 pull 방식
- Blue/Green 포트 전환: 예를 들어 `4001` 운영, `4002` 신규 검증 후 nginx upstream 전환
- GitHub Environments로 production 승인 단계 추가
- DB migration을 별도 단계로 분리하고 백업/검증 로그를 artifact로 저장
- CloudWatch alarm 또는 GitHub Actions 실패 알림 연결

## 필요한 GitHub Secrets

GitHub Actions에서 EC2와 AWS에 접근하려면 아래 값이 필요하다.

```text
EC2_HOST=54.180.215.129
EC2_USER=ubuntu
EC2_SSH_KEY=<hibot-d-server-key.pem 내용>
AWS_REGION=ap-northeast-2
```

프론트 S3/CloudFront 배포까지 Actions로 옮기면 아래도 필요하다.

```text
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
S3_BUCKET=hibot-docu-front-hyun0316
CLOUDFRONT_DISTRIBUTION_ID=E1L7QZR4LQV4LE
```

현재 Tauri 앱 릴리즈에는 이미 별도 Secrets가 필요하다.

```text
TAURI_SIGNING_PRIVATE_KEY
TAURI_SIGNING_PRIVATE_KEY_PASSWORD
APPLE_CERTIFICATE
APPLE_CERTIFICATE_PASSWORD
APPLE_SIGNING_IDENTITY
APPLE_ID
APPLE_PASSWORD
APPLE_TEAM_ID
```

## 추가로 조사해야 할 정보

아래 정보가 있어야 CI/CD 구현을 안전하게 마무리할 수 있다.

1. 운영 EC2의 실제 리소스 상태
   - 인스턴스 타입, 메모리, swap 유무, 디스크 여유 공간
   - CPU credit 잔량 또는 burst balance
2. 운영 프로세스 경로
   - 현재 PM2 entrypoint가 `dist/main.js`인지 `dist/src/main.js`인지
   - PM2 ecosystem 파일 사용 여부
3. 운영 `.env` 관리 방식
   - `.env`를 어느 경로에 둘지
   - 릴리즈 디렉터리 교체 시 `.env`를 symlink할지 복사할지
4. AWS/IAM 권한
   - 현재 계정에는 `ec2:RebootInstances`, `ec2:DescribeInstanceStatus`, `ssm:*` 권한이 없다.
   - 장애 복구까지 자동화하려면 최소 `ec2:RebootInstances` 또는 SSM command 권한이 필요하다.
5. GitHub Actions에서 운영 SSH 접속 가능 여부
   - security group이 GitHub-hosted runner의 IP 범위를 허용할지
   - 허용하지 않을 경우 self-hosted runner 또는 AWS SSM 기반 배포가 필요하다.

## 구현 전 결정

가장 현실적인 1차 결정은 아래 조합이다.

- 배포 trigger는 `workflow_dispatch` 수동 실행
- GitHub Actions에서 `pnpm build`
- EC2에는 `rsync` 또는 `scp`로 artifact 업로드
- EC2에서는 `pnpm install --prod --frozen-lockfile`만 실행
- PM2는 symlink된 `current-backend` 경로를 바라보게 변경
- 롤백은 `previous-backend` symlink로 복구

이 방식이면 운영 서버에서 TypeScript 빌드를 하지 않아 이번 같은 SSH/API 응답 지연 가능성을 크게 줄일 수 있다.

## 문서 반영 후 다음 작업

1. 서버가 복구되면 현재 PM2 entrypoint와 디스크/swap 상태 확인
2. `.github/workflows/backend-deploy.yml` 초안 작성
3. `scripts/deploy-backend-artifact.sh` 추가
4. staging 없이 production에 바로 반영되는 구조이므로 첫 실행은 `workflow_dispatch`로 제한
5. 성공 후 기존 `scripts/deploy-backend.sh`는 긴급 수동 배포용으로만 남김
