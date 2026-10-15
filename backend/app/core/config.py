import os
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseModel):
    """Configuración global de la aplicación obtenida desde variables de entorno."""
    PROJECT_NAME: str = "Blackjack Game API"
    MONGODB_URI: str = (
        os.getenv("MONGODB_URI")
        or os.getenv("AZURE_COSMOS_CONNECTIONSTRING")
        or os.getenv("AZURE_MONGODB_CONNECTIONSTRING")
        or os.getenv("CUSTOMCONNSTR_MONGODB_URI")
        or os.getenv("CUSTOMCONNSTR_blackjackg-database")
        or os.getenv("COSMOS_CONNECTION_STRING")
        or "mongodb://localhost:27017"
    )
    DB_NAME: str = (
        os.getenv("DB_NAME")
        or os.getenv("AZURE_COSMOS_DATABASE_NAME")
        or "blackjackg-database"
    )
    REDIS_URL: str = (
        os.getenv("REDIS_URL")
        or os.getenv("AZURE_REDIS_CONNECTIONSTRING")
        or "redis://localhost:6379"
    )
    SECRET_KEY: str = (
        os.getenv("SECRET_KEY")
        or os.getenv("APPSETTING_SECRET_KEY")
        or "iAES1s_8rwchlB1_3X9N_kug7bAoYiZzVeTmMaZsgMIeMLy1ucSIUmt10g-SnC0f"
    )
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 

settings = Settings()