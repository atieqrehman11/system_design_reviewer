from app.models.api_schema import ReviewResponse
from crewai.events import (
    AgentExecutionStartedEvent,
    TaskCompletedEvent
)
from crewai.events import BaseEventListener

class ReviewerEventListener(BaseEventListener):
    def __init__(self, event_dispatcher=None):
        super().__init__()
        self.dispatcher = event_dispatcher

    def setup_listeners(self, crewai_event_bus):
        """Set up event listeners with the CrewAI event bus."""
        # NOTE: CrewKickoffCompletedEvent is intentionally NOT handled here.
        # The "complete" status is dispatched manually from ReviewerService after
        # save_review() succeeds, ensuring the SQLite row exists before the
        # frontend enters follow-up mode.

        @crewai_event_bus.on(AgentExecutionStartedEvent)
        def on_agent_execution_started(source, event):
            print("Received AgentExecutionStartedEvent")
            metadata = source.fingerprint.metadata
            correlation_id = metadata.get("correlation_id", None)
            if not correlation_id:
                print(f"No correlation_id found in event metadata; skipping dispatch. for event: {event}")
                return  # Don't process events without a correlation_id
            display_name = metadata.get("display_name", 'Reviewer')
            thinking_msg = metadata.get("thinking_style", "Thinking...")
            message = ReviewResponse(
                agent=display_name,
                message_type="thinking",
                message=thinking_msg,
                source=source,
                event=event,
                status="executing")
            self.dispatcher.dispatch(correlation_id, message)

        @crewai_event_bus.on(TaskCompletedEvent)
        def on_task_completed(source, event):   
            print("Received TaskCompletedEvent")
            
            if not event.output or not event.output.pydantic:
                print("TaskCompletedEvent has no pydantic output; skipping dispatch.")
                return

            event_output = event.output.pydantic.model_dump(exclude_none=True)
            assigned_agent = source.agent if source.agent else None
            correlation_id = None
            agent_name = 'Reviewer'

            if assigned_agent:
                agent_name = assigned_agent.fingerprint.metadata.get("display_name", assigned_agent.role)
                correlation_id = assigned_agent.fingerprint.metadata.get("correlation_id", None)
            
            if not correlation_id:
                print(f"No correlation_id found in event metadata; skipping dispatch. for event: {event}, agent: {agent_name}")
                return  # Don't process events without a correlation_id
            
            message = ReviewResponse(
                agent=agent_name,
                message_type="result",
                source=source,
                event=event,
                report=event_output,
                status="executed", 
            )

            self.dispatcher.dispatch(correlation_id, message)

__all__ = ["ReviewerEventListener"]