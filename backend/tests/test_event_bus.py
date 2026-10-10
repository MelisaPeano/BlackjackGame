import asyncio
import pytest
from app.core.event_bus import EventBus
from app.core.events import BaseEvent, PlayerActionSubmitted


class DummyEvent(BaseEvent):
    event_type: str = "dummy_event"
    payload: str


@pytest.mark.asyncio
async def test_event_bus_publish_and_subscribe():
    bus = EventBus()
    received = []

    async def on_dummy(event: DummyEvent):
        received.append(event.payload)

    bus.subscribe("dummy_event", on_dummy)
    bus.start()

    # Publicar evento (emisión no bloqueante)
    bus.publish(DummyEvent(payload="hola_mundo"))
    await bus.wait_until_empty()

    assert len(received) == 1
    assert received[0] == "hola_mundo"

    await bus.stop()


@pytest.mark.asyncio
async def test_event_bus_wildcard_subscription():
    bus = EventBus()
    all_events = []

    async def on_any(event: BaseEvent):
        all_events.append(event.event_type)

    bus.subscribe("*", on_any)
    bus.start()

    bus.publish(DummyEvent(payload="1"))
    bus.publish(PlayerActionSubmitted(room_id="r1", username="p1", action="hit"))
    await bus.wait_until_empty()

    assert len(all_events) == 2
    assert "dummy_event" in all_events
    assert "player_action_submitted" in all_events

    await bus.stop()


@pytest.mark.asyncio
async def test_event_bus_resilience_to_handler_exception():
    bus = EventBus()
    success_received = []

    async def faulty_handler(event: BaseEvent):
        raise RuntimeError("Fallo simulado en el consumidor")

    async def safe_handler(event: DummyEvent):
        success_received.append(event.payload)

    bus.subscribe("dummy_event", faulty_handler)
    bus.subscribe("dummy_event", safe_handler)
    bus.start()

    # Debe ejecutar safe_handler a pesar del error en faulty_handler
    bus.publish(DummyEvent(payload="sobrevivido"))
    await bus.wait_until_empty()

    assert success_received == ["sobrevivido"]

    await bus.stop()
