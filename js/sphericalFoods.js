// =============================================================================
// SPHERICAL FOODS BISTRO & ROTUNDA (DEDICATED INTERIOR INSTANCE) - PASS 27
// "Everything is better in a sphere — No flat food allowed!"
// Propriétaire: Monsieur Betterave · Est. October 24
// HELEN'S BIRTHDAY CELEBRATION EXTRAVAGANZA EDITION
// =============================================================================

window.BlahajSphericalFoods = (function () {
  'use strict';

  let scene = null;
  let active = false;
  let built = false;

  // Key mesh groups & references
  let rotundaGroup = null;
  let chandelierLight = null;
  let chandelierGroup = null;
  let cakeGroup = null;
  let candleFlameMesh = null;
  let candleLight = null;
  let sousChefBirbMesh = null;
  const tableCandleLights = [];
  const kitchenSteamParticles = [];
  const balloonMeshes = [];

  // Birthday Celebration Decor System (Week of Oct 24)
  let birthdayDecorGroup = null;
  const fairyLightMeshes = [];
  const ambientConfetti = [];
  let betteravePartyHat = null;
  let birbPartyHat = null;

  // Waiter & Trolley system
  let waiterParentGroup = null;
  let betteraveMesh = null;
  let trolleyGroup = null;
  let trolleyClocheGroup = null;
  const trolleyWheels = [];
  let waiterState = {
    mode: 'idle', // 'idle' | 'delivering' | 'serving' | 'returning'
    dishKey: null,
    boothIndex: -1,
    startPos: { x: 0, y: 0, z: 2.2 },
    targetPos: { x: 0, y: 0, z: 2.2 },
    facingAngle: 0,
    timer: 0,
    walkProgress: 0,
    walkDuration: 3.2,
    trolleyDishMesh: null
  };

  // Sparkle particle system for feasting & party poppers
  const activeSparkles = [];

  // Interaction coordinates inside the bistro rotunda
  const START_POS = { x: 0, y: 0.1, z: 12.0, rotY: Math.PI };
  const EXIT_POS = { x: 0, y: 0, z: 13.5 };
  const MAITRE_D_POS = { x: 0, y: 0, z: 2.2 };
  const HELEN_ALCOVE_POS = { x: 6.2, y: 0, z: -2.8 };

  // 4 Grand Plush Banquette Booths
  const BOOTH_CONFIGS = [
    { id: 0, name: "Le Coin Nord-Ouest", angle: Math.PI * 1.30, radius: 9.8 }, // Northwest
    { id: 1, name: "La Baie de L'Ouest", angle: Math.PI * 1.05, radius: 10.0 }, // West
    { id: 2, name: "L'Alcove Sud-Ouest", angle: Math.PI * 0.75, radius: 9.8 },  // Southwest
    { id: 3, name: "Le Salon Sud-Est",   angle: Math.PI * 0.25, radius: 9.8 }   // Southeast
  ];

  // 6 Menu-Inspired Wall Art Paintings with Lore
  const PAINTING_CONFIGS = [
    {
      id: 0,
      title: "L'Homard Sphérique",
      subtitle: "Maine Lobster Bisque Spheres & Gold Leaf",
      angle: Math.PI * 1.40,
      accentColor: "#dc2626",
      dishColor: "#b91c1c",
      description: "“A sublime scarlet orb of 14-hour simmered Maine lobster bisque, suspended in savory marine gelee and dusted with 24-karat gold leaf. Winner of the 2024 Golden Ladle!”",
      tastingNotes: "Briny sweet lobster butter, aromatic tarragon, crisp cognac snap.",
      orderKey: "mac_spheres"
    },
    {
      id: 1,
      title: "L'Arancini Royale",
      subtitle: "Saffron Risotto Pearl with Fior di Latte",
      angle: Math.PI * 1.70,
      accentColor: "#f59e0b",
      dishColor: "#fbbf24",
      description: "“Golden threads of Iranian saffron infused into Carnaroli risotto, molded around a molten heart of hand-pulled fior di latte and flash-crisped in sunflower oil.”",
      tastingNotes: "Nutty toasted crust, floral saffron warmth, rich decadent cheese stretch.",
      orderKey: "mac_spheres"
    },
    {
      id: 2,
      title: "La Bombe Céleste d'Hélène",
      subtitle: "Helen's Birthday Masterpiece · October 24",
      angle: Math.PI * 1.95,
      accentColor: "#ec4899",
      dishColor: "#9f1239",
      description: "“The legendary spherical birthday cake created exclusively for Helen's birthday week! Ruby raspberry-rose glaçage miroir, beetroot velvet chiffon, and edible golden stars.”",
      tastingNotes: "Tart raspberry explosion, floral rosewater, velvety cocoa sponge.",
      orderKey: "helen_cake"
    },
    {
      id: 3,
      title: "Le Globe de Truffe Noire",
      subtitle: "Black Winter Truffle & Gruyère Orb",
      angle: Math.PI * 0.90,
      accentColor: "#78350f",
      dishColor: "#451a03",
      description: "“Perigord black truffle folded into 36-month cave-aged Gruyère macaroni, encrusted in microscopic panko beads and crowned with a single shaved truffle petal.”",
      tastingNotes: "Earthy woodland musk, sharp savory umami, delicate crunch.",
      orderKey: "mac_spheres"
    },
    {
      id: 4,
      title: "La Perle de Miso Ramen",
      subtitle: "Tonkotsu Broth Sphere & Mini Bao",
      angle: Math.PI * 0.62,
      accentColor: "#0284c7",
      dishColor: "#0ea5e9",
      description: "“A molecular triumph! Rich 18-hour tonkotsu miso broth encapsulated in a delicate calcium sphere that bursts delightfully on the palate, served alongside steamed bao pearls.”",
      tastingNotes: "Silken umami broth, ginger aroma, pillowy steamed dough.",
      orderKey: "ramen_spheres"
    },
    {
      id: 5,
      title: "Le Mochi Matcha & Fraise",
      subtitle: "Matcha Geode & Ruby Strawberry Sphere",
      angle: Math.PI * 0.38,
      accentColor: "#10b981",
      dishColor: "#059669",
      description: "“Ceremonial grade Uji matcha ganache nestled beside a polished sphere of wild alpine strawberry mochi, dusted with pulverized sweet pistachio dust.”",
      tastingNotes: "Grassy bittersweet matcha, juicy wild berry punch, chewy rice cloud.",
      orderKey: "mochi_spheres"
    }
  ];

  // Helen's Birthday Week Date Check
  function isHelensBirthdayWeek() {
    if (typeof window !== 'undefined' && window.__FORCE_HELENS_BIRTHDAY__) {
      return true;
    }
    const now = new Date();
    const month = now.getMonth();
    const day = now.getDate();
    return (month === 9 && day >= 21 && day <= 27);
  }

  // Helper: Procedural Oil Painting Texture Generator for Wall Art
  function createPaintingTexture(config) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 384;
    const ctx = canvas.getContext('2d');

    const bgGrad = ctx.createRadialGradient(256, 192, 40, 256, 192, 280);
    bgGrad.addColorStop(0, '#2d1b14');
    bgGrad.addColorStop(0.7, '#180f0b');
    bgGrad.addColorStop(1, '#0c0705');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 512, 384);

    ctx.save();
    ctx.strokeStyle = '#d8aa5b';
    ctx.lineWidth = 6;
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.ellipse(256, 175, 195, 140, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#92400e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(256, 175, 190, 135, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    const tableGrad = ctx.createLinearGradient(120, 260, 392, 310);
    tableGrad.addColorStop(0, '#451a03');
    tableGrad.addColorStop(0.5, '#78350f');
    tableGrad.addColorStop(1, '#2e1207');
    ctx.fillStyle = tableGrad;
    ctx.beginPath();
    ctx.ellipse(256, 275, 160, 32, 0, 0, Math.PI * 2);
    ctx.fill();

    const clocheGrad = ctx.createRadialGradient(235, 230, 20, 256, 250, 140);
    clocheGrad.addColorStop(0, '#f8fafc');
    clocheGrad.addColorStop(0.4, '#cbd5e1');
    clocheGrad.addColorStop(0.8, '#64748b');
    clocheGrad.addColorStop(1, '#334155');
    ctx.fillStyle = clocheGrad;
    ctx.beginPath();
    ctx.ellipse(256, 260, 135, 24, 0, 0, Math.PI * 2);
    ctx.fill();

    const dishGrad = ctx.createRadialGradient(225, 140, 15, 256, 175, 95);
    dishGrad.addColorStop(0, '#ffffff');
    dishGrad.addColorStop(0.2, config.accentColor);
    dishGrad.addColorStop(0.75, config.dishColor);
    dishGrad.addColorStop(1, '#1c0a06');
    ctx.fillStyle = dishGrad;
    ctx.beginPath();
    ctx.arc(256, 170, 75, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.75)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(256, 170, 96, 26, -0.32, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.beginPath();
    ctx.ellipse(225, 140, 24, 14, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.font = 'bold 19px serif';
    ctx.fillStyle = '#fef3c7';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0,0,0,0.85)';
    ctx.shadowBlur = 6;
    ctx.fillText(config.title, 256, 335);

    ctx.font = 'italic 12px sans-serif';
    ctx.fillStyle = '#fde68a';
    ctx.fillText(config.subtitle, 256, 356);
    ctx.restore();

    const texture = new THREE.CanvasTexture(canvas);
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    return texture;
  }

  // Helper: Grand Birthday Celebration Banner Canvas Texture
  function createBirthdayBannerTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // Rich royal purple & magenta velvet background
    const grad = ctx.createLinearGradient(0, 0, 1024, 0);
    grad.addColorStop(0, '#4a044e');
    grad.addColorStop(0.2, '#831843');
    grad.addColorStop(0.5, '#9f1239');
    grad.addColorStop(0.8, '#831843');
    grad.addColorStop(1, '#4a044e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 256);

    // Gilded double borders
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 8;
    ctx.strokeRect(10, 10, 1004, 236);

    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 3;
    ctx.strokeRect(18, 18, 988, 220);

    // Festive Headline
    ctx.font = 'bold 54px serif';
    ctx.fillStyle = '#fef08a';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 16;
    ctx.fillText('✨ JOYEUX ANNIVERSAIRE, HÉLÈNE! ✨', 512, 105);

    // Subtitle
    ctx.font = 'italic bold 26px sans-serif';
    ctx.fillStyle = '#fce7f3';
    ctx.shadowBlur = 8;
    ctx.fillText('LA GRANDE FÊTE DU 24 OCTOBRE · VIVE LA SPHÈRE!', 512, 165);

    // Golden stars & party confetti accents
    ctx.fillStyle = '#fbbf24';
    [50, 95, 140, 884, 929, 974].forEach((sx, i) => {
      ctx.beginPath();
      ctx.arc(sx, 75 + (i % 2) * 45, 11, 0, Math.PI * 2);
      ctx.fill();
    });

    const texture = new THREE.CanvasTexture(canvas);
    texture.generateMipmaps = true;
    return texture;
  }

  // Helen's Celestial Birthday Bombe (Centerpiece Alcove Cake)
  function createHelensBirthdayCake() {
    const group = new THREE.Group();

    const pedestalMat = new THREE.MeshStandardMaterial({
      color: 0xd8aa5b,
      metalness: 0.88,
      roughness: 0.22
    });

    const baseRing = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.8, 0.2, 32), pedestalMat);
    baseRing.position.y = 0.1;
    group.add(baseRing);

    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.55, 0.75, 24), pedestalMat);
    stem.position.y = 0.575;
    group.add(stem);

    const platter = new THREE.Mesh(new THREE.CylinderGeometry(1.85, 1.7, 0.14, 32), pedestalMat);
    platter.position.y = 1.02;
    group.add(platter);

    const mirrorGlazeMat = new THREE.MeshStandardMaterial({
      color: 0x9f1239,
      roughness: 0.08,
      metalness: 0.35
    });
    const cakeSphere = new THREE.Mesh(new THREE.SphereGeometry(1.15, 32, 28), mirrorGlazeMat);
    cakeSphere.position.y = 2.05;
    group.add(cakeSphere);

    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      metalness: 0.9,
      roughness: 0.15
    });
    const orbitRing1 = new THREE.Mesh(new THREE.TorusGeometry(1.48, 0.045, 12, 48), ringMat);
    orbitRing1.rotation.x = Math.PI * 0.42;
    orbitRing1.rotation.y = Math.PI * 0.15;
    orbitRing1.position.y = 2.05;
    group.add(orbitRing1);

    const orbitRing2 = new THREE.Mesh(new THREE.TorusGeometry(1.36, 0.035, 12, 48), ringMat);
    orbitRing2.rotation.x = -Math.PI * 0.35;
    orbitRing2.rotation.y = -Math.PI * 0.25;
    orbitRing2.position.y = 2.05;
    group.add(orbitRing2);

    const starMat = new THREE.MeshStandardMaterial({
      color: 0xfffbeb,
      metalness: 0.8,
      roughness: 0.2
    });
    for (let i = 0; i < 22; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 1.16;
      const star = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), starMat);
      star.position.set(
        r * Math.sin(phi) * Math.cos(theta),
        2.05 + r * Math.cos(phi),
        r * Math.sin(phi) * Math.sin(theta)
      );
      group.add(star);
    }

    const goldDripMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      metalness: 0.85,
      roughness: 0.25
    });
    for (let d = 0; d < 12; d++) {
      const angle = (d / 12) * Math.PI * 2;
      const drip = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), goldDripMat);
      drip.position.set(Math.cos(angle) * 1.14, 1.45 + (d % 3) * 0.08, Math.sin(angle) * 1.14);
      group.add(drip);
    }

    const candleMat = new THREE.MeshStandardMaterial({ color: 0xf43f5e, roughness: 0.3 });
    const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.65, 16), candleMat);
    candle.position.set(0, 3.25, 0);
    group.add(candle);

    const flameMat = new THREE.MeshBasicMaterial({ color: 0xffedd5 });
    candleFlameMesh = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10), flameMat);
    candleFlameMesh.scale.set(0.7, 1.6, 0.7);
    candleFlameMesh.position.set(0, 3.65, 0);
    group.add(candleFlameMesh);

    candleLight = new THREE.PointLight(0xffaa33, 1.8, 7.5, 1.2);
    candleLight.position.set(0, 3.75, 0);
    group.add(candleLight);

    return group;
  }

  // Monsieur Betterave Character Mesh
  function createMonsieurBetterave() {
    const group = new THREE.Group();

    const skinMat = new THREE.MeshStandardMaterial({
      color: 0x881337,
      roughness: 0.45,
      metalness: 0.12
    });
    const tapRootMat = new THREE.MeshStandardMaterial({
      color: 0x4c0519,
      roughness: 0.6
    });

    const beetBody = new THREE.Mesh(new THREE.SphereGeometry(0.75, 24, 20), skinMat);
    beetBody.position.y = 1.15;
    beetBody.scale.set(1.0, 1.22, 1.0);
    group.add(beetBody);

    const tapRoot = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.7, 14), tapRootMat);
    tapRoot.rotation.x = Math.PI;
    tapRoot.position.y = 0.32;
    group.add(tapRoot);

    const leafStemMat = new THREE.MeshStandardMaterial({ color: 0x9f1239, roughness: 0.5 });
    const leafBladeMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.42 });

    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.04, 0.55, 8), leafStemMat);
      stem.position.set(Math.cos(a) * 0.18, 1.85, Math.sin(a) * 0.18);
      stem.rotation.z = Math.cos(a) * 0.35;
      stem.rotation.x = Math.sin(a) * 0.35;
      group.add(stem);

      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), leafBladeMat);
      leaf.scale.set(1.2, 2.2, 0.25);
      leaf.position.set(Math.cos(a) * 0.32, 2.15, Math.sin(a) * 0.32);
      leaf.rotation.y = a;
      leaf.rotation.z = Math.cos(a) * 0.4;
      group.add(leaf);
    }

    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.1 });
    const catchMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    [-1, 1].forEach((side) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.065, 10, 10), eyeMat);
      eye.position.set(side * 0.24, 1.28, 0.58);
      group.add(eye);

      const catchlight = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 6), catchMat);
      catchlight.position.set(side * 0.24 + 0.02, 1.30, 0.63);
      group.add(catchlight);
    });

    const stacheMat = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.4 });
    const stacheL = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.028, 8, 16, Math.PI * 0.8), stacheMat);
    stacheL.position.set(-0.08, 1.12, 0.62);
    stacheL.rotation.z = -Math.PI * 0.3;
    group.add(stacheL);

    const stacheR = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.028, 8, 16, Math.PI * 0.8), stacheMat);
    stacheR.position.set(0.08, 1.12, 0.62);
    stacheR.rotation.z = Math.PI * 0.3;
    stacheR.scale.x = -1;
    group.add(stacheR);

    const bowMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.25, metalness: 0.8 });
    const bowCenter = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), bowMat);
    bowCenter.position.set(0, 0.94, 0.65);
    group.add(bowCenter);

    [-1, 1].forEach((dir) => {
      const bowWing = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.12, 8), bowMat);
      bowWing.rotation.z = dir * Math.PI / 2;
      bowWing.position.set(dir * 0.11, 0.94, 0.65);
      group.add(bowWing);
    });

    // Arms pushing trolley
    const armMat = skinMat;
    [-0.32, 0.32].forEach((ax) => {
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.055, 0.52, 10), armMat);
      arm.position.set(ax, 0.95, 0.46);
      arm.rotation.x = Math.PI * 0.35;
      group.add(arm);

      const glove = new THREE.Mesh(
        new THREE.SphereGeometry(0.065, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 })
      );
      glove.position.set(ax, 0.82, 0.72);
      group.add(glove);
    });

    // Monsieur Betterave Festive Birthday Party Hat
    betteravePartyHat = new THREE.Group();
    betteravePartyHat.position.set(0.08, 2.38, 0.05);
    betteravePartyHat.rotation.z = -0.18;
    betteravePartyHat.rotation.x = 0.10;

    const hatMat = new THREE.MeshStandardMaterial({
      color: 0xec4899,
      metalness: 0.3,
      roughness: 0.25
    });
    const hatCone = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.52, 18), hatMat);
    hatCone.position.y = 0.26;
    betteravePartyHat.add(hatCone);

    // Golden metallic spiral stripes on hat
    const goldHatMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.85, roughness: 0.2 });
    [0.12, 0.28, 0.42].forEach((hy, i) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.20 - i * 0.045, 0.016, 6, 20), goldHatMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = hy;
      betteravePartyHat.add(ring);
    });

    // Fluffy Golden Pom-Pom
    const pomPom = new THREE.Mesh(new THREE.SphereGeometry(0.065, 10, 10), goldHatMat);
    pomPom.position.y = 0.54;
    betteravePartyHat.add(pomPom);

    group.add(betteravePartyHat);

    return group;
  }

  // French Mahogany & Brass Gueridon (Serving Trolley)
  function createServingTrolley() {
    const group = new THREE.Group();
    trolleyWheels.length = 0;

    const mahoganyMat = new THREE.MeshStandardMaterial({
      color: 0x2e1207,
      roughness: 0.35,
      metalness: 0.12
    });
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xd8aa5b,
      roughness: 0.22,
      metalness: 0.88
    });
    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      roughness: 0.12,
      metalness: 0.95
    });
    const rubberMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.8
    });

    // 1. Top & Lower Shelves
    const topShelf = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.045, 0.58), mahoganyMat);
    topShelf.position.y = 0.82;
    topShelf.receiveShadow = true;
    group.add(topShelf);

    const bottomShelf = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.04, 0.58), mahoganyMat);
    bottomShelf.position.y = 0.28;
    bottomShelf.receiveShadow = true;
    group.add(bottomShelf);

    // 2. White Crisp Linen Runner on Top Shelf
    const linenMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.6 });
    const runner = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.01, 0.48), linenMat);
    runner.position.set(0, 0.845, 0);
    group.add(runner);

    // 3. Four Turned Brass Legs with Caster Wheels
    const legPositions = [
      { x: -0.38, z: -0.24 },
      { x: 0.38, z: -0.24 },
      { x: -0.38, z: 0.24 },
      { x: 0.38, z: 0.24 }
    ];

    legPositions.forEach((pos) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.84, 12), brassMat);
      leg.position.set(pos.x, 0.44, pos.z);
      group.add(leg);

      const finial = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), brassMat);
      finial.position.set(pos.x, 0.87, pos.z);
      group.add(finial);

      const casterFork = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.06, 8), brassMat);
      casterFork.position.set(pos.x, 0.07, pos.z);
      group.add(casterFork);

      const wheelGroup = new THREE.Group();
      wheelGroup.position.set(pos.x, 0.04, pos.z);

      const tire = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.015, 8, 16), rubberMat);
      tire.rotation.y = Math.PI / 2;
      wheelGroup.add(tire);

      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.02, 10), brassMat);
      hub.rotation.z = Math.PI / 2;
      wheelGroup.add(hub);

      trolleyWheels.push(wheelGroup);
      group.add(wheelGroup);
    });

    // Guardrail Wire around Top Shelf
    [-0.25, 0.25].forEach((rz) => {
      const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.78, 8), brassMat);
      rail.rotation.z = Math.PI / 2;
      rail.position.set(0, 0.88, rz);
      group.add(rail);
    });

    // 4. Arched Push Handlebar on Waiter Side (-Z)
    const handleBar = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.74, 12), brassMat);
    handleBar.rotation.z = Math.PI / 2;
    handleBar.position.set(0, 0.94, -0.36);
    group.add(handleBar);

    [-0.32, 0.32].forEach((hx) => {
      const hArm = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.16, 8), brassMat);
      hArm.rotation.x = Math.PI * 0.35;
      hArm.position.set(hx, 0.89, -0.30);
      group.add(hArm);
    });

    // Trolley Balloons (Trailing celebration balloons tied to trolley handle!)
    const trolleyBalloonColors = [0xfbbf24, 0xec4899];
    trolleyBalloonColors.forEach((bCol, bIdx) => {
      const bSign = bIdx === 0 ? -1 : 1;
      const bGroup = new THREE.Group();
      bGroup.position.set(bSign * 0.35, 1.85 + bIdx * 0.15, -0.32);
      bGroup.userData = { seed: bIdx * 2.5, basePos: { x: bSign * 0.35, y: 1.85 + bIdx * 0.15, z: -0.32 } };

      const bMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.24, 16, 14),
        new THREE.MeshStandardMaterial({ color: bCol, roughness: 0.18, metalness: 0.15 })
      );
      bMesh.scale.set(1.0, 1.18, 1.0);
      bGroup.add(bMesh);

      const bRibbon = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.92, 6), brassMat);
      bRibbon.position.y = -0.46;
      bGroup.add(bRibbon);

      balloonMeshes.push(bGroup);
      group.add(bGroup);
    });

    // 5. Domed Cloche Group (Can lift and close smoothly)
    trolleyClocheGroup = new THREE.Group();
    trolleyClocheGroup.position.set(0, 0.85, 0);

    const clochePlatter = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.025, 24), chromeMat);
    clochePlatter.position.y = 0.01;
    group.add(clochePlatter);

    const clocheDome = new THREE.Mesh(
      new THREE.SphereGeometry(0.25, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.5),
      chromeMat
    );
    trolleyClocheGroup.add(clocheDome);

    const clocheRim = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.018, 8, 24), brassMat);
    clocheRim.rotation.x = Math.PI / 2;
    trolleyClocheGroup.add(clocheRim);

    const clocheHandle = new THREE.Mesh(new THREE.SphereGeometry(0.038, 10, 10), brassMat);
    clocheHandle.position.y = 0.28;
    trolleyClocheGroup.add(clocheHandle);

    group.add(trolleyClocheGroup);

    return group;
  }

  // 3D Served Dish Model Generator
  function createServedDishMesh(dishKey) {
    const dishGroup = new THREE.Group();

    const brassMat = new THREE.MeshStandardMaterial({ color: 0xd8aa5b, metalness: 0.85, roughness: 0.22 });
    const chinaWhiteMat = new THREE.MeshStandardMaterial({ color: 0xfaf8f5, roughness: 0.15 });
    const slateMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.75 });

    if (dishKey === 'helen_cake') {
      const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.26, 0.035, 24), brassMat);
      stand.position.y = 0.018;
      dishGroup.add(stand);

      const glazeMat = new THREE.MeshStandardMaterial({ color: 0x9f1239, roughness: 0.06, metalness: 0.4 });
      const cake = new THREE.Mesh(new THREE.SphereGeometry(0.18, 24, 20), glazeMat);
      cake.position.y = 0.20;
      dishGroup.add(cake);

      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.014, 8, 24), brassMat);
      ring.rotation.x = Math.PI * 0.38;
      ring.rotation.y = Math.PI * 0.18;
      ring.position.y = 0.20;
      dishGroup.add(ring);

      const starMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.15, metalness: 0.7 });
      for (let s = 0; s < 10; s++) {
        const sa = (s / 10) * Math.PI * 2;
        const star = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 6), starMat);
        star.position.set(Math.cos(sa) * 0.18, 0.20 + Math.sin(sa * 2) * 0.08, Math.sin(sa) * 0.18);
        dishGroup.add(star);
      }

      const candle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.015, 0.015, 0.12, 10),
        new THREE.MeshStandardMaterial({ color: 0xf43f5e, roughness: 0.3 })
      );
      candle.position.y = 0.44;
      dishGroup.add(candle);

      const flame = new THREE.Mesh(
        new THREE.SphereGeometry(0.024, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xffedd5 })
      );
      flame.scale.set(0.6, 1.5, 0.6);
      flame.position.y = 0.52;
      dishGroup.add(flame);

      const cLight = new THREE.PointLight(0xffa500, 0.85, 3.2, 1.4);
      cLight.position.set(0, 0.54, 0);
      dishGroup.add(cLight);

    } else if (dishKey === 'ramen_spheres') {
      const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.16, 0.065, 24), chinaWhiteMat);
      bowl.position.y = 0.032;
      dishGroup.add(bowl);

      const brothPearlMat = new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        transparent: true,
        opacity: 0.88,
        roughness: 0.08
      });

      [-0.09, 0.09].forEach((px, idx) => {
        const spoon = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.03, 0.015, 12), chinaWhiteMat);
        spoon.position.set(px, 0.065, -0.04 + idx * 0.08);
        dishGroup.add(spoon);

        const pearl = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 10), brothPearlMat);
        pearl.position.set(px, 0.095, -0.04 + idx * 0.08);
        dishGroup.add(pearl);
      });

      const baoMat = new THREE.MeshStandardMaterial({ color: 0xfdfaf7, roughness: 0.85 });
      const bao = new THREE.Mesh(new THREE.SphereGeometry(0.06, 14, 12), baoMat);
      bao.scale.set(1.1, 0.8, 1.1);
      bao.position.set(0, 0.085, 0.05);
      dishGroup.add(bao);

      const scallionMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.4 });
      for (let sc = 0; sc < 4; sc++) {
        const scm = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.03, 6), scallionMat);
        scm.rotation.z = Math.PI / 2;
        scm.rotation.y = sc * 1.2;
        scm.position.set(Math.sin(sc) * 0.07, 0.07, Math.cos(sc) * 0.07);
        dishGroup.add(scm);
      }

    } else if (dishKey === 'mochi_spheres') {
      const platter = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.025, 0.24), slateMat);
      platter.position.y = 0.012;
      dishGroup.add(platter);

      const matchaMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.65 });
      const strawberryMat = new THREE.MeshStandardMaterial({ color: 0xf43f5e, roughness: 0.25 });

      [-0.12, -0.04].forEach((mx) => {
        const mSphere = new THREE.Mesh(new THREE.SphereGeometry(0.048, 12, 10), matchaMat);
        mSphere.position.set(mx, 0.065, 0);
        dishGroup.add(mSphere);
      });

      [0.05, 0.13].forEach((sx) => {
        const sSphere = new THREE.Mesh(new THREE.SphereGeometry(0.048, 12, 10), strawberryMat);
        sSphere.position.set(sx, 0.065, 0);
        dishGroup.add(sSphere);
      });

      const goldMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.9, roughness: 0.1 });
      for (let g = 0; g < 6; g++) {
        const gf = new THREE.Mesh(new THREE.SphereGeometry(0.01, 6, 6), goldMat);
        gf.position.set((Math.random() - 0.5) * 0.32, 0.08, (Math.random() - 0.5) * 0.14);
        dishGroup.add(gf);
      }

    } else {
      const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.22, 0.025, 24), slateMat);
      plate.position.y = 0.012;
      dishGroup.add(plate);

      const pankoMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.85 });
      const truffleMat = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.5 });

      const orbPositions = [
        { x: -0.06, z: -0.04, y: 0.065 },
        { x: 0.06, z: -0.04, y: 0.065 },
        { x: 0.0, z: 0.06, y: 0.065 }
      ];

      orbPositions.forEach((op) => {
        const orb = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 10), pankoMat);
        orb.position.set(op.x, op.y, op.z);
        dishGroup.add(orb);

        const truffle = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.005, 0.02), truffleMat);
        truffle.position.set(op.x, op.y + 0.055, op.z);
        truffle.rotation.y = Math.random() * Math.PI;
        dishGroup.add(truffle);
      });
    }

    return dishGroup;
  }

  // Miniature Party Favor Cracker on Booth Tables
  function createPartyFavorMesh() {
    const favorGroup = new THREE.Group();

    const foilGoldMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.85, roughness: 0.25 });
    const foilRubyMat = new THREE.MeshStandardMaterial({ color: 0xec4899, metalness: 0.6, roughness: 0.3 });

    // Center Cracker Cylinder
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.16, 12), foilGoldMat);
    body.rotation.z = Math.PI / 2;
    favorGroup.add(body);

    // Twisted Ends
    [-1, 1].forEach((dir) => {
      const twist = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.06, 10), foilRubyMat);
      twist.rotation.z = -dir * Math.PI / 2;
      twist.position.x = dir * 0.11;
      favorGroup.add(twist);

      const bow = new THREE.Mesh(new THREE.TorusGeometry(0.028, 0.008, 6, 12), foilRubyMat);
      bow.position.x = dir * 0.085;
      favorGroup.add(bow);
    });

    return favorGroup;
  }

  // Construct a High-End Luxury Channel-Tufted Velvet Banquette Booth
  function createPlushBanquetteBooth(boothIndex, cfg) {
    const bg = new THREE.Group();
    const bx = Math.cos(cfg.angle) * cfg.radius;
    const bz = Math.sin(cfg.angle) * cfg.radius;
    bg.position.set(bx, 0, bz);

    const inwardAngle = Math.atan2(-bx, -bz);
    bg.rotation.y = inwardAngle;

    const velvetMat = new THREE.MeshStandardMaterial({
      color: 0x78132b,
      roughness: 0.65,
      metalness: 0.08
    });
    const woodMat = new THREE.MeshStandardMaterial({
      color: 0x2e1207,
      roughness: 0.42,
      metalness: 0.1
    });
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xd8aa5b,
      roughness: 0.24,
      metalness: 0.86
    });
    const marbleMat = new THREE.MeshStandardMaterial({
      color: 0xfaf8f5,
      roughness: 0.18,
      metalness: 0.05
    });

    // 1. Curved Mahogany Plinth Base (Clean Segmented Arc)
    const arcRadius = 1.95;
    const numSegments = 10;
    const arcSpan = Math.PI * 0.82;

    for (let i = 0; i < numSegments; i++) {
      const t = (i / (numSegments - 1)) - 0.5;
      const segAngle = t * arcSpan;
      const px = Math.sin(segAngle) * arcRadius;
      const pz = -Math.cos(segAngle) * arcRadius;

      const plinthBlock = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.24, 0.65), woodMat);
      plinthBlock.position.set(px, 0.12, pz);
      plinthBlock.rotation.y = -segAngle;
      bg.add(plinthBlock);

      const flute = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.19, 1.25, 14), velvetMat);
      flute.position.set(px, 0.82, pz);
      flute.rotation.y = -segAngle;
      flute.scale.set(1.0, 1.0, 1.35);
      bg.add(flute);

      const btn = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 8), brassMat);
      btn.position.set(px * 0.92, 0.82, pz * 0.92);
      bg.add(btn);

      const seatBlock = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.26, 0.62), velvetMat);
      seatBlock.position.set(px * 0.78, 0.36, pz * 0.78);
      seatBlock.rotation.y = -segAngle;
      bg.add(seatBlock);
    }

    // Top Polished Brass Handrail / Piping
    const railMat = brassMat;
    const railSegs = 16;
    for (let r = 0; r < railSegs; r++) {
      const t = (r / (railSegs - 1)) - 0.5;
      const a = t * arcSpan;
      const rx = Math.sin(a) * arcRadius;
      const rz = -Math.cos(a) * arcRadius;
      const bead = new THREE.Mesh(new THREE.SphereGeometry(0.038, 8, 8), railMat);
      bead.position.set(rx, 1.45, rz);
      bg.add(bead);
    }

    // 2. Plush Throw Pillows
    const pillowColors = [0xd97706, 0x9d174d];
    [-1, 1].forEach((side, idx) => {
      const cornerAngle = side * (arcSpan * 0.42);
      const cx = Math.sin(cornerAngle) * (arcRadius * 0.82);
      const cz = -Math.cos(cornerAngle) * (arcRadius * 0.82);

      const pillow = new THREE.Mesh(
        new THREE.BoxGeometry(0.38, 0.38, 0.16),
        new THREE.MeshStandardMaterial({ color: pillowColors[idx], roughness: 0.7 })
      );
      pillow.position.set(cx, 0.54, cz);
      pillow.rotation.y = -cornerAngle + side * 0.35;
      pillow.rotation.z = side * 0.18;
      bg.add(pillow);
    });

    // 3. Central Pedestal Dining Table
    const tableGroup = new THREE.Group();
    tableGroup.position.set(0, 0, -0.45);

    const basePlate = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.54, 0.06, 24), brassMat);
    basePlate.position.y = 0.03;
    tableGroup.add(basePlate);

    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.22, 0.72, 18), brassMat);
    stem.position.y = 0.40;
    tableGroup.add(stem);

    const marbleTop = new THREE.Mesh(new THREE.CylinderGeometry(1.22, 1.22, 0.06, 32), marbleMat);
    marbleTop.position.y = 0.78;
    tableGroup.add(marbleTop);

    const brassRim = new THREE.Mesh(new THREE.TorusGeometry(1.22, 0.024, 8, 36), brassMat);
    brassRim.rotation.x = Math.PI / 2;
    brassRim.position.y = 0.78;
    tableGroup.add(brassRim);

    // Bone China Saucers, Teacups & Bread Rolls
    const chinaMat = new THREE.MeshStandardMaterial({ color: 0xfdfbf7, roughness: 0.15 });
    const teaLiquidMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.1 });

    [-0.52, 0.52].forEach((tx, i) => {
      const saucer = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.14, 0.02, 18), chinaMat);
      saucer.position.set(tx, 0.82, -0.15);
      tableGroup.add(saucer);

      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.06, 0.09, 16), chinaMat);
      cup.position.set(tx, 0.87, -0.15);
      tableGroup.add(cup);

      const teaSurf = new THREE.Mesh(new THREE.CircleGeometry(0.082, 16), teaLiquidMat);
      teaSurf.rotation.x = -Math.PI / 2;
      teaSurf.position.set(tx, 0.90, -0.15);
      tableGroup.add(teaSurf);

      const roll = new THREE.Mesh(
        new THREE.SphereGeometry(0.055, 10, 10),
        new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.85 })
      );
      roll.position.set(tx + (i === 0 ? -0.22 : 0.22), 0.84, -0.05);
      tableGroup.add(roll);
    });

    // Amber Candle Lamp Centerpiece
    const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.11, 0.12, 14), brassMat);
    lampBase.position.set(0, 0.87, 0.05);
    tableGroup.add(lampBase);

    const shadeMat = new THREE.MeshStandardMaterial({
      color: 0xffedd5,
      transparent: true,
      opacity: 0.82,
      roughness: 0.3
    });
    const lampShade = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.06, 0.22, 16, 1, true), shadeMat);
    lampShade.position.set(0, 1.02, 0.05);
    tableGroup.add(lampShade);

    const flame = new THREE.Mesh(
      new THREE.SphereGeometry(0.025, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xfffbeb })
    );
    flame.position.set(0, 0.99, 0.05);
    tableGroup.add(flame);

    const candleLight = new THREE.PointLight(0xffa040, 1.15, 5.2, 1.3);
    candleLight.position.set(0, 1.05, 0.05);
    tableCandleLights.push(candleLight);
    tableGroup.add(candleLight);

    // Festive Birthday Party Cracker on Table
    const favorMesh = createPartyFavorMesh();
    favorMesh.position.set(0.28, 0.82, 0.22);
    favorMesh.rotation.y = 0.45;
    tableGroup.add(favorMesh);

    // Container for food served directly onto the booth table
    const tableDishContainer = new THREE.Group();
    tableDishContainer.position.set(0, 0.81, -0.05);
    tableGroup.add(tableDishContainer);

    bg.add(tableGroup);

    // Floating Balloon Bouquet Tied to Booth
    const boothBalloonGroup = new THREE.Group();
    boothBalloonGroup.position.set(0, 1.55, -arcRadius * 0.95);

    const boothColors = [0xfbbf24, 0xec4899, 0xa855f7];
    boothColors.forEach((col, bIdx) => {
      const bRad = 0.22;
      const bAngle = (bIdx / 3) * Math.PI * 2;
      const bY = 1.15 + (bIdx % 2) * 0.35;
      const bMesh = new THREE.Mesh(
        new THREE.SphereGeometry(bRad, 16, 14),
        new THREE.MeshStandardMaterial({ color: col, roughness: 0.15, metalness: 0.18 })
      );
      bMesh.scale.set(1.0, 1.2, 1.0);
      bMesh.position.set(Math.cos(bAngle) * 0.28, bY, Math.sin(bAngle) * 0.28);
      boothBalloonGroup.add(bMesh);

      const bRibbon = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, bY, 6), brassMat);
      bRibbon.position.set(Math.cos(bAngle) * 0.28, bY * 0.5, Math.sin(bAngle) * 0.28);
      boothBalloonGroup.add(bRibbon);
    });

    boothBalloonGroup.userData = { seed: boothIndex * 1.8, basePos: { x: 0, y: 1.55, z: -arcRadius * 0.95 } };
    balloonMeshes.push(boothBalloonGroup);
    bg.add(boothBalloonGroup);

    // Served dish state tracking for this booth
    let currentServedDish = null;

    function setServedDish(dishKey) {
      clearServedDish();
      const titles = {
        helen_cake: "Helen's Celestial Birthday Bombe",
        mac_spheres: "Lava Lychee & Truffle Mac Spheres",
        ramen_spheres: "Miso Ramen & Steamed Bao Spheres",
        mochi_spheres: "Strawberry Mochi & Matcha Tiramisphere"
      };
      const mesh = createServedDishMesh(dishKey);
      tableDishContainer.add(mesh);
      currentServedDish = {
        dishKey: dishKey,
        title: titles[dishKey] || "Spherical Specialty",
        mesh: mesh,
        eaten: false
      };
      return currentServedDish;
    }

    function clearServedDish() {
      if (currentServedDish && currentServedDish.mesh) {
        tableDishContainer.remove(currentServedDish.mesh);
      }
      currentServedDish = null;
    }

    function getServedDish() {
      return currentServedDish;
    }

    return {
      id: boothIndex,
      group: bg,
      config: cfg,
      setServedDish,
      clearServedDish,
      getServedDish,
      getTableWorldPos: () => {
        const wp = new THREE.Vector3();
        tableGroup.getWorldPosition(wp);
        return wp;
      },
      getSeatPos: () => {
        const seatLocal = new THREE.Vector3(0, 0.42, -1.25);
        seatLocal.applyEuler(new THREE.Euler(0, inwardAngle, 0));
        return {
          x: bx + seatLocal.x,
          y: 0.42,
          z: bz + seatLocal.z,
          rotY: inwardAngle
        };
      }
    };
  }

  // Construct Wall Art Gallery of Menu Paintings
  function createWallGallery(rotundaWallRadius, wallHeight) {
    const galleryGroup = new THREE.Group();
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xd8aa5b, roughness: 0.25, metalness: 0.85 });

    PAINTING_CONFIGS.forEach((config) => {
      const pGroup = new THREE.Group();
      const mountRadius = rotundaWallRadius - 0.12;
      const px = Math.cos(config.angle) * mountRadius;
      const pz = Math.sin(config.angle) * mountRadius;
      pGroup.position.set(px, 2.85, pz);

      const wallFacingAngle = Math.atan2(-px, -pz);
      pGroup.rotation.y = wallFacingAngle;

      const frameOuter = new THREE.Mesh(new THREE.BoxGeometry(1.72, 1.32, 0.08), brassMat);
      pGroup.add(frameOuter);

      const frameInnerMat = new THREE.MeshStandardMaterial({ color: 0x3b1d11, roughness: 0.45 });
      const frameInner = new THREE.Mesh(new THREE.BoxGeometry(1.54, 1.14, 0.09), frameInnerMat);
      pGroup.add(frameInner);

      const texture = createPaintingTexture(config);
      const canvasMat = new THREE.MeshBasicMaterial({ map: texture });
      const canvasMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.44, 1.04), canvasMat);
      canvasMesh.position.z = 0.05;
      pGroup.add(canvasMesh);

      [-0.78, 0.78].forEach((rx) => {
        [-0.58, 0.58].forEach((ry) => {
          const rosette = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), brassMat);
          rosette.position.set(rx, ry, 0.05);
          pGroup.add(rosette);
        });
      });

      const sconceStem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.32, 8), brassMat);
      sconceStem.position.set(0, 0.74, 0.16);
      sconceStem.rotation.x = Math.PI * 0.28;
      pGroup.add(sconceStem);

      const sconceHood = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.65, 12), brassMat);
      sconceHood.rotation.z = Math.PI / 2;
      sconceHood.position.set(0, 0.88, 0.26);
      pGroup.add(sconceHood);

      const picSpot = new THREE.PointLight(0xffe6c2, 0.75, 4.0, 1.5);
      picSpot.position.set(0, 0.82, 0.32);
      pGroup.add(picSpot);

      pGroup.userData = { paintingIndex: config.id, config };
      galleryGroup.add(pGroup);
    });

    return galleryGroup;
  }

  // Construct Show Kitchen on North Wall Arc
  function createOpenShowKitchen() {
    const kitchenGroup = new THREE.Group();

    const woodMat = new THREE.MeshStandardMaterial({ color: 0x3b1d11, roughness: 0.45 });
    const tileMat = new THREE.MeshStandardMaterial({ color: 0x065f46, roughness: 0.28 });
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xd8aa5b, roughness: 0.25, metalness: 0.85 });
    const copperMat = new THREE.MeshStandardMaterial({ color: 0xca8a04, roughness: 0.28, metalness: 0.88 });
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.75 });

    const kitchenCenterZ = -11.2;
    const numCounterBlocks = 7;
    const spanWidth = 7.4;

    for (let c = 0; c < numCounterBlocks; c++) {
      const t = (c / (numCounterBlocks - 1)) - 0.5;
      const cx = t * spanWidth;
      const cz = kitchenCenterZ + Math.abs(t) * 0.85;

      const counterBody = new THREE.Mesh(new THREE.BoxGeometry(1.15, 1.12, 1.1), tileMat);
      counterBody.position.set(cx, 0.56, cz);
      counterBody.rotation.y = -t * 0.35;
      kitchenGroup.add(counterBody);

      const counterTop = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.12, 1.2), woodMat);
      counterTop.position.set(cx, 1.18, cz);
      counterTop.rotation.y = -t * 0.35;
      kitchenGroup.add(counterTop);

      const brassTrim = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.04, 0.04), brassMat);
      brassTrim.position.set(cx, 0.12, cz + 0.58);
      brassTrim.rotation.y = -t * 0.35;
      kitchenGroup.add(brassTrim);
    }

    kitchenSteamParticles.length = 0;
    const cauldronPositions = [
      { x: -2.4, z: kitchenCenterZ + 0.35, mat: copperMat, name: "Lobster Bisque" },
      { x: 0.0, z: kitchenCenterZ + 0.05, mat: ironMat, name: "Tonkotsu Miso" },
      { x: 2.4, z: kitchenCenterZ + 0.35, mat: copperMat, name: "Berry Confiture" }
    ];

    cauldronPositions.forEach((pos) => {
      const burner = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.40, 0.04, 18), ironMat);
      burner.position.set(pos.x, 1.26, pos.z);
      kitchenGroup.add(burner);

      const burnerGlow = new THREE.PointLight(0xff6600, 0.7, 1.6, 1.5);
      burnerGlow.position.set(pos.x, 1.28, pos.z);
      kitchenGroup.add(burnerGlow);

      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.28, 0.46, 18), pos.mat);
      pot.position.set(pos.x, 1.51, pos.z);
      kitchenGroup.add(pot);

      const potRim = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.025, 8, 20), brassMat);
      potRim.rotation.x = Math.PI / 2;
      potRim.position.set(pos.x, 1.74, pos.z);
      kitchenGroup.add(potRim);

      kitchenSteamParticles.push({
        basePos: { x: pos.x, y: 1.80, z: pos.z },
        mesh: new THREE.Mesh(
          new THREE.SphereGeometry(0.12, 8, 8),
          new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 })
        )
      });
      kitchenGroup.add(kitchenSteamParticles[kitchenSteamParticles.length - 1].mesh);
    });

    if (window.BlahajModels && typeof window.BlahajModels.createBirb === 'function') {
      sousChefBirbMesh = window.BlahajModels.createBirb(0x60a5fa);
      sousChefBirbMesh.position.set(-1.2, 1.28, kitchenCenterZ + 0.2);
      sousChefBirbMesh.rotation.y = Math.PI * 0.15;
      sousChefBirbMesh.scale.set(0.75, 0.75, 0.75);

      const toqueMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
      const toqueBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.20, 0.08, 12), toqueMat);
      toqueBrim.position.y = 0.52;
      sousChefBirbMesh.add(toqueBrim);
      const toqueTop = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 10), toqueMat);
      toqueTop.scale.set(1.1, 1.3, 1.1);
      toqueTop.position.y = 0.72;
      sousChefBirbMesh.add(toqueTop);

      // Mini Party Hat for Sous-Chef Birb
      birbPartyHat = new THREE.Group();
      birbPartyHat.position.set(0.14, 0.98, 0.05);
      birbPartyHat.rotation.z = -0.32;

      const birbHatMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.4, roughness: 0.3 });
      const bCone = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.26, 12), birbHatMat);
      bCone.position.y = 0.13;
      birbPartyHat.add(bCone);

      const bPom = new THREE.Mesh(
        new THREE.SphereGeometry(0.038, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0xec4899, roughness: 0.3 })
      );
      bPom.position.y = 0.27;
      birbPartyHat.add(bPom);

      sousChefBirbMesh.add(birbPartyHat);
      kitchenGroup.add(sousChefBirbMesh);
    }

    return kitchenGroup;
  }

  // Create Lavish Helen's Birthday Week Decorations
  function createBirthdayCelebrationDecorations(floorRadius, wallHeight) {
    const decorGroup = new THREE.Group();
    fairyLightMeshes.length = 0;
    ambientConfetti.length = 0;

    const brassMat = new THREE.MeshStandardMaterial({ color: 0xd8aa5b, metalness: 0.85, roughness: 0.22 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.8, roughness: 0.2 });

    // 1. Grand Curved Illuminated Birthday Banner ("JOYEUX ANNIVERSAIRE, HÉLÈNE!")
    // Positioned over the South Entrance archway (Z = 12.8, Y = 4.8)
    const bannerGroup = new THREE.Group();
    bannerGroup.position.set(0, 4.8, 12.6);
    bannerGroup.rotation.y = Math.PI; // Face North into dining room

    const bannerTexture = createBirthdayBannerTexture();
    const bannerMat = new THREE.MeshBasicMaterial({ map: bannerTexture, side: THREE.DoubleSide });
    const bannerMesh = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 1.3), bannerMat);
    bannerGroup.add(bannerMesh);

    // Gilded Frame around banner
    const bannerBorder = new THREE.Mesh(new THREE.BoxGeometry(5.35, 1.45, 0.06), brassMat);
    bannerBorder.position.z = -0.04;
    bannerGroup.add(bannerBorder);

    // Festive Fairy Light Festoon across Banner
    const numFairyLights = 18;
    for (let f = 0; f < numFairyLights; f++) {
      const t = (f / (numFairyLights - 1)) - 0.5;
      const lx = t * 4.9;
      const ly = -0.65 - Math.sin((f / (numFairyLights - 1)) * Math.PI) * 0.22; // Sagging catenary

      const bulbMat = new THREE.MeshBasicMaterial({ color: (f % 2 === 0) ? 0xfef08a : 0xf43f5e });
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), bulbMat);
      bulb.position.set(lx, ly, 0.06);
      bannerGroup.add(bulb);
      fairyLightMeshes.push({ mesh: bulb, baseColor: bulbMat.color.getHex(), phase: f * 0.65 });

      // Triangular Pennant Bunting hanging below
      if (f < numFairyLights - 1) {
        const flagX = lx + 0.14;
        const flagMat = new THREE.MeshStandardMaterial({
          color: [0xf59e0b, 0xec4899, 0xa855f7, 0x10b981, 0x38bdf8][f % 5],
          roughness: 0.4
        });
        const flag = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.28, 3), flagMat);
        flag.rotation.x = Math.PI;
        flag.rotation.y = Math.PI / 6;
        flag.position.set(flagX, ly - 0.16, 0.05);
        bannerGroup.add(flag);
      }
    }

    decorGroup.add(bannerGroup);

    // 2. Entrance Balloon Pillars (Left & Right of South Door)
    const pillarPositions = [-2.4, 2.4];
    pillarPositions.forEach((px) => {
      const colGroup = new THREE.Group();
      colGroup.position.set(px, 0, 12.8);

      const spiralColors = [0x9f1239, 0xfbbf24, 0xfce7f3, 0xd97706];
      const numTiers = 9;
      for (let t = 0; t < numTiers; t++) {
        const ty = 0.35 + t * 0.38;
        const baseAngle = t * 0.65;
        for (let b = 0; b < 4; b++) {
          const ba = baseAngle + (b / 4) * Math.PI * 2;
          const col = spiralColors[(t + b) % spiralColors.length];
          const bMesh = new THREE.Mesh(
            new THREE.SphereGeometry(0.20, 12, 10),
            new THREE.MeshStandardMaterial({ color: col, roughness: 0.15, metalness: 0.2 })
          );
          bMesh.position.set(Math.cos(ba) * 0.28, ty, Math.sin(ba) * 0.28);
          colGroup.add(bMesh);
        }
      }

      // Giant Golden Star Balloon on top of pillar
      const starTop = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.38, 0),
        new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.88, roughness: 0.15 })
      );
      starTop.position.y = 3.95;
      colGroup.add(starTop);

      decorGroup.add(colGroup);
    });

    // 3. Radial Catenary Ceiling Streamers (Chandelier to Perimeter Walls)
    const numStreamers = 12;
    const streamerColors = [0xf59e0b, 0xec4899, 0xa855f7, 0x10b981, 0x38bdf8, 0xf43f5e];

    for (let s = 0; s < numStreamers; s++) {
      const sa = (s / numStreamers) * Math.PI * 2;
      const sCol = streamerColors[s % streamerColors.length];
      const sMat = new THREE.MeshStandardMaterial({ color: sCol, roughness: 0.45, side: THREE.DoubleSide });

      // Catenary curve points
      const pInner = new THREE.Vector3(Math.cos(sa) * 4.2, 6.2, Math.sin(sa) * 4.2);
      const pOuter = new THREE.Vector3(Math.cos(sa) * 13.6, 4.4, Math.sin(sa) * 13.6);
      const pMid = new THREE.Vector3(Math.cos(sa) * 8.8, 3.8 + (s % 2) * 0.4, Math.sin(sa) * 8.8);

      const curve = new THREE.QuadraticBezierCurve3(pInner, pMid, pOuter);
      const geom = new THREE.TubeGeometry(curve, 16, 0.035, 6, false);
      const streamerMesh = new THREE.Mesh(geom, sMat);
      decorGroup.add(streamerMesh);

      // Hanging metallic tassel ribbons at the wall anchor
      const tassel = new THREE.Mesh(
        new THREE.ConeGeometry(0.08, 0.45, 8),
        new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.85, roughness: 0.2 })
      );
      tassel.position.set(pOuter.x * 0.98, pOuter.y - 0.22, pOuter.z * 0.98);
      decorGroup.add(tassel);
    }

    // 4. Ambient Floating Metallic Confetti Flakes (Persistent celebration atmosphere)
    const confettiColors = [0xfbbf24, 0xec4899, 0x38bdf8, 0xa855f7, 0x10b981, 0xffffff];
    const confettiCount = 48;

    for (let c = 0; c < confettiCount; c++) {
      const col = confettiColors[c % confettiColors.length];
      const cMat = new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide });

      const cGeom = (c % 3 === 0)
        ? new THREE.OctahedronGeometry(0.04, 0)
        : new THREE.PlaneGeometry(0.055, 0.08);

      const cMesh = new THREE.Mesh(cGeom, cMat);

      // Random position inside rotunda dining room
      const rad = Math.random() * 11.5;
      const angle = Math.random() * Math.PI * 2;
      const cy = 1.0 + Math.random() * 5.2;

      cMesh.position.set(Math.cos(angle) * rad, cy, Math.sin(angle) * rad);
      cMesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);

      ambientConfetti.push({
        mesh: cMesh,
        speedY: 0.25 + Math.random() * 0.45,
        rotSpeedX: (Math.random() - 0.5) * 3.5,
        rotSpeedY: (Math.random() - 0.5) * 4.5,
        swayPhase: Math.random() * Math.PI * 2
      });

      decorGroup.add(cMesh);
    }

    return decorGroup;
  }

  // Create Sparkle Particle Burst for Feasting & Party Poppers
  function triggerSparkleBurst(pos, primaryColor, count = 28) {
    if (!scene) return;
    const colors = [0xfbbf24, 0xffffff, 0xf43f5e, 0x38bdf8, 0xa855f7, primaryColor || 0xf59e0b];

    for (let i = 0; i < count; i++) {
      const col = colors[i % colors.length];
      const sparkMat = new THREE.MeshBasicMaterial({
        color: col,
        transparent: true,
        opacity: 1.0
      });

      const geom = (i % 2 === 0)
        ? new THREE.OctahedronGeometry(0.045 + Math.random() * 0.04, 0)
        : new THREE.SphereGeometry(0.035 + Math.random() * 0.03, 6, 6);

      const spark = new THREE.Mesh(geom, sparkMat);
      spark.position.set(
        pos.x + (Math.random() - 0.5) * 0.35,
        pos.y + 0.1 + Math.random() * 0.25,
        pos.z + (Math.random() - 0.5) * 0.35
      );

      const angle = Math.random() * Math.PI * 2;
      const speed = 1.0 + Math.random() * 2.2;
      const upward = 1.8 + Math.random() * 2.5;

      activeSparkles.push({
        mesh: spark,
        vx: Math.cos(angle) * speed,
        vy: upward,
        vz: Math.sin(angle) * speed,
        rotSpeed: (Math.random() - 0.5) * 14,
        life: 0,
        maxLife: 1.2 + Math.random() * 0.6
      });

      scene.add(spark);
    }
  }

  const banquetteBooths = [];

  function build() {
    if (built) return Promise.resolve();

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0e0911);

    rotundaGroup = new THREE.Group();
    banquetteBooths.length = 0;
    tableCandleLights.length = 0;
    activeSparkles.length = 0;

    // 1. Concentric Terrazzo & Mahogany Floor
    const floorRadius = 14.5;
    const floor = new THREE.Mesh(
      new THREE.CylinderGeometry(floorRadius, floorRadius, 0.4, 48),
      new THREE.MeshStandardMaterial({ color: 0x24150e, roughness: 0.38, metalness: 0.08 })
    );
    floor.position.y = -0.2;
    floor.receiveShadow = true;
    rotundaGroup.add(floor);

    const innerFloor = new THREE.Mesh(
      new THREE.CylinderGeometry(11.8, 11.8, 0.02, 48),
      new THREE.MeshStandardMaterial({ color: 0xeee4d3, roughness: 0.25, metalness: 0.05 })
    );
    innerFloor.position.y = 0.01;
    innerFloor.receiveShadow = true;
    rotundaGroup.add(innerFloor);

    const brassInlayMat = new THREE.MeshStandardMaterial({ color: 0xd8aa5b, roughness: 0.25, metalness: 0.85 });
    [4.2, 8.4, 11.8].forEach((r) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.04, 8, 48), brassInlayMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.025;
      rotundaGroup.add(ring);
    });

    // 2. Walls & Wainscoting
    const wallHeight = 7.5;
    const wall = new THREE.Mesh(
      new THREE.CylinderGeometry(floorRadius, floorRadius, wallHeight, 48, 1, true),
      new THREE.MeshStandardMaterial({ color: 0x382b24, roughness: 0.85, side: THREE.BackSide })
    );
    wall.position.y = wallHeight * 0.5;
    rotundaGroup.add(wall);

    const wainscot = new THREE.Mesh(
      new THREE.CylinderGeometry(floorRadius - 0.05, floorRadius - 0.05, 2.6, 48, 1, true),
      new THREE.MeshStandardMaterial({ color: 0x2b170e, roughness: 0.55, side: THREE.BackSide })
    );
    wainscot.position.y = 1.3;
    rotundaGroup.add(wainscot);

    // 3. Vaulted Dome Ceiling
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(floorRadius, 48, 24, 0, Math.PI * 2, 0, Math.PI * 0.5),
      new THREE.MeshStandardMaterial({ color: 0x140f1c, roughness: 0.75, side: THREE.BackSide })
    );
    dome.position.y = wallHeight;
    rotundaGroup.add(dome);

    for (let r = 0; r < 12; r++) {
      const ra = (r / 12) * Math.PI * 2;
      const rib = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, floorRadius * 1.1), brassInlayMat);
      rib.position.set(0, wallHeight + 3.2, 0);
      rib.rotation.y = ra;
      rib.rotation.x = Math.PI * 0.22;
      rotundaGroup.add(rib);
    }

    // 4. Luminous Spheres Chandelier
    chandelierGroup = new THREE.Group();
    chandelierGroup.position.set(0, wallHeight + 1.2, 0);

    const chStem = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.2, 12), brassInlayMat);
    chStem.position.y = 1.6;
    chandelierGroup.add(chStem);

    const globeConfigs = [
      { r: 1.4, count: 6, size: 0.32, y: 0.2 },
      { r: 2.8, count: 10, size: 0.42, y: -0.3 },
      { r: 4.2, count: 14, size: 0.52, y: -0.8 }
    ];

    globeConfigs.forEach((tier) => {
      const ringMesh = new THREE.Mesh(new THREE.TorusGeometry(tier.r, 0.06, 8, 36), brassInlayMat);
      ringMesh.rotation.x = Math.PI / 2;
      ringMesh.position.y = tier.y + 0.1;
      chandelierGroup.add(ringMesh);

      for (let g = 0; g < tier.count; g++) {
        const ga = (g / tier.count) * Math.PI * 2;
        const globe = new THREE.Mesh(
          new THREE.SphereGeometry(tier.size, 16, 14),
          new THREE.MeshBasicMaterial({ color: 0xffeedd })
        );
        globe.position.set(Math.cos(ga) * tier.r, tier.y, Math.sin(ga) * tier.r);
        chandelierGroup.add(globe);
      }
    });

    chandelierLight = new THREE.PointLight(0xffe8ca, 1.35, 24, 1.3);
    chandelierLight.position.set(0, -0.5, 0);
    chandelierGroup.add(chandelierLight);
    rotundaGroup.add(chandelierGroup);

    // 5. 4 Luxury Channel-Tufted Velvet Banquette Booths
    BOOTH_CONFIGS.forEach((cfg, idx) => {
      const bObj = createPlushBanquetteBooth(idx, cfg);
      banquetteBooths.push(bObj);
      rotundaGroup.add(bObj.group);
    });

    // 6. Wall Art Gallery of Menu Paintings
    const galleryGroup = createWallGallery(floorRadius, wallHeight);
    rotundaGroup.add(galleryGroup);

    // 7. Open Show Kitchen on North Wall Arc
    const kitchenGroup = createOpenShowKitchen();
    rotundaGroup.add(kitchenGroup);

    // 8. Helen's Birthday VIP Alcove
    const helenAlcoveGroup = new THREE.Group();
    helenAlcoveGroup.position.set(HELEN_ALCOVE_POS.x, 0, HELEN_ALCOVE_POS.z);

    const dais = new THREE.Mesh(
      new THREE.CylinderGeometry(3.6, 3.8, 0.24, 32),
      new THREE.MeshStandardMaterial({ color: 0xfdfaf6, roughness: 0.22, metalness: 0.12 })
    );
    dais.position.y = 0.12;
    dais.receiveShadow = true;
    helenAlcoveGroup.add(dais);

    const daisTrim = new THREE.Mesh(new THREE.TorusGeometry(3.6, 0.05, 8, 32), brassInlayMat);
    daisTrim.rotation.x = Math.PI / 2;
    daisTrim.position.y = 0.24;
    helenAlcoveGroup.add(daisTrim);

    cakeGroup = createHelensBirthdayCake();
    cakeGroup.position.set(0, 0.24, 0);
    helenAlcoveGroup.add(cakeGroup);

    const balloonColors = [0xf43f5e, 0xfbbf24, 0xa855f7, 0x10b981, 0xec4899, 0x38bdf8, 0xfde047, 0xf472b6];
    balloonMeshes.length = 0;

    balloonColors.forEach((col, idx) => {
      const ba = (idx / balloonColors.length) * Math.PI * 2;
      const bRad = 1.9 + (idx % 2) * 0.45;
      const bx = Math.cos(ba) * bRad;
      const bz = Math.sin(ba) * bRad;
      const by = 2.4 + (idx % 3) * 0.55;

      const bg = new THREE.Group();
      bg.position.set(bx, by, bz);
      bg.userData = { basePos: { x: bx, y: by, z: bz }, seed: idx * 1.3 };

      const bSphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.38, 18, 16),
        new THREE.MeshStandardMaterial({ color: col, roughness: 0.15, metalness: 0.12 })
      );
      bSphere.scale.set(1.0, 1.15, 1.0);
      bg.add(bSphere);

      const ribbon = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, by - 0.24, 6), brassInlayMat);
      ribbon.position.y = -(by - 0.24) * 0.5;
      bg.add(ribbon);

      balloonMeshes.push(bg);
      helenAlcoveGroup.add(bg);
    });

    const plaque = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.32, 0.06),
      new THREE.MeshStandardMaterial({ color: 0xd8aa5b, roughness: 0.25, metalness: 0.85 })
    );
    plaque.position.set(0, 0.36, 3.4);
    helenAlcoveGroup.add(plaque);
    rotundaGroup.add(helenAlcoveGroup);

    // 9. Waiter Monsieur Betterave with Serving Trolley (Gueridon)
    waiterParentGroup = new THREE.Group();
    waiterParentGroup.position.set(MAITRE_D_POS.x, 0, MAITRE_D_POS.z);

    betteraveMesh = createMonsieurBetterave();
    betteraveMesh.position.set(0, 0, -0.25);
    waiterParentGroup.add(betteraveMesh);

    trolleyGroup = createServingTrolley();
    trolleyGroup.position.set(0, 0, 0.62);
    waiterParentGroup.add(trolleyGroup);

    rotundaGroup.add(waiterParentGroup);

    // 10. South Entrance & Exit Doors
    const doorGroup = new THREE.Group();
    doorGroup.position.set(0, 0, 13.6);

    const doorFrame = new THREE.Mesh(
      new THREE.BoxGeometry(3.6, 4.4, 0.25),
      new THREE.MeshStandardMaterial({ color: 0xd8aa5b, roughness: 0.28, metalness: 0.85 })
    );
    doorFrame.position.y = 2.2;
    doorGroup.add(doorFrame);

    const doorMat = new THREE.MeshStandardMaterial({ color: 0x3b1d11, roughness: 0.5 });
    [-0.8, 0.8].forEach((dx) => {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(1.5, 4.1, 0.12), doorMat);
      panel.position.set(dx, 2.15, 0);
      doorGroup.add(panel);

      const porthole = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.06, 12, 24), brassInlayMat);
      porthole.position.set(dx, 2.8, 0.08);
      doorGroup.add(porthole);

      const glass = new THREE.Mesh(
        new THREE.CircleGeometry(0.40, 20),
        new THREE.MeshStandardMaterial({ color: 0xbae6fd, transparent: true, opacity: 0.35, roughness: 0.1 })
      );
      glass.position.set(dx, 2.8, 0.08);
      doorGroup.add(glass);

      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.85, 10), brassInlayMat);
      handle.position.set(dx + (dx > 0 ? -0.45 : 0.45), 2.1, 0.12);
      doorGroup.add(handle);
    });

    const exitSign = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.45, 0.1),
      new THREE.MeshBasicMaterial({ color: 0xdcfce7 })
    );
    exitSign.position.set(0, 4.65, 0);
    doorGroup.add(exitSign);

    const exitLight = new THREE.PointLight(0x86efac, 0.8, 6.5);
    exitLight.position.set(0, 4.65, 0.4);
    doorGroup.add(exitLight);
    rotundaGroup.add(doorGroup);

    // 11. Lavish Helen's Birthday Celebration Decorations (Active during birthday week!)
    birthdayDecorGroup = createBirthdayCelebrationDecorations(floorRadius, wallHeight);
    birthdayDecorGroup.visible = isHelensBirthdayWeek();
    rotundaGroup.add(birthdayDecorGroup);

    // 12. Dimmer Romantic Candlelight Lighting
    const ambientLight = new THREE.AmbientLight(0xffe6cf, 0.32);
    scene.add(ambientLight);

    for (let s = 0; s < 8; s++) {
      const sa = (s / 8) * Math.PI * 2;
      const sconceLight = new THREE.PointLight(0xffb86c, 0.45, 9.5, 1.4);
      sconceLight.position.set(Math.cos(sa) * 13.2, 3.6, Math.sin(sa) * 13.2);
      scene.add(sconceLight);
    }

    scene.add(rotundaGroup);
    built = true;
    return Promise.resolve();
  }

  // Delivery Sequence Trigger
  function orderDishToBooth(boothIndex, dishKey) {
    if (boothIndex < 0 || boothIndex >= banquetteBooths.length) {
      boothIndex = 0;
    }
    const booth = banquetteBooths[boothIndex];
    if (!booth) return false;

    const angle = booth.config.angle;
    const waiterStopRadius = booth.config.radius - 2.1;
    const targetX = Math.cos(angle) * waiterStopRadius;
    const targetZ = Math.sin(angle) * waiterStopRadius;
    const tableAngle = Math.atan2(Math.cos(angle) * booth.config.radius - targetX, Math.sin(angle) * booth.config.radius - targetZ);

    if (waiterState.trolleyDishMesh && trolleyClocheGroup) {
      trolleyClocheGroup.remove(waiterState.trolleyDishMesh);
    }

    waiterState = {
      mode: 'delivering',
      dishKey: dishKey,
      boothIndex: boothIndex,
      startPos: {
        x: waiterParentGroup ? waiterParentGroup.position.x : MAITRE_D_POS.x,
        y: 0,
        z: waiterParentGroup ? waiterParentGroup.position.z : MAITRE_D_POS.z
      },
      targetPos: { x: targetX, y: 0, z: targetZ },
      facingAngle: tableAngle,
      timer: 0,
      walkProgress: 0,
      walkDuration: 3.2,
      trolleyDishMesh: null
    };

    if (trolleyClocheGroup) {
      trolleyClocheGroup.position.y = 0.85;
    }

    return true;
  }

  // Feasting Trigger
  function eatServedDish(boothIndex) {
    if (boothIndex < 0 || boothIndex >= banquetteBooths.length) return null;
    const booth = banquetteBooths[boothIndex];
    const dish = booth.getServedDish();
    if (!dish || dish.eaten) return null;

    dish.eaten = true;
    const wp = booth.getTableWorldPos();
    triggerSparkleBurst(wp, 0xfbbf24, 32);

    if (dish.mesh) {
      let shrinkT = 0;
      const initialScale = dish.mesh.scale.x;
      const shrinkInterval = setInterval(() => {
        shrinkT += 0.08;
        const s = Math.max(0, initialScale * (1.0 - shrinkT));
        dish.mesh.scale.set(s, s, s);
        dish.mesh.rotation.y += 0.35;
        if (shrinkT >= 1.0) {
          clearInterval(shrinkInterval);
          booth.clearServedDish();
        }
      }, 30);
    }

    return {
      dishKey: dish.dishKey,
      title: dish.title,
      isHelensCake: (dish.dishKey === 'helen_cake')
    };
  }

  // Interactive Party Popper Cracker Trigger
  function popBirthdayCracker(pos) {
    const burstPos = pos || (waiterParentGroup ? waiterParentGroup.position : { x: 0, y: 1.2, z: 0 });
    triggerSparkleBurst(burstPos, 0xfbbf24, 36);

    if (window.CozyAudio && typeof window.CozyAudio.birthdayHorn === 'function') {
      window.CozyAudio.birthdayHorn();
    }
    return true;
  }

  function update(dt, elapsed, playerPos, playerMesh) {
    if (!active || !built) return;

    // Check & update birthday decor visibility dynamically
    const isBirthdayWeek = isHelensBirthdayWeek();
    if (birthdayDecorGroup) {
      birthdayDecorGroup.visible = isBirthdayWeek;
    }
    if (betteravePartyHat) {
      betteravePartyHat.visible = isBirthdayWeek;
    }
    if (birbPartyHat) {
      birbPartyHat.visible = isBirthdayWeek;
    }

    // Chandelier rotation
    if (chandelierGroup) {
      chandelierGroup.rotation.y = elapsed * 0.045;
      if (chandelierLight) {
        chandelierLight.intensity = 1.35 + Math.sin(elapsed * 2.8) * 0.08;
      }
    }

    // Warm table candle flicker
    tableCandleLights.forEach((lamp, idx) => {
      const f = Math.sin(elapsed * 14.0 + idx * 3.1) * 0.05 + Math.cos(elapsed * 27.0 + idx * 1.7) * 0.03;
      lamp.intensity = 1.15 + f * 0.6;
    });

    // Fairy lights pulse on birthday banner
    if (isBirthdayWeek && fairyLightMeshes.length > 0) {
      fairyLightMeshes.forEach((fl) => {
        const pulse = 0.5 + 0.5 * Math.sin(elapsed * 5.0 + fl.phase);
        fl.mesh.scale.setScalar(0.85 + pulse * 0.3);
      });
    }

    // Ambient floating metallic confetti drift
    if (isBirthdayWeek && ambientConfetti.length > 0) {
      ambientConfetti.forEach((c) => {
        c.mesh.position.y -= c.speedY * dt;
        c.mesh.rotation.x += c.rotSpeedX * dt;
        c.mesh.rotation.y += c.rotSpeedY * dt;
        c.mesh.position.x += Math.sin(elapsed * 1.8 + c.swayPhase) * 0.008;

        if (c.mesh.position.y < 0.2) {
          c.mesh.position.y = 6.2 + Math.random() * 0.8;
          const rad = Math.random() * 11.5;
          const angle = Math.random() * Math.PI * 2;
          c.mesh.position.x = Math.cos(angle) * rad;
          c.mesh.position.z = Math.sin(angle) * rad;
        }
      });
    }

    // Helen's Birthday Cake Candle Flame & Glow
    if (candleFlameMesh && candleLight) {
      const flicker = Math.sin(elapsed * 18.0) * 0.08 + Math.cos(elapsed * 31.0) * 0.05;
      candleFlameMesh.scale.set(0.7 * (1.0 + flicker), 1.6 * (1.0 + flicker * 1.4), 0.7 * (1.0 + flicker));
      candleFlameMesh.position.y = 3.65 + flicker * 0.02;
      candleLight.intensity = 1.8 + flicker * 1.5;
    }

    // Celebration balloons bobbing gently
    balloonMeshes.forEach((bg) => {
      const s = bg.userData.seed || 0;
      const bob = Math.sin(elapsed * 1.8 + s) * 0.08;
      const sway = Math.cos(elapsed * 1.2 + s) * 0.05;
      bg.position.y = bg.userData.basePos.y + bob;
      bg.position.x = bg.userData.basePos.x + sway;
    });

    // Sous-Chef Birb
    if (sousChefBirbMesh) {
      sousChefBirbMesh.rotation.y = Math.PI * 0.15 + Math.sin(elapsed * 2.5) * 0.18;
      sousChefBirbMesh.position.y = 1.28 + Math.abs(Math.sin(elapsed * 4.0)) * 0.035;
    }

    // Kitchen simmering cauldron steam
    kitchenSteamParticles.forEach((sp, idx) => {
      const t = (elapsed * 1.3 + idx * 0.75) % 1.5;
      sp.mesh.position.set(
        sp.basePos.x + Math.sin(elapsed * 2.2 + idx) * 0.08,
        sp.basePos.y + t * 0.85,
        sp.basePos.z + Math.cos(elapsed * 2.2 + idx) * 0.08
      );
      sp.mesh.scale.setScalar(0.7 + t * 0.8);
      sp.mesh.material.opacity = Math.max(0, 0.35 * (1.0 - t / 1.5));
    });

    // Sparkles update
    for (let i = activeSparkles.length - 1; i >= 0; i--) {
      const sp = activeSparkles[i];
      sp.life += dt;
      sp.mesh.position.x += sp.vx * dt;
      sp.mesh.position.y += sp.vy * dt;
      sp.mesh.position.z += sp.vz * dt;
      sp.vy -= 4.2 * dt;
      sp.mesh.rotation.x += sp.rotSpeed * dt;
      sp.mesh.rotation.y += sp.rotSpeed * dt;

      const alpha = Math.max(0, 1.0 - sp.life / sp.maxLife);
      sp.mesh.material.opacity = alpha;
      sp.mesh.scale.setScalar(Math.max(0.01, 1.0 - (sp.life / sp.maxLife) * 0.6));

      if (sp.life >= sp.maxLife) {
        scene.remove(sp.mesh);
        activeSparkles.splice(i, 1);
      }
    }

    // Waiter Monsieur Betterave & Serving Trolley State Machine
    if (waiterParentGroup) {
      if (waiterState.mode === 'idle') {
        waiterParentGroup.position.set(MAITRE_D_POS.x, 0, MAITRE_D_POS.z);
        waiterParentGroup.rotation.y = 0;
        if (betteraveMesh) {
          betteraveMesh.position.y = Math.sin(elapsed * 2.2) * 0.02;
          betteraveMesh.rotation.z = Math.sin(elapsed * 1.5) * 0.015;
        }
        if (trolleyClocheGroup) {
          trolleyClocheGroup.position.y = 0.85;
        }

      } else if (waiterState.mode === 'delivering') {
        waiterState.walkProgress += dt / waiterState.walkDuration;
        const p = Math.min(1.0, waiterState.walkProgress);
        const ease = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;

        const curX = waiterState.startPos.x + (waiterState.targetPos.x - waiterState.startPos.x) * ease;
        const curZ = waiterState.startPos.z + (waiterState.targetPos.z - waiterState.startPos.z) * ease;
        waiterParentGroup.position.set(curX, 0, curZ);

        const moveAngle = Math.atan2(waiterState.targetPos.x - waiterState.startPos.x, waiterState.targetPos.z - waiterState.startPos.z);
        waiterParentGroup.rotation.y = moveAngle;

        if (betteraveMesh) {
          betteraveMesh.rotation.z = Math.sin(elapsed * 9.0) * 0.08;
          betteraveMesh.position.y = Math.abs(Math.sin(elapsed * 9.0)) * 0.04;
        }
        trolleyWheels.forEach((w) => {
          w.rotation.x += dt * 7.5;
        });

        if (p >= 1.0) {
          waiterState.mode = 'serving';
          waiterState.timer = 0;
          waiterParentGroup.rotation.y = waiterState.facingAngle;
          if (betteraveMesh) {
            betteraveMesh.rotation.z = 0;
            betteraveMesh.position.y = 0;
          }
        }

      } else if (waiterState.mode === 'serving') {
        waiterState.timer += dt;

        if (waiterState.timer < 0.6) {
          const liftFrac = waiterState.timer / 0.6;
          if (trolleyClocheGroup) {
            trolleyClocheGroup.position.y = 0.85 + liftFrac * 0.55;
          }
        } else if (waiterState.timer < 1.8) {
          if (trolleyClocheGroup) trolleyClocheGroup.position.y = 1.40;

          if (!waiterState.dishPlaced) {
            waiterState.dishPlaced = true;
            const b = banquetteBooths[waiterState.boothIndex];
            if (b) {
              b.setServedDish(waiterState.dishKey);
            }
            if (window.CozyAudio && typeof window.CozyAudio.bistroClocheDing === 'function') {
              window.CozyAudio.bistroClocheDing();
            }
            if (typeof window.showToast === 'function') {
              window.showToast("ET VOILÀ! 🧆✨", "Monsieur Betterave served your spherical delicacy to the booth!");
            }
          }
        } else if (waiterState.timer < 2.4) {
          const lowerFrac = (waiterState.timer - 1.8) / 0.6;
          if (trolleyClocheGroup) {
            trolleyClocheGroup.position.y = 1.40 - lowerFrac * 0.55;
          }
        } else {
          waiterState.mode = 'returning';
          waiterState.startPos = {
            x: waiterParentGroup.position.x,
            y: 0,
            z: waiterParentGroup.position.z
          };
          waiterState.targetPos = { x: MAITRE_D_POS.x, y: 0, z: MAITRE_D_POS.z };
          waiterState.walkProgress = 0;
          waiterState.walkDuration = 3.2;
          waiterState.dishPlaced = false;
        }

      } else if (waiterState.mode === 'returning') {
        waiterState.walkProgress += dt / waiterState.walkDuration;
        const p = Math.min(1.0, waiterState.walkProgress);
        const ease = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;

        const curX = waiterState.startPos.x + (waiterState.targetPos.x - waiterState.startPos.x) * ease;
        const curZ = waiterState.startPos.z + (waiterState.targetPos.z - waiterState.startPos.z) * ease;
        waiterParentGroup.position.set(curX, 0, curZ);

        const moveAngle = Math.atan2(waiterState.targetPos.x - waiterState.startPos.x, waiterState.targetPos.z - waiterState.startPos.z);
        waiterParentGroup.rotation.y = moveAngle;

        if (betteraveMesh) {
          betteraveMesh.rotation.z = Math.sin(elapsed * 8.5) * 0.07;
          betteraveMesh.position.y = Math.abs(Math.sin(elapsed * 8.5)) * 0.035;
        }
        trolleyWheels.forEach((w) => {
          w.rotation.x += dt * 6.5;
        });

        if (p >= 1.0) {
          waiterState.mode = 'idle';
          waiterParentGroup.position.set(MAITRE_D_POS.x, 0, MAITRE_D_POS.z);
          waiterParentGroup.rotation.y = 0;
          if (betteraveMesh) {
            betteraveMesh.rotation.z = 0;
            betteraveMesh.position.y = 0;
          }
        }
      }
    }
  }

  function getBoothSeat(boothIndex) {
    if (boothIndex >= 0 && boothIndex < banquetteBooths.length) {
      return banquetteBooths[boothIndex].getSeatPos();
    }
    if (banquetteBooths.length > 0) return banquetteBooths[0].getSeatPos();
    return { x: -6.5, y: 0.42, z: -5.5, rotY: Math.PI * 0.78 };
  }

  function getServedDish(boothIndex) {
    if (boothIndex >= 0 && boothIndex < banquetteBooths.length) {
      return banquetteBooths[boothIndex].getServedDish();
    }
    return null;
  }

  function getFloorHeight(x, z, playerY) {
    if (!built) return 0.0;
    const dCenter = Math.hypot(x, z);

    if (dCenter > 13.8) {
      if (Math.abs(x) < 1.8 && z >= 12.0) {
        return 0.0;
      }
    }

    const dDais = Math.hypot(x - HELEN_ALCOVE_POS.x, z - HELEN_ALCOVE_POS.z);
    if (dDais <= 3.6) {
      if (dDais <= 1.4) return 0.24 + 1.15;
      return 0.24;
    }

    if (z <= -10.2 && Math.abs(x) <= 4.2) {
      return 1.18;
    }

    return 0.0;
  }

  function getInteractables(playerPos) {
    if (!active || !built) return [];
    const out = [];

    const dExit = Math.hypot(playerPos.x - EXIT_POS.x, playerPos.z - EXIT_POS.z);
    if (dExit < 3.2) {
      out.push({
        kind: 'spherical_exit',
        dist: dExit,
        prompt: 'Exit to Southwest Bluff [E] 🚪'
      });
    }

    const dCake = Math.hypot(playerPos.x - HELEN_ALCOVE_POS.x, playerPos.z - HELEN_ALCOVE_POS.z);
    if (dCake < 3.6) {
      const isWeek = isHelensBirthdayWeek();
      out.push({
        kind: 'helen_birthday_cake',
        dist: dCake,
        prompt: isWeek
          ? "Inspect Helen's Celestial Birthday Bombe [E] ✨🎂"
          : "Helen's Celestial Birthday Cake (Oct 24 Only) [E] 🎂"
      });
    }

    const dMaitreD = Math.hypot(playerPos.x - MAITRE_D_POS.x, playerPos.z - MAITRE_D_POS.z);
    if (dMaitreD < 3.5) {
      out.push({
        kind: 'monsieur_betterave',
        dist: dMaitreD,
        prompt: 'Talk to Monsieur Betterave · Spherical Menu [E] 🧆'
      });
    }

    // Booth Seating, Served Dishes & Birthday Party Crackers
    const isBirthdayWeek = isHelensBirthdayWeek();
    for (let i = 0; i < banquetteBooths.length; i++) {
      const bObj = banquetteBooths[i];
      const cfg = bObj.config;
      const bx = Math.cos(cfg.angle) * cfg.radius;
      const bz = Math.sin(cfg.angle) * cfg.radius;
      const dBooth = Math.hypot(playerPos.x - bx, playerPos.z - bz);

      if (dBooth < 3.2) {
        const dish = bObj.getServedDish();
        if (dish && !dish.eaten) {
          out.push({
            kind: 'eat_served_dish',
            dist: dBooth,
            boothIndex: i,
            dishKey: dish.dishKey,
            prompt: `Feast on ${dish.title} [E] 🍴✨`
          });
        }
        if (isBirthdayWeek) {
          out.push({
            kind: 'pop_birthday_cracker',
            dist: dBooth + 0.1,
            boothIndex: i,
            prompt: `🎉 Pop Helen's Birthday Cracker! [P]`
          });
        }
        out.push({
          kind: 'booth_seat',
          dist: dBooth,
          prompt: `Sit in Plush Banquette (${cfg.name}) [E] 🛋️`,
          boothIndex: i,
          boothName: cfg.name
        });
        break;
      }
    }

    const mountRadius = 14.5 - 0.12;
    for (let p = 0; p < PAINTING_CONFIGS.length; p++) {
      const pcfg = PAINTING_CONFIGS[p];
      const px = Math.cos(pcfg.angle) * mountRadius;
      const pz = Math.sin(pcfg.angle) * mountRadius;
      const dPainting = Math.hypot(playerPos.x - px, playerPos.z - pz);
      if (dPainting < 3.2) {
        out.push({
          kind: 'spherical_painting',
          dist: dPainting,
          prompt: `Admire Painting: "${pcfg.title}" [E] 🖼️`,
          paintingIndex: p,
          paintingConfig: pcfg
        });
        break;
      }
    }

    return out;
  }

  return {
    build,
    setActive: (v) => { active = v; },
    isActive: () => active,
    getScene: () => scene,
    getStart: () => START_POS,
    getFloorHeight,
    getCeilingY: () => 7.5,
    getInteractables,
    getBoothSeat,
    getServedDish,
    orderDishToBooth,
    eatServedDish,
    popBirthdayCracker,
    getPaintingConfig: (idx) => PAINTING_CONFIGS[idx] || null,
    update,
    isHelensBirthdayWeek,
    getHelensCakeMesh: () => cakeGroup,
    getWaiterState: () => waiterState,
    getBirthdayDecorGroup: () => birthdayDecorGroup
  };
})();
