from contextlib import asynccontextmanager
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv

from app.api.auth import router as auth_router
from app.api.ws import router as websocket_router
from app.core.database import db_manager
from app.core.event_bus import EventBus
from app.services.connection_manager import ConnectionManager
from app.services.message_router import MessageRouter
from app.services.room_manager import RoomManager
from app.services.user_service import UserService

logger = logging.getLogger("blackjack.main")

load_dotenv()

# Inicialización de servicios desacoplados
event_bus = EventBus()
connections = ConnectionManager()
rooms = RoomManager(connections, event_bus)
user_service = UserService()
router_service = MessageRouter(connections, rooms, event_bus)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Ciclo de vida de la aplicación: Inicialización y cierre de recursos (MongoDB, EventBus, etc.)."""
    # 1. Iniciar worker del EventBus
    event_bus.start()

    # 2. Conectar a MongoDB e inicializar índices
    try:
        db_manager.connect()
        await db_manager.init_indexes()
    except Exception as e:
        logger.warning("Aviso de conexión a MongoDB: %s", e)

    yield

    # Cierre ordenado de conexiones
    await event_bus.stop()
    db_manager.close()


app = FastAPI(title="Blackjack Game API", lifespan=lifespan)

# Configuración de CORS para permitir peticiones desde el frontend (React / Vite en Azure y local)
allowed_origins = [
    "https://zealous-ground-097c6b31e.4.azurestaticapps.net",
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
]
custom_origins = [orig.strip() for orig in os.getenv("CORS_ORIGINS", "").split(",") if orig.strip()]
if custom_origins:
    allowed_origins.extend(custom_origins)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https://.*\.azurestaticapps\.net",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inyección de dependencias en el estado global
app.state.connections = connections
app.state.rooms = rooms
app.state.router = router_service
app.state.user_service = user_service
app.state.event_bus = event_bus

# Registro de routers de la API
app.include_router(auth_router, prefix="/api/auth")
app.include_router(auth_router, prefix="/api")  # Alias para compatibilidad directa con el frontend
app.include_router(websocket_router)


@app.get("/")
async def root():
    """Ruta raíz para verificación de salud del servidor."""
    return {"message": "Welcome to the Blackjack Game API"}