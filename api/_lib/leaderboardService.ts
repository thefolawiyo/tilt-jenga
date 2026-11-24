import {
  isRedisConfigured,
  isVercelProductionWithoutRedis,
  listStoredLeaderboard,
  upsertStoredLeaderboardEntry,
} from './storage.js';
import type { ServerLeaderboardEntry, ServiceResult } from './types.js';

export async function handleGetLeaderboard(): Promise<ServiceResult> {
  if (isVercelProductionWithoutRedis()) {
    return {
      status: 200,
      data: { entries: [], storageConfigured: false },
    };
  }
  const entries = await listStoredLeaderboard();
  return {
    status: 200,
    data: {
      entries,
      storageConfigured: isRedisConfigured() || !process.env.VERCEL,
    },
  };
}

export async function handleUpsertLeaderboard(
  body: Record<string, unknown>
): Promise<ServiceResult> {
  if (isVercelProductionWithoutRedis()) {
    return {
      status: 503,
      data: {
        error:
          'Global leaderboard storage (Upstash Redis) is not connected yet. Connect Upstash Redis in Vercel Marketplace and redeploy.',
      },
    };
  }

  const id = String(body.id || '').trim().slice(0, 48);
  const callsign = String(body.callsign || '').trim().slice(0, 18);
  if (!id || !callsign) {
    return { status: 400, data: { error: 'Both id and callsign are required.' } };
  }

  const entry: ServerLeaderboardEntry = {
    id,
    callsign,
    region: String(body.region || 'Global').trim().slice(0, 24) || 'Global',
    level: Math.max(1, Math.min(999, Math.floor(Number(body.level) || 1))),
    bestScore: Math.max(0, Math.min(1000000, Math.floor(Number(body.bestScore) || 0))),
    wins: Math.max(0, Math.min(100000, Math.floor(Number(body.wins) || 0))),
    peakHeight: Math.max(18, Math.min(200, Math.floor(Number(body.peakHeight) || 18))),
    updatedAt: Date.now(),
  };

  const saved = await upsertStoredLeaderboardEntry(entry);
  return { status: 200, data: { entry: saved } };
}
