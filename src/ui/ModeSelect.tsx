import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Clock,
  Flame,
  Target,
  User,
  Users,
} from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { CHALLENGES, PALETTE, PLAYER_COLORS } from '../engine/constants';
import { AiDifficulty, SoloOpponent } from '../types/game';
import { soundEngine } from '../audio/soundEngine';
import { TopHubNav } from './TopHubNav';

type ActiveTab = 'solo' | 'passAndPlay' | 'challenge';

export const ModeSelect: React.FC = () => {
  const setScreen = useGameStore((s) => s.setScreen);
  const startSoloGame = useGameStore((s) => s.startSoloGame);
  const startPassAndPlayGame = useGameStore((s) => s.startPassAndPlayGame);
  const startChallengeGame = useGameStore((s) => s.startChallengeGame);
  const bestSoloScore = useGameStore((s) => s.bestSoloScore);
  const soloAiWins = useGameStore((s) => s.soloAiWins);
  const completedChallenges = useGameStore((s) => s.completedChallenges);
  const reducedMotion = useGameStore((s) => s.settings.reducedMotion);

  const [selectedTab, setSelectedTab] = useState<ActiveTab>('solo');
  const [soloChoice, setSoloChoice] = useState<SoloOpponent>('alone');
  const [aiDiff, setAiDiff] = useState<AiDifficulty>('casual');
  const [playerCount, setPlayerCount] = useState<number>(2);
  const [playerNames, setPlayerNames] = useState<string[]>([
    'Player 1',
    'Player 2',
    'Player 3',
    'Player 4',
  ]);

  const handleNameChange = (idx: number, val: string) => {
    setPlayerNames((prev) => prev.map((n, i) => (i === idx ? val : n)));
  };

  return (
    <motion.div
      className="hub-screen-overlay pointer-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reducedMotion ? 0.01 : 0.28 }}
    >
      <TopHubNav />

      <div className="hub-screen-body">
        <div className="mode-title-block">
          <span className="eyebrow">Choose Your Arena</span>
          <h2>Select Game Mode</h2>
          <p>Three ways to push gravity to its breaking point.</p>
        </div>

        <div className="mode-grid">
          {/* Solo Mode */}
          <button
            className={`mode-card ${selectedTab === 'solo' ? 'mode-card-selected' : ''}`}
            style={{ '--card-accent': PALETTE.electricAqua } as React.CSSProperties}
            onClick={() => {
              soundEngine.playUiClick(1.0);
              setSelectedTab('solo');
            }}
            onDoubleClick={() => startSoloGame(soloChoice, aiDiff)}
          >
            <div>
              <div className="mode-card-top">
                <div className="mode-icon-box">
                  <User size={22} />
                </div>
                <span className="mode-badge">Endless</span>
              </div>
              <h3 style={{ marginTop: 18 }}>Solo Mode</h3>
              <p>
                Play on your own for a high score, or go head-to-head against the Computer where
                whoever topples the tower loses.
              </p>
            </div>
            <div className="mode-card-footer">
              <span>
                Best: {bestSoloScore.toLocaleString()} · AI Wins: {soloAiWins}
              </span>
              <ArrowRight size={15} />
            </div>
          </button>

          {/* Pass & Play */}
          <button
            className={`mode-card ${selectedTab === 'passAndPlay' ? 'mode-card-selected' : ''}`}
            style={{ '--card-accent': PALETTE.vividPeriwinkle } as React.CSSProperties}
            onClick={() => {
              soundEngine.playUiClick(1.04);
              setSelectedTab('passAndPlay');
            }}
          >
            <div>
              <div className="mode-card-top">
                <div className="mode-icon-box">
                  <Users size={22} />
                </div>
                <span className="mode-badge">2–4 Players</span>
              </div>
              <h3 style={{ marginTop: 18 }}>Pass &amp; Play</h3>
              <p>
                Take turns on the same device. Hand over the controls after each clean stack —
                whoever topples the tower loses.
              </p>
            </div>
            <div className="mode-card-footer">
              <span>Local Multiplayer</span>
              <ArrowRight size={15} />
            </div>
          </button>

          {/* Challenge Mode */}
          <button
            className={`mode-card ${selectedTab === 'challenge' ? 'mode-card-selected' : ''}`}
            style={{ '--card-accent': PALETTE.warmTangerine } as React.CSSProperties}
            onClick={() => {
              soundEngine.playUiClick(1.08);
              setSelectedTab('challenge');
            }}
          >
            <div>
              <div className="mode-card-top">
                <div className="mode-icon-box">
                  <Target size={22} />
                </div>
                <span className="mode-badge">
                  {completedChallenges.length}/{CHALLENGES.length} Done
                </span>
              </div>
              <h3 style={{ marginTop: 18 }}>Challenge Mode</h3>
              <p>
                Curated physics scenarios: precarious single-pillar towers, speed trials, and
                high-altitude precision runs.
              </p>
            </div>
            <div className="mode-card-footer">
              <span>4 Curated Trials</span>
              <ArrowRight size={15} />
            </div>
          </button>
        </div>

        {/* Context-Aware Configuration Drawer */}
        {selectedTab === 'solo' && (
          <motion.div
            key="solo-config"
            className="mode-config-panel"
            initial={reducedMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="config-panel-header">
              <div>
                <h3>Solo Setup — Choose How to Play</h3>
                <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 13.5 }}>
                  {soloChoice === 'alone'
                    ? 'Just you against gravity. Extract blocks below the top 3 rows and stack as high as you can.'
                    : 'Take turns with the Computer inside the boxing ring. Whoever collapses the tower loses!'}
                </p>
              </div>
              <div className="player-count-pills">
                <button
                  className={`pill-btn ${soloChoice === 'alone' ? 'active' : ''}`}
                  onClick={() => {
                    soundEngine.playUiClick(1.0);
                    setSoloChoice('alone');
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <User size={13} />
                    Play Alone
                  </span>
                </button>
                <button
                  className={`pill-btn ${soloChoice === 'computer' ? 'active' : ''}`}
                  onClick={() => {
                    soundEngine.playUiClick(1.06);
                    setSoloChoice('computer');
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Bot size={13} />
                    Vs. Computer
                  </span>
                </button>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              {soloChoice === 'computer' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="eyebrow" style={{ color: 'var(--text-muted)' }}>
                    AI Skill:
                  </span>
                  <button
                    className={`pill-btn ${aiDiff === 'casual' ? 'active' : ''}`}
                    onClick={() => {
                      soundEngine.playUiClick(0.98);
                      setAiDiff('casual');
                    }}
                  >
                    Casual
                  </button>
                  <button
                    className={`pill-btn ${aiDiff === 'sharp' ? 'active' : ''}`}
                    onClick={() => {
                      soundEngine.playUiClick(1.08);
                      setAiDiff('sharp');
                    }}
                  >
                    Sharp
                  </button>
                </div>
              ) : (
                <span className="eyebrow" style={{ color: 'var(--accent-aqua)' }}>
                  54-Block Standard Tower · Endless Scoring
                </span>
              )}

              <button
                className="btn-primary"
                onClick={() => startSoloGame(soloChoice, aiDiff)}
              >
                {soloChoice === 'computer' ? 'Start Vs. Computer' : 'Start Solo Run'}
                <ArrowRight size={16} />
              </button>
            </div>
          </motion.div>
        )}

        {selectedTab === 'passAndPlay' && (
          <motion.div
            key="pnp-config"
            className="mode-config-panel"
            initial={reducedMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="config-panel-header">
              <h3>Pass &amp; Play Roster</h3>
              <div className="player-count-pills">
                {[2, 3, 4].map((count) => (
                  <button
                    key={count}
                    className={`pill-btn ${playerCount === count ? 'active' : ''}`}
                    onClick={() => {
                      soundEngine.playUiClick(1.0);
                      setPlayerCount(count);
                    }}
                  >
                    {count} Players
                  </button>
                ))}
              </div>
            </div>

            <div className="player-inputs-grid">
              {Array.from({ length: playerCount }).map((_, idx) => (
                <div key={idx} className="player-input-wrap">
                  <label className="player-input-label" htmlFor={`player-name-${idx}`}>
                    <span
                      className="player-dot"
                      style={{ backgroundColor: PLAYER_COLORS[idx % PLAYER_COLORS.length] }}
                    />
                    Player {idx + 1}
                  </label>
                  <input
                    id={`player-name-${idx}`}
                    className="player-input"
                    type="text"
                    maxLength={18}
                    value={playerNames[idx]}
                    onChange={(e) => handleNameChange(idx, e.target.value)}
                    placeholder={`Player ${idx + 1}`}
                  />
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                className="btn-primary"
                onClick={() => startPassAndPlayGame(playerNames.slice(0, playerCount))}
              >
                Launch Match
                <ArrowRight size={16} />
              </button>
            </div>
          </motion.div>
        )}

        {selectedTab === 'challenge' && (
          <motion.div
            key="challenge-config"
            className="mode-config-panel"
            initial={reducedMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="config-panel-header">
              <h3>Select a Challenge</h3>
              <span className="eyebrow" style={{ color: 'var(--accent-tangerine)' }}>
                Pick a trial to begin immediately
              </span>
            </div>

            <div className="challenge-list-grid">
              {CHALLENGES.map((ch) => {
                const isDone = completedChallenges.includes(ch.id);
                return (
                  <button
                    key={ch.id}
                    className="challenge-item"
                    onClick={() => startChallengeGame(ch.id)}
                  >
                    <div>
                      <div className="challenge-item-head">
                        <h4>{ch.title}</h4>
                        {isDone ? (
                          <span className="challenge-done-badge">
                            <CheckCircle2 size={14} />
                            Cleared
                          </span>
                        ) : (
                          <span className="challenge-diff">{ch.difficulty}</span>
                        )}
                      </div>
                      <p style={{ marginTop: 6 }}>{ch.description}</p>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: 12,
                        fontFamily: 'var(--font-mono)',
                        color: ch.accentColor,
                      }}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        {ch.timeLimitSeconds ? <Clock size={13} /> : <Flame size={13} />}
                        {ch.subtitle}
                      </span>
                      <ArrowRight size={14} />
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};
