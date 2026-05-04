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
REMOTE_LOCK_FILE="${REMOTE_LOCK_FILE:-/tmp/towercrane-backend-deploy.lock}"
REMOTE_ROLLBACK_REF="${REMOTE_ROLLBACK_REF:-/tmp/towercrane-backend-rollback-commit}"
HEALTH_RETRIES="${HEALTH_RETRIES:-12}"
HEALTH_SLEEP_SECONDS="${HEALTH_SLEEP_SECONDS:-5}"

if [[ ! -f "$SSH_KEY" ]]; then
  echo "Missing SSH key: $SSH_KEY" >&2
  exit 1
fi

chmod 400 "$SSH_KEY"

SSH_OPTS=(-i "$SSH_KEY" -o StrictHostKeyChecking=accept-new)

echo "==> Deploying backend on $EC2_USER@$EC2_HOST"
ssh "${SSH_OPTS[@]}" "$EC2_USER@$EC2_HOST" bash -s <<EOF
set -euo pipefail

exec 9>"$REMOTE_LOCK_FILE"
if ! flock -n 9; then
  echo "Another backend deploy is already running." >&2
  exit 1
fi

if [[ ! -d "$REMOTE_REPO_DIR/.git" ]]; then
  echo "Missing remote repo: $REMOTE_REPO_DIR" >&2
  exit 1
fi

cd "$REMOTE_REPO_DIR"
PREVIOUS_COMMIT="\$(git rev-parse HEAD)"
printf '%s\n' "\$PREVIOUS_COMMIT" > "$REMOTE_ROLLBACK_REF"
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
TARGET_COMMIT="\$(git rev-parse HEAD)"

cd "$REMOTE_SERVER_DIR"

if [[ -f data/towercrane-catalog.sqlite ]]; then
  mkdir -p data/backups
  cp data/towercrane-catalog.sqlite "data/backups/towercrane-catalog.\$(date +%Y%m%d-%H%M%S).sqlite"
fi

if [[ -f pnpm-lock.yaml ]] && command -v pnpm >/dev/null 2>&1; then
  CI=true pnpm install --frozen-lockfile
  pnpm build
elif [[ -f pnpm-lock.yaml ]] && command -v corepack >/dev/null 2>&1; then
  CI=true corepack pnpm install --frozen-lockfile
  corepack pnpm build
elif [[ -f package-lock.json ]] && command -v npm >/dev/null 2>&1; then
  npm ci
  npm run build
elif command -v npm >/dev/null 2>&1; then
  npm install --no-package-lock
  npm run build
else
  echo "No supported package manager is available on remote server" >&2
  exit 1
fi

ENTRYPOINT="dist/src/main.js"
if [[ ! -f "\$ENTRYPOINT" ]]; then
  ENTRYPOINT="dist/main.js"
fi

load_env_file() {
  if [[ ! -f .env ]]; then
    return
  fi

  while IFS='=' read -r key value; do
    if [[ -z "\$key" || "\$key" =~ ^[[:space:]]*# ]]; then
      continue
    fi
    if [[ "\$key" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]]; then
      export "\$key=\$value"
    fi
  done < .env
}

load_env_file

if pm2 describe "$PM2_APP_NAME" >/dev/null 2>&1; then
  pm2 restart "$PM2_APP_NAME" --update-env
else
  pm2 start "\$ENTRYPOINT" --name "$PM2_APP_NAME"
fi

pm2 save
pm2 status "$PM2_APP_NAME"

echo "Deployed backend commit: \$TARGET_COMMIT (previous: \$PREVIOUS_COMMIT)"
EOF

echo "==> Checking backend health"
for ((attempt = 1; attempt <= HEALTH_RETRIES; attempt += 1)); do
  if curl -fsS "$HEALTH_URL" | head -c 500; then
    echo
    echo "Backend deployed: https://api.hibot-docu.com"
    exit 0
  fi

  echo "Health check failed, retrying in $HEALTH_SLEEP_SECONDS seconds ($attempt/$HEALTH_RETRIES)" >&2
  sleep "$HEALTH_SLEEP_SECONDS"
done

echo "Backend health check failed. Rolling back remote backend to previous commit." >&2
ssh "${SSH_OPTS[@]}" "$EC2_USER@$EC2_HOST" bash -s <<EOF
set -euo pipefail

exec 9>"$REMOTE_LOCK_FILE"
flock 9

cd "$REMOTE_REPO_DIR"
ROLLBACK_COMMIT="\$(cat "$REMOTE_ROLLBACK_REF" 2>/dev/null || true)"
if [[ -z "\$ROLLBACK_COMMIT" ]]; then
  echo "Cannot determine rollback commit from $REMOTE_ROLLBACK_REF." >&2
  exit 1
fi

git checkout "\$ROLLBACK_COMMIT"
cd "$REMOTE_SERVER_DIR"

if [[ -f pnpm-lock.yaml ]] && command -v pnpm >/dev/null 2>&1; then
  CI=true pnpm install --frozen-lockfile
  pnpm build
elif [[ -f pnpm-lock.yaml ]] && command -v corepack >/dev/null 2>&1; then
  CI=true corepack pnpm install --frozen-lockfile
  corepack pnpm build
elif [[ -f package-lock.json ]] && command -v npm >/dev/null 2>&1; then
  npm ci
  npm run build
elif command -v npm >/dev/null 2>&1; then
  npm install --no-package-lock
  npm run build
fi

load_env_file() {
  if [[ ! -f .env ]]; then
    return
  fi

  while IFS='=' read -r key value; do
    if [[ -z "\$key" || "\$key" =~ ^[[:space:]]*# ]]; then
      continue
    fi
    if [[ "\$key" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]]; then
      export "\$key=\$value"
    fi
  done < .env
}

load_env_file

pm2 restart "$PM2_APP_NAME" --update-env
pm2 save
echo "Rolled back backend to: \$ROLLBACK_COMMIT"
EOF

echo "Backend health check failed after rollback attempt: $HEALTH_URL" >&2
exit 1
