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

# Example usage:
# from app.config import settings
# from app.config_keys import APP_NAME, SERVER_PORT
# 
# app_name = settings.get(APP_NAME)
# port = settings.get(SERVER_PORT)