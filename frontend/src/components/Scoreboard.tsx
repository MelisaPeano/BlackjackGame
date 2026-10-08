import React from 'react';
import { Trophy, Medal, Award, Loader2, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useScoreboard } from '../hooks/useScoreboard';

const Scoreboard: React.FC = () => {
  const { leaderboard, isLoading } = useScoreboard();
  const navigate = useNavigate();

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0: return <Trophy className="w-6 h-6 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]" />;
      case 1: return <Medal className="w-6 h-6 text-slate-300 drop-shadow-[0_0_8px_rgba(203,213,225,0.8)]" />;
      case 2: return <Medal className="w-6 h-6 text-amber-700 drop-shadow-[0_0_8px_rgba(180,83,9,0.8)]" />;
      default: return <Award className="w-5 h-5 text-slate-600" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 p-6 text-slate-200 font-sans flex flex-col items-center">
      
      {/* Header del Ranking */}
      <div className="max-w-4xl w-full flex justify-between items-center mb-10 border-b border-yellow-500/20 pb-4 mt-8">
        <div className="flex items-center space-x-3">
          <Trophy className="w-8 h-8 text-yellow-500" />
          <h1 className="text-3xl font-bold font-serif text-white tracking-wide">
            Salón de la Fama
          </h1>
        </div>
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center px-4 py-2 text-sm font-medium text-slate-300 hover:text-white bg-slate-800/50 hover:bg-slate-700/50 rounded-lg border border-slate-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver al Lobby
        </button>
      </div>

      {/* Contenedor de la Tabla */}
      <div className="max-w-4xl w-full bg-slate-800/80 backdrop-blur-md rounded-2xl border border-yellow-500/30 shadow-[0_0_30px_rgba(212,175,55,0.05)] overflow-hidden">
        
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-20 space-y-4">
            <Loader2 className="w-10 h-10 text-yellow-500 animate-spin" />
            <p className="text-slate-400 font-medium">Cargando estadísticas de la red...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/80 border-b border-yellow-500/20">
                  <th className="p-5 text-slate-400 font-bold uppercase tracking-wider text-sm w-20 text-center">Rango</th>
                  <th className="p-5 text-slate-400 font-bold uppercase tracking-wider text-sm">Jugador</th>
                  <th className="p-5 text-slate-400 font-bold uppercase tracking-wider text-sm text-center">Victorias</th>
                  <th className="p-5 text-slate-400 font-bold uppercase tracking-wider text-sm text-center">Empates</th>
                  <th className="p-5 text-yellow-500/90 font-bold uppercase tracking-wider text-sm text-right">Puntaje</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {leaderboard.map((player, index) => (
                  <tr 
                    key={player.id} 
                    className="hover:bg-slate-700/30 transition-colors group"
                  >
                    <td className="p-5 text-center flex justify-center items-center h-full">
                      {getRankIcon(index)}
                    </td>
                    <td className="p-5 font-medium text-white text-lg">
                      {player.username}
                    </td>
                    <td className="p-5 text-center text-green-400 font-bold">
                      {player.wins}
                    </td>
                    <td className="p-5 text-center text-slate-400 font-medium">
                      {player.ties}
                    </td>
                    <td className="p-5 text-right font-bold text-yellow-500 text-xl font-serif drop-shadow-sm">
                      {player.score}
                    </td>
                  </tr>
                ))}
                
                {leaderboard.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-10 text-center text-slate-500">
                      Aún no hay partidas registradas en la base de datos.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Scoreboard;