from app.domain.blackjack_rules import evaluate_hand_outcome
from app.models.hand import Hand
from app.models.outcome_enum import OutcomeEnum


class HandEvaluator:
    """Clase evaluadora de manos que delega la lógica de comparación en la función pura evaluate_hand_outcome."""

    @staticmethod
    def evaluate(player_hand: Hand, dealer_hand: Hand) -> OutcomeEnum:
        """Compara la mano de un jugador frente a la del dealer y determina si gana, pierde o empata."""
        return evaluate_hand_outcome(player_hand.cards, dealer_hand.cards)