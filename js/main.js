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
    sfxVol: 85,
    sfxMute: false,
    ambientVol: 65,
    ambientMute: false,
    footsteps: true,
    birbCalls: true,
    fov: 60,
    camDist: 6.5,
    shoulder: 'right',
    invertY: false,
    mouseSens: 1.0,
    bloom: true,
    shadows: true,
    oceanWaves: true,
    streamerMode: false,
    compassVis: true,
    nametagsVis: true,
    questVis: true,
    chatVis: true
  };
  let gameSettings = Object.assign({}, DEFAULT_SETTINGS);
  let bloomPassInstance = null;

  // --- Audio Synthesizer (Cozy WebAudio Chimes, Ambient Waves, Wind, Splashes & Footsteps) ---
  const CozyAudio = {
    ctx: null,
    masterGain: null,
    sfxGain: null,
    ambientGain: null,
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
    lastFootstepTime: 0,
    ambientInitialized: false,

    ensure() {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) this.ctx = new AC();
      }
      if (this.ctx && !this.masterGain) {
        try {
          this.masterGain = this.ctx.createGain();
          this.sfxGain = this.ctx.createGain();
          this.ambientGain = this.ctx.createGain();

          this.sfxGain.connect(this.masterGain);
          this.ambientGain.connect(this.masterGain);
          this.masterGain.connect(this.ctx.destination);
          this.syncVolumes();
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

    syncVolumes(settings = gameSettings) {
      if (!this.ctx || !this.masterGain) return;
      const now = this.ctx.currentTime;
      const cfg = settings || DEFAULT_SETTINGS;
      const mVol = cfg.masterMute ? 0.0001 : Math.max(0.0001, (cfg.masterVol ?? 80) / 100);
      const sVol = cfg.sfxMute ? 0.0001 : Math.max(0.0001, (cfg.sfxVol ?? 85) / 100);
      const aVol = cfg.ambientMute ? 0.0001 : Math.max(0.0001, (cfg.ambientVol ?? 65) / 100);

      this.masterGain.gain.setTargetAtTime(mVol, now, 0.05);
      this.sfxGain.gain.setTargetAtTime(sVol, now, 0.05);
      this.ambientGain.gain.setTargetAtTime(aVol, now, 0.05);
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
    },

    updateAmbient(elapsed, playerPos, inBoat, isMoving, camHeight) {
      if (!this.ctx || !this.ambientInitialized) return;
      const now = this.ctx.currentTime;

      // Distance to nearest sea level / ocean
      const distFromCenter = Math.hypot(playerPos.x, playerPos.z);
      const isNearWater = playerPos.y < 2.5 || distFromCenter > 60 || inBoat;
      const oceanTargetVol = inBoat ? 0.08 : (isNearWater ? 0.055 : 0.022);

      // Surf rhythmic wave swelling
      const swell = (Math.sin(elapsed * 1.6) * 0.5 + 0.5);
      const targetCutoff = 220 + swell * 280;
      this.surfGain.gain.setTargetAtTime(oceanTargetVol * (0.6 + swell * 0.6), now, 0.15);
      this.surfFilter.frequency.setTargetAtTime(targetCutoff, now, 0.2);

      // Wind intensity increases with altitude or sailing
      const altitude = Math.max(0, playerPos.y);
      const windTargetVol = 0.012 + Math.min(0.05, (altitude / 65) * 0.045) + (inBoat ? 0.02 : 0);
      const windFrequency = 350 + Math.sin(elapsed * 0.8) * 120 + (altitude * 8);
      this.windGain.gain.setTargetAtTime(windTargetVol, now, 0.25);
      this.windFilter.frequency.setTargetAtTime(windFrequency, now, 0.3);

      // Boat sailing wake sound
      if (inBoat && isMoving) {
        this.boatGain.gain.setTargetAtTime(0.045, now, 0.2);
        this.boatFilter.frequency.setTargetAtTime(550 + Math.sin(elapsed * 4.0) * 180, now, 0.1);
        if (Math.random() < 0.012) {
          this.woodCreak();
        }
      } else {
        this.boatGain.gain.setTargetAtTime(0.0001, now, 0.35);
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
      gain.gain.setValueAtTime(gainVal, now);
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
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain || this.ctx.destination);
      src.start(now);
      src.stop(now + duration);

      // Droplet plink
      this.playTone(750 + Math.random() * 250, 0.08, 'sine', vol * 0.6, 400);
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
    birbChirp() {
      if (gameSettings && !gameSettings.birbCalls) return;
      const base = 960 + Math.random() * 120;
      this.playTone(base, 0.08, 'sine', 0.1, base + 420);
      setTimeout(() => this.playTone(base + 260, 0.09, 'sine', 0.09, base + 680), 65);
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
      [1046.5, 2093.0].forEach((f, i) => {
        setTimeout(() => this.playTone(f, 0.75, 'sine', 0.18), i * 30);
      });
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

  // --------------------------------------------------------------------------
  // INDIVIDUAL SHARK SETTINGS: MANGE FACTOR & ACCESSORIES
  // --------------------------------------------------------------------------
  const SHARK_DEFAULTS = {
    hermes: { mange: 0.85, relic: true, headgear: true },
    solomon: { mange: 0.45, relic: true, headgear: true },
    hiram: { mange: 0.65, relic: true, headgear: true },
    nimue: { mange: 0.25, relic: true, headgear: true }
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

  function setSharkMange(sharkId, val) {
    val = Math.max(0.0, Math.min(1.0, val));
    localStorage.setItem('blahaj_mange_' + sharkId, val.toString());
    if (player.sharkId === sharkId) {
      window.__BLAHAJ_MANGE__ = val;
      const cfg = LORE.sharks[sharkId];
      if (player.mesh && player.mesh.parent) {
        player.mesh.parent.remove(player.mesh);
      }
      const acc = getSharkAccessories(sharkId);
      player.mesh = window.BlahajModels.createPlushShark(cfg, val, acc);
      player.mesh.position.copy(player.pos);
      player.mesh.rotation.y = player.rotY;
      const activeScene = getActiveScene();
      activeScene.add(player.mesh);

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
    inWater: false,
    isSwimming: false,
    waterSurfaceY: 0.22,
    bubbleTimer: 0,
    hasSeenPelagicRiftNotice: false,
    warmth: 100,
    teaComfort: 88,
    volcanoHonour: 72,
    seamMendedCount: 3,
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
    lastSharedTeaTime: 0
  };

  // Hiram the Magical Builder State (Exclusive to Hiram [3]!)
  const builderState = {
    active: false,
    freeBuild: false,
    category: 'village',
    selectedId: 'birch_cabin',
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
      return window.BlahajVolcano.getScene();
    }
    if (currentZone === 'laundromat' && window.BlahajLaundromat) {
      return window.BlahajLaundromat.getScene();
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

  // Neverwinter / MMO Over-The-Shoulder Camera State
  const camState = {
    yaw: -Math.PI / 2,
    pitch: 0.22,
    distance: 7.4,
    shoulderRight: 0.85,
    heightOffset: 2.35,
    isRightDragging: false,
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
    camState.isRightDragging = false;
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
    labelEl: null
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
  // INITIALIZATION
  // ==========================================================================
  function init() {
    const container = document.getElementById('canvas-container');
    clock = new THREE.Clock();

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(56, window.innerWidth / window.innerHeight, 0.1, 2400);

    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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

    // 1. Build Expanded Blåhaj Archipelago (Main Island + 4 Outer Sanctuary Islands)
    worldApi = window.BlahajWorld.buildWorld(scene);
    loadSavedStructures();
    player.pos.y = worldApi.getGroundAndStructureHeight(player.pos.x, player.pos.z);

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
            }
          });
        }
        window.BlahajVolcano.build().catch((err) => {
          console.warn('Volcano background build warning:', err);
        });
      } catch (err) {
        console.error('Failed to init BlahajVolcano:', err);
      }
    }

    // 2. Spawn High-Polygon Player Shark & All Island Characters
    spawnPlayerShark('hermes');
    spawnWorldCharacters();

    // 3. Setup Controls, UI, Builder Toolbar, Gallery, Upgrades & Co-op Networking
    loadSettings();
    setupInputs();
    setupUI();
    setupSettingsUI();
    applyAllSettings();
    setupBuilderUI();
    setupNetwork();
    renderQuestList();
    updateMetersUI();
    renderUpgradesGrid();

    window.addEventListener('resize', onWindowResize);
    requestAnimationFrame(animate);
  }

  function spawnPlayerShark(sharkId) {
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
      slotCSub.textContent = sharkId === 'hiram' ? 'Ready [C]' : 'Need Hiram [3]';
    }

    // If switching away from Hiram while Master Builder Mode is open, close Builder Mode cleanly
    if (sharkId !== 'hiram' && builderState.active) {
      setBuilderMode(false);
    } else if (sharkId === 'hiram') {
      showToast('HIRAM THE BUILDER ACTIVE 🔧', 'Press [C] to open Hiram’s Categorized Master Builder Toolbar!');
    }

    window.BlahajNetwork.send({
      type: 'shark_swap',
      sharkId
    });
  }

  function spawnWorldCharacters() {
    const labelsRoot = document.getElementById('world-labels');

    Object.values(LORE.sharks).forEach((sCfg) => {
      const mesh = window.BlahajModels.createPlushShark(sCfg);
      const hy = worldApi.getGroundAndStructureHeight(sCfg.homePos.x, sCfg.homePos.z);
      mesh.position.set(sCfg.homePos.x, hy, sCfg.homePos.z);
      mesh.rotation.y = sCfg.homePos.rotY || 0;
      mesh.visible = sCfg.id !== player.sharkId;
      scene.add(mesh);

      const labelEl = createWorldLabel(labelsRoot, sCfg.name, 'THE FOUR BLUE SHARKS');
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

    // Attach floating directional labels to all 6 High Island Crossroads Signposts
    if (worldApi.getSignposts) {
      worldApi.getSignposts().forEach((sp) => {
        sp.labelEl = createWorldLabel(labelsRoot, sp.title, sp.directions);
      });
    }
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

  function spawnFloatingBurst(originPos, colorHex = 0xff7eb6, count = 7) {
    const activeScene = getActiveScene();
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.18, 0),
        new THREE.MeshBasicMaterial({ color: colorHex })
      );
      mesh.position.copy(originPos).add(new THREE.Vector3(
        (Math.random() - 0.5) * 1.4,
        1.8 + Math.random() * 0.7,
        (Math.random() - 0.5) * 1.4
      ));
      activeScene.add(mesh);
      floatingBursts.push({
        mesh,
        vel: new THREE.Vector3((Math.random() - 0.5) * 1.5, 1.8 + Math.random() * 1.2, (Math.random() - 0.5) * 1.5),
        life: 1.1
      });
    }
  }

  function spawnUnderwaterBubbles(originPos, count = 4) {
    const activeScene = getActiveScene();
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.12 + Math.random() * 0.08, 6, 6),
        new THREE.MeshBasicMaterial({
          color: 0xa5f3fc,
          transparent: true,
          opacity: 0.72
        })
      );
      mesh.position.copy(originPos).add(new THREE.Vector3(
        (Math.random() - 0.5) * 0.9,
        (Math.random() - 0.5) * 0.4,
        (Math.random() - 0.5) * 0.9
      ));
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
    const mesh = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.12, 0),
      new THREE.MeshBasicMaterial({ color: 0x93c5fd, transparent: true, opacity: 0.85 })
    );
    mesh.position.copy(originPos).add(new THREE.Vector3(
      (Math.random() - 0.5) * 0.4,
      0.55 + Math.random() * 0.2,
      (Math.random() - 0.5) * 0.4
    ));
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
      const mesh = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.045, 0),
        new THREE.MeshStandardMaterial({ color: 0xd99b4e, roughness: 0.8 })
      );
      mesh.position.copy(originPos).add(new THREE.Vector3(
        (Math.random() - 0.5) * 0.35,
        0.08 + Math.random() * 0.15,
        (Math.random() - 0.5) * 0.35
      ));
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
    showToast('MUNCH MUNCH! 🥖🐦', `Plump Birb happily pecked warm Breb! (Appetite: ${appetiteState}) (+1 Birb Crumb)`);
    addChatLog(`🐦 Birb happily finished pecking a loaf of Breb (${appetiteState} full). +1 Birb Crumb!`, 'lore');
    completeQuest('q-breb');
    updateMetersUI();
    renderBuilderToolbar();
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
    const canvas = renderer.domElement;

    canvas.addEventListener('click', () => {
      CozyAudio.ensure();
      if (!isAnyModalOpen() && document.pointerLockElement !== canvas) {
        canvas.requestPointerLock?.();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      camState.isPointerLocked = document.pointerLockElement === canvas;
      if (!camState.isPointerLocked) {
        clearAllMovementKeys();
      }
    });

    window.addEventListener('blur', clearAllMovementKeys);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) clearAllMovementKeys();
    });
    window.addEventListener('focus', clearAllMovementKeys);

    let mouseDownPos = { x: 0, y: 0 };

    canvas.addEventListener('mousedown', (e) => {
      CozyAudio.ensure();
      mouseDownPos = { x: e.clientX, y: e.clientY };
      if (e.button === 2 || e.button === 0) {
        camState.isRightDragging = true;
      }
    });

    canvas.addEventListener('mouseup', (e) => {
      const dragDist = Math.hypot(e.clientX - mouseDownPos.x, e.clientY - mouseDownPos.y);
      if (e.button === 0 && dragDist < 6 && builderState.active && !isAnyModalOpen()) {
        placeActiveBlueprint();
      }
    });

    window.addEventListener('mouseup', () => {
      camState.isRightDragging = false;
    });

    window.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      clearAllMovementKeys();
    });

    window.addEventListener('mousemove', (e) => {
      if (isAnyModalOpen()) return;
      if (camState.isPointerLocked || camState.isRightDragging) {
        const sens = (gameSettings && typeof gameSettings.mouseSens === 'number') ? gameSettings.mouseSens : 1.0;
        const invert = (gameSettings && gameSettings.invertY) ? -1 : 1;
        camState.yaw -= e.movementX * 0.0032 * sens;
        camState.pitch = Math.max(-0.25, Math.min(1.15, camState.pitch + e.movementY * 0.0026 * sens * invert));
      }
    });

    window.addEventListener('wheel', (e) => {
      if (isAnyModalOpen()) return;
      camState.distance = Math.max(4.0, Math.min(22.0, camState.distance + e.deltaY * 0.005));
    });

    window.addEventListener('keydown', (e) => {
      if (document.activeElement && document.activeElement.tagName === 'INPUT') {
        clearAllMovementKeys();
        if (e.key === 'Escape') document.activeElement.blur();
        return;
      }

      if (e.key === 'Escape') {
        clearAllMovementKeys();
        const setModal = document.getElementById('settings-modal');
        if (setModal && !setModal.classList.contains('hidden')) {
          closeSettingsModal();
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
        const uModal = document.getElementById('upgrades-modal');
        if (uModal && !uModal.classList.contains('hidden')) {
          uModal.classList.add('hidden');
          return;
        }
        toggleSettingsModal();
        return;
      }

      const k = (e.key || '').toLowerCase();
      const mapped = mapCodeToKey(e.code);
      if (k) keys[k] = true;
      if (mapped) keys[mapped] = true;

      if (e.repeat) return;

      if (k === '1') spawnPlayerShark('hermes');
      if (k === '2') spawnPlayerShark('solomon');
      if (k === '3') spawnPlayerShark('hiram');
      if (k === '4') spawnPlayerShark('nimue');

      if (k === 'c') toggleBuilderMode();
      if (k === 'v' && builderState.active) toggleFreeBuild();
      if (k === 'r' && builderState.active) {
        builderState.rotOffset += Math.PI / 4;
        CozyAudio.shonk();
      }
      if (k === 'x') removeNearestBuiltStructure();

      if (k === 'e') triggerInteract();
      if (k === 'b') triggerFeedBreb();
      if (k === 'f') triggerBeepNose();
      if (k === 'q') triggerSignatureAbility();
      if (k === 'g') triggerShonkEmote();
      if (k === 'u') toggleUpgradesModal();
      if (k === 'm') toggleGalleryModal();
      if (k === 'p') togglePortalModal();
      if (k === 'k' || k === 'i') toggleCharacterSheetModal(player.sharkId);
      if (k === 'o') toggleSettingsModal();

      if ((e.key === ' ' || e.code === 'Space') && !isAnyModalOpen()) {
        if (player.inBoat) {
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
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      const k = (e.key || '').toLowerCase();
      const mapped = mapCodeToKey(e.code);
      if (k) keys[k] = false;
      if (mapped) keys[mapped] = false;
    });
  }

  function isAnyModalOpen() {
    const skyFlyout = document.getElementById('sky-controls-flyout');
    const isSkyOpen = skyFlyout && !skyFlyout.classList.contains('hidden');
    const csModal = document.getElementById('character-sheet-modal');
    const isCSOpen = csModal && !csModal.classList.contains('hidden');
    const setModal = document.getElementById('settings-modal');
    const isSetOpen = setModal && !setModal.classList.contains('hidden');
    return (
      isSkyOpen ||
      isCSOpen ||
      isSetOpen ||
      !document.getElementById('dialogue-modal').classList.contains('hidden') ||
      !document.getElementById('portal-modal').classList.contains('hidden') ||
      !document.getElementById('gallery-modal').classList.contains('hidden') ||
      !document.getElementById('upgrades-modal').classList.contains('hidden')
    );
  }

  function releasePointerLock() {
    if (document.pointerLockElement) {
      document.exitPointerLock?.();
    }
  }

  // ==========================================================================
  // MMO CHARACTER SHEET & ARCHIPELAGO DOSSIER MODAL
  // ==========================================================================
  function openCharacterSheet(sharkId = null) {
    releasePointerLock();
    const m = document.getElementById('character-sheet-modal');
    if (!m) return;
    selectedCSShark = sharkId || player.sharkId || 'hermes';
    renderCharacterSheet(selectedCSShark);
    m.classList.remove('hidden');
    CozyAudio.shonk();
  }

  function closeCharacterSheetModal() {
    const m = document.getElementById('character-sheet-modal');
    if (m) m.classList.add('hidden');
  }

  function toggleCharacterSheetModal(sharkId = null) {
    const m = document.getElementById('character-sheet-modal');
    if (!m) return;
    if (m.classList.contains('hidden')) {
      openCharacterSheet(sharkId);
    } else {
      closeCharacterSheetModal();
    }
  }

  function renderCharacterSheet(sharkId) {
    selectedCSShark = sharkId || player.sharkId || 'hermes';
    const cfg = LORE.sharks[selectedCSShark] || LORE.sharks.hermes;

    // 1. Top Shark Selection Tabs
    document.querySelectorAll('.cs-tab').forEach((tab) => {
      tab.classList.toggle('active', tab.dataset.shark === selectedCSShark);
    });

    // 2. Active Shark Badge & Switch Button
    const activeBadge = document.getElementById('cs-active-name');
    if (activeBadge) activeBadge.textContent = LORE.sharks[player.sharkId].name;

    const switchBtn = document.getElementById('cs-btn-switch-active');
    if (switchBtn) {
      if (selectedCSShark === player.sharkId) {
        switchBtn.textContent = `✓ Currently Playing as ${cfg.name}`;
        switchBtn.classList.remove('btn-accent');
        switchBtn.classList.add('btn-secondary');
        switchBtn.style.opacity = '0.75';
      } else {
        switchBtn.textContent = `Switch Active Shark to ${cfg.name} [${cfg.key}]`;
        switchBtn.classList.remove('btn-secondary');
        switchBtn.classList.add('btn-accent');
        switchBtn.style.opacity = '1.0';
      }
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

    // 7. MMO Inventory Grid (16 Slots)
    const gridEl = document.getElementById('mmo-inventory-grid');
    if (gridEl) {
      gridEl.innerHTML = '';
      for (let i = 0; i < 16; i++) {
        const item = MMO_INVENTORY_ITEMS.find((x) => x.slot === i);
        const slotEl = document.createElement('div');
        slotEl.className = 'mmo-slot';
        if (i === selectedInventorySlot) slotEl.classList.add('selected');

        if (item) {
          slotEl.classList.add(`rarity-${item.rarity}`);
          slotEl.title = `${item.name} (${item.type})`;
          slotEl.innerHTML = `
            <span class="mmo-slot-icon">${item.icon}</span>
            ${item.qty > 1 ? `<span class="mmo-slot-qty">${item.qty}</span>` : ''}
          `;
          slotEl.addEventListener('click', () => {
            selectedInventorySlot = i;
            renderCharacterSheet(selectedCSShark);
            updateItemInspector(item);
          });
        } else {
          slotEl.classList.add('empty');
          slotEl.title = `Satchel Slot ${i + 1} (Empty)`;
          slotEl.innerHTML = `<span class="mmo-slot-icon" style="opacity: 0.25;">🎒</span>`;
          slotEl.addEventListener('click', () => {
            selectedInventorySlot = i;
            renderCharacterSheet(selectedCSShark);
            updateItemInspector(null, i);
          });
        }
        gridEl.appendChild(slotEl);
      }
    }

    // Update item inspector for selected slot
    const curItem = MMO_INVENTORY_ITEMS.find((x) => x.slot === selectedInventorySlot);
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
      if (nameEl) nameEl.textContent = item.name;
      if (rarityEl) {
        rarityEl.textContent = item.rarity.toUpperCase();
        rarityEl.className = `inspector-rarity rarity-${item.rarity}`;
      }
      if (typeEl) typeEl.textContent = item.type;
      if (descEl) descEl.textContent = item.desc;
      if (statsEl) statsEl.textContent = item.stats;

      const actWrap = document.getElementById('insp-actions');
      const useBtn = document.getElementById('btn-inspect-use');
      if (actWrap && useBtn) {
        if (item.slot === 1) { // Sacred Brew
          actWrap.style.display = 'block';
          useBtn.textContent = 'Sip Sacred Tea (+5m Steaming Spirit) 🍵';
          useBtn.onclick = () => {
            applySteamingSpiritBuff();
          };
        } else if (item.slot === 0) { // Breb
          actWrap.style.display = 'block';
          useBtn.textContent = 'Toss Warm Breb [B] 🥖';
          useBtn.onclick = () => {
            closeCharacterSheetModal();
            triggerFeedBreb();
          };
        } else {
          actWrap.style.display = 'none';
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
      if (descEl) descEl.textContent = 'Ready to hold fresh shells, loaf loaves, and treasures found across the islands.';
      if (statsEl) statsEl.textContent = 'No modifiers active.';
      const actWrap = document.getElementById('insp-actions');
      if (actWrap) actWrap.style.display = 'none';
    }
  }

  // ==========================================================================
  // HIRAM THE MAGICAL BUILDER — CATEGORIZED TOOLBAR, HOLOGRAM & PLACEMENT
  // ==========================================================================
  function getAvailableCurrency(type) {
    if (type === 'birbs') return Math.max(0, player.birbsFedCount - player.spentBirbs);
    if (type === 'carrots') return Math.max(0, player.carrotsKnockedCount - player.spentCarrots);
    if (type === 'trials') return Math.max(0, player.trialPoints);
    return 0;
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
    renderBuilderToolbar();
  }

  function toggleFreeBuild() {
    builderState.freeBuild = !builderState.freeBuild;
    CozyAudio.portalChime();
    renderBuilderToolbar();
    showToast(
      builderState.freeBuild ? 'SACRED ALLEN KEY FREE-BUILD: ON ✨' : 'COZY CURRENCY MODE ACTIVE',
      builderState.freeBuild
        ? 'All 16 Hiram blueprints now cost 0 currency!'
        : 'Building uses Birb Crumbs, Carrot Sparks, and Trial Points!'
    );
  }

  function toggleBuilderMode() {
    if (player.sharkId !== 'hiram') {
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

  function setBuilderMode(active) {
    if (active && player.sharkId !== 'hiram') return;
    builderState.active = active;
    const panel = document.getElementById('builder-panel');
    const slotC = document.getElementById('slot-c');
    if (panel) panel.classList.toggle('hidden', !active);
    if (slotC) slotC.classList.toggle('active', active);

    if (active) {
      CozyAudio.allenBuild();
      refreshPreviewMesh();
      renderBuilderToolbar();
      showToast(
        'HIRAM MASTER BUILDER MODE [C]',
        'Select a blueprint below! Press [E] or Left-Click to build, [R] to rotate, [X] to remove, or [V] for Free-Build!'
      );
    } else if (builderState.previewMesh) {
      scene.remove(builderState.previewMesh);
      builderState.previewMesh = null;
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

    const bEl = document.getElementById('b-cur-birbs');
    const cEl = document.getElementById('b-cur-carrots');
    const tEl = document.getElementById('b-cur-trials');
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
        });
        itemsContainer.appendChild(card);
      });
  }

  function updateBuilderPreview(elapsed) {
    if (!builderState.active || player.sharkId !== 'hiram') {
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

    // Place hologram 7.0m in front of Hiram's facing direction (or camera aim)
    const forwardDist =
      builderState.selectedId === 'lagoon_bridge' || builderState.selectedId === 'sky_stairs' ? 8.2 : 6.4;
    const tx = player.pos.x + Math.sin(player.rotY) * forwardDist;
    const tz = player.pos.z + Math.cos(player.rotY) * forwardDist;

    let ty = worldApi.getGroundAndStructureHeight(tx, tz, player.pos.y + 4.0);
    // Keep bridges, wharves, and floating platforms above water level so you can bridge across the ocean to Outer Islands!
    if (
      builderState.selectedId === 'lagoon_bridge' ||
      builderState.selectedId === 'custom_wharf' ||
      builderState.selectedId === 'stepping_stone' ||
      builderState.selectedId === 'sky_stairs'
    ) {
      ty = Math.max(0.25, ty);
    } else {
      ty = Math.max(0.0, ty);
    }

    builderState.targetPos.set(tx, ty, tz);
    builderState.targetRotY = player.rotY + builderState.rotOffset;

    builderState.previewMesh.position.copy(builderState.targetPos);
    builderState.previewMesh.rotation.y = builderState.targetRotY;
  }

  function placeActiveBlueprint() {
    if (!builderState.active || player.sharkId !== 'hiram') return false;
    const spec = (LORE.buildCatalog || []).find((x) => x.id === builderState.selectedId);
    if (!spec) return false;

    if (!builderState.freeBuild) {
      const avail = getAvailableCurrency(spec.currency);
      if (avail < spec.cost) {
        CozyAudio.trapHit();
        const curNames = {
          birbs: 'Birbs Fed (Press [B] to feed Birbs!)',
          carrots: 'Carrots Knocked (Bump Carrots on the Volcano Balcony!)',
          trials: 'Trial Points (Survive the Volcano Dungeon!)'
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
  // SIGNATURE GAMEPLAY ACTIONS (BREB FOR BIRBS, NOSE BEEPS, RELICS, UPGRADES)
  // ==========================================================================
  function triggerFeedBreb() {
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
    CozyAudio.beepNose();
    if (player.mesh && player.mesh.userData) {
      player.mesh.userData.beepTimer = 0.9;
    }
    spawnFloatingBurst(player.pos, 0xff7eb6, 8);

    let closestActor = null;
    let minDist = 7.0;
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
    }

    window.BlahajNetwork.send({ type: 'emote', kind: 'ability', sharkId: player.sharkId });
  }

  function mendNearbyRift(maxRadius = 12) {
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
        setTimeout(() => {
          currentZone = 'volcano';
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

  function enterLaundromat() {
    if (isTransitioningZone) return;
    isTransitioningZone = true;
    player.inBoat = false;
    player.ridingWithPartner = false;

    const overlay = document.getElementById('instance-loading');
    const titleEl = document.getElementById('instance-loading-title');
    const subEl = document.getElementById('instance-loading-sub');
    const barEl = document.getElementById('instance-progress-fill');

    titleEl.textContent = 'The Midnight Liminal Laundromat';
    subEl.textContent = 'Folding cosmic space to the 24/7 coin-op between worlds… 🌙🫧';
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
          currentZone = 'laundromat';
          if (window.BlahajLaundromat) {
            await window.BlahajLaundromat.build();
            window.BlahajLaundromat.setActive(true);
            const start = window.BlahajLaundromat.getStart();
            player.pos.set(start.x, start.y, start.z);
            player.rotY = start.rotY;
            if (player.mesh) {
              if (player.mesh.parent) player.mesh.parent.remove(player.mesh);
              window.BlahajLaundromat.getScene().add(player.mesh);
              player.mesh.position.copy(player.pos);
              player.mesh.rotation.y = player.rotY;
            }
          }
          player.velY = 0;
          player.isGrounded = true;
          camState.yaw = 0;

          overlay.classList.add('hidden');
          isTransitioningZone = false;
          showToast('THE MIDNIGHT LAUNDROMAT 🧺🌙', 'Delicate Cycle · Open 24/7. Step inside Giant Washer #7 [E]!');
          addChatLog('🧺 Stepped inside <strong>The Midnight Cosmic Laundromat</strong>. Fluorescent tubes hum softly over seafoam linoleum.', 'lore');
          updateCoopPartnerVisibility();

          window.BlahajNetwork.send({
            type: 'zone_change',
            zone: 'laundromat'
          });
        }, 250);
      }
    }, 90);
  }

  function exitLaundromat() {
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
            zone: 'island'
          });
        }, 250);
      }
    }, 90);
  }

  function triggerLaundromatSpinCycle() {
    if (!window.BlahajLaundromat || window.BlahajLaundromat.isSpinCycleActive()) return;

    // Hop shark right inside the drum facing the front porthole
    player.pos.set(0, 0.45, -5.9);
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
    camState.heightOffset = 1.85;

    showToast('SPIN CYCLE COMMENCED! 🫧🌀', 'Ka-chunk! Door latched. 40°C Warm Delicate Cycle underway!');
    addChatLog('🌀 <strong>Giant Master Washer & Spin Dryer #7</strong> started! Soapy suds swirl around you.', 'cozy');

    window.BlahajLaundromat.startSpinCycle(player, () => {
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

  function handleVolcanoTrapHit(trapName) {
    if (player.trapCooldown > 0) return;

    // Freshly Laundered Shield: Absorbs up to 2 trap strikes without fluff damage!
    if (player.launderedShieldHits > 0) {
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
    const dmg = Math.round(25 * armorBonus);
    player.warmth = Math.max(0, player.warmth - dmg);
    updateMetersUI();

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

  function triggerInteract() {
    if (isAnyModalOpen()) return;

    // If Hiram's Master Builder Mode is active and we aren't standing right on top of an NPC, [E] places the active blueprint!
    if (builderState.active && player.sharkId === 'hiram' && (!nearestInteractable || nearestInteractable.dist > 4.2)) {
      placeActiveBlueprint();
      return;
    }

    if (!nearestInteractable) return;
    const item = nearestInteractable;

    // Volcano Instance specific interactables
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
    if (item.kind === 'washer_start' || item.kind === 'washer_enter') {
      triggerLaundromatSpinCycle();
      return;
    }
    if (item.kind === 'laundromat_vending') {
      CozyAudio.coinDrop();
      player.warmth = 100;
      player.teaComfort = 100;
      updateMetersUI();
      spawnFloatingBurst(player.pos, 0xff7eb6, 12);
      showToast('VENDING MACHINE 🌸🍫', 'Dispensed a warm Lavender Soda & Fresh Scented Breb!');
      addChatLog('🍫 Purchased warm Lavender Soda from the 24/7 Laundromat Vending Machine.', 'cozy');
      return;
    }
    if (item.kind === 'laundromat_return') {
      exitLaundromat();
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
      openDialogueModal({
        speaker: act.name,
        role: act.tag,
        portrait: act.portrait,
        text: line,
        actions: [
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
        ]
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
            label: 'Build Here as Hiram [3] 🔧🏗️',
            className: 'btn-accent',
            onClick: () => {
              closeDialogueModal();
              spawnPlayerShark('hiram');
              setBuilderMode(true);
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
            label: '🌙 The Midnight Cosmic Laundromat 🧺🫧',
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
      toggleGalleryModal();
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

    if (lm.type === 'spherical') {
      CozyAudio.teaPour();
      player.teaComfort = 100;
      updateMetersUI();
      completeQuest('q-sw-feast');
      openDialogueModal({
        speaker: 'Spherical Foods Café',
        role: 'EVERYTHING IS BETTER IN A SPHERE · NO FLAT FOOD HERE',
        portrait: 'assets/gallery/Spherical-Foods.png',
        text: 'Monsieur Betterave presents the circular menu at the burgundy round booth: Lava Lychee Sphere, Miso Ramen Sphere, Burrata Bombe, Golden Beet Sphere, Truffle Mac Sphere, and Matcha Tiramisphere!',
        actions: [
          {
            label: 'Order the Lava Lychee & Truffle Mac Spheres! 🧆',
            className: 'btn-primary',
            onClick: () => {
              closeDialogueModal();
              spawnFloatingBurst(player.pos, 0xf5cd79, 14);
              showToast('WELL-ROUNDED MEAL', 'Served hot and perfectly spherical!');
            }
          }
        ]
      });
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
            label: 'Enter Midnight Laundromat (Mega Washer #7) 🧺🫧',
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
    if (key === 'masterVol' || key === 'masterMute' || key === 'sfxVol' || key === 'sfxMute' || key === 'ambientVol' || key === 'ambientMute') {
      CozyAudio.syncVolumes(gameSettings);
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

    const invY = document.getElementById('set-invert-y');
    if (invY) invY.checked = !!gameSettings.invertY;

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

  function setupSettingsUI() {
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

    document.getElementById('set-invert-y')?.addEventListener('change', (e) => {
      applySetting('invertY', e.target.checked);
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
    document.getElementById('slot-o')?.addEventListener('click', () => {
      CozyAudio.ensure();
      toggleSettingsModal();
    });
    document.getElementById('slot-q').addEventListener('click', triggerSignatureAbility);
    document.getElementById('slot-b').addEventListener('click', triggerFeedBreb);
    document.getElementById('slot-f').addEventListener('click', triggerBeepNose);
    document.getElementById('slot-g').addEventListener('click', triggerShonkEmote);
    document.getElementById('slot-u').addEventListener('click', toggleUpgradesModal);
    document.getElementById('pill-open-upgrades').addEventListener('click', toggleUpgradesModal);
    document.getElementById('slot-m').addEventListener('click', toggleGalleryModal);
    document.getElementById('slot-p').addEventListener('click', togglePortalModal);
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

    document.getElementById('dlg-close-btn').addEventListener('click', closeDialogueModal);
    document.getElementById('close-portal-modal').addEventListener('click', togglePortalModal);
    document.getElementById('close-gallery-modal').addEventListener('click', toggleGalleryModal);
    document.getElementById('close-upgrades-modal').addEventListener('click', toggleUpgradesModal);

    const closeCSBtn = document.getElementById('close-charsheet-modal');
    if (closeCSBtn) closeCSBtn.addEventListener('click', closeCharacterSheetModal);

    const openCSBtn = document.getElementById('btn-open-charsheet');
    if (openCSBtn) openCSBtn.addEventListener('click', () => openCharacterSheet(player.sharkId));

    const slotK = document.getElementById('slot-k');
    if (slotK) slotK.addEventListener('click', () => toggleCharacterSheetModal(player.sharkId));

    const unitFrame = document.getElementById('player-unit-frame');
    if (unitFrame) {
      unitFrame.style.cursor = 'pointer';
      unitFrame.addEventListener('click', (e) => {
        // Do not trigger if clicking on the mange slider or groom button directly
        if (e.target && (e.target.id === 'mange-factor-slider' || e.target.classList.contains('mange-range') || e.target.closest('#btn-groom-hud'))) {
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

    // Switch Active Shark button inside Character Sheet
    const switchActiveBtn = document.getElementById('cs-btn-switch-active');
    if (switchActiveBtn) {
      switchActiveBtn.addEventListener('click', () => {
        if (selectedCSShark !== player.sharkId) {
          spawnPlayerShark(selectedCSShark);
          renderCharacterSheet(selectedCSShark);
          CozyAudio.shonk();
          showToast(`PLAYING AS ${LORE.sharks[selectedCSShark].name.toUpperCase()} 🦈`, LORE.sharks[selectedCSShark].title);
        }
      });
    }

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
    }
    const vhudClose = document.getElementById('vhud-close');
    if (vhudClose) {
      vhudClose.addEventListener('click', (e) => {
        e.stopPropagation();
        hideVolcanoHUDCard();
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
        showToast('PLUSH GROOMED 🪮', `Brushed and fluffed ${LORE.sharks[player.sharkId].name}'s coat! (Mange: ${Math.round(next * 100)}%)`);
        addChatLog(`🪮 You groomed <strong>${LORE.sharks[player.sharkId].name}</strong>'s coat with a soft bristle brush (-20% Mange).`, 'info');
      });
    }

    // Celestial Day/Night Clock Widget & Sky Controls Flyout
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

    if (timerFill) {
      timerFill.style.animation = 'none';
      void timerFill.offsetWidth;
      timerFill.style.animation = 'vhudTimerDrain 8.5s linear forwards';
    }

    if (typeof CozyAudio !== 'undefined' && CozyAudio.portalChime) {
      CozyAudio.portalChime();
    }

    addChatLog(`${data.icon} <strong>${data.title}:</strong> ${data.plainText}`, 'lore');

    if (currentVolcanoNoticeTimer) clearTimeout(currentVolcanoNoticeTimer);
    currentVolcanoNoticeTimer = setTimeout(() => {
      hideVolcanoHUDCard();
    }, 8500);
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
    }, 280);
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

  function showToast(sub, title) {
    const banner = document.getElementById('toast-banner');
    document.getElementById('toast-sub').textContent = sub;
    document.getElementById('toast-title').textContent = title;
    banner.classList.remove('hidden');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => banner.classList.add('hidden'), 3600);
  }

  function addChatLog(html, cls = 'lore') {
    const log = document.getElementById('chat-log');
    const div = document.createElement('div');
    div.className = `chat-msg ${cls}`;
    div.innerHTML = html;
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
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

  function toggleGalleryModal() {
    const m = document.getElementById('gallery-modal');
    const willOpen = m.classList.contains('hidden');
    if (willOpen) releasePointerLock();
    m.classList.toggle('hidden');
  }

  // ==========================================================================
  // CO-OP NETWORKING (NZ <-> LA PORTAL SYNC)
  // ==========================================================================
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
        showToast('PRIVATE ROOM CREATED! 🎲', `Switched to secret room ${newCode}! Click "Copy Link" to send to Helen.`);
        addChatLog(`🎲 Switched to secret private room <strong>${newCode}</strong>.`, 'system');
      });
    }

    const hostBtn = document.getElementById('btn-host-portal');
    if (hostBtn) {
      hostBtn.addEventListener('click', () => {
        const inp = document.getElementById('host-room-code');
        const code = inp ? inp.value : '';
        CozyAudio.portalChime();
        window.BlahajNetwork.setRoom(code);
        showToast('PORTAL ROOM SET 🌌', `Switched to Room ${code.trim().toUpperCase()}!`);
      });
    }

    const joinBtn = document.getElementById('btn-join-portal');
    if (joinBtn) {
      joinBtn.addEventListener('click', () => {
        const inp = document.getElementById('join-room-code') || document.getElementById('host-room-code');
        const code = inp ? inp.value : '';
        CozyAudio.portalChime();
        window.BlahajNetwork.setRoom(code);
        showToast('STEPPED THROUGH PORTAL 🌌', `Joined Room ${code.trim().toUpperCase()}!`);
      });
    }

    window.BlahajNetwork.init({
      onConnect(info) {
        CozyAudio.portalChime();
        const partnerShark = (info && info.partnerState && info.partnerState.sharkId) || 'solomon';
        if (
          info &&
          info.partnerClientId &&
          player.sharkId === partnerShark &&
          window.BlahajNetwork.getClientId() > info.partnerClientId
        ) {
          const alt = player.sharkId === 'hermes' ? 'solomon' : 'hermes';
          spawnPlayerShark(alt);
        }
        spawnCoopPartnerShark(partnerShark);
        showToast('PORTAL LINK ESTABLISHED! 🦈💕🦈', 'Connected across the ocean! You are now on Blåhaj Island together!');
        addChatLog('🌌 <strong>Great Portal Gate:</strong> Connected across the ocean! You are now exploring together.', 'coop');
        window.BlahajNetwork.send({
          type: 'shark_swap',
          sharkId: player.sharkId,
          mange: window.__BLAHAJ_MANGE__
        });

        // Share any existing Hiram-built structures with our partner on connect!
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
      },
      onData(data) {
        if (data.type === 'move') {
          if (!coopPartner.active || (data.sharkId && data.sharkId !== coopPartner.sharkId)) {
            spawnCoopPartnerShark(data.sharkId || 'solomon', typeof data.mange === 'number' ? data.mange : undefined);
          } else if (typeof data.mange === 'number' && data.mange !== coopPartner.mangeFactor) {
            spawnCoopPartnerShark(coopPartner.sharkId || 'solomon', data.mange);
          }
          coopPartner.targetPos.set(data.x, data.y, data.z);
          coopPartner.targetRotY = data.rotY;
          coopPartner.isMoving = data.isMoving;
          coopPartner.inBoat = !!data.inBoat;
          coopPartner.zone = data.zone || 'island';
          updateCoopPartnerVisibility();
        } else if (data.type === 'mange_sync') {
          if (typeof data.mange === 'number') {
            spawnCoopPartnerShark(coopPartner.sharkId || 'solomon', data.mange);
          }
        } else if (data.type === 'zone_change') {
          coopPartner.zone = data.zone;
          updateCoopPartnerVisibility();
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
        } else if (data.type === 'rift_mend' && data.riftId) {
          worldApi.getSeamRifts().forEach((r) => {
            if (r.userData.id === data.riftId && !r.userData.mended) {
              r.userData.mended = true;
              r.userData.core.material.color.setHex(0xf5cd79);
              r.userData.core.material.wireframe = false;
              r.userData.ring.material.color.setHex(0x52f29c);
              player.seamMendedCount = worldApi.getSeamRifts().filter((x) => x.userData.mended).length;
              updateMetersUI();
              CozyAudio.portalChime();
              addChatLog('🪡✨ Your partner stitched a Great Seam Rift!', 'coop');
            }
          });
        } else if (data.type === 'emote') {
          if (coopPartner.mesh) {
            if (data.kind === 'beep') {
              CozyAudio.beepNose();
              coopPartner.mesh.userData.beepTimer = 0.9;
              spawnFloatingBurst(coopPartner.mesh.position, 0xff7eb6, 10);
              addChatLog('🦈💕 Your partner sent a fin Nose-Beep!', 'coop');
            } else if (data.kind === 'breb') {
              CozyAudio.birbChirp();
              const bPos =
                typeof data.x === 'number'
                  ? new THREE.Vector3(data.x, data.y || coopPartner.mesh.position.y, data.z)
                  : coopPartner.mesh.position.clone();
              worldApi.spawnBrebLoaf(bPos);
              if (data.golden) {
                worldApi.spawnBrebLoaf(new THREE.Vector3(bPos.x + 1.4, bPos.y, bPos.z - 0.8));
                worldApi.spawnBrebLoaf(new THREE.Vector3(bPos.x - 1.4, bPos.y, bPos.z + 0.8));
              }
              spawnFloatingBurst(bPos, 0xfbbf24, 8);
              addChatLog('🥖🐦 Your partner tossed warm Breb for the Birbs!', 'coop');
            } else {
              CozyAudio.portalChime();
              spawnFloatingBurst(coopPartner.mesh.position, 0x9b6dff, 12);
            }
          }
        } else if (data.type === 'chat') {
          addChatLog(`🌌 <strong>${data.sender}:</strong> ${data.text}`, 'coop');
        } else if (data.type === 'pier_note' && data.note) {
          pierNotes.push(data.note);
          savePierNotes();
          showToast('NEW PIER BOTTLE NOTE', `${data.note.author} left a note on the Endless Pier!`);
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
        const pBoat = worldApi.getPartnerBoatMesh && worldApi.getPartnerBoatMesh();
        if (pBoat) pBoat.visible = false;
        coopPartner.active = false;
        coopPartner.inBoat = false;
        player.ridingWithPartner = false;
        updateBlueSharkVisibility();
      }
    });
  }

  function updateCoopPartnerVisibility() {
    if (!coopPartner.mesh) return;
    const sameZone = (coopPartner.zone || 'island') === currentZone;
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

    if (!coopPartner.labelEl) {
      coopPartner.labelEl = createWorldLabel(
        document.getElementById('world-labels'),
        `${cfg.name} (Partner)`,
        '★ CROSS-OCEAN CO-OP SHARK'
      );
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
    const activeScene = getActiveScene();
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
    const dt = Math.min(clock.getDelta(), 0.1);
    const elapsed = clock.getElapsedTime();

    if (player.teaBuffTimer > 0) {
      player.teaBuffTimer = Math.max(0, player.teaBuffTimer - dt);
      player.warmth = 100;
    }

    const curQuarter = Math.floor(elapsed * 4.0);
    if (curQuarter !== lastMeterUpdateSecond) {
      lastMeterUpdateSecond = curQuarter;
      updateMetersUI();
    }

    updatePlayerMovement(dt, elapsed);
    updatePlayerShadow();
    updateBuilderPreview(elapsed);
    updateDynamicCollisions(dt);
    updateCamera(elapsed);
    updateInteractionsAndHUD();
    updateCoopPartner(dt, elapsed);
    updateFloatingBursts(dt);

    const activeScene = getActiveScene();
    if (currentZone === 'volcano' && window.BlahajVolcano) {
      const activeActors = [player.pos];
      if (coopPartner.active && coopPartner.targetPos) activeActors.push(coopPartner.targetPos);
      window.BlahajVolcano.update(dt, elapsed, activeActors, camera.position);
    } else if (currentZone === 'laundromat' && window.BlahajLaundromat) {
      window.BlahajLaundromat.update(dt, elapsed, player.pos, player.mesh);
    } else {
      window.BlahajWorld.updateWorld(elapsed, dt, scene, camera);
    }

    if (composer) {
      if (renderPass) renderPass.scene = activeScene;
      composer.render();
    } else {
      renderer.render(activeScene, camera);
    }

    // Update real-time procedural ocean, wind, sailing audio and occasional birb calls
    if (currentZone === 'island') {
      CozyAudio.updateAmbient(elapsed, player.pos, player.inBoat, keys['w'] || keys['s'] || keys['a'] || keys['d'], camState.distance);
      if (Math.random() < 0.003) {
        const distToBirbs = Math.hypot(player.pos.x - 0, player.pos.z - 15);
        if (distToBirbs < 60) {
          CozyAudio.birbChirp();
        }
      }
    }
  }

  function updatePlayerMovement(dt, elapsed) {
    let moveForward = 0;
    let moveRight = 0;

    if (!document.hasFocus() || isAnyModalOpen()) {
      clearAllMovementKeys();
    }

    if (!isAnyModalOpen() && (!document.activeElement || document.activeElement.tagName !== 'INPUT')) {
      if (keys['w'] || keys['arrowup']) moveForward += 1;
      if (keys['s'] || keys['arrowdown']) moveForward -= 1;
      if (keys['d'] || keys['arrowright']) moveRight += 1;
      if (keys['a'] || keys['arrowleft']) moveRight -= 1;
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
      const speedMult = (player.unlockedUpgrades.has('turbo_fins') ? 1.35 : 1.0) * roadBoost * teaAgilityBoost;
      const baseSpeed = player.inBoat ? 24.0 : (keys['shift'] ? 16.5 : 10.8);
      const speed = baseSpeed * speedMult;

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

        if (player.pos.y < window.BlahajVolcano.constants.LAVA_Y - 2.2) {
          handleVolcanoTrapHit('Molten Lava Sea');
        }
      } else if (currentZone === 'laundromat' && window.BlahajLaundromat) {
        if (window.BlahajLaundromat.isSpinCycleActive()) {
          // Inside spinning drum - mesh and position driven by laundromat animation engine
          player.velY = 0;
          player.isGrounded = true;
          return;
        }

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

          const resolved = window.BlahajLaundromat.resolveMove(player.pos, rawNext, player.isGrounded);
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
            const nextGroundY = worldApi.getTerrainHeight(nx, nz);
            if (player.inBoat) {
              if (nextGroundY < 0.85) {
                player.pos.x = nx;
                player.pos.z = nz;
              }
            } else {
              player.pos.x = nx;
              player.pos.z = nz;
            }
          }

          const targetAngle = Math.atan2(dirX / len, dirZ / len);
          let diff = targetAngle - player.rotY;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          player.rotY += diff * Math.min(1, dt * 12);

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
          const waterSurfaceY = worldApi.getWaveHeight(player.pos.x, player.pos.z, elapsed);
          player.waterSurfaceY = waterSurfaceY;

          const wasInWater = player.inWater;
          // Player is in water when below wave crest and ground is deeper than shallows
          player.inWater = player.pos.y < waterSurfaceY + 0.35 && groundY < waterSurfaceY - 0.25;
          // Full swimming mode when submerged or in deeper waters
          player.isSwimming = player.inWater && (player.pos.y < waterSurfaceY - 0.15 || groundY < waterSurfaceY - 1.2);

          // Water entry splash!
          if (!wasInWater && player.inWater) {
            CozyAudio.waterSplash(0.18, 0.3);
            spawnUnderwaterBubbles(player.pos, 8);
            player.velY *= 0.35; // Water resistance absorbs downward velocity
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

            // 5. Breaching the surface: if leaping upward past the wave crest, launch into air!
            if (player.pos.y > waterSurfaceY && player.velY > 4.2) {
              CozyAudio.waterSplash(0.16, 0.25);
              spawnUnderwaterBubbles(player.pos, 6);
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
      player.mesh.position.copy(player.pos);
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
      } else {
        player.mesh.rotation.order = 'XYZ';
        player.mesh.rotation.set(0, player.rotY, 0);
      }
      window.BlahajModels.animateShark(player.mesh, dt, isMoving && !player.inBoat && !player.ridingWithPartner, elapsed, player.isSwimming, player.velY);
    }

    worldActors.forEach((act) => {
      if (act.mesh && act.mesh.visible) {
        window.BlahajModels.animateShark(act.mesh, dt, false, elapsed);
      }
    });

    netSyncTimer += dt;
    if (netSyncTimer > 0.05) {
      netSyncTimer = 0;
      window.BlahajNetwork.send({
        type: 'move',
        sharkId: player.sharkId,
        x: player.pos.x,
        y: player.pos.y,
        z: player.pos.z,
        rotY: player.rotY,
        isMoving,
        inBoat: player.inBoat,
        zone: currentZone,
        mange: window.__BLAHAJ_MANGE__
      });
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

  function updateCamera(elapsed = 0) {
    const rightVec = new THREE.Vector3(Math.cos(camState.yaw), 0, -Math.sin(camState.yaw));
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
    } else if (currentZone === 'laundromat' && window.BlahajLaundromat) {
      if (window.BlahajLaundromat.isSpinCycleActive()) {
        // Dramatic, crystal-clear spin cycle camera view directly framing the spinning shark inside Giant Washer #7!
        lookTarget.set(0, 1.85, -6.0);
        const spinDist = Math.max(2.8, Math.min(5.2, camState.distance));
        const spinYaw = camState.yaw;
        const spinPitch = Math.max(-0.25, Math.min(0.35, camState.pitch));
        camX = lookTarget.x + Math.sin(spinYaw) * spinDist * Math.cos(spinPitch);
        camZ = Math.max(-4.2, lookTarget.z + Math.cos(spinYaw) * spinDist * Math.cos(spinPitch)); // keep in front of or at glass
        camY = Math.max(0.8, Math.min(4.2, lookTarget.y + spinDist * Math.sin(spinPitch) + 0.1));
      } else {
        const ceilY = window.BlahajLaundromat.getCeilingY();
        const floorAtCam = window.BlahajLaundromat.getFloorHeight(camX, camZ, player.pos.y);
        const minCamY = Math.max(player.pos.y + 0.65, floorAtCam + 0.5);
        const maxCamY = Math.max(minCamY + 0.2, ceilY - 0.45);
        camY = Math.min(maxCamY, Math.max(minCamY, camY));

        camX = Math.max(-11.2, Math.min(11.2, camX));
        camZ = Math.max(-8.2, Math.min(8.2, camZ));
      }
    } else {
      const minGround = worldApi.getGroundAndStructureHeight(camX, camZ, player.pos.y + 1.2, true) + 0.95;
      camY = Math.max(minGround, camY);
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
    const track = document.getElementById('compass-track');
    if (track) {
      const shift = ((deg / 360) * 640) % 640;
      track.style.transform = `translateX(${-shift + 120}px)`;
    }
  }

  function updateInteractionsAndHUD() {
    nearestInteractable = null;
    let bestDist = 999;

    // Inside the Volcano Instance: Dedicated room zones, puzzles, tea and return portal
    if (currentZone === 'volcano' && window.BlahajVolcano) {
      const roomTitle = window.BlahajVolcano.getRoomTitle(player.pos.z) || 'The Sacred Volcano Trial';
      document.getElementById('hud-zone-name').textContent = roomTitle;

      // Chamber HUD guide popups as player traverses each zone
      const noticeKey = getVolcanoNoticeKeyForPos(player.pos);
      if (noticeKey && !shownVolcanoNotices.has(noticeKey)) {
        showVolcanoHUDNotice(noticeKey);
      }

      const vItems = window.BlahajVolcano.getInteractables(player.pos);
      if (vItems.length > 0) {
        nearestInteractable = vItems[0];
      }

      const promptEl = document.getElementById('interaction-prompt');
      if (nearestInteractable && !isAnyModalOpen()) {
        document.getElementById('interaction-text').textContent = nearestInteractable.prompt;
        promptEl.classList.remove('hidden');
      } else {
        promptEl.classList.add('hidden');
      }

      // Continuous hazard detection in the instance
      const hazard = window.BlahajVolcano.checkHazards(player.pos);
      if (hazard) {
        handleVolcanoTrapHit(hazard);
      }
      return;
    }

    // Inside the Laundromat Instance: Giant Master Washer #7, Vending & Return Portal
    if (currentZone === 'laundromat' && window.BlahajLaundromat) {
      document.getElementById('hud-zone-name').textContent = 'The Midnight Cosmic Laundromat (24/7)';
      const lItems = window.BlahajLaundromat.getInteractables(player.pos);
      if (lItems.length > 0) {
        nearestInteractable = lItems[0];
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

    worldApi.getSeamRifts().forEach((r) => {
      if (!r.userData.mended) {
        const d = r.position.distanceTo(player.pos);
        if (d < 7.5 && d < bestDist) {
          bestDist = d;
          nearestInteractable = {
            kind: 'rift',
            ref: r,
            dist: d,
            prompt: 'Stitch Great Seam Rift [E]'
          };
        }
      }
    });

    worldActors.forEach((act) => {
      if (!act.mesh.visible) return;
      const d = act.mesh.position.distanceTo(player.pos);
      if (d < 5.5 && d < bestDist) {
        bestDist = d;
        nearestInteractable = {
          kind: 'actor',
          ref: act,
          dist: d,
          prompt: `Talk to ${act.name} [E] · Beep Nose [F]`
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
      if (d < effectiveRadius && d < bestDist) {
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

    document.getElementById('hud-zone-name').textContent = currentZoneTitle;

    const promptEl = document.getElementById('interaction-prompt');
    const isSailingNow = player.inBoat || player.ridingWithPartner;

    if (builderState.active && player.sharkId === 'hiram' && (!nearestInteractable || nearestInteractable.dist > 4.2)) {
      const spec = (LORE.buildCatalog || []).find((x) => x.id === builderState.selectedId);
      document.getElementById('interaction-text').textContent =
        `Build ${spec ? spec.name : 'Structure'} [E / Click] · Rotate [R] · Remove [X]`;
      promptEl.classList.remove('hidden');
    } else if (isSailingNow && !isAnyModalOpen()) {
      const canTalkToDock = nearestInteractable && nearestInteractable.kind === 'landmark' && nearestInteractable.ref.type !== 'boat';
      document.getElementById('interaction-text').textContent = canTalkToDock
        ? `${nearestInteractable.prompt} · or Hop Off [Space]`
        : '⛵ Sailing — Hop Off Here [E / Space]';
      promptEl.classList.remove('hidden');
    } else if (nearestInteractable && !isAnyModalOpen()) {
      document.getElementById('interaction-text').textContent = nearestInteractable.prompt;
      promptEl.classList.remove('hidden');
    } else {
      promptEl.classList.add('hidden');
    }

    worldActors.forEach((act) => {
      if (!act.mesh.visible) return;
      projectLabel(act.mesh.position, act.labelEl, 3.25);
    });
    if (worldApi.getSignposts) {
      worldApi.getSignposts().forEach((sp) => {
        if (sp.labelEl) {
          const d = sp.pos.distanceTo(player.pos);
          if (d < 42) {
            projectLabel(sp.pos, sp.labelEl, 0.35);
          } else {
            sp.labelEl.style.opacity = '0';
          }
        }
      });
    }
    if (coopPartner.active && coopPartner.mesh && coopPartner.labelEl) {
      const sameZone = (coopPartner.zone || 'island') === currentZone;
      if (sameZone && coopPartner.mesh.visible) {
        projectLabel(coopPartner.mesh.position, coopPartner.labelEl, 3.35);
      } else {
        coopPartner.labelEl.style.opacity = '0';
        coopPartner.labelEl.style.display = 'none';
      }
    }

    updateCelestialClockHUD();
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

  function projectLabel(worldPos, domEl, heightOffset) {
    const p = worldPos.clone();
    p.y += heightOffset;
    const dist = p.distanceTo(camera.position);
    if (dist > 85) {
      domEl.style.opacity = '0';
      return;
    }
    p.project(camera);
    if (p.z > 1) {
      domEl.style.opacity = '0';
      return;
    }
    const x = (p.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-(p.y * 0.5) + 0.5) * window.innerHeight;
    domEl.style.opacity = '1';
    domEl.style.left = `${x}px`;
    domEl.style.top = `${y}px`;
  }

  function updateCoopPartner(dt, elapsed) {
    if (!coopPartner.active || !coopPartner.mesh) return;
    updateCoopPartnerVisibility();
    coopPartner.mesh.position.lerp(coopPartner.targetPos, Math.min(1, dt * 12));
    coopPartner.mesh.rotation.y = coopPartner.targetRotY;
    window.BlahajModels.animateShark(
      coopPartner.mesh,
      dt,
      coopPartner.isMoving && !coopPartner.inBoat,
      elapsed
    );

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
      b.mesh.position.addScaledVector(b.vel, dt);
      b.mesh.rotation.y += dt * 4;
      b.mesh.scale.setScalar(Math.max(0.01, b.life));
      if (b.life <= 0) {
        if (b.mesh.parent) b.mesh.parent.remove(b.mesh);
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
    getWorldApi: () => worldApi,
    getCamera: () => camera,
    getCamState: () => camState,
    getScene: () => scene,
    getZone: () => currentZone,
    applySteamingSpiritBuff,
    triggerFeedBreb,
    triggerBeepNose,
    updateCamera,
    enterVolcanoTrial,
    exitVolcanoTrial,
    enterLaundromat,
    exitLaundromat,
    triggerLaundromatSpinCycle,
    adjustSharkMange,
    setSharkMange,
    getSharkMange,
    handleVolcanoTrapHit,
    triggerSignatureAbility
  };

  window.addEventListener('DOMContentLoaded', init);
})();
