import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Compass,
  HelpCircle,
  Pause,
  RotateCcw,
  RotateCw,
  Settings,
  Volume2,
  VolumeX,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { TiltLogo } from './TiltLogo';
import { soundEngine } from '../audio/soundEngine';

/** Smoothly animates score transitions */
const AnimatedNumber: React.FC<{ value: number }> = ({ value }) => {
  const [displayed, setDisplayed] = useState(value);

  useEffect(() => {
    const start = displayed;
    const diff = value - start;
    if (diff === 0) return;
    const duration = 360;
    const startTime = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const t = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayed(Math.round(start + diff * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return <>{displayed.toLocaleString()}</>;
};

export const GameplayHUD: React.FC = () => {
  const mode = useGameStore((s) => s.mode);
  const soloOpponent = useGameStore((s) => s.soloOpponent);
  const liveRoom = useGameStore((s) => s.liveRoom);
  const roundNumber = useGameStore((s) => s.roundNumber);
  const activeChallenge = useGameStore((s) => s.activeChallenge);
  const players = useGameStore((s) => s.players);
  const currentPlayerIndex = useGameStore((s) => s.currentPlayerIndex);
  const movesCount = useGameStore((s) => s.movesCount);
  const score = useGameStore((s) => s.score);
  const towerHeightLevels = useGameStore((s) => s.towerHeightLevels);
  const turnPhase = useGameStore((s) => s.turnPhase);
  const timeRemaining = useGameStore((s) => s.timeRemaining);
  const feedbackToast = useGameStore((s) => s.feedbackToast);
  const activeMoveVisual = useGameStore((s) => s.activeMoveVisual);
  const lastCompletedMove = useGameStore((s) => s.lastCompletedMove);
  const settings = useGameStore((s) => s.settings);

  const slotLabel = (slot?: -1 | 0 | 1) =>
    slot === 0 ? 'Center' : slot === -1 ? 'Left' : slot === 1 ? 'Right' : '';

  const moveTracker = activeMoveVisual ?? lastCompletedMove;

  const setPaused = useGameStore((s) => s.setPaused);
  const setSettingsOpen = useGameStore((s) => s.setSettingsOpen);
  const setInstructionsOpen = useGameStore((s) => s.setInstructionsOpen);
  const updateSettings = useGameStore((s) => s.updateSettings);
  const dispatchCameraCommand = useGameStore((s) => s.dispatchCameraCommand);

  const activePlayer = players[currentPlayerIndex] ?? players[0];

  const isTurnBased =
    mode === 'passAndPlay' || mode === 'live' || (mode === 'solo' && soloOpponent === 'computer');

  const isMultiElimination =
    (mode === 'passAndPlay' || mode === 'live') && players.length > 2;
  const roundSuffix = isMultiElimination ? ` · R${roundNumber}` : '';

  const modeLabel =
    mode === 'live'
      ? `Live · ${liveRoom?.code ?? 'Arena'}${roundSuffix}`
      : mode === 'solo'
        ? soloOpponent === 'computer'
          ? 'Solo · Vs. Computer'
          : 'Solo Mode'
        : mode === 'passAndPlay'
          ? `Pass & Play${roundSuffix}`
          : activeChallenge?.title ?? 'Challenge';

  const formatTimer = (sec: number) => {
    const whole = Math.ceil(sec);
    const m = Math.floor(whole / 60);
    const s = whole % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const waitingOnRemote = mode === 'live' && activePlayer && !activePlayer.isLocal && !activePlayer.isAI;

  const hintText = activePlayer?.isAI
    ? `${activePlayer.name} is taking its turn — drag background to orbit and watch closely.`
    : waitingOnRemote
      ? `Waiting for ${activePlayer.name} to make their move...`
      : turnPhase === 'placing'
        ? 'Move pointer over a highlighted top slot, then click or press Space to drop.'
        : turnPhase === 'dragging'
          ? 'Pull smoothly along the block length until it clears the tower.'
          : turnPhase === 'settling'
            ? 'Checking tower stability...'
            : 'Drag a block below the top 3 levels. Drag background to orbit camera.';

  return (
    <div className="hud-root">
      {/* Top Bar */}
      <div>
        <header className="hud-top">
          <div className="hud-brand-group pointer-auto">
            <TiltLogo size="sm" />
            <span className="hud-mode-pill">{modeLabel}</span>
          </div>

          <div className="hud-top-actions pointer-auto">
            <button
              className="btn-icon"
              aria-label={settings.muted ? 'Unmute audio' : 'Mute audio'}
              title={settings.muted ? 'Unmute' : 'Mute'}
              onClick={() => {
                soundEngine.unlock();
                updateSettings({ muted: !settings.muted });
              }}
            >
              {settings.muted ? <VolumeX size={17} /> : <Volume2 size={17} />}
            </button>
            <button
              className="btn-icon"
              aria-label="How to play"
              title="How to Play"
              onClick={() => {
                soundEngine.playUiClick();
                setInstructionsOpen(true);
              }}
            >
              <HelpCircle size={17} />
            </button>
            <button
              className="btn-icon"
              aria-label="Settings"
              title="Settings"
              onClick={() => {
                soundEngine.playUiClick();
                setSettingsOpen(true);
              }}
            >
              <Settings size={17} />
            </button>
            <button
              className="btn-icon"
              aria-label="Pause game"
              title="Pause (Esc)"
              onClick={() => {
                soundEngine.playUiClick();
                setPaused(true);
              }}
            >
              <Pause size={17} />
            </button>
          </div>
        </header>

        {/* Desktop Left Telemetry Column */}
        <aside className="hud-telemetry-column">
          <motion.div
            key={`turn-${activePlayer?.id}-${currentPlayerIndex}`}
            className="hud-card hud-turn-card"
            style={{
              borderColor: `${activePlayer?.color ?? '#20E3B2'}66`,
            }}
            initial={settings.reducedMotion ? false : { x: -8, opacity: 0.75 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.25 }}
          >
            <div className="hud-label">
              {isTurnBased ? 'Active Turn' : 'Player'}
            </div>
            <div className="hud-player-name-row">
              <span
                className="player-dot"
                style={{ backgroundColor: activePlayer?.color ?? '#20E3B2' }}
              />
              <span className="hud-player-name">{activePlayer?.name}</span>
            </div>

            {isTurnBased && players.length > 1 && (
              <div className="hud-players-mini">
                {players.map((p, idx) => (
                  <div
                    key={p.id}
                    className={`hud-player-row ${idx === currentPlayerIndex && !p.eliminated ? 'active' : ''}`}
                    style={p.eliminated ? { opacity: 0.42, textDecoration: 'line-through' } : undefined}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <span className="player-dot" style={{ backgroundColor: p.color }} />
                      {p.name}
                    </span>
                    <span className="font-mono">{p.eliminated ? 'OUT' : `${p.moves}m`}</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          <div className="hud-card">
            <div className="hud-label">Score</div>
            <div className="hud-score-val">
              <AnimatedNumber value={score} />
            </div>

            <div className="hud-metrics-grid" style={{ marginTop: 12 }}>
              <div>
                <div className="hud-label">Moves</div>
                <div className="hud-metric-val">
                  {mode === 'challenge' && activeChallenge
                    ? `${movesCount}/${activeChallenge.targetMoves}`
                    : movesCount}
                </div>
              </div>
              <div>
                <div className="hud-label">Levels</div>
                <div className="hud-metric-val">{towerHeightLevels}</div>
              </div>
            </div>

            {timeRemaining !== null && (
              <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border-subtle)' }}>
                <div className="hud-label">Time Left</div>
                <div
                  className={`hud-metric-val ${timeRemaining <= 15 ? 'hud-timer-urgent' : ''}`}
                >
                  {formatTimer(timeRemaining)}
                </div>
              </div>
            )}
          </div>

          {moveTracker && (
            <div className="hud-card hud-move-tracker">
              <div className="hud-label">
                {activeMoveVisual ? 'Live Brick Move' : 'Last Move'}
              </div>
              <div className="hud-move-actor">
                <span className="player-dot" style={{ backgroundColor: moveTracker.playerColor }} />
                <span style={{ color: moveTracker.playerColor }}>{moveTracker.playerName}</span>
              </div>
              <div className="font-mono" style={{ fontSize: 12, color: 'var(--text-ivory)', lineHeight: 1.45 }}>
                L{moveTracker.fromLevel + 1} ({slotLabel(moveTracker.fromSlot)})
                {moveTracker.toLevel !== undefined && (
                  <> → L{moveTracker.toLevel + 1} ({slotLabel(moveTracker.toSlot)})</>
                )}
              </div>
            </div>
          )}
        </aside>

        {/* Mobile Native Compact Telemetry Strip (<= 780px: single slim 48px pill + micro move pill!) */}
        <div className="hud-mobile-bar-wrap">
          <div className="hud-mobile-strip">
            <div className="hud-mobile-turn">
              <span
                className="hud-mobile-turn-dot"
                style={{ backgroundColor: activePlayer?.color ?? '#20E3B2' }}
              />
              <div className="hud-mobile-turn-copy">
                <span className="hud-mobile-micro-label">
                  {isTurnBased ? 'Turn' : 'Player'}
                </span>
                <span className="hud-mobile-turn-name">{activePlayer?.name}</span>
              </div>
            </div>

            <div className="hud-mobile-divider" />

            <div className="hud-mobile-stats">
              <div className="hud-mobile-stat">
                <span className="hud-mobile-micro-label">Score</span>
                <span className="hud-mobile-stat-val hud-mobile-score">
                  <AnimatedNumber value={score} />
                </span>
              </div>
              <div className="hud-mobile-stat">
                <span className="hud-mobile-micro-label">Moves</span>
                <span className="hud-mobile-stat-val">
                  {mode === 'challenge' && activeChallenge
                    ? `${movesCount}/${activeChallenge.targetMoves}`
                    : movesCount}
                </span>
              </div>
              <div className="hud-mobile-stat">
                <span className="hud-mobile-micro-label">
                  {timeRemaining !== null ? 'Time' : 'Lvls'}
                </span>
                <span
                  className={`hud-mobile-stat-val ${
                    timeRemaining !== null && timeRemaining <= 15 ? 'hud-timer-urgent' : ''
                  }`}
                >
                  {timeRemaining !== null ? formatTimer(timeRemaining) : towerHeightLevels}
                </span>
              </div>
            </div>
          </div>

          {moveTracker && (
            <div className="hud-mobile-move-pill">
              <span className="player-dot" style={{ backgroundColor: moveTracker.playerColor }} />
              <span className="hud-mobile-move-who" style={{ color: moveTracker.playerColor }}>
                {moveTracker.playerName}
              </span>
              <span className="hud-mobile-move-path font-mono">
                L{moveTracker.fromLevel + 1} {slotLabel(moveTracker.fromSlot)}
                {moveTracker.toLevel !== undefined
                  ? ` → L${moveTracker.toLevel + 1} ${slotLabel(moveTracker.toSlot)}`
                  : ''}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Contextual Feedback Banner */}
      <div className="hud-toast-anchor">
        <AnimatePresence mode="wait">
          {feedbackToast && (
            <motion.div
              key={feedbackToast.nonce}
              className={`hud-toast ${
                feedbackToast.tone === 'aqua'
                  ? 'hud-toast-aqua'
                  : feedbackToast.tone === 'tangerine'
                    ? 'hud-toast-tangerine'
                    : ''
              }`}
              initial={settings.reducedMotion ? false : { opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
            >
              {feedbackToast.message}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Controls: Hints + Camera Rig Controls */}
      <footer className="hud-bottom">
        {settings.showHints ? (
          <div className="hud-hint-box">
            <strong>
              {turnPhase === 'placing'
                ? 'Placement Mode: '
                : turnPhase === 'dragging'
                  ? 'Extracting: '
                  : 'Controls: '}
            </strong>
            {hintText}
          </div>
        ) : (
          <div />
        )}

        <div className="hud-camera-bar pointer-auto" role="group" aria-label="Camera controls">
          <button
            className="hud-camera-btn"
            aria-label="Rotate camera left"
            title="Rotate Left"
            onClick={() => {
              soundEngine.playUiClick(0.95);
              dispatchCameraCommand('rotateLeft');
            }}
          >
            <RotateCcw size={16} />
          </button>
          <button
            className="hud-camera-btn"
            aria-label="Rotate camera right"
            title="Rotate Right"
            onClick={() => {
              soundEngine.playUiClick(1.05);
              dispatchCameraCommand('rotateRight');
            }}
          >
            <RotateCw size={16} />
          </button>
          <span className="hud-camera-divider" />
          <button
            className="hud-camera-btn"
            aria-label="Zoom in"
            title="Zoom In"
            onClick={() => {
              soundEngine.playUiClick(1.08);
              dispatchCameraCommand('zoomIn');
            }}
          >
            <ZoomIn size={16} />
          </button>
          <button
            className="hud-camera-btn"
            aria-label="Zoom out"
            title="Zoom Out"
            onClick={() => {
              soundEngine.playUiClick(0.92);
              dispatchCameraCommand('zoomOut');
            }}
          >
            <ZoomOut size={16} />
          </button>
          <span className="hud-camera-divider" />
          <button
            className="hud-camera-btn"
            aria-label="Reset camera view"
            title="Reset Camera (R)"
            onClick={() => {
              soundEngine.playUiClick(1.0);
              dispatchCameraCommand('reset');
            }}
          >
            <Compass size={16} />
            <span>Reset</span>
          </button>
        </div>
      </footer>
    </div>
  );
};
