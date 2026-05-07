import { WebSocket } from 'ws';

export interface RoomPlayer {
  id: string;
  name: string;
  isHost: boolean;
  isReady: boolean;
  seatIndex: number;
}

export interface Room {
  id: string;
  code: string;
  players: RoomPlayer[];
  phase: 'waiting' | 'playing' | 'ended';
  gameState: unknown;
  createdAt: number;
  connections: Map<string, WebSocket>; // playerId → ws
}

const rooms = new Map<string, Room>();
const codeToId = new Map<string, string>();

function genId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function genCode(): string {
  let code: string;
  do {
    code = Math.random().toString(36).slice(2, 8).toUpperCase();
  } while (codeToId.has(code));
  return code;
}

export function createRoom(hostName: string, hostId: string): Room {
  const id = genId();
  const code = genCode();
  const host: RoomPlayer = { id: hostId, name: hostName, isHost: true, isReady: true, seatIndex: 0 };
  const room: Room = {
    id, code, players: [host],
    phase: 'waiting', gameState: null,
    createdAt: Date.now(), connections: new Map(),
  };
  rooms.set(id, room);
  codeToId.set(code, id);
  return room;
}

export function joinRoom(code: string, playerName: string, playerId: string): Room | null {
  const id = codeToId.get(code.toUpperCase());
  if (!id) return null;
  const room = rooms.get(id);
  if (!room || room.phase !== 'waiting') return null;
  if (room.players.length >= 4) return null;
  if (room.players.find(p => p.id === playerId)) return room; // already in
  const seatIndex = room.players.length;
  room.players.push({ id: playerId, name: playerName, isHost: false, isReady: false, seatIndex });
  return room;
}

export function getRoom(id: string): Room | undefined {
  return rooms.get(id);
}

export function getRoomByCode(code: string): Room | undefined {
  const id = codeToId.get(code.toUpperCase());
  return id ? rooms.get(id) : undefined;
}

export function removePlayer(roomId: string, playerId: string): Room | null {
  const room = rooms.get(roomId);
  if (!room) return null;
  room.connections.delete(playerId);
  room.players = room.players.filter(p => p.id !== playerId);
  if (room.players.length === 0) {
    rooms.delete(roomId);
    codeToId.delete(room.code);
    return null;
  }
  // If host left, promote next player
  if (!room.players.find(p => p.isHost)) {
    room.players[0].isHost = true;
    room.players[0].isReady = true;
  }
  // Reassign seat indices
  room.players.forEach((p, i) => { p.seatIndex = i; });
  return room;
}

export function broadcastRoom(room: Room, msg: unknown, excludeId?: string) {
  const payload = JSON.stringify(msg);
  room.connections.forEach((ws, playerId) => {
    if (playerId !== excludeId && ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  });
}

export function broadcast(room: Room, msg: unknown) {
  broadcastRoom(room, msg);
}

export function setReady(roomId: string, playerId: string, ready: boolean) {
  const room = rooms.get(roomId);
  if (!room) return;
  const player = room.players.find(p => p.id === playerId);
  if (player) player.isReady = ready;
}

// Clean up stale rooms every 30 minutes
setInterval(() => {
  const cutoff = Date.now() - 30 * 60 * 1000;
  rooms.forEach((room, id) => {
    if (room.createdAt < cutoff) {
      rooms.delete(id);
      codeToId.delete(room.code);
    }
  });
}, 30 * 60 * 1000);
