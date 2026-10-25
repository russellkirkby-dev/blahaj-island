// ============================================================================
// BLÅHAJ ISLAND — ENEMIES & BOOP ATTACK SYSTEM
// ============================================================================
// Featuring:
// 1. Rowdy Gray Fin (Mean Shark · Grand Archipelago Rover)
// 2. Barnacle Chomp (Mean Shark · Hermes Strait Raider)
// 3. Scurvy Snout (Mean Shark · Hiram Sound Marauder)
// 4. Barnacle Brine Star (Evil Starfish · Moody Spike)
// 5. Prickly Kelp Urchin (Mischievous Puffball · Soft Spines)
//
// Core Philosophy:
// - Hit points = Mange.
// - There is NO dying in this game!
// - Enemies cannot die: hitting them enough sends them flying into the stratosphere / another dimension!
// - Mean sharks cruise along continuous oceanic patrol routes around the islands!
// ============================================================================

window.BlahajEnemies = (function () {
  let scene = null;
  let worldApi = null;
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

  // B. Mean Sharks Mesh Builder (With Personality Options!)
  function createMeanSharkMesh(opts = {}) {
    const {
      bodyColor = 0x475569, // Heather slate gray
      bellyColor = 0xe2e8f0,
      eyeColor = 0xfde047,  // Grumpy yellow eye
      hasGoldTooth = false,
      hasScars = false,
      hasEarring = false
    } = opts;

    const group = new THREE.Group();
    const bodyMat = createMat(bodyColor, 0.82);
    const bellyMat = createMat(bellyColor, 0.9);
    const teethMat = createMat(0xffffff, 0.6);
    const goldMat = createMat(0xf59e0b, 0.4, 0.6);
    const patchMat = createMat(0x0f172a, 0.9); // Black eyepatch
    const strapMat = createMat(0x1e293b, 0.9);
    const eyeMat = createMat(eyeColor, 0.5);

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

    if (hasGoldTooth) {
      const goldTooth = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.10, 0.12), goldMat);
      goldTooth.position.set(0.18, 0.56, 1.02);
      group.add(goldTooth);
    }

    if (hasEarring) {
      const earring = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.024, 6, 14), goldMat);
      earring.position.set(0.28, 1.45, -0.05);
      earring.rotation.y = 0.4;
      group.add(earring);
    }

    if (hasScars) {
      const scarMat = createMat(0xf472b6, 0.9); // Pale pink stitched battle scars
      const s1 = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.035, 0.03), scarMat);
      s1.position.set(0.30, 0.82, 1.15);
      s1.rotation.set(0.2, 0.3, 0.4);
      const s2 = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.035, 0.03), scarMat);
      s2.position.set(0.30, 0.82, 1.15);
      s2.rotation.set(0.2, 0.3, -0.4);
      group.add(s1);
      group.add(s2);
    }

    // Left Eyepatch (Clean flush pirate patch without floating neck strap ring)
    const eyepatch = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), patchMat);
    eyepatch.scale.set(1.0, 1.0, 0.4);
    eyepatch.position.set(-0.46, 0.95, 0.82);
    eyepatch.rotation.y = -0.4;
    group.add(eyepatch);

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
  // 3. OCEAN PATROL CIRCUITS FOR MEAN SHARKS
  // --------------------------------------------------------------------------
  // Route 1: Grand Archipelago Ocean Highway (Circumnavigating East Cape, North Sea & Solomon Straits)
  const ROUTE_GRAND_ARCHIPELAGO = [
    { name: 'East Cape Anchorage', x: 82, z: 18 },
    { name: 'Northeast Reef Channel', x: 88, z: 45 },
    { name: 'Outer Northeast Waters', x: 85, z: 80 },
    { name: 'North Channel Far East', x: 50, z: 92 },
    { name: 'North Pier Deep Passage', x: 0, z: 92 },
    { name: 'North Channel West', x: -50, z: 90 },
    { name: 'Solomon Bay Sound', x: -85, z: 75 },
    { name: 'Solomon Passage Deep', x: -110, z: 65 },
    { name: 'West Sound Central', x: -115, z: 25 },
    { name: 'Hiram Isle North Waters', x: -115, z: -15 },
    { name: 'Hiram Sound Deep', x: -120, z: -55 },
    { name: 'Hiram Sound Turning Basin', x: -115, z: -70 },
    { name: 'Hiram Isle East Passage', x: -105, z: -40 },
    { name: 'West Sound Turning Basin', x: -100, z: 0 },
    { name: 'Solomon Sound Approach', x: -95, z: 45 },
    { name: 'Solomon Approach Return', x: -75, z: 75 },
    { name: 'North Channel Return', x: 0, z: 95 },
    { name: 'North East High Water', x: 75, z: 75 }
  ];

  // Route 2: Hermes Atoll & Eastern Strait Circuit
  const ROUTE_HERMES_STRAIT = [
    { name: 'East Cape Anchorage', x: 82, z: 18 },
    { name: 'Hermes Approach North', x: 105, z: 35 },
    { name: 'Hermes Atoll West Channel', x: 125, z: 5 },
    { name: 'Hermes Sound Mid', x: 115, z: -15 },
    { name: 'Hermes Sound South', x: 105, z: -25 },
    { name: 'Hermes Outer Strait', x: 105, z: -5 },
    { name: 'East Cape South Approach', x: 100, z: 15 }
  ];

  // Route 3: West Archipelago Channel (Between Solomon Cay, Hiram Isle & Western Shallows)
  const ROUTE_WEST_ARCHIPELAGO = [
    { name: 'Solomon South Passage', x: -110, z: 65 },
    { name: 'Solomon-Hiram Mid-Strait', x: -115, z: 25 },
    { name: 'Hiram Isle North Waters', x: -115, z: -15 },
    { name: 'Hiram Sound Deep', x: -120, z: -55 },
    { name: 'Hiram Sound Turn', x: -115, z: -70 },
    { name: 'Hiram Isle East Passage', x: -105, z: -40 },
    { name: 'West Sound Central Channel', x: -100, z: 0 },
    { name: 'Solomon Sound Approach', x: -95, z: 45 }
  ];

  // --------------------------------------------------------------------------
  // 4. INITIALIZATION
  // --------------------------------------------------------------------------
  function init(sceneRef, worldApiRef) {
    scene = sceneRef;
    worldApi = worldApiRef;
    labelsContainer = document.getElementById('world-labels');

    const enemyDefs = [
      {
        id: 'shark_1',
        type: 'shark',
        title: 'Rowdy Gray Fin 🦈',
        tag: 'MEAN SHARK · ARCHIPELAGO ROVER',
        isWaterBased: true,
        homePos: new THREE.Vector3(82.0, -0.65, 18.0),
        builder: () => createMeanSharkMesh({ bodyColor: 0x475569, eyeColor: 0xfde047 }),
        speed: 5.0,
        patrolSpeedMult: 0.75,
        aggroDist: 11.0,
        patrolRoute: ROUTE_GRAND_ARCHIPELAGO,
        routeIdx: 0
      },
      {
        id: 'shark_2',
        type: 'shark',
        title: 'Barnacle Chomp 🦈',
        tag: 'MEAN SHARK · HERMES STRAIT RAIDER',
        isWaterBased: true,
        homePos: new THREE.Vector3(125.0, -0.65, 5.0),
        builder: () => createMeanSharkMesh({ bodyColor: 0x1e3a8a, eyeColor: 0xf97316, hasScars: true, hasEarring: true }),
        speed: 4.6,
        patrolSpeedMult: 0.72,
        aggroDist: 10.5,
        patrolRoute: ROUTE_HERMES_STRAIT,
        routeIdx: 2
      },
      {
        id: 'shark_3',
        type: 'shark',
        title: 'Scurvy Snout 🦈',
        tag: 'MEAN SHARK · HIRAM SOUND MARAUDER',
        isWaterBased: true,
        homePos: new THREE.Vector3(-115.0, -0.65, -15.0),
        builder: () => createMeanSharkMesh({ bodyColor: 0x0f766e, eyeColor: 0xa3e635, hasGoldTooth: true }),
        speed: 4.8,
        patrolSpeedMult: 0.74,
        aggroDist: 10.5,
        patrolRoute: ROUTE_WEST_ARCHIPELAGO,
        routeIdx: 2
      },
      {
        id: 'starfish_1',
        type: 'starfish',
        title: 'Barnacle Brine Star 🌟',
        tag: 'EVIL STARFISH · MOODY SPIKE',
        isWaterBased: true,
        homePos: new THREE.Vector3(74.0, -0.95, 26.0),
        builder: createStarfishMesh,
        speed: 2.2,
        aggroDist: 8.0,
        patrolRoute: null
      },
      {
        id: 'urchin_1',
        type: 'urchin',
        title: 'Prickly Kelp Urchin 🦔',
        tag: 'MISCHIEVOUS PUFFBALL · SOFT SPINES',
        isWaterBased: false,
        homePos: new THREE.Vector3(38.0, 1.5, -12.0),
        builder: createKelpUrchinMesh,
        speed: 2.8,
        aggroDist: 7.0,
        patrolRoute: null
      }
    ];

    enemyDefs.forEach((def) => {
      const groundY = worldApi && typeof worldApi.getGroundAndStructureHeight === 'function'
        ? worldApi.getGroundAndStructureHeight(def.homePos.x, def.homePos.z)
        : def.homePos.y;
      const waveY = worldApi && typeof worldApi.getWaveHeight === 'function'
        ? worldApi.getWaveHeight(def.homePos.x, def.homePos.z, 0)
        : 0.22;

      if (def.isWaterBased) {
        if (def.type === 'shark') {
          // Shark swims submerged in water column: body submerged, dorsal fin near surface
          def.homePos.y = Math.min(waveY - 0.38, Math.max(groundY + 0.55, waveY - 0.65));
        } else {
          // Starfish rests on the underwater sea floor
          def.homePos.y = groundY + 0.12;
        }
      } else {
        def.homePos.y = groundY;
      }

      const mesh = def.builder();
      mesh.position.copy(def.homePos);
      scene.add(mesh);

      const eObj = {
        id: def.id,
        type: def.type,
        title: def.title,
        tag: def.tag,
        isWaterBased: !!def.isWaterBased,
        homePos: def.homePos.clone(),
        pos: def.homePos.clone(),
        vel: new THREE.Vector3(),
        rotY: 0,
        rotVel: new THREE.Vector3(),
        speed: def.speed,
        patrolSpeedMult: def.patrolSpeedMult || 0.75,
        aggroDist: def.aggroDist,
        mange: 0.0,
        mesh,
        labelEl: null,
        isFlying: false,
        flyTimer: 0,
        respawnTimer: 0,
        animPhase: Math.random() * Math.PI * 2,
        state: 'idle',
        isChasing: false,
        patrolRoute: def.patrolRoute || null,
        waypointIdx: def.routeIdx || 0,
        takeBoop(dmg, knockDir) {
          handleEnemyBoop(this, dmg, knockDir);
        }
      };

      eObj.labelEl = createEnemyLabel(eObj);
      enemies.push(eObj);
    });

    console.log(`[BlahajEnemies] Initialized ${enemies.length} cozy enemies across island territories!`);
  }

  // --------------------------------------------------------------------------
  // 5. BOOP ATTACK RESOLUTION & FLYING FINISHER
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
  // 6. UPDATE LOOP (AI, ROUTE NAVIGATION, PHYSICS & PROXIMITY HUD)
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
    enemies.forEach((enemy, enemyIdx) => {
      enemy.animPhase += dt * 4.0;
      if (enemy.attackCooldown > 0) enemy.attackCooldown -= dt;

      // Special eyeball spin for urchin
      if (enemy.mesh && enemy.mesh.userData.leftPupil && enemy.mesh.userData.rightPupil) {
        enemy.mesh.userData.leftPupil.rotation.z += dt * 5.0;
        enemy.mesh.userData.rightPupil.rotation.z += dt * 5.0;
      }

      // Special tail wag for mean sharks
      if (enemy.mesh && enemy.mesh.userData.tailGroup) {
        const wagSpeed = enemy.isChasing ? 3.6 : 2.2;
        const wagAmp = enemy.isChasing ? 0.45 : 0.32;
        enemy.mesh.userData.tailGroup.rotation.y = Math.sin(enemy.animPhase * wagSpeed) * wagAmp;
      }

      // Soft bumper repulsion between enemies to prevent stacking
      for (let j = enemyIdx + 1; j < enemies.length; j++) {
        const other = enemies[j];
        if (other.isFlying || enemy.isFlying) continue;
        const sepX = other.pos.x - enemy.pos.x;
        const sepZ = other.pos.z - enemy.pos.z;
        const sepD = Math.hypot(sepX, sepZ);
        if (sepD < 2.4 && sepD > 0.001) {
          const push = (2.4 - sepD) * 0.5 * Math.min(1.0, dt * 5.0);
          const nx = sepX / sepD;
          const nz = sepZ / sepD;
          enemy.pos.x -= nx * push;
          enemy.pos.z -= nz * push;
          other.pos.x += nx * push;
          other.pos.z += nz * push;
        }
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

          if (enemy.patrolRoute && enemy.patrolRoute.length > 0) {
            // Pick closest waypoint to splashdown location so shark smoothly resumes route
            let bestIdx = 0;
            let bestD = Infinity;
            for (let i = 0; i < enemy.patrolRoute.length; i++) {
              const wp = enemy.patrolRoute[i];
              const d = Math.hypot(wp.x - enemy.pos.x, wp.z - enemy.pos.z);
              if (d < bestD) {
                bestD = d;
                bestIdx = i;
              }
            }
            enemy.waypointIdx = bestIdx;
            const targetWp = enemy.patrolRoute[bestIdx];
            enemy.pos.set(targetWp.x, enemy.pos.y, targetWp.z);
          } else {
            enemy.pos.copy(enemy.homePos);
          }

          enemy.mesh.position.copy(enemy.pos);
          enemy.mesh.rotation.set(0, enemy.rotY, 0);
          enemy.mange = 0.0; // Fully refreshed & calmed down!
          updateEnemyLabelUI(enemy);

          spawnComicStars(enemy.pos, 0x56c2ff, 18);
          if (enemy.isWaterBased && window.CozyAudio && typeof window.CozyAudio.waterSplash === 'function') {
            window.CozyAudio.waterSplash(0.3, 0.35);
          }
          if (window.showToast) {
            const locText = enemy.isWaterBased ? 'back into the azure ocean depths' : 'back into the meadow';
            window.showToast('🌊 SPLASH DOWN!', `${enemy.title} parachuted ${locText}, soft and calmed!`);
          }
        }
        return;
      }

      // Water and ground heights at current location
      const curGroundY = worldApi && typeof worldApi.getGroundAndStructureHeight === 'function'
        ? worldApi.getGroundAndStructureHeight(enemy.pos.x, enemy.pos.z)
        : enemy.homePos.y;
      const curWaveY = worldApi && typeof worldApi.getWaveHeight === 'function'
        ? worldApi.getWaveHeight(enemy.pos.x, enemy.pos.z, elapsed)
        : 0.22;

      // STATE B: GROUND / WATER RECOIL PHYSICS
      if (enemy.vel.lengthSq() > 0.01) {
        const nextRecoilX = enemy.pos.x + enemy.vel.x * dt;
        const nextRecoilZ = enemy.pos.z + enemy.vel.z * dt;
        if (enemy.isWaterBased && worldApi) {
          const testGround = worldApi.getGroundAndStructureHeight(nextRecoilX, nextRecoilZ);
          const testWave = worldApi.getWaveHeight(nextRecoilX, nextRecoilZ, elapsed);
          // Keep water creatures inside water during recoil!
          if (testWave - testGround >= 0.45) {
            enemy.pos.x = nextRecoilX;
            enemy.pos.z = nextRecoilZ;
          } else {
            enemy.vel.x = -enemy.vel.x * 0.3;
            enemy.vel.z = -enemy.vel.z * 0.3;
          }
        } else {
          enemy.pos.x = nextRecoilX;
          enemy.pos.z = nextRecoilZ;
        }
        enemy.vel.multiplyScalar(Math.max(0, 1 - dt * 6.0));
      }

      // STATE C: AI BEHAVIOR (IDLE / PATROL ROUTE / CHASE)
      const distToPlayer = playerPos ? enemy.pos.distanceTo(playerPos) : 999;

      if (distToPlayer < enemy.aggroDist) {
        enemy.isChasing = true;

        // Turn towards player
        const dir = new THREE.Vector3().subVectors(playerPos, enemy.pos);
        dir.y = 0;
        dir.normalize();

        const targetRotY = Math.atan2(dir.x, dir.z);
        let diffRot = targetRotY - enemy.rotY;
        while (diffRot < -Math.PI) diffRot += Math.PI * 2;
        while (diffRot > Math.PI) diffRot -= Math.PI * 2;
        enemy.rotY += diffRot * Math.min(1.0, dt * 5.5);
        enemy.mesh.rotation.y = enemy.rotY;

        // Move toward player, obeying strict water/land boundaries!
        if (distToPlayer > 1.6) {
          const stepX = dir.x * enemy.speed * dt;
          const stepZ = dir.z * enemy.speed * dt;
          const tryX = enemy.pos.x + stepX;
          const tryZ = enemy.pos.z + stepZ;

          if (enemy.isWaterBased && worldApi) {
            const tryGroundY = worldApi.getGroundAndStructureHeight(tryX, tryZ);
            const tryWaveY = worldApi.getWaveHeight(tryX, tryZ, elapsed);
            const tryDepth = tryWaveY - tryGroundY;

            // Water-based enemies ONLY move if target position is underwater (depth >= 0.55m)!
            // They NEVER step onto dry land!
            if (tryDepth >= 0.55) {
              enemy.pos.x = tryX;
              enemy.pos.z = tryZ;
            } else {
              // Shoreline deflection: slide along the water edge
              const tryXOnlyGround = worldApi.getGroundAndStructureHeight(tryX, enemy.pos.z);
              if (tryWaveY - tryXOnlyGround >= 0.55) {
                enemy.pos.x = tryX;
              } else {
                const tryZOnlyGround = worldApi.getGroundAndStructureHeight(enemy.pos.x, tryZ);
                if (tryWaveY - tryZOnlyGround >= 0.55) {
                  enemy.pos.z = tryZ;
                }
              }
            }
          } else if (!enemy.isWaterBased && worldApi) {
            // Land-based enemy (puffball): stays on land, doesn't plunge into deep water!
            const tryGroundY = worldApi.getGroundAndStructureHeight(tryX, tryZ);
            const tryWaveY = worldApi.getWaveHeight(tryX, tryZ, elapsed);
            if (tryWaveY - tryGroundY < 0.40) {
              enemy.pos.x = tryX;
              enemy.pos.z = tryZ;
            }
          } else {
            enemy.pos.x = tryX;
            enemy.pos.z = tryZ;
          }
        }

        // Active enemy attack on player with real combat stakes!
        if (distToPlayer < 1.75 && (!enemy.attackCooldown || enemy.attackCooldown <= 0)) {
          enemy.attackCooldown = 1.75; // 1.75s attack cooldown
          const dmg = (enemy.type === 'shark') ? 18 : (enemy.type === 'starfish' ? 14 : 10);
          if (window.BlahajGame && typeof window.BlahajGame.damagePlayer === 'function') {
            window.BlahajGame.damagePlayer(dmg, enemy.title, dir);
          }
          // Recoil bounce after lunge
          enemy.vel.addScaledVector(dir, -4.8);
        }
      } else {
        // Player has escaped or is far away
        if (enemy.isChasing) {
          if (distToPlayer > enemy.aggroDist * 1.3) {
            enemy.isChasing = false;
            // Pick closest waypoint to resume route smoothly
            if (enemy.patrolRoute && enemy.patrolRoute.length > 0) {
              let closestIdx = 0;
              let closestDist = Infinity;
              for (let i = 0; i < enemy.patrolRoute.length; i++) {
                const wp = enemy.patrolRoute[i];
                const d = Math.hypot(wp.x - enemy.pos.x, wp.z - enemy.pos.z);
                if (d < closestDist) {
                  closestDist = d;
                  closestIdx = i;
                }
              }
              enemy.waypointIdx = closestIdx;
            }
          }
        }

        if (enemy.patrolRoute && enemy.patrolRoute.length > 0) {
          // PATROL ROUTE NAVIGATION ALONG THE ISLANDS
          const targetWp = enemy.patrolRoute[enemy.waypointIdx];
          const toWpX = targetWp.x - enemy.pos.x;
          const toWpZ = targetWp.z - enemy.pos.z;
          const distToWp = Math.hypot(toWpX, toWpZ);

          // Once within 4.5m of current waypoint, smoothly advance to the next waypoint on circuit
          if (distToWp < 4.5) {
            enemy.waypointIdx = (enemy.waypointIdx + 1) % enemy.patrolRoute.length;
          }

          const moveDir = new THREE.Vector3(toWpX, 0, toWpZ).normalize();
          const targetRotY = Math.atan2(moveDir.x, moveDir.z);

          let diffRot = targetRotY - enemy.rotY;
          while (diffRot < -Math.PI) diffRot += Math.PI * 2;
          while (diffRot > Math.PI) diffRot -= Math.PI * 2;
          enemy.rotY += diffRot * Math.min(1.0, dt * 2.5);
          enemy.mesh.rotation.y = enemy.rotY;

          // Cruise forward at steady swimming patrol speed
          const cruiseSpeed = enemy.speed * (enemy.patrolSpeedMult || 0.75);
          const fwdX = Math.sin(enemy.rotY) * cruiseSpeed * dt;
          const fwdZ = Math.cos(enemy.rotY) * cruiseSpeed * dt;

          const tryX = enemy.pos.x + fwdX;
          const tryZ = enemy.pos.z + fwdZ;

          if (enemy.isWaterBased && worldApi) {
            const tryGroundY = worldApi.getGroundAndStructureHeight(tryX, tryZ);
            const tryWaveY = worldApi.getWaveHeight(tryX, tryZ, elapsed);
            if (tryWaveY - tryGroundY >= 0.55) {
              enemy.pos.x = tryX;
              enemy.pos.z = tryZ;
            } else {
              enemy.pos.x += moveDir.x * cruiseSpeed * dt;
              enemy.pos.z += moveDir.z * cruiseSpeed * dt;
            }
          } else {
            enemy.pos.x = tryX;
            enemy.pos.z = tryZ;
          }

          // Gentle banking into turns
          enemy.mesh.rotation.z = Math.sin(enemy.animPhase * 1.5) * 0.08 - diffRot * 0.22;
        } else {
          // Stationary / Territorial creatures return leisurely towards home territory
          const dHome = enemy.pos.distanceTo(enemy.homePos);
          if (dHome > 2.0) {
            const homeDir = new THREE.Vector3().subVectors(enemy.homePos, enemy.pos).normalize();
            enemy.pos.addScaledVector(homeDir, enemy.speed * 0.45 * dt);
            enemy.mesh.rotation.y = Math.atan2(homeDir.x, homeDir.z);
          }
        }
      }

      // Query final ground & wave heights for visual rendering
      const finalGroundY = worldApi && typeof worldApi.getGroundAndStructureHeight === 'function'
        ? worldApi.getGroundAndStructureHeight(enemy.pos.x, enemy.pos.z)
        : enemy.homePos.y;
      const finalWaveY = worldApi && typeof worldApi.getWaveHeight === 'function'
        ? worldApi.getWaveHeight(enemy.pos.x, enemy.pos.z, elapsed)
        : 0.22;

      // Vertical positioning & animations
      if (enemy.isWaterBased) {
        if (enemy.type === 'shark') {
          // Mean Shark swims submerged in the water column!
          // Depth fluctuates gently with swimming stroke, with dorsal fin slicing near the water surface
          const targetSwimY = Math.min(finalWaveY - 0.32, Math.max(finalGroundY + 0.55, finalWaveY - 0.68 + Math.sin(enemy.animPhase * 1.5) * 0.16));
          enemy.mesh.position.y = targetSwimY;
          if (!enemy.patrolRoute) {
            enemy.mesh.rotation.z = Math.sin(enemy.animPhase * 1.5) * 0.09;
          }
        } else if (enemy.type === 'starfish') {
          // Starfish crawls on the underwater seabed / reef floor
          enemy.mesh.position.y = finalGroundY + 0.14 + Math.abs(Math.sin(enemy.animPhase * 2.2)) * 0.12;
          enemy.mesh.rotation.z = Math.sin(enemy.animPhase * 2.2) * 0.10;
        }
      } else {
        // Land-based puffball hops merrily across meadow grass
        enemy.mesh.position.y = finalGroundY + Math.abs(Math.sin(enemy.animPhase * 3.0)) * 0.58;
      }

      enemy.pos.y = enemy.mesh.position.y;
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
  // 7. BOOP ATTACK HIT CHECK
  // --------------------------------------------------------------------------
  function checkBoopHit(playerPos, playerRotY) {
    if (!playerPos) return false;

    // Forward direction from shark's yaw (positive sin/cos in our coordinate system!)
    const fwd = new THREE.Vector3(
      Math.sin(playerRotY),
      0,
      Math.cos(playerRotY)
    ).normalize();

    let hitAny = false;
    enemies.forEach((enemy) => {
      if (enemy.isFlying) return;

      const toEnemy = new THREE.Vector3().subVectors(enemy.pos, playerPos);
      toEnemy.y = 0;
      const dist = toEnemy.length();

      // Generous hit detection:
      // 1. Close contact (dist <= 2.4m): hits from any frontal or side contact
      // 2. Medium range (dist <= 4.2m): hits if enemy is in broad frontal arc (dot >= 0.1)
      let isHit = false;
      if (dist <= 2.4) {
        isHit = true;
      } else if (dist <= 4.2) {
        toEnemy.normalize();
        const dot = fwd.dot(toEnemy);
        if (dot >= 0.1) {
          isHit = true;
        }
      }

      if (isHit) {
        const knockDir = dist > 0.1 ? toEnemy : fwd;
        enemy.takeBoop(0.35, knockDir);
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
