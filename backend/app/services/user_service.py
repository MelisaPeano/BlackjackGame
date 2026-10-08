from typing import Any, Optional
from bson import ObjectId
from pymongo.errors import DuplicateKeyError

from app.core.database import get_database
from app.core.errors import GameError
from app.core.security import hash_password, verify_password
from app.domain.user_logic import (
    build_user_record,
    calculate_balance,
    map_user_to_dto,
    sanitize_username,
)
from app.models.user import UserLoginRequest, UserRegisterRequest, UserResponse


class UserService:
    """Capa Orientada a Objetos: Gestiona el estado, persistencia de entrada/salida y orquesta las funciones de dominio."""

    def __init__(self, collection: Optional[Any] = None) -> None:
        self._custom_collection = collection
        # Almacenamiento en memoria para pruebas unitarias sin dependencias externas
        self._in_memory_users: dict[str, dict[str, Any]] = {}

    @property
    def collection(self) -> Any:
        """Obtiene la colección 'users' de MongoDB o el repositorio inyectado."""
        if self._custom_collection is not None:
            return self._custom_collection
        db = get_database()
        if db is not None:
            return db.users
        return None

    async def register_user(self, user_in: UserRegisterRequest) -> UserResponse:
        """Registra un nuevo usuario con contraseña hasheada utilizando funciones puras de dominio."""
        # 1. Normalización y hash seguro
        normalized_username = sanitize_username(user_in.username)
        hashed_pwd = hash_password(user_in.password)
        user_record = build_user_record(
            username=normalized_username,
            hashed_password=hashed_pwd,
            email=user_in.email,
        )

        col = self.collection
        # 2. Persistencia en MongoDB si la base de datos está conectada
        if col is not None:
            existing = await col.find_one({"username": {"$regex": f"^{normalized_username}$", "$options": "i"}})
            if existing:
                raise GameError("USER_ALREADY_EXISTS", f"El usuario '{normalized_username}' ya existe.")

            try:
                result = await col.insert_one(user_record)
                user_record["_id"] = result.inserted_id
            except DuplicateKeyError:
                raise GameError("USER_ALREADY_EXISTS", f"El usuario '{normalized_username}' ya existe.")

            return self._to_response(user_record)

        # 3. Modo alternativo en memoria (para pruebas unitarias)
        if normalized_username.lower() in self._in_memory_users:
            raise GameError("USER_ALREADY_EXISTS", f"El usuario '{normalized_username}' ya existe.")

        user_record["_id"] = str(ObjectId())
        self._in_memory_users[normalized_username.lower()] = user_record
        return self._to_response(user_record)

    async def authenticate_user(self, login_in: UserLoginRequest) -> UserResponse:
        """Valida las credenciales del usuario comparando la contraseña con el hash de bcrypt."""
        normalized_username = sanitize_username(login_in.username)
        col = self.collection

        doc = None
        if col is not None:
            doc = await col.find_one({"username": {"$regex": f"^{normalized_username}$", "$options": "i"}})
        else:
            doc = self._in_memory_users.get(normalized_username.lower())

        if not doc:
            raise GameError("INVALID_CREDENTIALS", "Usuario o contraseña incorrectos.")

        if not verify_password(login_in.password, doc.get("hashed_password", "")):
            raise GameError("INVALID_CREDENTIALS", "Usuario o contraseña incorrectos.")

        return self._to_response(doc)

    async def get_by_username(self, username: str) -> Optional[UserResponse]:
        """Busca y retorna un usuario dado su nombre de usuario."""
        normalized_username = sanitize_username(username)
        col = self.collection

        doc = None
        if col is not None:
            doc = await col.find_one({"username": {"$regex": f"^{normalized_username}$", "$options": "i"}})
        else:
            doc = self._in_memory_users.get(normalized_username.lower())

        if not doc:
            return None
        return self._to_response(doc)

    async def update_chips(self, username: str, amount_delta: int) -> int:
        """Actualiza el saldo de fichas del jugador utilizando la función pura de cálculo de saldo."""
        normalized_username = sanitize_username(username)
        col = self.collection

        if col is not None:
            current_doc = await col.find_one({"username": {"$regex": f"^{normalized_username}$", "$options": "i"}})
            if not current_doc:
                raise GameError("USER_NOT_FOUND", f"Usuario '{username}' no encontrado.")

            try:
                new_balance = calculate_balance(current_doc.get("chips", 0), amount_delta)
            except ValueError as e:
                raise GameError("INSUFFICIENT_FUNDS", str(e))

            await col.update_one(
                {"_id": current_doc["_id"]},
                {"$set": {"chips": new_balance}}
            )
            return new_balance

        user = self._in_memory_users.get(normalized_username.lower())
        if not user:
            raise GameError("USER_NOT_FOUND", f"Usuario '{username}' no encontrado.")

        try:
            new_balance = calculate_balance(user.get("chips", 0), amount_delta)
        except ValueError as e:
            raise GameError("INSUFFICIENT_FUNDS", str(e))

        user["chips"] = new_balance
        return new_balance

    def _to_response(self, doc: dict[str, Any]) -> UserResponse:
        """Transforma un documento crudo en el modelo de respuesta UserResponse."""
        dto = map_user_to_dto(doc)
        return UserResponse(**dto)
