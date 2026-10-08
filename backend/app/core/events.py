from datetime import datetime, timezone
from typing import Any, Optional
from uuid import uuid4
from pydantic import BaseModel, Field


class BaseEvent(BaseModel):
    """Clase base inmutable para todos los eventos del sistema orientado a eventos."""
    event_id: str = Field(default_factory=lambda: str(uuid4()))
    event_type: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class PlayerActionSubmitted(BaseEvent):
    """
    Evento emitido cuando un jugador envía una jugada (hit o stand) por WebSocket.
    Desacopla la recepción del socket del procesamiento del turno.
    """
    event_type: str = "player_action_submitted"
    room_id: str
    username: str
    action: str  # "hit" | "stand"


class GameStateUpdated(BaseEvent):
    """
    Evento emitido cuando el estado de una partida cambia (reparto, jugada, turno del dealer).
    Los suscriptores (como ConnectionManager) difunden este estado a los clientes.
    """
    event_type: str = "game_state_updated"
    room_id: str
    state_payload: dict[str, Any]
    target_username: Optional[str] = None  # Si es None, se difunde a todos en la sala


class RoundEnded(BaseEvent):
    """
    Evento emitido cuando finaliza una ronda y se calculan los resultados y premios.
    """
    event_type: str = "round_ended"
    room_id: str
    results: dict[str, str]  # Mapeo: username -> "WIN" | "LOSE" | "DRAW"


class PlayerLeftEvent(BaseEvent):
    """
    Evento emitido cuando un jugador se desconecta o abandona una partida activa.
    """
    event_type: str = "player_left"
    room_id: str
    username: str
