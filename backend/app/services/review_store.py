"""
Review Store — SQLite-backed persistence for review sessions.

Stores the original design document and final report keyed by correlation_id.
Used by the chat service to provide context for follow-up conversations.
"""
import json
import sqlite3
import threading
from contextlib import contextmanager
from pathlib import Path
from typing import Optional

_DB_PATH = Path(__file__).parent.parent / "review_sessions.db"
_lock = threading.Lock()


def _get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(str(_DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


@contextmanager
def _db():
    with _lock:
        conn = _get_connection()
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()


def init_db() -> None:
    """Create the sessions table if it does not exist."""
    with _db() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS review_sessions (
                correlation_id TEXT PRIMARY KEY,
                design_doc     TEXT NOT NULL,
                final_report   TEXT NOT NULL,
                created_at     DATETIME DEFAULT CURRENT_TIMESTAMP
            )
            """
        )


def save_review(correlation_id: str, design_doc: str, final_report: dict) -> None:
    """Persist a completed review session."""
    with _db() as conn:
        conn.execute(
            """
            INSERT INTO review_sessions (correlation_id, design_doc, final_report)
            VALUES (?, ?, ?)
            ON CONFLICT(correlation_id) DO UPDATE SET
                design_doc   = excluded.design_doc,
                final_report = excluded.final_report,
                created_at   = CURRENT_TIMESTAMP
            """,
            (correlation_id, design_doc, json.dumps(final_report)),
        )


def get_review(correlation_id: str) -> Optional[dict]:
    """
    Retrieve a stored review session.
    Returns a dict with keys: correlation_id, design_doc, final_report (dict), created_at.
    Returns None if not found.
    """
    with _db() as conn:
        row = conn.execute(
            "SELECT * FROM review_sessions WHERE correlation_id = ?",
            (correlation_id,),
        ).fetchone()

    if row is None:
        return None

    return {
        "correlation_id": row["correlation_id"],
        "design_doc": row["design_doc"],
        "final_report": json.loads(row["final_report"]),
        "created_at": row["created_at"],
    }


__all__ = ["init_db", "save_review", "get_review"]
