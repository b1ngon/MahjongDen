export type GameMode = 'hk' | 'mcr' | 'riichi';

export interface GameModeInfo {
  id: GameMode;
  name: string;
  shortName: string;
  subtitle: string;
  scoring: string;
  flag: string;
  color: string;
  chowFromAny: boolean;
  hasRiichi: boolean;
}

export const GAME_MODES: GameModeInfo[] = [
  {
    id: 'hk',
    name: 'Hong Kong',
    shortName: '香港',
    subtitle: 'Faan-Based Scoring',
    scoring: 'Any win valid · Chow from any seat · 2^Faan points',
    flag: '🇭🇰',
    color: '#B5121B',
    chowFromAny: true,
    hasRiichi: false,
  },
  {
    id: 'mcr',
    name: 'Chinese Official',
    shortName: '國標',
    subtitle: '81-Pattern Scoring',
    scoring: 'Min. 8 points · Chow from any seat · Pattern points',
    flag: '🇨🇳',
    color: '#D4A830',
    chowFromAny: true,
    hasRiichi: false,
  },
  {
    id: 'riichi',
    name: 'Japanese Riichi',
    shortName: '日本',
    subtitle: 'Han / Fu Scoring',
    scoring: 'Yaku required · Riichi system · Han+Fu table',
    flag: '🇯🇵',
    color: '#3A7AC4',
    chowFromAny: false,
    hasRiichi: true,
  },
];

export const GAME_MODE_MAP: Record<GameMode, GameModeInfo> = {
  hk:     GAME_MODES[0],
  mcr:    GAME_MODES[1],
  riichi: GAME_MODES[2],
};

// Per-mode action labels shown on buttons
export interface ModeTerm {
  win:    string;  // Ron / Hu
  draw:   string;  // Tsumo / Zi Mo
  chow:   string;  // Chi / Chow
  pong:   string;  // Pon / Pong
  gong:   string;  // Kan / Gong
  pass:   string;
  riichi: string | null;
}

export const MODE_TERMS: Record<GameMode, ModeTerm> = {
  hk: {
    win: 'HU', draw: 'ZI MO', chow: 'CHOW', pong: 'PONG', gong: 'GONG', pass: 'PASS', riichi: null,
  },
  mcr: {
    win: 'HU', draw: 'ZI MO', chow: 'CHOW', pong: 'PONG', gong: 'GONG', pass: 'PASS', riichi: null,
  },
  riichi: {
    win: 'RON', draw: 'TSUMO', chow: 'CHI', pong: 'PON', gong: 'KAN', pass: 'PASS', riichi: 'RIICHI',
  },
};
