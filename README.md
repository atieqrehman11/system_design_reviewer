# System Design Mentor

AI-powered architecture analysis and recommendations platform that helps evaluate system designs and provides expert feedback using CrewAI agents.

## Overview

System Design Mentor is a full-stack application that analyzes architecture design documents (ADRs) and provides comprehensive reviews covering scalability, security, reliability, and best practices. The platform uses AI agents powered by CrewAI to simulate expert system architects reviewing your designs.

## Features

- **AI-Powered Architecture Review**: Automated analysis of system design documents
- **Multi-Agent Analysis**: Specialized AI agents for different architectural concerns
- **RESTful API**: FastAPI backend with comprehensive API documentation
- **Modern Frontend**: React-based user interface
- **Docker Support**: Containerized development and deployment
- **Comprehensive Testing**: Test suites for both frontend and backend

## Tech Stack

### Backend
- **Framework**: FastAPI 0.121.1
- **AI/ML**: CrewAI 1.7.2, OpenAI, LangChain
- **Server**: Uvicorn with async support
- **Validation**: Pydantic 2.11.9
- **Configuration**: Dynaconf 3.2.11
- **Testing**: Pytest with async support

### Frontend
- **Framework**: React 18.2.0
- **Language**: TypeScript 4.9.5
- **HTTP Client**: Axios
- **Routing**: React Router DOM 6.8.0
- **File Upload**: React Dropzone 14.2.3
- **Testing**: React Testing Library

## Project Structure

```
.
├── backend/                 # FastAPI backend application
│   ├── app/
│   │   ├── api/            # API routes and endpoints
│   │   │   └── v1/         # API version 1
│   │   │       └── endpoints/
│   │   ├── common/         # Shared utilities and exception handlers
│   │   ├── config/         # Configuration management
│   │   ├── models/         # Data models
│   │   ├── services/       # Business logic and AI services
│   │   │   └── reviewer/   # Architecture review service
│   │   └── settings.toml   # Application settings
│   ├── main.py             # Application entry point
│   ├── requirements.txt    # Python dependencies
│   └── pytest.ini          # Test configuration
├── frontend/               # React frontend application
│   ├── public/            # Static assets
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── App.tsx        # Main application component
│   │   └── index.tsx      # Application entry point
│   ├── package.json       # Node dependencies
│   └── tsconfig.json      # TypeScript configuration
├── adrs/                  # Architecture Decision Records
├── docker-compose.dev.yml # Docker development setup
├── dev.sh                 # Development startup script
└── mkdocs.yml            # Documentation configuration
```

## Getting Started

### Prerequisites

- Python 3.8+
- Node.js 16+
- npm or yarn
- Docker and Docker Compose (optional)

### Quick Start with Development Script

The easiest way to get started is using the provided development script:

```bash
# Make the script executable
chmod +x dev.sh

# Start both backend and frontend
./dev.sh full

# Or start services individually
./dev.sh backend  # Backend only
./dev.sh frontend # Frontend only
./dev.sh test     # Run tests
```

### Manual Setup

#### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create and activate a virtual environment:
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Configure environment variables (create `.env` file if needed):
```bash
# Add your API keys and configuration
OPENAI_API_KEY=your_key_here
```

5. Start the backend server:
```bash
python main.py
```

The API will be available at `http://localhost:8000`
API documentation: `http://localhost:8000/docs`

#### Frontend Setup

1. Navigate to the frontend directory:
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

The application will be available at `http://localhost:3000`

### Docker Setup

Start both services using Docker Compose:

```bash
docker-compose -f docker-compose.dev.yml up
```

This will start:
- Backend on `http://localhost:8000`
- Frontend on `http://localhost:3000`

## Configuration

### Backend Configuration

Configuration is managed through `backend/app/settings.toml`:

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
credentials = true
methods = ["*"]
headers = ["*"]
```

### Frontend Configuration

The frontend proxies API requests to the backend. Configure the proxy in `package.json`:

```json
{
  "proxy": "http://localhost:8000"
}
```

For production, set the `REACT_APP_API_URL` environment variable.

## API Documentation

### Endpoints

#### Health Check
```
GET /api/v1/status
```
Returns the API status and version information.

#### Architecture Review
```
POST /api/v1/review
```
Submit an architecture design document for AI-powered review.

**Request Body:**
```json
{
  "content": "Architecture design document content",
  "format": "markdown"
}
```

**Response:**
```json
{
  "review_id": "uuid",
  "analysis": {
    "scalability": "...",
    "security": "...",
    "reliability": "...",
    "recommendations": ["..."]
  },
  "timestamp": "2026-03-01T12:00:00Z"
}
```

### Interactive API Documentation

FastAPI provides automatic interactive API documentation:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Testing

### Backend Tests

```bash
cd backend
source venv/bin/activate
pytest
```

Run with coverage:
```bash
pytest --cov=app tests/
```

### Frontend Tests

```bash
cd frontend
npm test
```

Run all tests without watch mode:
```bash
npm test -- --watchAll=false
```

## Development

### Code Style

#### Backend
- **Formatter**: Black
- **Linter**: Flake8
- **Type Checker**: MyPy

```bash
# Format code
black .

# Lint code
flake8 .

# Type check
mypy .
```

#### Frontend
- **Language**: TypeScript with strict mode
- **Testing**: React Testing Library

### Adding New Features

1. Create a new branch for your feature
2. Implement changes following the existing code structure
3. Add tests for new functionality
4. Update documentation as needed
5. Submit a pull request

## Architecture Decision Records (ADRs)

The `adrs/` directory contains architecture decision records documenting important design choices. These serve as:
- Sample inputs for the AI review system
- Documentation of architectural patterns
- Examples of system design scenarios

Current ADRs:
- `adr-1.md`: MedSync Pro - Medical records platform design
- `adr-2.md`: HealthSync - Telemedicine platform architecture

## Deployment

### Production Build

#### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

#### Frontend
```bash
cd frontend
npm run build
```

The build artifacts will be in the `frontend/build/` directory, ready for deployment to a static hosting service.

### Docker Production

Build production images:
```bash
docker build -t system-design-mentor-backend ./backend
docker build -t system-design-mentor-frontend ./frontend
```

## Environment Variables

### Backend
- `OPENAI_API_KEY`: OpenAI API key for AI services
- `ENVIRONMENT`: Application environment (dev/staging/prod)
- `DEBUG`: Enable debug mode (true/false)
- `SERVER_HOST`: Server host address
- `SERVER_PORT`: Server port number

### Frontend
- `REACT_APP_API_URL`: Backend API URL
- `NODE_ENV`: Node environment (development/production)

## Troubleshooting

### Port Already in Use

The `dev.sh` script automatically handles port conflicts. If running manually:

```bash
# Find process using port 8000
lsof -ti:8000

# Kill the process
kill -9 $(lsof -ti:8000)
```

### Backend Dependencies Issues

```bash
cd backend
rm -rf venv
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

### Frontend Dependencies Issues

```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues, questions, or contributions, please open an issue on the project repository.

## Acknowledgments

- Built with FastAPI and React
- Powered by CrewAI for multi-agent AI orchestration
- Uses OpenAI for natural language processing
