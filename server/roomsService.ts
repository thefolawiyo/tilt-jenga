import {
  getStoredRoom,
  isRedisConfigured,
  isVercelProductionWithoutRedis,
  listStoredPublicRooms,
  saveStoredRoom,
} from './storage';
import type { ServerLivePlayer, ServerLiveRoom, ServerRoomMode, ServiceResult } from './types';

const PLAYER_COLORS = ['#64E5D2', '#FF9B65', '#8581FF', '#F5D061'];

function makeCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 6; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export function cleanRoomCode(raw: string): string {
  return String(raw || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 8);
}

function getNextActivePlayerIndex(players: ServerLivePlayer[], fromIdx: number): number {
  const n = players.length;
  if (n === 0) return 0;
  for (let step = 1; step <= n; step++) {
    const idx = (fromIdx + step) % n;
    if (!players[idx]?.eliminated) return idx;
  }
  return fromIdx;
}

function getFirstActivePlayerIndex(players: ServerLivePlayer[]): number {
  const idx = players.findIndex((p) => !p.eliminated);
  return idx >= 0 ? idx : 0;
}

function redisNotConfiguredError(): ServiceResult {
  return {
    status: 503,
    data: {
      error:
        'Live Multiplayer storage (Upstash Redis) is not connected yet. Connect Upstash Redis in Vercel Marketplace and redeploy.',
    },
  };
}

export async function handleListPublicRooms(): Promise<ServiceResult> {
  if (isVercelProductionWithoutRedis()) {
    return {
      status: 200,
      data: { rooms: [], storageConfigured: false },
    };
  }
  const rooms = await listStoredPublicRooms();
  return {
    status: 200,
    data: { rooms, storageConfigured: isRedisConfigured() || !process.env.VERCEL },
  };
}

export async function handleCreateRoom(body: Record<string, unknown>): Promise<ServiceResult> {
  if (isVercelProductionWithoutRedis()) {
    return redisNotConfiguredError();
  }

  let code = makeCode();
  for (let attempts = 0; attempts < 5; attempts++) {
    const existing = await getStoredRoom(code);
    if (!existing) break;
    code = makeCode();
  }

  const hostId = String(body.playerId || `p-${Date.now()}`).slice(0, 48);
  const hostName = String(body.playerName || 'Host').trim().slice(0, 18) || 'Host';
  const roomName =
    String(body.roomName || `${hostName}'s Ring`)
      .trim()
      .slice(0, 32) || `${hostName}'s Ring`;
  const mode: ServerRoomMode = ['classic', 'blitz', 'precarious'].includes(String(body.mode))
    ? (String(body.mode) as ServerRoomMode)
    : 'classic';
  const visibility = body.visibility === 'private' ? 'private' : 'public';
  const maxPlayers = ([2, 3, 4].includes(Number(body.maxPlayers)) ? Number(body.maxPlayers) : 4) as
    | 2
    | 3
    | 4;

  const now = Date.now();
  const room: ServerLiveRoom = {
    code,
    name: roomName,
    mode,
    visibility,
    maxPlayers,
    status: 'waiting',
    seed: Math.floor(Math.random() * 900000) + 100000,
    roundNumber: 1,
    players: [
      {
        id: hostId,
        name: hostName,
        color: PLAYER_COLORS[0],
        isHost: true,
        isAI: false,
        moves: 0,
        score: 0,
        eliminated: false,
      },
    ],
    currentPlayerIndex: 0,
    moves: [],
    loserPlayerIndex: null,
    eliminatedThisRoundIndex: null,
    winnerPlayerIndex: null,
    createdAt: now,
    updatedAt: now,
  };

  await saveStoredRoom(room);
  return { status: 201, data: { room } };
}

export async function handleGetRoom(rawCode: string): Promise<ServiceResult> {
  if (isVercelProductionWithoutRedis()) {
    return redisNotConfiguredError();
  }
  const code = cleanRoomCode(rawCode);
  const room = await getStoredRoom(code);
  if (!room) {
    return {
      status: 404,
      data: { error: 'Live match room not found. Check the room code and try again.' },
    };
  }
  return { status: 200, data: { room } };
}

export async function handleJoinRoom(
  rawCode: string,
  body: Record<string, unknown>
): Promise<ServiceResult> {
  if (isVercelProductionWithoutRedis()) {
    return redisNotConfiguredError();
  }
  const code = cleanRoomCode(rawCode);
  const room = await getStoredRoom(code);
  if (!room) {
    return {
      status: 404,
      data: { error: 'Live match room not found. Check the room code and try again.' },
    };
  }

  const playerId = String(body.playerId || `p-${Date.now()}`).slice(0, 48);
  const playerName = String(body.playerName || 'Challenger').trim().slice(0, 18) || 'Challenger';
  const isAI = Boolean(body.isAI);

  const existing = room.players.find((p) => p.id === playerId);
  if (existing) {
    existing.name = playerName;
    room.updatedAt = Date.now();
    await saveStoredRoom(room);
    return { status: 200, data: { room } };
  }

  if (room.players.length >= room.maxPlayers) {
    return {
      status: 409,
      data: { error: `This live match is full (${room.maxPlayers}/${room.maxPlayers} players).` },
    };
  }
  if (room.status === 'finished') {
    return { status: 409, data: { error: 'This match has already ended.' } };
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
    eliminated: false,
  });
  room.updatedAt = Date.now();
  await saveStoredRoom(room);
  return { status: 200, data: { room } };
}

export async function handleStartRoom(
  rawCode: string,
  body: Record<string, unknown>
): Promise<ServiceResult> {
  if (isVercelProductionWithoutRedis()) {
    return redisNotConfiguredError();
  }
  const code = cleanRoomCode(rawCode);
  const room = await getStoredRoom(code);
  if (!room) {
    return { status: 404, data: { error: 'Live match room not found.' } };
  }

  if (body.fillWithBot && room.players.length < 2) {
    room.players.push({
      id: `bot-${Date.now()}`,
      name: 'Ring Bot',
      color: PLAYER_COLORS[room.players.length % PLAYER_COLORS.length],
      isHost: false,
      isAI: true,
      moves: 0,
      score: 0,
      eliminated: false,
    });
  }

  if (room.players.length < 2) {
    return { status: 400, data: { error: 'Need at least 2 players to start a live match.' } };
  }

  room.status = 'playing';
  room.roundNumber = 1;
  room.seed = Math.floor(Math.random() * 900000) + 100000;
  room.currentPlayerIndex = 0;
  room.moves = [];
  room.loserPlayerIndex = null;
  room.eliminatedThisRoundIndex = null;
  room.winnerPlayerIndex = null;
  room.players.forEach((p) => {
    p.moves = 0;
    p.score = 0;
    p.eliminated = false;
    delete p.eliminatedRound;
  });
  room.updatedAt = Date.now();
  await saveStoredRoom(room);
  return { status: 200, data: { room } };
}

export async function handleSubmitMove(
  rawCode: string,
  body: Record<string, unknown>
): Promise<ServiceResult> {
  if (isVercelProductionWithoutRedis()) {
    return redisNotConfiguredError();
  }
  const code = cleanRoomCode(rawCode);
  const room = await getStoredRoom(code);
  if (!room) {
    return { status: 404, data: { error: 'Live match room not found.' } };
  }

  const seq = room.moves.length + 1;
  const moverIdx = room.currentPlayerIndex;
  const mover = room.players[moverIdx];
  if (mover) {
    const pts = Math.max(0, Math.min(2000, Number(body.points) || 120));
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

  room.currentPlayerIndex = getNextActivePlayerIndex(room.players, moverIdx);
  room.updatedAt = Date.now();
  await saveStoredRoom(room);
  return { status: 200, data: { room } };
}

export async function handleCollapseRoom(
  rawCode: string,
  body: Record<string, unknown>
): Promise<ServiceResult> {
  if (isVercelProductionWithoutRedis()) {
    return redisNotConfiguredError();
  }
  const code = cleanRoomCode(rawCode);
  const room = await getStoredRoom(code);
  if (!room) {
    return { status: 404, data: { error: 'Live match room not found.' } };
  }

  const loserIdx =
    typeof body.loserPlayerIndex === 'number' &&
    body.loserPlayerIndex >= 0 &&
    body.loserPlayerIndex < room.players.length
      ? body.loserPlayerIndex
      : room.currentPlayerIndex;

  if (room.players[loserIdx]) {
    room.players[loserIdx].eliminated = true;
    room.players[loserIdx].eliminatedRound = room.roundNumber || 1;
  }

  const remaining = room.players
    .map((p, idx) => ({ p, idx }))
    .filter(({ p }) => !p.eliminated);

  room.loserPlayerIndex = loserIdx;
  room.eliminatedThisRoundIndex = loserIdx;

  if (remaining.length > 1) {
    // 3–4 player elimination match: keep tournament open for next round!
    room.status = 'round_over';
    room.winnerPlayerIndex = null;
  } else {
    room.status = 'finished';
    room.winnerPlayerIndex = remaining[0]?.idx ?? null;
  }

  room.updatedAt = Date.now();
  await saveStoredRoom(room);
  return { status: 200, data: { room } };
}

export async function handleNextRoundRoom(rawCode: string): Promise<ServiceResult> {
  if (isVercelProductionWithoutRedis()) {
    return redisNotConfiguredError();
  }
  const code = cleanRoomCode(rawCode);
  const room = await getStoredRoom(code);
  if (!room) {
    return { status: 404, data: { error: 'Live match room not found.' } };
  }

  const remaining = room.players.filter((p) => !p.eliminated);
  if (remaining.length <= 1) {
    room.status = 'finished';
    room.updatedAt = Date.now();
    await saveStoredRoom(room);
    return { status: 200, data: { room } };
  }

  room.roundNumber = (room.roundNumber || 1) + 1;
  room.seed = Math.floor(Math.random() * 900000) + 100000;
  room.status = 'playing';
  room.moves = [];
  room.loserPlayerIndex = null;
  room.eliminatedThisRoundIndex = null;
  room.winnerPlayerIndex = null;
  room.currentPlayerIndex = getFirstActivePlayerIndex(room.players);
  room.updatedAt = Date.now();
  await saveStoredRoom(room);
  return { status: 200, data: { room } };
}
