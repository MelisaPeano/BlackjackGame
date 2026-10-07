from app.models.card import Card

class Hand:

    def __init__(self) -> None:
        self.cards = []


    def add_card(self, card: Card):
        self.cards.append(card)


    def get_score(self):
        "best score without going over 21 (aces count as 11 or 1)"

        total = 0
        aces = 0

        for card in self.cards:
            total += card.value
            if card.rank == "A":
                aces += 1

        # if we ent over 21, turn aces from 11 into 1 (subtract 10) one by one
        while total > 21 and aces > 0:
            total -= 10
            aces -= 1

        return total


    def is_bust(self):
        return self.get_score() > 21


    def is_blackjack(self):
        "Blackjack = 21 with exactly the first two cards"    
        return len(self.cards) == 2 and self.get_score() == 21
        