import { createContext, useState, useContext, type ReactNode } from 'react';

interface User {
  id: string;
  username: string;
  chips: number;
  role: 'admin' | 'player';
}

interface AuthContextType {
  user: User | null;
  login: (username: string, token: string) => void;
  logout: () => void;
  updateChips: (amount: number) => void; // <-- Nueva función
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => {
    const token = localStorage.getItem('casino_auth_token');
    const savedUsername = localStorage.getItem('casino_username'); 
    
    if (token && savedUsername) {
      return {
        id: 'usr_real', // Reemplazar con ID real si tu API lo provee en el JWT
        username: savedUsername,
        chips: 10000,
        role: 'player'
      };
    }
    return null;
  });

  const login = (username: string, token: string) => {
    setUser({
      id: 'usr_real',
      username: username,
      chips: 10000,
      role: 'player'
    });
    // Guardar el token y el nombre exacto
    localStorage.setItem('casino_auth_token', token);
    localStorage.setItem('casino_username', username); 
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('casino_auth_token');
    localStorage.removeItem('casino_username');
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