import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '../store/useGameStore';
import { BLOCK_HEIGHT, BLOCK_LENGTH, BLOCK_WIDTH } from '../engine/constants';
import { MoveVisualState } from '../types/game';

/**
 * Computes a clean outward-bowing 3D carry arc from the block's extraction exit point
 * up and around the outside of the tower to the target placement slot on top.
 */
export function buildCarryArcCurve(
  exitPos: [number, number, number],
  toPos: [number, number, number]
): THREE.QuadraticBezierCurve3 {
  const start = new THREE.Vector3(...exitPos);
  const end = new THREE.Vector3(toPos[0], toPos[1] + 0.38, toPos[2]);

  // Bow outward away from the tower centerline (0, y, 0) so the block & trajectory stay completely visible
  const radial = new THREE.Vector3(start.x, 0, start.z);
  if (radial.lengthSq() < 0.01) radial.set(1, 0, 1);
  radial.normalize();

  const apexY = Math.max(start.y, end.y) + 2.35;
  const control = new THREE.Vector3(
    radial.x * 4.9,
    apexY,
    radial.z * 4.9
  );

  return new THREE.QuadraticBezierCurve3(start, control, end);
}

const FADE_DURATION_SEC = 3.8;

const MoveVisualInstance: React.FC<{
  move: MoveVisualState;
  isMemoryGhost: boolean;
}> = ({ move, isMemoryGhost }) => {
  const originGroupRef = useRef<THREE.Group>(null);
  const arrowRef = useRef<THREE.Group>(null);
  const dropRingRef = useRef<THREE.Mesh>(null);
  const beadsRef = useRef<Array<THREE.Mesh | null>>([]);
  const originFillMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const originEdgeMatRef = useRef<THREE.LineBasicMaterial>(null);
  const arcMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const dropEdgeMatRef = useRef<THREE.LineBasicMaterial>(null);

  const boxEdgeGeo = useMemo(() => {
    const b = new THREE.BoxGeometry(BLOCK_LENGTH + 0.04, BLOCK_HEIGHT + 0.04, BLOCK_WIDTH + 0.04);
    const e = new THREE.EdgesGeometry(b);
    b.dispose();
    return e;
  }, []);

  useEffect(() => {
    return () => {
      boxEdgeGeo.dispose();
    };
  }, [boxEdgeGeo]);

  // Precompute smooth 3D trajectory tube whenever exit & destination are known
  const { curve, tubeGeo } = useMemo(() => {
    if (!move.exitPosition || !move.toPosition) {
      return { curve: null, tubeGeo: null };
    }
    const c = buildCarryArcCurve(move.exitPosition, move.toPosition);
    const g = new THREE.TubeGeometry(c, 32, 0.042, 8, false);
    return { curve: c, tubeGeo: g };
  }, [move.exitPosition, move.toPosition]);

  useEffect(() => {
    return () => {
      tubeGeo?.dispose();
    };
  }, [tubeGeo]);

  // Arrow orientation pointing outward along pullDirection
  const pullYaw = useMemo(() => {
    const [dx, , dz] = move.pullDirection;
    return Math.atan2(dx, dz);
  }, [move.pullDirection]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    let fade = 1.0;

    if (isMemoryGhost) {
      const ageSec = (Date.now() - move.timestamp) / 1000;
      fade = Math.max(0, 1 - ageSec / FADE_DURATION_SEC);
      if (fade <= 0.01) {
        if (originGroupRef.current) originGroupRef.current.visible = false;
      } else {
        if (originGroupRef.current) originGroupRef.current.visible = true;
      }
    } else if (originGroupRef.current) {
      originGroupRef.current.visible = true;
    }

    const pulse = 0.72 + Math.sin(t * 6.0) * 0.28;

    if (originFillMatRef.current) {
      originFillMatRef.current.opacity = (isMemoryGhost ? 0.14 : 0.22 * pulse) * fade;
    }
    if (originEdgeMatRef.current) {
      originEdgeMatRef.current.opacity = (isMemoryGhost ? 0.55 : 0.92) * fade;
    }
    if (arcMatRef.current) {
      arcMatRef.current.opacity = (isMemoryGhost ? 0.35 : 0.62) * fade;
    }
    if (dropEdgeMatRef.current) {
      dropEdgeMatRef.current.opacity = (isMemoryGhost ? 0.6 : 0.95) * fade;
    }

    // Animate extraction pull chevron gliding outward along the pull axis
    if (arrowRef.current && !isMemoryGhost) {
      const slide = ((t * 1.65) % 1) * 1.15;
      const [dx, , dz] = move.pullDirection;
      arrowRef.current.position.set(
        move.fromPosition[0] + dx * (1.75 + slide),
        move.fromPosition[1],
        move.fromPosition[2] + dz * (1.75 + slide)
      );
    }

    // Animate luminous beads flowing along the 3D carry arc from removal gap -> top drop slot
    if (curve) {
      for (let i = 0; i < 5; i++) {
        const bead = beadsRef.current[i];
        if (!bead) continue;
        if (fade <= 0.02) {
          bead.visible = false;
          continue;
        }
        bead.visible = true;
        const u = ((t * 0.55 + i * 0.2) % 1);
        const pt = curve.getPoint(u);
        bead.position.copy(pt);
        const s = Math.sin(u * Math.PI) * (isMemoryGhost ? 0.75 : 1.05) * fade;
        bead.scale.setScalar(Math.max(0.01, s));
      }
    }

    // Subtle expanding pulse ring at the landing slot
    if (dropRingRef.current && move.toPosition) {
      const ringCycle = (t * 1.4) % 1;
      dropRingRef.current.scale.setScalar(1 + ringCycle * 0.35);
      const mat = dropRingRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = (1 - ringCycle) * (isMemoryGhost ? 0.45 : 0.65) * fade;
    }
  });

  const showArrow = !isMemoryGhost && (move.stage === 'inspecting' || move.stage === 'extracting');
  const showDropGuides = Boolean(move.toPosition);

  return (
    <group ref={originGroupRef}>
      {/* 1. Extraction Origin Beacon — shows WHERE the brick is being removed from */}
      <group position={move.fromPosition} rotation={[0, move.fromRotationY, 0]}>
        <mesh raycast={() => null}>
          <boxGeometry args={[BLOCK_LENGTH * 0.99, BLOCK_HEIGHT * 0.96, BLOCK_WIDTH * 0.96]} />
          <meshBasicMaterial
            ref={originFillMatRef}
            color={move.playerColor}
            transparent
            opacity={0.22}
            depthWrite={false}
          />
        </mesh>
        <lineSegments geometry={boxEdgeGeo} raycast={() => null}>
          <lineBasicMaterial
            ref={originEdgeMatRef}
            color={move.playerColor}
            transparent
            opacity={0.92}
          />
        </lineSegments>
      </group>

      {/* 2. Animated Directional Pull Arrow — shows WHICH WAY the brick is sliding out */}
      {showArrow && (
        <group ref={arrowRef} position={move.fromPosition} rotation={[0, pullYaw, 0]}>
          {/* Arrow shaft */}
          <mesh position={[0, 0, -0.32]} rotation={[Math.PI / 2, 0, 0]} raycast={() => null}>
            <cylinderGeometry args={[0.055, 0.055, 0.65, 10]} />
            <meshBasicMaterial color={move.playerColor} transparent opacity={0.9} />
          </mesh>
          {/* Arrow cone tip pointing along +Z (rotated by pullYaw) */}
          <mesh position={[0, 0, 0.18]} rotation={[Math.PI / 2, 0, 0]} raycast={() => null}>
            <coneGeometry args={[0.19, 0.42, 12]} />
            <meshBasicMaterial color={move.playerColor} transparent opacity={0.95} />
          </mesh>
        </group>
      )}

      {/* 3. Glowing Curved 3D Carry Arc & Animated Motion Beads */}
      {tubeGeo && (
        <group>
          <mesh geometry={tubeGeo} raycast={() => null}>
            <meshBasicMaterial
              ref={arcMatRef}
              color={move.playerColor}
              transparent
              opacity={0.58}
              depthWrite={false}
            />
          </mesh>
          {[0, 1, 2, 3, 4].map((idx) => (
            <mesh
              key={idx}
              ref={(el) => {
                beadsRef.current[idx] = el;
              }}
              raycast={() => null}
            >
              <sphereGeometry args={[0.11, 10, 10]} />
              <meshBasicMaterial color={move.playerColor} transparent opacity={0.95} />
            </mesh>
          ))}
        </group>
      )}

      {/* 4. Landing Target Beacon & Vertical Corner Drop Guides — shows WHERE the brick is dropped */}
      {showDropGuides && move.toPosition && (
        <group position={move.toPosition} rotation={[0, move.toRotationY ?? 0, 0]}>
          <lineSegments geometry={boxEdgeGeo} raycast={() => null}>
            <lineBasicMaterial
              ref={dropEdgeMatRef}
              color={move.playerColor}
              transparent
              opacity={0.95}
            />
          </lineSegments>

          {/* Vertical alignment drop guides above the 4 corners during active carry/drop */}
          {!isMemoryGhost &&
            [
              [-BLOCK_LENGTH * 0.48, -BLOCK_WIDTH * 0.48],
              [BLOCK_LENGTH * 0.48, -BLOCK_WIDTH * 0.48],
              [-BLOCK_LENGTH * 0.48, BLOCK_WIDTH * 0.48],
              [BLOCK_LENGTH * 0.48, BLOCK_WIDTH * 0.48],
            ].map(([cx, cz], i) => (
              <mesh key={i} position={[cx, 0.85, cz]} raycast={() => null}>
                <cylinderGeometry args={[0.022, 0.022, 1.4, 6]} />
                <meshBasicMaterial color={move.playerColor} transparent opacity={0.55} />
              </mesh>
            ))}

          {/* Expanding pulse halo right at the landing spot */}
          <mesh
            ref={dropRingRef}
            position={[0, -BLOCK_HEIGHT * 0.45, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            raycast={() => null}
          >
            <ringGeometry args={[1.15, 1.32, 32]} />
            <meshBasicMaterial
              color={move.playerColor}
              transparent
              opacity={0.5}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
        </group>
      )}
    </group>
  );
};

export const MoveVisualizer: React.FC = () => {
  const screen = useGameStore((s) => s.screen);
  const turnPhase = useGameStore((s) => s.turnPhase);
  const activeMoveVisual = useGameStore((s) => s.activeMoveVisual);
  const lastCompletedMove = useGameStore((s) => s.lastCompletedMove);

  if (screen !== 'playing' || turnPhase === 'collapsing' || turnPhase === 'gameover') {
    return null;
  }

  return (
    <group>
      {activeMoveVisual && (
        <MoveVisualInstance
          key={`active-${activeMoveVisual.blockId}-${activeMoveVisual.timestamp}`}
          move={activeMoveVisual}
          isMemoryGhost={false}
        />
      )}
      {!activeMoveVisual && lastCompletedMove && (
        <MoveVisualInstance
          key={`last-${lastCompletedMove.blockId}-${lastCompletedMove.timestamp}`}
          move={lastCompletedMove}
          isMemoryGhost={true}
        />
      )}
    </group>
  );
};
