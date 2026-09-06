#!/bin/bash
# Install dependencies so typecheck, lint and build work in a Claude Code on the
# web session. Local sessions already have a node_modules, so this is a no-op
# there.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-.}"

# install, not ci: the container is cached after this hook completes, so a
# warm install is the cheap path on later sessions.
npm install --no-audit --no-fund
