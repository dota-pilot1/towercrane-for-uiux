#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

REQUIRE_CLEAN_GIT="${REQUIRE_CLEAN_GIT:-true}"
REQUIRE_SYNCED_MAIN="${REQUIRE_SYNCED_MAIN:-true}"

if [[ "$REQUIRE_CLEAN_GIT" == "true" ]]; then
  if [[ -n "$(git -C "$ROOT_DIR" status --porcelain)" ]]; then
    echo "Working tree is not clean. Commit or stash changes before deploy." >&2
    git -C "$ROOT_DIR" status --short >&2
    exit 1
  fi
fi

if [[ "$REQUIRE_SYNCED_MAIN" == "true" ]]; then
  CURRENT_BRANCH="$(git -C "$ROOT_DIR" branch --show-current)"
  if [[ "$CURRENT_BRANCH" != "main" ]]; then
    echo "Deploy must run from main. Current branch: $CURRENT_BRANCH" >&2
    exit 1
  fi

  git -C "$ROOT_DIR" fetch origin main
  LOCAL_SHA="$(git -C "$ROOT_DIR" rev-parse HEAD)"
  REMOTE_SHA="$(git -C "$ROOT_DIR" rev-parse origin/main)"
  if [[ "$LOCAL_SHA" != "$REMOTE_SHA" ]]; then
    echo "Local HEAD does not match origin/main." >&2
    echo "local : $LOCAL_SHA" >&2
    echo "origin: $REMOTE_SHA" >&2
    exit 1
  fi
fi

"$ROOT_DIR/scripts/deploy-backend.sh"
"$ROOT_DIR/scripts/deploy-frontend.sh"

echo "All deployment steps completed."
