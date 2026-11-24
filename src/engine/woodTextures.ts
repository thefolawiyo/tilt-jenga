import * as THREE from 'three';
import { WOOD_VARIANTS } from './constants';

export interface WoodMaterialSet {
  material: THREE.MeshStandardMaterial;
  albedo: THREE.CanvasTexture;
  bump: THREE.CanvasTexture;
}

// Smooth value noise for organic wood grain
function hash2D(x: number, y: number, seed: number): number {
  let n = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453123;
  return n - Math.floor(n);
}

function smoothNoise(x: number, y: number, seed: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);

  const a = hash2D(ix, iy, seed);
  const b = hash2D(ix + 1, iy, seed);
  const c = hash2D(ix, iy + 1, seed);
  const d = hash2D(ix + 1, iy + 1, seed);

  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

function fbm(x: number, y: number, seed: number): number {
  let v = 0;
  let amp = 0.5;
  let freq = 1;
  for (let i = 0; i < 4; i++) {
    v += amp * smoothNoise(x * freq, y * freq, seed + i * 19.3);
    freq *= 2.05;
    amp *= 0.5;
  }
  return v;
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const n = parseInt(clean, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function createWoodTextures(variantId: number): {
  albedo: THREE.CanvasTexture;
  bump: THREE.CanvasTexture;
} {
  const variant = WOOD_VARIANTS[variantId] ?? WOOD_VARIANTS[0];
  const width = 512;
  const height = 256;

  const albedoCanvas = document.createElement('canvas');
  albedoCanvas.width = width;
  albedoCanvas.height = height;
  const aCtx = albedoCanvas.getContext('2d')!;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = width;
  bumpCanvas.height = height;
  const bCtx = bumpCanvas.getContext('2d')!;

  const albedoData = aCtx.createImageData(width, height);
  const bumpData = bCtx.createImageData(width, height);

  const baseRgb = hexToRgb(variant.baseHex);
  const grainRgb = hexToRgb(variant.grainHex);
  const seed = (variantId + 1) * 13.7;

  // Optional subtle wood knot position
  const knotX = 0.25 + (variantId * 0.17) % 0.55;
  const knotY = 0.3 + (variantId * 0.23) % 0.4;

  for (let y = 0; y < height; y++) {
    const ny = y / height;
    for (let x = 0; x < width; x++) {
      const nx = x / width;

      // Elongated wood rings along X (length of Jenga block)
      const dx = (nx - knotX) * 2.2;
      const dy = (ny - knotY) * 6.5;
      const distKnot = Math.sqrt(dx * dx + dy * dy);
      const knotWarp = Math.exp(-distKnot * 3.8) * 1.1;

      const turbulence = fbm(nx * 3.2, ny * 11.5, seed) * 2.3;
      const ringVal = Math.sin((ny * 20.0 + turbulence + knotWarp) * Math.PI);
      const ring = 0.5 + 0.5 * ringVal;
      const sharpenedRing = Math.pow(ring, 1.85);

      // Fine longitudinal pores / fibers
      const fineFiber = smoothNoise(nx * 18, ny * 120, seed + 55) * 0.18;
      const microPore = hash2D(x * 0.6, y * 1.4, seed + 99) > 0.94 ? -0.1 : 0;

      // Subtle edge darkening for tactile milled wood feel
      const edgeVignette = Math.min(1, Math.min(ny, 1 - ny) * 18) * 0.06;

      const t = Math.max(0, Math.min(1, sharpenedRing * 0.72 + fineFiber - edgeVignette));

      const r = Math.max(0, Math.min(255, baseRgb[0] * (1 - t) + grainRgb[0] * t + microPore * 45));
      const g = Math.max(0, Math.min(255, baseRgb[1] * (1 - t) + grainRgb[1] * t + microPore * 40));
      const b = Math.max(0, Math.min(255, baseRgb[2] * (1 - t) + grainRgb[2] * t + microPore * 35));

      const idx = (y * width + x) * 4;
      albedoData.data[idx] = r;
      albedoData.data[idx + 1] = g;
      albedoData.data[idx + 2] = b;
      albedoData.data[idx + 3] = 255;

      const bumpVal = Math.max(
        0,
        Math.min(255, Math.round((0.55 + (1 - sharpenedRing) * 0.25 + fineFiber * 0.4 + microPore) * 255))
      );
      bumpData.data[idx] = bumpVal;
      bumpData.data[idx + 1] = bumpVal;
      bumpData.data[idx + 2] = bumpVal;
      bumpData.data[idx + 3] = 255;
    }
  }

  aCtx.putImageData(albedoData, 0, 0);
  bCtx.putImageData(bumpData, 0, 0);

  const albedo = new THREE.CanvasTexture(albedoCanvas);
  albedo.colorSpace = THREE.SRGBColorSpace;
  albedo.wrapS = THREE.RepeatWrapping;
  albedo.wrapT = THREE.RepeatWrapping;
  albedo.anisotropy = 8;

  const bump = new THREE.CanvasTexture(bumpCanvas);
  bump.wrapS = THREE.RepeatWrapping;
  bump.wrapT = THREE.RepeatWrapping;
  bump.anisotropy = 4;

  return { albedo, bump };
}

let cachedMaterials: WoodMaterialSet[] | null = null;

export function getWoodMaterialSets(): WoodMaterialSet[] {
  if (cachedMaterials) return cachedMaterials;

  cachedMaterials = WOOD_VARIANTS.map((variant) => {
    const { albedo, bump } = createWoodTextures(variant.id);
    const material = new THREE.MeshStandardMaterial({
      map: albedo,
      bumpMap: bump,
      bumpScale: 0.018,
      roughness: variant.roughness,
      metalness: 0.04,
      envMapIntensity: 0.65,
    });
    return { material, albedo, bump };
  });

  return cachedMaterials;
}

export function disposeWoodMaterials() {
  if (!cachedMaterials) return;
  for (const set of cachedMaterials) {
    set.material.dispose();
    set.albedo.dispose();
    set.bump.dispose();
  }
  cachedMaterials = null;
}

/**
 * Subtle matte architectural stone/slate texture for the studio pedestal top
 */
export function createPedestalTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#182034';
  ctx.fillRect(0, 0, size, size);

  // Radial architectural sheen
  const grad = ctx.createRadialGradient(size / 2, size / 2, 16, size / 2, size / 2, size / 2);
  grad.addColorStop(0, '#242F49');
  grad.addColorStop(0.58, '#1B243A');
  grad.addColorStop(1, '#131A2C');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Subtle mineral speckles
  for (let i = 0; i < 6500; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const alpha = Math.random() * 0.05;
    ctx.fillStyle = Math.random() > 0.5 ? `rgba(244,240,232,${alpha})` : `rgba(10,14,24,${alpha * 1.4})`;
    ctx.fillRect(x, y, 1.5, 1.5);
  }

  // Fine concentric calibration hairlines (architectural game board aesthetic)
  ctx.strokeStyle = 'rgba(100, 229, 210, 0.11)';
  ctx.lineWidth = 1.25;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size * 0.34, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(244, 240, 232, 0.06)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size * 0.44, 0, Math.PI * 2);
  ctx.stroke();

  // Subtle square registration corners for tower base alignment
  const halfSq = size * 0.155;
  const corner = 16;
  const cx = size / 2;
  const cy = size / 2;
  ctx.strokeStyle = 'rgba(100, 229, 210, 0.24)';
  ctx.lineWidth = 2;
  const corners = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ];
  for (const [sx, sy] of corners) {
    ctx.beginPath();
    ctx.moveTo(cx + sx * halfSq, cy + sy * (halfSq - corner));
    ctx.lineTo(cx + sx * halfSq, cy + sy * halfSq);
    ctx.lineTo(cx + sx * (halfSq - corner), cy + sy * halfSq);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}
