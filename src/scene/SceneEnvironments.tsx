import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { PEDESTAL_HEIGHT, PEDESTAL_TOP_Y } from '../engine/constants';
import { getCrowdTextiles } from '../engine/crowdTextures';
import { getEnvironmentPbrLibrary } from '../engine/environmentMaterials';
import { SceneId } from '../types/game';

const FLOOR_Y = PEDESTAL_TOP_Y - PEDESTAL_HEIGHT - 2.3; // -3.4

interface SceneWorldProps {
  sceneId: SceneId;
  reducedMotion: boolean;
}

/** ==================== 1. LAGOS MARKET SQUARE (FLAGSHIP AAA PBR SCENE) ==================== */
const LagosMarketWorld: React.FC<{ reducedMotion: boolean }> = ({ reducedMotion }) => {
  const textiles = useMemo(() => getCrowdTextiles(), []);
  const pbr = useMemo(() => getEnvironmentPbrLibrary(), []);
  const buntingRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (reducedMotion || !buntingRef.current) return;
    buntingRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 1.25) * 0.014;
  });

  const stalls = useMemo(() => {
    const angles = [
      -Math.PI * 0.88,
      -Math.PI * 0.65,
      -Math.PI * 0.35,
      -Math.PI * 0.12,
      Math.PI * 0.16,
      Math.PI * 0.44,
      Math.PI * 0.74,
      Math.PI * 0.94,
    ];
    const drapes = [
      'ankaraPeacock',
      'ankaraCrimson',
      'ankaraSunGold',
      'ankaraCobaltAdire',
      'ankaraOrangeScallop',
      'kente',
      'ankaraTeal',
      'dashikiRoyal',
    ] as const;
    return angles.map((angle, i) => {
      const r = 16.2 + (i % 2) * 1.3;
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      return {
        x,
        z,
        rotY: Math.atan2(-x, -z),
        drapeKey: drapes[i % drapes.length],
        secondaryDrape: drapes[(i + 3) % drapes.length],
        produceColors:
          i % 3 === 0
            ? ['#E86A24', '#D93B2B', '#F2B705']
            : i % 3 === 1
              ? ['#4F8A38', '#E59A2B', '#C9382B']
              : ['#D95338', '#F2C14E', '#3A8249'],
      };
    });
  }, []);

  const plazaBuildings = useMemo(
    () => [
      { pos: [-25, FLOOR_Y, -25] as [number, number, number], w: 13, h: 12.5, d: 8, tint: '#C9976B', trim: '#8F4E2E', rotY: 0.12 },
      { pos: [-10, FLOOR_Y, -28] as [number, number, number], w: 14, h: 11.2, d: 8, tint: '#DEC2A2', trim: '#2E6B5E', rotY: 0 },
      { pos: [7, FLOOR_Y, -28] as [number, number, number], w: 14, h: 13.4, d: 8, tint: '#C4845C', trim: '#A33E2D', rotY: 0 },
      { pos: [23, FLOOR_Y, -23] as [number, number, number], w: 12, h: 11.8, d: 8, tint: '#D8B388', trim: '#365880', rotY: -0.18 },
      { pos: [-28, FLOOR_Y, -6] as [number, number, number], w: 15, h: 11.5, d: 8, tint: '#BA8159', trim: '#7A4226', rotY: Math.PI / 2 },
      { pos: [28, FLOOR_Y, -4] as [number, number, number], w: 15, h: 12.2, d: 8, tint: '#D4AF8A', trim: '#2E6B5E', rotY: -Math.PI / 2 },
    ],
    []
  );

  return (
    <group>
      {/* Textured Market Square Paving & Weathered Concrete Curb Ring */}
      <mesh position={[0, FLOOR_Y + 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[14.2, 56]} />
        <meshStandardMaterial
          map={pbr.cobblestone.map}
          bumpMap={pbr.cobblestone.bumpMap}
          bumpScale={0.1}
          color="#C2AC94"
          roughness={0.92}
        />
      </mesh>
      <mesh position={[0, FLOOR_Y + 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[8.4, 8.95, 64]} />
        <meshStandardMaterial
          map={pbr.boardConcrete.map}
          bumpMap={pbr.boardConcrete.bumpMap}
          bumpScale={0.06}
          color="#C98856"
          roughness={0.88}
        />
      </mesh>

      {/* Authentic Balogun-Style Market Stalls with Corrugated Zinc Roofs, Draped Ankara & Produce Baskets */}
      {stalls.map((s, idx) => (
        <group key={idx} position={[s.x, FLOOR_Y, s.z]} rotation={[0, s.rotY, 0]}>
          {/* Weathered timber corner posts + diagonal roof braces */}
          {[-2.35, 2.35].map((px) =>
            [-1.35, 1.35].map((pz) => (
              <mesh key={`${px}-${pz}`} position={[px, 2.0, pz]} castShadow>
                <cylinderGeometry args={[0.075, 0.09, 4.0, 8]} />
                <meshStandardMaterial map={pbr.bark.map} bumpMap={pbr.bark.bumpMap} bumpScale={0.05} color="#6E4A2E" roughness={0.92} />
              </mesh>
            ))
          )}
          {/* Timber roof beams */}
          <mesh position={[0, 3.72, 1.35]}>
            <boxGeometry args={[5.1, 0.14, 0.14]} />
            <meshStandardMaterial color="#593B24" roughness={0.9} />
          </mesh>
          <mesh position={[0, 4.18, -1.35]}>
            <boxGeometry args={[5.1, 0.14, 0.14]} />
            <meshStandardMaterial color="#593B24" roughness={0.9} />
          </mesh>

          {/* Ribbed Corrugated Zinc Market Roof */}
          <mesh position={[0, 4.04, 0]} rotation={[0.17, 0, 0]} castShadow receiveShadow>
            <boxGeometry args={[5.55, 0.11, 3.65]} />
            <meshStandardMaterial
              map={pbr.corrugatedZinc.map}
              bumpMap={pbr.corrugatedZinc.bumpMap}
              bumpScale={0.12}
              color="#D2CFC9"
              roughness={0.58}
              metalness={0.42}
            />
          </mesh>

          {/* Draped Vibrant Ankara Wax-Print Valance & Hanging Textile Swatches */}
          <mesh position={[0, 3.35, 1.44]}>
            <boxGeometry args={[4.95, 0.65, 0.06]} />
            <meshStandardMaterial
              map={textiles[s.drapeKey]}
              bumpMap={textiles.fabricBump}
              bumpScale={0.02}
              roughness={0.88}
            />
          </mesh>
          {[-1.7, 1.7].map((dx, di) => (
            <mesh key={di} position={[dx, 2.55, 1.38]} rotation={[0, 0, di === 0 ? 0.04 : -0.04]}>
              <boxGeometry args={[0.92, 1.85, 0.06]} />
              <meshStandardMaterial
                map={textiles[di === 0 ? s.drapeKey : s.secondaryDrape]}
                bumpMap={textiles.fabricBump}
                bumpScale={0.02}
                roughness={0.88}
              />
            </mesh>
          ))}

          {/* Slatted Wooden Display Table */}
          <mesh position={[0, 0.96, 0.25]} castShadow receiveShadow>
            <boxGeometry args={[4.5, 0.14, 1.55]} />
            <meshStandardMaterial map={pbr.cedarSlats.map} bumpMap={pbr.cedarSlats.bumpMap} bumpScale={0.05} color="#B8875B" roughness={0.88} />
          </mesh>
          {[-2.0, 2.0].map((lx) => (
            <mesh key={lx} position={[lx, 0.48, 0.25]} castShadow>
              <boxGeometry args={[0.18, 0.96, 1.38]} />
              <meshStandardMaterial color="#614027" roughness={0.9} />
            </mesh>
          ))}

          {/* Woven Produce Baskets with Fresh Oranges/Peppers + Folded Ankara Bolts */}
          {[-1.35, 0.0, 1.35].map((bx, bi) => (
            <group key={bi} position={[bx, 1.03, 0.3]}>
              <mesh position={[0, 0.22, 0]} castShadow>
                <cylinderGeometry args={[0.42, 0.3, 0.44, 14]} />
                <meshStandardMaterial map={pbr.cedarSlats.map} color="#B88D5A" roughness={0.92} />
              </mesh>
              {/* Produce mound inside wicker basket */}
              <mesh position={[0, 0.44, 0]}>
                <sphereGeometry args={[0.36, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
                <meshStandardMaterial color={s.produceColors[bi % 3]} roughness={0.72} />
              </mesh>
            </group>
          ))}
          {/* Stacked folded Ankara bolts on back shelf */}
          {[-0.7, 0.7].map((fx, fi) => (
            <mesh key={fi} position={[fx, 1.25, -0.35]} rotation={[0, 0.15 * fi, Math.PI / 2]}>
              <cylinderGeometry args={[0.2, 0.2, 0.8, 12]} />
              <meshStandardMaterial
                map={textiles[fi === 0 ? s.drapeKey : s.secondaryDrape]}
                bumpMap={textiles.fabricBump}
                bumpScale={0.02}
                roughness={0.88}
              />
            </mesh>
          ))}
          {/* Timber transport crate beside stall */}
          <mesh position={[-2.75, 0.48, 0.5]} castShadow>
            <boxGeometry args={[0.92, 0.96, 0.92]} />
            <meshStandardMaterial map={pbr.cedarSlats.map} bumpMap={pbr.cedarSlats.bumpMap} bumpScale={0.06} color="#9E7146" roughness={0.9} />
          </mesh>
        </group>
      ))}

      {/* Perimeter Market String-Light Cables & Warm Edison Bulbs Framing the Outer Stalls (never crosses tower!) */}
      <group ref={buntingRef} position={[0, FLOOR_Y + 8.6, 0]}>
        {Array.from({ length: 8 }).map((_, idx) => {
          const a0 = (idx / 8) * Math.PI * 2;
          const a1 = ((idx + 1) / 8) * Math.PI * 2;
          const r = 15.4;
          const x0 = Math.cos(a0) * r;
          const z0 = Math.sin(a0) * r;
          const x1 = Math.cos(a1) * r;
          const z1 = Math.sin(a1) * r;
          const mx = (x0 + x1) * 0.5;
          const mz = (z0 + z1) * 0.5;
          const span = Math.hypot(x1 - x0, z1 - z0);
          const rotY = Math.atan2(x1 - x0, z1 - z0);
          return (
            <group key={idx} position={[mx, 0, mz]} rotation={[0, rotY, 0]}>
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.024, 0.024, span, 6]} />
                <meshStandardMaterial color="#1E1C1A" roughness={0.85} />
              </mesh>
              {[-3.6, -1.8, 0, 1.8, 3.6].map((bz, bi) => (
                <mesh key={bi} position={[0, -0.14 - (1 - Math.abs(bz) / 4.2) * 0.22, bz]}>
                  <sphereGeometry args={[0.11, 8, 8]} />
                  <meshStandardMaterial color="#FFF3D2" emissive="#FFCC6E" emissiveIntensity={1.45} />
                </mesh>
              ))}
            </group>
          );
        })}
      </group>

      {/* Authentic 2-Story Weathered Lagos Commercial Plaza Buildings with Arcades, Mullioned Windows, Balconies & Rooftop Water Tanks */}
      {plazaBuildings.map((b, i) => (
        <group key={i} position={b.pos} rotation={[0, b.rotY, 0]}>
          {/* Main stucco plaster facade */}
          <mesh position={[0, b.h * 0.5, 0]} castShadow receiveShadow>
            <boxGeometry args={[b.w, b.h, b.d]} />
            <meshStandardMaterial
              map={pbr.lagosPlaster.map}
              bumpMap={pbr.lagosPlaster.bumpMap}
              bumpScale={0.07}
              color={b.tint}
              roughness={0.92}
            />
          </mesh>
          {/* Roof parapet coping */}
          <mesh position={[0, b.h + 0.16, 0]}>
            <boxGeometry args={[b.w + 0.3, 0.34, b.d + 0.3]} />
            <meshStandardMaterial map={pbr.boardConcrete.map} color="#B8A996" roughness={0.88} />
          </mesh>
          {/* Painted commercial fascia band */}
          <mesh position={[0, 4.3, b.d * 0.51]}>
            <boxGeometry args={[b.w * 0.96, 1.05, 0.25]} />
            <meshStandardMaterial color={b.trim} roughness={0.78} />
          </mesh>
          {/* Corrugated zinc shopfront awning */}
          <mesh position={[0, 3.65, b.d * 0.58]} rotation={[0.24, 0, 0]} castShadow>
            <boxGeometry args={[b.w * 0.94, 0.12, 2.2]} />
            <meshStandardMaterial
              map={pbr.corrugatedZinc.map}
              bumpMap={pbr.corrugatedZinc.bumpMap}
              bumpScale={0.1}
              roughness={0.58}
              metalness={0.4}
            />
          </mesh>
          {/* Ground-floor recessed shop bays & detailed upper-story framed mullioned windows */}
          {[-b.w * 0.34, 0, b.w * 0.34].map((cx, ci) => (
            <group key={ci}>
              <mesh position={[cx, 1.75, b.d * 0.5 + 0.05]}>
                <boxGeometry args={[b.w * 0.24, 3.3, 0.14]} />
                <meshStandardMaterial color="#231B16" roughness={0.92} />
              </mesh>
              {/* Recessed reflective upper window with cream concrete frame, lintel, sill & mullions */}
              <group position={[cx, 7.2, b.d * 0.5 + 0.05]}>
                {/* Outer concrete window surround */}
                <mesh position={[0, 0, 0]}>
                  <boxGeometry args={[2.16, 2.66, 0.14]} />
                  <meshStandardMaterial color="#D8CBB8" roughness={0.86} />
                </mesh>
                {/* Tinted glass pane */}
                <mesh position={[0, 0, 0.05]}>
                  <boxGeometry args={[1.82, 2.3, 0.08]} />
                  <meshStandardMaterial color="#384758" roughness={0.22} metalness={0.42} />
                </mesh>
                {/* Window mullions */}
                <mesh position={[0, 0, 0.1]}>
                  <boxGeometry args={[0.09, 2.3, 0.06]} />
                  <meshStandardMaterial color="#E6DDD0" roughness={0.78} />
                </mesh>
                <mesh position={[0, 0.15, 0.1]}>
                  <boxGeometry args={[1.82, 0.09, 0.06]} />
                  <meshStandardMaterial color="#E6DDD0" roughness={0.78} />
                </mesh>
                {/* Projecting concrete sill & hood lintel */}
                <mesh position={[0, -1.36, 0.12]}>
                  <boxGeometry args={[2.32, 0.16, 0.28]} />
                  <meshStandardMaterial color="#C8BAA6" roughness={0.88} />
                </mesh>
                <mesh position={[0, 1.4, 0.14]}>
                  <boxGeometry args={[2.38, 0.18, 0.32]} />
                  <meshStandardMaterial color="#C8BAA6" roughness={0.88} />
                </mesh>
              </group>
            </group>
          ))}
          {/* Upper balcony slab & wrought-iron rail */}
          <mesh position={[0, 5.5, b.d * 0.57]} castShadow>
            <boxGeometry args={[b.w * 0.92, 0.26, 1.6]} />
            <meshStandardMaterial map={pbr.boardConcrete.map} color="#9E958A" roughness={0.9} />
          </mesh>
          <mesh position={[0, 6.25, b.d * 0.64]}>
            <boxGeometry args={[b.w * 0.9, 0.08, 0.08]} />
            <meshStandardMaterial color="#1E2128" metalness={0.55} roughness={0.45} />
          </mesh>
          {/* Iconic rooftop black poly water tank */}
          <mesh position={[b.w * 0.26, b.h + 0.95, 0]} castShadow>
            <cylinderGeometry args={[0.92, 0.95, 1.9, 16]} />
            <meshStandardMaterial color="#181C22" roughness={0.55} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

/** ==================== 2. PARIS — EIFFEL TOWER PLAZA (REF 1 ART DIRECTION) ==================== */
const ParisEiffelWorld: React.FC<{ reducedMotion: boolean }> = ({ reducedMotion }) => {
  const pbr = useMemo(() => getEnvironmentPbrLibrary(), []);
  const beaconRef = useRef<THREE.MeshStandardMaterial>(null);

  useFrame((state) => {
    if (reducedMotion || !beaconRef.current) return;
    beaconRef.current.emissiveIntensity = 1.4 + Math.sin(state.clock.elapsedTime * 2.0) * 0.5;
  });

  // Helper to build an open-work steel lattice tier (sky visibly shines through!)
  const renderLatticeTier = (
    key: string,
    yBottom: number,
    height: number,
    halfBottom: number,
    halfTop: number,
    segments: number
  ) => {
    const legGeoLen = Math.hypot(height, halfBottom - halfTop);
    const tilt = Math.atan2(halfBottom - halfTop, height);
    const midHalf = (halfBottom + halfTop) * 0.5;
    const midY = yBottom + height * 0.5;
    const steelColor = '#848C94';

    return (
      <group key={key}>
        {/* 4 Angled Open Steel Corner Legs */}
        {[
          [-1, -1, tilt, -tilt],
          [1, -1, tilt, tilt],
          [-1, 1, -tilt, -tilt],
          [1, 1, -tilt, tilt],
        ].map(([sx, sz, rx, rz], i) => (
          <mesh
            key={i}
            position={[sx * midHalf, midY, sz * midHalf]}
            rotation={[rx, 0, rz]}
          >
            <boxGeometry args={[0.58, legGeoLen, 0.58]} />
            <meshStandardMaterial color={steelColor} metalness={0.52} roughness={0.48} />
          </mesh>
        ))}

        {/* Horizontal & Diagonal X-Brace Lattice Struts */}
        {Array.from({ length: segments }).map((_, s) => {
          const t0 = s / segments;
          const t1 = (s + 1) / segments;
          const y0 = yBottom + height * t0;
          const yMid = yBottom + height * ((t0 + t1) * 0.5);
          const w0 = halfBottom + (halfTop - halfBottom) * t0;
          const wMid = halfBottom + (halfTop - halfBottom) * ((t0 + t1) * 0.5);
          const segH = height / segments;
          const diagLen = Math.hypot(wMid * 2, segH);
          const diagAngle = Math.atan2(segH, wMid * 2);

          return (
            <group key={s}>
              {/* 4 Horizontal ring girders */}
              <mesh position={[0, y0, -w0]}>
                <boxGeometry args={[w0 * 2, 0.24, 0.24]} />
                <meshStandardMaterial color={steelColor} metalness={0.5} roughness={0.5} />
              </mesh>
              <mesh position={[0, y0, w0]}>
                <boxGeometry args={[w0 * 2, 0.24, 0.24]} />
                <meshStandardMaterial color={steelColor} metalness={0.5} roughness={0.5} />
              </mesh>
              <mesh position={[-w0, y0, 0]}>
                <boxGeometry args={[0.24, 0.24, w0 * 2]} />
                <meshStandardMaterial color={steelColor} metalness={0.5} roughness={0.5} />
              </mesh>
              <mesh position={[w0, y0, 0]}>
                <boxGeometry args={[0.24, 0.24, w0 * 2]} />
                <meshStandardMaterial color={steelColor} metalness={0.5} roughness={0.5} />
              </mesh>

              {/* Front & Back X-Braces */}
              <mesh position={[0, yMid, wMid]} rotation={[0, 0, diagAngle]}>
                <boxGeometry args={[diagLen, 0.16, 0.16]} />
                <meshStandardMaterial color="#9098A0" metalness={0.48} roughness={0.5} />
              </mesh>
              <mesh position={[0, yMid, wMid]} rotation={[0, 0, -diagAngle]}>
                <boxGeometry args={[diagLen, 0.16, 0.16]} />
                <meshStandardMaterial color="#9098A0" metalness={0.48} roughness={0.5} />
              </mesh>
              <mesh position={[0, yMid, -wMid]} rotation={[0, 0, diagAngle]}>
                <boxGeometry args={[diagLen, 0.16, 0.16]} />
                <meshStandardMaterial color="#9098A0" metalness={0.48} roughness={0.5} />
              </mesh>
              <mesh position={[0, yMid, -wMid]} rotation={[0, 0, -diagAngle]}>
                <boxGeometry args={[diagLen, 0.16, 0.16]} />
                <meshStandardMaterial color="#9098A0" metalness={0.48} roughness={0.5} />
              </mesh>
            </group>
          );
        })}
      </group>
    );
  };

  return (
    <group>
      {/* Decorative Parisian Stone Inlay Border Rings atop Cobblestone Plaza */}
      <mesh position={[0, FLOOR_Y + 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <ringGeometry args={[8.5, 9.25, 64]} />
        <meshStandardMaterial
          map={pbr.parisStone.map}
          bumpMap={pbr.parisStone.bumpMap}
          bumpScale={0.07}
          color="#D4C9B8"
          roughness={0.86}
        />
      </mesh>

      {/* True Open-Work Iron Lattice Eiffel Tower (Ref 1 inspired — full airy silhouette & spire in frame!) */}
      <group position={[-10.5, FLOOR_Y, -38]} rotation={[0, 0.28, 0]} scale={0.76}>
        {renderLatticeTier('tier-1', 0, 12.5, 6.2, 4.1, 4)}
        {/* Semicircular Iron Base Arches */}
        {[0, Math.PI / 2, Math.PI, -Math.PI / 2].map((ry, i) => (
          <mesh key={i} position={[0, 4.6, 0]} rotation={[0, ry, 0]}>
            <torusGeometry args={[4.0, 0.36, 8, 24, Math.PI]} />
            <meshStandardMaterial color="#7C848C" metalness={0.52} roughness={0.48} />
          </mesh>
        ))}

        {/* First Observation Gallery Deck */}
        <mesh position={[0, 12.6, 0]}>
          <boxGeometry args={[9.0, 1.1, 9.0]} />
          <meshStandardMaterial color="#7C858E" metalness={0.5} roughness={0.48} />
        </mesh>

        {renderLatticeTier('tier-2', 13.1, 11.0, 3.9, 2.2, 4)}

        {/* Second Observation Gallery Deck */}
        <mesh position={[0, 24.3, 0]}>
          <boxGeometry args={[5.2, 0.9, 5.2]} />
          <meshStandardMaterial color="#838C95" metalness={0.52} roughness={0.46} />
        </mesh>

        {renderLatticeTier('tier-3', 24.8, 22.0, 2.1, 0.65, 7)}

        {/* Summit Cupola & Spire */}
        <mesh position={[0, 47.3, 0]}>
          <cylinderGeometry args={[0.75, 0.85, 1.4, 10]} />
          <meshStandardMaterial color="#8C959E" metalness={0.58} roughness={0.42} />
        </mesh>
        <mesh position={[0, 50.2, 0]}>
          <cylinderGeometry args={[0.06, 0.18, 4.8, 8]} />
          <meshStandardMaterial color="#A0A9B2" metalness={0.7} roughness={0.35} />
        </mesh>
        <mesh position={[0, 48.2, 0]}>
          <sphereGeometry args={[0.5, 12, 12]} />
          <meshStandardMaterial ref={beaconRef} color="#FFF3D4" emissive="#FFDC94" emissiveIntensity={1.6} />
        </mesh>
      </group>

      {/* Left Historic Parisian Limestone Wing (Ref 1 Haussmann Facade with Arched Windows & Cornice) */}
      <group position={[-22, FLOOR_Y, -16]} rotation={[0, 0.42, 0]}>
        <mesh position={[0, 5.5, 0]} castShadow receiveShadow>
          <boxGeometry args={[22, 11, 7]} />
          <meshStandardMaterial
            map={pbr.parisStone.map}
            bumpMap={pbr.parisStone.bumpMap}
            bumpScale={0.1}
            color="#D2C2AA"
            roughness={0.88}
          />
        </mesh>
        {/* Stone Cornice & Mansard Slate Roof */}
        <mesh position={[0, 11.2, 0.25]} castShadow>
          <boxGeometry args={[22.8, 0.7, 7.6]} />
          <meshStandardMaterial map={pbr.parisStone.map} color="#C4B39A" roughness={0.85} />
        </mesh>
        <mesh position={[0, 13.0, 0]} castShadow>
          <boxGeometry args={[21.2, 3.0, 6.0]} />
          <meshStandardMaterial color="#4A515E" roughness={0.78} metalness={0.15} />
        </mesh>
        {/* Arched Recessed Windows & Fluted Pilasters */}
        {[-8, -4, 0, 4, 8].map((wx, wi) => (
          <group key={wi} position={[wx, 4.2, 3.55]}>
            <mesh>
              <boxGeometry args={[2.1, 4.4, 0.18]} />
              <meshStandardMaterial color="#232832" roughness={0.28} metalness={0.35} />
            </mesh>
            {/* Window muntin cross */}
            <mesh position={[0, 0, 0.1]}>
              <boxGeometry args={[0.1, 4.3, 0.08]} />
              <meshStandardMaterial color="#D8CCB8" roughness={0.8} />
            </mesh>
            <mesh position={[0, 0.4, 0.1]}>
              <boxGeometry args={[2.0, 0.1, 0.08]} />
              <meshStandardMaterial color="#D8CCB8" roughness={0.8} />
            </mesh>
            {/* Stone pilaster column between arches */}
            <mesh position={[2.0, 0.6, 0.12]}>
              <boxGeometry args={[0.62, 9.2, 0.34]} />
              <meshStandardMaterial map={pbr.parisStone.map} color="#DFD2BE" roughness={0.86} />
            </mesh>
          </group>
        ))}
        {/* Grounded Carved Limestone Urn Planters + Climbing Ivy Pilaster Vines (Ref 1 detail — zero floating foliage!) */}
        {[-6.0, 2.0, 6.0].map((ix, ii) => (
          <group key={ii} position={[ix, 0, 3.95]}>
            {/* Stone pedestal & urn planter resting solidly on the cobblestones */}
            <mesh position={[0, 0.55, 0]} castShadow>
              <boxGeometry args={[1.2, 1.1, 1.2]} />
              <meshStandardMaterial map={pbr.parisStone.map} color="#C8BBA6" roughness={0.88} />
            </mesh>
            <mesh position={[0, 1.6, 0]} castShadow>
              <sphereGeometry args={[0.85, 12, 10]} />
              <meshStandardMaterial color={ii % 2 === 0 ? '#5C6E3B' : '#7D6A36'} roughness={0.92} />
            </mesh>
            {/* Vertical climbing ivy garland hugging the stone pilaster up to cornice */}
            <mesh position={[0, 5.2, -0.32]}>
              <boxGeometry args={[0.78, 7.6, 0.22]} />
              <meshStandardMaterial color={ii % 2 === 0 ? '#69743D' : '#857038'} roughness={0.94} />
            </mesh>
          </group>
        ))}
      </group>

      {/* Right Historic Parisian Slate-Brick Pavilion (Ref 1 right-hand building!) */}
      <group position={[18.5, FLOOR_Y, -15.5]} rotation={[0, -0.52, 0]}>
        <mesh position={[0, 6.2, 0]} castShadow receiveShadow>
          <boxGeometry args={[16, 12.4, 8]} />
          <meshStandardMaterial
            map={pbr.warmBrick.map}
            bumpMap={pbr.warmBrick.bumpMap}
            bumpScale={0.11}
            color="#6E7B94"
            roughness={0.88}
          />
        </mesh>
        {/* Stone corner quoins & gabled pediment roof */}
        <mesh position={[0, 14.0, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
          <coneGeometry args={[10.5, 4.2, 4]} />
          <meshStandardMaterial color="#3E4654" roughness={0.82} />
        </mesh>
        {[-4.4, 0, 4.4].map((wx, wi) => (
          <mesh key={wi} position={[wx, 5.2, 4.08]}>
            <boxGeometry args={[2.1, 3.8, 0.16]} />
            <meshStandardMaterial color="#1C2029" roughness={0.35} />
          </mesh>
        ))}
      </group>

      {/* Ornate Dark-Bronze Parisian Boulevard Streetlamps */}
      {[
        [-11.5, -10.5],
        [11.5, -10.5],
        [-14.5, 3.2],
        [14.5, 3.2],
      ].map(([lx, lz], i) => (
        <group key={i} position={[lx, FLOOR_Y, lz]}>
          <mesh position={[0, 0.6, 0]}>
            <cylinderGeometry args={[0.24, 0.34, 1.2, 10]} />
            <meshStandardMaterial color="#252E2A" metalness={0.55} roughness={0.45} />
          </mesh>
          <mesh position={[0, 3.2, 0]} castShadow>
            <cylinderGeometry args={[0.08, 0.15, 5.2, 10]} />
            <meshStandardMaterial color="#252E2A" metalness={0.55} roughness={0.45} />
          </mesh>
          <mesh position={[0, 6.0, 0]}>
            <cylinderGeometry args={[0.38, 0.24, 0.72, 6]} />
            <meshStandardMaterial color="#FFF3D2" emissive="#FFD584" emissiveIntensity={1.35} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

/** ==================== 3. MODERN INDOOR GYM (REF 2 ART DIRECTION) ==================== */
const IndoorGymWorld: React.FC = () => {
  const pbr = useMemo(() => getEnvironmentPbrLibrary(), []);

  return (
    <group>
      {/* Crisp White Dotted Sprint-Track Lane Markers on Speckled Rubber Floor (Ref 2!) */}
      {[-6.8, 6.8].map((lx, li) => (
        <group key={li}>
          {Array.from({ length: 14 }).map((_, i) => (
            <mesh key={i} position={[lx, FLOOR_Y + 0.03, -15 + i * 2.1]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[0.32, 0.65]} />
              <meshStandardMaterial color="#E6EAF0" roughness={0.82} />
            </mesh>
          ))}
        </group>
      ))}

      {/* Light Oak Wood-Plank Free-Weight Zone Inlay on the Right (Ref 2!) */}
      <mesh position={[12.8, FLOOR_Y + 0.025, -2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[12, 30]} />
        <meshStandardMaterial
          map={pbr.oakPlanks.map}
          bumpMap={pbr.oakPlanks.bumpMap}
          bumpScale={0.04}
          color="#DFC4A0"
          roughness={0.72}
        />
      </mesh>

      {/* Left Floor-to-Ceiling Black Steel Mullioned Window Wall + Lush Sunlit Outdoor Greenery (Ref 2!) */}
      <group position={[-16.8, FLOOR_Y, -2]}>
        {/* Bright sunlit exterior sky & greenery backdrop well behind the glass */}
        <mesh position={[-5.2, 9.5, 0]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[42, 22]} />
          <meshStandardMaterial color="#D8EBD0" emissive="#9EC496" emissiveIntensity={0.48} roughness={0.92} />
        </mesh>
        {[-12, -6, 0, 6, 11].map((gz, gi) => (
          <group key={gi} position={[-3.8, 0, gz]}>
            <mesh position={[0, 1.4, 0]}>
              <cylinderGeometry args={[0.24, 0.34, 2.8, 8]} />
              <meshStandardMaterial map={pbr.bark.map} color="#5B4432" roughness={0.92} />
            </mesh>
            <mesh position={[0, 3.8 + (gi % 2) * 1.1, 0]}>
              <dodecahedronGeometry args={[2.1, 1]} />
              <meshStandardMaterial color={gi % 2 === 0 ? '#4B7D3F' : '#65964C'} roughness={0.88} />
            </mesh>
          </group>
        ))}
        {/* Tall glass curtain wall reaching full 19.2m studio height */}
        <mesh position={[0, 9.6, 0]}>
          <boxGeometry args={[0.12, 19.2, 36]} />
          <meshStandardMaterial color="#D6ECFF" transparent opacity={0.16} roughness={0.08} metalness={0.2} />
        </mesh>
        {/* Black steel vertical & horizontal mullions */}
        {[-15, -10, -5, 0, 5, 10, 15].map((mz) => (
          <mesh key={mz} position={[0.08, 9.6, mz]}>
            <boxGeometry args={[0.18, 19.2, 0.16]} />
            <meshStandardMaterial color="#171A20" metalness={0.7} roughness={0.35} />
          </mesh>
        ))}
        {[3.8, 8.6, 13.6, 18.2].map((my) => (
          <mesh key={my} position={[0.08, my, 0]}>
            <boxGeometry args={[0.18, 0.16, 36]} />
            <meshStandardMaterial color="#171A20" metalness={0.7} roughness={0.35} />
          </mesh>
        ))}
      </group>

      {/* Raw Board-Formed Architectural Concrete Pillars (Ref 2 — full height to ceiling!) */}
      {[
        [-15.0, -14.2],
        [4.2, -14.5],
        [16.2, -14.5],
        [16.2, -2.5],
      ].map(([px, pz], i) => (
        <mesh key={i} position={[px, FLOOR_Y + 9.6, pz]} castShadow receiveShadow>
          <boxGeometry args={[1.65, 19.2, 1.65]} />
          <meshStandardMaterial
            map={pbr.boardConcrete.map}
            bumpMap={pbr.boardConcrete.bumpMap}
            bumpScale={0.08}
            color="#A8AAA6"
            roughness={0.88}
          />
        </mesh>
      ))}

      {/* Back Industrial Concrete Wall + Tall Back-Right Warm Slatted Cedar Architectural Feature (Ref 2!) */}
      <mesh position={[0, FLOOR_Y + 9.6, -18.2]} receiveShadow>
        <boxGeometry args={[38, 19.2, 0.6]} />
        <meshStandardMaterial
          map={pbr.boardConcrete.map}
          bumpMap={pbr.boardConcrete.bumpMap}
          bumpScale={0.07}
          color="#7A7E84"
          roughness={0.86}
        />
      </mesh>
      {/* Back-right warm cedar timber slatted accent header & ceiling drop soffit visible right in camera frame! */}
      <mesh position={[10.8, FLOOR_Y + 14.2, -17.5]}>
        <boxGeometry args={[14.8, 6.2, 0.45]} />
        <meshStandardMaterial
          map={pbr.cedarSlats.map}
          bumpMap={pbr.cedarSlats.bumpMap}
          bumpScale={0.14}
          color="#E6AF76"
          roughness={0.72}
        />
      </mesh>
      {/* Warm architectural linear cove strip under the cedar soffit */}
      <mesh position={[10.8, FLOOR_Y + 11.1, -17.2]}>
        <boxGeometry args={[14.0, 0.16, 0.22]} />
        <meshStandardMaterial color="#FFE9C8" emissive="#FFCA80" emissiveIntensity={1.6} />
      </mesh>

      {/* Right Concrete Wall + Tall Reflective Gym Mirrors */}
      <mesh position={[17.8, FLOOR_Y + 9.6, -2]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
        <boxGeometry args={[36, 19.2, 0.5]} />
        <meshStandardMaterial
          map={pbr.boardConcrete.map}
          bumpMap={pbr.boardConcrete.bumpMap}
          bumpScale={0.06}
          color="#72777E"
          roughness={0.85}
        />
      </mesh>
      {[-9, -1, 7].map((mz, i) => (
        <mesh key={i} position={[17.42, FLOOR_Y + 5.2, mz]}>
          <boxGeometry args={[0.08, 7.6, 6.8]} />
          <meshStandardMaterial color="#45505C" roughness={0.08} metalness={0.88} />
        </mesh>
      ))}

      {/* Full Enclosed High Architectural Ceiling (y = FLOOR_Y + 19.2 = 15.8 — ZERO tower obstruction & ZERO black void!) */}
      {/* Left Exposed Industrial Steel Ceiling Deck */}
      <mesh position={[-7.5, FLOOR_Y + 19.2, -2]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[21, 36]} />
        <meshStandardMaterial
          map={pbr.boardConcrete.map}
          color="#3A4048"
          roughness={0.86}
          metalness={0.2}
        />
      </mesh>
      {/* Right Warm Slatted Cedar Timber Baffle Ceiling (Ref 2!) */}
      <mesh position={[10.5, FLOOR_Y + 19.0, -2]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[15.5, 36]} />
        <meshStandardMaterial
          map={pbr.cedarSlats.map}
          bumpMap={pbr.cedarSlats.bumpMap}
          bumpScale={0.14}
          color="#E6AF76"
          roughness={0.74}
        />
      </mesh>
      {/* High Overhead Linear LED Fixtures (strictly at y = FLOOR_Y + 18.6, z <= -4 — never crosses tower!) */}
      {[-13, -7].map((lz, i) => (
        <group key={i}>
          <mesh position={[-6.0, FLOOR_Y + 18.6, lz]}>
            <boxGeometry args={[9.0, 0.2, 0.42]} />
            <meshStandardMaterial color="#F2FAFF" emissive="#E0F4FF" emissiveIntensity={1.5} />
          </mesh>
          <mesh position={[9.5, FLOOR_Y + 18.5, lz]}>
            <boxGeometry args={[8.5, 0.18, 0.36]} />
            <meshStandardMaterial color="#FFE8C8" emissive="#FFD090" emissiveIntensity={1.45} />
          </mesh>
        </group>
      ))}

      {/* Detailed Row of 3 Sculpted Treadmills Along Left Window Wall (Ref 2!) */}
      {[-9.5, -4.8, -0.2].map((tz, i) => (
        <group key={i} position={[-11.6, FLOOR_Y, tz]} rotation={[0, Math.PI / 2, 0]}>
          {/* Running deck & dark belt */}
          <mesh position={[0, 0.24, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.65, 0.3, 3.6]} />
            <meshStandardMaterial color="#2C323B" roughness={0.55} metalness={0.4} />
          </mesh>
          <mesh position={[0, 0.4, 0.1]}>
            <boxGeometry args={[1.28, 0.04, 3.1]} />
            <meshStandardMaterial color="#14171D" roughness={0.9} />
          </mesh>
          {/* Twin angled upright console arms */}
          {[-0.72, 0.72].map((ax) => (
            <mesh key={ax} position={[ax, 1.35, -1.25]} rotation={[0.18, 0, 0]} castShadow>
              <boxGeometry args={[0.14, 2.15, 0.24]} />
              <meshStandardMaterial color="#38404B" metalness={0.62} roughness={0.38} />
            </mesh>
          ))}
          {/* Angled Console Display with Glowing UI Strip */}
          <mesh position={[0, 2.38, -1.05]} rotation={[-0.42, 0, 0]} castShadow>
            <boxGeometry args={[1.55, 0.72, 0.36]} />
            <meshStandardMaterial color="#1F242C" roughness={0.42} metalness={0.35} />
          </mesh>
          <mesh position={[0, 2.42, -0.85]} rotation={[-0.42, 0, 0]}>
            <planeGeometry args={[1.15, 0.42]} />
            <meshStandardMaterial color="#1A2D3D" emissive="#20E3B2" emissiveIntensity={0.65} />
          </mesh>
        </group>
      ))}

      {/* Detailed 3-Tier Angled Steel Hex Dumbbell Rack (Ref 2 right framing!) */}
      <group position={[9.8, FLOOR_Y, -6.5]} rotation={[0, -0.68, 0]}>
        {[-2.2, 2.2].map((sx) => (
          <mesh key={sx} position={[sx, 1.15, 0]} castShadow>
            <boxGeometry args={[0.18, 2.3, 1.45]} />
            <meshStandardMaterial color="#232830" metalness={0.65} roughness={0.38} />
          </mesh>
        ))}
        {[0.55, 1.25, 1.95].map((ty, ti) => (
          <group key={ti} position={[0, ty, 0.2 - ti * 0.2]}>
            <mesh castShadow>
              <boxGeometry args={[4.5, 0.12, 0.65]} />
              <meshStandardMaterial color="#2D333D" metalness={0.6} roughness={0.42} />
            </mesh>
            {/* 4 Sculpted Hexagonal Dumbbells per tier */}
            {[-1.55, -0.52, 0.52, 1.55].map((dx, di) => (
              <group key={di} position={[dx, 0.24, 0]}>
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[0.06, 0.06, 0.42, 10]} />
                  <meshStandardMaterial color="#C8D2DC" metalness={0.88} roughness={0.2} />
                </mesh>
                {[-0.22, 0.22].map((dz) => (
                  <mesh key={dz} position={[0, 0, dz]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                    <cylinderGeometry args={[0.19 - ti * 0.02, 0.19 - ti * 0.02, 0.14, 6]} />
                    <meshStandardMaterial color="#181C22" roughness={0.75} />
                  </mesh>
                ))}
              </group>
            ))}
          </group>
        ))}
      </group>

      {/* Adjustable Incline Weight Bench + Cable Crossover Tower + Matte Stability Balls (Ref 2!) */}
      <group position={[9.4, FLOOR_Y, -12.4]} rotation={[0, -0.45, 0]}>
        <mesh position={[0, 0.52, 0]} castShadow>
          <boxGeometry args={[0.85, 0.2, 2.6]} />
          <meshStandardMaterial color="#262A32" roughness={0.65} />
        </mesh>
        <mesh position={[0, 1.15, -0.85]} rotation={[-0.65, 0, 0]} castShadow>
          <boxGeometry args={[0.82, 0.18, 1.45]} />
          <meshStandardMaterial color="#262A32" roughness={0.65} />
        </mesh>
      </group>
      {/* Cable Crossover Weight Stack Tower */}
      <group position={[13.8, FLOOR_Y, -1.5]} rotation={[0, -Math.PI / 2, 0]}>
        {[-0.95, 0.95].map((cx) => (
          <mesh key={cx} position={[cx, 2.9, 0]} castShadow>
            <boxGeometry args={[0.16, 5.8, 0.16]} />
            <meshStandardMaterial color="#222730" metalness={0.72} roughness={0.35} />
          </mesh>
        ))}
        <mesh position={[0, 5.75, 0]}>
          <boxGeometry args={[2.1, 0.2, 0.22]} />
          <meshStandardMaterial color="#222730" metalness={0.72} roughness={0.35} />
        </mesh>
        <mesh position={[0, 1.35, 0]} castShadow>
          <boxGeometry args={[1.15, 2.4, 0.55]} />
          <meshStandardMaterial color="#171B22" metalness={0.45} roughness={0.55} />
        </mesh>
      </group>
      {/* Vibrant Matte Orange & Teal Stability Balls */}
      <mesh position={[13.2, FLOOR_Y + 0.72, -10.0]} castShadow>
        <sphereGeometry args={[0.72, 20, 16]} />
        <meshStandardMaterial color="#D95D2E" roughness={0.68} />
      </mesh>
      <mesh position={[14.4, FLOOR_Y + 0.68, -8.4]} castShadow>
        <sphereGeometry args={[0.68, 20, 16]} />
        <meshStandardMaterial color="#2E8FA8" roughness={0.68} />
      </mesh>
    </group>
  );
};

/** ==================== 4. LAGOS ISLAND STREET ==================== */
const LagosIslandWorld: React.FC<{ reducedMotion: boolean }> = ({ reducedMotion }) => {
  const pbr = useMemo(() => getEnvironmentPbrLibrary(), []);
  const movingDanfoRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (reducedMotion || !movingDanfoRef.current) return;
    const cycle = ((state.clock.elapsedTime * 3.6 + 30) % 78) - 39;
    movingDanfoRef.current.position.x = cycle;
  });

  const buildings = useMemo(
    () => [
      { x: -21, z: -27, w: 12, h: 17, d: 8, tint: '#7A8396', sign: '#20E3B2' },
      { x: -7, z: -28, w: 13, h: 21, d: 8, tint: '#968B7E', sign: '#FFB82E' },
      { x: 7, z: -28, w: 13, h: 16, d: 8, tint: '#848C9C', sign: '#FF6B57' },
      { x: 21, z: -27, w: 12, h: 19, d: 8, tint: '#788090', sign: '#20E3B2' },
      { x: -27, z: -7, w: 8, h: 15, d: 16, tint: '#8B8378', sign: '#FFB82E' },
      { x: 27, z: -5, w: 8, h: 16, d: 18, tint: '#7C8596', sign: '#FF6B57' },
    ],
    []
  );

  const renderDanfo = (key: string, pos: [number, number, number], rotY: number, ref?: React.RefObject<THREE.Group>) => (
    <group key={key} ref={ref} position={pos} rotation={[0, rotY, 0]}>
      <mesh position={[0, 1.38, 0]} castShadow>
        <boxGeometry args={[4.95, 1.95, 2.1]} />
        <meshStandardMaterial color="#EAB32E" roughness={0.48} metalness={0.22} />
      </mesh>
      <mesh position={[0, 1.15, 0]}>
        <boxGeometry args={[4.99, 0.26, 2.13]} />
        <meshStandardMaterial color="#14171E" roughness={0.75} />
      </mesh>
      <mesh position={[0.15, 1.78, 0]}>
        <boxGeometry args={[4.3, 0.66, 2.14]} />
        <meshStandardMaterial color="#182334" roughness={0.18} metalness={0.6} />
      </mesh>
      {/* Roof luggage rack */}
      <mesh position={[-0.2, 2.44, 0]}>
        <boxGeometry args={[3.4, 0.14, 1.75]} />
        <meshStandardMaterial color="#2A2F38" metalness={0.6} roughness={0.45} />
      </mesh>
      {/* Bumpers & Lights */}
      <mesh position={[2.5, 0.52, 0]}>
        <boxGeometry args={[0.18, 0.28, 2.12]} />
        <meshStandardMaterial color="#1C2028" roughness={0.7} />
      </mesh>
      {[0.66, -0.66].map((lz) => (
        <group key={lz}>
          <mesh position={[2.49, 0.96, lz]}>
            <boxGeometry args={[0.08, 0.24, 0.36]} />
            <meshStandardMaterial color="#FFF3C8" emissive="#FFE394" emissiveIntensity={1.6} />
          </mesh>
          <mesh position={[-2.49, 0.96, lz]}>
            <boxGeometry args={[0.08, 0.24, 0.34]} />
            <meshStandardMaterial color="#FF4848" emissive="#FF3535" emissiveIntensity={1.4} />
          </mesh>
        </group>
      ))}
      {[-1.5, 1.5].map((wx) =>
        [-0.96, 0.96].map((wz) => (
          <mesh key={`${wx}-${wz}`} position={[wx, 0.44, wz]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.42, 0.42, 0.28, 16]} />
            <meshStandardMaterial color="#13161C" roughness={0.9} />
          </mesh>
        ))
      )}
    </group>
  );

  return (
    <group>
      {/* Textured Concrete Pedestrian Sidewalk Pad */}
      <mesh position={[0, FLOOR_Y + 0.06, 0]} receiveShadow>
        <boxGeometry args={[21, 0.16, 19.5]} />
        <meshStandardMaterial
          map={pbr.boardConcrete.map}
          bumpMap={pbr.boardConcrete.bumpMap}
          bumpScale={0.08}
          color="#6F7480"
          roughness={0.92}
        />
      </mesh>
      {/* Yellow/Black Painted Lagos Roadside Curb */}
      {Array.from({ length: 14 }).map((_, i) => (
        <mesh key={i} position={[-9.75 + i * 1.5, FLOOR_Y + 0.14, -9.9]}>
          <boxGeometry args={[1.46, 0.22, 0.38]} />
          <meshStandardMaterial color={i % 2 === 0 ? '#E5B832' : '#1E222B'} roughness={0.84} />
        </mesh>
      ))}

      {/* Coarse Aggregate Asphalt Boulevard + Dashed Yellow Lane Markings */}
      <mesh position={[0, FLOOR_Y + 0.02, -17.5]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[86, 13.5]} />
        <meshStandardMaterial
          map={pbr.asphalt.map}
          bumpMap={pbr.asphalt.bumpMap}
          bumpScale={0.1}
          color="#3A3E48"
          roughness={0.94}
        />
      </mesh>
      {Array.from({ length: 13 }).map((_, i) => (
        <mesh key={i} position={[(i - 6) * 5.8, FLOOR_Y + 0.04, -17.5]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[3.0, 0.24]} />
          <meshStandardMaterial color="#E5BA38" roughness={0.8} />
        </mesh>
      ))}

      {renderDanfo('danfo-cruising', [-14, FLOOR_Y, -15.4], 0, movingDanfoRef)}
      {renderDanfo('danfo-parked', [15.5, FLOOR_Y, -20.2], Math.PI)}

      {/* Tall Lagos Urban Streetlights */}
      {[-12, 0, 12].map((lx, i) => (
        <group key={i} position={[lx, FLOOR_Y, -10.9]}>
          <mesh position={[0, 4.5, 0]}>
            <cylinderGeometry args={[0.1, 0.15, 9.0, 10]} />
            <meshStandardMaterial color="#485060" metalness={0.6} roughness={0.42} />
          </mesh>
          <mesh position={[0, 8.95, -0.7]}>
            <boxGeometry args={[0.42, 0.16, 1.5]} />
            <meshStandardMaterial color="#586274" metalness={0.5} />
          </mesh>
          <mesh position={[0, 8.82, -1.25]}>
            <boxGeometry args={[0.34, 0.1, 0.5]} />
            <meshStandardMaterial color="#FFE4A8" emissive="#FFD47A" emissiveIntensity={1.9} />
          </mesh>
        </group>
      ))}

      {/* Textured Multi-Story Lagos Commercial Buildings */}
      {buildings.map((b, idx) => (
        <group key={idx} position={[b.x, FLOOR_Y + b.h / 2, b.z]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[b.w, b.h, b.d]} />
            <meshStandardMaterial
              map={pbr.lagosPlaster.map}
              bumpMap={pbr.lagosPlaster.bumpMap}
              bumpScale={0.07}
              color={b.tint}
              roughness={0.88}
            />
          </mesh>
          <mesh position={[0, -b.h * 0.28, b.d * 0.51]}>
            <boxGeometry args={[b.w * 0.84, 1.25, 0.22]} />
            <meshStandardMaterial color={b.sign} emissive={b.sign} emissiveIntensity={0.85} roughness={0.35} />
          </mesh>
          {[-0.08, 0.14, 0.34].map((yf, wi) => (
            <mesh key={wi} position={[0, b.h * yf, b.d * 0.51]}>
              <boxGeometry args={[b.w * 0.74, 0.88, 0.1]} />
              <meshStandardMaterial color="#FFDFB0" emissive="#FFCA7A" emissiveIntensity={0.42} roughness={0.3} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
};

/** ==================== 5. OFFICE LOUNGE ==================== */
const OfficeLoungeWorld: React.FC = () => {
  const pbr = useMemo(() => getEnvironmentPbrLibrary(), []);

  return (
    <group>
      {/* Sleek Glass Partition Wall with Black Aluminum Mullions + Board-Formed Concrete Columns */}
      <group position={[0, FLOOR_Y + 5.8, -16.2]}>
        <mesh>
          <boxGeometry args={[34, 11.6, 0.14]} />
          <meshStandardMaterial color="#7C96BA" transparent opacity={0.2} roughness={0.1} metalness={0.35} />
        </mesh>
        {[-12, -6, 0, 6, 12].map((mx) => (
          <mesh key={mx} position={[mx, 0, 0]}>
            <boxGeometry args={[0.22, 11.6, 0.26]} />
            <meshStandardMaterial color="#2A303D" metalness={0.68} roughness={0.35} />
          </mesh>
        ))}
      </group>
      {[-15.5, 15.5].map((px) => (
        <mesh key={px} position={[px, FLOOR_Y + 6.0, -14.8]} castShadow>
          <boxGeometry args={[1.6, 12, 1.6]} />
          <meshStandardMaterial map={pbr.boardConcrete.map} bumpMap={pbr.boardConcrete.bumpMap} bumpScale={0.07} color="#9A9C9E" roughness={0.86} />
        </mesh>
      ))}
      {/* Warm Slatted Wood Ceiling Acoustic Panel */}
      <mesh position={[0, FLOOR_Y + 11.8, -4]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[28, 24]} />
        <meshStandardMaterial map={pbr.cedarSlats.map} bumpMap={pbr.cedarSlats.bumpMap} bumpScale={0.1} color="#C99665" roughness={0.78} />
      </mesh>
      {/* Distant Dusk Skyline Silhouettes */}
      {[-16, -8, 2, 11, 19].map((bx, i) => (
        <mesh key={i} position={[bx, FLOOR_Y + 7 + (i % 3) * 3, -28]}>
          <boxGeometry args={[5.5, 16 + (i % 3) * 6, 4]} />
          <meshStandardMaterial color="#181F32" roughness={0.9} />
        </mesh>
      ))}
      {/* Upholstered Modern Lounge Sofas with Armrests & Timber Legs */}
      {[
        { pos: [-11.5, FLOOR_Y, -9.5] as [number, number, number], rotY: 0.55, color: '#3F4863' },
        { pos: [11.5, FLOOR_Y, -9.5] as [number, number, number], rotY: -0.55, color: '#4B5570' },
      ].map((sofa, i) => (
        <group key={i} position={sofa.pos} rotation={[0, sofa.rotY, 0]}>
          <mesh position={[0, 0.68, 0]} castShadow receiveShadow>
            <boxGeometry args={[5.5, 0.72, 1.9]} />
            <meshStandardMaterial color={sofa.color} roughness={0.9} />
          </mesh>
          <mesh position={[0, 1.42, -0.74]} castShadow>
            <boxGeometry args={[5.5, 1.1, 0.44]} />
            <meshStandardMaterial color={sofa.color} roughness={0.9} />
          </mesh>
          {[-2.58, 2.58].map((ax) => (
            <mesh key={ax} position={[ax, 1.05, 0]}>
              <boxGeometry args={[0.36, 0.85, 1.9]} />
              <meshStandardMaterial color={sofa.color} roughness={0.9} />
            </mesh>
          ))}
        </group>
      ))}
      {/* Potted Indoor Plants */}
      {[
        [-13.5, -13.5],
        [13.5, -13.5],
        [-14.5, 3.5],
        [14.5, 3.5],
      ].map(([px, pz], i) => (
        <group key={i} position={[px, FLOOR_Y, pz]}>
          <mesh position={[0, 0.75, 0]} castShadow>
            <cylinderGeometry args={[0.68, 0.52, 1.5, 16]} />
            <meshStandardMaterial map={pbr.lagosPlaster.map} color="#B87E5A" roughness={0.84} />
          </mesh>
          <mesh position={[0, 2.2, 0]} castShadow>
            <dodecahedronGeometry args={[1.15, 1]} />
            <meshStandardMaterial color="#346B48" roughness={0.86} />
          </mesh>
          <mesh position={[0.45, 2.85, 0.25]}>
            <dodecahedronGeometry args={[0.75, 1]} />
            <meshStandardMaterial color="#45855A" roughness={0.86} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

/** ==================== 6. NEIGHBOURHOOD BAR ==================== */
const NeighbourhoodBarWorld: React.FC = () => {
  const pbr = useMemo(() => getEnvironmentPbrLibrary(), []);

  return (
    <group>
      {/* Aged Exposed Masonry Brick Perimeter Walls */}
      <mesh position={[0, FLOOR_Y + 6.5, -16.8]} receiveShadow>
        <boxGeometry args={[36, 13, 0.6]} />
        <meshStandardMaterial
          map={pbr.warmBrick.map}
          bumpMap={pbr.warmBrick.bumpMap}
          bumpScale={0.12}
          color="#9E7C6B"
          roughness={0.9}
        />
      </mesh>
      {/* Backlit Walnut Bar Counter & Stools */}
      <group position={[0, FLOOR_Y, -13.5]}>
        <mesh position={[0, 1.25, 0.8]} castShadow receiveShadow>
          <boxGeometry args={[16.2, 2.5, 1.8]} />
          <meshStandardMaterial map={pbr.cedarSlats.map} bumpMap={pbr.cedarSlats.bumpMap} bumpScale={0.08} color="#7A4C30" roughness={0.78} />
        </mesh>
        <mesh position={[0, 2.58, 0.8]} castShadow>
          <boxGeometry args={[16.8, 0.2, 2.25]} />
          <meshStandardMaterial map={pbr.oakPlanks.map} color="#805336" roughness={0.38} metalness={0.12} />
        </mesh>
        {[3.2, 5.1, 7.0].map((sy, si) => (
          <group key={si} position={[0, sy, -2.5]}>
            <mesh>
              <boxGeometry args={[14.5, 0.16, 0.85]} />
              <meshStandardMaterial map={pbr.oakPlanks.map} color="#6E442A" roughness={0.7} />
            </mesh>
            <mesh position={[0, 0.16, -0.34]}>
              <boxGeometry args={[14.2, 0.12, 0.08]} />
              <meshStandardMaterial color="#FFD08A" emissive="#FF9B45" emissiveIntensity={1.65} />
            </mesh>
          </group>
        ))}
        {[-5.5, -3.2, -1.0, 1.2, 3.4, 5.6].map((sx, i) => (
          <group key={i} position={[sx, 0, 2.55]}>
            <mesh position={[0, 0.9, 0]}>
              <cylinderGeometry args={[0.08, 0.1, 1.8, 10]} />
              <meshStandardMaterial color="#241914" metalness={0.55} />
            </mesh>
            <mesh position={[0, 1.85, 0]} castShadow>
              <cylinderGeometry args={[0.45, 0.42, 0.18, 16]} />
              <meshStandardMaterial color="#8F4F32" roughness={0.62} />
            </mesh>
          </group>
        ))}
      </group>
      {/* Bistro Tables with Warm Glowing Lanterns */}
      {[
        [-11.8, -5.5],
        [11.8, -5.5],
        [-12.2, 4.8],
        [12.2, 4.8],
      ].map(([tx, tz], i) => (
        <group key={i} position={[tx, FLOOR_Y, tz]}>
          <mesh position={[0, 1.0, 0]}>
            <cylinderGeometry args={[0.1, 0.45, 2.0, 12]} />
            <meshStandardMaterial color="#241812" metalness={0.48} />
          </mesh>
          <mesh position={[0, 2.04, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[1.35, 1.35, 0.14, 24]} />
            <meshStandardMaterial map={pbr.oakPlanks.map} color="#7A4C30" roughness={0.65} />
          </mesh>
          <mesh position={[0, 2.3, 0]}>
            <cylinderGeometry args={[0.12, 0.14, 0.34, 10]} />
            <meshStandardMaterial color="#FFE2A8" emissive="#FFA64D" emissiveIntensity={1.85} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

/** ==================== 7. PUBLIC PARK ==================== */
const PublicParkWorld: React.FC<{ reducedMotion: boolean }> = ({ reducedMotion }) => {
  const pbr = useMemo(() => getEnvironmentPbrLibrary(), []);
  const foliageGroupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (reducedMotion || !foliageGroupRef.current) return;
    foliageGroupRef.current.children.forEach((tree, i) => {
      tree.rotation.z = Math.sin(state.clock.elapsedTime * 1.05 + i * 1.3) * 0.016;
    });
  });

  const trees = useMemo(
    () => [
      { pos: [-16, -14], s: 1.25 },
      { pos: [-7, -18], s: 1.12 },
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
      {/* Circular Slatted Cedar Deck & Cobblestone Walking Paths */}
      <mesh position={[0, FLOOR_Y + 0.08, 0]} receiveShadow>
        <cylinderGeometry args={[9.4, 9.8, 0.24, 56]} />
        <meshStandardMaterial map={pbr.cedarSlats.map} bumpMap={pbr.cedarSlats.bumpMap} bumpScale={0.08} color="#B8875B" roughness={0.86} />
      </mesh>
      <mesh position={[0, FLOOR_Y + 0.03, -15]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[5.2, 24]} />
        <meshStandardMaterial map={pbr.cobblestone.map} bumpMap={pbr.cobblestone.bumpMap} bumpScale={0.09} color="#D0C5B4" roughness={0.92} />
      </mesh>
      <mesh position={[0, FLOOR_Y + 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <ringGeometry args={[12.5, 15.2, 56]} />
        <meshStandardMaterial map={pbr.cobblestone.map} bumpMap={pbr.cobblestone.bumpMap} bumpScale={0.09} color="#C8BDA9" roughness={0.92} />
      </mesh>

      {/* Organic Swaying Shade Trees with Textured Bark */}
      <group ref={foliageGroupRef}>
        {trees.map((t, i) => (
          <group key={i} position={[t.pos[0], FLOOR_Y, t.pos[1]]} scale={t.s}>
            <mesh position={[0, 2.4, 0]} castShadow>
              <cylinderGeometry args={[0.26, 0.44, 4.8, 12]} />
              <meshStandardMaterial map={pbr.bark.map} bumpMap={pbr.bark.bumpMap} bumpScale={0.1} color="#78583E" roughness={0.94} />
            </mesh>
            <mesh position={[0, 5.4, 0]} castShadow>
              <dodecahedronGeometry args={[2.35, 1]} />
              <meshStandardMaterial color={i % 2 === 0 ? '#356B3D' : '#437A48'} roughness={0.9} />
            </mesh>
            <mesh position={[1.15, 6.2, 0.65]}>
              <dodecahedronGeometry args={[1.5, 1]} />
              <meshStandardMaterial color="#528A52" roughness={0.9} />
            </mesh>
            <mesh position={[-1.05, 5.85, -0.55]}>
              <dodecahedronGeometry args={[1.4, 1]} />
              <meshStandardMaterial color="#2D5E34" roughness={0.9} />
            </mesh>
          </group>
        ))}
      </group>

      {/* Wooden-Slat Park Benches */}
      {[
        { pos: [-11.5, FLOOR_Y, -9.8] as [number, number, number], rotY: 0.68 },
        { pos: [11.5, FLOOR_Y, -9.8] as [number, number, number], rotY: -0.68 },
        { pos: [-13.5, FLOOR_Y, 4.2] as [number, number, number], rotY: 1.35 },
      ].map((bench, i) => (
        <group key={i} position={bench.pos} rotation={[0, bench.rotY, 0]}>
          <mesh position={[0, 0.85, 0]} castShadow>
            <boxGeometry args={[3.4, 0.16, 0.9]} />
            <meshStandardMaterial map={pbr.cedarSlats.map} color="#A67448" roughness={0.86} />
          </mesh>
          <mesh position={[0, 1.45, -0.38]} rotation={[-0.18, 0, 0]} castShadow>
            <boxGeometry args={[3.4, 0.65, 0.12]} />
            <meshStandardMaterial map={pbr.cedarSlats.map} color="#A67448" roughness={0.86} />
          </mesh>
          {[-1.35, 1.35].map((bx) => (
            <mesh key={bx} position={[bx, 0.45, 0]}>
              <boxGeometry args={[0.14, 0.9, 0.82]} />
              <meshStandardMaterial color="#262D2A" metalness={0.52} roughness={0.45} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
};

/** ==================== 8. COSY LIVING ROOM (INTENTIONALLY NO AUDIENCE) ==================== */
const LivingRoomWorld: React.FC = () => {
  const pbr = useMemo(() => getEnvironmentPbrLibrary(), []);

  return (
    <group>
      {/* Woven Kilim Area Rug atop Oak Parquet Floor */}
      <mesh position={[0, FLOOR_Y + 0.05, 0]} receiveShadow>
        <cylinderGeometry args={[10.5, 10.5, 0.08, 56]} />
        <meshStandardMaterial map={pbr.wovenRug.map} bumpMap={pbr.wovenRug.bumpMap} bumpScale={0.07} roughness={0.95} />
      </mesh>
      {/* Matte Plaster Apartment Walls */}
      <mesh position={[0, FLOOR_Y + 6.5, -15.5]} receiveShadow>
        <boxGeometry args={[32, 13, 0.5]} />
        <meshStandardMaterial map={pbr.lagosPlaster.map} color="#3A3142" roughness={0.92} />
      </mesh>
      <mesh position={[-15.5, FLOOR_Y + 6.5, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <boxGeometry args={[32, 13, 0.5]} />
        <meshStandardMaterial map={pbr.lagosPlaster.map} color="#342C3C" roughness={0.92} />
      </mesh>
      {/* Mullioned Dusk Window */}
      <group position={[-6.5, FLOOR_Y + 6.2, -15.1]}>
        <mesh>
          <boxGeometry args={[8.5, 6.2, 0.18]} />
          <meshStandardMaterial color="#2E3B61" emissive="#1F2B4D" emissiveIntensity={0.75} roughness={0.18} />
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
      {/* Wooden Bookshelf */}
      <group position={[7.5, FLOOR_Y, -14.3]}>
        <mesh position={[0, 4.4, 0]} castShadow>
          <boxGeometry args={[6.4, 8.8, 1.4]} />
          <meshStandardMaterial map={pbr.oakPlanks.map} color="#634432" roughness={0.82} />
        </mesh>
        {[1.5, 3.1, 4.7, 6.3].map((sy, si) => (
          <mesh key={si} position={[0, sy, 0.45]}>
            <boxGeometry args={[5.4, 0.72, 0.65]} />
            <meshStandardMaterial color={['#7C68FF', '#FF7A4D', '#20E3B2', '#FFB82E'][si % 4]} roughness={0.82} />
          </mesh>
        ))}
      </group>
      {/* Plush Sofa & Brass Standing Floor Lamp */}
      <group position={[-11.2, FLOOR_Y, -3.5]} rotation={[0, Math.PI / 2, 0]}>
        <mesh position={[0, 0.75, 0]} castShadow receiveShadow>
          <boxGeometry args={[8.5, 1.0, 2.4]} />
          <meshStandardMaterial color="#4E435E" roughness={0.94} />
        </mesh>
        <mesh position={[0, 1.55, -0.95]} castShadow>
          <boxGeometry args={[8.5, 1.25, 0.55]} />
          <meshStandardMaterial color="#4E435E" roughness={0.94} />
        </mesh>
      </group>
      <group position={[-11.2, FLOOR_Y, -10.8]}>
        <mesh position={[0, 2.6, 0]}>
          <cylinderGeometry args={[0.06, 0.08, 5.2, 10]} />
          <meshStandardMaterial color="#C8A977" metalness={0.75} roughness={0.28} />
        </mesh>
        <mesh position={[0, 5.3, 0]}>
          <cylinderGeometry args={[0.55, 0.95, 1.15, 18, 1, true]} />
          <meshStandardMaterial color="#FFF0D6" emissive="#FFCF8A" emissiveIntensity={1.65} side={THREE.DoubleSide} />
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
      return null;
  }
};
