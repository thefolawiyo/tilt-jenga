import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { PEDESTAL_HEIGHT, PEDESTAL_TOP_Y } from '../engine/constants';
import { getCrowdTextiles } from '../engine/crowdTextures';
import { SceneId } from '../types/game';

const FLOOR_Y = PEDESTAL_TOP_Y - PEDESTAL_HEIGHT - 2.3; // -3.4

interface SceneWorldProps {
  sceneId: SceneId;
  reducedMotion: boolean;
}

/** ==================== 1. LAGOS MARKET SQUARE ==================== */
const LagosMarketWorld: React.FC<{ reducedMotion: boolean }> = ({ reducedMotion }) => {
  const textiles = useMemo(() => getCrowdTextiles(), []);
  const buntingRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (reducedMotion || !buntingRef.current) return;
    buntingRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 1.3) * 0.015;
  });

  const stalls = useMemo(() => {
    const angles = [
      -Math.PI * 0.88,
      -Math.PI * 0.65,
      -Math.PI * 0.35,
      -Math.PI * 0.12,
      Math.PI * 0.16,
      Math.PI * 0.42,
      Math.PI * 0.72,
      Math.PI * 0.94,
    ];
    const canopyColors = ['#D95338', '#2A9D8F', '#E9A83B', '#B83B5E', '#3A7CA5', '#D96B27'];
    return angles.map((angle, i) => {
      const r = 16.5 + (i % 2) * 1.4;
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      return {
        x,
        z,
        rotY: Math.atan2(-x, -z),
        canopyColor: canopyColors[i % canopyColors.length],
        useTextile: i % 2 === 0,
        textileKey: (i % 4 === 0 ? 'kente' : i % 4 === 1 ? 'ankaraTeal' : i % 4 === 2 ? 'ankaraCrimson' : 'dashikiRoyal') as
          | 'kente'
          | 'ankaraTeal'
          | 'ankaraCrimson'
          | 'dashikiRoyal',
      };
    });
  }, []);

  const buildings = useMemo(
    () => [
      { pos: [-26, FLOOR_Y + 6.5, -24] as [number, number, number], size: [12, 13, 8] as [number, number, number], color: '#A66A43' },
      { pos: [-11, FLOOR_Y + 5.5, -27] as [number, number, number], size: [13, 11, 7] as [number, number, number], color: '#C48B5C' },
      { pos: [7, FLOOR_Y + 7.0, -27] as [number, number, number], size: [14, 14, 8] as [number, number, number], color: '#94573B' },
      { pos: [24, FLOOR_Y + 6.0, -22] as [number, number, number], size: [11, 12, 9] as [number, number, number], color: '#BA7E4E' },
      { pos: [-28, FLOOR_Y + 5.8, -5] as [number, number, number], size: [8, 11.6, 14] as [number, number, number], color: '#8F5A3C' },
      { pos: [28, FLOOR_Y + 6.2, -2] as [number, number, number], size: [8, 12.4, 15] as [number, number, number], color: '#B07447' },
    ],
    []
  );

  return (
    <group>
      {/* Sun-baked patterned market square paving & terracotta border ring */}
      <mesh position={[0, FLOOR_Y + 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[12.5, 48]} />
        <meshStandardMaterial color="#8A725E" roughness={0.92} />
      </mesh>
      <mesh position={[0, FLOOR_Y + 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[8.2, 8.65, 56]} />
        <meshStandardMaterial color="#D97A42" roughness={0.85} />
      </mesh>

      {/* Open-air Market Stalls with Ankara/Kente Canopies, Crates & Fabric Rolls */}
      {stalls.map((s, idx) => (
        <group key={idx} position={[s.x, FLOOR_Y, s.z]} rotation={[0, s.rotY, 0]}>
          {/* Timber stall posts */}
          {[-2.2, 2.2].map((px) =>
            [-1.3, 1.3].map((pz) => (
              <mesh key={`${px}-${pz}`} position={[px, 1.85, pz]} castShadow>
                <cylinderGeometry args={[0.08, 0.09, 3.7, 8]} />
                <meshStandardMaterial color="#593822" roughness={0.9} />
              </mesh>
            ))
          )}
          {/* Angled Market Canopy */}
          <mesh position={[0, 3.75, 0]} rotation={[0.14, 0, 0]} castShadow>
            <boxGeometry args={[5.2, 0.14, 3.4]} />
            <meshStandardMaterial
              color={s.useTextile ? '#FFFFFF' : s.canopyColor}
              map={s.useTextile ? textiles[s.textileKey] : undefined}
              roughness={0.8}
            />
          </mesh>
          {/* Wooden display counter & colorful goods */}
          <mesh position={[0, 0.9, 0.25]} castShadow receiveShadow>
            <boxGeometry args={[4.4, 0.9, 1.4]} />
            <meshStandardMaterial color="#7C4F2E" roughness={0.88} />
          </mesh>
          {/* Stacked fabric bolts & produce baskets */}
          {[-1.4, -0.5, 0.45, 1.35].map((gx, gi) => (
            <mesh key={gi} position={[gx, 1.56, 0.25]} rotation={[0, 0.2 * gi, Math.PI / 2]}>
              <cylinderGeometry args={[0.24, 0.24, 0.65, 10]} />
              <meshStandardMaterial
                color={['#F5D061', '#E05A47', '#2A9D8F', '#FF9B65'][(idx + gi) % 4]}
                roughness={0.75}
              />
            </mesh>
          ))}
          {/* Side wooden crate */}
          <mesh position={[-2.6, 0.48, 0.4]}>
            <boxGeometry args={[0.9, 0.95, 0.9]} />
            <meshStandardMaterial color="#6D4426" roughness={0.9} />
          </mesh>
        </group>
      ))}

      {/* Swaying festive overhead market bunting */}
      <group ref={buntingRef} position={[0, FLOOR_Y + 9.2, 0]}>
        {[0, Math.PI / 3, (2 * Math.PI) / 3].map((rot, idx) => (
          <group key={idx} rotation={[0, rot, 0]}>
            {Array.from({ length: 9 }).map((_, fi) => {
              const t = (fi - 4) * 3.1;
              const sag = -Math.cos(((fi - 4) / 4) * (Math.PI / 2)) * 1.1;
              return (
                <mesh key={fi} position={[t, sag, 0]} rotation={[0, 0, Math.PI]}>
                  <coneGeometry args={[0.32, 0.55, 3]} />
                  <meshStandardMaterial
                    color={['#F5D061', '#64E5D2', '#FF9B65', '#E85D4A'][(idx + fi) % 4]}
                    roughness={0.7}
                  />
                </mesh>
              );
            })}
          </group>
        ))}
      </group>

      {/* Background Lagos Commercial Buildings */}
      {buildings.map((b, i) => (
        <group key={i} position={b.pos}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={b.size} />
            <meshStandardMaterial color={b.color} roughness={0.9} />
          </mesh>
          {/* Corrugated awning & upper balcony strip */}
          <mesh position={[0, -b.size[1] * 0.1, b.size[2] * 0.54]} rotation={[0.25, 0, 0]}>
            <boxGeometry args={[b.size[0] * 0.92, 0.16, 1.4]} />
            <meshStandardMaterial color="#4A3D36" roughness={0.8} metalness={0.25} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

/** ==================== 2. LAGOS ISLAND STREET ==================== */
const LagosIslandWorld: React.FC<{ reducedMotion: boolean }> = ({ reducedMotion }) => {
  const movingDanfoRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (reducedMotion || !movingDanfoRef.current) return;
    // Gentle distant traffic pass far behind the play area
    const cycle = ((state.clock.elapsedTime * 3.8 + 30) % 76) - 38;
    movingDanfoRef.current.position.x = cycle;
  });

  const buildings = useMemo(
    () => [
      { x: -20, z: -27, w: 11, h: 17, d: 8, color: '#242D40', sign: '#64E5D2' },
      { x: -7, z: -28, w: 12, h: 21, d: 8, color: '#2E374C', sign: '#FF9B65' },
      { x: 7, z: -28, w: 12, h: 16, d: 8, color: '#273145', sign: '#F5D061' },
      { x: 20, z: -27, w: 11, h: 19, d: 8, color: '#1F283A', sign: '#8581FF' },
      { x: -27, z: -8, w: 8, h: 15, d: 16, color: '#283144', sign: '#F5D061' },
      { x: 27, z: -6, w: 8, h: 16, d: 18, color: '#232C3E', sign: '#64E5D2' },
    ],
    []
  );

  const renderDanfo = (key: string, pos: [number, number, number], rotY: number, ref?: React.RefObject<THREE.Group>) => (
    <group key={key} ref={ref} position={pos} rotation={[0, rotY, 0]}>
      {/* Classic Lagos yellow Danfo body */}
      <mesh position={[0, 1.35, 0]} castShadow>
        <boxGeometry args={[4.8, 1.9, 2.05]} />
        <meshStandardMaterial color="#F2C037" roughness={0.45} metalness={0.18} />
      </mesh>
      {/* Iconic double black side stripe */}
      <mesh position={[0, 1.15, 0]}>
        <boxGeometry args={[4.84, 0.24, 2.08]} />
        <meshStandardMaterial color="#151820" roughness={0.7} />
      </mesh>
      {/* Tinted cabin windows */}
      <mesh position={[0.15, 1.75, 0]}>
        <boxGeometry args={[4.2, 0.65, 2.09]} />
        <meshStandardMaterial color="#172236" roughness={0.2} metalness={0.5} />
      </mesh>
      {/* Headlights & taillights */}
      <mesh position={[2.42, 0.95, 0.65]}>
        <boxGeometry args={[0.08, 0.26, 0.36]} />
        <meshStandardMaterial color="#FFF3C4" emissive="#FFE394" emissiveIntensity={1.6} />
      </mesh>
      <mesh position={[2.42, 0.95, -0.65]}>
        <boxGeometry args={[0.08, 0.26, 0.36]} />
        <meshStandardMaterial color="#FFF3C4" emissive="#FFE394" emissiveIntensity={1.6} />
      </mesh>
      <mesh position={[-2.42, 0.95, 0.65]}>
        <boxGeometry args={[0.08, 0.24, 0.34]} />
        <meshStandardMaterial color="#FF4B4B" emissive="#FF3B3B" emissiveIntensity={1.4} />
      </mesh>
      <mesh position={[-2.42, 0.95, -0.65]}>
        <boxGeometry args={[0.08, 0.24, 0.34]} />
        <meshStandardMaterial color="#FF4B4B" emissive="#FF3B3B" emissiveIntensity={1.4} />
      </mesh>
      {/* 4 Wheels */}
      {[-1.45, 1.45].map((wx) =>
        [-0.95, 0.95].map((wz) => (
          <mesh key={`${wx}-${wz}`} position={[wx, 0.44, wz]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.42, 0.42, 0.28, 14]} />
            <meshStandardMaterial color="#14171D" roughness={0.9} />
          </mesh>
        ))
      )}
    </group>
  );

  return (
    <group>
      {/* Painted Urban Concrete Sidewalk Pad + Asphalt Boulevard */}
      <mesh position={[0, FLOOR_Y + 0.04, 0]} receiveShadow>
        <boxGeometry args={[20, 0.14, 19]} />
        <meshStandardMaterial color="#424856" roughness={0.92} />
      </mesh>
      {/* Yellow/Black Street Curb Trim */}
      {[-9.8, 9.8].map((z, i) => (
        <mesh key={i} position={[0, FLOOR_Y + 0.12, z]}>
          <boxGeometry args={[20.2, 0.16, 0.36]} />
          <meshStandardMaterial color={i === 0 ? '#F5D061' : '#3A4150'} roughness={0.85} />
        </mesh>
      ))}
      {/* Main Lagos Island Asphalt Road Strip Behind */}
      <mesh position={[0, FLOOR_Y + 0.01, -17.5]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[86, 13]} />
        <meshStandardMaterial color="#1E222B" roughness={0.95} />
      </mesh>
      {/* Dashed Yellow Road Center Markings */}
      {Array.from({ length: 13 }).map((_, i) => (
        <mesh key={i} position={[(i - 6) * 5.8, FLOOR_Y + 0.03, -17.5]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[3.0, 0.24]} />
          <meshStandardMaterial color="#F5D061" roughness={0.75} />
        </mesh>
      ))}

      {/* Iconic Lagos Danfo Buses (1 cruising in distance, 1 parked across road) */}
      {renderDanfo('danfo-cruising', [-14, FLOOR_Y, -15.5], 0, movingDanfoRef)}
      {renderDanfo('danfo-parked', [15.5, FLOOR_Y, -20.2], Math.PI)}

      {/* Tall Lagos Urban Streetlights */}
      {[-12, 0, 12].map((lx, i) => (
        <group key={i} position={[lx, FLOOR_Y, -11.2]}>
          <mesh position={[0, 4.4, 0]}>
            <cylinderGeometry args={[0.1, 0.15, 8.8, 10]} />
            <meshStandardMaterial color="#485062" metalness={0.6} roughness={0.4} />
          </mesh>
          <mesh position={[0, 8.75, -0.7]}>
            <boxGeometry args={[0.45, 0.16, 1.5]} />
            <meshStandardMaterial color="#586278" metalness={0.5} />
          </mesh>
          <mesh position={[0, 8.62, -1.25]}>
            <boxGeometry args={[0.34, 0.1, 0.5]} />
            <meshStandardMaterial color="#FFE4A8" emissive="#FFD47A" emissiveIntensity={2.0} />
          </mesh>
        </group>
      ))}

      {/* Multi-Story Commercial Storefronts & Glowing Signboards */}
      {buildings.map((b, idx) => (
        <group key={idx} position={[b.x, FLOOR_Y + b.h / 2, b.z]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[b.w, b.h, b.d]} />
            <meshStandardMaterial color={b.color} roughness={0.85} />
          </mesh>
          {/* Glowing shopfront fascia signboard */}
          <mesh position={[0, -b.h * 0.28, b.d * 0.51]}>
            <boxGeometry args={[b.w * 0.82, 1.25, 0.2]} />
            <meshStandardMaterial color={b.sign} emissive={b.sign} emissiveIntensity={0.95} roughness={0.35} />
          </mesh>
          {/* Upper lit office windows */}
          {[-0.1, 0.15, 0.35].map((yf, wi) => (
            <mesh key={wi} position={[0, b.h * yf, b.d * 0.51]}>
              <boxGeometry args={[b.w * 0.72, 0.85, 0.08]} />
              <meshStandardMaterial color="#FFDFB0" emissive="#FFCA7A" emissiveIntensity={0.45} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
};

/** ==================== 3. PARIS — EIFFEL TOWER PLAZA ==================== */
const ParisEiffelWorld: React.FC<{ reducedMotion: boolean }> = ({ reducedMotion }) => {
  const beaconRef = useRef<THREE.MeshStandardMaterial>(null);

  useFrame((state) => {
    if (reducedMotion || !beaconRef.current) return;
    beaconRef.current.emissiveIntensity = 1.6 + Math.sin(state.clock.elapsedTime * 2.4) * 0.7;
  });

  return (
    <group>
      {/* Parisian Limestone Cobblestone Plaza & Decorative Radial Rings */}
      <mesh position={[0, FLOOR_Y + 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[18, 64]} />
        <meshStandardMaterial color="#A39889" roughness={0.9} />
      </mesh>
      <mesh position={[0, FLOOR_Y + 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[8.4, 9.0, 64]} />
        <meshStandardMaterial color="#CFC4B4" roughness={0.82} />
      </mesh>
      <mesh position={[0, FLOOR_Y + 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[14.2, 14.8, 64]} />
        <meshStandardMaterial color="#C8BCA9" roughness={0.85} />
      </mesh>

      {/* Iconic 3D Eiffel Tower rising off-center in the background (clear of Jenga silhouette!) */}
      <group position={[-17, FLOOR_Y, -34]} rotation={[0, 0.32, 0]} scale={1.12}>
        {/* 4 Tapered Steel Base Legs */}
        {[
          [-5.2, -5.2, 0.19, -0.19],
          [5.2, -5.2, 0.19, 0.19],
          [-5.2, 5.2, -0.19, -0.19],
          [5.2, 5.2, -0.19, 0.19],
        ].map(([lx, lz, rx, rz], idx) => (
          <mesh key={idx} position={[lx * 0.72, 6.2, lz * 0.72]} rotation={[rx, 0, rz]}>
            <boxGeometry args={[2.1, 13.5, 2.1]} />
            <meshStandardMaterial color="#58473E" roughness={0.62} metalness={0.48} />
          </mesh>
        ))}

        {/* Decorative Base Arches */}
        {[0, Math.PI / 2, Math.PI, -Math.PI / 2].map((ry, i) => (
          <mesh key={i} position={[0, 5.2, 0]} rotation={[0, ry, 0]}>
            <torusGeometry args={[3.2, 0.42, 8, 20, Math.PI]} />
            <meshStandardMaterial color="#6A574B" roughness={0.6} metalness={0.45} />
          </mesh>
        ))}

        {/* First Observation Deck */}
        <mesh position={[0, 12.2, 0]}>
          <boxGeometry args={[9.6, 1.3, 9.6]} />
          <meshStandardMaterial color="#6D5A4E" roughness={0.55} metalness={0.45} />
        </mesh>
        <mesh position={[0, 12.2, 0]}>
          <boxGeometry args={[9.8, 0.25, 9.8]} />
          <meshStandardMaterial color="#FFDCA0" emissive="#FFCB7A" emissiveIntensity={1.2} />
        </mesh>

        {/* Mid Tapered Shaft */}
        <mesh position={[0, 18.2, 0]}>
          <cylinderGeometry args={[2.4, 4.4, 11.2, 4]} />
          <meshStandardMaterial color="#5E4D42" roughness={0.6} metalness={0.5} />
        </mesh>

        {/* Second Observation Deck */}
        <mesh position={[0, 23.6, 0]}>
          <boxGeometry args={[5.4, 1.0, 5.4]} />
          <meshStandardMaterial color="#705C50" roughness={0.55} metalness={0.48} />
        </mesh>
        <mesh position={[0, 23.6, 0]}>
          <boxGeometry args={[5.6, 0.22, 5.6]} />
          <meshStandardMaterial color="#FFE2AB" emissive="#FFD080" emissiveIntensity={1.3} />
        </mesh>

        {/* Tall Iconic Upper Spire */}
        <mesh position={[0, 34.5, 0]}>
          <cylinderGeometry args={[0.65, 2.35, 21, 4]} />
          <meshStandardMaterial color="#635146" roughness={0.58} metalness={0.52} />
        </mesh>

        {/* Summit Cupola & Golden Beacon */}
        <mesh position={[0, 45.4, 0]}>
          <cylinderGeometry args={[0.9, 1.0, 1.4, 8]} />
          <meshStandardMaterial color="#786356" metalness={0.55} />
        </mesh>
        <mesh position={[0, 48.2, 0]}>
          <cylinderGeometry args={[0.08, 0.22, 4.8, 8]} />
          <meshStandardMaterial color="#9E8B78" metalness={0.7} />
        </mesh>
        <mesh position={[0, 46.4, 0]}>
          <sphereGeometry args={[0.65, 14, 14]} />
          <meshStandardMaterial ref={beaconRef} color="#FFF0C4" emissive="#FFD584" emissiveIntensity={2.0} />
        </mesh>
      </group>

      {/* Parisian Boulevard Lamps & Clipped Garden Hedges */}
      {[
        [-11.5, -10.5],
        [11.5, -10.5],
        [-14.5, 2.5],
        [14.5, 2.5],
      ].map(([lx, lz], i) => (
        <group key={i} position={[lx, FLOOR_Y, lz]}>
          <mesh position={[0, 2.8, 0]} castShadow>
            <cylinderGeometry args={[0.09, 0.18, 5.6, 10]} />
            <meshStandardMaterial color="#25302B" metalness={0.55} roughness={0.45} />
          </mesh>
          <mesh position={[0, 5.8, 0]}>
            <sphereGeometry args={[0.38, 12, 12]} />
            <meshStandardMaterial color="#FFF0C8" emissive="#FFD486" emissiveIntensity={1.7} />
          </mesh>
        </group>
      ))}

      {/* Clipped Champ de Mars Hedges */}
      {[
        [-15.5, -15.5, 11, 0],
        [15.5, -15.5, 11, 0],
        [-18.5, -3, 12, Math.PI / 2],
        [18.5, -3, 12, Math.PI / 2],
      ].map(([hx, hz, len, ry], i) => (
        <mesh key={i} position={[hx, FLOOR_Y + 0.95, hz]} rotation={[0, ry, 0]} castShadow receiveShadow>
          <boxGeometry args={[len, 1.9, 1.8]} />
          <meshStandardMaterial color="#34593E" roughness={0.92} />
        </mesh>
      ))}
    </group>
  );
};

/** ==================== 4. INDOOR GYM ==================== */
const IndoorGymWorld: React.FC = () => {
  return (
    <group>
      {/* Dark Speckled Rubber Gym Floor + Aqua Training Lane Lines */}
      <mesh position={[0, FLOOR_Y + 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[46, 46]} />
        <meshStandardMaterial color="#1E242C" roughness={0.88} />
      </mesh>
      {[-8.8, 8.8].map((x, i) => (
        <mesh key={i} position={[x, FLOOR_Y + 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.24, 24]} />
          <meshStandardMaterial color="#64E5D2" emissive="#64E5D2" emissiveIntensity={0.35} />
        </mesh>
      ))}

      {/* Gym Back & Side Architectural Walls with Mirror Panels */}
      {[
        { pos: [0, FLOOR_Y + 6.5, -17.5] as [number, number, number], rotY: 0 },
        { pos: [-17.5, FLOOR_Y + 6.5, 0] as [number, number, number], rotY: Math.PI / 2 },
        { pos: [17.5, FLOOR_Y + 6.5, 0] as [number, number, number], rotY: -Math.PI / 2 },
      ].map((w, i) => (
        <group key={i} position={w.pos} rotation={[0, w.rotY, 0]}>
          <mesh receiveShadow>
            <boxGeometry args={[35, 13, 0.5]} />
            <meshStandardMaterial color="#181F28" roughness={0.85} />
          </mesh>
          {/* Mirror panels */}
          {[-9, 0, 9].map((mx, mi) => (
            <mesh key={mi} position={[mx, -0.5, 0.32]}>
              <boxGeometry args={[6.8, 6.4, 0.08]} />
              <meshStandardMaterial color="#2D3E52" roughness={0.12} metalness={0.82} />
            </mesh>
          ))}
        </group>
      ))}

      {/* Overhead Industrial LED Light Bars */}
      {[-9, 0, 9].map((z, i) => (
        <mesh key={i} position={[0, FLOOR_Y + 12.2, z]}>
          <boxGeometry args={[18, 0.18, 0.45]} />
          <meshStandardMaterial color="#E6F7FF" emissive="#C8EEFF" emissiveIntensity={1.8} />
        </mesh>
      ))}

      {/* Steel Squat Racks with Loaded Barbells */}
      {[-9.5, 9.5].map((rx, idx) => (
        <group key={idx} position={[rx, FLOOR_Y, -13.2]}>
          {[-1.3, 1.3].map((px) =>
            [-0.8, 0.8].map((pz) => (
              <mesh key={`${px}-${pz}`} position={[px, 2.3, pz]} castShadow>
                <boxGeometry args={[0.16, 4.6, 0.16]} />
                <meshStandardMaterial color="#384452" metalness={0.75} roughness={0.35} />
              </mesh>
            ))
          )}
          {/* Top pull-up bar */}
          <mesh position={[0, 4.5, 0.8]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.06, 0.06, 2.7, 10]} />
            <meshStandardMaterial color="#64E5D2" metalness={0.6} roughness={0.35} />
          </mesh>
          {/* Loaded Barbell */}
          <mesh position={[0, 2.1, 0.82]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.045, 0.045, 3.8, 12]} />
            <meshStandardMaterial color="#C8D4E0" metalness={0.88} roughness={0.22} />
          </mesh>
          {[-1.65, 1.65].map((wx) => (
            <mesh key={wx} position={[wx, 2.1, 0.82]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.56, 0.56, 0.22, 18]} />
              <meshStandardMaterial color="#232B34" roughness={0.7} />
            </mesh>
          ))}
        </group>
      ))}

      {/* Dumbbell Rack & Wooden Plyo Boxes */}
      <group position={[-13.5, FLOOR_Y, -3.5]} rotation={[0, Math.PI / 2, 0]}>
        <mesh position={[0, 0.75, 0]} castShadow>
          <boxGeometry args={[6.4, 1.1, 1.1]} />
          <meshStandardMaterial color="#293340" metalness={0.65} roughness={0.4} />
        </mesh>
        {[-2.4, -1.2, 0, 1.2, 2.4].map((dx, i) => (
          <mesh key={i} position={[dx, 1.45, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.24, 0.24, 0.7, 12]} />
            <meshStandardMaterial color="#4E5B6B" metalness={0.75} roughness={0.35} />
          </mesh>
        ))}
      </group>
      <mesh position={[13.2, FLOOR_Y + 0.65, -4.5]} rotation={[0, 0.2, 0]} castShadow>
        <boxGeometry args={[1.6, 1.3, 1.4]} />
        <meshStandardMaterial color="#B58A5E" roughness={0.85} />
      </mesh>
    </group>
  );
};

/** ==================== 5. OFFICE LOUNGE ==================== */
const OfficeLoungeWorld: React.FC = () => {
  return (
    <group>
      {/* Warm Contemporary Timber Lounge Floor */}
      <mesh position={[0, FLOOR_Y + 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[46, 46]} />
        <meshStandardMaterial color="#5E4A3A" roughness={0.82} />
      </mesh>

      {/* Glass Partition Walls with Brushed Aluminum Mullions */}
      <group position={[0, FLOOR_Y + 5.5, -16.5]}>
        <mesh>
          <boxGeometry args={[32, 11, 0.16]} />
          <meshStandardMaterial color="#6D84A8" transparent opacity={0.22} roughness={0.12} metalness={0.35} />
        </mesh>
        {[-12, -6, 0, 6, 12].map((mx) => (
          <mesh key={mx} position={[mx, 0, 0]}>
            <boxGeometry args={[0.22, 11, 0.28]} />
            <meshStandardMaterial color="#394254" metalness={0.65} roughness={0.35} />
          </mesh>
        ))}
      </group>

      {/* Distant Dusk Skyline Silhouettes visible through Glass Wall */}
      {[-16, -8, 2, 11, 19].map((bx, i) => (
        <mesh key={i} position={[bx, FLOOR_Y + 7 + (i % 3) * 3, -27]}>
          <boxGeometry args={[5.5, 16 + (i % 3) * 6, 4]} />
          <meshStandardMaterial color="#1A2033" roughness={0.9} />
        </mesh>
      ))}

      {/* Contemporary Lounge Sofas */}
      {[
        { pos: [-11.5, FLOOR_Y, -9.5] as [number, number, number], rotY: 0.55, color: '#3E4766' },
        { pos: [11.5, FLOOR_Y, -9.5] as [number, number, number], rotY: -0.55, color: '#4B5578' },
      ].map((sofa, i) => (
        <group key={i} position={sofa.pos} rotation={[0, sofa.rotY, 0]}>
          <mesh position={[0, 0.65, 0]} castShadow receiveShadow>
            <boxGeometry args={[5.4, 0.9, 1.9]} />
            <meshStandardMaterial color={sofa.color} roughness={0.88} />
          </mesh>
          <mesh position={[0, 1.4, -0.72]} castShadow>
            <boxGeometry args={[5.4, 1.15, 0.45]} />
            <meshStandardMaterial color={sofa.color} roughness={0.88} />
          </mesh>
        </group>
      ))}

      {/* Tall Potted Indoor Monstera/Ficus Planters */}
      {[
        [-13.5, -13.5],
        [13.5, -13.5],
        [-14.5, 3.5],
        [14.5, 3.5],
      ].map(([px, pz], i) => (
        <group key={i} position={[px, FLOOR_Y, pz]}>
          <mesh position={[0, 0.75, 0]} castShadow>
            <cylinderGeometry args={[0.68, 0.52, 1.5, 14]} />
            <meshStandardMaterial color="#B57A56" roughness={0.82} />
          </mesh>
          <mesh position={[0, 2.2, 0]} castShadow>
            <dodecahedronGeometry args={[1.15, 1]} />
            <meshStandardMaterial color="#346E4B" roughness={0.85} />
          </mesh>
          <mesh position={[0.45, 2.85, 0.25]}>
            <dodecahedronGeometry args={[0.75, 1]} />
            <meshStandardMaterial color="#42875C" roughness={0.85} />
          </mesh>
        </group>
      ))}

      {/* Warm Sculptural Pendant Lamps */}
      {[-7.5, 0, 7.5].map((lx, i) => (
        <group key={i} position={[lx, FLOOR_Y + 11.2, -4]}>
          <mesh position={[0, 1.6, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 3.2, 6]} />
            <meshStandardMaterial color="#454C5C" />
          </mesh>
          <mesh>
            <cylinderGeometry args={[0.45, 0.95, 0.55, 18]} />
            <meshStandardMaterial color="#FFE2B8" emissive="#FFD08E" emissiveIntensity={1.4} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

/** ==================== 6. NEIGHBOURHOOD BAR ==================== */
const NeighbourhoodBarWorld: React.FC = () => {
  return (
    <group>
      {/* Rich Dark Walnut Floor */}
      <mesh position={[0, FLOOR_Y + 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[46, 46]} />
        <meshStandardMaterial color="#382419" roughness={0.84} />
      </mesh>

      {/* Warm Acoustic Timber-and-Brick Perimeter Walls */}
      <mesh position={[0, FLOOR_Y + 6.5, -16.8]} receiveShadow>
        <boxGeometry args={[36, 13, 0.6]} />
        <meshStandardMaterial color="#2E1C15" roughness={0.9} />
      </mesh>

      {/* Grand Backlit Bar Counter & Glowing Amber Shelves */}
      <group position={[0, FLOOR_Y, -13.6]}>
        {/* Main walnut counter */}
        <mesh position={[0, 1.25, 0.8]} castShadow receiveShadow>
          <boxGeometry args={[16, 2.5, 1.8]} />
          <meshStandardMaterial color="#4F3120" roughness={0.72} />
        </mesh>
        {/* Polished bar top */}
        <mesh position={[0, 2.58, 0.8]} castShadow>
          <boxGeometry args={[16.6, 0.2, 2.2]} />
          <meshStandardMaterial color="#70472E" roughness={0.35} metalness={0.12} />
        </mesh>
        {/* Warm Backlit Shelving Strips */}
        {[3.2, 5.1, 7.0].map((sy, si) => (
          <group key={si} position={[0, sy, -2.5]}>
            <mesh>
              <boxGeometry args={[14.5, 0.16, 0.85]} />
              <meshStandardMaterial color="#5E3A24" roughness={0.7} />
            </mesh>
            <mesh position={[0, 0.16, -0.34]}>
              <boxGeometry args={[14.2, 0.12, 0.08]} />
              <meshStandardMaterial color="#FFD08A" emissive="#FF9B45" emissiveIntensity={1.65} />
            </mesh>
          </group>
        ))}
        {/* Leather Bar Stools */}
        {[-5.5, -3.2, -1.0, 1.2, 3.4, 5.6].map((sx, i) => (
          <group key={i} position={[sx, 0, 2.55]}>
            <mesh position={[0, 0.9, 0]}>
              <cylinderGeometry args={[0.08, 0.1, 1.8, 8]} />
              <meshStandardMaterial color="#241914" metalness={0.5} />
            </mesh>
            <mesh position={[0, 1.85, 0]} castShadow>
              <cylinderGeometry args={[0.45, 0.42, 0.18, 16]} />
              <meshStandardMaterial color="#8F4F32" roughness={0.65} />
            </mesh>
          </group>
        ))}
      </group>

      {/* Round Bistro Tables with Warm Glowing Table Lanterns */}
      {[
        [-11.8, -5.5],
        [11.8, -5.5],
        [-12.2, 4.8],
        [12.2, 4.8],
      ].map(([tx, tz], i) => (
        <group key={i} position={[tx, FLOOR_Y, tz]}>
          <mesh position={[0, 1.0, 0]}>
            <cylinderGeometry args={[0.1, 0.45, 2.0, 12]} />
            <meshStandardMaterial color="#241812" metalness={0.45} />
          </mesh>
          <mesh position={[0, 2.04, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[1.35, 1.35, 0.14, 24]} />
            <meshStandardMaterial color="#69412A" roughness={0.65} />
          </mesh>
          <mesh position={[0, 2.3, 0]}>
            <cylinderGeometry args={[0.12, 0.14, 0.34, 10]} />
            <meshStandardMaterial color="#FFE2A8" emissive="#FFA64D" emissiveIntensity={1.9} />
          </mesh>
        </group>
      ))}

      {/* Hanging Brass Pendant Lanterns */}
      {[-7, 0, 7].map((lx, i) => (
        <group key={i} position={[lx, FLOOR_Y + 10.6, -7.5]}>
          <mesh position={[0, 1.8, 0]}>
            <cylinderGeometry args={[0.025, 0.025, 3.6, 6]} />
            <meshStandardMaterial color="#5E4634" />
          </mesh>
          <mesh>
            <sphereGeometry args={[0.52, 14, 14]} />
            <meshStandardMaterial color="#FFE0A6" emissive="#FFAE52" emissiveIntensity={1.85} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

/** ==================== 7. PUBLIC PARK ==================== */
const PublicParkWorld: React.FC<{ reducedMotion: boolean }> = ({ reducedMotion }) => {
  const foliageGroupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (reducedMotion || !foliageGroupRef.current) return;
    foliageGroupRef.current.children.forEach((tree, i) => {
      tree.rotation.z = Math.sin(state.clock.elapsedTime * 1.1 + i * 1.3) * 0.018;
    });
  });

  const trees = useMemo(
    () => [
      { pos: [-16, -14], s: 1.25 },
      { pos: [-7, -18], s: 1.1 },
      { pos: [6, -19], s: 1.35 },
      { pos: [16, -13], s: 1.15 },
      { pos: [-19, -2], s: 1.2 },
      { pos: [19, -1], s: 1.3 },
      { pos: [-17, 11], s: 1.15 },
      { pos: [17, 10], s: 1.2 },
      { pos: [0, -23], s: 1.45 },
      { pos: [-24, -18], s: 1.35 },
      { pos: [23, -19], s: 1.3 },
    ],
    []
  );

  return (
    <group>
      {/* Circular Cedar Timber Deck & Stone Border */}
      <mesh position={[0, FLOOR_Y + 0.08, 0]} receiveShadow>
        <cylinderGeometry args={[9.4, 9.8, 0.24, 48]} />
        <meshStandardMaterial color="#9C714A" roughness={0.86} />
      </mesh>
      {/* Stone Park Walking Paths */}
      <mesh position={[0, FLOOR_Y + 0.03, -15]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[5.2, 24]} />
        <meshStandardMaterial color="#BFB4A2" roughness={0.92} />
      </mesh>
      <mesh position={[0, FLOOR_Y + 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <ringGeometry args={[12.5, 15.2, 48]} />
        <meshStandardMaterial color="#B8AD9B" roughness={0.92} />
      </mesh>

      {/* Swaying Stylized Multi-Tier Shade Trees */}
      <group ref={foliageGroupRef}>
        {trees.map((t, i) => (
          <group key={i} position={[t.pos[0], FLOOR_Y, t.pos[1]]} scale={t.s}>
            <mesh position={[0, 2.4, 0]} castShadow>
              <cylinderGeometry args={[0.28, 0.45, 4.8, 10]} />
              <meshStandardMaterial color="#61432C" roughness={0.92} />
            </mesh>
            <mesh position={[0, 5.4, 0]} castShadow>
              <dodecahedronGeometry args={[2.3, 1]} />
              <meshStandardMaterial color={i % 2 === 0 ? '#2E6E3E' : '#3A804A'} roughness={0.88} />
            </mesh>
            <mesh position={[1.1, 6.2, 0.6]}>
              <dodecahedronGeometry args={[1.45, 1]} />
              <meshStandardMaterial color="#4A9456" roughness={0.88} />
            </mesh>
            <mesh position={[-1.0, 5.9, -0.5]}>
              <dodecahedronGeometry args={[1.35, 1]} />
              <meshStandardMaterial color="#275E34" roughness={0.88} />
            </mesh>
          </group>
        ))}
      </group>

      {/* Wooden Park Benches */}
      {[
        { pos: [-11.5, FLOOR_Y, -9.8] as [number, number, number], rotY: 0.68 },
        { pos: [11.5, FLOOR_Y, -9.8] as [number, number, number], rotY: -0.68 },
        { pos: [-13.5, FLOOR_Y, 4.2] as [number, number, number], rotY: 1.35 },
      ].map((bench, i) => (
        <group key={i} position={bench.pos} rotation={[0, bench.rotY, 0]}>
          <mesh position={[0, 0.85, 0]} castShadow>
            <boxGeometry args={[3.4, 0.16, 0.9]} />
            <meshStandardMaterial color="#8F603B" roughness={0.85} />
          </mesh>
          <mesh position={[0, 1.45, -0.38]} rotation={[-0.18, 0, 0]} castShadow>
            <boxGeometry args={[3.4, 0.65, 0.12]} />
            <meshStandardMaterial color="#8F603B" roughness={0.85} />
          </mesh>
          {[-1.35, 1.35].map((bx) => (
            <mesh key={bx} position={[bx, 0.45, 0]}>
              <boxGeometry args={[0.14, 0.9, 0.82]} />
              <meshStandardMaterial color="#2B3330" metalness={0.5} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
};

/** ==================== 8. COSY LIVING ROOM (INTENTIONALLY NO AUDIENCE) ==================== */
const LivingRoomWorld: React.FC = () => {
  return (
    <group>
      {/* Warm Parquet Floor & Plush Woven Geometric Area Rug */}
      <mesh position={[0, FLOOR_Y + 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[42, 42]} />
        <meshStandardMaterial color="#593F2D" roughness={0.82} />
      </mesh>
      <mesh position={[0, FLOOR_Y + 0.05, 0]} receiveShadow>
        <cylinderGeometry args={[10.5, 10.5, 0.08, 48]} />
        <meshStandardMaterial color="#3B314A" roughness={0.95} />
      </mesh>
      <mesh position={[0, FLOOR_Y + 0.095, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[9.6, 10.1, 48]} />
        <meshStandardMaterial color="#C9B4FF" roughness={0.9} />
      </mesh>

      {/* Enclosed Apartment Perimeter Walls */}
      <mesh position={[0, FLOOR_Y + 6.5, -15.5]} receiveShadow>
        <boxGeometry args={[32, 13, 0.5]} />
        <meshStandardMaterial color="#2D2535" roughness={0.9} />
      </mesh>
      <mesh position={[-15.5, FLOOR_Y + 6.5, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <boxGeometry args={[32, 13, 0.5]} />
        <meshStandardMaterial color="#282130" roughness={0.9} />
      </mesh>

      {/* Large Dusk Window */}
      <group position={[-6.5, FLOOR_Y + 6.2, -15.1]}>
        <mesh>
          <boxGeometry args={[8.5, 6.2, 0.18]} />
          <meshStandardMaterial color="#2E3B61" emissive="#1F2B4D" emissiveIntensity={0.75} roughness={0.2} />
        </mesh>
        <mesh position={[0, 0, 0.1]}>
          <boxGeometry args={[0.18, 6.2, 0.12]} />
          <meshStandardMaterial color="#4E4259" />
        </mesh>
        <mesh position={[0, 0, 0.1]}>
          <boxGeometry args={[8.5, 0.18, 0.12]} />
          <meshStandardMaterial color="#4E4259" />
        </mesh>
      </group>

      {/* Floor-to-Ceiling Wooden Bookshelf with Colorful Books */}
      <group position={[7.5, FLOOR_Y, -14.3]}>
        <mesh position={[0, 4.4, 0]} castShadow>
          <boxGeometry args={[6.4, 8.8, 1.4]} />
          <meshStandardMaterial color="#4A3224" roughness={0.82} />
        </mesh>
        {[1.5, 3.1, 4.7, 6.3].map((sy, si) => (
          <mesh key={si} position={[0, sy, 0.45]}>
            <boxGeometry args={[5.4, 0.72, 0.65]} />
            <meshStandardMaterial
              color={['#8581FF', '#FF9B65', '#64E5D2', '#E5B86B'][si % 4]}
              roughness={0.78}
            />
          </mesh>
        ))}
      </group>

      {/* Plush Sectional Sofa & Standing Floor Lamp */}
      <group position={[-11.2, FLOOR_Y, -3.5]} rotation={[0, Math.PI / 2, 0]}>
        <mesh position={[0, 0.75, 0]} castShadow receiveShadow>
          <boxGeometry args={[8.5, 1.0, 2.4]} />
          <meshStandardMaterial color="#4D425E" roughness={0.92} />
        </mesh>
        <mesh position={[0, 1.55, -0.95]} castShadow>
          <boxGeometry args={[8.5, 1.25, 0.55]} />
          <meshStandardMaterial color="#4D425E" roughness={0.92} />
        </mesh>
        {/* Warm throw pillows */}
        <mesh position={[-2.8, 1.45, -0.25]} rotation={[0.15, 0.25, 0.1]}>
          <boxGeometry args={[1.0, 0.95, 0.35]} />
          <meshStandardMaterial color="#FF9B65" roughness={0.9} />
        </mesh>
        <mesh position={[2.6, 1.45, -0.25]} rotation={[0.12, -0.22, -0.08]}>
          <boxGeometry args={[1.0, 0.95, 0.35]} />
          <meshStandardMaterial color="#64E5D2" roughness={0.9} />
        </mesh>
      </group>

      {/* Brass & Warm Linen Standing Floor Lamp */}
      <group position={[-11.2, FLOOR_Y, -10.8]}>
        <mesh position={[0, 2.6, 0]}>
          <cylinderGeometry args={[0.06, 0.08, 5.2, 10]} />
          <meshStandardMaterial color="#C8A977" metalness={0.75} roughness={0.3} />
        </mesh>
        <mesh position={[0, 5.3, 0]}>
          <cylinderGeometry args={[0.55, 0.95, 1.15, 18, 1, true]} />
          <meshStandardMaterial
            color="#FFF0D6"
            emissive="#FFCF8A"
            emissiveIntensity={1.65}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>
    </group>
  );
};

export const SceneWorld: React.FC<SceneWorldProps> = ({ sceneId, reducedMotion }) => {
  switch (sceneId) {
    case 'lagos-market':
      return <LagosMarketWorld reducedMotion={reducedMotion} />;
    case 'lagos-island':
      return <LagosIslandWorld reducedMotion={reducedMotion} />;
    case 'paris-eiffel':
      return <ParisEiffelWorld reducedMotion={reducedMotion} />;
    case 'indoor-gym':
      return <IndoorGymWorld />;
    case 'office-lounge':
      return <OfficeLoungeWorld />;
    case 'neighbourhood-bar':
      return <NeighbourhoodBarWorld />;
    case 'public-park':
      return <PublicParkWorld reducedMotion={reducedMotion} />;
    case 'living-room':
      return <LivingRoomWorld />;
    case 'boxing-ring':
    default:
      // BoxingRingArena is preserved intact inside PlayersAndAudience
      return null;
  }
};
