#!/bin/bash

# SystemDesignMentor Development Script

echo "🚀 Starting System Design Mentor Development Environment"

# Function to check if port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        echo "⚠️  Port $1 is already in use"
        return 1
    fi
    return 0
}

# Function to start backend
start_backend() {
    echo "📦 Starting Backend (FastAPI)..."
    cd backend
    
    # Activate virtual environment if it exists
    if [ -d "venv" ]; then
        source venv/bin/activate
    else
        echo "⚠️  Virtual environment not found. Runing: python3 -m venv backend/venv"
        python3 -m venv venv
        source venv/bin/activate
    fi
    
    # Check if dependencies are installed
    if ! python3 -c "import fastapi" 2>/dev/null; then
        echo "📥 Installing backend dependencies..."
        pip install -r requirements.txt
    fi
    
    # Start the server
    echo "🔧 Using configuration from app/config.py"
    python3 main.py &
    BACKEND_PID=$!
    echo "✅ Backend started on http://localhost:8000 (PID: $BACKEND_PID)"
    cd ..
}

# Function to start frontend
start_frontend() {
    echo "🎨 Starting Frontend (React)..."
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

# Function to cleanup
cleanup() {
    echo "🧹 Cleaning up..."
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null
    fi
    exit 0
}

# Trap cleanup on script exit
trap cleanup EXIT INT TERM

# Main execution
case "$1" in
    "backend")
        check_port 8000 && start_backend
        wait
        ;;
    "frontend")
        check_port 3000 && start_frontend
        wait
        ;;
    "test")
        run_tests
        ;;
    "full"|"")
        check_port 8000 && check_port 3000 || exit 1
        start_backend
        sleep 3  # Give backend time to start
       # start_frontend
        
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
        echo "Usage: $0 [backend|frontend|test|full]"
        echo "  backend  - Start only the backend server"
        echo "  frontend - Start only the frontend server"
        echo "  test     - Run all tests"
        echo "  full     - Start both backend and frontend (default)"
        exit 1
        ;;
esac