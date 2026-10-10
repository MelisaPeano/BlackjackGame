from typing import Sequence
from app.models.card import Card
from app.models.current_player_enum import CurrentPlayerEnum
from app.models.outcome_enum import OutcomeEnum
from app.models.player_status_enum import PlayerStatusEnum


def calculate_score(cards: Sequence[Card]) -> int:
    """
    Función pura: Calcula la puntuación óptima de una mano de cartas.
    Los Ases valen inicialmente 11, pero si la suma supera 21, se reducen a 1 de forma iterativa.
    """
    total = 0
    aces = 0

    for card in cards:
        total += card.value
        if card.rank == "A":
            aces += 1

    # Reducción de Ases de 11 a 1 (restando 10 por cada As) si se excede 21
    while total > 21 and aces > 0:
        total -= 10
        aces -= 1

    return total


def is_bust(cards: Sequence[Card]) -> bool:
    """Función pura: Determina si una mano supera los 21 puntos (Bust)."""
    return calculate_score(cards) > 21


def is_blackjack(cards: Sequence[Card]) -> bool:
    """
    Función pura: Determina si la mano es un Blackjack natural (21 puntos con exactamente 2 cartas).
    Obtener 21 con 3 o más cartas no califica como Blackjack según la sección 8 del README.
    """
    return len(cards) == 2 and calculate_score(cards) == 21


def should_dealer_hit(dealer_score: int) -> bool:
    """
    Función pura: Regla obligatoria del dealer establecida en la sección 9 del README:
    - Dealer <= 16 -> HIT (pide carta)
    - Dealer >= 17 -> STAND (se planta)
    """
    return dealer_score <= 16


def evaluate_hand_outcome(player_cards: Sequence[Card], dealer_cards: Sequence[Card]) -> OutcomeEnum:
    """
    Función pura: Determina el resultado final de un jugador frente al dealer
    según las reglas oficiales de la sección 10 del README:
    - Caso 1: Jugador con Bust (> 21) -> PIERDE.
    - Caso 2: Dealer con Bust (> 21) y jugador <= 21 -> GANA.
    - Caso Blackjack: Si ambos tienen Blackjack -> EMPATE; si solo el jugador tiene Blackjack -> GANA; si solo el dealer tiene Blackjack -> PIERDE.
    - Caso Comparación de puntajes: Puntaje mayor gana, mismo puntaje es empate.
    """
    player_busted = is_bust(player_cards)
    if player_busted:
        return OutcomeEnum.LOSE

    dealer_busted = is_bust(dealer_cards)
    if dealer_busted:
        return OutcomeEnum.WIN

    player_bj = is_blackjack(player_cards)
    dealer_bj = is_blackjack(dealer_cards)

    if player_bj and dealer_bj:
        return OutcomeEnum.DRAW
    if player_bj:
        return OutcomeEnum.WIN
    if dealer_bj:
        return OutcomeEnum.LOSE

    player_score = calculate_score(player_cards)
    dealer_score = calculate_score(dealer_cards)

    if player_score > dealer_score:
        return OutcomeEnum.WIN
    elif player_score < dealer_score:
        return OutcomeEnum.LOSE
    else:
        return OutcomeEnum.DRAW


def determine_next_turn(
    current_turn: CurrentPlayerEnum,
    player1_status: PlayerStatusEnum,
    player2_status: PlayerStatusEnum,
) -> CurrentPlayerEnum:
    """
    Función pura: Calcula qué turno corresponde a continuación siguiendo el flujo:
    Jugador 1 -> Jugador 2 -> Dealer -> NULL (Finalizado).
    Si un jugador ya se plantó o se pasó (Bust/Blackjack), el turno avanza automáticamente.
    """
    # Si actualmente es el turno del Jugador 1
    if current_turn == CurrentPlayerEnum.PLAYER1:
        # Si el Jugador 2 aún puede jugar (está activo), le corresponde el turno
        if player2_status == PlayerStatusEnum.ACTIVE:
            return CurrentPlayerEnum.PLAYER2
        # Si el Jugador 2 no puede jugar, pasa directamente al Dealer
        return CurrentPlayerEnum.DEALER

    # Si actualmente es el turno del Jugador 2, pasa obligatoriamente al Dealer
    if current_turn == CurrentPlayerEnum.PLAYER2:
        return CurrentPlayerEnum.DEALER

    # Si era el turno del Dealer, no hay más turnos de jugadores
    return CurrentPlayerEnum.NULL
