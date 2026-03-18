from typing import ClassVar

from app.common.logger import logger
from app.models.api_schema import ReviewResponse
from crewai.events import AgentExecutionStartedEvent, BaseEventListener, TaskCompletedEvent


class ReviewerEventListener(BaseEventListener):
    """Singleton CrewAI event listener that forwards agent events to the EventDispatcher.

    Uses a class-level _listeners_setup guard (same pattern as CrewAI's own
    TraceCollectionListener) to prevent handler stacking when setup_listeners
    is called more than once — each call creates new closure objects that the
    event bus treats as distinct handlers, causing N-times duplication.
    """

    _instance: ClassVar["ReviewerEventListener | None"] = None
    _listeners_setup: ClassVar[bool] = False

    def __new__(cls, event_dispatcher=None) -> "ReviewerEventListener":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self, event_dispatcher=None):
        if hasattr(self, '_initialized'):
            return
        self.dispatcher = event_dispatcher
        self._initialized = True
        super().__init__()

    def setup_listeners(self, crewai_event_bus):
        """Register CrewAI event handlers.

        Class-level guard prevents double-registration: each call creates new
        closure objects which the event bus stacks as distinct handlers.
        """
        if self._listeners_setup:
            logger.warning("[ReviewerEventListener] setup_listeners called more than once; skipping.")
            return
        ReviewerEventListener._listeners_setup = True

        # NOTE: CrewKickoffCompletedEvent is intentionally NOT handled here.
        # The "complete" status is dispatched manually from ReviewerService after
        # save_review() succeeds, ensuring the SQLite row exists before the
        # frontend enters follow-up mode.

        @crewai_event_bus.on(AgentExecutionStartedEvent)
        def on_agent_execution_started(source, event):
            logger.info("[ReviewerEventListener] Received AgentExecutionStartedEvent")
            metadata = source.fingerprint.metadata
            correlation_id = metadata.get("correlation_id")
            if not correlation_id:
                logger.warning(
                    "[ReviewerEventListener] No correlation_id in metadata; skipping dispatch for event: %s",
                    event,
                )
                return
            message = ReviewResponse(
                agent=metadata.get("display_name", "Reviewer"),
                message_type="thinking",
                message=metadata.get("thinking_style", "Thinking..."),
                status="executing",
            )
            self.dispatcher.dispatch(correlation_id, message)

        @crewai_event_bus.on(TaskCompletedEvent)
        def on_task_completed(source, event):
            logger.info("[ReviewerEventListener] Received TaskCompletedEvent")

            if not event.output or not event.output.pydantic:
                logger.warning(
                    "[ReviewerEventListener] TaskCompletedEvent has no pydantic output; skipping dispatch.",
                )
                return

            event_output = event.output.pydantic.model_dump(exclude_none=True)
            assigned_agent = source.agent if source.agent else None
            correlation_id = None
            agent_name = "Reviewer"

            if assigned_agent:
                agent_name = assigned_agent.fingerprint.metadata.get("display_name", assigned_agent.role)
                correlation_id = assigned_agent.fingerprint.metadata.get("correlation_id")

            if not correlation_id:
                logger.warning(
                    "[ReviewerEventListener] No correlation_id in metadata; skipping dispatch for event: %s, agent: %s",
                    event,
                    agent_name,
                )
                return

            message = ReviewResponse(
                agent=agent_name,
                message_type="result",
                report=event_output,
                status="executed",
            )
            self.dispatcher.dispatch(correlation_id, message)


__all__ = ["ReviewerEventListener"]
