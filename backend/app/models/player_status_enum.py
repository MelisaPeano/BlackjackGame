from enum import Enum


class PlayerStatusEnum(str, Enum):
    ACTIVE = "ACTIVE"        # can still play
    STAND = "STAND"          # stood or reached 21
    BUST = "BUST"            # went over 21
    BLACKJACK = "BLACKJACK"  # natural blackjack, no need to play
    LEFT = "LEFT"            # left the game