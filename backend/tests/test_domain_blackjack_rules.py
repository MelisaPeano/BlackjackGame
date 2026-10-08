import pytest
from app.domain.blackjack_rules import (
    calculate_score,
    is_bust,
    is_blackjack,
    should_dealer_hit,
    evaluate_hand_outcome,
    determine_next_turn,
)
from app.models.card import Card
from app.models.current_player_enum import CurrentPlayerEnum
from app.models.outcome_enum import OutcomeEnum
from app.models.player_status_enum import PlayerStatusEnum


def test_calculate_score_with_aces():
    # Casos documentados en la sección 4 del README
    # A + 6 = 17
    assert calculate_score([Card("spades", "A"), Card("hearts", "6")]) == 17
    # A + 9 = 20
    assert calculate_score([Card("spades", "A"), Card("hearts", "9")]) == 20
    # A + K = 21
    assert calculate_score([Card("spades", "A"), Card("hearts", "K")]) == 21
    # A + 9 + 5 = 15 (el As pasa a valer 1)
    assert calculate_score([Card("spades", "A"), Card("hearts", "9"), Card("clubs", "5")]) == 15
    # Dos Ases: A + A = 12 (11 + 1)
    assert calculate_score([Card("spades", "A"), Card("hearts", "A")]) == 12


def test_is_bust():
    # Caso documentado en la sección 7: 10 + 8 + 7 = 25 (Bust)
    busting_hand = [Card("diamonds", "10"), Card("clubs", "8"), Card("spades", "7")]
    assert is_bust(busting_hand) is True

    safe_hand = [Card("diamonds", "10"), Card("clubs", "8")]
    assert is_bust(safe_hand) is False


def test_is_blackjack():
    # Casos documentados en la sección 8
    # As + K = Blackjack natural (2 cartas)
    bj_hand = [Card("spades", "A"), Card("hearts", "K")]
    assert is_blackjack(bj_hand) is True

    # 7 + 7 + 7 = 21 puntos pero NO es Blackjack (son 3 cartas)
    three_sevens = [Card("hearts", "7"), Card("diamonds", "7"), Card("clubs", "7")]
    assert calculate_score(three_sevens) == 21
    assert is_blackjack(three_sevens) is False


def test_dealer_hit_rules():
    # Casos documentados en la sección 9: Dealer <= 16 pide, >= 17 se planta
    assert should_dealer_hit(15) is True
    assert should_dealer_hit(16) is True
    assert should_dealer_hit(17) is False
    assert should_dealer_hit(20) is False


def test_evaluate_hand_outcome():
    # Casos documentados en la sección 10
    # Caso 1: Jugador con bust siempre pierde
    p_bust = [Card("diamonds", "10"), Card("clubs", "8"), Card("spades", "7")]  # 25
    d_bust = [Card("hearts", "10"), Card("spades", "6"), Card("clubs", "6")]    # 22
    assert evaluate_hand_outcome(p_bust, d_bust) == OutcomeEnum.LOSE

    # Caso 2: Dealer con bust y jugador <= 21 gana
    p_safe = [Card("diamonds", "10"), Card("clubs", "9")]  # 19
    assert evaluate_hand_outcome(p_safe, d_bust) == OutcomeEnum.WIN

    # Caso 3: Ambos Blackjack -> Empate
    p_bj = [Card("spades", "A"), Card("hearts", "K")]
    d_bj = [Card("hearts", "A"), Card("spades", "Q")]
    assert evaluate_hand_outcome(p_bj, d_bj) == OutcomeEnum.DRAW

    # Caso 4: Jugador con puntaje mayor gana (19 vs 17)
    d_17 = [Card("hearts", "10"), Card("spades", "7")]
    assert evaluate_hand_outcome(p_safe, d_17) == OutcomeEnum.WIN

    # Caso 5: Dealer con puntaje mayor gana (17 vs 20)
    p_17 = [Card("hearts", "10"), Card("spades", "7")]
    d_20 = [Card("hearts", "10"), Card("spades", "10")]
    assert evaluate_hand_outcome(p_17, d_20) == OutcomeEnum.LOSE

    # Caso 6: Mismo puntaje -> Empate (18 vs 18)
    p_18 = [Card("hearts", "10"), Card("spades", "8")]
    d_18 = [Card("diamonds", "10"), Card("clubs", "8")]
    assert evaluate_hand_outcome(p_18, d_18) == OutcomeEnum.DRAW


def test_determine_next_turn():
    # Jugador 1 termina y Jugador 2 está activo -> turno de Jugador 2
    assert determine_next_turn(
        CurrentPlayerEnum.PLAYER1,
        PlayerStatusEnum.STAND,
        PlayerStatusEnum.ACTIVE
    ) == CurrentPlayerEnum.PLAYER2

    # Jugador 1 termina y Jugador 2 ya se plantó o busteó -> pasa directo al Dealer
    assert determine_next_turn(
        CurrentPlayerEnum.PLAYER1,
        PlayerStatusEnum.STAND,
        PlayerStatusEnum.STAND
    ) == CurrentPlayerEnum.DEALER

    # Jugador 2 termina -> pasa al Dealer
    assert determine_next_turn(
        CurrentPlayerEnum.PLAYER2,
        PlayerStatusEnum.STAND,
        PlayerStatusEnum.STAND
    ) == CurrentPlayerEnum.DEALER
