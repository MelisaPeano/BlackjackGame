import uuid

from app.models.hand import Hand
from app.models.current_player_enum import CurrentPlayerEnum
from app.models.player_status_enum import PlayerStatusEnum


class GameUser:

    def __init__(self, user_id: str, username: str, role: CurrentPlayerEnum) -> None:
        self.game_user_id = uuid.uuid4().hex
        self.user_id = user_id
        self.username = username
        self.role = role
        self.is_online = True
        self.hand = Hand()
        self.status = PlayerStatusEnum.ACTIVE
        self.outcome = None

    def get_hand(self):
        return self.hand