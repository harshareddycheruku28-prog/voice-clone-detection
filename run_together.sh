#!/usr/bin/env bash
# Script to run Frontend and Backend together on Linux / macOS / WSL

set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=========================================================="
echo " Starting Voice Clone Detection (Frontend + Backend)"
echo "=========================================================="

echo "[1/2] Starting Backend on http://localhost:8000 ..."
(cd "$DIR/backend" && python3 main.py) &
BACKEND_PID=$!

echo "[2/2] Starting Frontend on http://localhost:3000 ..."
(cd "$DIR/frontend" && npm start) &
FRONTEND_PID=$!

cleanup() {
    echo "Shutting down servers..."
    kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
}

trap cleanup EXIT INT TERM

wait
