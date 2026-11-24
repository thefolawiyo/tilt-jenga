import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useGameStore } from '../store/useGameStore';
import { BLOCK_HEIGHT } from '../engine/constants';

export const CameraRig: React.FC = () => {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const { camera, size } = useThree();

  const screen = useGameStore((s) => s.screen);
  const turnPhase = useGameStore((s) => s.turnPhase);
  const isDraggingBlock = useGameStore((s) => s.isDraggingBlock);
  const towerHeightLevels = useGameStore((s) => s.towerHeightLevels);
  const cameraSensitivity = useGameStore((s) => s.settings.cameraSensitivity);
  const reducedMotion = useGameStore((s) => s.settings.reducedMotion);
  const cameraCommand = useGameStore((s) => s.cameraCommand);

  const desiredTarget = useRef(new THREE.Vector3(0, 5.2, 0));
  const shakeIntensity = useRef(0);
  const lastCommandNonce = useRef<number>(0);
  const orbitTargetAzimuth = useRef<number | null>(null);
  const orbitTargetDistance = useRef<number | null>(null);
  const prevPhase = useRef(turnPhase);

  // Trigger subtle dramatic camera shake & framing pullback on collapse
  useEffect(() => {
    if (turnPhase === 'collapsing' && prevPhase.current !== 'collapsing') {
      shakeIntensity.current = reducedMotion ? 0 : 0.36;
      if (controlsRef.current) {
        const currentDist = camera.position.distanceTo(controlsRef.current.target);
        orbitTargetDistance.current = Math.max(currentDist, 16.5);
      }
    }
    prevPhase.current = turnPhase;
  }, [turnPhase, reducedMotion, camera]);

  // Execute discrete HUD camera commands (rotate left/right, zoom, reset)
  useEffect(() => {
    if (!cameraCommand || cameraCommand.nonce === lastCommandNonce.current || !controlsRef.current) {
      return;
    }
    lastCommandNonce.current = cameraCommand.nonce;
    const controls = controlsRef.current;

    const currentAz = controls.getAzimuthalAngle();
    const currentDist = camera.position.distanceTo(controls.target);

    if (cameraCommand.type === 'rotateLeft') {
      orbitTargetAzimuth.current = (orbitTargetAzimuth.current ?? currentAz) - Math.PI / 4;
    } else if (cameraCommand.type === 'rotateRight') {
      orbitTargetAzimuth.current = (orbitTargetAzimuth.current ?? currentAz) + Math.PI / 4;
    } else if (cameraCommand.type === 'focusAzimuth') {
      // Shortest-path angular glide so Computer's pull side is always clearly visible
      const diff = Math.atan2(
        Math.sin(cameraCommand.azimuth - currentAz),
        Math.cos(cameraCommand.azimuth - currentAz)
      );
      orbitTargetAzimuth.current = currentAz + diff;
    } else if (cameraCommand.type === 'zoomIn') {
      orbitTargetDistance.current = Math.max(11.0, (orbitTargetDistance.current ?? currentDist) - 2.6);
    } else if (cameraCommand.type === 'zoomOut') {
      orbitTargetDistance.current = Math.min(24.0, (orbitTargetDistance.current ?? currentDist) + 2.6);
    } else if (cameraCommand.type === 'reset') {
      const isNarrow = size.width < 768;
      const towerMidY = Math.max(isNarrow ? 5.9 : 5.0, (towerHeightLevels * BLOCK_HEIGHT) * (isNarrow ? 0.56 : 0.5));
      controls.target.set(0, towerMidY, 0);
      const dist = isNarrow ? 26.8 : 21.2;
      camera.position.set(dist * 0.66, towerMidY + 5.0, dist * 0.75);
      orbitTargetAzimuth.current = null;
      orbitTargetDistance.current = null;
      controls.update();
    }
  }, [cameraCommand, camera, size.width, towerHeightLevels]);

  // Set crisp initial three-quarter framing on mount with generous vertical headroom
  useEffect(() => {
    const isNarrow = size.width < 768;
    const dist = isNarrow ? 26.8 : 21.4;
    camera.position.set(dist * 0.65, 10.6, dist * 0.76);
    if (controlsRef.current) {
      controlsRef.current.target.set(isNarrow ? 0 : -2.9, isNarrow ? 5.9 : 5.4, 0);
      controlsRef.current.update();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame((state, delta) => {
    const controls = controlsRef.current;
    if (!controls) return;
    const dt = Math.min(delta, 0.05);
    const isDesktop = size.width >= 960;
    const towerTopY = towerHeightLevels * BLOCK_HEIGHT;

    if (screen !== 'playing') {
      // Art-directed hero framing: shift target slightly left on desktop Main Menu so tower owns the right half
      const targetX = screen === 'menu' && isDesktop ? -2.85 : 0;
      const targetY = screen === 'menu' ? 5.2 : 5.4;
      desiredTarget.current.set(targetX, targetY, 0);
      controls.target.lerp(desiredTarget.current, dt * 3.2);

      // Gentle cinematic idle orbit around the hero tower
      if (!reducedMotion) {
        const angle = state.clock.elapsedTime * 0.14;
        const radius = isDesktop ? 21.2 : 24.5;
        const desiredX = targetX + Math.sin(angle + 0.75) * radius;
        const desiredZ = Math.cos(angle + 0.75) * radius;
        const desiredY = 10.4 + Math.sin(state.clock.elapsedTime * 0.35) * 0.45;
        camera.position.lerp(new THREE.Vector3(desiredX, desiredY, desiredZ), dt * 2.2);
      }
      controls.update();
      return;
    }

    // Gameplay vertical target tracking
    if (turnPhase === 'placing') {
      // Elevate gaze toward the top of the tower so slot placement is crystal clear
      desiredTarget.current.set(0, towerTopY - 0.5, 0);
      controls.target.lerp(desiredTarget.current, dt * 4.2);

      // Ensure camera is comfortably above the tower top for a clear placement view
      const minPlacingCamY = towerTopY + 3.6;
      if (camera.position.y < minPlacingCamY) {
        camera.position.y = THREE.MathUtils.lerp(camera.position.y, minPlacingCamY, dt * 3.5);
      }
    } else if (turnPhase === 'collapsing' || turnPhase === 'gameover') {
      desiredTarget.current.set(0, 3.2, 0);
      controls.target.lerp(desiredTarget.current, dt * 2.5);
    } else {
      const isNarrow = size.width < 768;
      const midY = Math.max(isNarrow ? 5.8 : 4.4, towerTopY * (isNarrow ? 0.56 : 0.48));
      desiredTarget.current.set(0, midY, 0);
      controls.target.lerp(desiredTarget.current, dt * 2.4);
    }

    // Smoothly apply discrete button-driven azimuth rotation
    if (orbitTargetAzimuth.current !== null) {
      const offset = camera.position.clone().sub(controls.target);
      const spherical = new THREE.Spherical().setFromVector3(offset);
      const diff = orbitTargetAzimuth.current - spherical.theta;
      if (Math.abs(diff) < 0.008) {
        orbitTargetAzimuth.current = null;
      } else {
        spherical.theta += diff * Math.min(1, dt * 9);
        offset.setFromSpherical(spherical);
        camera.position.copy(controls.target).add(offset);
      }
    }

    // Smoothly apply discrete button-driven zoom or collapse pull-back
    if (orbitTargetDistance.current !== null) {
      const offset = camera.position.clone().sub(controls.target);
      const currentDist = offset.length();
      const diff = orbitTargetDistance.current - currentDist;
      if (Math.abs(diff) < 0.05) {
        orbitTargetDistance.current = null;
      } else {
        offset.setLength(currentDist + diff * Math.min(1, dt * 6));
        camera.position.copy(controls.target).add(offset);
      }
    }

    // Subtle damped camera shake during tower collapse
    if (shakeIntensity.current > 0.004) {
      const s = shakeIntensity.current;
      camera.position.x += (Math.random() - 0.5) * s;
      camera.position.y += (Math.random() - 0.5) * s * 0.7;
      camera.position.z += (Math.random() - 0.5) * s;
      shakeIntensity.current *= Math.pow(0.06, dt);
    } else {
      shakeIntensity.current = 0;
    }

    controls.update();
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enabled={screen === 'playing' && !isDraggingBlock}
      enableDamping
      dampingFactor={0.075}
      enablePan={false}
      rotateSpeed={0.72 * cameraSensitivity}
      zoomSpeed={0.85 * cameraSensitivity}
      minDistance={10.5}
      maxDistance={24.5}
      minPolarAngle={0.25}
      maxPolarAngle={Math.PI * 0.465}
      onStart={() => {
        orbitTargetAzimuth.current = null;
        orbitTargetDistance.current = null;
      }}
    />
  );
};
