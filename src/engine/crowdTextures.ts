import * as THREE from 'three';

export interface CrowdTextileSet {
  kente: THREE.CanvasTexture;
  ankaraTeal: THREE.CanvasTexture;
  ankaraCrimson: THREE.CanvasTexture;
  ankaraPeacock: THREE.CanvasTexture;
  ankaraOrangeScallop: THREE.CanvasTexture;
  ankaraSunGold: THREE.CanvasTexture;
  ankaraCobaltAdire: THREE.CanvasTexture;
  dashikiRoyal: THREE.CanvasTexture;
  arabianThobeWhite: THREE.CanvasTexture;
  arabianThobeSand: THREE.CanvasTexture;
  arabianShemaghRed: THREE.CanvasTexture;
  arabianAbayaGold: THREE.CanvasTexture;
  westernSuit: THREE.CanvasTexture;
  westernStreetwear: THREE.CanvasTexture;
  gymAthletic: THREE.CanvasTexture;
  fabricBump: THREE.CanvasTexture;
}

function makeCanvas(size = 256): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  return [c, c.getContext('2d')!];
}

function finalizeTexture(canvas: HTMLCanvasElement, repeatX = 2, repeatY = 2): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = 4;
  return tex;
}

/** Ghanaian/West African Kente woven geometric strip pattern */
function createKenteTexture(): THREE.CanvasTexture {
  const S = 256;
  const [c, ctx] = makeCanvas(S);
  ctx.fillStyle = '#D99B1E'; // Rich Kente gold
  ctx.fillRect(0, 0, S, S);

  const stripeH = 32;
  const palette = ['#167A4B', '#C92A2A', '#132247', '#F2B705', '#1B1D26'];

  for (let row = 0; row < S / stripeH; row++) {
    const y = row * stripeH;
    ctx.fillStyle = palette[row % palette.length];
    ctx.fillRect(0, y, S, stripeH);

    // Woven cross-bars & geometric gold blocks
    for (let x = 0; x < S; x += 32) {
      if ((x / 32 + row) % 2 === 0) {
        ctx.fillStyle = '#F2B705';
        ctx.fillRect(x + 4, y + 4, 24, stripeH - 8);
        ctx.fillStyle = '#141720';
        ctx.fillRect(x + 10, y + 10, 12, stripeH - 20);
      } else {
        ctx.fillStyle = '#F7EFE0';
        for (let b = 0; b < 4; b++) {
          ctx.fillRect(x + 3 + b * 7, y + 6, 3, stripeH - 12);
        }
      }
    }
    ctx.fillStyle = '#0F121A';
    ctx.fillRect(0, y, S, 3);
  }
  return finalizeTexture(c, 2, 2);
}

/** Bold Lagos Ankara wax-print medallion & diamond textile */
function createAnkaraTexture(
  bgHex: string,
  primaryHex: string,
  secondaryHex: string,
  accentHex: string
): THREE.CanvasTexture {
  const S = 256;
  const [c, ctx] = makeCanvas(S);
  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, S, S);

  // Subtle wax-print crackle lines
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 40; i++) {
    ctx.beginPath();
    ctx.moveTo(0, (i * 7) % S);
    ctx.lineTo(S, ((i * 7) + 28) % S);
    ctx.stroke();
  }

  // Repeating bold Ankara geometric sun/medallion motifs
  const step = 64;
  for (let gy = 0; gy < S; gy += step) {
    for (let gx = 0; gx < S; gx += step) {
      const cx = gx + step / 2;
      const cy = gy + step / 2;

      // Outer diamond
      ctx.fillStyle = primaryHex;
      ctx.beginPath();
      ctx.moveTo(cx, gy + 4);
      ctx.lineTo(gx + step - 4, cy);
      ctx.lineTo(cx, gy + step - 4);
      ctx.lineTo(gx + 4, cy);
      ctx.closePath();
      ctx.fill();

      // Inner scalloped medallion
      ctx.fillStyle = secondaryHex;
      ctx.beginPath();
      ctx.arc(cx, cy, 16, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#111521';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Center star dot
      ctx.fillStyle = accentHex;
      ctx.beginPath();
      ctx.arc(cx, cy, 7, 0, Math.PI * 2);
      ctx.fill();

      // Corner accent dots
      ctx.fillStyle = accentHex;
      ctx.beginPath();
      ctx.arc(gx + 6, gy + 6, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  return finalizeTexture(c, 2.5, 2.5);
}

/** West African Royal Blue & Gold Embroidered Agbada / Dashiki */
function createDashikiRoyalTexture(): THREE.CanvasTexture {
  const S = 256;
  const [c, ctx] = makeCanvas(S);
  ctx.fillStyle = '#18377A'; // Royal Yoruba Indigo
  ctx.fillRect(0, 0, S, S);

  // Subtle woven brocade sheen stripes
  for (let x = 0; x < S; x += 16) {
    ctx.fillStyle = x % 32 === 0 ? 'rgba(244, 196, 62, 0.14)' : 'rgba(255,255,255,0.04)';
    ctx.fillRect(x, 0, 4, S);
  }

  // Gold embroidered chevron & diamond filigree
  ctx.strokeStyle = '#F2C14E';
  ctx.lineWidth = 3;
  for (let y = 16; y < S; y += 48) {
    ctx.beginPath();
    for (let x = 0; x <= S; x += 32) {
      ctx.lineTo(x, y + (x % 64 === 0 ? -10 : 10));
    }
    ctx.stroke();

    for (let x = 16; x < S; x += 32) {
      ctx.fillStyle = '#F7E3A3';
      ctx.beginPath();
      ctx.arc(x, y, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  return finalizeTexture(c, 2, 2);
}

/** Crisp Tailored Arabian Thobe cotton weave with subtle embroidered trim */
function createThobeTexture(baseHex: string, trimHex: string): THREE.CanvasTexture {
  const S = 256;
  const [c, ctx] = makeCanvas(S);
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, S, S);

  // Fine cotton twill micro-weave
  ctx.fillStyle = 'rgba(20, 26, 38, 0.035)';
  for (let y = 0; y < S; y += 4) {
    ctx.fillRect(0, y, S, 1);
  }
  for (let x = 0; x < S; x += 4) {
    ctx.fillRect(x, 0, 1, S);
  }

  // Delicate vertical placket & gold cuff trim
  ctx.fillStyle = trimHex;
  ctx.fillRect(S * 0.48, 0, 5, S);
  ctx.fillStyle = 'rgba(212, 175, 55, 0.25)';
  ctx.fillRect(0, S - 10, S, 6);

  return finalizeTexture(c, 1, 1);
}

/** Iconic Red-and-White Checkered Arabian Shemagh / Ghutra */
function createShemaghRedTexture(): THREE.CanvasTexture {
  const S = 256;
  const [c, ctx] = makeCanvas(S);
  ctx.fillStyle = '#F7F4EE';
  ctx.fillRect(0, 0, S, S);

  const cell = 16;
  for (let y = 0; y < S; y += cell) {
    for (let x = 0; x < S; x += cell) {
      const parity = ((x / cell) + (y / cell)) % 2;
      if (parity === 0) {
        ctx.fillStyle = '#B81D2B';
        ctx.fillRect(x + 2, y + 2, cell - 4, cell - 4);
      } else {
        ctx.strokeStyle = '#B81D2B';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, y + cell / 2);
        ctx.lineTo(x + cell, y + cell / 2);
        ctx.moveTo(x + cell / 2, y);
        ctx.lineTo(x + cell / 2, y + cell);
        ctx.stroke();
      }
    }
  }
  return finalizeTexture(c, 2, 2);
}

/** Elegant Dark Arabian Abaya / Bisht with subtle woven gold embroidery */
function createAbayaGoldTexture(): THREE.CanvasTexture {
  const S = 256;
  const [c, ctx] = makeCanvas(S);
  ctx.fillStyle = '#1A1E2B';
  ctx.fillRect(0, 0, S, S);

  // Silky vertical drape sheen
  const grad = ctx.createLinearGradient(0, 0, S, 0);
  grad.addColorStop(0, 'rgba(255,255,255,0.03)');
  grad.addColorStop(0.5, 'rgba(255,255,255,0.09)');
  grad.addColorStop(1, 'rgba(255,255,255,0.02)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, S, S);

  // Subtle gold brocade border strip
  ctx.fillStyle = '#D4AF37';
  ctx.fillRect(0, S - 18, S, 5);
  ctx.fillStyle = '#F5DE8C';
  for (let x = 8; x < S; x += 20) {
    ctx.fillRect(x, S - 10, 8, 3);
  }
  return finalizeTexture(c, 1, 1);
}

/** Modern Western Tailored Blazer / Suit wool texture */
function createWesternSuitTexture(): THREE.CanvasTexture {
  const S = 256;
  const [c, ctx] = makeCanvas(S);
  ctx.fillStyle = '#D6DCE8'; // White-leaning base so instanceColor tints cleanly into navy, camel, burgundy, slate!
  ctx.fillRect(0, 0, S, S);

  // Crisp subtle pinstripe weave
  ctx.fillStyle = 'rgba(15, 22, 36, 0.08)';
  for (let x = 0; x < S; x += 12) {
    ctx.fillRect(x, 0, 2, S);
  }
  return finalizeTexture(c, 2, 2);
}

/** Modern Western Stylish Streetwear / Varsity Jacket texture */
function createWesternStreetwearTexture(): THREE.CanvasTexture {
  const S = 256;
  const [c, ctx] = makeCanvas(S);
  ctx.fillStyle = '#DCE2EC';
  ctx.fillRect(0, 0, S, S);

  // Contemporary bold diagonal accent stripe & ribbed trim feel
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.fillRect(0, S * 0.42, S, 24);
  ctx.fillStyle = 'rgba(15, 22, 36, 0.16)';
  ctx.fillRect(0, S * 0.42, S, 5);
  ctx.fillRect(0, S * 0.42 + 20, S, 5);
  return finalizeTexture(c, 1, 1);
}

/** Reference-3 inspired Turquoise/Coral Peacock-Scale Nigerian Ankara Wax Print */
function createAnkaraPeacockTexture(): THREE.CanvasTexture {
  const S = 256;
  const [c, ctx] = makeCanvas(S);
  ctx.fillStyle = '#E8F3EF';
  ctx.fillRect(0, 0, S, S);

  const step = 32;
  for (let row = 0; row < S / step + 1; row++) {
    for (let col = 0; col < S / step + 1; col++) {
      const cx = col * step + (row % 2) * (step / 2);
      const cy = row * step;
      ctx.fillStyle = '#1E8E87';
      ctx.beginPath();
      ctx.ellipse(cx, cy, 13, 18, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#DF6B43';
      ctx.beginPath();
      ctx.ellipse(cx, cy + 2, 7.5, 11, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#1A1C24';
      ctx.beginPath();
      ctx.arc(cx, cy + 3, 3.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#F4EBD8';
      ctx.lineWidth = 1.6;
      ctx.stroke();
    }
  }
  return finalizeTexture(c, 3, 3);
}

/** Reference-3 inspired Warm Burnt-Orange Scalloped Ankara Print */
function createAnkaraOrangeScallopTexture(): THREE.CanvasTexture {
  const S = 256;
  const [c, ctx] = makeCanvas(S);
  ctx.fillStyle = '#D96426';
  ctx.fillRect(0, 0, S, S);

  const step = 32;
  for (let row = 0; row < S / step + 1; row++) {
    for (let col = 0; col < S / step + 1; col++) {
      const cx = col * step + (row % 2) * (step / 2);
      const cy = row * step;
      ctx.strokeStyle = '#F7C97E';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(cx, cy, 14, Math.PI, 0);
      ctx.stroke();

      ctx.strokeStyle = '#732912';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(cx, cy, 8, Math.PI, 0);
      ctx.stroke();

      ctx.fillStyle = '#F7C97E';
      ctx.beginPath();
      ctx.arc(cx, cy - 3, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  return finalizeTexture(c, 3, 3);
}

/** Reference-3 inspired Sunlit Golden-Yellow Medallion Ankara Print */
function createAnkaraSunGoldTexture(): THREE.CanvasTexture {
  const S = 256;
  const [c, ctx] = makeCanvas(S);
  ctx.fillStyle = '#F4C63D';
  ctx.fillRect(0, 0, S, S);

  const step = 42;
  for (let y = 0; y < S + step; y += step) {
    for (let x = 0; x < S + step; x += step) {
      const cx = x + step / 2;
      const cy = y + step / 2;
      ctx.strokeStyle = '#8C4E12';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, 15, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#FFF5D1';
      for (let p = 0; p < 8; p++) {
        const a = (p / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(cx + Math.cos(a) * 10, cy + Math.sin(a) * 10, 3.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#C86D18';
      ctx.beginPath();
      ctx.arc(cx, cy, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  return finalizeTexture(c, 3, 3);
}

/** Reference-3 inspired Royal Cobalt & Crisp White Adire Checkerboard Print */
function createAnkaraCobaltAdireTexture(): THREE.CanvasTexture {
  const S = 256;
  const [c, ctx] = makeCanvas(S);
  ctx.fillStyle = '#1D4ED8';
  ctx.fillRect(0, 0, S, S);

  const step = 24;
  for (let y = 0; y < S; y += step) {
    for (let x = 0; x < S; x += step) {
      ctx.fillStyle = '#F4F7FF';
      ctx.fillRect(x + 4, y + 4, step - 10, step - 10);
      ctx.fillStyle = '#1E3A8A';
      ctx.fillRect(x + 8, y + 8, step - 18, step - 18);
    }
  }
  return finalizeTexture(c, 3, 3);
}

/** Matte Breathable Performance Athletic Mesh Texture (Indoor Gym) */
function createGymAthleticTexture(): THREE.CanvasTexture {
  const S = 256;
  const [c, ctx] = makeCanvas(S);
  ctx.fillStyle = '#D4DCE6';
  ctx.fillRect(0, 0, S, S);

  // Micro athletic mesh perforations
  ctx.fillStyle = 'rgba(20, 26, 36, 0.14)';
  for (let y = 0; y < S; y += 8) {
    for (let x = (y % 16 === 0 ? 0 : 4); x < S; x += 8) {
      ctx.fillRect(x, y, 2, 2);
    }
  }
  // Subtle shoulder seam stripe
  ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.fillRect(0, 18, S, 8);
  return finalizeTexture(c, 3, 3);
}

/** Fine Woven Cotton Cloth Bump Map so all garments read tactile & matte (zero plastic!) */
function createFabricBumpTexture(): THREE.CanvasTexture {
  const S = 256;
  const [c, ctx] = makeCanvas(S);
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, S, S);
  for (let y = 0; y < S; y += 4) {
    ctx.fillStyle = y % 8 === 0 ? '#A8A8A8' : '#646464';
    ctx.fillRect(0, y, S, 2);
  }
  for (let x = 0; x < S; x += 4) {
    ctx.fillStyle = x % 8 === 0 ? 'rgba(215,215,215,0.45)' : 'rgba(60,60,60,0.45)';
    ctx.fillRect(x, 0, 2, S);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.NoColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 8);
  return tex;
}

let cachedTextiles: CrowdTextileSet | null = null;

export function getCrowdTextiles(): CrowdTextileSet {
  if (cachedTextiles) return cachedTextiles;

  cachedTextiles = {
    kente: createKenteTexture(),
    ankaraTeal: createAnkaraTexture('#0F4C5C', '#1CA39E', '#F2B705', '#F7EFE0'),
    ankaraCrimson: createAnkaraTexture('#9E1C28', '#E84A27', '#F7C948', '#FFF2DC'),
    ankaraPeacock: createAnkaraPeacockTexture(),
    ankaraOrangeScallop: createAnkaraOrangeScallopTexture(),
    ankaraSunGold: createAnkaraSunGoldTexture(),
    ankaraCobaltAdire: createAnkaraCobaltAdireTexture(),
    dashikiRoyal: createDashikiRoyalTexture(),
    arabianThobeWhite: createThobeTexture('#F5F2EB', '#E2D8C3'),
    arabianThobeSand: createThobeTexture('#E8DEC8', '#C9B58C'),
    arabianShemaghRed: createShemaghRedTexture(),
    arabianAbayaGold: createAbayaGoldTexture(),
    westernSuit: createWesternSuitTexture(),
    westernStreetwear: createWesternStreetwearTexture(),
    gymAthletic: createGymAthleticTexture(),
    fabricBump: createFabricBumpTexture(),
  };

  return cachedTextiles;
}

export function disposeCrowdTextiles() {
  if (!cachedTextiles) return;
  Object.values(cachedTextiles).forEach((t) => t.dispose());
  cachedTextiles = null;
}
