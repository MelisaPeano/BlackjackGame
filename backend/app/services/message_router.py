from pydantic import ValidationError

from app.core.errors import GameError
from app.models.messages import ErrorMsg, client_message_adapter
from app.models.player_action_enum import PlayerActionEnum
from app.services.connection_manager import ConnectionManager
from app.services.room_manager import RoomManager


class MessageRouter:
    "validates every incoming message and sends it to the room of that user"

    def __init__(self, connections: ConnectionManager, rooms: RoomManager) -> None:
        self.connections = connections
        self.rooms = rooms


    async def route(self, username: str, raw: str):
        # username comes from the session, not from the content of the message
        try:
            message = client_message_adapter.validate_json(raw)
        except ValidationError:
            await self.connections.send(username, ErrorMsg(code="INVALID_MESSAGE", message="Invalid message"))
            return

        try:
            room = self.rooms.room_of(username)
            if room is None:
                raise GameError("NOT_IN_GAME", "You are not in a game")

            await room.handle_player_action(username, PlayerActionEnum(message.type))
        except GameError as err:
            await self.connections.send(username, ErrorMsg(code=err.code, message=err.message))