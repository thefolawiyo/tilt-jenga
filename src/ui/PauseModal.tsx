import React from 'react';
import { motion } from 'framer-motion';
import {
  HelpCircle,
  Home,
  Play,
  RotateCcw,
  Settings,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { soundEngine } from '../audio/soundEngine';

export const PauseModal: React.FC = () => {
  const setPaused = useGameStore((s) => s.setPaused);
  const restartGame = useGameStore((s) => s.restartGame);
  const returnToMenu = useGameStore((s) => s.returnToMenu);
  const setSettingsOpen = useGameStore((s) => s.setSettingsOpen);
  const setInstructionsOpen = useGameStore((s) => s.setInstructionsOpen);
  const settings = useGameStore((s) => s.settings);
  const updateSettings = useGameStore((s) => s.updateSettings);

  return (
    <motion.div
      className="modal-backdrop pointer-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: settings.reducedMotion ? 0.01 : 0.2 }}
    >
      <motion.div
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Game Paused"
        initial={settings.reducedMotion ? false : { scale: 0.96, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.97, opacity: 0 }}
      >
        <div className="modal-header">
          <div>
            <span className="eyebrow">Simulation Suspended</span>
            <h2 className="modal-title">Paused</h2>
          </div>
          <button
            className="btn-icon"
            aria-label="Resume game"
            onClick={() => {
              soundEngine.playUiClick(1.08);
              setPaused(false);
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Quick Audio Control */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 14px',
            background: 'var(--bg-midnight)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 3,
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontSize: 14 }}>
            {settings.muted ? <VolumeX size={17} /> : <Volume2 size={17} />}
            Master Sound
          </span>
          <button
            className="pill-btn active"
            onClick={() => {
              soundEngine.unlock();
              updateSettings({ muted: !settings.muted });
            }}
          >
            {settings.muted ? 'Muted' : `${Math.round(settings.masterVolume * 100)}%`}
          </button>
        </div>

        <div className="modal-stack">
          <button
            className="btn-primary"
            onClick={() => {
              soundEngine.playUiClick(1.1);
              setPaused(false);
            }}
          >
            <Play size={16} fill="currentColor" />
            Resume Game
          </button>
          <button
            className="btn-secondary"
            onClick={() => {
              soundEngine.playUiClick(1.0);
              restartGame();
            }}
          >
            <RotateCcw size={16} />
            Restart Tower
          </button>
          <button
            className="btn-secondary"
            onClick={() => {
              soundEngine.playUiClick(1.0);
              setInstructionsOpen(true);
            }}
          >
            <HelpCircle size={16} />
            How to Play
          </button>
          <button
            className="btn-secondary"
            onClick={() => {
              soundEngine.playUiClick(1.0);
              setSettingsOpen(true);
            }}
          >
            <Settings size={16} />
            Settings
          </button>
          <button className="btn-ghost" onClick={returnToMenu}>
            <Home size={15} />
            Return to Main Menu
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export const InstructionsModal: React.FC = () => {
  const setInstructionsOpen = useGameStore((s) => s.setInstructionsOpen);
  const reducedMotion = useGameStore((s) => s.settings.reducedMotion);

  return (
    <motion.div
      className="modal-backdrop pointer-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={() => setInstructionsOpen(false)}
    >
      <motion.div
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-label="How to Play TILT"
        onClick={(e) => e.stopPropagation()}
        initial={reducedMotion ? false : { scale: 0.96, y: 12 }}
        animate={{ scale: 1, y: 0 }}
      >
        <div className="modal-header">
          <div>
            <span className="eyebrow">Rules of Balance</span>
            <h2 className="modal-title">How to Play</h2>
          </div>
          <button
            className="btn-icon"
            aria-label="Close instructions"
            onClick={() => {
              soundEngine.playUiClick();
              setInstructionsOpen(false);
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div className="instructions-list">
          <div className="instruction-step">
            <span className="step-num">01</span>
            <p>
              <strong>Inspect &amp; Orbit:</strong> Drag anywhere around the tower (or use bottom
              controls) to rotate and inspect weight distribution before touching a block.
            </p>
          </div>
          <div className="instruction-step">
            <span className="step-num">02</span>
            <p>
              <strong>Extract a Block:</strong> Click or touch any glowing block{' '}
              <strong>below the top 3 completed levels</strong> and pull smoothly along its length
              until it clears the tower.
            </p>
          </div>
          <div className="instruction-step">
            <span className="step-num">03</span>
            <p>
              <strong>Stack on Top:</strong> Guide the extracted block into one of the highlighted
              90-degree alternating slots on top, then click (or press Space) to drop it gently.
            </p>
          </div>
          <div className="instruction-step">
            <span className="step-num">04</span>
            <p>
              <strong>Keep It Standing:</strong> Physics governs every contact. If any upper block
              topples onto the pedestal or tumbles off, the tower collapses and the match ends.
            </p>
          </div>
        </div>

        <button
          className="btn-primary"
          onClick={() => {
            soundEngine.playUiClick(1.08);
            setInstructionsOpen(false);
          }}
        >
          Got It
        </button>
      </motion.div>
    </motion.div>
  );
};
