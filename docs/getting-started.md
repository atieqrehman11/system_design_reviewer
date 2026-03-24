# Getting Started

This guide covers setting up and running the System Design Mentor backend locally.

The frontend lives in a separate repo: https://github.com/atieqrehman11/chat-ui

## Prerequisites

- **Python 3.10+**
- **Git**
- **Docker** (optional)
- An **OpenAI API key** (or Azure OpenAI credentials)

---

## Option 1: Quick Start with manage.sh (Recommended)

```bash
git clone <repository-url>
cd system-design-mentor
chmod +x manage.sh
./manage.sh
```

This sets up the Python virtualenv, installs all dependencies, and starts the backend:

- Backend API: http://localhost:8000
- Swagger UI: http://localhost:8000/docs

---

## Option 2: Manual Setup

```bash
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

Backend starts on http://localhost:8000.

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

---

## Development Commands

```bash
source venv/bin/activate

python main.py              # start server
pytest                      # run tests
pytest --cov=app tests/     # with coverage
```

Via `manage.sh`:

```bash
./manage.sh             # start API on :8000
./manage.sh test        # run tests
./manage.sh docs        # serve docs locally on :8001
./manage.sh docs:build  # build static docs site
```

---

## Troubleshooting

**Port already in use**
```bash
lsof -ti:8000 | xargs kill -9
```

**Python dependency issues**
```bash
rm -rf venv
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

**OpenAI errors**
- Confirm `OPENAI_API_KEY` is set in `.env` and the file is in the project root
- Restart the backend after updating the key

---

## Next Steps

- [API Reference](api-reference.md) — endpoint details and stream event formats
- [Configuration Guide](configuration.md) — all config options including Azure OpenAI
- [Design Document](design.md) — architecture and key design decisions
