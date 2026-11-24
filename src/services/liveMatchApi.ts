import { LiveRoom, LiveRoomMode } from '../types/game';

/**
 * Extracts a clean 6-char room code whether the user typed `LAGOS4`
 * or pasted a full shareable URL like `http://localhost:5173/?join=LAGOS4`.
 */
export function extractRoomCode(rawInput: string): string {
  const trimmed = rawInput.trim();
  const match = trimmed.match(/[?&]join=([a-zA-Z0-9_-]+)/i);
  if (match && match[1]) {
    return match[1].toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
  }
  return trimmed.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
}

export function buildInviteLink(code: string): string {
  if (typeof window === 'undefined') return `?join=${code}`;
  return `${window.location.origin}/?join=${code}`;
}

async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

export const liveMatchApi = {
  async listPublicRooms(): Promise<LiveRoom[]> {
    const data = await apiJson<{ rooms: LiveRoom[] }>('/api/rooms');
    return data.rooms ?? [];
  },

  async createRoom(payload: {
    playerId: string;
    playerName: string;
    roomName: string;
    mode: LiveRoomMode;
    visibility: 'public' | 'private';
    maxPlayers: 2 | 3 | 4;
  }): Promise<LiveRoom> {
    const data = await apiJson<{ room: LiveRoom }>('/api/rooms', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return data.room;
  },

  async getRoom(code: string): Promise<LiveRoom> {
    const clean = extractRoomCode(code);
    const data = await apiJson<{ room: LiveRoom }>(`/api/rooms/${clean}`);
    return data.room;
  },

  async joinRoom(
    code: string,
    payload: { playerId: string; playerName: string; isAI?: boolean }
  ): Promise<LiveRoom> {
    const clean = extractRoomCode(code);
    const data = await apiJson<{ room: LiveRoom }>(`/api/rooms/${clean}/join`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return data.room;
  },

  async startRoom(code: string, fillWithBot = false): Promise<LiveRoom> {
    const clean = extractRoomCode(code);
    const data = await apiJson<{ room: LiveRoom }>(`/api/rooms/${clean}/start`, {
      method: 'POST',
      body: JSON.stringify({ fillWithBot }),
    });
    return data.room;
  },

  async submitMove(
    code: string,
    payload: {
      playerId: string;
      playerName: string;
      playerColor: string;
      blockId: string;
      fromLevel: number;
      fromSlot: -1 | 0 | 1;
      toLevel: number;
      toSlot: -1 | 0 | 1;
      points: number;
    }
  ): Promise<LiveRoom> {
    const clean = extractRoomCode(code);
    const data = await apiJson<{ room: LiveRoom }>(`/api/rooms/${clean}/move`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return data.room;
  },

  async reportCollapse(code: string, loserPlayerIndex: number): Promise<LiveRoom> {
    const clean = extractRoomCode(code);
    const data = await apiJson<{ room: LiveRoom }>(`/api/rooms/${clean}/collapse`, {
      method: 'POST',
      body: JSON.stringify({ loserPlayerIndex }),
    });
    return data.room;
  },
};
