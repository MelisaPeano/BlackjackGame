import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { Users, Gamepad2, Server, LogOut, Play, Trophy, UserCircle2, ShieldCheck, Clock } from 'lucide-react';
import cardBack from '../assets/images/blackjack/card_back.png';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { 
    onlineUsers, 
    activeGames,
    sendInvite, 
    incomingInvite, 
    respondInvite, 
    gameStarted, 
    setGameStarted,
    joinMatchmaking,
    cancelMatchmaking,
    isSearchingMatch
  } = useSocket();

  const [invitedUsers, setInvitedUsers] = useState<string[]>([]);

  // Si el usuario regresa al Dashboard mientras estaba buscando partida, cancelamos la cola
  useEffect(() => {
    if (isSearchingMatch) {
      cancelMatchmaking();
    }
  }, [isSearchingMatch, cancelMatchmaking]);

  // Redirección automática al detectar el inicio del juego
  useEffect(() => {
    if (gameStarted) {
      setGameStarted(false); // Reseteamos la bandera
      setInvitedUsers([]);
      navigate('/game');
    }
  }, [gameStarted, navigate, setGameStarted]);

  // Manejo de invitaciones con estado de cancelación
  const handleToggleInvite = (target: string) => {
    if (invitedUsers.includes(target)) {
      setInvitedUsers(prev => prev.filter(u => u !== target));
    } else {
      sendInvite(target);
      setInvitedUsers(prev => [...prev, target]);
    }
  };

  // Métricas dinámicas en tiempo real conectadas al backend
  const stats = {
    onlineUsers: Math.max(1, onlineUsers.length + 1), // +1 para contarte a ti mismo
    activeGames: activeGames ?? 0,
    serverStatus: 'ONLINE',
    securityStatus: 'WSS / TLS (Azure)'
  };

  const handleLogout = () => {
    localStorage.removeItem('casino_auth_token');
    navigate('/login');
  };

  // Filtramos estrictamente al usuario actual para que no se vea a sí mismo
  const filteredUsers = onlineUsers.filter(u => u !== user?.username);

  return (
    <div className="min-h-screen bg-slate-900 p-6 text-slate-200 font-sans relative">
      
      {/* --- MODAL DE INVITACIÓN ENTRANTE --- */}
      {incomingInvite && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-slate-800 p-8 rounded-2xl border border-yellow-500/50 shadow-[0_0_40px_rgba(212,175,55,0.3)] text-center max-w-md w-full mx-4">
            <h3 className="text-2xl font-bold text-white mb-4 font-serif">¡Nueva Invitación!</h3>
            <p className="text-slate-300 mb-8">
              <strong className="text-yellow-500 text-lg">{incomingInvite}</strong> te ha invitado a jugar una partida en la Mesa VIP.
            </p>
            <div className="flex space-x-4 justify-center">
              <button
                onClick={() => respondInvite(incomingInvite, false)}
                className="px-6 py-2 bg-slate-700/50 text-red-400 border border-red-900/50 rounded-lg hover:bg-red-900/40 transition-colors font-bold w-full"
              >
                Rechazar
              </button>
              <button
                onClick={() => {
                  respondInvite(incomingInvite, true);
                  navigate('/game'); // Redirige al invitado a la mesa
                }}
                className="px-6 py-2 bg-yellow-600 text-slate-900 rounded-lg hover:bg-yellow-500 transition-colors font-bold shadow-md w-full"
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ---------------------------------- */}

      {/* Header */}
      <header className="max-w-6xl mx-auto flex justify-between items-center mb-8 border-b border-yellow-500/20 pb-4">
        <div className="flex items-center space-x-3">
          <img 
            src={cardBack} 
            alt="Casino Card" 
            className="w-16 h-auto drop-shadow-[0_0_15px_rgba(255,215,0,0.5)]"
          />
          <div>
            <h1 className="text-2xl font-bold font-serif text-white tracking-wide">
              Panel de {user?.username}
            </h1>
            <p className="text-yellow-500 font-bold text-sm">
              Saldo disponible: ${user?.chips}
            </p>
          </div>
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
            onClick={() => {
              joinMatchmaking();
              navigate('/game');
            }}
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
              <h3 className="text-slate-400 text-sm font-medium">Cifrado de Red</h3>
              <ShieldCheck className="w-5 h-5 text-yellow-500/80" />
            </div>
            <p className="text-xl font-bold text-yellow-400 mt-2">{stats.securityStatus}</p>
            <p className="text-xs text-slate-400 mt-1">WebSockets Azure Activo</p>
          </div>
        </div>

        {/* Lista de Usuarios en Vivo */}
        <div className="bg-slate-800/80 backdrop-blur-md rounded-2xl border border-yellow-500/30 shadow-[0_0_20px_rgba(212,175,55,0.05)] overflow-hidden">
          <div className="px-6 py-4 border-b border-yellow-500/20 bg-slate-900/50">
            <h2 className="text-lg font-bold text-white font-serif">Jugadores en el Lobby</h2>
          </div>
          <div className="p-6">
            {filteredUsers.length === 0 ? (
              <p className="text-slate-400 text-center py-4">Esperando contrincantes...</p>
            ) : (
              <ul className="space-y-3">
                {filteredUsers.map(onlineUser => {
                  const isInvited = invitedUsers.includes(onlineUser);
                  return (
                    <li key={onlineUser} className="flex justify-between items-center bg-slate-800/50 p-3 rounded-lg border border-slate-700 hover:bg-slate-700/50 transition-colors text-white">
                      <div className="flex items-center space-x-3">
                          <UserCircle2 className="w-5 h-5 text-yellow-500/70" />
                          <span className="font-medium">{onlineUser}</span>
                      </div>
                      {isInvited ? (
                        <button 
                          onClick={() => handleToggleInvite(onlineUser)}
                          className="bg-red-950/80 hover:bg-red-900 text-red-300 border border-red-500/40 px-4 py-1.5 rounded-md text-sm font-bold shadow-md transition-all flex items-center space-x-1.5 animate-pulse"
                        >
                          <Clock className="w-4 h-4 text-yellow-400" />
                          <span>Cancelar Solicitud</span>
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleToggleInvite(onlineUser)}
                          className="bg-yellow-600 hover:bg-yellow-500 text-slate-900 px-4 py-1.5 rounded-md text-sm font-bold shadow-md transition-colors"
                        >
                          Invitar a Mesa
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;