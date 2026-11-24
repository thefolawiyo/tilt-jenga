import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import type { IncomingMessage, ServerResponse } from 'http';

interface ServerLivePlayer {
  id: string;
  name: string;
  color: string;
  isHost: boolean;
  isAI?: boolean;
  moves: number;
  score: number;
}

interface ServerLiveMove {
  seq: number;
  playerId: string;
  playerName: string;
  playerColor: string;
  blockId: string;
  fromLevel: number;
  fromSlot: -1 | 0 | 1;
  toLevel: number;
  toSlot: -1 | 0 | 1;
  timestamp: number;
}

interface ServerLiveRoom {
  code: string;
  name: string;
  mode: 'classic' | 'blitz' | 'precarious';
  visibility: 'public' | 'private';
  maxPlayers: 2 | 3 | 4;
  status: 'waiting' | 'playing' | 'finished';
  seed: number;
  players: ServerLivePlayer[];
  currentPlayerIndex: number;
  moves: ServerLiveMove[];
  loserPlayerIndex: number | null;
  createdAt: number;
  updatedAt: number;
}

const PLAYER_COLORS = ['#64E5D2', '#FF9B65', '#8581FF', '#F5D061'];

function makeCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 6; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
    });
    req.on('end', () => {
      try {
        resolve(raw ? (JSON.parse(raw) as Record<string, unknown>) : {});
      } catch {
        resolve({});
      }
    });
  });
}

function sendJson(res: ServerResponse, status: number, data: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

function tiltLiveMatchPlugin(): Plugin {
  const rooms = new Map<string, ServerLiveRoom>();

  // Seed 3 vibrant public showcase arena matches so "Available Live Matches" is immediately lively & joinable
  const seedShowcaseRooms = () => {
    const now = Date.now();
    const presets: ServerLiveRoom[] = [
      {
        code: 'LAGOS4',
        name: 'Lagos Midnight Ring',
        mode: 'classic',
        visibility: 'public',
        maxPlayers: 4,
        status: 'waiting',
        seed: 202601,
        players: [
          { id: 'bot-amara', name: 'Amara', color: PLAYER_COLORS[0], isHost: true, isAI: true, moves: 0, score: 0 },
          { id: 'bot-tunde', name: 'Tunde', color: PLAYER_COLORS[1], isHost: false, isAI: true, moves: 0, score: 0 },
        ],
        currentPlayerIndex: 0,
        moves: [],
        loserPlayerIndex: null,
        createdAt: now - 120000,
        updatedAt: now,
      },
      {
        code: 'DUBAI9',
        name: 'Dubai Gold Championship',
        mode: 'precarious',
        visibility: 'public',
        maxPlayers: 4,
        status: 'waiting',
        seed: 202602,
        players: [
          { id: 'bot-tariq', name: 'Tariq', color: PLAYER_COLORS[0], isHost: true, isAI: true, moves: 0, score: 0 },
          { id: 'bot-layla', name: 'Layla', color: PLAYER_COLORS[1], isHost: false, isAI: true, moves: 0, score: 0 },
          { id: 'bot-zayd', name: 'Zayd', color: PLAYER_COLORS[2], isHost: false, isAI: true, moves: 0, score: 0 },
        ],
        currentPlayerIndex: 0,
        moves: [],
        loserPlayerIndex: null,
        createdAt: now - 90000,
        updatedAt: now,
      },
      {
        code: 'VEGAS7',
        name: 'Vegas Blitz Showdown',
        mode: 'blitz',
        visibility: 'public',
        maxPlayers: 4,
        status: 'waiting',
        seed: 202603,
        players: [
          { id: 'bot-maya', name: 'Maya', color: PLAYER_COLORS[0], isHost: true, isAI: true, moves: 0, score: 0 },
        ],
        currentPlayerIndex: 0,
        moves: [],
        loserPlayerIndex: null,
        createdAt: now - 45000,
        updatedAt: now,
      },
    ];

    for (const r of presets) {
      if (!rooms.has(r.code)) rooms.set(r.code, r);
    }
  };

  return {
    name: 'tilt-live-match-api',
    configureServer(server) {
      seedShowcaseRooms();

      server.middlewares.use(async (req, res, next) => {
        const url = req.url || '';
        if (!url.startsWith('/api/rooms')) return next();

        const pathOnly = url.split('?')[0];
        const parts = pathOnly.split('/').filter(Boolean); // ['api', 'rooms', code?, action?]

        // GET /api/rooms — list available public rooms
        if (req.method === 'GET' && parts.length === 2) {
          const list = Array.from(rooms.values())
            .filter((r) => r.visibility === 'public' && r.status !== 'finished')
            .sort((a, b) => b.updatedAt - a.updatedAt);
          return sendJson(res, 200, { rooms: list });
        }

        // POST /api/rooms — create a new live match room
        if (req.method === 'POST' && parts.length === 2) {
          const body = await readJsonBody(req);
          let code = makeCode();
          while (rooms.has(code)) code = makeCode();

          const hostId = String(body.playerId || `p-${Date.now()}`);
          const hostName = String(body.playerName || 'Host').trim().slice(0, 18) || 'Host';
          const roomName = String(body.roomName || `${hostName}'s Ring`).trim().slice(0, 32) || `${hostName}'s Ring`;
          const mode = (['classic', 'blitz', 'precarious'].includes(String(body.mode))
            ? String(body.mode)
            : 'classic') as ServerLiveRoom['mode'];
          const visibility = body.visibility === 'private' ? 'private' : 'public';
          const maxPlayers = ([2, 3, 4].includes(Number(body.maxPlayers))
            ? Number(body.maxPlayers)
            : 4) as 2 | 3 | 4;

          const now = Date.now();
          const room: ServerLiveRoom = {
            code,
            name: roomName,
            mode,
            visibility,
            maxPlayers,
            status: 'waiting',
            seed: Math.floor(Math.random() * 900000) + 100000,
            players: [
              {
                id: hostId,
                name: hostName,
                color: PLAYER_COLORS[0],
                isHost: true,
                isAI: false,
                moves: 0,
                score: 0,
              },
            ],
            currentPlayerIndex: 0,
            moves: [],
            loserPlayerIndex: null,
            createdAt: now,
            updatedAt: now,
          };
          rooms.set(code, room);
          return sendJson(res, 201, { room });
        }

        const code = (parts[2] || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
        const action = parts[3];
        const room = rooms.get(code);

        if (!room) {
          return sendJson(res, 404, { error: 'Live match room not found. Check the room code and try again.' });
        }

        // GET /api/rooms/:code
        if (req.method === 'GET' && parts.length === 3) {
          return sendJson(res, 200, { room });
        }

        // POST /api/rooms/:code/join
        if (req.method === 'POST' && action === 'join') {
          const body = await readJsonBody(req);
          const playerId = String(body.playerId || `p-${Date.now()}`);
          const playerName = String(body.playerName || 'Challenger').trim().slice(0, 18) || 'Challenger';
          const isAI = Boolean(body.isAI);

          const existing = room.players.find((p) => p.id === playerId);
          if (existing) {
            existing.name = playerName;
            room.updatedAt = Date.now();
            return sendJson(res, 200, { room });
          }

          if (room.players.length >= room.maxPlayers) {
            return sendJson(res, 409, { error: `This live match is full (${room.maxPlayers}/${room.maxPlayers} players).` });
          }
          if (room.status === 'finished') {
            return sendJson(res, 409, { error: 'This match has already ended.' });
          }

          const color = PLAYER_COLORS[room.players.length % PLAYER_COLORS.length];
          room.players.push({
            id: playerId,
            name: playerName,
            color,
            isHost: false,
            isAI,
            moves: 0,
            score: 0,
          });
          room.updatedAt = Date.now();
          return sendJson(res, 200, { room });
        }

        // POST /api/rooms/:code/start
        if (req.method === 'POST' && action === 'start') {
          const body = await readJsonBody(req);
          if (body.fillWithBot && room.players.length < 2) {
            room.players.push({
              id: `bot-${Date.now()}`,
              name: 'Ring Bot',
              color: PLAYER_COLORS[room.players.length % PLAYER_COLORS.length],
              isHost: false,
              isAI: true,
              moves: 0,
              score: 0,
            });
          }
          if (room.players.length < 2) {
            return sendJson(res, 400, { error: 'Need at least 2 players to start a live match.' });
          }
          room.status = 'playing';
          room.currentPlayerIndex = 0;
          room.moves = [];
          room.loserPlayerIndex = null;
          room.players.forEach((p) => {
            p.moves = 0;
            p.score = 0;
          });
          room.updatedAt = Date.now();
          return sendJson(res, 200, { room });
        }

        // POST /api/rooms/:code/move
        if (req.method === 'POST' && action === 'move') {
          const body = await readJsonBody(req);
          const seq = room.moves.length + 1;
          const moverIdx = room.currentPlayerIndex;
          const mover = room.players[moverIdx];
          if (mover) {
            const pts = Number(body.points) || 120;
            mover.moves += 1;
            mover.score += pts;
          }
          room.moves.push({
            seq,
            playerId: String(body.playerId || mover?.id || ''),
            playerName: String(body.playerName || mover?.name || 'Player'),
            playerColor: String(body.playerColor || mover?.color || PLAYER_COLORS[0]),
            blockId: String(body.blockId || ''),
            fromLevel: Number(body.fromLevel) || 0,
            fromSlot: (Number(body.fromSlot) || 0) as -1 | 0 | 1,
            toLevel: Number(body.toLevel) || 18,
            toSlot: (Number(body.toSlot) || 0) as -1 | 0 | 1,
            timestamp: Date.now(),
          });
          room.currentPlayerIndex = (room.currentPlayerIndex + 1) % room.players.length;
          room.updatedAt = Date.now();
          return sendJson(res, 200, { room });
        }

        // POST /api/rooms/:code/collapse
        if (req.method === 'POST' && action === 'collapse') {
          const body = await readJsonBody(req);
          room.status = 'finished';
          room.loserPlayerIndex =
            typeof body.loserPlayerIndex === 'number'
              ? body.loserPlayerIndex
              : room.currentPlayerIndex;
          room.updatedAt = Date.now();
          return sendJson(res, 200, { room });
        }

        return next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tiltLiveMatchPlugin()],
  optimizeDeps: {
    exclude: ['@dimforge/rapier3d-compat'],
  },
  server: {
    port: 5173,
    host: true,
  },
});
