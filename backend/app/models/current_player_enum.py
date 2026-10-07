from enum import Enum


class CurrentPlayerEnum(str, Enum):
    NULL = "NULL"
    PLAYER1 = "PLAYER1"
    PLAYER2 = "PLAYER2"
    DEALER = "DEALER"