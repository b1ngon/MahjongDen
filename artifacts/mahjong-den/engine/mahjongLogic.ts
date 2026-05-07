import { Tile, Meld, Suit, tileKey, sameTileType, compareTiles, isHonor, isTerminal } from './tiles';

// ─── Tile array helpers ───────────────────────────────────────────────────────

function removeById(tiles: Tile[], tile: Tile): Tile[] {
  const i = tiles.findIndex(t => t.id === tile.id);
  if (i === -1) return tiles;
  return [...tiles.slice(0, i), ...tiles.slice(i + 1)];
}

function removeNByType(tiles: Tile[], proto: Tile, n: number): Tile[] {
  let removed = 0;
  return tiles.filter(t => {
    if (removed < n && sameTileType(t, proto)) { removed++; return false; }
    return true;
  });
}

// ─── Win-detection primitives ─────────────────────────────────────────────────

function canFormSets(tiles: Tile[], needed: number): boolean {
  if (needed === 0) return tiles.length === 0;
  if (tiles.length < needed * 3) return false;

  const sorted = [...tiles].sort(compareTiles);
  const first = sorted[0];

  // Triplet
  if (sorted.filter(t => sameTileType(t, first)).length >= 3) {
    const rest = removeNByType(sorted, first, 3);
    if (canFormSets(rest, needed - 1)) return true;
  }

  // Sequence
  if (!isHonor(first) && first.number <= 7) {
    const t2 = sorted.find(t => t.suit === first.suit && t.number === first.number + 1);
    const t3 = sorted.find(t => t.suit === first.suit && t.number === first.number + 2);
    if (t2 && t3) {
      let rest = removeById(sorted, first);
      rest = removeById(rest, t2);
      rest = removeById(rest, t3);
      if (canFormSets(rest, needed - 1)) return true;
    }
  }

  return false;
}

export function isWinningHand(hand: Tile[], melds: Meld[]): boolean {
  const needed = 4 - melds.length;
  const sorted = [...hand].sort(compareTiles);

  // Seven pairs (closed only)
  if (melds.length === 0 && hand.length === 14) {
    const counts: Record<string, number> = {};
    sorted.forEach(t => { counts[tileKey(t)] = (counts[tileKey(t)] || 0) + 1; });
    const vals = Object.values(counts);
    if (vals.length === 7 && vals.every(v => v === 2)) return true;
  }

  // Standard: try each tile as the pair
  const seen = new Set<string>();
  for (const tile of sorted) {
    const k = tileKey(tile);
    if (seen.has(k)) continue;
    seen.add(k);
    if (sorted.filter(t => tileKey(t) === k).length >= 2) {
      const rest = removeNByType(sorted, tile, 2);
      if (canFormSets(rest, needed)) return true;
    }
  }

  return false;
}

// ─── Tenpai / waits ───────────────────────────────────────────────────────────

const ALL_TILE_TYPES: {suit: Suit; number: number}[] = [
  ...Array.from({length: 9}, (_, i) => ({suit: 'man'    as Suit, number: i + 1})),
  ...Array.from({length: 9}, (_, i) => ({suit: 'pin'    as Suit, number: i + 1})),
  ...Array.from({length: 9}, (_, i) => ({suit: 'sou'    as Suit, number: i + 1})),
  ...Array.from({length: 4}, (_, i) => ({suit: 'wind'   as Suit, number: i + 1})),
  ...Array.from({length: 3}, (_, i) => ({suit: 'dragon' as Suit, number: i + 1})),
];

export function getTenpaiWaits(hand: Tile[], melds: Meld[]): {suit: Suit; number: number}[] {
  return ALL_TILE_TYPES.filter(type => {
    const testTile: Tile = { ...type, id: -1 };
    return isWinningHand([...hand, testTile], melds);
  });
}

export function isTenpai(hand: Tile[], melds: Meld[]): boolean {
  return getTenpaiWaits(hand, melds).length > 0;
}

// ─── Calls ────────────────────────────────────────────────────────────────────

export function getChiOptions(hand: Tile[], discard: Tile): Tile[][] {
  if (isHonor(discard)) return [];
  const n = discard.number;
  const options: Tile[][] = [];

  const trySeq = (a: number, b: number) => {
    if (a < 1 || a > 9 || b < 1 || b > 9) return;
    const tA = hand.find(t => t.suit === discard.suit && t.number === a);
    if (!tA) return;
    const tB = hand.find(t => t.suit === discard.suit && t.number === b && t.id !== tA.id);
    if (tB) options.push([tA, tB]);
  };

  trySeq(n - 2, n - 1);
  trySeq(n - 1, n + 1);
  trySeq(n + 1, n + 2);
  return options;
}

export function canPon(hand: Tile[], discard: Tile): boolean {
  return hand.filter(t => sameTileType(t, discard)).length >= 2;
}

export function canKan(hand: Tile[], discard: Tile): boolean {
  return hand.filter(t => sameTileType(t, discard)).length >= 3;
}

// ─── Yaku ─────────────────────────────────────────────────────────────────────

export interface Yaku { name: string; han: number; }

export interface WinContext {
  isRiichi: boolean;
  isTsumo: boolean;
  seatWind: number;  // 1=E 2=S 3=W 4=N
  roundWind: number;
}

function identifySets(tiles: Tile[], needed: number): Tile[][] | null {
  if (needed === 0) return tiles.length === 0 ? [] : null;
  if (tiles.length < needed * 3) return null;

  const sorted = [...tiles].sort(compareTiles);
  const first = sorted[0];

  // Triplet
  if (sorted.filter(t => sameTileType(t, first)).length >= 3) {
    const trip = sorted.filter(t => sameTileType(t, first)).slice(0, 3);
    const rest = removeNByType(sorted, first, 3);
    const more = identifySets(rest, needed - 1);
    if (more !== null) return [trip, ...more];
  }

  // Sequence
  if (!isHonor(first) && first.number <= 7) {
    const t2 = sorted.find(t => t.suit === first.suit && t.number === first.number + 1);
    const t3 = sorted.find(t => t.suit === first.suit && t.number === first.number + 2);
    if (t2 && t3) {
      let rest = removeById(sorted, first);
      rest = removeById(rest, t2);
      rest = removeById(rest, t3);
      const more = identifySets(rest, needed - 1);
      if (more !== null) return [[first, t2, t3], ...more];
    }
  }

  return null;
}

export function identifyYaku(hand: Tile[], melds: Meld[], ctx: WinContext, winTile: Tile): Yaku[] {
  const yaku: Yaku[] = [];
  const isClosed = melds.every(m => m.type === 'ankan');
  const allTiles = [...hand, ...melds.flatMap(m => m.tiles)];

  if (ctx.isRiichi && isClosed)           yaku.push({ name: 'Riichi', han: 1 });
  if (ctx.isTsumo && isClosed)            yaku.push({ name: 'Menzen Tsumo', han: 1 });

  // Tanyao: no terminals or honors
  if (allTiles.every(t => !isTerminal(t))) yaku.push({ name: 'Tanyao', han: 1 });

  // Yakuhai: triplet of dragons / seat-wind / round-wind
  const meldAndClosedSets = [
    ...melds.map(m => m.tiles),
    ...(identifySets(hand, 4 - melds.length) ?? []),
  ];

  for (const set of meldAndClosedSets) {
    if (set.length < 3) continue;
    const t = set[0];
    const isTriplet = sameTileType(set[0], set[1]) && sameTileType(set[0], set[2]);
    if (!isTriplet) continue;
    if (t.suit === 'dragon')
      yaku.push({ name: ['Haku', 'Hatsu', 'Chun'][t.number - 1], han: 1 });
    if (t.suit === 'wind' && t.number === ctx.roundWind)
      yaku.push({ name: 'Round Wind', han: 1 });
    if (t.suit === 'wind' && t.number === ctx.seatWind)
      yaku.push({ name: 'Seat Wind', han: 1 });
  }

  // Honitsu / Chinitsu
  const nonHonors = allTiles.filter(t => !isHonor(t));
  const suits = [...new Set(nonHonors.map(t => t.suit))];
  if (suits.length === 1) {
    if (allTiles.some(t => isHonor(t)))
      yaku.push({ name: 'Honitsu', han: isClosed ? 3 : 2 });
    else
      yaku.push({ name: 'Chinitsu', han: isClosed ? 6 : 5 });
  }

  // Seven pairs
  if (isClosed && hand.length === 14) {
    const counts: Record<string, number> = {};
    hand.forEach(t => { counts[tileKey(t)] = (counts[tileKey(t)] || 0) + 1; });
    const vals = Object.values(counts);
    if (vals.length === 7 && vals.every(v => v === 2))
      yaku.push({ name: 'Seven Pairs', han: 2 });
  }

  return yaku;
}

// ─── Scoring ─────────────────────────────────────────────────────────────────

export interface ScoreResult {
  han: number;
  label: string;
  totalPoints: number;
}

export function calculateScore(yaku: Yaku[], isDealer: boolean, isTsumo: boolean): ScoreResult {
  const han = yaku.reduce((s, y) => s + y.han, 0);

  let label: string;
  let base: number;

  if (han >= 13)     { label = 'Yakuman';   base = 16000; }
  else if (han >= 11){ label = 'Sanbaiman'; base = 12000; }
  else if (han >= 8) { label = 'Baiman';    base = 8000;  }
  else if (han >= 5) { label = 'Mangan';    base = 8000;  }
  else {
    const bases: Record<number, number> = { 1: 1000, 2: 2000, 3: 3900, 4: 7700 };
    base = bases[han] ?? 1000;
    label = `${han} Han`;
  }

  const dealerMult = isDealer ? 1.5 : 1;
  const tsumoBonusMult = isTsumo ? 1 : 1;
  const totalPoints = Math.ceil((base * dealerMult * tsumoBonusMult) / 100) * 100;

  return { han, label, totalPoints };
}
