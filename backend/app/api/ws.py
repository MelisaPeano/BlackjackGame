from typing import Optional
from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

from app.core.errors import GameError
from app.core.security import decode_access_token
from app.models.messages import ConnectedMsg, LobbyStateMsg, WaitingMsg

router = APIRouter()

# Códigos de cierre de WebSocket personalizados
CLOSE_ALREADY_CONNECTED = 4409
CLOSE_INVALID_AUTH = 4401


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket, 
    username: Optional[str] = Query(None, min_length=1, max_length=64),
    token: Optional[str] = Query(None),
):
    """
    Punto de conexión WebSocket.
    Autentica preferentemente mediante el token JWT en la URL (?token=...).
    Mantiene compatibilidad hacia atrás permitiendo ?username=... si aún no hay token.
    """
    if token:
        payload = decode_access_token(token)
        if not payload or "sub" not in payload:
            await websocket.close(code=CLOSE_INVALID_AUTH, reason="Token de autenticación inválido o expirado")
            return
        username = payload["sub"]

    if not username:
        await websocket.close(code=CLOSE_INVALID_AUTH, reason="Nombre de usuario o token requerido")
        return

    state = websocket.app.state
    
    await websocket.accept()

    try:
        # Registrar conexión del usuario
        state.connections.connect(username, websocket)
    except GameError as err:
        await websocket.close(code=CLOSE_ALREADY_CONNECTED, reason=err.message)
        return

    try:
        # Notificar conexión exitosa y estado actual del lobby
        await state.connections.send(username, ConnectedMsg(username=username))
        
        active_users = state.connections.get_online_users()
        await state.connections.broadcast(LobbyStateMsg(online_users=active_users))

        # Intento de emparejamiento / sala de espera
        room = await state.rooms.join_matchmaking(username)

        if room is None:
            await state.connections.send(username, WaitingMsg())

        # Bucle de escucha de eventos entrantes
        while True:
            message = await websocket.receive_text()
            await state.router.route(username, message)

    except WebSocketDisconnect:
        pass

    finally:
        # Limpieza de recursos al desconectarse el socket
        state.rooms.cancel_waiting(username)
        state.connections.disconnect(username, websocket)

        active_users = state.connections.get_online_users()
        await state.connections.broadcast(LobbyStateMsg(online_users=active_users))