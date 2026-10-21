// ============================================================================
// BLÅHAJ ISLAND — MAIN 3D ENGINE, NEVERWINTER CAMERA, BLOOM & GAMEPLAY LOOP
// (ROUND 3: 3D GRASS, VOLCANO TRIAL DUNGEON, BIRBS & BREB, CARROT KNOCK-OFF)
// ============================================================================

(function () {
  const LORE = window.BLAHAJ_LORE;

  // --- Audio Synthesizer (Cozy WebAudio Chimes, Boops, Tea Pours & Trap Rumble) ---
  const CozyAudio = {
    ctx: null,
    ensure() {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) this.ctx = new AC();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
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
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + dur);
    },
    beepNose() {
      this.playTone(520, 0.14, 'sine', 0.14, 780);
      setTimeout(() => this.playTone(780, 0.18, 'triangle', 0.12, 1040), 90);
    },
    shonk() {
      this.playTone(380, 0.12, 'triangle', 0.14, 620);
    },
    birbChirp() {
      this.playTone(980, 0.09, 'sine', 0.11, 1380);
      setTimeout(() => this.playTone(1240, 0.11, 'sine', 0.11, 1620), 75);
    },
    carrotBoop() {
      this.playTone(300, 0.18, 'triangle', 0.16, 680);
      setTimeout(() => this.playTone(680, 0.22, 'sine', 0.12, 220), 90);
    },
    trapHit() {
      this.playTone(160, 0.32, 'sawtooth', 0.16, 65);
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

  // --- Core 3D Scene & Post-Processing State ---
  let scene, camera, renderer, composer, clock;
  let worldApi = null;

  // Player state
  const player = {
    sharkId: 'hermes',
    mesh: null,
    pos: new THREE.Vector3(0, 4.2, 26),
    velY: 0,
    rotY: Math.PI,
    isGrounded: true,
    inBoat: false,
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
    dungeonPortalCooldown: 0
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
    yaw: 0,
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
    camera = new THREE.PerspectiveCamera(56, window.innerWidth / window.innerHeight, 0.1, 1000);

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
      const renderPass = new THREE.RenderPass(scene, camera);
      composer.addPass(renderPass);

      const bloomPass = new THREE.UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        0.26,
        0.5,
        0.91
      );
      composer.addPass(bloomPass);
    }

    // 1. Build Expanded Blåhaj Archipelago (Main Island + 4 Outer Sanctuary Islands + Dungeon)
    worldApi = window.BlahajWorld.buildWorld(scene);
    loadSavedStructures();
    player.pos.y = worldApi.getGroundAndStructureHeight(player.pos.x, player.pos.z);

    // 2. Spawn High-Polygon Player Shark & All Island Characters
    spawnPlayerShark('hermes');
    spawnWorldCharacters();

    // 3. Setup Controls, UI, Builder Toolbar, Gallery, Upgrades & Co-op Networking
    setupInputs();
    setupUI();
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
      scene.remove(player.mesh);
    }

    player.sharkId = sharkId;
    player.mesh = window.BlahajModels.createPlushShark(cfg);
    player.mesh.position.copy(player.pos);
    player.mesh.rotation.y = player.rotY;
    scene.add(player.mesh);

    updateBlueSharkVisibility();

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
      const hy = worldApi.getTerrainHeight(sCfg.homePos.x, sCfg.homePos.z);
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
          bodyColor: 0x4b7cab,
          bellyColor: 0xfaf3e6,
          scarfColor: 0xf5b942,
          scale: 0.68,
          plumpness: 1.08
        });
      } else if (npc.type === 'beetroot') {
        mesh = window.BlahajModels.createBeetrootServer();
      } else if (npc.type === 'carrot') {
        mesh = window.BlahajModels.createBeachCarrot(npc.shortsColor);
      }

      const ny = npc.pos.y !== undefined ? npc.pos.y : worldApi.getTerrainHeight(npc.pos.x, npc.pos.z);
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
      scene.add(mesh);
      floatingBursts.push({
        mesh,
        vel: new THREE.Vector3((Math.random() - 0.5) * 1.5, 1.8 + Math.random() * 1.2, (Math.random() - 0.5) * 1.5),
        life: 1.1
      });
    }
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
        camState.yaw -= e.movementX * 0.0032;
        camState.pitch = Math.max(-0.25, Math.min(1.15, camState.pitch + e.movementY * 0.0026));
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

      if ((e.key === ' ' || e.code === 'Space') && !isAnyModalOpen()) {
        if (player.inBoat) {
          disembarkBoatAtCurrentLocation();
        } else if (player.isGrounded) {
          const jumpBoost = player.unlockedUpgrades.has('super_plush_hop') ? 1.45 : 1.0;
          player.velY = 8.8 * jumpBoost;
          player.isGrounded = false;
          CozyAudio.shonk();
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
    return (
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

    let nearbyBirbs = 0;
    const maxRadius = player.unlockedUpgrades.has('golden_breb') ? 32 : 20;
    worldApi.getBirbFlock().forEach((b) => {
      if (b.mesh.position.distanceTo(dropPos) < maxRadius) {
        nearbyBirbs++;
        spawnFloatingBurst(b.mesh.position, 0xffd166, 4);
      }
    });

    if (nearbyBirbs > 0) {
      const prevMilestones = Math.floor(player.birbsFedCount / 10);
      player.birbsFedCount += nearbyBirbs;
      const newMilestones = Math.floor(player.birbsFedCount / 10);
      if (newMilestones > prevMilestones) {
        player.trialPoints += (newMilestones - prevMilestones);
        showToast('BIRB BLESSING (+1 TRIAL POINT!)', `Fed ${player.birbsFedCount} Birbs with warm Breb! Earned +1 Trial Point!`);
      } else {
        showToast('FEEDING THE BIRBS WITH BREB', `${nearbyBirbs} plump Birb${nearbyBirbs > 1 ? 's' : ''} hopped over to snack on warm Breb!`);
      }
      addChatLog(`🥖🐦 Tossed warm <strong>Breb</strong>! ${nearbyBirbs} plump Birbs hopped over happily.`, 'lore');
      completeQuest('q-breb');
      updateMetersUI();
      renderBuilderToolbar();
    } else {
      player.birbsFedCount += 1;
      addChatLog('🥖 Tossed a warm loaf of <strong>Breb</strong> onto the grass for the Birbs (+1 Birb Crumb)!', 'lore');
      completeQuest('q-breb');
      updateMetersUI();
      renderBuilderToolbar();
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

    if (closestActor) {
      if (closestActor.mesh.userData) {
        closestActor.mesh.userData.beepTimer = 0.9;
      }
      spawnFloatingBurst(closestActor.mesh.position, 0xf5cd79, 8);
      const replies = [
        '“Beep! Sharkitty!! 💕”',
        '“Be Nice, Beep Noses! My stuffing feels 100% fluffier!”',
        '“Shonk! Best fin-to-nose boop on Blåhaj Island!”'
      ];
      const msg = replies[Math.floor(Math.random() * replies.length)];
      showActorSpeechBubble(closestActor, msg);
      addChatLog(`🦈💕 You beeped noses with <strong>${closestActor.name}</strong>!`, 'lore');
      completeQuest('q-beep');
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
      player.teaComfort = 100;
      player.warmth = 100;
      player.teaSharedCount++;
      triggerFeedBreb();
      updateMetersUI();
      completeQuest('q-tea');
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
      showToast('NEEDLE OF RESTORATION', 'Nimue weaves starlight from the Lantern of Forgotten Stars!');
      addChatLog('🪡 <strong>Nimue</strong> draws the Thread of Destiny across the twilight air.', 'system');
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

  function completeVolcanoDungeonAscent() {
    CozyAudio.portalChime();
    player.inBoat = false;
    player.pos.set(-22, 16.6, -103);
    player.rotY = 0;
    camState.yaw = Math.PI;
    player.velY = 0;
    player.warmth = 100;
    player.volcanoHonour = 100;
    player.trialPoints += 1;
    player.dungeonPortalCooldown = 4.0;

    completeQuest('q-dungeon');
    completeQuest('q-em-volcano');
    updateMetersUI();
    renderUpgradesGrid();
    renderBuilderToolbar();

    spawnFloatingBurst(player.pos, 0xff9d3b, 22);
    showToast('VOLCANO TRIAL SURVIVED! (+1 TRIAL POINT)', 'You emerged onto the Front Volcano Balcony! Bump the Carrots off the edge or press [U] to spend Trial Points!');
    addChatLog('🌋⚔️ <strong>Trial Complete!</strong> You survived the Volcano Dungeon and emerged onto the high Front Volcano Balcony (+1 Trial Point)!', 'system');
  }

  function triggerInteract() {
    // If Hiram's Master Builder Mode is active and we aren't standing right on top of an NPC, [E] places the active blueprint!
    if (builderState.active && player.sharkId === 'hiram' && (!nearestInteractable || nearestInteractable.dist > 4.2)) {
      placeActiveBlueprint();
      return;
    }

    if (!nearestInteractable) return;
    const item = nearestInteractable;

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
      const gy = Math.max(0.0, worldApi.getGroundAndStructureHeight(sideX, sideZ, player.pos.y + 2.0));
      player.pos.set(sideX, Math.max(gy, 0.8), sideZ);
      player.velY = 6.2;
      player.isGrounded = false;
      CozyAudio.shonk();
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
              player.pos.set(0, worldApi.getTerrainHeight(0, 24), 24);
              showToast('RETURNED TO MAIN ISLAND', 'Arrived at the Sacred Tea House Plaza!');
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

    if (lm.type === 'dungeon_exit') {
      completeVolcanoDungeonAscent();
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
        showToast('REAR VOLCANO WHARF', 'Stepped onto the Rear Wharf! Walk forward into the Volcano Trial Dungeon!');
      } else {
        openDialogueModal({
          speaker: 'Rear Volcano Wharf & Dungeon Gate',
          role: 'THE TRIALS OF THE SACRED VOLCANO',
          portrait: 'assets/gallery/Blizzard-Volcano.png',
          text: 'At the far northern tip of the Volcano Peninsula, obsidian gates open into the subterranean Volcano Trial Dungeon. Dodge the swinging obsidian pendulums and erupting lava geysers to reach the Core Portal—and emerge high up on the Front Volcano Temple Balcony with +1 Trial Point!',
          actions: [
            {
              label: 'Enter the Volcano Trial Dungeon! ⚔️🌋',
              className: 'btn-primary',
              onClick: () => {
                closeDialogueModal();
                player.inBoat = false;
                player.ridingWithPartner = false;
                player.pos.set(-28, 1.5, -184);
                player.rotY = 0;
                camState.yaw = Math.PI;
                showToast('VOLCANO TRIAL DUNGEON', 'Dodge the swinging axes & lava geysers to reach the Core Portal!');
              }
            },
            {
              label: 'Board Sailboat at Rear Wharf ⛵',
              className: 'btn-accent',
              onClick: () => {
                closeDialogueModal();
                if (boat) {
                  boat.position.set(-28, 0.45, -214);
                  player.inBoat = true;
                  player.ridingWithPartner = false;
                  player.pos.set(-28, 1.2, -214);
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
      updateMetersUI();
      completeQuest('q-tea');
      completeQuest('q-em-biscuit');
      openDialogueModal({
        speaker: 'The Sacred Tea House',
        role: 'TEMPLE OF THE EVER-BOILING KETTLE',
        portrait: 'assets/gallery/Emergency-1.png',
        text: 'The Golden Teapot steams gently beside the Eternal Biscuit Tin. You pour a fresh cup of Earl Grey of Enlightenment—and rescue the Biscuit of Impossible Dunking right at the safe dunking interval!',
        actions: [
          {
            label: 'Sip Tea & Warm Stuffing (+100% Comfort)',
            className: 'btn-primary',
            onClick: () => {
              closeDialogueModal();
              showToast('TEA IS SACRED', 'Stuffing Coherence & Tea Comfort fully restored!');
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
    const py = worldApi.getTerrainHeight(isl.signX, isl.signZ);
    player.pos.set(isl.signX, py, isl.signZ);
    completeQuest('q-outer-island');
    spawnFloatingBurst(player.pos, isl.themeColor || 0x9b6dff, 18);
    showToast(`ARRIVED: ${isl.name.toUpperCase()}`, 'Switch to Hiram [3] + [C] to build on this Sanctuary Island!');
  }

  // ==========================================================================
  // UI MODALS, GALLERY, UPGRADES, QUEST TRACKER & ENDLESS PIER NOTES
  // ==========================================================================
  function setupUI() {
    document.querySelectorAll('.shark-slot').forEach((btn) => {
      btn.addEventListener('click', () => spawnPlayerShark(btn.dataset.shark));
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

    document.getElementById('btn-teleport-rear-wharf').addEventListener('click', () => {
      document.getElementById('upgrades-modal').classList.add('hidden');
      player.inBoat = false;
      player.pos.set(-28, 1.5, -200);
      player.rotY = 0;
      camState.yaw = Math.PI;
      CozyAudio.portalChime();
      showToast('REAR VOLCANO WHARF', 'Arrived at the North Shore Rear Wharf! Walk forward into the Volcano Trial Dungeon!');
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
          showToast('INVITE LINK COPIED!', 'Paste this link to Helen on Discord to play together!');
        }
      });
    }

    document.getElementById('btn-host-portal').addEventListener('click', () => {
      const code = document.getElementById('host-room-code').value;
      CozyAudio.portalChime();
      window.BlahajNetwork.hostPortal(code);
    });

    document.getElementById('btn-join-portal').addEventListener('click', () => {
      const code = document.getElementById('join-room-code').value;
      CozyAudio.portalChime();
      window.BlahajNetwork.joinPortal(code);
    });

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
          sharkId: player.sharkId
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
            spawnCoopPartnerShark(data.sharkId || 'solomon');
          }
          coopPartner.targetPos.set(data.x, data.y, data.z);
          coopPartner.targetRotY = data.rotY;
          coopPartner.isMoving = data.isMoving;
          coopPartner.inBoat = !!data.inBoat;
        } else if (data.type === 'shark_swap') {
          spawnCoopPartnerShark(data.sharkId);
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
          scene.remove(coopPartner.mesh);
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

  function spawnCoopPartnerShark(sharkId) {
    const cfg = LORE.sharks[sharkId] || LORE.sharks.solomon;
    coopPartner.sharkId = cfg.id;
    coopPartner.active = true;

    if (coopPartner.mesh) scene.remove(coopPartner.mesh);
    coopPartner.mesh = window.BlahajModels.createPlushShark(cfg);
    coopPartner.mesh.position.copy(coopPartner.targetPos);
    scene.add(coopPartner.mesh);

    if (!coopPartner.labelEl) {
      coopPartner.labelEl = createWorldLabel(
        document.getElementById('world-labels'),
        `${cfg.name} (Partner)`,
        '★ CROSS-OCEAN CO-OP SHARK'
      );
    } else {
      coopPartner.labelEl.querySelector('.npc-name').textContent = `${cfg.name} (Partner)`;
    }
    updateBlueSharkVisibility();
  }

  // ==========================================================================
  // MAIN GAME LOOP
  // ==========================================================================
  let netSyncTimer = 0;

  function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.1);
    const elapsed = clock.getElapsedTime();

    updatePlayerMovement(dt, elapsed);
    updateBuilderPreview(elapsed);
    updateDynamicCollisions(dt);
    updateCamera();
    updateInteractionsAndHUD();
    updateCoopPartner(dt, elapsed);
    updateFloatingBursts(dt);
    window.BlahajWorld.updateWorld(elapsed, dt, scene);

    if (composer) {
      composer.render();
    } else {
      renderer.render(scene, camera);
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

      const onRoad = !player.inBoat && worldApi.isOnIslandRoad && worldApi.isOnIslandRoad(player.pos.x, player.pos.z);
      const roadBoost = onRoad ? 1.18 : 1.0;
      const speedMult = (player.unlockedUpgrades.has('turbo_fins') ? 1.35 : 1.0) * roadBoost;
      const baseSpeed = player.inBoat ? 24.0 : (keys['shift'] ? 16.5 : 10.8);
      const speed = baseSpeed * speedMult;

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

        // Smoothly clamp lateral X inside the Subterranean Volcano Trial Dungeon so you never clip walls or snap onto the volcano roof!
        if (nz < -111 && nz > -186 && Math.abs(player.pos.x - -28) < 9.5) {
          nx = Math.max(-30.9, Math.min(-25.1, nx));
        }

        // Expanded bounds covering Main Island, Volcano Peninsula, and all 4 Outer Buildable Sanctuary Islands!
        if (Math.abs(nx) < 275 && Math.abs(nz) < 275) {
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
      }

      if (player.inBoat) {
        const boat = worldApi.getBoatMesh();
        if (boat) {
          boat.position.x = player.pos.x;
          boat.position.z = player.pos.z;
          boat.rotation.y = player.rotY;
          player.pos.y = boat.position.y + 0.88;
        }
      } else {
        // Walk seamlessly across both natural terrain AND Hiram's player-built bridges, ramps, docks, and platforms!
        const groundY = Math.max(0.0, worldApi.getGroundAndStructureHeight(player.pos.x, player.pos.z, player.pos.y));
        if (!player.isGrounded || player.pos.y > groundY + 0.05) {
          player.velY -= 22.0 * dt;
          player.pos.y += player.velY * dt;
          if (player.pos.y <= groundY) {
            player.pos.y = groundY;
            player.velY = 0;
            player.isGrounded = true;
          }
        } else {
          player.pos.y = groundY;
        }
      }
    }

    if (player.unlockedUpgrades.has('kevlar_stitching') && player.warmth < 100) {
      player.warmth = Math.min(100, player.warmth + dt * 4.0);
      updateMetersUI();
    }

    if (player.mesh) {
      player.mesh.position.copy(player.pos);
      player.mesh.rotation.y = player.rotY;
      window.BlahajModels.animateShark(player.mesh, dt, isMoving && !player.inBoat && !player.ridingWithPartner, elapsed);
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
        inBoat: player.inBoat
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
          if (!c.structureId && pushDir.z < 0.25) pushDir.z = 0.65;
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

    // 3. Volcano Trial Dungeon Traps & Core Ascent Portal
    if (worldApi.isInsideVolcanoDungeon(player.pos.x, player.pos.z)) {
      if (player.trapCooldown <= 0) {
        worldApi.getDungeonTraps().forEach((tr) => {
          if (tr.type === 'pendulum') {
            const d = tr.hitPos.distanceTo(player.pos);
            if (d < 2.25) {
              applyDungeonTrapHit('Swinging Obsidian Pendulum');
            }
          } else if (tr.type === 'geyser' && tr.active) {
            const dx = player.pos.x - tr.x;
            const dz = player.pos.z - tr.z;
            if (Math.sqrt(dx * dx + dz * dz) < 1.65) {
              applyDungeonTrapHit('Erupting Lava Geyser');
            }
          }
        });
      }

      const dCore = Math.sqrt(Math.pow(player.pos.x - -28, 2) + Math.pow(player.pos.z - -114.5, 2));
      if (dCore < 3.6 && player.dungeonPortalCooldown <= 0) {
        completeVolcanoDungeonAscent();
      }
    }
  }

  function applyDungeonTrapHit(trapName) {
    player.trapCooldown = 1.5;
    CozyAudio.trapHit();
    const dmg = player.unlockedUpgrades.has('kevlar_stitching') ? 7 : 18;
    player.warmth = Math.max(10, player.warmth - dmg);
    player.velY = 5.4;
    player.isGrounded = false;
    player.pos.z = Math.max(-184, player.pos.z - 2.2);
    spawnFloatingBurst(player.pos, 0xff4500, 12);
    updateMetersUI();

    if (player.warmth <= 15) {
      player.warmth = 100;
      player.pos.set(-28, 1.4, -196);
      updateMetersUI();
      showToast('RESCUED BY HERMES!', 'Your stuffing got too toasted! Hermes whisked you back to the Rear Wharf with warm tea!');
      addChatLog('🫖🛡️ <strong>Hermes</strong> rescued your toasted stuffing back to the Rear Volcano Wharf!', 'system');
    } else {
      showToast('VOLCANO DUNGEON TRAP!', `Oof! Singed by ${trapName} (-${dmg}% Stuffing Coherence)!`);
    }
  }

  function updateCamera() {
    const rightVec = new THREE.Vector3(Math.cos(camState.yaw), 0, -Math.sin(camState.yaw));
    const lookTarget = new THREE.Vector3(
      player.pos.x + rightVec.x * camState.shoulderRight,
      player.pos.y + camState.heightOffset,
      player.pos.z + rightVec.z * camState.shoulderRight
    );

    const horizDist = camState.distance * Math.cos(camState.pitch);
    const vertDist = camState.distance * Math.sin(camState.pitch);

    const camX = lookTarget.x + Math.sin(camState.yaw) * horizDist;
    const camZ = lookTarget.z + Math.cos(camState.yaw) * horizDist;
    const minGround = worldApi.getTerrainHeight(camX, camZ) + 0.95;
    let camY = Math.max(minGround, lookTarget.y + vertDist);

    if (worldApi.isInsideVolcanoDungeon(player.pos.x, player.pos.z)) {
      camY = Math.min(camY, player.pos.y + 5.2);
    }

    camera.position.set(camX, camY, camZ);
    camera.lookAt(lookTarget);

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

    let currentZoneTitle = worldApi.isInsideVolcanoDungeon(player.pos.x, player.pos.z)
      ? 'Subterranean Volcano Trial Dungeon'
      : 'Shores of Blåhaj Island';

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
      const posXZ = lm.type === 'boat' && worldApi.getBoatMesh()
        ? worldApi.getBoatMesh().position
        : new THREE.Vector3(lm.pos.x, player.pos.y, lm.pos.z);

      const dx = player.pos.x - posXZ.x;
      const dz = player.pos.z - posXZ.z;
      const d = Math.sqrt(dx * dx + dz * dz);

      if (d < lm.radius * 1.4) {
        currentZoneTitle = lm.zoneTitle;
      }
      if (d < lm.radius && d < bestDist) {
        bestDist = d;
        nearestInteractable = {
          kind: 'landmark',
          ref: lm,
          dist: d,
          prompt: lm.prompt
        };
      }
    });

    document.getElementById('hud-zone-name').textContent = currentZoneTitle;

    const promptEl = document.getElementById('interaction-prompt');
    const isSailingNow = player.inBoat || player.ridingWithPartner;
    promptEl.classList.toggle('sailing-corner', isSailingNow);

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
      projectLabel(coopPartner.mesh.position, coopPartner.labelEl, 3.35);
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
        scene.remove(b.mesh);
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

  window.addEventListener('DOMContentLoaded', init);
})();
