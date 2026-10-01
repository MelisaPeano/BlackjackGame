# BlackjackGame

## 1. Description

Blackjack, also known as 21, is a card game in which players must get a score as close as possible to 21 without going over that value.

This project will implement an online multiplayer version for two players connected simultaneously, using a client-server architecture.

The server will be responsible for maintaining the game state, controlling turns, managing cards, and determining the final result.

The application must maintain the same game state for both players.

---

## 2. Objective of the Game

The objective is to get a higher score than the dealer without going over 21.

A player can win in the following ways:

* Have a higher score than the dealer without going over 21.
* The dealer goes over 21.
* Get Blackjack with the first two cards, as long as the dealer does not have Blackjack.

If the player goes over 21, they automatically lose.

If the player and the dealer have the same score, the result is a tie.

---

## 3. Participants

Each game will have:

* 2 players.
* 1 dealer, controlled by the server.

The players will be connected to the server through the network.

The dealer is not a real user. Its actions will be controlled automatically according to the game rules.

---

## 4. Card Values

| Card | Value   |
| ---- | ------- |
| 2    | 2       |
| 3    | 3       |
| 4    | 4       |
| 5    | 5       |
| 6    | 6       |
| 7    | 7       |
| 8    | 8       |
| 9    | 9       |
| 10   | 10      |
| J    | 10      |
| Q    | 10      |
| K    | 10      |
| A    | 1 or 11 |

### Aces

The Ace can be worth 1 or 11.

The value used must be the one that allows the best possible score without going over 21.

For example:

* A + 6 = 17
* A + 9 = 20
* A + K = 21
* A + 9 + 5 = 15

In the last case, the Ace becomes worth 1 to avoid going over 21.

---

## 5. Starting a Game

When two players are in a game:

1. The server creates a new game.
2. A deck is created and shuffled.
3. A hand is assigned to Player 1.
4. A hand is assigned to Player 2.
5. A hand is assigned to the dealer.
6. Each player receives 2 cards.
7. The dealer receives 2 cards.
8. One dealer card remains visible and the other remains hidden.
9. The first player's turn begins.

The server is responsible for controlling the game state and preventing clients from directly modifying it.

---

## 6. Player Turns

The players play one after another.

The order will be:

**Player 1 → Player 2 → Dealer → Result**

During their turn, the player can perform one of the following actions:

### Hit

The player asks for an additional card.

After receiving the card:

* If the score is less than or equal to 21, they can choose an action again.
* If the score goes over 21, the player is eliminated from the round due to Bust and their turn ends.
* If the score is 21, the turn ends automatically.

### Stand

The player decides not to receive any more cards.

Their score is saved and their turn ends.

---

## 7. Bust

A player gets a Bust when their score goes over 21.

Example:

**Player:**

10 + 8 + 7 = 25

25 > 21

**Result: Bust**

When a player gets a Bust:

* They cannot ask for more cards.
* Their turn ends.
* They lose the round.

---

## 8. Blackjack

A player has Blackjack when they receive:

**Ace + card with a value of 10**

in their first two cards.

Examples:

* A + K = Blackjack
* A + Q = Blackjack
* A + J = Blackjack
* A + 10 = Blackjack

A 21 achieved after asking for additional cards is not considered Blackjack.

For example:

7 + 7 + 7 = 21

This is a 21, but it is not Blackjack because three cards were used.

---

## 9. Dealer Turn

When both players have finished their turns, the dealer's turn begins.

The dealer reveals the hidden card.

The dealer follows automatic rules:

* If the dealer has 16 or less → they must take another card.
* If the dealer has 17 or more → they must stand.
* If the dealer goes over 21 → they get a Bust.

The dealer cannot freely choose between hitting or standing.

For this project, we will use the following rule:

**Dealer <= 16 → HIT**

**Dealer >= 17 → STAND**

The game will use this rule consistently for all rounds.

---

## 10. Determining the Winner

Once the dealer's turn is finished, the server compares each player's hand with the dealer's hand.

### Case 1: The player gets a Bust

Player > 21

**Result: Loses**

### Case 2: The dealer gets a Bust

Dealer > 21

Player <= 21

**Result: Player wins**

### Case 3: Both have 21 or less

Their scores are compared.

Example:

Player: 19

Dealer: 17

**Result: Player wins**

### Case 4: The dealer has a higher score

Player: 17

Dealer: 20

**Result: Player loses**

### Case 5: Same Score

Player: 18

Dealer: 18

**Result: TIE**

Each player is compared individually against the dealer.

For example:

Player 1: 18

Player 2: 20

Dealer: 18

Player 1 → TIE

Player 2 → WINS

In this case, Player 1 has the same score as the dealer, so the result is a tie. Player 2 has a higher score than the dealer without going over 21, so Player 2 wins.

---

## 11. Leaving a Game

A player can leave a game at any time.

If a player leaves:

1. The server records the departure.
2. The game ends.
3. The remaining player receives the victory.
4. Both clients receive the final result.

---

## 12. Rules that will NOT be implemented initially

To keep the first version simple, the project will not initially implement:

* Betting.
* Virtual money.
* Insurance.
* Surrender.
* Double Down.
* Split.
* Side bets.

These features could be added later if the team decides to extend the project.

---

## 13. Game Flow

<img src="images/blackjack-flow.png" alt="Blackjack Game" width="600">

---

## 14. Game State

The game must maintain at least the following states:

**WAITING**

↓

**PLAYING**

↓

**DEALER_TURN**

↓

**FINISHED**

The state of a player leaving the game must also be considered.

The server will be the main source of the game state and must keep both clients synchronized.

---

## 15. Important Implementation Rules

To avoid inconsistencies between team members:

1. The client does not decide who wins.
2. The client does not directly modify the game state.
3. The server controls the cards.
4. The server controls the turns.
5. The server calculates the scores.
6. The server determines the result.
7. Both clients receive game state updates.
8. A player can only perform actions during their turn.
9. An action sent out of turn must be rejected.
10. A finished game must not accept new actions.

---

## 16. Reference

As a reference for understanding the general rules of Blackjack:

[Blackjack Reference Video](https://www.youtube.com/watch?v=ifVklNuHDOM)

The implementation of this project will follow the rules defined in this document.

---

## 17. Architecture
<img src="images/architecture.jpg" alt="architecture for game" width="100%">