import logging

from fastapi import WebSocket
from pydantic import BaseModel

from app.core.errors import GameError

logger = logging.getLogger(__name__)

class ConnectionManager:
    "open sockets of the server -> diagram: connectedClients)"

    def __init__(self) -> None:
        self.connected_clients = {}


    def connect(self, username: str, websocket: WebSocket):
        if username in self.connected_clients:
            raise GameError("ALREADY_CONNECTED", "That user already has an open session")
        self.connected_clients[username] = websocket


    def disconnect(self, username: str, websocket: WebSocket):
        if self.connected_clients.get(username) is websocket:
            del self.connected_clients[username]


    async def send(self, username: str, message: BaseModel):
        websocket = self.connected_clients.get(username)
        if websocket is None:
            return
        try:
            await websocket.send_json(message.model_dump(mode="json"))
        except Exception:
            logger.warning("Could not send message to %s", username)

    def get_online_users(self) -> list[str]:
        """Devuelve una lista con los nombres de todos los usuarios conectados."""
        return list(self.connected_clients.keys())

    async def broadcast(self, message: BaseModel):
        """Envía un mensaje a todos los sockets conectados actualmente."""
        for username, websocket in self.connected_clients.items():
            try:
                await websocket.send_json(message.model_dump(mode="json"))
            except Exception:
                logger.warning("Could not broadcast message to %s", username)