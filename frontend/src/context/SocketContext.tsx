import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAuth } from './AuthContext';

interface SocketContextType {
  socket: WebSocket | null;
  onlineUsers: string[];
  activeGames: number;
  sendInvite: (target: string) => void;
  incomingInvite: string | null;
  respondInvite: (sender: string, accept: boolean) => void;
  gameStarted: boolean;
  setGameStarted: (val: boolean) => void;
  gameState: any;
  setGameState: (val: any) => void;
  joinMatchmaking: () => void;
  cancelMatchmaking: () => void;
  isSearchingMatch: boolean;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const { user, setChips } = useAuth(); 
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [activeGames, setActiveGames] = useState<number>(0);
  const [incomingInvite, setIncomingInvite] = useState<string | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameState, setGameState] = useState<any>(null);
  const [isSearchingMatch, setIsSearchingMatch] = useState(false);

  useEffect(() => {
    // Al depender del string primitivo, evitamos reconexiones al cambiar el saldo
    if (!user?.username) return;

    const token = localStorage.getItem('casino_auth_token');
    if (!token) return;

    const baseUrl = import.meta.env.VITE_WS_URL || 'wss://localhost:8000/ws';
    const ws = new WebSocket(`${baseUrl}?token=${token}`);

    ws.onopen = () => console.log('Conexión TCP establecida con éxito');

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'lobby_state') {
        setOnlineUsers(data.online_users.filter((u: string) => u !== user.username));
        if (typeof data.active_games === 'number') {
          setActiveGames(data.active_games);
        }
      }

      if (data.type === 'chips_updated' && typeof data.chips === 'number') {
        setChips(data.chips);
      }
      
      if (data.type === 'invite') {
        setIncomingInvite(data.sender);
      }

      if (data.type === 'invite_response' && data.accepted) {
        setIsSearchingMatch(false);
        setGameStarted(true);
      }

      if (data.type === 'waiting') {
        setIsSearchingMatch(true);
      }

      if (data.type === 'matchmaking_cancelled') {
        setIsSearchingMatch(false);
      }

      if (data.type === 'game_state') {
        // CLAVE: Solo activamos la redirección si la partida NO ha finalizado
        const stateStr = String(data.state?.state).toLowerCase();
        if (stateStr !== 'finished') {
          setIsSearchingMatch(false);
          setGameStarted(true);
        }
        setGameState(data.state); 
      }
    };

    ws.onclose = () => {
      console.log('Socket cerrado');
      setIsSearchingMatch(false);
    };
    
    setSocket(ws);

    return () => {
      ws.close();
    };
  }, [user?.username]);

  const sendInvite = (target: string) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'invite', target }));
    }
  };

  const respondInvite = (sender: string, accept: boolean) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'invite_response', target: sender, accepted: accept }));
    }
    setIncomingInvite(null);
  };

  // Partida rapida. El servidor te pone en cola y te empareja cuando haya otro jugador esperando
  const joinMatchmaking = () => {
    setIsSearchingMatch(true);
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'join_matchmaking' }));
    }
  };

  const cancelMatchmaking = () => {
    setIsSearchingMatch(false);
    setGameStarted(false);
    setGameState(null);
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'cancel_matchmaking' }));
      socket.send(JSON.stringify({ type: 'leave_table' }));
    }
  };

  return (
    <SocketContext.Provider value={{ 
      socket, 
      onlineUsers, 
      activeGames, 
      sendInvite, 
      incomingInvite, 
      respondInvite, 
      gameStarted, 
      setGameStarted, 
      gameState, 
      setGameState, 
      joinMatchmaking,
      cancelMatchmaking,
      isSearchingMatch
    }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) throw new Error('useSocket debe usarse dentro de un SocketProvider');
  return context;
};