// BLÅHAJ ISLAND - CRESCENT BEACH SHARK VOLLEYBALL INSTANCE
// Cartoony, floaty beach volleyball where sharks bounce the ball with their snouts!
// ============================================================================

window.BlahajVolleyball = (function () {
  let built = false;
  let active = false;
  let scn = null;

  // Court geometry & boundaries (meters)
  // Net is at z = 0, stretching along x from -3.6 to +3.6
  // Player side: z in [-5.8, -0.4], x in [-3.6, 3.6]
  // Opponent side: z in [0.4, 5.8], x in [-3.6, 3.6]
  const COURT = {
    minX: -3.8,
    maxX: 3.8,
    minZ: -5.8,
    maxZ: 5.8,
    netZ: 0,
    netWidth: 7.2,
    netTopY: 2.3,
    netBottomY: 1.0,
    sandY: 1.2,
    playerStart: { x: 0, y: 1.2, z: -3.0, rotY: 0 },
    oppStart: { x: 0, y: 1.2, z: 3.0, rotY: Math.PI }
  };

  // Ball physics state
  const BALL_RADIUS = 0.52;
  const ball = {
    pos: new THREE.Vector3(0, 4.2, -2.5),
    vel: new THREE.Vector3(0, 2.0, 0),
    mesh: null,
    shadowMesh: null,
    squish: 1.0,
    lastHitter: null, // 'player' | 'opponent'
    state: 'in_play', // 'in_play' | 'scored' | 'serving'
    serveTimer: 0,
    nextServer: 'player'
  };

  // Match & Rally statistics
  let rallyCount = 0;
  let bestRally = 0;
  let playerScore = 0;
  let opponentScore = 0;

  // AI Opponent: Sandy the Beach Shonk
  const sandy = {
    mesh: null,
    pos: new THREE.Vector3(0, 1.2, 3.0),
    rotY: Math.PI,
    velY: 0,
    isGrounded: true,
    speed: 3.6,
    jumpTimer: 0,
    celebrateTimer: 0
  };

  // Spectators & animated props
  let sunnyRefMesh = null;
  const cheeringBirbs = [];
  const ribbonFlags = [];
  let waterPlane = null;
  let scoreboardCanvas = null;
  let scoreboardTex = null;
  let scoreboardMesh = null;

  // Particle pool for snout impacts and sparkles
  const particles = [];

  // ==========================================================================
  // SCENE BUILDER
  // ==========================================================================
  function build() {
    if (built) return;
    scn = new THREE.Scene();
    scn.background = new THREE.Color(0x76b8df);
    scn.fog = new THREE.FogExp2(0x8ed0f2, 0.005);

    // Warm tropical lighting
    const ambient = new THREE.AmbientLight(0xfff5e6, 0.85);
    scn.add(ambient);

    const sun = new THREE.DirectionalLight(0xffeedd, 1.4);
    sun.position.set(25, 45, -20);
    sun.castShadow = true;
    scn.add(sun);

    // 1. Crescent Beach Sandy Terrain
    const sandMat = new THREE.MeshStandardMaterial({
      color: 0xe5c28b,
      roughness: 0.92,
      metalness: 0.02
    });
    const sandGeo = new THREE.PlaneGeometry(60, 50, 32, 32);
    // Add gentle natural beach contour
    const posAttr = sandGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const px = posAttr.getX(i);
      const pz = posAttr.getY(i); // PlaneGeometry lies in XY initially
      const wave = Math.sin(px * 0.1) * 0.2 + Math.cos(pz * 0.08) * 0.15;
      posAttr.setZ(i, wave);
    }
    sandGeo.computeVertexNormals();

    const sandTerrain = new THREE.Mesh(sandGeo, sandMat);
    sandTerrain.rotation.x = -Math.PI / 2;
    sandTerrain.position.set(0, COURT.sandY - 0.05, 0);
    sandTerrain.receiveShadow = true;
    scn.add(sandTerrain);

    // 2. Turquoise Ocean Plane at the Beach Edge
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x14b8a6,
      roughness: 0.15,
      metalness: 0.1,
      transparent: true,
      opacity: 0.85
    });
    waterPlane = new THREE.Mesh(new THREE.PlaneGeometry(80, 40), waterMat);
    waterPlane.rotation.x = -Math.PI / 2;
    waterPlane.position.set(0, COURT.sandY - 0.45, 18);
    scn.add(waterPlane);

    // White foam shoreline ribbon
    const foamMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.65 });
    const foamRibbon = new THREE.Mesh(new THREE.PlaneGeometry(60, 1.8), foamMat);
    foamRibbon.rotation.x = -Math.PI / 2;
    foamRibbon.position.set(0, COURT.sandY - 0.35, 10.5);
    scn.add(foamRibbon);

    // 3. Court Markings & Driftwood Borders
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 });
    // Border tape ribbons in the sand (12m x 7m)
    const courtWidth = COURT.maxX - COURT.minX;
    const courtLength = COURT.maxZ - COURT.minZ;

    // Outer baseline and sideline ribbons
    const createTape = (w, h, x, z) => {
      const tape = new THREE.Mesh(new THREE.PlaneGeometry(w, h), lineMat);
      tape.rotation.x = -Math.PI / 2;
      tape.position.set(x, COURT.sandY + 0.015, z);
      scn.add(tape);
    };
    createTape(courtWidth, 0.12, 0, COURT.minZ); // South Baseline
    createTape(courtWidth, 0.12, 0, COURT.maxZ); // North Baseline
    createTape(0.12, courtLength, COURT.minX, 0); // West Sideline
    createTape(0.12, courtLength, COURT.maxX, 0); // East Sideline
    createTape(courtWidth, 0.08, 0, 0); // Center line beneath net

    // Corner wooden pegs with colorful flags
    const flagGeo = new THREE.ConeGeometry(0.12, 0.4, 4);
    const flagCols = [0xef4444, 0x3b82f6, 0xf59e0b, 0x10b981];
    [
      [COURT.minX, COURT.minZ],
      [COURT.maxX, COURT.minZ],
      [COURT.minX, COURT.maxZ],
      [COURT.maxX, COURT.maxZ]
    ].forEach(([cx, cz], i) => {
      const peg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.9, 6), new THREE.MeshStandardMaterial({ color: 0x8b5a2b }));
      peg.position.set(cx, COURT.sandY + 0.45, cz);
      scn.add(peg);
      const flag = new THREE.Mesh(flagGeo, new THREE.MeshBasicMaterial({ color: flagCols[i] }));
      flag.position.set(cx, COURT.sandY + 0.85, cz);
      flag.rotation.z = Math.PI / 2;
      scn.add(flag);
    });

    // 4. The Bamboo Volleyball Net Structure
    const bambooMat = new THREE.MeshStandardMaterial({ color: 0xd4a373, roughness: 0.6 });
    const netMeshMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      wireframe: true,
      transparent: true,
      opacity: 0.8
    });
    const tapeBandMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4 });

    // Net Posts
    [-COURT.maxX - 0.4, COURT.maxX + 0.4].forEach((px) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 3.4, 12), bambooMat);
      post.position.set(px, COURT.sandY + 1.7, 0);
      post.castShadow = true;
      scn.add(post);

      // Brass ring cap
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), new THREE.MeshStandardMaterial({ color: 0xd97706 }));
      cap.position.set(px, COURT.sandY + 3.45, 0);
      scn.add(cap);

      // Guyline ropes pinned into sand
      const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 3.2, 4), new THREE.MeshBasicMaterial({ color: 0xdeb887 }));
      rope.position.set(px > 0 ? px + 0.9 : px - 0.9, COURT.sandY + 1.5, 0);
      rope.rotation.z = px > 0 ? -0.45 : 0.45;
      scn.add(rope);
    });

    // Woven Net Plane
    const netHeight = COURT.netTopY - COURT.netBottomY;
    const netMesh = new THREE.Mesh(new THREE.PlaneGeometry(COURT.netWidth, netHeight, 28, 6), netMeshMat);
    netMesh.position.set(0, COURT.sandY + (COURT.netTopY + COURT.netBottomY) / 2, 0);
    scn.add(netMesh);

    // Top and Bottom yellow/orange border tapes
    const topBand = new THREE.Mesh(new THREE.BoxGeometry(COURT.netWidth + 0.2, 0.14, 0.06), tapeBandMat);
    topBand.position.set(0, COURT.sandY + COURT.netTopY, 0);
    scn.add(topBand);

    const botBand = new THREE.Mesh(new THREE.BoxGeometry(COURT.netWidth + 0.2, 0.08, 0.05), tapeBandMat);
    botBand.position.set(0, COURT.sandY + COURT.netBottomY, 0);
    scn.add(botBand);

    // Fluttering ribbon pennants along the top tape
    for (let rx = -3.0; rx <= 3.0; rx += 0.8) {
      const rib = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.35), new THREE.MeshBasicMaterial({
        color: (Math.round(rx) % 2 === 0) ? 0xef4444 : 0x3b82f6,
        side: THREE.DoubleSide
      }));
      rib.position.set(rx, COURT.sandY + COURT.netTopY - 0.2, 0);
      scn.add(rib);
      ribbonFlags.push({ mesh: rib, baseX: rx, phase: Math.random() * Math.PI * 2 });
    }

    // 5. Referee High-Chair & Sunny the Beach Carrot
    const refGroup = new THREE.Group();
    refGroup.position.set(-COURT.maxX - 1.6, COURT.sandY, 0);

    // Wooden high chair ladder legs
    const chairMat = new THREE.MeshStandardMaterial({ color: 0xa16207, roughness: 0.8 });
    const chairLegs = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.6, 1.4), chairMat);
    chairLegs.position.y = 1.3;
    refGroup.add(chairLegs);

    const chairSeat = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.15, 1.6), chairMat);
    chairSeat.position.y = 2.65;
    refGroup.add(chairSeat);

    // Sunny the Beach Carrot sitting atop as Official Match Referee!
    if (window.BlahajModels && window.BlahajModels.createBeachCarrot) {
      sunnyRefMesh = window.BlahajModels.createBeachCarrot(0x3b82f6);
      sunnyRefMesh.position.set(0, 2.75, 0);
      sunnyRefMesh.rotation.y = Math.PI / 2; // facing the court
      refGroup.add(sunnyRefMesh);
    }
    scn.add(refGroup);

    // 6. Spectator Sideline Bench with Cheering Birbs
    const benchGroup = new THREE.Group();
    benchGroup.position.set(COURT.maxX + 1.8, COURT.sandY, 0);

    const logBench = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 4.2, 10), new THREE.MeshStandardMaterial({ color: 0x5c3a21 }));
    logBench.rotation.x = Math.PI / 2;
    logBench.position.y = 0.35;
    benchGroup.add(logBench);

    // Parasol over the bench
    const umbrellaPole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 3.2, 8), bambooMat);
    umbrellaPole.position.set(0.6, 1.6, 0);
    benchGroup.add(umbrellaPole);

    const umbrellaCanopy = new THREE.Mesh(
      new THREE.ConeGeometry(1.8, 0.7, 16),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.4, side: THREE.DoubleSide })
    );
    umbrellaCanopy.position.set(0.6, 3.1, 0);
    benchGroup.add(umbrellaCanopy);

    // Two cheering spectator Birbs on the bench
    if (window.BlahajModels && window.BlahajModels.createBirb) {
      [-0.9, 0.9].forEach((bz, idx) => {
        const birb = window.BlahajModels.createBirb(idx === 0 ? 0xf59e0b : 0xec4899);
        birb.position.set(-0.1, 0.65, bz);
        birb.rotation.y = -Math.PI / 2;
        benchGroup.add(birb);
        cheeringBirbs.push({ mesh: birb, baseY: 0.65, phase: idx * 2.0 });
      });
    }
    scn.add(benchGroup);

    // 7. Court Exit / Rest Bench (Behind player at south end)
    const exitGroup = new THREE.Group();
    exitGroup.position.set(0, COURT.sandY, COURT.minZ - 1.8);

    const exitLog = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.35, 0.8), chairMat);
    exitLog.position.y = 0.25;
    exitGroup.add(exitLog);

    const exitSignMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const signCanvas = document.createElement('canvas');
    signCanvas.width = 512;
    signCanvas.height = 128;
    const sctx = signCanvas.getContext('2d');
    sctx.fillStyle = '#1e293b';
    sctx.fillRect(0, 0, 512, 128);
    sctx.strokeStyle = '#f59e0b';
    sctx.lineWidth = 6;
    sctx.strokeRect(4, 4, 504, 120);
    sctx.fillStyle = '#f8fafc';
    sctx.font = 'bold 36px sans-serif';
    sctx.textAlign = 'center';
    sctx.fillText('🏖️ RETURN TO BEACH [E / Esc]', 256, 75);

    const exitSignTex = new THREE.CanvasTexture(signCanvas);
    const exitSign = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.6), new THREE.MeshBasicMaterial({ map: exitSignTex }));
    exitSign.position.set(0, 1.1, 0);
    exitGroup.add(exitSign);
    scn.add(exitGroup);

    // 8. Overhead Rustic Driftwood Scoreboard (Mounted above the net)
    scoreboardCanvas = document.createElement('canvas');
    scoreboardCanvas.width = 512;
    scoreboardCanvas.height = 192;
    scoreboardTex = new THREE.CanvasTexture(scoreboardCanvas);
    updateScoreboardCanvas();

    const sbBoard = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.35), new THREE.MeshBasicMaterial({
      map: scoreboardTex,
      side: THREE.DoubleSide
    }));
    sbBoard.position.set(0, COURT.sandY + 3.8, 0);
    scn.add(sbBoard);
    scoreboardMesh = sbBoard;

    // 9. Sandy the Beach Shonk (Opponent AI Shark)
    if (window.BlahajModels && window.BlahajModels.createPlushShark) {
      sandy.mesh = window.BlahajModels.createPlushShark({
        bodyColor: 0x0ea5e9, // bright beach blue
        bellyColor: 0xf8fafc,
        scarfColor: 0xf59e0b, // sunshine yellow scarf
        eyeColor: 0x111827
      });
      sandy.mesh.position.copy(COURT.oppStart);
      sandy.mesh.rotation.y = COURT.oppStart.rotY;
      scn.add(sandy.mesh);

      // Add cute yellow sun-visor onto Sandy's head!
      const visorMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.3 });
      const visor = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.06, 8, 18, Math.PI), visorMat);
      visor.position.set(0, 0.65, 0.4);
      visor.rotation.x = Math.PI / 4;
      sandy.mesh.add(visor);
    }

    // 10. The Floaty Volleyball Beach Ball
    const ballMesh = (window.BlahajModels && window.BlahajModels.createBeachBall)
      ? window.BlahajModels.createBeachBall(BALL_RADIUS)
      : new THREE.Mesh(new THREE.SphereGeometry(BALL_RADIUS, 24, 20), new THREE.MeshStandardMaterial({ color: 0xff3b30 }));
    ball.mesh = ballMesh;
    ball.mesh.position.copy(ball.pos);
    scn.add(ballMesh);

    // Soft drop shadow on the sand
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 128;
    shadowCanvas.height = 128;
    const shCtx = shadowCanvas.getContext('2d');
    const grad = shCtx.createRadialGradient(64, 64, 4, 64, 64, 60);
    grad.addColorStop(0, 'rgba(30, 20, 10, 0.65)');
    grad.addColorStop(0.6, 'rgba(50, 35, 15, 0.35)');
    grad.addColorStop(1, 'rgba(80, 50, 20, 0.0)');
    shCtx.fillStyle = grad;
    shCtx.fillRect(0, 0, 128, 128);

    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    ball.shadowMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1.6, 1.6),
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, opacity: 0.6 })
    );
    ball.shadowMesh.rotation.x = -Math.PI / 2;
    ball.shadowMesh.position.set(ball.pos.x, COURT.sandY + 0.02, ball.pos.z);
    scn.add(ball.shadowMesh);

    // 11. Palm trees and beach boulders framing the court
    const createPalm = (px, pz) => {
      const palm = new THREE.Group();
      palm.position.set(px, COURT.sandY, pz);
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.32, 6.5, 8), bambooMat);
      trunk.position.y = 3.2;
      trunk.rotation.z = px > 0 ? 0.12 : -0.12;
      palm.add(trunk);
      const fronds = new THREE.Mesh(new THREE.ConeGeometry(2.8, 1.2, 8), new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.6 }));
      fronds.position.y = 6.4;
      palm.add(fronds);
      scn.add(palm);
    };
    createPalm(-7.0, -2.0);
    createPalm(7.2, 2.5);
    createPalm(-6.5, 6.0);

    built = true;
  }

  // ==========================================================================
  // SCOREBOARD RENDERING
  // ==========================================================================
  function updateScoreboardCanvas() {
    if (!scoreboardCanvas) return;
    const ctx = scoreboardCanvas.getContext('2d');
    ctx.clearRect(0, 0, 512, 192);

    // Weathered Driftwood background
    ctx.fillStyle = '#3b2416';
    ctx.fillRect(0, 0, 512, 192);
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 6;
    ctx.strokeRect(6, 6, 500, 180);

    // Banner title
    ctx.fillStyle = '#fde68a';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🏐 CRESCENT BEACH SHARK VOLLEYBALL 🦈', 256, 38);

    // Rally Counter
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 38px sans-serif';
    ctx.fillText(`RALLY: ${rallyCount}   (BEST: ${bestRally})`, 256, 92);

    // Match Score
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 34px sans-serif';
    ctx.fillText(`SHARK: ${playerScore}  —  SANDY: ${opponentScore}`, 256, 148);

    if (scoreboardTex) scoreboardTex.needsUpdate = true;
  }

  // ==========================================================================
  // PARTICLE BURST
  // ==========================================================================
  function spawnStars(pos, colorHex = 0xfacc15, count = 12) {
    if (!scn) return;
    for (let i = 0; i < count; i++) {
      const geo = new THREE.SphereGeometry(0.08, 6, 6);
      const mat = new THREE.MeshBasicMaterial({ color: colorHex });
      const p = new THREE.Mesh(geo, mat);
      p.position.copy(pos);
      const angle = Math.random() * Math.PI * 2;
      const speed = 2.0 + Math.random() * 3.5;
      scn.add(p);
      particles.push({
        mesh: p,
        vel: new THREE.Vector3(Math.cos(angle) * speed, 1.5 + Math.random() * 3.5, Math.sin(angle) * speed),
        life: 0.6
      });
    }
  }

  // ==========================================================================
  // SERVE BALL
  // ==========================================================================
  function serveBall(server = 'player') {
    ball.state = 'in_play';
    ball.lastHitter = null;
    ball.squish = 1.0;
    if (server === 'player') {
      ball.pos.set(0, 4.2, -2.5);
      ball.vel.set(0, 1.2, 0);
    } else {
      ball.pos.set(0, 4.2, 2.5);
      ball.vel.set(0, 1.2, 0);
    }
    if (ball.mesh) ball.mesh.position.copy(ball.pos);
    spawnStars(ball.pos, 0x38bdf8, 8);
    if (typeof CozyAudio !== 'undefined' && CozyAudio.portalChime) CozyAudio.portalChime();
  }

  // ==========================================================================
  // UPDATE LOOP (CALLED EVERY FRAME)
  // ==========================================================================
  function update(dt, elapsed, player, keys = {}) {
    if (!active || !built) return;

    // 1. Animate Water foam and net ribbons
    if (waterPlane) {
      waterPlane.position.y = COURT.sandY - 0.45 + Math.sin(elapsed * 1.5) * 0.06;
    }
    ribbonFlags.forEach((rf) => {
      rf.mesh.rotation.y = Math.sin(elapsed * 4.0 + rf.phase) * 0.4;
      rf.mesh.rotation.z = Math.cos(elapsed * 3.5 + rf.phase) * 0.15;
    });

    // 2. Animate Cheering Birbs & Sunny Referee
    cheeringBirbs.forEach((b) => {
      b.mesh.position.y = b.baseY + Math.abs(Math.sin(elapsed * 5.0 + b.phase)) * 0.15;
    });
    if (sunnyRefMesh) {
      sunnyRefMesh.rotation.z = Math.sin(elapsed * 3.0) * 0.08;
    }

    // 3. Update Particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      p.vel.y -= 9.8 * dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      if (p.life <= 0) {
        scn.remove(p.mesh);
        particles.splice(i, 1);
      }
    }

    // 4. Ball Physics & Cartoony Loft
    if (ball.mesh && ball.state === 'in_play') {
      // Cartoony floaty gravity (7.2 m/s^2 instead of 19.5!)
      ball.vel.y -= 7.2 * dt;
      ball.vel.y = Math.max(ball.vel.y, -7.5); // gentle terminal velocity

      // Slow horizontal air friction
      ball.vel.x *= Math.pow(0.992, dt * 60);
      ball.vel.z *= Math.pow(0.992, dt * 60);

      ball.pos.addScaledVector(ball.vel, dt);

      // Court side walls bounce softly
      if (ball.pos.x < COURT.minX + BALL_RADIUS) {
        ball.pos.x = COURT.minX + BALL_RADIUS;
        ball.vel.x = Math.abs(ball.vel.x) * 0.75;
      } else if (ball.pos.x > COURT.maxX - BALL_RADIUS) {
        ball.pos.x = COURT.maxX - BALL_RADIUS;
        ball.vel.x = -Math.abs(ball.vel.x) * 0.75;
      }

      // Net Collision (z = 0, between -3.6 and 3.6, height between 1.0 and 2.3)
      if (Math.abs(ball.pos.z) < BALL_RADIUS + 0.1 && Math.abs(ball.pos.x) < COURT.netWidth / 2) {
        if (ball.pos.y > COURT.netBottomY && ball.pos.y < COURT.netTopY) {
          // Bounced into the net!
          ball.vel.z = (ball.pos.z < 0 ? -1 : 1) * Math.max(Math.abs(ball.vel.z) * 0.5, 1.8);
          ball.vel.y = 2.5;
          ball.squish = 1.3;
          if (typeof CozyAudio !== 'undefined' && CozyAudio.bounceBoing) CozyAudio.bounceBoing();
        }
      }

      // Ball Squish Recovery
      ball.squish += (1.0 - ball.squish) * dt * 9.0;
      ball.mesh.scale.set(ball.squish, 1.0 / Math.max(0.7, ball.squish), ball.squish);

      // Roll ball rotation according to movement
      ball.mesh.rotation.x += ball.vel.z * dt * 3.0;
      ball.mesh.rotation.z -= ball.vel.x * dt * 3.0;
      ball.mesh.position.copy(ball.pos);

      // Drop shadow on the sand
      if (ball.shadowMesh) {
        const heightAboveSand = Math.max(0, ball.pos.y - COURT.sandY);
        ball.shadowMesh.position.set(ball.pos.x, COURT.sandY + 0.02, ball.pos.z);
        const s = 0.5 + Math.min(heightAboveSand * 0.1, 0.6);
        ball.shadowMesh.scale.set(s, s, s);
        ball.shadowMesh.material.opacity = Math.max(0.18, 0.65 - heightAboveSand * 0.08);
      }

      // Check Sand Landing
      if (ball.pos.y <= COURT.sandY + BALL_RADIUS) {
        ball.pos.y = COURT.sandY + BALL_RADIUS;
        handleSandLanding();
      }
    } else if (ball.state === 'serving') {
      ball.serveTimer -= dt;
      if (ball.serveTimer <= 0) {
        serveBall(ball.nextServer);
      }
    }

    // 5. Player Snout / Header Collision
    if (player && ball.mesh && ball.state === 'in_play') {
      // Calculate player snout position based on forward direction
      const fwd = new THREE.Vector3(-Math.sin(player.rotY), 0, -Math.cos(player.rotY));
      const snout = player.pos.clone().addScaledVector(fwd, 1.25).add(new THREE.Vector3(0, 0.55, 0));

      const dSnout = snout.distanceTo(ball.pos);
      const dBody = player.pos.distanceTo(ball.pos);
      const isBooping = Boolean(keys['f'] || keys['F']);

      // Generous hit condition: Snout contact, or Body contact while jumping, or pressing [F]
      const canHit = (dSnout < 1.45) || (dBody < 1.75 && ball.pos.y < player.pos.y + 1.8 && ball.pos.y > player.pos.y + 0.25) || (isBooping && dSnout < 2.5);

      if (canHit && (ball.lastHitter !== 'player' || ball.vel.y < 0)) {
        // Player Bounces the Ball over the net!
        ball.lastHitter = 'player';
        ball.squish = 1.45;

        // High, floaty loft: 6.8 to 7.4 m/s gives >2.5s of airtime
        ball.vel.y = 6.8 + Math.random() * 0.5;

        // Forward trajectory into Sandy's court (Target Z around +2.8)
        const targetZ = 2.8 + (Math.random() - 0.5) * 1.5;
        ball.vel.z = (targetZ - ball.pos.z) / 1.75;

        // Steering based on approach angle
        ball.vel.x = (ball.pos.x - player.pos.x) * 1.4;
        ball.vel.x = THREE.MathUtils.clamp(ball.vel.x, -2.6, 2.6);

        spawnStars(snout, 0x38bdf8, 14);

        if (typeof CozyAudio !== 'undefined') {
          if (CozyAudio.bounceBoing) CozyAudio.bounceBoing();
          if (CozyAudio.shonk) CozyAudio.shonk();
        }

        // Floating toast celebration on high header
        if (typeof showToast === 'function') {
          showToast('SNOUT BOOP! 🏐💥', `Lofted beach ball over the net! (Rally: ${rallyCount})`);
        }
      }
    }

    // 6. Sandy (AI Opponent) Logic
    if (sandy.mesh && ball.mesh) {
      updateSandyAI(dt, elapsed);
    }
  }

  // ==========================================================================
  // SANDY (AI OPPONENT) BEHAVIOR
  // ==========================================================================
  function updateSandyAI(dt, elapsed) {
    const isBallOnSandySide = ball.pos.z > -0.2 && ball.state === 'in_play';
    let isMoving = false;

    if (isBallOnSandySide) {
      // Track ball's shadow on sand
      const targetX = THREE.MathUtils.clamp(ball.pos.x, COURT.minX + 0.8, COURT.maxX - 0.8);
      const targetZ = THREE.MathUtils.clamp(ball.pos.z, 0.8, COURT.maxZ - 0.6);

      const dx = targetX - sandy.pos.x;
      const dz = targetZ - sandy.pos.z;
      const dist = Math.hypot(dx, dz);

      if (dist > 0.2) {
        isMoving = true;
        const moveDist = Math.min(dist, sandy.speed * dt);
        sandy.pos.x += (dx / dist) * moveDist;
        sandy.pos.z += (dz / dist) * moveDist;
        // Face movement direction smoothly
        sandy.rotY = Math.atan2(dx, dz);
      } else {
        // Face the net
        sandy.rotY = Math.PI;
      }

      // Check if ball is low enough to header back over
      const snoutPos = sandy.pos.clone().add(new THREE.Vector3(-Math.sin(sandy.rotY), 0, -Math.cos(sandy.rotY)).multiplyScalar(1.2)).add(new THREE.Vector3(0, 0.55, 0));
      const dToBall = snoutPos.distanceTo(ball.pos);

      if (dToBall < 1.6 && ball.pos.y < 2.5 && ball.lastHitter !== 'opponent') {
        // Sandy hops and nose-boops it back!
        sandy.velY = 4.2;
        sandy.isGrounded = false;
        ball.lastHitter = 'opponent';
        ball.squish = 1.45;

        // Return floaty arc back to Player's court (Target Z around -2.8)
        ball.vel.y = 6.6 + Math.random() * 0.4;
        const targetPlayerZ = -2.8 + (Math.random() - 0.5) * 1.5;
        ball.vel.z = (targetPlayerZ - ball.pos.z) / 1.75;
        ball.vel.x = (Math.random() - 0.5) * 2.0;

        rallyCount++;
        if (rallyCount > bestRally) bestRally = rallyCount;
        updateScoreboardCanvas();

        spawnStars(snoutPos, 0xf59e0b, 14);
        if (typeof CozyAudio !== 'undefined' && CozyAudio.bounceBoing) CozyAudio.bounceBoing();

        if (typeof showToast === 'function') {
          showToast(`SANDY HEADER! 🏐`, `Rally: ${rallyCount}! Keep the streak going!`);
        }
      }
    } else {
      // Idle at back-center and watch net
      const homeX = 0;
      const homeZ = 3.0;
      const dx = homeX - sandy.pos.x;
      const dz = homeZ - sandy.pos.z;
      if (Math.hypot(dx, dz) > 0.25) {
        isMoving = true;
        sandy.pos.x += dx * dt * 2.0;
        sandy.pos.z += dz * dt * 2.0;
      }
      sandy.rotY = Math.PI; // Face the net
    }

    // Sandy vertical hop physics
    if (!sandy.isGrounded) {
      sandy.velY -= 14.0 * dt;
      sandy.pos.y += sandy.velY * dt;
      if (sandy.pos.y <= COURT.sandY) {
        sandy.pos.y = COURT.sandY;
        sandy.velY = 0;
        sandy.isGrounded = true;
      }
    }

    sandy.mesh.position.copy(sandy.pos);
    sandy.mesh.rotation.y = sandy.rotY;

    if (window.BlahajModels && window.BlahajModels.animateShark) {
      window.BlahajModels.animateShark(sandy.mesh, dt, isMoving, elapsed);
    }
  }

  // ==========================================================================
  // SAND LANDING & SCORING
  // ==========================================================================
  function handleSandLanding() {
    ball.state = 'serving';
    ball.serveTimer = 1.8;
    ball.vel.set(0, 0, 0);

    // Dust puff
    spawnStars(ball.pos, 0xd4a373, 10);
    if (typeof CozyAudio !== 'undefined' && CozyAudio.carrotBoop) CozyAudio.carrotBoop();

    const landedOnPlayerSide = ball.pos.z < 0;

    if (landedOnPlayerSide) {
      opponentScore++;
      ball.nextServer = 'player';
      if (typeof showToast === 'function') {
        showToast('SANDY SCORES! 🏐', `Ball landed on your sand! (Rally was ${rallyCount})`);
      }
    } else {
      playerScore++;
      ball.nextServer = 'opponent';
      if (typeof showToast === 'function') {
        showToast('POINT FOR YOU! 🏆', `Slick spike over the net! (Rally was ${rallyCount})`);
      }
      if (typeof CozyAudio !== 'undefined' && CozyAudio.birthdayFanfare) CozyAudio.birthdayFanfare();
    }

    rallyCount = 0;
    updateScoreboardCanvas();
  }

  // ==========================================================================
  // MOVEMENT RESOLUTION & BOUNDARIES
  // ==========================================================================
  function resolveMove(p, dir, dist) {
    const nextX = THREE.MathUtils.clamp(p.x + dir.x * dist, COURT.minX + 0.4, COURT.maxX - 0.4);
    // Player cannot cross the net to the opponent side: constrained to [-5.5, -0.4]
    const nextZ = THREE.MathUtils.clamp(p.z + dir.z * dist, COURT.minZ - 1.2, -0.4);
    return new THREE.Vector3(nextX, COURT.sandY, nextZ);
  }

  function getFloorHeight(x, z) {
    return COURT.sandY;
  }

  function getInteractables(p) {
    const out = [];
    // Near exit log / bench at south baseline
    if (p.z <= COURT.minZ + 0.6) {
      out.push({
        kind: 'exit_volleyball',
        prompt: 'Leave Volleyball Court & Return to Crescent Beach [E / Esc] 🏖️'
      });
    }
    return out;
  }

  // ==========================================================================
  // PUBLIC EXPORTS
  // ==========================================================================
  return {
    build,
    isBuilt: () => built,
    isActive: () => active,
    setActive: (val) => {
      active = val;
      if (val) {
        serveBall('player');
        rallyCount = 0;
        updateScoreboardCanvas();
      }
    },
    getScene: () => scn,
    getStart: () => COURT.playerStart,
    resolveMove,
    getFloorHeight,
    getInteractables,
    update,
    serveBall,
    getStats: () => ({ rallyCount, bestRally, playerScore, opponentScore }),
    constants: COURT
  };
})();
