// ============================================================================
// BLÅHAJ ISLAND — S.S. SHONK-SAUCER MK. VII (JETSONS UFO + THUNDERBIRDS ISLE)
// ============================================================================
// Features:
//  1. Thunderbirds-style Secret Launch Island ("Shonkbird Atoll") at
//     (138, 112) with tilting palm trees, sliding turquoise pool/crater doors,
//     rotating amber beacons, and a hydraulic launch platform.
//  2. Jetsons-inspired Retro-Futuristic 3D UFO with crystal-clear bubble dome,
//     visible Pilot & Co-Pilot/Passenger sharks inside, glowing dashboard
//     (bobble-shonk, cosmic tea mug, lava lamp), ion thrusters, tractor beam,
//     disco rim lights, and bottom hatch with telescoping illuminated stairs.
//  3. Easy-to-fly, impossible-to-crash Flight Simulator physics (auto-leveling
//     gyro, anti-grav terrain/ocean cushion, automated launch & auto-land).
//  4. Inside Cockpit View & Outside Chase View ([V]), plus Super-Modern
//     Glass-Cockpit Avionics HUD with live Canvas Artificial Horizon.
//  5. High-altitude Karman Orbital Ceiling sequence (Y >= 120m) staging the
//     upcoming Space & Alien Planets expansion!
//  6. Full Co-op Multiplayer Sync: 1 Pilot + Passengers riding together!
// ============================================================================

window.BlahajUFO = (function () {
  // Secret Launch Island Coordinates (Southeast of Main Island, off Endless Pier)
  const ISLE_X = 138.0;
  const ISLE_Z = 112.0;
  const ISLE_RADIUS = 33.0;
  const ISLE_DECK_Y = 5.4;
  const HANGAR_LOWER_Y = 2.0;
  const HANGAR_RAISED_Y = 7.2;
  const KARMAN_CEILING_Y = 185.0;

  let sceneRef = null;
  let isBuilt = false;

  // 3D Groups
  let islandGroup = null;
  let hangarDoorL = null;
  let hangarDoorR = null;
  let elevatorMesh = null;
  let tiltingPalms = [];
  let warningBeacons = [];
  let runwayChevrons = [];
  let isleColliders = []; // Solid horizontal circle colliders on Shonkbird Atoll

  let ufoGroup = null;
  let ufoHullGroup = null;
  let rimLightMeshes = [];
  let thrusterCones = [];
  let hatchDoorMesh = null;
  let stairsGroup = null;
  let stairSteps = [];
  let tractorBeamMesh = null;
  let bobbleSharkMesh = null;
  let lavaLampBlob = null;
  let seatPilotAnchor = null;
  let seatPassengerAnchor = null;
  let pilotEyeAnchor = null;
  let passengerEyeAnchor = null;
  let cockpitCamAnchor = null;
  let canopyDomeMesh = null;
  let canopyBeadGroup = null;
  let canopyBeads = [];
  let canopyBeadMat = null;
  let canopyRibs = [];
  let floorSolidMeshes = [];
  let floorLcdGroup = null;
  let mojoCoreMesh = null;
  let defaultAerialGroup = null;
  let defaultAerialProg = 1.0;
  let warpPortalGroup = null;
  let warpShockConeMesh = null;
  let warpRingOuterMesh = null;
  let warpRingInnerMesh = null;
  let warpEngulfSphereMesh = null;

  // Hardpoint Sockets on UFO Hull (decouples appendages from hull geometry for future UFO upgrades!)
  const sockets = {
    belly: null,
    portWing: null,
    starboardWing: null,
    dorsalRack: null,
    rearNacelles: null
  };
  let saucerModules = [];
  let activeModuleIdx = 0;
  const ufoPlasmaBolts = [];
  const ufoRadarWaves = [];
  const volcanoDropAnims = [];
  let ufoPointLight = null;

  // Flight & Island State
  const state = {
    // Island Hangar
    hangarTargetOpen: false,
    hangarOpenProg: 0.0, // 0 = closed secret pool, 1 = open + elevator raised

    // UFO Transform & Physics
    pos: new THREE.Vector3(ISLE_X, HANGAR_LOWER_Y + 1.5, ISLE_Z),
    vel: new THREE.Vector3(0, 0, 0),
    yaw: -Math.PI * 0.72,
    pitch: 0,
    roll: 0,
    yawRate: 0,
    speed: 0,
    verticalSpeed: 0,

    // Sequences & Systems
    phase: 'parked', // 'parked' | 'launching' | 'flying' | 'landing' | 'orbital'
    phaseTimer: 0,
    hatchTargetOpen: true,
    hatchOpenProg: 1.0,
    viewMode: 'outside', // 'outside' | 'inside'
    floorCam: false,
    cockpitLookYaw: 0,
    cockpitLookPitch: 0,
    hyperdriveTimer: 0,
    windscreenWetTimer: 0,
    windscreenDrops: [],
    rimDripCooldown: 0,
    radarStatusText: null,
    radarStatusUntil: 0,
    tractorBeam: false,
    subspaceVault: null, // { kind: 'enemy' | 'beach_ball' | 'carrot', title, icon, ref }
    remoteVaultSummary: null, // { icon, title } synced to passengers
    beamingTarget: null, // { kind, title, icon, ref, startPos, progress }
    disgorgeFlashTimer: 0,
    discoMode: false,
    turboActive: false,
    antiGravCushionActive: false,
    orbitalCeilingReached: false,
    orbitalNoticeShown: false,
    inSpace: false,
    inCheeseMoon: false,
    warpChargeTimer: 0,
    lastPartnerWarnAt: 0,
    turretFireCooldown: 0,
    turretShotCount: 0,
    rollRate: 0,
    pitchRate: 0,
    spaceQuat: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI, 0, 'YXZ')),
    spaceThrottle: 0.35,
    spaceMouseDx: 0,
    spaceMouseDy: 0,
    spaceAngVelPitch: 0,
    spaceAngVelYaw: 0,
    spaceAngVelRoll: 0,
    spacePanYaw: 0,
    spacePanPitch: 0,
    hullHp: 100,
    maxHullHp: 100,
    shieldHp: 100,
    maxShieldHp: 100,
    shieldRegenDelay: 0,
    impactCooldown: 0,
    secondaryCooldown: 0,
    remoteTargetQuat: new THREE.Quaternion(),

    // Crew & Co-op Ownership
    localRole: null, // null | 'pilot' | 'passenger'
    pilotClientId: null,
    pilotName: null,
    passengerClientId: null,
    passengerName: null,

    // Remote Sync Snapshot Interpolation Buffer (eliminates jitter & rubberbanding!)
    remoteSnapshots: [],
    remoteTargetPos: new THREE.Vector3(ISLE_X, HANGAR_LOWER_Y + 1.5, ISLE_Z),
    remoteTargetVel: new THREE.Vector3(),
    remoteTargetYaw: -Math.PI * 0.72,
    remoteTargetPitch: 0,
    remoteTargetRoll: 0,
    hasRemoteSync: false,
    netSeq: 0,
    lastRemoteSeq: -1,
    lastRemoteSenderId: null,
    lastNetSendAt: 0,
    lastRemotePacketAt: 0,

    // Audio hum state
    humOsc: null,
    humLfo: null,
    humGain: null,
    humActive: false,
    hudTickAccum: 0
  };

  // Helper: Get local clientId from BlahajNetwork
  function getMyClientId() {
    return (window.BlahajNetwork && typeof window.BlahajNetwork.getClientId === 'function')
      ? window.BlahajNetwork.getClientId()
      : 'local-shonk';
  }

  function getMySharkName() {
    const p = window.player;
    if (p && p.sharkId && window.LORE && window.LORE.sharks && window.LORE.sharks[p.sharkId]) {
      return window.LORE.sharks[p.sharkId].name;
    }
    return 'Blåhaj';
  }

  // ==========================================================================
  // PROCEDURAL JETSONS SAUCER AUDIO (Web Audio API)
  // ==========================================================================
  function getAudioCtx() {
    if (window.CozyAudio && typeof window.CozyAudio.getContext === 'function') {
      return window.CozyAudio.getContext();
    }
    return null;
  }

  function getUfoAudioDest(ctx) {
    if (window.CozyAudio && typeof window.CozyAudio.getUfoGain === 'function') {
      const g = window.CozyAudio.getUfoGain();
      if (g) return g;
    }
    return ctx ? ctx.destination : null;
  }

  function playJetsonsHorn() {
    const ctx = getAudioCtx();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.16);
      osc.frequency.exponentialRampToValueAtTime(660, now + 0.34);
      osc.frequency.exponentialRampToValueAtTime(1040, now + 0.52);

      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(18, now);
      lfoGain.gain.setValueAtTime(48, now);
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.14, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.58);

      osc.connect(gain);
      gain.connect(getUfoAudioDest(ctx));
      osc.start(now);
      lfo.start(now);
      osc.stop(now + 0.6);
      lfo.stop(now + 0.6);
    } catch (e) {}
  }

  function playHangarKlaxon() {
    const ctx = getAudioCtx();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      [0, 0.24, 0.48].forEach((offset) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(340, now + offset);
        osc.frequency.linearRampToValueAtTime(510, now + offset + 0.14);
        gain.gain.setValueAtTime(0.001, now + offset);
        gain.gain.linearRampToValueAtTime(0.1, now + offset + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.2);
        osc.connect(gain);
        gain.connect(getUfoAudioDest(ctx));
        osc.start(now + offset);
        osc.stop(now + offset + 0.22);
      });
    } catch (e) {}
  }

  function playPlasmaLaserPew(shotIdx = 0) {
    const ctx = getAudioCtx();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const sub = ctx.createOscillator();
      const gain = ctx.createGain();
      const pitchShift = (shotIdx % 5) * 35;

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(1180 + pitchShift, now);
      osc.frequency.exponentialRampToValueAtTime(195, now + 0.13);

      sub.type = 'triangle';
      sub.frequency.setValueAtTime(590 + pitchShift * 0.5, now);
      sub.frequency.exponentialRampToValueAtTime(95, now + 0.14);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.13, now + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.145);

      osc.connect(gain);
      sub.connect(gain);
      gain.connect(getUfoAudioDest(ctx));
      osc.start(now);
      sub.start(now);
      osc.stop(now + 0.15);
      sub.stop(now + 0.15);
    } catch (e) {}
  }

  function updateJetsonsEngineHum(active, speedNorm, altNorm, turbo) {
    const ctx = getAudioCtx();
    if (!ctx || ctx.state !== 'running') return;
    if (!active) {
      if (state.humActive && state.humGain) {
        try {
          state.humGain.gain.cancelScheduledValues(ctx.currentTime);
          state.humGain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.15);
        } catch (e) {}
        state.humActive = false;
      }
      return;
    }

    if (!state.humOsc) {
      try {
        const osc = ctx.createOscillator();
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.value = 185;
        lfo.type = 'sine';
        lfo.frequency.value = 9.5; // Classic Jetsons bubbly saucer warble!
        lfoGain.gain.value = 28;

        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        gain.gain.value = 0.0001;
        osc.connect(gain);
        gain.connect(getUfoAudioDest(ctx));

        osc.start();
        lfo.start();
        state.humOsc = osc;
        state.humLfo = lfo;
        state.humGain = gain;
      } catch (e) {
        return;
      }
    }

    state.humActive = true;
    const now = ctx.currentTime;
    if (now - (state._lastHumParamAt || 0) < 0.18) return;
    state._lastHumParamAt = now;
    const targetFreq = Math.round(175 + speedNorm * 160 + altNorm * 55 + (turbo ? 110 : 0));
    const targetLfoRate = 8.5 + speedNorm * 9.0 + (turbo ? 6.0 : 0);
    const targetVol = 0.035 + speedNorm * 0.03 + (turbo ? 0.025 : 0);
    try {
      state.humOsc.frequency.cancelScheduledValues(now);
      state.humOsc.frequency.setTargetAtTime(targetFreq, now, 0.1);
      state.humLfo.frequency.cancelScheduledValues(now);
      state.humLfo.frequency.setTargetAtTime(targetLfoRate, now, 0.1);
      state.humGain.gain.cancelScheduledValues(now);
      state.humGain.gain.setTargetAtTime(targetVol, now, 0.12);
    } catch (e) {}
  }

  // ==========================================================================
  // 1. BUILD THUNDERBIRDS-STYLE SECRET LAUNCH ISLAND ("SHONKBIRD ATOLL")
  // ==========================================================================
  function buildThunderbirdsIsland(scene) {
    islandGroup = new THREE.Group();
    islandGroup.position.set(ISLE_X, 0, ISLE_Z);

    // Volcanic-tropical outer island ring (hollow center for the secret hangar bay!)
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x3b4d5e, roughness: 0.85, flatShading: true });
    const grassMat = new THREE.MeshStandardMaterial({ color: 0x2ea062, roughness: 0.78 });
    const sandMat = new THREE.MeshStandardMaterial({ color: 0xf4dca8, roughness: 0.88 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xdbeafe, metalness: 0.72, roughness: 0.22 });
    const deckMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.45, roughness: 0.45 });
    const poolMat = new THREE.MeshStandardMaterial({
      color: 0x22d3ee,
      emissive: 0x0891b2,
      emissiveIntensity: 0.45,
      roughness: 0.18,
      metalness: 0.2
    });

    // Sandy beach collar rising from seabed
    const beachBase = new THREE.Mesh(new THREE.CylinderGeometry(ISLE_RADIUS - 3.5, ISLE_RADIUS + 6.0, 5.2, 32), sandMat);
    beachBase.position.y = 0.4;
    islandGroup.add(beachBase);

    // Emerald tropical plateau rim
    const grassRing = new THREE.Mesh(new THREE.CylinderGeometry(ISLE_RADIUS - 7.0, ISLE_RADIUS - 2.5, 2.8, 32), grassMat);
    grassRing.position.y = 4.0;
    islandGroup.add(grassRing);

    // Subterranean launch silo rim (flush metallic Thunderbirds collar around central 13m bay)
    const siloRim = new THREE.Mesh(new THREE.TorusGeometry(13.2, 0.95, 14, 36), chromeMat);
    siloRim.rotation.x = Math.PI / 2;
    siloRim.position.y = ISLE_DECK_Y - 0.35;
    islandGroup.add(siloRim);

    // Dark recessed launch bay interior pit
    const bayFloor = new THREE.Mesh(new THREE.CylinderGeometry(12.8, 12.8, 0.8, 32), deckMat);
    bayFloor.position.y = HANGAR_LOWER_Y - 0.6;
    islandGroup.add(bayFloor);

    // Glowing cyan guide ring inside the silo
    const bayGlow = new THREE.Mesh(
      new THREE.TorusGeometry(11.4, 0.22, 10, 32),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    bayGlow.rotation.x = Math.PI / 2;
    bayGlow.position.y = ISLE_DECK_Y - 0.8;
    islandGroup.add(bayGlow);

    // Sliding Thunderbirds Secret Pool-Lid Hangar Doors (Left & Right halves!)
    const doorGeo = new THREE.CylinderGeometry(12.9, 12.9, 0.55, 24, 1, false, 0, Math.PI);
    hangarDoorL = new THREE.Group();
    const doorLMesh = new THREE.Mesh(doorGeo, poolMat);
    doorLMesh.rotation.y = Math.PI / 2;
    const doorLTrim = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.7, 25.4), chromeMat);
    doorLTrim.position.set(0.3, 0.05, 0);
    hangarDoorL.add(doorLMesh, doorLTrim);
    hangarDoorL.position.set(0, ISLE_DECK_Y + 0.05, 0);
    islandGroup.add(hangarDoorL);

    hangarDoorR = new THREE.Group();
    const doorRMesh = new THREE.Mesh(doorGeo, poolMat);
    doorRMesh.rotation.y = -Math.PI / 2;
    const doorRTrim = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.7, 25.4), chromeMat);
    doorRTrim.position.set(-0.3, 0.05, 0);
    hangarDoorR.add(doorRMesh, doorRTrim);
    hangarDoorR.position.set(0, ISLE_DECK_Y + 0.05, 0);
    islandGroup.add(hangarDoorR);

    // Hydraulic Launch Elevator Platform
    elevatorMesh = new THREE.Group();
    const padDisc = new THREE.Mesh(new THREE.CylinderGeometry(9.6, 10.2, 0.75, 28), deckMat);
    const padRing = new THREE.Mesh(
      new THREE.TorusGeometry(8.4, 0.2, 10, 32),
      new THREE.MeshBasicMaterial({ color: 0xfbbf24 })
    );
    padRing.rotation.x = Math.PI / 2;
    padRing.position.y = 0.42;
    const piston = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.5, 10.0, 16), chromeMat);
    piston.position.y = -5.2;
    elevatorMesh.add(padDisc, padRing, piston);
    elevatorMesh.position.set(0, HANGAR_LOWER_Y, 0);
    islandGroup.add(elevatorMesh);

    // 6 Tilting Thunderbirds Palm Trees around the rim!
    tiltingPalms = [];
    isleColliders = [];
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.9 });
    const frondMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.7, side: THREE.DoubleSide });
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * Math.PI * 2 + 0.3;
      const px = Math.cos(ang) * 16.8;
      const pz = Math.sin(ang) * 16.8;
      const pivot = new THREE.Group();
      pivot.position.set(px, ISLE_DECK_Y, pz);
      pivot.rotation.y = -ang;
      isleColliders.push({ x: ISLE_X + px, z: ISLE_Z + pz, radius: 0.72, topY: ISLE_DECK_Y + 7.5 });

      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.52, 7.2, 8), trunkMat);
      trunk.position.y = 3.6;
      pivot.add(trunk);

      for (let f = 0; f < 6; f++) {
        const fa = (f / 6) * Math.PI * 2;
        const frond = new THREE.Mesh(new THREE.ConeGeometry(0.9, 3.8, 5), frondMat);
        frond.position.set(Math.cos(fa) * 1.4, 7.1, Math.sin(fa) * 1.4);
        frond.rotation.z = -Math.PI * 0.36;
        frond.rotation.y = -fa;
        pivot.add(frond);
      }

      islandGroup.add(pivot);
      tiltingPalms.push({ pivot, baseAng: ang });
    }

    // 4 Rotating Amber Thunderbirds Warning Beacons
    warningBeacons = [];
    for (let i = 0; i < 4; i++) {
      const ang = (i / 4) * Math.PI * 2 + Math.PI * 0.25;
      const post = new THREE.Group();
      post.position.set(Math.cos(ang) * 14.5, ISLE_DECK_Y + 0.4, Math.sin(ang) * 14.5);
      isleColliders.push({ x: ISLE_X + Math.cos(ang) * 14.5, z: ISLE_Z + Math.sin(ang) * 14.5, radius: 0.65, topY: ISLE_DECK_Y + 2.2 });
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 1.3, 10), chromeMat);
      base.position.y = 0.65;
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(0.38, 12, 10),
        new THREE.MeshBasicMaterial({ color: 0xf59e0b })
      );
      dome.position.y = 1.42;
      post.add(base, dome);
      islandGroup.add(post);
      warningBeacons.push({ dome, phase: i * 1.57 });
    }

    // Retro-Modern Launch Control Console & Dock Pier on the Northwest side facing Blåhaj Island!
    const consoleGroup = new THREE.Group();
    consoleGroup.position.set(-16.5, ISLE_DECK_Y, -11.5);
    isleColliders.push({ x: ISLE_X - 16.5, z: ISLE_Z - 11.5, radius: 1.45, topY: ISLE_DECK_Y + 2.0 });
    consoleGroup.rotation.y = Math.PI * 0.25;
    const ped = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.6, 1.2), chromeMat);
    ped.position.y = 0.8;
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(1.7, 0.85),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    screen.position.set(0, 1.45, 0.62);
    screen.rotation.x = -0.35;
    const bigRedBtn = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.32, 0.22, 14),
      new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 0.65 })
    );
    bigRedBtn.position.set(0, 1.65, -0.1);
    consoleGroup.add(ped, screen, bigRedBtn);
    islandGroup.add(consoleGroup);

    // Wooden Pier & Steps leading down to the NW lagoon water so sharks can walk/sail right up!
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x9a6b3d, roughness: 0.85 });
    const dockBridge = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.45, 22.0), woodMat);
    dockBridge.position.set(-22.5, 2.2, -16.5);
    dockBridge.rotation.y = Math.PI * 0.28;
    dockBridge.rotation.x = -0.22;
    islandGroup.add(dockBridge);

    // Scenic rocky crags on the back (SE) side for Thunderbird cliff silhouette
    for (let r = 0; r < 5; r++) {
      const ang = -0.4 + r * 0.45;
      const cragRad = 4.2 + (r % 2) * 2.2;
      const crag = new THREE.Mesh(new THREE.DodecahedronGeometry(cragRad, 0), rockMat);
      const cx = Math.cos(ang) * 22.5;
      const cz = Math.sin(ang) * 22.5;
      crag.position.set(cx, ISLE_DECK_Y + 2.5 + (r % 3) * 1.4, cz);
      crag.scale.set(1.2, 1.6, 1.1);
      islandGroup.add(crag);
      isleColliders.push({ x: ISLE_X + cx, z: ISLE_Z + cz, radius: cragRad * 1.05, topY: ISLE_DECK_Y + 9.5 });
    }

    // Glowing holographic beacon pylon visible from Blåhaj Island
    const beaconRing = new THREE.Mesh(
      new THREE.TorusGeometry(2.6, 0.14, 10, 28),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    beaconRing.position.set(-16.5, ISLE_DECK_Y + 5.2, -11.5);
    islandGroup.add(beaconRing);
    runwayChevrons.push(beaconRing);

    scene.add(islandGroup);
  }

  // ==========================================================================
  // 2. BUILD JETSONS-INSPIRED 3D UFO ("S.S. SHONK-SAUCER MK. VII")
  // ==========================================================================
  function buildJetsonsUFO(scene) {
    ufoGroup = new THREE.Group();
    ufoHullGroup = new THREE.Group();
    ufoGroup.add(ufoHullGroup);

    // Materials: Retro-futuristic Jetsons Mint-Chrome, Pearl White, Warm Brass, Crystal Glass
    const hullMintMat = new THREE.MeshStandardMaterial({
      color: 0x5eead4,
      metalness: 0.52,
      roughness: 0.22
    });
    const hullWhiteMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      metalness: 0.35,
      roughness: 0.24
    });
    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.85,
      roughness: 0.14
    });
    const darkConsoleMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.45,
      roughness: 0.38
    });
    const velvetSeatMat = new THREE.MeshStandardMaterial({
      color: 0xf43f5e, // Nostalgic retro cherry-red diner/Jetsons upholstery!
      roughness: 0.72,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1
    });
    // Lightweight glass material (avoid MeshPhysicalMaterial transmission pass, which triggers a second full-scene render!)
    const canopyGlassMat = new THREE.MeshStandardMaterial({
      color: 0xbae6fd,
      transparent: true,
      opacity: 0.22,
      roughness: 0.08,
      metalness: 0.15,
      depthWrite: false,
      side: THREE.FrontSide
    });

    floorSolidMeshes = [];
    canopyRibs = [];

    // Main Lower Saucer Dish
    const lowerDish = new THREE.Mesh(new THREE.CylinderGeometry(5.1, 2.7, 1.15, 36), hullMintMat);
    lowerDish.position.y = 0.0;
    ufoHullGroup.add(lowerDish);
    floorSolidMeshes.push(lowerDish);

    // Wide Chrome Equatorial Bumper Ring
    const equatorRing = new THREE.Mesh(new THREE.TorusGeometry(5.15, 0.34, 14, 40), chromeMat);
    equatorRing.rotation.x = Math.PI / 2;
    equatorRing.position.y = 0.48;
    ufoHullGroup.add(equatorRing);

    // Upper Deck Rim (open in the center for the cockpit cabin!)
    const upperDeck = new THREE.Mesh(new THREE.TorusGeometry(3.95, 1.18, 12, 36), hullWhiteMat);
    upperDeck.rotation.x = Math.PI / 2;
    upperDeck.scale.set(1, 1, 0.38);
    upperDeck.position.y = 0.88;
    ufoHullGroup.add(upperDeck);

    // Interior Cabin Floor (Cozy sky-blue carpet with chrome trim!)
    const cabinFloor = new THREE.Mesh(
      new THREE.CylinderGeometry(3.35, 3.35, 0.18, 28),
      new THREE.MeshStandardMaterial({ color: 0x1e3a5f, roughness: 0.78 })
    );
    cabinFloor.position.y = 0.54;
    ufoHullGroup.add(cabinFloor);
    floorSolidMeshes.push(cabinFloor);

    // LCD Glass-Bottom Boat Rim & Cyan Sonar Grid (shown when Floor Cam [G] is active!)
    floorLcdGroup = new THREE.Group();
    const lcdBezel = new THREE.Mesh(
      new THREE.TorusGeometry(3.15, 0.09, 8, 36),
      new THREE.MeshBasicMaterial({ color: 0x22d3ee })
    );
    lcdBezel.rotation.x = Math.PI / 2;
    lcdBezel.position.y = 0.64;
    floorLcdGroup.add(lcdBezel);
    const lcdGrid = new THREE.GridHelper(5.6, 10, 0x38bdf8, 0x0e7490);
    lcdGrid.position.y = 0.63;
    if (lcdGrid.material) {
      lcdGrid.material.transparent = true;
      lcdGrid.material.opacity = 0.38;
    }
    floorLcdGroup.add(lcdGrid);
    floorLcdGroup.visible = false;
    ufoHullGroup.add(floorLcdGroup);

    // 16 Chasing Neon Rim Lights around the equator
    rimLightMeshes = [];
    for (let i = 0; i < 16; i++) {
      const ang = (i / 16) * Math.PI * 2;
      const mat = new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? 0x38bdf8 : 0xfbbf24 });
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), mat);
      bulb.position.set(Math.cos(ang) * 5.42, 0.52, Math.sin(ang) * 5.42);
      ufoHullGroup.add(bulb);
      rimLightMeshes.push({ mesh: bulb, mat, idx: i });
    }

    // Twin Jetsons Retro Rocket Tailfins & Ion Thruster Pods (Port & Starboard!)
    thrusterCones = [];
    [-1, 1].forEach((side) => {
      const finGroup = new THREE.Group();
      finGroup.position.set(side * 4.5, 0.65, -1.6);

      // Swept chrome fin
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.24, 1.45, 2.8), hullMintMat);
      fin.rotation.z = side * -0.45;
      fin.position.set(side * 0.45, 0.55, -0.3);
      finGroup.add(fin);

      // Retro rocket nacelle pod
      const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.55, 2.4, 14), chromeMat);
      pod.rotation.x = Math.PI / 2;
      finGroup.add(pod);

      // Glowing ion exhaust cone (scales with throttle & turbo!)
      const coneMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.82
      });
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.44, 2.2, 12), coneMat);
      cone.rotation.x = -Math.PI / 2;
      cone.position.set(0, 0, -2.1);
      finGroup.add(cone);
      thrusterCones.push({ mesh: cone, mat: coneMat });

      ufoHullGroup.add(finGroup);
    });

    // Mojo-Powered Shark-Tech Transceiver & Flux Reactor Behind Seats (Connects Dorsal Aerial!)
    const mojoRack = new THREE.Group();
    mojoRack.position.set(0, 1.18, -1.35);

    const reactorBase = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.95, 0.88), darkConsoleMat);
    reactorBase.position.y = 0.28;
    mojoRack.add(reactorBase);

    const brassBand = new THREE.Mesh(new THREE.BoxGeometry(1.98, 0.14, 0.94), new THREE.MeshStandardMaterial({ color: 0xd8aa5b, metalness: 0.82, roughness: 0.24 }));
    brassBand.position.y = 0.72;
    mojoRack.add(brassBand);

    // Glowing Mojo Crystal Core
    mojoCoreMesh = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.32, 0),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    mojoCoreMesh.position.set(0, 1.15, 0.05);
    mojoRack.add(mojoCoreMesh);

    const coreCage = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.05, 8, 20), chromeMat);
    coreCage.position.set(0, 1.15, 0.05);
    mojoRack.add(coreCage);

    // Twin cooling fins flanking the Mojo Core
    [-0.68, 0.68].forEach((fx) => {
      const cFin = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.65, 0.68), hullMintMat);
      cFin.position.set(fx, 0.98, 0);
      mojoRack.add(cFin);
    });

    // Chrome mast socket rising from Mojo-Core rack right through the rear canopy into the Dorsal Turret Collar!
    const mastSocket = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.28, 2.75, 14), chromeMat);
    mastSocket.position.set(0, 2.05, 0);
    mojoRack.add(mastSocket);
    const dorsalCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.68, 0.36, 16), chromeMat);
    dorsalCollar.position.set(0, 2.82, 0);
    mojoRack.add(dorsalCollar);
    ufoHullGroup.add(mojoRack);

    // ========================================================================
    // HARDPOINT SOCKETS & DEPLOYABLE EXTERIOR APPENDAGES (Zero-Clipping Layout!)
    // ========================================================================
    sockets.belly = new THREE.Object3D();
    sockets.belly.position.set(0, -0.62, 0);
    ufoHullGroup.add(sockets.belly);

    // Positioned cleanly outside the 5.49m equatorial bumper ring!
    sockets.portWing = new THREE.Object3D();
    sockets.portWing.position.set(-5.35, 0.58, 0.78);
    ufoHullGroup.add(sockets.portWing);

    sockets.starboardWing = new THREE.Object3D();
    sockets.starboardWing.position.set(5.35, 0.58, 0.78);
    ufoHullGroup.add(sockets.starboardWing);

    // Positioned cleanly atop the rear dorsal turret collar (above the canopy dome!)
    sockets.dorsalRack = new THREE.Object3D();
    sockets.dorsalRack.position.set(0, 4.02, -1.35);
    ufoHullGroup.add(sockets.dorsalRack);

    sockets.rearNacelles = new THREE.Object3D();
    sockets.rearNacelles.position.set(0, 0.72, -2.05);
    ufoHullGroup.add(sockets.rearNacelles);

    // Default Dorsal Aerial Spire (Smoothly retracts into the Mojo-Core mast whenever Radar or Disco deploys!)
    defaultAerialGroup = new THREE.Group();
    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.14, 1.95, 10), chromeMat);
    antenna.position.set(0, 0.95, 0);
    antenna.rotation.x = -0.14;
    const antOrb = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 12, 10),
      new THREE.MeshBasicMaterial({ color: 0xf43f5e })
    );
    antOrb.position.set(0, 1.95, -0.14);
    defaultAerialGroup.add(antenna, antOrb);
    sockets.dorsalRack.add(defaultAerialGroup);

    buildSaucerModules(chromeMat, hullMintMat, darkConsoleMat);

    // ========================================================================
    // DETAILED COCKPIT INTERIOR (VISIBLE THROUGH CLEAR GLASS & INSIDE VIEW!)
    // ========================================================================
    // Curved Jetsons Front Flight Console (+Z is Forward!)
    const consoleArc = new THREE.Mesh(
      new THREE.CylinderGeometry(2.65, 2.85, 0.85, 24, 1, true, -Math.PI * 0.42, Math.PI * 0.84),
      darkConsoleMat
    );
    consoleArc.position.set(0, 1.02, 0.2);
    ufoHullGroup.add(consoleArc);

    // Glowing holographic dash strips
    [-0.9, 0, 0.9].forEach((gx, gi) => {
      const gauge = new THREE.Mesh(
        new THREE.PlaneGeometry(0.75, 0.36),
        new THREE.MeshBasicMaterial({
          color: gi === 1 ? 0x34d399 : 0x38bdf8,
          side: THREE.DoubleSide
        })
      );
      gauge.position.set(gx, 1.32, 2.48 - Math.abs(gx) * 0.22);
      gauge.rotation.y = Math.PI - gx * 0.28;
      gauge.rotation.x = 0.35;
      ufoHullGroup.add(gauge);
    });

    // Chrome Pilot Flight Yoke (Left Seat)
    const yokeStem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.55, 8), chromeMat);
    yokeStem.position.set(-0.95, 1.15, 2.05);
    yokeStem.rotation.x = -0.5;
    const yokeBar = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.045, 8, 18, Math.PI * 1.2), chromeMat);
    yokeBar.position.set(-0.95, 1.38, 1.88);
    yokeBar.rotation.z = Math.PI * 0.9;
    ufoHullGroup.add(yokeStem, yokeBar);

    // QUIRK #1: Wobbling Miniature Dashboard Bobble-Blåhaj!
    bobbleSharkMesh = new THREE.Group();
    const bBody = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0x4da6ff, roughness: 0.6 })
    );
    bBody.scale.set(0.85, 0.8, 1.5);
    const bFin = new THREE.Mesh(
      new THREE.ConeGeometry(0.06, 0.16, 4),
      new THREE.MeshStandardMaterial({ color: 0x3b82f6 })
    );
    bFin.position.set(0, 0.14, 0);
    bobbleSharkMesh.add(bBody, bFin);
    bobbleSharkMesh.position.set(0.0, 1.56, 2.42);
    ufoHullGroup.add(bobbleSharkMesh);

    // QUIRK #2: Steaming Ceramic Mug of Cosmic Tea on the Dash!
    const mugBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.09, 0.22, 12),
      new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.3 })
    );
    mugBody.position.set(0.62, 1.54, 2.34);
    const teaTop = new THREE.Mesh(
      new THREE.CircleGeometry(0.095, 12),
      new THREE.MeshBasicMaterial({ color: 0xd97706 })
    );
    teaTop.rotation.x = -Math.PI / 2;
    teaTop.position.set(0.62, 1.655, 2.34);
    ufoHullGroup.add(mugBody, teaTop);

    // QUIRK #3: Retro Floating Lava Lamp on Co-Pilot Side!
    const lampBase = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.18, 10), chromeMat);
    lampBase.position.set(1.38, 1.52, 2.02);
    const lampGlass = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.11, 0.36, 10),
      new THREE.MeshBasicMaterial({ color: 0xf472b6, transparent: true, opacity: 0.45 })
    );
    lampGlass.position.set(1.38, 1.76, 2.02);
    lavaLampBlob = new THREE.Mesh(
      new THREE.SphereGeometry(0.055, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xfde047 })
    );
    lavaLampBlob.position.set(1.38, 1.72, 2.02);
    ufoHullGroup.add(lampBase, lampGlass, lavaLampBlob);

    // Twin Plush Velvet Swivel Captain Chairs (Cleanly separated above floor so zero z-fighting/flicker!)
    [-1.05, 1.05].forEach((sx) => {
      const chair = new THREE.Group();
      chair.position.set(sx, 0.68, 0.65);
      const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.20, 0.22, 10), chromeMat);
      pedestal.position.y = 0.08;
      const cushion = new THREE.Mesh(new THREE.BoxGeometry(1.14, 0.24, 1.04), velvetSeatMat);
      cushion.position.set(0, 0.26, 0.04);
      const backrest = new THREE.Mesh(new THREE.BoxGeometry(1.10, 1.12, 0.20), velvetSeatMat);
      backrest.position.set(0, 0.90, -0.58);
      backrest.rotation.x = -0.12;
      chair.add(pedestal, cushion, backrest);
      ufoHullGroup.add(chair);
    });

    // Seat Anchors for Pilot & Passenger Shark Meshes + Per-Seat Shark-Eye Camera Anchors
    seatPilotAnchor = new THREE.Object3D();
    seatPilotAnchor.position.set(-1.05, 0.96, 0.78);
    ufoHullGroup.add(seatPilotAnchor);

    seatPassengerAnchor = new THREE.Object3D();
    seatPassengerAnchor.position.set(1.05, 0.96, 0.78);
    ufoHullGroup.add(seatPassengerAnchor);

    pilotEyeAnchor = new THREE.Object3D();
    pilotEyeAnchor.position.set(-1.05, 1.88, 0.98);
    ufoHullGroup.add(pilotEyeAnchor);

    passengerEyeAnchor = new THREE.Object3D();
    passengerEyeAnchor.position.set(1.05, 1.88, 0.98);
    ufoHullGroup.add(passengerEyeAnchor);

    cockpitCamAnchor = pilotEyeAnchor;

    // Crystal-Clear Bubble Canopy Dome (so sharks are clearly visible from outside!)
    const domeGeo = new THREE.SphereGeometry(3.45, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.56);
    canopyDomeMesh = new THREE.Mesh(domeGeo, canopyGlassMat);
    canopyDomeMesh.position.y = 0.85;
    ufoHullGroup.add(canopyDomeMesh);

    // True 3D Convex Water-Bead Meshes that bead on the glass capsule, refract light in 3D,
    // roll down the curved meridian, and drip off the rim over ~3 seconds!
    canopyBeadMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.FrontSide,
      uniforms: {
        uTime: { value: 0 },
        uGlobalAlpha: { value: 1.0 }
      },
      vertexShader: `
        uniform float uTime;
        varying vec3 vNormalView;
        varying vec3 vViewDir;
        varying vec3 vLocalPos;
        void main() {
          vLocalPos = position;
          // Subtle 3D surface-tension wobble on the physical 3D bead geometry
          vec3 p = position;
          float wob = sin(uTime * 7.0 + p.y * 5.0 + p.x * 4.0) * 0.07;
          p.x += wob * (1.0 - smoothstep(0.0, 1.2, abs(p.y)));
          // Flatten backside (+Z faces outward from glass, -Z rests flush against glass)
          if (p.z < 0.0) p.z *= 0.22;
          vec4 mvPos = modelViewMatrix * vec4(p, 1.0);
          vNormalView = normalize(normalMatrix * normalize(vec3(position.x, position.y * 0.7, max(0.15, position.z))));
          vViewDir = normalize(-mvPos.xyz);
          gl_Position = projectionMatrix * mvPos;
        }`,
      fragmentShader: `
        uniform float uGlobalAlpha;
        varying vec3 vNormalView;
        varying vec3 vViewDir;
        varying vec3 vLocalPos;
        void main() {
          vec3 N = normalize(vNormalView);
          vec3 V = normalize(vViewDir);
          float ndotv = clamp(dot(N, V), 0.0, 1.0);

          // 3D Fresnel glass-water meniscus: crystal-clear transparent interior, crisp 3D rim
          float fresnel = pow(1.0 - ndotv, 2.6);

          // Convex-lens inverted refraction inside the 3D bead (bends sky & sea light across the curved normal)
          vec3 refractedSky = vec3(0.78, 0.93, 1.0);
          vec3 refractedSea = vec3(0.08, 0.36, 0.56);
          float lensBend = clamp(-N.y * 0.85 + 0.5, 0.0, 1.0);
          vec3 lensColor = mix(refractedSea, refractedSky, lensBend);

          // Primary sun specular pin-light + secondary bottom internal caustic reflection
          vec3 L1 = normalize(vec3(0.45, 0.78, 0.42));
          vec3 H1 = normalize(L1 + V);
          float spec1 = pow(max(0.0, dot(N, H1)), 48.0);

          vec3 L2 = normalize(vec3(-0.3, -0.75, 0.58));
          vec3 H2 = normalize(L2 + V);
          float caustic2 = pow(max(0.0, dot(N, H2)), 18.0) * 0.55;

          vec3 col = lensColor + vec3(1.0) * (spec1 * 1.35 + caustic2 * 0.65);
          // Interior stays see-through (~0.10 alpha); rim & specular highlights pop cleanly in 3D
          float alpha = clamp((0.09 + fresnel * 0.62 + spec1 * 0.88 + caustic2 * 0.32) * uGlobalAlpha, 0.0, 0.95);
          gl_FragColor = vec4(col, alpha);
        }`
    });

    canopyBeadGroup = new THREE.Group();
    canopyBeadGroup.position.y = 0.85;
    canopyBeadGroup.visible = false;
    ufoHullGroup.add(canopyBeadGroup);

    const sharedBeadGeo = new THREE.SphereGeometry(1.0, 14, 12);
    canopyBeads = [];
    for (let i = 0; i < 36; i++) {
      const m = new THREE.Mesh(sharedBeadGeo, canopyBeadMat);
      canopyBeadGroup.add(m);
      canopyBeads.push({
        mesh: m,
        phi: 0,
        theta: 0,
        baseRadius: 0.07,
        speed: 0,
        holdTime: 0,
        detached: false,
        fallPos: new THREE.Vector3(),
        fallVelY: 0
      });
    }

    // 7C. 3D Orbital Hyperdrive Mach Shockwave & Warp Portal Vortex (engulfs saucer at 6s charge!)
    warpPortalGroup = new THREE.Group();
    warpPortalGroup.position.set(0, 0.7, 0);
    warpPortalGroup.visible = false;
    ufoGroup.add(warpPortalGroup);

    warpShockConeMesh = new THREE.Mesh(
      new THREE.ConeGeometry(7.2, 11.5, 28, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.0,
        side: THREE.DoubleSide,
        depthWrite: false
      })
    );
    warpShockConeMesh.rotation.x = Math.PI * 0.5;
    warpShockConeMesh.position.z = 2.6;
    warpPortalGroup.add(warpShockConeMesh);

    warpRingOuterMesh = new THREE.Mesh(
      new THREE.TorusGeometry(6.4, 0.36, 14, 48),
      new THREE.MeshBasicMaterial({
        color: 0xc084fc,
        transparent: true,
        opacity: 0.0,
        depthWrite: false
      })
    );
    warpRingOuterMesh.position.z = 4.2;
    warpPortalGroup.add(warpRingOuterMesh);

    warpRingInnerMesh = new THREE.Mesh(
      new THREE.TorusGeometry(4.6, 0.24, 12, 36),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.0,
        depthWrite: false
      })
    );
    warpRingInnerMesh.position.z = 4.5;
    warpPortalGroup.add(warpRingInnerMesh);

    warpEngulfSphereMesh = new THREE.Mesh(
      new THREE.SphereGeometry(7.8, 24, 18),
      new THREE.MeshBasicMaterial({
        color: 0xe879f9,
        transparent: true,
        opacity: 0.0,
        side: THREE.BackSide,
        depthWrite: false
      })
    );
    warpPortalGroup.add(warpEngulfSphereMesh);

    // Sleek curved chrome canopy ribs (hidden automatically when Floor Cam is active!)
    [0, Math.PI * 0.5, Math.PI, Math.PI * 1.5].forEach((ry) => {
      const rib = new THREE.Mesh(new THREE.TorusGeometry(3.46, 0.065, 8, 28, Math.PI * 0.56), chromeMat);
      rib.position.y = 0.85;
      rib.rotation.y = ry;
      ufoHullGroup.add(rib);
      canopyRibs.push(rib);
    });

    // ========================================================================
    // BOTTOM HATCH & EXTENDABLE GLOWING BOARDING STAIRS
    // ========================================================================
    hatchDoorMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(1.45, 1.45, 0.16, 20),
      chromeMat
    );
    hatchDoorMesh.position.set(0, -0.58, 0);
    ufoHullGroup.add(hatchDoorMesh);
    floorSolidMeshes.push(hatchDoorMesh);

    stairsGroup = new THREE.Group();
    stairsGroup.position.set(0, -0.52, 0.85);
    stairSteps = [];
    const stepMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.75,
      metalness: 0.6,
      roughness: 0.25
    });
    for (let s = 0; s < 5; s++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.12, 0.55), stepMat);
      step.position.set(0, -0.32 * (s + 1), 0.42 * (s + 1));
      stairsGroup.add(step);
      stairSteps.push(step);
    }
    // Glowing cyan Boarding Pad Ring at the foot of the stairs so entry point is crystal clear!
    const boardingRing = new THREE.Mesh(
      new THREE.RingGeometry(1.15, 1.55, 28),
      new THREE.MeshBasicMaterial({
        color: 0x5eead4,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.92,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2
      })
    );
    boardingRing.rotation.x = -Math.PI / 2;
    boardingRing.position.set(0, -1.58, 2.85);
    stairsGroup.add(boardingRing);
    ufoHullGroup.add(stairsGroup);

    // Emerald / Cyan Tractor Beam Cone underneath
    tractorBeamMesh = new THREE.Mesh(
      new THREE.ConeGeometry(4.8, 18.0, 24, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0x34d399,
        transparent: true,
        opacity: 0.26,
        side: THREE.DoubleSide,
        depthWrite: false
      })
    );
    tractorBeamMesh.position.set(0, -9.6, 0);
    tractorBeamMesh.visible = false;
    ufoHullGroup.add(tractorBeamMesh);

    // Warm cockpit + under-saucer point light
    ufoPointLight = new THREE.PointLight(0x38bdf8, 2.2, 24.0);
    ufoPointLight.position.set(0, 1.8, 0);
    ufoHullGroup.add(ufoPointLight);

    ufoGroup.position.copy(state.pos);
    ufoGroup.rotation.y = state.yaw;
    scene.add(ufoGroup);
  }

  // ==========================================================================
  // 3. WALKABLE SURFACE HEIGHT FOR SHONKBIRD ATOLL & LAUNCH PAD
  // ==========================================================================
  function getSurfaceHeight(x, z, refY = null) {
    if (!isBuilt) return -999;
    const dx = x - ISLE_X;
    const dz = z - ISLE_Z;
    const d = Math.hypot(dx, dz);

    if (d > ISLE_RADIUS + 4.0) return -999;

    // 1. Central Hangar Bay (Radius 12.8m)
    if (d < 12.8) {
      if (state.hangarOpenProg < 0.35) {
        // Pool roof is closed -> walkable turquoise deck!
        return ISLE_DECK_Y + 0.32;
      }
      // Hangar is open -> stand on the rising hydraulic elevator platform!
      return HANGAR_LOWER_Y + state.hangarOpenProg * (HANGAR_RAISED_Y - HANGAR_LOWER_Y) + 0.38;
    }

    // 2. Flat Emerald Tropical Plateau Rim (12.8m .. 26.0m): always flush at ISLE_DECK_Y (5.4m)!
    if (d <= 26.0) {
      return ISLE_DECK_Y;
    }

    // 3. Outer Slope & Northwest Boarding Pier Ramp (26.0m .. 36.0m)
    const pierDx = dx - (-22.5);
    const pierDz = dz - (-16.5);
    if (Math.hypot(pierDx, pierDz) < 11.5) {
      const rampProg = Math.max(0, Math.min(1, 1.0 - (d - 26.0) / 10.0));
      return 0.6 + rampProg * (ISLE_DECK_Y - 0.6);
    }

    const beachSlope = Math.max(0, 1.0 - (d - 26.0) / 9.0);
    return beachSlope * ISLE_DECK_Y;
  }

  // ==========================================================================
  // 4. INTERACTABLES, BOARDING, LAUNCH, AUTO-LAND & CO-OP SYNC
  // ==========================================================================
  function getInteractables(playerPos) {
    if (!isBuilt || !playerPos || state.localRole) return [];
    const items = [];

    // 1. Thunderbirds Launch Control Console on Shonkbird Atoll
    const consoleX = ISLE_X - 16.5;
    const consoleZ = ISLE_Z - 11.5;
    const dConsole = Math.hypot(playerPos.x - consoleX, playerPos.z - consoleZ);
    if (dConsole < 5.5) {
      const ufoAwayFromIsle = Math.hypot(state.pos.x - ISLE_X, state.pos.z - ISLE_Z) > 22.0;
      items.push({
        kind: ufoAwayFromIsle ? 'ufo_reset_isle' : 'ufo_hangar_console',
        dist: dConsole,
        prompt: ufoAwayFromIsle
          ? '🛸 Recall S.S. Shonk-Saucer Back to Shonkbird Atoll Launch Pad [E]'
          : (state.hangarTargetOpen
            ? '🌴 Close Secret Thunderbirds Hangar Doors [E]'
            : '🚨 OPEN SECRET THUNDERBIRDS LAUNCH BAY [E] 🛸🌴')
      });
    }

    // 2. Endless Pierhead Quick-Shuttle Beacon (48, 82) to summon/warp to Shonkbird Atoll!
    const dPierBeacon = Math.hypot(playerPos.x - 48.0, playerPos.z - 82.0);
    if (dPierBeacon < 6.0 && state.pos.distanceTo(playerPos) > 15.0) {
      items.push({
        kind: 'ufo_summon_pier',
        dist: dPierBeacon + 1.5,
        prompt: '🛸 Call S.S. Shonk-Saucer to Endless Pier [E]'
      });
    }

    // 3. Board UFO via Bottom Hatch & Glowing Stairs (when nearby!)
    const stairX = state.pos.x + Math.sin(state.yaw) * 3.7;
    const stairZ = state.pos.z + Math.cos(state.yaw) * 3.7;
    const dUfo = Math.hypot(playerPos.x - state.pos.x, playerPos.z - state.pos.z);
    const dStairs = Math.hypot(playerPos.x - stairX, playerPos.z - stairZ);
    const bestBoardD = Math.min(dUfo, dStairs);
    const dyUfo = Math.abs(playerPos.y - state.pos.y);
    if (bestBoardD < 10.5 && dyUfo < 10.5) {
      const hasRemotePilot = !!(state.pilotClientId && state.pilotClientId !== getMyClientId());
      items.push({
        kind: 'ufo_board',
        dist: Math.max(0.2, bestBoardD - 3.5),
        prompt: hasRemotePilot
          ? `🛸 Climb Glowing Stairs & Board as Co-Pilot Passenger (Pilot: ${state.pilotName || 'Partner'}) [E]`
          : '🛸 Climb Glowing Stairs & Pilot S.S. Shonk-Saucer Mk. VII [E]'
      });
    }

    return items;
  }

  /** Solid horizontal circle collision resolver for Shonkbird Atoll & landed UFO hull. */
  function resolveCollision(x, z, y, playerRadius = 0.75) {
    let outX = x;
    let outZ = z;
    if (!isBuilt || state.localRole) return { x: outX, z: outZ };

    // 1. Solid props on Shonkbird Atoll (crags, palm trunks, beacons, launch console)
    for (let i = 0; i < isleColliders.length; i++) {
      const c = isleColliders[i];
      if (y > c.topY) continue;
      const dx = outX - c.x;
      const dz = outZ - c.z;
      const d = Math.hypot(dx, dz);
      const minD = c.radius + playerRadius;
      if (d < minD && d > 0.0001) {
        const push = (minD - d);
        outX += (dx / d) * push;
        outZ += (dz / d) * push;
      }
    }

    // 2. Solid parked UFO hull (leaving a walkable front boarding-stairs opening!)
    if (state.phase === 'parked' && Math.abs(y - state.pos.y) < 3.2) {
      const dx = outX - state.pos.x;
      const dz = outZ - state.pos.z;
      const d = Math.hypot(dx, dz);
      const hullRadius = 4.25;
      const minD = hullRadius + playerRadius;
      if (d < minD && d > 0.0001) {
        // Check if approaching from the front glowing stairs side (+local Z)
        const fwdX = Math.sin(state.yaw);
        const fwdZ = Math.cos(state.yaw);
        const dot = (dx / d) * fwdX + (dz / d) * fwdZ;
        if (!(state.hatchOpenProg > 0.35 && dot > 0.62 && d > 2.2)) {
          const push = minD - d;
          outX += (dx / d) * push;
          outZ += (dz / d) * push;
        }
      }
    }

    return { x: outX, z: outZ };
  }

  function toggleHangarDoors(forceVal = null, silent = false) {
    state.hangarTargetOpen = forceVal !== null ? !!forceVal : !state.hangarTargetOpen;
    if (!silent) {
      playHangarKlaxon();
      if (window.showToast) {
        window.showToast(
          state.hangarTargetOpen ? '🚨 THUNDERBIRDS LAUNCH BAY OPENING! 🌴🛸' : '🌴 SECRET HANGAR SEALING…',
          state.hangarTargetOpen
            ? 'Palm trees tilting! Sliding turquoise pool roof open & raising hydraulic saucer pad!'
            : 'Retracting launch elevator and sliding secret pool lid closed.'
        );
      }
      broadcastState(true);
    }
  }

  function summonToPosition(worldPos) {
    if (!worldPos) return;
    const myId = getMyClientId();
    if (state.pilotClientId && state.pilotClientId !== myId && Date.now() - state.lastRemotePacketAt < 10000) {
      if (window.showToast) {
        window.showToast(
          `🛸 ${state.pilotName || 'A PARTNER'} IS FLYING THE SAUCER!`,
          'Only one S.S. Shonk-Saucer Mk. VII exists in the realm—ask your pilot to land so you can hop in the Co-Pilot seat!'
        );
      }
      return;
    }
    // Offset landing zone 6.5m in front of the player so the glowing stairs point right toward them!
    const pYaw = (window.player && typeof window.player.rotY === 'number') ? window.player.rotY : 0;
    const landX = worldPos.x + Math.sin(pYaw) * 6.5;
    const landZ = worldPos.z + Math.cos(pYaw) * 6.5;
    const groundY = getSafeLandingHeight(landX, landZ);
    state.hangarTargetOpen = true;
    state.pilotClientId = null;
    state.pilotName = null;
    state.phase = 'landing';
    state.phaseTimer = 0;
    state.pos.set(landX, Math.max(groundY + 15.0, 18.0), landZ);
    state.yaw = pYaw + Math.PI; // Face the player so the front stairs face them directly!
    state.vel.set(0, 0, 0);
    state.hatchTargetOpen = true;
    playJetsonsHorn();
    if (window.showToast) {
      window.showToast('🛸 S.S. SHONK-SAUCER DESCENDING!', 'Touching down right in front of you—walk to the glowing cyan stairs & press [E]!');
    }
    broadcastState(true);
  }

  function resetToTracyIsle() {
    state.hangarTargetOpen = true;
    state.hangarOpenProg = Math.max(state.hangarOpenProg, 0.85);
    state.phase = 'parked';
    state.phaseTimer = 0;
    state.vel.set(0, 0, 0);
    state.pitch = 0;
    state.roll = 0;
    state.yaw = -Math.PI * 0.72;
    state.pos.set(ISLE_X, HANGAR_RAISED_Y + 1.5, ISLE_Z);
    state.hatchTargetOpen = true;
    state.orbitalCeilingReached = false;
    playHangarKlaxon();
    if (window.showToast) {
      window.showToast('🏝️ RETURNED TO SHONKBIRD ATOLL!', 'S.S. Shonk-Saucer docked safely on the secret Launch Pad!');
    }
    broadcastState(true);
  }

  function boardUFO() {
    const myId = getMyClientId();
    const myName = getMySharkName();
    const hasRemotePilot = !!(state.pilotClientId && state.pilotClientId !== myId);

    if (hasRemotePilot) {
      state.localRole = 'passenger';
      state.passengerClientId = myId;
      state.passengerName = myName;
      if (window.showToast) {
        window.showToast('🛸 BOARDED AS CO-PILOT PASSENGER!', `Riding shotgun with ${state.pilotName || 'your partner'}! Press [V] for Cockpit/Outside View.`);
      }
    } else {
      state.localRole = 'pilot';
      state.pilotClientId = myId;
      state.pilotName = myName;
      // If parked inside closed Thunderbirds bay, automatically open the secret hangar & launch!
      const dIsle = Math.hypot(state.pos.x - ISLE_X, state.pos.z - ISLE_Z);
      if (dIsle < 14.0 && !state.hangarTargetOpen) {
        toggleHangarDoors(true, true);
        playHangarKlaxon();
      }
      // Stay parked with boarding stairs down so co-op passengers can board!
      // Pressing Space or W initiates the smooth launch sequence whenever the pilot is ready.
      if (state.phase === 'parked') {
        state.hatchTargetOpen = true;
      }
      playJetsonsHorn();
      if (window.showToast) {
        window.showToast('🛸 WELCOME ABOARD CAPTAIN!', 'Waiting on the pad (stairs down for co-pilot)! Press [Space] or [W] to launch · [L] Land · [V] View!');
      }
    }

    if (window.player) {
      window.player.inUFO = true;
      window.player.inBoat = false;
      window.player.isLounging = false;
      window.player.isSeatedInBooth = false;
    }

    showAvionicsHUD(true);
    broadcastState(true);
  }

  function canExitNow() {
    if (!state.localRole) return false;
    if (state.phase !== 'parked') return false;
    return !!(state.hatchTargetOpen && state.hatchOpenProg >= 0.7);
  }

  const _beadNorm = new THREE.Vector3();
  const _beadTanDown = new THREE.Vector3();
  const _beadTanSide = new THREE.Vector3();
  const _beadMat4 = new THREE.Matrix4();

  function seedWindscreenDroplets() {
    for (let i = 0; i < canopyBeads.length; i++) {
      const b = canopyBeads[i];
      b.phi = (i / canopyBeads.length) * Math.PI * 2 + (Math.random() - 0.5) * 0.14;
      b.theta = 0.14 + Math.random() * 0.68; // upper/mid dome
      b.baseRadius = 0.055 + Math.random() * 0.055;
      b.speed = 0.02 + Math.random() * 0.06;
      b.holdTime = 0.12 + Math.random() * 0.45; // brief surface-tension bead pause before rolling
      b.detached = false;
      b.fallVelY = 0;
      b.mesh.visible = true;
    }
  }

  function updateWindscreenWaterEffects(dt, elapsed = 0) {
    const canvas = document.getElementById('ufo-windscreen-rain');
    if (canvas && !canvas.classList.contains('hidden')) {
      canvas.classList.add('hidden');
    }

    if (state.windscreenWetTimer > 0) {
      state.windscreenWetTimer = Math.max(0, state.windscreenWetTimer - dt);
    }

    const wetActive = !state.isSubmerged && state.windscreenWetTimer > 0;
    if (!canopyBeadGroup || !canopyBeadMat) return;
    canopyBeadGroup.visible = wetActive;
    if (!wetActive) return;

    canopyBeadMat.uniforms.uTime.value = elapsed;
    canopyBeadMat.uniforms.uGlobalAlpha.value = Math.min(1.0, state.windscreenWetTimer / 0.55);

    const R = 3.465;
    const RIM_THETA = Math.PI * 0.55;

    for (let i = 0; i < canopyBeads.length; i++) {
      const b = canopyBeads[i];
      if (!b.mesh.visible) continue;

      if (b.holdTime > 0) {
        b.holdTime -= dt;
      } else if (!b.detached) {
        // Accelerate with gravity component along the curved dome slope (sin(theta))
        const gravSlope = Math.max(0.22, Math.sin(b.theta));
        b.speed = Math.min(0.95, b.speed + gravSlope * 0.68 * dt);
        b.theta += b.speed * dt;
        b.phi += Math.sin(elapsed * 4.5 + i * 1.7) * 0.04 * dt;

        if (b.theta >= RIM_THETA) {
          b.detached = true;
          b.fallPos.set(
            R * Math.sin(RIM_THETA) * Math.sin(b.phi),
            R * Math.cos(RIM_THETA),
            R * Math.sin(RIM_THETA) * Math.cos(b.phi)
          );
          b.fallVelY = -b.speed * R * 0.85;
        }
      }

      if (!b.detached) {
        const sinT = Math.sin(b.theta);
        const cosT = Math.cos(b.theta);
        const sinP = Math.sin(b.phi);
        const cosP = Math.cos(b.phi);

        // Outward normal on sphere
        _beadNorm.set(sinT * sinP, cosT, sinT * cosP).normalize();
        // Downward meridian tangent (d/dTheta)
        _beadTanDown.set(cosT * sinP, -sinT, cosT * cosP).normalize();
        // Horizontal azimuth tangent
        _beadTanSide.crossVectors(_beadTanDown, _beadNorm).normalize();

        b.mesh.position.copy(_beadNorm).multiplyScalar(R);
        // Align local axes: X = side tangent, Y = -downward tangent (so bead stretches along Y), Z = outward normal
        _beadMat4.makeBasis(_beadTanSide, _beadTanDown.clone().negate(), _beadNorm);
        b.mesh.quaternion.setFromRotationMatrix(_beadMat4);

        const stretch = 1.0 + Math.min(1.65, b.speed * 1.85);
        b.mesh.scale.set(b.baseRadius, b.baseRadius * stretch, b.baseRadius * 0.72);
      } else {
        // Roll off the edge of the glass dome and drop under gravity!
        b.fallVelY -= 9.8 * dt;
        b.fallPos.y += b.fallVelY * dt;
        b.mesh.position.copy(b.fallPos);
        b.mesh.scale.set(b.baseRadius * 0.85, b.baseRadius * 1.8, b.baseRadius * 0.85);
        if (b.fallPos.y < -1.8) {
          b.mesh.visible = false;
        }
      }
    }
  }

  function exitUFO() {
    if (!state.localRole) return;
    const myId = getMyClientId();

    // Only allow exiting when landed (parked) and the glowing boarding stairs are down!
    if (!canExitNow()) {
      if (window.showToast) {
        if (state.phase !== 'parked') {
          window.showToast('🛸 LAND FIRST TO EXIT!', 'Press [L] to Auto-Land and deploy the glowing stairs before exiting!');
        } else {
          window.showToast('🪜 LOWER THE STAIRS FIRST!', 'Press [H] to lower the bottom hatch & stairs before stepping out!');
        }
      }
      return;
    }

    const wasPassenger = state.localRole === 'passenger';
    if (state.localRole === 'pilot') {
      state.pilotClientId = null;
      state.pilotName = null;
      state.phase = 'parked';
      state.vel.set(0, 0, 0);
      state.hatchTargetOpen = true;
    } else if (wasPassenger) {
      if (state.passengerClientId === myId) {
        state.passengerClientId = null;
        state.passengerName = null;
      }
    }
    state.localRole = null;
    state.windscreenWetTimer = 0;
    const rainCanvas = document.getElementById('ufo-windscreen-rain');
    if (rainCanvas) rainCanvas.classList.add('hidden');

    // Place player shark safely at the foot of the glowing boarding stairs!
    if (window.player) {
      window.player.inUFO = false;
      const exitX = state.pos.x + Math.sin(state.yaw) * 4.8;
      const exitZ = state.pos.z + Math.cos(state.yaw) * 4.8;
      const exitY = Math.max(0.5, getSafeGroundHeight(exitX, exitZ));
      window.player.pos.set(exitX, exitY + 0.3, exitZ);
      window.player.velY = 0;
      window.player.isGrounded = true;
      if (window.player.mesh) {
        window.player.mesh.visible = true;
        window.player.mesh.scale.set(1, 1, 1);
        window.player.mesh.rotation.set(0, state.yaw, 0);
      }
    }

    updateJetsonsEngineHum(false, 0, 0, false);
    showAvionicsHUD(false);
    if (wasPassenger && state.pilotClientId) {
      // Passenger notifies pilot via lightweight crew event without ever overwriting pilot's UFO position!
      if (window.BlahajNetwork && typeof window.BlahajNetwork.send === 'function') {
        window.BlahajNetwork.send({
          type: 'ufo_crew',
          action: 'exit_passenger',
          clientId: myId
        });
      }
    } else {
      broadcastState(true);
    }
  }

  function initiateAutoLand() {
    if (state.localRole !== 'pilot') return;
    if (state.inHyperspace) {
      if (window.BlahajGame && typeof window.BlahajGame.exitHyperspaceTo === 'function') {
        window.BlahajGame.exitHyperspaceTo('island', true);
      }
      return;
    } else if (state.inCheeseMoon) {
      if (window.BlahajGame && typeof window.BlahajGame.exitCheeseMoon === 'function') {
        window.BlahajGame.exitCheeseMoon(true);
      }
      return;
    }
    if (state.inSpace) {
      if (window.BlahajGame && typeof window.BlahajGame.exitSpaceMap === 'function') {
        window.BlahajGame.exitSpaceMap(true);
      }
      return;
    }
    state.phase = 'landing';
    state.phaseTimer = 0;
    state.orbitalCeilingReached = false;
    // If landing near Shonkbird Atoll, automatically open the secret bay & funnel onto the pad!
    const nearIsle = Math.hypot(state.pos.x - ISLE_X, state.pos.z - ISLE_Z) < 42.0;
    if (nearIsle) {
      state.hangarTargetOpen = true;
    }
    if (window.showToast) {
      window.showToast(
        nearIsle ? '🏝️ SHONKBIRD ATOLL PAD APPROACH ENGAGED' : '🛬 AUTO-LANDING SEQUENCE ACTIVE',
        nearIsle
          ? 'Opening Thunderbirds bay & funneling onto the hydraulic pad…'
          : 'Stabilizing hull, extending landing stairs & touching down softly…'
      );
    }
    broadcastState(true);
  }

  function toggleViewMode() {
    if (!state.localRole) return;
    state.viewMode = state.viewMode === 'outside' ? 'inside' : 'outside';
    if (window.showToast) {
      window.showToast(
        state.viewMode === 'inside' ? '🪟 COCKPIT INTERIOR VIEW' : '🛸 EXTERIOR FLIGHT VIEW',
        state.viewMode === 'inside'
          ? 'Looking out through the panoramic Jetsons bubble canopy!'
          : 'Third-person chase view—move mouse to orbit the saucer!'
      );
    }
    updateAvionicsButtonsUI();
  }

  function toggleFloorCam() {
    if (!state.localRole) return;
    state.floorCam = !state.floorCam;
    if (state.floorCam && state.viewMode !== 'inside') {
      state.viewMode = 'inside';
    }
    if (window.CozyAudio && window.CozyAudio.pocketWatchClick) window.CozyAudio.pocketWatchClick();
    if (window.showToast) {
      window.showToast(
        state.floorCam ? '🪟 LCD GLASS-BOTTOM FLOOR CAM: ON [G]' : '🛸 SOLID COCKPIT FLOOR: ON [G]',
        state.floorCam
          ? 'Cockpit floor switched to transparent LCD glass-bottom view (canopy arches hidden)!'
          : 'Restored solid cockpit floor & canopy arches.'
      );
    }
    updateAvionicsButtonsUI();
  }

  function toggleHatch() {
    state.hatchTargetOpen = !state.hatchTargetOpen;
    if (window.CozyAudio && window.CozyAudio.shonk) window.CozyAudio.shonk();
    updateAvionicsButtonsUI();
    broadcastState(true);
  }

  function getActiveVaultSummary() {
    if (state.subspaceVault) {
      return { icon: state.subspaceVault.icon || '🛸', title: state.subspaceVault.title || 'Captured Object' };
    }
    return state.remoteVaultSummary || null;
  }

  function playBeamCaptureChime(isRelease = false) {
    const ctx = getAudioCtx();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(isRelease ? 760 : 280, now);
      osc.frequency.exponentialRampToValueAtTime(isRelease ? 260 : 880, now + 0.42);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.12, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc.connect(gain);
      gain.connect(getUfoAudioDest(ctx));
      osc.start(now);
      osc.stop(now + 0.48);
    } catch (e) {}
  }

  function disgorgeFromSubspaceVault() {
    const item = state.subspaceVault;
    if (!item) return;
    state.subspaceVault = null;
    state.remoteVaultSummary = null;
    state.tractorBeam = false;
    state.disgorgeFlashTimer = 0.65;
    if (tractorBeamMesh) tractorBeamMesh.visible = true;

    const dropX = state.pos.x;
    const dropZ = state.pos.z;
    const dropY = getSafeGroundHeight(dropX, dropZ) + 0.45;
    const vCfg = (window.BlahajWorld && window.BlahajWorld.VOLCANO) || { x: -28.0, z: -235.0, craterRadius: 46.0 };
    const inVolcanoCrater = Math.hypot(dropX - vCfg.x, dropZ - vCfg.z) < (vCfg.craterRadius || 46.0);

    if (item.kind === 'enemy' && item.ref) {
      const e = item.ref;
      e.inSubspaceVault = false;
      e.isFlying = false;
      if (inVolcanoCrater) {
        // Animate tumbling plunge into the Molten Caldera Pool -> Eruption & Incineration!
        const startDropY = Math.max(25.0, state.pos.y - 2.0);
        if (e.mesh) {
          e.mesh.position.set(dropX, startDropY, dropZ);
          e.mesh.scale.set(1, 1, 1);
          e.mesh.visible = true;
        }
        volcanoDropAnims.push({
          kind: 'enemy',
          ref: e,
          title: item.title,
          x: dropX,
          y: startDropY,
          z: dropZ,
          vy: -4.0
        });
        playBeamCaptureChime(true);
        updateAvionicsButtonsUI();
        updateAvionicsHUD();
        broadcastState(true);
        return;
      }
      e.vel.set(0, -1.5, 0);
      e.pos.set(dropX, Math.max(dropY, state.pos.y - 2.4), dropZ);
      if (e.mesh) {
        e.mesh.position.copy(e.pos);
        e.mesh.scale.set(1, 1, 1);
        e.mesh.rotation.set(0, e.rotY || 0, 0);
        e.mesh.visible = true;
      }
      if (e.labelEl) e.labelEl.style.display = '';
    } else if (item.kind === 'beach_ball' && item.ref) {
      const bb = item.ref;
      bb.inSubspaceVault = false;
      if (inVolcanoCrater) {
        const startDropY = Math.max(25.0, state.pos.y - 2.0);
        if (bb.mesh) {
          bb.mesh.position.set(dropX, startDropY, dropZ);
          bb.mesh.scale.set(1, 1, 1);
          bb.mesh.visible = true;
        }
        volcanoDropAnims.push({ kind: 'beach_ball', ref: bb, title: item.title, x: dropX, y: startDropY, z: dropZ, vy: -4.0 });
        playBeamCaptureChime(true);
        updateAvionicsButtonsUI();
        updateAvionicsHUD();
        broadcastState(true);
        return;
      }
      bb.vel.set((Math.random() - 0.5) * 4.0, 0, (Math.random() - 0.5) * 4.0);
      if (bb.mesh) {
        bb.mesh.position.set(dropX, dropY + 0.4, dropZ);
        bb.mesh.scale.set(1, 1, 1);
        bb.mesh.visible = true;
      }
    } else if (item.kind === 'carrot' && item.ref) {
      const c = item.ref;
      c.inSubspaceVault = false;
      if (inVolcanoCrater) {
        const startDropY = Math.max(25.0, state.pos.y - 2.0);
        if (c.mesh) {
          c.mesh.position.set(dropX, startDropY, dropZ);
          c.mesh.scale.set(1, 1, 1);
          c.mesh.visible = true;
        }
        volcanoDropAnims.push({ kind: 'carrot', ref: c, title: item.title, x: dropX, y: startDropY, z: dropZ, vy: -4.0 });
        playBeamCaptureChime(true);
        updateAvionicsButtonsUI();
        updateAvionicsHUD();
        broadcastState(true);
        return;
      }
      c.knockedOff = true;
      c.respawnTimer = 14.0;
      c.vel.set((Math.random() - 0.5) * 3.0, 2.0, (Math.random() - 0.5) * 3.0);
      if (c.mesh) {
        c.mesh.position.set(dropX, dropY + 0.3, dropZ);
        c.mesh.scale.set(1, 1, 1);
        c.mesh.visible = true;
      }
    }

    playBeamCaptureChime(true);
    if (window.showToast) {
      window.showToast(`${item.icon} SUBSPACE VAULT DISGORGED!`, `Released ${item.title} directly beneath the saucer!`);
    }
    updateAvionicsButtonsUI();
    updateAvionicsHUD();
    broadcastState(true);
  }

  function openSharedVault() {
    if (window.BlahajGame && typeof window.BlahajGame.openCommunityTrunkModal === 'function') {
      window.BlahajGame.openCommunityTrunkModal();
    }
  }

  function toggleTractorBeam() {
    if (state.beamingTarget) return; // Wait for current capture animation (~0.75s) to finish
    if (activeModuleIdx !== 0) {
      selectModule(0);
    }
    if (state.subspaceVault) {
      disgorgeFromSubspaceVault();
      return;
    }
    state.tractorBeam = !state.tractorBeam;
    if (tractorBeamMesh) tractorBeamMesh.visible = state.tractorBeam;
    if (window.CozyAudio && window.CozyAudio.portalChime) window.CozyAudio.portalChime();
    updateAvionicsButtonsUI();
    broadcastState(true);
  }

  function toggleDiscoMode() {
    state.discoMode = !state.discoMode;
    playJetsonsHorn();
    updateAvionicsButtonsUI();
    broadcastState(true);
  }

  function getSafeGroundHeight(x, z) {
    let gy = -28.0;
    if (window.BlahajWorld && typeof window.BlahajWorld.getGroundAndStructureHeight === 'function') {
      gy = window.BlahajWorld.getGroundAndStructureHeight(x, z);
    }
    const isleY = getSurfaceHeight(x, z);
    if (isleY > gy) gy = isleY;
    return gy;
  }

  // Autopilot & Summoning NEVER land below the ocean surface (pilot must intentionally dive!)
  function getSafeLandingHeight(x, z) {
    return Math.max(0.22, getSafeGroundHeight(x, z));
  }

  // Compute UFO hull center Y so the boarding ring at the bottom of the stairs (-2.10m)
  // sits cleanly on top of the highest terrain/water surface beneath the saucer & stair foot.
  function getSaucerTouchdownY(x, z, yaw = state.yaw) {
    const centerY = getSafeLandingHeight(x, z);
    const stairX = x + Math.sin(yaw) * 3.7;
    const stairZ = z + Math.cos(yaw) * 3.7;
    const stairY = getSafeLandingHeight(stairX, stairZ);
    const rearX = x - Math.sin(yaw) * 2.5;
    const rearZ = z - Math.cos(yaw) * 2.5;
    const rearY = getSafeLandingHeight(rearX, rearZ);
    return Math.max(centerY, stairY, rearY) + 2.16;
  }

  // ==========================================================================
  // 5. NETWORK CO-OP SYNC (PILOT -> ALL PEERS)
  // ==========================================================================
  function broadcastState(force = false) {
    if (!window.BlahajNetwork || typeof window.BlahajNetwork.send !== 'function') return;
    const myId = getMyClientId();
    // A passenger NEVER broadcasts UFO transform over an active pilot (prevents two-way rubberbanding!)
    if (state.localRole === 'passenger' && state.pilotClientId && state.pilotClientId !== myId) {
      if (force) {
        window.BlahajNetwork.send({
          type: 'ufo_crew',
          action: 'board_passenger',
          clientId: myId,
          name: state.passengerName || 'Co-Pilot'
        });
      }
      return;
    }
    const now = Date.now();
    // Mobile-friendly 10Hz smooth sync (100ms) when actively piloting, and delta-skip when parked & idle!
    if (!force && now - state.lastNetSendAt < 100) return;
    const isParked = state.phase === 'parked';
    if (!force && isParked && state.lastBroadcastParkedPos) {
      const dxP = Math.abs(state.pos.x - state.lastBroadcastParkedPos.x);
      const dyP = Math.abs(state.pos.y - state.lastBroadcastParkedPos.y);
      const dzP = Math.abs(state.pos.z - state.lastBroadcastParkedPos.z);
      if (dxP < 0.02 && dyP < 0.02 && dzP < 0.02 && now - state.lastNetSendAt < 2500) {
        return;
      }
    }
    state.lastNetSendAt = now;
    state.lastBroadcastParkedPos = isParked ? { x: state.pos.x, y: state.pos.y, z: state.pos.z } : null;
    window.BlahajNetwork.send({
      type: 'ufo_state',
      _force: !!force,
      senderId: myId,
      seq: ++state.netSeq,
      isPilotAuth: state.localRole === 'pilot',
      x: Number(state.pos.x.toFixed(2)),
      y: Number(state.pos.y.toFixed(2)),
      z: Number(state.pos.z.toFixed(2)),
      vx: isParked ? 0 : Number(state.vel.x.toFixed(2)),
      vy: isParked ? 0 : Number(state.vel.y.toFixed(2)),
      vz: isParked ? 0 : Number(state.vel.z.toFixed(2)),
      yaw: Number(state.yaw.toFixed(3)),
      pitch: Number(state.pitch.toFixed(3)),
      roll: Number(state.roll.toFixed(3)),
      phase: state.phase,
      hangarTargetOpen: state.hangarTargetOpen,
      hatchTargetOpen: state.hatchTargetOpen,
      tractorBeam: state.tractorBeam,
      activeModuleIdx,
      discoMode: state.discoMode,
      turboActive: state.turboActive,
      pilotClientId: state.pilotClientId,
      pilotName: state.pilotName,
      passengerClientId: state.passengerClientId,
      passengerName: state.passengerName,
      warpChargeTimer: Number((state.warpChargeTimer || 0).toFixed(2)),
      inSpace: !!state.inSpace,
      spaceThrottle: Number((state.spaceThrottle || 0).toFixed(2)),
      hullHp: Math.round(state.hullHp ?? 100),
      shieldHp: Math.round(state.shieldHp ?? 100),
      qx: Number(state.spaceQuat.x.toFixed(4)),
      qy: Number(state.spaceQuat.y.toFixed(4)),
      qz: Number(state.spaceQuat.z.toFixed(4)),
      qw: Number(state.spaceQuat.w.toFixed(4)),
      vaultSummary: getActiveVaultSummary()
    });
  }

  function handleNetworkPacket(data) {
    if (!data) return;
    const myId = getMyClientId();

    // Lightweight passenger crew notifications (never touch UFO position!)
    if (data.type === 'ufo_crew') {
      if (data.clientId === myId) return;
      if (data.action === 'board_passenger') {
        state.passengerClientId = data.clientId || null;
        state.passengerName = data.name || 'Co-Pilot';
        if (state.localRole === 'pilot') broadcastState(true);
      } else if (data.action === 'exit_passenger') {
        if (!data.clientId || state.passengerClientId === data.clientId) {
          state.passengerClientId = null;
          state.passengerName = null;
        }
        if (state.localRole === 'pilot') broadcastState(true);
      }
      return;
    }

    if (data.type !== 'ufo_state') return;
    if (data.senderId && data.senderId === myId) return;

    // Active local pilot is strictly authoritative for UFO position/orientation!
    if (state.localRole === 'pilot') {
      if (data.passengerClientId && data.passengerClientId !== myId) {
        state.passengerClientId = data.passengerClientId;
        state.passengerName = data.passengerName || 'Co-Pilot';
      }
      return;
    }

    // Strictly drop any out-of-order or duplicate packets from the same sender (prevents delayed MQTT broker bursts from snapping UFO backwards!)
    const pktSender = data.senderId || data.clientId || null;
    if (pktSender && pktSender !== state.lastRemoteSenderId) {
      state.lastRemoteSenderId = pktSender;
      state.lastRemoteSeq = -1;
    }
    if (typeof data.seq === 'number') {
      if (data.seq <= state.lastRemoteSeq) return;
      state.lastRemoteSeq = data.seq;
    }

    state.lastRemotePacketAt = Date.now();
    state.hasRemoteSync = true;
    state.remoteVaultSummary = data.vaultSummary || null;

    if (typeof data.x === 'number' && typeof data.y === 'number' && typeof data.z === 'number') {
      state.remoteTargetPos.set(data.x, data.y, data.z);
      state.remoteSnapshots.push({
        t: performance.now(),
        x: data.x,
        y: data.y,
        z: data.z,
        yaw: typeof data.yaw === 'number' ? data.yaw : state.remoteTargetYaw,
        pitch: typeof data.pitch === 'number' ? data.pitch : state.remoteTargetPitch,
        roll: typeof data.roll === 'number' ? data.roll : state.remoteTargetRoll
      });
      if (state.remoteSnapshots.length > 18) {
        state.remoteSnapshots.splice(0, state.remoteSnapshots.length - 18);
      }
    }
    if (typeof data.vx === 'number' && typeof data.vy === 'number' && typeof data.vz === 'number') {
      state.remoteTargetVel.set(data.vx, data.vy, data.vz);
    } else {
      state.remoteTargetVel.set(0, 0, 0);
    }
    if (typeof data.yaw === 'number') state.remoteTargetYaw = data.yaw;
    if (typeof data.pitch === 'number') state.remoteTargetPitch = data.pitch;
    if (typeof data.roll === 'number') state.remoteTargetRoll = data.roll;
    if (typeof data.qx === 'number' && typeof data.qy === 'number' && typeof data.qz === 'number' && typeof data.qw === 'number') {
      state.remoteTargetQuat.set(data.qx, data.qy, data.qz, data.qw).normalize();
    }
    if (typeof data.spaceThrottle === 'number') {
      state.spaceThrottle = data.spaceThrottle;
    }
    if (typeof data.hullHp === 'number') state.hullHp = data.hullHp;
    if (typeof data.shieldHp === 'number') state.shieldHp = data.shieldHp;
    if (data.phase) state.phase = data.phase;
    if (typeof data.hangarTargetOpen === 'boolean') state.hangarTargetOpen = data.hangarTargetOpen;
    if (typeof data.hatchTargetOpen === 'boolean') state.hatchTargetOpen = data.hatchTargetOpen;
    if (typeof data.activeModuleIdx === 'number' && saucerModules.length) {
      const clampedMod = ((data.activeModuleIdx % saucerModules.length) + saucerModules.length) % saucerModules.length;
      if (clampedMod !== activeModuleIdx) {
        activeModuleIdx = clampedMod;
        if (typeof renderModuleBelt === 'function') renderModuleBelt();
        updateAvionicsButtonsUI();
      }
    }
    if (typeof data.tractorBeam === 'boolean') {
      state.tractorBeam = data.tractorBeam;
      if (tractorBeamMesh) tractorBeamMesh.visible = state.tractorBeam;
    }
    if (typeof data.discoMode === 'boolean') state.discoMode = data.discoMode;
    if (typeof data.turboActive === 'boolean') state.turboActive = data.turboActive;
    if (typeof data.warpChargeTimer === 'number') state.warpChargeTimer = data.warpChargeTimer;
    state.pilotClientId = data.pilotClientId || null;
    state.pilotName = data.pilotName || null;
    if (state.localRole !== 'passenger') {
      state.passengerClientId = data.passengerClientId || null;
      state.passengerName = data.passengerName || null;
    }
  }

  // ==========================================================================
  // 6. SUPER-MODERN GLASS-COCKPIT AVIONICS HUD + ARTIFICIAL HORIZON CANVAS
  // ==========================================================================
  function isAutoChaseCamEnabled() {
    if (window.gameSettings && typeof window.gameSettings.ufoAutoChaseCam === 'boolean') {
      return window.gameSettings.ufoAutoChaseCam;
    }
    return true;
  }

  function toggleAutoChaseCam() {
    const next = !isAutoChaseCamEnabled();
    if (typeof window.applyGameSetting === 'function') {
      window.applyGameSetting('ufoAutoChaseCam', next);
    } else if (window.gameSettings) {
      window.gameSettings.ufoAutoChaseCam = next;
    }
    if (window.showToast) {
      window.showToast(
        next ? '🎥 UFO AUTO-CHASE CAM: ON' : '🎥 UFO FREE ORBIT CAM: ON',
        next
          ? 'Camera turns with A/D and smoothly drifts back behind the saucer!'
          : 'Camera stays in manual free-orbit until you move it.'
      );
    }
    updateAvionicsButtonsUI();
  }

  // ==========================================================================
  // 2B. DEPLOYABLE EXTERIOR SAUCER MODULES (HARDPOINT SOCKET REGISTRY)
  // ==========================================================================
  function buildSaucerModules(chromeMat, hullMintMat, darkConsoleMat) {
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xd8aa5b, metalness: 0.85, roughness: 0.24 });
    const glowGreen = new THREE.MeshBasicMaterial({ color: 0x34d399 });
    const glowCyan = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const glowViolet = new THREE.MeshBasicMaterial({ color: 0xc084fc, transparent: true, opacity: 0.88, side: THREE.DoubleSide });
    const glowPink = new THREE.MeshBasicMaterial({ color: 0xf472b6 });

    // 1. Ventral Tractor Beam Emitter (sockets.belly) — Chunky Cartoony Bell!
    const tractorRoot = new THREE.Group();
    const tRing = new THREE.Mesh(new THREE.TorusGeometry(1.45, 0.22, 12, 24), chromeMat);
    tRing.rotation.x = Math.PI / 2;
    const tCore = new THREE.Mesh(new THREE.CylinderGeometry(0.82, 1.18, 0.85, 16), glowGreen);
    tCore.position.y = -0.35;
    tractorRoot.add(tRing, tCore);
    if (sockets.belly) sockets.belly.add(tractorRoot);

    // 2. Twin Retro Ray-Gun Plasma Turrets (sockets.portWing + sockets.starboardWing) — Oversized Jetsons Blasters!
    const turretL = new THREE.Group();
    const turretR = new THREE.Group();
    const buildRayGun = (root) => {
      const housing = new THREE.Mesh(new THREE.SphereGeometry(0.62, 14, 10), chromeMat);
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.26, 2.25, 12), brassMat);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.z = 1.15;
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), glowCyan);
      tip.position.z = 2.32;
      const ring1 = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.07, 8, 18), glowPink);
      ring1.position.z = 1.35;
      const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.06, 8, 18), glowPink);
      ring2.position.z = 1.85;
      root.add(housing, barrel, tip, ring1, ring2);
    };
    buildRayGun(turretL);
    buildRayGun(turretR);
    if (sockets.portWing) sockets.portWing.add(turretL);
    if (sockets.starboardWing) sockets.starboardWing.add(turretR);

    // 3. Classic Cartoony Parabolic Radar Dish (sockets.dorsalRack) — Lathe Bowl + Pointy Center Stem + 2 Floating Color-Shifting Rings!
    const radarRoot = new THREE.Group();
    const rMast = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 0.85, 12), chromeMat);
    rMast.position.y = 0.42;
    radarRoot.add(rMast);

    const radarDishHead = new THREE.Group();
    radarDishHead.position.set(0, 1.15, 0.05);
    // Tilt dish slightly upward & forward so the classic parabolic bowl opens cleanly into the sky!
    radarDishHead.rotation.x = Math.PI * 0.38;

    const dishPts = [];
    for (let i = 0; i <= 10; i++) {
      const u = i / 10;
      const rad = u * 1.48;
      const depth = u * u * 0.62; // Classic parabolic curve (concave front face, convex back!)
      dishPts.push(new THREE.Vector2(rad, depth));
    }
    const dishMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.78,
      roughness: 0.22,
      side: THREE.DoubleSide
    });
    const rDish = new THREE.Mesh(new THREE.LatheGeometry(dishPts, 24), dishMat);
    const rDishRim = new THREE.Mesh(new THREE.TorusGeometry(1.48, 0.09, 10, 28), brassMat);
    rDishRim.rotation.x = Math.PI / 2;
    rDishRim.position.y = 0.62;

    // Pointy cartoony center stem sticking straight out from the core of the dish!
    const rStem = new THREE.Mesh(new THREE.ConeGeometry(0.16, 1.35, 12), brassMat);
    rStem.position.y = 0.72;
    const rTipMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const rTipOrb = new THREE.Mesh(new THREE.SphereGeometry(0.20, 12, 10), rTipMat);
    rTipOrb.position.y = 1.42;

    // Two little floating rings orbiting around the pointy stem that change color when active!
    const rRingMat1 = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const rRingMat2 = new THREE.MeshBasicMaterial({ color: 0x7dd3fc });
    const rFloatRing1 = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.055, 10, 24), rRingMat1);
    rFloatRing1.rotation.x = Math.PI / 2;
    rFloatRing1.position.y = 0.82;
    const rFloatRing2 = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.048, 10, 24), rRingMat2);
    rFloatRing2.rotation.x = Math.PI / 2;
    rFloatRing2.position.y = 1.15;

    radarDishHead.add(rDish, rDishRim, rStem, rTipOrb, rFloatRing1, rFloatRing2);
    radarRoot.add(radarDishHead);
    if (sockets.dorsalRack) sockets.dorsalRack.add(radarRoot);

    // 4. Mojo Hyperdrive Warp Fins (sockets.rearNacelles) — Unfurl cleanly OUTBOARD of the twin rocket nacelles (zero clipping!)
    const hyperRoot = new THREE.Group();
    [-1, 1].forEach((side) => {
      // Glowing warp ring encircling each nacelle pod (at x = ±4.5)
      const nacelleRing = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.11, 10, 22), glowViolet);
      nacelleRing.position.set(side * 4.5, -0.05, 0.45);
      // Swept cartoony energy wing extending cleanly outboard (x = ±5.1..±8.7)
      const wing = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.22, 2.0), glowViolet);
      wing.position.set(side * 6.45, 0.35, -0.45);
      wing.rotation.z = side * 0.22;
      wing.rotation.y = side * -0.26;
      const trim = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.26, 0.32), chromeMat);
      trim.position.set(side * 6.45, 0.35, 0.52);
      trim.rotation.z = side * 0.22;
      trim.rotation.y = side * -0.26;
      const pod = new THREE.Mesh(new THREE.SphereGeometry(0.46, 12, 10), glowPink);
      pod.position.set(side * 8.15, 0.72, -0.92);
      hyperRoot.add(nacelleRing, wing, trim, pod);
    });
    if (sockets.rearNacelles) sockets.rearNacelles.add(hyperRoot);

    // 5. Disco Mirrorball & Sonic Megaphone Dome (sockets.dorsalRack) — Bold Retro Party Rig cleanly above canopy!
    const discoRoot = new THREE.Group();
    const dMast = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 1.15, 10), chromeMat);
    dMast.position.y = 0.58;
    const dBall = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.84, 1),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.95, roughness: 0.08, emissive: 0x38bdf8, emissiveIntensity: 0.45 })
    );
    dBall.position.y = 1.65;
    const dHorn = new THREE.Mesh(new THREE.ConeGeometry(0.52, 1.15, 14, 1, true), brassMat);
    dHorn.rotation.x = -Math.PI / 2;
    dHorn.position.set(0, 0.92, 0.68);
    discoRoot.add(dMast, dBall, dHorn);
    if (sockets.dorsalRack) sockets.dorsalRack.add(discoRoot);

    saucerModules = [
      {
        id: 'tractor',
        icon: '🟢',
        name: 'Tractor Beam',
        usesDorsal: false,
        prog: 1,
        meshes: [tractorRoot],
        animate: (p, t) => {
          // Tuck flush when parked with stairs down so it never clips the glowing stairs!
          const effP = (state.phase === 'parked' && state.hatchOpenProg > 0.15) ? p * 0.25 : p;
          tractorRoot.visible = effP > 0.02;
          tractorRoot.position.y = -0.45 * effP;
          tractorRoot.scale.setScalar(Math.max(0.01, effP));
          tRing.rotation.z = t * 2.2;
        },
        activate: () => toggleTractorBeam()
      },
      {
        id: 'turrets',
        icon: '🔫',
        name: 'Ray Turrets',
        usesDorsal: false,
        prog: 0,
        meshes: [turretL, turretR],
        animate: (p) => {
          const vis = p > 0.02;
          turretL.visible = vis;
          turretR.visible = vis;
          turretL.position.x = -0.65 * p;
          turretR.position.x = 0.65 * p;
          turretL.scale.setScalar(Math.max(0.01, p));
          turretR.scale.setScalar(Math.max(0.01, p));
        },
        activate: () => firePlasmaTurrets()
      },
      {
        id: 'radar',
        icon: '📡',
        name: 'Aetheric Radar',
        usesDorsal: true,
        prog: 0,
        meshes: [radarRoot],
        animate: (p, t) => {
          radarRoot.visible = p > 0.02;
          radarRoot.position.y = -0.6 + 0.6 * p;
          radarRoot.scale.setScalar(Math.max(0.01, p));
          radarRoot.rotation.y = t * 1.4;
          // Float the 2 rings gently around the pointy center stem & shift color when radar ping is active!
          const pingActive = performance.now() < (state.radarStatusUntil || 0);
          rFloatRing1.position.y = 0.80 + Math.sin(t * 4.5) * 0.08;
          rFloatRing2.position.y = 1.15 + Math.cos(t * 5.2) * 0.08;
          rFloatRing1.rotation.z = t * 2.4;
          rFloatRing2.rotation.z = -t * 3.1;
          if (pingActive) {
            const flash = Math.sin(t * 14.0) > 0;
            rRingMat1.color.setHex(flash ? 0x34d399 : 0xfbbf24);
            rRingMat2.color.setHex(flash ? 0xfbbf24 : 0x34d399);
            rTipMat.color.setHex(0xfbbf24);
          } else {
            rRingMat1.color.setHex(0x38bdf8);
            rRingMat2.color.setHex(0x7dd3fc);
            rTipMat.color.setHex(0x38bdf8);
          }
        },
        activate: () => pulseAethericRadar()
      },
      {
        id: 'hyperdrive',
        icon: '⚡',
        name: 'Mojo Hyperdrive',
        usesDorsal: false,
        prog: 0,
        meshes: [hyperRoot],
        animate: (p) => {
          hyperRoot.visible = p > 0.02;
          hyperRoot.scale.set(Math.max(0.01, p), Math.max(0.01, p), Math.max(0.01, p));
        },
        activate: () => triggerMojoHyperdrive()
      },
      {
        id: 'disco',
        icon: '🪩',
        name: 'Disco & Sonic',
        usesDorsal: true,
        prog: 0,
        meshes: [discoRoot],
        animate: (p, t) => {
          discoRoot.visible = p > 0.02;
          discoRoot.position.y = -0.55 + 0.55 * p;
          discoRoot.scale.setScalar(Math.max(0.01, p));
          dBall.rotation.y = t * 2.6;
        },
        activate: () => {
          toggleDiscoMode();
          spawnRadarWave(0xf472b6, 48);
        }
      }
    ];

    saucerModules.forEach((m, idx) => m.animate(idx === 0 ? 1 : 0, 0));
    renderModuleBelt();
  }

  function renderModuleBelt() {
    const belt = document.getElementById('ufo-module-belt');
    if (!belt || !saucerModules.length) return;
    belt.innerHTML = saucerModules.map((m, i) => (
      `<button type="button" class="ufo-module-slot${i === activeModuleIdx ? ' active' : ''}" data-ufomod="${i}" title="[${i + 1}] ${m.name} (Left-Click to fire/activate)">` +
        `<span class="ufo-mod-key">${i + 1}</span>` +
        `<span class="ufo-mod-icon">${m.icon}</span>` +
        `<span>${m.name}</span>` +
      `</button>`
    )).join('');
    belt.querySelectorAll('.ufo-module-slot').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        selectModule(parseInt(btn.dataset.ufomod, 10));
      });
    });
  }

  function selectModule(idx) {
    if (!saucerModules.length) return;
    const clamped = ((idx % saucerModules.length) + saucerModules.length) % saucerModules.length;
    if (clamped === activeModuleIdx) return;
    activeModuleIdx = clamped;
    state.activeModuleIdx = clamped;
    // Enforce strict single-system exclusivity: switching away from Tractor Beam (0) immediately shuts off the beam!
    if (activeModuleIdx !== 0 && state.tractorBeam) {
      state.tractorBeam = false;
      if (tractorBeamMesh) tractorBeamMesh.visible = false;
      updateAvionicsButtonsUI();
    } else if (activeModuleIdx === 0 && state.inCheeseMoon && !state.tractorBeam) {
      // On the Cheese Moon, switching to [1] Tractor Beam automatically activates the beam cone for easy Core Power-Up hauling!
      state.tractorBeam = true;
      if (tractorBeamMesh) tractorBeamMesh.visible = true;
      updateAvionicsButtonsUI();
    }
    broadcastState(true);
    renderModuleBelt();
    if (window.CozyAudio && window.CozyAudio.pocketWatchClick) window.CozyAudio.pocketWatchClick();
    const mod = saucerModules[activeModuleIdx];
    if (window.showToast && mod) {
      window.showToast(`${mod.icon} ${mod.name.toUpperCase()} DEPLOYED`, 'Left-Click anywhere to activate · Hold Right-Click + Scroll to swap appendages!');
    }
  }

  function cycleModule(delta) {
    selectModule(activeModuleIdx + (delta > 0 ? 1 : -1));
  }

  function activateActiveModule() {
    if (!state.localRole || !saucerModules.length) return;
    if (window.BlahajGame && typeof window.BlahajGame.isCurrentInstancePaused === 'function' && window.BlahajGame.isCurrentInstancePaused()) {
      return;
    }
    const mod = saucerModules[activeModuleIdx];
    if (mod && typeof mod.activate === 'function') {
      mod.activate();
    }
  }

  const PLASMA_PALETTE = [
    { core: 0xffffff, halo: 0x38bdf8, flash: 0x7dd3fc }, // Electric Cyan
    { core: 0xffffff, halo: 0xf43f5e, flash: 0xfda4af }, // Hyper Magenta-Rose
    { core: 0xffffff, halo: 0xfacc15, flash: 0xfef08a }, // Solar Gold
    { core: 0xffffff, halo: 0x4ade80, flash: 0x86efac }, // Neon Emerald
    { core: 0xffffff, halo: 0xc084fc, flash: 0xe9d5ff }  // Cosmic Violet
  ];

  function spawnPlasmaImpactBurst(sceneTarget, worldPos, hexColor = 0x38bdf8) {
    if (!sceneTarget || !worldPos) return;
    const flashRing = new THREE.Mesh(
      new THREE.RingGeometry(0.35, 1.45, 24),
      new THREE.MeshBasicMaterial({ color: hexColor, transparent: true, opacity: 0.95, side: THREE.DoubleSide, depthWrite: false })
    );
    flashRing.position.copy(worldPos);
    flashRing.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
    sceneTarget.add(flashRing);
    ufoRadarWaves.push({ mesh: flashRing, age: 0, maxAge: 0.26, maxScale: 4.8 });

    const coreFlash = new THREE.Mesh(
      new THREE.SphereGeometry(0.85, 10, 8),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95, depthWrite: false })
    );
    coreFlash.position.copy(worldPos);
    sceneTarget.add(coreFlash);
    ufoRadarWaves.push({ mesh: coreFlash, age: 0, maxAge: 0.18, maxScale: 2.6 });
  }

  function firePlasmaTurrets() {
    const activeScene = ufoGroup ? ufoGroup.parent : null;
    if (!activeScene || !sockets.portWing || !sockets.starboardWing) return;
    if (state.turretFireCooldown > 0) return;
    state.turretFireCooldown = 0.115; // ~8.7 salvos/sec rapid continuous fire!
    state.turretShotCount = (state.turretShotCount || 0) + 1;

    ufoGroup.updateMatrixWorld(true);
    // Extract true 3D ship forward vector (+Z of ufoGroup in world space, honoring 3D pitch, yaw & barrel roll!)
    const shipQuat = new THREE.Quaternion();
    ufoGroup.getWorldQuaternion(shipQuat);
    const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(shipQuat).normalize();

    [sockets.portWing, sockets.starboardWing].forEach((sock, idx) => {
      const origin = new THREE.Vector3(0, 0, 2.35);
      sock.localToWorld(origin);
      const pal = PLASMA_PALETTE[(state.turretShotCount + idx * 2) % PLASMA_PALETTE.length];

      const boltGroup = new THREE.Group();
      boltGroup.position.copy(origin);
      boltGroup.lookAt(origin.clone().add(fwd));

      // Brilliant white-hot inner plasma core
      const coreMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.16, 3.4, 8),
        new THREE.MeshBasicMaterial({ color: pal.core })
      );
      coreMesh.rotation.x = Math.PI * 0.5;
      boltGroup.add(coreMesh);

      // Vivid colorful outer neon plasma sheath
      const haloMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.42, 0.28, 4.2, 10),
        new THREE.MeshBasicMaterial({ color: pal.halo, transparent: true, opacity: 0.78, depthWrite: false })
      );
      haloMesh.rotation.x = Math.PI * 0.5;
      boltGroup.add(haloMesh);

      // Trailing star-spark orb
      const tipOrb = new THREE.Mesh(
        new THREE.SphereGeometry(0.46, 8, 8),
        new THREE.MeshBasicMaterial({ color: pal.flash, transparent: true, opacity: 0.9, depthWrite: false })
      );
      tipOrb.position.z = 1.6;
      boltGroup.add(tipOrb);

      activeScene.add(boltGroup);
      ufoPlasmaBolts.push({
        mesh: boltGroup,
        vel: fwd.clone().multiplyScalar(118.0),
        colorHex: pal.halo,
        life: 1.75
      });

      // Loud, bright 3D muzzle flash shock-ring right at the barrel tip!
      const muzzleRing = new THREE.Mesh(
        new THREE.RingGeometry(0.22, 0.72, 18),
        new THREE.MeshBasicMaterial({ color: pal.flash, transparent: true, opacity: 0.95, side: THREE.DoubleSide, depthWrite: false })
      );
      muzzleRing.position.copy(origin);
      muzzleRing.lookAt(origin.clone().add(fwd));
      activeScene.add(muzzleRing);
      ufoRadarWaves.push({ mesh: muzzleRing, age: 0, maxAge: 0.16, maxScale: 3.1 });
    });

    playPlasmaLaserPew(state.turretShotCount);
  }

  function spawnRadarWave(hexColor = 0x38bdf8, maxScale = 65) {
    const sceneRef = ufoGroup ? ufoGroup.parent : null;
    if (!sceneRef) return;
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.85, 1.15, 36),
      new THREE.MeshBasicMaterial({ color: hexColor, transparent: true, opacity: 0.9, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(state.pos.x, state.pos.y + 0.5, state.pos.z);
    sceneRef.add(ring);
    ufoRadarWaves.push({ mesh: ring, age: 0, maxAge: 1.35, maxScale });
  }

  function pulseAethericRadar() {
    spawnRadarWave(0x38bdf8, 72);
    if (window.CozyAudio && window.CozyAudio.portalChime) window.CozyAudio.portalChime();
    let pingSummary = 'All sectors calm';
    if (state.inSpace && state.inCheeseMoon && window.BlahajCheeseMoon && typeof window.BlahajCheeseMoon.onAethericRadarScan === 'function') {
      spawnRadarWave(0xfacc15, 96);
      pingSummary = window.BlahajCheeseMoon.onAethericRadarScan(state.pos) || 'Scanning Swiss Cheese Planetoid trenches…';
    } else if (window.BlahajSeam && typeof window.BlahajSeam.getNearestRift === 'function') {
      const r = window.BlahajSeam.getNearestRift(state.pos, 'island');
      if (r && r.nearest) {
        const dx = r.nearest.pos.x - state.pos.x;
        const dz = r.nearest.pos.z - state.pos.z;
        const deg = Math.round((Math.atan2(-dx, -dz) * 180 / Math.PI + 360) % 360);
        pingSummary = `Nearest Rift: ${r.nearest.name} (${Math.round(r.nearest.dist)}m · HDG ${deg}°)`;
      }
    }
    state.radarStatusText = `📡 RADAR PING: ${pingSummary}`;
    state.radarStatusUntil = performance.now() + 5000;
    if (window.showToast) {
      window.showToast('📡 AETHERIC RADAR PULSE', pingSummary);
    }
  }

  function triggerMojoHyperdrive() {
    if (state.inHyperspace) return;
    if (state.inSpace && (state.inCheeseMoon || (window.BlahajSpace && window.BlahajSpace.getSectorStatus && (window.BlahajSpace.getSectorStatus().waveCleared || window.BlahajSpace.getSectorStatus().remainingRocks === 0)))) {
      if (window.BlahajGame && typeof window.BlahajGame.enterHyperspace === 'function') {
        window.BlahajGame.enterHyperspace(true);
        return;
      }
    }
    state.hyperdriveTimer = 9.0;
    playJetsonsHorn();
    spawnRadarWave(0xc084fc, 28);
    if (window.showToast) {
      if (state.inSpace) {
        window.showToast('⚡ DEEP-SPACE HYPERDRIVE SURGE!', '9s orbital boost active! Clear all asteroids to unlock Mojo Hyperspace Crossroads!');
      } else {
        window.showToast('⚡ MOJO HYPERDRIVE READY!', 'Climb into the upper atmosphere (145m–185m) and hold [Shift] + [W] for 6 seconds to jump to Deep Space!');
      }
    }
  }

  function showAvionicsHUD(visible) {
    const hud = document.getElementById('ufo-avionics-hud');
    if (hud) hud.classList.toggle('hidden', !visible);
    if (document.body) {
      document.body.classList.toggle('ufo-flight-mode', !!visible);
      document.body.classList.toggle('ufo-space-mode', !!(visible && state.inSpace));
    }
    if (visible) updateAvionicsButtonsUI();
  }

  function adjustSpaceThrottle(delta) {
    if (!state.inSpace || state.localRole !== 'pilot') return;
    let next = Math.max(-0.30, Math.min(1.0, (state.spaceThrottle || 0) + delta));
    // Gentle zero-detent snap so scrolling through 0% lets you easily park/hover!
    if (Math.abs(next) < 0.045) next = 0;
    state.spaceThrottle = next;
    updateAvionicsHUD();
  }

  function applySpaceMouseLook(dx, dy) {
    if (!state.inSpace || state.localRole !== 'pilot') return;
    state.spaceMouseDx += dx;
    state.spaceMouseDy += dy;
  }

  function panSpaceCamera(dx, dy) {
    if (!state.inSpace || !state.localRole) return;
    state.spacePanYaw = Math.max(-2.6, Math.min(2.6, (state.spacePanYaw || 0) - dx * 0.0045));
    state.spacePanPitch = Math.max(-1.15, Math.min(1.15, (state.spacePanPitch || 0) + dy * 0.0038));
  }

  function respawnCrewInIkeaAfterDestruction() {
    state.hullHp = state.maxHullHp;
    state.shieldHp = state.maxShieldHp;
    state.shieldRegenDelay = 0;
    state.impactCooldown = 0;
    exitUFO();
    resetToTracyIsle();
    if (window.BlahajGame && typeof window.BlahajGame.exitSpaceMap === 'function') {
      window.BlahajGame.exitSpaceMap(false);
    }
    if (window.CozyAudio && window.CozyAudio.trapHit) window.CozyAudio.trapHit();
    if (window.showToast) {
      window.showToast(
        '💥🛸 HULL BREACH — EMERGENCY IKEA RECALL!',
        'S.S. Shonk-Saucer was overwhelmed by space rocks! Both sharks beamed to the IKEA Spawning Pits!'
      );
    }
    setTimeout(() => {
      if (window.BlahajGame && typeof window.BlahajGame.enterSpawningPits === 'function') {
        window.BlahajGame.enterSpawningPits(false);
      }
    }, 320);
  }

  function handleDestroyedFromNetwork() {
    if (!state.localRole) return;
    respawnCrewInIkeaAfterDestruction();
  }

  function applyImpactDamage(rawDamage, sourceLabel = 'Asteroid Impact', isMonolith = false) {
    if (!state.localRole || state.impactCooldown > 0) return;
    state.impactCooldown = 0.38;
    state.shieldRegenDelay = 3.5;

    let hullDmg = 0;
    let shieldDmg = 0;
    if (state.shieldHp > 0) {
      // Gravitronic force fields absorb 75% of incoming impact energy!
      shieldDmg = Math.min(state.shieldHp, rawDamage * 0.85);
      state.shieldHp = Math.max(0, state.shieldHp - shieldDmg);
      hullDmg = rawDamage * 0.25;
      if (state.shieldHp <= 0 && rawDamage > shieldDmg) {
        hullDmg += (rawDamage - shieldDmg) * 0.5;
      }
    } else {
      hullDmg = rawDamage;
    }

    state.hullHp = Math.max(0, state.hullHp - hullDmg);
    spawnRadarWave(state.shieldHp > 0 ? 0x38bdf8 : 0xf43f5e, isMonolith ? 24 : 16);
    if (window.CozyAudio && window.CozyAudio.trapHit) window.CozyAudio.trapHit();

    if (state.hullHp <= 0) {
      if (window.BlahajNetwork && typeof window.BlahajNetwork.send === 'function') {
        window.BlahajNetwork.send({
          type: 'space_event',
          action: 'ufo_destroyed'
        });
      }
      respawnCrewInIkeaAfterDestruction();
      return;
    }

    if (window.showToast && (isMonolith || state.shieldHp <= 0 || hullDmg >= 8)) {
      const shPct = Math.round(state.shieldHp);
      const huPct = Math.round(state.hullHp);
      window.showToast(
        state.shieldHp > 0 ? `🛡️ GRAVITRONIC SHIELD HIT! (${shPct}%)` : `⚠️ HULL IMPACT! (${huPct}%)`,
        `${sourceLabel} — Force fields ${shPct}% · Hull ${huPct}%`
      );
    }
    updateAvionicsHUD();
    broadcastState(true);
  }

  function triggerSecondaryPower() {
    if (!state.localRole) return;
    if (state.secondaryCooldown > 0) return;
    state.secondaryCooldown = 1.15;

    // Wired directly to #5 Disco & Sonic Shockwave!
    spawnRadarWave(0xf472b6, 56);
    spawnRadarWave(0x38bdf8, 40);
    if (window.CozyAudio && window.CozyAudio.portalChime) window.CozyAudio.portalChime();

    if (state.inSpace && state.inCheeseMoon && window.BlahajCheeseMoon && typeof window.BlahajCheeseMoon.triggerSonicShockwave === 'function') {
      window.BlahajCheeseMoon.triggerSonicShockwave(state.pos);
      state.radarStatusText = '🪩💥 SONIC SHOCKWAVE! Blasted Space Invaders off the hull!';
      state.radarStatusUntil = performance.now() + 2600;
    } else if (state.inSpace && window.BlahajSpace && typeof window.BlahajSpace.triggerSonicShockwave === 'function') {
      window.BlahajSpace.triggerSonicShockwave(state.pos, false);
      state.radarStatusText = '🪩💥 SONIC SHOCKWAVE! Small debris vaporized · Medium rocks pushed back!';
      state.radarStatusUntil = performance.now() + 2600;
    } else {
      toggleDiscoMode();
      // On planetary worlds, push back nearby beach balls or enemies!
      if (window.BlahajEnemies && typeof window.BlahajEnemies.getEnemies === 'function') {
        const enemies = window.BlahajEnemies.getEnemies() || [];
        enemies.forEach((en) => {
          if (!en || en.defeated || !en.pos) return;
          if (en.pos.distanceTo(state.pos) < 26.0 && window.BlahajEnemies.boopEnemy) {
            window.BlahajEnemies.boopEnemy(en, state.pos);
          }
        });
      }
    }
    updateAvionicsHUD();
  }

  function updateAvionicsButtonsUI() {
    const btnView = document.getElementById('ufo-btn-view');
    const btnFloor = document.getElementById('ufo-btn-floorcam');
    const btnHatch = document.getElementById('ufo-btn-hatch');
    const btnBeam = document.getElementById('ufo-btn-beam');
    const btnDisco = document.getElementById('ufo-btn-disco');
    const btnLand = document.getElementById('ufo-btn-land');
    const btnChase = document.getElementById('ufo-btn-chasecam');

    if (btnView) btnView.textContent = state.viewMode === 'inside' ? '🪟 View: COCKPIT [V]' : '🛸 View: OUTSIDE [V]';
    if (btnFloor) {
      btnFloor.classList.toggle('active', !!state.floorCam);
      btnFloor.textContent = state.floorCam ? '🪟 Floor Cam: ON [G]' : '🪟 Floor Cam [G]';
    }
    if (btnHatch) btnHatch.classList.toggle('active', state.hatchTargetOpen);
    if (btnBeam) {
      btnBeam.classList.toggle('active', state.tractorBeam || !!state.subspaceVault);
      btnBeam.textContent = state.subspaceVault
        ? '📤 Disgorge Vault [T]'
        : (state.tractorBeam ? '🟢 Tractor Beam: ON [T]' : '🟢 Tractor Beam [T]');
    }
    if (btnDisco) btnDisco.classList.toggle('active', state.discoMode);
    if (btnLand) btnLand.classList.toggle('active', state.phase === 'landing');
    if (btnChase) {
      const on = isAutoChaseCamEnabled();
      btnChase.classList.toggle('active', on);
      btnChase.textContent = on ? '🎥 Chase Cam: ON' : '🎥 Chase Cam: FREE';
    }
  }

  function drawArtificialHorizon() {
    const canvas = document.getElementById('ufo-horizon-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    const cx = w * 0.5;
    const cy = h * 0.5;

    ctx.clearRect(0, 0, w, h);

    // Circular glass scope clip
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, cx - 4, 0, Math.PI * 2);
    ctx.clip();

    // Rotate by roll, shift by pitch
    ctx.translate(cx, cy);
    ctx.rotate(-state.roll * (state.inSpace ? 1.0 : 1.4));
    const pitchPx = state.pitch * 115;

    // Sky & Ground hemispheres
    const skyGrad = ctx.createLinearGradient(0, -cy, 0, pitchPx);
    skyGrad.addColorStop(0, state.orbitalCeilingReached ? '#09071a' : '#0c2d52');
    skyGrad.addColorStop(1, state.orbitalCeilingReached ? '#311068' : '#0ea5e9');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(-w, -h + pitchPx, w * 2, h);

    const gndGrad = ctx.createLinearGradient(0, pitchPx, 0, cy);
    gndGrad.addColorStop(0, '#0f4c5c');
    gndGrad.addColorStop(1, '#081b26');
    ctx.fillStyle = gndGrad;
    ctx.fillRect(-w, pitchPx, w * 2, h);

    // Horizon Line
    ctx.strokeStyle = '#5eead4';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-w, pitchPx);
    ctx.lineTo(w, pitchPx);
    ctx.stroke();

    // Pitch Ladder Bars
    ctx.strokeStyle = 'rgba(186, 230, 253, 0.72)';
    ctx.lineWidth = 1.25;
    for (let deg = -30; deg <= 30; deg += 10) {
      if (deg === 0) continue;
      const py = pitchPx - deg * 2.2;
      const bw = deg % 20 === 0 ? 28 : 16;
      ctx.beginPath();
      ctx.moveTo(-bw, py);
      ctx.lineTo(-8, py);
      ctx.moveTo(8, py);
      ctx.lineTo(bw, py);
      ctx.stroke();
    }
    ctx.restore();

    // Fixed Center Aircraft Reference Reticle (-v-)
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(cx - 26, cy);
    ctx.lineTo(cx - 8, cy);
    ctx.lineTo(cx, cy + 7);
    ctx.lineTo(cx + 8, cy);
    ctx.lineTo(cx + 26, cy);
    ctx.stroke();

    // Outer Glass Bezel
    ctx.strokeStyle = state.orbitalCeilingReached ? '#c084fc' : '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(cx, cy, cx - 4, 0, Math.PI * 2);
    ctx.stroke();
  }

  function updateAvionicsHUD() {
    if (!state.localRole) return;
    const altAgl = Math.max(0, state.pos.y - getSafeGroundHeight(state.pos.x, state.pos.z));
    const speedKts = Math.round(state.speed * 2.4);
    const heading = Math.round((((-state.yaw * 180) / Math.PI) % 360 + 360) % 360);

    const elPhase = document.getElementById('ufo-hud-phase');
    const elRole = document.getElementById('ufo-hud-role');
    const elSpd = document.getElementById('ufo-hud-speed');
    const elAlt = document.getElementById('ufo-hud-alt');
    const elVsi = document.getElementById('ufo-hud-vsi');
    const elHdg = document.getElementById('ufo-hud-hdg');
    const elStatus = document.getElementById('ufo-hud-status');
    const elOrbital = document.getElementById('ufo-orbital-banner');
    const elVaultVal = document.getElementById('ufo-vault-val');
    const elVaultSub = document.getElementById('ufo-vault-sub');
    const vaultSum = getActiveVaultSummary();
    if (elVaultVal) elVaultVal.textContent = vaultSum ? `${vaultSum.icon} ${vaultSum.title}` : 'EMPTY';
    if (elVaultSub) elVaultSub.textContent = vaultSum ? 'Press [T] to Disgorge!' : 'Beam [T] · Trunk [K]';

    if (elPhase) {
      const phaseLabel = state.inSpace
        ? '🪐 DEEP SPACE ORBIT'
        : (state.warpChargeTimer > 0.05
          ? `🌀 WARP PORTAL ${Math.min(100, Math.round((state.warpChargeTimer / 6.0) * 100))}%`
          : (state.orbitalCeilingReached
            ? '🌌 ORBITAL CEILING'
            : (state.isSubmerged
              ? '🌊 HYDRO-SUBMERGED'
              : (state.phase === 'launching' ? '🚀 LAUNCH SEQUENCE'
                : (state.phase === 'landing' ? '🛬 AUTO-LANDING'
                : (state.phase === 'parked' ? '🅿️ LANDED · STAIRS DOWN' : (state.turboActive ? '⚡ HYPER-JETSONS TURBO' : '🛸 FLIGHT CRUISE')))))));
      elPhase.textContent = phaseLabel;
    }
    if (elRole) {
      const crewStr = state.passengerName
        ? `Pilot: ${state.pilotName || 'Captain'} · Co-Pilot: ${state.passengerName}`
        : `Pilot: ${state.pilotName || 'Captain'} · Passenger Seat Open`;
      elRole.textContent = `${state.localRole === 'pilot' ? '🧑‍✈️ PILOT' : '🦈 PASSENGER'} · ${crewStr}`;
    }
    if (elSpd) {
      if (state.inSpace) {
        const thrPct = Math.round((state.spaceThrottle || 0) * 100);
        elSpd.textContent = `${speedKts} KTS · ${thrPct}%`;
      } else {
        elSpd.textContent = `${speedKts} KTS`;
      }
    }
    if (elAlt) elAlt.textContent = state.inSpace ? `${Math.round(state.pos.y + 420)}km ORB` : `${Math.round(altAgl)}m AGL`;
    if (elVsi) elVsi.textContent = `${state.verticalSpeed >= 0 ? '+' : ''}${state.verticalSpeed.toFixed(1)} m/s`;
    if (elHdg) elHdg.textContent = `HDG ${String(heading).padStart(3, '0')}°`;
    if (elStatus) {
      if (state.radarStatusText && performance.now() < state.radarStatusUntil) {
        elStatus.textContent = state.radarStatusText;
        elStatus.classList.remove('hidden');
      } else if (state.warpChargeTimer > 0.05) {
        const targetTime = state.inSpace ? 5.0 : 6.0;
        const pct = Math.min(100, Math.round((state.warpChargeTimer / targetTime) * 100));
        elStatus.textContent = state.inSpace
          ? `🧀🌀 HYPER-WARP TO SWISS CHEESE PLANETOID: ${pct}% (${Math.max(0, targetTime - state.warpChargeTimer).toFixed(1)}s) · HOLD [SHIFT]!`
          : `🌀 MACH SHOCKWAVE & PORTAL BREACH: ${pct}% (${Math.max(0, targetTime - state.warpChargeTimer).toFixed(1)}s) · HOLD [W] + [SHIFT]!`;
        elStatus.classList.remove('hidden');
      } else if (state.inSpace) {
        const thrPct = Math.round((state.spaceThrottle || 0) * 100);
        elStatus.textContent = `🪐 FLIGHT SIM (${thrPct}% THR) · WHEEL = SPEED · MOUSE/W/S/A/D = PITCH & ROLL · Q/E = RUDDER · MMB = LOOK`;
        elStatus.classList.remove('hidden');
      } else if (state.orbitalCeilingReached) {
        elStatus.textContent = '✨ UPPER ORBITAL BAND (145m–185m) · HOLD [SHIFT] + [W] FOR 6 SECONDS TO JUMP TO DEEP SPACE!';
        elStatus.classList.remove('hidden');
      } else if (state.hyperdriveTimer > 0) {
        elStatus.textContent = `⚡ MOJO HYPERDRIVE SURGE (${state.hyperdriveTimer.toFixed(1)}s) · CLIMB ABOVE 145m & HOLD [SHIFT]!`;
        elStatus.classList.remove('hidden');
      } else if (state.antiGravCushionActive) {
        elStatus.textContent = '🛡️ ANTI-GRAV CUSHION ACTIVE';
        elStatus.classList.remove('hidden');
      } else {
        elStatus.classList.add('hidden');
      }
    }
    if (elOrbital) {
      elOrbital.classList.toggle('hidden', !state.orbitalCeilingReached || !!state.inSpace);
    }

    const shPct = Math.max(0, Math.min(100, Math.round(state.shieldHp ?? 100)));
    const huPct = Math.max(0, Math.min(100, Math.round(state.hullHp ?? 100)));
    const elShVal = document.getElementById('ufo-shield-val');
    const elHuVal = document.getElementById('ufo-hull-val');
    const elShBar = document.getElementById('ufo-shield-bar');
    const elHuBar = document.getElementById('ufo-hull-bar');
    if (elShVal) elShVal.textContent = `${shPct}%`;
    if (elHuVal) elHuVal.textContent = `${huPct}%`;
    if (elShBar) elShBar.style.width = `${shPct}%`;
    if (elHuBar) {
      elHuBar.style.width = `${huPct}%`;
      elHuBar.style.background = huPct > 50 ? '#34d399' : (huPct > 25 ? '#fbbf24' : '#f43f5e');
    }

    if (state.inSpace) {
      drawSpaceRadar();
    }

    drawArtificialHorizon();
  }

  function drawSpaceRadar() {
    const canvas = document.getElementById('ufo-radar-canvas');
    const countEl = document.getElementById('ufo-radar-count');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const radarSrc = state.inCheeseMoon
      ? (window.BlahajCheeseMoon && typeof window.BlahajCheeseMoon.getRadarBlips === 'function' ? window.BlahajCheeseMoon.getRadarBlips() : null)
      : (window.BlahajSpace && typeof window.BlahajSpace.getRadarBlips === 'function' ? window.BlahajSpace.getRadarBlips() : null);

    if (countEl && radarSrc) {
      countEl.textContent = radarSrc.label || '';
      countEl.style.color = radarSrc.cleared ? '#facc15' : '#7dd3fc';
    }

    const w = canvas.width;
    const h = canvas.height;
    const cx = w * 0.5;
    const cy = h * 0.5;
    const rad = cx - 6;

    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, rad, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(8, 15, 32, 0.86)';
    ctx.fill();
    ctx.clip();

    // Range rings & crosshair
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.22)';
    ctx.lineWidth = 1;
    [0.35, 0.7].forEach((s) => {
      ctx.beginPath();
      ctx.arc(cx, cy, rad * s, 0, Math.PI * 2);
      ctx.stroke();
    });
    ctx.beginPath();
    ctx.moveTo(cx - rad, cy);
    ctx.lineTo(cx + rad, cy);
    ctx.moveTo(cx, cy - rad);
    ctx.lineTo(cx, cy + rad);
    ctx.stroke();

    // Ship-relative projection using shipFwd, shipRight, shipUp
    const invQuat = state.spaceQuat.clone().invert();
    const maxRange = 175.0;

    if (radarSrc && Array.isArray(radarSrc.blips)) {
      radarSrc.blips.forEach((b) => {
        const rel = new THREE.Vector3(b.x - state.pos.x, b.y - state.pos.y, b.z - state.pos.z);
        rel.applyQuaternion(invQuat);
        // In local ship space: +Z is forward (radar Up: -Y), -X is right (radar Right: +X), +Y is up
        const nx = Math.max(-0.92, Math.min(0.92, -rel.x / maxRange));
        const nz = Math.max(-0.92, Math.min(0.92, rel.z / maxRange));
        const bx = cx + nx * rad;
        const by = cy - nz * rad;
        const elevPx = Math.max(-10, Math.min(10, (rel.y / maxRange) * 28));

        if (b.kind === 'gate' || b.kind === 'cheese_gate') {
          ctx.strokeStyle = (b.kind === 'cheese_gate' || state.inCheeseMoon) ? '#facc15' : '#38bdf8';
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.arc(bx, by, 4.8, 0, Math.PI * 2);
          ctx.stroke();
        } else if (b.kind === 'monolith') {
          ctx.fillStyle = 'rgba(148, 163, 184, 0.45)';
          ctx.beginPath();
          ctx.arc(bx, by, 4.2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          const col = b.kind === 'latched'
            ? '#f43f5e'
            : (b.kind === 'invader' ? '#f0abfc' : (b.tier === 2 ? '#facc15' : '#38bdf8'));
          // Elevation tick showing whether target is above or below your plane
          if (Math.abs(elevPx) > 1.5) {
            ctx.strokeStyle = col;
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(bx, by);
            ctx.lineTo(bx, by - elevPx);
            ctx.stroke();
          }
          ctx.fillStyle = col;
          ctx.beginPath();
          ctx.arc(bx, by, b.tier === 2 ? 3.2 : 2.3, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }

    // Center Ship Triangle
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 5);
    ctx.lineTo(cx - 4, cy + 4);
    ctx.lineTo(cx + 4, cy + 4);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
    ctx.strokeStyle = state.inCheeseMoon ? '#facc15' : '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, rad, 0, Math.PI * 2);
    ctx.stroke();
  }

  // ==========================================================================
  // 7. PER-FRAME UPDATE (THUNDERBIRDS ISLAND + FLIGHT SIM + CAMERA + SHARKS)
  // ==========================================================================
  function update(dt, elapsed, keys, camState, camera) {
    if (!isBuilt || !ufoGroup) return;

    if (state.impactCooldown > 0) state.impactCooldown = Math.max(0, state.impactCooldown - dt);
    if (state.secondaryCooldown > 0) state.secondaryCooldown = Math.max(0, state.secondaryCooldown - dt);
    if (state.shieldRegenDelay > 0) {
      state.shieldRegenDelay = Math.max(0, state.shieldRegenDelay - dt);
    } else if (state.shieldHp < state.maxShieldHp) {
      state.shieldHp = Math.min(state.maxShieldHp, state.shieldHp + 14.0 * dt);
    }

    // 1. Animate Thunderbirds Secret Hangar Doors, Tilting Palms & Hydraulic Pad
    const targetOpen = state.hangarTargetOpen ? 1.0 : 0.0;
    state.hangarOpenProg += (targetOpen - state.hangarOpenProg) * Math.min(1.0, dt * 2.4);

    if (hangarDoorL && hangarDoorR) {
      const slideDist = state.hangarOpenProg * 13.8;
      const doorSinkY = ISLE_DECK_Y + 0.05 - state.hangarOpenProg * 0.28;
      hangarDoorL.position.set(-slideDist, doorSinkY, 0);
      hangarDoorR.position.set(slideDist, doorSinkY, 0);
    }
    if (elevatorMesh) {
      elevatorMesh.position.y = HANGAR_LOWER_Y + state.hangarOpenProg * (HANGAR_RAISED_Y - HANGAR_LOWER_Y);
    }
    tiltingPalms.forEach((p) => {
      // Palms lean outward dramatically like Thunderbird 2!
      p.pivot.rotation.z = -state.hangarOpenProg * 0.72;
    });
    warningBeacons.forEach((b) => {
      const pulse = state.hangarTargetOpen ? (0.55 + Math.sin(elapsed * 9.0 + b.phase) * 0.45) : 0.15;
      b.dome.scale.setScalar(0.85 + pulse * 0.35);
    });
    runwayChevrons.forEach((ch) => {
      ch.rotation.y = elapsed * 1.4;
      ch.rotation.x = Math.sin(elapsed * 2.0) * 0.2;
    });

    // 2. Animate Bottom Hatch & Telescoping Glowing Boarding Stairs
    const hTarget = state.hatchTargetOpen ? 1.0 : 0.0;
    state.hatchOpenProg += (hTarget - state.hatchOpenProg) * Math.min(1.0, dt * 4.5);
    if (hatchDoorMesh) {
      hatchDoorMesh.position.x = state.hatchOpenProg * 1.65;
      hatchDoorMesh.visible = state.hatchOpenProg < 0.96;
    }
    if (stairsGroup) {
      stairsGroup.visible = state.hatchOpenProg > 0.05;
      stairsGroup.scale.set(1, Math.max(0.05, state.hatchOpenProg), Math.max(0.05, state.hatchOpenProg));
    }

    // 3. Animate Retro Rim Lights, Bobble-Shonk, Lava Lamp & Tractor Beam
    rimLightMeshes.forEach((rl) => {
      if (state.discoMode) {
        const hue = ((elapsed * 0.55 + rl.idx / 16) % 1.0);
        rl.mat.color.setHSL(hue, 0.95, 0.6);
      } else {
        const chase = Math.sin(elapsed * 7.0 - rl.idx * 0.8) > 0.25;
        rl.mat.color.setHex(state.orbitalCeilingReached ? 0xc084fc : (chase ? 0x38bdf8 : 0xfbbf24));
      }
    });
    if (bobbleSharkMesh) {
      bobbleSharkMesh.rotation.z = Math.sin(elapsed * 7.2) * 0.14 - state.roll * 0.9;
      bobbleSharkMesh.rotation.x = Math.cos(elapsed * 5.8) * 0.1 - state.pitch * 0.8;
    }
    if (mojoCoreMesh) {
      mojoCoreMesh.rotation.y += dt * 2.4;
      mojoCoreMesh.rotation.x = Math.sin(elapsed * 2.1) * 0.25;
      const pulse = 0.92 + 0.14 * Math.sin(elapsed * 4.5);
      mojoCoreMesh.scale.setScalar(pulse);
    }

    // 3B. Animate Deployable Exterior Saucer Appendages, Retractable Default Aerial, Plasma Bolts & Radar Waves
    const activeMod = saucerModules[activeModuleIdx];
    const aerialTarget = (activeMod && activeMod.usesDorsal) ? 0.0 : 1.0;
    defaultAerialProg += (aerialTarget - defaultAerialProg) * Math.min(1.0, dt * 8.0);
    if (defaultAerialGroup) {
      defaultAerialGroup.visible = defaultAerialProg > 0.02;
      defaultAerialGroup.position.y = -0.6 + 0.6 * defaultAerialProg;
      defaultAerialGroup.scale.setScalar(Math.max(0.01, defaultAerialProg));
    }
    saucerModules.forEach((mod, idx) => {
      const target = idx === activeModuleIdx ? 1.0 : 0.0;
      mod.prog += (target - mod.prog) * Math.min(1.0, dt * 7.5);
      mod.animate(mod.prog, elapsed);
    });
    state.activeModuleIdx = activeModuleIdx;
    if (dt <= 0) {
      state.spaceMouseDx = 0;
      state.spaceMouseDy = 0;
    }
    if (state.turretFireCooldown > 0) {
      state.turretFireCooldown = Math.max(0, state.turretFireCooldown - dt);
    }
    if (dt > 0 && state.localRole && activeModuleIdx === 1) {
      const kNow = keys || {};
      const holdingLeftTrigger = !!(camState && camState.isLeftDown && !camState.isRightDown);
      const holdingKeyTrigger = !!kNow['t'];
      if ((holdingLeftTrigger || holdingKeyTrigger) && state.turretFireCooldown <= 0) {
        firePlasmaTurrets();
      }
    }
    for (let i = ufoPlasmaBolts.length - 1; i >= 0; i--) {
      const b = ufoPlasmaBolts[i];
      b.life -= dt;
      b.mesh.position.addScaledVector(b.vel, dt);
      let hit = b.life <= 0;
      let impactedTarget = false;
      if (!hit && state.inSpace && state.inCheeseMoon && window.BlahajCheeseMoon && typeof window.BlahajCheeseMoon.checkPlasmaBoltCollision === 'function') {
        if (window.BlahajCheeseMoon.checkPlasmaBoltCollision(b.mesh.position)) {
          hit = true;
          impactedTarget = true;
        }
      }
      if (!hit && state.inSpace && !state.inCheeseMoon && window.BlahajSpace && typeof window.BlahajSpace.checkPlasmaBoltCollision === 'function') {
        if (window.BlahajSpace.checkPlasmaBoltCollision(b.mesh.position, b.vel, b.colorHex)) {
          hit = true;
          impactedTarget = true;
        }
      }
      if (!hit && !state.inSpace && window.BlahajEnemies && typeof window.BlahajEnemies.getEnemies === 'function') {
        const enemies = window.BlahajEnemies.getEnemies() || [];
        for (let ei = 0; ei < enemies.length; ei++) {
          const en = enemies[ei];
          if (!en || en.defeated || !en.mesh || !en.mesh.visible) continue;
          if (en.mesh.position.distanceTo(b.mesh.position) < 2.4) {
            if (window.BlahajEnemies.boopEnemy) window.BlahajEnemies.boopEnemy(en, state.pos);
            hit = true;
            impactedTarget = true;
            break;
          }
        }
      }
      if (!hit && !state.inSpace && b.mesh.position.y < getSafeGroundHeight(b.mesh.position.x, b.mesh.position.z)) {
        hit = true;
        impactedTarget = true;
      }
      if (hit) {
        if (impactedTarget && b.mesh.parent) {
          spawnPlasmaImpactBurst(b.mesh.parent, b.mesh.position, b.colorHex || 0x38bdf8);
        }
        if (b.mesh.parent) b.mesh.parent.remove(b.mesh);
        b.mesh.traverse((child) => {
          if (child.geometry) child.geometry.dispose();
          if (child.material) child.material.dispose();
        });
        ufoPlasmaBolts.splice(i, 1);
      }
    }
    for (let i = ufoRadarWaves.length - 1; i >= 0; i--) {
      const w = ufoRadarWaves[i];
      w.age += dt;
      const u = Math.min(1, w.age / w.maxAge);
      w.mesh.scale.setScalar(1 + u * w.maxScale);
      w.mesh.material.opacity = (1 - u) * 0.85;
      if (u >= 1) {
        if (w.mesh.parent) w.mesh.parent.remove(w.mesh);
        if (w.mesh.geometry) w.mesh.geometry.dispose();
        if (w.mesh.material) w.mesh.material.dispose();
        ufoRadarWaves.splice(i, 1);
      }
    }
    for (let i = volcanoDropAnims.length - 1; i >= 0; i--) {
      const vd = volcanoDropAnims[i];
      vd.vy -= 36.0 * dt;
      vd.y += vd.vy * dt;
      const obj = vd.ref;
      if (obj && obj.mesh) {
        obj.mesh.position.set(vd.x, vd.y, vd.z);
        obj.mesh.rotation.x += dt * 9.0;
        obj.mesh.rotation.z += dt * 7.0;
      }
      if (vd.y <= 22.8) {
        volcanoDropAnims.splice(i, 1);
        if (window.BlahajWorld && typeof window.BlahajWorld.triggerCalderaEruption === 'function') {
          window.BlahajWorld.triggerCalderaEruption(ufoGroup ? ufoGroup.parent : null, { x: vd.x, z: vd.z });
        }
        if (window.BlahajQuests && typeof window.BlahajQuests.recordEvent === 'function') {
          window.BlahajQuests.recordEvent('volcano_drop', 1);
        }
        if (window.CozyAudio && window.CozyAudio.waterSplash) window.CozyAudio.waterSplash(0.35, 0.4);
        if (window.CozyAudio && window.CozyAudio.allenBuild) window.CozyAudio.allenBuild();
        if (vd.kind === 'enemy' && obj) {
          if (obj.isIncursionInvader && window.BlahajSeam && typeof window.BlahajSeam.onInvaderExpelledToSea === 'function') {
            obj.isIncursionInvader = false;
            window.BlahajSeam.onInvaderExpelledToSea(obj);
          }
          if (window.BlahajEnemies && typeof window.BlahajEnemies.banishEnemy === 'function') {
            window.BlahajEnemies.banishEnemy(obj, 3600, 'volcano');
          } else {
            obj.mange = 0;
            if (obj.mesh) obj.mesh.visible = false;
          }
          if (window.showToast) {
            window.showToast(
              '🌋🔥 VOLCANO RECALL! (1 HOUR)',
              `${vd.title || 'Creature'} was toasted in the caldera & shipped to IKEA for a 1-hour re-stuffing!`
            );
          }
        } else if (vd.kind === 'beach_ball' && obj && obj.mesh) {
          obj.vel.set(0, 12, 0);
          obj.mesh.position.set(vd.x, 38, vd.z);
        } else if (vd.kind === 'carrot' && obj && obj.mesh) {
          obj.knockedOff = true;
          obj.respawnTimer = 10.0;
          obj.mesh.visible = false;
        }
        if (window.showToast) {
          window.showToast('🌋🔥 VOLCANIC INCINERATION!', `${vd.title} plunged into the molten caldera in a fiery eruption!`);
        }
      }
    }
    if (lavaLampBlob) {
      lavaLampBlob.position.y = 1.74 + Math.sin(elapsed * 1.6) * 0.09;
    }
    if (activeModuleIdx !== 0 && state.tractorBeam) {
      state.tractorBeam = false;
    }
    if (tractorBeamMesh) {
      if (state.disgorgeFlashTimer > 0) {
        state.disgorgeFlashTimer = Math.max(0, state.disgorgeFlashTimer - dt);
        tractorBeamMesh.visible = true;
        tractorBeamMesh.material.color.setHex(0xfbbf24);
        tractorBeamMesh.material.opacity = 0.35 * (state.disgorgeFlashTimer / 0.65);
        if (state.disgorgeFlashTimer <= 0 && !state.tractorBeam) {
          tractorBeamMesh.visible = false;
        }
      } else if (state.tractorBeam) {
        tractorBeamMesh.visible = true;
        tractorBeamMesh.rotation.y = elapsed * 2.4;
        tractorBeamMesh.material.color.setHex(state.beamingTarget ? 0x5eead4 : 0x34d399);
        tractorBeamMesh.material.opacity = (state.beamingTarget ? 0.38 : 0.24) + Math.sin(elapsed * 5.0) * 0.07;
      } else {
        tractorBeamMesh.visible = false;
      }
    }

    // 3B. Tractor Beam Capture & Inventory Pickup Engine (when local pilot has beam active)
    if (state.localRole === 'pilot' && state.tractorBeam) {
      // A) Pull nearby inventory pickups into your Satchel!
      const wpMgr = window.BlahajGame && window.BlahajGame.getWorldPickups ? window.BlahajGame.getWorldPickups() : null;
      if (wpMgr && typeof wpMgr.getPickups === 'function') {
        const pickups = wpMgr.getPickups();
        for (let pi = pickups.length - 1; pi >= 0; pi--) {
          const pk = pickups[pi];
          if (!pk || pk.collected || !pk.mesh || !pk.mesh.visible) continue;
          const dx = state.pos.x - pk.mesh.position.x;
          const dz = state.pos.z - pk.mesh.position.z;
          const hd = Math.hypot(dx, dz);
          if (hd < 15.0 && pk.mesh.position.y <= state.pos.y + 2.0 && state.pos.y - pk.mesh.position.y < 28.0) {
            pk.mesh.position.x += dx * Math.min(1.0, dt * 6.0);
            pk.mesh.position.z += dz * Math.min(1.0, dt * 6.0);
            pk.mesh.position.y += (state.pos.y - pk.mesh.position.y) * Math.min(1.0, dt * 6.0);
            if (hd < 2.2 && Math.abs(state.pos.y - pk.mesh.position.y) < 2.8) {
              if (window.BlahajGame && typeof window.BlahajGame.collectWorldPickup === 'function') {
                window.BlahajGame.collectWorldPickup(pk);
              }
            }
          }
        }
      }

      // B) Animate active Subspace Vault capture OR scan for 1 living creature / large world toy!
      if (state.beamingTarget) {
        const bt = state.beamingTarget;
        bt.progress = Math.min(1.0, bt.progress + dt * 1.4);
        const mesh = bt.ref && bt.ref.mesh;
        if (mesh) {
          const t = bt.progress;
          const spiralR = (1.0 - t) * 1.4;
          const ang = t * Math.PI * 6.0;
          mesh.position.set(
            bt.startPos.x + (state.pos.x - bt.startPos.x) * t + Math.cos(ang) * spiralR,
            bt.startPos.y + (state.pos.y - 0.6 - bt.startPos.y) * t,
            bt.startPos.z + (state.pos.z - bt.startPos.z) * t + Math.sin(ang) * spiralR
          );
          mesh.rotation.y += dt * 12.0;
          const sc = Math.max(0.08, 1.0 - t * 0.85);
          mesh.scale.setScalar(sc);
        }
        if (bt.progress >= 1.0) {
          if (bt.kind === 'enemy' && bt.ref) {
            bt.ref.inSubspaceVault = true;
            if (bt.ref.labelEl) bt.ref.labelEl.style.display = 'none';
          } else if (bt.ref) {
            bt.ref.inSubspaceVault = true;
          }
          if (mesh) {
            mesh.visible = false;
            mesh.scale.set(1, 1, 1);
          }
          state.subspaceVault = { kind: bt.kind, title: bt.title, icon: bt.icon, ref: bt.ref };
          state.beamingTarget = null;
          state.tractorBeam = false; // Auto-shutoff once sucked into Subspace Vault!
          if (tractorBeamMesh) tractorBeamMesh.visible = false;
          playBeamCaptureChime(false);
          if (window.showToast) {
            window.showToast(`${bt.icon} CAPTURED IN SUBSPACE VAULT!`, `${bt.title} beamed aboard! Press [T] anytime to disgorge.`);
          }
          updateAvionicsButtonsUI();
          updateAvionicsHUD();
          broadcastState(true);
        }
      } else if (!state.subspaceVault) {
        // Scan below saucer for a living creature or large toy (Beach Ball / Carrot)
        let candidate = null;
        let bestD = 7.2;

        if (window.BlahajEnemies && typeof window.BlahajEnemies.getEnemies === 'function') {
          const enemies = window.BlahajEnemies.getEnemies();
          for (let ei = 0; ei < enemies.length; ei++) {
            const e = enemies[ei];
            if (!e || e.inSubspaceVault || e.isFlying || !e.mesh || !e.mesh.visible) continue;
            if (e.pos.y > state.pos.y + 1.5 || state.pos.y - e.pos.y > 28.0) continue;
            const hd = Math.hypot(e.pos.x - state.pos.x, e.pos.z - state.pos.z);
            if (hd < bestD) {
              bestD = hd;
              const icon = e.type === 'urchin' ? '🟣' : (e.type === 'starfish' ? '⭐' : (e.type === 'puffball' ? '🐡' : '🦈'));
              candidate = { kind: 'enemy', title: e.title || 'Sea Creature', icon, ref: e, startPos: e.pos.clone() };
            }
          }
        }

        if (!candidate && window.BlahajWorld && typeof window.BlahajWorld.getBeachBalls === 'function') {
          const balls = window.BlahajWorld.getBeachBalls();
          for (let bi = 0; bi < balls.length; bi++) {
            const bb = balls[bi];
            if (!bb || bb.inSubspaceVault || !bb.mesh || !bb.mesh.visible) continue;
            if (bb.mesh.position.y > state.pos.y + 1.5 || state.pos.y - bb.mesh.position.y > 28.0) continue;
            const hd = Math.hypot(bb.mesh.position.x - state.pos.x, bb.mesh.position.z - state.pos.z);
            if (hd < bestD) {
              bestD = hd;
              candidate = { kind: 'beach_ball', title: 'Striped Beach Ball', icon: '🏖️', ref: bb, startPos: bb.mesh.position.clone() };
            }
          }
        }

        if (!candidate && window.BlahajWorld && typeof window.BlahajWorld.getBalconyCarrots === 'function') {
          const carrots = window.BlahajWorld.getBalconyCarrots();
          for (let ci = 0; ci < carrots.length; ci++) {
            const c = carrots[ci];
            if (!c || c.inSubspaceVault || !c.mesh || !c.mesh.visible) continue;
            if (c.mesh.position.y > state.pos.y + 1.5 || state.pos.y - c.mesh.position.y > 28.0) continue;
            const hd = Math.hypot(c.mesh.position.x - state.pos.x, c.mesh.position.z - state.pos.z);
            if (hd < bestD) {
              bestD = hd;
              candidate = { kind: 'carrot', title: 'Beach-Shorts Carrot', icon: '🥕', ref: c, startPos: c.mesh.position.clone() };
            }
          }
        }

        if (candidate) {
          state.beamingTarget = { ...candidate, progress: 0 };
          playBeamCaptureChime(false);
        }
      }
    }

    // 4. Flight Simulator Physics (Local Pilot vs Remote Synced vs Parked)
    state.antiGravCushionActive = false;

    if (state.localRole === 'pilot') {
      const k = keys || {};
      const fwdInput = (k['w'] || k['arrowup'] ? 1 : 0) - (k['s'] || k['arrowdown'] ? 1 : 0);
      const turnInput = (k['a'] || k['arrowleft'] ? 1 : 0) - (k['d'] || k['arrowright'] ? 1 : 0);
      const strafeInput = (k['e'] ? 1 : 0) - (k['q'] ? 1 : 0);
      const upInput = (k[' '] || k['space'] ? 1 : 0) - (k['c'] || k['control'] ? 1 : 0);
      if (state.hyperdriveTimer > 0) state.hyperdriveTimer = Math.max(0, state.hyperdriveTimer - dt);
      const turbo = !!(k['shift'] || state.hyperdriveTimer > 0);
      state.turboActive = turbo;

      if (state.phase === 'launching') {
        // Automated dramatic takeoff sequence!
        state.phaseTimer += dt;
        state.hatchTargetOpen = false;
        const targetLaunchY = Math.max(getSafeGroundHeight(state.pos.x, state.pos.z) + 12.0, 19.0);
        state.vel.y = (targetLaunchY - state.pos.y) * 2.2;
        state.pos.y += Math.max(2.5, Math.min(10.0, state.vel.y)) * dt;
        state.pitch *= 0.92;
        state.roll *= 0.92;
        if (state.pos.y >= targetLaunchY - 0.8 || state.phaseTimer > 2.8) {
          state.phase = 'flying';
        }
      } else if (state.phase === 'landing') {
        // Automated gentle touchdown sequence (funnels onto Shonkbird Atoll pad if within 42m!)
        const dIsle = Math.hypot(state.pos.x - ISLE_X, state.pos.z - ISLE_Z);
        const funnelToPad = dIsle < 42.0;
        let targetY;
        if (funnelToPad) {
          state.hangarTargetOpen = true;
          state.pos.x += (ISLE_X - state.pos.x) * Math.min(1.0, dt * 2.6);
          state.pos.z += (ISLE_Z - state.pos.z) * Math.min(1.0, dt * 2.6);
          const padYaw = -Math.PI * 0.72;
          let yd = padYaw - state.yaw;
          while (yd > Math.PI) yd -= Math.PI * 2;
          while (yd < -Math.PI) yd += Math.PI * 2;
          state.yaw += yd * Math.min(1.0, dt * 3.0);
          targetY = HANGAR_RAISED_Y + 1.5;
        } else {
          state.vel.x *= Math.max(0, 1 - dt * 3.5);
          state.vel.z *= Math.max(0, 1 - dt * 3.5);
          state.pos.x += state.vel.x * dt;
          state.pos.z += state.vel.z * dt;
          targetY = getSaucerTouchdownY(state.pos.x, state.pos.z, state.yaw);
        }
        const descentSpeed = Math.max(2.0, Math.min(9.5, Math.abs(state.pos.y - targetY) * 1.5));
        if (state.pos.y > targetY) {
          state.pos.y = Math.max(targetY, state.pos.y - descentSpeed * dt);
          state.vel.y = -descentSpeed;
        } else {
          state.pos.y = Math.min(targetY, state.pos.y + descentSpeed * dt);
          state.vel.y = descentSpeed;
        }
        state.pitch *= Math.max(0, 1 - dt * 5.0);
        state.roll *= Math.max(0, 1 - dt * 5.0);
        const alignedOnPad = !funnelToPad || Math.hypot(state.pos.x - ISLE_X, state.pos.z - ISLE_Z) < 0.65;
        if (Math.abs(state.pos.y - targetY) <= 0.16 && alignedOnPad) {
          if (funnelToPad) {
            state.pos.set(ISLE_X, targetY, ISLE_Z);
            state.yaw = -Math.PI * 0.72;
          } else {
            state.pos.y = targetY;
          }
          state.vel.set(0, 0, 0);
          state.phase = 'parked';
          state.hatchTargetOpen = true;
          if (window.CozyAudio && window.CozyAudio.shonk) window.CozyAudio.shonk();
          if (window.showToast) {
            window.showToast(
              funnelToPad ? '🏝️ DOCKED ON SHONKBIRD ATOLL PAD!' : '🛸 TOUCHDOWN COMPLETE!',
              'Glowing boarding stairs deployed! Press [E] to step out—walk away to fold the secret base shut.'
            );
          }
        }
      } else if (state.phase === 'parked') {
        // Parked: pressing Space or W smoothly initiates Launch Sequence!
        if (upInput > 0 || fwdInput > 0) {
          state.phase = 'launching';
          state.phaseTimer = 0;
          state.hatchTargetOpen = false;
          playJetsonsHorn();
        } else {
          // Ride the Shonkbird Atoll hydraulic elevator smoothly if parked on it!
          const dIsle = Math.hypot(state.pos.x - ISLE_X, state.pos.z - ISLE_Z);
          if (dIsle < 11.5) {
            state.pos.y = HANGAR_LOWER_Y + state.hangarOpenProg * (HANGAR_RAISED_Y - HANGAR_LOWER_Y) + 1.5;
          }
          state.vel.set(0, 0, 0);
          state.pitch *= 0.9;
          state.roll *= 0.9;
        }
      } else if (state.inSpace) {
        // ====================================================================
        // TRUE 6-DOF FLIGHT SIMULATOR IN SPACE (QUATERNION + SHIP-LOCKED CAM):
        // - W / S = Pitch (Nose Down / Nose Up, invertable in Settings)
        // - A / D = Roll (Aileron / Barrel Roll around ship forward axis)
        // - Q / E = Lateral Strafe (or Rudder Yaw if configured in Settings)
        // - Mouse Move = Smooth Pitch & Yaw flight-stick steering
        // - Mouse Wheel = Throttle / Speed (-30% Reverse .. 0% Stop .. 100% Cruise)
        // - Shift = Afterburner Surge
        // - Space & C = Reserved for planetary worlds (disabled by default)
        // ====================================================================
        state.isSubmerged = false;
        state.antiGravCushionActive = false;
        state.orbitalCeilingReached = true;

        const gs = window.gameSettings || {};
        const spaceFlightStyle = gs.ufoSpaceFlightStyle || 'coupled'; // 'coupled' | 'newtonian'
        const autoLevelRoll = !!gs.ufoSpaceAutoLevelRoll;
        const allowSpaceVerticalKeys = !!gs.ufoSpaceVerticalKeys;
        const invertSpacePitch = !!gs.ufoSpaceInvertPitch;
        const mouseXMode = gs.ufoSpaceMouseXMode || 'roll'; // 'roll' (Flight Stick) | 'yaw'
        const sens = typeof gs.mouseSens === 'number' ? gs.mouseSens : 1.0;

        // 1. Consume accumulated mouse flight-stick deltas & combine with W/S Pitch, A/D Roll, Q/E Rudder Yaw
        const mdx = state.spaceMouseDx || 0;
        const mdy = state.spaceMouseDy || 0;
        state.spaceMouseDx = 0;
        state.spaceMouseDy = 0;

        // Pressing 'X' snaps throttle cleanly to 0% (All Stop)
        if (k['x']) {
          state.spaceThrottle = 0;
        }

        // Pitch: W/S + Mouse Y
        const pitchSign = invertSpacePitch ? -1 : 1;
        const keyPitchRate = fwdInput * 1.65 * pitchSign;
        const mousePitchVel = (mdy * 0.0022 * sens * (gs.invertY ? -1 : 1)) / Math.max(0.008, dt);
        const targetPitchRate = keyPitchRate + Math.max(-2.6, Math.min(2.6, mousePitchVel));
        state.spaceAngVelPitch += (targetPitchRate - state.spaceAngVelPitch) * Math.min(1.0, dt * 10.0);

        // Pure Rudder Yaw (Flat Spin): Q/E turns ship horizontally around its vertical axis (180° in ~1.5s, 360° in ~3s)
        const keyYawRate = -strafeInput * 2.1;
        const mouseYawVel = (mouseXMode === 'yaw') ? ((-mdx * 0.0024 * sens) / Math.max(0.008, dt)) : 0;
        const targetYawRate = keyYawRate + Math.max(-2.6, Math.min(2.6, mouseYawVel));
        state.spaceAngVelYaw += (targetYawRate - state.spaceAngVelYaw) * Math.min(1.0, dt * 12.0);

        // Roll (Aileron / Barrel Roll): Mouse X (by default) + A/D fallback/alternative!
        const keyRollRate = -turnInput * 2.45;
        const mouseRollVel = (mouseXMode === 'roll') ? ((mdx * 0.0030 * sens) / Math.max(0.008, dt)) : 0;
        const targetRollRate = keyRollRate + Math.max(-3.2, Math.min(3.2, mouseRollVel));
        state.spaceAngVelRoll += (targetRollRate - state.spaceAngVelRoll) * Math.min(1.0, dt * 9.0);

        // Apply incremental local-axis rotations to Quaternion (zero gimbal lock!)
        const qPitch = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), state.spaceAngVelPitch * dt);
        const qYaw = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), state.spaceAngVelYaw * dt);
        const qRoll = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), state.spaceAngVelRoll * dt);
        state.spaceQuat.multiply(qYaw).multiply(qPitch).multiply(qRoll).normalize();

        // Sync Euler readout for Artificial Horizon & HUD Heading
        const syncedEuler = new THREE.Euler().setFromQuaternion(state.spaceQuat, 'YXZ');
        state.pitch = syncedEuler.x;
        state.yaw = syncedEuler.y;
        state.roll = syncedEuler.z;
        state.yawRate = state.spaceAngVelYaw;

        if (autoLevelRoll && turnInput === 0 && Math.abs(state.spaceAngVelRoll) < 0.25) {
          const levelEuler = new THREE.Euler().setFromQuaternion(state.spaceQuat, 'YXZ');
          levelEuler.z += (0 - levelEuler.z) * Math.min(1.0, dt * 2.2);
          state.spaceQuat.setFromEuler(levelEuler).normalize();
        }

        // 2. Derive True 3D Ship Basis Vectors from Quaternion
        const shipFwd = new THREE.Vector3(0, 0, 1).applyQuaternion(state.spaceQuat).normalize();
        const shipUp = new THREE.Vector3(0, 1, 0).applyQuaternion(state.spaceQuat).normalize();

        // 3. Separate Throttle Speed (Mouse Wheel) + Afterburner (Shift) — pure forward/reverse flight along nose!
        const hyperSelected = activeModuleIdx === 3;
        const boostMult = turbo ? ((hyperSelected || state.hyperdriveTimer > 0) ? 2.25 : 1.75) : 1.0;
        const thr = state.spaceThrottle || 0;
        const cruiseSpeed = thr * 42.0 * boostMult;

        const targetVel = new THREE.Vector3();
        targetVel.addScaledVector(shipFwd, cruiseSpeed);
        if (allowSpaceVerticalKeys && upInput !== 0) {
          targetVel.addScaledVector(shipUp, upInput * 22.0 * (turbo ? 1.45 : 1.0));
        }

        if (spaceFlightStyle === 'newtonian') {
          const hasInput = Math.abs(thr) > 0.02 || (allowSpaceVerticalKeys && upInput !== 0);
          if (hasInput) {
            state.vel.x += (targetVel.x - state.vel.x) * Math.min(1.0, dt * (turbo ? 3.8 : 2.6));
            state.vel.y += (targetVel.y - state.vel.y) * Math.min(1.0, dt * (turbo ? 3.8 : 2.6));
            state.vel.z += (targetVel.z - state.vel.z) * Math.min(1.0, dt * (turbo ? 3.8 : 2.6));
          } else {
            state.vel.multiplyScalar(Math.max(0, 1.0 - dt * 0.2));
          }
        } else {
          // Coupled Flight Assist: nose-aligned velocity so rudder turns pivot cleanly with zero sideways slide!
          const resp = turbo ? 7.5 : 6.0;
          state.vel.x += (targetVel.x - state.vel.x) * Math.min(1.0, dt * resp);
          state.vel.y += (targetVel.y - state.vel.y) * Math.min(1.0, dt * resp);
          state.vel.z += (targetVel.z - state.vel.z) * Math.min(1.0, dt * resp);
        }

        if (state.inHyperspace) {
          // MOJO HYPERSPACE CROSSROADS — FULL 6-DOF SPACE FLIGHT + GENTLE SLIPSTREAM GUIDANCE:
          // You keep full 360° barrel rolls (A/D or Mouse), Rudder Yaw (Q/E), and Pitch (W/S or Mouse) from spaceQuat above!
          const keySteerX = Math.max(-1, Math.min(1, -turnInput + strafeInput));
          const keySteerY = fwdInput;

          // Combine nose-pointed 3D space flight vector with direct lateral/vertical maneuver authority inside the vast 68m wormhole
          const noseLatX = shipFwd.x * 38.0;
          const noseLatY = shipFwd.y * 32.0;
          const desiredVx = noseLatX + keySteerX * 26.0;
          const desiredVy = noseLatY + keySteerY * 20.0;
          const desiredVz = (shipFwd.z + 1.0) * 18.0 - state.pos.z * 1.8;

          const handsOff =
            Math.abs(keySteerX) < 0.05 &&
            Math.abs(keySteerY) < 0.05 &&
            Math.abs(mdx) < 0.5 &&
            Math.abs(mdy) < 0.5;

          // Gentle slipstream current pulls you softly toward the middle cruising lane when hands-off,
          // so you must deliberately fly out to the outer doorway wall (|x| >= 30m) to exit!
          const centerPullX = handsOff ? -state.pos.x * 0.65 : -state.pos.x * 0.15;
          const centerPullY = handsOff ? -state.pos.y * 0.65 : -state.pos.y * 0.15;

          state.vel.x += (desiredVx + centerPullX - state.vel.x) * Math.min(1.0, dt * 5.5);
          state.vel.y += (desiredVy + centerPullY - state.vel.y) * Math.min(1.0, dt * 5.5);
          state.vel.z += (desiredVz - state.vel.z) * Math.min(1.0, dt * 4.5);

          state.pos.addScaledVector(state.vel, dt);

          // Cushion softly inside the vast 68m wormhole cylinder (max flyable radius 54m)
          const rXY = Math.hypot(state.pos.x, state.pos.y);
          if (rXY > 54.0) {
            const scale = 54.0 / rXY;
            state.pos.x *= scale;
            state.pos.y *= scale;
          }
          state.pos.z = Math.max(-42.0, Math.min(14.0, state.pos.z));

          // Gentle downstream nose-alignment magnet (keeps you pointed generally down the wormhole while leaving 360° Barrel Roll completely free!)
          const downstreamDir = new THREE.Vector3(0, 0, -1);
          const curFwd = new THREE.Vector3(0, 0, 1).applyQuaternion(state.spaceQuat).normalize();
          const alignQuat = new THREE.Quaternion().setFromUnitVectors(curFwd, downstreamDir);
          const slerpStrength = handsOff ? Math.min(1.0, dt * 1.8) : Math.min(1.0, dt * 0.75);
          const stepAlign = new THREE.Quaternion().slerp(alignQuat, slerpStrength);
          state.spaceQuat.premultiply(stepAlign).normalize();

          const syncedH = new THREE.Euler().setFromQuaternion(state.spaceQuat, 'YXZ');
          state.pitch = syncedH.x;
          state.yaw = syncedH.y;
          state.roll = syncedH.z;
        } else if (state.inCheeseMoon && window.BlahajCheeseMoon && typeof window.BlahajCheeseMoon.getPlanetCenter === 'function') {
          const pCenter = window.BlahajCheeseMoon.getPlanetCenter();
          const oldRadial = new THREE.Vector3().subVectors(state.pos, pCenter);
          const oldDist = oldRadial.length() || 1;
          oldRadial.divideScalar(oldDist);

          state.pos.addScaledVector(state.vel, dt);

          const newRadial = new THREE.Vector3().subVectors(state.pos, pCenter);
          const newDist = newRadial.length() || 1;
          newRadial.divideScalar(newDist);

          // Spherical Planetoid Gravity Curvature: rotate ship frame & velocity by the exact arc traveled around the planetoid,
          // so flying straight follows the curved canyon floor automatically in a 360° circle around the planetoid!
          const gravBendQuat = new THREE.Quaternion().setFromUnitVectors(oldRadial, newRadial);
          state.spaceQuat.premultiply(gravBendQuat).normalize();
          state.vel.applyQuaternion(gravBendQuat);

          // Keep outer orbital ceiling around planetoid center (max 275m from center)
          if (newDist > 275.0) {
            state.pos.copy(pCenter).addScaledVector(newRadial, 275.0);
          }
          const syncedE = new THREE.Euler().setFromQuaternion(state.spaceQuat, 'YXZ');
          state.pitch = syncedE.x;
          state.yaw = syncedE.y;
          state.roll = syncedE.z;
        } else {
          state.pos.addScaledVector(state.vel, dt);
          state.pos.x = Math.max(-355, Math.min(355, state.pos.x));
          state.pos.z = Math.max(-355, Math.min(355, state.pos.z));
          state.pos.y = Math.max(-165, Math.min(175, state.pos.y));
        }

        // After clearing all destructible asteroids in Deep Space, holding [Shift] (or Mojo Hyperdrive) for 5s warps to the Swiss Cheese Planetoid!
        if (!state.inCheeseMoon && window.BlahajSpace && typeof window.BlahajSpace.getSectorStatus === 'function') {
          const secStat = window.BlahajSpace.getSectorStatus();
          const sectorCleared = !!(secStat && (secStat.waveCleared || secStat.remainingRocks === 0));
          if (sectorCleared && turbo) {
            const prevSec = Math.floor(state.warpChargeTimer);
            state.warpChargeTimer += dt;
            const curSec = Math.floor(state.warpChargeTimer);
            if (curSec > prevSec && curSec <= 4) {
              spawnRadarWave(0xfacc15, 24 + curSec * 4);
            }
            if (state.warpChargeTimer >= 5.0) {
              state.warpChargeTimer = 0;
              state.hyperdriveTimer = 0;
              if (window.BlahajGame && typeof window.BlahajGame.enterHyperspace === 'function') {
                window.BlahajGame.enterHyperspace(true);
              } else if (window.BlahajGame && typeof window.BlahajGame.enterCheeseMoon === 'function') {
                window.BlahajGame.enterCheeseMoon(true);
              }
            }
          } else {
            state.warpChargeTimer = Math.max(0, state.warpChargeTimer - dt * 1.8);
          }
        }
      } else {
        // FLYING / ORBITAL CRUISE ON PLANETARY WORLDS (Smooth Flight-Sim feel, impossible to crash!)
        // When W is pressed in exterior view (and not manually holding A/D), smoothly steer toward the camera's 3D vector!
        let camTurnBank = 0;
        let camClimbElev = 0;
        if (fwdInput > 0 && state.viewMode === 'outside' && camState && turnInput === 0) {
          const camDesiredYaw = Math.atan2(-Math.sin(camState.yaw), -Math.cos(camState.yaw));
          let yDiff = camDesiredYaw - state.yaw;
          while (yDiff > Math.PI) yDiff -= Math.PI * 2;
          while (yDiff < -Math.PI) yDiff += Math.PI * 2;
          if (Math.abs(yDiff) > 0.01) {
            const steerStep = yDiff * Math.min(1.0, dt * 3.6);
            state.yaw += steerStep;
            camTurnBank = Math.max(-0.35, Math.min(0.35, -yDiff * 0.45));
          }
          // Vertical climb/dive from camera pitch relative to neutral chase pitch (0.22 rad)
          const rawElev = 0.22 - camState.pitch;
          if (Math.abs(rawElev) > 0.06) {
            camClimbElev = Math.max(-0.65, Math.min(0.65, rawElev));
          }
        }

        state.yawRate += (turnInput * 1.65 - state.yawRate) * Math.min(1.0, dt * 6.5);
        state.yaw += state.yawRate * dt;

        if (state.inSpace) {
          state.isSubmerged = false;
        } else {
          const waterY = (window.BlahajWorld && typeof window.BlahajWorld.getWaveHeight === 'function')
            ? window.BlahajWorld.getWaveHeight(state.pos.x, state.pos.z, elapsed)
            : 0.22;
          const wasSubmerged = !!state.isSubmerged;
          state.isSubmerged = state.pos.y < waterY;
          if (state.isSubmerged !== wasSubmerged) {
            if (window.CozyAudio && window.CozyAudio.waterSplash) window.CozyAudio.waterSplash(0.32, 0.48);
            if (window.BlahajGame && typeof window.BlahajGame.spawnWaterBreachSplash === 'function') {
              window.BlahajGame.spawnWaterBreachSplash(state.pos, state.isSubmerged ? 2.0 : 2.5, waterY);
            }
            if (!state.isSubmerged) {
              // Breached out of water: coat the 3D glass capsule bubble with wiggly droplets for 3 seconds!
              state.windscreenWetTimer = 3.0;
              seedWindscreenDroplets();
            } else {
              state.windscreenWetTimer = 0;
            }
            if (window.showToast) {
              window.showToast(
                state.isSubmerged ? '🌊 HYDRO-SUBMERGED!' : '🚀 BREACHED OCEAN SURFACE!',
                state.isSubmerged
                  ? 'Cruising beneath the waves! Press [Space] to ascend or [L] to land on the seabed.'
                  : 'Back in open sky!'
              );
            }
          }
        }

        const hyperSelected = activeModuleIdx === 3;
        const hyperMult = ((hyperSelected && turbo) || state.hyperdriveTimer > 0) ? 1.48 : 1.0;
        const hydroScale = state.isSubmerged ? 0.72 : 1.0;
        const maxHorizSpeed = (turbo ? 64.0 : 28.0) * hydroScale * hyperMult;
        const maxStrafeSpeed = (turbo ? 40.0 : 22.0) * hydroScale * hyperMult;
        const fwdX = Math.sin(state.yaw);
        const fwdZ = Math.cos(state.yaw);
        const rightX = -Math.cos(state.yaw);
        const rightZ = Math.sin(state.yaw);
        const targetVx = fwdX * fwdInput * maxHorizSpeed + rightX * strafeInput * maxStrafeSpeed;
        const targetVz = fwdZ * fwdInput * maxHorizSpeed + rightZ * strafeInput * maxStrafeSpeed;

        const accelRate = turbo ? 5.2 : 3.2;
        state.vel.x += (targetVx - state.vel.x) * Math.min(1.0, dt * accelRate);
        state.vel.z += (targetVz - state.vel.z) * Math.min(1.0, dt * accelRate);

        const targetVy = upInput !== 0
          ? upInput * (turbo ? 26.0 : 14.0)
          : Math.sin(camClimbElev) * maxHorizSpeed * 0.72;
        state.vel.y += (targetVy - state.vel.y) * Math.min(1.0, dt * 4.5);

        state.pos.addScaledVector(state.vel, dt);

        // Keep within expansive archipelago bounds (+/- 360m) with gentle turnback
        state.pos.x = Math.max(-355, Math.min(355, state.pos.x));
        state.pos.z = Math.max(-355, Math.min(355, state.pos.z));

        if (state.inSpace) {
          state.pos.y = Math.max(-135, Math.min(145, state.pos.y));
          state.antiGravCushionActive = false;
          state.orbitalCeilingReached = true;
          state.warpChargeTimer = 0;
        } else {
          // ANTI-CRASH TERRAIN & OCEAN CUSHION (Smooth, zero-bounce glide!)
          const minSafeY = getSafeGroundHeight(state.pos.x, state.pos.z) + 2.6;
          if (state.pos.y < minSafeY) {
            state.pos.y = minSafeY;
            if (state.vel.y < 0) state.vel.y = 0;
            state.antiGravCushionActive = true;
          }

          // KARMAN ORBITAL BAND (145m up to the 185m Service Ceiling!)
          const ORBITAL_WARP_MIN_Y = KARMAN_CEILING_Y - 40.0; // 145m to 185m
          if (state.pos.y >= KARMAN_CEILING_Y) {
            state.pos.y = KARMAN_CEILING_Y;
            if (state.vel.y > 0) state.vel.y = 0;
          }
          if (state.pos.y >= ORBITAL_WARP_MIN_Y) {
            state.orbitalCeilingReached = true;
            if (!state.orbitalNoticeShown) {
              state.orbitalNoticeShown = true;
              playJetsonsHorn();
              if (window.showToast) {
                window.showToast(
                  '🌌 ENTERED UPPER ORBITAL BAND (145m–185m)!',
                  'Hold [Shift] + [W] steady for 6 seconds to open a Warp Portal into Deep Space!'
                );
              }
            }
          } else if (state.pos.y < ORBITAL_WARP_MIN_Y - 6.0) {
            state.orbitalCeilingReached = false;
            state.orbitalNoticeShown = false;
          }

          // 6-SECOND ORBITAL TURBO WARP PORTAL SEQUENCE (No extra steps—just fly in the 145m–185m band with Shift + W held!)
          const inOrbitalBand = state.pos.y >= ORBITAL_WARP_MIN_Y;
          const holdingTurboFlight = turbo && (fwdInput > 0 || Math.hypot(state.vel.x, state.vel.z) > 36.0);
          if (inOrbitalBand && holdingTurboFlight) {
            const partnerActiveOnIsland = Boolean(
              window.coopPartner &&
              window.coopPartner.active &&
              (!window.coopPartner.zone || window.coopPartner.zone === 'island' || window.coopPartner.zone === 'overworld')
            );
            const partnerSeated = Boolean(state.passengerClientId);
            if (partnerActiveOnIsland && !partnerSeated) {
              state.warpChargeTimer = Math.max(0, state.warpChargeTimer - dt * 2.0);
              const nowMs = performance.now();
              if (nowMs - state.lastPartnerWarnAt > 4200) {
                state.lastPartnerWarnAt = nowMs;
                if (window.showToast) {
                  window.showToast(
                    '🦈 CO-OP PARTNER REQUIRED ABOARD!',
                    `Pick up ${window.coopPartner.name || 'your partner'} in the Passenger Seat before jumping to Deep Space!`
                  );
                }
              }
            } else {
              const prevSec = Math.floor(state.warpChargeTimer);
              state.warpChargeTimer += dt;
              const curSec = Math.floor(state.warpChargeTimer);
              if (curSec > prevSec && curSec <= 5) {
                spawnRadarWave(curSec >= 4 ? 0xe879f9 : 0x38bdf8, 22 + curSec * 4);
              }
              if (state.warpChargeTimer >= 6.0) {
                state.warpChargeTimer = 0;
                state.hyperdriveTimer = 0;
                if (window.BlahajGame && typeof window.BlahajGame.enterSpaceMap === 'function') {
                  window.BlahajGame.enterSpaceMap(true);
                }
              }
            }
          } else {
            state.warpChargeTimer = Math.max(0, state.warpChargeTimer - dt * 1.8);
          }
        }

        // Auto-leveling flight-sim pitch & bank (combines A/D turn bank + Q/E strafe bank + camera-vector steering)
        const desiredPitch = camClimbElev !== 0 ? -camClimbElev * 0.42 : fwdInput * (turbo ? 0.22 : 0.14);
        const desiredRoll = Math.max(-0.46, Math.min(0.46, -turnInput * 0.34 + strafeInput * 0.32 + camTurnBank));
        state.pitch += (desiredPitch - state.pitch) * Math.min(1.0, dt * 5.0);
        state.roll += (desiredRoll - state.roll) * Math.min(1.0, dt * 5.5);
      }

      state.speed = state.inSpace
        ? Math.hypot(state.vel.x, state.vel.y, state.vel.z)
        : Math.hypot(state.vel.x, state.vel.z);
      state.verticalSpeed = state.vel.y;

      updateJetsonsEngineHum(
        state.phase !== 'parked',
        Math.min(1, state.speed / 35),
        Math.min(1, state.pos.y / KARMAN_CEILING_Y),
        state.turboActive
      );
      broadcastState(false);
    } else if (state.hasRemoteSync && (state.pilotClientId || Date.now() - state.lastRemotePacketAt < 25000)) {
      // Smooth 220ms Mobile Snapshot Buffer Interpolation (absorbs slow mobile cellular packet jitter cleanly!)
      const snaps = state.remoteSnapshots;
      const renderTime = performance.now() - 220;
      let targetX = state.remoteTargetPos.x;
      let targetY = state.remoteTargetPos.y;
      let targetZ = state.remoteTargetPos.z;
      let targetYaw = state.remoteTargetYaw;
      let targetPitch = state.remoteTargetPitch;
      let targetRoll = state.remoteTargetRoll;

      if (snaps.length >= 2) {
        // Trim snapshots older than needed while keeping one just before renderTime
        while (snaps.length > 2 && snaps[1].t <= renderTime) {
          snaps.shift();
        }
        const a = snaps[0];
        const b = snaps[1];
        if (renderTime >= a.t && renderTime <= b.t && b.t > a.t) {
          const u = (renderTime - a.t) / (b.t - a.t);
          targetX = a.x + (b.x - a.x) * u;
          targetY = a.y + (b.y - a.y) * u;
          targetZ = a.z + (b.z - a.z) * u;
          let dyaw = b.yaw - a.yaw;
          while (dyaw < -Math.PI) dyaw += Math.PI * 2;
          while (dyaw > Math.PI) dyaw -= Math.PI * 2;
          targetYaw = a.yaw + dyaw * u;
          targetPitch = a.pitch + (b.pitch - a.pitch) * u;
          let drollSnap = b.roll - a.roll;
          while (drollSnap < -Math.PI) drollSnap += Math.PI * 2;
          while (drollSnap > Math.PI) drollSnap -= Math.PI * 2;
          targetRoll = a.roll + drollSnap * u;
        } else {
          // Slightly ahead of latest snapshot: gently cap lead to 0.06s
          const latest = snaps[snaps.length - 1];
          const extra = Math.min(0.06, Math.max(0, (renderTime - latest.t) * 0.001));
          targetX = latest.x + state.remoteTargetVel.x * extra;
          targetY = latest.y + state.remoteTargetVel.y * extra;
          targetZ = latest.z + state.remoteTargetVel.z * extra;
          targetYaw = latest.yaw;
          targetPitch = latest.pitch;
          targetRoll = latest.roll;
        }
      }

      const dxE = targetX - state.pos.x;
      const dyE = targetY - state.pos.y;
      const dzE = targetZ - state.pos.z;
      const errDist = Math.hypot(dxE, dyE, dzE);
      if (errDist > 60.0) {
        state.pos.set(targetX, targetY, targetZ);
      } else {
        const alpha = 1.0 - Math.exp(-16.0 * dt);
        state.pos.x += dxE * alpha;
        state.pos.y += dyE * alpha;
        state.pos.z += dzE * alpha;
      }
      const rotAlpha = 1.0 - Math.exp(-16.0 * dt);
      if (state.inSpace && state.remoteTargetQuat && state.remoteTargetQuat.lengthSq() > 0.5) {
        state.spaceQuat.slerp(state.remoteTargetQuat, rotAlpha);
        const remE = new THREE.Euler().setFromQuaternion(state.spaceQuat, 'YXZ');
        state.pitch = remE.x;
        state.yaw = remE.y;
        state.roll = remE.z;
      } else {
        let yd = targetYaw - state.yaw;
        while (yd < -Math.PI) yd += Math.PI * 2;
        while (yd > Math.PI) yd -= Math.PI * 2;
        state.yaw += yd * rotAlpha;
        state.pitch += (targetPitch - state.pitch) * rotAlpha;
        let rd = targetRoll - state.roll;
        while (rd < -Math.PI) rd += Math.PI * 2;
        while (rd > Math.PI) rd -= Math.PI * 2;
        state.roll += rd * rotAlpha;
      }
      state.speed = state.remoteTargetVel.length() > 0.2
        ? state.remoteTargetVel.length()
        : errDist * 8.0;
      state.verticalSpeed = state.remoteTargetVel.y || 0;
      state.orbitalCeilingReached = state.pos.y >= KARMAN_CEILING_Y - 4.0;
      updateJetsonsEngineHum(state.localRole === 'passenger' && state.phase !== 'parked', Math.min(1, state.speed / 35), Math.min(1, state.pos.y / KARMAN_CEILING_Y), state.turboActive);
    } else {
      // Unoccupied UFO: handle autopilot summoned landing OR parked gently on Shonkbird Atoll elevator!
      if (state.phase === 'landing') {
        const targetY = getSaucerTouchdownY(state.pos.x, state.pos.z, state.yaw);
        const descentSpeed = Math.max(3.2, Math.min(11.0, (state.pos.y - targetY) * 1.65));
        state.pos.y = Math.max(targetY, state.pos.y - descentSpeed * dt);
        state.pitch *= Math.max(0, 1 - dt * 5.0);
        state.roll *= Math.max(0, 1 - dt * 5.0);
        state.hatchTargetOpen = true;
        if (state.pos.y <= targetY + 0.12) {
          state.pos.y = targetY;
          state.phase = 'parked';
          state.vel.set(0, 0, 0);
          if (window.CozyAudio && window.CozyAudio.shonk) window.CozyAudio.shonk();
          if (window.showToast) {
            window.showToast('🛸 SAUCER LANDED! BOARDING STAIRS OPEN', 'Walk to the glowing cyan ring at the stairs and press [E] to board!');
          }
          broadcastState(true);
        }
      } else {
        const dIsle = Math.hypot(state.pos.x - ISLE_X, state.pos.z - ISLE_Z);
        if (dIsle < 11.5 && state.phase === 'parked') {
          state.pos.y = HANGAR_LOWER_Y + state.hangarOpenProg * (HANGAR_RAISED_Y - HANGAR_LOWER_Y) + 1.5;
          // Auto-retract UFO & fold secret Thunderbirds island back up once player walks away!
          if (state.hangarTargetOpen && !state.localRole && !state.pilotClientId && !state.passengerClientId && window.player && window.player.pos) {
            const pDist = Math.hypot(window.player.pos.x - ISLE_X, window.player.pos.z - ISLE_Z);
            if (pDist > 16.5) {
              state.hangarTargetOpen = false;
              state.hatchTargetOpen = false;
              playHangarKlaxon();
              if (window.showToast) {
                window.showToast('🌴 SECRET BASE FOLDING SHUT…', 'Lowering S.S. Shonk-Saucer into the silo & sealing the turquoise pool!');
              }
              broadcastState(true);
            }
          }
        }
      }
      state.speed = 0;
      state.verticalSpeed = 0;
    }

    // 5. Apply Transform + Subtle Hover Bob to 3D UFO Mesh & refresh world matrix BEFORE reading seat anchors!
    const hoverBob = (state.phase === 'parked' || state.inSpace) ? 0 : Math.sin(elapsed * 2.8) * 0.14;
    ufoGroup.position.set(state.pos.x, state.pos.y + hoverBob, state.pos.z);
    if (state.inSpace) {
      ufoGroup.quaternion.copy(state.spaceQuat);
    } else {
      ufoGroup.rotation.order = 'YXZ';
      ufoGroup.rotation.set(state.pitch, state.yaw, state.roll);
    }
    ufoGroup.updateMatrixWorld(true);
    updateWindscreenWaterEffects(dt, elapsed);

    // Thruster flame scaling
    const thrustScale = state.phase === 'parked' ? 0.18 : (0.7 + Math.min(1.2, state.speed / 24) + (state.turboActive ? 0.9 : 0));
    thrusterCones.forEach((tc) => {
      tc.mesh.scale.set(1, thrustScale + Math.sin(elapsed * 22.0) * 0.12, 1);
      tc.mat.color.setHex(state.turboActive ? 0xf472b6 : (state.orbitalCeilingReached ? 0xc084fc : 0x38bdf8));
    });

    // 5a. Animate 3D Orbital Mach Shockwave & Warp Portal Vortex during 6-second Hyperdrive Charge!
    if (warpPortalGroup) {
      const wpProg = Math.max(0, Math.min(1.0, (state.warpChargeTimer || 0) / 6.0));
      warpPortalGroup.visible = wpProg > 0.02;
      if (warpPortalGroup.visible) {
        if (warpShockConeMesh) {
          warpShockConeMesh.material.opacity = Math.min(0.62, wpProg * 0.72) * (0.8 + 0.2 * Math.sin(elapsed * 24.0));
          const coneScale = 0.65 + wpProg * 0.65;
          warpShockConeMesh.scale.set(coneScale, 0.8 + wpProg * 0.5, coneScale);
          warpShockConeMesh.rotation.y = elapsed * 4.5;
        }
        if (warpRingOuterMesh) {
          const ringAppear = Math.max(0, (wpProg - 0.18) / 0.82);
          warpRingOuterMesh.material.opacity = ringAppear * 0.85;
          warpRingOuterMesh.scale.setScalar(0.35 + ringAppear * 1.15);
          warpRingOuterMesh.position.z = 5.4 - ringAppear * 5.2;
          warpRingOuterMesh.rotation.z = elapsed * 5.2;
        }
        if (warpRingInnerMesh) {
          const innerAppear = Math.max(0, (wpProg - 0.28) / 0.72);
          warpRingInnerMesh.material.opacity = innerAppear * 0.9;
          warpRingInnerMesh.scale.setScalar(0.25 + innerAppear * 1.25);
          warpRingInnerMesh.position.z = 5.8 - innerAppear * 5.6;
          warpRingInnerMesh.rotation.z = -elapsed * 7.4;
        }
        if (warpEngulfSphereMesh) {
          const engulf = Math.max(0, (wpProg - 0.62) / 0.38);
          warpEngulfSphereMesh.material.opacity = engulf * engulf * 0.88;
          warpEngulfSphereMesh.scale.setScalar(0.55 + engulf * 0.75);
        }
      }
    }

    // 5b. Lock Remote Co-op Partner Shark directly into their UFO seat (prevents floating in the sky!)
    if (window.coopPartner && window.coopPartner.active && window.coopPartner.mesh) {
      const partnerIsPilot = !!(state.pilotClientId && state.localRole !== 'pilot');
      const partnerIsPassenger = !!(state.passengerClientId && state.localRole !== 'passenger');
      if (partnerIsPilot || partnerIsPassenger) {
        const partnerAnchor = partnerIsPilot ? seatPilotAnchor : seatPassengerAnchor;
        const partnerSeat = new THREE.Vector3();
        partnerAnchor.getWorldPosition(partnerSeat);
        window.coopPartner.mesh.position.copy(partnerSeat);
        if (state.inSpace) {
          window.coopPartner.mesh.quaternion.copy(ufoGroup.quaternion);
        } else {
          window.coopPartner.mesh.rotation.order = 'YXZ';
          window.coopPartner.mesh.rotation.set(state.pitch, state.yaw, state.roll);
        }
        window.coopPartner.mesh.visible = true;
        if (window.coopPartner.targetPos) window.coopPartner.targetPos.copy(partnerSeat);
        window.coopPartner.targetRotY = state.yaw;
      }
    }

    // 6. Position Local Player Shark Visibly Inside the Glass Bubble Canopy!
    if (state.localRole && window.player && window.player.mesh) {
      const anchor = state.localRole === 'pilot' ? seatPilotAnchor : seatPassengerAnchor;
      const worldSeat = new THREE.Vector3();
      anchor.getWorldPosition(worldSeat);
      window.player.pos.copy(worldSeat);
      window.player.rotY = state.yaw;
      window.player.mesh.position.copy(worldSeat);
      if (state.inSpace) {
        window.player.mesh.quaternion.copy(ufoGroup.quaternion);
      } else {
        window.player.mesh.rotation.order = 'YXZ';
        window.player.mesh.rotation.set(state.pitch, state.yaw, state.roll);
      }
      // Hide local shark mesh & glass dome overdraw in Inside Cockpit View so windshield is 100% crisp & fast!
      window.player.mesh.visible = (state.viewMode !== 'inside');
      if (canopyDomeMesh) canopyDomeMesh.visible = (state.viewMode !== 'inside');

      // Floor Cam [G] (LCD Glass-Bottom Boat Mode + Hidden Bubble Brace Arches when inside!)
      const floorCamOn = !!(state.viewMode === 'inside' && state.floorCam);
      floorSolidMeshes.forEach((m) => { if (m) m.visible = !floorCamOn; });
      if (hatchDoorMesh && floorCamOn) hatchDoorMesh.visible = false;
      canopyRibs.forEach((r) => { if (r) r.visible = !floorCamOn; });
      if (floorLcdGroup) floorLcdGroup.visible = floorCamOn;

      // Drive Camera for Inside Cockpit View (Per-Seat Shark POV!) vs Outside Chase View!
      if (camera && camState) {
        // Auto-return Middle-Click free-look pan smoothly to straight ahead when released!
        if (state.inSpace && !camState.isMiddleDown) {
          state.spacePanYaw += (0 - (state.spacePanYaw || 0)) * Math.min(1.0, dt * 7.5);
          state.spacePanPitch += (0 - (state.spacePanPitch || 0)) * Math.min(1.0, dt * 7.5);
        }
        if (state.viewMode === 'inside') {
          if (!camState.isMiddleDown) {
            state.cockpitLookYaw += (0 - state.cockpitLookYaw) * Math.min(1.0, dt * 7.5);
            state.cockpitLookPitch += (0 - state.cockpitLookPitch) * Math.min(1.0, dt * 7.5);
          }
          ufoGroup.updateMatrixWorld(true);
          const eyeAnchor = (state.localRole === 'passenger' && passengerEyeAnchor)
            ? passengerEyeAnchor
            : (pilotEyeAnchor || cockpitCamAnchor);
          const camWorld = new THREE.Vector3();
          eyeAnchor.getWorldPosition(camWorld);
          const eyeLocalX = state.localRole === 'passenger' ? 1.05 : -1.05;
          const lookDist = 11.4;
          const panY = state.cockpitLookYaw;
          const panP = state.cockpitLookPitch;
          const lx = eyeLocalX + Math.sin(panY) * Math.cos(panP) * lookDist;
          const ly = 1.88 + Math.sin(panP) * lookDist - 0.18;
          const lz = 0.98 + Math.cos(panY) * Math.cos(panP) * lookDist;
          const lookWorld = new THREE.Vector3(lx, ly, lz);
          ufoGroup.localToWorld(lookWorld);
          const shipUpCam = new THREE.Vector3(0, 1, 0).applyQuaternion(ufoGroup.quaternion).normalize();
          camState.customOverride = { pos: camWorld, lookAt: lookWorld, up: state.inSpace ? shipUpCam : null };
        } else if (state.inSpace) {
          // Ship-Locked Flight-Sim Chase Camera in Space (Middle-Click orbits centered directly on the ship!)
          ufoGroup.updateMatrixWorld(true);
          const pYaw = state.spacePanYaw || 0;
          const pPitch = state.spacePanPitch || 0;
          const panBlend = Math.min(1.0, Math.hypot(pYaw, pPitch) * 2.4);
          const camDist = 17.2;
          const orbitCenterY = 1.2;
          const localCamOffset = new THREE.Vector3(
            -Math.sin(pYaw) * Math.cos(pPitch) * camDist,
            orbitCenterY + (1 - panBlend) * 3.1 + Math.sin(pPitch) * camDist * 0.85,
            -Math.cos(pYaw) * Math.cos(pPitch) * camDist
          );
          const chasePos = localCamOffset.clone();
          ufoGroup.localToWorld(chasePos);
          // Blend look target from ahead-of-nose (when flying straight) to the exact ship center (when Middle-Click orbiting)!
          const chaseLook = new THREE.Vector3(0, 1.2 + (1 - panBlend) * 0.2, (1 - panBlend) * 24.0);
          ufoGroup.localToWorld(chaseLook);
          const shipUpCam = new THREE.Vector3(0, 1, 0).applyQuaternion(ufoGroup.quaternion).normalize();
          camState.customOverride = { pos: chasePos, lookAt: chaseLook, up: shipUpCam };
        } else {
          // Exterior Chase View on Planetary Worlds: turn with A/D and smoothly drift back behind the saucer!
          camState.customOverride = null;
          if (camState.distance < 13.5) camState.distance = 15.5;

          // In Space, the mouse points the ship's 3D flight direction directly, so don't fight the pilot's mouse with auto-chase drift!
          if (!state.inSpace && isAutoChaseCamEnabled()) {
            const rearCamYaw = Math.atan2(-Math.sin(state.yaw), -Math.cos(state.yaw));
            const manualOrbitAgo = Date.now() - (camState.lastManualOrbitAt || 0);
            const isDraggingNow = !!(camState.isLeftDragging || camState.isRightDragging);

            // 1. Immediately rotate camera along with A/D saucer turning
            if (Math.abs(state.yawRate) > 0.01) {
              camState.yaw += state.yawRate * dt;
            }

            // 2. Smoothly drift back to rear chase position ONLY when actively turning/propelling or after a longer idle pause
            const kNow = keys || {};
            const isPropelling = !!(kNow['w'] || kNow['arrowup'] || kNow['s'] || kNow['arrowdown']);
            if (!isDraggingNow && (isPropelling || Math.abs(state.yawRate) > 0.05 || manualOrbitAgo > 4500)) {
              let diff = rearCamYaw - camState.yaw;
              while (diff > Math.PI) diff -= Math.PI * 2;
              while (diff < -Math.PI) diff += Math.PI * 2;
              const driftRate = (Math.abs(state.yawRate) > 0.05) ? 4.2 : (isPropelling ? 1.8 : 1.4);
              camState.yaw += diff * Math.min(1.0, dt * driftRate);
              while (camState.yaw > Math.PI) camState.yaw -= Math.PI * 2;
              while (camState.yaw < -Math.PI) camState.yaw += Math.PI * 2;

              if (manualOrbitAgo > 4500) {
                camState.pitch += (0.22 - camState.pitch) * Math.min(1.0, dt * 1.4);
              }
            }
          }
        }
      }

      // Throttled Glass-Cockpit HUD & Artificial Horizon update (~20Hz)
      state.hudTickAccum += dt;
      if (state.hudTickAccum >= 0.05) {
        state.hudTickAccum = 0;
        updateAvionicsHUD();
      }
    } else if (camState && camState.customOverride && !window.isUsingTelescope && !window.isUsingBinoculars) {
      camState.customOverride = null;
      floorSolidMeshes.forEach((m) => { if (m) m.visible = true; });
      canopyRibs.forEach((r) => { if (r) r.visible = true; });
      if (floorLcdGroup) floorLcdGroup.visible = false;
    }
  }

  function initDOMListeners() {
    const bind = (id, fn) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('click', (e) => { e.stopPropagation(); fn(); });
    };
    bind('ufo-btn-view', toggleViewMode);
    bind('ufo-btn-floorcam', toggleFloorCam);
    bind('ufo-btn-land', initiateAutoLand);
    bind('ufo-btn-tracy', resetToTracyIsle);
    bind('ufo-btn-hatch', toggleHatch);
    bind('ufo-btn-beam', toggleTractorBeam);
    bind('ufo-btn-trunk', openSharedVault);
    bind('ufo-btn-disco', toggleDiscoMode);
    bind('ufo-btn-horn', playJetsonsHorn);
    bind('ufo-btn-chasecam', toggleAutoChaseCam);
    bind('ufo-btn-exit', exitUFO);
  }

  function build(scene) {
    if (isBuilt && sceneRef === scene) return;
    sceneRef = scene;
    buildThunderbirdsIsland(scene);
    buildJetsonsUFO(scene);
    initDOMListeners();
    isBuilt = true;
  }

  function setSpaceMode(inSpace, targetScene, isCheeseMoon = false, isHyperspace = false) {
    state.inSpace = !!inSpace;
    state.inCheeseMoon = !!(inSpace && isCheeseMoon && !isHyperspace);
    state.inHyperspace = !!(inSpace && isHyperspace);
    state.warpChargeTimer = 0;
    state.hyperdriveTimer = 0;
    state.isSubmerged = false;
    if (warpPortalGroup) warpPortalGroup.visible = false;

    for (let i = ufoPlasmaBolts.length - 1; i >= 0; i--) {
      const b = ufoPlasmaBolts[i];
      if (b.mesh && b.mesh.parent) b.mesh.parent.remove(b.mesh);
      ufoPlasmaBolts.splice(i, 1);
    }
    for (let i = ufoRadarWaves.length - 1; i >= 0; i--) {
      const w = ufoRadarWaves[i];
      if (w.mesh && w.mesh.parent) w.mesh.parent.remove(w.mesh);
      ufoRadarWaves.splice(i, 1);
    }

    if (targetScene) {
      sceneRef = targetScene;
      if (ufoGroup && ufoGroup.parent !== targetScene) {
        if (ufoGroup.parent) ufoGroup.parent.remove(ufoGroup);
        targetScene.add(ufoGroup);
      }
    }

    if (state.inHyperspace) {
      if (window.BlahajGame && typeof window.BlahajGame.exitHyperspaceTo === 'function') {
        window.BlahajGame.exitHyperspaceTo('island', true);
      }
      return;
    } else if (state.inCheeseMoon) {
      state.phase = 'flying';
      state.hatchTargetOpen = false;
      state.hatchOpenProg = 0.0;
      state.orbitalCeilingReached = true;
      // Spawn right inside the North Meridian Canyon Trench (radius ~145m from planet center (0,-155,0)), aligned tangent to the curved trench floor!
      state.pos.set(0, -10.0, 0.0);
      state.vel.set(0, 0, -14.7);
      state.yaw = Math.PI;
      state.pitch = 0;
      state.roll = 0;
      state.spaceQuat.setFromEuler(new THREE.Euler(0, Math.PI, 0, 'YXZ')).normalize();
      state.remoteTargetQuat.copy(state.spaceQuat);
      state.spaceThrottle = 0.35;
      state.spaceMouseDx = 0;
      state.spaceMouseDy = 0;
      state.spaceAngVelPitch = 0;
      state.spaceAngVelYaw = 0;
      state.spaceAngVelRoll = 0;
    } else if (state.inSpace) {
      state.phase = 'flying';
      state.hatchTargetOpen = false;
      state.hatchOpenProg = 0.0;
      state.orbitalCeilingReached = true;
      state.pos.set(0, 6.0, 62.0);
      state.vel.set(0, 0, -14.7);
      state.yaw = Math.PI;
      state.pitch = 0;
      state.roll = 0;
      state.spaceQuat.setFromEuler(new THREE.Euler(0, Math.PI, 0, 'YXZ')).normalize();
      state.remoteTargetQuat.copy(state.spaceQuat);
      state.spaceThrottle = 0.35;
      state.spaceMouseDx = 0;
      state.spaceMouseDy = 0;
      state.spaceAngVelPitch = 0;
      state.spaceAngVelYaw = 0;
      state.spaceAngVelRoll = 0;
    } else {
      state.phase = 'flying';
      state.hatchTargetOpen = false;
      state.orbitalCeilingReached = false;
      state.orbitalNoticeShown = false;
      state.pos.set(ISLE_X, 130.0, ISLE_Z + 18.0);
      state.vel.set(0, -4.0, -10.0);
      state.pitch = 0;
      state.roll = 0;
    }

    state.remoteTargetPos.copy(state.pos);
    state.remoteSnapshots = [];
    if (document.body) {
      document.body.classList.toggle('ufo-space-mode', !!(state.localRole && state.inSpace));
    }
    if (ufoGroup) {
      ufoGroup.position.copy(state.pos);
      if (state.inSpace) {
        ufoGroup.quaternion.copy(state.spaceQuat);
      } else {
        ufoGroup.rotation.order = 'YXZ';
        ufoGroup.rotation.set(state.pitch, state.yaw, state.roll);
      }
      ufoGroup.updateMatrixWorld(true);
    }
    spawnRadarWave(state.inSpace ? 0xe879f9 : 0x38bdf8, 36);
    playJetsonsHorn();
    // Default weapon: Ray Turrets (1) in space, Tractor Beam (0) on the ground!
    if (saucerModules.length > 1) {
      selectModule(state.inSpace ? 1 : 0);
    }
    updateAvionicsButtonsUI();
    updateAvionicsHUD();
    if (state.localRole === 'pilot') {
      broadcastState(true);
    }
  }

  return {
    build,
    setSpaceMode,
    update,
    getSurfaceHeight,
    resolveCollision,
    getInteractables,
    toggleHangarDoors,
    summonToPosition,
    resetToTracyIsle,
    boardUFO,
    canExitNow,
    exitUFO,
    initiateAutoLand,
    toggleViewMode,
    toggleFloorCam,
    selectModule,
    cycleModule,
    activateActiveModule,
    toggleHatch,
    toggleTractorBeam,
    openSharedVault,
    toggleDiscoMode,
    getViewMode: () => state.viewMode,
    panCockpit: (dx, dy) => {
      state.cockpitLookYaw = Math.max(-2.1, Math.min(2.1, state.cockpitLookYaw - dx * 0.0042));
      const minPitch = state.floorCam ? -1.48 : -0.85;
      state.cockpitLookPitch = Math.max(minPitch, Math.min(0.85, state.cockpitLookPitch - dy * 0.0036));
    },
    toggleAutoChaseCam,
    updateAvionicsButtonsUI,
    playJetsonsHorn,
    handleNetworkPacket,
    adjustSpaceThrottle,
    applySpaceMouseLook,
    panSpaceCamera,
    applyImpactDamage,
    triggerSecondaryPower,
    handleDestroyedFromNetwork,
    isInSpace: () => !!state.inSpace,
    isLocalAboard: () => !!state.localRole,
    isPartnerAboard: () => Boolean(
      (state.pilotClientId && state.localRole !== 'pilot') ||
      (state.passengerClientId && state.localRole !== 'passenger')
    ),
    getLocalRole: () => state.localRole,
    getState: () => state,
    getIslandCoords: () => ({ x: ISLE_X, z: ISLE_Z, radius: ISLE_RADIUS, deckY: ISLE_DECK_Y })
  };
})();
