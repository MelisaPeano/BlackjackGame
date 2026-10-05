import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useServerMock } from '../hooks/useServerMock';
import { Users, Gamepad2, Server, Activity, LogOut, UserCircle2, Play, Trophy } from 'lucide-react';
import cardBack from '../assets/images/blackjack/card_back.png';

const Dashboard: React.FC = () => {
  const { stats, users } = useServerMock();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('casino_auth_token');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-900 p-6 text-slate-200 font-sans">
      {/* Header */}
      <header className="max-w-6xl mx-auto flex justify-between items-center mb-8 border-b border-yellow-500/20 pb-4">
        <div className="flex items-center space-x-3">
          <img 
            src={cardBack} 
            alt="Casino Card" 
            className="w-16 h-auto drop-shadow-[0_0_15px_rgba(255,215,0,0.5)]"
          />
          <h1 className="text-2xl font-bold font-serif text-white tracking-wide">
            Panel de Administración
          </h1>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center px-4 py-2 text-sm font-medium text-slate-300 hover:text-white bg-slate-800/50 hover:bg-slate-700/50 rounded-lg border border-slate-600 transition-colors"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Retirarse
        </button>
      </header>

      <main className="max-w-6xl mx-auto space-y-8">
        
        {/* Accesos Rápidos al Juego y Scoreboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button
            onClick={() => navigate('/game')}
            className="group relative overflow-hidden bg-gradient-to-br from-green-700 to-green-900 p-6 rounded-2xl border border-green-500/50 shadow-[0_0_25px_rgba(22,163,74,0.2)] hover:shadow-[0_0_35px_rgba(22,163,74,0.4)] transition-all transform hover:-translate-y-1 flex items-center justify-center space-x-4"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <Play className="w-10 h-10 text-green-300 drop-shadow-md" />
            <span className="text-2xl font-bold font-serif text-white tracking-widest uppercase">Entrar a la Mesa</span>
          </button>

          <button
            onClick={() => navigate('/ranking')}
            className="group relative overflow-hidden bg-gradient-to-br from-yellow-600 to-yellow-800 p-6 rounded-2xl border border-yellow-500/50 shadow-[0_0_25px_rgba(202,138,4,0.2)] hover:shadow-[0_0_35px_rgba(202,138,4,0.4)] transition-all transform hover:-translate-y-1 flex items-center justify-center space-x-4"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <Trophy className="w-10 h-10 text-yellow-300 drop-shadow-md" />
            <span className="text-2xl font-bold font-serif text-white tracking-widest uppercase">Salón de la Fama</span>
          </button>
        </div>

        {/* Tarjetas de Métricas (Stats) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-slate-800/80 backdrop-blur-md p-6 rounded-2xl border border-yellow-500/30 shadow-[0_0_15px_rgba(212,175,55,0.05)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-slate-400 text-sm font-medium">Usuarios en Línea</h3>
              <Users className="w-5 h-5 text-yellow-500/80" />
            </div>
            <p className="text-3xl font-bold text-white">{stats.onlineUsers}</p>
          </div>

          <div className="bg-slate-800/80 backdrop-blur-md p-6 rounded-2xl border border-yellow-500/30 shadow-[0_0_15px_rgba(212,175,55,0.05)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-slate-400 text-sm font-medium">Partidas Activas</h3>
              <Gamepad2 className="w-5 h-5 text-yellow-500/80" />
            </div>
            <p className="text-3xl font-bold text-white">{stats.activeGames}</p>
          </div>

          <div className="bg-slate-800/80 backdrop-blur-md p-6 rounded-2xl border border-yellow-500/30 shadow-[0_0_15px_rgba(212,175,55,0.05)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-slate-400 text-sm font-medium">Estado del Servidor</h3>
              <Server className={`w-5 h-5 ${stats.serverStatus === 'ONLINE' ? 'text-green-500' : 'text-red-500'}`} />
            </div>
            <p className={`text-xl font-bold mt-2 ${stats.serverStatus === 'ONLINE' ? 'text-green-400' : 'text-red-400'}`}>
              {stats.serverStatus}
            </p>
          </div>

          <div className="bg-slate-800/80 backdrop-blur-md p-6 rounded-2xl border border-yellow-500/30 shadow-[0_0_15px_rgba(212,175,55,0.05)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-slate-400 text-sm font-medium">Uso de CPU (Redis)</h3>
              <Activity className="w-5 h-5 text-yellow-500/80" />
            </div>
            <p className="text-3xl font-bold text-white">{stats.cpuUsage}</p>
          </div>
        </div>

        {/* Lista de Usuarios */}
        <div className="bg-slate-800/80 backdrop-blur-md rounded-2xl border border-yellow-500/30 shadow-[0_0_20px_rgba(212,175,55,0.05)] overflow-hidden">
          <div className="px-6 py-4 border-b border-yellow-500/20 bg-slate-900/50">
            <h2 className="text-lg font-bold text-white font-serif">Jugadores en el Lobby</h2>
          </div>
          <div className="divide-y divide-slate-700/50">
            {users.map((user) => (
              <div key={user.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-800/50 transition-colors">
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-slate-700/50 rounded-full">
                    <UserCircle2 className="w-6 h-6 text-yellow-500/70" />
                  </div>
                  <span className="font-medium text-slate-200">{user.username}</span>
                </div>
                <span className={`px-3 py-1 text-xs font-bold rounded-full border ${
                  user.status === 'playing' 
                    ? 'bg-green-500/10 text-green-400 border-green-500/30' 
                    : 'bg-slate-500/10 text-slate-400 border-slate-500/30'
                }`}>
                  {user.status === 'playing' ? 'En Mesa' : 'Esperando'}
                </span>
              </div>
            ))}
            {users.length === 0 && (
              <div className="px-6 py-8 text-center text-slate-500">
                No hay jugadores conectados actualmente.
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;