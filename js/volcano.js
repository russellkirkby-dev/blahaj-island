// ============================================================================
// BLÅHAJ ISLAND — THE SACRED VOLCANO
// A fully instanced trial dungeon: Gatehall -> Molten Causeway -> Ember Spiral
// -> Crater Overlook. Lives in its own THREE.Scene with its own sky, fog,
// lighting and floor logic so it can never interfere with the island terrain.
//
// Coordinates are local to the instance. The player enters at (0, 0, -2) facing
// -Z and progresses toward negative Z.
// ============================================================================

window.BlahajVolcano = (function () {
  'use strict';

  // --------------------------------------------------------------------------
  // CONSTANTS
  // --------------------------------------------------------------------------
  const LAVA_Y = -6; // surface of the dungeon lava sea
  const LAKE_Y = -60; // surface of the crater lava lake
  const CRATER_CENTER_Z = -430;
  const SPIRAL = { x: 0, z: -296, radius: 14, halfWidth: 3.3, turns: 1.5, rise: 22 };
  const START = { x: 0, y: 0, z: -2, rotY: Math.PI };
  const BALCONY = { cx: 0, cz: -354.5, hw: 16, hd: 8.5, y: 22 };

  // Cave cross-section keyframes along the path (z decreases forward).
  // rx / ry = ellipse radii, cy = ellipse centre height, n = rock roughness.
  const PROFILE = [
    { z: 14, rx: 13, ry: 12, cy: 7, n: 0.5 },
    { z: -6, rx: 16, ry: 15, cy: 8, n: 1.2 },
    { z: -68, rx: 16, ry: 15, cy: 8, n: 1.2 },
    { z: -78, rx: 7, ry: 4.6, cy: 3.6, n: 0.3 },
    { z: -86, rx: 7, ry: 4.6, cy: 3.6, n: 0.3 },
    { z: -100, rx: 44, ry: 28, cy: 8, n: 2.2 },
    { z: -248, rx: 44, ry: 28, cy: 8, n: 2.2 },
    { z: -260, rx: 7, ry: 4.6, cy: 3.6, n: 0.3 },
    { z: -274, rx: 7, ry: 4.6, cy: 3.6, n: 0.3 },
    { z: -284, rx: 24, ry: 40, cy: 24, n: 1.8 },
    { z: -312, rx: 24, ry: 40, cy: 24, n: 1.8 },
    { z: -322, rx: 7.5, ry: 8, cy: 25.5, n: 0.3 },
    { z: -346, rx: 7.5, ry: 8, cy: 25.5, n: 0.3 }
  ];

  const CRATER_PROFILE = [
    [52, -62], [56, -58], [62, -45], [68, -28], [75, -6], [81, 12], [86, 26],
    [94, 46], [108, 72], [130, 106], [160, 142], [196, 182]
  ];

  const ROOM_TITLES = {
    gate: 'The Obsidian Gatehall',
    causeway: 'The Molten Causeway',
    spiral: 'The Ember Spiral',
    overlook: 'The Crater Overlook'
  };

  // --------------------------------------------------------------------------
  // STATE
  // --------------------------------------------------------------------------
  let built = false;
  let active = false;
  let time = 0;
  let scn = null;
  let skyMesh = null;
  let lakeLight = null;
  let lakeFlare = 0;
  let currentRoom = '';
  let completed = false;
  let relicTaken = false;
  let relic = null;

  const surfaces = [];
  const pendulums = [];
  const geysers = [];
  const flameJets = [];
  const floorSpikes = [];
  const platforms = [];
  const flames = [];
  const carrots = [];
  const lavaMaterials = [];
  const bridges = [];
  const plates = {};
  let embersCave = null;
  let embersCrater = null;
  let splash = null;

  // Callbacks wired up by main.js.
  const on = {
    toast() {},
    complete() {},
    relic() {},
    carrotLost() {},
    checkpoint() {},
    lavaFall() {}
  };

  function setHandlers(handlers) {
    if (handlers && typeof handlers === 'object') {
      Object.assign(on, handlers);
    }
    return on;
  }

  // --------------------------------------------------------------------------
  // MATH & NOISE HELPERS
  // --------------------------------------------------------------------------
  function smoothstep(a, b, x) {
    const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function hash(n) {
    const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return s - Math.floor(s);
  }

  function vnoise(x, y) {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = x - ix;
    const fy = y - iy;
    const a = hash(ix + iy * 57);
    const b = hash(ix + 1 + iy * 57);
    const c = hash(ix + (iy + 1) * 57);
    const d = hash(ix + 1 + (iy + 1) * 57);
    const ux = fx * fx * (3 - 2 * fx);
    const uy = fy * fy * (3 - 2 * fy);
    return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
  }

  function fbm(x, y) {
    return vnoise(x, y) * 0.55 + vnoise(x * 2.1, y * 2.1) * 0.28 + vnoise(x * 4.3, y * 4.3) * 0.17;
  }

  function profileAt(z) {
    if (z >= PROFILE[0].z) return PROFILE[0];
    for (let i = 0; i < PROFILE.length - 1; i++) {
      const a = PROFILE[i];
      const b = PROFILE[i + 1];
      if (z <= a.z && z >= b.z) {
        const t = (a.z - z) / (a.z - b.z);
        const s = t * t * (3 - 2 * t);
        return {
          rx: lerp(a.rx, b.rx, s),
          ry: lerp(a.ry, b.ry, s),
          cy: lerp(a.cy, b.cy, s),
          n: lerp(a.n, b.n, s)
        };
      }
    }
    return PROFILE[PROFILE.length - 1];
  }

  // --------------------------------------------------------------------------
  // FLOOR / COLLISION LOGIC
  // A "surface" answers: what height is the walkable floor at (x, z)?
  // `safe` surfaces have invisible rails so you can't walk off their edges.
  // --------------------------------------------------------------------------
  function addSurface(test, safe) {
    const s = { test, safe };
    surfaces.push(s);
    return s;
  }

  function rectSurface(cx, cz, hw, hd, y, safe = true) {
    return addSurface((x, z) => (Math.abs(x - cx) <= hw && Math.abs(z - cz) <= hd ? y : null), safe);
  }

  function getFloorInfo(x, z, refY) {
    let best = null;
    let bestSurface = null;
    const checkRef = typeof refY === 'number' ? refY : 1000;
    for (let i = 0; i < surfaces.length; i++) {
      const y = surfaces[i].test(x, z, checkRef);
      if (y !== null && y <= checkRef + 0.65 && (best === null || y > best)) {
        best = y;
        bestSurface = surfaces[i];
      }
    }
    return best === null ? null : { y: best, safe: bestSurface.safe };
  }

  function getFloorHeight(x, z, refY) {
    const info = getFloorInfo(x, z, refY);
    return info ? info.y : -Infinity;
  }

  // Applies cave walls + rails to a proposed horizontal move.
  // Supports both resolveMove(pos, next, grounded) and resolveMove(px, pz, py, nx, nz, grounded).
  function resolveMove(a, b, c, d, e, f) {
    let px, pz, py, nx, nz, grounded;
    if (typeof a === 'object' && a !== null && typeof b === 'object' && b !== null) {
      px = a.x;
      py = a.y || 0;
      pz = a.z;
      nx = b.x;
      nz = b.z;
      grounded = typeof c === 'boolean' ? c : true;
    } else {
      px = a;
      pz = b;
      py = c || 0;
      nx = d;
      nz = e;
      grounded = typeof f === 'boolean' ? f : true;
    }

    if (isNaN(nx) || isNaN(nz)) return { x: px || 0, z: pz || 0 };
    let lim;
    if (nz <= -346) {
      // Overlook Balcony: allow full width of balcony (from -14.8 to +14.8) so sharks can reach the portal and carrots
      lim = BALCONY.hw - 1.2;
    } else {
      const prof = profileAt(nz);
      lim = (prof && prof.rx ? prof.rx : 10) - 1.6;
    }
    nx = Math.max(-lim, Math.min(lim, nx));

    if (grounded) {
      const cur = getFloorInfo(px, pz, py + 0.5);
      const nxt = getFloorInfo(nx, nz, py + 0.5);
      if (cur && cur.safe && !nxt) {
        if (getFloorInfo(nx, pz, py + 0.5)) return { x: nx, z: pz };
        if (getFloorInfo(px, nz, py + 0.5)) return { x: px, z: nz };
        return { x: px, z: pz };
      }
    }
    return { x: nx, z: nz };
  }

  function getCeilingY(a, b) {
    const z = (b !== undefined) ? b : a;
    if (z < -346) return Infinity;
    const p = profileAt(z);
    return p ? (p.cy + p.ry * 0.9) : 40;
  }

  function getRoom(z) {
    if (z > -76) return 'gate';
    if (z > -268) return 'causeway';
    if (z > -319) return 'spiral';
    return 'overlook';
  }

  // --------------------------------------------------------------------------
  // SHARED MATERIALS & TEXTURES
  // --------------------------------------------------------------------------
  let rockBump = null;
  function getRockBump() {
    if (rockBump) return rockBump;
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = '#808080';
    g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 3200; i++) {
      const v = 70 + Math.floor(Math.random() * 120);
      g.fillStyle = `rgb(${v},${v},${v})`;
      const r = 1 + Math.random() * 7;
      g.beginPath();
      g.arc(Math.random() * 256, Math.random() * 256, r, 0, Math.PI * 2);
      g.fill();
    }
    rockBump = new THREE.CanvasTexture(c);
    rockBump.wrapS = rockBump.wrapT = THREE.RepeatWrapping;
    return rockBump;
  }

  const mats = {};
  function getMats() {
    if (mats.basalt) return mats;
    mats.basalt = new THREE.MeshStandardMaterial({
      color: 0x2c2530, roughness: 0.9, metalness: 0.05, bumpMap: getRockBump(), bumpScale: 0.5
    });
    mats.floor = new THREE.MeshStandardMaterial({
      color: 0x3a3038, roughness: 0.85, metalness: 0.08, bumpMap: getRockBump(), bumpScale: 0.35
    });
    mats.brass = new THREE.MeshStandardMaterial({ color: 0xd8aa5b, roughness: 0.3, metalness: 0.85 });
    mats.glow = new THREE.MeshBasicMaterial({ color: 0xff7a2a });
    mats.flame = new THREE.MeshBasicMaterial({ color: 0xffa24a });
    mats.blade = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.2, metalness: 0.9 });
    mats.obsidian = new THREE.MeshStandardMaterial({
      color: 0x0f1117, roughness: 0.12, metalness: 0.85
    });
    mats.charredIron = new THREE.MeshStandardMaterial({
      color: 0x1e242c, roughness: 0.65, metalness: 0.75
    });
    mats.magmaVein = new THREE.MeshStandardMaterial({
      color: 0xff4500, emissive: 0xff3b00, emissiveIntensity: 0.95, roughness: 0.4
    });
    mats.sulfur = new THREE.MeshStandardMaterial({
      color: 0xeab308, roughness: 0.8, metalness: 0.1
    });
    return mats;
  }

  const LAVA_VERT = `
    varying vec3 vW;
    void main() {
      vec4 w = modelMatrix * vec4(position, 1.0);
      vW = w.xyz;
      gl_Position = projectionMatrix * viewMatrix * w;
    }`;

  const LAVA_FRAG = `
    uniform float uTime;
    varying vec3 vW;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float noise(vec2 p) {
      vec2 i = floor(p), f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
                 mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
    }
    float fbm(vec2 p) {
      float v = 0.0, a = 0.5;
      for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.1; a *= 0.5; }
      return v;
    }
    void main() {
      #ifdef VERTICAL
        vec2 p = vec2(vW.x * 0.07 + vW.z * 0.07, vW.y * 0.06 - uTime * 0.45);
      #else
        vec2 p = vW.xz * 0.055;
      #endif
      float t = uTime * 0.06;
      float n = fbm(p + vec2(t, -t * 0.7));
      float n2 = fbm(p * 2.2 - vec2(t * 1.3, t));
      float crust = smoothstep(0.46, 0.68, n * 0.65 + n2 * 0.45);
      float glow = 1.0 - crust;
      vec3 col = mix(vec3(0.08, 0.015, 0.015), vec3(1.5, 0.45, 0.06), glow);
      col += vec3(1.3, 0.75, 0.12) * pow(glow, 4.0) * 0.9;
      gl_FragColor = vec4(col, 1.0);
    }`;

  function makeLavaMaterial(vertical) {
    const m = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: LAVA_VERT,
      fragmentShader: LAVA_FRAG,
      defines: vertical ? { VERTICAL: 1 } : {},
      side: THREE.DoubleSide
    });
    lavaMaterials.push(m);
    return m;
  }

  // --------------------------------------------------------------------------
  // GEOMETRY BUILDERS
  // --------------------------------------------------------------------------
  function buildCaveTube() {
    const zFrom = 14;
    const zTo = -346;
    const rings = 230;
    const segs = 44;
    const pos = [];
    const col = [];
    const uv = [];
    const idx = [];
    const c = new THREE.Color();

    for (let i = 0; i <= rings; i++) {
      const z = zFrom + (zTo - zFrom) * (i / rings);
      const p = profileAt(z);
      for (let j = 0; j <= segs; j++) {
        const a = (j / segs) * Math.PI * 2;
        const d = (fbm(z * 0.05 + Math.cos(a) * 2.6, Math.sin(a) * 2.6 + 7.7) - 0.5) * 2 * p.n * 2.2;
        const x = Math.sin(a) * (p.rx + d);
        const y = p.cy + Math.cos(a) * (p.ry + d);
        pos.push(x, y, z);
        uv.push((j / segs) * 10, z * 0.07);

        const shade = 0.55 + fbm(z * 0.11 + x * 0.07, y * 0.09) * 0.9;
        const glow = smoothstep(10, -14, y) * 0.5;
        c.setRGB(0.1 * shade + glow * 0.55, 0.075 * shade + glow * 0.16, 0.085 * shade + glow * 0.03);
        col.push(c.r, c.g, c.b);
      }
    }
    for (let i = 0; i < rings; i++) {
      for (let j = 0; j < segs; j++) {
        const a = i * (segs + 1) + j;
        const b = a + segs + 1;
        idx.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true, roughness: 0.95, metalness: 0.03, side: THREE.DoubleSide,
      bumpMap: getRockBump(), bumpScale: 1.4
    });
    return new THREE.Mesh(geo, mat);
  }

  function buildCrater() {
    const curve = new THREE.CatmullRomCurve3(CRATER_PROFILE.map(([r, y]) => new THREE.Vector3(r, y, 0)));
    const prof = curve.getPoints(70);
    const segs = 96;
    const pos = [];
    const col = [];
    const idx = [];
    const c = new THREE.Color();

    prof.forEach((pt) => {
      for (let j = 0; j <= segs; j++) {
        const phi = (j / segs) * Math.PI * 2;
        const amp = 5 + Math.max(0, pt.y) * 0.05;
        const n = (fbm(Math.cos(phi) * 3.2 + pt.y * 0.05, Math.sin(phi) * 3.2) - 0.5) * 2 * amp;
        const r = pt.x + n;
        const y = pt.y + (fbm(phi * 5, pt.y * 0.08) - 0.5) * 3;
        pos.push(Math.sin(phi) * r, y, Math.cos(phi) * r);

        const band = 0.5 + 0.5 * Math.sin(y * 0.35 + n * 0.5);
        const lava = smoothstep(-20, -62, y);
        c.setRGB(
          0.13 * (0.6 + 0.5 * band) + lava * 0.9,
          0.09 * (0.6 + 0.5 * band) + lava * 0.28,
          0.11 * (0.6 + 0.5 * band) + lava * 0.04
        );
        col.push(c.r, c.g, c.b);
      }
    });

    // Open a doorway in the wall where the final corridor emerges.
    for (let i = 0; i < prof.length - 1; i++) {
      for (let j = 0; j < segs; j++) {
        const a = i * (segs + 1) + j;
        const b = a + segs + 1;
        const mx = (pos[a * 3] + pos[(b + 1) * 3]) / 2;
        const my = (pos[a * 3 + 1] + pos[(b + 1) * 3 + 1]) / 2;
        const mz = (pos[a * 3 + 2] + pos[(b + 1) * 3 + 2]) / 2 + CRATER_CENTER_Z;
        if (Math.abs(mx) < 10 && my > 13 && my < 38 && mz > -362) continue;
        idx.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(
      geo,
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, side: THREE.DoubleSide })
    );
    mesh.position.set(0, 0, CRATER_CENTER_Z);
    return mesh;
  }

  function slab(cx, cz, hw, hd, y, thick = 1.4, trimSides = null) {
    const m = getMats();
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(hw * 2, thick, hd * 2), m.floor);
    mesh.position.set(cx, y - thick / 2, cz);
    scn.add(mesh);

    // Molten edge trim so exposed ledges read clearly against the dark rock.
    const t = 0.12;
    const sides = [
      { id: 'front', ox: 0, oz: hd, ex: hw, ez: t / 2 },
      { id: 'back', ox: 0, oz: -hd, ex: hw, ez: t / 2 },
      { id: 'right', ox: hw, oz: 0, ex: t / 2, ez: hd },
      { id: 'left', ox: -hw, oz: 0, ex: t / 2, ez: hd }
    ];
    sides.forEach(({ id, ox, oz, ex, ez }) => {
      if (trimSides && trimSides[id] === false) return;
      const trim = new THREE.Mesh(new THREE.BoxGeometry(ex * 2 + 0.02, 0.1, ez * 2 + 0.02), m.glow);
      trim.position.set(cx + ox, y + 0.02, cz + oz);
      scn.add(trim);
    });
    return mesh;
  }

  function wallBlock(cx, cz, w, d, h, y = 0) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), getMats().basalt);
    mesh.position.set(cx, y + h / 2, cz);
    scn.add(mesh);
    return mesh;
  }

  function brazier(x, y, z) {
    const m = getMats();
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.3, 0.7, 10), m.brass);
    bowl.position.set(x, y + 1.0, z);
    scn.add(bowl);
    const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 1.0, 8), m.basalt);
    stand.position.set(x, y + 0.5, z);
    scn.add(stand);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.3, 8), m.flame);
    flame.position.set(x, y + 1.85, z);
    scn.add(flame);
    flames.push({ mesh: flame, phase: Math.random() * 6, baseY: y + 1.85 });
  }

  function makePlaque(x, base, z, rotY, title, body, customW, customH) {
    // Billboard signs inside crater instance replaced by screen HUD notification cards
    return null;
  }

  // --------------------------------------------------------------------------
  // TRAPS & MECHANISMS
  // --------------------------------------------------------------------------
  // Detailed Swinging Obsidian Battleaxe (Guillotine Pendulum)
  function addPendulum(z, phase, speed) {
    const m = getMats();
    const pivotY = 14;
    const len = 11.5;
    const pivot = new THREE.Group();
    pivot.position.set(0, pivotY, z);

    // Heavy overhead gantry beam spanning the vault
    const beam = new THREE.Mesh(new THREE.BoxGeometry(26, 1.4, 2.2), m.basalt);
    beam.position.set(0, pivotY + 0.9, z);
    scn.add(beam);

    // Forged iron gantry flanges with bolts
    [-11, 11].forEach((bx) => {
      const gBrace = new THREE.Mesh(new THREE.BoxGeometry(2.2, 3.2, 2.4), m.charredIron);
      gBrace.position.set(bx, pivotY + 1.2, z);
      scn.add(gBrace);
    });

    // Massive Iron Swivel Hub with Brass Teeth Cog
    const cogHub = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.8, 20), m.charredIron);
    cogHub.rotation.x = Math.PI / 2;
    pivot.add(cogHub);

    const brassCog = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.35, 12), m.brass);
    brassCog.rotation.x = Math.PI / 2;
    pivot.add(brassCog);

    const hubCore = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 12), m.magmaVein);
    pivot.add(hubCore);

    // Heavy Dual-Strut Reinforced Truss Shaft
    [-0.28, 0.28].forEach((ox) => {
      const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, len, 8), m.charredIron);
      strut.position.set(ox, -len / 2, 0);
      pivot.add(strut);
    });

    // Cross-bracing diamond plates and runic collars along the shaft
    for (let k = 1; k <= 3; k++) {
      const cy = (-len * k) / 4;
      const collar = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.35, 0.45), m.brass);
      collar.position.set(0, cy, 0);
      pivot.add(collar);

      const runeStitch = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.12, 0.48), m.magmaVein);
      runeStitch.position.set(0, cy, 0);
      pivot.add(runeStitch);
    }

    // Heavy wrought iron suspension chains flanking the shaft
    [-0.65, 0.65].forEach((cx) => {
      const chainRod = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, len * 0.75, 6), m.brass);
      chainRod.position.set(cx, -len * 0.45, 0);
      pivot.add(chainRod);
    });

    // The Massive Double-Bearded Obsidian Battleaxe Cleaver
    const axeHead = new THREE.Group();
    axeHead.position.set(0, -len, 0);

    // Heavy socket eye collar with brass studs
    const socket = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.6, 0.7), m.charredIron);
    axeHead.add(socket);

    const socketRing = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.12, 8, 24), m.brass);
    socketRing.rotation.y = Math.PI / 2;
    axeHead.add(socketRing);

    // Glassy Pitch-Black Obsidian Crescent Blades (Left & Right Wings)
    [-1, 1].forEach((side) => {
      const bladeWing = new THREE.Group();
      bladeWing.scale.x = side;

      // Curved crescent blade body
      const c1 = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.9, 0.22, 24, 1, false, -0.65, 1.3), m.obsidian);
      c1.rotation.z = Math.PI / 2;
      c1.position.set(1.5, 0, 0);
      bladeWing.add(c1);

      // Razor-sharp glowing molten cutting edge inlay
      const edge = new THREE.Mesh(new THREE.TorusGeometry(1.92, 0.08, 8, 28, 1.3), m.magmaVein);
      edge.rotation.z = -0.65;
      edge.position.set(1.5, 0, 0);
      bladeWing.add(edge);

      // Serrated obsidian horn spike at upper tip
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.95, 6), m.obsidian);
      horn.rotation.z = -1.1;
      horn.position.set(2.8, 1.1, 0);
      bladeWing.add(horn);

      // Lower beard hook spike
      const beardSpike = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.85, 6), m.obsidian);
      beardSpike.rotation.z = 1.2;
      beardSpike.position.set(2.7, -1.0, 0);
      bladeWing.add(beardSpike);

      // Runic glyph plate on blade face
      const glyph = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.15, 0.26), m.glow);
      glyph.position.set(1.4, 0, 0);
      bladeWing.add(glyph);

      axeHead.add(bladeWing);
    });

    // Bottom Piercing Obsidian Stiletto Spike
    const bottomSpike = new THREE.Mesh(new THREE.ConeGeometry(0.32, 1.4, 6), m.obsidian);
    bottomSpike.rotation.x = Math.PI;
    bottomSpike.position.set(0, -1.3, 0);
    axeHead.add(bottomSpike);

    // Glowing motion-blur kinetic trail crescent (flares at high swing velocity)
    const trail = new THREE.Mesh(
      new THREE.RingGeometry(2.4, 3.1, 24, 1, -0.7, 1.4),
      new THREE.MeshBasicMaterial({ color: 0xff6a00, transparent: true, opacity: 0, side: THREE.DoubleSide })
    );
    trail.position.set(0, 0, 0);
    axeHead.add(trail);

    pivot.add(axeHead);
    scn.add(pivot);

    pendulums.push({
      pivot, len, pivotY, z, phase, speed,
      trail,
      hit: new THREE.Vector3(0, pivotY - len, z)
    });
  }

  // Realistic Volcanic Fumarole Crags & Multi-Layered Plumes
  function addGeyser(x, y, z, phase, isLavaSea = false) {
    const m = getMats();
    const group = new THREE.Group();
    group.position.set(x, y, z);

    // Conical Volcanic Fumarole Crag Mound
    const cragRadius = isLavaSea ? 2.5 : 1.7;
    const cragHeight = isLavaSea ? 1.6 : 0.65;
    const cragBase = new THREE.Mesh(
      new THREE.CylinderGeometry(cragRadius * 0.72, cragRadius, cragHeight, 14),
      m.basalt
    );
    cragBase.position.y = cragHeight * 0.5;
    group.add(cragBase);

    // Encrusted Sulfur & Magma Mineral Ridges
    for (let r = 0; r < 6; r++) {
      const ang = (r / 6) * Math.PI * 2;
      const rockRadius = cragRadius * 0.78;
      const rx = Math.sin(ang) * rockRadius;
      const rz = Math.cos(ang) * rockRadius;
      const sulfurMat = (r % 2 === 0) ? m.sulfur : m.basalt;
      const rimRock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.35 + (r % 3) * 0.12, 0),
        sulfurMat
      );
      rimRock.position.set(rx, cragHeight + 0.15, rz);
      rimRock.rotation.set(r * 0.5, r * 1.1, r * 0.3);
      group.add(rimRock);
    }

    // Heavy Forged Iron Throat Ring with Rivets
    const ironRing = new THREE.Mesh(
      new THREE.TorusGeometry(cragRadius * 0.62, 0.12, 8, 20),
      m.charredIron
    );
    ironRing.rotation.x = Math.PI / 2;
    ironRing.position.y = cragHeight + 0.08;
    group.add(ironRing);

    // Glowing Magma Throat (Molten core cavity deep inside the vent)
    const throatCore = new THREE.Mesh(
      new THREE.CircleGeometry(cragRadius * 0.58, 16),
      new THREE.MeshBasicMaterial({ color: 0xff3b00 })
    );
    throatCore.rotation.x = -Math.PI / 2;
    throatCore.position.y = cragHeight + 0.06;
    group.add(throatCore);

    // Dynamic Warning / Telegraph Hot Glow Circle
    const warn = new THREE.Mesh(
      new THREE.RingGeometry(cragRadius * 0.6, cragRadius * 1.5, 24),
      new THREE.MeshBasicMaterial({ color: 0xff5a14, transparent: true, opacity: 0, side: THREE.DoubleSide })
    );
    warn.rotation.x = -Math.PI / 2;
    warn.position.y = cragHeight + 0.07;
    group.add(warn);

    // Multi-Layered Realistic Eruption Plume Group
    const plume = new THREE.Group();
    plume.position.set(0, cragHeight + 0.1, 0);

    // Layer A: Intense Superheated Core Plasma Jet (White-Gold, high velocity center)
    const plumeCore = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.25, 7.2, 14),
      new THREE.MeshBasicMaterial({ color: 0xfffbeb, transparent: true, opacity: 0.95 })
    );
    plumeCore.position.y = 3.6;
    plume.add(plumeCore);

    // Layer B: Swirling Orange-Red Magma Column (Billowing fire mantle)
    const plumeMantle = new THREE.Mesh(
      new THREE.CylinderGeometry(1.2, 0.65, 6.8, 16),
      new THREE.MeshBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.82 })
    );
    plumeMantle.position.y = 3.4;
    plume.add(plumeMantle);

    // Layer C: Billowing Ash & Smoke Head at the summit (charcoal cloud puffs)
    const smokeGroup = new THREE.Group();
    smokeGroup.position.y = 6.8;
    for (let c = 0; c < 5; c++) {
      const ang = (c / 5) * Math.PI * 2;
      const sMesh = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.95 + (c % 2) * 0.25, 1),
        new THREE.MeshBasicMaterial({ color: (c % 2 === 0) ? 0x334155 : 0x1e293b, transparent: true, opacity: 0.78 })
      );
      sMesh.position.set(Math.sin(ang) * 0.75, (c % 3) * 0.35, Math.cos(ang) * 0.75);
      smokeGroup.add(sMesh);
    }
    plume.add(smokeGroup);

    // Layer D: Flying Lava Droplets / Volcanic Sparks
    const sparks = [];
    for (let sp = 0; sp < 6; sp++) {
      const sparkMesh = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.18, 0),
        new THREE.MeshBasicMaterial({ color: 0xfbbf24 })
      );
      sparkMesh.position.set((Math.random() - 0.5) * 1.2, 2.0 + sp * 0.8, (Math.random() - 0.5) * 1.2);
      plume.add(sparkMesh);
      sparks.push(sparkMesh);
    }

    plume.visible = false;
    group.add(plume);

    // Dedicated Dynamic Point Light for geyser flashes
    const light = new THREE.PointLight(0xff6a00, 0, 18);
    light.position.set(0, cragHeight + 2.0, 0);
    group.add(light);

    scn.add(group);

    geysers.push({
      x, y, z, phase,
      period: 4.6,
      active: false,
      group,
      plume,
      plumeCore,
      plumeMantle,
      smokeGroup,
      sparks,
      warn,
      light,
      cragHeight
    });
  }

  // NEW SPIRAL TRAP 1: ANCIENT DRAGON GARGOYLE FLAMETHROWER
  function addFlameJet(x, y, z, dirX, dirZ, phase, length = 7.5) {
    const m = getMats();
    const group = new THREE.Group();
    group.position.set(x, y, z);

    const dirNorm = new THREE.Vector3(dirX, 0, dirZ).normalize();
    const angle = Math.atan2(dirNorm.x, dirNorm.z);
    group.rotation.y = angle;

    // Carved Volcanic Basalt Dragon Gargoyle Head Mount
    const mount = new THREE.Group();

    // Heavy iron mounting bracket
    const bracket = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.8, 1.0), m.charredIron);
    bracket.position.set(0, 0, -0.4);
    mount.add(bracket);

    // Bronze pressure canister with pressure gauge
    const canister = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 1.4, 14), m.brass);
    canister.rotation.x = Math.PI / 2;
    canister.position.set(0, 0.4, -0.6);
    mount.add(canister);

    // Copper fuel pipes running into rock
    [-0.5, 0.5].forEach((px) => {
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.6, 8), m.brass);
      pipe.rotation.x = Math.PI / 3;
      pipe.position.set(px, -0.3, -0.7);
      mount.add(pipe);
    });

    // Sculpted Basalt Dragon Skull Snout
    const skull = new THREE.Mesh(new THREE.ConeGeometry(0.65, 1.8, 6), m.basalt);
    skull.rotation.x = Math.PI / 2;
    skull.position.set(0, 0, 0.4);
    mount.add(skull);

    // Curved Brass Dragon Horns
    [-1, 1].forEach((side) => {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.18, 1.1, 6), m.brass);
      horn.rotation.set(-0.4, 0, side * 0.7);
      horn.position.set(side * 0.55, 0.55, -0.1);
      mount.add(horn);
    });

    // Glowing Magma Eye Sockets (Telegraph beacon)
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff3b00 });
    [-0.32, 0.32].forEach((ex) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), eyeMat);
      eye.position.set(ex, 0.28, 0.6);
      mount.add(eye);
    });

    // Open Maw / Flamethrower Nozzle
    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.36, 0.5, 12), m.charredIron);
    nozzle.rotation.x = Math.PI / 2;
    nozzle.position.set(0, -0.1, 1.25);
    mount.add(nozzle);

    group.add(mount);

    // Multi-Layer Horizontal Fire Jet (Length ~7.5m across stairs)
    const flameGroup = new THREE.Group();
    flameGroup.position.set(0, -0.1, 1.3);

    // Core high-temp plasma jet (white-gold)
    const coreCone = new THREE.Mesh(
      new THREE.ConeGeometry(0.42, length, 12),
      new THREE.MeshBasicMaterial({ color: 0xfffbeb, transparent: true, opacity: 0.95 })
    );
    coreCone.rotation.x = -Math.PI / 2;
    coreCone.position.z = length * 0.5;
    flameGroup.add(coreCone);

    // Swirling orange-red fire cone envelope
    const fireCone = new THREE.Mesh(
      new THREE.ConeGeometry(1.2, length * 1.05, 16),
      new THREE.MeshBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.78 })
    );
    fireCone.rotation.x = -Math.PI / 2;
    fireCone.position.z = length * 0.5;
    flameGroup.add(fireCone);

    // Outer flame wisps & smoke puffs
    const smokePuffs = [];
    for (let p = 0; p < 4; p++) {
      const sMesh = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.65 + p * 0.15, 1),
        new THREE.MeshBasicMaterial({ color: (p % 2 === 0) ? 0xef4444 : 0x334155, transparent: true, opacity: 0.65 })
      );
      sMesh.position.set((Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.3, length * 0.4 + p * 1.2);
      flameGroup.add(sMesh);
      smokePuffs.push(sMesh);
    }

    flameGroup.visible = false;
    group.add(flameGroup);

    // Warning Pilot Flame / Heat Shimmer
    const pilot = new THREE.Mesh(
      new THREE.ConeGeometry(0.16, 0.65, 8),
      new THREE.MeshBasicMaterial({ color: 0xff7a2a, transparent: true, opacity: 0 })
    );
    pilot.rotation.x = -Math.PI / 2;
    pilot.position.set(0, -0.1, 1.4);
    group.add(pilot);

    // Dynamic firelight casting on stairs
    const light = new THREE.PointLight(0xff5500, 0, 16);
    light.position.set(0, 0.4, 2.8);
    group.add(light);

    scn.add(group);

    flameJets.push({
      x, y, z,
      dir: dirNorm,
      length,
      phase,
      period: 4.8,
      active: false,
      flameGroup,
      coreCone,
      fireCone,
      smokePuffs,
      pilot,
      light,
      eyeMat
    });
  }

  // NEW SPIRAL TRAP 2: RUNIC OBSIDIAN FLOOR SPIKES
  function addFloorSpikes(x, y, z, stairAngle, phase) {
    const m = getMats();
    const group = new THREE.Group();
    group.position.set(x, y + 0.05, z);
    group.rotation.y = stairAngle;

    // Bronze and Basalt Step Grate Plate
    const base = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.15, 2.6), m.basalt);
    base.position.y = 0.05;
    group.add(base);

    // Glowing Runic Warning Border
    const runeBorder = new THREE.Mesh(
      new THREE.BoxGeometry(2.85, 0.18, 2.65),
      new THREE.MeshBasicMaterial({ color: 0xff4500, transparent: true, opacity: 0.25 })
    );
    runeBorder.position.y = 0.05;
    group.add(runeBorder);

    // Grate slits
    for (let sl = -1; sl <= 1; sl++) {
      const slit = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.2, 2.1), m.charredIron);
      slit.position.set(sl * 0.75, 0.06, 0);
      group.add(slit);
    }

    // Thrusting Obsidian Spikes Cluster
    const spikeGroup = new THREE.Group();
    spikeGroup.position.y = -1.2; // Retracted below step surface

    const spikeMat = m.obsidian;
    const spikePositions = [
      [0, 0],
      [-0.75, -0.6], [0.75, -0.6],
      [-0.75, 0.6], [0.75, 0.6],
      [-0.75, 0], [0.75, 0]
    ];

    spikePositions.forEach(([sx, sz]) => {
      const spike = new THREE.Mesh(
        new THREE.ConeGeometry(0.16, 1.85, 6),
        spikeMat
      );
      spike.position.set(sx, 0.92, sz);
      spikeGroup.add(spike);

      // Glowing molten tip
      const tip = new THREE.Mesh(
        new THREE.ConeGeometry(0.08, 0.45, 6),
        new THREE.MeshBasicMaterial({ color: 0xff3b00 })
      );
      tip.position.set(sx, 1.62, sz);
      spikeGroup.add(tip);
    });

    group.add(spikeGroup);
    scn.add(group);

    floorSpikes.push({
      x, y, z,
      radius: 1.85,
      phase,
      period: 4.4,
      extended: false,
      spikeGroup,
      runeBorder
    });
  }

  function makePlate(x, z, color) {
    const m = getMats();
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(2.7, 2.9, 0.5, 28), m.basalt);
    base.position.y = -0.15;
    group.add(base);
    const topMat = new THREE.MeshStandardMaterial({
      color: 0x6b5a46, emissive: color, emissiveIntensity: 0.25, roughness: 0.5, metalness: 0.5
    });
    const top = new THREE.Mesh(new THREE.CylinderGeometry(2.15, 2.15, 0.3, 28), topMat);
    top.position.y = 0.12;
    group.add(top);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.09, 8, 36), m.brass);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.15;
    group.add(ring);
    scn.add(group);
    return { x, z, r: 2.5, top, topMat, occupied: false, color };
  }

  // A bridge made of segments that rise from the lava while its trigger holds,
  // then fold back one segment at a time (starting at the trigger end).
  function makeBridge(cfg) {
    const m = getMats();
    const segs = [];
    for (let i = 0; i < cfg.count; i++) {
      const along = cfg.dir * cfg.segLen * (i + 0.5);
      const cx = cfg.axis === 'z' ? cfg.x0 : cfg.x0 + along;
      const cz = cfg.axis === 'z' ? cfg.z0 + along : cfg.z0;
      const hw = cfg.axis === 'z' ? cfg.width / 2 : cfg.segLen / 2;
      const hd = cfg.axis === 'z' ? cfg.segLen / 2 : cfg.width / 2;

      const mesh = new THREE.Group();
      const deck = new THREE.Mesh(new THREE.BoxGeometry(hw * 2 - 0.1, 0.8, hd * 2 - 0.1), m.floor);
      mesh.add(deck);
      const trimA = new THREE.Mesh(new THREE.BoxGeometry(hw * 2, 0.12, hd * 2), m.glow);
      trimA.position.y = 0.42;
      trimA.scale.set(0.96, 1, 0.96);
      mesh.add(trimA);
      const inner = new THREE.Mesh(new THREE.BoxGeometry(hw * 2 - 0.5, 0.2, hd * 2 - 0.5), m.floor);
      inner.position.y = 0.46;
      mesh.add(inner);
      mesh.position.set(cx, -8.4, cz);
      scn.add(mesh);

      const seg = { i, cx, cz, hw, hd, up: 0, mesh };
      addSurface(
        (x, z) => (seg.up >= 0.55 && Math.abs(x - cx) <= hw && Math.abs(z - cz) <= hd ? -8 * (1 - seg.up) : null),
        true
      );
      segs.push(seg);
    }
    const bridge = { segs, lit: false, hold: 0, raise: 0, grace: cfg.grace, wave: cfg.wave };
    bridges.push(bridge);
    return bridge;
  }

  function updateBridge(b, occupied, dt) {
    if (occupied) {
      b.lit = true;
      b.hold = 0;
      b.raise += dt;
    } else if (b.lit) {
      b.hold += dt;
      if (b.hold > b.grace + b.segs.length * b.wave + 1) {
        b.lit = false;
        b.raise = 0;
      }
    }
    b.segs.forEach((seg) => {
      let target = 0;
      if (b.lit) {
        target = occupied ? (b.raise > seg.i * 0.16 ? 1 : 0) : b.hold < b.grace + seg.i * b.wave ? 1 : 0;
      }
      const speed = target ? 3.2 : 5;
      seg.up += Math.sign(target - seg.up) * Math.min(Math.abs(target - seg.up), speed * dt);
      seg.mesh.position.y = -8 * (1 - seg.up) - 0.4;
    });
  }

  // --------------------------------------------------------------------------
  // BUILD STEPS
  // --------------------------------------------------------------------------
  function stepEnvironment() {
    scn = new THREE.Scene();
    scn.background = new THREE.Color(0x090405);
    scn.fog = new THREE.FogExp2(0x1d0c09, 0.0042);

    scn.add(new THREE.HemisphereLight(0xb06a44, 0x1a0e10, 0.62));

    // Lava glow along the route.
    [-24, -64, -125, -185, -240].forEach((z) => {
      const l = new THREE.PointLight(0xff6a2a, 1.5, 62);
      l.position.set(0, 3, z);
      scn.add(l);
    });
    const spiralLight = new THREE.PointLight(0xff7a30, 2.2, 78);
    spiralLight.position.set(SPIRAL.x, 10, SPIRAL.z);
    scn.add(spiralLight);
    const balconyLight = new THREE.PointLight(0xffa860, 1.3, 64);
    balconyLight.position.set(0, 27, -352);
    scn.add(balconyLight);
    lakeLight = new THREE.PointLight(0xff5a1e, 3.4, 240);
    lakeLight.position.set(0, -48, CRATER_CENTER_Z);
    scn.add(lakeLight);

    // Sky dome (follows the camera so it is never clipped).
    skyMesh = new THREE.Mesh(
      new THREE.SphereGeometry(700, 28, 18),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader: `
          varying vec3 vDir;
          float hash(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,37.719))) * 43758.5453); }
          void main(){
            float h = clamp(vDir.y, 0.0, 1.0);
            vec3 col = mix(vec3(0.55, 0.16, 0.07), vec3(0.04, 0.025, 0.11), pow(h, 0.55));
            vec3 q = floor(vDir * 90.0);
            float star = step(0.9965, hash(q)) * smoothstep(0.15, 0.6, h);
            gl_FragColor = vec4(col + star * 0.9, 1.0);
          }`
      })
    );
    scn.add(skyMesh);
  }

  function stepShell() {
    scn.add(buildCaveTube());
    scn.add(buildCrater());

    // Lava sea beneath the dungeon, and the vast crater lake far below the overlook.
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(170, 332), makeLavaMaterial(false));
    sea.rotation.x = -Math.PI / 2;
    sea.position.set(0, LAVA_Y, -152);
    scn.add(sea);

    const lake = new THREE.Mesh(new THREE.CircleGeometry(60, 56), makeLavaMaterial(false));
    lake.rotation.x = -Math.PI / 2;
    lake.position.set(0, LAKE_Y, CRATER_CENTER_Z);
    scn.add(lake);

    // Stalactites and glowing crystals.
    const m = getMats();
    const stal = new THREE.InstancedMesh(new THREE.ConeGeometry(0.9, 5, 6), m.basalt, 170);
    const dummy = new THREE.Object3D();
    const spans = [[-4, -66], [-104, -246], [-286, -310]];
    for (let i = 0; i < 170; i++) {
      const span = spans[Math.floor(Math.random() * spans.length)];
      const z = span[0] + Math.random() * (span[1] - span[0]);
      const p = profileAt(z);
      const a = (Math.random() - 0.5) * 1.7;
      dummy.position.set(Math.sin(a) * p.rx * 0.93, p.cy + Math.cos(a) * p.ry * 0.93, z);
      dummy.rotation.set(Math.PI, 0, 0);
      const s = 0.6 + Math.random() * 1.8;
      dummy.scale.set(s, s * (0.8 + Math.random()), s);
      dummy.updateMatrix();
      stal.setMatrixAt(i, dummy.matrix);
    }
    scn.add(stal);

    const crystals = new THREE.InstancedMesh(
      new THREE.OctahedronGeometry(1, 0),
      new THREE.MeshBasicMaterial({ color: 0xffffff }),
      90
    );
    const palette = [0x58e3ff, 0xff6ad5, 0xffb347];
    const col = new THREE.Color();
    for (let i = 0; i < 90; i++) {
      const span = spans[Math.floor(Math.random() * spans.length)];
      const z = span[0] + Math.random() * (span[1] - span[0]);
      const p = profileAt(z);
      const side = Math.random() < 0.5 ? -1 : 1;
      const a = side * (1.0 + Math.random() * 1.2);
      dummy.position.set(Math.sin(a) * p.rx * 0.95, p.cy + Math.cos(a) * p.ry * 0.95, z);
      dummy.rotation.set(Math.random(), Math.random() * 6, Math.random());
      const s = 0.4 + Math.random() * 0.9;
      dummy.scale.set(s * 0.55, s * 1.7, s * 0.55);
      dummy.updateMatrix();
      crystals.setMatrixAt(i, dummy.matrix);
      crystals.setColorAt(i, col.setHex(palette[i % palette.length]));
    }
    scn.add(crystals);
  }

  function stepGatehall() {
    const m = getMats();
    // Entry floor: z 10 .. -72, plus the neck into the causeway.
    rectSurface(0, -31, 9, 41, 0);
    slab(0, -31, 9, 41, 0);
    rectSurface(0, -78, 4.2, 6.5, 0);
    slab(0, -78, 4.2, 6.5, 0);

    // Low basalt rails along the hall.
    [-9.3, 9.3].forEach((x) => wallBlock(x, -31, 0.6, 82, 1.1));
    [-4.5, 4.5].forEach((x) => wallBlock(x, -78, 0.6, 13, 1.1));
    for (let z = 4; z > -72; z -= 16) {
      brazier(-8.2, 0, z);
      brazier(8.2, 0, z - 8);
    }

    // Back wall + exit arch with its glowing doorway.
    const cap = new THREE.Mesh(new THREE.BoxGeometry(40, 38, 1.4), m.basalt);
    cap.position.set(0, 7, 14.8);
    scn.add(cap);
    const arch = new THREE.Mesh(new THREE.TorusGeometry(4.6, 0.45, 12, 40, Math.PI), m.brass);
    arch.position.set(0, 0.2, 13.9);
    scn.add(arch);
    const door = new THREE.Mesh(
      new THREE.CircleGeometry(4.2, 32, 0, Math.PI),
      new THREE.MeshBasicMaterial({ color: 0x78d8ff, transparent: true, opacity: 0.45, side: THREE.DoubleSide })
    );
    door.position.set(0, 0.2, 13.8);
    scn.add(door);

    // Three pendulums + two geysers.
    addPendulum(-22, 0, 2.3);
    addPendulum(-38, 1.4, 2.55);
    addPendulum(-54, 2.8, 2.8);
    addGeyser(-4.8, 0, -30, 0);
    addGeyser(4.8, 0, -46, 2.2);
  }

  function stepCauseway() {
    const m = getMats();

    // Entry platform with the Weight Plate.
    rectSurface(-3, -92, 13, 8, 0);
    slab(-3, -92, 13, 8, 0);
    wallBlock(-16.3, -92, 0.6, 16, 1.1);
    wallBlock(9.7, -92, 0.6, 16, 1.1);
    wallBlock(-10, -100.3, 12, 0.6, 1.1);
    wallBlock(4.2, -100.3, 1.8, 0.6, 1.1);
    brazier(-14.5, 0, -85);
    brazier(8, 0, -85);

    plates.a = makePlate(-10, -92, 0xffb347);

    // Drawbridge: 5 segments of 11m from z=-100 to z=-155.
    // Grace timer increased to 5.5s so solo runners can easily sprint across!
    plates.bridgeA = makeBridge({
      axis: 'z', dir: -1, x0: 0, z0: -100, segLen: 11, count: 5, width: 6.4, grace: 5.5, wave: 1.1
    });

    // Solo Platformer Alternative: 6 stepping stones across the lava on the right flank
    const causewaySoloSpots = [
      [9.0, -108, 2.8, 0],
      [12.2, -117, 2.8, 0.25],
      [9.2, -126, 2.8, 0],
      [12.5, -135, 2.8, 0.3],
      [9.8, -144, 2.8, 0.15],
      [8.5, -151.5, 2.8, 0]
    ];

    causewaySoloSpots.forEach(([x, z, r, y], i) => {
      const group = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r + 0.35, 8.5, 22), m.floor);
      body.position.y = -3.85;
      group.add(body);

      const rim = new THREE.Mesh(new THREE.TorusGeometry(r - 0.08, 0.14, 8, 36), m.glow);
      rim.rotation.x = Math.PI / 2;
      rim.position.y = 0.42;
      group.add(rim);

      const crest = new THREE.Mesh(new THREE.OctahedronGeometry(0.35, 0), m.brass);
      crest.position.set(0, 0.46, 0);
      group.add(crest);

      group.position.set(x, y - 0.4, z);
      scn.add(group);

      const p = { x, z, r, y, phase: i * 1.05, group, baseY: y };
      platforms.push(p);

      // Generous landing collision margin (+0.75m plush body support)
      addSurface((px, pz) => (Math.hypot(px - x, pz - z) <= r + 0.75 ? p.y : null), false);
    });

    // Central island.
    rectSurface(0, -170, 14, 15, 0);
    slab(0, -170, 14, 15, 0);
    wallBlock(-14.3, -170, 0.6, 30, 1.1);
    wallBlock(14.3, -178, 0.6, 14, 1.1);
    wallBlock(14.3, -158, 0.6, 6, 1.1);
    wallBlock(-8.6, -155.3, 10.8, 0.6, 1.1);
    wallBlock(4.2, -155.3, 1.8, 0.6, 1.1);
    brazier(-12.5, 0, -157);
    brazier(12.5, 0, -157);
    brazier(-12.5, 0, -183);
    brazier(12.5, 0, -183);

    // Co-op bonus: two plates, one relic bridge.
    plates.twinL = makePlate(-9, -168, 0x58e3ff);
    plates.twinR = makePlate(9, -168, 0x58e3ff);

    plates.relicBridge = makeBridge({
      axis: 'x', dir: 1, x0: 14, z0: -170, segLen: 4, count: 3, width: 4, grace: 6, wave: 0.6
    });
    rectSurface(30, -170, 4, 6, 0);
    slab(30, -170, 4, 6, 0);
    brazier(33, 0, -165);
    brazier(33, 0, -175);

    relic = new THREE.Group();
    relic.position.set(30, 1.8, -170);
    const gem = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.9, 1),
      new THREE.MeshBasicMaterial({ color: 0xff7a2a })
    );
    relic.add(gem);
    const halo = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.07, 8, 32), m.brass);
    relic.add(halo);
    const relicLight = new THREE.PointLight(0xff8a3a, 1.4, 22);
    relic.add(relicLight);
    scn.add(relic);

    // Stepping platforms across the lava.
    // 8 stepping stones spaced ~7.5m - 8.0m apart for smooth, rhythmic leaping
    const stepSpots = [
      [0, -192.5],
      [3.2, -200.0],
      [4.2, -207.5],
      [1.2, -215.0],
      [-2.5, -222.0],
      [-3.8, -229.5],
      [-1.5, -236.5],
      [0, -243.5]
    ];
    stepSpots.forEach(([x, z], i) => {
      const group = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(3.3, 2.9, 0.8, 22), m.floor);
      group.add(body);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(3.1, 0.12, 8, 36), m.glow);
      rim.rotation.x = Math.PI / 2;
      rim.position.y = 0.42;
      group.add(rim);
      scn.add(group);
      const p = { x, z, r: 3.3, phase: i * 1.1, y: 0, group };
      platforms.push(p);
      // Generous landing collision margin (+0.75m plush body support)
      addSurface((px, pz) => (Math.hypot(px - x, pz - z) <= p.r + 0.75 ? p.y : null), false);
    });

    // Exit platform + corridor to the spiral.
    rectSurface(0, -253.5, 8, 7, 0);
    slab(0, -253.5, 8, 7, 0);
    [-8.3, 8.3].forEach((x) => wallBlock(x, -253.5, 0.6, 14, 1.1));
    rectSurface(0, -272.5, 4.2, 12, 0);
    slab(0, -272.5, 4.2, 12, 0);
    [-4.5, 4.5].forEach((x) => wallBlock(x, -271, 0.6, 24, 1.1));
    brazier(-7.5, 0, -250);
    brazier(7.5, 0, -250);
    brazier(-3.6, 0, -266);

    // Majestic Volcanic Fumarole Geysers erupting out of the Molten Lava Sea
    addGeyser(-18, LAVA_Y, -125, 0.8, true);
    addGeyser(18, LAVA_Y, -142, 2.4, true);
    addGeyser(-16, LAVA_Y, -215, 1.6, true);
    brazier(3.6, 0, -266);
  }

  function stepSpiral() {
    const m = getMats();
    const R = SPIRAL.radius;
    const thetaMax = Math.PI * 2 * SPIRAL.turns;

    // Floor logic: pick the ramp turn nearest to (but not above) the player.
    addSurface((x, z, refY) => {
      const dx = x - SPIRAL.x;
      const dz = z - SPIRAL.z;
      if (Math.abs(Math.hypot(dx, dz) - R) > SPIRAL.halfWidth) return null;
      const th = Math.atan2(dx, dz);
      let best = null;
      for (let k = 0; k <= 2; k++) {
        const t = th + k * Math.PI * 2;
        if (t < 0 || t > thetaMax) continue;
        const y = (t / thetaMax) * SPIRAL.rise;
        if (y <= refY + 2.4 && (best === null || y > best)) best = y;
      }
      return best;
    }, true);

    // Ramp visuals.
    const N = 150;
    const steps = new THREE.InstancedMesh(new THREE.BoxGeometry(SPIRAL.halfWidth * 2 + 0.4, 0.9, 1.2), m.floor, N);
    const barsOut = new THREE.InstancedMesh(new THREE.BoxGeometry(0.18, 0.18, 1.25), m.brass, N);
    const barsIn = new THREE.InstancedMesh(new THREE.BoxGeometry(0.18, 0.18, 1.25), m.brass, N);
    const lamps = new THREE.InstancedMesh(new THREE.SphereGeometry(0.28, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffd08a }), 26);
    const d = new THREE.Object3D();
    d.rotation.order = 'YXZ';
    const tilt = Math.atan2(SPIRAL.rise, thetaMax * R);
    let lampIdx = 0;
    let stepCount = 0;
    let barsOutCount = 0;
    let barsInCount = 0;

    for (let i = 0; i < N; i++) {
      const th = ((i + 0.5) / N) * thetaMax;
      const y = (th / thetaMax) * SPIRAL.rise;
      const phi = th + Math.PI / 2;
      const px = SPIRAL.x + Math.sin(th) * R;
      const pz = SPIRAL.z + Math.cos(th) * R;

      // Only generate stair steps while outside the flat rest nook floor (y < 21.6)
      if (y < 21.6) {
        d.position.set(px, y - 0.45, pz);
        d.rotation.set(-tilt, phi, 0);
        d.scale.set(1, 1, 1);
        d.updateMatrix();
        steps.setMatrixAt(stepCount++, d.matrix);
      }

      // Outer rail terminates cleanly before reaching the Rest Nook wall (th <= 2.76 * Math.PI)
      // This guarantees it NEVER cuts across the floor, through the tea table, or across the cushions!
      if (th <= 2.76 * Math.PI) {
        const ox = SPIRAL.x + Math.sin(th) * (R + SPIRAL.halfWidth + 0.15);
        const oz = SPIRAL.z + Math.cos(th) * (R + SPIRAL.halfWidth + 0.15);
        d.position.set(ox, y + 1.0, oz);
        d.rotation.set(-tilt, phi, 0);
        d.scale.set(1, 1, 1);
        d.updateMatrix();
        barsOut.setMatrixAt(barsOutCount++, d.matrix);
      }

      // Inner rail terminates early before the doorway threshold (th <= 2.66 * Math.PI)
      // This completely ELIMINATES the beam across the entranceway so players simply walk straight into the room!
      if (th <= 2.66 * Math.PI) {
        const ix = SPIRAL.x + Math.sin(th) * (R - SPIRAL.halfWidth - 0.15);
        const iz = SPIRAL.z + Math.cos(th) * (R - SPIRAL.halfWidth - 0.15);
        d.position.set(ix, y + 1.0, iz);
        d.rotation.set(-tilt, phi, 0);
        d.scale.set(1, 1, 1);
        d.updateMatrix();
        barsIn.setMatrixAt(barsInCount++, d.matrix);
      }

      if (i % 6 === 0 && lampIdx < 26 && th <= 2.72 * Math.PI) {
        const ox = SPIRAL.x + Math.sin(th) * (R + SPIRAL.halfWidth + 0.15);
        const oz = SPIRAL.z + Math.cos(th) * (R + SPIRAL.halfWidth + 0.15);
        d.position.set(ox, y + 1.45, oz);
        d.rotation.set(0, 0, 0);
        d.scale.set(1, 1, 1);
        d.updateMatrix();
        lamps.setMatrixAt(lampIdx++, d.matrix);
      }
    }
    steps.count = stepCount;
    barsOut.count = barsOutCount;
    barsIn.count = barsInCount;
    lamps.count = lampIdx;
    scn.add(steps, barsOut, barsIn, lamps);

    // Elegant ornamental brass newel posts at the railing terminations
    const thIn = 2.66 * Math.PI;
    const yIn = (thIn / thetaMax) * SPIRAL.rise;
    const postIn = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 1.5, 12), m.brass);
    postIn.position.set(SPIRAL.x + Math.sin(thIn) * (R - SPIRAL.halfWidth - 0.15), yIn + 0.75, SPIRAL.z + Math.cos(thIn) * (R - SPIRAL.halfWidth - 0.15));
    scn.add(postIn);
    const postInCap = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10), m.glow);
    postInCap.position.set(postIn.position.x, postIn.position.y + 0.85, postIn.position.z);
    scn.add(postInCap);

    const thOut = 2.76 * Math.PI;
    const yOut = (thOut / thetaMax) * SPIRAL.rise;
    const postOut = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 1.5, 12), m.brass);
    postOut.position.set(SPIRAL.x + Math.sin(thOut) * (R + SPIRAL.halfWidth + 0.15), yOut + 0.75, SPIRAL.z + Math.cos(thOut) * (R + SPIRAL.halfWidth + 0.15));
    scn.add(postOut);
    const postOutCap = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10), m.glow);
    postOutCap.position.set(postOut.position.x, postOut.position.y + 0.85, postOut.position.z);
    scn.add(postOutCap);

    // Molten column at the heart of the spiral.
    const column = new THREE.Mesh(new THREE.CylinderGeometry(5, 5.6, 78, 28, 1, true), makeLavaMaterial(true));
    column.position.set(SPIRAL.x, 24, SPIRAL.z);
    scn.add(column);
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(6.4, 7.2, 2, 28), m.basalt);
    collar.position.set(SPIRAL.x, -5, SPIRAL.z);
    scn.add(collar);

    // Traps along the Ember Spiral climb:
    // 1. Runic Obsidian Floor Spikes on the stairs (lower curve and upper curve)
    [0.55, 1.85].forEach((t, i) => {
      const th = t * Math.PI;
      const sy = (th / thetaMax) * SPIRAL.rise;
      const sx = SPIRAL.x + Math.sin(th) * R;
      const sz = SPIRAL.z + Math.cos(th) * R;
      addFloorSpikes(sx, sy, sz, th, i * 2.2);
    });

    // 2. Ancient Dragon Gargoyle Flamethrowers
    // Flamethrower A: Mounted on central pillar sweeping outward across stairs at mid-climb
    const thA = 1.15 * Math.PI;
    const fyA = (thA / thetaMax) * SPIRAL.rise + 1.1;
    const fxA = SPIRAL.x + Math.sin(thA) * (R - 3.8);
    const fzA = SPIRAL.z + Math.cos(thA) * (R - 3.8);
    addFlameJet(fxA, fyA, fzA, Math.sin(thA), Math.cos(thA), 0.6, 7.5);

    // Flamethrower B: Mounted on outer rock wall sweeping inward across stairs near the summit
    const thB = 2.45 * Math.PI;
    const fyB = (thB / thetaMax) * SPIRAL.rise + 1.1;
    const fxB = SPIRAL.x + Math.sin(thB) * (R + 3.8);
    const fzB = SPIRAL.z + Math.cos(thB) * (R + 3.8);
    addFlameJet(fxB, fyB, fzB, -Math.sin(thB), -Math.cos(thB), 2.4, 7.5);

    // Rest landing at the top with a warm tea nook.
    const top = SPIRAL.rise;
    rectSurface(0, -311.5, 6, 7.5, top);
    // Suppress front/back glowing trims on internal floor seams (connecting to spiral ramp and corridor)
    slab(0, -311.5, 6, 7.5, top, 1.4, { front: false, back: false, left: true, right: true });

    // Smooth beveled threshold ramp joining the top of the stairs directly into the Rest Nook floor with ZERO vertical lip
    rectSurface(2.5, -306.5, 3.5, 2.5, top);
    const thresh = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.8, 3.5), m.floor);
    thresh.position.set(2.5, top - 0.38, -306.5);
    thresh.rotation.x = 0.08;
    thresh.rotation.z = -0.06;
    scn.add(thresh);

    // Left wall along the full room length
    wallBlock(-6.3, -311.5, 0.6, 15, 1.1, top);
    // Right wall ONLY behind the entrance (z = -312 to -319), leaving the entrance from the stairs wide open!
    wallBlock(6.3, -315.5, 0.6, 7.0, 1.1, top);

    // Cozy circular stone dais for the tea service in the alcove
    const dais = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.8, 0.1, 24), m.basalt);
    dais.position.set(2.8, top + 0.05, -314.5);
    scn.add(dais);

    // Warm ceramic/wooden tea table
    const table = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.4, 0.85, 20), m.floor);
    table.position.set(2.8, top + 0.45, -314.5);
    scn.add(table);
    const tableRim = new THREE.Mesh(new THREE.TorusGeometry(1.26, 0.05, 8, 32), m.brass);
    tableRim.rotation.x = Math.PI / 2;
    tableRim.position.set(2.8, top + 0.88, -314.5);
    scn.add(tableRim);

    // Adorable, clearly recognizable Celadon & Brass Teapot
    const teapotGroup = new THREE.Group();
    teapotGroup.position.set(2.8, top + 1.25, -314.5);

    // Teapot body
    const potBody = new THREE.Mesh(new THREE.SphereGeometry(0.38, 20, 16), m.brass);
    potBody.scale.set(1.15, 0.9, 1.05);
    teapotGroup.add(potBody);

    // Teapot domed lid with golden ball finial
    const potLid = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.1, 16), m.brass);
    potLid.position.y = 0.38;
    teapotGroup.add(potLid);
    const potFinial = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 10), m.glow);
    potFinial.position.y = 0.47;
    teapotGroup.add(potFinial);

    // Curved pouring spout
    const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.11, 0.38, 12), m.brass);
    spout.position.set(-0.36, 0.12, 0);
    spout.rotation.z = Math.PI * 0.36;
    teapotGroup.add(spout);

    // Arched teapot handle
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.045, 8, 20, Math.PI), m.brass);
    handle.position.set(0.34, 0.06, 0);
    handle.rotation.z = -Math.PI / 2;
    teapotGroup.add(handle);

    scn.add(teapotGroup);

    // Two miniature porcelain teacups on saucers with warm amber tea
    const porcelainMat = new THREE.MeshStandardMaterial({ color: 0xf5f0ea, roughness: 0.2, metalness: 0.1 });
    const teaLiquidMat = new THREE.MeshStandardMaterial({ color: 0x8a3a14, roughness: 0.15 });

    [[2.1, -315.1], [3.5, -315.1]].forEach(([cx, cz]) => {
      const saucer = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.18, 0.03, 14), porcelainMat);
      saucer.position.set(cx, top + 0.9, cz);
      scn.add(saucer);

      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.1, 0.16, 14), porcelainMat);
      cup.position.set(cx, top + 0.98, cz);
      scn.add(cup);

      const teaLiquid = new THREE.Mesh(new THREE.CircleGeometry(0.12, 12), teaLiquidMat);
      teaLiquid.rotation.x = -Math.PI / 2;
      teaLiquid.position.set(cx, top + 1.05, cz);
      scn.add(teaLiquid);
    });

    // Plate of warm spherical buns / brioche rolls
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.3, 0.04, 16), porcelainMat);
    plate.position.set(2.8, top + 0.9, -313.7);
    scn.add(plate);

    const bunMat = new THREE.MeshStandardMaterial({ color: 0xd4893b, roughness: 0.6 });
    [[2.72, -313.78], [2.88, -313.78], [2.8, -313.62]].forEach(([bx, bz]) => {
      const bun = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10), bunMat);
      bun.scale.set(1.1, 0.85, 1.1);
      bun.position.set(bx, top + 0.98, bz);
      scn.add(bun);
    });

    // Plump tufted seating cushions with buttons
    [[1.7, -316.0], [3.9, -316.0]].forEach(([cx, cz], i) => {
      const cushionMat = new THREE.MeshStandardMaterial({ color: i ? 0x4a7eb8 : 0xd97b96, roughness: 0.85 });
      const cushion = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.74, 0.26, 16), cushionMat);
      cushion.position.set(cx, top + 0.13, cz);
      scn.add(cushion);

      // Central button indentation
      const button = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), m.brass);
      button.position.set(cx, top + 0.25, cz);
      scn.add(button);
    });

    brazier(-4.5, top, -306);
  }

  function stepOverlook() {
    const m = getMats();
    const top = SPIRAL.rise;

    // Final corridor to the balcony.
    rectSurface(0, -332.5, 4.2, 14, top);
    // Suppress front/back glowing trims on internal floor seams
    slab(0, -332.5, 4.2, 14, top, 1.4, { front: false, back: false, left: true, right: true });
    [-4.5, 4.5].forEach((x) => wallBlock(x, -332.5, 0.6, 28, 1.1, top));
    for (let z = -322; z > -346; z -= 11) {
      brazier(-3.4, top, z);
      brazier(3.4, top, z - 5.5);
    }

    // Balcony.
    rectSurface(BALCONY.cx, BALCONY.cz, BALCONY.hw, BALCONY.hd, BALCONY.y);
    slab(BALCONY.cx, BALCONY.cz, BALCONY.hw, BALCONY.hd, BALCONY.y, 1.8);
    // Rock shelf beneath so it reads as carved into the crater wall.
    const shelf = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 3), m.basalt);
    shelf.scale.set(17, 6, 12);
    shelf.position.set(0, BALCONY.y - 6.4, BALCONY.cz + 1);
    scn.add(shelf);

    // Rails: solid at the sides, posts + gaps along the front so carrots can be bumped off.
    [-BALCONY.hw, BALCONY.hw].forEach((x) => wallBlock(x, BALCONY.cz, 0.6, BALCONY.hd * 2, 1.1, BALCONY.y));
    for (let x = -BALCONY.hw; x <= BALCONY.hw + 0.1; x += 4) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 1.6, 8), m.basalt);
      post.position.set(x, BALCONY.y + 0.8, BALCONY.cz - BALCONY.hd);
      scn.add(post);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), m.glow);
      cap.position.set(x, BALCONY.y + 1.75, BALCONY.cz - BALCONY.hd);
      scn.add(cap);
    }

    // Portal frame around the corridor mouth.
    [-5.4, 5.4].forEach((x) => {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(2.2, 14, 2.4), m.basalt);
      pillar.position.set(x, BALCONY.y + 7, -346.5);
      scn.add(pillar);
    });
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(13, 2.2, 2.6), m.basalt);
    lintel.position.set(0, BALCONY.y + 14.6, -346.5);
    scn.add(lintel);

    // Caldera back cliff walls sealing the balcony completely (no open gaps into void behind dungeon)
    [-11.2, 11.2].forEach((x) => {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(11.6, 22, 2.4), m.basalt);
      wall.position.set(x, BALCONY.y + 11, -346.5);
      scn.add(wall);

      // Decorative basalt buttresses along the cliff face
      const buttress = new THREE.Mesh(new THREE.BoxGeometry(1.8, 18, 1.4), m.floor);
      buttress.position.set(x, BALCONY.y + 9, -347.4);
      scn.add(buttress);
    });

    // Rock pediment sealing the archway above the lintel
    const topArch = new THREE.Mesh(new THREE.BoxGeometry(15, 8, 2.4), m.basalt);
    topArch.position.set(0, BALCONY.y + 19, -346.5);
    scn.add(topArch);

    // Return portal home.
    const portal = new THREE.Group();
    portal.position.set(12, BALCONY.y + 3.4, -352);
    portal.lookAt(new THREE.Vector3(0, BALCONY.y + 3.4, -356));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.7, 0.3, 14, 40), m.brass);
    portal.add(ring);
    const swirl = new THREE.Mesh(
      new THREE.CircleGeometry(2.45, 36),
      new THREE.ShaderMaterial({
        transparent: true,
        side: THREE.DoubleSide,
        uniforms: lavaMaterials.length ? { uTime: lavaMaterials[0].uniforms.uTime } : { uTime: { value: 0 } },
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv * 2.0 - 1.0; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader: `
          uniform float uTime; varying vec2 vUv;
          void main(){
            float r = length(vUv);
            float a = atan(vUv.y, vUv.x);
            float s = sin(a * 5.0 - r * 12.0 + uTime * 3.2);
            vec3 col = mix(vec3(0.58, 0.28, 0.98), vec3(0.32, 0.78, 1.0), 0.5 + 0.5 * s);
            col = mix(vec3(0.98, 0.92, 1.0), col, smoothstep(0.0, 0.6, r));
            gl_FragColor = vec4(col, (1.0 - smoothstep(0.85, 1.0, r)) * 0.9);
          }`
      })
    );
    portal.add(swirl);
    const pl = new THREE.PointLight(0x9b6dff, 1.8, 30);
    pl.position.z = 1;
    portal.add(pl);
    scn.add(portal);
    brazier(9, BALCONY.y, -349);
    brazier(-9, BALCONY.y, -349);

    // Twin Ancient Obsidian Gargoyles perched on the Crater Overlook balustrade
    [-BALCONY.hw + 1.5, BALCONY.hw - 1.5].forEach((gx, idx) => {
      const gGroup = new THREE.Group();
      gGroup.position.set(gx, BALCONY.y + 1.1, BALCONY.cz - BALCONY.hd + 0.8);
      const gPedestal = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.4, 1.2), m.basalt);
      gGroup.add(gPedestal);
      const gStatue = new THREE.Mesh(new THREE.DodecahedronGeometry(0.85, 1), m.obsidian);
      gStatue.position.y = 1.2;
      gGroup.add(gStatue);
      const gHorns = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.9, 6), m.brass);
      gHorns.position.set(0, 1.9, 0);
      gGroup.add(gHorns);
      const gEyeMat = new THREE.MeshBasicMaterial({ color: 0xff3b00 });
      [-0.22, 0.22].forEach((ex) => {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), gEyeMat);
        eye.position.set(ex, 1.35, 0.7);
        gGroup.add(eye);
      });
      gGroup.rotation.y = idx === 0 ? 0.35 : -0.35;
      scn.add(gGroup);
    });

    // Eight volunteer carrots along the front edge.
    const colors = [0xef4444, 0x10b981, 0xf59e0b, 0x8b5cf6, 0x3b82f6, 0xec4899, 0x14b8a6, 0xf97316];
    colors.forEach((color, i) => {
      const mesh = window.BlahajModels.createBeachCarrot(color);
      const x = -12.25 + i * 3.5;
      const home = new THREE.Vector3(x, BALCONY.y + 0.3, BALCONY.cz - BALCONY.hd + 1.4);
      mesh.position.copy(home);
      mesh.rotation.y = Math.PI;
      scn.add(mesh);
      carrots.push({
        mesh,
        home,
        get pos() { return this.mesh.position; },
        vel: new THREE.Vector3(),
        knocked: false,
        state: 'home',
        respawn: 0
      });
    });
  }

  function stepParticles() {
    function makePoints(count, spread, color, size) {
      const geo = new THREE.BufferGeometry();
      const arr = new Float32Array(count * 3);
      geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
      const pts = new THREE.Points(
        geo,
        new THREE.PointsMaterial({
          color, size, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending
        })
      );
      pts.userData.spread = spread;
      scn.add(pts);
      return pts;
    }

    embersCave = makePoints(380, null, 0xff9a40, 0.5);
    const a = embersCave.geometry.attributes.position.array;
    for (let i = 0; i < 380; i++) {
      a[i * 3] = (Math.random() - 0.5) * 70;
      a[i * 3 + 1] = -4 + Math.random() * 44;
      a[i * 3 + 2] = 10 - Math.random() * 345;
    }

    embersCrater = makePoints(420, null, 0xffb060, 1.2);
    const b = embersCrater.geometry.attributes.position.array;
    for (let i = 0; i < 420; i++) {
      b[i * 3] = (Math.random() - 0.5) * 220;
      b[i * 3 + 1] = -55 + Math.random() * 230;
      b[i * 3 + 2] = CRATER_CENTER_Z + (Math.random() - 0.5) * 220;
    }

    // Burst pool used when a volunteer meets the lava.
    splash = { count: 90, life: new Float32Array(90), vel: new Float32Array(90 * 3) };
    const geo = new THREE.BufferGeometry();
    const arr = new Float32Array(90 * 3).fill(-9999);
    geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    splash.points = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        color: 0xffc060, size: 2.2, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
      })
    );
    splash.points.frustumCulled = false;
    scn.add(splash.points);
    splash.cursor = 0;
  }

  function spawnSplash(x, z) {
    const pos = splash.points.geometry.attributes.position.array;
    for (let n = 0; n < 34; n++) {
      const i = splash.cursor++ % splash.count;
      pos[i * 3] = x;
      pos[i * 3 + 1] = LAKE_Y + 0.5;
      pos[i * 3 + 2] = z;
      const ang = Math.random() * Math.PI * 2;
      const sp = 3 + Math.random() * 9;
      splash.vel[i * 3] = Math.cos(ang) * sp;
      splash.vel[i * 3 + 1] = 16 + Math.random() * 22;
      splash.vel[i * 3 + 2] = Math.sin(ang) * sp;
      splash.life[i] = 2.4;
    }
    lakeFlare = 1;
  }

  // --------------------------------------------------------------------------
  // PUBLIC: BUILD (async so the loading screen can animate)
  // --------------------------------------------------------------------------
  const BUILD_STEPS = [
    ['Kindling the lava sea…', stepEnvironment],
    ['Carving the caverns…', stepShell],
    ['Raising the Obsidian Gatehall…', stepGatehall],
    ['Laying the Molten Causeway…', stepCauseway],
    ['Winding the Ember Spiral…', stepSpiral],
    ['Opening the Crater Overlook…', stepOverlook],
    ['Releasing the embers…', stepParticles]
  ];

  async function build(onProgress) {
    if (built) return;
    const report = typeof onProgress === 'function' ? onProgress : null;
    for (let i = 0; i < BUILD_STEPS.length; i++) {
      if (report) report(i / BUILD_STEPS.length, BUILD_STEPS[i][0]);
      await new Promise((r) => setTimeout(r, 30));
      BUILD_STEPS[i][1]();
    }
    if (report) report(1, 'Ready!');
    built = true;
  }

  // --------------------------------------------------------------------------
  // PUBLIC: RUN STATE
  // --------------------------------------------------------------------------
  function resetRun() {
    completed = false;
    relicTaken = false;
    if (relic) relic.visible = true;
    currentRoom = '';
    bridges.forEach((b) => {
      b.lit = false;
      b.hold = 0;
      b.raise = 0;
      b.segs.forEach((s) => {
        s.up = 0;
        s.mesh.position.y = -8.4;
      });
    });
    carrots.forEach((c) => returnCarrotHome(c));
  }

  function returnCarrotHome(c) {
    c.state = 'home';
    c.knocked = false;
    c.vel.set(0, 0, 0);
    c.mesh.position.copy(c.home);
    c.mesh.rotation.set(0, Math.PI, 0);
    c.mesh.visible = true;
  }

  function resetVolunteerCarrots() {
    carrots.forEach((c) => returnCarrotHome(c));
  }

  function setActive(flag) {
    active = flag;
    if (flag) resetRun();
  }

  // --------------------------------------------------------------------------
  // PUBLIC: PER-FRAME UPDATE
  // actors: [{ x, y, z }] for every player currently inside the instance
  // --------------------------------------------------------------------------
  function update(dt, t, actorsInput, camPos) {
    if (!built || !active) return;
    time = t;
    const actors = Array.isArray(actorsInput) ? actorsInput : (actorsInput ? [actorsInput] : []);

    lavaMaterials.forEach((m) => {
      m.uniforms.uTime.value = t;
    });
    if (camPos) skyMesh.position.copy(camPos);

    // Pendulums: kinetic trail flares up at high velocity.
    pendulums.forEach((p) => {
      const a = Math.sin(t * p.speed + p.phase) * 0.92;
      p.pivot.rotation.z = a;
      p.hit.set(Math.sin(a) * p.len, p.pivotY - Math.cos(a) * p.len, p.z);
      if (p.trail) {
        const velMag = Math.abs(Math.cos(t * p.speed + p.phase));
        p.trail.material.opacity = Math.pow(velMag, 3.0) * 0.65;
      }
    });

    // Realistic Geysers: telegraph warning, erupt with billowing ash & light, rest.
    geysers.forEach((g) => {
      const c = ((t + g.phase) % g.period) / g.period;
      g.active = c >= 0.28 && c < 0.62;
      const warning = c < 0.28 && c > 0.08;

      g.warn.material.opacity = warning ? 0.3 + 0.4 * Math.sin(t * 16) : 0;
      g.plume.visible = g.active;

      if (warning) {
        if (g.light) g.light.intensity = 0.4 + 0.3 * Math.sin(t * 14);
      } else if (g.active) {
        const s = Math.sin(((c - 0.28) / 0.34) * Math.PI);
        const sy = 0.4 + s * 0.68;
        g.plume.scale.set(0.85 + s * 0.25, sy, 0.85 + s * 0.25);
        if (g.light) g.light.intensity = 2.8 + Math.sin(t * 24) * 0.8;

        // Billowing mushroom ash head
        if (g.smokeGroup) {
          g.smokeGroup.rotation.y += dt * 3.5;
          g.smokeGroup.scale.setScalar(1.0 + s * 0.55);
        }
        // Animated lava droplet sparks
        if (g.sparks) {
          g.sparks.forEach((sp, idx) => {
            sp.position.y = 2.0 + idx * 0.9 + Math.sin(t * 15 + idx) * 0.8;
            sp.rotation.x += dt * 6;
            sp.rotation.z += dt * 8;
          });
        }
      } else {
        if (g.light) g.light.intensity = 0;
      }
    });

    // Dragon Gargoyle Flamethrowers on the Spiral
    flameJets.forEach((fj) => {
      const c = ((t + fj.phase) % fj.period) / fj.period;
      fj.active = c >= 0.32 && c < 0.65;
      const warning = c < 0.32 && c > 0.10;

      if (warning) {
        const warnPulse = 0.4 + 0.6 * Math.abs(Math.sin(t * 16));
        fj.pilot.material.opacity = warnPulse;
        fj.eyeMat.color.setHex(0xff3b00);
        fj.light.intensity = warnPulse * 0.8;
      } else if (fj.active) {
        fj.pilot.material.opacity = 0;
        fj.eyeMat.color.setHex(0xffffff);
      } else {
        fj.pilot.material.opacity = 0;
        fj.eyeMat.color.setHex(0x7c1d06);
        fj.light.intensity = 0;
      }

      fj.flameGroup.visible = fj.active;
      if (fj.active) {
        const blastProgress = (c - 0.32) / 0.33;
        const blastFactor = Math.sin(blastProgress * Math.PI);
        const curScale = 0.5 + blastFactor * 0.55;
        fj.flameGroup.scale.set(curScale, curScale, 0.85 + blastFactor * 0.25);
        fj.light.intensity = 2.5 + Math.sin(t * 22) * 0.8;

        fj.smokePuffs.forEach((puff, idx) => {
          puff.rotation.x += dt * 4;
          puff.rotation.z += dt * 5;
          puff.position.z = fj.length * 0.4 + idx * 1.1 + Math.sin(t * 12 + idx) * 0.4;
        });
      }
    });

    // Runic Obsidian Floor Spikes on the Spiral
    floorSpikes.forEach((sp) => {
      const c = ((t + sp.phase) % sp.period) / sp.period;
      sp.extended = c >= 0.30 && c < 0.60;
      const warning = c < 0.30 && c > 0.10;

      if (warning) {
        sp.runeBorder.material.opacity = 0.25 + 0.6 * Math.abs(Math.sin(t * 18));
      } else {
        sp.runeBorder.material.opacity = sp.extended ? 0.95 : 0.12;
      }

      if (sp.extended) {
        const extProgress = (c - 0.30) / 0.30;
        let lift = 0;
        if (extProgress < 0.15) {
          lift = extProgress / 0.15;
        } else if (extProgress > 0.85) {
          lift = (1.0 - extProgress) / 0.15;
        } else {
          lift = 1.0;
        }
        sp.spikeGroup.position.y = -1.2 + lift * 1.35;
      } else {
        sp.spikeGroup.position.y = -1.2;
      }
    });

    // Bobbing stepping platforms.
    platforms.forEach((p) => {
      const base = p.baseY || 0;
      p.y = base + 0.45 * Math.sin(t * 1.4 + p.phase);
      p.group.position.set(p.x, p.y - 0.4, p.z);
    });

    // Flames.
    flames.forEach((f) => {
      const s = 1 + 0.2 * Math.sin(t * 9 + f.phase);
      f.mesh.scale.set(1, s, 1);
      f.mesh.position.y = f.baseY + (s - 1) * 0.6;
    });

    // Weight plates.
    Object.values(plates).forEach((pl) => {
      if (pl.r === undefined) return;
      pl.occupied = actors.some((a) => Math.hypot(a.x - pl.x, a.z - pl.z) < pl.r && Math.abs(a.y) < 1.8);
      pl.top.position.y = pl.occupied ? -0.04 : 0.12;
      pl.topMat.emissiveIntensity = pl.occupied ? 1.2 : 0.25;
    });
    updateBridge(plates.bridgeA, plates.a.occupied, dt);
    updateBridge(plates.relicBridge, plates.twinL.occupied && plates.twinR.occupied, dt);

    // Relic.
    if (relic && relic.visible) {
      relic.rotation.y = t * 1.8;
      relic.position.y = 1.9 + Math.sin(t * 2.4) * 0.25;
      actors.forEach((a) => {
        if (!relicTaken && Math.hypot(a.x - relic.position.x, a.z - relic.position.z) < 2.6 && Math.abs(a.y) < 2.5) {
          relicTaken = true;
          relic.visible = false;
          if (typeof on.relic === 'function') on.relic();
        }
      });
    }

    // Volunteer carrots on the Volcano Balcony respawn after 18s so players can enjoy continuous carrot bowling!
    carrots.forEach((c, idx) => {
      if (c.state !== 'home') {
        if (c.respawn > 0) {
          c.respawn -= dt;
          if (c.respawn <= 0) {
            c.state = 'home';
            c.knocked = false;
            c.mesh.position.copy(c.home);
            c.mesh.rotation.set(0, Math.PI, 0);
            c.mesh.visible = true;
            c.vel.set(0, 0, 0);
            if (typeof on.carrotRespawn === 'function') on.carrotRespawn(idx);
          }
        }
      }
      if (c.state === 'fly') {
        c.vel.y -= 19.5 * dt;
        c.mesh.position.addScaledVector(c.vel, dt);
        c.mesh.rotation.x += c.vel.z * dt * 0.12;
        c.mesh.rotation.z -= c.vel.x * dt * 0.12;
        const p = c.mesh.position;
        const onBalcony = Math.abs(p.x) <= BALCONY.hw && Math.abs(p.z - BALCONY.cz) <= BALCONY.hd;
        if (onBalcony && c.vel.y < 0 && p.y <= BALCONY.y && p.y > BALCONY.y - 1.2) {
          p.y = BALCONY.y;
          c.vel.y = Math.abs(c.vel.y) * 0.4;
          c.vel.x *= 0.75;
          c.vel.z *= 0.75;
          if (c.vel.length() < 1.4) {
            c.vel.set(0, 0, 0);
            c.state = 'rest';
          }
        }
        if (p.y < LAKE_Y + 1.5) {
          c.state = 'lost';
          c.mesh.visible = false;
          spawnSplash(p.x, p.z);
          if (typeof on.carrotLost === 'function') on.carrotLost(idx);
        }
      }
    });

    // Crater splash particles + lake flare.
    const sp = splash.points.geometry.attributes.position.array;
    for (let i = 0; i < splash.count; i++) {
      if (splash.life[i] <= 0) continue;
      splash.life[i] -= dt;
      splash.vel[i * 3 + 1] -= 24 * dt;
      sp[i * 3] += splash.vel[i * 3] * dt;
      sp[i * 3 + 1] += splash.vel[i * 3 + 1] * dt;
      sp[i * 3 + 2] += splash.vel[i * 3 + 2] * dt;
      if (splash.life[i] <= 0 || sp[i * 3 + 1] < LAKE_Y) {
        splash.life[i] = 0;
        sp[i * 3 + 1] = -9999;
      }
    }
    splash.points.geometry.attributes.position.needsUpdate = true;
    lakeFlare = Math.max(0, lakeFlare - dt * 0.9);
    lakeLight.intensity = 3.4 + lakeFlare * 9 + Math.sin(t * 3) * 0.3;

    // Ambient embers drift upward.
    const e1 = embersCave.geometry.attributes.position.array;
    for (let i = 0; i < 380; i++) {
      e1[i * 3 + 1] += dt * (0.8 + (i % 5) * 0.25);
      e1[i * 3] += Math.sin(t * 0.6 + i) * dt * 0.3;
      if (e1[i * 3 + 1] > 40) e1[i * 3 + 1] = -4;
    }
    embersCave.geometry.attributes.position.needsUpdate = true;
    const e2 = embersCrater.geometry.attributes.position.array;
    for (let i = 0; i < 420; i++) {
      e2[i * 3 + 1] += dt * (2.5 + (i % 7) * 0.6);
      if (e2[i * 3 + 1] > 175) e2[i * 3 + 1] = -55;
    }
    embersCrater.geometry.attributes.position.needsUpdate = true;

    // Room banners + trial completion.
    const me = actors[0];
    if (me) {
      const room = getRoom(me.z);
      if (room !== currentRoom) {
        currentRoom = room;
        if (typeof on.toast === 'function') on.toast(ROOM_TITLES[room].toUpperCase(), roomSubtitle(room));
        if (typeof on.checkpoint === 'function') on.checkpoint(room, { x: me.x, y: me.y, z: me.z });
      }
      if (!completed && me.z < -349 && me.y > 18) {
        completed = true;
        if (typeof on.complete === 'function') on.complete();
      }
    }
  }

  function roomSubtitle(room) {
    return {
      gate: 'Time the axes and watch the geysers!',
      causeway: 'Stand on the plate, then sprint the bridge. Friends make it easier!',
      spiral: 'Climb the Ember Spiral. Mind the geysers.',
      overlook: 'You made it! Bump the volunteer carrots, or take the portal home.'
    }[room];
  }

  // --------------------------------------------------------------------------
  // PUBLIC: GAMEPLAY QUERIES
  // --------------------------------------------------------------------------
  function checkHazards(p) {
    // 1. Swinging Obsidian Battleaxes
    for (let i = 0; i < pendulums.length; i++) {
      const h = pendulums[i].hit;
      if (Math.hypot(h.x - p.x, h.y - (p.y + 1.3), h.z - p.z) < 2.5) {
        return 'Swinging Obsidian Pendulum';
      }
    }
    // 2. Realistic Erupting Lava Geysers
    for (let i = 0; i < geysers.length; i++) {
      const g = geysers[i];
      if (g.active && Math.hypot(g.x - p.x, g.z - p.z) < 2.2 && p.y - g.y > -0.5 && p.y - g.y < 6.0) {
        return 'Erupting Lava Geyser';
      }
    }
    // 3. Dragon Gargoyle Flamethrowers on the Spiral
    for (let i = 0; i < flameJets.length; i++) {
      const fj = flameJets[i];
      if (fj.active) {
        const dx = p.x - fj.x;
        const dy = (p.y + 0.8) - fj.y;
        const dz = p.z - fj.z;
        const dot = dx * fj.dir.x + dz * fj.dir.z;
        if (dot >= 0 && dot <= fj.length && Math.abs(dy) < 1.9) {
          const perpDist = Math.abs(dx * (-fj.dir.z) + dz * fj.dir.x);
          if (perpDist < 1.7) {
            return 'Dragon Gargoyle Flamethrower';
          }
        }
      }
    }
    // 4. Runic Obsidian Floor Spikes on the Spiral
    for (let i = 0; i < floorSpikes.length; i++) {
      const sp = floorSpikes[i];
      if (sp.extended && Math.hypot(sp.x - p.x, sp.z - p.z) < sp.radius && Math.abs(p.y - sp.y) < 1.8) {
        return 'Runic Obsidian Spikes';
      }
    }
    return null;
  }

  function getInteractables(p) {
    const out = [];
    const dGate = Math.hypot(p.x, p.z - 8);
    if (dGate < 7 && p.y < 5) {
      out.push({ kind: 'v_exit', dist: dGate, prompt: 'Leave the Trial · Back to the Rear Wharf [E] 🌊' });
    }
    if (p.y > 18) {
      const dPortal = Math.hypot(p.x - 12, p.z + 352);
      if (dPortal < 5.2) {
        out.push({ kind: 'v_portal', dist: dPortal, prompt: 'Step through the Return Portal · Great Portal Gate [E] 🌀' });
      }
      const dTea = Math.hypot(p.x - 2.8, p.z + 314.5);
      if (dTea < 4.8) {
        out.push({ kind: 'v_tea', dist: dTea, prompt: 'Sip Warm Rest-Nook Tea [E] 🍵' });
      }
    }
    return out;
  }

  function knockCarrot(idx, vx, vy, vz) {
    const c = carrots[idx];
    if (!c || c.state !== 'home') return false;
    c.state = 'fly';
    c.knocked = true;
    c.respawn = 18.0;
    c.vel.set(vx, vy, vz);
    return true;
  }

  return {
    build,
    isBuilt: () => built,
    isActive: () => active,
    setActive,
    resetVolunteerCarrots,
    getScene: () => scn,
    getStart: () => START,
    on: setHandlers,
    update,
    getFloorHeight,
    resolveMove,
    getCeilingY,
    getRoom,
    getRoomTitle: (z) => ROOM_TITLES[getRoom(z)],
    checkHazards,
    getInteractables,
    getCarrots: () => carrots,
    knockCarrot,
    getTraps: () => ({ pendulums, geysers, flameJets, floorSpikes }),
    constants: { LAVA_Y, BALCONY }
  };
})();
