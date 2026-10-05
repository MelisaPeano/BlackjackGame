import { useCallback } from 'react';

export const useSoundEffects = () => {
  const playSound = useCallback((fileName: string) => {
    // La ruta asume que colocaste los audios en public/assets/sounds/
    const audio = new Audio(`/assets/audio/blackjack/${fileName}`);
    audio.play().catch((err) => console.warn("Interacción requerida para reproducir audio:", err));
  }, []);

  return {
    playChip: () => playSound('bj_chip.ogg'),
    playWin: () => playSound('bj_win.ogg'),
    playLose: () => playSound('bj_lose.ogg'),
    playPlaceBet: () => playSound('bj_place_bet.ogg'),
    playCard: () => {
      const randomCard = Math.floor(Math.random() * 4) + 1;
      playSound(`bj_card${randomCard}.ogg`);
    }
  };
};