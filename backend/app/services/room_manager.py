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
        """Agrega al usuario a la sala de espera sin iniciar la partida automáticamente."""
        
        # Inicializamos la lista dinámicamente si la clase aún usaba la variable antigua
        if not hasattr(self, 'waiting_users'):
            self.waiting_users = []

        if username not in self.waiting_users:
            self.waiting_users.append(username)

        # Retornamos None para indicarle al ws.py que el jugador debe quedarse en el Lobby
        return None


    def cancel_waiting(self, username: str):
        """Remueve al usuario de la sala de espera al desconectarse."""
        if hasattr(self, 'waiting_users') and username in self.waiting_users:
            self.waiting_users.remove(username)

    def room_of(self, username: str):
        room_id = self.user_room.get(username)
        if room_id is None:
            return None
        return self.active_rooms.get(room_id)
    
    async def start_private_game(self, host: str, guest: str):
        """Crea una partida privada tras una invitación aceptada, saltándose el matchmaking automático."""
        # 1. Sacar a los jugadores de la cola general si estaban esperando
        self.cancel_waiting(host)
        self.cancel_waiting(guest)

        # 2. Instanciar la nueva sala de juego
        # Ajusta los parámetros si el constructor de tu GameRoom pide un ID u otro dato
        from app.services.game_room import GameRoom
        room = GameRoom(self.connections) 
        
        # 3. Guardar la sala en la memoria del servidor
        # Usa self.active_rooms[room.id] = room si tu estructura usa un diccionario
        self.rooms.append(room) 

        # 4. Añadir a los jugadores (esto suele disparar el reparto inicial en la lógica de GameRoom)
        await room.add_player(host)
        await room.add_player(guest)
        
        return room