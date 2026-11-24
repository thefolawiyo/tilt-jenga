import { ChallengeDefinition, WoodVariant } from '../types/game';

// Authentic Jenga proportions (3 : 1 : 0.6) scaled for rock-solid Rapier rigid-body physics
export const BLOCK_LENGTH = 3.0;
export const BLOCK_WIDTH = 1.0;
export const BLOCK_HEIGHT = 0.6;
export const BLOCK_GAP = 0.028; // Subtle clearance so blocks slide cleanly without binding
export const LAYER_VERTICAL_GAP = 0.002;
export const SLOT_SPACING = BLOCK_WIDTH + BLOCK_GAP; // 1.028

export const INITIAL_LEVELS = 18;
export const BLOCKS_PER_LEVEL = 3;
export const LOCKED_TOP_COMPLETED_LEVELS = 3;

// Horizontal distance from tower centerline to count a block as fully extracted
export const EXTRACTION_CLEARANCE_RADIUS = 2.55;

// Pedestal dimensions (top surface sits cleanly at y = 0)
export const PEDESTAL_TOP_Y = 0;
export const PEDESTAL_RADIUS = 5.4;
export const PEDESTAL_HEIGHT = 1.1;

// Brand colour palette
export const PALETTE = {
  deepMidnight: '#101624',
  darkIndigo: '#171F35',
  elevatedSurface: '#222D45',
  electricAqua: '#64E5D2',
  vividPeriwinkle: '#8581FF',
  warmTangerine: '#FF9B65',
  softIvory: '#F4F0E8',
  mutedBlueGrey: '#9BA8BC',
} as const;

export const PLAYER_COLORS = [
  '#64E5D2', // Electric Aqua
  '#FF9B65', // Warm Tangerine
  '#8581FF', // Vivid Periwinkle
  '#F5D061', // Warm Gold
];

// Six natural wood tones (oak, maple, walnut, ash variations)
export const WOOD_VARIANTS: WoodVariant[] = [
  { id: 0, name: 'Warm Oak', baseHex: '#C79B68', grainHex: '#9A6E3E', roughness: 0.66 },
  { id: 1, name: 'Honey Maple', baseHex: '#D8B484', grainHex: '#B28854', roughness: 0.60 },
  { id: 2, name: 'Golden Beech', baseHex: '#CFA572', grainHex: '#A67A48', roughness: 0.64 },
  { id: 3, name: 'Roasted Walnut', baseHex: '#9D6E47', grainHex: '#6E4627', roughness: 0.70 },
  { id: 4, name: 'Pale Ash', baseHex: '#DFC39B', grainHex: '#BA986B', roughness: 0.58 },
  { id: 5, name: 'Amber Teak', baseHex: '#B78452', grainHex: '#84572D', roughness: 0.68 },
];

export const CHALLENGES: ChallengeDefinition[] = [
  {
    id: 'steady-hands',
    title: 'Steady Hands',
    subtitle: '5 Clean Extractions',
    description: 'Extract and stack 5 blocks cleanly from a fresh 54-block tower without losing balance.',
    difficulty: 'Apprentice',
    targetMoves: 5,
    timeLimitSeconds: null,
    presetType: 'standard',
    accentColor: PALETTE.electricAqua,
  },
  {
    id: 'tower-architect',
    title: 'Tower Architect',
    subtitle: '10 Precision Moves',
    description: 'Build skyward with 10 consecutive extractions and placements. Every layer raises the stakes.',
    difficulty: 'Architect',
    targetMoves: 10,
    timeLimitSeconds: null,
    presetType: 'standard',
    accentColor: PALETTE.vividPeriwinkle,
  },
  {
    id: 'razor-edge',
    title: 'Razor Edge',
    subtitle: 'Unstable Pre-Carved Tower',
    description: 'Survive 4 moves on a precarious tower already thinned to single-pillar chokepoints.',
    difficulty: 'Daredevil',
    targetMoves: 4,
    timeLimitSeconds: null,
    presetType: 'precarious',
    accentColor: PALETTE.warmTangerine,
  },
  {
    id: 'against-gravity',
    title: 'Against the Clock',
    subtitle: '6 Moves in 75 Seconds',
    description: 'Speed meets nerve. Complete 6 full extractions and top placements before the timer expires.',
    difficulty: 'Master',
    targetMoves: 6,
    timeLimitSeconds: 75,
    presetType: 'speed',
    accentColor: PALETTE.electricAqua,
  },
];
