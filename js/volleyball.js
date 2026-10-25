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
    playerStart: { x: 28.0, y: 1.65, z: 49.0, rotY: 0 },
    oppStart: { x: 28.0, y: 1.65, z: 55.4, rotY: Math.PI }
  };

  // Helper to reliably find active THREE.Scene
  function resolveScene() {
    if (activeScene && activeScene.isScene) return activeScene;
    if (typeof window.getActiveScene === 'function') {
      const s = window.getActiveScene();
      if (s && s.isScene) return s;
    }
    if (window.BlahajGame && typeof window.BlahajGame.getActiveScene === 'function') {
      const s = window.BlahajGame.getActiveScene();
      if (s && s.isScene) return s;
    }
    if (window.scene && window.scene.isScene) return window.scene;
    if (window.__DEBUG__ && window.__DEBUG__.scene) return window.__DEBUG__.scene;
    return null;
  }

  // Helper to reliably find active player object
  function resolvePlayer() {
    if (activePlayer && activePlayer.pos) return activePlayer;
    if (window.player && window.player.pos) return window.player;
    if (window.BlahajGame && window.BlahajGame.player) return window.BlahajGame.player;
    if (window.__DEBUG__ && window.__DEBUG__.player) return window.__DEBUG__.player;
    return null;
  }

  // Helper to create overhead 3D name badge for opponents
  function createOpponentNameplate(nameText, roleText, badgeColor = '#facc15') {
    const canvas = document.createElement('canvas');
    canvas.width = 384;
    canvas.height = 112;
    const ctx = canvas.getContext('2d');

    // Rounded background container
    ctx.fillStyle = 'rgba(15, 23, 42, 0.90)';
    ctx.beginPath();
    ctx.roundRect(8, 8, 368, 96, 16);
    ctx.fill();
    ctx.strokeStyle = badgeColor;
    ctx.lineWidth = 4;
    ctx.stroke();

    // Name text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(nameText, 192, 52);

    // Subtitle / role text
    ctx.fillStyle = badgeColor;
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText(roleText, 192, 84);

    const tex = new THREE.CanvasTexture(canvas);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
    sprite.position.set(0, 2.3, 0);
    sprite.scale.set(2.8, 0.82, 1);
    return sprite;
  }

  // Available Opponents Definition
  const OPPONENTS = {
    sandy: {
      id: 'sandy',
      name: 'Sandy the Beach Shonk',
      title: 'CRESCENT BEACH CHAMPION',
      portrait: 'assets/gallery/Shonk-1.png',
      desc: 'Balanced, dependable returns with steady floaty lobs. Wears a sunny visor and bright bandana.',
      speed: 4.4,
      accuracy: 0.90,
      lobArc: 5.6,
      createModel: (BlahajModels) => {
        const shonk = BlahajModels.createPlushShark({
          bodyColor: 0x0ea5e9, // radiant sky blue
          bellyColor: 0xf8fafc,
          scarfColor: 0xf59e0b, // sunshine yellow
          eyeColor: 0x111827,
          scale: 1.15
        });
        // Bright yellow beach sun visor
        const visorMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.35 });
        const visor = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.07, 8, 18, Math.PI), visorMat);
        visor.position.set(0, 0.68, 0.44);
        visor.rotation.x = -0.32;
        shonk.add(visor);

        // Overhead 3D nametag
        shonk.add(createOpponentNameplate('🦈 SANDY', 'Beach Champion · North Court', '#facc15'));
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
          eyeColor: 0x0f172a,
          scale: 1.15
        });
        // Straw sun hat
        const hatMat = new THREE.MeshStandardMaterial({ color: 0xd4a373, roughness: 0.7 });
        const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.68, 0.05, 16), hatMat);
        brim.position.set(0, 0.85, 0.15);
        const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.45, 0.45, 16), hatMat);
        crown.position.set(0, 1.05, 0.15);
        shonk.add(brim);
        shonk.add(crown);

        // Overhead 3D nametag
        shonk.add(createOpponentNameplate('👑 SOLOMON', 'Tactical Lobber · North Court', '#38bdf8'));
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
      lobArc: 5.0,
      createModel: (BlahajModels) => {
        const shonk = BlahajModels.createPlushShark({
          bodyColor: 0x64748b, // slate grey
          bellyColor: 0xf1f5f9,
          scarfColor: 0xf97316, // safety orange
          eyeColor: 0x0f172a,
          scale: 1.15
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

        // Overhead 3D nametag
        shonk.add(createOpponentNameplate('🔨 HIRAM', 'Power Spiker · North Court', '#fb923c'));
        return shonk;
      }
    },
    birb: {
      id: 'birb',
      name: 'Captain Birb',
      title: 'WINGED BEACH MASCOT',
      portrait: 'assets/gallery/Emergency-2.png',
      desc: 'Flutter jumps and unpredictable wing boops. Always brings good vibes and enthusiastic cheeps.',
      speed: 5.2,
      accuracy: 0.82,
      lobArc: 5.8,
      createModel: (BlahajModels) => {
        const b = BlahajModels.createBirb(0xfacc15);
        b.scale.set(1.5, 1.5, 1.5);
        b.add(createOpponentNameplate('🐦 CAPTAIN BIRB', 'Beach Mascot · North Court', '#facc15'));
        return b;
      }
    }
  };

  let currentOpponentKey = 'sandy';
  let opponentActor = {
    key: 'sandy',
    mesh: null,
    pos: new THREE.Vector3(28.0, 1.65, 55.4),
    rotY: Math.PI,
    velY: 0,
    isGrounded: true,
    targetX: 28.0,
    targetZ: 55.4,
    jumpTimer: 0,
    celebrateTimer: 0
  };

  // Ball State & Floaty Physics
  const BALL_RADIUS = 0.55;
  const ball = {
    pos: new THREE.Vector3(28.0, 2.2, 49.8),
    vel: new THREE.Vector3(0, 0, 0),
    mesh: null,
    shadowMesh: null,
    reticleMesh: null,
    squish: 1.0,
    lastHitter: null, // 'player' | 'opponent'
    state: 'player_serve', // 'player_serve' | 'opponent_serve' | 'in_play' | 'scored'
    serveWaitTimer: 0,
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
    activeScene = resolveScene();
    if (opponentActor.mesh && opponentActor.mesh.parent) {
      opponentActor.mesh.parent.remove(opponentActor.mesh);
    }
    currentOpponentKey = OPPONENTS[opponentKey] ? opponentKey : 'sandy';
    const def = OPPONENTS[currentOpponentKey];

    if (window.BlahajModels) {
      opponentActor.mesh = def.createModel(window.BlahajModels);
    } else {
      opponentActor.mesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.45, 0.45, 1.5, 12),
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
  // BALL & SAND LANDING RETICLE CREATION
  // ==========================================================================
  function spawnBall() {
    activeScene = resolveScene();
    if (ball.mesh && ball.mesh.parent) {
      ball.mesh.parent.remove(ball.mesh);
    }
    if (ball.shadowMesh && ball.shadowMesh.parent) {
      ball.shadowMesh.parent.remove(ball.shadowMesh);
    }
    if (ball.reticleMesh && ball.reticleMesh.parent) {
      ball.reticleMesh.parent.remove(ball.reticleMesh);
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

    // Soft drop shadow directly beneath ball
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x3d2817,
      transparent: true,
      opacity: 0.40,
      depthWrite: false
    });
    ball.shadowMesh = new THREE.Mesh(new THREE.CircleGeometry(BALL_RADIUS * 1.15, 24), shadowMat);
    ball.shadowMesh.rotation.x = -Math.PI / 2;
    ball.shadowMesh.position.set(COURT.centerX, COURT.sandY + 0.02, COURT.playerStart.z + 0.8);
    if (activeScene) activeScene.add(ball.shadowMesh);

    // Glowing Sand Landing Reticle (Concentric target rings showing predicted landing spot)
    const reticleGroup = new THREE.Group();
    const reticleInnerMat = new THREE.MeshBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.85, depthWrite: false });
    const reticleInner = new THREE.Mesh(new THREE.RingGeometry(0.35, 0.48, 24), reticleInnerMat);
    reticleInner.rotation.x = -Math.PI / 2;
    reticleGroup.add(reticleInner);

    const reticleOuterMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.55, depthWrite: false });
    const reticleOuter = new THREE.Mesh(new THREE.RingGeometry(0.85, 0.98, 24), reticleOuterMat);
    reticleOuter.rotation.x = -Math.PI / 2;
    reticleGroup.add(reticleOuter);

    reticleGroup.position.set(COURT.centerX, COURT.sandY + 0.025, COURT.playerStart.z + 0.8);
    ball.reticleMesh = reticleGroup;
    if (activeScene) activeScene.add(ball.reticleMesh);

    setupServe('player');
  }

  function setupServe(server = 'player') {
    ball.squish = 1.0;
    ball.lastHitter = null;
    ball.vel.set(0, 0, 0);

    const oppDef = OPPONENTS[currentOpponentKey] || OPPONENTS.sandy;

    if (server === 'player') {
      ball.state = 'player_serve';
      ball.pos.set(COURT.centerX, COURT.sandY + 2.2, COURT.playerStart.z + 1.2);
      setHUDHint(`🏐 YOUR SERVE! Walk into the ball or press [Space] / [F] to boop over the net to ${oppDef.name.split(' ')[0]}!`);
    } else {
      ball.state = 'opponent_serve';
      ball.pos.set(COURT.centerX, COURT.sandY + 2.2, COURT.oppStart.z - 1.2);
      ball.serveWaitTimer = 1.5;
      setHUDHint(`🏐 ${oppDef.name.toUpperCase()} SERVES! Watch the glowing sand reticle and prepare to boop!`);
    }

    if (ball.mesh) {
      ball.mesh.position.copy(ball.pos);
      ball.mesh.scale.set(1, 1, 1);
    }

    if (isMatchActiveState) {
      broadcastMatchSync(true);
      broadcastStateSync();
    }
  }

  function setHUDHint(text) {
    const hintEl = document.querySelector('.vball-hud-hint');
    if (hintEl) hintEl.textContent = text;
  }

  // ==========================================================================
  // PARTICLE SYSTEM FOR SNOUT IMPACTS & SPARKLES
  // ==========================================================================
  function spawnBoopParticles(pos, color = 0x38bdf8, count = 20) {
    activeScene = resolveScene();
    if (!activeScene) return;
    for (let i = 0; i < count; i++) {
      const geo = new THREE.SphereGeometry(0.07 + Math.random() * 0.05, 6, 6);
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 });
      const pMesh = new THREE.Mesh(geo, mat);
      pMesh.position.copy(pos);
      activeScene.add(pMesh);

      const angle = Math.random() * Math.PI * 2;
      const speed = 2.0 + Math.random() * 3.6;
      particles.push({
        mesh: pMesh,
        vel: new THREE.Vector3(
          Math.cos(angle) * speed,
          2.2 + Math.random() * 3.8,
          Math.sin(angle) * speed
        ),
        life: 0.7,
        maxLife: 0.7
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
  // MULTIPLAYER CO-OP SPECTATOR SYNCHRONIZATION & NON-INTERFERENCE
  // ==========================================================================
  let isSpectatingState = false;
  let spectatorHostId = null;
  let spectatorHostSharkId = null;
  let netSyncTimer = 0;

  const spectatorTargetBall = {
    x: COURT.centerX,
    y: COURT.sandY + 2.05,
    z: COURT.playerStart.z + 1.2,
    vx: 0,
    vy: 0,
    vz: 0,
    squish: 1.0,
    state: 'player_serve'
  };

  const spectatorTargetOpp = {
    x: COURT.oppStart.x,
    y: COURT.oppStart.y,
    z: COURT.oppStart.z,
    rotY: COURT.oppStart.rotY,
    velY: 0,
    isGrounded: true,
    celebrateTimer: 0
  };

  function broadcastMatchSync(active) {
    if (window.BlahajNetwork && typeof window.BlahajNetwork.send === 'function') {
      window.BlahajNetwork.send({
        type: 'volleyball_match_sync',
        active: !!active,
        hostClientId: window.BlahajNetwork.getClientId ? window.BlahajNetwork.getClientId() : null,
        hostSharkId: (activePlayer && activePlayer.sharkId) || 'solomon',
        opponentKey: currentOpponentKey,
        playerScore,
        opponentScore,
        rallyCount
      });
    }
  }

  function broadcastStateSync() {
    if (window.BlahajNetwork && typeof window.BlahajNetwork.send === 'function') {
      window.BlahajNetwork.send({
        type: 'volleyball_state_sync',
        ball: {
          x: Number(ball.pos.x.toFixed(3)),
          y: Number(ball.pos.y.toFixed(3)),
          z: Number(ball.pos.z.toFixed(3)),
          vx: Number(ball.vel.x.toFixed(2)),
          vy: Number(ball.vel.y.toFixed(2)),
          vz: Number(ball.vel.z.toFixed(2)),
          squish: Number(ball.squish.toFixed(2)),
          state: ball.state
        },
        opponent: {
          x: Number(opponentActor.pos.x.toFixed(3)),
          y: Number(opponentActor.pos.y.toFixed(3)),
          z: Number(opponentActor.pos.z.toFixed(3)),
          rotY: Number(opponentActor.rotY.toFixed(3)),
          velY: Number(opponentActor.velY.toFixed(2)),
          isGrounded: opponentActor.isGrounded,
          celebrateTimer: opponentActor.celebrateTimer
        },
        playerScore,
        opponentScore,
        rallyCount,
        lastHitter: ball.lastHitter
      });
    }
  }

  function broadcastEvent(eventName, pos, color, hitter) {
    if (window.BlahajNetwork && typeof window.BlahajNetwork.send === 'function') {
      window.BlahajNetwork.send({
        type: 'volleyball_event',
        event: eventName,
        x: Number((pos ? pos.x : COURT.centerX).toFixed(3)),
        y: Number((pos ? pos.y : COURT.sandY + 1.0).toFixed(3)),
        z: Number((pos ? pos.z : COURT.centerZ).toFixed(3)),
        color: color || 0x38bdf8,
        hitter,
        rallyCount,
        playerScore,
        opponentScore
      });
    }
  }

  // ==========================================================================
  // MATCH LIFECYCLE
  // ==========================================================================
  function startMatch(opponentKey = 'sandy', sceneRef, playerRef) {
    activeScene = sceneRef || resolveScene();
    activePlayer = playerRef || resolvePlayer();
    isMatchActiveState = true;
    isSpectatingState = false;

    playerScore = 0;
    opponentScore = 0;
    rallyCount = 0;

    spawnOpponent(opponentKey);
    spawnBall();

    // Position player cleanly on south court
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

    // Align camera behind player facing north down the volleyball court with elevated view
    if (window.camState) {
      window.camState.yaw = Math.PI;
      window.camState.pitch = 0.32;
      window.camState.distance = 5.4;
      window.camState.heightOffset = 2.4;
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
      vHud.classList.remove('spectator');
      const badge = vHud.querySelector('.vball-hud-badge');
      if (badge) badge.textContent = '🏐 CRESCENT BEACH VOLLEYBALL 🦈';
      const p1Label = document.getElementById('vball-p1-label');
      if (p1Label) p1Label.textContent = 'YOU';
      const oppNameEl = document.getElementById('vball-opp-name');
      if (oppNameEl) {
        oppNameEl.textContent = (OPPONENTS[currentOpponentKey] ? OPPONENTS[currentOpponentKey].name : 'SANDY').toUpperCase();
      }
      const btnLeave = document.getElementById('btn-leave-volleyball');
      if (btnLeave) btnLeave.textContent = '✕ LEAVE MATCH [Esc]';
      updateScoreboardUI();
    }

    // Wire Leave Match button
    const btnLeave = document.getElementById('btn-leave-volleyball');
    if (btnLeave && !btnLeave.dataset.bound) {
      btnLeave.dataset.bound = 'true';
      btnLeave.addEventListener('click', (e) => {
        e.stopPropagation();
        if (isSpectatingState) {
          endSpectating();
        } else {
          endMatch();
        }
      });
    }

    broadcastMatchSync(true);

    const oppDef = OPPONENTS[currentOpponentKey] || OPPONENTS.sandy;
    if (typeof showToast === 'function') {
      showToast(
        'SHARK BEACH VOLLEYBALL 🏐',
        `Match started vs ${oppDef.name}! YOUR SERVE: Walk into the ball and press [Space] to boop!`
      );
    }
  }

  function endMatch() {
    if (!isMatchActiveState) return;
    isMatchActiveState = false;

    broadcastMatchSync(false);

    // Clean up opponent mesh
    if (opponentActor.mesh && opponentActor.mesh.parent) {
      opponentActor.mesh.parent.remove(opponentActor.mesh);
      opponentActor.mesh = null;
    }

    // Clean up ball, shadow & reticle
    if (ball.mesh && ball.mesh.parent) {
      ball.mesh.parent.remove(ball.mesh);
      ball.mesh = null;
    }
    if (ball.shadowMesh && ball.shadowMesh.parent) {
      ball.shadowMesh.parent.remove(ball.shadowMesh);
      ball.shadowMesh = null;
    }
    if (ball.reticleMesh && ball.reticleMesh.parent) {
      ball.reticleMesh.parent.remove(ball.reticleMesh);
      ball.reticleMesh = null;
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
    if (vHud) {
      vHud.classList.add('hidden');
      vHud.classList.remove('spectator');
    }

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

    if (!activeScene) activeScene = resolveScene();
    if (!activePlayer) activePlayer = player || resolvePlayer();
    if (!player) player = activePlayer;

    updateParticles(dt);

    // 1. Constrain Player to South Court
    if (player) {
      player.pos.x = THREE.MathUtils.clamp(player.pos.x, COURT.minX, COURT.maxX);
      player.pos.z = THREE.MathUtils.clamp(player.pos.z, COURT.minZ, COURT.netZ - 0.45);
      player.pos.y = COURT.sandY;
    }

    const oppDef = OPPONENTS[currentOpponentKey] || OPPONENTS.sandy;

    // 2. State Machine: Serving or In-Play
    if (ball.state === 'player_serve') {
      // Ball hovers gently in front of player waiting for serve boop
      ball.pos.x = COURT.centerX;
      ball.pos.z = COURT.playerStart.z + 0.75;
      ball.pos.y = COURT.sandY + 2.05 + Math.sin(Date.now() * 0.005) * 0.15;

      // Check if player approaches and hits the ball to serve!
      if (player) {
        const distToBall = ball.pos.distanceTo(player.pos);
        if (distToBall < 2.0 || isBoopKey) {
          // PLAYER SERVES!
          ball.state = 'in_play';
          ball.lastHitter = 'player';
          ball.vel.set((Math.random() - 0.5) * 0.8, 5.8, 6.4);
          ball.squish = 0.65;
          spawnBoopParticles(ball.pos, 0xfacc15, 24);
          if (typeof CozyAudio !== 'undefined' && CozyAudio.shonk) CozyAudio.shonk();
          setHUDHint(`🔥 RALLY STARTED! Ball served to ${oppDef.name.split(' ')[0]}!`);
          if (typeof showToast === 'function') showToast('SERVE BOOP! 🏐', 'Ball launched over the bamboo net!');
          broadcastEvent('boop', ball.pos, 0xfacc15, 'player');
          broadcastStateSync();
        }
      }
    } else if (ball.state === 'opponent_serve') {
      // Opponent winds up and serves
      ball.pos.x = COURT.centerX;
      ball.pos.z = COURT.oppStart.z - 0.75;
      ball.pos.y = COURT.sandY + 2.05 + Math.sin(Date.now() * 0.005) * 0.15;

      ball.serveWaitTimer -= dt;
      if (ball.serveWaitTimer <= 0) {
        // OPPONENT SERVES!
        ball.state = 'in_play';
        ball.lastHitter = 'opponent';
        ball.vel.set((Math.random() - 0.5) * 0.8, 5.8, -6.4);
        ball.squish = 0.65;
        opponentActor.velY = 3.6;
        opponentActor.isGrounded = false;
        spawnBoopParticles(ball.pos, 0x38bdf8, 24);
        if (typeof CozyAudio !== 'undefined' && CozyAudio.shonk) CozyAudio.shonk();
        setHUDHint(`🏐 ${oppDef.name.split(' ')[0].toUpperCase()} SERVES! Get under the glowing reticle and header-boop!`);
        broadcastEvent('boop', ball.pos, 0x38bdf8, 'opponent');
        broadcastStateSync();
      }
    } else if (ball.state === 'in_play') {
      // Floaty, pleasant cartoony gravity
      const GRAVITY = -7.2;
      ball.vel.y += GRAVITY * dt;

      // Gentle horizontal drag
      ball.vel.x *= 0.995;
      ball.vel.z *= 0.995;

      ball.pos.addScaledVector(ball.vel, dt);

      // Rotate ball along flight trajectory
      if (ball.mesh) {
        ball.mesh.rotation.x += ball.vel.z * 1.6 * dt;
        ball.mesh.rotation.z -= ball.vel.x * 1.6 * dt;
      }

      // Check Net Collision (Net at netZ = 52.0, top is 2.75)
      const prevZ = ball.pos.z - ball.vel.z * dt;
      const crossedNet = (prevZ < COURT.netZ && ball.pos.z >= COURT.netZ) || (prevZ > COURT.netZ && ball.pos.z <= COURT.netZ);
      if (crossedNet && ball.pos.y < COURT.netTopY && ball.pos.x >= COURT.minX - 0.4 && ball.pos.x <= COURT.maxX + 0.4) {
        // Net rebound!
        ball.vel.z = -ball.vel.z * 0.45;
        ball.vel.y = Math.max(2.0, ball.vel.y * 0.55);
        ball.pos.z = prevZ;
        spawnBoopParticles(ball.pos, 0xd4a373, 12);
        if (typeof CozyAudio !== 'undefined' && CozyAudio.shonk) CozyAudio.shonk();
      }

      // Check Snout Boop by Player
      if (player && ball.vel.z <= 0.8) {
        const pSnout = new THREE.Vector3(
          player.pos.x + Math.sin(player.rotY) * 0.85,
          player.pos.y + 0.5,
          player.pos.z + Math.cos(player.rotY) * 0.85
        );
        const distToPlayerSnout = ball.pos.distanceTo(pSnout);
        const distToPlayerCenter = ball.pos.distanceTo(player.pos);
        const canBoop = distToPlayerSnout < 1.9 || distToPlayerCenter < 2.1 || (isBoopKey && distToPlayerCenter < 2.8);

        if (canBoop && ball.pos.z < COURT.netZ + 0.3) {
          // PLAYER SNOUT BOOP!
          rallyCount++;
          if (rallyCount > bestRally) bestRally = rallyCount;
          ball.lastHitter = 'player';
          ball.squish = 0.6;

          const targetZDist = COURT.oppStart.z - ball.pos.z;
          ball.vel.z = Math.min(8.6, Math.max(6.2, targetZDist * 1.05 + 1.2));
          ball.vel.y = 5.6 + Math.random() * 0.8;
          const deltaX = (player.pos.x - COURT.centerX);
          ball.vel.x = -deltaX * 0.45 + (Math.random() - 0.5) * 1.4;
          ball.vel.x = THREE.MathUtils.clamp(ball.vel.x, -2.4, 2.4);

          spawnBoopParticles(pSnout, 0xfacc15, 24);
          if (typeof CozyAudio !== 'undefined' && CozyAudio.shonk) CozyAudio.shonk();
          updateScoreboardUI();
          setHUDHint(`🔥 RALLY: ${rallyCount}! High snout boop over the bamboo net!`);
          broadcastEvent('boop', pSnout, 0xfacc15, 'player');
          broadcastStateSync();
        }
      }

      // Check Snout Boop by Opponent AI
      if (ball.vel.z >= -0.8 && ball.pos.z > COURT.netZ - 0.3) {
        const oppSnout = new THREE.Vector3(
          opponentActor.pos.x + Math.sin(opponentActor.rotY) * 0.85,
          opponentActor.pos.y + 0.5,
          opponentActor.pos.z + Math.cos(opponentActor.rotY) * 0.85
        );
        const distToOppSnout = ball.pos.distanceTo(oppSnout);
        const distToOppCenter = ball.pos.distanceTo(opponentActor.pos);

        if (distToOppSnout < 1.9 || distToOppCenter < 2.1) {
          // OPPONENT SNOUT BOOP!
          rallyCount++;
          if (rallyCount > bestRally) bestRally = rallyCount;
          ball.lastHitter = 'opponent';
          ball.squish = 0.6;

          opponentActor.velY = 3.8;
          opponentActor.isGrounded = false;

          const targetZDist = ball.pos.z - COURT.playerStart.z;
          ball.vel.z = -Math.min(8.4, Math.max(6.0, targetZDist * 1.05 + 1.0));
          ball.vel.y = oppDef.lobArc + (Math.random() - 0.5) * 0.6;
          const targetX = player ? player.pos.x : COURT.centerX;
          const dirX = (targetX - opponentActor.pos.x) * 0.35 + (Math.random() - 0.5) * 1.2;
          ball.vel.x = THREE.MathUtils.clamp(dirX, -2.4, 2.4);

          spawnBoopParticles(oppSnout, 0x38bdf8, 24);
          if (typeof CozyAudio !== 'undefined' && CozyAudio.shonk) CozyAudio.shonk();
          updateScoreboardUI();
          setHUDHint(`🔥 RALLY: ${rallyCount}! ${oppDef.name.split(' ')[0]} booped it back! Get under the reticle!`);
          broadcastEvent('boop', oppSnout, 0x38bdf8, 'opponent');
          broadcastStateSync();
        }
      }

      // Check Sand Ground Landing & Scoring
      if (ball.pos.y <= COURT.sandY + BALL_RADIUS) {
        ball.pos.y = COURT.sandY + BALL_RADIUS;
        handleBallLanding();
      }
    }

    // Broadcast throttled real-time multiplayer state to partner/spectators
    netSyncTimer += dt;
    if (netSyncTimer >= 0.045) {
      netSyncTimer = 0;
      broadcastStateSync();
    }

    // 3. Update Ball Visuals & Glowing Sand Landing Reticle
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
      const shadowScale = Math.max(0.4, 1.0 - heightAbove * 0.10);
      ball.shadowMesh.scale.set(shadowScale, shadowScale, shadowScale);
      ball.shadowMesh.material.opacity = Math.max(0.12, 0.44 - heightAbove * 0.05);
    }

    // Calculate exact sand landing prediction for Glowing Reticle
    if (ball.reticleMesh) {
      let landX = ball.pos.x;
      let landZ = ball.pos.z;

      if (ball.state === 'in_play' && ball.vel.y < 3.0) {
        const h = Math.max(0, ball.pos.y - (COURT.sandY + BALL_RADIUS));
        const disc = ball.vel.y * ball.vel.y + 14.4 * h;
        if (disc >= 0) {
          const tLand = (ball.vel.y + Math.sqrt(disc)) / 7.2;
          landX = THREE.MathUtils.clamp(ball.pos.x + ball.vel.x * tLand, COURT.minX, COURT.maxX);
          landZ = THREE.MathUtils.clamp(ball.pos.z + ball.vel.z * tLand, COURT.minZ, COURT.maxZ);
        }
      }

      ball.reticleMesh.position.set(landX, COURT.sandY + 0.025, landZ);
      const pulse = 1.0 + Math.sin(Date.now() * 0.008) * 0.15;
      ball.reticleMesh.scale.set(pulse, pulse, pulse);
    }

    // 4. Update Opponent AI Movement & Tracking
    updateOpponentAI(dt);
  }

  function handleBallLanding() {
    ball.state = 'scored';
    spawnBoopParticles(ball.pos, 0xd4a373, 24);
    broadcastEvent('point', ball.pos, 0xd4a373, null);
    broadcastStateSync();

    const isNorthSide = ball.pos.z >= COURT.netZ;
    const isSouthSide = ball.pos.z < COURT.netZ;
    const oppDef = OPPONENTS[currentOpponentKey] || OPPONENTS.sandy;

    if (isSouthSide) {
      // Ball landed on player's half -> Opponent scores!
      opponentScore++;
      ball.nextServer = 'player';
      opponentActor.celebrateTimer = 1.8;
      setHUDHint(`POINT TO ${oppDef.name.toUpperCase()}! (Rally was ${rallyCount})`);
      if (typeof showToast === 'function') {
        showToast(`${oppDef.name.toUpperCase()} SCORES! 🏐`, `Ball landed on your sand! (Rally: ${rallyCount})`);
      }
    } else {
      // Ball landed on opponent's half -> Player scores!
      playerScore++;
      ball.nextServer = 'opponent';
      setHUDHint(`POINT TO YOU! 🔥 Great snout header! (Rally was ${rallyCount})`);
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
        setupServe('player');
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
        setupServe('player');
      }, 3500);
      return;
    }

    // Normal point reset after short pause
    setTimeout(() => {
      rallyCount = 0;
      updateScoreboardUI();
      setupServe(ball.nextServer);
    }, 2000);
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
      opponentActor.targetX = THREE.MathUtils.clamp(ball.pos.x, COURT.minX + 0.4, COURT.maxX - 0.4);
      opponentActor.targetZ = THREE.MathUtils.clamp(ball.pos.z + 0.6, COURT.netZ + 0.6, COURT.maxZ - 0.4);
    } else {
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
  // SPECTATOR MODE FOR MULTIPLAYER / CO-OP PARTNERS
  // ==========================================================================
  function startSpectating(data, sceneRef, playerRef) {
    if (isMatchActiveState) return;

    activeScene = sceneRef || resolveScene();
    activePlayer = playerRef || resolvePlayer();
    isSpectatingState = true;

    spectatorHostId = data && data.hostClientId;
    spectatorHostSharkId = (data && data.hostSharkId) || 'solomon';
    currentOpponentKey = (data && data.opponentKey) || 'sandy';
    playerScore = (data && data.playerScore) || 0;
    opponentScore = (data && data.opponentScore) || 0;
    rallyCount = (data && data.rallyCount) || 0;

    spawnOpponent(currentOpponentKey);
    spawnBall();

    if (data && data.ball) {
      ball.pos.set(data.ball.x, data.ball.y, data.ball.z);
      spectatorTargetBall.x = data.ball.x;
      spectatorTargetBall.y = data.ball.y;
      spectatorTargetBall.z = data.ball.z;
    }
    if (data && data.opponent) {
      opponentActor.pos.set(data.opponent.x, data.opponent.y, data.opponent.z);
      opponentActor.rotY = data.opponent.rotY;
      spectatorTargetOpp.x = data.opponent.x;
      spectatorTargetOpp.y = data.opponent.y;
      spectatorTargetOpp.z = data.opponent.z;
    }

    // Configure Spectator HUD
    const vHud = document.getElementById('volleyball-hud');
    if (vHud) {
      vHud.classList.remove('hidden');
      vHud.classList.add('spectator');
      const badge = vHud.querySelector('.vball-hud-badge');
      if (badge) badge.textContent = '👀 SPECTATING PARTNER · CRESCENT BEACH 🏖️';
      const p1Label = document.getElementById('vball-p1-label');
      if (p1Label) p1Label.textContent = 'PARTNER';
      const oppNameEl = document.getElementById('vball-opp-name');
      if (oppNameEl) {
        oppNameEl.textContent = (OPPONENTS[currentOpponentKey] ? OPPONENTS[currentOpponentKey].name : 'SANDY').toUpperCase();
      }
      setHUDHint('👀 Cheering from the sidelines! Non-interference zone protects the active court.');
      const btnLeave = document.getElementById('btn-leave-volleyball');
      if (btnLeave) btnLeave.textContent = '✕ HIDE HUD [Esc]';
      updateScoreboardUI();
    }

    const oppDef = OPPONENTS[currentOpponentKey] || OPPONENTS.sandy;
    if (typeof showToast === 'function') {
      showToast(
        '👀 SPECTATING PARTNER MATCH',
        `Your partner started volleyball vs ${oppDef.name}! Watch the rally from the sidelines!`
      );
    }
  }

  function applySpectatorState(data) {
    if (isMatchActiveState) return;
    if (!isSpectatingState) {
      startSpectating(data);
      return;
    }

    if (data.ball) {
      spectatorTargetBall.x = data.ball.x;
      spectatorTargetBall.y = data.ball.y;
      spectatorTargetBall.z = data.ball.z;
      spectatorTargetBall.vx = data.ball.vx;
      spectatorTargetBall.vy = data.ball.vy;
      spectatorTargetBall.vz = data.ball.vz;
      spectatorTargetBall.squish = data.ball.squish;
      spectatorTargetBall.state = data.ball.state;
      ball.squish = data.ball.squish;
      ball.state = data.ball.state;
    }

    if (data.opponent) {
      spectatorTargetOpp.x = data.opponent.x;
      spectatorTargetOpp.y = data.opponent.y;
      spectatorTargetOpp.z = data.opponent.z;
      spectatorTargetOpp.rotY = data.opponent.rotY;
      spectatorTargetOpp.velY = data.opponent.velY;
      spectatorTargetOpp.isGrounded = data.opponent.isGrounded;
      spectatorTargetOpp.celebrateTimer = data.opponent.celebrateTimer;
    }

    if (typeof data.playerScore === 'number') playerScore = data.playerScore;
    if (typeof data.opponentScore === 'number') opponentScore = data.opponentScore;
    if (typeof data.rallyCount === 'number') rallyCount = data.rallyCount;
    updateScoreboardUI();
  }

  function handleSpectatorEvent(data) {
    if (isMatchActiveState) return;
    if (!isSpectatingState) startSpectating(data);

    if (data.event === 'boop') {
      const p = new THREE.Vector3(data.x, data.y, data.z);
      spawnBoopParticles(p, data.color || 0x38bdf8, 20);
      if (typeof CozyAudio !== 'undefined' && CozyAudio.shonk) CozyAudio.shonk();
      if (typeof data.rallyCount === 'number') {
        rallyCount = data.rallyCount;
        updateScoreboardUI();
        const oppDef = OPPONENTS[currentOpponentKey] || OPPONENTS.sandy;
        const hitterName = data.hitter === 'player' ? 'Partner' : oppDef.name.split(' ')[0];
        setHUDHint(`🔥 RALLY: ${rallyCount}! ${hitterName} booped it over the net!`);
      }
    } else if (data.event === 'point') {
      const p = new THREE.Vector3(data.x, data.y, data.z);
      spawnBoopParticles(p, 0xd4a373, 24);
      if (typeof CozyAudio !== 'undefined' && CozyAudio.portalChime) CozyAudio.portalChime();
      if (typeof data.playerScore === 'number') playerScore = data.playerScore;
      if (typeof data.opponentScore === 'number') opponentScore = data.opponentScore;
      updateScoreboardUI();
    }
  }

  function updateSpectator(dt) {
    if (!isSpectatingState) return;
    dt = Math.min(dt || 0.016, 0.05);

    if (!activeScene) activeScene = resolveScene();
    updateParticles(dt);

    // Dead-reckon ball target forward by its velocity
    if (spectatorTargetBall.state === 'in_play') {
      spectatorTargetBall.vy -= 7.2 * dt;
      spectatorTargetBall.x += spectatorTargetBall.vx * dt;
      spectatorTargetBall.y += spectatorTargetBall.vy * dt;
      spectatorTargetBall.z += spectatorTargetBall.vz * dt;
    }

    // Smoothly lerp ball to target position
    const ballLerp = Math.min(1.0, dt * 18);
    ball.pos.x += (spectatorTargetBall.x - ball.pos.x) * ballLerp;
    ball.pos.y += (spectatorTargetBall.y - ball.pos.y) * ballLerp;
    ball.pos.z += (spectatorTargetBall.z - ball.pos.z) * ballLerp;

    if (ball.mesh) {
      ball.mesh.position.copy(ball.pos);
      ball.mesh.rotation.x += (spectatorTargetBall.vz || 0) * 1.6 * dt;
      ball.mesh.rotation.z -= (spectatorTargetBall.vx || 0) * 1.6 * dt;
      ball.mesh.scale.set(
        1.0 + (1.0 - ball.squish) * 0.35,
        ball.squish,
        1.0 + (1.0 - ball.squish) * 0.35
      );
    }

    if (ball.shadowMesh) {
      ball.shadowMesh.position.set(ball.pos.x, COURT.sandY + 0.02, ball.pos.z);
      const heightAbove = Math.max(0, ball.pos.y - (COURT.sandY + BALL_RADIUS));
      const shadowScale = Math.max(0.4, 1.0 - heightAbove * 0.10);
      ball.shadowMesh.scale.set(shadowScale, shadowScale, shadowScale);
      ball.shadowMesh.material.opacity = Math.max(0.12, 0.44 - heightAbove * 0.05);
    }

    if (ball.reticleMesh) {
      ball.reticleMesh.position.set(ball.pos.x, COURT.sandY + 0.025, ball.pos.z);
      const pulse = 1.0 + Math.sin(Date.now() * 0.008) * 0.15;
      ball.reticleMesh.scale.set(pulse, pulse, pulse);
    }

    // Smoothly lerp opponent actor
    const oppLerp = Math.min(1.0, dt * 14);
    opponentActor.pos.x += (spectatorTargetOpp.x - opponentActor.pos.x) * oppLerp;
    opponentActor.pos.y += (spectatorTargetOpp.y - opponentActor.pos.y) * oppLerp;
    opponentActor.pos.z += (spectatorTargetOpp.z - opponentActor.pos.z) * oppLerp;
    opponentActor.rotY = spectatorTargetOpp.rotY;

    if (opponentActor.mesh) {
      opponentActor.mesh.position.copy(opponentActor.pos);
      opponentActor.mesh.rotation.y = opponentActor.rotY;
      const distMoving = Math.hypot(
        spectatorTargetOpp.x - opponentActor.pos.x,
        spectatorTargetOpp.z - opponentActor.pos.z
      );
      if (window.BlahajModels && window.BlahajModels.animateShark) {
        window.BlahajModels.animateShark(opponentActor.mesh, dt, distMoving > 0.05, Date.now() * 0.001);
      }
    }
  }

  function endSpectating() {
    if (!isSpectatingState) return;
    isSpectatingState = false;

    // Clean up opponent mesh
    if (opponentActor.mesh && opponentActor.mesh.parent) {
      opponentActor.mesh.parent.remove(opponentActor.mesh);
      opponentActor.mesh = null;
    }

    // Clean up ball, shadow & reticle
    if (ball.mesh && ball.mesh.parent) {
      ball.mesh.parent.remove(ball.mesh);
      ball.mesh = null;
    }
    if (ball.shadowMesh && ball.shadowMesh.parent) {
      ball.shadowMesh.parent.remove(ball.shadowMesh);
      ball.shadowMesh = null;
    }
    if (ball.reticleMesh && ball.reticleMesh.parent) {
      ball.reticleMesh.parent.remove(ball.reticleMesh);
      ball.reticleMesh = null;
    }

    // Clean up particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      if (p.mesh.parent) p.mesh.parent.remove(p.mesh);
      p.mesh.geometry.dispose();
      p.mesh.material.dispose();
    }
    particles.length = 0;

    // Restore HUD
    const vHud = document.getElementById('volleyball-hud');
    if (vHud) {
      vHud.classList.add('hidden');
      vHud.classList.remove('spectator');
      const badge = vHud.querySelector('.vball-hud-badge');
      if (badge) badge.textContent = '🏐 CRESCENT BEACH VOLLEYBALL 🦈';
      const p1Label = document.getElementById('vball-p1-label');
      if (p1Label) p1Label.textContent = 'YOU';
      const btnLeave = document.getElementById('btn-leave-volleyball');
      if (btnLeave) btnLeave.textContent = '✕ LEAVE MATCH [Esc]';
    }

    if (typeof showToast === 'function') {
      showToast('SPECTATING CONCLUDED 🏖️', 'Volleyball match ended at Crescent Beach.');
    }
  }

  // Non-Interference Spectator Boundary Checking
  function isWithinActiveCourt(x, z) {
    return x >= (COURT.minX - 0.2) && x <= (COURT.maxX + 0.2) &&
           z >= (COURT.minZ - 0.2) && z <= (COURT.maxZ + 0.2);
  }

  function constrainSpectatorPosition(currentPos, nextX, nextZ) {
    if (!isWithinActiveCourt(nextX, nextZ)) {
      return { x: nextX, z: nextZ, blocked: false };
    }
    // Repel towards closest outer perimeter edge
    const dWest = Math.abs(nextX - (COURT.minX - 0.35));
    const dEast = Math.abs((COURT.maxX + 0.35) - nextX);
    const dSouth = Math.abs(nextZ - (COURT.minZ - 0.35));
    const dNorth = Math.abs((COURT.maxZ + 0.35) - nextZ);
    const minD = Math.min(dWest, dEast, dSouth, dNorth);

    let clampedX = nextX;
    let clampedZ = nextZ;
    if (minD === dWest) clampedX = COURT.minX - 0.4;
    else if (minD === dEast) clampedX = COURT.maxX + 0.4;
    else if (minD === dSouth) clampedZ = COURT.minZ - 0.4;
    else clampedZ = COURT.maxZ + 0.4;

    return { x: clampedX, z: clampedZ, blocked: true };
  }

  // ==========================================================================
  // OPPONENT SELECTION MODAL WITH SUNNY THE BEACH CARROT
  // ==========================================================================
  function openOpponentSelectModal(openDialogueModalFn, closeDialogueModalFn, sceneRef, playerRef) {
    activeScene = sceneRef || resolveScene();
    activePlayer = playerRef || resolvePlayer();

    // If partner is currently in a match, Sunny invites player to relax and spectate from the lounge!
    if (isSpectatingState) {
      const oppDef = OPPONENTS[currentOpponentKey] || OPPONENTS.sandy;
      if (typeof openDialogueModalFn === 'function') {
        openDialogueModalFn({
          speaker: 'Sunny the Beach Carrot',
          role: 'CRESCENT BEACH REFEREE & CONNOISSEUR',
          portrait: 'assets/gallery/Volcano-temple.png',
          text: `“Shh! Don’t distract them! Your partner is currently locked in an intense volleyball rally against ${oppDef.name} right now on Crescent Beach! Grab a chilled coconut drink, sit in the deckchairs, and cheer them on from the spectator terrace!”`,
          actions: [
            {
              label: '👀 View Match from Spectator Lounge [Cam]',
              className: 'btn-primary',
              onClick: () => {
                if (closeDialogueModalFn) closeDialogueModalFn();
                if (window.camState) {
                  window.camState.yaw = 1.95;
                  window.camState.pitch = 0.28;
                  window.camState.distance = 6.2;
                }
                if (typeof showToast === 'function') {
                  showToast('👀 SPECTATOR VIEW', 'Enjoying the match from the Crescent Beach lounge!');
                }
              }
            },
            {
              label: '🏖️ Just Lounging by the Waves (Close)',
              className: 'btn-secondary',
              onClick: () => {
                if (closeDialogueModalFn) closeDialogueModalFn();
              }
            }
          ]
        });
        return;
      }
    }

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
    setSceneAndPlayer: (s, p) => { activeScene = s; activePlayer = p; },
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
    getInteractables: () => [],

    // Multiplayer Spectator & Non-Interference API
    startSpectating,
    applySpectatorState,
    handleSpectatorEvent,
    updateSpectator,
    endSpectating,
    isSpectating: () => isSpectatingState,
    broadcastMatchSync,
    constrainSpectatorPosition,
    isWithinActiveCourt,
    toggleSpectatorHUD: () => {
      const vHud = document.getElementById('volleyball-hud');
      if (vHud) vHud.classList.toggle('hidden');
    }
  };
})();
