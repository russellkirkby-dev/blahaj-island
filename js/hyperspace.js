// ============================================================================
// BLÅHAJ ISLAND — MOJO HYPERSPACE CROSSROADS (js/hyperspace.js)
// v16.9: Surreal Upside-Down Lightning Tunnel with 12 Staggered Off-Ramps,
//        3 Unlocked Realities + 9 Unlabeled Sealed Branches, Seamless [R]
//        Loop Re-Index, and Overlaid HUD Diamond Waypoint Markers.
// ============================================================================

window.BlahajHyperspace = (function () {
  let hyperScene = null;
  let isBuilt = false;

  const TUNNEL_RADIUS = 24.0;
  const RING_COUNT = 28;
  const RING_SPACING = 13.0;
  const TUNNEL_SPEED = 78.0;

  const tunnelRings = [];
  const lightningBolts = [];
  let starPoints = null;
  let ambientFlashLight = null;
  let flashIntensity = 0;
  let lightningTimer = 0;

  // 12 Staggered Off-Ramps (alternating Left & Right along the looping tunnel)
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
  let rampTorusMat = null;
  let rampDiscMat = null;
  let transitionTriggered = false;
  let bounceCooldown = 0;

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
    hyperScene.background = new THREE.Color(0x04010a);
    hyperScene.fog = new THREE.FogExp2(0x070214, 0.0065);

    const amb = new THREE.AmbientLight(0x4c1d95, 1.35);
    hyperScene.add(amb);

    ambientFlashLight = new THREE.PointLight(0x38bdf8, 0.0, 220);
    ambientFlashLight.position.set(0, 8, -45);
    hyperScene.add(ambientFlashLight);

    // 1. Surreal Twisting Octagonal Tunnel Rings
    tunnelRings.length = 0;
    const ringPalette = [0xc084fc, 0x38bdf8, 0xf472b6, 0x818cf8];
    for (let i = 0; i < RING_COUNT; i++) {
      const rGeo = new THREE.TorusGeometry(TUNNEL_RADIUS, 0.42, 6, 8);
      const rMat = new THREE.MeshBasicMaterial({
        color: ringPalette[i % ringPalette.length],
        transparent: true,
        opacity: 0.72
      });
      const rMesh = new THREE.Mesh(rGeo, rMat);
      rMesh.position.z = 20.0 - i * RING_SPACING;
      rMesh.rotation.z = i * 0.18;
      hyperScene.add(rMesh);
      tunnelRings.push({ mesh: rMesh, baseColor: ringPalette[i % ringPalette.length] });
    }

    // 2. Inverted Hyper-Streak Stars
    const starCount = 700;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const ang = Math.random() * Math.PI * 2;
      const rad = TUNNEL_RADIUS * (0.85 + Math.random() * 1.4);
      starPos[i * 3] = Math.cos(ang) * rad;
      starPos[i * 3 + 1] = Math.sin(ang) * rad;
      starPos[i * 3 + 2] = 30.0 - Math.random() * (RING_COUNT * RING_SPACING);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xe0f2fe, size: 1.8, sizeAttenuation: false });
    starPoints = new THREE.Points(starGeo, starMat);
    hyperScene.add(starPoints);

    // 3. Reusable Off-Ramp Branch Rift Mesh
    rampMeshGroup = new THREE.Group();
    rampTorusMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const rampRing = new THREE.Mesh(new THREE.TorusGeometry(8.8, 0.85, 12, 32), rampTorusMat);
    rampDiscMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.34,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const rampDisc = new THREE.Mesh(new THREE.CircleGeometry(8.3, 28), rampDiscMat);
    rampMeshGroup.add(rampRing, rampDisc);
    rampMeshGroup.visible = false;
    hyperScene.add(rampMeshGroup);

    isBuilt = true;
    return hyperScene;
  }

  function spawnLightningArc() {
    if (!hyperScene) return;
    const pts = [];
    const segs = 7;
    const startAng = Math.random() * Math.PI * 2;
    const zStart = -220 + Math.random() * 150;
    for (let i = 0; i <= segs; i++) {
      const ang = startAng + (Math.random() - 0.5) * 1.1;
      const r = TUNNEL_RADIUS * (0.72 + Math.random() * 0.25);
      pts.push(new THREE.Vector3(Math.cos(ang) * r, Math.sin(ang) * r, zStart + i * 11.0));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({
      color: Math.random() > 0.45 ? 0x7dd3fc : 0xf472b6,
      transparent: true,
      opacity: 0.95
    });
    const line = new THREE.Line(geo, mat);
    hyperScene.add(line);
    lightningBolts.push({ line, life: 0.22 + Math.random() * 0.16 });

    flashIntensity = 3.2;
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
      z: -245.0,
      x: branch.side * 12.8,
      y: 0.0
    };
    if (rampMeshGroup) {
      rampMeshGroup.visible = true;
      rampMeshGroup.position.set(activeRamp.x, activeRamp.y, activeRamp.z);
      rampMeshGroup.rotation.y = branch.side * -0.35;
      const colHex = locked ? 0xf43f5e : branch.hex;
      if (rampTorusMat) rampTorusMat.color.setHex(colHex);
      if (rampDiscMat) {
        rampDiscMat.color.setHex(colHex);
        rampDiscMat.opacity = locked ? 0.24 : 0.42;
      }
    }
    updateObjectiveHUD();
  }

  function onEnterZone() {
    if (!isBuilt) build();
    transitionTriggered = false;
    bounceCooldown = 0;
    nextBranchIdx = 0;
    rampCooldown = 0.6;
    activeRamp = null;
    if (rampMeshGroup) rampMeshGroup.visible = false;
    spawnNextOffRamp(0);
    updateObjectiveHUD();
  }

  function reindexLoopToStart() {
    nextBranchIdx = 0;
    spawnLightningArc();
    spawnLightningArc();
    if (window.CozyAudio && window.CozyAudio.portalChime) window.CozyAudio.portalChime();

    // Seamlessly swap the upcoming ramp if it is still ahead of us; otherwise queue #1 right next!
    if (!activeRamp || activeRamp.z < -55.0) {
      spawnNextOffRamp(0);
    } else {
      nextBranchIdx = BRANCH_DEFS.length - 1; // Advances to 0 as soon as current ramp passes
    }

    if (window.showToast) {
      window.showToast(
        '🔁 HYPERSPACE LOOP RE-INDEXED!',
        'Next Off-Ramp ahead is #1: Blåhaj Island (Homeward)!'
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
        'max-width:650px'
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

    banner.innerHTML = `<div>⚡ MOJO HYPERSPACE CROSSROADS · ${exitLine}</div><div style="font-size:11.5px;font-weight:600;color:#bae6fd;margin-top:2px;">Steer [A/D] or [Mouse] into an Off-Ramp · Stay Centered to Loop · [R] Re-Index Loop to #1</div>`;
    banner.style.display = 'block';
  }

  function updateWaypointsOnly(camera) {
    let layer = document.getElementById('hyperspace-hud-waypoints');
    const ufoState =
      window.BlahajUFO && typeof window.BlahajUFO.getState === 'function'
        ? window.BlahajUFO.getState()
        : null;

    if (!ufoState || !ufoState.inHyperspace || !camera || !activeRamp || activeRamp.z > 6.0) {
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
    sx = Math.max(76, Math.min(w - 76, sx));
    sy = Math.max(105, Math.min(h - 110, sy));

    const b = activeRamp.branch;
    const color = activeRamp.locked ? '#f43f5e' : b.color;
    const dirArrow = b.side < 0 ? '← STEER LEFT' : 'STEER RIGHT →';
    const title = activeRamp.locked
      ? `#${b.index} ??? [LOCKED]`
      : `#${b.index} ${b.name.toUpperCase()}`;

    layer.innerHTML = `
      <div style="position:absolute;left:${sx.toFixed(1)}px;top:${sy.toFixed(1)}px;transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;gap:3px;font-family:system-ui,-apple-system,sans-serif;">
        <div style="width:20px;height:20px;transform:rotate(45deg);border:2px solid ${color};background:rgba(15,23,42,0.8);box-shadow:0 0 14px ${color};display:flex;align-items:center;justify-content:center;">
          <div style="width:7px;height:7px;background:${color};"></div>
        </div>
        <div style="margin-top:4px;background:rgba(15,23,42,0.88);border:1.5px solid ${color};border-radius:7px;padding:3px 8px;color:#f8fafc;font-size:11px;font-weight:800;letter-spacing:0.04em;white-space:nowrap;text-align:center;">
          ${title} · ${dist}m<br><span style="font-size:9.5px;color:${color};">${activeRamp.locked ? 'SEALED BARRIER' : dirArrow}</span>
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

    // 1. Animate rushing neon tunnel rings
    const totalLen = RING_COUNT * RING_SPACING;
    for (let i = 0; i < tunnelRings.length; i++) {
      const r = tunnelRings[i];
      r.mesh.position.z += TUNNEL_SPEED * dt;
      r.mesh.rotation.z += dt * 0.45 * (i % 2 === 0 ? 1 : -1);
      if (r.mesh.position.z > 24.0) {
        r.mesh.position.z -= totalLen;
      }
    }

    // 2. Animate inverted hyper-streak stars
    if (starPoints && starPoints.geometry && starPoints.geometry.attributes.position) {
      const posArr = starPoints.geometry.attributes.position.array;
      for (let i = 0; i < posArr.length; i += 3) {
        posArr[i + 2] += TUNNEL_SPEED * 1.45 * dt;
        if (posArr[i + 2] > 30.0) {
          posArr[i + 2] -= totalLen;
        }
      }
      starPoints.geometry.attributes.position.needsUpdate = true;
    }

    // 3. Procedural Lightning Arcs & Surreal Flashes
    lightningTimer -= dt;
    if (lightningTimer <= 0) {
      lightningTimer = 0.24 + Math.random() * 0.42;
      spawnLightningArc();
    }
    if (ambientFlashLight) {
      flashIntensity = Math.max(0, flashIntensity - dt * 11.0);
      ambientFlashLight.intensity = flashIntensity;
    }
    for (let i = lightningBolts.length - 1; i >= 0; i--) {
      const lb = lightningBolts[i];
      lb.life -= dt;
      lb.line.position.z += TUNNEL_SPEED * 0.5 * dt;
      if (lb.life <= 0) {
        if (lb.line.parent) lb.line.parent.remove(lb.line);
        if (lb.line.geometry) lb.line.geometry.dispose();
        if (lb.line.material) lb.line.material.dispose();
        lightningBolts.splice(i, 1);
      }
    }

    if (bounceCooldown > 0) bounceCooldown = Math.max(0, bounceCooldown - dt);

    // 4. Advance Staggered Off-Ramp Queue & Check Steering Selection
    if (activeRamp) {
      activeRamp.z += TUNNEL_SPEED * 0.65 * dt;
      if (rampMeshGroup) {
        rampMeshGroup.position.set(activeRamp.x, activeRamp.y, activeRamp.z);
        rampMeshGroup.rotation.z = elapsed * 2.4;
      }

      if (!transitionTriggered && ufoState.pos && Math.abs(activeRamp.z - ufoState.pos.z) < 11.0) {
        const hitLeft = activeRamp.branch.side < 0 && ufoState.pos.x <= -6.8;
        const hitRight = activeRamp.branch.side > 0 && ufoState.pos.x >= 6.8;
        if (hitLeft || hitRight) {
          if (activeRamp.locked) {
            if (bounceCooldown <= 0) {
              bounceCooldown = 0.9;
              ufoState.pos.x = 0;
              if (ufoState.vel) ufoState.vel.x = -activeRamp.branch.side * 24.0;
              spawnLightningArc();
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
        rampCooldown = 1.1;
        updateObjectiveHUD();
      }
    } else {
      rampCooldown -= dt;
      if (rampCooldown <= 0) {
        spawnNextOffRamp();
      }
    }
  }

  window.addEventListener('keydown', (e) => {
    if (e.key !== 'r' && e.key !== 'R') return;
    const ufoState =
      window.BlahajUFO && typeof window.BlahajUFO.getState === 'function'
        ? window.BlahajUFO.getState()
        : null;
    if (!ufoState || !ufoState.inHyperspace) return;
    if (
      window.BlahajGame &&
      typeof window.BlahajGame.isCurrentInstancePaused === 'function' &&
      window.BlahajGame.isCurrentInstancePaused()
    ) {
      return;
    }
    e.preventDefault();
    reindexLoopToStart();
  });

  return {
    build,
    update,
    updateWaypointsOnly,
    onEnterZone,
    reindexLoopToStart,
    getScene: () => (isBuilt ? hyperScene : build())
  };
})();
