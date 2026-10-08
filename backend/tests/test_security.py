import pytest
from pydantic import ValidationError
from app.core.security import hash_password, verify_password, create_access_token, decode_access_token
from app.models.user import UserRegisterRequest


def test_hash_and_verify_password():
    # Prueba de hashing con bcrypt y verificación de coincidencia
    password = "secret_password_123"
    hashed = hash_password(password)

    assert hashed != password
    assert verify_password(password, hashed) is True
    assert verify_password("wrong_password", hashed) is False


def test_jwt_token_creation_and_decoding():
    # Prueba de generación y decodificación exitosa de JWT
    payload = {"sub": "player_test", "role": "player"}
    token = create_access_token(payload)

    decoded = decode_access_token(token)
    assert decoded is not None
    assert decoded["sub"] == "player_test"
    assert decoded["role"] == "player"
    assert "exp" in decoded


def test_decode_invalid_jwt_token():
    # Prueba de rechazo de token inválido
    assert decode_access_token("invalid.token.here") is None


def test_user_register_validation():
    # Registro con datos válidos
    user = UserRegisterRequest(username="player1", password="password123")
    assert user.username == "player1"

    # Validación: Nombre de usuario demasiado corto (< 3 caracteres)
    with pytest.raises(ValidationError):
        UserRegisterRequest(username="ab", password="password123")

    # Validación: Contraseña demasiado corta (< 6 caracteres)
    with pytest.raises(ValidationError):
        UserRegisterRequest(username="valid_user", password="123")

    # Validación: Caracteres no permitidos en el nombre de usuario
    with pytest.raises(ValidationError):
        UserRegisterRequest(username="invalid user with space", password="password123")
