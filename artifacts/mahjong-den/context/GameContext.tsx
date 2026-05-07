/**
 * Re-exports from the Zustand game store for backward compatibility.
 * New code should import directly from @/store/gameStore.
 */
export {
  useGameStore as useGame,
  type GamePhase,
  type PlayerState,
  type CallOptions,
  type RoundResult,
  type GameState,
} from '../store/gameStore';

import React from 'react';

export function GameProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
