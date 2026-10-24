// =============================================================================
// SPHERICAL FOODS BISTRO & ROTUNDA (DEDICATED INTERIOR INSTANCE) - PASS 25 OVERHAUL
// "Everything is better in a sphere — No flat food allowed!"
// Propriétaire: Monsieur Betterave · Est. October 24
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
  let betteraveMesh = null;
  let sousChefBirbMesh = null;
  const tableCandleLights = [];
  const kitchenSteamParticles = [];
  const balloonMeshes = [];

  // Interaction coordinates inside the bistro rotunda
  // Rotunda center is (0, 0, 0), Radius = 14.5m
  // Entrance / Exit doors are at the South: (0, 0, 13.5), facing North (-Z)
  const START_POS = { x: 0, y: 0.1, z: 12.0, rotY: Math.PI }; // Enter facing into the dining room
  const EXIT_POS = { x: 0, y: 0, z: 13.5 };
  const MAITRE_D_POS = { x: 0, y: 0, z: 2.2 }; // Monsieur Betterave near the central reception
  const HELEN_ALCOVE_POS = { x: 6.2, y: 0, z: -2.8 }; // Helen's Birthday VIP Alcove (East)

  // 4 Grand Plush Banquette Booths located along the perimeter
  // Quadrant III = Northwest (x < 0, z < 0)
  // Quadrant II = Southwest (x < 0, z > 0)
  // Quadrant I = Southeast (x > 0, z > 0)
  const BOOTH_CONFIGS = [
    { id: 0, name: "Le Coin Nord-Ouest", angle: Math.PI * 1.30, radius: 9.8 }, // Northwest
    { id: 1, name: "La Baie de L'Ouest", angle: Math.PI * 1.05, radius: 10.0 }, // West
    { id: 2, name: "L'Alcove Sud-Ouest", angle: Math.PI * 0.75, radius: 9.8 }, // Southwest
    { id: 3, name: "Le Salon Sud-Est", angle: Math.PI * 0.25, radius: 9.8 }   // Southeast
  ];

  // 6 Menu-Inspired Wall Art Paintings with Lore
  const PAINTING_CONFIGS = [
    {
      id: 0,
      title: "L'Homard Sphérique",
      subtitle: "Maine Lobster Bisque Spheres & Gold Leaf",
      angle: Math.PI * 1.40, // North-Northwest wall
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
      angle: Math.PI * 1.70, // North-Northeast wall
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
      angle: Math.PI * 1.95, // East wall
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
      angle: Math.PI * 0.90, // West-Southwest wall
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
      angle: Math.PI * 0.62, // South-Southwest wall
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
      angle: Math.PI * 0.38, // South-Southeast wall
      accentColor: "#10b981",
      dishColor: "#059669",
      description: "“Ceremonial grade Uji matcha ganache nestled beside a polished sphere of wild alpine strawberry mochi, dusted with pulverized sweet pistachio dust.”",
      tastingNotes: "Grassy bittersweet matcha, juicy wild berry punch, chewy rice cloud.",
      orderKey: "mochi_spheres"
    }
  ];

  // Helper: Procedural Oil Painting Texture Generator for Wall Art
  function createPaintingTexture(config) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 384;
    const ctx = canvas.getContext('2d');

    // 1. Warm Antique Canvas Background with Vignette
    const bgGrad = ctx.createRadialGradient(256, 192, 40, 256, 192, 280);
    bgGrad.addColorStop(0, '#2d1b14');
    bgGrad.addColorStop(0.7, '#180f0b');
    bgGrad.addColorStop(1, '#0c0705');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 512, 384);

    // 2. Ornate Gilded Inner Oval Border
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

    // 3. Luxurious Mahogany Pedestal Table / Cloche Base
    const tableGrad = ctx.createLinearGradient(120, 260, 392, 310);
    tableGrad.addColorStop(0, '#451a03');
    tableGrad.addColorStop(0.5, '#78350f');
    tableGrad.addColorStop(1, '#2e1002');
    ctx.fillStyle = tableGrad;
    ctx.beginPath();
    ctx.ellipse(256, 265, 140, 32, 0, 0, Math.PI * 2);
    ctx.fill();

    // Silver/Porcelain Cloche Saucer
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.ellipse(256, 255, 115, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 3;
    ctx.stroke();

    // 4. The Grand Spherical Food Centerpiece
    const dishGrad = ctx.createRadialGradient(235, 170, 15, 256, 190, 85);
    dishGrad.addColorStop(0, '#ffffff');
    dishGrad.addColorStop(0.2, config.accentColor);
    dishGrad.addColorStop(0.85, config.dishColor);
    dishGrad.addColorStop(1, '#1e050b');

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 14;
    ctx.fillStyle = dishGrad;
    ctx.beginPath();
    ctx.arc(256, 185, 68, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Glaze Specular Highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.beginPath();
    ctx.ellipse(230, 155, 22, 12, -Math.PI / 6, 0, Math.PI * 2);
    ctx.fill();

    // Gold Leaf / Garnish Flecks
    ctx.fillStyle = '#fbbf24';
    for (let f = 0; f < 8; f++) {
      const fx = 235 + (Math.sin(f * 2.3) * 35);
      const fy = 175 + (Math.cos(f * 1.7) * 30);
      ctx.beginPath();
      ctx.arc(fx, fy, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Aromatic Culinary Steam Wisps
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    for (let s = -1; s <= 1; s++) {
      ctx.beginPath();
      const sx = 256 + s * 28;
      ctx.moveTo(sx, 120);
      ctx.bezierCurveTo(sx - 15, 95, sx + 20, 75, sx, 50);
      ctx.stroke();
    }
    ctx.restore();

    // 5. Brass Plaque at Bottom of Frame
    ctx.fillStyle = '#b45309';
    ctx.fillRect(80, 328, 352, 42);
    ctx.fillStyle = '#d8aa5b';
    ctx.fillRect(84, 332, 344, 34);

    ctx.fillStyle = '#261205';
    ctx.font = 'bold 15px Georgia, "Times New Roman", serif';
    ctx.textAlign = 'center';
    ctx.fillText(config.title.toUpperCase(), 256, 352);

    ctx.font = 'italic 11px sans-serif';
    ctx.fillStyle = '#5c2b09';
    ctx.fillText(config.subtitle, 256, 363);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    return texture;
  }

  // Date Check: Is it Helen's Birthday Week?
  function isHelensBirthdayWeek() {
    const now = new Date();
    const month = now.getMonth();
    const day = now.getDate();
    return (month === 9 && day >= 21 && day <= 28);
  }

  // Construct Helen's Celestial Birthday Bombe (Spherical Birthday Cake)
  function createHelensBirthdayCake() {
    const group = new THREE.Group();

    // 1. Ornate Polished Brass Pedestal Stand
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xd8aa5b,
      roughness: 0.22,
      metalness: 0.88
    });
    const standBase = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.25, 0.18, 28), brassMat);
    standBase.position.y = 0.09;
    group.add(standBase);

    const standStem = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.32, 0.65, 18), brassMat);
    standStem.position.y = 0.50;
    group.add(standStem);

    const standPlatter = new THREE.Mesh(new THREE.CylinderGeometry(1.65, 1.45, 0.12, 32), brassMat);
    standPlatter.position.y = 0.88;
    group.add(standPlatter);

    // 2. Fine Porcelain Presentation Saucer
    const porcelainMat = new THREE.MeshStandardMaterial({
      color: 0xfdfbf7,
      roughness: 0.14,
      metalness: 0.05
    });
    const saucer = new THREE.Mesh(new THREE.CylinderGeometry(1.48, 1.32, 0.06, 32), porcelainMat);
    saucer.position.y = 0.94;
    group.add(saucer);

    // 3. The Grand Spherical Cake: Ruby-Magenta Mirror Glaze
    const cakeGlazeMat = new THREE.MeshStandardMaterial({
      color: 0x9f1239,
      roughness: 0.12,
      metalness: 0.15
    });
    const cakeSphere = new THREE.Mesh(new THREE.SphereGeometry(0.78, 36, 30), cakeGlazeMat);
    cakeSphere.position.y = 1.72;
    cakeSphere.castShadow = true;
    group.add(cakeSphere);

    // 4. Edible Gold Foil Stars & Sugar Pearls Garnish
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.2, metalness: 0.9 });
    const pearlMat = new THREE.MeshStandardMaterial({ color: 0xbe123c, roughness: 0.25, metalness: 0.1 });

    const numPearls = 18;
    for (let i = 0; i < numPearls; i++) {
      const a = (i / numPearls) * Math.PI * 2;
      const pearl = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 10), pearlMat);
      pearl.position.set(Math.cos(a) * 0.88, 1.02, Math.sin(a) * 0.88);
      group.add(pearl);
    }

    for (let s = 0; s < 12; s++) {
      const theta = (s / 12) * Math.PI * 2 + (s % 2) * 0.25;
      const phi = 0.45 + (s % 3) * 0.35;
      const sx = Math.sin(phi) * Math.cos(theta) * 0.79;
      const sy = 1.72 + Math.cos(phi) * 0.79;
      const sz = Math.sin(phi) * Math.sin(theta) * 0.79;
      const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.045, 0), goldMat);
      star.position.set(sx, sy, sz);
      star.rotation.set(Math.random(), Math.random(), Math.random());
      group.add(star);
    }

    // 5. Curved Golden Birthday Candle sprouting from North Pole
    const candleStem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 0.45, 12), goldMat);
    candleStem.position.set(0, 2.70, 0);
    candleStem.rotation.z = 0.08;
    group.add(candleStem);

    const wick = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.08, 6), new THREE.MeshBasicMaterial({ color: 0x1c1917 }));
    wick.position.set(0.02, 2.96, 0);
    group.add(wick);

    candleFlameMesh = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.16, 10), new THREE.MeshBasicMaterial({ color: 0xffedd5 }));
    candleFlameMesh.position.set(0.02, 3.08, 0);
    group.add(candleFlameMesh);

    candleLight = new THREE.PointLight(0xffa238, 1.8, 6.5, 1.5);
    candleLight.position.set(0, 0.02, 3.12);
    group.add(candleLight);

    // 6. Inscription Plaque on Stand Base
    const banner = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.14, 0.05), new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.4 }));
    banner.position.set(0, 0.22, 1.08);
    banner.rotation.x = -0.25;
    group.add(banner);

    return group;
  }

  // Construct Monsieur Betterave (Beetroot Maitre D')
  function createMonsieurBetterave() {
    const group = new THREE.Group();

    // 1. Plump Sculpted Beetroot Body
    const beetMat = new THREE.MeshStandardMaterial({ color: 0x881337, roughness: 0.65 });
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.68, 20, 18), beetMat);
    body.scale.set(1.0, 1.25, 0.95);
    body.position.y = 1.05;
    body.castShadow = true;
    group.add(body);

    const tapRoot = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.45, 10), beetMat);
    tapRoot.rotation.x = Math.PI;
    tapRoot.position.y = 0.32;
    group.add(tapRoot);

    // 2. Leafy Crown of Fresh Beet Greens
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

    // 3. Expressive Dapper Face & French Moustache
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

    // 4. Maitre D' Attire & Domed Cloche
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

    const trayMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.2, metalness: 0.85 });
    const tray = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.03, 20), trayMat);
    tray.position.set(0.42, 0.98, 0.52);
    group.add(tray);

    const cloche = new THREE.Mesh(new THREE.SphereGeometry(0.24, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.5), trayMat);
    cloche.position.set(0.42, 1.0, 0.52);
    group.add(cloche);

    const clocheHandle = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), bowMat);
    clocheHandle.position.set(0.42, 1.25, 0.52);
    group.add(clocheHandle);

    return group;
  }

  // Construct a High-End Luxury Channel-Tufted Velvet Banquette Booth
  function createPlushBanquetteBooth(boothIndex, cfg) {
    const bg = new THREE.Group();
    const bx = Math.cos(cfg.angle) * cfg.radius;
    const bz = Math.sin(cfg.angle) * cfg.radius;
    bg.position.set(bx, 0, bz);

    // Booth faces inward toward center of rotunda (0, 0, 0)
    const inwardAngle = Math.atan2(-bx, -bz);
    bg.rotation.y = inwardAngle;

    // Materials
    const velvetMat = new THREE.MeshStandardMaterial({
      color: 0x78132b, // Deep rich burgundy velvet
      roughness: 0.65,
      metalness: 0.08
    });
    const woodMat = new THREE.MeshStandardMaterial({
      color: 0x2e1207, // Polished dark mahogany plinth
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
    const arcSpan = Math.PI * 0.82; // 148 degree embracing curve

    for (let i = 0; i < numSegments; i++) {
      const t = (i / (numSegments - 1)) - 0.5;
      const segAngle = t * arcSpan;
      const px = Math.sin(segAngle) * arcRadius;
      const pz = -Math.cos(segAngle) * arcRadius;

      // Base plinth riser block
      const plinthBlock = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.24, 0.65), woodMat);
      plinthBlock.position.set(px, 0.12, pz);
      plinthBlock.rotation.y = -segAngle;
      bg.add(plinthBlock);

      // Deep Channel-Tufted Velvet Backrest Flute
      const flute = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.19, 1.25, 14), velvetMat);
      flute.position.set(px, 0.82, pz);
      flute.rotation.y = -segAngle;
      flute.scale.set(1.0, 1.0, 1.35); // Fluted pillow bulge
      bg.add(flute);

      // Golden brass tufting button on flute
      const btn = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 8), brassMat);
      btn.position.set(px * 0.92, 0.82, pz * 0.92);
      bg.add(btn);

      // Plush seat cushion pad block
      const seatBlock = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.26, 0.62), velvetMat);
      seatBlock.position.set(px * 0.78, 0.36, pz * 0.78);
      seatBlock.rotation.y = -segAngle;
      bg.add(seatBlock);
    }

    // Top Polished Brass Handrail / Piping running along the banquette crest
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

    // 2. Plush Throw Pillows (Tucked into left and right corners)
    const pillowColors = [0xd97706, 0x9d174d]; // Saffron gold and rose velvet
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
    tableGroup.position.set(0, 0, -0.45); // Centered within the banquette embrace

    // Fluted Brass Trumpet Pedestal
    const basePlate = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.54, 0.06, 24), brassMat);
    basePlate.position.y = 0.03;
    tableGroup.add(basePlate);

    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.22, 0.72, 18), brassMat);
    stem.position.y = 0.40;
    tableGroup.add(stem);

    // Polished Carrara Marble Top with Brass Beveled Rim
    const marbleTop = new THREE.Mesh(new THREE.CylinderGeometry(1.22, 1.22, 0.06, 32), marbleMat);
    marbleTop.position.y = 0.78;
    tableGroup.add(marbleTop);

    const brassRim = new THREE.Mesh(new THREE.TorusGeometry(1.22, 0.024, 8, 36), brassMat);
    brassRim.rotation.x = Math.PI / 2;
    brassRim.position.y = 0.78;
    tableGroup.add(brassRim);

    // Tableware: Bone China Saucers, Teacups, and Spherical Delicacies
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

    // Centerpiece: Warm Amber Candle Lamp with Ribbed Shade
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

    const candleLight = new THREE.PointLight(0xffb86c, 0.85, 4.8, 1.4);
    candleLight.position.set(0, 1.05, 0.05);
    tableCandleLights.push(candleLight);
    tableGroup.add(candleLight);

    bg.add(tableGroup);

    return {
      group: bg,
      config: cfg,
      // Seated Position coordinate for player inside this booth
      // Nestled inside the curve facing toward the table and rotunda center
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

  // Construct Wall Art Paintings with Gilded Brass Frames & Museum Picture Sconces
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

      const picSpot = new THREE.PointLight(0xffe6c2, 1.1, 4.2, 1.5);
      picSpot.position.set(0, 0.82, 0.32);
      pGroup.add(picSpot);

      pGroup.userData = { paintingIndex: config.id, config };
      galleryGroup.add(pGroup);
    });

    return galleryGroup;
  }

  // Construct Clean Open Show Kitchen on North Wall Arc (Zero Rogue End-Cap Wedges)
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

    cauldronPositions.forEach((pos, idx) => {
      const burner = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.40, 0.04, 18), ironMat);
      burner.position.set(pos.x, 1.26, pos.z);
      kitchenGroup.add(burner);

      const burnerGlow = new THREE.PointLight(0xff6600, 0.9, 1.8, 1.5);
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

      kitchenGroup.add(sousChefBirbMesh);
    }

    return kitchenGroup;
  }

  const banquetteBooths = [];

  function build() {
    if (built) return Promise.resolve();

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x130e16);

    rotundaGroup = new THREE.Group();
    banquetteBooths.length = 0;
    tableCandleLights.length = 0;

    // 1. Concentric Terrazzo & Mahogany Floor
    const floorRadius = 14.5;
    const floor = new THREE.Mesh(
      new THREE.CylinderGeometry(floorRadius, floorRadius, 0.4, 48),
      new THREE.MeshStandardMaterial({ color: 0x2e1d15, roughness: 0.35, metalness: 0.08 })
    );
    floor.position.y = -0.2;
    floor.receiveShadow = true;
    rotundaGroup.add(floor);

    const innerFloor = new THREE.Mesh(
      new THREE.CylinderGeometry(11.8, 11.8, 0.02, 48),
      new THREE.MeshStandardMaterial({ color: 0xf3eee3, roughness: 0.24, metalness: 0.05 })
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
      new THREE.MeshStandardMaterial({ color: 0x4a3b32, roughness: 0.85, side: THREE.BackSide })
    );
    wall.position.y = wallHeight * 0.5;
    rotundaGroup.add(wall);

    const wainscot = new THREE.Mesh(
      new THREE.CylinderGeometry(floorRadius - 0.05, floorRadius - 0.05, 2.6, 48, 1, true),
      new THREE.MeshStandardMaterial({ color: 0x3d2215, roughness: 0.5, side: THREE.BackSide })
    );
    wainscot.position.y = 1.3;
    rotundaGroup.add(wainscot);

    // 3. Vaulted Indigo Dome Ceiling
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(floorRadius, 48, 24, 0, Math.PI * 2, 0, Math.PI * 0.5),
      new THREE.MeshStandardMaterial({ color: 0x1f192b, roughness: 0.7, side: THREE.BackSide })
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
          new THREE.MeshBasicMaterial({ color: 0xfff6e3 })
        );
        globe.position.set(Math.cos(ga) * tier.r, tier.y, Math.sin(ga) * tier.r);
        chandelierGroup.add(globe);
      }
    });

    chandelierLight = new THREE.PointLight(0xffecd1, 2.8, 28, 1.2);
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

    const balloonColors = [0xf43f5e, 0xfbbf24, 0xa855f7, 0x10b981, 0xec4899, 0x38bdf8];
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
        new THREE.MeshStandardMaterial({ color: col, roughness: 0.15, metalness: 0.08 })
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

    // 9. Monsieur Betterave
    betteraveMesh = createMonsieurBetterave();
    betteraveMesh.position.set(MAITRE_D_POS.x, 0, MAITRE_D_POS.z);
    betteraveMesh.rotation.y = 0.0;
    rotundaGroup.add(betteraveMesh);

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

    const exitLight = new THREE.PointLight(0x86efac, 1.2, 8.5);
    exitLight.position.set(0, 4.65, 0.4);
    doorGroup.add(exitLight);
    rotundaGroup.add(doorGroup);

    // 11. Warm Atmospheric Lighting
    const ambientLight = new THREE.AmbientLight(0xffecd1, 0.75);
    scene.add(ambientLight);

    for (let s = 0; s < 8; s++) {
      const sa = (s / 8) * Math.PI * 2;
      const sconceLight = new THREE.PointLight(0xffc278, 0.85, 11, 1.4);
      sconceLight.position.set(Math.cos(sa) * 13.2, 3.6, Math.sin(sa) * 13.2);
      scene.add(sconceLight);
    }

    scene.add(rotundaGroup);
    built = true;
    return Promise.resolve();
  }

  function update(dt, elapsed, playerPos, playerMesh) {
    if (!active || !built) return;

    if (chandelierGroup) {
      chandelierGroup.rotation.y = elapsed * 0.045;
      if (chandelierLight) {
        chandelierLight.intensity = 2.8 + Math.sin(elapsed * 2.8) * 0.14;
      }
    }

    tableCandleLights.forEach((lamp, idx) => {
      const f = Math.sin(elapsed * 14.0 + idx * 3.1) * 0.06 + Math.cos(elapsed * 27.0 + idx * 1.7) * 0.04;
      lamp.intensity = 0.85 + f * 0.8;
    });

    if (candleFlameMesh && candleLight) {
      const flicker = Math.sin(elapsed * 18.0) * 0.08 + Math.cos(elapsed * 31.0) * 0.05;
      candleFlameMesh.scale.set(1.0 + flicker, 1.0 + flicker * 1.5, 1.0 + flicker);
      candleFlameMesh.position.y = 3.08 + flicker * 0.02;
      candleLight.intensity = 1.8 + flicker * 2.2;
    }

    balloonMeshes.forEach((bg) => {
      const s = bg.userData.seed || 0;
      const bob = Math.sin(elapsed * 1.8 + s) * 0.08;
      const sway = Math.cos(elapsed * 1.2 + s) * 0.05;
      bg.position.y = bg.userData.basePos.y + bob;
      bg.position.x = bg.userData.basePos.x + sway;
    });

    if (betteraveMesh) {
      betteraveMesh.position.y = Math.sin(elapsed * 2.2) * 0.025;
      betteraveMesh.rotation.z = Math.sin(elapsed * 1.5) * 0.02;
    }

    if (sousChefBirbMesh) {
      sousChefBirbMesh.rotation.y = Math.PI * 0.15 + Math.sin(elapsed * 2.5) * 0.18;
      sousChefBirbMesh.position.y = 1.28 + Math.abs(Math.sin(elapsed * 4.0)) * 0.035;
    }

    kitchenSteamParticles.forEach((sp, idx) => {
      const t = (elapsed * 1.3 + idx * 0.75) % 1.5;
      sp.mesh.position.set(
        sp.basePos.x + Math.sin(elapsed * 2.2 + idx) * 0.08,
        sp.basePos.y + t * 0.85,
        sp.basePos.z + Math.cos(elapsed * 2.2 + idx) * 0.08
      );
      sp.mesh.scale.setScalar(0.7 + t * 0.8);
      sp.mesh.material.opacity = Math.max(0, 0.45 * (1.0 - t / 1.5));
    });
  }

  function getBoothSeat(boothIndex) {
    if (boothIndex >= 0 && boothIndex < banquetteBooths.length) {
      return banquetteBooths[boothIndex].getSeatPos();
    }
    if (banquetteBooths.length > 0) return banquetteBooths[0].getSeatPos();
    return { x: -6.5, y: 0.42, z: -5.5, rotY: Math.PI * 0.78 };
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

    for (let i = 0; i < BOOTH_CONFIGS.length; i++) {
      const cfg = BOOTH_CONFIGS[i];
      const bx = Math.cos(cfg.angle) * cfg.radius;
      const bz = Math.sin(cfg.angle) * cfg.radius;
      const dBooth = Math.hypot(playerPos.x - bx, playerPos.z - bz);
      if (dBooth < 2.9) {
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
    getPaintingConfig: (idx) => PAINTING_CONFIGS[idx] || null,
    update,
    isHelensBirthdayWeek,
    getHelensCakeMesh: () => cakeGroup
  };
})();
