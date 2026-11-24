import React, { Suspense, useEffect, useState } from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { StudioEnvironment } from './StudioEnvironment';
import { PhysicsTower } from './PhysicsTower';
import { CameraRig } from './CameraRig';
import { useGameStore } from '../store/useGameStore';

interface TiltCanvasProps {
  onSceneReady?: () => void;
}

const SceneReadyNotifier: React.FC<{ onReady?: () => void }> = ({ onReady }) => {
  useEffect(() => {
    const id = requestAnimationFrame(() => onReady?.());
    return () => cancelAnimationFrame(id);
  }, [onReady]);
  return null;
};

export const TiltCanvas: React.FC<TiltCanvasProps> = ({ onSceneReady }) => {
  const graphicsQuality = useGameStore((s) => s.settings.graphicsQuality);
  const [webglError, setWebglError] = useState<string | null>(null);

  const dpr: [number, number] =
    graphicsQuality === 'high'
      ? [1, 2]
      : graphicsQuality === 'medium'
        ? [1, 1.5]
        : [0.85, 1];

  if (webglError) {
    return (
      <div className="webgl-fallback">
        <div className="webgl-fallback-card">
          <h2>3D Renderer Unavailable</h2>
          <p>{webglError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tilt-canvas-wrapper">
      <Canvas
        shadows={graphicsQuality !== 'low' ? 'percentage' : false}
        dpr={dpr}
        camera={{ fov: 40, near: 0.2, far: 140, position: [14.0, 10.6, 16.2] }}
        gl={{
          antialias: graphicsQuality !== 'low',
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.08,
        }}
        onCreated={({ gl }) => {
          const canvas = gl.domElement;
          canvas.addEventListener('webglcontextlost', (e) => {
            e.preventDefault();
            setWebglError('WebGL graphics context was interrupted. Please reload to continue.');
          });
        }}
      >
        <Suspense fallback={null}>
          <StudioEnvironment />
          <PhysicsTower />
          <CameraRig />
          <SceneReadyNotifier onReady={onSceneReady} />
        </Suspense>
      </Canvas>
    </div>
  );
};
