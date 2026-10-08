import pytest
from app.core.errors import GameError
from app.core.event_bus import EventBus
from app.models.current_player_enum import CurrentPlayerEnum
from app.models.game_state_enum import GameStateEnum
from app.models.outcome_enum import OutcomeEnum
from app.models.player_action_enum import PlayerActionEnum
from app.models.player_status_enum import PlayerStatusEnum
from app.services.connection_manager import ConnectionManager
from app.services.game_room import GameRoom


@pytest.mark.asyncio
async def test_game_room_initialization_and_start():
    connections = ConnectionManager()
    bus = EventBus()
    room = GameRoom("test_room_1", "jugador1", "jugador2", connections, event_bus=bus)

    # Iniciar partida
    await room.start_game()

    assert room.game_state == GameStateEnum.PLAYING
    assert len(room.players[0].get_hand().cards) == 2
    assert len(room.players[1].get_hand().cards) == 2
    assert len(room.dealer_hand.cards) == 2

    # Verificar que el payload oculta la segunda carta del dealer mientras se juega
    payload_p1 = room.get_sync_payload("jugador1")
    assert payload_p1["dealer"]["hand"][0].get("hidden") is not True
    assert payload_p1["dealer"]["hand"][1].get("hidden") is True
    assert payload_p1["dealer"]["score"] is None

    await room.close()


@pytest.mark.asyncio
async def test_game_room_turn_queue_validation():
    connections = ConnectionManager()
    room = GameRoom("test_room_2", "jugador1", "jugador2", connections)
    await room.start_game()

    # Si es el turno de jugador1, jugador2 no puede jugar fuera de turno
    if room.current_turn == CurrentPlayerEnum.PLAYER1:
        with pytest.raises(GameError) as exc_info:
            await room.handle_player_action("jugador2", PlayerActionEnum.HIT)
        assert exc_info.value.code == "NOT_YOUR_TURN"

    await room.close()


@pytest.mark.asyncio
async def test_game_room_stand_advances_turn_and_resolves_dealer():
    connections = ConnectionManager()
    room = GameRoom("test_room_3", "jugador1", "jugador2", connections)
    await room.start_game()

    # Jugador 1 se planta
    if room.current_turn == CurrentPlayerEnum.PLAYER1:
        await room.handle_player_action("jugador1", PlayerActionEnum.STAND)
        assert room.players[0].status == PlayerStatusEnum.STAND

    # Jugador 2 se planta
    if room.current_turn == CurrentPlayerEnum.PLAYER2:
        await room.handle_player_action("jugador2", PlayerActionEnum.STAND)
        assert room.players[1].status == PlayerStatusEnum.STAND

    # Una vez ambos se plantan, el dealer juega automáticamente y finaliza la partida
    assert room.game_state == GameStateEnum.FINISHED
    assert room.current_turn == CurrentPlayerEnum.NULL
    assert "jugador1" in room.results
    assert "jugador2" in room.results
    assert room.results["jugador1"] in (OutcomeEnum.WIN.value, OutcomeEnum.LOSE.value, OutcomeEnum.DRAW.value)

    # Las cartas del dealer deben revelarse al finalizar
    payload = room.get_sync_payload("jugador1")
    assert payload["dealer"]["score"] is not None

    await room.close()


@pytest.mark.asyncio
async def test_game_room_player_left_gives_victory_to_remaining_player():
    connections = ConnectionManager()
    room = GameRoom("test_room_4", "jugador1", "jugador2", connections)
    await room.start_game()

    # Jugador 1 abandona la partida
    await room.handle_player_left("jugador1")

    assert room.game_state == GameStateEnum.FINISHED
    assert room.results["jugador1"] == OutcomeEnum.LOSE.value
    assert room.results["jugador2"] == OutcomeEnum.WIN.value

    await room.close()
