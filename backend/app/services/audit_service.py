import asyncio
import logging
from typing import Any

from app.core.database import get_database
from app.core.events import (
    BaseEvent,
    GameStarted,
    PlayerDisconnected,
    PlayerLeftEvent,
    RoundEnded,
    UserLoggedIn,
)

logger = logging.getLogger("blackjack.audit")


class AuditService:
    """Persists security and game lifecycle events without blocking event dispatch."""

    def __init__(self) -> None:
        self._pending_tasks: set[asyncio.Task[None]] = set()

    async def handle_event(self, event: BaseEvent) -> None:
        task = asyncio.create_task(self._persist_event(event))
        self._pending_tasks.add(task)
        task.add_done_callback(self._pending_tasks.discard)

    async def _persist_event(self, event: BaseEvent) -> None:
        records: list[dict[str, Any]]
        common = {
            "timestamp": event.timestamp,
            "event_type": event.event_type,
        }

        if isinstance(event, UserLoggedIn):
            records = [{**common, "username": event.username, "room_id": None}]
        elif isinstance(event, GameStarted):
            records = [
                {**common, "username": username, "room_id": event.room_id}
                for username in event.usernames
            ]
        elif isinstance(event, RoundEnded):
            records = [
                {
                    **common,
                    "username": username,
                    "room_id": event.room_id,
                    "result": result,
                }
                for username, result in event.results.items()
            ]
        elif isinstance(event, (PlayerDisconnected, PlayerLeftEvent)):
            records = [
                {
                    **common,
                    "username": event.username,
                    "room_id": event.room_id,
                }
            ]
        else:
            return

        if not records:
            return

        try:
            database = get_database()
            if database is None:
                logger.warning("MongoDB unavailable; skipping audit event %s", event.event_type)
                return
            await database.audit_logs.insert_many(records)
        except Exception:
            logger.exception("Failed to persist audit event %s", event.event_type)

    async def flush(self) -> None:
        while self._pending_tasks:
            await asyncio.gather(*tuple(self._pending_tasks))
