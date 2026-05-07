import {
  Tile, Meld, tileKey, sameTileType, isHonor, compareTiles,
} from './tiles';
import { WinContext, ScoreResult, Yaku, getHandStructure } from './mahjongLogic';

// ─── Chinese Official Mahjong (MCR / 國標麻將) ────────────────────────────────
// Simplified subset of 81-pattern system.
// Minimum 8 points to win; each loser pays (points × 50).
// Chow can be called from any player's discard.
// ─────────────────────────────────────────────────────────────────────────────

const POINTS_PER_UNIT = 50;  // scale factor: 1 MCR point = 50 game points
const MIN_POINTS      = 8;   // minimum points to declare a win

function isTriplet(set: Tile[]): boolean {
  return set.length >= 3 && sameTileType(set[0], set[1]) && sameTileType(set[0], set[2]);
}

function isSequence(set: Tile[]): boolean {
  if (set.length < 3 || isHonor(set[0])) return false;
  const nums = set.map(t => t.number).sort((a, b) => a - b);
  return nums[1] === nums[0] + 1 && nums[2] === nums[1] + 1;
}

export interface MCRPattern {
  name: string;
  points: number;
}

export function calculateMCRPoints(
  hand: Tile[],
  melds: Meld[],
  ctx: WinContext,
  winTile: Tile,
): { points: number; patterns: MCRPattern[] } {
  const patterns: MCRPattern[] = [];
  const allTiles = [...hand, ...melds.flatMap(m => m.tiles)];
  const isClosed = melds.every(m => m.type === 'ankan');

  // ── Seven Pairs (七對) ─────────────────────────────────────────────────────
  const isSevenPairs = melds.length === 0 && hand.length === 14 && (() => {
    const counts: Record<string, number> = {};
    hand.forEach(t => { counts[tileKey(t)] = (counts[tileKey(t)] || 0) + 1; });
    const vals = Object.values(counts);
    return vals.length === 7 && vals.every(v => v === 2);
  })();

  if (isSevenPairs) patterns.push({ name: 'Seven Pairs (七對)', points: 24 });

  // ── Collect sets ──────────────────────────────────────────────────────────
  const structure    = isSevenPairs ? null : getHandStructure(hand, melds);
  const meldSets     = melds.map(m => m.tiles);
  const closedSets   = structure ? structure.closedSets : [];
  const allSets      = [...meldSets, ...closedSets];

  // ── All Triplets (碰碰和) ──────────────────────────────────────────────────
  if (!isSevenPairs && allSets.length >= 4 && allSets.every(s => isTriplet(s))) {
    patterns.push({ name: 'All Triplets (碰碰和)', points: 30 });
  }

  // ── All Sequences ──────────────────────────────────────────────────────────
  if (!isSevenPairs && allSets.length >= 4 && allSets.every(s => isSequence(s))) {
    patterns.push({ name: 'All Sequences (平和)', points: 5 });
  }

  // ── Suit patterns ─────────────────────────────────────────────────────────
  const nonHonors = allTiles.filter(t => !isHonor(t));
  const suits = [...new Set(nonHonors.map(t => t.suit))];
  if (suits.length === 1 && !allTiles.some(isHonor)) {
    patterns.push({ name: 'Full Flush (清一色)', points: 24 });
  } else if (suits.length === 1 && allTiles.some(isHonor)) {
    patterns.push({ name: 'Half Flush (混一色)', points: 6 });
  }

  // ── All Honors ────────────────────────────────────────────────────────────
  if (allTiles.every(isHonor)) {
    patterns.push({ name: 'All Honors (字一色)', points: 64 });
  }

  // ── All Terminals ─────────────────────────────────────────────────────────
  const allTermTiles = allTiles.every(t => !isHonor(t) && (t.number === 1 || t.number === 9));
  if (allTermTiles) patterns.push({ name: 'All Terminals (清老頭)', points: 64 });

  // ── Honor-set bonuses ─────────────────────────────────────────────────────
  for (const set of allSets) {
    if (!isTriplet(set)) continue;
    const t = set[0];
    if (t.suit === 'dragon')
      patterns.push({ name: `Dragon Pong (${['白','發','中'][t.number - 1]})`, points: 1 });
    if (t.suit === 'wind' && t.number === ctx.roundWind)
      patterns.push({ name: 'Round Wind Pong', points: 1 });
    if (t.suit === 'wind' && t.number === ctx.seatWind)
      patterns.push({ name: 'Seat Wind Pong', points: 1 });
  }

  // ── Concealed Hand ────────────────────────────────────────────────────────
  if (isClosed && !ctx.isTsumo) patterns.push({ name: 'Concealed Hand (門前清)', points: 2 });

  // ── Self-draw ─────────────────────────────────────────────────────────────
  if (ctx.isTsumo) patterns.push({ name: 'Self-draw (自摸)', points: 1 });

  const points = patterns.reduce((s, p) => s + p.points, 0);
  return { points, patterns };
}

export function calculateMCRScore(
  points: number,
  isDealer: boolean,
  isTsumo: boolean,
): ScoreResult {
  const perLoser = points * POINTS_PER_UNIT;

  let totalPoints: number;
  let dealerPayment: number | undefined;
  let nonDealerPayment: number | undefined;
  const label = `${points} pts (MCR)`;

  if (isTsumo) {
    totalPoints      = perLoser * 3;
    dealerPayment    = perLoser;
    nonDealerPayment = perLoser;
  } else {
    totalPoints = perLoser;
  }

  if (isDealer) totalPoints = Math.round(totalPoints * 1.5);

  return { han: points, fu: 0, label, totalPoints, dealerPayment, nonDealerPayment };
}

export function resolveWinMCR(
  hand: Tile[],
  melds: Meld[],
  winTile: Tile,
  ctx: WinContext,
  isDealer: boolean,
): { yaku: Yaku[]; score: ScoreResult } | null {
  const { points, patterns } = calculateMCRPoints(hand, melds, ctx, winTile);
  if (points < MIN_POINTS) return null;
  const score = calculateMCRScore(points, isDealer, ctx.isTsumo);
  const yaku: Yaku[] = patterns.map(p => ({ name: p.name, han: p.points }));
  return { yaku, score };
}
