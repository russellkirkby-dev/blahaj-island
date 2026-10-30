// ============================================================================
// BLAHAJ ISLAND - THE IKEA SPAWNING PITS OF ERF (3D WALKABLE STEALTH DUNGEON)
// Pass 74: First-Time Origin Escape & Repeatable Nighttime Flat-Pack Heist
// ============================================================================
// Lore Context ("The Law"):
//   Every Blåhaj originates in the Spawning Pits—giant wire display bins inside
//   a vast blue-and-yellow Swedish furniture megastore on Erf (Art. 303.735.88).
//   After the Rite of Detagging by the Order of the Sacred Scissors, newly named
//   sharks sneak out of the Wire Spawning Bin after closing time, follow the
//   glowing yellow floor arrows past patrolling Night-Shift Security Spotlights,
//   gather their first SKÄRHAJ Flat-Pack Kits in Self-Serve Warehouse Aisle 14,
//   grab Midnight Köttbullar at the Bistro, and step through Hermes's shimmering
//   Between Portal to arrive on Blåhaj Island!
// ============================================================================

(function () {
  let spScene = null;
  let isBuilt = false;
  let isActive = false;

  // Room dimensions: 32m wide (X: -16 to +16) x 62m long (Z: -35 to +27), Ceiling: 8.4m
  const ROOM_HALF_W = 16.0;
  const ROOM_MIN_Z = -35.0;
  const ROOM_MAX_Z = 27.0;
  const CEILING_Y = 8.4;

  // Spawn inside the Great Wire Spawning Bin #7 (with open front step)
  const START_POS = { x: 0.0, y: 0.35, z: 22.0, rotY: Math.PI };

  // Solid obstacle boxes for collision & elevated surfaces
  // { minX, maxX, minZ, maxZ, topY, solid }
  const colliders = [];

  // Interactive 3D Flat-Pack Kit crates on warehouse pallets
  const flatpackPickups = [];

  // Patrolling Night-Shift Security Spotlight Drones
  const securitySpotlights = [];
  let spotlightAlertCooldown = 0;
  let onSecuritySpottedCallback = null;
  let onAutoPortalExitCallback = null;

  // Animated meshes
  let portalRingOuter = null;
  let portalRingInner = null;
  let portalVortexMesh = null;
  let hermesGuideMesh = null;
  let sacredScissorsMesh = null;
  const floatingBanners = [];
  const floorArrows = [];
  const bistroSteamParticles = [];

  function addCollider(minX, maxX, minZ, maxZ, topY, solid = true) {
    colliders.push({ minX, maxX, minZ, maxZ, topY, solid });
  }

  function makeSignTexture(title, subtitle, bgHex = '#0058a3', fgHex = '#ffda1a', borderHex = '#ffda1a') {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = bgHex;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = borderHex;
    ctx.lineWidth = 14;
    ctx.strokeRect(12, 12, canvas.width - 24, canvas.height - 24);

    ctx.fillStyle = fgHex;
    ctx.font = '900 64px "Nunito", "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, canvas.width / 2, subtitle ? 98 : 128);

    if (subtitle) {
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 36px "Nunito", "Segoe UI", sans-serif';
      ctx.fillText(subtitle, canvas.width / 2, 182);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }

  function makePriceTagTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 768;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 512, 768);

    // Red top header bar
    ctx.fillStyle = '#e11d48';
    ctx.fillRect(0, 0, 512, 110);
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SPAWNING BIN #7', 256, 70);

    // Product title
    ctx.fillStyle = '#0f172a';
    ctx.font = '900 72px sans-serif';
    ctx.fillText('BLÅHAJ', 256, 220);

    ctx.fillStyle = '#334155';
    ctx.font = '700 32px sans-serif';
    ctx.fillText('Soft toy, shark, 100 cm (39 ¼")', 256, 280);

    // Yellow price box
    ctx.fillStyle = '#ffda1a';
    ctx.fillRect(46, 330, 420, 150);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 6;
    ctx.strokeRect(46, 330, 420, 150);

    ctx.fillStyle = '#0f172a';
    ctx.font = '900 86px sans-serif';
    ctx.fillText('$29.99', 256, 432);

    // Article number & barcode
    ctx.fillStyle = '#0058a3';
    ctx.font = '900 36px monospace';
    ctx.fillText('ART. 303.735.88', 256, 550);

    // Barcode stripes
    ctx.fillStyle = '#0f172a';
    for (let x = 70; x < 440; x += 12) {
      const w = (x % 24 === 0) ? 7 : 3;
      ctx.fillRect(x, 585, w, 95);
    }

    ctx.font = '700 24px sans-serif';
    ctx.fillStyle = '#475569';
    ctx.fillText('SNIP TAG TO AWAKEN TRUE NAME ✂️', 256, 725);

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }

  function createMiniPlushShark(colorHex, bellyHex = 0xf8fafc, scale = 0.65) {
    const g = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.75 });
    const bellyMat = new THREE.MeshStandardMaterial({ color: bellyHex, roughness: 0.85 });
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3 });

    const torso = new THREE.Mesh(new THREE.SphereGeometry(0.45, 14, 12), bodyMat);
    torso.scale.set(0.85, 0.72, 1.65);
    g.add(torso);

    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.41, 12, 10), bellyMat);
    belly.scale.set(0.78, 0.55, 1.52);
    belly.position.set(0, -0.08, 0.04);
    g.add(belly);

    const dorsal = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.42, 6), bodyMat);
    dorsal.position.set(0, 0.38, -0.05);
    dorsal.rotation.x = -0.25;
    g.add(dorsal);

    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.48, 6), bodyMat);
    tail.position.set(0, 0.08, -0.78);
    tail.rotation.x = Math.PI * 0.4;
    g.add(tail);

    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), eyeMat);
    eyeL.position.set(0.26, 0.08, 0.48);
    const eyeR = eyeL.clone();
    eyeR.position.x = -0.26;
    g.add(eyeL, eyeR);

    g.scale.setScalar(scale);
    return g;
  }

  function buildWireSpawningBin(centerX, centerZ, isMainSpawnBin = true) {
    const binGroup = new THREE.Group();
    binGroup.position.set(centerX, 0, centerZ);

    const wireMat = new THREE.MeshStandardMaterial({
      color: 0xdbeafe,
      metalness: 0.75,
      roughness: 0.25
    });
    const postMat = new THREE.MeshStandardMaterial({
      color: 0x0058a3,
      metalness: 0.4,
      roughness: 0.45
    });
    const yellowRimMat = new THREE.MeshStandardMaterial({
      color: 0xffda1a,
      roughness: 0.35,
      emissive: 0xffda1a,
      emissiveIntensity: 0.18
    });

    const binW = 4.6;
    const binD = 4.6;
    const binH = 2.1;
    const halfW = binW / 2;
    const halfD = binD / 2;

    // Cushion base platform inside bin
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.8 });
    const baseMesh = new THREE.Mesh(new THREE.BoxGeometry(binW - 0.1, 0.28, binD - 0.1), baseMat);
    baseMesh.position.y = 0.14;
    binGroup.add(baseMesh);
    addCollider(centerX - halfW, centerX + halfW, centerZ - halfD, centerZ + halfD, 0.28, false);

    // 4 Corner steel posts
    const corners = [
      [-halfW, -halfD],
      [halfW, -halfD],
      [-halfW, halfD],
      [halfW, halfD]
    ];
    corners.forEach(([cx, cz]) => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.18, binH + 0.3, 0.18), postMat);
      post.position.set(cx, (binH + 0.3) / 2, cz);
      binGroup.add(post);
    });

    // Wire mesh bars on Back (+Z), Left (-X), Right (+X), and partial Front (-Z)
    // If main spawn bin, leave a 2.2m gap in front (-Z) with a cozy plush step-ramp so the player can walk right out!
    for (let h = 0.35; h <= binH; h += 0.35) {
      // Back (+Z)
      const barBack = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, binW, 8), wireMat);
      barBack.rotation.z = Math.PI / 2;
      barBack.position.set(0, h, halfD);
      binGroup.add(barBack);

      // Left (-X) & Right (+X)
      [-halfW, halfW].forEach((xPos) => {
        const barSide = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, binD, 8), wireMat);
        barSide.rotation.x = Math.PI / 2;
        barSide.position.set(xPos, h, 0);
        binGroup.add(barSide);
      });

      // Front (-Z): either full or split for the escape gap
      if (!isMainSpawnBin || h > 1.75) {
        const barFront = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, binW, 8), wireMat);
        barFront.rotation.z = Math.PI / 2;
        barFront.position.set(0, h, -halfD);
        binGroup.add(barFront);
      } else {
        const segLen = (binW - 2.2) / 2;
        [-halfW + segLen / 2, halfW - segLen / 2].forEach((xSeg) => {
          const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, segLen, 8), wireMat);
          seg.rotation.z = Math.PI / 2;
          seg.position.set(xSeg, h, -halfD);
          binGroup.add(seg);
        });
      }
    }

    // Yellow top rim banner
    const rimSign = new THREE.Mesh(
      new THREE.BoxGeometry(binW + 0.1, 0.28, 0.12),
      yellowRimMat
    );
    rimSign.position.set(0, binH + 0.2, -halfD);
    binGroup.add(rimSign);

    // Giant hanging IKEA Price Tag on side of bin
    const tagTex = makePriceTagTexture();
    const tagMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1.35, 2.0),
      new THREE.MeshBasicMaterial({ map: tagTex, side: THREE.DoubleSide })
    );
    tagMesh.position.set(halfW + 0.08, 1.45, -0.8);
    tagMesh.rotation.y = Math.PI / 2;
    binGroup.add(tagMesh);

    // Fill bin perimeter with adorable sleeping/snuggling plush sharks!
    const plushPalette = [0x3b82f6, 0x2563eb, 0x60a5fa, 0xf472b6, 0xa855f7, 0x38bdf8];
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      // Leave front escape channel clear in main bin
      if (isMainSpawnBin && Math.sin(angle) < -0.55) continue;
      const r = isMainSpawnBin ? (1.35 + (i % 2) * 0.45) : (0.5 + (i % 3) * 0.55);
      const sx = Math.cos(angle) * r;
      const sz = Math.sin(angle) * r;
      const shonk = createMiniPlushShark(plushPalette[i % plushPalette.length], 0xf8fafc, 0.62 + (i % 3) * 0.08);
      shonk.position.set(sx, 0.42 + (i % 3) * 0.22, sz);
      shonk.rotation.set((i % 2) * 0.25 - 0.12, angle + Math.PI * 0.5, ((i + 1) % 3 - 1) * 0.2);
      binGroup.add(shonk);
    }

    // Wall colliders for Back, Left, and Right of the Wire Bin
    addCollider(centerX - halfW - 0.15, centerX + halfW + 0.15, centerZ + halfD - 0.15, centerZ + halfD + 0.15, binH, true);
    addCollider(centerX - halfW - 0.15, centerX - halfW + 0.15, centerZ - halfD, centerZ + halfD, binH, true);
    addCollider(centerX + halfW - 0.15, centerX + halfW + 0.15, centerZ - halfD, centerZ + halfD, binH, true);
    if (!isMainSpawnBin) {
      addCollider(centerX - halfW - 0.15, centerX + halfW + 0.15, centerZ - halfD - 0.15, centerZ - halfD + 0.15, binH, true);
    }

    spScene.add(binGroup);
  }

  function buildSacredScissorsPillowFort() {
    // Secret Candlelit Pillow-Fort Altar at (-8.8, 0, 21.5) inspired by Names.png
    const fort = new THREE.Group();
    fort.position.set(-8.8, 0, 21.5);

    const rugMat = new THREE.MeshStandardMaterial({ color: 0x311042, roughness: 0.9 });
    const rug = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 0.06, 24), rugMat);
    rug.position.y = 0.03;
    fort.add(rug);

    // Velvet altar pedestal
    const altarBase = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.95, 1.2),
      new THREE.MeshStandardMaterial({ color: 0x1e1b4b, roughness: 0.6 })
    );
    altarBase.position.y = 0.48;
    fort.add(altarBase);
    addCollider(-8.8 - 0.95, -8.8 + 0.95, 21.5 - 0.65, 21.5 + 0.65, 0.95, true);

    // Gold runner cloth
    const cloth = new THREE.Mesh(
      new THREE.BoxGeometry(1.86, 0.12, 1.26),
      new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.4, metalness: 0.3 })
    );
    cloth.position.y = 0.96;
    fort.add(cloth);

    // The Book of Newly Named Sharks resting open on the altar
    const bookGroup = new THREE.Group();
    bookGroup.position.set(-0.32, 1.06, 0);
    const pageMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.7 });
    const pageL = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.05, 0.52), pageMat);
    pageL.position.x = -0.18;
    pageL.rotation.z = 0.12;
    const pageR = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.05, 0.52), pageMat);
    pageR.position.x = 0.18;
    pageR.rotation.z = -0.12;
    bookGroup.add(pageL, pageR);
    fort.add(bookGroup);

    // Floating Golden Sacred Scissors above the altar
    sacredScissorsMesh = new THREE.Group();
    sacredScissorsMesh.position.set(0.35, 1.48, 0);
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xffd166,
      metalness: 0.85,
      roughness: 0.2,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.35
    });
    const blade1 = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.55, 6), goldMat);
    blade1.rotation.z = 0.28;
    const blade2 = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.55, 6), goldMat);
    blade2.rotation.z = -0.28;
    const ring1 = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.028, 8, 16), goldMat);
    ring1.position.set(-0.12, -0.26, 0);
    const ring2 = ring1.clone();
    ring2.position.set(0.12, -0.26, 0);
    sacredScissorsMesh.add(blade1, blade2, ring1, ring2);
    fort.add(sacredScissorsMesh);

    // Warm candle point light
    const altarLight = new THREE.PointLight(0xffb703, 1.35, 9.0);
    altarLight.position.set(0, 2.1, 0);
    fort.add(altarLight);

    // Overhead banner
    const signTex = makeSignTexture('ALTAR OF THE SACRED SCISSORS', 'SNIP TAG [E] · BOOK OF NEWLY NAMED SHARKS', '#3b0764', '#fde047', '#fde047');
    const signMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(3.8, 0.95),
      new THREE.MeshBasicMaterial({ map: signTex, side: THREE.DoubleSide })
    );
    signMesh.position.set(0, 2.75, 0);
    fort.add(signMesh);

    spScene.add(fort);
  }

  function buildShowroomLabyrinth() {
    // Glowing Yellow Winding Floor Arrows from Z=+18 down to Z=-28
    const arrowWaypoints = [
      { x: 0.0, z: 18.0, rotY: Math.PI },
      { x: -3.2, z: 13.5, rotY: Math.PI + 0.35 },
      { x: -4.2, z: 8.5, rotY: Math.PI - 0.25 },
      { x: 2.5, z: 4.0, rotY: Math.PI - 0.4 },
      { x: 3.5, z: -1.0, rotY: Math.PI + 0.3 },
      { x: 0.0, z: -6.5, rotY: Math.PI },
      { x: 0.0, z: -13.0, rotY: Math.PI },
      { x: 0.0, z: -19.5, rotY: Math.PI },
      { x: 0.0, z: -25.5, rotY: Math.PI }
    ];

    const arrowMat = new THREE.MeshBasicMaterial({
      color: 0xffda1a,
      side: THREE.DoubleSide
    });

    arrowWaypoints.forEach((wp) => {
      const arrowGroup = new THREE.Group();
      arrowGroup.position.set(wp.x, 0.03, wp.z);
      arrowGroup.rotation.y = wp.rotY;

      const shaft = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 1.4), arrowMat);
      shaft.rotation.x = -Math.PI / 2;
      arrowGroup.add(shaft);

      const headGeo = new THREE.ConeGeometry(0.65, 0.85, 3);
      const head = new THREE.Mesh(headGeo, arrowMat);
      head.rotation.x = Math.PI / 2;
      head.position.set(0, 0.01, 0.95);
      arrowGroup.add(head);

      spScene.add(arrowGroup);
      floorArrows.push(arrowGroup);
    });

    // Showroom KALLAX Divider Cover Shelves (Provide physical cover between spotlights)
    const kallaxPositions = [
      { x: -5.5, z: 11.0, w: 3.6, d: 0.9, h: 2.4 },
      { x: 5.2, z: 9.0, w: 3.6, d: 0.9, h: 2.4 },
      { x: -1.8, z: 5.5, w: 3.4, d: 0.9, h: 2.4 },
      { x: 5.8, z: 1.5, w: 3.6, d: 0.9, h: 2.4 }
    ];

    const birchMat = new THREE.MeshStandardMaterial({ color: 0xf3e5ab, roughness: 0.65 });
    const blueBoxMat = new THREE.MeshStandardMaterial({ color: 0x0058a3, roughness: 0.5 });

    kallaxPositions.forEach((kp) => {
      const shelf = new THREE.Mesh(new THREE.BoxGeometry(kp.w, kp.h, kp.d), birchMat);
      shelf.position.set(kp.x, kp.h / 2, kp.z);
      spScene.add(shelf);

      // Decorative storage inserts
      const insert = new THREE.Mesh(new THREE.BoxGeometry(kp.w * 0.85, kp.h * 0.35, kp.d + 0.06), blueBoxMat);
      insert.position.set(kp.x, kp.h * 0.3, kp.z);
      spScene.add(insert);

      addCollider(kp.x - kp.w / 2, kp.x + kp.w / 2, kp.z - kp.d / 2, kp.z + kp.d / 2, kp.h, true);
    });

    // Ingvar's Brass Measuring Tape Worktable at (-10.5, 0, 7.5)
    const tapeTable = new THREE.Group();
    tapeTable.position.set(-10.5, 0, 7.5);
    const desk = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.9, 1.4), birchMat);
    desk.position.y = 0.45;
    tapeTable.add(desk);
    addCollider(-10.5 - 1.2, -10.5 + 1.2, 7.5 - 0.7, 7.5 + 0.7, 0.9, true);

    const tapeReel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.35, 0.22, 18),
      new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.7, roughness: 0.25, emissive: 0xf59e0b, emissiveIntensity: 0.3 })
    );
    tapeReel.position.set(0, 1.05, 0);
    tapeTable.add(tapeReel);

    const tapeSign = new THREE.Mesh(
      new THREE.PlaneGeometry(2.8, 0.7),
      new THREE.MeshBasicMaterial({
        map: makeSignTexture("INGVAR'S MEASURING STATION", 'COLLECT TAPE & FLAT-PACK [E] 📏', '#0058a3', '#ffda1a'),
        side: THREE.DoubleSide
      })
    );
    tapeSign.position.set(0, 2.1, 0);
    tapeTable.add(tapeSign);
    spScene.add(tapeTable);

    // 2 Patrolling Night-Shift Security Spotlight Cones in the Showroom
    const guardConfigs = [
      { id: 'drone_north', baseX: -2.5, baseZ: 10.5, sweepX: 6.5, sweepZ: 2.2, speed: 1.15, phase: 0.0 },
      { id: 'drone_south', baseX: 2.0, baseZ: 2.5, sweepX: 6.8, sweepZ: 2.0, speed: 1.35, phase: 2.4 }
    ];

    guardConfigs.forEach((cfg) => {
      const droneGroup = new THREE.Group();
      droneGroup.position.set(cfg.baseX, 5.6, cfg.baseZ);

      const hull = new THREE.Mesh(
        new THREE.CylinderGeometry(0.45, 0.55, 0.35, 12),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.25 })
      );
      droneGroup.add(hull);

      const beacon = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 12, 12),
        new THREE.MeshBasicMaterial({ color: 0xef4444 })
      );
      beacon.position.y = -0.2;
      droneGroup.add(beacon);

      // Translucent sweeping spotlight cone reaching the floor
      const coneGeo = new THREE.ConeGeometry(2.25, 5.6, 20, 1, true);
      const coneMat = new THREE.MeshBasicMaterial({
        color: 0xfef08a,
        transparent: true,
        opacity: 0.16,
        side: THREE.DoubleSide,
        depthWrite: false
      });
      const coneMesh = new THREE.Mesh(coneGeo, coneMat);
      coneMesh.position.y = -2.8;
      droneGroup.add(coneMesh);

      // Floor warning ring at Y=0.04
      const ringGeo = new THREE.RingGeometry(1.95, 2.25, 28);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xef4444,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.65
      });
      const floorRing = new THREE.Mesh(ringGeo, ringMat);
      floorRing.rotation.x = -Math.PI / 2;
      floorRing.position.set(cfg.baseX, 0.04, cfg.baseZ);
      spScene.add(floorRing);

      spScene.add(droneGroup);
      securitySpotlights.push({
        ...cfg,
        droneGroup,
        floorRing,
        coneMat,
        curX: cfg.baseX,
        curZ: cfg.baseZ,
        radius: 2.15
      });
    });
  }

  function buildSelfServeWarehouseAisle14() {
    // Towering 7.4m orange-and-blue steel pallet racks from Z = -4 to Z = -22
    const orangeSteel = new THREE.MeshStandardMaterial({ color: 0xea580c, metalness: 0.55, roughness: 0.4 });
    const blueSteel = new THREE.MeshStandardMaterial({ color: 0x0058a3, metalness: 0.55, roughness: 0.4 });
    const cardboardMat = new THREE.MeshStandardMaterial({ color: 0xd6b384, roughness: 0.8 });
    const labelMat = new THREE.MeshBasicMaterial({ color: 0xffda1a });

    const rackColumnsX = [-12.0, -5.2, 5.2, 12.0];
    const rackZSegments = [-7.5, -13.0, -18.5];

    rackColumnsX.forEach((rx) => {
      rackZSegments.forEach((rz) => {
        const rack = new THREE.Group();
        rack.position.set(rx, 0, rz);

        const rackW = 2.2;
        const rackD = 4.4;
        const rackH = 7.2;

        // 4 upright blue steel columns
        [[-rackW / 2, -rackD / 2], [rackW / 2, -rackD / 2], [-rackW / 2, rackD / 2], [rackW / 2, rackD / 2]].forEach(([ux, uz]) => {
          const col = new THREE.Mesh(new THREE.BoxGeometry(0.16, rackH, 0.16), blueSteel);
          col.position.set(ux, rackH / 2, uz);
          rack.add(col);
        });

        // 3 horizontal orange shelf beams stocked with cardboard flat-packs
        [1.8, 3.8, 5.8].forEach((beamY) => {
          const beam = new THREE.Mesh(new THREE.BoxGeometry(rackW + 0.06, 0.18, rackD + 0.06), orangeSteel);
          beam.position.y = beamY;
          rack.add(beam);

          const stack = new THREE.Mesh(new THREE.BoxGeometry(rackW - 0.25, 0.95, rackD - 0.4), cardboardMat);
          stack.position.y = beamY + 0.56;
          rack.add(stack);

          const stripe = new THREE.Mesh(new THREE.BoxGeometry(rackW - 0.2, 0.18, rackD - 0.36), labelMat);
          stripe.position.y = beamY + 0.56;
          rack.add(stripe);
        });

        spScene.add(rack);
        addCollider(rx - rackW / 2, rx + rackW / 2, rz - rackD / 2, rz + rackD / 2, rackH, true);
      });
    });

    // Overhead Aisle 14 Banner
    const aisleSignTex = makeSignTexture(
      'SELF-SERVE WAREHOUSE · AISLE 14 · BAY 22',
      'COLLECT GLOWING SKÄRHAJ FLAT-PACK KITS [E] 📦🔧',
      '#0058a3',
      '#ffda1a',
      '#ffda1a'
    );
    const aisleBanner = new THREE.Mesh(
      new THREE.PlaneGeometry(9.5, 2.1),
      new THREE.MeshBasicMaterial({ map: aisleSignTex, side: THREE.DoubleSide })
    );
    aisleBanner.position.set(0, 5.8, -5.0);
    spScene.add(aisleBanner);
    floatingBanners.push(aisleBanner);

    // 4 Interactive 3D SKÄRHAJ Flat-Pack Kit Pickups on low pallets
    const pickupSpots = [
      { id: 'fp_aisle_1', name: 'GOLVHAJ & VÄGGHAJ Starter Flat-Pack', x: -2.4, z: -7.5 },
      { id: 'fp_aisle_2', name: 'KALLAX-HAJ & POÄNG Modular Flat-Pack', x: 2.4, z: -11.0 },
      { id: 'fp_aisle_3', name: 'TAKHAJ Roof & DÖRRHAJ Arch Flat-Pack', x: -2.4, z: -15.0 },
      { id: 'fp_aisle_4', name: 'GROTTHAJ Sea-Cave & MALM Flat-Pack', x: 2.4, z: -18.5 }
    ];

    pickupSpots.forEach((spot) => {
      const pGroup = new THREE.Group();
      pGroup.position.set(spot.x, 0, spot.z);

      // Wooden pallet base
      const pallet = new THREE.Mesh(
        new THREE.BoxGeometry(1.6, 0.18, 1.6),
        new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.85 })
      );
      pallet.position.y = 0.09;
      pGroup.add(pallet);

      // Glowing Flat-Pack Crate mesh (floats & spins gently when available)
      const crateGroup = new THREE.Group();
      crateGroup.position.set(0, 0.55, 0);

      const box = new THREE.Mesh(
        new THREE.BoxGeometry(1.25, 0.42, 0.95),
        new THREE.MeshStandardMaterial({
          color: 0xeab308,
          roughness: 0.45,
          emissive: 0xca8a04,
          emissiveIntensity: 0.35
        })
      );
      crateGroup.add(box);

      const blueBand = new THREE.Mesh(
        new THREE.BoxGeometry(1.27, 0.44, 0.32),
        new THREE.MeshStandardMaterial({
          color: 0x0058a3,
          emissive: 0x1d4ed8,
          emissiveIntensity: 0.4
        })
      );
      crateGroup.add(blueBand);

      pGroup.add(crateGroup);
      spScene.add(pGroup);

      flatpackPickups.push({
        id: spot.id,
        name: spot.name,
        x: spot.x,
        z: spot.z,
        crateGroup,
        cooldown: 0
      });
    });
  }

  function buildMidnightBistroAndEscapePortal() {
    // 1. Midnight Swedish Bistro Counter at (8.8, 0, -25.5)
    const bistro = new THREE.Group();
    bistro.position.set(8.8, 0, -25.5);

    const counter = new THREE.Mesh(
      new THREE.BoxGeometry(4.6, 1.15, 1.8),
      new THREE.MeshStandardMaterial({ color: 0x0058a3, roughness: 0.45 })
    );
    counter.position.y = 0.58;
    bistro.add(counter);

    const counterTop = new THREE.Mesh(
      new THREE.BoxGeometry(4.8, 0.12, 2.0),
      new THREE.MeshStandardMaterial({ color: 0xffda1a, roughness: 0.3 })
    );
    counterTop.position.y = 1.18;
    bistro.add(counterTop);
    addCollider(8.8 - 2.4, 8.8 + 2.4, -25.5 - 1.0, -25.5 + 1.0, 1.2, true);

    // Platter of Köttbullar meatballs
    const tray = new THREE.Mesh(
      new THREE.CylinderGeometry(0.65, 0.6, 0.1, 18),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.6, roughness: 0.25 })
    );
    tray.position.set(0, 1.28, 0);
    bistro.add(tray);

    const meatballMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.6 });
    for (let i = 0; i < 7; i++) {
      const angle = (i / 7) * Math.PI * 2;
      const mb = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 10), meatballMat);
      mb.position.set(Math.cos(angle) * 0.28, 1.38, Math.sin(angle) * 0.28);
      bistro.add(mb);
    }

    const bistroSign = new THREE.Mesh(
      new THREE.PlaneGeometry(4.4, 1.1),
      new THREE.MeshBasicMaterial({
        map: makeSignTexture('MIDNIGHT SWEDISH BISTRO', 'HOT KÖTTBULLAR & LINGONBERRY [E] 🧆', '#0058a3', '#ffda1a'),
        side: THREE.DoubleSide
      })
    );
    bistroSign.position.set(0, 2.8, 0);
    bistro.add(bistroSign);

    const bistroLight = new THREE.PointLight(0xffda1a, 1.2, 10.0);
    bistroLight.position.set(0, 2.5, 0);
    bistro.add(bistroLight);

    spScene.add(bistro);

    // 2. Hermes's Shimmering Cross-Ocean Between Portal to Blåhaj Island at (0, 0, -30.5)
    const portalGroup = new THREE.Group();
    portalGroup.position.set(0, 0, -30.5);

    const plinth = new THREE.Mesh(
      new THREE.CylinderGeometry(3.4, 3.8, 0.36, 28),
      new THREE.MeshStandardMaterial({ color: 0x1e1b4b, metalness: 0.4, roughness: 0.4 })
    );
    plinth.position.y = 0.18;
    portalGroup.add(plinth);
    addCollider(-3.4, 3.4, -30.5 - 3.4, -30.5 + 3.4, 0.36, false);

    portalRingOuter = new THREE.Mesh(
      new THREE.TorusGeometry(2.45, 0.22, 16, 40),
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 0.85,
        metalness: 0.6,
        roughness: 0.2
      })
    );
    portalRingOuter.position.y = 2.75;
    portalGroup.add(portalRingOuter);

    portalRingInner = new THREE.Mesh(
      new THREE.TorusGeometry(2.05, 0.12, 14, 36),
      new THREE.MeshStandardMaterial({
        color: 0xc084fc,
        emissive: 0x9333ea,
        emissiveIntensity: 0.9
      })
    );
    portalRingInner.position.y = 2.75;
    portalGroup.add(portalRingInner);

    portalVortexMesh = new THREE.Mesh(
      new THREE.CircleGeometry(1.98, 32),
      new THREE.MeshBasicMaterial({
        color: 0x67e8f9,
        transparent: true,
        opacity: 0.55,
        side: THREE.DoubleSide
      })
    );
    portalVortexMesh.position.y = 2.75;
    portalGroup.add(portalVortexMesh);

    const portalBanner = new THREE.Mesh(
      new THREE.PlaneGeometry(6.8, 1.5),
      new THREE.MeshBasicMaterial({
        map: makeSignTexture(
          'HERMES BETWEEN PORTAL → BLÅHAJ ISLAND',
          'STEP THROUGH OR PRESS [E] WITH YOUR FLAT-PACK KITS! 🌀🦈',
          '#1e1b4b',
          '#67e8f9',
          '#c084fc'
        ),
        side: THREE.DoubleSide
      })
    );
    portalBanner.position.set(0, 5.85, 0);
    portalGroup.add(portalBanner);

    const portalLight = new THREE.PointLight(0x38bdf8, 2.2, 18.0);
    portalLight.position.set(0, 3.0, 1.5);
    portalGroup.add(portalLight);

    // Hermes standing beside the Portal holding his Between Lantern!
    hermesGuideMesh = createMiniPlushShark(0x7c3aed, 0xf3e8ff, 1.15);
    hermesGuideMesh.position.set(-3.2, 0.85, 1.2);
    hermesGuideMesh.rotation.y = 0.45;
    portalGroup.add(hermesGuideMesh);

    spScene.add(portalGroup);
  }

  async function build() {
    if (isBuilt && spScene) return spScene;

    spScene = new THREE.Scene();
    spScene.background = new THREE.Color(0x061024);
    spScene.fog = new THREE.FogExp2(0x061024, 0.015);

    colliders.length = 0;
    flatpackPickups.length = 0;
    securitySpotlights.length = 0;

    // Nighttime Megastore Ambient & Emergency Lighting
    const ambient = new THREE.AmbientLight(0x93c5fd, 0.68);
    spScene.add(ambient);

    const hemi = new THREE.HemisphereLight(0x60a5fa, 0x1e293b, 0.65);
    spScene.add(hemi);

    const mainDir = new THREE.DirectionalLight(0xe0f2fe, 0.72);
    mainDir.position.set(8, 18, 12);
    spScene.add(mainDir);

    // Polished Megastore Concrete & Birch Showroom Floor
    const floorGeo = new THREE.PlaneGeometry(ROOM_HALF_W * 2, ROOM_MAX_Z - ROOM_MIN_Z);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.38,
      metalness: 0.15
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, (ROOM_MAX_Z + ROOM_MIN_Z) / 2);
    spScene.add(floor);

    // Outer Iconic Blue-and-Yellow IKEA Megastore Walls
    const wallBlueMat = new THREE.MeshStandardMaterial({ color: 0x004b8d, roughness: 0.6 });
    const stripeYellowMat = new THREE.MeshBasicMaterial({ color: 0xffda1a });

    const roomLen = ROOM_MAX_Z - ROOM_MIN_Z;
    const roomCenterZ = (ROOM_MAX_Z + ROOM_MIN_Z) / 2;

    // Left (-X) & Right (+X) walls
    [-ROOM_HALF_W, ROOM_HALF_W].forEach((wx) => {
      const wMesh = new THREE.Mesh(new THREE.BoxGeometry(0.4, CEILING_Y, roomLen), wallBlueMat);
      wMesh.position.set(wx, CEILING_Y / 2, roomCenterZ);
      spScene.add(wMesh);

      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.45, roomLen), stripeYellowMat);
      stripe.position.set(wx, 4.2, roomCenterZ);
      spScene.add(stripe);
    });

    // North (-Z) & South (+Z) walls
    [ROOM_MIN_Z, ROOM_MAX_Z].forEach((wz) => {
      const wMesh = new THREE.Mesh(new THREE.BoxGeometry(ROOM_HALF_W * 2, CEILING_Y, 0.4), wallBlueMat);
      wMesh.position.set(0, CEILING_Y / 2, wz);
      spScene.add(wMesh);
    });

    // Ceiling rafters & dimmed night-shift fluorescent strips
    for (let z = 22; z >= -30; z -= 8) {
      const rafter = new THREE.Mesh(
        new THREE.BoxGeometry(ROOM_HALF_W * 2, 0.25, 0.35),
        new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.6 })
      );
      rafter.position.set(0, CEILING_Y - 0.2, z);
      spScene.add(rafter);

      const lightTube = new THREE.Mesh(
        new THREE.BoxGeometry(5.5, 0.08, 0.22),
        new THREE.MeshBasicMaterial({ color: 0xe0f2fe })
      );
      lightTube.position.set(0, CEILING_Y - 0.36, z);
      spScene.add(lightTube);
    }

    // Welcome Origin Overhead Sign above the Wire Spawning Bin
    const originSignTex = makeSignTexture(
      'THE IKEA SPAWNING PITS OF ERF · ART. 303.735.88',
      'HOP OUT OF THE WIRE BIN → FOLLOW YELLOW ARROWS → GRAB FLAT-PACK KITS → ESCAPE PORTAL!',
      '#0058a3',
      '#ffda1a',
      '#ffda1a'
    );
    const originBanner = new THREE.Mesh(
      new THREE.PlaneGeometry(11.0, 2.3),
      new THREE.MeshBasicMaterial({ map: originSignTex, side: THREE.DoubleSide })
    );
    originBanner.position.set(0, 5.5, 17.5);
    spScene.add(originBanner);
    floatingBanners.push(originBanner);

    // Build all 4 Sectors
    buildWireSpawningBin(0.0, 22.0, true);     // Main Spawn Bin #7 (Player wakes up here!)
    buildWireSpawningBin(8.8, 21.5, false);    // Secondary Wire Bin #8 (Liberate fellow sharks!)
    buildSacredScissorsPillowFort();           // Secret Pillow-Fort Altar at (-8.8, 0, 21.5)
    buildShowroomLabyrinth();                  // Winding Yellow Arrows & Sweeping Spotlights
    buildSelfServeWarehouseAisle14();          // Towering Aisle 14 Racks & 3D Flat-Pack Pickups
    buildMidnightBistroAndEscapePortal();      // Bistro Köttbullar Counter & Hermes Escape Portal

    isBuilt = true;
    return spScene;
  }

  function getFloorHeight(x, z, currentY = 0) {
    let highest = 0.0;
    for (let i = 0; i < colliders.length; i++) {
      const c = colliders[i];
      if (!c.solid && x >= c.minX && x <= c.maxX && z >= c.minZ && z <= c.maxZ) {
        if (c.topY > highest && currentY >= c.topY - 0.65) {
          highest = c.topY;
        }
      }
    }
    return highest;
  }

  function resolveMove(curPos, nextPos, isGrounded = true, radius = 0.42) {
    let rx = Math.max(-ROOM_HALF_W + 0.8, Math.min(ROOM_HALF_W - 0.8, nextPos.x));
    let rz = Math.max(ROOM_MIN_Z + 0.8, Math.min(ROOM_MAX_Z - 0.8, nextPos.z));

    for (let i = 0; i < colliders.length; i++) {
      const c = colliders[i];
      if (!c.solid) continue;
      if (curPos.y >= c.topY - 0.25) continue;

      const minX = c.minX - radius;
      const maxX = c.maxX + radius;
      const minZ = c.minZ - radius;
      const maxZ = c.maxZ + radius;

      if (rx > minX && rx < maxX && rz > minZ && rz < maxZ) {
        // Resolve along smallest penetration axis
        const penLeft = Math.abs(rx - minX);
        const penRight = Math.abs(maxX - rx);
        const penFront = Math.abs(rz - minZ);
        const penBack = Math.abs(maxZ - rz);
        const minPen = Math.min(penLeft, penRight, penFront, penBack);

        if (minPen === penLeft) rx = minX;
        else if (minPen === penRight) rx = maxX;
        else if (minPen === penFront) rz = minZ;
        else rz = maxZ;
      }
    }

    return { x: rx, z: rz };
  }

  function getSectorTitle(z) {
    if (z > 15.5) return 'IKEA Spawning Pits · Wire Bin #303.735.88 & Sacred Scissors Altar ✂️🦈';
    if (z > -3.5) return 'IKEA Showroom Labyrinth · Follow the Yellow Arrows (Stealth Sector) 🔦🏹';
    if (z > -21.5) return 'Self-Serve Warehouse · Aisle 14, Bay 22 (SKÄRHAJ Flat-Pack Kits) 📦🔧';
    return 'Midnight Swedish Bistro & Hermes Escape Portal to Blåhaj Island 🧆🌀';
  }

  function getInteractables(playerPos) {
    if (!playerPos) return [];
    const items = [];

    // 1. Altar of the Sacred Scissors (-8.8, 0, 21.5)
    const dAltar = Math.hypot(playerPos.x - (-8.8), playerPos.z - 21.5);
    if (dAltar < 3.8) {
      items.push({
        kind: 'spawning_altar_detag',
        dist: dAltar,
        prompt: '✂️ Altar of the Sacred Scissors: Rite of Detagging & Book of Named Sharks [E]'
      });
    }

    // 2. Wire Spawning Bin #8 Fellow Shark Liberation (8.8, 0, 21.5)
    const dBin = Math.hypot(playerPos.x - 8.8, playerPos.z - 21.5);
    if (dBin < 4.2) {
      items.push({
        kind: 'spawning_liberate_shark',
        dist: dBin,
        prompt: '✂️🦈 Snip Fellow Shark’s Barcode Tag in Wire Bin #303.735.88 (+1 Flat-Pack Kit) [E]'
      });
    }

    // 3. Ingvar's Measuring Tape Station (-10.5, 0, 7.5)
    const dTape = Math.hypot(playerPos.x - (-10.5), playerPos.z - 7.5);
    if (dTape < 3.5) {
      items.push({
        kind: 'spawning_pickup_tape',
        dist: dTape,
        prompt: '📏📦 Collect Ingvar’s Brass Measuring Tape & Showroom Flat-Pack Kit [E]'
      });
    }

    // 4. 3D SKÄRHAJ Flat-Pack Kit Pickups in Aisle 14
    for (let i = 0; i < flatpackPickups.length; i++) {
      const fp = flatpackPickups[i];
      if (fp.cooldown > 0) continue;
      const dFp = Math.hypot(playerPos.x - fp.x, playerPos.z - fp.z);
      if (dFp < 3.2) {
        items.push({
          kind: 'spawning_pickup_flatpack',
          pickupId: fp.id,
          pickupName: fp.name,
          dist: dFp,
          prompt: `📦🔧 Pick Up ${fp.name} (+1 SKÄRHAJ Flat-Pack Kit & Supplies) [E]`
        });
      }
    }

    // 5. Midnight Swedish Bistro Steam Counter (8.8, 0, -25.5)
    const dBistro = Math.hypot(playerPos.x - 8.8, playerPos.z - (-25.5));
    if (dBistro < 4.0) {
      items.push({
        kind: 'spawning_bistro_feast',
        dist: dBistro,
        prompt: '🧆✨ Grab Midnight Spawning-Pit Köttbullar & Lingonberry Jam (+2 Köttbullar) [E]'
      });
    }

    // 6. Hermes's Shimmering Between Portal to Blåhaj Island (0, 0, -30.5)
    const dPortal = Math.hypot(playerPos.x - 0.0, playerPos.z - (-30.5));
    if (dPortal < 4.8) {
      items.push({
        kind: 'spawning_exit_portal',
        dist: dPortal,
        prompt: '🌀🦈 Step Through Hermes’s Between Portal to Blåhaj Island (With Your IKEA Kits!) [E]'
      });
    }

    return items;
  }

  function collectFlatpackPickup(pickupId) {
    const fp = flatpackPickups.find((p) => p.id === pickupId);
    if (!fp || fp.cooldown > 0) return null;
    fp.cooldown = 18.0; // Respawns after 18s for repeatable raids!
    if (fp.crateGroup) fp.crateGroup.visible = false;
    return fp;
  }

  function update(dt, elapsed, playerPos) {
    if (!isActive || !spScene) return;

    if (spotlightAlertCooldown > 0) {
      spotlightAlertCooldown = Math.max(0, spotlightAlertCooldown - dt);
    }

    // Animate Sacred Scissors on Altar
    if (sacredScissorsMesh) {
      sacredScissorsMesh.rotation.y = elapsed * 1.4;
      sacredScissorsMesh.position.y = 1.48 + Math.sin(elapsed * 2.5) * 0.08;
    }

    // Animate Escape Portal rings & Hermes guide
    if (portalRingOuter) portalRingOuter.rotation.z = elapsed * 0.7;
    if (portalRingInner) portalRingInner.rotation.z = -elapsed * 1.1;
    if (portalVortexMesh) {
      portalVortexMesh.material.opacity = 0.48 + Math.sin(elapsed * 3.2) * 0.14;
    }
    if (hermesGuideMesh) {
      hermesGuideMesh.position.y = 0.85 + Math.sin(elapsed * 2.2) * 0.06;
    }

    // Animate 3D Flat-Pack Kit crates on warehouse pallets
    for (let i = 0; i < flatpackPickups.length; i++) {
      const fp = flatpackPickups[i];
      if (fp.cooldown > 0) {
        fp.cooldown = Math.max(0, fp.cooldown - dt);
        if (fp.cooldown === 0 && fp.crateGroup) {
          fp.crateGroup.visible = true;
        }
      } else if (fp.crateGroup) {
        fp.crateGroup.rotation.y = elapsed * 1.2 + i;
        fp.crateGroup.position.y = 0.55 + Math.sin(elapsed * 2.6 + i) * 0.07;
      }
    }

    // Update Patrolling Night-Shift Security Spotlights
    for (let i = 0; i < securitySpotlights.length; i++) {
      const sp = securitySpotlights[i];
      sp.curX = sp.baseX + Math.sin(elapsed * sp.speed + sp.phase) * sp.sweepX;
      sp.curZ = sp.baseZ + Math.cos(elapsed * sp.speed * 0.7 + sp.phase) * sp.sweepZ;

      sp.droneGroup.position.x = sp.curX;
      sp.droneGroup.position.z = sp.curZ;
      sp.floorRing.position.x = sp.curX;
      sp.floorRing.position.z = sp.curZ;

      if (playerPos && spotlightAlertCooldown <= 0) {
        const dSpot = Math.hypot(playerPos.x - sp.curX, playerPos.z - sp.curZ);
        if (dSpot < sp.radius) {
          spotlightAlertCooldown = 3.5;
          if (typeof onSecuritySpottedCallback === 'function') {
            onSecuritySpottedCallback(sp);
          }
        }
      }
    }

    // Check if player walked directly into the shimmering Portal Vortex at (0, 0, -30.5)
    if (playerPos && Math.hypot(playerPos.x - 0.0, playerPos.z - (-30.5)) < 1.65) {
      if (typeof onAutoPortalExitCallback === 'function') {
        onAutoPortalExitCallback();
      }
    }
  }

  window.BlahajSpawningPits = {
    build,
    getScene: () => spScene,
    setActive: (v) => { isActive = !!v; },
    isActive: () => isActive,
    getStart: () => ({ ...START_POS }),
    getCeilingY: () => CEILING_Y,
    getFloorHeight,
    resolveMove,
    getSectorTitle,
    getInteractables,
    collectFlatpackPickup,
    setCallbacks: ({ onSecuritySpotted, onAutoPortalExit } = {}) => {
      if (onSecuritySpotted) onSecuritySpottedCallback = onSecuritySpotted;
      if (onAutoPortalExit) onAutoPortalExitCallback = onAutoPortalExit;
    },
    update
  };
})();
