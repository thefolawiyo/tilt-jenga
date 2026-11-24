import { BlockState, ChallengeDefinition } from '../types/game';
import {
  BLOCK_HEIGHT,
  INITIAL_LEVELS,
  LAYER_VERTICAL_GAP,
  PEDESTAL_TOP_Y,
  SLOT_SPACING,
  WOOD_VARIANTS,
} from './constants';

// Deterministic seeded PRNG so each restart feels fresh while challenge layouts stay consistent
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function getBlockWorldTransform(
  level: number,
  slot: -1 | 0 | 1
): { position: [number, number, number]; rotation: [number, number, number]; orientation: 0 | 1 } {
  const orientation: 0 | 1 = level % 2 === 0 ? 0 : 1;
  const y = PEDESTAL_TOP_Y + BLOCK_HEIGHT * 0.5 + level * (BLOCK_HEIGHT + LAYER_VERTICAL_GAP);
  const offset = slot * SLOT_SPACING;

  if (orientation === 0) {
    // Length along X, slots spaced along Z
    return {
      position: [0, y, offset],
      rotation: [0, 0, 0],
      orientation,
    };
  } else {
    // Length along Z, slots spaced along X
    return {
      position: [offset, y, 0],
      rotation: [0, Math.PI / 2, 0],
      orientation,
    };
  }
}

export function generateTowerBlocks(
  preset: ChallengeDefinition['presetType'] = 'standard',
  seed: number = Date.now()
): BlockState[] {
  const rand = mulberry32(seed);
  const blocks: BlockState[] = [];
  const slots: Array<-1 | 0 | 1> = [-1, 0, 1];

  // For the 'precarious' challenge, pre-remove specific outer/middle blocks to create authentic Jenga tension
  // while keeping the starting structure physically stable!
  const precariousHoles = new Set<string>([
    '2:-1', '2:1',     // Single center pillar on level 2
    '4:0',             // Outer two on level 4
    '6:-1', '6:1',     // Single center pillar on level 6
    '8:0',             // Outer two on level 8
    '10:-1', '10:1',   // Single center pillar on level 10
    '12:0',            // Outer two on level 12
  ]);

  for (let level = 0; level < INITIAL_LEVELS; level++) {
    for (const slot of slots) {
      if (preset === 'precarious' && precariousHoles.has(`${level}:${slot}`)) {
        continue;
      }

      const { position, rotation, orientation } = getBlockWorldTransform(level, slot);
      // Tiny organic placement micro-variation (sub-millimeter feel, never compromising stability)
      const jitterX = (rand() - 0.5) * 0.006;
      const jitterZ = (rand() - 0.5) * 0.006;
      const woodVariant = Math.floor(rand() * WOOD_VARIANTS.length);

      blocks.push({
        id: `block-${level}-${slot}`,
        level,
        slot,
        orientation,
        woodVariant,
        uvOffset: [rand() * 0.5, rand() * 0.5],
        initialPosition: [position[0] + jitterX, position[1], position[2] + jitterZ],
        initialRotation: rotation,
      });
    }
  }

  return blocks;
}
