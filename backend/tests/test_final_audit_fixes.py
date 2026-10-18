import pytest

from app.core.events import GameStarted, PlayerDisconnected, RoundEnded, UserLoggedIn
from app.models.card import Card
from app.models.game_state_enum import GameStateEnum
from app.models.messages import ScoreUpdateMsg
from app.services.audit_service import AuditService
from app.services.connection_manager import ConnectionManager
from app.services.game_room import GameRoom
from app.services.message_router import MessageRouter
from app.services.room_manager import RoomManager


class MockWebSocket:
    def __init__(self):
        self.sent_messages = []

    async def send_json(self, message):
        self.sent_messages.append(message)


class RecordingUserService:
    def __init__(self):
        self.results = []

    async def record_match_result(self, username, result):
        self.results.append((username, result))


class MockAuditCollection:
    def __init__(self, fail=False):
        self.records = []
        self.fail = fail

    async def insert_many(self, records):
        if self.fail:
            raise RuntimeError("MongoDB unavailable")
        self.records.extend(records)


class MockDatabase:
    def __init__(self, fail=False):
        self.audit_logs = MockAuditCollection(fail=fail)


@pytest.mark.parametrize(
    ("value", "expected"),
    [
        ("win", "win"),
        ("WIN", "win"),
        ("loss", "loss"),
        ("lose", "loss"),
        ("LOSE", "loss"),
        ("tie", "tie"),
        ("draw", "tie"),
        ("DRAW", "tie"),
    ],
)
def test_score_update_result_aliases_are_normalized(value, expected):
    message = ScoreUpdateMsg(type="score_update", username="player", result=value)
    assert message.result == expected


@pytest.mark.asyncio
async def test_join_matchmaking_returns_after_handling_request():
    connections = ConnectionManager()
    socket = MockWebSocket()
    connections.connect("waiting_player", socket)
    rooms = RoomManager(connections)
    router = MessageRouter(connections, rooms)

    await router.route("waiting_player", '{"type":"join_matchmaking"}')

    assert len(socket.sent_messages) == 1
    assert socket.sent_messages[0]["type"] == "waiting"


@pytest.mark.asyncio
async def test_client_score_update_is_accepted_but_not_authoritative():
    connections = ConnectionManager()
    socket = MockWebSocket()
    connections.connect("player", socket)
    router = MessageRouter(connections, RoomManager(connections))

    await router.route(
        "player",
        '{"type":"score_update","username":"player","result":"WIN"}',
    )

    assert socket.sent_messages == []


@pytest.mark.asyncio
async def test_opponent_cards_are_hidden_until_round_finishes():
    service = RecordingUserService()
    room = GameRoom(
        "room",
        "player_one",
        "player_two",
        ConnectionManager(),
        user_service=service,
    )
    await room.start_game()

    state = room.get_sync_payload("player_one")
    opponent = next(player for player in state["players"] if player["username"] == "player_two")
    assert opponent["hand"] == [{"hidden": True}, {"hidden": True}]
    assert opponent["score"] is None

    room.game_state = room.game_state.__class__.FINISHED
    finished_state = room.get_sync_payload("player_one")
    revealed_opponent = next(
        player for player in finished_state["players"] if player["username"] == "player_two"
    )
    assert all("hidden" not in card for card in revealed_opponent["hand"])
    await room.close()


@pytest.mark.asyncio
async def test_abandonment_records_results_once_from_server():
    service = RecordingUserService()
    room = GameRoom(
        "room",
        "winner",
        "leaver",
        ConnectionManager(),
        user_service=service,
    )
    await room.start_game()

    await room.handle_player_left("leaver")
    await room.handle_player_left("leaver")

    assert sorted(service.results) == [("leaver", "loss"), ("winner", "win")]
    await room.close()


@pytest.mark.asyncio
async def test_round_end_records_authoritative_results():
    service = RecordingUserService()
    room = GameRoom(
        "room",
        "winner",
        "tie",
        ConnectionManager(),
        user_service=service,
    )
    room.dealer_hand.add_card(Card(suit="spades", rank="10"))
    room.dealer_hand.add_card(Card(suit="clubs", rank="7"))
    room.players[0].get_hand().add_card(Card(suit="hearts", rank="10"))
    room.players[0].get_hand().add_card(Card(suit="diamonds", rank="10"))
    room.players[1].get_hand().add_card(Card(suit="hearts", rank="9"))
    room.players[1].get_hand().add_card(Card(suit="diamonds", rank="8"))
    room.game_state = GameStateEnum.PLAYING

    await room._play_dealer_turn()

    assert sorted(service.results) == [("tie", "tie"), ("winner", "win")]
    await room.close()


@pytest.mark.asyncio
async def test_audit_events_are_persisted_and_database_failures_are_isolated(monkeypatch):
    import app.services.audit_service as audit_module

    database = MockDatabase()
    monkeypatch.setattr(audit_module, "get_database", lambda: database)
    service = AuditService()

    for event in (
        UserLoggedIn(username="player"),
        GameStarted(room_id="room", usernames=["player", "opponent"]),
        RoundEnded(room_id="room", results={"player": "WIN"}),
        PlayerDisconnected(username="player", room_id="room"),
    ):
        await service.handle_event(event)
    await service.flush()

    assert {record["event_type"] for record in database.audit_logs.records} == {
        "user_login",
        "game_started",
        "round_ended",
        "player_disconnected",
    }
    assert all({"timestamp", "username", "room_id"} <= record.keys()
               for record in database.audit_logs.records)

    monkeypatch.setattr(audit_module, "get_database", lambda: MockDatabase(fail=True))
    await service.handle_event(UserLoggedIn(username="player"))
    await service.flush()
