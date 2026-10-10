import logging
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.core.config import settings

logger = logging.getLogger("blackjack.database")


class DatabaseManager:
    """Maneja la conexión asíncrona con MongoDB y el ciclo de vida del cliente."""
    client: Optional[AsyncIOMotorClient] = None
    db: Optional[AsyncIOMotorDatabase] = None

    def connect(self) -> None:
        """Inicializa el cliente de MongoDB conectando al servidor configurado."""
        if not self.client:
            self.client = AsyncIOMotorClient(
                settings.MONGODB_URI,
                serverSelectionTimeoutMS=2000
            )
            self.db = self.client[settings.DB_NAME]
            logger.info("Conectado exitosamente a MongoDB en %s", settings.MONGODB_URI)

    def close(self) -> None:
        """Cierra la conexión con el servidor de MongoDB."""
        if self.client:
            self.client.close()
            self.client = None
            self.db = None
            logger.info("Conexión con MongoDB cerrada correctamente.")

    async def init_indexes(self) -> None:
        """Asegura la creación de índices únicos a nivel de base de datos para evitar usuarios duplicados."""
        if self.db is not None:
            try:
                # Índice único sobre username para garantizar unicidad en la base de datos
                await self.db.users.create_index("username", unique=True)
                logger.info("Índices de MongoDB inicializados correctamente.")
            except Exception as e:
                logger.warning("No se pudieron inicializar los índices de MongoDB: %s", e)


db_manager = DatabaseManager()


def get_database() -> Optional[AsyncIOMotorDatabase]:
    """Retorna la instancia actual de la base de datos MongoDB."""
    return db_manager.db
