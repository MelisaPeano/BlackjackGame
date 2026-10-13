import os
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseModel):
    """Configuración global de la aplicación obtenida desde variables de entorno."""
    PROJECT_NAME: str = "Blackjack Game API"
    MONGODB_URI: str = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    DB_NAME: str = os.getenv("DB_NAME", "blackjack_db")
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379")
    
  
    SECRET_KEY: str | None = os.getenv("SECRET_KEY")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 

settings = Settings()

if not settings.SECRET_KEY:
    raise ValueError("⚠️ ERROR CRÍTICO: La variable SECRET_KEY no está configurada en el entorno (.env).")