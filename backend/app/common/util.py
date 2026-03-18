from app.common.logger import logger


def log_task_metrics(output) -> None:
    """Log task completion metrics. Swallows errors to avoid crashing the crew."""
    try:
        agent_role = str(output.agent)
        task_desc = output.description[:50]
        logger.info("--- TASK COMPLETED --- Task: %s... Agent: %s", task_desc, agent_role)
    except Exception as exc:
        logger.error("Failed to log task metrics: %s", exc)


def audit_logging_callback(output) -> None:
    """Audit callback for the final review task."""
    log_task_metrics(output)
    if not output.raw:
        logger.warning("Architect skipped: No audit data received.")


__all__ = ["log_task_metrics", "audit_logging_callback"]
