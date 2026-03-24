# Configuration Guide

This guide covers all configuration options for System Design Mentor.

---

## Backend Configuration

The backend uses a layered configuration system. Priority order (highest to lowest):

1. Environment variables
2. `app/settings.toml`
3. Hardcoded defaults in `Settings`

### settings.toml

Located at `app/settings.toml`. This is the primary configuration file.

```toml
[app]
name = "System Design Mentor API"
description = "AI-powered architecture analysis and recommendations"
version = "1.0.0"
environment = "development"

[logging]
log_level = "DEBUG"

[server]
host = "0.0.0.0"
port = 8000
reload = true

[cors]
origins = ["http://localhost:3000", "http://127.0.0.1:3000"]
credentials = true
methods = ["*"]
headers = ["*"]

[reviewer]
max_file_size_mb = 5

[chat]
model = "openai/gpt-4o"
temperature = 0.3
max_tokens = 1024

[azure_llm]
temperature = 1.0
top_p = 1.0
max_completion_tokens = 4096
```

### Environment Variables

Create a `.env` file in the root directory (or export variables directly):

```bash
# OpenAI (required unless using Azure)
OPENAI_API_KEY=sk-your-api-key-here

# Azure OpenAI (required if USE_AZURE_OPENAI=true)
USE_AZURE_OPENAI=false
AZURE_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_API_KEY=your-azure-api-key
AZURE_DEPLOYMENT_NAME=your-deployment-name
AZURE_API_VERSION=2024-02-01

# App overrides (optional — override settings.toml values)
ENVIRONMENT=production
LOG_LEVEL=INFO
SERVER_HOST=0.0.0.0
SERVER_PORT=8000
```

All `settings.toml` keys can be overridden by environment variables. The `Settings` class (backed by Dynaconf) handles the mapping automatically.

---

## LLM Configuration

### OpenAI (default)

Set `OPENAI_API_KEY` and leave `USE_AZURE_OPENAI` unset or `false`.

The CrewAI agents use models defined in `config/review/v1/agents.yaml` (default: `openai/gpt-4o-mini`).

The chat service uses the model from `settings.toml [chat]` (default: `openai/gpt-4o`).

### Azure OpenAI

Set `USE_AZURE_OPENAI=true` and provide all `AZURE_*` variables. When enabled:

- All CrewAI agents route through the Azure deployment (ignoring per-agent model settings in YAML)
- The chat service also routes through Azure
- Azure generation parameters (`temperature`, `top_p`, `max_completion_tokens`) are read from `settings.toml [azure_llm]`

`LLMService` is the single resolution point — both `create_llm()` (for agents) and `get_litellm_params()` (for chat) apply the same Azure vs OpenAI logic.

---

## Agent Configuration

Agent roles, goals, prompts, and LLM parameters are defined in YAML files:

```
app/config/review/v1/
  agents.yaml   # agent definitions (role, goal, backstory, llm_params)
  tasks.yaml    # task definitions (description, expected_output, async_execution)
```

To change agent behaviour, edit these files directly. The crew class hardcodes the `v1` path.

### Per-agent LLM params (OpenAI only)

Each agent in `agents.yaml` has an `llm_params` block:

```yaml
librarian:
  llm_params:
    model: openai/gpt-4o-mini
    temperature: 0.0
    top_p: 0.1
```

These are ignored when `USE_AZURE_OPENAI=true` — all agents use the Azure deployment in that case.

---

## Frontend Configuration

The frontend is maintained in a separate repository: https://github.com/atieqrehman11/chat-ui

See the frontend repo docs for all configuration options including environment variables and the dev proxy.

---

## CORS Configuration

Configure allowed origins in `settings.toml`:

```toml
[cors]
origins = ["http://localhost:3000", "https://yourdomain.com"]
credentials = true
methods = ["GET", "POST"]
headers = ["Content-Type", "Authorization", "X-Correlation-ID"]
```

For production, always specify exact origins rather than wildcards.

---

## File Upload Limits

```toml
[reviewer]
max_file_size_mb = 5
```

Supported file types: `.txt`, `.md`, `.json`, `.pdf`, `.doc`, `.docx`

The frontend enforces the same limit client-side before any network call. The backend re-validates on receipt.

---

## Logging

The backend uses Python's standard `logging` module with structured output. Log level is controlled via:

```bash
LOG_LEVEL=INFO   # DEBUG | INFO | WARNING | ERROR | CRITICAL
```

All log calls use `%s`-style formatting (never f-strings) per the project's SonarQube rules.

---

## Docker

### Development

```bash
docker-compose -f docker-compose.dev.yml up
```

Pass environment variables via the compose file or a `.env` file in the project root.

### Production

```bash
# Build image
./build-image.sh <image-name> <version>

# Deploy via Terraform (Azure Container Instances)
cd deploy/container
terraform apply
```

---

## Configuration Reference

| Key | Source | Default | Description |
|---|---|---|---|
| `OPENAI_API_KEY` | env | — | OpenAI API key |
| `USE_AZURE_OPENAI` | env | `false` | Enable Azure OpenAI |
| `AZURE_ENDPOINT` | env | — | Azure OpenAI endpoint |
| `AZURE_API_KEY` | env | — | Azure API key |
| `AZURE_DEPLOYMENT_NAME` | env | — | Azure deployment name |
| `AZURE_API_VERSION` | env | — | Azure API version |
| `app.environment` | toml | `development` | Runtime environment |
| `logging.log_level` | toml | `DEBUG` | Log level; also controls FastAPI debug mode (`DEBUG` = on) |
| `server.host` | toml | `0.0.0.0` | Bind host |
| `server.port` | toml | `8000` | Bind port |
| `server.reload` | toml | `true` | Auto-reload on code change |
| `cors.origins` | toml | `[localhost:3000]` | Allowed CORS origins |
| `reviewer.max_file_size_mb` | toml | `5` | Max upload file size |
| `chat.model` | toml | `openai/gpt-4o` | Chat LLM model |
| `chat.temperature` | toml | `0.3` | Chat LLM temperature |
| `chat.max_tokens` | toml | `1024` | Chat LLM max tokens |
| `azure_llm.temperature` | toml | `1.0` | Azure agent temperature |
| `azure_llm.top_p` | toml | `1.0` | Azure agent top_p |
| `azure_llm.max_completion_tokens` | toml | `4096` | Azure agent max tokens |

For a full list of config key constants, see `app/config/config_keys.py`.
