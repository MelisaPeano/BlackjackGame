import { useState, useEffect } from 'react';

export interface PlayerScore {
  id: string;
  username: string;
  wins: number;
  ties: number;
  score: number; // Campo calculado: Victorias * 3 + Empates * 1
}

export const useScoreboard = () => {
  const [leaderboard, setLeaderboard] = useState<PlayerScore[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // TODO: Reemplazar este setTimeout por un fetch() a tu API
    // fetch('/api/scoreboard').then(res => res.json()).then(data => ...)
    
    const fetchMockData = () => {
      const mockData: PlayerScore[] = [
        { id: '1', username: 'CasinoKing', wins: 142, ties: 23, score: 449 },
        { id: '2', username: 'CardShark', wins: 98, ties: 15, score: 309 },
        { id: '3', username: 'LuckyStrike', wins: 85, ties: 40, score: 295 },
        { id: '4', username: 'Novice21', wins: 42, ties: 12, score: 138 },
        { id: '5', username: 'BustMaster', wins: 15, ties: 5, score: 50 },
      ];
      
      // Ordenamos por puntaje de mayor a menor por seguridad en el frontend
      const sortedData = mockData.sort((a, b) => b.score - a.score);
      
      setLeaderboard(sortedData);
      setIsLoading(false);
    };

    const timer = setTimeout(fetchMockData, 800);
    return () => clearTimeout(timer);
  }, []);

  return { leaderboard, isLoading };
};