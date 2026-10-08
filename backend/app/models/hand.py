from app.domain.blackjack_rules import calculate_score, is_blackjack, is_bust
from app.models.card import Card


class Hand:
    """Clase orientada a objetos que encapsula una colección de cartas y delega cálculos en reglas puras."""

    def __init__(self) -> None:
        self.cards: list[Card] = []

    def add_card(self, card: Card) -> None:
        """Agrega una carta a la mano del jugador o dealer."""
        self.cards.append(card)

    def get_score(self) -> int:
        """Calcula el mejor puntaje sin superar 21 delegando en la función pura calculate_score."""
        return calculate_score(self.cards)

    def is_bust(self) -> bool:
        """Determina si la mano supera 21 puntos mediante la función pura is_bust."""
        return is_bust(self.cards)

    def is_blackjack(self) -> bool:
        """Determina si la mano es un Blackjack natural delegando en la función pura is_blackjack."""
        return is_blackjack(self.cards)