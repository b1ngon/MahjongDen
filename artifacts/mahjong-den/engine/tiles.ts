export type Suit = 'man' | 'pin' | 'sou' | 'wind' | 'dragon';

export interface Tile {
  suit: Suit;
  number: number; // 1-9 for man/pin/sou; 1-4 for wind (E/S/W/N); 1-3 for dragon (haku/hatsu/chun)
  id: number;     // unique index 0-135
}

export interface Meld {
  type: 'chi' | 'pon' | 'kan' | 'ankan';
  tiles: Tile[];
  fromPlayer?: number;
  calledTile?: Tile;
}

// ─── Display helpers ────────────────────────────────────────────────────────

export const WIND_CHARS = ['東', '南', '西', '北'];    // 1=East 2=South 3=West 4=North
export const DRAGON_CHARS = ['白', '發', '中'];         // 1=Haku 2=Hatsu 3=Chun
export const SUIT_CHARS: Record<string, string> = { man: '万', pin: '饼', sou: '索' };

export function tileLabel(tile: Tile): string {
  if (tile.suit === 'wind')   return WIND_CHARS[tile.number - 1];
  if (tile.suit === 'dragon') return DRAGON_CHARS[tile.number - 1];
  return `${tile.number}`;
}

export function tileSuitLabel(tile: Tile): string {
  if (tile.suit === 'wind' || tile.suit === 'dragon') return '';
  return SUIT_CHARS[tile.suit];
}

export function tileKey(tile: Tile): string {
  return `${tile.suit}-${tile.number}`;
}

export function sameTileType(a: Tile, b: Tile): boolean {
  return a.suit === b.suit && a.number === b.number;
}

export function compareTiles(a: Tile, b: Tile): number {
  const order: Record<Suit, number> = { man: 0, pin: 1, sou: 2, wind: 3, dragon: 4 };
  if (a.suit !== b.suit) return order[a.suit] - order[b.suit];
  return a.number - b.number;
}

export function isHonor(tile: Tile): boolean {
  return tile.suit === 'wind' || tile.suit === 'dragon';
}

export function isTerminal(tile: Tile): boolean {
  if (isHonor(tile)) return true;
  return tile.number === 1 || tile.number === 9;
}

// ─── Tileset creation ────────────────────────────────────────────────────────

export function createTileset(): Tile[] {
  const tiles: Tile[] = [];
  let id = 0;
  for (let copy = 0; copy < 4; copy++) {
    for (let n = 1; n <= 9; n++) tiles.push({ suit: 'man',    number: n, id: id++ });
    for (let n = 1; n <= 9; n++) tiles.push({ suit: 'pin',    number: n, id: id++ });
    for (let n = 1; n <= 9; n++) tiles.push({ suit: 'sou',    number: n, id: id++ });
    for (let n = 1; n <= 4; n++) tiles.push({ suit: 'wind',   number: n, id: id++ });
    for (let n = 1; n <= 3; n++) tiles.push({ suit: 'dragon', number: n, id: id++ });
  }
  return tiles; // 136 tiles
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
