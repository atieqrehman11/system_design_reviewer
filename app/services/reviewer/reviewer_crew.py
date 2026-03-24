from typing import List

from crewai import Agent, Crew, LLM, Process, Task, TaskOutput
from crewai.agents.agent_builder.base_agent import BaseAgent
from crewai.project import CrewBase, agent, before_kickoff, crew, task

from app.common.constants import DESIGN_KEYWORDS
from app.common.exception_handlers import ValidationFailedException
from app.common.logger import logger
from app.config.config import settings
from app.config.config_keys import LOG_LEVEL, CREWAI_TRACING_ENABLED
from app.models.blueprint_schema import DocBlueprint
from app.models.final_report_schema import ReviewReport
from app.models.performance_schema import PerformanceReview
from app.models.security_schema import SecurityReview
from app.services.llm import LLMService


@CrewBase
class DesignReviewerCrew():
    llm_service = LLMService()
    _verbose = settings.get(LOG_LEVEL, "INFO").upper() == "DEBUG"
    _tracing = settings.get_bool(CREWAI_TRACING_ENABLED, False)

    agents_config = '../../config/review/v1/agents.yaml'
    tasks_config  = '../../config/review/v1/tasks.yaml'

    agents: List[BaseAgent]
    tasks: List[Task]

    @staticmethod
    def _looks_like_design_doc(text: str) -> bool:
        """Return True if the text contains at least one design/architecture keyword."""
        lower = text.lower()
        return any(kw in lower for kw in DESIGN_KEYWORDS)

    def _create_llm(self, agent_name: str) -> LLM:
        """Helper to create an LLM for an agent.

        agents_config is a string path at class definition time but CrewAI
        replaces it with a dict after loading the YAML. Guard against the
        string case so this method is safe to call at any point.
        """
        if not isinstance(self.agents_config, dict):
            logger.warning(
                "agents_config is not yet loaded (got %s); using default LLM params.",
                type(self.agents_config).__name__,
            )
            return self.llm_service.create_llm({})
        agent_config = self.agents_config.get(agent_name, {})
        llm_params = agent_config.get('llm_params', {})
        return self.llm_service.create_llm(llm_params)

    def _validate_extraction(self, output: TaskOutput) -> None:
        if output.pydantic and hasattr(output.pydantic, 'is_valid'):
            if not output.pydantic.is_valid:
                errors = getattr(output.pydantic, 'validation_errors', [])
                logger.warning("Blueprint validation warnings (non-blocking): %s", errors)

    # --- AGENT FACTORY ---
    def _create_agent(self, agent_name: str) -> Agent:
        config = self.agents_config[agent_name]

        created_agent = Agent(
            role=config.get('role'),
            goal=config.get('goal'),
            llm=self._create_llm(agent_name),
            verbose=self._verbose,
            config=config,
        )

        created_agent.fingerprint.metadata.update({
            "display_name": config.get("display_name"),
            "thinking_style": config.get("thinking_style"),
        })

        return created_agent

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
        return Task(
            config=self.tasks_config['extract_blueprint_task'],
            output_pydantic=DocBlueprint,
            callback=self._validate_extraction,
        )

    @task
    def performance_review_task(self) -> Task:
        return Task(
            config=self.tasks_config['performance_review_task'],
            context=[self.extract_blueprint_task()],
            output_pydantic=PerformanceReview,
        )

    @task
    def security_review_task(self) -> Task:
        return Task(
            config=self.tasks_config['security_review_task'],
            context=[self.extract_blueprint_task()],
            output_pydantic=SecurityReview,
        )

    @task
    def final_review_task(self) -> Task:
        return Task(
            config=self.tasks_config['final_review_task'],
            context=[
                self.extract_blueprint_task(),
                self.performance_review_task(),
                self.security_review_task(),
            ],
            output_pydantic=ReviewReport,
        )

    # --- CREW ---
    @before_kickoff
    def validate_input_content(self, inputs: dict) -> dict:
        doc = inputs.get('design_doc', '').strip()
        if len(doc) == 0:
            raise ValidationFailedException(
                feedback="Please provide a design document to review."
            )
        if not self._looks_like_design_doc(doc):
            raise ValidationFailedException(
                feedback=(
                    "I'm designed to review system design and architecture documents. "
                    "Please submit a design document — such as an architecture overview, "
                    "API design, or technical specification — and I'll be happy to help."
                )
            )
        if len(doc) < 50:
            raise ValidationFailedException(
                feedback="The document is too short to analyze. Please provide more detail."
            )
        if len(doc) > 50000:
            raise ValidationFailedException(
                feedback="The document exceeds the maximum allowed length of 50,000 characters."
            )

        # Stamp correlation_id onto each agent's fingerprint so event handlers
        # can read it even when fired from CrewAI's internal thread pool
        # (where the ContextVar may not be set).
        correlation_id = inputs.get('correlation_id')
        logger.debug("[DesignReviewerCrew] before_kickoff: correlation_id=%s, agents=%s", correlation_id, [a.role for a in self.agents])
        if correlation_id:
            for agent in self.agents:
                agent.fingerprint.metadata['correlation_id'] = correlation_id
                logger.debug("[DesignReviewerCrew] stamped correlation_id on agent: %s", agent.role)

        return inputs

    @crew
    def crew(self) -> Crew:
        return Crew(
            agents=self.agents,
            tasks=self.tasks,
            process=Process.sequential,
            verbose=self._verbose,
            cache=False,
            tracing=self._tracing,
        )


__all__ = ['DesignReviewerCrew']
