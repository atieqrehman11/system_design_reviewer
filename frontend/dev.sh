#!/bin/bash

# Chat UI — Frontend Development Script

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

ensure_port_available() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "Port $port is in use, clearing it..."
        lsof -ti:$port | xargs kill -9 2>/dev/null || true
        sleep 1
        echo "Port $port is now available"
    fi
}

ensure_deps() {
    if [ ! -d "node_modules" ]; then
        echo "Installing dependencies..."
        npm install
    fi
}

ensure_env() {
    if [ ! -f ".env" ]; then
        echo "No .env found — copying from .env.example"
        cp .env.example .env
        echo "Edit .env and set REACT_APP_API_BASE_URL to your backend URL, then re-run."
        exit 1
    fi
}

# ---------------------------------------------------------------------------
# Commands
# ---------------------------------------------------------------------------

cmd_start() {
    ensure_env
    ensure_deps
    ensure_port_available 3000
    echo "Starting dev server on http://localhost:3000 ..."
    npm start
}

cmd_build() {
    ensure_env
    ensure_deps
    echo "Building production bundle..."
    npm run build
    echo "Done — output in build/"
}

cmd_test() {
    ensure_deps
    echo "Running tests..."
    npm test -- --watchAll=false
}

cmd_typecheck() {
    ensure_deps
    echo "Type-checking..."
    npx tsc --noEmit
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

case "$1" in
    "start"|""|"dev")
        cmd_start
        ;;
    "build")
        cmd_build
        ;;
    "test")
        cmd_test
        ;;
    "typecheck")
        cmd_typecheck
        ;;
    *)
        echo "Usage: $0 [start|build|test|typecheck]"
        echo "  start / dev   Start the development server on :3000 (default)"
        echo "  build         Build the production bundle"
        echo "  test          Run all tests once"
        echo "  typecheck     Run tsc --noEmit"
        exit 1
        ;;
esac
