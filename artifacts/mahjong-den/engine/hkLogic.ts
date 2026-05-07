import {
  Tile, Meld, tileKey, sameTileType, isHonor,
} from './tiles';
import { WinContext, ScoreResult, Yaku, getHandStructure } from './mahjongLogic';

// ─── HK Mahjong — Faan-Based Scoring ─────────────────────────────────────────
// Any winning hand is valid (no yaku/minimum requirement).
// Chow (Chow) can be called from any player's discard.
// Scoring: each loser pays base × 2^faan (capped at 8 faan).
// ─────────────────────────────────────────────────────────────────────────────

const BASE_UNIT = 100;  // points per loser at 0 faan
const MAX_FAAN  = 8;    // cap

export interface HKFaanDetail {
  name: string;
  faan: number;
}

export interface HKResult {
  faan: number;
  details: HKFaanDetail[];
  score: ScoreResult;
}

function isTriplet(set: Tile[]): boolean {
  return set.length >= 3 && sameTileType(set[0], set[1]) && sameTileType(set[0], set[2]);
}

export function calculateHKFaan(
  hand: Tile[],
  melds: Meld[],
  ctx: WinContext,
  winTile: Tile,
): { faan: number; details: HKFaanDetail[] } {
  const details: HKFaanDetail[] = [];
  const allTiles = [...hand, ...melds.flatMap(m => m.tiles)];

  // ── Seven Pairs ───────────────────────────────────────────────────────────
  const isSevenPairs = melds.length === 0 && hand.length === 14 && (() => {
    const counts: Record<string, number> = {};
    hand.forEach(t => { counts[tileKey(t)] = (counts[tileKey(t)] || 0) + 1; });
    const vals = Object.values(counts);
    return vals.length === 7 && vals.every(v => v === 2);
  })();

  if (isSevenPairs) {
    details.push({ name: 'Seven Pairs (七對)', faan: 4 });
  }

  // ── Collect all sets for analysis ─────────────────────────────────────────
  const structure = isSevenPairs ? null : getHandStructure(hand, melds);
  const meldSets  = melds.map(m => m.tiles);
  const closedSets = structure ? structure.closedSets : [];
  const allSets   = [...meldSets, ...closedSets];

  // ── Self-draw ─────────────────────────────────────────────────────────────
  if (ctx.isTsumo) details.push({ name: 'Zi Mo (自摸)', faan: 1 });

  // ── Honor sets (Pong/Gong of dragons/winds) ───────────────────────────────
  for (const set of allSets) {
    if (!isTriplet(set)) continue;
    const t = set[0];
    if (t.suit === 'dragon') {
      const name = ['Haku (白)', 'Hatsu (發)', 'Chun (中)'][t.number - 1];
      details.push({ name: `${name} Pong`, faan: 1 });
    }
    if (t.suit === 'wind' && t.number === ctx.roundWind) {
      details.push({ name: 'Round Wind Pong', faan: 1 });
    }
    if (t.suit === 'wind' && t.number === ctx.seatWind) {
      details.push({ name: 'Seat Wind Pong', faan: 1 });
    }
  }

  // ── All Pongs (碰碰和) ─────────────────────────────────────────────────────
  const nonAnkanMelds = melds.filter(m => m.type !== 'ankan');
  const openMeldSets  = nonAnkanMelds.map(m => m.tiles);
  const closedMeldSets = melds.filter(m => m.type === 'ankan').map(m => m.tiles);
  const allNonPairSets = [...openMeldSets, ...closedMeldSets, ...(structure?.closedSets ?? [])];

  if (!isSevenPairs && allNonPairSets.length > 0 && allNonPairSets.every(s => isTriplet(s))) {
    details.push({ name: 'All Pongs (碰碰和)', faan: 3 });
  }

  // ── Suit patterns ─────────────────────────────────────────────────────────
  const nonHonors = allTiles.filter(t => !isHonor(t));
  const suits = [...new Set(nonHonors.map(t => t.suit))];
  if (!isSevenPairs || allTiles.every(t => !isHonor(t))) {
    if (suits.length === 1 && !allTiles.some(isHonor)) {
      details.push({ name: 'Pure Suit (清一色)', faan: 7 });
    } else if (suits.length === 1 && allTiles.some(isHonor)) {
      details.push({ name: 'Mixed Suit (混一色)', faan: 3 });
    }
  }
  if (isSevenPairs && suits.length === 1 && !allTiles.some(isHonor)) {
    details.push({ name: 'Pure Suit (清一色)', faan: 7 });
  } else if (isSevenPairs && suits.length === 1) {
    details.push({ name: 'Mixed Suit (混一色)', faan: 3 });
  }

  // ── All Terminals & Honors ────────────────────────────────────────────────
  const allTerminals = allTiles.every(t => isHonor(t) || t.number === 1 || t.number === 9);
  if (allTerminals) {
    details.push({ name: 'All Terminals & Honors (老頭)', faan: 7 });
  }

  // ── Deduplicate suit + terminals (take highest) ───────────────────────────
  // Remove Mixed Suit if Pure Suit already counted
  const hasPure  = details.some(d => d.name.startsWith('Pure Suit'));
  const hasMixed = details.some(d => d.name.startsWith('Mixed Suit'));
  const filtered = hasPure && hasMixed
    ? details.filter(d => !d.name.startsWith('Mixed Suit'))
    : details;

  const faan = Math.min(filtered.reduce((s, d) => s + d.faan, 0), MAX_FAAN);
  return { faan, details: filtered };
}

export function calculateHKScore(
  faan: number,
  isDealer: boolean,
  isTsumo: boolean,
): ScoreResult {
  const perLoser = Math.min(BASE_UNIT * Math.pow(2, faan), BASE_UNIT * Math.pow(2, MAX_FAAN));

  let totalPoints: number;
  let dealerPayment: number | undefined;
  let nonDealerPayment: number | undefined;
  const label = faan === 0 ? 'Chicken Hand' : `${faan} Faan`;

  if (isTsumo) {
    // All three losers pay
    totalPoints = perLoser * 3;
    dealerPayment   = perLoser;
    nonDealerPayment = perLoser;
  } else {
    totalPoints = perLoser;
  }

  if (isDealer) totalPoints = Math.round(totalPoints * 1.5);

  return { han: faan, fu: 0, label, totalPoints, dealerPayment, nonDealerPayment };
}

export function resolveWinHK(
  hand: Tile[],
  melds: Meld[],
  winTile: Tile,
  ctx: WinContext,
  isDealer: boolean,
): { yaku: Yaku[]; score: ScoreResult } {
  const { faan, details } = calculateHKFaan(hand, melds, ctx, winTile);
  const score = calculateHKScore(faan, isDealer, ctx.isTsumo);
  const yaku: Yaku[] = details.map(d => ({ name: d.name, han: d.faan }));
  return { yaku, score };
}
