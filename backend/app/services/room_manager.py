from typing import Optional
import uuid

from app.core.event_bus import EventBus
from app.services.connection_manager import ConnectionManager
from app.services.game_room import GameRoom


class RoomManager:
    """
    Gestiona el ciclo de vida de las salas de juego activas,
    el emparejamiento automático (matchmaking) y las partidas privadas por invitación.
    """

    def __init__(self, connections: ConnectionManager, event_bus: Optional[EventBus] = None) -> None:
        self.connections = connections
        self.event_bus = event_bus
        self.active_rooms: dict[str, GameRoom] = {}
        self.user_room: dict[str, str] = {}
        self.waiting_user: Optional[str] = None
        self.waiting_users: list[str] = []

    async def join_matchmaking(self, username: str) -> Optional[GameRoom]:
        """
        Agrega al jugador a la cola de emparejamiento.
        Si ya hay otro jugador esperando, crea una nueva partida automáticamente y la inicia.
        """
        # Si ya hay un jugador esperando distinto al actual, emparejarlos
        if self.waiting_user and self.waiting_user != username:
            host = self.waiting_user
            self.waiting_user = None
            if host in self.waiting_users:
                self.waiting_users.remove(host)
            if username in self.waiting_users:
                self.waiting_users.remove(username)

            room = await self.start_private_game(host, username)
            return room

        # Si no hay nadie esperando, ponerlo en espera
        if self.waiting_user is None:
            self.waiting_user = username
        if username not in self.waiting_users:
            self.waiting_users.append(username)
        return None

    def cancel_waiting(self, username: str) -> None:
        """Remueve al usuario de la sala de espera al desconectarse."""
        if self.waiting_user == username:
            self.waiting_user = None
        if username in self.waiting_users:
            self.waiting_users.remove(username)

    def room_of(self, username: str) -> Optional[GameRoom]:
        """Retorna la sala activa a la que pertenece el usuario, o None si no está jugando."""
        room_id = self.user_room.get(username)
        if room_id is None:
            return None
        return self.active_rooms.get(room_id)

    async def start_private_game(self, host: str, guest: str) -> GameRoom:
        """Crea e inicializa una nueva partida entre dos jugadores (por invitación o matchmaking)."""
        self.cancel_waiting(host)
        self.cancel_waiting(guest)

        room_id = str(uuid.uuid4())
        room = GameRoom(
            room_id=room_id,
            username1=host,
            username2=guest,
            connections=self.connections,
            event_bus=self.event_bus,
        )

        self.active_rooms[room_id] = room
        self.user_room[host] = room_id
        self.user_room[guest] = room_id

        # Iniciar la partida (mezclar y repartir cartas)
        await room.start_game()
        return room

    async def handle_disconnect(self, username: str) -> None:
        """Maneja la desconexión de un usuario limpiando colas o declarando abandono."""
        self.cancel_waiting(username)
        room = self.room_of(username)
        if room:
            await room.handle_player_left(username)
            # Limpiar mapeo si la partida terminó
            room_id = room.room_id
            if room_id in self.active_rooms and room.game_state.value == "FINISHED":
                for player in room.players:
                    self.user_room.pop(player.username, None)
                self.active_rooms.pop(room_id, None)
                await room.close()