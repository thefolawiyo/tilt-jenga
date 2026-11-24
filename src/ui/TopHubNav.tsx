import React from 'react';
import { Volume2, VolumeX, Settings, Trophy, BarChart3, Gamepad2, Radio, Sparkles } from 'lucide-react';
import { TiltLogo } from './TiltLogo';
import { useGameStore, getLevelFromXp } from '../store/useGameStore';
import { ScreenType } from '../types/game';
import { soundEngine } from '../audio/soundEngine';

export const TopHubNav: React.FC = () => {
  const screen = useGameStore((s) => s.screen);
  const setScreen = useGameStore((s) => s.setScreen);
  const setSettingsOpen = useGameStore((s) => s.setSettingsOpen);
  const muted = useGameStore((s) => s.settings.muted);
  const updateSettings = useGameStore((s) => s.updateSettings);
  const profile = useGameStore((s) => s.profile);

  const lvl = getLevelFromXp(profile.xp);

  const navItems: Array<{ id: ScreenType; label: string; icon: React.ReactNode }> = [
    { id: 'menu', label: 'Play', icon: <Gamepad2 size={14} /> },
    { id: 'modeSelect', label: 'Modes', icon: <Sparkles size={14} /> },
    { id: 'joinLive', label: 'Live Arena', icon: <Radio size={14} /> },
    { id: 'leaderboard', label: 'Leaderboard', icon: <Trophy size={14} /> },
    { id: 'career', label: 'Career', icon: <BarChart3 size={14} /> },
  ];

  const isNavActive = (id: ScreenType) => {
    if (id === 'joinLive') {
      return screen === 'joinLive' || screen === 'createLive' || screen === 'liveLobby';
    }
    return screen === id;
  };

  return (
    <header className="hub-topbar pointer-auto">
      <button
        className="hub-logo-btn"
        onClick={() => {
          soundEngine.playUiClick(0.96);
          setScreen('menu');
        }}
        aria-label="Go to Main Menu"
      >
        <TiltLogo size="md" />
      </button>

      <nav className="hub-nav-tabs" aria-label="Main navigation">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={`hub-nav-tab ${isNavActive(item.id) ? 'active' : ''}`}
            onClick={() => {
              soundEngine.unlock();
              soundEngine.playUiClick(1.04);
              setScreen(item.id);
            }}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="hub-right-cluster">
        <button
          className="hub-profile-pill"
          title="View Career & Progress"
          onClick={() => {
            soundEngine.unlock();
            soundEngine.playUiClick(1.05);
            setScreen('career');
          }}
        >
          <span className="hub-lvl-badge">LVL {lvl.level}</span>
          <div className="hub-profile-meta">
            <span className="hub-profile-name">{profile.callsign}</span>
            <div className="hub-xp-track">
              <div className="hub-xp-fill" style={{ width: `${lvl.pct}%` }} />
            </div>
          </div>
        </button>

        <button
          className="btn-icon"
          aria-label={muted ? 'Unmute audio' : 'Mute audio'}
          title={muted ? 'Unmute audio' : 'Mute audio'}
          onClick={() => {
            soundEngine.unlock();
            updateSettings({ muted: !muted });
          }}
        >
          {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
        <button
          className="btn-icon"
          aria-label="Open settings"
          title="Settings"
          onClick={() => {
            soundEngine.unlock();
            soundEngine.playUiClick();
            setSettingsOpen(true);
          }}
        >
          <Settings size={18} />
        </button>
      </div>
    </header>
  );
};
