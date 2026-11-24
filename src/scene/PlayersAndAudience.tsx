import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { useGameStore } from '../store/useGameStore';
import { PALETTE, PEDESTAL_HEIGHT, PEDESTAL_TOP_Y } from '../engine/constants';
import { CrowdTextileSet, getCrowdTextiles } from '../engine/crowdTextures';
import { getSceneById, SceneCrowdConfig } from '../engine/scenes';
import { SceneId } from '../types/game';

const FLOOR_Y = PEDESTAL_TOP_Y - PEDESTAL_HEIGHT - 2.3; // -3.4
const RING_HALF = 7.45;

type CrowdMood = 'idle' | 'tense' | 'cheer' | 'gasp' | 'victory';
type ModelKind = 'rpm' | 'michelle';

type CultureStyle =
  | 'african_ankara_peacock'
  | 'african_ankara_crimson'
  | 'african_ankara_orange'
  | 'african_ankara_sungold'
  | 'african_ankara_adire'
  | 'african_kente'
  | 'african_ankara_gele'
  | 'african_dashiki'
  | 'arabian_shemagh'
  | 'arabian_ghutra_bisht'
  | 'arabian_hijab'
  | 'western_blazer'
  | 'western_streetwear'
  | 'gym_athletic';

useGLTF.preload('/models/rpm_human.glb');
useGLTF.preload('/models/michelle.glb');

function safeMergeGeos(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const normalized = parts.map((g) => (g.index ? g.toNonIndexed() : g));
  const merged = mergeGeometries(normalized, false);
  parts.forEach((g) => g.dispose());
  normalized.forEach((g) => g.dispose());
  return merged ?? new THREE.SphereGeometry(0.11, 12, 10);
}

/**
 * Trims long Victorian tailcoat tails (y < 0.89, |x| < 0.25) and protruding 3D bowtie
 * (y > 1.455, z > 0.088, |x| < 0.068) off rpm_human.glb's Wolf3D_Outfit_Top so casual,
 * Ankara, and gym athletic outfits read as clean modern waist-length tops.
 */
function trimFormalTailcoatGeometry(sourceGeo: THREE.BufferGeometry, stripBowtie: boolean): THREE.BufferGeometry {
  const geo = sourceGeo.clone();
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const idx = geo.index;
  if (!pos || !idx) return geo;

  const oldArr = idx.array;
  const kept: number[] = [];

  const isTrimmedVertex = (vi: number): boolean => {
    const x = pos.getX(vi);
    const y = pos.getY(vi);
    const z = pos.getZ(vi);
    // Hanging tailcoat tails below hip line
    if (y < 0.89 && Math.abs(x) < 0.25) return true;
    // Protruding 3D bowtie knot on collar front
    if (stripBowtie && y > 1.445 && z > 0.084 && Math.abs(x) < 0.072) return true;
    return false;
  };

  for (let i = 0; i < oldArr.length; i += 3) {
    const a = oldArr[i];
    const b = oldArr[i + 1];
    const c = oldArr[i + 2];
    if (isTrimmedVertex(a) || isTrimmedVertex(b) || isTrimmedVertex(c)) continue;
    kept.push(a, b, c);
  }

  geo.setIndex(kept);
  return geo;
}

// Shared anatomical headwear & sculpted hairstyle geometries calibrated to rpm_human.glb Wolf3D_Head (center y=1.71, crown y=1.833)
interface HeadwearGeometries {
  kufi: THREE.CylinderGeometry;
  geleCrown: THREE.TorusGeometry;
  geleFan: THREE.CylinderGeometry;
  shemaghCap: THREE.SphereGeometry;
  shemaghDrape: THREE.CylinderGeometry;
  agalRing: THREE.TorusGeometry;
  hijabWrap: THREE.SphereGeometry;
  hijabNeck: THREE.CylinderGeometry;
  hairCap: THREE.SphereGeometry;
  naturalAfro: THREE.BufferGeometry;
  cornrowCrown: THREE.BufferGeometry;
  shortFade: THREE.BufferGeometry;
  croppedWave: THREE.BufferGeometry;
}

let cachedHeadwearGeos: HeadwearGeometries | null = null;
function getHeadwearGeometries(): HeadwearGeometries {
  if (cachedHeadwearGeos) return cachedHeadwearGeos;

  // African embroidered Kufi / Fila cap sitting cleanly atop the crown
  const kufi = new THREE.CylinderGeometry(0.095, 0.104, 0.105, 18);
  kufi.rotateZ(0.11);
  kufi.translate(0.008, 1.835, 0.01);

  // Regal pleated African Gele headwrap (layered crown + dramatic wide sculptural fan)
  const geleCrown = new THREE.TorusGeometry(0.102, 0.044, 10, 22);
  geleCrown.rotateX(Math.PI / 2 - 0.18);
  geleCrown.translate(0, 1.825, 0.015);

  const geleFan = new THREE.CylinderGeometry(0.165, 0.112, 0.145, 20);
  geleFan.scale(1.18, 1.0, 0.68);
  geleFan.rotateX(-0.22);
  geleFan.rotateZ(-0.08);
  geleFan.translate(0, 1.895, -0.01);

  // Arabian Shemagh / Ghutra headscarf (cleanly above brow, flowing back & over shoulders)
  const shemaghCap = new THREE.SphereGeometry(0.112, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.48);
  shemaghCap.rotateX(-0.18);
  shemaghCap.translate(0, 1.755, -0.014);

  const shemaghDrape = new THREE.CylinderGeometry(0.108, 0.185, 0.34, 16, 1, true, Math.PI * 0.52, Math.PI * 0.96);
  shemaghDrape.translate(0, 1.56, -0.032);

  // Iconic double-cord black Arabian Agal crowning the Shemagh/Ghutra
  const agalRing = new THREE.TorusGeometry(0.097, 0.017, 10, 24);
  agalRing.rotateX(Math.PI / 2 - 0.14);
  agalRing.translate(0, 1.832, -0.008);

  // Elegant Arabian silk Hijab / Shayla framing the face cleanly above brow & around neck
  const hijabWrap = new THREE.SphereGeometry(0.114, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.54);
  hijabWrap.rotateX(-0.22);
  hijabWrap.translate(0, 1.752, -0.016);

  const hijabNeck = new THREE.CylinderGeometry(0.102, 0.148, 0.23, 16, 1, true, Math.PI * 0.42, Math.PI * 1.16);
  hijabNeck.translate(0, 1.565, -0.022);

  // Natural Western textured hair framing the brow & temples cleanly
  const hairCap = new THREE.SphereGeometry(0.111, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.58);
  hairCap.rotateX(-0.08);
  hairCap.translate(0, 1.724, 0.004);

  // Sculpted natural curly Afro (snug organic curl halo hugging the temples & crown like Reference 3 #1 & #5)
  const afroParts: THREE.BufferGeometry[] = [];
  const afroCore = new THREE.SphereGeometry(0.124, 14, 12);
  afroCore.scale(1.06, 0.96, 1.04);
  afroCore.translate(0, 1.752, -0.02);
  afroParts.push(afroCore);
  const afroLobes: Array<[number, number, number, number]> = [
    [0.0, 1.832, -0.015, 0.064],
    [-0.082, 1.808, -0.01, 0.06],
    [0.082, 1.808, -0.01, 0.06],
    [-0.114, 1.752, -0.018, 0.058],
    [0.114, 1.752, -0.018, 0.058],
    [-0.06, 1.82, 0.036, 0.052],
    [0.06, 1.82, 0.036, 0.052],
    [0.0, 1.812, 0.05, 0.048],
    [-0.102, 1.702, -0.038, 0.054],
    [0.102, 1.702, -0.038, 0.054],
    [0.0, 1.768, -0.098, 0.066],
    [-0.072, 1.764, -0.088, 0.06],
    [0.072, 1.764, -0.088, 0.06],
  ];
  for (const [lx, ly, lz, lr] of afroLobes) {
    const lobe = new THREE.SphereGeometry(lr, 9, 8);
    lobe.translate(lx, ly, lz);
    afroParts.push(lobe);
  }
  const naturalAfro = safeMergeGeos(afroParts);

  // Sculpted Cornrow Braids (close cranial base + 7 sleek braided ridges, Reference 3 #4)
  const cornrowParts: THREE.BufferGeometry[] = [];
  const cornBase = new THREE.SphereGeometry(0.107, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.52);
  cornBase.rotateX(-0.12);
  cornBase.translate(0, 1.734, -0.004);
  cornrowParts.push(cornBase);
  for (let r = -3; r <= 3; r++) {
    const ridge = new THREE.TorusGeometry(0.104 - Math.abs(r) * 0.005, 0.011, 6, 16, Math.PI * 0.88);
    ridge.rotateY(Math.PI / 2);
    ridge.rotateZ(r * 0.24);
    ridge.translate(r * 0.016, 1.74, -0.01);
    cornrowParts.push(ridge);
  }
  const cornrowCrown = safeMergeGeos(cornrowParts);

  // Snug barbershop low fade framing the forehead & hugging the crown naturally
  const fadeCap = new THREE.SphereGeometry(0.108, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.56);
  fadeCap.rotateX(-0.06);
  fadeCap.translate(0, 1.726, 0.006);
  const shortFade = safeMergeGeos([fadeCap]);

  // Layered modern cropped wave/pixie cut (Reference 3 #3)
  const waveParts: THREE.BufferGeometry[] = [];
  const waveCap = new THREE.SphereGeometry(0.114, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.58);
  waveCap.scale(1.04, 0.98, 1.06);
  waveCap.rotateX(-0.1);
  waveCap.translate(0, 1.745, -0.005);
  waveParts.push(waveCap);
  const waveFringe = new THREE.SphereGeometry(0.072, 10, 8);
  waveFringe.scale(1.32, 0.65, 0.9);
  waveFringe.translate(-0.025, 1.805, 0.055);
  waveParts.push(waveFringe);
  const croppedWave = safeMergeGeos(waveParts);

  cachedHeadwearGeos = {
    kufi,
    geleCrown,
    geleFan,
    shemaghCap,
    shemaghDrape,
    agalRing,
    hijabWrap,
    hijabNeck,
    hairCap,
    naturalAfro,
    cornrowCrown,
    shortFade,
    croppedWave,
  };
  return cachedHeadwearGeos;
}

/**
 * Builds matching bone-attached headwear or realistic hairstyle group (in Head-bone local coordinates!) for rigged VIPs & Players.
 * In rpm_human.glb, Head bone origin sits at the base of the skull (~y=1.615).
 */
function createBoneHeadwearGroup(
  culture: CultureStyle,
  textiles: CrowdTextileSet,
  hairHex: string,
  accentHex: string
): THREE.Group {
  const group = new THREE.Group();
  const geos = getHeadwearGeometries();
  group.position.set(0, -1.615, -0.01);

  if (culture === 'african_ankara_peacock' || culture === 'african_ankara_adire') {
    const hairMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(hairHex),
      roughness: 0.94,
      metalness: 0.0,
      bumpMap: textiles.fabricBump,
      bumpScale: 0.024,
    });
    group.add(new THREE.Mesh(geos.naturalAfro, hairMat));
  } else if (culture === 'african_ankara_crimson') {
    const hairMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(hairHex),
      roughness: 0.9,
      metalness: 0.0,
    });
    group.add(new THREE.Mesh(geos.shortFade, hairMat));
  } else if (culture === 'african_ankara_orange') {
    const hairMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(hairHex),
      roughness: 0.82,
      metalness: 0.04,
    });
    group.add(new THREE.Mesh(geos.croppedWave, hairMat));
  } else if (culture === 'african_ankara_sungold') {
    const hairMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(hairHex),
      roughness: 0.88,
      metalness: 0.02,
    });
    group.add(new THREE.Mesh(geos.cornrowCrown, hairMat));
  } else if (culture === 'african_kente' || culture === 'african_dashiki') {
    const tex = culture === 'african_kente' ? textiles.kente : textiles.dashikiRoyal;
    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      bumpMap: textiles.fabricBump,
      bumpScale: 0.015,
      roughness: 0.86,
    });
    group.add(new THREE.Mesh(geos.kufi, mat));
  } else if (culture === 'african_ankara_gele') {
    const mat = new THREE.MeshStandardMaterial({
      map: textiles.ankaraPeacock,
      bumpMap: textiles.fabricBump,
      bumpScale: 0.016,
      color: new THREE.Color(accentHex),
      roughness: 0.78,
    });
    group.add(new THREE.Mesh(geos.geleCrown, mat));
    group.add(new THREE.Mesh(geos.geleFan, mat));
  } else if (culture === 'arabian_shemagh' || culture === 'arabian_ghutra_bisht') {
    const clothMat =
      culture === 'arabian_shemagh'
        ? new THREE.MeshStandardMaterial({
            map: textiles.arabianShemaghRed,
            bumpMap: textiles.fabricBump,
            bumpScale: 0.012,
            roughness: 0.85,
            side: THREE.DoubleSide,
          })
        : new THREE.MeshStandardMaterial({
            map: textiles.arabianThobeWhite,
            bumpMap: textiles.fabricBump,
            bumpScale: 0.012,
            roughness: 0.82,
            side: THREE.DoubleSide,
          });
    const agalMat = new THREE.MeshStandardMaterial({ color: '#11131A', roughness: 0.65 });
    group.add(new THREE.Mesh(geos.shemaghCap, clothMat));
    group.add(new THREE.Mesh(geos.shemaghDrape, clothMat));
    group.add(new THREE.Mesh(geos.agalRing, agalMat));
  } else if (culture === 'arabian_hijab') {
    const silkMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(accentHex),
      roughness: 0.64,
      side: THREE.DoubleSide,
    });
    group.add(new THREE.Mesh(geos.hijabWrap, silkMat));
    group.add(new THREE.Mesh(geos.hijabNeck, silkMat));
  } else if (culture === 'gym_athletic') {
    const hairMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(hairHex),
      roughness: 0.9,
    });
    group.add(new THREE.Mesh(geos.shortFade, hairMat));
  } else {
    const hairMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(hairHex), roughness: 0.86 });
    group.add(new THREE.Mesh(geos.hairCap, hairMat));
  }

  return group;
}

interface RiggedHumanProps {
  model: ModelKind;
  culture?: CultureStyle;
  position: [number, number, number];
  rotationY: number;
  scaleMultiplier?: number;
  bodyProportions?: [number, number, number];
  skinTint?: string;
  outfitTint?: string;
  hairColor?: string;
  accentRingColor?: string;
  isActivePlayer?: boolean;
  phaseOffset: number;
  moodRef: React.MutableRefObject<CrowdMood>;
  cheerBoostRef: React.MutableRefObject<number>;
  reducedMotion: boolean;
}

interface BoneRig {
  spine?: THREE.Bone;
  spine1?: THREE.Bone;
  head?: THREE.Bone;
  leftArm?: THREE.Bone;
  leftForeArm?: THREE.Bone;
  rightArm?: THREE.Bone;
  rightForeArm?: THREE.Bone;
  rest: Record<string, THREE.Euler>;
}

/**
 * Photorealistic rigged 3D human character with authentic cultural styling & live skeletal animation
 */
const RiggedRealisticHuman: React.FC<RiggedHumanProps> = React.memo(
  ({
    model,
    culture = 'western_blazer',
    position,
    rotationY,
    scaleMultiplier = 1,
    bodyProportions = [1, 1, 1],
    skinTint = '#FFFFFF',
    outfitTint = '#FFFFFF',
    hairColor = '#1A1614',
    accentRingColor,
    isActivePlayer = false,
    phaseOffset,
    moodRef,
    cheerBoostRef,
    reducedMotion,
  }) => {
    const gltf = useGLTF(model === 'michelle' ? '/models/michelle.glb' : '/models/rpm_human.glb');
    const textiles = useMemo(() => getCrowdTextiles(), []);
    const rootRef = useRef<THREE.Group>(null);
    const bonesRef = useRef<BoneRig>({ rest: {} });

    const clonedScene = useMemo(() => {
      const copy = cloneSkeleton(gltf.scene) as THREE.Group;
      const rig: BoneRig = { rest: {} };

      const findBone = (name: string): THREE.Bone | undefined => {
        let found: THREE.Bone | undefined;
        const target = name.toLowerCase();
        copy.traverse((obj) => {
          if (found || !(obj as THREE.Bone).isBone) return;
          const clean = obj.name.replace(/^mixamorig:?_?/i, '').toLowerCase();
          if (clean === target) {
            found = obj as THREE.Bone;
          }
        });
        return found;
      };

      const mapBone = (key: keyof Omit<BoneRig, 'rest'>, name: string) => {
        const bone = findBone(name);
        if (bone) {
          rig[key] = bone;
          rig.rest[key] = bone.rotation.clone();
        }
      };

      mapBone('spine', 'Spine');
      mapBone('spine1', 'Spine1');
      mapBone('head', 'Head');
      mapBone('leftArm', 'LeftArm');
      mapBone('leftForeArm', 'LeftForeArm');
      mapBone('rightArm', 'RightArm');
      mapBone('rightForeArm', 'RightForeArm');

      const hideBeard =
        culture === 'african_ankara_peacock' ||
        culture === 'african_ankara_orange' ||
        culture === 'african_ankara_sungold' ||
        culture === 'african_ankara_adire' ||
        culture === 'african_ankara_gele' ||
        culture === 'arabian_hijab' ||
        culture === 'western_streetwear' ||
        culture === 'gym_athletic';

      copy.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.castShadow = Boolean(accentRingColor);
          mesh.receiveShadow = true;
          mesh.frustumCulled = false;

          if (model === 'rpm' && mesh.material && !Array.isArray(mesh.material)) {
            const matName = mesh.material.name || '';

            // Hide the default clone fedora on RPM humans — we attach authentic cultural headwear or sculpted hairstyles below!
            if (matName.includes('Headwear')) {
              mesh.visible = false;
              return;
            }
            if (matName.includes('Beard') && hideBeard) {
              mesh.visible = false;
              return;
            }

            if (matName.includes('Skin') || matName.includes('Body')) {
              const m = mesh.material.clone() as THREE.MeshStandardMaterial;
              m.color = new THREE.Color(skinTint);
              m.roughness = 0.56;
              m.metalness = 0.02;
              m.needsUpdate = true;
              mesh.material = m;
            } else if (matName.includes('Outfit_Top') || matName.includes('Outfit_Bottom')) {
              const isTop = matName.includes('Outfit_Top');
              // Trim Victorian tailcoat tails & bowtie off casual, Ankara, and gym athletic tops
              if (isTop && culture !== 'western_blazer') {
                mesh.geometry = trimFormalTailcoatGeometry(mesh.geometry, true);
              }
              // Use a brand-new clean PBR material (strips the GLTF tuxedo normalMap/bowtie shading completely!)
              const m = new THREE.MeshStandardMaterial({
                bumpMap: textiles.fabricBump,
                bumpScale: 0.018,
                roughness: 0.88,
                metalness: 0.0,
              });

              if (culture === 'african_ankara_peacock') {
                m.map = textiles.ankaraPeacock;
                m.color = new THREE.Color('#FFFFFF');
              } else if (culture === 'african_ankara_crimson') {
                m.map = textiles.ankaraCrimson;
                m.color = new THREE.Color('#FFFFFF');
              } else if (culture === 'african_ankara_orange') {
                m.map = textiles.ankaraOrangeScallop;
                m.color = new THREE.Color('#FFFFFF');
              } else if (culture === 'african_ankara_sungold') {
                m.map = textiles.ankaraSunGold;
                m.color = new THREE.Color('#FFFFFF');
              } else if (culture === 'african_ankara_adire') {
                m.map = textiles.ankaraCobaltAdire;
                m.color = new THREE.Color('#FFFFFF');
              } else if (culture === 'african_kente') {
                m.map = textiles.kente;
                m.color = new THREE.Color('#FFFFFF');
              } else if (culture === 'african_ankara_gele') {
                m.map = textiles.ankaraCrimson;
                m.color = new THREE.Color('#FFFFFF');
              } else if (culture === 'african_dashiki') {
                m.map = textiles.dashikiRoyal;
                m.color = new THREE.Color('#FFFFFF');
              } else if (culture === 'arabian_shemagh') {
                m.map = textiles.arabianThobeWhite;
                m.color = new THREE.Color('#FFFFFF');
              } else if (culture === 'arabian_ghutra_bisht') {
                m.map = isTop ? textiles.arabianAbayaGold : textiles.arabianThobeSand;
                m.color = new THREE.Color('#FFFFFF');
              } else if (culture === 'arabian_hijab') {
                m.map = textiles.arabianAbayaGold;
                m.color = new THREE.Color(outfitTint);
              } else if (culture === 'gym_athletic') {
                m.map = textiles.gymAthletic;
                m.color = new THREE.Color(isTop ? outfitTint : '#22262E');
              } else if (culture === 'western_streetwear') {
                m.map = isTop ? textiles.westernStreetwear : textiles.westernSuit;
                m.color = new THREE.Color(isTop ? outfitTint : '#2E3548');
              } else {
                m.map = textiles.westernSuit;
                m.color = new THREE.Color(isTop ? outfitTint : '#283145');
              }
              m.needsUpdate = true;
              mesh.material = m;
            } else if (matName.includes('Footwear')) {
              const m = new THREE.MeshStandardMaterial({
                color: new THREE.Color(culture === 'gym_athletic' ? '#D6DAE0' : '#23262E'),
                roughness: 0.72,
                metalness: 0.04,
              });
              mesh.material = m;
            }
          }
        }
      });

      // Attach authentic cultural headwear or sculpted natural hair right onto the Head bone for RPM characters!
      if (model === 'rpm' && rig.head) {
        const hw = createBoneHeadwearGroup(culture, textiles, hairColor, outfitTint);
        rig.head.add(hw);
      }

      bonesRef.current = rig;
      return copy;
    }, [gltf.scene, model, culture, skinTint, outfitTint, hairColor, accentRingColor, textiles]);

    const baseScale = (model === 'michelle' ? 3.58 : 3.42) * scaleMultiplier;
    const scaleVec: [number, number, number] = [
      baseScale * bodyProportions[0],
      baseScale * bodyProportions[1],
      baseScale * bodyProportions[2],
    ];

    useFrame((state, delta) => {
      const dt = Math.min(delta, 0.05);
      const t = state.clock.elapsedTime;
      const rig = bonesRef.current;
      const mood = moodRef.current;
      const cheer = cheerBoostRef.current;
      const ph = phaseOffset;

      if (!rootRef.current) return;

      const baseArmDown = model === 'michelle' ? 1.18 : 0.38;
      const lerpRate = Math.min(1, dt * 8.0);

      let bounceY = 0;
      let spinePitch = 0.03;
      let headPitch = -0.14;
      let headYaw = 0;
      let armRaiseL = baseArmDown;
      let armRaiseR = baseArmDown;
      let armSpreadL = 0;
      let armSpreadR = 0;
      let foreBendL = 0.22;
      let foreBendR = 0.22;

      if (!reducedMotion) {
        if (mood === 'victory' || mood === 'cheer' || cheer > 0.08) {
          const energy = mood === 'victory' ? 1.0 : Math.max(cheer, 0.78);
          bounceY = Math.max(0, Math.sin(t * 7.6 + ph * 2.1)) * 0.32 * energy;
          spinePitch = -0.06;
          headPitch = -0.22;
          armRaiseL = (model === 'michelle' ? -0.95 : -1.85) + Math.sin(t * 9.5 + ph) * 0.22;
          armRaiseR = (model === 'michelle' ? -0.95 : -1.85) + Math.cos(t * 9.5 + ph) * 0.22;
          armSpreadL = 0.28;
          armSpreadR = -0.28;
          foreBendL = 0.65;
          foreBendR = 0.65;
        } else if (mood === 'gasp') {
          spinePitch = -0.14;
          headPitch = 0.14;
          armRaiseL = model === 'michelle' ? -0.55 : -1.35;
          armRaiseR = model === 'michelle' ? -0.55 : -1.35;
          foreBendL = 1.25;
          foreBendR = 1.25;
        } else if (mood === 'tense') {
          spinePitch = isActivePlayer ? 0.18 : 0.11;
          headPitch = -0.06;
          armRaiseL = baseArmDown - (isActivePlayer ? 0.55 : 0.24);
          armRaiseR = baseArmDown - (isActivePlayer ? 0.65 : 0.24);
          foreBendL = isActivePlayer ? 0.78 : 0.45;
          foreBendR = isActivePlayer ? 0.85 : 0.45;
        } else {
          // Natural relaxed standing idle with subtle breathing, head turns & gentle arm sway (zero random T-pose!)
          spinePitch = (isActivePlayer ? 0.07 : 0.02) + Math.sin(t * 1.4 + ph) * 0.018;
          headYaw = Math.sin(t * 0.65 + ph) * 0.11;
          armRaiseL = baseArmDown + Math.sin(t * 1.2 + ph) * 0.035;
          armRaiseR = baseArmDown - Math.sin(t * 1.2 + ph) * 0.035;
          foreBendL = isActivePlayer ? 0.42 : 0.22;
          foreBendR = isActivePlayer ? 0.46 : 0.22;
        }
      }

      rootRef.current.position.y = THREE.MathUtils.lerp(
        rootRef.current.position.y,
        position[1] + bounceY,
        lerpRate
      );

      if (rig.spine && rig.rest.spine) {
        rig.spine.rotation.x = THREE.MathUtils.lerp(
          rig.spine.rotation.x,
          rig.rest.spine.x + spinePitch,
          lerpRate
        );
      }
      if (rig.head && rig.rest.head) {
        rig.head.rotation.x = THREE.MathUtils.lerp(
          rig.head.rotation.x,
          rig.rest.head.x + headPitch,
          lerpRate
        );
        rig.head.rotation.y = THREE.MathUtils.lerp(
          rig.head.rotation.y,
          rig.rest.head.y + headYaw,
          lerpRate
        );
      }
      if (rig.leftArm && rig.rest.leftArm) {
        rig.leftArm.rotation.x = THREE.MathUtils.lerp(
          rig.leftArm.rotation.x,
          rig.rest.leftArm.x + armRaiseL,
          lerpRate
        );
        rig.leftArm.rotation.z = THREE.MathUtils.lerp(
          rig.leftArm.rotation.z,
          rig.rest.leftArm.z + armSpreadL,
          lerpRate
        );
      }
      if (rig.rightArm && rig.rest.rightArm) {
        rig.rightArm.rotation.x = THREE.MathUtils.lerp(
          rig.rightArm.rotation.x,
          rig.rest.rightArm.x + armRaiseR,
          lerpRate
        );
        rig.rightArm.rotation.z = THREE.MathUtils.lerp(
          rig.rightArm.rotation.z,
          rig.rest.rightArm.z + armSpreadR,
          lerpRate
        );
      }
      if (rig.leftForeArm && rig.rest.leftForeArm) {
        rig.leftForeArm.rotation.z = THREE.MathUtils.lerp(
          rig.leftForeArm.rotation.z,
          rig.rest.leftForeArm.z + foreBendL,
          lerpRate
        );
      }
      if (rig.rightForeArm && rig.rest.rightForeArm) {
        rig.rightForeArm.rotation.z = THREE.MathUtils.lerp(
          rig.rightForeArm.rotation.z,
          rig.rest.rightForeArm.z - foreBendR,
          lerpRate
        );
      }
    });

    return (
      <group ref={rootRef} position={position} rotation={[0, rotationY, 0]}>
        {accentRingColor && (
          <mesh position={[0, 0.035, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[1.05, isActivePlayer ? 1.38 : 1.18, 36]} />
            <meshBasicMaterial
              color={accentRingColor}
              transparent
              opacity={isActivePlayer ? 0.82 : 0.28}
            />
          </mesh>
        )}
        <primitive object={clonedScene} scale={scaleVec} />
      </group>
    );
  }
);

interface CrowdMemberSpec {
  culture: CultureStyle;
  x: number;
  y: number;
  z: number;
  rotY: number;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  phase: number;
  skinColor: THREE.Color;
  topColor: THREE.Color;
  bottomColor: THREE.Color;
  headwearColor: THREE.Color;
}

interface ExtractedRpmGeos {
  head: THREE.BufferGeometry;
  body: THREE.BufferGeometry;
  beard: THREE.BufferGeometry;
  top: THREE.BufferGeometry;
  bottom: THREE.BufferGeometry;
  footwear: THREE.BufferGeometry;
  skinMatBase: THREE.MeshStandardMaterial;
  bodyMatBase: THREE.MeshStandardMaterial;
  beardMatBase: THREE.MeshStandardMaterial;
  footwearMatBase: THREE.MeshStandardMaterial;
}

/**
 * Renders one cultural group of GPU-instanced realistic 3D spectators (e.g., African Kente,
 * African Gele & Ankara, Arabian Shemagh & Thobe, Arabian Hijab & Abaya, Modern Western Blazers & Streetwear)
 */
const CulturalCrowdBucket: React.FC<{
  culture: CultureStyle;
  members: CrowdMemberSpec[];
  rpmGeos: ExtractedRpmGeos;
  textiles: CrowdTextileSet;
  moodRef: React.MutableRefObject<CrowdMood>;
  cheerBoostRef: React.MutableRefObject<number>;
  reducedMotion: boolean;
}> = ({ culture, members, rpmGeos, textiles, moodRef, cheerBoostRef, reducedMotion }) => {
  const hwGeos = useMemo(() => getHeadwearGeometries(), []);

  // Build authentic PBR materials for this cultural bucket
  const mats = useMemo(() => {
    const skinMat = rpmGeos.skinMatBase.clone();
    skinMat.color = new THREE.Color('#FFFFFF');
    skinMat.roughness = 0.56;
    skinMat.metalness = 0.02;

    const bodyMat = rpmGeos.bodyMatBase.clone();
    bodyMat.color = new THREE.Color('#FFFFFF');
    bodyMat.roughness = 0.58;
    bodyMat.metalness = 0.02;

    const beardMat = rpmGeos.beardMatBase.clone();
    beardMat.roughness = 0.92;
    const shoeMat = rpmGeos.footwearMatBase.clone();
    shoeMat.color = new THREE.Color(culture === 'gym_athletic' ? '#D4D9E0' : '#262A34');
    shoeMat.roughness = 0.72;

    let topTex: THREE.Texture = textiles.westernSuit;
    let botTex: THREE.Texture = textiles.westernSuit;
    let hwMat1: THREE.MeshStandardMaterial;
    let hwMat2: THREE.MeshStandardMaterial | null = null;

    if (culture === 'african_ankara_peacock') {
      topTex = textiles.ankaraPeacock;
      botTex = textiles.ankaraPeacock;
      hwMat1 = new THREE.MeshStandardMaterial({
        color: '#FFFFFF',
        roughness: 0.94,
        bumpMap: textiles.fabricBump,
        bumpScale: 0.024,
      });
    } else if (culture === 'african_ankara_crimson') {
      topTex = textiles.ankaraCrimson;
      botTex = textiles.ankaraCrimson;
      hwMat1 = new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.9 });
    } else if (culture === 'african_ankara_orange') {
      topTex = textiles.ankaraOrangeScallop;
      botTex = textiles.ankaraOrangeScallop;
      hwMat1 = new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.84 });
    } else if (culture === 'african_ankara_sungold') {
      topTex = textiles.ankaraSunGold;
      botTex = textiles.ankaraSunGold;
      hwMat1 = new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.88 });
    } else if (culture === 'african_ankara_adire') {
      topTex = textiles.ankaraCobaltAdire;
      botTex = textiles.ankaraCobaltAdire;
      hwMat1 = new THREE.MeshStandardMaterial({
        color: '#FFFFFF',
        roughness: 0.94,
        bumpMap: textiles.fabricBump,
        bumpScale: 0.024,
      });
    } else if (culture === 'african_kente') {
      topTex = textiles.kente;
      botTex = textiles.kente;
      hwMat1 = new THREE.MeshStandardMaterial({
        map: textiles.kente,
        bumpMap: textiles.fabricBump,
        bumpScale: 0.015,
        roughness: 0.86,
      });
    } else if (culture === 'african_ankara_gele') {
      topTex = textiles.ankaraPeacock;
      botTex = textiles.ankaraCrimson;
      hwMat1 = new THREE.MeshStandardMaterial({
        map: textiles.ankaraCrimson,
        bumpMap: textiles.fabricBump,
        bumpScale: 0.016,
        roughness: 0.8,
      });
      hwMat2 = new THREE.MeshStandardMaterial({
        map: textiles.ankaraPeacock,
        bumpMap: textiles.fabricBump,
        bumpScale: 0.016,
        roughness: 0.8,
      });
    } else if (culture === 'african_dashiki') {
      topTex = textiles.dashikiRoyal;
      botTex = textiles.dashikiRoyal;
      hwMat1 = new THREE.MeshStandardMaterial({
        map: textiles.dashikiRoyal,
        bumpMap: textiles.fabricBump,
        bumpScale: 0.015,
        roughness: 0.86,
      });
    } else if (culture === 'arabian_shemagh') {
      topTex = textiles.arabianThobeWhite;
      botTex = textiles.arabianThobeWhite;
      hwMat1 = new THREE.MeshStandardMaterial({
        map: textiles.arabianShemaghRed,
        bumpMap: textiles.fabricBump,
        bumpScale: 0.012,
        roughness: 0.85,
        side: THREE.DoubleSide,
      });
      hwMat2 = new THREE.MeshStandardMaterial({ color: '#101218', roughness: 0.65 });
    } else if (culture === 'arabian_ghutra_bisht') {
      topTex = textiles.arabianAbayaGold;
      botTex = textiles.arabianThobeSand;
      hwMat1 = new THREE.MeshStandardMaterial({
        map: textiles.arabianThobeWhite,
        bumpMap: textiles.fabricBump,
        bumpScale: 0.012,
        roughness: 0.82,
        side: THREE.DoubleSide,
      });
      hwMat2 = new THREE.MeshStandardMaterial({ color: '#101218', roughness: 0.65 });
    } else if (culture === 'arabian_hijab') {
      topTex = textiles.arabianAbayaGold;
      botTex = textiles.arabianAbayaGold;
      hwMat1 = new THREE.MeshStandardMaterial({
        color: '#FFFFFF',
        roughness: 0.64,
        side: THREE.DoubleSide,
      });
    } else if (culture === 'gym_athletic') {
      topTex = textiles.gymAthletic;
      botTex = textiles.gymAthletic;
      hwMat1 = new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.88 });
    } else if (culture === 'western_streetwear') {
      topTex = textiles.westernStreetwear;
      botTex = textiles.westernSuit;
      hwMat1 = new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.88 });
    } else {
      topTex = textiles.westernSuit;
      botTex = textiles.westernSuit;
      hwMat1 = new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.88 });
    }

    const topMat = new THREE.MeshStandardMaterial({
      map: topTex,
      bumpMap: textiles.fabricBump,
      bumpScale: 0.018,
      color: '#FFFFFF',
      roughness: 0.88,
      metalness: 0.0,
    });
    const botMat = new THREE.MeshStandardMaterial({
      map: botTex,
      bumpMap: textiles.fabricBump,
      bumpScale: 0.018,
      color: '#FFFFFF',
      roughness: 0.9,
      metalness: 0.0,
    });

    return { skinMat, bodyMat, beardMat, shoeMat, topMat, botMat, hwMat1, hwMat2 };
  }, [culture, rpmGeos, textiles]);

  useEffect(() => {
    return () => {
      mats.skinMat.dispose();
      mats.bodyMat.dispose();
      mats.beardMat.dispose();
      mats.shoeMat.dispose();
      mats.topMat.dispose();
      mats.botMat.dispose();
      mats.hwMat1.dispose();
      mats.hwMat2?.dispose();
    };
  }, [mats]);

  // Assemble the exact list of instanced sub-layers for this cultural group
  const layers = useMemo(() => {
    const showBeard =
      culture === 'african_ankara_crimson' ||
      culture === 'arabian_shemagh' ||
      culture === 'arabian_ghutra_bisht' ||
      culture === 'african_dashiki';

    const list: Array<{
      key: string;
      geo: THREE.BufferGeometry;
      mat: THREE.MeshStandardMaterial;
      colorSlot: 'skin' | 'top' | 'bottom' | 'headwear' | 'fixed';
    }> = [
      { key: 'head', geo: rpmGeos.head, mat: mats.skinMat, colorSlot: 'skin' },
      { key: 'body', geo: rpmGeos.body, mat: mats.bodyMat, colorSlot: 'skin' },
      { key: 'top', geo: rpmGeos.top, mat: mats.topMat, colorSlot: 'top' },
      { key: 'bottom', geo: rpmGeos.bottom, mat: mats.botMat, colorSlot: 'bottom' },
      { key: 'shoe', geo: rpmGeos.footwear, mat: mats.shoeMat, colorSlot: 'fixed' },
    ];

    if (showBeard) {
      list.push({ key: 'beard', geo: rpmGeos.beard, mat: mats.beardMat, colorSlot: 'fixed' });
    }

    if (culture === 'african_ankara_peacock' || culture === 'african_ankara_adire') {
      list.push({ key: 'afro', geo: hwGeos.naturalAfro, mat: mats.hwMat1, colorSlot: 'headwear' });
    } else if (culture === 'african_ankara_crimson' || culture === 'gym_athletic') {
      list.push({ key: 'fade', geo: hwGeos.shortFade, mat: mats.hwMat1, colorSlot: 'headwear' });
    } else if (culture === 'african_ankara_orange') {
      list.push({ key: 'wave', geo: hwGeos.croppedWave, mat: mats.hwMat1, colorSlot: 'headwear' });
    } else if (culture === 'african_ankara_sungold') {
      list.push({ key: 'cornrows', geo: hwGeos.cornrowCrown, mat: mats.hwMat1, colorSlot: 'headwear' });
    } else if (culture === 'african_kente' || culture === 'african_dashiki') {
      list.push({ key: 'kufi', geo: hwGeos.kufi, mat: mats.hwMat1, colorSlot: 'headwear' });
    } else if (culture === 'african_ankara_gele') {
      list.push({ key: 'gele1', geo: hwGeos.geleCrown, mat: mats.hwMat1, colorSlot: 'headwear' });
      list.push({
        key: 'gele2',
        geo: hwGeos.geleFan,
        mat: mats.hwMat2 ?? mats.hwMat1,
        colorSlot: 'headwear',
      });
    } else if (culture === 'arabian_shemagh' || culture === 'arabian_ghutra_bisht') {
      list.push({ key: 'shemCap', geo: hwGeos.shemaghCap, mat: mats.hwMat1, colorSlot: 'fixed' });
      list.push({ key: 'shemDrape', geo: hwGeos.shemaghDrape, mat: mats.hwMat1, colorSlot: 'fixed' });
      list.push({
        key: 'agal',
        geo: hwGeos.agalRing,
        mat: mats.hwMat2 ?? mats.hwMat1,
        colorSlot: 'fixed',
      });
    } else if (culture === 'arabian_hijab') {
      list.push({ key: 'hijabCap', geo: hwGeos.hijabWrap, mat: mats.hwMat1, colorSlot: 'headwear' });
      list.push({ key: 'hijabNeck', geo: hwGeos.hijabNeck, mat: mats.hwMat1, colorSlot: 'headwear' });
    } else {
      list.push({ key: 'hair', geo: hwGeos.hairCap, mat: mats.hwMat1, colorSlot: 'headwear' });
    }

    return list;
  }, [culture, rpmGeos, hwGeos, mats]);

  const meshRefs = useRef<Array<THREE.InstancedMesh | null>>([]);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const whiteColor = useMemo(() => new THREE.Color('#FFFFFF'), []);

  // Apply per-person diverse skin, garment, and headwear colors
  useEffect(() => {
    layers.forEach((layer, lIdx) => {
      const im = meshRefs.current[lIdx];
      if (!im) return;
      for (let i = 0; i < members.length; i++) {
        const m = members[i];
        const c =
          layer.colorSlot === 'skin'
            ? m.skinColor
            : layer.colorSlot === 'top'
              ? m.topColor
              : layer.colorSlot === 'bottom'
                ? m.bottomColor
                : layer.colorSlot === 'headwear'
                  ? m.headwearColor
                  : whiteColor;
        im.setColorAt(i, c);
      }
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
    });
  }, [layers, members, whiteColor]);

  // Synchronized reactive boxing-arena crowd wave animation
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const mood = moodRef.current;
    const cheer = cheerBoostRef.current;
    const count = members.length;

    for (let i = 0; i < count; i++) {
      const s = members[i];
      let dy = 0;
      let leanX = 0;
      let swayZ = 0;

      if (!reducedMotion) {
        if (mood === 'victory' || mood === 'cheer' || cheer > 0.08) {
          const energy = mood === 'victory' ? 1.0 : Math.max(cheer, 0.72);
          dy = Math.max(0, Math.sin(t * 7.5 + s.phase)) * 0.55 * energy;
          swayZ = Math.sin(t * 6.5 + s.phase) * 0.07 * energy;
          leanX = -0.05;
        } else if (mood === 'gasp') {
          dy = Math.max(0, Math.sin(t * 5.0 + s.phase)) * 0.18;
          leanX = -0.1;
        } else if (mood === 'tense') {
          leanX = 0.09;
          swayZ = Math.sin(t * 2.0 + s.phase) * 0.025;
        } else {
          const excited = Math.sin(t * 0.75 + s.phase) > 0.64;
          dy = excited
            ? Math.max(0, Math.sin(t * 6.4 + s.phase)) * 0.25
            : Math.sin(t * 2.1 + s.phase) * 0.035;
          swayZ = Math.sin(t * 1.4 + s.phase) * 0.03;
        }
      }

      dummy.position.set(s.x, s.y + dy, s.z);
      dummy.rotation.set(leanX, s.rotY, swayZ);
      dummy.scale.set(s.scaleX, s.scaleY, s.scaleZ);
      dummy.updateMatrix();

      for (let l = 0; l < layers.length; l++) {
        const im = meshRefs.current[l];
        if (im) im.setMatrixAt(i, dummy.matrix);
      }
    }

    for (let l = 0; l < layers.length; l++) {
      const im = meshRefs.current[l];
      if (im) im.instanceMatrix.needsUpdate = true;
    }
  });

  if (members.length === 0) return null;

  return (
    <group>
      {layers.map((layer, lIdx) => (
        <instancedMesh
          key={`${culture}-${layer.key}`}
          ref={(el) => {
            meshRefs.current[lIdx] = el;
          }}
          args={[layer.geo, layer.mat, members.length]}
          frustumCulled={false}
        />
      ))}
    </group>
  );
};

/**
 * Scene-Aware Diverse Instanced Crowd (scales density, placement layout & cultural attire per scene!)
 */
const PackedBoxingCrowd: React.FC<{
  crowdConfig: SceneCrowdConfig;
  moodRef: React.MutableRefObject<CrowdMood>;
  cheerBoostRef: React.MutableRefObject<number>;
  reducedMotion: boolean;
  graphicsQuality: 'low' | 'medium' | 'high';
}> = ({ crowdConfig, moodRef, cheerBoostRef, reducedMotion, graphicsQuality }) => {
  const rpmGltf = useGLTF('/models/rpm_human.glb');
  const textiles = useMemo(() => getCrowdTextiles(), []);

  // Extract static anatomical meshes from rpm_human.glb in a natural relaxed standing pose (arms lowered, zero A-pose!)
  const rpmGeos = useMemo<ExtractedRpmGeos | null>(() => {
    const map: Record<string, { geo: THREE.BufferGeometry; mat: THREE.MeshStandardMaterial }> = {};
    const posedCopy = cloneSkeleton(rpmGltf.scene) as THREE.Group;

    // Pose the upper arms & elbows into a natural relaxed standing stance before baking vertices
    posedCopy.traverse((obj) => {
      if (!(obj as THREE.Bone).isBone) return;
      const bone = obj as THREE.Bone;
      const clean = bone.name.replace(/^mixamorig:?_?/i, '').toLowerCase();
      if (clean === 'leftarm') {
        bone.rotation.x += 0.38;
      } else if (clean === 'rightarm') {
        bone.rotation.x += 0.38;
      } else if (clean === 'leftforearm') {
        bone.rotation.z += 0.18;
      } else if (clean === 'rightforearm') {
        bone.rotation.z -= 0.18;
      }
    });
    posedCopy.updateMatrixWorld(true);

    const tmpPos = new THREE.Vector3();
    posedCopy.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const mat = mesh.material as THREE.MeshStandardMaterial;
        if (!mat || Array.isArray(mat)) return;
        const name = mat.name || mesh.name;

        const cleanGeo =
          name === 'Wolf3D_Outfit_Top'
            ? trimFormalTailcoatGeometry(mesh.geometry, true)
            : mesh.geometry.clone();
        if ((mesh as THREE.SkinnedMesh).isSkinnedMesh) {
          const skinned = mesh as THREE.SkinnedMesh;
          skinned.skeleton.update();
          const posAttr = cleanGeo.attributes.position as THREE.BufferAttribute;
          for (let i = 0; i < posAttr.count; i++) {
            tmpPos.fromBufferAttribute(posAttr, i);
            skinned.applyBoneTransform(i, tmpPos);
            posAttr.setXYZ(i, tmpPos.x, tmpPos.y, tmpPos.z);
          }
          posAttr.needsUpdate = true;
          cleanGeo.computeVertexNormals();
        }
        cleanGeo.morphAttributes = {};
        cleanGeo.deleteAttribute('skinIndex');
        cleanGeo.deleteAttribute('skinWeight');
        map[name] = { geo: cleanGeo, mat };
      }
    });

    if (
      !map.Wolf3D_Skin ||
      !map.Wolf3D_Body ||
      !map.Wolf3D_Beard ||
      !map.Wolf3D_Outfit_Top ||
      !map.Wolf3D_Outfit_Bottom ||
      !map.Wolf3D_Outfit_Footwear
    ) {
      return null;
    }

    return {
      head: map.Wolf3D_Skin.geo,
      body: map.Wolf3D_Body.geo,
      beard: map.Wolf3D_Beard.geo,
      top: map.Wolf3D_Outfit_Top.geo,
      bottom: map.Wolf3D_Outfit_Bottom.geo,
      footwear: map.Wolf3D_Outfit_Footwear.geo,
      skinMatBase: map.Wolf3D_Skin.mat,
      bodyMatBase: map.Wolf3D_Body.mat,
      beardMatBase: map.Wolf3D_Beard.mat,
      footwearMatBase: map.Wolf3D_Outfit_Footwear.mat,
    };
  }, [rpmGltf.scene]);

  useEffect(() => {
    return () => {
      if (!rpmGeos) return;
      rpmGeos.head.dispose();
      rpmGeos.body.dispose();
      rpmGeos.beard.dispose();
      rpmGeos.top.dispose();
      rpmGeos.bottom.dispose();
      rpmGeos.footwear.dispose();
    };
  }, [rpmGeos]);

  // Partition spectators across cultural styles & scene-specific layout
  const buckets = useMemo(() => {
    const grouped: Record<CultureStyle, CrowdMemberSpec[]> = {
      african_ankara_peacock: [],
      african_ankara_crimson: [],
      african_ankara_orange: [],
      african_ankara_sungold: [],
      african_ankara_adire: [],
      african_kente: [],
      african_ankara_gele: [],
      african_dashiki: [],
      arabian_shemagh: [],
      arabian_ghutra_bisht: [],
      arabian_hijab: [],
      western_blazer: [],
      western_streetwear: [],
      gym_athletic: [],
    };

    const targetCount =
      crowdConfig.layout === 'none'
        ? 0
        : graphicsQuality === 'high'
          ? crowdConfig.crowdCountHigh
          : graphicsQuality === 'medium'
            ? Math.round((crowdConfig.crowdCountHigh + crowdConfig.crowdCountLow) * 0.5)
            : crowdConfig.crowdCountLow;

    if (targetCount <= 0) {
      return grouped;
    }

    const weightedCultures: CultureStyle[] =
      crowdConfig.culturalMix === 'lagos'
        ? [
            'african_ankara_peacock',
            'african_ankara_peacock',
            'african_ankara_crimson',
            'african_ankara_crimson',
            'african_ankara_orange',
            'african_ankara_sungold',
            'african_ankara_sungold',
            'african_ankara_adire',
            'african_ankara_adire',
            'african_ankara_gele',
            'african_kente',
            'african_dashiki',
            'western_streetwear',
          ]
        : crowdConfig.culturalMix === 'gym'
          ? ['gym_athletic']
          : crowdConfig.culturalMix === 'paris'
            ? [
                'western_blazer',
                'western_blazer',
                'western_blazer',
                'western_streetwear',
                'western_streetwear',
                'african_ankara_peacock',
                'african_ankara_adire',
                'arabian_hijab',
                'african_ankara_orange',
              ]
            : crowdConfig.culturalMix === 'casual-indoor'
              ? [
                  'western_streetwear',
                  'western_streetwear',
                  'western_blazer',
                  'western_blazer',
                  'african_ankara_peacock',
                  'african_ankara_adire',
                  'arabian_hijab',
                ]
              : [
                  'african_ankara_peacock',
                  'african_ankara_crimson',
                  'african_ankara_orange',
                  'african_ankara_sungold',
                  'african_ankara_adire',
                  'african_kente',
                  'african_ankara_gele',
                  'african_dashiki',
                  'arabian_shemagh',
                  'arabian_ghutra_bisht',
                  'arabian_hijab',
                  'western_blazer',
                  'western_blazer',
                  'western_streetwear',
                  'western_streetwear',
                ];

    const africanSkins = ['#53301D', '#663D26', '#7A4C32', '#472817', '#8A593B', '#5D3621'];
    const diverseSkins = ['#663D26', '#8A593B', '#B88462', '#D4A582', '#E8C1A8', '#53301D', '#CFA07C'];
    const arabianSkins = ['#D4A582', '#C3926D', '#DFB696', '#B58360'];
    const westernSkins = ['#F0D1BE', '#E5BCA3', '#D4A889', '#BE8E6C', '#9E7052'];

    const westernBlazerColors = ['#263B5E', '#5B2333', '#2E473B', '#8E7355', '#3A3E52', '#4D325C'];
    const westernStreetColors = ['#C4603C', '#2E7270', '#465180', '#B8913A', '#883A4B', '#3A5A40'];
    const gymAthleticColors = ['#2B313B', '#3E5E55', '#44536E', '#8F4036', '#564E6B', '#6A717D', '#232830'];
    const hijabColors = ['#E8DAC5', '#C98A8E', '#598A88', '#D6B36A', '#6A659E', '#354866'];
    const abayaTints = ['#9CA4B8', '#B89EB2', '#8FB0A8', '#A8A295'];
    const geleTints = ['#FFD56B', '#6AE0D2', '#FF8E6E', '#F0A6CA', '#FFFFFF'];
    const hairColors = ['#151211', '#221B17', '#3B281E', '#6B482C', '#98774B', '#2E2A29'];
    const naturalBlackHair = ['#121010', '#1B1715', '#241E1B'];
    const bodyProfiles: Array<[number, number, number]> = [
      [0.92, 0.99, 0.93], // Slender
      [1.0, 1.0, 1.0],    // Average
      [1.07, 1.05, 1.03], // Tall athletic
      [1.15, 0.97, 1.14], // Fuller / curvy
      [0.96, 1.03, 0.96], // Lean tall
      [1.04, 0.96, 1.04], // Compact sturdy
    ];

    let seed = 42 + crowdConfig.layout.length * 17;
    const nextRand = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
    const pick = <T,>(arr: T[]) => arr[Math.floor(nextRand() * arr.length)];

    // Generate scene-appropriate spectator coordinates
    const placements: Array<{ x: number; y: number; z: number; row: number }> = [];

    if (crowdConfig.layout === 'stadium-bleachers') {
      const maxRows = graphicsQuality === 'high' ? 4 : graphicsQuality === 'medium' ? 3 : 2;
      const spacing = graphicsQuality === 'high' ? 2.18 : graphicsQuality === 'medium' ? 2.55 : 3.2;

      for (let row = 0; row < maxRows; row++) {
        const dist = 11.4 + row * 2.45;
        const rowY = FLOOR_Y + 0.55 + row * 1.48;
        const halfSpan = dist - 0.8;
        const countPerSide = Math.max(5, Math.floor((halfSpan * 2) / spacing));

        for (let side = 0; side < 4; side++) {
          for (let i = 0; i <= countPerSide; i++) {
            const frac = i / countPerSide;
            const along = -halfSpan + frac * (halfSpan * 2) + (nextRand() - 0.5) * 0.42;
            const depthJitter = (nextRand() - 0.5) * 0.32;
            let x = 0;
            let z = 0;
            if (side === 0) {
              x = along;
              z = -(dist + depthJitter);
            } else if (side === 1) {
              x = -(dist + depthJitter);
              z = along;
            } else if (side === 2) {
              x = dist + depthJitter;
              z = along;
            } else {
              x = along;
              z = dist + depthJitter;
            }
            if (x > 6.5 && z > 6.5 && row < 2) continue;
            placements.push({ x, y: rowY, z, row });
          }
        }
      }
    } else if (crowdConfig.layout === 'plaza-ring') {
      // Natural open-air ground-level spectators encircling the market square or Paris plaza
      for (let i = 0; i < targetCount; i++) {
        const ring = i % 2;
        const angle = (i / targetCount) * Math.PI * 2 + (nextRand() - 0.5) * 0.18;
        const radius = 10.6 + ring * 2.15 + (nextRand() - 0.5) * 0.65;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        // Keep primary front-right camera corridor clear
        if (x > 5.0 && z > 5.0) continue;
        placements.push({ x, y: FLOOR_Y, z, row: ring });
      }
    } else if (crowdConfig.layout === 'street-sides') {
      // Spectators clustered organically along Lagos Island sidewalks (clear of asphalt lane)
      for (let i = 0; i < targetCount; i++) {
        const side = i % 3; // back sidewalk, left curb, right curb
        let x = 0;
        let z = 0;
        if (side === 0) {
          x = (nextRand() - 0.5) * 20;
          z = -9.6 - nextRand() * 2.1;
        } else if (side === 1) {
          x = -10.5 - nextRand() * 3.2;
          z = -8.5 + nextRand() * 16.5;
        } else {
          x = 10.5 + nextRand() * 3.2;
          z = -8.5 + nextRand() * 14.5;
        }
        if (x > 6.0 && z > 5.5) continue;
        placements.push({ x, y: FLOOR_Y, z, row: i % 2 });
      }
    } else {
      // Intimate perimeter arc (Neighbourhood Bar small group)
      for (let i = 0; i < targetCount; i++) {
        const frac = targetCount > 1 ? i / (targetCount - 1) : 0.5;
        const angle = -Math.PI * 0.92 + frac * (Math.PI * 1.15);
        const radius = 10.8 + (i % 2) * 1.5;
        const x = Math.cos(angle) * radius + (nextRand() - 0.5) * 0.5;
        const z = Math.sin(angle) * radius + (nextRand() - 0.5) * 0.5;
        placements.push({ x, y: FLOOR_Y, z, row: 0 });
      }
    }

    for (const pt of placements) {
      const { x, y: rowY, z, row } = pt;
      const culture = pick(weightedCultures);
      let skinHex = '#FFFFFF';
      let topHex = '#FFFFFF';
      let botHex = '#FFFFFF';
      let hwHex = '#FFFFFF';

      if (
        culture === 'african_ankara_peacock' ||
        culture === 'african_ankara_crimson' ||
        culture === 'african_ankara_sungold' ||
        culture === 'african_ankara_adire'
      ) {
        skinHex = pick(africanSkins);
        topHex = '#FFFFFF';
        botHex = '#FFFFFF';
        hwHex = pick(naturalBlackHair);
      } else if (culture === 'african_ankara_orange') {
        skinHex = pick(diverseSkins);
        topHex = '#FFFFFF';
        botHex = '#FFFFFF';
        hwHex = pick(['#2A1E24', '#1E1816', '#3D2722']);
      } else if (culture === 'african_kente') {
        skinHex = pick(africanSkins);
        topHex = pick(['#FFFFFF', '#F7E7C4', '#E8F0E5']);
        botHex = topHex;
        hwHex = '#FFFFFF';
      } else if (culture === 'african_ankara_gele') {
        skinHex = pick(africanSkins);
        topHex = pick(['#FFFFFF', '#FFE8C8', '#DFF7F2']);
        botHex = pick(['#FFFFFF', '#F5D5D5']);
        hwHex = pick(geleTints);
      } else if (culture === 'african_dashiki') {
        skinHex = pick(africanSkins);
        topHex = pick(['#FFFFFF', '#DCE6FF', '#F2E5C6']);
        botHex = topHex;
        hwHex = topHex;
      } else if (culture === 'arabian_shemagh') {
        skinHex = pick(arabianSkins);
        topHex = pick(['#FFFFFF', '#F6F1E6', '#EFEAD8']);
        botHex = topHex;
      } else if (culture === 'arabian_ghutra_bisht') {
        skinHex = pick(arabianSkins);
        topHex = pick(['#FFFFFF', '#D8D4C8', '#C5CBD8']);
        botHex = '#F5EFE0';
      } else if (culture === 'arabian_hijab') {
        skinHex = pick(arabianSkins);
        topHex = pick(abayaTints);
        botHex = topHex;
        hwHex = pick(hijabColors);
      } else if (culture === 'gym_athletic') {
        skinHex = pick(diverseSkins);
        topHex = pick(gymAthleticColors);
        botHex = pick(['#1C2026', '#262B34', '#2F3640']);
        hwHex = pick(hairColors);
      } else if (culture === 'western_streetwear') {
        skinHex = pick(westernSkins);
        topHex = pick(westernStreetColors);
        botHex = pick(['#293040', '#383B47', '#4B443E']);
        hwHex = pick(hairColors);
      } else {
        skinHex = pick(westernSkins);
        topHex = pick(westernBlazerColors);
        botHex = pick(['#252B3B', '#333642', '#3F3A36']);
        hwHex = pick(hairColors);
      }

      const baseScale = 3.16 + nextRand() * 0.38;
      const [bpX, bpY, bpZ] = pick(bodyProfiles);

      grouped[culture].push({
        culture,
        x,
        y: rowY,
        z,
        rotY: Math.atan2(-x, -z) + (nextRand() - 0.5) * 0.22,
        scaleX: baseScale * bpX,
        scaleY: baseScale * bpY,
        scaleZ: baseScale * bpZ,
        phase: Math.atan2(z, x) * 2.0 + row * 0.65 + nextRand() * 1.5,
        skinColor: new THREE.Color(skinHex),
        topColor: new THREE.Color(topHex),
        bottomColor: new THREE.Color(botHex),
        headwearColor: new THREE.Color(hwHex),
      });
    }

    return grouped;
  }, [graphicsQuality, crowdConfig]);

  if (!rpmGeos || crowdConfig.layout === 'none') return null;

  return (
    <group>
      {(Object.keys(buckets) as CultureStyle[]).map((culture) => (
        <CulturalCrowdBucket
          key={culture}
          culture={culture}
          members={buckets[culture]}
          rpmGeos={rpmGeos}
          textiles={textiles}
          moodRef={moodRef}
          cheerBoostRef={cheerBoostRef}
          reducedMotion={reducedMotion}
        />
      ))}
    </group>
  );
};

/**
 * Championship Boxing-Ring Camera Flashes sparkling across the packed bleachers
 */
const ArenaCameraFlashes: React.FC<{
  moodRef: React.MutableRefObject<CrowdMood>;
  cheerBoostRef: React.MutableRefObject<number>;
  reducedMotion: boolean;
}> = ({ moodRef, cheerBoostRef, reducedMotion }) => {
  const flashPositions = useMemo(() => {
    const pts: Array<[number, number, number, number]> = [];
    for (let i = 0; i < 18; i++) {
      const angle = (i / 18) * Math.PI * 2 + 0.3;
      const radius = 14.5 + (i % 3) * 2.4;
      const y = FLOOR_Y + 5.2 + (i % 4) * 1.3;
      pts.push([Math.cos(angle) * radius, y, Math.sin(angle) * radius, i * 2.37]);
    }
    return pts;
  }, []);

  const meshRefs = useRef<Array<THREE.Mesh | null>>([]);

  useFrame((state) => {
    if (reducedMotion) return;
    const t = state.clock.elapsedTime;
    const excited =
      moodRef.current === 'cheer' ||
      moodRef.current === 'victory' ||
      moodRef.current === 'gasp' ||
      cheerBoostRef.current > 0.1;
    const freq = excited ? 4.2 : 1.5;

    for (let i = 0; i < flashPositions.length; i++) {
      const mesh = meshRefs.current[i];
      if (!mesh) continue;
      const pulse = Math.pow(Math.max(0, Math.sin(t * freq + flashPositions[i][3])), 32);
      const scale = pulse * (excited ? 0.85 : 0.48);
      mesh.scale.setScalar(scale);
      mesh.visible = scale > 0.03;
    }
  });

  return (
    <group>
      {flashPositions.map(([x, y, z], i) => (
        <mesh
          key={i}
          ref={(el) => {
            meshRefs.current[i] = el;
          }}
          position={[x, y, z]}
          visible={false}
        >
          <sphereGeometry args={[0.35, 8, 8]} />
          <meshBasicMaterial color="#FFF7E6" transparent opacity={0.92} />
        </mesh>
      ))}
    </group>
  );
};

/**
 * Championship Boxing Ring Stage: Square Apron, 4 Turnbuckle Posts, 3 Tensioned Ropes,
 * Steep 4-Sided Stadium Bleachers, and Overhead Fight-Night Lighting Truss
 */
const BoxingRingArena: React.FC = () => {
  const corners: Array<[number, number, string]> = [
    [-RING_HALF, -RING_HALF, PALETTE.electricAqua],
    [RING_HALF, -RING_HALF, PALETTE.warmTangerine],
    [RING_HALF, RING_HALF, PALETTE.electricAqua],
    [-RING_HALF, RING_HALF, PALETTE.warmTangerine],
  ];

  const ropeHeights = [FLOOR_Y + 1.9, FLOOR_Y + 3.15, FLOOR_Y + 4.4];
  const ropeSpan = RING_HALF * 2;

  return (
    <group>
      {/* Boxing Ring Mat Floor Deck & Championship Border */}
      <group position={[0, FLOOR_Y, 0]}>
        <mesh position={[0, -0.35, 0]} receiveShadow>
          <boxGeometry args={[RING_HALF * 2 + 1.4, 0.72, RING_HALF * 2 + 1.4]} />
          <meshStandardMaterial color="#151D31" roughness={0.84} metalness={0.14} />
        </mesh>

        <mesh position={[0, 0.025, -RING_HALF]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[ropeSpan, 0.14]} />
          <meshBasicMaterial color={PALETTE.electricAqua} transparent opacity={0.45} />
        </mesh>
        <mesh position={[0, 0.025, RING_HALF]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[ropeSpan, 0.14]} />
          <meshBasicMaterial color={PALETTE.electricAqua} transparent opacity={0.45} />
        </mesh>
        <mesh position={[-RING_HALF, 0.025, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
          <planeGeometry args={[ropeSpan, 0.14]} />
          <meshBasicMaterial color={PALETTE.electricAqua} transparent opacity={0.45} />
        </mesh>
        <mesh position={[RING_HALF, 0.025, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
          <planeGeometry args={[ropeSpan, 0.14]} />
          <meshBasicMaterial color={PALETTE.electricAqua} transparent opacity={0.45} />
        </mesh>
      </group>

      {/* 4 Championship Corner Posts + Padded Turnbuckles */}
      {corners.map(([cx, cz, padColor], i) => (
        <group key={`post-${i}`} position={[cx, FLOOR_Y, cz]}>
          <mesh position={[0, 2.55, 0]} castShadow>
            <cylinderGeometry args={[0.24, 0.28, 5.2, 18]} />
            <meshStandardMaterial color="#1E273D" roughness={0.42} metalness={0.65} />
          </mesh>
          <mesh position={[0, 3.15, 0]}>
            <cylinderGeometry args={[0.31, 0.31, 2.9, 18]} />
            <meshStandardMaterial
              color={padColor}
              emissive={padColor}
              emissiveIntensity={0.22}
              roughness={0.5}
              metalness={0.12}
            />
          </mesh>
          <mesh position={[0, 5.2, 0]}>
            <sphereGeometry args={[0.28, 14, 14]} />
            <meshStandardMaterial color="#2C3854" roughness={0.3} metalness={0.75} />
          </mesh>
        </group>
      ))}

      {/* 3 Tiers of Tensioned Boxing Ring Ropes on All 4 Sides */}
      {ropeHeights.map((ry, rIdx) => {
        const ropeColor = rIdx === 1 ? PALETTE.softIvory : '#7282A6';
        return (
          <group key={`rope-tier-${rIdx}`}>
            <mesh position={[0, ry, -RING_HALF]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.045, 0.045, ropeSpan, 10]} />
              <meshStandardMaterial color={ropeColor} roughness={0.55} metalness={0.2} />
            </mesh>
            <mesh position={[0, ry, RING_HALF]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.045, 0.045, ropeSpan, 10]} />
              <meshStandardMaterial color={ropeColor} roughness={0.55} metalness={0.2} />
            </mesh>
            <mesh position={[-RING_HALF, ry, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.045, 0.045, ropeSpan, 10]} />
              <meshStandardMaterial color={ropeColor} roughness={0.55} metalness={0.2} />
            </mesh>
            <mesh position={[RING_HALF, ry, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.045, 0.045, ropeSpan, 10]} />
              <meshStandardMaterial color={ropeColor} roughness={0.55} metalness={0.2} />
            </mesh>
          </group>
        );
      })}

      {/* Steep 4-Sided Stadium Bleacher Risers Surrounding the Boxing Ring */}
      {[0, 1, 2, 3].map((row) => {
        const inner = 10.2 + row * 2.45;
        const depth = 2.55;
        const stepH = 1.48;
        const topY = FLOOR_Y + 0.55 + row * stepH;
        const centerDist = inner + depth * 0.5;
        const span = (inner + depth) * 2;
        const trimColor = row % 2 === 0 ? PALETTE.electricAqua : PALETTE.vividPeriwinkle;

        return (
          <group key={`bleacher-row-${row}`}>
            <mesh position={[0, topY - stepH * 0.5, -centerDist]} receiveShadow>
              <boxGeometry args={[span, stepH, depth]} />
              <meshStandardMaterial color="#131B2E" roughness={0.9} metalness={0.1} />
            </mesh>
            <mesh position={[0, topY + 0.02, -inner - 0.05]}>
              <boxGeometry args={[span, 0.05, 0.08]} />
              <meshBasicMaterial color={trimColor} transparent opacity={0.22} />
            </mesh>

            <mesh position={[0, topY - stepH * 0.5, centerDist]} receiveShadow>
              <boxGeometry args={[span, stepH, depth]} />
              <meshStandardMaterial color="#131B2E" roughness={0.9} metalness={0.1} />
            </mesh>
            <mesh position={[0, topY + 0.02, inner + 0.05]}>
              <boxGeometry args={[span, 0.05, 0.08]} />
              <meshBasicMaterial color={trimColor} transparent opacity={0.22} />
            </mesh>

            <mesh position={[-centerDist, topY - stepH * 0.5, 0]} receiveShadow>
              <boxGeometry args={[depth, stepH, inner * 2]} />
              <meshStandardMaterial color="#131B2E" roughness={0.9} metalness={0.1} />
            </mesh>
            <mesh position={[-inner - 0.05, topY + 0.02, 0]}>
              <boxGeometry args={[0.08, 0.05, inner * 2]} />
              <meshBasicMaterial color={trimColor} transparent opacity={0.22} />
            </mesh>

            <mesh position={[centerDist, topY - stepH * 0.5, 0]} receiveShadow>
              <boxGeometry args={[depth, stepH, inner * 2]} />
              <meshStandardMaterial color="#131B2E" roughness={0.9} metalness={0.1} />
            </mesh>
            <mesh position={[inner + 0.05, topY + 0.02, 0]}>
              <boxGeometry args={[0.08, 0.05, inner * 2]} />
              <meshBasicMaterial color={trimColor} transparent opacity={0.22} />
            </mesh>
          </group>
        );
      })}

      {/* Overhead Boxing-Ring Stadium Lighting Truss Rig */}
      <group position={[0, 18.8, 0]}>
        {[
          [0, 0, -7.8, 16.0, 0.32, 0.32],
          [0, 0, 7.8, 16.0, 0.32, 0.32],
          [-7.8, 0, 0, 0.32, 0.32, 16.0],
          [7.8, 0, 0, 0.32, 0.32, 16.0],
        ].map(([x, y, z, w, h, d], idx) => (
          <group key={`truss-${idx}`}>
            <mesh position={[x, y, z]}>
              <boxGeometry args={[w, h, d]} />
              <meshStandardMaterial color="#1B2233" roughness={0.5} metalness={0.75} />
            </mesh>
            <mesh position={[x, y - 0.22, z]}>
              <boxGeometry args={[w > 1 ? w * 0.72 : 0.22, 0.08, d > 1 ? d * 0.72 : 0.22]} />
              <meshBasicMaterial color="#FFF3DC" />
            </mesh>
          </group>
        ))}
      </group>

      {/* Atmospheric Boxing Arena Crowd Lights so all cultural fabrics read vividly */}
      <pointLight position={[-13, 11, -13]} intensity={38} distance={38} decay={1.55} color="#B5B2FF" />
      <pointLight position={[13, 11, -13]} intensity={36} distance={38} decay={1.55} color="#A6F0E4" />
      <pointLight position={[0, 12, -16]} intensity={34} distance={36} decay={1.55} color="#FFEBD0" />
      <pointLight position={[-15, 10, 8]} intensity={26} distance={34} decay={1.65} color="#FFD2B0" />
    </group>
  );
};

export const PlayersAndAudience: React.FC<{ activeSceneId: SceneId }> = ({ activeSceneId }) => {
  const scene = useMemo(() => getSceneById(activeSceneId), [activeSceneId]);
  const mode = useGameStore((s) => s.mode);
  const soloOpponent = useGameStore((s) => s.soloOpponent);
  const players = useGameStore((s) => s.players);
  const currentPlayerIndex = useGameStore((s) => s.currentPlayerIndex);
  const turnPhase = useGameStore((s) => s.turnPhase);
  const movesCount = useGameStore((s) => s.movesCount);
  const graphicsQuality = useGameStore((s) => s.settings.graphicsQuality);
  const reducedMotion = useGameStore((s) => s.settings.reducedMotion);

  const moodRef = useRef<CrowdMood>('idle');
  const cheerBoostRef = useRef<number>(0);
  const prevMovesRef = useRef<number>(movesCount);

  useEffect(() => {
    if (movesCount > prevMovesRef.current) {
      cheerBoostRef.current = 1.0;
    }
    prevMovesRef.current = movesCount;
  }, [movesCount]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    if (cheerBoostRef.current > 0) {
      cheerBoostRef.current = Math.max(0, cheerBoostRef.current - dt * 0.38);
    }

    if (turnPhase === 'victory') {
      moodRef.current = 'victory';
    } else if (turnPhase === 'collapsing' || turnPhase === 'gameover') {
      moodRef.current = 'gasp';
    } else if (cheerBoostRef.current > 0.12) {
      moodRef.current = 'cheer';
    } else if (turnPhase === 'dragging' || turnPhase === 'settling') {
      moodRef.current = 'tense';
    } else {
      moodRef.current = 'idle';
    }
  });

  // Realistic 3D Human Players standing INSIDE the boxing ring right next to the Jenga pedestal
  const ringPlayers = useMemo(() => {
    const isMultiPlayerRing =
      mode === 'passAndPlay' ||
      mode === 'live' ||
      (mode === 'solo' && soloOpponent === 'computer');

    const activeContenders = players.filter((p) => !p.eliminated);
    const list = isMultiPlayerRing
      ? activeContenders.length > 0
        ? activeContenders
        : players
      : [
          {
            id: 'solo-p1',
            name: players[0]?.name ?? 'Solo',
            color: players[0]?.color ?? PALETTE.electricAqua,
          },
        ];

    const angleSlots =
      list.length === 1
        ? [-Math.PI * 0.72]
        : list.length === 2
          ? [-Math.PI * 0.72, -Math.PI * 0.2]
          : list.length === 3
            ? [-Math.PI * 0.8, -Math.PI * 0.48, -Math.PI * 0.16]
            : [-Math.PI * 0.84, -Math.PI * 0.58, -Math.PI * 0.32, -Math.PI * 0.08];

    const playerPresets: Array<{
      model: ModelKind;
      culture: CultureStyle;
      skinTint: string;
      outfitTint: string;
      hairColor: string;
      bodyProportions: [number, number, number];
    }> =
      scene.crowd.culturalMix === 'lagos'
        ? [
            {
              model: 'rpm',
              culture: 'african_ankara_peacock',
              skinTint: '#633B24',
              outfitTint: '#FFFFFF',
              hairColor: '#141110',
              bodyProportions: [0.94, 1.0, 0.94],
            },
            {
              model: 'rpm',
              culture: 'african_ankara_crimson',
              skinTint: '#55321E',
              outfitTint: '#FFFFFF',
              hairColor: '#141110',
              bodyProportions: [1.05, 1.04, 1.02],
            },
            {
              model: 'rpm',
              culture: 'african_ankara_sungold',
              skinTint: '#5D3620',
              outfitTint: '#FFFFFF',
              hairColor: '#161210',
              bodyProportions: [0.98, 1.02, 0.97],
            },
            {
              model: 'rpm',
              culture: 'african_ankara_adire',
              skinTint: '#6A3F27',
              outfitTint: '#FFFFFF',
              hairColor: '#141110',
              bodyProportions: [0.95, 1.0, 0.95],
            },
          ]
        : scene.crowd.culturalMix === 'gym'
          ? [
              {
                model: 'rpm',
                culture: 'gym_athletic',
                skinTint: '#6B422C',
                outfitTint: '#2E6E64',
                hairColor: '#151211',
                bodyProportions: [1.04, 1.03, 1.02],
              },
              {
                model: 'rpm',
                culture: 'gym_athletic',
                skinTint: '#CFA07C',
                outfitTint: '#36465C',
                hairColor: '#181412',
                bodyProportions: [0.95, 1.0, 0.95],
              },
              {
                model: 'rpm',
                culture: 'gym_athletic',
                skinTint: '#D4A582',
                outfitTint: '#7A3D34',
                hairColor: '#261C16',
                bodyProportions: [1.06, 1.04, 1.02],
              },
              {
                model: 'rpm',
                culture: 'gym_athletic',
                skinTint: '#E8C1A8',
                outfitTint: '#333A46',
                hairColor: '#3B281E',
                bodyProportions: [0.98, 1.01, 0.98],
              },
            ]
          : [
              {
                model: 'rpm',
                culture: 'african_ankara_peacock',
                skinTint: '#653C25',
                outfitTint: '#FFFFFF',
                hairColor: '#151211',
                bodyProportions: [0.96, 1.0, 0.96],
              },
              {
                model: 'rpm',
                culture: 'western_streetwear',
                skinTint: '#E8C1A8',
                outfitTint: '#355A6E',
                hairColor: '#3B281E',
                bodyProportions: [0.98, 1.0, 0.98],
              },
              {
                model: 'rpm',
                culture: 'african_ankara_crimson',
                skinTint: '#593420',
                outfitTint: '#FFFFFF',
                hairColor: '#151211',
                bodyProportions: [1.05, 1.04, 1.02],
              },
              {
                model: 'rpm',
                culture: 'arabian_shemagh',
                skinTint: '#D4A582',
                outfitTint: '#FFFFFF',
                hairColor: '#1C1714',
                bodyProportions: [1.01, 1.02, 1.0],
              },
            ];

    const activePlayerId = players[currentPlayerIndex]?.id;
    return list.map((p, idx) => {
      const isActive = isMultiPlayerRing ? p.id === activePlayerId : idx === 0;
      const radius = isActive ? 5.95 : 6.45;
      const angle = angleSlots[idx % angleSlots.length];
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const rotationY = Math.atan2(-x, -z);
      const preset = playerPresets[idx % playerPresets.length];

      return {
        id: `ring-player-${p.id}-${scene.crowd.culturalMix}`,
        ...preset,
        position: [x, FLOOR_Y, z] as [number, number, number],
        rotationY,
        isActive,
        accentRingColor: p.color,
        phaseOffset: idx * 1.35,
      };
    });
  }, [mode, soloOpponent, players, currentPlayerIndex, scene.crowd.culturalMix]);

  // Scene-aware foreground rigged spectators (0 for no-audience rooms, 4-6 for quiet spots, up to 14 for packed arena!)
  const ringsideVips = useMemo(() => {
    const { crowd } = scene;
    if (crowd.level === 'none') return [];

    const count =
      graphicsQuality === 'high'
        ? crowd.vipCountHigh
        : graphicsQuality === 'medium'
          ? Math.round((crowd.vipCountHigh + crowd.vipCountLow) * 0.5)
          : crowd.vipCountLow;

    const slots: Array<{
      x: number;
      z: number;
      model: ModelKind;
      culture: CultureStyle;
      skinTint: string;
      outfitTint: string;
      hairColor: string;
      bodyProportions: [number, number, number];
    }> =
      crowd.culturalMix === 'lagos'
        ? [
            { x: -6.8, z: -9.1, model: 'rpm', culture: 'african_ankara_peacock', skinTint: '#633B24', outfitTint: '#FFFFFF', hairColor: '#141110', bodyProportions: [0.93, 1.0, 0.93] },
            { x: -3.6, z: -9.2, model: 'rpm', culture: 'african_ankara_crimson', skinTint: '#54311D', outfitTint: '#FFFFFF', hairColor: '#151211', bodyProportions: [1.06, 1.05, 1.03] },
            { x: 0.4, z: -9.1, model: 'rpm', culture: 'african_ankara_orange', skinTint: '#CFA07C', outfitTint: '#FFFFFF', hairColor: '#2B1F26', bodyProportions: [1.16, 0.96, 1.14] },
            { x: 4.1, z: -9.0, model: 'rpm', culture: 'african_ankara_sungold', skinTint: '#5B3520', outfitTint: '#FFFFFF', hairColor: '#141110', bodyProportions: [0.97, 1.03, 0.96] },
            { x: -9.2, z: -5.4, model: 'rpm', culture: 'african_ankara_adire', skinTint: '#683E26', outfitTint: '#FFFFFF', hairColor: '#141110', bodyProportions: [0.94, 1.0, 0.94] },
            { x: 9.1, z: -5.2, model: 'rpm', culture: 'african_ankara_gele', skinTint: '#74472E', outfitTint: '#F2C14E', hairColor: '#151211', bodyProportions: [1.04, 0.99, 1.04] },
            { x: -9.0, z: -1.4, model: 'rpm', culture: 'african_ankara_peacock', skinTint: '#5D3620', outfitTint: '#FFFFFF', hairColor: '#141110', bodyProportions: [0.95, 1.0, 0.95] },
            { x: 9.2, z: -1.0, model: 'rpm', culture: 'african_dashiki', skinTint: '#603923', outfitTint: '#FFFFFF', hairColor: '#151211', bodyProportions: [1.08, 1.04, 1.04] },
            { x: -9.0, z: 3.1, model: 'rpm', culture: 'african_kente', skinTint: '#7C4F35', outfitTint: '#FFFFFF', hairColor: '#151211', bodyProportions: [1.02, 1.02, 1.02] },
            { x: 9.0, z: 2.8, model: 'rpm', culture: 'african_ankara_crimson', skinTint: '#4F2D1B', outfitTint: '#FFFFFF', hairColor: '#141110', bodyProportions: [1.04, 1.04, 1.02] },
            { x: -5.5, z: 9.0, model: 'rpm', culture: 'african_ankara_adire', skinTint: '#6B4028', outfitTint: '#FFFFFF', hairColor: '#141110', bodyProportions: [0.95, 1.0, 0.95] },
            { x: 1.5, z: -9.3, model: 'rpm', culture: 'african_ankara_sungold', skinTint: '#593420', outfitTint: '#FFFFFF', hairColor: '#161210', bodyProportions: [1.0, 1.02, 0.99] },
          ]
        : crowd.culturalMix === 'gym'
          ? [
              { x: -5.6, z: -8.9, model: 'rpm', culture: 'gym_athletic', skinTint: '#653C25', outfitTint: '#365A52', hairColor: '#151211', bodyProportions: [1.06, 1.04, 1.03] },
              { x: -1.4, z: -9.2, model: 'rpm', culture: 'gym_athletic', skinTint: '#CFA07C', outfitTint: '#3A465C', hairColor: '#241B16', bodyProportions: [0.95, 1.0, 0.95] },
              { x: 3.2, z: -9.0, model: 'rpm', culture: 'gym_athletic', skinTint: '#D4A582', outfitTint: '#2E3440', hairColor: '#261C16', bodyProportions: [1.04, 1.02, 1.02] },
              { x: -8.9, z: -4.2, model: 'rpm', culture: 'gym_athletic', skinTint: '#EBC6AD', outfitTint: '#7C4036', hairColor: '#4B3222', bodyProportions: [0.94, 1.01, 0.94] },
              { x: 8.8, z: -4.4, model: 'rpm', culture: 'gym_athletic', skinTint: '#5D3621', outfitTint: '#48556E', hairColor: '#141110', bodyProportions: [1.08, 1.05, 1.04] },
              { x: -8.7, z: 1.8, model: 'rpm', culture: 'gym_athletic', skinTint: '#C89874', outfitTint: '#4E4B63', hairColor: '#1C1714', bodyProportions: [1.01, 0.98, 1.02] },
            ]
          : crowd.culturalMix === 'casual-indoor'
            ? [
                { x: -5.6, z: -8.9, model: 'rpm', culture: 'western_streetwear', skinTint: '#EBC6AD', outfitTint: '#2F7A78', hairColor: '#3B281E', bodyProportions: [0.96, 1.0, 0.96] },
                { x: -1.4, z: -9.2, model: 'rpm', culture: 'western_streetwear', skinTint: '#D8AD8A', outfitTint: '#5C3C4A', hairColor: '#241B16', bodyProportions: [0.96, 1.0, 0.96] },
                { x: 3.2, z: -9.0, model: 'rpm', culture: 'western_blazer', skinTint: '#7C4F35', outfitTint: '#263B5E', hairColor: '#181412', bodyProportions: [1.05, 1.03, 1.03] },
                { x: -8.9, z: -4.2, model: 'rpm', culture: 'western_streetwear', skinTint: '#D8AD8A', outfitTint: '#4A558A', hairColor: '#1C1714', bodyProportions: [1.02, 1.01, 1.02] },
                { x: 8.8, z: -4.4, model: 'rpm', culture: 'western_blazer', skinTint: '#F2D4C0', outfitTint: '#2E473B', hairColor: '#6B482C', bodyProportions: [0.95, 0.99, 0.95] },
                { x: -8.7, z: 1.8, model: 'rpm', culture: 'african_ankara_peacock', skinTint: '#653C25', outfitTint: '#FFFFFF', hairColor: '#141110', bodyProportions: [1.01, 1.02, 1.0] },
              ]
            : [
                { x: -6.8, z: -9.1, model: 'rpm', culture: 'african_ankara_peacock', skinTint: '#653C25', outfitTint: '#FFFFFF', hairColor: '#141110', bodyProportions: [0.94, 1.0, 0.94] },
                { x: -4.2, z: -9.0, model: 'rpm', culture: 'arabian_shemagh', skinTint: '#D4A582', outfitTint: '#FFFFFF', hairColor: '#1C1714', bodyProportions: [1.02, 1.03, 1.01] },
                { x: -1.5, z: -9.15, model: 'rpm', culture: 'western_streetwear', skinTint: '#E8C1A8', outfitTint: '#36588F', hairColor: '#4B3222', bodyProportions: [0.97, 1.0, 0.97] },
                { x: 1.3, z: -9.0, model: 'rpm', culture: 'african_ankara_crimson', skinTint: '#57331E', outfitTint: '#FFFFFF', hairColor: '#141110', bodyProportions: [1.06, 1.04, 1.03] },
                { x: 4.0, z: -9.1, model: 'rpm', culture: 'western_blazer', skinTint: '#EBC6AD', outfitTint: '#5B2333', hairColor: '#5C3C24', bodyProportions: [0.98, 1.01, 0.98] },
                { x: 6.6, z: -9.0, model: 'rpm', culture: 'arabian_hijab', skinTint: '#D8AD8A', outfitTint: '#E5D3B3', hairColor: '#1A1614', bodyProportions: [0.95, 0.98, 0.96] },
                { x: -9.1, z: -6.2, model: 'rpm', culture: 'african_ankara_orange', skinTint: '#CFA07C', outfitTint: '#FFFFFF', hairColor: '#2B1F26', bodyProportions: [1.14, 0.96, 1.13] },
                { x: -9.0, z: -3.2, model: 'rpm', culture: 'western_streetwear', skinTint: '#F2D4C0', outfitTint: '#36588F', hairColor: '#8B683E', bodyProportions: [1.03, 1.02, 1.01] },
                { x: -9.15, z: 0.2, model: 'rpm', culture: 'african_ankara_sungold', skinTint: '#5D3621', outfitTint: '#FFFFFF', hairColor: '#141110', bodyProportions: [0.98, 1.03, 0.97] },
                { x: -9.0, z: 3.6, model: 'rpm', culture: 'african_ankara_adire', skinTint: '#6B4028', outfitTint: '#FFFFFF', hairColor: '#141110', bodyProportions: [0.95, 1.0, 0.95] },
                { x: 9.1, z: -6.0, model: 'rpm', culture: 'arabian_ghutra_bisht', skinTint: '#CFA07C', outfitTint: '#FFFFFF', hairColor: '#1C1714', bodyProportions: [1.04, 1.03, 1.02] },
                { x: 9.0, z: -2.8, model: 'rpm', culture: 'african_kente', skinTint: '#764B32', outfitTint: '#FFFFFF', hairColor: '#181412', bodyProportions: [1.05, 1.02, 1.03] },
                { x: 9.15, z: 0.5, model: 'rpm', culture: 'western_blazer', skinTint: '#E5BFA4', outfitTint: '#2E4F45', hairColor: '#2B221D', bodyProportions: [0.97, 1.0, 0.97] },
                { x: -5.5, z: 9.1, model: 'rpm', culture: 'african_ankara_gele', skinTint: '#6E442D', outfitTint: '#64E5D2', hairColor: '#181412', bodyProportions: [1.02, 0.99, 1.02] },
              ];

    return slots.slice(0, count).map((s, i) => ({
      id: `vip-fan-${activeSceneId}-${i}`,
      model: s.model,
      culture: s.culture,
      skinTint: s.skinTint,
      outfitTint: s.outfitTint,
      hairColor: s.hairColor,
      bodyProportions: s.bodyProportions,
      position: [s.x, FLOOR_Y, s.z] as [number, number, number],
      rotationY: Math.atan2(-s.x, -s.z),
      phaseOffset: i * 0.9,
      scaleMultiplier: 0.96 + (i % 3) * 0.03,
    }));
  }, [graphicsQuality, scene, activeSceneId]);

  return (
    <group>
      {/* Preserve iconic Boxing Ring Arena structure exclusively for the Boxing Ring scene */}
      {activeSceneId === 'boxing-ring' && <BoxingRingArena />}

      {/* Realistic 3D Human Players standing around the Jenga Pedestal */}
      {ringPlayers.map((p) => (
        <RiggedRealisticHuman
          key={p.id}
          model={p.model}
          culture={p.culture}
          skinTint={p.skinTint}
          outfitTint={p.outfitTint}
          hairColor={p.hairColor}
          bodyProportions={p.bodyProportions}
          position={p.position}
          rotationY={p.rotationY}
          scaleMultiplier={p.isActive ? 1.03 : 0.99}
          accentRingColor={p.accentRingColor}
          isActivePlayer={p.isActive}
          phaseOffset={p.phaseOffset}
          moodRef={moodRef}
          cheerBoostRef={cheerBoostRef}
          reducedMotion={reducedMotion}
        />
      ))}

      {/* Environment-Appropriate Animated Foreground Spectators (empty when scene has no audience!) */}
      {ringsideVips.map((vip) => (
        <RiggedRealisticHuman
          key={vip.id}
          model={vip.model}
          culture={vip.culture}
          skinTint={vip.skinTint}
          outfitTint={vip.outfitTint}
          hairColor={vip.hairColor}
          bodyProportions={vip.bodyProportions}
          position={vip.position}
          rotationY={vip.rotationY}
          scaleMultiplier={vip.scaleMultiplier}
          phaseOffset={vip.phaseOffset}
          moodRef={moodRef}
          cheerBoostRef={cheerBoostRef}
          reducedMotion={reducedMotion}
        />
      ))}

      {/* Scene-Aware Instanced Crowd (disabled automatically for few/none audience locations) */}
      <PackedBoxingCrowd
        crowdConfig={scene.crowd}
        moodRef={moodRef}
        cheerBoostRef={cheerBoostRef}
        reducedMotion={reducedMotion}
        graphicsQuality={graphicsQuality}
      />

      {/* Fight-Night Arena Camera Flashes (Boxing Ring only) */}
      {scene.crowd.cameraFlashes && (
        <ArenaCameraFlashes
          moodRef={moodRef}
          cheerBoostRef={cheerBoostRef}
          reducedMotion={reducedMotion}
        />
      )}
    </group>
  );
};
