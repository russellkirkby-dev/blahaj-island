// BLÅHAJ ISLAND - IN-PLACE CRESCENT BEACH SHARK VOLLEYBALL
// Rallies take place directly on Crescent Beach in the main overworld!
// Beautiful sky, wave shader ocean, palm trees, Sunny relaxing with a cocktail, and header-boops!
// ============================================================================

window.BlahajVolleyball = (function () {
  let isMatchActiveState = false;
  let activeScene = null;
  let activePlayer = null;

  // Crescent Beach Volleyball Court Constants (Overworld Coordinates)
  // Center is at (x: 28.0, z: 52.0), terrace sand elevation is y = 1.65
  const COURT = {
    centerX: 28.0,
    centerZ: 52.0,
    sandY: 1.65,
    minX: 24.8,
    maxX: 31.2,
    minZ: 46.2, // South court baseline
    maxZ: 57.8, // North court baseline
    netZ: 52.0, // Bamboo net location
    netTopY: 2.75, // Top of the net mesh (1.1m tall)
    playerStart: { x: 28.0, y: 1.65, z: 48.8, rotY: 0 },
    oppStart: { x: 28.0, y: 1.65, z: 55.2, rotY: Math.PI }
  };

  // Available Opponents Definition
  const OPPONENTS = {
    sandy: {
      id: 'sandy',
      name: 'Sandy the Beach Shonk',
      title: 'CRESCENT BEACH CHAMPION',
      portrait: 'assets/gallery/Shonk-1.png',
      desc: 'Balanced, dependable returns with steady floaty lobs. Wears a sunny visor and bright bandana.',
      speed: 4.2,
      accuracy: 0.88,
      lobArc: 5.4,
      createModel: (BlahajModels) => {
        const shonk = BlahajModels.createPlushShark({
          bodyColor: 0x0ea5e9, // radiant sky blue
          bellyColor: 0xf8fafc,
          scarfColor: 0xf59e0b, // sunshine yellow
          eyeColor: 0x111827
        });
        // Bright yellow beach sun visor
        const visorMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.35 });
        const visor = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.06, 8, 18, Math.PI), visorMat);
        visor.position.set(0, 0.65, 0.42);
        visor.rotation.x = -0.32;
        shonk.add(visor);
        return shonk;
      }
    },
    solomon: {
      id: 'solomon',
      name: 'Solomon the Wise Shark',
      title: 'TACTICAL FLOATY LOBBER',
      portrait: 'assets/gallery/Solomon.png',
      desc: 'Master of gentle high-arcing lobs that stay aloft forever. Wears a cozy straw sun hat.',
      speed: 3.8,
      accuracy: 0.95,
      lobArc: 6.4,
      createModel: (BlahajModels) => {
        const shonk = BlahajModels.createPlushShark({
          bodyColor: 0xeab308, // golden amber
          bellyColor: 0xfef08a,
          scarfColor: 0x1d4ed8, // deep ocean blue
          eyeColor: 0x0f172a
        });
        // Straw sun hat
        const hatMat = new THREE.MeshStandardMaterial({ color: 0xd4a373, roughness: 0.7 });
        const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.68, 0.05, 16), hatMat);
        brim.position.set(0, 0.85, 0.15);
        const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.45, 0.45, 16), hatMat);
        crown.position.set(0, 1.05, 0.15);
        shonk.add(brim);
        shonk.add(crown);
        return shonk;
      }
    },
    hiram: {
      id: 'hiram',
      name: 'Hiram the Builder Shonk',
      title: 'POWER HEADER SPIKER',
      portrait: 'assets/gallery/Hiram.png',
      desc: 'Fast line-drive header returns and energetic court movement. Wears his iconic builder cap.',
      speed: 4.8,
      accuracy: 0.84,
      lobArc: 4.8,
      createModel: (BlahajModels) => {
        const shonk = BlahajModels.createPlushShark({
          bodyColor: 0x64748b, // slate grey
          bellyColor: 0xf1f5f9,
          scarfColor: 0xf97316, // safety orange
          eyeColor: 0x0f172a
        });
        // Blue work cap
        const capMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.4 });
        const capDome = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), capMat);
        capDome.position.set(0, 0.72, 0.1);
        const bill = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.05, 0.35), capMat);
        bill.position.set(0, 0.72, 0.42);
        bill.rotation.x = 0.15;
        shonk.add(capDome);
        shonk.add(bill);
        return shonk;
      }
    },
    birb: {
      id: 'birb',
      name: 'Captain Birb',
      title: 'WINGED BEACH MASCOT',
      portrait: 'assets/gallery/Emergency-2.png',
      desc: 'Flutter jumps and unpredictable wing boops. Always brings good vibes and enthusiastic cheeps.',
      speed: 5.0,
      accuracy: 0.80,
      lobArc: 5.6,
      createModel: (BlahajModels) => {
        const b = BlahajModels.createBirb(0xfacc15);
        b.scale.set(1.4, 1.4, 1.4);
        return b;
      }
    }
  };

  let currentOpponentKey = 'sandy';
  let opponentActor = {
    key: 'sandy',
    mesh: null,
    pos: new THREE.Vector3(28.0, 1.65, 55.2),
    rotY: Math.PI,
    velY: 0,
    isGrounded: true,
    targetX: 28.0,
    targetZ: 55.2,
    jumpTimer: 0,
    celebrateTimer: 0
  };

  // Ball State & Floaty Physics
  const BALL_RADIUS = 0.5;
  const ball = {
    pos: new THREE.Vector3(28.0, 3.2, 50.0),
    vel: new THREE.Vector3(0, 3.0, 2.0),
    mesh: null,
    shadowMesh: null,
    squish: 1.0,
    lastHitter: null, // 'player' | 'opponent'
    state: 'in_play', // 'in_play' | 'scored' | 'serving'
    serveTimer: 0,
    nextServer: 'player'
  };

  // Match Statistics
  let rallyCount = 0;
  let bestRally = 0;
  let playerScore = 0;
  let opponentScore = 0;

  // Particle pool for snout impacts and sparkles
  const particles = [];

  // ==========================================================================
  // OPPONENT CREATION & SPAWNING
  // ==========================================================================
  function spawnOpponent(opponentKey) {
    if (opponentActor.mesh && opponentActor.mesh.parent) {
      opponentActor.mesh.parent.remove(opponentActor.mesh);
    }
    currentOpponentKey = OPPONENTS[opponentKey] ? opponentKey : 'sandy';
    const def = OPPONENTS[currentOpponentKey];

    if (window.BlahajModels) {
      opponentActor.mesh = def.createModel(window.BlahajModels);
    } else {
      opponentActor.mesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.4, 0.4, 1.4, 12),
        new THREE.MeshStandardMaterial({ color: 0x0284c7 })
      );
    }

    opponentActor.pos.set(COURT.oppStart.x, COURT.oppStart.y, COURT.oppStart.z);
    opponentActor.rotY = COURT.oppStart.rotY;
    opponentActor.velY = 0;
    opponentActor.isGrounded = true;
    opponentActor.targetX = COURT.oppStart.x;
    opponentActor.targetZ = COURT.oppStart.z;
    opponentActor.celebrateTimer = 0;

    opponentActor.mesh.position.copy(opponentActor.pos);
    opponentActor.mesh.rotation.y = opponentActor.rotY;
    if (activeScene) activeScene.add(opponentActor.mesh);
  }

  // ==========================================================================
  // BALL CREATION
  // ==========================================================================
  function spawnBall() {
    if (ball.mesh && ball.mesh.parent) {
      ball.mesh.parent.remove(ball.mesh);
    }
    if (ball.shadowMesh && ball.shadowMesh.parent) {
      ball.shadowMesh.parent.remove(ball.shadowMesh);
    }

    if (window.BlahajModels && window.BlahajModels.createBeachBall) {
      ball.mesh = window.BlahajModels.createBeachBall(BALL_RADIUS);
    } else {
      ball.mesh = new THREE.Mesh(
        new THREE.SphereGeometry(BALL_RADIUS, 24, 20),
        new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.35 })
      );
    }
    ball.mesh.castShadow = true;
    if (activeScene) activeScene.add(ball.mesh);

    // Soft drop shadow on Crescent Beach sand terrace
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x3d2817,
      transparent: true,
      opacity: 0.38,
      depthWrite: false
    });
    ball.shadowMesh = new THREE.Mesh(new THREE.CircleGeometry(BALL_RADIUS * 1.1, 24), shadowMat);
    ball.shadowMesh.rotation.x = -Math.PI / 2;
    ball.shadowMesh.position.set(COURT.centerX, COURT.sandY + 0.02, COURT.centerZ);
    if (activeScene) activeScene.add(ball.shadowMesh);

    resetBallToServe('player');
  }

  function resetBallToServe(server = 'player') {
    ball.state = 'serving';
    ball.serveTimer = 1.2;
    ball.squish = 1.0;
    ball.lastHitter = null;

    if (server === 'player') {
      ball.pos.set(COURT.centerX, COURT.sandY + 2.2, COURT.playerStart.z + 0.8);
      ball.vel.set(0, 2.5, 0);
    } else {
      ball.pos.set(COURT.centerX, COURT.sandY + 2.2, COURT.oppStart.z - 0.8);
      ball.vel.set(0, 2.5, 0);
    }

    if (ball.mesh) {
      ball.mesh.position.copy(ball.pos);
      ball.mesh.scale.set(1, 1, 1);
    }
  }

  // ==========================================================================
  // PARTICLE SYSTEM FOR SNOUT IMPACTS & SPARKLES
  // ==========================================================================
  function spawnBoopParticles(pos, color = 0x38bdf8, count = 16) {
    if (!activeScene) return;
    for (let i = 0; i < count; i++) {
      const geo = new THREE.SphereGeometry(0.065 + Math.random() * 0.045, 6, 6);
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 });
      const pMesh = new THREE.Mesh(geo, mat);
      pMesh.position.copy(pos);
      activeScene.add(pMesh);

      const angle = Math.random() * Math.PI * 2;
      const speed = 1.8 + Math.random() * 3.4;
      particles.push({
        mesh: pMesh,
        vel: new THREE.Vector3(
          Math.cos(angle) * speed,
          2.0 + Math.random() * 3.5,
          Math.sin(angle) * speed
        ),
        life: 0.65,
        maxLife: 0.65
      });
    }
  }

  function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        if (p.mesh.parent) p.mesh.parent.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
        particles.splice(i, 1);
        continue;
      }
      p.vel.y -= 9.8 * dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      const alpha = p.life / p.maxLife;
      p.mesh.material.opacity = alpha * 0.95;
      const scale = 0.4 + alpha * 0.6;
      p.mesh.scale.set(scale, scale, scale);
    }
  }

  // ==========================================================================
  // MATCH LIFECYCLE
  // ==========================================================================
  function startMatch(opponentKey = 'sandy', sceneRef, playerRef) {
    activeScene = sceneRef || (window.BlahajWorld && window.BlahajWorld.getActiveScene ? window.BlahajWorld.getActiveScene() : null);
    activePlayer = playerRef;
    isMatchActiveState = true;

    playerScore = 0;
    opponentScore = 0;
    rallyCount = 0;

    spawnOpponent(opponentKey);
    spawnBall();

    // Move player cleanly to south court baseline
    if (activePlayer) {
      activePlayer.pos.set(COURT.playerStart.x, COURT.playerStart.y, COURT.playerStart.z);
      activePlayer.rotY = COURT.playerStart.rotY;
      activePlayer.velY = 0;
      activePlayer.isGrounded = true;
      activePlayer.inBoat = false;
      activePlayer.ridingWithPartner = false;
      if (activePlayer.mesh) {
        activePlayer.mesh.position.copy(activePlayer.pos);
        activePlayer.mesh.rotation.y = activePlayer.rotY;
      }
    }

    // Align camera behind player facing north down the volleyball court
    if (window.camState) {
      window.camState.yaw = Math.PI;
      window.camState.pitch = 0.22;
      window.camState.distance = 3.6;
      window.camState.heightOffset = 1.65;
    }

    // Hide entrance signpost during active match for completely unobstructed court view
    if (activeScene) {
      activeScene.traverse((obj) => {
        if (obj.name === 'crescent_volleyball_sign') obj.visible = false;
      });
    }

    // Hide overlapping compass, island meters, and banners
    document.body.classList.add('volleyball-active');

    // Show clean, uncluttered match HUD
    const vHud = document.getElementById('volleyball-hud');
    if (vHud) {
      vHud.classList.remove('hidden');
      const oppNameEl = document.getElementById('vball-opp-name');
      if (oppNameEl) {
        oppNameEl.textContent = (OPPONENTS[currentOpponentKey] ? OPPONENTS[currentOpponentKey].name : 'SANDY').toUpperCase();
      }
      updateScoreboardUI();
    }

    // Wire Leave Match button
    const btnLeave = document.getElementById('btn-leave-volleyball');
    if (btnLeave && !btnLeave.dataset.bound) {
      btnLeave.dataset.bound = 'true';
      btnLeave.addEventListener('click', (e) => {
        e.stopPropagation();
        endMatch();
      });
    }

    const oppDef = OPPONENTS[currentOpponentKey];
    if (typeof showToast === 'function') {
      showToast(
        'SHARK BEACH VOLLEYBALL 🏐',
        `Match started vs ${oppDef.name}! Sharks use their snouts to header-boop the ball!`
      );
    }
  }

  function endMatch() {
    if (!isMatchActiveState) return;
    isMatchActiveState = false;

    // Clean up opponent mesh
    if (opponentActor.mesh && opponentActor.mesh.parent) {
      opponentActor.mesh.parent.remove(opponentActor.mesh);
      opponentActor.mesh = null;
    }

    // Clean up ball & shadow
    if (ball.mesh && ball.mesh.parent) {
      ball.mesh.parent.remove(ball.mesh);
      ball.mesh = null;
    }
    if (ball.shadowMesh && ball.shadowMesh.parent) {
      ball.shadowMesh.parent.remove(ball.shadowMesh);
      ball.shadowMesh = null;
    }

    // Clean up particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      if (p.mesh.parent) p.mesh.parent.remove(p.mesh);
      p.mesh.geometry.dispose();
      p.mesh.material.dispose();
    }
    particles.length = 0;

    // Restore entrance signpost
    if (activeScene) {
      activeScene.traverse((obj) => {
        if (obj.name === 'crescent_volleyball_sign') obj.visible = true;
      });
    }

    // Restore HUD
    document.body.classList.remove('volleyball-active');
    const vHud = document.getElementById('volleyball-hud');
    if (vHud) vHud.classList.add('hidden');

    if (typeof showToast === 'function') {
      showToast('CRESCENT BEACH 🏖️', 'Left volleyball court. Sunny continues lounging with his coconut drink!');
    }
  }

  function updateScoreboardUI() {
    const p1 = document.getElementById('vball-p1');
    const p2 = document.getElementById('vball-p2');
    const rally = document.getElementById('vball-rally');
    if (p1) p1.textContent = playerScore;
    if (p2) p2.textContent = opponentScore;
    if (rally) rally.textContent = rallyCount;
  }

  // ==========================================================================
  // SNOUT BOOP COLLISION & PHYSICS UPDATE
  // ==========================================================================
  function update(dt, player, isBoopKey) {
    if (!isMatchActiveState) return;
    dt = Math.min(dt || 0.016, 0.05);

    updateParticles(dt);

    // 1. Constrain Player to South Court
    if (player) {
      player.pos.x = THREE.MathUtils.clamp(player.pos.x, COURT.minX, COURT.maxX);
      // Southern court runs from baseline to just before the net
      player.pos.z = THREE.MathUtils.clamp(player.pos.z, COURT.minZ, COURT.netZ - 0.45);
      player.pos.y = COURT.sandY;
    }

    // 2. Update Ball State & Physics
    if (ball.state === 'serving') {
      ball.serveTimer -= dt;
      // Ball floats up and down gently before serve
      ball.pos.y = COURT.sandY + 2.2 + Math.sin(Date.now() * 0.006) * 0.25;
      if (ball.serveTimer <= 0) {
        ball.state = 'in_play';
        if (ball.nextServer === 'player') {
          ball.vel.set(0, 4.8, 4.8);
          ball.lastHitter = 'player';
        } else {
          ball.vel.set(0, 4.8, -4.8);
          ball.lastHitter = 'opponent';
        }
      }
    } else if (ball.state === 'in_play') {
      // Floaty leisurely gravity
      const GRAVITY = -7.2;
      ball.vel.y += GRAVITY * dt;

      // Gentle horizontal air drag
      ball.vel.x *= 0.994;
      ball.vel.z *= 0.994;

      ball.pos.addScaledVector(ball.vel, dt);

      // Rotate ball along flight trajectory
      if (ball.mesh) {
        ball.mesh.rotation.x += ball.vel.z * 1.5 * dt;
        ball.mesh.rotation.z -= ball.vel.x * 1.5 * dt;
      }

      // Check Net Collision (Net at netZ = 52.0, top is 2.75)
      const prevZ = ball.pos.z - ball.vel.z * dt;
      const crossedNet = (prevZ < COURT.netZ && ball.pos.z >= COURT.netZ) || (prevZ > COURT.netZ && ball.pos.z <= COURT.netZ);
      if (crossedNet && ball.pos.y < COURT.netTopY && ball.pos.x >= COURT.minX - 0.4 && ball.pos.x <= COURT.maxX + 0.4) {
        // Net boing bounce!
        ball.vel.z = -ball.vel.z * 0.45;
        ball.vel.y = Math.max(1.8, ball.vel.y * 0.5);
        ball.pos.z = prevZ;
        spawnBoopParticles(ball.pos, 0xd4a373, 10);
        if (typeof CozyAudio !== 'undefined' && CozyAudio.shonk) CozyAudio.shonk();
      }

      // Check Snout Boop by Player
      if (player) {
        const pSnout = new THREE.Vector3(
          player.pos.x + Math.sin(player.rotY) * 0.85,
          player.pos.y + 0.45,
          player.pos.z + Math.cos(player.rotY) * 0.85
        );
        const distToPlayer = ball.pos.distanceTo(pSnout);
        const distToCenter = ball.pos.distanceTo(player.pos);
        const canBoop = distToPlayer < 1.45 || distToCenter < 1.6 || (isBoopKey && distToCenter < 2.0);

        if (canBoop && ball.pos.z < COURT.netZ + 0.2 && ball.vel.z <= 0.5) {
          // PLAYER SNOUT BOOP!
          rallyCount++;
          if (rallyCount > bestRally) bestRally = rallyCount;
          ball.lastHitter = 'player';
          ball.squish = 0.65;

          const oppDef = OPPONENTS[currentOpponentKey] || OPPONENTS.sandy;
          // Float ball high across net into opponent territory
          const targetZDist = COURT.oppStart.z - ball.pos.z;
          ball.vel.z = Math.min(8.2, Math.max(5.8, targetZDist * 1.05 + 1.2));
          ball.vel.y = 5.2 + Math.random() * 0.8;
          // Direct laterally based on shark positioning
          const deltaX = (player.pos.x - COURT.centerX);
          ball.vel.x = -deltaX * 0.45 + (Math.random() - 0.5) * 1.5;
          ball.vel.x = THREE.MathUtils.clamp(ball.vel.x, -2.4, 2.4);

          spawnBoopParticles(pSnout, 0x38bdf8, 18);
          if (typeof CozyAudio !== 'undefined' && CozyAudio.shonk) CozyAudio.shonk();
          updateScoreboardUI();
        }
      }

      // Check Snout Boop by Opponent AI
      const oppDef = OPPONENTS[currentOpponentKey] || OPPONENTS.sandy;
      const oppSnout = new THREE.Vector3(
        opponentActor.pos.x + Math.sin(opponentActor.rotY) * 0.85,
        opponentActor.pos.y + 0.45,
        opponentActor.pos.z + Math.cos(opponentActor.rotY) * 0.85
      );
      const distToOpp = ball.pos.distanceTo(oppSnout);
      const distToOppCenter = ball.pos.distanceTo(opponentActor.pos);

      if ((distToOpp < 1.45 || distToOppCenter < 1.6) && ball.pos.z > COURT.netZ - 0.2 && ball.vel.z >= -0.5) {
        // OPPONENT SNOUT BOOP!
        rallyCount++;
        if (rallyCount > bestRally) bestRally = rallyCount;
        ball.lastHitter = 'opponent';
        ball.squish = 0.65;

        // Opponent hops up to header-spike
        opponentActor.velY = 3.6;
        opponentActor.isGrounded = false;

        const targetZDist = ball.pos.z - COURT.playerStart.z;
        ball.vel.z = -Math.min(8.0, Math.max(5.6, targetZDist * 1.05 + 1.0));
        ball.vel.y = oppDef.lobArc + (Math.random() - 0.5) * 0.6;
        // Aim toward player or court center
        const targetX = player ? player.pos.x : COURT.centerX;
        const dirX = (targetX - opponentActor.pos.x) * 0.35 + (Math.random() - 0.5) * 1.2;
        ball.vel.x = THREE.MathUtils.clamp(dirX, -2.4, 2.4);

        spawnBoopParticles(oppSnout, 0xf59e0b, 18);
        if (typeof CozyAudio !== 'undefined' && CozyAudio.teaPour) CozyAudio.teaPour();
        updateScoreboardUI();
      }

      // Check Sand Ground Landing & Scoring
      if (ball.pos.y <= COURT.sandY + BALL_RADIUS) {
        ball.pos.y = COURT.sandY + BALL_RADIUS;
        handleBallLanding();
      }
    }

    // Update Ball Scale & Shadow
    if (ball.squish < 1.0) {
      ball.squish += dt * 3.5;
      if (ball.squish > 1.0) ball.squish = 1.0;
    }
    if (ball.mesh) {
      ball.mesh.position.copy(ball.pos);
      ball.mesh.scale.set(1.0 + (1.0 - ball.squish) * 0.35, ball.squish, 1.0 + (1.0 - ball.squish) * 0.35);
    }
    if (ball.shadowMesh) {
      ball.shadowMesh.position.set(ball.pos.x, COURT.sandY + 0.02, ball.pos.z);
      const heightAbove = Math.max(0, ball.pos.y - (COURT.sandY + BALL_RADIUS));
      const shadowScale = Math.max(0.35, 1.0 - heightAbove * 0.12);
      ball.shadowMesh.scale.set(shadowScale, shadowScale, shadowScale);
      ball.shadowMesh.material.opacity = Math.max(0.08, 0.42 - heightAbove * 0.06);
    }

    // 3. Update Opponent AI Movement & Tracking
    updateOpponentAI(dt);
  }

  function handleBallLanding() {
    ball.state = 'scored';
    spawnBoopParticles(ball.pos, 0xd4a373, 20);

    const isNorthSide = ball.pos.z >= COURT.netZ;
    const isSouthSide = ball.pos.z < COURT.netZ;
    const oppDef = OPPONENTS[currentOpponentKey] || OPPONENTS.sandy;

    if (isSouthSide) {
      // Ball landed on player's half -> Opponent scores!
      opponentScore++;
      ball.nextServer = 'player';
      opponentActor.celebrateTimer = 1.8;
      if (typeof showToast === 'function') {
        showToast(`${oppDef.name.toUpperCase()} SCORES! 🏐`, `Ball landed on your sand! (Rally: ${rallyCount})`);
      }
    } else {
      // Ball landed on opponent's half -> Player scores!
      playerScore++;
      ball.nextServer = 'opponent';
      if (typeof showToast === 'function') {
        showToast('POINT TO YOU! 🔥', `Clean snout header into sand! (Rally: ${rallyCount})`);
      }
      if (typeof CozyAudio !== 'undefined' && CozyAudio.portalChime) CozyAudio.portalChime();
    }

    updateScoreboardUI();

    // Check Match Win (First to 5 points)
    if (playerScore >= 5) {
      if (typeof showToast === 'function') {
        showToast(
          '🏆 CRESCENT BEACH CHAMPION! 🏖️',
          `You defeated ${oppDef.name} 5 - ${opponentScore}! (+3 Trial Points & 100% Stuffing)`
        );
      }
      if (activePlayer) {
        activePlayer.trialPoints = (activePlayer.trialPoints || 0) + 3;
        activePlayer.stuffing = 100;
        if (typeof updateMetersUI === 'function') updateMetersUI();
      }
      setTimeout(() => {
        playerScore = 0;
        opponentScore = 0;
        rallyCount = 0;
        updateScoreboardUI();
        resetBallToServe('player');
      }, 3500);
      return;
    }

    if (opponentScore >= 5) {
      if (typeof showToast === 'function') {
        showToast(
          'MATCH FINISHED 🏖️',
          `${oppDef.name} won 5 - ${playerScore}. Sunny claps from his deckchair: "Spectacular rally!"`
        );
      }
      setTimeout(() => {
        playerScore = 0;
        opponentScore = 0;
        rallyCount = 0;
        updateScoreboardUI();
        resetBallToServe('player');
      }, 3500);
      return;
    }

    // Normal point reset
    setTimeout(() => {
      rallyCount = 0;
      updateScoreboardUI();
      resetBallToServe(ball.nextServer);
    }, 1400);
  }

  function updateOpponentAI(dt) {
    if (!opponentActor.mesh) return;

    const oppDef = OPPONENTS[currentOpponentKey] || OPPONENTS.sandy;

    // Celebration jump when opponent scores
    if (opponentActor.celebrateTimer > 0) {
      opponentActor.celebrateTimer -= dt;
      opponentActor.rotY += Math.PI * 2 * dt;
    } else {
      opponentActor.rotY = COURT.oppStart.rotY;
    }

    // Track ball destination when ball is on northern court
    if (ball.state === 'in_play' && ball.pos.z >= COURT.netZ - 1.0) {
      // Project where ball will land
      opponentActor.targetX = THREE.MathUtils.clamp(ball.pos.x, COURT.minX + 0.4, COURT.maxX - 0.4);
      opponentActor.targetZ = THREE.MathUtils.clamp(ball.pos.z + 0.6, COURT.netZ + 0.6, COURT.maxZ - 0.4);
    } else {
      // Return to comfortable base guard position
      opponentActor.targetX = COURT.centerX;
      opponentActor.targetZ = COURT.oppStart.z;
    }

    // Move toward target position
    const dx = opponentActor.targetX - opponentActor.pos.x;
    const dz = opponentActor.targetZ - opponentActor.pos.z;
    const dist = Math.hypot(dx, dz);

    if (dist > 0.15) {
      const step = Math.min(dist, oppDef.speed * dt);
      opponentActor.pos.x += (dx / dist) * step;
      opponentActor.pos.z += (dz / dist) * step;
    }

    // Vertical jump physics for header spikes
    if (!opponentActor.isGrounded) {
      opponentActor.velY -= 12.0 * dt;
      opponentActor.pos.y += opponentActor.velY * dt;
      if (opponentActor.pos.y <= COURT.sandY) {
        opponentActor.pos.y = COURT.sandY;
        opponentActor.velY = 0;
        opponentActor.isGrounded = true;
      }
    }

    opponentActor.mesh.position.copy(opponentActor.pos);
    opponentActor.mesh.rotation.y = opponentActor.rotY;

    // Animate shark tail and fins
    if (window.BlahajModels && window.BlahajModels.animateShark) {
      window.BlahajModels.animateShark(opponentActor.mesh, dt, dist > 0.15, Date.now() * 0.001);
    }
  }

  // ==========================================================================
  // OPPONENT SELECTION MODAL WITH SUNNY THE BEACH CARROT
  // ==========================================================================
  function openOpponentSelectModal(openDialogueModalFn, closeDialogueModalFn) {
    if (typeof openDialogueModalFn !== 'function') {
      startMatch('sandy', activeScene, activePlayer);
      return;
    }

    const actions = [
      {
        label: '🦈 Sandy the Beach Shonk (Crescent Beach Champion · Balanced)',
        className: 'btn-primary',
        onClick: () => {
          if (closeDialogueModalFn) closeDialogueModalFn();
          startMatch('sandy', activeScene, activePlayer);
        }
      },
      {
        label: '👑 Solomon the Wise Shark (Tactical Floaty Lobs & Drops)',
        className: 'btn-accent',
        onClick: () => {
          if (closeDialogueModalFn) closeDialogueModalFn();
          startMatch('solomon', activeScene, activePlayer);
        }
      },
      {
        label: '🔨 Hiram the Builder Shonk (Power Header Spikes)',
        className: 'btn-accent',
        onClick: () => {
          if (closeDialogueModalFn) closeDialogueModalFn();
          startMatch('hiram', activeScene, activePlayer);
        }
      },
      {
        label: '🐦 Captain Birb (Flutter Wing Bounces & High Cheeps)',
        className: 'btn-secondary',
        onClick: () => {
          if (closeDialogueModalFn) closeDialogueModalFn();
          startMatch('birb', activeScene, activePlayer);
        }
      },
      {
        label: '🏖️ Just Lounging for Now (Close)',
        className: 'btn-secondary',
        onClick: () => {
          if (closeDialogueModalFn) closeDialogueModalFn();
        }
      }
    ];

    openDialogueModalFn({
      speaker: 'Sunny the Beach Carrot',
      role: 'CRESCENT BEACH REFEREE & CONNOISSEUR',
      portrait: 'assets/gallery/Volcano-temple.png',
      text: '“Welcome to Crescent Beach Shark Volleyball! The sand is warm, the ocean is rolling, and the bamboo net is strung tight. Sharks bounce the ball back and forth with their snouts! Who would you like to challenge on the court today?”',
      actions
    });
  }

  // Public API
  return {
    startMatch,
    endMatch,
    isMatchActive: () => isMatchActiveState,
    update,
    openOpponentSelectModal,
    getOpponents: () => OPPONENTS,
    getScene: () => activeScene,
    build: () => {},
    setActive: (v) => { if (!v) endMatch(); },
    getStart: () => COURT.playerStart,
    getFloorHeight: (x, z) => COURT.sandY,
    resolveMove: (p, dir, dist) => {
      const nextX = THREE.MathUtils.clamp(p.x + dir.x * dist, COURT.minX, COURT.maxX);
      const nextZ = THREE.MathUtils.clamp(p.z + dir.z * dist, COURT.minZ, COURT.netZ - 0.45);
      return new THREE.Vector3(nextX, COURT.sandY, nextZ);
    },
    getInteractables: () => []
  };
})();
