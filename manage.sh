#!/usr/bin/env bash
set -euo pipefail

# System Design Mentor — project management script
# Usage: ./manage.sh [start|test|docs|docs:build]

cd "$(dirname "$0")"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

ensure_port_available() {
    local port=$1
    if lsof -Pi :"$port" -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "Port $port is in use, clearing it..."
        lsof -ti:"$port" | xargs kill -9 2>/dev/null || true
        sleep 1
    fi
}

setup_env() {
    if [ ! -d "venv" ]; then
        echo "Creating virtual environment..."
        python3 -m venv venv
    fi

    # shellcheck disable=SC1091
    source venv/bin/activate

    local req_file="requirements.txt"
    local hash_file=".requirements.sha"
    local current_hash stored_hash=""

    if command -v sha256sum >/dev/null 2>&1; then
        current_hash=$(sha256sum "$req_file" | awk '{print $1}')
    else
        current_hash=$(cksum "$req_file" | awk '{print $1}')
    fi

    [ -f "$hash_file" ] && stored_hash=$(cat "$hash_file")

    if [ "$current_hash" != "$stored_hash" ] || ! python3 -c "import fastapi" 2>/dev/null; then
        echo "Installing dependencies..."
        pip install -r "$req_file"
        echo "$current_hash" > "$hash_file"
    else
        echo "Dependencies up to date."
    fi

    export PYTHONPATH=.
}

setup_docs_env() {
    setup_env

    local mkdocs_ver
    mkdocs_ver=$(python3 -c "import mkdocs; print(mkdocs.__version__)" 2>/dev/null || echo "none")

    if [[ "$mkdocs_ver" == "none" ]] || [[ "$mkdocs_ver" == 2.* ]]; then
        echo "Installing docs dependencies..."
        pip install --force-reinstall -r requirements-docs.txt
    else
        echo "Docs dependencies up to date (MkDocs $mkdocs_ver)."
    fi
}

cleanup() {
    [ -n "${SERVER_PID:-}" ] && kill "$SERVER_PID" 2>/dev/null || true
    [ -n "${DOCS_PID:-}" ]   && kill "$DOCS_PID"   2>/dev/null || true
}

trap cleanup EXIT INT TERM

# ---------------------------------------------------------------------------
# Commands
# ---------------------------------------------------------------------------

case "${1:-start}" in
    start)
        setup_env
        ensure_port_available 8000
        echo "Starting server on http://localhost:8000 ..."
        python3 main.py &
        SERVER_PID=$!
        echo ""
        echo "API:        http://localhost:8000"
        echo "Swagger UI: http://localhost:8000/docs"
        echo ""
        echo "Press Ctrl+C to stop"
        wait
        ;;
    test)
        setup_env
        echo "Running tests..."
        python3 -m pytest "${@:2}"
        ;;
    docs)
        setup_docs_env
        ensure_port_available 8001
        mkdocs serve -a localhost:8001 &
        DOCS_PID=$!
        echo "Docs at http://localhost:8001 — Press Ctrl+C to stop"
        wait
        ;;
    docs:build)
        setup_docs_env
        mkdocs build && echo "Built to site/"
        ;;
    *)
        echo "Usage: $0 [start|test|docs|docs:build]"
        echo "  start        Start the API server on :8000 (default)"
        echo "  test         Run tests (extra args passed to pytest)"
        echo "  docs         Serve docs locally on :8001"
        echo "  docs:build   Build static docs site"
        exit 1
        ;;
esac
