import { Router, type IRouter } from "express";
import { createRoom, joinRoom, getRoomByCode } from "../lib/rooms.js";

const router: IRouter = Router();

// POST /api/rooms — create a room (HTTP fallback, WS is preferred)
router.post("/rooms", (req, res) => {
  const { playerName } = req.body as { playerName?: string };
  if (!playerName) { res.status(400).json({ error: "playerName required" }); return; }
  const playerId = Math.random().toString(36).slice(2, 12);
  const room = createRoom(String(playerName), playerId);
  res.json({ roomId: room.id, code: room.code, playerId, players: room.players });
});

// POST /api/rooms/:code/join
router.post("/rooms/:code/join", (req, res) => {
  const { playerName } = req.body as { playerName?: string };
  if (!playerName) { res.status(400).json({ error: "playerName required" }); return; }
  const playerId = Math.random().toString(36).slice(2, 12);
  const room = joinRoom(req.params.code, String(playerName), playerId);
  if (!room) { res.status(404).json({ error: "Room not found or full" }); return; }
  res.json({ roomId: room.id, code: room.code, playerId, players: room.players });
});

// GET /api/rooms/:code
router.get("/rooms/:code", (req, res) => {
  const room = getRoomByCode(req.params.code);
  if (!room) { res.status(404).json({ error: "Room not found" }); return; }
  res.json({ roomId: room.id, code: room.code, players: room.players, phase: room.phase });
});

export default router;
