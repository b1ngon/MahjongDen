import { Tile, Meld, sameTileType, isHonor, isTerminal } from './tiles';
import { isWinningHand, isTenpai, getChiOptions, canPon, canKan } from './mahjongLogic';

// ─── Discard decision ────────────────────────────────────────────────────────

function tileUtility(tile: Tile, hand: Tile[]): number {
  // Higher utility = keep tile

  if (isHonor(tile)) {
    const count = hand.filter(t => sameTileType(t, tile)).length;
    if (count >= 3) return 80;
    if (count >= 2) return 40;
    return -20; // isolated honor = discard
  }

  if (isTerminal(tile)) {
    const count = hand.filter(t => sameTileType(t, tile)).length;
    if (count >= 3) return 75;
    if (count >= 2) return 35;
    // Check neighbors
    const adj = hand.filter(t => t.suit === tile.suit && Math.abs(t.number - tile.number) <= 2 && t.id !== tile.id);
    return -10 + adj.length * 8;
  }

  // Middle numbered tile: check sequential neighbors
  const seqNeighbors = hand.filter(
    t => t.id !== tile.id && t.suit === tile.suit && Math.abs(t.number - tile.number) <= 2
  ).length;

  const exactPairs = hand.filter(t => t.id !== tile.id && sameTileType(t, tile)).length;

  return seqNeighbors * 12 + exactPairs * 18;
}

export function aiChooseDiscard(hand: Tile[], melds: Meld[]): Tile {
  // Don't discard tiles that complete sets we have
  const scored = hand.map(tile => ({ tile, score: tileUtility(tile, hand) }));
  scored.sort((a, b) => a.score - b.score);
  return scored[0].tile;
}

// ─── Call decision ───────────────────────────────────────────────────────────

export interface AICallDecision {
  action: 'ron' | 'pon' | 'chi' | 'kan' | 'pass';
  chiTiles?: Tile[]; // the two hand tiles used for chi
}

export function aiDecideCall(
  hand: Tile[],
  melds: Meld[],
  discardedTile: Tile,
  canChi: boolean,
  seatWind: number,
  roundWind: number
): AICallDecision {
  // Ron
  if (isWinningHand([...hand, discardedTile], melds)) return { action: 'ron' };

  // Kan
  if (canKan(hand, discardedTile)) return { action: 'kan' };

  // Pon value tiles aggressively
  if (canPon(hand, discardedTile)) {
    if (discardedTile.suit === 'dragon') return { action: 'pon' };
    if (discardedTile.suit === 'wind' &&
        (discardedTile.number === seatWind || discardedTile.number === roundWind)) {
      return { action: 'pon' };
    }
    // Pon if it would leave hand in tenpai
    const ponMeld: Meld = {
      type: 'pon',
      tiles: [discardedTile, ...hand.filter(t => sameTileType(t, discardedTile)).slice(0, 2)],
      fromPlayer: -1,
      calledTile: discardedTile,
    };
    const afterPonHand = hand.filter(t => !sameTileType(t, discardedTile) ||
      hand.filter(tt => sameTileType(tt, discardedTile)).indexOf(t) >= 2);
    if (isTenpai(afterPonHand.slice(0, afterPonHand.length), [ponMeld, ...melds])) {
      return { action: 'pon' };
    }
  }

  // Chi
  if (canChi) {
    const chiOpts = getChiOptions(hand, discardedTile);
    if (chiOpts.length > 0 && isTenpai(hand, melds)) {
      return { action: 'chi', chiTiles: chiOpts[0] };
    }
  }

  return { action: 'pass' };
}

export function aiWantsTsumo(hand: Tile[], melds: Meld[]): boolean {
  return isWinningHand(hand, melds);
}

export function aiWantsRiichi(hand: Tile[], melds: Meld[]): boolean {
  if (melds.some(m => m.type !== 'ankan')) return false; // open hand
  return isTenpai(hand, melds);
}
