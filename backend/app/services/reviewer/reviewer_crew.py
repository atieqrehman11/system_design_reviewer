from crewai import Agent, Crew, Process, Task, LLM, TaskOutput
from crewai.project import CrewBase, agent, crew, task, before_kickoff
from crewai.agents.agent_builder.base_agent import BaseAgent

from app.common.exception_handlers import ValidationFailedException
from app.common.util import audit_logging_callback, log_task_metrics
from app.models.final_report_schema import ReviewReport
from app.models.blueprint_schema import DocBlueprint
from app.models.security_schema import SecurityReview
from app.models.performance_schema import PerformanceReview
from typing import List

from app.services.llm import LLMService

@CrewBase
class DesignReviewerCrew():
    llm_service = LLMService()

    # Paths to your config files
    agents_config = '../../config/review/v1/agents.yaml' 
    tasks_config = '../../config/review/v1/tasks.yaml'

    agents: List[BaseAgent]
    tasks: List[Task]

    def _create_llm(self, agent_name: str) -> LLM:
        """Helper to create an LLM for an agent"""
        agent_config = self.agents_config.get(agent_name, {})
        llm_params = agent_config.get('llm_params', {})
        
        return self.llm_service.create_llm(llm_params)
    
    def _validate_extraction(self, output: TaskOutput):
        # Ensure we check the pydantic object correctly
        if output.pydantic and hasattr(output.pydantic, 'is_valid'):
            if not output.pydantic.is_valid:
                raise ValidationFailedException(
                    feedback=getattr(output.pydantic, 'validation_errors', "Invalid doc.")
                )
        
    
    # --- AGENT FACTORY ---
    def _create_agent(self, agent_name: str) -> Agent:
        # 1. Grab the raw dictionary
        config = self.agents_config[agent_name]  # This is the raw config dict for the agent']

        agent = Agent(
            role=config.get('role'),
            goal=config.get('goal'),
            llm=self._create_llm(agent_name),
            verbose=False,
            config=config
        )

        agent.fingerprint.metadata.update({
            "display_name": config.get("display_name"),
            "thinking_style": config.get("thinking_style")
        })

        return agent
    
    @agent
    def librarian(self) -> Agent: 
        return self._create_agent('librarian')
    
    @agent
    def performance_architect(self) -> Agent:  
        return self._create_agent('performance_architect')     

    @agent
    def security_architect(self) -> Agent:
        return self._create_agent('security_architect')

    @agent
    def chief_strategist(self) -> Agent:
        return self._create_agent('chief_strategist')
    

    # --- TASK FACTORY ---    
    @task
    def extract_blueprint_task(self) -> Task:
        return Task(config=self.tasks_config['extract_blueprint_task'], 
                    output_pydantic=DocBlueprint,
                    callback=self._validate_extraction)

    @task
    def performance_review_task(self) -> Task:
        return Task(config=self.tasks_config['performance_review_task'], 
                    context=[self.extract_blueprint_task()],
                    output_pydantic=PerformanceReview,
                    callback=log_task_metrics)

    @task
    def security_review_task(self) -> Task:
        return Task(config=self.tasks_config['security_review_task'], 
                    context=[self.extract_blueprint_task()],
                    output_pydantic=SecurityReview,
                    callback=log_task_metrics)
   
    @task
    def final_review_task(self) -> Task:
        return Task(config=self.tasks_config['final_review_task'], 
                    output_pydantic=ReviewReport,
                    callback=audit_logging_callback)      
              
    # --- CREW ---
    @before_kickoff
    def validate_input_content(self, inputs):
        # Programmatic check: Ensure the input isn't empty or too short
        if len(inputs.get('design_doc', '')) < 50:
            raise ValidationFailedException(feedback="The architecture document is too short to be analyzed.")
        
        # You can even inject a "Validation Required" flag into the context
        inputs['validation_strictness'] = "high"
        return inputs
    
    @crew
    def crew(self) -> Crew:
        return Crew(
            agents=self.agents,
            tasks=self.tasks,
            process=Process.sequential,
            verbose=False,
            cache=False
        )
    
__all__ = ['DesignReviewerCrew']