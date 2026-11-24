import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { ThreeEvent, useFrame, useThree } from '@react-three/fiber';
import {
  CuboidCollider,
  CylinderCollider,
  Physics,
  RapierRigidBody,
  RigidBody,
  useRapier,
} from '@react-three/rapier';
import { useGameStore } from '../store/useGameStore';
import {
  BLOCK_HEIGHT,
  BLOCK_LENGTH,
  BLOCK_WIDTH,
  EXTRACTION_CLEARANCE_RADIUS,
  LAYER_VERTICAL_GAP,
  PALETTE,
  PEDESTAL_HEIGHT,
  PEDESTAL_RADIUS,
  PEDESTAL_TOP_Y,
} from '../engine/constants';
import { getAvailablePlacementSlots, isBlockEligible } from '../engine/rules';
import { AiDifficulty, BlockState, PlacementSlot } from '../types/game';
import { JengaBlockMesh } from './JengaBlock';
import { buildCarryArcCurve } from './MoveVisualizer';
import { soundEngine } from '../audio/soundEngine';

interface DragSession {
  blockId: string;
  body: RapierRigidBody;
  dragPlane: THREE.Plane;
  startHit: THREE.Vector3;
  startBodyPos: THREE.Vector3;
  startQuat: THREE.Quaternion;
  pullAxis: THREE.Vector3;
  currentAlong: number;
  level: number;
}

interface AiTurnState {
  stage: 'thinking' | 'pulling' | 'carrying' | 'lowering';
  elapsed: number;
  block: BlockState;
  body: RapierRigidBody;
  pullAxis: THREE.Vector3;
  pullDir: 1 | -1;
  startPos: THREE.Vector3;
  startQuat: THREE.Quaternion;
  exitPos: [number, number, number] | null;
  carryCurve: THREE.QuadraticBezierCurve3 | null;
  targetSlot: PlacementSlot | null;
  targetQuat: THREE.Quaternion;
  placementOffset: number;
}

/**
 * Evaluates all eligible Jenga blocks structurally so the Computer makes realistic Jenga decisions.
 */
function pickAiBlock(
  blocks: BlockState[],
  difficulty: AiDifficulty,
  movesCount: number
): BlockState | null {
  const levelSlots = new Map<number, Set<number>>();
  for (const b of blocks) {
    if (!levelSlots.has(b.level)) levelSlots.set(b.level, new Set());
    levelSlots.get(b.level)!.add(b.slot);
  }

  const scored: Array<{ block: BlockState; score: number }> = [];

  for (const b of blocks) {
    if (!isBlockEligible(b, blocks).eligible) continue;
    const slots = levelSlots.get(b.level)!;
    const count = slots.size;
    let baseScore = 50;

    if (count === 3) {
      baseScore = b.slot === 0 ? 100 : 86;
    } else if (count === 2) {
      if (slots.has(0) && b.slot !== 0) {
        // Leaves center pillar intact — classic playable move
        baseScore = 64;
      } else {
        // Leaves a single unsupported outer block — likely collapse
        baseScore = 10;
      }
    } else {
      // Last pillar on level — guaranteed collapse
      baseScore = 2;
    }

    // Prefer middle/upper-middle layers slightly for natural pacing
    const heightPref = Math.max(0, 8 - Math.abs(b.level - 8)) * 0.6;
    scored.push({
      block: b,
      score: baseScore + heightPref + Math.random() * 14,
    });
  }

  if (scored.length === 0) return null;
  scored.sort((a, b) => b.score - a.score);

  // On Casual difficulty after several moves, occasionally make a riskier human-like pick
  if (difficulty === 'casual' && movesCount >= 5 && Math.random() < 0.16 && scored.length > 4) {
    const riskyPool = scored.slice(Math.floor(scored.length * 0.55));
    return riskyPool[Math.floor(Math.random() * riskyPool.length)].block;
  }

  const topCount = difficulty === 'sharp' ? Math.min(3, scored.length) : Math.min(6, scored.length);
  return scored[Math.floor(Math.random() * topCount)].block;
}

// High natural wood-on-wood static grip keeps the resting tower cohesive and stable
const REST_BLOCK_FRICTION = 0.64;
// Ultra-low friction during pure 1D lengthwise pull prevents dragging upper rows sideways
const DRAG_BLOCK_FRICTION = 0.005;

const _raycaster = new THREE.Raycaster();
const _hitPoint = new THREE.Vector3();
const _tempQuat = new THREE.Quaternion();
const _tempUp = new THREE.Vector3();
const _tempVec = new THREE.Vector3();
const _camDir = new THREE.Vector3();

function setBodyFriction(body: RapierRigidBody, friction: number) {
  try {
    const count = body.numColliders();
    for (let i = 0; i < count; i++) {
      body.collider(i).setFriction(friction);
    }
  } catch {
    // Ignore disposed body
  }
}

function setBodySensor(body: RapierRigidBody, isSensor: boolean) {
  try {
    const count = body.numColliders();
    for (let i = 0; i < count; i++) {
      body.collider(i).setSensor(isSensor);
    }
  } catch {
    // Ignore disposed body
  }
}

/**
 * Inner physics scene inside <Physics> so it has direct access to useRapier()
 */
const PhysicsTowerInner: React.FC<{
  runId: number;
  onSlowMoChange: (active: boolean) => void;
}> = ({ runId, onSlowMoChange }) => {
  const { camera, gl, pointer } = useThree();
  const { rapier, step } = useRapier();

  const screen = useGameStore((s) => s.screen);
  const blocks = useGameStore((s) => s.blocks);
  const turnPhase = useGameStore((s) => s.turnPhase);
  const isPaused = useGameStore((s) => s.isPaused);
  const hoveredBlockId = useGameStore((s) => s.hoveredBlockId);
  const selectedBlockId = useGameStore((s) => s.selectedBlockId);
  const isPlacementValid = useGameStore((s) => s.isPlacementValid);
  const reducedMotion = useGameStore((s) => s.settings.reducedMotion);

  const setHoveredBlock = useGameStore((s) => s.setHoveredBlock);
  const startDraggingBlock = useGameStore((s) => s.startDraggingBlock);
  const cancelDraggingBlock = useGameStore((s) => s.cancelDraggingBlock);
  const markBlockExtracted = useGameStore((s) => s.markBlockExtracted);
  const setPlacementValid = useGameStore((s) => s.setPlacementValid);
  const beginSettlingBlock = useGameStore((s) => s.beginSettlingBlock);
  const completeTurnAfterSettle = useGameStore((s) => s.completeTurnAfterSettle);
  const triggerCollapse = useGameStore((s) => s.triggerCollapse);
  const finishCollapseToGameOver = useGameStore((s) => s.finishCollapseToGameOver);
  const tickChallengeTimer = useGameStore((s) => s.tickChallengeTimer);
  const showFeedback = useGameStore((s) => s.showFeedback);
  const setActiveMoveVisual = useGameStore((s) => s.setActiveMoveVisual);
  const focusCameraAzimuth = useGameStore((s) => s.focusCameraAzimuth);
  const consumeRemoteMove = useGameStore((s) => s.consumeRemoteMove);
  const players = useGameStore((s) => s.players);
  const currentPlayerIndex = useGameStore((s) => s.currentPlayerIndex);
  const activePlayerColor = players[currentPlayerIndex]?.color ?? PALETTE.electricAqua;

  const bodyRefs = useRef<Map<string, RapierRigidBody>>(new Map());
  const dragRef = useRef<DragSession | null>(null);
  const aiTurnRef = useRef<AiTurnState | null>(null);
  const spawnTimeRef = useRef<number>(performance.now());
  const settleElapsedRef = useRef<number>(0);
  const collapseElapsedRef = useRef<number>(0);
  const collapseConfirmTimerRef = useRef<number>(0);
  const extractionTimestampRef = useRef<number>(0);

  const [invalidFlashId, setInvalidFlashId] = useState<string | null>(null);
  const [activeSlotIndex, setActiveSlotIndex] = useState<number>(0);
  const placementTargetPos = useRef(new THREE.Vector3(0, 12, 0));
  const placementTargetRotY = useRef<number>(0);
  const chosenSlotRef = useRef<PlacementSlot | null>(null);
  const manualOffsetRef = useRef<number>(0);

  const slotEdgesGeo = useMemo(() => {
    const box = new THREE.BoxGeometry(BLOCK_LENGTH, BLOCK_HEIGHT, BLOCK_WIDTH);
    const edges = new THREE.EdgesGeometry(box);
    box.dispose();
    return edges;
  }, []);

  useEffect(() => {
    return () => {
      slotEdgesGeo.dispose();
    };
  }, [slotEdgesGeo]);

  // Reset internal timers on new match
  useEffect(() => {
    spawnTimeRef.current = performance.now();
    dragRef.current = null;
    aiTurnRef.current = null;
    settleElapsedRef.current = 0;
    collapseElapsedRef.current = 0;
    collapseConfirmTimerRef.current = 0;
    onSlowMoChange(false);
  }, [runId, onSlowMoChange]);

  const availableSlots = useMemo(() => {
    if (turnPhase !== 'placing' || !selectedBlockId) return [];
    return getAvailablePlacementSlots(blocks, selectedBlockId);
  }, [turnPhase, selectedBlockId, blocks]);

  useEffect(() => {
    if (turnPhase === 'placing' && availableSlots.length > 0) {
      extractionTimestampRef.current = performance.now();
      const first = availableSlots[0];
      chosenSlotRef.current = first;
      setActiveSlotIndex(0);
      manualOffsetRef.current = 0;
      placementTargetPos.current.set(first.position[0], first.position[1] + 0.56, first.position[2]);
      placementTargetRotY.current = first.rotationY;
      setPlacementValid(true);
    }
  }, [turnPhase, availableSlots, setPlacementValid]);

  // Cursor feedback
  useEffect(() => {
    const dom = gl.domElement;
    if (screen !== 'playing') {
      dom.style.cursor = 'default';
      return;
    }
    if (turnPhase === 'dragging') {
      dom.style.cursor = 'grabbing';
    } else if (turnPhase === 'placing') {
      dom.style.cursor = isPlacementValid ? 'pointer' : 'not-allowed';
    } else if (hoveredBlockId) {
      const hovered = blocks.find((b) => b.id === hoveredBlockId);
      const elig = hovered ? isBlockEligible(hovered, blocks).eligible : false;
      dom.style.cursor = elig ? 'grab' : 'not-allowed';
    } else {
      dom.style.cursor = 'grab';
    }
    return () => {
      dom.style.cursor = 'default';
    };
  }, [gl.domElement, screen, turnPhase, hoveredBlockId, blocks, isPlacementValid]);

  const wakeAllBlocks = useCallback(() => {
    bodyRefs.current.forEach((b) => {
      try {
        b.wakeUp();
      } catch {
        // Ignore disposed bodies
      }
    });
  }, []);

  // Place the extracted block cleanly onto top of the tower
  const confirmPlacement = useCallback(
    (explicitSlot?: PlacementSlot, bypassDebounce = false) => {
      const state = useGameStore.getState();
      if (state.turnPhase !== 'placing' || !state.selectedBlockId) return;
      if (!bypassDebounce && performance.now() - extractionTimestampRef.current < 260) return;

      const slot = explicitSlot ?? chosenSlotRef.current;
      if (!slot || (!explicitSlot && !state.isPlacementValid)) {
        soundEngine.playInvalidTap();
        showFeedback('Slot occupied or out of bounds — pick a glowing open slot', 'tangerine');
        return;
      }

      const body = bodyRefs.current.get(state.selectedBlockId);
      if (!body) return;

      // Measure actual live top surface of the layer directly beneath slot.level so dropped bricks never clip or float
      let liveSupportTopY = slot.position[1] - BLOCK_HEIGHT * 0.5;
      for (const b of state.blocks) {
        if (b.id === state.selectedBlockId) continue;
        if (b.level === slot.level - 1) {
          const rb = bodyRefs.current.get(b.id);
          if (rb) {
            const topY = rb.translation().y + BLOCK_HEIGHT * 0.5;
            if (topY > liveSupportTopY) liveSupportTopY = topY;
          }
        }
      }

      const dropY = Math.max(slot.position[1] + 0.03, liveSupportTopY + BLOCK_HEIGHT * 0.5 + 0.03);
      const offsetX = slot.orientation === 0 ? manualOffsetRef.current : 0;
      const offsetZ = slot.orientation === 1 ? manualOffsetRef.current : 0;

      setBodySensor(body, false);
      setBodyFriction(body, REST_BLOCK_FRICTION);
      body.setBodyType(rapier.RigidBodyType.Dynamic, true);
      body.setTranslation(
        {
          x: slot.position[0] + offsetX,
          y: dropY,
          z: slot.position[2] + offsetZ,
        },
        true
      );
      _tempQuat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), slot.rotationY);
      body.setRotation(
        { x: _tempQuat.x, y: _tempQuat.y, z: _tempQuat.z, w: _tempQuat.w },
        true
      );
      body.setLinvel({ x: 0, y: -0.05, z: 0 }, true);
      body.setAngvel({ x: 0, y: 0, z: 0 }, true);
      wakeAllBlocks();

      settleElapsedRef.current = 0;
      const curVisual = state.activeMoveVisual;
      if (curVisual) {
        setActiveMoveVisual({
          ...curVisual,
          toLevel: slot.level,
          toSlot: slot.slot,
          toPosition: slot.position,
          toRotationY: slot.rotationY,
          stage: 'dropping',
          timestamp: Date.now(),
        });
      }
      beginSettlingBlock(state.selectedBlockId, slot.level, slot.slot);
    },
    [rapier, wakeAllBlocks, beginSettlingBlock, showFeedback, setActiveMoveVisual]
  );

  // Release active drag cleanly back to dynamic physics if player lets go partway
  useEffect(() => {
    const handlePointerUp = () => {
      if (dragRef.current) {
        const { body, startBodyPos, startQuat } = dragRef.current;
        try {
          const cur = body.translation();
          setBodyFriction(body, REST_BLOCK_FRICTION);
          body.setBodyType(rapier.RigidBodyType.Dynamic, true);
          body.setTranslation({ x: cur.x, y: startBodyPos.y, z: cur.z }, true);
          body.setRotation(
            { x: startQuat.x, y: startQuat.y, z: startQuat.z, w: startQuat.w },
            true
          );
          body.setLinvel({ x: 0, y: 0, z: 0 }, true);
          body.setAngvel({ x: 0, y: 0, z: 0 }, true);
        } catch {
          // Ignore
        }
        dragRef.current = null;
        setActiveMoveVisual(null);
        cancelDraggingBlock();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const state = useGameStore.getState();
      const activePlayer = state.players[state.currentPlayerIndex];
      const isRemoteOrAi = Boolean(activePlayer?.isAI) || (state.mode === 'live' && !activePlayer?.isLocal);
      if (state.screen !== 'playing' || state.isPaused || isRemoteOrAi) return;
      if (state.turnPhase === 'placing' && availableSlots.length > 0) {
        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
          e.preventDefault();
          setActiveSlotIndex((prev) => {
            const next = (prev - 1 + availableSlots.length) % availableSlots.length;
            const slot = availableSlots[next];
            chosenSlotRef.current = slot;
            manualOffsetRef.current = 0;
            placementTargetPos.current.set(slot.position[0], slot.position[1] + 0.56, slot.position[2]);
            placementTargetRotY.current = slot.rotationY;
            setPlacementValid(true);
            soundEngine.playUiClick(1.15);
            return next;
          });
        } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
          e.preventDefault();
          setActiveSlotIndex((prev) => {
            const next = (prev + 1) % availableSlots.length;
            const slot = availableSlots[next];
            chosenSlotRef.current = slot;
            manualOffsetRef.current = 0;
            placementTargetPos.current.set(slot.position[0], slot.position[1] + 0.56, slot.position[2]);
            placementTargetRotY.current = slot.rotationY;
            setPlacementValid(true);
            soundEngine.playUiClick(1.15);
            return next;
          });
        } else if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          confirmPlacement();
        }
      }
    };

    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [rapier, cancelDraggingBlock, availableSlots, confirmPlacement, setPlacementValid]);

  // Canvas tap/click confirms placement when in placing mode
  useEffect(() => {
    const dom = gl.domElement;
    let downX = 0;
    let downY = 0;

    const onDown = (e: PointerEvent) => {
      downX = e.clientX;
      downY = e.clientY;
    };

    const onUp = (e: PointerEvent) => {
      const state = useGameStore.getState();
      const activePlayer = state.players[state.currentPlayerIndex];
      const isRemoteOrAi = Boolean(activePlayer?.isAI) || (state.mode === 'live' && !activePlayer?.isLocal);
      if (state.screen !== 'playing' || state.isPaused || state.turnPhase !== 'placing' || isRemoteOrAi) return;
      const moved = Math.hypot(e.clientX - downX, e.clientY - downY);
      if (moved > 10) return;
      confirmPlacement();
    };

    dom.addEventListener('pointerdown', onDown);
    dom.addEventListener('pointerup', onUp);
    return () => {
      dom.removeEventListener('pointerdown', onDown);
      dom.removeEventListener('pointerup', onUp);
    };
  }, [gl.domElement, confirmPlacement]);

  const handleBlockPointerDown = useCallback(
    (block: BlockState, e: ThreeEvent<PointerEvent>) => {
      const state = useGameStore.getState();
      const activePlayer = state.players[state.currentPlayerIndex];
      const isRemoteOrAi = Boolean(activePlayer?.isAI) || (state.mode === 'live' && !activePlayer?.isLocal);
      if (state.screen !== 'playing' || state.isPaused || state.turnPhase !== 'ready' || isRemoteOrAi) return;
      e.stopPropagation();

      const check = isBlockEligible(block, state.blocks);
      if (!check.eligible) {
        soundEngine.unlock();
        soundEngine.playInvalidTap();
        setInvalidFlashId(block.id);
        showFeedback(check.reason ?? 'Top 3 completed levels are locked', 'tangerine');
        setTimeout(() => {
          setInvalidFlashId((cur) => (cur === block.id ? null : cur));
        }, 480);
        return;
      }

      const body = bodyRefs.current.get(block.id);
      if (!body) return;

      const t = body.translation();
      const q = body.rotation();
      const startQuat = new THREE.Quaternion(q.x, q.y, q.z, q.w);

      // Compute exact horizontal lengthwise pull axis from the block's orientation
      const pullAxis = new THREE.Vector3(1, 0, 0).applyQuaternion(startQuat);
      pullAxis.y = 0;
      if (pullAxis.lengthSq() < 0.001) pullAxis.set(1, 0, 0);
      pullAxis.normalize();

      camera.getWorldDirection(_camDir);
      const planeNormal =
        Math.abs(_camDir.y) < 0.28
          ? new THREE.Vector3(-_camDir.x * 0.45, 0.85, -_camDir.z * 0.45).normalize()
          : new THREE.Vector3(0, 1, 0);

      const dragPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(planeNormal, e.point);

      // Switch pulled block to pure 1D kinematic rail with near-zero sliding friction:
      // - Zero sideways bulldozing into same-row neighbors (BLOCK_GAP stays untouched!)
      // - Zero friction shear yanking upper rows off-center
      // - Remains a real physical support underneath upper blocks until it physically exits the stack!
      setBodyFriction(body, DRAG_BLOCK_FRICTION);
      body.setBodyType(rapier.RigidBodyType.KinematicPositionBased, true);

      dragRef.current = {
        blockId: block.id,
        body,
        dragPlane,
        startHit: e.point.clone(),
        startBodyPos: new THREE.Vector3(t.x, t.y, t.z),
        startQuat,
        pullAxis,
        currentAlong: 0,
        level: block.level,
      };

      // Mark the origin gap & pull direction in 3D so all players clearly see where this brick is removed
      const player = state.players[state.currentPlayerIndex];
      const initPullSign =
        (e.point.x - t.x) * pullAxis.x + (e.point.z - t.z) * pullAxis.z >= 0 ? 1 : -1;
      setActiveMoveVisual({
        playerName: player?.name ?? 'Player',
        playerColor: player?.color ?? PALETTE.electricAqua,
        blockId: block.id,
        fromLevel: block.level,
        fromSlot: block.slot,
        fromPosition: [t.x, t.y, t.z],
        fromRotationY: block.orientation === 0 ? 0 : Math.PI / 2,
        pullDirection: [pullAxis.x * initPullSign, 0, pullAxis.z * initPullSign],
        stage: 'extracting',
        timestamp: Date.now(),
      });

      startDraggingBlock(block.id);
    },
    [camera, rapier, showFeedback, startDraggingBlock, setActiveMoveVisual]
  );

  // Per-frame physics interaction, placement, and structural collapse monitor
  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    const state = useGameStore.getState();

    if (state.screen === 'playing' && !state.isPaused) {
      tickChallengeTimer(dt);
    }

    // 1. Dramatic collapse slow-motion
    if (state.turnPhase === 'collapsing' && !state.isPaused) {
      collapseElapsedRef.current += dt;
      const slowWindow = reducedMotion ? 0 : 0.9;

      if (collapseElapsedRef.current < slowWindow) {
        onSlowMoChange(true);
        const progress = collapseElapsedRef.current / slowWindow;
        const scale = THREE.MathUtils.lerp(0.34, 0.9, progress * progress);
        step(Math.max(1 / 240, dt * scale));
      } else {
        onSlowMoChange(false);
      }

      if (collapseElapsedRef.current >= 2.75) {
        finishCollapseToGameOver();
      }
      return;
    }

    if (state.screen !== 'playing' || state.isPaused) return;

    const activePlayer = state.players[state.currentPlayerIndex];
    const isAiTurn = Boolean(activePlayer?.isAI);
    const hasRemoteReplay = state.mode === 'live' && Boolean(state.pendingRemoteMove);
    const isAutomatedTurn = isAiTurn || hasRemoteReplay || Boolean(aiTurnRef.current);

    // 1.5 Autonomous Computer OR Live Remote Player Replay (physical 3D pull + curved carry arc + vertical drop)
    if (isAutomatedTurn) {
      if (state.turnPhase === 'ready' && !aiTurnRef.current) {
        const remoteMv = state.pendingRemoteMove;
        const chosen = remoteMv
          ? state.blocks.find((b) => b.id === remoteMv.blockId) ?? null
          : pickAiBlock(state.blocks, state.aiDifficulty, state.movesCount);
        if (remoteMv) consumeRemoteMove();
        const body = chosen ? bodyRefs.current.get(chosen.id) : undefined;
        if (chosen && body) {
          const t = body.translation();
          const q = body.rotation();
          const startQuat = new THREE.Quaternion(q.x, q.y, q.z, q.w);
          const pullAxis = new THREE.Vector3(1, 0, 0).applyQuaternion(startQuat);
          pullAxis.y = 0;
          if (pullAxis.lengthSq() < 0.001) pullAxis.set(1, 0, 0);
          pullAxis.normalize();

          camera.getWorldPosition(_tempVec);
          const dotCam = pullAxis.x * _tempVec.x + pullAxis.z * _tempVec.z;
          const pullDir: 1 | -1 = dotCam >= 0 ? 1 : -1;
          const pullVecX = pullAxis.x * pullDir;
          const pullVecZ = pullAxis.z * pullDir;

          const pullAzimuth = Math.atan2(pullVecX, pullVecZ);
          focusCameraAzimuth(pullAzimuth + 0.58);

          // Pre-resolve exact remote destination slot if replaying a friend's live move
          let forcedSlot: PlacementSlot | null = null;
          if (remoteMv) {
            const slots = getAvailablePlacementSlots(state.blocks, chosen.id);
            forcedSlot =
              slots.find((s) => s.level === remoteMv.toLevel && s.slot === remoteMv.toSlot) ??
              slots[0] ??
              null;
          }

          aiTurnRef.current = {
            stage: 'thinking',
            elapsed: remoteMv ? 0.55 : 0,
            block: chosen,
            body,
            pullAxis,
            pullDir,
            startPos: new THREE.Vector3(t.x, t.y, t.z),
            startQuat,
            exitPos: null,
            carryCurve: null,
            targetSlot: forcedSlot,
            targetQuat: new THREE.Quaternion(),
            placementOffset: remoteMv
              ? 0
              : state.aiDifficulty === 'casual'
                ? (Math.random() - 0.5) * 0.14
                : (Math.random() - 0.5) * 0.06,
          };

          const moverName = remoteMv?.playerName ?? activePlayer?.name ?? 'Computer';
          const moverColor = remoteMv?.playerColor ?? activePlayer?.color ?? PALETTE.warmTangerine;
          setHoveredBlock(chosen.id);
          setActiveMoveVisual({
            playerName: moverName,
            playerColor: moverColor,
            blockId: chosen.id,
            fromLevel: chosen.level,
            fromSlot: chosen.slot,
            fromPosition: [t.x, t.y, t.z],
            fromRotationY: chosen.orientation === 0 ? 0 : Math.PI / 2,
            pullDirection: [pullVecX, 0, pullVecZ],
            stage: 'inspecting',
            timestamp: Date.now(),
          });
          showFeedback(`${moverName} eyeing Level ${chosen.level + 1}...`, 'tangerine');
        }
      }

      const ai = aiTurnRef.current;
      if (ai) {
        ai.elapsed += dt;

        if (ai.stage === 'thinking' && state.turnPhase === 'ready') {
          if (ai.elapsed >= 0.85) {
            ai.stage = 'pulling';
            ai.elapsed = 0;
            setHoveredBlock(null);
            setBodyFriction(ai.body, DRAG_BLOCK_FRICTION);
            ai.body.setBodyType(rapier.RigidBodyType.KinematicPositionBased, true);
            startDraggingBlock(ai.block.id);

            const curV = useGameStore.getState().activeMoveVisual;
            if (curV) {
              setActiveMoveVisual({ ...curV, stage: 'extracting', timestamp: Date.now() });
            }
            showFeedback(`Computer pulling from Level ${ai.block.level + 1}...`, 'tangerine');
          }
        } else if (ai.stage === 'pulling' && state.turnPhase === 'dragging') {
          const duration = 1.35;
          const p = Math.min(1, ai.elapsed / duration);
          const eased = p * p * (3 - 2 * p);
          const targetDist = EXTRACTION_CLEARANCE_RADIUS + 0.45;
          const along = eased * targetDist * ai.pullDir;

          const nextX = ai.startPos.x + ai.pullAxis.x * along;
          const nextZ = ai.startPos.z + ai.pullAxis.z * along;
          const nextY = ai.startPos.y - 0.004;

          ai.body.setNextKinematicTranslation({ x: nextX, y: nextY, z: nextZ });
          ai.body.setNextKinematicRotation({
            x: ai.startQuat.x,
            y: ai.startQuat.y,
            z: ai.startQuat.z,
            w: ai.startQuat.w,
          });
          soundEngine.setDragFriction(Math.sin(p * Math.PI) * 2.2);

          if (p >= 1) {
            setBodyFriction(ai.body, REST_BLOCK_FRICTION);
            setBodySensor(ai.body, true); // Held in air during carry arc so it never clips upper tower blocks
            wakeAllBlocks();
            markBlockExtracted(ai.block.id);

            const slots = getAvailablePlacementSlots(state.blocks, ai.block.id);
            // Respect pre-resolved remote friend slot, otherwise pick intelligently for AI
            const preferred =
              ai.targetSlot ??
              (state.aiDifficulty === 'sharp'
                ? slots.find((s) => s.slot === 0) ?? slots[Math.floor(Math.random() * slots.length)] ?? null
                : slots[Math.floor(Math.random() * slots.length)] ?? null);
            const exitPoint: [number, number, number] = [nextX, nextY, nextZ];
            ai.exitPos = exitPoint;
            ai.targetSlot = preferred;
            ai.stage = 'carrying';
            ai.elapsed = 0;

            if (preferred) {
              chosenSlotRef.current = preferred;
              const idx = Math.max(0, slots.indexOf(preferred));
              setActiveSlotIndex(idx);
              manualOffsetRef.current = ai.placementOffset;
              const tx = preferred.position[0] + (preferred.orientation === 0 ? ai.placementOffset : 0);
              const tz = preferred.position[2] + (preferred.orientation === 1 ? ai.placementOffset : 0);
              const destHover: [number, number, number] = [tx, preferred.position[1] + 0.35, tz];
              ai.carryCurve = buildCarryArcCurve(exitPoint, preferred.position);
              ai.targetQuat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), preferred.rotationY);
              placementTargetPos.current.set(...destHover);
              placementTargetRotY.current = preferred.rotationY;
              setPlacementValid(true);

              const curV = useGameStore.getState().activeMoveVisual;
              if (curV) {
                setActiveMoveVisual({
                  ...curV,
                  exitPosition: exitPoint,
                  toLevel: preferred.level,
                  toSlot: preferred.slot,
                  toPosition: preferred.position,
                  toRotationY: preferred.rotationY,
                  stage: 'carrying',
                  timestamp: Date.now(),
                });
              }
              const slotName =
                preferred.slot === 0 ? 'Center' : preferred.slot === -1 ? 'Left' : 'Right';
              showFeedback(
                `Computer lifting to Level ${preferred.level + 1} (${slotName})...`,
                'tangerine'
              );
            }
          }
        } else if (ai.stage === 'carrying' && state.turnPhase === 'placing' && ai.carryCurve) {
          const carryDuration = 1.25;
          const p = Math.min(1, ai.elapsed / carryDuration);
          const eased = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;

          // Follow outward 3D carry arc smoothly around the tower while rotating cleanly to top orientation!
          const arcPt = ai.carryCurve.getPoint(eased);
          ai.body.setNextKinematicTranslation({ x: arcPt.x, y: arcPt.y, z: arcPt.z });

          _tempQuat.copy(ai.startQuat).slerp(ai.targetQuat, eased);
          ai.body.setNextKinematicRotation({
            x: _tempQuat.x,
            y: _tempQuat.y,
            z: _tempQuat.z,
            w: _tempQuat.w,
          });

          if (p >= 1) {
            ai.stage = 'lowering';
            ai.elapsed = 0;
          }
        } else if (ai.stage === 'lowering' && state.turnPhase === 'placing' && ai.targetSlot) {
          const lowerDuration = 0.42;
          const p = Math.min(1, ai.elapsed / lowerDuration);
          const eased = 1 - Math.pow(1 - p, 2);
          const slot = ai.targetSlot;
          const tx = slot.position[0] + (slot.orientation === 0 ? ai.placementOffset : 0);
          const tz = slot.position[2] + (slot.orientation === 1 ? ai.placementOffset : 0);
          const y = THREE.MathUtils.lerp(slot.position[1] + 0.62, slot.position[1] + 0.08, eased);

          ai.body.setNextKinematicTranslation({ x: tx, y, z: tz });
          ai.body.setNextKinematicRotation({
            x: ai.targetQuat.x,
            y: ai.targetQuat.y,
            z: ai.targetQuat.z,
            w: ai.targetQuat.w,
          });

          if (p >= 1) {
            const slotToDrop = ai.targetSlot;
            aiTurnRef.current = null;
            confirmPlacement(slotToDrop, true);
          }
        }
      }
    } else if (aiTurnRef.current) {
      aiTurnRef.current = null;
    }

    // 2. Pure 1D lengthwise sliding rail extraction (Human player)
    if (!isAutomatedTurn && state.turnPhase === 'dragging' && dragRef.current) {
      const session = dragRef.current;
      _raycaster.setFromCamera(pointer, camera);

      if (_raycaster.ray.intersectPlane(session.dragPlane, _hitPoint)) {
        const deltaVec = _hitPoint.clone().sub(session.startHit);
        const desiredAlong = deltaVec.dot(session.pullAxis);

        // Smoothly ease along the 1D rail with capped tactile speed
        const prevAlong = session.currentAlong;
        const maxStep = 6.2 * dt;
        const diff = desiredAlong - prevAlong;
        const stepAlong = THREE.MathUtils.clamp(diff * Math.min(1, dt * 16), -maxStep, maxStep);
        session.currentAlong = prevAlong + stepAlong;

        const slideSpeed = Math.abs(stepAlong) / Math.max(dt, 0.008);
        soundEngine.setDragFriction(slideSpeed * 0.7);

        const nextX = session.startBodyPos.x + session.pullAxis.x * session.currentAlong;
        const nextZ = session.startBodyPos.z + session.pullAxis.z * session.currentAlong;
        // Microscopic 4mm downward release prevents upward wedging against the layer directly above
        const nextY = session.startBodyPos.y - 0.004;

        session.body.setNextKinematicTranslation({ x: nextX, y: nextY, z: nextZ });
        session.body.setNextKinematicRotation({
          x: session.startQuat.x,
          y: session.startQuat.y,
          z: session.startQuat.z,
          w: session.startQuat.w,
        });

        // Once the block clears the tower footprint, wake the stack so real gravity tests remaining support!
        const alongFromCenter = Math.abs(
          nextX * session.pullAxis.x + nextZ * session.pullAxis.z
        );
        if (alongFromCenter >= EXTRACTION_CLEARANCE_RADIUS) {
          dragRef.current = null;
          setBodyFriction(session.body, REST_BLOCK_FRICTION);
          setBodySensor(session.body, true); // Held in air during placement aiming so it never sweeps the side of the tower
          wakeAllBlocks();

          const slots = getAvailablePlacementSlots(state.blocks, session.blockId);
          const firstSlot = slots[0];
          const curV = useGameStore.getState().activeMoveVisual;
          if (curV) {
            const sign = session.currentAlong >= 0 ? 1 : -1;
            setActiveMoveVisual({
              ...curV,
              pullDirection: [session.pullAxis.x * sign, 0, session.pullAxis.z * sign],
              exitPosition: [nextX, nextY, nextZ],
              toLevel: firstSlot?.level,
              toSlot: firstSlot?.slot,
              toPosition: firstSlot?.position,
              toRotationY: firstSlot?.rotationY,
              stage: 'carrying',
              timestamp: Date.now(),
            });
          }
          markBlockExtracted(session.blockId);
        }
      }
    }

    // 3. Smooth kinematic top-slot placement aiming (Human player)
    if (!isAutomatedTurn && state.turnPhase === 'placing' && state.selectedBlockId && availableSlots.length > 0) {
      const body = bodyRefs.current.get(state.selectedBlockId);
      if (body) {
        const targetY = availableSlots[0].position[1];
        const placePlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -(targetY + 0.52));
        _raycaster.setFromCamera(pointer, camera);

        if (_raycaster.ray.intersectPlane(placePlane, _hitPoint)) {
          let bestSlot: PlacementSlot | null = null;
          let bestDist = Infinity;
          let bestIdx = 0;

          availableSlots.forEach((slot, idx) => {
            const dx = _hitPoint.x - slot.position[0];
            const dz = _hitPoint.z - slot.position[2];
            const perp = slot.orientation === 0 ? Math.abs(dz) : Math.abs(dx);
            const along = slot.orientation === 0 ? Math.abs(dx) : Math.abs(dz);
            const scoreDist = perp * 1.45 + along * 0.35;
            if (scoreDist < bestDist) {
              bestDist = scoreDist;
              bestSlot = slot;
              bestIdx = idx;
            }
          });

          if (bestSlot) {
            const slot: PlacementSlot = bestSlot;
            const perpDist =
              slot.orientation === 0
                ? Math.abs(_hitPoint.z - slot.position[2])
                : Math.abs(_hitPoint.x - slot.position[0]);
            const alongDelta =
              slot.orientation === 0
                ? _hitPoint.x - slot.position[0]
                : _hitPoint.z - slot.position[2];

            // Strict slot footprint check so hovering over an occupied slot clearly marks it invalid!
            const valid = perpDist <= 0.68 && Math.abs(alongDelta) <= 2.35;

            if (valid !== state.isPlacementValid) {
              setPlacementValid(valid);
            }

            if (valid) {
              chosenSlotRef.current = slot;
              if (bestIdx !== activeSlotIndex) {
                setActiveSlotIndex(bestIdx);
                const curV = useGameStore.getState().activeMoveVisual;
                if (curV) {
                  setActiveMoveVisual({
                    ...curV,
                    toLevel: slot.level,
                    toSlot: slot.slot,
                    toPosition: slot.position,
                    toRotationY: slot.rotationY,
                  });
                }
              }
              const clampedAlong = THREE.MathUtils.clamp(alongDelta * 0.1, -0.07, 0.07);
              manualOffsetRef.current = clampedAlong;
              const tx = slot.position[0] + (slot.orientation === 0 ? clampedAlong : 0);
              const tz = slot.position[2] + (slot.orientation === 1 ? clampedAlong : 0);
              placementTargetPos.current.set(tx, slot.position[1] + 0.54, tz);
              placementTargetRotY.current = slot.rotationY;
            } else {
              const clampedX = THREE.MathUtils.clamp(_hitPoint.x, -4.6, 4.6);
              const clampedZ = THREE.MathUtils.clamp(_hitPoint.z, -4.6, 4.6);
              placementTargetPos.current.set(clampedX, targetY + 0.72, clampedZ);
              placementTargetRotY.current = slot.rotationY;
            }
          }
        }

        const curT = body.translation();
        _tempVec.set(curT.x, curT.y, curT.z).lerp(placementTargetPos.current, Math.min(1, dt * 13));
        body.setNextKinematicTranslation({ x: _tempVec.x, y: _tempVec.y, z: _tempVec.z });

        _tempQuat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), placementTargetRotY.current);
        body.setNextKinematicRotation({
          x: _tempQuat.x,
          y: _tempQuat.y,
          z: _tempQuat.z,
          w: _tempQuat.w,
        });
      }
    }

    // 4. Settling verification after top placement
    if (state.turnPhase === 'settling') {
      settleElapsedRef.current += dt;
      if (settleElapsedRef.current >= 1.0) {
        completeTurnAfterSettle();
      }
    }

    // 5. Genuine Structural Collapse Detection (zero false positives)
    if (
      performance.now() - spawnTimeRef.current > 1500 &&
      (state.turnPhase === 'ready' ||
        state.turnPhase === 'dragging' ||
        state.turnPhase === 'placing' ||
        state.turnPhase === 'settling')
    ) {
      let fallenCount = 0;
      let fellOffPedestalCount = 0;

      for (const b of state.blocks) {
        if (state.turnPhase === 'placing' && b.id === state.selectedBlockId) continue;
        if (state.turnPhase === 'dragging' && b.id === state.selectedBlockId) continue;

        const body = bodyRefs.current.get(b.id);
        if (!body) continue;

        const pos = body.translation();
        const rot = body.rotation();

        if (pos.y < -0.5) {
          fellOffPedestalCount++;
          fallenCount++;
          continue;
        }

        const expectedY =
          PEDESTAL_TOP_Y + BLOCK_HEIGHT * 0.5 + b.level * (BLOCK_HEIGHT + LAYER_VERTICAL_GAP);
        const droppedFar = b.level >= 2 && (pos.y < BLOCK_HEIGHT * 0.85 || expectedY - pos.y > 1.85);

        _tempQuat.set(rot.x, rot.y, rot.z, rot.w);
        _tempUp.set(0, 1, 0).applyQuaternion(_tempQuat);
        const severelyTilted = b.level >= 1 && _tempUp.y < 0.42;

        if (droppedFar || severelyTilted) {
          fallenCount++;
        }
      }

      const isCollapsingNow = fallenCount >= 2 || fellOffPedestalCount >= 1;

      if (isCollapsingNow) {
        collapseConfirmTimerRef.current += dt;
      } else {
        collapseConfirmTimerRef.current = 0;
      }

      if (collapseConfirmTimerRef.current >= 0.32) {
        if (state.selectedBlockId) {
          const heldBody = bodyRefs.current.get(state.selectedBlockId);
          if (heldBody) {
            try {
              setBodySensor(heldBody, false);
              setBodyFriction(heldBody, REST_BLOCK_FRICTION);
              heldBody.setBodyType(rapier.RigidBodyType.Dynamic, true);
            } catch {
              // Ignore
            }
          }
        }
        dragRef.current = null;
        aiTurnRef.current = null;
        collapseElapsedRef.current = 0;
        collapseConfirmTimerRef.current = 0;
        triggerCollapse(
          fellOffPedestalCount >= 1
            ? 'Blocks tumbled off the pedestal!'
            : 'Timber! The tower lost balance and collapsed.'
        );
      }
    }
  });

  const handleCollisionEnter = useCallback(
    (payload: { target: { rigidBody?: RapierRigidBody }; other: { rigidBody?: RapierRigidBody } }) => {
      if (performance.now() - spawnTimeRef.current < 1200) return;
      const bodyA = payload.target.rigidBody;
      const bodyB = payload.other.rigidBody;
      let relSpeed = 0;
      try {
        const va = bodyA ? bodyA.linvel() : { x: 0, y: 0, z: 0 };
        const vb = bodyB ? bodyB.linvel() : { x: 0, y: 0, z: 0 };
        relSpeed = Math.hypot(va.x - vb.x, va.y - vb.y, va.z - vb.z);
      } catch {
        return;
      }
      // Only trigger hardwood clack on real kinetic impacts (never on resting tower weight)
      if (relSpeed > 1.25) {
        const normalized = Math.min(1, (relSpeed - 1.25) / 6.5);
        soundEngine.playWoodCollision(normalized);
      }
    },
    []
  );

  return (
    <group>
      {/* Fixed Physical Pedestal & Arena Floor */}
      <RigidBody type="fixed" colliders={false} friction={0.78} restitution={0.02}>
        <CylinderCollider
          args={[PEDESTAL_HEIGHT * 0.5, PEDESTAL_RADIUS]}
          position={[0, PEDESTAL_TOP_Y - PEDESTAL_HEIGHT * 0.5, 0]}
        />
        <CuboidCollider
          args={[45, 0.5, 45]}
          position={[0, PEDESTAL_TOP_Y - PEDESTAL_HEIGHT - 2.8, 0]}
        />
      </RigidBody>

      {/* 54 Individual Physical Wooden Jenga Blocks */}
      {blocks.map((block) => {
        const eligibleCheck = isBlockEligible(block, blocks);
        const isHovered = hoveredBlockId === block.id && screen === 'playing' && turnPhase === 'ready';
        const isSelected = selectedBlockId === block.id && turnPhase === 'dragging';
        const isPlacingThis = selectedBlockId === block.id && turnPhase === 'placing';

        return (
          <RigidBody
            key={`${runId}-${block.id}`}
            ref={(rb) => {
              if (rb) {
                bodyRefs.current.set(block.id, rb);
              } else {
                bodyRefs.current.delete(block.id);
              }
            }}
            type="dynamic"
            colliders={false}
            position={block.initialPosition}
            rotation={block.initialRotation}
            linearDamping={0.42}
            angularDamping={0.68}
            ccd={false}
            canSleep={true}
            onCollisionEnter={handleCollisionEnter}
          >
            <CuboidCollider
              args={[BLOCK_LENGTH * 0.5, BLOCK_HEIGHT * 0.5, BLOCK_WIDTH * 0.5]}
              friction={REST_BLOCK_FRICTION}
              restitution={0.01}
              density={1.3}
            />
            <JengaBlockMesh
              woodVariant={block.woodVariant}
              isHovered={isHovered}
              isSelected={isSelected}
              isEligible={eligibleCheck.eligible}
              isInvalidFlash={invalidFlashId === block.id}
              isPlacing={isPlacingThis}
              isPlacementValid={isPlacementValid}
              playerAccentColor={activePlayerColor}
              onPointerOver={(e) => {
                const st = useGameStore.getState();
                if (screen !== 'playing' || turnPhase !== 'ready' || st.players[st.currentPlayerIndex]?.isAI) return;
                e.stopPropagation();
                setHoveredBlock(block.id);
              }}
              onPointerOut={(e) => {
                if (screen !== 'playing') return;
                e.stopPropagation();
                if (useGameStore.getState().hoveredBlockId === block.id) {
                  setHoveredBlock(null);
                }
              }}
              onPointerDown={(e) => handleBlockPointerDown(block, e)}
            />
          </RigidBody>
        );
      })}

      {/* Translucent Architectural Placement Slot Guides on Top of the Tower */}
      {screen === 'playing' &&
        turnPhase === 'placing' &&
        availableSlots.map((slot, idx) => {
          const isActive = idx === activeSlotIndex && isPlacementValid;
          return (
            <group
              key={`slot-${slot.level}-${slot.slot}`}
              position={slot.position}
              rotation={[0, slot.rotationY, 0]}
              onClick={(e) => {
                const st = useGameStore.getState();
                if (st.players[st.currentPlayerIndex]?.isAI) return;
                e.stopPropagation();
                chosenSlotRef.current = slot;
                setActiveSlotIndex(idx);
                setPlacementValid(true);
                confirmPlacement(slot);
              }}
            >
              <mesh>
                <boxGeometry args={[BLOCK_LENGTH * 0.98, BLOCK_HEIGHT * 0.94, BLOCK_WIDTH * 0.94]} />
                <meshBasicMaterial
                  color={isActive ? PALETTE.electricAqua : PALETTE.vividPeriwinkle}
                  transparent
                  opacity={isActive ? 0.24 : 0.1}
                  depthWrite={false}
                />
              </mesh>
              <lineSegments geometry={slotEdgesGeo}>
                <lineBasicMaterial
                  color={isActive ? PALETTE.electricAqua : '#7B94B8'}
                  transparent
                  opacity={isActive ? 0.95 : 0.45}
                />
              </lineSegments>
            </group>
          );
        })}
    </group>
  );
};

export const PhysicsTower: React.FC = () => {
  const runId = useGameStore((s) => s.runId);
  const isPaused = useGameStore((s) => s.isPaused);
  const [slowMoActive, setSlowMoActive] = useState(false);

  const handleSlowMoChange = useCallback((active: boolean) => {
    setSlowMoActive((prev) => (prev === active ? prev : active));
  }, []);

  return (
    <Physics
      key={runId}
      gravity={[0, -9.81, 0]}
      timeStep={1 / 60}
      paused={isPaused || slowMoActive}
      numSolverIterations={16}
      numAdditionalFrictionIterations={12}
      numInternalPgsIterations={2}
      allowedLinearError={0.0005}
      predictionDistance={0.002}
      interpolate
    >
      <PhysicsTowerInner runId={runId} onSlowMoChange={handleSlowMoChange} />
    </Physics>
  );
};
