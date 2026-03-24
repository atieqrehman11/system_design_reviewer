from contextvars import ContextVar, Token

correlation_id_var: ContextVar[str] = ContextVar("correlation_id", default="-")


def get_correlation_id() -> str:
    """Return the correlation ID for the current execution context."""
    return correlation_id_var.get()


def set_correlation_id(correlation_id: str) -> Token:
    """Set the correlation ID for the current execution context. Returns a token for reset."""
    return correlation_id_var.set(correlation_id)


def reset_correlation_id(token: Token) -> None:
    """Reset the correlation ID to its previous value using the token from set_correlation_id."""
    correlation_id_var.reset(token)


__all__ = ["get_correlation_id", "set_correlation_id", "reset_correlation_id"]
