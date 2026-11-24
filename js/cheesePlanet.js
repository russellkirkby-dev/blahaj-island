// ============================================================================
// BLÅHAJ ISLAND — SWISS CHEESE PLANETOID ("PITCH BLACK" ECLIPSE CANYON SPHERE)
// ============================================================================
// Reached by clearing all destructible asteroids in Deep Space and holding
// [Shift] for 5 seconds (or flying through the Golden Cheese Moon Warp Gate).
//
// Features:
//  1. Single Connected Semi-Spherical / Spherical Blocky Swiss Cheese Planetoid:
//     - Radius ~155m centered at (0, -155, 0), with deep carved canyon trenches
//       wrapping continuously 360° around the entire sphere (Equatorial Grand
//       Trench, Meridian Cross-Trench, and Diagonal Rift Trench).
//     - Stepped, blocky, eerie dark-gold Swiss-cheese cliff faces and dark pores
//       carved directly into the planetoid mesh.
//  2. Spherical Planetoid Gravity Alignment:
//     - As you fly forward in a straight line, the planetoid's gravity field
//       automatically curves your local horizon around the sphere, so flying
//       straight carries you in a continuous great-circle orbit right down the
//       curved canyon trenches without having to constantly pitch down!
//  3. Inverted 1980s Space Invaders & Destructible Swiss Cheese Bunkers:
//     - Destructible blocky Swiss-cheese arches, bridge blocks, and bunker
//       barriers sit inside the canyon trenches.
//     - 1980s 2D Pixel-Art Space Invader shadow-sprites emerge from the dark
//       cheese holes, hide behind the Swiss-cheese bunker blocks for cover,
//       and ambush/latch onto your UFO when you fly past!
//     - Your Ray Turrets and Sonic Shockwave blow apart the Swiss-cheese bunker
//       blocks (sending golden cheese chunks flying) and vaporize the hiding
//       Space Invaders!
// ============================================================================

window.BlahajCheeseMoon = (function () {
  let cheeseScene = null;
  let isBuilt = false;

  const PLANET_CENTER = new THREE.Vector3(0, -155, 0);
  const PLANET_BASE_RADIUS = 155.0;
  const TRENCH_FLOOR_RADIUS = 126.0;
  const PLATEAU_TOP_RADIUS = 162.0;

  let planetMesh = null;
  const cheeseHoles = [];
  const cheeseBunkers = [];
  const invaders = [];
  const bursts = [];
  let eclipseGroup = null;
  let reentryGateGroup = null;
  let reentryRingMesh = null;
  let invaderSpawnTimer = 0;
  let nextInvaderId = 1;
  let invadersClearedCount = 0;
  let bunkersDestroyedCount = 0;

  // Positioned in high orbit above the North Crown of the planetoid
  const REENTRY_POS = new THREE.Vector3(0, 78, 92);
  const REENTRY_RADIUS = 18.0;

  // Classic 1980s 11x8 Space Invader pixel bitmaps
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
      '00011111000',
      '01111111110',
      '11111111111',
      '11100100111',
      '11111111111',
      '00110001100',
      '01101110110',
      '11000000011'
    ]
  ];

  const invaderTextures = [];

  function seededRand(seed) {
    const s = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
    return s - Math.floor(s);
  }

  function createInvaderTexture(bitmap, glowColor = '#bae6fd', shadowTint = '#0f172a') {
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 48;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, 64, 48);

    // Eerie Pitch-Black shadow aura behind the 2D pixel invader
    const grad = ctx.createRadialGradient(32, 24, 3, 32, 24, 28);
    grad.addColorStop(0, 'rgba(6, 8, 18, 0.92)');
    grad.addColorStop(0.6, 'rgba(15, 23, 42, 0.55)');
    grad.addColorStop(1, 'rgba(15, 23, 42, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 48);

    const px = 4;
    const ox = 10;
    const oy = 8;
    for (let y = 0; y < bitmap.length; y++) {
      const row = bitmap[y];
      for (let x = 0; x < row.length; x++) {
        if (row[x] === '1') {
          ctx.fillStyle = shadowTint;
          ctx.fillRect(ox + x * px + 1, oy + y * px + 1, px, px);
          ctx.fillStyle = glowColor;
          ctx.fillRect(ox + x * px, oy + y * px, px - 0.25, px - 0.25);
        }
      }
    }

    const tex = new THREE.CanvasTexture(c);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    return tex;
  }

  function createEerieCheeseTexture() {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 512;
    const ctx = c.getContext('2d');

    // Eerie Pitch-Black eclipsed golden-amber Swiss cheese base
    const g = ctx.createLinearGradient(0, 0, 512, 512);
    g.addColorStop(0, '#eab308');
    g.addColorStop(0.5, '#ca8a04');
    g.addColorStop(1, '#854d0e');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 512, 512);

    // Blocky stratum lines & weathered crust
    for (let i = 0; i < 900; i++) {
      const x = seededRand(i * 7 + 1) * 512;
      const y = seededRand(i * 7 + 2) * 512;
      const w = 4 + seededRand(i * 7 + 3) * 18;
      const h = 2 + seededRand(i * 7 + 4) * 8;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(66, 32, 6, 0.24)' : 'rgba(254, 240, 138, 0.16)';
      ctx.fillRect(x, y, w, h);
    }

    // Deep dark Swiss-cheese holes & pores across the surface
    for (let i = 0; i < 68; i++) {
      const x = seededRand(i * 19 + 5) * 460 + 26;
      const y = seededRand(i * 19 + 6) * 460 + 26;
      const rad = 8 + seededRand(i * 19 + 7) * 24;
      const hg = ctx.createRadialGradient(x - rad * 0.2, y - rad * 0.2, 1, x, y, rad);
      hg.addColorStop(0, '#070503');
      hg.addColorStop(0.58, '#291504');
      hg.addColorStop(0.85, '#713f12');
      hg.addColorStop(1, 'rgba(133, 77, 14, 0.0)');
      ctx.fillStyle = hg;
      ctx.beginPath();
      ctx.arc(x, y, rad, 0, Math.PI * 2);
      ctx.fill();
    }

    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(6, 6);
    return tex;
  }

  /**
   * Deterministic terrain radius function for the single connected Swiss Cheese Planetoid!
   * Given any 3D unit direction (nx, ny, nz) from PLANET_CENTER, returns the exact surface
   * radius at that point, carving 3 interlocking, blocky, winding canyon trenches all the
   * way around the sphere!
   */
  function getPlanetRadiusAtNormal(nx, ny, nz) {
    // 3 Great-Circle Canyon Trenches wrapping 360 degrees around the planetoid:
    // Trench 1: Winding Equatorial / Meridian Canyon (passes right under spawn in the X=0 plane!)
    const wobble1 = Math.sin(ny * 5.0 + nz * 4.0) * 0.08;
    const d1 = Math.abs(nx + wobble1);

    // Trench 2: Equatorial Belt Canyon (wraps around the Y=0.15 latitude ring)
    const wobble2 = Math.sin(nx * 5.0 - nz * 4.0) * 0.07;
    const d2 = Math.abs(ny - 0.12 + wobble2);

    // Trench 3: Diagonal Cross-Rift Canyon
    const d3 = Math.abs((nx * 0.68 + nz * 0.73) + Math.sin(ny * 6.0) * 0.06);

    const minTrenchDist = Math.min(d1, d2, d3);

    // Trench half-width in unit-normal space (~0.175 rad -> ~27m half-width = 54m wide canyon!)
    const trenchFloorHalf = 0.145;
    const trenchWallHalf = 0.205;

    // Blocky stepped cheese noise on plateaus
    const blockHash = Math.sin(Math.floor(nx * 14) * 19.1 + Math.floor(ny * 14) * 31.7 + Math.floor(nz * 14) * 47.3);
    const blockStep = Math.round(blockHash * 3.0) * 2.4;

    // Swiss-cheese crater dimples on plateaus
    const poreWave = Math.sin(nx * 24.0) * Math.cos(ny * 24.0) * Math.sin(nz * 24.0);
    const poreDip = poreWave > 0.52 ? -(poreWave - 0.52) * 26.0 : 0;

    if (minTrenchDist <= trenchFloorHalf) {
      // Flat/stepped canyon floor carved deep into the planetoid
      const floorStep = Math.round(Math.sin(nx * 18 + nz * 18) * 1.5) * 0.9;
      return TRENCH_FLOOR_RADIUS + floorStep;
    }
    if (minTrenchDist <= trenchWallHalf) {
      // Steep, blocky terraced Swiss-cheese canyon walls (3 quantized steps for that blocky cheese cliff look!)
      const u = (minTrenchDist - trenchFloorHalf) / (trenchWallHalf - trenchFloorHalf);
      const steppedU = Math.min(1.0, Math.floor(u * 4.0) / 3.0);
      return TRENCH_FLOOR_RADIUS + steppedU * (PLATEAU_TOP_RADIUS - TRENCH_FLOOR_RADIUS) + blockStep * 0.4;
    }

    return PLATEAU_TOP_RADIUS + blockStep + poreDip;
  }

  function build() {
    if (isBuilt && cheeseScene) return cheeseScene;

    cheeseScene = new THREE.Scene();
    cheeseScene.background = new THREE.Color(0x060504);
    cheeseScene.fog = new THREE.FogExp2(0x140e06, 0.0022);

    // Pitch-Black Eclipse Lighting: dramatic golden corona rim light + eerie dark shadow fill
    const amb = new THREE.AmbientLight(0x3f2e18, 0.95);
    cheeseScene.add(amb);

    const eclipseSun = new THREE.DirectionalLight(0xfde047, 1.95);
    eclipseSun.position.set(110, 165, -310);
    cheeseScene.add(eclipseSun);

    const backRim = new THREE.DirectionalLight(0xd97706, 0.75);
    backRim.position.set(-140, -180, 220);
    cheeseScene.add(backRim);

    const hemi = new THREE.HemisphereLight(0xfacc15, 0x120c05, 0.65);
    cheeseScene.add(hemi);

    // 1. Starfield & Pitch-Black Total Solar Eclipse
    const starCount = 1600;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const u = seededRand(i * 3 + 1);
      const v = seededRand(i * 3 + 2);
      const th = u * Math.PI * 2;
      const ph = Math.acos(2 * v - 1);
      const r = 820 + (i % 220);
      starPos[i * 3] = r * Math.sin(ph) * Math.cos(th);
      starPos[i * 3 + 1] = r * Math.cos(ph) - 120;
      starPos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    cheeseScene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xfef3c7, size: 2.3, transparent: true, opacity: 0.88 })));

    eclipseGroup = new THREE.Group();
    eclipseGroup.position.set(65, 145, -380);
    const eclipseBody = new THREE.Mesh(
      new THREE.CircleGeometry(48, 40),
      new THREE.MeshBasicMaterial({ color: 0x040406 })
    );
    const coronaInner = new THREE.Mesh(
      new THREE.RingGeometry(47.2, 55.5, 48),
      new THREE.MeshBasicMaterial({ color: 0xfef08a, transparent: true, opacity: 0.95, side: THREE.DoubleSide })
    );
    const coronaOuter = new THREE.Mesh(
      new THREE.RingGeometry(52, 84, 48),
      new THREE.MeshBasicMaterial({ color: 0xea580c, transparent: true, opacity: 0.32, side: THREE.DoubleSide })
    );
    coronaInner.position.z = -0.5;
    coronaOuter.position.z = -1.0;
    eclipseGroup.add(eclipseBody, coronaInner, coronaOuter);
    cheeseScene.add(eclipseGroup);

    // 2. Single Connected Blocky Semi-Spherical / Spherical Swiss Cheese Planetoid with Carved Trenches!
    const cheeseTex = createEerieCheeseTexture();
    const cheeseMat = new THREE.MeshStandardMaterial({
      map: cheeseTex,
      bumpMap: cheeseTex,
      bumpScale: 0.85,
      roughness: 0.84,
      metalness: 0.06,
      flatShading: true
    });

    // High-detail Box-Sphere / Icosahedron displaced into a single cohesive trenched Swiss-cheese planetoid!
    const planetGeo = new THREE.IcosahedronGeometry(1.0, 5);
    const posAttr = planetGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      const vy = posAttr.getY(i);
      const vz = posAttr.getZ(i);
      const len = Math.hypot(vx, vy, vz) || 1;
      const nx = vx / len;
      const ny = vy / len;
      const nz = vz / len;

      // Subtle blocky vertex quantization to give the sphere a chiseled, blocky Swiss-cheese aesthetic
      const qnx = Math.round(nx * 28) / 28;
      const qny = Math.round(ny * 28) / 28;
      const qnz = Math.round(nz * 28) / 28;
      const qLen = Math.hypot(qnx, qny, qnz) || 1;

      const rad = getPlanetRadiusAtNormal(nx, ny, nz);
      posAttr.setXYZ(
        i,
        (qnx / qLen) * rad * 0.35 + nx * rad * 0.65,
        (qny / qLen) * rad * 0.35 + ny * rad * 0.65,
        (qnz / qLen) * rad * 0.35 + nz * rad * 0.65
      );
    }
    planetGeo.computeVertexNormals();
    planetMesh = new THREE.Mesh(planetGeo, cheeseMat);
    planetMesh.position.copy(PLANET_CENTER);
    cheeseScene.add(planetMesh);

    // 3. Dark Swiss Cheese Caves/Holes Embedded Directly into the Trench Walls + Destructible Cheese Bunkers!
    cheeseHoles.length = 0;
    cheeseBunkers.length = 0;
    const holeDarkMat = new THREE.MeshBasicMaterial({ color: 0x050403 });
    const holeRimMat = new THREE.MeshStandardMaterial({ color: 0x422006, roughness: 0.92, flatShading: true });
    const bunkerMat = new THREE.MeshStandardMaterial({
      color: 0xeab308,
      map: cheeseTex,
      roughness: 0.78,
      flatShading: true
    });

    // Place 28 trench stations around the 3 great-circle canyons
    for (let i = 0; i < 28; i++) {
      const ang = (i / 28) * Math.PI * 2;
      // Follow Trench 1 (Meridian X≈0) for the first 16 stations, and Trench 2 (Equatorial) for the other 12
      let nx;
      let ny;
      let nz;
      let wallSideDir;
      if (i < 16) {
        const a = (i / 16) * Math.PI * 2;
        ny = Math.cos(a);
        nz = Math.sin(a);
        nx = -Math.sin(ny * 5.0 + nz * 4.0) * 0.08;
        wallSideDir = new THREE.Vector3(1, 0, 0);
      } else {
        const a = ((i - 16) / 12) * Math.PI * 2;
        nx = Math.cos(a);
        nz = Math.sin(a);
        ny = 0.12 - Math.sin(nx * 5.0 - nz * 4.0) * 0.07;
        wallSideDir = new THREE.Vector3(0, 1, 0);
      }
      const upNorm = new THREE.Vector3(nx, ny, nz).normalize();
      const sideSign = (i % 2 === 0) ? 1 : -1;

      // A) Dark Swiss Cheese Cave Hole embedded right into the canyon wall face!
      const wallNormal = upNorm.clone().addScaledVector(wallSideDir, sideSign * 0.18).normalize();
      const holeAltitude = TRENCH_FLOOR_RADIUS + 11.0 + (i % 3) * 5.5;
      const holeWorldPos = PLANET_CENTER.clone().addScaledVector(wallNormal, holeAltitude);
      const inwardDir = wallSideDir.clone().multiplyScalar(-sideSign).normalize();

      const hRad = 4.4 + (i % 3) * 1.3;
      const holeGroup = new THREE.Group();
      holeGroup.position.copy(holeWorldPos);
      holeGroup.lookAt(holeWorldPos.clone().add(inwardDir));

      const darkVoid = new THREE.Mesh(new THREE.CircleGeometry(hRad, 18), holeDarkMat);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(hRad, 0.75, 8, 18), holeRimMat);
      holeGroup.add(darkVoid, rim);
      cheeseScene.add(holeGroup);

      // B) Destructible Blocky Swiss-Cheese Bunker inside the trench!
      // (Inverted Space Invaders: the Space Invaders hide behind these cheese blocks for cover,
      // and YOUR weapons blow the cheese blocks apart!)
      const bunkerNormal = upNorm.clone().addScaledVector(wallSideDir, sideSign * 0.055).normalize();
      const bunkerWorldPos = PLANET_CENTER.clone().addScaledVector(bunkerNormal, TRENCH_FLOOR_RADIUS + 4.8);
      const bunkerGroup = new THREE.Group();
      bunkerGroup.position.copy(bunkerWorldPos);
      // Orient bunker so its local +Y is planet radial up (`bunkerNormal`) and faces along the trench
      const tangentFwd = new THREE.Vector3().crossVectors(wallSideDir, bunkerNormal).normalize();
      const m4 = new THREE.Matrix4().makeBasis(wallSideDir, bunkerNormal, tangentFwd);
      bunkerGroup.quaternion.setFromRotationMatrix(m4);

      // Classic Space-Invaders-style notched arch bunker made of blocky Swiss cheese!
      const bW = 9.2;
      const bH = 7.4;
      const bD = 5.4;
      const blockMesh = new THREE.Mesh(new THREE.BoxGeometry(bW, bH, bD), bunkerMat.clone());
      // Carve a couple of dark cheese holes on the bunker block itself
      const pore1 = new THREE.Mesh(new THREE.SphereGeometry(1.4, 10, 8), holeDarkMat);
      pore1.position.set(-2.1, 1.2, bD * 0.48);
      const pore2 = new THREE.Mesh(new THREE.SphereGeometry(1.1, 10, 8), holeDarkMat);
      pore2.position.set(2.0, -0.8, -bD * 0.48);
      bunkerGroup.add(blockMesh, pore1, pore2);
      cheeseScene.add(bunkerGroup);

      const bunkerObj = {
        id: `bunker_${i + 1}`,
        group: bunkerGroup,
        mesh: blockMesh,
        pos: bunkerGroup.position,
        radius: 6.4,
        hp: 3,
        maxHp: 3,
        alive: true
      };
      cheeseBunkers.push(bunkerObj);

      cheeseHoles.push({
        pos: holeWorldPos,
        normal: inwardDir,
        radius: hRad,
        bunker: bunkerObj
      });
    }

    // 4. Prepare 1980s Pixel-Art 2D Space Invader Shadow-Sprites
    invaderTextures.length = 0;
    invaderTextures.push(
      createInvaderTexture(INVADER_BITMAPS[0], '#bae6fd', '#090d16'),
      createInvaderTexture(INVADER_BITMAPS[1], '#f0abfc', '#090d16'),
      createInvaderTexture(INVADER_BITMAPS[0], '#fde047', '#1c1004')
    );

    invaders.length = 0;
    for (let i = 0; i < Math.min(16, cheeseHoles.length); i++) {
      spawnInvaderFromHole(cheeseHoles[(i * 2) % cheeseHoles.length]);
    }

    // 5. Golden Orbital Warp-Out Gate
    reentryGateGroup = new THREE.Group();
    reentryGateGroup.position.copy(REENTRY_POS);
    reentryGateGroup.lookAt(new THREE.Vector3(0, 25, 0));
    reentryRingMesh = new THREE.Mesh(
      new THREE.TorusGeometry(REENTRY_RADIUS, 0.85, 12, 48),
      new THREE.MeshBasicMaterial({ color: 0xfacc15 })
    );
    const innerDisc = new THREE.Mesh(
      new THREE.CircleGeometry(REENTRY_RADIUS - 0.6, 36),
      new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false })
    );
    reentryGateGroup.add(reentryRingMesh, innerDisc);
    cheeseScene.add(reentryGateGroup);

    isBuilt = true;
    return cheeseScene;
  }

  function spawnInvaderFromHole(hole) {
    if (!cheeseScene || !hole || !invaderTextures.length) return;
    const id = `inv_${nextInvaderId++}`;
    const tex = invaderTextures[nextInvaderId % invaderTextures.length];
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.96 });
    const sprite = new THREE.Sprite(mat);
    sprite.position.copy(hole.pos).addScaledVector(hole.normal, 2.2);
    sprite.scale.set(6.8, 5.2, 1);
    cheeseScene.add(sprite);

    invaders.push({
      id,
      sprite,
      pos: sprite.position,
      vel: hole.normal.clone().multiplyScalar(12.0),
      homeHole: hole,
      coverBunker: hole.bunker || null,
      state: 'hiding', // 'hiding' (behind Swiss cheese bunker!) | 'ambush' (lunging to grab UFO!) | 'latched'
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

  function damageBunker(bunker, dmg = 1, fromNetwork = false) {
    if (!bunker || !bunker.alive) return;
    bunker.hp -= dmg;
    spawnCheeseBurst(bunker.pos, 0xfacc15, 10, 1.1);

    if (bunker.hp <= 0) {
      bunker.alive = false;
      bunkersDestroyedCount++;
      if (bunker.group) bunker.group.visible = false;
      spawnCheeseBurst(bunker.pos, 0xeab308, 24, 1.6);
      if (window.CozyAudio && window.CozyAudio.trapHit) window.CozyAudio.trapHit();
      if (!fromNetwork && window.showToast) {
        window.showToast('🧀💥 SWISS CHEESE BUNKER SHATTERED!', 'Flushed the hiding Space Invaders out of cover!');
      }
      if (!fromNetwork && window.BlahajNetwork && typeof window.BlahajNetwork.send === 'function') {
        window.BlahajNetwork.send({
          type: 'cheese_event',
          action: 'bunker_destroyed',
          bunkerId: bunker.id
        });
      }
    } else if (bunker.mesh) {
      // Visually chip/shrink the Swiss cheese bunker as your lasers chew through it!
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

    if (!fromNetwork && window.BlahajNetwork && typeof window.BlahajNetwork.send === 'function') {
      window.BlahajNetwork.send({
        type: 'cheese_event',
        action: 'invader_killed',
        invId: inv.id
      });
    }
  }

  function checkPlasmaBoltCollision(boltPos) {
    if (!isBuilt || !boltPos) return false;

    // 1. Check destructible Swiss-cheese bunker blocks first (chew through enemy cover!)
    for (let i = 0; i < cheeseBunkers.length; i++) {
      const b = cheeseBunkers[i];
      if (!b.alive) continue;
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

    // 3. Check if laser bolt hit the Swiss-cheese planetoid canyon walls/floor (spawns golden melted cheese sparks!)
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
      if (b.alive && b.pos.distanceTo(originPos) <= 36.0) {
        damageBunker(b, 3, false);
      }
    }
    if (blasted > 0 && window.showToast) {
      window.showToast('🪩💥 SONIC SHOCKWAVE!', `Vaporized ${blasted} Space Invader${blasted === 1 ? '' : 's'} & shattered nearby cheese cover!`);
    }
  }

  function handleNetworkPacket(data) {
    if (!data || data.type !== 'cheese_event') return;
    if (data.action === 'invader_killed' && data.invId) {
      const inv = invaders.find((x) => x.id === data.invId && x.alive);
      if (inv) destroyInvader(inv, true);
    } else if (data.action === 'bunker_destroyed' && data.bunkerId) {
      const b = cheeseBunkers.find((x) => x.id === data.bunkerId && x.alive);
      if (b) damageBunker(b, 99, true);
    }
  }

  function update(dt, elapsed) {
    if (!isBuilt) build();

    if (eclipseGroup) {
      eclipseGroup.lookAt(0, -40, 0);
    }
    if (reentryRingMesh) {
      reentryRingMesh.rotation.z = elapsed * 0.9;
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

    const ufoState = (window.BlahajUFO && typeof window.BlahajUFO.getState === 'function')
      ? window.BlahajUFO.getState()
      : null;

    // Maintain active Space Invaders emerging from the Swiss cheese holes
    invaderSpawnTimer += dt;
    const aliveInvaders = invaders.filter((x) => x.alive);
    if (invaderSpawnTimer >= 3.0 && aliveInvaders.length < 16 && cheeseHoles.length > 0) {
      invaderSpawnTimer = 0;
      const hole = cheeseHoles[Math.floor(Math.random() * cheeseHoles.length)];
      spawnInvaderFromHole(hole);
    }

    let latchedCount = 0;
    for (let i = invaders.length - 1; i >= 0; i--) {
      const inv = invaders[i];
      if (!inv.alive) {
        invaders.splice(i, 1);
        continue;
      }

      // Retro 1980s stepped pixel march animation
      const stepBob = Math.sin(elapsed * 6.0 + inv.phase) > 0 ? 0.55 : -0.55;
      inv.sprite.scale.set(6.8 + stepBob, 5.2 - stepBob * 0.4, 1);

      if (inv.latched && ufoState && ufoState.pos) {
        latchedCount++;
        inv.pos.copy(ufoState.pos).add(inv.latchOffset);
        if (ufoState.turboActive && Math.abs(ufoState.spaceAngVelRoll || 0) > 1.8 && Math.random() < dt * 1.5) {
          inv.latched = false;
          inv.state = 'ambush';
          inv.vel.set((Math.random() - 0.5) * 28, 12, (Math.random() - 0.5) * 28);
        }
      } else if (ufoState && ufoState.pos) {
        const distToUfo = inv.pos.distanceTo(ufoState.pos);
        const hasCover = !!(inv.coverBunker && inv.coverBunker.alive);

        // Inverted Space Invaders AI:
        // Stay ducked behind their Swiss-cheese bunker block peeking out until the UFO approaches within 52m (or their bunker is blown up!), then lunge out to grab the UFO!
        if (hasCover && distToUfo > 52.0) {
          inv.state = 'hiding';
          // Bob side-to-side right behind the cheese bunker block
          const hidePos = inv.coverBunker.pos.clone();
          const strafe = Math.sin(elapsed * 2.6 + inv.phase) * 4.2;
          hidePos.x += strafe;
          inv.pos.lerp(hidePos, Math.min(1.0, dt * 3.5));
        } else {
          inv.state = 'ambush';
          const toUfo = new THREE.Vector3().subVectors(ufoState.pos, inv.pos);
          const d = toUfo.length();
          if (d < 6.2) {
            inv.latched = true;
            latchedCount++;
            if (window.showToast) {
              window.showToast('👾 SPACE INVADER GRABBED THE HULL!', 'Blast with Ray Turrets or Right-Click Sonic Shockwave to shake them off!');
            }
          } else if (d > 0.1) {
            toUfo.normalize();
            const chaseSpeed = hasCover ? 22.0 : 25.0;
            inv.vel.lerp(toUfo.multiplyScalar(chaseSpeed), Math.min(1.0, dt * 2.2));
            inv.pos.addScaledVector(inv.vel, dt);
          }
        }
      }
    }

    // Spherical Planetoid Trench Surface Cushioning + Bunker Collisions + Re-Entry Gate
    if (ufoState && ufoState.pos) {
      if (latchedCount > 0 && ufoState.vel) {
        ufoState.vel.multiplyScalar(Math.max(0.45, 1.0 - latchedCount * 0.12 * dt * 5.0));
        if (ufoState.localRole === 'pilot' && window.BlahajUFO && typeof window.BlahajUFO.applyImpactDamage === 'function') {
          window.BlahajUFO.applyImpactDamage(4.5 * latchedCount, 'Space Invader Hull Grapple', false);
        }
      }

      // 1. Collide / Glide along the Connected Spherical Planetoid & Trench Walls!
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

      // 2. Collide with intact Swiss-Cheese Bunkers in the trenches
      for (let i = 0; i < cheeseBunkers.length; i++) {
        const b = cheeseBunkers[i];
        if (!b.alive) continue;
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

      if (ufoState.localRole === 'pilot' && ufoState.pos.distanceTo(REENTRY_POS) < REENTRY_RADIUS) {
        if (window.BlahajGame && typeof window.BlahajGame.exitCheeseMoon === 'function') {
          window.BlahajGame.exitCheeseMoon(true);
        }
      }
    }
  }

  return {
    build,
    update,
    getScene: () => (isBuilt ? cheeseScene : build()),
    getPlanetCenter: () => PLANET_CENTER,
    getSurfaceRadiusAtNormal: getPlanetRadiusAtNormal,
    checkPlasmaBoltCollision,
    triggerSonicShockwave,
    handleNetworkPacket,
    getStats: () => ({ invadersClearedCount, bunkersDestroyedCount }),
    getRadarBlips: () => {
      const blips = [];
      let activeCount = 0;
      for (let i = 0; i < invaders.length; i++) {
        const inv = invaders[i];
        if (!inv || !inv.alive) continue;
        activeCount++;
        blips.push({ x: inv.pos.x, y: inv.pos.y, z: inv.pos.z, kind: inv.latched ? 'latched' : 'invader', tier: 1 });
      }
      for (let i = 0; i < cheeseBunkers.length; i++) {
        const b = cheeseBunkers[i];
        if (!b || !b.alive) continue;
        blips.push({ x: b.pos.x, y: b.pos.y, z: b.pos.z, kind: 'monolith', tier: 2 });
      }
      blips.push({ x: REENTRY_POS.x, y: REENTRY_POS.y, z: REENTRY_POS.z, kind: 'gate', tier: 0 });
      return {
        label: `INVADERS: ${activeCount}`,
        cleared: false,
        blips
      };
    }
  };
})();
