export type ServerRoomMode = 'classic' | 'blitz' | 'precarious';

export interface ServerLivePlayer {
  id: string;
  name: string;
  color: string;
  isHost: boolean;
  isAI?: boolean;
  moves: number;
  score: number;
  eliminated?: boolean;
  eliminatedRound?: number;
}

export interface ServerLiveMove {
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

export interface ServerLiveRoom {
  code: string;
  name: string;
  mode: ServerRoomMode;
  visibility: 'public' | 'private';
  maxPlayers: 2 | 3 | 4;
  status: 'waiting' | 'playing' | 'round_over' | 'finished';
  seed: number;
  roundNumber: number;
  players: ServerLivePlayer[];
  currentPlayerIndex: number;
  moves: ServerLiveMove[];
  loserPlayerIndex: number | null;
  eliminatedThisRoundIndex: number | null;
  winnerPlayerIndex: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface ServerLeaderboardEntry {
  id: string;
  callsign: string;
  region: string;
  level: number;
  bestScore: number;
  wins: number;
  peakHeight: number;
  updatedAt: number;
}

export interface ServiceResult<T = unknown> {
  status: number;
  data: T;
}
