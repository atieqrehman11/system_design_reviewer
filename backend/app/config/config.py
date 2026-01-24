"""
Configuration settings for SystemDesignMentor backend
"""

import os
from typing import List, Any
from pathlib import Path
from dynaconf import Dynaconf
import traceback

class Settings:
    _instance = None
    """Extensible configuration settings with environment variable support"""
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(Settings, cls).__new__(cls)
            # Put your initialization logic here
            print("Settings initialized for the first time")
        return cls._instance
    
    def __init__(self):
        # Initialize Dynaconf as the canonical runtime loader (TOML + env vars)
        base = Path(__file__).parent.parent
        toml_path = base / 'settings.toml'

        if toml_path.exists():
            self._dynaconf = Dynaconf(settings_files=[str(toml_path)], load_dotenv=True)
        else:
            self._dynaconf = Dynaconf()
        
        # Configuration mapping: env_var -> (property_key, default_value, type)
        self._config_map = {
            # Application metadata
            "app_name": ("APP_NAME", "app.name", "System Design Mentor sdf", str),
            "app_description": ("APP_DESCRIPTION", "app.description", "AI-powered architecture analyst", str),
            "app_version": ("APP_VERSION", "app.version", "0.0.0", str),
            
            # Server configuration
            "host": ("SERVER_HOST", "server.host", "0.0.0.0", str),
            "port": ("SERVER_PORT", "server.port", 8000, int),
            "reload": ("SERVER_RELOAD", "server.reload", True, bool),
            
            # CORS configuration
            "cors_origins": ("CORS_ORIGINS", "cors.origins", ["http://localhost:3000"], list),
            "cors_credentials": ("CORS_CREDENTIALS", "cors.credentials", True, bool),
            "cors_methods": ("CORS_METHODS", "cors.methods", ["*"], list),
            "cors_headers": ("CORS_HEADERS", "cors.headers", ["*"], list),
            
            # Environment
            "environment": ("APP_ENVIRONMENT", "app.environment", "development", str),
            "debug": ("APP_DEBUG", "app.debug", True, bool),
            
            # API configuration
            "api_v1_prefix": ("API_V1_PREFIX", "api.v1.prefix", "/api/v1", str),
            
            # CrewAI configuration
            "openai_api_key": ("OPENAI_API_KEY", "openai.api_key", "", str),
            "openai_model_name": ("OPENAI_MODEL_NAME", "openai.model_name", "", str),
            
            #azure configuration
            "use_azure_openai": ("USE_AZURE_OPENAI", "use_azure_openai", False, bool),
            "azure_api_version": ("AZURE_API_VERSION", "azure_api_version", "", str),
            "azure_endpoint": ("AZURE_ENDPOINT","azure_endpoint", "", str),
            "azure_api_key": ("AZURE_API_KEY", "azure_api_key", "", str),
            "azure_deployment_name": ("AZURE_DEPLOYMENT_NAME","azure_deployment_name", "", str),

            "crewai_verbose": ("CREWAI_VERBOSE", "crewai.verbose", True, bool)

        }
        
        # Load all configuration values
        self._config = {}
        self._load_config()
    
    def _load_config(self):
        """Load all configuration values"""
        for key, (env_var, prop_key, default_val, val_type) in self._config_map.items():
            # Try environment variable first
            env_value = os.getenv(env_var)
            if env_value is not None:
                self._config[key] = self._convert_value(env_value, val_type)
            else:
                # Try Dynaconf (YAML + env overrides)
                prop_value = self._get_from_dynaconf(prop_key)

                #print(f"Loading config for {key}: env_var={env_var}, prop_key={prop_key}, prop_value={prop_value}, default_val={default_val}\n")
                if prop_value:
                    self._config[key] = self._convert_value(prop_value, val_type)
                else:
                    # Use default
                    self._config[key] = default_val

    def _get_from_dynaconf(self, dotted_key: str) -> Any:
        """Lookup a dotted key in the Dynaconf settings, returning None if missing."""
        if not dotted_key:
            return None
        try:
            node = self._dynaconf.as_dict()
        except Exception:
            try:
                node = dict(self._dynaconf)
            except Exception:
                return None

        parts = dotted_key.split('.')
        cur = node

        # Walk the nested dict using case-insensitive key matching so keys
        # like "APP" in Dynaconf/TOML map correctly to dotted keys like "app.name".
        for p in parts:
            if not isinstance(cur, dict):
                return None

            # Find a matching key in the current node case-insensitively
            match_key = None
            lower_p = p.lower()
            for k in cur.keys():
                try:
                    if k.lower() == lower_p:
                        match_key = k
                        break
                except Exception:
                    continue

            if match_key is None:
                return None

            cur = cur[match_key]

        return cur
    
    def _convert_value(self, value: Any, val_type: type) -> Any:
        """Convert value to appropriate type with case-insensitivity."""
        
        # If it's already the right type or None, return it
        if isinstance(value, val_type) or value is None:
            return value

        # Ensure value is a string for the following logic
        val_str = str(value).strip()

        if val_type == bool:
            # Added case-insensitivity and more common truthy values
            return val_str.lower() in ('true', '1', 'yes', 'on', 't', 'y')
        
        elif val_type == int:
            try:
                # Handle floats passed as strings (e.g., "1.0")
                return int(float(val_str))
            except (ValueError, TypeError):
                return 0
                
        elif val_type == list:
            if not val_str:
                return []
            return [item.strip() for item in val_str.split(',') if item.strip()]
        
        return val_str
    
    def get(self, key: str, default: Any = None) -> Any:
        """Get configuration value by key"""
        return self._config.get(key, default)
    
    def get_str(self, key: str, default: str = "") -> str:
        """Get string configuration value"""
        return str(self.get(key, default))
    
    def get_int(self, key: str, default: int = 0) -> int:
        """Get integer configuration value"""
        value = self.get(key, default)
        return int(value) if isinstance(value, (int, str)) else default
    
    def get_bool(self, key: str, default: bool = False) -> bool:
        """Get boolean configuration value"""
        value = self.get(key, default)
        return bool(value) if isinstance(value, bool) else default
    
    def get_list(self, key: str, default: List[str] = None) -> List[str]:
        """Get list configuration value"""
        if default is None:
            default = []
        value = self.get(key, default)
        return value if isinstance(value, list) else default
    
    def get_all(self) -> dict:
        """Get all configuration values"""
        return self._config.copy()
    

# Create global settings instance
settings = Settings()

__all__ = ["settings"]