# Configuration Guide

This guide covers all configuration options for System Design Mentor.

## Configuration Files

### Backend Configuration

The backend uses multiple configuration sources:

1. **settings.toml**: Main configuration file
2. **Environment variables**: Override TOML settings
3. **.env file**: Local environment variables

#### settings.toml

Located at `backend/app/settings.toml`:

```toml
[app]
name = "System Design Mentor API"
description = "AI-powered architecture analysis and recommendations"
version = "1.0.0"
environment = "dev"
debug = true

[server]
host = "0.0.0.0"
port = 8000
reload = true

[cors]
origins = ["http://localhost:3000", "http://127.0.0.1:3000"]
credentials = true
methods = ["*"]
headers = ["*"]

[api.v1]
prefix = "/api/v1"

[crewai]
verbose = true
```

### Frontend Configuration

#### package.json

The frontend configuration includes:

```json
{
  "proxy": "http://localhost:8000",
  "dependencies": {
    "react": "^18.2.0",
    "axios": "^1.6.0"
  }
}
```

#### Environment Variables

Create a `.env` file in the `frontend/` directory:

```bash
REACT_APP_API_URL=http://localhost:8000
REACT_APP_ENV=development
```

## Environment Variables

### Backend Environment Variables

Create a `.env` file in the root directory:

```bash
# OpenAI Configuration
OPENAI_API_KEY=sk-your-api-key-here
OPENAI_MODEL=gpt-4
OPENAI_TEMPERATURE=0.7

# Application Settings
ENVIRONMENT=development
DEBUG=true
APP_NAME="System Design Mentor API"
APP_VERSION=1.0.0

# Server Configuration
SERVER_HOST=0.0.0.0
SERVER_PORT=8000
SERVER_RELOAD=true

# CORS Settings
CORS_ORIGINS=["http://localhost:3000","http://127.0.0.1:3000"]

# CrewAI Settings
CREWAI_VERBOSE=true
CREWAI_MAX_ITERATIONS=10

# Logging
LOG_LEVEL=INFO
LOG_FORMAT=json
```

### Frontend Environment Variables

Create `.env` in the `frontend/` directory:

```bash
# API Configuration
REACT_APP_API_URL=http://localhost:8000
REACT_APP_API_TIMEOUT=30000

# Application Settings
REACT_APP_ENV=development
REACT_APP_VERSION=1.0.0

# Feature Flags
REACT_APP_ENABLE_ANALYTICS=false
REACT_APP_ENABLE_DEBUG=true
```

## Configuration by Environment

### Development

Development configuration (default):

```toml
[app]
environment = "dev"
debug = true

[server]
reload = true

[crewai]
verbose = true
```

### Staging

Create `backend/app/settings.staging.toml`:

```toml
[app]
environment = "staging"
debug = false

[server]
reload = false

[cors]
origins = ["https://staging.example.com"]
```

Set environment:
```bash
export ENVIRONMENT=staging
```

### Production

Create `backend/app/settings.production.toml`:

```toml
[app]
environment = "production"
debug = false

[server]
host = "0.0.0.0"
port = 8000
reload = false

[cors]
origins = ["https://example.com"]
credentials = true
methods = ["GET", "POST"]

[crewai]
verbose = false
```

Set environment:
```bash
export ENVIRONMENT=production
```

## API Keys and Secrets

### OpenAI API Key

Required for AI-powered reviews:

1. Get an API key from [OpenAI Platform](https://platform.openai.com/)
2. Add to `.env`:
```bash
OPENAI_API_KEY=sk-your-key-here
```

### Securing Secrets

For production:

1. **Never commit secrets to version control**
2. Use environment variables or secret management services
3. Consider using:
   - AWS Secrets Manager
   - HashiCorp Vault
   - Azure Key Vault
   - Google Secret Manager

Example with AWS Secrets Manager:
```python
import boto3
import json

def get_secret(secret_name):
    client = boto3.client('secretsmanager')
    response = client.get_secret_value(SecretId=secret_name)
    return json.loads(response['SecretString'])
```

## CORS Configuration

Configure Cross-Origin Resource Sharing for frontend access:

```toml
[cors]
origins = [
    "http://localhost:3000",
    "https://yourdomain.com"
]
credentials = true
methods = ["GET", "POST", "PUT", "DELETE"]
headers = ["*"]
```

For production, specify exact origins:
```toml
[cors]
origins = ["https://yourdomain.com"]
methods = ["GET", "POST"]
headers = ["Content-Type", "Authorization"]
```

## Logging Configuration

### Backend Logging

Configure in `settings.toml`:

```toml
[logging]
level = "INFO"
format = "json"
output = "stdout"

[logging.file]
enabled = true
path = "logs/app.log"
max_size_mb = 100
backup_count = 5
```

### Log Levels

- `DEBUG`: Detailed information for debugging
- `INFO`: General informational messages
- `WARNING`: Warning messages
- `ERROR`: Error messages
- `CRITICAL`: Critical issues

Set via environment variable:
```bash
export LOG_LEVEL=DEBUG
```

## Database Configuration (Future)

Placeholder for future database configuration:

```toml
[database]
url = "postgresql://user:password@localhost:5432/dbname"
pool_size = 10
max_overflow = 20
echo = false

[database.redis]
url = "redis://localhost:6379/0"
max_connections = 50
```

## CrewAI Configuration

Configure AI agent behavior:

```toml
[crewai]
verbose = true
max_iterations = 10
timeout_seconds = 300

[crewai.agents]
max_concurrent = 3
retry_attempts = 2
```

Environment variables:
```bash
CREWAI_VERBOSE=true
CREWAI_MAX_ITERATIONS=10
```

## Docker Configuration

### Development

`docker-compose.dev.yml`:
```yaml
services:
  backend:
    environment:
      - ENVIRONMENT=development
      - DEBUG=true
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    volumes:
      - ./backend:/app
```

### Production

`docker-compose.prod.yml`:
```yaml
services:
  backend:
    environment:
      - ENVIRONMENT=production
      - DEBUG=false
    restart: always
```

## Performance Tuning

### Backend Performance

```toml
[server]
workers = 4
timeout = 60
keepalive = 5

[performance]
max_request_size_mb = 10
request_timeout_seconds = 30
```

### Frontend Performance

```bash
# Build optimization
GENERATE_SOURCEMAP=false
INLINE_RUNTIME_CHUNK=false
```

## Monitoring Configuration

### Health Checks

```toml
[monitoring]
health_check_interval = 30
metrics_enabled = true
```

### Metrics

```toml
[metrics]
enabled = true
port = 9090
path = "/metrics"
```

## Configuration Validation

The application validates configuration on startup. Check logs for:

```
INFO: Configuration loaded successfully
INFO: Environment: development
INFO: Debug mode: enabled
```

## Troubleshooting Configuration

### Configuration Not Loading

1. Check file paths are correct
2. Verify TOML syntax
3. Check environment variable names
4. Review logs for errors

### Environment Variables Not Working

1. Ensure variables are exported:
```bash
export OPENAI_API_KEY=your-key
```

2. Check variable names match configuration keys
3. Restart the application after changes

### CORS Issues

If frontend can't connect to backend:

1. Verify CORS origins include frontend URL
2. Check credentials setting
3. Review browser console for CORS errors

## Best Practices

1. **Use environment-specific configs**: Separate dev, staging, and production
2. **Never commit secrets**: Use environment variables or secret managers
3. **Document custom settings**: Add comments to configuration files
4. **Validate on startup**: Ensure configuration is valid before running
5. **Use defaults wisely**: Provide sensible defaults for optional settings
6. **Version control**: Track configuration changes (except secrets)

## Configuration Reference

For a complete list of configuration options, see:
- Backend: `backend/app/config/config_keys.py`
- Frontend: `frontend/src/config/`
- Docker: `docker-compose.*.yml` files
