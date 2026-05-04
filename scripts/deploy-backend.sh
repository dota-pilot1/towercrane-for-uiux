#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

EC2_HOST="${EC2_HOST:-54.180.215.129}"
EC2_USER="${EC2_USER:-ubuntu}"
SSH_KEY="${SSH_KEY:-$ROOT_DIR/docs-for-배포/hibot-d-server-key.pem}"
REMOTE_REPO_DIR="${REMOTE_REPO_DIR:-/home/ubuntu/towercrane}"
REMOTE_SERVER_DIR="$REMOTE_REPO_DIR/towercrane-for-uiux-server"
PM2_APP_NAME="${PM2_APP_NAME:-towercrane-back}"
HEALTH_URL="${HEALTH_URL:-https://api.hibot-docu.com/api/menus}"

if [[ ! -f "$SSH_KEY" ]]; then
  echo "Missing SSH key: $SSH_KEY" >&2
  exit 1
fi

chmod 400 "$SSH_KEY"

SSH_OPTS=(-i "$SSH_KEY" -o StrictHostKeyChecking=accept-new)

echo "==> Deploying backend on $EC2_USER@$EC2_HOST"
ssh "${SSH_OPTS[@]}" "$EC2_USER@$EC2_HOST" bash -s <<EOF
set -euo pipefail

if [[ ! -d "$REMOTE_REPO_DIR/.git" ]]; then
  echo "Missing remote repo: $REMOTE_REPO_DIR" >&2
  exit 1
fi

cd "$REMOTE_REPO_DIR"
git fetch origin main
git checkout main

BACKUP_DIR="\$HOME/towercrane-deploy-backups"
for file in towercrane-for-uiux-front/package-lock.json towercrane-for-uiux-server/package-lock.json; do
  if [[ -f "\$file" ]] && ! git ls-files --error-unmatch "\$file" >/dev/null 2>&1; then
    mkdir -p "\$BACKUP_DIR"
    mv "\$file" "\$BACKUP_DIR/\$(basename "\$file").\$(date +%Y%m%d-%H%M%S)"
    echo "Backed up untracked remote file: \$file"
  fi
done

git pull --ff-only origin main

cd "$REMOTE_SERVER_DIR"

if [[ -f data/towercrane-catalog.sqlite ]]; then
  mkdir -p data/backups
  cp data/towercrane-catalog.sqlite "data/backups/towercrane-catalog.\$(date +%Y%m%d-%H%M%S).sqlite"
fi

if command -v pnpm >/dev/null 2>&1; then
  pnpm install --frozen-lockfile
  pnpm build
elif command -v npm >/dev/null 2>&1; then
  npm install
  npm run build
else
  echo "Neither pnpm nor npm is installed on remote server" >&2
  exit 1
fi

ENTRYPOINT="dist/src/main.js"
if [[ ! -f "\$ENTRYPOINT" ]]; then
  ENTRYPOINT="dist/main.js"
fi

if pm2 describe "$PM2_APP_NAME" >/dev/null 2>&1; then
  pm2 restart "$PM2_APP_NAME" --update-env
else
  pm2 start "\$ENTRYPOINT" --name "$PM2_APP_NAME"
fi

pm2 save
pm2 status "$PM2_APP_NAME"
EOF

echo "==> Checking backend health"
for attempt in {1..12}; do
  if curl -fsS "$HEALTH_URL" | head -c 500; then
    echo
    echo "Backend deployed: https://api.hibot-docu.com"
    exit 0
  fi

  echo "Health check failed, retrying in 5 seconds ($attempt/12)" >&2
  sleep 5
done

echo "Backend health check failed: $HEALTH_URL" >&2
exit 1
