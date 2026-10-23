// =============================================================================
// SPHERICAL FOODS BISTRO & ROTUNDA (DEDICATED INTERIOR INSTANCE)
// "Everything is better in a sphere — No flat food allowed!"
// Propriétaire: Monsieur Betterave · Est. October 24
// =============================================================================

window.BlahajSphericalFoods = (function () {
  'use strict';

  let scene = null;
  let active = false;
  let built = false;

  // Key mesh groups & references
  let rotundaGroup = null;
  let chandelierLight = null;
  let chandelierGroup = null;
  let cakeGroup = null;
  let candleFlameMesh = null;
  let candleLight = null;
  let betteraveMesh = null;
  let sousChefBirbMesh = null;
  const kitchenSteamParticles = [];
  const balloonMeshes = [];

  // Interaction coordinates inside the bistro rotunda
  // Rotunda center is (0, 0, 0), Radius = 14m
  // Entrance / Exit doors are at the South: (0, 0, 12.8), facing North (-Z)
  const START_POS = { x: 0, y: 0.1, z: 11.2, rotY: Math.PI }; // Enter facing into the dining room
  const EXIT_POS = { x: 0, y: 0, z: 12.6 };
  const MAITRE_D_POS = { x: 0, y: 0, z: 2.5 }; // Monsieur Betterave near the central reception
  const HELEN_ALCOVE_POS = { x: 5.5, y: 0, z: -4.0 }; // Helen's Birthday VIP Alcove (East)

  // Date Check: Is it Helen's Birthday Week?
  // Helen's birthday is October 24. Birthday week runs October 21 through October 28.
  function isHelensBirthdayWeek() {
    const now = new Date();
    const month = now.getMonth(); // 9 = October (0-indexed)
    const day = now.getDate();
    return (month === 9 && day >= 21 && day <= 28);
  }

  // Construct the 3D Helen Celestial Birthday Bombe (Spherical Birthday Cake)
  function createHelensBirthdayCake() {
    const group = new THREE.Group();

    // 1. Ornate Polished Brass Pedestal Stand
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xd8aa5b,
      roughness: 0.22,
      metalness: 0.88
    });
    const standBase = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.25, 0.18, 28), brassMat);
    standBase.position.y = 0.09;
    group.add(standBase);

    const standStem = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.32, 0.65, 18), brassMat);
    standStem.position.y = 0.50;
    group.add(standStem);

    const standPlatter = new THREE.Mesh(new THREE.CylinderGeometry(1.65, 1.45, 0.12, 32), brassMat);
    standPlatter.position.y = 0.88;
    group.add(standPlatter);

    // 2. Fine Porcelain Presentation Saucer
    const porcelainMat = new THREE.MeshStandardMaterial({
      color: 0xfdfbf7,
      roughness: 0.14,
      metalness: 0.05
    });
    const saucer = new THREE.Mesh(new THREE.CylinderGeometry(1.48, 1.32, 0.06, 32), porcelainMat);
    saucer.position.y = 0.94;
    group.add(saucer);

    // 3. The Grand Spherical Cake: Ruby-Magenta Mirror Glaze (Glaçage Miroir)
    // Core sphere (diameter ~ 1.55m)
    const cakeGlazeMat = new THREE.MeshStandardMaterial({
      color: 0x9f1239, // Deep ruby raspberry-rose glaze
      roughness: 0.12,
      metalness: 0.15
    });
    const cakeSphere = new THREE.Mesh(new THREE.SphereGeometry(0.78, 36, 30), cakeGlazeMat);
    cakeSphere.position.y = 1.72;
    cakeSphere.castShadow = true;
    group.add(cakeSphere);

    // 4. Edible Gold Foil Stars & Sugar Pearls Garnish
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      roughness: 0.2,
      metalness: 0.9
    });
    const pearlMat = new THREE.MeshStandardMaterial({
      color: 0xbe123c, // Candied beetroot pearls
      roughness: 0.25,
      metalness: 0.1
    });

    // Ring of candied pearls around equator and base
    const numPearls = 18;
    for (let i = 0; i < numPearls; i++) {
      const a = (i / numPearls) * Math.PI * 2;
      const pearl = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 10), pearlMat);
      pearl.position.set(Math.cos(a) * 0.88, 1.02, Math.sin(a) * 0.88);
      group.add(pearl);
    }

    // Gold leaf stars dusted on the dome
    for (let s = 0; s < 12; s++) {
      const theta = (s / 12) * Math.PI * 2 + (s % 2) * 0.25;
      const phi = 0.45 + (s % 3) * 0.35;
      const sx = Math.sin(phi) * Math.cos(theta) * 0.79;
      const sy = 1.72 + Math.cos(phi) * 0.79;
      const sz = Math.sin(phi) * Math.sin(theta) * 0.79;
      const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.045, 0), goldMat);
      star.position.set(sx, sy, sz);
      star.rotation.set(Math.random(), Math.random(), Math.random());
      group.add(star);
    }

    // 5. Curved Golden Birthday Candle sprouting from North Pole
    const candleStem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.045, 0.45, 12),
      goldMat
    );
    candleStem.position.set(0, 2.70, 0);
    candleStem.rotation.z = 0.08; // Subtle jaunty tilt
    group.add(candleStem);

    // Candle Wick
    const wick = new THREE.Mesh(
      new THREE.CylinderGeometry(0.008, 0.008, 0.08, 6),
      new THREE.MeshBasicMaterial({ color: 0x1c1917 })
    );
    wick.position.set(0.02, 2.96, 0);
    group.add(wick);

    // Flickering Flame
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xffedd5 });
    candleFlameMesh = new THREE.Mesh(
      new THREE.ConeGeometry(0.055, 0.16, 10),
      flameMat
    );
    candleFlameMesh.position.set(0.02, 3.08, 0);
    group.add(candleFlameMesh);

    // Warm Candle Glow Light
    candleLight = new THREE.PointLight(0xffa238, 1.8, 6.5, 1.5);
    candleLight.position.set(0.02, 3.12, 0);
    group.add(candleLight);

    // 6. Brass Inscription Plaque on Stand Base
    const bannerMat = new THREE.MeshStandardMaterial({
      color: 0x451a03,
      roughness: 0.4
    });
    const banner = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.14, 0.05), bannerMat);
    banner.position.set(0, 0.22, 1.08);
    banner.rotation.x = -0.25;
    group.add(banner);

    return group;
  }

  // Construct Monsieur Betterave (Beetroot Maitre D')
  function createMonsieurBetterave() {
    const group = new THREE.Group();

    // 1. Plump Sculpted Beetroot Body
    const beetMat = new THREE.MeshStandardMaterial({
      color: 0x881337, // Rich deep burgundy beetroot
      roughness: 0.65
    });
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.68, 20, 18), beetMat);
    body.scale.set(1.0, 1.25, 0.95);
    body.position.y = 1.05;
    body.castShadow = true;
    group.add(body);

    // Tapering beet root tip at bottom
    const tapRoot = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.45, 10), beetMat);
    tapRoot.rotation.x = Math.PI;
    tapRoot.position.y = 0.32;
    group.add(tapRoot);

    // 2. Leafy Crown of Fresh Beet Greens on Top
    const leafStemMat = new THREE.MeshStandardMaterial({ color: 0x9f1239, roughness: 0.5 });
    const leafBladeMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.42 });

    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.04, 0.55, 8), leafStemMat);
      stem.position.set(Math.cos(a) * 0.18, 1.85, Math.sin(a) * 0.18);
      stem.rotation.z = Math.cos(a) * 0.35;
      stem.rotation.x = Math.sin(a) * 0.35;
      group.add(stem);

      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), leafBladeMat);
      leaf.scale.set(1.2, 2.2, 0.25);
      leaf.position.set(Math.cos(a) * 0.32, 2.15, Math.sin(a) * 0.32);
      leaf.rotation.y = a;
      leaf.rotation.z = Math.cos(a) * 0.4;
      group.add(leaf);
    }

    // 3. Expressive Dapper Face: Glossy Button Eyes & Welcoming Smile
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.1 });
    const catchMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    [-1, 1].forEach((side) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.065, 10, 10), eyeMat);
      eye.position.set(side * 0.24, 1.28, 0.58);
      group.add(eye);

      const catchlight = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 6), catchMat);
      catchlight.position.set(side * 0.24 + 0.02, 1.30, 0.63);
      group.add(catchlight);
    });

    // French Moustache (Two curled arcs)
    const stacheMat = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.4 });
    const stacheL = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.028, 8, 16, Math.PI * 0.8), stacheMat);
    stacheL.position.set(-0.08, 1.12, 0.62);
    stacheL.rotation.z = -Math.PI * 0.3;
    group.add(stacheL);

    const stacheR = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.028, 8, 16, Math.PI * 0.8), stacheMat);
    stacheR.position.set(0.08, 1.12, 0.62);
    stacheR.rotation.z = Math.PI * 0.3;
    stacheR.scale.x = -1;
    group.add(stacheR);

    // 4. Dapper Maitre D' Attire: Golden Brass Bowtie & Linen Towel
    const bowMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.25, metalness: 0.8 });
    const bowCenter = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), bowMat);
    bowCenter.position.set(0, 0.94, 0.65);
    group.add(bowCenter);

    const bowL = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.12, 8), bowMat);
    bowL.rotation.z = Math.PI / 2;
    bowL.position.set(-0.11, 0.94, 0.65);
    group.add(bowL);

    const bowR = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.12, 8), bowMat);
    bowR.rotation.z = -Math.PI / 2;
    bowR.position.set(0.11, 0.94, 0.65);
    group.add(bowR);

    // Serving Tray with Domed Cloche held proudly
    const trayMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.2, metalness: 0.85 });
    const tray = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.03, 20), trayMat);
    tray.position.set(0.42, 0.98, 0.52);
    group.add(tray);

    const cloche = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.5),
      trayMat
    );
    cloche.position.set(0.42, 1.0, 0.52);
    group.add(cloche);

    const clocheHandle = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), bowMat);
    clocheHandle.position.set(0.42, 1.25, 0.52);
    group.add(clocheHandle);

    return group;
  }

  // Construct the Entire Interior Bistro Rotunda Instance
  function build() {
    if (built) return Promise.resolve();

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x130e16); // Warm midnight violet ambiance

    rotundaGroup = new THREE.Group();

    // 1. Concentric Checkered Terrazzo & Warm Mahogany Floor
    const floorRadius = 14.5;
    const floorGeo = new THREE.CylinderGeometry(floorRadius, floorRadius, 0.4, 48);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x2e1d15, // Dark polished mahogany border
      roughness: 0.35,
      metalness: 0.08
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.y = -0.2;
    floor.receiveShadow = true;
    rotundaGroup.add(floor);

    // Inner concentric cream terrazzo disc with brass inlay rings
    const innerFloorMat = new THREE.MeshStandardMaterial({
      color: 0xf3eee3, // Polished cream terrazzo
      roughness: 0.24,
      metalness: 0.05
    });
    const innerFloor = new THREE.Mesh(new THREE.CylinderGeometry(11.8, 11.8, 0.02, 48), innerFloorMat);
    innerFloor.position.y = 0.01;
    innerFloor.receiveShadow = true;
    rotundaGroup.add(innerFloor);

    const brassInlayMat = new THREE.MeshStandardMaterial({
      color: 0xd8aa5b,
      roughness: 0.25,
      metalness: 0.85
    });
    [4.2, 8.4, 11.8].forEach((r) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.04, 8, 48), brassInlayMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.025;
      rotundaGroup.add(ring);
    });

    // 2. Cylindrical Bistro Rotunda Walls & Wainscoting
    const wallHeight = 7.5;
    const wallGeo = new THREE.CylinderGeometry(floorRadius, floorRadius, wallHeight, 48, 1, true);
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x4a3b32, // Warm biscuit limestone wall
      roughness: 0.85,
      side: THREE.BackSide
    });
    const wall = new THREE.Mesh(wallGeo, wallMat);
    wall.position.y = wallHeight * 0.5;
    rotundaGroup.add(wall);

    // Mahogany Wainscoting (Lower 2.6m of the wall)
    const wainscotGeo = new THREE.CylinderGeometry(floorRadius - 0.05, floorRadius - 0.05, 2.6, 48, 1, true);
    const wainscotMat = new THREE.MeshStandardMaterial({
      color: 0x3d2215, // Deep rich mahogany paneling
      roughness: 0.5,
      side: THREE.BackSide
    });
    const wainscot = new THREE.Mesh(wainscotGeo, wainscotMat);
    wainscot.position.y = 1.3;
    rotundaGroup.add(wainscot);

    // 3. Soaring Coffered Vaulted Dome Ceiling with Brass Ribs & Stars
    const domeGeo = new THREE.SphereGeometry(floorRadius, 48, 24, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const domeMat = new THREE.MeshStandardMaterial({
      color: 0x1f192b, // Midnight indigo vaulted dome
      roughness: 0.7,
      side: THREE.BackSide
    });
    const dome = new THREE.Mesh(domeGeo, domeMat);
    dome.position.y = wallHeight;
    rotundaGroup.add(dome);

    // Meridian brass ribs radiating up the dome
    for (let r = 0; r < 12; r++) {
      const ra = (r / 12) * Math.PI * 2;
      const rib = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, floorRadius * 1.1), brassInlayMat);
      rib.position.set(0, wallHeight + 3.2, 0);
      rib.rotation.y = ra;
      rib.rotation.x = Math.PI * 0.22;
      rotundaGroup.add(rib);
    }

    // 4. The Spectacular Central Chandelier of Floating Illuminated Spheres
    chandelierGroup = new THREE.Group();
    chandelierGroup.position.set(0, wallHeight + 1.2, 0);

    const chStem = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.2, 12), brassInlayMat);
    chStem.position.y = 1.6;
    chandelierGroup.add(chStem);

    const chTierMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.1,
      metalness: 0.1
    });

    // 3 Concentric rings of luminous milk-glass globes
    const globeConfigs = [
      { r: 1.4, count: 6, size: 0.32, y: 0.2 },
      { r: 2.8, count: 10, size: 0.42, y: -0.3 },
      { r: 4.2, count: 14, size: 0.52, y: -0.8 }
    ];

    globeConfigs.forEach((tier) => {
      const ringMesh = new THREE.Mesh(new THREE.TorusGeometry(tier.r, 0.06, 8, 36), brassInlayMat);
      ringMesh.rotation.x = Math.PI / 2;
      ringMesh.position.y = tier.y + 0.1;
      chandelierGroup.add(ringMesh);

      for (let g = 0; g < tier.count; g++) {
        const ga = (g / tier.count) * Math.PI * 2;
        const globe = new THREE.Mesh(
          new THREE.SphereGeometry(tier.size, 16, 14),
          new THREE.MeshBasicMaterial({ color: 0xfff6e3 })
        );
        globe.position.set(Math.cos(ga) * tier.r, tier.y, Math.sin(ga) * tier.r);
        chandelierGroup.add(globe);
      }
    });

    chandelierLight = new THREE.PointLight(0xffecd1, 2.6, 26, 1.2);
    chandelierLight.position.set(0, -0.5, 0);
    chandelierGroup.add(chandelierLight);

    rotundaGroup.add(chandelierGroup);

    // 5. Radiating Burgundy Velvet Banquette Booths
    // Matching the exact burgundy round booth in Spherical-Foods.png
    const boothMat = new THREE.MeshStandardMaterial({
      color: 0x701a28, // Deep burgundy velvet
      roughness: 0.68
    });
    const woodMat = new THREE.MeshStandardMaterial({
      color: 0x3f2214, // Polished dark mahogany
      roughness: 0.45
    });

    // 5 Dining booths placed around the circular perimeter (skipping south entrance and north kitchen)
    const boothAngles = [
      Math.PI * 0.65, // West
      Math.PI * 0.90, // Northwest
      Math.PI * 1.35, // Northeast
      Math.PI * 1.60  // East
    ];

    boothAngles.forEach((angle) => {
      const bDist = 9.8;
      const bx = Math.cos(angle) * bDist;
      const bz = Math.sin(angle) * bDist;

      const bg = new THREE.Group();
      bg.position.set(bx, 0, bz);
      bg.rotation.y = -angle + Math.PI / 2;

      // Curved banquette backrest
      const bench = new THREE.Mesh(
        new THREE.CylinderGeometry(3.2, 3.2, 1.3, 24, 1, true, -Math.PI * 0.45, Math.PI * 0.9),
        boothMat
      );
      bench.material.side = THREE.DoubleSide;
      bench.position.y = 0.85;
      bg.add(bench);

      // Cushioned seat
      const seat = new THREE.Mesh(
        new THREE.CylinderGeometry(3.0, 3.0, 0.28, 24, 1, false, -Math.PI * 0.45, Math.PI * 0.9),
        boothMat
      );
      seat.position.y = 0.45;
      bg.add(seat);

      // Round Mahogany Dining Table
      const table = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.4, 0.08, 24), woodMat);
      table.position.set(0, 0.78, 0.4);
      bg.add(table);

      const tableBase = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.42, 0.74, 12), brassInlayMat);
      tableBase.position.set(0, 0.39, 0.4);
      bg.add(tableBase);

      // Saucers with spherical foods on the table
      const pMat = new THREE.MeshStandardMaterial({ color: 0xfaf6f0, roughness: 0.15 });
      for (let f = 0; f < 4; f++) {
        const fa = (f / 4) * Math.PI * 2;
        const fx = Math.cos(fa) * 0.85;
        const fz = 0.4 + Math.sin(fa) * 0.85;

        const saucer = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.18, 0.03, 16), pMat);
        saucer.position.set(fx, 0.84, fz);
        bg.add(saucer);

        const sphereFood = new THREE.Mesh(
          new THREE.SphereGeometry(0.14, 14, 12),
          new THREE.MeshStandardMaterial({
            color: [0xa83824, 0x10b981, 0xec4899, 0xf59e0b][f],
            roughness: 0.3
          })
        );
        sphereFood.position.set(fx, 0.98, fz);
        bg.add(sphereFood);
      }

      // Cozy tabletop amber candle lamp
      const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.22, 10), brassInlayMat);
      lamp.position.set(0, 0.92, 0.4);
      bg.add(lamp);

      const lampGlow = new THREE.PointLight(0xffb86c, 0.8, 4.5);
      lampGlow.position.set(0, 1.05, 0.4);
      bg.add(lampGlow);

      rotundaGroup.add(bg);
    });

    // 6. HELEN'S CELEBRATION VIP ALCOVE (East Section: x = 5.5, z = -4.0)
    const helenAlcoveGroup = new THREE.Group();
    helenAlcoveGroup.position.set(HELEN_ALCOVE_POS.x, 0, HELEN_ALCOVE_POS.z);

    // Elevated marble circular dais
    const daisMat = new THREE.MeshStandardMaterial({
      color: 0xfdfaf6,
      roughness: 0.22,
      metalness: 0.12
    });
    const dais = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.8, 0.24, 32), daisMat);
    dais.position.y = 0.12;
    dais.receiveShadow = true;
    helenAlcoveGroup.add(dais);

    const daisTrim = new THREE.Mesh(new THREE.TorusGeometry(3.6, 0.05, 8, 32), brassInlayMat);
    daisTrim.rotation.x = Math.PI / 2;
    daisTrim.position.y = 0.24;
    helenAlcoveGroup.add(daisTrim);

    // Helen's Birthday Cake (Placed right on the dais center)
    cakeGroup = createHelensBirthdayCake();
    cakeGroup.position.set(0, 0.24, 0);
    helenAlcoveGroup.add(cakeGroup);

    // Floating Festive Spherical Balloons (Pastel ruby, gold, lilac, mint)
    const balloonColors = [0xf43f5e, 0xfbbf24, 0xa855f7, 0x10b981, 0xec4899, 0x38bdf8];
    balloonMeshes.length = 0;

    balloonColors.forEach((col, idx) => {
      const ba = (idx / balloonColors.length) * Math.PI * 2;
      const bRad = 1.9 + (idx % 2) * 0.45;
      const bx = Math.cos(ba) * bRad;
      const bz = Math.sin(ba) * bRad;
      const by = 2.4 + (idx % 3) * 0.55;

      const bg = new THREE.Group();
      bg.position.set(bx, by, bz);
      bg.userData = { basePos: { x: bx, y: by, z: bz }, seed: idx * 1.3 };

      const bSphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.38, 18, 16),
        new THREE.MeshStandardMaterial({
          color: col,
          roughness: 0.15,
          metalness: 0.08
        })
      );
      bSphere.scale.set(1.0, 1.15, 1.0);
      bg.add(bSphere);

      // Gold ribbon tether down to dais
      const ribbon = new THREE.Mesh(
        new THREE.CylinderGeometry(0.008, 0.008, by - 0.24, 6),
        brassInlayMat
      );
      ribbon.position.y = -(by - 0.24) * 0.5;
      bg.add(ribbon);

      balloonMeshes.push(bg);
      helenAlcoveGroup.add(bg);
    });

    // Ornate Brass Plaque on Dais front: "Helen's Birthday Alcove · Oct 24"
    const plaqueMat = new THREE.MeshStandardMaterial({ color: 0xd8aa5b, roughness: 0.25, metalness: 0.85 });
    const plaque = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.32, 0.06), plaqueMat);
    plaque.position.set(0, 0.36, 3.4);
    helenAlcoveGroup.add(plaque);

    rotundaGroup.add(helenAlcoveGroup);

    // 7. MONSIEUR BETTERAVE (Standing near central greeting area)
    betteraveMesh = createMonsieurBetterave();
    betteraveMesh.position.set(MAITRE_D_POS.x, 0, MAITRE_D_POS.z);
    betteraveMesh.rotation.y = 0.0; // Facing south toward entrance doors
    rotundaGroup.add(betteraveMesh);

    // 8. THE OPEN SHOW KITCHEN (North wall arc: z = -11m)
    const kitchenGroup = new THREE.Group();
    kitchenGroup.position.set(0, 0, -11.5);

    // Curved polished brass and emerald tile service counter
    const counterGeo = new THREE.CylinderGeometry(7.2, 7.2, 1.1, 32, 1, true, Math.PI * 0.2, Math.PI * 0.6);
    const counterMat = new THREE.MeshStandardMaterial({
      color: 0x065f46, // Rich emerald green glazed tile
      roughness: 0.3,
      side: THREE.DoubleSide
    });
    const counter = new THREE.Mesh(counterGeo, counterMat);
    counter.position.y = 0.55;
    kitchenGroup.add(counter);

    // Mahogany counter top surface
    const counterTop = new THREE.Mesh(
      new THREE.CylinderGeometry(7.4, 7.4, 0.1, 32, 1, false, Math.PI * 0.2, Math.PI * 0.6),
      woodMat
    );
    counterTop.position.y = 1.12;
    kitchenGroup.add(counterTop);

    // Steaming Soup Pots & Polished Brass Cloches
    const potMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3, metalness: 0.7 });
    [-2.2, 0, 2.2].forEach((px, i) => {
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.34, 0.45, 18), potMat);
      pot.position.set(px, 1.35, 1.2);
      kitchenGroup.add(pot);

      // Steam Particle Anchor
      kitchenSteamParticles.push({
        basePos: { x: px, y: 1.62, z: -11.5 + 1.2 },
        mesh: new THREE.Mesh(
          new THREE.SphereGeometry(0.12, 8, 8),
          new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 })
        )
      });
      scene.add(kitchenSteamParticles[kitchenSteamParticles.length - 1].mesh);
    });

    // Sous-Chef Birb (Plump little bird with a chef's hat perched on the counter)
    if (window.BlahajModels && typeof window.BlahajModels.createBirb === 'function') {
      sousChefBirbMesh = window.BlahajModels.createBirb(0x60a5fa);
      sousChefBirbMesh.position.set(-1.4, 1.18, 1.4);
      sousChefBirbMesh.rotation.y = Math.PI * 0.75;
      sousChefBirbMesh.scale.set(0.75, 0.75, 0.75);

      // White Chef Toque
      const toqueMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
      const toqueBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.20, 0.08, 12), toqueMat);
      toqueBrim.position.y = 0.52;
      sousChefBirbMesh.add(toqueBrim);
      const toqueTop = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 10), toqueMat);
      toqueTop.scale.set(1.1, 1.3, 1.1);
      toqueTop.position.y = 0.72;
      sousChefBirbMesh.add(toqueTop);

      kitchenGroup.add(sousChefBirbMesh);
    }

    rotundaGroup.add(kitchenGroup);

    // 9. GRAND ENTRANCE & EXIT DOUBLE DOORS (South Wall: z = 13.8m)
    const doorGroup = new THREE.Group();
    doorGroup.position.set(0, 0, 13.6);

    const doorFrameMat = new THREE.MeshStandardMaterial({ color: 0xd8aa5b, roughness: 0.28, metalness: 0.85 });
    const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(3.6, 4.4, 0.25), doorFrameMat);
    doorFrame.position.y = 2.2;
    doorGroup.add(doorFrame);

    // Double Mahogany Doors with circular brass portholes
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x3b1d11, roughness: 0.5 });
    [-0.8, 0.8].forEach((dx) => {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(1.5, 4.1, 0.12), doorMat);
      panel.position.set(dx, 2.15, 0);
      doorGroup.add(panel);

      const porthole = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.06, 12, 24), doorFrameMat);
      porthole.position.set(dx, 2.8, 0.08);
      doorGroup.add(porthole);

      const glass = new THREE.Mesh(
        new THREE.CircleGeometry(0.40, 20),
        new THREE.MeshStandardMaterial({ color: 0xbae6fd, transparent: true, opacity: 0.35, roughness: 0.1 })
      );
      glass.position.set(dx, 2.8, 0.08);
      doorGroup.add(glass);

      // Brass push handles
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.85, 10), doorFrameMat);
      handle.position.set(dx + (dx > 0 ? -0.45 : 0.45), 2.1, 0.12);
      doorGroup.add(handle);
    });

    // Illuminated Exit Plaque above doors
    const exitSign = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.45, 0.1),
      new THREE.MeshBasicMaterial({ color: 0xdcfce7 })
    );
    exitSign.position.set(0, 4.65, 0);
    doorGroup.add(exitSign);

    const exitLight = new THREE.PointLight(0x86efac, 1.2, 8.5);
    exitLight.position.set(0, 4.65, 0.4);
    doorGroup.add(exitLight);

    rotundaGroup.add(doorGroup);

    // 10. Warm Ambient Room Lighting
    const ambientLight = new THREE.AmbientLight(0xffecd1, 0.85);
    scene.add(ambientLight);

    // Warm perimeter wall sconces
    for (let s = 0; s < 8; s++) {
      const sa = (s / 8) * Math.PI * 2;
      const sconceLight = new THREE.PointLight(0xffc278, 0.95, 12, 1.4);
      sconceLight.position.set(Math.cos(sa) * 13.2, 3.6, Math.sin(sa) * 13.2);
      scene.add(sconceLight);
    }

    scene.add(rotundaGroup);
    built = true;
    return Promise.resolve();
  }

  // Animation & Update Loop inside Spherical Foods Bistro
  function update(dt, elapsed, playerPos, playerMesh) {
    if (!active || !built) return;

    // 1. Chandelier subtle gentle sway
    if (chandelierGroup) {
      chandelierGroup.rotation.y = elapsed * 0.05;
      if (chandelierLight) {
        chandelierLight.intensity = 2.5 + Math.sin(elapsed * 3.5) * 0.12;
      }
    }

    // 2. Helen's Birthday Cake Candle Flame Flicker
    if (candleFlameMesh && candleLight) {
      const flicker = Math.sin(elapsed * 18.0) * 0.08 + Math.cos(elapsed * 31.0) * 0.05;
      candleFlameMesh.scale.set(1.0 + flicker, 1.0 + flicker * 1.5, 1.0 + flicker);
      candleFlameMesh.position.y = 3.08 + flicker * 0.02;
      candleLight.intensity = 1.8 + flicker * 2.2;
    }

    // 3. Floating Birthday Balloons gentle bobbing
    balloonMeshes.forEach((bg) => {
      const s = bg.userData.seed || 0;
      const bob = Math.sin(elapsed * 1.8 + s) * 0.08;
      const sway = Math.cos(elapsed * 1.2 + s) * 0.05;
      bg.position.y = bg.userData.basePos.y + bob;
      bg.position.x = bg.userData.basePos.x + sway;
    });

    // 4. Monsieur Betterave gentle breathing & idle nod
    if (betteraveMesh) {
      betteraveMesh.position.y = Math.sin(elapsed * 2.2) * 0.025;
      betteraveMesh.rotation.z = Math.sin(elapsed * 1.5) * 0.02;
    }

    // 5. Sous-Chef Birb curious head-bob
    if (sousChefBirbMesh) {
      sousChefBirbMesh.rotation.y = Math.PI * 0.75 + Math.sin(elapsed * 2.8) * 0.18;
      sousChefBirbMesh.position.y = 1.18 + Math.abs(Math.sin(elapsed * 4.2)) * 0.04;
    }

    // 6. Open Kitchen Steam Particles rising
    kitchenSteamParticles.forEach((sp, idx) => {
      const t = (elapsed * 1.4 + idx * 0.8) % 1.6;
      sp.mesh.position.set(
        sp.basePos.x + Math.sin(elapsed * 2.5 + idx) * 0.08,
        sp.basePos.y + t * 0.9,
        sp.basePos.z + Math.cos(elapsed * 2.5 + idx) * 0.08
      );
      sp.mesh.scale.setScalar(0.7 + t * 0.8);
      sp.mesh.material.opacity = Math.max(0, 0.45 * (1.0 - t / 1.6));
    });
  }

  // Collision Floor Height inside the Bistro
  function getFloorHeight(x, z, playerY) {
    if (!built) return 0.0;
    const dCenter = Math.hypot(x, z);

    // Exterior room boundary wall (Radius 13.8m)
    if (dCenter > 13.8) {
      // Near south exit doors
      if (Math.abs(x) < 1.8 && z >= 12.0) {
        return 0.0; // Allowed to step into the exit threshold
      }
    }

    // Helen's Birthday Dais (x = 5.5, z = -4.0, radius = 3.6m)
    const dDais = Math.hypot(x - HELEN_ALCOVE_POS.x, z - HELEN_ALCOVE_POS.z);
    if (dDais <= 3.6) {
      if (dDais <= 1.4) {
        return 0.24 + 1.15; // On top of the cake pedestal stand table
      }
      return 0.24; // On the elevated dais platform
    }

    // Kitchen Counter (North: z <= -9.5, radius between 6.5 and 7.8)
    if (z <= -9.0 && dCenter >= 6.0 && dCenter <= 8.0) {
      return 1.15; // On top of the kitchen counter
    }

    // Main Terrazzo Dining Floor
    return 0.0;
  }

  // Interactables inside the Bistro Instance
  function getInteractables(playerPos) {
    if (!active || !built) return [];
    const out = [];

    // 1. South Exit Double Doors
    const dExit = Math.hypot(playerPos.x - EXIT_POS.x, playerPos.z - EXIT_POS.z);
    if (dExit < 3.2) {
      out.push({
        kind: 'spherical_exit',
        dist: dExit,
        prompt: 'Exit to Southwest Bluff [E] 🚪'
      });
    }

    // 2. Helen's Birthday Cake (East VIP Alcove)
    const dCake = Math.hypot(playerPos.x - HELEN_ALCOVE_POS.x, playerPos.z - HELEN_ALCOVE_POS.z);
    if (dCake < 3.6) {
      const isWeek = isHelensBirthdayWeek();
      out.push({
        kind: 'helen_birthday_cake',
        dist: dCake,
        prompt: isWeek
          ? "Inspect Helen's Celestial Birthday Bombe [E] ✨🎂"
          : "Helen's Celestial Birthday Cake (Oct 24 Only) [E] 🎂"
      });
    }

    // 3. Monsieur Betterave (Central Maitre D')
    const dMaitreD = Math.hypot(playerPos.x - MAITRE_D_POS.x, playerPos.z - MAITRE_D_POS.z);
    if (dMaitreD < 3.5) {
      out.push({
        kind: 'monsieur_betterave',
        dist: dMaitreD,
        prompt: 'Talk to Monsieur Betterave · Spherical Menu [E] 🧆'
      });
    }

    // 4. Velvet Booth Seating
    const boothAngles = [Math.PI * 0.65, Math.PI * 0.90, Math.PI * 1.35, Math.PI * 1.60];
    for (let i = 0; i < boothAngles.length; i++) {
      const ba = boothAngles[i];
      const bx = Math.cos(ba) * 9.8;
      const bz = Math.sin(ba) * 9.8;
      const dBooth = Math.hypot(playerPos.x - bx, playerPos.z - bz);
      if (dBooth < 2.6) {
        out.push({
          kind: 'booth_seat',
          dist: dBooth,
          prompt: 'Relax in Velvet Round Booth [E] 🛋️',
          boothIndex: i
        });
        break;
      }
    }

    return out;
  }

  return {
    build,
    setActive: (v) => { active = v; },
    isActive: () => active,
    getScene: () => scene,
    getStart: () => START_POS,
    getFloorHeight,
    getCeilingY: () => 7.5,
    getInteractables,
    update,
    isHelensBirthdayWeek,
    getHelensCakeMesh: () => cakeGroup
  };
})();
