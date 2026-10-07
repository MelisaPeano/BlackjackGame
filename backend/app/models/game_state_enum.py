from enum import Enum


class GameStateEnum(str, Enum):
    WAITING = "WAITING"
    PLAYING = "PLAYING"
    DEALER_TURN = "DEALER_TURN"
    FINISHED = "FINISHED"