import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Check, ChevronRight, Play, Sparkles, Sun, Users } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { getSceneById, SCENE_REGISTRY } from '../engine/scenes';
import { SceneCategory } from '../types/game';
import { TopHubNav } from './TopHubNav';
import { SceneArtwork } from './SceneArtwork';
import { soundEngine } from '../audio/soundEngine';

const CATEGORIES: Array<'All' | SceneCategory> = [
  'All',
  'Competitive',
  'City',
  'Outdoors',
  'Indoor',
  'Social',
];

export const SceneSelectScreen: React.FC = () => {
  const selectedSceneId = useGameStore((s) => s.selectedSceneId);
  const pendingMatchLaunch = useGameStore((s) => s.pendingMatchLaunch);
  const setSelectedSceneId = useGameStore((s) => s.setSelectedSceneId);
  const confirmSceneAndLaunch = useGameStore((s) => s.confirmSceneAndLaunch);
  const setScreen = useGameStore((s) => s.setScreen);
  const reducedMotion = useGameStore((s) => s.settings.reducedMotion);

  const [activeCategory, setActiveCategory] = useState<'All' | SceneCategory>('All');

  const selectedScene = getSceneById(selectedSceneId);

  const filteredScenes = useMemo(() => {
    if (activeCategory === 'All') return SCENE_REGISTRY;
    return SCENE_REGISTRY.filter((s) => s.category === activeCategory);
  }, [activeCategory]);

  const modeBadgeLabel = useMemo(() => {
    if (!pendingMatchLaunch) return 'Select Match Location';
    if (pendingMatchLaunch.kind === 'solo') {
      return pendingMatchLaunch.opponent === 'computer'
        ? `Solo · Vs. Computer (${pendingMatchLaunch.difficulty === 'sharp' ? 'Sharp' : 'Casual'})`
        : 'Solo · Endless Run';
    }
    if (pendingMatchLaunch.kind === 'passAndPlay') {
      return `Pass & Play · ${pendingMatchLaunch.playerNames.length} Players`;
    }
    if (pendingMatchLaunch.kind === 'challenge') {
      return 'Challenge Mode';
    }
    return 'Live Arena Match';
  }, [pendingMatchLaunch]);

  const isCreateLiveFlow = pendingMatchLaunch?.kind === 'createLive';

  const handleBack = () => {
    soundEngine.playUiClick(0.94);
    if (isCreateLiveFlow) {
      setScreen('createLive');
    } else if (pendingMatchLaunch?.kind === 'passAndPlay' || pendingMatchLaunch?.kind === 'challenge') {
      setScreen('modeSelect');
    } else {
      setScreen('menu');
    }
  };

  return (
    <motion.div
      className="hub-screen-overlay scene-select-overlay pointer-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reducedMotion ? 0.01 : 0.28 }}
    >
      <TopHubNav />

      <div className="hub-screen-body scene-select-body">
        {/* Editorial Destination Header */}
        <div className="scene-select-header">
          <div>
            <div className="scene-select-eyebrow-row">
              <span className="eyebrow" style={{ color: 'var(--accent-tangerine)' }}>
                PICK YOUR SPOT
              </span>
              <span className="mode-badge">{modeBadgeLabel}</span>
            </div>
            <h2>Where are we playing?</h2>
            <p>Same game. Different atmosphere. Choose the scene for your next match.</p>
          </div>

          <button className="btn-secondary btn-sm" onClick={handleBack}>
            <ArrowLeft size={15} />
            {isCreateLiveFlow ? 'Back to Live Setup' : 'Back'}
          </button>
        </div>

        {/* Optional Category Filter Bar */}
        <div className="scene-filter-row" role="tablist" aria-label="Filter scenes by setting">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              role="tab"
              aria-selected={activeCategory === cat}
              className={`pill-btn ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => {
                soundEngine.playUiClick(1.02);
                setActiveCategory(cat);
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Main Split Layout: Dash-Style Full-Bleed Scene Gallery + Prominent Selected Preview */}
        <div className="scene-select-layout">
          <div className="scene-gallery-grid">
            {filteredScenes.map((scene) => {
              const isSelected = scene.id === selectedScene.id;
              return (
                <div
                  key={scene.id}
                  role="button"
                  tabIndex={0}
                  className={`scene-card ${isSelected ? 'scene-card-selected' : ''}`}
                  style={{ '--scene-accent': scene.accentColor } as React.CSSProperties}
                  onClick={() => {
                    soundEngine.unlock();
                    soundEngine.playUiClick(isSelected ? 1.06 : 1.02);
                    setSelectedSceneId(scene.id);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedSceneId(scene.id);
                    }
                  }}
                >
                  {/* Full-bleed Artwork Backdrop with Smooth Dark Gradient Scrim (Dash Expo card style) */}
                  <div className="scene-card-bg">
                    <SceneArtwork sceneId={scene.id} className="scene-card-svg" />
                    <div className="scene-card-scrim" />
                  </div>

                  {/* Top Floating Pill Row */}
                  <div className="scene-card-top">
                    <span className="scene-audience-chip">
                      <Users size={11} />
                      {scene.crowd.label}
                    </span>
                    {isSelected && (
                      <span className="scene-selected-check" aria-label="Selected">
                        <Check size={13} strokeWidth={3} />
                      </span>
                    )}
                  </div>

                  {/* Bottom Editorial Copy + Inset Frosted Action Capsule */}
                  <div className="scene-card-content">
                    <span className="scene-card-eyebrow">{scene.location}</span>
                    <h3>{scene.name}</h3>
                    <p className="scene-card-atmo">{scene.atmosphereTag}</p>

                    <div className="card-action-capsule scene-card-capsule">
                      <span className="card-capsule-meta">
                        <Sun size={12} className="capsule-zap" />
                        {scene.timeOfDay}
                      </span>
                      <button
                        type="button"
                        className={`card-capsule-pill ${isSelected ? 'selected' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          soundEngine.unlock();
                          soundEngine.playUiClick(1.08);
                          setSelectedSceneId(scene.id);
                          confirmSceneAndLaunch();
                        }}
                      >
                        {isCreateLiveFlow ? 'Use' : 'Play'} <ChevronRight size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Dedicated Right Preview & Confirmation Stage */}
          <aside className="scene-preview-panel">
            <div className="scene-preview-stage">
              <SceneArtwork sceneId={selectedScene.id} className="scene-preview-svg" />
              <div className="scene-preview-badges">
                <span className="scene-preview-pill">
                  <Sun size={12} />
                  {selectedScene.timeOfDay}
                </span>
                <span className="scene-preview-pill">
                  <Users size={12} />
                  {selectedScene.crowd.label}
                </span>
              </div>
              <div className="scene-preview-live-tag">
                <Sparkles size={12} />
                Live 3D Preview Active Behind Panel
              </div>
            </div>

            <div className="scene-preview-copy">
              <span className="eyebrow" style={{ color: selectedScene.accentColor }}>
                {selectedScene.location}
              </span>
              <h3>{selectedScene.name}</h3>
              <p>{selectedScene.description}</p>
            </div>

            <div className="scene-preview-specs">
              <div className="scene-spec-item">
                <span className="hud-label">Audience</span>
                <strong>{selectedScene.crowd.label}</strong>
              </div>
              <div className="scene-spec-item">
                <span className="hud-label">Lighting</span>
                <strong>{selectedScene.timeOfDay}</strong>
              </div>
              <div className="scene-spec-item">
                <span className="hud-label">Category</span>
                <strong>{selectedScene.category}</strong>
              </div>
            </div>

            <div className="scene-preview-actions">
              <button
                type="button"
                className="btn-primary scene-play-cta"
                onClick={confirmSceneAndLaunch}
              >
                <Play size={16} fill="currentColor" />
                {isCreateLiveFlow ? 'USE THIS SCENE' : 'PLAY HERE'}
              </button>
              <button type="button" className="btn-ghost" onClick={handleBack}>
                {isCreateLiveFlow ? 'Cancel' : 'Back to Modes'}
              </button>
            </div>
          </aside>
        </div>
      </div>
    </motion.div>
  );
};
