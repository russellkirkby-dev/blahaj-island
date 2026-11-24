// ============================================================================
// BLÅHAJ ISLAND — SWISS CHEESE PLANETOID ("PITCH BLACK" ECLIPSE CANYON)
// ============================================================================
// Reached by clearing all destructible asteroids in Deep Space and engaging
// Mojo Hyperdrive + Boost [Shift] for 5 seconds!
// Features:
//  1. Total Solar Eclipse sky ("Pitch Black" golden corona rim-lighting).
//  2. Giant curved Swiss Cheese Planetoid surface with deep flyable canyons
//     lined with dark Swiss-cheese holes.
//  3. 1980s Pixel-Art 2D Space Invaders (crisp nearest-neighbor sprite sheets)
//     that emerge from the cheese holes, swoop through the canyons, and try
//     to grab/latch onto your UFO (slowing & draining shields until blasted or
//     shaken off with Ray Turrets [LMB] or Sonic Shockwave [RMB]!).
// ============================================================================

window.BlahajCheeseMoon = (function () {
  let cheeseScene = null;
  let isBuilt = false;

  const canyonWalls = [];
  const cheeseHoles = [];
  const invaders = [];
  const bursts = [];
  let eclipseGroup = null;
  let reentryGateGroup = null;
  let reentryRingMesh = null;
  let invaderSpawnTimer = 0;
  let nextInvaderId = 1;
  let invadersClearedCount = 0;

  const REENTRY_POS = new THREE.Vector3(0, 72, 185);
  const REENTRY_RADIUS = 19.0;

  // Classic 1980s 11x8 Space Invader pixel bitmaps (2 animation frames)
  const INVADER_BITMAPS = [
    // Squid / Crab type
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
    // Octopus type
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

  function createInvaderTexture(bitmap, glowColor = '#bae6fd', shadowTint = '#1e1b4b') {
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 48;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, 64, 48);

    // Subtle dark shadow aura behind the 2D pixel invader (Pitch Black shadow-creature vibe!)
    const grad = ctx.createRadialGradient(32, 24, 4, 32, 24, 28);
    grad.addColorStop(0, 'rgba(15, 23, 42, 0.85)');
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
          ctx.fillRect(ox + x * px, oy + y * px, px - 0.3, px - 0.3);
        }
      }
    }

    const tex = new THREE.CanvasTexture(c);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    return tex;
  }

  function createCheeseTexture() {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext('2d');

    // Warm golden Swiss cheese gradient
    const g = ctx.createLinearGradient(0, 0, 256, 256);
    g.addColorStop(0, '#facc15');
    g.addColorStop(0.5, '#eab308');
    g.addColorStop(1, '#ca8a04');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);

    // Organic cheese grain & toasted crust speckles
    for (let i = 0; i < 420; i++) {
      const x = (Math.sin(i * 19.3) * 0.5 + 0.5) * 256;
      const y = (Math.cos(i * 41.7) * 0.5 + 0.5) * 256;
      const r = 1 + (i % 3);
      ctx.fillStyle = i % 2 === 0 ? 'rgba(161, 98, 7, 0.25)' : 'rgba(254, 240, 138, 0.22)';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Painted Swiss cheese pores & shadowed craters
    for (let i = 0; i < 24; i++) {
      const x = ((i * 73 + 29) % 236) + 10;
      const y = ((i * 137 + 41) % 236) + 10;
      const rad = 7 + (i % 5) * 4;
      const hg = ctx.createRadialGradient(x - rad * 0.25, y - rad * 0.25, 1, x, y, rad);
      hg.addColorStop(0, '#422006');
      hg.addColorStop(0.65, '#713f12');
      hg.addColorStop(1, 'rgba(161, 98, 7, 0.0)');
      ctx.fillStyle = hg;
      ctx.beginPath();
      ctx.arc(x, y, rad, 0, Math.PI * 2);
      ctx.fill();
    }

    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(6, 4);
    return tex;
  }

  function build() {
    if (isBuilt && cheeseScene) return cheeseScene;

    cheeseScene = new THREE.Scene();
    cheeseScene.background = new THREE.Color(0x090705);
    cheeseScene.fog = new THREE.FogExp2(0x1a1208, 0.0028);

    // Pitch Black Eclipse Lighting: warm golden rim sun + deep shadowed ambient
    const amb = new THREE.AmbientLight(0x524028, 1.05);
    cheeseScene.add(amb);

    const eclipseSun = new THREE.DirectionalLight(0xfde047, 1.85);
    eclipseSun.position.set(120, 140, -280);
    cheeseScene.add(eclipseSun);

    const canyonGlow = new THREE.HemisphereLight(0xfacc15, 0x1c1409, 0.75);
    cheeseScene.add(canyonGlow);

    // 1. Starfield & Pitch Black Total Solar Eclipse in the Sky
    const starCount = 1400;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const u = ((i * 73) % 1000) / 1000;
      const v = ((i * 197) % 1000) / 1000;
      const th = u * Math.PI * 2;
      const ph = Math.acos(2 * v - 1);
      const r = 780 + (i % 180);
      starPos[i * 3] = r * Math.sin(ph) * Math.cos(th);
      starPos[i * 3 + 1] = Math.abs(r * Math.cos(ph)) * 0.7 + 40;
      starPos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    cheeseScene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xfef3c7, size: 2.2, transparent: true, opacity: 0.85 })));

    eclipseGroup = new THREE.Group();
    eclipseGroup.position.set(60, 155, -360);
    const eclipseBody = new THREE.Mesh(
      new THREE.CircleGeometry(46, 36),
      new THREE.MeshBasicMaterial({ color: 0x050507 })
    );
    const coronaInner = new THREE.Mesh(
      new THREE.RingGeometry(45.5, 53, 48),
      new THREE.MeshBasicMaterial({ color: 0xfef08a, transparent: true, opacity: 0.92, side: THREE.DoubleSide })
    );
    const coronaOuter = new THREE.Mesh(
      new THREE.RingGeometry(50, 78, 48),
      new THREE.MeshBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.28, side: THREE.DoubleSide })
    );
    coronaInner.position.z = -0.5;
    coronaOuter.position.z = -1.0;
    eclipseGroup.add(eclipseBody, coronaInner, coronaOuter);
    cheeseScene.add(eclipseGroup);

    // 2. Massive Curved Swiss Cheese Planetoid Floor & Canyon System
    const cheeseTex = createCheeseTexture();
    const cheeseMat = new THREE.MeshStandardMaterial({
      map: cheeseTex,
      roughness: 0.78,
      metalness: 0.04
    });
    const holeDarkMat = new THREE.MeshBasicMaterial({ color: 0x080604 });
    const holeRimMat = new THREE.MeshStandardMaterial({ color: 0x713f12, roughness: 0.9 });

    // Giant curved planetoid crust underneath
    const planetBody = new THREE.Mesh(
      new THREE.SphereGeometry(520, 36, 24),
      cheeseMat
    );
    planetBody.position.set(0, -528, 0);
    cheeseScene.add(planetBody);

    // Winding Flyable Swiss Cheese Canyon Walls (Left & Right walls along Z = -220 .. +200)
    canyonWalls.length = 0;
    cheeseHoles.length = 0;
    const segments = 14;
    for (let s = 0; s < segments; s++) {
      const z = -210 + s * 30;
      const curveX = Math.sin(s * 0.42) * 28;
      const halfWidth = 30 + Math.sin(s * 0.7) * 5;

      [-1, 1].forEach((side) => {
        const wallW = 28 + (s % 3) * 6;
        const wallH = 44 + ((s + (side > 0 ? 1 : 0)) % 4) * 8;
        const wallD = 33;
        const wx = curveX + side * (halfWidth + wallW * 0.5);
        const wy = wallH * 0.5 - 10;

        const wallMesh = new THREE.Mesh(
          new THREE.BoxGeometry(wallW, wallH, wallD),
          cheeseMat
        );
        wallMesh.position.set(wx, wy, z);
        wallMesh.rotation.y = side * Math.cos(s * 0.42) * 0.16;
        cheeseScene.add(wallMesh);

        canyonWalls.push({
          x: wx,
          y: wy,
          z,
          halfW: wallW * 0.5,
          halfH: wallH * 0.5,
          halfD: wallD * 0.5
        });

        // Carve 2 Swiss-Cheese Holes on the canyon-facing side of each wall block!
        for (let h = 0; h < 2; h++) {
          const hRad = 4.2 + ((s + h) % 3) * 1.4;
          const hy = 4 + h * 15 + (s % 2) * 4;
          const hz = z + (h === 0 ? -7 : 7);
          const faceX = wx - side * (wallW * 0.5 + 0.18);

          const holeGroup = new THREE.Group();
          holeGroup.position.set(faceX, hy, hz);
          holeGroup.rotation.y = side > 0 ? -Math.PI * 0.5 : Math.PI * 0.5;

          const darkDisc = new THREE.Mesh(new THREE.CircleGeometry(hRad, 20), holeDarkMat);
          const rimTorus = new THREE.Mesh(new THREE.TorusGeometry(hRad, 0.55, 8, 22), holeRimMat);
          holeGroup.add(darkDisc, rimTorus);
          cheeseScene.add(holeGroup);

          cheeseHoles.push({
            pos: new THREE.Vector3(faceX, hy, hz),
            normal: new THREE.Vector3(-side, 0, 0),
            radius: hRad
          });
        }
      });
    }

    // 3. Prepare 1980s Pixel-Art 2D Space Invader Sprite Textures
    invaderTextures.length = 0;
    invaderTextures.push(
      createInvaderTexture(INVADER_BITMAPS[0], '#bae6fd', '#312e81'),
      createInvaderTexture(INVADER_BITMAPS[1], '#f0abfc', '#1e1b4b'),
      createInvaderTexture(INVADER_BITMAPS[0], '#fde047', '#422006')
    );

    // Spawn initial wave of 12 Space Invaders emerging from the cheese holes!
    invaders.length = 0;
    for (let i = 0; i < Math.min(12, cheeseHoles.length); i++) {
      spawnInvaderFromHole(cheeseHoles[(i * 3) % cheeseHoles.length]);
    }

    // 4. Atmospheric Warp-Out Beacon above the Canyon (or press [L])
    reentryGateGroup = new THREE.Group();
    reentryGateGroup.position.copy(REENTRY_POS);
    reentryGateGroup.lookAt(new THREE.Vector3(0, 18, 0));
    reentryRingMesh = new THREE.Mesh(
      new THREE.TorusGeometry(REENTRY_RADIUS, 0.85, 12, 48),
      new THREE.MeshBasicMaterial({ color: 0xfacc15 })
    );
    const innerDisc = new THREE.Mesh(
      new THREE.CircleGeometry(REENTRY_RADIUS - 0.6, 36),
      new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false })
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
    sprite.position.copy(hole.pos).addScaledVector(hole.normal, 2.5);
    sprite.scale.set(6.8, 5.2, 1);
    cheeseScene.add(sprite);

    invaders.push({
      id,
      sprite,
      pos: sprite.position,
      vel: hole.normal.clone().multiplyScalar(14.0),
      latched: false,
      latchOffset: new THREE.Vector3(
        (Math.random() - 0.5) * 7.5,
        1.2 + Math.random() * 2.2,
        (Math.random() - 0.5) * 7.5
      ),
      phase: Math.random() * Math.PI * 2,
      alive: true
    });
  }

  function spawnPixelBurst(pos, colorHex = 0xbae6fd, count = 14) {
    if (!cheeseScene || !pos) return;
    const geo = new THREE.BoxGeometry(0.55, 0.55, 0.55);
    const mat = new THREE.MeshBasicMaterial({ color: colorHex });
    for (let i = 0; i < count; i++) {
      const m = new THREE.Mesh(geo, mat);
      m.position.copy(pos);
      cheeseScene.add(m);
      bursts.push({
        mesh: m,
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * 26,
          (Math.random() - 0.5) * 26,
          (Math.random() - 0.5) * 26
        ),
        life: 0.55 + Math.random() * 0.35
      });
    }
  }

  function destroyInvader(inv, fromNetwork = false) {
    if (!inv || !inv.alive) return;
    inv.alive = false;
    inv.latched = false;
    if (inv.sprite && inv.sprite.parent) inv.sprite.parent.remove(inv.sprite);
    invadersClearedCount++;
    spawnPixelBurst(inv.pos, 0x7dd3fc, 14);
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
    for (let i = 0; i < invaders.length; i++) {
      const inv = invaders[i];
      if (!inv.alive) continue;
      if (inv.pos.distanceTo(boltPos) <= 4.5) {
        destroyInvader(inv, false);
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
      if (inv.latched || inv.pos.distanceTo(originPos) <= 42.0) {
        destroyInvader(inv, false);
        blasted++;
      }
    }
    if (blasted > 0 && window.showToast) {
      window.showToast('🪩💥 SONIC SHOCKWAVE!', `Vaporized ${blasted} Space Invader${blasted === 1 ? '' : 's'} off your hull!`);
    }
  }

  function handleNetworkPacket(data) {
    if (!data || data.type !== 'cheese_event') return;
    if (data.action === 'invader_killed' && data.invId) {
      const inv = invaders.find((x) => x.id === data.invId && x.alive);
      if (inv) destroyInvader(inv, true);
    }
  }

  function update(dt, elapsed) {
    if (!isBuilt) build();

    if (eclipseGroup) {
      eclipseGroup.lookAt(0, 20, 0);
    }
    if (reentryRingMesh) {
      reentryRingMesh.rotation.z = elapsed * 0.9;
    }

    // Update bursts
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

    // Maintain up to 14 active Space Invaders emerging from Swiss cheese holes
    invaderSpawnTimer += dt;
    const aliveInvaders = invaders.filter((x) => x.alive);
    if (invaderSpawnTimer >= 3.2 && aliveInvaders.length < 14 && cheeseHoles.length > 0) {
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

      // Retro 1980s stepped pixel bobbing
      const stepBob = Math.sin(elapsed * 5.0 + inv.phase) * 0.8;
      inv.sprite.scale.set(6.8 + stepBob * 0.35, 5.2 - stepBob * 0.25, 1);

      if (inv.latched && ufoState && ufoState.pos) {
        latchedCount++;
        inv.pos.copy(ufoState.pos).add(inv.latchOffset);
        // Gentle shake-off chance if rolling hard or boosting
        if (ufoState.turboActive && Math.abs(ufoState.spaceAngVelRoll || 0) > 1.8 && Math.random() < dt * 1.4) {
          inv.latched = false;
          inv.vel.set((Math.random() - 0.5) * 28, 10, (Math.random() - 0.5) * 28);
        }
      } else if (ufoState && ufoState.pos) {
        // Swoop out of canyon holes toward the UFO and try to grab it!
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
          const chaseSpeed = 21.0;
          inv.vel.lerp(toUfo.multiplyScalar(chaseSpeed), Math.min(1.0, dt * 1.9));
          inv.pos.addScaledVector(inv.vel, dt);
        }
      }
    }

    // Canyon Floor & Wall Cushioning + Grabbed Slow/Drain + Re-Entry Gate
    if (ufoState && ufoState.pos) {
      // Latched invaders slow the saucer and drain shields/hull over time!
      if (latchedCount > 0 && ufoState.vel) {
        ufoState.vel.multiplyScalar(Math.max(0.45, 1.0 - latchedCount * 0.12 * dt * 5.0));
        if (ufoState.localRole === 'pilot' && window.BlahajUFO && typeof window.BlahajUFO.applyImpactDamage === 'function') {
          window.BlahajUFO.applyImpactDamage(4.5 * latchedCount, 'Space Invader Hull Grapple', false);
        }
      }

      // Canyon floor cushion (y >= -5)
      if (ufoState.pos.y < -4.5) {
        ufoState.pos.y = -4.5;
        if (ufoState.vel && ufoState.vel.y < 0) ufoState.vel.y = 4.0;
      }

      // Canyon wall collisions
      for (let wIdx = 0; wIdx < canyonWalls.length; wIdx++) {
        const w = canyonWalls[wIdx];
        if (Math.abs(ufoState.pos.z - w.z) < w.halfD + 4.5 && ufoState.pos.y < w.y + w.halfH + 3.5) {
          const dx = ufoState.pos.x - w.x;
          const minX = w.halfW + 4.8;
          if (Math.abs(dx) < minX) {
            const sign = dx >= 0 ? 1 : -1;
            ufoState.pos.x = w.x + sign * minX;
            if (ufoState.vel) ufoState.vel.x = sign * Math.max(8.0, Math.abs(ufoState.vel.x) * 0.6);
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

  return {
    build,
    update,
    getScene: () => (isBuilt ? cheeseScene : build()),
    checkPlasmaBoltCollision,
    triggerSonicShockwave,
    handleNetworkPacket,
    getStats: () => ({ invadersClearedCount }),
    getRadarBlips: () => {
      const blips = [];
      let activeCount = 0;
      for (let i = 0; i < invaders.length; i++) {
        const inv = invaders[i];
        if (!inv || !inv.alive) continue;
        activeCount++;
        blips.push({ x: inv.pos.x, y: inv.pos.y, z: inv.pos.z, kind: inv.latched ? 'latched' : 'invader', tier: 1 });
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
