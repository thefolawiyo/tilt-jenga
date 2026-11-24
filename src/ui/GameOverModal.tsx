import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Award, Crown, Home, Layers, RotateCcw, Trophy, Users } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { soundEngine } from '../audio/soundEngine';

export const GameOverModal: React.FC = () => {
  const mode = useGameStore((s) => s.mode);
  const soloOpponent = useGameStore((s) => s.soloOpponent);
  const soloAiWins = useGameStore((s) => s.soloAiWins);
  const roundNumber = useGameStore((s) => s.roundNumber);
  const lastMatchXpEarned = useGameStore((s) => s.lastMatchXpEarned);
  const liveClientId = useGameStore((s) => s.liveClientId);
  const turnPhase = useGameStore((s) => s.turnPhase);
  const activeChallenge = useGameStore((s) => s.activeChallenge);
  const players = useGameStore((s) => s.players);
  const loserPlayerIndex = useGameStore((s) => s.loserPlayerIndex);
  const movesCount = useGameStore((s) => s.movesCount);
  const score = useGameStore((s) => s.score);
  const bestSoloScore = useGameStore((s) => s.bestSoloScore);
  const isNewBest = useGameStore((s) => s.isNewBest);
  const towerHeightLevels = useGameStore((s) => s.towerHeightLevels);
  const reducedMotion = useGameStore((s) => s.settings.reducedMotion);

  const startNextEliminationRound = useGameStore((s) => s.startNextEliminationRound);
  const restartGame = useGameStore((s) => s.restartGame);
  const returnToMenu = useGameStore((s) => s.returnToMenu);
  const setScreen = useGameStore((s) => s.setScreen);

  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    if (reducedMotion) {
      setDisplayScore(score);
      return;
    }
    const startTime = performance.now();
    const duration = 680;
    let raf = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayScore(Math.round(score * eased));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [score, reducedMotion]);

  const isVictory = turnPhase === 'victory';
  const isVsComputer = mode === 'solo' && soloOpponent === 'computer';
  const isLive = mode === 'live';
  const isMultiElimination = (mode === 'passAndPlay' || isLive) && players.length > 2;
  const isCompetitive = mode === 'passAndPlay' || isVsComputer || isLive;

  const loser = loserPlayerIndex !== null ? players[loserPlayerIndex] : players[0];

  // For 3-4 player tournaments, surviving players continue to the next round until 1 clear champion remains!
  const remainingSurvivors = isMultiElimination
    ? players.filter((p) => !p.eliminated)
    : players.filter((_, idx) => idx !== loserPlayerIndex);

  const hasNextRound = isMultiElimination && remainingSurvivors.length > 1;
  const clearChampion =
    !hasNextRound && isCompetitive && remainingSurvivors.length === 1
      ? remainingSurvivors[0]
      : null;

  const humanWonVsComputer = isVsComputer && Boolean(loser?.isAI);
  const localWonLive = isLive && !hasNextRound && Boolean(clearChampion?.id === liveClientId);

  const headline = isVictory
    ? 'Challenge Cleared'
    : hasNextRound
      ? `${loser?.name ?? 'Player'} Eliminated!`
      : humanWonVsComputer || localWonLive
        ? 'You Are The Champion!'
        : clearChampion
          ? `${clearChampion.name} Wins!`
          : isVsComputer
            ? 'Computer Wins'
            : 'Everything Fell';

  const eyebrow = isVictory
    ? activeChallenge?.title ?? 'Objective Complete'
    : hasNextRound
      ? `Round ${roundNumber} Over · ${remainingSurvivors.length} Players Left`
      : humanWonVsComputer
        ? 'Computer Toppled The Tower'
        : clearChampion
          ? isMultiElimination
            ? `Tournament Champion · Round ${roundNumber}`
            : `${loser?.name ?? 'Opponent'} Toppled The Tower`
          : mode === 'challenge'
            ? 'Challenge Failed'
            : 'Tower Collapsed';

  return (
    <motion.div
      className="modal-backdrop pointer-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reducedMotion ? 0.01 : 0.35 }}
    >
      <motion.div
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-label={headline}
        initial={reducedMotion ? false : { y: 24, scale: 0.95, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <div>
          <span
            className="eyebrow"
            style={{
              color:
                isVictory || humanWonVsComputer || localWonLive || Boolean(clearChampion && !isVsComputer)
                  ? 'var(--accent-aqua)'
                  : 'var(--accent-tangerine)',
            }}
          >
            {eyebrow}{' '}
            {!hasNextRound && lastMatchXpEarned > 0 ? `· +${lastMatchXpEarned} XP` : ''}
          </span>
          <h2 className="modal-title">{headline}</h2>
        </div>

        {/* Elimination Round Advancement Banner (3-4 player matches with 2+ remaining) */}
        {hasNextRound && (
          <div className="result-winner-banner">
            <div>
              <div className="hud-label" style={{ color: 'var(--accent-aqua)' }}>
                {remainingSurvivors.length === 2
                  ? 'Advancing To Final Round'
                  : `Advancing To Round ${roundNumber + 1}`}
              </div>
              <div className="font-display" style={{ fontSize: 18, fontWeight: 700 }}>
                {remainingSurvivors.map((w) => w.name).join(' · ')}
              </div>
            </div>
            <Users size={25} color="#64E5D2" />
          </div>
        )}

        {/* Clear Single Champion Banner */}
        {!hasNextRound && clearChampion && (
          <div className="result-winner-banner">
            <div>
              <div className="hud-label" style={{ color: 'var(--accent-aqua)' }}>
                {isVsComputer && humanWonVsComputer
                  ? `Clear Winner · ${soloAiWins} Total AI Wins`
                  : 'Last Player Standing · Clear Winner'}
              </div>
              <div className="font-display" style={{ fontSize: 21, fontWeight: 700 }}>
                {clearChampion.name}
              </div>
            </div>
            {isMultiElimination ? (
              <Crown size={28} color="#F5D061" />
            ) : (
              <Trophy size={26} color="#64E5D2" />
            )}
          </div>
        )}

        {mode === 'solo' && soloOpponent === 'alone' && isNewBest && score > 0 && (
          <div className="result-winner-banner">
            <div>
              <div className="hud-label" style={{ color: 'var(--accent-aqua)' }}>
                Personal Record
              </div>
              <div className="font-display" style={{ fontSize: 18, fontWeight: 700 }}>
                New Best Solo Score!
              </div>
            </div>
            <Award size={24} color="#64E5D2" />
          </div>
        )}

        <div className="result-stats-grid">
          <div className="result-stat-box">
            <span className="hud-label">Score</span>
            <span className="result-stat-num" style={{ color: 'var(--accent-aqua)' }}>
              {displayScore.toLocaleString()}
            </span>
          </div>
          <div className="result-stat-box">
            <span className="hud-label">Moves</span>
            <span className="result-stat-num">{movesCount}</span>
          </div>
          <div className="result-stat-box">
            <span className="hud-label">
              {mode === 'solo' && soloOpponent === 'alone' ? 'Best Score' : 'Peak Height'}
            </span>
            <span className="result-stat-num">
              {mode === 'solo' && soloOpponent === 'alone'
                ? bestSoloScore.toLocaleString()
                : `${towerHeightLevels}L`}
            </span>
          </div>
        </div>

        {isCompetitive && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              padding: '12px 14px',
              background: 'var(--bg-midnight)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 10,
            }}
          >
            <div className="hud-label">Tournament Standings</div>
            {players.map((p, idx) => {
              const isElim = Boolean(p.eliminated) || (!isMultiElimination && idx === loserPlayerIndex);
              const isChamp = clearChampion?.id === p.id;
              return (
                <div
                  key={p.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: 13.5,
                    color: isChamp
                      ? 'var(--accent-aqua)'
                      : isElim
                        ? 'var(--accent-tangerine)'
                        : 'var(--text-ivory)',
                    opacity: isElim && idx !== loserPlayerIndex ? 0.65 : 1,
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <span className="player-dot" style={{ backgroundColor: p.color }} />
                    {p.name}{' '}
                    {isChamp
                      ? '(Winner)'
                      : idx === loserPlayerIndex
                        ? isMultiElimination
                          ? `(Eliminated R${roundNumber})`
                          : '(Collapsed)'
                        : p.eliminated
                          ? `(Out R${p.eliminatedRound ?? 1})`
                          : '(Safe)'}
                  </span>
                  <span className="font-mono">
                    {p.moves}m · {p.score.toLocaleString()} pts
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <div className="modal-stack">
          {hasNextRound ? (
            <button
              className="btn-primary"
              onClick={startNextEliminationRound}
            >
              {remainingSurvivors.length === 2
                ? `Start Final Round (${remainingSurvivors.length} Left)`
                : `Start Round ${roundNumber + 1} (${remainingSurvivors.length} Left)`}
              <ArrowRight size={16} />
            </button>
          ) : (
            <button
              className="btn-primary"
              onClick={() => {
                soundEngine.playUiClick(1.1);
                restartGame();
              }}
            >
              <RotateCcw size={16} />
              Play Again
            </button>
          )}
          <button
            className="btn-secondary"
            onClick={() => {
              soundEngine.playUiClick(1.0);
              setScreen('modeSelect');
            }}
          >
            <Layers size={16} />
            Change Game Mode
          </button>
          <button className="btn-ghost" onClick={returnToMenu}>
            <Home size={15} />
            Main Menu
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
