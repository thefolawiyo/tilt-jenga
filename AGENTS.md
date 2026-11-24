# TILT Jenga — Project Rules

## Git & GitHub Workflow
- Repository: `https://github.com/thefolawiyo/tilt-jenga.git` (branch `main`, remote `origin`).
- After completing and verifying any change (`npm run build` passing with zero errors), stage the modified files, create a clear, concise git commit, and push to `origin/main`.
- Never commit `node_modules/`, `dist/`, `*.tsbuildinfo`, `.env*`, or temporary scratch files.

## Physics & 3D Scene Guardrails (`@react-three/rapier`)
- Keep all `<RigidBody>` props strictly immutable after mount (`type="dynamic"`, `ccd={false}`, stable callback/array refs). Mutating `<RigidBody>` props re-invokes `setRigidBodyOptions(..., updateTranslations=true)`, which breaks kinematic brick carries and teleports blocks back to spawn.
- During mid-air kinematic carry / placement, disable collider solid contact (`setSensor(true)`) and restore `setSensor(false)` right before dropping back to dynamic physics so carried blocks never knock upper layers off.
- Use 1D lengthwise rail extraction (`DRAG_BLOCK_FRICTION = 0.005`, `REST_BLOCK_FRICTION = 0.64`) without lateral drag drift wider than `BLOCK_GAP`.
- When cloning GLB meshes for `InstancedMesh`, clear `morphAttributes = {}` and remove `skinIndex`/`skinWeight` attributes.

## Audio Guardrails (`src/audio/soundEngine.ts` & `PhysicsTower.tsx`)
- Never attach `onContactForce` to stacked `<RigidBody>` blocks for impact audio (static resting tower weight fires it continuously at 60 Hz, producing a croaking rattle). Always use `onCollisionEnter` gated by real kinetic relative velocity and a minimum collision spacing (`>= 75 ms`).
- Never use raw `sawtooth` or `square` oscillators routed through high-Q resonant bandpass filters or low-frequency LFO filter sweeps for crowd voices or friction — they produce frog-croaking/kazoo artifacts. Use clean `sine`/`triangle` tones and smooth low-Q filtered noise.

## Multiplayer & Gameplay Invariants
- Keep Live Match seat identity (`liveClientId`) per-tab in `sessionStorage` (never `localStorage`) so multiple tabs in the same browser take distinct seats and sync moves properly.
- Preserve multi-round elimination tournaments for 3–4 player matches (both Pass & Play and Live Match): when a player collapses the tower, eliminate them and continue playing fresh rounds until 1 clear champion remains.
- Preserve strict occupied-slot blocking on top layers and full 3D visual move tracking (origin beacon, carry arc, drop target, and Live/Last Move HUD) for both human and Computer turns.
