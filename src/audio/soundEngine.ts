import { GameSettings, SceneId } from '../types/game';
import { getSceneById } from '../engine/scenes';

/**
 * Studio-Mastered Procedural Audio Engine for TILT
 *
 * Features:
 * - Master DynamicsCompressor + Custom Stereo Arena Hall Convolution Reverb
 * - Euler-Bernoulli Modal Hardwood Synthesis (authentic oak/maple block clacks & impacts)
 * - Dual-band tactile wood-on-wood sliding friction with stick-slip grain
 * - Living boxing-arena crowd murmur + 36-voice stereo-panned individual hand-clap applause & vocal cheer formants
 * - Interactive Midnight Lounge Rhodes/Marimba chord progression with dynamic drag-tension filter ducking
 */
class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private sfxDryGain: GainNode | null = null;
  private sfxWetGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private musicFilter: BiquadFilterNode | null = null;
  private crowdBedGain: GainNode | null = null;
  private bedLowFilter: BiquadFilterNode | null = null;
  private bedHighFilter: BiquadFilterNode | null = null;
  private reverbNode: ConvolverNode | null = null;
  private activeSceneId: SceneId = 'boxing-ring';
  private parkChirpTimerId: number | null = null;

  private noiseBuffer: AudioBuffer | null = null;
  private frictionGain: GainNode | null = null;
  private frictionBodyFilter: BiquadFilterNode | null = null;
  private frictionGrainFilter: BiquadFilterNode | null = null;
  private frictionActive = false;

  private musicStarted = false;
  private musicTimerId: number | null = null;
  private chordIndex = 0;
  private stepIndex = 0;
  private inGameplay = false;
  private tensionActive = false;
  private lastCollisionTime = 0;

  private settings: Pick<GameSettings, 'masterVolume' | 'musicVolume' | 'sfxVolume' | 'muted'> = {
    masterVolume: 0.78,
    musicVolume: 0.36,
    sfxVolume: 0.85,
    muted: false,
  };

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;

    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();

      // Master studio compressor -> destination (punchy, never clips during 54-block collapses)
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.value = -12;
      this.compressor.knee.value = 18;
      this.compressor.ratio.value = 5.5;
      this.compressor.attack.value = 0.004;
      this.compressor.release.value = 0.16;

      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.compressor);
      this.compressor.connect(this.ctx.destination);

      // Custom Stereo Arena Hall Convolution Reverb
      this.reverbNode = this.ctx.createConvolver();
      this.reverbNode.buffer = this.createArenaImpulseResponse(1.65, 2.8);
      this.reverbNode.connect(this.masterGain);

      // SFX dry + hall wet send
      this.sfxDryGain = this.ctx.createGain();
      this.sfxWetGain = this.ctx.createGain();
      this.sfxDryGain.connect(this.masterGain);
      this.sfxWetGain.connect(this.reverbNode);

      // Music bus with dynamic low-pass filter for suspense ducking
      this.musicFilter = this.ctx.createBiquadFilter();
      this.musicFilter.type = 'lowpass';
      this.musicFilter.frequency.value = 2600;
      this.musicFilter.Q.value = 0.7;

      this.musicGain = this.ctx.createGain();
      this.musicFilter.connect(this.musicGain);
      this.musicGain.connect(this.masterGain);
      // Warm music reverb send
      const musicWet = this.ctx.createGain();
      musicWet.gain.value = 0.35;
      this.musicGain.connect(musicWet);
      musicWet.connect(this.reverbNode);

      // Subtle living arena crowd murmur bus
      this.crowdBedGain = this.ctx.createGain();
      this.crowdBedGain.gain.value = 0.0001;
      this.crowdBedGain.connect(this.sfxDryGain);

      this.createNoiseBuffer();
      this.startCrowdAmbianceBed();
      this.applyVolumes();
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    return this.ctx;
  }

  /** Algorithmic warm dark-wood arena hall stereo impulse response */
  private createArenaImpulseResponse(durationSec: number, decay: number): AudioBuffer {
    const ctx = this.ctx!;
    const sr = ctx.sampleRate;
    const len = Math.floor(sr * durationSec);
    const buffer = ctx.createBuffer(2, len, sr);

    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < len; i++) {
        const t = i / len;
        const env = Math.pow(1 - t, decay);
        // Early studio reflections + warm low-passed diffuse arena tail
        const white = Math.random() * 2 - 1;
        lp = lp * 0.62 + white * 0.38;
        const earlyBoost = i < sr * 0.04 ? 0.55 : 0.32;
        data[i] = lp * env * earlyBoost;
      }
    }
    return buffer;
  }

  private createNoiseBuffer() {
    if (!this.ctx) return;
    const sr = this.ctx.sampleRate;
    const length = sr * 6;
    const buffer = this.ctx.createBuffer(2, length, sr);
    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      let b0 = 0;
      let b1 = 0;
      let b2 = 0;
      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99765 * b0 + white * 0.099046;
        b1 = 0.963 * b1 + white * 0.2965164;
        b2 = 0.57 * b2 + white * 1.0526913;
        data[i] = (b0 + b1 + b2 + white * 0.1848) * 0.2;
      }
    }
    this.noiseBuffer = buffer;
  }

  /** Soft continuous location-tailored ambient bed (smooth low-Q room/outdoor air, zero resonance) */
  private startCrowdAmbianceBed() {
    if (!this.ctx || !this.noiseBuffer || !this.crowdBedGain) return;
    const scene = getSceneById(this.activeSceneId);

    const bands = [
      { key: 'low' as const, freq: scene.audio.bedLowFreq, q: 0.65, pan: -0.35, gain: 0.34 },
      { key: 'high' as const, freq: scene.audio.bedHighFreq, q: 0.75, pan: 0.35, gain: 0.24 },
    ];

    bands.forEach((b) => {
      const src = this.ctx!.createBufferSource();
      src.buffer = this.noiseBuffer!;
      src.loop = true;

      const filter = this.ctx!.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = b.freq;
      filter.Q.value = b.q;

      if (b.key === 'low') this.bedLowFilter = filter;
      else this.bedHighFilter = filter;

      const panner = this.ctx!.createStereoPanner();
      panner.pan.value = b.pan;

      const g = this.ctx!.createGain();
      g.gain.value = b.gain;

      src.connect(filter);
      filter.connect(g);
      g.connect(panner);
      panner.connect(this.crowdBedGain!);
      src.start(0, Math.random() * 4);
    });
  }

  /** Delicate pure-sine outdoor birdsong motif exclusively for Public Park ambience */
  private playSoftParkChirp() {
    if (!this.ctx || this.ctx.state !== 'running' || this.settings.muted) return;
    const scene = getSceneById(this.activeSceneId);
    if (!scene.audio.hasBirdsong) return;

    const now = this.ctx.currentTime + 0.04;
    const base = 2400 + Math.random() * 900;
    const pan = (Math.random() - 0.5) * 1.4;
    const notes = [base, base * 1.18];

    notes.forEach((f, idx) => {
      const t = now + idx * 0.11;
      const osc = this.ctx!.createOscillator();
      const g = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t);
      osc.frequency.exponentialRampToValueAtTime(f * 1.12, t + 0.075);

      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.022, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0002, t + 0.095);

      osc.connect(g);
      this.routeSfx(g, pan, 0.45);
      osc.start(t);
      osc.stop(t + 0.11);
    });
  }

  public setSceneAmbience(sceneId: SceneId) {
    this.activeSceneId = sceneId;
    const scene = getSceneById(sceneId);

    // Manage gentle park birdsong interval cleanly
    if (this.parkChirpTimerId !== null) {
      window.clearInterval(this.parkChirpTimerId);
      this.parkChirpTimerId = null;
    }
    if (scene.audio.hasBirdsong && typeof window !== 'undefined') {
      this.parkChirpTimerId = window.setInterval(() => {
        if (Math.random() < 0.65) {
          this.playSoftParkChirp();
        }
      }, 4200);
    }

    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (this.bedLowFilter) {
      this.bedLowFilter.frequency.setTargetAtTime(scene.audio.bedLowFreq, now, 0.35);
    }
    if (this.bedHighFilter) {
      this.bedHighFilter.frequency.setTargetAtTime(scene.audio.bedHighFreq, now, 0.35);
    }
    this.setArenaState(this.inGameplay, this.tensionActive);
  }

  public unlock() {
    const ctx = this.ensureContext();
    if (ctx && !this.musicStarted) {
      this.startLoungeMusic();
    }
  }

  public setArenaState(inGameplay: boolean, tensionActive: boolean) {
    this.inGameplay = inGameplay;
    this.tensionActive = tensionActive;
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const scene = getSceneById(this.activeSceneId);

    // Tailor continuous ambience level to the selected location & gameplay tension
    if (this.crowdBedGain) {
      const targetBed = !inGameplay
        ? scene.audio.bedBaseGain
        : tensionActive
          ? scene.audio.bedTensionGain
          : scene.audio.bedGameplayGain;
      this.crowdBedGain.gain.setTargetAtTime(targetBed, now, 0.32);
    }

    // Duck music brightness gently when player is actively sliding a risky block
    if (this.musicFilter) {
      const cutoff = tensionActive ? 880 : inGameplay ? 2200 : 2800;
      this.musicFilter.frequency.setTargetAtTime(cutoff, now, 0.22);
    }
  }

  public updateSettings(
    next: Pick<GameSettings, 'masterVolume' | 'musicVolume' | 'sfxVolume' | 'muted'>
  ) {
    this.settings = { ...next };
    this.applyVolumes();
  }

  private applyVolumes() {
    if (!this.ctx || !this.masterGain || !this.sfxDryGain || !this.sfxWetGain || !this.musicGain) {
      return;
    }
    const now = this.ctx.currentTime;
    const master = this.settings.muted ? 0 : this.settings.masterVolume;
    this.masterGain.gain.setTargetAtTime(master, now, 0.03);
    this.sfxDryGain.gain.setTargetAtTime(this.settings.sfxVolume, now, 0.03);
    this.sfxWetGain.gain.setTargetAtTime(this.settings.sfxVolume * 0.28, now, 0.03);
    this.musicGain.gain.setTargetAtTime(this.settings.musicVolume * 0.42, now, 0.08);
  }

  /**
   * Warm, sophisticated Midnight Fight-Night Rhodes Electric Piano + Velvet Sub-Bass groove
   * Progresses gracefully through Dm9 -> Bbmaj7 -> Gm9 -> A7sus4 without ever sounding repetitive.
   */
  private startLoungeMusic() {
    if (!this.ctx || !this.musicFilter || this.musicStarted) return;
    this.musicStarted = true;

    const chords = [
      { bass: 73.42, notes: [293.66, 349.23, 440.0, 523.25, 659.25] }, // Dm9
      { bass: 58.27, notes: [233.08, 293.66, 349.23, 440.0, 587.33] }, // Bbmaj7
      { bass: 98.0, notes: [293.66, 349.23, 392.0, 466.16, 587.33] },  // Gm9
      { bass: 55.0, notes: [220.0, 293.66, 329.63, 392.0, 523.25] },   // A7sus4
    ];

    const playRhodesNote = (freq: number, startTime: number, dur: number, vel: number, pan = 0) => {
      if (!this.ctx || !this.musicFilter) return;
      // Fundamental warm sine + soft tine overtone (classic Fender Rhodes bell warmth)
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const g1 = this.ctx.createGain();
      const g2 = this.ctx.createGain();
      const panner = this.ctx.createStereoPanner();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(freq, startTime);

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(freq * 2, startTime);

      g1.gain.setValueAtTime(0.0001, startTime);
      g1.gain.linearRampToValueAtTime(vel, startTime + 0.018);
      g1.gain.exponentialRampToValueAtTime(0.0006, startTime + dur);

      g2.gain.setValueAtTime(0.0001, startTime);
      g2.gain.linearRampToValueAtTime(vel * 0.16, startTime + 0.008);
      g2.gain.exponentialRampToValueAtTime(0.0004, startTime + dur * 0.35);

      panner.pan.value = pan;

      osc1.connect(g1);
      osc2.connect(g2);
      g1.connect(panner);
      g2.connect(panner);
      panner.connect(this.musicFilter);

      osc1.start(startTime);
      osc2.start(startTime);
      osc1.stop(startTime + dur + 0.04);
      osc2.stop(startTime + dur + 0.04);
    };

    const tick = () => {
      if (!this.ctx || this.ctx.state !== 'running') return;
      const now = this.ctx.currentTime + 0.04;
      const barStep = this.stepIndex % 8;
      const chord = chords[this.chordIndex % chords.length];

      if (barStep === 0) {
        // Warm velvet sub-bass root + rolled Rhodes chord
        playRhodesNote(chord.bass, now, 3.6, 0.24, 0);
        chord.notes.slice(0, 4).forEach((f, i) => {
          playRhodesNote(f, now + i * 0.032, 3.2, 0.068, (i - 1.5) * 0.22);
        });
      } else if (barStep === 3 || barStep === 6) {
        // Delicate arpeggiated studio motif note
        const pickIdx = (this.stepIndex + this.chordIndex) % chord.notes.length;
        const noteFreq = chord.notes[pickIdx];
        playRhodesNote(noteFreq, now, 1.45, 0.052, (Math.random() - 0.5) * 0.45);
      } else if (barStep === 4 && this.tensionActive) {
        // Subtle suspense heartbeat bass pulse while dragging a block
        playRhodesNote(chord.bass, now, 0.55, 0.16, 0);
      }

      this.stepIndex++;
      if (this.stepIndex % 8 === 0) {
        this.chordIndex = (this.chordIndex + 1) % chords.length;
      }
    };

    tick();
    this.musicTimerId = window.setInterval(tick, 540);
  }

  private routeSfx(node: AudioNode, pan = 0, reverbSend = 0.26) {
    if (!this.ctx || !this.sfxDryGain || !this.sfxWetGain) return;
    const panner = this.ctx.createStereoPanner();
    panner.pan.value = Math.max(-0.9, Math.min(0.9, pan));
    node.connect(panner);
    panner.connect(this.sfxDryGain);
    if (reverbSend > 0) {
      const wet = this.ctx.createGain();
      wet.gain.value = reverbSend;
      panner.connect(wet);
      wet.connect(this.sfxWetGain);
    }
  }

  /**
   * Authentic Euler-Bernoulli Hardwood Bar Modal Strike
   * Simulates real oak/maple Jenga block resonance (ratios 1.0 : 2.756 : 5.404) + sharp impact transient.
   */
  private triggerHardwoodStrike(
    fundamentalHz: number,
    amplitude: number,
    pan = 0,
    reverbSend = 0.25
  ) {
    const ctx = this.ensureContext();
    if (!ctx || !this.noiseBuffer) return;
    const now = ctx.currentTime;

    const bus = ctx.createGain();
    bus.gain.value = 1;
    this.routeSfx(bus, pan, reverbSend);

    // 1. Crisp 4ms hardwood contact transient (filtered noise burst)
    const click = ctx.createBufferSource();
    click.buffer = this.noiseBuffer;
    const clickFilter = ctx.createBiquadFilter();
    clickFilter.type = 'bandpass';
    clickFilter.frequency.value = fundamentalHz * 3.1;
    clickFilter.Q.value = 1.6;

    const clickGain = ctx.createGain();
    clickGain.gain.setValueAtTime(amplitude * 0.72, now);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.014);

    click.connect(clickFilter);
    clickFilter.connect(clickGain);
    clickGain.connect(bus);
    click.start(now, Math.random() * 1.5, 0.02);

    // 2. Three inharmonic hardwood bar vibration modes
    const modes = [
      { ratio: 1.0, gain: 0.55, decay: 0.075 },
      { ratio: 2.756, gain: 0.34, decay: 0.048 },
      { ratio: 5.404, gain: 0.16, decay: 0.026 },
    ];

    for (const m of modes) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      const f = fundamentalHz * m.ratio;
      osc.frequency.setValueAtTime(f * 1.03, now);
      osc.frequency.exponentialRampToValueAtTime(f, now + 0.012);

      g.gain.setValueAtTime(0.0005, now);
      g.gain.linearRampToValueAtTime(amplitude * m.gain, now + 0.002);
      g.gain.exponentialRampToValueAtTime(0.0005, now + m.decay);

      osc.connect(g);
      g.connect(bus);
      osc.start(now);
      osc.stop(now + m.decay + 0.01);
    }
  }

  /** Crisp wooden-marimba UI micro-click */
  public playUiClick(pitch = 1.0) {
    this.triggerHardwoodStrike(680 * pitch, 0.22, 0, 0.12);
  }

  /** Tactile oak block tap on selection / hover */
  public playWoodTap(intensity = 0.65, pitchJitter = 1.0) {
    const base = (440 + Math.random() * 95) * pitchJitter;
    this.triggerHardwoodStrike(base, Math.min(0.65, intensity * 0.55), (Math.random() - 0.5) * 0.3, 0.22);
  }

  /** Authentic muted double hardwood knock for locked top-3 levels */
  public playInvalidTap() {
    this.triggerHardwoodStrike(260, 0.34, 0, 0.12);
    setTimeout(() => this.triggerHardwoodStrike(215, 0.28, 0, 0.12), 85);
  }

  /** Tactile dual-band sanded wood-on-wood sliding friction */
  public setDragFriction(speed: number) {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxDryGain || !this.noiseBuffer) return;

    if (!this.frictionActive && speed > 0.04) {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      src.loop = true;

      // Smooth dry-wood glide (low-Q gentle filtering, no resonant flutter)
      const bodyFilter = ctx.createBiquadFilter();
      bodyFilter.type = 'bandpass';
      bodyFilter.frequency.value = 520;
      bodyFilter.Q.value = 1.05;

      const grainFilter = ctx.createBiquadFilter();
      grainFilter.type = 'bandpass';
      grainFilter.frequency.value = 2100;
      grainFilter.Q.value = 1.1;

      const bodyG = ctx.createGain();
      bodyG.gain.value = 0.45;
      const grainG = ctx.createGain();
      grainG.gain.value = 0.42;

      const masterFric = ctx.createGain();
      masterFric.gain.value = 0.0001;

      src.connect(bodyFilter);
      src.connect(grainFilter);
      bodyFilter.connect(bodyG);
      grainFilter.connect(grainG);
      bodyG.connect(masterFric);
      grainG.connect(masterFric);

      this.routeSfx(masterFric, 0, 0.14);
      src.start();

      this.frictionBodyFilter = bodyFilter;
      this.frictionGrainFilter = grainFilter;
      this.frictionGain = masterFric;
      this.frictionActive = true;
    }

    if (this.frictionGain && this.frictionBodyFilter && this.frictionGrainFilter) {
      const now = ctx.currentTime;
      const clamped = Math.min(1, Math.max(0, speed / 3.0));
      this.frictionGain.gain.setTargetAtTime(clamped * 0.18, now, 0.045);
      this.frictionBodyFilter.frequency.setTargetAtTime(460 + clamped * 320, now, 0.055);
      this.frictionGrainFilter.frequency.setTargetAtTime(1750 + clamped * 1250, now, 0.055);
    }
  }

  public stopDragFriction() {
    if (this.ctx && this.frictionGain) {
      this.frictionGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.035);
    }
  }

  /** Stereo-panned real-time physics hardwood collision clack scaled by kinetic impact speed */
  public playWoodCollision(impactStrength: number) {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    if (now - this.lastCollisionTime < 0.075) return;
    this.lastCollisionTime = now;

    const norm = Math.min(1, Math.max(0.08, impactStrength));
    const baseFreq = 320 + Math.random() * 260 + norm * 85;
    const pan = (Math.random() - 0.5) * 1.1;
    this.triggerHardwoodStrike(baseFreq, norm * 0.56, pan, 0.3);
  }

  /** Warm ascending wooden-xylophone extraction confirmation */
  public playBlockExtracted() {
    this.triggerHardwoodStrike(523.25, 0.34, -0.15, 0.32); // C5
    setTimeout(() => this.triggerHardwoodStrike(659.25, 0.36, 0.15, 0.38), 75); // E5
  }

  /** Resonant marimba chord confirmation when a stacked block holds steady */
  public playPlacementSuccess() {
    const chord = [523.25, 659.25, 783.99]; // C5, E5, G5
    chord.forEach((f, idx) => {
      setTimeout(() => {
        this.triggerHardwoodStrike(f, 0.34, (idx - 1) * 0.25, 0.42);
      }, idx * 65);
    });
  }

  /** Crisp boxing-ring corner bell / chime on turn switch */
  public playTurnChange() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const bus = ctx.createGain();
    this.routeSfx(bus, 0, 0.45);

    const freqs = [880, 1318.5, 2112];
    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now);
      g.gain.setValueAtTime(0.0005, now);
      g.gain.linearRampToValueAtTime(i === 0 ? 0.11 : 0.045, now + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0004, now + 0.45 - i * 0.1);
      osc.connect(g);
      g.connect(bus);
      osc.start(now);
      osc.stop(now + 0.5);
    });
  }

  /** Deep arena floor impact + tension drop when the tower begins collapsing */
  public playCollapseTrigger() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const bus = ctx.createGain();
    this.routeSfx(bus, 0, 0.48);

    // Cinematic sub-bass thump
    const sub = ctx.createOscillator();
    const subGain = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(112, now);
    sub.frequency.exponentialRampToValueAtTime(34, now + 0.58);

    subGain.gain.setValueAtTime(0.42, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

    sub.connect(subGain);
    subGain.connect(bus);
    sub.start(now);
    sub.stop(now + 0.68);
  }

  /** Celebratory chord + championship boxing bell + huge standing ovation */
  public playVictory() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, i) => {
      setTimeout(() => this.triggerHardwoodStrike(f, 0.42, (i - 1.5) * 0.25, 0.5), i * 85);
    });
    this.playTurnChange();
    this.playCrowdCheer(1.0);
  }

  private duckMusic(durationSec = 1.9) {
    if (!this.ctx || !this.musicGain) return;
    const now = this.ctx.currentTime;
    const normal = this.settings.musicVolume * 0.42;
    this.musicGain.gain.cancelScheduledValues(now);
    this.musicGain.gain.setTargetAtTime(normal * 0.28, now, 0.05);
    this.musicGain.gain.setTargetAtTime(normal, now + durationSec, 0.35);
  }

  /**
   * Loud, Joyful, Congratulatory Audience Applause + Sweet Celebration Chime (100% clean, zero sawtooth buzz)
   */
  public playCrowdCheer(intensity = 0.92) {
    const ctx = this.ensureContext();
    if (!ctx || !this.noiseBuffer) return;
    const now = ctx.currentTime;
    this.duckMusic(2.0);

    // 1. Sweet Congratulatory Sparkling Chime Arpeggio (G5 -> B5 -> D6 -> G6)
    const sweetNotes = [783.99, 987.77, 1174.66, 1567.98];
    sweetNotes.forEach((freq, idx) => {
      const t = now + idx * 0.072;
      const osc = ctx.createOscillator();
      const overtone = ctx.createOscillator();
      const g = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      overtone.type = 'triangle';
      overtone.frequency.setValueAtTime(freq * 2, t);

      const ovGain = ctx.createGain();
      ovGain.gain.value = 0.14;

      g.gain.setValueAtTime(0.0005, t);
      g.gain.linearRampToValueAtTime(0.17 * intensity, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0006, t + 0.68);

      osc.connect(g);
      overtone.connect(ovGain);
      ovGain.connect(g);
      this.routeSfx(g, (idx - 1.5) * 0.32, 0.55);

      osc.start(t);
      overtone.start(t);
      osc.stop(t + 0.72);
      overtone.stop(t + 0.72);
    });

    // 2. Scene-aware Applause (scales naturally from packed stadium to intimate claps, or silent in no-audience rooms!)
    const crowdScale = getSceneById(this.activeSceneId).crowd.audioReactionScale;
    if (crowdScale <= 0.01) return;

    const clapCount = Math.max(5, Math.round((44 + intensity * 24) * crowdScale));
    for (let i = 0; i < clapCount; i++) {
      const delay = 0.03 + Math.random() * 1.85;
      const t = now + delay;
      const pan = (Math.random() - 0.5) * 1.75;
      const swell = Math.sin(Math.min(1, delay / 1.9) * Math.PI);

      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer;

      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 1350 + Math.random() * 1750;
      bp.Q.value = 1.25;

      const g = ctx.createGain();
      const peak =
        (0.18 + Math.random() * 0.12) * intensity * (0.45 + swell * 0.65) * Math.max(0.35, crowdScale);
      g.gain.setValueAtTime(0.0005, t);
      g.gain.linearRampToValueAtTime(peak, t + 0.0025);
      g.gain.exponentialRampToValueAtTime(peak * 0.34, t + 0.011);
      g.gain.linearRampToValueAtTime(peak * 0.84, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0006, t + 0.048 + Math.random() * 0.02);

      src.connect(bp);
      bp.connect(g);
      this.routeSfx(g, pan, 0.42);
      src.start(t, Math.random() * 4.5, 0.08);
    }

    // 3. Smooth Airy Applause Swell (only for medium/large/very-large crowds)
    if (crowdScale < 0.45) return;
    const roarBands = [
      { f0: 950, f1: 1280, q: 0.9, pan: -0.45, vol: 0.24 * crowdScale },
      { f0: 1750, f1: 2250, q: 0.85, pan: 0.45, vol: 0.22 * crowdScale },
      { f0: 2700, f1: 3150, q: 0.8, pan: 0.0, vol: 0.14 * crowdScale },
    ];

    roarBands.forEach((rb) => {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer!;
      src.loop = true;

      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.setValueAtTime(rb.f0, now);
      f.frequency.linearRampToValueAtTime(rb.f1, now + 0.35);
      f.frequency.linearRampToValueAtTime(rb.f0 * 0.92, now + 1.85);
      f.Q.value = rb.q;

      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0005, now);
      g.gain.linearRampToValueAtTime(rb.vol * intensity, now + 0.18);
      g.gain.exponentialRampToValueAtTime(0.0006, now + 1.95);

      src.connect(f);
      f.connect(g);
      this.routeSfx(g, rb.pan, 0.52);
      src.start(now, Math.random() * 3.5);
      src.stop(now + 2.05);
    });
  }

  /**
   * Clean, Unmistakable Disappointed Crowd Sigh + Warm Sad Descending Musical Cue (zero sawtooth/frog croak)
   */
  public playCrowdBoo() {
    const ctx = this.ensureContext();
    if (!ctx || !this.noiseBuffer) return;
    const now = ctx.currentTime;
    this.duckMusic(2.4);

    // 1. Clean, Warm Sad Descending Musical Sigh (pure sine + mellow triangle, zero sawtooth buzz)
    const sadNotes = [
      { f: 392.0, tOff: 0.14, dur: 0.36, slideTo: 382 },   // G4
      { f: 369.99, tOff: 0.52, dur: 0.36, slideTo: 360 },  // F#4
      { f: 349.23, tOff: 0.9, dur: 0.36, slideTo: 340 },   // F4
      { f: 329.63, tOff: 1.28, dur: 0.92, slideTo: 293.66 }, // E4 -> D4 slow sad droop
    ];

    sadNotes.forEach((n) => {
      const t = now + n.tOff;
      const fundamental = ctx.createOscillator();
      const warmth = ctx.createOscillator();
      fundamental.type = 'sine';
      warmth.type = 'triangle';

      fundamental.frequency.setValueAtTime(n.f, t);
      fundamental.frequency.exponentialRampToValueAtTime(n.slideTo, t + n.dur);
      warmth.frequency.setValueAtTime(n.f * 0.5, t);
      warmth.frequency.exponentialRampToValueAtTime(n.slideTo * 0.5, t + n.dur);

      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 820;
      lp.Q.value = 0.7;

      const warmG = ctx.createGain();
      warmG.gain.value = 0.45;

      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0005, t);
      g.gain.linearRampToValueAtTime(0.2, t + 0.045);
      g.gain.exponentialRampToValueAtTime(0.0006, t + n.dur);

      fundamental.connect(lp);
      warmth.connect(warmG);
      warmG.connect(lp);
      lp.connect(g);
      this.routeSfx(g, 0, 0.5);

      fundamental.start(t);
      warmth.start(t);
      fundamental.stop(t + n.dur + 0.06);
      warmth.stop(t + n.dur + 0.06);
    });

    // 2. Scene-aware Crowd Disappointment Sigh (scales by location audience size; skipped in no-audience rooms!)
    const crowdScale = getSceneById(this.activeSceneId).crowd.audioReactionScale;
    if (crowdScale <= 0.01) return;

    const sighLayers = [
      { startF: 880, endF: 440, q: 1.0, pan: -0.5, vol: 0.25 * crowdScale },
      { startF: 1450, endF: 680, q: 0.95, pan: 0.5, vol: 0.2 * crowdScale },
      { startF: 520, endF: 280, q: 0.85, pan: 0.0, vol: 0.18 * crowdScale },
    ];

    sighLayers.forEach((l) => {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer!;
      src.loop = true;

      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.setValueAtTime(l.startF, now);
      f.frequency.exponentialRampToValueAtTime(l.endF, now + 1.85);
      f.Q.value = l.q;

      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0005, now);
      g.gain.linearRampToValueAtTime(l.vol, now + 0.2);
      g.gain.exponentialRampToValueAtTime(0.0006, now + 1.95);

      src.connect(f);
      f.connect(g);
      this.routeSfx(g, l.pan, 0.58);
      src.start(now, Math.random() * 3.5);
      src.stop(now + 2.02);
    });
  }

  /** Alias kept for compatibility */
  public playCrowdGasp() {
    this.playCrowdBoo();
  }
}

export const soundEngine = new SoundEngine();
