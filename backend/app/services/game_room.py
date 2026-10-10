import asyncio
import logging
from typing import Any, Optional

from app.core.errors import GameError
from app.core.event_bus import EventBus
from app.core.events import GameStateUpdated, RoundEnded
from app.domain.blackjack_rules import (
    calculate_score,
    determine_next_turn,
    evaluate_hand_outcome,
    is_blackjack,
    is_bust,
    should_dealer_hit,
)
from app.models.current_player_enum import CurrentPlayerEnum
from app.models.deck import Deck
from app.models.game_state_enum import GameStateEnum
from app.models.game_user import GameUser
from app.models.hand import Hand
from app.models.messages import GameStateMsg
from app.models.outcome_enum import OutcomeEnum
from app.models.player_action_enum import PlayerActionEnum
from app.models.player_status_enum import PlayerStatusEnum
from app.services.connection_manager import ConnectionManager

logger = logging.getLogger("blackjack.game_room")


class GameRoom:
    """
    Sala de juego orientada a eventos.
    Gestiona el ciclo de vida de la partida, los turnos de los 2 jugadores y del Dealer,
    e implementa una cola asíncrona de acciones por turno (FIFO) para desacoplar y serializar las jugadas.
    """

    def __init__(
        self,
        room_id: str,
        username1: str,
        username2: str,
        connections: ConnectionManager,
        event_bus: Optional[EventBus] = None,
    ) -> None:
        self.room_id = room_id
        self.players = [
            GameUser(username1, username1, CurrentPlayerEnum.PLAYER1),
            GameUser(username2, username2, CurrentPlayerEnum.PLAYER2),
        ]
        self.dealer_hand = Hand()
        self.deck = Deck()
        self.game_state = GameStateEnum.WAITING
        self.current_turn = CurrentPlayerEnum.NULL
        self.connections = connections
        self.event_bus = event_bus
        self.results: dict[str, str] = {}

        # Cola asíncrona de jugadas y semáforo de procesamiento secuencial
        self.action_queue: asyncio.Queue[tuple[str, PlayerActionEnum, Optional[asyncio.Future]]] = asyncio.Queue()
        self.lock = asyncio.Lock()
        self._queue_worker_task: Optional[asyncio.Task] = None
        self._is_active: bool = True

    def start_worker(self) -> None:
        """Inicia el worker consumidor de la cola de acciones de la sala."""
        if self._queue_worker_task is None or self._queue_worker_task.done():
            self._queue_worker_task = asyncio.create_task(self._process_action_queue())

    async def start_game(self) -> None:
        """
        Inicializa la partida:
        1. Mezcla el mazo de cartas.
        2. Reparte 2 cartas a cada jugador y 2 cartas al dealer (1 oculta).
        3. Comprueba Blackjacks iniciales.
        4. Inicia el turno del Jugador 1 o pasa al dealer si hay Blackjacks inmediatos.
        """
        async with self.lock:
            if self.game_state != GameStateEnum.WAITING:
                raise GameError("GAME_ALREADY_STARTED", "La partida ya ha comenzado.")

            self.start_worker()
            self.deck.shuffle()

            # Reparto inicial: 2 cartas a cada participante
            for _ in range(2):
                for player in self.players:
                    player.get_hand().add_card(self.deck.draw_card())
                self.dealer_hand.add_card(self.deck.draw_card())

            self.game_state = GameStateEnum.PLAYING

            # Verificar si algún jugador obtuvo Blackjack natural inmediato
            for player in self.players:
                if is_blackjack(player.get_hand().cards):
                    player.status = PlayerStatusEnum.BLACKJACK

            # Establecer el turno inicial
            p1 = self.players[0]
            p2 = self.players[1]
            if p1.status == PlayerStatusEnum.ACTIVE:
                self.current_turn = CurrentPlayerEnum.PLAYER1
            elif p2.status == PlayerStatusEnum.ACTIVE:
                self.current_turn = CurrentPlayerEnum.PLAYER2
            else:
                # Ambos obtuvieron Blackjack en el reparto inicial, pasa al turno del dealer
                self.current_turn = CurrentPlayerEnum.DEALER

            await self.broadcast_state()

            # Si el turno inicial pasó directo al dealer
            if self.current_turn == CurrentPlayerEnum.DEALER:
                await self._play_dealer_turn()

    def enqueue_action(self, username: str, action: PlayerActionEnum) -> asyncio.Future:
        """
        Encola una acción ('hit' o 'stand') en la cola FIFO de la partida.
        Desacopla la recepción de la jugada y retorna un Future para esperar el resultado.
        """
        loop = asyncio.get_running_loop()
        future = loop.create_future()
        self.action_queue.put_nowait((username, action, future))
        return future

    async def _process_action_queue(self) -> None:
        """Consumidor en segundo plano que despacha en orden estricto las jugadas recibidas."""
        while self._is_active:
            try:
                username, action, future = await self.action_queue.get()
                try:
                    await self._execute_player_action(username, action)
                    if future and not future.done():
                        future.set_result(True)
                except Exception as err:
                    if future and not future.done():
                        future.set_exception(err)
                finally:
                    self.action_queue.task_done()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error("Error en la cola de acciones de la sala %s: %s", self.room_id, e)

    async def handle_player_action(self, username: str, action: PlayerActionEnum) -> None:
        """Punto de entrada síncrono/asíncrono compatible: encola la jugada y aguarda su resolución."""
        future = self.enqueue_action(username, action)
        await future

    async def _execute_player_action(self, username: str, action: PlayerActionEnum) -> None:
        """Lógica interna de ejecución de turno protegida contra accesos concurrentes."""
        async with self.lock:
            if self.game_state != GameStateEnum.PLAYING:
                raise GameError("GAME_NOT_ACTIVE", "La partida no está activa.")

            player = self.get_player(username)
            if player.role != self.current_turn:
                raise GameError("NOT_YOUR_TURN", "No es tu turno de jugar.")

            if player.status != PlayerStatusEnum.ACTIVE:
                raise GameError("PLAYER_NOT_ACTIVE", "Ya has finalizado tu jugada en esta ronda.")

            if action == PlayerActionEnum.HIT:
                # El jugador solicita una carta adicional
                card = self.deck.draw_card()
                player.get_hand().add_card(card)
                cards = player.get_hand().cards
                score = calculate_score(cards)

                if is_bust(cards):
                    player.status = PlayerStatusEnum.BUST
                    await self._advance_turn()
                elif score == 21:
                    # Alcanzó 21 exactamente, se planta de forma automática
                    player.status = PlayerStatusEnum.STAND
                    await self._advance_turn()
                else:
                    # Puntuación menor a 21: puede seguir pidiendo o plantarse
                    player.status = PlayerStatusEnum.ACTIVE
                    await self.broadcast_state()

            elif action == PlayerActionEnum.STAND:
                # El jugador decide plantarse
                player.status = PlayerStatusEnum.STAND
                await self._advance_turn()

    async def _advance_turn(self) -> None:
        """Avanza el turno utilizando la función pura determine_next_turn."""
        p1 = self.players[0]
        p2 = self.players[1]

        next_turn = determine_next_turn(self.current_turn, p1.status, p2.status)
        self.current_turn = next_turn

        if self.current_turn == CurrentPlayerEnum.DEALER:
            await self.broadcast_state()
            await self._play_dealer_turn()
        else:
            await self.broadcast_state()

    async def _play_dealer_turn(self) -> None:
        """
        Ejecuta el turno del dealer según las reglas de la sección 9 del README:
        - Si todos los jugadores están BUST, la ronda termina sin que el dealer deba pedir cartas.
        - De lo contrario, el dealer pide cartas mientras tenga <= 16 y se planta con >= 17.
        """
        self.game_state = GameStateEnum.DEALER_TURN

        # Si todos los jugadores se pasaron (Bust), el dealer gana directamente
        all_busted = all(p.status == PlayerStatusEnum.BUST for p in self.players)
        if not all_busted:
            while should_dealer_hit(self.dealer_hand.get_score()):
                await asyncio.sleep(0.3)  # Pequeña pausa realista entre extracciones de cartas
                self.dealer_hand.add_card(self.deck.draw_card())
                await self.broadcast_state()

        # Determinar resultados de la partida
        self.game_state = GameStateEnum.FINISHED
        self.current_turn = CurrentPlayerEnum.NULL

        self.results = {}
        for player in self.players:
            if player.status == PlayerStatusEnum.LEFT:
                self.results[player.username] = OutcomeEnum.LOSE.value
            else:
                outcome = evaluate_hand_outcome(player.get_hand().cards, self.dealer_hand.cards)
                self.results[player.username] = outcome.value

        await self.broadcast_state()

        # Notificar finalización de la ronda al EventBus
        if self.event_bus:
            self.event_bus.publish(RoundEnded(room_id=self.room_id, results=self.results))

    async def handle_player_left(self, username: str) -> None:
        """
        Gestiona la salida o desconexión de un jugador según la sección 11 del README:
        Si un jugador abandona durante la partida, el jugador restante gana automáticamente.
        """
        async with self.lock:
            if self.game_state in (GameStateEnum.PLAYING, GameStateEnum.DEALER_TURN):
                leaving_player = self.get_player(username)
                leaving_player.status = PlayerStatusEnum.LEFT
                self.game_state = GameStateEnum.FINISHED
                self.current_turn = CurrentPlayerEnum.NULL

                self.results = {}
                for player in self.players:
                    if player.username == username:
                        self.results[player.username] = OutcomeEnum.LOSE.value
                    else:
                        self.results[player.username] = OutcomeEnum.WIN.value

                await self.broadcast_state()
                if self.event_bus:
                    self.event_bus.publish(RoundEnded(room_id=self.room_id, results=self.results))

    def get_player(self, username: str) -> GameUser:
        """Retorna el objeto GameUser correspondiente al nombre de usuario."""
        for player in self.players:
            if player.username == username:
                return player
        raise GameError("NOT_IN_GAME", "No formas parte de esta partida.")

    def get_sync_payload(self, viewer: str) -> dict[str, Any]:
        """
        Genera el payload de estado sincronizado visible para cada jugador.
        Oculta la segunda carta del dealer mientras no sea su turno ni haya terminado la partida.
        """
        reveal = (self.game_state in (GameStateEnum.DEALER_TURN, GameStateEnum.FINISHED))

        dealer_cards = []
        for index, card in enumerate(self.dealer_hand.cards):
            if reveal or index == 0:
                dealer_cards.append(card.to_dict())
            else:
                dealer_cards.append({"hidden": True})

        turn_username = None
        for player in self.players:
            if player.role == self.current_turn:
                turn_username = player.username

        players = []
        for player in self.players:
            p_data: dict[str, Any] = {
                "username": player.username,
                "role": player.role.value,
                "hand": [card.to_dict() for card in player.get_hand().cards],
                "score": player.get_hand().get_score(),
                "status": player.status.value,
            }
            if self.game_state == GameStateEnum.FINISHED and player.username in self.results:
                p_data["outcome"] = self.results[player.username]
            players.append(p_data)

        return {
            "room_id": self.room_id,
            "you": viewer,
            "state": self.game_state.value,
            "current_turn": self.current_turn.value,
            "turn_username": turn_username,
            "players": players,
            "dealer": {
                "hand": dealer_cards,
                "score": self.dealer_hand.get_score() if reveal else None,
            },
        }

    async def broadcast_state(self) -> None:
        """Difunde el estado del juego a los participantes a través de ConnectionManager y EventBus."""
        for player in self.players:
            payload = self.get_sync_payload(player.username)
            await self.connections.send(player.username, GameStateMsg(state=payload))
            if self.event_bus:
                self.event_bus.publish(GameStateUpdated(
                    room_id=self.room_id,
                    state_payload=payload,
                    target_username=player.username
                ))

    async def close(self) -> None:
        """Detiene ordenadamente el worker de la sala."""
        self._is_active = False
        if self._queue_worker_task:
            self._queue_worker_task.cancel()
            try:
                await self._queue_worker_task
            except asyncio.CancelledError:
                pass