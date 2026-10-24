// ============================================================================
// BLÅHAJ ISLAND — ENEMIES & BOOP ATTACK SYSTEM
// ============================================================================
// Featuring:
// 1. Barnacle Brine Star (Evil Starfish)
// 2. Rowdy Gray Fin (Mean Shark)
// 3. Prickly Kelp Urchin (Mischievous Puffball)
//
// Core Philosophy:
// - Hit points = Mange.
// - There is NO dying in this game!
// - Enemies cannot die: hitting them enough sends them flying into the stratosphere / another dimension!
// ============================================================================

window.BlahajEnemies = (function () {
  let scene = null;
  const enemies = [];
  let labelsContainer = null;
  let activeBursts = [];

  // Helper material creator
  function createMat(color, roughness = 0.8, metalness = 0.1) {
    return new THREE.MeshStandardMaterial({
      color,
      roughness,
      metalness
    });
  }

  // --------------------------------------------------------------------------
  // 1. 3D ENEMY MESH BUILDERS
  // --------------------------------------------------------------------------

  // A. Barnacle Brine Star (Evil Starfish)
  function createStarfishMesh() {
    const group = new THREE.Group();
    const starMat = createMat(0x831843, 0.85); // Moody deep crimson/plum
    const undersideMat = createMat(0xf472b6, 0.9); // Pale pink underside
    const spineMat = createMat(0xfde047, 0.7); // Little gold prickly felt spines
    const eyeMat = createMat(0x1e293b, 0.5);
    const browMat = createMat(0x0f172a, 0.9);

    // Central hub
    const center = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 0.35, 12), starMat);
    center.position.y = 0.22;
    group.add(center);

    // 5 Tapered arms
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      const armGroup = new THREE.Group();
      armGroup.rotation.y = angle;

      const arm = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.45, 8), starMat);
      arm.rotation.x = Math.PI / 2;
      arm.position.set(0, 0.20, 0.88);
      armGroup.add(arm);

      // Little soft spines on each arm
      for (let s = 0; s < 3; s++) {
        const spine = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.18, 6), spineMat);
        spine.position.set(0, 0.34, 0.5 + s * 0.32);
        armGroup.add(spine);
      }

      group.add(armGroup);
    }

    // Underside disc
    const under = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.05, 12), undersideMat);
    under.position.y = 0.06;
    group.add(under);

    // Angry Face (Eyes & V-Shaped Stitched Eyebrows on front arm/hub)
    const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 8), eyeMat);
    leftEye.position.set(-0.20, 0.36, 0.38);
    const rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 8), eyeMat);
    rightEye.position.set(0.20, 0.36, 0.38);
    group.add(leftEye);
    group.add(rightEye);

    // V-shaped scowl eyebrows
    const leftBrow = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.04, 0.05), browMat);
    leftBrow.position.set(-0.20, 0.45, 0.39);
    leftBrow.rotation.z = -0.38;
    const rightBrow = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.04, 0.05), browMat);
    rightBrow.position.set(0.20, 0.45, 0.39);
    rightBrow.rotation.z = 0.38;
    group.add(leftBrow);
    group.add(rightBrow);

    group.scale.set(1.4, 1.2, 1.4);
    return group;
  }

  // B. Rowdy Gray Fin (Mean Shark)
  function createMeanSharkMesh() {
    const group = new THREE.Group();
    const bodyMat = createMat(0x475569, 0.82); // Slate gray
    const bellyMat = createMat(0xe2e8f0, 0.9);
    const teethMat = createMat(0xffffff, 0.6);
    const patchMat = createMat(0x0f172a, 0.9); // Black eyepatch
    const strapMat = createMat(0x1e293b, 0.9);
    const eyeMat = createMat(0xfde047, 0.5); // Grumpy yellow eye

    // Main torso
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.75, 14, 12), bodyMat);
    body.scale.set(0.85, 0.82, 1.75);
    body.position.y = 0.82;
    group.add(body);

    // White belly
    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.70, 14, 10), bellyMat);
    belly.scale.set(0.82, 0.45, 1.70);
    belly.position.y = 0.60;
    group.add(belly);

    // Dorsal Fin
    const dorsal = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.9, 8), bodyMat);
    dorsal.rotation.x = -0.35;
    dorsal.position.set(0, 1.62, -0.15);
    group.add(dorsal);

    // Pectoral Fins (Flared in grumpy aggressive pose)
    const leftFin = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.85, 8), bodyMat);
    leftFin.rotation.set(0.2, 0, 1.2);
    leftFin.position.set(-0.75, 0.72, 0.25);
    group.add(leftFin);

    const rightFin = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.85, 8), bodyMat);
    rightFin.rotation.set(0.2, 0, -1.2);
    rightFin.position.set(0.75, 0.72, 0.25);
    group.add(rightFin);

    // Tail
    const tailGroup = new THREE.Group();
    tailGroup.position.set(0, 0.85, -1.35);
    const tailFin = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.8, 8), bodyMat);
    tailFin.position.set(0, 0.25, -0.2);
    tailGroup.add(tailFin);
    group.add(tailGroup);
    group.userData.tailGroup = tailGroup;

    // Teeth row along underside of snout
    const teeth = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.08, 0.24), teethMat);
    teeth.position.set(0, 0.58, 0.92);
    group.add(teeth);

    // Left Eyepatch & Strap
    const eyepatch = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), patchMat);
    eyepatch.scale.set(1.0, 1.0, 0.4);
    eyepatch.position.set(-0.46, 0.95, 0.82);
    eyepatch.rotation.y = -0.4;
    group.add(eyepatch);

    const strap = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.025, 6, 24), strapMat);
    strap.position.set(0, 0.88, 0.65);
    strap.rotation.set(0.3, 0.25, 0.1);
    group.add(strap);

    // Right Eye (Angry Yellow Scowl Eye)
    const rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), eyeMat);
    rightEye.position.set(0.46, 0.95, 0.82);
    group.add(rightEye);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), patchMat);
    pupil.position.set(0.52, 0.95, 0.88);
    group.add(pupil);

    // Furrowed brow
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.05, 0.06), patchMat);
    brow.position.set(0.45, 1.05, 0.84);
    brow.rotation.z = 0.35;
    group.add(brow);

    group.scale.set(1.25, 1.25, 1.25);
    return group;
  }

  // C. Prickly Kelp Urchin (Mischievous Puffball)
  function createKelpUrchinMesh() {
    const group = new THREE.Group();
    const bodyMat = createMat(0x0f766e, 0.9); // Deep ocean teal
    const quillMat = createMat(0x14b8a6, 0.85); // Minty teal quills
    const eyeWhiteMat = createMat(0xffffff, 0.5);
    const eyeSwirlMat = createMat(0x042f2e, 0.9);

    // Main spherical puffball
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.68, 14, 12), bodyMat);
    body.position.y = 0.72;
    group.add(body);

    // 24 Radial velvet quills
    const numQuills = 24;
    for (let i = 0; i < numQuills; i++) {
      const phi = Math.acos(-1 + (2 * i) / numQuills);
      const theta = Math.sqrt(numQuills * Math.PI) * phi;
      const x = Math.cos(theta) * Math.sin(phi);
      const y = Math.sin(theta) * Math.sin(phi);
      const z = Math.cos(phi);

      // Skip spines directly over the front face
      if (z > 0.45 && y > -0.1 && y < 0.35) continue;

      const quill = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.52, 6), quillMat);
      quill.position.set(x * 0.70, 0.72 + y * 0.70, z * 0.70);
      quill.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(x, y, z));
      group.add(quill);
    }

    // Anime Swirl Eyes
    const leftEye = new THREE.Mesh(new THREE.CircleGeometry(0.14, 16), eyeWhiteMat);
    leftEye.position.set(-0.24, 0.78, 0.68);
    const rightEye = new THREE.Mesh(new THREE.CircleGeometry(0.14, 16), eyeWhiteMat);
    rightEye.position.set(0.24, 0.78, 0.68);
    group.add(leftEye);
    group.add(rightEye);

    // Swirl pupils
    const leftPupil = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.025, 4, 12), eyeSwirlMat);
    leftPupil.position.set(-0.24, 0.78, 0.69);
    const rightPupil = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.025, 4, 12), eyeSwirlMat);
    rightPupil.position.set(0.24, 0.78, 0.69);
    group.add(leftPupil);
    group.add(rightPupil);

    group.userData.leftPupil = leftPupil;
    group.userData.rightPupil = rightPupil;

    group.scale.set(1.2, 1.2, 1.2);
    return group;
  }

  // --------------------------------------------------------------------------
  // 2. ENEMY OVERHEAD LABELS & HITPOINTS (MANGE)
  // --------------------------------------------------------------------------
  function createEnemyLabel(enemy) {
    if (!labelsContainer) return null;
    const el = document.createElement('div');
    el.className = 'world-label enemy-label';
    el.innerHTML = `
      <div class="npc-tag enemy-tag">${enemy.tag}</div>
      <div class="npc-name enemy-name">${enemy.title}</div>
      <div class="enemy-mange-bar-wrap">
        <div class="enemy-mange-bar-fill" style="width: 0%;"></div>
        <span class="enemy-mange-text">Mange: 0%</span>
      </div>
    `;
    labelsContainer.appendChild(el);
    return el;
  }

  function updateEnemyLabelUI(enemy) {
    if (!enemy.labelEl) return;
    const fill = enemy.labelEl.querySelector('.enemy-mange-bar-fill');
    const txt = enemy.labelEl.querySelector('.enemy-mange-text');
    const pct = Math.round(enemy.mange * 100);
    if (fill) {
      fill.style.width = `${pct}%`;
      if (pct > 70) {
        fill.style.background = 'linear-gradient(90deg, #f59e0b, #ec4899)';
      } else {
        fill.style.background = 'linear-gradient(90deg, #10b981, #f59e0b)';
      }
    }
    if (txt) {
      txt.textContent = `Mange: ${pct}%${pct >= 100 ? ' (READY TO FLY!)' : ''}`;
    }
  }

  // --------------------------------------------------------------------------
  // 3. INITIALIZATION
  // --------------------------------------------------------------------------
  function init(sceneRef) {
    scene = sceneRef;
    labelsContainer = document.getElementById('world-labels');

    const enemyDefs = [
      {
        id: 'starfish_1',
        type: 'starfish',
        title: 'Barnacle Brine Star 🌟',
        tag: 'EVIL STARFISH · MOODY SPIKE',
        homePos: new THREE.Vector3(26.0, 1.15, 34.0), // South Beach rocks
        builder: createStarfishMesh,
        speed: 2.2,
        aggroDist: 8.0
      },
      {
        id: 'shark_1',
        type: 'shark',
        title: 'Rowdy Gray Fin 🦈',
        tag: 'MEAN SHARK · RUFFIAN OF SHALLOWS',
        homePos: new THREE.Vector3(-26.0, 0.65, -42.0), // Rocky Isthmus shallows
        builder: createMeanSharkMesh,
        speed: 4.8,
        aggroDist: 9.5
      },
      {
        id: 'urchin_1',
        type: 'urchin',
        title: 'Prickly Kelp Urchin 🦔',
        tag: 'MISCHIEVOUS PUFFBALL · SOFT SPINES',
        homePos: new THREE.Vector3(42.0, 0.95, -16.0), // East Cape kelp grove
        builder: createKelpUrchinMesh,
        speed: 2.8,
        aggroDist: 7.0
      }
    ];

    enemyDefs.forEach((def) => {
      const mesh = def.builder();
      mesh.position.copy(def.homePos);
      scene.add(mesh);

      const eObj = {
        id: def.id,
        type: def.type,
        title: def.title,
        tag: def.tag,
        homePos: def.homePos.clone(),
        pos: def.homePos.clone(),
        vel: new THREE.Vector3(),
        rotY: 0,
        rotVel: new THREE.Vector3(),
        speed: def.speed,
        aggroDist: def.aggroDist,
        mange: 0.0,
        mesh,
        labelEl: null,
        isFlying: false,
        flyTimer: 0,
        respawnTimer: 0,
        animPhase: Math.random() * Math.PI * 2,
        state: 'idle',
        takeBoop(dmg, knockDir) {
          handleEnemyBoop(this, dmg, knockDir);
        }
      };

      eObj.labelEl = createEnemyLabel(eObj);
      enemies.push(eObj);
    });

    console.log(`[BlahajEnemies] Initialized ${enemies.length} cozy enemies!`);
  }

  // --------------------------------------------------------------------------
  // 4. BOOP ATTACK RESOLUTION & FLYING FINISHER
  // --------------------------------------------------------------------------
  function handleEnemyBoop(enemy, dmg = 0.35, knockDir) {
    if (enemy.isFlying) return;

    enemy.mange = Math.min(1.0, enemy.mange + dmg);
    updateEnemyLabelUI(enemy);

    // Comic recoil velocity
    const push = knockDir.clone().normalize();
    enemy.vel.x += push.x * 10.0;
    enemy.vel.z += push.z * 10.0;
    enemy.vel.y += 3.5;

    // Visual & Audio hit feedback
    if (window.CozyAudio && typeof window.CozyAudio.boopHit === 'function') {
      window.CozyAudio.boopHit();
    } else if (window.CozyAudio && typeof window.CozyAudio.shonk === 'function') {
      window.CozyAudio.shonk();
    }

    spawnComicStars(enemy.pos, 0xf43f5e, 14);
    spawnFloatingCombatText(enemy.pos, `💥 BOOP! (+${Math.round(dmg * 100)}% Mange)`);

    // Material flash
    flashEnemy(enemy);

    // Check if sending them flying into the stratosphere / another dimension!
    if (enemy.mange >= 1.0) {
      launchEnemyIntoStratosphere(enemy, push);
    }
  }

  function launchEnemyIntoStratosphere(enemy, pushDir) {
    enemy.isFlying = true;
    enemy.flyTimer = 0;
    enemy.state = 'flying';

    // Massive parabolic launch velocity!
    enemy.vel.set(pushDir.x * 26.0, 34.0, pushDir.z * 26.0);
    enemy.rotVel.set(
      (Math.random() - 0.5) * 22.0,
      18.0,
      (Math.random() - 0.5) * 22.0
    );

    if (window.CozyAudio && typeof window.CozyAudio.boopLaunch === 'function') {
      window.CozyAudio.boopLaunch();
    }

    // Epic comic announcements
    spawnFloatingCombatText(enemy.pos, '🚀 BLASTED TO THE MOON! (+100% MANGE)', '#f5cd79');
    if (window.showToast) {
      window.showToast(
        '🚀 SENT FLYING! (+100% MANGE)',
        `You booped ${enemy.title} into the stratosphere! They spun into another dimension!`
      );
    }
    if (window.addChatLog) {
      window.addChatLog(
        `💫 <em>BOOP LAUNCH!</em> You booped <strong>${enemy.title}</strong> so hard they blasted into the clouds! No creatures are harmed—they'll float back down refreshed.`,
        'cozy'
      );
    }
  }

  function flashEnemy(enemy) {
    if (!enemy.mesh) return;
    enemy.mesh.traverse((c) => {
      if (c.isMesh && c.material) {
        const origColor = c.material.color.clone();
        c.material.color.set(0xffffff);
        setTimeout(() => {
          c.material.color.copy(origColor);
        }, 120);
      }
    });
  }

  function spawnComicStars(pos, colorHex = 0xfbbf24, count = 10) {
    if (!scene) return;
    for (let i = 0; i < count; i++) {
      const geo = new THREE.OctahedronGeometry(0.22, 0);
      const mat = new THREE.MeshBasicMaterial({ color: colorHex });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pos).add(new THREE.Vector3(
        (Math.random() - 0.5) * 1.5,
        0.8 + Math.random() * 1.2,
        (Math.random() - 0.5) * 1.5
      ));
      scene.add(mesh);
      activeBursts.push({
        mesh,
        vel: new THREE.Vector3((Math.random() - 0.5) * 4.0, 3.5 + Math.random() * 2.5, (Math.random() - 0.5) * 4.0),
        life: 0.85
      });
    }
  }

  function spawnFloatingCombatText(pos, text, color = '#f43f5e') {
    if (!labelsContainer) return;
    const bubble = document.createElement('div');
    bubble.className = 'floating-combat-text';
    bubble.textContent = text;
    bubble.style.color = color;
    labelsContainer.appendChild(bubble);

    const worldP = pos.clone();
    worldP.y += 2.4;

    const start = performance.now();
    function animateText() {
      const t = (performance.now() - start) / 1200;
      if (t >= 1) {
        bubble.remove();
        return;
      }
      worldP.y += 0.025;
      if (window.BlahajGame && window.BlahajGame.getCamera) {
        const cam = window.BlahajGame.getCamera();
        const p = worldP.clone().project(cam);
        if (p.z <= 1) {
          const x = (p.x * 0.5 + 0.5) * window.innerWidth;
          const y = (-(p.y * 0.5) + 0.5) * window.innerHeight;
          bubble.style.left = `${x}px`;
          bubble.style.top = `${y}px`;
          bubble.style.opacity = `${(1 - t * t).toFixed(2)}`;
          bubble.style.transform = `translate(-50%, -100%) scale(${1 + t * 0.4})`;
        }
      }
      requestAnimationFrame(animateText);
    }
    requestAnimationFrame(animateText);
  }

  // --------------------------------------------------------------------------
  // 5. UPDATE LOOP (AI, PHYSICS, PARACHUTE RESPAWN)
  // --------------------------------------------------------------------------
  function update(dt, elapsed, playerPos, playerMesh) {
    if (!scene) return;

    // 1. Update particle bursts
    for (let i = activeBursts.length - 1; i >= 0; i--) {
      const b = activeBursts[i];
      b.life -= dt;
      b.mesh.position.addScaledVector(b.vel, dt);
      b.mesh.rotation.x += dt * 6.0;
      b.mesh.rotation.y += dt * 8.0;
      b.mesh.scale.multiplyScalar(Math.max(0.01, 1 - dt * 1.5));
      if (b.life <= 0) {
        scene.remove(b.mesh);
        activeBursts.splice(i, 1);
      }
    }

    // 2. Update each enemy
    enemies.forEach((enemy) => {
      enemy.animPhase += dt * 4.0;

      // Special eyeball spin for urchin
      if (enemy.mesh && enemy.mesh.userData.leftPupil && enemy.mesh.userData.rightPupil) {
        enemy.mesh.userData.leftPupil.rotation.z += dt * 5.0;
        enemy.mesh.userData.rightPupil.rotation.z += dt * 5.0;
      }

      // Special tail wag for mean shark
      if (enemy.mesh && enemy.mesh.userData.tailGroup) {
        enemy.mesh.userData.tailGroup.rotation.y = Math.sin(enemy.animPhase * 1.6) * 0.35;
      }

      // STATE A: FLYING IN THE STRATOSPHERE!
      if (enemy.isFlying) {
        enemy.flyTimer += dt;
        enemy.vel.y -= 14.0 * dt; // Gravity in sky
        enemy.pos.addScaledVector(enemy.vel, dt);
        enemy.mesh.position.copy(enemy.pos);

        // Wild tumbling rotation
        enemy.mesh.rotation.x += enemy.rotVel.x * dt;
        enemy.mesh.rotation.y += enemy.rotVel.y * dt;
        enemy.mesh.rotation.z += enemy.rotVel.z * dt;

        // Comet sparkle trail
        if (Math.random() < 0.6) {
          spawnComicStars(enemy.pos, 0x38bdf8, 2);
        }

        // Hide label while way up in orbit
        if (enemy.labelEl) enemy.labelEl.style.display = 'none';

        // Apex passed and falling back down
        if (enemy.flyTimer > 3.5 && enemy.pos.y < 3.0) {
          // Splash down / parachute return!
          enemy.isFlying = false;
          enemy.vel.set(0, 0, 0);
          enemy.rotVel.set(0, 0, 0);
          enemy.pos.copy(enemy.homePos);
          enemy.mesh.position.copy(enemy.pos);
          enemy.mesh.rotation.set(0, enemy.rotY, 0);
          enemy.mange = 0.0; // Fully refreshed & calmed down!
          updateEnemyLabelUI(enemy);

          spawnComicStars(enemy.pos, 0x56c2ff, 18);
          if (window.showToast) {
            window.showToast('🌊 SPLASH DOWN!', `${enemy.title} parachuted back into the lagoon, soft and calmed!`);
          }
        }
        return;
      }

      // STATE B: GROUND RECOIL / REGULAR PHYSICS
      if (enemy.vel.lengthSq() > 0.01) {
        enemy.pos.addScaledVector(enemy.vel, dt);
        enemy.vel.multiplyScalar(Math.max(0, 1 - dt * 6.0));
      }

      // STATE C: AI BEHAVIOR (IDLE / PATROL / CHASE)
      const distToPlayer = playerPos ? enemy.pos.distanceTo(playerPos) : 999;

      if (distToPlayer < enemy.aggroDist) {
        // Turn and approach player with comical hop
        const dir = new THREE.Vector3().subVectors(playerPos, enemy.pos);
        dir.y = 0;
        dir.normalize();

        const targetRotY = Math.atan2(dir.x, dir.z);
        enemy.rotY += (targetRotY - enemy.rotY) * Math.min(1.0, dt * 6.0);
        enemy.mesh.rotation.y = enemy.rotY;

        // Move toward player
        if (distToPlayer > 1.6) {
          enemy.pos.addScaledVector(dir, enemy.speed * dt);
        }

        // Animated waddle / hop
        if (enemy.type === 'starfish') {
          enemy.mesh.position.y = enemy.homePos.y + Math.abs(Math.sin(enemy.animPhase * 2.5)) * 0.28;
          enemy.mesh.rotation.z = Math.sin(enemy.animPhase * 2.5) * 0.15;
        } else if (enemy.type === 'urchin') {
          enemy.mesh.position.y = enemy.homePos.y + Math.abs(Math.sin(enemy.animPhase * 3.0)) * 0.65;
        } else {
          enemy.mesh.position.y = enemy.homePos.y + Math.sin(enemy.animPhase * 2.0) * 0.12;
        }

        // Bumper contact with player (NO DYING — only comical nudge)
        if (distToPlayer < 1.4) {
          // Nudge player slightly
          if (window.BlahajGame && typeof window.BlahajGame.adjustSharkMange === 'function') {
            window.BlahajGame.adjustSharkMange(null, 0.03, `${enemy.title} Bump`);
          }
          // Push enemy back gently
          enemy.vel.addScaledVector(dir, -4.0);
        }
      } else {
        // Return leisurely towards home territory
        const dHome = enemy.pos.distanceTo(enemy.homePos);
        if (dHome > 2.0) {
          const homeDir = new THREE.Vector3().subVectors(enemy.homePos, enemy.pos).normalize();
          enemy.pos.addScaledVector(homeDir, enemy.speed * 0.5 * dt);
          enemy.mesh.rotation.y = Math.atan2(homeDir.x, homeDir.z);
        }
        enemy.mesh.position.y = enemy.homePos.y + Math.sin(enemy.animPhase * 1.5) * 0.08;
      }

      enemy.mesh.position.x = enemy.pos.x;
      enemy.mesh.position.z = enemy.pos.z;

      // 3. Project Overhead Label (Adhering strictly to proximity declutter fade!)
      if (enemy.labelEl && window.BlahajGame && window.BlahajGame.getCamera) {
        const cam = window.BlahajGame.getCamera();
        const distToCam = enemy.pos.distanceTo(cam.position);

        // Proximity declutter: fade smoothly between 6m and 14m, completely hidden beyond 14m!
        if (distToCam > 14.0) {
          enemy.labelEl.style.display = 'none';
          enemy.labelEl.style.opacity = '0';
        } else {
          const p = enemy.pos.clone();
          p.y += (enemy.type === 'shark' ? 2.3 : 1.8);
          p.project(cam);

          if (p.z > 1) {
            enemy.labelEl.style.display = 'none';
          } else {
            enemy.labelEl.style.display = '';
            const opacity = distToCam <= 6.0 ? 1.0 : (14.0 - distToCam) / 8.0;
            enemy.labelEl.style.opacity = opacity.toFixed(2);
            const screenX = (p.x * 0.5 + 0.5) * window.innerWidth;
            const screenY = (-(p.y * 0.5) + 0.5) * window.innerHeight;
            enemy.labelEl.style.left = `${screenX}px`;
            enemy.labelEl.style.top = `${screenY}px`;
          }
        }
      }
    });
  }

  // --------------------------------------------------------------------------
  // 6. BOOP ATTACK HIT CHECK
  // --------------------------------------------------------------------------
  function checkBoopHit(playerPos, playerRotY) {
    if (!playerPos) return false;

    // Forward direction from shark's yaw
    const fwd = new THREE.Vector3(
      -Math.sin(playerRotY),
      0,
      -Math.cos(playerRotY)
    ).normalize();

    let hitAny = false;
    enemies.forEach((enemy) => {
      if (enemy.isFlying) return;

      const toEnemy = new THREE.Vector3().subVectors(enemy.pos, playerPos);
      toEnemy.y = 0;
      const dist = toEnemy.length();

      if (dist <= 3.4) {
        toEnemy.normalize();
        const dot = fwd.dot(toEnemy);
        // Generous 120-degree frontal cone
        if (dot >= 0.25) {
          enemy.takeBoop(0.35, fwd);
          hitAny = true;

          // Network broadcast to co-op partner
          if (window.BlahajNetwork) {
            window.BlahajNetwork.send({
              type: 'enemy_boop',
              enemyId: enemy.id,
              mange: enemy.mange,
              isFlying: enemy.isFlying,
              posX: enemy.pos.x,
              posY: enemy.pos.y,
              posZ: enemy.pos.z
            });
          }
        }
      }
    });

    return hitAny;
  }

  return {
    init,
    update,
    checkBoopHit,
    getEnemies: () => enemies,
    launchEnemyIntoStratosphere
  };
})();
