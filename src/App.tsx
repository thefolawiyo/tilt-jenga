import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { TiltCanvas } from './scene/TiltCanvas';
import { MainMenu } from './ui/MainMenu';
import { ModeSelect } from './ui/ModeSelect';
import { SceneSelectScreen } from './ui/SceneSelectScreen';
import { LeaderboardScreen } from './ui/LeaderboardScreen';
import { CareerScreen } from './ui/CareerScreen';
import { CreateLiveScreen, JoinLiveScreen, LiveLobbyScreen } from './ui/LiveMatchScreens';
import { GameplayHUD } from './ui/GameplayHUD';
import { InstructionsModal, PauseModal } from './ui/PauseModal';
import { GameOverModal } from './ui/GameOverModal';
import { SettingsModal } from './ui/SettingsModal';
import { TiltLogo } from './ui/TiltLogo';
import { useGameStore } from './store/useGameStore';
import { extractRoomCode } from './services/liveMatchApi';
import { soundEngine } from './audio/soundEngine';

export const App: React.FC = () => {
  const screen = useGameStore((s) => s.screen);
  const selectedSceneId = useGameStore((s) => s.selectedSceneId);
  const sceneTransitionName = useGameStore((s) => s.sceneTransitionName);
  const mode = useGameStore((s) => s.mode);
  const turnPhase = useGameStore((s) => s.turnPhase);
  const isPaused = useGameStore((s) => s.isPaused);
  const isSettingsOpen = useGameStore((s) => s.isSettingsOpen);
  const isInstructionsOpen = useGameStore((s) => s.isInstructionsOpen);

  const setPaused = useGameStore((s) => s.setPaused);
  const setSettingsOpen = useGameStore((s) => s.setSettingsOpen);
  const setInstructionsOpen = useGameStore((s) => s.setInstructionsOpen);
  const setScreen = useGameStore((s) => s.setScreen);
  const setPendingJoinCode = useGameStore((s) => s.setPendingJoinCode);
  const pollLiveRoom = useGameStore((s) => s.pollLiveRoom);
  const dispatchCameraCommand = useGameStore((s) => s.dispatchCameraCommand);

  const [sceneReady, setSceneReady] = useState(false);

  // Detect shareable invite link (?join=CODE) on load and open Join Live Match pre-filled!
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const joinParam = params.get('join');
    if (joinParam) {
      const code = extractRoomCode(joinParam);
      if (code) {
        setPendingJoinCode(code);
        setScreen('joinLive');
      }
    }
  }, [setPendingJoinCode, setScreen]);

  // Live Match turn & room sync polling during active online gameplay
  useEffect(() => {
    if (screen !== 'playing' || mode !== 'live') return;
    const id = window.setInterval(() => {
      pollLiveRoom();
    }, 1100);
    return () => window.clearInterval(id);
  }, [screen, mode, pollLiveRoom]);

  // Sync dynamic arena crowd ambiance, selected scene soundscape & suspense ducking
  useEffect(() => {
    const activeScene = screen === 'menu' ? 'boxing-ring' : selectedSceneId;
    soundEngine.setSceneAmbience(activeScene);
  }, [screen, selectedSceneId]);

  useEffect(() => {
    const inGameplay = screen === 'playing' && !isPaused;
    const isTense =
      inGameplay && (turnPhase === 'dragging' || turnPhase === 'settling');
    soundEngine.setArenaState(inGameplay, isTense);
  }, [screen, turnPhase, isPaused]);

  // Global keyboard shortcuts (Esc to pause/close modals, R to reset camera)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'Escape') {
        if (isSettingsOpen) {
          setSettingsOpen(false);
        } else if (isInstructionsOpen) {
          setInstructionsOpen(false);
        } else if (screen === 'playing' && turnPhase !== 'gameover' && turnPhase !== 'victory') {
          soundEngine.playUiClick();
          setPaused(!isPaused);
        }
      } else if ((e.key === 'r' || e.key === 'R') && screen === 'playing' && !isPaused) {
        dispatchCameraCommand('reset');
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    screen,
    turnPhase,
    isPaused,
    isSettingsOpen,
    isInstructionsOpen,
    setPaused,
    setSettingsOpen,
    setInstructionsOpen,
    dispatchCameraCommand,
  ]);

  useEffect(() => {
    const t = setTimeout(() => setSceneReady(true), 1200);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="app-root">
      {/* Persistent Live 3D Jenga World */}
      <TiltCanvas onSceneReady={() => setSceneReady(true)} />

      {/* Initial Studio Loading Curtain */}
      <AnimatePresence>
        {!sceneReady && (
          <motion.div
            className="loading-curtain"
            style={{ pointerEvents: sceneReady ? 'none' : 'auto' }}
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, pointerEvents: 'none' }}
            transition={{ duration: 0.45 }}
          >
            <TiltLogo size="lg" />
            <div className="loading-bar-track">
              <div className="loading-bar-fill" />
            </div>
            <span className="loading-caption">Initializing Physics Engine</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Screen UI Overlays */}
      <div className="ui-layer">
        <AnimatePresence mode="wait">
          {screen === 'menu' && <MainMenu key="menu" />}
          {screen === 'modeSelect' && <ModeSelect key="modeSelect" />}
          {screen === 'sceneSelect' && <SceneSelectScreen key="sceneSelect" />}
          {screen === 'leaderboard' && <LeaderboardScreen key="leaderboard" />}
          {screen === 'career' && <CareerScreen key="career" />}
          {screen === 'createLive' && <CreateLiveScreen key="createLive" />}
          {screen === 'joinLive' && <JoinLiveScreen key="joinLive" />}
          {screen === 'liveLobby' && <LiveLobbyScreen key="liveLobby" />}
          {screen === 'playing' && <GameplayHUD key="playing" />}
        </AnimatePresence>

        {/* Scene Transition Loading Curtain */}
        <AnimatePresence>
          {sceneTransitionName && (
            <motion.div
              key="scene-loading"
              className="loading-curtain scene-transition-curtain"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
            >
              <span className="eyebrow" style={{ color: 'var(--accent-aqua)' }}>
                Entering Arena
              </span>
              <h2 className="scene-transition-title">{sceneTransitionName}</h2>
              <div className="loading-bar-track">
                <div className="loading-bar-fill" />
              </div>
              <span className="loading-caption">Preparing environment &amp; tower physics</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modals */}
        <AnimatePresence>
          {screen === 'playing' && isPaused && !isSettingsOpen && !isInstructionsOpen && (
            <PauseModal key="pause" />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {screen === 'playing' && (turnPhase === 'gameover' || turnPhase === 'victory') && (
            <GameOverModal key="gameover" />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isSettingsOpen && <SettingsModal key="settings" />}
        </AnimatePresence>

        <AnimatePresence>
          {isInstructionsOpen && <InstructionsModal key="instructions" />}
        </AnimatePresence>
      </div>
    </div>
  );
};
export default App;
