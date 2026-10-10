import pytest
from app.core.errors import GameError
from app.models.user import UserRegisterRequest, UserLoginRequest
from app.services.user_service import UserService


@pytest.mark.asyncio
async def test_register_and_authenticate_user():
    service = UserService()

    # 1. Registrar usuario con credenciales
    req = UserRegisterRequest(username="blackjack_king", password="secret_password_456", email="king@test.com")
    user = await service.register_user(req)

    assert user.username == "blackjack_king"
    assert user.email == "king@test.com"
    assert user.chips == 10000
    assert user.role == "player"
    assert user.id is not None

    # 2. Autenticación exitosa con credenciales correctas
    login_req = UserLoginRequest(username="blackjack_king", password="secret_password_456")
    auth_user = await service.authenticate_user(login_req)
    assert auth_user.id == user.id
    assert auth_user.username == "blackjack_king"

    # 3. Autenticación fallida con contraseña incorrecta
    with pytest.raises(GameError) as exc_info:
        await service.authenticate_user(UserLoginRequest(username="blackjack_king", password="wrong_password"))
    assert exc_info.value.code == "INVALID_CREDENTIALS"

    # 4. Autenticación fallida con usuario inexistente
    with pytest.raises(GameError) as exc_info:
        await service.authenticate_user(UserLoginRequest(username="nobody", password="password"))
    assert exc_info.value.code == "INVALID_CREDENTIALS"


@pytest.mark.asyncio
async def test_duplicate_user_registration():
    service = UserService()

    req = UserRegisterRequest(username="dealer_mike", password="password123")
    await service.register_user(req)

    # Intento de registrar nuevamente el mismo nombre de usuario (debe lanzar error de duplicado)
    with pytest.raises(GameError) as exc_info:
        await service.register_user(req)
    assert exc_info.value.code == "USER_ALREADY_EXISTS"


@pytest.mark.asyncio
async def test_update_chips():
    service = UserService()
    req = UserRegisterRequest(username="chip_master", password="password123")
    await service.register_user(req)

    # Aumentar saldo de fichas
    new_balance = await service.update_chips("chip_master", 500)
    assert new_balance == 10500

    # Disminuir saldo de fichas
    new_balance = await service.update_chips("chip_master", -2000)
    assert new_balance == 8500
