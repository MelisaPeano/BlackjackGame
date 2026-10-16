import { createContext, useState, useContext, useEffect, type ReactNode } from 'react';

interface User {
  id: string;
  username: string;
  chips: number;
  role: 'admin' | 'player';
}

interface AuthContextType {
  user: User | null;
  login: (username: string, token: string, initialChips?: number) => void;
  logout: () => void;
  updateChips: (amount: number) => void;
  setChips: (chips: number) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => {
    const token = localStorage.getItem('casino_auth_token');
    const savedUsername = localStorage.getItem('casino_username'); 
    const savedChips = localStorage.getItem('casino_chips');
    
    if (token && savedUsername) {
      return {
        id: 'usr_real',
        username: savedUsername,
        chips: savedChips ? Number(savedChips) : 10000,
        role: 'player'
      };
    }
    return null;
  });

  const refreshUser = async () => {
    const token = localStorage.getItem('casino_auth_token');
    if (!token) return;
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://localhost:8000';
      const res = await fetch(`${apiUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUser(prev => prev ? { ...prev, chips: data.chips } : {
          id: data.id,
          username: data.username,
          chips: data.chips,
          role: data.role || 'player'
        });
        localStorage.setItem('casino_chips', String(data.chips));
      }
    } catch {
      // Ignorar fallo de red temporal
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = (username: string, token: string, initialChips: number = 10000) => {
    setUser({
      id: 'usr_real',
      username: username,
      chips: initialChips,
      role: 'player'
    });
    localStorage.setItem('casino_auth_token', token);
    localStorage.setItem('casino_username', username); 
    localStorage.setItem('casino_chips', String(initialChips));
    // Sincronizar en segundo plano
    refreshUser();
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('casino_auth_token');
    localStorage.removeItem('casino_username');
    localStorage.removeItem('casino_chips');
  };

  // Función para sumar o restar saldo al estado global y persistirlo localmente
  const updateChips = (amount: number) => {
    setUser(prev => {
      if (!prev) return prev;
      const newChips = Math.max(0, prev.chips + amount);
      localStorage.setItem('casino_chips', String(newChips));
      return { ...prev, chips: newChips };
    });
  };

  const setChips = (chips: number) => {
    setUser(prev => {
      if (!prev) return prev;
      localStorage.setItem('casino_chips', String(chips));
      return { ...prev, chips };
    });
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateChips, setChips, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de un AuthProvider');
  return context;
};