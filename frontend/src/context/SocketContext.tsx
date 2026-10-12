import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAuth } from './AuthContext';

interface SocketContextType {
  socket: WebSocket | null;
  onlineUsers: string[];
  sendInvite: (target: string) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

  useEffect(() => {
  if (!user) return;

  const token = localStorage.getItem('casino_auth_token');
  if (!token) {
    console.error("No hay token de autenticación disponible");
    return;
  }

  const baseUrl = import.meta.env.VITE_WS_URL || 'wss://localhost:8000/ws';
  
  const ws = new WebSocket(`${baseUrl}?token=${token}`);

  ws.onopen = () => console.log('Conexión TCP establecida con éxito');

    ws.onopen = () => console.log('Conexión TCP establecida con éxito');

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      // Capturar la lista de usuarios en vivo (Tu ticket de Redes - Conexiones)
      if (data.type === 'lobby_state') {
        setOnlineUsers(data.online_users.filter((u: string) => u !== user.username));
      }
      
      // Aquí agregaremos la captura de invitaciones en el siguiente paso
      if (data.type === 'invite') {
        console.log("Invitación recibida de:", data.sender);
      }
    };

    ws.onclose = () => console.log('Socket cerrado');
    
    setSocket(ws);

    // Cierre ordenado al desmontar o cerrar sesión
    return () => {
      ws.close();
    };
  }, [user]);

  const sendInvite = (target: string) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'invite', target }));
    }
  };

  return (
    <SocketContext.Provider value={{ socket, onlineUsers, sendInvite }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) throw new Error('useSocket debe usarse dentro de un SocketProvider');
  return context;
};