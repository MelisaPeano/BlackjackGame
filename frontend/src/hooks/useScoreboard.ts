import { useState, useEffect, useCallback } from 'react';

export interface PlayerScore {
  id: string;
  username: string;
  wins: number;
  losses: number;
  ties: number;
  chips: number;
  score: number;
}

export interface MatchHistoryItem {
  _id: string;
  room_id: string;
  timestamp: string;
  dealer_score: number;
  note?: string;
  players: Array<{
    username: string;
    score: number;
    outcome: string;
  }>;
}

export const useScoreboard = () => {
  const [leaderboard, setLeaderboard] = useState<PlayerScore[]>([]);
  const [matchHistory, setMatchHistory] = useState<MatchHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchScoreboard = useCallback(async () => {
    setIsLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://localhost:8000';
      
      const [boardRes, histRes] = await Promise.allSettled([
        fetch(`${apiUrl}/api/auth/scoreboard`),
        fetch(`${apiUrl}/api/auth/history`)
      ]);

      if (boardRes.status === 'fulfilled' && boardRes.value.ok) {
        const data = await boardRes.value.json();
        setLeaderboard(data);
      }

      if (histRes.status === 'fulfilled' && histRes.value.ok) {
        const histData = await histRes.value.json();
        setMatchHistory(histData);
      }
    } catch (error) {
      console.error("Fallo de conexión con el Scoreboard:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchScoreboard();
  }, [fetchScoreboard]);

  return { leaderboard, matchHistory, isLoading, refetch: fetchScoreboard };
};