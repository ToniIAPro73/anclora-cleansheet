#!/usr/bin/env bash

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$REPO_ROOT/backend"
BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_PORT="${PORT:-3000}"
BACKEND_URL="http://127.0.0.1:${BACKEND_PORT}"

backend_pid=""

cleanup() {
  if [[ -n "$backend_pid" ]] && kill -0 "$backend_pid" 2>/dev/null; then
    kill "$backend_pid" 2>/dev/null || true
    wait "$backend_pid" 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

if curl --silent --fail --max-time 2 "$BACKEND_URL/api/health" >/dev/null 2>&1; then
  echo "CleanSheet backend already running at ${BACKEND_URL}"
else
  if [[ ! -x "$BACKEND_DIR/.venv/bin/python" ]]; then
    echo "CleanSheet backend virtualenv not found at $BACKEND_DIR/.venv" >&2
    echo "Create it and install backend/requirements.txt before running the app." >&2
    exit 1
  fi

  if [[ ! -f "$BACKEND_DIR/.env.local" ]]; then
    echo "Missing $BACKEND_DIR/.env.local; the local production-backed runtime cannot start safely without it." >&2
    exit 1
  fi

  echo "Starting CleanSheet backend at ${BACKEND_URL}"
  (
    cd "$BACKEND_DIR"
    FRONTEND_URL="http://localhost:${FRONTEND_PORT}" \
    CORS_ORIGINS="http://localhost:${FRONTEND_PORT}" \
    .venv/bin/python -m dotenv -f .env.local run -- \
      .venv/bin/python -m uvicorn server:app --host 127.0.0.1 --port "$BACKEND_PORT"
  ) &
  backend_pid=$!

  for _ in {1..30}; do
    if curl --silent --fail --max-time 1 "$BACKEND_URL/api/health" >/dev/null 2>&1; then
      break
    fi
    sleep 1
  done

  if ! curl --silent --fail --max-time 2 "$BACKEND_URL/api/health" >/dev/null 2>&1; then
    echo "CleanSheet backend did not become healthy at ${BACKEND_URL}" >&2
    exit 1
  fi
fi

"$@"
