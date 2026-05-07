import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage, Server } from 'http';
import {
  createRoom, joinRoom, getRoom, getRoomByCode,
  removePlayer, broadcast, broadcastRoom, setReady,
} from './rooms.js';

function genPlayerId(): string {
  return Math.random().toString(36).slice(2, 12);
}

interface WsClient extends WebSocket {
  playerId?: string;
  roomId?: string;
}

export function attachWss(server: Server) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: WsClient, _req: IncomingMessage) => {
    ws.playerId = genPlayerId();

    ws.on('message', (data) => {
      let msg: { type: string; [k: string]: unknown };
      try { msg = JSON.parse(data.toString()); }
      catch { return; }

      const { type } = msg;
      const playerId = ws.playerId!;

      if (type === 'create_room') {
        const playerName = String(msg.playerName ?? 'Player');
        const room = createRoom(playerName, playerId);
        room.connections.set(playerId, ws);
        ws.roomId = room.id;
        ws.send(JSON.stringify({ type: 'room_joined', roomId: room.id, code: room.code, playerId, players: room.players }));
        return;
      }

      if (type === 'join_room') {
        const code = String(msg.code ?? '');
        const playerName = String(msg.playerName ?? 'Player');
        const room = joinRoom(code, playerName, playerId);
        if (!room) {
          ws.send(JSON.stringify({ type: 'error', message: 'Room not found or full' }));
          return;
        }
        room.connections.set(playerId, ws);
        ws.roomId = room.id;
        ws.send(JSON.stringify({ type: 'room_joined', roomId: room.id, code: room.code, playerId, players: room.players }));
        broadcastRoom(room, { type: 'room_update', players: room.players }, playerId);
        return;
      }

      if (type === 'set_ready') {
        if (!ws.roomId) return;
        setReady(ws.roomId, playerId, Boolean(msg.ready));
        const room = getRoom(ws.roomId);
        if (room) broadcast(room, { type: 'room_update', players: room.players });
        return;
      }

      if (type === 'start_game') {
        if (!ws.roomId) return;
        const room = getRoom(ws.roomId);
        if (!room) return;
        const host = room.players.find(p => p.id === playerId);
        if (!host?.isHost) return;
        room.phase = 'playing';
        broadcast(room, { type: 'game_started', players: room.players });
        return;
      }

      if (type === 'sync_state') {
        // Host broadcasts game state to all other players
        if (!ws.roomId) return;
        const room = getRoom(ws.roomId);
        if (!room) return;
        room.gameState = msg.state;
        broadcastRoom(room, { type: 'game_state', state: msg.state }, playerId);
        return;
      }

      if (type === 'game_action') {
        // Non-host sends action, server forwards to host
        if (!ws.roomId) return;
        const room = getRoom(ws.roomId);
        if (!room) return;
        const host = room.players.find(p => p.isHost);
        if (!host) return;
        const hostWs = room.connections.get(host.id);
        if (hostWs?.readyState === WebSocket.OPEN) {
          hostWs.send(JSON.stringify({ type: 'game_action', action: msg.action, fromPlayerId: playerId, fromSeatIndex: room.players.find(p => p.id === playerId)?.seatIndex }));
        }
        return;
      }
    });

    ws.on('close', () => {
      const playerId = ws.playerId!;
      const roomId = ws.roomId;
      if (!roomId) return;
      const room = removePlayer(roomId, playerId);
      if (room) broadcast(room, { type: 'room_update', players: room.players });
    });

    ws.on('error', () => {
      if (ws.roomId && ws.playerId) removePlayer(ws.roomId, ws.playerId);
    });
  });

  return wss;
}
