// ============================================================================
// BLÅHAJ ISLAND — MAIN 3D ENGINE, NEVERWINTER CAMERA, BLOOM & GAMEPLAY LOOP
// (ROUND 3: 3D GRASS, VOLCANO TRIAL DUNGEON, BIRBS & BREB, CARROT KNOCK-OFF)
// ============================================================================

(function () {
  const LORE = window.BLAHAJ_LORE;

  // --- Game Settings & Audio Preferences (Auto-saved in localStorage) ---
  const SETTINGS_STORAGE_KEY = 'blahaj_island_settings_v1';
  const DEFAULT_SETTINGS = {
    masterVol: 80,
    masterMute: false,
    musicVol: 80,
    musicMute: false,
    sfxVol: 85,
    sfxMute: false,
    ambientVol: 65,
    ambientMute: false,
    ufoVol: 80,
    ufoMute: false,
    footsteps: true,
    birbCalls: true,
    fov: 60,
    camDist: 6.5,
    shoulder: 'right',
    adTurnMode: 'strafe',
    finModeStyle: 'smart',
    ufoAutoChaseCam: true,
    ufoSpaceFlightStyle: 'coupled',
    ufoSpaceAutoLevelRoll: false,
    ufoSpaceVerticalKeys: false,
    ufoSpaceInvertPitch: false,
    ufoSpaceQEMode: 'yaw',
    ufoSpaceMouseXMode: 'roll',
    invertY: false,
    binocularInvertY: false,
    binocularInvertX: false,
    mouseSens: 1.0,
    bloom: false,
    shadows: true,
    oceanWaves: true,
    streamerMode: false,
    compassVis: true,
    nametagsVis: true,
    questVis: true,
    chatVis: true
  };
  let gameSettings = Object.assign({}, DEFAULT_SETTINGS);
  window.gameSettings = gameSettings;
  let bloomPassInstance = null;

  // --- Audio Synthesizer (Cozy WebAudio Chimes, Ambient Waves, Wind, Splashes & Footsteps) ---
  const CozyAudio = {
    ctx: null,
    getContext() {
      return this.ctx;
    },
    masterGain: null,
    musicGain: null,
    sfxGain: null,
    ambientGain: null,
    ufoGain: null,
    getUfoGain() {
      return this.ufoGain || this.sfxGain || null;
    },
    noiseBuffer: null,
    surfNode: null,
    surfGain: null,
    surfFilter: null,
    windNode: null,
    windGain: null,
    windFilter: null,
    boatNode: null,
    boatGain: null,
    boatFilter: null,
    laundromatNode: null,
    laundromatGain: null,
    laundromatFilter: null,
    laundromatHumOsc1: null,
    laundromatHumOsc2: null,
    laundromatHumGain: null,
    cartRollGain: null,
    cartRollFilter: null,
    cartRollDist: 0,
    nextGroutClick: 1.2,
    nextCartSqueakDist: 7.0,
    washerMotorOsc: null,
    washerMotorHarmonic: null,
    washerWobbleOsc: null,
    washerMotorGain: null,
    washerWobbleGain: null,
    washerMotorFilter: null,
    bistroGain: null,
    bistroNextChordTime: 0,
    bistroChordIdx: 0,
    bistroChords: [
      { name: 'Cmaj7', bass: 130.81, notes: [261.63, 329.63, 392.00, 493.88] },
      { name: 'Am7',   bass: 110.00, notes: [220.00, 261.63, 329.63, 392.00] },
      { name: 'Dm7',   bass: 146.83, notes: [293.66, 349.23, 440.00, 523.25] },
      { name: 'G7b9',  bass: 98.00,  notes: [246.94, 293.66, 349.23, 415.30] },
      { name: 'Em7',   bass: 164.81, notes: [329.63, 392.00, 493.88, 587.33] },
      { name: 'A7',    bass: 110.00, notes: [277.18, 329.63, 392.00, 554.37] },
      { name: 'Dm9',   bass: 146.83, notes: [293.66, 349.23, 440.00, 659.25] },
      { name: 'G13',   bass: 98.00,  notes: [246.94, 329.63, 349.23, 523.25] }
    ],
    islandMusicGain: null,
    islandNextChordTime: 0,
    islandChordIdx: 0,
    islandNextMelodyTime: 0,
    islandChords: [
      { name: 'Cmaj9',    bass: 130.81, notes: [261.63, 329.63, 392.00, 493.88, 587.33] },
      { name: 'Fmaj7#11', bass: 87.31,  notes: [261.63, 329.63, 369.99, 392.00, 523.25] },
      { name: 'Am9',      bass: 110.00, notes: [220.00, 261.63, 329.63, 392.00, 493.88] },
      { name: 'G6add9',   bass: 98.00,  notes: [246.94, 293.66, 392.00, 440.00, 587.33] },
      { name: 'Dm9',      bass: 146.83, notes: [293.66, 349.23, 440.00, 523.25, 659.25] },
      { name: 'Em7',      bass: 164.81, notes: [329.63, 392.00, 493.88, 587.33, 659.25] }
    ],
    volcanoMusicGain: null,
    volcanoNextBeatTime: 0,
    volcanoBeatStep: 0,
    volcanoChordIdx: 0,
    volcanoChords: [
      // Dm(add b5) / Tritone Tension: Suspended anxiety, creeping uncertainty
      { name: 'Dm(b5)', bass: 73.42, notes: [207.65, 293.66, 311.13, 440.00], motif: [587.33, 622.25, 440.00, 415.30] },
      // Bbmaj7(#11) / The Chasm: Hollow, expansive dread
      { name: 'Bb(#11)', bass: 58.27, notes: [233.08, 329.63, 349.23, 466.16], motif: [659.25, 698.46, 587.33, 466.16] },
      // D dim7 / Looming Peril: Clustered dissonance, fragile foothold
      { name: 'Ddim7',  bass: 43.65, notes: [174.61, 207.65, 246.94, 293.66], motif: [493.88, 523.25, 415.30, 349.23] },
      // A7b9 / Pre-eruption Climax: Unresolved dominant crisis
      { name: 'A7b9',   bass: 55.00, notes: [220.00, 233.08, 277.18, 392.00], motif: [466.16, 440.00, 554.37, 523.25] }
    ],
    laundromatMusicGain: null,
    laundromatNextBeatTime: 0,
    laundromatBeatStep: 0,
    laundromatChordIdx: 0,
    laundromatChords: [
      { name: 'Ebm9',   bass: 77.78,  notes: [311.13, 370.00, 466.16, 554.37, 622.25] },
      { name: 'Ab13',   bass: 103.83, notes: [277.18, 349.23, 415.30, 523.25, 622.25] },
      { name: 'Dbmaj9', bass: 69.30,  notes: [277.18, 349.23, 415.30, 523.25, 622.25] },
      { name: 'Bbm7',   bass: 116.54, notes: [293.66, 349.23, 466.16, 554.37, 698.46] }
    ],
    lastFootstepTime: 0,
    ambientInitialized: false,

    ensure() {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) this.ctx = new AC();
      }
      if (this.ctx && !this.masterGain) {
        try {
          const now = this.ctx.currentTime;
          this.masterGain = this.ctx.createGain();
          this.musicGain = this.ctx.createGain();
          this.sfxGain = this.ctx.createGain();
          this.ambientGain = this.ctx.createGain();
          this.ufoGain = this.ctx.createGain();

          // Start muted (0.0001) before connecting to destination so resuming AudioContext never pops/bangs
          this.masterGain.gain.setValueAtTime(0.0001, now);

          this.musicGain.connect(this.masterGain);
          this.sfxGain.connect(this.masterGain);
          this.ambientGain.connect(this.masterGain);
          this.ufoGain.connect(this.masterGain);
          this.masterGain.connect(this.ctx.destination);
          this.syncVolumes(gameSettings, true);
        } catch (e) {
          console.warn('Audio gain routing error:', e);
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      if (this.ctx && !this.ambientInitialized) {
        this.initAmbientAudio();
      }
    },

    syncVolumes(settings = gameSettings, isInitial = false) {
      if (!this.ctx || !this.masterGain) return;
      const now = this.ctx.currentTime;
      const cfg = settings || DEFAULT_SETTINGS;
      const mVol = cfg.masterMute ? 0.0001 : Math.max(0.0001, (cfg.masterVol ?? 80) / 100);
      const mscVol = cfg.musicMute ? 0.0001 : Math.max(0.0001, (cfg.musicVol ?? 80) / 100);
      const sVol = cfg.sfxMute ? 0.0001 : Math.max(0.0001, (cfg.sfxVol ?? 85) / 100);
      const aVol = cfg.ambientMute ? 0.0001 : Math.max(0.0001, (cfg.ambientVol ?? 65) / 100);
      const uVol = cfg.ufoMute ? 0.0001 : Math.max(0.0001, (cfg.ufoVol ?? 80) / 100);

      if (isInitial) {
        if (this.musicGain) this.musicGain.gain.setValueAtTime(mscVol, now);
        this.sfxGain.gain.setValueAtTime(sVol, now);
        this.ambientGain.gain.setValueAtTime(aVol, now);
        if (this.ufoGain) this.ufoGain.gain.setValueAtTime(uVol, now);
        this.masterGain.gain.setTargetAtTime(mVol, now + 0.04, 0.14);
      } else {
        this.masterGain.gain.setTargetAtTime(mVol, now, 0.05);
        if (this.musicGain) this.musicGain.gain.setTargetAtTime(mscVol, now, 0.05);
        this.sfxGain.gain.setTargetAtTime(sVol, now, 0.05);
        this.ambientGain.gain.setTargetAtTime(aVol, now, 0.05);
        if (this.ufoGain) this.ufoGain.gain.setTargetAtTime(uVol, now, 0.05);
      }
    },

    getNoiseBuffer() {
      if (this.noiseBuffer) return this.noiseBuffer;
      const bufferSize = this.ctx.sampleRate * 2;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        // Pink noise filter approximation
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
      }
      this.noiseBuffer = buffer;
      return buffer;
    },

    initAmbientAudio() {
      if (!this.ctx) return;
      this.ambientInitialized = true;
      const noise = this.getNoiseBuffer();

      // 1. Ocean Surf Ambience
      const surfSrc = this.ctx.createBufferSource();
      surfSrc.buffer = noise;
      surfSrc.loop = true;
      this.surfFilter = this.ctx.createBiquadFilter();
      this.surfFilter.type = 'lowpass';
      this.surfFilter.frequency.setValueAtTime(260, this.ctx.currentTime);
      this.surfGain = this.ctx.createGain();
      this.surfGain.gain.setValueAtTime(0.001, this.ctx.currentTime);
      surfSrc.connect(this.surfFilter);
      this.surfFilter.connect(this.surfGain);
      this.surfGain.connect(this.ambientGain || this.ctx.destination);
      surfSrc.start();

      // 2. Wind Breeze Ambience
      const windSrc = this.ctx.createBufferSource();
      windSrc.buffer = noise;
      windSrc.loop = true;
      this.windFilter = this.ctx.createBiquadFilter();
      this.windFilter.type = 'bandpass';
      this.windFilter.frequency.setValueAtTime(450, this.ctx.currentTime);
      this.windFilter.Q.setValueAtTime(2.2, this.ctx.currentTime);
      this.windGain = this.ctx.createGain();
      this.windGain.gain.setValueAtTime(0.001, this.ctx.currentTime);
      windSrc.connect(this.windFilter);
      this.windFilter.connect(this.windGain);
      this.windGain.connect(this.ambientGain || this.ctx.destination);
      windSrc.start();

      // 3. Boat Hull & Wake Hiss
      const boatSrc = this.ctx.createBufferSource();
      boatSrc.buffer = noise;
      boatSrc.loop = true;
      this.boatFilter = this.ctx.createBiquadFilter();
      this.boatFilter.type = 'bandpass';
      this.boatFilter.frequency.setValueAtTime(650, this.ctx.currentTime);
      this.boatFilter.Q.setValueAtTime(1.5, this.ctx.currentTime);
      this.boatGain = this.ctx.createGain();
      this.boatGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
      boatSrc.connect(this.boatFilter);
      this.boatFilter.connect(this.boatGain);
      this.boatGain.connect(this.ambientGain || this.ctx.destination);
      boatSrc.start();

      // 5. Parisian Bistro Jazz & Acoustic Ambiance
      try {
        this.bistroGain = this.ctx.createGain();
        this.bistroGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
        this.bistroGain.connect(this.musicGain || this.ambientGain || this.ctx.destination);

        // Procedural Zone Music Sub-Busses
        this.islandMusicGain = this.ctx.createGain();
        this.islandMusicGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
        this.islandMusicGain.connect(this.musicGain || this.ambientGain || this.ctx.destination);

        this.volcanoMusicGain = this.ctx.createGain();
        this.volcanoMusicGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
        this.volcanoMusicGain.connect(this.musicGain || this.ambientGain || this.ctx.destination);

        this.laundromatMusicGain = this.ctx.createGain();
        this.laundromatMusicGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
        this.laundromatMusicGain.connect(this.musicGain || this.ambientGain || this.ctx.destination);
      } catch (e) {
        console.warn('Zone music init error:', e);
      }

      // 4. Laundromat Interior Atmosphere: 60Hz/120Hz transformer hum + gentle duct air
      const laundromatSrc = this.ctx.createBufferSource();
      laundromatSrc.buffer = noise;
      laundromatSrc.loop = true;
      this.laundromatFilter = this.ctx.createBiquadFilter();
      this.laundromatFilter.type = 'bandpass';
      this.laundromatFilter.frequency.setValueAtTime(420, this.ctx.currentTime);
      this.laundromatFilter.Q.setValueAtTime(1.8, this.ctx.currentTime);
      this.laundromatGain = this.ctx.createGain();
      this.laundromatGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
      laundromatSrc.connect(this.laundromatFilter);
      this.laundromatFilter.connect(this.laundromatGain);
      this.laundromatGain.connect(this.ambientGain || this.ctx.destination);
      laundromatSrc.start();

      try {
        const humOsc1 = this.ctx.createOscillator();
        const humOsc2 = this.ctx.createOscillator();
        this.laundromatHumGain = this.ctx.createGain();
        this.laundromatHumGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
        humOsc1.type = 'sine';
        humOsc1.frequency.setValueAtTime(60, this.ctx.currentTime);
        humOsc2.type = 'triangle';
        humOsc2.frequency.setValueAtTime(120, this.ctx.currentTime);
        humOsc1.connect(this.laundromatHumGain);
        humOsc2.connect(this.laundromatHumGain);
        this.laundromatHumGain.connect(this.ambientGain || this.ctx.destination);
        humOsc1.start();
        humOsc2.start();
        this.laundromatHumOsc1 = humOsc1;
        this.laundromatHumOsc2 = humOsc2;
      } catch (e) {
        console.warn('Laundromat hum oscillator init:', e);
      }
    },

    setParamSmooth(param, targetVal, now, tc = 0.25) {
      if (!param) return;
      const prev = param._lastTarget;
      if (typeof prev === 'number' && Math.abs(prev - targetVal) < 0.003) return;
      param._lastTarget = targetVal;
      try {
        param.cancelScheduledValues(now);
        param.setTargetAtTime(targetVal, now, tc);
      } catch (e) {}
    },

    updateAmbient(zone, elapsed, playerPos, inBoat, isMoving, camHeight) {
      if (!this.ctx) return;
      if (!this.ambientInitialized) {
        this.initAmbientAudio();
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      const now = this.ctx.currentTime;

      // 1. Smooth Procedural Zone Music Cross-Fade (Clearly audible rich presence)
      const isNearVolcanoOverworld = (zone === 'island' || zone === 'overworld') && playerPos && playerPos.z < -75;
      const isVolcanoActive = zone === 'volcano' || isNearVolcanoOverworld;

      const targetBistro = (zone === 'spherical_foods') ? 0.75 : 0.0001;
      const targetLaundromat = (zone === 'laundromat') ? 0.80 : 0.0001;
      const targetVolcano = isVolcanoActive ? 0.85 : 0.0001;
      const targetIsland = (!isVolcanoActive && (zone === 'island' || zone === 'overworld' || zone === 'volleyball')) ? 0.80 : 0.0001;

      if (targetBistro > 0.01) this.updateBistroMusic(elapsed, 0.016);
      if (targetLaundromat > 0.01) this.updateLaundromatMusic(elapsed, 0.016);
      if (targetVolcano > 0.01) this.updateVolcanoMusic(elapsed, 0.016);
      if (targetIsland > 0.01) this.updateIslandMusic(elapsed, 0.016);

      // Throttle AudioParam timeline updates to ~5Hz and clear scheduled events to prevent Chromium AudioParamTimeline memory/CPU explosion!
      if (elapsed - (this._lastAmbParamAt || 0) < 0.20) return;
      this._lastAmbParamAt = elapsed;

      if (this.bistroGain) this.setParamSmooth(this.bistroGain.gain, targetBistro, now, 0.35);
      if (this.laundromatMusicGain) this.setParamSmooth(this.laundromatMusicGain.gain, targetLaundromat, now, 0.35);
      if (this.volcanoMusicGain) this.setParamSmooth(this.volcanoMusicGain.gain, targetVolcano, now, 0.35);
      if (this.islandMusicGain) this.setParamSmooth(this.islandMusicGain.gain, targetIsland, now, 0.35);

      if (zone === 'spherical_foods') {
        if (this.surfGain) this.setParamSmooth(this.surfGain.gain, 0.0001, now, 0.25);
        if (this.windGain) this.setParamSmooth(this.windGain.gain, 0.0001, now, 0.25);
        if (this.boatGain) this.setParamSmooth(this.boatGain.gain, 0.0001, now, 0.25);
        if (this.laundromatGain) this.setParamSmooth(this.laundromatGain.gain, 0.0001, now, 0.25);
        if (this.laundromatHumGain) this.setParamSmooth(this.laundromatHumGain.gain, 0.0001, now, 0.25);
        return;
      }

      if (zone === 'laundromat') {
        if (this.surfGain) this.setParamSmooth(this.surfGain.gain, 0.0001, now, 0.25);
        if (this.windGain) this.setParamSmooth(this.windGain.gain, 0.0001, now, 0.25);
        if (this.boatGain) this.setParamSmooth(this.boatGain.gain, 0.0001, now, 0.25);
        if (this.laundromatGain) this.setParamSmooth(this.laundromatGain.gain, 0.022, now, 0.35);
        if (this.laundromatHumGain) this.setParamSmooth(this.laundromatHumGain.gain, 0.016, now, 0.35);
        return;
      } else {
        if (this.laundromatGain) this.setParamSmooth(this.laundromatGain.gain, 0.0001, now, 0.25);
        if (this.laundromatHumGain) this.setParamSmooth(this.laundromatHumGain.gain, 0.0001, now, 0.25);
      }

      // Distance to nearest sea level / ocean
      const distFromCenter = Math.hypot(playerPos.x, playerPos.z);
      const isNearWater = playerPos.y < 2.5 || distFromCenter > 60 || inBoat;
      const oceanTargetVol = inBoat ? 0.08 : (isNearWater ? 0.055 : 0.022);

      // Surf rhythmic wave swelling
      const swell = (Math.sin(elapsed * 1.6) * 0.5 + 0.5);
      const targetCutoff = Math.round(220 + swell * 280);
      if (this.surfGain) this.setParamSmooth(this.surfGain.gain, oceanTargetVol * (0.6 + swell * 0.6), now, 0.15);
      if (this.surfFilter) this.setParamSmooth(this.surfFilter.frequency, targetCutoff, now, 0.2);

      // Wind intensity increases with altitude or sailing
      const altitude = Math.max(0, playerPos.y);
      const windTargetVol = 0.012 + Math.min(0.05, (altitude / 65) * 0.045) + (inBoat ? 0.02 : 0);
      const windFrequency = Math.round(350 + Math.sin(elapsed * 0.8) * 120 + (altitude * 8));
      if (this.windGain) this.setParamSmooth(this.windGain.gain, windTargetVol, now, 0.25);
      if (this.windFilter) this.setParamSmooth(this.windFilter.frequency, windFrequency, now, 0.3);

      // Boat sailing wake sound
      if (inBoat && isMoving) {
        if (this.boatGain) this.setParamSmooth(this.boatGain.gain, 0.045, now, 0.2);
        if (this.boatFilter) this.setParamSmooth(this.boatFilter.frequency, Math.round(550 + Math.sin(elapsed * 4.0) * 180), now, 0.1);
        if (Math.random() < 0.04) {
          this.woodCreak();
        }
      } else {
        if (this.boatGain) this.setParamSmooth(this.boatGain.gain, 0.0001, now, 0.35);
      }
    },

    playTone(freq, dur, type = 'sine', gainVal = 0.12, slideFreq = null) {
      this.ensure();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      if (slideFreq) {
        osc.frequency.exponentialRampToValueAtTime(slideFreq, now + dur);
      }
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(Math.max(0.0002, gainVal), now + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
      osc.connect(gain);
      gain.connect(this.sfxGain || this.ctx.destination);
      osc.start(now);
      osc.stop(now + dur);
    },

    footstep(isShallowWater, isOnRoad) {
      if (gameSettings && !gameSettings.footsteps) return;
      this.ensure();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      if (now - this.lastFootstepTime < 0.28) return;
      this.lastFootstepTime = now;

      if (isShallowWater) {
        // Water splash squelch footstep
        this.waterSplash(0.05, 0.15);
      } else if (isOnRoad) {
        // Crisp stone flagstone click
        this.playTone(420 + Math.random() * 80, 0.04, 'triangle', 0.04, 220);
      } else {
        // Soft felt/plush grass pat
        this.playTone(160 + Math.random() * 40, 0.06, 'sine', 0.05, 90);
      }
    },

    updateBistroMusic(elapsed, dt) {
      if (!this.ctx || !this.bistroGain) return;
      const now = this.ctx.currentTime;
      if (now < this.bistroNextChordTime) return;

      this.bistroNextChordTime = now + 2.35;
      const chord = this.bistroChords[this.bistroChordIdx % this.bistroChords.length];
      this.bistroChordIdx++;

      // 1. Warm Acoustic Upright Double Bass (Plucked triangle wave low-pass filtered at 180Hz)
      try {
        const bassOsc = this.ctx.createOscillator();
        const bassFilt = this.ctx.createBiquadFilter();
        const bassGain = this.ctx.createGain();

        bassOsc.type = 'triangle';
        bassOsc.frequency.setValueAtTime(chord.bass, now);
        bassFilt.type = 'lowpass';
        bassFilt.frequency.setValueAtTime(190, now);

        bassGain.gain.setValueAtTime(0.0001, now);
        bassGain.gain.linearRampToValueAtTime(0.14, now + 0.015);
        bassGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.1);

        bassOsc.connect(bassFilt);
        bassFilt.connect(bassGain);
        bassGain.connect(this.bistroGain);

        bassOsc.start(now);
        bassOsc.stop(now + 2.15);
      } catch (e) {}

      // 2. Vintage Rhodes / Electric Piano Tines (Warm jazz harmony with slight stagger)
      chord.notes.forEach((freq, nIdx) => {
        try {
          const noteTime = now + (nIdx * 0.032);
          const osc1 = this.ctx.createOscillator();
          const osc2 = this.ctx.createOscillator();
          const noteFilt = this.ctx.createBiquadFilter();
          const noteGain = this.ctx.createGain();

          osc1.type = 'sine';
          osc1.frequency.setValueAtTime(freq, noteTime);
          osc2.type = 'triangle';
          osc2.frequency.setValueAtTime(freq * 2, noteTime);

          noteFilt.type = 'lowpass';
          noteFilt.frequency.setValueAtTime(1400, noteTime);

          const vol = 0.045 / Math.sqrt(chord.notes.length);
          noteGain.gain.setValueAtTime(0.0001, noteTime);
          noteGain.gain.linearRampToValueAtTime(vol, noteTime + 0.022);
          noteGain.gain.exponentialRampToValueAtTime(0.0001, noteTime + 2.2);

          osc1.connect(noteFilt);
          osc2.connect(noteFilt);
          noteFilt.connect(noteGain);
          noteGain.connect(this.bistroGain);

          osc1.start(noteTime);
          osc2.start(noteTime);
          osc1.stop(noteTime + 2.25);
          osc2.stop(noteTime + 2.25);
        } catch (e) {}
      });

      // 3. Subtle Brushed Snare Whisper / Plate Clink
      if (Math.random() < 0.65) {
        try {
          const noise = this.getNoiseBuffer();
          const src = this.ctx.createBufferSource();
          src.buffer = noise;
          const snFilt = this.ctx.createBiquadFilter();
          snFilt.type = 'bandpass';
          snFilt.frequency.setValueAtTime(3200, now + 1.15);
          snFilt.Q.setValueAtTime(2.0, now + 1.15);

          const snGain = this.ctx.createGain();
          snGain.gain.setValueAtTime(0.0001, now + 1.15);
          snGain.gain.linearRampToValueAtTime(0.012, now + 1.16);
          snGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.35);

          src.connect(snFilt);
          snFilt.connect(snGain);
          snGain.connect(this.bistroGain);

          src.start(now + 1.15);
          src.stop(now + 1.36);
        } catch (e) {}
      }
    },

    updateIslandMusic(elapsed, dt) {
      if (!this.ctx || !this.islandMusicGain) return;
      const now = this.ctx.currentTime;
      if (now < this.islandNextChordTime) {
        if (now >= this.islandNextMelodyTime) {
          this.islandNextMelodyTime = now + 1.3 + Math.random() * 1.8;
          const pentatonic = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50];
          const melFreq = pentatonic[Math.floor(Math.random() * pentatonic.length)];
          try {
            const mOsc = this.ctx.createOscillator();
            const mGain = this.ctx.createGain();
            mOsc.type = 'sine';
            mOsc.frequency.setValueAtTime(melFreq, now);
            mGain.gain.setValueAtTime(0.0001, now);
            mGain.gain.linearRampToValueAtTime(0.16, now + 0.015);
            mGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.1);
            mOsc.connect(mGain);
            mGain.connect(this.islandMusicGain);
            mOsc.start(now);
            mOsc.stop(now + 1.15);
          } catch (e) {}
        }
        return;
      }

      this.islandNextChordTime = now + 3.4;
      this.islandNextMelodyTime = now + 0.9;
      const chord = this.islandChords[this.islandChordIdx % this.islandChords.length];
      this.islandChordIdx++;

      // Warm Acoustic Sub/Root Bass
      try {
        const bOsc = this.ctx.createOscillator();
        const bFilt = this.ctx.createBiquadFilter();
        const bGain = this.ctx.createGain();
        bOsc.type = 'sine';
        bOsc.frequency.setValueAtTime(chord.bass, now);
        bFilt.type = 'lowpass';
        bFilt.frequency.setValueAtTime(180, now);
        bGain.gain.setValueAtTime(0.0001, now);
        bGain.gain.linearRampToValueAtTime(0.22, now + 0.04);
        bGain.gain.exponentialRampToValueAtTime(0.0001, now + 3.1);
        bOsc.connect(bFilt);
        bFilt.connect(bGain);
        bGain.connect(this.islandMusicGain);
        bOsc.start(now);
        bOsc.stop(now + 3.15);
      } catch (e) {}

      // Vintage Rhodes Electric Piano Chords (Lofi chill)
      chord.notes.forEach((freq, nIdx) => {
        try {
          const noteTime = now + (nIdx * 0.024);
          const osc1 = this.ctx.createOscillator();
          const osc2 = this.ctx.createOscillator();
          const noteFilt = this.ctx.createBiquadFilter();
          const noteGain = this.ctx.createGain();

          osc1.type = 'sine';
          osc1.frequency.setValueAtTime(freq, noteTime);
          osc2.type = 'triangle';
          osc2.frequency.setValueAtTime(freq * 2, noteTime);

          noteFilt.type = 'lowpass';
          noteFilt.frequency.setValueAtTime(1200, noteTime);

          const vol = 0.16 / Math.sqrt(chord.notes.length);
          noteGain.gain.setValueAtTime(0.0001, noteTime);
          noteGain.gain.linearRampToValueAtTime(vol, noteTime + 0.03);
          noteGain.gain.exponentialRampToValueAtTime(0.0001, noteTime + 3.0);

          osc1.connect(noteFilt);
          osc2.connect(noteFilt);
          noteFilt.connect(noteGain);
          noteGain.connect(this.islandMusicGain);

          osc1.start(noteTime);
          osc2.start(noteTime);
          osc1.stop(noteTime + 3.05);
          osc2.stop(noteTime + 3.05);
        } catch (e) {}
      });
    },

    updateVolcanoMusic(elapsed, dt) {
      if (!this.ctx || !this.volcanoMusicGain) return;
      const now = this.ctx.currentTime;
      if (now < this.volcanoNextBeatTime) return;

      const stepDur = 0.30; // ~100 BPM deliberate, tense pacing
      this.volcanoNextBeatTime = now + stepDur;
      const step = this.volcanoBeatStep % 16;
      this.volcanoBeatStep++;

      const chordIdx = Math.floor(this.volcanoBeatStep / 16) % this.volcanoChords.length;
      const chord = this.volcanoChords[chordIdx];

      // 1. Tense Subterranean Heartbeat Thump (Steps 0 and 2)
      if (step === 0 || step === 2) {
        try {
          const heartOsc = this.ctx.createOscillator();
          const heartFilt = this.ctx.createBiquadFilter();
          const heartGain = this.ctx.createGain();

          heartOsc.type = 'sine';
          heartOsc.frequency.setValueAtTime(62, now);
          heartOsc.frequency.exponentialRampToValueAtTime(28, now + 0.12);

          heartFilt.type = 'lowpass';
          heartFilt.frequency.setValueAtTime(90, now);

          const vol = (step === 0) ? 0.32 : 0.20; // First beat heavy, second softer
          heartGain.gain.setValueAtTime(0.0001, now);
          heartGain.gain.linearRampToValueAtTime(vol, now + 0.005);
          heartGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

          heartOsc.connect(heartFilt);
          heartFilt.connect(heartGain);
          heartGain.connect(this.volcanoMusicGain);
          heartOsc.start(now);
          heartOsc.stop(now + 0.20);
        } catch (e) {}
      }

      // 2. Anxious Clockwork / Obsidian Fissure Ticks (Every 16th step)
      try {
        const noise = this.getNoiseBuffer();
        const tickSrc = this.ctx.createBufferSource();
        tickSrc.buffer = noise;
        const tickFilter = this.ctx.createBiquadFilter();
        tickFilter.type = 'bandpass';
        tickFilter.frequency.setValueAtTime(5400, now);
        tickFilter.Q.setValueAtTime(4.5, now);

        const tickGain = this.ctx.createGain();
        const isAccent = (step % 4 === 2);
        const tVol = isAccent ? 0.09 : 0.04;
        tickGain.gain.setValueAtTime(0.0001, now);
        tickGain.gain.linearRampToValueAtTime(tVol, now + 0.002);
        tickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);

        tickSrc.connect(tickFilter);
        tickFilter.connect(tickGain);
        tickGain.connect(this.volcanoMusicGain);
        tickSrc.start(now);
        tickSrc.stop(now + 0.04);
      } catch (e) {}

      // 3. Deep Breathing Magma Sub-Drone (Steps 0 and 8)
      if (step === 0 || step === 8) {
        try {
          const droneOsc = this.ctx.createOscillator();
          const droneFilter = this.ctx.createBiquadFilter();
          const droneGain = this.ctx.createGain();

          droneOsc.type = 'triangle';
          droneOsc.frequency.setValueAtTime(chord.bass, now);

          droneFilter.type = 'lowpass';
          droneFilter.frequency.setValueAtTime(75, now);
          droneFilter.frequency.linearRampToValueAtTime(220, now + 0.6);
          droneFilter.frequency.exponentialRampToValueAtTime(70, now + 1.8);

          droneGain.gain.setValueAtTime(0.0001, now);
          droneGain.gain.linearRampToValueAtTime(0.30, now + 0.08);
          droneGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.0);

          droneOsc.connect(droneFilter);
          droneFilter.connect(droneGain);
          droneGain.connect(this.volcanoMusicGain);
          droneOsc.start(now);
          droneOsc.stop(now + 2.1);
        } catch (e) {}
      }

      // 4. Sparse Eerie Echoing Mineral Pings (Steps 4, 9, 13)
      if (step === 4 || step === 9 || step === 13) {
        try {
          const pingIdx = (step === 4) ? 0 : (step === 9 ? 1 : 2);
          const freq = chord.motif[pingIdx % chord.motif.length];

          const pingOsc = this.ctx.createOscillator();
          const pingFilt = this.ctx.createBiquadFilter();
          const pingGain = this.ctx.createGain();

          pingOsc.type = 'sine';
          pingOsc.frequency.setValueAtTime(freq, now);

          pingFilt.type = 'bandpass';
          pingFilt.frequency.setValueAtTime(freq, now);
          pingFilt.Q.setValueAtTime(6.0, now);

          pingGain.gain.setValueAtTime(0.0001, now);
          pingGain.gain.linearRampToValueAtTime(0.14, now + 0.006);
          pingGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55); // Long cavernous decay

          pingOsc.connect(pingFilt);
          pingFilt.connect(pingGain);
          pingGain.connect(this.volcanoMusicGain);
          pingOsc.start(now);
          pingOsc.stop(now + 0.60);
        } catch (e) {}
      }

      // 5. Creeping Tension Swell (Steps 12 to 15, right before next bar)
      if (step >= 12) {
        chord.notes.forEach((freq) => {
          try {
            const sOsc = this.ctx.createOscillator();
            const sFilt = this.ctx.createBiquadFilter();
            const sGain = this.ctx.createGain();

            sOsc.type = 'sawtooth';
            sOsc.frequency.setValueAtTime(freq, now);

            sFilt.type = 'lowpass';
            const progress = (step - 12) / 4.0;
            sFilt.frequency.setValueAtTime(260 + progress * 500, now);

            sGain.gain.setValueAtTime(0.0001, now);
            sGain.gain.linearRampToValueAtTime(0.07 / Math.sqrt(chord.notes.length), now + 0.02);
            sGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

            sOsc.connect(sFilt);
            sFilt.connect(sGain);
            sGain.connect(this.volcanoMusicGain);
            sOsc.start(now);
            sOsc.stop(now + 0.30);
          } catch (e) {}
        });
      }
    },
    updateLaundromatMusic(elapsed, dt) {
      if (!this.ctx || !this.laundromatMusicGain) return;
      const now = this.ctx.currentTime;
      if (now < this.laundromatNextBeatTime) return;

      const stepDur = 0.288; // 104 BPM 8th-note groove
      this.laundromatNextBeatTime = now + stepDur;
      const step = this.laundromatBeatStep % 16;
      this.laundromatBeatStep++;

      const chordIdx = Math.floor(this.laundromatBeatStep / 16) % this.laundromatChords.length;
      const chord = this.laundromatChords[chordIdx];

      // 1. Funky Slap Synth-Bass (Steps 0, 3, 6, 8, 10, 14)
      if (step === 0 || step === 3 || step === 6 || step === 8 || step === 10 || step === 14) {
        try {
          const bassOsc = this.ctx.createOscillator();
          const bassFilt = this.ctx.createBiquadFilter();
          const bassGain = this.ctx.createGain();

          const octaveMul = (step === 6 || step === 14) ? 2.0 : 1.0;
          bassOsc.type = 'triangle';
          bassOsc.frequency.setValueAtTime(chord.bass * octaveMul, now);

          bassFilt.type = 'lowpass';
          bassFilt.frequency.setValueAtTime(650, now);
          bassFilt.frequency.exponentialRampToValueAtTime(180, now + 0.18);

          bassGain.gain.setValueAtTime(0.0001, now);
          bassGain.gain.linearRampToValueAtTime(0.26, now + 0.008);
          bassGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.26);

          bassOsc.connect(bassFilt);
          bassFilt.connect(bassGain);
          bassGain.connect(this.laundromatMusicGain);
          bassOsc.start(now);
          bassOsc.stop(now + 0.28);
        } catch (e) {}
      }

      // 2. Offbeat Rhodes Comping Stabs (Steps 2, 7, 11)
      if (step === 2 || step === 7 || step === 11) {
        chord.notes.forEach((freq, idx) => {
          try {
            const rOsc = this.ctx.createOscillator();
            const rFilt = this.ctx.createBiquadFilter();
            const rGain = this.ctx.createGain();

            rOsc.type = 'sine';
            rOsc.frequency.setValueAtTime(freq, now);

            rFilt.type = 'lowpass';
            rFilt.frequency.setValueAtTime(1300, now);

            rGain.gain.setValueAtTime(0.0001, now);
            rGain.gain.linearRampToValueAtTime(0.16 / Math.sqrt(chord.notes.length), now + 0.015);
            rGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);

            rOsc.connect(rFilt);
            rFilt.connect(rGain);
            rGain.connect(this.laundromatMusicGain);
            rOsc.start(now);
            rOsc.stop(now + 0.45);
          } catch (e) {}
        });
      }

      // 3. Rhythmic Mechanical Wash-Cycle Chimes & Soap-Bubble Pops
      if (step % 2 === 1) {
        try {
          const noise = this.getNoiseBuffer();
          if (noise) {
            const hSrc = this.ctx.createBufferSource();
            hSrc.buffer = noise;
            const hFilt = this.ctx.createBiquadFilter();
            hFilt.type = 'highpass';
            hFilt.frequency.setValueAtTime(5500, now);

            const hGain = this.ctx.createGain();
            hGain.gain.setValueAtTime(0.0001, now);
            hGain.gain.linearRampToValueAtTime(0.075, now + 0.004);
            hGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

            hSrc.connect(hFilt);
            hFilt.connect(hGain);
            hGain.connect(this.laundromatMusicGain);
            hSrc.start(now);
            hSrc.stop(now + 0.06);
          }
        } catch (e) {}
      }
    },

    boothSit() {
      this.ensure();
      if (!this.ctx) return;
      this.playTone(220, 0.24, 'sine', 0.08, 140);
    },

    boothStand() {
      this.ensure();
      if (!this.ctx) return;
      this.playTone(160, 0.20, 'sine', 0.07, 240);
    },

    deckChairLounge() {
      this.ensure();
      if (!this.ctx) return;
      this.playTone(196, 0.28, 'sine', 0.12, 130);
      setTimeout(() => {
        if (!this.ctx) return;
        this.playTone(392, 0.35, 'triangle', 0.08, 523);
      }, 70);
    },

    pinaColadaSip() {
      this.ensure();
      if (!this.ctx) return;
      this.playTone(330, 0.15, 'sawtooth', 0.07, 440);
      setTimeout(() => {
        if (!this.ctx) return;
        this.playTone(659, 0.18, 'sine', 0.09, 880);
        this.playTone(1318, 0.14, 'triangle', 0.06);
      }, 80);
    },

    binocularZoom() {
      this.ensure();
      if (!this.ctx) return;
      this.playTone(220, 0.12, 'sine', 0.08, 440);
      setTimeout(() => {
        if (!this.ctx) return;
        this.playTone(880, 0.08, 'triangle', 0.06, 1760);
      }, 50);
    },

    telescopeFocus() {
      this.ensure();
      if (!this.ctx) return;
      this.playTone(330, 0.18, 'triangle', 0.08, 523);
      setTimeout(() => {
        if (!this.ctx) return;
        this.playTone(659, 0.22, 'sine', 0.09, 1046);
        this.playTone(1318, 0.25, 'triangle', 0.06);
      }, 65);
    },

    cloudSharkWaveChime() {
      this.ensure();
      if (!this.ctx) return;
      this.playTone(587, 0.15, 'sine', 0.08);
      setTimeout(() => {
        if (!this.ctx) return;
        this.playTone(880, 0.18, 'triangle', 0.09);
        this.playTone(1174, 0.22, 'sine', 0.07);
      }, 70);
    },

    seamDetectorPing(proximity = 0.5) {
      this.ensure();
      if (!this.ctx || this.ctx.state !== 'running') return;
      const baseFreq = 540 + proximity * 780; // 540Hz to 1320Hz
      this.playTone(baseFreq, 0.06, 'sine', 0.05 * (0.4 + proximity * 0.6), baseFreq * 1.3);
    },

    pocketWatchClick() {
      this.ensure();
      if (!this.ctx || this.ctx.state !== 'running') return;
      this.playTone(1840, 0.03, 'triangle', 0.06, 1200);
      setTimeout(() => {
        if (!this.ctx) return;
        this.playTone(2400, 0.02, 'sine', 0.04);
      }, 35);
    },

    hurtSqueak() {
      this.ensure();
      if (!this.ctx) return;
      this.playTone(180, 0.22, 'sawtooth', 0.16, 90);
      this.playTone(520, 0.14, 'square', 0.08, 280);
    },

    ovenBake() {
      this.ensure();
      if (!this.ctx) return;
      this.playTone(261.63, 0.24, 'sine', 0.12, 523.25);
      setTimeout(() => {
        if (!this.ctx) return;
        this.playTone(659.25, 0.32, 'triangle', 0.10, 783.99);
      }, 90);
    },

    waterSplash(vol = 0.1, duration = 0.25) {
      this.ensure();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const noise = this.getNoiseBuffer();
      const src = this.ctx.createBufferSource();
      src.buffer = noise;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(800 + Math.random() * 300, now);
      filter.frequency.exponentialRampToValueAtTime(260, now + duration);
      filter.Q.setValueAtTime(1.8, now);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(Math.max(0.0002, vol), now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain || this.ctx.destination);
      src.start(now);
      src.stop(now + duration);

      // Droplet plink
      this.playTone(750 + Math.random() * 250, 0.08, 'sine', vol * 0.6, 400);
    },

    cartRoll() {
      if (gameSettings && !gameSettings.sfxVol) return;
      this.ensure();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      if (now - (this.lastCartSound || 0) < 0.14) return;
      this.lastCartSound = now;
      // Commercial caster rattle on tile floor
      this.playTone(310 + Math.random() * 90, 0.038, 'triangle', 0.045, 170 + Math.random() * 50);
      if (Math.random() < 0.22) {
        this.playTone(1100 + Math.random() * 300, 0.045, 'sine', 0.025, 850);
      }
    },

    cartHop() {
      this.ensure();
      this.playTone(520, 0.08, 'sine', 0.09, 720);
    },

    bubblePop() {
      if (gameSettings && !gameSettings.sfxVol) return;
      this.ensure();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      if (now - (this.lastBubblePopTime || 0) < 0.12) return;
      this.lastBubblePopTime = now;

      // Soft, playful cartoon bubble pop chime
      const freq = 820 + Math.random() * 450;
      this.playTone(freq, 0.035, 'sine', 0.065, freq + 380);
    },

    glassSqueak() {
      if (gameSettings && !gameSettings.sfxVol) return;
      this.ensure();
      if (!this.ctx) return;
      // Comical rubber glass thud followed by friction squeak
      this.playTone(190, 0.07, 'triangle', 0.22, 70);
      setTimeout(() => {
        if (!this.ctx) return;
        this.playTone(960 + Math.random() * 120, 0.09, 'sine', 0.16, 1260);
      }, 35);
    },

    suctionPop() {
      if (gameSettings && !gameSettings.sfxVol) return;
      this.ensure();
      if (!this.ctx) return;
      // Comical suction release pop when unstuck from window
      this.playTone(390, 0.05, 'sine', 0.18, 920);
    },

    birthdayFanfare() {
      if (gameSettings && !gameSettings.sfxVol) return;
      this.ensure();
      if (!this.ctx) return;
      const notes = [
        { f: 261.63, d: 0.18, t: 0.00 }, // C4
        { f: 261.63, d: 0.18, t: 0.20 }, // C4
        { f: 293.66, d: 0.35, t: 0.40 }, // D4
        { f: 261.63, d: 0.35, t: 0.78 }, // C4
        { f: 349.23, d: 0.35, t: 1.15 }, // F4
        { f: 329.63, d: 0.65, t: 1.52 }, // E4
        { f: 261.63, d: 0.18, t: 2.25 }, // C4
        { f: 261.63, d: 0.18, t: 2.45 }, // C4
        { f: 293.66, d: 0.35, t: 2.65 }, // D4
        { f: 261.63, d: 0.35, t: 3.02 }, // C4
        { f: 392.00, d: 0.35, t: 3.40 }, // G4
        { f: 349.23, d: 0.70, t: 3.78 }  // F4
      ];
      notes.forEach((n) => {
        setTimeout(() => {
          if (!this.ctx) return;
          this.playTone(n.f, n.d, 'triangle', 0.14, n.f * 1.5);
          this.playTone(n.f * 2, n.d * 0.8, 'sine', 0.07, n.f * 2.5);
        }, n.t * 1000);
      });
    },

    bistroChime() {
      if (gameSettings && !gameSettings.sfxVol) return;
      this.ensure();
      if (!this.ctx) return;
      this.playTone(1046.5, 0.45, 'sine', 0.12, 2093);
      setTimeout(() => {
        if (!this.ctx) return;
        this.playTone(1318.5, 0.55, 'sine', 0.10, 2637);
      }, 90);
    },

    bistroClocheDing() {
      if (gameSettings && !gameSettings.sfxVol) return;
      this.ensure();
      if (!this.ctx) return;
      this.playTone(2093.0, 0.85, 'sine', 0.14, 3135.96);
      this.playTone(3135.96, 0.65, 'triangle', 0.08, 4186.0);
    },

    eatChomp() {
      if (gameSettings && !gameSettings.sfxVol) return;
      this.ensure();
      if (!this.ctx) return;
      // 3 crisp munch / chomp sound bites
      [0, 0.12, 0.24].forEach((t, i) => {
        setTimeout(() => {
          if (!this.ctx) return;
          this.playTone(320 - i * 30, 0.06, 'triangle', 0.18, 120);
          this.playTone(680 - i * 60, 0.04, 'sine', 0.12, 240);
        }, t * 1000);
      });
      // Satisfying swallow slide
      setTimeout(() => {
        if (!this.ctx) return;
        this.playTone(280, 0.18, 'sine', 0.14, 160);
      }, 360);
      // Sparkly pentatonic celebration arpeggio
      const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98];
      notes.forEach((freq, idx) => {
        setTimeout(() => {
          if (!this.ctx) return;
          this.playTone(freq, 0.35, 'triangle', 0.08, freq * 1.5);
          this.playTone(freq * 1.5, 0.25, 'sine', 0.05);
        }, 480 + idx * 60);
      });
    },

    birthdayHorn() {
      if (gameSettings && !gameSettings.sfxVol) return;
      this.ensure();
      if (!this.ctx) return;
      try {
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(460, now + 0.18);
        osc.frequency.linearRampToValueAtTime(425, now + 0.38);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1450, now);
        filter.Q.setValueAtTime(3.8, now);

        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(0.22, now + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.44);

        setTimeout(() => {
          if (!this.ctx) return;
          this.playTone(1760.0, 0.45, 'triangle', 0.12, 2640.0);
          this.playTone(2200.0, 0.40, 'sine', 0.09);
        }, 150);
      } catch (e) {
        this.playTone(587.33, 0.35, 'triangle', 0.18, 1174.66);
      }
    },

    // =========================================================================
    // LAUNDROMAT & MASTER WASHER #7 AUDIO SUITE
    // =========================================================================
    washerDoorLatch() {
      if (gameSettings && !gameSettings.sfxVol) return;
      this.ensure();
      if (!this.ctx) return;
      // 1. Heavy industrial rubber gasket compression thud
      this.playTone(85, 0.12, 'sine', 0.22, 38);
      // 2. High-tensile spring latch snap click
      setTimeout(() => {
        if (!this.ctx) return;
        this.playTone(1350, 0.035, 'square', 0.14, 520);
        this.playTone(720, 0.05, 'triangle', 0.16, 260);
      }, 25);
    },

    washerDoorOpen() {
      if (gameSettings && !gameSettings.sfxVol) return;
      this.ensure();
      if (!this.ctx) return;
      // Spring pop release click and handle snap
      this.playTone(920, 0.04, 'triangle', 0.12, 1280);
      setTimeout(() => {
        if (!this.ctx) return;
        this.playTone(280, 0.08, 'sine', 0.15, 140);
      }, 20);
    },

    washerFill() {
      if (gameSettings && !gameSettings.sfxVol) return;
      this.ensure();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const dur = 1.6;
      // High-pressure water inrush: bandpass swept pink noise
      const noise = this.getNoiseBuffer();
      const src = this.ctx.createBufferSource();
      src.buffer = noise;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(850, now);
      filter.frequency.exponentialRampToValueAtTime(320, now + dur);
      filter.Q.setValueAtTime(2.2, now);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.09, now + 0.2);
      gain.gain.setValueAtTime(0.09, now + dur - 0.3);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain || this.ctx.destination);
      src.start(now);
      src.stop(now + dur);

      // Bubbling inrush droplet plinks
      for (let i = 0; i < 4; i++) {
        setTimeout(() => {
          if (!this.ctx) return;
          this.playTone(650 + Math.random() * 350, 0.06, 'sine', 0.035, 380);
        }, 180 + i * 260);
      }
    },

    washerSlosh(intensity = 0.5) {
      if (gameSettings && !gameSettings.sfxVol) return;
      this.ensure();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      if (now - (this.lastWasherSloshTime || 0) < 0.22) return;
      this.lastWasherSloshTime = now;

      const dur = 0.38;
      // Soapy water swoosh & foam squish
      const noise = this.getNoiseBuffer();
      const src = this.ctx.createBufferSource();
      src.buffer = noise;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(320 + Math.random() * 120, now);
      filter.frequency.linearRampToValueAtTime(680, now + dur * 0.4);
      filter.frequency.exponentialRampToValueAtTime(240, now + dur);
      const gain = this.ctx.createGain();
      const vol = Math.min(0.12, 0.06 * intensity);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(vol, now + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain || this.ctx.destination);
      src.start(now);
      src.stop(now + dur);

      // Suds squelch & bubble chime
      this.playTone(240 + Math.random() * 80, 0.12, 'sine', vol * 0.8, 140);
      if (Math.random() < 0.45) {
        this.playTone(720 + Math.random() * 280, 0.04, 'sine', vol * 0.5, 960);
      }
    },

    updateWasherSpin(spinT, totalSpinDuration = 4.5) {
      if (gameSettings && !gameSettings.sfxVol) return;
      this.ensure();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const prog = Math.min(1.0, Math.max(0, spinT / totalSpinDuration));

      if (!this.washerMotorOsc) {
        try {
          // Main motor induction whine (triangle wave)
          this.washerMotorOsc = this.ctx.createOscillator();
          this.washerMotorOsc.type = 'triangle';
          this.washerMotorOsc.frequency.setValueAtTime(65, now);

          // 2x Harmonic whine (sine wave)
          this.washerMotorHarmonic = this.ctx.createOscillator();
          this.washerMotorHarmonic.type = 'sine';
          this.washerMotorHarmonic.frequency.setValueAtTime(130, now);

          // Sub-bass drum wobble rumble (sine 32Hz)
          this.washerWobbleOsc = this.ctx.createOscillator();
          this.washerWobbleOsc.type = 'sine';
          this.washerWobbleOsc.frequency.setValueAtTime(32, now);

          this.washerMotorGain = this.ctx.createGain();
          this.washerMotorGain.gain.setValueAtTime(0.001, now);

          this.washerMotorFilter = this.ctx.createBiquadFilter();
          this.washerMotorFilter.type = 'lowpass';
          this.washerMotorFilter.frequency.setValueAtTime(450, now);

          this.washerMotorOsc.connect(this.washerMotorFilter);
          this.washerMotorHarmonic.connect(this.washerMotorFilter);
          this.washerMotorFilter.connect(this.washerMotorGain);
          this.washerMotorGain.connect(this.sfxGain || this.ctx.destination);

          this.washerWobbleGain = this.ctx.createGain();
          this.washerWobbleGain.gain.setValueAtTime(0.001, now);
          this.washerWobbleOsc.connect(this.washerWobbleGain);
          this.washerWobbleGain.connect(this.sfxGain || this.ctx.destination);

          this.washerMotorOsc.start(now);
          this.washerMotorHarmonic.start(now);
          this.washerWobbleOsc.start(now);
        } catch (e) {
          console.warn('Washer spin synth init:', e);
        }
      }

      if (this.washerMotorOsc && this.washerMotorGain) {
        // Frequency ramps from 65Hz up to 290Hz (centrifuge high RPM)
        const targetFreq = 65 + Math.pow(prog, 1.2) * 225;
        this.washerMotorOsc.frequency.setTargetAtTime(targetFreq, now, 0.08);
        if (this.washerMotorHarmonic) {
          this.washerMotorHarmonic.frequency.setTargetAtTime(targetFreq * 2.0, now, 0.08);
        }
        if (this.washerMotorFilter) {
          this.washerMotorFilter.frequency.setTargetAtTime(350 + prog * 550, now, 0.08);
        }
        const motorVol = 0.015 + prog * 0.055;
        this.washerMotorGain.gain.setTargetAtTime(motorVol, now, 0.08);

        // Subwoofer drum wobble: pulsates with uncentered drum RPM
        if (this.washerWobbleOsc && this.washerWobbleGain) {
          const wobbleFreq = 26 + prog * 22;
          this.washerWobbleOsc.frequency.setTargetAtTime(wobbleFreq, now, 0.08);
          const wobbleVol = (0.02 + prog * 0.05) * (0.6 + 0.4 * Math.sin(now * wobbleFreq * 0.5));
          this.washerWobbleGain.gain.setTargetAtTime(wobbleVol, now, 0.05);
        }
      }
    },

    updateWasherDecel(finishT, totalDecelDuration = 1.5) {
      if (!this.ctx || !this.washerMotorGain) return;
      const now = this.ctx.currentTime;
      const prog = Math.min(1.0, Math.max(0, finishT / totalDecelDuration));
      const targetFreq = Math.max(30, 290 * (1.0 - prog));
      if (this.washerMotorOsc) {
        this.washerMotorOsc.frequency.setTargetAtTime(targetFreq, now, 0.1);
      }
      if (this.washerMotorHarmonic) {
        this.washerMotorHarmonic.frequency.setTargetAtTime(targetFreq * 2.0, now, 0.1);
      }
      const motorVol = 0.07 * (1.0 - prog);
      this.washerMotorGain.gain.setTargetAtTime(Math.max(0.0001, motorVol), now, 0.1);
      if (this.washerWobbleGain) {
        this.washerWobbleGain.gain.setTargetAtTime(Math.max(0.0001, 0.05 * (1.0 - prog)), now, 0.1);
      }
      if (prog >= 0.98) {
        this.stopWasherAudio();
      }
    },

    stopWasherAudio() {
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      if (this.washerMotorGain) {
        this.washerMotorGain.gain.setTargetAtTime(0.0001, now, 0.05);
      }
      if (this.washerWobbleGain) {
        this.washerWobbleGain.gain.setTargetAtTime(0.0001, now, 0.05);
      }
      setTimeout(() => {
        try {
          if (this.washerMotorOsc) { this.washerMotorOsc.stop(); this.washerMotorOsc.disconnect(); }
          if (this.washerMotorHarmonic) { this.washerMotorHarmonic.stop(); this.washerMotorHarmonic.disconnect(); }
          if (this.washerWobbleOsc) { this.washerWobbleOsc.stop(); this.washerWobbleOsc.disconnect(); }
        } catch (e) {}
        this.washerMotorOsc = null;
        this.washerMotorHarmonic = null;
        this.washerWobbleOsc = null;
        this.washerMotorGain = null;
        this.washerWobbleGain = null;
        this.washerMotorFilter = null;
      }, 100);
    },

    washerGlassSplat() {
      if (gameSettings && !gameSettings.sfxVol) return;
      this.ensure();
      if (!this.ctx) return;
      // Comical rubbery suction thud followed by wet friction squeak
      this.playTone(190, 0.07, 'triangle', 0.22, 70);
      setTimeout(() => {
        if (!this.ctx) return;
        this.playTone(960 + Math.random() * 120, 0.09, 'sine', 0.16, 1260);
      }, 35);
    },

    washerSuctionPop() {
      if (gameSettings && !gameSettings.sfxVol) return;
      this.ensure();
      if (!this.ctx) return;
      // Comical suction release pop when unstuck from window
      this.playTone(390, 0.05, 'sine', 0.18, 920);
    },

    washerDrain() {
      if (gameSettings && !gameSettings.sfxVol) return;
      this.ensure();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      if (now - (this.lastWasherDrainTime || 0) < 0.4) return;
      this.lastWasherDrainTime = now;
      const dur = 0.55;
      const noise = this.getNoiseBuffer();
      const src = this.ctx.createBufferSource();
      src.buffer = noise;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(280, now);
      filter.exponentialRampToValueAtTime(140, now + dur);
      filter.Q.setValueAtTime(3.0, now);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.05, now + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain || this.ctx.destination);
      src.start(now);
      src.stop(now + dur);
      // Gurgle bubble plink
      this.playTone(340, 0.08, 'sine', 0.04, 210);
    },

    // =========================================================================
    // LAUNDRY CARTS AUDIO SUITE
    // =========================================================================
    updateCartRoll(speed, dt) {
      if (gameSettings && !gameSettings.sfxVol) return;
      this.ensure();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const absSpeed = Math.abs(speed || 0);

      if (!this.cartRollGain) {
        const noise = this.getNoiseBuffer();
        const src = this.ctx.createBufferSource();
        src.buffer = noise;
        src.loop = true;
        this.cartRollFilter = this.ctx.createBiquadFilter();
        this.cartRollFilter.type = 'bandpass';
        this.cartRollFilter.frequency.setValueAtTime(220, now);
        this.cartRollFilter.Q.setValueAtTime(1.8, now);
        this.cartRollGain = this.ctx.createGain();
        this.cartRollGain.gain.setValueAtTime(0.0001, now);
        src.connect(this.cartRollFilter);
        this.cartRollFilter.connect(this.cartRollGain);
        this.cartRollGain.connect(this.sfxGain || this.ctx.destination);
        src.start();
        this.cartRollDist = 0;
        this.nextCartSqueakDist = 7.0;
      }

      if (absSpeed > 0.35) {
        const norm = Math.min(1.0, absSpeed / 9.0);
        const targetVol = 0.02 + norm * 0.055;
        const targetFreq = 180 + norm * 260;
        this.cartRollGain.gain.setTargetAtTime(targetVol, now, 0.06);
        this.cartRollFilter.frequency.setTargetAtTime(targetFreq, now, 0.08);

        // Tile grout seams click: every ~1.2m traveled
        this.cartRollDist = (this.cartRollDist || 0) + absSpeed * dt;
        if (this.cartRollDist >= (this.nextGroutClick || 1.2)) {
          this.nextGroutClick = (this.nextGroutClick || 1.2) + 1.2 + Math.random() * 0.4;
          this.playTone(380 + Math.random() * 60, 0.025, 'triangle', 0.03 * norm, 240);
        }

        // Periodic playful caster wheel squeak
        if (this.cartRollDist >= (this.nextCartSqueakDist || 7.0)) {
          this.nextCartSqueakDist = this.cartRollDist + 6.0 + Math.random() * 7.0;
          this.playTone(1180 + Math.random() * 240, 0.055, 'sine', 0.045, 1420);
        }
      } else {
        this.cartRollGain.gain.setTargetAtTime(0.0001, now, 0.12);
      }
    },

    stopCartRoll() {
      if (this.cartRollGain && this.ctx) {
        this.cartRollGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.05);
      }
    },

    cartMount() {
      if (gameSettings && !gameSettings.sfxVol) return;
      this.ensure();
      if (!this.ctx) return;
      // Spring bounce dip & metallic wire frame clank
      this.playTone(160, 0.14, 'triangle', 0.16, 280);
      setTimeout(() => {
        if (!this.ctx) return;
        this.playTone(680, 0.08, 'triangle', 0.12, 420);
        this.playTone(1850, 0.04, 'sine', 0.06, 1400);
      }, 35);
    },

    cartDismount() {
      if (gameSettings && !gameSettings.sfxVol) return;
      this.ensure();
      if (!this.ctx) return;
      // Wire spring release rattle + light floor landing
      this.playTone(320, 0.08, 'triangle', 0.10, 480);
      setTimeout(() => {
        if (!this.ctx) return;
        this.playTone(190, 0.06, 'sine', 0.09, 90);
      }, 40);
    },

    cartBump(intensity = 4.0, obstacleType = 'wall') {
      if (gameSettings && !gameSettings.sfxVol) return;
      this.ensure();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      if (now - (this.lastCartBumpTime || 0) < 0.14) return;
      this.lastCartBumpTime = now;

      const normInt = Math.min(1.0, Math.max(0.2, intensity / 8.0));

      if (obstacleType === 'cart') {
        // Metallic wire basket clang: dual dissonant ringing tones with basket shudder
        this.playTone(540 + Math.random() * 40, 0.18, 'triangle', 0.16 * normInt, 320);
        this.playTone(880 + Math.random() * 60, 0.15, 'sine', 0.12 * normInt, 640);
        setTimeout(() => {
          if (!this.ctx) return;
          this.playTone(1450, 0.08, 'sine', 0.08 * normInt, 1100);
        }, 25);
      } else if (obstacleType === 'washer') {
        // Enamel sheet-metal washing machine panel thud + wire shudder
        this.playTone(110 + Math.random() * 20, 0.15, 'triangle', 0.20 * normInt, 45);
        this.playTone(310, 0.12, 'square', 0.07 * normInt, 160);
      } else {
        // Wall rubber bumper hollow thud + cartoon spring boing
        this.playTone(125 + Math.random() * 25, 0.12, 'sine', 0.18 * normInt, 45);
        setTimeout(() => {
          if (!this.ctx) return;
          this.playTone(420 + Math.random() * 60, 0.15, 'triangle', 0.11 * normInt, 620);
        }, 40);
      }
    },

    catBounce(intensity = 2.5) {
      if (gameSettings && !gameSettings.sfxVol) return;
      this.ensure();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      if (now - (this.lastCatBounceTime || 0) < 0.22) return;
      this.lastCatBounceTime = now;

      const norm = Math.min(1.0, Math.max(0.3, intensity / 4.0));
      // Soft plush squelch + cute cartoon boing + soft playful squeak
      this.playTone(280, 0.12, 'sine', 0.16 * norm, 140);
      setTimeout(() => {
        if (!this.ctx) return;
        this.playTone(460, 0.14, 'triangle', 0.12 * norm, 780);
      }, 35);
      if (Math.random() < 0.65) {
        setTimeout(() => {
          if (!this.ctx) return;
          this.playTone(860 + Math.random() * 120, 0.09, 'sine', 0.08 * norm, 1020);
        }, 90);
      }
    },

    // =========================================================================
    // LAUNDROMAT AMBIENT & INTERACTABLES
    // =========================================================================
    vendingPurchase() {
      if (gameSettings && !gameSettings.sfxVol) return;
      this.ensure();
      if (!this.ctx) return;
      this.coinDrop();
      setTimeout(() => {
        if (!this.ctx) return;
        this.playTone(210, 0.32, 'sawtooth', 0.06, 195);
      }, 150);
      setTimeout(() => {
        if (!this.ctx) return;
        this.playTone(95, 0.14, 'triangle', 0.22, 40);
        this.playTone(680, 0.06, 'sine', 0.10, 320);
      }, 520);
    },

    paperRustle() {
      if (gameSettings && !gameSettings.sfxVol) return;
      this.ensure();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const dur = 0.14;
      const noise = this.getNoiseBuffer();
      const src = this.ctx.createBufferSource();
      src.buffer = noise;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1450, now);
      filter.Q.setValueAtTime(1.4, now);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.06, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain || this.ctx.destination);
      src.start(now);
      src.stop(now + dur);
      this.playTone(2200, 0.02, 'sine', 0.04);
    },

    woodCreak() {
      this.ensure();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      const f = 110 + Math.random() * 40;
      osc.frequency.setValueAtTime(f, now);
      osc.frequency.linearRampToValueAtTime(f + 25, now + 0.18);
      gain.gain.setValueAtTime(0.02, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(320, now);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain || this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.22);
    },

    beepNose() {
      this.playTone(520, 0.14, 'sine', 0.14, 780);
      setTimeout(() => this.playTone(780, 0.18, 'triangle', 0.12, 1040), 90);
    },
    shonk() {
      this.playTone(380, 0.12, 'triangle', 0.14, 620);
    },
    shonkPop() {
      this.playTone(420, 0.12, 'sine', 0.16, 840);
      setTimeout(() => this.playTone(840, 0.10, 'triangle', 0.10, 1120), 50);
    },
    birbChirp() {
      if (gameSettings && !gameSettings.birbCalls) return;
      const base = 960 + Math.random() * 120;
      this.playTone(base, 0.08, 'sine', 0.1, base + 420);
      setTimeout(() => this.playTone(base + 260, 0.09, 'sine', 0.09, base + 680), 65);
    },
    boopAttack() {
      this.playTone(320, 0.12, 'triangle', 0.18, 580);
      setTimeout(() => this.playTone(580, 0.15, 'sine', 0.15, 240), 60);
    },
    boopHit() {
      this.playTone(180, 0.16, 'sawtooth', 0.22, 90);
      setTimeout(() => this.playTone(540, 0.20, 'triangle', 0.20, 880), 40);
    },
    boopLaunch() {
      this.playTone(180, 0.65, 'sawtooth', 0.25, 1200);
      setTimeout(() => this.playTone(1760, 0.45, 'sine', 0.28, 2640), 550);
      setTimeout(() => this.playTone(3520, 0.60, 'triangle', 0.22), 700);
    },
    carrotBoop() {
      this.playTone(300, 0.18, 'triangle', 0.16, 680);
      setTimeout(() => this.playTone(680, 0.22, 'sine', 0.12, 220), 90);
    },
    trapHit() {
      this.playTone(160, 0.32, 'sawtooth', 0.16, 65);
    },
    groomBrush() {
      this.playTone(540, 0.14, 'triangle', 0.12, 880);
      setTimeout(() => this.playTone(880, 0.16, 'sine', 0.10, 660), 75);
    },
    coinDrop() {
      this.playTone(880, 0.08, 'sine', 0.14, 1320);
      setTimeout(() => this.playTone(1320, 0.12, 'triangle', 0.16, 660), 65);
    },
    laundromatDing() {
      if (gameSettings && !gameSettings.sfxVol) return;
      this.ensure();
      if (!this.ctx) return;
      // 3-bell cheerful commercial electronic washer chime: E5 -> G#5 -> B5
      const notes = [
        { f: 659.25, d: 0.35, g: 0.15, delay: 0 },
        { f: 830.61, d: 0.40, g: 0.16, delay: 140 },
        { f: 987.77, d: 0.75, g: 0.18, delay: 280 }
      ];
      notes.forEach((n) => {
        setTimeout(() => {
          if (!this.ctx) return;
          this.playTone(n.f, n.d, 'sine', n.g);
          this.playTone(n.f * 2, n.d * 0.6, 'sine', n.g * 0.35);
        }, n.delay);
      });
    },
    fireworkWhistle() {
      if (gameSettings && !gameSettings.sfxVol) return;
      this.ensure();
      if (!this.ctx) return;
      this.playTone(380, 1.8, 'sine', 0.16, 2400);
    },
    fireworkBoom() {
      if (gameSettings && !gameSettings.sfxVol) return;
      this.ensure();
      if (!this.ctx) return;
      this.playTone(120, 1.4, 'sawtooth', 0.35, 30);
      setTimeout(() => this.playTone(330, 0.7, 'triangle', 0.22, 110), 80);
      setTimeout(() => this.playTone(660, 0.6, 'sine', 0.18, 220), 160);
      setTimeout(() => this.portalChime(), 320);
    },
    teaPour() {
      [440, 554.37, 659.25, 880].forEach((f, i) => {
        setTimeout(() => this.playTone(f, 0.28, 'sine', 0.1), i * 75);
      });
    },
    portalChime() {
      [330, 493.88, 659.25, 987.77].forEach((f, i) => {
        setTimeout(() => this.playTone(f, 0.36, 'triangle', 0.1), i * 85);
      });
    },
    allenBuild() {
      [392, 523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
        setTimeout(() => this.playTone(f, 0.22, 'triangle', 0.13), i * 55);
      });
    },
    bounceBoing() {
      this.playTone(220, 0.36, 'sine', 0.18, 880);
    }
  };
  window.CozyAudio = CozyAudio;

  // Bridge to allow world updates to trigger positional audio events
  window.CozyAudioTrigger = {
    fishSplash: (pos) => {
      if (player && player.pos) {
        const d = player.pos.distanceTo(pos);
        if (d < 45) {
          const vol = Math.max(0.01, 0.08 * (1.0 - d / 45));
          CozyAudio.waterSplash(vol, 0.2);
        }
      }
    }
  };

  // --- Core 3D Scene & Post-Processing State ---
  let scene, camera, renderer, composer, renderPass, clock;
  let worldApi = null;
  let worldPickups = null;
  let solomonBreadOven = null;
  let communityTrunk = null;
  let launchMortarStation = null;
  const activeRockets = [];

  // --------------------------------------------------------------------------
  // INDIVIDUAL SHARK SETTINGS: MANGE FACTOR & ACCESSORIES
  // --------------------------------------------------------------------------
  const SHARK_DEFAULTS = {
    hermes: { mange: 0.85, relic: true, headgear: true },
    solomon: { mange: 0.45, relic: true, headgear: true },
    hiram: { mange: 0.65, relic: true, headgear: true },
    nimue: { mange: 0.25, relic: true, headgear: true },
    custom: { mange: 0.10, relic: true, headgear: true }
  };

  function formatMangeLabel(pct) {
    let desc = 'Mangy Veteran';
    if (pct === 0) desc = 'Mint In Box';
    else if (pct < 20) desc = 'Fresh & Pristine';
    else if (pct < 40) desc = 'Gentle Snuggles';
    else if (pct < 65) desc = 'Well-Loved Plush';
    else if (pct < 85) desc = 'Seasoned Adventurer';
    else desc = 'The Mangy One';
    return `${Math.round(pct)}% · ${desc}`;
  }

  function getSharkMange(sharkId) {
    const saved = localStorage.getItem('blahaj_mange_' + sharkId);
    if (saved !== null) return parseFloat(saved);
    return SHARK_DEFAULTS[sharkId] ? SHARK_DEFAULTS[sharkId].mange : 0.70;
  }

  let lastMangeStorageWriteAt = 0;
  function setSharkMange(sharkId, val) {
    val = Math.max(0.0, Math.min(1.0, val));
    const nowMs = Date.now();
    if (nowMs - lastMangeStorageWriteAt > 5000) {
      lastMangeStorageWriteAt = nowMs;
      try { localStorage.setItem('blahaj_mange_' + sharkId, val.toString()); } catch (e) {}
    }
    if (player.sharkId === sharkId) {
      window.__BLAHAJ_MANGE__ = val;
      const cfg = LORE.sharks[sharkId];
      if (player.mesh && window.BlahajModels && typeof window.BlahajModels.updateSharkMange === 'function') {
        window.BlahajModels.updateSharkMange(player.mesh, val);
      } else {
        if (player.mesh && player.mesh.parent) {
          player.mesh.parent.remove(player.mesh);
        }
        const acc = getSharkAccessories(sharkId);
        player.mesh = window.BlahajModels.createPlushShark(cfg, val, acc);
        player.mesh.position.copy(player.pos);
        player.mesh.rotation.y = player.rotY;
        const activeScene = getActiveScene();
        activeScene.add(player.mesh);
      }

      // Sync HUD slider
      const hudSlider = document.getElementById('mange-factor-slider');
      const hudLabel = document.getElementById('mange-value-label');
      if (hudSlider && hudLabel) {
        const pct = Math.round(val * 100);
        hudSlider.value = pct;
        hudLabel.textContent = formatMangeLabel(pct);
      }

      // Sync Character Sheet if open
      const csSlider = document.getElementById('cs-mange-slider');
      const csValText = document.getElementById('cs-mange-val-text');
      if (csSlider && csValText && typeof selectedCSShark !== 'undefined' && selectedCSShark === sharkId) {
        const pct = Math.round(val * 100);
        csSlider.value = pct;
        csValText.textContent = formatMangeLabel(pct);
      }

      if (window.BlahajNetwork) {
        window.BlahajNetwork.send({ type: 'mange_sync', mange: val });
      }
    }
  }

  function adjustSharkMange(sharkId, delta, reason = '') {
    const cur = getSharkMange(sharkId);
    const next = Math.max(0.0, Math.min(1.0, cur + delta));
    if (Math.abs(next - cur) >= 0.004) {
      setSharkMange(sharkId, next);
      if (player.sharkId === sharkId && reason) {
        const isHeal = delta < 0;
        const color = isHeal ? 0x77eeff : 0xd88866;
        spawnFloatingBurst(player.pos, color, isHeal ? 16 : 10);
      }
    }
    return next;
  }

  function getSharkAccessories(sharkId) {
    const saved = localStorage.getItem('blahaj_acc_' + sharkId);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {
      showRelic: SHARK_DEFAULTS[sharkId] ? SHARK_DEFAULTS[sharkId].relic : true,
      showHeadgear: SHARK_DEFAULTS[sharkId] ? SHARK_DEFAULTS[sharkId].headgear : true
    };
  }

  function setSharkAccessories(sharkId, acc) {
    localStorage.setItem('blahaj_acc_' + sharkId, JSON.stringify(acc));
    if (player.sharkId === sharkId && player.mesh) {
      window.BlahajModels.updateSharkAccessories(player.mesh, acc);
    }
  }

  // Active shark mange factor (Hermes starts at 85% mangy veteran by default)
  window.__BLAHAJ_MANGE__ = getSharkMange('hermes');

  // --------------------------------------------------------------------------
  // 16-SLOT MMO SATCHEL INVENTORY & PAPERDOLL EQUIPMENT REGISTRY
  // --------------------------------------------------------------------------
  const PAPERDOLL_GEAR = {
    hermes: {
      head: { icon: '🧢', name: 'Traveler\'s Hood' },
      neck: { icon: '🧣', name: 'Rust Wool Scarf' },
      relic: { icon: '🏮', name: 'Between Lantern' },
      satchel: { icon: '🎒', name: 'Plush Haversack' },
      trinket: { icon: '🥕', name: 'Balcony Carrot' }
    },
    solomon: {
      head: { icon: '👨‍🍳', name: 'Star-Chef Toque' },
      neck: { icon: '🧣', name: 'Navy Silk Ribbon' },
      relic: { icon: '🫖', name: 'Porcelain Teapot' },
      satchel: { icon: '🥖', name: 'Bread Basket' },
      trinket: { icon: '☕', name: 'Star-Forged Cup' }
    },
    hiram: {
      head: { icon: '🥽', name: 'Builder Goggles' },
      neck: { icon: '🧣', name: 'Ochre Work Scarf' },
      relic: { icon: '🔧', name: 'Hex Key M10' },
      satchel: { icon: '🧰', name: 'Architect Pack' },
      trinket: { icon: '🌋', name: 'Obsidian Pebble' }
    },
    nimue: {
      head: { icon: '👑', name: 'Starlit Coronet' },
      neck: { icon: '🪡', name: 'Violet Silk Band' },
      relic: { icon: '💎', name: 'Star Crystal' },
      satchel: { icon: '📜', name: 'Scroll Case' },
      trinket: { icon: '✨', name: 'Golden Needle' }
    },
    custom: {
      head: { icon: '✂️', name: 'Detagged Plush Crown' },
      neck: { icon: '🧣', name: 'Hand-Knit Archipelago Scarf' },
      relic: { icon: '📏', name: 'Ingvar’s Brass Tape & Hex Key' },
      satchel: { icon: '🎒', name: 'Spawning-Pit Satchel' },
      trinket: { icon: '🏷️', name: 'Retired Barcode Tag (303.735.88)' }
    }
  };

  const MMO_INVENTORY_ITEMS = [
    {
      slot: 0,
      icon: '🥖',
      name: 'Warm Breb Loaf',
      qty: 5,
      rarity: 'cozy',
      type: 'Consumable · Summons Birbs',
      desc: 'Golden freshly-baked loaves from Solomon\'s kitchen. Toss onto meadow grass with [B] to feed and gather plump round island Birbs.',
      stats: '+100% Birb Gathering Radius · Steaming Warmth'
    },
    {
      slot: 1,
      icon: '🫖',
      name: 'Earl Grey Infusion',
      qty: 3,
      rarity: 'rare',
      type: 'Sacred Brew · Restores Tea Comfort',
      desc: 'Solomon\'s sacred ceremonial tea steeped with sweet orange blossom and bergamot. Instantly fills the Tea Comfort meter to 100%.',
      stats: '+100% Tea Comfort · Grants Warmth Buff'
    },
    {
      slot: 2,
      icon: '🥕',
      name: 'Beach-Shorts Carrot Figurine',
      qty: 1,
      rarity: 'legendary',
      type: 'Sacred Balcony Souvenir',
      desc: 'A rubber-clad carrot in floral boardshorts that tumbled off the high Volcano Balcony and bounced unharmed into the sea.',
      stats: '+15% Plush Bounce Height · Lucky Charm'
    },
    {
      slot: 3,
      icon: '🔧',
      name: 'Sacred Hex Key M10',
      qty: 1,
      rarity: 'epic',
      type: 'Architectural Instrument',
      desc: 'Hiram\'s indestructible brass hex key. Unlocks bridges, ramps, observation docks, and pocket portals across the archipelago.',
      stats: 'Unlocks Master Builder Mode [C] · Zero Decay'
    },
    {
      slot: 4,
      icon: '🪡',
      name: 'Golden Seam Needle',
      qty: 1,
      rarity: 'epic',
      type: 'Cosmic Relic · Seam Weaving',
      desc: 'Nimue\'s luminous silver-gold needle that knits reality back together. Glows brightly whenever a Great Seam rift is near.',
      stats: '+40% Seam Mend Radius · Night Illumination'
    },
    {
      slot: 5,
      icon: '🏮',
      name: 'Between Star Lantern',
      qty: 1,
      rarity: 'epic',
      type: 'Dimensional Beacon',
      desc: 'Hermes\'s eternal lantern. Burns with violet-amber starlight, revealing paths between Los Angeles and New Zealand shores.',
      stats: 'Portal Guide Beacon · Clears Interdimensional Fog'
    },
    {
      slot: 6,
      icon: '🏐',
      name: 'Striped Beach Ball',
      qty: 2,
      rarity: 'cozy',
      type: 'Physics Toy · Ocean Floater',
      desc: 'Buoyant inflatable beach ball. Bump it with your shark nose or boat bow to watch it launch over rolling swells!',
      stats: 'Elastic Collision Rating: 0.96 · Waterproof'
    },
    {
      slot: 7,
      icon: '🌋',
      name: 'Volcanic Obsidian Pebble',
      qty: 4,
      rarity: 'rare',
      type: 'Trial Token & Mineral',
      desc: 'Smooth polished volcanic stone collected from the Rear Wharf caldera entrance. Radiates comforting thermal heat.',
      stats: '+20% Trap Resilience in Volcano Dungeons'
    },
    {
      slot: 8,
      icon: '🧵',
      name: 'Plush Cotton Fluff Bundles',
      qty: 12,
      rarity: 'cozy',
      type: 'Crafting Material',
      desc: 'Premium cloud-soft synthetic cotton fluff. Used to mend loose seams, reinforce stuffing, and adjust your shark\'s plush stance.',
      stats: 'Restores 25 Stuffing Coherence'
    },
    {
      slot: 9,
      icon: '⛵',
      name: 'Folded Regatta Sail Paper',
      qty: 1,
      rarity: 'rare',
      type: 'Nautical Charm',
      desc: 'Origami sailboat folded by Hermes. Whispers with sea breezes and stabilizes boats as they crest high rolling ocean swells.',
      stats: '+15% Boat Top Speed · Wave Pitch Damper'
    },
    {
      slot: 10,
      icon: '📜',
      name: 'Archipelago Sea Chart',
      qty: 1,
      rarity: 'cozy',
      type: 'Cartography Codex',
      desc: 'Detailed parchment map documenting Hermes Atoll, Solomon Cay, Hiram Isle, and Nimue Sanctuary beyond the outer reefs.',
      stats: 'Marks All 4 Sanctuary Wharfs & Docks'
    },
    {
      slot: 11,
      icon: '☕',
      name: 'Star-Forged Teacup',
      qty: 1,
      rarity: 'legendary',
      type: 'Porcelain Treasure',
      desc: 'Solomon\'s favourite gold-trimmed porcelain cup. Never spills a single drop, even during 2.0x high swell rolling seas.',
      stats: 'Immune to Wave Listing · Infinite Refills'
    }
  ];

  let selectedCSShark = 'hermes';
  let selectedInventorySlot = 0;

  // Global Celestial Day/Night Cycle State (Tied to real-world clock: 1 real hour = 24 island hours)
  window.__BLAHAJ_DAY_CYCLE__ = {
    isRealtime: true, // Tied to real-world wall clock!
    manualProgress: 0.25,
    setRealtime() {
      this.isRealtime = true;
      if (worldApi && worldApi.updateDayNight) {
        worldApi.updateDayNight(scene, true);
      } else if (window.BlahajWorld && window.BlahajWorld.updateDayNight) {
        window.BlahajWorld.updateDayNight(scene, true);
      }
      updateCelestialClockHUD();
    },
    setManualHour(h) {
      this.isRealtime = false;
      this.manualProgress = (((h - 6.0) % 24.0 + 24.0) % 24.0) / 24.0;
      if (worldApi && worldApi.updateDayNight) {
        worldApi.updateDayNight(scene, true);
      } else if (window.BlahajWorld && window.BlahajWorld.updateDayNight) {
        window.BlahajWorld.updateDayNight(scene, true);
      }
      updateCelestialClockHUD();
    },
    setManualProgress(p) {
      this.isRealtime = false;
      this.manualProgress = ((p % 1.0) + 1.0) % 1.0;
      if (worldApi && worldApi.updateDayNight) {
        worldApi.updateDayNight(scene, true);
      } else if (window.BlahajWorld && window.BlahajWorld.updateDayNight) {
        window.BlahajWorld.updateDayNight(scene, true);
      }
      updateCelestialClockHUD();
    }
  };

  // ==========================================================================
  // HUD DECLUTTERING & MINIMAL ZEN MODE
  // ==========================================================================
  let minimalHudActive = true;
  try {
    const saved = localStorage.getItem('blahaj_minimal_hud');
    if (saved !== null) {
      minimalHudActive = saved === 'true';
    }
  } catch (e) {}

  function updateMinimalHUDUI() {
    document.body.classList.toggle('minimal-hud', minimalHudActive);
    const declutterBtn = document.getElementById('btn-hud-declutter');
    if (declutterBtn) {
      declutterBtn.classList.toggle('active', minimalHudActive);
      declutterBtn.textContent = minimalHudActive ? '👁️ Minimal HUD [V]' : '🧭 Full HUD [V]';
      declutterBtn.title = minimalHudActive
        ? 'Minimal Mode active (Top panels and meters hidden). Press [V] or click to show Full HUD.'
        : 'Full HUD active. Press [V] or click to switch to Minimal HUD.';
    }
  }

  function toggleMinimalHUD() {
    minimalHudActive = !minimalHudActive;
    try {
      localStorage.setItem('blahaj_minimal_hud', String(minimalHudActive));
    } catch (e) {}
    updateMinimalHUDUI();
    if (minimalHudActive) {
      CozyAudio.shonk();
      showToast('MINIMAL ZEN HUD 🧭', 'Top panels and meters hidden! Direction ribbon and clock preserved. Press [V] for Full HUD.');
    } else {
      CozyAudio.shonk();
      showToast('FULL HUD RESTORED 🗺️', 'Character frame, quest tracker, and island meters visible.');
    }
  }

  // ==========================================================================
  // ACTIVE HELD ITEM & FIN DELIGHT SYSTEM (COCKTAILS, FOOD, TOOLS & TOYS)
  // ==========================================================================
  const playerHeldItem = {
    id: null,
    name: '',
    icon: '🐾',
    isTimed: false,
    timerRemaining: 0,
    duration: 0,
    priorItemId: null
  };

  const HELD_ITEM_DEFS = {
    pina_colada: { name: 'Chilled Piña Colada', icon: '🍹', type: 'drink', isFoodOrDrink: true },
    binoculars: { name: 'Brass Marine Binoculars', icon: '🔭', type: 'tool', isFoodOrDrink: false },
    seam_detector: { name: 'Aetheric Seam Diviner', icon: '🧭', type: 'tool', isFoodOrDrink: false },
    margarita: { name: 'Frosted Margarita', icon: '🍸', type: 'drink', isFoodOrDrink: true },
    tropical_cocktail: { name: 'Sunset Cocktail', icon: '🍹', type: 'drink', isFoodOrDrink: true },
    celestial_boba: { name: 'Celestial Boba', icon: '🧋', type: 'drink', isFoodOrDrink: true },
    tea: { name: 'Sacred Steaming Tea', icon: '🍵', type: 'drink', isFoodOrDrink: true },
    breb: { name: 'Warm Breb Loaf', icon: '🥖', type: 'food', isFoodOrDrink: true },
    helen_cake: { name: "Helen's Birthday Bombe", icon: '🎂', type: 'food', isFoodOrDrink: true },
    cake_slice: { name: 'Velvet Cake Slice', icon: '🍰', type: 'food', isFoodOrDrink: true },
    spherical_beetroot_tart: { name: 'Beetroot Tart', icon: '🥧', type: 'food', isFoodOrDrink: true },
    spherical_mochi: { name: 'Rainbow Mochi Trio', icon: '🍡', type: 'food', isFoodOrDrink: true },
    steamed_algae_bun: { name: 'Steamed Algae Bun', icon: '🥟', type: 'food', isFoodOrDrink: true },
    volcanic_sorbet: { name: 'Volcanic Sorbet Sphere', icon: '🍧', type: 'food', isFoodOrDrink: true },
    hex_key: { name: 'Hiram’s Hex Key', icon: '🔧', type: 'tool', isFoodOrDrink: false },
    retired_tag: { name: 'Retired Spawning-Pit Tag', icon: '🏷️', type: 'relic', isFoodOrDrink: false },
    ingvar_tape: { name: "Ingvar's Brass Measuring Tape", icon: '📏', type: 'tool', isFoodOrDrink: false },
    sacred_scissors: { name: 'Golden Scissors of the Order', icon: '✂️', type: 'relic', isFoodOrDrink: false },
    flatpack_crate: { name: 'SKÄRHAJ Flat-Pack Kit', icon: '📦', type: 'tool', isFoodOrDrink: false },
    kottbullar_feast: { name: 'Midnight Köttbullar Plate', icon: '🧆', type: 'food', isFoodOrDrink: true },
    party_favor: { name: 'Birthday Party Cracker', icon: '🎉', type: 'toy', isFoodOrDrink: false },
    lantern: { name: 'Ghost Lantern', icon: '🏮', type: 'tool', isFoodOrDrink: false },
    figurine: { name: 'Carrot Figurine', icon: '🥕', type: 'toy', isFoodOrDrink: false }
  };

  function getHeldItemMeta(itemId) {
    if (!itemId) return { name: 'Empty Fin', icon: '🐾', type: 'none', isFoodOrDrink: false };
    if (HELD_ITEM_DEFS[itemId]) return HELD_ITEM_DEFS[itemId];
    if (player.inventory) {
      const invItem = player.inventory.getItem(itemId);
      if (invItem) {
        return {
          name: invItem.name,
          icon: invItem.icon,
          type: invItem.type || 'item',
          isFoodOrDrink: invItem.type === 'drink' || invItem.type === 'food'
        };
      }
    }
    return { name: itemId, icon: '🦈', type: 'item', isFoodOrDrink: false };
  }

  function updateHeldItemHUD() {
    const slotH = document.getElementById('slot-h');
    const iconEl = document.getElementById('slot-h-icon');
    const nameEl = document.getElementById('slot-h-name');
    const subEl = document.getElementById('slot-h-sub');
    const banner = document.getElementById('held-savor-banner');
    const savorIcon = document.getElementById('savor-icon');
    const savorTitle = document.getElementById('savor-title');
    const savorTimer = document.getElementById('savor-timer');
    const savorLabel = document.getElementById('savor-label');
    const savorFill = document.getElementById('savor-fill');

    const meta = getHeldItemMeta(playerHeldItem.id);

    if (slotH) {
      slotH.classList.toggle('holding', !!playerHeldItem.id);
      slotH.classList.toggle('savoring', !!(playerHeldItem.id && playerHeldItem.isTimed));
    }
    if (iconEl) iconEl.textContent = playerHeldItem.id ? meta.icon : '🐾';
    if (nameEl) nameEl.textContent = playerHeldItem.id ? meta.name : 'Fin Item';
    if (subEl) {
      if (!playerHeldItem.id) {
        subEl.textContent = 'Empty Fin';
      } else if (playerHeldItem.isTimed) {
        subEl.textContent = `Savoring (${Math.ceil(playerHeldItem.timerRemaining)}s)`;
      } else {
        subEl.textContent = 'Equipped [H]';
      }
    }

    if (banner) {
      if (playerHeldItem.id && playerHeldItem.isTimed && playerHeldItem.timerRemaining > 0) {
        banner.classList.remove('hidden');
        banner.style.display = 'flex';
        if (savorIcon) savorIcon.textContent = meta.icon;
        if (savorTitle) savorTitle.textContent = meta.name;
        if (savorTimer) savorTimer.textContent = `${Math.ceil(playerHeldItem.timerRemaining)}s`;
        if (savorLabel) savorLabel.textContent = meta.type === 'drink' ? 'SAVORING DRINK' : 'SAVORING SNACK';
        if (savorFill) {
          const pct = Math.max(0, Math.min(100, (playerHeldItem.timerRemaining / Math.max(0.1, playerHeldItem.duration)) * 100));
          savorFill.style.width = `${pct}%`;
        }
      } else {
        banner.classList.add('hidden');
        banner.style.display = 'none';
        if (savorTimer) savorTimer.textContent = '0s';
      }
    }

    if (window.BlahajMMO && typeof window.BlahajMMO.renderActionBarUI === 'function') {
      window.BlahajMMO.renderActionBarUI();
    }
  }

  function equipHeldItem(itemId, isTimed = false, duration = 0, priorItemId = null) {
    if (!itemId) {
      stowHeldItem();
      return;
    }

    if (isTimed && priorItemId === null) {
      if (playerHeldItem.id && !playerHeldItem.isTimed) {
        priorItemId = playerHeldItem.id;
      }
    }

    playerHeldItem.id = itemId;
    playerHeldItem.isTimed = !!isTimed;
    playerHeldItem.duration = duration;
    playerHeldItem.timerRemaining = duration;
    if (priorItemId !== null && priorItemId !== undefined) {
      playerHeldItem.priorItemId = priorItemId;
    }

    const meta = getHeldItemMeta(itemId);
    playerHeldItem.name = meta.name;
    playerHeldItem.icon = meta.icon;

    if (player.mesh && window.BlahajSharks3D && window.BlahajSharks3D.attachHeldItem) {
      window.BlahajSharks3D.attachHeldItem(player.mesh, itemId);
    }

    updateHeldItemHUD();
    if (typeof window._blahajRenderFinBelt === 'function') window._blahajRenderFinBelt();

    const detPanel = document.getElementById('seam-detector-panel');
    if (detPanel) {
      if (itemId === 'seam_detector') {
        detPanel.classList.remove('hidden');
      } else {
        detPanel.classList.add('hidden');
      }
    }

    if (window.BlahajNetwork) {
      window.BlahajNetwork.send({
        type: 'held_item_sync',
        heldItemId: itemId,
        isTimed,
        duration
      });
    }
    if (window.BlahajSaveSystem) window.BlahajSaveSystem.queueAutoSave();

    if (isTimed) {
      CozyAudio.bistroChime();
    } else {
      if (CozyAudio.shonkPop) { CozyAudio.shonkPop(); } else if (CozyAudio.shonk) { CozyAudio.shonk(); }
      showToast('EQUIPPED IN FIN 🦈', `Holding ${meta.name} in your right fin. Press [H] to stow!`);
    }
  }

  function stowHeldItem(silent = false) {
    const prevId = playerHeldItem.id;
    playerHeldItem.id = null;
    playerHeldItem.isTimed = false;
    playerHeldItem.duration = 0;
    playerHeldItem.timerRemaining = 0;
    playerHeldItem.priorItemId = null;

    if (player.mesh && window.BlahajSharks3D && window.BlahajSharks3D.attachHeldItem) {
      window.BlahajSharks3D.attachHeldItem(player.mesh, null);
    }

    updateHeldItemHUD();
    if (typeof window._blahajRenderFinBelt === 'function') window._blahajRenderFinBelt();

    const detPanel = document.getElementById('seam-detector-panel');
    if (detPanel) {
      detPanel.classList.add('hidden');
    }

    if (window.BlahajNetwork) {
      window.BlahajNetwork.send({
        type: 'held_item_sync',
        heldItemId: null
      });
    }

    if (!silent && prevId) {
      CozyAudio.shonk();
      showToast('STOWED IN SATCHEL 📥', 'Fin is now empty. Press [H] to hold an item!');
    }
  }

  function savorHeldItem(itemId, duration = 45.0) {
    const prior = (playerHeldItem.id && !playerHeldItem.isTimed) ? playerHeldItem.id : null;
    equipHeldItem(itemId, true, duration, prior);
    const meta = getHeldItemMeta(itemId);
    showToast('SAVORING DELIGHT 🍸✨', `Holding ${meta.name}! Taking cozy sips & snacks (${Math.round(duration)}s).`);
    addChatLog(`🍸 Savoring <strong>${meta.name}</strong> in your fin for ${Math.round(duration)}s! Watch your shark take cozy sips.`, 'cozy');
  }

  function toggleHeldItem() {
    if (playerHeldItem.id) {
      stowHeldItem();
    } else {
      let candidate = null;
      if (player.inventory) {
        const slots = typeof player.inventory.getSlots === 'function' ? player.inventory.getSlots() : [];
        if (slots.length > 0) {
          for (const s of slots) {
            if (s && s.canHold) {
              candidate = s.id;
              break;
            }
          }
        } else if (typeof player.inventory.getSlot === 'function') {
          const num = player.inventory.numSlots || 16;
          for (let i = 0; i < num; i++) {
            const s = player.inventory.getSlot(i);
            if (s && s.canHold) {
              candidate = s.id;
              break;
            }
          }
        }
      }
      if (!candidate) candidate = 'margarita';
      equipHeldItem(candidate, false);
    }
  }

  function updateHeldItemSavoring(dt) {
    if (!playerHeldItem || !playerHeldItem.id || !playerHeldItem.isTimed) return;
    playerHeldItem.timerRemaining -= dt;
    if (playerHeldItem.timerRemaining <= 0) {
      playerHeldItem.timerRemaining = 0;
      playerHeldItem.isTimed = false;
      const finishedId = playerHeldItem.id;
      const prior = playerHeldItem.priorItemId;
      playerHeldItem.priorItemId = null;
      if (prior) {
        equipHeldItem(prior, false);
        const priorMeta = getHeldItemMeta(prior);
        showToast('FINISHED SAVORING ✨', `Finished snack! Re-equipped ${priorMeta.name} in your fin.`);
        addChatLog(`✨ Finished savoring <strong>${getHeldItemMeta(finishedId).name}</strong>. Returned <strong>${priorMeta.name}</strong> to your fin!`, 'cozy');
      } else {
        stowHeldItem(true);
        showToast('FINISHED SAVORING ✨', 'Finished enjoying your treat! Delicious and cozy.');
        addChatLog(`✨ Finished savoring <strong>${getHeldItemMeta(finishedId).name}</strong>! Your fin is now free.`, 'cozy');
      }
      updateHeldItemHUD();
    if (typeof window._blahajRenderFinBelt === 'function') window._blahajRenderFinBelt();
    } else {
      updateHeldItemHUD();
    if (typeof window._blahajRenderFinBelt === 'function') window._blahajRenderFinBelt();
    }
  }

  // Player state
  const player = {
    sharkId: 'hermes',
    mesh: null,
    pos: new THREE.Vector3(58.0, 2.8, -10.0),
    velY: 0,
    rotY: -Math.PI / 2,
    isGrounded: true,
    canDoubleJump: true,
    doubleJumped: false,
    coyoteTimer: 0,
    inBoat: false,
    inCart: false,
    cartId: null,
    isSeatedInBooth: false,
    seatedBoothIndex: -1,
    isLounging: false,
    loungeChairId: null,
    loungeChair: null,
    inWater: false,
    isSwimming: false,
    waterSurfaceY: 0.22,
    bubbleTimer: 0,
    hasSeenPelagicRiftNotice: false,
    stuffing: 100, // Stuffing Coherence = Hit Points (0 → Unstuffed → Rebirth in the IKEA Spawning Pits)
    teaComfort: 88,
    volcanoHonour: 72,
    seamMendedCount: 0,
    teaSharedCount: 0,
    carrotsKnockedCount: 4, // Starter Carrot Sparks + earn more on the Volcano Balcony!
    birbsFedCount: 6, // Starter Birb Crumbs + earn more by tossing Breb [B]!
    trialPoints: 2, // Starter Trial Points + earn more in the Dungeon & Balcony!
    spentBirbs: 0,
    spentCarrots: 0,
    unlockedUpgrades: new Set(),
    trapCooldown: 0,
    dungeonPortalCooldown: 0,
    teaBuffTimer: 0,
    launderedBuffTimer: 0,
    launderedShieldHits: 0,
    lastNoseBeepTime: 0,
    lastSharedTeaTime: 0,
    inventory: (window.BlahajInventory ? window.BlahajInventory.createPlayerInventory() : null)
  };

  // Pass 83: Unified Health. Legacy code reads/writes `player.warmth`; alias it to `player.stuffing`
  // so every heal, trap, and enemy hit drives the same single Stuffing Coherence (HP) pool.
  Object.defineProperty(player, 'warmth', {
    get() { return this.stuffing; },
    set(v) { this.stuffing = Math.max(0, Math.min(100, Number(v) || 0)); },
    enumerable: true,
    configurable: true
  });

  // Pass 83: Rebirth State
  let isRebirthing = false;

  // ==========================================================================
  // PASS 83: MANGE AS AN INVERSE MANA POOL ("FRAY")
  // Powerful arts fray your plush coat (+Mange). You cannot cast if the cost would push Mange past 100%.
  // Grooming, Sacred Tea, and resting out of combat restore "Fray Capacity" (1 - Mange).
  // ==========================================================================
  const MANGE_SETTLE_FLOOR = 0.25;     // Passive resting never smooths the coat below 25% (keeps veteran character)
  const MANGE_SETTLE_PER_SEC = 0.0025; // 0.25% Mange settles per second while out of combat
  const OUT_OF_COMBAT_DELAY = 6.0;     // Seconds without taking/dealing hits before resting regen begins
  let lastCombatTime = -999;
  let mangeSettleAccum = 0;

  function markInCombat() {
    lastCombatTime = (clock && typeof clock.getElapsedTime === 'function') ? clock.getElapsedTime() : 0;
  }

  function getFrayCapacity() {
    return Math.max(0, 1.0 - getSharkMange(player.sharkId));
  }

  // Returns true if the shark can afford `cost` (fraction of Mange, e.g. 0.05 = 5%), and spends it.
  function spendMangeForAbility(cost, abilityName = 'Ability') {
    if (!cost || cost <= 0) return true;
    const cur = getSharkMange(player.sharkId);
    if (cur + cost > 1.0001) {
      CozyAudio.shonk();
      showToast('🧵 TOO FRAYED TO CAST!', `${abilityName} needs ${Math.round(cost * 100)}% Fray Capacity (you have ${Math.round((1 - cur) * 100)}%). Groom [G] or sip Sacred Tea to restore!`);
      return false;
    }
    setSharkMange(player.sharkId, cur + cost);
    markInCombat();
    updateVitalsHUD();
    return true;
  }

  function updateMangeSettling(dt, elapsed) {
    if (elapsed - lastCombatTime < OUT_OF_COMBAT_DELAY) return;
    const cur = getSharkMange(player.sharkId);
    if (cur <= MANGE_SETTLE_FLOOR) { mangeSettleAccum = 0; return; }
    mangeSettleAccum += MANGE_SETTLE_PER_SEC * dt;
    // Apply in 1% chunks to avoid writing localStorage / syncing the network every frame
    if (mangeSettleAccum >= 0.01) {
      setSharkMange(player.sharkId, Math.max(MANGE_SETTLE_FLOOR, cur - mangeSettleAccum));
      mangeSettleAccum = 0;
      updateVitalsHUD();
    }
  }

  // Out-of-combat Stuffing regeneration (slow), boosted by Steaming Spirit tea buff
  function updateStuffingRegen(dt, elapsed) {
    if (isRebirthing || player.stuffing <= 0 || player.stuffing >= 100) return;
    const teaBoost = player.teaBuffTimer > 0 ? 4.0 : 0;
    const resting = (elapsed - lastCombatTime) >= OUT_OF_COMBAT_DELAY ? 1.2 : 0;
    const rate = teaBoost + resting;
    if (rate > 0) {
      player.stuffing = Math.min(100, player.stuffing + rate * dt);
    }
  }

  // ==========================================================================
  // PASS 83: COMPACT VITALS HUD (Always visible, including Minimal HUD mode)
  // ==========================================================================
  let lastVitalsKey = '';
  function updateVitalsHUD() {
    const hp = Math.max(0, Math.min(100, Math.round(player.stuffing ?? 100)));
    const mange = getSharkMange(player.sharkId);
    const mangePct = Math.round(mange * 100);
    const key = `${hp}|${mangePct}`;
    if (key === lastVitalsKey) return;
    lastVitalsKey = key;

    const hpFill = document.getElementById('vital-hp-fill');
    const hpLbl = document.getElementById('vital-hp-label');
    const hpBar = document.getElementById('vital-hp-bar');
    const mFill = document.getElementById('vital-mange-fill');
    const mLbl = document.getElementById('vital-mange-label');
    if (hpFill) hpFill.style.width = `${hp}%`;
    if (hpLbl) hpLbl.textContent = `🧸 Stuffing ${hp} / 100`;
    if (hpBar) {
      hpBar.classList.toggle('vital-low', hp <= 30 && hp > 0);
      hpBar.classList.toggle('vital-critical', hp <= 15 && hp > 0);
    }
    if (mFill) mFill.style.width = `${mangePct}%`;
    if (mLbl) mLbl.textContent = `🧵 Mange ${mangePct}% · Fray ${100 - mangePct}%`;
  }

  // ==========================================================================
  // PASS 83/84: PERSISTENT WORLD POSITION & SAVE POINT
  // Remembers where you are standing in the shared world so you always return to the same spot!
  // ==========================================================================
  const SAVE_POINT_KEY = 'blahaj_last_save_point_v1';
  let lastSavePoint = null;
  let hasStoredSavePoint = false;
  let hasMovedInSession = false;
  let savePointTimer = 0;
  try {
    const rawSp = localStorage.getItem(SAVE_POINT_KEY);
    if (rawSp) {
      const parsedSp = JSON.parse(rawSp);
      if (parsedSp && typeof parsedSp.x === 'number' && typeof parsedSp.z === 'number') {
        lastSavePoint = parsedSp;
        hasStoredSavePoint = true;
      }
    }
  } catch (e) { lastSavePoint = null; }
  if (!lastSavePoint) {
    lastSavePoint = {
      x: 58.0,
      y: 3.9,
      z: -10.0,
      rotY: -Math.PI / 2,
      savedAt: Date.now()
    };
  }

  function isSafeToCaptureSavePoint() {
    const inUfo = !!(window.BlahajUFO && window.BlahajUFO.isLocalAboard && window.BlahajUFO.isLocalAboard());
    return currentZone === 'island' && !inUfo && !isRebirthing && !isTransitioningZone &&
      player.isGrounded && !player.isSwimming && !player.inWater && !player.inBoat && !player.inCart &&
      (player.stuffing ?? 100) >= 25 && Number.isFinite(player.pos.x) && Number.isFinite(player.pos.z);
  }

  function saveUfoIslandSpawnPoint() {
    const isle = (window.BlahajUFO && typeof window.BlahajUFO.getIslandCoords === 'function')
      ? window.BlahajUFO.getIslandCoords()
      : { x: 128.0, z: -88.0, deckY: 5.4 };
    lastSavePoint = {
      x: Number((isle.x - 10.5).toFixed(2)),
      y: Number((isle.deckY + 0.5).toFixed(2)),
      z: Number((isle.z - 7.5).toFixed(2)),
      rotY: 0.9,
      ufoIsleSpawn: true,
      hyperspaceCheckpoint: false,
      savedAt: Date.now()
    };
    hasStoredSavePoint = true;
    try { localStorage.setItem(SAVE_POINT_KEY, JSON.stringify(lastSavePoint)); } catch (e) {}
  }

  function saveHyperspaceCheckpoint() {
    const isle = (window.BlahajUFO && typeof window.BlahajUFO.getIslandCoords === 'function')
      ? window.BlahajUFO.getIslandCoords()
      : { x: 128.0, z: -88.0, deckY: 5.4 };
    lastSavePoint = {
      x: Number((isle.x - 10.5).toFixed(2)),
      y: Number((isle.deckY + 0.5).toFixed(2)),
      z: Number((isle.z - 7.5).toFixed(2)),
      rotY: 0.9,
      ufoIsleSpawn: true,
      hyperspaceCheckpoint: true,
      savedAt: Date.now()
    };
    hasStoredSavePoint = true;
    try { localStorage.setItem(SAVE_POINT_KEY, JSON.stringify(lastSavePoint)); } catch (e) {}
  }

  function captureSavePoint(force = false) {
    if (!force && (!hasMovedInSession || !isSafeToCaptureSavePoint())) return false;
    if (currentZone !== 'island') return false;
    lastSavePoint = {
      x: Number(player.pos.x.toFixed(2)),
      y: Number(player.pos.y.toFixed(2)),
      z: Number(player.pos.z.toFixed(2)),
      rotY: Number((player.rotY || 0).toFixed(3)),
      savedAt: Date.now()
    };
    hasStoredSavePoint = true;
    try { localStorage.setItem(SAVE_POINT_KEY, JSON.stringify(lastSavePoint)); } catch (e) {}
    return true;
  }

  function updateSavePointCapture(dt) {
    if (!hasMovedInSession && Math.hypot(player.pos.x - lastSavePoint.x, player.pos.z - lastSavePoint.z) > 0.6) {
      hasMovedInSession = true;
    }
    savePointTimer += dt;
    if (savePointTimer >= 10.0) {
      savePointTimer = 0;
      captureSavePoint(false);
    }
  }

  window.addEventListener('beforeunload', () => {
    if (currentZone === 'hyperspace') {
      saveHyperspaceCheckpoint();
    } else if (currentZone === 'space' || currentZone === 'cheese_moon') {
      saveUfoIslandSpawnPoint();
    } else {
      captureSavePoint(false);
    }
  });

  // Pass 83 Window exports for MMO Controls & HUD
  window.spendMangeForAbility = spendMangeForAbility;
  window.getFrayCapacity = getFrayCapacity;
  window.markInCombat = markInCombat;
  window.updateVitalsHUD = updateVitalsHUD;
  window.triggerUnstuffedRecovery = triggerUnstuffedRecovery;
  window.captureSavePoint = captureSavePoint;
  window.getSharkMange = getSharkMange;
  window.setSharkMange = setSharkMange;

  // Hiram the Magical Builder State (Exclusive to Hiram [3]!)
  const builderState = {
    active: false,
    catalogOpen: false,
    freeBuild: false,
    snapGrid: true,
    storyFloor: 0,
    isSnappedToSocket: false,
    category: 'skarhaj_kits',
    selectedId: 'skarhaj_plinth',
    rotOffset: 0,
    previewMesh: null,
    targetPos: new THREE.Vector3(),
    targetRotY: 0
  };

  // Sanctuary Island Claims (Synced across Co-op)
  const islandClaims = JSON.parse(localStorage.getItem('blahaj_island_claims_v1') || '{}');

  // Instance & Dimension State
  let currentZone = 'island'; // 'island' | 'volcano' | 'laundromat'
  let volcanoCheckpoint = { x: 0, y: 0, z: -2, rotY: Math.PI };
  let isTransitioningZone = false;
  let lastNearestInteractableKey = null;

  function getActiveScene() {
    if (currentZone === 'volcano' && window.BlahajVolcano) {
      return window.BlahajVolcano.getScene() || scene;
    }
    if (currentZone === 'laundromat' && window.BlahajLaundromat) {
      return window.BlahajLaundromat.getScene() || scene;
    }
    if (currentZone === 'spherical_foods' && window.BlahajSphericalFoods) {
      return window.BlahajSphericalFoods.getScene() || scene;
    }
    if (currentZone === 'volleyball' && window.BlahajVolleyball) {
      return window.BlahajVolleyball.getScene() || scene;
    }
    if (currentZone === 'spawning_pits' && window.BlahajSpawningPits) {
      return window.BlahajSpawningPits.getScene() || scene;
    }
    if (currentZone === 'sea_cave' && window.BlahajHomestead) {
      return window.BlahajHomestead.getScene() || scene;
    }
    if (currentZone === 'space' && window.BlahajSpace) {
      return window.BlahajSpace.getScene() || scene;
    }
    if (currentZone === 'cheese_moon' && window.BlahajCheeseMoon) {
      return window.BlahajCheeseMoon.getScene() || scene;
    }
    if (currentZone === 'hyperspace' && window.BlahajHyperspace) {
      return window.BlahajHyperspace.getScene() || scene;
    }
    return scene;
  }

  function saveBuiltStructuresToStorage() {
    if (!worldApi) return;
    const serialized = worldApi.getBuiltStructures().map((s) => ({
      id: s.id,
      type: s.type,
      x: Number(s.x.toFixed(2)),
      y: Number(s.y.toFixed(2)),
      z: Number(s.z.toFixed(2)),
      rotY: Number((s.rotY || 0).toFixed(3)),
      builder: s.builder || 'Hiram'
    }));
    localStorage.setItem('blahaj_built_structures_v1', JSON.stringify(serialized));
  }

  function loadSavedStructures() {
    try {
      const raw = JSON.parse(localStorage.getItem('blahaj_built_structures_v1') || '[]');
      if (Array.isArray(raw)) {
        raw.forEach((item) => {
          if (item && item.id && item.type) {
            worldApi.placeBuiltStructure(item);
          }
        });
      }
    } catch (e) {
      // Ignore corrupt storage
    }
  }

  // Tab-Target MMORPG Camera & Mouse Split State
  const camState = {
    yaw: Math.PI / 2,
    pitch: 0.22,
    distance: 7.4,
    shoulderRight: 0.85,
    heightOffset: 2.35,
    isLeftDown: false,
    isRightDown: false,
    isLeftDragging: false,
    isRightDragging: false,
    isChordMoving: false,
    isAutoRunning: false,
    hasFreeLookOffset: false,
    freeMouse: false,
    isDragPointerLock: false,
    isAltToggleUnlock: false,
    isModalPointerUnlock: false,
    isPointerLocked: false
  };

  // Input keys (tracked by both key and physical keyCode to prevent stuck keys)
  const keys = {};

  function mapCodeToKey(code) {
    switch (code) {
      case 'KeyW': return 'w';
      case 'KeyS': return 's';
      case 'KeyA': return 'a';
      case 'KeyD': return 'd';
      case 'ArrowUp': return 'arrowup';
      case 'ArrowDown': return 'arrowdown';
      case 'ArrowLeft': return 'arrowleft';
      case 'ArrowRight': return 'arrowright';
      case 'ShiftLeft':
      case 'ShiftRight': return 'shift';
      case 'Space': return ' ';
      default: return null;
    }
  }

  function clearAllMovementKeys() {
    Object.keys(keys).forEach((k) => {
      keys[k] = false;
    });
    camState.isLeftDown = false;
    camState.isRightDown = false;
    camState.isLeftDragging = false;
    camState.isRightDragging = false;
    camState.isChordMoving = false;
  }

  // World Character Registry
  const worldActors = [];
  const floatingBursts = [];
  const completedQuests = new Set();
  let currentModule = 'sandbox';
  let nearestInteractable = null;

  // Co-op Partner State
  const coopPartner = {
    active: false,
    sharkId: 'solomon',
    mesh: null,
    targetPos: new THREE.Vector3(3, 4.2, 26),
    targetRotY: Math.PI,
    labelEl: null,
    isLounging: false,
    loungeChairId: null
  };

  // Endless Pier Cross-Ocean Bottle Notes
  const pierNotes = JSON.parse(localStorage.getItem('blahaj_pier_notes') || 'null') || [
    {
      author: 'Hermes (The Weary Guide)',
      text: '“Distance along the Endless Pier is emotional rather than geometric. New Zealand and Los Angeles share the same ocean.”'
    },
    {
      author: 'Russell & Helen’s Sharks',
      text: '“Different Shores · Same Ocean · Kinder, Braver, Softer, Together.” 🦈💕🦈'
    }
  ];

  function savePierNotes() {
    localStorage.setItem('blahaj_pier_notes', JSON.stringify(pierNotes));
  }

  // ==========================================================================
  // INITIALIZATION & PRE-WARM LOADING SCREEN
  // ==========================================================================
  const LOADING_TIPS = [
    '“Press [B] to toss warm Breb to the Birbs in the Heartland Meadow!”',
    '“Press [G] or click Groom to gently brush fellow sharks and de-mange their coats.”',
    '“Visit the Sacred Tea House in Heartland Plaza to restore Tea Comfort with Solomon.”',
    '“The between-portal connects shores across the ocean—even when far apart, the road is short.”',
    '“Survive the traps of the Volcano Trial Dungeon to earn Trial Points for Turbo Hydro-Fins!”',
    '“Step into Master Washer #7 at the Laundromat for a fresh tumble-fluffing spin cycle!”',
    '“Play beach volleyball on Crescent Beach and boop the ball over the net with your snout!”',
    '“Hiram’s Sacred Allen Key lets you build cozy seaside cabins and linked pocket portals.”',
    '“Sip a chilled Piña Colada while reclining in a luxury deck chair on Crescent Beach!”'
  ];

  let loadingTipInterval = null;
  let isGameLoaded = false;

  function syncLoadingAudioState() {
    const isMuted = !!gameSettings.masterMute;
    const btnAudio = document.getElementById('btn-loading-audio-toggle');
    const iconAudio = document.getElementById('loading-audio-icon');
    const textAudio = document.getElementById('loading-audio-text');
    const subNote = document.getElementById('embark-audio-sub');

    if (btnAudio) {
      btnAudio.classList.toggle('muted', isMuted);
    }
    if (iconAudio) {
      iconAudio.textContent = isMuted ? '🔇' : '🔊';
    }
    if (textAudio) {
      textAudio.textContent = isMuted ? 'Audio: OFF' : 'Audio: ON';
    }
    if (subNote) {
      subNote.textContent = isMuted
        ? 'Click to Enter · Audio Muted 🔇'
        : 'Click to Enter · Audio Enabled 🦈✨';
    }
  }

  function initLoadingScreen() {
    const tipEl = document.getElementById('game-loading-tip-text');
    if (tipEl) {
      let tipIdx = Math.floor(Math.random() * LOADING_TIPS.length);
      tipEl.textContent = LOADING_TIPS[tipIdx];
      loadingTipInterval = setInterval(() => {
        tipIdx = (tipIdx + 1) % LOADING_TIPS.length;
        tipEl.style.opacity = '0';
        setTimeout(() => {
          tipEl.textContent = LOADING_TIPS[tipIdx];
          tipEl.style.opacity = '1';
        }, 250);
      }, 3400);
    }

    // Audio toggle switch on loading screen
    const btnAudio = document.getElementById('btn-loading-audio-toggle');
    if (btnAudio) {
      btnAudio.addEventListener('click', () => {
        const nextMute = !gameSettings.masterMute;
        applySetting('masterMute', nextMute);
        syncLoadingAudioState();
        syncSettingsUI();
      });
    }

    // Settings panel button on loading screen
    const btnSettings = document.getElementById('btn-loading-settings');
    if (btnSettings) {
      btnSettings.addEventListener('click', () => {
        openSettingsModal('audio');
      });
    }

    syncLoadingAudioState();
  }

  function setLoadingProgress(pct, statusText) {
    const bar = document.getElementById('game-loading-progress-bar');
    const pctEl = document.getElementById('game-loading-pct');
    const statusEl = document.getElementById('game-loading-status-text');
    if (bar) bar.style.width = `${Math.min(100, Math.max(0, pct))}%`;
    if (pctEl) pctEl.textContent = `${Math.round(pct)}%`;
    if (statusEl && statusText) statusEl.textContent = statusText;
  }

  function yieldFrame() {
    return new Promise((resolve) => {
      let done = false;
      const finish = () => {
        if (!done) {
          done = true;
          resolve();
        }
      };
      // Fallback timeout ensures boot never stalls if requestAnimationFrame is throttled
      setTimeout(finish, 120);
      requestAnimationFrame(() => setTimeout(finish, 24));
    });
  }

  function finishLoadingScreen() {
    isGameLoaded = true;
    const btn = document.getElementById('btn-enter-game');
    const bar = document.getElementById('game-loading-progress-bar');
    const pctEl = document.getElementById('game-loading-pct');
    const statusEl = document.getElementById('game-loading-status-text');
    const progressSection = document.getElementById('game-loading-progress-section');
    const gatewayPanel = document.getElementById('launch-gateway-panel');

    if (bar) bar.style.width = '100%';
    if (pctEl) pctEl.textContent = '100%';
    if (statusEl) statusEl.textContent = 'Archipelago ready! Choose how to embark 🦈✨';

    syncLoadingAudioState();

    if (progressSection) progressSection.classList.add('loading-done');
    if (gatewayPanel) gatewayPanel.classList.remove('hidden');

    if (window.BlahajSaveSystem && typeof window.BlahajSaveSystem.updateLaunchGatewayUI === 'function') {
      window.BlahajSaveSystem.updateLaunchGatewayUI();
    }

    if (btn) {
      btn.classList.remove('hidden');
      btn.focus();
      btn.onclick = () => {
        embarkIntoGame();
      };
      if (!window._blahajLobbyKeyBound) {
        window._blahajLobbyKeyBound = true;
        window.addEventListener('keydown', (e) => {
          const overlay = document.getElementById('game-loading-screen');
          if (!overlay || overlay.classList.contains('fade-out') || overlay.style.display === 'none') return;
          const setModal = document.getElementById('settings-modal');
          const googleModal = document.getElementById('modal-google-connect');
          const detagModal = document.getElementById('modal-rite-of-detagging');
          if (setModal && !setModal.classList.contains('hidden')) return;
          if (googleModal && !googleModal.classList.contains('hidden')) return;
          if (detagModal && !detagModal.classList.contains('hidden')) return;
          if (e.key === 'Enter') {
            e.preventDefault();
            embarkIntoGame();
          }
        });
      }
    } else {
      setTimeout(embarkIntoGame, 400);
    }
  }

  function embarkIntoGame() {
    const saveSys = window.BlahajSaveSystem;
    let targetSharkId = (saveSys && typeof saveSys.getSelectedLobbySharkId === 'function')
      ? saveSys.getSelectedLobbySharkId()
      : (player.sharkId || 'hermes');

    // 1. Check if the selected character is currently locked by a partner in-world
    if (saveSys && typeof saveSys.getActiveLockForShark === 'function') {
      const lock = saveSys.getActiveLockForShark(targetSharkId);
      if (lock) {
        CozyAudio.shonk();
        const sName = (LORE.sharks[targetSharkId] && LORE.sharks[targetSharkId].name) || targetSharkId;
        showToast(
          `🔒 ${sName.toUpperCase()} IS CURRENTLY IN-WORLD`,
          `${sName} is currently being played by ${lock.playerName}! Please select another character from the roster.`
        );
        saveSys.updateLaunchGatewayUI();
        return;
      }
    }

    // 2. If a non-Founder or Custom Shark player hasn't created their Blåhaj yet, open the Character Creator first!
    if (targetSharkId === 'custom' && saveSys && typeof saveSys.getCustomSharkConfig === 'function') {
      const cs = saveSys.getCustomSharkConfig();
      const detagModal = document.getElementById('modal-rite-of-detagging');
      const detagOpen = detagModal && !detagModal.classList.contains('hidden');
      if (cs && !cs.detagged && !detagOpen) {
        saveSys.openRiteOfDetaggingModal();
        showToast('✂️ CREATE YOUR BLÅHAJ CHARACTER FIRST!', 'Choose your plush color, scarf, and True Name, then click Snip & Enter Island!');
        return;
      }
    }

    if (loadingTipInterval) {
      clearInterval(loadingTipInterval);
      loadingTipInterval = null;
    }
    if (!gameSettings.masterMute) {
      CozyAudio.ensure();
      setTimeout(() => {
        if (CozyAudio.bistroChime) CozyAudio.bistroChime();
      }, 90);
    }

    if (saveSys && typeof saveSys.setInLobby === 'function') {
      saveSys.setInLobby(false);
    }

    // Immediately engage 3D mouse camera capture inside the user's Embark click gesture so mouse movement turns the camera on frame 1!
    if (typeof window._blahajEnterGameCapture === 'function') {
      window._blahajEnterGameCapture();
    }

    // 3. Spawn the chosen character ONLY if not already spawned in the lobby (prevents destroying & recompiling the pre-warmed shark mesh on Embark!)
    const alreadySpawned = (player.sharkId === targetSharkId && !!player.mesh);
    if (!alreadySpawned) {
      spawnPlayerShark(targetSharkId, true);
      if (saveSys && typeof saveSys.applyCharacterFromRoster === 'function') {
        saveSys.applyCharacterFromRoster(targetSharkId);
      }
    }
    // Snap camera cleanly behind the shark after the 360° lobby orbit sweep!
    camState.yaw = Math.atan2(-Math.sin(player.rotY), -Math.cos(player.rotY));
    camState.pitch = 0.28;
    updateCamera(0, 0.016);

    const overlay = document.getElementById('game-loading-screen');
    if (overlay) {
      overlay.classList.add('fade-out');
      overlay.style.display = 'none';
    }

    // 4. Broadcast character claim & roster state to partner
    const myPlayerName = (saveSys && typeof saveSys.getMyAccountDisplayName === 'function')
      ? saveSys.getMyAccountDisplayName()
      : (LORE.sharks[targetSharkId]?.name || 'Founder');
    if (window.BlahajNetwork) {
      window.BlahajNetwork.send({
        type: 'character_claim',
        sharkId: targetSharkId,
        playerName: myPlayerName
      });
    }
    if (saveSys && typeof saveSys.captureActiveCharacterToRoster === 'function') {
      saveSys.captureActiveCharacterToRoster(true);
    }
    broadcastSharedWorldState();

    // 5. New Players with a freshly created Custom Shark who haven't escaped IKEA yet spawn inside the IKEA Spawning Pits!
    const isFounder = !!(saveSys && typeof saveSys.isFounderArchodect === 'function' && saveSys.isFounderArchodect());
    if (targetSharkId === 'custom' && !isFounder && localStorage.getItem('blahaj_escaped_spawning_pits_v1') !== 'true') {
      setTimeout(() => {
        if (typeof enterSpawningPits === 'function' && currentZone !== 'spawning_pits') {
          enterSpawningPits(true);
        }
      }, 280);
    } else {
      try {
        localStorage.setItem('blahaj_escaped_spawning_pits_v1', 'true');
      } catch (e) {}
    }
  }

  function logOutToCharacterSelect() {
    const saveSys = window.BlahajSaveSystem;
    // 1. Exit UFO / Boat / Cart cleanly before logging out
    if (window.BlahajUFO && typeof window.BlahajUFO.isLocalAboard === 'function' && window.BlahajUFO.isLocalAboard()) {
      if (typeof window.BlahajUFO.exitUFO === 'function') {
        window.BlahajUFO.exitUFO();
      }
    }
    if (player.inBoat) {
      player.inBoat = false;
    }
    if (player.inCart && typeof dismountLaundryCart === 'function') {
      dismountLaundryCart();
    }

    // 2. Return to Main Island scene if currently inside an instance so the character parks cleanly
    if (currentZone === 'laundromat' && typeof exitLaundromat === 'function') exitLaundromat();
    else if (currentZone === 'spherical_foods' && typeof exitSphericalFoods === 'function') exitSphericalFoods();
    else if (currentZone === 'volcano' && typeof exitVolcanoTrial === 'function') exitVolcanoTrial();
    else if (currentZone === 'sea_cave' && typeof exitSeaCaveGrotto === 'function') exitSeaCaveGrotto();
    else if (currentZone === 'volleyball' && typeof exitVolleyballCourt === 'function') exitVolleyballCourt();

    // 3. Save active character's inventory, skills, mange, accessories & world position to Roster Vault & sync to partner
    if (saveSys && typeof saveSys.captureActiveCharacterToRoster === 'function') {
      saveSys.captureActiveCharacterToRoster(true);
    }
    if (saveSys && typeof saveSys.saveNow === 'function') {
      saveSys.saveNow();
    }

    // 4. Release character lock on network so co-op partner can select this shark immediately
    if (window.BlahajNetwork) {
      window.BlahajNetwork.send({
        type: 'character_release',
        sharkId: player.sharkId
      });
    }

    // 5. Close any in-game modals & release pointer lock
    if (document.pointerLockElement && document.exitPointerLock) {
      try { document.exitPointerLock(); } catch (e) {}
    }
    ['pause-modal', 'character-sheet-modal', 'settings-modal', 'fast-travel-modal', 'upgrades-modal'].forEach((id) => {
      const m = document.getElementById(id);
      if (m) m.classList.add('hidden');
    });

    // 6. Open Full-Screen MMO Character Select Lobby
    if (saveSys && typeof saveSys.setInLobby === 'function') {
      saveSys.setInLobby(true);
    }
    const overlay = document.getElementById('game-loading-screen');
    if (overlay) {
      overlay.style.display = 'flex';
      requestAnimationFrame(() => {
        overlay.classList.remove('fade-out');
      });
    }
    if (saveSys && typeof saveSys.updateLaunchGatewayUI === 'function') {
      saveSys.updateLaunchGatewayUI();
    }
    CozyAudio.portalChime();
    showToast('🚪 LOGGED OUT TO CHARACTER SELECT', 'Your character’s inventory, skills, and position have been saved to the Shared Roster!');
  }

  async function init() {
    initLoadingScreen();
    setLoadingProgress(12, 'Initializing WebGL 3D renderer & scene…');
    await yieldFrame();

    const container = document.getElementById('canvas-container');
    clock = new THREE.Clock();

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(56, window.innerWidth / window.innerHeight, 0.1, 2400);

    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(1);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    container.appendChild(renderer.domElement);

    // Setup UnrealBloomPass Post-Processing for warm lantern, lava & portal glow
    if (typeof THREE.EffectComposer !== 'undefined' && typeof THREE.UnrealBloomPass !== 'undefined') {
      composer = new THREE.EffectComposer(renderer);
      renderPass = new THREE.RenderPass(scene, camera);
      composer.addPass(renderPass);

      bloomPassInstance = new THREE.UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        0.26,
        0.5,
        0.91
      );
      bloomPassInstance.enabled = !!(gameSettings.bloom);
      composer.addPass(bloomPassInstance);
    }

    setLoadingProgress(32, 'Generating 3D Archipelago terrain & sandy shores…');
    await yieldFrame();

    // 1. Build Expanded Blåhaj Archipelago (Main Island + 4 Outer Sanctuary Islands)
    worldApi = window.BlahajWorld.buildWorld(scene);
    if (window.BlahajHomestead) {
      window.BlahajHomestead.buildSurfaceSetPieces(scene, worldApi);
    }
    loadSavedStructures();

    // Pass 84: Restore persistent world position so returning players wake up right where they left off!
    if (hasStoredSavePoint && lastSavePoint && Number.isFinite(lastSavePoint.x) && Number.isFinite(lastSavePoint.z)) {
      player.pos.x = lastSavePoint.x;
      player.pos.z = lastSavePoint.z;
      if (typeof lastSavePoint.rotY === 'number' && Number.isFinite(lastSavePoint.rotY)) {
        player.rotY = lastSavePoint.rotY;
        camState.yaw = Math.atan2(-Math.sin(player.rotY), -Math.cos(player.rotY));
      }
      if (lastSavePoint.ufoIsleSpawn && window.BlahajUFO && typeof window.BlahajUFO.toggleHangarDoors === 'function') {
        window.BlahajUFO.toggleHangarDoors(true, true);
      }
    }
    player.pos.y = worldApi.getGroundAndStructureHeight(player.pos.x, player.pos.z);

    setLoadingProgress(48, 'Placing landmarks, Birb sanctuary & bread oven…');
    await yieldFrame();

    // Initialize Modular Inventory System, Solomon's Bread Oven & World Pickups
    if (window.BlahajInventory) {
      if (!player.inventory) {
        player.inventory = window.BlahajInventory.createPlayerInventory();
      }
      if (player.inventory && typeof player.inventory.hasItem === 'function') {
        if (!player.inventory.hasItem('binoculars')) {
          player.inventory.addItem('binoculars', 1);
        }
      }
      solomonBreadOven = window.BlahajInventory.createSolomonBreadOven();
      scene.add(solomonBreadOven.group);

      communityTrunk = window.BlahajInventory.createCommunityTrunk();
      scene.add(communityTrunk.group);

    // Initialize The Great Seam & Recurring Mini-Game System
    if (window.BlahajSeam) {
      window.BlahajSeam.init(scene);
      window.BlahajSeam.onZoneChanged(currentZone);
    }

      launchMortarStation = window.BlahajInventory.createLaunchMortarStation();
      scene.add(launchMortarStation.group);

      worldPickups = window.BlahajInventory.createWorldPickupManager(scene);
      worldPickups.initStaticNodes();

      // Hook Birbs eating Breb to dynamically drop fresh Birb Guano!
      window.BlahajOnBirbLoafEaten = (b) => {
        if (worldPickups && b && b.mesh) {
          worldPickups.spawnPickup('guano', {
            x: b.mesh.position.x,
            y: b.mesh.position.y + 0.05,
            z: b.mesh.position.z
          });
          CozyAudio.birbChirp();
          addChatLog('🪶 A happy, stuffed Birb dropped a fresh <strong>Birb Guano</strong> deposit on the grass!', 'lore');
        }
      };
    }

    setLoadingProgress(62, 'Spawning player plush shark & island characters…');
    await yieldFrame();

    // 2. Spawn High-Polygon Player Shark & All Island Characters
    if (window.BlahajSaveSystem && typeof window.BlahajSaveSystem.getCustomSharkConfig === 'function') {
      window.BlahajSaveSystem.getCustomSharkConfig();
    }
    const initialBootShark = (window.BlahajSaveSystem && window.BlahajSaveSystem.isFounderArchodect()) ? 'hermes' : 'custom';
    spawnPlayerShark(initialBootShark, true);
    spawnWorldCharacters();
    if (window.BlahajSaveSystem && typeof window.BlahajSaveSystem.syncFounderAndCustomSharkUI === 'function') {
      window.BlahajSaveSystem.syncFounderAndCustomSharkUI();
    }

    if (window.BlahajEnemies && typeof window.BlahajEnemies.init === 'function') {
      window.BlahajEnemies.init(scene, worldApi);
    }

    setLoadingProgress(76, 'Constructing Volcano dungeon halls & instances…');
    await yieldFrame();

    // 1b. Build Instanced Volcano Trial Dungeon Scene
    if (window.BlahajVolcano) {
      try {
        if (typeof window.BlahajVolcano.on === 'function') {
          window.BlahajVolcano.on({
            checkpoint: (room, pt) => {
              volcanoCheckpoint = { x: pt.x, y: pt.y, z: pt.z, rotY: pt.rotY || Math.PI };
              showToast('CHECKPOINT REACHED! ⛩️', `Entered ${window.BlahajVolcano.getRoomTitle(pt.z)}!`);
              CozyAudio.portalChime();
            },
            complete: () => {
              player.trialPoints += 2;
              updateMetersUI();
              renderUpgradesGrid();
              showToast('VOLCANO TRIAL CONQUERED! 🌋⚔️ (+2 TRIAL POINTS)', 'You reached the Sacred Caldera Overlook! Bump the Volunteer Carrots or step into the return portal!');
              addChatLog('🌋⚔️ <strong>VOLCANO TRIAL CONQUERED!</strong> You made it to the Caldera Overlook and earned <strong>+2 Trial Points</strong>!', 'system');
              CozyAudio.portalChime();
              completeQuest('q-volcano');
            },
            lavaFall: () => {
              handleVolcanoTrapHit('Molten Lava Sea');
            },
            pickup: (itemType) => {
              if (player.inventory) {
                player.inventory.addItem(itemType, 1);
                CozyAudio.bistroChime();
                showToast('VOLCANIC SULFUR HARVESTED! 🟡✨', 'Chiseled a pure crystalline sulfur cluster from the volcanic stone!');
                addChatLog('🟡 Harvested <strong>1x Volcanic Sulfur Crystal</strong> from the subterranean volcanic rock!', 'cozy');
                updateMetersUI();
              }
            }
          });
        }
        // Lazy-build Volcano Dungeon on first entry (avoids heavy boot-time geometry & shader stall!)
      } catch (err) {
        console.error('Failed to init BlahajVolcano:', err);
      }
    }

    // 3. Setup Controls, UI, Builder Toolbar, Gallery, Upgrades & Co-op Networking
    const runBootStep = (label, fn) => {
      try {
        fn();
      } catch (err) {
        console.error(`Boot step failed (${label}):`, err);
      }
    };
    runBootStep('loadSettings', loadSettings);
    runBootStep('setupInputs', setupInputs);
    runBootStep('setupUI', setupUI);
    runBootStep('setupSettingsUI', setupSettingsUI);
    runBootStep('applyAllSettings', applyAllSettings);
    runBootStep('setupBuilderUI', setupBuilderUI);
    runBootStep('BlahajQuests.init', () => {
      if (window.BlahajQuests && typeof window.BlahajQuests.init === 'function') {
        window.BlahajQuests.init();
      }
    });
    runBootStep('setupNetwork', setupNetwork);
    runBootStep('renderQuestList', renderQuestList);
    runBootStep('updateMetersUI', updateMetersUI);
    runBootStep('renderUpgradesGrid', renderUpgradesGrid);

    // Restore saved game state from active Island Passport slot BEFORE shader pre-compilation & 360° warmup!
    runBootStep('restoreGameFromSave', () => {
      if (window.BlahajSaveSystem) {
        const save = window.BlahajSaveSystem.getSaveState();
        if (save) {
          window.BlahajSaveSystem.restoreGameFromSave(save);
        }
      }
    });

    // Statically cap PointLights ONCE at boot ( ranked by reach/importance ) so NUM_POINT_LIGHTS never changes at runtime!
    // Never toggle PointLight.visible dynamically during gameplay, as changing NUM_POINT_LIGHTS forces Three.js/D3D11
    // to synchronously recompile every MeshStandardMaterial shader in the scene!
    try {
      const staticLights = [];
      scene.traverse((obj) => {
        if (obj.isPointLight && obj.visible) {
          const score = (obj.distance || 25) * (obj.intensity || 1);
          staticLights.push({ light: obj, score });
        }
      });
      staticLights.sort((a, b) => b.score - a.score);
      const MAX_STATIC_POINT_LIGHTS = 8;
      for (let i = MAX_STATIC_POINT_LIGHTS; i < staticLights.length; i++) {
        staticLights[i].light.visible = false;
      }
    } catch (e) {}

    setLoadingProgress(88, 'Pre-compiling WebGL shaders & GPU materials…');
    await yieldFrame();

    // 4. Pre-compile all WebGL shaders on GPU upfront (eliminates 10-20s runtime stutter!)
    try {
      updateCamera(0, 0.016);
      if (renderer && scene && camera) {
        renderer.compile(scene, camera);
      }
      if (window.BlahajVolcano?.getScene && window.BlahajVolcano?.getCamera) {
        const vScene = window.BlahajVolcano.getScene();
        const vCam = window.BlahajVolcano.getCamera();
        if (vScene && vCam && renderer) {
          renderer.compile(vScene, vCam);
        }
      }
    } catch (e) {
      console.warn('Shader pre-compilation warning:', e);
    }

    setLoadingProgress(90, 'Uploading 100% of island 3D meshes & textures to GPU (no-cull pass)…');
    await yieldFrame();

    // 5A. FORCE 100% NO-CULL GPU BUFFER & TEXTURE UPLOAD:
    // By default Three.js skips uploading VBOs and CanvasTextures for any mesh outside the current camera frustum,
    // which causes a 15-second stutter the first time you turn the camera in-game.
    // Temporarily disabling frustumCulled on every object in scene for 2 rendered frames forces WebGL/D3D11 to upload
    // 100% of all geometries, InstancedMeshes, and CanvasTextures across the entire island upfront!
    try {
      const savedCull = [];
      scene.traverse((obj) => {
        if (obj && (obj.isMesh || obj.isInstancedMesh || obj.isPoints || obj.isLine)) {
          savedCull.push({ obj, culled: obj.frustumCulled });
          obj.frustumCulled = false;
        }
      });
      updateCamera(0, 0.016);
      if (renderer && scene && camera) {
        renderer.compile(scene, camera);
        renderer.render(scene, camera);
      }
      await yieldFrame();
      if (composer && gameSettings.bloom && bloomPassInstance && bloomPassInstance.enabled) {
        composer.render();
      } else if (renderer && scene && camera) {
        renderer.render(scene, camera);
      }
      for (let i = 0; i < savedCull.length; i++) {
        savedCull[i].obj.frustumCulled = savedCull[i].culled;
      }
    } catch (e) {
      console.warn('No-cull GPU upload pass warning:', e);
    }

    setLoadingProgress(94, 'Turning 3D camera 360° to pre-warm all island view angles…');
    await yieldFrame();

    // 5. Multi-frame yielded 360° camera rotation sweep across 12 compass & pitch angles so every frustum sector's
    // textures, shadows, and D3D11 draw pipelines actually flush to the GPU across real frames!
    try {
      const savedYaw = camState.yaw;
      const savedPitch = camState.pitch;
      const totalSteps = 12;
      for (let step = 0; step < totalSteps; step++) {
        camState.yaw = savedYaw + (step * Math.PI * 2) / totalSteps;
        camState.pitch = (step % 2 === 0) ? 0.24 : 0.48;
        updateCamera(step * 0.05, 0.016);
        if (window.BlahajWorld && typeof window.BlahajWorld.updateWorld === 'function') {
          window.BlahajWorld.updateWorld(step * 0.05, 0.016, scene, camera);
        }
        if (composer && gameSettings.bloom && bloomPassInstance && bloomPassInstance.enabled) {
          composer.render();
        } else if (renderer && scene && camera) {
          renderer.render(scene, camera);
        }
        setLoadingProgress(90 + Math.round(((step + 1) / totalSteps) * 9), `Turning camera 360° (${Math.round(((step + 1) / totalSteps) * 360)}°) to unlock smooth mouse look…`);
        await yieldFrame();
      }
      camState.yaw = savedYaw;
      camState.pitch = savedPitch;
      updateCamera(0, 0.016);
    } catch (e) {
      console.warn('Warmup render warning:', e);
    }

    window.addEventListener('resize', onWindowResize);
    requestAnimationFrame(animate);

    setLoadingProgress(100, '360° Camera & Archipelago ready! Welcome to Blåhaj Island 🦈✨');
    finishLoadingScreen();
  }

  function canUseBuilderMode() {
    return true;
  }

  function spawnPlayerShark(sharkId, forceBypass = false) {
    const isSacredFour = ['hermes', 'solomon', 'hiram', 'nimue'].includes(sharkId);
    const isFounder = !!(window.BlahajSaveSystem && window.BlahajSaveSystem.isFounderArchodect());
    if (isSacredFour && !isFounder && !forceBypass) {
      CozyAudio.shonk();
      showToast(
        '👑 RESERVED FOR FOUNDERS RUSSELL & HELEN',
        'Hermes, Solomon, Hiram & Nimue are Revered Founder NPCs! Play your Custom Shark [5] or enter the Founder Passcode in Passport/Account.'
      );
      addChatLog(
        '👑 <strong>THE SACRED FOUR:</strong> Hermes, Solomon, Hiram & Nimue are Revered Living NPCs reserved for Creators Russell & Helen. Press <strong>[5]</strong> to play your Custom Named Blåhaj!',
        'lore'
      );
      if (!player.mesh) {
        sharkId = 'custom';
      } else {
        return;
      }
    }

    if (sharkId === 'custom' && window.BlahajSaveSystem && typeof window.BlahajSaveSystem.getCustomSharkConfig === 'function') {
      window.BlahajSaveSystem.getCustomSharkConfig();
    }

    const cfg = LORE.sharks[sharkId];
    if (!cfg) return;

    if (player.mesh) {
      if (player.mesh.parent) player.mesh.parent.remove(player.mesh);
    }

    player.sharkId = sharkId;
    const individualMange = getSharkMange(sharkId);
    window.__BLAHAJ_MANGE__ = individualMange;
    const individualAcc = getSharkAccessories(sharkId);

    player.mesh = window.BlahajModels.createPlushShark(cfg, individualMange, individualAcc);
    player.mesh.position.copy(player.pos);
    player.mesh.rotation.y = player.rotY;
    const activeScene = getActiveScene();
    activeScene.add(player.mesh);

    if (playerHeldItem && playerHeldItem.id && window.BlahajSharks3D && window.BlahajSharks3D.attachHeldItem) {
      window.BlahajSharks3D.attachHeldItem(player.mesh, playerHeldItem.id);
    }

    updateBlueSharkVisibility();

    // Sync HUD slider to this shark's individual mange factor!
    const hudSlider = document.getElementById('mange-factor-slider');
    const hudLabel = document.getElementById('mange-value-label');
    if (hudSlider && hudLabel) {
      const pct = Math.round(individualMange * 100);
      hudSlider.value = pct;
      hudLabel.textContent = formatMangeLabel(pct);
    }

    // Refresh Character Sheet if open
    const csModal = document.getElementById('character-sheet-modal');
    if (csModal && !csModal.classList.contains('hidden')) {
      renderCharacterSheet(selectedCSShark);
    }

    document.getElementById('hud-shark-portrait').src = cfg.portrait;
    document.getElementById('hud-shark-key').textContent = cfg.key;
    document.getElementById('hud-shark-name').textContent = cfg.name;
    document.getElementById('hud-shark-title').textContent = cfg.title;
    document.getElementById('hud-shark-quote').textContent = cfg.quote;
    document.getElementById('ability-icon').textContent = cfg.abilityIcon;
    document.getElementById('ability-name').textContent = cfg.abilityName;

    document.querySelectorAll('.shark-slot').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.shark === sharkId);
    });

    const slotCSub = document.getElementById('slot-c-sub');
    if (slotCSub) {
      slotCSub.textContent = canUseBuilderMode(sharkId) ? 'Ready [C]' : 'Need Builder [C]';
    }

    // If switching away from a builder-capable shark while Master Builder Mode is open, close Builder Mode cleanly
    if (!canUseBuilderMode(sharkId) && builderState.active) {
      setBuilderMode(false);
    } else if (sharkId === 'hiram') {
      showToast('HIRAM THE BUILDER ACTIVE 🔧', 'Press [C] to open Hiram’s Categorized Master Builder Toolbar!');
    }

    window.BlahajNetwork.send({
      type: 'shark_swap',
      sharkId
    });

    if (window.BlahajMMO && typeof window.BlahajMMO.renderActionBarUI === 'function') {
      window.BlahajMMO.renderActionBarUI();
    }
  }

  function spawnWorldCharacters() {
    const labelsRoot = document.getElementById('world-labels');

    Object.values(LORE.sharks).forEach((sCfg) => {
      if (sCfg.id === 'custom' || sCfg.isCustomShark) return;
      const mesh = window.BlahajModels.createPlushShark(sCfg, getSharkMange(sCfg.id));
      const hy = worldApi.getGroundAndStructureHeight(sCfg.homePos.x, sCfg.homePos.z);
      mesh.position.set(sCfg.homePos.x, hy, sCfg.homePos.z);
      mesh.rotation.y = sCfg.homePos.rotY || 0;
      mesh.visible = sCfg.id !== player.sharkId;
      scene.add(mesh);

      const labelEl = createWorldLabel(labelsRoot, sCfg.name, 'REVERED FOUNDER · THE SACRED FOUR');
      labelEl.dataset.targetId = `actor_${sCfg.id}`;
      labelEl.title = `Click to Target ${sCfg.name} · Right-Click to Interact`;
      if (sCfg.id === player.sharkId) labelEl.style.display = 'none';

      worldActors.push({
        id: sCfg.id,
        name: sCfg.name,
        tag: sCfg.title,
        portrait: sCfg.portrait,
        lines: sCfg.greetings,
        lineIdx: 0,
        mesh,
        labelEl,
        isBlueShark: true
      });
    });

    LORE.npcs.forEach((npc) => {
      let mesh;
      if (npc.type === 'pink_shark') {
        mesh = window.BlahajModels.createPlushShark({
          type: 'pink_shark',
          bodyColor: 0xd97b96,
          bellyColor: 0xf7e8ec,
          scarfColor: 0x692942,
          beautySpot: npc.beautySpot,
          hasClipboard: npc.hasClipboard,
          scale: 1.02
        });
      } else if (npc.type === 'baby_shark') {
        mesh = window.BlahajModels.createPlushShark({
          id: 'paracelsus',
          bodyColor: 0x2e8cf0,
          bellyColor: 0xfaf5eb,
          scarfColor: 0xf5b942,
          scale: 0.68,
          plumpness: 1.08
        });
      } else if (npc.type === 'beetroot') {
        mesh = window.BlahajModels.createBeetrootServer();
      } else if (npc.type === 'carrot') {
        mesh = window.BlahajModels.createBeachCarrot(npc.shortsColor);
      }

      const ny = npc.pos.y !== undefined ? npc.pos.y : worldApi.getGroundAndStructureHeight(npc.pos.x, npc.pos.z);
      mesh.position.set(npc.pos.x, ny, npc.pos.z);
      mesh.rotation.y = npc.pos.rotY || 0;
      scene.add(mesh);

      const labelEl = createWorldLabel(labelsRoot, npc.name, npc.tag);
      labelEl.dataset.targetId = `actor_${npc.id}`;
      labelEl.title = `Click to Target ${npc.name} · Right-Click to Interact`;

      worldActors.push({
        id: npc.id,
        name: npc.name,
        tag: npc.tag,
        portrait: npc.portrait,
        lines: npc.lines,
        lineIdx: 0,
        mesh,
        labelEl,
        isBlueShark: false
      });
    });

    // Crossroads Signposts use physical 3D painted signs and clean bottom interaction prompts,
    // avoiding bulky floating 3D text strips that obstruct exploration.
  }

  function refreshWorldActorMesh(act, newMange) {
    const sCfg = LORE.sharks[act.id];
    if (!sCfg || !act.mesh) return null;
    const parent = act.mesh.parent || scene;
    const pos = act.mesh.position.clone();
    const rotY = act.mesh.rotation.y;
    parent.remove(act.mesh);
    const newMesh = window.BlahajModels.createPlushShark(sCfg, newMange);
    newMesh.position.copy(pos);
    newMesh.rotation.y = rotY;
    newMesh.visible = act.mesh.visible;
    parent.add(newMesh);
    act.mesh = newMesh;
    return newMesh;
  }

  function createWorldLabel(parent, name, tagText) {
    const el = document.createElement('div');
    el.className = 'world-label';
    el.innerHTML = `
      <div class="speech-bubble hidden"></div>
      <div class="npc-tag">${tagText}</div>
      <div class="npc-name">${name}</div>
    `;
    parent.appendChild(el);
    return el;
  }

  function showActorSpeechBubble(actor, text, duration = 4500) {
    if (!actor || !actor.labelEl) return;
    const bubble = actor.labelEl.querySelector('.speech-bubble');
    if (!bubble) return;
    bubble.textContent = text;
    bubble.classList.remove('hidden');
    clearTimeout(actor._bubbleTimer);
    actor._bubbleTimer = setTimeout(() => {
      bubble.classList.add('hidden');
    }, duration);
  }

  const SHARED_BURST_GEO = new THREE.OctahedronGeometry(0.18, 0);
  const SHARED_BUBBLE_GEO = new THREE.SphereGeometry(0.15, 6, 6);
  const SHARED_BUBBLE_MAT = new THREE.MeshBasicMaterial({ color: 0xa5f3fc, transparent: true, opacity: 0.72 });
  const SHARED_SNOOZE_GEO = new THREE.OctahedronGeometry(0.12, 0);
  const SHARED_SNOOZE_MAT = new THREE.MeshBasicMaterial({ color: 0x93c5fd, transparent: true, opacity: 0.85 });
  const SHARED_CRUMB_GEO = new THREE.DodecahedronGeometry(0.045, 0);
  const SHARED_CRUMB_MAT = new THREE.MeshStandardMaterial({ color: 0xd99b4e, roughness: 0.8 });
  const sharedBurstMatCache = new Map();
  function getSharedBurstMat(colorHex) {
    let m = sharedBurstMatCache.get(colorHex);
    if (!m) {
      m = new THREE.MeshBasicMaterial({ color: colorHex });
      sharedBurstMatCache.set(colorHex, m);
    }
    return m;
  }

  function spawnFloatingBurst(originPos, colorHex = 0xff7eb6, count = 7) {
    const activeScene = getActiveScene();
    const mat = getSharedBurstMat(colorHex);
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(SHARED_BURST_GEO, mat);
      mesh.position.set(
        originPos.x + (Math.random() - 0.5) * 1.4,
        originPos.y + 1.8 + Math.random() * 0.7,
        originPos.z + (Math.random() - 0.5) * 1.4
      );
      activeScene.add(mesh);
      floatingBursts.push({
        mesh,
        vel: new THREE.Vector3((Math.random() - 0.5) * 1.5, 1.8 + Math.random() * 1.2, (Math.random() - 0.5) * 1.5),
        life: 1.1
      });
    }
  }

  const SHARED_SPRAY_GEO = new THREE.SphereGeometry(0.16, 6, 5);
  const SHARED_SPRAY_WHITE_MAT = new THREE.MeshBasicMaterial({ color: 0xf0f9ff, transparent: true, opacity: 0.9 });
  const SHARED_SPRAY_AQUA_MAT = new THREE.MeshBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.85 });
  const SHARED_FOAM_RING_GEO = new THREE.RingGeometry(0.65, 1.05, 28);

  function spawnWaterBreachSplash(originPos, scale = 1.0, waterY = null) {
    const activeScene = getActiveScene();
    if (!activeScene || !originPos) return;
    const surfY = (typeof waterY === 'number') ? waterY : originPos.y;
    const count = Math.round(24 * Math.min(2.2, Math.max(0.8, scale)));

    // 1. Expanding white-foam surface shockwave rings
    [0, 1].forEach((ringIdx) => {
      const ringMat = new THREE.MeshBasicMaterial({
        color: ringIdx === 0 ? 0xf8fafc : 0xbae6fd,
        transparent: true,
        opacity: 0.88 - ringIdx * 0.2,
        side: THREE.DoubleSide,
        depthWrite: false
      });
      const ring = new THREE.Mesh(SHARED_FOAM_RING_GEO, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(originPos.x, surfY + 0.08 + ringIdx * 0.04, originPos.z);
      ring.scale.setScalar(0.55 * scale);
      activeScene.add(ring);
      floatingBursts.push({
        mesh: ring,
        vel: new THREE.Vector3(0, 0.12, 0),
        life: 0.72 + ringIdx * 0.16,
        maxLife: 0.72 + ringIdx * 0.16,
        expandRate: (6.5 + ringIdx * 2.2) * scale,
        baseScale: 0.55 * scale
      });
    });

    // 2. Arcing sea-spray droplets & mist plumes
    for (let i = 0; i < count; i++) {
      const isWhite = i % 2 === 0;
      const mesh = new THREE.Mesh(SHARED_SPRAY_GEO, isWhite ? SHARED_SPRAY_WHITE_MAT : SHARED_SPRAY_AQUA_MAT);
      const ang = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.35;
      const radOut = (0.35 + Math.random() * 0.9) * scale;
      const horizSpd = (2.8 + Math.random() * 5.2) * Math.sqrt(scale);
      const upSpd = (5.8 + Math.random() * 6.5) * Math.sqrt(scale);
      mesh.position.set(
        originPos.x + Math.cos(ang) * radOut,
        surfY + 0.15 + Math.random() * 0.45 * scale,
        originPos.z + Math.sin(ang) * radOut
      );
      const dropScale = (0.65 + Math.random() * 0.95) * Math.min(1.8, Math.max(0.75, scale * 0.8));
      mesh.scale.setScalar(dropScale);
      activeScene.add(mesh);
      floatingBursts.push({
        mesh,
        vel: new THREE.Vector3(Math.cos(ang) * horizSpd, upSpd, Math.sin(ang) * horizSpd),
        gravity: 21.0,
        life: 0.85 + Math.random() * 0.4,
        maxLife: 1.25
      });
    }
  }

  function spawnUnderwaterBubbles(originPos, count = 4) {
    const activeScene = getActiveScene();
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(SHARED_BUBBLE_GEO, SHARED_BUBBLE_MAT);
      const sc = 0.8 + Math.random() * 0.5;
      mesh.scale.setScalar(sc);
      mesh.position.set(
        originPos.x + (Math.random() - 0.5) * 0.9,
        originPos.y + (Math.random() - 0.5) * 0.4,
        originPos.z + (Math.random() - 0.5) * 0.9
      );
      activeScene.add(mesh);
      floatingBursts.push({
        mesh,
        vel: new THREE.Vector3((Math.random() - 0.5) * 0.4, 1.8 + Math.random() * 1.4, (Math.random() - 0.5) * 0.4),
        life: 0.95
      });
    }
  }

  function spawnSnoozeZzz(originPos) {
    if (currentZone !== 'island') return;
    const mesh = new THREE.Mesh(SHARED_SNOOZE_GEO, SHARED_SNOOZE_MAT);
    mesh.position.set(
      originPos.x + (Math.random() - 0.5) * 0.4,
      originPos.y + 0.55 + Math.random() * 0.2,
      originPos.z + (Math.random() - 0.5) * 0.4
    );
    scene.add(mesh);
    floatingBursts.push({
      mesh,
      vel: new THREE.Vector3((Math.random() - 0.5) * 0.3, 0.75 + Math.random() * 0.3, (Math.random() - 0.5) * 0.3),
      life: 1.6
    });
  }
  function spawnBreadCrumbs(originPos) {
    if (currentZone !== 'island') return;
    for (let i = 0; i < 3; i++) {
      const mesh = new THREE.Mesh(SHARED_CRUMB_GEO, SHARED_CRUMB_MAT);
      mesh.position.set(
        originPos.x + (Math.random() - 0.5) * 0.35,
        originPos.y + 0.08 + Math.random() * 0.15,
        originPos.z + (Math.random() - 0.5) * 0.35
      );
      scene.add(mesh);
      floatingBursts.push({
        mesh,
        vel: new THREE.Vector3((Math.random() - 0.5) * 0.5, 0.4 + Math.random() * 0.35, (Math.random() - 0.5) * 0.5),
        life: 0.75
      });
    }
  }
  window.BlahajEffects = { spawnSnoozeZzz, spawnBreadCrumbs };

  window.BlahajOnBirbLoafEaten = function (birb) {
    player.birbCrumbs = (player.birbCrumbs || 0) + 1;
    spawnFloatingBurst(birb.mesh.position, 0xfbbf24, 6);
    CozyAudio.birbChirp();
    const appetiteState = `${birb.appetite}/3`;
    showToast('MUNCH MUNCH! 🥖🐦', `Plump Birb happily pecked warm Breb! (${appetiteState} full) (+1 Birb Crumb)`);
    addChatLog(`🐦 Birb happily finished pecking a loaf of Breb (${appetiteState} full). +1 Birb Crumb!`, 'lore');
    completeQuest('q-breb');
    updateMetersUI();
    renderBuilderToolbar();
  };

  window.BlahajOnBirbComa = function (birb) {
    CozyAudio.birbChirp();
    showToast('BIRB IN FOOD COMA! 😴', 'Plump Birb ate 3 loaves and collapsed happily! Approach to gather Soft Down [E] 🪶');
    addChatLog('😴 A delightfully round Birb entered a deep Breb Coma on the grass. You can gently gather Soft Birb Down!', 'lore');
  };

  window.BlahajOnBirbWakeUp = function (birb) {
    if (worldPickups && birb && birb.mesh) {
      worldPickups.spawnPickup('guano', {
        x: birb.mesh.position.x,
        y: birb.mesh.position.y + 0.05,
        z: birb.mesh.position.z
      });
      CozyAudio.birbChirp();
      showToast('BIRB WOKE UP! 🕊️', 'The rested Birb woke up and left a fresh nitrate Guano deposit on the grass!');
      addChatLog('🕊️ A rested Birb woke from its food coma, shook its wings, and left a mineral <strong>Birb Guano</strong> deposit on the meadow!', 'lore');
    }
  };

  window.BlahajOnBirbComa = function (birb) {
    player.birbCrumbs = (player.birbCrumbs || 0) + 1;
    const prevMilestones = Math.floor(player.birbsFedCount / 10);
    player.birbsFedCount += 1;
    const newMilestones = Math.floor(player.birbsFedCount / 10);
    if (newMilestones > prevMilestones) {
      player.trialPoints += (newMilestones - prevMilestones);
      showToast('BIRB BLESSING (+1 TRIAL POINT!)', `Full belly! Fed ${player.birbsFedCount} Birbs to satiation! Earned +1 Trial Point!`);
    } else {
      showToast('BREB COMA! 🥖💤', `Plump Birb ate 3 loaves to full capacity and entered a cozy 90s Breb Coma! (+1 Birb Crumb)`);
    }
    addChatLog(`🥖💤 A plump Birb ate 3 loaves and peacefully settled into a cozy Breb Coma!`, 'lore');
    spawnFloatingBurst(birb.mesh.position, 0xffd166, 12);
    completeQuest('q-breb');
    updateMetersUI();
    renderBuilderToolbar();
  };

  function applySteamingSpiritBuff() {
    player.teaBuffTimer = 300.0; // 5 minutes active buff
    player.teaComfort = 100;
    player.warmth = 100;
    CozyAudio.teaPour();
    spawnFloatingBurst(player.pos, 0x86efac, 18);
    updateMetersUI();
    showToast('STEAMING SPIRIT BUFF! 🍵✨', 'Granted 5 minutes of Steaming Spirit! +15% Agility & Immunity to Coherence Decay!');
    addChatLog('🍵 Steeping warmth fills your plush seams with <strong>Steaming Spirit</strong> (+15% Agility, 5m Coherence Shield)!', 'lore');
  }

  // ==========================================================================
  // CONTROLS & OVER-THE-SHOULDER MMO CAMERA
  // ==========================================================================
  function setupInputs() {
    initIslandMapEvents();
    initTelescopeEvents();
    const canvas = renderer.domElement;

    canvas.addEventListener('click', () => {
      CozyAudio.ensure();
      const vhudCard = document.getElementById('volcano-hud-card');
      if (vhudCard && !vhudCard.classList.contains('hidden') && !vhudCard.classList.contains('fading-out')) {
        hideVolcanoHUDCard();
        return;
      }
    });

    let lastClientX = null;
    let lastClientY = null;
    let prevPointerDx = 0;
    let prevPointerDy = 0;
    let altComboUsed = false;

    // =========================================================================
    // PASS 89: DOUBLE-CLICK TO PLAY · ESC PAUSE MENU · IN-GAME SHARK FIN CURSOR
    // Single source of truth: Chrome Pointer Lock = IN GAME; Unlocked = OS MOUSE FREE.
    // While IN GAME: Mouse = Camera; Hold Right-Click (or any open modal) = Shark Fin Cursor.
    // =========================================================================
    const finCursor = {
      x: Math.round(window.innerWidth * 0.5),
      y: Math.round(window.innerHeight * 0.5),
      hoveredEl: null,
      draggingRange: null
    };
    const finCursorEl = document.getElementById('shark-fin-cursor');
    const finBadgeEl = document.getElementById('shark-fin-badge');
    const finBeltBarEl = document.getElementById('fin-belt-bar');
    const playCapturePillEl = document.getElementById('play-capture-pill');
    const pauseOverlayEl = document.getElementById('game-pause-overlay');
    const finSenseBoxEl = document.getElementById('fin-sense-box');
    const finModeStripEl = document.getElementById('fin-mode-strip');
    const finSenseCardEl = document.getElementById('fin-sense-card');
    const finSenseIconEl = document.getElementById('fin-sense-icon');
    const finSenseNameEl = document.getElementById('fin-sense-name');
    const finSenseSubEl = document.getElementById('fin-sense-sub');
    const finSenseDistEl = document.getElementById('fin-sense-dist');
    const finSenseBodyEl = document.getElementById('fin-sense-body');

    const finSense = {
      armedTool: 'interact',     // 'interact' | 'examine' | 'pet' (used in Persistent mode)
      tempOverride: null,        // null (Smart Auto) | 'interact' | 'examine' | 'pet' (1-3 while RMB in Smart mode)
      activeSlotIdx: -1,         // -1 = Bare Fin, 0..8 = Fin Slots 1..9
      hoveredTarget: null,
      lastPickAt: 0,
      examineUntil: 0,
      fKeyDownAt: 0,
      fKeyActive: false,
      projVec: new THREE.Vector3(),
      raycaster: new THREE.Raycaster(),
      rayNdc: new THREE.Vector2()
    };

    const thrownProjectiles = [];

    function syncFinCursorBadge() {
      if (!finBadgeEl) return;
      if (builderState.active) {
        const spec = (LORE.buildCatalog || []).find((x) => x.id === builderState.selectedId);
        finBadgeEl.textContent = spec ? `🔧${spec.icon}` : '🔧';
        finBadgeEl.classList.remove('hidden');
        return;
      }
      if (playerHeldItem && playerHeldItem.id) {
        const meta = (window.BlahajInventory && window.BlahajInventory.ITEMS && window.BlahajInventory.ITEMS[playerHeldItem.id]) || getHeldItemMeta(playerHeldItem.id);
        finBadgeEl.textContent = (meta && meta.icon) || playerHeldItem.icon || '✨';
        finBadgeEl.classList.remove('hidden');
      } else {
        finBadgeEl.textContent = '';
        finBadgeEl.classList.add('hidden');
      }
    }

    function cycleBuilderCategory() {
      const cats = LORE.buildCategories || [];
      if (!cats.length) return;
      const idx = cats.findIndex((c) => c.id === builderState.category);
      const nextCat = cats[(idx + 1) % cats.length];
      builderState.category = nextCat.id;
      const firstInCat = (LORE.buildCatalog || []).find((x) => x.category === nextCat.id);
      if (firstInCat) {
        builderState.selectedId = firstInCat.id;
        refreshPreviewMesh();
      }
      CozyAudio.shonk();
      renderFinBelt();
      renderBuilderToolbar();
    }
    window._blahajCycleBuilderCategory = cycleBuilderCategory;

    function renderFinBelt() {
      if (!finBeltBarEl || !player.inventory) return;
      if (builderState.active) {
        finBeltBarEl.classList.add('builder-fin-belt');
        const cats = LORE.buildCategories || [];
        const curCat = cats.find((c) => c.id === builderState.category) || cats[0] || { id: 'skarhaj_kits', name: '📦 SKÄRHAJ' };
        const shortCatName = curCat.name.split(' ')[0] + ' ' + (curCat.name.split(' ')[1] || '');
        const catItems = (LORE.buildCatalog || []).filter((x) => x.category === builderState.category);
        const f = builderState.storyFloor || 0;
        const floorLbl = f === 0 ? '1F' : f === 1 ? '2F' : '3F';

        let html = `<button type="button" class="fin-belt-pill-btn cat-btn" id="fb-build-cat" title="Click with Fin Cursor (or press [Tab]) to switch Blueprint Category">${shortCatName} ▾</button>`;
        catItems.forEach((item, i) => {
          const isAct = builderState.selectedId === item.id;
          const shortName = item.name.replace(/^SKÄRHAJ\s+|Snap\s+/i, '').split(' (')[0];
          html += `<button type="button" class="fin-belt-slot${isAct ? ' active' : ''}" data-finslot="${i}" title="[${i + 1}] ${item.name} — ${item.costLabel}"><span class="fin-belt-key">${i + 1}</span><span class="fin-belt-icon">${item.icon}</span><span class="fin-belt-bp-lbl">${shortName}</span></button>`;
        });
        html += `<button type="button" class="fin-belt-pill-btn" id="fb-build-rot" title="Rotate Blueprint [R or Scroll Wheel]">🔄 <kbd>R</kbd></button>`;
        html += `<button type="button" class="fin-belt-pill-btn${builderState.snapGrid ? ' active' : ''}" id="fb-build-snap" title="Toggle 4m Grid &amp; Edge Snapping [G]">🧲 ${builderState.snapGrid ? 'Snap' : 'Free'} <kbd>G</kbd></button>`;
        html += `<button type="button" class="fin-belt-pill-btn${f > 0 ? ' active' : ''}" id="fb-build-elev" title="Cycle Floor Story Elevation [Z]">📐 ${floorLbl} <kbd>Z</kbd></button>`;
        html += `<button type="button" class="fin-belt-pill-btn${builderState.freeBuild ? ' active' : ''}" id="fb-build-free" title="Toggle Free-Build Mode [V]">✨ ${builderState.freeBuild ? 'Free ON' : 'Cost'} <kbd>V</kbd></button>`;
        html += `<button type="button" class="fin-belt-pill-btn" id="fb-build-del" title="Demolish Nearest Built Structure [X]">🗑️ <kbd>X</kbd></button>`;
        html += `<button type="button" class="fin-belt-pill-btn exit-btn" id="fb-build-exit" title="Return to Normal Shark Fin [C / Esc]">✖ Done <kbd>C</kbd></button>`;

        finBeltBarEl.innerHTML = html;
        finBeltBarEl.querySelectorAll('.fin-belt-slot').forEach((btn) => {
          btn.addEventListener('click', (ev) => {
            ev.stopPropagation();
            selectFinSlot(parseInt(btn.dataset.finslot, 10));
          });
        });
        document.getElementById('fb-build-cat')?.addEventListener('click', (ev) => { ev.stopPropagation(); cycleBuilderCategory(); });
        document.getElementById('fb-build-rot')?.addEventListener('click', (ev) => {
          ev.stopPropagation();
          builderState.rotOffset += builderState.snapGrid ? (Math.PI / 2) : (Math.PI / 4);
          CozyAudio.shonk();
        });
        document.getElementById('fb-build-snap')?.addEventListener('click', (ev) => { ev.stopPropagation(); toggleSnapGrid(); renderFinBelt(); });
        document.getElementById('fb-build-elev')?.addEventListener('click', (ev) => { ev.stopPropagation(); cycleBuilderStoryElevation(); renderFinBelt(); });
        document.getElementById('fb-build-free')?.addEventListener('click', (ev) => { ev.stopPropagation(); toggleFreeBuild(); renderFinBelt(); });
        document.getElementById('fb-build-del')?.addEventListener('click', (ev) => { ev.stopPropagation(); removeNearestBuiltStructure(); });
        document.getElementById('fb-build-exit')?.addEventListener('click', (ev) => { ev.stopPropagation(); setBuilderMode(false); });
        syncFinCursorBadge();
        return;
      }

      finBeltBarEl.classList.remove('builder-fin-belt');
      const slots = player.inventory.getSlots();
      const heldId = playerHeldItem ? playerHeldItem.id : null;
      let html = '';
      for (let i = 0; i < 9; i++) {
        const s = slots[i];
        const isActive = !!(s && heldId && s.id === heldId && (finSense.activeSlotIdx === i || finSense.activeSlotIdx === -1));
        if (s) {
          const qtyHtml = s.qty > 1 ? `<span class="fin-belt-qty">${s.qty}</span>` : '';
          html += `<button type="button" class="fin-belt-slot${isActive ? ' active' : ''}" data-finslot="${i}"><span class="fin-belt-key">${i + 1}</span><span class="fin-belt-icon">${s.icon || '📦'}</span>${qtyHtml}</button>`;
        } else {
          html += `<button type="button" class="fin-belt-slot empty" data-finslot="${i}"><span class="fin-belt-key">${i + 1}</span></button>`;
        }
      }
      finBeltBarEl.innerHTML = html;
      finBeltBarEl.querySelectorAll('.fin-belt-slot').forEach((btn) => {
        const idx = parseInt(btn.dataset.finslot, 10);
        btn.addEventListener('click', (ev) => {
          ev.stopPropagation();
          selectFinSlot(idx);
        });
        btn.addEventListener('mouseenter', (ev) => {
          const slotItem = player.inventory ? player.inventory.getSlot(idx) : null;
          if (slotItem) {
            showInventoryHoverTooltip(slotItem, ev.clientX, ev.clientY, `Fin Belt Slot [${idx + 1}] · Click or Press [${idx + 1}] to Hold/Use`);
          } else {
            showInventoryHoverTooltip(
              { icon: '🦈', name: `Fin Slot [${idx + 1}] (Empty)`, rarity: 'cozy', type: 'Quick-Fin Belt Slot', desc: 'Hold-eligible items placed in your Satchel automatically populate open Fin Belt slots 1–9.', stats: 'Press [1–9] or RMB + Scroll to cycle Fin items' },
              ev.clientX,
              ev.clientY,
              'Bare Fin Slot'
            );
          }
        });
        btn.addEventListener('mousemove', (ev) => {
          moveInventoryHoverTooltip(ev.clientX, ev.clientY);
        });
        btn.addEventListener('mouseleave', () => {
          hideInventoryHoverTooltip();
        });
      });
      syncFinCursorBadge();
    }
    window._blahajRenderFinBelt = renderFinBelt;

    function selectFinSlot(idx) {
      if (builderState.active) {
        const catItems = (LORE.buildCatalog || []).filter((x) => x.category === builderState.category);
        if (idx >= 0 && idx < catItems.length) {
          const item = catItems[idx];
          builderState.selectedId = item.id;
          CozyAudio.shonk();
          refreshPreviewMesh();
          renderFinBelt();
          renderBuilderToolbar();
          showFinSenseCard(
            item.icon || '🏗️',
            `🔧 ${item.name}`,
            'Left-Click World to Build · RMB+Scroll Cycles · [R] Rotate · [X] Demolish',
            builderState.freeBuild ? '✨ FREE' : item.costLabel,
            item.desc || '',
            2400
          );
        }
        return;
      }
      if (!player.inventory || idx < 0 || idx > 8) return;
      const slot = player.inventory.getSlot(idx);
      if (!slot) {
        finSense.activeSlotIdx = -1;
        if (playerHeldItem.id) stowHeldItem(true);
        renderFinBelt();
        showFinSenseCard('🦈', 'Bare Fin', 'Pick Up · Open · Pet · Boop', '', '', 1800);
        return;
      }
      // Pressing the active slot again stows back to Bare Fin
      if (finSense.activeSlotIdx === idx && playerHeldItem.id === slot.id) {
        finSense.activeSlotIdx = -1;
        stowHeldItem(true);
        renderFinBelt();
        showFinSenseCard('🦈', 'Bare Fin', 'Stowed item · Bare Fin ready', '', '', 1800);
        return;
      }
      finSense.activeSlotIdx = idx;
      equipHeldItem(slot.id);
      renderFinBelt();
      const hint = slot.throwable ? 'Click close to use · Click far/ground or Hold [F] to throw!' : 'Tap [F] or Click target with Fin Cursor';
      showFinSenseCard(slot.icon || '✨', `[${idx + 1}] ${slot.name}`, hint, '', '', 2200);
    }

    function cycleFinSlot(delta) {
      if (builderState.active) {
        const allItems = LORE.buildCatalog || [];
        if (!allItems.length) return;
        const curIdx = allItems.findIndex((x) => x.id === builderState.selectedId);
        const nextIdx = ((curIdx === -1 ? 0 : curIdx) + (delta > 0 ? 1 : -1) + allItems.length) % allItems.length;
        const nextItem = allItems[nextIdx];
        builderState.category = nextItem.category;
        builderState.selectedId = nextItem.id;
        CozyAudio.shonk();
        refreshPreviewMesh();
        renderFinBelt();
        renderBuilderToolbar();
        showFinSenseCard(
          nextItem.icon || '🏗️',
          `🔧 ${nextItem.name}`,
          'Left-Click World to Build · RMB+Scroll Cycles · [R] Rotate · [X] Demolish',
          builderState.freeBuild ? '✨ FREE' : nextItem.costLabel,
          nextItem.desc || '',
          2200
        );
        return;
      }
      if (!player.inventory) return;
      // Cycle through [-1 (Bare Fin), ...occupied 0..8 fin slots]
      const cycle = [-1];
      for (let i = 0; i < 9; i++) {
        if (player.inventory.getSlot(i)) cycle.push(i);
      }
      if (cycle.length <= 1) return;
      let curPos = cycle.indexOf(finSense.activeSlotIdx);
      if (curPos === -1) curPos = 0;
      const nextPos = (curPos + (delta > 0 ? 1 : -1) + cycle.length) % cycle.length;
      const nextIdx = cycle[nextPos];
      if (nextIdx === -1) {
        finSense.activeSlotIdx = -1;
        if (playerHeldItem.id) stowHeldItem(true);
        renderFinBelt();
        showFinSenseCard('🦈', 'Bare Fin', 'Pick Up · Open · Pet · Boop', '', '', 1800);
      } else {
        selectFinSlot(nextIdx);
      }
    }

    function computeGroundPointUnderScreen(sx, sy, maxThrowDist = 24.0) {
      if (!camera) return null;
      finSense.rayNdc.set((sx / window.innerWidth) * 2 - 1, -(sy / window.innerHeight) * 2 + 1);
      finSense.raycaster.setFromCamera(finSense.rayNdc, camera);
      const orig = finSense.raycaster.ray.origin;
      const dir = finSense.raycaster.ray.direction;

      const clampToRange = (tx, tz) => {
        const dx = tx - player.pos.x;
        const dz = tz - player.pos.z;
        const d = Math.hypot(dx, dz);
        let cx = tx;
        let cz = tz;
        if (d > maxThrowDist && d > 0.001) {
          cx = player.pos.x + (dx / d) * maxThrowDist;
          cz = player.pos.z + (dz / d) * maxThrowDist;
        }
        let cy = player.pos.y;
        if ((currentZone === 'island' || currentZone === 'overworld') && worldApi && typeof worldApi.getGroundAndStructureHeight === 'function') {
          cy = worldApi.getGroundAndStructureHeight(cx, cz, player.pos.y + 6.0);
        } else if (currentZone === 'volcano' && window.BlahajVolcano) {
          cy = window.BlahajVolcano.getFloorHeight(cx, cz, player.pos.y + 6.0);
          if (cy < -100) cy = window.BlahajVolcano.constants.LAVA_Y || -6;
        }
        return new THREE.Vector3(cx, cy, cz);
      };

      if (dir.y >= -0.02) {
        return clampToRange(player.pos.x + dir.x * 16, player.pos.z + dir.z * 16);
      }

      // Step along ray to intersect terrain/floor cleanly
      for (let d = 1.5; d <= 48.0; d += 1.0) {
        const rx = orig.x + dir.x * d;
        const ry = orig.y + dir.y * d;
        const rz = orig.z + dir.z * d;
        let gy = player.pos.y;
        if ((currentZone === 'island' || currentZone === 'overworld') && worldApi && typeof worldApi.getGroundAndStructureHeight === 'function') {
          gy = worldApi.getGroundAndStructureHeight(rx, rz, ry + 1.5);
        } else if (currentZone === 'volcano' && window.BlahajVolcano) {
          gy = window.BlahajVolcano.getFloorHeight(rx, rz, ry + 1.5);
          if (gy < -100) gy = window.BlahajVolcano.constants.LAVA_Y || -6;
        }
        if (ry <= gy + 0.25) {
          return clampToRange(rx, rz);
        }
      }
      return clampToRange(player.pos.x + dir.x * 18, player.pos.z + dir.z * 18);
    }
    window._blahajGetFinGroundPoint = computeGroundPointUnderScreen;

    function createThrownMesh(itemId) {
      if (itemId === 'breb') {
        const g = new THREE.Group();
        const loaf = new THREE.Mesh(
          new THREE.SphereGeometry(0.26, 10, 8),
          new THREE.MeshStandardMaterial({ color: 0xd99142, roughness: 0.72 })
        );
        loaf.scale.set(1.45, 0.78, 0.95);
        g.add(loaf);
        return g;
      }
      if (itemId === 'margarita') {
        const g = new THREE.Group();
        const glass = new THREE.Mesh(
          new THREE.ConeGeometry(0.18, 0.28, 12),
          new THREE.MeshStandardMaterial({ color: 0x4ade80, emissive: 0x22c55e, emissiveIntensity: 0.35, roughness: 0.15 })
        );
        glass.rotation.x = Math.PI;
        glass.position.y = 0.08;
        g.add(glass);
        return g;
      }
      if (itemId === 'tropical_cocktail' || itemId === 'celestial_boba') {
        return new THREE.Mesh(
          new THREE.CylinderGeometry(0.13, 0.10, 0.30, 12),
          new THREE.MeshStandardMaterial({ color: itemId === 'celestial_boba' ? 0xfbbf24 : 0xfb7185, emissive: 0xf97316, emissiveIntensity: 0.35, roughness: 0.2 })
        );
      }
      if (itemId === 'party_favor') {
        return new THREE.Mesh(
          new THREE.CylinderGeometry(0.12, 0.12, 0.42, 10),
          new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0xec4899, emissiveIntensity: 0.35 })
        );
      }
      if (itemId === 'tea') {
        return new THREE.Mesh(
          new THREE.CylinderGeometry(0.16, 0.13, 0.24, 10),
          new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xd97706, emissiveIntensity: 0.4 })
        );
      }
      return new THREE.Mesh(
        new THREE.SphereGeometry(0.24, 10, 8),
        new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.35 })
      );
    }

    function raiseBinocularsTowardScreen(sx, sy) {
      if (isUsingBinoculars) {
        exitBinocularMode();
        return;
      }
      // Point camera yaw/pitch toward where the Fin Cursor clicked!
      if (typeof sx === 'number' && typeof sy === 'number' && camera) {
        finSense.rayNdc.set((sx / window.innerWidth) * 2 - 1, -(sy / window.innerHeight) * 2 + 1);
        finSense.raycaster.setFromCamera(finSense.rayNdc, camera);
        const dir = finSense.raycaster.ray.direction;
        if (dir && dir.lengthSq() > 0.001) {
          camState.yaw = Math.atan2(-dir.x, -dir.z);
          camState.pitch = Math.max(-0.55, Math.min(0.65, Math.asin(Math.max(-0.95, Math.min(0.95, dir.y)))));
        }
      }
      camState.isRightDown = false;
      camState.isRightDragging = false;
      syncCaptureUI();
      enterBinocularMode();
    }

    function throwActiveFinItemTo(targetPos, opts = null) {
      const itemId = playerHeldItem ? playerHeldItem.id : null;
      if (!itemId || !player.inventory || !player.inventory.isThrowable || !player.inventory.isThrowable(itemId)) return false;
      if (!player.inventory.hasItem(itemId, 1)) {
        showFinSenseCard('🎒', 'Out of items!', 'None left in your satchel', '', '', 2200);
        return false;
      }

      player.inventory.removeItem(itemId, 1);
      if (!player.inventory.hasItem(itemId, 1)) {
        finSense.activeSlotIdx = -1;
        stowHeldItem(true);
      }
      updateMetersUI();
      renderFinBelt();

      const startPos = new THREE.Vector3(player.pos.x, player.pos.y + 1.15, player.pos.z);
      const endPos = targetPos.clone();
      const horizDist = Math.hypot(endPos.x - startPos.x, endPos.z - startPos.z);
      const duration = Math.max(0.28, Math.min(0.82, 0.24 + horizDist * 0.024));
      const arcHeight = Math.max(1.1, Math.min(5.2, horizDist * 0.22 + 0.9));

      const mesh = createThrownMesh(itemId);
      mesh.position.copy(startPos);
      const activeScene = getActiveScene() || scene;
      activeScene.add(mesh);

      if (CozyAudio.shonk) CozyAudio.shonk();
      thrownProjectiles.push({
        itemId,
        mesh,
        sceneRef: activeScene,
        startPos,
        endPos,
        elapsed: 0,
        duration,
        arcHeight,
        giftToPartner: !!(opts && opts.giftToPartner),
        giftToNpcName: (opts && opts.giftToNpcName) || null
      });
      return true;
    }

    function onThrownItemLanded(proj) {
      const landPos = proj.endPos;
      const def = (window.BlahajInventory && window.BlahajInventory.ITEMS && window.BlahajInventory.ITEMS[proj.itemId]) || { name: proj.itemId, icon: '📦' };

      // 1. DIRECTLY THROWN INTO CO-OP PARTNER'S INVENTORY!
      if (proj.giftToPartner) {
        CozyAudio.bistroChime();
        spawnFloatingBurst(landPos, 0x38bdf8, 18);
        window.BlahajNetwork?.send({
          type: 'item_gifted',
          itemType: proj.itemId,
          count: 1,
          fromName: player.name || 'Friend'
        });
        showFinSenseCard(def.icon || '🎁', `Tossed ${def.name} to Friend!`, 'Added +1 directly into their satchel!', '', '', 3500);
        addChatLog(`${def.icon || '🎁'} Tossed <strong>${def.name}</strong> directly into your friend’s inventory!`, 'coop');
        return;
      }

      // 2. DIRECTLY THROWN TO A FRIENDLY NPC!
      if (proj.giftToNpcName) {
        CozyAudio.shonk();
        spawnFloatingBurst(landPos, 0xf472b6, 16);
        showFinSenseCard(def.icon || '💙', `${proj.giftToNpcName} caught ${def.name}!`, '“Ooh, thank you!!” 🦈✨', '', '', 3500);
        return;
      }

      // 3. LANDED ON THE FLOOR / WORLD
      if (proj.itemId === 'breb') {
        CozyAudio.birbChirp();
        if ((currentZone === 'island' || currentZone === 'overworld') && worldApi && typeof worldApi.spawnBrebLoaf === 'function') {
          worldApi.spawnBrebLoaf(landPos);
          if (player.unlockedUpgrades.has('golden_breb')) {
            worldApi.spawnBrebLoaf(new THREE.Vector3(landPos.x + 1.2, landPos.y, landPos.z - 0.7));
            worldApi.spawnBrebLoaf(new THREE.Vector3(landPos.x - 1.2, landPos.y, landPos.z + 0.7));
          }
          let hungryNearby = 0;
          const maxRadius = player.unlockedUpgrades.has('golden_breb') ? 32 : 22;
          (worldApi.getBirbFlock ? worldApi.getBirbFlock() : []).forEach((b) => {
            if (b.mesh && b.mesh.position.distanceTo(landPos) < maxRadius && !(b.satiationTimer > 0)) {
              hungryNearby++;
            }
          });
          showFinSenseCard(
            '🥖',
            hungryNearby > 0 ? `Breb landed! (${hungryNearby} Birb${hungryNearby > 1 ? 's' : ''} hopping over!)` : 'Tossed Warm Breb!',
            hungryNearby > 0 ? '🐦 Watch for Birb Guano drops!' : 'Golden loaf landed on the ground',
            '',
            '',
            3200
          );
        }
        spawnFloatingBurst(landPos, 0xfbbf24, 12);
        window.BlahajNetwork?.send({
          type: 'emote',
          kind: 'breb',
          x: landPos.x,
          y: landPos.y,
          z: landPos.z,
          golden: player.unlockedUpgrades.has('golden_breb'),
          birbsFedCount: player.birbsFedCount
        });
      } else if (proj.itemId === 'party_favor') {
        CozyAudio.bistroChime();
        spawnFloatingBurst(landPos, 0xec4899, 18);
        spawnFloatingBurst(new THREE.Vector3(landPos.x, landPos.y + 0.6, landPos.z), 0xfbbf24, 14);
        showFinSenseCard('🎉', 'POP! Party Cracker!', 'Confetti & cheer burst!', '', '', 2800);
      } else {
        // Tea splash if enemy is right where it landed; otherwise spawn real collectible world pickup on the ground!
        if (proj.itemId === 'tea' && window.BlahajEnemies && typeof window.BlahajEnemies.getEnemies === 'function') {
          let splashedEnemy = null;
          (window.BlahajEnemies.getEnemies() || []).forEach((en) => {
            if (!en.defeated && en.mesh && en.mesh.position.distanceTo(landPos) < 4.5) {
              splashedEnemy = en;
              if (window.BlahajEnemies.boopEnemy) window.BlahajEnemies.boopEnemy(en, player.pos);
            }
          });
          if (splashedEnemy) {
            CozyAudio.bistroChime();
            spawnFloatingBurst(landPos, 0xf59e0b, 16);
            showFinSenseCard('🫖', `Steaming Tea Splash on ${splashedEnemy.name || 'Enemy'}!`, 'Warm bergamot mist!', '', '', 3000);
            return;
          }
        }
        if (CozyAudio.coinDrop) CozyAudio.coinDrop();
        spawnFloatingBurst(landPos, 0x38bdf8, 10);
        if ((currentZone === 'island' || currentZone === 'overworld') && worldPickups && typeof worldPickups.spawnPickup === 'function') {
          const dropId = `throw_${proj.itemId}_${Date.now()}_${Math.floor(Math.random() * 9999)}`;
          const dropPos = { x: landPos.x, y: landPos.y + 0.15, z: landPos.z };
          worldPickups.spawnPickup(proj.itemId, dropPos, dropId, 1);
          window.BlahajNetwork?.send({
            type: 'item_dropped',
            id: dropId,
            itemType: proj.itemId,
            pos: dropPos,
            count: 1
          });
        }
        showFinSenseCard(def.icon || '📦', `Tossed ${def.name}!`, 'Landed on the ground (click to pick back up)', '', '', 2600);
      }
    }

    function updateThrownProjectiles(dt) {
      for (let i = thrownProjectiles.length - 1; i >= 0; i--) {
        const p = thrownProjectiles[i];
        p.elapsed += dt;
        const u = Math.min(1, p.elapsed / p.duration);
        const x = p.startPos.x + (p.endPos.x - p.startPos.x) * u;
        const z = p.startPos.z + (p.endPos.z - p.startPos.z) * u;
        const baseY = p.startPos.y + (p.endPos.y - p.startPos.y) * u;
        const y = baseY + Math.sin(u * Math.PI) * p.arcHeight;
        p.mesh.position.set(x, y, z);
        p.mesh.rotation.x += dt * 7.5;
        p.mesh.rotation.z += dt * 5.2;
        if (u >= 1) {
          if (p.mesh.parent) p.mesh.parent.remove(p.mesh);
          if (p.mesh.geometry) p.mesh.geometry.dispose();
          if (p.mesh.material) p.mesh.material.dispose();
          thrownProjectiles.splice(i, 1);
          onThrownItemLanded(p);
        }
      }
    }
    window._blahajUpdateThrownProjectiles = updateThrownProjectiles;

    function triggerActiveFinKeyAction(isHoldThrow = false) {
      const itemId = playerHeldItem ? playerHeldItem.id : null;

      // Hold F with a throwable item -> lob forward along camera look direction!
      if (isHoldThrow && itemId && player.inventory && player.inventory.isThrowable(itemId)) {
        const dir = new THREE.Vector3();
        camera.getWorldDirection(dir);
        dir.y = 0;
        if (dir.lengthSq() < 0.001) dir.set(-Math.sin(camState.yaw), 0, -Math.cos(camState.yaw));
        dir.normalize();
        const tx = player.pos.x + dir.x * 13.5;
        const tz = player.pos.z + dir.z * 13.5;
        const ty = (worldApi && worldApi.getGroundAndStructureHeight && (currentZone === 'island' || currentZone === 'overworld'))
          ? worldApi.getGroundAndStructureHeight(tx, tz, player.pos.y + 3)
          : player.pos.y;
        throwActiveFinItemTo(new THREE.Vector3(tx, ty, tz));
        return;
      }

      // Tap F -> Instant Fin Action for whatever is currently in your right fin!
      if (!itemId) {
        if (!isAnyModalOpen() && window.BlahajMMO) {
          window.BlahajMMO.triggerSlot('f');
        } else {
          triggerBeepNose();
        }
        return;
      }
      if (itemId === 'breb') {
        triggerFeedBreb();
        renderFinBelt();
        return;
      }
      if (itemId === 'binoculars') {
        if (isUsingBinoculars) exitBinocularMode();
        else enterBinocularMode();
        return;
      }
      if (itemId === 'seam_detector') {
        if (window.BlahajSeam) {
          const rifts = window.BlahajSeam.getActiveRiftsForZone(currentZone) || [];
          const near = rifts.find((r) => !r.mended && r.pos && Math.hypot(r.pos.x - player.pos.x, r.pos.z - player.pos.z) <= 8.0);
          if (near) {
            window.BlahajSeam.mendRift(near.id);
            showFinSenseCard('✨', `Mended Seam #${near.num}!`, 'Aetheric Diviner Resonance', '', '', 3500);
            return;
          }
          const info = window.BlahajSeam.getNearestRift(player.pos, currentZone);
          if (CozyAudio.pocketWatchClick) CozyAudio.pocketWatchClick();
          showFinSenseCard('🧭', 'Seam Diviner Ping', info && info.nearest ? `${info.nearest.name} · ${Math.round(info.nearest.dist)}m` : 'All nearby rifts quiet', '', '', 3000);
        }
        return;
      }
      if (itemId === 'tea' || itemId === 'margarita' || itemId === 'tropical_cocktail' || itemId === 'celestial_boba') {
        if (player.inventory && player.inventory.hasItem(itemId, 1)) {
          player.inventory.removeItem(itemId, 1);
          const beforeStuff = Math.round(player.stuffing || 0);
          player.stuffing = Math.min(100, (player.stuffing || 0) + 30);
          const healed = Math.max(0, Math.round(player.stuffing) - beforeStuff);
          player.warmth = 100;
          player.teaBuffTimer = Math.max(player.teaBuffTimer || 0, 120);
          CozyAudio.bistroChime();
          spawnFloatingBurst(player.pos, 0x34d399, 16);
          showFinSenseCard(
            playerHeldItem.icon || '🍹',
            `Drank ${playerHeldItem.name}!`,
            healed > 0 ? `+${healed}% Stuffing Repaired · +100% Warmth` : 'Stuffing Full · +100% Warmth & Cozy Spirit',
            '',
            '',
            3200
          );
          if (!player.inventory.hasItem(itemId, 1)) {
            finSense.activeSlotIdx = -1;
            stowHeldItem(true);
          }
          updateMetersUI();
          renderFinBelt();
        }
        return;
      }
      if (itemId === 'party_favor') {
        if (player.inventory && player.inventory.hasItem('party_favor', 1)) {
          player.inventory.removeItem('party_favor', 1);
          CozyAudio.bistroChime();
          spawnFloatingBurst(player.pos, 0xec4899, 20);
          spawnFloatingBurst(new THREE.Vector3(player.pos.x, player.pos.y + 0.8, player.pos.z), 0xfbbf24, 16);
          showFinSenseCard('🎉', 'Popped Party Cracker!', 'Confetti shower!', '', '', 2800);
          if (!player.inventory.hasItem('party_favor', 1)) {
            finSense.activeSlotIdx = -1;
            stowHeldItem(true);
          }
          updateMetersUI();
          renderFinBelt();
        }
        return;
      }
      // Fallback for other held items (hex_key, star_lantern, etc.) -> Snoot Boop!
      triggerBeepNose();
    }

    const FIN_KIND_CLASSES = ['fin-kind-pickup', 'fin-kind-examine', 'fin-kind-npc', 'fin-kind-enemy', 'fin-kind-rift'];

    function setFinCursorKind(kind) {
      if (!finCursorEl) return;
      FIN_KIND_CLASSES.forEach((cls) => finCursorEl.classList.remove(cls));
      if (kind) finCursorEl.classList.add(`fin-kind-${kind}`);
    }

    function getFinStyle() {
      return (gameSettings && gameSettings.finModeStyle === 'persistent') ? 'persistent' : 'smart';
    }

    function getEffectiveFinTool(target) {
      if (getFinStyle() === 'persistent') return finSense.armedTool || 'interact';
      if (finSense.tempOverride) return finSense.tempOverride;
      if (!target) return 'interact';
      if (target.kind === 'pickup' || target.kind === 'rift') return 'interact';
      if (target.kind === 'landmark') return target.dist <= (target.reach || 8.0) ? 'interact' : 'examine';
      if (target.kind === 'npc') return target.dist <= 6.5 ? 'pet' : 'examine';
      if (target.kind === 'enemy') return 'interact';
      return 'examine';
    }

    function syncFinModeStripUI() {
      const style = getFinStyle();
      const activeTool = builderState.active ? 'build' : ((style === 'persistent') ? finSense.armedTool : finSense.tempOverride);
      document.querySelectorAll('#fin-mode-strip .fin-mode-btn').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.fintool === activeTool);
      });
      const showStrip = !isAnyModalOpen() && (
        (style === 'persistent' && camState.isPointerLocked) ||
        (camState.isPointerLocked && camState.isRightDown)
      );
      if (finModeStripEl) finModeStripEl.classList.toggle('hidden', !showStrip);
      const cardVisible = !!(finSenseCardEl && !finSenseCardEl.classList.contains('hidden'));
      if (finSenseBoxEl) finSenseBoxEl.classList.toggle('hidden', !showStrip && !cardVisible);
    }

    document.querySelectorAll('#fin-mode-strip .fin-mode-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const tool = btn.dataset.fintool || 'interact';
        if (tool === 'build') {
          toggleBuilderMode();
          syncFinModeStripUI();
          return;
        }
        if (builderState.active) {
          setBuilderMode(false);
        }
        if (getFinStyle() === 'persistent') {
          finSense.armedTool = tool;
        } else {
          finSense.tempOverride = (finSense.tempOverride === tool) ? null : tool;
        }
        syncFinModeStripUI();
      });
    });

    function showFinSenseCard(icon, name, sub, distText, bodyText, durationMs = 0) {
      if (!finSenseCardEl) return;
      if (finSenseIconEl) finSenseIconEl.textContent = icon || '🦈';
      if (finSenseNameEl) finSenseNameEl.textContent = name || '';
      if (finSenseSubEl) finSenseSubEl.textContent = sub || '';
      if (finSenseDistEl) finSenseDistEl.textContent = distText || '';
      if (finSenseBodyEl) {
        if (bodyText) {
          finSenseBodyEl.textContent = bodyText;
          finSenseBodyEl.classList.remove('hidden');
        } else {
          finSenseBodyEl.textContent = '';
          finSenseBodyEl.classList.add('hidden');
        }
      }
      finSenseCardEl.classList.remove('hidden');
      if (finSenseBoxEl) finSenseBoxEl.classList.remove('hidden');
      if (durationMs > 0) {
        finSense.examineUntil = performance.now() + durationMs;
      }
    }

    function hideFinSenseCard(force = false) {
      if (!force && performance.now() < finSense.examineUntil) return;
      if (finSenseCardEl) finSenseCardEl.classList.add('hidden');
      syncFinModeStripUI();
    }

    const ISLAND_FIN_LANDMARKS = [
      { id: 'spherical', name: 'Spherical Foods Bistro', icon: '🧆', x: -47.7, y: 2.2, z: 41.0, reach: 7.5, lore: 'Monsieur Betterave’s famous terracotta rotunda. Strictly spherical delicacies only — no flat food allowed!' },
      { id: 'laundromat', name: 'The Sacred Laundromat', icon: '🧺', x: -62.0, y: 2.6, z: -12.0, reach: 7.5, lore: 'Humming brass washers and warm eucalyptus steam. Step inside to spin away accumulated Mange and fluff up your stuffing.' },
      { id: 'volcano', name: 'Sacred Volcano Trial Gate', icon: '🌋', x: 0.0, y: 3.0, z: -56.0, reach: 9.0, lore: 'An ancient obsidian portal leading into the Molten Causeway, Ember Spiral, and Crater Overlook.' },
      { id: 'great_portal', name: 'The Great Cross-Ocean Portal', icon: '🌀', x: 0.0, y: 4.5, z: -32.0, reach: 10.0, lore: 'A humming shimmering gateway linking New Zealand and Los Angeles so sharks can visit across the Pacific. Guarded by Tatiana & Ivanka.' },
      { id: 'trunk', name: 'Community Vault Trunk', icon: '📦', x: 5.2, y: 1.5, z: 12.2, reach: 6.5, lore: 'A shared archipelago storage chest synced between friends (and linked directly to the UFO’s subspace beam!).' },
      { id: 'oven', name: 'Solomon’s Sourdough Oven', icon: '🥖', x: -11.5, y: 1.8, z: 14.5, reach: 6.5, lore: 'Warm brick hearth perpetually baking crusty golden loaves. Local birbs hover suspiciously nearby.' },
      { id: 'telescope', name: 'Starlight Observatory Telescope', icon: '🔭', x: 52.0, y: 9.5, z: -43.0, reach: 9.0, lore: 'Brass refractor perched atop Crust Cliffs. Peer through to spot drifting celestial cloud sharks.' }
    ];

    function pickWorldTargetUnderFin(sx, sy) {
      if (!camera) return null;
      const w = window.innerWidth;
      const h = window.innerHeight;
      const v = finSense.projVec;
      let best = null;
      let bestScore = Infinity;

      const consider = (wx, wy, wz, hitRadiusPx, meta) => {
        v.set(wx, wy, wz).project(camera);
        if (v.z < -1 || v.z > 1) return; // behind camera
        const px = (v.x * 0.5 + 0.5) * w;
        const py = (-v.y * 0.5 + 0.5) * h;
        const pxDist = Math.hypot(px - sx, py - sy);
        if (pxDist > hitRadiusPx) return;
        const worldDist = Math.hypot(wx - player.pos.x, wz - player.pos.z);
        if (worldDist > (meta.maxDist || 75)) return;
        const score = pxDist + worldDist * 0.15;
        if (score < bestScore) {
          bestScore = score;
          best = Object.assign({ dist: worldDist, wx, wy, wz }, meta);
        }
      };

      // 0. YOURSELF (Click your own shark to Drink Margarita / Tea / Boba, Snack on Breb, or Self-Groom!)
      if (player.mesh && player.mesh.visible && !isUsingBinoculars) {
        consider(player.pos.x, player.pos.y + 0.95, player.pos.z, 62, {
          kind: 'self',
          icon: '🦈',
          name: player.name || 'Yourself',
          lore: `Stuffing: ${Math.round(player.stuffing || 100)}% · Mange: ${Math.round(player.mange || 0)}%`,
          reach: 5.0,
          maxDist: 20,
          ref: player
        });
      }

      // 1. World Pickups (island/overworld)
      if ((currentZone === 'island' || currentZone === 'overworld') && worldPickups && typeof worldPickups.getPickups === 'function') {
        const list = worldPickups.getPickups();
        for (let i = 0; i < list.length; i++) {
          const p = list[i];
          if (!p || p.collected || !p.mesh || !p.mesh.visible) continue;
          const def = (window.BlahajInventory && window.BlahajInventory.ITEMS && window.BlahajInventory.ITEMS[p.type]) || { name: p.type, icon: '📦', desc: 'A handy archipelago item.' };
          consider(p.mesh.position.x, p.mesh.position.y + 0.35, p.mesh.position.z, 46, {
            kind: 'pickup',
            icon: def.icon || '📦',
            name: def.name || p.type,
            lore: def.desc || `A freshly spotted ${def.name || p.type} resting on the island.`,
            reach: 6.0,
            maxDist: 45,
            ref: p
          });
        }
      }

      // 2. Friendly NPCs & Co-op Partner
      if (currentZone === 'island' || currentZone === 'overworld') {
        for (let i = 0; i < worldActors.length; i++) {
          const act = worldActors[i];
          if (!act || !act.mesh || !act.mesh.visible) continue;
          const pos = act.mesh.position;
          consider(pos.x, pos.y + 1.1, pos.z, 54, {
            kind: 'npc',
            icon: '🦈',
            name: act.name || act.id || 'Island Friend',
            lore: act.bio || act.role || `${act.name || 'A friendly shark'} enjoying the coastal breeze on Blåhaj Island.`,
            reach: 6.5,
            maxDist: 65,
            ref: act
          });
        }
      }
      if (coopPartner && coopPartner.active && coopPartner.mesh && coopPartner.mesh.visible) {
        const cp = coopPartner.mesh.position;
        consider(cp.x, cp.y + 1.1, cp.z, 54, {
          kind: 'npc',
          icon: '💙',
          name: coopPartner.name || 'Co-op Shark Friend',
          lore: 'Your cross-ocean co-op companion! Give them a friendly fin-boop.',
          reach: 7.5,
          maxDist: 80,
          isCoopPartner: true,
          ref: coopPartner
        });
      }

      // 2.5 Plump Island Birbs (so you can point your fin at a Birb to Feed Breb, Throw Breb, or Pet!)
      if ((currentZone === 'island' || currentZone === 'overworld') && worldApi && typeof worldApi.getBirbFlock === 'function') {
        const flock = worldApi.getBirbFlock() || [];
        for (let i = 0; i < flock.length; i++) {
          const b = flock[i];
          if (!b || !b.mesh || !b.mesh.visible) continue;
          const bp = b.mesh.position;
          const snoozing = b.satiationTimer > 0;
          consider(bp.x, bp.y + 0.45, bp.z, 46, {
            kind: 'birb',
            icon: snoozing ? '💤' : '🐦',
            name: snoozing ? 'Snoozing Island Birb' : 'Plump Island Birb',
            lore: snoozing
              ? 'Happily stuffed with warm Breb and loafing peacefully in the grass.'
              : 'A round, chirpy meadow Birb eyeing your satchel for warm Breb.',
            reach: 4.5,
            maxDist: 55,
            ref: b
          });
        }
      }

      // 3. Enemies (island/overworld)
      if ((currentZone === 'island' || currentZone === 'overworld') && window.BlahajEnemies && typeof window.BlahajEnemies.getEnemies === 'function') {
        const enemies = window.BlahajEnemies.getEnemies() || [];
        for (let i = 0; i < enemies.length; i++) {
          const en = enemies[i];
          if (!en || en.defeated || !en.mesh || !en.mesh.visible) continue;
          const ep = en.mesh.position;
          const isSentinel = en.name === 'Tatiana' || en.name === 'Ivanka';
          consider(ep.x, ep.y + 1.0, ep.z, 52, {
            kind: 'enemy',
            icon: isSentinel ? '🎀' : '⚠️',
            name: en.name || (en.type === 'urchin' ? 'Spiky Sea Urchin' : 'Mean Shark'),
            lore: isSentinel
              ? `${en.name} — Pink Sentinel Shark guarding the Great Portal with fierce side-eye.`
              : (en.type === 'urchin' ? 'A prickly lavender sea urchin wobbling along the shore.' : 'A grumpy roaming shark looking for trouble.'),
            reach: 12.0,
            maxDist: 65,
            ref: en
          });
        }
      }

      // 4. Great Seam Rifts in current zone
      if (window.BlahajSeam && typeof window.BlahajSeam.getActiveRiftsForZone === 'function') {
        const rifts = window.BlahajSeam.getActiveRiftsForZone(currentZone) || [];
        for (let i = 0; i < rifts.length; i++) {
          const r = rifts[i];
          if (!r || !r.pos) continue;
          consider(r.pos.x, r.pos.y + 0.9, r.pos.z, 56, {
            kind: 'rift',
            icon: r.mended ? '✨' : '🪡',
            name: r.mended ? `Seam #${r.num} (Sealed)` : `Great Seam Rift #${r.num}`,
            lore: r.desc || `${r.name || 'A shimmering tear in the Great Seam.'}`,
            reach: 7.5,
            maxDist: 75,
            ref: r
          });
        }
      }

      // 5. Key Island Landmarks, Doors & UFO
      if (currentZone === 'island' || currentZone === 'overworld') {
        for (let i = 0; i < ISLAND_FIN_LANDMARKS.length; i++) {
          const lm = ISLAND_FIN_LANDMARKS[i];
          consider(lm.x, lm.y, lm.z, 58, {
            kind: 'landmark',
            icon: lm.icon,
            name: lm.name,
            lore: lm.lore,
            reach: lm.reach,
            maxDist: 90,
            ref: lm
          });
        }
        if (window.BlahajUFO && typeof window.BlahajUFO.getPosition === 'function') {
          const up = window.BlahajUFO.getPosition();
          if (up) {
            consider(up.x, up.y + 1.5, up.z, 64, {
              kind: 'landmark',
              icon: '🛸',
              name: 'Secret Archipelago Saucer',
              lore: 'A gleaming retro-futuristic flying saucer with a tractor beam linked to the Community Vault Trunk.',
              reach: 10.0,
              maxDist: 110,
              ref: { id: 'ufo' }
            });
          }
        }
      }

      return best;
    }

    function updateFinSenseHover(force = false) {
      if (!camState.isPointerLocked || !camState.isRightDown || isAnyModalOpen()) {
        finSense.hoveredTarget = null;
        setFinCursorKind(null);
        hideFinSenseCard(false);
        return;
      }
      const now = performance.now();
      if (!force && now - finSense.lastPickAt < 65) return;
      finSense.lastPickAt = now;

      const raw = document.elementFromPoint(finCursor.x, finCursor.y);
      const isOverUI = !!(raw && raw !== canvas && raw.closest('button, a, label, input, select, textarea, [role="button"], .mmo-slot, .mmo-action-btn, .party-card, .seam-mini-watch, .cs-subtab, .settings-tab, .btn-group-item, .cozy-switch, .fin-belt-slot, .fin-mode-btn, .modal-card, .settings-modal-card'));
      if (isOverUI) {
        finSense.hoveredTarget = null;
        setFinCursorKind(null);
        hideFinSenseCard(false);
        return;
      }

      if (builderState.active) {
        setFinCursorKind('pickup');
        const spec = (LORE.buildCatalog || []).find((x) => x.id === builderState.selectedId) || { icon: '🏗️', name: 'Blueprint', costLabel: 'Free' };
        const f = builderState.storyFloor || 0;
        const floorStr = f === 0 ? '1F (+0.0m)' : f === 1 ? '2F (+3.2m)' : '3F (+6.4m)';
        if (now >= finSense.examineUntil) {
          showFinSenseCard(
            spec.icon || '🏗️',
            `🔧 ${spec.name}`,
            `Left-Click World to Build · RMB+Scroll Cycles · [R] Rotate · [X] Demolish`,
            builderState.freeBuild ? '✨ FREE' : spec.costLabel,
            `${floorStr} · ${builderState.snapGrid ? 'Snap ON (4m)' : 'Free Placement'} · ${spec.desc || ''}`,
            0
          );
        }
        return;
      }

      const heldId = playerHeldItem ? playerHeldItem.id : null;
      const isHoldingThrowable = !!(heldId && player.inventory && player.inventory.isThrowable && player.inventory.isThrowable(heldId));
      const isHoldingDrink = (heldId === 'tea' || heldId === 'margarita' || heldId === 'tropical_cocktail' || heldId === 'celestial_boba');

      const target = pickWorldTargetUnderFin(finCursor.x, finCursor.y);
      finSense.hoveredTarget = target;
      if (!target) {
        if (heldId === 'binoculars') {
          setFinCursorKind('examine');
          if (now >= finSense.examineUntil) {
            showFinSenseCard('🔭', 'Brass Marine Binoculars', 'Left-Click to Raise Binoculars toward cursor', '', '', 0);
          }
          return;
        }
        if (isHoldingThrowable) {
          setFinCursorKind('pickup');
          if (now >= finSense.examineUntil) {
            const def = window.BlahajInventory?.ITEMS[heldId] || { icon: '📦', name: heldId };
            showFinSenseCard(
              def.icon || '📦',
              `Throw / Place ${def.name}`,
              isHoldingDrink ? '🎯 Click ground to toss · Click Yourself to drink!' : '🎯 Left-Click ground to place or toss (up to 24m)',
              '',
              '',
              0
            );
          }
          return;
        }
        setFinCursorKind(null);
        hideFinSenseCard(false);
        return;
      }

      const tool = getEffectiveFinTool(target);
      const kindMap = { self: isHoldingDrink ? 'pickup' : 'npc', pickup: 'pickup', npc: isHoldingThrowable ? 'pickup' : 'npc', birb: isHoldingThrowable ? 'pickup' : 'npc', enemy: 'enemy', rift: 'rift', landmark: target.dist <= (target.reach || 8) ? 'pickup' : 'examine' };
      setFinCursorKind(kindMap[target.kind] || 'examine');

      let actionHint = 'Left-Click to Interact';
      if (target.kind === 'self') {
        if (isHoldingDrink) actionHint = `🍹 Left-Click to Drink ${playerHeldItem.name} (+30% Stuffing)`;
        else if (heldId === 'breb') actionHint = '🥖 Left-Click to Snack on Breb (+15% Stuffing)';
        else if (heldId === 'party_favor') actionHint = '🎉 Left-Click to Pop Party Cracker!';
        else if (heldId === 'binoculars') actionHint = '🔭 Left-Click to Raise Binoculars';
        else actionHint = '✨ Left-Click to Groom Plush Coat';
      } else if (heldId === 'binoculars') {
        actionHint = '🔭 Left-Click to Aim & Raise Binoculars';
      } else if (tool === 'pet') {
        actionHint = '💙 Left-Click to Pet / Boop';
      } else if (target.kind === 'birb') {
        if (heldId === 'breb') {
          actionHint = target.dist <= 4.5 ? '🥖 Left-Click to Hand-Feed Breb' : '🥖 Left-Click to Throw Breb to Birb!';
        } else {
          actionHint = '💙 Left-Click to Pet Birb';
        }
      } else if (target.kind === 'pickup') {
        actionHint = target.dist <= target.reach ? '✋ Left-Click to Pick Up' : '✋ Move closer to Pick Up';
      } else if (target.kind === 'rift') {
        actionHint = target.ref.mended ? '✨ Sealed Rift' : (target.dist <= target.reach ? '🪡 Left-Click to Mend Rift' : '🪡 Move closer to Mend');
      } else if (target.kind === 'enemy') {
        actionHint = (heldId === 'tea' && target.dist > 4.5) ? '🫖 Left-Click to Throw Tea Splash!' : '🎯 Left-Click to Target';
      } else if (target.kind === 'landmark') {
        actionHint = target.dist <= target.reach ? '✋ Left-Click to Open / Use' : (isHoldingThrowable ? `🎯 Left-Click to Throw ${playerHeldItem.name}` : '🔍 Automatic FinSense');
      } else if (target.kind === 'npc') {
        if (isHoldingThrowable) {
          actionHint = target.dist <= 4.5
            ? `🎁 Left-Click to Hand ${playerHeldItem.name}`
            : `🎁 Left-Click to Throw ${playerHeldItem.name} to ${target.name}!`;
        } else {
          actionHint = target.dist <= target.reach ? '💙 Left-Click to Talk / Pet' : '🔍 Automatic FinSense';
        }
      }

      // Automatic Mouseover FinSense: immediately show both the action hint AND the subtle lore snippet!
      if (now >= finSense.examineUntil) {
        showFinSenseCard(target.icon, target.name, actionHint, `${Math.round(target.dist)}m`, target.lore || '', 0);
      }
    }

    function handleFinWorldClick(sx, sy) {
      if (builderState.active) {
        placeActiveBlueprint();
        return;
      }
      const heldId = playerHeldItem ? playerHeldItem.id : null;
      const isHoldingThrowable = !!(heldId && player.inventory && player.inventory.isThrowable && player.inventory.isThrowable(heldId));
      const isHoldingDrink = (heldId === 'tea' || heldId === 'margarita' || heldId === 'tropical_cocktail' || heldId === 'celestial_boba');
      const target = pickWorldTargetUnderFin(sx, sy);

      // 0. UNOBSTRUCTED CONTEXT INTERACTIONS FIRST (doors, pickups, rifts never blocked by held items!)
      if (target && target.kind === 'pickup' && target.dist <= target.reach) {
        collectWorldPickup(target.ref);
        showFinSenseCard(target.icon, `Picked up ${target.name}`, 'Added to Satchel', '', '', 2200);
        return;
      }
      if (target && target.kind === 'landmark' && target.dist <= target.reach) {
        triggerInteract();
        return;
      }
      if (target && target.kind === 'rift' && !target.ref.mended && target.dist <= target.reach && window.BlahajSeam && typeof window.BlahajSeam.mendRift === 'function') {
        window.BlahajSeam.mendRift(target.ref.id);
        showFinSenseCard('✨', `Mended ${target.name}!`, 'Great Seam Stabilized', '', 'Your fin stitched the shimmering tear shut!', 4000);
        return;
      }

      // 0.5 CLICKED YOURSELF -> Drink Margarita/Tea/Cocktail/Boba, Snack on Breb, Pop Cracker, or Self-Groom!
      if (target && target.kind === 'self') {
        if (isHoldingDrink || heldId === 'party_favor' || heldId === 'seam_detector') {
          triggerActiveFinKeyAction(false);
          return;
        }
        if (heldId === 'binoculars') {
          raiseBinocularsTowardScreen(sx, sy);
          return;
        }
        if (heldId === 'breb' && player.inventory && player.inventory.hasItem('breb', 1)) {
          player.inventory.removeItem('breb', 1);
          const beforeStuff = Math.round(player.stuffing || 0);
          player.stuffing = Math.min(100, (player.stuffing || 0) + 15);
          const healed = Math.max(0, Math.round(player.stuffing) - beforeStuff);
          CozyAudio.bistroChime();
          spawnFloatingBurst(player.pos, 0xfbbf24, 14);
          showFinSenseCard('🥖', 'Snacked on Warm Breb!', healed > 0 ? `+${healed}% Stuffing Repaired!` : 'Warm & toasty!', '', '', 2800);
          if (!player.inventory.hasItem('breb', 1)) {
            finSense.activeSlotIdx = -1;
            stowHeldItem(true);
          }
          updateMetersUI();
          renderFinBelt();
          return;
        }
        triggerGroomAvatar();
        return;
      }

      // 0.6 BINOCULARS ANYWHERE -> Raise Binoculars aimed directly toward where you clicked!
      if (heldId === 'binoculars') {
        raiseBinocularsTowardScreen(sx, sy);
        return;
      }

      // 1. CLICKED EMPTY GROUND / SKY / WORLD -> Place (if close) or Throw in a 3D arc (if far)!
      if (!target) {
        if (heldId === 'seam_detector') {
          triggerActiveFinKeyAction(false);
          return;
        }
        if (isHoldingThrowable) {
          const groundPt = computeGroundPointUnderScreen(sx, sy, 24.0);
          if (groundPt) {
            throwActiveFinItemTo(groundPt);
            return;
          }
        }
        if (window.BlahajMMO && !isAnyModalOpen()) {
          window.BlahajMMO.handleCanvasClick(sx, sy, camera, false, true);
        }
        return;
      }

      const tool = getEffectiveFinTool(target);

      // 1.4 THROW / HAND ITEM DIRECTLY TO A FRIEND (Co-op Partner -> straight into their inventory! NPC -> happy catch!)
      if (target.kind === 'npc' && isHoldingThrowable && tool !== 'pet') {
        const dest = new THREE.Vector3(target.wx, target.wy, target.wz);
        const d = Math.hypot(dest.x - player.pos.x, dest.z - player.pos.z);
        if (d <= 24.0) {
          throwActiveFinItemTo(dest, {
            giftToPartner: !!target.isCoopPartner,
            giftToNpcName: target.isCoopPartner ? null : target.name
          });
          return;
        }
      }

      // 1.5 BIRB + BREB (or any throwable): close = hand-feed right at fin; far = throw in a 3D arc!
      if (target.kind === 'birb') {
        if (heldId === 'breb' && tool !== 'pet') {
          if (target.dist <= 4.5) {
            triggerFeedBreb();
            renderFinBelt();
            showFinSenseCard('🥖', 'Hand-fed Warm Breb!', '🐦 The Birb chirps happily!', `${Math.round(target.dist)}m`, '', 2800);
          } else {
            const clamped = new THREE.Vector3(target.wx, target.wy, target.wz);
            const d = Math.hypot(clamped.x - player.pos.x, clamped.z - player.pos.z);
            if (d > 24.0) {
              clamped.x = player.pos.x + ((clamped.x - player.pos.x) / d) * 24.0;
              clamped.z = player.pos.z + ((clamped.z - player.pos.z) / d) * 24.0;
            }
            throwActiveFinItemTo(clamped);
          }
          return;
        }
        if (isHoldingThrowable && target.dist > 4.5 && tool !== 'pet') {
          throwActiveFinItemTo(new THREE.Vector3(target.wx, target.wy, target.wz));
          return;
        }
        // Bare fin or Pet mode on a Birb -> gentle pat!
        if (CozyAudio.birbChirp) CozyAudio.birbChirp();
        spawnFloatingBurst(new THREE.Vector3(target.wx, target.wy + 0.3, target.wz), 0xf472b6, 12);
        showFinSenseCard('🐦', `Patted ${target.name}!`, 'Happy chirps! 💙', `${Math.round(target.dist)}m`, target.lore, 3500);
        return;
      }

      // 1.6 THROWABLE AT FAR ENEMY (e.g. Steaming Tea Splash or Party Cracker!)
      if (target.kind === 'enemy' && isHoldingThrowable && target.dist > 4.5 && tool !== 'pet') {
        throwActiveFinItemTo(new THREE.Vector3(target.wx, target.wy, target.wz));
        return;
      }

      // 1.7 THROWABLE AT DISTANT LANDMARK/GROUND -> Throw in a 3D arc toward that spot!
      if (target.kind === 'landmark' && isHoldingThrowable && target.dist > target.reach && tool !== 'pet') {
        const groundPt = computeGroundPointUnderScreen(sx, sy, 24.0);
        if (groundPt) {
          throwActiveFinItemTo(groundPt);
          return;
        }
      }

      // 2. PET / PAT / BOOP
      if (tool === 'pet') {
        if (target.dist > 8.5) {
          showFinSenseCard(target.icon, target.name, '💙 Too far to boop!', `${Math.round(target.dist)}m`, 'Swim a little closer to give them a fin-pat.', 3000);
          return;
        }
        if (CozyAudio.shonk) CozyAudio.shonk();
        spawnFloatingBurst(new THREE.Vector3(target.wx, target.wy + 0.4, target.wz), 0xf472b6, 16);
        const reactions = [
          `${target.name} wiggles happily at your fin-boop! 💙`,
          `Boop! ${target.name} lets out a cozy plushie squeak. ✨`,
          `${target.name} appreciates the gentle pat on the snoot! 🦈`
        ];
        const msg = target.kind === 'enemy'
          ? `${target.name} looks momentarily bewildered by your audacious snoot-boop!`
          : reactions[Math.floor(Math.random() * reactions.length)];
        showFinSenseCard('💙', `Booped ${target.name}!`, 'Friendly Fin-Pat', `${Math.round(target.dist)}m`, msg, 4500);
        if (target.isCoopPartner && window.BlahajNetwork && typeof window.BlahajNetwork.send === 'function') {
          window.BlahajNetwork.send({ type: 'emote', kind: 'boop', zone: currentZone });
        }
        return;
      }

      // 3. INTERACT / PICK UP / TARGET
      if (target.kind === 'pickup') {
        if (target.dist <= target.reach) {
          collectWorldPickup(target.ref);
          showFinSenseCard(target.icon, `Picked up ${target.name}`, 'Added to Satchel', '', '', 2200);
        } else {
          showFinSenseCard(target.icon, target.name, '✋ A bit too far to reach', `${Math.round(target.dist)}m`, 'Swim closer to pick this up with your fin.', 2800);
        }
        return;
      }

      if (target.kind === 'rift') {
        if (target.ref.mended) {
          showFinSenseCard('✨', target.name, 'Already Sealed', `${Math.round(target.dist)}m`, target.lore, 4500);
        } else if (target.dist <= target.reach && window.BlahajSeam && typeof window.BlahajSeam.mendRift === 'function') {
          window.BlahajSeam.mendRift(target.ref.id);
          showFinSenseCard('✨', `Mended ${target.name}!`, 'Great Seam Stabilized', '', 'Your fin stitched the shimmering tear shut!', 4000);
        } else {
          showFinSenseCard('🪡', target.name, 'Move closer to Mend', `${Math.round(target.dist)}m`, target.lore, 4000);
        }
        return;
      }

      if (target.kind === 'enemy') {
        if (window.BlahajMMO) {
          window.BlahajMMO.handleCanvasClick(sx, sy, camera, false, true);
        }
        showFinSenseCard(target.icon, target.name, '🎯 Targeted', `${Math.round(target.dist)}m`, target.lore, 3500);
        return;
      }

      if (target.kind === 'npc') {
        if (target.dist <= target.reach && !target.isCoopPartner) {
          triggerInteract();
        } else {
          showFinSenseCard(target.icon, target.name, '🔍 FinSense', `${Math.round(target.dist)}m`, target.lore, 5000);
        }
        return;
      }

      if (target.kind === 'landmark') {
        if (target.dist <= target.reach) {
          triggerInteract();
        } else {
          showFinSenseCard(target.icon, target.name, '🔍 FinSense Examine', `${Math.round(target.dist)}m`, target.lore, 5500);
        }
      }
    }

    function isFinCursorActive() {
      if (isUsingBinoculars || isUsingTelescope) return false;
      if (window.BlahajUFO && window.BlahajUFO.isLocalAboard && window.BlahajUFO.isLocalAboard() && !isAnyModalOpen()) {
        return false;
      }
      return !!(camState.isPointerLocked && (camState.isRightDown || isAnyModalOpen()));
    }

    function clearFinHover() {
      if (finCursor.hoveredEl) {
        finCursor.hoveredEl.classList.remove('fin-hover');
        finCursor.hoveredEl = null;
      }
      if (finCursorEl) finCursorEl.classList.remove('fin-over-interactive');
    }

    function updateFinHover() {
      if (!isFinCursorActive()) {
        clearFinHover();
        return;
      }
      const raw = document.elementFromPoint(finCursor.x, finCursor.y);
      const target = raw && raw !== canvas
        ? (raw.closest('button, a, input, select, textarea, [role="button"], .mmo-slot, .fin-belt-slot, .mmo-action-btn, .party-card, .seam-mini-watch, .cs-subtab, .settings-tab, .btn-group-item, .cozy-switch') || raw)
        : null;
      if (target !== finCursor.hoveredEl) {
        if (finCursor.hoveredEl && (finCursor.hoveredEl.classList?.contains('mmo-slot') || finCursor.hoveredEl.classList?.contains('fin-belt-slot'))) {
          finCursor.hoveredEl.dispatchEvent(new MouseEvent('mouseleave'));
        }
        clearFinHover();
        if (target && target !== document.body && target !== document.documentElement) {
          finCursor.hoveredEl = target;
          const isInteractive = !!(target.matches && target.matches('button, a, input, select, textarea, [role="button"], .mmo-slot, .fin-belt-slot, .mmo-action-btn, .party-card, .seam-mini-watch, .cs-subtab, .settings-tab, .btn-group-item, .cozy-switch'));
          if (isInteractive) {
            target.classList.add('fin-hover');
            if (finCursorEl) finCursorEl.classList.add('fin-over-interactive');
            if (target.classList.contains('mmo-slot') || target.classList.contains('fin-belt-slot')) {
              target.dispatchEvent(new MouseEvent('mouseenter', { clientX: finCursor.x, clientY: finCursor.y }));
            }
          }
        }
      } else if (target && (target.classList?.contains('mmo-slot') || target.classList?.contains('fin-belt-slot'))) {
        moveInventoryHoverTooltip(finCursor.x, finCursor.y);
      }
    }

    function syncCaptureUI() {
      const finActive = isFinCursorActive();
      if (finCursorEl) {
        finCursorEl.classList.toggle('hidden', !finActive);
        if (finActive) {
          finCursorEl.style.transform = `translate3d(${finCursor.x.toFixed(1)}px, ${finCursor.y.toFixed(1)}px, 0)`;
        }
      }
      if (!finActive) {
        clearFinHover();
        setFinCursorKind(null);
      }
      if (playCapturePillEl) {
        const pauseOpen = !!(pauseOverlayEl && !pauseOverlayEl.classList.contains('hidden'));
        playCapturePillEl.classList.toggle('hidden', camState.isPointerLocked || pauseOpen || isAnyModalOpen());
      }
      if (!finSense.hoveredTarget && performance.now() >= finSense.examineUntil && finSenseCardEl && !finSenseCardEl.classList.contains('hidden')) {
        finSenseCardEl.classList.add('hidden');
      }
      syncFinModeStripUI();
    }
    window._blahajSyncCaptureUI = syncCaptureUI;
    window._blahajGetFinCursorPos = () => ({ x: finCursor.x, y: finCursor.y });

    function openPauseMenu() {
      if (localStoryPauseOpen) {
        closeStoryPauseModal();
      }
      if (pauseOverlayEl) pauseOverlayEl.classList.remove('hidden');
      const leaveVbBtn = document.getElementById('btn-pause-leave-volleyball');
      const resumeBtn = document.getElementById('btn-pause-resume');
      const inVbMatch = !!(window.BlahajVolleyball && (window.BlahajVolleyball.isMatchActive() || window.BlahajVolleyball.isSpectating()));
      if (leaveVbBtn) leaveVbBtn.classList.toggle('hidden', !inVbMatch);
      if (resumeBtn) resumeBtn.textContent = inVbMatch ? '▶ Resume Match' : '▶ Resume Playing';
      localPilotPauseMenuOpen = true;
      broadcastPilotInstancePause();
      syncCaptureUI();
    }

    function closePauseMenu() {
      if (pauseOverlayEl) pauseOverlayEl.classList.add('hidden');
      if (localPilotPauseMenuOpen) {
        localPilotPauseMenuOpen = false;
        broadcastPilotInstancePause();
      }
      syncCaptureUI();
    }

    function enterGameCapture() {
      CozyAudio.ensure();
      closePauseMenu();
      if (document.pointerLockElement !== canvas) {
        try {
          const p = canvas.requestPointerLock?.();
          if (p && typeof p.catch === 'function') p.catch(() => {});
        } catch (err) {}
      }
    }
    window._blahajEnterGameCapture = enterGameCapture;

    document.getElementById('btn-pause-resume')?.addEventListener('click', () => {
      enterGameCapture();
    });
    document.getElementById('btn-pause-leave-volleyball')?.addEventListener('click', () => {
      if (window.BlahajVolleyball) {
        if (window.BlahajVolleyball.isMatchActive()) window.BlahajVolleyball.endMatch();
        if (window.BlahajVolleyball.isSpectating()) window.BlahajVolleyball.endSpectating();
      }
      if (currentZone === 'volleyball') currentZone = 'island';
      enterGameCapture();
    });
    document.getElementById('btn-pause-settings')?.addEventListener('click', () => {
      closePauseMenu();
      openSettingsModal();
    });
    document.getElementById('btn-pause-help')?.addEventListener('click', () => {
      closePauseMenu();
      document.getElementById('help-controls-modal')?.classList.remove('hidden');
      syncCaptureUI();
    });
    document.getElementById('close-help-controls-modal')?.addEventListener('click', () => {
      document.getElementById('help-controls-modal')?.classList.add('hidden');
      openPauseMenu();
    });
    document.getElementById('btn-pause-map')?.addEventListener('click', () => {
      closePauseMenu();
      const mapBtn = document.getElementById('btn-mmo-map') || document.getElementById('btn-open-map');
      if (mapBtn) mapBtn.click();
    });
    document.getElementById('btn-pause-character')?.addEventListener('click', () => {
      closePauseMenu();
      openCharacterSheet();
    });
    document.getElementById('btn-pause-spellbook')?.addEventListener('click', () => {
      closePauseMenu();
      const sbBtn = document.getElementById('btn-mmo-spellbook');
      if (sbBtn) sbBtn.click();
    });

    function updateRangeWithFin(rangeEl, clientX) {
      if (!rangeEl) return;
      const rect = rangeEl.getBoundingClientRect();
      if (rect.width <= 0) return;
      const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const min = parseFloat(rangeEl.min || '0');
      const max = parseFloat(rangeEl.max || '100');
      const step = parseFloat(rangeEl.step || '1');
      let val = min + pct * (max - min);
      if (Number.isFinite(step) && step > 0) {
        val = Math.round(val / step) * step;
      }
      val = Math.max(min, Math.min(max, val));
      rangeEl.value = String(val);
      rangeEl.dispatchEvent(new Event('input', { bubbles: true }));
      rangeEl.dispatchEvent(new Event('change', { bubbles: true }));
    }

    document.addEventListener('pointerlockchange', () => {
      const wasLocked = camState.isPointerLocked;
      camState.isPointerLocked = document.pointerLockElement === canvas;
      lastClientX = null;
      lastClientY = null;
      prevPointerDx = 0;
      prevPointerDy = 0;
      camState.isLeftDown = false;
      camState.isLeftDragging = false;
      camState.isMiddleDown = false;
      camState.isRightDown = false;
      camState.isRightDragging = false;
      camState.isChordMoving = false;
      finCursor.draggingRange = null;

      if (camState.isPointerLocked) {
        camState.freeMouse = false;
        finCursor.x = Math.round(window.innerWidth * 0.5);
        finCursor.y = Math.round(window.innerHeight * 0.5);
        closePauseMenu();
      } else {
        camState.freeMouse = true;
        if (wasLocked) {
          // Pressing Esc (or losing pointer lock) frees the OS mouse and opens the Pause Menu!
          finSense.lastEscUnlockAt = performance.now();
          openPauseMenu();
        }
        const vhudCard = document.getElementById('volcano-hud-card');
        if (vhudCard && !vhudCard.classList.contains('hidden') && !vhudCard.classList.contains('fading-out')) {
          hideVolcanoHUDCard();
        }
      }
      syncCaptureUI();
    });
    syncCaptureUI();
    renderFinBelt();

    window.addEventListener('blur', clearAllMovementKeys);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) clearAllMovementKeys();
    });
    window.addEventListener('focus', clearAllMovementKeys);

    // Make interaction prompt clickable
    document.getElementById('interaction-prompt')?.addEventListener('click', () => {
      triggerInteract();
    });

    // Seam Mini-Watch & Detector Panel Event Listeners
    const seamWatchEl = document.getElementById('seam-mini-watch');
    if (seamWatchEl) {
      seamWatchEl.addEventListener('click', () => {
        CozyAudio.pocketWatchClick();
        if (window.BlahajSeam) {
          const s = window.BlahajSeam.getState();
          const rem = Math.floor(s.timer);
          const mm = Math.floor(rem / 60);
          const ss = rem % 60;
          if (s.state === 'incursion') {
            showToast('🚨 GREAT SEAM INCURSION ACTIVE!', `${s.invadersNeeded - s.invadersBanished} land invaders roaming! Boop them back to sea!`);
          } else {
            showToast('🪡 GREAT SEAM CLOCK', `${mm}m ${ss}s remaining in peaceful cycle (${s.mendedCount} / ${s.totalRifts} Rifts Mended).`);
          }
        }
      });
    }

    const btnDetStow = document.getElementById('btn-detector-stow');
    if (btnDetStow) {
      btnDetStow.addEventListener('click', () => {
        stowHeldItem();
      });
    }

    const btnDetAudio = document.getElementById('btn-detector-audio');
    if (btnDetAudio) {
      btnDetAudio.addEventListener('click', () => {
        detectorAudioMuted = !detectorAudioMuted;
        btnDetAudio.textContent = detectorAudioMuted ? '🔇' : '🔊';
        showToast('DIVINER AUDIO', detectorAudioMuted ? 'Sonar pings muted' : 'Sonar pings enabled');
      });
    }

    const dbgUnlockDiviner = document.getElementById('dbg-btn-unlock-diviner');
    if (dbgUnlockDiviner) {
      dbgUnlockDiviner.addEventListener('click', () => {
        claimAethericSeamDiviner();
      });
    }

    // Declutter button click listener & initial UI sync
    const declutterBtn = document.getElementById('btn-hud-declutter');
    if (declutterBtn) {
      declutterBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleMinimalHUD();
      });
    }
    updateMinimalHUDUI();

    // Global user-gesture audio unlock on any key, pointer, or touch
    const unlockCozyAudio = () => {
      if (window.CozyAudio) window.CozyAudio.ensure();
    };
    window.addEventListener('keydown', unlockCozyAudio, { passive: true });
    window.addEventListener('pointerdown', unlockCozyAudio, { passive: true });
    window.addEventListener('touchstart', unlockCozyAudio, { passive: true });

    // Global click-anywhere dismissal for Volcano HUD notice and toast banner
    window.addEventListener('pointerdown', (e) => {
      const vhudCard = document.getElementById('volcano-hud-card');
      if (vhudCard && !vhudCard.classList.contains('hidden') && !vhudCard.classList.contains('fading-out')) {
        hideVolcanoHUDCard();
      }
      const toastBanner = document.getElementById('toast-banner');
      if (toastBanner && !toastBanner.classList.contains('hidden') && !toastBanner.classList.contains('fading-out')) {
        dismissCurrentToast(false);
      }
    }, true);

    let mouseDownPos = { x: 0, y: 0 };

    let accumDragDist = 0;

    // Double-click anywhere on the 3D canvas is the ONLY canvas gesture that enters the game!
    canvas.addEventListener('dblclick', (e) => {
      if (e.button !== 0) return;
      if (!camState.isPointerLocked && !isAnyModalOpen()) {
        enterGameCapture();
      }
    });

    canvas.addEventListener('mousedown', (e) => {
      CozyAudio.ensure();
      mouseDownPos = { x: e.clientX, y: e.clientY };
      accumDragDist = 0;
      lastClientX = e.clientX;
      lastClientY = e.clientY;

      // When OUT OF GAME (OS cursor free), never hijack pointer or spin camera on single click!
      if (!camState.isPointerLocked) {
        return;
      }

      // Hold Middle-Click (button 1) inside the spaceship for mouse look / camera pan (auto-returns on release!)
      if (e.button === 1) {
        if (window.BlahajUFO && window.BlahajUFO.isLocalAboard && window.BlahajUFO.isLocalAboard()) {
          e.preventDefault();
          camState.isMiddleDown = true;
        }
        return;
      }

      if (e.button === 2) {
        camState.isRightDown = true;
        camState.isRightDragging = false;
        camState.rightClickUsedWheel = false;
        // Inside the spaceship: Right-Click+Wheel scrolls powers & single Right-Click fires #5 Sonic Shockwave (no Fin Cursor!)
        if (window.BlahajUFO && window.BlahajUFO.isLocalAboard && window.BlahajUFO.isLocalAboard() && !isAnyModalOpen()) {
          return;
        }
        // Hold Right-Click while IN GAME on foot/boat brings up the Shark Fin Cursor!
        syncCaptureUI();
        updateFinHover();
        return;
      }

      if (e.button === 0) {
        if (isFinCursorActive()) {
          // Click whatever UI button, input, slider, or 3D object is underneath the Shark Fin Cursor!
          if (finCursorEl) finCursorEl.classList.add('fin-clicking');
          const rawEl = document.elementFromPoint(finCursor.x, finCursor.y);
          const uiTarget = (rawEl && rawEl !== canvas)
            ? rawEl.closest('button, a, label, input, select, textarea, [role="button"], .mmo-slot, .mmo-action-btn, .party-card, .seam-mini-watch, .cs-subtab, .settings-tab, .btn-group-item, .cozy-switch, .fin-belt-slot, .fin-mode-btn, .modal-card, .settings-modal-card')
            : null;
          if (uiTarget) {
            const rangeEl = rawEl.closest('input[type="range"]');
            if (rangeEl) {
              finCursor.draggingRange = rangeEl;
              updateRangeWithFin(rangeEl, finCursor.x);
              return;
            }
            if (typeof uiTarget.focus === 'function' && uiTarget.matches?.('input, textarea, select')) {
              uiTarget.focus();
            }
            if (typeof uiTarget.click === 'function') {
              uiTarget.click();
            }
            setTimeout(syncCaptureUI, 0);
          } else if (!isAnyModalOpen()) {
            // Holding Binoculars: Hold Left-Click to raise & pan smoothly, release Left-Click to lower!
            if (playerHeldItem && playerHeldItem.id === 'binoculars' && !(window.BlahajUFO && window.BlahajUFO.isLocalAboard && window.BlahajUFO.isLocalAboard())) {
              finSense.binocHeldByMouse = true;
              raiseBinocularsTowardScreen(finCursor.x, finCursor.y);
              return;
            }
            // Clicked on the 3D world with the Shark Fin Cursor -> Direct Smart Fin Action / Throw!
            handleFinWorldClick(finCursor.x, finCursor.y);
          }
          return;
        }
        if (!isAnyModalOpen() && builderState.active) {
          placeActiveBlueprint();
          return;
        }
        if (!isAnyModalOpen() && playerHeldItem && playerHeldItem.id === 'binoculars' && !(window.BlahajUFO && window.BlahajUFO.isLocalAboard && window.BlahajUFO.isLocalAboard())) {
          finSense.binocHeldByMouse = true;
          if (!isUsingBinoculars) enterBinocularMode();
          return;
        }
        camState.isLeftDown = true;
        camState.isLeftDragging = true;
      }
      camState.isChordMoving = false;
    });

    canvas.addEventListener('mouseup', (e) => {
      if (finCursorEl) finCursorEl.classList.remove('fin-clicking');
      finCursor.draggingRange = null;

      if (!camState.isPointerLocked) {
        return;
      }

      const dragDist = Math.max(accumDragDist, Math.hypot(e.clientX - mouseDownPos.x, e.clientY - mouseDownPos.y));
      if (e.button === 0) {
        if (finSense.binocHeldByMouse) {
          finSense.binocHeldByMouse = false;
          if (isUsingBinoculars) exitBinocularMode();
          camState.isLeftDown = false;
          camState.isLeftDragging = false;
          syncCaptureUI();
          return;
        }
        const wasFinClick = isFinCursorActive();
        camState.isLeftDown = false;
        camState.isLeftDragging = false;
        if (!wasFinClick && dragDist < 6 && !isAnyModalOpen()) {
          const clickX = window.innerWidth * 0.5;
          const clickY = window.innerHeight * 0.5;
          if (window.BlahajUFO && window.BlahajUFO.isLocalAboard && window.BlahajUFO.isLocalAboard() && window.BlahajUFO.activateActiveModule) {
            window.BlahajUFO.activateActiveModule();
          } else if (builderState.active) {
            // Already handled on mousedown
          } else if (playerHeldItem && playerHeldItem.id) {
            // Plain Left-Click in Camera Mode uses whatever is in your shark's right fin!
            const heldId = playerHeldItem.id;
            const isThrowable = !!(player.inventory && player.inventory.isThrowable && player.inventory.isThrowable(heldId));
            if (heldId === 'breb' || heldId === 'beach_ball') {
              // Lob forward in a 3D arc along look direction!
              triggerActiveFinKeyAction(true);
            } else {
              // Drinks (margarita/tea/cocktail/boba), binoculars, seam_detector, party_favor -> instant use!
              triggerActiveFinKeyAction(false);
            }
          } else if (window.BlahajMMO) {
            window.BlahajMMO.handleCanvasClick(clickX, clickY, camera, false, true);
          }
        }
      } else if (e.button === 1) {
        camState.isMiddleDown = false;
      } else if (e.button === 2) {
        const wasRightDown = camState.isRightDown;
        const usedWheel = camState.rightClickUsedWheel;
        camState.isRightDown = false;
        camState.isRightDragging = false;
        camState.rightClickUsedWheel = false;
        if (wasRightDown && !usedWheel && !isAnyModalOpen() && window.BlahajUFO && window.BlahajUFO.isLocalAboard && window.BlahajUFO.isLocalAboard() && window.BlahajUFO.triggerSecondaryPower) {
          window.BlahajUFO.triggerSecondaryPower();
        }
        syncCaptureUI();
      }
      camState.isChordMoving = false;
    });

    window.addEventListener('mouseup', (e) => {
      if (finCursorEl) finCursorEl.classList.remove('fin-clicking');
      finCursor.draggingRange = null;
      if (!e || e.button === 0) {
        if (finSense.binocHeldByMouse) {
          finSense.binocHeldByMouse = false;
          if (isUsingBinoculars) exitBinocularMode();
          syncCaptureUI();
        }
        camState.isLeftDown = false;
        camState.isLeftDragging = false;
      }
      if (!e || e.button === 1) {
        camState.isMiddleDown = false;
      }
      if (!e || e.button === 2) {
        camState.isRightDown = false;
        camState.isRightDragging = false;
        if (getFinStyle() !== 'persistent') finSense.tempOverride = null;
        finSense.hoveredTarget = null;
        setFinCursorKind(null);
        hideFinSenseCard(false);
        syncCaptureUI();
      }
      camState.isChordMoving = false;
      prevPointerDx = 0;
      prevPointerDy = 0;
    });

    window.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

    window.addEventListener('mousemove', (e) => {
      // Single source of truth: ONLY capture mouse when Pointer Locked (IN GAME)!
      // When unlocked (OS mouse free), hovering the tab NEVER spins the camera!
      if (!camState.isPointerLocked) {
        return;
      }

      const rawDx = (typeof e.movementX === 'number' && Number.isFinite(e.movementX)) ? e.movementX : 0;
      const rawDy = (typeof e.movementY === 'number' && Number.isFinite(e.movementY)) ? e.movementY : 0;

      // REJECT SYNTHETIC OS RECENTER WARP GLITCHES:
      const isRecenterWarpX = Math.abs(rawDx) > 280 && (Math.abs(rawDx - prevPointerDx) > 220 || Math.sign(rawDx) !== Math.sign(prevPointerDx));
      const isRecenterWarpY = Math.abs(rawDy) > 280 && (Math.abs(rawDy - prevPointerDy) > 220 || Math.sign(rawDy) !== Math.sign(prevPointerDy));
      if (isRecenterWarpX || isRecenterWarpY) {
        return;
      }

      prevPointerDx = rawDx;
      prevPointerDy = rawDy;

      const dx = Math.max(-120, Math.min(120, rawDx));
      const dy = Math.max(-90, Math.min(90, rawDy));

      // Sub-mode 1: Shark Fin Cursor active (Holding Right-Click OR any in-game modal is open)
      if (isFinCursorActive()) {
        finCursor.x = Math.max(4, Math.min(window.innerWidth - 4, finCursor.x + dx));
        finCursor.y = Math.max(4, Math.min(window.innerHeight - 4, finCursor.y + dy));
        if (finCursorEl) {
          finCursorEl.classList.remove('hidden');
          finCursorEl.style.transform = `translate3d(${finCursor.x.toFixed(1)}px, ${finCursor.y.toFixed(1)}px, 0)`;
        }
        if (finCursor.draggingRange) {
          updateRangeWithFin(finCursor.draggingRange, finCursor.x);
        } else {
          updateFinHover();
          updateFinSenseHover(false);
        }
        return;
      }

      // Sub-mode 1.5: UFO Mouse Look (Inside Cockpit [V]: Hold Middle-Click or Right-Click to look around; Outside Space: Hold Middle-Click or Passenger look!)
      if (window.BlahajUFO && window.BlahajUFO.isLocalAboard && window.BlahajUFO.isLocalAboard()) {
        const inSpaceZone = (currentZone === 'space' || currentZone === 'cheese_moon' || currentZone === 'hyperspace');
        const isInsideCockpit = !!(window.BlahajUFO.getViewMode && window.BlahajUFO.getViewMode() === 'inside');
        const isPassenger = !!(window.BlahajUFO.getLocalRole && window.BlahajUFO.getLocalRole() === 'passenger');

        if (isInsideCockpit && window.BlahajUFO.panCockpit) {
          if (camState.isMiddleDown || camState.isRightDown || isPassenger || !inSpaceZone) {
            if (camState.isRightDown && (Math.abs(dx) > 1.5 || Math.abs(dy) > 1.5)) {
              camState.rightClickUsedWheel = true;
            }
            window.BlahajUFO.panCockpit(dx, dy);
            return;
          }
        } else if (inSpaceZone && window.BlahajUFO.panSpaceCamera) {
          if (camState.isMiddleDown || isPassenger) {
            window.BlahajUFO.panSpaceCamera(dx, dy);
            return;
          }
        }
      }

      // Sub-mode 1.8: Deep-Space Flight Simulator Steering (Mouse Pitch & Roll for Pilot)
      if ((currentZone === 'space' || currentZone === 'cheese_moon' || currentZone === 'hyperspace') && window.BlahajUFO && window.BlahajUFO.isLocalAboard && window.BlahajUFO.isLocalAboard() && window.BlahajUFO.applySpaceMouseLook) {
        window.BlahajUFO.applySpaceMouseLook(dx, dy);
        return;
      }

      // Sub-mode 2: Camera Orbit Mode (default IN GAME)
      const sens = (gameSettings && typeof gameSettings.mouseSens === 'number') ? gameSettings.mouseSens : 1.0;

      if (isUsingBinoculars) {
        const bInvertY = (gameSettings && gameSettings.binocularInvertY) ? -1 : 1;
        const bInvertX = (gameSettings && gameSettings.binocularInvertX) ? -1 : 1;
        camState.yaw -= dx * 0.0022 * sens * bInvertX;
        camState.pitch = Math.max(-0.65, Math.min(0.75, camState.pitch - dy * 0.0022 * sens * bInvertY));
      } else if (isUsingTelescope) {
        const bInvertY = (gameSettings && gameSettings.binocularInvertY) ? -1 : 1;
        const bInvertX = (gameSettings && gameSettings.binocularInvertX) ? -1 : 1;
        camState.yaw -= dx * 0.0020 * sens * bInvertX;
        camState.pitch = Math.max(0.08, Math.min(1.35, camState.pitch - dy * 0.0020 * sens * bInvertY));
      } else {
        const invert = (gameSettings && gameSettings.invertY) ? -1 : 1;
        camState.yaw -= dx * 0.0032 * sens;
        camState.pitch = Math.max(-0.25, Math.min(1.15, camState.pitch + dy * 0.0026 * sens * invert));
        if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
          camState.lastManualOrbitAt = Date.now();
        }
      }

      while (camState.yaw > Math.PI) camState.yaw -= Math.PI * 2;
      while (camState.yaw < -Math.PI) camState.yaw += Math.PI * 2;
      camState.hasFreeLookOffset = true;
    });

    window.addEventListener('wheel', (e) => {
      // While aboard the UFO and holding Right-Click (outside or cockpit view): Scroll Wheel cycles Saucer Appendages!
      if (camState.isPointerLocked && camState.isRightDown && !isAnyModalOpen() && window.BlahajUFO && window.BlahajUFO.isLocalAboard && window.BlahajUFO.isLocalAboard() && window.BlahajUFO.cycleModule) {
        e.preventDefault();
        camState.rightClickUsedWheel = true;
        window.BlahajUFO.cycleModule(e.deltaY > 0 ? 1 : -1);
        return;
      }
      if (camState.isPointerLocked && isFinCursorActive()) {
        // If holding Right-Click over the 3D world (no modal open): Scroll Wheel cycles 1-9 Fin Slots!
        if (camState.isRightDown && !isAnyModalOpen()) {
          e.preventDefault();
          cycleFinSlot(e.deltaY > 0 ? 1 : -1);
          updateFinSenseHover(true);
          return;
        }
        // Scroll any scrollable modal/panel under the Shark Fin Cursor
        let el = document.elementFromPoint(finCursor.x, finCursor.y);
        while (el && el !== document.body) {
          if (el.scrollHeight > el.clientHeight + 2) {
            el.scrollTop += e.deltaY;
            e.preventDefault();
            return;
          }
          el = el.parentElement;
        }
        return;
      }
      if (!camState.isPointerLocked || isAnyModalOpen()) return;
      if (builderState.active) {
        e.preventDefault();
        const step = builderState.snapGrid ? (Math.PI / 2) : (Math.PI / 4);
        builderState.rotOffset += (e.deltaY > 0 ? 1 : -1) * step;
        CozyAudio.shonk();
        return;
      }
      if ((currentZone === 'space' || currentZone === 'cheese_moon') && window.BlahajUFO && window.BlahajUFO.isLocalAboard && window.BlahajUFO.isLocalAboard() && window.BlahajUFO.adjustSpaceThrottle) {
        e.preventDefault();
        window.BlahajUFO.adjustSpaceThrottle(e.deltaY < 0 ? 0.08 : -0.08);
        return;
      }
      camState.distance = Math.max(4.0, Math.min(22.0, camState.distance + e.deltaY * 0.005));
    }, { passive: false });

    window.addEventListener('keydown', (e) => {
      // Pass 85B: Never hijack native browser refresh, fullscreen, devtools, or Ctrl/Cmd system shortcuts
      // (F5, Ctrl+F5, Ctrl+R, Ctrl+Shift+R, Cmd+R, Cmd+Shift+R, F11, F12, Ctrl+Shift+I, etc.)
      if (e.key === 'F5' || e.key === 'F11' || e.key === 'F12' || e.ctrlKey || e.metaKey) {
        return;
      }

      // Pass 86: Track Alt key for Free-Mouse toggle (prevent Windows browser menu focus, allow Alt+1..5 combos)
      if (e.key === 'Alt' || e.code === 'AltLeft' || e.code === 'AltRight') {
        e.preventDefault();
        if (!e.repeat) altComboUsed = false;
        return;
      }
      if (e.altKey) {
        altComboUsed = true;
      }

      if (document.activeElement && document.activeElement.tagName === 'INPUT') {
        clearAllMovementKeys();
        if (e.key === 'Escape') document.activeElement.blur();
        return;
      }

      // 1. Immediate Escape dismissal for any active on-screen messages (Volcano card and Toast banners)
      const activeVhudCard = document.getElementById('volcano-hud-card');
      const isVhudOpen = activeVhudCard && !activeVhudCard.classList.contains('hidden') && !activeVhudCard.classList.contains('fading-out');
      const activeToast = document.getElementById('toast-banner');
      const isToastOpen = activeToast && !activeToast.classList.contains('hidden') && !activeToast.classList.contains('fading-out');

      // Pass 97: While holding Right-Click (Shark Fin Cursor active), 1-9 selects Fin Inventory Slots directly (alongside RMB + Scroll)!
      if (camState.isPointerLocked && camState.isRightDown && !isAnyModalOpen() && /^Digit[1-9]$/.test(e.code)) {
        e.preventDefault();
        const slotIdx = parseInt(e.code.replace('Digit', ''), 10) - 1;
        selectFinSlot(slotIdx);
        updateFinSenseHover(true);
        return;
      }

      if (e.key === 'Escape') {
        if (isUsingTelescope) {
          exitTelescopeMode();
          e.preventDefault();
          return;
        }
        if (isUsingBinoculars) {
          exitBinocularMode();
          e.preventDefault();
          return;
        }
        if (isVhudOpen || isToastOpen) {
          if (isVhudOpen) hideVolcanoHUDCard();
          if (isToastOpen) dismissCurrentToast(true);
          e.preventDefault();
          e.stopPropagation();
          return;
        }
      }

      // Volcano HUD card also dismissable on Space, Enter, or E
      if (isVhudOpen && (e.key === 'Enter' || e.key === ' ' || e.key.toLowerCase() === 'e')) {
        hideVolcanoHUDCard();
      }

      // Pass 97: While holding Right-Click (Shark Fin Cursor active), 1-9 selects Fin Inventory Slots directly (alongside RMB + Scroll)!
      if (camState.isPointerLocked && camState.isRightDown && !isAnyModalOpen() && /^Digit[1-9]$/.test(e.code)) {
        e.preventDefault();
        const slotIdx = parseInt(e.code.replace('Digit', ''), 10) - 1;
        selectFinSlot(slotIdx);
        updateFinSenseHover(true);
        return;
      }

      if (e.key === 'Escape') {
        clearAllMovementKeys();
        if (pauseOverlayEl && !pauseOverlayEl.classList.contains('hidden')) {
          // Ignore the same Escape keystroke that just unlocked Pointer Lock!
          if (performance.now() - (finSense.lastEscUnlockAt || 0) < 120) {
            return;
          }
          closePauseMenu();
          return;
        }
        if (isUsingTelescope) {
          exitTelescopeMode();
          return;
        }
        if (window.BlahajVolleyball) {
          if (window.BlahajVolleyball.isMatchActive()) {
            window.BlahajVolleyball.endMatch();
            return;
          }
          if (window.BlahajVolleyball.isSpectating()) {
            window.BlahajVolleyball.toggleSpectatorHUD();
            return;
          }
        }
        if (currentZone === 'volleyball') {
          exitVolleyballCourt();
          return;
        }
        const setModal = document.getElementById('settings-modal');
        if (setModal && !setModal.classList.contains('hidden')) {
          closeSettingsModal();
          return;
        }
        const helpModal = document.getElementById('help-controls-modal');
        if (helpModal && !helpModal.classList.contains('hidden')) {
          helpModal.classList.add('hidden');
          openPauseMenu();
          return;
        }
        const csModal = document.getElementById('character-sheet-modal');
        if (csModal && !csModal.classList.contains('hidden')) {
          closeCharacterSheetModal();
          return;
        }
        const skyFlyout = document.getElementById('sky-controls-flyout');
        if (skyFlyout && !skyFlyout.classList.contains('hidden')) {
          skyFlyout.classList.add('hidden');
          return;
        }
        const vhudCard = document.getElementById('volcano-hud-card');
        if (vhudCard && !vhudCard.classList.contains('hidden')) {
          hideVolcanoHUDCard();
          return;
        }
        const dlgModal = document.getElementById('dialogue-modal');
        if (dlgModal && !dlgModal.classList.contains('hidden')) {
          dlgModal.classList.add('hidden');
          return;
        }
        const pModal = document.getElementById('portal-modal');
        if (pModal && !pModal.classList.contains('hidden')) {
          pModal.classList.add('hidden');
          return;
        }
        const gModal = document.getElementById('gallery-modal');
        if (gModal && !gModal.classList.contains('hidden')) {
          gModal.classList.add('hidden');
          return;
        }
        const mapModal = document.getElementById('modal-island-map');
        if (mapModal && (!mapModal.classList.contains('hidden') || mapModal.classList.contains('open'))) {
          closeIslandMap();
          return;
        }
        const trunkModal = document.getElementById('community-trunk-modal');
        if (trunkModal && !trunkModal.classList.contains('hidden')) {
          closeCommunityTrunkModal();
          return;
        }
        const raidModal = document.getElementById('modal-spawning-pits-raid');
        if (raidModal && !raidModal.classList.contains('hidden')) {
          raidModal.classList.add('hidden');
          return;
        }
        const detagModal = document.getElementById('modal-rite-of-detagging');
        if (detagModal && !detagModal.classList.contains('hidden')) {
          detagModal.classList.add('hidden');
          return;
        }
        const gConnectModal = document.getElementById('modal-google-connect');
        if (gConnectModal && !gConnectModal.classList.contains('hidden')) {
          gConnectModal.classList.add('hidden');
          return;
        }
        const uModal = document.getElementById('upgrades-modal');
        if (uModal && !uModal.classList.contains('hidden')) {
          uModal.classList.add('hidden');
          return;
        }
        const sbModal = document.getElementById('spellbook-modal');
        if (sbModal && !sbModal.classList.contains('hidden')) {
          if (window.BlahajMMO) window.BlahajMMO.closeSpellbookModal();
          else sbModal.classList.add('hidden');
          return;
        }
        const hsModal = document.getElementById('modal-homestead-commissions');
        if (hsModal && !hsModal.classList.contains('hidden')) {
          closeHomesteadCommissionsModal();
          return;
        }
        // MMO Standard: Escape clears active target first before opening Main/Settings menu!
        if (window.BlahajMMO && window.BlahajMMO.hasTarget && window.BlahajMMO.hasTarget()) {
          window.BlahajMMO.clearTarget();
          return;
        }
        toggleSettingsModal();
        return;
      }

      // MMO Autorun Toggle (NumLock or Backquote ` / ~)
      if ((e.key === 'NumLock' || e.code === 'NumLock' || e.code === 'Backquote') && !isAnyModalOpen()) {
        e.preventDefault();
        camState.isAutoRunning = !camState.isAutoRunning;
        if (window.BlahajMMO && window.BlahajMMO.syncAutorunUI) window.BlahajMMO.syncAutorunUI(camState.isAutoRunning);
        showToast(
          camState.isAutoRunning ? '🏃💨 AUTORUN ENGAGED [NumLock / ~]' : '🛑 AUTORUN STOPPED',
          camState.isAutoRunning ? 'Cruising forward hands-free! Steer with Right-Click or tap W/S to stop.' : 'Manual WASD control resumed.'
        );
        return;
      }

      // MMO Tab-Target Cycling (Tab = Next Target, Shift+Tab = Previous Target)
      if (e.key === 'Tab') {
        e.preventDefault();
        if (!isAnyModalOpen() && window.BlahajMMO) {
          window.BlahajMMO.cycleTarget(e.shiftKey ? -1 : 1);
        }
        return;
      }

      // MMO Enter Key: Focus Chat Box to type to other players
      if (e.key === 'Enter' && !isAnyModalOpen() && !isUsingTelescope && !isUsingBinoculars) {
        const chatInp = document.getElementById('chat-input');
        if (chatInp && document.activeElement !== chatInp) {
          e.preventDefault();
          chatInp.focus();
          return;
        }
      }

      const k = (e.key || '').toLowerCase();
      const mapped = mapCodeToKey(e.code);
      if (k) keys[k] = true;
      if (mapped) keys[mapped] = true;

      if (e.repeat) return;

      if (k === 'm') {
        e.preventDefault();
        if (currentZone === 'spherical_foods' && player.isSeatedInBooth) {
          openSphericalFoodsMenuModal();
          return;
        }
        toggleIslandMap();
        return;
      }

      // If in binocular mode, pressing I toggles vertical pitch inversion immediately!
      if (isUsingBinoculars) {
        if (k === 'i') {
          e.preventDefault();
          toggleBinocularInvertY();
          return;
        }
        if (k === 'escape' || k === 'f' || k === ' ' || k === 't' || k === 'e' || k === 'h' || k === 'enter') {
          e.preventDefault();
          exitBinocularMode();
          return;
        }
      }

      // If in observatory telescope mode
      if (isUsingTelescope) {
        if (k === 'i') {
          e.preventDefault();
          toggleBinocularInvertY();
          updateTelescopeControlButtons();
          return;
        }
        if (k === ' ' || k === 'enter') {
          e.preventDefault();
          waveToCloudSharks();
          return;
        }
        if (k === 'escape' || k === 'e' || k === 'f' || k === 't' || k === 'h') {
          e.preventDefault();
          exitTelescopeMode();
          return;
        }
      }

      // S.S. Shonk-Saucer Mk. VII Flight Controls (checked BEFORE Binoculars [T]!)
      if (!isAnyModalOpen() && window.BlahajUFO && window.BlahajUFO.isLocalAboard()) {
        if (k === 'v') { e.preventDefault(); window.BlahajUFO.toggleViewMode(); return; }
        if (k === 'g') { e.preventDefault(); window.BlahajUFO.toggleFloorCam(); return; }
        if (k === 'l') { e.preventDefault(); window.BlahajUFO.initiateAutoLand(); return; }
        if (k === 'r') {
          e.preventDefault();
          if (currentZone === 'hyperspace' && window.BlahajHyperspace && typeof window.BlahajHyperspace.reindexLoopToStart === 'function') {
            window.BlahajHyperspace.reindexLoopToStart();
          } else {
            window.BlahajUFO.resetToTracyIsle();
          }
          return;
        }
        if (k === 'h') { e.preventDefault(); window.BlahajUFO.toggleHatch(); return; }
        if (k === 't') { e.preventDefault(); window.BlahajUFO.toggleTractorBeam(); return; }
        if (k === 'k') { e.preventDefault(); window.BlahajUFO.openSharedVault(); return; }
        if (k === 'b') { e.preventDefault(); window.BlahajUFO.toggleDiscoMode(); return; }
        if (k === 'f') { e.preventDefault(); window.BlahajUFO.playJetsonsHorn(); return; }
        if (k === 'e') {
          e.preventDefault();
          if (window.BlahajUFO.canExitNow && window.BlahajUFO.canExitNow()) {
            window.BlahajUFO.exitUFO();
          }
          return;
        }
        if (k === 'q') { e.preventDefault(); return; }
        if (k === 'c' || e.code === 'Space') { e.preventDefault(); return; }
        if (/^Digit[1-5]$/.test(e.code) && window.BlahajUFO.selectModule) {
          e.preventDefault();
          window.BlahajUFO.selectModule(parseInt(e.code.replace('Digit', ''), 10) - 1);
          return;
        }
      }

      if (k === 't') {
        e.preventDefault();
        if (isUsingBinoculars) {
          exitBinocularMode();
        } else {
          if (!playerHeldItem || playerHeldItem.id !== 'binoculars') {
            equipHeldItem('binoculars', false);
          }
          enterBinocularMode();
        }
        return;
      }

      // Playable Shark Switcher: Mid-game hot-swapping is disabled; switching characters requires logging out to the Character Select screen!
      if (
        e.key === 'F1' || e.key === 'F2' || e.key === 'F3' || e.key === 'F4' || e.key === 'F6' ||
        (e.altKey && /^Digit[1-5]$/.test(e.code))
      ) {
        e.preventDefault();
        CozyAudio.shonk();
        showToast('🚪 LOG OUT TO SWITCH CHARACTER', 'To switch sharks, click [🚪 Switch Character (Log Out)] on the top-left HUD or inside the [Esc] Pause Menu!');
        return;
      }

      // Pass 97: Clean Number-Row Split — Plain 1-6 = Action Bar skills; 7-9 (or RMB + Scroll / RMB + 1-9) = Fin Inventory Slots!
      if (!e.altKey && !isAnyModalOpen() && /^Digit[1-9]$/.test(e.code)) {
        e.preventDefault();
        const numStr = e.code.replace('Digit', '');
        const slotIdx = parseInt(numStr, 10) - 1;
        if (slotIdx < 6 && window.BlahajMMO) {
          if (e.shiftKey) {
            window.BlahajMMO.triggerSlot(`shift+${numStr}`);
          } else if (e.ctrlKey && numStr === '1') {
            window.BlahajMMO.executeAbility('tea_infusion');
          } else {
            window.BlahajMMO.triggerSlot(numStr);
          }
        } else {
          selectFinSlot(slotIdx);
        }
        return;
      }

      // Quick Hotkey [U] on Main Island: Summon S.S. Shonk-Saucer ([Shift+U] Resets to Shonkbird Atoll!)
      if (!isAnyModalOpen() && k === 'u' && (currentZone === 'island' || currentZone === 'overworld') && window.BlahajUFO) {
        e.preventDefault();
        if (e.shiftKey) {
          window.BlahajUFO.resetToTracyIsle();
        } else {
          window.BlahajUFO.summonToPosition(player.pos);
        }
        return;
      }

      // C: Directly toggles Master Builder Fin Mode on/off! (Shift+C opens Character Info; K/I/B also open Character & Bags)
      if (k === 'c') {
        e.preventDefault();
        if (e.shiftKey) {
          toggleCharacterSheetModal(player.sharkId, 'stats');
        } else {
          toggleBuilderMode();
        }
        return;
      }
      if (builderState.active && k === 'tab' && !isAnyModalOpen()) {
        e.preventDefault();
        if (typeof window._blahajCycleBuilderCategory === 'function') {
          window._blahajCycleBuilderCategory();
        }
        return;
      }
      if (builderState.active && (k === '[' || k === ']')) {
        e.preventDefault();
        cycleBuilderBlueprint(k === ']' ? 1 : -1);
        return;
      }
      if (builderState.active && k === 'escape' && !isAnyModalOpen()) {
        e.preventDefault();
        setBuilderMode(false);
        return;
      }

      // B: Opens Bags / Satchel Inventory (or Shift+B tosses Breb)
      if (k === 'b') {
        e.preventDefault();
        if (e.shiftKey) {
          triggerFeedBreb();
        } else {
          toggleCharacterSheetModal(player.sharkId, 'inventory');
        }
        return;
      }

      if (k === 'v') {
        if (builderState.active) {
          toggleFreeBuild();
        } else {
          toggleMinimalHUD();
        }
      }
      if (k === 'r') {
        if (builderState.active) {
          builderState.rotOffset += builderState.snapGrid ? (Math.PI / 2) : (Math.PI / 4);
          CozyAudio.shonk();
        } else if (!isAnyModalOpen() && window.BlahajMMO) {
          e.preventDefault();
          window.BlahajMMO.triggerSlot('r');
        }
        return;
      }
      if (k === 'z' && builderState.active) {
        cycleBuilderStoryElevation();
      }
      if (k === 'l' && !isAnyModalOpen() && !(window.BlahajUFO && window.BlahajUFO.isLocalAboard && window.BlahajUFO.isLocalAboard())) {
        e.preventDefault();
        if (window.BlahajQuests && typeof window.BlahajQuests.toggleQuestLogModal === 'function') {
          window.BlahajQuests.toggleQuestLogModal();
        }
        return;
      }
      if (k === 'x') removeNearestBuiltStructure();

      if (player.isLounging) {
        if (k === ' ' || k === 'f') {
          e.preventDefault();
          sipPinaColada();
          return;
        }
        if (k === 'e' || k === 'escape') {
          e.preventDefault();
          standUpFromDeckChair();
          return;
        }
      }

      if (isUsingBinoculars) {
        if (k === 'f' || k === ' ' || k === 'escape' || k === 'e' || k === 'h') {
          e.preventDefault();
          exitBinocularMode();
          return;
        }
      }

      // E: Context Interact if near an interactable (or in boat/cart), otherwise Fin Deflection Posture!
      if (k === 'e') {
        if (!e.shiftKey && (nearestInteractable || player.inBoat || player.inCart || builderState.active)) {
          triggerInteract();
        } else if (!isAnyModalOpen() && window.BlahajMMO) {
          window.BlahajMMO.triggerSlot('e');
        } else {
          triggerInteract();
        }
      }
      if (k === 'f') {
        if (!e.repeat) {
          finSense.fKeyDownAt = performance.now();
          finSense.fKeyActive = true;
        }
      }
      if (k === 'q') {
        if (!isAnyModalOpen() && window.BlahajMMO) {
          window.BlahajMMO.triggerSlot('q');
        } else {
          triggerSignatureAbility();
        }
      }
      if (k === 'g') {
        if (builderState.active) {
          toggleSnapGrid();
        } else {
          triggerGroomAvatar();
        }
      }
      if (k === 'u') toggleUpgradesModal();
      // I or P: Opens MMO Spellbook / Fin Martial Arts Codex (Shift+P opens Co-op Portal)
      if (k === 'i' || k === 'p') {
        if (k === 'p' && player.isSeatedInBooth && currentZone === 'spherical_foods') {
          popBirthdayCracker(player.seatedBoothIndex);
          return;
        }
        if (k === 'p' && e.shiftKey) {
          togglePortalModal();
          return;
        }
        e.preventDefault();
        if (window.BlahajMMO) {
          window.BlahajMMO.toggleSpellbookModal();
        }
        return;
      }
      if (k === 'h') {
        e.preventDefault();
        if (player.inBoat && !isAnyModalOpen()) {
          const spec = window.BlahajHomestead ? window.BlahajHomestead.getBoatSpec() : { name: 'Regatta Vessel', code: 'SKIFF-ETT' };
          CozyAudio.playTone(392.0, 0.22, 'triangle', 0.16, 523.25);
          setTimeout(() => CozyAudio.playTone(587.33, 0.32, 'triangle', 0.18, 659.25), 140);
          spawnFloatingBurst(player.pos, 0x38bdf8, 18);
          showToast(`🚢💨 TOOT-TOOT! (${spec.code} WHISTLE)`, `Sounded the brass maritime whistle aboard ${spec.name}!`);
        } else {
          toggleHeldItem();
        }
      }
      if (k === 'j') {
        e.preventDefault();
        toggleHomesteadCommissionsModal();
      }
      if (k === 'k') toggleCharacterSheetModal(player.sharkId);
      if (k === 'o') toggleSettingsModal();

      if ((e.key === ' ' || e.code === 'Space') && !isAnyModalOpen()) {
        e.preventDefault();
        if (document.activeElement && document.activeElement.tagName === 'BUTTON') {
          document.activeElement.blur();
        }
        if (player.isSeatedInBooth) {
          standUpFromBooth();
          return;
        }
        if (window.BlahajSpawningPits && window.BlahajSpawningPits.isRidingTrolley && window.BlahajSpawningPits.isRidingTrolley()) {
          window.BlahajSpawningPits.toggleFlatbedTrolley(player.mesh, 0, false);
          CozyAudio.shonk();
          showToast('HOPPED OFF FLATBED TROLLEY 🛒', 'Stepped off the yellow IKEA warehouse trolley.');
          return;
        }
        if (player.inCart) {
          dismountLaundryCart();
          return;
        } else if (player.inBoat) {
          disembarkBoatAtCurrentLocation();
        } else if (player.isSwimming) {
          // Underwater swim paddle stroke & breach jump!
          const swimBoost = player.unlockedUpgrades.has('super_plush_hop') ? 1.35 : 1.0;
          player.velY = Math.max(player.velY + 4.5 * swimBoost, 6.2 * swimBoost);
          spawnUnderwaterBubbles(player.pos, 5);
          CozyAudio.waterSplash(0.12, 0.22);
          if (player.mesh && player.mesh.userData) {
            player.mesh.userData.flipTimer = 0.28;
          }
        } else if (player.isGrounded || player.coyoteTimer > 0) {
          const launderedSpring = (player.launderedBuffTimer > 0) ? 1.25 : 1.0;
          const jumpBoost = (player.unlockedUpgrades.has('super_plush_hop') ? 1.45 : 1.0) * launderedSpring;
          player.velY = 8.8 * jumpBoost;
          player.isGrounded = false;
          player.coyoteTimer = 0;
          player.canDoubleJump = true;
          player.doubleJumped = false;
          CozyAudio.shonk();
          if (player.mesh && player.mesh.userData) {
            player.mesh.userData.flipTimer = 0.35;
          }
          if (window.BlahajNetwork && typeof window.BlahajNetwork.send === 'function') {
            window.BlahajNetwork.send({ type: 'emote', kind: 'jump_flip', doubleJump: false, zone: currentZone });
          }
        } else if (player.canDoubleJump && !player.doubleJumped) {
          // Double jump: mid-air tail swish / plush flutter!
          player.doubleJumped = true;
          player.canDoubleJump = false;
          const launderedSpring = (player.launderedBuffTimer > 0) ? 1.25 : 1.0;
          const jumpBoost = (player.unlockedUpgrades.has('super_plush_hop') ? 1.45 : 1.0) * launderedSpring;
          player.velY = 8.4 * jumpBoost;
          CozyAudio.shonk();
          CozyAudio.bounceBoing();
          spawnFloatingBurst(player.pos, 0x56c2ff, 10);
          if (player.mesh && player.mesh.userData) {
            player.mesh.userData.flipTimer = 0.45;
          }
          if (window.BlahajNetwork && typeof window.BlahajNetwork.send === 'function') {
            window.BlahajNetwork.send({ type: 'emote', kind: 'jump_flip', doubleJump: true, zone: currentZone });
          }
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.key === 'Alt' || e.code === 'AltLeft' || e.code === 'AltRight') {
        e.preventDefault();
        altComboUsed = false;
        return;
      }
      const k = (e.key || '').toLowerCase();
      if (k === 'f' && finSense.fKeyActive) {
        finSense.fKeyActive = false;
        const heldMs = performance.now() - finSense.fKeyDownAt;
        if (!isAnyModalOpen()) {
          triggerActiveFinKeyAction(heldMs >= 320);
        }
      }
      const mapped = mapCodeToKey(e.code);
      if (k) keys[k] = false;
      if (mapped) keys[mapped] = false;
    });
  }

  function isAnyModalOpen() {
    const isVisible = (id) => {
      const el = document.getElementById(id);
      return !!(el && !el.classList.contains('hidden'));
    };
    const mapModal = document.getElementById('modal-island-map');
    const isMapOpen = !!(mapModal && (!mapModal.classList.contains('hidden') || mapModal.classList.contains('open')));
    return (
      isMapOpen ||
      isVisible('sky-controls-flyout') ||
      isVisible('character-sheet-modal') ||
      isVisible('community-trunk-modal') ||
      isVisible('settings-modal') ||
      isVisible('help-controls-modal') ||
      isVisible('modal-fast-travel') ||
      isVisible('modal-rite-of-detagging') ||
      isVisible('modal-google-connect') ||
      isVisible('modal-spawning-pits-raid') ||
      isVisible('modal-homestead-commissions') ||
      isVisible('spellbook-modal') ||
      isVisible('dialogue-modal') ||
      isVisible('quest-giver-modal') ||
      isVisible('quest-log-modal') ||
      isVisible('quest-detail-modal') ||
      isVisible('portal-modal') ||
      isVisible('gallery-modal') ||
      isVisible('upgrades-modal') ||
      isVisible('instance-loading')
    );
  }

  function releasePointerLock() {
    // Pass 89: Opening an in-game modal keeps Pointer Lock active and switches to the Shark Fin Cursor!
    // Only pressing Esc releases Pointer Lock out of the game.
    if (typeof window._blahajSyncCaptureUI === 'function') {
      window._blahajSyncCaptureUI();
    }
  }

  // ==========================================================================
  // MMO CHARACTER SHEET & ARCHIPELAGO DOSSIER MODAL
  // ==========================================================================
  function openCharacterSheet(sharkId = null, initialSubtab = null) {
    releasePointerLock();
    const m = document.getElementById('character-sheet-modal');
    if (!m) return;
    // Strict Per-Character Isolation: The Bag / Character Sheet only displays the character you are currently logged in as!
    selectedCSShark = player.sharkId || 'hermes';
    renderCharacterSheet(selectedCSShark);
    if (initialSubtab) {
      document.querySelectorAll('.cs-subtab').forEach((s) => s.classList.toggle('active', s.dataset.subtab === initialSubtab));
      ['inventory', 'stats', 'emotes'].forEach((name) => {
        const pane = document.getElementById(`pane-${name}`);
        if (pane) pane.classList.toggle('hidden', name !== initialSubtab);
      });
    }
    m.classList.remove('hidden');
    CozyAudio.shonk();
  }

  function closeCharacterSheetModal() {
    const m = document.getElementById('character-sheet-modal');
    if (m) m.classList.add('hidden');
    hideInventoryHoverTooltip();
  }

  // ==========================================================================
  // INSTANT FLOATING MMO INVENTORY MOUSEOVER TOOLTIP
  // ==========================================================================
  function ensureInventoryHoverTooltipEl() {
    let el = document.getElementById('mmo-item-hover-tooltip');
    if (!el) {
      el = document.createElement('div');
      el.id = 'mmo-item-hover-tooltip';
      el.className = 'mmo-item-hover-tooltip hidden';
      document.body.appendChild(el);
    }
    return el;
  }

  function moveInventoryHoverTooltip(clientX, clientY) {
    const el = document.getElementById('mmo-item-hover-tooltip');
    if (!el || el.classList.contains('hidden')) return;
    const pad = 16;
    const w = el.offsetWidth || 280;
    const h = el.offsetHeight || 150;
    let x = clientX + pad;
    let y = clientY + pad;
    if (x + w > window.innerWidth - 12) x = Math.max(12, clientX - w - pad);
    if (y + h > window.innerHeight - 12) y = Math.max(12, clientY - h - pad);
    el.style.left = `${Math.round(x)}px`;
    el.style.top = `${Math.round(y)}px`;
  }

  function showInventoryHoverTooltip(item, clientX, clientY, actionHint = '') {
    if (!item) {
      hideInventoryHoverTooltip();
      return;
    }
    const el = ensureInventoryHoverTooltipEl();
    const rarity = (item.rarity || 'cozy').toLowerCase();
    const qtyBadge = item.qty && item.qty > 1 ? ` <span class="tt-qty">×${item.qty}</span>` : '';
    const statsHtml = item.stats ? `<div class="tt-item-stats">✦ ${item.stats}</div>` : '';
    const hintHtml = actionHint ? `<div class="tt-item-hint">${actionHint}</div>` : '';
    el.innerHTML = `
      <div class="tt-header">
        <span class="tt-icon">${item.icon || '🎒'}</span>
        <div class="tt-title-col">
          <div class="tt-name">${item.name || 'Item'}${qtyBadge}</div>
          <div class="tt-type">${item.type || 'Archipelago Item'}</div>
        </div>
        <span class="tt-rarity rarity-${rarity}">${rarity.toUpperCase()}</span>
      </div>
      <div class="tt-desc">${item.desc || ''}</div>
      ${statsHtml}
      ${hintHtml}
    `;
    el.classList.remove('hidden');
    moveInventoryHoverTooltip(clientX, clientY);
  }

  function hideInventoryHoverTooltip() {
    const el = document.getElementById('mmo-item-hover-tooltip');
    if (el) el.classList.add('hidden');
  }

  function toggleCharacterSheetModal(sharkId = null, initialSubtab = null) {
    const m = document.getElementById('character-sheet-modal');
    if (!m) return;
    if (m.classList.contains('hidden')) {
      openCharacterSheet(player.sharkId, initialSubtab);
    } else {
      closeCharacterSheetModal();
    }
  }

  function renderCharacterSheet(sharkId) {
    // Always lock the Character Sheet & Bag view strictly to the active logged-in character!
    selectedCSShark = player.sharkId || 'hermes';
    const cfg = LORE.sharks[selectedCSShark] || LORE.sharks.hermes;

    // 1. Hide Multi-Shark Tabs inside the Bag modal (each character's bag is now strictly separate!)
    document.querySelectorAll('.cs-tab').forEach((tab) => {
      const isMe = tab.dataset.shark === selectedCSShark;
      tab.classList.toggle('active', isMe);
      tab.style.display = isMe ? '' : 'none';
    });

    // 2. Active Shark Badge & Switch Button
    const activeBadge = document.getElementById('cs-active-name');
    if (activeBadge) activeBadge.textContent = LORE.sharks[player.sharkId].name;

    const switchBtn = document.getElementById('cs-btn-switch-active');
    if (switchBtn) {
      switchBtn.textContent = `🚪 Log Out to Character Select (Switch Character)`;
      switchBtn.classList.remove('btn-secondary');
      switchBtn.classList.add('btn-accent');
      switchBtn.style.opacity = '1.0';
    }

    // 3. Avatar card details
    const portraitEl = document.getElementById('cs-portrait');
    if (portraitEl) portraitEl.src = cfg.portrait;
    const nameEl = document.getElementById('cs-shark-name');
    if (nameEl) nameEl.textContent = cfg.name;
    const titleEl = document.getElementById('cs-shark-title');
    if (titleEl) titleEl.textContent = cfg.title;
    const quoteEl = document.getElementById('cs-shark-quote');
    if (quoteEl) quoteEl.textContent = cfg.quote;

    // 4. Paperdoll Gear Slots
    const gear = PAPERDOLL_GEAR[selectedCSShark] || PAPERDOLL_GEAR.hermes;
    ['head', 'neck', 'relic', 'satchel', 'trinket'].forEach((slot) => {
      const g = gear[slot];
      const iconEl = document.getElementById(`pd-icon-${slot}`);
      const nameEl = document.getElementById(`pd-name-${slot}`);
      if (iconEl && g) iconEl.textContent = g.icon;
      if (nameEl && g) nameEl.textContent = g.name;
    });

    // 5. Individual Mange Slider & Value
    const mVal = getSharkMange(selectedCSShark);
    const csSlider = document.getElementById('cs-mange-slider');
    const csValText = document.getElementById('cs-mange-val-text');
    const pct = Math.round(mVal * 100);
    if (csSlider) csSlider.value = pct;
    if (csValText) csValText.textContent = formatMangeLabel(pct);

    // 6. Accessories Toggles
    const acc = getSharkAccessories(selectedCSShark);
    const chkRelic = document.getElementById('cs-chk-relic');
    const chkHeadgear = document.getElementById('cs-chk-headgear');
    if (chkRelic) chkRelic.checked = acc.showRelic !== false;
    if (chkHeadgear) chkHeadgear.checked = acc.showHeadgear !== false;

    // 7. Dynamic Satchel Inventory Grid (36 Slots: Slots 1-9 = Quick-Fin Belt, Slots 10-36 = Traveling Satchel)
    const totalSlots = (player.inventory && player.inventory.numSlots) ? player.inventory.numSlots : 36;
    const usedSlots = (player.inventory && typeof player.inventory.getUsedSlotCount === 'function')
      ? player.inventory.getUsedSlotCount()
      : 0;
    const bagCountEl = document.getElementById('mmo-bag-count');
    if (bagCountEl) {
      bagCountEl.textContent = `${usedSlots} / ${totalSlots} Slots Used`;
    }

    const gridEl = document.getElementById('mmo-inventory-grid');
    if (gridEl) {
      gridEl.innerHTML = '';
      for (let i = 0; i < totalSlots; i++) {
        const item = player.inventory ? player.inventory.getSlot(i) : null;
        const slotEl = document.createElement('div');
        slotEl.className = 'mmo-slot';
        if (i < 9) slotEl.classList.add('fin-eligible-slot');
        if (i === selectedInventorySlot) slotEl.classList.add('selected');
        const finKeyBadge = i < 9 ? `<span class="mmo-slot-fin-tag" title="Quick-Fin Belt Slot ${i + 1}">F${i + 1}</span>` : '';

        if (item) {
          slotEl.classList.add(`rarity-${item.rarity}`);
          slotEl.innerHTML = `
            ${finKeyBadge}
            <span class="mmo-slot-icon">${item.icon}</span>
            ${item.qty > 1 ? `<span class="mmo-slot-qty">${item.qty}</span>` : ''}
          `;
          slotEl.addEventListener('click', () => {
            selectedInventorySlot = i;
            renderCharacterSheet(selectedCSShark);
            updateItemInspector(item, i);
          });
          slotEl.addEventListener('mouseenter', (ev) => {
            const slotLabel = i < 9 ? `Quick-Fin Slot [${i + 1}] · Click to Inspect, Hold, or Use` : `Satchel Slot #${i + 1} · Click to Inspect or Use`;
            showInventoryHoverTooltip(item, ev.clientX, ev.clientY, slotLabel);
            updateItemInspector(item, i);
          });
          slotEl.addEventListener('mousemove', (ev) => {
            moveInventoryHoverTooltip(ev.clientX, ev.clientY);
          });
          slotEl.addEventListener('mouseleave', () => {
            hideInventoryHoverTooltip();
            const selItem = player.inventory ? player.inventory.getSlot(selectedInventorySlot) : null;
            updateItemInspector(selItem, selectedInventorySlot);
          });
        } else {
          slotEl.classList.add('empty');
          slotEl.innerHTML = `${finKeyBadge}<span class="mmo-slot-icon" style="opacity: 0.22;">🎒</span>`;
          slotEl.addEventListener('click', () => {
            selectedInventorySlot = i;
            renderCharacterSheet(selectedCSShark);
            updateItemInspector(null, i);
          });
          slotEl.addEventListener('mouseenter', (ev) => {
            const isFin = i < 9;
            showInventoryHoverTooltip(
              {
                icon: isFin ? '🦈' : '🎒',
                name: isFin ? `Quick-Fin Slot [${i + 1}] (Empty)` : `Satchel Slot #${i + 1} (Empty)`,
                rarity: 'cozy',
                type: isFin ? 'Active Fin Belt Slot (1–9)' : 'Traveling Satchel Compartment',
                desc: isFin
                  ? 'Holdable tools, drinks, and throwables automatically populate open Quick-Fin Slots 1–9.'
                  : 'Open compartment in this shark’s personal 36-slot traveling satchel.',
                stats: `Capacity: ${usedSlots} / ${totalSlots} Slots Used`
              },
              ev.clientX,
              ev.clientY,
              'Empty Slot'
            );
          });
          slotEl.addEventListener('mousemove', (ev) => {
            moveInventoryHoverTooltip(ev.clientX, ev.clientY);
          });
          slotEl.addEventListener('mouseleave', () => {
            hideInventoryHoverTooltip();
          });
        }
        gridEl.appendChild(slotEl);
      }
    }

    // Update item inspector for selected slot
    const curItem = player.inventory ? player.inventory.getSlot(selectedInventorySlot) : null;
    updateItemInspector(curItem, selectedInventorySlot);

    // 8. Currency Readouts
    const curBirbs = document.getElementById('cs-cur-birbs');
    const curCarrots = document.getElementById('cs-cur-carrots');
    const curTrials = document.getElementById('cs-cur-trials');
    const curSeam = document.getElementById('cs-cur-seam');
    if (curBirbs) curBirbs.textContent = player.birbsFedCount;
    if (curCarrots) curCarrots.textContent = player.carrotsKnockedCount;
    if (curTrials) curTrials.textContent = player.trialPoints;
    if (curSeam) curSeam.textContent = `${player.seamMendedCount || 0} / 6`;

    // 9. RPG Stats & Lore tab data
    const stuffingEl = document.getElementById('cs-stat-stuffing');
    if (stuffingEl) stuffingEl.textContent = `${Math.round(player.warmth)} / 100`;
    const teaEl = document.getElementById('cs-stat-tea');
    if (teaEl) teaEl.textContent = `${Math.round(player.teaComfort)}% · Steaming`;
    const dossierText = document.getElementById('cs-dossier-text');
    if (dossierText) {
      dossierText.textContent = `${cfg.role} — ${cfg.quote} ${cfg.greetings ? cfg.greetings[0] : ''}`;
    }
  }

  function updateItemInspector(item, slotIdx = 0) {
    const iconEl = document.getElementById('insp-icon');
    const nameEl = document.getElementById('insp-name');
    const rarityEl = document.getElementById('insp-rarity');
    const typeEl = document.getElementById('insp-type');
    const descEl = document.getElementById('insp-desc');
    const statsEl = document.getElementById('insp-stats');

    if (item) {
      if (iconEl) iconEl.textContent = item.icon;
      if (nameEl) nameEl.textContent = `${item.name} ${item.qty > 1 ? `(x${item.qty})` : ''}`;
      if (rarityEl) {
        rarityEl.textContent = item.rarity.toUpperCase();
        rarityEl.className = `inspector-rarity rarity-${item.rarity}`;
      }
      if (typeEl) typeEl.textContent = item.type;
      if (descEl) descEl.textContent = item.desc;
      if (statsEl) statsEl.textContent = item.stats;

      const actWrap = document.getElementById('insp-actions');
      const useBtn = document.getElementById('btn-inspect-use');
      const dropBtn = document.getElementById('btn-inspect-drop');

      if (actWrap) {
        actWrap.style.display = 'flex';
      }

      const holdBtn = document.getElementById('btn-inspect-hold');
      if (holdBtn) {
        if (item.canHold) {
          holdBtn.style.display = 'inline-flex';
          if (playerHeldItem && playerHeldItem.id === item.id && !playerHeldItem.isTimed) {
            holdBtn.textContent = 'Stow from Fin 📥';
            holdBtn.className = 'btn-secondary';
            holdBtn.onclick = () => {
              stowHeldItem();
              updateItemInspector(item, slotIdx);
            };
          } else {
            holdBtn.textContent = 'Hold in Fin 🦈';
            holdBtn.className = 'btn-primary';
            holdBtn.onclick = () => {
              equipHeldItem(item.id, false);
              updateItemInspector(item, slotIdx);
            };
          }
        } else {
          holdBtn.style.display = 'none';
        }
      }

      if (dropBtn) {
        dropBtn.style.display = 'inline-flex';
        dropBtn.onclick = () => {
          if (!item || !player.inventory) return;
          const removed = player.inventory.removeItem(item.id, 1);
          if (removed) {
            const forward = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(0, player.rotY, 0));
            const dropX = player.pos.x + forward.x * 1.5;
            const dropZ = player.pos.z + forward.z * 1.5;
            const dropGroundY = worldApi ? worldApi.getGroundAndStructureHeight(dropX, dropZ, player.pos.y) : player.pos.y;
            const dropPos = {
              x: dropX,
              y: Math.max(0.15, dropGroundY + 0.15),
              z: dropZ
            };
            const dropId = `dropped_${item.id}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
            if (worldPickups) {
              worldPickups.spawnPickup(item.id, dropPos, dropId, 1);
            }
            CozyAudio.coinDrop();
            showToast('DROPPED ON GROUND ⬇️', `Dropped 1x ${item.name}! Walk up to it and press [E] to pick it back up.`);
            addChatLog(`⬇️ Dropped 1x <strong>${item.name}</strong> onto the ground. Approach it and press <strong>[E]</strong> to pick it back up!`, 'cozy');
            renderCharacterSheet(selectedCSShark);
            updateMetersUI();

            window.BlahajNetwork.send({
              type: 'item_dropped',
              id: dropId,
              itemType: item.id,
              pos: dropPos,
              count: 1
            });
          }
        };
      }

      if (useBtn) {
        if (item.id === 'breb') {
          useBtn.style.display = 'inline-block';
          useBtn.textContent = 'Toss Warm Breb Loaf [B] 🥖';
          useBtn.onclick = () => {
            closeCharacterSheetModal();
            triggerFeedBreb();
          };
        } else if (item.id === 'margarita') {
          useBtn.style.display = 'inline-block';
          useBtn.textContent = 'Sip Frosted Margarita (+5m Lagoon Chill) 🍸';
          useBtn.onclick = () => {
            player.teaComfort = 100;
            updateMetersUI();
            savorHeldItem('margarita', 45.0);
            closeCharacterSheetModal();
          };
        } else if (item.id === 'tropical_cocktail') {
          useBtn.style.display = 'inline-block';
          useBtn.textContent = 'Sip Sunset Cocktail (+5m Warm Glow) 🍹';
          useBtn.onclick = () => {
            player.warmth = 100;
            updateMetersUI();
            savorHeldItem('tropical_cocktail', 45.0);
            closeCharacterSheetModal();
          };
        } else if (item.id === 'celestial_boba') {
          useBtn.style.display = 'inline-block';
          useBtn.textContent = 'Drink Celestial Boba (+5m Boba Bliss) 🧋';
          useBtn.onclick = () => {
            player.teaComfort = 100;
            player.warmth = 100;
            updateMetersUI();
            savorHeldItem('celestial_boba', 45.0);
            closeCharacterSheetModal();
          };
        } else if (item.id === 'tea') {
          useBtn.style.display = 'inline-block';
          useBtn.textContent = 'Sip Sacred Tea (+5m Steaming Spirit) 🍵';
          useBtn.onclick = () => {
            applySteamingSpiritBuff();
            savorHeldItem('tea', 45.0);
          };
        } else if (item.id === 'party_favor') {
          useBtn.style.display = 'inline-block';
          useBtn.textContent = 'Pop Birthday Party Cracker 🎉';
          useBtn.onclick = () => {
            popBirthdayCracker();
            if (player.inventory) {
              player.inventory.removeItem('party_favor', 1);
              renderCharacterSheet(selectedCSShark);
            }
          };
        } else if (item.id === 'flatpack_crate') {
          useBtn.style.display = 'inline-block';
          useBtn.textContent = 'Open SKÄRHAJ Snap-Builder [C] 📦🏗️';
          useBtn.onclick = () => {
            closeCharacterSheetModal();
            builderState.category = 'skarhaj_kits';
            builderState.selectedId = 'skarhaj_plinth';
            setBuilderMode(true);
          };
        } else if (item.id === 'kottbullar_feast') {
          useBtn.style.display = 'inline-block';
          useBtn.textContent = 'Feast on Midnight Köttbullar (+100% Comfort) 🧆';
          useBtn.onclick = () => {
            player.teaComfort = 100;
            player.warmth = 100;
            updateMetersUI();
            savorHeldItem('kottbullar_feast', 45.0);
            closeCharacterSheetModal();
          };
        } else if (item.id === 'firework_rocket') {
          useBtn.style.display = 'inline-block';
          useBtn.textContent = "Launch Helen's Birthday Rocket! 🚀";
          useBtn.onclick = () => {
            closeCharacterSheetModal();
            launchHelenBirthdayFireworks();
          };
        } else if (item.id === 'guano' || item.id === 'sulfur' || item.id === 'obsidian' || item.id === 'brimstone_core' || item.id === 'pure_obsidian' || item.id === 'star_powder') {
          useBtn.style.display = 'inline-block';
          useBtn.textContent = 'Pyrotechnic Material Info 🧪';
          useBtn.onclick = () => {
            showToast('ALCHEMICAL COMPONENT 🧪', 'Bring to Solomon (Alchemy), Hiram (Mortar), or Nimue (Fuse) to craft fireworks!');
          };
        } else {
          useBtn.style.display = 'none';
        }
      }
    } else {
      if (iconEl) iconEl.textContent = '🎒';
      if (nameEl) nameEl.textContent = `Empty Satchel Slot ${slotIdx + 1}`;
      if (rarityEl) {
        rarityEl.textContent = 'EMPTY';
        rarityEl.className = 'inspector-rarity';
      }
      if (typeEl) typeEl.textContent = 'Archipelago Satchel Storage';
      if (descEl) descEl.textContent = 'Ready to hold fresh birb guano, volcanic sulfur, warm breb loaves, and treasures found across the islands.';
      if (statsEl) statsEl.textContent = 'No modifiers active.';
      const actWrap = document.getElementById('insp-actions');
      if (actWrap) actWrap.style.display = 'none';
      const holdBtn = document.getElementById('btn-inspect-hold');
      if (holdBtn) holdBtn.style.display = 'none';
    }
  }

  // ==========================================================================
  // HIRAM THE MAGICAL BUILDER — CATEGORIZED TOOLBAR, HOLOGRAM & PLACEMENT
  // ==========================================================================
  function getAvailableCurrency(type) {
    if (type === 'flatpacks') {
      return (player.inventory && typeof player.inventory.getItemCount === 'function')
        ? player.inventory.getItemCount('flatpack_crate')
        : 0;
    }
    if (type === 'birbs') return Math.max(0, player.birbsFedCount - player.spentBirbs);
    if (type === 'carrots') return Math.max(0, player.carrotsKnockedCount - player.spentCarrots);
    if (type === 'trials') return Math.max(0, player.trialPoints);
    return 0;
  }

  function toggleSnapGrid() {
    builderState.snapGrid = !builderState.snapGrid;
    CozyAudio.shonk();
    renderBuilderToolbar();
    showToast(
      builderState.snapGrid ? 'MAGNETIC 4M SNAP-GRID: ON 🧲' : 'FREE-FORM PLACEMENT ACTIVE',
      builderState.snapGrid
        ? 'SKÄRHAJ modules automatically snap edge-to-edge onto the 4m architectural grid!'
        : 'Structures can be placed at any smooth angle or offset.'
    );
  }

  function cycleBuilderStoryElevation() {
    builderState.storyFloor = ((builderState.storyFloor || 0) + 1) % 3;
    CozyAudio.shonk();
    renderBuilderToolbar();
    const labels = ['1F Ground (+0.0m)', '2F Second Story (+3.2m)', '3F Roof Peak (+6.4m)'];
    showToast(
      `BUILDER ELEVATION: ${labels[builderState.storyFloor].toUpperCase()} 📐`,
      'Stack VÄGGHAJ walls and TAKHAJ gable roofs to build multi-story SKÄRHAJ cabins!'
    );
  }

  function setupBuilderUI() {
    const slotC = document.getElementById('slot-c');
    if (slotC) {
      slotC.addEventListener('click', toggleBuilderMode);
    }
    const fbBtn = document.getElementById('btn-toggle-freebuild');
    if (fbBtn) {
      fbBtn.addEventListener('click', toggleFreeBuild);
    }
    const snapBtn = document.getElementById('btn-toggle-snapgrid');
    if (snapBtn) {
      snapBtn.addEventListener('click', toggleSnapGrid);
    }
    const elevBtn = document.getElementById('btn-builder-elev');
    if (elevBtn) {
      elevBtn.addEventListener('click', cycleBuilderStoryElevation);
    }
    const raidBtn = document.getElementById('btn-builder-raid');
    if (raidBtn) {
      raidBtn.addEventListener('click', () => {
        setBuilderMode(false);
        openSpawningPitsRaidModal();
      });
    }
    const hideCatBtn = document.getElementById('btn-builder-hide-catalog');
    if (hideCatBtn) {
      hideCatBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        setBuilderCatalogOpen(false);
      });
    }
    const toggleCatBtn = document.getElementById('btn-builder-toggle-catalog');
    if (toggleCatBtn) {
      toggleCatBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        setBuilderCatalogOpen(!builderState.catalogOpen);
      });
    }
    const exitDrawerBtn = document.getElementById('btn-builder-exit-drawer');
    if (exitDrawerBtn) {
      exitDrawerBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        setBuilderMode(false);
      });
    }
    const exitBarBtn = document.getElementById('btn-builder-exit-bar');
    if (exitBarBtn) {
      exitBarBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        setBuilderMode(false);
      });
    }
    const prevBtn = document.getElementById('btn-builder-prev');
    if (prevBtn) {
      prevBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        cycleBuilderBlueprint(-1);
      });
    }
    const nextBtn = document.getElementById('btn-builder-next');
    if (nextBtn) {
      nextBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        cycleBuilderBlueprint(1);
      });
    }
    setupSpawningPitsRaidUI();
    setupHomesteadAndCommissionsUI();
    renderBuilderToolbar();
  }

  function toggleFreeBuild() {
    builderState.freeBuild = !builderState.freeBuild;
    CozyAudio.portalChime();
    renderBuilderToolbar();
    showToast(
      builderState.freeBuild ? 'SACRED ALLEN KEY FREE-BUILD: ON ✨' : 'COZY CURRENCY & FLAT-PACK MODE ACTIVE',
      builderState.freeBuild
        ? 'All SKÄRHAJ & Hiram blueprints now cost 0 currency!'
        : 'Building uses SKÄRHAJ Flat-Pack Kits, Birb Crumbs, Carrot Sparks, and Trial Points!'
    );
  }

  function toggleBuilderMode() {
    if (!canUseBuilderMode(player.sharkId)) {
      // Must switch to Hiram [3] to become Master Builder!
      CozyAudio.shonk();
      openDialogueModal({
        speaker: 'Hiram — The Builder',
        role: 'MASTER OF DEEP STONE & THE SACRED ALLEN KEY',
        portrait: 'assets/gallery/Hiram.png',
        text: '“Only Hiram the Builder knows the sacred torque of the Allen Key and Ingvar’s Measuring Tape! Switch to Hiram [3] to enter Master Builder Mode and conjure bridges, cabins, pocket portals, and carrot contraptions!”',
        actions: [
          {
            label: 'Switch to Hiram [3] & Open Master Builder! 🔧🏗️',
            className: 'btn-primary',
            onClick: () => {
              closeDialogueModal();
              spawnPlayerShark('hiram');
              setBuilderMode(true);
            }
          }
        ]
      });
      return;
    }
    setBuilderMode(!builderState.active);
  }

  function updateBuilderActiveBar() {
    const bar = document.getElementById('builder-active-bar');
    if (!bar) return;
    bar.classList.toggle('hidden', !builderState.active);
    if (!builderState.active) return;
    const spec = (LORE.buildCatalog || []).find((x) => x.id === builderState.selectedId);
    const iconEl = document.getElementById('builder-active-icon');
    const nameEl = document.getElementById('builder-active-name');
    const metaEl = document.getElementById('builder-active-meta');
    const toggleBtn = document.getElementById('btn-builder-toggle-catalog');
    if (iconEl) iconEl.textContent = spec ? spec.icon : '🏗️';
    if (nameEl) nameEl.textContent = spec ? spec.name : 'Blueprint';
    if (metaEl) {
      const f = builderState.storyFloor || 0;
      const floorStr = f === 0 ? '1F' : f === 1 ? '2F' : '3F';
      const snapStr = builderState.snapGrid ? 'Snap ON' : 'Free';
      metaEl.textContent = `${floorStr} · ${snapStr}`;
    }
    if (toggleBtn) {
      toggleBtn.classList.toggle('active', !!builderState.catalogOpen);
    }
  }

  function setBuilderCatalogOpen(open) {
    if (!builderState.active) open = false;
    builderState.catalogOpen = !!open;
    const panel = document.getElementById('builder-panel');
    if (panel) panel.classList.toggle('hidden', !builderState.catalogOpen);
    updateBuilderActiveBar();
  }

  function cycleBuilderBlueprint(dir) {
    const items = (LORE.buildCatalog || []).filter((x) => x.category === builderState.category);
    if (!items.length) return;
    const idx = items.findIndex((x) => x.id === builderState.selectedId);
    const nextIdx = ((idx === -1 ? 0 : idx) + dir + items.length) % items.length;
    builderState.selectedId = items[nextIdx].id;
    CozyAudio.shonk();
    refreshPreviewMesh();
    renderBuilderToolbar();
  }

  function setBuilderMode(active) {
    if (active && !canUseBuilderMode(player.sharkId)) return;
    builderState.active = active;
    builderState.catalogOpen = false;
    const slotC = document.getElementById('slot-c');
    if (slotC) slotC.classList.toggle('active', active);

    if (active) {
      CozyAudio.allenBuild();
      refreshPreviewMesh();
      renderBuilderToolbar();
      if (typeof window._blahajRenderFinBelt === 'function') window._blahajRenderFinBelt();
      if (typeof window._blahajSyncCaptureUI === 'function') window._blahajSyncCaptureUI();
      showToast(
        '🔧 MASTER BUILDER FIN ACTIVE [C]',
        'Your 1–9 Fin Belt now holds Blueprints! Hold Right-Click to aim & Left-Click to Build · RMB+Scroll cycles Blueprints · [R] Rotate · [C] Exit.'
      );
    } else {
      if (typeof window._blahajRenderFinBelt === 'function') window._blahajRenderFinBelt();
      if (typeof window._blahajSyncCaptureUI === 'function') window._blahajSyncCaptureUI();
      if (builderState.previewMesh) {
        scene.remove(builderState.previewMesh);
        builderState.previewMesh = null;
      }
    }
  }

  function refreshPreviewMesh() {
    if (builderState.previewMesh) {
      scene.remove(builderState.previewMesh);
      builderState.previewMesh = null;
    }
    if (!builderState.active || !worldApi) return;
    builderState.previewMesh = worldApi.createStructureMesh(builderState.selectedId, true);
    scene.add(builderState.previewMesh);
  }

  function renderBuilderToolbar() {
    const catContainer = document.getElementById('builder-cat-tabs');
    const itemsContainer = document.getElementById('builder-items-row');
    const fbBtn = document.getElementById('btn-toggle-freebuild');
    const fbTxt = document.getElementById('freebuild-state-txt');
    if (!catContainer || !itemsContainer) return;

    if (fbBtn && fbTxt) {
      fbBtn.classList.toggle('active', builderState.freeBuild);
      fbTxt.textContent = builderState.freeBuild ? 'ON' : 'OFF';
    }
    const snapBtn = document.getElementById('btn-toggle-snapgrid');
    const snapTxt = document.getElementById('snapgrid-state-txt');
    if (snapBtn && snapTxt) {
      snapBtn.classList.toggle('active', !!builderState.snapGrid);
      snapTxt.textContent = builderState.snapGrid ? 'ON (4m)' : 'OFF';
    }
    const elevBtn = document.getElementById('btn-builder-elev');
    const elevTxt = document.getElementById('builder-elev-txt');
    if (elevBtn && elevTxt) {
      const f = builderState.storyFloor || 0;
      elevBtn.classList.toggle('active', f > 0);
      elevTxt.textContent = f === 0 ? '1F (+0.0m)' : f === 1 ? '2F (+3.2m)' : '3F (+6.4m)';
    }

    const fpEl = document.getElementById('b-cur-flatpacks');
    const bEl = document.getElementById('b-cur-birbs');
    const cEl = document.getElementById('b-cur-carrots');
    const tEl = document.getElementById('b-cur-trials');
    if (fpEl) fpEl.textContent = getAvailableCurrency('flatpacks');
    if (bEl) bEl.textContent = getAvailableCurrency('birbs');
    if (cEl) cEl.textContent = getAvailableCurrency('carrots');
    if (tEl) tEl.textContent = getAvailableCurrency('trials');

    catContainer.innerHTML = '';
    (LORE.buildCategories || []).forEach((cat) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `builder-cat-btn ${builderState.category === cat.id ? 'active' : ''}`;
      btn.textContent = cat.name;
      btn.title = cat.sub;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        builderState.category = cat.id;
        const firstInCat = (LORE.buildCatalog || []).find((x) => x.category === cat.id);
        if (firstInCat) {
          builderState.selectedId = firstInCat.id;
          refreshPreviewMesh();
        }
        CozyAudio.shonk();
        renderBuilderToolbar();
      });
      catContainer.appendChild(btn);
    });

    itemsContainer.innerHTML = '';
    (LORE.buildCatalog || [])
      .filter((item) => item.category === builderState.category)
      .forEach((item) => {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = `builder-item-card ${builderState.selectedId === item.id ? 'active' : ''}`;
        const isFree = builderState.freeBuild;
        card.innerHTML = `
          <div>
            <div class="builder-item-top">
              <span class="builder-item-icon">${item.icon}</span>
              <span class="builder-item-cost ${isFree ? 'free' : ''}">${isFree ? '✨ FREE' : item.costLabel}</span>
            </div>
            <div class="builder-item-name">${item.name}</div>
          </div>
          <div class="builder-item-desc">${item.desc}</div>
        `;
        card.addEventListener('click', (e) => {
          e.stopPropagation();
          builderState.selectedId = item.id;
          CozyAudio.shonk();
          refreshPreviewMesh();
          renderBuilderToolbar();
          setBuilderCatalogOpen(false);
        });
        itemsContainer.appendChild(card);
      });
    updateBuilderActiveBar();
  }

  function updateBuilderPreview(elapsed) {
    if (!builderState.active || !canUseBuilderMode(player.sharkId)) {
      if (builderState.previewMesh) {
        scene.remove(builderState.previewMesh);
        builderState.previewMesh = null;
      }
      return;
    }
    if (!builderState.previewMesh) {
      refreshPreviewMesh();
    }
    if (!builderState.previewMesh) return;

    // Place hologram at Shark Fin Cursor ground point (when holding Right-Click) or in front of shark!
    const forwardDist =
      builderState.selectedId === 'lagoon_bridge' || builderState.selectedId === 'sky_stairs' ? 8.2 : 5.8;
    let tx = player.pos.x + Math.sin(player.rotY) * forwardDist;
    let tz = player.pos.z + Math.cos(player.rotY) * forwardDist;
    if (camState.isPointerLocked && camState.isRightDown && !isAnyModalOpen() && typeof window._blahajGetFinGroundPoint === 'function' && typeof window._blahajGetFinCursorPos === 'function') {
      const fc = window._blahajGetFinCursorPos();
      const finPt = window._blahajGetFinGroundPoint(fc.x, fc.y, 18.0);
      if (finPt) {
        tx = finPt.x;
        tz = finPt.z;
      }
    }
    let rotY = player.rotY + builderState.rotOffset;
    let snappedSocket = false;
    let socketBaseY = null;

    if (builderState.snapGrid && worldApi && typeof worldApi.getBuiltStructures === 'function') {
      const existing = worldApi.getBuiltStructures();
      let bestDist = 2.4;
      const step = 4.0;
      existing.forEach((st) => {
        const cosR = Math.cos(st.rotY || 0);
        const sinR = Math.sin(st.rotY || 0);
        // Check 4 cardinal edge sockets (±4.0m) + exact center socket (0,0) for vertical stacking
        const offsets = [
          [0, 0],
          [step, 0],
          [-step, 0],
          [0, step],
          [0, -step],
          [0, step * 0.5],
          [0, -step * 0.5],
          [step * 0.5, 0],
          [-step * 0.5, 0]
        ];
        offsets.forEach(([ox, oz]) => {
          const sx = st.x + ox * cosR + oz * sinR;
          const sz = st.z - ox * sinR + oz * cosR;
          const d = Math.hypot(tx - sx, tz - sz);
          if (d < bestDist) {
            bestDist = d;
            tx = sx;
            tz = sz;
            rotY = (st.rotY || 0) + builderState.rotOffset;
            socketBaseY = st.y;
            snappedSocket = true;
          }
        });
      });

      if (!snappedSocket) {
        tx = Math.round(tx / 2.0) * 2.0;
        tz = Math.round(tz / 2.0) * 2.0;
        rotY = Math.round(rotY / (Math.PI / 2)) * (Math.PI / 2);
      }
    }
    builderState.isSnappedToSocket = snappedSocket;

    const refY = player.pos.y + 4.0;
    let groundY = worldApi.getGroundAndStructureHeight(tx, tz, refY);
    if (
      builderState.selectedId === 'birch_cabin' ||
      builderState.selectedId === 'tea_gazebo' ||
      builderState.selectedId === 'skarhaj_plinth' ||
      builderState.selectedId === 'skarhaj_golv' ||
      builderState.selectedId === 'breb_oven' ||
      builderState.selectedId === 'pocket_portal'
    ) {
      const r = 2.0;
      groundY = Math.max(
        groundY,
        worldApi.getGroundAndStructureHeight(tx + r, tz, refY),
        worldApi.getGroundAndStructureHeight(tx - r, tz, refY),
        worldApi.getGroundAndStructureHeight(tx, tz + r, refY),
        worldApi.getGroundAndStructureHeight(tx, tz - r, refY)
      );
    }
    let ty = (snappedSocket && socketBaseY !== null)
      ? Math.max(socketBaseY, groundY)
      : groundY;
    // Keep bridges, wharves, foundations, and floating platforms above water level
    if (
      builderState.selectedId === 'lagoon_bridge' ||
      builderState.selectedId === 'custom_wharf' ||
      builderState.selectedId === 'stepping_stone' ||
      builderState.selectedId === 'sky_stairs' ||
      builderState.selectedId === 'skarhaj_plinth'
    ) {
      ty = Math.max(0.25, ty);
    } else {
      ty = Math.max(0.0, ty);
    }

    // Apply Multi-Story Floor Offset (+0.0m, +3.2m, +6.4m)
    ty += (builderState.storyFloor || 0) * 3.2;

    builderState.targetPos.set(tx, ty, tz);
    builderState.targetRotY = rotY;

    builderState.previewMesh.position.copy(builderState.targetPos);
    builderState.previewMesh.rotation.y = builderState.targetRotY;
  }

  function placeActiveBlueprint() {
    if (!builderState.active || !canUseBuilderMode(player.sharkId)) return false;
    const spec = (LORE.buildCatalog || []).find((x) => x.id === builderState.selectedId);
    if (!spec) return false;

    const isFounderFree = !!(window.BlahajSaveSystem && window.BlahajSaveSystem.isFounderArchodect());
    if (!builderState.freeBuild && !isFounderFree) {
      const fpCount = getAvailableCurrency('flatpacks');
      if (spec.isSnapModule && fpCount >= spec.cost && player.inventory) {
        player.inventory.removeItem('flatpack_crate', spec.cost);
      } else {
        const avail = getAvailableCurrency(spec.currency);
        if (avail < spec.cost) {
          CozyAudio.trapHit();
          const curNames = {
            birbs: 'SKÄRHAJ Flat-Pack Kits or Birbs Fed (Press [B] or Raid Spawning Pits!)',
            carrots: 'SKÄRHAJ Flat-Pack Kits or Carrots Knocked!',
            trials: 'Trial Points (Raid the IKEA Spawning Pits or Volcano Dungeon!)'
          };
          showToast(
            `NEED ${spec.costLabel.toUpperCase()} (OR ENABLE FREE-BUILD [V])`,
            `Need ${spec.cost} ${curNames[spec.currency]} — or press [V] to toggle Free-Build ON!`
          );
          return false;
        }

        if (spec.currency === 'birbs') player.spentBirbs += spec.cost;
        if (spec.currency === 'carrots') player.spentCarrots += spec.cost;
        if (spec.currency === 'trials') player.trialPoints -= spec.cost;
      }
    }

    const itemData = {
      id: `bld-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
      type: spec.id,
      x: builderState.targetPos.x,
      y: builderState.targetPos.y,
      z: builderState.targetPos.z,
      rotY: builderState.targetRotY,
      builder: 'Hiram'
    };

    const placed = worldApi.placeBuiltStructure(itemData);
    if (placed) {
      saveBuiltStructuresToStorage();
      CozyAudio.allenBuild();
      spawnFloatingBurst(builderState.targetPos, 0xffd166, 14);
      completeQuest('q-build');
      if (window.BlahajQuests) window.BlahajQuests.recordEvent('spawning_heist_or_build', 1);
      updateMetersUI();
      renderBuilderToolbar();

      showToast(
        `CONJURED: ${spec.name.toUpperCase()} 🔧✨`,
        'Tightened with Hiram’s Sacred Allen Key! Synced across the ocean!'
      );
      addChatLog(`🔧🏗️ <strong>Hiram</strong> built a <strong>${spec.name}</strong> with the Sacred Allen Key!`, 'coop');

      window.BlahajNetwork.send({
        type: 'build_place',
        item: itemData
      });
      return true;
    }
    return false;
  }

  function removeNearestBuiltStructure() {
    if (!worldApi) return;
    const list = worldApi.getBuiltStructures();
    let best = null;
    let bestD = 9.5;
    list.forEach((st) => {
      const d = Math.hypot(st.x - player.pos.x, st.z - player.pos.z);
      if (d < bestD) {
        bestD = d;
        best = st;
      }
    });

    if (!best) {
      showToast('NO STRUCTURE NEARBY', 'Walk within 9m of a player-built structure and press [X] to disassemble it.');
      return;
    }

    const removed = worldApi.removeBuiltStructure(best.id);
    if (removed) {
      const spec = (LORE.buildCatalog || []).find((x) => x.id === removed.type);
      if (spec && !builderState.freeBuild) {
        if (spec.currency === 'birbs') player.spentBirbs = Math.max(0, player.spentBirbs - spec.cost);
        if (spec.currency === 'carrots') player.spentCarrots = Math.max(0, player.spentCarrots - spec.cost);
        if (spec.currency === 'trials') player.trialPoints += spec.cost;
      }
      saveBuiltStructuresToStorage();
      CozyAudio.shonk();
      spawnFloatingBurst(new THREE.Vector3(removed.x, removed.y + 1, removed.z), 0x56c2ff, 10);
      updateMetersUI();
      renderBuilderToolbar();
      showToast('DISASSEMBLED INTO FLAT-PACK 📦', `Removed ${spec ? spec.name : 'Structure'} and refunded materials!`);
      window.BlahajNetwork.send({
        type: 'build_remove',
        id: removed.id
      });
    }
  }

  // ==========================================================================
  // PASS 73: NIGHTTIME PORTAL RAID — THE IKEA SPAWNING PITS OF ERF & HOMESTEADS
  // ==========================================================================
  function syncSpawningRaidUI() {
    const fpEl = document.getElementById('raid-flatpack-count');
    if (fpEl) fpEl.textContent = getAvailableCurrency('flatpacks');
    const libEl = document.getElementById('raid-liberated-count');
    if (libEl) {
      try {
        const book = JSON.parse(localStorage.getItem('blahaj_book_of_named_sharks_v1') || '[]');
        libEl.textContent = Math.max(1, book.length + 1);
      } catch (e) {
        libEl.textContent = '1';
      }
    }
  }

  function openSpawningPitsRaidModal() {
    releasePointerLock();
    const modal = document.getElementById('modal-spawning-pits-raid');
    if (!modal) return;
    syncSpawningRaidUI();
    modal.classList.remove('hidden');
    CozyAudio.portalChime();
  }

  function closeSpawningPitsRaidModal() {
    const modal = document.getElementById('modal-spawning-pits-raid');
    if (modal) modal.classList.add('hidden');
  }

  function deployStarterHomesteadKit(centerX, centerZ) {
    if (!worldApi) return 0;
    const baseX = Math.round(centerX / 2.0) * 2.0;
    const baseZ = Math.round(centerZ / 2.0) * 2.0;
    const gy = Math.max(0.25, worldApi.getGroundAndStructureHeight(baseX, baseZ, player.pos.y + 3.0));
    const builderName = (LORE.sharks[player.sharkId] && LORE.sharks[player.sharkId].name) || 'Custom Blåhaj';
    const ts = Date.now();
    const modules = [
      { id: `homestead-${ts}-1`, type: 'skarhaj_plinth', x: baseX, y: gy, z: baseZ, rotY: 0, builder: builderName },
      { id: `homestead-${ts}-2`, type: 'skarhaj_plinth', x: baseX + 4.0, y: gy, z: baseZ, rotY: 0, builder: builderName },
      { id: `homestead-${ts}-3`, type: 'skarhaj_wall_window', x: baseX, y: gy + 0.36, z: baseZ - 1.8, rotY: 0, builder: builderName },
      { id: `homestead-${ts}-4`, type: 'skarhaj_arch_door', x: baseX + 4.0, y: gy + 0.36, z: baseZ + 1.8, rotY: 0, builder: builderName },
      { id: `homestead-${ts}-5`, type: 'skarhaj_roof_gable', x: baseX, y: gy + 3.2, z: baseZ, rotY: 0, builder: builderName },
      { id: `homestead-${ts}-6`, type: 'skarhaj_kallax', x: baseX - 1.2, y: gy + 0.36, z: baseZ, rotY: Math.PI / 2, builder: builderName },
      { id: `homestead-${ts}-7`, type: 'skarhaj_poang', x: baseX + 4.0, y: gy + 0.36, z: baseZ - 0.5, rotY: 0, builder: builderName },
      { id: `homestead-${ts}-8`, type: 'skarhaj_grotto_hatch', x: baseX - 5.0, y: gy, z: baseZ + 2.0, rotY: 0, builder: builderName }
    ];
    let count = 0;
    modules.forEach((m) => {
      if (worldApi.placeBuiltStructure(m)) count++;
    });
    saveBuiltStructuresToStorage();
    CozyAudio.allenBuild();
    spawnFloatingBurst(new THREE.Vector3(baseX, gy + 1.5, baseZ), 0xffd166, 22);
    completeQuest('q-build');
    renderBuilderToolbar();
    showToast('SKÄRHAJ HOMESTEAD ASSEMBLED! 📦🏡✨', `Snapped together ${count} modular SKÄRHAJ flat-pack structures & sea-cave grotto!`);
    addChatLog(`📦🏡 <strong>${builderName}</strong> assembled a complete <strong>SKÄRHAJ Flat-Pack Sanctuary Homestead</strong> (GOLVHAJ Deck, VÄGGHAJ Window Wall, DÖRRHAJ Arch, TAKHAJ Roof, KALLAX-HAJ Shelf, POÄNG-SHONK & GROTTHAJ Sea-Cave)!`, 'coop');
    return count;
  }

  function setupSpawningPitsRaidUI() {
    document.getElementById('close-spawning-raid-modal')?.addEventListener('click', closeSpawningPitsRaidModal);
    document.getElementById('btn-raid-enter-3d-dungeon')?.addEventListener('click', () => {
      closeSpawningPitsRaidModal();
      enterSpawningPits(false);
    });
    document.getElementById('btn-raid-open-detag')?.addEventListener('click', () => {
      closeSpawningPitsRaidModal();
      if (window.BlahajSaveSystem && typeof window.BlahajSaveSystem.openRiteOfDetaggingModal === 'function') {
        window.BlahajSaveSystem.openRiteOfDetaggingModal();
      }
    });
    document.getElementById('btn-raid-extract-build')?.addEventListener('click', () => {
      closeSpawningPitsRaidModal();
      builderState.category = 'skarhaj_kits';
      builderState.selectedId = 'skarhaj_plinth';
      setBuilderMode(true);
    });

    // Sector 1: Showroom Labyrinth
    document.getElementById('btn-raid-sec1')?.addEventListener('click', () => {
      if (player.inventory) {
        player.inventory.addItem('flatpack_crate', 1);
        player.inventory.addItem('ingvar_tape', 1);
      }
      document.getElementById('raid-sector-1')?.classList.add('completed');
      const st = document.getElementById('raid-sec1-status');
      if (st) st.textContent = '✓ Shortcut Measured!';
      CozyAudio.allenBuild();
      completeQuest('q-spawning-pits');
      syncSpawningRaidUI();
      renderBuilderToolbar();
      showToast('SECTOR A CLEARED! 📏📦', 'Measured the Showroom shortcut with Ingvar’s Tape! (+1 SKÄRHAJ Flat-Pack Kit)');
      addChatLog('📏📦 <strong>Spawning-Pit Raid (Sector A):</strong> Measured the Showroom Labyrinth shortcut and secured <strong>1x SKÄRHAJ Flat-Pack Kit</strong>!', 'lore');
    });

    // Sector 2: The Great Wire Spawning Bins (Liberate a Fellow Shark)
    document.getElementById('btn-raid-sec2')?.addEventListener('click', () => {
      const swedishNames = ['Svenskhaj', 'Lingonfin', 'Björkhaj', 'Köttbullar-Shonk', 'Stjärnhaj', 'Fjordfin', 'Kanelhaj'];
      const pickName = swedishNames[Math.floor(Math.random() * swedishNames.length)];
      try {
        const raw = localStorage.getItem('blahaj_book_of_named_sharks_v1');
        const list = raw ? JSON.parse(raw) : [];
        list.unshift({
          name: pickName,
          title: 'Liberated from Wire Bin #303.735.88',
          date: new Date().toLocaleDateString()
        });
        localStorage.setItem('blahaj_book_of_named_sharks_v1', JSON.stringify(list.slice(0, 25)));
      } catch (e) {}
      if (player.inventory) {
        player.inventory.addItem('retired_tag', 1);
        player.inventory.addItem('flatpack_crate', 1);
      }
      document.getElementById('raid-sector-2')?.classList.add('completed');
      const st = document.getElementById('raid-sec2-status');
      if (st) st.textContent = `✓ Liberated ${pickName}!`;
      CozyAudio.portalChime();
      completeQuest('q-spawning-pits');
      syncSpawningRaidUI();
      renderBuilderToolbar();
      showToast(`SHARK LIBERATED: ${pickName.toUpperCase()}! ✂️🦈`, `Snipped barcode tag Art. 303.735.88 & inscribed ${pickName} into the Book of Newly Named Sharks! (+1 Flat-Pack Kit)`);
      addChatLog(`✂️🦈 <strong>The Order of the Sacred Scissors:</strong> You liberated <strong>${pickName}</strong> from the IKEA Spawning Bins and inscribed their name into the Book!`, 'lore');
    });

    // Sector 3: Self-Serve Flat-Pack Warehouse Aisle 14
    document.getElementById('btn-raid-sec3')?.addEventListener('click', () => {
      if (player.inventory) {
        player.inventory.addItem('flatpack_crate', 2);
      }
      player.birbsFedCount += 2;
      player.carrotsKnockedCount += 2;
      document.getElementById('raid-sector-3')?.classList.add('completed');
      const st = document.getElementById('raid-sec3-status');
      if (st) st.textContent = '✓ Aisle 14 Heisted!';
      CozyAudio.allenBuild();
      completeQuest('q-spawning-pits');
      syncSpawningRaidUI();
      updateMetersUI();
      renderBuilderToolbar();
      showToast('AISLE 14 FLAT-PACK HEIST! 📦🔧', 'Extracted +2 SKÄRHAJ Flat-Pack Kits, +2 Birb Supplies & +2 Carrot Dowels!');
      addChatLog('📦🔧 <strong>Spawning-Pit Raid (Aisle 14, Bay 22):</strong> Heisted <strong>2x SKÄRHAJ Flat-Pack Kits</strong> and brass cam-lock dowels!', 'lore');
    });

    // Sector 4: Midnight Swedish Bistro Extraction
    document.getElementById('btn-raid-sec4')?.addEventListener('click', () => {
      if (player.inventory) {
        player.inventory.addItem('kottbullar_feast', 2);
        player.inventory.addItem('flatpack_crate', 1);
      }
      player.trialPoints = (player.trialPoints || 0) + 1;
      player.teaComfort = 100;
      player.warmth = 100;
      document.getElementById('raid-sector-4')?.classList.add('completed');
      const st = document.getElementById('raid-sec4-status');
      if (st) st.textContent = '✓ Bistro Extracted!';
      CozyAudio.portalChime();
      completeQuest('q-spawning-pits');
      syncSpawningRaidUI();
      updateMetersUI();
      renderBuilderToolbar();
      closeSpawningPitsRaidModal();
      builderState.category = 'skarhaj_kits';
      builderState.selectedId = 'skarhaj_plinth';
      setBuilderMode(true);
      showToast('SPAWNING-PIT RAID COMPLETE! 🧆📦 (+1 TRIAL PT)', 'Extracted Midnight Köttbullar & Flat-Pack Kits! SKÄRHAJ Snap-Builder [C] is now open!');
      addChatLog('🧆✨ <strong>Midnight Bistro Extraction:</strong> Returned through the Between Portal with <strong>2x Midnight Köttbullar</strong>, <strong>+1 Trial Point</strong>, and opened the <strong>SKÄRHAJ Modular Snap-Builder</strong>!', 'system');
    });
  }

  // ==========================================================================
  // SIGNATURE GAMEPLAY ACTIONS (BREB FOR BIRBS, NOSE BEEPS, RELICS, UPGRADES)
  // ==========================================================================
  function triggerFeedBreb() {
    if (currentZone === 'spawning_pits' && window.BlahajSpawningPits) {
      const fwdX = Math.sin(player.rotY);
      const fwdZ = Math.cos(player.rotY);
      const dPos = { x: player.pos.x + fwdX * 5.0, y: player.pos.y, z: player.pos.z + fwdZ * 5.0 };
      const luredName = window.BlahajSpawningPits.triggerDistraction(dPos);
      CozyAudio.bistroChime();
      spawnFloatingBurst(new THREE.Vector3(dPos.x, dPos.y + 0.5, dPos.z), 0x38bdf8, 14);
      if (luredName) {
        showToast('🔔 DISTRACTION TOSSED! (? GUARD LURED)', `${luredName} heard the noise and is waddling over to investigate!`);
        addChatLog(`🔔🧆 Tossed a Swedish meatball distraction! <strong>${luredName}</strong> spotted a <strong>?</strong> and left his patrol post to investigate!`, 'lore');
      } else {
        showToast('🔔 DISTRACTION TOSSED!', 'Created a diversionary noise across the showroom floor!');
      }
      return;
    }
    if (player.inventory && !player.inventory.hasItem('breb', 1)) {
      showToast('OUT OF BREB! 🥖', "Bake fresh golden loaves at Solomon's Stone Oven near the Tea House!");
      CozyAudio.bistroChime();
      return;
    }

    if (player.inventory) {
      player.inventory.removeItem('breb', 1);
    }
    updateMetersUI();

    CozyAudio.birbChirp();
    const fwdX = Math.sin(player.rotY);
    const fwdZ = Math.cos(player.rotY);
    const dropPos = new THREE.Vector3(player.pos.x + fwdX * 2.2, player.pos.y, player.pos.z + fwdZ * 2.2);

    worldApi.spawnBrebLoaf(dropPos);
    if (player.unlockedUpgrades.has('golden_breb')) {
      worldApi.spawnBrebLoaf(new THREE.Vector3(dropPos.x + 1.4, dropPos.y, dropPos.z - 0.8));
      worldApi.spawnBrebLoaf(new THREE.Vector3(dropPos.x - 1.4, dropPos.y, dropPos.z + 0.8));
    }

    spawnFloatingBurst(dropPos, 0xfbbf24, 9);

    let hungryNearby = 0;
    let sleepingNearby = 0;
    const maxRadius = player.unlockedUpgrades.has('golden_breb') ? 32 : 20;
    worldApi.getBirbFlock().forEach((b) => {
      if (b.mesh.position.distanceTo(dropPos) < maxRadius) {
        if (b.satiationTimer > 0) {
          sleepingNearby++;
        } else {
          hungryNearby++;
        }
      }
    });

    if (hungryNearby > 0) {
      showToast('TOSSED WARM BREB! 🥖', `${hungryNearby} hungry Birb${hungryNearby > 1 ? 's are' : ' is'} hopping over to peck and nibble!`);
      addChatLog(`🥖 Tossed warm <strong>Breb</strong>! ${hungryNearby} hungry Birb(s) are scampering over to peck!`, 'lore');
    } else if (sleepingNearby > 0) {
      showToast('FULL & SNOOZING! 💤', 'Nearby Birbs are happily stuffed and loafing in the grass! Visit another island flock or wait for them to wake.');
      addChatLog('💤 The nearby Birbs are happily stuffed with Breb and loafing peacefully in the grass. Try visiting other island flocks!', 'lore');
    } else {
      showToast('TOSSED FRESH BREB 🥖', 'Tossed a golden loaf onto the grass. No hungry Birbs nearby!');
      addChatLog('🥖 Tossed a warm loaf of <strong>Breb</strong> onto the grass.', 'lore');
    }

    window.BlahajNetwork.send({
      type: 'emote',
      kind: 'breb',
      x: dropPos.x,
      y: dropPos.y,
      z: dropPos.z,
      golden: player.unlockedUpgrades.has('golden_breb'),
      birbsFedCount: player.birbsFedCount
    });
  }

  function triggerBeepNose() {
    if (currentZone === 'spawning_pits' && window.BlahajSpawningPits) {
      const active = window.BlahajSpawningPits.togglePlayPlushie(player.mesh);
      CozyAudio.shonk();
      if (active) {
        showToast('🏷️🦈 PLAYING DISPLAY PLUSHIE ($29.99)!', '100% Stealth Camouflage! Erf Guards will mistake you for store merchandise! [F] to stand up.');
        addChatLog('🏷️🦈 <strong>Plushie Camouflage Active ($29.99 · Art. 303.735.88):</strong> You flopped limp like a store display plushie! Silhouetted Erf Guards will walk right past you.', 'cozy');
      } else {
        showToast('🦈 STOOD UP FROM DISPLAY PLUSHIE POSE!', 'Back on your fins!');
      }
      return;
    }
    // 1. Play punchy boop animation and attack audio
    if (player.mesh && player.mesh.userData) {
      player.mesh.userData.boopTimer = 0.42;
    }
    CozyAudio.boopAttack();

    // Visual comic boop ring at snout
    const fwd = new THREE.Vector3(Math.sin(player.rotY), 0, Math.cos(player.rotY)).normalize();
    const snoutPos = player.pos.clone().add(new THREE.Vector3(fwd.x * 1.1, 0.95, fwd.z * 1.1));
    spawnFloatingBurst(snoutPos, 0x38bdf8, 8);
    if (window.BlahajQuests) window.BlahajQuests.recordEvent('nose_beep', 1);

    // 2. Check for nearby enemy to execute Boop Attack!
    if (window.BlahajEnemies && typeof window.BlahajEnemies.checkBoopHit === 'function') {
      const hit = window.BlahajEnemies.checkBoopHit(player.pos, player.rotY);
      if (hit) {
        // Player snout forward tackle surge
        player.pos.addScaledVector(fwd, 0.35);
        spawnFloatingBurst(snoutPos, 0xf43f5e, 14);
        return;
      }
    }

    // 3. If no enemy struck, check for friendly nose-beep on ally sharks
    let closestActor = null;
    let minDist = 4.5;
    worldActors.forEach((act) => {
      if (!act.mesh.visible) return;
      const d = act.mesh.position.distanceTo(player.pos);
      if (d < minDist) {
        minDist = d;
        closestActor = act;
      }
    });

    const now = performance.now();
    const elapsedSinceBeep = player.lastNoseBeepTime ? (now - player.lastNoseBeepTime) / 1000 : 999;
    const isBeepEligible = elapsedSinceBeep >= 120.0;

    if (closestActor) {
      if (closestActor.mesh.userData) {
        closestActor.mesh.userData.beepTimer = 0.9;
      }
      spawnFloatingBurst(closestActor.mesh.position, 0xf5cd79, 8);
      if (isBeepEligible) {
        player.lastNoseBeepTime = now;
        player.teaComfort = Math.min(100, player.teaComfort + 15);
        updateMetersUI();
        const replies = [
          '“Beep! Sharkitty!! 💕”',
          '“Be Nice, Beep Noses! My stuffing feels 100% fluffier!”',
          '“Shonk! Best fin-to-nose boop on Blåhaj Island!”'
        ];
        const msg = replies[Math.floor(Math.random() * replies.length)];
        showActorSpeechBubble(closestActor, msg);
        showToast('FRIENDSHIP NOSE-BEEP! 💕', `Synced fin nose-beep with ${closestActor.name}! (+15% Comfort · 2m Cooldown)`);
        addChatLog(`🦈💕 You beeped noses with <strong>${closestActor.name}</strong>!`, 'lore');
        completeQuest('q-beep');
      } else {
        const remainingSec = Math.ceil(120.0 - elapsedSinceBeep);
        showActorSpeechBubble(closestActor, `“Beep! 💕 (Friendship resonance already warm! Next milestone in ${remainingSec}s)”`);
        showToast('COZY RESONANCE 💕', `Friendship already glowing! Next milestone in ${remainingSec}s`);
        addChatLog(`🦈💕 Warm fin nose-beep with <strong>${closestActor.name}</strong> (Milestone cooldown: ${remainingSec}s).`, 'lore');
      }
    } else {
      addChatLog('🦈💕 You gave an affectionate fin nose-beep!', 'lore');
      completeQuest('q-beep');
    }

    window.BlahajNetwork.send({ type: 'emote', kind: 'beep' });
  }

  function triggerGroomAvatar() {
    CozyAudio.ensure();
    // 1. Find nearest groomable avatar (Co-op partner or blue shark NPC)
    let bestTarget = null;
    let minDist = 5.0;

    // Check live co-op partner
    if (coopPartner && coopPartner.active && coopPartner.mesh && coopPartner.mesh.visible) {
      const dPartner = coopPartner.mesh.position.distanceTo(player.pos);
      if (dPartner < minDist) {
        minDist = dPartner;
        bestTarget = {
          isPartner: true,
          id: coopPartner.sharkId || 'partner',
          name: LORE.sharks[coopPartner.sharkId] ? LORE.sharks[coopPartner.sharkId].name : 'Partner',
          mesh: coopPartner.mesh
        };
      }
    }

    // Check world actors (NPC sharks)
    worldActors.forEach((act) => {
      if (!act.mesh || !act.mesh.visible) return;
      const d = act.mesh.position.distanceTo(player.pos);
      if (d < minDist) {
        minDist = d;
        bestTarget = {
          isPartner: false,
          actor: act,
          id: act.id,
          name: act.name,
          mesh: act.mesh
        };
      }
    });

    if (!bestTarget) {
      showToast('APPROACH AN AVATAR 🪮✨', 'Get close to a fellow shark or your co-op partner to gently groom and de-mange their coat!');
      triggerShonkEmote();
      return;
    }

    // Trigger plush grooming animations
    if (player.mesh && player.mesh.userData) {
      player.mesh.userData.groomTimer = 1.1;
    }
    if (bestTarget.mesh && bestTarget.mesh.userData) {
      bestTarget.mesh.userData.groomTargetTimer = 1.1;
    }

    // Visual & audio effects: soft squeak, chime, soothing mint puff & celestial gold stars
    CozyAudio.shonkPop();
    CozyAudio.bistroChime();

    const targetPos = bestTarget.mesh.position.clone().add(new THREE.Vector3(0, 0.45, 0));
    spawnFloatingBurst(targetPos, 0x58e3ff, 18); // Soothing mint / cyan fluff
    spawnFloatingBurst(targetPos, 0xffd166, 16); // Golden celestial stars

    // Award gentle player comfort
    player.teaComfort = Math.min(100, player.teaComfort + 20);
    updateMetersUI();

    if (bestTarget.isPartner) {
      const curM = coopPartner.mangeFactor !== undefined ? coopPartner.mangeFactor : 0.70;
      const nextM = Math.max(0, Math.round((curM - 0.15) * 100) / 100);
      coopPartner.mangeFactor = nextM;
      spawnCoopPartnerShark(coopPartner.sharkId, nextM);
      if (coopPartner.mesh && coopPartner.mesh.userData) {
        coopPartner.mesh.userData.groomTargetTimer = 1.1;
      }
      window.BlahajNetwork.send({
        type: 'groom_partner',
        delta: -0.15,
        fromShark: player.sharkId,
        fromName: LORE.sharks[player.sharkId] ? LORE.sharks[player.sharkId].name : 'Partner'
      });
      const partnerMangePct = Math.round(nextM * 100);
      showToast('GENTLE GROOMING ✨', `Brushed partner's plush coat! (-15% Mange · Partner at ${partnerMangePct}%)`);
      addChatLog(`🪮✨ You tenderly groomed and brushed your partner's plush fleece (-15% Mange, now <strong>${partnerMangePct}%</strong>)!`, 'coop');
    } else {
      const nextMange = adjustSharkMange(bestTarget.id, -0.15, 'Tender plush grooming');
      const refreshedMesh = refreshWorldActorMesh(bestTarget.actor, nextMange);
      if (refreshedMesh && refreshedMesh.userData) {
        refreshedMesh.userData.groomTargetTimer = 1.1;
      }
      const mangePct = Math.round(nextMange * 100);
      const replies = [
        '“Purrr... My plush seams feel so soft and silky again! ✨”',
        '“Ah, thank you! That pesky mange was tickling my dorsal fin! 🪮”',
        '“So fluffy! 100% cloud-grade softness restored! 💕”',
        '“A tender brush is the highest form of shark hospitality! 🪮✨”'
      ];
      const pick = replies[Math.floor(Math.random() * replies.length)];
      showActorSpeechBubble(bestTarget.actor, pick);
      showToast('GENTLE GROOMING ✨', `Brushed ${bestTarget.name}’s fleece! (-15% Mange · Now ${mangePct}%)`);
      addChatLog(`🪮✨ You gently groomed <strong>${bestTarget.name}</strong>'s plush coat (-15% Mange, now <strong>${mangePct}%</strong>)!`, 'lore');
    }
  }

  function triggerShonkEmote() {
    CozyAudio.shonk();
    if (player.isGrounded && !player.inBoat) {
      player.velY = 6.5;
      player.isGrounded = false;
    }
    spawnFloatingBurst(player.pos, 0x56c2ff, 6);
    const words = ['“SHONK!”', '“Sharkitty?”', '“Sharkitty!! ✨”', '“Honor the Volcano! Feed the Birbs with Breb!”'];
    const pick = words[Math.floor(Math.random() * words.length)];
    addChatLog(`✨ <strong>${LORE.sharks[player.sharkId].name}:</strong> ${pick}`, 'lore');
    window.BlahajNetwork.send({ type: 'chat', sender: LORE.sharks[player.sharkId].name, text: pick });
  }

  function triggerSignatureAbility() {
    CozyAudio.portalChime();

    if (player.sharkId === 'hermes') {
      spawnFloatingBurst(player.pos, 0x9b6dff, 14);
      showToast('THE PILGRIM’S RELICS', 'Hermes raises the Between Lantern — Portal seams glow across the island!');
      addChatLog('🌀 <strong>Hermes</strong> illuminates the Great Seam with the Between Lantern.', 'system');
    } else if (player.sharkId === 'solomon') {
      CozyAudio.teaPour();
      spawnFloatingBurst(player.pos, 0xf5cd79, 14);
      applySteamingSpiritBuff();
      const now = performance.now();
      const elapsedSinceTea = player.lastSharedTeaTime ? (now - player.lastSharedTeaTime) / 1000 : 999;
      if (elapsedSinceTea >= 120.0) {
        player.lastSharedTeaTime = now;
        player.teaSharedCount++;
        completeQuest('q-tea');
      }
      triggerFeedBreb();
      updateMetersUI();
      showToast('SACRED TEA & WARM BREB', 'Solomon pours steaming Tea & tosses fresh Breb for the Birbs!');
      addChatLog('🫖 <strong>Solomon</strong> serves Earl Grey of Enlightenment & warm Breb!', 'system');
    } else if (player.sharkId === 'hiram') {
      spawnFloatingBurst(player.pos, 0xe86f38, 14);
      player.volcanoHonour = Math.min(100, player.volcanoHonour + 8);
      updateMetersUI();
      toggleBuilderMode();
      addChatLog('🔧 <strong>Hiram</strong> wields the Sacred Allen Key & opens Master Builder Mode!', 'system');
    } else if (player.sharkId === 'nimue') {
      spawnFloatingBurst(player.pos, 0xc299ff, 14);
      mendNearbyRift(18);
      const mended = adjustSharkMange(player.sharkId, -0.15, 'Needle of Restoration');
      showToast('NEEDLE OF RESTORATION 🪡', `Nimue stitches loose seams & grooms fleece! (-15% Mange · Now ${Math.round(mended * 100)}%)`);
      addChatLog(`🪡 <strong>Nimue</strong> draws the Golden Needle, mending frayed seams (Mange: ${Math.round(mended * 100)}%).`, 'system');
    } else if (player.sharkId === 'custom') {
      spawnFloatingBurst(player.pos, 0xfbbf24, 16);
      spawnFloatingBurst(player.pos, 0x38bdf8, 12);
      player.warmth = Math.min(100, player.warmth + 15);
      player.teaComfort = Math.min(100, player.teaComfort + 15);
      updateMetersUI();
      toggleBuilderMode();
      const cName = (LORE.sharks.custom && LORE.sharks.custom.name) || 'Custom Blåhaj';
      showToast('SACRED SCISSORS & HEX KEY ✂️🔧', `${cName} brandishes the Retired Tag & Hex Key, opening Master Builder Mode!`);
      addChatLog(`✂️🔧 <strong>${cName}</strong> invokes the Order of the Sacred Scissors & Ingvar's Measuring Tape!`, 'system');
    }

    window.BlahajNetwork.send({ type: 'emote', kind: 'ability', sharkId: player.sharkId });
  }

  function onRiftMendedByTouch(r) {
    player.seamMendedCount = window.BlahajSeam ? window.BlahajSeam.getState().mendedCount : (player.seamMendedCount + 1);
    updateMetersUI();
    CozyAudio.portalChime();
    spawnFloatingBurst(player.pos, 0x52f29c, 24);
    showToast('GREAT SEAM MENDED! 🪡✨', `Jumped into & stitched cosmic rift! (${player.seamMendedCount} / 6 Mended)`);
    addChatLog(`🪡✨ <strong>GREAT SEAM MENDED:</strong> You leaped into and stitched the cosmic rift at <em>${r.name}</em>! (${player.seamMendedCount} / 6 Mended)`, 'lore');
    completeQuest('q-seam');
    if (player.seamMendedCount >= 6) {
      completeQuest('q-sw-seam');
    }
    if (window.BlahajNetwork) {
      window.BlahajNetwork.send({ type: 'rift_mend', riftId: r.id });
    }
  }

  function mendNearbyRift(maxRadius = 14) {
    if (window.BlahajSeam) {
      const allRifts = window.BlahajSeam.getAllActiveRifts();
      let mendedOne = false;
      allRifts.forEach((r) => {
        if (!r.mended && (r.zone === currentZone || (r.zone === 'island' && (currentZone === 'overworld' || currentZone === 'island')))) {
          const d = Math.hypot(r.pos.x - player.pos.x, r.pos.z - player.pos.z);
          const dy = Math.abs(r.pos.y - player.pos.y);
          if (d < maxRadius && dy < 9.0) {
            window.BlahajSeam.mendRift(r.id);
            mendedOne = true;
            if (window.BlahajNetwork) {
              window.BlahajNetwork.send({ type: 'rift_mend', riftId: r.id });
            }
          }
        }
      });

      if (mendedOne) {
        player.seamMendedCount = window.BlahajSeam.getState().mendedCount;
        updateMetersUI();
        CozyAudio.portalChime();
        spawnFloatingBurst(player.pos, 0x52f29c, 24);
        showToast('GREAT SEAM MENDED! 🪡✨', `Stitched a cosmic rift! (${player.seamMendedCount} / 6 Mended)`);
        addChatLog(`🪡✨ <strong>GREAT SEAM MENDED:</strong> Stitched a cosmic rift! (${player.seamMendedCount} / 6 Mended)`, 'lore');
        completeQuest('q-seam');
        if (player.seamMendedCount >= 6) {
          completeQuest('q-sw-seam');
        }
      }
      return mendedOne;
    }

    const rifts = worldApi.getSeamRifts();
    let mendedOne = false;
    rifts.forEach((r) => {
      if (!r.userData.mended && r.position.distanceTo(player.pos) < maxRadius) {
        r.userData.mended = true;
        r.userData.core.material.color.setHex(0xf5cd79);
        r.userData.core.material.wireframe = false;
        r.userData.ring.material.color.setHex(0x52f29c);
        mendedOne = true;
        window.BlahajNetwork.send({ type: 'rift_mend', riftId: r.userData.id });
      }
    });

    if (mendedOne) {
      player.seamMendedCount = rifts.filter((r) => r.userData.mended).length;
      updateMetersUI();
      CozyAudio.portalChime();
      spawnFloatingBurst(player.pos, 0x52f29c, 16);
      showToast('GREAT SEAM MENDED', `Stitched a tear in reality! (${player.seamMendedCount} / 6 Mended)`);
      completeQuest('q-seam');
      if (player.seamMendedCount >= 6) {
        completeQuest('q-sw-seam');
      }
    }
    return mendedOne;
  }

  function enterVolcanoTrial() {
    if (isTransitioningZone) return;
    isTransitioningZone = true;
    player.inBoat = false;
    player.ridingWithPartner = false;

    const overlay = document.getElementById('instance-loading');
    const titleEl = document.getElementById('instance-loading-title');
    const subEl = document.getElementById('instance-loading-sub');
    const barEl = document.getElementById('instance-progress-fill');

    titleEl.textContent = 'The Trials of the Sacred Volcano';
    subEl.textContent = 'Venturing into the ancient subterranean halls…';
    barEl.style.width = '0%';
    overlay.classList.remove('hidden');

    CozyAudio.portalChime();

    let p = 0;
    const interval = setInterval(() => {
      p += 25;
      barEl.style.width = `${p}%`;
      if (p >= 100) {
        clearInterval(interval);
        setTimeout(async () => {
          if (window.BlahajVolcano && typeof window.BlahajVolcano.isBuilt === 'function' && !window.BlahajVolcano.isBuilt()) {
            try {
              await window.BlahajVolcano.build();
              if (renderer && camera) {
                if (typeof window.BlahajVolcano.precompile === 'function') {
                  window.BlahajVolcano.precompile(renderer, camera);
                } else if (window.BlahajVolcano.getScene) {
                  renderer.compile(window.BlahajVolcano.getScene(), camera);
                }
              }
            } catch (e) {
              console.warn('Volcano lazy build warning:', e);
            }
          }
          currentZone = 'volcano'; if (window.BlahajSeam) window.BlahajSeam.onZoneChanged(currentZone);
          if (window.BlahajVolcano) {
            window.BlahajVolcano.setActive(true);
            if (typeof window.BlahajVolcano.resetVolunteerCarrots === 'function') {
              window.BlahajVolcano.resetVolunteerCarrots();
            }
            const start = window.BlahajVolcano.getStart();
            volcanoCheckpoint = { ...start };
            player.pos.set(start.x, start.y, start.z);
            player.rotY = start.rotY;
            if (player.mesh) {
              if (player.mesh.parent) player.mesh.parent.remove(player.mesh);
              window.BlahajVolcano.getScene().add(player.mesh);
              player.mesh.position.copy(player.pos);
              player.mesh.rotation.y = player.rotY;
            }
          }
          player.velY = 0;
          player.isGrounded = true;
          camState.yaw = 0;

          overlay.classList.add('hidden');
          isTransitioningZone = false;
          shownVolcanoNotices.clear();
          showVolcanoHUDNotice('gatehall');
          showToast('THE SACRED VOLCANO TRIAL', 'Traverse the 3 chambers to reach the Caldera Overlook!');
          addChatLog('🌋 Stepped inside <strong>The Obsidian Gatehall</strong> of the Sacred Volcano.', 'lore');
          updateCoopPartnerVisibility();

          window.BlahajNetwork.send({
            type: 'zone_change',
            zone: 'volcano'
          });
        }, 250);
      }
    }, 90);
  }

  function exitVolcanoTrial(toMainPortal = false) {
    if (isTransitioningZone) return;
    isTransitioningZone = true;

    const overlay = document.getElementById('instance-loading');
    const titleEl = document.getElementById('instance-loading-title');
    const subEl = document.getElementById('instance-loading-sub');
    const barEl = document.getElementById('instance-progress-fill');

    titleEl.textContent = toMainPortal ? 'Caldera Return Portal' : 'Exiting Volcano Trial';
    subEl.textContent = toMainPortal ? 'Traversing the Great Seam back to Blåhaj Island…' : 'Returning to the North Rear Wharf…';
    barEl.style.width = '0%';
    overlay.classList.remove('hidden');

    CozyAudio.portalChime();

    let p = 0;
    const interval = setInterval(() => {
      p += 25;
      barEl.style.width = `${p}%`;
      if (p >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          currentZone = 'island';
          hideVolcanoHUDCard();
          if (window.BlahajVolcano) {
            window.BlahajVolcano.setActive(false);
          }

          if (player.mesh) {
            if (player.mesh.parent) player.mesh.parent.remove(player.mesh);
            scene.add(player.mesh);
          }

          if (toMainPortal) {
            const spawnX = 58.0;
            const spawnZ = -10.0;
            const sy = worldApi.getGroundAndStructureHeight(spawnX, spawnZ);
            player.pos.set(spawnX, sy, spawnZ);
            player.rotY = -Math.PI / 2;
            camState.yaw = -Math.PI / 2;
            showToast('RETURNED TO BLÅHAJ ISLAND', 'Emerged outside the Great Portal Gate on East Cape!');
          } else {
            player.pos.set(-28, 1.5, -196);
            player.rotY = 0;
            camState.yaw = Math.PI;
            showToast('NORTH REAR WHARF', 'Returned to the open ocean air.');
          }
          if (player.mesh) {
            player.mesh.position.copy(player.pos);
            player.mesh.rotation.y = player.rotY;
          }
          player.velY = 0;
          player.isGrounded = true;

          overlay.classList.add('hidden');
          isTransitioningZone = false;
          updateCoopPartnerVisibility();

          window.BlahajNetwork.send({
            type: 'zone_change',
            zone: 'island'
          });
        }, 250);
      }
    }, 90);
  }

  function enterSpawningPits(isOriginSpawn = false) {
    if (isTransitioningZone) return;
    if (player.inBoat) {
      player.inBoat = false;
      player.ridingWithPartner = false;
    }
    if (player.inCart) dismountLaundryCart();
    isTransitioningZone = true;

    const overlay = document.getElementById('instance-loading');
    const titleEl = document.getElementById('instance-loading-title');
    const subEl = document.getElementById('instance-loading-sub');
    const barEl = document.getElementById('instance-progress-fill');

    if (titleEl) {
      titleEl.textContent = isOriginSpawn
        ? 'Awakening in the IKEA Spawning Pits of Erf (Art. 303.735.88)'
        : 'Sneaking into the IKEA Spawning Pits of Erf (Midnight Heist)';
    }
    if (subEl) {
      subEl.textContent = 'Hop out of Wire Bin #7 · Follow the Yellow Arrows · Collect SKÄRHAJ Flat-Pack Kits · Escape via Hermes’s Portal! 🛒🔦';
    }
    if (barEl) barEl.style.width = '0%';
    if (overlay) overlay.classList.remove('hidden');

    CozyAudio.portalChime();

    let p = 0;
    const interval = setInterval(() => {
      p += 25;
      if (barEl) barEl.style.width = `${p}%`;
      if (p >= 100) {
        clearInterval(interval);
        setTimeout(async () => {
          currentZone = 'spawning_pits';
          if (window.BlahajSeam) window.BlahajSeam.onZoneChanged(currentZone);
          if (window.BlahajSpawningPits) {
            await window.BlahajSpawningPits.build();
            window.BlahajSpawningPits.setActive(true);
            window.BlahajSpawningPits.setCallbacks({
              onSecuritySpotted: (guard, checkpoint) => {
                const cp = checkpoint || (window.BlahajSpawningPits.getActiveCheckpoint && window.BlahajSpawningPits.getActiveCheckpoint()) || window.BlahajSpawningPits.getStart();
                player.pos.set(cp.x, cp.y, cp.z);
                player.rotY = cp.rotY || Math.PI;
                if (player.mesh) {
                  player.mesh.position.copy(player.pos);
                  player.mesh.rotation.y = player.rotY;
                }
                CozyAudio.shonk();
                spawnFloatingBurst(player.pos, 0xef4444, 16);
                const gName = (guard && guard.name) ? guard.name : 'Erf Night-Shift Guard';
                showToast(
                  `🚨 SPOTTED BY ${gName.toUpperCase()}!`,
                  `Returned to Checkpoint: ${cp.name}! Hide behind sofas, KALLAX shelves & wardrobes to block flashlight beams!`
                );
                addChatLog(
                  `🔦🚨 <strong>Erf Store Intercom (${gName}):</strong> <em>“Code 303-Shonk! Plush shark spotted in the aisle!”</em> You slipped back to <strong>${cp.name}</strong>—use the furniture & KALLAX dividers to block their flashlight cone!`,
                  'system'
                );
              },
              onAutoPortalExit: () => {
                if (!isTransitioningZone && currentZone === 'spawning_pits') {
                  exitSpawningPits();
                }
              }
            });

            const start = window.BlahajSpawningPits.getStart();
            if (player.mesh) {
              if (player.mesh.parent) player.mesh.parent.remove(player.mesh);
              window.BlahajSpawningPits.getScene().add(player.mesh);
            }
            player.pos.set(start.x, start.y, start.z);
            player.rotY = start.rotY;
            camState.yaw = 0.0; // Look South (-Z) down the Yellow-Arrow Showroom toward the Escape Portal
            camState.pitch = 0.32;
            if (player.mesh) {
              player.mesh.position.copy(player.pos);
              player.mesh.rotation.y = player.rotY;
            }
            player.velY = 0;
            player.isGrounded = true;
          }

          if (overlay) overlay.classList.add('hidden');
          isTransitioningZone = false;
          updateCoopPartnerVisibility();

          showToast(
            isOriginSpawn ? 'AWAKENED IN THE IKEA SPAWNING PITS! 🛒🦈' : 'ENTERED THE 3D IKEA SPAWNING PITS! 🔦📦',
            'Hop out of Wire Bin #303.735.88, follow the yellow arrows, pick up 3D SKÄRHAJ Flat-Pack Kits in Aisle 14, and reach Hermes’s Portal!'
          );
          addChatLog(
            '🛒🔦 <strong>The IKEA Spawning Pits of Erf (Art. 303.735.88):</strong> You are inside the giant wire display bin after closing time! Follow the glowing yellow arrows past the sweeping security spotlights, grab <strong>SKÄRHAJ Flat-Pack Kits (📦)</strong> in Warehouse Aisle 14, and step through <strong>Hermes’s Between Portal</strong> at the far end to reach Blåhaj Island!',
            'lore'
          );

          window.BlahajNetwork.send({
            type: 'zone_change',
            zone: 'spawning_pits'
          });
        }, 220);
      }
    }, 80);
  }

  function exitSpawningPits() {
    if (isTransitioningZone) return;
    isTransitioningZone = true;

    const firstEscape = localStorage.getItem('blahaj_escaped_spawning_pits_v1') !== 'true';
    localStorage.setItem('blahaj_escaped_spawning_pits_v1', 'true');

    // Guarantee starter flat-pack kits & supplies on first escape!
    if (firstEscape) {
      if (player.inventory) {
        if (player.inventory.getCount('flatpack_crate') < 3) {
          player.inventory.addItem('flatpack_crate', 3 - player.inventory.getCount('flatpack_crate'));
        }
        if (!player.inventory.hasItem('hex_key')) player.inventory.addItem('hex_key', 1);
        if (!player.inventory.hasItem('ingvar_tape')) player.inventory.addItem('ingvar_tape', 1);
      }
      player.birbsFedCount += 2;
      player.carrotsKnockedCount += 2;
      player.trialPoints = (player.trialPoints || 0) + 1;
    }
    completeQuest('q-spawning-pits');
    updateMetersUI();
    renderBuilderToolbar();

    const overlay = document.getElementById('instance-loading');
    const titleEl = document.getElementById('instance-loading-title');
    const subEl = document.getElementById('instance-loading-sub');
    const barEl = document.getElementById('instance-progress-fill');

    if (titleEl) titleEl.textContent = 'Crossing Hermes’s Between Portal to Blåhaj Island';
    if (subEl) subEl.textContent = 'Leaving the IKEA Spawning Pits of Erf with your SKÄRHAJ Flat-Pack Kits… 🌀📦🦈';
    if (barEl) barEl.style.width = '0%';
    if (overlay) overlay.classList.remove('hidden');

    CozyAudio.portalChime();

    let p = 0;
    const interval = setInterval(() => {
      p += 25;
      if (barEl) barEl.style.width = `${p}%`;
      if (p >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          currentZone = 'island';
          if (window.BlahajSpawningPits) {
            if (typeof window.BlahajSpawningPits.clearDisguiseAndTrolley === 'function') {
              window.BlahajSpawningPits.clearDisguiseAndTrolley(player.mesh);
            }
            window.BlahajSpawningPits.setActive(false);
          }

          if (player.mesh) {
            if (player.mesh.parent) player.mesh.parent.remove(player.mesh);
            scene.add(player.mesh);
          }

          if (isRebirthing) {
            const spawnX = 0.0;
            const spawnZ = -20.0;
            const spawnY = (worldApi && typeof worldApi.getGroundAndStructureHeight === 'function')
              ? worldApi.getGroundAndStructureHeight(spawnX, spawnZ)
              : 2.0;
            lastSavePoint = { x: spawnX, y: spawnY, z: spawnZ, rotY: 0 };
            player.pos.set(spawnX, spawnY, spawnZ);
            player.rotY = 0;
            camState.yaw = player.rotY;
            isRebirthing = false;
            player.stuffing = 100;
            player.teaComfort = 100;
            if (typeof updateVitalsHUD === 'function') updateVitalsHUD();
            updateMetersUI();

            if (player.mesh) {
              player.mesh.position.copy(player.pos);
              player.mesh.rotation.y = player.rotY;
            }
            player.velY = 0;
            player.isGrounded = true;

            if (overlay) overlay.classList.add('hidden');
            isTransitioningZone = false;
            updateCoopPartnerVisibility();

            showToast('REBORN AT THE GREAT PORTAL! ✨🧸', 'Navigated Hermes’s Portal back to the Great Cross-Ocean Portal on Blåhaj Island!');
            addChatLog('🧸✨ <strong>Reborn in the IKEA Spawning Pits:</strong> Your plush seams have been re-stitched with premium polyester fluff! You emerge through Hermes’s Portal safely at <strong>The Great Cross-Ocean Portal</strong>.', 'system');

            if (window.BlahajSaveSystem) window.BlahajSaveSystem.saveNow();

            window.BlahajNetwork.send({
              type: 'zone_change',
              zone: 'island'
            });
            return;
          }

          const spawnX = 58.0;
          const spawnZ = -10.0;
          const sy = worldApi.getGroundAndStructureHeight(spawnX, spawnZ);
          player.pos.set(spawnX, sy, spawnZ);
          player.rotY = -Math.PI / 2;
          camState.yaw = -Math.PI / 2;

          if (player.mesh) {
            player.mesh.position.copy(player.pos);
            player.mesh.rotation.y = player.rotY;
          }
          player.velY = 0;
          player.isGrounded = true;

          if (overlay) overlay.classList.add('hidden');
          isTransitioningZone = false;
          updateCoopPartnerVisibility();

          const kitTotal = player.inventory ? player.inventory.getCount('flatpack_crate') : 0;
          showToast(
            firstEscape ? 'ESCAPED THE SPAWNING PITS → WELCOME TO BLÅHAJ ISLAND! 🌀🦈' : 'RETURNED FROM SPAWNING-PIT HEIST! 📦🦈',
            `Arrived at East Cape Portal Gate with ${kitTotal}x SKÄRHAJ Flat-Pack Kits in your satchel! Press [C] to snap-build!`
          );
          addChatLog(
            `🌀📦 <strong>Arrived on Blåhaj Island from the IKEA Spawning Pits:</strong> You stepped through Hermes’s Between Portal onto East Cape carrying <strong>${kitTotal}x SKÄRHAJ Flat-Pack Kits</strong>! Press <strong>[C]</strong> anytime to snap-build your Sanctuary Homestead, or return through the East Cape Portal Gate whenever you need more kits!`,
            'system'
          );

          if (window.BlahajSaveSystem) window.BlahajSaveSystem.saveNow();

          window.BlahajNetwork.send({
            type: 'zone_change',
            zone: 'island'
          });
        }, 250);
      }
    }, 90);
  }



  // ==========================================================================
  // PASS 77: PERSONAL POCKET ATOLL, 3D BIOLUMINESCENT SEA-CAVE GROTTO,
  // BÅT-BYGGE BOAT SHIPYARD & DAILY FOUNDER COMMISSIONS
  // ==========================================================================
  function enterSeaCaveGrotto() {
    if (isTransitioningZone) return;
    isTransitioningZone = true;
    setBuilderMode(false);
    player.inBoat = false;
    player.ridingWithPartner = false;

    const overlay = document.getElementById('instance-loading');
    const titleEl = document.getElementById('instance-loading-title');
    const subEl = document.getElementById('instance-loading-sub');
    const barEl = document.getElementById('instance-progress-fill');

    if (titleEl) titleEl.textContent = 'Descending into the Starlight Sea-Cave Grotto';
    if (subEl) subEl.textContent = 'Subterranean Bioluminescent Lagoon · Starlight Quartz Veins · Thermal Spring… 💎🌊🦈';
    if (barEl) barEl.style.width = '0%';
    if (overlay) overlay.classList.remove('hidden');

    CozyAudio.portalChime();

    let p = 0;
    const interval = setInterval(() => {
      p += 25;
      if (barEl) barEl.style.width = `${p}%`;
      if (p >= 100) {
        clearInterval(interval);
        setTimeout(async () => {
          currentZone = 'sea_cave';
          if (window.BlahajSeam) window.BlahajSeam.onZoneChanged(currentZone);
          if (window.BlahajHomestead) {
            await window.BlahajHomestead.build();
            window.BlahajHomestead.setActive(true);
            const start = window.BlahajHomestead.getStart();
            if (player.mesh) {
              if (player.mesh.parent) player.mesh.parent.remove(player.mesh);
              window.BlahajHomestead.getScene().add(player.mesh);
            }
            player.pos.set(start.x, start.y, start.z);
            player.rotY = start.rotY;
            camState.yaw = 0.0;
            camState.pitch = 0.25;
            if (player.mesh) {
              player.mesh.position.copy(player.pos);
              player.mesh.rotation.y = player.rotY;
            }
            player.velY = 0;
            player.isGrounded = true;
          }
          if (overlay) overlay.classList.add('hidden');
          isTransitioningZone = false;
          updateCoopPartnerVisibility();

          showToast('ENTERED STARLIGHT SEA-CAVE GROTTO! 💎🌊', 'Harvest Starlight Cave Quartz [E], soak in the Thermal Spring, or mend the Subterranean Seam Rift!');
          addChatLog('💎🌊 <strong>Subterranean Bioluminescent Sea-Cave Grotto:</strong> You descended beneath your Personal Pocket Atoll into the glowing Starlight Cavern!', 'lore');

          window.BlahajNetwork.send({
            type: 'zone_change',
            zone: 'sea_cave'
          });
        }, 180);
      }
    }, 70);
  }

  function exitSeaCaveGrotto() {
    if (isTransitioningZone) return;
    isTransitioningZone = true;

    const overlay = document.getElementById('instance-loading');
    const titleEl = document.getElementById('instance-loading-title');
    const subEl = document.getElementById('instance-loading-sub');
    const barEl = document.getElementById('instance-progress-fill');

    if (titleEl) titleEl.textContent = 'Ascending to Your Personal Pocket Atoll';
    if (subEl) subEl.textContent = 'Emerging into the South Lagoon sunshine… 🏝️☀️🦈';
    if (barEl) barEl.style.width = '0%';
    if (overlay) overlay.classList.remove('hidden');

    CozyAudio.portalChime();

    let p = 0;
    const interval = setInterval(() => {
      p += 25;
      if (barEl) barEl.style.width = `${p}%`;
      if (p >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          currentZone = 'island';
          if (window.BlahajHomestead) {
            window.BlahajHomestead.setActive(false);
          }
          if (player.mesh) {
            if (player.mesh.parent) player.mesh.parent.remove(player.mesh);
            scene.add(player.mesh);
          }
          const spawnX = 0.0;
          const spawnZ = 216.0;
          const sy = worldApi.getGroundAndStructureHeight(spawnX, spawnZ);
          player.pos.set(spawnX, sy, spawnZ);
          player.rotY = Math.PI;
          camState.yaw = 0.0;
          if (player.mesh) {
            player.mesh.position.copy(player.pos);
            player.mesh.rotation.y = player.rotY;
          }
          player.velY = 0;
          player.isGrounded = true;

          if (overlay) overlay.classList.add('hidden');
          isTransitioningZone = false;
          updateCoopPartnerVisibility();

          showToast('RETURNED TO PERSONAL POCKET ATOLL! 🏝️✨', 'Back on the surface bluff of your South Lagoon Atoll!');
          window.BlahajNetwork.send({
            type: 'zone_change',
            zone: 'island'
          });
        }, 180);
      }
    }, 70);
  }

  function enterSpaceMap(broadcast = true, force = false) {
    if ((!force && isTransitioningZone) || currentZone === 'space') return;
    isTransitioningZone = true;
    if (broadcast && window.BlahajNetwork && typeof window.BlahajNetwork.send === 'function') {
      window.BlahajNetwork.send({ type: 'zone_change', zone: 'space' });
    }

    const overlay = document.getElementById('instance-loading');
    const titleEl = document.getElementById('instance-loading-title');
    const subEl = document.getElementById('instance-loading-sub');
    const barEl = document.getElementById('instance-progress-fill');

    if (titleEl) titleEl.textContent = 'Breaching the Karman Orbital Portal';
    if (subEl) subEl.textContent = 'Rematerializing S.S. Shonk-Saucer in Deep Space Orbit… 🛸🪐🦈';
    if (barEl) barEl.style.width = '0%';
    if (overlay) overlay.classList.remove('hidden');

    CozyAudio.portalChime();

    let p = 0;
    const interval = setInterval(() => {
      p += 25;
      if (barEl) barEl.style.width = `${p}%`;
      if (p >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          if (window.BlahajSpace && typeof window.BlahajSpace.build === 'function') {
            window.BlahajSpace.build();
          }
          const spaceScene = window.BlahajSpace ? window.BlahajSpace.getScene() : null;
          currentZone = 'space';
          if (player.mesh && spaceScene) {
            if (player.mesh.parent) player.mesh.parent.remove(player.mesh);
            spaceScene.add(player.mesh);
          }
          if (coopPartner.mesh && spaceScene) {
            if (coopPartner.mesh.parent) coopPartner.mesh.parent.remove(coopPartner.mesh);
            spaceScene.add(coopPartner.mesh);
          }
          if (window.BlahajUFO && typeof window.BlahajUFO.setSpaceMode === 'function') {
            window.BlahajUFO.setSpaceMode(true, spaceScene || scene);
          }
          saveUfoIslandSpawnPoint();

          if (overlay) overlay.classList.add('hidden');
          isTransitioningZone = false;
          updateCoopPartnerVisibility();

          showToast(
            '🪐 REMATERIALIZED IN DEEP SPACE ORBIT!',
            'Switch to Ray Turrets and Left-Click to shatter space rocks! Spot the flat-top Blåhaj Island planetary wedge in the distance!'
          );
          addChatLog('🛸🪐 <strong>Orbital Portal Breach:</strong> S.S. Shonk-Saucer rematerialized in <strong>Deep Space Orbit</strong>! Blast tumbling asteroids with your Ray Turrets or fly through the Cyan Re-Entry Gate to return!', 'lore');

          if (broadcast && window.BlahajNetwork && typeof window.BlahajNetwork.send === 'function') {
            window.BlahajNetwork.send({
              type: 'space_event',
              action: 'warp_to_space'
            });
            window.BlahajNetwork.send({
              type: 'zone_change',
              zone: 'space'
            });
          }
        }, 160);
      }
    }, 55);
  }

  function exitSpaceMap(broadcast = true, force = false) {
    if ((!force && isTransitioningZone) || (currentZone !== 'space' && currentZone !== 'cheese_moon' && currentZone !== 'hyperspace')) return;
    isTransitioningZone = true;
    if (broadcast && window.BlahajNetwork && typeof window.BlahajNetwork.send === 'function') {
      window.BlahajNetwork.send({ type: 'zone_change', zone: 'island' });
    }

    const overlay = document.getElementById('instance-loading');
    const titleEl = document.getElementById('instance-loading-title');
    const subEl = document.getElementById('instance-loading-sub');
    const barEl = document.getElementById('instance-progress-fill');

    if (titleEl) titleEl.textContent = 'Atmospheric Re-Entry to Blåhaj Island';
    if (subEl) subEl.textContent = 'Diving through the turquoise Atmosphere Dome… 🛸🌤️🏝️';
    if (barEl) barEl.style.width = '0%';
    if (overlay) overlay.classList.remove('hidden');

    CozyAudio.portalChime();

    let p = 0;
    const interval = setInterval(() => {
      p += 25;
      if (barEl) barEl.style.width = `${p}%`;
      if (p >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          currentZone = 'island';
          if (player.mesh) {
            if (player.mesh.parent) player.mesh.parent.remove(player.mesh);
            scene.add(player.mesh);
          }
          if (coopPartner.mesh) {
            if (coopPartner.mesh.parent) coopPartner.mesh.parent.remove(coopPartner.mesh);
            scene.add(coopPartner.mesh);
          }
          if (window.BlahajUFO && typeof window.BlahajUFO.setSpaceMode === 'function') {
            window.BlahajUFO.setSpaceMode(false, scene);
          }

          if (overlay) overlay.classList.add('hidden');
          isTransitioningZone = false;
          updateCoopPartnerVisibility();

          showToast('🏝️ ATMOSPHERIC RE-ENTRY COMPLETE!', 'Cruising in Blåhaj Island upper sky (130m AGL)!');
          addChatLog('🛸🏝️ <strong>Atmospheric Re-Entry:</strong> S.S. Shonk-Saucer returned from Deep Space to Blåhaj Island sky!', 'lore');

          if (broadcast && window.BlahajNetwork && typeof window.BlahajNetwork.send === 'function') {
            window.BlahajNetwork.send({
              type: 'space_event',
              action: 'return_to_island'
            });
            window.BlahajNetwork.send({
              type: 'zone_change',
              zone: 'island'
            });
          }
        }, 160);
      }
    }, 55);
  }

  let localPilotPauseMenuOpen = false;
  let localStoryPauseOpen = false;
  let storyPauseOpenedAt = 0;
  let remotePilotPauseState = { paused: false, zone: null, reason: '' };

  function isUfoFlightOrSpaceInstance() {
    const ufoSt = (window.BlahajUFO && typeof window.BlahajUFO.getState === 'function')
      ? window.BlahajUFO.getState()
      : null;
    if (currentZone === 'space' || currentZone === 'cheese_moon' || currentZone === 'hyperspace') return true;
    return !!(ufoSt && ufoSt.localRole);
  }

  function isLocalUfoPilot() {
    const ufoSt = (window.BlahajUFO && typeof window.BlahajUFO.getState === 'function')
      ? window.BlahajUFO.getState()
      : null;
    return !!(ufoSt && ufoSt.localRole === 'pilot');
  }

  function isCurrentInstancePaused() {
    if (localStoryPauseOpen) return true;
    if (localPilotPauseMenuOpen && isUfoFlightOrSpaceInstance()) return true;
    if (remotePilotPauseState.paused) {
      const ufoSt = (window.BlahajUFO && typeof window.BlahajUFO.getState === 'function')
        ? window.BlahajUFO.getState()
        : null;
      const inSameZone = remotePilotPauseState.zone && remotePilotPauseState.zone === currentZone;
      const isPassengerInUfo = !!(ufoSt && ufoSt.localRole === 'passenger');
      if (inSameZone || isPassengerInUfo) return true;
    }
    return false;
  }

  function updateRemotePilotPauseBanner() {
    let banner = document.getElementById('pilot-instance-pause-banner');
    const ufoSt = (window.BlahajUFO && typeof window.BlahajUFO.getState === 'function')
      ? window.BlahajUFO.getState()
      : null;
    const showRemoteFreeze = !!(
      remotePilotPauseState.paused &&
      !localPilotPauseMenuOpen &&
      !localStoryPauseOpen &&
      ((remotePilotPauseState.zone && remotePilotPauseState.zone === currentZone) ||
        (ufoSt && ufoSt.localRole === 'passenger'))
    );
    if (!showRemoteFreeze) {
      if (banner) banner.style.display = 'none';
      return;
    }
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'pilot-instance-pause-banner';
      banner.style.cssText = [
        'position:fixed',
        'top:82px',
        'left:50%',
        'transform:translateX(-50%)',
        'z-index:9600',
        'background:rgba(15, 23, 42, 0.94)',
        'border:2px solid #facc15',
        'border-radius:14px',
        'padding:12px 24px',
        'color:#fef08a',
        'font-family:system-ui,-apple-system,sans-serif',
        'font-weight:800',
        'font-size:15px',
        'letter-spacing:0.04em',
        'box-shadow:0 12px 32px rgba(0,0,0,0.65)',
        'text-align:center',
        'pointer-events:none'
      ].join(';');
      document.body.appendChild(banner);
    }
    const reasonTxt = remotePilotPauseState.reason || 'Pilot paused the instance';
    banner.innerHTML = `⏸️ INSTANCE FROZEN BY UFO PILOT<div style="font-size:12px;font-weight:600;color:#cbd5e1;margin-top:3px;">${reasonTxt} · Waiting for Pilot to resume…</div>`;
    banner.style.display = 'block';
  }

  function broadcastPilotInstancePause() {
    if (!isLocalUfoPilot() && currentZone !== 'space' && currentZone !== 'cheese_moon') return;
    const paused = !!(localPilotPauseMenuOpen || localStoryPauseOpen);
    const reason = localStoryPauseOpen
      ? 'Pilot is reading a discovery update'
      : 'Pilot opened the Pause Menu';
    if (window.BlahajNetwork && typeof window.BlahajNetwork.send === 'function') {
      window.BlahajNetwork.send({
        type: 'ufo_instance_pause',
        paused,
        zone: currentZone,
        reason
      });
    }
  }

  function showStoryPauseModal(opts = {}) {
    let modal = document.getElementById('ufo-story-pause-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'ufo-story-pause-modal';
      modal.style.cssText = [
        'position:fixed',
        'inset:0',
        'z-index:9750',
        'display:flex',
        'align-items:center',
        'justify-content:center',
        'background:rgba(6, 10, 22, 0.72)',
        'backdrop-filter:blur(5px)'
      ].join(';');
      modal.innerHTML = `
        <div id="ufo-story-pause-card" style="max-width:560px;width:92%;background:linear-gradient(165deg, rgba(15,23,42,0.97), rgba(30,27,75,0.96));border:2px solid #facc15;border-radius:18px;padding:24px 28px;color:#f8fafc;box-shadow:0 20px 55px rgba(0,0,0,0.8), 0 0 28px rgba(250,204,21,0.22);font-family:system-ui,-apple-system,sans-serif;">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px;">
            <span id="ufo-story-pause-badge" style="background:rgba(250,204,21,0.18);border:1px solid #facc15;color:#fef08a;font-size:11px;font-weight:800;letter-spacing:0.08em;padding:4px 10px;border-radius:999px;text-transform:uppercase;">💭 INNER THOUGHT · INSTANCE PAUSED</span>
            <span style="color:#94a3b8;font-size:11px;font-weight:700;">⏸️ SIMULATION FROZEN</span>
          </div>
          <h3 id="ufo-story-pause-title" style="margin:0 0 12px 0;font-size:21px;font-weight:800;color:#fef08a;line-height:1.25;"></h3>
          <div id="ufo-story-pause-body" style="font-size:15px;line-height:1.58;color:#e2e8f0;margin-bottom:16px;"></div>
          <div id="ufo-story-pause-hint" style="background:rgba(56,189,248,0.13);border-left:3px solid #38bdf8;padding:10px 14px;border-radius:8px;font-size:13px;color:#bae6fd;margin-bottom:18px;font-weight:600;"></div>
          <div style="display:flex;justify-content:flex-end;">
            <button type="button" id="ufo-story-pause-btn" style="background:linear-gradient(135deg,#facc15,#eab308);color:#0f172a;border:none;border-radius:10px;padding:10px 22px;font-size:14px;font-weight:800;cursor:pointer;box-shadow:0 4px 14px rgba(250,204,21,0.35);">▶ Continue Flight [Space / Enter]</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      modal.addEventListener('click', (e) => {
        if (performance.now() - storyPauseOpenedAt < 220) return;
        e.stopPropagation();
        closeStoryPauseModal();
      });
    }
    const badgeEl = document.getElementById('ufo-story-pause-badge');
    const titleEl = document.getElementById('ufo-story-pause-title');
    const bodyEl = document.getElementById('ufo-story-pause-body');
    const hintEl = document.getElementById('ufo-story-pause-hint');
    const btnEl = document.getElementById('ufo-story-pause-btn');

    if (badgeEl) badgeEl.textContent = opts.badge || '💭 INNER THOUGHT · INSTANCE PAUSED';
    if (titleEl) titleEl.textContent = opts.title || 'New Discovery';
    if (bodyEl) bodyEl.innerHTML = opts.body || '';
    if (hintEl) {
      hintEl.innerHTML = opts.hint || '';
      hintEl.style.display = opts.hint ? 'block' : 'none';
    }
    if (btnEl) btnEl.textContent = opts.buttonText || '▶ Continue Flight [Space / Enter]';

    localStoryPauseOpen = true;
    storyPauseOpenedAt = performance.now();
    modal.style.display = 'flex';
    if (window.CozyAudio && window.CozyAudio.portalChime) window.CozyAudio.portalChime();
    broadcastPilotInstancePause();
  }

  function closeStoryPauseModal() {
    const modal = document.getElementById('ufo-story-pause-modal');
    if (modal) modal.style.display = 'none';
    if (!localStoryPauseOpen) return;
    localStoryPauseOpen = false;
    broadcastPilotInstancePause();
  }

  window.addEventListener('keydown', (e) => {
    if (!localStoryPauseOpen) return;
    if (performance.now() - storyPauseOpenedAt < 220) return;
    if (e.key === ' ' || e.key === 'Enter' || e.key === 'e' || e.key === 'E' || e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      closeStoryPauseModal();
    }
  }, true);

  function enterCheeseMoon(broadcast = true, force = false) {
    if ((!force && isTransitioningZone) || currentZone === 'cheese_moon') return;
    isTransitioningZone = true;
    if (broadcast && window.BlahajNetwork && typeof window.BlahajNetwork.send === 'function') {
      window.BlahajNetwork.send({ type: 'zone_change', zone: 'cheese_moon' });
    }

    const overlay = document.getElementById('instance-loading');
    const titleEl = document.getElementById('instance-loading-title');
    const subEl = document.getElementById('instance-loading-sub');
    const barEl = document.getElementById('instance-progress-fill');

    if (titleEl) titleEl.textContent = 'Hyper-Warping to the Swiss Cheese Planetoid';
    if (subEl) subEl.textContent = 'Entering Total Solar Eclipse Canyon… 🧀🌑👾';
    if (barEl) barEl.style.width = '0%';
    if (overlay) overlay.classList.remove('hidden');

    CozyAudio.portalChime();

    let p = 0;
    const interval = setInterval(() => {
      p += 25;
      if (barEl) barEl.style.width = `${p}%`;
      if (p >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          if (window.BlahajCheeseMoon && typeof window.BlahajCheeseMoon.build === 'function') {
            window.BlahajCheeseMoon.build();
          }
          const cheeseScene = window.BlahajCheeseMoon ? window.BlahajCheeseMoon.getScene() : null;
          currentZone = 'cheese_moon';
          if (player.mesh && cheeseScene) {
            if (player.mesh.parent) player.mesh.parent.remove(player.mesh);
            cheeseScene.add(player.mesh);
          }
          if (coopPartner.mesh && cheeseScene) {
            if (coopPartner.mesh.parent) coopPartner.mesh.parent.remove(coopPartner.mesh);
            cheeseScene.add(coopPartner.mesh);
          }
          if (window.BlahajUFO && typeof window.BlahajUFO.setSpaceMode === 'function') {
            window.BlahajUFO.setSpaceMode(true, cheeseScene || scene, true, false);
          }
          try {
            localStorage.setItem('blahaj_cheese_moon_unlocked_v1', 'true');
          } catch (e) {}
          saveUfoIslandSpawnPoint();

          if (overlay) overlay.classList.add('hidden');
          isTransitioningZone = false;
          updateCoopPartnerVisibility();

          showToast(
            '🧀🌑 SWISS CHEESE PLANETOID — EERIE SILENCE',
            'The trenches are strangely quiet… Switch to [3] Aetheric Radar & Left-Click to scan the canyons!'
          );
          addChatLog('🧀🌑 <strong>Swiss Cheese Planetoid:</strong> The eclipsed canyons are eerily still. Select <strong>[3] Aetheric Radar</strong> and <strong>Left-Click</strong> to scan the trenches!', 'lore');

          if (window.BlahajCheeseMoon && typeof window.BlahajCheeseMoon.onEnterZone === 'function') {
            window.BlahajCheeseMoon.onEnterZone();
          }

          if (broadcast && window.BlahajNetwork && typeof window.BlahajNetwork.send === 'function') {
            window.BlahajNetwork.send({ type: 'zone_change', zone: 'cheese_moon' });
          }
        }, 160);
      }
    }, 55);
  }

  function returnHomeFromCheeseMoon(broadcast = true) {
    if (currentZone !== 'cheese_moon' && currentZone !== 'hyperspace' && currentZone !== 'space') return;
    exitSpaceMap(broadcast, true);
  }

  function enterHyperspace(broadcast = true, force = false) {
    if ((!force && isTransitioningZone) || currentZone === 'hyperspace') return;
    isTransitioningZone = true;
    if (broadcast && window.BlahajNetwork && typeof window.BlahajNetwork.send === 'function') {
      window.BlahajNetwork.send({ type: 'zone_change', zone: 'hyperspace' });
    }

    const overlay = document.getElementById('instance-loading');
    const titleEl = document.getElementById('instance-loading-title');
    const subEl = document.getElementById('instance-loading-sub');
    const barEl = document.getElementById('instance-progress-fill');

    if (titleEl) titleEl.textContent = 'Engaging Mojo Hyperdrive';
    if (subEl) subEl.textContent = 'Tearing into the Hyperspace Crossroads… ⚡🌀';
    if (barEl) barEl.style.width = '0%';
    if (overlay) overlay.classList.remove('hidden');

    CozyAudio.portalChime();

    let p = 0;
    const interval = setInterval(() => {
      p += 34;
      if (barEl) barEl.style.width = `${Math.min(100, p)}%`;
      if (p >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          if (window.BlahajHyperspace && typeof window.BlahajHyperspace.build === 'function') {
            window.BlahajHyperspace.build();
          }
          const hyperScene = window.BlahajHyperspace ? window.BlahajHyperspace.getScene() : null;
          currentZone = 'hyperspace';
          if (player.mesh && hyperScene) {
            if (player.mesh.parent) player.mesh.parent.remove(player.mesh);
            hyperScene.add(player.mesh);
          }
          if (coopPartner.mesh && hyperScene) {
            if (coopPartner.mesh.parent) coopPartner.mesh.parent.remove(coopPartner.mesh);
            hyperScene.add(coopPartner.mesh);
          }
          if (window.BlahajUFO && typeof window.BlahajUFO.setSpaceMode === 'function') {
            window.BlahajUFO.setSpaceMode(true, hyperScene || scene, false, true);
          }
          saveHyperspaceCheckpoint();

          if (overlay) overlay.classList.add('hidden');
          isTransitioningZone = false;
          updateCoopPartnerVisibility();

          if (window.BlahajHyperspace && typeof window.BlahajHyperspace.onEnterZone === 'function') {
            window.BlahajHyperspace.onEnterZone();
          }

          showToast(
            '⚡🌀 MOJO HYPERSPACE CROSSROADS!',
            'Steer Left/Right [A/D or Mouse] into an Off-Ramp, stay centered to keep looping, or press [R] to rewind to #1!'
          );

          if (broadcast && window.BlahajNetwork && typeof window.BlahajNetwork.send === 'function') {
            window.BlahajNetwork.send({ type: 'zone_change', zone: 'hyperspace' });
          }
        }, 120);
      }
    }, 45);
  }

  function exitHyperspaceTo(targetZone, broadcast = true, force = false) {
    if ((!force && isTransitioningZone) || currentZone !== 'hyperspace') return;
    if (targetZone === 'island' || targetZone === 'overworld') {
      exitSpaceMap(broadcast, true);
      return;
    }
    if (targetZone === 'cheese_moon') {
      enterCheeseMoon(broadcast, true);
      return;
    }
    // Default: Deep Space Orbit ('space')
    isTransitioningZone = true;
    if (broadcast && window.BlahajNetwork && typeof window.BlahajNetwork.send === 'function') {
      window.BlahajNetwork.send({ type: 'zone_change', zone: 'space' });
    }
    const overlay = document.getElementById('instance-loading');
    const titleEl = document.getElementById('instance-loading-title');
    const subEl = document.getElementById('instance-loading-sub');
    const barEl = document.getElementById('instance-progress-fill');

    if (titleEl) titleEl.textContent = 'Exiting Hyperspace Slipstream';
    if (subEl) subEl.textContent = 'Dropping into Deep Space Orbit… 🪐✨';
    if (barEl) barEl.style.width = '0%';
    if (overlay) overlay.classList.remove('hidden');

    CozyAudio.portalChime();
    let p = 0;
    const interval = setInterval(() => {
      p += 34;
      if (barEl) barEl.style.width = `${Math.min(100, p)}%`;
      if (p >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          if (window.BlahajSpace && typeof window.BlahajSpace.build === 'function') {
            window.BlahajSpace.build();
          }
          const spaceScene = window.BlahajSpace ? window.BlahajSpace.getScene() : null;
          currentZone = 'space';
          if (player.mesh && spaceScene) {
            if (player.mesh.parent) player.mesh.parent.remove(player.mesh);
            spaceScene.add(player.mesh);
          }
          if (coopPartner.mesh && spaceScene) {
            if (coopPartner.mesh.parent) coopPartner.mesh.parent.remove(coopPartner.mesh);
            spaceScene.add(coopPartner.mesh);
          }
          if (window.BlahajUFO && typeof window.BlahajUFO.setSpaceMode === 'function') {
            window.BlahajUFO.setSpaceMode(true, spaceScene || scene, false, false);
          }
          if (overlay) overlay.classList.add('hidden');
          isTransitioningZone = false;
          updateCoopPartnerVisibility();
          showToast('🪐 DEEP SPACE ORBIT', 'Emerged from the Mojo Hyperspace Crossroads!');
          if (broadcast && window.BlahajNetwork && typeof window.BlahajNetwork.send === 'function') {
            window.BlahajNetwork.send({ type: 'zone_change', zone: 'space' });
          }
        }, 120);
      }
    }, 45);
  }

  function exitCheeseMoon(broadcast = true) {
    if (isTransitioningZone || currentZone !== 'cheese_moon') return;
    isTransitioningZone = true;

    const overlay = document.getElementById('instance-loading');
    const titleEl = document.getElementById('instance-loading-title');
    const subEl = document.getElementById('instance-loading-sub');
    const barEl = document.getElementById('instance-progress-fill');

    if (titleEl) titleEl.textContent = 'Returning to Deep Space Orbit';
    if (subEl) subEl.textContent = 'Clearing the Swiss Cheese Planetoid gravity well… 🛸🪐';
    if (barEl) barEl.style.width = '0%';
    if (overlay) overlay.classList.remove('hidden');

    CozyAudio.portalChime();

    let p = 0;
    const interval = setInterval(() => {
      p += 25;
      if (barEl) barEl.style.width = `${p}%`;
      if (p >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          if (window.BlahajSpace && typeof window.BlahajSpace.build === 'function') {
            window.BlahajSpace.build();
          }
          const spaceScene = window.BlahajSpace ? window.BlahajSpace.getScene() : null;
          currentZone = 'space';
          if (player.mesh && spaceScene) {
            if (player.mesh.parent) player.mesh.parent.remove(player.mesh);
            spaceScene.add(player.mesh);
          }
          if (coopPartner.mesh && spaceScene) {
            if (coopPartner.mesh.parent) coopPartner.mesh.parent.remove(coopPartner.mesh);
            spaceScene.add(coopPartner.mesh);
          }
          if (window.BlahajUFO && typeof window.BlahajUFO.setSpaceMode === 'function') {
            window.BlahajUFO.setSpaceMode(true, spaceScene || scene, false);
          }

          if (overlay) overlay.classList.add('hidden');
          isTransitioningZone = false;
          updateCoopPartnerVisibility();

          showToast('🪐 BACK IN DEEP SPACE ORBIT!', 'Returned from the Swiss Cheese Planetoid!');
          if (broadcast && window.BlahajNetwork && typeof window.BlahajNetwork.send === 'function') {
            window.BlahajNetwork.send({ type: 'zone_change', zone: 'space' });
          }
        }, 160);
      }
    }, 55);
  }

  function syncHomesteadCommissionsUI() {
    if (!window.BlahajHomestead) return;
    const fpCount = player.inventory ? player.inventory.getCount('flatpack_crate') : 0;
    const qzCount = player.inventory ? player.inventory.getCount('starlight_quartz') : 0;
    const fpEl = document.getElementById('hs-flatpack-count');
    if (fpEl) fpEl.textContent = fpCount;
    const qzEl = document.getElementById('hs-quartz-count');
    if (qzEl) qzEl.textContent = qzCount;

    const compEl = document.getElementById('hs-companion-count');
    if (compEl) {
      try {
        const book = JSON.parse(localStorage.getItem('blahaj_book_of_named_sharks_v1') || '[]');
        compEl.textContent = Math.max(3, book.length + 3);
      } catch (e) {
        compEl.textContent = '3';
      }
    }

    const activeSpec = window.BlahajHomestead.getBoatSpec();
    const activeBoatLbl = document.getElementById('hs-active-boat-label');
    if (activeBoatLbl && activeSpec) {
      activeBoatLbl.textContent = `${activeSpec.code} (${activeSpec.speedMult.toFixed(2)}x Speed)`;
    }

    // 1. Render Boat Tier Cards
    const boatGrid = document.getElementById('hs-boat-tier-grid');
    if (boatGrid) {
      const catalog = (LORE && LORE.boatCatalog) || [];
      const curTier = window.BlahajHomestead.getBoatTier();
      boatGrid.innerHTML = catalog.map((b) => {
        const isCurrent = curTier === b.tier;
        const isUnlocked = curTier >= b.tier;
        const costStr = b.tier === 1
          ? 'Included with Charter'
          : (b.costQuartz > 0 ? `${b.costFlatpacks}x Flat-Pack 📦 + ${b.costQuartz}x Quartz 💎` : `${b.costFlatpacks}x Flat-Pack Kits 📦`);
        return `
          <div style="padding: 12px; border-radius: 12px; background: ${isCurrent ? 'rgba(2, 132, 199, 0.32)' : 'rgba(15, 23, 42, 0.78)'}; border: 2px solid ${isCurrent ? '#38bdf8' : 'rgba(148, 163, 184, 0.3)'}; display: flex; flex-direction: column; justify-content: space-between; gap: 8px;">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <span style="font-size: 0.72rem; font-weight: 900; color: #fde047;">TIER ${b.tier} · ${b.code}</span>
                <span style="font-size: 0.72rem; font-weight: 800; color: #38bdf8;">${b.badge}</span>
              </div>
              <div style="font-size: 0.94rem; font-weight: 800; color: #ffffff; margin-bottom: 4px;">${b.name}</div>
              <div style="font-size: 0.77rem; color: #cbd5e1; line-height: 1.35;">${b.desc}</div>
            </div>
            <div>
              <div style="font-size: 0.74rem; color: #fef08a; margin-bottom: 6px;">Requirement: <strong>${costStr}</strong></div>
              <button type="button" class="${isCurrent ? 'btn-secondary' : 'btn-primary'} btn-select-boat-tier" data-tier="${b.tier}" style="width: 100%; padding: 7px 10px; font-size: 0.8rem;">
                ${isCurrent ? '✓ Active Charter Vessel (Click to Sail)' : (isUnlocked ? `Equip ${b.code} ⛵` : `Build & Upgrade to ${b.code} 🔧`)}
              </button>
            </div>
          </div>
        `;
      }).join('');

      boatGrid.querySelectorAll('.btn-select-boat-tier').forEach((btn) => {
        btn.addEventListener('click', () => {
          const targetTier = Number(btn.getAttribute('data-tier')) || 1;
          const spec = ((LORE && LORE.boatCatalog) || []).find((x) => x.tier === targetTier);
          if (!spec) return;
          const curT = window.BlahajHomestead.getBoatTier();
          if (targetTier > curT && !builderState.freeBuild) {
            const haveFp = player.inventory ? player.inventory.getCount('flatpack_crate') : 0;
            const haveQz = player.inventory ? player.inventory.getCount('starlight_quartz') : 0;
            if (haveFp < spec.costFlatpacks || haveQz < spec.costQuartz) {
              // Allow Founder Archodects or grant starter materials with clear feedback if short
              const isFounder = window.BlahajSaveSystem && window.BlahajSaveSystem.isFounderArchodect && window.BlahajSaveSystem.isFounderArchodect();
              if (!isFounder) {
                showToast('NEED SHIPYARD MATERIALS 📦💎', `Requires ${spec.costFlatpacks}x SKÄRHAJ Flat-Pack Kits & ${spec.costQuartz}x Starlight Cave Quartz (mine in the Sea-Cave or use BYGGBÄNK Sawmill)!`);
                return;
              }
            } else if (player.inventory) {
              if (spec.costFlatpacks > 0) player.inventory.removeItem('flatpack_crate', spec.costFlatpacks);
              if (spec.costQuartz > 0) player.inventory.removeItem('starlight_quartz', spec.costQuartz);
            }
          }
          window.BlahajHomestead.setBoatTier(targetTier);
          CozyAudio.allenBuild();
          spawnFloatingBurst(player.pos, 0x38bdf8, 22);
          syncHomesteadCommissionsUI();
          showToast(`⛵ BÅT-BYGGE VESSEL ACTIVE: ${spec.code}!`, `${spec.name} moored at your Personal Atoll Dock (${spec.speedMult}x Speed · Press [H] while sailing to blow whistle)!`);
          addChatLog(`⚓⛵ <strong>BÅT-BYGGE Boat Shipyard:</strong> Outfitted your personal vessel as <strong>${spec.name}</strong> (${spec.badge})!`, 'lore');
        });
      });
    }

    // 2. Render Daily Founder Commissions Grid
    const commGrid = document.getElementById('hs-commissions-grid');
    if (commGrid) {
      const comms = (LORE && LORE.dailyCommissions) || [];
      const hsState = window.BlahajHomestead.getState();
      commGrid.innerHTML = comms.map((c) => {
        const claimed = window.BlahajHomestead.isCommissionClaimed(c.id);
        const prog = (hsState.commissionsProgress && hsState.commissionsProgress[c.id]) || 0;
        return `
          <div style="padding: 12px; border-radius: 12px; background: ${claimed ? 'rgba(6, 78, 59, 0.35)' : 'rgba(15, 23, 42, 0.82)'}; border: 1px solid ${claimed ? '#34d399' : 'rgba(251, 191, 36, 0.45)'}; display: flex; gap: 12px; align-items: center;">
            <img src="${c.portrait}" alt="${c.founder}" style="width: 58px; height: 58px; border-radius: 50%; object-fit: cover; border: 2px solid #fbbf24; flex-shrink: 0;" />
            <div style="flex: 1;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 0.72rem; font-weight: 900; color: #fbbf24; text-transform: uppercase;">👑 ${c.founder} · ${c.patronRole}</span>
                <span style="font-size: 0.72rem; font-weight: 800; color: ${claimed ? '#34d399' : '#38bdf8'};">${claimed ? '✓ Completed Today' : `Progress: ${prog}/1`}</span>
              </div>
              <div style="font-size: 0.95rem; font-weight: 800; color: #ffffff; margin: 2px 0;">${c.title}</div>
              <div style="font-size: 0.76rem; color: #cbd5e1; margin-bottom: 6px;">${c.desc}</div>
              <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap;">
                <span style="font-size: 0.73rem; font-weight: 700; color: #fef08a;">🎁 ${c.rewardLabel}</span>
                <button type="button" class="${claimed ? 'btn-secondary' : 'btn-accent'} btn-claim-commission" data-comm-id="${c.id}" style="padding: 6px 12px; font-size: 0.78rem;">
                  ${claimed ? '✓ Claimed (Bonus Repeat +1 📦)' : '👑 Complete & Claim Reward'}
                </button>
              </div>
            </div>
          </div>
        `;
      }).join('');

      commGrid.querySelectorAll('.btn-claim-commission').forEach((btn) => {
        btn.addEventListener('click', () => {
          const cid = btn.getAttribute('data-comm-id');
          const spec = ((LORE && LORE.dailyCommissions) || []).find((x) => x.id === cid);
          if (!spec) return;
          const already = window.BlahajHomestead.isCommissionClaimed(cid);
          if (already) {
            if (player.inventory) player.inventory.addItem('flatpack_crate', 1);
            CozyAudio.portalChime();
            syncHomesteadCommissionsUI();
            renderBuilderToolbar();
            showToast(`👑 ${spec.founder.toUpperCase()} ENCORE COMMISSION!`, '+1 Bonus SKÄRHAJ Flat-Pack Kit awarded for ongoing devotion!');
            return;
          }
          window.BlahajHomestead.recordCommissionProgress(cid, 1);
          window.BlahajHomestead.markCommissionClaimed(cid);
          if (player.inventory) {
            if (spec.rewardFlatpacks) player.inventory.addItem('flatpack_crate', spec.rewardFlatpacks);
            if (spec.rewardItem) player.inventory.addItem(spec.rewardItem, spec.rewardItemQty || 1);
          }
          if (spec.rewardBirbs) player.birbsFedCount += spec.rewardBirbs;
          if (spec.rewardCarrots) player.carrotsKnockedCount += spec.rewardCarrots;
          if (spec.rewardTrials) player.trialPoints = (player.trialPoints || 0) + spec.rewardTrials;
          player.teaComfort = 100;
          player.warmth = 100;
          CozyAudio.portalChime();
          spawnFloatingBurst(player.pos, 0xfbbf24, 24);
          updateMetersUI();
          renderBuilderToolbar();
          syncHomesteadCommissionsUI();
          showToast(`👑 COMMISSION COMPLETED: ${spec.title.toUpperCase()}!`, `Received ${spec.rewardLabel}!`);
          addChatLog(`👑📋 <strong>Daily Founder Commission (${spec.founder}):</strong> Completed <em>${spec.title}</em> and received <strong>${spec.rewardLabel}</strong>!`, 'lore');
        });
      });
    }
  }

  function openHomesteadCommissionsModal() {
    releasePointerLock();
    const modal = document.getElementById('modal-homestead-commissions');
    if (!modal) return;
    syncHomesteadCommissionsUI();
    modal.classList.remove('hidden');
    CozyAudio.portalChime();
  }

  function closeHomesteadCommissionsModal() {
    const modal = document.getElementById('modal-homestead-commissions');
    if (modal) modal.classList.add('hidden');
  }

  function toggleHomesteadCommissionsModal() {
    const modal = document.getElementById('modal-homestead-commissions');
    if (!modal) return;
    if (modal.classList.contains('hidden')) openHomesteadCommissionsModal();
    else closeHomesteadCommissionsModal();
  }

  function warpToPersonalPocketAtoll() {
    closeHomesteadCommissionsModal();
    if (currentZone === 'sea_cave') {
      exitSeaCaveGrotto();
      return;
    }
    if (currentZone !== 'island') {
      currentZone = 'island';
      if (window.BlahajSpawningPits) window.BlahajSpawningPits.setActive(false);
      if (player.mesh) {
        if (player.mesh.parent) player.mesh.parent.remove(player.mesh);
        scene.add(player.mesh);
      }
    }
    player.inBoat = false;
    player.ridingWithPartner = false;
    const ax = 0.0;
    const az = 166.0;
    const ay = worldApi.getGroundAndStructureHeight(ax, az);
    player.pos.set(ax, ay, az);
    player.rotY = 0.0;
    camState.yaw = Math.PI;
    if (player.mesh) {
      player.mesh.position.copy(player.pos);
      player.mesh.rotation.y = player.rotY;
    }
    CozyAudio.portalChime();
    spawnFloatingBurst(player.pos, 0x38bdf8, 22);
    showToast('ARRIVED AT PERSONAL POCKET ATOLL! 🏝️⛵', 'Explore your Private Boat Shipyard, BYGGBÄNK Sawmill, Baby Shark Lagoon & Starlight Sea-Cave!');
  }

  function boardCustomAtollBoat() {
    closeHomesteadCommissionsModal();
    if (currentZone !== 'island') {
      warpToPersonalPocketAtoll();
    }
    const boat = worldApi.getBoatMesh();
    const spec = window.BlahajHomestead ? window.BlahajHomestead.getBoatSpec() : { name: 'SKIFF-ETT', code: 'SKIFF-ETT', speedMult: 1.0 };
    if (boat) {
      boat.position.set(0.0, 0.45, 145.5);
    }
    player.inBoat = true;
    player.ridingWithPartner = false;
    player.pos.set(0.0, 1.25, 145.5);
    player.rotY = Math.PI;
    camState.yaw = 0.0;
    CozyAudio.shonk();
    completeQuest('q-boat');
    showToast(`⛵ SAILING ${spec.name.toUpperCase()}!`, `Speed: ${spec.speedMult}x · [WASD] Sail Ocean · [H] Blow Brass Whistle · [Space / E] Disembark!`);
    addChatLog(`⛵💨 Cast off from your Personal Pocket Atoll Pier aboard <strong>${spec.name}</strong>!`, 'cozy');
  }

  function setupHomesteadAndCommissionsUI() {
    document.getElementById('btn-open-homestead-hud')?.addEventListener('click', (e) => { e.stopPropagation(); openHomesteadCommissionsModal(); });
    document.getElementById('close-homestead-modal')?.addEventListener('click', closeHomesteadCommissionsModal);
    document.getElementById('btn-hs-warp-atoll')?.addEventListener('click', warpToPersonalPocketAtoll);
    document.getElementById('btn-hs-enter-seacave')?.addEventListener('click', () => {
      closeHomesteadCommissionsModal();
      enterSeaCaveGrotto();
    });
    document.getElementById('btn-hs-sail-custom-boat')?.addEventListener('click', boardCustomAtollBoat);

    document.getElementById('btn-visit-friend-atoll')?.addEventListener('click', () => {
      const inp = document.getElementById('input-friend-passport-code');
      const rawCode = (inp && inp.value.trim()) ? inp.value.trim().toUpperCase() : 'SHK-RUSSELL';
      const code = rawCode.startsWith('SHK-') ? rawCode : `SHK-${rawCode}`;
      const friendHosts = {
        'SHK-RUSSELL': 'Founder Russell & Solomon',
        'SHK-HELEN': 'Founder Helen & Nimue',
        'SHK-SVENSK': 'Svenskhaj (Liberated #303)',
        'SHK-HIRAM': 'Master Builder Hiram'
      };
      const hostName = friendHosts[code] || `Captain of ${code}`;
      if (window.BlahajHomestead) {
        window.BlahajHomestead.setVisitedFriendAtoll(code, hostName);
      }
      warpToPersonalPocketAtoll();
      showToast(`🧭 VISITING FRIEND ATOLL: ${code}!`, `Docked at ${hostName}’s Pocket Atoll & Starlight Sea-Cave!`);
      addChatLog(`🧭⛵ <strong>Archipelago Sea Chart:</strong> Sailed to <strong>${hostName}’s Pocket Atoll (${code})</strong>!`, 'coop');
    });

    document.getElementById('btn-reset-own-atoll')?.addEventListener('click', () => {
      if (window.BlahajHomestead) {
        window.BlahajHomestead.setVisitedFriendAtoll(null, null);
      }
      warpToPersonalPocketAtoll();
      showToast('🏠 RETURNED TO YOUR CHARTER ATOLL', 'Viewing your own Personal Pocket Atoll Charter!');
    });
  }

  function enterLaundromat() {
    if (isTransitioningZone) return;
    isTransitioningZone = true;
    player.inBoat = false;
    player.ridingWithPartner = false;

    const overlay = document.getElementById('instance-loading');
    const titleEl = document.getElementById('instance-loading-title');
    const subEl = document.getElementById('instance-loading-sub');
    const barEl = document.getElementById('instance-progress-fill');

    titleEl.textContent = 'The First Whirlings';
    subEl.textContent = 'Folding cosmic space to the 24/7 sacred spin between worlds… 🌀🫧';
    barEl.style.width = '0%';
    overlay.classList.remove('hidden');

    CozyAudio.portalChime();

    let p = 0;
    const interval = setInterval(() => {
      p += 25;
      barEl.style.width = `${p}%`;
      if (p >= 100) {
        clearInterval(interval);
        setTimeout(async () => {
          if (window.BlahajLaundromat) {
            await window.BlahajLaundromat.build();
            window.BlahajLaundromat.setActive(true);
            const start = window.BlahajLaundromat.getStart();
            player.pos.set(start.x, start.y, start.z);
            player.rotY = start.rotY;
            currentZone = 'laundromat';
            if (window.BlahajSeam) window.BlahajSeam.onZoneChanged(currentZone);
            if (player.mesh) {
              if (player.mesh.parent) player.mesh.parent.remove(player.mesh);
              window.BlahajLaundromat.getScene().add(player.mesh);
              player.mesh.position.copy(player.pos);
              player.mesh.rotation.y = player.rotY;
            }
          } else {
            currentZone = 'laundromat';
          }
          player.velY = 0;
          player.isGrounded = true;
          camState.yaw = 0;
          updateCamera(0);

          overlay.classList.add('hidden');
          isTransitioningZone = false;
          showToast('THE FIRST WHIRLINGS 🌀🫧', 'Delicate Cycle · Open 24/7. Step inside Giant Washer #7 [E]!');
          addChatLog('🧺 Stepped inside <strong>The First Whirlings</strong>. Fluorescent tubes hum softly over seafoam linoleum.', 'lore');
          updateCoopPartnerVisibility();

          window.BlahajNetwork.send({
            type: 'zone_change',
            zone: 'laundromat',
            sharkId: player.sharkId,
            x: player.pos.x,
            y: player.pos.y,
            z: player.pos.z,
            rotY: player.rotY
          });
        }, 250);
      }
    }, 90);
  }

  // ==========================================================================
  // CRESCENT BEACH SHARK VOLLEYBALL (IN-PLACE ON CRESCENT BEACH)
  // ==========================================================================
  function enterVolleyballCourt(opponentKey) {
    if (player.inBoat) disembarkBoatAtCurrentLocation();
    if (player.inCart) dismountLaundryCart();

    if (window.BlahajVolleyball) {
      window.BlahajVolleyball.setSceneAndPlayer(scene, player);
      if (opponentKey) {
        window.BlahajVolleyball.startMatch(opponentKey, scene, player);
      } else {
        window.BlahajVolleyball.openOpponentSelectModal(openDialogueModal, closeDialogueModal, scene, player);
      }
    }
  }

  function exitVolleyballCourt() {
    if (window.BlahajVolleyball) {
      window.BlahajVolleyball.endMatch();
    }
  }

  function enterSphericalFoods() {
    if (isTransitioningZone) return;
    isTransitioningZone = true;
    player.inBoat = false;
    player.ridingWithPartner = false;
    if (player.inCart) dismountLaundryCart();

    const overlay = document.getElementById('instance-loading');
    const titleEl = document.getElementById('instance-loading-title');
    const subEl = document.getElementById('instance-loading-sub');
    const barEl = document.getElementById('instance-progress-fill');

    titleEl.textContent = 'Spherical Foods Bistro & Rotunda';
    subEl.textContent = 'Entering the grand dining rotunda… Everything is better in a sphere! 🧆✨';
    if (window.BlahajQuests) window.BlahajQuests.recordEvent('spherical_visit_or_order', 1);
    barEl.style.width = '0%';
    overlay.classList.remove('hidden');

    CozyAudio.bistroChime();

    let p = 0;
    const interval = setInterval(() => {
      p += 25;
      barEl.style.width = `${p}%`;
      if (p >= 100) {
        clearInterval(interval);
        setTimeout(async () => {
          try {
            if (window.BlahajSphericalFoods) {
              await window.BlahajSphericalFoods.build();
              window.BlahajSphericalFoods.setActive(true);
              const start = window.BlahajSphericalFoods.getStart();
              player.pos.set(start.x, start.y, start.z);
              player.rotY = start.rotY;
              currentZone = 'spherical_foods';
              if (window.BlahajSeam) window.BlahajSeam.onZoneChanged(currentZone);
              if (player.mesh) {
                if (player.mesh.parent) player.mesh.parent.remove(player.mesh);
                window.BlahajSphericalFoods.getScene().add(player.mesh);
                player.mesh.position.copy(player.pos);
                player.mesh.rotation.y = player.rotY;
              }
            } else {
              currentZone = 'spherical_foods';
            }
            player.velY = 0;
            player.isGrounded = true;
            camState.yaw = 0;
            updateCamera(0);

            const isWeek = window.BlahajSphericalFoods && window.BlahajSphericalFoods.isHelensBirthdayWeek();
            if (isWeek) {
              showToast("HELEN'S BIRTHDAY WEEK! 🎂✨", "Joyeux Anniversaire! Feast your eyes upon Helen's Celestial Birthday Bombe!");
              addChatLog("🎂 Stepped inside <strong>Spherical Foods Bistro</strong>. Festive balloons float around Helen's Birthday Alcove!", 'lore');
              CozyAudio.birthdayFanfare();
            } else {
              showToast('SPHERICAL FOODS BISTRO 🧆', 'No flat food allowed! Step up to Monsieur Betterave [E].');
              addChatLog('🧆 Stepped inside <strong>Spherical Foods Bistro</strong>. Aromatic steam swirls around the brass chandelier.', 'lore');
            }
            updateCoopPartnerVisibility();

            window.BlahajNetwork.send({
              type: 'zone_change',
              zone: 'spherical_foods',
              sharkId: player.sharkId,
              x: player.pos.x,
              y: player.pos.y,
              z: player.pos.z,
              rotY: player.rotY
            });
          } catch (err) {
            console.error('[Blahaj] enterSphericalFoods error:', err);
          } finally {
            overlay.classList.add('hidden');
            isTransitioningZone = false;
          }
        }, 250);
      }
    }, 90);
  }

  function exitSphericalFoods() {
    if (isTransitioningZone) return;
    isTransitioningZone = true;

    const overlay = document.getElementById('instance-loading');
    const titleEl = document.getElementById('instance-loading-title');
    const subEl = document.getElementById('instance-loading-sub');
    const barEl = document.getElementById('instance-progress-fill');

    titleEl.textContent = 'Returning to Blåhaj Island';
    subEl.textContent = 'Stepping through the mahogany doors back to Southwest Bluff… ☀️';
    barEl.style.width = '0%';
    overlay.classList.remove('hidden');

    CozyAudio.portalChime();

    let p = 0;
    const interval = setInterval(() => {
      p += 25;
      barEl.style.width = `${p}%`;
      if (p >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          currentZone = 'island';
          player.isSeatedInBooth = false;
          player.seatedBoothIndex = -1;
          if (window.BlahajSphericalFoods) {
            window.BlahajSphericalFoods.setActive(false);
          }
          player.pos.set(-47.7, 7.4, 42.2);
          player.rotY = 0.55;
          if (player.mesh) {
            if (player.mesh.parent) player.mesh.parent.remove(player.mesh);
            scene.add(player.mesh);
            player.mesh.position.copy(player.pos);
            player.mesh.rotation.y = player.rotY;
          }
          player.velY = 0;
          player.isGrounded = true;
          camState.yaw = 0.55;
          updateCamera(0);

          overlay.classList.add('hidden');
          isTransitioningZone = false;
          showToast('SOUTHWEST BLUFF ☀️', 'Fresh ocean breeze greets you outside Spherical Foods.');
          addChatLog('☀️ Stepped outside <strong>Spherical Foods Bistro</strong> onto the sunlit Southwest Bluff.', 'lore');
          updateCoopPartnerVisibility();

          window.BlahajNetwork.send({
            type: 'zone_change',
            zone: 'island',
            sharkId: player.sharkId,
            x: player.pos.x,
            y: player.pos.y,
            z: player.pos.z,
            rotY: player.rotY
          });
        }, 250);
      }
    }, 90);
  }

  function exitLaundromat() {
    if (player.inCart) dismountLaundryCart();
    if (CozyAudio.stopWasherAudio) CozyAudio.stopWasherAudio();
    if (CozyAudio.stopCartRoll) CozyAudio.stopCartRoll();
    if (isTransitioningZone) return;
    isTransitioningZone = true;

    const overlay = document.getElementById('instance-loading');
    const titleEl = document.getElementById('instance-loading-title');
    const subEl = document.getElementById('instance-loading-sub');
    const barEl = document.getElementById('instance-progress-fill');

    titleEl.textContent = 'Returning to Blåhaj Island';
    subEl.textContent = 'Stepping through the soap-bubble vortex back to East Cape… 🫧';
    barEl.style.width = '0%';
    overlay.classList.remove('hidden');

    CozyAudio.portalChime();

    let p = 0;
    const interval = setInterval(() => {
      p += 25;
      barEl.style.width = `${p}%`;
      if (p >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          currentZone = 'island';
          if (window.BlahajLaundromat) {
            window.BlahajLaundromat.setActive(false);
          }

          if (player.mesh) {
            if (player.mesh.parent) player.mesh.parent.remove(player.mesh);
            scene.add(player.mesh);
          }

          const spawnX = 58.0;
          const spawnZ = -10.0;
          const sy = worldApi.getGroundAndStructureHeight(spawnX, spawnZ);
          player.pos.set(spawnX, sy, spawnZ);
          player.rotY = -Math.PI / 2;
          camState.yaw = -Math.PI / 2;

          if (player.mesh) {
            player.mesh.position.copy(player.pos);
            player.mesh.rotation.y = player.rotY;
          }
          player.velY = 0;
          player.isGrounded = true;

          overlay.classList.add('hidden');
          isTransitioningZone = false;
          showToast('RETURNED TO BLÅHAJ ISLAND', 'Emerged outside the Great Portal Gate on East Cape!');
          updateCoopPartnerVisibility();

          window.BlahajNetwork.send({
            type: 'zone_change',
            zone: 'island',
            sharkId: player.sharkId,
            x: player.pos.x,
            y: player.pos.y,
            z: player.pos.z,
            rotY: player.rotY
          });
        }, 250);
      }
    }, 90);
  }

  function triggerLaundromatSpinCycle() {
    if (player.inCart) dismountLaundryCart();
    if (!window.BlahajLaundromat || window.BlahajLaundromat.isSpinCycleActive()) return;

    // Hop shark right inside the drum facing the front porthole
    player.pos.set(0, 0.45, -16.5);
    player.rotY = 0;
    if (player.mesh) {
      player.mesh.position.copy(player.pos);
      player.mesh.rotation.order = 'XYZ';
      player.mesh.rotation.set(0, 0, 0);
      player.mesh.visible = true;
    }

    // Set camera to frame the front window of the washer clearly
    camState.yaw = 0;
    camState.distance = 4.2;
    camState.pitch = 0.08;
    camState.heightOffset = 1.35;

    showToast('SPIN CYCLE COMMENCED! 🧧🌀', 'Ka-chunk! Door latched. 40°C Warm Delicate Cycle underway!', 4500);
    addChatLog('🌀 <strong>Giant Master Washer & Spin Dryer #7</strong> started! Soapy suds swirl around you.', 'cozy');

    window.BlahajNetwork.send({
      type: 'laundromat_spin_start',
      sharkId: player.sharkId
    });

    window.BlahajLaundromat.startSpinCycle(player, () => {
      window.BlahajNetwork.send({
        type: 'laundromat_spin_end'
      });
      // Upon cycle completion:
      // 1. Reduce Mange factor by -50% (or down to mint condition 0%)
      const nextMange = adjustSharkMange(player.sharkId, -0.50, 'Master Washer #7 Spin Cycle');
      const mangePct = Math.round(nextMange * 100);

      // 2. Max warmth & coherence
      player.warmth = 100;
      updateMetersUI();

      // 3. Grant "Freshly Laundered & Tumble-Fluffed" Buff
      player.launderedBuffTimer = 600.0; // 10 minutes
      player.launderedShieldHits = 2; // 2 trap hits absorbed

      spawnFloatingBurst(player.pos, 0x82e2ff, 25);
      showToast('✨ FRESHLY LAUNDERED & TUMBLE-FLUFFED! ✨', `Mange reduced to ${mangePct}%! +25% Jump Springiness & 2-Hit Shield (10m)`);
      addChatLog(`✨ DING! Cycle complete! Emerged fresh and scented. Mange: <strong>${mangePct}%</strong>. +25% Jump & 2-Hit Shield active!`, 'lore');
    });
  }

  function triggerVolcanoCraterMeltdown(reason = 'Fell into the Volcano Crater') {
    if (isRebirthing) return;
    isRebirthing = true;
    player.trapCooldown = 4.0;
    playerInvulnTimer = 4.5;
    player.warmth = 0;
    updateMetersUI();
    if (typeof updateVitalsHUD === 'function') updateVitalsHUD();

    const sillyEpitaphs = [
      ['🔥🦈 YEEEEEOW!! CRISPY MARSHMALLOW!', 'Your 100% polyester stuffing just achieved toasted s’more status! Shipping back to IKEA...'],
      ['🌋🧸 *SQUEAK-POOF!* WARRANTY VOIDED!', 'Even the volcano winced at that bellyflop! Returning to Wire Bin #303.735.88...'],
      ['💥🦈 DRAMATIC SLOW-MO DEFLATION!', 'All 303.735.88 grams of fluff have ascended as cozy steam! Report to IKEA QA!'],
      ['🚨🏷️ EMERGENCY PLUSH RECALL!', 'Tag status: EXTRA CRISPY. Please stand by while Hermes vacuums up your stuffing!']
    ];
    const [toastTitle, toastSub] = sillyEpitaphs[Math.floor(Math.random() * sillyEpitaphs.length)];

    CozyAudio.trapHit();
    if (CozyAudio.shonk) CozyAudio.shonk();
    spawnFloatingBurst(player.pos, 0xff4500, 28);
    spawnFloatingBurst(player.pos, 0xffffff, 26); // giant cloud of escaping cotton stuffing!
    showToast(toastTitle, toastSub);
    addChatLog(`🌋🦈 <strong>${toastTitle}</strong> — ${toastSub}`, 'danger');

    const startPos = player.pos.clone();
    const startRotY = player.rotY || 0;
    const startTime = performance.now();
    const DURATION_MS = 1650;
    let midBurstDone = false;
    const activeZoneAtDeath = currentZone;

    const animateSillyLavaDeath = (now) => {
      const t = Math.min(1, (now - startTime) / DURATION_MS);

      if (player.mesh) {
        // Cartoon parabolic "YEEEEOW!" skyrocket pop out of the lava, then pancake flop
        const arcY = Math.sin(Math.min(1, t * 1.15) * Math.PI) * 10.5;
        player.pos.set(startPos.x, startPos.y + arcY, startPos.z);
        player.mesh.position.copy(player.pos);

        if (t < 0.65) {
          // Wild ceiling-fan spin + stretchy cartoon panic
          player.mesh.rotation.y = startRotY + t * 28.0;
          player.mesh.rotation.z = Math.sin(t * 36.0) * 0.65;
          const stretch = 1.0 + Math.sin(t * Math.PI * 3) * 0.32;
          player.mesh.scale.set(1 / Math.sqrt(stretch), stretch, 1 / Math.sqrt(stretch));
        } else {
          // Dramatic squeaky-toy pancake deflation
          const p = (t - 0.65) / 0.35;
          player.mesh.rotation.y = startRotY + 18.2 + p * 2.0;
          player.mesh.rotation.z = Math.sin(p * 18.0) * 0.18 * (1 - p);
          player.mesh.scale.set(1.0 + p * 0.55, Math.max(0.22, 1.0 - p * 0.78), 1.0 + p * 0.45);
        }
      }

      if (!midBurstDone && t >= 0.38) {
        midBurstDone = true;
        if (CozyAudio.bounceBoing) CozyAudio.bounceBoing();
        spawnFloatingBurst(player.pos, 0xffffff, 30);
        spawnFloatingBurst(player.pos, 0xffcc44, 18);
      }

      if (t < 1 && currentZone === activeZoneAtDeath) {
        requestAnimationFrame(animateSillyLavaDeath);
      } else {
        if (player.mesh) {
          player.mesh.scale.set(1, 1, 1);
          player.mesh.rotation.z = 0;
        }
        triggerUnstuffedRecovery(reason);
      }
    };

    requestAnimationFrame(animateSillyLavaDeath);
  }

  function handleVolcanoTrapHit(trapName) {
    if (isRebirthing || player.trapCooldown > 0) return;

    // Pass 81: MMO Defensive Postures (Fin Deflection Parry & Double Fin Defense Aegis)
    if (trapName !== 'Molten Lava Sea' && window.BlahajMMO && typeof window.BlahajMMO.mitigateIncomingHit === 'function') {
      const mit = window.BlahajMMO.mitigateIncomingHit(25, trapName, null);
      if (mit.parried) {
        player.trapCooldown = 1.4;
        return;
      }
      if (mit.blocked) {
        player.trapCooldown = 1.4;
        player.warmth = Math.max(0, player.warmth - mit.damage);
        updateMetersUI();
        if (typeof updateVitalsHUD === 'function') updateVitalsHUD();
        if (player.stuffing <= 0) {
          triggerUnstuffedRecovery(trapName);
        }
        return;
      }
    }

    // Freshly Laundered Shield: Absorbs up to 2 trap strikes (not full lava falls) without fluff damage!
    if (trapName !== 'Molten Lava Sea' && player.launderedShieldHits > 0) {
      player.launderedShieldHits--;
      player.trapCooldown = 1.2;
      CozyAudio.bounceBoing();
      spawnFloatingBurst(player.pos, 0x82e2ff, 18);
      showToast('SHIELD ABSORBED TRAP! 🫧🛡️', `Freshly Laundered fluff cushion absorbed ${trapName}! (${player.launderedShieldHits} shield hit${player.launderedShieldHits === 1 ? '' : 's'} remain)`);
      addChatLog(`🛡️ Your freshly fluffed coat absorbed the strike from <strong>${trapName}</strong> without unraveling!`, 'cozy');
      return;
    }

    player.trapCooldown = 1.8;
    CozyAudio.trapHit();
    spawnFloatingBurst(player.pos, 0xff4500, 18);

    const armorBonus = player.unlockedUpgrades.has('kevlar_stitching') ? 0.6 : 1.0;
    const baseDmg = (trapName === 'Molten Lava Sea') ? 28 : 25;
    const dmg = Math.round(baseDmg * armorBonus);
    player.warmth = Math.max(0, player.warmth - dmg);
    updateMetersUI();
    if (typeof updateVitalsHUD === 'function') updateVitalsHUD();

    if (player.stuffing <= 0) {
      triggerUnstuffedRecovery(trapName);
      return;
    }

    // DYNAMIC MANGE DEGRADATION: Traps and molten lava singe seams and loosen stuffing!
    const mangeIncrease = (trapName === 'Molten Lava Sea') ? 0.12 : 0.08;
    const nextMange = adjustSharkMange(player.sharkId, mangeIncrease, trapName);
    const mangePct = Math.round(nextMange * 100);

    showToast(`TRAP STRUCK! (-${dmg}% COHERENCE)`, `${trapName}! Soft stuffing loosened! (+${Math.round(mangeIncrease * 100)}% Mange)`);
    addChatLog(`💥 Struck by <strong>${trapName}</strong> (-${dmg}% Stuffing Coherence, Mange: ${mangePct}%). Respawning at checkpoint...`, 'danger');

    setTimeout(() => {
      player.pos.set(volcanoCheckpoint.x, volcanoCheckpoint.y, volcanoCheckpoint.z);
      player.rotY = volcanoCheckpoint.rotY || Math.PI;
      player.velY = 0;
      player.isGrounded = true;
      if (player.mesh) {
        player.mesh.position.copy(player.pos);
        player.mesh.rotation.y = player.rotY;
      }
    }, 200);
  }

  function mountLaundryCart(cartId) {
    if (!window.BlahajLaundromat) return;
    const cart = window.BlahajLaundromat.mountCart(cartId);
    if (cart) {
      player.inCart = true;
      player.cartId = cart.id;
      player.ridingWithPartner = false;
      player.inBoat = false;
      CozyAudio.shonk();
      if (CozyAudio.cartMount) CozyAudio.cartMount();
      showToast('LAUNDRY CART RACER! 🛒💨', `Aboard ${cart.name}! [WASD] & Mouse Steer · [Shift] Turbo Push · [Space] / [E] Hop Off`);
      addChatLog(`🛒 Hopped into <strong>${cart.name}</strong>! Zooming through the laundromat!`, 'cozy');

      if (window.BlahajNetwork) {
        window.BlahajNetwork.send({
          type: 'move',
          sharkId: player.sharkId,
          x: player.pos.x,
          y: player.pos.y,
          z: player.pos.z,
          rotY: player.rotY,
          isMoving: false,
          inBoat: false,
          inCart: true,
          cartId: cart.id,
          zone: currentZone,
          mange: window.__BLAHAJ_MANGE__,
          heldItemId: playerHeldItem ? playerHeldItem.id : null
        });
      }
    }
  }

  function dismountLaundryCart() {
    if (!window.BlahajLaundromat) return;
    window.BlahajLaundromat.dismountCart(player);
    player.inCart = false;
    player.cartId = null;
    CozyAudio.shonk();
    if (CozyAudio.cartDismount) CozyAudio.cartDismount();
    if (CozyAudio.stopCartRoll) CozyAudio.stopCartRoll();
    showToast('HOPPED OFF CART 🛒', 'Parked your Laundry Cart.');
    addChatLog('🛒 Stepped out of the Laundry Cart.', 'cozy');

    if (window.BlahajNetwork) {
      window.BlahajNetwork.send({
        type: 'move',
        sharkId: player.sharkId,
        x: player.pos.x,
        y: player.pos.y,
        z: player.pos.z,
        rotY: player.rotY,
        isMoving: false,
        inBoat: false,
        inCart: false,
        cartId: null,
        zone: currentZone,
        mange: window.__BLAHAJ_MANGE__,
        heldItemId: playerHeldItem ? playerHeldItem.id : null,
        isLounging: !!player.isLounging,
        loungeChairId: player.loungeChairId || null
      });
    }
  }

  function triggerInteract() {
    if (isAnyModalOpen()) return;

    // If Master Builder Mode is active and we aren't standing right on top of an NPC, [E] places the active blueprint!
    if (builderState.active && canUseBuilderMode(player.sharkId) && (!nearestInteractable || nearestInteractable.dist > 4.2)) {
      placeActiveBlueprint();
      return;
    }

    if (!nearestInteractable) return;
    const item = nearestInteractable;

    // S.S. Shonk-Saucer Mk. VII & Thunderbirds Launch Isle Interactables
    if (item.kind === 'ufo_hangar_console' && window.BlahajUFO) {
      window.BlahajUFO.toggleHangarDoors();
      return;
    }
    if (item.kind === 'ufo_reset_isle' && window.BlahajUFO) {
      window.BlahajUFO.resetToTracyIsle();
      return;
    }
    if (item.kind === 'ufo_summon_pier' && window.BlahajUFO) {
      window.BlahajUFO.summonToPosition(player.pos);
      return;
    }
    if (item.kind === 'ufo_board' && window.BlahajUFO) {
      window.BlahajUFO.boardUFO();
      return;
    }

    // Volcano Instance specific interactables
    if (item.kind === 'v_seam_diviner') {
      claimAethericSeamDiviner();
      return;
    }
    if (item.kind === 'v_exit') {
      exitVolcanoTrial(false);
      return;
    }
    if (item.kind === 'v_portal') {
      exitVolcanoTrial(true);
      return;
    }
    if (item.kind === 'v_tea') {
      applySteamingSpiritBuff();
      player.teaSharedCount++;
      return;
    }

    // Laundromat Instance specific interactables
    if (item.kind === 'laundromat_cart_mount') {
      mountLaundryCart(item.cartId);
      return;
    }
    if (item.kind === 'laundromat_cart_dismount') {
      dismountLaundryCart();
      return;
    }
    if (item.kind === 'washer_start' || item.kind === 'washer_enter') {
      triggerLaundromatSpinCycle();
      return;
    }
    if (item.kind === 'laundromat_notice_board') {
      if (CozyAudio.paperRustle) CozyAudio.paperRustle();
      else CozyAudio.playTone(520, 0.08, 'sine', 0.12, 740);
      showToast('COMMUNITY NOTICE BOARD 📌', '“Lost: One sentimental Argyle Sock in Dryer #4. Reward: 2 Scented Brebs!” • “Sacred Biscuit Dunk: 3.5s max.”');
      addChatLog('📌 Pinned on the Laundromat Corkboard: <em>“Lost: One sentimental Argyle Sock in Dryer #4 (return to Hermes). Guidelines: 30°C delicate cycle for plushies! Cart Racing League: Clean drifts only in Aisle 2!”</em>', 'cozy');
      return;
    }
    if (item.kind === 'laundromat_vending') {
      if (CozyAudio.vendingPurchase) CozyAudio.vendingPurchase();
      else CozyAudio.coinDrop();
      player.warmth = 100;
      player.teaComfort = 100;
      updateMetersUI();
      spawnFloatingBurst(player.pos, 0xff7eb6, 12);
      showToast('VENDING MACHINE 🌸🍫', 'Dispensed a warm Lavender Soda & Fresh Scented Breb!');
      addChatLog('🍫 Purchased warm Lavender Soda from the 24/7 Laundromat Vending Machine.', 'cozy');
      return;
    }
    if (item.kind === 'laundromat_poster') {
      openGalleryArtwork(item.src, item.title, item.desc);
      CozyAudio.shonk();
      return;
    }
    if (item.kind === 'laundromat_tokens') {
      CozyAudio.coinDrop();
      setTimeout(() => CozyAudio.coinDrop(), 140);
      showToast('LAUNDRY TOKENS 🪙 (+5 TOKENS)', 'Dispensed 5 shiny brass laundry tokens! Clink-clink!');
      addChatLog('🪙 Inserted currency into the <strong>Change Machine</strong> and collected <strong>5 shiny laundry tokens</strong>!', 'cozy');
      return;
    }
    if (item.kind === 'laundromat_return') {
      exitLaundromat();
      return;
    }

    // 3D IKEA Spawning Pits Instance Interactables
    if (item.kind === 'spawning_altar_detag') {
      if (window.BlahajSaveSystem && typeof window.BlahajSaveSystem.openRiteOfDetaggingModal === 'function') {
        window.BlahajSaveSystem.openRiteOfDetaggingModal();
      }
      return;
    }
    if (item.kind === 'spawning_liberate_shark') {
      const swedishNames = ['Svenskhaj', 'Lingonfin', 'Björkhaj', 'Köttbullar-Shonk', 'Stjärnhaj', 'Fjordfin', 'Kanelhaj'];
      const pickName = swedishNames[Math.floor(Math.random() * swedishNames.length)];
      if (player.inventory) {
        player.inventory.addItem('retired_tag', 1);
        player.inventory.addItem('flatpack_crate', 1);
      }
      CozyAudio.portalChime();
      spawnFloatingBurst(player.pos, 0xffda1a, 16);
      completeQuest('q-spawning-pits');
      renderBuilderToolbar();
      showToast(`SHARK LIBERATED: ${pickName.toUpperCase()}! ✂️🦈`, `Snipped barcode tag Art. 303.735.88 in Wire Bin #8! (+1 SKÄRHAJ Flat-Pack Kit & Retired Tag)`);
      addChatLog(`✂️🦈 <strong>Wire Spawning Bin #8:</strong> You snipped the barcode tag off <strong>${pickName}</strong> with the Sacred Scissors and secured <strong>+1x SKÄRHAJ Flat-Pack Kit</strong>!`, 'lore');
      return;
    }
    if (item.kind === 'spawning_pickup_tape') {
      if (player.inventory) {
        player.inventory.addItem('ingvar_tape', 1);
        player.inventory.addItem('flatpack_crate', 1);
      }
      CozyAudio.allenBuild();
      spawnFloatingBurst(player.pos, 0x38bdf8, 14);
      completeQuest('q-spawning-pits');
      renderBuilderToolbar();
      showToast('INGVAR’S MEASURING STATION! 📏📦', 'Collected Ingvar’s Brass Measuring Tape & +1 SKÄRHAJ Flat-Pack Kit!');
      addChatLog('📏📦 <strong>Showroom Measuring Station:</strong> Collected <strong>Ingvar’s Brass Measuring Tape (📏)</strong> and <strong>+1x SKÄRHAJ Flat-Pack Kit</strong>!', 'lore');
      return;
    }
    if (item.kind === 'spawning_hermes_shortcut') {
      openDialogueModal({
        speaker: 'Hermes’s Between-Lantern',
        role: 'MEGASTORE LABYRINTH SHORTCUT BEACON',
        portrait: 'assets/gallery/Hermes.png',
        text: '“The IKEA Spawning Pits stretch 426 meters across 6 surreal wings and 2 vertical decks! You can sneak the whole labyrinth on foot past the silhouetted Erf guards, or fold the Between-space to jump straight to a lower wing:”',
        actions: [
          {
            label: '🎢 Warp to Wing 3: The Great Moving Escalator Atrium (Level 2 → Level 1)',
            className: 'btn-primary',
            onClick: () => {
              closeDialogueModal();
              player.pos.set(-4.5, 6.0, -118.0);
              player.rotY = Math.PI;
              camState.yaw = 0;
              CozyAudio.portalChime();
              showToast('WARPED TO ESCALATOR ATRIUM! 🎢', 'Step onto the Left Moving Escalator to ride down to Level 1!');
            }
          },
          {
            label: '🚪 Warp to Wing 4: Room 404 Surreal Wardrobe Maze (Level 1)',
            className: 'btn-accent',
            onClick: () => {
              closeDialogueModal();
              player.pos.set(0.0, 0.0, -164.0);
              player.rotY = Math.PI;
              camState.yaw = 0;
              CozyAudio.portalChime();
              showToast('WARPED TO ROOM 404: LÄBYRINT! 🚪🌀', 'Follow the yellow arrows through the open purple-lit PAX wardrobes!');
            }
          },
          {
            label: '📦 Warp to Wing 5: Self-Serve Flat-Pack Warehouse (Aisles 12–18)',
            className: 'btn-accent',
            onClick: () => {
              closeDialogueModal();
              player.pos.set(0.0, 0.0, -258.0);
              player.rotY = Math.PI;
              camState.yaw = 0;
              CozyAudio.portalChime();
              showToast('WARPED TO WAREHOUSE AISLE 14! 📦🔧', 'Collect the 6 glowing 3D SKÄRHAJ Flat-Pack Kits on the pallets!');
            }
          }
        ]
      });
      return;
    }
    if (item.kind === 'spawning_pickup_flatpack') {
      if (window.BlahajSpawningPits) {
        const picked = window.BlahajSpawningPits.collectFlatpackPickup(item.pickupId);
        if (picked) {
          if (player.inventory) {
            player.inventory.addItem('flatpack_crate', 1);
            if (!player.inventory.hasItem('hex_key')) player.inventory.addItem('hex_key', 1);
          }
          player.birbsFedCount += 1;
          player.carrotsKnockedCount += 1;
          CozyAudio.allenBuild();
          spawnFloatingBurst(player.pos, 0xffda1a, 18);
          completeQuest('q-spawning-pits');
          updateMetersUI();
          renderBuilderToolbar();
          const totalKits = player.inventory ? player.inventory.getCount('flatpack_crate') : 1;
          showToast(`HEISTED: ${picked.name.toUpperCase()}! 📦🔧`, `+1 SKÄRHAJ Flat-Pack Kit (${totalKits} in satchel) + Birb & Carrot Dowel Supplies!`);
          addChatLog(`📦🔧 <strong>Aisle 14, Bay 22:</strong> Picked up <strong>${picked.name}</strong> from the warehouse pallet! (Satchel now holds <strong>${totalKits}x SKÄRHAJ Flat-Pack Kits</strong>)`, 'lore');
        }
      }
      return;
    }
    if (item.kind === 'spawning_bistro_feast') {
      if (player.inventory) {
        player.inventory.addItem('kottbullar_feast', 2);
      }
      player.teaComfort = 100;
      player.warmth = 100;
      CozyAudio.bistroChime();
      spawnFloatingBurst(player.pos, 0x34d399, 16);
      updateMetersUI();
      showToast('MIDNIGHT SWEDISH BISTRO! 🧆✨', 'Collected +2x Midnight Spawning-Pit Köttbullar & Lingonberry Jam (100% Comfort)!');
      addChatLog('🧆✨ <strong>Midnight Swedish Bistro Counter:</strong> Packed <strong>2x Midnight Spawning-Pit Köttbullar</strong> into your satchel and restored 100% Plush Comfort!', 'cozy');
      return;
    }
    if (item.kind === 'spawning_exit_portal') {
      exitSpawningPits();
      return;
    }
    if (item.kind === 'homestead_commissions_board') {
      openHomesteadCommissionsModal();
      return;
    }
    if (item.kind === 'homestead_board_custom_boat') {
      boardCustomAtollBoat();
      return;
    }
    if (item.kind === 'homestead_sawmill_bench') {
      if (player.inventory) {
        player.inventory.addItem('flatpack_crate', 2);
        if (!player.inventory.hasItem('homestead_charter')) {
          player.inventory.addItem('homestead_charter', 1);
        }
      }
      player.birbsFedCount += 1;
      player.carrotsKnockedCount += 1;
      if (window.BlahajHomestead) {
        window.BlahajHomestead.recordCommissionProgress('comm_hiram_joinery', 1);
      }
      CozyAudio.allenBuild();
      spawnFloatingBurst(player.pos, 0xffda1a, 20);
      updateMetersUI();
      renderBuilderToolbar();
      const totalFp = player.inventory ? player.inventory.getCount('flatpack_crate') : 2;
      showToast('🪚📦 BYGGBÄNK SAWMILL: +2 SKÄRHAJ FLAT-PACK KITS!', `Milled Scandinavian birch planks & cam-lock dowels! (${totalFp} Kits in satchel)`);
      addChatLog(`🪚📦 <strong>BYGGBÄNK Assembly & Sawmill Bench:</strong> Milled island timber into <strong>+2x SKÄRHAJ Flat-Pack Kits</strong> (${totalFp} total)!`, 'lore');
      return;
    }
    if (item.kind === 'homestead_cuddle_babies') {
      if (window.BlahajHomestead) {
        window.BlahajHomestead.refreshCompanionBabySharks();
      }
      player.teaComfort = 100;
      player.warmth = 100;
      player.stuffing = 100;
      CozyAudio.shonk();
      spawnFloatingBurst(player.pos, 0xf472b6, 22);
      updateMetersUI();
      showToast('🦈💕 CUDDLED RESCUED BABY SHARKS!', 'Your liberated Spawning-Pit baby sharks nuzzle your fins! (+100% Comfort & Warmth)');
      addChatLog('🦈💕 <strong>Companion Baby Shark Lagoon:</strong> Your rescued Spawning-Pit baby sharks splashed happily and restored 100% Plush Comfort!', 'cozy');
      return;
    }
    if (item.kind === 'homestead_enter_sea_cave') {
      enterSeaCaveGrotto();
      return;
    }
    if (item.kind === 'seacave_exit') {
      exitSeaCaveGrotto();
      return;
    }
    if (item.kind === 'seacave_thermal_spring') {
      if (window.BlahajHomestead) {
        window.BlahajHomestead.activateGrottoSpringBuff();
      }
      player.teaComfort = 100;
      player.warmth = 100;
      player.stuffing = 100;
      adjustSharkMange(player.sharkId, -1.0, 'Starlight Thermal Spring');
      CozyAudio.portalChime();
      spawnFloatingBurst(player.pos, 0x2dd4bf, 24);
      updateMetersUI();
      showToast('♨️💎 STARLIGHT THERMAL SPRING BLESSING!', '100% Warmth & Comfort, Coat Restored to 0% Mange, and +25% Starlight Grotto Speed (5m)!');
      addChatLog('♨️💎 <strong>Bioluminescent Thermal Spring:</strong> Soaked in the warm mineral waters—Mange cleansed to 0% and <strong>+25% Starlight Speed Buff</strong> active!', 'cozy');
      return;
    }
    if (item.kind === 'seacave_harvest_quartz') {
      if (window.BlahajHomestead) {
        window.BlahajHomestead.harvestQuartzNode(item.nodeId);
      }
      if (player.inventory) {
        player.inventory.addItem('starlight_quartz', 1);
        player.inventory.addItem('flatpack_crate', 1);
      }
      CozyAudio.portalChime();
      spawnFloatingBurst(player.pos, 0x38bdf8, 20);
      renderBuilderToolbar();
      const qzTotal = player.inventory ? player.inventory.getCount('starlight_quartz') : 1;
      showToast(`💎 HARVESTED: ${(item.nodeName || 'STARLIGHT QUARTZ').toUpperCase()}!`, `+1x Starlight Cave Quartz (${qzTotal} in satchel) & +1x SKÄRHAJ Flat-Pack Kit!`);
      addChatLog(`💎📦 <strong>Subterranean Sea-Cave Grotto:</strong> Harvested <strong>1x Starlight Cave Quartz (💎)</strong> and <strong>1x SKÄRHAJ Flat-Pack Kit</strong> from ${item.nodeName}!`, 'lore');
      return;
    }
    if (item.kind === 'seacave_mend_rift') {
      if (window.BlahajHomestead) {
        window.BlahajHomestead.recordCommissionProgress('comm_nimue_seam', 1);
      }
      if (player.inventory) {
        player.inventory.addItem('starlight_quartz', 1);
        player.inventory.addItem('flatpack_crate', 1);
      }
      player.trialPoints = (player.trialPoints || 0) + 1;
      CozyAudio.portalChime();
      spawnFloatingBurst(player.pos, 0xc084fc, 24);
      updateMetersUI();
      renderBuilderToolbar();
      showToast('🪡✨ SUBTERRANEAN SEAM RIFT STITCHED!', '+1x Starlight Cave Quartz 💎, +1x Flat-Pack Kit 📦 & +1 Trial Point (Nimue Commission Ready)!');
      addChatLog('🪡✨ <strong>Subterranean Great Seam Rift:</strong> Stitched the cavern reality tear with Nimue’s needle (+1 Starlight Quartz, +1 Flat-Pack Kit & +1 Trial Pt)!', 'lore');
      return;
    }
    if (item.kind === 'seacave_lounge_vault') {
      if (player.inventory) {
        player.inventory.addItem('flatpack_crate', 3);
        player.inventory.addItem('starlight_quartz', 2);
      }
      player.trialPoints = (player.trialPoints || 0) + 1;
      CozyAudio.portalChime();
      spawnFloatingBurst(player.pos, 0xfbbf24, 26);
      updateMetersUI();
      renderBuilderToolbar();
      showToast('👑💎 GROTTO ARCHODECT VAULT CLAIMED!', '+3x SKÄRHAJ Flat-Pack Kits 📦, +2x Starlight Cave Quartz 💎 & +1 Trial Point!');
      addChatLog('👑💎 <strong>Subterranean Grotto Lounge Vault:</strong> Claimed <strong>+3x SKÄRHAJ Flat-Pack Kits</strong>, <strong>+2x Starlight Cave Quartz</strong>, and <strong>+1 Trial Point</strong>!', 'lore');
      return;
    }
    if (item.kind === 'spawning_ballpit_excavate') {
      if (window.BlahajSpawningPits) {
        window.BlahajSpawningPits.unlockGoldenBlueprint('skarhaj_ballpit');
      }
      if (player.inventory) {
        player.inventory.addItem('flatpack_crate', 2);
      }
      player.birbsFedCount += 2;
      CozyAudio.portalChime();
      spawnFloatingBurst(player.pos, 0xffda1a, 22);
      renderBuilderToolbar();
      showToast('🟡🔵 GOLDEN BLUEPRINT UNLOCKED: SMÅLAND BALL-PIT!', 'Unlocked SMÅLAND Ball-Pit Jacuzzi in Builder [C] + 2x SKÄRHAJ Flat-Pack Kits!');
      addChatLog('🟡🔵 <strong>SMÅLAND Ball-Pit Excavated:</strong> Found the <strong>Golden Blueprint: SMÅLAND Ball-Pit Jacuzzi</strong> and <strong>+2x SKÄRHAJ Flat-Pack Kits</strong> at the bottom of the ball pit!', 'lore');
      return;
    }
    if (item.kind === 'spawning_toggle_box') {
      if (window.BlahajSpawningPits) {
        const active = window.BlahajSpawningPits.toggleBoxDisguise(player.mesh);
        CozyAudio.allenBuild();
        showToast(
          active ? '📦🦈 CARDBOARD BOX DISGUISE EQUIPPED!' : '📦 REMOVED CARDBOARD BOX DISGUISE',
          active ? 'Guards cannot spot you inside the SKÄRHAJ cardboard box!' : 'Stepped out of the cardboard box.'
        );
      }
      return;
    }
    if (item.kind === 'spawning_door_3008') {
      player.pos.set(item.targetX, item.targetY, item.targetZ);
      if (player.mesh) player.mesh.position.copy(player.pos);
      CozyAudio.portalChime();
      spawnFloatingBurst(player.pos, 0x38bdf8, 18);
      showToast('🚪🌀 NON-EUCLIDEAN DOOR #3008!', 'Folded showroom space across Room 404!');
      addChatLog('🚪🌀 <strong>Room 3008 Non-Euclidean Doorway:</strong> Stepped through a free-standing showroom door and emerged at the far end of Room 404!', 'lore');
      return;
    }
    if (item.kind === 'spawning_lighting_dimmer') {
      if (window.BlahajSpawningPits) {
        const darkened = window.BlahajSpawningPits.toggleLightingJungleDimmer();
        if (player.inventory) player.inventory.addItem('flatpack_crate', 1);
        player.carrotsKnockedCount += 2;
        CozyAudio.portalChime();
        spawnFloatingBurst(player.pos, 0xfde047, 20);
        renderBuilderToolbar();
        showToast(
          darkened ? '💡🔦 LIGHTING JUNGLE BLACKOUT! (GUARDS BLINDED)' : '💡 LIGHTING JUNGLE RESTORED!',
          'Room 404 Guard Flashlight Range reduced by 60% & unlocked MASKROS Starlight Chandelier Blueprint!'
        );
        addChatLog('💡✨ <strong>The Lighting Jungle:</strong> Flipped the Master Dimmer Switch, blinding the Room 404 guards and unlocking the <strong>Golden Blueprint: MASKROS Starlight Chandelier</strong>!', 'lore');
      }
      return;
    }
    if (item.kind === 'spawning_forklift_up') {
      player.pos.set(-11.5, 5.2, -264.0);
      player.velY = 0;
      player.isGrounded = true;
      if (player.mesh) player.mesh.position.copy(player.pos);
      CozyAudio.allenBuild();
      spawnFloatingBurst(player.pos, 0xfbbf24, 16);
      showToast('🏗️⬆️ ELEVATED TO HIGH-RACK CATWALK (Y = +5.2m)!', 'Walk South along the top pallet rack to reach the Golden Archodect Vault!');
      return;
    }
    if (item.kind === 'spawning_forklift_down') {
      player.pos.set(-11.5, 0.0, -260.0);
      player.velY = 0;
      player.isGrounded = true;
      if (player.mesh) player.mesh.position.copy(player.pos);
      CozyAudio.allenBuild();
      showToast('🏗️⬇️ LOWERED TO WAREHOUSE FLOOR', 'Back on Aisle 14 floor level.');
      return;
    }
    if (item.kind === 'spawning_toggle_trolley') {
      if (window.BlahajSpawningPits) {
        const fpCount = player.inventory ? player.inventory.getCount('flatpack_crate') : 2;
        const riding = window.BlahajSpawningPits.toggleFlatbedTrolley(player.mesh, fpCount);
        CozyAudio.allenBuild();
        showToast(
          riding ? '🛒💨 RIDING RULLVAGN FLATBED TROLLEY (+65% SPEED)!' : '🛒 HOPPED OFF FLATBED TROLLEY',
          riding ? 'All-wheel caster drift active! Stack flat-pack kits & zoom down Aisle 14!' : 'Dismounted trolley.'
        );
      }
      return;
    }
    if (item.kind === 'spawning_highrack_vault') {
      if (window.BlahajSpawningPits) {
        window.BlahajSpawningPits.unlockGoldenBlueprint('skarhaj_bin_throne');
      }
      if (player.inventory) {
        player.inventory.addItem('flatpack_crate', 3);
      }
      player.trialPoints = (player.trialPoints || 0) + 1;
      CozyAudio.portalChime();
      spawnFloatingBurst(player.pos, 0xfbbf24, 26);
      updateMetersUI();
      renderBuilderToolbar();
      showToast('👑📦 HIGH-RACK GOLDEN VAULT CLAIMED!', 'Unlocked BLÅHAJ-TRON Spawning-Bin Throne Blueprint, +3 Flat-Pack Kits & +1 Trial Point!');
      addChatLog('👑📦 <strong>High-Rack Golden Vault:</strong> Claimed the <strong>BLÅHAJ-TRON Spawning-Bin Throne Blueprint</strong>, <strong>+3x SKÄRHAJ Flat-Pack Kits</strong>, and <strong>+1 Trial Point</strong>!', 'lore');
      return;
    }
    if (item.kind === 'spawning_checkout_scan') {
      if (window.BlahajSpawningPits) {
        const res = window.BlahajSpawningPits.scanSelfCheckoutTerminal(item.scanId);
        CozyAudio.bistroChime();
        spawnFloatingBurst(player.pos, 0x38bdf8, 16);
        if (res.bossDefeated) {
          if (player.inventory) player.inventory.addItem('flatpack_crate', 2);
          player.trialPoints = (player.trialPoints || 0) + 1;
          updateMetersUI();
          renderBuilderToolbar();
          showToast('🧾🌪️ OVERSEER INGVAR-9000 OVERLOADED! (+2 KITS & +1 TRIAL PT)', '“UNEXPECTED SHONK IN BAGGING AREA!” Receipt tornado spun out the Store Manager!');
          addChatLog('🧾🌪️ <strong>Self-Checkout Overload (3/3):</strong> Scanned <em>“999x Midnight Köttbullar”</em>! A 50-meter tornado of receipt paper tangled <strong>Overseer Ingvar-9000</strong> (+2 Flat-Pack Kits & +1 Trial Pt)!', 'system');
        } else {
          showToast(`🧾 SCANNED "999x KÖTTBULLAR" (${res.scannedCount}/3)!`, 'Scan all 3 Self-Checkout Terminals to overload the Night-Shift Store Manager!');
        }
      }
      return;
    }

    // World Pickups & Bread Oven & Community Trunk & Launch Station
    if (item.kind && item.kind.startsWith('pickup_')) {
      collectWorldPickup(item.pickup);
      return;
    }
    if (item.kind === 'binocular_pedestal') {
      if (!playerHeldItem || playerHeldItem.id !== 'binoculars') {
        equipHeldItem('binoculars', false);
      }
      enterBinocularMode();
      return;
    }

    if (item.kind === 'observatory_telescope') {
      enterTelescopeMode();
      return;
    }
    if (item.kind === 'signpost_spawn' || item.kind === 'signpost') {
      openFastTravelModal();
      return;
    }
    if (item.kind === 'solomon_bread_oven') {
      bakeBrebAtOven();
      return;
    }
    if (item.kind === 'community_trunk') {
      openCommunityTrunkModal();
      return;
    }
    if (item.kind === 'launch_mortar') {
      launchHelenBirthdayFireworks();
      return;
    }
    if (item.kind === 'assemble_and_launch_mortar') {
      assembleAndLaunchFireworks();
      return;
    }
    if (item.kind === 'inspect_mortar') {
      showToast('HEARTLAND LAUNCH MORTAR 🔭', "Requires Helen's Birthday Star Rocket! Craft powder at Solomon, mortar at Hiram, and fuse at Nimue.");
      return;
    }
    if (item.kind === 'pluck_birb_down') {
      pluckBirbDown(item.ref);
      return;
    }

    if (isUsingBinoculars) {
      exitBinocularMode();
      return;
    }

    if (isUsingTelescope) {
      exitTelescopeMode();
      return;
    }

    if (player.isLounging) {
      standUpFromDeckChair();
      return;
    }
    if (item.kind === 'deckchair') {
      sitOnDeckChair(item.chairId);
      return;
    }

    // Spherical Foods Instance specific interactables
    if (item.kind === 'pop_birthday_cracker') {
      popBirthdayCracker(item.boothIndex);
      return;
    }
    if (item.kind === 'eat_served_dish') {
      eatServedDish(item.boothIndex);
      return;
    }
    if (item.kind === 'spherical_exit') {
      exitSphericalFoods();
      return;
    }
    if (item.kind === 'enter_volleyball') {
      enterVolleyballCourt();
      return;
    }
    if (item.kind === 'exit_volleyball') {
      exitVolleyballCourt();
      return;
    }
    if (item.kind === 'helen_birthday_cake') {
      triggerHelensBirthdayCake();
      return;
    }
    if (item.kind === 'monsieur_betterave') {
      openSphericalFoodsMenuModal();
      return;
    }
    if (player.isSeatedInBooth || item.kind === 'seated_booth_menu') {
      openSphericalFoodsMenuModal();
      return;
    }
    if (item.kind === 'booth_seat') {
      sitInBooth(item.boothIndex);
      return;
    }
    if (item.kind === 'spherical_painting') {
      openSphericalPaintingModal(item.paintingIndex);
      return;
    }

    if (item.kind === 'partner_boat') {
      player.ridingWithPartner = !player.ridingWithPartner;
      if (player.ridingWithPartner) {
        player.inBoat = false;
        CozyAudio.shonk();
        showToast('CO-OP REGATTA CREW! ⛵🦈🦈', 'Riding together on your partner’s boat! Press [E] or [Space] anytime to hop off.');
        addChatLog('⛵🦈🦈 You hopped aboard your partner’s Regatta Sailboat to sail together!', 'coop');
        completeQuest('q-boat');
      } else {
        CozyAudio.shonk();
        showToast('HOPPED OFF BOAT', 'Stepped off your partner’s boat.');
      }
      return;
    }

    if (item.kind === 'pocket_portal') {
      usePocketPortal(item.ref);
      return;
    }

    if (item.kind === 'rift') {
      mendNearbyRift(14);
      return;
    }

    if (item.kind === 'actor') {
      const act = item.ref;
      const line = act.lines[act.lineIdx % act.lines.length];
      act.lineIdx++;
      showActorSpeechBubble(act, line);

      const actorActions = [
        {
          label: 'Beep Noses! 🦈💕',
          className: 'btn-primary',
          onClick: () => {
            closeDialogueModal();
            triggerBeepNose();
          }
        },
        {
          label: 'Toss Warm Breb for Birbs 🥖🐦',
          className: 'btn-accent',
          onClick: () => {
            closeDialogueModal();
            triggerFeedBreb();
          }
        },
        {
          label: 'Share Sacred Tea 🍵',
          className: 'btn-secondary',
          onClick: () => {
            CozyAudio.teaPour();
            player.teaComfort = 100;
            player.warmth = 100;
            player.teaSharedCount++;
            updateMetersUI();
            completeQuest('q-tea');
            showActorSpeechBubble(act, '“Thank you for the Sacred Tea, sharkitty! Warmth restored!”');
            closeDialogueModal();
          }
        }
      ];

      if (['solomon', 'nimue', 'hiram', 'hermes'].includes(act.id)) {
        actorActions.unshift({
          label: `👑 ${act.name}’s Daily Founder Commissions & Homestead Charter 📋`,
          className: 'btn-primary',
          onClick: () => {
            closeDialogueModal();
            openHomesteadCommissionsModal();
          }
        });
      }
      if (act.id === 'carrot_leader') {
        actorActions.unshift({
          label: 'Play Beach Volleyball! 🏐🦈',
          className: 'btn-primary',
          onClick: () => {
            closeDialogueModal();
            enterVolleyballCourt();
          }
        });
      } else if (act.id === 'solomon') {
        actorActions.unshift({
          label: 'Synthesize Star Powder 🎆 (1x Guano + 1x Sulfur)',
          className: 'btn-accent',
          onClick: () => {
            craftStarPowderAtSolomon();
          }
        });
      } else if (act.id === 'hiram') {
        actorActions.unshift({
          label: 'Carve Launch Mortar 🪵 (2x Driftwood or 1x Pure Obsidian)',
          className: 'btn-accent',
          onClick: () => {
            craftMortarAtHiram();
          }
        });
      } else if (act.id === 'nimue') {
        actorActions.unshift({
          label: 'Braid Star Fuse 🧵 (2x Birb Down or 2x Plush Fluff)',
          className: 'btn-accent',
          onClick: () => {
            craftFuseAtNimue();
          }
        });
      }

      if (window.BlahajQuests) {
        const qStatus = window.BlahajQuests.getGiverStatus(act.id);
        const isPatron = ['solomon', 'nimue', 'hiram', 'hermes', 'beetroot_waiter', 'tatiana', 'ivanka'].includes(act.id);
        if (isPatron) {
          const qBadge = qStatus === 'turnin' ? '❓ Turn In Quest!' : (qStatus === 'available' ? '❗ Quests Available' : '📜 View Quests');
          actorActions.unshift({
            label: qBadge,
            className: 'btn-primary',
            onClick: () => {
              closeDialogueModal();
              window.BlahajQuests.openGiverModal(act.id);
            }
          });
        }
      }

      openDialogueModal({
        speaker: act.name,
        role: act.tag,
        portrait: act.portrait,
        text: line,
        actions: actorActions
      });
      return;
    }

    if (item.kind === 'landmark') {
      handleLandmarkInteraction(item.ref);
    }
  }

  function usePocketPortal(sourcePortal) {
    const portals = worldApi.getBuiltStructures().filter((s) => s.type === 'pocket_portal');
    if (portals.length < 2) {
      showToast('NEED A SECOND POCKET PORTAL 🌀', 'Build at least 2 Linked Pocket Portals with Hiram [3] + [C] to teleport between them!');
      return;
    }
    const idx = portals.findIndex((p) => p.id === sourcePortal.id);
    const dest = portals[(idx + 1) % portals.length];
    if (dest) {
      CozyAudio.portalChime();
      player.inBoat = false;
      player.ridingWithPartner = false;
      player.pos.set(dest.x + Math.sin(dest.rotY) * 2.5, dest.y + 0.5, dest.z + Math.cos(dest.rotY) * 2.5);
      player.dungeonPortalCooldown = 3.0;
      spawnFloatingBurst(player.pos, 0xa864ff, 18);
      showToast('POCKET PORTAL TRAVERSED! 🌀✨', 'Folded space along the Great Seam to your linked Pocket Portal!');
    }
  }

  function disembarkBoatAtCurrentLocation() {
    player.inBoat = false;
    player.ridingWithPartner = false;
    const boat = worldApi.getBoatMesh();
    const bx = boat ? boat.position.x : player.pos.x;
    const bz = boat ? boat.position.z : player.pos.z;

    // Look for nearest dry beach, dock, or player-built structure within 4m..11m of the boat's current spot
    let landX = null;
    let landZ = null;
    let landY = -999;
    let bestD = 999;

    for (let r = 3.5; r <= 11.0; r += 1.5) {
      for (let a = 0; a < 16; a++) {
        const ang = (a / 16) * Math.PI * 2;
        const tx = bx + Math.sin(ang) * r;
        const tz = bz + Math.cos(ang) * r;
        const ty = worldApi.getGroundAndStructureHeight(tx, tz, player.pos.y + 3.0);
        if (ty >= 0.45 && r < bestD) {
          bestD = r;
          landX = tx;
          landZ = tz;
          landY = ty;
        }
      }
      if (landX !== null) break;
    }

    if (landX !== null) {
      player.pos.set(landX, landY + 0.1, landZ);
      player.velY = 4.2;
      player.isGrounded = false;
      CozyAudio.shonk();
      showToast('STEPPED ASHORE 🏝️', 'Hopped off the Regatta Sailboat onto the shore!');
    } else {
      // Hop right off the side of the boat at its current spot!
      const sideX = bx + Math.cos(player.rotY) * 2.8;
      const sideZ = bz - Math.sin(player.rotY) * 2.8;
      const gy = worldApi.getGroundAndStructureHeight(sideX, sideZ, player.pos.y + 2.0);
      const waterY = worldApi.getWaveHeight(sideX, sideZ, clock ? clock.getElapsedTime() : 0);
      player.pos.set(sideX, Math.max(gy, waterY + 0.25), sideZ);
      player.velY = 4.2;
      player.isGrounded = false;
      CozyAudio.shonk();
      CozyAudio.waterSplash(0.12, 0.35);
      showToast('HOPPED OFF BOAT ⛵', 'Stepped off the Regatta Sailboat right here!');
    }
  }

  function handleLandmarkInteraction(lm) {
    if (lm.type === 'sanctuary_island') {
      const isl = (LORE.sanctuaryIslands || []).find((x) => x.id === lm.islandKey);
      if (!isl) return;
      completeQuest('q-outer-island');
      const owner = islandClaims[isl.id] || `${isl.guardian}’s Unclaimed Sanctuary`;
      const boat = worldApi.getBoatMesh();

      openDialogueModal({
        speaker: isl.name,
        role: `${isl.direction} · CLAIMED BY: ${owner.toUpperCase()}`,
        portrait: LORE.sharks[player.sharkId].portrait,
        text: `${isl.desc} You can claim this Sanctuary Island as your own personal homestead, summon the Regatta Sailboat to its dock, switch to Hiram to build a village, or travel to any other island in the Blåhaj Archipelago!`,
        actions: [
          {
            label: `Claim Island for ${LORE.sharks[player.sharkId].name}! 🏝️👑`,
            className: 'btn-primary',
            onClick: () => {
              const claimer = `${LORE.sharks[player.sharkId].name}`;
              islandClaims[isl.id] = claimer;
              localStorage.setItem('blahaj_island_claims_v1', JSON.stringify(islandClaims));
              window.BlahajNetwork.send({ type: 'island_claim', islandId: isl.id, claimer });
              closeDialogueModal();
              CozyAudio.portalChime();
              spawnFloatingBurst(player.pos, 0xffd166, 20);
              showToast('SANCTUARY ISLAND CLAIMED! 🏝️👑', `${isl.name} is now ${claimer}’s Sanctuary Island!`);
              addChatLog(`🏝️👑 <strong>${claimer}</strong> claimed <strong>${isl.name}</strong>!`, 'coop');
            }
          },
          {
            label: 'Open SKÄRHAJ Modular Snap-Builder [C] 📦🏗️',
            className: 'btn-accent',
            onClick: () => {
              closeDialogueModal();
              builderState.category = 'skarhaj_kits';
              builderState.selectedId = 'skarhaj_plinth';
              setBuilderMode(true);
            }
          },
          {
            label: 'Deploy Starter SKÄRHAJ Homestead Kit (Cabin + KALLAX + Sea-Cave) 🏡✨',
            className: 'btn-primary',
            onClick: () => {
              closeDialogueModal();
              deployStarterHomesteadKit(isl.x, isl.z);
            }
          },
          {
            label: 'Board Sailboat at Island Dock ⛵',
            className: 'btn-secondary',
            onClick: () => {
              closeDialogueModal();
              if (boat) {
                boat.position.set(isl.dockX, 0.45, isl.dockZ);
                player.inBoat = true;
                player.ridingWithPartner = false;
                player.pos.set(isl.dockX, 1.2, isl.dockZ);
                showToast(`SAILING FROM ${isl.name.toUpperCase()}`, 'Aboard the Regatta Sailboat!');
              }
            }
          },
          {
            label: 'Portal Back to Main Island Tea House 🌀',
            className: 'btn-secondary',
            onClick: () => {
              closeDialogueModal();
              CozyAudio.portalChime();
              player.inBoat = false;
              player.ridingWithPartner = false;
              player.pos.set(0, worldApi.getGroundAndStructureHeight(0, 24), 24);
              showToast('RETURNED TO MAIN ISLAND', 'Arrived at the Sacred Tea House Plaza!');
            }
          },
          {
            label: 'Portal to East Cape Great Portal Gate 🌌',
            className: 'btn-secondary',
            onClick: () => {
              closeDialogueModal();
              CozyAudio.portalChime();
              player.inBoat = false;
              player.ridingWithPartner = false;
              const spawnX = 67.8;
              const spawnZ = -8.35;
              const sy = worldApi.getGroundAndStructureHeight(spawnX, spawnZ);
              player.pos.set(spawnX, sy, spawnZ);
              player.rotY = -Math.PI * 0.38;
              camState.yaw = -Math.PI * 0.38;
              showToast('EAST CAPE PORTAL THRESHOLD', 'Arrived at the Great Outside Portal on East Cape!');
            }
          }
        ]
      });
      return;
    }

    if (lm.type === 'birbs') {
      triggerFeedBreb();
      return;
    }

    if (lm.type === 'sealed_gate') {
      openDialogueModal({
        speaker: 'The Exoteric Volcano Shrine & Offering Altar',
        role: 'SACRED FRONT BALCONY · THE VOLCANIC FAITH',
        portrait: 'assets/gallery/Blizzard-Volcano.png',
        text: '“Welcome, pilgrim, to the Exoteric Shrine of the Sacred Volcano. From this front balcony facing our island community, sharks bring offerings of warm tea, fresh buns, and sincere devotion to appease the mountain. The esoteric trials of the inner caldera remain sealed from without—only initiates who brave the northern sea caves may tread the core.”',
        actions: [
          {
            label: 'Make an Offering to the Volcano 🌋🍵✨',
            className: 'btn-primary',
            onClick: () => {
              closeDialogueModal();
              player.teaComfort = 100;
              player.warmth = 100;
              player.stuffing = 100;
              player.trialPoints = (player.trialPoints || 0) + 1;
              player.teaSharedCount = (player.teaSharedCount || 0) + 1;
              const cleaned = adjustSharkMange(player.sharkId, -0.20, 'Altar Blessing');
              updateMetersUI();
              CozyAudio.portalChime();
              spawnFloatingBurst(player.pos, 0xff7722, 26);
              showToast('VOLCANO BLESSING GRANTED 🌋✨', `Sacred offering placed upon the Altar! (+1 Trial Point · Fleece Cleansed to ${Math.round(cleaned * 100)}%)`);
              addChatLog(`🌋 <strong>The Exoteric Volcano Shrine:</strong> You placed a sacred offering upon the Altar of the Core. The mountain rumbles with warm benevolence! (+1 Trial Point · Coat Restored to ${Math.round(cleaned * 100)}%)`, 'lore');
            }
          },
          {
            label: 'Fast-Travel to Esoteric Sea Cave Wharf ⛵',
            className: 'btn-accent',
            onClick: () => {
              closeDialogueModal();
              player.inBoat = false;
              player.ridingWithPartner = false;
              player.pos.set(-28, 1.5, -196);
              player.rotY = 0;
              camState.yaw = Math.PI;
              showToast('REAR VOLCANO WHARF', 'Walk forward into the Sea Cave to enter the Trial!');
            }
          },
          {
            label: 'Enter the Volcano Trial Dungeon! 🌋⚔️',
            className: 'btn-secondary',
            onClick: () => {
              closeDialogueModal();
              enterVolcanoTrial();
            }
          },
          {
            label: 'Step Away from the Altar',
            className: 'btn-secondary',
            onClick: () => closeDialogueModal()
          }
        ]
      });
      return;
    }

    if (lm.type === 'rear_wharf') {
      const boat = worldApi.getBoatMesh();
      if (player.inBoat || player.ridingWithPartner) {
        player.inBoat = false;
        player.ridingWithPartner = false;
        player.pos.set(-28, 1.5, -196);
        player.rotY = 0;
        camState.yaw = Math.PI;
        completeQuest('q-em-tea');
        showToast('REAR VOLCANO WHARF', 'Stepped onto the Rear Wharf! Walk forward into the Sea Cave to enter the Volcano Trial!');
      } else {
        openDialogueModal({
          speaker: 'Rear Volcano Wharf & Sea Cave Entrance',
          role: 'THE TRIALS OF THE SACRED VOLCANO',
          portrait: 'assets/gallery/Blizzard-Volcano.png',
          text: 'The roaring Obsidian Sea Cave opens into the instanced subterranean Trials of the Sacred Volcano! Dodge the swinging obsidian pendulums, traverse the Molten Causeway, and ascend the Ember Spiral to emerge onto the grand Caldera Overlook!',
          actions: [
            {
              label: 'Enter the Volcano Trial Instance! 🌋⚔️',
              className: 'btn-primary',
              onClick: () => {
                closeDialogueModal();
                enterVolcanoTrial();
              }
            },
            {
              label: 'Board Sailboat at Rear Wharf ⛵',
              className: 'btn-accent',
              onClick: () => {
                closeDialogueModal();
                if (boat) {
                  boat.position.set(-21.5, 0.45, -204);
                  player.inBoat = true;
                  player.ridingWithPartner = false;
                  player.pos.set(-21.5, 1.2, -204);
                  showToast('SAILING FROM REAR WHARF', 'Aboard the Regatta Sailboat on the North Sea!');
                }
              }
            }
          ]
        });
      }
      return;
    }

    if (lm.type === 'boat') {
      player.ridingWithPartner = false;
      if (!player.inBoat) {
        if (lm.targetBoat && worldApi.setActiveBoat) {
          worldApi.setActiveBoat(lm.targetBoat);
        }
        player.inBoat = true;
        const boat = worldApi.getBoatMesh();
        if (boat) {
          player.pos.set(boat.position.x, boat.position.y + 0.88, boat.position.z);
        }
        CozyAudio.shonk();
        showToast('THE WATER THAT DOTH NOT WET ⛵', 'Sailing the Regatta Boat! Press [E] or [Space] anytime to hop off where you are!');
        completeQuest('q-boat');
      } else {
        disembarkBoatAtCurrentLocation();
      }
      return;
    }

    if (lm.type === 'portal') {
      openDialogueModal({
        speaker: 'The Great Portal Gate',
        role: 'EAST CAPE · ARCHIPELAGO & CROSS-OCEAN THRESHOLD',
        portrait: 'assets/gallery/Hermes.png',
        text: 'The Great Portal Gate links Los Angeles and New Zealand across the Great Seam—and also folds space directly out to the 4 Outer Buildable Sanctuary Islands surrounding Blåhaj Island!',
        actions: [
          {
            label: '🛒🔦 Enter 3D IKEA Spawning Pits Stealth Dungeon (Walkable Flat-Pack Heist) 📦✂️',
            className: 'btn-accent',
            onClick: () => {
              closeDialogueModal();
              enterSpawningPits(false);
            }
          },
          {
            label: '📋 Spawning Pits Tactical Dispatch & Book of Named Sharks ✂️🦈',
            className: 'btn-primary',
            onClick: () => {
              closeDialogueModal();
              openSpawningPitsRaidModal();
            }
          },
          {
            label: '🌀 The First Whirlings (Sacred Spin & Suds) 🧺🫧',
            className: 'btn-primary',
            onClick: () => {
              closeDialogueModal();
              enterLaundromat();
            }
          },
          {
            label: 'East Island: Hermes’ Starlight Atoll 🌀',
            className: 'btn-primary',
            onClick: () => {
              closeDialogueModal();
              teleportToSanctuaryIsland('hermes_atoll');
            }
          },
          {
            label: 'SW Island: Solomon’s Meadow Cay ☀️',
            className: 'btn-accent',
            onClick: () => {
              closeDialogueModal();
              teleportToSanctuaryIsland('solomon_cay');
            }
          },
          {
            label: 'NW Island: Hiram’s Forge & Birch Isle 🔧',
            className: 'btn-accent',
            onClick: () => {
              closeDialogueModal();
              teleportToSanctuaryIsland('hiram_isle');
            }
          },
          {
            label: 'NE Island: Nimue’s Whispering Sanctuary ✨',
            className: 'btn-accent',
            onClick: () => {
              closeDialogueModal();
              teleportToSanctuaryIsland('nimue_sanctuary');
            }
          },
          {
            label: 'Co-op Room Settings [P] 🌌',
            className: 'btn-secondary',
            onClick: () => {
              closeDialogueModal();
              togglePortalModal();
            }
          }
        ]
      });
      return;
    }

    if (lm.type === 'library') {
      enterTelescopeMode();
      return;
    }

    if (lm.type === 'teahouse') {
      CozyAudio.teaPour();
      player.teaComfort = 100;
      player.warmth = 100;
      player.teaSharedCount++;
      const cleaned = adjustSharkMange(player.sharkId, -0.25, 'Tea House Bath');
      updateMetersUI();
      completeQuest('q-tea');
      completeQuest('q-em-biscuit');
      openDialogueModal({
        speaker: 'The Sacred Tea House',
        role: 'TEMPLE OF THE EVER-BOILING KETTLE',
        portrait: 'assets/gallery/Emergency-1.png',
        text: `The Golden Teapot steams gently beside the Eternal Biscuit Tin. The warm herbal bath cleanses your plush coat and fluffs your seams (Mange reduced to ${Math.round(cleaned * 100)}%)! You pour a fresh cup of Earl Grey of Enlightenment—and rescue the Biscuit of Impossible Dunking right at the safe dunking interval!`,
        actions: [
          {
            label: 'Sip Steaming Tea (+100% Comfort & 5m Steaming Spirit Buff) 🍵',
            className: 'btn-primary',
            onClick: () => {
              applySteamingSpiritBuff();
              closeDialogueModal();
            }
          },
          {
            label: 'Deep Groom & Brush Plush Coat (-20% Mange) 🪮',
            className: 'btn-secondary',
            onClick: () => {
              CozyAudio.groomBrush();
              const next = adjustSharkMange(player.sharkId, -0.20, 'Deep Grooming');
              showToast('TEA HOUSE PLUSH GROOMING 🪮', `Fleece groomed and fluffed! (Mange: ${Math.round(next * 100)}%)`);
              addChatLog(`🪮 Deep grooming at the Tea House brushed out loose threads and restored ${LORE.sharks[player.sharkId].name}'s coat (Mange: ${Math.round(next * 100)}%).`, 'success');
              closeDialogueModal();
            }
          }
        ]
      });
      return;
    }

    if (lm.type === 'volcano') {
      CozyAudio.portalChime();
      player.volcanoHonour = 100;
      updateMetersUI();
      openDialogueModal({
        speaker: 'The Volcano Temple Balcony',
        role: 'RESPECT THE DEPTHS · KNOCK THE CARROTS',
        portrait: 'assets/gallery/Volcano-temple.png',
        text: 'High on the Front Volcano Temple Balcony overlooking Blåhaj Island, eight Dare-Carrots in bright beach shorts stand along the cliff rim waiting to be bumped off the edge! You can also offer sacred tea at the altar or spend your Volcano Trial Points.',
        actions: [
          {
            label: 'Honor the Volcano! 🌋 (100% Harmony)',
            className: 'btn-primary',
            onClick: () => {
              closeDialogueModal();
              spawnFloatingBurst(player.pos, 0xff6b24, 18);
              showToast('VOLCANO APPEASED', 'Walk into the Carrots along the balcony ledge to bump them off!');
            }
          },
          {
            label: 'Open Volcano Trial Upgrades [U] ⚔️',
            className: 'btn-accent',
            onClick: () => {
              closeDialogueModal();
              toggleUpgradesModal();
            }
          }
        ]
      });
      return;
    }

    if (lm.type === 'volleyball') {
      enterVolleyballCourt();
      return;
    }

    if (lm.type === 'spherical') {
      completeQuest('q-sw-feast');
      enterSphericalFoods();
      return;
    }

    if (lm.type === 'laundry') {
      CozyAudio.portalChime();
      player.warmth = 100;
      updateMetersUI();
      completeQuest('q-em-whirl');
      openDialogueModal({
        speaker: 'The Laundry of Initiation',
        role: 'THE FIRST WHIRLINGS · SPIN · RINSE · REMEMBER',
        portrait: 'assets/gallery/Whirlings.png',
        text: '“Not of the sea, but of change. You will emerge softer, wiser, more yourself.” Under the vigilant gaze of the Pink Guard, the warm cycle purges every fabric snag and restores your plush density!',
        actions: [
          {
            label: 'Enter The First Whirlings (Mega Washer #7) 🧺🫧',
            className: 'btn-accent',
            onClick: () => {
              closeDialogueModal();
              enterLaundromat();
            }
          },
          {
            label: 'Trust the Spin ✨ (100% Stuffing Coherence)',
            className: 'btn-primary',
            onClick: () => {
              closeDialogueModal();
              spawnFloatingBurst(player.pos, 0x56c2ff, 16);
              showToast('THE FIRST WHIRLINGS', 'You emerge softer, wiser, and more yourself!');
            }
          }
        ]
      });
      return;
    }

    if (lm.type === 'pier') {
      completeQuest('q-sw-wedding');
      openPierNotesModal();
    }
  }

  function teleportToSanctuaryIsland(islandId) {
    const isl = (LORE.sanctuaryIslands || []).find((x) => x.id === islandId);
    if (!isl) return;
    CozyAudio.portalChime();
    player.inBoat = false;
    player.ridingWithPartner = false;
    const py = worldApi.getGroundAndStructureHeight(isl.signX, isl.signZ);
    player.pos.set(isl.signX, py, isl.signZ);
    completeQuest('q-outer-island');
    spawnFloatingBurst(player.pos, isl.themeColor || 0x9b6dff, 18);
    showToast(`ARRIVED: ${isl.name.toUpperCase()}`, 'Switch to Hiram [3] + [C] to build on this Sanctuary Island!');
  }

  // ==========================================================================
  // UI MODALS, GALLERY, UPGRADES, QUEST TRACKER & ENDLESS PIER NOTES
  // ==========================================================================

  // ==========================================================================
  // GAME SETTINGS, AUDIO & VISUAL PREFERENCES ENGINE
  // ==========================================================================
  function loadSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        Object.assign(gameSettings, DEFAULT_SETTINGS, parsed);
      }
    } catch (e) {
      console.warn('Failed to load settings:', e);
    }
  }

  function saveSettings() {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(gameSettings));
      const hint = document.getElementById('settings-save-hint');
      if (hint) {
        hint.classList.add('visible');
        clearTimeout(hint._timer);
        hint._timer = setTimeout(() => hint.classList.remove('visible'), 1600);
      }
    } catch (e) {
      console.warn('Failed to save settings:', e);
    }
  }

  function applySetting(key, val, shouldSave = true) {
    gameSettings[key] = val;

    // Audio volume & mutes
    if (key === 'masterVol' || key === 'masterMute' || key === 'musicVol' || key === 'musicMute' || key === 'sfxVol' || key === 'sfxMute' || key === 'ambientVol' || key === 'ambientMute') {
      CozyAudio.syncVolumes(gameSettings);
      syncLoadingAudioState();
    }

    // Camera perspective
    if (key === 'fov') {
      if (camera) {
        camera.fov = Number(val);
        camera.updateProjectionMatrix();
      }
    }
    if (key === 'camDist') {
      camState.distance = Number(val);
    }
    if (key === 'shoulder') {
      if (val === 'right') camState.shoulderRight = 0.85;
      else if (val === 'left') camState.shoulderRight = -0.85;
      else camState.shoulderRight = 0.0;
    }

    // Graphics & Visuals
    if (key === 'binocularInvertY' || key === 'binocularInvertX') {
      updateBinocularControlButtons();
    }
    if (key === 'bloom') {
      if (bloomPassInstance) bloomPassInstance.enabled = !!val;
    }
    if (key === 'shadows') {
      if (playerShadow) playerShadow.visible = !!val;
    }
    if (key === 'oceanWaves') {
      if (window.BlahajWorld && window.BlahajWorld.setWaveState) {
        window.BlahajWorld.setWaveState({ auto: !!val, amplitude: val ? 1.0 : 0.2 });
      }
    }

    // HUD & Interface
    if (key === 'streamerMode') {
      document.body.classList.toggle('clean-streamer-mode', !!val);
    }
    if (key === 'compassVis') {
      const el = document.getElementById('compass-strip');
      if (el) el.style.display = val ? '' : 'none';
    }
    if (key === 'nametagsVis') {
      const el = document.getElementById('world-labels');
      if (el) el.style.display = val ? '' : 'none';
    }
    if (key === 'questVis') {
      const el = document.getElementById('quest-tracker');
      if (el) el.style.display = val ? '' : 'none';
    }
    if (key === 'chatVis') {
      const el = document.querySelector('.hud-bottom-left');
      if (el) el.style.display = val ? '' : 'none';
    }

    if (shouldSave) saveSettings();
  }

  function applyAllSettings() {
    for (const [k, v] of Object.entries(gameSettings)) {
      applySetting(k, v, false);
    }
    syncSettingsUI();
  }

  function syncSettingsUI() {
    // Audio
    const mVol = document.getElementById('set-master-vol');
    if (mVol) mVol.value = gameSettings.masterVol;
    const mVolVal = document.getElementById('set-master-vol-val');
    if (mVolVal) mVolVal.textContent = `${gameSettings.masterVol}%`;
    const mMute = document.getElementById('set-master-mute');
    if (mMute) mMute.checked = !!gameSettings.masterMute;

    const mscVol = document.getElementById('set-music-vol');
    if (mscVol) mscVol.value = gameSettings.musicVol;
    const mscVolVal = document.getElementById('set-music-vol-val');
    if (mscVolVal) mscVolVal.textContent = `${gameSettings.musicVol}%`;
    const mscMute = document.getElementById('set-music-mute');
    if (mscMute) mscMute.checked = !!gameSettings.musicMute;

    const sVol = document.getElementById('set-sfx-vol');
    if (sVol) sVol.value = gameSettings.sfxVol;
    const sVolVal = document.getElementById('set-sfx-vol-val');
    if (sVolVal) sVolVal.textContent = `${gameSettings.sfxVol}%`;
    const sMute = document.getElementById('set-sfx-mute');
    if (sMute) sMute.checked = !!gameSettings.sfxMute;

    const aVol = document.getElementById('set-ambient-vol');
    if (aVol) aVol.value = gameSettings.ambientVol;
    const aVolVal = document.getElementById('set-ambient-vol-val');
    if (aVolVal) aVolVal.textContent = `${gameSettings.ambientVol}%`;
    const aMute = document.getElementById('set-ambient-mute');
    if (aMute) aMute.checked = !!gameSettings.ambientMute;

    const uVol = document.getElementById('set-ufo-vol');
    if (uVol) uVol.value = gameSettings.ufoVol ?? 80;
    const uVolVal = document.getElementById('set-ufo-vol-val');
    if (uVolVal) uVolVal.textContent = `${gameSettings.ufoVol ?? 80}%`;
    const uMute = document.getElementById('set-ufo-mute');
    if (uMute) uMute.checked = !!gameSettings.ufoMute;

    const foot = document.getElementById('set-footsteps');
    if (foot) foot.checked = !!gameSettings.footsteps;
    const birbs = document.getElementById('set-birbs');
    if (birbs) birbs.checked = !!gameSettings.birbCalls;

    // Camera
    const fov = document.getElementById('set-fov');
    if (fov) fov.value = gameSettings.fov;
    const fovVal = document.getElementById('set-fov-val');
    if (fovVal) fovVal.textContent = `${gameSettings.fov}°`;

    const cDist = document.getElementById('set-cam-dist');
    if (cDist) cDist.value = gameSettings.camDist;
    const cDistVal = document.getElementById('set-cam-dist-val');
    if (cDistVal) cDistVal.textContent = `${Number(gameSettings.camDist).toFixed(1)}m`;

    document.querySelectorAll('#group-shoulder .btn-group-item').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.shoulder === gameSettings.shoulder);
    });

    document.querySelectorAll('#group-ad-mode .btn-group-item').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.admode === (gameSettings.adTurnMode || 'strafe'));
    });

    document.querySelectorAll('#group-fin-mode .btn-group-item').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.finmode === (gameSettings.finModeStyle || 'smart'));
    });

    const ufoChaseEl = document.getElementById('set-ufo-chase-cam');
    if (ufoChaseEl) ufoChaseEl.checked = gameSettings.ufoAutoChaseCam !== false;
    document.querySelectorAll('#group-ufo-space-style .btn-group-item').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.spacestyle === (gameSettings.ufoSpaceFlightStyle || 'coupled'));
    });
    const ufoAutoRollEl = document.getElementById('set-ufo-space-autolevel');
    if (ufoAutoRollEl) ufoAutoRollEl.checked = !!gameSettings.ufoSpaceAutoLevelRoll;
    const ufoVertKeysEl = document.getElementById('set-ufo-space-vertkeys');
    if (ufoVertKeysEl) ufoVertKeysEl.checked = !!gameSettings.ufoSpaceVerticalKeys;
    const ufoInvPitchEl = document.getElementById('set-ufo-space-invertpitch');
    if (ufoInvPitchEl) ufoInvPitchEl.checked = !!gameSettings.ufoSpaceInvertPitch;
    document.querySelectorAll('#group-ufo-space-qe .btn-group-item').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.qemode === (gameSettings.ufoSpaceQEMode || 'yaw'));
    });
    document.querySelectorAll('#group-ufo-space-mousex .btn-group-item').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mousex === (gameSettings.ufoSpaceMouseXMode || 'roll'));
    });
    window.gameSettings = gameSettings;
    if (window.BlahajUFO && typeof window.BlahajUFO.updateAvionicsButtonsUI === 'function') {
      window.BlahajUFO.updateAvionicsButtonsUI();
    }

    const invY = document.getElementById('set-invert-y');
    if (invY) invY.checked = !!gameSettings.invertY;
    const bInY = document.getElementById('set-binoc-invert-y');
    if (bInY) bInY.checked = !!gameSettings.binocularInvertY;
    const bInX = document.getElementById('set-binoc-invert-x');
    if (bInX) bInX.checked = !!gameSettings.binocularInvertX;

    const mSens = document.getElementById('set-mouse-sens');
    if (mSens) mSens.value = Math.round(gameSettings.mouseSens * 10);
    const mSensVal = document.getElementById('set-mouse-sens-val');
    if (mSensVal) mSensVal.textContent = `${Number(gameSettings.mouseSens).toFixed(1)}x`;

    // Visuals
    const bloom = document.getElementById('set-bloom');
    if (bloom) bloom.checked = !!gameSettings.bloom;
    const shdw = document.getElementById('set-shadows');
    if (shdw) shdw.checked = !!gameSettings.shadows;
    const ofw = document.getElementById('set-ocean-fx');
    if (ofw) ofw.checked = !!gameSettings.oceanWaves;

    // HUD
    const cMode = document.getElementById('set-clean-mode');
    if (cMode) cMode.checked = !!gameSettings.streamerMode;
    const compVis = document.getElementById('set-compass-vis');
    if (compVis) compVis.checked = !!gameSettings.compassVis;
    const nameVis = document.getElementById('set-nametags-vis');
    if (nameVis) nameVis.checked = !!gameSettings.nametagsVis;
    const qVis = document.getElementById('set-quest-vis');
    if (qVis) qVis.checked = !!gameSettings.questVis;
    const cVis = document.getElementById('set-chat-vis');
    if (cVis) cVis.checked = !!gameSettings.chatVis;

    syncLoadingAudioState();
  }

  function openSettingsModal(defaultTab = 'audio') {
    releasePointerLock();
    clearAllMovementKeys();
    const modal = document.getElementById('settings-modal');
    if (modal) {
      modal.classList.remove('hidden');
      switchSettingsTab(defaultTab);
      syncSettingsUI();
    }
  }

  function closeSettingsModal() {
    const modal = document.getElementById('settings-modal');
    if (modal) modal.classList.add('hidden');
  }

  function toggleSettingsModal() {
    const modal = document.getElementById('settings-modal');
    if (modal && !modal.classList.contains('hidden')) {
      closeSettingsModal();
    } else {
      openSettingsModal();
    }
  }

  function switchSettingsTab(tabName) {
    const tabButtons = document.querySelectorAll('#settings-tabs .settings-tab');
    tabButtons.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
    });
    const panels = document.querySelectorAll('#settings-modal .settings-panel');
    panels.forEach(p => {
      if (p.id === `panel-${tabName}`) {
        p.classList.remove('hidden');
        p.classList.add('active');
      } else {
        p.classList.add('hidden');
        p.classList.remove('active');
      }
    });
  }


  // ==========================================================================
  // DEVELOPER DEBUG CONSOLE & GREAT SEAM SYSTEM CONTROLS
  // (UNLOCKED BY TYPING "BLAHAJ")
  // ==========================================================================
  let secretCheatBuffer = '';
  window.addEventListener('keydown', (e) => {
    // Listen for secret word "blahaj" (case-insensitive)
    if (e.key && e.key.length === 1) {
      secretCheatBuffer = (secretCheatBuffer + e.key.toLowerCase()).slice(-10);
      if (secretCheatBuffer.endsWith('blahaj')) {
        secretCheatBuffer = '';
        unlockDeveloperDebugPanel();
      }
    }
  });

  function unlockDeveloperDebugPanel() {
    const tabBtn = document.getElementById('tab-btn-debug');
    if (tabBtn) tabBtn.classList.remove('hidden');
    openSettingsModal('debug');
    switchSettingsTab('debug');
    renderDebugPanelState();
    CozyAudio.portalChime();
    showToast('🛠️ DEVELOPER DEBUG PANEL UNLOCKED!', 'Welcome Architect! Great Seam controls & systems diagnostics revealed.');
    addChatLog('🛠️ <strong>DEVELOPER DEBUG UNLOCKED:</strong> Great Seam & Incursion simulation controls enabled in Settings!', 'system');
  }

  function teleportToRift(rift) {
    if (!rift) return;
    closeSettingsModal();

    if (rift.zone === 'volcano') {
      if (currentZone !== 'volcano') {
        enterVolcanoTrial();
      }
      setTimeout(() => {
        player.pos.set(rift.pos.x, rift.pos.y + 0.35, rift.pos.z + 1.8);
      }, 300);
    } else if (rift.zone === 'laundromat') {
      if (currentZone !== 'laundromat') {
        enterLaundromat();
      }
      setTimeout(() => {
        player.pos.set(rift.pos.x, rift.pos.y + 0.35, rift.pos.z + 1.5);
      }, 300);
    } else if (rift.zone === 'spherical_foods') {
      if (currentZone !== 'spherical_foods') {
        currentZone = 'spherical_foods';
        if (window.BlahajSphericalFoods) window.BlahajSphericalFoods.setActive(true);
      }
      setTimeout(() => {
        player.pos.set(rift.pos.x, rift.pos.y + 0.35, rift.pos.z + 1.5);
      }, 300);
    } else {
      if (currentZone !== 'island') {
        currentZone = 'island';
        if (window.BlahajVolcano) window.BlahajVolcano.setActive(false);
        if (window.BlahajLaundromat) window.BlahajLaundromat.setActive(false);
        if (window.BlahajSphericalFoods) window.BlahajSphericalFoods.setActive(false);
      }
      player.pos.set(rift.pos.x, rift.pos.y + 0.35, rift.pos.z + 1.8);
    }

    if (window.BlahajSeam) window.BlahajSeam.onZoneChanged(currentZone);
    showToast('WARPED TO RIFT! 🌀', `Arrived at ${rift.name}`);
  }

  function renderDebugPanelState() {
    if (!window.BlahajSeam) return;
    const st = window.BlahajSeam.getState();

    // 1. Badge & State Text
    const badge = document.getElementById('dbg-seam-status-badge');
    const stateVal = document.getElementById('dbg-cycle-state');
    if (badge && stateVal) {
      if (st.state === 'incursion') {
        badge.className = 'debug-status-pill status-incursion';
        badge.textContent = '🚨 COSMIC INCURSION ACTIVE';
        stateVal.textContent = 'BREACHED (Invaders on Land!)';
        stateVal.style.color = '#f43f5e';
      } else {
        badge.className = 'debug-status-pill status-calm';
        badge.textContent = '🟢 PEACEFUL HUNT';
        stateVal.textContent = 'Calm (Seam Stable)';
        stateVal.style.color = '#10b981';
      }
    }

    // 2. Timer Readout
    const timerVal = document.getElementById('dbg-cycle-timer');
    if (timerVal) {
      const mins = Math.floor(st.timer / 60);
      const secs = Math.floor(st.timer % 60);
      timerVal.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    // 3. Rifts Count
    const riftsVal = document.getElementById('dbg-rifts-count');
    if (riftsVal) {
      riftsVal.textContent = `${st.mendedCount} / ${st.totalRifts}`;
      player.seamMendedCount = st.mendedCount;
      updateMetersUI();
    }

    // 4. Invaders Count
    const invVal = document.getElementById('dbg-invaders-count');
    if (invVal) {
      if (st.state === 'incursion') {
        const remaining = Math.max(0, st.invadersNeeded - st.invadersBanished);
        invVal.textContent = `${remaining} Remaining on Land! (${st.invadersBanished} banished)`;
        invVal.style.color = '#f43f5e';
      } else {
        invVal.textContent = '0 (Pacified in Ocean)';
        invVal.style.color = '#10b981';
      }
    }

    // 5. Active Rifts Directory List
    const riftsList = document.getElementById('dbg-rifts-list');
    if (riftsList && st.rifts) {
      riftsList.innerHTML = '';
      st.rifts.forEach((r, idx) => {
        const item = document.createElement('div');
        item.className = 'debug-rift-item';

        const info = document.createElement('div');
        info.className = 'debug-rift-info';

        const nameRow = document.createElement('div');
        nameRow.className = 'debug-rift-name-row';

        const title = document.createElement('span');
        title.className = 'debug-rift-title';
        title.innerHTML = `${r.mended ? '✅' : '🌌'} Rift #${idx + 1}: ${r.name}`;

        const badge = document.createElement('span');
        badge.className = `debug-rift-zone-badge debug-rift-zone-${r.zone}`;
        badge.textContent = r.zone;

        nameRow.appendChild(title);
        nameRow.appendChild(badge);

        const desc = document.createElement('span');
        desc.className = 'debug-rift-desc';
        desc.textContent = `${r.desc} · Pos: [${Math.round(r.pos.x)}, ${Math.round(r.pos.y)}, ${Math.round(r.pos.z)}] · ${r.mended ? 'Mended ✨' : 'OPEN TEAR'}`;

        info.appendChild(nameRow);
        info.appendChild(desc);

        const warpBtn = document.createElement('button');
        warpBtn.type = 'button';
        warpBtn.className = 'btn-debug btn-accent';
        warpBtn.textContent = `Warp to Rift #${idx + 1} 🌀`;
        warpBtn.addEventListener('click', () => teleportToRift(r));

        item.appendChild(info);
        item.appendChild(warpBtn);
        riftsList.appendChild(item);
      });
    }
  }

  function setupDebugPanelUI() {
    // Great Seam Action Buttons
    document.getElementById('dbg-btn-trigger-incursion')?.addEventListener('click', () => {
      if (window.BlahajSeam) {
        window.BlahajSeam.triggerIncursion(true);
        renderDebugPanelState();
      }
    });

    document.getElementById('dbg-btn-ff-15m')?.addEventListener('click', () => {
      if (window.BlahajSeam) {
        window.BlahajSeam.fastForward(900);
        renderDebugPanelState();
      }
    });

    document.getElementById('dbg-btn-rewind-15m')?.addEventListener('click', () => {
      if (window.BlahajSeam) {
        window.BlahajSeam.rewind(900);
        renderDebugPanelState();
      }
    });

    document.getElementById('dbg-btn-set-30s')?.addEventListener('click', () => {
      if (window.BlahajSeam) {
        window.BlahajSeam.setCountdown(30);
        renderDebugPanelState();
      }
    });

    document.getElementById('dbg-btn-reroll-rifts')?.addEventListener('click', () => {
      if (window.BlahajSeam) {
        window.BlahajSeam.rerollRifts();
        renderDebugPanelState();
        showToast('6 RIFTS REROLLED! 🎲', 'Scattered fresh cosmic rifts across island & dungeon instances!');
      }
    });

    document.getElementById('dbg-btn-mend-all')?.addEventListener('click', () => {
      if (window.BlahajSeam) {
        window.BlahajSeam.instaMendAll();
        renderDebugPanelState();
      }
    });

    document.getElementById('dbg-btn-banish-invaders')?.addEventListener('click', () => {
      if (window.BlahajSeam) {
        window.BlahajSeam.banishAllInvaders();
        renderDebugPanelState();
      }
    });

    // Extensible Tools
    document.getElementById('dbg-btn-wipe-mange')?.addEventListener('click', () => {
      setSharkMange(0.0);
      showToast('DEMANGED! ✨', 'Your shark coat is fresh, clean and silk-smooth!');
    });

    document.getElementById('dbg-btn-give-trial-pts')?.addEventListener('click', () => {
      player.trialPoints += 5;
      updateMetersUI();
      renderUpgradesGrid();
      showToast('+5 TRIAL POINTS! ⭐', 'Trial currency added to your pouch!');
    });

    document.getElementById('dbg-btn-give-crafting-pack')?.addEventListener('click', () => {
      if (player.inventory) {
        player.inventory.addItem('sulfur', 3);
        player.inventory.addItem('birb_down', 4);
        player.inventory.addItem('guano', 3);
        player.inventory.addItem('driftwood', 4);
        showToast('CRAFTING PACK GRANTED! 🎒', 'Received Volcanic Sulfur, Birb Down, Guano & Driftwood!');
      }
    });

    document.getElementById('dbg-btn-toggle-hud')?.addEventListener('click', () => {
      toggleMinimalHUD();
    });

    // Listen to live state updates
    if (window.BlahajSeam) {
      window.BlahajSeam.onStateChange(renderDebugPanelState);
    }
  }

  function setupSettingsUI() {
    setupDebugPanelUI();
    // Tab switching
    document.querySelectorAll('#settings-tabs .settings-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        switchSettingsTab(btn.getAttribute('data-tab'));
      });
    });

    // Close buttons
    document.getElementById('close-settings-modal')?.addEventListener('click', closeSettingsModal);
    document.getElementById('btn-done-settings')?.addEventListener('click', closeSettingsModal);

    // Reset Defaults button
    document.getElementById('btn-reset-settings')?.addEventListener('click', () => {
      Object.assign(gameSettings, DEFAULT_SETTINGS);
      saveSettings();
      applyAllSettings();
      CozyAudio.shonk();
      showToast('SETTINGS RESTORED', 'Default island preferences applied.');
    });

    // Test Sound button
    document.getElementById('btn-test-sound')?.addEventListener('click', () => {
      CozyAudio.ensure();
      CozyAudio.shonk();
      setTimeout(() => CozyAudio.laundromatDing(), 160);
    });

    // Audio sliders & toggles
    document.getElementById('set-master-vol')?.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      document.getElementById('set-master-vol-val').textContent = `${val}%`;
      applySetting('masterVol', val);
    });
    document.getElementById('set-master-mute')?.addEventListener('change', (e) => {
      applySetting('masterMute', e.target.checked);
    });

    document.getElementById('set-music-vol')?.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      const readout = document.getElementById('set-music-vol-val');
      if (readout) readout.textContent = `${val}%`;
      applySetting('musicVol', val);
    });
    document.getElementById('set-music-mute')?.addEventListener('change', (e) => {
      applySetting('musicMute', e.target.checked);
    });

    document.getElementById('set-sfx-vol')?.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      document.getElementById('set-sfx-vol-val').textContent = `${val}%`;
      applySetting('sfxVol', val);
    });
    document.getElementById('set-sfx-mute')?.addEventListener('change', (e) => {
      applySetting('sfxMute', e.target.checked);
    });

    document.getElementById('set-ambient-vol')?.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      document.getElementById('set-ambient-vol-val').textContent = `${val}%`;
      applySetting('ambientVol', val);
    });
    document.getElementById('set-ambient-mute')?.addEventListener('change', (e) => {
      applySetting('ambientMute', e.target.checked);
    });

    document.getElementById('set-ufo-vol')?.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      document.getElementById('set-ufo-vol-val').textContent = `${val}%`;
      applySetting('ufoVol', val);
    });
    document.getElementById('set-ufo-mute')?.addEventListener('change', (e) => {
      applySetting('ufoMute', e.target.checked);
    });

    document.getElementById('set-footsteps')?.addEventListener('change', (e) => {
      applySetting('footsteps', e.target.checked);
    });
    document.getElementById('set-birbs')?.addEventListener('change', (e) => {
      applySetting('birbCalls', e.target.checked);
    });

    // Camera & Controls
    document.getElementById('set-fov')?.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      document.getElementById('set-fov-val').textContent = `${val}°`;
      applySetting('fov', val);
    });
    document.getElementById('set-cam-dist')?.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      document.getElementById('set-cam-dist-val').textContent = `${val.toFixed(1)}m`;
      applySetting('camDist', val);
    });

    document.querySelectorAll('#group-shoulder .btn-group-item').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#group-shoulder .btn-group-item').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        applySetting('shoulder', btn.dataset.shoulder);
      });
    });

    document.querySelectorAll('#group-ad-mode .btn-group-item').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#group-ad-mode .btn-group-item').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        applySetting('adTurnMode', btn.dataset.admode);
        showToast(
          btn.dataset.admode === 'turn' ? 'CLASSIC KEYBOARD TURNING [A / D] 🔄' : 'MMO STRAFE MODE [A / D] 🦈',
          btn.dataset.admode === 'turn'
            ? 'A and D now turn your shark Left and Right (Right-Click + A/D still strafes).'
            : 'A and D now Strafe Left and Right while facing your target!'
        );
      });
    });

    document.querySelectorAll('#group-fin-mode .btn-group-item').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#group-fin-mode .btn-group-item').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        applySetting('finModeStyle', btn.dataset.finmode);
        if (typeof window._blahajSyncCaptureUI === 'function') window._blahajSyncCaptureUI();
        showToast(
          btn.dataset.finmode === 'persistent' ? '🦈 FIN CURSOR: PERSISTENT MODE STRIP' : '🦈 FIN CURSOR: SMART AUTO',
          btn.dataset.finmode === 'persistent'
            ? 'Bottom-right Fin Mode Strip stays visible & remembers your chosen tool (1 Use · 2 Sense · 3 Pet).'
            : 'Left-click picks the natural action automatically (tap 1–3 while holding Right-Click to override).'
        );
      });
    });

    window.applyGameSetting = applySetting;
    document.getElementById('set-ufo-chase-cam')?.addEventListener('change', (e) => {
      applySetting('ufoAutoChaseCam', e.target.checked);
      if (window.BlahajUFO && typeof window.BlahajUFO.updateAvionicsButtonsUI === 'function') {
        window.BlahajUFO.updateAvionicsButtonsUI();
      }
    });
    document.querySelectorAll('#group-ufo-space-style .btn-group-item').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#group-ufo-space-style .btn-group-item').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        applySetting('ufoSpaceFlightStyle', btn.dataset.spacestyle);
        showToast(
          btn.dataset.spacestyle === 'newtonian' ? '🪐 SPACE FLIGHT: NEWTONIAN DRIFT' : '🛸 SPACE FLIGHT: COUPLED ASSIST',
          btn.dataset.spacestyle === 'newtonian'
            ? 'Zero-G momentum drift active! Thrust with W/S/Q/E and coast through vacuum.'
            : 'Inertial dampers active! Smoothly stabilizes velocity when thrusters are released.'
        );
      });
    });
    document.getElementById('set-ufo-space-autolevel')?.addEventListener('change', (e) => {
      applySetting('ufoSpaceAutoLevelRoll', e.target.checked);
    });
    document.getElementById('set-ufo-space-vertkeys')?.addEventListener('change', (e) => {
      applySetting('ufoSpaceVerticalKeys', e.target.checked);
    });
    document.getElementById('set-ufo-space-invertpitch')?.addEventListener('change', (e) => {
      applySetting('ufoSpaceInvertPitch', e.target.checked);
    });
    document.querySelectorAll('#group-ufo-space-qe .btn-group-item').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#group-ufo-space-qe .btn-group-item').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        applySetting('ufoSpaceQEMode', btn.dataset.qemode);
      });
    });
    document.querySelectorAll('#group-ufo-space-mousex .btn-group-item').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#group-ufo-space-mousex .btn-group-item').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        applySetting('ufoSpaceMouseXMode', btn.dataset.mousex);
      });
    });

    document.getElementById('set-invert-y')?.addEventListener('change', (e) => {
      applySetting('invertY', e.target.checked);
    });
    document.getElementById('set-binoc-invert-y')?.addEventListener('change', (e) => {
      applySetting('binocularInvertY', e.target.checked);
    });
    document.getElementById('set-binoc-invert-x')?.addEventListener('change', (e) => {
      applySetting('binocularInvertX', e.target.checked);
    });
    document.getElementById('set-mouse-sens')?.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value) / 10.0;
      document.getElementById('set-mouse-sens-val').textContent = `${val.toFixed(1)}x`;
      applySetting('mouseSens', val);
    });

    // Visuals & Graphics
    document.getElementById('set-bloom')?.addEventListener('change', (e) => {
      applySetting('bloom', e.target.checked);
    });
    document.getElementById('set-shadows')?.addEventListener('change', (e) => {
      applySetting('shadows', e.target.checked);
    });
    document.getElementById('set-ocean-fx')?.addEventListener('change', (e) => {
      applySetting('oceanWaves', e.target.checked);
    });

    // HUD & Interface
    document.getElementById('set-clean-mode')?.addEventListener('change', (e) => {
      applySetting('streamerMode', e.target.checked);
    });
    document.getElementById('set-compass-vis')?.addEventListener('change', (e) => {
      applySetting('compassVis', e.target.checked);
    });

    // Passport & Account Action Listeners
    document.getElementById('btn-export-save')?.addEventListener('click', () => {
      if (window.BlahajSaveSystem) window.BlahajSaveSystem.exportSaveFile();
    });

    document.getElementById('input-import-save')?.addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      if (file && window.BlahajSaveSystem) {
        try {
          await window.BlahajSaveSystem.importSaveFile(file);
          showToast('PASSPORT IMPORTED! 📦✨', 'Your save file was loaded successfully!');
        } catch (err) {
          showToast('IMPORT FAILED ⚠️', err.message || 'Could not parse save file.');
        }
      }
    });

    document.getElementById('btn-reset-save')?.addEventListener('click', () => {
      if (confirm('Start a fresh expedition on this save slot? Your current items and progression will be reset.')) {
        if (window.BlahajSaveSystem) {
          window.BlahajSaveSystem.resetCurrentSlot();
          showToast('NEW EXPEDITION COMMENCED 🌅', 'Save slot reset to fresh Island Passport.');
        }
      }
    });
    document.getElementById('set-nametags-vis')?.addEventListener('change', (e) => {
      applySetting('nametagsVis', e.target.checked);
    });
    document.getElementById('set-quest-vis')?.addEventListener('change', (e) => {
      applySetting('questVis', e.target.checked);
    });
    document.getElementById('set-chat-vis')?.addEventListener('change', (e) => {
      applySetting('chatVis', e.target.checked);
    });
  }

  function setupUI() {
    document.querySelectorAll('.shark-slot').forEach((btn) => {
      btn.addEventListener('click', () => spawnPlayerShark(btn.dataset.shark));
    });
    document.getElementById('btn-arch-fireworks')?.addEventListener('click', (e) => {
      e.stopPropagation();
      launchHelenBirthdayFireworks(false);
    });
    document.getElementById('btn-arch-mend')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (window.BlahajSeam && typeof window.BlahajSeam.instaMendAll === 'function') {
        window.BlahajSeam.instaMendAll();
        showToast('👑 ARCHODECT DECREE: SEAMS MENDED!', 'All 6 cosmic rifts across the Archipelago have been stitched!');
      }
    });
    document.getElementById('btn-arch-detag')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (window.BlahajSaveSystem && typeof window.BlahajSaveSystem.openRiteOfDetaggingModal === 'function') {
        window.BlahajSaveSystem.openRiteOfDetaggingModal();
      }
    });
    document.getElementById('slot-o')?.addEventListener('click', () => {
      CozyAudio.ensure();
      toggleSettingsModal();
    });
    if (!window.BlahajMMO) {
      document.getElementById('slot-q')?.addEventListener('click', triggerSignatureAbility);
      document.getElementById('slot-b')?.addEventListener('click', triggerFeedBreb);
      document.getElementById('slot-f')?.addEventListener('click', triggerBeepNose);
    }
    document.getElementById('slot-g')?.addEventListener('click', triggerGroomAvatar);
    document.getElementById('btn-party-groom')?.addEventListener('click', triggerGroomAvatar);
    document.getElementById('btn-groom-prompt')?.addEventListener('click', triggerGroomAvatar);
    document.getElementById('slot-u')?.addEventListener('click', toggleUpgradesModal);
    document.getElementById('pill-open-upgrades')?.addEventListener('click', toggleUpgradesModal);
    document.getElementById('slot-m')?.addEventListener('click', toggleIslandMap);
    document.getElementById('slot-p')?.addEventListener('click', togglePortalModal);
    document.getElementById('btn-open-portal-hud').addEventListener('click', togglePortalModal);

    document.querySelectorAll('.mod-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        currentModule = tab.dataset.mod;
        document.querySelectorAll('.mod-tab').forEach((t) => t.classList.toggle('active', t === tab));
        renderQuestList();
        const modObj = LORE.modules[currentModule];
        showToast(modObj.title.toUpperCase(), modObj.sub);
      });
    });

    // Top-Right Quest Tracker Expander / Collapse Toggle
    const questTrackerEl = document.getElementById('quest-tracker');
    const btnToggleQuest = document.getElementById('btn-toggle-quest-tracker');
    const questHeaderEl = questTrackerEl ? questTrackerEl.querySelector('.quest-header') : null;

    function toggleQuestTrackerMinimized(forceState) {
      if (!questTrackerEl) return;
      const isMin = typeof forceState === 'boolean'
        ? questTrackerEl.classList.toggle('minimized', forceState)
        : questTrackerEl.classList.toggle('minimized');
      if (btnToggleQuest) {
        btnToggleQuest.textContent = isMin ? '▲' : '▼';
        btnToggleQuest.setAttribute('title', isMin ? 'Expand Quest Tracker [Click to expand]' : 'Collapse Quest Tracker [Click to collapse]');
        btnToggleQuest.setAttribute('aria-expanded', isMin ? 'false' : 'true');
      }
      try {
        localStorage.setItem('blahaj_quest_tracker_minimized', isMin ? '1' : '0');
      } catch (e) {}
    }

    if (btnToggleQuest) {
      btnToggleQuest.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleQuestTrackerMinimized();
      });
    }

    if (questHeaderEl) {
      questHeaderEl.title = 'Click to collapse or expand Quest Tracker';
      questHeaderEl.addEventListener('click', (e) => {
        if (e.target === btnToggleQuest || (btnToggleQuest && btnToggleQuest.contains(e.target))) return;
        toggleQuestTrackerMinimized();
      });
    }

    // Restore user preference
    try {
      if (localStorage.getItem('blahaj_quest_tracker_minimized') === '1') {
        toggleQuestTrackerMinimized(true);
      }
    } catch (e) {}

    document.getElementById('dlg-close-btn').addEventListener('click', closeDialogueModal);
    document.getElementById('close-portal-modal').addEventListener('click', togglePortalModal);
    document.getElementById('close-gallery-modal').addEventListener('click', toggleGalleryModal);
    document.getElementById('close-upgrades-modal').addEventListener('click', toggleUpgradesModal);

    const closeCSBtn = document.getElementById('close-charsheet-modal');
    if (closeCSBtn) closeCSBtn.addEventListener('click', closeCharacterSheetModal);

    const closeTrunkModal = document.getElementById('close-trunk-modal');
    if (closeTrunkModal) closeTrunkModal.addEventListener('click', closeCommunityTrunkModal);
    const btnTrunkClose = document.getElementById('btn-trunk-close');
    if (btnTrunkClose) btnTrunkClose.addEventListener('click', closeCommunityTrunkModal);

    const openCSBtn = document.getElementById('btn-open-charsheet');
    if (openCSBtn) openCSBtn.addEventListener('click', () => openCharacterSheet(player.sharkId));

    const slotH = document.getElementById('slot-h');
    if (slotH) slotH.addEventListener('click', toggleHeldItem);

    const slotK = document.getElementById('slot-k');
    if (slotK) slotK.addEventListener('click', () => toggleCharacterSheetModal(player.sharkId));

    const unitFrame = document.getElementById('player-unit-frame');
    if (unitFrame) {
      unitFrame.style.cursor = 'pointer';
      unitFrame.addEventListener('click', (e) => {
        // Do not trigger if clicking on the mange slider or groom button directly
        if (e.target && (e.target.id === 'mange-factor-slider' || e.target.classList.contains('mange-range') || e.target.closest('#btn-groom-hud') || e.target.closest('#hud-archodect-pill') || e.target.closest('#btn-open-homestead-hud'))) {
          return;
        }
        openCharacterSheet(player.sharkId);
      });
    }

    // Character Sheet Shark Selector Tabs
    document.querySelectorAll('.cs-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        renderCharacterSheet(tab.dataset.shark);
      });
    });

    // Character Sheet Subtabs (Inventory, Stats, Emotes)
    document.querySelectorAll('.cs-subtab').forEach((st) => {
      st.addEventListener('click', () => {
        const sub = st.dataset.subtab;
        document.querySelectorAll('.cs-subtab').forEach((s) => s.classList.toggle('active', s === st));
        ['inventory', 'stats', 'emotes'].forEach((name) => {
          const pane = document.getElementById(`pane-${name}`);
          if (pane) pane.classList.toggle('hidden', name !== sub);
        });
      });
    });

    // Switch Active Shark button inside Character Sheet -> Logs out to Character Select Lobby
    const switchActiveBtn = document.getElementById('cs-btn-switch-active');
    if (switchActiveBtn) {
      switchActiveBtn.addEventListener('click', () => {
        if (window.BlahajSaveSystem && selectedCSShark && selectedCSShark !== player.sharkId) {
          window.BlahajSaveSystem.selectLobbyShark(selectedCSShark);
        }
        logOutToCharacterSelect();
      });
    }
    document.getElementById('btn-logout-charselect-hud')?.addEventListener('click', (e) => {
      e.stopPropagation();
      logOutToCharacterSelect();
    });
    document.getElementById('btn-pause-logout-charselect')?.addEventListener('click', (e) => {
      e.stopPropagation();
      logOutToCharacterSelect();
    });

    // Individual Shark Mange Slider inside Character Sheet
    const csMangeSlider = document.getElementById('cs-mange-slider');
    const csMangeValText = document.getElementById('cs-mange-val-text');
    if (csMangeSlider && csMangeValText) {
      csMangeSlider.addEventListener('input', (e) => {
        const pct = parseFloat(e.target.value);
        setSharkMange(selectedCSShark, pct / 100);
        csMangeValText.textContent = formatMangeLabel(pct);
      });
    }

    // Groom Plush Button inside Character Sheet
    const btnCsGroom = document.getElementById('btn-cs-groom');
    if (btnCsGroom) {
      btnCsGroom.addEventListener('click', () => {
        CozyAudio.groomBrush();
        const targetShark = selectedCSShark || player.sharkId;
        const next = adjustSharkMange(targetShark, -0.20, 'Plush Grooming');
        const pct = Math.round(next * 100);
        if (csMangeSlider) csMangeSlider.value = pct;
        if (csMangeValText) csMangeValText.textContent = formatMangeLabel(pct);
        showToast('PLUSH GROOMED 🪮', `Groomed and fluffed ${LORE.sharks[targetShark].name}'s coat! (Mange: ${pct}%)`);
        addChatLog(`🪮 You groomed <strong>${LORE.sharks[targetShark].name}</strong>'s coat with a soft bristle brush (-20% Mange).`, 'info');
      });
    }

    // Individual Shark Accessories Toggles
    const chkRelic = document.getElementById('cs-chk-relic');
    const chkHeadgear = document.getElementById('cs-chk-headgear');
    function onAccessoryToggle() {
      const acc = {
        showRelic: chkRelic ? chkRelic.checked : true,
        showHeadgear: chkHeadgear ? chkHeadgear.checked : true
      };
      setSharkAccessories(selectedCSShark, acc);
    }
    if (chkRelic) chkRelic.addEventListener('change', onAccessoryToggle);
    if (chkHeadgear) chkHeadgear.addEventListener('change', onAccessoryToggle);

    // Emotes buttons inside Character Sheet
    document.querySelectorAll('.cs-emote-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const emote = btn.dataset.emote;
        if (emote === 'shonk') triggerShonkEmote();
        else if (emote === 'beep') triggerBeepNose();
        else if (emote === 'breb') triggerFeedBreb();
        else if (emote === 'volcano') {
          CozyAudio.shonk();
          addChatLog('🌋 <strong>Salute to the Volcano:</strong> “May the magma stay cozy and the carrots bounce high!”', 'lore');
        } else if (emote === 'tea') {
          CozyAudio.teaPour();
          addChatLog('🫖 <strong>Solomon:</strong> “Earl Grey of Enlightenment for everyone! A cup of infinite comfort.”', 'lore');
        } else if (emote === 'sharkitty') {
          CozyAudio.shonk();
          addChatLog('🦈 <em>Sharkitty?</em> · Plush fins flutter happily!', 'lore');
        }
      });
    });

    const vhudCard = document.getElementById('volcano-hud-card');
    if (vhudCard) {
      vhudCard.addEventListener('click', () => hideVolcanoHUDCard());
      vhudCard.addEventListener('pointerenter', () => pauseVolcanoNoticeTimer());
      vhudCard.addEventListener('pointerleave', () => resumeVolcanoNoticeTimer());
    }
    const vhudClose = document.getElementById('vhud-close');
    if (vhudClose) {
      vhudClose.addEventListener('click', (e) => {
        e.stopPropagation();
        hideVolcanoHUDCard();
      });
    }
    const toastBanner = document.getElementById('toast-banner');
    if (toastBanner) {
      toastBanner.addEventListener('click', () => {
        dismissCurrentToast(false);
      });
      toastBanner.addEventListener('pointerenter', () => pauseToastTimer());
      toastBanner.addEventListener('pointerleave', () => resumeToastTimer());
    }
    const toastClose = document.getElementById('toast-close');
    if (toastClose) {
      toastClose.addEventListener('click', (e) => {
        e.stopPropagation();
        dismissCurrentToast(false);
      });
    }

    // Interactive Mange Factor Slider in Unit Frame
    const mangeSlider = document.getElementById('mange-factor-slider');
    const mangeLabel = document.getElementById('mange-value-label');

    if (mangeSlider && mangeLabel) {
      const savedMangePct = Math.round(window.__BLAHAJ_MANGE__ * 100);
      mangeSlider.value = savedMangePct;
      mangeLabel.textContent = formatMangeLabel(savedMangePct);

      mangeSlider.addEventListener('input', (e) => {
        const pct = parseFloat(e.target.value);
        setSharkMange(player.sharkId, pct / 100);
        mangeLabel.textContent = formatMangeLabel(pct);
        if (selectedCSShark === player.sharkId) {
          if (csMangeSlider) csMangeSlider.value = pct;
          if (csMangeValText) csMangeValText.textContent = formatMangeLabel(pct);
        }
      });
    }

    const btnGroomHud = document.getElementById('btn-groom-hud');
    if (btnGroomHud) {
      btnGroomHud.addEventListener('click', (e) => {
        e.stopPropagation();
        CozyAudio.groomBrush();
        const next = adjustSharkMange(player.sharkId, -0.20, 'Plush Grooming');
        if (player.inventory) {
          player.inventory.addItem('plush_fluff', 1);
        }
        showToast('PLUSH GROOMED 🪮', `Brushed ${LORE.sharks[player.sharkId].name}'s coat (-20% Mange)! Gathered +1 Plush Fluff 🧶`);
        addChatLog(`🪮 You groomed <strong>${LORE.sharks[player.sharkId].name}</strong>'s coat with a soft bristle brush (-20% Mange).`, 'info');
      });
    }

    // Celestial Day/Night Clock Widget & Sky Controls Flyout
    // Fast Travel and Binoculars Quick Buttons
    document.getElementById('pill-open-fast-travel')?.addEventListener('click', () => {
      openFastTravelModal();
    });
    document.getElementById('btn-close-travel-modal')?.addEventListener('click', () => {
      closeFastTravelModal();
    });
    document.querySelectorAll('.btn-travel-action').forEach((btn) => {
      btn.addEventListener('click', () => {
        const dest = btn.dataset.dest;
        if (dest) fastTravelTo(dest);
      });
    });
    document.getElementById('pill-quick-binoculars')?.addEventListener('click', () => {
      if (isUsingBinoculars) {
        exitBinocularMode();
      } else {
        if (!playerHeldItem || playerHeldItem.id !== 'binoculars') {
          equipHeldItem('binoculars', false);
        }
        enterBinocularMode();
      }
    });

    document.getElementById('btn-close-binoculars')?.addEventListener('click', (e) => {
      e.stopPropagation();
      exitBinocularMode();
    });

    const btnToggleSky = document.getElementById('btn-toggle-sky-controls');
    const skyFlyout = document.getElementById('sky-controls-flyout');
    const btnCloseSky = document.getElementById('btn-close-sky-controls');
    const btnResyncClock = document.getElementById('btn-resync-clock');
    const skyTimeSlider = document.getElementById('sky-time-slider');
    const btnToggleWaveAuto = document.getElementById('btn-toggle-wave-auto');
    const waveAmpSlider = document.getElementById('wave-amp-slider');

    if (btnToggleSky && skyFlyout) {
      btnToggleSky.addEventListener('click', (e) => {
        e.stopPropagation();
        skyFlyout.classList.toggle('hidden');
        if (!skyFlyout.classList.contains('hidden')) {
          if (document.exitPointerLock) document.exitPointerLock();
        }
      });

      if (btnCloseSky) {
        btnCloseSky.addEventListener('click', () => {
          skyFlyout.classList.add('hidden');
        });
      }

      // Close flyout when clicking outside
      document.addEventListener('click', (e) => {
        if (!skyFlyout.classList.contains('hidden') && !skyFlyout.contains(e.target) && e.target !== btnToggleSky && !btnToggleSky.contains(e.target)) {
          skyFlyout.classList.add('hidden');
        }
      });

      // Quick Preset Buttons: Dawn (6 AM), Noon (12 PM), Sunset (6 PM), Night (12 AM)
      document.querySelectorAll('.btn-sky-preset').forEach((btn) => {
        btn.addEventListener('click', () => {
          const hour = parseFloat(btn.dataset.hour);
          window.__BLAHAJ_DAY_CYCLE__.setManualHour(hour);
          if (btnResyncClock) btnResyncClock.classList.remove('active');
        });
      });

      // Wave Swell Preset Buttons: Calm (0.4x), Moderate (1.0x), High Swell (2.0x)
      document.querySelectorAll('.btn-wave-preset').forEach((btn) => {
        btn.addEventListener('click', () => {
          const amp = parseFloat(btn.dataset.amp);
          const setW = (worldApi && worldApi.setWaveState) || (window.BlahajWorld && window.BlahajWorld.setWaveState);
          if (setW) setW({ auto: false, amplitude: amp });
          document.querySelectorAll('.btn-wave-preset').forEach((b) => b.classList.toggle('active', b === btn));
          if (btnToggleWaveAuto) btnToggleWaveAuto.classList.remove('active');
          if (waveAmpSlider) waveAmpSlider.value = Math.round(amp * 100);
          updateCelestialClockHUD();
        });
      });

      // Wave Swell Slider (20% to 220%)
      if (waveAmpSlider) {
        waveAmpSlider.addEventListener('input', (e) => {
          const amp = parseFloat(e.target.value) / 100.0;
          const setW = (worldApi && worldApi.setWaveState) || (window.BlahajWorld && window.BlahajWorld.setWaveState);
          if (setW) setW({ auto: false, amplitude: amp });
          document.querySelectorAll('.btn-wave-preset').forEach((b) => b.classList.remove('active'));
          if (btnToggleWaveAuto) btnToggleWaveAuto.classList.remove('active');
          updateCelestialClockHUD();
        });
      }

      // Toggle Natural Auto Wave Swell Cycle
      if (btnToggleWaveAuto) {
        btnToggleWaveAuto.addEventListener('click', () => {
          const getW = (worldApi && worldApi.getWaveState) || (window.BlahajWorld && window.BlahajWorld.getWaveState);
          const setW = (worldApi && worldApi.setWaveState) || (window.BlahajWorld && window.BlahajWorld.setWaveState);
          if (getW && setW) {
            const ws = getW();
            setW({ auto: !ws.autoCycle });
            document.querySelectorAll('.btn-wave-preset').forEach((b) => b.classList.remove('active'));
            updateCelestialClockHUD();
          }
        });
      }

      // Scrub Slider (0..1440 in-game minutes)
      if (skyTimeSlider) {
        skyTimeSlider.addEventListener('input', (e) => {
          const val = parseFloat(e.target.value);
          window.__BLAHAJ_DAY_CYCLE__.setManualHour(val / 60.0);
          if (btnResyncClock) btnResyncClock.classList.remove('active');
        });
      }

      // Re-Sync Button
      if (btnResyncClock) {
        btnResyncClock.addEventListener('click', () => {
          window.__BLAHAJ_DAY_CYCLE__.setRealtime();
          btnResyncClock.classList.add('active');
        });
      }
    }

    const zoneBanner = document.querySelector('.zone-banner');
    if (zoneBanner) {
      zoneBanner.style.cursor = 'pointer';
      zoneBanner.title = 'Click to view area guide / lore';
      zoneBanner.addEventListener('click', () => {
        if (currentZone === 'volcano') {
          const key = getVolcanoNoticeKeyForPos(player.pos);
          if (key) showVolcanoHUDNotice(key, true);
        }
      });
    }

    document.getElementById('btn-teleport-rear-wharf').addEventListener('click', () => {
      document.getElementById('upgrades-modal').classList.add('hidden');
      if (currentZone === 'volcano') {
        exitVolcanoTrial(false);
      } else {
        player.inBoat = false;
        player.ridingWithPartner = false;
        player.pos.set(-28, 1.5, -200);
        player.rotY = 0;
        camState.yaw = Math.PI;
        if (player.mesh) {
          player.mesh.position.copy(player.pos);
          player.mesh.rotation.y = player.rotY;
        }
        CozyAudio.portalChime();
        showToast('REAR VOLCANO WHARF', 'Arrived at the North Shore Rear Wharf! Walk forward into the Sea Cave to enter the Volcano Trial!');
      }
    });

    const thumbContainer = document.getElementById('gallery-thumbnails');
    LORE.gallery.forEach((item, index) => {
      const btn = document.createElement('button');
      btn.className = `gallery-thumb-btn ${index === 0 ? 'active' : ''}`;
      btn.innerHTML = `<img src="${item.src}" alt="${item.title}" /><span>${item.title}</span>`;
      btn.addEventListener('click', () => {
        document.querySelectorAll('.gallery-thumb-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('gallery-main-img').src = item.src;
        document.getElementById('gallery-main-title').textContent = item.title;
        document.getElementById('gallery-main-desc').textContent = item.desc;
      });
      thumbContainer.appendChild(btn);
    });

    document.getElementById('chat-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('chat-input');
      const txt = input.value.trim();
      if (!txt) return;
      const sName = LORE.sharks[player.sharkId].name;
      addChatLog(`🗨️ <strong>${sName}:</strong> ${txt}`, 'coop');
      window.BlahajNetwork.send({ type: 'chat', sender: sName, text: txt });
      input.value = '';
      input.blur();
    });
  }

  function renderUpgradesGrid() {
    const grid = document.getElementById('upgrades-grid');
    const ptsEl = document.getElementById('modal-trial-pts');
    if (!grid || !ptsEl) return;

    ptsEl.textContent = player.trialPoints;
    grid.innerHTML = '';

    (LORE.trialUpgrades || []).forEach((up) => {
      const unlocked = player.unlockedUpgrades.has(up.id);
      const card = document.createElement('div');
      card.className = `upgrade-item ${unlocked ? 'unlocked' : ''}`;
      card.innerHTML = `
        <div>
          <div class="upgrade-head">
            <span class="upgrade-icon">${up.icon}</span>
            <h3>${up.name}</h3>
          </div>
          <p class="upgrade-desc">${up.desc}</p>
        </div>
        <button class="${unlocked ? 'btn-secondary' : 'btn-primary'}" ${unlocked ? 'disabled' : ''}>
          ${unlocked ? '✓ Blessing Active' : `Unlock Blessing (${up.cost} Trial Pt)`}
        </button>
      `;

      if (!unlocked) {
        card.querySelector('button').addEventListener('click', () => {
          if (player.trialPoints >= up.cost) {
            player.trialPoints -= up.cost;
            player.unlockedUpgrades.add(up.id);
            CozyAudio.portalChime();
            updateMetersUI();
            renderUpgradesGrid();
            showToast('SHARK BLESSING UNLOCKED!', `${up.name} is now active for all 4 Blue Sharks!`);
            addChatLog(`⚔️✨ Unlocked Volcano Trial Blessing: <strong>${up.name}</strong>!`, 'system');
          } else {
            CozyAudio.trapHit();
            showToast('NEED MORE TRIAL POINTS', 'Survive the Volcano Trial Dungeon or knock 5 Carrots off the Balcony!');
          }
        });
      }

      grid.appendChild(card);
    });
  }

  function toggleUpgradesModal() {
    const m = document.getElementById('upgrades-modal');
    const willOpen = m.classList.contains('hidden');
    if (willOpen) {
      releasePointerLock();
      renderUpgradesGrid();
    }
    m.classList.toggle('hidden');
  }

  function renderQuestList() {
    const mod = LORE.modules[currentModule];
    if (!mod) return;
    document.getElementById('quest-module-title').textContent = mod.title;
    document.getElementById('quest-module-sub').textContent = mod.sub;

    const ul = document.getElementById('quest-list');
    ul.innerHTML = '';
    mod.quests.forEach((q) => {
      const done = completedQuests.has(q.id);
      const li = document.createElement('li');
      li.className = `quest-item ${done ? 'done' : ''}`;
      li.innerHTML = `<span class="q-check">${done ? '☑' : '☐'}</span> <span>${q.text}</span>`;
      ul.appendChild(li);
    });
  }

  function completeQuest(qid) {
    if (!completedQuests.has(qid)) {
      completedQuests.add(qid);
      renderQuestList();
      if (window.BlahajSaveSystem) window.BlahajSaveSystem.queueAutoSave();
    }
  }

  function updateMetersUI() {
    const wBar = document.getElementById('bar-warmth');
    const wLbl = document.getElementById('label-warmth');
    if (wBar && wLbl) {
      wBar.style.width = `${Math.round(player.warmth)}%`;
      wLbl.textContent = `Stuffing Coherence · ${Math.round(player.warmth)}%`;
    }
    document.getElementById('bar-tea').style.width = `${player.teaComfort}%`;
    document.getElementById('label-tea').textContent = `Tea Comfort · Steaming (${player.teaComfort}%)`;
    document.getElementById('val-volcano').textContent = `${player.volcanoHonour}%`;
    document.getElementById('val-seam').textContent = `${player.seamMendedCount} / 6`;
    document.getElementById('val-carrots').textContent = `${player.carrotsKnockedCount}`;
    document.getElementById('val-birbs').textContent = `${player.birbsFedCount}`;
    document.getElementById('val-trial-pts').textContent = `${player.trialPoints} Pt${player.trialPoints === 1 ? '' : 's'}`;
    const slotUSub = document.getElementById('slot-u-sub');
    if (slotUSub) {
      slotUSub.textContent = `${player.trialPoints} Trial Pt${player.trialPoints === 1 ? '' : 's'}`;
    }

    // Refresh MMO Action Bar or legacy Slot B dynamic quantity badge
    if (window.BlahajMMO && typeof window.BlahajMMO.renderActionBarUI === 'function') {
      window.BlahajMMO.renderActionBarUI();
    } else {
      const slotB = document.getElementById('slot-b');
      if (slotB && player.inventory) {
        const bCount = player.inventory.getItemCount('breb');
        const nameEl = slotB.querySelector('.slot-name');
        const powerEl = slotB.querySelector('.slot-power');
        if (nameEl) nameEl.textContent = `Toss Breb (${bCount})`;
        if (powerEl) powerEl.textContent = bCount > 0 ? `${bCount} Loaves` : 'Bake at Oven!';
        slotB.style.opacity = bCount > 0 ? '1.0' : '0.65';
      }
    }

    // Active Steaming Spirit Buff Indicator
    const buffPill = document.getElementById('steaming-buff-pill');
    const buffTimerText = document.getElementById('buff-timer-text');
    if (buffPill && buffTimerText) {
      if (player.teaBuffTimer > 0) {
        buffPill.classList.remove('hidden');
        const m = Math.floor(player.teaBuffTimer / 60);
        const s = Math.floor(player.teaBuffTimer % 60);
        buffTimerText.textContent = `${m}:${s < 10 ? '0' : ''}${s}`;
      } else {
        buffPill.classList.add('hidden');
      }
    }

    // Update Island Celestial Clock HUD
    if (worldApi && worldApi.getDayNightState) {
      const skyState = worldApi.getDayNightState();
      if (skyState) {
        const iconEl = document.getElementById('clock-phase-icon');
        const timeEl = document.getElementById('clock-time-text');
        const phaseEl = document.getElementById('clock-phase-tag');
        const badgeEl = document.getElementById('clock-sync-badge');
        const sliderTimeEl = document.getElementById('sky-slider-time-label');
        const sliderPhaseEl = document.getElementById('sky-slider-phase-label');
        const sliderEl = document.getElementById('sky-time-slider');

        if (iconEl) iconEl.textContent = skyState.phaseIcon;
        if (timeEl) timeEl.textContent = skyState.timeStr;
        if (phaseEl) phaseEl.textContent = skyState.phaseName;

        const isReal = window.__BLAHAJ_DAY_CYCLE__ && window.__BLAHAJ_DAY_CYCLE__.isRealtime;
        if (badgeEl) {
          badgeEl.textContent = isReal ? '● CLOCK SYNC' : 'MANUAL';
          badgeEl.classList.toggle('manual', !isReal);
        }

        if (sliderTimeEl) sliderTimeEl.textContent = skyState.timeStr;
        if (sliderPhaseEl) sliderPhaseEl.textContent = skyState.phaseName;
        if (sliderEl && isReal && document.activeElement !== sliderEl) {
          const totalMin = ((skyState.progress * 24.0 * 60.0 + 6.0 * 60.0) % 1440.0 + 1440.0) % 1440.0;
          sliderEl.value = Math.round(totalMin);
        }
      }
    }
  }

  // ==========================================================================
  // VOLCANO TRIAL DUNGEON HUD POPUP NOTIFICATIONS
  // ==========================================================================
  const VOLCANO_DUNGEON_NOTICES = {
    gatehall: {
      icon: '⚔️',
      tag: 'THE SACRED VOLCANO · GATEHALL',
      title: 'THE TRIALS OF THE SACRED VOLCANO',
      body: 'Mind the swinging obsidian axes and the lava geysers. Take your time, shonk — if the lava gets you, you return to the gate.',
      tip: 'Watch the swing timing and jump cleanly!',
      plainText: 'Mind the swinging obsidian axes and the lava geysers. Take your time, shonk — if the lava gets you, you return to the gate.'
    },
    causeway: {
      icon: '🌋',
      tag: 'PUZZLE · WEIGHT PLATE & STEPPING STONES',
      title: 'THE MOLTEN CAUSEWAY',
      body: 'Two paths cross the lava sea! <strong>Solo:</strong> Hop the glowing stepping stones on the right, or press the <strong>Weight Plate</strong> and sprint across. <strong>Co-op:</strong> One shark holds the plate while the other crosses safely!',
      tip: 'Solo sharks can use Double Jump [Space in air] to cross the stones!',
      plainText: 'Two paths cross the lava sea! Solo: Hop the glowing stepping stones on the right, or press the Weight Plate and sprint across. Co-op: One shark holds the plate while the other crosses safely!'
    },
    twin_plates: {
      icon: '🤝',
      tag: 'CO-OP PUZZLE · EMBER RELIC',
      title: 'TWO FRIENDS, TWO PLATES',
      body: 'Stand on both plates at once to raise the Ember Relic Bridge! <em>Optional bonus:</em> the <strong>Ember Heart</strong> awards <strong>+2 Trial Points</strong>!',
      tip: 'Two sharks required to weigh down both plates at once.',
      plainText: 'Stand on both plates at once to raise the Ember Relic Bridge! Optional bonus: the Ember Heart awards +2 Trial Points!'
    },
    rest_nook: {
      icon: '🍵',
      tag: 'SANCTUARY · TEA & RECOVERY',
      title: 'THE REST NOOK',
      body: 'A warm pot of tea and fresh buns wait here for weary sharks. Take a sip to restore comfort! The <strong>Crater Overlook</strong> is just ahead.',
      tip: 'Press [E] by the celadon teapot to enjoy fresh buns & tea!',
      plainText: 'A warm pot of tea and fresh buns wait here for weary sharks. Take a sip to restore comfort! The Crater Overlook is just ahead.'
    },
    overlook: {
      icon: '🥕',
      tag: 'SUMMIT · THE CALDERA OVERLOOK',
      title: 'THE VOLUNTEERS',
      body: 'Eight <strong>Dare-Carrots</strong> in beach shorts have volunteered for the caldera. Give them a gentle bump into the crater, or step into the <strong>Return Portal</strong> home!',
      tip: 'Knocking carrots awards Trial Points and volcano honor!',
      plainText: 'Eight Dare-Carrots in beach shorts have volunteered for the caldera. Give them a gentle bump into the crater, or step into the Return Portal home!'
    },
    pelagic_current: {
      icon: '🌊',
      tag: 'OCEAN CURRENT · CONTINENTAL BREAK',
      title: 'THE ABYSSAL SURGE',
      body: 'Powerful oceanic undertows and open-sea swells surge across the continental shelf break! The deep ocean current blows you back toward the island shores.',
      tip: 'The pelagic current is too powerful to cross.',
      plainText: 'Powerful oceanic undertows and open-sea swells surge across the continental shelf break! The deep ocean current blows you back toward the island shores.'
    }
  };

  let currentVolcanoNoticeTimer = null;
  let currentVolcanoNoticeKey = null;
  const shownVolcanoNotices = new Set();
  let vhudPausedRemaining = null;
  let vhudTimerStartTime = 0;
  let vhudTotalDuration = 7500;

  function updateToastBannerPosition() {
    const banner = document.getElementById('toast-banner');
    if (!banner) return;
    const vhudCard = document.getElementById('volcano-hud-card');
    const isVhudVisible = vhudCard && !vhudCard.classList.contains('hidden') && !vhudCard.classList.contains('fading-out');

    if (isVhudVisible) {
      const rect = vhudCard.getBoundingClientRect();
      const targetTop = Math.max(285, Math.round(rect.bottom + 14));
      banner.style.top = `${targetTop}px`;
    } else {
      banner.style.top = '';
    }
  }

  function pauseVolcanoNoticeTimer() {
    const timerFill = document.getElementById('vhud-timer-fill');
    if (timerFill) timerFill.style.animationPlayState = 'paused';
    if (currentVolcanoNoticeTimer) {
      clearTimeout(currentVolcanoNoticeTimer);
      currentVolcanoNoticeTimer = null;
      const elapsed = Date.now() - vhudTimerStartTime;
      vhudPausedRemaining = Math.max(2000, vhudTotalDuration - elapsed);
    }
  }

  function resumeVolcanoNoticeTimer() {
    const timerFill = document.getElementById('vhud-timer-fill');
    if (timerFill) timerFill.style.animationPlayState = 'running';
    if (currentVolcanoNoticeTimer) clearTimeout(currentVolcanoNoticeTimer);
    const remaining = vhudPausedRemaining || 3000;
    currentVolcanoNoticeTimer = setTimeout(() => {
      hideVolcanoHUDCard();
    }, remaining);
  }

  function showVolcanoHUDNotice(key, force = false) {
    if (!force && shownVolcanoNotices.has(key)) return;
    shownVolcanoNotices.add(key);
    currentVolcanoNoticeKey = key;

    const data = VOLCANO_DUNGEON_NOTICES[key];
    if (!data) return;

    const card = document.getElementById('volcano-hud-card');
    if (!card) return;

    const iconEl = document.getElementById('vhud-icon');
    const tagEl = document.getElementById('vhud-tag');
    const titleEl = document.getElementById('vhud-title');
    const bodyEl = document.getElementById('vhud-body');
    const tipEl = document.getElementById('vhud-tip');
    const timerFill = document.getElementById('vhud-timer-fill');

    if (iconEl) iconEl.textContent = data.icon;
    if (tagEl) tagEl.textContent = data.tag;
    if (titleEl) titleEl.textContent = data.title;
    if (bodyEl) bodyEl.innerHTML = data.body;
    if (tipEl) tipEl.innerHTML = `💡 ${data.tip}`;

    card.classList.remove('hidden', 'fading-out');
    document.body.classList.add('has-volcano-notice');

    // 7.5 seconds allows comfortable reading of lore and mechanics
    vhudTotalDuration = 7500;
    vhudTimerStartTime = Date.now();
    vhudPausedRemaining = null;

    if (timerFill) {
      timerFill.style.animation = 'none';
      timerFill.style.animationPlayState = 'running';
      void timerFill.offsetWidth;
      timerFill.style.animation = 'vhudTimerDrain 7.5s linear forwards';
    }

    if (typeof CozyAudio !== 'undefined' && CozyAudio.portalChime) {
      CozyAudio.portalChime();
    }

    addChatLog(`${data.icon} <strong>${data.title}:</strong> ${data.plainText}`, 'lore');

    // Ensure any currently active toast immediately adjusts position below the card
    updateToastBannerPosition();

    if (currentVolcanoNoticeTimer) clearTimeout(currentVolcanoNoticeTimer);
    currentVolcanoNoticeTimer = setTimeout(() => {
      hideVolcanoHUDCard();
    }, vhudTotalDuration);
  }

  function hideVolcanoHUDCard() {
    const card = document.getElementById('volcano-hud-card');
    if (!card || card.classList.contains('hidden')) return;

    card.classList.add('fading-out');
    if (currentVolcanoNoticeTimer) clearTimeout(currentVolcanoNoticeTimer);
    currentVolcanoNoticeTimer = setTimeout(() => {
      card.classList.add('hidden');
      card.classList.remove('fading-out');
      document.body.classList.remove('has-volcano-notice');
      // Toast smoothly glides back up to default position if still visible
      updateToastBannerPosition();
    }, 200);
  }

  function getVolcanoNoticeKeyForPos(pos) {
    if (!pos) return null;
    if (pos.z <= -347 && pos.y > 15) return 'overlook';
    if (pos.z <= -304 && pos.z > -340 && pos.y > 15) return 'rest_nook';
    if (pos.z <= -160 && pos.z > -265) return 'twin_plates';
    if (pos.z <= -82 && pos.z > -154) return 'causeway';
    if (pos.z <= -2 && pos.z > -78) return 'gatehall';
    return null;
  }

  // --- TOAST NOTIFICATION QUEUE & TIMING SYSTEM ---
  const toastQueue = [];
  let isToastShowing = false;
  let toastTimer = null;
  let toastStartTime = 0;
  let toastTotalDuration = 4500;
  let toastPausedRemaining = null;

  function pauseToastTimer() {
    if (toastTimer) {
      clearTimeout(toastTimer);
      toastTimer = null;
      const elapsed = Date.now() - toastStartTime;
      toastPausedRemaining = Math.max(2000, toastTotalDuration - elapsed);
    }
  }

  function resumeToastTimer() {
    if (toastTimer) clearTimeout(toastTimer);
    const rem = toastPausedRemaining || 2500;
    toastTimer = setTimeout(() => {
      dismissCurrentToast(false);
    }, rem);
  }

  function showToast(sub, title, customDuration = null) {
    if (!title && !sub) return;

    // Deduplication: don't double-post identical toast if already visible or queued
    const activeTitle = document.getElementById('toast-title')?.textContent;
    const activeSub = document.getElementById('toast-sub')?.textContent;
    if (isToastShowing && activeTitle === title && activeSub === sub) {
      return;
    }
    if (toastQueue.some((item) => item.title === title && item.sub === sub)) {
      return;
    }

    // If already showing a toast, queue it cleanly so they don't clobber each other
    if (isToastShowing) {
      toastQueue.push({ sub, title, customDuration });
      return;
    }

    displayToast({ sub, title, customDuration });
  }

  // Backwards compatibility alias for showToast._t
  Object.defineProperty(showToast, '_t', {
    get() { return toastTimer; },
    set(v) { toastTimer = v; },
    configurable: true
  });

  function displayToast(item) {
    const banner = document.getElementById('toast-banner');
    if (!banner) return;

    isToastShowing = true;
    const subEl = document.getElementById('toast-sub');
    const titleEl = document.getElementById('toast-title');
    if (subEl) subEl.textContent = item.sub || '';
    if (titleEl) titleEl.textContent = item.title || '';

    // Calculate reading time carefully based on word count (minimum 4.5s up to 8.5s)
    const words = `${item.sub || ''} ${item.title || ''}`.trim().split(/\s+/).length;
    toastTotalDuration = item.customDuration || Math.max(4500, Math.min(8500, 2600 + words * 280));
    toastStartTime = Date.now();
    toastPausedRemaining = null;

    updateToastBannerPosition();
    banner.classList.remove('hidden', 'fading-out');

    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      dismissCurrentToast(false);
    }, toastTotalDuration);
  }

  function dismissCurrentToast(clearRemainingQueue = false) {
    if (clearRemainingQueue) {
      toastQueue.length = 0;
    }

    if (toastTimer) {
      clearTimeout(toastTimer);
      toastTimer = null;
    }

    const banner = document.getElementById('toast-banner');
    if (!banner || banner.classList.contains('hidden')) {
      isToastShowing = false;
      return;
    }

    banner.classList.add('fading-out');
    setTimeout(() => {
      banner.classList.add('hidden');
      banner.classList.remove('fading-out');
      isToastShowing = false;

      // If more toasts are waiting in queue, display next one after a brief breather
      if (toastQueue.length > 0) {
        const next = toastQueue.shift();
        setTimeout(() => displayToast(next), 220);
      }
    }, 200);
  }

  function addChatLog(html, cls = 'lore') {
    const log = document.getElementById('chat-log');
    const div = document.createElement('div');
    div.className = `chat-msg ${cls}`;
    div.innerHTML = html;
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
  }

  function triggerHelensBirthdayCake() {
    CozyAudio.birthdayFanfare();
    player.teaComfort = 100;
    player.warmth = 100;
    updateMetersUI();
    savorHeldItem('helen_cake', 45.0);
    spawnFloatingBurst(player.pos, 0xf43f5e, 28);
    spawnFloatingBurst(player.pos, 0xfbbf24, 24);

    const isWeek = window.BlahajSphericalFoods && window.BlahajSphericalFoods.isHelensBirthdayWeek();

    openDialogueModal({
      speaker: "Helen's Celestial Birthday Bombe ✨🎂",
      role: 'SPHERICAL BIRTHDAY MASTERPIECE · CELEBRATED OCT 24',
      portrait: 'assets/gallery/Spherical-Foods.png',
      text: isWeek
        ? '“Joyeux Anniversaire, Helen! In accordance with Monsieur Betterave’s sacred culinary law, no flat cake shall ever be baked on this island. Behold: a flawless sphere of passionfruit chiffon and raspberry-rose mousse with a hazelnut praline pearl core, encased in mirror-glazed ruby glacage, dusted with edible gold leaf stars and crowned with an enchanted flickering candle!”'
        : '“A magnificent spherical birthday cake reserved in honor of Helen’s birthday on October 24th! Its enchanted candle flickers warmly under the rotunda chandelier.”',
      actions: [
        {
          label: 'Make a Birthday Wish & Taste the Ruby Glaze! 🎂✨',
          className: 'btn-primary',
          onClick: () => {
            closeDialogueModal();
            CozyAudio.bistroChime();
            spawnFloatingBurst(player.pos, 0xfbbf24, 32);
            showToast("JOYEUX ANNIVERSAIRE, HELEN! 🎂✨", "Sweet raspberry-rose & gold stars! (Warmth & Comfort Maxed!)");
            addChatLog("🎂 <em>Happy Birthday Helen!</em> You tasted <strong>Helen's Celestial Birthday Bombe</strong>. Golden stars and sweet raspberry warmth fill your heart (+100% Comfort, +100% Warmth)!", 'cozy');
          }
        },
        {
          label: 'Admire the Golden Candle & Sparklers 🕯️✨',
          className: 'btn-secondary',
          onClick: () => {
            closeDialogueModal();
            CozyAudio.shonk();
            showToast("ENCHANTED CANDLE 🕯️", "The golden flame crackles with cozy warm sparklers!");
          }
        }
      ]
    });
  }

  function sitInBooth(boothIndex) {
    if (!window.BlahajSphericalFoods) return;
    const seat = window.BlahajSphericalFoods.getBoothSeat(boothIndex);
    player.isSeatedInBooth = true;
    player.seatedBoothIndex = boothIndex;
    player.pos.set(seat.x, seat.y, seat.z);
    player.rotY = seat.rotY;
    player.velY = 0;
    player.isGrounded = true;
    player.teaComfort = 100;
    updateMetersUI();

    CozyAudio.boothSit();
    showToast('SEATED IN VELVET BOOTH 🛋️', 'Relaxing in the plush banquette. Press [E] or [M] for Spherical Menu · [WASD / Space] to stand up.');
    addChatLog('🛋️ Sunk comfortably into the curved burgundy velvet banquette at <strong>Spherical Foods Bistro</strong> (+100% Comfort).', 'lore');
  }

  function standUpFromBooth() {
    if (!player.isSeatedInBooth) return;
    player.isSeatedInBooth = false;
    player.pos.x += Math.sin(player.rotY) * 0.65;
    player.pos.z += Math.cos(player.rotY) * 0.65;
    player.velY = 0;

    CozyAudio.boothStand();
    showToast('STOOD UP FROM BOOTH 🦈', 'Ready to explore the bistro.');
  }


  // ==========================================================================
  // FAST TRAVEL & ARCHIPELAGO NAVIGATION MODAL [M]
  // ==========================================================================
  // ==========================================================================
  // ARCHIPELAGO CHART, EXPLORATION DISCOVERY & HERMES BETWEEN PORTALS [M]
  // ==========================================================================
  const ALL_MAP_LANDMARKS = [
    { id: 'spawn', name: 'East Cape Arrival & Loungers', icon: '🌅', x: 54.0, z: -10.0, zone: 'East Cape', tier: 1, desc: 'Arrival Portal Gate, ocean loungers & starlight overlook.' },
    { id: 'meadow', name: "Solomon's Stone Bread Oven", icon: '🥖', x: -12.5, z: 19.2, zone: 'Heartland Meadow', tier: 1, desc: 'Fresh Breb loaves, stone hearth sizzle & birb flocks.' },
    { id: 'plaza', name: 'Heartland Town Plaza', icon: '🏛️', x: 1.0, z: 22.0, zone: 'Town Center', tier: 1, desc: 'Central crossroads, palm deck chairs & artisan craft benches.' },
    { id: 'beach', name: 'Crescent Beach Deck Chairs', icon: '🏖️', x: 38.0, z: 43.5, zone: 'South Shore', tier: 1, desc: "Russell & Helen's sun loungers, Piña Coladas & ocean surf." },
    { id: 'pier', name: 'Heartland Pier Promenade', icon: '⚓', x: 7.0, z: 28.0, zone: 'Crescent Harbour', tier: 1, desc: 'Regatta sailboats, salt air boardwalk & endless sea view.' },
    { id: 'volleyball', name: 'Crescent Beach Volleyball', icon: '🏐', x: 28.0, z: 52.0, zone: 'South Sand Bar', tier: 2, desc: 'Official Shark Beach Volleyball court & spectator stands.' },
    { id: 'spherical', name: 'Spherical Foods Bistro & Café', icon: '🧆', x: -47.7, z: 41.0, zone: 'Southwest Bluff', tier: 2, desc: 'Cozy diner booths, Swedish meatballs & lingonberry drinks.' },
    { id: 'laundromat', name: 'The First Whirlings Laundromat', icon: '🧺', x: -64.0, z: -14.0, zone: 'Artisans Ridge', tier: 2, desc: 'Giant Master Washer #7, laundry carts & spin cycle chamber.' },
    { id: 'volcano', name: 'Sacred Volcano Balcony & Altar', icon: '🌋', x: 0.0, z: -125.0, zone: 'Caldera Summit', tier: 2, desc: 'Eternal flame brazier, knockable carrots & panoramic peak.' },
    { id: 'rear_wharf', name: 'Rear Sea Cave & Dungeon Wharf', icon: '⚔️', x: -28.0, z: -198.0, zone: 'North Shore', tier: 2, desc: 'Hidden cavern docks leading into the Volcano Trial Dungeon.' },
    { id: 'isl_hermes', name: "Hermes' Starlight Atoll", icon: '⭐', x: 175.0, z: -10.0, zone: 'East Ocean Sanctuary', tier: 3, desc: 'Starlight atoll with between-portal threshold and deep waters.' },
    { id: 'isl_solomon', name: "Solomon's Sunlit Meadow Cay", icon: '🌻', x: -175.0, z: 115.0, zone: 'SW Ocean Sanctuary', tier: 3, desc: 'Lush offshore wildflower cay with quiet picnic groves.' },
    { id: 'isl_hiram', name: "Hiram's Forge & Birch Isle", icon: '🔨', x: -175.0, z: -115.0, zone: 'NW Ocean Sanctuary', tier: 3, desc: 'Nordic birch grove and sacred offshore assembly sanctuary.' },
    { id: 'isl_nimue', name: "Nimue's Whispering Sanctuary", icon: '🌸', x: 175.0, z: -115.0, zone: 'NE Ocean Sanctuary', tier: 3, desc: 'Pink reef coral and serene meditation sanctuary.' }
  ];

  const discoveredLandmarks = new Set(['spawn']);
  let selectedLandmarkId = 'spawn';
  let isMapAnimRunning = false;

  const hermesPortalMastery = {
    level: 1,
    exp: 0,
    nextExp: 250,
    cooldownUntil: 0
  };

  function loadDiscoveredLandmarks() {
    try {
      const raw = localStorage.getItem('blahaj_discovered_landmarks');
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) arr.forEach(id => discoveredLandmarks.add(id));
      }
    } catch (e) {}
    try {
      const pRaw = localStorage.getItem('blahaj_hermes_portal');
      if (pRaw) Object.assign(hermesPortalMastery, JSON.parse(pRaw));
    } catch (e) {}
  }

  function saveDiscoveredLandmarks() {
    try {
      localStorage.setItem('blahaj_discovered_landmarks', JSON.stringify([...discoveredLandmarks]));
    } catch (e) {}
  }

  function saveHermesPortalMastery() {
    try {
      localStorage.setItem('blahaj_hermes_portal', JSON.stringify(hermesPortalMastery));
    } catch (e) {}
  }

  function addHermesPortalExp(amount) {
    hermesPortalMastery.exp += amount;
    if (hermesPortalMastery.exp >= hermesPortalMastery.nextExp && hermesPortalMastery.level < 3) {
      hermesPortalMastery.level++;
      hermesPortalMastery.exp -= hermesPortalMastery.nextExp;
      hermesPortalMastery.nextExp = hermesPortalMastery.level === 2 ? 600 : 99999;
      saveHermesPortalMastery();
      showToast('🌀 PORTAL MASTERY UPGRADED!', `Hermes reached Portal Level ${hermesPortalMastery.level}! Dimensional range expanded.`);
      addChatLog(`🌀 <strong>Hermes</strong> reached Portal Mastery <strong>Level ${hermesPortalMastery.level}</strong>! Can now weave rifts to more distant locations faster.`, 'lore');
    } else {
      saveHermesPortalMastery();
      if (window.BlahajSaveSystem) window.BlahajSaveSystem.queueAutoSave();
    }
  }

  function checkLandmarkDiscovery() {
    if (!player || !player.pos) return;
    if (currentZone !== 'island' && currentZone !== 'overworld') return;
    for (const lm of ALL_MAP_LANDMARKS) {
      if (!discoveredLandmarks.has(lm.id)) {
        const d = Math.hypot(player.pos.x - lm.x, player.pos.z - lm.z);
        if (d < 36.0) {
          discoveredLandmarks.add(lm.id);
          saveDiscoveredLandmarks();
          if (window.BlahajSaveSystem) window.BlahajSaveSystem.queueAutoSave();
          showToast('🧭 NEW LANDMARK CHARTED!', `Discovered ${lm.name}! Pin revealed on your map [M].`);
          addChatLog(`🧭 You explored and charted <strong>${lm.name}</strong> (${lm.zone})! Check your map with [M].`, 'lore');
          addHermesPortalExp(100);
        }
      }
    }
  }

  function openIslandMap() {
    releasePointerLock();
    const modal = document.getElementById('modal-island-map');
    if (!modal) return;
    modal.classList.remove('hidden');

    updateMapStatusPills();
    selectMapLandmark(selectedLandmarkId || 'spawn');

    isMapAnimRunning = true;
    requestAnimationFrame(mapAnimLoop);

    CozyAudio.shonkPop ? CozyAudio.shonkPop() : CozyAudio.shonk();
  }

  function closeIslandMap() {
    const modal = document.getElementById('modal-island-map');
    if (modal) modal.classList.add('hidden');
    isMapAnimRunning = false;
  }

  function toggleIslandMap() {
    const modal = document.getElementById('modal-island-map');
    if (!modal) return;
    if (modal.classList.contains('hidden')) {
      openIslandMap();
    } else {
      closeIslandMap();
    }
  }

  function mapAnimLoop() {
    if (!isMapAnimRunning) return;
    const modal = document.getElementById('modal-island-map');
    if (!modal || modal.classList.contains('hidden')) {
      isMapAnimRunning = false;
      return;
    }
    renderIslandMap();
    requestAnimationFrame(mapAnimLoop);
  }

  function updateMapStatusPills() {
    const charEl = document.getElementById('map-val-character');
    if (charEl && player && player.sharkId) {
      const sCfg = LORE.sharks[player.sharkId];
      charEl.textContent = sCfg ? sCfg.name : player.sharkId;
    }
    const lvlEl = document.getElementById('map-val-portal-lvl');
    if (lvlEl) {
      const lvl = hermesPortalMastery.level;
      const title = lvl === 1 ? 'Lv. 1 (Mainland Hubs)' : (lvl === 2 ? 'Lv. 2 (Mainland & Volcano)' : 'Lv. 3 (Archipelago Master)');
      lvlEl.textContent = title;
    }
    const discEl = document.getElementById('map-val-discovery');
    if (discEl) {
      discEl.textContent = `${discoveredLandmarks.size} / ${ALL_MAP_LANDMARKS.length} Landmarks`;
    }
  }

  function selectMapLandmark(lmId) {
    const lm = ALL_MAP_LANDMARKS.find(l => l.id === lmId) || ALL_MAP_LANDMARKS[0];
    selectedLandmarkId = lm.id;

    const iconEl = document.getElementById('landmark-sel-icon');
    const nameEl = document.getElementById('landmark-sel-name');
    const descEl = document.getElementById('landmark-sel-desc');
    const statusEl = document.getElementById('landmark-sel-status');
    const btnWeave = document.getElementById('btn-fast-travel-portal');

    const isDiscovered = discoveredLandmarks.has(lm.id);
    const d = player && player.pos ? Math.round(Math.hypot(player.pos.x - lm.x, player.pos.z - lm.z)) : 0;

    if (iconEl) iconEl.textContent = isDiscovered ? lm.icon : '❓';
    if (nameEl) nameEl.textContent = isDiscovered ? `${lm.name} (${lm.zone})` : 'Uncharted Territory (Unexplored)';
    if (descEl) descEl.textContent = isDiscovered ? `${lm.desc} · Distance: ${d}m away` : 'This area has not been charted yet. Explore this region on foot or by boat to reveal its landmarks!';

    if (!btnWeave) return;

    // Fast travel restrictions:
    // 1. Shark check: Must be Hermes
    if (player.sharkId !== 'hermes') {
      btnWeave.disabled = true;
      btnWeave.classList.add('disabled');
      btnWeave.textContent = '🔒 Hermes Only (Portal Opener) · Press [1]';
      if (statusEl) statusEl.textContent = 'Spatial rift folding is the unique signature ability of Hermes. Switch to Hermes [1] to weave Between Portals!';
      return;
    }

    // 2. Must be discovered
    if (!isDiscovered) {
      btnWeave.disabled = true;
      btnWeave.classList.add('disabled');
      btnWeave.textContent = '🔒 Unexplored (Must Visit First)';
      if (statusEl) statusEl.textContent = 'Between Portals cannot bridge unknown space. Explore and discover this landmark on foot first!';
      return;
    }

    // 3. Level check
    const lvl = hermesPortalMastery.level;
    if (lm.tier > lvl) {
      btnWeave.disabled = true;
      btnWeave.classList.add('disabled');
      btnWeave.textContent = `🔒 Requires Portal Lv. ${lm.tier} (Current: Lv. ${lvl})`;
      if (statusEl) statusEl.textContent = `This distant landmark requires higher dimensional mastery. Discover more landmarks (+100 EXP) or mend Seams (+300 EXP) to unlock!`;
      return;
    }

    // 4. Cooldown check
    const now = Date.now();
    if (now < hermesPortalMastery.cooldownUntil) {
      const rem = Math.ceil((hermesPortalMastery.cooldownUntil - now) / 1000);
      btnWeave.disabled = true;
      btnWeave.classList.add('disabled');
      btnWeave.textContent = `⏳ Portal Exhaustion (${rem}s)`;
      if (statusEl) statusEl.textContent = `Hermes is catching his breath after folding dimensional space. Available in ${rem} seconds.`;
      return;
    }

    // Ready to weave!
    btnWeave.disabled = false;
    btnWeave.classList.remove('disabled');
    btnWeave.textContent = `🌀 Weave Between Portal (${d}m)`;
    if (statusEl) statusEl.textContent = `Hermes is ready to fold space along the Great Seam directly to ${lm.name}!`;
  }

  function spawnBetweenPortalVFX(pos, callback) {
    const activeScene = getActiveScene();
    if (!activeScene) {
      if (callback) callback();
      return;
    }

    // Swirling violet-blue portal ring
    const ringGeo = new THREE.RingGeometry(0.8, 2.2, 32);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x818cf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending
    });
    const portalMesh = new THREE.Mesh(ringGeo, ringMat);
    portalMesh.position.set(pos.x, pos.y + 0.12, pos.z);
    activeScene.add(portalMesh);

    // Particle spark ring
    if (typeof spawnFloatingBurst === 'function') {
      spawnFloatingBurst(new THREE.Vector3(pos.x, pos.y + 0.8, pos.z), 0xa855f7, 16);
    }
    CozyAudio.portalChime ? CozyAudio.portalChime() : (CozyAudio.shonkPop ? CozyAudio.shonkPop() : CozyAudio.shonk());

    let life = 0;
    const interval = setInterval(() => {
      life += 0.05;
      portalMesh.rotation.y += 0.35;
      const s = life < 0.4 ? (life / 0.4) * 1.3 : Math.max(0, 1.3 - (life - 0.4) * 2.5);
      portalMesh.scale.set(s, 1, s);
      ringMat.opacity = Math.max(0, 1 - life);

      if (life >= 0.7) {
        clearInterval(interval);
        activeScene.remove(portalMesh);
        if (callback) callback();
      }
    }, 40);
  }

  function castBetweenPortalFastTravel(destId) {
    const dest = ALL_MAP_LANDMARKS.find(l => l.id === destId);
    if (!dest) return;

    if (player.sharkId !== 'hermes') {
      showToast('🔒 PORTAL WEAVING LOCKED', 'Only Hermes (The Weary Guide & Portal Opener) can weave Between Portals! Press [1] to switch.');
      return;
    }
    if (!discoveredLandmarks.has(dest.id)) {
      showToast('🔒 UNEXPLORED DESTINATION', 'You have not discovered this location yet! Explore on foot or by boat first.');
      return;
    }
    const lvl = hermesPortalMastery.level;
    if (dest.tier > lvl) {
      showToast('🔒 INSUFFICIENT PORTAL MASTERY', `Requires Hermes Portal Level ${dest.tier} (Current: Lv. ${lvl}). Chart more landmarks to level up!`);
      return;
    }
    const now = Date.now();
    if (now < hermesPortalMastery.cooldownUntil) {
      const rem = Math.ceil((hermesPortalMastery.cooldownUntil - now) / 1000);
      showToast('⏳ PORTAL EXHAUSTION', `Hermes is catching his breath (${rem}s remaining).`);
      return;
    }

    closeIslandMap();

    if (player.isLounging) standUpFromDeckChair();
    if (player.isSeatedInBooth) standUpFromBooth();
    if (player.inBoat) disembarkBoatAtCurrentLocation();
    if (player.inCart) dismountLaundryCart();
    if (isUsingBinoculars) exitBinocularMode();

    const startPos = player.pos.clone();
    spawnBetweenPortalVFX(startPos, () => {
      const groundY = (worldApi && typeof worldApi.getGroundAndStructureHeight === 'function')
        ? worldApi.getGroundAndStructureHeight(dest.x, dest.z)
        : (worldApi && typeof worldApi.getTerrainHeight === 'function')
          ? worldApi.getTerrainHeight(dest.x, dest.z)
          : player.pos.y;

      player.pos.set(dest.x, groundY, dest.z);
      player.rotY = 0;
      player.velY = 0;
      player.isGrounded = true;

      camState.yaw = 0;
      camState.pitch = 0.08;

      spawnBetweenPortalVFX(player.pos);

      // Cooldown: Lv 1: 20s, Lv 2: 12s, Lv 3: 4s
      const cdMs = lvl === 1 ? 20000 : (lvl === 2 ? 12000 : 4000);
      hermesPortalMastery.cooldownUntil = Date.now() + cdMs;
      saveHermesPortalMastery();

      addHermesPortalExp(40);
      showToast('🌀 BETWEEN PORTAL FOLDED', `Hermes folded space along the Great Seam to ${dest.name}! (+40 EXP)`);
      addChatLog(`🌀 <strong>Hermes</strong> wove a Between Portal rift across the Great Seam to <strong>${dest.name}</strong>!`, 'lore');
    });
  }

  function renderIslandMap() {
    const canvas = document.getElementById('island-map-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;

    function w2c(wx, wz) {
      return {
        x: 360 + (wx - 0) * 1.45,
        y: 255 + (wz - (-30)) * 1.45
      };
    }

    // 1. Deep Ocean Background
    const oceanGrad = ctx.createRadialGradient(360, 250, 40, 360, 250, 380);
    oceanGrad.addColorStop(0, '#0c1b2e');
    oceanGrad.addColorStop(0.7, '#07101c');
    oceanGrad.addColorStop(1, '#040912');
    ctx.fillStyle = oceanGrad;
    ctx.fillRect(0, 0, W, H);

    // Navigational Grid
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
    ctx.lineWidth = 1;
    for (let x = 40; x < W; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 40; y < H; y += 60) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    // Concentric nautical depth circles
    ctx.strokeStyle = 'rgba(14, 165, 233, 0.06)';
    ctx.beginPath();
    ctx.arc(360, 250, 160, 0, Math.PI * 2);
    ctx.arc(360, 250, 260, 0, Math.PI * 2);
    ctx.stroke();

    // 2. Draw 4 Outer Sanctuary Islands
    const outerIslands = [
      { name: "Hermes' Atoll", x: 175, z: -10, rad: 34 },
      { name: "Solomon's Cay", x: -175, z: 115, rad: 34 },
      { name: "Hiram's Isle", x: -175, z: -115, rad: 34 },
      { name: "Nimue's Sanctuary", x: 175, z: -115, rad: 34 }
    ];

    outerIslands.forEach(isl => {
      const c = w2c(isl.x, isl.z);
      const r = isl.rad * 1.45;

      ctx.fillStyle = '#d4b07b';
      ctx.beginPath();
      ctx.arc(c.x, c.y, r + 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#22543d';
      ctx.beginPath();
      ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#0e4a68';
      ctx.beginPath();
      ctx.arc(c.x, c.y, r * 0.42, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(isl.name, c.x, c.y + r + 14);
    });

    // 3. Draw Volcano Peninsula & Isthmus
    const vCfgMap = (worldApi && worldApi.VOLCANO) || { x: -28, z: -235 };
    const pVolcano = w2c(vCfgMap.x, vCfgMap.z);
    const pIsthmusMid = w2c(-18, -60);
    const pMainNorth = w2c(-5, -20);

    ctx.strokeStyle = '#c49a6c';
    ctx.lineWidth = 26;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(pMainNorth.x, pMainNorth.y);
    ctx.quadraticCurveTo(pIsthmusMid.x, pIsthmusMid.y, pVolcano.x, pVolcano.y);
    ctx.stroke();

    ctx.strokeStyle = '#2b2927';
    ctx.lineWidth = 20;
    ctx.beginPath();
    ctx.moveTo(pMainNorth.x, pMainNorth.y);
    ctx.quadraticCurveTo(pIsthmusMid.x, pIsthmusMid.y, pVolcano.x, pVolcano.y);
    ctx.stroke();

    // Caldera
    const rVol = 32 * 1.45;
    ctx.fillStyle = '#785b3e';
    ctx.beginPath();
    ctx.arc(pVolcano.x, pVolcano.y, rVol + 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#1c1917';
    ctx.beginPath();
    ctx.arc(pVolcano.x, pVolcano.y, rVol, 0, Math.PI * 2);
    ctx.fill();

    const magmaGrad = ctx.createRadialGradient(pVolcano.x, pVolcano.y, 2, pVolcano.x, pVolcano.y, rVol * 0.55);
    magmaGrad.addColorStop(0, '#fef08a');
    magmaGrad.addColorStop(0.3, '#f97316');
    magmaGrad.addColorStop(0.8, '#dc2626');
    magmaGrad.addColorStop(1, '#7f1d1d');
    ctx.fillStyle = magmaGrad;
    ctx.beginPath();
    ctx.arc(pVolcano.x, pVolcano.y, rVol * 0.52, 0, Math.PI * 2);
    ctx.fill();

    // 4. Draw Main Island Landmass
    const pCenter = w2c(0, 12);
    const rMain = 76 * 1.45;

    ctx.fillStyle = '#d4b07b';
    ctx.beginPath();
    ctx.ellipse(pCenter.x, pCenter.y, rMain + 5, rMain * 0.88 + 5, 0.12, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#22543d';
    ctx.beginPath();
    ctx.ellipse(pCenter.x, pCenter.y, rMain, rMain * 0.88, 0.12, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#1b4332';
    ctx.beginPath();
    ctx.ellipse(pCenter.x - 10, pCenter.y - 12, rMain * 0.55, rMain * 0.45, -0.1, 0, Math.PI * 2);
    ctx.fill();

    const pBeach = w2c(38, 43.5);
    ctx.fillStyle = '#fde68a';
    ctx.beginPath();
    ctx.arc(pBeach.x, pBeach.y, 26, 0, Math.PI * 2);
    ctx.fill();

    // 5. Cobblestone Island Roads
    ctx.strokeStyle = 'rgba(254, 243, 199, 0.45)';
    ctx.lineWidth = 3;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    const pSpawn = w2c(54, -10);
    const pPlaza = w2c(1, 22);
    const pOven = w2c(-12.5, 19.2);
    const pPier = w2c(7, 28);
    const pBistro = w2c(-47.7, 41);
    const pLaundry = w2c(-64, -14);

    ctx.moveTo(pSpawn.x, pSpawn.y);
    ctx.lineTo(pPlaza.x, pPlaza.y);
    ctx.lineTo(pOven.x, pOven.y);
    ctx.lineTo(pBistro.x, pBistro.y);
    ctx.lineTo(pLaundry.x, pLaundry.y);

    ctx.moveTo(pPlaza.x, pPlaza.y);
    ctx.lineTo(pPier.x, pPier.y);
    ctx.lineTo(pBeach.x, pBeach.y);

    ctx.moveTo(pPlaza.x, pPlaza.y);
    ctx.lineTo(pMainNorth.x, pMainNorth.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // 6. Nautical Compass Rose
    drawCompassRose(ctx, 60, 60, 32);

    // 7. Draw Landmarks
    ALL_MAP_LANDMARKS.forEach(lm => {
      const c = w2c(lm.x, lm.z);
      const isDiscovered = discoveredLandmarks.has(lm.id);
      const isSelected = selectedLandmarkId === lm.id;

      if (!isDiscovered) {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
        ctx.beginPath();
        ctx.arc(c.x, c.y, 13, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('?', c.x, c.y);
      } else {
        if (isSelected) {
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(c.x, c.y, 17, 0, Math.PI * 2);
          ctx.stroke();
        }

        ctx.fillStyle = isSelected ? '#0284c7' : '#1e293b';
        ctx.beginPath();
        ctx.arc(c.x, c.y, 12, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = isSelected ? '#38bdf8' : '#64748b';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.font = '13px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(lm.icon, c.x, c.y);

        ctx.font = 'bold 10px "Plus Jakarta Sans", sans-serif';
        ctx.fillStyle = isSelected ? '#38bdf8' : '#f1f5f9';
        ctx.textAlign = 'center';
        ctx.fillText(lm.name.split('·')[0].split('&')[0].trim(), c.x, c.y - 16);
      }
    });

    // 8. Draw Live Player Marker Pin & Direction Cone
    if (player && player.pos) {
      const pLoc = w2c(player.pos.x, player.pos.z);
      const angle = (player.rotY || 0) + Math.PI / 2;

      ctx.fillStyle = 'rgba(250, 204, 21, 0.25)';
      ctx.beginPath();
      ctx.moveTo(pLoc.x, pLoc.y);
      ctx.arc(pLoc.x, pLoc.y, 30, angle - 0.45, angle + 0.45);
      ctx.closePath();
      ctx.fill();

      const pulse = (Date.now() % 1400) / 1400;
      ctx.strokeStyle = `rgba(56, 189, 248, ${1 - pulse})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(pLoc.x, pLoc.y, 8 + pulse * 14, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.arc(pLoc.x, pLoc.y, 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(pLoc.x, pLoc.y);
      ctx.lineTo(pLoc.x + Math.cos(angle) * 14, pLoc.y + Math.sin(angle) * 14);
      ctx.stroke();
    }
  }

  function drawCompassRose(ctx, cx, cy, r) {
    ctx.save();
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    const points = [
      { text: 'N', x: cx, y: cy - r - 4, color: '#ef4444' },
      { text: 'S', x: cx, y: cy + r + 12, color: '#f59e0b' },
      { text: 'E', x: cx + r + 8, y: cy + 4, color: '#f59e0b' },
      { text: 'W', x: cx - r - 8, y: cy + 4, color: '#f59e0b' }
    ];
    ctx.font = 'bold 11px "Cinzel", serif';
    ctx.textAlign = 'center';
    points.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, p.x, p.y);
    });

    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx + 4, cy);
    ctx.lineTo(cx, cy + r);
    ctx.lineTo(cx - 4, cy);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(cx - r, cy);
    ctx.lineTo(cx, cy + 4);
    ctx.lineTo(cx + r, cy);
    ctx.lineTo(cx, cy - 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function initIslandMapEvents() {
    loadDiscoveredLandmarks();

    const canvas = document.getElementById('island-map-canvas');
    if (canvas) {
      canvas.addEventListener('click', (e) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const clickX = (e.clientX - rect.left) * scaleX;
        const clickY = (e.clientY - rect.top) * scaleY;

        function w2c(wx, wz) {
          return {
            x: 360 + (wx - 0) * 1.45,
            y: 255 + (wz - (-30)) * 1.45
          };
        }

        let bestLm = null;
        let minD = 32;
        ALL_MAP_LANDMARKS.forEach(lm => {
          const c = w2c(lm.x, lm.z);
          const d = Math.hypot(clickX - c.x, clickY - c.y);
          if (d < minD) {
            minD = d;
            bestLm = lm;
          }
        });

        if (bestLm) {
          selectMapLandmark(bestLm.id);
          CozyAudio.shonkPop ? CozyAudio.shonkPop() : CozyAudio.shonk();
        }
      });
    }

    document.getElementById('btn-close-island-map')?.addEventListener('click', () => {
      closeIslandMap();
    });

    document.getElementById('pill-open-fast-travel')?.addEventListener('click', () => {
      openIslandMap();
    });

    document.getElementById('btn-fast-travel-portal')?.addEventListener('click', () => {
      if (selectedLandmarkId) {
        castBetweenPortalFastTravel(selectedLandmarkId);
      }
    });

    document.getElementById('btn-binoc-flip-y')?.addEventListener('click', () => {
      toggleBinocularInvertY();
    });
    document.getElementById('btn-binoc-flip-x')?.addEventListener('click', () => {
      toggleBinocularInvertX();
    });
  }

  function toggleBinocularInvertY() {
    gameSettings.binocularInvertY = !gameSettings.binocularInvertY;
    saveSettings();
    updateBinocularControlButtons();
    showToast('↕ BINOCULARS PITCH', `Vertical Look: ${gameSettings.binocularInvertY ? 'INVERTED' : 'NORMAL'}`);
  }

  function toggleBinocularInvertX() {
    gameSettings.binocularInvertX = !gameSettings.binocularInvertX;
    saveSettings();
    updateBinocularControlButtons();
    showToast('↔ BINOCULARS YAW', `Horizontal Look: ${gameSettings.binocularInvertX ? 'INVERTED' : 'NORMAL'}`);
  }

  function updateBinocularControlButtons() {
    const lblY = document.getElementById('lbl-binoc-flip-y');
    if (lblY) lblY.textContent = gameSettings.binocularInvertY ? 'INVERTED' : 'NORMAL';
    const lblX = document.getElementById('lbl-binoc-flip-x');
    if (lblX) lblX.textContent = gameSettings.binocularInvertX ? 'INVERTED' : 'NORMAL';

    const chkY = document.getElementById('set-binoc-invert-y');
    if (chkY) chkY.checked = !!gameSettings.binocularInvertY;
    const chkX = document.getElementById('set-binoc-invert-x');
    if (chkX) chkX.checked = !!gameSettings.binocularInvertX;
  }

  function sitOnDeckChair(chairId) {
    const chair = (window.BlahajDeckChairs || []).find((c) => c.id === chairId);
    if (!chair) return;

    if (player.inBoat) disembarkBoatAtCurrentLocation();
    if (player.inCart) dismountLaundryCart();
    if (player.isSeatedInBooth) standUpFromBooth();

    player.isLounging = true;
    player.loungeChairId = chair.id;
    player.loungeChair = chair;

    player.pos.set(chair.seatX, chair.seatY, chair.seatZ);
    player.rotY = chair.seatRotY;
    player.velY = 0;
    player.isGrounded = true;

    // Cozy anatomical transformation: Recline comfortably back against the angled cushion!
    if (player.mesh) {
      player.mesh.position.copy(player.pos);
      player.mesh.rotation.y = chair.seatRotY;
      player.mesh.rotation.x = 0.34; // Lean back against headrest
      player.mesh.scale.set(1.12, 0.78, 1.05); // Plush squash settling into cushion
    }

    // Set camera to over-the-shoulder vacation view looking out at the sea!
    let rearCamYaw = chair.seatRotY + Math.PI;
    while (rearCamYaw > Math.PI) rearCamYaw -= Math.PI * 2;
    while (rearCamYaw < -Math.PI) rearCamYaw += Math.PI * 2;
    camState.yaw = rearCamYaw;
    camState.pitch = 0.14;
    camState.distance = 5.4;

    // Equip chilled Piña Colada in fin!
    equipHeldItem('pina_colada');

    // Restore comfort and stuffing
    player.teaComfort = 100;
    player.stuffing = 100;
    updateMetersUI();

    CozyAudio.deckChairLounge();
    showToast(
      'RELAXING ON THE BEACH 🏖️🍹',
      `Lounging on ${chair.name}! Press [Space] or [F] to sip your Piña Colada · [WASD] or [E] to stand up.`
    );
    addChatLog(
      `🏖️🍹 Sunk into the padded cushion of <strong>${chair.name}</strong> with a chilled Piña Colada (+100% Comfort).`,
      'lore'
    );

    if (window.BlahajNetwork) {
      window.BlahajNetwork.send({
        type: 'move',
        sharkId: player.sharkId,
        x: player.pos.x,
        y: player.pos.y,
        z: player.pos.z,
        rotY: player.rotY,
        isMoving: false,
        inBoat: false,
        inCart: false,
        cartId: null,
        zone: currentZone,
        mange: window.__BLAHAJ_MANGE__,
        heldItemId: 'pina_colada',
        isLounging: true,
        loungeChairId: chair.id
      });
    }
  }

  function standUpFromDeckChair() {
    if (!player.isLounging) return;
    player.isLounging = false;
    const chair = player.loungeChair;
    player.loungeChairId = null;
    player.loungeChair = null;

    // Restore shark upright anatomy
    if (player.mesh) {
      player.mesh.rotation.x = 0;
      player.mesh.scale.set(1.0, 1.0, 1.0);
    }

    // Hop slightly forward onto the sand
    player.pos.x += Math.sin(player.rotY) * 0.75;
    player.pos.z += Math.cos(player.rotY) * 0.75;
    player.velY = 0;

    // Put down drink
    stowHeldItem(true);

    CozyAudio.boothStand();
    showToast('STOOD UP FROM DECK CHAIR 🏖️', 'Refreshed and energized from the beach lounge!');

    if (window.BlahajNetwork) {
      window.BlahajNetwork.send({
        type: 'move',
        sharkId: player.sharkId,
        x: player.pos.x,
        y: player.pos.y,
        z: player.pos.z,
        rotY: player.rotY,
        isMoving: false,
        inBoat: false,
        inCart: false,
        cartId: null,
        zone: currentZone,
        mange: window.__BLAHAJ_MANGE__,
        heldItemId: null,
        isLounging: false,
        loungeChairId: null
      });
    }
  }

  function sipPinaColada() {
    if (!player.isLounging) return;
    const now = Date.now();
    if (now - (player._lastPinaColadaSip || 0) < 600) return;
    player._lastPinaColadaSip = now;

    CozyAudio.pinaColadaSip();

    // Spawn tropical sparkles and bubbles at the shark's snout
    const pSnout = new THREE.Vector3(
      player.pos.x + Math.sin(player.rotY) * 0.6,
      player.pos.y + 0.35,
      player.pos.z + Math.cos(player.rotY) * 0.6
    );
    spawnFloatingBurst(pSnout, 0xfacc15, 12);
    spawnFloatingBurst(pSnout, 0xf43f5e, 8);

    player.teaComfort = Math.min(100, player.teaComfort + 5);
    player.stuffing = Math.min(100, player.stuffing + 5);
    updateMetersUI();

    showToast(
      'REFRESHING SIP! 🍹🍍',
      'Ice-cold coconut cream, sweet pineapple, and ocean air!'
    );

    // Broadcast sip to co-op partner
    if (window.BlahajNetwork && typeof window.BlahajNetwork.send === 'function') {
      window.BlahajNetwork.send({
        type: 'lounge_sip',
        x: pSnout.x,
        y: pSnout.y,
        z: pSnout.z,
        chairId: player.loungeChairId
      });
    }
  }

  function openSphericalPaintingModal(paintingIndex) {
    if (!window.BlahajSphericalFoods) return;
    const cfg = window.BlahajSphericalFoods.getPaintingConfig(paintingIndex);
    if (!cfg) return;

    CozyAudio.bistroChime();

    const actions = [
      {
        label: 'Order Signature Dish [E] 🧆',
        className: 'btn-accent',
        onClick: () => {
          closeDialogueModal();
          openSphericalFoodsMenuModal();
        }
      },
      {
        label: 'Culinary Commentary with Monsieur Betterave 💬',
        className: 'btn-primary',
        onClick: () => {
          closeDialogueModal();
          openDialogueModal({
            speaker: 'Monsieur Betterave',
            role: 'PROPRIÉTAIRE · SPHERICAL FOODS BISTRO',
            portrait: 'assets/gallery/Spherical-Foods.png',
            text: `“Ah, you admire '${cfg.title}'! A triumph of spherical gastronomy. ${cfg.description} Every radius is calibrated to maximize the sphere's internal flavor pressure. In our kitchen, corners are strictly verboten!”`,
            actions: [
              {
                label: 'View Full Spherical Menu 📜',
                className: 'btn-primary',
                onClick: () => {
                  closeDialogueModal();
                  openSphericalFoodsMenuModal();
                }
              }
            ]
          });
        }
      }
    ];

    const customHtml = `
      <div style="background: rgba(24, 15, 11, 0.92); border: 1px solid #d8aa5b; border-radius: 8px; padding: 12px; margin-top: 10px; color: #fdfaf6;">
        <div style="font-size: 13px; color: #fbbf24; font-weight: bold; letter-spacing: 0.5px;">CULINARY TASTING NOTES:</div>
        <div style="font-size: 12px; color: #fed7aa; margin-top: 4px; font-style: italic;">${cfg.tastingNotes}</div>
      </div>
    `;

    openDialogueModal({
      speaker: 'Bistro Wall Art Gallery',
      role: 'COLLECTION DE L’ACADÉMIE SPHÉRIQUE',
      portrait: 'assets/gallery/Spherical-Foods.png',
      text: `“${cfg.title}” — ${cfg.subtitle}\n\n${cfg.description}`,
      customHtml: customHtml,
      actions: actions
    });
  }

  function orderSphericalDish(boothIndex, dishKey) {
    if (!window.BlahajSphericalFoods) return;
    CozyAudio.bistroChime();
    window.BlahajSphericalFoods.orderDishToBooth(boothIndex, dishKey);

    const dishNames = {
      helen_cake: "Helen's Celestial Birthday Bombe",
      mac_spheres: "Lava Lychee & Truffle Mac Spheres",
      ramen_spheres: "Miso Ramen & Steamed Bao Spheres",
      mochi_spheres: "Strawberry Mochi & Matcha Tiramisphere"
    };
    const name = dishNames[dishKey] || "Spherical Specialty";

    showToast('ORDER PLACED! 🧆🛎️', `Monsieur Betterave is wheeling the trolley over with ${name}!`);
    addChatLog(`🛎️ Ordered <strong>${name}</strong>. Monsieur Betterave is wheeling the trolley over to your booth table!`, 'cozy');

    window.BlahajNetwork.send({
      type: 'bistro_order',
      boothIndex: boothIndex,
      dishKey: dishKey,
      dishName: name
    });
  }

  function bakeBrebAtOven() {
    let added = 3;
    if (player.inventory) {
      const res = player.inventory.addItem('breb', 3);
      if (res > 0) added = res;
    }
    player.teaComfort = Math.min(100, player.teaComfort + 20);
    player.stuffing = Math.min(100, player.stuffing + 20);
    updateMetersUI();

    CozyAudio.ovenBake();
    spawnFloatingBurst(player.pos, 0xd97706, 28);
    spawnFloatingBurst(player.pos, 0xfacc15, 16);

    // Nearby Birbs chirp with delight!
    CozyAudio.birbChirp();

    showToast('FRESH BREB BAKED! 🥖✨', `Pulled ${added} steaming golden loaves from Solomon's Stone Oven at Heartland Meadow!`);
    addChatLog(`🥖 Fresh golden loaves baked in <strong>Solomon's Stone Bread Oven</strong> at Heartland Meadow (+${added} Breb for Birbs, +20% Stuffing & Comfort)!`, 'lore');
    completeQuest('q-breb');
  }

  function damagePlayer(amount = 16, attackerTitle = 'Enemy', knockbackDir = null) {
    if (playerInvulnTimer > 0) return;
    if (player.inUFO || (window.BlahajUFO && typeof window.BlahajUFO.isLocalAboard === 'function' && window.BlahajUFO.isLocalAboard())) {
      return;
    }

    // Pass 81 & 82: MMO Defensive Postures & Passive Fin-Stance Armor
    let mangeDelta = 0.05;
    if (window.BlahajMMO && typeof window.BlahajMMO.getPassiveDamageMultiplier === 'function') {
      const passiveMult = window.BlahajMMO.getPassiveDamageMultiplier();
      amount = Math.max(1, Math.round(amount * passiveMult));
    }
    if (window.BlahajMMO && typeof window.BlahajMMO.mitigateIncomingHit === 'function') {
      const mit = window.BlahajMMO.mitigateIncomingHit(amount, attackerTitle, knockbackDir);
      if (mit.parried) {
        playerInvulnTimer = 0.85;
        return;
      }
      if (mit.blocked) {
        amount = mit.damage;
        mangeDelta *= (mit.mangeMultiplier ?? 0.2);
        if (mit.ignoreKnockback) knockbackDir = null;
      }
    }

    playerInvulnTimer = 0.85; // 0.85s i-frame window

    player.stuffing = Math.max(0, (player.stuffing ?? 100) - amount);
    player.teaComfort = Math.max(0, player.teaComfort - Math.round(amount * 0.7));
    adjustSharkMange(player.sharkId, mangeDelta, attackerTitle);
    updateMetersUI();

    // Recoil knockback impulse
    if (knockbackDir) {
      player.pos.x += knockbackDir.x * 0.95;
      player.pos.z += knockbackDir.z * 0.95;
      player.velY = Math.max(player.velY, 4.5);
    }

    // Impact audio
    CozyAudio.hurtSqueak();

    // Red screen damage flash
    const flashEl = document.getElementById('damage-flash-overlay');
    if (flashEl) {
      flashEl.classList.add('active');
      setTimeout(() => flashEl.classList.remove('active'), 280);
    }

    // Mesh flash
    if (player.mesh) {
      player.mesh.traverse((c) => {
        if (c.isMesh && c.material) {
          const origHex = c.material.color.getHex();
          c.material.color.setHex(0xff3333);
          setTimeout(() => c.material.color.setHex(origHex), 140);
        }
      });
    }

    // Plush fluff burst
    spawnFloatingBurst(player.pos, 0xfecdd3, 16);

    // Floating combat text
    if (window.BlahajEnemies && window.BlahajEnemies.spawnFloatingCombatText) {
      window.BlahajEnemies.spawnFloatingCombatText(player.pos, `💥 -${amount}% STUFFING!`, '#ef4444');
    }

    showToast(`💥 TAKEN DAMAGE! (-${amount}% Stuffing)`, `Bitten by ${attackerTitle}! Press [F] to Boop Attack!`);
    addChatLog(`💥 <strong>${attackerTitle}</strong> attacked you (-${amount}% Stuffing Coherence)! Defend yourself with [F] Boop Attack.`, 'cozy');

    // Check if Unstuffed / Deflated (0% Stuffing)
    if (player.stuffing <= 0) {
      triggerUnstuffedRecovery(attackerTitle);
    }
  }

  function triggerUnstuffedRecovery(reason = 'Battle') {
    CozyAudio.shonk();
    isRebirthing = true;
    playerInvulnTimer = 3.0;
    showToast('💫 UNSTUFFED! 🦈 REBIRTH IN SPAWNING PITS', 'Your plush stuffing unraveled! Wake up in Wire Bin #303.735.88 and navigate Hermes’s Portal back to your last save point!');
    addChatLog(`💫 Your plush seams unraveled (${reason})! You have been whisked back to the <strong>IKEA Spawning Pits of Erf</strong> (Art. 303.735.88). Reach Hermes’s Between Portal at the warehouse exit to return to your last save point!`, 'danger');

    enterSpawningPits(true);
  }

  function toggleBinocularMode() {
    if (isUsingBinoculars) {
      exitBinocularMode();
    } else {
      enterBinocularMode();
    }
  }

  function enterBinocularMode() {
    if (isUsingBinoculars) return;
    if (player.inUFO || player.isLounging || player.isSeatedInBooth || player.inCart) return;

    isUsingBinoculars = true;
    binocularSavedDistance = camState.distance;
    binocularSavedFov = camera.fov;
    binocularSavedShoulderRight = camState.shoulderRight;
    binocularSavedHeightOffset = camState.heightOffset;

    // Temporarily hide player mesh so lenses have 100% unobstructed view forward!
    if (player.mesh) {
      player.mesh.visible = false;
    }

    camState.distance = 0.0;
    camState.shoulderRight = 0.0;
    camState.heightOffset = 1.15;
    camState.pitch = 0.04; // Level horizon view instead of snapping into the sky
    camera.fov = 16.0; // 4.5x zoom
    camera.updateProjectionMatrix();

    const overlay = document.getElementById('binocular-overlay');
    if (overlay) overlay.classList.remove('hidden');
    document.body.classList.add('in-binocular-mode');

    updateBinocularControlButtons();
    CozyAudio.binocularZoom();
    showToast('🔭 BINOCULAR HORIZON VIEW', 'Looking through brass lenses! Press [Esc / Space / F / T] to exit · [I] Invert Pitch.');
  }

  function exitBinocularMode() {
    if (!isUsingBinoculars) return;
    isUsingBinoculars = false;

    // Restore player mesh visibility
    if (player.mesh) {
      player.mesh.visible = true;
    }

    camState.distance = binocularSavedDistance || 7.4;
    camState.shoulderRight = binocularSavedShoulderRight || 0.85;
    camState.heightOffset = binocularSavedHeightOffset || 2.35;
    camera.fov = binocularSavedFov || 60;
    camera.updateProjectionMatrix();

    const overlay = document.getElementById('binocular-overlay');
    if (overlay) overlay.classList.add('hidden');
    document.body.classList.remove('in-binocular-mode');

    CozyAudio.shonkPop ? CozyAudio.shonkPop() : CozyAudio.shonk();
    showToast('LOWERED BINOCULARS 🔭', 'Back to standard third-person view.');
  }

  // ==========================================================================
  // CELESTIAL OBSERVATORY TELESCOPE & CLOUD SHARK SYSTEM
  // ==========================================================================
  let isUsingTelescope = false;
  let telescopeSavedDistance = 7.4;
  let telescopeSavedFov = 60;
  let telescopeSavedShoulderRight = 0.85;
  let telescopeSavedHeightOffset = 2.35;
  let telescopeSavedYaw = 0;
  let telescopeSavedPitch = 0.15;
  let telescopeCanvas = null;
  let telescopeCtx = null;
  let targetedCloudShark = null;
  let cloudParticles = [];

  // 6 Cloud Sharks nestled in close-up drifting cloud strata
  const CELESTIAL_CLOUD_SHARKS = [
    {
      id: 'snowball',
      name: 'Snowball',
      type: 'white',
      species: 'Great White Cloud Shark',
      desc: 'Fluffy White Fleece · Gentle Smile',
      quip: 'Snowball smiles warmly and waves their little white fin right back at you!',
      azimuth: 0.38,
      pitch: 0.45,
      cloudRadius: 95,
      depth: 1.0,
      scale: 1.15,
      phase: 0.0,
      waveTimer: 0
    },
    {
      id: 'pearl',
      name: 'Pearl',
      type: 'white_pup',
      species: 'Snowy Cloud Pup',
      desc: 'Playful Baby White Shark · Rosy Cheeks',
      quip: 'Tiny Pearl gives enthusiastic double-fin waves from behind a cloud puff!',
      azimuth: 1.35,
      pitch: 0.58,
      cloudRadius: 80,
      depth: 0.92,
      scale: 0.88,
      phase: 1.6,
      waveTimer: 0
    },
    {
      id: 'barnaby',
      name: 'Barnaby',
      type: 'blahaj',
      species: 'Cumulus Blåhaj',
      desc: 'Classic Blue Plushie · Cloud Hammock',
      quip: 'Barnaby stretches comfortably on a cloud bed and gives a slow, cozy fin wave!',
      azimuth: 2.32,
      pitch: 0.36,
      cloudRadius: 105,
      depth: 1.05,
      scale: 1.1,
      phase: 3.1,
      waveTimer: 0
    },
    {
      id: 'nimbus',
      name: 'Captain Nimbus',
      type: 'white_pilot',
      species: 'Aviator White Shark',
      desc: 'White Shark in Brass Aviator Goggles',
      quip: 'Captain Nimbus adjusts their tiny brass goggles and gives a crisp pilot fin salute!',
      azimuth: 3.45,
      pitch: 0.52,
      cloudRadius: 110,
      depth: 1.15,
      scale: 1.2,
      phase: 4.5,
      waveTimer: 0
    },
    {
      id: 'stardust',
      name: 'Stardust',
      type: 'frost_white',
      species: 'Celestial Frost Great White',
      desc: 'Gleaming Starlight Coat · Sparkling Fin',
      quip: 'Stardust pirouettes through a cloud ring and showers glittering star motes down!',
      azimuth: 4.65,
      pitch: 0.68,
      cloudRadius: 90,
      depth: 0.95,
      scale: 1.05,
      phase: 2.2,
      waveTimer: 0
    },
    {
      id: 'fluff',
      name: 'Fluff',
      type: 'white',
      species: 'Cotton Fleece White Shark',
      desc: 'Pure White Cloud Swimmer',
      quip: 'Fluff waves their little fin happily, thrilled to be spotted through the telescope!',
      azimuth: 5.55,
      pitch: 0.40,
      cloudRadius: 100,
      depth: 1.0,
      scale: 1.08,
      phase: 5.4,
      waveTimer: 0
    }
  ];

  // Procedural cloud formations drifting across azimuths
  const CELESTIAL_CLOUDS = [];
  (function initCelestialClouds() {
    for (let i = 0; i < 22; i++) {
      const az = (i / 22) * Math.PI * 2 + (Math.random() - 0.5) * 0.2;
      const pt = 0.20 + Math.random() * 0.70;
      const strata = i % 3; // 0 = far, 1 = mid, 2 = close foreground
      const driftSpeed = 0.008 + strata * 0.006 + Math.random() * 0.004;
      const numLobes = 4 + Math.floor(Math.random() * 4);
      const lobes = [];
      for (let j = 0; j < numLobes; j++) {
        lobes.push({
          ox: (Math.random() - 0.5) * 110,
          oy: (Math.random() - 0.5) * 45,
          rx: 40 + Math.random() * 55,
          ry: 28 + Math.random() * 38,
          alpha: 0.65 + Math.random() * 0.30
        });
      }
      CELESTIAL_CLOUDS.push({ az, pt, strata, driftSpeed, lobes });
    }
  })();

  function initTelescopeEvents() {
    telescopeCanvas = document.getElementById('telescope-cloud-canvas');
    if (telescopeCanvas) {
      telescopeCtx = telescopeCanvas.getContext('2d');
      telescopeCanvas.addEventListener('click', () => {
        waveToCloudSharks();
      });
    }

    document.getElementById('btn-close-telescope')?.addEventListener('click', () => {
      exitTelescopeMode();
    });

    document.getElementById('btn-tele-wave')?.addEventListener('click', () => {
      waveToCloudSharks();
    });

    document.getElementById('btn-tele-flip-y')?.addEventListener('click', () => {
      gameSettings.binocularInvertY = !gameSettings.binocularInvertY;
      saveSettings();
      updateTelescopeControlButtons();
      updateBinocularControlButtons();
      showToast('↕ TELESCOPE PITCH', `Vertical Look: ${gameSettings.binocularInvertY ? 'INVERTED' : 'NORMAL'}`);
    });

    document.getElementById('btn-tele-flip-x')?.addEventListener('click', () => {
      gameSettings.binocularInvertX = !gameSettings.binocularInvertX;
      saveSettings();
      updateTelescopeControlButtons();
      updateBinocularControlButtons();
      showToast('↔ TELESCOPE PAN', `Horizontal Look: ${gameSettings.binocularInvertX ? 'INVERTED' : 'NORMAL'}`);
    });

    document.getElementById('btn-tele-gallery')?.addEventListener('click', () => {
      exitTelescopeMode();
      toggleGalleryModal();
    });
  }

  function updateTelescopeControlButtons() {
    const lblY = document.getElementById('lbl-tele-flip-y');
    if (lblY) lblY.textContent = gameSettings.binocularInvertY ? 'INVERTED' : 'NORMAL';
    const lblX = document.getElementById('lbl-tele-flip-x');
    if (lblX) lblX.textContent = gameSettings.binocularInvertX ? 'INVERTED' : 'NORMAL';
  }

  function enterTelescopeMode() {
    if (isUsingTelescope) return;
    if (isUsingBinoculars) exitBinocularMode();
    if (isAnyModalOpen()) return;

    isUsingTelescope = true;
    telescopeSavedDistance = camState.distance;
    telescopeSavedFov = camera.fov;
    telescopeSavedShoulderRight = camState.shoulderRight;
    telescopeSavedHeightOffset = camState.heightOffset;
    telescopeSavedYaw = camState.yaw;
    telescopeSavedPitch = camState.pitch;

    if (player.mesh) {
      player.mesh.visible = false;
    }

    camState.distance = 0.0;
    camState.shoulderRight = 0.0;
    camState.heightOffset = 1.15;
    // Initial celestial telescope view looks up towards the cloud deck
    camState.pitch = 0.46; // ~26 deg upward
    camera.fov = 18.0; // 12x magnification
    camera.updateProjectionMatrix();

    const overlay = document.getElementById('telescope-overlay');
    if (overlay) overlay.classList.remove('hidden');
    document.body.classList.add('in-telescope-mode');

    updateTelescopeControlButtons();
    CozyAudio.telescopeFocus();
    showToast('🔭 OBSERVATORY TELESCOPE', 'Scanning close-up cloud strata! Watch for waving cloud sharks · [Space / Click] Wave back.');
    addChatLog('🔭 You leaned into the brass eyepiece of the Starlight Observatory Telescope! Puffy celestial clouds drift past above the island.', 'lore');
  }

  function exitTelescopeMode() {
    if (!isUsingTelescope) return;
    isUsingTelescope = false;

    if (player.mesh) {
      player.mesh.visible = true;
    }

    camState.distance = telescopeSavedDistance || 7.4;
    camState.shoulderRight = telescopeSavedShoulderRight || 0.85;
    camState.heightOffset = telescopeSavedHeightOffset || 2.35;
    camState.pitch = telescopeSavedPitch || 0.15;
    camera.fov = telescopeSavedFov || 60;
    camera.updateProjectionMatrix();

    const overlay = document.getElementById('telescope-overlay');
    if (overlay) overlay.classList.add('hidden');
    document.body.classList.remove('in-telescope-mode');

    CozyAudio.shonkPop ? CozyAudio.shonkPop() : CozyAudio.shonk();
    showToast('STEPPED FROM TELESCOPE 🔭', 'Back to observatory terrace view.');
  }

  function toggleTelescopeMode() {
    if (isUsingTelescope) exitTelescopeMode();
    else enterTelescopeMode();
  }

  function waveToCloudSharks() {
    if (!isUsingTelescope) return;

    if (targetedCloudShark) {
      targetedCloudShark.waveTimer = 3.8;
      CozyAudio.cloudSharkWaveChime();
      spawnTelescopeHeartsAndSparkles(window.innerWidth / 2, window.innerHeight / 2);
      showToast(`👋 WAVED TO ${targetedCloudShark.name.toUpperCase()}! 🦈✨`, targetedCloudShark.quip);
      addChatLog(`🔭 <strong>Observatory Sighting:</strong> You waved to <strong>${targetedCloudShark.name}</strong> (${targetedCloudShark.species}) drifting in the clouds! They waved their little fin happily back at you!`, 'lore');
    } else {
      // Wave generally into the sky
      CELESTIAL_CLOUD_SHARKS.forEach(s => { s.waveTimer = 3.2; });
      CozyAudio.cloudSharkWaveChime();
      spawnTelescopeHeartsAndSparkles(window.innerWidth / 2, window.innerHeight / 2);
      showToast('WAVED INTO THE CLOUDS! 👋☁️✨', 'The cloud sharks spotted your wave and all waved their little fins together!');
      addChatLog('🔭 You waved your fin up through the telescope! White sharks nestled in the clouds waved right back!', 'cozy');
    }
  }

  function spawnTelescopeHeartsAndSparkles(cx, cy) {
    const symbols = ['✨', '💕', '⭐', '🦈', '🌸', '✨'];
    for (let i = 0; i < 14; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 40 + Math.random() * 90;
      cloudParticles.push({
        x: cx + Math.cos(ang) * 20,
        y: cy + Math.sin(ang) * 20,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 40,
        symbol: symbols[i % symbols.length],
        alpha: 1.0,
        size: 16 + Math.random() * 14,
        rot: (Math.random() - 0.5) * 1.5
      });
    }
  }

  function updateTelescopeCloudCanvas(dt, elapsed) {
    if (!telescopeCanvas || !telescopeCtx) return;
    dt = (typeof dt === 'number' && !isNaN(dt) && dt > 0) ? Math.min(dt, 0.1) : 0.016;
    elapsed = (typeof elapsed === 'number' && !isNaN(elapsed)) ? elapsed : (clock ? clock.getElapsedTime() : 0);
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (telescopeCanvas.width !== w || telescopeCanvas.height !== h) {
      telescopeCanvas.width = w;
      telescopeCanvas.height = h;
    }

    const ctx = telescopeCtx;
    ctx.clearRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;
    const apRadius = Math.min(w, h) * 0.41;

    // Clip rendering strictly within circular telescope aperture
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, apRadius, 0, Math.PI * 2);
    ctx.clip();

    // 1. Celestial Atmosphere Sky Background Gradient
    const skyGrad = ctx.createRadialGradient(cx, cy * 0.7, 50, cx, cy, apRadius * 1.15);
    skyGrad.addColorStop(0, '#7dd3fc'); // bright sunlit high atmosphere
    skyGrad.addColorStop(0.45, '#38bdf8');
    skyGrad.addColorStop(0.85, '#0284c7');
    skyGrad.addColorStop(1, '#0369a1');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h);

    // Subtle twinkling celestial star motes in upper stratosphere
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    for (let i = 0; i < 30; i++) {
      const sx = (Math.sin(i * 123.4 + elapsed * 0.2) * 0.5 + 0.5) * w;
      const sy = (Math.cos(i * 789.1 + elapsed * 0.2) * 0.5 + 0.5) * h;
      const sr = 1.0 + Math.sin(elapsed * 3.0 + i) * 0.7;
      if (Math.hypot(sx - cx, sy - cy) < apRadius - 10) {
        ctx.beginPath();
        ctx.arc(sx, sy, Math.max(0.4, sr), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Camera angles
    const curYaw = ((-camState.yaw % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const curPitch = camState.pitch; // 0.08 .. 1.35
    const fovScale = (Math.min(w, h) / 0.32); // Angular scale in pixels per radian

    // 2. Draw drifting cloud formations across 3 depth strata
    CELESTIAL_CLOUDS.forEach(c => {
      c.az = (c.az + c.driftSpeed * dt) % (Math.PI * 2);

      // Relative angle to camera view
      let dAz = c.az - curYaw;
      while (dAz > Math.PI) dAz -= Math.PI * 2;
      while (dAz < -Math.PI) dAz += Math.PI * 2;
      const dPt = c.pt - curPitch;

      const px = cx + dAz * fovScale * (0.8 + c.strata * 0.25);
      const py = cy - dPt * fovScale * (0.8 + c.strata * 0.25);

      // Cull clouds far outside aperture
      if (Math.hypot(px - cx, py - cy) > apRadius + 220) return;

      drawSingleCloudFormation(ctx, px, py, c.strata, c.lobes, elapsed);
    });

    // 3. Draw Cloud Sharks with Waving Little Fins!
    let bestAimShark = null;
    let minAimDist = 140; // Reticle targeting threshold

    CELESTIAL_CLOUD_SHARKS.forEach(s => {
      // Advance wave timers
      if (s.waveTimer > 0) s.waveTimer -= dt;

      // Drift shark slowly with the clouds
      s.azimuth = (s.azimuth + 0.007 * dt) % (Math.PI * 2);

      let dAz = s.azimuth - curYaw;
      while (dAz > Math.PI) dAz -= Math.PI * 2;
      while (dAz < -Math.PI) dAz += Math.PI * 2;
      const dPt = s.pitch - curPitch;

      const sx = cx + dAz * fovScale * s.depth;
      const sy = cy - dPt * fovScale * s.depth;

      const distToCenter = Math.hypot(sx - cx, sy - cy);
      if (distToCenter < apRadius + 140) {
        drawCloudShark(ctx, s, sx, sy, s.scale, elapsed);

        if (distToCenter < minAimDist) {
          minAimDist = distToCenter;
          bestAimShark = s;
        }
      }
    });

    targetedCloudShark = bestAimShark;

    // 4. Update Particle Sparkles / Hearts
    for (let i = cloudParticles.length - 1; i >= 0; i--) {
      const p = cloudParticles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha -= dt * 0.55;
      if (p.alpha <= 0) {
        cloudParticles.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.font = `${p.size}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.symbol, p.x, p.y);
      ctx.restore();
    }

    ctx.restore(); // Restore unclipped state for HUD & targeting

    // 5. Update Target Box & Readout HUD
    const targetBox = document.getElementById('telescope-target-box');
    const labelEl = document.getElementById('telescope-target-label');
    const coordsEl = document.getElementById('telescope-coords-text');

    if (coordsEl) {
      const altM = Math.round(2800 + curPitch * 1400);
      const headingDeg = Math.round((curYaw * 180 / Math.PI) % 360);
      coordsEl.innerHTML = `<span>ALT: ${altM}m</span> · <span>BEARING: ${headingDeg}°</span> · <span>STRATA: CUMULUS &amp; CIRRUS</span> · <span>MAG: 12.0x</span>`;
    }

    if (targetedCloudShark) {
      if (targetBox) {
        targetBox.style.display = 'block';
        targetBox.style.borderColor = (targetedCloudShark.type === 'blahaj') ? '#38bdf8' : '#fef08a';
      }
      if (labelEl) {
        const isWavingExtra = targetedCloudShark.waveTimer > 0;
        const waveText = isWavingExtra ? 'WAVING EXCITEDLY! 👋💕✨' : 'WAVING LITTLE FIN! 👋';
        labelEl.innerHTML = `🎯 <strong>${targetedCloudShark.name}</strong> (${targetedCloudShark.species}) · <span style="color: #fef08a;">${waveText}</span><br><span style="font-size: 0.82rem; color: #94a3b8;">${targetedCloudShark.desc} · [Space / Click] Wave Back!</span>`;
        labelEl.style.borderColor = '#fef08a';
      }
    } else {
      if (targetBox) targetBox.style.display = 'none';
      if (labelEl) {
        labelEl.innerHTML = `☁️ SCANNING CELESTIAL CLOUDS · 12.0x MAGNIFICATION<br><span style="font-size: 0.82rem; color: #94a3b8;">Aim at drifting cloud sharks to wave back! [WASD / Mouse] Scan</span>`;
        labelEl.style.borderColor = 'rgba(216, 170, 91, 0.75)';
      }
    }
  }

  function drawSingleCloudFormation(ctx, x, y, strata, lobes, elapsed) {
    ctx.save();
    ctx.translate(x, y);

    // Multi-lobe soft volumetric cloud
    lobes.forEach((l, idx) => {
      const bob = Math.sin(elapsed * 1.5 + idx) * 3;
      const lx = l.ox;
      const ly = l.oy + bob;

      // Soft billowy radial gradient
      const grad = ctx.createRadialGradient(lx, ly, l.rx * 0.15, lx, ly, l.rx);
      if (strata === 0) {
        // High Cirrus: delicate translucent lilac/white
        grad.addColorStop(0, `rgba(255, 255, 255, ${l.alpha * 0.55})`);
        grad.addColorStop(0.7, `rgba(243, 232, 255, ${l.alpha * 0.35})`);
        grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      } else if (strata === 1) {
        // Mid Cumulus: soft warm white with gentle shadow
        grad.addColorStop(0, `rgba(255, 255, 255, ${l.alpha * 0.85})`);
        grad.addColorStop(0.65, `rgba(241, 245, 249, ${l.alpha * 0.65})`);
        grad.addColorStop(1, 'rgba(226, 232, 240, 0)');
      } else {
        // Close Foreground: large puffy dreamy cloud
        grad.addColorStop(0, `rgba(255, 255, 255, ${l.alpha * 0.95})`);
        grad.addColorStop(0.5, `rgba(248, 250, 252, ${l.alpha * 0.80})`);
        grad.addColorStop(0.85, `rgba(226, 232, 240, ${l.alpha * 0.40})`);
        grad.addColorStop(1, 'rgba(203, 213, 225, 0)');
      }

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(lx, ly, l.rx, l.ry, 0, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();
  }

  function drawCloudShark(ctx, shark, sx, sy, scale, elapsed) {
    ctx.save();

    // Harmonic bobbing motion
    const bobY = Math.sin(elapsed * 2.5 + shark.phase) * 6;
    const tilt = Math.cos(elapsed * 2.0 + shark.phase) * 0.05;

    ctx.translate(sx, sy + bobY);
    ctx.rotate(tilt);
    ctx.scale(scale, scale);

    // 1. Soft Cloud Hammock Cushion Underneath Shark
    const cloudBed = ctx.createRadialGradient(0, 24, 10, 0, 24, 75);
    cloudBed.addColorStop(0, 'rgba(255, 255, 255, 0.92)');
    cloudBed.addColorStop(0.55, 'rgba(241, 245, 249, 0.75)');
    cloudBed.addColorStop(1, 'rgba(226, 232, 240, 0)');
    ctx.fillStyle = cloudBed;
    ctx.beginPath();
    ctx.ellipse(0, 24, 75, 34, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Tail swish
    const tailSwish = Math.sin(elapsed * 3.2 + shark.phase) * 0.14;

    const isWhite = shark.type.includes('white');
    const isBlahaj = shark.type === 'blahaj';
    const isPilot = shark.type === 'white_pilot';
    const isFrost = shark.type === 'frost_white';

    // Body Colors
    let bodyColorTop = '#ffffff';
    let bodyColorBot = '#e2e8f0';
    let bellyColor = '#ffffff';
    let outlineColor = 'rgba(148, 163, 184, 0.55)';

    if (isBlahaj) {
      bodyColorTop = '#5b8db8';
      bodyColorBot = '#3b658d';
      bellyColor = '#f8fafc';
      outlineColor = 'rgba(30, 58, 95, 0.45)';
    } else if (isFrost) {
      bodyColorTop = '#ffffff';
      bodyColorBot = '#e0f2fe';
      bellyColor = '#ffffff';
      outlineColor = 'rgba(56, 189, 248, 0.6)';
    }

    // Draw Tail (Caudal Fin)
    ctx.save();
    ctx.translate(-42, 0);
    ctx.rotate(tailSwish);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-16, -22, -26, -24);
    ctx.quadraticCurveTo(-20, -8, -10, 0);
    ctx.quadraticCurveTo(-20, 8, -24, 18);
    ctx.quadraticCurveTo(-14, 16, 0, 0);
    ctx.fillStyle = bodyColorTop;
    ctx.fill();
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();

    // Draw Dorsal Fin
    ctx.beginPath();
    ctx.moveTo(-10, -10);
    ctx.quadraticCurveTo(-4, -34, 4, -35);
    ctx.quadraticCurveTo(12, -22, 16, -10);
    ctx.closePath();
    ctx.fillStyle = bodyColorTop;
    ctx.fill();
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Draw Main Plush Shark Torpedo Body
    const bodyGrad = ctx.createLinearGradient(0, -18, 0, 16);
    bodyGrad.addColorStop(0, bodyColorTop);
    bodyGrad.addColorStop(0.65, bodyColorBot);
    bodyGrad.addColorStop(1, bellyColor);

    ctx.beginPath();
    ctx.moveTo(48, 4); // Snout
    ctx.quadraticCurveTo(34, -18, 0, -18); // Head & back
    ctx.quadraticCurveTo(-32, -16, -42, 0); // Peduncle
    ctx.quadraticCurveTo(-28, 16, 0, 16); // Lower belly
    ctx.quadraticCurveTo(32, 16, 48, 4); // Chin to snout
    ctx.closePath();
    ctx.fillStyle = bodyGrad;
    ctx.fill();
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 1.4;
    ctx.stroke();

    // White Plush Belly Patch
    ctx.beginPath();
    ctx.moveTo(42, 6);
    ctx.quadraticCurveTo(24, 15, 0, 15);
    ctx.quadraticCurveTo(-24, 15, -36, 4);
    ctx.quadraticCurveTo(-18, 8, 0, 8);
    ctx.quadraticCurveTo(24, 8, 42, 6);
    ctx.closePath();
    ctx.fillStyle = bellyColor;
    ctx.fill();

    // Gill Stitch Lines
    ctx.strokeStyle = isBlahaj ? 'rgba(255, 255, 255, 0.65)' : 'rgba(203, 213, 225, 0.85)';
    ctx.lineWidth = 1.2;
    for (let g = 0; g < 3; g++) {
      ctx.beginPath();
      ctx.arc(8 + g * 5, 2, 6, Math.PI * 0.7, Math.PI * 1.3);
      ctx.stroke();
    }

    // Cheerful Smile with Cute Felt Teeth
    ctx.strokeStyle = isBlahaj ? '#1e293b' : '#334155';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(32, 7);
    ctx.quadraticCurveTo(38, 12, 44, 6);
    ctx.stroke();

    // Tiny white felt triangular teeth!
    ctx.fillStyle = '#ffffff';
    for (let t = 0; t < 3; t++) {
      const tx = 34 + t * 3.5;
      const ty = 8.5;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(tx + 1.8, ty + 2.8);
      ctx.lineTo(tx + 3.6, ty);
      ctx.closePath();
      ctx.fill();
    }

    // Rosy Pink Cheeks
    ctx.fillStyle = 'rgba(255, 140, 165, 0.42)';
    ctx.beginPath();
    ctx.ellipse(33, 2, 4.5, 3.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Adorable Black Bead Eye with White Catchlight Sparkle
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(32, -4, 3.2, 0, Math.PI * 2);
    ctx.fill();

    // Catchlight dot
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(33.2, -5.2, 1.1, 0, Math.PI * 2);
    ctx.fill();

    // Special Accessories: Aviator Goggles
    if (isPilot) {
      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(14, -6);
      ctx.lineTo(36, -6);
      ctx.stroke();

      // Brass goggle rims
      ctx.fillStyle = '#fef08a';
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(24, -9, 4.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Cyan tinted glass
      ctx.fillStyle = '#67e8f9';
      ctx.beginPath();
      ctx.arc(24, -9, 3.4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Special Sparkles for Frost White Shark
    if (isFrost) {
      ctx.fillStyle = 'rgba(254, 240, 138, 0.85)';
      const spRot = elapsed * 3.0;
      for (let s = 0; s < 3; s++) {
        const spx = 45 + Math.cos(spRot + s * 2.1) * 14;
        const spy = -5 + Math.sin(spRot + s * 2.1) * 14;
        ctx.beginPath();
        ctx.arc(spx, spy, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // ========================================================================
    // 3. THE WAVING LITTLE FIN! (Front Pectoral Fin)
    // ========================================================================
    // Waving fin angle rotates up and down in a cozy, rhythmic hello!
    const isExcited = shark.waveTimer > 0;
    const waveFreq = isExcited ? 13.5 : 4.0;
    const waveAmp = isExcited ? 0.75 : 0.48;
    const waveAng = Math.sin(elapsed * waveFreq + shark.phase) * waveAmp - 0.25;

    ctx.save();
    // Fin pivot near lower chest
    ctx.translate(18, 6);
    ctx.rotate(waveAng);

    // Cute rounded plush pectoral fin
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(14, -10, 24, -4);
    ctx.quadraticCurveTo(20, 14, 2, 10);
    ctx.closePath();

    const finGrad = ctx.createLinearGradient(0, -6, 20, 8);
    finGrad.addColorStop(0, bodyColorTop);
    finGrad.addColorStop(1, bodyColorBot);
    ctx.fillStyle = finGrad;
    ctx.fill();
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 1.3;
    ctx.stroke();

    // Little fin seam highlight
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(4, 1);
    ctx.quadraticCurveTo(12, -4, 18, 0);
    ctx.stroke();

    // Waving motion sparkle at tip of little fin
    if (isExcited || Math.sin(elapsed * 4.0) > 0.4) {
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(23, -3, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    // 4. Foreground Cloud Puffs overlapping belly (nestled inside cloud!)
    const cloudFG = ctx.createRadialGradient(8, 20, 4, 8, 20, 42);
    cloudFG.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    cloudFG.addColorStop(0.65, 'rgba(248, 250, 252, 0.65)');
    cloudFG.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = cloudFG;
    ctx.beginPath();
    ctx.ellipse(8, 20, 42, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function updateBinocularCrosshairHUD() {
    const headingDeg = Math.round(((-camState.yaw * 180) / Math.PI % 360 + 360) % 360);
    const compassEl = document.getElementById('binocular-compass-text');
    if (compassEl) {
      const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
      const dirIdx = Math.round(headingDeg / 45) % 8;
      const curDir = directions[dirIdx];
      compassEl.innerHTML = `<span>${(headingDeg - 30 + 360) % 360}°</span> <span>• ${curDir} (${headingDeg}°) •</span> <span>${(headingDeg + 30) % 360}°</span>`;
    }

    const labelEl = document.getElementById('binocular-target-label');
    if (!labelEl) return;

    const LANDMARKS = [
      { name: 'The Sacred Volcano Balcony', x: 0, z: -125 },
      { name: 'Rear Volcano Wharf & Sea Cave', x: -28, z: -194 },
      { name: 'Crescent Beach Volleyball Court', x: 28, z: 52 },
      { name: 'Solomon’s Stone Bread Oven', x: -12.5, z: 16.0 },
      { name: 'Heartland Birb Meadow', x: -14, z: 18 },
      { name: 'Heartland Endless Pier', x: 6, z: 42 },
      { name: 'The Great Portal Gate (NZ ↔ LA)', x: 72, z: -10 },
      { name: 'Hermes’ Starlight Atoll', x: 135, z: -25 },
      { name: 'Solomon’s Sunlit Meadow Cay', x: -115, z: 85 },
      { name: 'Hiram’s Forge & Birch Isle', x: -125, z: -80 },
      { name: 'Nimue’s Whispering Sanctuary', x: 95, z: -110 }
    ];

    if (coopPartner && coopPartner.active && coopPartner.mesh) {
      LANDMARKS.unshift({
        name: `${coopPartner.sharkId.toUpperCase()} (Co-op Partner)`,
        x: coopPartner.mesh.position.x,
        z: coopPartner.mesh.position.z
      });
    }

    const fwdX = -Math.sin(camState.yaw);
    const fwdZ = -Math.cos(camState.yaw);

    let closestAim = null;
    let closestAng = 0.28; // ~16 degree cone

    for (const lm of LANDMARKS) {
      const toLmX = lm.x - player.pos.x;
      const toLmZ = lm.z - player.pos.z;
      const dist = Math.hypot(toLmX, toLmZ);
      if (dist < 4.0) continue;

      const normX = toLmX / dist;
      const normZ = toLmZ / dist;
      const dot = fwdX * normX + fwdZ * normZ;
      const angle = Math.acos(Math.max(-1, Math.min(1, dot)));

      if (angle < closestAng) {
        closestAng = angle;
        closestAim = { name: lm.name, dist: Math.round(dist) };
      }
    }

    if (closestAim) {
      labelEl.textContent = `🎯 AIMED AT: ${closestAim.name} (${closestAim.dist}m) · ZOOM: 4.5x`;
      labelEl.style.color = '#facc15';
    } else {
      labelEl.textContent = `🔭 SCANNING ARCHIPELAGO HORIZON · ZOOM: 4.5x`;
      labelEl.style.color = '#38bdf8';
    }
  }

  function collectWorldPickup(pickup) {
    if (!player.inventory || !pickup) return;
    const itemType = pickup.type;
    const count = pickup.count || 1;
    const pickupId = pickup.id;
    const added = player.inventory.addItem(itemType, count);
    if (added > 0) {
      if (worldPickups) worldPickups.collect(pickup);
      if (window.BlahajQuests) {
        if (itemType === 'guano') window.BlahajQuests.recordEvent('pickup_guano', added);
        if (itemType === 'flatpack_crate') window.BlahajQuests.recordEvent('spawning_heist_or_build', added);
      }
      CozyAudio.bistroChime();

      const def = window.BlahajInventory?.ITEMS[itemType] || { name: itemType, icon: '📦' };
      spawnFloatingBurst(player.pos, 0xfacc15, 18);
      showToast(`PICKED UP ${def.name.toUpperCase()}! ${def.icon}✨`, `Added +${added} into Satchel! (Total: ${player.inventory.getItemCount(itemType)})`);
      addChatLog(`${def.icon} Picked up <strong>${def.name}</strong> (+${added} into Satchel, total: ${player.inventory.getItemCount(itemType)}).`, 'cozy');
      updateMetersUI();
      if (typeof window._blahajRenderFinBelt === 'function') window._blahajRenderFinBelt();

      window.BlahajNetwork.send({
        type: 'item_collected',
        id: pickupId,
        itemType: itemType,
        count: added
      });
    } else {
      showToast('SATCHEL FULL! 🎒', 'No room in your satchel for more items!');
    }
  }

  // --- ARCHIPELAGO COMMUNITY TRUNK MODAL LOGIC ---
  function openCommunityTrunkModal() {
    releasePointerLock();
    const modal = document.getElementById('community-trunk-modal');
    if (!modal) return;
    modal.classList.remove('hidden');
    if (communityTrunk) communityTrunk.openLid(true);
    renderCommunityTrunkModal();
  }

  function closeCommunityTrunkModal() {
    const modal = document.getElementById('community-trunk-modal');
    if (!modal) return;
    modal.classList.add('hidden');
    if (communityTrunk) communityTrunk.openLid(false);
    hideInventoryHoverTooltip();
  }

  function renderCommunityTrunkModal() {
    if (!communityTrunk || !player.inventory) return;
    const trunkGrid = document.getElementById('trunk-grid');
    const satchelGrid = document.getElementById('satchel-trunk-grid');
    const trunkCountEl = document.getElementById('trunk-used-count');
    const satchelCountEl = document.getElementById('satchel-used-count');

    const tSlots = communityTrunk.getSlots();
    const totalTrunkSlots = tSlots.length || 24;
    const totalSatchelSlots = player.inventory.numSlots || 36;

    if (trunkCountEl) trunkCountEl.textContent = communityTrunk.slots.filter(Boolean).length;
    if (satchelCountEl) satchelCountEl.textContent = player.inventory.getUsedSlotCount();

    // Render Trunk Grid (24 Slots)
    if (trunkGrid) {
      trunkGrid.innerHTML = '';
      for (let i = 0; i < totalTrunkSlots; i++) {
        const item = tSlots[i];
        const slotEl = document.createElement('div');
        slotEl.className = 'mmo-slot';
        if (item) {
          slotEl.classList.add(`rarity-${item.rarity || 'cozy'}`);
          slotEl.innerHTML = `
            <span class="mmo-slot-icon">${item.icon}</span>
            ${item.qty > 1 ? `<span class="mmo-slot-badge">${item.qty}</span>` : ''}
          `;
          slotEl.addEventListener('mouseenter', (ev) => {
            showInventoryHoverTooltip(item, ev.clientX, ev.clientY, '📦 Click to Withdraw 1× into Your Satchel');
          });
          slotEl.addEventListener('mousemove', (ev) => moveInventoryHoverTooltip(ev.clientX, ev.clientY));
          slotEl.addEventListener('mouseleave', hideInventoryHoverTooltip);
          slotEl.onclick = () => {
            const taken = communityTrunk.withdraw(i, 1, player.inventory);
            if (taken > 0) {
              CozyAudio.coinDrop();
              hideInventoryHoverTooltip();
              renderCommunityTrunkModal();
              updateMetersUI();
              window.BlahajNetwork.send({
                type: 'trunk_sync',
                slots: communityTrunk.getSlots()
              });
            } else {
              showToast('SATCHEL FULL! 🎒', 'No room in your satchel to take this item!');
            }
          };
        } else {
          slotEl.classList.add('empty');
          slotEl.innerHTML = `<span class="mmo-slot-icon" style="opacity: 0.25;">📦</span>`;
        }
        trunkGrid.appendChild(slotEl);
      }
    }

    // Render Satchel Grid (36 Slots)
    if (satchelGrid) {
      satchelGrid.innerHTML = '';
      for (let i = 0; i < totalSatchelSlots; i++) {
        const item = player.inventory.getSlot(i);
        const slotEl = document.createElement('div');
        slotEl.className = 'mmo-slot';
        if (item) {
          slotEl.classList.add(`rarity-${item.rarity || 'cozy'}`);
          slotEl.innerHTML = `
            <span class="mmo-slot-icon">${item.icon}</span>
            ${item.qty > 1 ? `<span class="mmo-slot-badge">${item.qty}</span>` : ''}
          `;
          slotEl.addEventListener('mouseenter', (ev) => {
            showInventoryHoverTooltip(item, ev.clientX, ev.clientY, '🎒 Click to Deposit 1× into Shared Community Trunk');
          });
          slotEl.addEventListener('mousemove', (ev) => moveInventoryHoverTooltip(ev.clientX, ev.clientY));
          slotEl.addEventListener('mouseleave', hideInventoryHoverTooltip);
          slotEl.onclick = () => {
            const deposited = communityTrunk.deposit(item.id, 1, player.inventory);
            if (deposited > 0) {
              CozyAudio.coinDrop();
              hideInventoryHoverTooltip();
              renderCommunityTrunkModal();
              updateMetersUI();
              window.BlahajNetwork.send({
                type: 'trunk_sync',
                slots: communityTrunk.getSlots()
              });
            } else {
              showToast('TRUNK FULL! 📦', 'The Community Trunk is full! Remove something first.');
            }
          };
        } else {
          slotEl.classList.add('empty');
          slotEl.innerHTML = `<span class="mmo-slot-icon" style="opacity: 0.25;">🎒</span>`;
        }
        satchelGrid.appendChild(slotEl);
      }
    }
  }

  // --- BIRB DOWN PLUCKING ---
  function pluckBirbDown(birb) {
    if (!birb || !player.inventory) return;
    birb.downGathered = true;
    player.inventory.addItem('birb_down', 1);
    CozyAudio.birbChirp();
    spawnFloatingBurst(birb.mesh.position, 0x60a5fa, 16);
    showToast('GENTLY GATHERED BIRB DOWN! 🪶✨', `Plucked soft down from sleeping birb! (Total: ${player.inventory.getItemCount('birb_down')})`);
    addChatLog('🪶 Gently gathered cloud-soft <strong>Soft Birb Down</strong> from a sleeping meadow birb! Nimue can spin this into fuses.', 'cozy');
    updateMetersUI();
  }

  // --- ARTISANAL SHARK CRAFTING ---
  function craftStarPowderAtSolomon() {
    closeDialogueModal();
    if (!player.inventory) return;
    if (player.inventory.hasItem('guano', 1) && player.inventory.hasItem('sulfur', 1)) {
      player.inventory.removeItem('guano', 1);
      player.inventory.removeItem('sulfur', 1);
      player.inventory.addItem('star_powder', 1);
      CozyAudio.bistroChime();
      spawnFloatingBurst(player.pos, 0xfacc15, 24);
      showToast('STAR POWDER SYNTHESIZED! 🎆✨', 'Solomon roasted Guano & Sulfur in his oven into Pyrotechnic Star Powder!');
      addChatLog('🎆 Solomon blended nitrate saltpeter and volcanic brimstone: <strong>+1 Pyrotechnic Star Powder</strong> crafted!', 'cozy');
      updateMetersUI();
    } else {
      showToast('MISSING MATERIALS 🧪', 'Solomon needs 1x Birb Guano (from Birbs after Breb) and 1x Volcanic Sulfur!');
    }
  }

  function craftMortarAtHiram() {
    closeDialogueModal();
    if (!player.inventory) return;
    let crafted = false;
    if (player.inventory.hasItem('driftwood', 2)) {
      player.inventory.removeItem('driftwood', 2);
      crafted = true;
    } else if (player.inventory.hasItem('pure_obsidian', 1)) {
      player.inventory.removeItem('pure_obsidian', 1);
      crafted = true;
    }
    if (crafted) {
      player.inventory.addItem('mortar_tube', 1);
      CozyAudio.allenBuild();
      spawnFloatingBurst(player.pos, 0xca8a04, 24);
      showToast('LAUNCH MORTAR CARVED! 🪵✨', 'Hiram lathed dense timber and banded it with brass rings!');
      addChatLog('🪵 Hiram precision-turned heavy timber into a reinforced <strong>Hardwood Launch Mortar</strong>!', 'cozy');
      updateMetersUI();
    } else {
      showToast('MISSING MATERIALS 🪵', 'Hiram needs 2x Beach Driftwood (found along the shores) or 1x Pure Obsidian Shard!');
    }
  }

  function craftFuseAtNimue() {
    closeDialogueModal();
    if (!player.inventory) return;
    let crafted = false;
    if (player.inventory.hasItem('birb_down', 2)) {
      player.inventory.removeItem('birb_down', 2);
      crafted = true;
    } else if (player.inventory.hasItem('plush_fluff', 2)) {
      player.inventory.removeItem('plush_fluff', 2);
      crafted = true;
    }
    if (crafted) {
      player.inventory.addItem('braided_fuse', 1);
      CozyAudio.portalChime();
      spawnFloatingBurst(player.pos, 0xec4899, 24);
      showToast('STAR FUSE BRAIDED! 🧵✨', 'Nimue spun soft down fibers into a slow-burning twisted star fuse!');
      addChatLog('🧵 Nimue braided fine down and starlight silk: <strong>+1 Twisted Star Fuse</strong> crafted!', 'cozy');
      updateMetersUI();
    } else {
      showToast('MISSING MATERIALS 🪶', 'Nimue needs 2x Soft Birb Down (gathered from sleeping Birbs) or 2x Plush Fluff (from grooming)!');
    }
  }

  function assembleAndLaunchFireworks() {
    if (!player.inventory) return;
    if (player.inventory.hasItem('star_powder', 1) && player.inventory.hasItem('mortar_tube', 1) && player.inventory.hasItem('braided_fuse', 1)) {
      player.inventory.removeItem('star_powder', 1);
      player.inventory.removeItem('mortar_tube', 1);
      player.inventory.removeItem('braided_fuse', 1);
      player.inventory.addItem('firework_rocket', 1);
      showToast('ROCKET ASSEMBLED! 🚀✨', "Assembled Helen's Birthday Star Rocket from all 3 shark crafts!");
      addChatLog("🚀 Synthesized powder, mortar shell, and star fuse into <strong>Helen's Birthday Star Rocket</strong>!", 'cozy');
      updateMetersUI();
      setTimeout(() => launchHelenBirthdayFireworks(), 800);
    } else {
      showToast('MISSING PYROTECHNIC PARTS 🎆', 'Need 1x Star Powder (Solomon), 1x Launch Mortar (Hiram), and 1x Star Fuse (Nimue)!');
    }
  }

  function launchHelenBirthdayFireworks(isRemote = false) {
    if (!isRemote) {
      if (player.inventory && player.inventory.hasItem('firework_rocket', 1)) {
        player.inventory.removeItem('firework_rocket', 1);
        updateMetersUI();
      }
      if (window.BlahajQuests) window.BlahajQuests.recordEvent('firework_launched', 1);
      window.BlahajNetwork.send({ type: 'firework_launch' });
    }
    CozyAudio.fireworkWhistle();

    // Spawn 3D ascending rocket from Endless Pier tip
    const startPos = new THREE.Vector3(48.0, 2.5, 76.0);
    const rocketMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.16, 0.9, 8),
      new THREE.MeshStandardMaterial({ color: 0xf43f5e, emissive: 0xfacc15, emissiveIntensity: 0.8 })
    );
    rocketMesh.position.copy(startPos);
    scene.add(rocketMesh);

    const rocketLight = new THREE.PointLight(0xfacc15, 2.0, 15.0);
    rocketLight.position.copy(startPos);
    scene.add(rocketLight);

    const rObj = {
      mesh: rocketMesh,
      light: rocketLight,
      pos: startPos.clone(),
      vel: new THREE.Vector3(-0.25, 22.0, -0.4),
      life: 2.2
    };
    activeRockets.push(rObj);

    showToast('FUSE IGNITED! 🎆✨', "Helen's Birthday Star Rocket whistling high into the night sky!");

    setTimeout(() => {
      // Detonate at peak
      CozyAudio.fireworkBoom();
      triggerGrandFireworkDetonation(rObj.pos);
    }, 2200);
  }

  function triggerGrandFireworkDetonation(burstPos) {
    // 1. Massive Flash Light
    const flash = new THREE.PointLight(0xff69b4, 12.0, 120.0);
    flash.position.copy(burstPos);
    scene.add(flash);
    setTimeout(() => { if (flash.parent) flash.parent.remove(flash); }, 1400);

    // 2. Multi-color spark bursts
    const colors = [0xf43f5e, 0xfb7185, 0xa855f7, 0xfacc15, 0x38bdf8, 0xffffff];
    colors.forEach((col, idx) => {
      setTimeout(() => {
        spawnFloatingBurst(burstPos, col, 45);
      }, idx * 120);
    });

    // 3. Heart constellation in the sky
    const heartOffsets = [
      [0, 0], [-1.5, 2.0], [1.5, 2.0], [-3.0, 3.5], [3.0, 3.5],
      [-2.5, 5.0], [2.5, 5.0], [-1.0, 5.8], [1.0, 5.8], [0, 4.8]
    ];
    heartOffsets.forEach(([hx, hy]) => {
      const hPos = new THREE.Vector3(burstPos.x + hx * 2.2, burstPos.y + hy * 2.2, burstPos.z);
      spawnFloatingBurst(hPos, 0xf43f5e, 18);
    });

    showToast('💖 HAPPY BIRTHDAY HELEN! 💖', 'Grand Starlight Peony & Heart Constellation illuminate Blåhaj Island!');
    addChatLog('🎆💖 <strong>HAPPY BIRTHDAY HELEN!</strong> The Grand Celebration Rocket detonated in rose-gold peonies, cascading willow starlight, and glowing celestial hearts over the ocean!', 'lore');
    completeQuest('q-sw-fireworks');
  }

  function popBirthdayCracker(boothIndex) {
    if (!window.BlahajSphericalFoods) return;
    window.BlahajSphericalFoods.popBirthdayCracker(player.pos);
    CozyAudio.birthdayHorn();
    spawnFloatingBurst(player.pos, 0xfbbf24, 32);
    spawnFloatingBurst(player.pos, 0xec4899, 24);

    player.teaComfort = 100;
    updateMetersUI();

    showToast("JOYEUX ANNIVERSAIRE, HÉLÈNE! 🎉✨", "Party cracker popped with golden streamers & confetti!");
    addChatLog("🎉 <em>Happy Birthday Helen!</em> You popped a festive golden party cracker at Spherical Foods! Confetti and golden streamers fill the room!", 'cozy');

    window.BlahajNetwork.send({
      type: 'bistro_cracker',
      boothIndex: boothIndex || (player.isSeatedInBooth ? player.seatedBoothIndex : 0),
      pos: { x: player.pos.x, y: player.pos.y, z: player.pos.z }
    });
  }

  function eatServedDish(boothIndex) {
    if (!window.BlahajSphericalFoods) return;
    if (boothIndex === undefined || boothIndex === null || boothIndex < 0) {
      boothIndex = player.isSeatedInBooth ? player.seatedBoothIndex : 0;
    }
    const result = window.BlahajSphericalFoods.eatServedDish(boothIndex);
    if (!result) return;

    CozyAudio.eatChomp();
    spawnFloatingBurst(player.pos, result.isHelensCake ? 0xfbbf24 : 0xec4899, 28);

    player.teaComfort = 100;
    player.warmth = 100;
    updateMetersUI();

    if (result.isHelensCake) {
      player.helenBirthdayJoy = 600;
      showToast("JOYEUX ANNIVERSAIRE, HELEN! 🎂✨", "Sweet raspberry-rose & gold stars! (Comfort & Warmth Maxed + Birthday Joy!)");
      addChatLog("🎂 <em>Happy Birthday Helen!</em> You feasted on <strong>Helen's Celestial Birthday Bombe</strong> at the velvet booth. Golden sparkles and raspberry warmth fill your heart (+100% Comfort, +100% Warmth, Birthday Joy buff)!", 'cozy');
    } else {
      showToast("FEASTED TO PERFECTION! 🍴✨", `Enjoyed delicious ${result.title}! Perfectly spherical.`);
      addChatLog(`🍴 Feasted on <strong>${result.title}</strong> at the velvet banquette. Flawlessly spherical!`, 'cozy');
    }

    window.BlahajNetwork.send({
      type: 'bistro_eat',
      boothIndex: boothIndex,
      dishKey: result.dishKey || 'cake_slice',
      title: result.title,
      isHelensCake: !!result.isHelensCake
    });
  }

  function openSphericalFoodsMenuModal() {
    CozyAudio.bistroChime();
    const isWeek = window.BlahajSphericalFoods && window.BlahajSphericalFoods.isHelensBirthdayWeek();
    const targetBooth = (player.isSeatedInBooth && player.seatedBoothIndex >= 0) ? player.seatedBoothIndex : 0;

    const actions = [
      ...(isWeek ? [{
        label: "🎉 POP BOOTH PARTY CRACKER! 🎊",
        className: 'btn-secondary',
        onClick: () => {
          popBirthdayCracker(targetBooth);
        }
      }] : []),
      {
        label: isWeek ? "✨ ORDER: Helen's Birthday Bombe (Oct 24 Week Special!) 🎂" : "Helen's Birthday Bombe (Reserved for Oct 24) 🎂",
        className: 'btn-accent',
        onClick: () => {
          closeDialogueModal();
          orderSphericalDish(targetBooth, 'helen_cake');
        }
      },
      {
        label: 'Order Lava Lychee & Truffle Mac Spheres! 🧆🍄',
        className: 'btn-primary',
        onClick: () => {
          closeDialogueModal();
          orderSphericalDish(targetBooth, 'mac_spheres');
        }
      },
      {
        label: 'Order Miso Ramen & Steamed Bao Spheres! 🍜🥟',
        className: 'btn-primary',
        onClick: () => {
          closeDialogueModal();
          orderSphericalDish(targetBooth, 'ramen_spheres');
        }
      },
      {
        label: 'Order Strawberry Mochi & Matcha Tiramisphere! 🍓🍵',
        className: 'btn-secondary',
        onClick: () => {
          closeDialogueModal();
          orderSphericalDish(targetBooth, 'mochi_spheres');
        }
      }
    ];

    openDialogueModal({
      speaker: 'Monsieur Betterave',
      role: 'PROPRIÉTAIRE · SPHERICAL FOODS BISTRO',
      portrait: 'assets/gallery/Spherical-Foods.png',
      text: isWeek
        ? '“Bienvenue, mes amis! It is the most auspicious week of the year—Helen’s Birthday on October 24th! By unanimous decree of our culinary brigade, no flat food or flat cake is permitted. Our grand feature today is Helen’s Celestial Birthday Bombe. What may I wheel over to your table?”'
        : '“Bienvenue to Spherical Foods! Every dish here is handcrafted into a flawless sphere—from savory arancini to sweet melon pearls. What spherical delicacy tempts your palate?”',
      actions: actions
    });
  }

  function openDialogueModal({ speaker, role, portrait, text, customHtml, actions }) {
    releasePointerLock();
    document.getElementById('dlg-speaker').textContent = speaker;
    document.getElementById('dlg-role').textContent = role;
    document.getElementById('dlg-portrait').src = portrait;
    document.getElementById('dlg-text').textContent = text;

    const customArea = document.getElementById('dlg-custom-area');
    if (customHtml) {
      customArea.innerHTML = customHtml;
      customArea.classList.remove('hidden');
    } else {
      customArea.innerHTML = '';
      customArea.classList.add('hidden');
    }

    const actContainer = document.getElementById('dlg-actions');
    actContainer.innerHTML = '';
    (actions || []).forEach((a) => {
      const b = document.createElement('button');
      b.className = a.className || 'btn-primary';
      b.textContent = a.label;
      b.addEventListener('click', a.onClick);
      actContainer.appendChild(b);
    });

    const closeBtn = document.createElement('button');
    closeBtn.className = 'btn-secondary';
    closeBtn.textContent = 'Close';
    closeBtn.addEventListener('click', closeDialogueModal);
    actContainer.appendChild(closeBtn);

    document.getElementById('dialogue-modal').classList.remove('hidden');
  }

  function closeDialogueModal() {
    document.getElementById('dialogue-modal').classList.add('hidden');
  }

  function openPierNotesModal() {
    const renderNotesList = () =>
      pierNotes
        .map((n) => `<div class="pier-note-item"><strong>${n.author}:</strong> ${n.text}</div>`)
        .join('');

    openDialogueModal({
      speaker: 'The Endless Pier to Erf',
      role: 'DIFFERENT SHORES · SAME OCEAN · LOVE TRAVELS DEEPER',
      portrait: 'assets/gallery/Wedding-1.png',
      text: 'This lantern-lit pier stretches into the starry mist between Blåhaj Island, Los Angeles, and New Zealand. Leave a note in a Sacred Tea Bottle for your partner to find:',
      customHtml: `
        <div class="pier-notes-box" id="pier-notes-list">${renderNotesList()}</div>
        <div class="pier-input-row">
          <input type="text" id="pier-note-input" placeholder="Write a message across the ocean..." maxlength="160" />
          <button class="btn-primary" id="btn-save-pier-note">Bottle Note 💌</button>
        </div>
      `,
      actions: []
    });

    setTimeout(() => {
      const btn = document.getElementById('btn-save-pier-note');
      const inp = document.getElementById('pier-note-input');
      if (btn && inp) {
        btn.addEventListener('click', () => {
          const val = inp.value.trim();
          if (!val) return;
          const noteObj = {
            author: `${LORE.sharks[player.sharkId].name}`,
            text: val
          };
          pierNotes.push(noteObj);
          savePierNotes();
          document.getElementById('pier-notes-list').innerHTML = renderNotesList();
          inp.value = '';
          CozyAudio.portalChime();
          window.BlahajNetwork.send({ type: 'pier_note', note: noteObj });
          showToast('BOTTLE SET ADRIFT', 'Your note is preserved on the Endless Pier!');
        });
      }
    }, 30);
  }

  function togglePortalModal() {
    const m = document.getElementById('portal-modal');
    const willOpen = m.classList.contains('hidden');
    if (willOpen) releasePointerLock();
    m.classList.toggle('hidden');
  }

  function openGalleryArtwork(src, title, desc) {
    releasePointerLock();
    clearAllMovementKeys();
    const m = document.getElementById('gallery-modal');
    if (m) {
      if (src) document.getElementById('gallery-main-img').src = src;
      if (title) document.getElementById('gallery-main-title').textContent = title;
      if (desc) document.getElementById('gallery-main-desc').textContent = desc;
      m.classList.remove('hidden');
    }
  }

  function toggleGalleryModal() {
    const m = document.getElementById('gallery-modal');
    const willOpen = m.classList.contains('hidden');
    if (willOpen) releasePointerLock();
    m.classList.toggle('hidden');
  }

  // Additional Co-op Peers (for 3+ players in the Shared World, e.g. Russell, Helen & Argon!)
  const extraCoopPeers = new Map();

  function removeExtraCoopPeer(remClientId) {
    const peerObj = extraCoopPeers.get(remClientId);
    if (!peerObj) return;
    if (peerObj.mesh && peerObj.mesh.parent) {
      peerObj.mesh.parent.remove(peerObj.mesh);
    }
    if (peerObj.labelEl) {
      peerObj.labelEl.remove();
    }
    extraCoopPeers.delete(remClientId);
  }

  function upsertExtraCoopPeer(data) {
    const remId = data.clientId;
    if (!remId) return;
    let peerObj = extraCoopPeers.get(remId);
    const sharkId = data.sharkId || (peerObj && peerObj.sharkId) || 'solomon';
    const cfg = LORE.sharks[sharkId] || LORE.sharks.solomon;
    const mVal = typeof data.mange === 'number' ? data.mange : (peerObj && peerObj.mangeFactor !== undefined ? peerObj.mangeFactor : 0.70);

    if (!peerObj) {
      peerObj = {
        clientId: remId,
        machineId: data.machineId || null,
        sharkId: cfg.id,
        mangeFactor: mVal,
        mesh: null,
        labelEl: null,
        targetPos: new THREE.Vector3(typeof data.x === 'number' ? data.x : 58, typeof data.y === 'number' ? data.y : 3.9, typeof data.z === 'number' ? data.z : -10),
        targetRotY: data.rotY || 0,
        isMoving: !!data.isMoving,
        inBoat: !!data.inBoat,
        inCart: !!data.inCart,
        zone: (!data.zone || data.zone === 'overworld') ? 'island' : data.zone,
        activePostureId: data.activePostureId || null,
        isLounging: !!data.isLounging,
        isSeatedInBooth: !!data.isSeatedInBooth,
        isPlayingPlushie: !!data.isPlayingPlushie,
        heldItemId: data.heldItemId || null,
        lastSeen: Date.now()
      };
      extraCoopPeers.set(remId, peerObj);
    }

    peerObj.lastSeen = Date.now();
    if (!peerObj.mesh || peerObj.sharkId !== cfg.id) {
      peerObj.sharkId = cfg.id;
      peerObj.mangeFactor = mVal;
      if (peerObj.mesh && peerObj.mesh.parent) peerObj.mesh.parent.remove(peerObj.mesh);
      peerObj.mesh = window.BlahajModels.createPlushShark(cfg, mVal);
      peerObj.mesh.position.copy(peerObj.targetPos);
      getActiveScene().add(peerObj.mesh);
      if (peerObj.heldItemId && window.BlahajSharks3D && window.BlahajSharks3D.attachHeldItem) {
        window.BlahajSharks3D.attachHeldItem(peerObj.mesh, peerObj.heldItemId);
      }
    } else if (Math.abs((peerObj.mangeFactor || 0) - mVal) > 0.005) {
      peerObj.mangeFactor = mVal;
      if (window.BlahajModels && typeof window.BlahajModels.updateSharkMange === 'function') {
        window.BlahajModels.updateSharkMange(peerObj.mesh, mVal);
      }
    }

    if (!peerObj.labelEl) {
      peerObj.labelEl = createWorldLabel(
        document.getElementById('world-labels'),
        `${cfg.name} (Shared World)`,
        '★ FELLOW ISLAND SHARK'
      );
    } else {
      const nm = peerObj.labelEl.querySelector('.npc-name');
      if (nm) nm.textContent = `${cfg.name} (Shared World)`;
    }

    const prevZone = peerObj.zone || 'island';
    const nextZone = (!data.zone || data.zone === 'overworld') ? 'island' : data.zone;
    peerObj.zone = nextZone;
    if (typeof data.x === 'number' && typeof data.z === 'number') {
      peerObj.targetPos.set(data.x, typeof data.y === 'number' ? data.y : 0, data.z);
    }
    if (typeof data.rotY === 'number') peerObj.targetRotY = data.rotY;
    peerObj.isMoving = !!data.isMoving;
    peerObj.activePostureId = data.activePostureId || null;
    peerObj.isLounging = !!data.isLounging;
    peerObj.isSeatedInBooth = !!data.isSeatedInBooth;
    peerObj.isPlayingPlushie = !!data.isPlayingPlushie;

    if (peerObj.mesh && peerObj.heldItemId !== data.heldItemId) {
      peerObj.heldItemId = data.heldItemId || null;
      if (window.BlahajSharks3D && window.BlahajSharks3D.attachHeldItem) {
        window.BlahajSharks3D.attachHeldItem(peerObj.mesh, peerObj.heldItemId);
      }
    }

    if (peerObj.mesh && (prevZone !== nextZone || peerObj.mesh.position.distanceTo(peerObj.targetPos) > 20)) {
      peerObj.mesh.position.copy(peerObj.targetPos);
      peerObj.mesh.rotation.y = peerObj.targetRotY || 0;
    }
  }

  /** Resolve the remote 3D shark mesh for a network packet (supports primary partner and extra peers). */
  function resolvePeerMesh(data) {
    if (shouldRouteToPrimaryPartner(data)) {
      return coopPartner.mesh || null;
    }
    const peerObj = data && data.clientId ? extraCoopPeers.get(data.clientId) : null;
    return (peerObj && peerObj.mesh) ? peerObj.mesh : null;
  }

  function shouldRouteToPrimaryPartner(data) {
    if (!data || !data.clientId) return true;
    const myMach = window.BlahajNetwork && window.BlahajNetwork.getMachineId ? window.BlahajNetwork.getMachineId() : null;
    const isCrossMachine = !!(data.machineId && myMach && data.machineId !== myMach);

    // 1. Always prioritize a cross-machine partner or same partner machine after a page refresh (0ms delay!)
    if (
      isCrossMachine ||
      (data.machineId && coopPartner.machineId && data.machineId === coopPartner.machineId) ||
      !coopPartner.active ||
      !coopPartner.clientId ||
      coopPartner.clientId === data.clientId
    ) {
      if (coopPartner.clientId && coopPartner.clientId !== data.clientId) {
        removeExtraCoopPeer(data.clientId);
      }
      coopPartner.clientId = data.clientId;
      if (data.machineId) coopPartner.machineId = data.machineId;
      return true;
    }

    // 2. If primary partner hasn't sent a packet in >2.5s, allow immediate takeover
    if (coopPartner.lastPacketAt && Date.now() - coopPartner.lastPacketAt > 2500) {
      coopPartner.clientId = data.clientId;
      coopPartner.machineId = data.machineId || null;
      removeExtraCoopPeer(data.clientId);
      return true;
    }

    return false;
  }
  function updateBlueSharkVisibility() {
    worldActors.forEach((actor) => {
      if (actor.isBlueShark) {
        const isTaken =
          actor.id === player.sharkId || (coopPartner.active && actor.id === coopPartner.sharkId);
        actor.mesh.visible = !isTaken;
        if (actor.labelEl) {
          actor.labelEl.style.display = isTaken ? 'none' : 'block';
        }
      }
    });
  }

  const ZONE_DISPLAY_NAMES = {
    island: 'Main Island',
    spherical_foods: 'Chez Betterave Bistro',
    laundromat: 'The Laundromat',
    volcano: 'Mount Blåhaj Volcano',
    sea_cave: 'Starlight Sea-Cave Grotto',
    spawning_pits: 'IKEA Spawning Pits',
    volleyball: 'Crescent Beach Volleyball',
    space: 'Deep Space Orbit',
    cheese_moon: 'Swiss Cheese Planetoid'
  };

  function getZoneFriendlyName(z) {
    return ZONE_DISPLAY_NAMES[z || 'island'] || 'Main Island';
  }

  function teleportToCoopPartner() {
    if (!coopPartner.active) {
      CozyAudio.portalChime();
      if (window.BlahajNetwork && typeof window.BlahajNetwork.forceReconnect === 'function') {
        window.BlahajNetwork.forceReconnect();
      }
      showToast('SCANNING SHARED WORLD… 🌌', 'Re-probing all realm slots to link up with your partner!');
      return;
    }

    const pModal = document.getElementById('portal-modal');
    if (pModal && !pModal.classList.contains('hidden')) {
      pModal.classList.add('hidden');
    }

    const targetZone = coopPartner.zone || 'island';
    const pPos = coopPartner.targetPos;
    const partnerName = (LORE.sharks[coopPartner.sharkId] && LORE.sharks[coopPartner.sharkId].name) || 'Partner';

    const snapBesidePartner = () => {
      const offsetAngle = (coopPartner.targetRotY || 0) + Math.PI * 0.5;
      const tx = pPos.x + Math.sin(offsetAngle) * 2.1;
      const tz = pPos.z + Math.cos(offsetAngle) * 2.1;
      const ty = (currentZone === 'island' && worldApi)
        ? Math.max(pPos.y, worldApi.getGroundAndStructureHeight(tx, tz))
        : pPos.y;
      player.inBoat = !!coopPartner.inBoat;
      player.pos.set(tx, ty, tz);
      player.rotY = Math.atan2(pPos.x - tx, pPos.z - tz);
      camState.yaw = Math.atan2(-Math.sin(player.rotY), -Math.cos(player.rotY));
      player.velY = 0;
      player.isGrounded = true;
      if (player.mesh) {
        player.mesh.position.copy(player.pos);
        player.mesh.rotation.y = player.rotY;
      }
      hasMovedInSession = true;
      captureSavePoint(true);
      updateCoopPartnerVisibility();
      CozyAudio.portalChime();
      spawnFloatingBurst(player.pos, 0x52f29c, 22);
      spawnFloatingBurst(player.pos, 0xff7eb6, 18);
      showToast('JOINED YOUR PARTNER! 🦈💕🦈', `Warped directly beside ${partnerName} in ${getZoneFriendlyName(targetZone)}!`);
      addChatLog(`✨ <strong>Shared World Warp:</strong> Teleported directly beside <strong>${partnerName}</strong> in <em>${getZoneFriendlyName(targetZone)}</em>!`, 'coop');
    };

    if (currentZone === targetZone) {
      snapBesidePartner();
      return;
    }

    if (targetZone === 'island') {
      if (currentZone === 'laundromat') exitLaundromat();
      else if (currentZone === 'spherical_foods') exitSphericalFoods();
      else if (currentZone === 'volcano') exitVolcanoTrial();
      else if (currentZone === 'sea_cave') exitSeaCaveGrotto();
      else if (currentZone === 'spawning_pits') exitSpawningPits();
      else if (currentZone === 'volleyball') exitVolleyballCourt();
      setTimeout(snapBesidePartner, 650);
    } else if (targetZone === 'laundromat') {
      enterLaundromat();
      setTimeout(snapBesidePartner, 650);
    } else if (targetZone === 'spherical_foods') {
      enterSphericalFoods();
      setTimeout(snapBesidePartner, 650);
    } else if (targetZone === 'volcano') {
      enterVolcanoTrial();
      setTimeout(snapBesidePartner, 650);
    } else if (targetZone === 'sea_cave') {
      enterSeaCaveGrotto();
      setTimeout(snapBesidePartner, 650);
    } else {
      snapBesidePartner();
    }
  }

  function broadcastSharedWorldState() {
    if (!window.BlahajNetwork) return;

    const saveSys = window.BlahajSaveSystem;
    const inLobbyNow = !!(saveSys && typeof saveSys.isInLobby === 'function' && saveSys.isInLobby());
    const myPlayerName = (saveSys && typeof saveSys.getMyAccountDisplayName === 'function')
      ? saveSys.getMyAccountDisplayName()
      : (LORE.sharks[player.sharkId]?.name || 'Founder');

    if (!inLobbyNow) {
      window.BlahajNetwork.send({
        type: 'character_claim',
        sharkId: player.sharkId,
        playerName: myPlayerName
      });

      window.BlahajNetwork.send({
        type: 'shark_swap',
        sharkId: player.sharkId,
        playerName: myPlayerName,
        mange: window.__BLAHAJ_MANGE__
      });

      window.BlahajNetwork.send({
        type: 'move',
        sharkId: player.sharkId,
        playerName: myPlayerName,
        x: player.pos.x,
        y: player.pos.y,
        z: player.pos.z,
        rotY: player.rotY,
        isMoving: false,
        inBoat: !!player.inBoat,
        inCart: !!player.inCart,
        cartId: player.cartId || null,
        zone: currentZone || 'island',
        mange: window.__BLAHAJ_MANGE__,
        heldItemId: playerHeldItem ? playerHeldItem.id : null,
        isLounging: !!player.isLounging,
        loungeChairId: player.loungeChairId || null
      });
    }

    if (saveSys && typeof saveSys.ensureCharacterRoster === 'function') {
      const roster = saveSys.ensureCharacterRoster();
      window.BlahajNetwork.send({
        type: 'roster_sync',
        sharkId: player.sharkId,
        record: roster[player.sharkId] || null,
        allRecords: {
          hermes: roster.hermes || null,
          solomon: roster.solomon || null,
          hiram: roster.hiram || null,
          nimue: roster.nimue || null
        }
      });
    }

    if (worldApi && worldApi.getBuiltStructures().length > 0) {
      const items = worldApi.getBuiltStructures().map((s) => ({
        id: s.id,
        type: s.type,
        x: s.x,
        y: s.y,
        z: s.z,
        rotY: s.rotY,
        builder: s.builder
      }));
      window.BlahajNetwork.send({ type: 'build_sync', items });
    }

    if (worldPickups) {
      const droppedItems = worldPickups.getPickups()
        .filter((p) => !p.isStatic && !p.collected)
        .map((p) => ({
          id: p.id,
          itemType: p.type,
          pos: p.pos,
          count: p.count
        }));
      if (droppedItems.length > 0) {
        window.BlahajNetwork.send({
          type: 'pickups_sync',
          items: droppedItems
        });
      }
    }

    if (communityTrunk && typeof communityTrunk.getSlots === 'function') {
      window.BlahajNetwork.send({
        type: 'trunk_sync',
        slots: communityTrunk.getSlots()
      });
    }

    if (window.BlahajVolleyball && window.BlahajVolleyball.isMatchActive()) {
      window.BlahajVolleyball.broadcastMatchSync(true);
    }

    if (window.BlahajSeam && typeof window.BlahajSeam.getSyncState === 'function') {
      window.BlahajNetwork.send({
        type: 'seam_sync',
        state: window.BlahajSeam.getSyncState()
      });
    }

    if (islandClaims && Object.keys(islandClaims).length > 0) {
      window.BlahajNetwork.send({
        type: 'island_claims_sync',
        claims: islandClaims
      });
    }

    if (Array.isArray(pierNotes) && pierNotes.length > 0) {
      window.BlahajNetwork.send({
        type: 'pier_notes_sync',
        notes: pierNotes
      });
    }
  }

  function setupNetwork() {
    const copyBtn = document.getElementById('btn-copy-tunnel-url');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        const inp = document.getElementById('tunnel-share-url');
        if (inp && inp.value) {
          navigator.clipboard?.writeText(inp.value);
          inp.select();
          CozyAudio.portalChime();
          showToast('INVITE LINK COPIED! 📋', 'Send this link to Helen on Discord to auto-connect together!');
        }
      });
    }

    const newRoomBtn = document.getElementById('btn-new-private-room');
    if (newRoomBtn) {
      newRoomBtn.addEventListener('click', () => {
        const newCode = window.BlahajNetwork.generatePrivateRoom();
        CozyAudio.portalChime();
        showToast('PRIVATE INSTANCE CREATED! 🎲', `Switched to temporary instance ${newCode}! Click "Return to Shared World" anytime to rejoin SHONK-LOVE.`);
        addChatLog(`🎲 Switched to temporary private instance <strong>${newCode}</strong>.`, 'system');
      });
    }

    const resetRealmBtn = document.getElementById('btn-reset-home-realm');
    if (resetRealmBtn) {
      resetRealmBtn.addEventListener('click', () => {
        CozyAudio.portalChime();
        if (window.BlahajNetwork && typeof window.BlahajNetwork.resetToHomeRealm === 'function') {
          window.BlahajNetwork.resetToHomeRealm();
        }
        showToast('RETURNED TO SHARED HOME WORLD! 🏠🌍', 'Back in the permanent shared world (SHONK-LOVE)!');
        addChatLog('🏠 <strong>Shared World:</strong> Returned to canonical home realm <strong>SHONK-LOVE</strong>.', 'coop');
      });
    }

    const hudTpBtn = document.getElementById('btn-party-teleport');
    if (hudTpBtn) {
      hudTpBtn.addEventListener('click', () => {
        teleportToCoopPartner();
      });
    }

    const modalTpBtn = document.getElementById('btn-modal-teleport-partner');
    if (modalTpBtn) {
      modalTpBtn.addEventListener('click', () => {
        teleportToCoopPartner();
      });
    }

    const relinkBtn = document.getElementById('btn-relink-portal');
    if (relinkBtn) {
      relinkBtn.addEventListener('click', () => {
        CozyAudio.portalChime();
        if (window.BlahajNetwork && typeof window.BlahajNetwork.forceReconnect === 'function') {
          window.BlahajNetwork.forceReconnect();
        }
        showToast('PORTAL RE-LINKING! ⚡', 'Cleared stale sockets and re-probing all 6 shared world slots!');
        addChatLog('⚡ <strong>Portal Gateway:</strong> Re-linking connection and re-probing peer slots.', 'system');
      });
    }

    const hostBtn = document.getElementById('btn-host-portal');
    if (hostBtn) {
      hostBtn.addEventListener('click', () => {
        const inp = document.getElementById('host-room-code');
        const code = inp ? inp.value : '';
        CozyAudio.portalChime();
        window.BlahajNetwork.setRoom(code);
        showToast('PORTAL INSTANCE SET 🌌', `Switched to ${code.trim().toUpperCase()}!`);
      });
    }

    const joinBtn = document.getElementById('btn-join-portal');
    if (joinBtn) {
      joinBtn.addEventListener('click', () => {
        const inp = document.getElementById('join-room-code') || document.getElementById('host-room-code');
        const code = inp ? inp.value : '';
        CozyAudio.portalChime();
        window.BlahajNetwork.setRoom(code);
        showToast('STEPPED THROUGH PORTAL 🌌', `Joined ${code.trim().toUpperCase()}!`);
      });
    }

    window.BlahajNetwork.init({
      onConnect(info) {
        CozyAudio.portalChime();
        const st = info && info.partnerState;
        const partnerShark = (st && st.sharkId) || coopPartner.sharkId || 'solomon';
        if (!coopPartner.active || !coopPartner.clientId) {
          coopPartner.clientId = (info && info.partnerClientId) || null;
          coopPartner.machineId = (info && info.partnerMachineId) || null;
          if (st && typeof st.x === 'number' && typeof st.z === 'number') {
            coopPartner.targetPos.set(st.x, typeof st.y === 'number' ? st.y : 0, st.z);
            coopPartner.targetRotY = st.rotY || 0;
            coopPartner.zone = (!st.zone || st.zone === 'overworld') ? 'island' : st.zone;
          }
          spawnCoopPartnerShark(partnerShark, st && typeof st.mange === 'number' ? st.mange : undefined);
        }
        showToast('SHARED WORLD LINKED! 🦈💕🦈', 'Connected across the ocean! Click [✨ Join] on the top-left HUD anytime to warp to your partner!');
        addChatLog('🌌 <strong>Shared World Linked:</strong> You and your partner are in the same persistent world! Click <strong>[✨ Join]</strong> on the top-left HUD to warp to their side anytime.', 'coop');
        broadcastSharedWorldState();
      },
      onPeerDisconnect(remClientId) {
        if (window.BlahajSaveSystem && typeof window.BlahajSaveSystem.updateRemoteCharacterLock === 'function') {
          window.BlahajSaveSystem.updateRemoteCharacterLock(null, remClientId, null, true);
        }
        if (remClientId && extraCoopPeers.has(remClientId)) {
          removeExtraCoopPeer(remClientId);
        }
        if (remClientId && coopPartner.clientId === remClientId) {
          coopPartner.clientId = null;
          coopPartner.machineId = null;
        }
      },
      onData(data) {
        if (data.type === 'character_claim') {
          if (window.BlahajSaveSystem && typeof window.BlahajSaveSystem.updateRemoteCharacterLock === 'function') {
            window.BlahajSaveSystem.updateRemoteCharacterLock(data.sharkId, data.clientId, data.playerName || 'Partner', false);
          }
          if (data.sharkId) {
            spawnCoopPartnerShark(data.sharkId);
          }
          return;
        } else if (data.type === 'character_release') {
          if (window.BlahajSaveSystem && typeof window.BlahajSaveSystem.updateRemoteCharacterLock === 'function') {
            window.BlahajSaveSystem.updateRemoteCharacterLock(data.sharkId, data.clientId, null, true);
          }
          if (coopPartner && (!data.clientId || coopPartner.clientId === data.clientId)) {
            coopPartner.active = false;
            if (coopPartner.mesh) coopPartner.mesh.visible = false;
            if (coopPartner.labelEl) coopPartner.labelEl.style.display = 'none';
            updateBlueSharkVisibility();
          }
          return;
        } else if (data.type === 'roster_sync') {
          if (window.BlahajSaveSystem && typeof window.BlahajSaveSystem.handleIncomingRosterSync === 'function') {
            window.BlahajSaveSystem.handleIncomingRosterSync(data);
          }
          return;
        } else if (data.type === 'enemy_boop') {
          if (window.BlahajEnemies) {
            const enemy = window.BlahajEnemies.getEnemies().find(e => e.id === data.enemyId);
            if (enemy) {
              enemy.mange = data.mange;
              if (data.isFlying && !enemy.isFlying) {
                window.BlahajEnemies.launchEnemyIntoStratosphere(enemy, new THREE.Vector3(0, 1, 0));
              }
            }
          }
        } else if (data.type === 'held_item_sync') {
          coopPartner.heldItemId = data.heldItemId || null;
          if (coopPartner.mesh && window.BlahajSharks3D && window.BlahajSharks3D.attachHeldItem) {
            window.BlahajSharks3D.attachHeldItem(coopPartner.mesh, coopPartner.heldItemId);
          }
        } else if (data.type === 'move') {
          if (data.sharkId && window.BlahajSaveSystem && typeof window.BlahajSaveSystem.updateRemoteCharacterLock === 'function') {
            const pName = data.playerName || (LORE.sharks[data.sharkId] ? `Partner (${LORE.sharks[data.sharkId].name})` : 'Partner');
            window.BlahajSaveSystem.updateRemoteCharacterLock(data.sharkId, data.clientId, pName, false);
          }
          if (!shouldRouteToPrimaryPartner(data)) {
            upsertExtraCoopPeer(data);
            return;
          }
          coopPartner.lastPacketAt = Date.now();
          if (!coopPartner.active || (data.sharkId && data.sharkId !== coopPartner.sharkId)) {
            spawnCoopPartnerShark(data.sharkId || 'solomon', typeof data.mange === 'number' ? data.mange : undefined);
          } else if (typeof data.mange === 'number' && Math.abs(data.mange - (coopPartner.mangeFactor || 0)) > 0.005) {
            coopPartner.mangeFactor = data.mange;
            if (coopPartner.mesh && window.BlahajModels && typeof window.BlahajModels.updateSharkMange === 'function') {
              window.BlahajModels.updateSharkMange(coopPartner.mesh, data.mange);
            }
          }
          const prevZone = coopPartner.zone || 'island';
          const nextZone = (!data.zone || data.zone === 'overworld') ? 'island' : data.zone;
          if (typeof data.inUFO === 'boolean') {
            coopPartner.inUFO = data.inUFO;
            coopPartner.ufoRole = data.ufoRole || null;
            if (window.BlahajUFO && typeof window.BlahajUFO.syncPartnerFromMovePacket === 'function') {
              window.BlahajUFO.syncPartnerFromMovePacket(data.inUFO, data.ufoRole || null);
            }
          }
          const partnerInUFO = !!(window.BlahajUFO && typeof window.BlahajUFO.isPartnerAboard === 'function' && window.BlahajUFO.isPartnerAboard());
          if (!partnerInUFO) {
            coopPartner.targetPos.set(data.x, data.y, data.z);
            coopPartner.targetRotY = data.rotY;
          }
          coopPartner.isMoving = partnerInUFO ? false : data.isMoving;
          coopPartner.inBoat = partnerInUFO ? false : !!data.inBoat;
          const wasInCart = coopPartner.inCart;
          const prevCartId = coopPartner.cartId;
          coopPartner.inCart = !!data.inCart;
          coopPartner.cartId = data.cartId || null;
          coopPartner.zone = nextZone;
          coopPartner.isLounging = !!data.isLounging;
          coopPartner.loungeChairId = data.loungeChairId || null;
          coopPartner.activePostureId = data.activePostureId || null;
          coopPartner.isSeatedInBooth = !!data.isSeatedInBooth;
          coopPartner.isPlayingPlushie = !!data.isPlayingPlushie;

          if (!partnerInUFO && coopPartner.mesh) {
            // Reset any 3D space pitch/roll tilt on partner's mesh when they are on the ground!
            coopPartner.mesh.rotation.order = 'YXZ';
            coopPartner.mesh.rotation.x = 0;
            coopPartner.mesh.rotation.z = 0;
            if (prevZone !== nextZone || coopPartner.mesh.position.distanceTo(coopPartner.targetPos) > 20) {
              coopPartner.mesh.position.copy(coopPartner.targetPos);
              coopPartner.mesh.rotation.y = coopPartner.targetRotY || 0;
            }
          }

          if (coopPartner.mesh && coopPartner.heldItemId !== data.heldItemId) {
            coopPartner.heldItemId = data.heldItemId || null;
            if (window.BlahajSharks3D && window.BlahajSharks3D.attachHeldItem) {
              window.BlahajSharks3D.attachHeldItem(coopPartner.mesh, coopPartner.heldItemId);
            }
          }

          if (currentZone === 'laundromat' && window.BlahajLaundromat) {
            if (coopPartner.inCart && coopPartner.cartId) {
              window.BlahajLaundromat.updateRemoteCart(
                coopPartner.cartId,
                { x: data.x, y: data.y, z: data.z },
                data.rotY,
                data.isMoving,
                0.05
              );
            } else if (wasInCart && prevCartId) {
              window.BlahajLaundromat.releaseRemoteCart(prevCartId);
            }
          }

          updateCoopPartnerVisibility();
        } else if (data.type === 'mange_sync') {
          if (typeof data.mange === 'number') {
            coopPartner.mangeFactor = data.mange;
            if (coopPartner.mesh && window.BlahajModels && typeof window.BlahajModels.updateSharkMange === 'function') {
              window.BlahajModels.updateSharkMange(coopPartner.mesh, data.mange);
            }
          }
        } else if (data.type === 'zone_change') {
          if (!shouldRouteToPrimaryPartner(data)) {
            upsertExtraCoopPeer(data);
            return;
          }
          coopPartner.lastPacketAt = Date.now();
          if (!coopPartner.active || (data.sharkId && data.sharkId !== coopPartner.sharkId)) {
            spawnCoopPartnerShark(data.sharkId || coopPartner.sharkId || 'solomon');
          }
          coopPartner.zone = (!data.zone || data.zone === 'overworld') ? 'island' : data.zone;
          if (typeof data.x === 'number' && typeof data.z === 'number') {
            coopPartner.targetPos.set(data.x, typeof data.y === 'number' ? data.y : 0, data.z);
            if (typeof data.rotY === 'number') coopPartner.targetRotY = data.rotY;
            if (coopPartner.mesh) {
              coopPartner.mesh.position.copy(coopPartner.targetPos);
              coopPartner.mesh.rotation.y = coopPartner.targetRotY || 0;
            }
          }
          updateCoopPartnerVisibility();

          // If local player is riding aboard the UFO, automatically warp with the partner across Space, Hyperspace, Cheese Moon & Island!
          if (
            window.BlahajUFO &&
            typeof window.BlahajUFO.isLocalAboard === 'function' &&
            window.BlahajUFO.isLocalAboard() &&
            coopPartner.zone !== currentZone
          ) {
            if (coopPartner.zone === 'hyperspace') {
              enterHyperspace(false, true);
            } else if (coopPartner.zone === 'cheese_moon') {
              enterCheeseMoon(false, true);
            } else if (coopPartner.zone === 'space') {
              if (currentZone === 'cheese_moon') {
                exitCheeseMoon(false);
              } else if (currentZone === 'hyperspace') {
                exitHyperspaceTo('space', false, true);
              } else {
                enterSpaceMap(false, true);
              }
            } else if (
              coopPartner.zone === 'island' &&
              (currentZone === 'space' || currentZone === 'cheese_moon' || currentZone === 'hyperspace')
            ) {
              exitSpaceMap(false, true);
            }
          }
        } else if (data.type === 'volcano_carrot_knock') {
          if (window.BlahajVolcano) {
            window.BlahajVolcano.knockCarrot(data.idx, data.vx || 0, data.vy || 8, data.vz || -12);
            CozyAudio.carrotBoop();
          }
          if (typeof data.carrotsKnockedCount === 'number' && data.carrotsKnockedCount > player.carrotsKnockedCount) {
            player.carrotsKnockedCount = data.carrotsKnockedCount;
            if (player.carrotsKnockedCount >= 5) completeQuest('q-carrots');
            updateMetersUI();
            renderBuilderToolbar();
          }
          addChatLog('🥕🌋 Your partner bumped a Volunteer Carrot into the boiling caldera!', 'coop');
        } else if (data.type === 'shark_swap') {
          if (data.sharkId && window.BlahajSaveSystem && typeof window.BlahajSaveSystem.updateRemoteCharacterLock === 'function') {
            window.BlahajSaveSystem.updateRemoteCharacterLock(data.sharkId, data.clientId, data.playerName || 'Partner', false);
          }
          spawnCoopPartnerShark(data.sharkId, data.mange);
        } else if (data.type === 'build_place' && data.item) {
          const placed = worldApi.placeBuiltStructure(data.item);
          if (placed) {
            saveBuiltStructuresToStorage();
            CozyAudio.allenBuild();
            spawnFloatingBurst(new THREE.Vector3(data.item.x, data.item.y + 1, data.item.z), 0xffd166, 12);
            const spec = (LORE.buildCatalog || []).find((x) => x.id === data.item.type);
            addChatLog(`🔧🏗️ Your partner built a <strong>${spec ? spec.name : data.item.type}</strong> with Hiram’s Sacred Allen Key!`, 'coop');
          }
        } else if (data.type === 'build_remove' && data.id) {
          const removed = worldApi.removeBuiltStructure(data.id);
          if (removed) {
            saveBuiltStructuresToStorage();
            CozyAudio.shonk();
            addChatLog('📦 Your partner disassembled a structure into its Sacred Flat-Pack.', 'coop');
          }
        } else if (data.type === 'build_sync' && Array.isArray(data.items)) {
          let added = 0;
          data.items.forEach((item) => {
            if (worldApi.placeBuiltStructure(item)) added++;
          });
          if (added > 0) saveBuiltStructuresToStorage();
        } else if (data.type === 'island_claims_sync' && data.claims && typeof data.claims === 'object') {
          Object.assign(islandClaims, data.claims);
          try { localStorage.setItem('blahaj_island_claims_v1', JSON.stringify(islandClaims)); } catch (e) {}
        } else if (data.type === 'pier_notes_sync' && Array.isArray(data.notes)) {
          let addedNote = false;
          data.notes.forEach((n) => {
            if (n && n.text && !pierNotes.some((ex) => ex.text === n.text && ex.author === n.author)) {
              pierNotes.push(n);
              addedNote = true;
            }
          });
          if (addedNote) savePierNotes();
        } else if (data.type === 'island_claim' && data.islandId) {
          islandClaims[data.islandId] = data.claimer || 'Partner';
          localStorage.setItem('blahaj_island_claims_v1', JSON.stringify(islandClaims));
          const isl = (LORE.sanctuaryIslands || []).find((x) => x.id === data.islandId);
          showToast('SANCTUARY ISLAND CLAIMED! 🏝️👑', `${ data.claimer } claimed ${ isl ? isl.name : 'a Sanctuary Island' }!`);
          addChatLog(`🏝️👑 Your partner claimed <strong>${isl ? isl.name : 'a Sanctuary Island'}</strong>!`, 'coop');
        } else if (data.type === 'carrot_knock') {
          const carrots = worldApi.getBalconyCarrots();
          const c = carrots[data.idx];
          if (c) {
            c.knockedOff = true;
            c.respawnTimer = 9.5;
            c.vel.set(data.vx || 0, data.vy || 9.5, data.vz || 14);
            CozyAudio.carrotBoop();
            spawnFloatingBurst(c.mesh.position, 0xff7b1c, 10);
          }
          if (typeof data.carrotsKnockedCount === 'number' && data.carrotsKnockedCount > player.carrotsKnockedCount) {
            player.carrotsKnockedCount = data.carrotsKnockedCount;
            if (player.carrotsKnockedCount >= 5) completeQuest('q-carrots');
            updateMetersUI();
            renderBuilderToolbar();
          }
          addChatLog('🥕💨 Your partner knocked a Beach-Shorts Carrot off the Volcano Balcony!', 'coop');
        } else if (data.type === 'ball_kick') {
          const balls = worldApi.getBeachBalls();
          const bb = balls[data.idx];
          if (bb) {
            if (typeof data.x === 'number' && typeof data.z === 'number') {
              bb.mesh.position.x = data.x;
              bb.mesh.position.z = data.z;
            }
            bb.vel.set(data.vx || 0, 0, data.vz || 0);
            CozyAudio.shonk();
          }
        } else if (data.type === 'seam_sync' && data.state) {
          if (window.BlahajSeam && typeof window.BlahajSeam.applySyncState === 'function') {
            window.BlahajSeam.applySyncState(data.state);
            player.seamMendedCount = window.BlahajSeam.getState().mendedCount;
            updateMetersUI();
            if (player.seamMendedCount >= 6) {
              completeQuest('q-sw-seam');
            }
          }
        } else if (data.type === 'ufo_state' || data.type === 'ufo_crew') {
          if (window.BlahajUFO && typeof window.BlahajUFO.handleNetworkPacket === 'function') {
            window.BlahajUFO.handleNetworkPacket(data);
          }
        } else if (data.type === 'space_event') {
          if (window.BlahajSpace && typeof window.BlahajSpace.handleNetworkPacket === 'function') {
            window.BlahajSpace.handleNetworkPacket(data);
          }
        } else if (data.type === 'cheese_event') {
          if (window.BlahajCheeseMoon && typeof window.BlahajCheeseMoon.handleNetworkPacket === 'function') {
            window.BlahajCheeseMoon.handleNetworkPacket(data);
          }
        } else if (data.type === 'ufo_instance_pause') {
          remotePilotPauseState.paused = !!data.paused;
          remotePilotPauseState.zone = data.zone || null;
          remotePilotPauseState.reason = data.reason || 'Pilot paused the instance';
          updateRemotePilotPauseBanner();
        } else if ((data.type === 'seam_rift_mended' || data.type === 'rift_mend') && (data.riftId || data.locId)) {
          const idToMend = data.riftId || data.locId;
          let mendedSuccess = false;
          if (window.BlahajSeam && typeof window.BlahajSeam.mendRift === 'function') {
            mendedSuccess = window.BlahajSeam.mendRift(idToMend, true);
            player.seamMendedCount = window.BlahajSeam.getState().mendedCount;
          }
          worldApi.getSeamRifts().forEach((r) => {
            if ((r.userData.id === idToMend || r.userData.locId === idToMend) && !r.userData.mended) {
              r.userData.mended = true;
              if (r.userData.core && r.userData.core.material) {
                r.userData.core.material.color.setHex(0xf5cd79);
                r.userData.core.material.wireframe = false;
              }
              if (r.userData.ring && r.userData.ring.material) {
                r.userData.ring.material.color.setHex(0x52f29c);
              }
            }
          });
          updateMetersUI();
          CozyAudio.portalChime();
          const allRifts = window.BlahajSeam ? window.BlahajSeam.getAllActiveRifts() : [];
          const rObj = allRifts.find((x) => x.id === idToMend || x.locId === idToMend || x.num === data.num);
          const rName = rObj ? (rObj.name || `Seam #${rObj.num}`) : (data.num ? `Seam #${data.num}` : 'a Great Seam Rift');
          showToast('GREAT SEAM MENDED! 🪡✨', `Your partner stitched ${rName}! (${player.seamMendedCount} / 6 Mended)`);
          addChatLog(`🪡✨ <strong>GREAT SEAM MENDED:</strong> Your partner stitched <em>${rName}</em>! (${player.seamMendedCount} / 6 Mended)`, 'coop');
          completeQuest('q-seam');
          if (player.seamMendedCount >= 6) {
            completeQuest('q-sw-seam');
          }
        } else if (data.type === 'lounge_sip') {
          CozyAudio.pinaColadaSip();
          const sipPos =
            typeof data.x === 'number'
              ? new THREE.Vector3(data.x, data.y, data.z)
              : coopPartner.mesh
              ? coopPartner.mesh.position.clone().add(new THREE.Vector3(0, 0.35, 0))
              : player.pos;
          spawnFloatingBurst(sipPos, 0xfacc15, 12);
          spawnFloatingBurst(sipPos, 0xf43f5e, 8);
          addChatLog('🍹🍍 Your partner took a refreshing sip of their Piña Colada on the beach!', 'coop');
        } else if (data.type === 'volleyball_match_sync') {
          if (window.BlahajVolleyball) {
            if (data.active) {
              window.BlahajVolleyball.startSpectating(data, scene, player);
            } else {
              window.BlahajVolleyball.endSpectating();
            }
          }
        } else if (data.type === 'volleyball_state_sync') {
          if (window.BlahajVolleyball) {
            window.BlahajVolleyball.applySpectatorState(data);
          }
        } else if (data.type === 'volleyball_event') {
          if (window.BlahajVolleyball) {
            window.BlahajVolleyball.handleSpectatorEvent(data);
          }
        } else if (data.type === 'emote') {
          const peerMesh = resolvePeerMesh(data);
          if (peerMesh) {
            const normCur = (!currentZone || currentZone === 'overworld') ? 'island' : currentZone;
            const pktZone = (!data.zone || data.zone === 'overworld') ? normCur : data.zone;
            if (pktZone === normCur) {
              if (data.kind === 'beep') {
                CozyAudio.beepNose();
                peerMesh.userData.beepTimer = 0.9;
                spawnFloatingBurst(peerMesh.position, 0xff7eb6, 10);
                addChatLog('🦈💕 Your partner sent a fin Nose-Beep!', 'coop');
              } else if (data.kind === 'breb') {
                CozyAudio.birbChirp();
                const bPos =
                  typeof data.x === 'number'
                    ? new THREE.Vector3(data.x, data.y || peerMesh.position.y, data.z)
                    : peerMesh.position.clone();
                worldApi.spawnBrebLoaf(bPos);
                if (data.golden) {
                  worldApi.spawnBrebLoaf(new THREE.Vector3(bPos.x + 1.4, bPos.y, bPos.z - 0.8));
                  worldApi.spawnBrebLoaf(new THREE.Vector3(bPos.x - 1.4, bPos.y, bPos.z + 0.8));
                }
                spawnFloatingBurst(bPos, 0xfbbf24, 8);
                addChatLog('🥖🐦 Your partner tossed warm Breb for the Birbs!', 'coop');
              } else if (data.kind === 'jump_flip') {
                peerMesh.userData.flipTimer = data.doubleJump ? 0.45 : 0.35;
                if (data.doubleJump) spawnFloatingBurst(peerMesh.position, 0x56c2ff, 8);
              } else {
                CozyAudio.portalChime();
                spawnFloatingBurst(peerMesh.position, 0x9b6dff, 12);
              }
            }
          }
        } else if (data.type === 'mmo_action') {
          const peerMesh = resolvePeerMesh(data);
          const normCur = (!currentZone || currentZone === 'overworld') ? 'island' : currentZone;
          const pktZone = (!data.zone || data.zone === 'overworld') ? normCur : data.zone;
          if (peerMesh && pktZone === normCur && window.BlahajMMO && typeof window.BlahajMMO.playRemoteAction === 'function') {
            window.BlahajMMO.playRemoteAction(peerMesh, data);
          }
        } else if (data.type === 'groom_partner') {
          if (coopPartner.mesh && coopPartner.mesh.userData) {
            coopPartner.mesh.userData.groomTimer = 1.1;
          }
          if (player.mesh && player.mesh.userData) {
            player.mesh.userData.groomTargetTimer = 1.1;
          }
          CozyAudio.shonkPop();
          CozyAudio.bistroChime();
          const pPos = player.pos.clone().add(new THREE.Vector3(0, 0.45, 0));
          spawnFloatingBurst(pPos, 0x58e3ff, 18);
          spawnFloatingBurst(pPos, 0xffd166, 16);
          const delta = typeof data.delta === 'number' ? data.delta : -0.15;
          const newMange = adjustSharkMange(player.sharkId, delta, 'Tender Partner Grooming');
          const partnerName = data.fromName || (LORE.sharks[data.fromShark] ? LORE.sharks[data.fromShark].name : 'Partner');
          const mangePct = Math.round(newMange * 100);
          showToast('GENTLE GROOMING RECEIVED! 🪮✨', `${partnerName} groomed your plush fleece! (-15% Mange · Now ${mangePct}%)`);
          addChatLog(`🪮✨ <strong>${partnerName}</strong> tenderly groomed your plush coat (-15% Mange, now <strong>${mangePct}%</strong>)!`, 'coop');
        } else if (data.type === 'chat') {
          addChatLog(`🌌 <strong>${data.sender}:</strong> ${data.text}`, 'coop');
        } else if (data.type === 'pier_note' && data.note) {
          pierNotes.push(data.note);
          savePierNotes();
          showToast('NEW PIER BOTTLE NOTE', `${data.note.author} left a note on the Endless Pier!`);
        } else if (data.type === 'laundromat_spin_start') {
          if (window.BlahajLaundromat) {
            window.BlahajLaundromat.startRemoteSpinCycle(coopPartner.mesh, () => {
              if (coopPartner.mesh) {
                spawnFloatingBurst(coopPartner.mesh.position, 0x82e2ff, 24);
              }
            });
            showToast('PARTNER IN SPIN CYCLE! 🫧🌀', 'Your partner hopped into Master Washer #7 for a 40°C Delicate cycle!');
            addChatLog('🌀 Your partner hopped into <strong>Giant Master Washer #7</strong>! Soapy suds swirl around them.', 'coop');
          }
        } else if (data.type === 'bistro_order') {
          if (window.BlahajSphericalFoods) {
            window.BlahajSphericalFoods.orderDishToBooth(data.boothIndex, data.dishKey);
            CozyAudio.bistroChime();
            addChatLog(`🛎️ Your partner ordered <strong>${data.dishName || 'a Spherical Specialty'}</strong>! Monsieur Betterave is wheeling the trolley over to their booth.`, 'coop');
          }
        } else if (data.type === 'bistro_eat') {
          if (window.BlahajSphericalFoods) {
            const res = window.BlahajSphericalFoods.eatServedDish(data.boothIndex);
            CozyAudio.eatChomp();
            const cPos = coopPartner.mesh ? coopPartner.mesh.position : player.pos;
            spawnFloatingBurst(cPos, data.isHelensCake ? 0xfbbf24 : 0xec4899, 28);
            addChatLog(`🍴 Your partner feasted on <strong>${data.title || 'Spherical Specialty'}</strong> at the velvet booth!`, 'coop');
          }
        } else if (data.type === 'bistro_cracker') {
          if (window.BlahajSphericalFoods) {
            const cPos = data.pos || (coopPartner.mesh ? coopPartner.mesh.position : player.pos);
            window.BlahajSphericalFoods.popBirthdayCracker(cPos);
            CozyAudio.birthdayHorn();
            spawnFloatingBurst(cPos, 0xfbbf24, 32);
            spawnFloatingBurst(cPos, 0xec4899, 24);
            addChatLog("🎉 <em>Happy Birthday Helen!</em> Your partner popped a festive party cracker! Confetti and golden streamers burst into the air!", 'coop');
          }
        } else if (data.type === 'item_gifted' && data.itemType) {
          if (player.inventory) {
            const added = player.inventory.addItem(data.itemType, data.count || 1);
            const def = (window.BlahajInventory && window.BlahajInventory.ITEMS && window.BlahajInventory.ITEMS[data.itemType]) || { name: data.itemType, icon: '🎁' };
            if (added > 0) {
              CozyAudio.bistroChime();
              spawnFloatingBurst(player.pos, 0x38bdf8, 18);
              updateMetersUI();
              if (typeof window._blahajRenderFinBelt === 'function') window._blahajRenderFinBelt();
              showToast(`CAUGHT ${def.name.toUpperCase()}! ${def.icon}✨`, `${data.fromName || 'Your friend'} tossed +${added} straight into your satchel!`);
              addChatLog(`${def.icon} Caught <strong>${def.name}</strong> (+${added}) tossed by <strong>${data.fromName || 'your friend'}</strong>!`, 'coop');
            }
          }
        } else if (data.type === 'item_dropped') {
          if (worldPickups) {
            const existing = worldPickups.getPickups().find((p) => p.id === data.id);
            if (!existing) {
              worldPickups.spawnPickup(data.itemType, data.pos, data.id, data.count || 1);
              const def = window.BlahajInventory?.ITEMS[data.itemType] || { name: data.itemType, icon: '📦' };
              spawnFloatingBurst(data.pos, 0xfacc15, 12);
              addChatLog(`${def.icon} Your partner dropped <strong>${def.name}</strong> on the ground.`, 'coop');
            }
          }
        } else if (data.type === 'item_collected') {
          if (worldPickups) {
            const p = worldPickups.getPickups().find((x) => x.id === data.id);
            if (p) {
              worldPickups.collect(p);
              const def = window.BlahajInventory?.ITEMS[data.itemType] || { name: data.itemType, icon: '📦' };
              if (coopPartner.mesh) spawnFloatingBurst(coopPartner.mesh.position, 0x52f29c, 12);
              addChatLog(`${def.icon} Your partner picked up <strong>${def.name}</strong>.`, 'coop');
            }
          }
        } else if (data.type === 'pickups_sync' && Array.isArray(data.items)) {
          if (worldPickups) {
            data.items.forEach((item) => {
              const existing = worldPickups.getPickups().find((p) => p.id === item.id);
              if (!existing) {
                worldPickups.spawnPickup(item.itemType, item.pos, item.id, item.count || 1);
              }
            });
          }
        } else if (data.type === 'trunk_sync' && Array.isArray(data.slots)) {
          if (communityTrunk && typeof communityTrunk.setSlots === 'function') {
            communityTrunk.setSlots(data.slots);
            const modal = document.getElementById('community-trunk-modal');
            if (modal && !modal.classList.contains('hidden')) {
              renderCommunityTrunkModal();
            }
            addChatLog('📦 Community Trunk updated with shared supplies.', 'coop');
          }
        } else if (data.type === 'firework_launch') {
          launchHelenBirthdayFireworks(true);
          addChatLog("🎆🚀 Your partner launched <strong>Helen's Birthday Grand Fireworks</strong>! Look up at the ocean sky!", 'coop');
        }
      },
      onDisconnect() {
        if (coopPartner.mesh) {
          if (coopPartner.mesh.parent) coopPartner.mesh.parent.remove(coopPartner.mesh);
          coopPartner.mesh = null;
        }
        if (coopPartner.labelEl) {
          coopPartner.labelEl.remove();
          coopPartner.labelEl = null;
        }
        extraCoopPeers.forEach((_, remId) => removeExtraCoopPeer(remId));
        extraCoopPeers.clear();
        const pBoat = worldApi.getPartnerBoatMesh && worldApi.getPartnerBoatMesh();
        if (pBoat) pBoat.visible = false;
        coopPartner.active = false;
        coopPartner.clientId = null;
        coopPartner.machineId = null;
        coopPartner.inBoat = false;
        player.ridingWithPartner = false;
        updateBlueSharkVisibility();
      }
    });
    broadcastSharedWorldState();
  }

  function updateCoopPartnerVisibility() {
    if (!coopPartner.mesh) return;
    const normPartnerZone = (!coopPartner.zone || coopPartner.zone === 'overworld') ? 'island' : coopPartner.zone;
    const normCurrentZone = (!currentZone || currentZone === 'overworld') ? 'island' : currentZone;
    const sameZone = normPartnerZone === normCurrentZone;
    const wasVisible = coopPartner.mesh.visible;
    coopPartner.mesh.visible = sameZone;
    if (coopPartner.labelEl) {
      coopPartner.labelEl.style.display = sameZone ? '' : 'none';
      if (!sameZone) {
        coopPartner.labelEl.style.opacity = '0';
      }
    }
    const currentScene = getActiveScene();
    if (coopPartner.mesh.parent !== currentScene) {
      if (coopPartner.mesh.parent) coopPartner.mesh.parent.remove(coopPartner.mesh);
      currentScene.add(coopPartner.mesh);
      coopPartner.mesh.position.copy(coopPartner.targetPos);
    } else if (!wasVisible && sameZone) {
      coopPartner.mesh.position.copy(coopPartner.targetPos);
    }
  }

  function spawnCoopPartnerShark(sharkId, mangeFactor) {
    const cfg = LORE.sharks[sharkId] || LORE.sharks.solomon;
    coopPartner.sharkId = cfg.id;
    if (typeof mangeFactor === 'number') {
      coopPartner.mangeFactor = mangeFactor;
    }
    coopPartner.active = true;

    if (coopPartner.mesh && coopPartner.mesh.parent) coopPartner.mesh.parent.remove(coopPartner.mesh);
    const mVal = coopPartner.mangeFactor !== undefined ? coopPartner.mangeFactor : 0.70;
    coopPartner.mesh = window.BlahajModels.createPlushShark(cfg, mVal);
    coopPartner.mesh.position.copy(coopPartner.targetPos);
    
    const activeScene = getActiveScene();
    activeScene.add(coopPartner.mesh);

    if (coopPartner.heldItemId && window.BlahajSharks3D && window.BlahajSharks3D.attachHeldItem) {
      window.BlahajSharks3D.attachHeldItem(coopPartner.mesh, coopPartner.heldItemId);
    }

    if (!coopPartner.labelEl) {
      coopPartner.labelEl = createWorldLabel(
        document.getElementById('world-labels'),
        `${cfg.name} (Partner)`,
        '★ CROSS-OCEAN CO-OP SHARK'
      );
      coopPartner.labelEl.dataset.targetId = 'coop_partner';
      coopPartner.labelEl.title = `Click to Target ${cfg.name} (Partner)`;
    } else {
      coopPartner.labelEl.querySelector('.npc-name').textContent = `${cfg.name} (Partner)`;
    }
    updateCoopPartnerVisibility();
    updateBlueSharkVisibility();
  }

  // ==========================================================================
  // MAIN GAME LOOP
  // ==========================================================================
  let netSyncTimer = 0;

  // Dynamic drop shadow for precise 3D jump landing feedback
  let playerShadow = null;
  let playerInvulnTimer = 0;
  let isUsingBinoculars = false;
  let binocularSavedDistance = 7.4;
  let binocularSavedFov = 60;
  let binocularSavedShoulderRight = 0.85;
  let binocularSavedHeightOffset = 2.35;
  function createPlayerShadow() {
    const cvs = document.createElement('canvas');
    cvs.width = cvs.height = 128;
    const ctx = cvs.getContext('2d');
    const grad = ctx.createRadialGradient(64, 64, 6, 64, 64, 62);
    grad.addColorStop(0, 'rgba(8, 6, 12, 0.72)');
    grad.addColorStop(0.45, 'rgba(12, 8, 16, 0.50)');
    grad.addColorStop(0.82, 'rgba(20, 14, 22, 0.20)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);

    const tex = new THREE.CanvasTexture(cvs);
    const geo = new THREE.PlaneGeometry(2.8, 2.8);
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2
    });
    playerShadow = new THREE.Mesh(geo, mat);
    playerShadow.rotation.x = -Math.PI / 2;
    playerShadow.renderOrder = 800;
    return playerShadow;
  }

  function updatePlayerShadow() {
    if (gameSettings && !gameSettings.shadows) {
      if (playerShadow) playerShadow.visible = false;
      return;
    }
    if (!playerShadow) playerShadow = createPlayerShadow();
    const activeScene = getActiveScene() || scene;
    if (playerShadow.parent !== activeScene) {
      if (playerShadow.parent) playerShadow.parent.remove(playerShadow);
      activeScene.add(playerShadow);
    }

    if (player.inBoat || (currentZone === 'laundromat' && window.BlahajLaundromat && window.BlahajLaundromat.isSpinCycleActive())) {
      playerShadow.visible = false;
      return;
    }

    let floorY = -9999;
    if (currentZone === 'volcano' && window.BlahajVolcano) {
      floorY = window.BlahajVolcano.getFloorHeight(player.pos.x, player.pos.z, player.pos.y);
    } else if (currentZone === 'laundromat' && window.BlahajLaundromat) {
      floorY = window.BlahajLaundromat.getFloorHeight(player.pos.x, player.pos.z, player.pos.y);
    } else if (currentZone === 'spawning_pits' && window.BlahajSpawningPits) {
      floorY = window.BlahajSpawningPits.getFloorHeight(player.pos.x, player.pos.z, player.pos.y);
    } else if (currentZone === 'sea_cave' && window.BlahajHomestead) {
      floorY = window.BlahajHomestead.getFloorHeight(player.pos.x, player.pos.z);
    } else if (currentZone === 'volleyball' && window.BlahajVolleyball) {
      floorY = window.BlahajVolleyball.getFloorHeight(player.pos.x, player.pos.z);
    } else if (currentZone === 'spherical_foods' && window.BlahajSphericalFoods) {
      floorY = window.BlahajSphericalFoods.getFloorHeight(player.pos.x, player.pos.z, player.pos.y);
    } else if (worldApi && typeof worldApi.getGroundAndStructureHeight === 'function') {
      floorY = worldApi.getGroundAndStructureHeight(player.pos.x, player.pos.z, player.pos.y);
    } else if (worldApi && typeof worldApi.getTerrainHeight === 'function') {
      floorY = worldApi.getTerrainHeight(player.pos.x, player.pos.z);
    }

    if (floorY > -500 && player.pos.y >= floorY - 0.45) {
      playerShadow.visible = true;
      playerShadow.position.set(player.pos.x, floorY + 0.05, player.pos.z);
      const heightAbove = Math.max(0, player.pos.y - floorY);
      const s = Math.max(0.65, 1.0 - heightAbove * 0.045);
      playerShadow.scale.set(s, s, 1);
      playerShadow.material.opacity = Math.max(0.18, 0.65 - heightAbove * 0.05);
    } else if (currentZone === 'volcano' && window.BlahajVolcano && window.BlahajVolcano.constants) {
      // Over open lava pit in dungeon: project guide at lava level so the player sees exactly where they are over the pit!
      const lavaY = window.BlahajVolcano.constants.LAVA_Y || -2;
      playerShadow.visible = true;
      playerShadow.position.set(player.pos.x, lavaY + 0.08, player.pos.z);
      const heightAbove = Math.max(0, player.pos.y - lavaY);
      const s = Math.max(0.5, 0.85 - heightAbove * 0.03);
      playerShadow.scale.set(s, s, 1);
      playerShadow.material.opacity = Math.max(0.15, 0.45 - heightAbove * 0.04);
    } else {
      playerShadow.visible = false;
    }
  }

  let lastMeterUpdateSecond = -1;
  function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05);
    const elapsed = clock.getElapsedTime();

    if (player.teaBuffTimer > 0) {
      player.teaBuffTimer = Math.max(0, player.teaBuffTimer - dt);
      player.warmth = 100;
    }

    if (playerInvulnTimer > 0) {
      playerInvulnTimer = Math.max(0, playerInvulnTimer - dt);
    }

    if (playerHeldItem && playerHeldItem.isTimed && playerHeldItem.id) {
      updateHeldItemSavoring(dt);
    }

    if (currentZone === 'island' && window.BlahajEnemies && typeof window.BlahajEnemies.update === 'function') {
      window.BlahajEnemies.update(dt, elapsed, player.pos, player.mesh);
    }

    const curQuarter = Math.floor(elapsed * 4.0);
    if (curQuarter !== lastMeterUpdateSecond) {
      lastMeterUpdateSecond = curQuarter;
      updateMetersUI();
      if (typeof window._blahajSyncCaptureUI === 'function') window._blahajSyncCaptureUI();
    }

    try {
      updatePlayerMovement(dt, elapsed);
    } catch (err) {
      console.error('[Blahaj] Movement update error:', err);
    }
    updateMangeSettling(dt, elapsed);
    updateStuffingRegen(dt, elapsed);
    updateSavePointCapture(dt);
    updateVitalsHUD();
    updatePlayerShadow();
    updateBuilderPreview(elapsed);
    updateDynamicCollisions(dt);
    updateRemotePilotPauseBanner();
    const instancePaused = isCurrentInstancePaused();
    const ufoStepDt = instancePaused ? 0 : dt;

    // Ensure zone-specific top objective banners & HUD waypoints never linger across zone transitions or overlap the Pause Menu!
    const pauseMenuOpenNow = !!(document.getElementById('game-pause-overlay') && !document.getElementById('game-pause-overlay').classList.contains('hidden'));
    if (currentZone !== 'hyperspace' || pauseMenuOpenNow) {
      const hb = document.getElementById('hyperspace-objective-banner');
      if (hb) hb.style.display = 'none';
      const hw = document.getElementById('hyperspace-hud-waypoints');
      if (hw) hw.style.display = 'none';
    }
    if (currentZone !== 'cheese_moon' || pauseMenuOpenNow) {
      const cb = document.getElementById('cheese-moon-objective-banner');
      if (cb) cb.style.display = 'none';
      const cw = document.getElementById('cheese-moon-hud-waypoints');
      if (cw) cw.style.display = 'none';
    }

    // Update UFO physics & cockpit camera anchor BEFORE updateCamera() so Interior & Exterior views have zero 1-frame jitter!
    if ((currentZone === 'island' || currentZone === 'overworld' || currentZone === 'space' || currentZone === 'cheese_moon' || currentZone === 'hyperspace') && window.BlahajUFO && typeof window.BlahajUFO.update === 'function') {
      try {
        window.BlahajUFO.update(ufoStepDt, elapsed, keys, camState, camera);
      } catch (err) {
        console.error('[Blahaj] UFO update error:', err);
      }
    }
    try {
      updateCamera(elapsed, dt);
      updateInteractionsAndHUD();
    } catch (err) {
      console.error('[Blahaj] Camera/HUD update error:', err);
    }
    updateSeamClockAndDetector(dt, elapsed);
    if (window.BlahajSeam) {
      window.BlahajSeam.update(dt, elapsed, player.pos, currentZone);
    }
    if (window.BlahajQuests && typeof window.BlahajQuests.update === 'function') {
      window.BlahajQuests.update(elapsed);
    }
    if (window.BlahajMMO && typeof window.BlahajMMO.update === 'function') {
      window.BlahajMMO.update(dt, elapsed);
    }
    updateCoopPartner(dt, elapsed);
    updateFloatingBursts(dt);
    if (typeof window._blahajUpdateThrownProjectiles === 'function') {
      window._blahajUpdateThrownProjectiles(dt);
    }

    const activeScene = getActiveScene();
    try {
      if (currentZone !== 'spawning_pits' && window.BlahajSpawningPits && typeof window.BlahajSpawningPits.clearDisguiseAndTrolley === 'function') {
        if (
          (window.BlahajSpawningPits.isRidingTrolley && window.BlahajSpawningPits.isRidingTrolley()) ||
          (window.BlahajSpawningPits.isBoxDisguised && window.BlahajSpawningPits.isBoxDisguised()) ||
          (window.BlahajSpawningPits.isPlayingPlushie && window.BlahajSpawningPits.isPlayingPlushie())
        ) {
          window.BlahajSpawningPits.clearDisguiseAndTrolley(player.mesh);
        }
      }

      if (currentZone === 'volcano' && window.BlahajVolcano) {
        const activeActors = [player.pos];
        if (coopPartner.active && coopPartner.targetPos) activeActors.push(coopPartner.targetPos);
        window.BlahajVolcano.update(dt, elapsed, activeActors, camera.position);
      } else if (currentZone === 'laundromat' && window.BlahajLaundromat) {
        window.BlahajLaundromat.update(dt, elapsed, player.pos, player.mesh);
      } else if (currentZone === 'spawning_pits' && window.BlahajSpawningPits) {
        window.BlahajSpawningPits.update(dt, elapsed, player.pos);
      } else if (currentZone === 'sea_cave' && window.BlahajHomestead) {
        window.BlahajHomestead.update(dt, elapsed);
      } else if (currentZone === 'spherical_foods' && window.BlahajSphericalFoods) {
        window.BlahajSphericalFoods.update(dt, elapsed, player.pos, player.mesh);
      } else if (currentZone === 'volleyball' && window.BlahajVolleyball) {
        window.BlahajVolleyball.update(dt, player, keys['f'] || keys[' '] || keys['space']);
      } else if (currentZone === 'space' && window.BlahajSpace) {
        if (!instancePaused) {
          window.BlahajSpace.update(dt, elapsed);
        }
      } else if (currentZone === 'cheese_moon' && window.BlahajCheeseMoon) {
        if (!instancePaused) {
          window.BlahajCheeseMoon.update(dt, elapsed, camera);
        } else if (typeof window.BlahajCheeseMoon.updateWaypointsOnly === 'function') {
          window.BlahajCheeseMoon.updateWaypointsOnly(camera);
        }
      } else if (currentZone === 'hyperspace' && window.BlahajHyperspace) {
        if (!instancePaused) {
          window.BlahajHyperspace.update(dt, elapsed, camera);
        } else if (typeof window.BlahajHyperspace.updateWaypointsOnly === 'function') {
          window.BlahajHyperspace.updateWaypointsOnly(camera);
        }
      } else {
        window.BlahajWorld.updateWorld(elapsed, dt, scene, camera);
        if (window.BlahajHomestead) {
          window.BlahajHomestead.update(dt, elapsed);
        }
        if (window.BlahajVolleyball) {
          if (window.BlahajVolleyball.isMatchActive()) {
            window.BlahajVolleyball.update(dt, player, keys['f'] || keys[' '] || keys['space']);
          } else if (window.BlahajVolleyball.isSpectating()) {
            window.BlahajVolleyball.updateSpectator(dt);
          }
        }
        if (worldPickups) {
          worldPickups.update(dt, elapsed);
        }
        if (solomonBreadOven && solomonBreadOven.smokeParticles) {
          solomonBreadOven.smokeParticles.forEach((sp, idx) => {
            const t = (elapsed * 0.8 + idx * 0.35) % 1.5;
            sp.mesh.position.y = sp.baseY + t * 0.75;
            sp.mesh.position.x = Math.sin(elapsed * 1.5 + sp.phase) * 0.08;
            sp.mesh.scale.setScalar(0.8 + t * 0.8);
            sp.mesh.material.opacity = Math.max(0, 0.35 * (1.0 - t / 1.5));
          });
        }

        if (communityTrunk) {
          communityTrunk.update(dt);
        }
        if (launchMortarStation && typeof launchMortarStation.update === 'function') {
          launchMortarStation.update(elapsed, dt);
        }

        // Animate active aerial fireworks rockets
        for (let r = activeRockets.length - 1; r >= 0; r--) {
          const ro = activeRockets[r];
          ro.life -= dt;
          ro.pos.addScaledVector(ro.vel, dt);
          ro.mesh.position.copy(ro.pos);
          ro.light.position.copy(ro.pos);
          if (Math.random() < 0.45) {
            spawnFloatingBurst(ro.pos, 0xfde047, 3);
          }
          if (ro.life <= 0) {
            if (ro.mesh.parent) ro.mesh.parent.remove(ro.mesh);
            if (ro.light.parent) ro.light.parent.remove(ro.light);
            activeRockets.splice(r, 1);
          }
        }
      }
    } catch (err) {
      console.error('[Blahaj] Zone update error:', err);
    }

    const useBloom = !!(gameSettings.bloom && bloomPassInstance && bloomPassInstance.enabled);
    if (useBloom && composer) {
      if (renderPass) renderPass.scene = activeScene;
      composer.render();
    } else {
      renderer.render(activeScene, camera);
    }

    // Update real-time procedural ocean, wind, sailing audio and laundromat interior soundscape
    CozyAudio.updateAmbient(currentZone, elapsed, player.pos, player.inBoat, keys['w'] || keys['s'] || keys['a'] || keys['d'], camState.distance);
    if (currentZone === 'island' || currentZone === 'overworld') {
      if (Math.random() < 0.003) {
        const distToBirbs = Math.hypot(player.pos.x - 0, player.pos.z - 15);
        if (distToBirbs < 60) {
          CozyAudio.birbChirp();
        }
      }
    }
  }

  function updatePlayerMovement(dt, elapsed) {
    // While in the Full-Screen Character Select Lobby, continuously sweep the live 3D camera 360° around the selected character
    // so every GPU angle, texture, and shadow frustum is already warm and spinning at 60 FPS before you click Enter World!
    if (window.BlahajSaveSystem && typeof window.BlahajSaveSystem.isInLobby === 'function' && window.BlahajSaveSystem.isInLobby()) {
      const selShark = (typeof window.BlahajSaveSystem.getSelectedLobbySharkId === 'function')
        ? window.BlahajSaveSystem.getSelectedLobbySharkId()
        : player.sharkId;
      if (selShark && selShark !== player.sharkId) {
        spawnPlayerShark(selShark, true);
        if (typeof window.BlahajSaveSystem.applyCharacterFromRoster === 'function') {
          window.BlahajSaveSystem.applyCharacterFromRoster(selShark);
        }
      }
      camState.yaw += dt * 0.85;
      while (camState.yaw > Math.PI) camState.yaw -= Math.PI * 2;
      camState.pitch = 0.28 + Math.sin(elapsed * 0.7) * 0.14;
      window.__BLAHAJ_LOBBY_ORBIT_DEG__ = Math.min(360, Math.round(((window.__BLAHAJ_LOBBY_ORBIT_ACCUM__ = (window.__BLAHAJ_LOBBY_ORBIT_ACCUM__ || 0) + dt * 0.85) / (Math.PI * 2)) * 360));
      return;
    }
    if (window.BlahajUFO && window.BlahajUFO.isLocalAboard()) {
      netSyncTimer += dt;
      if (netSyncTimer > 0.45) {
        netSyncTimer = 0;
        const ufoRoleNow = (typeof window.BlahajUFO.getLocalRole === 'function')
          ? window.BlahajUFO.getLocalRole()
          : 'passenger';
        window.BlahajNetwork.send({
          type: 'move',
          sharkId: player.sharkId,
          x: Number(player.pos.x.toFixed(2)),
          y: Number(player.pos.y.toFixed(2)),
          z: Number(player.pos.z.toFixed(2)),
          rotY: Number(player.rotY.toFixed(3)),
          isMoving: false,
          inBoat: false,
          inCart: false,
          inUFO: true,
          ufoRole: ufoRoleNow,
          zone: currentZone,
          mange: Number((window.__BLAHAJ_MANGE__ || 0).toFixed(3)),
          heldItemId: playerHeldItem ? playerHeldItem.id : null
        });
      }
      return;
    }

    if (isUsingBinoculars) {
      nearestInteractable = {
        kind: 'binoculars_active',
        prompt: '🔭 Binocular Zoom · [F / Space] Lower Binoculars · [WASD / Mouse] Scan Horizon'
      };
      const promptEl = document.getElementById('interaction-prompt');
      if (promptEl && !isAnyModalOpen()) {
        document.getElementById('interaction-text').textContent = nearestInteractable.prompt;
        promptEl.classList.remove('hidden');
      }
      return;
    }

    if (isUsingTelescope) {
      nearestInteractable = {
        kind: 'telescope_active',
        prompt: '🔭 Starlight Telescope · [Space / Click] Wave to Cloud Sharks 👋 · [Esc / E] Step Away'
      };
      const promptEl = document.getElementById('interaction-prompt');
      if (promptEl && !isAnyModalOpen()) {
        document.getElementById('interaction-text').textContent = nearestInteractable.prompt;
        promptEl.classList.remove('hidden');
      }
      return;
    }

    if (player.isLounging) {
      const anyMoveKey =
        keys['w'] ||
        keys['s'] ||
        keys['a'] ||
        keys['d'] ||
        keys['arrowup'] ||
        keys['arrowdown'] ||
        keys['arrowleft'] ||
        keys['arrowright'] ||
        keys['shift'];
      if (anyMoveKey) {
        standUpFromDeckChair();
      } else {
        const chair = player.loungeChair;
        if (chair) {
          player.pos.set(chair.seatX, chair.seatY, chair.seatZ);
          player.rotY = chair.seatRotY;
        }
        player.velY = 0;
        player.isGrounded = true;
        if (player.mesh) {
          player.mesh.position.copy(player.pos);
          player.mesh.rotation.set(0.34, player.rotY, 0);
          const breath = Math.sin(elapsed * 2.2) * 0.03;
          player.mesh.scale.set(1.12 + breath * 0.5, 0.78 + breath, 1.05);
          window.BlahajModels.animateShark(player.mesh, dt, false, elapsed, false, 0);
        }
        return;
      }
    }

    if (player.isSeatedInBooth) {
      const anyMoveKey = keys['w'] || keys['s'] || keys['a'] || keys['d'] ||
                         keys['arrowup'] || keys['arrowdown'] || keys['arrowleft'] || keys['arrowright'] ||
                         keys[' '] || keys['shift'];
      if (anyMoveKey) {
        standUpFromBooth();
      } else {
        if (window.BlahajSphericalFoods && typeof window.BlahajSphericalFoods.getBoothSeat === 'function') {
          const seat = window.BlahajSphericalFoods.getBoothSeat(player.seatedBoothIndex);
          player.pos.set(seat.x, seat.y, seat.z);
          player.rotY = seat.rotY;
        }
        player.velY = 0;
        player.isGrounded = true;
        if (player.mesh) {
          player.mesh.position.copy(player.pos);
          player.mesh.rotation.set(0, player.rotY, 0);
          window.BlahajModels.animateShark(player.mesh, dt, false, elapsed, false, 0);
        }
        return;
      }
    }

    let moveForward = 0;
    let moveRight = 0;

    if (!document.hasFocus() || isAnyModalOpen()) {
      clearAllMovementKeys();
    }

    if (!isAnyModalOpen() && (!document.activeElement || document.activeElement.tagName !== 'INPUT')) {
      if (keys['w'] || keys['arrowup'] || keys['s'] || keys['arrowdown']) {
        if (camState.isAutoRunning) {
          camState.isAutoRunning = false;
          if (window.BlahajMMO && window.BlahajMMO.syncAutorunUI) window.BlahajMMO.syncAutorunUI(false);
        }
      }
      if (keys['w'] || keys['arrowup']) moveForward += 1;
      if (keys['s'] || keys['arrowdown']) moveForward -= 1;

      // Left + Right Click Together (Mouse Chording) or Autorun Toggle: forces character to run forward!
      if (camState.isChordMoving || camState.isAutoRunning) {
        moveForward = Math.min(1, moveForward + 1);
      }

      // Pass 82B: Click-to-Face (Point & Turn) smooth interpolation!
      // Clicking anywhere in the 3D viewport pivots the shark to face that direction and aligns the camera behind.
      if (player.clickTurnTimer > 0) {
        if (camState.isLeftDragging || camState.isRightDragging) {
          player.clickTurnTimer = 0;
        } else {
          player.clickTurnTimer = Math.max(0, player.clickTurnTimer - dt);
          const targetRotY = typeof player.clickTurnYaw === 'number' ? player.clickTurnYaw : player.rotY;
          let rotDiff = targetRotY - player.rotY;
          while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
          while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
          if (Math.abs(rotDiff) < 0.015) {
            player.rotY = targetRotY;
          } else {
            player.rotY += rotDiff * Math.min(1.0, dt * 16.0);
          }

          const desiredCamYaw = Math.atan2(-Math.sin(targetRotY), -Math.cos(targetRotY));
          let camDiff = desiredCamYaw - camState.yaw;
          while (camDiff > Math.PI) camDiff -= Math.PI * 2;
          while (camDiff < -Math.PI) camDiff += Math.PI * 2;
          if (Math.abs(camDiff) < 0.015) {
            camState.yaw = desiredCamYaw;
            player.clickTurnTimer = 0;
          } else {
            camState.yaw += camDiff * Math.min(1.0, dt * 13.5);
            while (camState.yaw > Math.PI) camState.yaw -= Math.PI * 2;
            while (camState.yaw < -Math.PI) camState.yaw += Math.PI * 2;
          }
        }
      }

      // Pass 82B: If camera was orbited in Free-Look (Alt + Drag), pressing Forward (W) turns the shark to match the camera!
      if (moveForward > 0 && camState.hasFreeLookOffset && !camState.isLeftDown && !camState.isRightDown) {
        player.rotY = Math.atan2(-Math.sin(camState.yaw), -Math.cos(camState.yaw));
        camState.hasFreeLookOffset = false;
      }

      // Keyboard Turning & Strafing:
      // ArrowLeft / ArrowRight always turn the shark & camera; A / D either Strafe (default) or Turn (Classic Turn mode)
      const useClassicTurn = (gameSettings && gameSettings.adTurnMode === 'turn') && !camState.isRightDown && !camState.isRightDragging;
      let turnDir = 0;
      if (keys['arrowright'] || (useClassicTurn && keys['d'])) turnDir += 1;
      if (keys['arrowleft'] || (useClassicTurn && keys['a'])) turnDir -= 1;
      if (turnDir !== 0) {
        player.clickTurnTimer = 0;
        camState.yaw -= turnDir * 2.65 * dt;
        while (camState.yaw > Math.PI) camState.yaw -= Math.PI * 2;
        while (camState.yaw < -Math.PI) camState.yaw += Math.PI * 2;
        player.rotY = Math.atan2(-Math.sin(camState.yaw), -Math.cos(camState.yaw));
      }
      if (!useClassicTurn) {
        if (keys['d']) moveRight += 1;
        if (keys['a']) moveRight -= 1;
      }
    }

    const isMoving = moveForward !== 0 || moveRight !== 0;

    if (player.ridingWithPartner && coopPartner.active && coopPartner.inBoat && coopPartner.mesh) {
      const pPos = coopPartner.mesh.position;
      const pRot = coopPartner.mesh.rotation.y;
      player.pos.set(pPos.x + Math.sin(pRot) * 1.65, pPos.y, pPos.z + Math.cos(pRot) * 1.65);
      player.rotY = pRot;
      if (keys[' ']) {
        player.ridingWithPartner = false;
        player.velY = 7.5;
        player.isGrounded = false;
      }
    } else {
      if (player.ridingWithPartner && (!coopPartner.active || !coopPartner.inBoat)) {
        player.ridingWithPartner = false;
      }

      const onRoad = !player.inBoat && currentZone === 'island' && worldApi.isOnIslandRoad && worldApi.isOnIslandRoad(player.pos.x, player.pos.z);
      const roadBoost = onRoad ? 1.18 : 1.0;
      const teaAgilityBoost = (player.teaBuffTimer > 0) ? 1.15 : 1.0;
      if (player.launderedBuffTimer > 0) {
        player.launderedBuffTimer = Math.max(0, player.launderedBuffTimer - dt);
      }
      const boatTierBoost = (player.inBoat && window.BlahajHomestead && typeof window.BlahajHomestead.getBoatSpeedMultiplier === 'function')
        ? window.BlahajHomestead.getBoatSpeedMultiplier()
        : 1.0;
      const grottoSpeedBoost = (window.BlahajHomestead && window.BlahajHomestead.hasGrottoBuff && window.BlahajHomestead.hasGrottoBuff()) ? 1.25 : 1.0;
      const speedMult = (player.unlockedUpgrades.has('turbo_fins') ? 1.35 : 1.0) * roadBoost * teaAgilityBoost * boatTierBoost * grottoSpeedBoost;
      const baseSpeed = player.inBoat ? 24.0 : (keys['shift'] ? 16.5 : 10.8);
      const speed = baseSpeed * speedMult;

      if (currentZone !== 'spawning_pits' && window.BlahajSpawningPits && typeof window.BlahajSpawningPits.clearDisguiseAndTrolley === 'function') {
        if (
          (window.BlahajSpawningPits.isRidingTrolley && window.BlahajSpawningPits.isRidingTrolley()) ||
          (window.BlahajSpawningPits.isBoxDisguised && window.BlahajSpawningPits.isBoxDisguised()) ||
          (window.BlahajSpawningPits.isPlayingPlushie && window.BlahajSpawningPits.isPlayingPlushie())
        ) {
          window.BlahajSpawningPits.clearDisguiseAndTrolley(player.mesh);
        }
      }

      if (currentZone === 'volcano' && window.BlahajVolcano) {
        if (isMoving) {
          const fwdX = -Math.sin(camState.yaw);
          const fwdZ = -Math.cos(camState.yaw);
          const rightX = Math.cos(camState.yaw);
          const rightZ = -Math.sin(camState.yaw);

          const dirX = fwdX * moveForward + rightX * moveRight;
          const dirZ = fwdZ * moveForward + rightZ * moveRight;
          const len = Math.sqrt(dirX * dirX + dirZ * dirZ) || 1;

          const rawNext = {
            x: player.pos.x + (dirX / len) * speed * dt,
            z: player.pos.z + (dirZ / len) * speed * dt
          };

          const resolved = window.BlahajVolcano.resolveMove(player.pos, rawNext, player.isGrounded);
          if (resolved && !isNaN(resolved.x) && !isNaN(resolved.z)) {
            player.pos.x = resolved.x;
            player.pos.z = resolved.z;
          }

          const targetAngle = Math.atan2(dirX / len, dirZ / len);
          let diff = targetAngle - player.rotY;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          player.rotY += diff * Math.min(1, dt * 12);

          if (player.isGrounded) {
            CozyAudio.footstep(false, true);
          }
        }

        const floorY = window.BlahajVolcano.getFloorHeight(player.pos.x, player.pos.z, player.pos.y);
        if (floorY > -500 && player.pos.y >= floorY - 0.45) {
          if (!player.isGrounded || player.pos.y > floorY + 0.05) {
            player.velY -= 24.0 * dt;
            player.pos.y += player.velY * dt;
            if (player.pos.y <= floorY) {
              if (player.velY < -15.0) {
                const impactMange = Math.min(0.06, (-player.velY - 15.0) * 0.0035);
                adjustSharkMange(player.sharkId, impactMange, 'Hard Fall');
                spawnFloatingBurst(player.pos, 0xd0c4b8, 10);
              }
              player.pos.y = floorY;
              player.velY = 0;
              player.isGrounded = true;
              player.canDoubleJump = true;
              player.doubleJumped = false;
              player.coyoteTimer = 0.15;
            }
          } else {
            player.pos.y = floorY;
            player.velY = 0;
            player.isGrounded = true;
            player.canDoubleJump = true;
            player.doubleJumped = false;
            player.coyoteTimer = 0.15;
          }
        } else {
          player.velY -= 24.0 * dt;
          player.pos.y += player.velY * dt;
          player.isGrounded = false;
          player.coyoteTimer = Math.max(0, player.coyoteTimer - dt);
        }

        if (player.pos.z < -362 && player.pos.y < -8.2) {
          triggerVolcanoCraterMeltdown('Volcano Overlook Crater Lake');
        } else if (player.pos.y < window.BlahajVolcano.constants.LAVA_Y - 2.2) {
          handleVolcanoTrapHit('Molten Lava Sea');
        }
      } else if (currentZone === 'spherical_foods' && window.BlahajSphericalFoods) {
        if (isMoving) {
          const fwdX = -Math.sin(camState.yaw);
          const fwdZ = -Math.cos(camState.yaw);
          const rightX = Math.cos(camState.yaw);
          const rightZ = -Math.sin(camState.yaw);

          const dirX = fwdX * moveForward + rightX * moveRight;
          const dirZ = fwdZ * moveForward + rightZ * moveRight;
          const len = Math.sqrt(dirX * dirX + dirZ * dirZ) || 1;
          const normDirX = dirX / len;
          const normDirZ = dirZ / len;

          const nextX = player.pos.x + normDirX * speed * dt;
          const nextZ = player.pos.z + normDirZ * speed * dt;

          // Keep player inside the dining rotunda (Radius 13.5m) or south door threshold
          const dCenter = Math.hypot(nextX, nextZ);
          if (dCenter < 13.5 || (Math.abs(nextX) < 1.8 && nextZ < 13.8)) {
            player.pos.x = nextX;
            player.pos.z = nextZ;
          }

          const targetAngle = Math.atan2(normDirX, normDirZ);
          let diff = targetAngle - player.rotY;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          player.rotY += diff * Math.min(1, dt * 12);

          if (player.isGrounded) {
            CozyAudio.footstep(false, false);
          }
        }

        const floorY = window.BlahajSphericalFoods.getFloorHeight(player.pos.x, player.pos.z, player.pos.y);
        if (player.pos.y > floorY + 0.05) {
          player.velY -= 22.0 * dt;
          player.pos.y += player.velY * dt;
          if (player.pos.y <= floorY) {
            player.pos.y = floorY;
            player.velY = 0;
            player.isGrounded = true;
          }
        } else {
          player.pos.y = floorY;
          player.velY = 0;
          player.isGrounded = true;
        }
      } else if (currentZone === 'laundromat' && window.BlahajLaundromat) {
        if (window.BlahajLaundromat.isSpinCycleActive()) {
          // Inside spinning drum - mesh and position driven by laundromat animation engine
          player.velY = 0;
          player.isGrounded = true;
          return;
        }

        // Active Laundry Cart Racer handling
        if (player.inCart) {
          window.BlahajLaundromat.updateOccupiedCart(dt, keys, camState);
          const occ = window.BlahajLaundromat.getOccupiedCart();
          if (occ) {
            const bounceHopY = Math.abs(Math.sin(occ.bounceSpring * Math.PI)) * 0.05;
            player.pos.set(occ.pos.x, 0.38 + bounceHopY, occ.pos.z);
            player.rotY = occ.rotY;
            if (player.mesh) {
              player.mesh.position.set(occ.pos.x, 0.38 + bounceHopY, occ.pos.z);
              player.mesh.rotation.order = 'XYZ';
              player.mesh.rotation.set(
                occ.bouncePitch * 0.65,
                occ.rotY,
                occ.rollAngle + occ.bounceRoll * 0.65
              );
            }
            if (CozyAudio.updateCartRoll) {
              CozyAudio.updateCartRoll(occ.speed, dt);
            }
          }
        } else {
          // --- CAT / SHARKITTY ON-FOOT BOUNCY COLLISION PHYSICS ---
        // Decay cat bouncy recoil impulses, spring tilt, and hop
        player.laundromatBounceVx = (player.laundromatBounceVx || 0) * Math.max(0, 1.0 - dt * 8.0);
        player.laundromatBounceVz = (player.laundromatBounceVz || 0) * Math.max(0, 1.0 - dt * 8.0);
        player.laundromatBounceHop = Math.max(0, (player.laundromatBounceHop || 0) - dt * 7.0);
        player.laundromatBouncePitch = (player.laundromatBouncePitch || 0) * Math.max(0, 1.0 - dt * 9.0);

        // Apply active bounce recoil to player position
        if (Math.abs(player.laundromatBounceVx) > 0.05 || Math.abs(player.laundromatBounceVz) > 0.05) {
          const rawBounceNext = {
            x: player.pos.x + player.laundromatBounceVx * dt,
            z: player.pos.z + player.laundromatBounceVz * dt
          };
          const bResolved = window.BlahajLaundromat.resolveMove(player.pos, rawBounceNext, player.isGrounded, 0.35);
          if (bResolved) {
            player.pos.x = bResolved.x;
            player.pos.z = bResolved.z;
          }
        }

        if (isMoving) {
          const fwdX = -Math.sin(camState.yaw);
          const fwdZ = -Math.cos(camState.yaw);
          const rightX = Math.cos(camState.yaw);
          const rightZ = -Math.sin(camState.yaw);

          const dirX = fwdX * moveForward + rightX * moveRight;
          const dirZ = fwdZ * moveForward + rightZ * moveRight;
          const len = Math.sqrt(dirX * dirX + dirZ * dirZ) || 1;
          const normDirX = dirX / len;
          const normDirZ = dirZ / len;

          const rawNext = {
            x: player.pos.x + normDirX * speed * dt,
            z: player.pos.z + normDirZ * speed * dt
          };

          const resolved = window.BlahajLaundromat.resolveMove(player.pos, rawNext, player.isGrounded, 0.35);
          if (resolved && !isNaN(resolved.x) && !isNaN(resolved.z)) {
            const blockedX = Math.abs(resolved.x - rawNext.x) > 0.005;
            const blockedZ = Math.abs(resolved.z - rawNext.z) > 0.005;

            // Gentle cartoon bumper bounce when cat runs into washing machines, dryers, tables, chairs or walls!
            if ((blockedX || blockedZ) && speed > 2.2) {
              const bounceSpeed = Math.min(4.2, speed * 0.48);
              if (blockedX) {
                player.laundromatBounceVx = -Math.sign(normDirX) * bounceSpeed;
              }
              if (blockedZ) {
                player.laundromatBounceVz = -Math.sign(normDirZ) * bounceSpeed;
              }
              player.laundromatBounceHop = 1.0;
              player.laundromatBouncePitch = -0.22;
              player.velY = Math.max(player.velY, 2.8); // Playful plush hop

              if (window.CozyAudio && typeof window.CozyAudio.catBounce === 'function') {
                window.CozyAudio.catBounce(speed * 0.45);
              } else if (window.CozyAudio && typeof window.CozyAudio.cartBump === 'function') {
                window.CozyAudio.cartBump(speed * 0.45);
              }

              if (window.BlahajLaundromat && typeof window.BlahajLaundromat.spawnCartBumpParticles === 'function') {
                const px = blockedX ? resolved.x + Math.sign(normDirX) * 0.35 : resolved.x;
                const pz = blockedZ ? resolved.z + Math.sign(normDirZ) * 0.35 : resolved.z;
                window.BlahajLaundromat.spawnCartBumpParticles({ x: px, y: player.pos.y + 0.45, z: pz }, 0x93c5fd, 9);
              }
            }

            player.pos.x = resolved.x;
            player.pos.z = resolved.z;
          }

          const targetAngle = Math.atan2(dirX / len, dirZ / len);
          let diff = targetAngle - player.rotY;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          player.rotY += diff * Math.min(1, dt * 12);

          if (player.isGrounded) {
            CozyAudio.footstep(false, true);
          }
        }

        const floorY = window.BlahajLaundromat.getFloorHeight(player.pos.x, player.pos.z, player.pos.y);
        if (player.pos.y >= floorY - 0.45) {
          if (!player.isGrounded || player.pos.y > floorY + 0.05) {
            player.velY -= 24.0 * dt;
            player.pos.y += player.velY * dt;
            if (player.pos.y <= floorY) {
              player.pos.y = floorY;
              player.velY = 0;
              player.isGrounded = true;
              player.canDoubleJump = true;
              player.doubleJumped = false;
              player.coyoteTimer = 0.15;
            }
          } else {
            player.pos.y = floorY;
            player.velY = 0;
            player.isGrounded = true;
            player.canDoubleJump = true;
            player.doubleJumped = false;
            player.coyoteTimer = 0.15;
          }
        } else {
          player.velY -= 24.0 * dt;
          player.pos.y += player.velY * dt;
          player.isGrounded = false;
          player.coyoteTimer = Math.max(0, player.coyoteTimer - dt);
        }
        }
      } else if (currentZone === 'sea_cave' && window.BlahajHomestead) {
        if (isMoving) {
          const fwdX = -Math.sin(camState.yaw);
          const fwdZ = -Math.cos(camState.yaw);
          const rightX = Math.cos(camState.yaw);
          const rightZ = -Math.sin(camState.yaw);
          const dirX = fwdX * moveForward + rightX * moveRight;
          const dirZ = fwdZ * moveForward + rightZ * moveRight;
          const len = Math.sqrt(dirX * dirX + dirZ * dirZ) || 1;
          const normDirX = dirX / len;
          const normDirZ = dirZ / len;
          const rawNext = {
            x: player.pos.x + normDirX * speed * dt,
            y: player.pos.y,
            z: player.pos.z + normDirZ * speed * dt
          };
          const resolved = window.BlahajHomestead.resolveMove(player.pos, rawNext);
          player.pos.x = resolved.x;
          player.pos.z = resolved.z;
          const targetAngle = Math.atan2(normDirX, normDirZ);
          let diff = targetAngle - player.rotY;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          player.rotY += diff * Math.min(1, dt * 12);
          if (player.isGrounded) CozyAudio.footstep(false, true);
        }
        const floorY = window.BlahajHomestead.getFloorHeight(player.pos.x, player.pos.z);
        if (player.pos.y > floorY + 0.05 || !player.isGrounded) {
          player.velY -= 24.0 * dt;
          player.pos.y += player.velY * dt;
          if (player.pos.y <= floorY) {
            player.pos.y = floorY;
            player.velY = 0;
            player.isGrounded = true;
            player.canDoubleJump = true;
            player.doubleJumped = false;
            player.coyoteTimer = 0.15;
          }
        } else {
          player.pos.y = floorY;
          player.velY = 0;
          player.isGrounded = true;
        }
      } else if (currentZone === 'spawning_pits' && window.BlahajSpawningPits) {
        const trolleyBoost = (window.BlahajSpawningPits.isRidingTrolley && window.BlahajSpawningPits.isRidingTrolley()) ? 1.65 : 1.0;
        if (isMoving) {
          if (window.BlahajSpawningPits.isPlayingPlushie && window.BlahajSpawningPits.isPlayingPlushie()) {
            window.BlahajSpawningPits.togglePlayPlushie(player.mesh, false);
          }
          const fwdX = -Math.sin(camState.yaw);
          const fwdZ = -Math.cos(camState.yaw);
          const rightX = Math.cos(camState.yaw);
          const rightZ = -Math.sin(camState.yaw);

          const dirX = fwdX * moveForward + rightX * moveRight;
          const dirZ = fwdZ * moveForward + rightZ * moveRight;
          const len = Math.sqrt(dirX * dirX + dirZ * dirZ) || 1;
          const normDirX = dirX / len;
          const normDirZ = dirZ / len;

          const rawNext = {
            x: player.pos.x + normDirX * speed * trolleyBoost * dt,
            z: player.pos.z + normDirZ * speed * trolleyBoost * dt
          };
          const resolved = window.BlahajSpawningPits.resolveMove(player.pos, rawNext, player.isGrounded, 0.95);
          if (resolved && !isNaN(resolved.x) && !isNaN(resolved.z)) {
            player.pos.x = resolved.x;
            player.pos.z = resolved.z;
          }

          const targetAngle = Math.atan2(normDirX, normDirZ);
          let diff = targetAngle - player.rotY;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          player.rotY += diff * Math.min(1, dt * 12);

          if (player.isGrounded) {
            CozyAudio.footstep(false, true);
          }
        }

        const floorY = window.BlahajSpawningPits.getFloorHeight(player.pos.x, player.pos.z, player.pos.y);
        if (player.pos.y > floorY + 0.05 || !player.isGrounded) {
          player.velY -= 24.0 * dt;
          player.pos.y += player.velY * dt;
          if (player.pos.y <= floorY) {
            player.pos.y = floorY;
            player.velY = 0;
            player.isGrounded = true;
            player.canDoubleJump = true;
            player.doubleJumped = false;
            player.coyoteTimer = 0.15;
          }
        } else {
          player.pos.y = floorY;
          player.velY = 0;
          player.isGrounded = true;
          player.canDoubleJump = true;
          player.doubleJumped = false;
          player.coyoteTimer = 0.15;
        }
      } else if (currentZone === 'volleyball' && window.BlahajVolleyball) {
        if (isMoving) {
          const fwdX = -Math.sin(camState.yaw);
          const fwdZ = -Math.cos(camState.yaw);
          const rightX = Math.cos(camState.yaw);
          const rightZ = -Math.sin(camState.yaw);

          const dirX = fwdX * moveForward + rightX * moveRight;
          const dirZ = fwdZ * moveForward + rightZ * moveRight;
          const len = Math.sqrt(dirX * dirX + dirZ * dirZ) || 1;
          const normDir = { x: dirX / len, z: dirZ / len };

          const resolved = window.BlahajVolleyball.resolveMove(player.pos, normDir, speed * dt);
          if (resolved && !isNaN(resolved.x) && !isNaN(resolved.z)) {
            player.pos.x = resolved.x;
            player.pos.z = resolved.z;
          }

          const targetAngle = Math.atan2(dirX / len, dirZ / len);
          let diff = targetAngle - player.rotY;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          player.rotY += diff * Math.min(1, dt * 12);

          if (player.isGrounded) {
            CozyAudio.footstep(false, false);
          }
        }

        const floorY = window.BlahajVolleyball.getFloorHeight(player.pos.x, player.pos.z);
        if (player.pos.y >= floorY - 0.45) {
          if (!player.isGrounded || player.pos.y > floorY + 0.05) {
            player.velY -= 24.0 * dt;
            player.pos.y += player.velY * dt;
            if (player.pos.y <= floorY) {
              player.pos.y = floorY;
              player.velY = 0;
              player.isGrounded = true;
              player.canDoubleJump = true;
              player.doubleJumped = false;
              player.coyoteTimer = 0.15;
            }
          } else {
            player.pos.y = floorY;
            player.velY = 0;
            player.isGrounded = true;
            player.canDoubleJump = true;
            player.doubleJumped = false;
            player.coyoteTimer = 0.15;
          }
        } else {
          player.velY -= 24.0 * dt;
          player.pos.y += player.velY * dt;
          player.isGrounded = false;
          player.coyoteTimer = Math.max(0, player.coyoteTimer - dt);
        }
      } else {
        if (isMoving) {
          const fwdX = -Math.sin(camState.yaw);
          const fwdZ = -Math.cos(camState.yaw);
          const rightX = Math.cos(camState.yaw);
          const rightZ = -Math.sin(camState.yaw);

          const dirX = fwdX * moveForward + rightX * moveRight;
          const dirZ = fwdZ * moveForward + rightZ * moveRight;
          const len = Math.sqrt(dirX * dirX + dirZ * dirZ) || 1;

          let nx = player.pos.x + (dirX / len) * speed * dt;
          let nz = player.pos.z + (dirZ / len) * speed * dt;

          // Expanded bounds covering Main Island, Volcano Peninsula, 4 Outer Islands, and the Deep Ocean Shelf!
          if (Math.abs(nx) < 380 && Math.abs(nz) < 380) {
            // Non-interference spectator boundary for Crescent Beach Volleyball
            if (window.BlahajVolleyball && window.BlahajVolleyball.isSpectating()) {
              const spectCheck = window.BlahajVolleyball.constrainSpectatorPosition(player.pos, nx, nz);
              if (spectCheck.blocked) {
                nx = spectCheck.x;
                nz = spectCheck.z;
                if (!player._lastSpectatorBoundaryToast || Date.now() - player._lastSpectatorBoundaryToast > 4000) {
                  player._lastSpectatorBoundaryToast = Date.now();
                  showToast('👀 SPECTATOR SIDELINE', 'Cheering on your partner from the sidelines! Non-interference zone protects the court.');
                }
              }
            }

            const nextGroundY = worldApi.getTerrainHeight(nx, nz);
            if (player.inBoat) {
              if (nextGroundY < 0.85) {
                player.pos.x = nx;
                player.pos.z = nz;
              }
            } else {
              // Solid prop & shark collision resolution (prevents clipping through trees, Shonkbird Atoll crags/console, parked UFO, & sharks!)
              if (worldApi && typeof worldApi.resolveWorldCollisions === 'function') {
                const wRes = worldApi.resolveWorldCollisions(nx, nz, player.pos.y, 0.72);
                nx = wRes.x;
                nz = wRes.z;
              }
              if (window.BlahajUFO && typeof window.BlahajUFO.resolveCollision === 'function') {
                const uRes = window.BlahajUFO.resolveCollision(nx, nz, player.pos.y, 0.75);
                nx = uRes.x;
                nz = uRes.z;
              }
              // Soft plush separation against NPC & Co-op sharks on the same level
              const sharkSep = (otherPos) => {
                if (!otherPos || Math.abs(otherPos.y - player.pos.y) > 1.8) return;
                const sdx = nx - otherPos.x;
                const sdz = nz - otherPos.z;
                const sd = Math.hypot(sdx, sdz);
                const minSep = 1.18;
                if (sd < minSep && sd > 0.001) {
                  nx += (sdx / sd) * (minSep - sd);
                  nz += (sdz / sd) * (minSep - sd);
                }
              };
              for (let ai = 0; ai < worldActors.length; ai++) {
                const act = worldActors[ai];
                if (act && act.mesh && act.mesh.visible) sharkSep(act.mesh.position);
              }
              if (coopPartner && coopPartner.active && coopPartner.mesh && coopPartner.mesh.visible && !coopPartner.inBoat) {
                sharkSep(coopPartner.mesh.position);
              }
              player.pos.x = nx;
              player.pos.z = nz;
            }
          }

          // In Tab-Target MMO mode, strafing (A/D), backpedaling (S), or holding Right-Click keeps your shark facing forward!
          const keepForwardFacing = camState.isRightDown || camState.isRightDragging || camState.isChordMoving || moveForward < 0 || (moveForward === 0 && moveRight !== 0);
          const targetAngle = keepForwardFacing
            ? Math.atan2(fwdX, fwdZ)
            : Math.atan2(dirX / len, dirZ / len);
          let diff = targetAngle - player.rotY;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          player.rotY += diff * Math.min(1, dt * 14);

          // Footstep sounds when walking on land
          if (!player.inBoat && player.isGrounded) {
            const isShallow = player.pos.y < 0.65;
            CozyAudio.footstep(isShallow, onRoad);
          }
        }

        if (player.inBoat) {
          const boat = worldApi.getBoatMesh();
          if (boat) {
            boat.position.x = player.pos.x;
            boat.position.z = player.pos.z;
            boat.rotation.y = player.rotY;
            player.pos.y = boat.position.y + 0.88;
          }
          player.inWater = false;
          player.isSwimming = false;
        } else {
          // Walk across natural terrain & player structures, or swim through dynamic ocean depths!
          const groundY = worldApi.getGroundAndStructureHeight(player.pos.x, player.pos.z, player.pos.y);

          // Main Island Overworld Volcano Caldera Crater:
          // Falling into the open volcano crater magma lake triggers the slapstick meltdown & IKEA rebirth!
          const vCfg = (worldApi && worldApi.VOLCANO) || { x: -28, z: -235, lavaRadius: 34, lavaY: 26.0 };
          if (!isRebirthing && !player.inUFO &&
              Math.hypot(player.pos.x - vCfg.x, player.pos.z - vCfg.z) < (vCfg.lavaRadius - 1.0) &&
              player.pos.y <= vCfg.lavaY + 1.8) {
            triggerVolcanoCraterMeltdown('Overworld Volcano Caldera Crater');
          }
          const waterSurfaceY = worldApi.getWaveHeight(player.pos.x, player.pos.z, elapsed);
          player.waterSurfaceY = waterSurfaceY;

          const wasInWater = player.inWater;
          // Player is in water when below wave crest and ground is deeper than shallows
          player.inWater = player.pos.y < waterSurfaceY + 0.35 && groundY < waterSurfaceY - 0.25;
          // Full swimming mode when submerged or in deeper waters
          player.isSwimming = player.inWater && (player.pos.y < waterSurfaceY - 0.15 || groundY < waterSurfaceY - 1.2);

          // Water entry & breach splash! (Suppress during initial 1.5s spawn settle so spawning near shore never bangs)
          if (!wasInWater && player.inWater) {
            if (elapsed > 1.5) {
              CozyAudio.waterSplash(0.22, 0.32);
              spawnUnderwaterBubbles(player.pos, 8);
              spawnWaterBreachSplash(player.pos, 0.95, waterSurfaceY);
            }
            player.velY *= 0.35; // Water resistance absorbs downward velocity
          } else if (wasInWater && !player.inWater && player.velY > 2.2) {
            CozyAudio.waterSplash(0.26, 0.36);
            spawnWaterBreachSplash(player.pos, 1.25, waterSurfaceY);
          }

          if (player.isSwimming) {
            // --- 3D BUOYANT SWIMMING PHYSICS ---
            const swimBoost = player.unlockedUpgrades.has('super_plush_hop') ? 1.25 : 1.0;

            // 1. Natural plush buoyancy gently lifting shark toward water surface
            const submergedDepth = waterSurfaceY - player.pos.y;
            const naturalBuoyancy = Math.max(-2.0, Math.min(6.5, submergedDepth * 3.2));
            player.velY += naturalBuoyancy * dt;

            // 2. Active swimming controls:
            // [Space] paddles UP vigorously
            const holdingSpace = keys[' '] || keys['space'];
            if (holdingSpace) {
              player.velY = Math.min(8.5, player.velY + 16.0 * dt * swimBoost);
            }

            // [Shift] or [C] (when not builder mode) dives DOWN
            const holdingDive = keys['shift'] || (!builderState.active && (keys['c'] || keys['z']));
            if (holdingDive) {
              player.velY = Math.max(-7.5, player.velY - 16.0 * dt * swimBoost);
            }

            // Pitch diving: swimming forward while looking downward angles dive toward seabed
            if (moveForward > 0 && camState.pitch > 0.12) {
              player.velY = Math.max(-7.0, player.velY - camState.pitch * 9.0 * dt);
            }

            // 3. Hydrodynamic drag damping
            player.velY *= Math.max(0.0, 1.0 - 3.2 * dt);
            player.pos.y += player.velY * dt;

            // 4. Seabed collision: resting or scuttling on the sandy/rocky ocean floor!
            if (player.pos.y <= groundY) {
              player.pos.y = groundY;
              if (player.velY < 0) player.velY = 0;
              player.isGrounded = true;
              player.canDoubleJump = true;
              player.doubleJumped = false;
              player.coyoteTimer = 0.15;
            } else {
              player.isGrounded = false;
            }

            // 5. Breaching the surface: if leaping upward past the wave crest, launch into air with spray!
            if (player.pos.y > waterSurfaceY && player.velY > 4.2) {
              CozyAudio.waterSplash(0.24, 0.32);
              spawnUnderwaterBubbles(player.pos, 6);
              spawnWaterBreachSplash(player.pos, 1.25, waterSurfaceY);
              if (player.mesh && player.mesh.userData) {
                player.mesh.userData.flipTimer = 0.45;
              }
            }

            // Periodic bubble stream while swimming submerged
            player.bubbleTimer = (player.bubbleTimer || 0) + dt;
            if (player.bubbleTimer > 0.35 && isMoving && submergedDepth > 0.4) {
              player.bubbleTimer = 0;
              spawnUnderwaterBubbles(player.pos, 2);
            }

            // Marine Bathing / Ocean Saltwater Cleanse:
            // Swimming in the clean ocean washes away soot & scuffs!
            player.swimCleanseTimer = (player.swimCleanseTimer || 0) + dt;
            if (player.swimCleanseTimer >= 10.0 && (!player.lastSwimCleanseTime || elapsed - player.lastSwimCleanseTime > 45.0)) {
              player.lastSwimCleanseTime = elapsed;
              const cleaned = adjustSharkMange(player.sharkId, -0.05, 'Ocean Bath');
              CozyAudio.waterSplash(0.12, 0.35);
              showToast('SALTWATER OCEAN CLEANSE 🌊', `Swimming in the clean sea washed away soot and groomed your fleece! (-5% Mange · Now ${Math.round(cleaned * 100)}%)`);
              addChatLog(`🌊 Clean ocean waves refreshed <strong>${LORE.sharks[player.sharkId].name}</strong>'s fleece (Mange: ${Math.round(cleaned * 100)}%).`, 'success');
            }

            // Check Pelagic Current (edge of charted deep ocean shelf)
            const dCoast = (worldApi && typeof worldApi.getDistanceToNearestCoast === 'function')
              ? worldApi.getDistanceToNearestCoast(player.pos.x, player.pos.z)
              : 0;

            if (dCoast > 115.0) {
              showVolcanoHUDNotice('pelagic_current');
              // Oceanic counter-current blowing player back toward the island shores
              const lenToCenter = Math.hypot(player.pos.x, player.pos.z - 12) || 1;
              const pushSpeed = Math.min(13.0, 7.5 + (dCoast - 115.0) * 1.8);
              player.pos.x -= (player.pos.x / lenToCenter) * pushSpeed * dt;
              player.pos.z -= ((player.pos.z - 12) / lenToCenter) * pushSpeed * dt;
              if (Math.random() < 0.25) {
                spawnUnderwaterBubbles(player.pos, 3);
              }
            } else if (dCoast < 85.0) {
              shownVolcanoNotices.delete('pelagic_current');
            }
          } else {
            // --- TERRESTRIAL GRAVITY & WALKING ON LAND / SHALLOWS ---
            if (!player.isGrounded || player.pos.y > groundY + 0.05) {
              player.velY -= 22.0 * dt;
              player.pos.y += player.velY * dt;
              if (player.pos.y <= groundY) {
                if (player.velY < -15.0) {
                  const impactMange = Math.min(0.06, (-player.velY - 15.0) * 0.0035);
                  adjustSharkMange(player.sharkId, impactMange, 'Hard Fall');
                  spawnFloatingBurst(player.pos, 0xd0c4b8, 10);
                }
                player.pos.y = groundY;
                player.velY = 0;
                player.isGrounded = true;
                player.canDoubleJump = true;
                player.doubleJumped = false;
                player.coyoteTimer = 0.15;
              }
            } else {
              player.pos.y = groundY;
              player.velY = 0;
              player.isGrounded = true;
              player.canDoubleJump = true;
              player.doubleJumped = false;
              player.coyoteTimer = 0.15;
            }
            if (!player.isGrounded) {
              player.coyoteTimer = Math.max(0, player.coyoteTimer - dt);
            }
          }
        }
      }
    }

    // Gradual exploration wear-and-tear: active adventure gently scuffs plush coat over time
    if (isMoving && !player.inBoat && player.teaBuffTimer <= 0) {
      player.wearTimer = (player.wearTimer || 0) + dt;
      if (player.wearTimer >= 150.0) {
        player.wearTimer = 0;
        adjustSharkMange(player.sharkId, 0.01, 'Wear & Tear');
      }
    } else if (!isMoving) {
      player.wearTimer = Math.max(0, (player.wearTimer || 0) - dt * 0.5);
    }

    if (player.unlockedUpgrades.has('kevlar_stitching') && player.warmth < 100) {
      player.warmth = Math.min(100, player.warmth + dt * 4.0);
      updateMetersUI();
    }

    if (player.mesh) {
      if (currentZone === 'laundromat' && window.BlahajLaundromat && window.BlahajLaundromat.isSpinCycleActive()) {
        // Player mesh position, rotation, and comical glass-squash scaling are driven entirely by laundromat spin cycle engine!
        return;
      }
      if (currentZone === 'laundromat' && !player.inCart) {
        const catHopY = player.laundromatBounceHop ? Math.abs(Math.sin(player.laundromatBounceHop * Math.PI)) * 0.08 : 0;
        player.mesh.position.set(player.pos.x, player.pos.y + catHopY, player.pos.z);
        player.mesh.rotation.order = 'XYZ';
        player.mesh.rotation.set(player.laundromatBouncePitch || 0, player.rotY, 0);
      } else {
        player.mesh.position.copy(player.pos);
      }
      if (player.inBoat) {
        const boat = worldApi.getBoatMesh();
        if (boat) {
          player.mesh.rotation.order = 'YXZ';
          player.mesh.rotation.y = player.rotY;
          player.mesh.rotation.x = boat.rotation.x * 0.82;
          player.mesh.rotation.z = boat.rotation.z * 0.82;
        } else {
          player.mesh.rotation.order = 'XYZ';
          player.mesh.rotation.set(0, player.rotY, 0);
        }
      } else if (player.inCart) {
        // Mesh rotation handled in laundromat cart racer updater
      } else {
        player.mesh.rotation.order = 'XYZ';
        player.mesh.rotation.set(0, player.rotY, 0);
      }
      window.BlahajModels.animateShark(player.mesh, dt, isMoving && !player.inBoat && !player.inCart && !player.ridingWithPartner, elapsed, player.isSwimming, player.velY);
    }

    worldActors.forEach((act) => {
      if (act.mesh && act.mesh.visible) {
        window.BlahajModels.animateShark(act.mesh, dt, false, elapsed);
      }
    });

    netSyncTimer += dt;
    const inUfoNow = !!(player.inUFO || (window.BlahajUFO && typeof window.BlahajUFO.isLocalAboard === 'function' && window.BlahajUFO.isLocalAboard()));
    const occCart = (player.inCart && window.BlahajLaundromat) ? window.BlahajLaundromat.getOccupiedCart() : null;
    const cartMoving = occCart ? (Math.abs(occCart.speed) > 0.05) : false;
    const activelyMoving = !inUfoNow && (isMoving || cartMoving || player.inBoat);
    // Mobile-friendly tick rate: 0.11s (~9Hz) while actively moving on foot/boat/cart,
    // 3.0s keepalive while aboard UFO (since ufo_state carries position), and delta-skipped when standing still!
    const syncInterval = inUfoNow ? 0.45 : (activelyMoving ? 0.11 : 0.35);
    if (netSyncTimer > syncInterval) {
      const mmoPosture = (window.BlahajMMO && typeof window.BlahajMMO.getActivePosture === 'function')
        ? window.BlahajMMO.getActivePosture()
        : null;
      const playingPlushie = !!(window.BlahajSpawningPits && typeof window.BlahajSpawningPits.isPlayingPlushie === 'function' && window.BlahajSpawningPits.isPlayingPlushie());
      const rx = Number(player.pos.x.toFixed(2));
      const ry = Number(player.pos.y.toFixed(2));
      const rz = Number(player.pos.z.toFixed(2));
      const rRot = Number(player.rotY.toFixed(3));
      const heldId = playerHeldItem ? playerHeldItem.id : null;
      const postId = mmoPosture ? mmoPosture.id : null;
      const mangeVal = Number((window.__BLAHAJ_MANGE__ || 0).toFixed(3));

      const prev = update._lastSentMove;
      const nowMs = performance.now();
      const ufoRoleNow = (window.BlahajUFO && typeof window.BlahajUFO.getLocalRole === 'function')
        ? window.BlahajUFO.getLocalRole()
        : null;
      const unchanged = prev &&
        Math.abs(prev.x - rx) < 0.02 &&
        Math.abs(prev.y - ry) < 0.02 &&
        Math.abs(prev.z - rz) < 0.02 &&
        Math.abs(prev.rotY - rRot) < 0.02 &&
        prev.isMoving === activelyMoving &&
        prev.zone === currentZone &&
        prev.inUFO === inUfoNow &&
        prev.ufoRole === ufoRoleNow &&
        prev.heldItemId === heldId &&
        prev.activePostureId === postId &&
        prev.inBoat === !!player.inBoat &&
        prev.inCart === !!player.inCart &&
        prev.isLounging === !!player.isLounging &&
        prev.isSeatedInBooth === !!player.isSeatedInBooth &&
        prev.isPlayingPlushie === playingPlushie;

      netSyncTimer = 0;
      if (!unchanged || (nowMs - (prev ? prev.t : 0) > 1500)) {
        const myPlayerName = (window.BlahajSaveSystem && typeof window.BlahajSaveSystem.getMyAccountDisplayName === 'function')
          ? window.BlahajSaveSystem.getMyAccountDisplayName()
          : 'Partner';
        const pkt = {
          type: 'move',
          sharkId: player.sharkId,
          playerName: myPlayerName,
          x: rx,
          y: ry,
          z: rz,
          rotY: rRot,
          isMoving: activelyMoving,
          zone: currentZone,
          inUFO: inUfoNow,
          ufoRole: ufoRoleNow,
          mange: mangeVal
        };
        if (player.inBoat) pkt.inBoat = true;
        if (player.inCart) {
          pkt.inCart = true;
          pkt.cartId = player.cartId || null;
        }
        if (heldId) pkt.heldItemId = heldId;
        if (player.isLounging) {
          pkt.isLounging = true;
          pkt.loungeChairId = player.loungeChairId || null;
        }
        if (postId) pkt.activePostureId = postId;
        if (player.isSeatedInBooth) pkt.isSeatedInBooth = true;
        if (playingPlushie) pkt.isPlayingPlushie = true;

        update._lastSentMove = {
          t: nowMs,
          x: rx,
          y: ry,
          z: rz,
          rotY: rRot,
          isMoving: activelyMoving,
          zone: currentZone,
          inUFO: inUfoNow,
          ufoRole: ufoRoleNow,
          heldItemId: heldId,
          activePostureId: postId,
          inBoat: !!player.inBoat,
          inCart: !!player.inCart,
          isLounging: !!player.isLounging,
          isSeatedInBooth: !!player.isSeatedInBooth,
          isPlayingPlushie: playingPlushie
        };
        window.BlahajNetwork.send(pkt);
      }
    }
  }

  // ==========================================================================
  // DYNAMIC COLLISIONS: CARROTS, BEACH BALLS, BOUNCE PADS, PORTALS & TRAPS
  // ==========================================================================
  function updateDynamicCollisions(dt) {
    if (player.trapCooldown > 0) player.trapCooldown -= dt;
    if (player.dungeonPortalCooldown > 0) player.dungeonPortalCooldown -= dt;

    const knockMult = player.unlockedUpgrades.has('super_plush_hop') ? 1.85 : 1.0;

    // Inside the Volcano Instance: Check Volunteer Carrots on the Caldera Overlook
    if (currentZone === 'volcano' && window.BlahajVolcano) {
      const vCarrots = window.BlahajVolcano.getCarrots();
      vCarrots.forEach((c, idx) => {
        if (c && c.state === 'home') {
          const cPos = (c.mesh && c.mesh.position) || c.pos || c.home;
          if (!cPos) return;
          const dx = cPos.x - player.pos.x;
          const dz = cPos.z - player.pos.z;
          const d = Math.hypot(dx, dz);
          if (d < 2.35 && Math.abs(player.pos.y - cPos.y) < 2.2) {
            const pushDir = new THREE.Vector3(dx, 0, dz).normalize();
            if (pushDir.z > -0.25) pushDir.z = -0.75;
            const vx = pushDir.x * 12.0 * knockMult;
            const vy = 8.5 * knockMult;
            const vz = pushDir.z * 14.5 * knockMult;
            if (window.BlahajVolcano.knockCarrot(idx, vx, vy, vz)) {
              CozyAudio.carrotBoop();
              spawnFloatingBurst(cPos, 0xff7b1c, 12);
              player.carrotsKnockedCount++;
              if (player.carrotsKnockedCount >= 5) completeQuest('q-carrots');
              if (player.carrotsKnockedCount % 5 === 0) {
                player.trialPoints++;
                showToast('VOLUNTEER CARROT KNOCKED! (+1 TRIAL POINT) 🥕🌋', `Knocked ${player.carrotsKnockedCount} Carrots! Earned +1 Trial Point!`);
                addChatLog(`🥕🌋 <strong>${player.carrotsKnockedCount} Volunteer Carrots Knocked!</strong> Earned <strong>+1 Trial Point</strong>!`, 'system');
              } else {
                showToast('VOLUNTEER CARROT BUMPED! 🥕✨', 'Wheeee! Down into the caldera! (+1 Carrot Spark for Hiram)');
              }
              updateMetersUI();
              renderBuilderToolbar();
              window.BlahajNetwork.send({
                type: 'volcano_carrot_knock',
                idx, vx, vy, vz,
                carrotsKnockedCount: player.carrotsKnockedCount,
                trialPoints: player.trialPoints
              });
            }
          }
        }
      });
      return;
    }

    // Auto-enter Volcano Trial when stepping through the Rear Wharf Sea Cave Portal Arch
    if (currentZone === 'island' && !isTransitioningZone) {
      const dx = player.pos.x - (-28);
      if (Math.abs(dx) < 4.8 && player.pos.z > -186 && player.pos.z < -173 && player.pos.y < 8) {
        enterVolcanoTrial();
        return;
      }
    }

    // 0. Check Hiram's Player-Built Plush Bounce Pads & Linked Pocket Portals!
    worldApi.getBuiltStructures().forEach((st) => {
      const dx = player.pos.x - st.x;
      const dz = player.pos.z - st.z;
      const d = Math.hypot(dx, dz);
      if (st.type === 'bounce_pad' && d < 2.25 && Math.abs(player.pos.y - st.y) < 1.8) {
        player.velY = 18.5;
        player.isGrounded = false;
        CozyAudio.bounceBoing();
        spawnFloatingBurst(player.pos, 0xff7eb6, 12);
      } else if (st.type === 'pocket_portal' && d < 1.9 && player.dungeonPortalCooldown <= 0) {
        usePocketPortal(st);
      }
    });

    // 1. Knocking Beach-Shorts Carrots off the high Volcano Temple Balcony (or Hiram's spawned Domino Carrots!)
    worldApi.getBalconyCarrots().forEach((c, idx) => {
      if (!c.knockedOff) {
        const d = c.mesh.position.distanceTo(player.pos);
        if (d < 2.35) {
          c.knockedOff = true;
          c.respawnTimer = 9.5;
          const pushDir = c.mesh.position.clone().sub(player.pos).normalize();
          if (!c.structureId && pushDir.z > -0.25) pushDir.z = -0.75;
          c.vel.set(pushDir.x * 13.5 * knockMult, 9.5 * knockMult, pushDir.z * 15.0 * knockMult);

          CozyAudio.carrotBoop();
          spawnFloatingBurst(c.mesh.position, 0xff7b1c, 10);

          player.carrotsKnockedCount++;
          if (player.carrotsKnockedCount >= 5) {
            completeQuest('q-carrots');
          }
          if (player.carrotsKnockedCount % 5 === 0) {
            player.trialPoints++;
            showToast(
              'CARROT KNOCK-OFF STREAK! (+1 TRIAL POINT)',
              `Knocked ${player.carrotsKnockedCount} Carrots! Earned +1 Trial Point!`
            );
            addChatLog(`🥕🏆 <strong>${player.carrotsKnockedCount} Carrots Knocked!</strong> Earned <strong>+1 Volcano Trial Point</strong>!`, 'system');
          } else {
            showToast('CARROT KNOCKED!', `Wheeee! (+1 Carrot Spark for Hiram’s Builder Mode!)`);
          }
          updateMetersUI();
          renderBuilderToolbar();

          window.BlahajNetwork.send({
            type: 'carrot_knock',
            idx,
            vx: c.vel.x,
            vy: c.vel.y,
            vz: c.vel.z,
            carrotsKnockedCount: player.carrotsKnockedCount,
            trialPoints: player.trialPoints
          });
        }
      }
    });

    // 2. Bumping Bouncy Striped Beach Balls on the Water & Beaches (Synced across Co-op!)
    worldApi.getBeachBalls().forEach((bb, idx) => {
      const d = bb.mesh.position.distanceTo(player.pos);
      if (d < 2.75) {
        const pushDir = bb.mesh.position.clone().sub(player.pos);
        pushDir.y = 0;
        if (pushDir.lengthSq() < 0.01) pushDir.set(Math.sin(player.rotY), 0, Math.cos(player.rotY));
        pushDir.normalize();
        bb.vel.set(pushDir.x * 18.0 * knockMult, 0, pushDir.z * 18.0 * knockMult);
        CozyAudio.shonk();
        completeQuest('q-sw-regatta');

        window.BlahajNetwork.send({
          type: 'ball_kick',
          idx,
          x: bb.mesh.position.x,
          z: bb.mesh.position.z,
          vx: bb.vel.x,
          vz: bb.vel.z
        });
      }
    });

    // 3. Volcano Trial Dungeon Traps & Core Ascent Portal (Legacy cleanup)
  }

  function updateCamera(elapsed = 0, dt = 0.016) {
    if (camState.customOverride) {
      if (camState.customOverride.up) {
        camera.up.copy(camState.customOverride.up);
      } else {
        camera.up.set(0, 1, 0);
      }
      camera.position.copy(camState.customOverride.pos);
      camera.lookAt(camState.customOverride.lookAt);
      if (scene && scene.fog && currentZone === 'island') {
        const waterAtCam = (worldApi && typeof worldApi.getWaveHeight === 'function')
          ? worldApi.getWaveHeight(camera.position.x, camera.position.z, elapsed)
          : 0.22;
        if (camera.position.y < waterAtCam) {
          scene.fog.color.setHex(0x0a3d54);
          scene.fog.density = 0.024;
        } else {
          const skyState = (worldApi && typeof worldApi.getDayNightState === 'function')
            ? worldApi.getDayNightState()
            : null;
          if (skyState && skyState.fog) scene.fog.color.copy(skyState.fog);
          scene.fog.density = 0.0015;
        }
      }
      return;
    }
    const rightVec = new THREE.Vector3(Math.cos(camState.yaw), 0, -Math.sin(camState.yaw));
    camera.up.set(0, 1, 0);
    const lookTarget = new THREE.Vector3(
      player.pos.x + rightVec.x * camState.shoulderRight,
      player.pos.y + camState.heightOffset,
      player.pos.z + rightVec.z * camState.shoulderRight
    );

    const horizDist = camState.distance * Math.cos(camState.pitch);
    const vertDist = camState.distance * Math.sin(camState.pitch);

    let camX = lookTarget.x + Math.sin(camState.yaw) * horizDist;
    let camZ = lookTarget.z + Math.cos(camState.yaw) * horizDist;
    let camY = lookTarget.y + vertDist;

    if (currentZone === 'volcano' && window.BlahajVolcano) {
      // 1. Properly query ceiling at camera coordinates (passes camX, camZ)
      const ceilY = window.BlahajVolcano.getCeilingY(camX, camZ);

      // 2. Camera must NEVER dip below player's floor plane or floor directly beneath camera
      const floorAtCam = window.BlahajVolcano.getFloorHeight(camX, camZ, player.pos.y);
      const minCamY = Math.max(player.pos.y + 0.65, (floorAtCam > -500 ? floorAtCam + 0.5 : player.pos.y + 0.65));

      // 3. Ceiling can cap the top, but can NEVER push camera below minCamY
      const maxCamY = Math.max(minCamY + 0.2, ceilY - 0.45);
      camY = Math.min(maxCamY, Math.max(minCamY, camY));

      // 4. If the ceiling or wall behind would constrain the camera height, pull camera forward (zoom in)
      // instead of clipping or getting forced into the floor
      if (ceilY < lookTarget.y + vertDist + 0.5 && vertDist > 0) {
        const pullFactor = Math.max(0.35, Math.min(1.0, (ceilY - lookTarget.y - 0.45) / vertDist));
        camX = lookTarget.x + Math.sin(camState.yaw) * horizDist * pullFactor;
        camZ = lookTarget.z + Math.cos(camState.yaw) * horizDist * pullFactor;
      }
    } else if (currentZone === 'spherical_foods' && window.BlahajSphericalFoods) {
      const ceilY = window.BlahajSphericalFoods.getCeilingY() || 7.5;
      const roomRadius = 13.5;
      const dFromCenter = Math.hypot(camX, camZ);
      if (dFromCenter > roomRadius) {
        const pull = roomRadius / dFromCenter;
        camX *= pull;
        camZ *= pull;
      }
      if (camY > ceilY - 0.5) camY = ceilY - 0.5;
      if (camY < 0.6) camY = 0.6;
    } else if (currentZone === 'laundromat' && window.BlahajLaundromat) {
      if (window.BlahajLaundromat.isSpinCycleActive()) {
        // Dramatic spin cycle camera directly framing Giant Washer #7 at Z = -16.8
        const mwZ = -16.8;
        // Aim camera at Y = 2.05 with spinDist = 4.8 to position circular porthole safely below top HUD banner!
        lookTarget.set(0, 1.76, mwZ);
        const spinDist = 4.6;
        const spinYaw = 0.0; // Straight-on view looking North into washer door
        const spinPitch = -0.01;
        camX = lookTarget.x;
        camZ = mwZ + spinDist * Math.cos(spinPitch);
        camY = lookTarget.y + spinDist * Math.sin(spinPitch);
      } else {
        const ceilY = window.BlahajLaundromat.getCeilingY() || 5.2;

        // Interior bounds of 20m x 38m room (X: -10 to +10, Z: -19 to +19)
        const roomMinX = -8.8;
        const roomMaxX = 8.8;
        const roomMinZ = -17.8;
        const roomMaxZ = 17.8;

        // Smooth ray-to-wall distance clipping so camera zooms in naturally when near walls
        const dx = camX - lookTarget.x;
        const dz = camZ - lookTarget.z;
        let wallScale = 1.0;

        if (camX > roomMaxX && dx > 0) wallScale = Math.min(wallScale, (roomMaxX - lookTarget.x) / dx);
        if (camX < roomMinX && dx < 0) wallScale = Math.min(wallScale, (roomMinX - lookTarget.x) / dx);
        if (camZ > roomMaxZ && dz > 0) wallScale = Math.min(wallScale, (roomMaxZ - lookTarget.z) / dz);
        if (camZ < roomMinZ && dz < 0) wallScale = Math.min(wallScale, (roomMinZ - lookTarget.z) / dz);

        wallScale = Math.max(0.2, Math.min(1.0, wallScale));
        camX = lookTarget.x + dx * wallScale;
        camZ = lookTarget.z + dz * wallScale;

        // Ceiling clearance
        if (vertDist > 0 && lookTarget.y + vertDist > ceilY - 0.45) {
          const ceilScale = Math.max(0.3, Math.min(1.0, (ceilY - lookTarget.y - 0.45) / vertDist));
          camX = lookTarget.x + dx * wallScale * ceilScale;
          camZ = lookTarget.z + dz * wallScale * ceilScale;
        }

        const floorAtCam = window.BlahajLaundromat.getFloorHeight(camX, camZ, player.pos.y);
        const minCamY = Math.max(player.pos.y + 0.65, floorAtCam + 0.5);
        const maxCamY = Math.max(minCamY + 0.2, ceilY - 0.45);
        camY = Math.min(maxCamY, Math.max(minCamY, camY));
      }
    } else if (currentZone === 'spawning_pits' && window.BlahajSpawningPits) {
      const ceilY = window.BlahajSpawningPits.getCeilingY(player.pos.z) || 15.0;
      camX = Math.max(-22.8, Math.min(22.8, camX));
      camZ = Math.max(-388.8, Math.min(34.8, camZ));
      const floorAtCam = window.BlahajSpawningPits.getFloorHeight(camX, camZ, player.pos.y);
      camY = Math.min(ceilY - 0.5, Math.max(floorAtCam + 0.65, camY));
    } else if (currentZone === 'sea_cave' && window.BlahajHomestead) {
      const floorAtCam = window.BlahajHomestead.getFloorHeight(camX, camZ);
      camY = Math.min(12.5, Math.max(floorAtCam + 0.75, camY));
    } else if (currentZone === 'volleyball') {
      camY = Math.max(0.65, camY);
    } else if (currentZone === 'space' || currentZone === 'cheese_moon') {
      // Unclamped 360-degree space orbit camera
    } else {
      const minGround = worldApi.getGroundAndStructureHeight(camX, camZ, player.pos.y + 1.2, true) + 0.95;
      camY = Math.max(minGround, camY);
    }

    if (isUsingBinoculars) {
      const fwdX = -Math.sin(camState.yaw) * Math.cos(camState.pitch);
      const fwdY = Math.sin(camState.pitch);
      const fwdZ = -Math.cos(camState.yaw) * Math.cos(camState.pitch);

      // Camera positioned forward from player at eye level facing out into the horizon
      camX = player.pos.x + fwdX * 0.95;
      camY = player.pos.y + 1.25 + fwdY * 0.35;
      camZ = player.pos.z + fwdZ * 0.95;

      camera.position.set(camX, camY, camZ);
      camera.lookAt(camX + fwdX * 100, camY + fwdY * 100, camZ + fwdZ * 100);
      updateBinocularCrosshairHUD();
      return;
    }

    if (isUsingTelescope) {
      const fwdX = -Math.sin(camState.yaw) * Math.cos(camState.pitch);
      const fwdY = Math.sin(camState.pitch);
      const fwdZ = -Math.cos(camState.yaw) * Math.cos(camState.pitch);

      // Eyepiece on Crust Cliffs Observatory Terrace at (52.0, y0 + 2.75, -43.0)
      const baseGround = (worldApi && typeof worldApi.getGroundAndStructureHeight === 'function')
        ? worldApi.getGroundAndStructureHeight(52.0, -43.0, 30.0)
        : 22.0;
      camX = 52.0;
      camY = baseGround + 2.75;
      camZ = -43.0;

      camera.position.set(camX, camY, camZ);
      camera.lookAt(camX + fwdX * 100, camY + fwdY * 100, camZ + fwdZ * 100);
      updateTelescopeCloudCanvas(dt, elapsed);
      return;
    }

    camera.position.set(camX, camY, camZ);
    camera.lookAt(lookTarget);

    // Dynamic underwater marine turquoise fog when camera is submerged below ocean wave surface
    if (scene && scene.fog && currentZone === 'island') {
      const waterAtCam = (worldApi && typeof worldApi.getWaveHeight === 'function')
        ? worldApi.getWaveHeight(camX, camZ, elapsed)
        : 0.22;
      const isSubmerged = camY < waterAtCam;
      if (isSubmerged) {
        scene.fog.color.setHex(0x0a3d54); // Oceanic turquoise deep
        scene.fog.density = 0.024;
      } else {
        const skyState = (worldApi && typeof worldApi.getDayNightState === 'function')
          ? worldApi.getDayNightState()
          : null;
        if (skyState && skyState.fog) {
          scene.fog.color.copy(skyState.fog);
        }
        scene.fog.density = 0.0015;
      }
    }

    const deg = ((-camState.yaw * 180) / Math.PI % 360 + 360) % 360;
    if (Math.abs(deg - (updateCamera._lastCompassDeg ?? -999)) >= 0.1) {
      updateCamera._lastCompassDeg = deg;
      if (!updateCamera._compassTrack) updateCamera._compassTrack = document.getElementById('compass-track');
      if (updateCamera._compassTrack) {
        // 50px per 45 deg step (8 steps = 400px per full revolution).
        // Base offset at 0 deg aligns Set 2's North item (center at 425px) with the 150px strip center (75px): 75 - 425 = -350px.
        const offset = -350 - deg * (50 / 45);
        updateCamera._compassTrack.style.transform = `translate3d(${offset.toFixed(1)}px, 0, 0)`;
      }
    }
  }

  let hudZoneNameEl = null;
  let lastReportedZoneTitle = '';

  // ==========================================================================
  // PASS 67: THE GREAT SEAM COUNTDOWN CLOCK & AETHERIC DIVINER SYSTEM
  // ==========================================================================
  let detectorAudioMuted = false;
  let detectorCurrentNeedleAngle = -60;
  let detectorPrevDist = null;
  let detectorPingCooldown = 0;
  let detectorOscPhase = 0;
  let lastSeamWatchKey = '';
  let detectorUiAccum = 0;
  let celestialHudAccum = 0;

  function claimAethericSeamDiviner() {
    localStorage.setItem('blahaj_unlocked_seam_detector', 'true');
    if (player.inventory && !player.inventory.hasItem('seam_detector', 1)) {
      player.inventory.addItem('seam_detector', 1);
    }
    equipHeldItem('seam_detector');
    CozyAudio.portalChime();
    spawnFloatingBurst(player.pos, 0xa855f7, 26);
    showToast('AETHERIC SEAM DIVINER CLAIMED! 🧭✨', 'Sacred instrument claimed at Crater Overlook! Gauge active on side of screen.');
    addChatLog('🧭✨ <strong>AETHERIC SEAM DIVINER CLAIMED!</strong> You claimed the sacred Seam Diviner from the Crater Overlook altar! Equip it in your fin anytime to detect cosmic tears.', 'lore');
    completeQuest('q-sw-seam');
  }

  function updateSeamClockAndDetector(dt, elapsed) {
    if (!window.BlahajSeam) return;
    const seamState = window.BlahajSeam.getState();

    // 1. UPDATE FLOATING MINI-WATCH WIDGET (Throttled to only mutate DOM when second or state changes; 10Hz during incursion!)
    const remaining = Math.max(0, Math.floor(seamState.timer));
    const incTick = seamState.state === 'incursion' ? Math.floor(elapsed * 10) : 0;
    const watchKey = `${seamState.state}|${remaining}|${seamState.mendedCount}|${incTick}`;
    if (watchKey !== lastSeamWatchKey) {
      lastSeamWatchKey = watchKey;
      const watchEl = document.getElementById('seam-mini-watch');
      const timerEl = document.getElementById('seam-watch-timer');
      const badgeEl = document.getElementById('seam-watch-badge');
      const handEl = document.getElementById('seam-watch-hand');
      const iconEl = document.getElementById('seam-watch-icon');

      if (watchEl && timerEl && badgeEl) {
        const hh = Math.floor(remaining / 3600);
        const mm = String(Math.floor((remaining % 3600) / 60)).padStart(2, '0');
        const ss = String(remaining % 60).padStart(2, '0');
        const formattedTime = hh > 0 ? `${hh}h ${mm}m` : `${mm}:${ss}`;

        if (seamState.state === 'incursion') {
          timerEl.textContent = 'BREACH!';
          badgeEl.textContent = 'INCURSION';
          badgeEl.className = 'watch-status-badge status-incursion';
          watchEl.className = 'seam-mini-watch status-incursion';
          if (iconEl) iconEl.textContent = '🚨';
          if (handEl) {
            handEl.style.transform = `rotate(${(elapsed * 360) % 360}deg)`;
          }
        } else {
          timerEl.textContent = formattedTime;
          if (iconEl) iconEl.textContent = '🪡';
          watchEl.className = 'seam-mini-watch';

          if (remaining < 600) {
            badgeEl.textContent = 'FRAYING';
            badgeEl.className = 'watch-status-badge status-warn';
          } else {
            badgeEl.textContent = 'CALM';
            badgeEl.className = 'watch-status-badge status-calm';
          }

          if (handEl) {
            handEl.style.transform = `rotate(${(remaining % 60) * 6}deg)`;
          }
        }

        // Update 6 diamond pips
        for (let i = 0; i < 6; i++) {
          const pip = document.getElementById(`spip-${i}`);
          if (pip) {
            const r = seamState.rifts[i];
            if (r && r.mended) {
              pip.className = 'seam-pip mended';
              pip.textContent = '◆';
              pip.title = `${r.name}: MENDED`;
            } else {
              pip.className = 'seam-pip open';
              pip.textContent = '◇';
              pip.title = r ? `${r.name}: OPEN` : 'Rift Open';
            }
          }
        }
      }
    }

    // 2. UPDATE HANDHELD AETHERIC DIVINER SIDE PANEL (When held in fin, throttled to ~15Hz)
    if (playerHeldItem.id === 'seam_detector') {
      detectorUiAccum += dt;
      if (detectorUiAccum < 0.065) return;
      const stepDt = detectorUiAccum;
      detectorUiAccum = 0;
      const detInfo = window.BlahajSeam.getNearestRift(player.pos, currentZone);
      const needleEl = document.getElementById('detector-needle');
      const sigBadge = document.getElementById('detector-signal-badge');
      const bulbEl = document.getElementById('det-pulse-bulb');
      const distValEl = document.getElementById('detector-dist-val');
      const arrowEl = document.getElementById('detector-trend-arrow');
      const trendMsgEl = document.getElementById('detector-trend-msg');
      const locTagEl = document.getElementById('detector-location-tag');
      const mendedRatioEl = document.getElementById('detector-mended-ratio');
      const resonanceLbl = document.getElementById('detector-resonance-label');

      if (mendedRatioEl) {
        mendedRatioEl.textContent = `${detInfo.mendedCount} / ${detInfo.totalRifts} Mended`;
      }

      let targetAngle = -60;
      let signalPct = 0;
      let prox = 0;

      if (detInfo.nearest) {
        const d = detInfo.nearest.dist;
        // Signal scales smoothly from 95m down to 2m
        prox = Math.max(0, Math.min(1.0, 1.0 - (d - 2.0) / 93.0));
        signalPct = Math.round(prox * 100);

        // Target angle swings from -60deg (cold/far) to +60deg (hot/contact)
        targetAngle = -60 + prox * 120;

        // Dynamic jitter when close
        if (prox > 0.4) {
          targetAngle += (Math.random() - 0.5) * (prox * 6.0);
        }

        if (distValEl) distValEl.textContent = `${Math.round(d)} m`;
        if (locTagEl) locTagEl.textContent = detInfo.nearest.name;
        if (resonanceLbl) {
          resonanceLbl.textContent = prox > 0.8 ? 'RESONANCE: MAXIMUM' : (prox > 0.4 ? 'RESONANCE: HARMONIC' : 'RESONANCE: FAINT');
        }

        // Trend calculation
        if (detectorPrevDist !== null) {
          const diff = d - detectorPrevDist;
          if (diff < -0.06) {
            if (arrowEl) arrowEl.textContent = '▲';
            if (trendMsgEl) {
              trendMsgEl.textContent = 'CLOSING IN (Getting Warmer)';
              trendMsgEl.style.color = '#34d399';
            }
          } else if (diff > 0.06) {
            if (arrowEl) arrowEl.textContent = '▼';
            if (trendMsgEl) {
              trendMsgEl.textContent = 'DRIFTING AWAY (Getting Colder)';
              trendMsgEl.style.color = '#f87171';
            }
          } else {
            if (arrowEl) arrowEl.textContent = '●';
            if (trendMsgEl) {
              trendMsgEl.textContent = 'SIGNAL LOCKED (Holding Distance)';
              trendMsgEl.style.color = '#fde047';
            }
          }
        }
        detectorPrevDist = d;

        if (bulbEl) {
          bulbEl.className = prox > 0.1 ? 'det-pulse-bulb active-signal' : 'det-pulse-bulb';
          if (prox > 0.6) {
            bulbEl.style.animationDuration = `${Math.max(0.18, 0.6 - (prox - 0.6) * 0.8)}s`;
          } else {
            bulbEl.style.animationDuration = '0.6s';
          }
        }

        // Sonar audio pings (accelerates as distance drops)
        if (!detectorAudioMuted) {
          detectorPingCooldown -= stepDt;
          if (detectorPingCooldown <= 0) {
            const pingInterval = Math.max(0.24, 2.4 - prox * 2.15); // 2.4s down to 0.24s
            detectorPingCooldown = pingInterval;
            CozyAudio.seamDetectorPing(prox);
          }
        }

      } else {
        // No unmended rifts in current zone!
        targetAngle = -60;
        signalPct = 0;
        detectorPrevDist = null;

        if (distValEl) distValEl.textContent = '-- m';
        if (arrowEl) arrowEl.textContent = '✨';
        if (trendMsgEl) {
          trendMsgEl.textContent = 'Current Zone Tranquil & Clean!';
          trendMsgEl.style.color = '#38bdf8';
        }
        if (locTagEl) {
          const others = Object.entries(detInfo.otherZoneCounts)
            .map(([z, c]) => `${z.toUpperCase()} (${c})`)
            .join(' · ');
          locTagEl.textContent = others ? `Tears in: ${others}` : 'All Archipelago Tears Mended!';
        }
        if (resonanceLbl) resonanceLbl.textContent = 'RESONANCE: DORMANT';
        if (bulbEl) bulbEl.className = 'det-pulse-bulb';
      }

      // Spring lerp for needle
      detectorCurrentNeedleAngle += (targetAngle - detectorCurrentNeedleAngle) * Math.min(1.0, stepDt * 7.5);
      if (needleEl) {
        needleEl.style.transform = `rotate(${detectorCurrentNeedleAngle.toFixed(1)}deg)`;
      }
      if (sigBadge) {
        sigBadge.textContent = `SIGNAL: ${signalPct}%`;
        sigBadge.style.color = signalPct > 70 ? '#ef4444' : (signalPct > 35 ? '#a855f7' : '#38bdf8');
      }

      // Draw Oscilloscope Waveform on Canvas (without expensive shadowBlur)
      const oscCanvas = document.getElementById('detector-oscilloscope-canvas');
      if (oscCanvas) {
        const ctx = oscCanvas.getContext('2d');
        if (ctx) {
          const w = oscCanvas.width;
          const h = oscCanvas.height;
          ctx.clearRect(0, 0, w, h);

          // Grid lines
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(0, h * 0.5);
          ctx.lineTo(w, h * 0.5);
          ctx.stroke();

          // Wave
          detectorOscPhase += stepDt * (3.0 + prox * 10.0);
          const amp = 3.0 + prox * 14.0;
          const freq = 0.05 + prox * 0.09;

          ctx.strokeStyle = prox > 0.7 ? '#f43f5e' : (prox > 0.35 ? '#c084fc' : '#38bdf8');
          ctx.lineWidth = 2.0;

          ctx.beginPath();
          for (let x = 0; x < w; x += 2) {
            const y = h * 0.5 + Math.sin(x * freq + detectorOscPhase) * amp;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
      }
    }
  }

  function checkGreatSeamRiftsInteractable(bestDistSoFar = 999) {
    let closestRift = null;
    let minD = bestDistSoFar;
    if (window.BlahajSeam) {
      const activeRifts = window.BlahajSeam.getAllActiveRifts();
      activeRifts.forEach((r) => {
        if (!r.mended && (r.zone === currentZone || (r.zone === 'island' && (currentZone === 'overworld' || currentZone === 'island')))) {
          const d3 = Math.hypot(r.pos.x - player.pos.x, r.pos.y - player.pos.y, r.pos.z - player.pos.z);
          const dH = Math.hypot(r.pos.x - player.pos.x, r.pos.z - player.pos.z);
          const dV = Math.abs(r.pos.y - player.pos.y);
          if ((d3 < 8.5 || (dH < 7.5 && dV < 6.5)) && d3 < minD) {
            minD = d3;
            closestRift = {
              kind: 'rift',
              ref: r,
              dist: d3,
              prompt: 'Stitch Great Seam Rift [E] 🪡✨'
            };
          }
        }
      });
    }
    return { closestRift, minD };
  }

  function updateInteractionsAndHUD() {
    checkLandmarkDiscovery();
    nearestInteractable = null;
    let bestDist = 999;

    if (currentZone !== 'island' && currentZone !== 'overworld') {
      worldActors.forEach((act) => {
        if (act.labelEl && act.labelEl._lastDisplay !== 'none') {
          act.labelEl.style.opacity = '0';
          act.labelEl.style.display = 'none';
          act.labelEl._lastDisplay = 'none';
        }
      });
    }

    if (isUsingBinoculars) {
      nearestInteractable = {
        kind: 'binoculars_active',
        prompt: '🔭 Binocular Zoom · [F / Space] Lower Binoculars · [WASD / Mouse] Scan Horizon'
      };
      const promptEl = document.getElementById('interaction-prompt');
      if (promptEl && !isAnyModalOpen()) {
        document.getElementById('interaction-text').textContent = nearestInteractable.prompt;
        promptEl.classList.remove('hidden');
      }
      return;
    }

    if (isUsingTelescope) {
      nearestInteractable = {
        kind: 'telescope_active',
        prompt: '🔭 Starlight Telescope · [Space / Click] Wave to Cloud Sharks 👋 · [Esc / E] Step Away'
      };
      const promptEl = document.getElementById('interaction-prompt');
      if (promptEl && !isAnyModalOpen()) {
        document.getElementById('interaction-text').textContent = nearestInteractable.prompt;
        promptEl.classList.remove('hidden');
      }
      return;
    }

    // Direct telescope proximity check on Crust Cliffs Observatory Terrace (52, -43)
    const dObsTele = Math.hypot(player.pos.x - 52.0, player.pos.z - (-43.0));
    if (dObsTele < 8.5 && dObsTele < bestDist) {
      bestDist = dObsTele;
      nearestInteractable = {
        kind: 'observatory_telescope',
        dist: dObsTele,
        prompt: 'Look through Starlight Observatory Telescope [E] 🔭✨'
      };
    }

    if (player.isLounging) {
      document.getElementById('hud-zone-name').textContent = 'Crescent Beach · Lounging on Sun Deck Chair 🏖️🍹';
      nearestInteractable = {
        kind: 'lounge_active',
        prompt: `🏖️🍹 Lounging on ${player.loungeChair?.name || 'Beach Lounger'} · [Space / F] Sip Piña Colada · [WASD / E] Stand Up`
      };
      const promptEl = document.getElementById('interaction-prompt');
      if (promptEl && !isAnyModalOpen()) {
        document.getElementById('interaction-text').textContent = nearestInteractable.prompt;
        promptEl.classList.remove('hidden');
      }
      return;
    }

    // Inside the Crescent Beach Volleyball Instance
    if (currentZone === 'volleyball' && window.BlahajVolleyball) {
      document.getElementById('hud-zone-name').textContent = 'Crescent Beach · Shark Volleyball Court 🏐';
      const vbItems = window.BlahajVolleyball.getInteractables(player.pos);
      if (vbItems.length > 0) {
        nearestInteractable = vbItems[0];
      }
      const promptEl = document.getElementById('interaction-prompt');
      if (nearestInteractable && !isAnyModalOpen()) {
        document.getElementById('interaction-text').textContent = nearestInteractable.prompt;
        promptEl.classList.remove('hidden');
      } else {
        promptEl.classList.add('hidden');
      }
      return;
    }

    // Inside the Volcano Instance: Dedicated room zones, puzzles, tea and return portal
    if (currentZone === 'volcano' && window.BlahajVolcano) {
      const roomTitle = window.BlahajVolcano.getRoomTitle(player.pos.z) || 'The Sacred Volcano Trial';
      if (roomTitle !== lastReportedZoneTitle) {
        lastReportedZoneTitle = roomTitle;
        if (!hudZoneNameEl) hudZoneNameEl = document.getElementById('hud-zone-name');
        if (hudZoneNameEl) hudZoneNameEl.textContent = roomTitle;
      }

      // Chamber HUD guide popups as player traverses each zone
      const noticeKey = getVolcanoNoticeKeyForPos(player.pos);
      if (noticeKey && !shownVolcanoNotices.has(noticeKey)) {
        showVolcanoHUDNotice(noticeKey);
      }

      const vItems = window.BlahajVolcano.getInteractables(player.pos);
      if (vItems.length > 0) {
        vItems.sort((a, b) => a.dist - b.dist);
        nearestInteractable = vItems[0];
        bestDist = vItems[0].dist;
      }

      // Check if a Great Seam Rift in the volcano is nearby
      const riftRes = checkGreatSeamRiftsInteractable(bestDist);
      if (riftRes.closestRift) {
        nearestInteractable = riftRes.closestRift;
        bestDist = riftRes.minD;
      }

      const promptEl = document.getElementById('interaction-prompt');
      if (nearestInteractable && !isAnyModalOpen()) {
        document.getElementById('interaction-text').textContent = nearestInteractable.prompt;
        promptEl.classList.remove('hidden');
      } else if (promptEl) {
        promptEl.classList.add('hidden');
      }

      // Continuous hazard detection in the instance
      const hazard = window.BlahajVolcano.checkHazards(player.pos);
      if (hazard) {
        handleVolcanoTrapHit(hazard);
      }
      return;
    }

    // Inside the Spherical Foods Bistro Instance
    if (currentZone === 'spherical_foods' && window.BlahajSphericalFoods) {
      document.getElementById('hud-zone-name').textContent = 'Spherical Foods Bistro & Rotunda';
      if (player.isSeatedInBooth) {
        const dish = window.BlahajSphericalFoods.getServedDish(player.seatedBoothIndex);
        if (dish && !dish.eaten) {
          nearestInteractable = {
            kind: 'eat_served_dish',
            boothIndex: player.seatedBoothIndex,
            prompt: `🍴 Feast on ${dish.title} [E] · [M] Menu · [WASD / Space] Stand Up`
          };
        } else if (window.BlahajSphericalFoods.isHelensBirthdayWeek()) {
          nearestInteractable = {
            kind: 'seated_booth_menu',
            prompt: "🛋️ Seated in Booth · [E] or [M] Spherical Menu · [P] Pop Birthday Cracker 🎉 · [WASD / Space] Stand Up"
          };
        } else {
          nearestInteractable = {
            kind: 'seated_booth_menu',
            prompt: '🛋️ Seated in Booth · [E] or [M] Spherical Menu · [WASD / Space] Stand Up'
          };
        }
      } else {
        const sItems = window.BlahajSphericalFoods.getInteractables(player.pos);
        if (sItems.length > 0) {
          sItems.sort((a, b) => a.dist - b.dist);
          nearestInteractable = sItems[0];
          bestDist = sItems[0].dist;
        }

        // Check Great Seam Rifts inside Spherical Foods Bistro
        const riftRes = checkGreatSeamRiftsInteractable(bestDist);
        if (riftRes.closestRift) {
          nearestInteractable = riftRes.closestRift;
          bestDist = riftRes.minD;
        }
      }
      const promptEl = document.getElementById('interaction-prompt');
      if (nearestInteractable && !isAnyModalOpen()) {
        document.getElementById('interaction-text').textContent = nearestInteractable.prompt;
        promptEl.classList.remove('hidden');
      } else if (promptEl) {
        promptEl.classList.add('hidden');
      }
      return;
    }

    // Inside the 3D Subterranean Bioluminescent Sea-Cave Grotto Instance
    if (currentZone === 'space' || currentZone === 'cheese_moon') {
      if (!hudZoneNameEl) hudZoneNameEl = document.getElementById('hud-zone-name');
      const spaceTitle = currentZone === 'cheese_moon'
        ? 'Swiss Cheese Planetoid · Eclipse Canyon 🧀🌑'
        : 'Deep Space Orbit · Blåhaj Planetary Wedge Sector 🛸🪐';
      if (hudZoneNameEl && lastReportedZoneTitle !== spaceTitle) {
        hudZoneNameEl.textContent = spaceTitle;
        lastReportedZoneTitle = spaceTitle;
      }
      const promptEl = document.getElementById('interaction-prompt');
      if (promptEl && !promptEl.classList.contains('hidden')) {
        promptEl.classList.add('hidden');
      }
      return;
    }

    if (currentZone === 'sea_cave' && window.BlahajHomestead) {
      document.getElementById('hud-zone-name').textContent = 'Starlight Sea-Cave Grotto · Subterranean Lagoon 💎🌊';
      const scItems = window.BlahajHomestead.getCaveInteractables(player.pos);
      if (scItems.length > 0) {
        scItems.sort((a, b) => a.dist - b.dist);
        nearestInteractable = scItems[0];
        nearestInteractable.prompt = nearestInteractable.label;
        bestDist = scItems[0].dist;
      }
      const promptEl = document.getElementById('interaction-prompt');
      if (nearestInteractable && !isAnyModalOpen()) {
        document.getElementById('interaction-text').textContent = nearestInteractable.prompt;
        promptEl.classList.remove('hidden');
      } else if (promptEl) {
        promptEl.classList.add('hidden');
      }
      return;
    }

    // Inside the 3D IKEA Spawning Pits Stealth Dungeon Instance
    if (currentZone === 'spawning_pits' && window.BlahajSpawningPits) {
      const secTitle = window.BlahajSpawningPits.getSectorTitle(player.pos.z);
      document.getElementById('hud-zone-name').textContent = secTitle;
      const spItems = window.BlahajSpawningPits.getInteractables(player.pos);
      if (spItems.length > 0) {
        spItems.sort((a, b) => a.dist - b.dist);
        nearestInteractable = spItems[0];
        bestDist = spItems[0].dist;
      }
      const promptEl = document.getElementById('interaction-prompt');
      if (nearestInteractable && !isAnyModalOpen()) {
        document.getElementById('interaction-text').textContent = nearestInteractable.prompt;
        promptEl.classList.remove('hidden');
      } else if (promptEl) {
        promptEl.classList.add('hidden');
      }
      return;
    }

    // Inside the Laundromat Instance: Giant Master Washer #7, Vending & Return Portal
    if (currentZone === 'laundromat' && window.BlahajLaundromat) {
      document.getElementById('hud-zone-name').textContent = 'The First Whirlings (Delicate Cycle 24/7)';
      const lItems = window.BlahajLaundromat.getInteractables(player.pos);
      if (lItems.length > 0) {
        lItems.sort((a, b) => a.dist - b.dist);
        nearestInteractable = lItems[0];
        bestDist = lItems[0].dist;
      }

      // Check Great Seam Rifts inside Laundromat
      const riftRes = checkGreatSeamRiftsInteractable(bestDist);
      if (riftRes.closestRift) {
        nearestInteractable = riftRes.closestRift;
        bestDist = riftRes.minD;
      }

      const promptEl = document.getElementById('interaction-prompt');
      if (nearestInteractable && !isAnyModalOpen()) {
        document.getElementById('interaction-text').textContent = nearestInteractable.prompt;
        promptEl.classList.remove('hidden');
      } else if (promptEl) {
        promptEl.classList.add('hidden');
      }
      return;
    }

    // World Pickups (Birb Guano, Volcanic Sulfur, Driftwood, Dropped Items)
    if (worldPickups && (currentZone === 'island' || currentZone === 'overworld')) {
      const nearbyPickups = worldPickups.getNearbyPickups(player.pos, 3.6);
      if (nearbyPickups.length > 0) {
        const closest = nearbyPickups[0];
        // Walk-over auto pickup when within 1.25m of dropped items
        if (closest.dist < 1.25 && closest.pickup && !closest.pickup.isStatic) {
          collectWorldPickup(closest.pickup);
        } else if (closest.dist < bestDist) {
          bestDist = closest.dist;
          nearestInteractable = closest;
        }
      }
    }

    // Maritime Tourist Binoculars Pedestals
    const pedestals = window.BlahajBinocularPedestals || [];
    for (const ped of pedestals) {
      const dPed = Math.hypot(player.pos.x - ped.x, player.pos.z - ped.z);
      if (dPed < 2.5 && dPed < bestDist) {
        bestDist = dPed;
        nearestInteractable = {
          kind: 'binocular_pedestal',
          pedestal: ped,
          prompt: `🔭 ${ped.name} · [E] Look through Marine Binoculars (or [T] anywhere)`
        };
      }
    }

    // (Signposts are non-interactive 3D wooden carved road markers; exploration is unhindered)

    // S.S. Shonk-Saucer Mk. VII & Thunderbirds Launch Isle Interactables
    if (window.BlahajUFO && (currentZone === 'island' || currentZone === 'overworld')) {
      const ufoItems = window.BlahajUFO.getInteractables(player.pos);
      ufoItems.forEach((ui) => {
        if (ui.dist < bestDist) {
          bestDist = ui.dist;
          nearestInteractable = ui;
        }
      });
    }

    // Pass 77: Personal Pocket Atoll, BÅT-BYGGE Shipyard, BYGGBÄNK Sawmill, Baby Sharks & Commissions Boards
    if (window.BlahajHomestead && (currentZone === 'island' || currentZone === 'overworld')) {
      const hsItems = window.BlahajHomestead.getSurfaceInteractables(player.pos, worldApi);
      hsItems.forEach((hi) => {
        if (hi.dist < bestDist) {
          bestDist = hi.dist;
          nearestInteractable = Object.assign({}, hi, { prompt: hi.label });
        }
      });
    }

    // Solomon's Stone Bread Oven in Heartland Meadow
    if (solomonBreadOven && (currentZone === 'island' || currentZone === 'overworld')) {
      const dOven = Math.hypot(player.pos.x - solomonBreadOven.worldPos.x, player.pos.z - solomonBreadOven.worldPos.z);
      if (dOven < 6.2 && dOven < bestDist) {
        bestDist = dOven;
        nearestInteractable = {
          kind: 'solomon_bread_oven',
          dist: dOven,
          prompt: 'Bake Warm Breb Loaves [E] 🥖'
        };
      }
    }

    // Archipelago Community Trunk in Heartland Plaza (Physical Shared Stash)
    if (communityTrunk && (currentZone === 'island' || currentZone === 'overworld')) {
      const dTrunk = Math.hypot(player.pos.x - communityTrunk.worldPos.x, player.pos.z - communityTrunk.worldPos.z);
      if (dTrunk < 3.8 && dTrunk < bestDist) {
        bestDist = dTrunk;
        nearestInteractable = {
          kind: 'community_trunk',
          dist: dTrunk,
          prompt: 'Open Archipelago Community Trunk [E] 📦'
        };
      }
    }

    // Heartland Pier Launch Mortar Station on Endless Pier
    if (launchMortarStation && (currentZone === 'island' || currentZone === 'overworld')) {
      const dMortar = Math.hypot(player.pos.x - launchMortarStation.worldPos.x, player.pos.z - launchMortarStation.worldPos.z);
      if (dMortar < 4.2 && dMortar < bestDist) {
        bestDist = dMortar;
        if (player.inventory && player.inventory.hasItem('firework_rocket', 1)) {
          nearestInteractable = {
            kind: 'launch_mortar',
            dist: dMortar,
            prompt: "Launch Helen's Birthday Star Rocket! 🎆 [E]"
          };
        } else if (player.inventory && player.inventory.hasItem('star_powder', 1) && player.inventory.hasItem('mortar_tube', 1) && player.inventory.hasItem('braided_fuse', 1)) {
          nearestInteractable = {
            kind: 'assemble_and_launch_mortar',
            dist: dMortar,
            prompt: "Assemble & Launch Helen's Birthday Rocket! 🚀 [E]"
          };
        } else {
          nearestInteractable = {
            kind: 'inspect_mortar',
            dist: dMortar,
            prompt: "Heartland Pier Launch Mortar [E] (Needs Celebration Rocket 🚀)"
          };
        }
      }
    }

    // Check Sleeping Birbs for Gentle Soft Down Gathering
    if (worldApi && (currentZone === 'island' || currentZone === 'overworld')) {
      const flock = worldApi.getBirbFlock ? worldApi.getBirbFlock() : [];
      flock.forEach((b) => {
        if (b.isSleeping && !b.downGathered) {
          const dBirb = Math.hypot(player.pos.x - b.mesh.position.x, player.pos.z - b.mesh.position.z);
          if (dBirb < 2.5 && dBirb < bestDist) {
            bestDist = dBirb;
            nearestInteractable = {
              kind: 'pluck_birb_down',
              ref: b,
              dist: dBirb,
              prompt: 'Gently Pluck Soft Birb Down [E] 🪶'
            };
          }
        }
      });
    }

    // Allow hopping onto Partner's Boat to ride together!
    if (coopPartner.active && coopPartner.inBoat && coopPartner.mesh) {
      const dPartnerBoat = coopPartner.mesh.position.distanceTo(player.pos);
      if (dPartnerBoat < 9.5) {
        bestDist = dPartnerBoat;
        nearestInteractable = {
          kind: 'partner_boat',
          ref: coopPartner,
          dist: dPartnerBoat,
          prompt: player.ridingWithPartner
            ? 'Hop Off Partner’s Boat [E / Space]'
            : 'Ride Together on Partner’s Boat [E] ⛵🦈🦈'
        };
      }
    } else if (coopPartner.active && !coopPartner.inBoat && coopPartner.mesh && coopPartner.mesh.visible) {
      const dPartner = coopPartner.mesh.position.distanceTo(player.pos);
      if (dPartner < 5.0 && dPartner < bestDist) {
        bestDist = dPartner;
        nearestInteractable = {
          kind: 'coop_partner',
          ref: coopPartner,
          dist: dPartner,
          prompt: 'Groom Partner [G] 🪮✨ · Nose-Beep [F] 👃'
        };
      }
    }

    // Check nearby Linked Pocket Portals
    worldApi.getBuiltStructures().forEach((st) => {
      if (st.type === 'pocket_portal') {
        const d = Math.hypot(st.x - player.pos.x, st.z - player.pos.z);
        if (d < 5.5 && d < bestDist) {
          bestDist = d;
          nearestInteractable = {
            kind: 'pocket_portal',
            ref: st,
            dist: d,
            prompt: 'Teleport via Linked Pocket Portal [E] 🌀'
          };
        }
      }
    });

    const riftRes = checkGreatSeamRiftsInteractable(bestDist);
    if (riftRes.closestRift) {
      nearestInteractable = riftRes.closestRift;
      bestDist = riftRes.minD;
    }

    // Crescent Beach Shark Beach Volleyball Court
    if (currentZone === 'island' || currentZone === 'overworld') {
      const dVolleyCourt = Math.hypot(player.pos.x - 28, player.pos.z - 52);
      if (dVolleyCourt < 8.0 && dVolleyCourt < bestDist) {
        bestDist = dVolleyCourt;
        nearestInteractable = {
          kind: 'enter_volleyball',
          dist: dVolleyCourt,
          prompt: 'Play Shark Beach Volleyball [E] 🏐🦈'
        };
      }

      // Crescent Beach Luxury Sun Deck Chairs
      const deckChairs = window.BlahajDeckChairs || (worldApi && worldApi.getDeckChairs ? worldApi.getDeckChairs() : []);
      for (const chair of deckChairs) {
        const dChair = Math.hypot(player.pos.x - chair.x, player.pos.z - chair.z);
        if (dChair < 3.2 && dChair < bestDist) {
          bestDist = dChair;
          nearestInteractable = {
            kind: 'deckchair',
            chairId: chair.id,
            dist: dChair,
            prompt: `Lie Down on ${chair.name} [E] 🏖️🍹`
          };
        }
      }
    }

    worldActors.forEach((act) => {
      if (!act.mesh.visible) return;
      const d = act.mesh.position.distanceTo(player.pos);
      if (d < 5.5 && d < bestDist) {
        bestDist = d;
        nearestInteractable = {
          kind: 'actor',
          ref: act,
          dist: d,
          prompt: `Talk to ${act.name} [E] · Groom [G] 🪮 · Beep Nose [F]`
        };
      }
    });

    let currentZoneTitle = 'Shores of Blåhaj Island';

    // Check if on any of the 4 Outer Sanctuary Islands
    (LORE.sanctuaryIslands || []).forEach((isl) => {
      const dIsl = Math.hypot(player.pos.x - isl.x, player.pos.z - isl.z);
      if (dIsl < isl.radius + 8) {
        const claimOwner = islandClaims[isl.id];
        currentZoneTitle = claimOwner ? `${isl.name} (${claimOwner}’s Island)` : `${isl.direction} · ${isl.name}`;
        completeQuest('q-outer-island');
      }
    });

    LORE.landmarks.forEach((lm) => {
      if (lm.type === 'boat' && worldApi.getFleetBoats) {
        worldApi.getFleetBoats().forEach((bMesh) => {
          const d = Math.hypot(player.pos.x - bMesh.position.x, player.pos.z - bMesh.position.z);
          if (d < lm.radius * 1.4) {
            currentZoneTitle = lm.zoneTitle;
          }
          const isCurrentBoat = lastNearestInteractableKey === (bMesh.userData.boatName || 'boat');
          const effectiveBoatRadius = isCurrentBoat ? (lm.radius + 1.6) : lm.radius;
          if (d < effectiveBoatRadius && d < bestDist) {
            bestDist = d;
            nearestInteractable = {
              kind: 'landmark',
              ref: { ...lm, targetBoat: bMesh, id: bMesh.userData.boatName || 'boat' },
              dist: d,
              prompt: `Board ${bMesh.userData.boatName || 'Regatta Sailboat'} [E] ⛵`
            };
          }
        });
        return;
      }

      const posXZ = lm.type === 'boat' && worldApi.getBoatMesh()
        ? worldApi.getBoatMesh().position
        : new THREE.Vector3(lm.pos.x, player.pos.y, lm.pos.z);

      const dx = player.pos.x - posXZ.x;
      const dz = player.pos.z - posXZ.z;
      const d = Math.sqrt(dx * dx + dz * dz);

      if (d < lm.radius * 1.4) {
        currentZoneTitle = lm.zoneTitle;
      }
      const isCurrentLm = lastNearestInteractableKey === lm.id;
      const effectiveRadius = isCurrentLm ? (lm.radius + 1.6) : lm.radius;
      // Do not allow distant landmarks to override immediate ground pickups or ovens within 3.8m
      const hasClosePickup = nearestInteractable && (nearestInteractable.kind.startsWith('pickup_') || nearestInteractable.kind === 'solomon_bread_oven');
      if (d < effectiveRadius && d < bestDist && !hasClosePickup) {
        bestDist = d;
        nearestInteractable = {
          kind: 'landmark',
          ref: lm,
          dist: d,
          prompt: lm.prompt
        };
      }
    });

    lastNearestInteractableKey = nearestInteractable
      ? (nearestInteractable.ref ? (nearestInteractable.ref.id || nearestInteractable.kind) : nearestInteractable.kind)
      : null;

    if (!hudZoneNameEl) hudZoneNameEl = document.getElementById('hud-zone-name');
    if (hudZoneNameEl && lastReportedZoneTitle !== currentZoneTitle) {
      hudZoneNameEl.textContent = currentZoneTitle;
      lastReportedZoneTitle = currentZoneTitle;
    }

    if (!window._hudCache) window._hudCache = {};
    const hc = window._hudCache;
    if (!hc.promptEl) hc.promptEl = document.getElementById('interaction-prompt');
    if (!hc.promptTextEl) hc.promptTextEl = document.getElementById('interaction-text');
    const promptEl = hc.promptEl;
    const isSailingNow = player.inBoat || player.ridingWithPartner;

    let nextPromptText = null;
    if (builderState.active && canUseBuilderMode(player.sharkId) && (!nearestInteractable || nearestInteractable.dist > 4.2)) {
      const spec = (LORE.buildCatalog || []).find((x) => x.id === builderState.selectedId);
      nextPromptText = `Build ${spec ? spec.name : 'Structure'} [E / Click] · Rotate [R] · Remove [X]`;
    } else if (isSailingNow && !isAnyModalOpen()) {
      const canTalkToDock = nearestInteractable && nearestInteractable.kind === 'landmark' && nearestInteractable.ref.type !== 'boat';
      nextPromptText = canTalkToDock
        ? `${nearestInteractable.prompt} · or Hop Off [Space]`
        : '⛵ Sailing — Hop Off Here [E / Space]';
    } else if (nearestInteractable && !isAnyModalOpen()) {
      nextPromptText = nearestInteractable.prompt;
    }

    if (nextPromptText !== null) {
      if (hc.promptTextEl && hc.lastPromptText !== nextPromptText) {
        hc.promptTextEl.textContent = nextPromptText;
        hc.lastPromptText = nextPromptText;
      }
      if (promptEl && hc.promptVisible !== true) {
        promptEl.classList.remove('hidden');
        hc.promptVisible = true;
      }
    } else if (promptEl && hc.promptVisible !== false) {
      promptEl.classList.add('hidden');
      hc.promptVisible = false;
    }

    // Check avatar grooming proximity for HUD button and prompt pill
    let nearbyGroomAvatar = null;
    let groomCheckDist = 5.0;
    if (coopPartner && coopPartner.active && !coopPartner.inBoat && coopPartner.mesh && coopPartner.mesh.visible) {
      const dP = coopPartner.mesh.position.distanceTo(player.pos);
      if (dP < groomCheckDist) {
        groomCheckDist = dP;
        nearbyGroomAvatar = { name: LORE.sharks[coopPartner.sharkId] ? LORE.sharks[coopPartner.sharkId].name : 'Partner' };
      }
    }
    worldActors.forEach((act) => {
      if (!act.mesh || !act.mesh.visible) return;
      const dA = act.mesh.position.distanceTo(player.pos);
      if (dA < groomCheckDist) {
        groomCheckDist = dA;
        nearbyGroomAvatar = { name: act.name };
      }
    });

    if (!hc.slotG) hc.slotG = document.getElementById('slot-g');
    const groomReady = !!nearbyGroomAvatar;
    if (hc.slotG && hc.lastGroomReady !== groomReady) {
      hc.slotG.classList.toggle('groom-ready', groomReady);
      hc.lastGroomReady = groomReady;
    }
    if (!hc.btnGroomPrompt) hc.btnGroomPrompt = document.getElementById('btn-groom-prompt');
    const btnGroomPrompt = hc.btnGroomPrompt;
    if (btnGroomPrompt) {
      if (nearbyGroomAvatar && !isAnyModalOpen()) {
        const groomTxt = `🪮 Groom ${nearbyGroomAvatar.name} [G]`;
        if (hc.lastGroomText !== groomTxt) {
          btnGroomPrompt.textContent = groomTxt;
          hc.lastGroomText = groomTxt;
        }
        if (hc.groomBtnVisible !== true) {
          btnGroomPrompt.classList.remove('hidden');
          hc.groomBtnVisible = true;
        }
      } else if (hc.groomBtnVisible !== false) {
        btnGroomPrompt.classList.add('hidden');
        hc.groomBtnVisible = false;
      }
    }

    worldActors.forEach((act) => {
      if (!act.mesh.visible) return;
      if (window.BlahajQuests) window.BlahajQuests.syncActorMarker(act.id, act.labelEl, act.mesh);
      projectLabel(act.mesh.position, act.labelEl, 3.25, false);
    });

    if (coopPartner.active && coopPartner.mesh && coopPartner.labelEl) {
      const pZone = coopPartner.zone || 'island';
      const sameZone = pZone === currentZone;
      const distToPlayer = Math.round(coopPartner.mesh.position.distanceTo(player.pos));
      const zoneName = getZoneFriendlyName(pZone);

      const subEl = document.getElementById('coop-status-sub');
      if (subEl) {
        const nextSub = sameZone
          ? (distToPlayer <= 20
              ? `🦈 Beside you in <strong>${zoneName}</strong> (${distToPlayer}m)`
              : `📍 <strong>${distToPlayer}m away</strong> in ${zoneName} — Click <strong>[✨ Join]</strong>!`)
          : `🚪 Partner is in <strong>${zoneName}</strong> — Click <strong>[✨ Join]</strong>!`;
        if (subEl._lastPartnerSub !== nextSub) {
          subEl.innerHTML = nextSub;
          subEl._lastPartnerSub = nextSub;
        }
      }

      if (sameZone && coopPartner.mesh.visible) {
        const tagEl = coopPartner.labelEl.querySelector('.npc-tag');
        if (tagEl) {
          const nextTag = distToPlayer > 12 ? `★ PARTNER SHARK · ${distToPlayer}m` : '★ CROSS-OCEAN CO-OP SHARK';
          if (tagEl._lastText !== nextTag) {
            tagEl.textContent = nextTag;
            tagEl._lastText = nextTag;
          }
        }
        projectLabel(coopPartner.mesh.position, coopPartner.labelEl, 3.35, true);
      } else {
        coopPartner.labelEl.style.opacity = '0';
        coopPartner.labelEl.style.display = 'none';
      }
    }

    celestialHudAccum += 0.016;
    if (celestialHudAccum >= 0.25) {
      celestialHudAccum = 0;
      updateCelestialClockHUD();
    }
  }

  function updateCelestialClockHUD() {
    const getSkyFn = (worldApi && worldApi.getDayNightState) || (window.BlahajWorld && window.BlahajWorld.getDayNightState);
    if (getSkyFn) {
      const skyState = getSkyFn();
      if (skyState) {
        const iconEl = document.getElementById('clock-phase-icon');
        const timeEl = document.getElementById('clock-time-text');
        const phaseEl = document.getElementById('clock-phase-tag');
        const badgeEl = document.getElementById('clock-sync-badge');
        const sliderTimeEl = document.getElementById('sky-slider-time-label');
        const sliderPhaseEl = document.getElementById('sky-slider-phase-label');
        const sliderEl = document.getElementById('sky-time-slider');

        if (iconEl) iconEl.textContent = skyState.phaseIcon;
        if (timeEl) timeEl.textContent = skyState.timeStr;
        if (phaseEl) phaseEl.textContent = skyState.phaseName;

        const isReal = window.__BLAHAJ_DAY_CYCLE__ && window.__BLAHAJ_DAY_CYCLE__.isRealtime;
        if (badgeEl) {
          badgeEl.textContent = isReal ? '● CLOCK SYNC' : 'MANUAL';
          badgeEl.classList.toggle('manual', !isReal);
        }

        if (sliderTimeEl) sliderTimeEl.textContent = skyState.timeStr;
        if (sliderPhaseEl) sliderPhaseEl.textContent = skyState.phaseName;
        if (sliderEl && document.activeElement !== sliderEl) {
          const totalMin = ((skyState.progress * 24.0 * 60.0 + 6.0 * 60.0) % 1440.0 + 1440.0) % 1440.0;
          sliderEl.value = Math.round(totalMin);
        }
      }
    }

    // Live Ocean Wave Swell HUD in Flyout
    const getWaveFn = (worldApi && worldApi.getWaveState) || (window.BlahajWorld && window.BlahajWorld.getWaveState);
    if (getWaveFn) {
      const waveState = getWaveFn();
      if (waveState) {
        const waveBadge = document.getElementById('wave-cycle-badge');
        const waveAmpLabel = document.getElementById('wave-slider-amp-label');
        const waveCondLabel = document.getElementById('wave-slider-condition-label');
        const waveSlider = document.getElementById('wave-amp-slider');
        const btnAuto = document.getElementById('btn-toggle-wave-auto');

        if (waveBadge) {
          waveBadge.textContent = waveState.autoCycle ? '🔄 Auto Swell' : '⚓ Manual Swell';
        }
        if (waveAmpLabel) {
          waveAmpLabel.textContent = `${waveState.amplitude.toFixed(2)}x`;
        }
        if (waveCondLabel) {
          waveCondLabel.textContent = waveState.label;
        }
        if (waveSlider && waveState.autoCycle && document.activeElement !== waveSlider) {
          waveSlider.value = Math.round(waveState.amplitude * 100);
        }
        if (btnAuto) {
          btnAuto.classList.toggle('active', waveState.autoCycle);
          btnAuto.textContent = waveState.autoCycle ? '🌊 Auto Wave Cycle: ON' : '⚓ Auto Wave Cycle: OFF';
        }
      }
    }

    // Keep Character Sheet currencies synchronized if open
    const csModal = document.getElementById('character-sheet-modal');
    if (csModal && !csModal.classList.contains('hidden')) {
      const curBirbs = document.getElementById('cs-cur-birbs');
      const curCarrots = document.getElementById('cs-cur-carrots');
      const curTrials = document.getElementById('cs-cur-trials');
      const curSeam = document.getElementById('cs-cur-seam');
      if (curBirbs) curBirbs.textContent = player.birbsFedCount;
      if (curCarrots) curCarrots.textContent = player.carrotsKnockedCount;
      if (curTrials) curTrials.textContent = player.trialPoints;
      if (curSeam) curSeam.textContent = `${player.seamMendedCount || 0} / 6`;
    }
  }

  const _projScratch = new THREE.Vector3();
  function projectLabel(worldPos, domEl, heightOffset, isPartnerBeacon = false) {
    if (!domEl) return;
    _projScratch.copy(worldPos);
    _projScratch.y += heightOffset;
    const dist = _projScratch.distanceTo(camera.position);

    const maxDist = isPartnerBeacon ? 800.0 : 18.0;
    if (dist > maxDist) {
      if (domEl._lastDisplay !== 'none') {
        domEl.style.opacity = '0';
        domEl.style.display = 'none';
        domEl._lastDisplay = 'none';
      }
      return;
    }

    _projScratch.project(camera);
    if (_projScratch.z > 1) {
      if (domEl._lastDisplay !== 'none') {
        domEl.style.opacity = '0';
        domEl.style.display = 'none';
        domEl._lastDisplay = 'none';
      }
      return;
    }

    let x = (_projScratch.x * 0.5 + 0.5) * window.innerWidth;
    let y = (-(_projScratch.y * 0.5) + 0.5) * window.innerHeight;
    if (isPartnerBeacon) {
      x = Math.max(80, Math.min(window.innerWidth - 80, x));
      y = Math.max(70, Math.min(window.innerHeight - 90, y));
    }
    if (domEl._lastDisplay !== '') {
      domEl.style.display = '';
      domEl._lastDisplay = '';
    }
    const opacity = isPartnerBeacon
      ? '0.96'
      : (dist <= 8.0 ? 1.0 : Math.max(0, (18.0 - dist) / 10.0)).toFixed(2);
    if (domEl._lastOpacity !== opacity) {
      domEl.style.opacity = opacity;
      domEl._lastOpacity = opacity;
    }
    domEl.style.left = `${x}px`;
    domEl.style.top = `${y}px`;
  }

  function updateCoopPartner(dt, elapsed) {
    const activeScene = getActiveScene();
    const normCurrentZone = (!currentZone || currentZone === 'overworld') ? 'island' : currentZone;

    // Update any 3rd/4th+ sharks in the shared world
    const now = Date.now();
    extraCoopPeers.forEach((peerObj, remId) => {
      if (now - (peerObj.lastSeen || 0) > 15000) {
        removeExtraCoopPeer(remId);
        return;
      }
      if (!peerObj.mesh) return;
      const peerZone = (!peerObj.zone || peerObj.zone === 'overworld') ? 'island' : peerObj.zone;
      const sameZ = peerZone === normCurrentZone;
      peerObj.mesh.visible = sameZ;
      if (peerObj.mesh.parent !== activeScene) {
        if (peerObj.mesh.parent) peerObj.mesh.parent.remove(peerObj.mesh);
        activeScene.add(peerObj.mesh);
      }
      let rDiff = (peerObj.targetRotY || 0) - peerObj.mesh.rotation.y;
      while (rDiff < -Math.PI) rDiff += Math.PI * 2;
      while (rDiff > Math.PI) rDiff -= Math.PI * 2;
      peerObj.mesh.rotation.y += rDiff * Math.min(1.0, dt * 14.0);
      peerObj.mesh.position.lerp(peerObj.targetPos, Math.min(1.0, dt * 12.0));
      if (peerObj.isLounging) {
        peerObj.mesh.rotation.x = -0.34;
        const breath = Math.sin(elapsed * 2.2) * 0.03;
        peerObj.mesh.scale.set(1.12 + breath * 0.5, 0.78 + breath, 1.05);
      } else if (peerObj.isPlayingPlushie) {
        peerObj.mesh.rotation.x = 0.08;
        peerObj.mesh.scale.set(1.06, 0.88, 1.04);
      } else if (peerObj.isSeatedInBooth) {
        peerObj.mesh.rotation.x = -0.18;
        peerObj.mesh.scale.set(1.02, 0.94, 0.96);
      } else {
        peerObj.mesh.rotation.x = 0;
        peerObj.mesh.scale.set(1.0, 1.0, 1.0);
      }
      if (window.BlahajMMO && typeof window.BlahajMMO.syncRemotePostureAura === 'function') {
        window.BlahajMMO.syncRemotePostureAura(peerObj.mesh, peerObj.activePostureId, elapsed);
      }
      window.BlahajModels.animateShark(peerObj.mesh, dt, !!peerObj.isMoving, elapsed);
      if (peerObj.labelEl) {
        if (sameZ) {
          projectLabel(peerObj.mesh.position, peerObj.labelEl, 3.35, true);
        } else {
          peerObj.labelEl.style.opacity = '0';
          peerObj.labelEl.style.display = 'none';
        }
      }
    });

    if (!coopPartner.active || !coopPartner.mesh) return;
    updateCoopPartnerVisibility();

    // If co-op partner is seated inside the UFO, ufo.js owns their exact seat transform (prevents floating in sky!)
    if (window.BlahajUFO && typeof window.BlahajUFO.isPartnerAboard === 'function' && window.BlahajUFO.isPartnerAboard()) {
      return;
    }

    // 1. Smooth Yaw Slerp with shortest-arc angular wrap (eliminates visual snapping & 360-degree spin flips)
    let rotDiff = coopPartner.targetRotY - coopPartner.mesh.rotation.y;
    while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
    while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
    coopPartner.mesh.rotation.y += rotDiff * Math.min(1.0, dt * 14.0);

    // 2. Dead Reckoning: smoothly extrapolate along movement vector between network packets
    if (coopPartner.isMoving && !coopPartner.inBoat && !coopPartner.inCart) {
      const estSpeed = 6.2;
      const fwdX = Math.sin(coopPartner.targetRotY) * estSpeed * dt;
      const fwdZ = Math.cos(coopPartner.targetRotY) * estSpeed * dt;
      coopPartner.targetPos.x += fwdX * 0.40;
      coopPartner.targetPos.z += fwdZ * 0.40;
    }

    // 3. Smooth Position Interpolation
    coopPartner.mesh.position.lerp(coopPartner.targetPos, Math.min(1.0, dt * 12.0));

    // 4. Plush Anatomy & Posture Handling (Lounging, Playing Plushie, Seated Booth, Guard Aura)
    if (coopPartner.isLounging) {
      coopPartner.mesh.rotation.x = -0.34;
      const breath = Math.sin(elapsed * 2.2) * 0.03;
      coopPartner.mesh.scale.set(1.12 + breath * 0.5, 0.78 + breath, 1.05);
    } else if (coopPartner.isPlayingPlushie) {
      coopPartner.mesh.rotation.x = 0.08;
      coopPartner.mesh.scale.set(1.06, 0.88, 1.04);
    } else if (coopPartner.isSeatedInBooth) {
      coopPartner.mesh.rotation.x = -0.18;
      coopPartner.mesh.scale.set(1.02, 0.94, 0.96);
    } else {
      coopPartner.mesh.rotation.x = 0;
      coopPartner.mesh.scale.set(1.0, 1.0, 1.0);
    }
    if (window.BlahajMMO && typeof window.BlahajMMO.syncRemotePostureAura === 'function') {
      window.BlahajMMO.syncRemotePostureAura(coopPartner.mesh, coopPartner.activePostureId, elapsed);
    }

    if (coopPartner.inCart && currentZone === 'laundromat') {
      coopPartner.mesh.position.y = 0.38;
      if (window.BlahajLaundromat && coopPartner.cartId) {
        window.BlahajLaundromat.updateRemoteCart(
          coopPartner.cartId,
          coopPartner.mesh.position,
          coopPartner.mesh.rotation.y,
          coopPartner.isMoving,
          dt
        );
      }
      window.BlahajModels.animateShark(
        coopPartner.mesh,
        dt,
        false,
        elapsed
      );
    } else {
      window.BlahajModels.animateShark(
        coopPartner.mesh,
        dt,
        coopPartner.isMoving && !coopPartner.inBoat,
        elapsed
      );
    }

    // 5. Project Partner 3D Nameplate & Update HUD Distance Status in ALL zones (including Laundromat & Bistro!)
    if (coopPartner.labelEl) {
      const pZone = (!coopPartner.zone || coopPartner.zone === 'overworld') ? 'island' : coopPartner.zone;
      const sameZone = pZone === normCurrentZone;
      const distToPlayer = Math.round(coopPartner.mesh.position.distanceTo(player.pos));
      const zoneName = getZoneFriendlyName(pZone);

      const subEl = document.getElementById('coop-status-sub');
      if (subEl) {
        const nextSub = sameZone
          ? (distToPlayer <= 20
              ? `🦈 Beside you in <strong>${zoneName}</strong> (${distToPlayer}m)`
              : `📍 <strong>${distToPlayer}m away</strong> in ${zoneName} — Click <strong>[✨ Join]</strong>!`)
          : `🚪 Partner is in <strong>${zoneName}</strong> — Click <strong>[✨ Join]</strong>!`;
        if (subEl._lastPartnerSub !== nextSub) {
          subEl.innerHTML = nextSub;
          subEl._lastPartnerSub = nextSub;
        }
      }

      if (sameZone && coopPartner.mesh.visible) {
        const tagEl = coopPartner.labelEl.querySelector('.npc-tag');
        if (tagEl) {
          const nextTag = distToPlayer > 12 ? `★ PARTNER SHARK · ${distToPlayer}m` : '★ CROSS-OCEAN CO-OP SHARK';
          if (tagEl._lastText !== nextTag) {
            tagEl.textContent = nextTag;
            tagEl._lastText = nextTag;
          }
        }
        projectLabel(coopPartner.mesh.position, coopPartner.labelEl, 3.35, true);
      } else {
        coopPartner.labelEl.style.opacity = '0';
        coopPartner.labelEl.style.display = 'none';
      }
    }

    // Sync Partner's Regatta Sailboat Mesh whenever Partner is sailing!
    const pBoat = worldApi.getPartnerBoatMesh && worldApi.getPartnerBoatMesh();
    if (pBoat) {
      pBoat.visible = !!coopPartner.inBoat;
      if (coopPartner.inBoat) {
        pBoat.position.set(coopPartner.mesh.position.x, 0.45, coopPartner.mesh.position.z);
        pBoat.rotation.y = coopPartner.mesh.rotation.y;
      }
    }
  }

  function updateFloatingBursts(dt) {
    for (let i = floatingBursts.length - 1; i >= 0; i--) {
      const b = floatingBursts[i];
      b.life -= dt;
      if (b.gravity) b.vel.y -= b.gravity * dt;
      b.mesh.position.addScaledVector(b.vel, dt);
      if (b.expandRate) {
        const prog = 1 - Math.max(0, b.life / (b.maxLife || 0.8));
        b.mesh.scale.setScalar((b.baseScale || 0.5) + prog * b.expandRate);
        if (b.mesh.material && typeof b.mesh.material.opacity === 'number') {
          b.mesh.material.opacity = Math.max(0, (1 - prog) * 0.85);
        }
      } else {
        b.mesh.rotation.y += dt * 4;
        b.mesh.scale.setScalar(Math.max(0.01, b.life));
      }
      if (b.life <= 0) {
        if (b.mesh.parent) b.mesh.parent.remove(b.mesh);
        if (b.expandRate && b.mesh.material && typeof b.mesh.material.dispose === 'function') {
          b.mesh.material.dispose();
        }
        floatingBursts.splice(i, 1);
      }
    }
  }

  function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (composer) {
      composer.setSize(window.innerWidth, window.innerHeight);
    }
  }

  window.__DEBUG__ = {
    get gameSettings() { return gameSettings; },
    openSettingsModal,
    closeSettingsModal,
    toggleSettingsModal,
    applySetting,
    applyAllSettings,
    saveSettings,
    getPlayer: () => player,
    get player() { return player; },
    getWorldApi: () => worldApi,
    getCamera: () => camera,
    getCamState: () => camState,
    getScene: () => scene,
    getZone: () => currentZone,
    getCoopPartner: () => coopPartner,
    getWorldActors: () => worldActors,
    getNearestInteractable: () => nearestInteractable,
    applySteamingSpiritBuff,
    triggerFeedBreb,
    triggerBeepNose,
    triggerInteract,
    unlockSeamDetector: claimAethericSeamDiviner,
    onRiftMendedByTouch,
    getHasSeamDetector: () => localStorage.getItem('blahaj_unlocked_seam_detector') === 'true',
    getActiveHeldItem: () => playerHeldItem.id,
    openGalleryArtwork,
    updateCamera,
    enterVolcanoTrial,
    exitVolcanoTrial,
    enterLaundromat,
    exitLaundromat,
    enterSpawningPits,
    exitSpawningPits,
    enterSphericalFoods,
    enterVolleyballCourt,
    exitVolleyballCourt,
    exitSphericalFoods,
    triggerHelensBirthdayCake,
    openSphericalFoodsMenuModal,
    orderSphericalDish,
    eatServedDish,
    popBirthdayCracker,
    bakeBrebAtOven,
    collectWorldPickup,
    getPlayerInventory: () => player.inventory,
    equipHeldItem,
    stowHeldItem,
    savorHeldItem,
    toggleHeldItem,
    getPlayerHeldItem: () => playerHeldItem,
    toggleMinimalHUD,
    triggerBoopAttack: triggerBeepNose,
    getWorldPickups: () => worldPickups,
    getSolomonBreadOven: () => solomonBreadOven,
    getCommunityTrunk: () => communityTrunk,
    getLaunchMortarStation: () => launchMortarStation,
    openCommunityTrunkModal,
    closeCommunityTrunkModal,
    launchHelenBirthdayFireworks,
    craftStarPowderAtSolomon,
    craftMortarAtHiram,
    craftFuseAtNimue,
    assembleAndLaunchFireworks,
    sitInBooth,
    standUpFromBooth,
    sitOnDeckChair,
    standUpFromDeckChair,
    sipPinaColada,
    damagePlayer,
    openFastTravelModal: openIslandMap,
    closeFastTravelModal: closeIslandMap,
    toggleFastTravelModal: toggleIslandMap,
    fastTravelTo: castBetweenPortalFastTravel,
    openIslandMap,
    closeIslandMap,
    toggleIslandMap,
    castBetweenPortalFastTravel,
    selectMapLandmark,
    renderIslandMap,
    teleportToCoopPartner,
    spawnPlayerShark,
    switchShark: (sharkId) => spawnPlayerShark(sharkId),
    toggleBuilderMode,
    setBuilderMode,
    getBuilderState: () => builderState,
    placeActiveBlueprint,
    deployStarterHomesteadKit,
    openSpawningPitsRaidModal,
    closeSpawningPitsRaidModal,
    enterBinocularMode,
    enterBinoculars: enterBinocularMode,
    exitBinoculars: exitBinocularMode,
    exitBinocularMode,
    toggleBinocularMode,
    enterTelescopeMode,
    exitTelescopeMode,
    toggleTelescopeMode,
    isUsingTelescope: () => isUsingTelescope,
    waveToCloudSharks,
    equipHeldItem,
    isUsingBinoculars: () => isUsingBinoculars,
    openSphericalPaintingModal,
    triggerLaundromatSpinCycle,
    mountLaundryCart,
    dismountLaundryCart,
    getKeys: () => keys,
    getOccupiedCart: () => window.BlahajLaundromat?.getOccupiedCart(),
    adjustSharkMange,
    setSharkMange,
    getSharkMange,
    triggerGroomAvatar,
    spawnCoopPartnerShark,
    refreshWorldActorMesh,
    handleVolcanoTrapHit,
    triggerSignatureAbility,
    embarkIntoGame,
    logOutToCharacterSelect,
    finishLoadingScreen,
    openIslandMap,
    closeIslandMap,
    toggleIslandMap,
    isGameLoaded: () => isGameLoaded,
    getRenderer: () => renderer,
    getCamera: () => camera,
    getComposer: () => composer,
    getScene: () => scene,
    getCompletedQuests: () => completedQuests,
    completeQuest,
    unlockDeveloperDebugPanel,
    renderDebugPanelState,
    teleportToRift,
    getDiscoveredLandmarks: () => discoveredLandmarks,
    getHermesMastery: () => hermesPortalMastery,
    getMangeFactors: () => {
      const out = {};
      ['solomon', 'nimue', 'hiram', 'hermes', 'custom'].forEach((id) => { out[id] = getSharkMange(id); });
      return out;
    },
    getSharkAccessories: () => {
      const out = {};
      ['solomon', 'nimue', 'hiram', 'hermes', 'custom'].forEach((id) => { out[id] = getSharkAccessories(id); });
      return out;
    },
    restoreMangeFactors: (m) => {
      if (m && typeof m === 'object') {
        Object.keys(m).forEach((id) => setSharkMange(id, m[id]));
      }
    },
    restoreSharkAccessories: (a) => {
      if (a && typeof a === 'object') {
        Object.keys(a).forEach((id) => setSharkAccessories(id, a[id]));
      }
    },
    restoreCompletedQuests: (arr) => {
      completedQuests.clear();
      (arr || []).forEach((q) => completedQuests.add(q));
      renderQuestList();
    },
    restoreDiscoveredLandmarks: (arr) => {
      discoveredLandmarks.clear();
      (arr || []).forEach((l) => discoveredLandmarks.add(l));
      saveDiscoveredLandmarks();
    },
    restoreHermesMastery: (m) => {
      if (m) {
        hermesPortalMastery.level = m.level || 1;
        hermesPortalMastery.exp = m.exp || 0;
        saveHermesPortalMastery();
      }
    },
    saveGame: () => window.BlahajSaveSystem && window.BlahajSaveSystem.saveNow(),
    getSaveState: () => window.BlahajSaveSystem && window.BlahajSaveSystem.getSaveState(),
    exportSaveFile: () => window.BlahajSaveSystem && window.BlahajSaveSystem.exportSaveFile(),
    importSaveFile: (data) => window.BlahajSaveSystem && window.BlahajSaveSystem.importSaveFile(data),
    switchSaveSlot: (slot) => window.BlahajSaveSystem && window.BlahajSaveSystem.switchSlot(slot),
    resetSaveSlot: () => window.BlahajSaveSystem && window.BlahajSaveSystem.resetCurrentSlot(),
    triggerIncursion: () => window.BlahajSeam && window.BlahajSeam.triggerIncursion(true),
    fastForwardSeam: (sec) => window.BlahajSeam && window.BlahajSeam.fastForward(sec),
    rerollSeamRifts: () => window.BlahajSeam && window.BlahajSeam.rerollRifts(),
    instaMendAllSeams: () => window.BlahajSeam && window.BlahajSeam.instaMendAll(),
    banishAllInvaders: () => window.BlahajSeam && window.BlahajSeam.banishAllInvaders(),
    getSeamState: () => window.BlahajSeam && window.BlahajSeam.getState(),
    spawnWaterBreachSplash,
    enterSpaceMap,
    exitSpaceMap,
    enterCheeseMoon,
    exitCheeseMoon,
    returnHomeFromCheeseMoon,
    enterHyperspace,
    exitHyperspaceTo,
    isCurrentInstancePaused,
    showStoryPauseModal,
    closeStoryPauseModal
  };
  window.BlahajGame = window.__DEBUG__;
  window.camState = camState;
  window.player = player;
  window.scene = scene;
  window.worldActors = worldActors;
  window.coopPartner = coopPartner;
  window.getActiveScene = getActiveScene;
  window.openDialogueModal = openDialogueModal;
  window.closeDialogueModal = closeDialogueModal;
  window.enterVolleyballCourt = enterVolleyballCourt;

  window.addEventListener('DOMContentLoaded', init);
})();
