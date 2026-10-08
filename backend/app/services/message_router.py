from pydantic import BaseModel, ValidationError

from app.core.errors import GameError
from app.models.player_action_enum import PlayerActionEnum
from app.services.connection_manager import ConnectionManager
from app.services.room_manager import RoomManager
import json
from app.models.messages import InviteMsg, InviteResponseMsg, ErrorMsg, client_message_adapter


class MessageRouter:
    "validates every incoming message and sends it to the room of that user"

    def __init__(self, connections: ConnectionManager, rooms: RoomManager) -> None:
        self.connections = connections
        self.rooms = rooms


    async def route(self, username: str, raw: str):
        # 1. Intercepción de mensajes del Lobby en texto crudo
        try:
            data = json.loads(raw)
            msg_type = data.get("type")

            if msg_type == "invite":
                invite_msg = InviteMsg(sender=username, target=data.get("target"))
                await self.connections.send(data.get("target"), invite_msg)
                return

            if msg_type == "invite_response":
                response_msg = InviteResponseMsg(
                    sender=username, 
                    target=data.get("target"), 
                    accepted=data.get("accepted")
                )
                await self.connections.send(data.get("target"), response_msg)
                
                if data.get("accepted"):
                    await self.rooms.start_private_game(data.get("target"), username)
                return
        except Exception:
            pass # Si falla el parseo, dejamos que el validador original se encargue

        # 2. Flujo original: Validación estricta para acciones de la mesa (hit, stand)
        try:
            message = client_message_adapter.validate_json(raw)
        except ValidationError:
            await self.connections.send(username, ErrorMsg(code="INVALID_MESSAGE", message="Invalid message"))
            return

        # 3. Ejecución de lógica de juego
        try:
            room = self.rooms.room_of(username)
            if room is None:
                raise GameError("NOT_IN_GAME", "You are not in a game")

            await room.handle_player_action(username, PlayerActionEnum(message.type))
        except GameError as err:
            await self.connections.send(username, ErrorMsg(code=err.code, message=err.message))

class ScoreUpdateMsg(BaseModel):
    """Payload enviado al finalizar la partida para actualizar el ranking."""
    type: str = "score_update"
    username: str
    result: str

