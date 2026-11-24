import React, { Suspense, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { ContactShadows, Environment, Lightformer, Sparkles } from '@react-three/drei';
import { createPedestalTexture } from '../engine/woodTextures';
import { PALETTE, PEDESTAL_HEIGHT, PEDESTAL_RADIUS, PEDESTAL_TOP_Y } from '../engine/constants';
import { getSceneById } from '../engine/scenes';
import { useGameStore } from '../store/useGameStore';
import { PlayersAndAudience } from './PlayersAndAudience';
import { SceneWorld } from './SceneEnvironments';
import { MoveVisualizer } from './MoveVisualizer';

function createGradientSkyTexture(topHex: string, bottomHex: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, topHex);
  grad.addColorStop(0.55, bottomHex);
  grad.addColorStop(1, bottomHex);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 16, 256);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export const StudioEnvironment: React.FC = () => {
  const screen = useGameStore((s) => s.screen);
  const selectedSceneId = useGameStore((s) => s.selectedSceneId);
  const graphicsQuality = useGameStore((s) => s.settings.graphicsQuality);
  const reducedMotion = useGameStore((s) => s.settings.reducedMotion);
  const turnPhase = useGameStore((s) => s.turnPhase);

  // Preserve the iconic Boxing Ring as the Home Menu hero; show selected scene everywhere else!
  const activeSceneId = screen === 'menu' ? 'boxing-ring' : selectedSceneId;
  const scene = useMemo(() => getSceneById(activeSceneId), [activeSceneId]);
  const { lighting, platform } = scene;

  const pedestalTex = useMemo(() => createPedestalTexture(), []);
  const skyTex = useMemo(
    () => createGradientSkyTexture(lighting.domeTop, lighting.domeBottom),
    [lighting.domeTop, lighting.domeBottom]
  );

  useEffect(() => {
    return () => {
      pedestalTex.dispose();
    };
  }, [pedestalTex]);

  useEffect(() => {
    return () => {
      skyTex.dispose();
    };
  }, [skyTex]);

  const shadowMapSize = graphicsQuality === 'high' ? 2048 : graphicsQuality === 'medium' ? 1024 : 512;
  const particleCount = graphicsQuality === 'high' ? 46 : graphicsQuality === 'medium' ? 22 : 0;

  // Pedestal ring accent responds gently to game state while reflecting scene identity
  const ringColor =
    turnPhase === 'collapsing' || turnPhase === 'gameover'
      ? PALETTE.warmTangerine
      : turnPhase === 'placing'
        ? PALETTE.electricAqua
        : platform.ringAccent;

  return (
    <group>
      {/* Dynamic Scene Sky Background + Atmospheric Fog */}
      <color attach="background" args={[lighting.background]} />
      <fogExp2 attach="fog" args={[lighting.fogColor, lighting.fogDensity]} />

      {/* Vertical Gradient Sky Dome for authentic daylight, golden-hour, dusk & midnight skies */}
      <mesh scale={72} position={[0, 8, 0]}>
        <sphereGeometry args={[1, 32, 24]} />
        <meshBasicMaterial map={skyTex} side={THREE.BackSide} depthWrite={false} fog={false} />
      </mesh>

      {/* Procedural HDR Reflections tuned to scene lighting */}
      <Environment resolution={256} frames={1}>
        <Lightformer
          form="rect"
          intensity={1.9}
          color={lighting.keyColor}
          position={[8, 12, 8]}
          rotation={[-Math.PI / 4, Math.PI / 4, 0]}
          scale={[10, 14, 1]}
        />
        <Lightformer
          form="rect"
          intensity={1.25}
          color={lighting.rimColor}
          position={[-10, 7, -6]}
          rotation={[0, Math.PI / 3, 0]}
          scale={[8, 12, 1]}
        />
        <Lightformer
          form="ring"
          intensity={0.9}
          color={lighting.fill1Color}
          position={[0, 16, -4]}
          rotation={[Math.PI / 2, 0, 0]}
          scale={12}
        />
        <Lightformer
          form="rect"
          intensity={0.65}
          color={lighting.fill2Color}
          position={[-4, 2, 10]}
          scale={[10, 4, 1]}
        />
      </Environment>

      {/* Data-Driven Scene Lighting Rig */}
      <hemisphereLight args={[lighting.hemiSky, lighting.hemiGround, lighting.hemiIntensity]} />

      <directionalLight
        position={lighting.keyPosition}
        intensity={lighting.keyIntensity}
        color={lighting.keyColor}
        castShadow={graphicsQuality !== 'low'}
        shadow-mapSize-width={shadowMapSize}
        shadow-mapSize-height={shadowMapSize}
        shadow-camera-near={2}
        shadow-camera-far={44}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={16}
        shadow-camera-bottom={-4}
        shadow-bias={-0.00035}
        shadow-normalBias={0.025}
      />

      <directionalLight position={[-10, 10, -8]} intensity={lighting.rimIntensity} color={lighting.rimColor} />

      <pointLight
        position={[-7, 6, 6]}
        intensity={lighting.fill1Intensity}
        distance={26}
        decay={2}
        color={lighting.fill1Color}
      />

      <pointLight
        position={[5.5, 2.2, -5.5]}
        intensity={lighting.fill2Intensity}
        distance={20}
        decay={2}
        color={lighting.fill2Color}
      />

      {/* Consistent Physical Gameplay Footprint (top at exact PEDESTAL_TOP_Y = 0) themed per scene */}
      <group position={[0, PEDESTAL_TOP_Y, 0]}>
        <mesh position={[0, -PEDESTAL_HEIGHT * 0.5, 0]} receiveShadow castShadow>
          <cylinderGeometry args={[PEDESTAL_RADIUS, PEDESTAL_RADIUS * 1.04, PEDESTAL_HEIGHT, 72]} />
          <meshStandardMaterial
            map={platform.useWoodGrainTex ? pedestalTex : undefined}
            color={platform.useWoodGrainTex ? '#FFFFFF' : platform.topColor}
            roughness={0.78}
            metalness={platform.useWoodGrainTex ? 0.18 : 0.08}
          />
        </mesh>

        {/* Outer collar accent */}
        <mesh position={[0, -0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[PEDESTAL_RADIUS - 0.06, PEDESTAL_RADIUS + 0.03, 72]} />
          <meshStandardMaterial
            color={ringColor}
            emissive={ringColor}
            emissiveIntensity={turnPhase === 'placing' ? 1.15 : 0.45}
            roughness={0.35}
            metalness={0.45}
          />
        </mesh>

        {/* Sub-plinth base */}
        <mesh position={[0, -PEDESTAL_HEIGHT - 1.15, 0]} receiveShadow>
          <cylinderGeometry args={[PEDESTAL_RADIUS * 0.72, PEDESTAL_RADIUS * 0.82, 2.3, 48]} />
          <meshStandardMaterial color={platform.baseColor} roughness={0.85} metalness={0.18} />
        </mesh>

        {/* Subtle recessed underglow halo */}
        <mesh position={[0, -PEDESTAL_HEIGHT - 0.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[PEDESTAL_RADIUS * 0.74, PEDESTAL_RADIUS * 0.99, 64]} />
          <meshBasicMaterial color={ringColor} transparent opacity={0.18} />
        </mesh>

        {/* Wide Scene Ground Plane */}
        <mesh position={[0, -PEDESTAL_HEIGHT - 2.3, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <circleGeometry args={[62, 56]} />
          <meshStandardMaterial color={platform.floorColor} roughness={0.94} metalness={0.04} />
        </mesh>
      </group>

      {/* Scene-Specific 3D Environment Architecture & Props */}
      <SceneWorld key={activeSceneId} sceneId={activeSceneId} reducedMotion={reducedMotion} />

      {/* Realistic 3D Players + Scene-Aware Audience System */}
      <Suspense fallback={null}>
        <PlayersAndAudience activeSceneId={activeSceneId} />
      </Suspense>

      {/* Live 3D Move Indicators */}
      <MoveVisualizer />

      {/* Soft grounding contact shadows directly on the pedestal surface */}
      {graphicsQuality !== 'low' && (
        <ContactShadows
          position={[0, 0.004, 0]}
          opacity={lighting.contactShadowOpacity}
          scale={11.5}
          blur={1.9}
          far={12}
          resolution={graphicsQuality === 'high' ? 512 : 256}
          color={lighting.contactShadowColor}
          frames={Infinity}
        />
      )}

      {/* Restrained Atmospheric Particles (dust motes, golden-hour shimmer, park breeze) */}
      {particleCount > 0 && lighting.sparkleOpacity > 0 && (
        <Sparkles
          count={particleCount}
          scale={[16, 15, 16]}
          position={[0, 7.5, 0]}
          size={1.6}
          speed={reducedMotion ? 0 : 0.22}
          opacity={lighting.sparkleOpacity}
          color={lighting.sparkleColor}
        />
      )}
    </group>
  );
};
