import React, { createContext, useContext, useReducer, useCallback, useRef, useEffect } from 'react';
import { Tile, Meld, createTileset, shuffle, sameTileType, tileKey, compareTiles } from '../engine/tiles';
import {
  isWinningHand, getTenpaiWaits, isTenpai,
  getChiOptions, canPon, canKan,
  identifyYaku, calculateScore, ScoreResult, Yaku, WinContext,
} from '../engine/mahjongLogic';
import { aiChooseDiscard, aiDecideCall, aiWantsTsumo, aiWantsRiichi } from '../engine/ai';

// ─── Types ────────────────────────────────────────────────────────────────────

export type GamePhase =
  | 'not_started'
  | 'player_turn'
  | 'call_window'   // human can call after an AI discard
  | 'ai_turn'
  | 'game_over';

export interface PlayerState {
  index: number;
  name: string;
  hand: Tile[];        // sorted closed tiles
  drawnTile: Tile | null;
  melds: Meld[];
  discards: Tile[];
  score: number;
  seatWind: number;    // 1=E 2=S 3=W 4=N
  isRiichi: boolean;
  isDealer: boolean;
  characterKey: string;
}

export interface CallOptions {
  canRon: boolean;
  canPon: boolean;
  canKan: boolean;
  chiOptions: Tile[][];
}

export interface RoundResult {
  winnerIndex: number;
  winTile: Tile;
  yaku: Yaku[];
  score: ScoreResult;
  isTsumo: boolean;
  loserIndex?: number;
}

export interface GameState {
  phase: GamePhase;
  players: PlayerState[];
  wall: Tile[];
  currentPlayer: number;
  dealer: number;
  roundWind: number;   // 1=East
  dora: Tile[];
  tilesLeft: number;
  callOptions: CallOptions;
  pendingDiscard: { tile: Tile; playerIndex: number } | null;
  result: RoundResult | null;
}

// ─── Initial state ────────────────────────────────────────────────────────────

const PLAYER_DEFS = [
  { name: 'You',     characterKey: 'luna',    seatWind: 1, isDealer: true  },
  { name: 'Ryuu',    characterKey: 'ryuu',    seatWind: 2, isDealer: false },
  { name: 'Kira',    characterKey: 'kira',    seatWind: 3, isDealer: false },
  { name: 'Sensei',  characterKey: 'sensei',  seatWind: 4, isDealer: false },
];

function initialPlayerState(index: number): PlayerState {
  const def = PLAYER_DEFS[index];
  return {
    index,
    name: def.name,
    hand: [],
    drawnTile: null,
    melds: [],
    discards: [],
    score: 25000,
    seatWind: def.seatWind,
    isRiichi: false,
    isDealer: def.isDealer,
    characterKey: def.characterKey,
  };
}

export function createInitialState(): GameState {
  return {
    phase: 'not_started',
    players: [0, 1, 2, 3].map(initialPlayerState),
    wall: [],
    currentPlayer: 0,
    dealer: 0,
    roundWind: 1,
    dora: [],
    tilesLeft: 0,
    callOptions: { canRon: false, canPon: false, canKan: false, chiOptions: [] },
    pendingDiscard: null,
    result: null,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sortHand(hand: Tile[]): Tile[] {
  return [...hand].sort(compareTiles);
}

function buildCallOptions(hand: Tile[], melds: Meld[], discard: Tile, canChi: boolean): CallOptions {
  const chiOptions = canChi ? getChiOptions(hand, discard) : [];
  return {
    canRon: isWinningHand([...hand, discard], melds),
    canPon: canPon(hand, discard),
    canKan: canKan(hand, discard),
    chiOptions,
  };
}

// ─── Reducer ──────────────────────────────────────────────────────────────────

type Action =
  | { type: 'START_GAME' }
  | { type: 'DISCARD_TILE'; tileId: number }
  | { type: 'DECLARE_RIICHI'; tileId: number }
  | { type: 'DECLARE_TSUMO' }
  | { type: 'CALL_RON' }
  | { type: 'CALL_PON' }
  | { type: 'CALL_KAN' }
  | { type: 'CALL_CHI'; tileIds: [number, number] }
  | { type: 'PASS_CALL' }
  | { type: 'AI_DRAW_AND_ACT'; playerIndex: number }
  | { type: 'AI_DISCARD'; playerIndex: number; tileId: number }
  | { type: 'AI_DECLARE_WIN'; playerIndex: number; isTsumo: boolean; loserIndex?: number }
  | { type: 'AI_OPEN_CALL'; playerIndex: number; meld: Meld; tileId: number }
  | { type: 'NEXT_TURN_AFTER_CALL'; callerIndex: number }
  | { type: 'DRAW_WALL'; playerIndex: number };

function gameReducer(state: GameState, action: Action): GameState {
  switch (action.type) {

    case 'START_GAME': {
      const tileset = shuffle(createTileset());
      // Deal 13 tiles to each player, player 0 (dealer) gets 14th
      const hands: Tile[][] = [[], [], [], []];
      let wallStart = 0;
      for (let round = 0; round < 13; round++) {
        for (let p = 0; p < 4; p++) {
          hands[p].push(tileset[wallStart++]);
        }
      }
      // Dealer draws 14th
      const dealerDraw = tileset[wallStart++];

      const dora = tileset[wallStart++]; // indicator
      const wall = tileset.slice(wallStart);

      const players = state.players.map((p, i) => ({
        ...p,
        hand: sortHand(hands[i]),
        drawnTile: i === 0 ? dealerDraw : null,
        melds: [],
        discards: [],
        isRiichi: false,
      }));

      return {
        ...state,
        phase: 'player_turn',
        players,
        wall,
        currentPlayer: 0,
        dora: [dora],
        tilesLeft: wall.length,
        result: null,
        callOptions: { canRon: false, canPon: false, canKan: false, chiOptions: [] },
        pendingDiscard: null,
      };
    }

    case 'DECLARE_TSUMO': {
      const p = state.players[0];
      const fullHand = p.drawnTile ? [...p.hand, p.drawnTile] : p.hand;
      if (!isWinningHand(fullHand, p.melds)) return state;
      const winTile = p.drawnTile!;
      const ctx: WinContext = {
        isRiichi: p.isRiichi,
        isTsumo: true,
        seatWind: p.seatWind,
        roundWind: state.roundWind,
      };
      const yaku = identifyYaku(fullHand, p.melds, ctx, winTile);
      if (yaku.length === 0) return state;
      const scoreResult = calculateScore(yaku, p.isDealer, true);
      return {
        ...state,
        phase: 'game_over',
        result: { winnerIndex: 0, winTile, yaku, score: scoreResult, isTsumo: true },
      };
    }

    case 'DISCARD_TILE': {
      const p = state.players[0];
      const allTiles = p.drawnTile ? [...p.hand, p.drawnTile] : p.hand;
      const discarded = allTiles.find(t => t.id === action.tileId);
      if (!discarded) return state;
      const newHand = allTiles.filter(t => t.id !== discarded.id);

      const updatedPlayer: PlayerState = {
        ...p,
        hand: sortHand(newHand),
        drawnTile: null,
        discards: [...p.discards, discarded],
      };
      const players = state.players.map((pl, i) => i === 0 ? updatedPlayer : pl);

      // Check if any AI can call
      let nextPhase: GamePhase = 'ai_turn';
      let callOpts: CallOptions = { canRon: false, canPon: false, canKan: false, chiOptions: [] };

      // (AI call decisions handled in effects, not reducer)

      return {
        ...state,
        phase: nextPhase,
        players,
        pendingDiscard: { tile: discarded, playerIndex: 0 },
        currentPlayer: 1,
        callOptions: callOpts,
      };
    }

    case 'DECLARE_RIICHI': {
      const p = state.players[0];
      const allTiles = p.drawnTile ? [...p.hand, p.drawnTile] : p.hand;
      const discarded = allTiles.find(t => t.id === action.tileId);
      if (!discarded) return state;
      const newHand = allTiles.filter(t => t.id !== discarded.id);
      if (!isTenpai(sortHand(newHand), p.melds)) return state;

      const updatedPlayer: PlayerState = {
        ...p,
        hand: sortHand(newHand),
        drawnTile: null,
        discards: [...p.discards, discarded],
        isRiichi: true,
        score: p.score - 1000, // riichi deposit
      };
      const players = state.players.map((pl, i) => i === 0 ? updatedPlayer : pl);

      return {
        ...state,
        phase: 'ai_turn',
        players,
        pendingDiscard: { tile: discarded, playerIndex: 0 },
        currentPlayer: 1,
      };
    }

    case 'DRAW_WALL': {
      if (state.wall.length === 0) {
        // Exhaustive draw
        return { ...state, phase: 'game_over', result: null };
      }
      const [drawn, ...rest] = state.wall;
      const players = state.players.map((p, i) =>
        i === action.playerIndex ? { ...p, drawnTile: drawn } : p
      );
      return {
        ...state,
        players,
        wall: rest,
        tilesLeft: rest.length,
        currentPlayer: action.playerIndex,
        phase: action.playerIndex === 0 ? 'player_turn' : 'ai_turn',
        pendingDiscard: null,
      };
    }

    case 'AI_DISCARD': {
      const p = state.players[action.playerIndex];
      const allTiles = p.drawnTile ? [...p.hand, p.drawnTile] : p.hand;
      const discarded = allTiles.find(t => t.id === action.tileId);
      if (!discarded) return state;
      const newHand = allTiles.filter(t => t.id !== discarded.id);

      const updatedPlayer: PlayerState = {
        ...p,
        hand: sortHand(newHand),
        drawnTile: null,
        discards: [...p.discards, discarded],
      };
      const players = state.players.map((pl, i) => i === action.playerIndex ? updatedPlayer : pl);

      // Check if human can call this discard
      const human = players[0];
      const prevPlayer = action.playerIndex;
      const canChiForHuman = (prevPlayer === 3); // human is East, so player at seat North (3) is to their right... wait
      // In standard mahjong, you can chi from the player to your left (the player who just discarded is to your right if they're the previous seat)
      // Seat order: E(0) -> S(1) -> W(2) -> N(3) -> E(0)
      // Human is East(0), player to human's left (previous in turn order) would be North(3)
      // So human can chi from player 3
      const humanCanChi = prevPlayer === 3;
      const callOpts = buildCallOptions(human.hand, human.melds, discarded, humanCanChi);

      const hasCallOption = callOpts.canRon || callOpts.canPon || callOpts.canKan || callOpts.chiOptions.length > 0;

      return {
        ...state,
        phase: hasCallOption ? 'call_window' : 'ai_turn',
        players,
        pendingDiscard: { tile: discarded, playerIndex: action.playerIndex },
        currentPlayer: (action.playerIndex + 1) % 4,
        callOptions: callOpts,
      };
    }

    case 'AI_DECLARE_WIN': {
      const winner = state.players[action.playerIndex];
      const winTile = action.isTsumo
        ? winner.drawnTile!
        : state.pendingDiscard!.tile;
      const fullHand = action.isTsumo
        ? [...winner.hand, winTile]
        : [...winner.hand, winTile];
      const ctx: WinContext = {
        isRiichi: winner.isRiichi,
        isTsumo: action.isTsumo,
        seatWind: winner.seatWind,
        roundWind: state.roundWind,
      };
      const yaku = identifyYaku(fullHand, winner.melds, ctx, winTile);
      const scoreResult = calculateScore(yaku, winner.isDealer, action.isTsumo);
      return {
        ...state,
        phase: 'game_over',
        result: {
          winnerIndex: action.playerIndex,
          winTile,
          yaku,
          score: scoreResult,
          isTsumo: action.isTsumo,
          loserIndex: action.loserIndex,
        },
      };
    }

    case 'AI_OPEN_CALL': {
      const caller = state.players[action.playerIndex];
      const discardTile = state.pendingDiscard?.tile;
      if (!discardTile) return state;

      // Remove meld tiles from hand
      const meldHandIds = new Set(action.meld.tiles.filter(t => t.id !== discardTile.id).map(t => t.id));
      const newHand = caller.hand.filter(t => !meldHandIds.has(t.id));
      const discardedTile = newHand.find(t => t.id === action.tileId);
      const finalHand = discardedTile ? newHand.filter(t => t.id !== action.tileId) : newHand;
      const newDiscards = discardedTile ? [...caller.discards, discardedTile] : caller.discards;

      const updatedPlayer: PlayerState = {
        ...caller,
        hand: sortHand(finalHand),
        drawnTile: null,
        melds: [...caller.melds, action.meld],
        discards: newDiscards,
      };
      const players = state.players.map((p, i) => i === action.playerIndex ? updatedPlayer : p);

      // Check if human can call the new discard
      if (discardedTile) {
        const human = players[0];
        const humanCanChi = action.playerIndex === 3;
        const callOpts = buildCallOptions(human.hand, human.melds, discardedTile, humanCanChi);
        const hasCall = callOpts.canRon || callOpts.canPon || callOpts.canKan || callOpts.chiOptions.length > 0;
        return {
          ...state,
          players,
          phase: hasCall ? 'call_window' : 'ai_turn',
          pendingDiscard: { tile: discardedTile, playerIndex: action.playerIndex },
          currentPlayer: (action.playerIndex + 1) % 4,
          callOptions: callOpts,
        };
      }

      return { ...state, players, phase: 'ai_turn' };
    }

    case 'CALL_RON': {
      if (!state.pendingDiscard) return state;
      const p = state.players[0];
      const winTile = state.pendingDiscard.tile;
      const fullHand = [...p.hand, winTile];
      const ctx: WinContext = {
        isRiichi: p.isRiichi,
        isTsumo: false,
        seatWind: p.seatWind,
        roundWind: state.roundWind,
      };
      const yaku = identifyYaku(fullHand, p.melds, ctx, winTile);
      if (yaku.length === 0) return state;
      const scoreResult = calculateScore(yaku, p.isDealer, false);
      return {
        ...state,
        phase: 'game_over',
        result: {
          winnerIndex: 0,
          winTile,
          yaku,
          score: scoreResult,
          isTsumo: false,
          loserIndex: state.pendingDiscard.playerIndex,
        },
      };
    }

    case 'CALL_PON': {
      if (!state.pendingDiscard) return state;
      const p = state.players[0];
      const discard = state.pendingDiscard.tile;
      const matchingTiles = p.hand.filter(t => sameTileType(t, discard)).slice(0, 2);
      if (matchingTiles.length < 2) return state;

      const meld: Meld = {
        type: 'pon',
        tiles: [...matchingTiles, discard],
        fromPlayer: state.pendingDiscard.playerIndex,
        calledTile: discard,
      };
      const matchIds = new Set(matchingTiles.map(t => t.id));
      const newHand = sortHand(p.hand.filter(t => !matchIds.has(t.id)));

      const players = state.players.map((pl, i) =>
        i === 0 ? { ...pl, hand: newHand, melds: [...pl.melds, meld], drawnTile: null } : pl
      );
      return { ...state, phase: 'player_turn', players, currentPlayer: 0, pendingDiscard: null };
    }

    case 'CALL_KAN': {
      if (!state.pendingDiscard) return state;
      const p = state.players[0];
      const discard = state.pendingDiscard.tile;
      const matchingTiles = p.hand.filter(t => sameTileType(t, discard)).slice(0, 3);
      if (matchingTiles.length < 3) return state;

      const meld: Meld = {
        type: 'kan',
        tiles: [...matchingTiles, discard],
        fromPlayer: state.pendingDiscard.playerIndex,
        calledTile: discard,
      };
      const matchIds = new Set(matchingTiles.map(t => t.id));
      const newHand = sortHand(p.hand.filter(t => !matchIds.has(t.id)));

      // Draw replacement tile
      const [newTile, ...rest] = state.wall;
      const newDora = rest[0] || state.dora[state.dora.length - 1];
      const playersUpdated = state.players.map((pl, i) =>
        i === 0 ? { ...pl, hand: newHand, melds: [...pl.melds, meld], drawnTile: newTile } : pl
      );
      return {
        ...state,
        phase: 'player_turn',
        players: playersUpdated,
        wall: rest,
        tilesLeft: rest.length,
        dora: [...state.dora, newDora],
        currentPlayer: 0,
        pendingDiscard: null,
      };
    }

    case 'CALL_CHI': {
      if (!state.pendingDiscard) return state;
      const p = state.players[0];
      const discard = state.pendingDiscard.tile;
      const [id1, id2] = action.tileIds;
      const t1 = p.hand.find(t => t.id === id1);
      const t2 = p.hand.find(t => t.id === id2);
      if (!t1 || !t2) return state;

      const meld: Meld = {
        type: 'chi',
        tiles: [t1, t2, discard].sort(compareTiles),
        fromPlayer: state.pendingDiscard.playerIndex,
        calledTile: discard,
      };
      const removeIds = new Set([id1, id2]);
      const newHand = sortHand(p.hand.filter(t => !removeIds.has(t.id)));

      const players = state.players.map((pl, i) =>
        i === 0 ? { ...pl, hand: newHand, melds: [...pl.melds, meld], drawnTile: null } : pl
      );
      return { ...state, phase: 'player_turn', players, currentPlayer: 0, pendingDiscard: null };
    }

    case 'PASS_CALL': {
      const next = (state.currentPlayer) % 4;
      return { ...state, phase: 'ai_turn', callOptions: { canRon: false, canPon: false, canKan: false, chiOptions: [] } };
    }

    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface GameContextValue {
  state: GameState;
  startGame: () => void;
  discardTile: (tileId: number) => void;
  declareRiichi: (tileId: number) => void;
  declareTsumo: () => void;
  callRon: () => void;
  callPon: () => void;
  callKan: () => void;
  callChi: (tileIds: [number, number]) => void;
  passCall: () => void;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, createInitialState());
  const stateRef = useRef(state);
  stateRef.current = state;

  // ── AI Turn Driver ───────────────────────────────────────────────────────
  useEffect(() => {
    if (state.phase !== 'ai_turn') return;
    const currentPlayer = state.currentPlayer;
    if (currentPlayer === 0) return; // human's turn

    const s = stateRef.current;
    const player = s.players[currentPlayer];

    const timer = setTimeout(async () => {
      const cur = stateRef.current;
      if (cur.phase !== 'ai_turn' || cur.currentPlayer !== currentPlayer) return;

      // Check if AI needs to handle a pending discard first (AI call from another AI discard)
      if (cur.pendingDiscard && cur.pendingDiscard.playerIndex !== currentPlayer) {
        const discard = cur.pendingDiscard;
        const prevPlayer = discard.playerIndex;
        const canChi = (prevPlayer === (currentPlayer + 3) % 4); // player to left
        const decision = aiDecideCall(
          player.hand, player.melds, discard.tile,
          canChi, player.seatWind, cur.roundWind
        );

        if (decision.action === 'ron') {
          dispatch({ type: 'AI_DECLARE_WIN', playerIndex: currentPlayer, isTsumo: false, loserIndex: prevPlayer });
          return;
        }
        if (decision.action === 'pon' && canPon(player.hand, discard.tile)) {
          const matchTiles = player.hand.filter(t => sameTileType(t, discard.tile)).slice(0, 2);
          const meld: Meld = { type: 'pon', tiles: [...matchTiles, discard.tile], fromPlayer: prevPlayer, calledTile: discard.tile };
          const discardTile = aiChooseDiscard(
            player.hand.filter(t => !matchTiles.find(m => m.id === t.id)),
            [...player.melds, meld]
          );
          dispatch({ type: 'AI_OPEN_CALL', playerIndex: currentPlayer, meld, tileId: discardTile.id });
          return;
        }
        // Pass: move to next player
        dispatch({ type: 'DRAW_WALL', playerIndex: currentPlayer });
        return;
      }

      // AI draws and acts
      if (!player.drawnTile) {
        dispatch({ type: 'DRAW_WALL', playerIndex: currentPlayer });
        return;
      }

      const fullHand = [...player.hand, player.drawnTile];

      // Check tsumo
      if (aiWantsTsumo(fullHand, player.melds)) {
        dispatch({ type: 'AI_DECLARE_WIN', playerIndex: currentPlayer, isTsumo: true });
        return;
      }

      // Discard
      const discardTile = aiChooseDiscard(fullHand, player.melds);
      dispatch({ type: 'AI_DISCARD', playerIndex: currentPlayer, tileId: discardTile.id });

    }, currentPlayer === 0 ? 0 : 800 + Math.random() * 600);

    return () => clearTimeout(timer);
  }, [state.phase, state.currentPlayer, state.players]);

  // ── After AI_DISCARD: advance to next AI turn or human call window ──────
  useEffect(() => {
    if (state.phase !== 'ai_turn') return;
    if (state.pendingDiscard !== null) return; // waiting for a discard to be processed
    // If it's still AI's turn but there's no pendingDiscard, draw for next AI
    if (state.currentPlayer !== 0) {
      // handled by above effect
    }
  }, [state.phase, state.currentPlayer, state.pendingDiscard]);

  const startGame = useCallback(() => dispatch({ type: 'START_GAME' }), []);
  const discardTile = useCallback((tileId: number) => dispatch({ type: 'DISCARD_TILE', tileId }), []);
  const declareRiichi = useCallback((tileId: number) => dispatch({ type: 'DECLARE_RIICHI', tileId }), []);
  const declareTsumo = useCallback(() => dispatch({ type: 'DECLARE_TSUMO' }), []);
  const callRon = useCallback(() => dispatch({ type: 'CALL_RON' }), []);
  const callPon = useCallback(() => dispatch({ type: 'CALL_PON' }), []);
  const callKan = useCallback(() => dispatch({ type: 'CALL_KAN' }), []);
  const callChi = useCallback((tileIds: [number, number]) => dispatch({ type: 'CALL_CHI', tileIds }), []);
  const passCall = useCallback(() => dispatch({ type: 'PASS_CALL' }), []);

  return (
    <GameContext.Provider value={{
      state, startGame, discardTile, declareRiichi, declareTsumo,
      callRon, callPon, callKan, callChi, passCall,
    }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
