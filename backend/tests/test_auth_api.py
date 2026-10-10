import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app


@pytest.mark.asyncio
async def test_register_success():
    # Registro exitoso de usuario nuevo
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/api/auth/register", json={
            "username": "alice_player",
            "password": "securepassword123",
            "email": "alice@example.com"
        })
        assert response.status_code == 201
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["user"]["username"] == "alice_player"
        assert data["user"]["email"] == "alice@example.com"
        assert data["user"]["chips"] == 10000
        assert data["user"]["role"] == "player"
        assert "id" in data["user"]


@pytest.mark.asyncio
async def test_register_alias_endpoint():
    # Compatibilidad con alias directo /api/register utilizado por el frontend
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/api/register", json={
            "username": "bob_casino",
            "password": "bobpassword123"
        })
        assert response.status_code == 201
        data = response.json()
        assert data["user"]["username"] == "bob_casino"


@pytest.mark.asyncio
async def test_register_duplicate_username():
    # Rechazo de usuario duplicado con código 409 Conflict
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        await ac.post("/api/auth/register", json={
            "username": "charlie_vip",
            "password": "password123"
        })

        response = await ac.post("/api/auth/register", json={
            "username": "charlie_vip",
            "password": "different_password"
        })
        assert response.status_code == 409
        assert "ya existe" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_register_invalid_payload():
    # Validación de esquemas con datos inválidos (código 422)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Nombre de usuario demasiado corto
        res1 = await ac.post("/api/auth/register", json={
            "username": "a",
            "password": "password123"
        })
        assert res1.status_code == 422

        # Contraseña demasiado corta (< 6 caracteres)
        res2 = await ac.post("/api/auth/register", json={
            "username": "validname",
            "password": "123"
        })
        assert res2.status_code == 422


@pytest.mark.asyncio
async def test_login_flow():
    # Flujo completo de inicio de sesión con credenciales correctas e incorrectas
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        await ac.post("/api/auth/register", json={
            "username": "dan_login",
            "password": "mypassword123"
        })

        # Login correcto
        login_res = await ac.post("/api/auth/login", json={
            "username": "dan_login",
            "password": "mypassword123"
        })
        assert login_res.status_code == 200
        token = login_res.json()["access_token"]
        assert token is not None

        # Login con contraseña errónea
        bad_login = await ac.post("/api/auth/login", json={
            "username": "dan_login",
            "password": "wrongpassword"
        })
        assert bad_login.status_code == 401

        # Login con usuario inexistente
        non_user = await ac.post("/api/auth/login", json={
            "username": "nobody_exists",
            "password": "password"
        })
        assert non_user.status_code == 401


@pytest.mark.asyncio
async def test_get_me_authenticated():
    # Consulta del perfil de usuario autenticado mediante cabecera Authorization
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        reg_res = await ac.post("/api/auth/register", json={
            "username": "eva_profile",
            "password": "evapassword123"
        })
        token = reg_res.json()["access_token"]

        me_res = await ac.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert me_res.status_code == 200
        data = me_res.json()
        assert data["username"] == "eva_profile"
        assert data["chips"] == 10000

        # Petición sin token debe retornar 401 Unauthorized
        unauth_res = await ac.get("/api/auth/me")
        assert unauth_res.status_code == 401
