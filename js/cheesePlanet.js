// ============================================================================
// BLÅHAJ ISLAND — THE SWISS CHEESE PLANETOID (js/cheesePlanet.js)
// v17.9: Full 24-Bunker / 8-Sector Tactical Battles, Multi-HP Space Invader
//        Bugs with Pixel-Torpedoes, Phase-Cloak & Sonic-Shockwave Stun Counter-
//        play, Built-In Subspace Vault Tractor Beam Core Hauling & Disgorging,
//        and Hyperspace Checkpoint Respawn on Hull Breach!
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
    .addScaledVector(CAVE_NORMAL, TRENCH_FLOOR_RADIUS + 0.6);

  // Subterranean Interior Crater Bowl directly beneath the Breach Shaft!
  const INTERIOR_CRATER_CENTER = new THREE.Vector3(
    CAVE_SURFACE_POS.x,
    CAVE_SURFACE_POS.y - 38.0,
    CAVE_SURFACE_POS.z
  );
  const INTERIOR_CRATER_RADIUS = 34.0;
  const INTERIOR_FOCAL_POS = new THREE.Vector3(
    INTERIOR_CRATER_CENTER.x,
    INTERIOR_CRATER_CENTER.y - INTERIOR_CRATER_RADIUS + 6.5,
    INTERIOR_CRATER_CENTER.z
  );

  const REENTRY_POS = new THREE.Vector3(0, 38.0, -98.0);
  const REENTRY_RADIUS = 13.5;

  let planetoidGroup = null;
  let eclipseGroup = null;
  let reentryGateGroup = null;
  let reentryRingMesh = null;

  // 8 Trench Sectors × 3 Fortified Bunkers = 24 Bunkers total around the planetoid!
  const SECTOR_DEFS = [
    { id: 'sector_north', name: 'North Meridian Gorge', normal: new THREE.Vector3(0.0, 0.955, 0.295).normalize(), bugCount: 7 },
    { id: 'sector_ne', name: 'Northeast Eclipse Basin', normal: new THREE.Vector3(0.36, 0.91, 0.20).normalize(), bugCount: 7 },
    { id: 'sector_east', name: 'East Eclipse Trench', normal: new THREE.Vector3(0.48, 0.86, -0.16).normalize(), bugCount: 7 },
    { id: 'sector_se', name: 'Southeast Rind Narrow', normal: new THREE.Vector3(0.34, 0.84, -0.42).normalize(), bugCount: 7 },
    { id: 'sector_south', name: 'South Shadow Rim', normal: new THREE.Vector3(0.0, 0.83, -0.55).normalize(), bugCount: 8 },
    { id: 'sector_sw', name: 'Southwest Fondue Chasm', normal: new THREE.Vector3(-0.34, 0.84, -0.42).normalize(), bugCount: 7 },
    { id: 'sector_west', name: 'West Geode Canyon', normal: new THREE.Vector3(-0.48, 0.86, -0.16).normalize(), bugCount: 7 },
    { id: 'sector_nw', name: 'Northwest Crater Approach', normal: new THREE.Vector3(-0.36, 0.91, 0.20).normalize(), bugCount: 7 }
  ];

  const cheeseSectors = [];
  const cheeseBunkers = [];
  const coreOrbs = []; // Volatile Core Power-Ups exposed only when ALL 3 bunkers AND ALL bugs in a sector are defeated
  const invaders = [];
  const invaderBolts = []; // 1980s Pixel-Plasma Torpedoes fired by the Space Invaders!
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
  let coresInHole = 0;
  const CORES_REQUIRED = 6; // Collect & disgorge 6 Cores from the 8 3-bunker sector strongholds!
  let relayDeployed = false;

  let lastScanReminderAt = 0;
  let timeSinceLastScan = 0;

  let caveAnomalyGroup = null;
  let caveRindPlugMesh = null;
  let caveCoreSocketMeshes = [];
  let interiorCraterGroup = null;
  let craterFocalRingMesh = null;
  let relayDishGroup = null;
  let relayDishSpinner = null;
  let hermesPortalGroup = null;
  let hermesPortalRing = null;

  let invaderTextures = [];
  let stunnedInvaderTexture = null;
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

    // 4. Build 8 Scan-Revealed Bunker Sectors (24 Fortified Swiss-Cheese Bunkers total!)
    cheeseSectors.length = 0;
    cheeseBunkers.length = 0;
    coreOrbs.length = 0;

    SECTOR_DEFS.forEach((sDef, sIdx) => {
      const secGroup = new THREE.Group();
      const centerPos = new THREE.Vector3()
        .copy(PLANET_CENTER)
        .addScaledVector(sDef.normal, TRENCH_FLOOR_RADIUS + 3.2);

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

      // 3 Heavily Fortified Swiss-Cheese Bunkers per Sector (24 Bunkers total!)
      const sectorBunkers = [];
      [-1, 0, 1].forEach((offsetIdx) => {
        const bGroup = new THREE.Group();
        const bPos = centerPos.clone()
          .addScaledVector(fwdDir, offsetIdx * 11.5)
          .addScaledVector(sideDir, offsetIdx === 0 ? 0 : offsetIdx * 4.5);
        bGroup.position.copy(bPos);
        bGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), sDef.normal);

        const isCoreBunker = offsetIdx === 0;
        const bw = isCoreBunker ? 9.8 : 8.0;
        const bh = isCoreBunker ? 6.6 : 5.4;
        const bd = isCoreBunker ? 5.8 : 4.6;

        const mainBlock = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), bunkerMat.clone());
        const notchL = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.2, bd * 0.9), bunkerMat);
        notchL.position.set(-bw * 0.3, bh * 0.55, 0);
        const notchR = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.2, bd * 0.9), bunkerMat);
        notchR.position.set(bw * 0.3, bh * 0.55, 0);
        const darkPore = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, bd + 0.3, 12), holeMat);
        darkPore.rotation.x = Math.PI / 2;
        bGroup.add(mainBlock, notchL, notchR, darkPore);

        if (isCoreBunker) {
          const coreGlowRing = new THREE.Mesh(
            new THREE.TorusGeometry(3.2, 0.28, 10, 24),
            new THREE.MeshBasicMaterial({ color: 0xfacc15 })
          );
          coreGlowRing.rotation.x = Math.PI / 2;
          coreGlowRing.position.y = bh * 0.5 + 0.4;
          bGroup.add(coreGlowRing);
        }

        bGroup.visible = false;
        planetoidGroup.add(bGroup);

        // High HP so bunkers require sustained fire — especially once their bug defenders are cleared!
        const maxHp = isCoreBunker ? 24 : 16;
        const bObj = {
          id: `bunker_${sIdx}_${offsetIdx + 1}`,
          sectorId: sDef.id,
          isCoreBunker,
          group: bGroup,
          mesh: mainBlock,
          pos: bPos,
          normal: sDef.normal.clone(),
          hp: maxHp,
          maxHp,
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
        sideDir,
        fwdDir,
        bugCount: sDef.bugCount,
        group: secGroup,
        holes: sectorHoles,
        bunkers: sectorBunkers,
        revealed: false,
        cleared: false,
        coreSpawned: false
      });
    });

    // 5. Anomalous Sealed Cave Entrance & Subterranean Interior Crater
    buildAnomalousCaveAndCrater(cheeseTex);

    cheeseScene.add(planetoidGroup);

    // 6. 1980s Pixel Space Invader Textures (+ Stunned Gold Texture when hit by Sonic Shockwave!)
    invaderTextures = [
      createInvaderTexture(INVADER_BITMAPS[0], '#7dd3fc', '#050811'),
      createInvaderTexture(INVADER_BITMAPS[1], '#38bdf8', '#050811'),
      createInvaderTexture(INVADER_BITMAPS[0], '#c084fc', '#140524')
    ];
    stunnedInvaderTexture = createInvaderTexture(INVADER_BITMAPS[1], '#facc15', '#422006');
    invaders.length = 0;
    invaderBolts.length = 0;

    // 7. Golden Orbital Warp-Out Gate
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

    isBuilt = true;
    return cheeseScene;
  }

  function buildAnomalousCaveAndCrater(cheeseTex) {
    caveAnomalyGroup = new THREE.Group();
    caveAnomalyGroup.position.copy(CAVE_SURFACE_POS);
    caveAnomalyGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), CAVE_NORMAL);

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

    // 6 Glowing Core Sockets on top of the Sealed Cave Plug (0/6..6/6)
    caveCoreSocketMeshes = [];
    for (let i = 0; i < CORES_REQUIRED; i++) {
      const ang = (i / CORES_REQUIRED) * Math.PI * 2;
      const sock = new THREE.Mesh(
        new THREE.SphereGeometry(1.65, 16, 14),
        new THREE.MeshBasicMaterial({
          color: 0x334155,
          transparent: true,
          opacity: 0.55
        })
      );
      sock.position.set(Math.cos(ang) * 5.6, 1.6, Math.sin(ang) * 5.6);
      caveAnomalyGroup.add(sock);
      caveCoreSocketMeshes.push(sock);
    }

    planetoidGroup.add(caveAnomalyGroup);

    // Subterranean Interior Crater Bowl
    interiorCraterGroup = new THREE.Group();
    interiorCraterGroup.position.copy(INTERIOR_CRATER_CENTER);

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

    craterFocalRingMesh = new THREE.Mesh(
      new THREE.TorusGeometry(8.5, 0.45, 12, 36),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    craterFocalRingMesh.rotation.x = Math.PI / 2;
    craterFocalRingMesh.position.y = -INTERIOR_CRATER_RADIUS + 6.4;
    interiorCraterGroup.add(craterFocalRingMesh);

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

    // Deployable Between-Seam Relay Dish
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

  function resetEncounterOnDefeat() {
    // Called if the Space Invader bugs destroy the UFO and send you back to your Mojo Hyperspace checkpoint!
    for (let i = invaders.length - 1; i >= 0; i--) {
      if (invaders[i].sprite && invaders[i].sprite.parent) {
        invaders[i].sprite.parent.remove(invaders[i].sprite);
      }
    }
    invaders.length = 0;

    for (let i = invaderBolts.length - 1; i >= 0; i--) {
      if (invaderBolts[i].mesh && invaderBolts[i].mesh.parent) {
        invaderBolts[i].mesh.parent.remove(invaderBolts[i].mesh);
      }
    }
    invaderBolts.length = 0;

    // Reset any partially-cleared revealed sectors so when you return from Hyperspace, their battle restarts cleanly!
    cheeseSectors.forEach((sec) => {
      if (sec.revealed && !sec.cleared) {
        sec.revealed = false;
        if (sec.group) sec.group.visible = false;
        sec.bunkers.forEach((b) => {
          b.alive = true;
          b.hp = b.maxHp;
          if (b.group) {
            b.group.scale.set(1, 1, 1);
            b.group.visible = false;
          }
        });
      }
    });
  }

  function spawnInvaderForSector(sector, holeIdx) {
    if (!cheeseScene || !sector || !invaderTextures.length) return;
    const hole = sector.holes[holeIdx % sector.holes.length];
    const coverBunker = sector.bunkers[holeIdx % sector.bunkers.length] || sector.bunkers[0];
    const id = `inv_${nextInvaderId++}`;
    const baseTex = invaderTextures[nextInvaderId % invaderTextures.length];
    const mat = new THREE.SpriteMaterial({ map: baseTex, transparent: true, opacity: 0.96 });
    const sprite = new THREE.Sprite(mat);
    sprite.position.copy(hole.pos).addScaledVector(hole.normal, 2.5 + (holeIdx % 3) * 3.0);
    sprite.scale.set(7.4, 5.6, 1);
    cheeseScene.add(sprite);

    invaders.push({
      id,
      sectorId: sector.id,
      sprite,
      mat,
      baseTex,
      pos: sprite.position,
      vel: hole.normal.clone().multiplyScalar(16.0),
      homeHole: hole,
      coverBunker,
      hp: 6,
      maxHp: 6,
      stunTimer: 0,
      cloakPhase: Math.random() * Math.PI * 2,
      cloaked: false,
      fireCooldown: 1.4 + Math.random() * 2.2,
      state: 'ambush',
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

  function spawnInvaderBolt(fromPos, targetPos) {
    if (!cheeseScene || !fromPos || !targetPos) return;
    const dir = new THREE.Vector3().subVectors(targetPos, fromPos).normalize();
    const boltMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.85, 0.85, 3.2),
      new THREE.MeshBasicMaterial({ color: 0xf43f5e })
    );
    boltMesh.position.copy(fromPos);
    boltMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
    cheeseScene.add(boltMesh);
    invaderBolts.push({
      mesh: boltMesh,
      vel: dir.multiplyScalar(48.0),
      life: 2.6
    });
  }

  function spawnSectorCoreOrb(sector) {
    if (!cheeseScene || !sector || sector.coreSpawned) return;
    sector.coreSpawned = true;

    const orbGroup = new THREE.Group();
    const spawnPos = sector.centerPos.clone().addScaledVector(sector.normal, 2.4);
    orbGroup.position.copy(spawnPos);

    const coreSphere = new THREE.Mesh(
      new THREE.SphereGeometry(2.2, 18, 16),
      new THREE.MeshBasicMaterial({ color: 0xfacc15 })
    );
    const outerHalo = new THREE.Mesh(
      new THREE.TorusGeometry(3.2, 0.28, 10, 28),
      new THREE.MeshBasicMaterial({ color: 0xc084fc })
    );
    orbGroup.add(coreSphere, outerHalo);
    orbGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), sector.normal);
    cheeseScene.add(orbGroup);

    // Exposes .mesh and .inSubspaceVault so ufo.js's built-in Tractor Beam & Subspace Vault works identically to Blåhaj Island!
    coreOrbs.push({
      id: `core_${sector.id}`,
      sectorId: sector.id,
      title: `${sector.name} Core`,
      mesh: orbGroup,
      outerHalo,
      pos: orbGroup.position,
      normal: sector.normal.clone(),
      inSubspaceVault: false,
      consumedInPit: false
    });

    if (window.showToast) {
      window.showToast(
        `✅ ${sector.name.toUpperCase()} STRONGHOLD DEFEATED!`,
        'Switch to [1] Tractor Beam and Left-Click (or press [T]) to beam the Volatile Core into your Subspace Vault!'
      );
    }
    updateObjectiveHUD();
  }

  // Called by ufo.js disgorgeFromSubspaceVault() when the pilot presses [T] or Left-Clicks with [1] Tractor Beam while holding a Core!
  function onDisgorgeCoreFromVault(coreRef, ufoPos) {
    if (!coreRef) return false;
    coreRef.inSubspaceVault = false;

    const dropPos = ufoPos ? ufoPos.clone() : CAVE_SURFACE_POS.clone();
    const dCave = dropPos.distanceTo(CAVE_SURFACE_POS);

    if (!caveBreached && dCave <= 26.0) {
      // Disgorged directly over the Anomalous Sealed Cave Entrance Pit!
      coreRef.consumedInPit = true;
      if (coreRef.mesh) coreRef.mesh.visible = false;
      if (!caveRevealed) caveRevealed = true;

      coresInHole = Math.min(CORES_REQUIRED, coresInHole + 1);
      updateCaveCoreSocketsVisual();
      spawnCheeseBurst(CAVE_SURFACE_POS, 0xc084fc, 28, 1.6);

      if (coresInHole >= CORES_REQUIRED) {
        if (!hasShownCriticalMassThought) {
          hasShownCriticalMassThought = true;
          showPausedThought({
            badge: '⚡💣 INNER THOUGHT · CRITICAL MASS REACHED!',
            title: `All ${CORES_REQUIRED} Core Power-Ups Are Packed in the Cave Pit!`,
            body:
              `The Sealed Cave Entrance is vibrating at <strong>Critical Mass (${CORES_REQUIRED}/${CORES_REQUIRED} Cores)</strong>!<br><br>` +
              'Let’s switch to <strong>🔫 Ray Turrets ([2])</strong> and <strong>fire a single laser shot into the glowing cave pit</strong> to detonate the pile and blast open the shaft into the moon’s interior!',
            hint: '💡 Switch to [2] Ray Turrets and shoot the glowing Sealed Cave Entrance pit!'
          });
        }
      } else if (window.showToast) {
        window.showToast(
          `🕳️⚡ CORE DISGORGED INTO CAVE PIT! (${coresInHole}/${CORES_REQUIRED})`,
          `Need ${CORES_REQUIRED - coresInHole} more Core${CORES_REQUIRED - coresInHole === 1 ? '' : 's'} for Critical Mass! Use [3] Aetheric Radar to scan for the next Bunker Stronghold.`
        );
      }
      updateObjectiveHUD();
      return true;
    }

    // Disgorged away from the Cave Pit — place the Core on the canyon floor directly beneath the saucer so the pilot can beam it back up!
    const rel = new THREE.Vector3().subVectors(dropPos, PLANET_CENTER);
    const dist = rel.length() || 1;
    const norm = rel.divideScalar(dist);
    const surfR = getPlanetRadiusAtNormal(norm.x, norm.y, norm.z);
    if (coreRef.mesh) {
      coreRef.mesh.position.copy(PLANET_CENTER).addScaledVector(norm, surfR + 2.4);
      coreRef.mesh.scale.set(1, 1, 1);
      coreRef.mesh.visible = true;
    }
    if (window.showToast) {
      window.showToast(
        '🧀⚡ CORE RELEASED ON TRENCH FLOOR',
        `You are ${Math.round(dCave)}m from the Sealed Cave Pit! Beam the Core back into your Subspace Vault [T] and disgorge it over the Cave Pit!`
      );
    }
    updateObjectiveHUD();
    return false;
  }

  function onAethericRadarScan(ufoPos) {
    if (!isBuilt) build();
    scanCount++;
    timeSinceLastScan = 0;

    const pos = ufoPos || new THREE.Vector3(0, -10, 0);
    let summaryText = '';

    if (caveBreached && !relayDeployed && pos.distanceTo(INTERIOR_FOCAL_POS) < 42.0) {
      deployRelayDishInCrater();
      return '📡 Relay Dish Deployed in Interior Crater!';
    }

    const distToCave = pos.distanceTo(CAVE_SURFACE_POS);
    const revealedSectorsCount = cheeseSectors.filter((s) => s.revealed).length;

    if (!caveRevealed && (distToCave < 78.0 || revealedSectorsCount >= 1)) {
      caveRevealed = true;
      spawnCheeseBurst(CAVE_SURFACE_POS, 0xc084fc, 24, 1.5);
      summaryText = `Anomalous Sealed Cave Entrance detected (${Math.round(distToCave)}m)!`;

      if (!hasShownCaveAnomalyThought) {
        hasShownCaveAnomalyThought = true;
        showPausedThought({
          badge: '💭 INNER THOUGHT · ANOMALOUS CAVE ENTRANCE',
          title: 'Wait… That’s a Sealed Cave Shaft Into the Moon!',
          body:
            'My Aetheric Radar shows a huge hollow crater right underneath this sealed depression! It’s an <strong>entrance into the moon’s interior</strong>, plugged by thick hardened cheese rind.<br><br>' +
            `Standard Ray Turrets won’t crack a seal that thick on their own… <strong>What if we defeat the Bunker Strongholds, beam their volatile Core Power-Ups into our Subspace Vault with the 🟢 Tractor Beam ([1]), fly over this pit and press [T] / Left-Click to disgorge ${CORES_REQUIRED} Cores into the depression until it hits Critical Mass, then shoot it?!</strong>`,
          hint:
            '💡 Schedule: 1) Scan [3] → 2) Defeat the sector’s bugs & all 3 bunkers [2] (use Right-Click Sonic Shockwave to stun/uncloak bugs!) → 3) Beam Core into Subspace Vault with [1] Tractor Beam → 4) Disgorge Core [T / Click] over the Cave Pit!'
        });
      }
    }

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

      for (let bi = 0; bi < nearestUnrevealed.bugCount; bi++) {
        spawnInvaderForSector(nearestUnrevealed, bi);
      }

      summaryText = `Revealed ${nearestUnrevealed.name} (${Math.round(bestD)}m) — ${nearestUnrevealed.bugCount} bugs & 3 bunkers awakened!`;

      if (!hasShownFirstBugThought) {
        hasShownFirstBugThought = true;
        showPausedThought({
          badge: '💭 INNER THOUGHT · THE SCAN AWAKENED A STRONGHOLD!',
          title: 'The Radar Sonar Awakened the Bugs — Battle Stations!',
          body:
            'Our Aetheric Radar frequency irritated the nest in <strong>' +
            nearestUnrevealed.name +
            '</strong>! A squad of 2D Space Invader bugs is swarming out firing pixel-torpedoes and projecting a cover grid over their <strong>3 Swiss-Cheese Bunkers</strong>!<br><br>' +
            '• <strong>Tactic:</strong> Hit <strong>Right-Click (🪩 Disco & Sonic Shockwave)</strong> when bugs get close to shake them off your hull, strip their phase-cloak, and <strong>stun them gold for double laser damage</strong>!<br>' +
            '• Destroy <strong>all bugs and all 3 bunkers</strong> in the stronghold to expose the <strong>Core Power-Up</strong>, then switch to <strong>🟢 Tractor Beam ([1])</strong> and <strong>Left-Click / [T]</strong> to beam it into your <strong>Subspace Vault</strong>!',
          hint:
            '💡 Watch your Shields & Hull! If the bugs destroy your UFO, you’ll be bounced back to your Mojo Hyperspace Crossroads checkpoint!'
        });
      }
    } else if (!summaryText) {
      const uncollectedCore = coreOrbs.find((c) => !c.inSubspaceVault && !c.consumedInPit);
      const aliveBunker = cheeseBunkers.find((b) => b.alive);
      if (uncollectedCore) {
        const d = Math.round(pos.distanceTo(uncollectedCore.pos));
        summaryText = `Exposed Core waiting (${d}m) — Beam into Subspace Vault with [1] Tractor Beam!`;
      } else if (aliveBunker) {
        const d = Math.round(pos.distanceTo(aliveBunker.pos));
        summaryText = `Active Stronghold Bunker (${d}m) — Destroy all bugs & bunkers with [2] Ray Turrets!`;
      } else {
        const d = Math.round(pos.distanceTo(CAVE_SURFACE_POS));
        summaryText = `Sealed Cave Entrance (${d}m) — Disgorge ${CORES_REQUIRED - coresInHole} more Core(s) over the pit!`;
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

  // Core Power-Up ONLY spawns once ALL 3 bunkers AND ALL bugs in that sector are defeated!
  function checkSectorCompletion(sectorId) {
    const sec = cheeseSectors.find((s) => s.id === sectorId);
    if (!sec || !sec.revealed || sec.cleared) return;

    const allBunkersDown = sec.bunkers.every((b) => !b.alive);
    const bugsAliveInSector = invaders.some((inv) => inv.alive && inv.sectorId === sectorId);

    if (allBunkersDown && !bugsAliveInSector) {
      sec.cleared = true;
      spawnSectorCoreOrb(sec);
    }
    updateObjectiveHUD();
  }

  function damageBunker(bunker, rawDmg = 1, fromNetwork = false) {
    if (!bunker || !bunker.alive) return;
    const sec = cheeseSectors.find((s) => s.id === bunker.sectorId);
    if (sec && !sec.revealed) return;

    // Tactical rule: While bugs in this sector are still alive and unstunned, their glitch-grid shields the bunker!
    const activeUnstunnedBugs = invaders.some(
      (inv) => inv.alive && inv.sectorId === bunker.sectorId && inv.stunTimer <= 0
    );
    const effectiveDmg = fromNetwork ? rawDmg : (activeUnstunnedBugs ? Math.max(0.5, rawDmg * 0.45) : rawDmg * 1.35);

    bunker.hp -= effectiveDmg;
    spawnCheeseBurst(bunker.pos, activeUnstunnedBugs ? 0x38bdf8 : 0xfacc15, 7, 0.95);

    if (bunker.hp <= 0) {
      bunker.alive = false;
      bunkersDestroyedCount++;
      if (bunker.group) bunker.group.visible = false;
      spawnCheeseBurst(bunker.pos, 0xeab308, 26, 1.6);
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
      const s = 0.62 + (Math.max(0, bunker.hp) / bunker.maxHp) * 0.38;
      bunker.group.scale.set(s, s, s);
      if (bunker.mesh.material && bunker.mesh.material.emissive) {
        bunker.mesh.material.emissive.setHex(activeUnstunnedBugs ? 0x38bdf8 : 0xfef08a);
        setTimeout(() => {
          if (bunker.mesh && bunker.mesh.material && bunker.mesh.material.emissive) {
            bunker.mesh.material.emissive.setHex(0x000000);
          }
        }, 90);
      }
    }
  }

  function damageInvader(inv, rawDmg = 1, fromNetwork = false) {
    if (!inv || !inv.alive) return;

    // Phase-cloaked bugs resist 50% laser damage unless stunned by Sonic Shockwave (which makes them take 2x damage!)
    const dmg = fromNetwork
      ? 99
      : inv.stunTimer > 0
      ? rawDmg * 2.0
      : inv.cloaked
      ? rawDmg * 0.5
      : rawDmg;

    inv.hp -= dmg;
    spawnCheeseBurst(inv.pos, inv.stunTimer > 0 ? 0xfacc15 : 0x7dd3fc, 6, 0.75);

    if (inv.hp <= 0) {
      inv.alive = false;
      inv.latched = false;
      if (inv.sprite && inv.sprite.parent) inv.sprite.parent.remove(inv.sprite);
      invadersClearedCount++;
      spawnCheeseBurst(inv.pos, 0x38bdf8, 16, 1.1);
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

  function detonateCaveCrustSeal(fromNetwork = false) {
    if (caveBreached) return;
    caveBreached = true;
    if (caveRindPlugMesh) caveRindPlugMesh.visible = false;
    caveCoreSocketMeshes.forEach((s) => {
      s.visible = false;
    });

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

    if (!caveBreached && coresInHole >= CORES_REQUIRED) {
      if (boltPos.distanceTo(CAVE_SURFACE_POS) <= 16.5) {
        detonateCaveCrustSeal(false);
        return true;
      }
    }

    // 1. Check 1980s Space Invader bugs (multi-hit tactical combat!)
    for (let i = 0; i < invaders.length; i++) {
      const inv = invaders[i];
      if (!inv.alive) continue;
      if (inv.pos.distanceTo(boltPos) <= 5.0) {
        damageInvader(inv, 1.0, false);
        return true;
      }
    }

    // 2. Check revealed destructible Swiss-cheese bunkers
    for (let i = 0; i < cheeseBunkers.length; i++) {
      const b = cheeseBunkers[i];
      if (!b.alive) continue;
      const sec = cheeseSectors.find((s) => s.id === b.sectorId);
      if (sec && !sec.revealed) continue;
      if (b.pos.distanceTo(boltPos) <= b.radius) {
        damageBunker(b, 1.0, false);
        return true;
      }
    }

    if (caveRevealed && !caveBreached && boltPos.distanceTo(CAVE_SURFACE_POS) <= 13.5) {
      spawnCheeseBurst(boltPos, 0xc084fc, 8, 0.9);
      return true;
    }

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

  // Tactical Sonic Shockwave ([5] / Right-Click): Shakes off latched bugs, strips phase-cloak & STUNS bugs gold for 6.5s so Ray Turrets deal 2x damage!
  function triggerSonicShockwave(originPos) {
    if (!isBuilt || !originPos) return;

    if (!caveBreached && coresInHole >= CORES_REQUIRED && originPos.distanceTo(CAVE_SURFACE_POS) <= 36.0) {
      detonateCaveCrustSeal(false);
    }

    let stunnedCount = 0;
    for (let i = invaders.length - 1; i >= 0; i--) {
      const inv = invaders[i];
      if (!inv.alive) continue;
      if (inv.latched || inv.pos.distanceTo(originPos) <= 52.0) {
        if (inv.latched) {
          inv.latched = false;
          const pushDir = new THREE.Vector3().subVectors(inv.pos, originPos).normalize();
          inv.vel.copy(pushDir.multiplyScalar(32.0));
        }
        inv.stunTimer = 6.5;
        inv.cloaked = false;
        if (inv.mat && stunnedInvaderTexture) {
          inv.mat.map = stunnedInvaderTexture;
          inv.mat.opacity = 1.0;
        }
        damageInvader(inv, 1.5, false);
        stunnedCount++;
      }
    }

    // Clear incoming enemy pixel-torpedoes within shockwave radius!
    for (let i = invaderBolts.length - 1; i >= 0; i--) {
      const ib = invaderBolts[i];
      if (ib.mesh.position.distanceTo(originPos) <= 45.0) {
        if (ib.mesh.parent) ib.mesh.parent.remove(ib.mesh);
        invaderBolts.splice(i, 1);
      }
    }

    if (stunnedCount > 0 && window.showToast) {
      window.showToast(
        '🪩⚡ SONIC DISRUPTION!',
        `Uncloaked & stunned ${stunnedCount} Space Invader${stunnedCount === 1 ? '' : 's'} for 6.5s! Blast them with [2] Ray Turrets for 2x damage!`
      );
    }
  }

  function updateObjectiveHUD() {
    let banner = document.getElementById('cheese-moon-objective-banner');
    const ufoState =
      window.BlahajUFO && typeof window.BlahajUFO.getState === 'function'
        ? window.BlahajUFO.getState()
        : null;

    if (!ufoState || !ufoState.inCheeseMoon) {
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
        'max-width:660px'
      ].join(';');
      document.body.appendChild(banner);
    }

    const revealedCount = cheeseSectors.filter((s) => s.revealed).length;
    const aliveBugs = invaders.filter((x) => x.alive).length;
    const revealedAliveBunkers = cheeseBunkers.filter((b) => {
      if (!b.alive) return false;
      const sec = cheeseSectors.find((s) => s.id === b.sectorId);
      return !!(sec && sec.revealed);
    }).length;
    const uncollectedCores = coreOrbs.filter((c) => !c.inSubspaceVault && !c.consumedInPit).length;
    const holdingCoreInVault = !!(ufoState.subspaceVault && ufoState.subspaceVault.kind === 'cheese_core');

    let stepTitle = '';
    let stepSub = '';

    if (relayDeployed) {
      stepTitle = '🌀 PART 1 COMPLETE: HERMES’ DIRECT PORTAL OPEN IN THE INTERIOR CRATER!';
      stepSub = 'Fly into the Violet Between Portal (or press [E] inside the crater) to return home to Blåhaj Island!';
    } else if (caveBreached) {
      stepTitle = '🕳️ CAVE BREACHED — FLY DOWN INTO THE INTERIOR CRATER & DEPLOY RELAY DISH [E]';
      stepSub = `Cores Detonated: ${CORES_REQUIRED}/${CORES_REQUIRED} · Descend through the cave hole to the glowing Focal Ring & press [E]!`;
    } else if (coresInHole >= CORES_REQUIRED) {
      stepTitle = `⚡💣 CRITICAL MASS (${CORES_REQUIRED}/${CORES_REQUIRED} CORES IN CAVE PIT) — FIRE [2] RAY TURRETS AT THE PIT TO DETONATE!`;
      stepSub = 'Switch to [2] Ray Turrets and shoot the glowing Sealed Cave Entrance pit!';
    } else if (holdingCoreInVault) {
      stepTitle = '🟢 CORE IN SUBSPACE VAULT — FLY OVER THE SEALED CAVE PIT & PRESS [T] / LEFT-CLICK TO DISGORGE!';
      stepSub = `Cave Pit Progress: ${coresInHole}/${CORES_REQUIRED} Cores · Select [1] Tractor Beam and Left-Click (or press [T]) directly over the Cave Pit!`;
    } else if (uncollectedCores > 0) {
      stepTitle = '🟢 STRONGHOLD CLEARED — USE [1] TRACTOR BEAM (LEFT-CLICK / [T]) TO BEAM CORE INTO SUBSPACE VAULT!';
      stepSub = `Turn on [1] Tractor Beam and hover over the glowing Core to beam it into your Subspace Vault (${coresInHole}/${CORES_REQUIRED} in Cave Pit)`;
    } else if (aliveBugs > 0 || revealedAliveBunkers > 0) {
      stepTitle = `🔫 STRONGHOLD BATTLE — BUGS: ${aliveBugs} · BUNKERS: ${revealedAliveBunkers}`;
      stepSub = 'Right-Click Sonic Shockwave stuns/uncloaks bugs for 2x damage · Destroy ALL bugs & bunkers in sector to unlock Core!';
    } else {
      stepTitle = '📡 SCAN THE ECLIPSED MOON: SELECT [3] AETHERIC RADAR & LEFT-CLICK!';
      stepSub = `Strongholds Scanned: ${revealedCount}/${cheeseSectors.length} (24 Bunkers total) · Cores in Cave Pit: ${coresInHole}/${CORES_REQUIRED}`;
    }

    banner.innerHTML = `<div>${stepTitle}</div><div style="font-size:11.5px;font-weight:600;color:#bae6fd;margin-top:2px;">${stepSub}</div>`;
    banner.style.display = 'block';
  }

  function handleNetworkPacket(data) {
    if (!data || data.type !== 'cheese_event') return;
    if (data.action === 'invader_killed' && data.invId) {
      const inv = invaders.find((x) => x.id === data.invId && x.alive);
      if (inv) damageInvader(inv, 99, true);
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

    for (let i = 0; i < cheeseSectors.length; i++) {
      const sec = cheeseSectors[i];
      if (!sec.revealed || sec.cleared) continue;
      targets.push({
        pos: sec.centerPos,
        label: sec.name.toUpperCase(),
        color: '#38bdf8'
      });
    }

    for (let i = 0; i < coreOrbs.length; i++) {
      const c = coreOrbs[i];
      if (!c || c.inSubspaceVault || c.consumedInPit) continue;
      targets.push({
        pos: c.pos,
        label: 'BEAM CORE [T]',
        color: '#facc15'
      });
    }

    if (caveRevealed) {
      if (!caveBreached) {
        targets.push({
          pos: CAVE_SURFACE_POS,
          label:
            coresInHole >= CORES_REQUIRED
              ? 'SHOOT CAVE PIT!'
              : `CAVE PIT (${coresInHole}/${CORES_REQUIRED})`,
          color: coresInHole >= CORES_REQUIRED ? '#f43f5e' : '#c084fc'
        });
      } else if (!relayDeployed) {
        targets.push({
          pos: INTERIOR_FOCAL_POS,
          label: 'CRATER FOCAL RING [E]',
          color: '#38bdf8'
        });
      } else if (hermesPortalGroup) {
        const portalWorldPos = new THREE.Vector3().copy(INTERIOR_CRATER_CENTER).add(hermesPortalGroup.position);
        targets.push({
          pos: portalWorldPos,
          label: 'HERMES PORTAL HOME [E]',
          color: '#c084fc'
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

    if (eclipseGroup) eclipseGroup.lookAt(0, -40, 0);
    if (reentryRingMesh) reentryRingMesh.rotation.z = elapsed * 0.9;
    if (craterFocalRingMesh) craterFocalRingMesh.rotation.z = -elapsed * 1.4;
    if (relayDishSpinner && relayDeployed) relayDishSpinner.rotation.y = elapsed * 1.8;
    if (hermesPortalRing && relayDeployed) hermesPortalRing.rotation.z = elapsed * 2.2;

    if (caveRindPlugMesh && !caveBreached && caveRindPlugMesh.material) {
      const heat = coresInHole / CORES_REQUIRED;
      const pulse = 0.5 + 0.5 * Math.sin(elapsed * (3.0 + heat * 12.0));
      caveRindPlugMesh.material.emissiveIntensity = 0.4 + heat * 1.2 * pulse;
      if (coresInHole >= CORES_REQUIRED) {
        caveRindPlugMesh.material.emissive.setHex(pulse > 0.5 ? 0xf43f5e : 0xfacc15);
      }
    }

    for (let i = 0; i < coreOrbs.length; i++) {
      const c = coreOrbs[i];
      if (c.inSubspaceVault || c.consumedInPit || !c.mesh) continue;
      if (c.outerHalo) {
        c.outerHalo.rotation.x = elapsed * 2.6;
        c.outerHalo.rotation.y = elapsed * 1.9;
      }
    }

    const aliveBugsCount = invaders.filter((x) => x.alive).length;
    const uncollectedCoresCount = coreOrbs.filter((c) => !c.inSubspaceVault && !c.consumedInPit).length;
    const unrevealedSectorsCount = cheeseSectors.filter((s) => !s.revealed).length;
    const holdingCoreInVault = !!(ufoState.subspaceVault && ufoState.subspaceVault.kind === 'cheese_core');
    if (
      aliveBugsCount === 0 &&
      uncollectedCoresCount === 0 &&
      !holdingCoreInVault &&
      (unrevealedSectorsCount > 0 || !caveRevealed)
    ) {
      timeSinceLastScan += dt;
      if (timeSinceLastScan > 18.0 && performance.now() - lastScanReminderAt > 18000) {
        lastScanReminderAt = performance.now();
        if (window.showToast) {
          window.showToast(
            '📡 REMINDER: USE YOUR AETHERIC RADAR DISH!',
            'Press [3] and Left-Click to scan for the next hidden Bunker Stronghold!'
          );
        }
      }
    }

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

    // Update enemy Space Invader Pixel-Plasma Torpedoes!
    for (let i = invaderBolts.length - 1; i >= 0; i--) {
      const ib = invaderBolts[i];
      ib.life -= dt;
      ib.mesh.position.addScaledVector(ib.vel, dt);
      let hit = ib.life <= 0;
      if (!hit && ufoState.pos && ib.mesh.position.distanceTo(ufoState.pos) <= 5.2) {
        hit = true;
        spawnCheeseBurst(ib.mesh.position, 0xf43f5e, 10, 0.9);
        if (
          ufoState.localRole === 'pilot' &&
          window.BlahajUFO &&
          typeof window.BlahajUFO.applyImpactDamage === 'function'
        ) {
          window.BlahajUFO.applyImpactDamage(11.0, 'Space Invader Pixel-Torpedo', false);
        }
      }
      if (hit) {
        if (ib.mesh.parent) ib.mesh.parent.remove(ib.mesh);
        invaderBolts.splice(i, 1);
      }
    }

    // Update Tactical Space Invader Bugs (Formation Strafing, Phase-Cloak, Torpedoes & Hull Latching!)
    let latchedCount = 0;
    for (let i = invaders.length - 1; i >= 0; i--) {
      const inv = invaders[i];
      if (!inv.alive) {
        invaders.splice(i, 1);
        continue;
      }

      if (inv.stunTimer > 0) {
        inv.stunTimer = Math.max(0, inv.stunTimer - dt);
        if (inv.stunTimer <= 0 && inv.mat && inv.baseTex) {
          inv.mat.map = inv.baseTex;
        }
      } else {
        // Periodic Glitch Phase-Cloak (disrupted by Sonic Shockwave!)
        inv.cloakPhase += dt * 1.8;
        inv.cloaked = Math.sin(inv.cloakPhase) > 0.45;
        if (inv.mat) {
          inv.mat.opacity = inv.cloaked ? 0.34 : 0.96;
        }
      }

      const stepBob = Math.sin(elapsed * 6.5 + inv.phase) > 0 ? 0.6 : -0.6;
      inv.sprite.scale.set(7.4 + stepBob, 5.6 - stepBob * 0.4, 1);

      if (inv.latched && ufoState && ufoState.pos) {
        latchedCount++;
        inv.pos.copy(ufoState.pos).add(inv.latchOffset);
        if (
          ufoState.turboActive &&
          Math.abs(ufoState.spaceAngVelRoll || 0) > 1.8 &&
          Math.random() < dt * 1.5
        ) {
          inv.latched = false;
          inv.vel.set((Math.random() - 0.5) * 28, 12, (Math.random() - 0.5) * 28);
        }
      } else if (ufoState && ufoState.pos) {
        if (inv.stunTimer > 0) {
          // Stunned bugs wobble helplessly in place for easy Ray Turret follow-up!
          inv.vel.multiplyScalar(Math.max(0, 1.0 - dt * 4.0));
          inv.pos.addScaledVector(inv.vel, dt);
        } else {
          const toUfo = new THREE.Vector3().subVectors(ufoState.pos, inv.pos);
          const distToUfo = toUfo.length();

          // Fire pixel-torpedoes when within 95m!
          if (distToUfo < 95.0 && distToUfo > 12.0) {
            inv.fireCooldown -= dt;
            if (inv.fireCooldown <= 0) {
              inv.fireCooldown = 2.1 + Math.random() * 1.8;
              spawnInvaderBolt(inv.pos, ufoState.pos);
            }
          }

          if (distToUfo < 110.0) {
            if (distToUfo < 6.4) {
              inv.latched = true;
              latchedCount++;
              if (window.showToast) {
                window.showToast(
                  '👾 SPACE INVADER LATCHED ONTO THE HULL!',
                  'Press Right-Click (Sonic Shockwave) or Barrel-Roll with [Shift] to blast them off!'
                );
              }
            } else {
              // 1980s Stepped Arcade Strafe-Weave while closing in!
              toUfo.normalize();
              const sideWeave = new THREE.Vector3(-toUfo.z, 0, toUfo.x)
                .normalize()
                .multiplyScalar(Math.sin(elapsed * 4.2 + inv.phase) * 18.0);
              const desiredVel = toUfo.multiplyScalar(25.0).add(sideWeave);
              inv.vel.lerp(desiredVel, Math.min(1.0, dt * 3.0));
              inv.pos.addScaledVector(inv.vel, dt);
            }
          }
        }
      }
    }

    if (ufoState && ufoState.pos) {
      // Latched Invader Drag & Sustained Hull Grapple Damage
      if (latchedCount > 0 && ufoState.vel) {
        ufoState.vel.multiplyScalar(Math.max(0.42, 1.0 - latchedCount * 0.14 * dt * 5.0));
        if (
          ufoState.localRole === 'pilot' &&
          window.BlahajUFO &&
          typeof window.BlahajUFO.applyImpactDamage === 'function'
        ) {
          window.BlahajUFO.applyImpactDamage(6.5 * latchedCount, 'Space Invader Hull Grapple', false);
        }
      }

      // Planetoid Surface & Subterranean Interior Crater Collision
      const distToCraterCenter = ufoState.pos.distanceTo(INTERIOR_CRATER_CENTER);
      const horizDistToShaft = Math.hypot(
        ufoState.pos.x - CAVE_SURFACE_POS.x,
        ufoState.pos.z - CAVE_SURFACE_POS.z
      );
      const inBreachShaftOrCrater =
        caveBreached && (horizDistToShaft < 19.5 || distToCraterCenter < INTERIOR_CRATER_RADIUS + 4.0);

      if (inBreachShaftOrCrater && ufoState.pos.y < CAVE_SURFACE_POS.y + 4.0) {
        if (ufoState.pos.y < INTERIOR_CRATER_CENTER.y + 8.0) {
          const fromCrater = new THREE.Vector3().subVectors(ufoState.pos, INTERIOR_CRATER_CENTER);
          const dC = fromCrater.length();
          const maxCraterR = INTERIOR_CRATER_RADIUS - 5.2;
          if (dC > maxCraterR && dC > 0.01) {
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
          const floorY = INTERIOR_FOCAL_POS.y + 2.2;
          if (ufoState.pos.y < floorY) {
            ufoState.pos.y = floorY;
            if (ufoState.vel && ufoState.vel.y < 0) ufoState.vel.y = 0;
          }
        }
      } else {
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

      // Collide with Revealed Intact Swiss-Cheese Bunkers (ramming bunkers damages your shields/hull instead of free-killing them!)
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
          if (ufoState.vel) ufoState.vel.addScaledVector(nB, 16.0);
          if (
            ufoState.localRole === 'pilot' &&
            window.BlahajUFO &&
            typeof window.BlahajUFO.applyImpactDamage === 'function'
          ) {
            window.BlahajUFO.applyImpactDamage(9.0, 'Swiss Cheese Bunker Impact', false);
          }
        }
      }

      if (caveBreached && ufoState.localRole === 'pilot') {
        const dFocal = ufoState.pos.distanceTo(INTERIOR_FOCAL_POS);
        if (!relayDeployed && dFocal < 18.0) {
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

      if (ufoState.localRole === 'pilot' && ufoState.pos.distanceTo(REENTRY_POS) < REENTRY_RADIUS) {
        if (window.BlahajGame && typeof window.BlahajGame.exitCheeseMoon === 'function') {
          window.BlahajGame.exitCheeseMoon(true);
        }
      }
    }
  }

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
    getExposedCores: () => coreOrbs,
    onDisgorgeCoreFromVault,
    resetEncounterOnDefeat,
    getScene: () => (isBuilt ? cheeseScene : build()),
    getPlanetCenter: () => PLANET_CENTER,
    getSurfaceRadiusAtNormal: getPlanetRadiusAtNormal,
    checkPlasmaBoltCollision,
    triggerSonicShockwave,
    handleNetworkPacket,
    getStats: () => ({
      invadersClearedCount,
      bunkersDestroyedCount,
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
      for (let i = 0; i < cheeseBunkers.length; i++) {
        const b = cheeseBunkers[i];
        if (!b || !b.alive) continue;
        const sec = cheeseSectors.find((s) => s.id === b.sectorId);
        if (sec && !sec.revealed) continue;
        blips.push({ x: b.pos.x, y: b.pos.y, z: b.pos.z, kind: 'monolith', tier: 2 });
      }
      for (let i = 0; i < coreOrbs.length; i++) {
        const c = coreOrbs[i];
        if (!c || c.inSubspaceVault || c.consumedInPit) continue;
        blips.push({ x: c.pos.x, y: c.pos.y, z: c.pos.z, kind: 'gate', tier: 0 });
      }
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
        : `CORES: ${coresInHole}/${CORES_REQUIRED}`;

      return {
        label,
        cleared: relayDeployed,
        blips
      };
    }
  };
})();
