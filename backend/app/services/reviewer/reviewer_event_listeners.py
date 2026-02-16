import json
from queue import Queue
import re
from app.models.api_schema import ReviewResponse
from crewai.events import (
    CrewKickoffCompletedEvent,
    AgentExecutionStartedEvent,
    TaskCompletedEvent
)
from crewai.events import BaseEventListener

class ReviewerEventListener(BaseEventListener):
    def __init__(self, queue: Queue):
        super().__init__()
        self.queue = queue

    def setup_listeners(self, crewai_event_bus):
        """Set up event listeners with the CrewAI event bus."""

        @crewai_event_bus.on(CrewKickoffCompletedEvent)
        def on_crew_completed(source, event):
            message = ReviewResponse(
                status="completed", 
                message=f"'{event.crew_name}' has completed design review!"
            )
            self.queue.put(message)

        @crewai_event_bus.on(AgentExecutionStartedEvent)
        def on_agent_execution_started(source, event):
            
            metadata = source.fingerprint.metadata
            display_name = metadata.get("display_name", 'Reviewer')
            thinking_msg = metadata.get("thinking_style", "Thinking...")
            
            message = ReviewResponse(
                agent=display_name,
                message_type="thinking",
                message=thinking_msg,
                source=source,
                event=event,
                status="executing")
            self.queue.put(message)

        @crewai_event_bus.on(TaskCompletedEvent)
        def on_task_completed(source, event):            
            raw_text = event.output.raw
    
            # If Pydantic parsing failed, we try to manually find the JSON block
            if not event.output.pydantic:
                # Look for JSON between triple backticks
                json_match = re.search(r'```json\n(.*?)\n```', raw_text, re.DOTALL)
                if json_match:
                    try:
                        # Manually validate and send
                        json_data = json.loads(json_match.group(1))
                        # ... send to queue ...
                    except:
                        pass
            else:
                event_output = event.output.pydantic.model_dump(exclude_none=True)

            assigned_agent = source.agent if source.agent else None
            
            if assigned_agent:
                agent_name = assigned_agent.fingerprint.metadata.get("display_name", assigned_agent.role)
            else:
                agent_name = "Agent"    

            message = ReviewResponse(
                agent = agent_name,
                message_type="result",
                source=source,
                event=event,
                report=event_output,
                status="executed", 
            )
            self.queue.put(message)

__all__ = ["ReviewerEventListener"]