import React, { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react';
import { WS_URL } from '../constants/api';
import { GameState } from '../store/gameStore';

export interface RoomPlayer {
  id: string;
  name: string;
  isHost: boolean;
  isReady: boolean;
  seatIndex: number;
}

export type MultiplayerPhase = 'idle' | 'connecting' | 'lobby' | 'playing' | 'disconnected';

interface MultiplayerState {
  phase: MultiplayerPhase;
  roomId: string | null;
  roomCode: string | null;
  playerId: string | null;
  players: RoomPlayer[];
  remoteGameState: GameState | null;
  error: string | null;

  createRoom: (playerName: string) => void;
  joinRoom: (code: string, playerName: string) => void;
  setReady: (ready: boolean) => void;
  startGame: () => void;
  syncState: (state: GameState) => void;
  sendAction: (action: unknown) => void;
  disconnect: () => void;

  isHost: boolean;
  mySeatIndex: number;
}

const MultiplayerContext = createContext<MultiplayerState | null>(null);

export function MultiplayerProvider({ children }: { children: React.ReactNode }) {
  const wsRef = useRef<WebSocket | null>(null);
  const [phase, setPhase] = useState<MultiplayerPhase>('idle');
  const [roomId, setRoomId] = useState<string | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [remoteGameState, setRemoteGameState] = useState<GameState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const send = useCallback((msg: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  const connect = useCallback((onOpen: (ws: WebSocket) => void) => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setPhase('connecting');
    setError(null);

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => onOpen(ws);

    ws.onmessage = (event) => {
      let msg: { type: string; [k: string]: unknown };
      try { msg = JSON.parse(String(event.data)); }
      catch { return; }

      if (msg.type === 'room_joined') {
        setRoomId(String(msg.roomId));
        setRoomCode(String(msg.code));
        setPlayerId(String(msg.playerId));
        setPlayers((msg.players as RoomPlayer[]) ?? []);
        setPhase('lobby');
      } else if (msg.type === 'room_update') {
        setPlayers((msg.players as RoomPlayer[]) ?? []);
      } else if (msg.type === 'game_started') {
        setPlayers((msg.players as RoomPlayer[]) ?? []);
        setPhase('playing');
      } else if (msg.type === 'game_state') {
        setRemoteGameState(msg.state as GameState);
      } else if (msg.type === 'error') {
        setError(String(msg.message));
        setPhase('idle');
      }
    };

    ws.onclose = () => {
      setPhase(p => p === 'idle' ? 'idle' : 'disconnected');
    };

    ws.onerror = () => {
      setError('Connection failed. Check your internet connection.');
      setPhase('disconnected');
    };
  }, []);

  const createRoom = useCallback((playerName: string) => {
    connect(ws => {
      ws.send(JSON.stringify({ type: 'create_room', playerName }));
    });
  }, [connect]);

  const joinRoom = useCallback((code: string, playerName: string) => {
    connect(ws => {
      ws.send(JSON.stringify({ type: 'join_room', code, playerName }));
    });
  }, [connect]);

  const setReady = useCallback((ready: boolean) => {
    send({ type: 'set_ready', ready });
  }, [send]);

  const startGame = useCallback(() => {
    send({ type: 'start_game' });
  }, [send]);

  const syncState = useCallback((state: GameState) => {
    send({ type: 'sync_state', state });
  }, [send]);

  const sendAction = useCallback((action: unknown) => {
    send({ type: 'game_action', action });
  }, [send]);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    setPhase('idle');
    setRoomId(null);
    setRoomCode(null);
    setPlayerId(null);
    setPlayers([]);
    setRemoteGameState(null);
    setError(null);
  }, []);

  useEffect(() => () => { wsRef.current?.close(); }, []);

  const myPlayer = players.find(p => p.id === playerId);
  const isHost = myPlayer?.isHost ?? false;
  const mySeatIndex = myPlayer?.seatIndex ?? 0;

  return (
    <MultiplayerContext.Provider value={{
      phase, roomId, roomCode, playerId, players, remoteGameState, error,
      createRoom, joinRoom, setReady, startGame, syncState, sendAction, disconnect,
      isHost, mySeatIndex,
    }}>
      {children}
    </MultiplayerContext.Provider>
  );
}

export function useMultiplayer() {
  const ctx = useContext(MultiplayerContext);
  if (!ctx) throw new Error('useMultiplayer must be inside MultiplayerProvider');
  return ctx;
}
