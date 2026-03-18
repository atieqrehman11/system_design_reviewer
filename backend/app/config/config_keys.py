"""
Configuration keys constants
Makes it easier to use configuration keys throughout the application
"""

# Application metadata
APP_NAME = "app_name"
APP_DESCRIPTION = "app_description"
APP_VERSION = "app_version"
APP_ENVIRONMENT = "environment"
APP_DEBUG = "debug"

# Server configuration
SERVER_HOST = "host"
SERVER_PORT = "port"
SERVER_RELOAD = "reload"

# CORS configuration
CORS_ORIGINS = "cors_origins"
CORS_CREDENTIALS = "cors_credentials"
CORS_METHODS = "cors_methods"
CORS_HEADERS = "cors_headers"

# API configuration
API_V1_PREFIX = "api_v1_prefix"

# CrewAI configuration
OPENAI_API_KEY = "openai_api_key"
OPENAI_MODEL_NAME = "openai_model_name"

CREWAI_VERBOSE = "crewai_verbose"
CREWAI_MANAGER_LLM = "crewai_manager_llm"

USE_AZURE_OPENAI="use_azure_openai"
AZURE_API_VERSION="azure_api_version"
AZURE_ENDPOINT="azure_endpoint"
AZURE_API_KEY="azure_api_key"
AZURE_DEPLOYMENT_NAME="azure_deployment_name"

# Azure LLM generation params
AZURE_LLM_TEMPERATURE = "azure_llm_temperature"
AZURE_LLM_TOP_P = "azure_llm_top_p"
AZURE_LLM_MAX_COMPLETION_TOKENS = "azure_llm_max_completion_tokens"

# Chat LLM configuration
CHAT_MODEL = "chat_model"
CHAT_TEMPERATURE = "chat_temperature"
CHAT_MAX_TOKENS = "chat_max_tokens"

# Storage
DB_PATH = "db_path"
