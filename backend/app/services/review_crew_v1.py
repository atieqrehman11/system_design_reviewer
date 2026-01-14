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

@CrewBase
class ReviewCrewV1():
    # Paths to your config files
    agents_config = '../config/review/agents.yaml' 
    tasks_config = '../config/review/tasks.yaml'

    agents: List[BaseAgent]
    tasks: List[Task]
    manager_llm: str
    
    def _validate_extraction(self, output: TaskOutput):
        # Ensure we check the pydantic object correctly
        if output.pydantic and hasattr(output.pydantic, 'is_valid'):
            if not output.pydantic.is_valid:
                raise ValidationFailedException(
                    feedback=getattr(output.pydantic, 'validation_errors', "Invalid doc.")
                )
        
    def _create_llm(self, agent_name: str) -> LLM:
        """Helper to build an LLM from YAML config"""
        config = self.agents_config.get(agent_name, {})
        params = config.get('llm_params', {})
        
        return LLM(
            model=config.get('model', 'openai/gpt-4o-mini'),
            temperature=params.get('temperature', 0.1),
            top_p=params.get('top_p', 1.0)
        )
    
    # --- AGENT FACTORY ---

    @agent
    def blueprint_specialist(self) -> Agent:    
        return Agent(config=self.agents_config['blueprint_specialist'], 
                     llm=self._create_llm('blueprint_specialist'))

    @agent
    def performance_specialist(self) -> Agent:       
        return Agent(config=self.agents_config['performance_specialist'], 
                     llm=self._create_llm('performance_specialist'))

    @agent
    def security_specialist(self) -> Agent:
        return Agent(config=self.agents_config['security_specialist'], 
                     llm=self._create_llm('security_specialist'))
    
    @agent
    def chief_architect(self) -> Agent:
        return Agent(config=self.agents_config['chief_architect'], 
                     llm=self._create_llm('chief_architect'))

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
            verbose=True,
            cache=False
        )
    
__all__ = ['ReviewCrewV1']