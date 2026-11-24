import { Redis } from '@upstash/redis';
import type { ServerLeaderboardEntry, ServerLiveRoom } from './types.js';

const ROOM_TTL_SECONDS = 60 * 60 * 6; // Expire inactive rooms after 6 hours
const ROOM_KEY_PREFIX = 'tilt:room:';
const PUBLIC_ROOMS_SET_KEY = 'tilt:public_rooms';
const LEADERBOARD_HASH_KEY = 'tilt:leaderboard';

let redisClient: Redis | null | undefined;

function getRedisCredentials(): { url: string; token: string } | null {
  const url =
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.KV_REST_API_URL ||
    process.env.REDIS_REST_URL ||
    '';
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.KV_REST_API_TOKEN ||
    process.env.REDIS_REST_TOKEN ||
    '';
  if (!url || !token) return null;
  return { url, token };
}

export function isRedisConfigured(): boolean {
  return getRedisCredentials() !== null;
}

export function isVercelProductionWithoutRedis(): boolean {
  return Boolean(process.env.VERCEL) && !isRedisConfigured();
}

function getRedis(): Redis | null {
  if (redisClient !== undefined) return redisClient;
  const creds = getRedisCredentials();
  if (!creds) {
    redisClient = null;
    return null;
  }
  redisClient = new Redis({ url: creds.url, token: creds.token });
  return redisClient;
}

// Local development fallback store (only used when running locally without Redis env vars; starts 100% empty)
const devRooms = new Map<string, ServerLiveRoom>();
const devLeaderboard = new Map<string, ServerLeaderboardEntry>();

export async function getStoredRoom(code: string): Promise<ServerLiveRoom | null> {
  const redis = getRedis();
  if (redis) {
    const room = await redis.get<ServerLiveRoom>(`${ROOM_KEY_PREFIX}${code}`);
    return room ?? null;
  }
  return devRooms.get(code) ?? null;
}

export async function saveStoredRoom(room: ServerLiveRoom): Promise<void> {
  const redis = getRedis();
  if (redis) {
    await redis.set(`${ROOM_KEY_PREFIX}${room.code}`, room, { ex: ROOM_TTL_SECONDS });
    if (room.visibility === 'public' && room.status !== 'finished') {
      await redis.sadd(PUBLIC_ROOMS_SET_KEY, room.code);
    } else {
      await redis.srem(PUBLIC_ROOMS_SET_KEY, room.code);
    }
    return;
  }
  devRooms.set(room.code, room);
}

export async function listStoredPublicRooms(): Promise<ServerLiveRoom[]> {
  const redis = getRedis();
  if (redis) {
    const codes = await redis.smembers<string[]>(PUBLIC_ROOMS_SET_KEY);
    if (!codes || codes.length === 0) return [];

    const keys = codes.map((c) => `${ROOM_KEY_PREFIX}${c}`);
    const results = await redis.mget<(ServerLiveRoom | null)[]>(...keys);
    const active: ServerLiveRoom[] = [];
    const staleCodes: string[] = [];

    results.forEach((room, idx) => {
      if (!room || room.visibility !== 'public' || room.status === 'finished') {
        staleCodes.push(codes[idx]);
      } else {
        active.push(room);
      }
    });

    if (staleCodes.length > 0) {
      await redis.srem(PUBLIC_ROOMS_SET_KEY, ...staleCodes);
    }

    return active.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  return Array.from(devRooms.values())
    .filter((r) => r.visibility === 'public' && r.status !== 'finished')
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function listStoredLeaderboard(): Promise<ServerLeaderboardEntry[]> {
  const redis = getRedis();
  if (redis) {
    const raw = await redis.hgetall<Record<string, ServerLeaderboardEntry | string>>(
      LEADERBOARD_HASH_KEY
    );
    if (!raw) return [];
    const entries: ServerLeaderboardEntry[] = [];
    for (const val of Object.values(raw)) {
      if (!val) continue;
      if (typeof val === 'string') {
        try {
          entries.push(JSON.parse(val) as ServerLeaderboardEntry);
        } catch {
          // Skip malformed entries
        }
      } else {
        entries.push(val);
      }
    }
    return entries.sort((a, b) => b.bestScore - a.bestScore || b.wins - a.wins).slice(0, 100);
  }

  return Array.from(devLeaderboard.values())
    .sort((a, b) => b.bestScore - a.bestScore || b.wins - a.wins)
    .slice(0, 100);
}

export async function upsertStoredLeaderboardEntry(
  incoming: ServerLeaderboardEntry
): Promise<ServerLeaderboardEntry> {
  const redis = getRedis();
  if (redis) {
    const existingRaw = await redis.hget<ServerLeaderboardEntry | string>(
      LEADERBOARD_HASH_KEY,
      incoming.id
    );
    let existing: ServerLeaderboardEntry | null = null;
    if (existingRaw) {
      existing =
        typeof existingRaw === 'string'
          ? (JSON.parse(existingRaw) as ServerLeaderboardEntry)
          : existingRaw;
    }

    const merged: ServerLeaderboardEntry = {
      id: incoming.id,
      callsign: incoming.callsign,
      region: incoming.region || existing?.region || 'Global',
      level: Math.max(incoming.level, existing?.level ?? 1),
      bestScore: Math.max(incoming.bestScore, existing?.bestScore ?? 0),
      wins: Math.max(incoming.wins, existing?.wins ?? 0),
      peakHeight: Math.max(incoming.peakHeight, existing?.peakHeight ?? 18),
      updatedAt: Date.now(),
    };

    await redis.hset(LEADERBOARD_HASH_KEY, { [merged.id]: merged });
    return merged;
  }

  const existing = devLeaderboard.get(incoming.id);
  const merged: ServerLeaderboardEntry = {
    id: incoming.id,
    callsign: incoming.callsign,
    region: incoming.region || existing?.region || 'Global',
    level: Math.max(incoming.level, existing?.level ?? 1),
    bestScore: Math.max(incoming.bestScore, existing?.bestScore ?? 0),
    wins: Math.max(incoming.wins, existing?.wins ?? 0),
    peakHeight: Math.max(incoming.peakHeight, existing?.peakHeight ?? 18),
    updatedAt: Date.now(),
  };
  devLeaderboard.set(merged.id, merged);
  return merged;
}
