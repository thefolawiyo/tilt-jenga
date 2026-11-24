import React, { Suspense, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { ContactShadows, Environment, Lightformer, Sparkles } from '@react-three/drei';
import { createPedestalTexture } from '../engine/woodTextures';
import { createCloudSkyTexture, getEnvironmentPbrLibrary } from '../engine/environmentMaterials';
import { PALETTE, PEDESTAL_HEIGHT, PEDESTAL_RADIUS, PEDESTAL_TOP_Y } from '../engine/constants';
import { getSceneById } from '../engine/scenes';
import { useGameStore } from '../store/useGameStore';
import { PlayersAndAudience } from './PlayersAndAudience';
import { SceneWorld } from './SceneEnvironments';
import { MoveVisualizer } from './MoveVisualizer';

export const StudioEnvironment: React.FC = () => {
  const screen = useGameStore((s) => s.screen);
  const selectedSceneId = useGameStore((s) => s.selectedSceneId);
  const graphicsQuality = useGameStore((s) => s.settings.graphicsQuality);
  const reducedMotion = useGameStore((s) => s.settings.reducedMotion);
  const turnPhase = useGameStore((s) => s.turnPhase);

  // Preserve the iconic Boxing Ring as the Home Menu hero; render chosen location everywhere else
  const activeSceneId = screen === 'menu' ? 'boxing-ring' : selectedSceneId;
  const scene = useMemo(() => getSceneById(activeSceneId), [activeSceneId]);
  const { lighting, platform } = scene;

  const pbr = useMemo(() => getEnvironmentPbrLibrary(), []);
  const pedestalTex = useMemo(() => createPedestalTexture(), []);

  const isOutdoorSky =
    activeSceneId === 'lagos-market' ||
    activeSceneId === 'lagos-island' ||
    activeSceneId === 'paris-eiffel' ||
    activeSceneId === 'public-park';

  const skyTex = useMemo(
    () => createCloudSkyTexture(lighting.domeTop, lighting.domeBottom, isOutdoorSky),
    [lighting.domeTop, lighting.domeBottom, isOutdoorSky]
  );

  // Pick realistic PBR surface maps for the gameplay platform & wide scene ground
  const platformSurface = useMemo(() => {
    switch (platform.style) {
      case 'paris-stone':
        return { top: pbr.parisStone, floor: pbr.cobblestone, bump: 0.08, floorBump: 0.14 };
      case 'gym-mat':
        return { top: pbr.gymRubber, floor: pbr.gymRubber, bump: 0.05, floorBump: 0.06 };
      case 'office-oak':
        return { top: pbr.oakPlanks, floor: pbr.oakPlanks, bump: 0.04, floorBump: 0.05 };
      case 'bar-walnut':
        return { top: pbr.oakPlanks, floor: pbr.oakPlanks, bump: 0.05, floorBump: 0.06 };
      case 'park-deck':
        return { top: pbr.cedarSlats, floor: pbr.parkGrass, bump: 0.08, floorBump: 0.1 };
      case 'market-timber':
        return { top: pbr.cedarSlats, floor: pbr.cobblestone, bump: 0.07, floorBump: 0.1 };
      case 'urban-concrete':
        return { top: pbr.boardConcrete, floor: pbr.asphalt, bump: 0.07, floorBump: 0.1 };
      case 'living-rug':
        return { top: pbr.oakPlanks, floor: pbr.oakPlanks, bump: 0.04, floorBump: 0.05 };
      case 'slate-ring':
      default:
        return { top: null, floor: null, bump: 0, floorBump: 0 };
    }
  }, [platform.style, pbr]);

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
  const particleCount = graphicsQuality === 'high' ? 42 : graphicsQuality === 'medium' ? 20 : 0;

  const ringColor =
    turnPhase === 'collapsing' || turnPhase === 'gameover'
      ? PALETTE.warmTangerine
      : turnPhase === 'placing'
        ? PALETTE.electricAqua
        : platform.ringAccent;

  return (
    <group>
      {/* Dynamic Scene Sky Background + Atmospheric Aerial Haze */}
      <color attach="background" args={[lighting.background]} />
      <fogExp2 attach="fog" args={[lighting.fogColor, lighting.fogDensity]} />

      {/* Painterly Cloud-Streaked Sky Dome / Studio Backdrop */}
      <mesh scale={78} position={[0, 8, 0]}>
        <sphereGeometry args={[1, 36, 24]} />
        <meshBasicMaterial map={skyTex} side={THREE.BackSide} depthWrite={false} fog={false} />
      </mesh>

      {/* Procedural Studio / Sky HDR Reflections tuned to scene mood */}
      <Environment resolution={256} frames={1}>
        <Lightformer
          form="rect"
          intensity={isOutdoorSky ? 2.1 : 1.8}
          color={lighting.keyColor}
          position={[8, 12, 8]}
          rotation={[-Math.PI / 4, Math.PI / 4, 0]}
          scale={[12, 14, 1]}
        />
        <Lightformer
          form="rect"
          intensity={1.35}
          color={lighting.rimColor}
          position={[-10, 7, -6]}
          rotation={[0, Math.PI / 3, 0]}
          scale={[10, 12, 1]}
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

      {/* Calibrated Three-Point + Natural Sky Bounce Lighting Rig */}
      <hemisphereLight args={[lighting.hemiSky, lighting.hemiGround, lighting.hemiIntensity]} />

      <directionalLight
        position={lighting.keyPosition}
        intensity={lighting.keyIntensity}
        color={lighting.keyColor}
        castShadow={graphicsQuality !== 'low'}
        shadow-mapSize-width={shadowMapSize}
        shadow-mapSize-height={shadowMapSize}
        shadow-camera-near={2}
        shadow-camera-far={48}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={18}
        shadow-camera-bottom={-5}
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

      {/* Consistent Physical Gameplay Footprint (top at exact PEDESTAL_TOP_Y = 0) with Scene PBR Maps */}
      <group position={[0, PEDESTAL_TOP_Y, 0]}>
        <mesh position={[0, -PEDESTAL_HEIGHT * 0.5, 0]} receiveShadow castShadow>
          <cylinderGeometry args={[PEDESTAL_RADIUS, PEDESTAL_RADIUS * 1.04, PEDESTAL_HEIGHT, 72]} />
          <meshStandardMaterial
            map={platform.useWoodGrainTex ? pedestalTex : platformSurface.top?.map}
            bumpMap={platform.useWoodGrainTex ? undefined : platformSurface.top?.bumpMap}
            bumpScale={platformSurface.bump}
            color={platform.useWoodGrainTex ? '#FFFFFF' : platform.topColor}
            roughness={0.82}
            metalness={platform.useWoodGrainTex ? 0.16 : 0.06}
          />
        </mesh>

        {/* Outer bevel accent rim */}
        <mesh position={[0, -0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[PEDESTAL_RADIUS - 0.06, PEDESTAL_RADIUS + 0.03, 72]} />
          <meshStandardMaterial
            color={ringColor}
            emissive={ringColor}
            emissiveIntensity={turnPhase === 'placing' ? 1.15 : 0.4}
            roughness={0.38}
            metalness={0.42}
          />
        </mesh>

        {/* Sub-plinth base */}
        <mesh position={[0, -PEDESTAL_HEIGHT - 1.15, 0]} receiveShadow>
          <cylinderGeometry args={[PEDESTAL_RADIUS * 0.72, PEDESTAL_RADIUS * 0.82, 2.3, 48]} />
          <meshStandardMaterial
            map={platformSurface.top ? pbr.boardConcrete.map : undefined}
            bumpMap={platformSurface.top ? pbr.boardConcrete.bumpMap : undefined}
            bumpScale={0.05}
            color={platform.baseColor}
            roughness={0.88}
            metalness={0.14}
          />
        </mesh>

        {/* Subtle recessed underglow halo */}
        <mesh position={[0, -PEDESTAL_HEIGHT - 0.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[PEDESTAL_RADIUS * 0.74, PEDESTAL_RADIUS * 0.99, 64]} />
          <meshBasicMaterial color={ringColor} transparent opacity={0.18} />
        </mesh>

        {/* Wide Textured PBR Scene Ground Plane */}
        <mesh position={[0, -PEDESTAL_HEIGHT - 2.3, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <circleGeometry args={[66, 64]} />
          <meshStandardMaterial
            map={platformSurface.floor?.map}
            bumpMap={platformSurface.floor?.bumpMap}
            bumpScale={platformSurface.floorBump}
            color={platformSurface.floor ? '#DDD6CC' : platform.floorColor}
            roughness={0.93}
            metalness={0.03}
          />
        </mesh>
      </group>

      {/* Scene-Specific AAA PBR 3D Environment Architecture & Props */}
      <SceneWorld key={activeSceneId} sceneId={activeSceneId} reducedMotion={reducedMotion} />

      {/* Realistic Diverse 3D Human Players + Scene-Aware Audience System */}
      <Suspense fallback={null}>
        <PlayersAndAudience activeSceneId={activeSceneId} />
      </Suspense>

      {/* Live 3D Move Indicators */}
      <MoveVisualizer />

      {/* Grounding Contact Shadows directly beneath the Jenga Tower */}
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

      {/* Subtle Atmospheric Floating Motes */}
      {particleCount > 0 && lighting.sparkleOpacity > 0 && (
        <Sparkles
          count={particleCount}
          scale={[16, 15, 16]}
          position={[0, 7.5, 0]}
          size={1.45}
          speed={reducedMotion ? 0 : 0.2}
          opacity={lighting.sparkleOpacity}
          color={lighting.sparkleColor}
        />
      )}
    </group>
  );
};
