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

  if (sorted.filter(t => sameTileType(t, first)).length >= 3) {
    const rest = removeNByType(sorted, first, 3);
    if (canFormSets(rest, needed - 1)) return true;
  }

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

// ─── Hand structure (for fu/yaku analysis) ───────────────────────────────────

function findSets(tiles: Tile[], needed: number): Tile[][] | null {
  if (needed === 0) return tiles.length === 0 ? [] : null;
  if (tiles.length < needed * 3) return null;

  const sorted = [...tiles].sort(compareTiles);
  const first = sorted[0];

  if (sorted.filter(t => sameTileType(t, first)).length >= 3) {
    const trip = sorted.filter(t => sameTileType(t, first)).slice(0, 3);
    const rest = removeNByType(sorted, first, 3);
    const more = findSets(rest, needed - 1);
    if (more !== null) return [trip, ...more];
  }

  if (!isHonor(first) && first.number <= 7) {
    const t2 = sorted.find(t => t.suit === first.suit && t.number === first.number + 1);
    const t3 = sorted.find(t => t.suit === first.suit && t.number === first.number + 2);
    if (t2 && t3) {
      let rest = removeById(sorted, first);
      rest = removeById(rest, t2);
      rest = removeById(rest, t3);
      const more = findSets(rest, needed - 1);
      if (more !== null) return [[first, t2, t3], ...more];
    }
  }

  return null;
}

export interface HandStructure {
  closedSets: Tile[][];
  pair: [Tile, Tile];
}

export function getHandStructure(hand: Tile[], melds: Meld[]): HandStructure | null {
  const needed = 4 - melds.length;
  const sorted = [...hand].sort(compareTiles);

  const seen = new Set<string>();
  for (const tile of sorted) {
    const k = tileKey(tile);
    if (seen.has(k)) continue;
    seen.add(k);
    if (sorted.filter(t => tileKey(t) === k).length >= 2) {
      const second = sorted.find(t => tileKey(t) === k && t.id !== tile.id)!;
      const rest = removeNByType(sorted, tile, 2);
      const sets = findSets(rest, needed);
      if (sets !== null) return { closedSets: sets, pair: [tile, second] };
    }
  }
  return null;
}

// ─── Tenpai / waits ───────────────────────────────────────────────────────────

const ALL_TILE_TYPES: { suit: Suit; number: number }[] = [
  ...Array.from({ length: 9 }, (_, i) => ({ suit: 'man'    as Suit, number: i + 1 })),
  ...Array.from({ length: 9 }, (_, i) => ({ suit: 'pin'    as Suit, number: i + 1 })),
  ...Array.from({ length: 9 }, (_, i) => ({ suit: 'sou'    as Suit, number: i + 1 })),
  ...Array.from({ length: 4 }, (_, i) => ({ suit: 'wind'   as Suit, number: i + 1 })),
  ...Array.from({ length: 3 }, (_, i) => ({ suit: 'dragon' as Suit, number: i + 1 })),
];

export function getTenpaiWaits(hand: Tile[], melds: Meld[]): { suit: Suit; number: number }[] {
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
  seatWind: number;
  roundWind: number;
}

export function identifyYaku(hand: Tile[], melds: Meld[], ctx: WinContext, winTile: Tile): Yaku[] {
  const yaku: Yaku[] = [];
  const isClosed = melds.every(m => m.type === 'ankan');
  const allTiles = [...hand, ...melds.flatMap(m => m.tiles)];

  if (ctx.isRiichi && isClosed)           yaku.push({ name: 'Riichi', han: 1 });
  if (ctx.isTsumo && isClosed)            yaku.push({ name: 'Menzen Tsumo', han: 1 });
  if (allTiles.every(t => !isTerminal(t))) yaku.push({ name: 'Tanyao', han: 1 });

  const allSets = [
    ...melds.map(m => m.tiles),
    ...(findSets(hand, 4 - melds.length) ?? []),
  ];

  for (const set of allSets) {
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

  const nonHonors = allTiles.filter(t => !isHonor(t));
  const suits = [...new Set(nonHonors.map(t => t.suit))];
  if (suits.length === 1) {
    if (allTiles.some(t => isHonor(t)))
      yaku.push({ name: 'Honitsu', han: isClosed ? 3 : 2 });
    else
      yaku.push({ name: 'Chinitsu', han: isClosed ? 6 : 5 });
  }

  if (isClosed && hand.length === 14) {
    const counts: Record<string, number> = {};
    hand.forEach(t => { counts[tileKey(t)] = (counts[tileKey(t)] || 0) + 1; });
    const vals = Object.values(counts);
    if (vals.length === 7 && vals.every(v => v === 2))
      yaku.push({ name: 'Seven Pairs', han: 2 });
  }

  // Pinfu: closed, all sequences, non-yakuhai pair, ryanmen wait
  if (isClosed && melds.length === 0) {
    const structure = getHandStructure(hand, []);
    if (structure) {
      const { closedSets, pair } = structure;
      const allSequences = closedSets.every(set => !sameTileType(set[0], set[1]));
      const pairNotYakuhai =
        pair[0].suit !== 'dragon' &&
        !(pair[0].suit === 'wind' && pair[0].number === ctx.roundWind) &&
        !(pair[0].suit === 'wind' && pair[0].number === ctx.seatWind);

      if (allSequences && pairNotYakuhai) {
        const winKey = tileKey(winTile);
        const pairKey = tileKey(pair[0]);
        let isRyanmen = false;
        if (winKey !== pairKey) {
          for (const set of closedSets) {
            if (!sameTileType(set[0], set[1])) {
              const nums = set.map(t => t.number).sort((a, b) => a - b);
              const winNum = winTile.number;
              if (set.some(t => t.suit === winTile.suit && t.number === winNum)) {
                const pos = nums.indexOf(winNum);
                if (pos === 0 && nums[0] > 1) isRyanmen = true;
                if (pos === 2 && nums[2] < 9) isRyanmen = true;
                break;
              }
            }
          }
        }
        if (isRyanmen) yaku.push({ name: 'Pinfu', han: 1 });
      }
    }
  }

  return yaku;
}

// ─── Fu calculation ───────────────────────────────────────────────────────────

export function calculateFu(
  hand: Tile[],
  melds: Meld[],
  winTile: Tile,
  ctx: WinContext,
): number {
  // Seven pairs: always 25 fu
  if (melds.length === 0) {
    const counts: Record<string, number> = {};
    hand.forEach(t => { counts[tileKey(t)] = (counts[tileKey(t)] || 0) + 1; });
    if (Object.keys(counts).length === 7 && Object.values(counts).every(v => v === 2)) return 25;
  }

  const isClosed = melds.every(m => m.type === 'ankan');
  let fu = (isClosed && !ctx.isTsumo) ? 30 : 20;
  if (ctx.isTsumo) fu += 2;

  // Meld fu
  for (const meld of melds) {
    const th = isTerminal(meld.tiles[0]);
    if (meld.type === 'ankan') fu += th ? 32 : 16;
    else if (meld.type === 'kan') fu += th ? 16 : 8;
    else if (meld.type === 'pon') fu += th ? 4 : 2;
  }

  const structure = getHandStructure(hand, melds);
  if (structure) {
    const { closedSets, pair } = structure;

    // Pair fu
    const pt = pair[0];
    if (pt.suit === 'dragon') fu += 2;
    if (pt.suit === 'wind' && pt.number === ctx.roundWind) fu += 2;
    if (pt.suit === 'wind' && pt.number === ctx.seatWind) fu += 2;

    // Closed set fu
    for (const set of closedSets) {
      if (sameTileType(set[0], set[1])) {
        fu += isTerminal(set[0]) ? 8 : 4;
      }
    }

    // Wait type fu
    const winKey = tileKey(winTile);
    const pairKey = tileKey(pair[0]);

    if (winKey === pairKey) {
      fu += 2; // tanki
    } else {
      for (const set of closedSets) {
        if (!sameTileType(set[0], set[1])) {
          const nums = set.map(t => t.number).sort((a, b) => a - b);
          const winNum = winTile.number;
          const matchSet = set.find(t => t.suit === winTile.suit && t.number === winNum);
          if (matchSet) {
            const pos = nums.indexOf(winNum);
            if (pos === 1) {
              fu += 2; // kanchan
            } else if (pos === 0 && nums[0] === 1) {
              fu += 2; // penchan (held 2-3, waiting on 1)
            } else if (pos === 2 && nums[2] === 9) {
              fu += 2; // penchan (held 7-8, waiting on 9)
            }
            break;
          }
        }
      }
    }
  }

  return Math.ceil(fu / 10) * 10;
}

// ─── Scoring ─────────────────────────────────────────────────────────────────

export interface ScoreResult {
  han: number;
  fu: number;
  label: string;
  totalPoints: number;
  dealerPayment?: number;
  nonDealerPayment?: number;
}

export function calculateScore(
  han: number,
  fu: number,
  isDealer: boolean,
  isTsumo: boolean,
): ScoreResult {
  // Mangan check
  const isMangan = han >= 5 || (han >= 4 && fu >= 30) || (han >= 3 && fu >= 70);

  let basic: number;
  let label: string;

  if (han >= 13)      { basic = 8000;  label = 'Yakuman'; }
  else if (han >= 11) { basic = 6000;  label = 'Sanbaiman'; }
  else if (han >= 8)  { basic = 4000;  label = 'Baiman'; }
  else if (han >= 6)  { basic = 3000;  label = 'Haneman'; }
  else if (isMangan)  { basic = 2000;  label = 'Mangan'; }
  else {
    basic = fu * Math.pow(2, han + 2);
    if (basic > 2000) { basic = 2000; label = 'Mangan'; }
    else label = `${han} Han ${fu} Fu`;
  }

  let totalPoints: number;
  let dealerPayment: number | undefined;
  let nonDealerPayment: number | undefined;

  if (isDealer) {
    if (isTsumo) {
      const each = Math.ceil(basic * 2 / 100) * 100;
      totalPoints = each * 3;
      nonDealerPayment = each;
    } else {
      totalPoints = Math.ceil(basic * 6 / 100) * 100;
    }
  } else {
    if (isTsumo) {
      dealerPayment = Math.ceil(basic * 2 / 100) * 100;
      nonDealerPayment = Math.ceil(basic / 100) * 100;
      totalPoints = dealerPayment + nonDealerPayment * 2;
    } else {
      totalPoints = Math.ceil(basic * 4 / 100) * 100;
    }
  }

  return { han, fu, label, totalPoints, dealerPayment, nonDealerPayment };
}
