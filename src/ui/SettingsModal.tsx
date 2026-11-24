import React from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { GraphicsQuality } from '../types/game';
import { soundEngine } from '../audio/soundEngine';

export const SettingsModal: React.FC = () => {
  const settings = useGameStore((s) => s.settings);
  const updateSettings = useGameStore((s) => s.updateSettings);
  const setSettingsOpen = useGameStore((s) => s.setSettingsOpen);

  const qualities: GraphicsQuality[] = ['low', 'medium', 'high'];

  return (
    <motion.div
      className="modal-backdrop pointer-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={() => setSettingsOpen(false)}
    >
      <motion.div
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        onClick={(e) => e.stopPropagation()}
        initial={settings.reducedMotion ? false : { scale: 0.96, y: 12 }}
        animate={{ scale: 1, y: 0 }}
      >
        <div className="modal-header">
          <div>
            <span className="eyebrow">Preferences</span>
            <h2 className="modal-title">Settings</h2>
          </div>
          <button
            className="btn-icon"
            aria-label="Close settings"
            onClick={() => {
              soundEngine.playUiClick();
              setSettingsOpen(false);
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div>
          {/* Mute Switch */}
          <div className="setting-row">
            <div className="setting-row-top">
              <span>Mute All Audio</span>
              <button
                type="button"
                role="switch"
                aria-checked={settings.muted}
                className={`toggle-switch ${settings.muted ? 'on' : ''}`}
                onClick={() => {
                  soundEngine.unlock();
                  updateSettings({ muted: !settings.muted });
                }}
              >
                <span className="toggle-knob" />
              </button>
            </div>
          </div>

          {/* Master Volume */}
          <div className="setting-row">
            <div className="setting-row-top">
              <label htmlFor="vol-master">Master Volume</label>
              <span className="setting-val">{Math.round(settings.masterVolume * 100)}%</span>
            </div>
            <input
              id="vol-master"
              className="range-slider"
              type="range"
              min={0}
              max={1}
              step={0.02}
              value={settings.masterVolume}
              onChange={(e) => {
                soundEngine.unlock();
                updateSettings({ masterVolume: parseFloat(e.target.value), muted: false });
              }}
            />
          </div>

          {/* Sound Effects Volume */}
          <div className="setting-row">
            <div className="setting-row-top">
              <label htmlFor="vol-sfx">Sound Effects</label>
              <span className="setting-val">{Math.round(settings.sfxVolume * 100)}%</span>
            </div>
            <input
              id="vol-sfx"
              className="range-slider"
              type="range"
              min={0}
              max={1}
              step={0.02}
              value={settings.sfxVolume}
              onChange={(e) => {
                soundEngine.unlock();
                updateSettings({ sfxVolume: parseFloat(e.target.value) });
              }}
              onPointerUp={() => soundEngine.playWoodTap(0.5)}
            />
          </div>

          {/* Ambient Music Volume */}
          <div className="setting-row">
            <div className="setting-row-top">
              <label htmlFor="vol-music">Background Music</label>
              <span className="setting-val">{Math.round(settings.musicVolume * 100)}%</span>
            </div>
            <input
              id="vol-music"
              className="range-slider"
              type="range"
              min={0}
              max={1}
              step={0.02}
              value={settings.musicVolume}
              onChange={(e) => {
                soundEngine.unlock();
                updateSettings({ musicVolume: parseFloat(e.target.value) });
              }}
            />
          </div>

          {/* Camera Sensitivity */}
          <div className="setting-row">
            <div className="setting-row-top">
              <label htmlFor="cam-sens">Camera Sensitivity</label>
              <span className="setting-val">{settings.cameraSensitivity.toFixed(1)}x</span>
            </div>
            <input
              id="cam-sens"
              className="range-slider"
              type="range"
              min={0.4}
              max={1.8}
              step={0.1}
              value={settings.cameraSensitivity}
              onChange={(e) => updateSettings({ cameraSensitivity: parseFloat(e.target.value) })}
            />
          </div>

          {/* Graphics Quality */}
          <div className="setting-row">
            <div className="setting-row-top">
              <span>Graphics Quality</span>
              <span className="setting-val">{settings.graphicsQuality}</span>
            </div>
            <div className="segmented-control">
              {qualities.map((q) => (
                <button
                  key={q}
                  className={`segmented-btn ${settings.graphicsQuality === q ? 'active' : ''}`}
                  onClick={() => {
                    soundEngine.playUiClick(1.0);
                    updateSettings({ graphicsQuality: q });
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Reduced Motion */}
          <div className="setting-row">
            <div className="setting-row-top">
              <span>Reduced Motion</span>
              <button
                type="button"
                role="switch"
                aria-checked={settings.reducedMotion}
                className={`toggle-switch ${settings.reducedMotion ? 'on' : ''}`}
                onClick={() => {
                  soundEngine.playUiClick();
                  updateSettings({ reducedMotion: !settings.reducedMotion });
                }}
              >
                <span className="toggle-knob" />
              </button>
            </div>
          </div>

          {/* Interaction Hints */}
          <div className="setting-row">
            <div className="setting-row-top">
              <span>Show Control Hints</span>
              <button
                type="button"
                role="switch"
                aria-checked={settings.showHints}
                className={`toggle-switch ${settings.showHints ? 'on' : ''}`}
                onClick={() => {
                  soundEngine.playUiClick();
                  updateSettings({ showHints: !settings.showHints });
                }}
              >
                <span className="toggle-knob" />
              </button>
            </div>
          </div>
        </div>

        <button
          className="btn-primary"
          onClick={() => {
            soundEngine.playUiClick(1.06);
            setSettingsOpen(false);
          }}
        >
          Done
        </button>
      </motion.div>
    </motion.div>
  );
};
