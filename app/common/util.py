from datetime import datetime, timezone

from app.common.logger import logger


def log_task_done(output, agent_name: str = "") -> None:
    """Unified task completion log: timestamp, agent, task name, status, token usage."""
    try:
        name = str(output.name or output.description[:40] or "unknown") if output else "unknown"

        tokens = ""
        if output and output.messages:
            last = output.messages[-1]
            usage = last.get("usage") if isinstance(last, dict) else None
            if usage:
                tokens = " | tokens(p=%s,c=%s,t=%s)" % (
                    usage.get("prompt_tokens", "?"),
                    usage.get("completion_tokens", "?"),
                    usage.get("total_tokens", "?"),
                )

        logger.info("TASK_DONE | task=%s | status=completed%s", name, tokens)
    except Exception as exc:
        logger.error("Failed to log task completion: %s", exc)


__all__ = ["log_task_done"]
