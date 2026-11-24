import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Crown, Flame, Layers, Medal, Play, RefreshCw, Trophy } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { TopHubNav } from './TopHubNav';
import { soundEngine } from '../audio/soundEngine';

type SortKey = 'bestScore' | 'wins' | 'peakHeight';

export const LeaderboardScreen: React.FC = () => {
  const getLeaderboard = useGameStore((s) => s.getLeaderboard);
  const fetchLeaderboard = useGameStore((s) => s.fetchLeaderboard);
  const globalLeaderboard = useGameStore((s) => s.globalLeaderboard);
  const leaderboardLoading = useGameStore((s) => s.leaderboardLoading);
  const profile = useGameStore((s) => s.profile);
  const bestSoloScore = useGameStore((s) => s.bestSoloScore);
  const startSoloGame = useGameStore((s) => s.startSoloGame);
  const setScreen = useGameStore((s) => s.setScreen);
  const reducedMotion = useGameStore((s) => s.settings.reducedMotion);
  const [sortBy, setSortBy] = useState<SortKey>('bestScore');

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const ranked = useMemo(() => {
    const entries = getLeaderboard();
    return [...entries].sort((a, b) => b[sortBy] - a[sortBy] || b.bestScore - a.bestScore);
  }, [getLeaderboard, globalLeaderboard, profile, bestSoloScore, sortBy]);

  const userRankIdx = ranked.findIndex((e) => e.isCurrentUser);
  const userRank = userRankIdx >= 0 ? userRankIdx + 1 : null;
  const topThree = ranked.slice(0, 3);

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
        <div className="hub-section-head">
          <div>
            <span className="eyebrow">Live Global Standings</span>
            <h2>Leaderboard</h2>
            <p>
              {ranked.length === 0 ? (
                'No scores posted yet. Finish a Solo, Vs. Computer, or Live Match to claim the #1 spot.'
              ) : userRank ? (
                <>
                  Your current rank:{' '}
                  <strong style={{ color: 'var(--accent-aqua)' }}>#{userRank}</strong> of{' '}
                  {ranked.length} {ranked.length === 1 ? 'contender' : 'contenders'}. Play Solo,
                  Vs. Computer, or Live Matches to climb.
                </>
              ) : (
                `${ranked.length} ranked ${ranked.length === 1 ? 'contender' : 'contenders'} on the board. Play a match to post your score.`
              )}
            </p>
          </div>

          <div className="player-count-pills">
            <button
              className={`pill-btn ${sortBy === 'bestScore' ? 'active' : ''}`}
              onClick={() => {
                soundEngine.playUiClick(1.0);
                setSortBy('bestScore');
              }}
            >
              <span className="inline-icon-label">
                <Trophy size={13} /> Top Scores
              </span>
            </button>
            <button
              className={`pill-btn ${sortBy === 'wins' ? 'active' : ''}`}
              onClick={() => {
                soundEngine.playUiClick(1.04);
                setSortBy('wins');
              }}
            >
              <span className="inline-icon-label">
                <Flame size={13} /> Most Wins
              </span>
            </button>
            <button
              className={`pill-btn ${sortBy === 'peakHeight' ? 'active' : ''}`}
              onClick={() => {
                soundEngine.playUiClick(1.08);
                setSortBy('peakHeight');
              }}
            >
              <span className="inline-icon-label">
                <Layers size={13} /> Tallest Tower
              </span>
            </button>
            <button
              className="pill-btn"
              onClick={() => {
                soundEngine.playUiClick(1.0);
                fetchLeaderboard();
              }}
              disabled={leaderboardLoading}
              aria-label="Refresh leaderboard"
            >
              <span className="inline-icon-label">
                <RefreshCw size={13} /> {leaderboardLoading ? 'Syncing...' : 'Refresh'}
              </span>
            </button>
          </div>
        </div>

        {ranked.length === 0 ? (
          <div className="mode-config-panel" style={{ alignItems: 'center', textAlign: 'center', padding: '42px 24px', gap: 16 }}>
            <Trophy size={38} style={{ color: 'var(--accent-aqua)' }} />
            <h3 style={{ margin: 0 }}>The Championship Board Is Wide Open</h3>
            <p style={{ maxWidth: 460, color: 'var(--text-muted)', margin: 0 }}>
              Be the first player on the global leaderboard. Complete a match in Solo, Vs. Computer,
              Challenge, or Live Arena and your rank will appear here automatically.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', marginTop: 6 }}>
              <button className="btn-primary" onClick={() => startSoloGame('alone')}>
                <Play size={16} fill="currentColor" /> Play First Match
              </button>
              <button className="btn-secondary" onClick={() => setScreen('createLive')}>
                Create Live Match
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Top Podium Cards */}
            <div className="podium-grid">
              {topThree.map((entry, idx) => {
                const rankNum = idx + 1;
                const accent =
                  rankNum === 1 ? '#F5D061' : rankNum === 2 ? '#C4D0E3' : '#FF9B65';
                return (
                  <div
                    key={entry.id}
                    className={`podium-card ${entry.isCurrentUser ? 'podium-card-you' : ''}`}
                    style={{ '--podium-accent': accent } as React.CSSProperties}
                  >
                    <div className="podium-card-top">
                      <span className="podium-rank" style={{ color: accent }}>
                        {rankNum === 1 ? <Crown size={18} /> : <Medal size={17} />} #{rankNum}
                      </span>
                      <span className="mode-badge">LVL {entry.level}</span>
                    </div>
                    <div className="podium-name">
                      {entry.callsign} {entry.isCurrentUser && <span className="you-tag">YOU</span>}
                    </div>
                    <div className="podium-region">{entry.region}</div>
                    <div className="podium-metric">
                      {sortBy === 'bestScore'
                        ? `${entry.bestScore.toLocaleString()} pts`
                        : sortBy === 'wins'
                          ? `${entry.wins} wins`
                          : `${entry.peakHeight} levels`}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Full Ranked Table */}
            <div className="leaderboard-table-card">
              <div className="lb-row lb-header">
                <span>Rank</span>
                <span>Player</span>
                <span>Level</span>
                <span>Best Score</span>
                <span>Wins</span>
                <span>Peak Height</span>
              </div>
              {ranked.map((entry, idx) => (
                <div
                  key={entry.id}
                  className={`lb-row ${entry.isCurrentUser ? 'lb-row-you' : ''}`}
                >
                  <span className="font-mono lb-rank-num">#{idx + 1}</span>
                  <span className="lb-player-cell">
                    <strong>{entry.callsign}</strong>
                    {entry.isCurrentUser && <span className="you-tag">YOU</span>}
                    <small>{entry.region}</small>
                  </span>
                  <span className="font-mono">LVL {entry.level}</span>
                  <span className="font-mono" style={{ color: 'var(--accent-aqua)', fontWeight: 700 }}>
                    {entry.bestScore.toLocaleString()}
                  </span>
                  <span className="font-mono">{entry.wins}</span>
                  <span className="font-mono">{entry.peakHeight}L</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
};
