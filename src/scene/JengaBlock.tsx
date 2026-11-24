import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { ThreeEvent, useFrame } from '@react-three/fiber';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { BLOCK_HEIGHT, BLOCK_LENGTH, BLOCK_WIDTH, PALETTE } from '../engine/constants';
import { getWoodMaterialSets } from '../engine/woodTextures';

// Single shared beveled rounded-box geometry for all 54 blocks -> razor-sharp specular edges, minimal GPU memory
let sharedBlockGeo: RoundedBoxGeometry | null = null;
function getSharedBlockGeometry(): RoundedBoxGeometry {
  if (!sharedBlockGeo) {
    sharedBlockGeo = new RoundedBoxGeometry(BLOCK_LENGTH, BLOCK_HEIGHT, BLOCK_WIDTH, 3, 0.048);
  }
  return sharedBlockGeo;
}

let sharedOutlineGeo: THREE.EdgesGeometry | null = null;
function getSharedOutlineGeometry(): THREE.EdgesGeometry {
  if (!sharedOutlineGeo) {
    const box = new THREE.BoxGeometry(BLOCK_LENGTH + 0.032, BLOCK_HEIGHT + 0.032, BLOCK_WIDTH + 0.032);
    sharedOutlineGeo = new THREE.EdgesGeometry(box);
    box.dispose();
  }
  return sharedOutlineGeo;
}

interface JengaBlockMeshProps {
  woodVariant: number;
  isHovered: boolean;
  isSelected: boolean;
  isEligible: boolean;
  isInvalidFlash: boolean;
  isPlacing: boolean;
  isPlacementValid: boolean;
  playerAccentColor?: string;
  onPointerOver: (e: ThreeEvent<PointerEvent>) => void;
  onPointerOut: (e: ThreeEvent<PointerEvent>) => void;
  onPointerDown: (e: ThreeEvent<PointerEvent>) => void;
}

export const JengaBlockMesh: React.FC<JengaBlockMeshProps> = React.memo(
  ({
    woodVariant,
    isHovered,
    isSelected,
    isEligible,
    isInvalidFlash,
    isPlacing,
    isPlacementValid,
    playerAccentColor = PALETTE.electricAqua,
    onPointerOver,
    onPointerOut,
    onPointerDown,
  }) => {
    const geometry = useMemo(() => getSharedBlockGeometry(), []);
    const outlineGeo = useMemo(() => getSharedOutlineGeometry(), []);
    const woodSets = useMemo(() => getWoodMaterialSets(), []);
    const baseMaterial = woodSets[woodVariant % woodSets.length].material;

    const glowRef = useRef<THREE.Mesh>(null);
    const pulseRef = useRef(0);

    const showOutline = isHovered || isSelected || isInvalidFlash || isPlacing;

    const accentHex = isInvalidFlash
      ? PALETTE.warmTangerine
      : isPlacing
        ? isPlacementValid
          ? playerAccentColor
          : PALETTE.warmTangerine
        : isSelected
          ? playerAccentColor
          : isEligible
            ? playerAccentColor
            : PALETTE.warmTangerine;

    useFrame((_, delta) => {
      if (!glowRef.current) return;
      pulseRef.current += delta * 5.2;
      const mat = glowRef.current.material as THREE.MeshBasicMaterial;
      const targetOpacity = isInvalidFlash
        ? 0.34
        : isSelected || isPlacing
          ? 0.2 + Math.sin(pulseRef.current) * 0.05
          : isHovered
            ? isEligible
              ? 0.14
              : 0.1
            : 0;
      mat.opacity = THREE.MathUtils.lerp(mat.opacity, targetOpacity, Math.min(1, delta * 14));
    });

    return (
      <group>
        <mesh
          geometry={geometry}
          material={baseMaterial}
          castShadow
          receiveShadow
          onPointerOver={onPointerOver}
          onPointerOut={onPointerOut}
          onPointerDown={onPointerDown}
        />

        {/* Subtle tactile highlight overlay — never obscures natural wood grain */}
        <mesh ref={glowRef} scale={[1.007, 1.018, 1.014]} raycast={() => null}>
          <boxGeometry args={[BLOCK_LENGTH, BLOCK_HEIGHT, BLOCK_WIDTH]} />
          <meshBasicMaterial
            color={accentHex}
            transparent
            opacity={0}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>

        {/* Precision edge highlight for active/hovered/locked feedback */}
        {showOutline && (
          <lineSegments geometry={outlineGeo} raycast={() => null}>
            <lineBasicMaterial
              color={accentHex}
              transparent
              opacity={isSelected || isPlacing || isInvalidFlash ? 0.92 : isEligible ? 0.65 : 0.42}
            />
          </lineSegments>
        )}
      </group>
    );
  }
);
