from datetime import datetime, timezone
from typing import Any, Optional


def calculate_balance(current_balance: int, delta: int, min_balance: int = 0) -> int:
    """Función pura: calcula el nuevo saldo de fichas asegurando que no baje del mínimo permitido."""
    new_balance = current_balance + delta
    if new_balance < min_balance:
        raise ValueError(f"Balance insuficiente: saldo actual {current_balance}, intento de restar {abs(delta)}")
    return new_balance


def sanitize_username(username: str) -> str:
    """Función pura: normaliza el nombre de usuario eliminando espacios en blanco en los extremos."""
    return username.strip()


def build_user_record(
    username: str,
    hashed_password: str,
    email: Optional[str] = None,
    initial_chips: int = 10000,
    role: str = "player"
) -> dict[str, Any]:
    """Función pura: genera la estructura inmutable del documento de usuario para persistir en la base de datos."""
    return {
        "username": sanitize_username(username),
        "hashed_password": hashed_password,
        "email": email.strip() if email else None,
        "chips": initial_chips,
        "role": role,
        "created_at": datetime.now(timezone.utc),
    }


def map_user_to_dto(user_dict: dict[str, Any]) -> dict[str, Any]:
    """Función pura: proyecta los datos del usuario hacia un DTO público, ocultando contraseñas y hashes sensibles."""
    return {
        "id": str(user_dict.get("_id", user_dict.get("id", ""))),
        "username": user_dict.get("username", ""),
        "email": user_dict.get("email"),
        "chips": int(user_dict.get("chips", 10000)),
        "role": user_dict.get("role", "player"),
        "created_at": user_dict.get("created_at"),
    }
