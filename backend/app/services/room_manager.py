import uuid

from app.services.connection_manager import ConnectionManager
from app.services.game_room import GameRoom


class RoomManager:
    "creates games and keeps track of active rooms"

    def __init__(self, connections: ConnectionManager) -> None:
        self.connections = connections
        self.active_rooms = {}
        self.user_room = {}
        self.waiting_user = None


    async def join_matchmaking(self, username: str):
        "momentary: the first user waits, the second one starts a game with him"
       
        if self.waiting_user is None:
            self.waiting_user = username
            return None

        first_user = self.waiting_user
        self.waiting_user = None

        room = GameRoom(uuid.uuid4().hex, first_user, username, self.connections)
        self.active_rooms[room.room_id] = room
        self.user_room[first_user] = room.room_id
        self.user_room[username] = room.room_id
        await room.start_game()
        return room


    def cancel_waiting(self, username: str):
        if self.waiting_user == username:
            self.waiting_user = None


    def room_of(self, username: str):
        room_id = self.user_room.get(username)
        if room_id is None:
            return None
        return self.active_rooms.get(room_id)