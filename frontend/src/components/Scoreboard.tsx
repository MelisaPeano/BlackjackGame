import React, { useState } from 'react';
import { Trophy, Medal, Award, Loader2, ArrowLeft, RotateCw, History, CheckCircle2, XCircle, MinusCircle, User, Calendar, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useScoreboard } from '../hooks/useScoreboard';

const Scoreboard: React.FC = () => {
  const { leaderboard, matchHistory, isLoading, refetch } = useScoreboard();
  const [activeTab, setActiveTab] = useState<'ranking' | 'history'>('ranking');
  const navigate = useNavigate();

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0: return <Trophy className="w-6 h-6 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]" />;
      case 1: return <Medal className="w-6 h-6 text-slate-300 drop-shadow-[0_0_8px_rgba(203,213,225,0.8)]" />;
      case 2: return <Medal className="w-6 h-6 text-amber-700 drop-shadow-[0_0_8px_rgba(180,83,9,0.8)]" />;
      default: return <Award className="w-5 h-5 text-slate-600" />;
    }
  };

  const formatOutcome = (outcome: string) => {
    const o = outcome.toLowerCase();
    if (o === 'win' || o === 'victoria') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-green-500/20 text-green-400 border border-green-500/30">
          <CheckCircle2 className="w-3 h-3 mr-1" /> Victoria
        </span>
      );
    }
    if (o === 'lose' || o === 'loss' || o === 'derrota') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30">
          <XCircle className="w-3 h-3 mr-1" /> Derrota
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
        <MinusCircle className="w-3 h-3 mr-1" /> Empate
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-slate-900 p-6 text-slate-200 font-sans flex flex-col items-center">
      
      {/* Header del Ranking */}
      <div className="max-w-4xl w-full flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-yellow-500/20 pb-4 mt-6">
        <div className="flex items-center space-x-3">
          <Trophy className="w-8 h-8 text-yellow-500" />
          <div>
            <h1 className="text-3xl font-bold font-serif text-white tracking-wide">
              Salón de la Fama
            </h1>
            <p className="text-xs text-slate-400">Historial y clasificaciones persistidas en la Base de Datos</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="flex items-center px-3 py-2 text-sm font-medium text-yellow-400 hover:text-yellow-300 bg-slate-800/60 hover:bg-slate-700/60 rounded-lg border border-yellow-500/30 transition-colors"
            title="Recargar datos de MongoDB"
          >
            <RotateCw className={`w-4 h-4 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center px-4 py-2 text-sm font-medium text-slate-300 hover:text-white bg-slate-800/50 hover:bg-slate-700/50 rounded-lg border border-slate-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver al Lobby
          </button>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="max-w-4xl w-full flex space-x-2 mb-4">
        <button
          onClick={() => setActiveTab('ranking')}
          className={`flex items-center px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'ranking'
              ? 'bg-yellow-500 text-slate-950 shadow-md shadow-yellow-500/20'
              : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-slate-700/60'
          }`}
        >
          <Trophy className="w-4 h-4 mr-2" />
          Clasificación General ({leaderboard.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'history'
              ? 'bg-yellow-500 text-slate-950 shadow-md shadow-yellow-500/20'
              : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-slate-700/60'
          }`}
        >
          <History className="w-4 h-4 mr-2" />
          Historial de Partidas ({matchHistory.length})
        </button>
      </div>

      {/* Contenedor Principal */}
      <div className="max-w-4xl w-full bg-slate-800/80 backdrop-blur-md rounded-2xl border border-yellow-500/30 shadow-[0_0_30px_rgba(212,175,55,0.05)] overflow-hidden">
        
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-20 space-y-4">
            <Loader2 className="w-10 h-10 text-yellow-500 animate-spin" />
            <p className="text-slate-400 font-medium">Cargando datos de la base de datos MongoDB...</p>
          </div>
        ) : activeTab === 'ranking' ? (
          /* TAB 1: CLASIFICACIÓN */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/80 border-b border-yellow-500/20 text-xs">
                  <th className="p-4 text-slate-400 font-bold uppercase tracking-wider w-16 text-center">Rango</th>
                  <th className="p-4 text-slate-400 font-bold uppercase tracking-wider">Jugador</th>
                  <th className="p-4 text-slate-400 font-bold uppercase tracking-wider text-center">Victorias</th>
                  <th className="p-4 text-slate-400 font-bold uppercase tracking-wider text-center">Derrotas</th>
                  <th className="p-4 text-slate-400 font-bold uppercase tracking-wider text-center">Empates</th>
                  <th className="p-4 text-yellow-400 font-bold uppercase tracking-wider text-center">Fichas</th>
                  <th className="p-4 text-yellow-500 font-bold uppercase tracking-wider text-right">Puntaje</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {leaderboard.map((player, index) => (
                  <tr 
                    key={player.id} 
                    className="hover:bg-slate-700/30 transition-colors group text-sm"
                  >
                    <td className="p-4 text-center flex justify-center items-center h-full">
                      {getRankIcon(index)}
                    </td>
                    <td className="p-4 font-bold text-white text-base">
                      {player.username}
                    </td>
                    <td className="p-4 text-center text-green-400 font-bold">
                      {player.wins}
                    </td>
                    <td className="p-4 text-center text-red-400 font-bold">
                      {player.losses ?? 0}
                    </td>
                    <td className="p-4 text-center text-slate-400 font-medium">
                      {player.ties}
                    </td>
                    <td className="p-4 text-center text-yellow-400 font-bold">
                      ${(player.chips ?? 10000).toLocaleString()}
                    </td>
                    <td className="p-4 text-right font-bold text-yellow-500 text-lg font-serif drop-shadow-sm">
                      {player.score}
                    </td>
                  </tr>
                ))}
                
                {leaderboard.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-10 text-center text-slate-500">
                      Aún no hay jugadores registrados en la base de datos.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* TAB 2: HISTORIAL DE PARTIDAS */
          <div className="p-4 divide-y divide-slate-700/50">
            {matchHistory.length === 0 ? (
              <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center space-y-3">
                <History className="w-12 h-12 text-slate-600" />
                <p className="text-base font-medium">Aún no hay partidas registradas en el historial de MongoDB.</p>
                <p className="text-xs text-slate-500">Al finalizar una partida en la mesa multijugador, los resultados detallados se guardarán aquí automáticamente.</p>
              </div>
            ) : (
              matchHistory.map((item) => (
                <div key={item._id} className="py-4 px-2 hover:bg-slate-700/20 rounded-xl transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div className="flex items-center space-x-2 text-xs text-slate-400">
                      <Calendar className="w-3.5 h-3.5 text-yellow-500/70" />
                      <span>{item.timestamp ? new Date(item.timestamp).toLocaleString() : 'Fecha desconocida'}</span>
                      <span className="text-slate-600">•</span>
                      <span className="font-mono text-slate-500 text-[11px]">Sala: {item.room_id?.slice(0, 8)}...</span>
                      {item.note && (
                        <span className="text-amber-400/80 text-[11px] font-medium italic">({item.note})</span>
                      )}
                    </div>
                    <div className="flex items-center space-x-1.5 text-xs bg-slate-900/60 px-2.5 py-1 rounded-lg border border-slate-700/50">
                      <Shield className="w-3.5 h-3.5 text-red-400" />
                      <span className="text-slate-300">Puntaje Banca:</span>
                      <span className="font-bold text-white">{item.dealer_score}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                    {item.players?.map((p, pIdx) => (
                      <div 
                        key={pIdx}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/50 border border-slate-700/40"
                      >
                        <div className="flex items-center space-x-2">
                          <User className="w-4 h-4 text-slate-400" />
                          <span className="font-semibold text-white text-sm">{p.username}</span>
                          <span className="text-xs text-slate-400">({p.score} pts)</span>
                        </div>
                        <div>
                          {formatOutcome(p.outcome)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Scoreboard;