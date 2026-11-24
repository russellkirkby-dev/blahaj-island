// ============================================================================
// BLÅHAJ ISLAND — MOJO HYPERSPACE CROSSROADS (js/hyperspace.js)
// v17.1: "Beyond the Great Seam" Showcase — Vast Cathedral Wormhole (68m radius),
//        Slow Majestic Undulation, Diagonal Cross-Section Lightning Strikes,
//        Volumetric Nebula Gas Clouds, 2001 Slit-Scan Stargate Curtains,
//        and Colossal Blurred Godlike Character Apparitions & Frozen Relics!
// ============================================================================

window.BlahajHyperspace = (function () {
  let hyperScene = null;
  let isBuilt = false;

  // Vast, non-claustrophobic cathedral scale (nearly 3x wider, 750m visible depth!)
  const TUNNEL_RADIUS = 68.0;
  const RING_COUNT = 42;
  const RING_SPACING = 18.0;
  const TUNNEL_SPEED = 92.0;

  const tunnelRings = [];
  const volumetricBolts = [];
  const plasmaStreaks = [];
  const nebulaClouds = [];
  const stargateSlabs = [];
  const godlikeApparitions = [];
  const founderSharkModels = [];
  let activePeeringShark = null;
  let peeringSharkTimer = 3.0;
  let nextFounderSharkIdx = 0;

  let particlePoints = null;
  let particleAngles = null;
  let particleRadii = null;
  let ambientFlashLight = null;
  let tunnelGlowLight = null;
  let flashIntensity = 0;
  let lightningTimer = 0;

  // 12 Staggered Off-Ramps (alternating Left & Right inside the vast cathedral wormhole)
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

  // Slow, majestic, non-nauseating galactic curve (very low temporal frequency & long spatial wavelength)
  function getTunnelCenterAt(z, elapsed) {
    const distAhead = Math.max(0, -z - 15.0);
    const bendWeight = Math.min(1.0, (distAhead / 260.0) * (distAhead / 260.0));
    const cx =
      (Math.sin(z * 0.0042 + elapsed * 0.26) * 34.0 +
        Math.cos(z * 0.0024 - elapsed * 0.17) * 18.0) *
      bendWeight;
    const cy =
      (Math.cos(z * 0.0038 - elapsed * 0.22) * 22.0 +
        Math.sin(z * 0.0021 + elapsed * 0.15) * 11.0) *
      bendWeight;
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

  // Procedural Soft Volumetric Nebula / Gas Cloud Texture
  function createNebulaCloudTexture(c1, c2, c3) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 256, 256);

    // Layer multiple off-center soft radial puffs for an organic swirling gas cloud
    const puffs = [
      { x: 128, y: 128, r: 122, col: c1 },
      { x: 96, y: 112, r: 88, col: c2 },
      { x: 158, y: 142, r: 92, col: c3 },
      { x: 118, y: 156, r: 78, col: c2 },
      { x: 144, y: 98, r: 74, col: c1 }
    ];
    puffs.forEach((p) => {
      const grad = ctx.createRadialGradient(p.x, p.y, 4, p.x, p.y, p.r);
      grad.addColorStop(0.0, p.col);
      grad.addColorStop(0.55, p.col.replace(/[\d.]+\)$/, '0.18)'));
      grad.addColorStop(1.0, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    });

    return new THREE.CanvasTexture(canvas);
  }

  // 2001: A Space Odyssey Slit-Scan Stargate Horizon Texture
  function createStargateSlitScanTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 256, 256);

    const streakColors = [
      'rgba(56, 189, 248, 0.55)',
      'rgba(244, 114, 182, 0.48)',
      'rgba(250, 204, 21, 0.42)',
      'rgba(192, 132, 252, 0.52)',
      'rgba(255, 255, 255, 0.65)',
      'rgba(45, 212, 191, 0.45)'
    ];

    for (let y = 0; y < 256; y += 3) {
      if (Math.random() < 0.25) continue;
      const col = streakColors[Math.floor(Math.random() * streakColors.length)];
      const h = 1 + Math.floor(Math.random() * 4);
      const grad = ctx.createLinearGradient(0, y, 256, y);
      grad.addColorStop(0.0, 'rgba(0,0,0,0)');
      grad.addColorStop(0.2, col);
      grad.addColorStop(0.8, col);
      grad.addColorStop(1.0, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, y, 256, h);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }

  // Dreamlike Blurred Godlike Portrait Texture Loader (turns character portraits into colossal surreal cosmic apparitions!)
  function createGodlikePortraitTexture(imageUrl, tintHex, fallbackTitle) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    const tex = new THREE.CanvasTexture(canvas);
    const tintColor = new THREE.Color(tintHex);
    const r = Math.round(tintColor.r * 255);
    const g = Math.round(tintColor.g * 255);
    const b = Math.round(tintColor.b * 255);

    function drawSurrealFrame(img) {
      ctx.clearRect(0, 0, 256, 256);

      // Outer ethereal aura glow
      const aura = ctx.createRadialGradient(128, 128, 16, 128, 128, 124);
      aura.addColorStop(0.0, `rgba(${r}, ${g}, ${b}, 0.55)`);
      aura.addColorStop(0.65, `rgba(${r}, ${g}, ${b}, 0.18)`);
      aura.addColorStop(1.0, 'rgba(0,0,0,0)');
      ctx.fillStyle = aura;
      ctx.fillRect(0, 0, 256, 256);

      if (img) {
        ctx.save();
        // Clip to soft circular cosmic lens
        ctx.beginPath();
        ctx.arc(128, 128, 102, 0, Math.PI * 2);
        ctx.clip();

        // Draw soft glowing portrait + subtle cosmic dream-blur
        ctx.globalAlpha = 0.42;
        ctx.filter = 'blur(6px) saturate(145%) brightness(120%)';
        ctx.drawImage(img, 8, 8, 240, 240);

        ctx.globalAlpha = 0.88;
        ctx.filter = 'blur(1.2px) contrast(115%) brightness(115%)';
        ctx.drawImage(img, 18, 18, 220, 220);

        // Subtle ethereal blue-tint screen wash
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.24)`;
        ctx.fillRect(0, 0, 256, 256);
        ctx.restore();

        // Radial vignette feather so edges dissolve seamlessly into the nebula
        ctx.save();
        ctx.globalCompositeOperation = 'destination-in';
        const mask = ctx.createRadialGradient(128, 128, 42, 128, 128, 118);
        mask.addColorStop(0.0, 'rgba(255,255,255,1)');
        mask.addColorStop(0.70, 'rgba(255,255,255,0.88)');
        mask.addColorStop(1.0, 'rgba(255,255,255,0)');
        ctx.fillStyle = mask;
        ctx.fillRect(0, 0, 256, 256);
        ctx.restore();
      } else {
        // Fallback celestial glyph while image loads
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.7)`;
        ctx.font = 'bold 28px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(fallbackTitle || '✦', 128, 136);
      }

      tex.needsUpdate = true;
    }

    drawSurrealFrame(null);
    const img = new Image();
    img.onload = () => drawSurrealFrame(img);
    img.src = imageUrl;

    return tex;
  }

  // Colossal 3D Ghostly Relics Frozen in Time Outside the Wormhole
  function buildColossalFrozenRelic(kind, tintHex) {
    const group = new THREE.Group();
    const wireMat = new THREE.MeshBasicMaterial({
      color: tintHex,
      wireframe: true,
      transparent: true,
      opacity: 0.34,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const ghostMat = new THREE.MeshBasicMaterial({
      color: tintHex,
      transparent: true,
      opacity: 0.14,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    if (kind === 'shark') {
      // Colossal 70-meter Ghostly Blåhaj Leviathan frozen mid-swim
      const body = new THREE.Mesh(new THREE.ConeGeometry(16, 62, 12), ghostMat);
      body.rotation.x = Math.PI / 2;
      const bodyWire = new THREE.Mesh(new THREE.ConeGeometry(16.4, 62.5, 12), wireMat);
      bodyWire.rotation.x = Math.PI / 2;
      const dorsal = new THREE.Mesh(new THREE.ConeGeometry(8, 22, 6), wireMat);
      dorsal.position.set(0, 14, -4);
      const tail = new THREE.Mesh(new THREE.ConeGeometry(14, 24, 5), wireMat);
      tail.position.set(0, 4, 34);
      tail.rotation.x = -Math.PI * 0.35;
      group.add(body, bodyWire, dorsal, tail);
    } else if (kind === 'teapot') {
      // Colossal Sacred Tea Service of Solomon
      const potBody = new THREE.Mesh(new THREE.SphereGeometry(22, 18, 14), ghostMat);
      const potWire = new THREE.Mesh(new THREE.SphereGeometry(22.4, 16, 12), wireMat);
      const lid = new THREE.Mesh(new THREE.CylinderGeometry(8, 12, 6, 14), wireMat);
      lid.position.y = 21;
      const spout = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 5, 22, 10), wireMat);
      spout.position.set(22, 4, 0);
      spout.rotation.z = -0.7;
      const handle = new THREE.Mesh(new THREE.TorusGeometry(11, 2.2, 8, 20), wireMat);
      handle.position.set(-20, 2, 0);
      group.add(potBody, potWire, lid, spout, handle);
    } else if (kind === 'allen_key') {
      // Colossal Sacred Allen Key & Geode of Hiram
      const longArm = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.2, 58, 6), wireMat);
      const shortArm = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.2, 26, 6), wireMat);
      shortArm.rotation.z = Math.PI / 2;
      shortArm.position.set(11, 27, 0);
      const geode = new THREE.Mesh(new THREE.OctahedronGeometry(18, 1), ghostMat);
      geode.position.set(-16, -6, 8);
      group.add(longArm, shortArm, geode);
    } else {
      // Colossal Celestial Astrolabe / Lantern of Nimue & Hermes
      const r1 = new THREE.Mesh(new THREE.TorusGeometry(28, 1.4, 10, 36), wireMat);
      const r2 = new THREE.Mesh(new THREE.TorusGeometry(22, 1.2, 10, 32), wireMat);
      r2.rotation.x = Math.PI / 3;
      const r3 = new THREE.Mesh(new THREE.TorusGeometry(16, 1.0, 10, 28), wireMat);
      r3.rotation.y = Math.PI / 3;
      const core = new THREE.Mesh(new THREE.OctahedronGeometry(9, 0), ghostMat);
      group.add(r1, r2, r3, core);
    }

    return group;
  }

  function build() {
    if (isBuilt && hyperScene) return hyperScene;

    hyperScene = new THREE.Scene();
    hyperScene.background = new THREE.Color(0x03010a);
    // Light, deep-space fog so you can see 750+ meters down the vast cathedral wormhole!
    hyperScene.fog = new THREE.FogExp2(0x060114, 0.00145);

    const amb = new THREE.AmbientLight(0x5b21b6, 1.55);
    hyperScene.add(amb);

    ambientFlashLight = new THREE.PointLight(0x7dd3fc, 0.0, 480);
    ambientFlashLight.position.set(0, 16, -55);
    hyperScene.add(ambientFlashLight);

    tunnelGlowLight = new THREE.PointLight(0xc084fc, 2.5, 420);
    tunnelGlowLight.position.set(0, 0, -140);
    hyperScene.add(tunnelGlowLight);

    const totalLen = RING_COUNT * RING_SPACING;

    // 1. Vast Cathedral Wormhole Rings (68m radius, translucent & wide-spaced)
    tunnelRings.length = 0;
    const ringPalette = [0xc084fc, 0x38bdf8, 0xf472b6, 0x818cf8, 0x2dd4bf, 0xfacc15];
    for (let i = 0; i < RING_COUNT; i++) {
      const rGeo = new THREE.TorusGeometry(TUNNEL_RADIUS, 0.65, 8, 16);
      const baseHex = ringPalette[i % ringPalette.length];
      const rMat = new THREE.MeshBasicMaterial({
        color: baseHex,
        transparent: true,
        opacity: 0.46,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const rMesh = new THREE.Mesh(rGeo, rMat);
      rMesh.position.z = 35.0 - i * RING_SPACING;
      rMesh.rotation.z = i * 0.16;
      hyperScene.add(rMesh);
      tunnelRings.push({
        mesh: rMesh,
        mat: rMat,
        baseColor: new THREE.Color(baseHex),
        phase: i * 0.35
      });
    }

    // 2. Volumetric Gas, Smoke & Nebula Clouds swirling inside and around the wormhole
    nebulaClouds.length = 0;
    const nebTextures = [
      createNebulaCloudTexture('rgba(192, 132, 252, 0.42)', 'rgba(56, 189, 248, 0.35)', 'rgba(244, 114, 182, 0.32)'),
      createNebulaCloudTexture('rgba(56, 189, 248, 0.40)', 'rgba(45, 212, 191, 0.32)', 'rgba(129, 140, 248, 0.36)'),
      createNebulaCloudTexture('rgba(244, 114, 182, 0.38)', 'rgba(250, 204, 21, 0.28)', 'rgba(168, 85, 247, 0.36)')
    ];
    const cloudPlaneGeo = new THREE.PlaneGeometry(76, 76);
    for (let i = 0; i < 54; i++) {
      const cMat = new THREE.MeshBasicMaterial({
        map: nebTextures[i % nebTextures.length],
        transparent: true,
        opacity: 0.36 + (i % 4) * 0.08,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
      });
      const cMesh = new THREE.Mesh(cloudPlaneGeo, cMat);
      const ang = (i * 1.37) % (Math.PI * 2);
      const rad = TUNNEL_RADIUS * (0.42 + (i % 5) * 0.22);
      const cz = 30.0 - (i / 54) * totalLen;
      cMesh.position.set(Math.cos(ang) * rad, Math.sin(ang) * rad, cz);
      cMesh.rotation.z = Math.random() * Math.PI * 2;
      const sc = 0.85 + (i % 4) * 0.38;
      cMesh.scale.set(sc, sc, 1);
      hyperScene.add(cMesh);
      nebulaClouds.push({
        mesh: cMesh,
        ang,
        rad,
        rotSpeed: (i % 2 === 0 ? 1 : -1) * (0.08 + (i % 3) * 0.05)
      });
    }

    // 3. 2001: A Space Odyssey Slit-Scan Stargate Light Curtains on the outer horizon
    stargateSlabs.length = 0;
    const slitTex = createStargateSlitScanTexture();
    const slabGeo = new THREE.PlaneGeometry(140, 85);
    for (let i = 0; i < 16; i++) {
      const sMat = new THREE.MeshBasicMaterial({
        map: slitTex,
        transparent: true,
        opacity: 0.32,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
      });
      const slab = new THREE.Mesh(slabGeo, sMat);
      const side = i % 2 === 0 ? -1 : 1;
      const sz = 20.0 - (i / 16) * totalLen;
      slab.position.set(side * (TUNNEL_RADIUS * 1.18), (i % 4 - 1.5) * 24.0, sz);
      slab.rotation.y = side * Math.PI * 0.46;
      hyperScene.add(slab);
      stargateSlabs.push({ mesh: slab, side, yOffset: (i % 4 - 1.5) * 24.0 });
    }

    // 4. Colossal Frozen-in-Time Wireframe Relics + Occasional Colossal 3D Founder Blåhaj Models!
    godlikeApparitions.length = 0;
    founderSharkModels.length = 0;
    const founderDefs = [
      { id: 'hermes', tint: 0x38bdf8, relic: 'astrolabe', ang: 0.35 },
      { id: 'solomon', tint: 0xfacc15, relic: 'teapot', ang: 2.65 },
      { id: 'hiram', tint: 0xf59e0b, relic: 'allen_key', ang: -0.55 },
      { id: 'nimue', tint: 0xc084fc, relic: 'shark', ang: -2.45 }
    ];

    const loreSharks = (window.BLAHAJ_LORE && window.BLAHAJ_LORE.sharks) ? window.BLAHAJ_LORE.sharks : {};
    if (window.BlahajModels && typeof window.BlahajModels.createPlushShark === 'function') {
      founderDefs.forEach((fDef) => {
        const cfg = loreSharks[fDef.id];
        if (!cfg) return;
        const sharkGroup = window.BlahajModels.createPlushShark(cfg, 0, []);
        const mats = [];
        // Make the colossal 3D shark soft, ethereal, and slightly out-of-focus against the cosmic mist
        sharkGroup.traverse((child) => {
          if (child.isMesh && child.material) {
            const matList = Array.isArray(child.material) ? child.material : [child.material];
            matList.forEach((m) => {
              m.transparent = true;
              m.opacity = 0.0;
              m.depthWrite = false;
              if (m.emissive) {
                m.emissive.setHex(fDef.tint);
                m.emissiveIntensity = 0.35;
              }
              mats.push(m);
            });
          }
        });
        // Add a soft cosmic aura sphere around the colossal shark's head so it feels dreamy & out of focus
        const auraMat = new THREE.MeshBasicMaterial({
          color: fDef.tint,
          transparent: true,
          opacity: 0.0,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        });
        const auraSphere = new THREE.Mesh(new THREE.SphereGeometry(2.4, 16, 12), auraMat);
        auraSphere.position.set(0, 0.2, 0.8);
        sharkGroup.add(auraSphere);
        mats.push(auraMat);

        sharkGroup.scale.setScalar(26.0);
        sharkGroup.visible = false;
        hyperScene.add(sharkGroup);
        founderSharkModels.push({ group: sharkGroup, mats, auraMat, tint: fDef.tint });
      });
    }

    founderDefs.forEach((aDef, idx) => {
      const appGroup = new THREE.Group();

      // Slow-spinning divine halo ring
      const haloRing = new THREE.Mesh(
        new THREE.TorusGeometry(46, 0.7, 10, 48),
        new THREE.MeshBasicMaterial({
          color: aDef.tint,
          transparent: true,
          opacity: 0.25,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        })
      );
      appGroup.add(haloRing);

      // Colossal Frozen-in-Time 3D Wireframe Relic
      const relicMesh = buildColossalFrozenRelic(aDef.relic, aDef.tint);
      appGroup.add(relicMesh);

      const az = -80.0 - idx * (totalLen / founderDefs.length);
      const rad = TUNNEL_RADIUS * 1.48;
      appGroup.position.set(Math.cos(aDef.ang) * rad, Math.sin(aDef.ang) * rad * 0.65, az);
      appGroup.lookAt(new THREE.Vector3(0, 0, az + 65.0));

      hyperScene.add(appGroup);
      godlikeApparitions.push({
        group: appGroup,
        haloRing,
        relicMesh,
        ang: aDef.ang,
        rad
      });
    });

    // 5. High-Speed Multicolored Warp Particle Stream (1100 motes across the vast interior!)
    const pCount = 1100;
    const pPositions = new Float32Array(pCount * 3);
    const pColors = new Float32Array(pCount * 3);
    particleAngles = new Float32Array(pCount);
    particleRadii = new Float32Array(pCount);

    const colChoices = [
      new THREE.Color(0x38bdf8),
      new THREE.Color(0xf472b6),
      new THREE.Color(0xfacc15),
      new THREE.Color(0xc084fc),
      new THREE.Color(0x2dd4bf),
      new THREE.Color(0xffffff)
    ];

    for (let i = 0; i < pCount; i++) {
      const ang = Math.random() * Math.PI * 2;
      const rad = 8.0 + Math.random() * (TUNNEL_RADIUS * 1.15);
      const pz = 35.0 - Math.random() * totalLen;
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
      size: 2.5,
      sizeAttenuation: false,
      vertexColors: true,
      transparent: true,
      opacity: 0.88,
      blending: THREE.AdditiveBlending
    });
    particlePoints = new THREE.Points(pGeo, pMat);
    hyperScene.add(particlePoints);

    // 6. Longitudinal Glowing Plasma Speed Ribbons
    plasmaStreaks.length = 0;
    const streakGeo = new THREE.BoxGeometry(0.32, 0.32, 32.0);
    for (let i = 0; i < 24; i++) {
      const sMat = new THREE.MeshBasicMaterial({
        color: ringPalette[i % ringPalette.length],
        transparent: true,
        opacity: 0.58,
        blending: THREE.AdditiveBlending
      });
      const sMesh = new THREE.Mesh(streakGeo, sMat);
      const ang = (i / 24) * Math.PI * 2;
      const rad = TUNNEL_RADIUS * (0.55 + (i % 4) * 0.16);
      const sz = 25.0 - Math.random() * totalLen;
      sMesh.position.set(Math.cos(ang) * rad, Math.sin(ang) * rad, sz);
      hyperScene.add(sMesh);
      plasmaStreaks.push({ mesh: sMesh, ang, rad, speedMult: 1.45 + (i % 4) * 0.25 });
    }

    // 7. Reusable 3-Ring Branching Off-Ramp Tunnel Mouth (scaled up for the vast cathedral tunnel!)
    rampMeshGroup = new THREE.Group();
    rampRingMats = [];
    for (let ri = 0; ri < 3; ri++) {
      const rMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.96 - ri * 0.22
      });
      const rMesh = new THREE.Mesh(new THREE.TorusGeometry(13.5 - ri * 1.8, 1.05 - ri * 0.15, 12, 36), rMat);
      rMesh.position.z = -ri * 7.5;
      rampMeshGroup.add(rMesh);
      rampRingMats.push(rMat);
    }
    rampDiscMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.38,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const rampDisc = new THREE.Mesh(new THREE.CircleGeometry(11.2, 32), rampDiscMat);
    rampDisc.position.z = -15.0;
    rampMeshGroup.add(rampDisc);
    rampMeshGroup.visible = false;
    hyperScene.add(rampMeshGroup);

    isBuilt = true;
    return hyperScene;
  }

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
        opacity: 0.65,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    haloMesh.position.copy(mid);
    haloMesh.quaternion.copy(quat);

    group.add(coreMesh, haloMesh);
  }

  // Diagonal Cross-Section Lightning Strikes shooting from the tunnel sides right across the open interior!
  function spawnCrossSectionLightning(elapsed, nearShip = false) {
    if (!hyperScene) return;
    const boltGroup = new THREE.Group();
    const palette = [0x38bdf8, 0xf472b6, 0xc084fc, 0xfacc15];
    const haloHex = palette[Math.floor(Math.random() * palette.length)];

    // Erupt from one side of the wormhole wall and slice diagonally through the interior cross-section!
    const zStart = nearShip ? (-18 - Math.random() * 55) : (-25 - Math.random() * 210);
    const zEnd = zStart + (Math.random() - 0.5) * 65.0;
    const startAng = Math.random() * Math.PI * 2;
    // Strike diagonally across to an opposite/diagonal wall quadrant (or terminate mid-air near the flight path!)
    const endAng = startAng + Math.PI * (0.55 + Math.random() * 0.9);
    const endRadMult = Math.random() > 0.25 ? (0.85 + Math.random() * 0.25) : (0.18 + Math.random() * 0.35);

    const cStart = getTunnelCenterAt(zStart, elapsed);
    const cEnd = getTunnelCenterAt(zEnd, elapsed);

    const pStart = new THREE.Vector3(
      cStart.x + Math.cos(startAng) * TUNNEL_RADIUS * 1.05,
      cStart.y + Math.sin(startAng) * TUNNEL_RADIUS * 1.05,
      zStart
    );
    const pEnd = new THREE.Vector3(
      cEnd.x + Math.cos(endAng) * TUNNEL_RADIUS * endRadMult,
      cEnd.y + Math.sin(endAng) * TUNNEL_RADIUS * endRadMult,
      zEnd
    );

    const segs = 8;
    const pts = [];
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      const pt = new THREE.Vector3().lerpVectors(pStart, pEnd, t);
      if (i > 0 && i < segs) {
        pt.x += (Math.random() - 0.5) * 11.5;
        pt.y += (Math.random() - 0.5) * 11.5;
        pt.z += (Math.random() - 0.5) * 8.0;
      }
      pts.push(pt);
    }

    for (let i = 0; i < segs; i++) {
      addVolumetricSegment(boltGroup, pts[i], pts[i + 1], 0.32, 1.15, haloHex);
    }

    // Add 2 diagonal forks branching out into the open cross-section!
    for (let f = 0; f < 2; f++) {
      const forkIdx = 2 + f * 3;
      if (pts[forkIdx]) {
        const fStart = pts[forkIdx].clone();
        const fMid = fStart.clone().add(
          new THREE.Vector3((Math.random() - 0.5) * 22, (Math.random() - 0.5) * 22, (Math.random() - 0.5) * 16)
        );
        const fEnd = fMid.clone().add(
          new THREE.Vector3((Math.random() - 0.5) * 24, (Math.random() - 0.5) * 24, (Math.random() - 0.5) * 18)
        );
        addVolumetricSegment(boltGroup, fStart, fMid, 0.20, 0.72, haloHex);
        addVolumetricSegment(boltGroup, fMid, fEnd, 0.12, 0.48, haloHex);
      }
    }

    hyperScene.add(boltGroup);
    volumetricBolts.push({ group: boltGroup, life: 0.26 + Math.random() * 0.22 });

    flashIntensity = 5.2;
    if (ambientFlashLight) ambientFlashLight.color.setHex(haloHex);
  }

  function spawnNextOffRamp(indexOverride = null) {
    if (typeof indexOverride === 'number') {
      nextBranchIdx = ((indexOverride % BRANCH_DEFS.length) + BRANCH_DEFS.length) % BRANCH_DEFS.length;
    }
    const branch = BRANCH_DEFS[nextBranchIdx];
    const locked = isBranchLocked(branch);
    // Position Off-Ramp Doorways far out on the outer wormhole wall (±38m) so the entire 60m central cylinder is free for barrel rolls & aerobatics!
    activeRamp = {
      branch,
      locked,
      z: -310.0,
      sideX: branch.side * 38.0,
      x: branch.side * 38.0,
      y: 0.0
    };
    if (rampMeshGroup) {
      rampMeshGroup.visible = true;
      rampMeshGroup.position.set(activeRamp.x, activeRamp.y, activeRamp.z);
      rampMeshGroup.rotation.y = branch.side * -0.48;
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
    spawnCrossSectionLightning(0, true);
    updateObjectiveHUD();
  }

  function reindexLoopToStart() {
    nextBranchIdx = 0;
    spawnCrossSectionLightning(performance.now() * 0.001, true);
    spawnCrossSectionLightning(performance.now() * 0.001 + 1.2, true);
    if (window.CozyAudio && window.CozyAudio.portalChime) window.CozyAudio.portalChime();

    if (!activeRamp || activeRamp.z < -55.0) {
      spawnNextOffRamp(0);
    } else {
      nextBranchIdx = BRANCH_DEFS.length - 1;
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
    const distToDoorXY = ufoState.pos
      ? Math.hypot(ufoState.pos.x - activeRamp.x, ufoState.pos.y - activeRamp.y)
      : 999;
    const aligned = distToDoorXY <= 15.5;
    const color = activeRamp.locked ? '#f43f5e' : (aligned ? '#4ade80' : b.color);
    const dirHint = activeRamp.locked
      ? 'SEALED BARRIER'
      : aligned
      ? '✓ IN DOORWAY LANE — FLY THROUGH TO EXIT · BANK CENTER TO ABORT'
      : b.side < 0
      ? '← FLY TO OUTER LEFT WALL DOORWAY'
      : 'FLY TO OUTER RIGHT WALL DOORWAY →';
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
    const rampProximity = activeRamp ? Math.max(0, Math.min(1, (activeRamp.z + 200) / 200)) : 0;

    if (tunnelGlowLight && rampCol) {
      tunnelGlowLight.color.lerp(rampCol, Math.min(1.0, dt * 3.0));
    }

    // 1. Animate vast cathedral wormhole rings (slow, majestic undulation)
    for (let i = 0; i < tunnelRings.length; i++) {
      const r = tunnelRings[i];
      r.mesh.position.z += TUNNEL_SPEED * dt;
      if (r.mesh.position.z > 35.0) {
        r.mesh.position.z -= totalLen;
      }
      const center = getTunnelCenterAt(r.mesh.position.z, elapsed);
      r.mesh.position.x = center.x;
      r.mesh.position.y = center.y;
      r.mesh.rotation.z += dt * 0.22 * (i % 2 === 0 ? 1 : -1);
      const breathe = 1.0 + Math.sin(elapsed * 1.1 + r.phase) * 0.05;
      r.mesh.scale.setScalar(breathe);

      if (rampCol) {
        r.mat.color.copy(r.baseColor).lerp(rampCol, rampProximity * 0.42);
      }
    }

    // 2. Animate Volumetric Nebula & Smoke Clouds drifting past and around the ship
    for (let i = 0; i < nebulaClouds.length; i++) {
      const nc = nebulaClouds[i];
      let cz = nc.mesh.position.z + TUNNEL_SPEED * 0.82 * dt;
      if (cz > 40.0) cz -= totalLen;
      const center = getTunnelCenterAt(cz, elapsed);
      nc.ang += dt * 0.06 * (i % 2 === 0 ? 1 : -1);
      nc.mesh.position.set(
        center.x + Math.cos(nc.ang) * nc.rad,
        center.y + Math.sin(nc.ang) * nc.rad,
        cz
      );
      nc.mesh.rotation.z += nc.rotSpeed * dt;
    }

    // 3. Animate 2001 Stargate Slit-Scan Light Curtains on the outer horizon
    for (let i = 0; i < stargateSlabs.length; i++) {
      const sl = stargateSlabs[i];
      let sz = sl.mesh.position.z + TUNNEL_SPEED * 1.15 * dt;
      if (sz > 40.0) sz -= totalLen;
      const center = getTunnelCenterAt(sz, elapsed);
      sl.mesh.position.set(
        center.x + sl.side * (TUNNEL_RADIUS * 1.18),
        center.y + sl.yOffset,
        sz
      );
    }

    // 4. Animate Colossal Blurred Godlike Character Apparitions & Frozen Relics outside the wormhole
    for (let i = 0; i < godlikeApparitions.length; i++) {
      const ga = godlikeApparitions[i];
      let az = ga.group.position.z + TUNNEL_SPEED * 0.48 * dt;
      if (az > 55.0) az -= totalLen;
      const center = getTunnelCenterAt(az, elapsed);
      ga.group.position.set(
        center.x + Math.cos(ga.ang) * ga.rad,
        center.y + Math.sin(ga.ang) * ga.rad * 0.65,
        az
      );
      if (ga.haloRing) {
        ga.haloRing.rotation.z = elapsed * 0.18 * (i % 2 === 0 ? 1 : -1);
      }
      if (ga.relicMesh) {
        // Frozen-in-time ultra-slow godlike rotation
        ga.relicMesh.rotation.y = elapsed * 0.14 + i;
        ga.relicMesh.rotation.x = Math.sin(elapsed * 0.22 + i) * 0.25;
      }
    }

    // 4B. Occasional Colossal 3D Founder Blåhaj Models staring in through the tunnel wall before being whisked away by lightning!
    if (activePeeringShark) {
      const ps = activePeeringShark;
      ps.z += TUNNEL_SPEED * (ps.whisking ? 1.35 : 0.36) * dt;
      const center = getTunnelCenterAt(ps.z, elapsed);
      ps.model.group.position.set(
        center.x + Math.cos(ps.ang) * ps.rad,
        center.y + Math.sin(ps.ang) * ps.rad * 0.68,
        ps.z
      );

      // Face directly inward toward the tunnel interior & rotate slowly in a godlike trance
      ps.model.group.lookAt(new THREE.Vector3(center.x, center.y, ps.z + 14.0));
      ps.spinAngle += dt * 0.28;
      ps.model.group.rotateZ(Math.sin(ps.spinAngle) * 0.22);

      if (!ps.whisking) {
        const fadeIn = Math.min(1.0, (ps.z + 250.0) / 80.0);
        const targetOp = 0.56 * Math.max(0.05, fadeIn);
        ps.model.mats.forEach((m) => {
          m.opacity = m === ps.model.auraMat ? targetOp * 0.24 : targetOp;
        });
        if (ps.z >= -44.0) {
          ps.whisking = true;
          spawnCrossSectionLightning(elapsed, true);
        }
      } else {
        ps.whiskProg += dt * 1.6;
        const fadeOp = Math.max(0, 0.56 * (1.0 - ps.whiskProg));
        ps.model.mats.forEach((m) => {
          m.opacity = m === ps.model.auraMat ? fadeOp * 0.28 : fadeOp;
        });
        const stretch = 26.0 * (1.0 + ps.whiskProg * 0.9);
        ps.model.group.scale.set(26.0 / (1.0 + ps.whiskProg * 0.5), 26.0 / (1.0 + ps.whiskProg * 0.5), stretch);
        ps.rad += dt * 44.0;
        if (ps.whiskProg >= 1.0) {
          ps.model.group.visible = false;
          ps.model.group.scale.setScalar(26.0);
          activePeeringShark = null;
          peeringSharkTimer = 6.5 + Math.random() * 5.0;
        }
      }
    } else if (founderSharkModels.length > 0) {
      peeringSharkTimer -= dt;
      if (peeringSharkTimer <= 0) {
        const model = founderSharkModels[nextFounderSharkIdx % founderSharkModels.length];
        nextFounderSharkIdx = (nextFounderSharkIdx + 1) % founderSharkModels.length;
        const sideAng = (Math.random() > 0.5 ? 0.25 : Math.PI - 0.25) + (Math.random() - 0.5) * 0.65;
        const startZ = -250.0;
        const rad = TUNNEL_RADIUS * 1.18; // Right up against the outside of the 68m tunnel wall!
        const center = getTunnelCenterAt(startZ, elapsed);
        model.group.position.set(center.x + Math.cos(sideAng) * rad, center.y + Math.sin(sideAng) * rad * 0.68, startZ);
        model.group.scale.setScalar(26.0);
        model.group.visible = true;
        activePeeringShark = {
          model,
          ang: sideAng,
          rad,
          z: startZ,
          spinAngle: Math.random() * Math.PI * 2,
          whisking: false,
          whiskProg: 0
        };
      }
    }

    // 5. Animate high-speed multicolored warp particle stream
    if (particlePoints && particlePoints.geometry && particlePoints.geometry.attributes.position) {
      const posArr = particlePoints.geometry.attributes.position.array;
      for (let i = 0; i < particleAngles.length; i++) {
        let pz = posArr[i * 3 + 2] + TUNNEL_SPEED * 1.55 * dt;
        if (pz > 35.0) pz -= totalLen;
        particleAngles[i] += dt * (i % 2 === 0 ? 0.35 : -0.28);
        const center = getTunnelCenterAt(pz, elapsed);
        const rad = particleRadii[i];
        posArr[i * 3] = center.x + Math.cos(particleAngles[i]) * rad;
        posArr[i * 3 + 1] = center.y + Math.sin(particleAngles[i]) * rad;
        posArr[i * 3 + 2] = pz;
      }
      particlePoints.geometry.attributes.position.needsUpdate = true;
    }

    // 6. Animate longitudinal plasma speed ribbons
    for (let i = 0; i < plasmaStreaks.length; i++) {
      const s = plasmaStreaks[i];
      let sz = s.mesh.position.z + TUNNEL_SPEED * s.speedMult * dt;
      if (sz > 35.0) sz -= totalLen;
      s.ang += dt * 0.18;
      const center = getTunnelCenterAt(sz, elapsed);
      s.mesh.position.set(center.x + Math.cos(s.ang) * s.rad, center.y + Math.sin(s.ang) * s.rad, sz);
    }

    // 7. Diagonal Cross-Section Lightning Strikes shooting from the tunnel walls across the interior!
    lightningTimer -= dt;
    if (lightningTimer <= 0) {
      lightningTimer = 0.18 + Math.random() * 0.28;
      spawnCrossSectionLightning(elapsed, Math.random() > 0.38);
    }
    if (ambientFlashLight) {
      flashIntensity = Math.max(0, flashIntensity - dt * 13.0);
      ambientFlashLight.intensity = flashIntensity;
    }
    for (let i = volumetricBolts.length - 1; i >= 0; i--) {
      const vb = volumetricBolts[i];
      vb.life -= dt;
      vb.group.position.z += TUNNEL_SPEED * 0.45 * dt;
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

    // 8. Advance Staggered Off-Ramp Queue (with Last-Second Split-Decision Pull-Away!)
    if (activeRamp) {
      activeRamp.z += TUNNEL_SPEED * 0.62 * dt;
      const center = getTunnelCenterAt(activeRamp.z, elapsed);
      activeRamp.x = center.x + activeRamp.sideX;
      activeRamp.y = center.y;

      const distToDoorXY = ufoState.pos
        ? Math.hypot(ufoState.pos.x - activeRamp.x, ufoState.pos.y - activeRamp.y)
        : 999;
      const alignedNow = distToDoorXY <= 15.5;

      if (rampMeshGroup) {
        rampMeshGroup.position.set(activeRamp.x, activeRamp.y, activeRamp.z);
        rampMeshGroup.rotation.z = elapsed * 2.2;
        const pulseScale = alignedNow && !activeRamp.locked ? 1.15 + Math.sin(elapsed * 14) * 0.06 : 1.0;
        rampMeshGroup.scale.setScalar(pulseScale);
      }

      const shipZ = ufoState.pos ? ufoState.pos.z : 0;
      if (!transitionTriggered && ufoState.pos && Math.abs(activeRamp.z - shipZ) <= 7.5 && alignedNow) {
        if (activeRamp.locked) {
          if (bounceCooldown <= 0) {
            bounceCooldown = 0.9;
            ufoState.pos.x *= 0.35;
            if (ufoState.vel) ufoState.vel.x = -activeRamp.branch.side * 34.0;
            spawnCrossSectionLightning(elapsed, true);
            if (window.CozyAudio && window.CozyAudio.trapHit) window.CozyAudio.trapHit();
            if (window.showToast) {
              window.showToast(
                '🔒 UNCHARTED BRANCH SEALED!',
                'This reality doorway requires a Star-Chart or Key to unseal!'
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

      if (activeRamp.z > 24.0) {
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
