import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSoundEffects } from '../hooks/useSoundEffects';

import chip1 from '../assets/images/blackjack/pokerchip1.png';
import chip2 from '../assets/images/blackjack/pokerchip2.png';
import chip3 from '../assets/images/blackjack/pokerchip3.png';

type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'jack' | 'queen' | 'king' | 'ace';

interface Card {
  suit: Suit;
  rank: Rank;
  isHidden?: boolean;
}

const cardImages = import.meta.glob('../assets/images/blackjack/*.png', { 
  eager: true, 
  query: '?url', 
  import: 'default' 
});

const getCardImage = (card: Card) => {
  const fileName = card.isHidden ? 'card_back.png' : `${card.rank}_of_${card.suit}.png`;
  const exactPath = `../assets/images/blackjack/${fileName}`;
  return (cardImages[exactPath] as string) || '';
};

const createShuffledDeck = (): Card[] => {
  const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
  const ranks: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king', 'ace'];
  const deck: Card[] = [];
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ suit, rank });
    }
  }
  return deck.sort(() => Math.random() - 0.5);
};

// --- MOTOR DEL JUEGO (Lógica traducida de Ren'Py) ---
const calculateHandValue = (hand: Card[]) => {
  let total = 0;
  let aces = 0;

  for (const card of hand) {
    if (card.isHidden) continue; // No sumar cartas ocultas
    
    if (['jack', 'queen', 'king'].includes(card.rank)) {
      total += 10;
    } else if (card.rank === 'ace') {
      total += 11;
      aces += 1;
    } else {
      total += parseInt(card.rank);
    }
  }

  // Ajuste del As (de 11 a 1) si nos pasamos de 21
  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }
  return total;
};

const BlackjackTable: React.FC = () => {
  const { user, updateChips } = useAuth();
  const { playChip, playPlaceBet, playCard, playWin, playLose } = useSoundEffects();
  
  
  const [currentBet, setCurrentBet] = useState(0);
  const [deck, setDeck] = useState<Card[]>(createShuffledDeck());
  const [dealerHand, setDealerHand] = useState<Card[]>([]);
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameResult, setGameResult] = useState<string | null>(null);

  const addBet = (amount: number) => {
  if (isPlaying) return; 
  if (user && user.chips < amount) {
    // Evita que apueste si no tiene saldo suficiente
    return;
  }
  
  playChip();
  updateChips(-amount); // Descuenta las fichas del perfil global instantáneamente
  setCurrentBet(prev => prev + amount);
};

const clearBet = () => {
  if (!isPlaying && currentBet > 0) {
    updateChips(currentBet); // Devuelve las fichas al perfil global
    setCurrentBet(0);
  }
};

  const handleDeal = () => {
    if (currentBet === 0 || deck.length < 10) {
        setDeck(createShuffledDeck()); // Barajar si quedan pocas cartas
    }
    
    playPlaceBet();
    setIsPlaying(true);
    setGameResult(null);
    
    const newDeck = [...(deck.length < 10 ? createShuffledDeck() : deck)];
    const pHand = [newDeck.pop()!, newDeck.pop()!];
    const dHand = [newDeck.pop()!, { ...newDeck.pop()!, isHidden: true }];
    
    setDeck(newDeck);

    setTimeout(() => { setPlayerHand([pHand[0]]); playCard(); }, 300);
    setTimeout(() => { setDealerHand([dHand[0]]); playCard(); }, 600);
    setTimeout(() => { setPlayerHand(pHand); playCard(); }, 900);
    setTimeout(() => { 
        setDealerHand(dHand); 
        playCard(); 
        
        // Comprobar Blackjack inicial
        if (calculateHandValue(pHand) === 21) {
            handleEndGame(pHand, dHand, newDeck, true);
        }
    }, 1200);
  };

  const handleHit = () => {
    const newDeck = [...deck];
    const newCard = newDeck.pop()!;
    const newHand = [...playerHand, newCard];
    
    setDeck(newDeck);
    setPlayerHand(newHand);
    playCard();

    if (calculateHandValue(newHand) > 21) {
      setTimeout(() => handleEndGame(newHand, dealerHand, newDeck), 500);
    }
  };

  const handleStand = () => {
    handleEndGame(playerHand, dealerHand, deck);
  };

  const handleEndGame = (pHand: Card[], dHand: Card[], currentDeck: Card[], isBlackjack = false) => {
  const finalDealerHand = [...dHand];
  finalDealerHand[1].isHidden = false;
  
  let dealerTotal = calculateHandValue(finalDealerHand);
  const playerTotal = calculateHandValue(pHand);

  while (dealerTotal < 17 && playerTotal <= 21 && !isBlackjack) {
      const nextCard = currentDeck.pop()!;
      finalDealerHand.push(nextCard);
      dealerTotal = calculateHandValue(finalDealerHand);
  }

  setDealerHand(finalDealerHand);
  setDeck(currentDeck);

  // --- Lógica de Pagos ---
  if (playerTotal > 21) {
      setGameResult("¡Te pasaste! Gana el Dealer.");
      playLose();
      // No hay reembolso, las fichas ya se descontaron en addBet
  } else if (dealerTotal > 21 || playerTotal > dealerTotal) {
      setGameResult(isBlackjack ? "¡BLACKJACK! Has ganado." : "¡Has ganado!");
      playWin();
      // Pago de Blackjack es 3:2 (recupera 100% de la apuesta + 150% de ganancia = 2.5x)
      // Pago normal es 1:1 (recupera 100% de la apuesta + 100% de ganancia = 2x)
      updateChips(isBlackjack ? currentBet * 2.5 : currentBet * 2);
  } else if (dealerTotal > playerTotal) {
      setGameResult("Gana el Dealer.");
      playLose();
  } else {
      setGameResult("Empate. Se devuelve la apuesta.");
      playChip(); 
      updateChips(currentBet); // Se le devuelve exactamente lo que apostó
  }
  
  setIsPlaying(false);
};

  const resetTable = () => {
    setPlayerHand([]);
    setDealerHand([]);
    setGameResult(null);
    setCurrentBet(0);
  };

  return (
    <div className="min-h-screen bg-green-800 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-green-700 to-green-900 p-6 flex flex-col justify-between text-white font-sans border-[16px] border-yellow-900/80 rounded-3xl m-4 shadow-2xl relative overflow-hidden">
      
      {/* Área del Dealer */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="flex items-center space-x-4 mb-4">
            <h2 className="text-xl font-serif text-green-300/50 tracking-widest uppercase">Dealer</h2>
            {dealerHand.length > 0 && (
                <span className="bg-black/40 px-3 py-1 rounded-full font-bold text-yellow-500">
                    {calculateHandValue(dealerHand)}
                </span>
            )}
        </div>
        <div className="flex justify-center h-40">
          {dealerHand.length === 0 ? (
            <div className="h-32 w-24 border-2 border-dashed border-green-500/30 rounded-lg" />
          ) : (
            dealerHand.map((card, index) => (
              <img 
                key={index}
                src={getCardImage(card)} 
                alt="Dealer Card"
                className="w-24 h-36 object-contain -ml-6 first:ml-0 drop-shadow-xl animate-[fade-in-up_0.3s_ease-out]"
                style={{ zIndex: index }}
              />
            ))
          )}
        </div>
      </div>

      {/* Cartel de Resultado Central */}
      {gameResult && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 bg-black/80 border-2 border-yellow-500 p-6 rounded-2xl backdrop-blur-md text-center shadow-[0_0_30px_rgba(234,179,8,0.3)]">
              <h2 className="text-3xl font-bold text-yellow-500 mb-4">{gameResult}</h2>
              <button onClick={resetTable} className="px-6 py-2 bg-yellow-500 text-black font-bold rounded-full hover:bg-yellow-400">
                  Nueva Partida
              </button>
          </div>
      )}

      {/* Área del Jugador */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="flex justify-center h-40 mb-4">
          {playerHand.length === 0 ? (
            <div className="h-32 w-24 border-2 border-dashed border-green-500/30 rounded-lg" />
          ) : (
            playerHand.map((card, index) => (
              <img 
                key={index}
                src={getCardImage(card)} 
                alt="Player Card"
                className="w-24 h-36 object-contain -ml-6 first:ml-0 drop-shadow-xl transition-transform hover:-translate-y-2"
                style={{ zIndex: index }}
              />
            ))
          )}
        </div>
        <div className="flex items-center space-x-4 mb-8">
            <h2 className="text-xl font-serif text-green-300/50 tracking-widest uppercase">Tú</h2>
            {playerHand.length > 0 && (
                <span className="bg-black/40 px-3 py-1 rounded-full font-bold text-green-400">
                    {calculateHandValue(playerHand)}
                </span>
            )}
        </div>
        
        {/* Panel de Apuestas y Acciones */}
        <div className="flex flex-col items-center bg-black/20 p-6 rounded-2xl backdrop-blur-sm border border-black/10">
          <p className="text-yellow-500 text-xl font-bold mb-4 font-serif">Apuesta Actual: ${currentBet}</p>
          
          {!isPlaying && !gameResult ? (
            <>
              <div className="flex space-x-4 mb-6">
                <button onClick={() => addBet(10)} style={{ backgroundImage: `url(${chip1})` }} className="w-16 h-16 bg-contain bg-center bg-no-repeat hover:-translate-y-1 transition-transform flex items-center justify-center font-bold text-black drop-shadow-md">10</button>
                <button onClick={() => addBet(100)} style={{ backgroundImage: `url(${chip2})` }} className="w-16 h-16 bg-contain bg-center bg-no-repeat hover:-translate-y-1 transition-transform flex items-center justify-center font-bold text-black drop-shadow-md">100</button>
                <button onClick={() => addBet(500)} style={{ backgroundImage: `url(${chip3})` }} className="w-16 h-16 bg-contain bg-center bg-no-repeat hover:-translate-y-1 transition-transform flex items-center justify-center font-bold text-black drop-shadow-md">500</button>
              </div>
              <div className="flex space-x-4">
                <button onClick={clearBet} disabled={currentBet === 0} className="px-6 py-2 rounded-full border border-red-500/50 text-red-400 hover:bg-red-500/10 disabled:opacity-50 transition-colors">Borrar</button>
                <button onClick={handleDeal} disabled={currentBet === 0} className="px-8 py-2 rounded-full bg-yellow-500 text-black font-bold hover:bg-yellow-400 disabled:opacity-50 disabled:bg-gray-500 transition-colors shadow-[0_0_15px_rgba(234,179,8,0.4)]">Repartir</button>
              </div>
            </>
          ) : isPlaying ? (
            <div className="flex space-x-4">
              <button onClick={handleHit} className="px-8 py-3 rounded-full bg-green-600 text-white font-bold hover:bg-green-500 transition-colors shadow-lg border border-green-400/50">Pedir (Hit)</button>
              <button onClick={handleStand} className="px-8 py-3 rounded-full bg-red-600 text-white font-bold hover:bg-red-500 transition-colors shadow-lg border border-red-400/50">Plantarse (Stand)</button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="absolute top-8 left-8 text-green-200/80">
        <p className="font-bold text-lg">{user?.username}</p>
        <p>Fichas: ${user?.chips}</p>
      </div>
    </div>
  );
};

export default BlackjackTable;