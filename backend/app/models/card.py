from dataclasses import dataclass

SUITS = ("hearts", "diamonds", "clubs", "spades")
RANKS = ("2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A")

BASE_CARD_VALUES = {
    "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9, "10": 10,
    "J": 10, "Q": 10, "K": 10,
    "A": 11
}


@dataclass(frozen=True)
class Card:
    suit: str
    rank: str

    def __post_init__(self):
        if self.suit not in SUITS or self.rank not in RANKS:
            raise ValueError(f"invalid card: {self.rank} de {self.suit}")


    @property
    def value(self):
        return BASE_CARD_VALUES[self.rank]


    def to_dict(self):
        "format for send to frontend"
        return {"suit": self.suit, "rank": self.rank}