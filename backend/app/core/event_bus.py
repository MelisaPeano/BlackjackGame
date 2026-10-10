import asyncio
import logging
from typing import Any, Callable, Coroutine, Dict, List
from app.core.events import BaseEvent

logger = logging.getLogger("blackjack.event_bus")

# Definición de tipo para manejadores de eventos asíncronos
EventHandler = Callable[[Any], Coroutine[Any, Any, None]]


class EventBus:
    """
    Broker / Bus de Eventos asíncrono para desacoplar la emisión de mensajes de su recepción.
    Utiliza una cola interna en memoria (asyncio.Queue) para procesar eventos en segundo plano
    sin bloquear a los emisores (como los clientes WebSocket).
    """

    def __init__(self) -> None:
        self._subscribers: Dict[str, List[EventHandler]] = {}
        self._event_queue: asyncio.Queue[BaseEvent] = asyncio.Queue()
        self._worker_task: asyncio.Task | None = None
        self._is_running: bool = False

    def subscribe(self, event_type: str, handler: EventHandler) -> None:
        """
        Suscribe un manejador asíncrono a un tipo específico de evento.
        Se puede usar '*' para suscribirse a todos los eventos emitidos.
        """
        if event_type not in self._subscribers:
            self._subscribers[event_type] = []
        self._subscribers[event_type].append(handler)
        logger.debug("Manejador suscrito al evento: %s", event_type)

    def unsubscribe(self, event_type: str, handler: EventHandler) -> None:
        """Remueve un manejador suscrito previamente."""
        if event_type in self._subscribers and handler in self._subscribers[event_type]:
            self._subscribers[event_type].remove(handler)

    def publish(self, event: BaseEvent) -> None:
        """
        Emite un evento de manera no bloqueante colocándolo en la cola del broker.
        Esto desacopla inmediatamente la conexión de red (WebSocket) de la ejecución de la lógica.
        """
        self._event_queue.put_nowait(event)
        logger.debug("Evento encolado en el EventBus: %s (id=%s)", event.event_type, event.event_id)

    async def publish_wait(self, event: BaseEvent) -> None:
        """Emite un evento y espera a despacharlo directamente a todos los suscriptores (útil para pruebas)."""
        await self._dispatch(event)

    async def _dispatch(self, event: BaseEvent) -> None:
        """Despacha un evento a todos los manejadores suscritos correspondientes."""
        handlers = list(self._subscribers.get(event.event_type, []))
        wildcard_handlers = list(self._subscribers.get("*", []))
        all_handlers = handlers + wildcard_handlers

        for handler in all_handlers:
            try:
                await handler(event)
            except Exception as e:
                logger.error(
                    "Error al ejecutar el manejador para el evento %s: %s",
                    event.event_type,
                    e,
                    exc_info=True,
                )

    async def _worker_loop(self) -> None:
        """Bucle consumidor en segundo plano que extrae eventos de la cola y los despacha."""
        logger.info("Worker del EventBus iniciado y listo para procesar eventos.")
        while self._is_running:
            try:
                event = await self._event_queue.get()
                await self._dispatch(event)
                self._event_queue.task_done()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error("Error inesperado en el bucle del EventBus: %s", e)

    def start(self) -> None:
        """Inicia el consumidor asíncrono en segundo plano."""
        if not self._is_running:
            self._is_running = True
            self._worker_task = asyncio.create_task(self._worker_loop())

    async def stop(self) -> None:
        """Detiene ordenadamente el consumidor procesando los eventos pendientes."""
        if self._is_running:
            self._is_running = False
            if self._worker_task:
                self._worker_task.cancel()
                try:
                    await self._worker_task
                except asyncio.CancelledError:
                    pass
                self._worker_task = None
            logger.info("Worker del EventBus detenido.")

    async def wait_until_empty(self) -> None:
        """Espera hasta que todos los eventos de la cola hayan sido procesados."""
        await self._event_queue.join()
