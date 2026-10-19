import json
import logging
from typing import Optional
from pydantic import ValidationError

from app.core.errors import GameError
from app.core.event_bus import EventBus
from app.core.events import PlayerActionSubmitted
from app.models.messages import (
    ErrorMsg,
    InviteMsg,
    InviteResponseMsg,
    ScoreUpdateMsg,
    WaitingMsg,
    MatchmakingCancelledMsg,
    client_message_adapter,
)
from app.models.player_action_enum import PlayerActionEnum
from app.services.connection_manager import ConnectionManager
from app.services.room_manager import RoomManager

logger = logging.getLogger("blackjack.message_router")

class MessageRouter:
    """
    Enrutador orientado a eventos:
    Valida los mensajes entrantes de WebSocket y desacopla la ejecución de las jugadas
    publicando eventos en el EventBus en lugar de procesarlas de manera síncrona.
    """

    def __init__(
        self,
        connections: ConnectionManager,
        rooms: RoomManager,
        event_bus: Optional[EventBus] = None,
    ) -> None:
        self.connections = connections
        self.rooms = rooms
        self.event_bus = event_bus

        # Suscribir el manejador de jugadas encoladas en el EventBus si está presente
        if self.event_bus:
            self.event_bus.subscribe("player_action_submitted", self._on_player_action_event)

    async def route(self, username: str, raw: str) -> None:
        """Enruta mensajes entrantes desde el cliente WebSocket."""
        # 1. Intercepción de mensajes del Lobby en formato JSON crudo
        try:
            data = json.loads(raw)
            msg_type = data.get("type")
        except Exception as e:
            logger.warning("Fallo al procesar el JSON base: %s", e)
            msg_type = None

        if msg_type == "invite":
            try:
                invite_msg = InviteMsg(sender=username, target=data.get("target"))
                await self.connections.send(data.get("target"), invite_msg)
            except Exception as e:
                logger.error("[ROUTER ERROR] Fallo creando o enviando InviteMsg: %s", e)
            return

        if msg_type == "invite_response":
            try:
                response_msg = InviteResponseMsg(
                    sender=username, 
                    target=data.get("target"), 
                    accepted=data.get("accepted")
                )
                await self.connections.send(data.get("target"), response_msg)
                
                if data.get("accepted"):
                    await self.rooms.start_private_game(data.get("target"), username)
            except Exception as e:
                logger.error("[ROUTER ERROR] Fallo procesando InviteResponseMsg: %s", e)
            return
        
        # Partida rápida: el jugador entra a la cola al presionar "Entrar a la Mesa"
        if msg_type == "join_matchmaking":
            current_room = self.rooms.room_of(username)
            if current_room is not None and current_room.game_state.value != "FINISHED":
                await self.connections.send(
                    username,
                    ErrorMsg(code="ALREADY_IN_GAME", message="Ya te encuentras en una partida."),
                )
                return

            room = await self.rooms.join_matchmaking(username)
            if room is None:
                await self.connections.send(username, WaitingMsg())
            return

        # Cancelar búsqueda de matchmaking
        if msg_type == "cancel_matchmaking":
            self.rooms.cancel_waiting(username)
            await self.connections.send(username, MatchmakingCancelledMsg())
            return

        # El jugador abandona la partida en curso (pierde y el rival gana)
        if msg_type == "leave_game":
            if self.rooms.room_of(username) is None:
                await self.connections.send(
                    username,
                    ErrorMsg(code="NOT_IN_GAME", message="No te encuentras en una partida activa."),
                )
            else:
                await self.rooms.leave_game(username)
            return

        # El jugador regresa al lobby tras finalizar la partida o cancelar
        if msg_type == "leave_table":
            self.rooms.cancel_waiting(username)
            await self.rooms.leave_table(username)
            return

        # --- LÓGICA PARA EL SCOREBOARD Y PERSISTENCIA DE APUESTAS / FICHAS ---
        if msg_type == "score_update":
            try:
                score_msg = ScoreUpdateMsg(**data)
                if username != score_msg.username:
                    logger.warning(
                        "El usuario %s intentó reportar un resultado para %s",
                        username,
                        score_msg.username,
                    )
                else:
                    logger.info("Resultado de juego registrado por el servidor; verificando si hay ajuste de fichas.")
                    chips_delta = getattr(score_msg, "chips_delta", 0) or data.get("chips_delta", 0)
                    if isinstance(chips_delta, int) and chips_delta != 0:
                        try:
                            from app.services.user_service import UserService
                            user_service = UserService()
                            new_chips = await user_service.update_chips(username, chips_delta)
                            await self.connections.send(
                                username,
                                {"type": "chips_updated", "chips": new_chips, "delta": chips_delta}
                            )
                        except Exception as chip_err:
                            logger.warning("Fallo al actualizar saldo de fichas para %s: %s", username, chip_err)
            except ValidationError as e:
                logger.error("[ROUTER ERROR] Fallo procesando score_update: %s", e)
            except Exception as e:
                logger.error("[ROUTER ERROR] Fallo inesperado procesando score_update: %s", e)
            return

        # 2. Validación estricta del esquema de jugadas de la mesa (hit, stand)
        try:
            message = client_message_adapter.validate_json(raw)
        except ValidationError:
            await self.connections.send(
                username,
                ErrorMsg(code="INVALID_MESSAGE", message="Mensaje o acción inválida."),
            )
            return

        # 3. Desacoplamiento orientado a eventos para las jugadas
        room = self.rooms.room_of(username)
        if room is None:
            await self.connections.send(
                username,
                ErrorMsg(code="NOT_IN_GAME", message="No te encuentras en una partida activa."),
            )
            return

        if self.event_bus:
            # Emisión no bloqueante: desacopla el WebSocket publicando el evento al broker
            self.event_bus.publish(
                PlayerActionSubmitted(
                    room_id=room.room_id,
                    username=username,
                    action=message.type,
                )
            )
        else:
            # Modo directo de contingencia si no se inyectó el event bus
            try:
                await room.handle_player_action(username, PlayerActionEnum(message.type))
            except GameError as err:
                await self.connections.send(username, ErrorMsg(code=err.code, message=err.message))

    async def _on_player_action_event(self, event: PlayerActionSubmitted) -> None:
        """Consumidor asíncrono invocado por el EventBus para despachar la jugada a la sala."""
        room = self.rooms.active_rooms.get(event.room_id)
        if not room:
            return

        try:
            await room.handle_player_action(event.username, PlayerActionEnum(event.action))
        except GameError as err:
            logger.warning(
                "Error en jugada del usuario %s en sala %s: %s",
                event.username,
                event.room_id,
                err.message,
            )
            await self.connections.send(event.username, ErrorMsg(code=err.code, message=err.message))
        except Exception as err:
            logger.error("Error inesperado al procesar jugada: %s", err)
            await self.connections.send(
                event.username,
                ErrorMsg(code="INTERNAL_ERROR", message="Error interno procesando jugada."),
            )