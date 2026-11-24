// ============================================================================
// BLÅHAJ ISLAND — DEEP SPACE ORBITAL SECTOR & ASTEROID FIELD (js/space.js)
// ============================================================================
// Ultra-low-latency instanced space map reached by flying the S.S. Shonk-Saucer
// to the Karman Orbital Ceiling (Y >= 185m) and holding Mojo Hyperdrive + Boost
// for 6 seconds (with your co-op partner seated aboard if present!).
//
// Features:
//  1. 100% Local Deterministic Physics + Shared Clock (zero continuous net bloat).
//  2. Distant Static/Slow-Cadence Golden Sun & Silver Crescent Moon.
//  3. Distant "Flat-Top Planetary Wedge" of Blåhaj Island orbiting in space:
//     - Tapered rocky crust/mantle chunk with geological strata & magma roots.
//     - Flat ocean & island top with miniature Volcano, Great Portal & Pier.
//     - Translucent glowing hemispherical Atmosphere Dome & drifting clouds.
//     - Cosmic edge waterfalls spilling off the flat world rim into stardust!
//     - Giant brass IKEA Allen-Key anchor & factory barcode tag on the underside!
//  4. 6 Massive Landmark Monolith Asteroids + 24 Orbiting, Spinning, Colliding,
//     Bouncing & Fragmenting Space Rocks that shatter under UFO Ray Turret fire!
//  5. Atmospheric Re-Entry Beacon Ring (or press [L]) to warp back to the island.
// ============================================================================

window.BlahajSpace = (function () {
  let spaceScene = null;
  let isBuilt = false;

  let sunGroup = null;
  let moonGroup = null;
  let islandWedgeGroup = null;
  let waterfallParticles = null;
  let teacupSatellite = null;
  let reentryGateGroup = null;
  let reentryRingMesh = null;

  const monolithRocks = [];
  const breakableRocks = [];
  const spaceBursts = [];
  let nextFragmentId = 500;
  let rocksShatteredCount = 0;
  let sectorWave = 1;
  let waveCleared = false;
  const ASTEROID_RESPAWN_SECONDS = 3600.0; // 1-hour sector reset timer for escalating waves

  const REENTRY_POS = new THREE.Vector3(0, -18, 145);
  const REENTRY_RADIUS = 19.0;

  // Deterministic pseudo-random helper for shared-clock asteroid layout
  function seededRand(seed) {
    const s = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
    return s - Math.floor(s);
  }

  function makeBarcodeTagTexture() {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 256;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, 512, 256);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 8;
    ctx.strokeRect(8, 8, 496, 240);

    // Blue & Yellow IKEA header stripe
    ctx.fillStyle = '#0058a3';
    ctx.fillRect(16, 16, 480, 54);
    ctx.fillStyle = '#ffda1a';
    ctx.font = '900 32px sans-serif';
    ctx.fillText('BLÅHAJ ISLAND · ART. 303.735.88', 28, 54);

    ctx.fillStyle = '#0f172a';
    ctx.font = '700 22px sans-serif';
    ctx.fillText('TERRESTRIAL WEDGE (FLAT TOP) · QTY: 1 PC', 28, 102);
    ctx.fillStyle = '#dc2626';
    ctx.font = '800 21px sans-serif';
    ctx.fillText('▲ FRAGILE: KEEP FLAT OCEAN SIDE UP ▲', 28, 134);

    // Barcode bars
    ctx.fillStyle = '#0f172a';
    for (let x = 32; x < 480; x += 9) {
      const w = ((x * 7) % 3) + 2;
      ctx.fillRect(x, 152, w, 64);
    }
    ctx.font = '700 18px monospace';
    ctx.fillText('3 037358 800421   MADE BEYOND ERF', 88, 236);

    const tex = new THREE.CanvasTexture(c);
    return tex;
  }

  function createCraggyRockGeometry(radius, detail = 1, seed = 1) {
    const geo = new THREE.IcosahedronGeometry(radius, detail);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vy = pos.getY(i);
      const vz = pos.getZ(i);
      const n = 0.78 + 0.38 * seededRand(seed * 101 + Math.round(vx * 3) * 17 + Math.round(vy * 3) * 31 + Math.round(vz * 3) * 47);
      pos.setXYZ(i, vx * n, vy * (n * 0.92), vz * n);
    }
    geo.computeVertexNormals();
    return geo;
  }

  let sharedAsteroidTex = null;
  function getSharedAsteroidTexture() {
    if (sharedAsteroidTex) return sharedAsteroidTex;
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#64748b';
    ctx.fillRect(0, 0, 256, 256);

    // Basalt grain, mineral flecks & micro-craters (generated once locally -> 0 network latency!)
    for (let i = 0; i < 650; i++) {
      const x = seededRand(i * 7 + 1) * 256;
      const y = seededRand(i * 7 + 2) * 256;
      const r = 1 + seededRand(i * 7 + 3) * 3.5;
      ctx.fillStyle = i % 3 === 0 ? 'rgba(15, 23, 42, 0.32)' : (i % 3 === 1 ? 'rgba(203, 213, 225, 0.24)' : 'rgba(56, 189, 248, 0.14)');
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < 18; i++) {
      const cx = seededRand(i * 19 + 5) * 220 + 18;
      const cy = seededRand(i * 19 + 6) * 220 + 18;
      const cr = 8 + seededRand(i * 19 + 7) * 18;
      const g = ctx.createRadialGradient(cx - cr * 0.25, cy - cr * 0.25, 1, cx, cy, cr);
      g.addColorStop(0, 'rgba(15, 23, 42, 0.55)');
      g.addColorStop(0.75, 'rgba(51, 65, 85, 0.35)');
      g.addColorStop(1, 'rgba(148, 163, 184, 0.0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, cr, 0, Math.PI * 2);
      ctx.fill();
    }
    sharedAsteroidTex = new THREE.CanvasTexture(c);
    sharedAsteroidTex.wrapS = THREE.RepeatWrapping;
    sharedAsteroidTex.wrapT = THREE.RepeatWrapping;
    return sharedAsteroidTex;
  }

  function buildBlahajIslandWedge() {
    const g = new THREE.Group();
    // Place the planetary wedge in the distance (-Z / -X quadrant)
    g.position.set(-165, -38, -390);
    g.rotation.z = 0.11;
    g.rotation.x = 0.14;

    // 1. Tapered Jagged Planetary Crust & Mantle Wedge Underneath (Y: 0 down to -115)
    const crustGeo = new THREE.CylinderGeometry(94, 16, 118, 28, 6, false);
    const cPos = crustGeo.attributes.position;
    const cCols = [];
    const colTmp = new THREE.Color();
    for (let i = 0; i < cPos.count; i++) {
      let x = cPos.getX(i);
      let y = cPos.getY(i); // +59 at top, -59 at bottom
      let z = cPos.getZ(i);
      const vNorm = (y + 59) / 118; // 1 at flat top, 0 at deep mantle tip
      if (vNorm < 0.96) {
        const crag = 0.82 + 0.34 * seededRand(i * 19 + 7);
        x *= crag;
        z *= crag;
      }
      cPos.setXYZ(i, x, y - 59, z); // Shift so top face sits cleanly at Y = 0!

      // Stratified earth/basalt colors with glowing magma root at the bottom tip
      if (vNorm > 0.88) {
        colTmp.setHex(0x574838); // Upper soil & cliff rock
      } else if (vNorm > 0.35) {
        const stripe = Math.sin(vNorm * 28.0) > 0 ? 0x332b3d : 0x241e2c;
        colTmp.setHex(stripe);
      } else {
        colTmp.setHex(vNorm < 0.14 ? 0xff5a14 : 0x4a211b); // Glowing mantle tip!
      }
      cCols.push(colTmp.r, colTmp.g, colTmp.b);
    }
    crustGeo.setAttribute('color', new THREE.Float32BufferAttribute(cCols, 3));
    crustGeo.computeVertexNormals();
    const crustMesh = new THREE.Mesh(
      crustGeo,
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0.08 })
    );
    g.add(crustMesh);

    // 2. Flat Top Ocean Disc ("The Ocean That Doth Not Wet")
    const oceanMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(93.5, 93.5, 1.8, 40),
      new THREE.MeshStandardMaterial({
        color: 0x0ea5e9,
        emissive: 0x0369a1,
        emissiveIntensity: 0.35,
        roughness: 0.25,
        metalness: 0.15
      })
    );
    oceanMesh.position.y = 0.8;
    g.add(oceanMesh);

    // White foaming waterfall lip around the flat world edge
    const foamRim = new THREE.Mesh(
      new THREE.TorusGeometry(93.2, 1.35, 10, 48),
      new THREE.MeshBasicMaterial({ color: 0xe0f2fe, transparent: true, opacity: 0.82 })
    );
    foamRim.rotation.x = Math.PI / 2;
    foamRim.position.y = 1.65;
    g.add(foamRim);

    // 3. Miniature Blåhaj Island Terrain on the Flat Top!
    const sandMat = new THREE.MeshStandardMaterial({ color: 0xf1dfba, roughness: 0.8 });
    const grassMat = new THREE.MeshStandardMaterial({ color: 0x34d399, roughness: 0.75 });
    const basaltMat = new THREE.MeshStandardMaterial({ color: 0x2a2232, roughness: 0.9 });

    // Main Heart Island Beach & Meadow
    const mainBeach = new THREE.Mesh(new THREE.CylinderGeometry(32, 35, 2.2, 24), sandMat);
    mainBeach.position.set(0, 2.2, 6);
    const mainMeadow = new THREE.Mesh(new THREE.CylinderGeometry(25, 28, 3.0, 24), grassMat);
    mainMeadow.position.set(0, 3.2, 6);
    g.add(mainBeach, mainMeadow);

    // 4 Outer Sanctuary Atolls on the flat ocean disc
    [
      { x: 56, z: -4, r: 12 },
      { x: -54, z: 32, r: 13 },
      { x: -54, z: -28, r: 12 },
      { x: 52, z: -38, r: 12 }
    ].forEach((isl) => {
      const atollSand = new THREE.Mesh(new THREE.CylinderGeometry(isl.r, isl.r + 2, 1.8, 16), sandMat);
      atollSand.position.set(isl.x, 2.0, isl.z);
      const atollGrass = new THREE.Mesh(new THREE.CylinderGeometry(isl.r * 0.72, isl.r * 0.82, 2.4, 16), grassMat);
      atollGrass.position.set(isl.x, 2.6, isl.z);
      g.add(atollSand, atollGrass);
    });

    // Miniature Towering Northern Volcano & Glowing Magma Crater!
    const miniVolc = new THREE.Mesh(new THREE.CylinderGeometry(11, 28, 36, 20), basaltMat);
    miniVolc.position.set(-10, 19.0, -48);
    const miniLava = new THREE.Mesh(
      new THREE.CircleGeometry(9.5, 18),
      new THREE.MeshBasicMaterial({ color: 0xff5a14 })
    );
    miniLava.rotation.x = -Math.PI / 2;
    miniLava.position.set(-10, 37.2, -48);
    g.add(miniVolc, miniLava);

    // Miniature Great Cross-Ocean Portal Arch & Endless Pier jutting over the edge!
    const miniPortal = new THREE.Mesh(
      new THREE.TorusGeometry(4.2, 0.55, 8, 20),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    miniPortal.position.set(0, 7.5, -10);
    g.add(miniPortal);

    const miniPier = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 1.2, 34),
      new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.85 })
    );
    miniPier.position.set(22, 2.5, 84);
    g.add(miniPier);

    // 4. Translucent Glowing Hemispherical Atmosphere Dome cupping the flat world!
    const atmoDome = new THREE.Mesh(
      new THREE.SphereGeometry(95.5, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.5),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.14,
        side: THREE.DoubleSide,
        depthWrite: false
      })
    );
    atmoDome.position.y = 1.2;
    g.add(atmoDome);

    // Ring of tiny fluffy white clouds floating inside the atmosphere dome
    const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.78 });
    for (let c = 0; c < 12; c++) {
      const ca = (c / 12) * Math.PI * 2;
      const cr = 42 + (c % 3) * 16;
      const cloud = new THREE.Mesh(new THREE.SphereGeometry(5.5, 8, 6), cloudMat);
      cloud.scale.set(1.8, 0.45, 1.1);
      cloud.position.set(Math.cos(ca) * cr, 28 + (c % 4) * 7, Math.sin(ca) * cr);
      g.add(cloud);
    }

    // 5. Absurd Quirks:
    // 5A. Cosmic Edge Waterfalls pouring off the flat rim into space!
    const wfGeo = new THREE.BufferGeometry();
    const wfCount = 260;
    const wfPos = new Float32Array(wfCount * 3);
    const wfAngles = [0.25, 1.15, 2.35, 3.85, 5.1];
    for (let i = 0; i < wfCount; i++) {
      const baseA = wfAngles[i % wfAngles.length] + (seededRand(i * 13) - 0.5) * 0.18;
      const drop = seededRand(i * 29) * 85.0;
      const rad = 93.5 + drop * 0.08;
      wfPos[i * 3] = Math.cos(baseA) * rad;
      wfPos[i * 3 + 1] = 1.0 - drop;
      wfPos[i * 3 + 2] = Math.sin(baseA) * rad;
    }
    wfGeo.setAttribute('position', new THREE.BufferAttribute(wfPos, 3));
    waterfallParticles = new THREE.Points(
      wfGeo,
      new THREE.PointsMaterial({ color: 0x7dd3fc, size: 3.2, transparent: true, opacity: 0.82 })
    );
    g.add(waterfallParticles);

    // 5B. Giant Brass IKEA Allen-Key Continental Bolt & Barcode Price Tag hanging off the underside!
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.85, roughness: 0.22 });
    const allenShaft = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 28, 6), brassMat);
    allenShaft.rotation.z = Math.PI * 0.35;
    allenShaft.position.set(52, -52, 24);
    const allenArm = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 14, 6), brassMat);
    allenArm.rotation.z = -Math.PI * 0.15;
    allenArm.position.set(63, -44, 24);
    g.add(allenShaft, allenArm);

    const tagMat = new THREE.MeshBasicMaterial({ map: makeBarcodeTagTexture(), side: THREE.DoubleSide });
    const tagMesh = new THREE.Mesh(new THREE.PlaneGeometry(42, 21), tagMat);
    tagMesh.position.set(34, -84, 48);
    tagMesh.rotation.y = 0.35;
    tagMesh.rotation.z = -0.08;
    g.add(tagMesh);

    // 5C. Giant Porcelain Teacup Satellite orbiting the planetary wedge!
    teacupSatellite = new THREE.Group();
    const porcelainMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.2, metalness: 0.1 });
    const saucerPlate = new THREE.Mesh(new THREE.CylinderGeometry(7.5, 5.5, 1.1, 20), porcelainMat);
    const cupBody = new THREE.Mesh(new THREE.CylinderGeometry(4.8, 3.4, 5.5, 20), porcelainMat);
    cupBody.position.y = 3.0;
    const cupHandle = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.55, 8, 16, Math.PI), porcelainMat);
    cupHandle.position.set(4.6, 3.2, 0);
    cupHandle.rotation.z = -Math.PI / 2;
    teacupSatellite.add(saucerPlate, cupBody, cupHandle);
    g.add(teacupSatellite);

    return g;
  }

  function spawnRockMesh(radius, tier, seed) {
    const detail = tier === 3 ? 2 : 1;
    const geo = createCraggyRockGeometry(radius, detail, seed);
    const palettes = [
      { color: 0x475569, emissive: 0x0f172a },
      { color: 0x57534e, emissive: 0x1c1917 },
      { color: 0x3b4252, emissive: 0x1e1b4b },
      { color: 0x4a3b4e, emissive: 0x31102f }
    ];
    const pal = palettes[Math.abs(seed) % palettes.length];
    const mat = new THREE.MeshStandardMaterial({
      color: pal.color,
      emissive: pal.emissive,
      emissiveIntensity: 0.35,
      map: getSharedAsteroidTexture(),
      bumpMap: getSharedAsteroidTexture(),
      bumpScale: 0.42,
      roughness: 0.86,
      metalness: 0.18
    });
    const mesh = new THREE.Mesh(geo, mat);

    // Glowing mineral crystal nodes on larger rocks
    if (tier >= 2) {
      const crystalColors = [0x38bdf8, 0xc084fc, 0xfacc15, 0x34d399];
      const cMat = new THREE.MeshBasicMaterial({ color: crystalColors[Math.abs(seed) % crystalColors.length] });
      const crystalCount = tier === 3 ? 4 : 2;
      for (let c = 0; c < crystalCount; c++) {
        const ang = (c / crystalCount) * Math.PI * 2 + seed;
        const crys = new THREE.Mesh(new THREE.OctahedronGeometry(radius * 0.24, 0), cMat);
        crys.position.set(
          Math.cos(ang) * radius * 0.78,
          Math.sin(ang * 1.7) * radius * 0.45,
          Math.sin(ang) * radius * 0.78
        );
        mesh.add(crys);
      }
    }
    return mesh;
  }

  function build() {
    if (isBuilt && spaceScene) return spaceScene;

    spaceScene = new THREE.Scene();
    spaceScene.background = new THREE.Color(0x03050c);

    // Ambient cosmic starlight + warm Sun directional + cool Moon rim directional
    spaceScene.add(new THREE.AmbientLight(0x334155, 0.85));

    const sunDir = new THREE.DirectionalLight(0xffe4a0, 1.55);
    sunDir.position.set(650, 260, -520);
    spaceScene.add(sunDir);

    const moonDir = new THREE.DirectionalLight(0x7dd3fc, 0.65);
    moonDir.position.set(-620, -140, 480);
    spaceScene.add(moonDir);

    // 1. Deep Velvet 3D Starfield (2,600 crisp stars, zero shader overhead)
    const starCount = 2600;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    const starCol = new Float32Array(starCount * 3);
    const starPalette = [
      new THREE.Color(0xffffff),
      new THREE.Color(0xbae6fd),
      new THREE.Color(0xfef08a),
      new THREE.Color(0xfbcfe8),
      new THREE.Color(0xc4b5fd)
    ];
    for (let i = 0; i < starCount; i++) {
      const u = seededRand(i * 3 + 1);
      const v = seededRand(i * 3 + 2);
      const theta = u * Math.PI * 2;
      const phi = Math.acos(2 * v - 1);
      const r = 950 + seededRand(i * 3 + 3) * 350;
      starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = r * Math.cos(phi);
      starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      const sc = starPalette[i % starPalette.length];
      starCol[i * 3] = sc.r;
      starCol[i * 3 + 1] = sc.g;
      starCol[i * 3 + 2] = sc.b;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starCol, 3));
    const stars = new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({ size: 2.8, vertexColors: true, transparent: true, opacity: 0.95 })
    );
    spaceScene.add(stars);

    // 2. Distant Sun & Moon from Blåhaj Island (ultra-slow cadence)
    sunGroup = new THREE.Group();
    sunGroup.position.set(680, 240, -560);
    const sunCore = new THREE.Mesh(
      new THREE.SphereGeometry(54, 28, 22),
      new THREE.MeshBasicMaterial({ color: 0xfff3b0 })
    );
    const sunCorona1 = new THREE.Mesh(
      new THREE.SphereGeometry(68, 24, 18),
      new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.32, side: THREE.BackSide })
    );
    const sunCorona2 = new THREE.Mesh(
      new THREE.SphereGeometry(92, 24, 18),
      new THREE.MeshBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.14, side: THREE.BackSide })
    );
    sunGroup.add(sunCore, sunCorona1, sunCorona2);
    spaceScene.add(sunGroup);

    moonGroup = new THREE.Group();
    moonGroup.position.set(-640, 160, 490);
    const moonCore = new THREE.Mesh(
      new THREE.SphereGeometry(36, 24, 20),
      new THREE.MeshStandardMaterial({
        color: 0xe2e8f0,
        emissive: 0x38bdf8,
        emissiveIntensity: 0.22,
        roughness: 0.75
      })
    );
    const moonHalo = new THREE.Mesh(
      new THREE.SphereGeometry(48, 20, 16),
      new THREE.MeshBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.18, side: THREE.BackSide })
    );
    moonGroup.add(moonCore, moonHalo);
    spaceScene.add(moonGroup);

    // 3. The Distant Flat-Top Planetary Wedge of Blåhaj Island!
    islandWedgeGroup = buildBlahajIslandWedge();
    spaceScene.add(islandWedgeGroup);

    // 4. Atmospheric Re-Entry Gate (fly through or press [L] to return to Blåhaj Island!)
    reentryGateGroup = new THREE.Group();
    reentryGateGroup.position.copy(REENTRY_POS);
    reentryGateGroup.lookAt(new THREE.Vector3(0, 0, 0));
    reentryRingMesh = new THREE.Mesh(
      new THREE.TorusGeometry(REENTRY_RADIUS, 0.85, 12, 48),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    const innerPortalDisc = new THREE.Mesh(
      new THREE.CircleGeometry(REENTRY_RADIUS - 0.6, 36),
      new THREE.MeshBasicMaterial({
        color: 0x0ea5e9,
        transparent: true,
        opacity: 0.22,
        side: THREE.DoubleSide,
        depthWrite: false
      })
    );
    reentryGateGroup.add(reentryRingMesh, innerPortalDisc);
    spaceScene.add(reentryGateGroup);

    // 5. Six Massive Landmark Monolith Asteroids (give a grand sense of 3D space)
    monolithRocks.length = 0;
    const monolithSpecs = [
      { id: 'mono_1', x: -115, y: 18, z: -85, r: 22, orbitR: 142, orbitSpd: 0.018, phase: 0.4 },
      { id: 'mono_2', x: 128, y: -24, z: -95, r: 26, orbitR: 158, orbitSpd: -0.014, phase: 1.5 },
      { id: 'mono_3', x: 145, y: 32, z: 75, r: 19, orbitR: 162, orbitSpd: 0.016, phase: 2.6 },
      { id: 'mono_4', x: -135, y: -15, z: 88, r: 21, orbitR: 160, orbitSpd: -0.015, phase: 3.9 },
      { id: 'mono_5', x: 12, y: 58, z: -155, r: 24, orbitR: 156, orbitSpd: 0.012, phase: 4.8 },
      { id: 'mono_6', x: -18, y: -52, z: -45, r: 16, orbitR: 68, orbitSpd: -0.022, phase: 5.5 }
    ];
    monolithSpecs.forEach((ms, idx) => {
      const mesh = spawnRockMesh(ms.r, 3, idx + 11);
      mesh.position.set(ms.x, ms.y, ms.z);
      spaceScene.add(mesh);
      monolithRocks.push({
        ...ms,
        baseY: ms.y,
        pos: mesh.position,
        mesh,
        rotVel: new THREE.Vector3(
          (seededRand(idx * 7 + 1) - 0.5) * 0.25,
          (seededRand(idx * 7 + 2) - 0.5) * 0.32,
          (seededRand(idx * 7 + 3) - 0.5) * 0.22
        )
      });
    });

    // 6. Breakable, Orbiting, Bouncing & Fragmenting Space Rocks (24 initial medium & small rocks)
    breakableRocks.length = 0;
    for (let i = 0; i < 24; i++) {
      const tier = (i % 3 !== 0) ? 2 : 1; // 16 medium fragmentable rocks + 8 small rocks
      const radius = tier === 2 ? (4.0 + seededRand(i * 11 + 1) * 1.8) : (2.1 + seededRand(i * 11 + 2) * 0.9);
      const ang = (i / 24) * Math.PI * 2 + seededRand(i * 11 + 3) * 0.3;
      const dist = 28 + seededRand(i * 11 + 4) * 92;
      const y = (seededRand(i * 11 + 5) - 0.5) * 64;
      const x = Math.cos(ang) * dist;
      const z = Math.sin(ang) * dist - 20;

      const mesh = spawnRockMesh(radius, tier, i + 101);
      mesh.position.set(x, y, z);
      spaceScene.add(mesh);

      // Tangential orbital velocity so rocks orbit and cross paths to collide & bounce!
      const orbSpeed = (3.2 + seededRand(i * 11 + 6) * 5.4) * (i % 2 === 0 ? 1 : -1);
      const vx = -Math.sin(ang) * orbSpeed + (seededRand(i * 11 + 7) - 0.5) * 2.2;
      const vy = (seededRand(i * 11 + 8) - 0.5) * 1.8;
      const vz = Math.cos(ang) * orbSpeed + (seededRand(i * 11 + 9) - 0.5) * 2.2;

      breakableRocks.push({
        id: `rock_${i + 1}`,
        tier,
        radius,
        hp: tier === 2 ? 2 : 1,
        maxHp: tier === 2 ? 2 : 1,
        pos: mesh.position,
        vel: new THREE.Vector3(vx, vy, vz),
        rotVel: new THREE.Vector3(
          (seededRand(i * 13 + 1) - 0.5) * 1.8,
          (seededRand(i * 13 + 2) - 0.5) * 2.2,
          (seededRand(i * 13 + 3) - 0.5) * 1.8
        ),
        mesh,
        alive: true,
        respawnTimer: 0
      });
    }

    isBuilt = true;
    return spaceScene;
  }

  function spawnSpaceBurst(pos, colorHex = 0x38bdf8, count = 16, scale = 1.0) {
    if (!spaceScene || !pos) return;
    const geo = new THREE.OctahedronGeometry(0.42 * scale, 0);
    const palette = [colorHex, 0xffffff, 0xfacc15, 0xf472b6, 0x38bdf8];
    for (let i = 0; i < count; i++) {
      const cHex = palette[i % palette.length];
      const mat = new THREE.MeshBasicMaterial({ color: cHex, transparent: true, opacity: 0.98 });
      const m = new THREE.Mesh(geo, mat);
      m.position.copy(pos);
      const spd = (7.0 + Math.random() * 20.0) * scale;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      spaceScene.add(m);
      spaceBursts.push({
        mesh: m,
        vel: new THREE.Vector3(
          spd * Math.sin(ph) * Math.cos(th),
          spd * Math.cos(ph),
          spd * Math.sin(ph) * Math.sin(th)
        ),
        life: 0.75 + Math.random() * 0.55
      });
    }
  }

  function shatterRock(rock, impactVel = null, fromNetwork = false) {
    if (!rock || !rock.alive) return;
    rock.alive = false;
    if (rock.mesh) rock.mesh.visible = false;
    rocksShatteredCount++;

    spawnSpaceBurst(rock.pos, rock.tier === 2 ? 0xfacc15 : 0x38bdf8, rock.tier === 2 ? 22 : 14, rock.tier === 2 ? 1.35 : 0.95);
    if (window.CozyAudio && window.CozyAudio.trapHit) window.CozyAudio.trapHit();

    if (rock.tier === 2) {
      // Fragment Medium Rock into 3 spinning Small Rocks flying apart!
      const parentPos = rock.pos.clone();
      const parentVel = rock.vel.clone();
      for (let f = 0; f < 3; f++) {
        const fragAngle = (f / 3) * Math.PI * 2 + (parentPos.x * 0.1);
        const fragR = Math.max(1.8, rock.radius * 0.46);
        const fSeed = ++nextFragmentId;
        const fMesh = spawnRockMesh(fragR, 1, fSeed);
        const offset = new THREE.Vector3(
          Math.cos(fragAngle) * (fragR * 1.15),
          (f - 1) * fragR * 0.65,
          Math.sin(fragAngle) * (fragR * 1.15)
        );
        fMesh.position.copy(parentPos).add(offset);
        spaceScene.add(fMesh);

        const burstDir = offset.clone().normalize().multiplyScalar(5.5);
        if (impactVel) burstDir.addScaledVector(impactVel, 0.12);

        breakableRocks.push({
          id: `frag_${rock.id}_${f}`,
          isFragment: true,
          tier: 1,
          radius: fragR,
          hp: 1,
          maxHp: 1,
          pos: fMesh.position,
          vel: parentVel.clone().add(burstDir),
          rotVel: new THREE.Vector3((f - 1) * 2.4, 2.8, (1 - f) * 2.1),
          mesh: fMesh,
          alive: true,
          respawnTimer: 0
        });
      }
      rock.respawnTimer = ASTEROID_RESPAWN_SECONDS; // Regenerates in 1 hour
      const remAfterFrac = breakableRocks.filter((x) => x.alive).length;
      if (!fromNetwork && window.showToast) {
        window.showToast('💥🪨 ASTEROID FRACTURED!', `Split into 3 fragments! (${remAfterFrac} space rocks remaining in Wave ${sectorWave})`);
      }
    } else {
      // Tier 1 rock vaporized completely
      if (rock.isFragment) {
        if (rock.mesh && rock.mesh.parent) rock.mesh.parent.remove(rock.mesh);
      } else {
        rock.respawnTimer = ASTEROID_RESPAWN_SECONDS; // Regenerates in 1 hour
      }
      const remaining = breakableRocks.filter((x) => x.alive).length;
      if (remaining === 0 && !waveCleared) {
        waveCleared = true;
        if (window.CozyAudio && window.CozyAudio.portalChime) window.CozyAudio.portalChime();
        if (window.showToast) {
          window.showToast(
            '🏆✨ SPACE SECTOR CLEARED!',
            'All destructible asteroids destroyed! Select Mojo Hyperdrive [4] + hold [Shift] for 5s to warp to the Swiss Cheese Planetoid!'
          );
        }
      } else if (!fromNetwork && window.showToast && (remaining <= 5 || rocksShatteredCount % 4 === 1)) {
        window.showToast(
          '✨🪨 SPACE ROCK VAPORIZED!',
          `${remaining} rock${remaining === 1 ? '' : 's'} remaining in Wave ${sectorWave} · 1-hour respawn timer`
        );
      }
    }

    if (!fromNetwork && window.BlahajNetwork && typeof window.BlahajNetwork.send === 'function') {
      window.BlahajNetwork.send({
        type: 'space_event',
        action: 'shatter_rock',
        rockId: rock.id
      });
    }
  }

  // Called by ufo.js for each active Ray Turret plasma bolt when currentZone === 'space'
  function checkPlasmaBoltCollision(boltPos, boltVel, boltColor = 0x38bdf8) {
    if (!isBuilt || !boltPos) return false;

    // 1. Check breakable rocks first
    for (let i = 0; i < breakableRocks.length; i++) {
      const r = breakableRocks[i];
      if (!r.alive || !r.mesh || !r.mesh.visible) continue;
      const d = r.pos.distanceTo(boltPos);
      if (d <= r.radius + 1.35) {
        r.hp -= 1;
        // Impart laser momentum impulse
        if (boltVel) {
          r.vel.addScaledVector(boltVel, 0.09 / Math.max(1, r.tier));
        }
        spawnSpaceBurst(boltPos, boltColor || 0x38bdf8, 14, 1.05);
        if (r.hp <= 0) {
          shatterRock(r, boltVel, false);
        } else {
          // Flash rock brightly on hit
          if (r.mesh.material && r.mesh.material.emissive) {
            const prevEm = r.mesh.material.emissive.getHex();
            r.mesh.material.emissive.setHex(boltColor || 0x38bdf8);
            setTimeout(() => {
              if (r.mesh && r.mesh.material && r.mesh.material.emissive) {
                r.mesh.material.emissive.setHex(prevEm);
              }
            }, 125);
          }
        }
        return true;
      }
    }

    // 2. Check giant indestructible monoliths (deflect laser bolt with colorful sparks)
    for (let i = 0; i < monolithRocks.length; i++) {
      const m = monolithRocks[i];
      if (m.pos.distanceTo(boltPos) <= m.r + 1.0) {
        spawnSpaceBurst(boltPos, boltColor || 0xc084fc, 16, 1.15);
        return true;
      }
    }

    return false;
  }

  function handleNetworkPacket(data) {
    if (!data || data.type !== 'space_event') return;
    if (data.action === 'shatter_rock' && data.rockId) {
      const target = breakableRocks.find((r) => r.id === data.rockId && r.alive);
      if (target) shatterRock(target, null, true);
    } else if (data.action === 'enter_space') {
      if (window.BlahajGame && typeof window.BlahajGame.enterSpaceMap === 'function') {
        window.BlahajGame.enterSpaceMap(false);
      }
    } else if (data.action === 'exit_space') {
      if (window.BlahajGame && typeof window.BlahajGame.exitSpaceMap === 'function') {
        window.BlahajGame.exitSpaceMap(false);
      }
    } else if (data.action === 'sonic_shockwave' && data.pos) {
      triggerSonicShockwave(new THREE.Vector3(data.pos.x, data.pos.y, data.pos.z), true);
    } else if (data.action === 'ufo_destroyed') {
      if (window.BlahajUFO && typeof window.BlahajUFO.handleDestroyedFromNetwork === 'function') {
        window.BlahajUFO.handleDestroyedFromNetwork();
      }
    }
  }

  function triggerSonicShockwave(originPos, fromNetwork = false) {
    if (!isBuilt || !originPos) return;
    spawnSpaceBurst(originPos, 0xf472b6, 22, 1.4);

    // 1. Instantly shatter small (tier 1) space rocks within 38m (clears incoming debris cushion!)
    // 2. Strongly push back medium (tier 2) space rocks within 54m
    for (let i = breakableRocks.length - 1; i >= 0; i--) {
      const r = breakableRocks[i];
      if (!r || !r.alive) continue;
      const diff = new THREE.Vector3().subVectors(r.pos, originPos);
      const d = diff.length();
      if (r.tier === 1 && d <= 38.0) {
        shatterRock(r, diff.normalize().multiplyScalar(28.0), true);
      } else if (r.tier === 2 && d <= 54.0 && d > 0.01) {
        const pushDir = diff.divideScalar(d);
        const strength = 42.0 * (1.0 - (d / 60.0) * 0.55);
        r.vel.addScaledVector(pushDir, strength);
        spawnSpaceBurst(r.pos, 0x38bdf8, 8, 0.85);
      }
    }

    if (!fromNetwork && window.BlahajNetwork && typeof window.BlahajNetwork.send === 'function') {
      window.BlahajNetwork.send({
        type: 'space_event',
        action: 'sonic_shockwave',
        pos: { x: originPos.x, y: originPos.y, z: originPos.z }
      });
    }
  }

  function update(dt, elapsed) {
    if (!isBuilt) build();

    // 1. Ultra-slow celestial cadence for Sun, Moon, and the distant Blåhaj Island Planetary Wedge
    if (sunGroup) {
      const sAng = elapsed * 0.0035;
      sunGroup.position.set(Math.cos(sAng) * 760, 230, -Math.sin(sAng) * 680 - 120);
    }
    if (moonGroup) {
      const mAng = elapsed * 0.0035 + Math.PI;
      moonGroup.position.set(Math.cos(mAng) * 720, 150, -Math.sin(mAng) * 640);
    }
    if (islandWedgeGroup) {
      const wAng = elapsed * 0.008;
      islandWedgeGroup.position.x = -155 + Math.sin(wAng) * 45;
      islandWedgeGroup.position.y = -38 + Math.sin(elapsed * 0.45) * 4.5;
      islandWedgeGroup.rotation.y = elapsed * 0.025;
    }
    if (teacupSatellite) {
      const tAng = elapsed * 0.38;
      teacupSatellite.position.set(Math.cos(tAng) * 128, 22 + Math.sin(tAng * 2) * 8, Math.sin(tAng) * 128);
      teacupSatellite.rotation.y = -tAng;
      teacupSatellite.rotation.z = Math.sin(elapsed * 0.9) * 0.18;
    }
    if (waterfallParticles) {
      const wp = waterfallParticles.geometry.attributes.position;
      for (let i = 0; i < wp.count; i++) {
        let y = wp.getY(i) - 18.0 * dt;
        if (y < -88.0) y = 1.0;
        wp.setY(i, y);
      }
      wp.needsUpdate = true;
    }
    if (reentryRingMesh) {
      reentryRingMesh.rotation.z = elapsed * 0.85;
    }

    // 2. Update particle bursts
    for (let i = spaceBursts.length - 1; i >= 0; i--) {
      const b = spaceBursts[i];
      b.life -= dt;
      b.mesh.position.addScaledVector(b.vel, dt);
      b.mesh.rotation.x += dt * 5;
      b.mesh.rotation.y += dt * 6;
      b.mesh.scale.setScalar(Math.max(0.05, b.life));
      if (b.life <= 0) {
        if (b.mesh.parent) b.mesh.parent.remove(b.mesh);
        spaceBursts.splice(i, 1);
      }
    }

    // 3. Orbit & rotate the 6 Giant Monolith Asteroids
    for (let i = 0; i < monolithRocks.length; i++) {
      const m = monolithRocks[i];
      const a = m.phase + elapsed * m.orbitSpd;
      m.pos.set(
        Math.cos(a) * m.orbitR,
        m.baseY + Math.sin(elapsed * 0.25 + m.phase) * 6.0,
        Math.sin(a) * m.orbitR - 20
      );
      m.mesh.rotation.x += m.rotVel.x * dt;
      m.mesh.rotation.y += m.rotVel.y * dt;
      m.mesh.rotation.z += m.rotVel.z * dt;
    }

    // 4. Update Breakable Space Rocks: Orbits, Boundary Wrap, Rock-to-Rock & Rock-to-Monolith Elastic Bouncing!
    const ufoState = (window.BlahajUFO && typeof window.BlahajUFO.getState === 'function')
      ? window.BlahajUFO.getState()
      : null;

    for (let i = breakableRocks.length - 1; i >= 0; i--) {
      const r = breakableRocks[i];
      if (!r.alive) {
        if (r.isFragment) {
          breakableRocks.splice(i, 1);
          continue;
        }
        if (r.respawnTimer > 0) {
          r.respawnTimer -= dt;
          if (r.respawnTimer <= 0) {
            r.alive = true;
            r.hp = r.maxHp;
            waveCleared = false;
            const ang = Math.random() * Math.PI * 2;
            const dist = 75 + Math.random() * 55;
            r.pos.set(Math.cos(ang) * dist, (Math.random() - 0.5) * 50, Math.sin(ang) * dist - 20);
            r.vel.set(-Math.sin(ang) * 5.0, (Math.random() - 0.5) * 1.5, Math.cos(ang) * 5.0);
            if (r.mesh) r.mesh.visible = true;
          }
        }
        continue;
      }

      // Gentle centripetal orbital pull toward sector center (0, 0, -20) so rocks stay in an active belt
      const dxC = -r.pos.x;
      const dyC = -r.pos.y * 0.35;
      const dzC = -20 - r.pos.z;
      const distC = Math.hypot(dxC, dyC, dzC) || 1;
      if (distC > 135) {
        const pull = (distC - 135) * 0.08 * dt;
        r.vel.x += (dxC / distC) * pull;
        r.vel.y += (dyC / distC) * pull;
        r.vel.z += (dzC / distC) * pull;
      }
      // Cap rock speed
      const spd = r.vel.length();
      if (spd > 18.0) r.vel.multiplyScalar(18.0 / spd);

      r.pos.addScaledVector(r.vel, dt);
      r.mesh.rotation.x += r.rotVel.x * dt;
      r.mesh.rotation.y += r.rotVel.y * dt;
      r.mesh.rotation.z += r.rotVel.z * dt;

      // 4A. Bounce off Giant Monoliths
      for (let mIdx = 0; mIdx < monolithRocks.length; mIdx++) {
        const m = monolithRocks[mIdx];
        const minD = r.radius + m.r;
        const diff = new THREE.Vector3().subVectors(r.pos, m.pos);
        const d = diff.length();
        if (d < minD && d > 0.01) {
          const n = diff.divideScalar(d);
          r.pos.copy(m.pos).addScaledVector(n, minD + 0.15);
          const vn = r.vel.dot(n);
          if (vn < 0) {
            r.vel.addScaledVector(n, -1.85 * vn);
            spawnSpaceBurst(r.pos, 0x94a3b8, 5, 0.55);
          }
        }
      }

      // 4B. Bounce off UFO Hull (elastic deflection + speed/size-scaled gravitronic shield & hull damage!)
      if (ufoState && ufoState.pos) {
        const minUfoD = r.radius + 4.8;
        const diffU = new THREE.Vector3().subVectors(r.pos, ufoState.pos);
        const dU = diffU.length();
        if (dU < minUfoD && dU > 0.01) {
          const nU = diffU.divideScalar(dU);
          const ufoVel = ufoState.vel || new THREE.Vector3();
          const relVel = new THREE.Vector3().subVectors(r.vel, ufoVel);
          const impactSpeed = Math.max(0, -relVel.dot(nU));
          r.pos.copy(ufoState.pos).addScaledVector(nU, minUfoD + 0.2);
          r.vel.addScaledVector(nU, 10.5 + impactSpeed * 0.45);
          if (ufoState.vel) ufoState.vel.addScaledVector(nU, -2.5);
          spawnSpaceBurst(r.pos, 0x38bdf8, 8, 0.7);
          if (window.CozyAudio && window.CozyAudio.bounceBoing) window.CozyAudio.bounceBoing();

          if (ufoState.localRole === 'pilot' && window.BlahajUFO && typeof window.BlahajUFO.applyImpactDamage === 'function') {
            if (impactSpeed >= 6.5 || r.tier >= 2) {
              const sizeMult = r.tier === 2 ? 1.85 : 0.9;
              const rawDmg = Math.max(6, Math.min(48, (impactSpeed * 0.65 + 6.0) * sizeMult));
              window.BlahajUFO.applyImpactDamage(rawDmg, r.tier === 2 ? 'Medium Asteroid Impact' : 'Space Rock Strike', false);
            }
          }
        }
      }
    }

    // 4C. Rock-to-Rock 3D Elastic Collisions & Bouncing!
    for (let i = 0; i < breakableRocks.length; i++) {
      const a = breakableRocks[i];
      if (!a.alive) continue;
      for (let j = i + 1; j < breakableRocks.length; j++) {
        const b = breakableRocks[j];
        if (!b.alive) continue;
        const minD = a.radius + b.radius;
        const dx = b.pos.x - a.pos.x;
        const dy = b.pos.y - a.pos.y;
        const dz = b.pos.z - a.pos.z;
        const dSq = dx * dx + dy * dy + dz * dz;
        if (dSq < minD * minD && dSq > 0.001) {
          const d = Math.sqrt(dSq);
          const nx = dx / d;
          const ny = dy / d;
          const nz = dz / d;
          const overlap = (minD - d) * 0.52;
          a.pos.x -= nx * overlap;
          a.pos.y -= ny * overlap;
          a.pos.z -= nz * overlap;
          b.pos.x += nx * overlap;
          b.pos.y += ny * overlap;
          b.pos.z += nz * overlap;

          // Relative velocity along collision normal
          const rvx = b.vel.x - a.vel.x;
          const rvy = b.vel.y - a.vel.y;
          const rvz = b.vel.z - a.vel.z;
          const velAlongNormal = rvx * nx + rvy * ny + rvz * nz;
          if (velAlongNormal < 0) {
            const massA = a.radius * a.radius;
            const massB = b.radius * b.radius;
            const impulse = -(1.82 * velAlongNormal) / (1 / massA + 1 / massB);
            a.vel.x -= (impulse / massA) * nx;
            a.vel.y -= (impulse / massA) * ny;
            a.vel.z -= (impulse / massA) * nz;
            b.vel.x += (impulse / massB) * nx;
            b.vel.y += (impulse / massB) * ny;
            b.vel.z += (impulse / massB) * nz;
          }
        }
      }
    }

    // 4D. Giant Monolith vs UFO Hull deflection + heavy impact damage + Re-Entry Gate check
    if (ufoState && ufoState.pos) {
      for (let mIdx = 0; mIdx < monolithRocks.length; mIdx++) {
        const m = monolithRocks[mIdx];
        const minD = m.r + 5.2;
        const diff = new THREE.Vector3().subVectors(ufoState.pos, m.pos);
        const d = diff.length();
        if (d < minD && d > 0.01) {
          const n = diff.divideScalar(d);
          const impactSpeed = ufoState.vel ? Math.max(0, -ufoState.vel.dot(n)) : 12.0;
          ufoState.pos.copy(m.pos).addScaledVector(n, minD + 0.2);
          if (ufoState.vel) {
            const vn = ufoState.vel.dot(n);
            if (vn < 0) ufoState.vel.addScaledVector(n, -1.5 * vn);
          }
          spawnSpaceBurst(ufoState.pos.clone().addScaledVector(n, -4.5), 0xc084fc, 12, 1.0);
          if (ufoState.localRole === 'pilot' && window.BlahajUFO && typeof window.BlahajUFO.applyImpactDamage === 'function') {
            const rawDmg = Math.max(22, Math.min(72, impactSpeed * 1.15 + 18.0));
            window.BlahajUFO.applyImpactDamage(rawDmg, 'Giant Monolith Collision', true);
          }
        }
      }

      // Check if pilot flew through the Atmospheric Re-Entry Gate
      if (ufoState.localRole === 'pilot' && ufoState.pos.distanceTo(REENTRY_POS) < REENTRY_RADIUS) {
        if (window.BlahajGame && typeof window.BlahajGame.exitSpaceMap === 'function') {
          window.BlahajGame.exitSpaceMap(true);
        }
      }
    }
  }

  return {
    build,
    update,
    getScene: () => (isBuilt ? spaceScene : build()),
    checkPlasmaBoltCollision,
    handleNetworkPacket,
    triggerSonicShockwave,
    getReentryPos: () => REENTRY_POS,
    getSectorStatus: () => ({
      wave: sectorWave,
      waveCleared,
      remainingRocks: breakableRocks.filter((x) => x.alive).length,
      shatteredCount: rocksShatteredCount,
      respawnSeconds: ASTEROID_RESPAWN_SECONDS
    }),
    getRadarBlips: () => {
      const blips = [];
      for (let i = 0; i < monolithRocks.length; i++) {
        const m = monolithRocks[i];
        blips.push({ x: m.pos.x, y: m.pos.y, z: m.pos.z, kind: 'monolith', tier: 3 });
      }
      let remaining = 0;
      for (let i = 0; i < breakableRocks.length; i++) {
        const r = breakableRocks[i];
        if (!r || !r.alive) continue;
        remaining++;
        blips.push({ x: r.pos.x, y: r.pos.y, z: r.pos.z, kind: 'rock', tier: r.tier });
      }
      blips.push({ x: REENTRY_POS.x, y: REENTRY_POS.y, z: REENTRY_POS.z, kind: 'gate', tier: 0 });
      return {
        label: remaining === 0 ? '🏆 CLEARED! [4]+[SHIFT] 5s' : `ROCKS: ${remaining}`,
        cleared: remaining === 0,
        blips
      };
    }
  };
})();
