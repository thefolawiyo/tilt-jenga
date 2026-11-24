import { BlockState, PlacementSlot } from '../types/game';
import {
  BLOCK_HEIGHT,
  BLOCKS_PER_LEVEL,
  LAYER_VERTICAL_GAP,
  LOCKED_TOP_COMPLETED_LEVELS,
  PEDESTAL_TOP_Y,
  SLOT_SPACING,
} from './constants';

/**
 * Returns the highest level index that currently holds 3 blocks (a completed level),
 * and the highest level index that holds at least 1 block.
 */
export function getTowerLevelStats(blocks: BlockState[], excludeBlockId?: string | null) {
  const counts = new Map<number, number>();
  let maxLevel = 0;

  for (const b of blocks) {
    if (b.id === excludeBlockId) continue;
    counts.set(b.level, (counts.get(b.level) ?? 0) + 1);
    if (b.level > maxLevel) maxLevel = b.level;
  }

  let topCompletedLevel = -1;
  for (const [lvl, count] of counts.entries()) {
    if (count >= BLOCKS_PER_LEVEL && lvl > topCompletedLevel) {
      topCompletedLevel = lvl;
    }
  }

  return {
    counts,
    maxLevel,
    topCompletedLevel,
    totalHeightLevels: maxLevel + 1,
  };
}

/**
 * Official TILT / Jenga eligibility rule:
 * Players cannot remove blocks from the top 3 completed levels
 * (nor from an incomplete level above the top completed level).
 */
export function isBlockEligible(
  block: BlockState,
  allBlocks: BlockState[]
): { eligible: boolean; reason?: string } {
  const { topCompletedLevel } = getTowerLevelStats(allBlocks);
  const lockedFromLevel = Math.max(0, topCompletedLevel - (LOCKED_TOP_COMPLETED_LEVELS - 1));

  if (block.level >= lockedFromLevel) {
    return {
      eligible: false,
      reason: 'Top 3 completed levels are locked',
    };
  }

  return { eligible: true };
}

/**
 * Computes the available placement slots on top of the tower for the currently extracted block.
 * If the highest level has fewer than 3 blocks, returns its remaining open slots.
 * Otherwise opens all 3 slots on `maxLevel + 1`, rotated 90 degrees.
 */
export function getAvailablePlacementSlots(
  allBlocks: BlockState[],
  activeBlockId: string
): PlacementSlot[] {
  const { counts, maxLevel } = getTowerLevelStats(allBlocks, activeBlockId);
  const topCount = counts.get(maxLevel) ?? 0;

  const targetLevel = topCount < BLOCKS_PER_LEVEL ? maxLevel : maxLevel + 1;
  const orientation: 0 | 1 = targetLevel % 2 === 0 ? 0 : 1;
  const rotationY = orientation === 0 ? 0 : Math.PI / 2;
  const y = PEDESTAL_TOP_Y + BLOCK_HEIGHT * 0.5 + targetLevel * (BLOCK_HEIGHT + LAYER_VERTICAL_GAP);

  const occupiedSlots = new Set<number>();
  if (targetLevel === maxLevel) {
    for (const b of allBlocks) {
      if (b.id !== activeBlockId && b.level === targetLevel) {
        occupiedSlots.add(b.slot);
      }
    }
  }

  const slots: Array<-1 | 0 | 1> = [-1, 0, 1];
  const available: PlacementSlot[] = [];

  for (const slot of slots) {
    if (occupiedSlots.has(slot)) continue;
    const offset = slot * SLOT_SPACING;
    const position: [number, number, number] =
      orientation === 0 ? [0, y, offset] : [offset, y, 0];

    available.push({
      level: targetLevel,
      slot,
      orientation,
      position,
      rotationY,
    });
  }

  return available;
}
