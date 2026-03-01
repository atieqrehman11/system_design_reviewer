# Getting Started

This guide will help you set up and run System Design Mentor on your local machine.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Python 3.8 or higher**: [Download Python](https://www.python.org/downloads/)
- **Node.js 16 or higher**: [Download Node.js](https://nodejs.org/)
- **npm or yarn**: Comes with Node.js
- **Git**: [Download Git](https://git-scm.com/downloads)
- **Docker** (optional): [Download Docker](https://www.docker.com/get-started)

## Installation

### Option 1: Quick Start with Development Script (Recommended)

The fastest way to get started is using the provided development script:

1. Clone the repository:
```bash
git clone <repository-url>
cd system-design-mentor
```

2. Make the development script executable:
```bash
chmod +x dev.sh
```

3. Start the application:
```bash
./dev.sh full
```

This will:
- Set up Python virtual environment
- Install all backend dependencies
- Install all frontend dependencies
- Start both backend and frontend servers
- Handle port conflicts automatically

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### Option 2: Manual Setup

#### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment:
```bash
python3 -m venv venv
```

3. Activate the virtual environment:
```bash
# On Linux/macOS
source venv/bin/activate

# On Windows
venv\Scripts\activate
```

4. Install dependencies:
```bash
pip install -r requirements.txt
```

5. Start the backend server:
```bash
python main.py
```

The backend will start on http://localhost:8000

#### Frontend Setup

1. Open a new terminal and navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The frontend will start on http://localhost:3000

### Option 3: Docker Setup

If you prefer using Docker:

1. Ensure Docker and Docker Compose are installed

2. Start the services:
```bash
docker-compose -f docker-compose.dev.yml up
```

This will build and start both backend and frontend containers.

## Configuration

### Environment Variables

Create a `.env` file in the root directory:

```bash
# OpenAI API Key (required for AI features)
OPENAI_API_KEY=your_openai_api_key_here

# Environment
ENVIRONMENT=development

# Backend Configuration
SERVER_HOST=0.0.0.0
SERVER_PORT=8000
DEBUG=true

# Frontend Configuration
REACT_APP_API_URL=http://localhost:8000
```

### Backend Configuration

The backend uses `backend/app/settings.toml` for configuration. Key settings:

```toml
[app]
name = "System Design Mentor API"
version = "1.0.0"
environment = "dev"
debug = true

[server]
host = "0.0.0.0"
port = 8000
reload = true

[cors]
origins = ["http://localhost:3000"]
```

You can override these settings using environment variables or by modifying the TOML file.

## Verifying Installation

### Check Backend

1. Visit http://localhost:8000/docs
2. You should see the Swagger UI with API documentation
3. Try the `/api/v1/status` endpoint to verify the API is working

### Check Frontend

1. Visit http://localhost:3000
2. You should see the System Design Mentor homepage
3. The page should display "System Design Mentor" and "AI-powered architecture analysis"

## First Steps

### Submit Your First Review

1. Open the application at http://localhost:3000
2. Navigate to the review submission page
3. Upload or paste an architecture design document (ADR)
4. Click "Submit for Review"
5. View the AI-generated analysis and recommendations

### Explore the API

1. Visit http://localhost:8000/docs
2. Expand the `/api/v1/review` endpoint
3. Click "Try it out"
4. Enter a sample architecture description
5. Execute the request and view the response

## Development Commands

### Backend Commands

```bash
# Start backend server
cd backend
python main.py

# Run tests
pytest

# Run tests with coverage
pytest --cov=app tests/

# Format code
black .

# Lint code
flake8 .

# Type check
mypy .
```

### Frontend Commands

```bash
# Start development server
cd frontend
npm start

# Run tests
npm test

# Build for production
npm run build

# Run tests without watch mode
npm test -- --watchAll=false
```

### Development Script Commands

```bash
# Start both services
./dev.sh full

# Start backend only
./dev.sh backend

# Start frontend only
./dev.sh frontend

# Run all tests
./dev.sh test
```

## Troubleshooting

### Port Already in Use

If you see an error about ports 3000 or 8000 being in use:

```bash
# Kill process on port 8000
lsof -ti:8000 | xargs kill -9

# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

Or use the development script which handles this automatically:
```bash
./dev.sh full
```

### Python Dependencies Issues

```bash
cd backend
rm -rf venv
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

### Node Dependencies Issues

```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### OpenAI API Key Issues

Ensure your OpenAI API key is properly set:
1. Check that the `.env` file exists in the root directory
2. Verify the `OPENAI_API_KEY` is set correctly
3. Restart the backend server after updating the key

## Next Steps

Now that you have System Design Mentor running, explore the [API Reference](api-reference.md) to understand available endpoints.
