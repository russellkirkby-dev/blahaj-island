// ============================================================================
// BLÅHAJ ISLAND - THE MIDNIGHT LIMINAL LAUNDROMAT (INSTANCE)
// An atmospheric late-night 24/7 coin-op laundromat suspended in the Between.
// Features: Checkered linoleum tiles, glowing fluorescent tubes, neon signage,
// plate-glass starry cosmic windows, rolling wire laundry carts, and
// THE GIANT MASTER WASHER #7 with an interactive high-speed spin cycle!
// ============================================================================

window.BlahajLaundromat = (function () {
  'use strict';

  let scn = null;
  let built = false;
  let active = false;

  const START = { x: -6.0, y: 0.0, z: 5.5, rotY: 0.0 };

  // Master Washer State & Spin Cycle Engine
  const masterWasher = {
    x: 0,
    y: 0,
    z: -6.2,
    drumMesh: null,
    doorMesh: null,
    doorOpenAngle: -Math.PI * 0.55,
    doorAngle: -Math.PI * 0.55,
    waterMesh: null,
    statusLed: null,
    cycleActive: false,
    cyclePhase: 'idle', // 'idle' | 'closing' | 'slosh' | 'spin' | 'opening'
    cycleTimer: 0.0,
    drumSpeed: 0.0,
    drumAngle: 0.0
  };

  let bubbleParticles = null;
  let steamParticles = null;
  let cosmicWindowBubbles = null;
  let neonSignLight = null;
  let neonSignMat = null;

  // Sound & Event hooks
  let onCompleteHandler = null;

  function createLinoleumTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // 8x8 checkerboard of vintage seafoam green and soft ivory cream
    const tileSize = 64;
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const isGreen = (x + y) % 2 === 0;
        ctx.fillStyle = isGreen ? '#4e8579' : '#e6decb';
        ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);

        // Subtle wax sheen & grout borders
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)';
        ctx.lineWidth = 2;
        ctx.strokeRect(x * tileSize, y * tileSize, tileSize, tileSize);

        // Marbleized flecks
        ctx.fillStyle = isGreen ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
        for (let f = 0; f < 6; f++) {
          ctx.beginPath();
          ctx.arc(
            x * tileSize + Math.random() * tileSize,
            y * tileSize + Math.random() * tileSize,
            Math.random() * 6 + 2,
            0,
            Math.PI * 2
          );
          ctx.fill();
        }
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(6, 4.5);
    return tex;
  }

  function createCeilingTileTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#dcd6cb';
    ctx.fillRect(0, 0, 256, 256);

    ctx.strokeStyle = '#8c8477';
    ctx.lineWidth = 4;
    ctx.strokeRect(0, 0, 256, 256);

    // Stippled acoustic perforations
    ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
    for (let i = 0; i < 180; i++) {
      ctx.beginPath();
      ctx.arc(Math.random() * 256, Math.random() * 256, Math.random() * 2 + 1, 0, Math.PI * 2);
      ctx.fill();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(8, 6);
    return tex;
  }

  async function build() {
    if (built) return scn;
    scn = new THREE.Scene();

    // 1. Cozy Liminal Ambient Lighting
    const amb = new THREE.AmbientLight(0x7da8bc, 0.65);
    scn.add(amb);

    // 2. Room Shell (24m wide x 18m deep x 5m high)
    const floorGeo = new THREE.PlaneGeometry(24, 18);
    const floorMat = new THREE.MeshStandardMaterial({
      map: createLinoleumTexture(),
      roughness: 0.28,
      metalness: 0.12
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scn.add(floor);

    // Ceiling with recessed fluorescent fixtures
    const ceilGeo = new THREE.PlaneGeometry(24, 18);
    const ceilMat = new THREE.MeshStandardMaterial({
      map: createCeilingTileTexture(),
      roughness: 0.85
    });
    const ceiling = new THREE.Mesh(ceilGeo, ceilMat);
    ceiling.position.y = 5.0;
    ceiling.rotation.x = Math.PI / 2;
    scn.add(ceiling);

    // Fluorescent Light Troffers (3 rows of 2 glowing troffers)
    const trofferGeo = new THREE.BoxGeometry(2.4, 0.12, 1.2);
    const trofferMat = new THREE.MeshBasicMaterial({ color: 0xfffaea });
    const lightPositions = [
      [-6, 4.92, -3], [0, 4.92, -3], [6, 4.92, -3],
      [-6, 4.92, 3],  [0, 4.92, 3],  [6, 4.92, 3]
    ];

    lightPositions.forEach(([lx, ly, lz]) => {
      const troffer = new THREE.Mesh(trofferGeo, trofferMat);
      troffer.position.set(lx, ly, lz);
      scn.add(troffer);

      const light = new THREE.PointLight(0xfffae0, 0.85, 14, 1.8);
      light.position.set(lx, ly - 0.3, lz);
      scn.add(light);
    });

    // 3. Walls
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xded5c4, roughness: 0.65 });
    const wainscotMat = new THREE.MeshStandardMaterial({ color: 0x3d6b63, roughness: 0.35 });

    // Back Wall (Z = -9)
    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(24, 5.0), wallMat);
    backWall.position.set(0, 2.5, -9);
    scn.add(backWall);

    const backWainscot = new THREE.Mesh(new THREE.BoxGeometry(24, 1.6, 0.15), wainscotMat);
    backWainscot.position.set(0, 0.8, -8.92);
    scn.add(backWainscot);

    // Side Walls (X = -12 and X = +12)
    const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(18, 5.0), wallMat);
    leftWall.position.set(-12, 2.5, 0);
    leftWall.rotation.y = Math.PI / 2;
    scn.add(leftWall);

    const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(18, 5.0), wallMat);
    rightWall.position.set(12, 2.5, 0);
    rightWall.rotation.y = -Math.PI / 2;
    scn.add(rightWall);

    // Front Wall with Giant Plate-Glass Cosmic Window (Z = 9)
    const frontWallLeft = new THREE.Mesh(new THREE.BoxGeometry(4, 5.0, 0.3), wallMat);
    frontWallLeft.position.set(-10, 2.5, 9);
    scn.add(frontWallLeft);

    const frontWallRight = new THREE.Mesh(new THREE.BoxGeometry(4, 5.0, 0.3), wallMat);
    frontWallRight.position.set(10, 2.5, 9);
    scn.add(frontWallRight);

    const windowGlass = new THREE.Mesh(
      new THREE.PlaneGeometry(16, 4.2),
      new THREE.MeshStandardMaterial({
        color: 0x4fa8d1,
        transparent: true,
        opacity: 0.35,
        roughness: 0.1,
        metalness: 0.8
      })
    );
    windowGlass.position.set(0, 2.5, 8.95);
    scn.add(windowGlass);

    // Deep Cosmic Starfield & Drifting Lavender Nebulae visible through the window
    const starGeo = new THREE.BufferGeometry();
    const starCount = 380;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      starPos[i * 3] = (Math.random() - 0.5) * 45;
      starPos[i * 3 + 1] = Math.random() * 20 - 2;
      starPos[i * 3 + 2] = 14 + Math.random() * 30; // Outside the front window!
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starSystem = new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({ color: 0xffffff, size: 0.28, transparent: true, opacity: 0.9 })
    );
    scn.add(starSystem);

    // 4. Glowing Neon Sign: "DELICATE CYCLE · OPEN 24/7"
    const neonGroup = new THREE.Group();
    neonGroup.position.set(0, 4.1, -8.82);

    neonSignMat = new THREE.MeshBasicMaterial({ color: 0xff3b94 });
    const signBacking = new THREE.Mesh(new THREE.BoxGeometry(10.5, 1.1, 0.1), new THREE.MeshStandardMaterial({ color: 0x111622, roughness: 0.8 }));
    neonGroup.add(signBacking);

    const neonBar1 = new THREE.Mesh(new THREE.BoxGeometry(9.8, 0.12, 0.08), neonSignMat);
    neonBar1.position.y = 0.42;
    neonGroup.add(neonBar1);

    const neonBar2 = new THREE.Mesh(new THREE.BoxGeometry(9.8, 0.12, 0.08), neonSignMat);
    neonBar2.position.y = -0.42;
    neonGroup.add(neonBar2);

    // Neon Washing Machine Icon in center
    const neonIcon = new THREE.Mesh(new THREE.RingGeometry(0.32, 0.40, 16), new THREE.MeshBasicMaterial({ color: 0x4df0ff, side: THREE.DoubleSide }));
    neonIcon.position.set(-4.2, 0, 0.08);
    neonGroup.add(neonIcon);

    neonSignLight = new THREE.PointLight(0xff3b94, 1.8, 16, 2.0);
    neonSignLight.position.set(0, 0, 0.5);
    neonGroup.add(neonSignLight);
    scn.add(neonGroup);

    // 5. Standard Commercial Front-Load Washers along the back wall
    const washerMat = new THREE.MeshStandardMaterial({ color: 0xf5f3ee, roughness: 0.32, metalness: 0.15 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xd8d8d8, roughness: 0.15, metalness: 0.88 });
    const drumInsideMat = new THREE.MeshStandardMaterial({ color: 0xa8b2bc, roughness: 0.25, metalness: 0.75, side: THREE.DoubleSide });

    const standardWasherX = [-9.2, -6.8, -4.4, 4.4, 6.8, 9.2];
    standardWasherX.forEach((wx) => {
      const wGroup = new THREE.Group();
      wGroup.position.set(wx, 1.15, -7.5);

      // Body cabinet
      const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.3, 1.9), washerMat);
      body.castShadow = true;
      wGroup.add(body);

      // Chrome round porthole door
      const doorRim = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.09, 12, 24), chromeMat);
      doorRim.position.set(0, -0.05, 0.98);
      wGroup.add(doorRim);

      const glass = new THREE.Mesh(
        new THREE.CircleGeometry(0.58, 20),
        new THREE.MeshStandardMaterial({ color: 0x8bd5f5, transparent: true, opacity: 0.45, roughness: 0.1 })
      );
      glass.position.set(0, -0.05, 0.98);
      wGroup.add(glass);

      // Control panel & coin slot
      const panel = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.42, 0.08), new THREE.MeshStandardMaterial({ color: 0x243242, roughness: 0.4 }));
      panel.position.set(0, 0.85, 0.97);
      wGroup.add(panel);

      const coinSlot = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.22, 0.04), chromeMat);
      coinSlot.position.set(0.65, 0.85, 1.02);
      wGroup.add(coinSlot);

      scn.add(wGroup);
    });

    // 6. THE GIANT MASTER WASHER & SPIN DRYER #7 (In Center X = 0, Z = -6.2)
    const mwGroup = new THREE.Group();
    mwGroup.position.set(masterWasher.x, 0, masterWasher.z);

    // Hollow Giant Enamel Cabinet (Allows complete interior visibility from all angles)
    const cabinetMat = new THREE.MeshStandardMaterial({ color: 0xecf6f4, roughness: 0.28 });

    // Left outer cabinet wall
    const mwLeft = new THREE.Mesh(new THREE.BoxGeometry(0.25, 4.2, 3.6), cabinetMat);
    mwLeft.position.set(-2.275, 2.1, 0);
    mwLeft.castShadow = true;
    mwGroup.add(mwLeft);

    // Right outer cabinet wall
    const mwRight = new THREE.Mesh(new THREE.BoxGeometry(0.25, 4.2, 3.6), cabinetMat);
    mwRight.position.set(2.275, 2.1, 0);
    mwRight.castShadow = true;
    mwGroup.add(mwRight);

    // Top roof panel
    const mwTop = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.25, 3.6), cabinetMat);
    mwTop.position.set(0, 4.075, 0);
    mwTop.castShadow = true;
    mwGroup.add(mwTop);

    // Bottom base panel
    const mwBottom = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.25, 3.6), cabinetMat);
    mwBottom.position.set(0, 0.125, 0);
    mwBottom.receiveShadow = true;
    mwGroup.add(mwBottom);

    // Back wall panel
    const mwBack = new THREE.Mesh(new THREE.BoxGeometry(4.8, 4.2, 0.25), cabinetMat);
    mwBack.position.set(0, 2.1, -1.675);
    mwBack.castShadow = true;
    mwGroup.add(mwBack);

    // Front fascia header (above door)
    const mwFrontHeader = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.75, 0.2), cabinetMat);
    mwFrontHeader.position.set(0, 3.65, 1.7);
    mwGroup.add(mwFrontHeader);

    // Front kickplate (below door)
    const mwFrontBottom = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.35, 0.2), cabinetMat);
    mwFrontBottom.position.set(0, 0.175, 1.7);
    mwGroup.add(mwFrontBottom);

    // Front left pillar (flanking door)
    const mwFrontLeft = new THREE.Mesh(new THREE.BoxGeometry(0.75, 2.9, 0.2), cabinetMat);
    mwFrontLeft.position.set(-2.025, 1.85, 1.7);
    mwGroup.add(mwFrontLeft);

    // Front right pillar (flanking door)
    const mwFrontRight = new THREE.Mesh(new THREE.BoxGeometry(0.75, 2.9, 0.2), cabinetMat);
    mwFrontRight.position.set(2.025, 1.85, 1.7);
    mwGroup.add(mwFrontRight);

    // Interior Drum Spotlight - bathes the tumbling drum and spinning shark in bright, vivid light
    const drumInteriorLight = new THREE.PointLight(0xbdf4ff, 2.4, 6.5, 1.2);
    drumInteriorLight.position.set(0, 2.8, 0);
    mwGroup.add(drumInteriorLight);

    // Front Fascia with Status LEDs & Controls
    const mwPanel = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.75, 0.12), new THREE.MeshStandardMaterial({ color: 0x1b2836, roughness: 0.4 }));
    mwPanel.position.set(0, 3.65, 1.82);
    mwGroup.add(mwPanel);

    // Dial & Coin Slot
    const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.12, 16), chromeMat);
    dial.rotation.x = Math.PI / 2;
    dial.position.set(-1.4, 3.65, 1.9);
    mwGroup.add(dial);

    // Giant Master Coin Slot
    const megaCoinSlot = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.42, 0.08), chromeMat);
    megaCoinSlot.position.set(1.5, 3.65, 1.9);
    mwGroup.add(megaCoinSlot);

    // Status LED light ("READY / WASH / MAX SPIN")
    masterWasher.statusLed = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0x52f29c }) // Green for Ready!
    );
    masterWasher.statusLed.position.set(0, 3.65, 1.9);
    mwGroup.add(masterWasher.statusLed);

    // Door Aperture Cutout Bevel
    const aperture = new THREE.Mesh(new THREE.TorusGeometry(1.68, 0.16, 16, 32), chromeMat);
    aperture.position.set(0, 1.85, 1.82);
    mwGroup.add(aperture);

    // ROTATING TUMBLING DRUM (Inside the giant washer!)
    const drumGroup = new THREE.Group();
    drumGroup.position.set(0, 1.85, 0);

    const drumGeo = new THREE.CylinderGeometry(1.55, 1.55, 2.8, 28, 1, true);
    const drumCyl = new THREE.Mesh(drumGeo, drumInsideMat);
    drumCyl.rotation.x = Math.PI / 2;
    drumGroup.add(drumCyl);

    const drumBack = new THREE.Mesh(new THREE.CircleGeometry(1.55, 28), drumInsideMat);
    drumBack.position.set(0, 0, -1.38);
    drumGroup.add(drumBack);

    // Perforated Drum Ribs / Tumbling Fins
    for (let r = 0; r < 3; r++) {
      const finAng = (r * Math.PI * 2) / 3;
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.28, 2.6), chromeMat);
      fin.position.set(Math.cos(finAng) * 1.38, Math.sin(finAng) * 1.38, 0);
      fin.rotation.z = finAng;
      drumGroup.add(fin);
    }

    mwGroup.add(drumGroup);
    masterWasher.drumMesh = drumGroup;

    // Soapy Wash Water inside the drum (rises during cycle)
    const waterGeo = new THREE.CylinderGeometry(1.48, 1.48, 0.6, 24);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x82e2ff,
      transparent: true,
      opacity: 0.0, // starts invisible until wash cycle!
      depthWrite: false,
      roughness: 0.15,
      metalness: 0.4
    });
    const washWater = new THREE.Mesh(waterGeo, waterMat);
    washWater.position.set(0, -0.9, 0);
    drumGroup.add(washWater);
    masterWasher.waterMesh = washWater;

    // PORTHOLE DOOR (Swings open and closed on a chrome hinge at X = -1.68)
    const doorHinge = new THREE.Group();
    doorHinge.position.set(-1.68, 1.85, 1.84);

    const doorFrame = new THREE.Mesh(new THREE.TorusGeometry(1.65, 0.14, 16, 32), chromeMat);
    doorFrame.position.set(1.68, 0, 0);
    doorHinge.add(doorFrame);

    const doorGlass = new THREE.Mesh(
      new THREE.CircleGeometry(1.58, 28),
      new THREE.MeshStandardMaterial({
        color: 0x9be0ff,
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
        roughness: 0.05,
        metalness: 0.70
      })
    );
    doorGlass.position.set(1.68, 0, 0);
    doorHinge.add(doorGlass);

    doorHinge.rotation.y = masterWasher.doorOpenAngle; // Open by default!
    mwGroup.add(doorHinge);
    masterWasher.doorMesh = doorHinge;

    scn.add(mwGroup);

    // 7. Swirling Laundry Suds & Bubble Particle System
    const bubbleGeo = new THREE.BufferGeometry();
    const bubbleCount = 140;
    const bubblePos = new Float32Array(bubbleCount * 3);
    const bubbleVels = [];
    for (let i = 0; i < bubbleCount; i++) {
      bubblePos[i * 3] = (Math.random() - 0.5) * 2.2;
      bubblePos[i * 3 + 1] = 1.0 + Math.random() * 1.8;
      bubblePos[i * 3 + 2] = masterWasher.z + (Math.random() - 0.5) * 1.8;
      bubbleVels.push({
        x: (Math.random() - 0.5) * 0.8,
        y: Math.random() * 0.8 + 0.2,
        z: (Math.random() - 0.5) * 0.8,
        life: Math.random()
      });
    }
    bubbleGeo.setAttribute('position', new THREE.BufferAttribute(bubblePos, 3));
    bubbleParticles = new THREE.Points(
      bubbleGeo,
      new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.45,
        transparent: true,
        depthWrite: false,
        opacity: 0.0, // active during wash cycle
        blending: THREE.AdditiveBlending
      })
    );
    scn.add(bubbleParticles);

    // 8. Tumble Dryers along Right Wall (X = 10.5)
    for (let d = 0; d < 3; d++) {
      const dy = 1.1 + d * 1.5;
      const dryer = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.4, 2.2), new THREE.MeshStandardMaterial({ color: 0xecd9c6, roughness: 0.4 }));
      dryer.position.set(10.8, dy, -2.5 + d * 2.8);
      scn.add(dryer);

      const dDoor = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.08, 12, 20), chromeMat);
      dDoor.position.set(9.88, dy, -2.5 + d * 2.8);
      dDoor.rotation.y = Math.PI / 2;
      scn.add(dDoor);

      // Warm amber lint-trap glow
      const dGlow = new THREE.PointLight(0xffaa44, 0.55, 4.0);
      dGlow.position.set(9.6, dy, -2.5 + d * 2.8);
      scn.add(dGlow);
    }

    // 9. Formica Folding Tables, Pastel Scoop Chairs & Laundry Carts
    const tableMat = new THREE.MeshStandardMaterial({ color: 0xfdf7ee, roughness: 0.35 });
    const tableLegMat = chromeMat;

    const tableGroup = new THREE.Group();
    tableGroup.position.set(-5.5, 0, 0);
    const tableTop = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.12, 2.0), tableMat);
    tableTop.position.y = 1.25;
    tableTop.castShadow = true;
    tableGroup.add(tableTop);

    // Chrome legs
    [-1.8, 1.8].forEach((tx) => {
      [-0.8, 0.8].forEach((tz) => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.25, 8), tableLegMat);
        leg.position.set(tx, 0.625, tz);
        tableGroup.add(leg);
      });
    });
    scn.add(tableGroup);

    // Retro Plastic Scoop Chairs (Row of 3 near table)
    const chairColors = [0x4ea8a0, 0xf7a24a, 0x548bb5];
    chairColors.forEach((col, i) => {
      const chairGroup = new THREE.Group();
      chairGroup.position.set(-7.5 + i * 1.6, 0, 2.4);

      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.1, 0.68), new THREE.MeshStandardMaterial({ color: col, roughness: 0.4 }));
      seat.position.y = 0.65;
      chairGroup.add(seat);

      const back = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.72, 0.08), new THREE.MeshStandardMaterial({ color: col, roughness: 0.4 }));
      back.position.set(0, 1.05, 0.32);
      chairGroup.add(back);

      scn.add(chairGroup);
    });

    // 10. Vintage Vending Machine ("SUDZ & SNACKS")
    const vmGroup = new THREE.Group();
    vmGroup.position.set(-10.8, 0, -3.2);

    const vmBody = new THREE.Mesh(new THREE.BoxGeometry(1.6, 3.2, 1.4), new THREE.MeshStandardMaterial({ color: 0x223548, roughness: 0.3 }));
    vmBody.position.y = 1.6;
    vmGroup.add(vmBody);

    const vmWindow = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.6), new THREE.MeshBasicMaterial({ color: 0x9be0ff, transparent: true, opacity: 0.6 }));
    vmWindow.position.set(0.81, 1.8, 0);
    vmWindow.rotation.y = Math.PI / 2;
    vmGroup.add(vmWindow);

    // Glowing Marquee
    const vmMarquee = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.45), new THREE.MeshBasicMaterial({ color: 0xffe066 }));
    vmMarquee.position.set(0.81, 2.85, 0);
    vmMarquee.rotation.y = Math.PI / 2;
    vmGroup.add(vmMarquee);
    scn.add(vmGroup);

    // 11. Rolling Chrome Wire Laundry Carts (with fluffy towels)
    const cartGroup = new THREE.Group();
    cartGroup.position.set(3.2, 0, 2.0);

    const cartBasket = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.0, 1.0), new THREE.MeshStandardMaterial({ color: 0xb0b8c0, wireframe: true }));
    cartBasket.position.y = 0.95;
    cartGroup.add(cartBasket);

    const cartTowels = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.6, 0.8), new THREE.MeshStandardMaterial({ color: 0x76b5c5, roughness: 0.8 }));
    cartTowels.position.y = 0.8;
    cartGroup.add(cartTowels);
    scn.add(cartGroup);

    // 12. Return Portal Archway back to Blåhaj Island
    const portalGroup = new THREE.Group();
    portalGroup.position.set(-8.0, 0, 6.2);

    const portalFrame = new THREE.Mesh(
      new THREE.TorusGeometry(1.5, 0.18, 16, 24, Math.PI),
      new THREE.MeshStandardMaterial({ color: 0x3d6b63, roughness: 0.4 })
    );
    portalFrame.position.y = 1.5;
    portalGroup.add(portalFrame);

    const portalVortex = new THREE.Mesh(
      new THREE.CircleGeometry(1.35, 24),
      new THREE.MeshBasicMaterial({ color: 0x52f29c, side: THREE.DoubleSide, transparent: true, opacity: 0.85 })
    );
    portalVortex.position.y = 1.5;
    portalGroup.add(portalVortex);

    const portalLight = new THREE.PointLight(0x52f29c, 1.4, 8.0);
    portalLight.position.set(0, 1.5, 0);
    portalGroup.add(portalLight);
    scn.add(portalGroup);

    built = true;
    return scn;
  }

  // Mega Spin Cycle Sequence Controller
  function startSpinCycle(player, onFinished) {
    if (masterWasher.cycleActive) return;
    masterWasher.cycleActive = true;
    masterWasher.cyclePhase = 'closing';
    masterWasher.cycleTimer = 0.0;
    onCompleteHandler = onFinished;

    // Ka-chunk coin drop!
    if (window.CozyAudio && typeof window.CozyAudio.coinDrop === 'function') {
      window.CozyAudio.coinDrop();
    }
  }

  function update(dt, elapsed, playerPos, playerMesh) {
    if (!active || !built) return;

    // Neon subtle electric hum flicker
    if (neonSignLight && neonSignMat) {
      const flicker = 1.8 + Math.sin(elapsed * 24.0) * 0.12 + (Math.random() < 0.015 ? -0.7 : 0);
      neonSignLight.intensity = Math.max(0.6, flicker);
    }

    // Interactive Mega Spin Cycle Animation Engine
    if (masterWasher.cycleActive) {
      masterWasher.cycleTimer += dt;
      const t = masterWasher.cycleTimer;

      // Phase 1: Door Closing (0.0s - 1.2s)
      if (t < 1.2) {
        masterWasher.cyclePhase = 'closing';
        const prog = t / 1.2;
        masterWasher.doorMesh.rotation.y = masterWasher.doorOpenAngle * (1.0 - prog);
        masterWasher.statusLed.material.color.setHex(0xf59e0b); // Orange / Wash
        if (playerMesh) {
          playerMesh.position.set(masterWasher.x, 0.45, masterWasher.z + 0.3);
          playerMesh.rotation.order = 'XYZ';
          playerMesh.rotation.set(0, 0, 0);
          if (playerPos) playerPos.copy(playerMesh.position);
        }
      }
      // Phase 2: Wash Slosh & Soap Foam (1.2s - 4.5s)
      else if (t < 4.5) {
        masterWasher.cyclePhase = 'slosh';
        masterWasher.doorMesh.rotation.y = 0; // Fully shut!
        const sloshT = t - 1.2;
        // Oscillate back and forth
        masterWasher.drumMesh.rotation.z = Math.sin(sloshT * 3.8) * 0.45;

        // Water rises
        if (masterWasher.waterMesh) {
          masterWasher.waterMesh.material.opacity = Math.min(0.55, sloshT * 0.3);
        }
        // Bubble particles active
        if (bubbleParticles) {
          bubbleParticles.material.opacity = Math.min(0.85, sloshT * 0.4);
        }

        // Tumble player inside
        if (playerMesh) {
          const sx = masterWasher.x + Math.sin(sloshT * 3.8) * 0.45;
          const sy = 1.15 + Math.abs(Math.sin(sloshT * 3.8)) * 0.25;
          playerMesh.position.set(sx, sy, masterWasher.z + 0.3);
          playerMesh.rotation.order = 'XYZ';
          playerMesh.rotation.set(0, 0, Math.sin(sloshT * 3.8) * 0.45);
          if (playerPos) playerPos.copy(playerMesh.position);
        }
      }
      // Phase 3: High-Speed Centrifugal Spin Cycle! (4.5s - 9.0s)
      else if (t < 9.0) {
        masterWasher.cyclePhase = 'spin';
        const spinT = t - 4.5;
        // Accelerate up to 22 rad/s (~210 RPM)
        const targetSpeed = Math.min(22.0, 5.0 + spinT * 5.5);
        masterWasher.drumSpeed = targetSpeed;
        masterWasher.drumAngle += masterWasher.drumSpeed * dt;
        masterWasher.drumMesh.rotation.z = masterWasher.drumAngle;

        masterWasher.statusLed.material.color.setHex(0xef4444); // Red / Max Spin!

        // Water drains out
        if (masterWasher.waterMesh) {
          masterWasher.waterMesh.material.opacity = Math.max(0.05, 0.55 - spinT * 0.15);
        }

        // Centrifugal roll: Shark spins in full 360 loops inside the drum!
        if (playerMesh) {
          const spinRadius = 0.85;
          const sx = masterWasher.x + Math.cos(masterWasher.drumAngle) * spinRadius;
          const sy = 1.85 + Math.sin(masterWasher.drumAngle) * spinRadius;
          playerMesh.position.set(sx, sy, masterWasher.z + 0.3);
          playerMesh.rotation.order = 'XYZ';
          playerMesh.rotation.set(0, 0, masterWasher.drumAngle - Math.PI / 2);
          if (playerPos) playerPos.copy(playerMesh.position);
        }
      }
      // Phase 4: Spin Down & Ding! (9.0s - 10.5s)
      else if (t < 10.5) {
        masterWasher.cyclePhase = 'finishing';
        const finishT = t - 9.0;
        masterWasher.drumSpeed = Math.max(0, masterWasher.drumSpeed - dt * 15.0);
        masterWasher.drumAngle += masterWasher.drumSpeed * dt;
        masterWasher.drumMesh.rotation.z = masterWasher.drumAngle;

        // Pop door open
        const openProg = Math.min(1.0, finishT / 1.0);
        masterWasher.doorMesh.rotation.y = masterWasher.doorOpenAngle * openProg;

        masterWasher.statusLed.material.color.setHex(0x52f29c); // Green / Ready!

        if (finishT >= 0.1 && !masterWasher.didDing) {
          masterWasher.didDing = true;
          if (window.CozyAudio && typeof window.CozyAudio.laundromatDing === 'function') {
            window.CozyAudio.laundromatDing();
          }
        }

        // Return player to floor
        if (playerMesh) {
          playerMesh.position.set(masterWasher.x, 0, masterWasher.z + 2.4);
          playerMesh.rotation.order = 'XYZ';
          playerMesh.rotation.set(0, 0, 0);
          if (playerPos) playerPos.copy(playerMesh.position);
        }
      }
      // Cycle Complete!
      else {
        masterWasher.cycleActive = false;
        masterWasher.cyclePhase = 'idle';
        masterWasher.didDing = false;
        masterWasher.drumMesh.rotation.z = 0;
        if (masterWasher.waterMesh) masterWasher.waterMesh.material.opacity = 0;
        if (bubbleParticles) bubbleParticles.material.opacity = 0;

        if (typeof onCompleteHandler === 'function') {
          onCompleteHandler();
          onCompleteHandler = null;
        }
      }
    }
  }

  function getFloorHeight(x, z, y) {
    // Inside giant washer drum
    if (Math.abs(x - masterWasher.x) <= 1.4 && z >= masterWasher.z - 1.4 && z <= masterWasher.z + 1.4) {
      return 0.45; // Curved drum interior floor
    }
    // Folding table surface
    if (Math.abs(x - (-5.5)) <= 2.1 && Math.abs(z - 0) <= 1.0) {
      if (y >= 1.0) return 1.25;
    }
    // Top of standard washers
    if (Math.abs(z - (-7.5)) <= 1.0 && Math.abs(x) > 3.0 && Math.abs(x) < 10.5) {
      if (y >= 1.8) return 2.3;
    }
    // Base floor
    return 0.0;
  }

  function resolveMove(current, next, isGrounded) {
    let nx = next.x;
    let nz = next.z;

    // Room boundaries: 24m wide x 18m deep
    const minX = -11.0;
    const maxX = 11.0;
    const minZ = -8.2;
    const maxZ = 8.2;

    nx = Math.max(minX, Math.min(maxX, nx));
    nz = Math.max(minZ, Math.min(maxZ, nz));

    // Master Washer Front Collision (can only enter through door when open)
    const mwXMin = masterWasher.x - 2.4;
    const mwXMax = masterWasher.x + 2.4;
    const mwZFront = masterWasher.z + 1.8;
    const mwZBack = masterWasher.z - 1.8;

    if (nx > mwXMin && nx < mwXMax && nz > mwZBack && nz < mwZFront) {
      // If cycle is active or door is shut, push back out
      if (masterWasher.cycleActive || Math.abs(nx - masterWasher.x) > 1.2) {
        if (current.z >= mwZFront) nz = Math.max(nz, mwZFront + 0.1);
      }
    }

    return { x: nx, z: nz };
  }

  function getInteractables(p) {
    const out = [];

    // 1. Giant Master Washer #7
    const dWasher = Math.hypot(p.x - masterWasher.x, p.z - (masterWasher.z + 0.8));
    if (dWasher < 3.2) {
      if (masterWasher.cycleActive) {
        out.push({
          kind: 'washer_running',
          dist: dWasher,
          prompt: 'Mega Spin Cycle in Progress! Sloshing & Tumbling... 🫧🌀'
        });
      } else if (Math.abs(p.x - masterWasher.x) < 1.4 && p.z < masterWasher.z + 1.2) {
        out.push({
          kind: 'washer_start',
          dist: dWasher,
          prompt: 'Start Mega Spin Cycle (Warm 40°C Delicate)! [E] 🫧🌀'
        });
      } else {
        out.push({
          kind: 'washer_enter',
          dist: dWasher,
          prompt: 'Hop Inside Giant Washer & Spin Dryer #7 [Hop / E] 🧺'
        });
      }
    }

    // 2. Vending Machine
    const dVending = Math.hypot(p.x - (-10.8), p.z - (-3.2));
    if (dVending < 2.5) {
      out.push({
        kind: 'laundromat_vending',
        dist: dVending,
        prompt: 'Vending Machine: Buy Lavender Fluff & Scented Breb [E] 🌸'
      });
    }

    // 3. Return Portal
    const dPortal = Math.hypot(p.x - (-8.0), p.z - 6.2);
    if (dPortal < 3.2) {
      out.push({
        kind: 'laundromat_return',
        dist: dPortal,
        prompt: 'Return through Portal to Blåhaj Island [E] 🌀'
      });
    }

    return out;
  }

  return {
    build,
    isBuilt: () => built,
    isActive: () => active,
    setActive: (v) => { active = v; },
    getScene: () => scn,
    getStart: () => START,
    update,
    getFloorHeight,
    resolveMove,
    getCeilingY: () => 5.0,
    getInteractables,
    startSpinCycle,
    isSpinCycleActive: () => masterWasher.cycleActive
  };
})();
