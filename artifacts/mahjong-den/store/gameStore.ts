import { create } from 'zustand';
import {
  Tile, Meld, createTileset, shuffle, sameTileType, tileKey, compareTiles,
} from '../engine/tiles';
import {
  isWinningHand, getChiOptions, canPon, canKan, isTenpai,
  identifyYaku, calculateFu, calculateScore,
  WinContext, Yaku, ScoreResult,
} from '../engine/mahjongLogic';
import { aiChooseDiscard, aiDecideCall } from '../engine/ai';
import { GameMode } from '../constants/gameModes';
import { resolveWinHK } from '../engine/hkLogic';
import { resolveWinMCR } from '../engine/mcrLogic';

// ─── Types ────────────────────────────────────────────────────────────────────

export type GamePhase =
  | 'not_started'
  | 'player_turn'
  | 'call_window'
  | 'ai_turn'
  | 'game_over';

export interface PlayerState {
  index: number;
  name: string;
  hand: Tile[];
  drawnTile: Tile | null;
  melds: Meld[];
  discards: Tile[];
  score: number;
  seatWind: number;
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
  gameMode: GameMode;
  phase: GamePhase;
  players: PlayerState[];
  wall: Tile[];
  currentPlayer: number;
  dealer: number;
  roundWind: number;
  dora: Tile[];
  tilesLeft: number;
  callOptions: CallOptions;
  pendingDiscard: { tile: Tile; playerIndex: number } | null;
  result: RoundResult | null;
}

interface GameActions {
  setGameMode: (mode: GameMode) => void;
  startGame: () => void;
  humanDiscard: (tileId: number) => void;
  humanRiichi: (tileId: number) => void;
  humanTsumo: () => void;
  humanRon: () => void;
  humanPon: () => void;
  humanKan: () => void;
  humanChi: (tileIds: [number, number]) => void;
  humanPass: () => void;
  aiProcessTurn: (playerIndex: number) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PLAYER_DEFS = [
  { name: 'You',    characterKey: 'luna',   seatWind: 1, isDealer: true  },
  { name: 'Ryuu',   characterKey: 'ryuu',   seatWind: 2, isDealer: false },
  { name: 'Kira',   characterKey: 'kira',   seatWind: 3, isDealer: false },
  { name: 'Sensei', characterKey: 'sensei', seatWind: 4, isDealer: false },
];

const EMPTY_CALL: CallOptions = { canRon: false, canPon: false, canKan: false, chiOptions: [] };

function makePlayer(index: number): PlayerState {
  const def = PLAYER_DEFS[index];
  return {
    index, name: def.name, characterKey: def.characterKey,
    seatWind: def.seatWind, isDealer: def.isDealer,
    hand: [], drawnTile: null, melds: [], discards: [],
    score: 25000, isRiichi: false,
  };
}

function sortHand(h: Tile[]): Tile[] { return [...h].sort(compareTiles); }

// ─── Mode-aware win resolution ────────────────────────────────────────────────

function resolveWin(
  hand: Tile[], melds: Meld[], winTile: Tile,
  ctx: WinContext, isDealer: boolean, gameMode: GameMode,
): { yaku: Yaku[]; score: ScoreResult } | null {
  if (gameMode === 'hk')  return resolveWinHK(hand, melds, winTile, ctx, isDealer);
  if (gameMode === 'mcr') return resolveWinMCR(hand, melds, winTile, ctx, isDealer);
  // Japanese Riichi — requires at least one yaku
  const yaku = identifyYaku(hand, melds, ctx, winTile);
  if (yaku.length === 0) return null;
  const fu  = calculateFu(hand, melds, winTile, ctx);
  const han = yaku.reduce((s, y) => s + y.han, 0);
  const score = calculateScore(han, fu, isDealer, ctx.isTsumo);
  return { yaku, score };
}

// ─── Call-option builder ──────────────────────────────────────────────────────

function buildCallOptions(
  hand: Tile[], melds: Meld[], discard: Tile, canChi: boolean,
): CallOptions {
  return {
    canRon:    isWinningHand([...hand, discard], melds),
    canPon:    canPon(hand, discard),
    canKan:    canKan(hand, discard),
    chiOptions: canChi ? getChiOptions(hand, discard) : [],
  };
}

// ─── Score transfer ───────────────────────────────────────────────────────────

function applyScoreTransfer(
  players: PlayerState[],
  winnerIndex: number,
  score: ScoreResult,
  isTsumo: boolean,
  loserIndex?: number,
): PlayerState[] {
  const dealerIndex = players.findIndex(p => p.isDealer);
  return players.map((p, i) => {
    if (i === winnerIndex) return { ...p, score: p.score + score.totalPoints };
    if (isTsumo) {
      const winnerIsDealer = winnerIndex === dealerIndex;
      if (winnerIsDealer) return { ...p, score: p.score - (score.dealerPayment ?? 0) };
      const payment = i === dealerIndex ? (score.dealerPayment ?? 0) : (score.nonDealerPayment ?? 0);
      return { ...p, score: p.score - payment };
    } else {
      if (i === loserIndex) return { ...p, score: p.score - score.totalPoints };
      return p;
    }
  });
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useGameStore = create<GameState & GameActions>()((set, get) => ({
  gameMode: 'hk',
  phase: 'not_started',
  players: [0, 1, 2, 3].map(makePlayer),
  wall: [],
  currentPlayer: 0,
  dealer: 0,
  roundWind: 1,
  dora: [],
  tilesLeft: 0,
  callOptions: EMPTY_CALL,
  pendingDiscard: null,
  result: null,

  // ──────────────────────────────────────────────────────────── setGameMode
  setGameMode(mode: GameMode) {
    set({ gameMode: mode });
  },

  // ──────────────────────────────────────────────────────────── startGame
  startGame() {
    const { gameMode } = get();
    const tileset = shuffle(createTileset());
    const hands: Tile[][] = [[], [], [], []];
    let wi = 0;
    for (let round = 0; round < 13; round++) {
      for (let p = 0; p < 4; p++) hands[p].push(tileset[wi++]);
    }
    const dealerDraw = tileset[wi++];
    const dora = tileset[wi++];
    const wall = tileset.slice(wi);

    const players = [0, 1, 2, 3].map((i) => ({
      ...makePlayer(i),
      hand: sortHand(hands[i]),
      drawnTile: i === 0 ? dealerDraw : null,
    }));

    set({
      gameMode,
      phase: 'player_turn',
      players, wall, dora: [dora], tilesLeft: wall.length,
      currentPlayer: 0, dealer: 0, roundWind: 1,
      pendingDiscard: null, result: null, callOptions: EMPTY_CALL,
    });
  },

  // ──────────────────────────────────────────────────────────── humanTsumo
  humanTsumo() {
    const s = get();
    const human = s.players[0];
    const fullHand = human.drawnTile ? [...human.hand, human.drawnTile] : human.hand;
    if (!isWinningHand(fullHand, human.melds)) return;
    const winTile = human.drawnTile!;
    const ctx: WinContext = { isRiichi: human.isRiichi, isTsumo: true, seatWind: human.seatWind, roundWind: s.roundWind };
    const res = resolveWin(fullHand, human.melds, winTile, ctx, human.isDealer, s.gameMode);
    if (!res) return;
    set({ players: applyScoreTransfer(s.players, 0, res.score, true), phase: 'game_over', result: { winnerIndex: 0, winTile, ...res, isTsumo: true } });
  },

  // ──────────────────────────────────────────────────────────── humanDiscard
  humanDiscard(tileId: number) {
    const s = get();
    const human = s.players[0];
    const allTiles = human.drawnTile ? [...human.hand, human.drawnTile] : human.hand;
    const discarded = allTiles.find(t => t.id === tileId);
    if (!discarded) return;

    const newHand = sortHand(allTiles.filter(t => t.id !== tileId));
    let players = s.players.map((p, i) =>
      i === 0 ? { ...p, hand: newHand, drawnTile: null, discards: [...p.discards, discarded] } : p,
    );

    for (let ai = 1; ai <= 3; ai++) {
      const aip = players[ai];
      const fullHand = [...aip.hand, discarded];
      const ctx: WinContext = { isRiichi: aip.isRiichi, isTsumo: false, seatWind: aip.seatWind, roundWind: s.roundWind };
      const res = resolveWin(fullHand, aip.melds, discarded, ctx, aip.isDealer, s.gameMode);
      if (res) {
        set({ players: applyScoreTransfer(players, ai, res.score, false, 0), phase: 'game_over', result: { winnerIndex: ai, winTile: discarded, ...res, isTsumo: false, loserIndex: 0 } });
        return;
      }
    }

    set({ players, phase: 'ai_turn', currentPlayer: 1, pendingDiscard: { tile: discarded, playerIndex: 0 }, callOptions: EMPTY_CALL });
  },

  // ──────────────────────────────────────────────────────────── humanRiichi
  humanRiichi(tileId: number) {
    const s = get();
    if (s.gameMode !== 'riichi') return;
    const human = s.players[0];
    if (human.melds.some(m => m.type !== 'ankan')) return;
    const allTiles = human.drawnTile ? [...human.hand, human.drawnTile] : human.hand;
    const discarded = allTiles.find(t => t.id === tileId);
    if (!discarded) return;
    const newHand = sortHand(allTiles.filter(t => t.id !== tileId));
    if (!isTenpai(newHand, human.melds)) return;

    let players = s.players.map((p, i) =>
      i === 0 ? { ...p, hand: newHand, drawnTile: null, discards: [...p.discards, discarded], isRiichi: true, score: p.score - 1000 } : p,
    );

    for (let ai = 1; ai <= 3; ai++) {
      const aip = players[ai];
      const fullHand = [...aip.hand, discarded];
      const ctx: WinContext = { isRiichi: aip.isRiichi, isTsumo: false, seatWind: aip.seatWind, roundWind: s.roundWind };
      const res = resolveWin(fullHand, aip.melds, discarded, ctx, aip.isDealer, s.gameMode);
      if (res) {
        set({ players: applyScoreTransfer(players, ai, res.score, false, 0), phase: 'game_over', result: { winnerIndex: ai, winTile: discarded, ...res, isTsumo: false, loserIndex: 0 } });
        return;
      }
    }

    set({ players, phase: 'ai_turn', currentPlayer: 1, pendingDiscard: { tile: discarded, playerIndex: 0 }, callOptions: EMPTY_CALL });
  },

  // ──────────────────────────────────────────────────────────── humanRon
  humanRon() {
    const s = get();
    if (!s.pendingDiscard) return;
    const human = s.players[0];
    const winTile = s.pendingDiscard.tile;
    const fullHand = [...human.hand, winTile];
    const ctx: WinContext = { isRiichi: human.isRiichi, isTsumo: false, seatWind: human.seatWind, roundWind: s.roundWind };
    const res = resolveWin(fullHand, human.melds, winTile, ctx, human.isDealer, s.gameMode);
    if (!res) return;
    const loserIdx = s.pendingDiscard.playerIndex;
    set({ players: applyScoreTransfer(s.players, 0, res.score, false, loserIdx), phase: 'game_over', result: { winnerIndex: 0, winTile, ...res, isTsumo: false, loserIndex: loserIdx } });
  },

  // ──────────────────────────────────────────────────────────── humanPon
  humanPon() {
    const s = get();
    if (!s.pendingDiscard) return;
    const human = s.players[0];
    const discard = s.pendingDiscard.tile;
    const matching = human.hand.filter(t => sameTileType(t, discard)).slice(0, 2);
    if (matching.length < 2) return;
    const meld: Meld = { type: 'pon', tiles: [...matching, discard], fromPlayer: s.pendingDiscard.playerIndex, calledTile: discard };
    const matchIds = new Set(matching.map(t => t.id));
    const newHand = sortHand(human.hand.filter(t => !matchIds.has(t.id)));
    const players = s.players.map((p, i) => i === 0 ? { ...p, hand: newHand, melds: [...p.melds, meld], drawnTile: null } : p);
    set({ players, phase: 'player_turn', currentPlayer: 0, pendingDiscard: null, callOptions: EMPTY_CALL });
  },

  // ──────────────────────────────────────────────────────────── humanKan
  humanKan() {
    const s = get();
    if (!s.pendingDiscard) return;
    const human = s.players[0];
    const discard = s.pendingDiscard.tile;
    const matching = human.hand.filter(t => sameTileType(t, discard)).slice(0, 3);
    if (matching.length < 3) return;
    const meld: Meld = { type: 'kan', tiles: [...matching, discard], fromPlayer: s.pendingDiscard.playerIndex, calledTile: discard };
    const matchIds = new Set(matching.map(t => t.id));
    const newHand = sortHand(human.hand.filter(t => !matchIds.has(t.id)));
    if (s.wall.length === 0) { set({ phase: 'game_over', result: null }); return; }
    const [kanDraw, ...rest] = s.wall;
    const newDora = rest.length > 0 ? rest[0] : s.dora[s.dora.length - 1];
    const players = s.players.map((p, i) => i === 0 ? { ...p, hand: newHand, melds: [...p.melds, meld], drawnTile: kanDraw } : p);
    set({ players, wall: rest, tilesLeft: rest.length, phase: 'player_turn', currentPlayer: 0, pendingDiscard: null, callOptions: EMPTY_CALL, dora: [...s.dora, newDora] });
  },

  // ──────────────────────────────────────────────────────────── humanChi
  humanChi([id1, id2]: [number, number]) {
    const s = get();
    if (!s.pendingDiscard) return;
    const human = s.players[0];
    const discard = s.pendingDiscard.tile;
    const t1 = human.hand.find(t => t.id === id1);
    const t2 = human.hand.find(t => t.id === id2);
    if (!t1 || !t2) return;
    const meld: Meld = { type: 'chi', tiles: [t1, t2, discard].sort(compareTiles), fromPlayer: s.pendingDiscard.playerIndex, calledTile: discard };
    const removeIds = new Set([id1, id2]);
    const newHand = sortHand(human.hand.filter(t => !removeIds.has(t.id)));
    const players = s.players.map((p, i) => i === 0 ? { ...p, hand: newHand, melds: [...p.melds, meld], drawnTile: null } : p);
    set({ players, phase: 'player_turn', currentPlayer: 0, pendingDiscard: null, callOptions: EMPTY_CALL });
  },

  // ──────────────────────────────────────────────────────────── humanPass
  humanPass() {
    const s = get();
    const nextPlayer = s.currentPlayer;
    if (nextPlayer === 0) {
      if (s.wall.length === 0) { set({ phase: 'game_over', result: null }); return; }
      const [drawn, ...rest] = s.wall;
      const players = s.players.map((p, i) => i === 0 ? { ...p, drawnTile: drawn } : p);
      set({ phase: 'player_turn', players, wall: rest, tilesLeft: rest.length, currentPlayer: 0, pendingDiscard: null, callOptions: EMPTY_CALL });
    } else {
      set({ phase: 'ai_turn', callOptions: EMPTY_CALL });
    }
  },

  // ──────────────────────────────────────────────────────────── aiProcessTurn
  aiProcessTurn(playerIndex: number) {
    const s = get();
    if (s.phase === 'game_over' || s.currentPlayer !== playerIndex) return;
    const { gameMode } = s;

    const player = s.players[playerIndex];
    let workWall = [...s.wall];
    let workPlayers = [...s.players];

    // ── Handle pending discard ─────────────────────────────────────────────
    if (s.pendingDiscard && s.pendingDiscard.playerIndex !== playerIndex) {
      const pd = s.pendingDiscard;
      // HK/MCR: any player can Chow; Riichi: only the immediate next player
      const canChi = gameMode !== 'riichi' || pd.playerIndex === (playerIndex + 3) % 4;
      const decision = aiDecideCall(player.hand, player.melds, pd.tile, canChi, player.seatWind, s.roundWind);

      if (decision.action === 'ron') {
        const fullHand = [...player.hand, pd.tile];
        const ctx: WinContext = { isRiichi: player.isRiichi, isTsumo: false, seatWind: player.seatWind, roundWind: s.roundWind };
        const res = resolveWin(fullHand, player.melds, pd.tile, ctx, player.isDealer, gameMode);
        if (res) {
          set({ players: applyScoreTransfer(workPlayers, playerIndex, res.score, false, pd.playerIndex), phase: 'game_over', result: { winnerIndex: playerIndex, winTile: pd.tile, ...res, isTsumo: false, loserIndex: pd.playerIndex } });
          return;
        }
      }

      if (decision.action === 'pon' && canPon(player.hand, pd.tile)) {
        const matching = player.hand.filter(t => sameTileType(t, pd.tile)).slice(0, 2);
        const meld: Meld = { type: 'pon', tiles: [...matching, pd.tile], fromPlayer: pd.playerIndex, calledTile: pd.tile };
        const matchIds = new Set(matching.map(t => t.id));
        const ponHand = player.hand.filter(t => !matchIds.has(t.id));
        const discardTile = aiChooseDiscard(ponHand, [...player.melds, meld]);
        const finalHand = sortHand(ponHand.filter(t => t.id !== discardTile.id));
        workPlayers = workPlayers.map((p, i) =>
          i === playerIndex ? { ...p, hand: finalHand, melds: [...p.melds, meld], drawnTile: null, discards: [...p.discards, discardTile] } : p,
        );
        return set(aiDiscardResult(workPlayers, workWall, discardTile, playerIndex, s.roundWind, gameMode));
      }

      if (decision.action === 'chi' && canChi && decision.chiTiles) {
        const ct = decision.chiTiles;
        const meld: Meld = { type: 'chi', tiles: [...ct, pd.tile].sort(compareTiles), fromPlayer: pd.playerIndex, calledTile: pd.tile };
        const chiIds = new Set(ct.map(t => t.id));
        const chiHand = player.hand.filter(t => !chiIds.has(t.id));
        const discardTile = aiChooseDiscard(chiHand, [...player.melds, meld]);
        const finalHand = sortHand(chiHand.filter(t => t.id !== discardTile.id));
        workPlayers = workPlayers.map((p, i) =>
          i === playerIndex ? { ...p, hand: finalHand, melds: [...p.melds, meld], drawnTile: null, discards: [...p.discards, discardTile] } : p,
        );
        return set(aiDiscardResult(workPlayers, workWall, discardTile, playerIndex, s.roundWind, gameMode));
      }
    }

    // ── Draw ──────────────────────────────────────────────────────────────
    if (workWall.length === 0) { set({ phase: 'game_over', result: null }); return; }
    const [drawn, ...rest] = workWall;
    workWall = rest;
    const fullHand = [...player.hand, drawn];

    // ── Check tsumo ───────────────────────────────────────────────────────
    if (isWinningHand(fullHand, player.melds)) {
      const ctx: WinContext = { isRiichi: player.isRiichi, isTsumo: true, seatWind: player.seatWind, roundWind: s.roundWind };
      const res = resolveWin(fullHand, player.melds, drawn, ctx, player.isDealer, gameMode);
      if (res) {
        workPlayers = workPlayers.map((p, i) => i === playerIndex ? { ...p, drawnTile: drawn } : p);
        set({ players: applyScoreTransfer(workPlayers, playerIndex, res.score, true), wall: workWall, tilesLeft: workWall.length, phase: 'game_over', result: { winnerIndex: playerIndex, winTile: drawn, ...res, isTsumo: true } });
        return;
      }
    }

    // ── Discard ───────────────────────────────────────────────────────────
    const discardTile = aiChooseDiscard(fullHand, player.melds);
    const newHand = sortHand(fullHand.filter(t => t.id !== discardTile.id));
    workPlayers = workPlayers.map((p, i) =>
      i === playerIndex ? { ...p, hand: newHand, drawnTile: null, discards: [...p.discards, discardTile] } : p,
    );

    set(aiDiscardResult(workPlayers, workWall, discardTile, playerIndex, s.roundWind, gameMode));
  },
}));

// ─── Helper: produce the next state after an AI discard ──────────────────────

function aiDiscardResult(
  players: PlayerState[],
  wall: Tile[],
  discardTile: Tile,
  discarderIdx: number,
  roundWind: number,
  gameMode: GameMode,
): Partial<GameState> {
  // Check other AIs for Ron
  for (let q = 1; q <= 3; q++) {
    const otherIdx = (discarderIdx + q) % 4;
    if (otherIdx === 0) continue;
    const other = players[otherIdx];
    const fullHand = [...other.hand, discardTile];
    const ctx: WinContext = { isRiichi: other.isRiichi, isTsumo: false, seatWind: other.seatWind, roundWind };
    const res = resolveWin(fullHand, other.melds, discardTile, ctx, other.isDealer, gameMode);
    if (res) {
      return { players: applyScoreTransfer(players, otherIdx, res.score, false, discarderIdx), wall, tilesLeft: wall.length, phase: 'game_over', result: { winnerIndex: otherIdx, winTile: discardTile, ...res, isTsumo: false, loserIndex: discarderIdx } };
    }
  }

  // Human call options
  const human = players[0];
  // HK/MCR: Chow from any player; Riichi: only from immediate left (player 3)
  const humanCanChi = gameMode !== 'riichi' || discarderIdx === 3;
  const callOpts: CallOptions = {
    canRon:    isWinningHand([...human.hand, discardTile], human.melds),
    canPon:    canPon(human.hand, discardTile),
    canKan:    canKan(human.hand, discardTile),
    chiOptions: humanCanChi ? getChiOptions(human.hand, discardTile) : [],
  };
  const hasHumanCall = callOpts.canRon || callOpts.canPon || callOpts.canKan || callOpts.chiOptions.length > 0;

  const nextPlayer = (discarderIdx + 1) % 4;

  if (hasHumanCall) {
    return {
      players, wall, tilesLeft: wall.length,
      phase: 'call_window',
      currentPlayer: nextPlayer,
      pendingDiscard: { tile: discardTile, playerIndex: discarderIdx },
      callOptions: callOpts,
    };
  }

  if (nextPlayer === 0) {
    if (wall.length === 0) return { phase: 'game_over', result: null };
    const [humanDrawn, ...humanRest] = wall;
    return {
      players: players.map((p, i) => i === 0 ? { ...p, drawnTile: humanDrawn } : p),
      wall: humanRest, tilesLeft: humanRest.length,
      phase: 'player_turn', currentPlayer: 0,
      pendingDiscard: null, callOptions: { canRon: false, canPon: false, canKan: false, chiOptions: [] },
    };
  }

  return {
    players, wall, tilesLeft: wall.length,
    phase: 'ai_turn',
    currentPlayer: nextPlayer,
    pendingDiscard: { tile: discardTile, playerIndex: discarderIdx },
    callOptions: { canRon: false, canPon: false, canKan: false, chiOptions: [] },
  };
}
