import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useNavigate } from 'react-router-dom';
import { useSoundEffects } from '../hooks/useSoundEffects';

import chip1 from '../assets/images/blackjack/pokerchip1.png';
import chip2 from '../assets/images/blackjack/pokerchip2.png';
import chip3 from '../assets/images/blackjack/pokerchip3.png';
import cardBack from '../assets/images/blackjack/card_back.png';
import { XCircle } from 'lucide-react';

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
  const { 
    socket, 
    gameState, 
    setGameState, 
    setGameStarted, 
    sendInvite, 
    cancelMatchmaking, 
    isSearchingMatch 
  } = useSocket();
  const { playChip, playWin, playLose } = useSoundEffects();
  const navigate = useNavigate();
  
  const hasEmitted = useRef(false);
  const [currentBet, setCurrentBet] = useState(100); 
  const [rematchSent, setRematchSent] = useState(false);

  // Si el usuario presiona el botón 'Atrás' en el navegador mientras estaba buscando partida
  useEffect(() => {
    const handlePopState = () => {
      if (isSearchingMatch) {
        cancelMatchmaking();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isSearchingMatch, cancelMatchmaking]);

  const currentUsername = user?.username || localStorage.getItem('casino_username') || 'Jugador';
  const currentChips = user?.chips ?? 10000;

  useEffect(() => {
    const me = gameState?.players?.find((p: any) => p.username === currentUsername);
    const stateStr = String(gameState?.state).toLowerCase();
    const rawOutcome = me?.outcome ? String(me.outcome).toLowerCase() : '';
    
    if (stateStr === 'finished' && rawOutcome && !hasEmitted.current) {
      if (socket && socket.readyState === WebSocket.OPEN) {
        const isWin = rawOutcome === 'win';
        const isLoss = rawOutcome === 'lose' || rawOutcome === 'loss';
        const isTie = rawOutcome === 'tie' || rawOutcome === 'draw';
        
        let delta = 0;
        if (isWin) {
          playWin();
          delta = currentBet;
          // Si obtuvo Blackjack natural (21 con 2 cartas), premio 3:2 (+1.5x)
          if (me.score === 21 && me.hand?.length === 2) {
            delta = Math.floor(currentBet * 1.5);
          }
          updateChips(delta);
        } else if (isLoss) {
          playLose();
          delta = -currentBet;
          updateChips(delta);
        } else if (isTie) {
          playChip();
          delta = 0;
        }

        socket.send(JSON.stringify({
          type: 'score_update',
          username: currentUsername,
          result: isWin ? 'win' : isLoss ? 'loss' : 'tie',
          chips_delta: delta
        }));

        hasEmitted.current = true;
      }
    }

    if (stateStr !== 'finished') {
      hasEmitted.current = false;
      setRematchSent(false);
    }
  }, [gameState, socket, currentUsername, currentBet, updateChips, playWin, playLose, playChip]);

  if (!gameState) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white font-sans relative overflow-hidden">
        {/* Luces y brillo de fondo estilo Casino VIP */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(22,101,52,0.35)_0%,_rgba(15,23,42,0.95)_75%)] pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 bg-slate-900/90 backdrop-blur-xl border border-yellow-500/30 rounded-3xl p-8 max-w-md w-full shadow-[0_0_50px_rgba(234,179,8,0.15)] text-center space-y-6">
          {/* Indicador de carga animado */}
          <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-4 border-yellow-500/20 border-t-yellow-500 animate-spin" />
            <div className="absolute inset-2 rounded-full border-2 border-emerald-500/30 animate-ping opacity-30" />
            <img 
              src={cardBack} 
              alt="Casino Card Back" 
              className="w-12 h-auto drop-shadow-[0_0_15px_rgba(234,179,8,0.6)] animate-pulse"
            />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 text-xs px-3 py-1 rounded-full font-semibold uppercase tracking-wider animate-pulse">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>{isSearchingMatch ? 'Buscando en cola de emparejamiento' : 'Sincronizando mesa multijugador'}</span>
            </div>
            <h2 className="text-2xl font-bold font-serif text-white tracking-wide">
              {isSearchingMatch ? 'Buscando Oponente' : 'Entrando a la Mesa VIP'}
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              Esperando a que otro jugador ingrese a la sala para comenzar la partida en vivo...
            </p>
          </div>

          {/* Botón de Cancelar Búsqueda y Volver al Lobby */}
          <div className="pt-2">
            <button
              onClick={() => {
                if (isSearchingMatch) {
                  cancelMatchmaking();
                }
                navigate('/dashboard');
              }}
              className="w-full flex items-center justify-center space-x-2.5 py-3.5 px-6 rounded-xl font-bold font-sans text-sm uppercase tracking-wider bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/40 hover:border-red-400 transition-all duration-200 shadow-lg hover:shadow-red-950/50 transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            >
              <XCircle className="w-5 h-5 text-red-400" />
              <span>{isSearchingMatch ? 'Cancelar Búsqueda y Volver' : 'Volver al Lobby'}</span>
            </button>
          </div>

          <p className="text-xs text-slate-500">
            Al cancelar o retroceder en el navegador serás retirado de la cola de espera inmediatamente.
          </p>
        </div>
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
      if (currentBet + amount <= currentChips) {
        playChip();
        setCurrentBet(prev => prev + amount);
      }
    }
  };

  const resetBet = () => {
    if (!isFinished) {
      playChip();
      setCurrentBet(Math.min(100, currentChips));
    }
  };

  const handleRematch = () => {
    if (opponent && socket && socket.readyState === WebSocket.OPEN) {
      sendInvite(opponent.username);
      setRematchSent(true);
    }
  };

  const leaveTable = () => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'leave_table' }));
    }
    setGameState(null);
    setGameStarted(false);
    navigate('/dashboard');
  };

  // Cálculo detallado y robusto de los resultados de cada jugador
  const dealerScore = gameState?.dealer?.score;
  const isDealerBust = dealerScore !== undefined && dealerScore > 21;

  const determineOutcome = (p: any): 'win' | 'lose' | 'tie' => {
    if (!p) return 'lose';
    const raw = p.outcome ? String(p.outcome).toLowerCase().trim() : '';
    if (raw === 'win') return 'win';
    if (raw === 'lose' || raw === 'loss') return 'lose';
    if (raw === 'tie' || raw === 'draw') return 'tie';
    
    // Reglas oficiales de Blackjack de respaldo según puntajes
    const pScore = p.score ?? 0;
    if (pScore > 21) return 'lose';
    if (isDealerBust) return 'win';
    if (dealerScore !== undefined) {
      if (pScore > dealerScore) return 'win';
      if (pScore < dealerScore) return 'lose';
      return 'tie';
    }
    return 'lose';
  };

  const myOutcome = determineOutcome(me);
  const oppOutcome = determineOutcome(opponent);

  const meWin = myOutcome === 'win';
  const meLose = myOutcome === 'lose';
  const meTie = myOutcome === 'tie';

  const oppWin = oppOutcome === 'win';
  const oppLose = oppOutcome === 'lose';
  const oppTie = oppOutcome === 'tie';

  let headlineIcon = '🏆';
  let headlineTitle = 'Partida Finalizada';
  let headlineSub = '';

  if (meWin && oppWin) {
    headlineIcon = '🎉';
    headlineTitle = '¡Victoria de los Jugadores!';
    headlineSub = 'Ambos vencieron a la Casa (Dealer)';
  } else if (meWin && !oppWin) {
    headlineIcon = '🥇';
    headlineTitle = `¡${currentUsername} Ganó la Mesa!`;
    headlineSub = isDealerBust 
      ? `El Dealer se pasó con ${dealerScore} pts. ¡Tú ganas con ${me?.score ?? 0} pts!`
      : `Venciste al Dealer (${dealerScore} pts) con ${me?.score ?? 0} puntos`;
  } else if (!meWin && oppWin) {
    headlineIcon = '🥈';
    headlineTitle = `¡${opponent?.username} Ganó la Mesa!`;
    headlineSub = isDealerBust 
      ? `El Dealer se pasó con ${dealerScore} pts. ¡${opponent?.username} gana con ${opponent?.score ?? 0} pts!`
      : `${opponent?.username} venció al Dealer con ${opponent?.score ?? 0} puntos`;
  } else if (meTie || oppTie) {
    headlineIcon = '🤝';
    headlineTitle = '¡Empate con la Casa!';
    headlineSub = 'Apuestas devueltas para los empates';
  } else {
    headlineIcon = '💀';
    headlineTitle = '¡La Casa (Dealer) Gana la Mesa!';
    headlineSub = 'El Dealer superó a los jugadores';
  }

  return (
    <div className="min-h-screen bg-green-800 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-green-700 to-green-900 p-6 flex flex-col justify-between text-white font-sans border-[16px] border-yellow-900/80 rounded-3xl m-4 shadow-2xl relative overflow-hidden">
      
      <div className="absolute top-8 left-8 text-green-200/80 z-10">
        <p className="font-bold text-lg">{currentUsername}</p>
        <p className="text-yellow-400 font-bold">Saldo: ${currentChips.toLocaleString()}</p>
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

      {/* RESULTADO CENTRAL DETALLADO */}
      {isFinished && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 backdrop-blur-md p-4">
          <div className="max-w-md w-full bg-slate-900 border-2 border-yellow-500/80 p-6 md:p-8 rounded-3xl text-center shadow-[0_0_50px_rgba(234,179,8,0.35)] animate-[fade-in-up_0.3s_ease-out]">
            {/* Cabecera / Título de Quién Ganó */}
            <div className="mb-6">
              <span className="text-4xl block mb-2">{headlineIcon}</span>
              <h2 className="text-2xl font-extrabold text-yellow-400 font-serif tracking-wide">
                {headlineTitle}
              </h2>
              <p className="text-sm text-slate-300 mt-1">{headlineSub}</p>
            </div>

            {/* Desglose de Puntajes y Resultados */}
            <div className="grid grid-cols-1 gap-2.5 mb-6 bg-slate-800/80 p-4 rounded-2xl border border-slate-700">
              {/* Dealer */}
              <div className="flex justify-between items-center py-2 px-3 bg-slate-900/60 rounded-xl border border-slate-700/50">
                <div className="text-left">
                  <span className="font-bold text-slate-200 text-sm">Dealer (La Casa)</span>
                  <span className="text-xs text-slate-400 block">
                    {dealerScore !== undefined ? `${dealerScore} pts` : 'Pasado'}
                    {dealerScore && dealerScore > 21 ? ' (Bust / Se pasó)' : ''}
                  </span>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                  dealerScore && dealerScore > 21 
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : 'bg-slate-700 text-slate-300'
                }`}>
                  {dealerScore && dealerScore > 21 ? 'SE PASÓ' : 'DEALER'}
                </span>
              </div>

              {/* Jugador local (Tú) */}
              <div className="flex justify-between items-center py-2 px-3 bg-slate-900/60 rounded-xl border border-yellow-500/40">
                <div className="text-left">
                  <span className="font-bold text-yellow-400 text-sm">{currentUsername} (Tú)</span>
                  <span className="text-xs text-slate-400 block">{me?.score ?? 0} pts</span>
                </div>
                <div className="text-right">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold inline-block ${
                    meWin
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : meLose
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                      : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                  }`}>
                    {meWin 
                      ? `¡GANASTE! (+ $${me?.score === 21 && me?.hand?.length === 2 ? Math.floor(currentBet * 1.5) : currentBet})` 
                      : meLose 
                      ? (me?.score && me.score > 21 ? `PERDISTE (SE PASÓ) (- $${currentBet})` : `PERDISTE (- $${currentBet})`)
                      : 'EMPATE ($0)'}
                  </span>
                </div>
              </div>

              {/* Oponente */}
              {opponent && (
                <div className="flex justify-between items-center py-2 px-3 bg-slate-900/60 rounded-xl border border-slate-700/50">
                  <div className="text-left">
                    <span className="font-bold text-slate-300 text-sm">{opponent.username}</span>
                    <span className="text-xs text-slate-400 block">{opponent.score ?? 0} pts</span>
                  </div>
                  <div className="text-right">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold inline-block ${
                      oppWin
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : oppLose
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                    }`}>
                      {oppWin 
                        ? '¡GANÓ! 🏆' 
                        : oppLose 
                        ? (opponent?.score && opponent.score > 21 ? 'PERDIÓ (SE PASÓ) ❌' : 'PERDIÓ ❌') 
                        : 'EMPATE 🤝'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Botones de Acción: Revancha y Volver al Lobby */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {opponent && (
                <button
                  onClick={handleRematch}
                  disabled={rematchSent}
                  className={`px-6 py-2.5 rounded-full font-bold shadow-lg transition-all flex items-center justify-center space-x-2 ${
                    rematchSent 
                      ? 'bg-yellow-600/50 text-slate-300 cursor-not-allowed'
                      : 'bg-gradient-to-r from-yellow-500 to-amber-600 text-slate-900 hover:from-yellow-400 hover:to-amber-500 transform hover:scale-105'
                  }`}
                >
                  {rematchSent ? (
                    <span className="animate-pulse">Invitación enviada...</span>
                  ) : (
                    <span>Pedir Revancha 🔄</span>
                  )}
                </button>
              )}
              <button
                onClick={leaveTable}
                className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 font-bold rounded-full transition-colors"
              >
                Volver al Lobby
              </button>
            </div>
          </div>
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
            <p className="text-yellow-400 font-bold mb-2">
              Apuesta de la ronda: ${currentBet.toLocaleString()}
            </p>
            
            <div className="flex items-center space-x-3 mb-4">
                <button 
                  onClick={() => addBet(10)} 
                  disabled={currentBet + 10 > currentChips || isFinished}
                  style={{ backgroundImage: `url(${chip1})` }} 
                  className="w-12 h-12 bg-contain bg-center bg-no-repeat hover:-translate-y-1 transition-transform flex items-center justify-center font-bold text-black drop-shadow-md disabled:opacity-40"
                  title="Sumar $10"
                >
                  10
                </button>
                <button 
                  onClick={() => addBet(100)} 
                  disabled={currentBet + 100 > currentChips || isFinished}
                  style={{ backgroundImage: `url(${chip2})` }} 
                  className="w-12 h-12 bg-contain bg-center bg-no-repeat hover:-translate-y-1 transition-transform flex items-center justify-center font-bold text-black drop-shadow-md disabled:opacity-40"
                  title="Sumar $100"
                >
                  100
                </button>
                <button 
                  onClick={() => addBet(500)} 
                  disabled={currentBet + 500 > currentChips || isFinished}
                  style={{ backgroundImage: `url(${chip3})` }} 
                  className="w-12 h-12 bg-contain bg-center bg-no-repeat hover:-translate-y-1 transition-transform flex items-center justify-center font-bold text-black drop-shadow-md disabled:opacity-40"
                  title="Sumar $500"
                >
                  500
                </button>
                <button
                  onClick={resetBet}
                  disabled={isFinished}
                  className="px-3 py-1 bg-slate-800/80 hover:bg-slate-700 text-xs font-bold text-slate-300 rounded-lg border border-slate-600 transition-colors"
                  title="Reiniciar apuesta a $100"
                >
                  Reiniciar
                </button>
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