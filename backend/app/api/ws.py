from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

from app.core.errors import GameError
from app.models.messages import ConnectedMsg, WaitingMsg

router = APIRouter()

CLOSE_ALREADY_CONNECTED = 4409

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, username: str = Query(...)):
    # momentary: the username comes from the URL - no authentication yet.
    # the auth issue replaces it with a token validation.
    state = websocket.app.state
    
    await websocket.accept()

    try:
        state.connections.connect(username, websocket)
    except GameError as err:
        await websocket.close(code=CLOSE_ALREADY_CONNECTED, reason=err.message)
        return

    try:
        await state.connections.send(username, ConnectedMsg(username=username))

        room = await state.rooms.join_matchmaking(username)

        if room is None:
            await state.connections.send(username, WaitingMsg())

        while True:
            message = await websocket.receive_text()
            await state.router.route(username, message)

    except WebSocketDisconnect:
        pass

    finally:
        state.rooms.cancel_waiting(username)
        state.connections.disconnect(username, websocket)