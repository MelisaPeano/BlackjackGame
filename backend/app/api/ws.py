from typing import Optional
from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

from app.core.errors import GameError
from app.core.events import PlayerDisconnected
from app.core.security import decode_access_token
from app.models.messages import ConnectedMsg, LobbyStateMsg

router = APIRouter()

# Códigos de cierre de WebSocket personalizados
CLOSE_ALREADY_CONNECTED = 4409
CLOSE_INVALID_AUTH = 4401


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket, 
    token: str = Query(...)
):
    """
    Punto de conexión WebSocket.
    Autentica ESTRICTAMENTE mediante el token JWT en la URL (?token=...).
    """
    # 1. Validación estricta del token (sin fallback)
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        await websocket.close(code=CLOSE_INVALID_AUTH, reason="Token de autenticación inválido o expirado")
        return
    
    username = payload["sub"]

    state = websocket.app.state
    
    await websocket.accept()

    try:
        # Registrar conexión del usuario autenticado
        state.connections.connect(username, websocket)
    except GameError as err:
        await websocket.close(code=CLOSE_ALREADY_CONNECTED, reason=err.message)
        return

    try:
        # Notificar conexión exitosa y estado actual del lobby
        await state.connections.send(username, ConnectedMsg(username=username))
        
        active_games = state.rooms.get_active_games_count()
        active_users = state.connections.get_online_users()
        await state.connections.broadcast(LobbyStateMsg(online_users=active_users, active_games=active_games))

        # Bucle de escucha de eventos entrantes
        while True:
            message = await websocket.receive_text()
            await state.router.route(username, message)

    except WebSocketDisconnect:
        pass

    finally:
        # Limpieza de recursos al desconectarse el socket
        room = state.rooms.room_of(username)
        await state.rooms.handle_disconnect(username)
        state.connections.disconnect(username, websocket)

        active_games = state.rooms.get_active_games_count()
        if state.event_bus:
            state.event_bus.publish(
                PlayerDisconnected(
                    username=username,
                    room_id=room.room_id if room is not None else None,
                )
            )
        active_users = state.connections.get_online_users()
        await state.connections.broadcast(LobbyStateMsg(online_users=active_users, active_games=active_games))