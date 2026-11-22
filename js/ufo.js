// ============================================================================
// BLÅHAJ ISLAND — S.S. SHONK-SAUCER MK. VII (JETSONS UFO + THUNDERBIRDS ISLE)
// ============================================================================
// Features:
//  1. Thunderbirds-style Secret Launch Island ("Shonk-Bird Tracy Isle") at
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
  const KARMAN_CEILING_Y = 122.0;

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
  let isleColliders = []; // Solid horizontal circle colliders on Shonk-Bird Tracy Isle

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
  let cockpitCamAnchor = null;
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

    // Crew & Co-op Ownership
    localRole: null, // null | 'pilot' | 'passenger'
    pilotClientId: null,
    pilotName: null,
    passengerClientId: null,
    passengerName: null,

    // Remote Sync Interpolation
    remoteTargetPos: new THREE.Vector3(ISLE_X, HANGAR_LOWER_Y + 1.5, ISLE_Z),
    remoteTargetYaw: -Math.PI * 0.72,
    remoteTargetPitch: 0,
    remoteTargetRoll: 0,
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

  function updateJetsonsEngineHum(active, speedNorm, altNorm, turbo) {
    const ctx = getAudioCtx();
    if (!ctx || ctx.state !== 'running') return;
    if (!active) {
      if (state.humActive && state.humGain) {
        try {
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
    const targetFreq = 175 + speedNorm * 160 + altNorm * 55 + (turbo ? 110 : 0);
    const targetLfoRate = 8.5 + speedNorm * 9.0 + (turbo ? 6.0 : 0);
    const targetVol = 0.035 + speedNorm * 0.03 + (turbo ? 0.025 : 0);
    try {
      state.humOsc.frequency.setTargetAtTime(targetFreq, now, 0.1);
      state.humLfo.frequency.setTargetAtTime(targetLfoRate, now, 0.1);
      state.humGain.gain.setTargetAtTime(targetVol, now, 0.12);
    } catch (e) {}
  }

  // ==========================================================================
  // 1. BUILD THUNDERBIRDS-STYLE SECRET LAUNCH ISLAND ("SHONK-BIRD TRACY ISLE")
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
      roughness: 0.72
    });
    const canopyGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0xbae6fd,
      transparent: true,
      opacity: 0.26,
      roughness: 0.06,
      metalness: 0.1,
      transmission: 0.55,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    // Main Lower Saucer Dish
    const lowerDish = new THREE.Mesh(new THREE.CylinderGeometry(5.1, 2.7, 1.15, 36), hullMintMat);
    lowerDish.position.y = 0.0;
    ufoHullGroup.add(lowerDish);

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
      new THREE.CylinderGeometry(3.35, 3.35, 0.2, 28),
      new THREE.MeshStandardMaterial({ color: 0x1e3a5f, roughness: 0.78 })
    );
    cabinFloor.position.y = 0.55;
    ufoHullGroup.add(cabinFloor);

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

    // Rear Dorsal Antenna Spire (Classic 1960s Jetsons Fin Antenna!)
    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.14, 2.2, 8), chromeMat);
    antenna.position.set(0, 3.65, -1.35);
    antenna.rotation.x = -0.32;
    const antOrb = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 10, 8),
      new THREE.MeshBasicMaterial({ color: 0xf43f5e })
    );
    antOrb.position.set(0, 4.72, -1.72);
    ufoHullGroup.add(antenna, antOrb);

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

    // Twin Plush Velvet Swivel Captain Chairs (Left: Pilot, Right: Co-Pilot/Passenger)
    [-1.05, 1.05].forEach((sx) => {
      const chair = new THREE.Group();
      chair.position.set(sx, 0.65, 0.65);
      const cushion = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.25, 1.15), velvetSeatMat);
      cushion.position.y = 0.22;
      const backrest = new THREE.Mesh(new THREE.BoxGeometry(1.12, 1.2, 0.22), velvetSeatMat);
      backrest.position.set(0, 0.82, -0.52);
      backrest.rotation.x = -0.15;
      chair.add(cushion, backrest);
      ufoHullGroup.add(chair);
    });

    // Seat Anchors for Pilot & Passenger Shark Meshes + Cockpit Camera Anchor
    seatPilotAnchor = new THREE.Object3D();
    seatPilotAnchor.position.set(-1.05, 0.92, 0.78);
    ufoHullGroup.add(seatPilotAnchor);

    seatPassengerAnchor = new THREE.Object3D();
    seatPassengerAnchor.position.set(1.05, 0.92, 0.78);
    ufoHullGroup.add(seatPassengerAnchor);

    cockpitCamAnchor = new THREE.Object3D();
    cockpitCamAnchor.position.set(0.0, 2.08, 0.68);
    ufoHullGroup.add(cockpitCamAnchor);

    // Crystal-Clear Bubble Canopy Dome (so sharks are clearly visible from outside!)
    const domeGeo = new THREE.SphereGeometry(3.45, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.56);
    const domeMesh = new THREE.Mesh(domeGeo, canopyGlassMat);
    domeMesh.position.y = 0.85;
    ufoHullGroup.add(domeMesh);

    // Sleek curved chrome canopy ribs
    [0, Math.PI * 0.5, Math.PI, Math.PI * 1.5].forEach((ry) => {
      const rib = new THREE.Mesh(new THREE.TorusGeometry(3.46, 0.065, 8, 28, Math.PI * 0.56), chromeMat);
      rib.position.y = 0.85;
      rib.rotation.y = ry;
      ufoHullGroup.add(rib);
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
      new THREE.MeshBasicMaterial({ color: 0x5eead4, side: THREE.DoubleSide, transparent: true, opacity: 0.85 })
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
  // 3. WALKABLE SURFACE HEIGHT FOR TRACY ISLE & LAUNCH PAD
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

    // 1. Thunderbirds Launch Control Console on Tracy Isle
    const consoleX = ISLE_X - 16.5;
    const consoleZ = ISLE_Z - 11.5;
    const dConsole = Math.hypot(playerPos.x - consoleX, playerPos.z - consoleZ);
    if (dConsole < 5.5) {
      const ufoAwayFromIsle = Math.hypot(state.pos.x - ISLE_X, state.pos.z - ISLE_Z) > 22.0;
      items.push({
        kind: ufoAwayFromIsle ? 'ufo_reset_isle' : 'ufo_hangar_console',
        dist: dConsole,
        prompt: ufoAwayFromIsle
          ? '🛸 Recall S.S. Shonk-Saucer Back to Tracy Isle Launch Pad [E]'
          : (state.hangarTargetOpen
            ? '🌴 Close Secret Thunderbirds Hangar Doors [E]'
            : '🚨 OPEN SECRET THUNDERBIRDS LAUNCH BAY [E] 🛸🌴')
      });
    }

    // 2. Endless Pierhead Quick-Shuttle Beacon (48, 82) to summon/warp to Tracy Isle!
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

  /** Solid horizontal circle collision resolver for Shonk-Bird Tracy Isle & landed UFO hull. */
  function resolveCollision(x, z, y, playerRadius = 0.75) {
    let outX = x;
    let outZ = z;
    if (!isBuilt || state.localRole) return { x: outX, z: outZ };

    // 1. Solid props on Tracy Isle (crags, palm trunks, beacons, launch console)
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
    const groundY = getSafeGroundHeight(landX, landZ);
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
      window.showToast('🏝️ RETURNED TO SHONK-BIRD TRACY ISLE!', 'S.S. Shonk-Saucer docked safely on the Thunderbirds Launch Pad!');
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
      if (state.phase === 'parked') {
        state.phase = 'launching';
        state.phaseTimer = 0;
        state.hatchTargetOpen = false;
      }
      playJetsonsHorn();
      if (window.showToast) {
        window.showToast('🛸 WELCOME ABOARD CAPTAIN!', 'WASD Fly · Space/Shift Altitude · [V] Inside/Outside View · [L] Auto-Land · [F] Horn!');
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

    if (state.localRole === 'pilot') {
      state.pilotClientId = null;
      state.pilotName = null;
      state.phase = 'parked';
      state.vel.set(0, 0, 0);
      state.hatchTargetOpen = true;
    } else if (state.localRole === 'passenger') {
      if (state.passengerClientId === myId) {
        state.passengerClientId = null;
        state.passengerName = null;
      }
    }
    state.localRole = null;

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
    broadcastState(true);
  }

  function initiateAutoLand() {
    if (state.localRole !== 'pilot') return;
    state.phase = 'landing';
    state.phaseTimer = 0;
    state.orbitalCeilingReached = false;
    // If landing near Tracy Isle, automatically open the Thunderbirds bay & funnel onto the pad!
    const nearIsle = Math.hypot(state.pos.x - ISLE_X, state.pos.z - ISLE_Z) < 42.0;
    if (nearIsle) {
      state.hangarTargetOpen = true;
    }
    if (window.showToast) {
      window.showToast(
        nearIsle ? '🏝️ TRACY ISLE PAD APPROACH ENGAGED' : '🛬 AUTO-LANDING SEQUENCE ACTIVE',
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
    const inVolcanoCrater = Math.hypot(dropX - (-28.0), dropZ - (-148.0)) < 21.0;

    if (item.kind === 'enemy' && item.ref) {
      const e = item.ref;
      e.inSubspaceVault = false;
      e.isFlying = false;
      if (inVolcanoCrater) {
        // Dropped directly into the Main Island Volcano Caldera -> Volcanic Incineration!
        if (e.isIncursionInvader && window.BlahajSeam && typeof window.BlahajSeam.onInvaderExpelledToSea === 'function') {
          e.isIncursionInvader = false;
          window.BlahajSeam.onInvaderExpelledToSea(e);
        }
        e.mange = 0;
        if (e.patrolRoute && e.patrolRoute.length > 0) {
          const wp = e.patrolRoute[0];
          e.pos.set(wp.x, e.homePos ? e.homePos.y : -0.65, wp.z);
        } else if (e.homePos) {
          e.pos.copy(e.homePos);
        }
        if (e.mesh) {
          e.mesh.position.copy(e.pos);
          e.mesh.scale.set(1, 1, 1);
          e.mesh.visible = true;
        }
        if (window.CozyAudio && window.CozyAudio.allenBuild) window.CozyAudio.allenBuild();
        playBeamCaptureChime(true);
        if (window.showToast) {
          window.showToast('🌋🔥 VOLCANIC INCINERATION!', `${item.title} was dropped into the molten caldera and poofed back to respawn refreshed!`);
        }
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
      bb.vel.set((Math.random() - 0.5) * 4.0, 0, (Math.random() - 0.5) * 4.0);
      if (bb.mesh) {
        bb.mesh.position.set(dropX, dropY + 0.4, dropZ);
        bb.mesh.scale.set(1, 1, 1);
        bb.mesh.visible = true;
      }
    } else if (item.kind === 'carrot' && item.ref) {
      const c = item.ref;
      c.inSubspaceVault = false;
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
    let gy = 0.2;
    if (window.BlahajWorld && typeof window.BlahajWorld.getGroundAndStructureHeight === 'function') {
      gy = Math.max(gy, window.BlahajWorld.getGroundAndStructureHeight(x, z));
    }
    const isleY = getSurfaceHeight(x, z);
    if (isleY > gy) gy = isleY;
    return gy;
  }

  // ==========================================================================
  // 5. NETWORK CO-OP SYNC (PILOT -> ALL PEERS)
  // ==========================================================================
  function broadcastState(force = false) {
    if (!window.BlahajNetwork || typeof window.BlahajNetwork.send !== 'function') return;
    const now = Date.now();
    if (!force && now - state.lastNetSendAt < 80) return;
    state.lastNetSendAt = now;

    window.BlahajNetwork.send({
      type: 'ufo_state',
      x: Number(state.pos.x.toFixed(2)),
      y: Number(state.pos.y.toFixed(2)),
      z: Number(state.pos.z.toFixed(2)),
      yaw: Number(state.yaw.toFixed(3)),
      pitch: Number(state.pitch.toFixed(3)),
      roll: Number(state.roll.toFixed(3)),
      phase: state.phase,
      hangarTargetOpen: state.hangarTargetOpen,
      hatchTargetOpen: state.hatchTargetOpen,
      tractorBeam: state.tractorBeam,
      discoMode: state.discoMode,
      turboActive: state.turboActive,
      pilotClientId: state.pilotClientId,
      pilotName: state.pilotName,
      passengerClientId: state.passengerClientId,
      passengerName: state.passengerName,
      vaultSummary: getActiveVaultSummary()
    });
  }

  function handleNetworkPacket(data) {
    if (!data || data.type !== 'ufo_state') return;
    state.lastRemotePacketAt = Date.now();
    const myId = getMyClientId();
    state.remoteVaultSummary = data.vaultSummary || null;

    // If someone else is piloting, smoothly sync UFO transform & systems
    if (state.localRole !== 'pilot') {
      if (typeof data.x === 'number' && typeof data.y === 'number' && typeof data.z === 'number') {
        state.remoteTargetPos.set(data.x, data.y, data.z);
      }
      if (typeof data.yaw === 'number') state.remoteTargetYaw = data.yaw;
      if (typeof data.pitch === 'number') state.remoteTargetPitch = data.pitch;
      if (typeof data.roll === 'number') state.remoteTargetRoll = data.roll;
      if (data.phase) state.phase = data.phase;
      if (typeof data.hangarTargetOpen === 'boolean') state.hangarTargetOpen = data.hangarTargetOpen;
      if (typeof data.hatchTargetOpen === 'boolean') state.hatchTargetOpen = data.hatchTargetOpen;
      if (typeof data.tractorBeam === 'boolean') {
        state.tractorBeam = data.tractorBeam;
        if (tractorBeamMesh) tractorBeamMesh.visible = state.tractorBeam;
      }
      if (typeof data.discoMode === 'boolean') state.discoMode = data.discoMode;
      if (typeof data.turboActive === 'boolean') state.turboActive = data.turboActive;
      state.pilotClientId = data.pilotClientId || null;
      state.pilotName = data.pilotName || null;
      if (data.passengerClientId !== myId) {
        state.passengerClientId = data.passengerClientId || null;
        state.passengerName = data.passengerName || null;
      }
    } else if (data.passengerClientId && data.passengerClientId !== myId) {
      // Pilot learns that a partner boarded as passenger!
      state.passengerClientId = data.passengerClientId;
      state.passengerName = data.passengerName || 'Co-Pilot';
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

  function showAvionicsHUD(visible) {
    const hud = document.getElementById('ufo-avionics-hud');
    if (hud) hud.classList.toggle('hidden', !visible);
    if (document.body) document.body.classList.toggle('ufo-flight-mode', !!visible);
    if (visible) updateAvionicsButtonsUI();
  }

  function updateAvionicsButtonsUI() {
    const btnView = document.getElementById('ufo-btn-view');
    const btnHatch = document.getElementById('ufo-btn-hatch');
    const btnBeam = document.getElementById('ufo-btn-beam');
    const btnDisco = document.getElementById('ufo-btn-disco');
    const btnLand = document.getElementById('ufo-btn-land');
    const btnChase = document.getElementById('ufo-btn-chasecam');

    if (btnView) btnView.textContent = state.viewMode === 'inside' ? '🪟 View: COCKPIT [V]' : '🛸 View: OUTSIDE [V]';
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
    ctx.rotate(-state.roll * 1.4);
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
      const phaseLabel = state.orbitalCeilingReached
        ? '🌌 ORBITAL CEILING'
        : (state.phase === 'launching' ? '🚀 LAUNCH SEQUENCE'
          : (state.phase === 'landing' ? '🛬 AUTO-LANDING'
            : (state.phase === 'parked' ? '🅿️ LANDED · STAIRS DOWN' : (state.turboActive ? '⚡ HYPER-JETSONS TURBO' : '🛸 FLIGHT CRUISE'))));
      elPhase.textContent = phaseLabel;
    }
    if (elRole) {
      const crewStr = state.passengerName
        ? `Pilot: ${state.pilotName || 'Captain'} · Co-Pilot: ${state.passengerName}`
        : `Pilot: ${state.pilotName || 'Captain'} · Passenger Seat Open`;
      elRole.textContent = `${state.localRole === 'pilot' ? '🧑‍✈️ PILOT' : '🦈 PASSENGER'} · ${crewStr}`;
    }
    if (elSpd) elSpd.textContent = `${speedKts} KTS`;
    if (elAlt) elAlt.textContent = `${Math.round(altAgl)}m AGL`;
    if (elVsi) elVsi.textContent = `${state.verticalSpeed >= 0 ? '+' : ''}${state.verticalSpeed.toFixed(1)} m/s`;
    if (elHdg) elHdg.textContent = `HDG ${String(heading).padStart(3, '0')}°`;
    if (elStatus) {
      elStatus.textContent = state.antiGravCushionActive
        ? '🛡️ ANTI-GRAV CUSHION ACTIVE · CRASH-PROOF'
        : (state.orbitalCeilingReached
          ? '✨ KARMAN LINE REACHED · SPACE JUMP MODULE STAGED'
          : '☕ TEA: 82°C · 🦈 BOBBLE-SHONK: GROOVY · GYRO: AUTO-LEVEL');
    }
    if (elOrbital) {
      elOrbital.classList.toggle('hidden', !state.orbitalCeilingReached);
    }

    drawArtificialHorizon();
  }

  // ==========================================================================
  // 7. PER-FRAME UPDATE (THUNDERBIRDS ISLAND + FLIGHT SIM + CAMERA + SHARKS)
  // ==========================================================================
  function update(dt, elapsed, keys, camState, camera) {
    if (!isBuilt || !ufoGroup) return;

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
    if (lavaLampBlob) {
      lavaLampBlob.position.y = 1.74 + Math.sin(elapsed * 1.6) * 0.09;
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
      const turbo = !!(k['shift'] && fwdInput > 0);
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
        // Automated gentle touchdown sequence (funnels onto Tracy Isle pad if within 42m!)
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
          targetY = getSafeGroundHeight(state.pos.x, state.pos.z) + 1.45;
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
              funnelToPad ? '🏝️ DOCKED ON TRACY ISLE PAD!' : '🛸 TOUCHDOWN COMPLETE!',
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
          // Ride the Tracy Isle hydraulic elevator smoothly if parked on it!
          const dIsle = Math.hypot(state.pos.x - ISLE_X, state.pos.z - ISLE_Z);
          if (dIsle < 11.5) {
            state.pos.y = HANGAR_LOWER_Y + state.hangarOpenProg * (HANGAR_RAISED_Y - HANGAR_LOWER_Y) + 1.5;
          }
          state.vel.set(0, 0, 0);
          state.pitch *= 0.9;
          state.roll *= 0.9;
        }
      } else {
        // FLYING / ORBITAL CRUISE (Smooth Flight-Sim feel, impossible to crash!)
        state.yawRate += (turnInput * 1.65 - state.yawRate) * Math.min(1.0, dt * 6.5);
        state.yaw += state.yawRate * dt;

        const maxHorizSpeed = turbo ? 52.0 : 28.0;
        const maxStrafeSpeed = turbo ? 34.0 : 22.0;
        const fwdX = Math.sin(state.yaw);
        const fwdZ = Math.cos(state.yaw);
        const rightX = -Math.cos(state.yaw);
        const rightZ = Math.sin(state.yaw);
        const targetVx = fwdX * fwdInput * maxHorizSpeed + rightX * strafeInput * maxStrafeSpeed;
        const targetVz = fwdZ * fwdInput * maxHorizSpeed + rightZ * strafeInput * maxStrafeSpeed;

        state.vel.x += (targetVx - state.vel.x) * Math.min(1.0, dt * 3.2);
        state.vel.z += (targetVz - state.vel.z) * Math.min(1.0, dt * 3.2);

        const targetVy = upInput * (turbo ? 20.0 : 14.0);
        state.vel.y += (targetVy - state.vel.y) * Math.min(1.0, dt * 4.5);

        state.pos.addScaledVector(state.vel, dt);

        // Keep within expansive archipelago bounds (+/- 360m) with gentle turnback
        state.pos.x = Math.max(-355, Math.min(355, state.pos.x));
        state.pos.z = Math.max(-355, Math.min(355, state.pos.z));

        // ANTI-CRASH TERRAIN & OCEAN CUSHION (Impossible to crash!)
        const minSafeY = getSafeGroundHeight(state.pos.x, state.pos.z) + 2.6;
        if (state.pos.y < minSafeY) {
          state.pos.y = minSafeY;
          if (state.vel.y < 0) state.vel.y = 0.5;
          state.antiGravCushionActive = true;
        }

        // KARMAN ORBITAL CEILING (Space Transition Threshold at Y = 122m!)
        if (state.pos.y >= KARMAN_CEILING_Y) {
          state.pos.y = KARMAN_CEILING_Y;
          if (state.vel.y > 0) state.vel.y = 0;
          state.orbitalCeilingReached = true;
          if (!state.orbitalNoticeShown) {
            state.orbitalNoticeShown = true;
            playJetsonsHorn();
            if (window.showToast) {
              window.showToast(
                '🌌 KARMAN ORBITAL CEILING REACHED!',
                'Space Flight & Alien Planets Module is staged right above this threshold! Press [C] to descend or cruise in orbit!'
              );
            }
          }
        } else if (state.pos.y < KARMAN_CEILING_Y - 10.0) {
          state.orbitalCeilingReached = false;
          state.orbitalNoticeShown = false;
        }

        // Auto-leveling flight-sim pitch & bank (combines A/D turn bank + Q/E strafe bank)
        const desiredPitch = fwdInput * (turbo ? 0.22 : 0.14);
        const desiredRoll = Math.max(-0.46, Math.min(0.46, -turnInput * 0.34 + strafeInput * 0.32));
        state.pitch += (desiredPitch - state.pitch) * Math.min(1.0, dt * 5.0);
        state.roll += (desiredRoll - state.roll) * Math.min(1.0, dt * 5.5);
      }

      state.speed = Math.hypot(state.vel.x, state.vel.z);
      state.verticalSpeed = state.vel.y;

      updateJetsonsEngineHum(
        state.phase !== 'parked',
        Math.min(1, state.speed / 35),
        Math.min(1, state.pos.y / KARMAN_CEILING_Y),
        state.turboActive
      );
      broadcastState(false);
    } else if (state.pilotClientId && Date.now() - state.lastRemotePacketAt < 10000) {
      // Smoothly interpolate remote pilot's UFO!
      state.pos.lerp(state.remoteTargetPos, Math.min(1.0, dt * 10.0));
      let yd = state.remoteTargetYaw - state.yaw;
      while (yd < -Math.PI) yd += Math.PI * 2;
      while (yd > Math.PI) yd -= Math.PI * 2;
      state.yaw += yd * Math.min(1.0, dt * 10.0);
      state.pitch += (state.remoteTargetPitch - state.pitch) * Math.min(1.0, dt * 10.0);
      state.roll += (state.remoteTargetRoll - state.roll) * Math.min(1.0, dt * 10.0);
      state.speed = state.pos.distanceTo(state.remoteTargetPos) * 10.0;
      state.orbitalCeilingReached = state.pos.y >= KARMAN_CEILING_Y - 4.0;
      updateJetsonsEngineHum(state.localRole === 'passenger' && state.phase !== 'parked', Math.min(1, state.speed / 35), Math.min(1, state.pos.y / KARMAN_CEILING_Y), state.turboActive);
    } else {
      // Unoccupied UFO: handle autopilot summoned landing OR parked gently on Tracy Isle elevator!
      if (state.phase === 'landing') {
        const groundY = getSafeGroundHeight(state.pos.x, state.pos.z);
        const targetY = groundY + 1.45;
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

    // 5. Apply Transform + Subtle Hover Bob to 3D UFO Mesh
    const hoverBob = state.phase === 'parked' ? 0 : Math.sin(elapsed * 2.8) * 0.14;
    ufoGroup.position.set(state.pos.x, state.pos.y + hoverBob, state.pos.z);
    ufoGroup.rotation.order = 'YXZ';
    ufoGroup.rotation.set(state.pitch, state.yaw, state.roll);

    // Thruster flame scaling
    const thrustScale = state.phase === 'parked' ? 0.18 : (0.7 + Math.min(1.2, state.speed / 24) + (state.turboActive ? 0.9 : 0));
    thrusterCones.forEach((tc) => {
      tc.mesh.scale.set(1, thrustScale + Math.sin(elapsed * 22.0) * 0.12, 1);
      tc.mat.color.setHex(state.turboActive ? 0xf472b6 : (state.orbitalCeilingReached ? 0xc084fc : 0x38bdf8));
    });

    // 6. Position Local Player Shark Visibly Inside the Glass Bubble Canopy!
    if (state.localRole && window.player && window.player.mesh) {
      const anchor = state.localRole === 'pilot' ? seatPilotAnchor : seatPassengerAnchor;
      const worldSeat = new THREE.Vector3();
      anchor.getWorldPosition(worldSeat);
      window.player.pos.copy(worldSeat);
      window.player.rotY = state.yaw;
      window.player.mesh.position.copy(worldSeat);
      window.player.mesh.rotation.order = 'YXZ';
      window.player.mesh.rotation.set(state.pitch, state.yaw, state.roll);
      // Hide local shark mesh only in Inside Cockpit View so it doesn't block the windshield!
      window.player.mesh.visible = (state.viewMode !== 'inside');

      // Drive Camera for Inside Cockpit View vs Outside Chase View!
      if (camera && camState) {
        if (state.viewMode === 'inside') {
          const camWorld = new THREE.Vector3();
          cockpitCamAnchor.getWorldPosition(camWorld);
          const lookWorld = new THREE.Vector3(0, 1.88, 12.0);
          ufoGroup.localToWorld(lookWorld);
          camState.customOverride = { pos: camWorld, lookAt: lookWorld };
        } else {
          // Exterior Chase View: turn with A/D and smoothly drift back behind the saucer!
          camState.customOverride = null;
          if (camState.distance < 13.5) camState.distance = 15.5;

          if (isAutoChaseCamEnabled()) {
            const rearCamYaw = Math.atan2(-Math.sin(state.yaw), -Math.cos(state.yaw));
            const manualOrbitAgo = Date.now() - (camState.lastManualOrbitAt || 0);
            const isDraggingNow = !!(camState.isLeftDragging || camState.isRightDragging);

            // 1. Immediately rotate camera along with A/D saucer turning
            if (Math.abs(state.yawRate) > 0.01) {
              camState.yaw += state.yawRate * dt;
            }

            // 2. Smoothly drift back to rear chase position after brief pause from manual mouse look
            if (!isDraggingNow && (manualOrbitAgo > 1100 || Math.abs(state.yawRate) > 0.05 || state.speed > 4.0)) {
              let diff = rearCamYaw - camState.yaw;
              while (diff > Math.PI) diff -= Math.PI * 2;
              while (diff < -Math.PI) diff += Math.PI * 2;
              const driftRate = (Math.abs(state.yawRate) > 0.05 || state.speed > 4.0) ? 4.2 : 2.2;
              camState.yaw += diff * Math.min(1.0, dt * driftRate);
              while (camState.yaw > Math.PI) camState.yaw -= Math.PI * 2;
              while (camState.yaw < -Math.PI) camState.yaw += Math.PI * 2;

              if (manualOrbitAgo > 1600) {
                camState.pitch += (0.22 - camState.pitch) * Math.min(1.0, dt * 1.8);
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
    }
  }

  function initDOMListeners() {
    const bind = (id, fn) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('click', (e) => { e.stopPropagation(); fn(); });
    };
    bind('ufo-btn-view', toggleViewMode);
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

  return {
    build,
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
    toggleHatch,
    toggleTractorBeam,
    openSharedVault,
    toggleDiscoMode,
    toggleAutoChaseCam,
    updateAvionicsButtonsUI,
    playJetsonsHorn,
    handleNetworkPacket,
    isLocalAboard: () => !!state.localRole,
    getLocalRole: () => state.localRole,
    getState: () => state,
    getIslandCoords: () => ({ x: ISLE_X, z: ISLE_Z, radius: ISLE_RADIUS, deckY: ISLE_DECK_Y })
  };
})();
