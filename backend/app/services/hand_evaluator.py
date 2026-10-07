from app.models.hand import Hand
from app.models.outcome_enum import OutcomeEnum


class HandEvaluator:
    "Compares one player hand vs dealer hand and says who wins"

    @staticmethod
    def evaluate(player_hand: Hand, dealer_hand: Hand):
        # player went over 21: loses, no matter what the dealer has
        if player_hand.is_bust():
            return OutcomeEnum.LOSE

        # dealer has blackjack: only a player blackjack avoids losing
        if dealer_hand.is_blackjack():
            if player_hand.is_blackjack():
                return OutcomeEnum.DRAW
            return OutcomeEnum.LOSE

        # player has blackjack and the dealer does not: player wins
        if player_hand.is_blackjack():
            return OutcomeEnum.WIN

        # dealer went over 21 (player is not bust at this point): player wins
        if dealer_hand.is_bust():
            return OutcomeEnum.WIN

        # nobody busted: compare scores
        player_score = player_hand.get_score()
        dealer_score = dealer_hand.get_score()

        if player_score > dealer_score:
            return OutcomeEnum.WIN
        if player_score < dealer_score:
            return OutcomeEnum.LOSE
        return OutcomeEnum.DRAW