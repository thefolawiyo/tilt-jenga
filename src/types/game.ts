export type ScreenType =
  | 'menu'
  | 'modeSelect'
  | 'sceneSelect'
  | 'leaderboard'
  | 'career'
  | 'createLive'
  | 'joinLive'
  | 'liveLobby'
  | 'playing';

export type SceneId =
  | 'boxing-ring'
  | 'lagos-market'
  | 'lagos-island'
  | 'paris-eiffel'
  | 'indoor-gym'
  | 'office-lounge'
  | 'neighbourhood-bar'
  | 'public-park'
  | 'living-room';

export type AudienceLevel = 'none' | 'few' | 'small' | 'medium' | 'large' | 'very-large';

export type SceneCategory = 'Competitive' | 'City' | 'Outdoors' | 'Indoor' | 'Social';

export type PendingMatchLaunch =
  | { kind: 'solo'; opponent: SoloOpponent; difficulty?: AiDifficulty }
  | { kind: 'passAndPlay'; playerNames: string[] }
  | { kind: 'challenge'; challengeId: string }
  | { kind: 'createLive' };

export type GameMode = 'solo' | 'passAndPlay' | 'challenge' | 'live';

export type SoloOpponent = 'alone' | 'computer';
export type AiDifficulty = 'casual' | 'sharp';
export type LiveRoomMode = 'classic' | 'blitz' | 'precarious';

export type TurnPhase =
  | 'ready'       // Waiting for player to pick a block
  | 'dragging'    // Actively pulling a block out
  | 'placing'     // Extracted block ready to be placed on top
  | 'settling'    // Block released on top, checking stability
  | 'collapsing'  // Tower is collapsing!
  | 'gameover'    // Collapse finished, showing results
  | 'victory';    // Challenge objective completed!

export type GraphicsQuality = 'low' | 'medium' | 'high';

export interface Player {
  id: string;
  name: string;
  moves: number;
  score: number;
  color: string;
  isAI?: boolean;
  isHost?: boolean;
  isLocal?: boolean;
  eliminated?: boolean;
  eliminatedRound?: number;
}

export interface WoodVariant {
  id: number;
  name: string;
  baseHex: string;
  grainHex: string;
  roughness: number;
}

export interface BlockState {
  id: string;
  level: number;          // 0-indexed layer (0 is bottom)
  slot: -1 | 0 | 1;       // Position across the row
  orientation: 0 | 1;     // 0 = length along X, 1 = length along Z
  woodVariant: number;    // 0..5 index into wood textures
  uvOffset: [number, number];
  initialPosition: [number, number, number];
  initialRotation: [number, number, number];
  isPlacedTop?: boolean;
}

export interface ChallengeDefinition {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  difficulty: 'Apprentice' | 'Architect' | 'Daredevil' | 'Master';
  targetMoves: number;
  timeLimitSeconds: number | null;
  presetType: 'standard' | 'precarious' | 'hourglass' | 'speed';
  accentColor: string;
}

export interface GameSettings {
  masterVolume: number;      // 0..1
  musicVolume: number;       // 0..1
  sfxVolume: number;         // 0..1
  muted: boolean;
  cameraSensitivity: number; // 0.4..1.8
  graphicsQuality: GraphicsQuality;
  reducedMotion: boolean;
  showHints: boolean;
}

export interface PlacementSlot {
  level: number;
  slot: -1 | 0 | 1;
  orientation: 0 | 1;
  position: [number, number, number];
  rotationY: number;
}

export interface MoveVisualState {
  playerName: string;
  playerColor: string;
  blockId: string;
  fromLevel: number;
  fromSlot: -1 | 0 | 1;
  fromPosition: [number, number, number];
  fromRotationY: number;
  pullDirection: [number, number, number];
  exitPosition?: [number, number, number];
  toLevel?: number;
  toSlot?: -1 | 0 | 1;
  toPosition?: [number, number, number];
  toRotationY?: number;
  stage: 'inspecting' | 'extracting' | 'carrying' | 'dropping' | 'completed';
  timestamp: number;
}

export interface MatchHistoryEntry {
  id: string;
  modeLabel: string;
  result: 'win' | 'loss' | 'completed';
  score: number;
  moves: number;
  peakHeight: number;
  xpEarned: number;
  timestamp: number;
}

export interface PlayerProfile {
  clientId: string;
  callsign: string;
  xp: number;
  totalGames: number;
  totalWins: number;
  totalMoves: number;
  peakTowerHeight: number;
  liveWins: number;
  matchHistory: MatchHistoryEntry[];
}

export interface LeaderboardEntry {
  id: string;
  callsign: string;
  region: string;
  level: number;
  bestScore: number;
  wins: number;
  peakHeight: number;
  isCurrentUser?: boolean;
}

export interface LiveMoveRecord {
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

export interface LiveRoom {
  code: string;
  name: string;
  mode: LiveRoomMode;
  sceneId?: SceneId;
  visibility: 'public' | 'private';
  maxPlayers: 2 | 3 | 4;
  status: 'waiting' | 'playing' | 'round_over' | 'finished';
  seed: number;
  roundNumber?: number;
  players: Array<{
    id: string;
    name: string;
    color: string;
    isHost: boolean;
    isAI?: boolean;
    moves: number;
    score: number;
    eliminated?: boolean;
    eliminatedRound?: number;
  }>;
  currentPlayerIndex: number;
  moves: LiveMoveRecord[];
  loserPlayerIndex: number | null;
  eliminatedThisRoundIndex?: number | null;
  winnerPlayerIndex?: number | null;
  createdAt: number;
  updatedAt: number;
}
