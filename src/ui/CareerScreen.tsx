import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Award,
  Check,
  CheckCircle2,
  Edit3,
  Flame,
  History,
  Layers,
  Play,
  Trophy,
} from 'lucide-react';
import { useGameStore, getLevelFromXp } from '../store/useGameStore';
import { CHALLENGES } from '../engine/constants';
import { TopHubNav } from './TopHubNav';
import { soundEngine } from '../audio/soundEngine';

export const CareerScreen: React.FC = () => {
  const profile = useGameStore((s) => s.profile);
  const bestSoloScore = useGameStore((s) => s.bestSoloScore);
  const soloAiWins = useGameStore((s) => s.soloAiWins);
  const completedChallenges = useGameStore((s) => s.completedChallenges);
  const updateCallsign = useGameStore((s) => s.updateCallsign);
  const startChallengeGame = useGameStore((s) => s.startChallengeGame);
  const startSoloGame = useGameStore((s) => s.startSoloGame);
  const reducedMotion = useGameStore((s) => s.settings.reducedMotion);

  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(profile.callsign);

  const lvl = getLevelFromXp(profile.xp);
  const winRate =
    profile.totalGames > 0 ? Math.round((profile.totalWins / profile.totalGames) * 100) : 0;

  const saveName = () => {
    soundEngine.playUiClick(1.08);
    updateCallsign(draftName);
    setEditingName(false);
  };

  const formatTimeAgo = (ts: number) => {
    const mins = Math.max(0, Math.floor((Date.now() - ts) / 60000));
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <motion.div
      className="hub-screen-overlay pointer-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reducedMotion ? 0.01 : 0.25 }}
    >
      <TopHubNav />

      <div className="hub-screen-body">
        {/* Player Profile & Level Progress Hero */}
        <div className="career-hero-card">
          <div className="career-identity">
            <div className="career-level-emblem">
              <span className="career-level-label">LVL</span>
              <span className="career-level-num">{lvl.level}</span>
            </div>

            <div style={{ flex: 1, minWidth: 200 }}>
              <span className="eyebrow">Player Career &amp; Progress</span>
              {editingName ? (
                <div className="career-name-edit">
                  <input
                    className="player-input"
                    value={draftName}
                    maxLength={18}
                    onChange={(e) => setDraftName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveName();
                    }}
                    autoFocus
                  />
                  <button className="btn-primary btn-sm" onClick={saveName}>
                    <Check size={15} /> Save
                  </button>
                </div>
              ) : (
                <div className="career-name-row">
                  <h2>{profile.callsign}</h2>
                  <button
                    className="btn-ghost btn-sm"
                    onClick={() => {
                      setDraftName(profile.callsign);
                      setEditingName(true);
                    }}
                  >
                    <Edit3 size={14} /> Rename
                  </button>
                </div>
              )}

              <div className="career-xp-block">
                <div className="career-xp-labels">
                  <span>Season XP Progress</span>
                  <span className="font-mono" style={{ color: 'var(--accent-aqua)' }}>
                    {lvl.currentXp} / {lvl.nextXp} XP ({lvl.pct}%)
                  </span>
                </div>
                <div className="career-xp-track">
                  <div className="career-xp-fill" style={{ width: `${lvl.pct}%` }} />
                </div>
              </div>
            </div>
          </div>

          <button className="btn-primary" onClick={() => startSoloGame('alone')}>
            <Play size={16} fill="currentColor" /> Quick Match
          </button>
        </div>

        {/* 4 Core Progress Stat Cards */}
        <div className="career-stats-grid">
          <div className="career-stat-card" style={{ '--stat-accent': '#64E5D2' } as React.CSSProperties}>
            <div className="career-stat-icon"><Trophy size={18} /></div>
            <div className="hud-label">Best Solo Score</div>
            <div className="career-stat-value">{bestSoloScore.toLocaleString()}</div>
            <div className="career-stat-sub">{profile.totalMoves} total blocks pulled</div>
          </div>

          <div className="career-stat-card" style={{ '--stat-accent': '#FF9B65' } as React.CSSProperties}>
            <div className="career-stat-icon"><Flame size={18} /></div>
            <div className="hud-label">Total Wins</div>
            <div className="career-stat-value">{profile.totalWins}</div>
            <div className="career-stat-sub">
              {soloAiWins} vs AI · {profile.liveWins} Live · {winRate}% win rate
            </div>
          </div>

          <div className="career-stat-card" style={{ '--stat-accent': '#8581FF' } as React.CSSProperties}>
            <div className="career-stat-icon"><Layers size={18} /></div>
            <div className="hud-label">Peak Tower Height</div>
            <div className="career-stat-value">{profile.peakTowerHeight} Levels</div>
            <div className="career-stat-sub">{profile.totalGames} matches played</div>
          </div>

          <div className="career-stat-card" style={{ '--stat-accent': '#F5D061' } as React.CSSProperties}>
            <div className="career-stat-icon"><Award size={18} /></div>
            <div className="hud-label">Challenges Cleared</div>
            <div className="career-stat-value">
              {completedChallenges.length} / {CHALLENGES.length}
            </div>
            <div className="career-stat-sub">Complete all 4 for Master badge</div>
          </div>
        </div>

        {/* Lower Split: Challenge Milestones + Recent Match History */}
        <div className="career-lower-grid">
          <div className="mode-config-panel">
            <div className="config-panel-header">
              <h3>Challenge Progress</h3>
              <span className="mode-badge">
                {Math.round((completedChallenges.length / CHALLENGES.length) * 100)}% Complete
              </span>
            </div>
            <div className="career-checklist">
              {CHALLENGES.map((ch) => {
                const done = completedChallenges.includes(ch.id);
                return (
                  <div key={ch.id} className={`career-check-row ${done ? 'done' : ''}`}>
                    <div>
                      <strong>{ch.title}</strong>
                      <div className="career-stat-sub">{ch.subtitle}</div>
                    </div>
                    {done ? (
                      <span className="challenge-done-badge">
                        <CheckCircle2 size={15} /> Cleared
                      </span>
                    ) : (
                      <button
                        className="pill-btn active"
                        onClick={() => startChallengeGame(ch.id)}
                      >
                        Play
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mode-config-panel">
            <div className="config-panel-header">
              <h3 style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <History size={18} /> Recent Matches
              </h3>
              <span className="mode-badge">{profile.matchHistory.length} Logged</span>
            </div>

            {profile.matchHistory.length === 0 ? (
              <div className="empty-state-box">
                Play your first match in Solo, Vs. Computer, or Live Arena — your match history and
                XP progress will track here automatically.
              </div>
            ) : (
              <div className="career-checklist">
                {profile.matchHistory.slice(0, 6).map((m) => (
                  <div key={m.id} className="career-check-row">
                    <div>
                      <strong>{m.modeLabel}</strong>
                      <div className="career-stat-sub">
                        {m.moves} moves · {m.peakHeight}L · {formatTimeAgo(m.timestamp)}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span
                        className={`result-chip ${
                          m.result === 'win'
                            ? 'chip-win'
                            : m.result === 'loss'
                              ? 'chip-loss'
                              : 'chip-done'
                        }`}
                      >
                        {m.result === 'win'
                          ? 'WIN'
                          : m.result === 'loss'
                            ? 'LOSS'
                            : `${m.score.toLocaleString()} pts`}
                      </span>
                      <div className="career-stat-sub" style={{ color: 'var(--accent-aqua)' }}>
                        +{m.xpEarned} XP
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
