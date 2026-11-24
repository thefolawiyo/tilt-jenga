import * as THREE from 'three';

export interface PbrMapSet {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
}

export interface EnvironmentPbrLibrary {
  cobblestone: PbrMapSet;
  parisStone: PbrMapSet;
  gymRubber: PbrMapSet;
  boardConcrete: PbrMapSet;
  cedarSlats: PbrMapSet;
  oakPlanks: PbrMapSet;
  asphalt: PbrMapSet;
  lagosPlaster: PbrMapSet;
  corrugatedZinc: PbrMapSet;
  warmBrick: PbrMapSet;
  parkGrass: PbrMapSet;
  wovenRug: PbrMapSet;
  bark: PbrMapSet;
}

function makeCanvas(w = 512, h = 512): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!];
}

function seededRand(seedInit: number) {
  let s = seedInit;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function toTex(
  canvas: HTMLCanvasElement,
  repeatX: number,
  repeatY: number,
  isColor: boolean
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = 8;
  return tex;
}

/** 1. Weathered Parisian Belgian-Block Cobblestones (Ref 1 inspired) */
function buildCobblestone(): PbrMapSet {
  const S = 512;
  const [cA, ctxA] = makeCanvas(S, S);
  const [cB, ctxB] = makeCanvas(S, S);
  const rand = seededRand(101);

  ctxA.fillStyle = '#534D45'; // Dusty mortar crevices
  ctxA.fillRect(0, 0, S, S);
  ctxB.fillStyle = '#1C1C1C';
  ctxB.fillRect(0, 0, S, S);

  const rows = 14;
  const rowH = S / rows;
  for (let r = 0; r < rows; r++) {
    const y = r * rowH;
    const offset = (r % 2) * 22;
    let x = -offset;
    while (x < S + 40) {
      const w = 34 + rand() * 20;
      const h = rowH - 5;
      const tone = 118 + Math.floor((rand() - 0.5) * 44);
      const warm = Math.floor((rand() - 0.3) * 18);
      ctxA.fillStyle = `rgb(${tone + warm}, ${tone + Math.floor(warm * 0.65)}, ${tone - 6})`;
      ctxA.beginPath();
      ctxA.roundRect(x + 2.5, y + 2.5, w - 5, h, 4);
      ctxA.fill();

      // Subtle top-left sunlight wear specular catch on stone face
      ctxA.fillStyle = `rgba(255,248,235,${0.05 + rand() * 0.08})`;
      ctxA.fillRect(x + 5, y + 4, w - 12, 4);

      const bVal = 170 + Math.floor(rand() * 75);
      ctxB.fillStyle = `rgb(${bVal},${bVal},${bVal})`;
      ctxB.beginPath();
      ctxB.roundRect(x + 3, y + 3, w - 6, h - 1, 4);
      ctxB.fill();

      x += w;
    }
  }

  // Fine gritty surface grain
  for (let i = 0; i < 3200; i++) {
    const gx = rand() * S;
    const gy = rand() * S;
    ctxA.fillStyle = rand() > 0.5 ? 'rgba(255,250,240,0.05)' : 'rgba(25,20,16,0.08)';
    ctxA.fillRect(gx, gy, 2, 2);
  }

  return { map: toTex(cA, 9, 9, true), bumpMap: toTex(cB, 9, 9, false) };
}

/** 2. Parisian Ashlar Limestone Facade Masonry (Ref 1 inspired) */
function buildParisStone(): PbrMapSet {
  const S = 512;
  const [cA, ctxA] = makeCanvas(S, S);
  const [cB, ctxB] = makeCanvas(S, S);
  const rand = seededRand(202);

  ctxA.fillStyle = '#73685B';
  ctxA.fillRect(0, 0, S, S);
  ctxB.fillStyle = '#303030';
  ctxB.fillRect(0, 0, S, S);

  const rows = 8;
  const rowH = S / rows;
  for (let r = 0; r < rows; r++) {
    const y = r * rowH;
    const cols = 4;
    const colW = S / cols;
    const shift = (r % 2) * (colW * 0.5);
    for (let c = -1; c <= cols; c++) {
      const x = c * colW + shift;
      const base = 176 + Math.floor((rand() - 0.5) * 26);
      ctxA.fillStyle = `rgb(${base + 12}, ${base + 2}, ${base - 14})`;
      ctxA.fillRect(x + 2, y + 2, colW - 4, rowH - 4);

      const bv = 190 + Math.floor((rand() - 0.5) * 40);
      ctxB.fillStyle = `rgb(${bv},${bv},${bv})`;
      ctxB.fillRect(x + 3, y + 3, colW - 6, rowH - 6);
    }
  }

  // Subtle vertical rain patina streaks
  for (let i = 0; i < 65; i++) {
    const sx = rand() * S;
    const sh = 60 + rand() * 220;
    const grad = ctxA.createLinearGradient(sx, 0, sx, sh);
    grad.addColorStop(0, 'rgba(42,36,30,0.16)');
    grad.addColorStop(1, 'rgba(42,36,30,0)');
    ctxA.fillStyle = grad;
    ctxA.fillRect(sx, rand() * (S - sh), 3 + rand() * 6, sh);
  }

  return { map: toTex(cA, 3, 2, true), bumpMap: toTex(cB, 3, 2, false) };
}

/** 3. Speckled Vulcanized Athletic Gym Rubber Flooring (Ref 2 inspired) */
function buildGymRubber(): PbrMapSet {
  const S = 512;
  const [cA, ctxA] = makeCanvas(S, S);
  const [cB, ctxB] = makeCanvas(S, S);
  const rand = seededRand(303);

  ctxA.fillStyle = '#252930';
  ctxA.fillRect(0, 0, S, S);
  ctxB.fillStyle = '#7A7A7A';
  ctxB.fillRect(0, 0, S, S);

  // Subtle square rubber tile seams
  ctxA.strokeStyle = 'rgba(10,12,16,0.45)';
  ctxA.lineWidth = 2;
  ctxA.strokeRect(1, 1, S - 2, S - 2);
  ctxA.beginPath();
  ctxA.moveTo(S / 2, 0);
  ctxA.lineTo(S / 2, S);
  ctxA.moveTo(0, S / 2);
  ctxA.lineTo(S, S / 2);
  ctxA.stroke();

  // Dense fine rubber speckles (warm gray, soft white, subtle charcoal)
  for (let i = 0; i < 9500; i++) {
    const x = rand() * S;
    const y = rand() * S;
    const sz = 1 + rand() * 1.8;
    const roll = rand();
    ctxA.fillStyle =
      roll > 0.92
        ? 'rgba(205,212,222,0.28)'
        : roll > 0.65
          ? 'rgba(130,138,150,0.2)'
          : 'rgba(14,16,20,0.35)';
    ctxA.fillRect(x, y, sz, sz);

    const bv = roll > 0.5 ? 165 : 95;
    ctxB.fillStyle = `rgb(${bv},${bv},${bv})`;
    ctxB.fillRect(x, y, sz, sz);
  }

  return { map: toTex(cA, 8, 8, true), bumpMap: toTex(cB, 8, 8, false) };
}

/** 4. Architectural Board-Formed Raw Concrete (Ref 2 pillars & modern walls) */
function buildBoardConcrete(): PbrMapSet {
  const S = 512;
  const [cA, ctxA] = makeCanvas(S, S);
  const [cB, ctxB] = makeCanvas(S, S);
  const rand = seededRand(404);

  ctxA.fillStyle = '#7E7F7C';
  ctxA.fillRect(0, 0, S, S);
  ctxB.fillStyle = '#888888';
  ctxB.fillRect(0, 0, S, S);

  const boards = 8;
  const bh = S / boards;
  for (let i = 0; i < boards; i++) {
    const y = i * bh;
    const v = 122 + Math.floor((rand() - 0.5) * 20);
    ctxA.fillStyle = `rgb(${v + 2}, ${v + 1}, ${v - 2})`;
    ctxA.fillRect(0, y + 1, S, bh - 2);
    ctxA.fillStyle = 'rgba(38,40,42,0.45)';
    ctxA.fillRect(0, y, S, 2);

    ctxB.fillStyle = '#383838';
    ctxB.fillRect(0, y, S, 3);
    ctxB.fillStyle = `rgb(${140 + Math.floor(rand() * 40)},${140 + Math.floor(rand() * 40)},${140 + Math.floor(rand() * 40)})`;
    ctxB.fillRect(0, y + 3, S, bh - 3);
  }

  // Mineral pores & tie-rod dimples
  for (let i = 0; i < 4000; i++) {
    const x = rand() * S;
    const y = rand() * S;
    ctxA.fillStyle = rand() > 0.5 ? 'rgba(235,235,230,0.06)' : 'rgba(35,36,38,0.09)';
    ctxA.fillRect(x, y, 2, 2);
  }
  [128, 384].forEach((tx) => {
    [128, 384].forEach((ty) => {
      ctxA.fillStyle = 'rgba(42,44,46,0.6)';
      ctxA.beginPath();
      ctxA.arc(tx, ty, 5, 0, Math.PI * 2);
      ctxA.fill();
    });
  });

  return { map: toTex(cA, 2, 2, true), bumpMap: toTex(cB, 2, 2, false) };
}

/** 5. Warm Architectural Slatted Cedar Timber Baffles (Ref 2 ceiling & Park deck) */
function buildCedarSlats(): PbrMapSet {
  const S = 512;
  const [cA, ctxA] = makeCanvas(S, S);
  const [cB, ctxB] = makeCanvas(S, S);
  const rand = seededRand(505);

  ctxA.fillStyle = '#1A130E'; // Dark acoustic shadow gap
  ctxA.fillRect(0, 0, S, S);
  ctxB.fillStyle = '#101010';
  ctxB.fillRect(0, 0, S, S);

  const slats = 16;
  const sw = S / slats;
  for (let i = 0; i < slats; i++) {
    const x = i * sw;
    const r = 178 + Math.floor((rand() - 0.5) * 28);
    const g = 114 + Math.floor((rand() - 0.5) * 20);
    const b = 60 + Math.floor((rand() - 0.5) * 14);
    ctxA.fillStyle = `rgb(${r},${g},${b})`;
    ctxA.fillRect(x + 3, 0, sw - 6, S);

    // Longitudinal grain fibers
    for (let f = 0; f < 10; f++) {
      ctxA.fillStyle = f % 2 === 0 ? 'rgba(70,38,16,0.14)' : 'rgba(255,222,178,0.12)';
      ctxA.fillRect(x + 4 + rand() * (sw - 9), 0, 1.5, S);
    }

    ctxB.fillStyle = '#EAEAEA';
    ctxB.fillRect(x + 3, 0, sw - 6, S);
  }

  return { map: toTex(cA, 4, 4, true), bumpMap: toTex(cB, 4, 4, false) };
}

/** 6. Natural Light Oak Plank Flooring (Gym weight inlay, Office, Living Room) */
function buildOakPlanks(): PbrMapSet {
  const S = 512;
  const [cA, ctxA] = makeCanvas(S, S);
  const [cB, ctxB] = makeCanvas(S, S);
  const rand = seededRand(606);

  ctxA.fillStyle = '#4B3624';
  ctxA.fillRect(0, 0, S, S);
  ctxB.fillStyle = '#303030';
  ctxB.fillRect(0, 0, S, S);

  const rows = 8;
  const rh = S / rows;
  for (let r = 0; r < rows; r++) {
    const y = r * rh;
    const split = 120 + rand() * 260;
    const segs = [
      [0, split],
      [split, S - split],
    ];
    for (const [sx, sw] of segs) {
      const baseR = 166 + Math.floor((rand() - 0.5) * 24);
      const baseG = 126 + Math.floor((rand() - 0.5) * 20);
      const baseB = 84 + Math.floor((rand() - 0.5) * 16);
      ctxA.fillStyle = `rgb(${baseR},${baseG},${baseB})`;
      ctxA.fillRect(sx + 1.5, y + 1.5, sw - 3, rh - 3);

      for (let g = 0; g < 18; g++) {
        ctxA.fillStyle = g % 2 === 0 ? 'rgba(82,52,26,0.1)' : 'rgba(255,238,210,0.08)';
        ctxA.fillRect(sx + 2, y + 3 + rand() * (rh - 6), sw - 4, 1.8);
      }

      ctxB.fillStyle = '#DCDCDC';
      ctxB.fillRect(sx + 2, y + 2, sw - 4, rh - 4);
    }
  }

  return { map: toTex(cA, 6, 6, true), bumpMap: toTex(cB, 6, 6, false) };
}

/** 7. Coarse Aggregate Urban Asphalt (Lagos Island Street) */
function buildAsphalt(): PbrMapSet {
  const S = 512;
  const [cA, ctxA] = makeCanvas(S, S);
  const [cB, ctxB] = makeCanvas(S, S);
  const rand = seededRand(707);

  ctxA.fillStyle = '#252830';
  ctxA.fillRect(0, 0, S, S);
  ctxB.fillStyle = '#787878';
  ctxB.fillRect(0, 0, S, S);

  // Subtle pale tire-wear tracks
  ctxA.fillStyle = 'rgba(130,136,148,0.07)';
  ctxA.fillRect(0, 90, S, 85);
  ctxA.fillRect(0, 330, S, 85);

  for (let i = 0; i < 12000; i++) {
    const x = rand() * S;
    const y = rand() * S;
    const sz = 1 + rand() * 2.2;
    const r = rand();
    ctxA.fillStyle =
      r > 0.85
        ? 'rgba(155,152,146,0.22)'
        : r > 0.45
          ? 'rgba(65,70,80,0.28)'
          : 'rgba(14,16,20,0.38)';
    ctxA.fillRect(x, y, sz, sz);

    const bv = r > 0.5 ? 180 : 70;
    ctxB.fillStyle = `rgb(${bv},${bv},${bv})`;
    ctxB.fillRect(x, y, sz, sz);
  }

  return { map: toTex(cA, 10, 4, true), bumpMap: toTex(cB, 10, 4, false) };
}

/** 8. Sun-Baked Lagos Stucco Plaster (Lagos Market & Island facades) */
function buildLagosPlaster(): PbrMapSet {
  const S = 512;
  const [cA, ctxA] = makeCanvas(S, S);
  const [cB, ctxB] = makeCanvas(S, S);
  const rand = seededRand(808);

  ctxA.fillStyle = '#D5C3AD';
  ctxA.fillRect(0, 0, S, S);
  ctxB.fillStyle = '#8A8A8A';
  ctxB.fillRect(0, 0, S, S);

  // Warm mottled stucco clouds + subtle tropical weather streaks
  for (let i = 0; i < 240; i++) {
    const x = rand() * S;
    const y = rand() * S;
    const rad = 18 + rand() * 52;
    ctxA.fillStyle = rand() > 0.5 ? 'rgba(255,244,228,0.08)' : 'rgba(92,68,46,0.08)';
    ctxA.beginPath();
    ctxA.arc(x, y, rad, 0, Math.PI * 2);
    ctxA.fill();
  }
  for (let i = 0; i < 4500; i++) {
    const x = rand() * S;
    const y = rand() * S;
    const bv = 105 + Math.floor(rand() * 75);
    ctxB.fillStyle = `rgb(${bv},${bv},${bv})`;
    ctxB.fillRect(x, y, 2.5, 2.5);
  }

  return { map: toTex(cA, 2, 2, true), bumpMap: toTex(cB, 2, 2, false) };
}

/** 9. Corrugated Galvanized Zinc / Painted Iron Roofing (Lagos Market stalls) */
function buildCorrugatedZinc(): PbrMapSet {
  const S = 512;
  const [cA, ctxA] = makeCanvas(S, S);
  const [cB, ctxB] = makeCanvas(S, S);
  const rand = seededRand(909);

  const ribs = 24;
  const rw = S / ribs;
  for (let i = 0; i < ribs; i++) {
    const x = i * rw;
    const gradA = ctxA.createLinearGradient(x, 0, x + rw, 0);
    gradA.addColorStop(0, '#6E747B');
    gradA.addColorStop(0.45, '#AEB6BE');
    gradA.addColorStop(1, '#585E65');
    ctxA.fillStyle = gradA;
    ctxA.fillRect(x, 0, rw + 1, S);

    const gradB = ctxB.createLinearGradient(x, 0, x + rw, 0);
    gradB.addColorStop(0, '#222222');
    gradB.addColorStop(0.5, '#F0F0F0');
    gradB.addColorStop(1, '#222222');
    ctxB.fillStyle = gradB;
    ctxB.fillRect(x, 0, rw + 1, S);
  }

  // Subtle warm rust patina spots
  for (let i = 0; i < 85; i++) {
    ctxA.fillStyle = 'rgba(138,76,42,0.14)';
    ctxA.beginPath();
    ctxA.arc(rand() * S, rand() * S, 8 + rand() * 24, 0, Math.PI * 2);
    ctxA.fill();
  }

  return { map: toTex(cA, 2, 2, true), bumpMap: toTex(cB, 2, 2, false) };
}

/** 10. Aged Exposed Red-Brown Masonry Brick (Neighbourhood Bar & Paris Side Facade) */
function buildWarmBrick(): PbrMapSet {
  const S = 512;
  const [cA, ctxA] = makeCanvas(S, S);
  const [cB, ctxB] = makeCanvas(S, S);
  const rand = seededRand(1010);

  ctxA.fillStyle = '#524943';
  ctxA.fillRect(0, 0, S, S);
  ctxB.fillStyle = '#222222';
  ctxB.fillRect(0, 0, S, S);

  const rows = 16;
  const rh = S / rows;
  const cols = 8;
  const cw = S / cols;
  for (let r = 0; r < rows; r++) {
    const y = r * rh;
    const shift = (r % 2) * (cw * 0.5);
    for (let c = -1; c <= cols; c++) {
      const x = c * cw + shift;
      const rv = 112 + Math.floor((rand() - 0.5) * 42);
      const gv = 62 + Math.floor((rand() - 0.5) * 24);
      const bv = 48 + Math.floor((rand() - 0.5) * 20);
      ctxA.fillStyle = `rgb(${rv},${gv},${bv})`;
      ctxA.fillRect(x + 2, y + 2, cw - 4, rh - 4);

      const bump = 185 + Math.floor((rand() - 0.5) * 50);
      ctxB.fillStyle = `rgb(${bump},${bump},${bump})`;
      ctxB.fillRect(x + 2.5, y + 2.5, cw - 5, rh - 5);
    }
  }

  return { map: toTex(cA, 4, 3, true), bumpMap: toTex(cB, 4, 3, false) };
}

/** 11. Natural Sun-Dappled Meadow Grass (Public Park) */
function buildParkGrass(): PbrMapSet {
  const S = 512;
  const [cA, ctxA] = makeCanvas(S, S);
  const [cB, ctxB] = makeCanvas(S, S);
  const rand = seededRand(1111);

  ctxA.fillStyle = '#4B6B3B';
  ctxA.fillRect(0, 0, S, S);
  ctxB.fillStyle = '#707070';
  ctxB.fillRect(0, 0, S, S);

  // Soft natural patches of sun-warmed olive and deep shaded moss
  for (let i = 0; i < 160; i++) {
    ctxA.fillStyle = rand() > 0.5 ? 'rgba(116,142,74,0.16)' : 'rgba(42,68,34,0.18)';
    ctxA.beginPath();
    ctxA.arc(rand() * S, rand() * S, 16 + rand() * 44, 0, Math.PI * 2);
    ctxA.fill();
  }
  // Fine grass blades
  for (let i = 0; i < 9000; i++) {
    const x = rand() * S;
    const y = rand() * S;
    ctxA.fillStyle = rand() > 0.45 ? 'rgba(138,168,86,0.28)' : 'rgba(34,54,28,0.32)';
    ctxA.fillRect(x, y, 1.5, 4 + rand() * 4);

    const bv = rand() > 0.5 ? 185 : 85;
    ctxB.fillStyle = `rgb(${bv},${bv},${bv})`;
    ctxB.fillRect(x, y, 2, 4);
  }

  return { map: toTex(cA, 12, 12, true), bumpMap: toTex(cB, 12, 12, false) };
}

/** 12. Woven Geometric Area Rug (Living Room) */
function buildWovenRug(): PbrMapSet {
  const S = 512;
  const [cA, ctxA] = makeCanvas(S, S);
  const [cB, ctxB] = makeCanvas(S, S);
  const rand = seededRand(1212);

  ctxA.fillStyle = '#43384F';
  ctxA.fillRect(0, 0, S, S);
  ctxB.fillStyle = '#808080';
  ctxB.fillRect(0, 0, S, S);

  // Subtle warm wool weave + diamond kilim accents
  for (let y = 0; y < S; y += 6) {
    ctxA.fillStyle = y % 12 === 0 ? 'rgba(235,215,190,0.08)' : 'rgba(20,14,28,0.12)';
    ctxA.fillRect(0, y, S, 3);
    ctxB.fillStyle = y % 12 === 0 ? '#C8C8C8' : '#585858';
    ctxB.fillRect(0, y, S, 3);
  }
  ctxA.strokeStyle = 'rgba(225,186,132,0.28)';
  ctxA.lineWidth = 4;
  for (let gx = 0; gx < S; gx += 128) {
    for (let gy = 0; gy < S; gy += 128) {
      ctxA.beginPath();
      ctxA.moveTo(gx + 64, gy + 16);
      ctxA.lineTo(gx + 112, gy + 64);
      ctxA.lineTo(gx + 64, gy + 112);
      ctxA.lineTo(gx + 16, gy + 64);
      ctxA.closePath();
      ctxA.stroke();
    }
  }
  for (let i = 0; i < 3000; i++) {
    ctxB.fillStyle = rand() > 0.5 ? '#DCDCDC' : '#505050';
    ctxB.fillRect(rand() * S, rand() * S, 2, 2);
  }

  return { map: toTex(cA, 4, 4, true), bumpMap: toTex(cB, 4, 4, false) };
}

/** 13. Organic Tree Bark */
function buildBark(): PbrMapSet {
  const S = 256;
  const [cA, ctxA] = makeCanvas(S, S);
  const [cB, ctxB] = makeCanvas(S, S);
  const rand = seededRand(1313);

  ctxA.fillStyle = '#573F2D';
  ctxA.fillRect(0, 0, S, S);
  ctxB.fillStyle = '#707070';
  ctxB.fillRect(0, 0, S, S);

  for (let i = 0; i < 240; i++) {
    const x = rand() * S;
    const w = 2 + rand() * 7;
    ctxA.fillStyle = rand() > 0.5 ? 'rgba(42,28,18,0.45)' : 'rgba(128,98,74,0.28)';
    ctxA.fillRect(x, 0, w, S);
    ctxB.fillStyle = rand() > 0.5 ? '#282828' : '#D8D8D8';
    ctxB.fillRect(x, 0, w, S);
  }

  return { map: toTex(cA, 2, 3, true), bumpMap: toTex(cB, 2, 3, false) };
}

/** Painterly Atmospheric Sky Dome with Soft Sunlit Clouds & Horizon Haze (Ref 1 inspired) */
export function createCloudSkyTexture(
  topHex: string,
  bottomHex: string,
  includeClouds: boolean
): THREE.CanvasTexture {
  const W = 1024;
  const H = 512;
  const [canvas, ctx] = makeCanvas(W, H);
  const rand = seededRand(topHex.length * 91 + bottomHex.charCodeAt(1) * 37);

  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, topHex);
  grad.addColorStop(0.42, topHex);
  grad.addColorStop(0.62, bottomHex);
  grad.addColorStop(1, bottomHex);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  if (includeClouds) {
    // Crisp sunlit cumulus & cirrus cloud streaks visible right into the horizon band (y = 0.20..0.57)
    for (let i = 0; i < 88; i++) {
      const cx = rand() * W;
      const cy = H * (0.2 + rand() * 0.37);
      const rx = 50 + rand() * 140;
      const ry = 10 + rand() * 24;
      const alpha = 0.14 + rand() * 0.22;
      const cg = ctx.createRadialGradient(cx, cy, 4, cx, cy, rx);
      cg.addColorStop(0, `rgba(255, 252, 246, ${alpha})`);
      cg.addColorStop(0.5, `rgba(252, 248, 240, ${alpha * 0.55})`);
      cg.addColorStop(1, 'rgba(252, 248, 240, 0)');
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(1, ry / rx);
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.arc(0, 0, rx, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

let cachedPbrLib: EnvironmentPbrLibrary | null = null;

export function getEnvironmentPbrLibrary(): EnvironmentPbrLibrary {
  if (cachedPbrLib) return cachedPbrLib;
  cachedPbrLib = {
    cobblestone: buildCobblestone(),
    parisStone: buildParisStone(),
    gymRubber: buildGymRubber(),
    boardConcrete: buildBoardConcrete(),
    cedarSlats: buildCedarSlats(),
    oakPlanks: buildOakPlanks(),
    asphalt: buildAsphalt(),
    lagosPlaster: buildLagosPlaster(),
    corrugatedZinc: buildCorrugatedZinc(),
    warmBrick: buildWarmBrick(),
    parkGrass: buildParkGrass(),
    wovenRug: buildWovenRug(),
    bark: buildBark(),
  };
  return cachedPbrLib;
}
