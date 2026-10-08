import pytest
from starlette.testclient import TestClient
from app.core.security import create_access_token
from app.main import app


def test_websocket_connect_with_valid_token():
    # Conexión WebSocket exitosa autenticada con token JWT (?token=...)
    client = TestClient(app)
    token = create_access_token({"sub": "ws_player_1", "role": "player"})

    with client.websocket_connect(f"/ws?token={token}") as websocket:
        data = websocket.receive_json()
        assert data["type"] == "connected"
        assert data["username"] == "ws_player_1"


def test_websocket_connect_with_invalid_token():
    # Conexión WebSocket rechazada por token JWT inválido
    client = TestClient(app)
    with pytest.raises(Exception):
        with client.websocket_connect("/ws?token=invalid_token"):
            pass


def test_websocket_connect_with_username_fallback():
    # Conexión WebSocket permitida con nombre de usuario en query (?username=...) por compatibilidad
    client = TestClient(app)
    with client.websocket_connect("/ws?username=legacy_player") as websocket:
        data = websocket.receive_json()
        assert data["type"] == "connected"
        assert data["username"] == "legacy_player"
