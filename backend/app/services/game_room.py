import asyncio

from app.core.errors import GameError
from app.models.current_player_enum import CurrentPlayerEnum
from app.models.deck import Deck
from app.models.game_state_enum import GameStateEnum
from app.models.game_user import GameUser
from app.models.hand import Hand
from app.models.messages import GameStateMsg
from app.models.player_action_enum import PlayerActionEnum
from app.services.connection_manager import ConnectionManager


class GameRoom:

    def __init__(self, room_id: str, username1: str, username2: str, connections: ConnectionManager) -> None:
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
        self.lock = asyncio.Lock() # process messages one at a time


    async def start_game(self):
        "shuffle, deal 2 cards to each player and the dealer and player 1 starts"
        async with self.lock:
            if self.game_state != GameStateEnum.WAITING:
                raise GameError("GAME_ALREADY_STARTED", "The game already started")

            self.deck.shuffle()
            for i in range(2):
                for player in self.players:
                    player.get_hand().add_card(self.deck.draw_card())
                
                self.dealer_hand.add_card(self.deck.draw_card())

            self.game_state = GameStateEnum.PLAYING
            self.current_turn = CurrentPlayerEnum.PLAYER1
            await self.broadcast_state()


    async def handle_player_action(self, username: str, action: PlayerActionEnum):
        "validates the action"
        async with self.lock:
            if self.game_state != GameStateEnum.PLAYING:
                raise GameError("GAME_NOT_ACTIVE", "The game is not in progress")

            player = self.get_player(username)
            if player.role != self.current_turn:
                raise GameError("NOT_YOUR_TURN", "It is not your turn")

            raise GameError("NOT_IMPLEMENTED","Actions is not implemented yet")


    def get_player(self, username: str):
        for player in self.players:
            if player.username == username:
                return player
        raise GameError("NOT_IN_GAME", "You are not part of this game")


    def get_sync_payload(self, viewer: str):
        "state each player can see"
        reveal = ( self.game_state == GameStateEnum.DEALER_TURN or self.game_state == GameStateEnum.FINISHED)

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
            players.append({
                "username": player.username,
                "role": player.role.value,
                "hand": [card.to_dict() for card in player.get_hand().cards],
                "score": player.get_hand().get_score(),
                "status": player.status.value,
            })

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


    async def broadcast_state(self):
        "send the state to both players"
        for player in self.players:
            payload = self.get_sync_payload(player.username)
            await self.connections.send(player.username, GameStateMsg(state=payload))