import React, { createContext, useState, useContext, ReactNode } from 'react';

interface User {
  id: string;
  username: string;
  chips: number;
  role: 'admin' | 'player';
}

interface AuthContextType {
  user: User | null;
  login: (username: string) => void;
  logout: () => void;
  updateChips: (amount: number) => void; // <-- Nueva función
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {

  const [user, setUser] = useState<User | null>(() => {
  const token = localStorage.getItem('casino_auth_token');
  if (token) {
    return {
      id: 'usr_777',
      username: 'Jugador_Recuperado', // Opcionalmente puedes guardar el nombre real en localStorage
      chips: 10000,
      role: 'player'
    };
  }
  return null;
});

  const login = (username: string) => {
    setUser({
      id: 'usr_777',
      username: username || 'Admin_Casino',
      chips: 10000,
      role: 'admin'
    });
    localStorage.setItem('casino_auth_token', 'mock_token_123');
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('casino_auth_token');
  };

  // Función para sumar o restar saldo al estado global
  const updateChips = (amount: number) => {
    setUser(prev => prev ? { ...prev, chips: prev.chips + amount } : prev);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateChips }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de un AuthProvider');
  return context;
};