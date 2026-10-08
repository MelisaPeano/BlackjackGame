import { useState, useEffect } from 'react';

// Interfaces basadas en la información que necesitará el Dashboard
interface ServerStats {
  onlineUsers: number;
  activeGames: number;
  serverStatus: 'ONLINE' | 'OFFLINE';
  cpuUsage: string;
}

interface User {
  id: string;
  username: string;
  status: 'playing' | 'idle';
}

export const useServerMock = () => {
  const [stats, setStats] = useState<ServerStats>({
    onlineUsers: 15,
    activeGames: 4,
    serverStatus: 'ONLINE',
    cpuUsage: '12%',
  });

  const [users, setUsers] = useState<User[]>([
    { id: '1', username: 'Player1', status: 'playing' },
    { id: '2', username: 'Player2', status: 'idle' },
  ]);

  // Simula actualizaciones en tiempo real que luego llegarán por TCP/Sockets
  useEffect(() => {
    const interval = setInterval(() => {
      setStats(prev => ({
        ...prev,
        onlineUsers: Math.floor(Math.random() * 5) + 10, 
        activeGames: Math.floor(Math.random() * 3) + 2,
      }));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return { stats, users };
};