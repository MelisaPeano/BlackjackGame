import { useCallback } from 'react';

// Importamos los archivos explícitamente desde la carpeta src/assets
import bj_chip from '../assets/audio/blackjack/bj_chip.ogg';
import bj_win from '../assets/audio/blackjack/bj_win.ogg';
import bj_lose from '../assets/audio/blackjack/bj_lose.ogg';
import bj_place_bet from '../assets/audio/blackjack/bj_place_bet.ogg';
import bj_card1 from '../assets/audio/blackjack/bj_card1.ogg';
import bj_card2 from '../assets/audio/blackjack/bj_card2.ogg';
import bj_card3 from '../assets/audio/blackjack/bj_card3.ogg';
import bj_card4 from '../assets/audio/blackjack/bj_card4.ogg';

export const useSoundEffects = () => {
  const playSound = useCallback((audioSource: string) => {
    const audio = new Audio(audioSource);
    // Ajustamos el volumen al 50% para que no sature
    audio.volume = 0.5;
    audio.play().catch((err) => console.warn("Interacción requerida para reproducir audio:", err));
  }, []);

  return {
    playChip: () => playSound(bj_chip),
    playWin: () => playSound(bj_win),
    playLose: () => playSound(bj_lose),
    playPlaceBet: () => playSound(bj_place_bet),
    playCard: () => {
      // Arreglo con los audios importados para seleccionar uno al azar
      const cardSounds = [bj_card1, bj_card2, bj_card3, bj_card4];
      const randomCard = cardSounds[Math.floor(Math.random() * cardSounds.length)];
      playSound(randomCard);
    }
  };
};