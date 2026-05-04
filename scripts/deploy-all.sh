#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

"$ROOT_DIR/scripts/deploy-backend.sh"
"$ROOT_DIR/scripts/deploy-frontend.sh"

echo "All deployment steps completed."
