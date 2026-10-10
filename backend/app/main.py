from contextlib import asynccontextmanager
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.auth import router as auth_router
from app.api.ws import router as websocket_router
from app.core.database import db_manager
from app.services.connection_manager import ConnectionManager
from app.services.message_router import MessageRouter
from app.services.room_manager import RoomManager
from app.services.user_service import UserService

logger = logging.getLogger("blackjack.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Ciclo de vida de la aplicación: Inicialización y cierre de recursos (MongoDB, etc.)."""
    try:
        db_manager.connect()
        await db_manager.init_indexes()
    except Exception as e:
        logger.warning("Aviso de conexión a MongoDB: %s", e)
    yield
    # Cierre ordenado de conexiones
    db_manager.close()


app = FastAPI(title="Blackjack Game API", lifespan=lifespan)

# Configuración de CORS para permitir peticiones desde el frontend (React / Vite)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Servicios y orquestadores principales en el estado global
connections = ConnectionManager()
rooms = RoomManager(connections)
user_service = UserService()

app.state.connections = connections
app.state.rooms = rooms
app.state.router = MessageRouter(connections, rooms)
app.state.user_service = user_service

# Registro de routers de la API
app.include_router(auth_router, prefix="/api/auth")
app.include_router(auth_router, prefix="/api")  # Alias para compatibilidad directa con el frontend
app.include_router(websocket_router)


@app.get("/")
async def root():
    """Ruta raíz para verificación de salud del servidor."""
    return {"message": "Welcome to the Blackjack Game API"}