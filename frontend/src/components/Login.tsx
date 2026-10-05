import React, { useState } from 'react';
import { User, Lock, LogIn } from 'lucide-react';
import cardBack from '../assets/images/blackjack/card_back.png';

import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

 const { login } = useAuth();


    const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    login(username); // Le pasamos el input del usuario al contexto
    navigate('/dashboard');
    };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      
      {/* Contenedor principal con estilo "Glassmorphism" y bordes dorados */}
      <div className="max-w-md w-full bg-slate-800/80 backdrop-blur-md rounded-2xl shadow-[0_0_40px_rgba(212,175,55,0.15)] border border-yellow-500/30 overflow-hidden">
        
        <div className="p-8">
          <div className="text-center mb-8">
            {/* Elemento decorativo usando el asset migrado */}
            <div className="inline-flex items-center justify-center mb-4">
                <img 
                    src={cardBack} 
                    alt="Casino Card" 
                    className="w-16 h-auto drop-shadow-[0_0_15px_rgba(255,215,0,0.5)]"
                    />
            </div>
            <h2 className="text-3xl font-bold text-white mb-2 font-serif tracking-wide">
              Mesa VIP
            </h2>
            <p className="text-yellow-500/80 text-sm">Ingrese sus credenciales para jugar</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Usuario
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-yellow-500/50" />
                </div>
                <input
                  type="text"
                  required
                  className="block w-full pl-10 pr-3 py-3 border border-slate-600 rounded-lg bg-slate-900/50 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 transition-colors"
                  placeholder="admin_casino"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-yellow-500/50" />
                </div>
                <input
                  type="password"
                  required
                  className="block w-full pl-10 pr-3 py-3 border border-slate-600 rounded-lg bg-slate-900/50 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 transition-colors"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-slate-900 bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-300 hover:to-yellow-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-all transform hover:scale-[1.02]"
            >
              <LogIn className="h-5 w-5 mr-2" />
              Ingresar al Lobby
            </button>
          </form>
          
        </div>
        
        {/* Footer del card */}
        <div className="bg-slate-900/80 px-8 py-4 border-t border-yellow-500/20 text-center">
            <p className="text-slate-400 text-sm">
              ¿Nuevo en la mesa? <a href="/register" className="text-yellow-500 hover:text-yellow-400 font-medium transition-colors">Solicite sus fichas aquí</a>
            </p>
        </div>
      </div>
    </div>
  );
};

export default Login;