import { create } from 'zustand';
import {
  AiDifficulty,
  BlockState,
  ChallengeDefinition,
  GameMode,
  GameSettings,
  LeaderboardEntry,
  LiveMoveRecord,
  LiveRoom,
  LiveRoomMode,
  MatchHistoryEntry,
  MoveVisualState,
  PendingMatchLaunch,
  Player,
  PlayerProfile,
  SceneId,
  ScreenType,
  SoloOpponent,
  TurnPhase,
} from '../types/game';
import { CHALLENGES, PLAYER_COLORS } from '../engine/constants';
import { DEFAULT_SCENE_ID, getSceneById, VALID_SCENE_IDS } from '../engine/scenes';
import { generateTowerBlocks } from '../engine/towerGenerator';
import { getTowerLevelStats } from '../engine/rules';
import { soundEngine } from '../audio/soundEngine';
import { liveMatchApi } from '../services/liveMatchApi';

const STORAGE_KEY = 'tilt_jenga_save_v2';
export const XP_PER_LEVEL = 250;

export function getLevelFromXp(xp: number): { level: number; currentXp: number; nextXp: number; pct: number } {
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  const currentXp = xp % XP_PER_LEVEL;
  return {
    level,
    currentXp,
    nextXp: XP_PER_LEVEL,
    pct: Math.min(100, Math.round((currentXp / XP_PER_LEVEL) * 100)),
  };
}

interface PersistedData {
  bestSoloScore: number;
  bestSoloMoves: number;
  soloAiWins: number;
  completedChallenges: string[];
  settings: GameSettings;
  profile: PlayerProfile;
  selectedSceneId?: SceneId;
}

const DEFAULT_SETTINGS: GameSettings = {
  masterVolume: 0.78,
  musicVolume: 0.36,
  sfxVolume: 0.85,
  muted: false,
  cameraSensitivity: 1.0,
  graphicsQuality: 'high',
  reducedMotion: false,
  showHints: true,
};

function makeClientId(): string {
  return `tilt-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Per-tab session ID for Live Match seats so two browser tabs on the same device
 * act as two distinct players (Seat 1 & Seat 2) and sync moves cleanly across tabs!
 */
function getTabLiveClientId(): string {
  try {
    const existing = sessionStorage.getItem('tilt_live_tab_id');
    if (existing) return existing;
    const fresh = makeClientId();
    sessionStorage.setItem('tilt_live_tab_id', fresh);
    return fresh;
  } catch {
    return makeClientId();
  }
}

const TAB_LIVE_CLIENT_ID = getTabLiveClientId();

const DEFAULT_PROFILE: PlayerProfile = {
  clientId: makeClientId(),
  callsign: 'PlayerOne',
  xp: 0,
  totalGames: 0,
  totalWins: 0,
  totalMoves: 0,
  peakTowerHeight: 18,
  liveWins: 0,
  matchHistory: [],
};

function loadPersisted(): PersistedData {
  try {
    // Support seamless upgrade from v1 storage key if present
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('tilt_jenga_save_v1');
    if (!raw) {
      return {
        bestSoloScore: 0,
        bestSoloMoves: 0,
        soloAiWins: 0,
        completedChallenges: [],
        settings: DEFAULT_SETTINGS,
        profile: { ...DEFAULT_PROFILE, clientId: makeClientId() },
        selectedSceneId: DEFAULT_SCENE_ID,
      };
    }
    const parsed = JSON.parse(raw) as Partial<PersistedData>;
    const savedScene =
      parsed.selectedSceneId && VALID_SCENE_IDS.includes(parsed.selectedSceneId)
        ? parsed.selectedSceneId
        : DEFAULT_SCENE_ID;
    return {
      bestSoloScore: parsed.bestSoloScore ?? 0,
      bestSoloMoves: parsed.bestSoloMoves ?? 0,
      soloAiWins: parsed.soloAiWins ?? 0,
      completedChallenges: Array.isArray(parsed.completedChallenges) ? parsed.completedChallenges : [],
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) },
      profile: {
        ...DEFAULT_PROFILE,
        ...(parsed.profile ?? {}),
        clientId: parsed.profile?.clientId || makeClientId(),
        matchHistory: Array.isArray(parsed.profile?.matchHistory) ? parsed.profile.matchHistory : [],
      },
      selectedSceneId: savedScene,
    };
  } catch {
    return {
      bestSoloScore: 0,
      bestSoloMoves: 0,
      soloAiWins: 0,
      completedChallenges: [],
      settings: DEFAULT_SETTINGS,
      profile: { ...DEFAULT_PROFILE, clientId: makeClientId() },
      selectedSceneId: DEFAULT_SCENE_ID,
    };
  }
}

function savePersisted(data: PersistedData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage quota errors
  }
}

export type CameraCommand =
  | { type: 'rotateLeft'; nonce: number }
  | { type: 'rotateRight'; nonce: number }
  | { type: 'zoomIn'; nonce: number }
  | { type: 'zoomOut'; nonce: number }
  | { type: 'reset'; nonce: number }
  | { type: 'focusAzimuth'; azimuth: number; nonce: number }
  | null;

interface GameStoreState {
  // Navigation & Modals
  screen: ScreenType;
  selectedSceneId: SceneId;
  pendingMatchLaunch: PendingMatchLaunch | null;
  sceneTransitionName: string | null;
  isPaused: boolean;
  isSettingsOpen: boolean;
  isInstructionsOpen: boolean;

  // Game Mode & Players
  mode: GameMode;
  soloOpponent: SoloOpponent;
  aiDifficulty: AiDifficulty;
  activeChallenge: ChallengeDefinition | null;
  players: Player[];
  currentPlayerIndex: number;
  lastMoverPlayerIndex: number | null;
  currentTurnTouchedBlock: boolean;
  loserPlayerIndex: number | null;

  // Match State
  runId: number;
  roundNumber: number;
  eliminatedThisRoundIndex: number | null;
  blocks: BlockState[];
  turnPhase: TurnPhase;
  movesCount: number;
  score: number;
  streak: number;
  towerHeightLevels: number;
  timeRemaining: number | null;
  isNewBest: boolean;
  lastMatchXpEarned: number;
  matchRecordedForRunId: number;

  // Live Multiplayer Room State & Global Leaderboard
  liveClientId: string;
  liveRoom: LiveRoom | null;
  availableLiveRooms: LiveRoom[];
  globalLeaderboard: LeaderboardEntry[];
  leaderboardLoading: boolean;
  liveLoading: boolean;
  liveError: string | null;
  appliedLiveMoveSeq: number;
  pendingRemoteMove: LiveMoveRecord | null;
  pendingJoinCode: string | null;

  // Interaction State
  hoveredBlockId: string | null;
  selectedBlockId: string | null;
  isDraggingBlock: boolean;
  isPlacementValid: boolean;
  activeMoveVisual: MoveVisualState | null;
  lastCompletedMove: MoveVisualState | null;
  feedbackToast: { message: string; tone: 'aqua' | 'tangerine' | 'ivory'; nonce: number } | null;
  cameraCommand: CameraCommand;

  // Persisted Records, Profile & Settings
  bestSoloScore: number;
  bestSoloMoves: number;
  soloAiWins: number;
  completedChallenges: string[];
  profile: PlayerProfile;
  settings: GameSettings;

  // Navigation & Profile Actions
  setScreen: (screen: ScreenType) => void;
  setSelectedSceneId: (sceneId: SceneId) => void;
  openScenePickerFor: (launch: PendingMatchLaunch) => void;
  confirmSceneAndLaunch: () => void;
  setPaused: (paused: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  setInstructionsOpen: (open: boolean) => void;
  updateCallsign: (callsign: string) => void;
  fetchLeaderboard: () => Promise<void>;
  getLeaderboard: () => LeaderboardEntry[];
  setPendingJoinCode: (code: string | null) => void;

  // Standard Match Actions
  startSoloGame: (opponent?: SoloOpponent, difficulty?: AiDifficulty) => void;
  startPassAndPlayGame: (playerNames: string[]) => void;
  startChallengeGame: (challengeId: string) => void;
  startNextEliminationRound: () => void;
  restartGame: () => void;
  returnToMenu: () => void;

  // Live Match Actions
  refreshLiveRooms: () => Promise<void>;
  createLiveMatch: (opts: {
    roomName: string;
    playerName: string;
    mode: LiveRoomMode;
    sceneId: SceneId;
    visibility: 'public' | 'private';
    maxPlayers: 2 | 3 | 4;
  }) => Promise<boolean>;
  joinLiveMatch: (codeOrLink: string, playerName: string) => Promise<boolean>;
  addBotToLiveLobby: () => Promise<void>;
  startLiveMatchFromLobby: (fillWithBot?: boolean) => Promise<void>;
  pollLiveRoom: () => Promise<void>;
  leaveLiveMatch: () => void;
  consumeRemoteMove: () => void;
  clearLiveError: () => void;

  // Gameplay Actions
  setHoveredBlock: (id: string | null) => void;
  startDraggingBlock: (id: string) => void;
  cancelDraggingBlock: () => void;
  markBlockExtracted: (id: string) => void;
  setPlacementValid: (valid: boolean) => void;
  beginSettlingBlock: (blockId: string, newLevel: number, newSlot: -1 | 0 | 1) => void;
  completeTurnAfterSettle: () => void;
  triggerCollapse: (reason?: string, fromRemote?: boolean) => void;
  finishCollapseToGameOver: () => void;
  tickChallengeTimer: (dt: number) => void;

  showFeedback: (message: string, tone?: 'aqua' | 'tangerine' | 'ivory') => void;
  setActiveMoveVisual: (visual: MoveVisualState | null) => void;
  focusCameraAzimuth: (azimuth: number) => void;
  dispatchCameraCommand: (type: 'rotateLeft' | 'rotateRight' | 'zoomIn' | 'zoomOut' | 'reset') => void;
  updateSettings: (partial: Partial<GameSettings>) => void;
}

const initialSaved = loadPersisted();
soundEngine.updateSettings(initialSaved.settings);

function persistCurrent(state: GameStoreState) {
  savePersisted({
    bestSoloScore: state.bestSoloScore,
    bestSoloMoves: state.bestSoloMoves,
    soloAiWins: state.soloAiWins,
    completedChallenges: state.completedChallenges,
    settings: state.settings,
    profile: state.profile,
    selectedSceneId: state.selectedSceneId,
  });
}

function buildLivePlayers(room: LiveRoom, localClientId: string): Player[] {
  return room.players.map((p) => ({
    id: p.id,
    name: p.name,
    color: p.color,
    moves: p.moves,
    score: p.score,
    isAI: Boolean(p.isAI),
    isHost: p.isHost,
    isLocal: p.id === localClientId,
    eliminated: Boolean(p.eliminated),
    eliminatedRound: p.eliminatedRound,
  }));
}

function computeBestOverallScore(bestSoloScore: number, profile: PlayerProfile): number {
  let maxScore = Math.max(0, bestSoloScore);
  for (const m of profile.matchHistory) {
    if (typeof m.score === 'number' && m.score > maxScore) {
      maxScore = m.score;
    }
  }
  // Backfill for existing players who played Live / Vs. Computer matches before all-mode Best Score tracking
  if (maxScore === 0 && (profile.totalMoves > 0 || profile.totalWins > 0 || profile.totalGames > 0)) {
    const heightBonus = Math.max(0, profile.peakTowerHeight - 18) * 75;
    maxScore = Math.max(100, profile.totalMoves * 115 + profile.totalWins * 250 + heightBonus);
  }
  return maxScore;
}

function syncProfileToGlobalLeaderboard(state: GameStoreState) {
  const bestScore = computeBestOverallScore(state.bestSoloScore, state.profile);
  if (state.profile.totalGames <= 0 && bestScore <= 0) return;
  const { level } = getLevelFromXp(state.profile.xp);
  liveMatchApi
    .submitLeaderboardScore({
      id: state.profile.clientId,
      callsign: state.profile.callsign,
      region: 'Global',
      level,
      bestScore,
      wins: state.profile.totalWins,
      peakHeight: state.profile.peakTowerHeight,
    })
    .catch(() => {});
}

export const useGameStore = create<GameStoreState>((set, get) => ({
  screen: 'menu',
  selectedSceneId: initialSaved.selectedSceneId ?? DEFAULT_SCENE_ID,
  pendingMatchLaunch: null,
  sceneTransitionName: null,
  isPaused: false,
  isSettingsOpen: false,
  isInstructionsOpen: false,

  mode: 'solo',
  soloOpponent: 'alone',
  aiDifficulty: 'casual',
  activeChallenge: null,
  players: [{ id: 'p1', name: initialSaved.profile.callsign, moves: 0, score: 0, color: PLAYER_COLORS[0], isAI: false, isLocal: true }],
  currentPlayerIndex: 0,
  lastMoverPlayerIndex: null,
  currentTurnTouchedBlock: false,
  loserPlayerIndex: null,

  runId: 1,
  roundNumber: 1,
  eliminatedThisRoundIndex: null,
  blocks: generateTowerBlocks('standard', 1001),
  turnPhase: 'ready',
  movesCount: 0,
  score: 0,
  streak: 0,
  towerHeightLevels: 18,
  timeRemaining: null,
  isNewBest: false,
  lastMatchXpEarned: 0,
  matchRecordedForRunId: 0,

  liveClientId: TAB_LIVE_CLIENT_ID,
  liveRoom: null,
  availableLiveRooms: [],
  globalLeaderboard: [],
  leaderboardLoading: false,
  liveLoading: false,
  liveError: null,
  appliedLiveMoveSeq: 0,
  pendingRemoteMove: null,
  pendingJoinCode: null,

  hoveredBlockId: null,
  selectedBlockId: null,
  isDraggingBlock: false,
  isPlacementValid: false,
  activeMoveVisual: null,
  lastCompletedMove: null,
  feedbackToast: null,
  cameraCommand: null,

  bestSoloScore: computeBestOverallScore(initialSaved.bestSoloScore, initialSaved.profile),
  bestSoloMoves: initialSaved.bestSoloMoves,
  soloAiWins: initialSaved.soloAiWins,
  completedChallenges: initialSaved.completedChallenges,
  profile: initialSaved.profile,
  settings: initialSaved.settings,

  setScreen: (screen) => set({ screen, liveError: null }),
  setSelectedSceneId: (selectedSceneId) => {
    set({ selectedSceneId });
    persistCurrent({ ...get(), selectedSceneId });
  },
  openScenePickerFor: (launch) => {
    soundEngine.unlock();
    soundEngine.playUiClick(1.06);
    set({
      pendingMatchLaunch: launch,
      screen: 'sceneSelect',
      liveError: null,
    });
  },
  confirmSceneAndLaunch: () => {
    const state = get();
    const launch = state.pendingMatchLaunch;
    const scene = getSceneById(state.selectedSceneId);

    if (!launch || launch.kind === 'createLive') {
      soundEngine.playUiClick(1.08);
      set({
        screen: launch?.kind === 'createLive' ? 'createLive' : 'modeSelect',
        pendingMatchLaunch: null,
      });
      return;
    }

    // Show polished scene-loading overlay displaying the chosen location name while entering the match
    set({ sceneTransitionName: scene.name });
    window.setTimeout(() => {
      const cur = get();
      if (launch.kind === 'solo') {
        cur.startSoloGame(launch.opponent, launch.difficulty);
      } else if (launch.kind === 'passAndPlay') {
        cur.startPassAndPlayGame(launch.playerNames);
      } else if (launch.kind === 'challenge') {
        cur.startChallengeGame(launch.challengeId);
      }
      set({ pendingMatchLaunch: null });
      window.setTimeout(() => {
        set({ sceneTransitionName: null });
      }, 340);
    }, 320);
  },
  setPaused: (isPaused) => set({ isPaused }),
  setSettingsOpen: (isSettingsOpen) => set({ isSettingsOpen }),
  setInstructionsOpen: (isInstructionsOpen) => set({ isInstructionsOpen }),
  setPendingJoinCode: (pendingJoinCode) => set({ pendingJoinCode }),
  clearLiveError: () => set({ liveError: null }),

  updateCallsign: (rawName) => {
    const callsign = rawName.trim().slice(0, 18) || 'PlayerOne';
    const nextProfile = { ...get().profile, callsign };
    set({ profile: nextProfile });
    persistCurrent({ ...get(), profile: nextProfile });
    syncProfileToGlobalLeaderboard(get());
  },

  fetchLeaderboard: async () => {
    set({ leaderboardLoading: true });
    try {
      const { entries } = await liveMatchApi.listLeaderboard();
      const state = get();
      const localBest = computeBestOverallScore(state.bestSoloScore, state.profile);
      const { level } = getLevelFromXp(state.profile.xp);
      const serverSelf = entries.find((e) => e.id === state.profile.clientId);

      // Self-heal stale 0-score or behind server entries automatically when opening Leaderboard
      if (
        (state.profile.totalGames > 0 || localBest > 0) &&
        (!serverSelf ||
          localBest > serverSelf.bestScore ||
          state.profile.totalWins > serverSelf.wins ||
          level > serverSelf.level ||
          state.profile.peakTowerHeight > serverSelf.peakHeight)
      ) {
        if (localBest > state.bestSoloScore) {
          set({ bestSoloScore: localBest });
          persistCurrent(get());
        }
        syncProfileToGlobalLeaderboard(get());
      }

      set({ globalLeaderboard: entries, leaderboardLoading: false });
    } catch {
      set({ leaderboardLoading: false });
    }
  },

  getLeaderboard: () => {
    const state = get();
    const { level } = getLevelFromXp(state.profile.xp);
    const localBest = computeBestOverallScore(state.bestSoloScore, state.profile);
    const hasPlayed = state.profile.totalGames > 0 || localBest > 0;
    const byId = new Map<string, LeaderboardEntry>();

    for (const entry of state.globalLeaderboard) {
      byId.set(entry.id, {
        ...entry,
        isCurrentUser: entry.id === state.profile.clientId,
      });
    }

    if (hasPlayed) {
      const existing = byId.get(state.profile.clientId);
      byId.set(state.profile.clientId, {
        id: state.profile.clientId,
        callsign: state.profile.callsign,
        region: existing?.region || 'Global',
        level: Math.max(level, existing?.level ?? 1),
        bestScore: Math.max(localBest, existing?.bestScore ?? 0),
        wins: Math.max(state.profile.totalWins, existing?.wins ?? 0),
        peakHeight: Math.max(state.profile.peakTowerHeight, existing?.peakHeight ?? 18),
        isCurrentUser: true,
      });
    }

    return Array.from(byId.values());
  },

  startSoloGame: (opponent = 'alone', difficulty) => {
    soundEngine.unlock();
    soundEngine.playUiClick(1.1);
    const state = get();
    const nextRun = state.runId + 1;
    const chosenDifficulty = difficulty ?? state.aiDifficulty;
    const blocks = generateTowerBlocks('standard', Date.now());
    const players: Player[] =
      opponent === 'computer'
        ? [
            { id: state.profile.clientId, name: 'You', moves: 0, score: 0, color: PLAYER_COLORS[0], isAI: false, isLocal: true },
            { id: 'p-ai', name: 'Computer', moves: 0, score: 0, color: PLAYER_COLORS[1], isAI: true, isLocal: false },
          ]
        : [{ id: state.profile.clientId, name: state.profile.callsign, moves: 0, score: 0, color: PLAYER_COLORS[0], isAI: false, isLocal: true }];

    set({
      screen: 'playing',
      mode: 'solo',
      soloOpponent: opponent,
      aiDifficulty: chosenDifficulty,
      activeChallenge: null,
      liveClientId: TAB_LIVE_CLIENT_ID,
  liveRoom: null,
      pendingRemoteMove: null,
      players,
      currentPlayerIndex: 0,
      lastMoverPlayerIndex: null,
      currentTurnTouchedBlock: false,
      loserPlayerIndex: null,
      runId: nextRun,
      roundNumber: 1,
      eliminatedThisRoundIndex: null,
      blocks,
      turnPhase: 'ready',
      movesCount: 0,
      score: 0,
      streak: 0,
      towerHeightLevels: getTowerLevelStats(blocks).totalHeightLevels,
      timeRemaining: null,
      isNewBest: false,
      lastMatchXpEarned: 0,
      isPaused: false,
      hoveredBlockId: null,
      selectedBlockId: null,
      isDraggingBlock: false,
      isPlacementValid: false,
      activeMoveVisual: null,
      lastCompletedMove: null,
      feedbackToast: {
        message:
          opponent === 'computer'
            ? 'Your turn vs. Computer — pull a block below top 3 levels'
            : 'Drag any block below the top 3 levels',
        tone: 'aqua',
        nonce: Date.now(),
      },
      cameraCommand: { type: 'reset', nonce: Date.now() },
    });
  },

  startPassAndPlayGame: (playerNames) => {
    soundEngine.unlock();
    soundEngine.playUiClick(1.1);
    const cleanNames = playerNames
      .map((n, i) => n.trim() || `Player ${i + 1}`)
      .slice(0, 4);
    const players: Player[] = cleanNames.map((name, i) => ({
      id: `p-${i + 1}`,
      name,
      moves: 0,
      score: 0,
      color: PLAYER_COLORS[i % PLAYER_COLORS.length],
      isAI: false,
      isLocal: true,
    }));

    const nextRun = get().runId + 1;
    const blocks = generateTowerBlocks('standard', Date.now());
    set({
      screen: 'playing',
      mode: 'passAndPlay',
      activeChallenge: null,
      liveClientId: TAB_LIVE_CLIENT_ID,
  liveRoom: null,
      pendingRemoteMove: null,
      players,
      currentPlayerIndex: 0,
      lastMoverPlayerIndex: null,
      currentTurnTouchedBlock: false,
      loserPlayerIndex: null,
      runId: nextRun,
      roundNumber: 1,
      eliminatedThisRoundIndex: null,
      blocks,
      turnPhase: 'ready',
      movesCount: 0,
      score: 0,
      streak: 0,
      towerHeightLevels: getTowerLevelStats(blocks).totalHeightLevels,
      timeRemaining: null,
      isNewBest: false,
      lastMatchXpEarned: 0,
      isPaused: false,
      hoveredBlockId: null,
      selectedBlockId: null,
      isDraggingBlock: false,
      isPlacementValid: false,
      activeMoveVisual: null,
      lastCompletedMove: null,
      feedbackToast: { message: `${players[0].name}'s turn — pull a block`, tone: 'aqua', nonce: Date.now() },
      cameraCommand: { type: 'reset', nonce: Date.now() },
    });
  },

  startChallengeGame: (challengeId) => {
    soundEngine.unlock();
    soundEngine.playUiClick(1.15);
    const challenge = CHALLENGES.find((c) => c.id === challengeId) ?? CHALLENGES[0];
    const nextRun = get().runId + 1;
    const blocks = generateTowerBlocks(challenge.presetType, Date.now());
    set({
      screen: 'playing',
      mode: 'challenge',
      activeChallenge: challenge,
      liveClientId: TAB_LIVE_CLIENT_ID,
  liveRoom: null,
      pendingRemoteMove: null,
      players: [{ id: get().profile.clientId, name: get().profile.callsign, moves: 0, score: 0, color: challenge.accentColor, isLocal: true }],
      currentPlayerIndex: 0,
      lastMoverPlayerIndex: null,
      currentTurnTouchedBlock: false,
      loserPlayerIndex: null,
      runId: nextRun,
      roundNumber: 1,
      eliminatedThisRoundIndex: null,
      blocks,
      turnPhase: 'ready',
      movesCount: 0,
      score: 0,
      streak: 0,
      towerHeightLevels: getTowerLevelStats(blocks).totalHeightLevels,
      timeRemaining: challenge.timeLimitSeconds,
      isNewBest: false,
      lastMatchXpEarned: 0,
      isPaused: false,
      hoveredBlockId: null,
      selectedBlockId: null,
      isDraggingBlock: false,
      isPlacementValid: false,
      activeMoveVisual: null,
      lastCompletedMove: null,
      feedbackToast: { message: `${challenge.title}: ${challenge.subtitle}`, tone: 'aqua', nonce: Date.now() },
      cameraCommand: { type: 'reset', nonce: Date.now() },
    });
  },

  // ==================== LIVE MATCH MULTIPLAYER ====================
  refreshLiveRooms: async () => {
    set({ liveLoading: true, liveError: null });
    try {
      const rooms = await liveMatchApi.listPublicRooms();
      set({ availableLiveRooms: rooms, liveLoading: false });
    } catch (err) {
      set({
        liveLoading: false,
        liveError: err instanceof Error ? err.message : 'Unable to load live matches.',
      });
    }
  },

  createLiveMatch: async ({ roomName, playerName, mode, sceneId, visibility, maxPlayers }) => {
    soundEngine.unlock();
    soundEngine.playUiClick(1.1);
    set({ liveLoading: true, liveError: null });
    try {
      const cleanName = playerName.trim().slice(0, 18) || get().profile.callsign;
      get().updateCallsign(cleanName);
      const room = await liveMatchApi.createRoom({
        playerId: get().liveClientId,
        playerName: cleanName,
        roomName,
        mode,
        sceneId,
        visibility,
        maxPlayers,
      });
      const resolvedScene = getSceneById(room.sceneId ?? sceneId).id;
      set({
        liveRoom: room,
        selectedSceneId: resolvedScene,
        liveLoading: false,
        screen: 'liveLobby',
        appliedLiveMoveSeq: 0,
        pendingRemoteMove: null,
      });
      persistCurrent({ ...get(), selectedSceneId: resolvedScene });
      return true;
    } catch (err) {
      set({
        liveLoading: false,
        liveError: err instanceof Error ? err.message : 'Could not create live match.',
      });
      return false;
    }
  },

  joinLiveMatch: async (codeOrLink, playerName) => {
    soundEngine.unlock();
    soundEngine.playUiClick(1.1);
    set({ liveLoading: true, liveError: null });
    try {
      const cleanName = playerName.trim().slice(0, 18) || get().profile.callsign;
      get().updateCallsign(cleanName);
      const room = await liveMatchApi.joinRoom(codeOrLink, {
        playerId: get().liveClientId,
        playerName: cleanName,
      });
      // Host's selected scene is authoritative for all joining participants!
      const hostSceneId = getSceneById(room.sceneId).id;

      set({
        liveRoom: room,
        selectedSceneId: hostSceneId,
        liveLoading: false,
        pendingJoinCode: null,
        appliedLiveMoveSeq: room.moves.length,
        pendingRemoteMove: null,
      });

      if (room.status === 'playing') {
        // Enter ongoing live match directly
        const nextRun = get().runId + 1;
        const preset = room.mode === 'precarious' ? 'precarious' : 'standard';
        const blocks = generateTowerBlocks(preset, room.seed);
        const players = buildLivePlayers(room, get().liveClientId);
        set({
          screen: 'playing',
          mode: 'live',
          activeChallenge: null,
          players,
          currentPlayerIndex: room.currentPlayerIndex,
          lastMoverPlayerIndex: null,
          currentTurnTouchedBlock: false,
          loserPlayerIndex: null,
          runId: nextRun,
          blocks,
          turnPhase: 'ready',
          movesCount: room.moves.length,
          score: 0,
          streak: 0,
          towerHeightLevels: getTowerLevelStats(blocks).totalHeightLevels,
          timeRemaining: null,
          isPaused: false,
          activeMoveVisual: null,
          lastCompletedMove: null,
          feedbackToast: {
            message: `Joined ${room.name} (${room.code})`,
            tone: 'aqua',
            nonce: Date.now(),
          },
          cameraCommand: { type: 'reset', nonce: Date.now() },
        });
      } else {
        set({ screen: 'liveLobby' });
      }
      return true;
    } catch (err) {
      set({
        liveLoading: false,
        liveError: err instanceof Error ? err.message : 'Could not join live match.',
      });
      return false;
    }
  },

  addBotToLiveLobby: async () => {
    const room = get().liveRoom;
    if (!room || room.players.length >= room.maxPlayers) return;
    soundEngine.playUiClick(1.06);
    const botNames = ['Kofi_AI', 'Layla_AI', 'Atlas_AI', 'Nova_AI'];
    const name = botNames[room.players.length % botNames.length];
    try {
      const updated = await liveMatchApi.joinRoom(room.code, {
        playerId: `bot-${Date.now()}-${Math.floor(Math.random() * 999)}`,
        playerName: name,
        isAI: true,
      });
      set({ liveRoom: updated });
    } catch {
      // Ignore
    }
  },

  startLiveMatchFromLobby: async (fillWithBot = false) => {
    const room = get().liveRoom;
    if (!room) return;
    soundEngine.unlock();
    soundEngine.playUiClick(1.15);
    set({ liveLoading: true, liveError: null });
    try {
      const started = await liveMatchApi.startRoom(room.code, fillWithBot);
      const nextRun = get().runId + 1;
      const preset = started.mode === 'precarious' ? 'precarious' : 'standard';
      const blocks = generateTowerBlocks(preset, started.seed);
      const players = buildLivePlayers(started, get().liveClientId);

      set({
        liveRoom: started,
        liveLoading: false,
        screen: 'playing',
        mode: 'live',
        activeChallenge: null,
        players,
        currentPlayerIndex: 0,
        lastMoverPlayerIndex: null,
        currentTurnTouchedBlock: false,
        loserPlayerIndex: null,
        runId: nextRun,
        blocks,
        turnPhase: 'ready',
        movesCount: 0,
        score: 0,
        streak: 0,
        towerHeightLevels: getTowerLevelStats(blocks).totalHeightLevels,
        timeRemaining: started.mode === 'blitz' ? 120 : null,
        isNewBest: false,
        lastMatchXpEarned: 0,
        isPaused: false,
        appliedLiveMoveSeq: 0,
        pendingRemoteMove: null,
        hoveredBlockId: null,
        selectedBlockId: null,
        isDraggingBlock: false,
        isPlacementValid: false,
        activeMoveVisual: null,
        lastCompletedMove: null,
        feedbackToast: {
          message: `Live Match Started — ${players[0].name}'s turn!`,
          tone: 'aqua',
          nonce: Date.now(),
        },
        cameraCommand: { type: 'reset', nonce: Date.now() },
      });
    } catch (err) {
      set({
        liveLoading: false,
        liveError: err instanceof Error ? err.message : 'Unable to start live match.',
      });
    }
  },

  pollLiveRoom: async () => {
    const state = get();
    if (!state.liveRoom) return;
    try {
      const fresh = await liveMatchApi.getRoom(state.liveRoom.code);

      // In Lobby: update player roster and auto-transition if Host started the match!
      if (state.screen === 'liveLobby') {
        const hostSceneId = getSceneById(fresh.sceneId).id;
        if (fresh.status === 'playing') {
          const nextRun = state.runId + 1;
          const preset = fresh.mode === 'precarious' ? 'precarious' : 'standard';
          const blocks = generateTowerBlocks(preset, fresh.seed);
          const players = buildLivePlayers(fresh, state.liveClientId);
          set({
            liveRoom: fresh,
            selectedSceneId: hostSceneId,
            screen: 'playing',
            mode: 'live',
            players,
            currentPlayerIndex: fresh.currentPlayerIndex,
            lastMoverPlayerIndex: null,
            currentTurnTouchedBlock: false,
            loserPlayerIndex: null,
            runId: nextRun,
            blocks,
            turnPhase: 'ready',
            movesCount: 0,
            score: 0,
            towerHeightLevels: getTowerLevelStats(blocks).totalHeightLevels,
            timeRemaining: fresh.mode === 'blitz' ? 120 : null,
            appliedLiveMoveSeq: 0,
            pendingRemoteMove: null,
            activeMoveVisual: null,
            lastCompletedMove: null,
            feedbackToast: {
              message: `Match started! ${players[0]?.name}'s turn`,
              tone: 'aqua',
              nonce: Date.now(),
            },
            cameraCommand: { type: 'reset', nonce: Date.now() },
          });
        } else {
          set({ liveRoom: fresh });
        }
        return;
      }

      // In Live Gameplay: sync remote moves, collapses & next elimination rounds
      if (state.screen === 'playing' && state.mode === 'live') {
        const serverRound = fresh.roundNumber ?? 1;

        // Remote host/player advanced the match to the next elimination round
        if (fresh.status === 'playing' && serverRound > state.roundNumber) {
          const nextRun = state.runId + 1;
          const preset = fresh.mode === 'precarious' ? 'precarious' : 'standard';
          const blocks = generateTowerBlocks(preset, fresh.seed);
          const players = buildLivePlayers(fresh, state.liveClientId);
          soundEngine.playTurnChange();
          set({
            liveRoom: fresh,
            runId: nextRun,
            roundNumber: serverRound,
            eliminatedThisRoundIndex: null,
            loserPlayerIndex: null,
            lastMoverPlayerIndex: null,
            currentTurnTouchedBlock: false,
            players,
            currentPlayerIndex: fresh.currentPlayerIndex,
            blocks,
            turnPhase: 'ready',
            towerHeightLevels: getTowerLevelStats(blocks).totalHeightLevels,
            timeRemaining: fresh.mode === 'blitz' ? 120 : null,
            appliedLiveMoveSeq: fresh.moves.length,
            pendingRemoteMove: null,
            activeMoveVisual: null,
            lastCompletedMove: null,
            feedbackToast: {
              message: `Round ${serverRound} started — ${players[fresh.currentPlayerIndex]?.name ?? 'Next player'}'s turn!`,
              tone: 'aqua',
              nonce: Date.now(),
            },
            cameraCommand: { type: 'reset', nonce: Date.now() },
          });
          return;
        }

        if (
          (fresh.status === 'finished' || fresh.status === 'round_over') &&
          state.turnPhase !== 'collapsing' &&
          state.turnPhase !== 'gameover'
        ) {
          set({
            liveRoom: fresh,
            currentPlayerIndex:
              typeof fresh.loserPlayerIndex === 'number'
                ? fresh.loserPlayerIndex
                : state.currentPlayerIndex,
          });
          get().triggerCollapse('The tower collapsed in the live arena!', true);
          return;
        }

        // Queue next unseen remote move for 3D visual playback
        if (!state.pendingRemoteMove && state.turnPhase === 'ready') {
          const nextRemote = fresh.moves.find(
            (m) => m.seq > state.appliedLiveMoveSeq && m.playerId !== state.liveClientId
          );
          if (nextRemote) {
            set({
              liveRoom: fresh,
              pendingRemoteMove: nextRemote,
              appliedLiveMoveSeq: nextRemote.seq,
            });
            return;
          }
        }

        // Keep live player list synced if latecomer joined
        if (fresh.players.length !== state.players.length) {
          set({
            liveRoom: fresh,
            players: buildLivePlayers(fresh, state.liveClientId),
          });
        }
      }
    } catch {
      // Transient polling hiccup — ignore gracefully
    }
  },

  leaveLiveMatch: () => {
    soundEngine.stopDragFriction();
    soundEngine.playUiClick(0.92);
    set({
      liveClientId: TAB_LIVE_CLIENT_ID,
  liveRoom: null,
      pendingRemoteMove: null,
      appliedLiveMoveSeq: 0,
      screen: 'menu',
    });
  },

  consumeRemoteMove: () => set({ pendingRemoteMove: null }),

  startNextEliminationRound: () => {
    const state = get();
    const survivors = state.players.filter((p) => !p.eliminated);
    if (survivors.length < 2) {
      state.restartGame();
      return;
    }

    soundEngine.unlock();
    soundEngine.playTurnChange();

    if (state.mode === 'live' && state.liveRoom) {
      liveMatchApi
        .startNextRound(state.liveRoom.code)
        .then((fresh) => {
          const cur = get();
          const nextRun = cur.runId + 1;
          const nextRound = fresh.roundNumber ?? cur.roundNumber + 1;
          const preset = fresh.mode === 'precarious' ? 'precarious' : 'standard';
          const blocks = generateTowerBlocks(preset, fresh.seed);
          const players = buildLivePlayers(fresh, cur.liveClientId);
          set({
            liveRoom: fresh,
            runId: nextRun,
            roundNumber: nextRound,
            eliminatedThisRoundIndex: null,
            loserPlayerIndex: null,
            lastMoverPlayerIndex: null,
            currentTurnTouchedBlock: false,
            players,
            currentPlayerIndex: fresh.currentPlayerIndex,
            blocks,
            turnPhase: 'ready',
            towerHeightLevels: getTowerLevelStats(blocks).totalHeightLevels,
            timeRemaining: fresh.mode === 'blitz' ? 120 : null,
            appliedLiveMoveSeq: 0,
            pendingRemoteMove: null,
            isPaused: false,
            hoveredBlockId: null,
            selectedBlockId: null,
            isDraggingBlock: false,
            isPlacementValid: false,
            activeMoveVisual: null,
            lastCompletedMove: null,
            feedbackToast: {
              message: `Round ${nextRound} — ${players.filter((p) => !p.eliminated).length} contenders left!`,
              tone: 'aqua',
              nonce: Date.now(),
            },
            cameraCommand: { type: 'reset', nonce: Date.now() },
          });
        })
        .catch(() => {});
      return;
    }

    const nextRun = state.runId + 1;
    const nextRound = state.roundNumber + 1;
    const firstActiveIdx = state.players.findIndex((p) => !p.eliminated);
    const preset = 'standard';
    const blocks = generateTowerBlocks(preset, Date.now());

    set({
      runId: nextRun,
      roundNumber: nextRound,
      eliminatedThisRoundIndex: null,
      loserPlayerIndex: null,
      lastMoverPlayerIndex: null,
      currentTurnTouchedBlock: false,
      currentPlayerIndex: Math.max(0, firstActiveIdx),
      blocks,
      turnPhase: 'ready',
      towerHeightLevels: getTowerLevelStats(blocks).totalHeightLevels,
      timeRemaining: state.mode === 'live' && state.liveRoom?.mode === 'blitz' ? 120 : null,
      isPaused: false,
      hoveredBlockId: null,
      selectedBlockId: null,
      isDraggingBlock: false,
      isPlacementValid: false,
      activeMoveVisual: null,
      lastCompletedMove: null,
      feedbackToast: {
        message:
          survivors.length === 2
            ? `FINAL ROUND ${nextRound} — ${state.players[Math.max(0, firstActiveIdx)].name}'s turn!`
            : `Round ${nextRound} (${survivors.length} left) — ${state.players[Math.max(0, firstActiveIdx)].name}'s turn!`,
        tone: 'aqua',
        nonce: Date.now(),
      },
      cameraCommand: { type: 'reset', nonce: Date.now() },
    });
  },

  restartGame: () => {
    const state = get();
    if (state.mode === 'live' && state.liveRoom) {
      state.startLiveMatchFromLobby(false);
    } else if (state.mode === 'solo') {
      state.startSoloGame(state.soloOpponent, state.aiDifficulty);
    } else if (state.mode === 'passAndPlay') {
      state.startPassAndPlayGame(state.players.map((p) => p.name));
    } else if (state.mode === 'challenge' && state.activeChallenge) {
      state.startChallengeGame(state.activeChallenge.id);
    }
  },

  returnToMenu: () => {
    soundEngine.stopDragFriction();
    soundEngine.playUiClick(0.9);
    const nextRun = get().runId + 1;
    const blocks = generateTowerBlocks('standard', 1001);
    set({
      screen: 'menu',
      isPaused: false,
      isSettingsOpen: false,
      isInstructionsOpen: false,
      liveClientId: TAB_LIVE_CLIENT_ID,
  liveRoom: null,
      pendingRemoteMove: null,
      runId: nextRun,
      roundNumber: 1,
      eliminatedThisRoundIndex: null,
      blocks,
      turnPhase: 'ready',
      hoveredBlockId: null,
      selectedBlockId: null,
      isDraggingBlock: false,
      isPlacementValid: false,
      activeMoveVisual: null,
      lastCompletedMove: null,
      loserPlayerIndex: null,
      lastMoverPlayerIndex: null,
      currentTurnTouchedBlock: false,
      feedbackToast: null,
      towerHeightLevels: 18,
    });
  },

  setHoveredBlock: (hoveredBlockId) => set({ hoveredBlockId }),

  startDraggingBlock: (id) => {
    soundEngine.unlock();
    soundEngine.playWoodTap(0.7, 1.05);
    set({
      selectedBlockId: id,
      isDraggingBlock: true,
      currentTurnTouchedBlock: true,
      turnPhase: 'dragging',
    });
  },

  cancelDraggingBlock: () => {
    soundEngine.stopDragFriction();
    const { turnPhase } = get();
    if (turnPhase !== 'dragging') return;
    set({
      selectedBlockId: null,
      isDraggingBlock: false,
      turnPhase: 'ready',
    });
  },

  markBlockExtracted: (id) => {
    soundEngine.stopDragFriction();
    soundEngine.playBlockExtracted();
    set({
      selectedBlockId: id,
      isDraggingBlock: false,
      turnPhase: 'placing',
      isPlacementValid: true,
      feedbackToast: {
        message: 'Choose a highlighted slot on top & click to place',
        tone: 'aqua',
        nonce: Date.now(),
      },
    });
  },

  setPlacementValid: (isPlacementValid) => set({ isPlacementValid }),

  beginSettlingBlock: (blockId, newLevel, newSlot) => {
    soundEngine.playWoodTap(0.85, 0.92);
    const blocks = get().blocks.map((b) =>
      b.id === blockId
        ? {
            ...b,
            level: newLevel,
            slot: newSlot,
            orientation: (newLevel % 2 === 0 ? 0 : 1) as 0 | 1,
            isPlacedTop: true,
          }
        : b
    );
    const stats = getTowerLevelStats(blocks);
    set({
      blocks,
      selectedBlockId: null,
      isDraggingBlock: false,
      isPlacementValid: false,
      turnPhase: 'settling',
      towerHeightLevels: stats.totalHeightLevels,
      feedbackToast: { message: 'Holding steady...', tone: 'ivory', nonce: Date.now() },
    });
  },

  completeTurnAfterSettle: () => {
    const state = get();
    if (state.turnPhase !== 'settling') return;

    const nextMoves = state.movesCount + 1;
    const heightBonus = Math.max(0, state.towerHeightLevels - 18) * 25;
    const movePoints = 100 + nextMoves * 15 + heightBonus;
    const nextScore = state.score + movePoints;

    const currentMover = state.players[state.currentPlayerIndex];
    const updatedPlayers = state.players.map((p, idx) =>
      idx === state.currentPlayerIndex
        ? { ...p, moves: p.moves + 1, score: p.score + movePoints }
        : p
    );

    // Sync local move to Live Match room server if in live mode
    if (
      state.mode === 'live' &&
      state.liveRoom &&
      currentMover &&
      (currentMover.isLocal || (currentMover.isAI && state.liveRoom.players[0]?.id === state.liveClientId)) &&
      state.activeMoveVisual &&
      state.activeMoveVisual.toLevel !== undefined
    ) {
      const mv = state.activeMoveVisual;
      const nextSeq = state.appliedLiveMoveSeq + 1;
      set({ appliedLiveMoveSeq: nextSeq });
      liveMatchApi
        .submitMove(state.liveRoom.code, {
          playerId: currentMover.id,
          playerName: currentMover.name,
          playerColor: currentMover.color,
          blockId: mv.blockId,
          fromLevel: mv.fromLevel,
          fromSlot: mv.fromSlot,
          toLevel: mv.toLevel!,
          toSlot: (mv.toSlot ?? 0) as -1 | 0 | 1,
          points: movePoints,
        })
        .catch(() => {});
    }

    let nextBestScore = state.bestSoloScore;
    let nextBestMoves = state.bestSoloMoves;
    let isNewBest = state.isNewBest;

    // Track the local player's best score across ALL modes (Solo, Vs. Computer, Live Arena, Challenge, Pass & Play)
    const localPlayerAfterMove = updatedPlayers.find((p) => p.isLocal && !p.isAI);
    const playerEarnedScore =
      state.mode === 'live' || (state.mode === 'solo' && state.soloOpponent === 'computer')
        ? localPlayerAfterMove?.score ?? nextScore
        : nextScore;

    if (playerEarnedScore > nextBestScore) {
      nextBestScore = playerEarnedScore;
      nextBestMoves = Math.max(nextBestMoves, localPlayerAfterMove?.moves ?? nextMoves);
      isNewBest = true;
    }

    // Increment live player profile totalMoves & peakTowerHeight
    const earnedMoveXp = currentMover?.isLocal || !currentMover?.isAI ? 20 : 5;
    const nextProfile: PlayerProfile = {
      ...state.profile,
      xp: state.profile.xp + earnedMoveXp,
      totalMoves: state.profile.totalMoves + (currentMover?.isAI ? 0 : 1),
      peakTowerHeight: Math.max(state.profile.peakTowerHeight, state.towerHeightLevels),
    };

    // Check challenge victory!
    if (state.mode === 'challenge' && state.activeChallenge && nextMoves >= state.activeChallenge.targetMoves) {
      const completed = state.completedChallenges.includes(state.activeChallenge.id)
        ? state.completedChallenges
        : [...state.completedChallenges, state.activeChallenge.id];

      const bonusXp = 140;
      const challengeFinalScore = nextScore + 250;
      const historyEntry: MatchHistoryEntry = {
        id: `m-${Date.now()}`,
        modeLabel: `Challenge · ${state.activeChallenge.title}`,
        result: 'win',
        score: challengeFinalScore,
        moves: nextMoves,
        peakHeight: state.towerHeightLevels,
        xpEarned: earnedMoveXp + bonusXp,
        timestamp: Date.now(),
      };
      const finalProfile: PlayerProfile = {
        ...nextProfile,
        xp: nextProfile.xp + bonusXp,
        totalGames: nextProfile.totalGames + 1,
        totalWins: nextProfile.totalWins + 1,
        matchHistory: [historyEntry, ...nextProfile.matchHistory].slice(0, 12),
      };

      soundEngine.playVictory();
      set({
        movesCount: nextMoves,
        score: challengeFinalScore,
        bestSoloScore: Math.max(nextBestScore, challengeFinalScore),
        bestSoloMoves: Math.max(nextBestMoves, nextMoves),
        players: updatedPlayers,
        completedChallenges: completed,
        profile: finalProfile,
        lastMatchXpEarned: earnedMoveXp * nextMoves + bonusXp,
        matchRecordedForRunId: state.runId,
        turnPhase: 'victory',
        activeMoveVisual: null,
        feedbackToast: { message: 'Challenge Complete!', tone: 'aqua', nonce: Date.now() },
      });
      persistCurrent(get());
      syncProfileToGlobalLeaderboard(get());
      return;
    }

    const isTurnBased =
      state.mode === 'passAndPlay' ||
      state.mode === 'live' ||
      (state.mode === 'solo' && state.soloOpponent === 'computer');

    let nextPlayerIdx = 0;
    if (isTurnBased) {
      for (let step = 1; step <= updatedPlayers.length; step++) {
        const candidate = (state.currentPlayerIndex + step) % updatedPlayers.length;
        if (!updatedPlayers[candidate]?.eliminated) {
          nextPlayerIdx = candidate;
          break;
        }
      }
    }

    soundEngine.playPlacementSuccess();
    soundEngine.playCrowdCheer(0.92);
    if (isTurnBased) {
      setTimeout(() => soundEngine.playTurnChange(), 260);
    }

    const nextPlayer = updatedPlayers[nextPlayerIdx];
    const completedMove = state.activeMoveVisual
      ? { ...state.activeMoveVisual, stage: 'completed' as const, timestamp: Date.now() }
      : state.lastCompletedMove;

    set({
      movesCount: nextMoves,
      score: nextScore,
      streak: state.streak + 1,
      players: updatedPlayers,
      currentPlayerIndex: nextPlayerIdx,
      lastMoverPlayerIndex: state.currentPlayerIndex,
      currentTurnTouchedBlock: false,
      bestSoloScore: nextBestScore,
      bestSoloMoves: nextBestMoves,
      profile: nextProfile,
      isNewBest,
      turnPhase: 'ready',
      activeMoveVisual: null,
      lastCompletedMove: completedMove,
      feedbackToast: isTurnBased
        ? {
            message: nextPlayer.isAI
              ? `${nextPlayer.name}'s turn — watch closely!`
              : `${nextPlayer.name === 'You' ? 'Your' : `${nextPlayer.name}'s`} turn`,
            tone: 'aqua',
            nonce: Date.now(),
          }
        : { message: `+${movePoints} pts — Solid placement`, tone: 'aqua', nonce: Date.now() },
    });
    persistCurrent(get());
    if (isNewBest) {
      syncProfileToGlobalLeaderboard(get());
    }
  },

  triggerCollapse: (reason, fromRemote = false) => {
    const state = get();
    if (
      state.screen !== 'playing' ||
      state.turnPhase === 'collapsing' ||
      state.turnPhase === 'gameover' ||
      state.turnPhase === 'victory'
    ) {
      return;
    }

    soundEngine.stopDragFriction();
    soundEngine.playCollapseTrigger();

    const isMultiPlayerElimination =
      (state.mode === 'passAndPlay' || state.mode === 'live') && state.players.length > 2;

    // Official Jenga attribution rule:
    // If the tower collapses while 'ready' BEFORE the next player has even touched a block on their turn,
    // the collapse was caused by the previous mover (lastMoverPlayerIndex), never the idle next player!
    const responsiblePlayerIndex =
      !fromRemote &&
      state.turnPhase === 'ready' &&
      !state.currentTurnTouchedBlock &&
      state.lastMoverPlayerIndex !== null &&
      state.lastMoverPlayerIndex >= 0 &&
      state.lastMoverPlayerIndex < state.players.length
        ? state.lastMoverPlayerIndex
        : state.currentPlayerIndex;

    const updatedPlayers = isMultiPlayerElimination
      ? state.players.map((p, idx) =>
          idx === responsiblePlayerIndex
            ? { ...p, eliminated: true, eliminatedRound: state.roundNumber }
            : p
        )
      : state.players;

    const remainingSurvivors = updatedPlayers.filter((p) => !p.eliminated);
    const hasMoreRounds = isMultiPlayerElimination && remainingSurvivors.length > 1;

    const loser = updatedPlayers[responsiblePlayerIndex];
    const champion = remainingSurvivors.length === 1 ? remainingSurvivors[0] : null;

    const humanWonVsAi =
      state.mode === 'solo' && state.soloOpponent === 'computer' && Boolean(loser?.isAI);
    const localWonLive =
      state.mode === 'live' &&
      !hasMoreRounds &&
      Boolean(champion ? champion.id === state.liveClientId : loser && loser.id !== state.liveClientId);
    const isMatchWin = humanWonVsAi || localWonLive;

    // Always play loud stadium boo + sad disappointment when someone collapses the tower!
    soundEngine.playCrowdBoo();
    // If this collapse crowned the user as the final champion, follow with celebratory fanfare
    if (isMatchWin) {
      setTimeout(() => soundEngine.playVictory(), 1200);
    }

    if (state.mode === 'live' && state.liveRoom && !fromRemote) {
      liveMatchApi.reportCollapse(state.liveRoom.code, responsiblePlayerIndex).catch(() => {});
    }

    const nextSoloAiWins = humanWonVsAi ? state.soloAiWins + 1 : state.soloAiWins;
    const bonusXp = isMatchWin ? 130 : hasMoreRounds ? 30 : 35;
    const modeLabel =
      state.mode === 'live'
        ? `Live · ${state.liveRoom?.name ?? 'Arena'}`
        : state.mode === 'solo'
          ? state.soloOpponent === 'computer'
            ? 'Solo · Vs. Computer'
            : 'Solo · Endless'
          : state.mode === 'passAndPlay'
            ? 'Pass & Play'
            : `Challenge · ${state.activeChallenge?.title ?? ''}`;

    // Only log final match history when the tournament/match actually finishes (1 clear winner or solo end)
    const localFinalPlayer = updatedPlayers.find((p) => p.isLocal && !p.isAI);
    const victoryScoreBonus = isMatchWin ? 250 : 0;
    const matchEarnedScore =
      (state.mode === 'live' || (state.mode === 'solo' && state.soloOpponent === 'computer')
        ? localFinalPlayer?.score ?? state.score
        : state.score) + victoryScoreBonus;
    const nextBestScoreAfterMatch = Math.max(state.bestSoloScore, matchEarnedScore);

    let nextProfile = state.profile;
    if (!hasMoreRounds && state.matchRecordedForRunId !== state.runId) {
      const historyEntry: MatchHistoryEntry = {
        id: `m-${Date.now()}`,
        modeLabel,
        result: isMatchWin ? 'win' : state.mode === 'solo' && state.soloOpponent === 'alone' ? 'completed' : 'loss',
        score: matchEarnedScore,
        moves: state.movesCount,
        peakHeight: state.towerHeightLevels,
        xpEarned: bonusXp + state.movesCount * 15,
        timestamp: Date.now(),
      };
      nextProfile = {
        ...state.profile,
        xp: state.profile.xp + bonusXp,
        totalGames: state.profile.totalGames + 1,
        totalWins: state.profile.totalWins + (isMatchWin ? 1 : 0),
        liveWins: state.profile.liveWins + (localWonLive ? 1 : 0),
        peakTowerHeight: Math.max(state.profile.peakTowerHeight, state.towerHeightLevels),
        matchHistory: [historyEntry, ...state.profile.matchHistory].slice(0, 12),
      };
    }

    set({
      players: updatedPlayers,
      turnPhase: 'collapsing',
      isDraggingBlock: false,
      selectedBlockId: null,
      loserPlayerIndex: responsiblePlayerIndex,
      eliminatedThisRoundIndex: responsiblePlayerIndex,
      soloAiWins: nextSoloAiWins,
      bestSoloScore: nextBestScoreAfterMatch,
      profile: nextProfile,
      lastMatchXpEarned: bonusXp + state.movesCount * 15,
      matchRecordedForRunId: hasMoreRounds ? state.matchRecordedForRunId : state.runId,
      feedbackToast: {
        message: hasMoreRounds
          ? `${loser?.name} eliminated! ${remainingSurvivors.length} players advance to Round ${state.roundNumber + 1}`
          : humanWonVsAi
            ? 'Computer toppled the tower — You win!'
            : champion
              ? `${champion.name} is the Champion!`
              : reason || 'Timber! The tower collapsed.',
        tone: isMatchWin ? 'aqua' : 'tangerine',
        nonce: Date.now(),
      },
    });
    persistCurrent(get());
    if (!hasMoreRounds) {
      syncProfileToGlobalLeaderboard(get());
    }
  },

  finishCollapseToGameOver: () => {
    const state = get();
    if (state.turnPhase !== 'collapsing') return;
    set({ turnPhase: 'gameover' });
  },

  tickChallengeTimer: (dt) => {
    const state = get();
    if (
      state.screen !== 'playing' ||
      state.isPaused ||
      state.timeRemaining === null ||
      state.turnPhase === 'collapsing' ||
      state.turnPhase === 'gameover' ||
      state.turnPhase === 'victory'
    ) {
      return;
    }
    const next = Math.max(0, state.timeRemaining - dt);
    if (next <= 0) {
      soundEngine.stopDragFriction();
      soundEngine.playCollapseTrigger();
      set({
        timeRemaining: 0,
        turnPhase: 'gameover',
        loserPlayerIndex: state.currentPlayerIndex,
        feedbackToast: { message: "Time's up!", tone: 'tangerine', nonce: Date.now() },
      });
    } else {
      set({ timeRemaining: next });
    }
  },

  showFeedback: (message, tone = 'ivory') =>
    set({ feedbackToast: { message, tone, nonce: Date.now() } }),

  setActiveMoveVisual: (activeMoveVisual) => set({ activeMoveVisual }),

  focusCameraAzimuth: (azimuth) =>
    set({ cameraCommand: { type: 'focusAzimuth', azimuth, nonce: Date.now() + Math.random() } }),

  dispatchCameraCommand: (type) =>
    set({ cameraCommand: { type, nonce: Date.now() + Math.random() } }),

  updateSettings: (partial) => {
    const state = get();
    const nextSettings = { ...state.settings, ...partial };
    soundEngine.updateSettings(nextSettings);
    set({ settings: nextSettings });
    persistCurrent({ ...state, settings: nextSettings });
  },
}));
