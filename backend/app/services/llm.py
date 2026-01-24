
from crewai import LLM

from app.config.config_keys import (
    USE_AZURE_OPENAI, AZURE_API_VERSION,
    AZURE_ENDPOINT, AZURE_API_KEY,
    AZURE_DEPLOYMENT_NAME
)
from app.config.config import settings

class LLMService():
    def create_llm(self, llm_params: dict) -> LLM:
        """Helper to build an LLM from YAML config"""
        use_azure = settings.get(USE_AZURE_OPENAI, False)
        if use_azure:
            return self._azure_llm(llm_params)
        else:
            return self._openai_llm(llm_params)
        
    def _openai_llm(self, llm_params: dict) -> LLM:
        """Helper to build an OpenAI LLM from YAML config"""
        
        return LLM(
            model=llm_params.get('model'),
            temperature=llm_params.get('temperature'),
            top_p=llm_params.get('top_p')
        )
    
    def _azure_llm(self, llm_params: dict) -> LLM:
        """Helper to build an Azure LLM from YAML config"""
        
        return LLM(
            model='azure/'+settings.get(AZURE_DEPLOYMENT_NAME),
            api_version=settings.get(AZURE_API_VERSION),
            endpoint=settings.get(AZURE_ENDPOINT),
            api_key=settings.get(AZURE_API_KEY),
            drop_params=True,
            additional_drop_params=["stop", "max_tokens"], 
            max_completion_tokens=4096,
            temperature=llm_params.get('temperature'),
            top_p=llm_params.get('top_p')
        )
    
__all__ = ["LLMService"]
