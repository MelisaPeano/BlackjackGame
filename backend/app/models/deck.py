import random
from app.models.card import RANKS, SUITS, Card


class Deck: 
    
    def __init__(self) -> None:
        self.cards = self.create_deck()


    def create_deck(self):
        "Create 52 cards combining each suit with each rank"
        deck = []
        for suit in SUITS:
            for rank in RANKS:
                card = Card(suit = suit, rank = rank)
                deck.append(card)
        
        return deck


    def shuffle(self):
        random.SystemRandom().shuffle(self.cards)
    

    def draw_card(self):
        "Draw and return the first card from the deck"
        if len(self.cards) == 0:
            raise RuntimeError("Deck is empty")

        return self.cards.pop(0)

    
    def __len__(self):
        return len(self.cards)
