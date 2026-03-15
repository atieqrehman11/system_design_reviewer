#!/bin/bash

# SystemDesignMentor Development Script

echo "🚀 Starting System Design Mentor Development Environment"

# Function to ensure port is available (kill any existing process if needed)
ensure_port_available() {
    clear
    
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
        echo "🔌 Port $port is in use, clearing it..."
        lsof -ti:$port | xargs kill -9 2>/dev/null || true
        sleep 1
        echo "✅ Port $port is now available"
    else
        echo "✅ Port $port is available"
    fi
    return 0
}

# Function to setup backend environment
setup_backend_env() {
    echo "🔧 Setting up backend environment..."
    
    cd backend
    
    # Create virtual environment if it doesn't exist
    if [ ! -d "venv" ]; then
        echo "📦 Creating virtual environment..."
        python3 -m venv venv
    fi
    
    # Activate virtual environment
    source venv/bin/activate
    
    # Check and install dependencies
    REQUIREMENTS_FILE="requirements.txt"
    REQ_HASH_FILE=".requirements.sha"
    
    if command -v sha256sum >/dev/null 2>&1; then
        CURRENT_HASH=$(sha256sum "$REQUIREMENTS_FILE" | awk '{print $1}')
    else
        CURRENT_HASH=$(cksum "$REQUIREMENTS_FILE" | awk '{print $1}')
    fi
    
    STORED_HASH=""
    if [ -f "$REQ_HASH_FILE" ]; then
        STORED_HASH=$(cat "$REQ_HASH_FILE")
    fi
    
    if [ ! -f "$REQ_HASH_FILE" ] || [ "$CURRENT_HASH" != "$STORED_HASH" ]; then
        echo "📥 Installing backend dependencies..."
        pip install -r "$REQUIREMENTS_FILE"
        echo "$CURRENT_HASH" > "$REQ_HASH_FILE"
    else
        if ! python3 -c "import fastapi" 2>/dev/null; then
            echo "📥 Installing backend dependencies..."
            pip install -r "$REQUIREMENTS_FILE"
            echo "$CURRENT_HASH" > "$REQ_HASH_FILE"
        else
            echo "✅ Backend dependencies are up to date."
        fi
    fi
    
    cd ..
}

# Function to setup docs environment
setup_docs_env() {
    echo "📚 Setting up documentation environment..."
    
    # Use backend venv for docs (or create separate if preferred)
    if [ ! -d "backend/venv" ]; then
        setup_backend_env
    fi
    
    cd backend
    source venv/bin/activate
    cd ..
    
    # Check if correct mkdocs version is installed
    MKDOCS_VERSION=$(python3 -c "import mkdocs; print(mkdocs.__version__)" 2>/dev/null || echo "none")
    
    if [[ "$MKDOCS_VERSION" == "none" ]] || [[ "$MKDOCS_VERSION" == 2.* ]]; then
        echo "📥 Installing/updating documentation dependencies..."
        pip install --force-reinstall -r requirements-docs.txt
    else
        echo "✅ Documentation dependencies are up to date (MkDocs $MKDOCS_VERSION)."
    fi
}

# Function to start backend
start_backend() {
    echo "📦 Starting Backend (FastAPI)..."
    
    ensure_port_available 8000
    
    cd backend
    source venv/bin/activate
    
    echo "🔧 Starting server..."
    python3 main.py &
    BACKEND_PID=$!
    echo "✅ Backend started on http://localhost:8000 (PID: $BACKEND_PID)"
    cd ..
}

# Function to start frontend
start_frontend() {
    echo "🎨 Starting Frontend (React)..."
    
    # Ensure port 3000 is available
    ensure_port_available 3000
    
    cd frontend
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        echo "📥 Installing frontend dependencies..."
        npm install
    fi
    
    # Start the development server
    npm start &
    FRONTEND_PID=$!
    echo "✅ Frontend started on http://localhost:3000 (PID: $FRONTEND_PID)"
    cd ..
}

# Function to run tests
run_tests() {
    echo "🧪 Running Tests..."
    
    # Backend tests
    echo "Testing Backend..."
    cd backend
    source venv/bin/activate
    python3 -m pytest tests/ -v
    cd ..
    
    # Frontend tests
    echo "Testing Frontend..."
    cd frontend
    npm test -- --watchAll=false
    cd ..
}

# Function to serve documentation
serve_docs() {
    echo "📚 Starting Documentation Server..."
    
    ensure_port_available 8001
    
    echo "🔧 Serving documentation on http://localhost:8001"
    mkdocs serve -a localhost:8001 &
    DOCS_PID=$!
    echo "✅ Documentation server started (PID: $DOCS_PID)"
    
    echo ""
    echo "📖 Documentation available at: http://localhost:8001"
    echo "Press Ctrl+C to stop"
    
    wait
}

# Function to build documentation
build_docs() {
    echo "📚 Building Documentation..."
    
    echo "🔨 Building static documentation site..."
    mkdocs build
    
    if [ $? -eq 0 ]; then
        echo "✅ Documentation built successfully in site/ directory"
        echo "📦 Ready for deployment"
    else
        echo "❌ Documentation build failed"
        exit 1
    fi
}

# Function to cleanup
cleanup() {
    echo "🧹 Cleaning up..."
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null
    fi
    if [ ! -z "$DOCS_PID" ]; then
        kill $DOCS_PID 2>/dev/null
    fi
    exit 0
}

# Trap cleanup on script exit
trap cleanup EXIT INT TERM

# Main execution
case "$1" in
    "backend")
        setup_backend_env
        start_backend
        wait
        ;;
    "frontend")
        start_frontend
        wait
        ;;
    "test")
        setup_backend_env
        run_tests
        ;;
    "docs")
        setup_docs_env
        serve_docs
        ;;
    "docs:build")
        setup_docs_env
        build_docs
        ;;
    "full"|"")
        setup_backend_env
        start_backend
        sleep 3  # Give backend time to start
        start_frontend
        
        echo ""
        echo "🎉 System Design Mentor is running!"
        echo "📊 Backend API: http://localhost:8000"
        echo "🌐 Frontend App: http://localhost:3000"
        echo "📚 API Docs: http://localhost:8000/docs"
        echo ""
        echo "Press Ctrl+C to stop all services"
        
        # Wait for both processes
        wait
        ;;
    *)
        echo "Usage: $0 [backend|frontend|test|docs|docs:build|full]"
        echo "  backend     - Start only the backend server"
        echo "  frontend    - Start only the frontend server"
        echo "  test        - Run all tests"
        echo "  docs        - Serve documentation locally (http://localhost:8001)"
        echo "  docs:build  - Build static documentation site"
        echo "  full        - Start both backend and frontend (default)"
        exit 1
        ;;
esac