import React, { Suspense, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { ContactShadows, Environment, Lightformer, Sparkles } from '@react-three/drei';
import { createPedestalTexture } from '../engine/woodTextures';
import { PALETTE, PEDESTAL_HEIGHT, PEDESTAL_RADIUS, PEDESTAL_TOP_Y } from '../engine/constants';
import { useGameStore } from '../store/useGameStore';
import { PlayersAndAudience } from './PlayersAndAudience';
import { MoveVisualizer } from './MoveVisualizer';

export const StudioEnvironment: React.FC = () => {
  const graphicsQuality = useGameStore((s) => s.settings.graphicsQuality);
  const reducedMotion = useGameStore((s) => s.settings.reducedMotion);
  const turnPhase = useGameStore((s) => s.turnPhase);

  const pedestalTex = useMemo(() => createPedestalTexture(), []);

  useEffect(() => {
    return () => {
      pedestalTex.dispose();
    };
  }, [pedestalTex]);

  const shadowMapSize = graphicsQuality === 'high' ? 2048 : graphicsQuality === 'medium' ? 1024 : 512;
  const particleCount = graphicsQuality === 'high' ? 52 : graphicsQuality === 'medium' ? 26 : 0;

  // Pedestal ring accent responds gently to game state
  const ringColor =
    turnPhase === 'collapsing' || turnPhase === 'gameover'
      ? PALETTE.warmTangerine
      : turnPhase === 'placing'
        ? PALETTE.electricAqua
        : '#54B8AC';

  return (
    <group>
      {/* Atmospheric midnight studio background + lighter arena fog so the boxing-ring crowd reads crisply */}
      <color attach="background" args={[PALETTE.deepMidnight]} />
      <fogExp2 attach="fog" args={[PALETTE.deepMidnight, 0.01]} />

      {/* Studio backdrop dome for smooth vertical indigo-to-midnight tone shift */}
      <mesh scale={65} position={[0, 8, 0]}>
        <sphereGeometry args={[1, 32, 24]} />
        <meshBasicMaterial
          color="#131B2E"
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>

      {/* Procedural studio HDR reflections (zero external fetches) */}
      <Environment resolution={256} frames={1}>
        <Lightformer
          form="rect"
          intensity={1.9}
          color="#FFF2DC"
          position={[8, 12, 8]}
          rotation={[-Math.PI / 4, Math.PI / 4, 0]}
          scale={[10, 14, 1]}
        />
        <Lightformer
          form="rect"
          intensity={1.3}
          color="#64E5D2"
          position={[-10, 7, -6]}
          rotation={[0, Math.PI / 3, 0]}
          scale={[8, 12, 1]}
        />
        <Lightformer
          form="ring"
          intensity={0.9}
          color="#8581FF"
          position={[0, 16, -4]}
          rotation={[Math.PI / 2, 0, 0]}
          scale={12}
        />
        <Lightformer
          form="rect"
          intensity={0.6}
          color="#FF9B65"
          position={[-4, 2, 10]}
          scale={[10, 4, 1]}
        />
      </Environment>

      {/* Primary lighting rig: warm key, cool aqua rim, indigo ambient bounce */}
      <hemisphereLight args={['#8AA4D6', '#161D31', 0.45]} />

      <directionalLight
        position={[9.5, 17.5, 9.0]}
        intensity={2.35}
        color="#FFF2DF"
        castShadow={graphicsQuality !== 'low'}
        shadow-mapSize-width={shadowMapSize}
        shadow-mapSize-height={shadowMapSize}
        shadow-camera-near={2}
        shadow-camera-far={42}
        shadow-camera-left={-9}
        shadow-camera-right={9}
        shadow-camera-top={16}
        shadow-camera-bottom={-4}
        shadow-bias={-0.00035}
        shadow-normalBias={0.025}
      />

      {/* Cool architectural rim light separating block silhouettes */}
      <directionalLight position={[-10, 10, -8]} intensity={1.05} color="#7CE7D7" />

      {/* Subtle periwinkle side bounce */}
      <pointLight position={[-7, 6, 6]} intensity={14} distance={24} decay={2} color="#8581FF" />

      {/* Warm floor accent grazing lower tower */}
      <pointLight position={[5.5, 2.2, -5.5]} intensity={10} distance={18} decay={2} color="#FF9B65" />

      {/* Sculptural Architectural Pedestal (top at y = 0) */}
      <group position={[0, PEDESTAL_TOP_Y, 0]}>
        {/* Main slate platter */}
        <mesh position={[0, -PEDESTAL_HEIGHT * 0.5, 0]} receiveShadow castShadow>
          <cylinderGeometry args={[PEDESTAL_RADIUS, PEDESTAL_RADIUS * 1.04, PEDESTAL_HEIGHT, 72]} />
          <meshStandardMaterial
            map={pedestalTex}
            roughness={0.78}
            metalness={0.18}
          />
        </mesh>

        {/* Outer metallic bevel collar */}
        <mesh position={[0, -0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[PEDESTAL_RADIUS - 0.06, PEDESTAL_RADIUS + 0.03, 72]} />
          <meshStandardMaterial
            color={ringColor}
            emissive={ringColor}
            emissiveIntensity={turnPhase === 'placing' ? 1.15 : 0.45}
            roughness={0.35}
            metalness={0.5}
          />
        </mesh>

        {/* Sub-plinth recessed base */}
        <mesh position={[0, -PEDESTAL_HEIGHT - 1.15, 0]} receiveShadow>
          <cylinderGeometry args={[PEDESTAL_RADIUS * 0.72, PEDESTAL_RADIUS * 0.82, 2.3, 48]} />
          <meshStandardMaterial color="#121828" roughness={0.85} metalness={0.22} />
        </mesh>

        {/* Subtle recessed underglow halo beneath platter lip */}
        <mesh position={[0, -PEDESTAL_HEIGHT - 0.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[PEDESTAL_RADIUS * 0.74, PEDESTAL_RADIUS * 0.99, 64]} />
          <meshBasicMaterial color={ringColor} transparent opacity={0.18} />
        </mesh>

        {/* Wide infinite studio floor plane below pedestal */}
        <mesh position={[0, -PEDESTAL_HEIGHT - 2.3, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <circleGeometry args={[55, 48]} />
          <meshStandardMaterial color="#0D1220" roughness={0.95} metalness={0.05} />
        </mesh>
      </group>

      {/* Realistic 3D players inside the boxing ring + packed stadium cheering audience */}
      <Suspense fallback={null}>
        <PlayersAndAudience />
      </Suspense>

      {/* Live 3D Move Indicators: extraction origin beacon, curved carry arc, and drop target guides */}
      <MoveVisualizer />

      {/* Soft grounding contact shadows directly on the pedestal surface */}
      {graphicsQuality !== 'low' && (
        <ContactShadows
          position={[0, 0.004, 0]}
          opacity={0.55}
          scale={11.5}
          blur={1.9}
          far={12}
          resolution={graphicsQuality === 'high' ? 512 : 256}
          color="#060911"
          frames={Infinity}
        />
      )}

      {/* Restrained atmospheric floating studio dust motes */}
      {particleCount > 0 && (
        <Sparkles
          count={particleCount}
          scale={[16, 15, 16]}
          position={[0, 7.5, 0]}
          size={1.6}
          speed={reducedMotion ? 0 : 0.22}
          opacity={0.28}
          color="#9ADAD0"
        />
      )}
    </group>
  );
};
