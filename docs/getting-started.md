# Getting Started

This guide will help you set up and run System Design Mentor on your local machine.

## Prerequisites

- **Python 3.10+**
- **Node.js 18+** and **npm**
- **Git**
- **Docker** (optional)
- An **OpenAI API key** (or Azure OpenAI credentials)

---

## Option 1: Quick Start with dev.sh (Recommended)

```bash
git clone <repository-url>
cd system-design-mentor
chmod +x dev.sh
./dev.sh full
```

This sets up the Python virtualenv, installs all dependencies, and starts both services:

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- Swagger UI: http://localhost:8000/docs

---

## Option 2: Manual Setup

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

Backend starts on http://localhost:8000.

### Frontend

```bash
cd frontend
npm install
npm start
```

Frontend starts on http://localhost:3000.

---

## Option 3: Docker

```bash
docker-compose -f docker-compose.dev.yml up
```

---

## Configuration

Create a `.env` file in the project root:

```bash
OPENAI_API_KEY=sk-your-api-key-here
```

For Azure OpenAI:

```bash
USE_AZURE_OPENAI=true
AZURE_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_API_KEY=your-azure-api-key
AZURE_DEPLOYMENT_NAME=your-deployment-name
AZURE_API_VERSION=2024-02-01
```

See the [Configuration Guide](configuration.md) for all available options.

---

## Verifying the Installation

1. Visit http://localhost:8000/docs — Swagger UI should load
2. Call `GET /api/v1/status` — should return `{"status": "healthy", ...}`
3. Visit http://localhost:3000 — the chat interface should appear

---

## Submitting Your First Review

1. Open http://localhost:3000
2. Paste an architecture description or upload a file (`.txt`, `.md`, `.pdf`, `.doc`, `.docx`, `.json`)
3. Click **Submit**
4. Watch the agents stream their analysis in real time
5. Once complete, ask follow-up questions in the chat input

---

## Development Commands

### Backend

```bash
cd backend
source venv/bin/activate

python main.py              # start server
pytest                      # run tests
pytest --cov=app tests/     # with coverage
```

### Frontend

```bash
cd frontend

npm start                           # dev server
npm test -- --watchAll=false        # run tests once
npm run build                       # production build
```

### dev.sh

```bash
./dev.sh full       # start both services
./dev.sh backend    # backend only
./dev.sh frontend   # frontend only
./dev.sh test       # run all tests
```

---

## Troubleshooting

**Port already in use**
```bash
lsof -ti:8000 | xargs kill -9
lsof -ti:3000 | xargs kill -9
```

**Python dependency issues**
```bash
cd backend
rm -rf venv
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

**Node dependency issues**
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

**OpenAI errors**
- Confirm `OPENAI_API_KEY` is set in `.env` and the file is in the project root
- Restart the backend after updating the key

---

## Next Steps

- [API Reference](api-reference.md) — endpoint details and stream event formats
- [Configuration Guide](configuration.md) — all config options including Azure OpenAI
