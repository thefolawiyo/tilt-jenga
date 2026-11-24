import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Bot,
  Check,
  Copy,
  Globe,
  KeyRound,
  Link2,
  Lock,
  Play,
  Plus,
  Radio,
  RefreshCw,
  Users,
} from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { LiveRoomMode } from '../types/game';
import { buildInviteLink } from '../services/liveMatchApi';
import { TopHubNav } from './TopHubNav';
import { soundEngine } from '../audio/soundEngine';

const MODE_LABELS: Record<LiveRoomMode, { title: string; desc: string }> = {
  classic: {
    title: 'Classic 54-Block Tower',
    desc: 'Standard 18-level tower. Last player standing wins.',
  },
  blitz: {
    title: 'Speed Blitz (2m Clock)',
    desc: 'Fast-paced 2-minute arena showdown with live countdown.',
  },
  precarious: {
    title: 'Precarious Tower',
    desc: 'Starts pre-carved into tense single-pillar chokepoints.',
  },
};

/** ==================== CREATE LIVE MATCH SCREEN ==================== */
export const CreateLiveScreen: React.FC = () => {
  const profile = useGameStore((s) => s.profile);
  const createLiveMatch = useGameStore((s) => s.createLiveMatch);
  const setScreen = useGameStore((s) => s.setScreen);
  const liveLoading = useGameStore((s) => s.liveLoading);
  const liveError = useGameStore((s) => s.liveError);
  const reducedMotion = useGameStore((s) => s.settings.reducedMotion);

  const [playerName, setPlayerName] = useState(profile.callsign);
  const [roomName, setRoomName] = useState(`${profile.callsign}'s Ring`);
  const [roomMode, setRoomMode] = useState<LiveRoomMode>('classic');
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [maxPlayers, setMaxPlayers] = useState<2 | 3 | 4>(4);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createLiveMatch({
      roomName,
      playerName,
      mode: roomMode,
      visibility,
      maxPlayers,
    });
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

      <div className="hub-screen-body" style={{ maxWidth: 820 }}>
        <div className="hub-section-head">
          <div>
            <span className="eyebrow">Host Online Room · Up to 4 Players</span>
            <h2>Create Live Match</h2>
            <p>Configure your match rules and share a link or 6-character code for friends anywhere to join.</p>
          </div>
          <button
            className="btn-secondary"
            onClick={() => {
              soundEngine.playUiClick(0.95);
              setScreen('joinLive');
            }}
          >
            <Radio size={15} /> Join Live Match
          </button>
        </div>

        <form className="mode-config-panel" onSubmit={handleSubmit}>
          <div className="player-inputs-grid">
            <div className="player-input-wrap">
              <label className="player-input-label" htmlFor="host-name">
                Your Callsign
              </label>
              <input
                id="host-name"
                className="player-input"
                value={playerName}
                maxLength={18}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Your display name"
                required
              />
            </div>

            <div className="player-input-wrap">
              <label className="player-input-label" htmlFor="room-name">
                Match Title
              </label>
              <input
                id="room-name"
                className="player-input"
                value={roomName}
                maxLength={32}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="Friday Night Championship"
                required
              />
            </div>
          </div>

          {/* Mode Selection Cards */}
          <div>
            <div className="player-input-label" style={{ marginBottom: 10 }}>
              Select Match Mode
            </div>
            <div className="live-mode-picker">
              {(Object.keys(MODE_LABELS) as LiveRoomMode[]).map((m) => (
                <button
                  type="button"
                  key={m}
                  className={`live-mode-option ${roomMode === m ? 'active' : ''}`}
                  onClick={() => {
                    soundEngine.playUiClick(1.03);
                    setRoomMode(m);
                  }}
                >
                  <strong>{MODE_LABELS[m].title}</strong>
                  <span>{MODE_LABELS[m].desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Max Players & Visibility */}
          <div className="live-options-row">
            <div>
              <div className="player-input-label" style={{ marginBottom: 8 }}>
                Max Players (Up to 4)
              </div>
              <div className="player-count-pills">
                {([2, 3, 4] as const).map((n) => (
                  <button
                    type="button"
                    key={n}
                    className={`pill-btn ${maxPlayers === n ? 'active' : ''}`}
                    onClick={() => {
                      soundEngine.playUiClick(1.0);
                      setMaxPlayers(n);
                    }}
                  >
                    {n} Players
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="player-input-label" style={{ marginBottom: 8 }}>
                Room Visibility
              </div>
              <div className="player-count-pills">
                <button
                  type="button"
                  className={`pill-btn ${visibility === 'public' ? 'active' : ''}`}
                  onClick={() => {
                    soundEngine.playUiClick(1.0);
                    setVisibility('public');
                  }}
                >
                  <span className="inline-icon-label">
                    <Globe size={13} /> Public (Listed)
                  </span>
                </button>
                <button
                  type="button"
                  className={`pill-btn ${visibility === 'private' ? 'active' : ''}`}
                  onClick={() => {
                    soundEngine.playUiClick(1.04);
                    setVisibility('private');
                  }}
                >
                  <span className="inline-icon-label">
                    <Lock size={13} /> Private (Link/Code)
                  </span>
                </button>
              </div>
            </div>
          </div>

          {liveError && <div className="live-error-banner">{liveError}</div>}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setScreen('menu')}
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={liveLoading}>
              {liveLoading ? 'Creating Room...' : 'Create Live Match & Get Link'}
              <ArrowRight size={16} />
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
};

/** ==================== JOIN LIVE MATCH SCREEN (2 TABS: ENTER CODE | AVAILABLE LIVE MATCHES) ==================== */
export const JoinLiveScreen: React.FC = () => {
  const profile = useGameStore((s) => s.profile);
  const availableLiveRooms = useGameStore((s) => s.availableLiveRooms);
  const refreshLiveRooms = useGameStore((s) => s.refreshLiveRooms);
  const joinLiveMatch = useGameStore((s) => s.joinLiveMatch);
  const setScreen = useGameStore((s) => s.setScreen);
  const liveLoading = useGameStore((s) => s.liveLoading);
  const liveError = useGameStore((s) => s.liveError);
  const clearLiveError = useGameStore((s) => s.clearLiveError);
  const pendingJoinCode = useGameStore((s) => s.pendingJoinCode);
  const reducedMotion = useGameStore((s) => s.settings.reducedMotion);

  const [activeTab, setActiveTab] = useState<'code' | 'browse'>(pendingJoinCode ? 'code' : 'code');
  const [codeInput, setCodeInput] = useState(pendingJoinCode || '');
  const [playerName, setPlayerName] = useState(profile.callsign);

  useEffect(() => {
    refreshLiveRooms();
  }, [refreshLiveRooms]);

  useEffect(() => {
    if (pendingJoinCode) {
      setActiveTab('code');
      setCodeInput(pendingJoinCode);
    }
  }, [pendingJoinCode]);

  const handleCodeJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codeInput.trim()) return;
    await joinLiveMatch(codeInput, playerName);
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

      <div className="hub-screen-body" style={{ maxWidth: 920 }}>
        <div className="hub-section-head">
          <div>
            <span className="eyebrow">Multiplayer Arena · Up to 4 Players</span>
            <h2>Join Live Match</h2>
            <p>Enter a friend&apos;s room code or jump straight into an open live arena match.</p>
          </div>
          <button
            className="btn-primary"
            onClick={() => {
              soundEngine.playUiClick(1.06);
              setScreen('createLive');
            }}
          >
            <Plus size={16} /> Create Live Match
          </button>
        </div>

        {/* Two Required Tabs: Enter Code | Available Live Matches */}
        <div className="join-tabs-bar" role="tablist" aria-label="Join live match options">
          <button
            role="tab"
            aria-selected={activeTab === 'code'}
            className={`join-tab-btn ${activeTab === 'code' ? 'active' : ''}`}
            onClick={() => {
              soundEngine.playUiClick(1.0);
              clearLiveError();
              setActiveTab('code');
            }}
          >
            <KeyRound size={16} />
            <span>Enter Room Code</span>
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'browse'}
            className={`join-tab-btn ${activeTab === 'browse' ? 'active' : ''}`}
            onClick={() => {
              soundEngine.playUiClick(1.05);
              clearLiveError();
              setActiveTab('browse');
              refreshLiveRooms();
            }}
          >
            <Radio size={16} />
            <span>Available Live Matches ({availableLiveRooms.length})</span>
          </button>
        </div>

        {/* Player Name Bar shared by both tabs */}
        <div className="mode-config-panel">
          <div className="player-input-wrap" style={{ maxWidth: 320 }}>
            <label className="player-input-label" htmlFor="join-callsign">
              Your Display Name
            </label>
            <input
              id="join-callsign"
              className="player-input"
              value={playerName}
              maxLength={18}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter your name"
            />
          </div>

          {liveError && <div className="live-error-banner">{liveError}</div>}

          {/* TAB 1: ENTER CODE OR PASTE INVITE LINK */}
          {activeTab === 'code' && (
            <form className="join-code-panel" onSubmit={handleCodeJoin}>
              <div className="player-input-wrap" style={{ flex: 1 }}>
                <label className="player-input-label" htmlFor="room-code-input">
                  Room Code or Shared Invite Link
                </label>
                <input
                  id="room-code-input"
                  className="player-input room-code-input"
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value)}
                  placeholder="e.g. X7K9P2 or paste invite link"
                  required
                />
              </div>
              <button
                type="submit"
                className="btn-primary"
                disabled={liveLoading || !codeInput.trim()}
                style={{ alignSelf: 'flex-end', minHeight: 50 }}
              >
                {liveLoading ? 'Joining...' : 'Join Match'}
                <ArrowRight size={16} />
              </button>
            </form>
          )}

          {/* TAB 2: AVAILABLE LIVE MATCHES BROWSER */}
          {activeTab === 'browse' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="config-panel-header">
                <span className="eyebrow" style={{ color: 'var(--text-muted)' }}>
                  Open Public Arena Tables (Max 4 Players Per Room)
                </span>
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  onClick={() => {
                    soundEngine.playUiClick(1.0);
                    refreshLiveRooms();
                  }}
                >
                  <RefreshCw size={14} /> Refresh
                </button>
              </div>

              {availableLiveRooms.length === 0 ? (
                <div className="empty-state-box">
                  No open public matches right now. Create your own live match and share the link!
                </div>
              ) : (
                <div className="live-rooms-grid">
                  {availableLiveRooms.map((room) => {
                    const isFull = room.players.length >= room.maxPlayers;
                    return (
                      <div key={room.code} className="live-room-card">
                        <div className="live-room-top">
                          <div>
                            <div className="live-room-title">{room.name}</div>
                            <div className="live-room-meta">
                              <span className="font-mono" style={{ color: 'var(--accent-aqua)' }}>
                                {room.code}
                              </span>
                              <span>·</span>
                              <span>{MODE_LABELS[room.mode]?.title ?? room.mode}</span>
                            </div>
                          </div>
                          <span
                            className={`live-status-pill ${
                              room.status === 'playing' ? 'status-live' : 'status-open'
                            }`}
                          >
                            {room.status === 'playing' ? 'Live Now' : 'Open Lobby'}
                          </span>
                        </div>

                        <div className="live-room-bottom">
                          <div className="live-room-players">
                            <Users size={14} />
                            <span className="font-mono">
                              {room.players.length} / {room.maxPlayers} Players
                            </span>
                            <div className="live-player-dots">
                              {room.players.map((p) => (
                                <span
                                  key={p.id}
                                  className="player-dot"
                                  title={p.name}
                                  style={{ backgroundColor: p.color }}
                                />
                              ))}
                            </div>
                          </div>

                          <button
                            type="button"
                            className="btn-primary btn-sm"
                            disabled={isFull || liveLoading}
                            onClick={() => joinLiveMatch(room.code, playerName)}
                          >
                            {isFull ? 'Full' : 'Join'}
                            {!isFull && <ArrowRight size={14} />}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

/** ==================== LIVE MATCH LOBBY SCREEN (SHARE LINK + 4-PLAYER ROSTER) ==================== */
export const LiveLobbyScreen: React.FC = () => {
  const liveRoom = useGameStore((s) => s.liveRoom);
  const liveClientId = useGameStore((s) => s.liveClientId);
  const pollLiveRoom = useGameStore((s) => s.pollLiveRoom);
  const addBotToLiveLobby = useGameStore((s) => s.addBotToLiveLobby);
  const startLiveMatchFromLobby = useGameStore((s) => s.startLiveMatchFromLobby);
  const leaveLiveMatch = useGameStore((s) => s.leaveLiveMatch);
  const liveLoading = useGameStore((s) => s.liveLoading);
  const liveError = useGameStore((s) => s.liveError);
  const reducedMotion = useGameStore((s) => s.settings.reducedMotion);

  const [copiedType, setCopiedType] = useState<'link' | 'code' | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => {
      pollLiveRoom();
    }, 1500);
    return () => window.clearInterval(id);
  }, [pollLiveRoom]);

  if (!liveRoom) return null;

  const inviteUrl = buildInviteLink(liveRoom.code);
  const isHost =
    liveRoom.players.some((p) => p.id === liveClientId && p.isHost) ||
    liveRoom.players.every((p) => p.isAI || p.id === liveClientId);

  const handleCopy = async (text: string, type: 'link' | 'code') => {
    soundEngine.playUiClick(1.1);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback for clipboard restrictions
    }
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
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

      <div className="hub-screen-body" style={{ maxWidth: 880 }}>
        <div className="hub-section-head">
          <div>
            <span className="eyebrow">Live Arena Lobby · Waiting For Players</span>
            <h2>{liveRoom.name}</h2>
            <p>
              {MODE_LABELS[liveRoom.mode]?.title} ·{' '}
              {liveRoom.visibility === 'public' ? 'Public Room' : 'Private Invite Room'} ·{' '}
              Up to {liveRoom.maxPlayers} players
            </p>
          </div>
          <button className="btn-secondary" onClick={leaveLiveMatch}>
            Leave Lobby
          </button>
        </div>

        {/* Shareable Invite Link & Room Code Card */}
        <div className="invite-share-card">
          <div className="invite-code-box">
            <span className="hud-label">Room Code</span>
            <div className="invite-code-value">{liveRoom.code}</div>
            <button
              className="btn-secondary btn-sm"
              onClick={() => handleCopy(liveRoom.code, 'code')}
            >
              {copiedType === 'code' ? <Check size={14} /> : <Copy size={14} />}
              {copiedType === 'code' ? 'Code Copied!' : 'Copy Code'}
            </button>
          </div>

          <div className="invite-link-box">
            <span className="hud-label">Shareable Invite Link (Friends Anywhere Can Join)</span>
            <div className="invite-link-row">
              <input
                className="player-input font-mono"
                value={inviteUrl}
                readOnly
                aria-label="Shareable invite link"
                onFocus={(e) => e.currentTarget.select()}
              />
              <button
                className="btn-primary btn-sm"
                onClick={() => handleCopy(inviteUrl, 'link')}
              >
                {copiedType === 'link' ? <Check size={15} /> : <Link2 size={15} />}
                {copiedType === 'link' ? 'Link Copied!' : 'Copy Link'}
              </button>
            </div>
          </div>
        </div>

        {/* 4-Player Seat Grid */}
        <div className="mode-config-panel">
          <div className="config-panel-header">
            <h3>
              Arena Seats ({liveRoom.players.length} / {liveRoom.maxPlayers})
            </h3>
            {isHost && liveRoom.players.length < liveRoom.maxPlayers && (
              <button className="btn-secondary btn-sm" onClick={addBotToLiveLobby}>
                <Bot size={14} /> Add AI Bot Seat
              </button>
            )}
          </div>

          <div className="lobby-seats-grid">
            {Array.from({ length: liveRoom.maxPlayers }).map((_, idx) => {
              const p = liveRoom.players[idx];
              return (
                <div
                  key={idx}
                  className={`lobby-seat-card ${p ? 'occupied' : 'empty'}`}
                  style={p ? ({ '--seat-color': p.color } as React.CSSProperties) : undefined}
                >
                  <div className="lobby-seat-top">
                    <span className="hud-label">Seat {idx + 1}</span>
                    {p?.isHost && <span className="mode-badge">Host</span>}
                    {p?.isAI && <span className="mode-badge">AI Bot</span>}
                  </div>
                  {p ? (
                    <div className="lobby-seat-name">
                      <span className="player-dot" style={{ backgroundColor: p.color }} />
                      <span>{p.name}</span>
                      {p.id === liveClientId && <span className="you-tag">YOU</span>}
                    </div>
                  ) : (
                    <div className="lobby-seat-waiting">Waiting for friend to join...</div>
                  )}
                </div>
              );
            })}
          </div>

          {liveError && <div className="live-error-banner">{liveError}</div>}

          <div className="lobby-actions-row">
            <span className="career-stat-sub">
              {liveRoom.players.length < 2
                ? 'Share the link or code above, or add an AI bot to start right away.'
                : 'All players ready! Launch into the 3D boxing ring.'}
            </span>

            {isHost ? (
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {liveRoom.players.length < 2 && (
                  <button
                    className="btn-secondary"
                    disabled={liveLoading}
                    onClick={() => startLiveMatchFromLobby(true)}
                  >
                    <Bot size={15} /> Start vs Ring Bot
                  </button>
                )}
                <button
                  className="btn-primary"
                  disabled={liveLoading || liveRoom.players.length < 2}
                  onClick={() => startLiveMatchFromLobby(false)}
                >
                  <Play size={16} fill="currentColor" />
                  Start Live Match ({liveRoom.players.length} Players)
                </button>
              </div>
            ) : (
              <span className="eyebrow" style={{ color: 'var(--accent-aqua)' }}>
                Waiting for Host to start...
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
