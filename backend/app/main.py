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
from app.core.events import UserLoggedIn
from app.services.audit_service import AuditService
from app.services.connection_manager import ConnectionManager
from app.services.message_router import MessageRouter
from app.services.room_manager import RoomManager
from app.services.user_service import UserService

logger = logging.getLogger("blackjack.main")

load_dotenv()

# Inicialización de servicios desacoplados
event_bus = EventBus()
connections = ConnectionManager()
user_service = UserService()
rooms = RoomManager(connections, event_bus, user_service)
router_service = MessageRouter(connections, rooms, event_bus)
audit_service = AuditService()

for event_type in ("user_login", "game_started", "round_ended", "player_disconnected", "player_left"):
    event_bus.subscribe(event_type, audit_service.handle_event)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Ciclo de vida de la aplicación: Inicialización y cierre de recursos (MongoDB, EventBus, etc.)."""
    # Inicializar MongoDB y el consumidor de eventos de la aplicación.
    try:
        db_manager.connect()
        await db_manager.init_indexes()
    except Exception as e:
        logger.warning("Aviso de conexión a MongoDB: %s", e)

    event_bus.start()
    yield

    await event_bus.wait_until_empty()
    await audit_service.flush()
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
app.state.audit_service = audit_service

# Registro de routers de la API
app.include_router(auth_router, prefix="/api/auth")
app.include_router(auth_router, prefix="/api")  # Alias para compatibilidad directa con el frontend
app.include_router(websocket_router)


@app.get("/")
async def root():
    """Ruta raíz para verificación de salud del servidor."""
    db_status = "disconnected"
    if db_manager.db is not None:
        try:
            await db_manager.db.command("ping")
            db_status = "connected"
        except Exception as e:
            db_status = f"error: {str(e)}"
    return {
        "message": "Welcome to the Blackjack Game API",
        "database": db_status
    }


@app.get("/api/stats")
async def get_stats():
    """Retorna estadísticas en tiempo real del lobby y partidas activas."""
    return {
        "online_users": len(connections.get_online_users()),
        "active_games": rooms.get_active_games_count(),
        "server_status": "ONLINE",
        "protocol": "WSS / TLS (Azure)"
    }