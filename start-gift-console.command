#!/bin/zsh
set -e
cd "${0:A:h}/gift-app"
if command -v node >/dev/null 2>&1; then
  NODE_BIN="$(command -v node)"
elif [[ -x /Users/a1/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node ]]; then
  NODE_BIN=/Users/a1/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node
else
  echo 'Node.js is required to run the local Gift console.'
  exit 1
fi
open http://127.0.0.1:5174
"$NODE_BIN" scripts/admin-console.mjs
