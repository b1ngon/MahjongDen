import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';

/**
 * Drives the AI turn loop.
 * Fires after a randomized delay whenever phase is 'ai_turn'
 * and the current player is not the human (index 0).
 */
export function useGameEngine() {
  const phase = useGameStore(s => s.phase);
  const currentPlayer = useGameStore(s => s.currentPlayer);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (phase !== 'ai_turn' || currentPlayer === 0) return;

    const delay = 700 + Math.random() * 600;
    timerRef.current = setTimeout(() => {
      const { phase: ph, currentPlayer: cp, aiProcessTurn } = useGameStore.getState();
      if (ph === 'ai_turn' && cp === currentPlayer) {
        aiProcessTurn(currentPlayer);
      }
    }, delay);

    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, [phase, currentPlayer]);
}
