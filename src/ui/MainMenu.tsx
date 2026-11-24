import React from 'react';
import { motion } from 'framer-motion';
import { Bot, Play, Plus, Radio } from 'lucide-react';
import { TopHubNav } from './TopHubNav';
import { useGameStore, getLevelFromXp } from '../store/useGameStore';
import { soundEngine } from '../audio/soundEngine';
import { CHALLENGES } from '../engine/constants';

export const MainMenu: React.FC = () => {
  const openScenePickerFor = useGameStore((s) => s.openScenePickerFor);
  const setScreen = useGameStore((s) => s.setScreen);
  const bestSoloScore = useGameStore((s) => s.bestSoloScore);
  const profile = useGameStore((s) => s.profile);
  const completedChallenges = useGameStore((s) => s.completedChallenges);
  const reducedMotion = useGameStore((s) => s.settings.reducedMotion);

  const lvl = getLevelFromXp(profile.xp);
  const transition = reducedMotion ? { duration: 0.01 } : { duration: 0.42, ease: [0.22, 1, 0.36, 1] };

  return (
    <motion.div
      className="main-menu"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={transition}
    >
      {/* Modern AAA Game-Hub Top Navigation */}
      <TopHubNav />

      {/* Asymmetrical Editorial Hero Left Column — 3D Tower commands the right */}
      <motion.section
        className="menu-hero pointer-auto"
        initial={reducedMotion ? false : { y: 18, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ ...transition, delay: reducedMotion ? 0 : 0.06 }}
      >
        <div className="menu-tag-row">
          <span className="menu-tag-line" />
          <span className="eyebrow">54 Blocks · Live Boxing Ring Physics</span>
        </div>

        <h1 className="menu-headline">
          One wrong move.
          <br />
          <span className="menu-headline-accent">Everything falls.</span>
        </h1>

        <p className="menu-subtitle">
          Test your balance solo, battle the Computer, or challenge up to 4 friends anywhere in a
          live online ring.
        </p>

        <div className="menu-cta-row">
          <button
            className="btn-primary"
            onClick={() => openScenePickerFor({ kind: 'solo', opponent: 'alone' })}
          >
            <Play size={17} fill="currentColor" />
            Play Solo
          </button>
          <button
            className="btn-secondary"
            onClick={() => openScenePickerFor({ kind: 'solo', opponent: 'computer' })}
          >
            <Bot size={16} />
            Vs. Computer
          </button>
        </div>

        <div className="menu-cta-row menu-live-row">
          <button
            className="btn-live-create"
            onClick={() => {
              soundEngine.unlock();
              soundEngine.playUiClick(1.06);
              setScreen('createLive');
            }}
          >
            <Plus size={16} />
            Create Live Match
          </button>
          <button
            className="btn-secondary"
            onClick={() => {
              soundEngine.unlock();
              soundEngine.playUiClick(1.04);
              setScreen('joinLive');
            }}
          >
            <Radio size={15} />
            Join Live Match
          </button>
        </div>
      </motion.section>

      {/* Bottom Personal Progress & XP Strip */}
      <motion.footer
        className="menu-footer pointer-auto"
        initial={reducedMotion ? false : { y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ ...transition, delay: reducedMotion ? 0 : 0.14 }}
      >
        <button
          className="menu-stat-strip menu-stat-clickable"
          onClick={() => {
            soundEngine.playUiClick(1.04);
            setScreen('career');
          }}
          title="Open Career & Match History"
        >
          <div className="menu-stat-item">
            <span className="menu-stat-label">Level {lvl.level}</span>
            <span className="menu-stat-value" style={{ color: 'var(--accent-aqua)' }}>
              {lvl.currentXp}/{lvl.nextXp} XP
            </span>
          </div>
          <div className="menu-stat-item">
            <span className="menu-stat-label">Best Solo</span>
            <span className="menu-stat-value">{bestSoloScore.toLocaleString()}</span>
          </div>
          <div className="menu-stat-item">
            <span className="menu-stat-label">Wins</span>
            <span className="menu-stat-value">{profile.totalWins}</span>
          </div>
          <div className="menu-stat-item">
            <span className="menu-stat-label">Challenges</span>
            <span className="menu-stat-value">
              {completedChallenges.length}/{CHALLENGES.length}
            </span>
          </div>
        </button>

        <div className="menu-footnote">Balance Versus Chaos · TILT Arena</div>
      </motion.footer>
    </motion.div>
  );
};
