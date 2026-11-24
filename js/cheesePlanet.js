// ============================================================================
// BLÅHAJ ISLAND — THE SWISS CHEESE PLANETOID (js/cheesePlanet.js)
// v16.5: Part 1 Complete Loop — Eerie Quiet Arrival, Aetheric Radar Scan
//        Revealing Sectors & Irritating Finite Bugs, Tractor-Beam Core Hauling,
//        Anomalous Sealed Cave Entrance, Critical Mass Detonation, Subterranean
//        Interior Crater Bowl & Amplified Between-Seam Relay Dish + Hermes Portal!
// ============================================================================

window.BlahajCheeseMoon = (function () {
  let cheeseScene = null;
  let isBuilt = false;

  const PLANET_CENTER = new THREE.Vector3(0, -155.0, 0);
  const TRENCH_FLOOR_RADIUS = 126.0;
  const PLATEAU_TOP_RADIUS = 162.0;

  // Anomalous Sealed Cave Entrance at the Primary Trench Crossroads (North-Central Floor)
  const CAVE_NORMAL = new THREE.Vector3(0, 0.985, -0.172).normalize();
  const CAVE_SURFACE_POS = new THREE.Vector3()
    .copy(PLANET_CENTER)
    .addScaledVector(CAVE_NORMAL, TRENCH_FLOOR_RADIUS + 0.6); // ~(0, -30.8, -21.7)

  // Subterranean Interior Crater Bowl directly beneath the Breach Shaft!
  const INTERIOR_CRATER_CENTER = new THREE.Vector3(
    CAVE_SURFACE_POS.x,
    CAVE_SURFACE_POS.y - 38.0,
    CAVE_SURFACE_POS.z
  ); // ~(0, -68.8, -21.7)
  const INTERIOR_CRATER_RADIUS = 34.0;
  const INTERIOR_FOCAL_POS = new THREE.Vector3(
    INTERIOR_CRATER_CENTER.x,
    INTERIOR_CRATER_CENTER.y - INTERIOR_CRATER_RADIUS + 6.5,
    INTERIOR_CRATER_CENTER.z
  ); // Bottom focal point of the parabolic crater bowl ~(0, -96.3, -21.7)

  const REENTRY_POS = new THREE.Vector3(0, 38.0, -98.0);
  const REENTRY_RADIUS = 13.5;

  let planetoidGroup = null;
  let eclipseGroup = null;
  let reentryGateGroup = null;
  let reentryRingMesh = null;

  // 4 Distinct Bunker Sectors around the planetoid trenches (finite bugs per sector, zero respawns!)
  const SECTOR_DEFS = [
    {
      id: 'sector_north',
      name: 'North Meridian Gorge',
      normal: new THREE.Vector3(0.0, 0.955, 0.295).normalize(),
      bugCount: 3
    },
    {
      id: 'sector_east',
      name: 'East Eclipse Trench',
      normal: new THREE.Vector3(0.46, 0.875, -0.15).normalize(),
      bugCount: 4
    },
    {
      id: 'sector_west',
      name: 'West Geode Canyon',
      normal: new THREE.Vector3(-0.46, 0.875, -0.15).normalize(),
      bugCount: 4
    },
    {
      id: 'sector_south',
      name: 'South Shadow Rim',
      normal: new THREE.Vector3(0.0, 0.84, -0.54).normalize(),
      bugCount: 4
    }
  ];

  const cheeseSectors = [];
  const cheeseBunkers = [];
  const coreOrbs = []; // Volatile Core Power-Ups exposed when a sector's bunkers are busted
  const invaders = [];
  const bursts = [];

  // Mission Progression State
  let scanCount = 0;
  let hasShownArrivalThought = false;
  let hasShownFirstBugThought = false;
  let hasShownCaveAnomalyThought = false;
  let hasShownCriticalMassThought = false;
  let hasShownBreachThought = false;
  let hasShownVictoryThought = false;

  let caveRevealed = false;
  let caveBreached = false;
  let coresCarried = 0;
  let coresInHole = 0;
  const CORES_REQUIRED = 4;
  let relayDeployed = false;

  let lastScanReminderAt = 0;
  let timeSinceLastScan = 0;

  // 3D Groups for Anomalous Cave Entrance, Subterranean Interior Crater, Relay Dish & Hermes Portal
  let caveAnomalyGroup = null;
  let caveRindPlugMesh = null;
  let caveBeaconMesh = null;
  let caveCoreSocketMeshes = [];
  let interiorCraterGroup = null;
  let craterFocalRingMesh = null;
  let relayDishGroup = null;
  let relayDishSpinner = null;
  let hermesPortalGroup = null;
  let hermesPortalRing = null;
  let carriedCoreVisualGroup = null;

  let invaderTextures = [];
  let nextInvaderId = 1;
  let invadersClearedCount = 0;
  let bunkersDestroyedCount = 0;

  const INVADER_BITMAPS = [
    [
      '00100000100',
      '00010001000',
      '00111111100',
      '01101110110',
      '11111111111',
      '10111111101',
      '10100000101',
      '00011011000'
    ],
    [
      '00100000100',
      '10010001001',
      '10111111101',
      '11101110111',
      '11111111111',
      '01111111110',
      '00100000100',
      '01000000010'
    ]
  ];

  function createInvaderTexture(bitmap, fgHex = '#7dd3fc', shadowHex = '#090d16') {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 48;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 64, 48);

    const rows = bitmap.length;
    const cols = bitmap[0].length;
    const px = 4;
    const ox = Math.floor((64 - cols * px) * 0.5);
    const oy = Math.floor((48 - rows * px) * 0.5);

    ctx.fillStyle = shadowHex;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (bitmap[r][c] === '1') {
          ctx.fillRect(ox + c * px - 2, oy + r * px + 2, px + 2, px + 2);
        }
      }
    }

    ctx.fillStyle = fgHex;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (bitmap[r][c] === '1') {
          ctx.fillRect(ox + c * px, oy + r * px, px, px);
        }
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    return tex;
  }

  function createSwissCheeseTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#d99b1e';
    ctx.fillRect(0, 0, 256, 256);

    for (let i = 0; i < 60; i++) {
      const x = ((i * 73) % 240) + 8;
      const y = ((i * 139) % 240) + 8;
      const s = 10 + (i % 5) * 6;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(245, 188, 52, 0.35)' : 'rgba(146, 84, 12, 0.32)';
      ctx.fillRect(x, y, s, s);
    }

    for (let i = 0; i < 36; i++) {
      const cx = ((i * 97 + 19) % 224) + 16;
      const cy = ((i * 53 + 31) % 224) + 16;
      const r = 6 + (i % 4) * 5;

      ctx.beginPath();
      ctx.arc(cx + 2, cy + 2, r + 2, 0, Math.PI * 2);
      ctx.fillStyle = '#fcd34d';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = '#3b1d06';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(cx - 1, cy - 1, r * 0.65, 0, Math.PI * 2);
      ctx.fillStyle = '#180a02';
      ctx.fill();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(6, 6);
    return tex;
  }

  function getPlanetRadiusAtNormal(nx, ny, nz) {
    // If the Cave Seal has been blasted open, carve a vertical breach shaft straight down into the Interior Crater!
    if (caveBreached) {
      const dotCave = nx * CAVE_NORMAL.x + ny * CAVE_NORMAL.y + nz * CAVE_NORMAL.z;
      if (dotCave > 0.985) {
        return TRENCH_FLOOR_RADIUS - 52.0;
      }
    }

    const dTrench1 = Math.abs(nx);
    const dTrench2 = Math.abs(nx * 0.82 + nz * 0.57);
    const dTrench3 = Math.abs(nx * 0.82 - nz * 0.57);
    const dMin = Math.min(dTrench1, dTrench2, dTrench3);

    const wFloor = 0.145;
    const wWall = 0.255;

    let baseR;
    if (dMin < wFloor) {
      const ripple = Math.round(Math.sin(nx * 14.0 + nz * 14.0) * 1.5) * 0.8;
      baseR = TRENCH_FLOOR_RADIUS + ripple;
    } else if (dMin < wWall) {
      const t = (dMin - wFloor) / (wWall - wFloor);
      const steppedT = Math.floor(t * 4.0) / 3.0;
      baseR = TRENCH_FLOOR_RADIUS + steppedT * (PLATEAU_TOP_RADIUS - TRENCH_FLOOR_RADIUS);
    } else {
      const blockHash =
        Math.sin(Math.floor(nx * 9.0) * 12.7 + Math.floor(ny * 9.0) * 7.3 + Math.floor(nz * 9.0) * 19.1);
      const terraceStep = Math.round(blockHash * 2.0) * 3.2;
      let holeDip = 0;
      if (blockHash < -0.68) {
        holeDip = -11.5;
      }
      baseR = PLATEAU_TOP_RADIUS + terraceStep + holeDip;
    }

    return baseR;
  }

  function build() {
    if (isBuilt && cheeseScene) return cheeseScene;

    cheeseScene = new THREE.Scene();
    cheeseScene.background = new THREE.Color(0x030306);
    cheeseScene.fog = new THREE.FogExp2(0x070503, 0.0020);

    const amb = new THREE.AmbientLight(0x2a1c0b, 0.85);
    cheeseScene.add(amb);

    const eclipseRimLight = new THREE.DirectionalLight(0xffb74d, 2.35);
    eclipseRimLight.position.set(160, 260, -340);
    cheeseScene.add(eclipseRimLight);

    const canyonFillLight = new THREE.DirectionalLight(0x38bdf8, 0.52);
    canyonFillLight.position.set(-140, 120, 220);
    cheeseScene.add(canyonFillLight);

    // 1. Eclipsed Sun & Distant Mystery Moon
    eclipseGroup = new THREE.Group();
    eclipseGroup.position.set(140, 210, -480);

    const coronaRing = new THREE.Mesh(
      new THREE.RingGeometry(46, 56, 64),
      new THREE.MeshBasicMaterial({ color: 0xffd54f, side: THREE.DoubleSide, transparent: true, opacity: 0.95 })
    );
    const outerCorona = new THREE.Mesh(
      new THREE.RingGeometry(55, 86, 64),
      new THREE.MeshBasicMaterial({ color: 0xf57c00, side: THREE.DoubleSide, transparent: true, opacity: 0.34 })
    );
    const blackSun = new THREE.Mesh(
      new THREE.CircleGeometry(46.2, 64),
      new THREE.MeshBasicMaterial({ color: 0x020204, side: THREE.DoubleSide })
    );
    blackSun.position.z = 0.6;
    eclipseGroup.add(outerCorona, coronaRing, blackSun);
    cheeseScene.add(eclipseGroup);

    const smallMoon = new THREE.Mesh(
      new THREE.SphereGeometry(11, 20, 16),
      new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.9 })
    );
    smallMoon.position.set(-85, 235, -520);
    cheeseScene.add(smallMoon);

    // 2. Starfield
    const starCount = 1200;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 560 + Math.random() * 140;
      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPositions[i * 3 + 2] = r * Math.cos(phi);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xfef3c7, size: 1.5, sizeAttenuation: false });
    cheeseScene.add(new THREE.Points(starGeo, starMat));

    // 3. Connected Spherical Blocky Swiss Cheese Planetoid
    planetoidGroup = new THREE.Group();
    const cheeseTex = createSwissCheeseTexture();

    const planetMat = new THREE.MeshStandardMaterial({
      map: cheeseTex,
      color: 0xfbbf24,
      roughness: 0.84,
      metalness: 0.06,
      flatShading: true
    });

    const sphereGeo = new THREE.IcosahedronGeometry(1.0, 5);
    const posAttr = sphereGeo.attributes.position;
    const vTemp = new THREE.Vector3();

    for (let i = 0; i < posAttr.count; i++) {
      vTemp.fromBufferAttribute(posAttr, i).normalize();
      const r = getPlanetRadiusAtNormal(vTemp.x, vTemp.y, vTemp.z);
      const qx = Math.round(vTemp.x * r * 0.5) * 2.0;
      const qy = Math.round(vTemp.y * r * 0.5) * 2.0;
      const qz = Math.round(vTemp.z * r * 0.5) * 2.0;
      posAttr.setXYZ(i, qx, qy, qz);
    }
    sphereGeo.computeVertexNormals();

    const planetMesh = new THREE.Mesh(sphereGeo, planetMat);
    planetMesh.position.copy(PLANET_CENTER);
    planetoidGroup.add(planetMesh);

    const holeMat = new THREE.MeshBasicMaterial({ color: 0x090401 });
    const bunkerMat = new THREE.MeshStandardMaterial({
      map: cheeseTex,
      color: 0xfacc15,
      roughness: 0.72,
      metalness: 0.08,
      flatShading: true
    });

    // 4. Build the 4 Scan-Revealed Bunker Sectors (start hidden & peaceful until scanned!)
    cheeseSectors.length = 0;
    cheeseBunkers.length = 0;
    coreOrbs.length = 0;

    SECTOR_DEFS.forEach((sDef, sIdx) => {
      const secGroup = new THREE.Group();
      const centerPos = new THREE.Vector3()
        .copy(PLANET_CENTER)
        .addScaledVector(sDef.normal, TRENCH_FLOOR_RADIUS + 3.2);

      // Spawn coordinates on either side of the trench (no floating black disc meshes!)
      const tangent = new THREE.Vector3(1, 0, 0);
      if (Math.abs(sDef.normal.x) > 0.7) tangent.set(0, 0, 1);
      const sideDir = new THREE.Vector3().crossVectors(sDef.normal, tangent).normalize();
      const fwdDir = new THREE.Vector3().crossVectors(sideDir, sDef.normal).normalize();

      const sectorHoles = [];
      [-1, 1].forEach((sideSign) => {
        const holePos = centerPos.clone()
          .addScaledVector(sideDir, sideSign * 14.0)
          .addScaledVector(sDef.normal, 6.5);
        const inwardDir = sideDir.clone().multiplyScalar(-sideSign);
        sectorHoles.push({ pos: holePos, normal: inwardDir });
      });

      // 3 Fortified Swiss-Cheese Bunkers per Sector (1 Main Core Bunker + 2 Flanking Cover Bunkers)
      const sectorBunkers = [];
      [-1, 0, 1].forEach((offsetIdx) => {
        const bGroup = new THREE.Group();
        const bPos = centerPos.clone()
          .addScaledVector(fwdDir, offsetIdx * 11.5)
          .addScaledVector(sideDir, (offsetIdx === 0 ? 0 : offsetIdx * 4.5));
        bGroup.position.copy(bPos);
        bGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), sDef.normal);

        const isCoreBunker = offsetIdx === 0;
        const bw = isCoreBunker ? 9.6 : 7.8;
        const bh = isCoreBunker ? 6.4 : 5.2;
        const bd = isCoreBunker ? 5.6 : 4.4;

        const mainBlock = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), bunkerMat.clone());
        const notchL = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.2, bd * 0.9), bunkerMat);
        notchL.position.set(-bw * 0.3, bh * 0.55, 0);
        const notchR = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.2, bd * 0.9), bunkerMat);
        notchR.position.set(bw * 0.3, bh * 0.55, 0);
        const darkPore = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, bd + 0.3, 12), holeMat);
        darkPore.rotation.x = Math.PI / 2;
        bGroup.add(mainBlock, notchL, notchR, darkPore);

        if (isCoreBunker) {
          // Glowing volatile golden-violet seams showing this bunker holds the Sector's Core Power-Up!
          const coreGlowRing = new THREE.Mesh(
            new THREE.TorusGeometry(3.2, 0.28, 10, 24),
            new THREE.MeshBasicMaterial({ color: 0xfacc15 })
          );
          coreGlowRing.rotation.x = Math.PI / 2;
          coreGlowRing.position.y = bh * 0.5 + 0.4;
          bGroup.add(coreGlowRing);
        }

        // Hidden until revealed by Aetheric Radar scan!
        bGroup.visible = false;
        planetoidGroup.add(bGroup);

        const bObj = {
          id: `bunker_${sIdx}_${offsetIdx + 1}`,
          sectorId: sDef.id,
          isCoreBunker,
          group: bGroup,
          mesh: mainBlock,
          pos: bPos,
          normal: sDef.normal.clone(),
          hp: isCoreBunker ? 4 : 3,
          maxHp: isCoreBunker ? 4 : 3,
          radius: isCoreBunker ? 6.8 : 5.6,
          alive: true
        };
        cheeseBunkers.push(bObj);
        sectorBunkers.push(bObj);
      });

      secGroup.visible = false;
      planetoidGroup.add(secGroup);

      cheeseSectors.push({
        id: sDef.id,
        index: sIdx,
        name: sDef.name,
        normal: sDef.normal.clone(),
        centerPos,
        bugCount: sDef.bugCount,
        group: secGroup,
        beaconBeam: null,
        holes: sectorHoles,
        bunkers: sectorBunkers,
        revealed: false,
        cleared: false,
        coreSpawned: false,
        coreCollected: false
      });
    });

    // 5. Anomalous Sealed Cave Entrance at the Trench Crossroads
    buildAnomalousCaveAndCrater(cheeseTex);

    cheeseScene.add(planetoidGroup);

    // 6. 1980s Pixel Space Invader Textures (zero bugs spawned at start — eerie quiet!)
    invaderTextures = [
      createInvaderTexture(INVADER_BITMAPS[0], '#7dd3fc', '#050811'),
      createInvaderTexture(INVADER_BITMAPS[1], '#38bdf8', '#050811'),
      createInvaderTexture(INVADER_BITMAPS[0], '#fde047', '#1c1004')
    ];
    invaders.length = 0;

    // 7. Golden Orbital Warp-Out Gate (Emergency Return to Deep Space)
    reentryGateGroup = new THREE.Group();
    reentryGateGroup.position.copy(REENTRY_POS);
    reentryGateGroup.lookAt(new THREE.Vector3(0, 25, 0));
    reentryRingMesh = new THREE.Mesh(
      new THREE.TorusGeometry(REENTRY_RADIUS, 0.85, 12, 48),
      new THREE.MeshBasicMaterial({ color: 0xfacc15 })
    );
    const innerDisc = new THREE.Mesh(
      new THREE.CircleGeometry(REENTRY_RADIUS - 0.6, 36),
      new THREE.MeshBasicMaterial({
        color: 0xf59e0b,
        transparent: true,
        opacity: 0.22,
        side: THREE.DoubleSide,
        depthWrite: false
      })
    );
    reentryGateGroup.add(reentryRingMesh, innerDisc);
    cheeseScene.add(reentryGateGroup);

    // 8. Visual Orbiting Core Group attached near UFO when carrying Cores
    carriedCoreVisualGroup = new THREE.Group();
    cheeseScene.add(carriedCoreVisualGroup);

    isBuilt = true;
    return cheeseScene;
  }

  function buildAnomalousCaveAndCrater(cheeseTex) {
    // A. Surface Anomalous Sealed Cave Entrance
    caveAnomalyGroup = new THREE.Group();
    caveAnomalyGroup.position.copy(CAVE_SURFACE_POS);
    caveAnomalyGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), CAVE_NORMAL);

    // Raised Cheese Rim around the Cave Depression
    const rimMesh = new THREE.Mesh(
      new THREE.TorusGeometry(13.5, 2.6, 12, 32),
      new THREE.MeshStandardMaterial({
        map: cheeseTex,
        color: 0xd97706,
        roughness: 0.78,
        flatShading: true
      })
    );
    rimMesh.rotation.x = Math.PI / 2;
    caveAnomalyGroup.add(rimMesh);

    // Hardened Crystalline Rind Plug sealing the shaft (explodes on Critical Mass + Laser Shot!)
    caveRindPlugMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(12.2, 11.4, 3.6, 24),
      new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        emissive: 0x7c2d12,
        emissiveIntensity: 0.65,
        roughness: 0.35,
        metalness: 0.3,
        flatShading: true
      })
    );
    caveRindPlugMesh.position.y = -0.6;
    caveAnomalyGroup.add(caveRindPlugMesh);

    // 4 Glowing Core Sockets on top of the Sealed Cave Plug showing how many Cores have been dropped in (0/4..4/4)
    caveCoreSocketMeshes = [];
    for (let i = 0; i < CORES_REQUIRED; i++) {
      const ang = (i / CORES_REQUIRED) * Math.PI * 2;
      const sock = new THREE.Mesh(
        new THREE.SphereGeometry(1.75, 16, 14),
        new THREE.MeshBasicMaterial({
          color: 0x334155,
          transparent: true,
          opacity: 0.55
        })
      );
      sock.position.set(Math.cos(ang) * 5.2, 1.6, Math.sin(ang) * 5.2);
      caveAnomalyGroup.add(sock);
      caveCoreSocketMeshes.push(sock);
    }

    // Surface Anomalous Cave Entrance uses HUD Diamond Waypoint + Radar Blip (no 3D light cone!)
    caveBeaconMesh = null;

    planetoidGroup.add(caveAnomalyGroup);

    // B. Subterranean Interior Crater Bowl (revealed beneath the breach shaft!)
    interiorCraterGroup = new THREE.Group();
    interiorCraterGroup.position.copy(INTERIOR_CRATER_CENTER);

    // Concave Parabolic Crater Chamber Shell
    const craterShell = new THREE.Mesh(
      new THREE.SphereGeometry(INTERIOR_CRATER_RADIUS, 28, 22),
      new THREE.MeshStandardMaterial({
        map: cheeseTex,
        color: 0xb45309,
        roughness: 0.88,
        metalness: 0.05,
        side: THREE.BackSide,
        flatShading: true
      })
    );
    interiorCraterGroup.add(craterShell);

    // Parabolic Crater Floor Dish Platform (natural signal amplifier bowl!)
    const craterFloorBowl = new THREE.Mesh(
      new THREE.CylinderGeometry(22.0, 14.0, 3.5, 28),
      new THREE.MeshStandardMaterial({
        map: cheeseTex,
        color: 0xf59e0b,
        roughness: 0.72,
        flatShading: true
      })
    );
    craterFloorBowl.position.y = -INTERIOR_CRATER_RADIUS + 4.5;
    interiorCraterGroup.add(craterFloorBowl);

    // Glowing Focal Amplification Landing Ring at the center of the Interior Crater Floor
    craterFocalRingMesh = new THREE.Mesh(
      new THREE.TorusGeometry(8.5, 0.45, 12, 36),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    craterFocalRingMesh.rotation.x = Math.PI / 2;
    craterFocalRingMesh.position.y = -INTERIOR_CRATER_RADIUS + 6.4;
    interiorCraterGroup.add(craterFocalRingMesh);

    // Warm Subterranean Geode Point Light & Glowing Purple Hiram-Geodes around the Crater Walls
    const craterLight = new THREE.PointLight(0xc084fc, 2.4, 85);
    craterLight.position.set(0, -4.0, 0);
    interiorCraterGroup.add(craterLight);

    const geodeMat = new THREE.MeshStandardMaterial({
      color: 0xa855f7,
      emissive: 0x7e22ce,
      emissiveIntensity: 0.85,
      roughness: 0.25,
      flatShading: true
    });
    for (let i = 0; i < 10; i++) {
      const ang = (i / 10) * Math.PI * 2;
      const gCluster = new THREE.Mesh(new THREE.OctahedronGeometry(2.6 + (i % 3) * 0.8, 0), geodeMat);
      gCluster.position.set(
        Math.cos(ang) * (INTERIOR_CRATER_RADIUS - 4.0),
        -12.0 + (i % 3) * 6.0,
        Math.sin(ang) * (INTERIOR_CRATER_RADIUS - 4.0)
      );
      interiorCraterGroup.add(gCluster);
    }

    // Sealed Underground Tunnel Gate on the far crater wall (Threshold to the Deep Cheese Dungeon for Parts 2–4!)
    const deepTunnelArch = new THREE.Mesh(
      new THREE.TorusGeometry(7.2, 1.4, 10, 24, Math.PI),
      new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.65, roughness: 0.35 })
    );
    deepTunnelArch.position.set(0, -INTERIOR_CRATER_RADIUS + 6.5, -INTERIOR_CRATER_RADIUS + 4.5);
    const deepTunnelDark = new THREE.Mesh(
      new THREE.CircleGeometry(6.8, 24),
      new THREE.MeshBasicMaterial({ color: 0x040208 })
    );
    deepTunnelDark.position.set(0, -INTERIOR_CRATER_RADIUS + 6.5, -INTERIOR_CRATER_RADIUS + 4.8);
    interiorCraterGroup.add(deepTunnelArch, deepTunnelDark);

    // C. Deployable Between-Seam Relay Dish at the Crater Focal Point (hidden until deployed with [E]!)
    relayDishGroup = new THREE.Group();
    relayDishGroup.position.set(0, -INTERIOR_CRATER_RADIUS + 6.4, 0);

    const mast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.6, 1.1, 5.2, 14),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.8, roughness: 0.2 })
    );
    mast.position.y = 2.6;
    relayDishGroup.add(mast);

    relayDishSpinner = new THREE.Group();
    relayDishSpinner.position.y = 5.4;
    const bigBowl = new THREE.Mesh(
      new THREE.CylinderGeometry(5.8, 1.4, 2.4, 24, 1, true),
      new THREE.MeshStandardMaterial({
        color: 0xf8fafc,
        metalness: 0.75,
        roughness: 0.2,
        side: THREE.DoubleSide
      })
    );
    const dishSpire = new THREE.Mesh(
      new THREE.ConeGeometry(0.55, 4.2, 12),
      new THREE.MeshBasicMaterial({ color: 0xfacc15 })
    );
    dishSpire.position.y = 2.1;
    relayDishSpinner.add(bigBowl, dishSpire);
    relayDishGroup.add(relayDishSpinner);

    // Towering Amplified Seam Signal Beam shooting straight up out of the Interior Crater through the Breach Hole!
    const relaySkyBeam = new THREE.Mesh(
      new THREE.CylinderGeometry(1.8, 4.6, 130.0, 24, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xa855f7,
        transparent: true,
        opacity: 0.55,
        side: THREE.DoubleSide,
        depthWrite: false
      })
    );
    relaySkyBeam.position.y = 68.0;
    relayDishGroup.add(relaySkyBeam);

    relayDishGroup.visible = false;
    interiorCraterGroup.add(relayDishGroup);

    // D. Hermes' Direct Between Portal inside the Interior Crater (opens beside the Relay Dish!)
    hermesPortalGroup = new THREE.Group();
    hermesPortalGroup.position.set(11.5, -INTERIOR_CRATER_RADIUS + 11.0, 4.0);
    hermesPortalGroup.lookAt(new THREE.Vector3(0, -INTERIOR_CRATER_RADIUS + 11.0, 0));

    hermesPortalRing = new THREE.Mesh(
      new THREE.TorusGeometry(5.4, 0.55, 14, 36),
      new THREE.MeshBasicMaterial({ color: 0xc084fc })
    );
    const portalSurface = new THREE.Mesh(
      new THREE.CircleGeometry(5.1, 32),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.48,
        side: THREE.DoubleSide,
        depthWrite: false
      })
    );
    hermesPortalGroup.add(hermesPortalRing, portalSurface);
    hermesPortalGroup.visible = false;
    interiorCraterGroup.add(hermesPortalGroup);

    planetoidGroup.add(interiorCraterGroup);
  }

  function showPausedThought(opts) {
    if (window.BlahajGame && typeof window.BlahajGame.showStoryPauseModal === 'function') {
      window.BlahajGame.showStoryPauseModal(opts);
    } else if (window.showToast) {
      window.showToast(opts.title || '💭 Thought', (opts.body || '').replace(/<[^>]*>/g, ''));
    }
  }

  function onEnterZone() {
    if (!isBuilt) build();
    timeSinceLastScan = 0;
    updateObjectiveHUD();

    if (!hasShownArrivalThought && scanCount === 0) {
      hasShownArrivalThought = true;
      setTimeout(() => {
        showPausedThought({
          badge: '💭 INNER THOUGHT · CHEESE MOON ARRIVAL',
          title: 'Eerie Silence in the Swiss-Cheese Trenches…',
          body:
            'Wait a second… there’s nothing moving down here at all. No enemies on visual, just deep Swiss-cheese trenches under a pitch-black solar eclipse.<br><br>' +
            'Let’s deploy our <strong>📡 Aetheric Radar Dish</strong> (press <strong>[3]</strong> or <strong>Right-Click + Scroll</strong>) and <strong>Left-Click</strong> to scan the canyons and see what’s hiding in the dark.',
          hint: '💡 Action: Select [3] Aetheric Radar on the bottom bar, then Left-Click to pulse a scan!'
        });
      }, 650);
    }
  }

  function spawnInvaderForSector(sector, holeIdx) {
    if (!cheeseScene || !sector || !invaderTextures.length) return;
    const hole = sector.holes[holeIdx % sector.holes.length];
    const coverBunker = sector.bunkers[holeIdx % sector.bunkers.length] || sector.bunkers[0];
    const id = `inv_${nextInvaderId++}`;
    const tex = invaderTextures[nextInvaderId % invaderTextures.length];
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.96 });
    const sprite = new THREE.Sprite(mat);
    sprite.position.copy(hole.pos).addScaledVector(hole.normal, 2.5);
    sprite.scale.set(6.8, 5.2, 1);
    cheeseScene.add(sprite);

    invaders.push({
      id,
      sectorId: sector.id,
      sprite,
      pos: sprite.position,
      vel: hole.normal.clone().multiplyScalar(14.0),
      homeHole: hole,
      coverBunker,
      state: 'hiding',
      latched: false,
      latchOffset: new THREE.Vector3(
        (Math.random() - 0.5) * 7.2,
        1.0 + Math.random() * 2.2,
        (Math.random() - 0.5) * 7.2
      ),
      phase: Math.random() * Math.PI * 2,
      alive: true
    });
  }

  function spawnSectorCoreOrb(sector) {
    if (!cheeseScene || !sector || sector.coreSpawned) return;
    sector.coreSpawned = true;

    const orbGroup = new THREE.Group();
    const spawnPos = sector.centerPos.clone().addScaledVector(sector.normal, 2.5);
    orbGroup.position.copy(spawnPos);

    const coreSphere = new THREE.Mesh(
      new THREE.SphereGeometry(2.1, 18, 16),
      new THREE.MeshBasicMaterial({ color: 0xfacc15 })
    );
    const outerHalo = new THREE.Mesh(
      new THREE.TorusGeometry(3.1, 0.25, 10, 28),
      new THREE.MeshBasicMaterial({ color: 0xc084fc })
    );
    orbGroup.add(coreSphere, outerHalo);
    orbGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), sector.normal);
    cheeseScene.add(orbGroup);

    coreOrbs.push({
      id: `core_${sector.id}`,
      sectorId: sector.id,
      group: orbGroup,
      outerHalo,
      pos: orbGroup.position,
      normal: sector.normal.clone(),
      collected: false
    });

    if (window.showToast) {
      window.showToast(
        '⚡🧀 VOLATILE BUNKER CORE EXPOSED!',
        `Clear the remaining bugs in ${sector.name}, then switch to [1] Tractor Beam to pull out the Core Power-Up!`
      );
    }
    updateObjectiveHUD();
  }

  function onAethericRadarScan(ufoPos) {
    if (!isBuilt) build();
    scanCount++;
    timeSinceLastScan = 0;

    const pos = ufoPos || new THREE.Vector3(0, -10, 0);
    let summaryText = '';

    // 1. If the player is inside the Breached Interior Crater and hasn't deployed the Relay Dish yet, scanning triggers/highlights the Focal Point!
    if (caveBreached && !relayDeployed && pos.distanceTo(INTERIOR_FOCAL_POS) < 42.0) {
      deployRelayDishInCrater();
      return '📡 Relay Dish Deployed in Interior Crater!';
    }

    // 2. Check if we should reveal the Anomalous Sealed Cave Entrance!
    // Reveals when scanning within 78m of the Cave Entrance OR on the 2nd+ scan once at least 1 sector has been discovered!
    const distToCave = pos.distanceTo(CAVE_SURFACE_POS);
    const revealedSectorsCount = cheeseSectors.filter((s) => s.revealed).length;

    if (!caveRevealed && (distToCave < 78.0 || revealedSectorsCount >= 1)) {
      caveRevealed = true;
      if (caveBeaconMesh) caveBeaconMesh.visible = true;
      spawnCheeseBurst(CAVE_SURFACE_POS, 0xc084fc, 24, 1.5);
      summaryText = `Anomalous Sealed Cave Entrance detected (${Math.round(distToCave)}m)!`;

      if (!hasShownCaveAnomalyThought) {
        hasShownCaveAnomalyThought = true;
        showPausedThought({
          badge: '💭 INNER THOUGHT · ANOMALOUS CAVE ENTRANCE',
          title: 'Wait… That’s a Sealed Cave Shaft Into the Moon!',
          body:
            'My Aetheric Radar shows a huge hollow crater right underneath this sealed depression! It’s an <strong>entrance into the moon’s interior</strong>, plugged by thick hardened cheese rind.<br><br>' +
            'Standard Ray Turrets won’t crack a seal that thick on their own… <strong>Wait—what if I collect the 4 volatile Core Power-Ups from the bunkers with my 🟢 Tractor Beam ([1]), drop them all into this sealed pit until they hit Critical Mass, and fire one laser shot into the pile to detonate it?!</strong>',
          hint:
            '💡 Plan: Scan [3] to locate all 4 Bunker Sectors → Bust bunkers & clear bugs [2] → Pull out Core Power-Ups with Tractor Beam [1] → Fly over the Sealed Cave Pit with Tractor Beam active to drop them in!'
        });
      }
    }

    // 3. Also reveal the nearest unrevealed Bunker Sector (if any remain unrevealed!)
    let nearestUnrevealed = null;
    let bestD = Infinity;
    for (let i = 0; i < cheeseSectors.length; i++) {
      const sec = cheeseSectors[i];
      if (sec.revealed) continue;
      const d = pos.distanceTo(sec.centerPos);
      if (d < bestD) {
        bestD = d;
        nearestUnrevealed = sec;
      }
    }

    if (nearestUnrevealed) {
      nearestUnrevealed.revealed = true;
      if (nearestUnrevealed.group) nearestUnrevealed.group.visible = true;
      nearestUnrevealed.bunkers.forEach((b) => {
        if (b.alive && b.group) b.group.visible = true;
      });
      spawnCheeseBurst(nearestUnrevealed.centerPos, 0x38bdf8, 22, 1.4);

      // The scan frequency irritates this sector's finite squad of Space Invader bugs!
      for (let bi = 0; bi < nearestUnrevealed.bugCount; bi++) {
        spawnInvaderForSector(nearestUnrevealed, bi);
      }

      summaryText = `Revealed ${nearestUnrevealed.name} (${Math.round(bestD)}m) — ${nearestUnrevealed.bugCount} bugs irritated!`;

      if (!hasShownFirstBugThought) {
        hasShownFirstBugThought = true;
        showPausedThought({
          badge: '💭 INNER THOUGHT · SCAN IRRITATED THE BUGS!',
          title: 'The Radar Ping Woke Up the Bugs in the Cheese Holes!',
          body:
            'Whoa! Our Aetheric Radar frequency irritated whatever was sleeping inside those Swiss-cheese holes! Flat 2D Space Invader bugs just crawled out to hide behind the cheese bunker in <strong>' +
            nearestUnrevealed.name +
            '</strong>!<br><br>' +
            'Let’s switch to <strong>🔫 Ray Turrets ([2])</strong> (or <strong>Right-Click Sonic Shockwave</strong>) to wipe out this sector’s finite squad of bugs and bust open their bunker—then use our <strong>🟢 Tractor Beam ([1])</strong> to pull the <strong>Core Power-Up</strong> out of the rubble!',
          hint:
            '💡 Good news: Each sector only has a finite squad of bugs! Once you clear them, no more will spawn in that sector so you can use your Tractor Beam in peace.'
        });
      }
    } else if (!summaryText) {
      // All 4 sectors already revealed — point pilot toward nearest uncollected Core or the Cave Entrance!
      const uncollectedCore = coreOrbs.find((c) => !c.collected);
      const aliveBunker = cheeseBunkers.find((b) => b.alive);
      if (uncollectedCore) {
        const d = Math.round(pos.distanceTo(uncollectedCore.pos));
        summaryText = `Exposed Core Power-Up waiting (${d}m) — Pull it out with [1] Tractor Beam!`;
      } else if (aliveBunker) {
        const d = Math.round(pos.distanceTo(aliveBunker.pos));
        summaryText = `Active Cheese Bunker located (${d}m) — Bust it with [2] Ray Turrets!`;
      } else if (!caveBreached) {
        const d = Math.round(pos.distanceTo(CAVE_SURFACE_POS));
        summaryText =
          coresInHole >= CORES_REQUIRED
            ? `Cave Entrance at CRITICAL MASS (${d}m) — Fire [2] Ray Turrets to detonate!`
            : `Sealed Cave Entrance (${d}m) — Drop ${CORES_REQUIRED - coresInHole} more Core(s) in with [1] Tractor Beam!`;
      } else if (!relayDeployed) {
        const d = Math.round(pos.distanceTo(INTERIOR_FOCAL_POS));
        summaryText = `Interior Crater Focal Ring (${d}m below) — Fly down & press [E] to deploy Relay Dish!`;
      } else {
        summaryText = `Hermes' Direct Between Portal is open inside the Interior Crater!`;
      }
    }

    updateObjectiveHUD();
    return summaryText;
  }

  function spawnCheeseBurst(pos, colorHex = 0xfacc15, count = 16, scale = 1.0) {
    if (!cheeseScene || !pos) return;
    const geo = new THREE.BoxGeometry(0.65 * scale, 0.65 * scale, 0.65 * scale);
    const mat = new THREE.MeshBasicMaterial({ color: colorHex });
    for (let i = 0; i < count; i++) {
      const m = new THREE.Mesh(geo, mat);
      m.position.copy(pos);
      cheeseScene.add(m);
      bursts.push({
        mesh: m,
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * 30 * scale,
          (Math.random() - 0.5) * 30 * scale,
          (Math.random() - 0.5) * 30 * scale
        ),
        life: 0.6 + Math.random() * 0.4
      });
    }
  }

  function checkSectorCompletion(sectorId) {
    const sec = cheeseSectors.find((s) => s.id === sectorId);
    if (!sec || !sec.revealed) return;

    const coreBunker = sec.bunkers.find((b) => b.isCoreBunker);
    const allBunkersDown = sec.bunkers.every((b) => !b.alive);
    if ((!coreBunker || !coreBunker.alive || allBunkersDown) && !sec.coreSpawned) {
      spawnSectorCoreOrb(sec);
    }

    const bugsAliveInSector = invaders.some((inv) => inv.alive && inv.sectorId === sectorId);
    if (!bugsAliveInSector && (!coreBunker || !coreBunker.alive) && !sec.cleared) {
      sec.cleared = true;
      if (sec.beaconBeam && sec.beaconBeam.material) {
        sec.beaconBeam.material.color.setHex(0x4ade80);
      }
      if (window.showToast) {
        window.showToast(
          `✅ ${sec.name.toUpperCase()} CLEARED!`,
          'No more bugs in this sector! Switch to [1] Tractor Beam to pull out the Core Power-Up, then scan [3] for the next sector!'
        );
      }
    }
    updateObjectiveHUD();
  }

  function damageBunker(bunker, dmg = 1, fromNetwork = false) {
    if (!bunker || !bunker.alive) return;
    // Hidden un-scanned bunkers cannot be damaged until revealed by Aetheric Radar
    const sec = cheeseSectors.find((s) => s.id === bunker.sectorId);
    if (sec && !sec.revealed) return;

    bunker.hp -= dmg;
    spawnCheeseBurst(bunker.pos, 0xfacc15, 10, 1.1);

    if (bunker.hp <= 0) {
      bunker.alive = false;
      bunkersDestroyedCount++;
      if (bunker.group) bunker.group.visible = false;
      spawnCheeseBurst(bunker.pos, 0xeab308, 24, 1.6);
      if (window.CozyAudio && window.CozyAudio.trapHit) window.CozyAudio.trapHit();

      checkSectorCompletion(bunker.sectorId);

      if (!fromNetwork && window.BlahajNetwork && typeof window.BlahajNetwork.send === 'function') {
        window.BlahajNetwork.send({
          type: 'cheese_event',
          action: 'bunker_destroyed',
          bunkerId: bunker.id
        });
      }
    } else if (bunker.mesh) {
      const s = 0.62 + (bunker.hp / bunker.maxHp) * 0.38;
      bunker.group.scale.set(s, s, s);
      if (bunker.mesh.material && bunker.mesh.material.emissive) {
        bunker.mesh.material.emissive.setHex(0xfef08a);
        setTimeout(() => {
          if (bunker.mesh && bunker.mesh.material && bunker.mesh.material.emissive) {
            bunker.mesh.material.emissive.setHex(0x000000);
          }
        }, 100);
      }
    }
  }

  function destroyInvader(inv, fromNetwork = false) {
    if (!inv || !inv.alive) return;
    inv.alive = false;
    inv.latched = false;
    if (inv.sprite && inv.sprite.parent) inv.sprite.parent.remove(inv.sprite);
    invadersClearedCount++;
    spawnCheeseBurst(inv.pos, 0x7dd3fc, 14, 0.9);
    if (window.CozyAudio && window.CozyAudio.shonk) window.CozyAudio.shonk();

    checkSectorCompletion(inv.sectorId);

    if (!fromNetwork && window.BlahajNetwork && typeof window.BlahajNetwork.send === 'function') {
      window.BlahajNetwork.send({
        type: 'cheese_event',
        action: 'invader_killed',
        invId: inv.id
      });
    }
  }

  function updateCaveCoreSocketsVisual() {
    for (let i = 0; i < caveCoreSocketMeshes.length; i++) {
      const sock = caveCoreSocketMeshes[i];
      if (!sock || !sock.material) continue;
      if (i < coresInHole) {
        sock.material.color.setHex(coresInHole >= CORES_REQUIRED ? 0xf43f5e : 0xfacc15);
        sock.material.opacity = 0.98;
        sock.scale.setScalar(1.25);
      } else {
        sock.material.color.setHex(0x334155);
        sock.material.opacity = 0.5;
        sock.scale.setScalar(1.0);
      }
    }
  }

  function syncCarriedCoreVisuals(ufoPos, elapsed) {
    if (!carriedCoreVisualGroup) return;
    while (carriedCoreVisualGroup.children.length < coresCarried) {
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(0.95, 12, 10),
        new THREE.MeshBasicMaterial({ color: 0xfacc15 })
      );
      carriedCoreVisualGroup.add(m);
    }
    while (carriedCoreVisualGroup.children.length > coresCarried) {
      carriedCoreVisualGroup.remove(carriedCoreVisualGroup.children[carriedCoreVisualGroup.children.length - 1]);
    }
    if (!ufoPos || coresCarried <= 0) {
      carriedCoreVisualGroup.visible = false;
      return;
    }
    carriedCoreVisualGroup.visible = true;
    carriedCoreVisualGroup.position.copy(ufoPos);
    for (let i = 0; i < carriedCoreVisualGroup.children.length; i++) {
      const child = carriedCoreVisualGroup.children[i];
      const ang = elapsed * 3.2 + (i / Math.max(1, coresCarried)) * Math.PI * 2;
      child.position.set(Math.cos(ang) * 3.4, -2.2, Math.sin(ang) * 3.4);
    }
  }

  function detonateCaveCrustSeal(fromNetwork = false) {
    if (caveBreached) return;
    caveBreached = true;
    if (caveRindPlugMesh) caveRindPlugMesh.visible = false;
    caveCoreSocketMeshes.forEach((s) => {
      s.visible = false;
    });
    if (caveBeaconMesh && caveBeaconMesh.material) {
      caveBeaconMesh.material.color.setHex(0x38bdf8);
    }

    spawnCheeseBurst(CAVE_SURFACE_POS, 0xfacc15, 45, 2.4);
    spawnCheeseBurst(CAVE_SURFACE_POS, 0xc084fc, 35, 2.0);
    if (window.CozyAudio && window.CozyAudio.trapHit) window.CozyAudio.trapHit();

    if (!fromNetwork && window.BlahajNetwork && typeof window.BlahajNetwork.send === 'function') {
      window.BlahajNetwork.send({
        type: 'cheese_event',
        action: 'cave_breached'
      });
    }

    updateObjectiveHUD();

    if (!hasShownBreachThought) {
      hasShownBreachThought = true;
      showPausedThought({
        badge: '💥🕳️ INNER THOUGHT · CAVE ENTRANCE BREACHED!',
        title: 'The Crust Seal Blew Wide Open Into an Interior Crater!',
        body:
          'BOOM!! The critical-mass Core pile blasted a vertical shaft straight through the moon’s outer crust into a hollow subterranean <strong>Interior Crater</strong>!<br><br>' +
          'Look at the curved bowl shape of that underground chamber—if we <strong>fly down through the hole</strong>, hover or land at the glowing center ring, and press <strong>[E]</strong> to deploy our <strong>📡 Between-Seam Relay Dish</strong>, the crater walls will amplify the signal loud enough for the crew back on Blåhaj Island to open a <strong>Direct Portal</strong> here!',
        hint:
          '💡 Action: Fly down through the blasted cave hole into the Interior Crater below and press [E] at the center ring to deploy the Relay Dish!'
      });
    }
  }

  function deployRelayDishInCrater(fromNetwork = false) {
    if (relayDeployed) return;
    relayDeployed = true;
    if (relayDishGroup) relayDishGroup.visible = true;
    if (hermesPortalGroup) hermesPortalGroup.visible = true;

    spawnCheeseBurst(INTERIOR_FOCAL_POS, 0xa855f7, 32, 1.6);
    if (window.CozyAudio && window.CozyAudio.portalChime) window.CozyAudio.portalChime();

    try {
      localStorage.setItem('blahaj_cheese_moon_part1_cleared_v1', 'true');
    } catch (e) {}

    if (!fromNetwork && window.BlahajNetwork && typeof window.BlahajNetwork.send === 'function') {
      window.BlahajNetwork.send({
        type: 'cheese_event',
        action: 'relay_deployed'
      });
    }

    updateObjectiveHUD();

    if (!hasShownVictoryThought) {
      hasShownVictoryThought = true;
      showPausedThought({
        badge: '📡🌀 PART 1 COMPLETE · CRATER THRESHOLD ESTABLISHED!',
        title: 'Relay Dish Amplified — Hermes’ Direct Between Portal is Open!',
        body:
          'The concave Interior Crater amplified our Relay Dish signal straight through the Great Seam! Back on Blåhaj Island, <strong>Hermes</strong> locked his Between Lantern onto the beacon and folded a <strong>Direct Between Portal</strong> right beside our ship!<br><br>' +
          'Look at the far wall of this subterranean crater—there’s a sealed tunnel leading deeper toward the <strong>Heart of the Cheese Planetoid</strong>. This sheltered crater is the exact threshold where we’ll build our forward <strong>Cheese Moon Outpost</strong> in Part 2!<br><br>' +
          'Fly into <strong>Hermes’ Violet Portal</strong> beside the Relay Dish (or press <strong>[E]</strong>) whenever you’re ready to return to Blåhaj Island!',
        hint: '💡 Fly into the violet Between Portal inside the crater (or press [E] near it) to warp straight home to Blåhaj Island!'
      });
    }
  }

  function checkPlasmaBoltCollision(boltPos) {
    if (!isBuilt || !boltPos) return false;

    // 0. Check if shooting the Critical-Mass Core Pile inside the Anomalous Cave Entrance!
    if (!caveBreached && coresInHole >= CORES_REQUIRED) {
      if (boltPos.distanceTo(CAVE_SURFACE_POS) <= 16.5) {
        detonateCaveCrustSeal(false);
        return true;
      }
    }

    // 1. Check revealed destructible Swiss-cheese bunkers
    for (let i = 0; i < cheeseBunkers.length; i++) {
      const b = cheeseBunkers[i];
      if (!b.alive) continue;
      const sec = cheeseSectors.find((s) => s.id === b.sectorId);
      if (sec && !sec.revealed) continue;
      if (b.pos.distanceTo(boltPos) <= b.radius) {
        damageBunker(b, 1, false);
        return true;
      }
    }

    // 2. Check 1980s Space Invaders
    for (let i = 0; i < invaders.length; i++) {
      const inv = invaders[i];
      if (!inv.alive) continue;
      if (inv.pos.distanceTo(boltPos) <= 4.8) {
        destroyInvader(inv, false);
        return true;
      }
    }

    // 3. Check if laser bolt hit the Sealed Cave Entrance before Critical Mass (remind player!)
    if (caveRevealed && !caveBreached && boltPos.distanceTo(CAVE_SURFACE_POS) <= 13.5) {
      spawnCheeseBurst(boltPos, 0xc084fc, 8, 0.9);
      return true;
    }

    // 4. Check if laser bolt hit the planetoid canyon walls/floor
    const rel = new THREE.Vector3().subVectors(boltPos, PLANET_CENTER);
    const r = rel.length();
    if (r > 1.0 && r < PLATEAU_TOP_RADIUS + 4.0) {
      const n = rel.clone().divideScalar(r);
      const surfR = getPlanetRadiusAtNormal(n.x, n.y, n.z);
      if (r <= surfR + 1.2) {
        spawnCheeseBurst(boltPos, 0xfacc15, 7, 0.75);
        return true;
      }
    }

    return false;
  }

  function triggerSonicShockwave(originPos) {
    if (!isBuilt || !originPos) return;

    if (!caveBreached && coresInHole >= CORES_REQUIRED && originPos.distanceTo(CAVE_SURFACE_POS) <= 36.0) {
      detonateCaveCrustSeal(false);
    }

    let blasted = 0;
    for (let i = invaders.length - 1; i >= 0; i--) {
      const inv = invaders[i];
      if (!inv.alive) continue;
      if (inv.latched || inv.pos.distanceTo(originPos) <= 45.0) {
        destroyInvader(inv, false);
        blasted++;
      }
    }
    for (let i = 0; i < cheeseBunkers.length; i++) {
      const b = cheeseBunkers[i];
      if (!b.alive) continue;
      const sec = cheeseSectors.find((s) => s.id === b.sectorId);
      if (sec && !sec.revealed) continue;
      if (b.pos.distanceTo(originPos) <= 36.0) {
        damageBunker(b, 3, false);
      }
    }
    if (blasted > 0 && window.showToast) {
      window.showToast(
        '🪩💥 SONIC SHOCKWAVE!',
        `Vaporized ${blasted} Space Invader${blasted === 1 ? '' : 's'} & shattered nearby cheese cover!`
      );
    }
  }

  function updateObjectiveHUD() {
    let banner = document.getElementById('cheese-moon-objective-banner');
    const isCheeseZone =
      window.BlahajUFO &&
      typeof window.BlahajUFO.getState === 'function' &&
      window.BlahajUFO.getState() &&
      window.BlahajUFO.getState().inCheeseMoon;

    if (!isCheeseZone) {
      if (banner) banner.style.display = 'none';
      return;
    }

    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'cheese-moon-objective-banner';
      banner.style.cssText = [
        'position:fixed',
        'top:78px',
        'left:50%',
        'transform:translateX(-50%)',
        'z-index:8900',
        'background:rgba(15, 23, 42, 0.88)',
        'border:1.5px solid #facc15',
        'border-radius:12px',
        'padding:7px 16px',
        'color:#fef08a',
        'font-family:system-ui,-apple-system,sans-serif',
        'font-size:12.5px',
        'font-weight:700',
        'text-align:center',
        'box-shadow:0 8px 24px rgba(0,0,0,0.5)',
        'pointer-events:none',
        'max-width:640px'
      ].join(';');
      document.body.appendChild(banner);
    }

    const revealedCount = cheeseSectors.filter((s) => s.revealed).length;
    const aliveBugs = invaders.filter((x) => x.alive).length;
    const uncollectedCores = coreOrbs.filter((c) => !c.collected).length;

    let stepTitle = '';
    let stepSub = '';

    if (relayDeployed) {
      stepTitle = '🌀 PART 1 COMPLETE: HERMES’ DIRECT PORTAL OPEN IN THE INTERIOR CRATER!';
      stepSub = 'Fly into the Violet Between Portal (or press [E] inside the crater) to return home to Blåhaj Island!';
    } else if (caveBreached) {
      stepTitle = '🕳️ CAVE BREACHED — FLY DOWN INTO THE INTERIOR CRATER & DEPLOY RELAY DISH [E]';
      stepSub = `Cores Detonated: ${CORES_REQUIRED}/${CORES_REQUIRED} · Descend through the cave hole to the glowing Focal Ring & press [E]!`;
    } else if (coresInHole >= CORES_REQUIRED) {
      stepTitle = '⚡💣 CRITICAL MASS (4/4 CORES IN CAVE PIT) — FIRE [2] RAY TURRETS AT THE PIT TO DETONATE!';
      stepSub = 'Switch to [2] Ray Turrets and shoot the glowing Sealed Cave Entrance pit!';
    } else if (coresCarried > 0 && caveRevealed) {
      stepTitle = `🟢 HAULING ${coresCarried} CORE POWER-UP${coresCarried > 1 ? 'S' : ''} — DROP INTO SEALED CAVE ENTRANCE WITH [1] TRACTOR BEAM!`;
      stepSub = `Cave Pit Progress: ${coresInHole}/${CORES_REQUIRED} Cores · Fly over the purple-gold Cave Entrance with [1] Tractor Beam active!`;
    } else if (uncollectedCores > 0 && aliveBugs === 0) {
      stepTitle = '🟢 BUNKER CORE EXPOSED — SWITCH TO [1] TRACTOR BEAM & PULL OUT THE CORE POWER-UP!';
      stepSub = `Sector bugs cleared! Fly over the glowing golden Core with [1] Tractor Beam active (${coresInHole + coresCarried}/${CORES_REQUIRED} collected)`;
    } else if (aliveBugs > 0) {
      stepTitle = `🔫 CLEAR SECTOR BUGS (${aliveBugs} LEFT) & BUST THE SWISS-CHEESE BUNKER!`;
      stepSub = `Use [2] Ray Turrets or Right-Click Sonic Shockwave · Once cleared, no more bugs will spawn here!`;
    } else if (revealedCount < cheeseSectors.length || !caveRevealed) {
      stepTitle = `📡 SCAN THE ECLIPSED MOON: SELECT [3] AETHERIC RADAR & LEFT-CLICK!`;
      stepSub = `Sectors Scanned: ${revealedCount}/${cheeseSectors.length} · Cores in Cave Pit: ${coresInHole}/${CORES_REQUIRED} (Carrying: ${coresCarried})`;
    } else {
      stepTitle = `🧀 BUST REMAINING BUNKERS & DROP ALL 4 CORES INTO THE CAVE ENTRANCE (${coresInHole}/${CORES_REQUIRED})`;
      stepSub = 'Use [2] Ray Turrets to bust bunkers and [1] Tractor Beam to haul Core Power-Ups to the Cave Pit!';
    }

    banner.innerHTML = `<div>${stepTitle}</div><div style="font-size:11.5px;font-weight:600;color:#bae6fd;margin-top:2px;">${stepSub}</div>`;
    banner.style.display = 'block';
  }

  function handleNetworkPacket(data) {
    if (!data || data.type !== 'cheese_event') return;
    if (data.action === 'invader_killed' && data.invId) {
      const inv = invaders.find((x) => x.id === data.invId && x.alive);
      if (inv) destroyInvader(inv, true);
    } else if (data.action === 'bunker_destroyed' && data.bunkerId) {
      const b = cheeseBunkers.find((x) => x.id === data.bunkerId && x.alive);
      if (b) damageBunker(b, 99, true);
    } else if (data.action === 'cave_breached') {
      detonateCaveCrustSeal(true);
    } else if (data.action === 'relay_deployed') {
      deployRelayDishInCrater(true);
    }
  }

  function updateWaypointsOnly(camera) {
    let layer = document.getElementById('cheese-moon-hud-waypoints');
    const ufoState =
      window.BlahajUFO && typeof window.BlahajUFO.getState === 'function'
        ? window.BlahajUFO.getState()
        : null;

    if (!ufoState || !ufoState.inCheeseMoon || !camera) {
      if (layer) layer.style.display = 'none';
      return;
    }

    if (!layer) {
      layer = document.createElement('div');
      layer.id = 'cheese-moon-hud-waypoints';
      layer.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:8800;overflow:hidden;';
      document.body.appendChild(layer);
    }
    layer.style.display = 'block';

    const targets = [];

    // 1. Revealed Active Sectors (not yet cleared)
    for (let i = 0; i < cheeseSectors.length; i++) {
      const sec = cheeseSectors[i];
      if (!sec.revealed || sec.cleared) continue;
      targets.push({
        pos: sec.centerPos,
        label: sec.name.toUpperCase(),
        color: '#38bdf8',
        icon: '◆'
      });
    }

    // 2. Exposed Uncollected Core Power-Ups
    for (let i = 0; i < coreOrbs.length; i++) {
      const c = coreOrbs[i];
      if (!c || c.collected) continue;
      targets.push({
        pos: c.pos,
        label: 'CORE POWER-UP',
        color: '#facc15',
        icon: '◆'
      });
    }

    // 3. Revealed Anomalous Cave Entrance / Interior Crater Focal Point / Hermes Portal
    if (caveRevealed) {
      if (!caveBreached) {
        targets.push({
          pos: CAVE_SURFACE_POS,
          label: coresInHole >= CORES_REQUIRED ? 'SHOOT CAVE PIT!' : `CAVE PIT (${coresInHole}/${CORES_REQUIRED})`,
          color: coresInHole >= CORES_REQUIRED ? '#f43f5e' : '#c084fc',
          icon: '◈'
        });
      } else if (!relayDeployed) {
        targets.push({
          pos: INTERIOR_FOCAL_POS,
          label: 'CRATER FOCAL RING [E]',
          color: '#38bdf8',
          icon: '◈'
        });
      } else if (hermesPortalGroup) {
        const portalWorldPos = new THREE.Vector3().copy(INTERIOR_CRATER_CENTER).add(hermesPortalGroup.position);
        targets.push({
          pos: portalWorldPos,
          label: 'HERMES PORTAL HOME [E]',
          color: '#c084fc',
          icon: '◈'
        });
      }
    }

    const w = window.innerWidth;
    const h = window.innerHeight;
    const padX = 64;
    const padY = 92;
    const proj = new THREE.Vector3();
    let html = '';

    for (let i = 0; i < targets.length; i++) {
      const t = targets[i];
      const dist = ufoState.pos ? Math.round(ufoState.pos.distanceTo(t.pos)) : 0;
      proj.copy(t.pos).project(camera);

      const behind = proj.z > 1.0;
      let sx = (proj.x * 0.5 + 0.5) * w;
      let sy = (-proj.y * 0.5 + 0.5) * h;

      if (behind) {
        sx = w - sx;
        sy = h - sy;
        // Push toward screen border when behind camera
        const dx = sx - w * 0.5;
        const dy = sy - h * 0.5;
        const mag = Math.hypot(dx, dy) || 1;
        sx = w * 0.5 + (dx / mag) * (w * 0.5);
        sy = h * 0.5 + (dy / mag) * (h * 0.5);
      }

      const clamped = sx < padX || sx > w - padX || sy < padY || sy > h - padY || behind;
      sx = Math.max(padX, Math.min(w - padX, sx));
      sy = Math.max(padY, Math.min(h - padY, sy));

      html += `
        <div style="position:absolute;left:${sx.toFixed(1)}px;top:${sy.toFixed(1)}px;transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;gap:2px;font-family:system-ui,-apple-system,sans-serif;opacity:${clamped ? '0.82' : '0.96'};">
          <div style="width:18px;height:18px;transform:rotate(45deg);border:2px solid ${t.color};background:rgba(15,23,42,0.75);box-shadow:0 0 12px ${t.color};display:flex;align-items:center;justify-content:center;">
            <div style="width:6px;height:6px;background:${t.color};"></div>
          </div>
          <div style="margin-top:4px;background:rgba(15,23,42,0.84);border:1px solid ${t.color};border-radius:6px;padding:2px 6px;color:#f8fafc;font-size:10px;font-weight:800;letter-spacing:0.04em;white-space:nowrap;text-shadow:0 1px 2px #000;">
            ${t.label} · ${dist}m
          </div>
        </div>
      `;
    }

    layer.innerHTML = html;
  }

  function update(dt, elapsed, camera) {
    if (!isBuilt) build();

    // Hide banner & waypoints automatically if player left the Cheese Moon
    const ufoState =
      window.BlahajUFO && typeof window.BlahajUFO.getState === 'function'
        ? window.BlahajUFO.getState()
        : null;
    if (!ufoState || !ufoState.inCheeseMoon) {
      const banner = document.getElementById('cheese-moon-objective-banner');
      if (banner) banner.style.display = 'none';
      const wpLayer = document.getElementById('cheese-moon-hud-waypoints');
      if (wpLayer) wpLayer.style.display = 'none';
      return;
    }

    updateObjectiveHUD();
    updateWaypointsOnly(camera);

    if (eclipseGroup) {
      eclipseGroup.lookAt(0, -40, 0);
    }
    if (reentryRingMesh) {
      reentryRingMesh.rotation.z = elapsed * 0.9;
    }
    if (craterFocalRingMesh) {
      craterFocalRingMesh.rotation.z = -elapsed * 1.4;
    }
    if (relayDishSpinner && relayDeployed) {
      relayDishSpinner.rotation.y = elapsed * 1.8;
    }
    if (hermesPortalRing && relayDeployed) {
      hermesPortalRing.rotation.z = elapsed * 2.2;
    }

    // Pulse the Sealed Cave Plug as more Cores are dropped in!
    if (caveRindPlugMesh && !caveBreached && caveRindPlugMesh.material) {
      const heat = coresInHole / CORES_REQUIRED;
      const pulse = 0.5 + 0.5 * Math.sin(elapsed * (3.0 + heat * 12.0));
      caveRindPlugMesh.material.emissiveIntensity = 0.4 + heat * 1.2 * pulse;
      if (coresInHole >= CORES_REQUIRED) {
        caveRindPlugMesh.material.emissive.setHex(pulse > 0.5 ? 0xf43f5e : 0xfacc15);
      }
    }

    // Animate exposed Core Power-Up Orbs
    for (let i = 0; i < coreOrbs.length; i++) {
      const c = coreOrbs[i];
      if (c.collected || !c.group) continue;
      if (c.outerHalo) {
        c.outerHalo.rotation.x = elapsed * 2.6;
        c.outerHalo.rotation.y = elapsed * 1.9;
      }
    }

    // Gentle New-Player Scan Reminder if they haven't scanned when a scan is needed
    const aliveBugsCount = invaders.filter((x) => x.alive).length;
    const uncollectedCoresCount = coreOrbs.filter((c) => !c.collected).length;
    const unrevealedSectorsCount = cheeseSectors.filter((s) => !s.revealed).length;
    if (
      aliveBugsCount === 0 &&
      uncollectedCoresCount === 0 &&
      coresCarried === 0 &&
      (unrevealedSectorsCount > 0 || !caveRevealed)
    ) {
      timeSinceLastScan += dt;
      if (timeSinceLastScan > 18.0 && performance.now() - lastScanReminderAt > 18000) {
        lastScanReminderAt = performance.now();
        if (window.showToast) {
          window.showToast(
            '📡 REMINDER: USE YOUR AETHERIC RADAR DISH!',
            'Press [3] (or Right-Click + Scroll to Aetheric Radar) and Left-Click to scan for the next hidden Bunker Sector or Anomalous Cave!'
          );
        }
      }
    }

    // Update particle bursts
    for (let i = bursts.length - 1; i >= 0; i--) {
      const b = bursts[i];
      b.life -= dt;
      b.mesh.position.addScaledVector(b.vel, dt);
      b.mesh.scale.setScalar(Math.max(0.05, b.life * 1.4));
      if (b.life <= 0) {
        if (b.mesh.parent) b.mesh.parent.remove(b.mesh);
        bursts.splice(i, 1);
      }
    }

    // Update finite Space Invader bugs (NO endless respawning!)
    let latchedCount = 0;
    for (let i = invaders.length - 1; i >= 0; i--) {
      const inv = invaders[i];
      if (!inv.alive) {
        invaders.splice(i, 1);
        continue;
      }

      const stepBob = Math.sin(elapsed * 6.0 + inv.phase) > 0 ? 0.55 : -0.55;
      inv.sprite.scale.set(6.8 + stepBob, 5.2 - stepBob * 0.4, 1);

      if (inv.latched && ufoState && ufoState.pos) {
        latchedCount++;
        inv.pos.copy(ufoState.pos).add(inv.latchOffset);
        if (
          ufoState.turboActive &&
          Math.abs(ufoState.spaceAngVelRoll || 0) > 1.8 &&
          Math.random() < dt * 1.5
        ) {
          inv.latched = false;
          inv.state = 'ambush';
          inv.vel.set((Math.random() - 0.5) * 28, 12, (Math.random() - 0.5) * 28);
        }
      } else if (ufoState && ufoState.pos) {
        const distToUfo = inv.pos.distanceTo(ufoState.pos);
        const hasCover = !!(inv.coverBunker && inv.coverBunker.alive);

        // Bugs stay near their own sector bunker until UFO approaches within 48m or their bunker is shattered
        if (hasCover && distToUfo > 48.0) {
          inv.state = 'hiding';
          const hidePos = inv.coverBunker.pos.clone();
          const strafe = Math.sin(elapsed * 2.6 + inv.phase) * 4.2;
          hidePos.x += strafe;
          inv.pos.lerp(hidePos, Math.min(1.0, dt * 3.5));
        } else if (distToUfo < 85.0) {
          inv.state = 'ambush';
          const toUfo = new THREE.Vector3().subVectors(ufoState.pos, inv.pos);
          const d = toUfo.length();
          if (d < 6.2) {
            inv.latched = true;
            latchedCount++;
            if (window.showToast) {
              window.showToast(
                '👾 SPACE INVADER GRABBED THE HULL!',
                'Blast with [2] Ray Turrets or Right-Click Sonic Shockwave to shake them off!'
              );
            }
          } else if (d > 0.1) {
            toUfo.normalize();
            const chaseSpeed = hasCover ? 20.0 : 23.0;
            inv.vel.lerp(toUfo.multiplyScalar(chaseSpeed), Math.min(1.0, dt * 2.2));
            inv.pos.addScaledVector(inv.vel, dt);
          }
        }
      }
    }

    if (ufoState && ufoState.pos) {
      syncCarriedCoreVisuals(ufoState.pos, elapsed);

      // A. Tractor Beam Core Power-Up Extraction & Cave Pit Dropping!
      const tractorActive = !!(ufoState.tractorBeam || ufoState.activeModuleIdx === 0);
      for (let i = 0; i < coreOrbs.length; i++) {
        const c = coreOrbs[i];
        if (c.collected || !c.group) continue;
        const dCore = ufoState.pos.distanceTo(c.pos);
        const pullRadius = ufoState.tractorBeam ? 32.0 : (ufoState.activeModuleIdx === 0 ? 18.0 : 0);
        if (dCore < pullRadius) {
          // Pull the glowing Core Power-Up straight toward the UFO's lower Tractor Beam dish!
          c.pos.lerp(ufoState.pos, Math.min(1.0, dt * 5.5));
          if (dCore < 7.5) {
            c.collected = true;
            c.group.visible = false;
            coresCarried++;
            const sec = cheeseSectors.find((s) => s.id === c.sectorId);
            if (sec) sec.coreCollected = true;

            spawnCheeseBurst(ufoState.pos, 0xfacc15, 20, 1.2);
            if (window.CozyAudio && window.CozyAudio.portalChime) window.CozyAudio.portalChime();

            // Bonus: Pulling a Core Power-Up recharges Gravitronic Shields!
            if (typeof ufoState.shieldHp === 'number') {
              ufoState.shieldHp = Math.min(ufoState.maxShieldHp || 100, ufoState.shieldHp + 40);
            }

            if (window.showToast) {
              window.showToast(
                `🟢⚡ CORE POWER-UP EXTRACTED! (Carrying: ${coresCarried})`,
                caveRevealed
                  ? 'Fly over the Sealed Cave Entrance with your [1] Tractor Beam to drop it into the pit!'
                  : 'Shields +40%! Switch to [3] Aetheric Radar & Left-Click to locate the Anomalous Cave Entrance!'
              );
            }
            updateObjectiveHUD();
          }
        }
      }

      // B. Dropping Carried Core Power-Ups into the Anomalous Sealed Cave Entrance with Tractor Beam!
      if (coresCarried > 0 && !caveBreached) {
        const dCave = ufoState.pos.distanceTo(CAVE_SURFACE_POS);
        if (dCave < (tractorActive ? 26.0 : 14.0)) {
          if (!caveRevealed) {
            caveRevealed = true;
            if (caveBeaconMesh) caveBeaconMesh.visible = true;
          }
          const droppedNow = coresCarried;
          coresInHole = Math.min(CORES_REQUIRED, coresInHole + droppedNow);
          coresCarried = 0;
          updateCaveCoreSocketsVisual();
          spawnCheeseBurst(CAVE_SURFACE_POS, 0xc084fc, 24, 1.5);
          if (window.CozyAudio && window.CozyAudio.portalChime) window.CozyAudio.portalChime();

          if (coresInHole >= CORES_REQUIRED) {
            if (!hasShownCriticalMassThought) {
              hasShownCriticalMassThought = true;
              showPausedThought({
                badge: '⚡💣 INNER THOUGHT · CRITICAL MASS REACHED!',
                title: 'All 4 Core Power-Ups Are Packed in the Cave Pit!',
                body:
                  'The Sealed Cave Entrance is vibrating at <strong>Critical Mass (4/4 Cores)</strong>!<br><br>' +
                  'Let’s switch to <strong>🔫 Ray Turrets ([2])</strong> and <strong>fire a single laser shot into the glowing cave pit</strong> to detonate the pile and blast open the shaft into the moon’s interior!',
                hint: '💡 Switch to [2] Ray Turrets and shoot the glowing Sealed Cave Entrance pit!'
              });
            }
          } else if (window.showToast) {
            window.showToast(
              `🕳️⚡ CORE DROPPED INTO CAVE PIT! (${coresInHole}/${CORES_REQUIRED})`,
              `Need ${CORES_REQUIRED - coresInHole} more Core Power-Up${CORES_REQUIRED - coresInHole === 1 ? '' : 's'} to reach Critical Mass! Scan [3] for remaining bunkers.`
            );
          }
          updateObjectiveHUD();
        }
      }

      // C. Latched Invader Drag & Damage
      if (latchedCount > 0 && ufoState.vel) {
        ufoState.vel.multiplyScalar(Math.max(0.45, 1.0 - latchedCount * 0.12 * dt * 5.0));
        if (
          ufoState.localRole === 'pilot' &&
          window.BlahajUFO &&
          typeof window.BlahajUFO.applyImpactDamage === 'function'
        ) {
          window.BlahajUFO.applyImpactDamage(4.5 * latchedCount, 'Space Invader Hull Grapple', false);
        }
      }

      // D. Planetoid Surface & Subterranean Interior Crater Collision
      const distToCraterCenter = ufoState.pos.distanceTo(INTERIOR_CRATER_CENTER);
      const horizDistToShaft = Math.hypot(
        ufoState.pos.x - CAVE_SURFACE_POS.x,
        ufoState.pos.z - CAVE_SURFACE_POS.z
      );
      const inBreachShaftOrCrater =
        caveBreached && (horizDistToShaft < 19.5 || distToCraterCenter < INTERIOR_CRATER_RADIUS + 4.0);

      if (inBreachShaftOrCrater && ufoState.pos.y < CAVE_SURFACE_POS.y + 4.0) {
        // Inside the Breach Shaft or Subterranean Interior Crater Bowl!
        if (ufoState.pos.y < INTERIOR_CRATER_CENTER.y + 8.0) {
          // Constrain smoothly inside the spherical Interior Crater Bowl
          const fromCrater = new THREE.Vector3().subVectors(ufoState.pos, INTERIOR_CRATER_CENTER);
          const dC = fromCrater.length();
          const maxCraterR = INTERIOR_CRATER_RADIUS - 5.2;
          if (dC > maxCraterR && dC > 0.01) {
            // Allow exit up through the top breach hole (horizDistToShaft < 16.5 && y > INTERIOR_CRATER_CENTER.y + 12)
            const isTopExit = horizDistToShaft < 16.5 && ufoState.pos.y > INTERIOR_CRATER_CENTER.y + 10.0;
            if (!isTopExit) {
              const inwardN = fromCrater.divideScalar(dC);
              ufoState.pos.copy(INTERIOR_CRATER_CENTER).addScaledVector(inwardN, maxCraterR);
              if (ufoState.vel) {
                const outVel = ufoState.vel.dot(inwardN);
                if (outVel > 0) ufoState.vel.addScaledVector(inwardN, -1.1 * outVel);
              }
            }
          }
          // Floor of the Interior Crater Bowl
          const floorY = INTERIOR_FOCAL_POS.y + 2.2;
          if (ufoState.pos.y < floorY) {
            ufoState.pos.y = floorY;
            if (ufoState.vel && ufoState.vel.y < 0) ufoState.vel.y = 0;
          }
        }
      } else {
        // Outer Spherical Planetoid & Trench Wall Collision
        const rel = new THREE.Vector3().subVectors(ufoState.pos, PLANET_CENTER);
        const distFromCenter = rel.length();
        if (distFromCenter > 1.0) {
          const upNorm = rel.clone().divideScalar(distFromCenter);
          const surfRadius = getPlanetRadiusAtNormal(upNorm.x, upNorm.y, upNorm.z);
          const minSafeRadius = surfRadius + 5.2;
          if (distFromCenter < minSafeRadius) {
            ufoState.pos.copy(PLANET_CENTER).addScaledVector(upNorm, minSafeRadius);
            if (ufoState.vel) {
              const radialVel = ufoState.vel.dot(upNorm);
              if (radialVel < 0) {
                ufoState.vel.addScaledVector(upNorm, -1.15 * radialVel);
              }
            }
          }
        }
      }

      // E. Collide with Revealed Intact Swiss-Cheese Bunkers
      for (let i = 0; i < cheeseBunkers.length; i++) {
        const b = cheeseBunkers[i];
        if (!b.alive) continue;
        const sec = cheeseSectors.find((s) => s.id === b.sectorId);
        if (sec && !sec.revealed) continue;
        const diffB = new THREE.Vector3().subVectors(ufoState.pos, b.pos);
        const dB = diffB.length();
        const minB = b.radius + 4.4;
        if (dB < minB && dB > 0.01) {
          const nB = diffB.divideScalar(dB);
          ufoState.pos.copy(b.pos).addScaledVector(nB, minB + 0.2);
          if (ufoState.vel) ufoState.vel.addScaledVector(nB, 14.0);
          damageBunker(b, 2, false);
        }
      }

      // F. Inside Interior Crater: Check Proximity to Focal Ring ([E] Deploy Relay Dish) & Hermes' Direct Portal
      if (caveBreached && ufoState.localRole === 'pilot') {
        const dFocal = ufoState.pos.distanceTo(INTERIOR_FOCAL_POS);
        if (!relayDeployed && dFocal < 18.0) {
          // Show interaction prompt to deploy Relay Dish with [E]
          const promptEl = document.getElementById('interaction-prompt');
          const textEl = document.getElementById('interaction-text');
          if (promptEl && textEl) {
            textEl.textContent = '📡 Land & Deploy Between-Seam Relay Dish in Crater Amplifier [E]';
            promptEl.classList.remove('hidden');
          }
        } else if (relayDeployed && hermesPortalGroup) {
          const portalWorldPos = new THREE.Vector3()
            .copy(INTERIOR_CRATER_CENTER)
            .add(hermesPortalGroup.position);
          const dPortal = ufoState.pos.distanceTo(portalWorldPos);
          if (dPortal < 9.5) {
            if (window.BlahajGame && typeof window.BlahajGame.returnHomeFromCheeseMoon === 'function') {
              window.BlahajGame.returnHomeFromCheeseMoon(true);
            }
          }
        }
      }

      // G. Emergency Orbital Re-Entry Gate back to Deep Space
      if (ufoState.localRole === 'pilot' && ufoState.pos.distanceTo(REENTRY_POS) < REENTRY_RADIUS) {
        if (window.BlahajGame && typeof window.BlahajGame.exitCheeseMoon === 'function') {
          window.BlahajGame.exitCheeseMoon(true);
        }
      }
    }
  }

  // Handle [E] key inside Cheese Moon (Deploy Relay Dish in Interior Crater or Enter Hermes' Direct Portal)
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'e' && e.key !== 'E') return;
    const ufoState =
      window.BlahajUFO && typeof window.BlahajUFO.getState === 'function'
        ? window.BlahajUFO.getState()
        : null;
    if (!ufoState || !ufoState.inCheeseMoon || !ufoState.pos) return;
    if (
      window.BlahajGame &&
      typeof window.BlahajGame.isCurrentInstancePaused === 'function' &&
      window.BlahajGame.isCurrentInstancePaused()
    ) {
      return;
    }

    if (caveBreached && !relayDeployed && ufoState.pos.distanceTo(INTERIOR_FOCAL_POS) < 24.0) {
      e.preventDefault();
      if (ufoState.vel) ufoState.vel.set(0, 0, 0);
      ufoState.spaceThrottle = 0;
      deployRelayDishInCrater(false);
    } else if (relayDeployed && ufoState.pos.distanceTo(INTERIOR_FOCAL_POS) < 28.0) {
      e.preventDefault();
      if (window.BlahajGame && typeof window.BlahajGame.returnHomeFromCheeseMoon === 'function') {
        window.BlahajGame.returnHomeFromCheeseMoon(true);
      }
    }
  });

  return {
    build,
    update,
    updateWaypointsOnly,
    onEnterZone,
    onAethericRadarScan,
    getScene: () => (isBuilt ? cheeseScene : build()),
    getPlanetCenter: () => PLANET_CENTER,
    getSurfaceRadiusAtNormal: getPlanetRadiusAtNormal,
    checkPlasmaBoltCollision,
    triggerSonicShockwave,
    handleNetworkPacket,
    getStats: () => ({
      invadersClearedCount,
      bunkersDestroyedCount,
      coresCarried,
      coresInHole,
      caveRevealed,
      caveBreached,
      relayDeployed
    }),
    getRadarBlips: () => {
      const blips = [];
      let activeInvaders = 0;
      for (let i = 0; i < invaders.length; i++) {
        const inv = invaders[i];
        if (!inv || !inv.alive) continue;
        activeInvaders++;
        blips.push({
          x: inv.pos.x,
          y: inv.pos.y,
          z: inv.pos.z,
          kind: inv.latched ? 'latched' : 'invader',
          tier: 1
        });
      }
      // Show revealed bunkers
      for (let i = 0; i < cheeseBunkers.length; i++) {
        const b = cheeseBunkers[i];
        if (!b || !b.alive) continue;
        const sec = cheeseSectors.find((s) => s.id === b.sectorId);
        if (sec && !sec.revealed) continue;
        blips.push({ x: b.pos.x, y: b.pos.y, z: b.pos.z, kind: 'monolith', tier: 2 });
      }
      // Show exposed uncollected Core Power-Ups as bright gold gate/core blips
      for (let i = 0; i < coreOrbs.length; i++) {
        const c = coreOrbs[i];
        if (!c || c.collected) continue;
        blips.push({ x: c.pos.x, y: c.pos.y, z: c.pos.z, kind: 'gate', tier: 0 });
      }
      // Show Anomalous Cave Entrance / Interior Crater Focal Point once revealed
      if (caveRevealed) {
        const targetPos = caveBreached ? INTERIOR_FOCAL_POS : CAVE_SURFACE_POS;
        blips.push({ x: targetPos.x, y: targetPos.y, z: targetPos.z, kind: 'gate', tier: 0 });
      }
      blips.push({ x: REENTRY_POS.x, y: REENTRY_POS.y, z: REENTRY_POS.z, kind: 'gate', tier: 0 });

      const label = relayDeployed
        ? 'PORTAL OPEN!'
        : caveBreached
        ? 'ENTER CRATER'
        : coresInHole >= CORES_REQUIRED
        ? 'SHOOT CAVE PIT!'
        : activeInvaders > 0
        ? `BUGS: ${activeInvaders}`
        : `CORES: ${coresInHole + coresCarried}/${CORES_REQUIRED}`;

      return {
        label,
        cleared: relayDeployed,
        blips
      };
    }
  };
})();
