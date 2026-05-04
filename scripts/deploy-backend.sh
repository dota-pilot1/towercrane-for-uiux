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
curl -fsS "$HEALTH_URL" | head -c 500
echo
echo "Backend deployed: https://api.hibot-docu.com"
