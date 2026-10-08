import asyncio
import pytest
from app.core.event_bus import EventBus
from app.models.game_state_enum import GameStateEnum
from app.models.outcome_enum import OutcomeEnum
from app.services.connection_manager import ConnectionManager
from app.services.message_router import MessageRouter
from app.services.room_manager import RoomManager


class MockWebSocket:
    """Simulador de socket para capturar mensajes enviados por ConnectionManager."""
    def __init__(self):
        self.sent_messages = []

    async def send_text(self, text: str):
        self.sent_messages.append(text)

    async def send_json(self, data: dict):
        self.sent_messages.append(data)


@pytest.mark.asyncio
async def test_event_driven_game_routing_and_play():
    # 1. Configurar infraestructura desacoplada
    bus = EventBus()
    connections = ConnectionManager()
    rooms = RoomManager(connections, event_bus=bus)
    router = MessageRouter(connections, rooms, event_bus=bus)

    bus.start()

    # 2. Conectar dos jugadores simulados
    ws1 = MockWebSocket()
    ws2 = MockWebSocket()
    connections.connect("jugador_alpha", ws1)
    connections.connect("jugador_beta", ws2)

    # 3. Iniciar partida
    room = await rooms.start_private_game("jugador_alpha", "jugador_beta")
    assert room.game_state == GameStateEnum.PLAYING

    # 4. Jugador 1 envía 'stand' por mensaje JSON simulado
    # MessageRouter publica el evento en EventBus de forma desacoplada
    await router.route("jugador_alpha", '{"type": "stand"}')
    await bus.wait_until_empty()
    await room.action_queue.join()

    # 5. Jugador 2 envía 'stand'
    await router.route("jugador_beta", '{"type": "stand"}')
    await bus.wait_until_empty()
    await room.action_queue.join()

    # 6. La partida debe haber pasado al dealer y finalizado
    assert room.game_state == GameStateEnum.FINISHED
    assert len(room.results) == 2
    assert "jugador_alpha" in room.results
    assert "jugador_beta" in room.results

    # Limpieza
    await bus.stop()
    await room.close()


@pytest.mark.asyncio
async def test_event_driven_routing_not_in_game_error():
    bus = EventBus()
    connections = ConnectionManager()
    rooms = RoomManager(connections, event_bus=bus)
    router = MessageRouter(connections, rooms, event_bus=bus)

    ws = MockWebSocket()
    connections.connect("jugador_sin_sala", ws)

    # Enviar acción cuando no está en juego
    await router.route("jugador_sin_sala", '{"type": "hit"}')

    # Debe recibir mensaje de error NOT_IN_GAME
    assert len(ws.sent_messages) == 1
    assert ws.sent_messages[0]["code"] == "NOT_IN_GAME"


@pytest.mark.asyncio
async def test_event_driven_matchmaking_automatic_pairing():
    bus = EventBus()
    connections = ConnectionManager()
    rooms = RoomManager(connections, event_bus=bus)

    # Jugador 1 entra a matchmaking -> queda esperando
    r1 = await rooms.join_matchmaking("jugador_esperando_1")
    assert r1 is None
    assert rooms.waiting_user == "jugador_esperando_1"

    # Jugador 2 entra a matchmaking -> se empareja e inicia partida automáticamente
    r2 = await rooms.join_matchmaking("jugador_esperando_2")
    assert r2 is not None
    assert r2.game_state == GameStateEnum.PLAYING
    assert rooms.waiting_user is None

    await r2.close()
