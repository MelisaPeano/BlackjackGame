import { useState, useEffect } from 'react';

export interface PlayerScore {
  id: string;
  username: string;
  wins: number;
  ties: number;
  score: number;
}

export const useScoreboard = () => {
  const [leaderboard, setLeaderboard] = useState<PlayerScore[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchScoreboard = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'https://localhost:8000';
        const response = await fetch(`${apiUrl}/api/auth/scoreboard`);
        if (!response.ok) throw new Error('Error al obtener el ranking del servidor');
        
        const data = await response.json();
        setLeaderboard(data);
      } catch (error) {
        console.error("Fallo de conexión con el Scoreboard:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchScoreboard();
  }, []);

  return { leaderboard, isLoading };
};