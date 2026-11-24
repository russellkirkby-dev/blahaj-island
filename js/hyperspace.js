// ============================================================================
// BLÅHAJ ISLAND — MOJO HYPERSPACE CROSSROADS (js/hyperspace.js)
// v17.0: Showcase Edition — Undulating Organic Wormhole Tunnel, Thick Volumetric
//        Forked Lightning Bolts, Multicolored Warp Particle Streams & Plasma
//        Speed Ribbons, 3-Ring Branching Off-Ramp Tunnels, Last-Second Split-
//        Decision Abort Window, and Seamless [R] Loop Re-Index!
// ============================================================================

window.BlahajHyperspace = (function () {
  let hyperScene = null;
  let isBuilt = false;

  const TUNNEL_RADIUS = 25.0;
  const RING_COUNT = 32;
  const RING_SPACING = 12.0;
  const TUNNEL_SPEED = 84.0;

  const tunnelRings = [];
  const volumetricBolts = [];
  const plasmaStreaks = [];
  let particlePoints = null;
  let particleAngles = null;
  let particleRadii = null;
  let ambientFlashLight = null;
  let tunnelGlowLight = null;
  let flashIntensity = 0;
  let lightningTimer = 0;

  // 12 Staggered Off-Ramps (alternating Left & Right along the undulating wormhole)
  const BRANCH_DEFS = [
    { id: 'branch_island', index: 1, name: 'Blåhaj Island (Homeward)', zone: 'island', side: -1, color: '#38bdf8', hex: 0x38bdf8, locked: false },
    { id: 'branch_space', index: 2, name: 'Deep Space Orbit', zone: 'space', side: 1, color: '#a855f7', hex: 0xa855f7, locked: false },
    { id: 'branch_cheese', index: 3, name: 'Swiss Cheese Planetoid', zone: 'cheese_moon', side: -1, color: '#facc15', hex: 0xfacc15, checkUnlock: () => isCheeseMoonUnlocked() },
    { id: 'branch_4', index: 4, name: '??? · Sealed Reality', zone: null, side: 1, color: '#f43f5e', hex: 0xf43f5e, locked: true },
    { id: 'branch_5', index: 5, name: '??? · Uncharted Rift', zone: null, side: -1, color: '#f43f5e', hex: 0xf43f5e, locked: true },
    { id: 'branch_6', index: 6, name: '??? · Static Horizon', zone: null, side: 1, color: '#f43f5e', hex: 0xf43f5e, locked: true },
    { id: 'branch_7', index: 7, name: '??? · Inverted Spire', zone: null, side: -1, color: '#f43f5e', hex: 0xf43f5e, locked: true },
    { id: 'branch_8', index: 8, name: '??? · Toybox Nebula', zone: null, side: 1, color: '#f43f5e', hex: 0xf43f5e, locked: true },
    { id: 'branch_9', index: 9, name: '??? · Forgotten Sector', zone: null, side: -1, color: '#f43f5e', hex: 0xf43f5e, locked: true },
    { id: 'branch_10', index: 10, name: '??? · Cardboard Citadel', zone: null, side: 1, color: '#f43f5e', hex: 0xf43f5e, locked: true },
    { id: 'branch_11', index: 11, name: '??? · Deep Seam Core', zone: null, side: -1, color: '#f43f5e', hex: 0xf43f5e, locked: true },
    { id: 'branch_12', index: 12, name: '??? · Outer Threshold', zone: null, side: 1, color: '#f43f5e', hex: 0xf43f5e, locked: true }
  ];

  let nextBranchIdx = 0;
  let activeRamp = null;
  let rampCooldown = 0;
  let rampMeshGroup = null;
  let rampRingMats = [];
  let rampDiscMat = null;
  let transitionTriggered = false;
  let bounceCooldown = 0;

  // Smooth undulating wormhole spine (stays centered at z = 0 around the UFO, snakes organically ahead!)
  function getTunnelCenterAt(z, elapsed) {
    const distAhead = Math.max(0, -z - 6.0);
    const bendWeight = Math.min(1.0, (distAhead / 120.0) * (distAhead / 120.0));
    const cx = (Math.sin(z * 0.017 + elapsed * 1.45) * 26.0 + Math.cos(z * 0.009 - elapsed * 0.85) * 14.0) * bendWeight;
    const cy = (Math.cos(z * 0.015 - elapsed * 1.2) * 18.0 + Math.sin(z * 0.011 + elapsed * 0.95) * 9.0) * bendWeight;
    return { x: cx, y: cy };
  }

  function isCheeseMoonUnlocked() {
    try {
      if (localStorage.getItem('blahaj_cheese_moon_unlocked_v1') === 'true') return true;
    } catch (e) {}
    if (window.BlahajSpace && typeof window.BlahajSpace.getSectorStatus === 'function') {
      const st = window.BlahajSpace.getSectorStatus();
      if (st && (st.waveCleared || st.remainingRocks === 0)) return true;
    }
    return false;
  }

  function isBranchLocked(branch) {
    if (!branch) return true;
    if (typeof branch.checkUnlock === 'function') return !branch.checkUnlock();
    return !!branch.locked;
  }

  function build() {
    if (isBuilt && hyperScene) return hyperScene;

    hyperScene = new THREE.Scene();
    hyperScene.background = new THREE.Color(0x04010c);
    hyperScene.fog = new THREE.FogExp2(0x09021a, 0.0048);

    const amb = new THREE.AmbientLight(0x5b21b6, 1.45);
    hyperScene.add(amb);

    ambientFlashLight = new THREE.PointLight(0x7dd3fc, 0.0, 280);
    ambientFlashLight.position.set(0, 10, -45);
    hyperScene.add(ambientFlashLight);

    tunnelGlowLight = new THREE.PointLight(0xc084fc, 2.2, 220);
    tunnelGlowLight.position.set(0, 0, -90);
    hyperScene.add(tunnelGlowLight);

    // 1. Undulating Surreal Octagonal Wormhole Rings
    tunnelRings.length = 0;
    const ringPalette = [0xc084fc, 0x38bdf8, 0xf472b6, 0x818cf8, 0x2dd4bf];
    for (let i = 0; i < RING_COUNT; i++) {
      const rGeo = new THREE.TorusGeometry(TUNNEL_RADIUS, 0.52, 7, 10);
      const baseHex = ringPalette[i % ringPalette.length];
      const rMat = new THREE.MeshBasicMaterial({
        color: baseHex,
        transparent: true,
        opacity: 0.78
      });
      const rMesh = new THREE.Mesh(rGeo, rMat);
      rMesh.position.z = 22.0 - i * RING_SPACING;
      rMesh.rotation.z = i * 0.22;
      hyperScene.add(rMesh);
      tunnelRings.push({
        mesh: rMesh,
        mat: rMat,
        baseColor: new THREE.Color(baseHex),
        phase: i * 0.42
      });
    }

    // 2. High-Speed Multicolored Warp Particle Stream (650 glowing motes swirling along the undulating tunnel!)
    const pCount = 650;
    const pPositions = new Float32Array(pCount * 3);
    const pColors = new Float32Array(pCount * 3);
    particleAngles = new Float32Array(pCount);
    particleRadii = new Float32Array(pCount);

    const colChoices = [
      new THREE.Color(0x38bdf8), // Electric Cyan
      new THREE.Color(0xf472b6), // Neon Magenta
      new THREE.Color(0xfacc15), // Solar Gold
      new THREE.Color(0xc084fc), // Hyper Violet
      new THREE.Color(0xffffff)  // Pure Starlight
    ];
    const totalLen = RING_COUNT * RING_SPACING;

    for (let i = 0; i < pCount; i++) {
      const ang = Math.random() * Math.PI * 2;
      const rad = TUNNEL_RADIUS * (0.58 + Math.random() * 0.62);
      const pz = 28.0 - Math.random() * totalLen;
      particleAngles[i] = ang;
      particleRadii[i] = rad;
      pPositions[i * 3] = Math.cos(ang) * rad;
      pPositions[i * 3 + 1] = Math.sin(ang) * rad;
      pPositions[i * 3 + 2] = pz;

      const c = colChoices[i % colChoices.length];
      pColors[i * 3] = c.r;
      pColors[i * 3 + 1] = c.g;
      pColors[i * 3 + 2] = c.b;
    }

    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
    pGeo.setAttribute('color', new THREE.BufferAttribute(pColors, 3));
    const pMat = new THREE.PointsMaterial({
      size: 2.6,
      sizeAttenuation: false,
      vertexColors: true,
      transparent: true,
      opacity: 0.92
    });
    particlePoints = new THREE.Points(pGeo, pMat);
    hyperScene.add(particlePoints);

    // 3. Longitudinal Glowing Plasma Speed Ribbons zipping past the hull
    plasmaStreaks.length = 0;
    const streakGeo = new THREE.BoxGeometry(0.24, 0.24, 24.0);
    for (let i = 0; i < 18; i++) {
      const sMat = new THREE.MeshBasicMaterial({
        color: ringPalette[i % ringPalette.length],
        transparent: true,
        opacity: 0.68
      });
      const sMesh = new THREE.Mesh(streakGeo, sMat);
      const ang = (i / 18) * Math.PI * 2;
      const rad = TUNNEL_RADIUS * (0.82 + (i % 3) * 0.08);
      const sz = 20.0 - Math.random() * totalLen;
      sMesh.position.set(Math.cos(ang) * rad, Math.sin(ang) * rad, sz);
      hyperScene.add(sMesh);
      plasmaStreaks.push({ mesh: sMesh, ang, rad, speedMult: 1.45 + (i % 4) * 0.25 });
    }

    // 4. Reusable 3-Ring Branching Off-Ramp Tunnel Mouth (looks like a real curving side-tunnel!)
    rampMeshGroup = new THREE.Group();
    rampRingMats = [];
    for (let ri = 0; ri < 3; ri++) {
      const rMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.96 - ri * 0.22
      });
      const rMesh = new THREE.Mesh(new THREE.TorusGeometry(8.8 - ri * 1.15, 0.78 - ri * 0.12, 12, 32), rMat);
      rMesh.position.z = -ri * 5.8;
      rampMeshGroup.add(rMesh);
      rampRingMats.push(rMat);
    }
    rampDiscMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.36,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const rampDisc = new THREE.Mesh(new THREE.CircleGeometry(7.2, 28), rampDiscMat);
    rampDisc.position.z = -11.5;
    rampMeshGroup.add(rampDisc);
    rampMeshGroup.visible = false;
    hyperScene.add(rampMeshGroup);

    isBuilt = true;
    return hyperScene;
  }

  // Thick Volumetric Glowing Lightning Segment Helper (impossible to miss on WebGL!)
  function addVolumetricSegment(group, p1, p2, coreRad, haloRad, haloHex) {
    const dir = new THREE.Vector3().subVectors(p2, p1);
    const len = dir.length();
    if (len < 0.05) return;
    const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
    const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().divideScalar(len));

    const coreMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(coreRad, coreRad, len, 6),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    coreMesh.position.copy(mid);
    coreMesh.quaternion.copy(quat);

    const haloMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(haloRad, haloRad, len, 6),
      new THREE.MeshBasicMaterial({
        color: haloHex,
        transparent: true,
        opacity: 0.58,
        depthWrite: false
      })
    );
    haloMesh.position.copy(mid);
    haloMesh.quaternion.copy(quat);

    group.add(coreMesh, haloMesh);
  }

  function spawnVolumetricLightning(elapsed, forceForeground = false) {
    if (!hyperScene) return;
    const boltGroup = new THREE.Group();
    const isCyan = Math.random() > 0.42;
    const haloHex = isCyan ? 0x38bdf8 : 0xf472b6;

    const zStart = forceForeground ? (-35 - Math.random() * 55) : (-20 - Math.random() * 145);
    const startAng = Math.random() * Math.PI * 2;
    // Arc either across the tunnel ceiling/sides OR longitudinally down the wall!
    const crossArc = Math.random() > 0.35;
    const endAng = crossArc ? startAng + (Math.random() > 0.5 ? 1 : -1) * (1.2 + Math.random() * 1.4) : startAng + (Math.random() - 0.5) * 0.7;
    const zSpan = crossArc ? (18 + Math.random() * 24) : (48 + Math.random() * 38);

    const segs = 7;
    const pts = [];
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      const z = zStart - t * zSpan;
      const center = getTunnelCenterAt(z, elapsed);
      const ang = startAng + (endAng - startAng) * t;
      const r = TUNNEL_RADIUS * (i === 0 || i === segs ? 0.96 : (0.64 + Math.random() * 0.3));
      const jitterX = (i === 0 || i === segs) ? 0 : (Math.random() - 0.5) * 4.2;
      const jitterY = (i === 0 || i === segs) ? 0 : (Math.random() - 0.5) * 4.2;
      pts.push(new THREE.Vector3(center.x + Math.cos(ang) * r + jitterX, center.y + Math.sin(ang) * r + jitterY, z));
    }

    for (let i = 0; i < segs; i++) {
      addVolumetricSegment(boltGroup, pts[i], pts[i + 1], 0.24, 0.82, haloHex);
    }

    // Add a crackling secondary fork branch off the middle!
    const forkStart = pts[Math.floor(segs * 0.45)].clone();
    const forkMid = forkStart.clone().add(new THREE.Vector3((Math.random() - 0.5) * 9, (Math.random() - 0.5) * 9, -8));
    const forkEnd = forkMid.clone().add(new THREE.Vector3((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10, -10));
    addVolumetricSegment(boltGroup, forkStart, forkMid, 0.15, 0.52, haloHex);
    addVolumetricSegment(boltGroup, forkMid, forkEnd, 0.11, 0.38, haloHex);

    hyperScene.add(boltGroup);
    volumetricBolts.push({ group: boltGroup, life: 0.24 + Math.random() * 0.18, maxLife: 0.36 });

    flashIntensity = 4.6;
    if (ambientFlashLight) ambientFlashLight.color.setHex(haloHex);
  }

  function spawnNextOffRamp(indexOverride = null) {
    if (typeof indexOverride === 'number') {
      nextBranchIdx = ((indexOverride % BRANCH_DEFS.length) + BRANCH_DEFS.length) % BRANCH_DEFS.length;
    }
    const branch = BRANCH_DEFS[nextBranchIdx];
    const locked = isBranchLocked(branch);
    activeRamp = {
      branch,
      locked,
      z: -255.0,
      sideX: branch.side * 13.8,
      x: branch.side * 13.8,
      y: 0.0
    };
    if (rampMeshGroup) {
      rampMeshGroup.visible = true;
      rampMeshGroup.position.set(activeRamp.x, activeRamp.y, activeRamp.z);
      rampMeshGroup.rotation.y = branch.side * -0.44;
      const colHex = locked ? 0xf43f5e : branch.hex;
      rampRingMats.forEach((m) => m.color.setHex(colHex));
      if (rampDiscMat) {
        rampDiscMat.color.setHex(colHex);
        rampDiscMat.opacity = locked ? 0.26 : 0.44;
      }
    }
    updateObjectiveHUD();
  }

  function onEnterZone() {
    if (!isBuilt) build();
    transitionTriggered = false;
    bounceCooldown = 0;
    nextBranchIdx = 0;
    rampCooldown = 0.5;
    activeRamp = null;
    if (rampMeshGroup) rampMeshGroup.visible = false;
    spawnNextOffRamp(0);
    spawnVolumetricLightning(0, true);
    updateObjectiveHUD();
  }

  function reindexLoopToStart() {
    nextBranchIdx = 0;
    spawnVolumetricLightning(performance.now() * 0.001, true);
    spawnVolumetricLightning(performance.now() * 0.001 + 1.2, true);
    if (window.CozyAudio && window.CozyAudio.portalChime) window.CozyAudio.portalChime();

    // Seamlessly re-index without ever moving the UFO!
    if (!activeRamp || activeRamp.z < -45.0) {
      spawnNextOffRamp(0);
    } else {
      nextBranchIdx = BRANCH_DEFS.length - 1; // Wraps cleanly to 0 (#1 Blåhaj Island) right after current ramp passes
    }

    if (window.showToast) {
      window.showToast(
        '🔁 HYPERSPACE LOOP RE-INDEXED!',
        'Seamlessly queued #1: Blåhaj Island (Homeward) as the next Off-Ramp!'
      );
    }
    updateObjectiveHUD();
  }

  function updateObjectiveHUD() {
    let banner = document.getElementById('hyperspace-objective-banner');
    const ufoState =
      window.BlahajUFO && typeof window.BlahajUFO.getState === 'function'
        ? window.BlahajUFO.getState()
        : null;

    if (!ufoState || !ufoState.inHyperspace) {
      if (banner) banner.style.display = 'none';
      return;
    }

    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'hyperspace-objective-banner';
      banner.style.cssText = [
        'position:fixed',
        'top:78px',
        'left:50%',
        'transform:translateX(-50%)',
        'z-index:8900',
        'background:rgba(15, 23, 42, 0.88)',
        'border:1.5px solid #c084fc',
        'border-radius:12px',
        'padding:7px 16px',
        'color:#f3e8ff',
        'font-family:system-ui,-apple-system,sans-serif',
        'font-size:12.5px',
        'font-weight:700',
        'text-align:center',
        'box-shadow:0 8px 24px rgba(0,0,0,0.55)',
        'pointer-events:none',
        'max-width:670px'
      ].join(';');
      document.body.appendChild(banner);
    }

    let exitLine = 'Cruising Hyperspace Loop…';
    if (activeRamp) {
      const b = activeRamp.branch;
      const sideLabel = b.side < 0 ? 'LEFT' : 'RIGHT';
      const label = activeRamp.locked ? '??? · SEALED REALITY [LOCKED]' : b.name.toUpperCase();
      exitLine = `NEXT OFF-RAMP (#${b.index}/${BRANCH_DEFS.length} · ${sideLabel}): ${label}`;
    }

    banner.innerHTML = `<div>⚡ MOJO HYPERSPACE CROSSROADS · ${exitLine}</div><div style="font-size:11.5px;font-weight:600;color:#bae6fd;margin-top:2px;">Steer [A/D], [Q/E], or [Mouse] into Off-Ramp · Pull Center Anytime to Abort · [R] Re-Index Loop to #1</div>`;
    banner.style.display = 'block';
  }

  function updateWaypointsOnly(camera) {
    let layer = document.getElementById('hyperspace-hud-waypoints');
    const ufoState =
      window.BlahajUFO && typeof window.BlahajUFO.getState === 'function'
        ? window.BlahajUFO.getState()
        : null;

    if (!ufoState || !ufoState.inHyperspace || !camera || !activeRamp || activeRamp.z > 5.0) {
      if (layer) layer.style.display = 'none';
      return;
    }

    if (!layer) {
      layer = document.createElement('div');
      layer.id = 'hyperspace-hud-waypoints';
      layer.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:8800;overflow:hidden;';
      document.body.appendChild(layer);
    }
    layer.style.display = 'block';

    const w = window.innerWidth;
    const h = window.innerHeight;
    const worldPos = new THREE.Vector3(activeRamp.x, activeRamp.y, activeRamp.z);
    const dist = Math.max(0, Math.round(-activeRamp.z));
    const proj = worldPos.clone().project(camera);

    let sx = (proj.x * 0.5 + 0.5) * w;
    let sy = (-proj.y * 0.5 + 0.5) * h;
    sx = Math.max(82, Math.min(w - 82, sx));
    sy = Math.max(108, Math.min(h - 112, sy));

    const b = activeRamp.branch;
    const aligned =
      ufoState.pos &&
      ((b.side < 0 && ufoState.pos.x <= -8.8) || (b.side > 0 && ufoState.pos.x >= 8.8));
    const color = activeRamp.locked ? '#f43f5e' : (aligned ? '#4ade80' : b.color);
    const dirHint = activeRamp.locked
      ? 'SEALED BARRIER'
      : aligned
      ? '✓ ALIGNED — HOLD TO ENTER · PULL CENTER TO ABORT'
      : b.side < 0
      ? '← STEER LEFT (A / Q / MOUSE)'
      : 'STEER RIGHT (D / E / MOUSE) →';
    const title = activeRamp.locked
      ? `#${b.index} ??? [LOCKED]`
      : `#${b.index} ${b.name.toUpperCase()}`;

    layer.innerHTML = `
      <div style="position:absolute;left:${sx.toFixed(1)}px;top:${sy.toFixed(1)}px;transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;gap:3px;font-family:system-ui,-apple-system,sans-serif;">
        <div style="width:20px;height:20px;transform:rotate(45deg);border:2px solid ${color};background:rgba(15,23,42,0.82);box-shadow:0 0 16px ${color};display:flex;align-items:center;justify-content:center;">
          <div style="width:7px;height:7px;background:${color};"></div>
        </div>
        <div style="margin-top:4px;background:rgba(15,23,42,0.90);border:1.5px solid ${color};border-radius:7px;padding:3px 9px;color:#f8fafc;font-size:11px;font-weight:800;letter-spacing:0.04em;white-space:nowrap;text-align:center;">
          ${title} · ${dist}m<br><span style="font-size:9.5px;color:${color};">${dirHint}</span>
        </div>
      </div>
    `;
  }

  function update(dt, elapsed, camera) {
    if (!isBuilt) build();

    const ufoState =
      window.BlahajUFO && typeof window.BlahajUFO.getState === 'function'
        ? window.BlahajUFO.getState()
        : null;

    if (!ufoState || !ufoState.inHyperspace) {
      const banner = document.getElementById('hyperspace-objective-banner');
      if (banner) banner.style.display = 'none';
      const wpLayer = document.getElementById('hyperspace-hud-waypoints');
      if (wpLayer) wpLayer.style.display = 'none';
      return;
    }

    updateObjectiveHUD();
    updateWaypointsOnly(camera);

    const totalLen = RING_COUNT * RING_SPACING;
    const rampCol = activeRamp ? new THREE.Color(activeRamp.locked ? 0xf43f5e : activeRamp.branch.hex) : null;
    const rampProximity = activeRamp ? Math.max(0, Math.min(1, (activeRamp.z + 170) / 170)) : 0;

    if (tunnelGlowLight && rampCol) {
      tunnelGlowLight.color.lerp(rampCol, Math.min(1.0, dt * 3.0));
    }

    // 1. Animate undulating, breathing wormhole rings!
    for (let i = 0; i < tunnelRings.length; i++) {
      const r = tunnelRings[i];
      r.mesh.position.z += TUNNEL_SPEED * dt;
      if (r.mesh.position.z > 24.0) {
        r.mesh.position.z -= totalLen;
      }
      const center = getTunnelCenterAt(r.mesh.position.z, elapsed);
      r.mesh.position.x = center.x;
      r.mesh.position.y = center.y;
      r.mesh.rotation.z += dt * 0.55 * (i % 2 === 0 ? 1 : -1);
      const breathe = 1.0 + Math.sin(elapsed * 3.2 + r.phase) * 0.085;
      r.mesh.scale.setScalar(breathe);

      if (rampCol) {
        r.mat.color.copy(r.baseColor).lerp(rampCol, rampProximity * 0.45);
      }
    }

    // 2. Animate high-speed multicolored warp particle stream along the undulating wormhole!
    if (particlePoints && particlePoints.geometry && particlePoints.geometry.attributes.position) {
      const posArr = particlePoints.geometry.attributes.position.array;
      for (let i = 0; i < particleAngles.length; i++) {
        let pz = posArr[i * 3 + 2] + TUNNEL_SPEED * 1.55 * dt;
        if (pz > 28.0) pz -= totalLen;
        particleAngles[i] += dt * (i % 2 === 0 ? 0.85 : -0.65);
        const center = getTunnelCenterAt(pz, elapsed);
        const rad = particleRadii[i];
        posArr[i * 3] = center.x + Math.cos(particleAngles[i]) * rad;
        posArr[i * 3 + 1] = center.y + Math.sin(particleAngles[i]) * rad;
        posArr[i * 3 + 2] = pz;
      }
      particlePoints.geometry.attributes.position.needsUpdate = true;
    }

    // 3. Animate longitudinal plasma speed ribbons!
    for (let i = 0; i < plasmaStreaks.length; i++) {
      const s = plasmaStreaks[i];
      let sz = s.mesh.position.z + TUNNEL_SPEED * s.speedMult * dt;
      if (sz > 30.0) sz -= totalLen;
      s.ang += dt * 0.4;
      const center = getTunnelCenterAt(sz, elapsed);
      s.mesh.position.set(center.x + Math.cos(s.ang) * s.rad, center.y + Math.sin(s.ang) * s.rad, sz);
    }

    // 4. Bold Volumetric Forked Lightning Bolts + Interior Strobe Flash!
    lightningTimer -= dt;
    if (lightningTimer <= 0) {
      lightningTimer = 0.22 + Math.random() * 0.34;
      spawnVolumetricLightning(elapsed, Math.random() > 0.45);
    }
    if (ambientFlashLight) {
      flashIntensity = Math.max(0, flashIntensity - dt * 14.0);
      ambientFlashLight.intensity = flashIntensity;
    }
    for (let i = volumetricBolts.length - 1; i >= 0; i--) {
      const vb = volumetricBolts[i];
      vb.life -= dt;
      vb.group.position.z += TUNNEL_SPEED * 0.42 * dt;
      if (vb.life <= 0) {
        if (vb.group.parent) vb.group.parent.remove(vb.group);
        vb.group.traverse((child) => {
          if (child.geometry) child.geometry.dispose();
          if (child.material) child.material.dispose();
        });
        volumetricBolts.splice(i, 1);
      }
    }

    if (bounceCooldown > 0) bounceCooldown = Math.max(0, bounceCooldown - dt);

    // 5. Advance Staggered Off-Ramp Queue (with Last-Second Split-Decision Pull-Away!)
    if (activeRamp) {
      activeRamp.z += TUNNEL_SPEED * 0.62 * dt;
      const center = getTunnelCenterAt(activeRamp.z, elapsed);
      activeRamp.x = center.x + activeRamp.sideX;
      activeRamp.y = center.y;

      if (rampMeshGroup) {
        rampMeshGroup.position.set(activeRamp.x, activeRamp.y, activeRamp.z);
        rampMeshGroup.rotation.z = elapsed * 2.6;
        // Pulse the 3-ring tunnel mouth bigger when the pilot is aligned to enter!
        const alignedNow =
          ufoState.pos &&
          ((activeRamp.branch.side < 0 && ufoState.pos.x <= -8.8) ||
            (activeRamp.branch.side > 0 && ufoState.pos.x >= 8.8));
        const pulseScale = alignedNow && !activeRamp.locked ? 1.12 + Math.sin(elapsed * 14) * 0.06 : 1.0;
        rampMeshGroup.scale.setScalar(pulseScale);
      }

      // Tight threshold window (-3.5..+4.5m) right at the mouth so you can pull back to center at the last split-second!
      if (!transitionTriggered && ufoState.pos && activeRamp.z >= -3.5 && activeRamp.z <= 4.5) {
        const hitLeft = activeRamp.branch.side < 0 && ufoState.pos.x <= -9.2;
        const hitRight = activeRamp.branch.side > 0 && ufoState.pos.x >= 9.2;
        if (hitLeft || hitRight) {
          if (activeRamp.locked) {
            if (bounceCooldown <= 0) {
              bounceCooldown = 0.9;
              ufoState.pos.x = 0;
              if (ufoState.vel) ufoState.vel.x = -activeRamp.branch.side * 24.0;
              spawnVolumetricLightning(elapsed, true);
              if (window.CozyAudio && window.CozyAudio.trapHit) window.CozyAudio.trapHit();
              if (window.showToast) {
                window.showToast(
                  '🔒 UNCHARTED BRANCH SEALED!',
                  'This reality tunnel requires a Star-Chart or Key to unseal!'
                );
              }
            }
          } else {
            transitionTriggered = true;
            const destZone = activeRamp.branch.zone;
            if (window.BlahajGame && typeof window.BlahajGame.exitHyperspaceTo === 'function') {
              window.BlahajGame.exitHyperspaceTo(destZone, true);
            }
            return;
          }
        }
      }

      if (activeRamp.z > 20.0) {
        activeRamp = null;
        if (rampMeshGroup) rampMeshGroup.visible = false;
        nextBranchIdx = (nextBranchIdx + 1) % BRANCH_DEFS.length;
        rampCooldown = 1.0;
        updateObjectiveHUD();
      }
    } else {
      rampCooldown -= dt;
      if (rampCooldown <= 0) {
        spawnNextOffRamp();
      }
    }
  }

  return {
    build,
    update,
    updateWaypointsOnly,
    onEnterZone,
    reindexLoopToStart,
    getScene: () => (isBuilt ? hyperScene : build())
  };
})();
