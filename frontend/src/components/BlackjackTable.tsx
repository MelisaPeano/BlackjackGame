import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useNavigate } from 'react-router-dom';
import { useSoundEffects } from '../hooks/useSoundEffects';

import chip1 from '../assets/images/blackjack/pokerchip1.png';
import chip2 from '../assets/images/blackjack/pokerchip2.png';
import chip3 from '../assets/images/blackjack/pokerchip3.png';

const cardImages = import.meta.glob('../assets/images/blackjack/*.png', { 
  eager: true, 
  query: '?url', 
  import: 'default' 
});

const getCardImage = (card: any) => {
  if (card.hidden) {
    return (cardImages['../assets/images/blackjack/card_back.png'] as string) || '';
  }

  const faceCards: Record<string, string> = {
    'A': 'ace', 'J': 'jack', 'Q': 'queen', 'K': 'king'
  };

  const rankStr = card.rank.toString().toUpperCase();
  const mappedRank = faceCards[rankStr] || rankStr.toLowerCase();
  const mappedSuit = card.suit.toLowerCase();

  const fileName = `${mappedRank}_of_${mappedSuit}.png`;
  const exactPath = `../assets/images/blackjack/${fileName}`;
  
  return (cardImages[exactPath] as string) || '';
};

const BlackjackTable: React.FC = () => {
  const { user, updateChips } = useAuth();
  const { socket, gameState, setGameState, setGameStarted } = useSocket();
  const { playChip, playWin, playLose } = useSoundEffects();
  const navigate = useNavigate();
  
  const hasEmitted = useRef(false);
  const [currentBet, setCurrentBet] = useState(100); 

  const currentUsername = user?.username || localStorage.getItem('casino_username') || 'Jugador';
  const currentChips = user?.chips ?? 10000;

  useEffect(() => {
    const me = gameState?.players?.find((p: any) => p.username === currentUsername);
    const stateStr = String(gameState?.state).toLowerCase();
    
    if (stateStr === 'finished' && me?.outcome && !hasEmitted.current) {
      if (socket && socket.readyState === WebSocket.OPEN) {
        const matchResult = me.outcome === 'lose' ? 'loss' : me.outcome;
        
        socket.send(JSON.stringify({
          type: 'score_update',
          username: currentUsername,
          result: matchResult
        }));

        if (matchResult === 'win') {
          playWin();
          updateChips(currentBet * 2); 
        } else if (matchResult === 'loss') {
          playLose();
          updateChips(-currentBet); 
        } else if (matchResult === 'tie') {
          playChip();
        }

        hasEmitted.current = true;
      }
    }

    if (stateStr !== 'finished') {
      hasEmitted.current = false;
    }
  }, [gameState, socket, currentUsername, currentBet, updateChips, playWin, playLose, playChip]);

  if (!gameState) {
    return (
      <div className="min-h-screen bg-green-900 flex items-center justify-center text-white font-serif">
        <h2 className="text-2xl animate-pulse">Sincronizando mesa multijugador...</h2>
      </div>
    );
  }

  const me = gameState.players.find((p: any) => p.username === currentUsername);
  const opponent = gameState.players.find((p: any) => p.username !== currentUsername);
  
  // Normalizamos el estado para evitar fallos por mayúsculas/minúsculas del backend
  const stateStr = String(gameState.state).toLowerCase();
  const isFinished = stateStr === 'finished';
  
  // Validación a prueba de fallos: si es tu turno y no ha terminado, mostramos los botones
  const isMyTurn = !isFinished && gameState.turn_username === currentUsername;

  const revealOpponent = isFinished || opponent?.status === 'stand' || opponent?.status === 'bust';

  const handleHit = () => socket?.send(JSON.stringify({ type: 'hit' }));
  const handleStand = () => socket?.send(JSON.stringify({ type: 'stand' }));
  const handleLeave = () => {
    if (window.confirm('¿Seguro que quieres abandonar? Perderás la partida.')) {
      socket?.send(JSON.stringify({ type: 'leave_game' }));
    }
  };  

  const addBet = (amount: number) => {
    if (!isFinished) {
      playChip();
      setCurrentBet(prev => prev + amount);
    }
  };

  const leaveTable = () => {
    setGameState(null);
    setGameStarted(false);
    navigate('/dashboard');
  };
  return (
    <div className="min-h-screen bg-green-800 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-green-700 to-green-900 p-6 flex flex-col justify-between text-white font-sans border-[16px] border-yellow-900/80 rounded-3xl m-4 shadow-2xl relative overflow-hidden">
      
      <div className="absolute top-8 left-8 text-green-200/80 z-10">
        <p className="font-bold text-lg">{currentUsername}</p>
        <p>Saldo: ${currentChips}</p>
      </div>

      {/* Boton abandonar la partida en curso */}
      {!isFinished && (
        <button
          onClick={handleLeave}
          className="absolute top-8 right-8 z-10 px-4 py-2 text-sm font-bold text-red-200 bg-red-900/60 hover:bg-red-800/80 border border-red-500/50 rounded-lg transition-colors"
        >
          Abandonar partida
        </button>
      )}

      {/* 1. ÁREA DEL DEALER */}
      <div className="flex flex-col items-center p-2">
        <div className="flex items-center space-x-4 mb-2">
            <h2 className="text-lg font-serif text-green-300/50 tracking-widest uppercase">Dealer</h2>
            {gameState.dealer.score && (
                <span className="bg-black/40 px-3 py-1 rounded-full font-bold text-yellow-500">
                    {gameState.dealer.score}
                </span>
            )}
        </div>
        <div className="flex justify-center h-32">
          {gameState.dealer.hand.map((card: any, index: number) => (
            <img 
              key={index}
              src={getCardImage(card)} 
              alt="Dealer Card"
              className="w-20 h-32 object-contain -ml-6 first:ml-0 drop-shadow-xl transition-all"
              style={{ zIndex: index }}
            />
          ))}
        </div>
      </div>

      {/* 2. ÁREA DEL OPONENTE */}
      {opponent && (
        <div className="flex flex-col items-center p-2 opacity-80 scale-90">
          <div className="flex items-center space-x-4 mb-2">
              <h2 className="text-md font-serif text-slate-300/50 tracking-widest uppercase">{opponent.username}</h2>
              <span className={`px-2 py-1 rounded-full font-bold text-sm ${opponent.status === 'bust' ? 'bg-red-500/20 text-red-400' : 'bg-black/40 text-slate-300'}`}>
                  {opponent.status.toUpperCase()} {revealOpponent ? `(${opponent.score})` : '(?)'}
              </span>
          </div>
          <div className="flex justify-center h-28">
            {opponent.hand.map((card: any, index: number) => (
              <img 
                key={index}
                src={revealOpponent ? getCardImage(card) : getCardImage({ ...card, hidden: true })} 
                alt="Opponent Card"
                className="w-16 h-24 object-contain -ml-4 first:ml-0 drop-shadow-lg transition-all"
                style={{ zIndex: index }}
              />
            ))}
          </div>
        </div>
      )}

      {/* RESULTADO CENTRAL */}
      {isFinished && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 bg-black/90 border-2 border-yellow-500 p-8 rounded-2xl backdrop-blur-md text-center shadow-[0_0_40px_rgba(234,179,8,0.4)]">
              <h2 className="text-3xl font-bold text-yellow-500 mb-2">Partida Finalizada</h2>
              <p className="text-xl text-white mb-6">
                Tu resultado: <span className="font-bold uppercase">{me?.outcome}</span>
              </p>
              <button onClick={leaveTable} className="px-6 py-2 bg-yellow-500 text-black font-bold rounded-full hover:bg-yellow-400">
                  Volver al Lobby
              </button>
          </div>
      )}

      {/* 3. TU ÁREA (Jugador local) */}
      {me && (
        <div className="flex flex-col items-center p-2 bg-black/10 rounded-2xl pb-6">
          <div className="flex justify-center h-36 mb-4">
            {me.hand.map((card: any, index: number) => (
              <img 
                key={index}
                src={getCardImage(card)} 
                alt="Player Card"
                className="w-24 h-36 object-contain -ml-6 first:ml-0 drop-shadow-xl hover:-translate-y-2 transition-transform"
                style={{ zIndex: index }}
              />
            ))}
          </div>
          <div className="flex items-center space-x-4 mb-4">
              <h2 className="text-xl font-serif text-green-300/80 tracking-widest uppercase">Tú</h2>
              <span className={`px-3 py-1 rounded-full font-bold ${me.status === 'bust' ? 'bg-red-500/80 text-white' : 'bg-green-600/80 text-white'}`}>
                  {me.score}
              </span>
          </div>
          
          <div className="flex flex-col items-center">
            <p className="text-yellow-500 font-bold mb-2">Apuesta: ${currentBet}</p>
            
            <div className="flex space-x-4 mb-4">
                <button onClick={() => addBet(10)} style={{ backgroundImage: `url(${chip1})` }} className="w-12 h-12 bg-contain bg-center bg-no-repeat hover:-translate-y-1 transition-transform flex items-center justify-center font-bold text-black drop-shadow-md">10</button>
                <button onClick={() => addBet(100)} style={{ backgroundImage: `url(${chip2})` }} className="w-12 h-12 bg-contain bg-center bg-no-repeat hover:-translate-y-1 transition-transform flex items-center justify-center font-bold text-black drop-shadow-md">100</button>
                <button onClick={() => addBet(500)} style={{ backgroundImage: `url(${chip3})` }} className="w-12 h-12 bg-contain bg-center bg-no-repeat hover:-translate-y-1 transition-transform flex items-center justify-center font-bold text-black drop-shadow-md">500</button>
            </div>

            <div className="h-14 flex items-center justify-center w-full">
              {isMyTurn ? (
                <div className="flex space-x-4 animate-[fade-in-up_0.3s_ease-out]">
                  <button onClick={handleHit} className="px-8 py-3 rounded-full bg-green-600 text-white font-bold hover:bg-green-500 transition-colors shadow-lg border border-green-400/50">Pedir Carta</button>
                  <button onClick={handleStand} className="px-8 py-3 rounded-full bg-red-600 text-white font-bold hover:bg-red-500 transition-colors shadow-lg border border-red-400/50">Plantarse</button>
                </div>
              ) : !isFinished ? (
                <p className="text-yellow-500 font-bold animate-pulse text-lg tracking-wide">Esperando a {gameState.turn_username}...</p>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BlackjackTable;