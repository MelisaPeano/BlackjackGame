from fastapi import FastAPI

# Importar el router y los servicios
from app.api.ws import router as websocket_router
from app.services.connection_manager import ConnectionManager
from app.services.message_router import MessageRouter
from app.services.room_manager import RoomManager

app = FastAPI(title="Blackjack Game API")

connections = ConnectionManager()
rooms = RoomManager(connections)

app.state.connections = connections
app.state.rooms = rooms
app.state.router = MessageRouter(connections, rooms)

app.include_router(websocket_router)

@app.get("/")
async def root():
    return {"message": "Welcome to the Blackjack Game API"}