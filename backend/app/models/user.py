from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, field_validator


class UserRegisterRequest(BaseModel):
    """Esquema de solicitud para registrar un nuevo usuario con credenciales."""
    username: str = Field(..., min_length=3, max_length=32, description="Nombre de usuario único")
    password: str = Field(..., min_length=6, max_length=128, description="Contraseña en texto plano")
    email: Optional[str] = Field(default=None, max_length=128, description="Correo electrónico opcional del usuario")

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str) -> str:
        # Limpieza de espacios y validación de caracteres permitidos
        v = v.strip()
        if not v:
            raise ValueError("El nombre de usuario no puede estar vacío.")
        if not all(c.isalnum() or c in "_-" for c in v):
            raise ValueError("El nombre de usuario solo puede contener letras, números, guiones y guiones bajos.")
        return v


class UserLoginRequest(BaseModel):
    """Esquema de solicitud para iniciar sesión."""
    username: str = Field(..., min_length=1, description="Nombre de usuario registrado")
    password: str = Field(..., min_length=1, description="Contraseña del usuario")


class UserResponse(BaseModel):
    """Esquema de respuesta pública con los datos del usuario (sin datos confidenciales)."""
    id: str
    username: str
    email: Optional[str] = None
    chips: int = 10000
    role: str = "player"
    created_at: Optional[datetime] = None


class TokenResponse(BaseModel):
    """Esquema de respuesta devuelto al autenticar o registrar con éxito (token JWT y usuario)."""
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
