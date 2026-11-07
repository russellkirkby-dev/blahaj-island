// ============================================================================
// BLÅHAJ ISLAND — PASS 77: PERSONAL POCKET ATOLL, 3D BIOLUMINESCENT SEA-CAVE
// GROTTO, CUSTOM FLAT-PACK BOAT SHIPYARD (BÅT-BYGGE) & DAILY COMMISSIONS BOARD
// ============================================================================

window.BlahajHomestead = (function () {
  'use strict';

  const STORAGE_KEY = 'blahaj_homestead_state_v1';

  // Persistent Homestead, Boat Tier & Daily Commissions State
  let state = {
    boatTier: 1, // 1: SKIFF-ETT, 2: SEGEL-TVÅ, 3: ÅNGBÅT-TRE
    visitedFriendCode: null,
    visitedFriendName: null,
    grottoChestClaimed: false,
    commissionsProgress: {
      comm_hermes_extraction: 0,
      comm_hiram_joinery: 0,
      comm_solomon_spherical: 0,
      comm_nimue_seam: 0
    },
    commissionsClaimed: {
      comm_hermes_extraction: false,
      comm_hiram_joinery: false,
      comm_solomon_spherical: false,
      comm_nimue_seam: false
    },
    lastResetDate: new Date().toLocaleDateString()
  };

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        state = Object.assign({}, state, parsed);
        state.commissionsProgress = Object.assign({
          comm_hermes_extraction: 0,
          comm_hiram_joinery: 0,
          comm_solomon_spherical: 0,
          comm_nimue_seam: 0
        }, parsed.commissionsProgress || {});
        state.commissionsClaimed = Object.assign({
          comm_hermes_extraction: false,
          comm_hiram_joinery: false,
          comm_solomon_spherical: false,
          comm_nimue_seam: false
        }, parsed.commissionsClaimed || {});
      }
      // Reset daily commissions if a new calendar day started
      const today = new Date().toLocaleDateString();
      if (state.lastResetDate !== today) {
        state.lastResetDate = today;
        state.commissionsClaimed = {
          comm_hermes_extraction: false,
          comm_hiram_joinery: false,
          comm_solomon_spherical: false,
          comm_nimue_seam: false
        };
        saveState();
      }
    } catch (e) {
      console.warn('BlahajHomestead loadState warning:', e);
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {}
  }

  loadState();

  // Surface references
  let surfaceBuilt = false;
  let customAtollBoatGroup = null;
  let caveBoatGroup = null;
  let sawBladeMesh = null;
  let floatingAllenMesh = null;
  let friendBannerCanvas = null;
  let friendBannerTex = null;
  const companionSharks = [];
  const surfaceAnimated = [];

  // Subterranean Bioluminescent Sea-Cave Instance references
  let caveScene = null;
  let isBuilt = false;
  let isActive = false;
  const quartzNodes = [];
  const caveStalactites = [];
  const caveFloatingOrbs = [];
  let caveRiftMesh = null;
  let caveWaterMesh = null;
  let grottoBuffTimer = 0;

  // Helper: Create crisp sign texture with yellow border
  function makeSignTexture(title, subtitle, bgHex = '#004b93', accentHex = '#ffda1a') {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 192;
    const ctx = c.getContext('2d');
    ctx.fillStyle = bgHex;
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.strokeStyle = accentHex;
    ctx.lineWidth = 10;
    ctx.strokeRect(8, 8, c.width - 16, c.height - 16);

    ctx.fillStyle = accentHex;
    ctx.font = '900 32px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, c.width / 2, 68);

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 22px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(subtitle, c.width / 2, 128);

    const tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    return tex;
  }

  // ==========================================================================
  // PROCEDURAL TEXTURE & BUMP MAP GENERATORS FOR ATOLL, BOATS & SEA-CAVE GROTTO
  // ==========================================================================
  const TEX_CACHE = {};

  function getCedarWoodTexture(baseHex = '#7c4a27', grainHex = '#43230f', repeatX = 2, repeatY = 2) {
    const key = `wood_${baseHex}_${grainHex}_${repeatX}_${repeatY}`;
    if (TEX_CACHE[key]) return TEX_CACHE[key];
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext('2d');
    ctx.fillStyle = baseHex;
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = grainHex;
    for (let i = 0; i < 56; i++) {
      ctx.globalAlpha = 0.10 + (i % 4) * 0.04;
      ctx.lineWidth = 1 + (i % 3);
      const y = (i / 56) * 256;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(85, y + Math.sin(i) * 5, 170, y - Math.cos(i) * 5, 256, y);
      ctx.stroke();
    }
    ctx.globalAlpha = 0.24;
    ctx.fillStyle = '#1c0f06';
    for (let p = 64; p < 256; p += 64) {
      ctx.fillRect(0, p, 256, 2);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
    TEX_CACHE[key] = tex;
    return tex;
  }

  function getBasaltRockTexture(baseHex = '#1e293b', veinHex = '#38bdf8', repeatX = 6, repeatY = 6) {
    const key = `basalt_${baseHex}_${veinHex}_${repeatX}_${repeatY}`;
    if (TEX_CACHE[key]) return TEX_CACHE[key];
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 512;
    const ctx = c.getContext('2d');
    ctx.fillStyle = baseHex;
    ctx.fillRect(0, 0, 512, 512);

    // Craggy polygonal basalt facets
    for (let i = 0; i < 140; i++) {
      const rx = (i * 97) % 512;
      const ry = (i * 151) % 512;
      const rw = 24 + (i % 5) * 14;
      const rh = 18 + (i % 4) * 14;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(15, 23, 42, 0.42)' : 'rgba(71, 85, 105, 0.22)';
      ctx.fillRect(rx, ry, rw, rh);
    }

    // Subtle bioluminescent mineral fissures
    ctx.strokeStyle = veinHex;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.28;
    for (let v = 0; v < 18; v++) {
      const sx = (v * 113) % 512;
      const sy = (v * 79) % 512;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + 38, sy + 22);
      ctx.lineTo(sx + 68, sy - 14);
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
    TEX_CACHE[key] = tex;
    return tex;
  }

  function getCausticLagoonWaterTexture() {
    if (TEX_CACHE.causticWater) return TEX_CACHE.causticWater;
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 512;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#0891b2';
    ctx.fillRect(0, 0, 512, 512);

    // Glowing aqua caustic rings
    for (let i = 0; i < 48; i++) {
      const cx = (i * 83) % 512;
      const cy = (i * 127) % 512;
      const r = 22 + (i % 4) * 16;
      ctx.strokeStyle = i % 2 === 0 ? 'rgba(103, 232, 249, 0.35)' : 'rgba(192, 132, 252, 0.25)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(5, 5);
    TEX_CACHE.causticWater = tex;
    return tex;
  }

  function getSailClothTexture() {
    if (TEX_CACHE.sailCloth) return TEX_CACHE.sailCloth;
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 512;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#ffda1a';
    ctx.fillRect(0, 0, 512, 512);

    // Bold Scandinavian Blue Cross & Crown Stripe
    ctx.fillStyle = '#0058a3';
    ctx.fillRect(0, 210, 512, 92);
    ctx.fillRect(210, 0, 92, 512);

    // Sail cloth stitching lines
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.22)';
    ctx.lineWidth = 2;
    for (let y = 64; y < 512; y += 64) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 42px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SKÄRHAJ', 256, 268);

    const tex = new THREE.CanvasTexture(c);
    TEX_CACHE.sailCloth = tex;
    return tex;
  }

  function populateCustomBoatMesh(group, tier) {
    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }
    const birchTex = getCedarWoodTexture('#d4a373', '#8c5828', 2, 2);
    const mahoganyTex = getCedarWoodTexture('#7c2d12', '#3b1106', 2, 3);
    const blueWoodTex = getCedarWoodTexture('#0058a3', '#00386b', 2, 2);

    const birchMat = new THREE.MeshStandardMaterial({ color: 0xe6be91, map: birchTex, bumpMap: birchTex, bumpScale: 0.02, roughness: 0.62 });
    const blueMat = new THREE.MeshStandardMaterial({ color: 0x0062b8, map: blueWoodTex, bumpMap: blueWoodTex, bumpScale: 0.02, roughness: 0.48 });
    const yellowMat = new THREE.MeshStandardMaterial({ color: 0xffda1a, roughness: 0.36 });
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.85, roughness: 0.20 });
    const mahoganyMat = new THREE.MeshStandardMaterial({ color: 0x8f3415, map: mahoganyTex, bumpMap: mahoganyTex, bumpScale: 0.025, roughness: 0.50 });

    // Clinker-Built Hull Base + Raised Gunwale Rails
    const hullMat = tier === 1 ? birchMat : (tier === 2 ? blueMat : mahoganyMat);
    const hull = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.72, 5.4), hullMat);
    hull.position.set(0, 0.36, 0);
    hull.castShadow = true;
    group.add(hull);

    // Brass Keel & Side Rub-Rails
    [-1.33, 1.33].forEach((rx) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 5.45), tier >= 2 ? brassMat : mahoganyMat);
      rail.position.set(rx, 0.70, 0);
      group.add(rail);
    });

    // Bow prow wedge + carved figurehead fin
    const prow = new THREE.Mesh(new THREE.ConeGeometry(1.35, 1.8, 4), hullMat);
    prow.rotation.x = Math.PI / 2;
    prow.rotation.y = Math.PI / 4;
    prow.position.set(0, 0.38, 3.2);
    group.add(prow);

    // Deck planks & brass trim
    const deck = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.16, 4.8), birchMat);
    deck.position.set(0, 0.76, 0);
    group.add(deck);

    // Warm Bow Lantern (All tiers)
    const bowPost = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.1, 8), brassMat);
    bowPost.position.set(0, 1.25, 2.3);
    group.add(bowPost);
    const lanternOrb = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 12, 12),
      new THREE.MeshBasicMaterial({ color: tier >= 3 ? 0x38bdf8 : 0xfde047 })
    );
    lanternOrb.position.set(0, 1.85, 2.3);
    group.add(lanternOrb);

    if (tier === 1) {
      // Tier 1: SKIFF-ETT — Twin Scandinavian Ash Oars with Blades, Rowlocks & Coiled Bow Rope
      const bench = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.14, 0.55), mahoganyMat);
      bench.position.set(0, 0.92, 0.2);
      group.add(bench);
      [-1.35, 1.35].forEach((ox) => {
        const oarGroup = new THREE.Group();
        oarGroup.position.set(ox, 0.95, 0.2);
        oarGroup.rotation.z = ox > 0 ? -1.1 : 1.1;
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 3.0, 8), birchMat);
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.85, 0.24), yellowMat);
        blade.position.y = -1.35;
        oarGroup.add(shaft, blade);
        group.add(oarGroup);
      });
      const ropeCoil = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.07, 8, 16), birchMat);
      ropeCoil.rotation.x = Math.PI / 2;
      ropeCoil.position.set(0, 0.88, 1.65);
      group.add(ropeCoil);
    } else if (tier === 2) {
      // Tier 2: SEGEL-TVÅ — Outrigger Pontoons, Stitched SKÄRHAJ Mainsail & Flat-Pack Cargo Rack
      [-2.15, 2.15].forEach((px) => {
        const pontoon = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 4.2, 10), yellowMat);
        pontoon.rotation.x = Math.PI / 2;
        pontoon.position.set(px, 0.25, 0);
        group.add(pontoon);
        [-1.1, 1.1].forEach((sz) => {
          const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.2, 8), birchMat);
          strut.rotation.z = Math.PI / 2;
          strut.position.set(px * 0.5, 0.65, sz);
          group.add(strut);
        });
      });
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 5.2, 10), birchMat);
      mast.position.set(0, 3.3, 0.4);
      group.add(mast);
      const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.6, 8), birchMat);
      boom.rotation.x = Math.PI / 2;
      boom.position.set(0, 1.65, -0.4);
      group.add(boom);

      const sailTex = getSailClothTexture();
      const sail = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 3.4, 2.5),
        new THREE.MeshStandardMaterial({ map: sailTex, roughness: 0.55, emissive: 0x0058a3, emissiveIntensity: 0.12 })
      );
      sail.position.set(0, 3.4, -0.4);
      group.add(sail);
      // Stacked SKÄRHAJ Flat-Pack Cargo Boxes on stern
      for (let b = 0; b < 2; b++) {
        const box = new THREE.Mesh(
          new THREE.BoxGeometry(1.3, 0.26, 0.9),
          birchMat
        );
        box.position.set(0, 0.96 + b * 0.28, -1.65);
        group.add(box);
      }
    } else {
      // Tier 3: ÅNGBÅT-TRE — Volcanic & Starlight Steam Launch with Riveted Copper Boiler, Gauge, Smokestack, Whistle & Stern Paddlewheel!
      const canopyRoof = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.14, 3.4), mahoganyMat);
      canopyRoof.position.set(0, 2.95, -0.2);
      group.add(canopyRoof);
      const canopyTrim = new THREE.Mesh(new THREE.BoxGeometry(2.48, 0.08, 3.48), brassMat);
      canopyTrim.position.set(0, 2.96, -0.2);
      group.add(canopyTrim);

      [[-1.05, -1.6], [1.05, -1.6], [-1.05, 1.2], [1.05, 1.2]].forEach(([px, pz]) => {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.1, 8), brassMat);
        post.position.set(px, 1.88, pz);
        group.add(post);
      });
      // Copper Steam Boiler with Starlight Core Sight-Glass & Brass Smokestack
      const boiler = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 1.4, 14), brassMat);
      boiler.rotation.x = Math.PI / 2;
      boiler.position.set(0, 1.25, 1.1);
      group.add(boiler);
      const sightGlass = new THREE.Mesh(
        new THREE.CylinderGeometry(0.50, 0.50, 0.28, 14),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
      );
      sightGlass.rotation.x = Math.PI / 2;
      sightGlass.position.set(0, 1.25, 1.1);
      group.add(sightGlass);

      const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 2.2, 12), brassMat);
      stack.position.set(0, 2.8, 1.2);
      group.add(stack);
      const stackCrown = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.05, 8, 14), mahoganyMat);
      stackCrown.rotation.x = Math.PI / 2;
      stackCrown.position.set(0, 3.88, 1.2);
      group.add(stackCrown);

      // Musical Brass Steam Whistle on side of stack
      const whistle = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.55, 8), yellowMat);
      whistle.position.set(0.28, 3.1, 1.2);
      group.add(whistle);
      // Stern Paddlewheel with 6 Paddles
      const wheelGroup = new THREE.Group();
      wheelGroup.position.set(0, 0.55, -2.95);
      wheelGroup.name = 'paddlewheel';
      const wheelCore = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 1.8, 12), mahoganyMat);
      wheelCore.rotation.z = Math.PI / 2;
      wheelGroup.add(wheelCore);
      for (let p = 0; p < 6; p++) {
        const pa = (p / 6) * Math.PI * 2;
        const blade = new THREE.Mesh(new THREE.BoxGeometry(1.76, 0.14, 0.28), brassMat);
        blade.position.set(0, Math.cos(pa) * 0.78, Math.sin(pa) * 0.78);
        blade.rotation.x = -pa;
        wheelGroup.add(blade);
      }
      group.add(wheelGroup);
    }
  }

  function buildCommissionsBoardMesh(titleText) {
    const group = new THREE.Group();
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x6b472b, roughness: 0.8 });
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.72, roughness: 0.25 });
    const backingMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 });

    [-1.4, 1.4].forEach((px) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 3.4, 10), woodMat);
      post.position.set(px, 1.7, 0);
      group.add(post);
    });
    const board = new THREE.Mesh(new THREE.BoxGeometry(3.1, 1.85, 0.22), backingMat);
    board.position.set(0, 2.15, 0);
    group.add(board);

    const frameTop = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.32, 0.48), brassMat);
    frameTop.position.set(0, 3.18, 0);
    group.add(frameTop);

    // 4 Pinned Commission Scrolls
    const scrollColors = [0xfef08a, 0xbae6fd, 0xfde68a, 0xe9d5ff];
    for (let i = 0; i < 4; i++) {
      const sx = -1.05 + i * 0.7;
      const scroll = new THREE.Mesh(
        new THREE.BoxGeometry(0.55, 0.85, 0.05),
        new THREE.MeshBasicMaterial({ color: scrollColors[i] })
      );
      scroll.position.set(sx, 2.05, 0.14);
      group.add(scroll);
    }

    // Header Signboard
    const signTex = makeSignTexture(
      titleText || '👑 DAILY FOUNDER COMMISSIONS',
      'SOLOMON · NIMUE · HIRAM · HERMES [E]',
      '#0f172a',
      '#fbbf24'
    );
    const signMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(2.9, 0.68),
      new THREE.MeshBasicMaterial({ map: signTex })
    );
    signMesh.position.set(0, 2.82, 0.15);
    group.add(signMesh);

    return group;
  }

  // Build Surface Set-Pieces on Main Island & Personal Pocket Atoll (0, 205)
  function buildSurfaceSetPieces(mainScene, worldApi) {
    if (surfaceBuilt || !mainScene || !worldApi) return;
    surfaceBuilt = true;

    // 1. Main Island Sacred Tea House Plaza — Daily Founder Commissions Board at (8.5, y, 16.5)
    const teaY = worldApi.getTerrainHeight(8.5, 16.5);
    const mainBoard = buildCommissionsBoardMesh('👑 DAILY FOUNDER COMMISSIONS');
    mainBoard.position.set(8.5, teaY, 16.5);
    mainBoard.rotation.y = -Math.PI * 0.25;
    mainScene.add(mainBoard);

    // 2. Personal Pocket Atoll Pier — Commissions & Shipyard Sea Chart Board at (3.8, 1.55, 153.5)
    const atollBoard = buildCommissionsBoardMesh('⚓ BÅT-BYGGE SHIPYARD & COMMISSIONS');
    atollBoard.position.set(3.8, 1.55, 153.5);
    atollBoard.rotation.y = Math.PI;
    mainScene.add(atollBoard);

    // 3. Personal Pocket Atoll Moored Custom Flat-Pack Boat at (0, 0.45, 145.5)
    customAtollBoatGroup = new THREE.Group();
    customAtollBoatGroup.position.set(0, 0.45, 145.5);
    populateCustomBoatMesh(customAtollBoatGroup, state.boatTier || 1);
    mainScene.add(customAtollBoatGroup);

    // 4. BYGGBÄNK — Ingvar's Assembly & Sawmill Bench at (9.5, y, 195.0)
    const benchY = worldApi.getTerrainHeight(9.5, 195.0);
    const benchGroup = new THREE.Group();
    benchGroup.position.set(9.5, benchY, 195.0);

    const birchTex = getCedarWoodTexture('#d4a373', '#8c5828', 2, 2);
    const darkWoodTex = getCedarWoodTexture('#5c3a21', '#2b180a', 2, 2);
    const birchMat = new THREE.MeshStandardMaterial({ color: 0xe6be91, map: birchTex, bumpMap: birchTex, bumpScale: 0.02, roughness: 0.62 });
    const darkTimberMat = new THREE.MeshStandardMaterial({ color: 0x784b2a, map: darkWoodTex, bumpMap: darkWoodTex, bumpScale: 0.025, roughness: 0.68 });
    const steelMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.86, roughness: 0.18 });
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.84, roughness: 0.20 });

    const tableTop = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.25, 2.0), birchMat);
    tableTop.position.set(0, 1.15, 0);
    benchGroup.add(tableTop);

    // Lower storage stretcher shelf & stacked timber logs
    const lowerShelf = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.12, 1.6), darkTimberMat);
    lowerShelf.position.set(0, 0.38, 0);
    benchGroup.add(lowerShelf);
    [-0.45, 0, 0.45].forEach((lz, idx) => {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 2.2, 10), idx % 2 === 0 ? darkTimberMat : birchMat);
      log.rotation.z = Math.PI / 2;
      log.position.set(-0.3, 0.58, lz);
      benchGroup.add(log);
    });

    // Golden sawdust mound under the saw blade
    const sawdust = new THREE.Mesh(
      new THREE.ConeGeometry(0.95, 0.36, 14),
      new THREE.MeshStandardMaterial({ color: 0xfde68a, roughness: 0.92 })
    );
    sawdust.position.set(-0.7, 0.18, 0);
    benchGroup.add(sawdust);

    [[-1.6, -0.8], [1.6, -0.8], [-1.6, 0.8], [1.6, 0.8]].forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.15, 0.22), darkTimberMat);
      leg.position.set(lx, 0.57, lz);
      benchGroup.add(leg);
    });

    // Carpenter's Bench Vice on front edge
    const vice = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.24, 0.32), steelMat);
    vice.position.set(1.1, 1.12, -1.08);
    benchGroup.add(vice);

    // Spinning Circular Sawmill Blade + Protective Brass Guard Hood
    sawBladeMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.06, 20), steelMat);
    sawBladeMesh.rotation.z = Math.PI / 2;
    sawBladeMesh.position.set(-0.7, 1.45, 0);
    benchGroup.add(sawBladeMesh);

    const bladeGuard = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.06, 8, 16, Math.PI), brassMat);
    bladeGuard.rotation.y = Math.PI / 2;
    bladeGuard.position.set(-0.7, 1.52, 0);
    benchGroup.add(bladeGuard);

    // Floating Golden Allen Key M10 over the bench
    floatingAllenMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 0), brassMat);
    floatingAllenMesh.position.set(0.85, 2.1, 0);
    benchGroup.add(floatingAllenMesh);

    const benchSign = new THREE.Mesh(
      new THREE.PlaneGeometry(3.2, 0.95),
      new THREE.MeshBasicMaterial({
        map: makeSignTexture('🪚 BYGGBÄNK · FLAT-PACK SAWMILL', 'MILL TIMBER INTO SKÄRHAJ KITS [E]', '#004b93', '#ffda1a'),
        side: THREE.DoubleSide
      })
    );
    benchSign.position.set(0, 2.85, -0.85);
    benchSign.rotation.y = Math.PI;
    benchGroup.add(benchSign);
    mainScene.add(benchGroup);

    // 5. Friend Atoll Welcome Banner at (-4.2, 1.55, 155.0)
    friendBannerCanvas = document.createElement('canvas');
    friendBannerCanvas.width = 512;
    friendBannerCanvas.height = 192;
    friendBannerTex = new THREE.CanvasTexture(friendBannerCanvas);
    updateFriendBannerCanvas();
    const bannerMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(3.4, 1.25),
      new THREE.MeshBasicMaterial({ map: friendBannerTex, side: THREE.DoubleSide })
    );
    bannerMesh.position.set(-4.2, 3.1, 155.0);
    bannerMesh.rotation.y = Math.PI;
    mainScene.add(bannerMesh);

    // 6. Rescued Spawning-Pit Baby Shark Companion Lagoon at (-9.5, y, 196.0)
    const poolY = worldApi.getTerrainHeight(-9.5, 196.0);
    const poolGroup = new THREE.Group();
    poolGroup.position.set(-9.5, poolY, 196.0);

    const coralStoneTex = getBasaltRockTexture('#64748b', '#38bdf8', 4, 4);
    const poolRing = new THREE.Mesh(
      new THREE.TorusGeometry(4.2, 0.48, 14, 32),
      new THREE.MeshStandardMaterial({ color: 0xcbd5e1, map: coralStoneTex, bumpMap: coralStoneTex, bumpScale: 0.03, roughness: 0.78 })
    );
    poolRing.rotation.x = Math.PI / 2;
    poolRing.position.y = 0.25;
    poolGroup.add(poolRing);

    // Decorative Coral Boulders, Lily Pads & Hibiscus Blossoms around the Lagoon Rim
    const lilyMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.65 });
    const flowerMat = new THREE.MeshBasicMaterial({ color: 0xf472b6 });
    for (let l = 0; l < 6; l++) {
      const la = (l / 6) * Math.PI * 2 + 0.4;
      const lx = Math.cos(la) * 3.1;
      const lz = Math.sin(la) * 3.1;
      const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.04, 12), lilyMat);
      pad.position.set(lx, 0.26, lz);
      poolGroup.add(pad);
      if (l % 2 === 0) {
        const bloom = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), flowerMat);
        bloom.position.set(lx, 0.34, lz);
        poolGroup.add(bloom);
      }
    }

    const causticTex = getCausticLagoonWaterTexture();
    const poolWater = new THREE.Mesh(
      new THREE.CylinderGeometry(4.0, 4.0, 0.18, 28),
      new THREE.MeshBasicMaterial({ map: causticTex, color: 0x7dd3fc, transparent: true, opacity: 0.84 })
    );
    poolWater.position.y = 0.22;
    poolGroup.add(poolWater);

    const babySign = new THREE.Mesh(
      new THREE.PlaneGeometry(3.2, 0.95),
      new THREE.MeshBasicMaterial({
        map: makeSignTexture('🦈 RESCUED SPAWNING-PIT SHARKS', 'BOOP & CUDDLE BABY COMPANIONS [E]', '#0f172a', '#38bdf8'),
        side: THREE.DoubleSide
      })
    );
    babySign.position.set(0, 2.6, -4.2);
    babySign.rotation.y = Math.PI;
    poolGroup.add(babySign);
    mainScene.add(poolGroup);

    refreshCompanionBabySharks(poolGroup);

    // 7. Natural Bioluminescent Basalt Sea-Cave Archway at (0, y, 224.0)
    const caveArchY = worldApi.getTerrainHeight(0, 224.0);
    const archGroup = new THREE.Group();
    archGroup.position.set(0, caveArchY, 224.0);

    const basaltTex = getBasaltRockTexture('#1e293b', '#38bdf8', 4, 4);
    const basaltMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      map: basaltTex,
      bumpMap: basaltTex,
      bumpScale: 0.04,
      roughness: 0.86
    });
    const crystalMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.9,
      roughness: 0.18
    });
    const violetCrystalMat = new THREE.MeshStandardMaterial({
      color: 0xc084fc,
      emissive: 0x7e22ce,
      emissiveIntensity: 0.9,
      roughness: 0.18
    });

    [-3.2, 3.2].forEach((px) => {
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.55, 5.2, 10), basaltMat);
      pillar.position.set(px, 2.5, 0);
      archGroup.add(pillar);
      // Flanking craggy basalt shoulder boulders
      const shoulder = new THREE.Mesh(new THREE.DodecahedronGeometry(1.65, 1), basaltMat);
      shoulder.position.set(px * 1.35, 1.35, 0.3);
      archGroup.add(shoulder);
    });
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(8.4, 1.7, 2.9), basaltMat);
    lintel.position.set(0, 5.2, 0);
    archGroup.add(lintel);

    // Glowing Starlight Portal Curtain + Gold Archodect Rim inside the Sea-Cave Arch
    const portalRim = new THREE.Mesh(new THREE.TorusGeometry(2.85, 0.16, 12, 28), brassMat);
    portalRim.position.set(0, 2.5, 0);
    archGroup.add(portalRim);

    const portalDisc = new THREE.Mesh(
      new THREE.CircleGeometry(2.8, 28),
      new THREE.MeshBasicMaterial({ map: causticTex, color: 0x38bdf8, transparent: true, opacity: 0.78, side: THREE.DoubleSide })
    );
    portalDisc.position.set(0, 2.5, 0);
    archGroup.add(portalDisc);

    // Glowing Multi-Shard Quartz Crystal Clusters framing the Sea-Cave mouth
    [[-2.5, 1.2, 0.9], [2.5, 1.2, 0.9], [-2.1, 4.2, 0.9], [2.1, 4.2, 0.9]].forEach(([cx, cy, cz], idx) => {
      const cMat = idx % 2 === 0 ? crystalMat : violetCrystalMat;
      const crys = new THREE.Mesh(new THREE.ConeGeometry(0.38, 1.55, 6), cMat);
      crys.position.set(cx, cy, cz);
      crys.rotation.z = cx < 0 ? -0.35 : 0.35;
      archGroup.add(crys);
      const subShard = new THREE.Mesh(new THREE.ConeGeometry(0.24, 1.05, 6), cMat);
      subShard.position.set(cx + (cx < 0 ? -0.32 : 0.32), cy - 0.2, cz + 0.18);
      subShard.rotation.z = cx < 0 ? -0.62 : 0.62;
      archGroup.add(subShard);
    });

    const caveSign = new THREE.Mesh(
      new THREE.PlaneGeometry(3.8, 1.05),
      new THREE.MeshBasicMaterial({
        map: makeSignTexture('💎 STARLIGHT SEA-CAVE GROTTO', 'ENTER BIOLUMINESCENT CAVERN [E]', '#090d16', '#38bdf8'),
        side: THREE.DoubleSide
      })
    );
    caveSign.position.set(0, 6.4, -0.8);
    caveSign.rotation.y = Math.PI;
    archGroup.add(caveSign);

    mainScene.add(archGroup);
  }

  function updateFriendBannerCanvas() {
    if (!friendBannerCanvas || !friendBannerTex) return;
    const ctx = friendBannerCanvas.getContext('2d');
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 512, 192);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 8;
    ctx.strokeRect(8, 8, 496, 176);

    ctx.fillStyle = '#fde047';
    ctx.font = '900 28px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    const title = state.visitedFriendCode
      ? `🏝️ VISITING ATOLL: ${state.visitedFriendCode}`
      : '🏝️ PERSONAL POCKET ATOLL CHARTER';
    ctx.fillText(title, 256, 66);

    ctx.fillStyle = '#e0f2fe';
    ctx.font = '700 21px "Plus Jakarta Sans", sans-serif';
    const sub = state.visitedFriendName
      ? `Host: ${state.visitedFriendName} · Starlight Sea-Cave Open`
      : 'South Lagoon Sanctuary · Shipyard & Sea-Cave [E]';
    ctx.fillText(sub, 256, 128);
    friendBannerTex.needsUpdate = true;
  }

  function refreshCompanionBabySharks(poolGroup) {
    if (!poolGroup) return;
    companionSharks.forEach((b) => {
      if (b.mesh && b.mesh.parent) b.mesh.parent.remove(b.mesh);
    });
    companionSharks.length = 0;

    let names = ['Svenskhaj', 'Lingonfin', 'Björkhaj'];
    try {
      const book = JSON.parse(localStorage.getItem('blahaj_book_of_named_sharks_v1') || '[]');
      book.forEach((entry) => {
        if (entry && entry.name && !names.includes(entry.name)) {
          names.unshift(entry.name);
        }
      });
    } catch (e) {}
    names = names.slice(0, 6);

    const colors = [0x3b82f6, 0xf472b6, 0x10b981, 0xa855f7, 0xf59e0b, 0x06b6d4];
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
    const ribbonMat = new THREE.MeshBasicMaterial({ color: 0xfde047 });

    names.forEach((name, idx) => {
      const babyGroup = new THREE.Group();
      const bodyMat = new THREE.MeshStandardMaterial({ color: colors[idx % colors.length], roughness: 0.68 });
      const bellyMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.80 });

      const body = new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 12), bodyMat);
      body.scale.set(0.85, 0.65, 1.55);
      body.position.y = 0.42;
      babyGroup.add(body);

      const belly = new THREE.Mesh(new THREE.SphereGeometry(0.36, 10, 8), bellyMat);
      belly.scale.set(0.78, 0.45, 1.38);
      belly.position.set(0, 0.30, 0.05);
      babyGroup.add(belly);

      const dorsal = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.44, 5), bodyMat);
      dorsal.position.set(0, 0.76, -0.05);
      dorsal.rotation.x = -0.22;
      babyGroup.add(dorsal);

      // Pectoral fins & crescent tail fluke
      [-0.36, 0.36].forEach((fx) => {
        const fin = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.34, 4), bodyMat);
        fin.position.set(fx, 0.36, 0.12);
        fin.rotation.z = fx > 0 ? -1.15 : 1.15;
        babyGroup.add(fin);
      });
      const tail = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.46, 5), bodyMat);
      tail.position.set(0, 0.48, -0.68);
      tail.rotation.x = Math.PI * 0.38;
      babyGroup.add(tail);

      // Glossy bead eyes + Golden Liberation Bow Ribbon
      [-0.22, 0.22].forEach((ex) => {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), eyeMat);
        eye.position.set(ex, 0.48, 0.42);
        babyGroup.add(eye);
      });
      const ribbon = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.025, 6, 12), ribbonMat);
      ribbon.rotation.x = Math.PI / 2;
      ribbon.position.set(0, 0.64, -0.05);
      babyGroup.add(ribbon);

      poolGroup.add(babyGroup);
      companionSharks.push({
        name,
        mesh: babyGroup,
        angle: (idx / names.length) * Math.PI * 2,
        radius: 1.6 + (idx % 2) * 1.1,
        speed: 0.75 + (idx % 3) * 0.2
      });
    });
  }

  // ==========================================================================
  // BUILD 3D WALKABLE SUBTERRANEAN BIOLUMINESCENT SEA-CAVE GROTTO INSTANCE
  // ==========================================================================
  let caveSporePoints = null;
  let thermalSteamRings = [];

  async function build() {
    if (isBuilt && caveScene) return caveScene;
    caveScene = new THREE.Scene();
    caveScene.background = new THREE.Color(0x040b18);
    caveScene.fog = new THREE.FogExp2(0x061326, 0.013);

    const hemi = new THREE.HemisphereLight(0x38bdf8, 0x1e1b4b, 0.92);
    caveScene.add(hemi);

    const centerLight = new THREE.PointLight(0x22d3ee, 2.1, 68);
    centerLight.position.set(0, 9.5, -2);
    caveScene.add(centerLight);

    const violetLight = new THREE.PointLight(0xa855f7, 1.6, 58);
    violetLight.position.set(-14, 7.5, -12);
    caveScene.add(violetLight);

    const warmLoungeLight = new THREE.PointLight(0xfde047, 1.75, 48);
    warmLoungeLight.position.set(13.5, 6.5, -12);
    caveScene.add(warmLoungeLight);

    const basaltTex = getBasaltRockTexture('#1e293b', '#38bdf8', 8, 8);
    const domeBasaltTex = getBasaltRockTexture('#0f172a', '#a855f7', 10, 6);
    const cedarTex = getCedarWoodTexture('#6b472b', '#382210', 3, 3);
    const causticTex = getCausticLagoonWaterTexture();

    const basaltMat = new THREE.MeshStandardMaterial({
      color: 0x26354d,
      map: basaltTex,
      bumpMap: basaltTex,
      bumpScale: 0.05,
      roughness: 0.84
    });
    const terraceMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      map: basaltTex,
      bumpMap: basaltTex,
      bumpScale: 0.03,
      roughness: 0.72
    });
    const woodDeckMat = new THREE.MeshStandardMaterial({
      color: 0xb48456,
      map: cedarTex,
      bumpMap: cedarTex,
      bumpScale: 0.025,
      roughness: 0.65
    });
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      metalness: 0.85,
      roughness: 0.20
    });
    const crystalCyanMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.92,
      roughness: 0.16,
      metalness: 0.2
    });
    const crystalVioletMat = new THREE.MeshStandardMaterial({
      color: 0xc084fc,
      emissive: 0x7e22ce,
      emissiveIntensity: 0.92,
      roughness: 0.16,
      metalness: 0.2
    });
    const crystalEmeraldMat = new THREE.MeshStandardMaterial({
      color: 0x34d399,
      emissive: 0x059669,
      emissiveIntensity: 0.92,
      roughness: 0.16,
      metalness: 0.2
    });

    // 1. Subterranean Cavern Floor & Shimmering Caustic Lagoon Water
    const floorMesh = new THREE.Mesh(new THREE.CylinderGeometry(36, 38, 1.2, 36), basaltMat);
    floorMesh.position.set(0, -0.6, -2);
    floorMesh.receiveShadow = true;
    caveScene.add(floorMesh);

    caveWaterMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(34, 34, 0.2, 36),
      new THREE.MeshBasicMaterial({ map: causticTex, color: 0x22d3ee, transparent: true, opacity: 0.68 })
    );
    caveWaterMesh.position.set(0, -0.08, -2);
    caveScene.add(caveWaterMesh);

    // 2. Bump-Mapped Cavern Dome Walls, Natural Basalt Columns & 84 Bioluminescent Stalactites
    const domeGeo = new THREE.SphereGeometry(37, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.52);
    const domeMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      map: domeBasaltTex,
      bumpMap: domeBasaltTex,
      bumpScale: 0.06,
      roughness: 0.90,
      side: THREE.BackSide
    });
    const dome = new THREE.Mesh(domeGeo, domeMat);
    dome.position.set(0, -1.0, -2);
    caveScene.add(dome);

    // Perimeter Natural Hexagonal Basalt Columns framing the cavern walls
    for (let c = 0; c < 18; c++) {
      const ca = (c / 18) * Math.PI * 2;
      if (Math.abs(ca - Math.PI * 0.5) < 0.32) continue; // Keep entrance dock clear
      const cx = Math.cos(ca) * 29.5;
      const cz = Math.sin(ca) * 29.5 - 2.0;
      const colH = 12.0 + (c % 3) * 2.5;
      const col = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.8, colH, 6), basaltMat);
      col.position.set(cx, colH * 0.5 - 0.5, cz);
      caveScene.add(col);
    }

    caveStalactites.length = 0;
    for (let i = 0; i < 84; i++) {
      const ang = (i / 84) * Math.PI * 2 + (i % 5) * 0.3;
      const rad = 4.0 + ((i * 7) % 27);
      const sx = Math.cos(ang) * rad;
      const sz = Math.sin(ang) * rad - 2.0;
      const h = 1.6 + (i % 4) * 0.95;
      const mat = i % 3 === 0 ? crystalCyanMat : (i % 3 === 1 ? crystalVioletMat : crystalEmeraldMat);
      const stal = new THREE.Mesh(new THREE.ConeGeometry(0.34, h, 6), mat);
      stal.rotation.x = Math.PI;
      stal.position.set(sx, 14.5 - (rad * rad) * 0.006, sz);
      caveScene.add(stal);
      caveStalactites.push(stal);
    }

    // Floating Bioluminescent Spore & Plankton Particle Field (220 glowing motes!)
    const sporeCount = 220;
    const sporePositions = new Float32Array(sporeCount * 3);
    const sporeColors = new Float32Array(sporeCount * 3);
    const palette = [new THREE.Color(0x38bdf8), new THREE.Color(0xc084fc), new THREE.Color(0x34d399), new THREE.Color(0xfde047)];
    for (let s = 0; s < sporeCount; s++) {
      const sa = (s * 1.37) % (Math.PI * 2);
      const sr = 2.0 + ((s * 11.3) % 26.0);
      sporePositions[s * 3] = Math.cos(sa) * sr;
      sporePositions[s * 3 + 1] = 0.8 + ((s * 3.7) % 11.5);
      sporePositions[s * 3 + 2] = Math.sin(sa) * sr - 2.0;
      const col = palette[s % palette.length];
      sporeColors[s * 3] = col.r;
      sporeColors[s * 3 + 1] = col.g;
      sporeColors[s * 3 + 2] = col.b;
    }
    const sporeGeo = new THREE.BufferGeometry();
    sporeGeo.setAttribute('position', new THREE.BufferAttribute(sporePositions, 3));
    sporeGeo.setAttribute('color', new THREE.BufferAttribute(sporeColors, 3));
    caveSporePoints = new THREE.Points(
      sporeGeo,
      new THREE.PointsMaterial({ size: 0.28, vertexColors: true, transparent: true, opacity: 0.85 })
    );
    caveScene.add(caveSporePoints);

    // 3. Entrance Timber & Stone Dock & Subterranean Moored Custom Boat at (0, 0, 22)
    const dockDeck = new THREE.Mesh(new THREE.BoxGeometry(8.5, 0.5, 10.0), woodDeckMat);
    dockDeck.position.set(0, 0.25, 21.0);
    caveScene.add(dockDeck);

    // Dock Mooring Bollards & Starlight Lanterns
    [[-3.8, 17.0], [3.8, 17.0], [-3.8, 24.5], [3.8, 24.5]].forEach(([bx, bz]) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 1.6, 8), woodDeckMat);
      post.position.set(bx, 0.8, bz);
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 10), crystalCyanMat);
      orb.position.set(bx, 1.7, bz);
      caveScene.add(post, orb);
    });

    caveBoatGroup = new THREE.Group();
    caveBoatGroup.position.set(-5.2, 0.05, 21.5);
    populateCustomBoatMesh(caveBoatGroup, state.boatTier || 1);
    caveScene.add(caveBoatGroup);

    // Exit Archway back to Personal Pocket Atoll at (0, 0, 25.0)
    const exitSign = new THREE.Mesh(
      new THREE.PlaneGeometry(3.8, 1.05),
      new THREE.MeshBasicMaterial({
        map: makeSignTexture('🏝️ ASCEND TO PERSONAL ATOLL', 'RETURN TO SURFACE LAGOON [E]', '#004b93', '#ffda1a'),
        side: THREE.DoubleSide
      })
    );
    exitSign.position.set(0, 3.2, 25.2);
    exitSign.rotation.y = Math.PI;
    caveScene.add(exitSign);

    // 4. Central Bioluminescent Travertine Thermal Mineral Spring at (0, 0.2, -2.0)
    const springOuter = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 6.2, 0.35, 32), terraceMat);
    springOuter.position.set(0, 0.18, -2.0);
    caveScene.add(springOuter);

    const springRing = new THREE.Mesh(new THREE.TorusGeometry(4.8, 0.55, 14, 32), terraceMat);
    springRing.rotation.x = Math.PI / 2;
    springRing.position.set(0, 0.38, -2.0);
    caveScene.add(springRing);

    const springPool = new THREE.Mesh(
      new THREE.CylinderGeometry(4.6, 4.6, 0.34, 32),
      new THREE.MeshBasicMaterial({ map: causticTex, color: 0x2dd4bf, transparent: true, opacity: 0.88 })
    );
    springPool.position.set(0, 0.24, -2.0);
    caveScene.add(springPool);

    // Plush Waterproof Shark Lounging Cushions & Rising Thermal Steam Rings
    thermalSteamRings = [];
    for (let s = 0; s < 3; s++) {
      const sRing = new THREE.Mesh(
        new THREE.TorusGeometry(1.4 + s * 0.75, 0.06, 8, 24),
        new THREE.MeshBasicMaterial({ color: 0x99f6e4, transparent: true, opacity: 0.42 })
      );
      sRing.rotation.x = Math.PI / 2;
      sRing.position.set(0, 0.6 + s * 0.6, -2.0);
      caveScene.add(sRing);
      thermalSteamRings.push({ mesh: sRing, phase: s * 2.1 });
    }

    const springSign = new THREE.Mesh(
      new THREE.PlaneGeometry(3.4, 0.92),
      new THREE.MeshBasicMaterial({
        map: makeSignTexture('♨️ STARLIGHT THERMAL SPRING', 'SOAK FOR 100% COMFORT & SPEED [E]', '#064e3b', '#34d399'),
        side: THREE.DoubleSide
      })
    );
    springSign.position.set(0, 2.7, -6.8);
    caveScene.add(springSign);

    // 5. Six Harvestable Starlight Cave Quartz Crystal Nodes with Craggy Basalt Pedestals
    quartzNodes.length = 0;
    const nodeCoords = [
      { id: 'qnode_1', x: -10.5, z: 9.0, mat: crystalCyanMat, name: 'Azure Starlight Quartz Vein' },
      { id: 'qnode_2', x: 10.5, z: 9.0, mat: crystalVioletMat, name: 'Amethyst Seam Quartz Vein' },
      { id: 'qnode_3', x: -16.0, z: -2.0, mat: crystalEmeraldMat, name: 'Emerald Tide Quartz Vein' },
      { id: 'qnode_4', x: 16.0, z: -2.0, mat: crystalCyanMat, name: 'Sapphire Grotto Quartz Vein' },
      { id: 'qnode_5', x: -9.5, z: -17.5, mat: crystalVioletMat, name: 'Deep Starlight Crystal Cluster' },
      { id: 'qnode_6', x: 9.5, z: -17.5, mat: crystalEmeraldMat, name: 'Prismatic Sea-Cave Quartz Cluster' }
    ];
    nodeCoords.forEach((nc) => {
      const cluster = new THREE.Group();
      cluster.position.set(nc.x, 0.2, nc.z);

      const rockBase = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.45, 0.48, 8), basaltMat);
      rockBase.position.y = 0.22;
      cluster.add(rockBase);

      for (let c = 0; c < 6; c++) {
        const ca = (c / 6) * Math.PI * 2;
        const rad = c === 0 ? 0 : 0.48;
        const h = c === 0 ? 2.55 : (1.45 + (c % 3) * 0.35);
        const shard = new THREE.Mesh(
          new THREE.ConeGeometry(c === 0 ? 0.48 : 0.32, h, 6),
          nc.mat
        );
        shard.position.set(Math.cos(ca) * rad, h * 0.48 + 0.25, Math.sin(ca) * rad);
        if (c > 0) {
          shard.rotation.z = -Math.cos(ca) * 0.32;
          shard.rotation.x = Math.sin(ca) * 0.32;
        }
        cluster.add(shard);
      }
      caveScene.add(cluster);
      quartzNodes.push({
        id: nc.id,
        name: nc.name,
        x: nc.x,
        y: 0.4,
        z: nc.z,
        mesh: cluster,
        harvested: false
      });
    });

    // 6. Subterranean Great Seam Rift at (-14.5, 0.8, -12.0)
    const riftGroup = new THREE.Group();
    riftGroup.position.set(-14.5, 0.8, -12.0);
    const riftPlinth = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 3.0, 0.45, 16), basaltMat);
    riftPlinth.position.y = 0.1;
    riftGroup.add(riftPlinth);

    caveRiftMesh = new THREE.Mesh(
      new THREE.TorusGeometry(2.2, 0.24, 14, 32),
      new THREE.MeshBasicMaterial({ color: 0xc084fc })
    );
    caveRiftMesh.position.y = 2.2;
    riftGroup.add(caveRiftMesh);

    const riftCore = new THREE.Mesh(
      new THREE.CircleGeometry(2.0, 28),
      new THREE.MeshBasicMaterial({ color: 0x7e22ce, transparent: true, opacity: 0.72, side: THREE.DoubleSide })
    );
    riftCore.position.y = 2.2;
    riftGroup.add(riftCore);
    caveScene.add(riftGroup);

    // 7. Subterranean SKÄRHAJ Grotto Lounge Terrace at (13.5, 0.6, -12.0)
    const loungeGroup = new THREE.Group();
    loungeGroup.position.set(13.5, 0.0, -12.0);
    const loungeDeck = new THREE.Mesh(new THREE.BoxGeometry(9.2, 0.6, 9.2), woodDeckMat);
    loungeDeck.position.y = 0.3;
    loungeGroup.add(loungeDeck);

    // Woven Nordic Lounge Rug
    const loungeRug = new THREE.Mesh(
      new THREE.CylinderGeometry(3.4, 3.4, 0.05, 24),
      new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.85 })
    );
    loungeRug.position.set(0, 0.63, 0.4);
    loungeGroup.add(loungeRug);

    // Pair of POÄNG-SHONK Cantilever Armchairs flanking the Vault Chest
    [-2.4, 2.4].forEach((cx) => {
      const chair = new THREE.Group();
      chair.position.set(cx, 0.62, 0.8);
      chair.rotation.y = cx < 0 ? 0.45 : -0.45;
      const cSeat = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.22, 1.2), woodDeckMat);
      cSeat.position.y = 0.42;
      const cBack = new THREE.Mesh(new THREE.BoxGeometry(1.15, 1.1, 0.22), crystalCyanMat);
      cBack.position.set(0, 0.92, -0.45);
      cBack.rotation.x = -0.22;
      chair.add(cSeat, cBack);
      loungeGroup.add(chair);
    });

    // Overhead MASKROS Starlight Dandelion Chandelier above the Grotto Lounge
    const chandelier = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.15, 1),
      new THREE.MeshBasicMaterial({ color: 0xfef08a, wireframe: true })
    );
    chandelier.position.set(0, 5.2, 0);
    loungeGroup.add(chandelier);

    // Banded Mahogany & Gold Archodect Vault Chest on the Lounge Terrace
    const chestBody = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.95, 1.15), woodDeckMat);
    chestBody.position.set(0, 1.08, 0);
    loungeGroup.add(chestBody);
    const chestLid = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 1.72, 12, 1, false, 0, Math.PI), brassMat);
    chestLid.rotation.z = Math.PI / 2;
    chestLid.position.set(0, 1.55, 0);
    loungeGroup.add(chestLid);

    const loungeSign = new THREE.Mesh(
      new THREE.PlaneGeometry(3.4, 0.92),
      new THREE.MeshBasicMaterial({
        map: makeSignTexture('👑 GROTTO LOUNGE & VAULT CHEST', 'CLAIM STARLIGHT FLAT-PACK VAULT [E]', '#1e1b4b', '#fbbf24'),
        side: THREE.DoubleSide
      })
    );
    loungeSign.position.set(0, 2.8, -2.5);
    loungeGroup.add(loungeSign);
    caveScene.add(loungeGroup);

    isBuilt = true;
    return caveScene;
  }

  function getFloorHeight(x, z) {
    if (Math.hypot(x - 13.5, z - (-12.0)) <= 4.6) return 0.6;
    if (Math.abs(x) <= 4.4 && z >= 15.8 && z <= 26.2) return 0.5;
    if (Math.hypot(x, z - (-2.0)) <= 4.8) return 0.25;
    return 0.15;
  }

  function resolveMove(curPos, nextPos) {
    const r = Math.hypot(nextPos.x, nextPos.z - (-2.0));
    if (r > 26.5) {
      const ang = Math.atan2(nextPos.z - (-2.0), nextPos.x);
      nextPos.x = Math.cos(ang) * 26.5;
      nextPos.z = -2.0 + Math.sin(ang) * 26.5;
    }
    const fy = getFloorHeight(nextPos.x, nextPos.z);
    if (nextPos.y < fy) nextPos.y = fy;
    return nextPos;
  }

  function update(dt, elapsed) {
    if (grottoBuffTimer > 0) {
      grottoBuffTimer = Math.max(0, grottoBuffTimer - dt);
    }
    // Update surface animations
    if (sawBladeMesh) sawBladeMesh.rotation.x = elapsed * 8.0;
    if (floatingAllenMesh) {
      floatingAllenMesh.rotation.y = elapsed * 1.8;
      floatingAllenMesh.position.y = 2.1 + Math.sin(elapsed * 2.5) * 0.18;
    }
    if (customAtollBoatGroup) {
      customAtollBoatGroup.position.y = 0.45 + Math.sin(elapsed * 1.9) * 0.08;
      const pw = customAtollBoatGroup.getObjectByName('paddlewheel');
      if (pw) pw.rotation.x = elapsed * 3.5;
    }
    companionSharks.forEach((b, idx) => {
      b.angle += b.speed * dt * 0.45;
      b.mesh.position.x = Math.cos(b.angle) * b.radius;
      b.mesh.position.z = Math.sin(b.angle) * b.radius;
      b.mesh.position.y = 0.12 + Math.sin(elapsed * 3.2 + idx) * 0.08;
      b.mesh.rotation.y = -b.angle + Math.PI * 0.5;
    });

    // Update subterranean sea cave animations
    if (isActive && caveScene) {
      if (caveSporePoints) {
        caveSporePoints.rotation.y = elapsed * 0.06;
        caveSporePoints.position.y = Math.sin(elapsed * 1.1) * 0.35;
      }
      if (thermalSteamRings && thermalSteamRings.length > 0) {
        thermalSteamRings.forEach((sr) => {
          const cycle = ((elapsed * 0.65 + sr.phase) % 3.0) / 3.0;
          sr.mesh.position.y = 0.4 + cycle * 2.2;
          sr.mesh.scale.setScalar(0.85 + cycle * 0.45);
          if (sr.mesh.material) sr.mesh.material.opacity = (1.0 - cycle) * 0.48;
        });
      }
      if (caveRiftMesh) {
        caveRiftMesh.rotation.z = elapsed * 1.4;
        caveRiftMesh.scale.setScalar(1.0 + Math.sin(elapsed * 3.0) * 0.08);
      }
      quartzNodes.forEach((qn, idx) => {
        if (qn.mesh) {
          qn.mesh.rotation.y = elapsed * 0.6 + idx;
          qn.mesh.position.y = 0.2 + Math.sin(elapsed * 2.2 + idx) * 0.08;
        }
      });
    }
  }

  function getSurfaceInteractables(playerPos, worldApi) {
    const list = [];
    if (!playerPos) return list;

    // 1. Main Island Commissions Board at (8.5, y, 16.5)
    const dMainBoard = Math.hypot(playerPos.x - 8.5, playerPos.z - 16.5);
    if (dMainBoard < 10.0) {
      list.push({
        kind: 'homestead_commissions_board',
        label: 'Open Daily Founder Commissions & Homestead Charter [E] 📋👑',
        dist: dMainBoard
      });
    }

    // 2. Personal Atoll Pier Commissions & Shipyard Board at (3.8, 1.55, 153.5)
    const dAtollBoard = Math.hypot(playerPos.x - 3.8, playerPos.z - 153.5);
    if (dAtollBoard < 10.0) {
      list.push({
        kind: 'homestead_commissions_board',
        label: 'Open BÅT-BYGGE Boat Shipyard & Daily Commissions [E] ⚓📋',
        dist: dAtollBoard
      });
    }

    // 3. Personal Atoll Moored Custom Flat-Pack Boat at (0, 0.45, 145.5)
    const dCustomBoat = Math.hypot(playerPos.x - 0, playerPos.z - 145.5);
    if (dCustomBoat < 9.5) {
      const boatSpec = getBoatSpec(state.boatTier);
      list.push({
        kind: 'homestead_board_custom_boat',
        label: `Sail ${boatSpec.name} (${boatSpec.badge}) [E] ⛵💨`,
        dist: dCustomBoat
      });
    }

    // 4. BYGGBÄNK Sawmill & Flat-Pack Assembly Bench at (9.5, y, 195.0)
    const dBench = Math.hypot(playerPos.x - 9.5, playerPos.z - 195.0);
    if (dBench < 9.5) {
      list.push({
        kind: 'homestead_sawmill_bench',
        label: 'Use BYGGBÄNK Sawmill: Mill +2x SKÄRHAJ Flat-Pack Kits [E] 🪚📦',
        dist: dBench
      });
    }

    // 5. Rescued Spawning-Pit Baby Shark Companion Lagoon at (-9.5, y, 196.0)
    const dBabies = Math.hypot(playerPos.x - (-9.5), playerPos.z - 196.0);
    if (dBabies < 9.5) {
      list.push({
        kind: 'homestead_cuddle_babies',
        label: `Boop & Cuddle Rescued Spawning-Pit Baby Sharks (${companionSharks.length} Companions) [E] 🦈💕`,
        dist: dBabies
      });
    }

    // 6. Natural Bioluminescent Sea-Cave Archway at (0, y, 224.0)
    const dCaveArch = Math.hypot(playerPos.x - 0, playerPos.z - 224.0);
    if (dCaveArch < 10.5) {
      list.push({
        kind: 'homestead_enter_sea_cave',
        label: 'Descend into 3D Bioluminescent Starlight Sea-Cave Grotto [E] 💎🌊',
        dist: dCaveArch
      });
    }

    // 7. Also allow entering the 3D Sea-Cave from any player-built GROTTHAJ hatch (skarhaj_grotto_hatch)!
    if (worldApi && typeof worldApi.getBuiltStructures === 'function') {
      const built = worldApi.getBuiltStructures();
      for (let i = 0; i < built.length; i++) {
        const st = built[i];
        if (st.type === 'skarhaj_grotto_hatch') {
          const dh = Math.hypot(playerPos.x - st.x, playerPos.z - st.z);
          if (dh < 7.5) {
            list.push({
              kind: 'homestead_enter_sea_cave',
              label: 'Descend GROTTHAJ Hatch into 3D Bioluminescent Sea-Cave [E] 💎🌊',
              dist: dh
            });
          }
        }
      }
    }

    return list;
  }

  function getCaveInteractables(playerPos) {
    const list = [];
    if (!isActive || !playerPos) return list;

    // 1. Exit to Personal Pocket Atoll at (0, 0.5, 23.5)
    const dExit = Math.hypot(playerPos.x - 0, playerPos.z - 23.5);
    if (dExit < 8.5) {
      list.push({
        kind: 'seacave_exit',
        label: 'Ascend to Personal Pocket Atoll Lagoon [E] 🏝️✨',
        dist: dExit
      });
    }

    // 2. Thermal Mineral Spring at (0, 0.2, -2.0)
    const dSpring = Math.hypot(playerPos.x - 0, playerPos.z - (-2.0));
    if (dSpring < 7.5) {
      list.push({
        kind: 'seacave_thermal_spring',
        label: 'Soak in Bioluminescent Thermal Spring (+100% Comfort & Grotto Speed Buff) [E] ♨️💎',
        dist: dSpring
      });
    }

    // 3. Six Harvestable Starlight Quartz Crystal Nodes
    quartzNodes.forEach((qn) => {
      const dq = Math.hypot(playerPos.x - qn.x, playerPos.z - qn.z);
      if (dq < 6.8) {
        list.push({
          kind: 'seacave_harvest_quartz',
          nodeId: qn.id,
          nodeName: qn.name,
          label: `Harvest ${qn.name} (+1x Starlight Quartz 💎 & +1x Flat-Pack Kit 📦) [E]`,
          dist: dq
        });
      }
    });

    // 4. Subterranean Great Seam Rift at (-14.5, 0.8, -12.0)
    const dRift = Math.hypot(playerPos.x - (-14.5), playerPos.z - (-12.0));
    if (dRift < 7.5) {
      list.push({
        kind: 'seacave_mend_rift',
        label: 'Mend Subterranean Great Seam Rift (Nimue Commission · +1x Starlight Quartz 💎) [E] 🪡✨',
        dist: dRift
      });
    }

    // 5. Subterranean Grotto Lounge Vault Chest at (13.5, 0.6, -12.0)
    const dChest = Math.hypot(playerPos.x - 13.5, playerPos.z - (-12.0));
    if (dChest < 7.5) {
      list.push({
        kind: 'seacave_lounge_vault',
        label: 'Claim Subterranean Grotto Archodect Chest (+3x SKÄRHAJ Kits 📦 & +2x Starlight Quartz 💎) [E] 👑',
        dist: dChest
      });
    }

    return list;
  }

  function getBoatSpec(tier) {
    const cat = (window.BLAHAJ_LORE && window.BLAHAJ_LORE.boatCatalog) || [];
    return cat.find((b) => b.tier === tier) || cat[0] || {
      tier: 1,
      code: 'SKIFF-ETT',
      name: 'SKIFF-ETT · Cozy Birch Rowboat',
      speedMult: 1.0,
      badge: '1.0x Speed'
    };
  }

  function setBoatTier(tier) {
    state.boatTier = Math.max(1, Math.min(3, tier));
    saveState();
    if (customAtollBoatGroup) populateCustomBoatMesh(customAtollBoatGroup, state.boatTier);
    if (caveBoatGroup) populateCustomBoatMesh(caveBoatGroup, state.boatTier);
    return getBoatSpec(state.boatTier);
  }

  function recordCommissionProgress(commId, amount = 1) {
    if (!state.commissionsProgress[commId]) state.commissionsProgress[commId] = 0;
    state.commissionsProgress[commId] += amount;
    saveState();
    return state.commissionsProgress[commId];
  }

  function isCommissionClaimed(commId) {
    return !!state.commissionsClaimed[commId];
  }

  function markCommissionClaimed(commId) {
    state.commissionsClaimed[commId] = true;
    saveState();
  }

  function setVisitedFriendAtoll(code, hostName) {
    state.visitedFriendCode = code ? String(code).trim().toUpperCase() : null;
    state.visitedFriendName = hostName || null;
    saveState();
    updateFriendBannerCanvas();
  }

  function harvestQuartzNode(nodeId) {
    const qn = quartzNodes.find((n) => n.id === nodeId);
    if (qn && qn.mesh) {
      qn.mesh.scale.setScalar(0.72);
      setTimeout(() => {
        if (qn.mesh) qn.mesh.scale.setScalar(1.0);
      }, 4500);
    }
    recordCommissionProgress('comm_nimue_seam', 1);
    return qn;
  }

  function activateGrottoSpringBuff() {
    grottoBuffTimer = 300.0; // 5 minutes of +25% Starlight Grotto speed
    return grottoBuffTimer;
  }

  return {
    build,
    buildSurfaceSetPieces,
    getScene: () => caveScene,
    setActive: (v) => { isActive = !!v; },
    isActive: () => isActive,
    getStart: () => ({ x: 0, y: 0.5, z: 20.5, rotY: Math.PI }),
    getFloorHeight,
    resolveMove,
    update,
    getSurfaceInteractables,
    getCaveInteractables,
    getBoatTier: () => state.boatTier || 1,
    getBoatSpec: () => getBoatSpec(state.boatTier || 1),
    getBoatSpeedMultiplier: () => getBoatSpec(state.boatTier || 1).speedMult || 1.0,
    setBoatTier,
    getState: () => state,
    recordCommissionProgress,
    isCommissionClaimed,
    markCommissionClaimed,
    setVisitedFriendAtoll,
    harvestQuartzNode,
    activateGrottoSpringBuff,
    hasGrottoBuff: () => grottoBuffTimer > 0,
    refreshCompanionBabySharks: () => {
      if (companionSharks.length > 0 && companionSharks[0].mesh && companionSharks[0].mesh.parent) {
        refreshCompanionBabySharks(companionSharks[0].mesh.parent);
      }
    }
  };
})();
