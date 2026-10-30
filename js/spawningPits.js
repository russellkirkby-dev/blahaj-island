// ============================================================================
// BLAHAJ ISLAND — THE INFINITE IKEA SPAWNING PITS OF ERF (PASS 75)
// A 426-Meter-Long, Multi-Level, 6-Wing Surreal Stealth Labyrinth Dungeon
// ============================================================================
// Wing 1 (Z: +36 to -10, Y: +6.0m) : The Great Wire Spawning Bins & Sacred Scissors Altar
// Wing 2 (Z: -10 to -115, Y: +6.0m): The Winding 400-Room Showroom Labyrinth
// Wing 3 (Z: -115 to -165, Y: +6->0): The Great Moving Escalator Atrium & Floating Living Rooms
// Wing 4 (Z: -165 to -255, Y: 0.0m): Room 404 "LÄBYRINT" — Surreal Upside-Down & Wardrobe Maze
// Wing 5 (Z: -255 to -340, Y: 0.0m): Colossal Self-Serve Flat-Pack Warehouse (Aisles 12–18)
// Wing 6 (Z: -340 to -390, Y: 0.0m): Self-Checkout, Midnight Swedish Bistro & Hermes Escape Portal
// ============================================================================

(function () {
  'use strict';

  let spScene = null;
  let isBuilt = false;
  let isActive = false;

  // Overall Megastore Bounds
  const STORE_HALF_W = 24.0; // 48m wide megastore!
  const STORE_MIN_Z = -390.0;
  const STORE_MAX_Z = 36.0;
  const UPPER_FLOOR_Y = 6.0;
  const LOWER_FLOOR_Y = 0.0;
  const ESCALATOR_Z_START = -120.0; // Top of escalator (Y = 6.0)
  const ESCALATOR_Z_END = -156.0;   // Bottom of escalator (Y = 0.0)

  // Spawn inside Giant Wire Spawning Bin #7 on Upper Level 2 (Y = 6.0m)
  const START_POS = { x: 0.0, y: UPPER_FLOOR_Y + 0.35, z: 26.0, rotY: Math.PI };

  // Progressive Checkpoints (Pillow-Fort Safe Havens)
  const CHECKPOINTS = [
    { id: 'cp_bin', name: 'Wire Spawning Bin #303.735.88 (Upper Level)', x: 0.0, y: 6.35, z: 26.0, rotY: Math.PI, maxZ: 36.0 },
    { id: 'cp_mid_showroom', name: 'Showroom Pillow-Fort Alcove (Room 204)', x: -16.0, y: 6.0, z: -62.0, rotY: Math.PI, maxZ: -55.0 },
    { id: 'cp_escalator_top', name: 'Escalator Atrium Overlook', x: 0.0, y: 6.0, z: -116.0, rotY: Math.PI, maxZ: -112.0 },
    { id: 'cp_surreal_entry', name: 'Lower Deck Landing & Wardrobe Safe-Nook', x: 0.0, y: 0.0, z: -164.0, rotY: Math.PI, maxZ: -158.0 },
    { id: 'cp_warehouse_entry', name: 'Self-Serve Warehouse Aisle 14 Entrance', x: 0.0, y: 0.0, z: -256.0, rotY: Math.PI, maxZ: -252.0 }
  ];
  let furthestZReached = 26.0;

  // Solid obstacle boxes & walkable platforms
  // { minX, maxX, minZ, maxZ, minY, topY, solid, blocksSight }
  const colliders = [];

  // Interactive 3D Flat-Pack Kit crates across Showroom, Surreal Maze & Warehouse
  const flatpackPickups = [];

  // Patrolling Silhouetted Chubby Human Erf Security Guards ("Fat Cops in Silhouette")
  const securityGuards = [];
  let spotlightAlertCooldown = 0;
  let onSecuritySpottedCallback = null;
  let onAutoPortalExitCallback = null;

  // Animated elements
  const escalatorStepMeshes = [];
  const surrealFloatingProps = [];
  let portalRingOuter = null;
  let portalRingInner = null;
  let portalVortexMesh = null;
  let hermesGuideMesh = null;
  let sacredScissorsMesh = null;

  // Shared Floor Arrow Texture Cache
  let yellowArrowTex = null;
  let glitchArrowTex = null;

  function addCollider(minX, maxX, minZ, maxZ, topY, solid = true, minY = -1.0, blocksSight = null) {
    colliders.push({
      minX: Math.min(minX, maxX),
      maxX: Math.max(minX, maxX),
      minZ: Math.min(minZ, maxZ),
      maxZ: Math.max(minZ, maxZ),
      minY,
      topY,
      solid,
      blocksSight: blocksSight !== null ? blocksSight : (solid && (topY - minY) >= 1.3)
    });
  }

  // ==========================================================================
  // 1. AUTO-FITTING SIGN GENERATOR (Guarantees text never overflows borders!)
  // ==========================================================================
  function fitAndWrapText(ctx, text, maxWidth, startFontSize, minFontSize, fontWeight = '900', fontFamily = '"Nunito", "Segoe UI", sans-serif') {
    let fontSize = startFontSize;
    while (fontSize > minFontSize) {
      ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
      if (ctx.measureText(text).width <= maxWidth) {
        return { fontSize, lines: [text] };
      }
      fontSize -= 2;
    }
    // If still wider at minFontSize, wrap into 2 balanced lines
    ctx.font = `${fontWeight} ${minFontSize}px ${fontFamily}`;
    const words = text.split(' ');
    const lines = [];
    let currentLine = words[0] || '';
    for (let i = 1; i < words.length; i++) {
      const candidate = currentLine + ' ' + words[i];
      if (ctx.measureText(candidate).width <= maxWidth) {
        currentLine = candidate;
      } else {
        lines.push(currentLine);
        currentLine = words[i];
      }
    }
    if (currentLine) lines.push(currentLine);
    return { fontSize: minFontSize, lines: lines.slice(0, 2) };
  }

  function makeSignTexture(title, subtitle, bgHex = '#0058a3', fgHex = '#ffda1a', borderHex = '#ffda1a') {
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 320;
    const ctx = canvas.getContext('2d');

    // Deep background
    ctx.fillStyle = bgHex;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Outer & Inner Yellow Frame Border with generous padding
    ctx.strokeStyle = borderHex;
    ctx.lineWidth = 14;
    ctx.strokeRect(18, 18, canvas.width - 36, canvas.height - 36);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 3;
    ctx.strokeRect(32, 32, canvas.width - 64, canvas.height - 64);

    const safeWidth = canvas.width - 140; // 1140px safe interior width!
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const titleFit = fitAndWrapText(ctx, title, safeWidth, 56, 30, '900');
    ctx.fillStyle = fgHex;
    ctx.font = `900 ${titleFit.fontSize}px "Nunito", "Segoe UI", sans-serif`;

    if (!subtitle) {
      if (titleFit.lines.length === 1) {
        ctx.fillText(titleFit.lines[0], canvas.width / 2, canvas.height / 2);
      } else {
        ctx.fillText(titleFit.lines[0], canvas.width / 2, canvas.height / 2 - 28);
        ctx.fillText(titleFit.lines[1], canvas.width / 2, canvas.height / 2 + 28);
      }
    } else {
      const subFit = fitAndWrapText(ctx, subtitle, safeWidth, 32, 20, '700');
      if (titleFit.lines.length === 1) {
        ctx.fillText(titleFit.lines[0], canvas.width / 2, 112);
      } else {
        ctx.fillText(titleFit.lines[0], canvas.width / 2, 86);
        ctx.fillText(titleFit.lines[1], canvas.width / 2, 132);
      }

      ctx.fillStyle = '#ffffff';
      ctx.font = `700 ${subFit.fontSize}px "Nunito", "Segoe UI", sans-serif`;
      if (subFit.lines.length === 1) {
        ctx.fillText(subFit.lines[0], canvas.width / 2, 218);
      } else {
        ctx.fillText(subFit.lines[0], canvas.width / 2, 198);
        ctx.fillText(subFit.lines[1], canvas.width / 2, 236);
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }

  function createHangingSignBoard(title, subtitle, width = 8.4, height = 2.1, bgHex = '#0058a3', fgHex = '#ffda1a', borderHex = '#ffda1a') {
    const group = new THREE.Group();
    const tex = makeSignTexture(title, subtitle, bgHex, fgHex, borderHex);

    const backing = new THREE.Mesh(
      new THREE.BoxGeometry(width + 0.16, height + 0.16, 0.14),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 })
    );
    group.add(backing);

    const faceMat = new THREE.MeshBasicMaterial({ map: tex });
    const front = new THREE.Mesh(new THREE.PlaneGeometry(width, height), faceMat);
    front.position.z = 0.08;
    const back = new THREE.Mesh(new THREE.PlaneGeometry(width, height), faceMat);
    back.position.z = -0.08;
    back.rotation.y = Math.PI;
    group.add(front, back);

    return group;
  }

  // ==========================================================================
  // 2. CRISP FLAT FLOOR ARROW DECALS (Never wonky 3D pyramids!)
  // ==========================================================================
  function getFloorArrowTexture(isGlitch = false) {
    if (!isGlitch && yellowArrowTex) return yellowArrowTex;
    if (isGlitch && glitchArrowTex) return glitchArrowTex;

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 512, 512);

    // Outer dark floor contrast stencil border
    ctx.fillStyle = isGlitch ? '#a855f7' : '#ffda1a';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 14;
    ctx.lineJoin = 'round';

    // Draw bold upward-pointing arrow in canvas (+Y is down, so point at top Y=48)
    ctx.beginPath();
    ctx.moveTo(256, 44);   // Arrow tip
    ctx.lineTo(436, 234);  // Right wing tip
    ctx.lineTo(326, 234);  // Right shaft inner corner
    ctx.lineTo(326, 464);  // Bottom right shaft
    ctx.lineTo(186, 464);  // Bottom left shaft
    ctx.lineTo(186, 234);  // Left shaft inner corner
    ctx.lineTo(76, 234);   // Left wing tip
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Inner directional chevron highlight
    ctx.strokeStyle = isGlitch ? '#f0abfc' : '#fef9c3';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(160, 210);
    ctx.lineTo(256, 114);
    ctx.lineTo(352, 210);
    ctx.stroke();

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    if (isGlitch) glitchArrowTex = tex;
    else yellowArrowTex = tex;
    return tex;
  }

  function addFloorArrow(x, y, z, dirX, dirZ, isGlitch = false, scale = 1.0) {
    const tex = getFloorArrowTexture(isGlitch);
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.7 * scale, 2.2 * scale), mat);
    mesh.rotation.x = -Math.PI / 2;
    // Canvas top points toward -Z when rotation.z = 0; align with (dirX, dirZ)
    const angle = Math.atan2(dirX, -dirZ);
    mesh.rotation.z = -angle;
    mesh.position.set(x, y + 0.025, z);
    spScene.add(mesh);
  }

  function addArrowTrail(waypoints, yLevel, spacing = 5.5, isGlitch = false) {
    for (let i = 0; i < waypoints.length - 1; i++) {
      const a = waypoints[i];
      const b = waypoints[i + 1];
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.5) continue;
      const steps = Math.max(1, Math.floor(dist / spacing));
      for (let s = 0; s < steps; s++) {
        const t = (s + 0.45) / steps;
        const px = a.x + dx * t;
        const pz = a.z + dz * t;
        const py = typeof a.y === 'number' && typeof b.y === 'number'
          ? (a.y + (b.y - a.y) * t)
          : yLevel;
        addFloorArrow(px, py, pz, dx / dist, dz / dist, isGlitch);
      }
    }
  }

  // ==========================================================================
  // 3. SILHOUETTED CHUBBY HUMAN ERF SECURITY GUARDS ("FAT COPS IN SILHOUETTE")
  // ==========================================================================
  function createSilhouettedErfGuard(cfg) {
    const group = new THREE.Group();
    group.position.set(cfg.waypoints[0].x, cfg.y || 0, cfg.waypoints[0].z);

    // Pure pitch-black silhouette material with a faint rim-shadow sheen
    const silhouetteMat = new THREE.MeshBasicMaterial({ color: 0x040711 });
    const badgeMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    const eyeGlowMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });

    const bodyRoot = new THREE.Group();
    group.add(bodyRoot);

    // Stubby legs (animated during waddle)
    const legGeo = new THREE.CylinderGeometry(0.18, 0.15, 0.72, 10);
    const legL = new THREE.Mesh(legGeo, silhouetteMat);
    legL.position.set(-0.24, 0.36, 0);
    const legR = new THREE.Mesh(legGeo, silhouetteMat);
    legR.position.set(0.24, 0.36, 0);
    bodyRoot.add(legL, legR);

    // Heavy flat cop shoes
    const shoeGeo = new THREE.BoxGeometry(0.28, 0.14, 0.46);
    const shoeL = new THREE.Mesh(shoeGeo, silhouetteMat);
    shoeL.position.set(0, -0.32, 0.08);
    legL.add(shoeL);
    const shoeR = shoeL.clone();
    legR.add(shoeR);

    // Round portly "fat cop" belly & torso silhouette
    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.68, 16, 14), silhouetteMat);
    belly.scale.set(1.12, 1.08, 1.16);
    belly.position.set(0, 1.18, 0.06);
    bodyRoot.add(belly);

    // Broad shoulders & upper chest
    const chest = new THREE.Mesh(new THREE.SphereGeometry(0.56, 14, 12), silhouetteMat);
    chest.scale.set(1.25, 0.85, 0.95);
    chest.position.set(0, 1.62, 0.0);
    bodyRoot.add(chest);

    // Utility belt silhouette + walkie-talkie antenna on hip
    const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.14, 16), silhouetteMat);
    belt.position.set(0, 0.88, 0.05);
    bodyRoot.add(belt);
    const radioBox = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.28, 0.16), silhouetteMat);
    radioBox.position.set(-0.72, 0.98, 0);
    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.38, 6), silhouetteMat);
    antenna.position.set(-0.72, 1.24, 0);
    bodyRoot.add(radioBox, antenna);

    // Tiny golden security badge silhouette glint on chest
    const badge = new THREE.Mesh(new THREE.CircleGeometry(0.065, 6), badgeMat);
    badge.position.set(-0.24, 1.68, 0.52);
    bodyRoot.add(badge);

    // Chubby head & double-chin silhouette
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 14, 12), silhouetteMat);
    head.scale.set(1.08, 0.98, 1.05);
    head.position.set(0, 2.16, 0.02);
    bodyRoot.add(head);

    // Iconic 8-point Mall-Cop Peaked Security Cap in silhouette
    const capCrown = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.33, 0.22, 8), silhouetteMat);
    capCrown.position.set(0, 2.46, 0.0);
    capCrown.rotation.y = Math.PI / 8;
    const capVisor = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.05, 0.34), silhouetteMat);
    capVisor.position.set(0, 2.36, 0.26);
    capVisor.rotation.x = 0.18;
    const capBadge = new THREE.Mesh(new THREE.CircleGeometry(0.05, 8), badgeMat);
    capBadge.position.set(0, 2.47, 0.36);
    bodyRoot.add(capCrown, capVisor, capBadge);

    // Glowing pinprick spectacle eyes in the shadow
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), eyeGlowMat);
    eyeL.position.set(-0.11, 2.18, 0.34);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.11;
    bodyRoot.add(eyeL, eyeR);

    // Left Arm holding a Donut / Coffee Mug
    const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.13, 0.68, 10), silhouetteMat);
    armL.position.set(0.68, 1.42, 0.15);
    armL.rotation.z = -0.35;
    armL.rotation.x = -0.45;
    const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.09, 0.22, 10), silhouetteMat);
    mug.position.set(0, -0.36, 0.12);
    armL.add(mug);
    bodyRoot.add(armL);

    // Right Arm extended forward holding Heavy Night-Shift Flashlight
    const armR = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.13, 0.68, 10), silhouetteMat);
    armR.position.set(-0.68, 1.42, 0.22);
    armR.rotation.z = 0.28;
    armR.rotation.x = -0.85;
    bodyRoot.add(armR);

    // Flashlight Barrel & Volumetric Forward Beam Cone
    const torchGroup = new THREE.Group();
    torchGroup.position.set(-0.55, 1.32, 0.55);
    bodyRoot.add(torchGroup);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.05, 0.38, 10), silhouetteMat);
    barrel.rotation.x = Math.PI / 2;
    torchGroup.add(barrel);

    const lens = new THREE.Mesh(
      new THREE.CircleGeometry(0.07, 12),
      new THREE.MeshBasicMaterial({ color: 0xfef08a })
    );
    lens.position.z = 0.2;
    torchGroup.add(lens);

    // Sweeping translucent flashlight cone pointing forward (+Z in local guard space, tilted down to floor)
    const beamLen = cfg.beamLength || 6.2;
    const beamRadius = cfg.beamRadius || 2.35;
    const coneGeo = new THREE.ConeGeometry(beamRadius, beamLen, 20, 1, true);
    // Shift cone geometry so apex is at origin (0,0,0) and base extends along +Z and slightly -Y
    coneGeo.translate(0, -beamLen / 2, 0);
    coneGeo.rotateX(-Math.PI / 2 + 0.22);
    const coneMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const coneMesh = new THREE.Mesh(coneGeo, coneMat);
    torchGroup.add(coneMesh);

    // Floor spotlight warning pool projected in front of the guard
    const floorRing = new THREE.Mesh(
      new THREE.RingGeometry(beamRadius - 0.28, beamRadius, 28),
      new THREE.MeshBasicMaterial({
        color: 0xef4444,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.72
      })
    );
    floorRing.rotation.x = -Math.PI / 2;
    floorRing.position.set(group.position.x, (cfg.y || 0) + 0.04, group.position.z);
    spScene.add(floorRing);

    const floorDisc = new THREE.Mesh(
      new THREE.CircleGeometry(beamRadius - 0.28, 24),
      new THREE.MeshBasicMaterial({
        color: 0xfef08a,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.16,
        depthWrite: false
      })
    );
    floorDisc.rotation.x = -Math.PI / 2;
    floorRing.add(floorDisc);

    spScene.add(group);

    securityGuards.push({
      id: cfg.id,
      name: cfg.name || 'Erf Night-Shift Guard',
      y: cfg.y || 0,
      waypoints: cfg.waypoints,
      wpIndex: 0,
      speed: cfg.speed || 2.8,
      beamDist: (cfg.beamLength || 6.2) * 0.72,
      beamRadius: cfg.beamRadius || 2.35,
      group,
      bodyRoot,
      legL,
      legR,
      floorRing,
      rotY: 0,
      spotX: group.position.x,
      spotZ: group.position.z
    });
  }

  // Check if a furniture piece or partition wall blocks line-of-sight between a guard and the player
  function isLineOfSightBlocked(x1, z1, x2, z2, yLevel) {
    const steps = 10;
    for (let s = 1; s < steps; s++) {
      const t = s / steps;
      const px = x1 + (x2 - x1) * t;
      const pz = z1 + (z2 - z1) * t;
      for (let i = 0; i < colliders.length; i++) {
        const c = colliders[i];
        if (!c.blocksSight) continue;
        if (yLevel + 0.8 < c.minY || yLevel + 0.5 > c.topY) continue;
        if (px >= c.minX && px <= c.maxX && pz >= c.minZ && pz <= c.maxZ) {
          return true;
        }
      }
    }
    return false;
  }

  // ==========================================================================
  // 4. MODULAR 3D IKEA FURNITURE CATALOG (Used across all Showroom & Surreal Wings)
  // ==========================================================================
  const MAT = {};
  function initMaterials() {
    MAT.birch = new THREE.MeshStandardMaterial({ color: 0xf3e5ab, roughness: 0.62 });
    MAT.oak = new THREE.MeshStandardMaterial({ color: 0xd4a373, roughness: 0.68 });
    MAT.white = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.48 });
    MAT.darkWood = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.65 });
    MAT.ikeaBlue = new THREE.MeshStandardMaterial({ color: 0x0058a3, roughness: 0.45 });
    MAT.ikeaYellow = new THREE.MeshStandardMaterial({ color: 0xffda1a, roughness: 0.38 });
    MAT.sofaRed = new THREE.MeshStandardMaterial({ color: 0xbe123c, roughness: 0.82 });
    MAT.sofaTeal = new THREE.MeshStandardMaterial({ color: 0x0f766e, roughness: 0.82 });
    MAT.sofaMustard = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.82 });
    MAT.sofaNavy = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.82 });
    MAT.chrome = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.78, roughness: 0.25 });
    MAT.plantGreen = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.65 });
    MAT.terracotta = new THREE.MeshStandardMaterial({ color: 0xc2410c, roughness: 0.75 });
    MAT.lampGlow = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.75,
      roughness: 0.25
    });
    MAT.wallBlue = new THREE.MeshStandardMaterial({ color: 0x004b8d, roughness: 0.58 });
    MAT.partitionCream = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.7 });
    MAT.partitionSlate = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.68 });
  }

  // Place a solid labyrinth partition wall with optional doorway gap
  function addPartitionWall(minX, maxX, minZ, maxZ, yBase, height = 4.2, mat = null) {
    const w = Math.abs(maxX - minX);
    const d = Math.abs(maxZ - minZ);
    const cx = (minX + maxX) / 2;
    const cz = (minZ + maxZ) / 2;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, height, d), mat || MAT.partitionCream);
    mesh.position.set(cx, yBase + height / 2, cz);
    spScene.add(mesh);

    // Baseboard trim
    const trim = new THREE.Mesh(new THREE.BoxGeometry(w + 0.04, 0.16, d + 0.04), MAT.ikeaBlue);
    trim.position.set(cx, yBase + 0.08, cz);
    spScene.add(trim);

    addCollider(minX, maxX, minZ, maxZ, yBase + height, true, yBase, true);
  }

  // Place a KALLAX 4x4 Cube Shelf Divider (Provides Stealth Cover!)
  function placeKallaxShelf(x, yBase, z, rotY = 0, w = 3.2, h = 2.4, d = 0.85, addCol = true) {
    const g = new THREE.Group();
    g.position.set(x, yBase, z);
    g.rotation.y = rotY;

    const frame = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), MAT.birch);
    frame.position.y = h / 2;
    g.add(frame);

    const insertColors = [MAT.ikeaBlue, MAT.ikeaYellow, MAT.sofaRed];
    for (let i = 0; i < 3; i++) {
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(w * 0.26, h * 0.34, d + 0.06),
        insertColors[i % insertColors.length]
      );
      box.position.set((i - 1) * (w * 0.3), h * 0.32 + (i % 2) * (h * 0.36), 0);
      g.add(box);
    }
    spScene.add(g);

    if (addCol) {
      const swap = Math.abs(Math.sin(rotY)) > 0.7;
      const halfW = (swap ? d : w) / 2;
      const halfD = (swap ? w : d) / 2;
      addCollider(x - halfW, x + halfW, z - halfD, z + halfD, yBase + h, true, yBase, true);
    }
    return g;
  }

  // Place a KLIPPAN / EKTORP Sofa + LACK Coffee Table + Showroom Rug Vignette
  function placeSofaVignette(x, yBase, z, rotY = 0, sofaMat = null, addCol = true) {
    const g = new THREE.Group();
    g.position.set(x, yBase, z);
    g.rotation.y = rotY;

    const sMat = sofaMat || MAT.sofaTeal;

    // Area Rug
    const rug = new THREE.Mesh(
      new THREE.BoxGeometry(4.4, 0.04, 3.6),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 })
    );
    rug.position.set(0, 0.02, 0.5);
    g.add(rug);

    // Sofa Base, Backrest & Arms (Provides 1.45m high cover!)
    const seat = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.55, 1.25), sMat);
    seat.position.set(0, 0.28, -0.8);
    const back = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.45, 0.38), sMat);
    back.position.set(0, 0.72, -1.25);
    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.95, 1.25), sMat);
    armL.position.set(-1.45, 0.48, -0.8);
    const armR = armL.clone();
    armR.position.x = 1.45;
    g.add(seat, back, armL, armR);

    // LACK Coffee Table in front of sofa
    const tableTop = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.1, 0.95), MAT.white);
    tableTop.position.set(0, 0.52, 0.65);
    g.add(tableTop);

    // FADO Glowing Sphere Lamp on table
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 12), MAT.lampGlow);
    lamp.position.set(0.45, 0.78, 0.65);
    g.add(lamp);

    // FEJKA Potted Plant beside sofa
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.2, 0.42, 10), MAT.terracotta);
    pot.position.set(-1.95, 0.21, -0.8);
    const bush = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 10), MAT.plantGreen);
    bush.scale.set(1, 1.4, 1);
    bush.position.set(-1.95, 0.72, -0.8);
    g.add(pot, bush);

    spScene.add(g);

    if (addCol) {
      const swap = Math.abs(Math.sin(rotY)) > 0.7;
      const hw = swap ? 1.5 : 1.7;
      const hd = swap ? 1.7 : 1.5;
      addCollider(x - hw, x + hw, z - hd, z + hd, yBase + 1.45, true, yBase, true);
    }
    return g;
  }

  // Place a MALM Canopy Bedroom Vignette
  function placeMalmBedVignette(x, yBase, z, rotY = 0, addCol = true) {
    const g = new THREE.Group();
    g.position.set(x, yBase, z);
    g.rotation.y = rotY;

    const frame = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.42, 3.2), MAT.oak);
    frame.position.y = 0.21;
    const headboard = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.65, 0.24), MAT.oak);
    headboard.position.set(0, 0.82, -1.48);
    const mattress = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.28, 2.9), MAT.white);
    mattress.position.set(0, 0.52, 0.08);
    const duvet = new THREE.Mesh(new THREE.BoxGeometry(2.44, 0.3, 2.1), MAT.ikeaBlue);
    duvet.position.set(0, 0.54, 0.45);
    g.add(frame, headboard, mattress, duvet);

    // Sleeping Mini Blåhaj on the pillow!
    const shonk = createMiniPlushShark(0x3b82f6, 0xf8fafc, 0.65);
    shonk.position.set(0, 0.82, -0.85);
    g.add(shonk);

    spScene.add(g);

    if (addCol) {
      const swap = Math.abs(Math.sin(rotY)) > 0.7;
      const hw = swap ? 1.65 : 1.35;
      const hd = swap ? 1.35 : 1.65;
      addCollider(x - hw, x + hw, z - hd, z + hd, yBase + 1.5, true, yBase, true);
    }
    return g;
  }

  // Place a Towering PAX Wardrobe / BILLY Bookcase Monolith (Used in Wing 2 & Wing 4 Maze)
  function placePaxWardrobe(x, yBase, z, w = 2.8, d = 1.2, h = 3.6, isSecretPassThrough = false) {
    const g = new THREE.Group();
    g.position.set(x, yBase, z);

    if (!isSecretPassThrough) {
      const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), MAT.darkWood);
      body.position.y = h / 2;
      g.add(body);

      const doorGap = new THREE.Mesh(new THREE.BoxGeometry(0.05, h - 0.2, d + 0.04), MAT.chrome);
      doorGap.position.y = h / 2;
      g.add(doorGap);

      addCollider(x - w / 2, x + w / 2, z - d / 2, z + d / 2, yBase + h, true, yBase, true);
    } else {
      // Secret open Narnia-style PAX Wardrobe portal frame that you can walk straight through!
      const sideL = new THREE.Mesh(new THREE.BoxGeometry(0.25, h, d), MAT.darkWood);
      sideL.position.set(-w / 2 + 0.12, h / 2, 0);
      const sideR = sideL.clone();
      sideR.position.x = w / 2 - 0.12;
      const top = new THREE.Mesh(new THREE.BoxGeometry(w, 0.35, d), MAT.darkWood);
      top.position.set(0, h - 0.18, 0);

      // Glowing violet Hermes rune bar inside the open wardrobe
      const glowBar = new THREE.Mesh(
        new THREE.BoxGeometry(w - 0.5, 0.12, 0.12),
        new THREE.MeshBasicMaterial({ color: 0xc084fc })
      );
      glowBar.position.set(0, h - 0.42, 0);
      g.add(sideL, sideR, top, glowBar);
    }

    spScene.add(g);
    return g;
  }

  function addFlatpackPickup(id, name, x, yBase, z) {
    const pGroup = new THREE.Group();
    pGroup.position.set(x, yBase, z);

    const pallet = new THREE.Mesh(
      new THREE.BoxGeometry(1.7, 0.18, 1.7),
      new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.85 })
    );
    pallet.position.y = 0.09;
    pGroup.add(pallet);

    const crateGroup = new THREE.Group();
    crateGroup.position.set(0, 0.58, 0);

    const box = new THREE.Mesh(
      new THREE.BoxGeometry(1.3, 0.44, 0.98),
      new THREE.MeshStandardMaterial({
        color: 0xeab308,
        roughness: 0.42,
        emissive: 0xca8a04,
        emissiveIntensity: 0.42
      })
    );
    crateGroup.add(box);

    const blueBand = new THREE.Mesh(
      new THREE.BoxGeometry(1.32, 0.46, 0.34),
      new THREE.MeshStandardMaterial({
        color: 0x0058a3,
        emissive: 0x1d4ed8,
        emissiveIntensity: 0.45
      })
    );
    crateGroup.add(blueBand);

    pGroup.add(crateGroup);
    spScene.add(pGroup);

    flatpackPickups.push({
      id,
      name,
      x,
      y: yBase,
      z,
      crateGroup,
      cooldown: 0
    });
  }

  function makePriceTagTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 768;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 512, 768);

    ctx.fillStyle = '#e11d48';
    ctx.fillRect(0, 0, 512, 110);
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 44px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SPAWNING BIN #7', 256, 70);

    ctx.fillStyle = '#0f172a';
    ctx.font = '900 68px sans-serif';
    ctx.fillText('BLÅHAJ', 256, 215);

    ctx.fillStyle = '#334155';
    ctx.font = '700 28px sans-serif';
    ctx.fillText('Soft toy, shark, 100 cm (39 ¼")', 256, 275);

    ctx.fillStyle = '#ffda1a';
    ctx.fillRect(46, 325, 420, 145);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 6;
    ctx.strokeRect(46, 325, 420, 145);

    ctx.fillStyle = '#0f172a';
    ctx.font = '900 82px sans-serif';
    ctx.fillText('$29.99', 256, 424);

    ctx.fillStyle = '#0058a3';
    ctx.font = '900 34px monospace';
    ctx.fillText('ART. 303.735.88', 256, 545);

    ctx.fillStyle = '#0f172a';
    for (let x = 70; x < 440; x += 12) {
      const w = (x % 24 === 0) ? 7 : 3;
      ctx.fillRect(x, 580, w, 90);
    }

    ctx.font = '700 22px sans-serif';
    ctx.fillStyle = '#475569';
    ctx.fillText('SNIP TAG TO AWAKEN TRUE NAME ✂️', 256, 720);

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }

  function createMiniPlushShark(colorHex, bellyHex = 0xf8fafc, scale = 0.65) {
    const g = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.75 });
    const bellyMat = new THREE.MeshStandardMaterial({ color: bellyHex, roughness: 0.85 });
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3 });

    const torso = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 10), bodyMat);
    torso.scale.set(0.85, 0.72, 1.65);
    g.add(torso);

    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.41, 10, 8), bellyMat);
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

    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 6), eyeMat);
    eyeL.position.set(0.26, 0.08, 0.48);
    const eyeR = eyeL.clone();
    eyeR.position.x = -0.26;
    g.add(eyeL, eyeR);

    g.scale.setScalar(scale);
    return g;
  }

  // ==========================================================================
  // WING 1 (Z: +36 to -10, Y: +6.0m): THE GREAT WIRE SPAWNING BINS & ALTAR
  // ==========================================================================
  function buildWireSpawningBin(centerX, yBase, centerZ, isMainSpawnBin = true) {
    const binGroup = new THREE.Group();
    binGroup.position.set(centerX, yBase, centerZ);

    const wireMat = new THREE.MeshStandardMaterial({ color: 0xdbeafe, metalness: 0.75, roughness: 0.25 });
    const postMat = new THREE.MeshStandardMaterial({ color: 0x0058a3, metalness: 0.4, roughness: 0.45 });
    const yellowRimMat = new THREE.MeshStandardMaterial({
      color: 0xffda1a,
      roughness: 0.35,
      emissive: 0xffda1a,
      emissiveIntensity: 0.18
    });

    const binW = 5.4;
    const binD = 5.4;
    const binH = 2.2;
    const halfW = binW / 2;
    const halfD = binD / 2;

    const baseMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.8 });
    const baseMesh = new THREE.Mesh(new THREE.BoxGeometry(binW - 0.1, 0.28, binD - 0.1), baseMat);
    baseMesh.position.y = 0.14;
    binGroup.add(baseMesh);
    addCollider(centerX - halfW, centerX + halfW, centerZ - halfD, centerZ + halfD, yBase + 0.28, false, yBase, false);

    [[-halfW, -halfD], [halfW, -halfD], [-halfW, halfD], [halfW, halfD]].forEach(([cx, cz]) => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.2, binH + 0.3, 0.2), postMat);
      post.position.set(cx, (binH + 0.3) / 2, cz);
      binGroup.add(post);
    });

    for (let h = 0.35; h <= binH; h += 0.35) {
      const barBack = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, binW, 8), wireMat);
      barBack.rotation.z = Math.PI / 2;
      barBack.position.set(0, h, halfD);
      binGroup.add(barBack);

      [-halfW, halfW].forEach((xPos) => {
        const barSide = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, binD, 8), wireMat);
        barSide.rotation.x = Math.PI / 2;
        barSide.position.set(xPos, h, 0);
        binGroup.add(barSide);
      });

      if (!isMainSpawnBin || h > 1.85) {
        const barFront = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, binW, 8), wireMat);
        barFront.rotation.z = Math.PI / 2;
        barFront.position.set(0, h, -halfD);
        binGroup.add(barFront);
      } else {
        const segLen = (binW - 2.8) / 2;
        [-halfW + segLen / 2, halfW - segLen / 2].forEach((xSeg) => {
          const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, segLen, 8), wireMat);
          seg.rotation.z = Math.PI / 2;
          seg.position.set(xSeg, h, -halfD);
          binGroup.add(seg);
        });
      }
    }

    const rimSign = new THREE.Mesh(new THREE.BoxGeometry(binW + 0.1, 0.3, 0.14), yellowRimMat);
    rimSign.position.set(0, binH + 0.2, -halfD);
    binGroup.add(rimSign);

    const tagTex = makePriceTagTexture();
    const tagMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1.4, 2.1),
      new THREE.MeshBasicMaterial({ map: tagTex, side: THREE.DoubleSide })
    );
    tagMesh.position.set(halfW + 0.09, 1.48, -0.8);
    tagMesh.rotation.y = Math.PI / 2;
    binGroup.add(tagMesh);

    const plushPalette = [0x3b82f6, 0x2563eb, 0x60a5fa, 0xf472b6, 0xa855f7, 0x38bdf8];
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      if (isMainSpawnBin && Math.sin(angle) < -0.5) continue;
      const r = isMainSpawnBin ? (1.55 + (i % 2) * 0.45) : (0.6 + (i % 3) * 0.55);
      const sx = Math.cos(angle) * r;
      const sz = Math.sin(angle) * r;
      const shonk = createMiniPlushShark(plushPalette[i % plushPalette.length], 0xf8fafc, 0.62 + (i % 3) * 0.08);
      shonk.position.set(sx, 0.42 + (i % 3) * 0.22, sz);
      shonk.rotation.set((i % 2) * 0.25 - 0.12, angle + Math.PI * 0.5, ((i + 1) % 3 - 1) * 0.2);
      binGroup.add(shonk);
    }

    // Thick 0.6m wall colliders around the bin so player never clips through wire bars
    addCollider(centerX - halfW - 0.3, centerX + halfW + 0.3, centerZ + halfD - 0.3, centerZ + halfD + 0.3, yBase + binH, true, yBase, false);
    addCollider(centerX - halfW - 0.3, centerX - halfW + 0.3, centerZ - halfD, centerZ + halfD, yBase + binH, true, yBase, false);
    addCollider(centerX + halfW - 0.3, centerX + halfW + 0.3, centerZ - halfD, centerZ + halfD, yBase + binH, true, yBase, false);
    if (!isMainSpawnBin) {
      addCollider(centerX - halfW - 0.3, centerX + halfW + 0.3, centerZ - halfD - 0.3, centerZ - halfD + 0.3, yBase + binH, true, yBase, false);
    }

    spScene.add(binGroup);
  }

  function buildWing1SpawningNursery() {
    const Y = UPPER_FLOOR_Y;

    // Main Spawning Bin #7 at (0, 6.0, 26.0)
    buildWireSpawningBin(0.0, Y, 26.0, true);
    // Fellow Shark Wire Bin #8 at (9.8, 6.0, 25.0)
    buildWireSpawningBin(9.8, Y, 25.0, false);
    // Decorative Wire Bins #5 & #6 along back wall
    buildWireSpawningBin(-15.5, Y, 28.5, false);
    buildWireSpawningBin(16.8, Y, 28.5, false);

    // Candlelit Pillow-Fort Altar of the Sacred Scissors at (-9.8, 6.0, 25.0)
    const fort = new THREE.Group();
    fort.position.set(-9.8, Y, 25.0);

    const rug = new THREE.Mesh(
      new THREE.CylinderGeometry(3.4, 3.4, 0.06, 24),
      new THREE.MeshStandardMaterial({ color: 0x311042, roughness: 0.9 })
    );
    rug.position.y = 0.03;
    fort.add(rug);

    const altarBase = new THREE.Mesh(
      new THREE.BoxGeometry(2.0, 0.96, 1.3),
      new THREE.MeshStandardMaterial({ color: 0x1e1b4b, roughness: 0.6 })
    );
    altarBase.position.y = 0.48;
    fort.add(altarBase);
    addCollider(-9.8 - 1.1, -9.8 + 1.1, 25.0 - 0.75, 25.0 + 0.75, Y + 0.96, true, Y, false);

    const cloth = new THREE.Mesh(
      new THREE.BoxGeometry(2.06, 0.12, 1.36),
      new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.4, metalness: 0.3 })
    );
    cloth.position.y = 0.96;
    fort.add(cloth);

    sacredScissorsMesh = new THREE.Group();
    sacredScissorsMesh.position.set(0.0, 1.52, 0);
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xffd166,
      metalness: 0.85,
      roughness: 0.2,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.4
    });
    const blade1 = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.58, 6), goldMat);
    blade1.rotation.z = 0.28;
    const blade2 = blade1.clone();
    blade2.rotation.z = -0.28;
    sacredScissorsMesh.add(blade1, blade2);
    fort.add(sacredScissorsMesh);

    const signBoard = createHangingSignBoard(
      'ALTAR OF THE SACRED SCISSORS',
      'SNIP BARCODE TAG [E] · BOOK OF NEWLY NAMED SHARKS',
      4.8,
      1.2,
      '#3b0764',
      '#fde047',
      '#fde047'
    );
    signBoard.position.set(0, 2.85, 0);
    fort.add(signBoard);
    spScene.add(fort);

    // Overhead Welcome Sign above Wing 1
    const welcomeSign = createHangingSignBoard(
      'WING 1 · THE IKEA SPAWNING PITS OF ERF (ART. 303.735.88)',
      'FOLLOW THE YELLOW FLOOR ARROWS · HIDE BEHIND FURNITURE FROM ERF GUARDS!',
      12.4,
      2.5,
      '#0058a3',
      '#ffda1a',
      '#ffda1a'
    );
    welcomeSign.position.set(0, Y + 5.8, 17.0);
    spScene.add(welcomeSign);

    // Ingvar's Measuring Tape Station at (-12.5, 6.0, 10.0)
    const tapeDesk = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.95, 1.5), MAT.birch);
    tapeDesk.position.set(-12.5, Y + 0.48, 10.0);
    spScene.add(tapeDesk);
    addCollider(-12.5 - 1.35, -12.5 + 1.35, 10.0 - 0.8, 10.0 + 0.8, Y + 0.95, true, Y, false);

    const tapeReel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.42, 0.24, 18),
      new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.7, emissive: 0xf59e0b, emissiveIntensity: 0.35 })
    );
    tapeReel.position.set(-12.5, Y + 1.1, 10.0);
    spScene.add(tapeReel);

    const tapeSign = createHangingSignBoard(
      "INGVAR'S MEASURING TAPE STATION",
      'COLLECT BRASS TAPE & STARTER FLAT-PACK [E] 📏',
      4.4,
      1.1,
      '#0058a3',
      '#ffda1a'
    );
    tapeSign.position.set(-12.5, Y + 2.4, 10.0);
    spScene.add(tapeSign);

    // Hermes Fast-Warp Lantern for Returning Raiders at (14.5, 6.0, 14.0)
    const warpPedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.65, 0.8, 1.1, 16),
      new THREE.MeshStandardMaterial({ color: 0x3b0764, roughness: 0.4 })
    );
    warpPedestal.position.set(14.5, Y + 0.55, 14.0);
    spScene.add(warpPedestal);
    const warpOrb = new THREE.Mesh(
      new THREE.SphereGeometry(0.38, 14, 14),
      new THREE.MeshBasicMaterial({ color: 0xc084fc })
    );
    warpOrb.position.set(14.5, Y + 1.4, 14.0);
    spScene.add(warpOrb);
    const warpSign = createHangingSignBoard(
      'HERMES SHORTCUT LANTERN',
      'WARP TO ESCALATOR OR WAREHOUSE AISLE 14 [E] 🌀',
      4.4,
      1.1,
      '#1e1b4b',
      '#67e8f9',
      '#c084fc'
    );
    warpSign.position.set(14.5, Y + 2.5, 14.0);
    spScene.add(warpSign);
  }

  // ==========================================================================
  // WING 2 (Z: -10 to -115, Y: +6.0m): THE 400-ROOM SHOWROOM LABYRINTH
  // ==========================================================================
  function buildWing2ShowroomLabyrinth() {
    const Y = UPPER_FLOOR_Y;

    const wing2Sign = createHangingSignBoard(
      'WING 2 · THE WINDING 400-ROOM SHOWROOM LABYRINTH',
      'SNEAK PAST SILHOUETTED ERF SECURITY GUARDS · USE SOFAS & KALLAX SHELVES FOR COVER!',
      12.4,
      2.5,
      '#0058a3',
      '#ffda1a'
    );
    wing2Sign.position.set(0, Y + 5.8, -8.0);
    spScene.add(wing2Sign);

    // Labyrinth Partition Baffles forcing a winding S-curve through model rooms:
    // Baffle 1 at Z = -12: leaves East passage open (X = +6 to +17)
    addPartitionWall(-23.5, 5.0, -12.8, -11.6, Y, 4.4, MAT.partitionCream);
    // Baffle 2 at Z = -36: leaves West passage open (X = -18 to -6)
    addPartitionWall(-5.0, 23.5, -36.8, -35.6, Y, 4.4, MAT.partitionSlate);
    // Baffle 3 at Z = -64: leaves Center-West & Secret Wardrobe passage open (X = -15 to -3)
    addPartitionWall(-2.0, 23.5, -64.8, -63.6, Y, 4.4, MAT.partitionCream);
    // Baffle 4 at Z = -90: leaves East passage open (X = +5 to +18)
    addPartitionWall(-23.5, 4.0, -90.8, -89.6, Y, 4.4, MAT.partitionSlate);
    // Baffle 5 at Z = -112: funnels into Center Escalator Atrium (X = -7 to +7 open)
    addPartitionWall(-23.5, -7.5, -112.8, -111.6, Y, 4.4, MAT.wallBlue);
    addPartitionWall(7.5, 23.5, -112.8, -111.6, Y, 4.4, MAT.wallBlue);

    // Populate Showroom Rooms with rich 3D Furniture & Stealth Cover!
    // Sector 2A (Z: +6 to -12)
    placeKallaxShelf(-4.5, Y, 4.0, 0, 3.6, 2.4, 0.9);
    placeKallaxShelf(5.5, Y, 1.5, 0, 3.6, 2.4, 0.9);
    placeSofaVignette(-12.0, Y, -3.5, 0, MAT.sofaRed);
    placeMalmBedVignette(14.5, Y, 3.0, -Math.PI / 2);

    // Sector 2B (Z: -12 to -36, moving East -> West)
    placeSofaVignette(12.5, Y, -21.0, Math.PI, MAT.sofaTeal);
    placeKallaxShelf(2.5, Y, -24.0, Math.PI / 2, 3.8, 2.5, 0.9);
    placeKallaxShelf(-6.5, Y, -25.0, 0, 3.8, 2.5, 0.9);
    placeMalmBedVignette(-16.0, Y, -22.0, Math.PI / 2);
    addFlatpackPickup('fp_showroom_1', 'KLIPPAN & LACK Living Room Flat-Pack', -18.0, Y, -17.5);

    // Sector 2C (Z: -36 to -64, moving West -> Center-West)
    placeSofaVignette(-13.5, Y, -48.0, 0, MAT.sofaMustard);
    placeKallaxShelf(-3.5, Y, -49.0, 0, 3.8, 2.5, 0.9);
    placeKallaxShelf(6.0, Y, -48.0, Math.PI / 2, 3.8, 2.5, 0.9);
    placeMalmBedVignette(15.5, Y, -50.0, -Math.PI / 2);
    addFlatpackPickup('fp_showroom_2', 'MALM & BILLY Bedroom Flat-Pack', 16.0, Y, -57.5);

    // Sector 2D (Z: -64 to -90, moving West -> East)
    placeSofaVignette(-11.0, Y, -76.0, Math.PI, MAT.sofaNavy);
    placeKallaxShelf(-1.0, Y, -77.0, Math.PI / 2, 3.8, 2.5, 0.9);
    placeKallaxShelf(8.5, Y, -77.0, 0, 3.8, 2.5, 0.9);
    placeSofaVignette(16.5, Y, -78.0, -Math.PI / 2, MAT.sofaRed);

    // Sector 2E (Z: -90 to -112, moving East -> Center Escalator)
    placeKallaxShelf(10.5, Y, -100.0, 0, 3.8, 2.5, 0.9);
    placeKallaxShelf(-2.5, Y, -101.0, 0, 3.8, 2.5, 0.9);
    placeMalmBedVignette(-14.5, Y, -100.0, Math.PI / 2);

    // Winding Glowing Yellow Floor Arrow Path through Wing 1 & Wing 2!
    addArrowTrail([
      { x: 0.0, z: 21.0 },
      { x: 0.0, z: 8.0 },
      { x: 10.5, z: -4.0 },
      { x: 10.5, z: -18.0 },
      { x: -11.5, z: -29.0 },
      { x: -11.5, z: -43.0 },
      { x: -9.0, z: -68.0 },
      { x: 11.5, z: -83.0 },
      { x: 11.5, z: -96.0 },
      { x: 0.0, z: -108.0 },
      { x: -4.5, z: -119.0 }
    ], Y, 5.2, false);

    // 3 Patrolling Silhouetted Chubby Erf Mall-Cops in Wing 2
    createSilhouettedErfGuard({
      id: 'guard_w2_north',
      name: 'Officer Svensson (Showroom North)',
      y: Y,
      speed: 3.1,
      waypoints: [
        { x: -9.0, z: -2.0 },
        { x: 9.0, z: -2.0 },
        { x: 9.0, z: -9.0 },
        { x: -9.0, z: -9.0 }
      ]
    });

    createSilhouettedErfGuard({
      id: 'guard_w2_mid',
      name: 'Officer Lindqvist (Room 204 Patrol)',
      y: Y,
      speed: 3.4,
      waypoints: [
        { x: 11.0, z: -20.0 },
        { x: -11.0, z: -20.0 },
        { x: -11.0, z: -31.0 },
        { x: 11.0, z: -31.0 }
      ]
    });

    createSilhouettedErfGuard({
      id: 'guard_w2_south',
      name: 'Sergeant Brännström (Bedding & Wardrobes)',
      y: Y,
      speed: 3.5,
      waypoints: [
        { x: -10.0, z: -72.0 },
        { x: 12.0, z: -72.0 },
        { x: 12.0, z: -85.0 },
        { x: -10.0, z: -85.0 }
      ]
    });
  }

  // ==========================================================================
  // WING 3 (Z: -115 to -165, Y: +6.0m -> 0.0m): THE GREAT MOVING ESCALATOR ATRIUM
  // ==========================================================================
  function buildWing3EscalatorAtrium() {
    const atriumSign = createHangingSignBoard(
      'WING 3 · THE GREAT MOVING ESCALATOR ATRIUM',
      'RIDE THE LEFT DOWNWARD ESCALATOR TO LOWER MARKETPLACE & ROOM 404 (LEVEL 1)!',
      12.4,
      2.5,
      '#0058a3',
      '#ffda1a'
    );
    atriumSign.position.set(0, UPPER_FLOOR_Y + 5.8, -118.0);
    spScene.add(atriumSign);

    const escLenZ = Math.abs(ESCALATOR_Z_END - ESCALATOR_Z_START); // 36m
    const escDropY = UPPER_FLOOR_Y - LOWER_FLOOR_Y; // 6.0m
    const slopeAngle = Math.atan2(escDropY, escLenZ);
    const diagLen = Math.hypot(escLenZ, escDropY);
    const midZ = (ESCALATOR_Z_START + ESCALATOR_Z_END) / 2;
    const midY = (UPPER_FLOOR_Y + LOWER_FLOOR_Y) / 2;

    // Build Left (DOWNWARD, X = -4.5) & Right (UPWARD, X = +4.5) Escalator Trusses
    [
      { cx: -4.5, dir: -1, label: '▼ DOWN TO LEVEL 1 (MARKETPLACE & WAREHOUSE)' },
      { cx: 4.5, dir: 1, label: '▲ UP TO LEVEL 2 (SPAWNING BINS & SHOWROOM)' }
    ].forEach((esc) => {
      const trussGroup = new THREE.Group();
      trussGroup.position.set(esc.cx, midY, midZ);
      trussGroup.rotation.x = -slopeAngle;

      // Steel under-truss
      const truss = new THREE.Mesh(
        new THREE.BoxGeometry(3.4, 0.65, diagLen + 1.0),
        MAT.chrome
      );
      truss.position.y = -0.35;
      trussGroup.add(truss);

      // Left & Right Glass Balustrades + Glowing Yellow/Cyan Handrails
      [-1.65, 1.65].forEach((bx) => {
        const glass = new THREE.Mesh(
          new THREE.BoxGeometry(0.12, 1.05, diagLen),
          new THREE.MeshStandardMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.42 })
        );
        glass.position.set(bx, 0.52, 0);
        trussGroup.add(glass);

        const handrail = new THREE.Mesh(
          new THREE.BoxGeometry(0.22, 0.14, diagLen + 0.6),
          esc.dir < 0 ? MAT.ikeaYellow : MAT.ikeaBlue
        );
        handrail.position.set(bx, 1.08, 0);
        trussGroup.add(handrail);
      });

      spScene.add(trussGroup);

      // Side balustrade colliders so you stay centered on the escalator steps
      addCollider(esc.cx - 1.85, esc.cx - 1.45, ESCALATOR_Z_END, ESCALATOR_Z_START, UPPER_FLOOR_Y + 1.5, true, 0, false);
      addCollider(esc.cx + 1.45, esc.cx + 1.85, ESCALATOR_Z_END, ESCALATOR_Z_START, UPPER_FLOOR_Y + 1.5, true, 0, false);

      // 24 Animated Moving Escalator Steps!
      const numSteps = 24;
      const stepMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.7, roughness: 0.35 });
      for (let i = 0; i < numSteps; i++) {
        const stepMesh = new THREE.Mesh(new THREE.BoxGeometry(2.85, 0.24, 1.15), stepMat);
        // Yellow safety cleats on step edge
        const cleat = new THREE.Mesh(new THREE.BoxGeometry(2.86, 0.05, 0.12), MAT.ikeaYellow);
        cleat.position.set(0, 0.11, -0.5);
        stepMesh.add(cleat);

        spScene.add(stepMesh);
        escalatorStepMeshes.push({
          mesh: stepMesh,
          cx: esc.cx,
          dir: esc.dir,
          phase: i / numSteps
        });
      }
    });

    // Block off the open atrium drop on either side of the escalators at Z = -120 so players don't fall off Upper Level 2
    addPartitionWall(-23.5, -6.4, -120.6, -119.4, UPPER_FLOOR_Y, 1.8, MAT.ikeaBlue);
    addPartitionWall(-2.6, 2.6, -120.6, -119.4, UPPER_FLOOR_Y, 1.8, MAT.ikeaBlue);
    addPartitionWall(6.4, 23.5, -120.6, -119.4, UPPER_FLOOR_Y, 1.8, MAT.ikeaBlue);

    // Surreal Floating Upside-Down Furniture suspended in the Escalator Atrium Chasm!
    [
      { x: -14.0, y: 8.5, z: -132.0 },
      { x: 14.0, y: 9.2, z: -138.0 },
      { x: -13.0, y: 7.8, z: -148.0 },
      { x: 13.5, y: 8.4, z: -150.0 }
    ].forEach((fp, idx) => {
      const floatGroup = new THREE.Group();
      floatGroup.position.set(fp.x, fp.y, fp.z);
      floatGroup.rotation.z = Math.PI; // Upside down!

      const sofa = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.9, 1.2), idx % 2 === 0 ? MAT.sofaRed : MAT.sofaMustard);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 12), MAT.lampGlow);
      lamp.position.set(0, 1.4, 0);
      floatGroup.add(sofa, lamp);
      spScene.add(floatGroup);
      surrealFloatingProps.push({ mesh: floatGroup, baseY: fp.y, phase: idx * 1.4 });
    });
  }

  // ==========================================================================
  // WING 4 (Z: -165 to -255, Y: 0.0m): ROOM 404 "LÄBYRINT" — SURREAL WARDROBE MAZE
  // ==========================================================================
  function buildWing4SurrealMaze() {
    const Y = LOWER_FLOOR_Y;

    const surrealSign = createHangingSignBoard(
      'WING 4 · ROOM 404: LÄBYRINT (SURREAL DISPLAY SECTOR)',
      'BEWARE FALSE ARROWS! LOOK FOR OPEN PAX WARDROBES WITH PURPLE HERMES GLOW!',
      12.4,
      2.5,
      '#3b0764',
      '#fde047',
      '#c084fc'
    );
    surrealSign.position.set(0, Y + 5.8, -165.0);
    spScene.add(surrealSign);

    // Surreal Upside-Down & Sideways Bedroom Vignettes bolted to the high walls & ceiling!
    for (let z = -175; z >= -245; z -= 22) {
      const ceilRoom = placeMalmBedVignette((z % 44 === 0) ? -10 : 10, Y + 9.2, z, 0, false);
      ceilRoom.rotation.z = Math.PI; // Hanging upside down from ceiling!
    }

    // Row 1 of Towering PAX Wardrobes at Z = -182:
    // Open walkthrough wardrobe is at X = -9.0!
    addPartitionWall(-23.5, -11.0, -182.8, -181.2, Y, 4.2, MAT.darkWood);
    placePaxWardrobe(-9.0, Y, -182.0, 3.6, 1.4, 4.2, true); // OPEN SECRET PASSAGE!
    addPartitionWall(-7.0, 23.5, -182.8, -181.2, Y, 4.2, MAT.darkWood);

    // Row 2 of Towering PAX Wardrobes at Z = -208:
    // Open walkthrough wardrobe is at X = +9.0!
    addPartitionWall(-23.5, 7.0, -208.8, -207.2, Y, 4.2, MAT.darkWood);
    placePaxWardrobe(9.0, Y, -208.0, 3.6, 1.4, 4.2, true); // OPEN SECRET PASSAGE!
    addPartitionWall(11.0, 23.5, -208.8, -207.2, Y, 4.2, MAT.darkWood);

    // Row 3 of Towering PAX Wardrobes at Z = -234:
    // Open walkthrough wardrobe is at X = 0.0 (Center)!
    addPartitionWall(-23.5, -2.2, -234.8, -233.2, Y, 4.2, MAT.darkWood);
    placePaxWardrobe(0.0, Y, -234.0, 4.0, 1.4, 4.2, true); // OPEN SECRET PASSAGE!
    addPartitionWall(2.2, 23.5, -234.8, -233.2, Y, 4.2, MAT.darkWood);

    // Cover furniture & Flat-Pack Stashes inside the Surreal Maze
    placeKallaxShelf(-2.0, Y, -173.0, 0, 3.8, 2.5, 0.9);
    placeSofaVignette(11.0, Y, -174.0, Math.PI, MAT.sofaTeal);
    addFlatpackPickup('fp_surreal_1', 'PAX & KALLAX Surreal Labyrinth Flat-Pack', 16.5, Y, -175.0);

    placeKallaxShelf(-9.0, Y, -195.0, Math.PI / 2, 3.8, 2.5, 0.9);
    placeKallaxShelf(2.0, Y, -195.0, 0, 3.8, 2.5, 0.9);
    placeSofaVignette(-15.5, Y, -198.0, 0, MAT.sofaMustard);
    addFlatpackPickup('fp_surreal_2', 'STRANDMON & FADO Astral Flat-Pack', -18.0, Y, -202.0);

    placeKallaxShelf(8.5, Y, -221.0, 0, 3.8, 2.5, 0.9);
    placeKallaxShelf(-4.5, Y, -221.0, Math.PI / 2, 3.8, 2.5, 0.9);
    placeMalmBedVignette(-15.0, Y, -222.0, Math.PI / 2);

    // True Yellow Floor Arrows through the Secret Open PAX Wardrobes
    addArrowTrail([
      { x: -4.5, z: -158.0 },
      { x: -9.0, z: -178.0 },
      { x: -9.0, z: -188.0 },
      { x: 9.0, z: -202.0 },
      { x: 9.0, z: -214.0 },
      { x: 0.0, z: -229.0 },
      { x: 0.0, z: -252.0 }
    ], Y, 5.2, false);

    // Surreal Purple Glitch Decoy Arrows leading toward dead-end corners!
    addArrowTrail([
      { x: 0.0, z: -166.0 },
      { x: 14.0, z: -176.0 }
    ], Y, 4.5, true);
    addArrowTrail([
      { x: -9.0, z: -188.0 },
      { x: -16.0, z: -202.0 }
    ], Y, 4.5, true);

    // 2 Patrolling Silhouetted Erf Guards in Wing 4
    createSilhouettedErfGuard({
      id: 'guard_w4_1',
      name: 'Officer Holm (Room 404 North)',
      y: Y,
      speed: 3.3,
      waypoints: [
        { x: -9.0, z: -191.0 },
        { x: 9.0, z: -191.0 },
        { x: 9.0, z: -201.0 },
        { x: -9.0, z: -201.0 }
      ]
    });

    createSilhouettedErfGuard({
      id: 'guard_w4_2',
      name: 'Officer Ekström (Room 404 South)',
      y: Y,
      speed: 3.5,
      waypoints: [
        { x: 9.0, z: -216.0 },
        { x: -9.0, z: -216.0 },
        { x: -9.0, z: -227.0 },
        { x: 9.0, z: -227.0 }
      ]
    });
  }

  // ==========================================================================
  // WING 5 (Z: -255 to -340, Y: 0.0m): SELF-SERVE FLAT-PACK WAREHOUSE (AISLES 12–18)
  // ==========================================================================
  function buildWing5SelfServeWarehouse() {
    const Y = LOWER_FLOOR_Y;

    const whSign = createHangingSignBoard(
      'WING 5 · SELF-SERVE FLAT-PACK WAREHOUSE (AISLES 12–18)',
      'COLLECT GLOWING 3D SKÄRHAJ FLAT-PACK KITS [E] ON PALLETS · WATCH FOR PATROL GUARDS!',
      12.4,
      2.5,
      '#0058a3',
      '#ffda1a'
    );
    whSign.position.set(0, Y + 6.2, -256.0);
    spScene.add(whSign);

    const orangeSteel = new THREE.MeshStandardMaterial({ color: 0xea580c, metalness: 0.55, roughness: 0.4 });
    const cardboardMat = new THREE.MeshStandardMaterial({ color: 0xd6b384, roughness: 0.8 });

    // 4 Towering Columns of 10.5m-tall Heavy Steel Pallet Racks across Z = -265 to -332
    const rackColumnsX = [-16.5, -6.8, 6.8, 16.5];
    const rackZRows = [-268.0, -282.0, -296.0, -310.0, -324.0];

    rackColumnsX.forEach((rx) => {
      rackZRows.forEach((rz) => {
        const rack = new THREE.Group();
        rack.position.set(rx, Y, rz);

        const rackW = 2.8;
        const rackD = 8.4;
        const rackH = 10.2;

        [[-rackW / 2, -rackD / 2], [rackW / 2, -rackD / 2], [-rackW / 2, rackD / 2], [rackW / 2, rackD / 2]].forEach(([ux, uz]) => {
          const col = new THREE.Mesh(new THREE.BoxGeometry(0.22, rackH, 0.22), MAT.ikeaBlue);
          col.position.set(ux, rackH / 2, uz);
          rack.add(col);
        });

        [2.2, 4.8, 7.4].forEach((beamY) => {
          const beam = new THREE.Mesh(new THREE.BoxGeometry(rackW + 0.08, 0.22, rackD + 0.08), orangeSteel);
          beam.position.y = beamY;
          rack.add(beam);

          const stack = new THREE.Mesh(new THREE.BoxGeometry(rackW - 0.3, 1.35, rackD - 0.5), cardboardMat);
          stack.position.y = beamY + 0.78;
          rack.add(stack);

          const stripe = new THREE.Mesh(new THREE.BoxGeometry(rackW - 0.24, 0.24, rackD - 0.44), MAT.ikeaYellow);
          stripe.position.y = beamY + 0.78;
          rack.add(stripe);
        });

        spScene.add(rack);
        addCollider(rx - rackW / 2, rx + rackW / 2, rz - rackD / 2, rz + rackD / 2, Y + rackH, true, Y, true);
      });
    });

    // 6 Interactive 3D SKÄRHAJ Flat-Pack Kit Pickups across Warehouse Aisles 12–18
    const whPickups = [
      { id: 'fp_aisle_1', name: 'GOLVHAJ & VÄGGHAJ Starter Flat-Pack', x: -2.8, z: -268.0 },
      { id: 'fp_aisle_2', name: 'KALLAX-HAJ & POÄNG Modular Flat-Pack', x: 2.8, z: -282.0 },
      { id: 'fp_aisle_3', name: 'TAKHAJ Roof & DÖRRHAJ Arch Flat-Pack', x: -11.6, z: -290.0 },
      { id: 'fp_aisle_4', name: 'GROTTHAJ Sea-Cave & MALM Flat-Pack', x: 11.6, z: -296.0 },
      { id: 'fp_aisle_5', name: 'SKÄRHAJ Grand Conservatory Flat-Pack', x: -2.8, z: -310.0 },
      { id: 'fp_aisle_6', name: 'SKÄRHAJ Master Archodect Flat-Pack', x: 2.8, z: -324.0 }
    ];
    whPickups.forEach((p) => addFlatpackPickup(p.id, p.name, p.x, Y, p.z));

    // Yellow Floor Arrows straight down Center Warehouse Aisle 14 to Wing 6
    addArrowTrail([
      { x: 0.0, z: -256.0 },
      { x: 0.0, z: -342.0 },
      { x: 0.0, z: -370.0 }
    ], Y, 6.5, false);

    // 2 Patrolling Silhouetted Erf Warehouse Guards
    createSilhouettedErfGuard({
      id: 'guard_w5_1',
      name: 'Warehouse Foreman Lindberg (Aisle 14 North)',
      y: Y,
      speed: 3.6,
      waypoints: [
        { x: -11.5, z: -275.0 },
        { x: 11.5, z: -275.0 },
        { x: 11.5, z: -289.0 },
        { x: -11.5, z: -289.0 }
      ]
    });

    createSilhouettedErfGuard({
      id: 'guard_w5_2',
      name: 'Warehouse Guard Dahl (Aisle 14 South)',
      y: Y,
      speed: 3.7,
      waypoints: [
        { x: 11.5, z: -303.0 },
        { x: -11.5, z: -303.0 },
        { x: -11.5, z: -317.0 },
        { x: 11.5, z: -317.0 }
      ]
    });
  }

  // ==========================================================================
  // WING 6 (Z: -340 to -390, Y: 0.0m): BISTRO & HERMES ESCAPE PORTAL
  // ==========================================================================
  function buildWing6BistroAndEscapePortal() {
    const Y = LOWER_FLOOR_Y;

    // 1. Midnight Swedish Bistro Counter at (10.5, 0, -356.0)
    const bistro = new THREE.Group();
    bistro.position.set(10.5, Y, -356.0);

    const counter = new THREE.Mesh(new THREE.BoxGeometry(5.6, 1.15, 2.2), MAT.ikeaBlue);
    counter.position.y = 0.58;
    bistro.add(counter);

    const counterTop = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.14, 2.4), MAT.ikeaYellow);
    counterTop.position.y = 1.18;
    bistro.add(counterTop);
    addCollider(10.5 - 2.9, 10.5 + 2.9, -356.0 - 1.2, -356.0 + 1.2, Y + 1.2, true, Y, false);

    const tray = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.7, 0.12, 18), MAT.chrome);
    tray.position.set(0, 1.3, 0);
    bistro.add(tray);

    const meatballMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.6 });
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const mb = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 10), meatballMat);
      mb.position.set(Math.cos(angle) * 0.32, 1.4, Math.sin(angle) * 0.32);
      bistro.add(mb);
    }

    const bistroSign = createHangingSignBoard(
      'MIDNIGHT SWEDISH BISTRO',
      'HOT KÖTTBULLAR & LINGONBERRY JAM [E] 🧆',
      5.6,
      1.3,
      '#0058a3',
      '#ffda1a'
    );
    bistroSign.position.set(0, 2.95, 0);
    bistro.add(bistroSign);
    spScene.add(bistro);

    // 2. Hermes's Shimmering Cross-Ocean Between Portal to Blåhaj Island at (0, 0, -376.0)
    const portalGroup = new THREE.Group();
    portalGroup.position.set(0, Y, -376.0);

    const plinth = new THREE.Mesh(
      new THREE.CylinderGeometry(3.8, 4.2, 0.36, 28),
      new THREE.MeshStandardMaterial({ color: 0x1e1b4b, metalness: 0.4, roughness: 0.4 })
    );
    plinth.position.y = 0.18;
    portalGroup.add(plinth);
    addCollider(-3.8, 3.8, -376.0 - 3.8, -376.0 + 3.8, Y + 0.36, false, Y, false);

    portalRingOuter = new THREE.Mesh(
      new THREE.TorusGeometry(2.65, 0.24, 16, 40),
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 0.85,
        metalness: 0.6,
        roughness: 0.2
      })
    );
    portalRingOuter.position.y = 2.95;
    portalGroup.add(portalRingOuter);

    portalRingInner = new THREE.Mesh(
      new THREE.TorusGeometry(2.2, 0.14, 14, 36),
      new THREE.MeshStandardMaterial({
        color: 0xc084fc,
        emissive: 0x9333ea,
        emissiveIntensity: 0.9
      })
    );
    portalRingInner.position.y = 2.95;
    portalGroup.add(portalRingInner);

    portalVortexMesh = new THREE.Mesh(
      new THREE.CircleGeometry(2.12, 32),
      new THREE.MeshBasicMaterial({
        color: 0x67e8f9,
        transparent: true,
        opacity: 0.58,
        side: THREE.DoubleSide
      })
    );
    portalVortexMesh.position.y = 2.95;
    portalGroup.add(portalVortexMesh);

    const portalBanner = createHangingSignBoard(
      'HERMES BETWEEN PORTAL → BLÅHAJ ISLAND',
      'STEP THROUGH OR PRESS [E] WITH YOUR SKÄRHAJ FLAT-PACK KITS! 🌀🦈',
      9.2,
      2.0,
      '#1e1b4b',
      '#67e8f9',
      '#c084fc'
    );
    portalBanner.position.set(0, 6.2, 0);
    portalGroup.add(portalBanner);

    const portalLight = new THREE.PointLight(0x38bdf8, 2.4, 22.0);
    portalLight.position.set(0, 3.2, 1.8);
    portalGroup.add(portalLight);

    hermesGuideMesh = createMiniPlushShark(0x7c3aed, 0xf3e8ff, 1.25);
    hermesGuideMesh.position.set(-3.6, 0.9, 1.2);
    hermesGuideMesh.rotation.y = 0.45;
    portalGroup.add(hermesGuideMesh);

    spScene.add(portalGroup);
  }

  // ==========================================================================
  // BUILD FULL 426m MEGASTORE SCENE
  // ==========================================================================
  async function build() {
    if (isBuilt && spScene) return spScene;

    initMaterials();

    spScene = new THREE.Scene();
    spScene.background = new THREE.Color(0x050d1e);
    spScene.fog = new THREE.FogExp2(0x050d1e, 0.0085);

    colliders.length = 0;
    flatpackPickups.length = 0;
    securityGuards.length = 0;
    escalatorStepMeshes.length = 0;
    surrealFloatingProps.length = 0;
    furthestZReached = 26.0;

    // Nighttime Megastore Lighting
    spScene.add(new THREE.AmbientLight(0x93c5fd, 0.72));
    spScene.add(new THREE.HemisphereLight(0x60a5fa, 0x0f172a, 0.68));
    const mainDir = new THREE.DirectionalLight(0xe0f2fe, 0.75);
    mainDir.position.set(14, 28, 18);
    spScene.add(mainDir);

    // 1. Upper Level 2 Floor Deck (Z: +36 down to -120, Y = +6.0m)
    const upperLen = 36.0 - (-120.0); // 156m
    const upperCenterZ = (36.0 + (-120.0)) / 2; // -42.0
    const upperFloor = new THREE.Mesh(
      new THREE.BoxGeometry(STORE_HALF_W * 2, 0.5, upperLen),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.42, metalness: 0.12 })
    );
    upperFloor.position.set(0, UPPER_FLOOR_Y - 0.25, upperCenterZ);
    spScene.add(upperFloor);

    // 2. Lower Level 1 Floor Deck (Z: -115 down to -390, Y = 0.0m)
    const lowerLen = -115.0 - (-390.0); // 275m
    const lowerCenterZ = (-115.0 + (-390.0)) / 2; // -252.5
    const lowerFloor = new THREE.Mesh(
      new THREE.BoxGeometry(STORE_HALF_W * 2, 0.5, lowerLen),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.38, metalness: 0.15 })
    );
    lowerFloor.position.set(0, LOWER_FLOOR_Y - 0.25, lowerCenterZ);
    spScene.add(lowerFloor);

    // 3. Outer Iconic Blue-and-Yellow IKEA Megastore Perimeter Walls (Z: +36 to -390)
    const totalLen = STORE_MAX_Z - STORE_MIN_Z; // 426m
    const totalCenterZ = (STORE_MAX_Z + STORE_MIN_Z) / 2;
    const wallHeight = 16.5;

    [-STORE_HALF_W, STORE_HALF_W].forEach((wx) => {
      const wMesh = new THREE.Mesh(new THREE.BoxGeometry(0.8, wallHeight, totalLen), MAT.wallBlue);
      wMesh.position.set(wx, wallHeight / 2 - 0.5, totalCenterZ);
      spScene.add(wMesh);

      const stripeUpper = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.55, totalLen), MAT.ikeaYellow);
      stripeUpper.position.set(wx, 10.2, totalCenterZ);
      const stripeLower = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.55, totalLen), MAT.ikeaYellow);
      stripeLower.position.set(wx, 4.2, totalCenterZ);
      spScene.add(stripeUpper, stripeLower);
    });

    [STORE_MIN_Z, STORE_MAX_Z].forEach((wz) => {
      const wMesh = new THREE.Mesh(new THREE.BoxGeometry(STORE_HALF_W * 2, wallHeight, 0.8), MAT.wallBlue);
      wMesh.position.set(0, wallHeight / 2 - 0.5, wz);
      spScene.add(wMesh);
    });

    // Ceiling rafters & dimmed night-shift fluorescent strips every 14m
    const rafterMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.6 });
    const tubeMat = new THREE.MeshBasicMaterial({ color: 0xe0f2fe });
    for (let z = 30; z >= -382; z -= 14) {
      const rafter = new THREE.Mesh(new THREE.BoxGeometry(STORE_HALF_W * 2, 0.3, 0.4), rafterMat);
      rafter.position.set(0, 15.2, z);
      const tube = new THREE.Mesh(new THREE.BoxGeometry(8.5, 0.1, 0.25), tubeMat);
      tube.position.set(0, 15.0, z);
      spScene.add(rafter, tube);
    }

    // Build all 6 Megastore Wings
    buildWing1SpawningNursery();
    buildWing2ShowroomLabyrinth();
    buildWing3EscalatorAtrium();
    buildWing4SurrealMaze();
    buildWing5SelfServeWarehouse();
    buildWing6BistroAndEscapePortal();

    isBuilt = true;
    return spScene;
  }

  // ==========================================================================
  // FLOOR HEIGHT & ESCALATOR SLOPE INTERPOLATION
  // ==========================================================================
  function getBaseFloorHeight(x, z) {
    // Upper Level 2 (Z >= -120)
    if (z >= ESCALATOR_Z_START) {
      return UPPER_FLOOR_Y;
    }
    // Escalator Ramp Zone (-156 <= Z < -120)
    if (z >= ESCALATOR_Z_END && z < ESCALATOR_Z_START) {
      // On Left (-4.5) or Right (+4.5) Escalator channels
      if (Math.abs(x - (-4.5)) <= 1.75 || Math.abs(x - 4.5) <= 1.75) {
        const t = (ESCALATOR_Z_START - z) / (ESCALATOR_Z_START - ESCALATOR_Z_END);
        return UPPER_FLOOR_Y * (1.0 - t) + LOWER_FLOOR_Y * t;
      }
      return LOWER_FLOOR_Y;
    }
    // Lower Level 1 (Z < -156)
    return LOWER_FLOOR_Y;
  }

  function getFloorHeight(x, z, currentY = 0) {
    let highest = getBaseFloorHeight(x, z);
    for (let i = 0; i < colliders.length; i++) {
      const c = colliders[i];
      if (!c.solid && x >= c.minX && x <= c.maxX && z >= c.minZ && z <= c.maxZ) {
        if (c.topY > highest && currentY >= c.topY - 0.85) {
          highest = c.topY;
        }
      }
    }
    return highest;
  }

  // ==========================================================================
  // ROCK-SOLID CIRCLE-VS-AABB COLLISION & CAMERA CLIPPING PREVENTION
  // ==========================================================================
  function resolveMove(curPos, nextPos, isGrounded = true, radius = 0.95) {
    // Enforce generous shark snout/tail clearance (min 0.95m from walls & furniture!)
    const effRadius = Math.max(0.95, radius || 0.95);
    const minRoomX = -STORE_HALF_W + effRadius + 0.45;
    const maxRoomX = STORE_HALF_W - effRadius - 0.45;
    const minRoomZ = STORE_MIN_Z + effRadius + 0.45;
    const maxRoomZ = STORE_MAX_Z - effRadius - 0.45;

    let rx = Math.max(minRoomX, Math.min(maxRoomX, nextPos.x));
    let rz = Math.max(minRoomZ, Math.min(maxRoomZ, nextPos.z));
    const py = typeof curPos.y === 'number' ? curPos.y : getBaseFloorHeight(rx, rz);

    // 3-Pass iterative circle-vs-AABB pushout so corners and thin partitions never allow clipping
    for (let pass = 0; pass < 3; pass++) {
      for (let i = 0; i < colliders.length; i++) {
        const c = colliders[i];
        if (!c.solid) continue;
        if (py >= c.topY - 0.25 || py + 1.6 < c.minY) continue;

        const closestX = Math.max(c.minX, Math.min(c.maxX, rx));
        const closestZ = Math.max(c.minZ, Math.min(c.maxZ, rz));
        const dx = rx - closestX;
        const dz = rz - closestZ;
        const distSq = dx * dx + dz * dz;

        if (distSq < effRadius * effRadius) {
          if (distSq > 0.00001) {
            const dist = Math.sqrt(distSq);
            const push = effRadius - dist;
            rx += (dx / dist) * push;
            rz += (dz / dist) * push;
          } else {
            // Center is inside box: push out along nearest face
            const pLeft = Math.abs(rx - (c.minX - effRadius));
            const pRight = Math.abs((c.maxX + effRadius) - rx);
            const pFront = Math.abs(rz - (c.minZ - effRadius));
            const pBack = Math.abs((c.maxZ + effRadius) - rz);
            const m = Math.min(pLeft, pRight, pFront, pBack);
            if (m === pLeft) rx = c.minX - effRadius;
            else if (m === pRight) rx = c.maxX + effRadius;
            else if (m === pFront) rz = c.minZ - effRadius;
            else rz = c.maxZ + effRadius;
          }
        }
      }
      rx = Math.max(minRoomX, Math.min(maxRoomX, rx));
      rz = Math.max(minRoomZ, Math.min(maxRoomZ, rz));
    }

    return { x: rx, z: rz };
  }

  function getActiveCheckpoint() {
    let best = CHECKPOINTS[0];
    for (let i = 0; i < CHECKPOINTS.length; i++) {
      if (furthestZReached <= CHECKPOINTS[i].maxZ) {
        best = CHECKPOINTS[i];
      }
    }
    return best;
  }

  function getSectorTitle(z) {
    if (z > -10.0) return 'Wing 1 · IKEA Spawning Pits Nursery (Wire Bin #303.735.88 · Level 2) ✂️🦈';
    if (z > -115.0) return 'Wing 2 · The 400-Room Showroom Labyrinth (Sneak Past Erf Guards!) 🛋️🔦';
    if (z > -162.0) return 'Wing 3 · The Great Moving Escalator Atrium (Level 2 → Level 1) 🎢✨';
    if (z > -254.0) return 'Wing 4 · Room 404: LÄBYRINT (Surreal Upside-Down & Wardrobe Maze) 🚪🌀';
    if (z > -340.0) return 'Wing 5 · Self-Serve Flat-Pack Warehouse (Aisles 12–18 · SKÄRHAJ Kits) 📦🔧';
    return 'Wing 6 · Midnight Swedish Bistro & Hermes Escape Portal to Blåhaj Island 🧆🌀';
  }

  function getInteractables(playerPos) {
    if (!playerPos) return [];
    const items = [];
    const py = playerPos.y || 0;

    // 1. Altar of the Sacred Scissors (-9.8, 6.0, 25.0)
    if (Math.abs(py - UPPER_FLOOR_Y) < 2.5) {
      const dAltar = Math.hypot(playerPos.x - (-9.8), playerPos.z - 25.0);
      if (dAltar < 4.2) {
        items.push({
          kind: 'spawning_altar_detag',
          dist: dAltar,
          prompt: '✂️ Altar of the Sacred Scissors: Rite of Detagging & Book of Named Sharks [E]'
        });
      }

      // 2. Wire Spawning Bin #8 Fellow Shark Liberation (9.8, 6.0, 25.0)
      const dBin = Math.hypot(playerPos.x - 9.8, playerPos.z - 25.0);
      if (dBin < 4.5) {
        items.push({
          kind: 'spawning_liberate_shark',
          dist: dBin,
          prompt: '✂️🦈 Snip Fellow Shark’s Barcode Tag in Wire Bin #303.735.88 (+1 Flat-Pack Kit) [E]'
        });
      }

      // 3. Ingvar's Measuring Tape Station (-12.5, 6.0, 10.0)
      const dTape = Math.hypot(playerPos.x - (-12.5), playerPos.z - 10.0);
      if (dTape < 3.8) {
        items.push({
          kind: 'spawning_pickup_tape',
          dist: dTape,
          prompt: '📏📦 Collect Ingvar’s Brass Measuring Tape & Showroom Flat-Pack Kit [E]'
        });
      }

      // 4. Hermes Shortcut Warp Lantern (14.5, 6.0, 14.0)
      const dWarp = Math.hypot(playerPos.x - 14.5, playerPos.z - 14.0);
      if (dWarp < 4.0) {
        items.push({
          kind: 'spawning_hermes_shortcut',
          dist: dWarp,
          prompt: '🌀🔦 Hermes Shortcut Lantern: Fast-Warp to Escalator Atrium or Warehouse Aisle 14 [E]'
        });
      }
    }

    // 5. 3D SKÄRHAJ Flat-Pack Kit Pickups across Showroom, Surreal Maze & Warehouse
    for (let i = 0; i < flatpackPickups.length; i++) {
      const fp = flatpackPickups[i];
      if (fp.cooldown > 0) continue;
      if (Math.abs(py - fp.y) > 2.2) continue;
      const dFp = Math.hypot(playerPos.x - fp.x, playerPos.z - fp.z);
      if (dFp < 3.4) {
        items.push({
          kind: 'spawning_pickup_flatpack',
          pickupId: fp.id,
          pickupName: fp.name,
          dist: dFp,
          prompt: `📦🔧 Pick Up ${fp.name} (+1 SKÄRHAJ Flat-Pack Kit & Supplies) [E]`
        });
      }
    }

    // 6. Midnight Swedish Bistro Steam Counter (10.5, 0, -356.0)
    if (Math.abs(py - LOWER_FLOOR_Y) < 2.5) {
      const dBistro = Math.hypot(playerPos.x - 10.5, playerPos.z - (-356.0));
      if (dBistro < 4.5) {
        items.push({
          kind: 'spawning_bistro_feast',
          dist: dBistro,
          prompt: '🧆✨ Grab Midnight Spawning-Pit Köttbullar & Lingonberry Jam (+2 Köttbullar) [E]'
        });
      }

      // 7. Hermes's Shimmering Between Portal to Blåhaj Island (0, 0, -376.0)
      const dPortal = Math.hypot(playerPos.x - 0.0, playerPos.z - (-376.0));
      if (dPortal < 5.2) {
        items.push({
          kind: 'spawning_exit_portal',
          dist: dPortal,
          prompt: '🌀🦈 Step Through Hermes’s Between Portal to Blåhaj Island (With Your IKEA Kits!) [E]'
        });
      }
    }

    return items;
  }

  function collectFlatpackPickup(pickupId) {
    const fp = flatpackPickups.find((p) => p.id === pickupId);
    if (!fp || fp.cooldown > 0) return null;
    fp.cooldown = 18.0;
    if (fp.crateGroup) fp.crateGroup.visible = false;
    return fp;
  }

  // ==========================================================================
  // REAL-TIME UPDATE LOOP (Escalator Conveyor, Guard Patrols & Spotlights)
  // ==========================================================================
  function update(dt, elapsed, playerPos) {
    if (!isActive || !spScene) return;

    if (spotlightAlertCooldown > 0) {
      spotlightAlertCooldown = Math.max(0, spotlightAlertCooldown - dt);
    }

    if (playerPos && typeof playerPos.z === 'number') {
      if (playerPos.z < furthestZReached) {
        furthestZReached = playerPos.z;
      }

      // Automatic Moving Escalator Step Drift when standing on the Left (Down) or Right (Up) Escalator!
      if (playerPos.z <= ESCALATOR_Z_START && playerPos.z >= ESCALATOR_Z_END) {
        if (Math.abs(playerPos.x - (-4.5)) <= 1.65) {
          // Left Escalator carries player smoothly DOWN toward -Z!
          playerPos.z -= 4.2 * dt;
          playerPos.y = getBaseFloorHeight(playerPos.x, playerPos.z);
        } else if (Math.abs(playerPos.x - 4.5) <= 1.65) {
          // Right Escalator carries player smoothly UP toward +Z!
          playerPos.z += 4.2 * dt;
          playerPos.y = getBaseFloorHeight(playerPos.x, playerPos.z);
        }
      }
    }

    // Animate 24 Moving Escalator Steps along the incline
    const escLenZ = Math.abs(ESCALATOR_Z_END - ESCALATOR_Z_START);
    for (let i = 0; i < escalatorStepMeshes.length; i++) {
      const s = escalatorStepMeshes[i];
      const t = ((s.phase + elapsed * 0.14 * (s.dir < 0 ? 1 : -1)) % 1.0 + 1.0) % 1.0;
      const sz = ESCALATOR_Z_START - t * escLenZ;
      const sy = UPPER_FLOOR_Y * (1.0 - t) + LOWER_FLOOR_Y * t;
      s.mesh.position.set(s.cx, sy - 0.12, sz);
    }

    // Animate Surreal Floating Furniture in Atrium
    for (let i = 0; i < surrealFloatingProps.length; i++) {
      const fp = surrealFloatingProps[i];
      fp.mesh.position.y = fp.baseY + Math.sin(elapsed * 1.4 + fp.phase) * 0.45;
      fp.mesh.rotation.y = elapsed * 0.35 + fp.phase;
    }

    // Animate Sacred Scissors & Escape Portal
    if (sacredScissorsMesh) {
      sacredScissorsMesh.rotation.y = elapsed * 1.4;
      sacredScissorsMesh.position.y = 1.52 + Math.sin(elapsed * 2.5) * 0.08;
    }
    if (portalRingOuter) portalRingOuter.rotation.z = elapsed * 0.7;
    if (portalRingInner) portalRingInner.rotation.z = -elapsed * 1.1;
    if (portalVortexMesh) {
      portalVortexMesh.material.opacity = 0.48 + Math.sin(elapsed * 3.2) * 0.14;
    }
    if (hermesGuideMesh) {
      hermesGuideMesh.position.y = 0.9 + Math.sin(elapsed * 2.2) * 0.06;
    }

    // Animate 3D Flat-Pack Kit crates
    for (let i = 0; i < flatpackPickups.length; i++) {
      const fp = flatpackPickups[i];
      if (fp.cooldown > 0) {
        fp.cooldown = Math.max(0, fp.cooldown - dt);
        if (fp.cooldown === 0 && fp.crateGroup) {
          fp.crateGroup.visible = true;
        }
      } else if (fp.crateGroup) {
        fp.crateGroup.rotation.y = elapsed * 1.2 + i;
        fp.crateGroup.position.y = 0.58 + Math.sin(elapsed * 2.6 + i) * 0.07;
      }
    }

    // Update Patrolling Silhouetted Chubby Human Erf Security Guards
    for (let i = 0; i < securityGuards.length; i++) {
      const g = securityGuards[i];
      const targetWp = g.waypoints[g.wpIndex];
      const dx = targetWp.x - g.group.position.x;
      const dz = targetWp.z - g.group.position.z;
      const dist = Math.hypot(dx, dz);

      if (dist < 0.35) {
        g.wpIndex = (g.wpIndex + 1) % g.waypoints.length;
      } else {
        const step = Math.min(dist, g.speed * dt);
        g.group.position.x += (dx / dist) * step;
        g.group.position.z += (dz / dist) * step;

        const targetYaw = Math.atan2(dx, dz);
        let diff = targetYaw - g.rotY;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        g.rotY += diff * Math.min(1.0, dt * 8.0);
        g.group.rotation.y = g.rotY;
      }

      // Chubby Mall-Cop Waddle Animation
      const waddle = Math.sin(elapsed * 7.5 + i);
      g.bodyRoot.rotation.z = waddle * 0.065;
      g.bodyRoot.position.y = Math.abs(waddle) * 0.05;
      g.legL.rotation.x = waddle * 0.45;
      g.legR.rotation.x = -waddle * 0.45;

      // Update projected floor spotlight circle ahead of the guard's flashlight
      g.spotX = g.group.position.x + Math.sin(g.rotY) * g.beamDist;
      g.spotZ = g.group.position.z + Math.cos(g.rotY) * g.beamDist;
      g.floorRing.position.set(g.spotX, g.y + 0.04, g.spotZ);

      // Check if player is spotted (either inside flashlight circle OR bumping the guard) AND not behind furniture cover!
      if (playerPos && spotlightAlertCooldown <= 0 && Math.abs((playerPos.y || 0) - g.y) < 2.2) {
        const dBeam = Math.hypot(playerPos.x - g.spotX, playerPos.z - g.spotZ);
        const dBody = Math.hypot(playerPos.x - g.group.position.x, playerPos.z - g.group.position.z);
        if (dBeam < g.beamRadius || dBody < 1.35) {
          const blocked = isLineOfSightBlocked(g.group.position.x, g.group.position.z, playerPos.x, playerPos.z, g.y);
          if (!blocked) {
            spotlightAlertCooldown = 3.5;
            if (typeof onSecuritySpottedCallback === 'function') {
              onSecuritySpottedCallback(g, getActiveCheckpoint());
            }
          }
        }
      }
    }

    // Check if player walked directly into Hermes's Portal Vortex at (0, 0, -376.0)
    if (playerPos && Math.abs((playerPos.y || 0) - LOWER_FLOOR_Y) < 2.0) {
      if (Math.hypot(playerPos.x - 0.0, playerPos.z - (-376.0)) < 1.85) {
        if (typeof onAutoPortalExitCallback === 'function') {
          onAutoPortalExitCallback();
        }
      }
    }
  }

  window.BlahajSpawningPits = {
    build,
    getScene: () => spScene,
    setActive: (v) => { isActive = !!v; },
    isActive: () => isActive,
    getStart: () => ({ ...START_POS }),
    getActiveCheckpoint,
    getSecurityGuards: () => securityGuards,
    getCeilingY: (z = 0) => (z >= ESCALATOR_Z_START ? UPPER_FLOOR_Y + 9.0 : 14.8),
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
