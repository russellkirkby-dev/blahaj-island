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

  // Build 3D Custom Flat-Pack Boat Model based on Tier (1: SKIFF-ETT, 2: SEGEL-TVÅ, 3: ÅNGBÅT-TRE)
  function populateCustomBoatMesh(group, tier) {
    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }
    const birchMat = new THREE.MeshStandardMaterial({ color: 0xe2c08d, roughness: 0.65 });
    const mahoganyMat = new THREE.MeshStandardMaterial({ color: 0x6e2c1b, roughness: 0.45 });
    const navyMat = new THREE.MeshStandardMaterial({ color: 0x0058a3, roughness: 0.5 });
    const yellowMat = new THREE.MeshStandardMaterial({ color: 0xffda1a, roughness: 0.4 });
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.78, roughness: 0.22 });
    const hullMat = tier >= 3 ? mahoganyMat : (tier === 2 ? navyMat : birchMat);

    // Hull base
    const hull = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.75, 5.2), hullMat);
    hull.position.set(0, 0.35, 0);
    hull.castShadow = true;
    group.add(hull);

    // Bow prow wedge
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
      // Tier 1: SKIFF-ETT — Twin Scandinavian Ash Oars & Bench
      const bench = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.14, 0.55), mahoganyMat);
      bench.position.set(0, 0.92, 0.2);
      group.add(bench);
      [-1.35, 1.35].forEach((ox) => {
        const oar = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3.2, 8), birchMat);
        oar.rotation.z = ox > 0 ? -1.1 : 1.1;
        oar.position.set(ox, 0.95, 0.2);
        group.add(oar);
      });
    } else if (tier === 2) {
      // Tier 2: SEGEL-TVÅ — Outrigger Pontoons, Blue/Yellow SKÄRHAJ Mainsail & Flat-Pack Cargo Rack
      [-2.15, 2.15].forEach((px) => {
        const pontoon = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 4.2, 10), yellowMat);
        pontoon.rotation.x = Math.PI / 2;
        pontoon.position.set(px, 0.25, 0);
        group.add(pontoon);
        const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.2, 8), birchMat);
        strut.rotation.z = Math.PI / 2;
        strut.position.set(px * 0.5, 0.65, 0);
        group.add(strut);
      });
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 5.2, 10), birchMat);
      mast.position.set(0, 3.3, 0.4);
      group.add(mast);
      const sail = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 3.4, 2.5),
        new THREE.MeshStandardMaterial({ color: 0xffda1a, emissive: 0x0058a3, emissiveIntensity: 0.18 })
      );
      sail.position.set(0, 3.4, -0.4);
      group.add(sail);
      // Stacked SKÄRHAJ Flat-Pack Cargo Boxes on stern
      for (let b = 0; b < 2; b++) {
        const box = new THREE.Mesh(
          new THREE.BoxGeometry(1.3, 0.26, 0.9),
          new THREE.MeshStandardMaterial({ color: 0xd4a373, roughness: 0.8 })
        );
        box.position.set(0, 0.96 + b * 0.28, -1.65);
        group.add(box);
      }
    } else {
      // Tier 3: ÅNGBÅT-TRE — Volcanic & Starlight Steam Launch with Copper Boiler, Smokestack, Whistle & Stern Paddlewheel!
      const canopyRoof = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.14, 3.4), mahoganyMat);
      canopyRoof.position.set(0, 2.95, -0.2);
      group.add(canopyRoof);
      [[-1.05, -1.6], [1.05, -1.6], [-1.05, 1.2], [1.05, 1.2]].forEach(([px, pz]) => {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.1, 8), brassMat);
        post.position.set(px, 1.88, pz);
        group.add(post);
      });
      // Copper Steam Boiler & Brass Smokestack
      const boiler = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 1.4, 14), brassMat);
      boiler.rotation.x = Math.PI / 2;
      boiler.position.set(0, 1.25, 1.1);
      group.add(boiler);
      const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 2.2, 12), brassMat);
      stack.position.set(0, 2.8, 1.2);
      group.add(stack);
      // Musical Brass Steam Whistle on side of stack
      const whistle = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.55, 8), yellowMat);
      whistle.position.set(0.28, 3.1, 1.2);
      group.add(whistle);
      // Stern Paddlewheel
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 1.8, 12), mahoganyMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(0, 0.55, -2.95);
      wheel.name = 'paddlewheel';
      group.add(wheel);
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

    const birchMat = new THREE.MeshStandardMaterial({ color: 0xd4a373, roughness: 0.7 });
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.2 });
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.8, roughness: 0.2 });

    const tableTop = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.25, 2.0), birchMat);
    tableTop.position.set(0, 1.15, 0);
    benchGroup.add(tableTop);

    [[-1.6, -0.8], [1.6, -0.8], [-1.6, 0.8], [1.6, 0.8]].forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.15, 0.22), birchMat);
      leg.position.set(lx, 0.57, lz);
      benchGroup.add(leg);
    });

    // Spinning Circular Sawmill Blade
    sawBladeMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.06, 20), steelMat);
    sawBladeMesh.rotation.z = Math.PI / 2;
    sawBladeMesh.position.set(-0.7, 1.45, 0);
    benchGroup.add(sawBladeMesh);

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

    const poolRing = new THREE.Mesh(
      new THREE.TorusGeometry(4.2, 0.45, 12, 28),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.85 })
    );
    poolRing.rotation.x = Math.PI / 2;
    poolRing.position.y = 0.25;
    poolGroup.add(poolRing);

    const poolWater = new THREE.Mesh(
      new THREE.CylinderGeometry(4.0, 4.0, 0.18, 24),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.78 })
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

    const basaltMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 });
    const crystalMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const violetCrystalMat = new THREE.MeshBasicMaterial({ color: 0xa855f7 });

    [-3.2, 3.2].forEach((px) => {
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.45, 5.2, 10), basaltMat);
      pillar.position.set(px, 2.5, 0);
      archGroup.add(pillar);
    });
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(8.2, 1.6, 2.8), basaltMat);
    lintel.position.set(0, 5.2, 0);
    archGroup.add(lintel);

    // Glowing Starlight Portal Curtain inside the Sea-Cave Arch
    const portalDisc = new THREE.Mesh(
      new THREE.CircleGeometry(2.8, 24),
      new THREE.MeshBasicMaterial({ color: 0x0ea5e9, transparent: true, opacity: 0.72, side: THREE.DoubleSide })
    );
    portalDisc.position.set(0, 2.5, 0);
    archGroup.add(portalDisc);

    // Glowing Quartz Crystal Clusters framing the Sea-Cave mouth
    [[-2.5, 1.2, 0.9], [2.5, 1.2, 0.9], [-2.1, 4.2, 0.9], [2.1, 4.2, 0.9]].forEach(([cx, cy, cz], idx) => {
      const crys = new THREE.Mesh(
        new THREE.ConeGeometry(0.38, 1.45, 6),
        idx % 2 === 0 ? crystalMat : violetCrystalMat
      );
      crys.position.set(cx, cy, cz);
      crys.rotation.z = cx < 0 ? -0.35 : 0.35;
      archGroup.add(crys);
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
    names.forEach((name, idx) => {
      const babyGroup = new THREE.Group();
      const bodyMat = new THREE.MeshStandardMaterial({ color: colors[idx % colors.length], roughness: 0.75 });
      const bellyMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 });

      const body = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 10), bodyMat);
      body.scale.set(0.85, 0.65, 1.55);
      body.position.y = 0.42;
      babyGroup.add(body);

      const belly = new THREE.Mesh(new THREE.SphereGeometry(0.36, 10, 8), bellyMat);
      belly.scale.set(0.78, 0.45, 1.38);
      belly.position.set(0, 0.30, 0.05);
      babyGroup.add(belly);

      const dorsal = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.42, 4), bodyMat);
      dorsal.position.set(0, 0.75, -0.05);
      babyGroup.add(dorsal);

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
  async function build() {
    if (isBuilt && caveScene) return caveScene;
    caveScene = new THREE.Scene();
    caveScene.background = new THREE.Color(0x050e1d);
    caveScene.fog = new THREE.FogExp2(0x07162c, 0.014);

    const hemi = new THREE.HemisphereLight(0x38bdf8, 0x1e1b4b, 0.85);
    caveScene.add(hemi);

    const centerLight = new THREE.PointLight(0x22d3ee, 1.8, 65);
    centerLight.position.set(0, 9.5, -2);
    caveScene.add(centerLight);

    const violetLight = new THREE.PointLight(0xa855f7, 1.4, 55);
    violetLight.position.set(-14, 7.5, -12);
    caveScene.add(violetLight);

    const warmLoungeLight = new THREE.PointLight(0xfde047, 1.5, 45);
    warmLoungeLight.position.set(13.5, 6.5, -12);
    caveScene.add(warmLoungeLight);

    const basaltMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.88 });
    const terraceMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.75 });
    const crystalCyanMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.85,
      roughness: 0.2
    });
    const crystalVioletMat = new THREE.MeshStandardMaterial({
      color: 0xc084fc,
      emissive: 0x7e22ce,
      emissiveIntensity: 0.85,
      roughness: 0.2
    });
    const crystalEmeraldMat = new THREE.MeshStandardMaterial({
      color: 0x34d399,
      emissive: 0x059669,
      emissiveIntensity: 0.85,
      roughness: 0.2
    });

    // 1. Subterranean Cavern Floor & Glowing Lagoon Water
    const floorMesh = new THREE.Mesh(new THREE.CylinderGeometry(36, 38, 1.2, 36), basaltMat);
    floorMesh.position.set(0, -0.6, -2);
    floorMesh.receiveShadow = true;
    caveScene.add(floorMesh);

    caveWaterMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(34, 34, 0.2, 32),
      new THREE.MeshBasicMaterial({ color: 0x0891b2, transparent: true, opacity: 0.55 })
    );
    caveWaterMesh.position.set(0, -0.08, -2);
    caveScene.add(caveWaterMesh);

    // 2. Cavern Dome Walls & 96 Bioluminescent Glow-Worm Stalactites
    const domeGeo = new THREE.SphereGeometry(37, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.52);
    const domeMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.95, side: THREE.BackSide });
    const dome = new THREE.Mesh(domeGeo, domeMat);
    dome.position.set(0, -1.0, -2);
    caveScene.add(dome);

    for (let i = 0; i < 84; i++) {
      const ang = (i / 84) * Math.PI * 2 + (i % 5) * 0.3;
      const rad = 4.0 + ((i * 7) % 27);
      const sx = Math.cos(ang) * rad;
      const sz = Math.sin(ang) * rad - 2.0;
      const h = 1.6 + (i % 4) * 0.95;
      const mat = i % 3 === 0 ? crystalCyanMat : (i % 3 === 1 ? crystalVioletMat : crystalEmeraldMat);
      const stal = new THREE.Mesh(new THREE.ConeGeometry(0.32, h, 6), mat);
      stal.rotation.x = Math.PI;
      stal.position.set(sx, 14.5 - (rad * rad) * 0.006, sz);
      caveScene.add(stal);
      caveStalactites.push(stal);
    }

    // 3. Entrance Dock & Subterranean Moored Custom Boat at (0, 0, 22)
    const dockDeck = new THREE.Mesh(new THREE.BoxGeometry(8.5, 0.5, 10.0), terraceMat);
    dockDeck.position.set(0, 0.25, 21.0);
    caveScene.add(dockDeck);

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

    // 4. Central Bioluminescent Thermal Mineral Spring at (0, 0.2, -2.0)
    const springRing = new THREE.Mesh(new THREE.TorusGeometry(4.8, 0.55, 12, 28), terraceMat);
    springRing.rotation.x = Math.PI / 2;
    springRing.position.set(0, 0.35, -2.0);
    caveScene.add(springRing);

    const springPool = new THREE.Mesh(
      new THREE.CylinderGeometry(4.5, 4.5, 0.32, 28),
      new THREE.MeshBasicMaterial({ color: 0x2dd4bf, transparent: true, opacity: 0.82 })
    );
    springPool.position.set(0, 0.22, -2.0);
    caveScene.add(springPool);

    const springSign = new THREE.Mesh(
      new THREE.PlaneGeometry(3.4, 0.92),
      new THREE.MeshBasicMaterial({
        map: makeSignTexture('♨️ STARLIGHT THERMAL SPRING', 'SOAK FOR 100% COMFORT & SPEED [E]', '#064e3b', '#34d399'),
        side: THREE.DoubleSide
      })
    );
    springSign.position.set(0, 2.7, -6.8);
    caveScene.add(springSign);

    // 5. Six Harvestable Starlight Cave Quartz Crystal Nodes
    quartzNodes.length = 0;
    const nodeCoords = [
      { id: 'qnode_1', x: -10.5, z: 9.0, mat: crystalCyanMat, name: 'Azure Starlight Quartz Vein' },
      { id: 'qnode_2', x: 10.5, z: 9.0, mat: crystalVioletMat, name: 'Amethyst Seam Quartz Vein' },
      { id: 'qnode_3', x: -16.0, z: -2.0, mat: crystalEmeraldMat, name: 'Emerald Tide Quartz Vein' },
      { id: 'qnode_4', x: 16.0, z: -2.0, mat: crystalCyanMat, name: 'Sapphire Grotto Quartz Vein' },
      { id: 'qnode_5', x: -9.5, z: -17.5, mat: crystalVioletMat, name: 'Deep Starlight Crystal Cluster' },
      { id: 'qnode_6', x: 9.5, z: -17.5, mat: crystalEmeraldMat, name: 'Prismatic Sea-Cave Quartz Cluster' }
    ];
    nodeCoords.forEach((nc, idx) => {
      const cluster = new THREE.Group();
      cluster.position.set(nc.x, 0.2, nc.z);
      for (let c = 0; c < 4; c++) {
        const shard = new THREE.Mesh(
          new THREE.ConeGeometry(0.45 - c * 0.06, 2.2 - c * 0.25, 6),
          nc.mat
        );
        shard.position.set((c - 1.5) * 0.35, 0.9, (c % 2) * 0.25);
        shard.rotation.z = (c - 1.5) * 0.22;
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
    caveRiftMesh = new THREE.Mesh(
      new THREE.TorusGeometry(2.2, 0.24, 12, 28),
      new THREE.MeshBasicMaterial({ color: 0xc084fc })
    );
    caveRiftMesh.position.y = 2.2;
    riftGroup.add(caveRiftMesh);

    const riftCore = new THREE.Mesh(
      new THREE.CircleGeometry(2.0, 24),
      new THREE.MeshBasicMaterial({ color: 0x7e22ce, transparent: true, opacity: 0.68, side: THREE.DoubleSide })
    );
    riftCore.position.y = 2.2;
    riftGroup.add(riftCore);
    caveScene.add(riftGroup);

    // 7. Subterranean SKÄRHAJ Grotto Lounge Terrace at (13.5, 0.6, -12.0)
    const loungeGroup = new THREE.Group();
    loungeGroup.position.set(13.5, 0.0, -12.0);
    const loungeDeck = new THREE.Mesh(new THREE.BoxGeometry(9.0, 0.6, 9.0), terraceMat);
    loungeDeck.position.y = 0.3;
    loungeGroup.add(loungeDeck);

    // Grotto Golden Archodect Chest on the Lounge Terrace
    const chestBody = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 1.1, 1.1),
      new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.72, roughness: 0.24 })
    );
    chestBody.position.set(0, 1.15, 0);
    loungeGroup.add(chestBody);

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
