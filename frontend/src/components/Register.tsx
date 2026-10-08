import React, { useState } from 'react';
import { User, Lock, Mail, UserPlus } from 'lucide-react';
import cardBack from '../assets/images/blackjack/card_back.png';

import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Register: React.FC = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { user } = useAuth();

  
  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validación básica del frontend
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden. Intente nuevamente.');
      return;
    }

    // TODO: Reemplazar con la llamada real al backend (ej. POST /api/register)
    console.log(`Registrando nuevo jugador: ${username}, ${email}`);
    
    // Simulamos el inicio de sesión automático tras el registro
    localStorage.setItem('casino_auth_token', 'mock_token_123');
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      
      <div className="max-w-md w-full bg-slate-800/80 backdrop-blur-md rounded-2xl shadow-[0_0_40px_rgba(212,175,55,0.15)] border border-yellow-500/30 overflow-hidden">
        
        <div className="p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center mb-4">
                 <img 
                    src={cardBack} 
                    alt="Casino Card" 
                    className="w-16 h-auto drop-shadow-[0_0_15px_rgba(255,215,0,0.5)]"
                    />
            </div>
            <h1 className="text-2xl font-bold font-serif text-white tracking-wide">
            Mesa de {user?.username} {/* Renderiza el nombre del mock */}
            </h1>
            <div className="text-yellow-500 font-bold ml-4">
            Fichas: ${user?.chips} {/* Renderiza el saldo del mock */}
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-5">
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
                  placeholder="nuevo_jugador"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Correo Electrónico
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-yellow-500/50" />
                </div>
                <input
                  type="email"
                  required
                  className="block w-full pl-10 pr-3 py-3 border border-slate-600 rounded-lg bg-slate-900/50 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 transition-colors"
                  placeholder="correo@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Confirmar Contraseña
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
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-slate-900 bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-300 hover:to-yellow-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-all transform hover:scale-[1.02] mt-2"
            >
              <UserPlus className="h-5 w-5 mr-2" />
              Obtener Fichas
            </button>
          </form>
          
        </div>
        
        <div className="bg-slate-900/80 px-8 py-4 border-t border-yellow-500/20 text-center">
            <p className="text-slate-400 text-sm">
              ¿Ya tiene una cuenta? <a href="/login" className="text-yellow-500 hover:text-yellow-400 font-medium transition-colors">Ingrese a la mesa</a>
            </p>
        </div>
      </div>
    </div>
  );
};

export default Register;