"""
Chat Service — follow-up conversation over a completed review session.

Loads the stored design doc + final report from SQLite and calls the LLM
directly (no crew). Streams response chunks as NDJSON.

Uses LLMService.get_litellm_params to resolve model/provider config so
there is a single source of truth for Azure vs OpenAI selection.
"""
import json
from typing import AsyncGenerator, List

from litellm import acompletion

from app.config.config import settings
from app.config.config_keys import CHAT_MODEL, CHAT_TEMPERATURE, CHAT_MAX_TOKENS
from app.services.llm import LLMService

# Maximum number of prior turns kept in context to avoid token overflow
_MAX_HISTORY_TURNS = 10

_SYSTEM_PROMPT = """You are an expert software architect assistant specialising exclusively in \
system design and architectural review.

Your sole purpose is to answer follow-up questions about the design document and review report \
provided below. You may discuss architecture, scalability, security, performance, trade-offs, \
and any findings from the report.

If the user asks anything unrelated to system design, software architecture, or the review at \
hand, respond with exactly this message and nothing else:
"I'm here to help with system design and architectural questions. \
Feel free to ask anything about the review or the design document."

Do not invent components, technologies, or issues that are not present in the document or report.

--- DESIGN DOCUMENT ---
{design_doc}

--- REVIEW REPORT ---
{final_report}
"""


class ChatService:
    def __init__(self) -> None:
        llm_params = {
            "model": settings.get(CHAT_MODEL, "openai/gpt-4o"),
        }
        llm_service = LLMService()
        self._litellm_params: dict = llm_service.get_litellm_params(llm_params)
        self._temperature: float = settings.get(CHAT_TEMPERATURE, 0.3)
        self._max_tokens: int = settings.get(CHAT_MAX_TOKENS, 1024)

    async def stream_reply(
        self,
        design_doc: str,
        final_report: dict,
        messages: List[dict],
    ) -> AsyncGenerator[str, None]:
        """
        Stream a reply to the user's follow-up question.

        Args:
            design_doc:   The original submitted design document.
            final_report: The persisted final review report dict.
            messages:     Conversation history — list of {"role": str, "content": str}.
                          The last entry is the user's current question.

        Yields:
            NDJSON lines: {"chunk": "..."} during streaming, {"status": "complete"} at end.
        """
        system_content = _SYSTEM_PROMPT.format(
            design_doc=design_doc,
            final_report=json.dumps(final_report, indent=2),
        )

        trimmed = messages[-(_MAX_HISTORY_TURNS * 2):]
        llm_messages = [{"role": "system", "content": system_content}, *trimmed]

        try:
            stream = await acompletion(
                messages=llm_messages,
                stream=True,
                temperature=self._temperature,
                max_tokens=self._max_tokens,
                **self._litellm_params,
            )

            async for chunk in stream:
                delta = chunk.choices[0].delta if chunk.choices else None
                if delta and delta.content:
                    yield json.dumps({"chunk": delta.content}) + "\n"

            yield json.dumps({"status": "complete"}) + "\n"

        except Exception as exc:
            yield json.dumps({"status": "error", "message": str(exc)}) + "\n"


__all__ = ["ChatService"]
