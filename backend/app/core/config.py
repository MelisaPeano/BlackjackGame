import os
from pydantic import BaseModel


class Settings(BaseModel):
    """Configuración global de la aplicación obtenida desde variables de entorno con valores por defecto."""
    PROJECT_NAME: str = "Blackjack Game API"
    MONGODB_URI: str = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    DB_NAME: str = os.getenv("DB_NAME", "blackjack_db")
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "blackjack-super-secret-production-key-change-in-azure")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # Duración del token JWT: 24 horas


settings = Settings()
