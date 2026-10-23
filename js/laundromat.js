// ============================================================================
// BLÅHAJ ISLAND - THE MIDNIGHT LIMINAL LAUNDROMAT (INSTANCE)
// An expansive late-night 24/7 coin-op laundromat suspended in the Between.
// Features: Checkered linoleum tiles, glowing fluorescent troffers, neon signage,
// plate-glass cosmic starry window, central seating & folding table spine,
// continuous cart loop track, wall-mounted shark gallery artwork, and
// THE GIANT MASTER WASHER #7 with an interactive high-speed spin cycle!
// ============================================================================

window.BlahajLaundromat = (function () {
  'use strict';

  let scn = null;
  let built = false;
  let active = false;

  // Entrance at front end near the cosmic window & portal (facing -Z down the hall)
  const START = { x: -4.5, y: 0.0, z: 14.5, rotY: Math.PI };

  // Master Washer State & Spin Cycle Engine (Anchored at far back wall)
  const masterWasher = {
    x: 0,
    y: 0,
    z: -16.8,
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
    drumAngle: 0.0,
    didDing: false
  };

  let bubbleParticles = null;
  let steamParticles = null;
  let neonSignLight = null;
  let neonSignMat = null;
  let portalSwirlMat = null;
  let portalLight = null;

  // Shared materials & carts state
  let chromeMat = null;
  let brassMat = null;
  const carts = [];
  let occupiedCart = null;
  const bumpBursts = [];
  let portalRuneRing = null;

  // Gallery Posters List (10 featured wall-mounted artworks with museum sconces)
  const POSTERS = [
    // Left Wall (X = -9.85, facing East towards center)
    {
      id: 'p_sunset',
      title: 'Shark Week Festival at Sunset',
      src: 'assets/gallery/Shark-Week-sunset.png',
      desc: 'Boats racing across The Water That Doth Not Wet while the Great Portal Gate shimmers violet-blue against the sunset volcano.',
      wall: 'left',
      x: -9.82, y: 2.6, z: -13.0
    },
    {
      id: 'p_emergency',
      title: 'Emergency: The Over-Dunked Biscuit',
      src: 'assets/gallery/Emergency-1.png',
      desc: '"The biscuit has exceeded the safe dunking interval!" Solomon gasps, Hiram measures the teacup, and Nimue consults This Has Happened Before.',
      wall: 'left',
      x: -9.82, y: 2.6, z: -6.5
    },
    {
      id: 'p_hermes',
      title: 'Hermes — The Weary Guide',
      src: 'assets/gallery/Hermes.png',
      desc: 'Bearer of the Between Lantern. "I am tired, sharkitty... but the road home is always worth the trip."',
      wall: 'left',
      x: -9.82, y: 2.6, z: 0.0
    },
    {
      id: 'p_solomon',
      title: 'Solomon — The Star Shark',
      src: 'assets/gallery/Solomon.png',
      desc: 'Master of hospitality and sacred tea. "Every meal is a performance. Every friend is the best kind of audience."',
      wall: 'left',
      x: -9.82, y: 2.6, z: 6.5
    },
    {
      id: 'p_spherical',
      title: 'Spherical Foods ("No Flat Food Here")',
      src: 'assets/gallery/Spherical-Foods.png',
      desc: 'The four blue sharks seated in a burgundy round booth inspecting the round menu of nine spherical delicacies with the Beetroot server.',
      wall: 'left',
      x: -9.82, y: 2.6, z: 13.0
    },

    // Right Wall (X = +9.85, facing West towards center)
    {
      id: 'p_seam',
      title: 'Mending the Great Sky Seam',
      src: 'assets/gallery/repair-the-sky-seam.png',
      desc: 'Blue and pink sharks gather on the moonlit cliffs with lanterns and tea to pull luminous golden thread across a tear in reality.',
      wall: 'right',
      x: 9.82, y: 2.6, z: -13.0
    },
    {
      id: 'p_wedding',
      title: 'Different Shores, Same Ocean',
      src: 'assets/gallery/Wedding-1.png',
      desc: '"Kinder, Braver, Softer, Together — Love Travels Deeper." A joyous beach ceremony beneath flower arches, portal glow, and volcanic warmth.',
      wall: 'right',
      x: 9.82, y: 2.6, z: -6.5
    },
    {
      id: 'p_hiram',
      title: 'Hiram — The Master Builder',
      src: 'assets/gallery/Hiram.png',
      desc: 'Architect of the Archipelago and wielder of the Sacred Allen Key. "If something exists, it was meant to. If something breaks, I must understand why."',
      wall: 'right',
      x: 9.82, y: 2.6, z: 0.0
    },
    {
      id: 'p_nimue',
      title: 'Nimue — An Angel',
      src: 'assets/gallery/Nimue.png',
      desc: 'Needle of restoration and tender of the stars. "I am not brave. I am just still here. And that is enough."',
      wall: 'right',
      x: 9.82, y: 2.6, z: 6.5
    },
    {
      id: 'p_volcano',
      title: 'Volcano Temple Gathering with Carrots',
      src: 'assets/gallery/Volcano-temple.png',
      desc: 'Solemn robed sharks honour the lava flows alongside welcomed carrot visitors in floral beach shorts. "Respect the Depths — Honor the Fire."',
      wall: 'right',
      x: 9.82, y: 2.6, z: 13.0
    }
  ];

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
        ctx.fillStyle = isGreen ? '#467c71' : '#e8e2d4';
        ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);

        // Subtle wax sheen & grout borders
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.14)';
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
    tex.repeat.set(10, 19);
    return tex;
  }

  function createCeilingTileTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ded9ce';
    ctx.fillRect(0, 0, 256, 256);

    ctx.strokeStyle = '#8e867a';
    ctx.lineWidth = 4;
    ctx.strokeRect(0, 0, 256, 256);

    // Stippled acoustic perforations
    ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
    for (let i = 0; i < 90; i++) {
      ctx.fillRect(Math.random() * 250 + 3, Math.random() * 250 + 3, 2, 2);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(10, 19);
    return tex;
  }

  async function build() {
    if (built) return scn;
    scn = new THREE.Scene();

    // 1. Cozy Liminal Ambient Lighting
    const amb = new THREE.AmbientLight(0x82b4cc, 0.70);
    scn.add(amb);

    // 2. Room Shell (20m wide x 38m deep x 5.2m high)
    const floorGeo = new THREE.PlaneGeometry(20, 38);
    const floorMat = new THREE.MeshStandardMaterial({
      map: createLinoleumTexture(),
      roughness: 0.26,
      metalness: 0.14
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scn.add(floor);

    // Ceiling with recessed acoustic tiles
    const ceilGeo = new THREE.PlaneGeometry(20, 38);
    const ceilMat = new THREE.MeshStandardMaterial({
      map: createCeilingTileTexture(),
      roughness: 0.85
    });
    const ceiling = new THREE.Mesh(ceilGeo, ceilMat);
    ceiling.position.y = 5.2;
    ceiling.rotation.x = Math.PI / 2;
    scn.add(ceiling);

    // Fluorescent Light Troffers (2 parallel rows down the left & right aisles)
    const trofferGeo = new THREE.BoxGeometry(2.4, 0.12, 1.2);
    const trofferMat = new THREE.MeshBasicMaterial({ color: 0xfffbea });
    const zTroffers = [-14, -7, 0, 7, 14];

    [-5.0, 5.0].forEach((lx) => {
      zTroffers.forEach((lz) => {
        const troffer = new THREE.Mesh(trofferGeo, trofferMat);
        troffer.position.set(lx, 5.14, lz);
        scn.add(troffer);

        const light = new THREE.PointLight(0xfffae0, 0.75, 14, 1.8);
        light.position.set(lx, 4.85, lz);
        scn.add(light);
      });
    });

    // 3. Walls
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xe2dcce, roughness: 0.65 });
    const wainscotMat = new THREE.MeshStandardMaterial({ color: 0x365f58, roughness: 0.35 });

    // Back Wall (Z = -19)
    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(20, 5.2), wallMat);
    backWall.position.set(0, 2.6, -19);
    scn.add(backWall);

    const backWainscot = new THREE.Mesh(new THREE.BoxGeometry(20, 1.6, 0.15), wainscotMat);
    backWainscot.position.set(0, 0.8, -18.92);
    scn.add(backWainscot);

    // Side Walls (X = -10 and X = +10, 38m long)
    const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(38, 5.2), wallMat);
    leftWall.position.set(-10, 2.6, 0);
    leftWall.rotation.y = Math.PI / 2;
    scn.add(leftWall);

    const leftWainscot = new THREE.Mesh(new THREE.BoxGeometry(38, 1.6, 0.15), wainscotMat);
    leftWainscot.position.set(-9.92, 0.8, 0);
    leftWainscot.rotation.y = Math.PI / 2;
    scn.add(leftWainscot);

    const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(38, 5.2), wallMat);
    rightWall.position.set(10, 2.6, 0);
    rightWall.rotation.y = -Math.PI / 2;
    scn.add(rightWall);

    const rightWainscot = new THREE.Mesh(new THREE.BoxGeometry(38, 1.6, 0.15), wainscotMat);
    rightWainscot.position.set(9.92, 0.8, 0);
    rightWainscot.rotation.y = -Math.PI / 2;
    scn.add(rightWainscot);

    // Front Wall with Giant Plate-Glass Cosmic Window (Z = +19)
    const frontWallLeft = new THREE.Mesh(new THREE.BoxGeometry(3.5, 5.2, 0.3), wallMat);
    frontWallLeft.position.set(-8.25, 2.6, 19);
    scn.add(frontWallLeft);

    const frontWallRight = new THREE.Mesh(new THREE.BoxGeometry(3.5, 5.2, 0.3), wallMat);
    frontWallRight.position.set(8.25, 2.6, 19);
    scn.add(frontWallRight);

    // Translucent cosmic viewing glass
    const windowGlass = new THREE.Mesh(
      new THREE.PlaneGeometry(13.0, 4.4),
      new THREE.MeshStandardMaterial({
        color: 0x4fa8d1,
        transparent: true,
        opacity: 0.32,
        roughness: 0.08,
        metalness: 0.82
      })
    );
    windowGlass.position.set(0, 2.6, 18.95);
    scn.add(windowGlass);

    // Deep Cosmic Starfield & Drifting Nebulae visible through the front glass
    const starGeo = new THREE.BufferGeometry();
    const starCount = 420;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      starPos[i * 3] = (Math.random() - 0.5) * 50;
      starPos[i * 3 + 1] = Math.random() * 22 - 2;
      starPos[i * 3 + 2] = 23 + Math.random() * 35; // Outside the front window!
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starSystem = new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({ color: 0xffffff, size: 0.32, transparent: true, opacity: 0.9 })
    );
    scn.add(starSystem);

    // 4. Glowing Neon Sign: "DELICATE CYCLE · OPEN 24/7" (Centered on Far Back Wall)
    const neonGroup = new THREE.Group();
    neonGroup.position.set(0, 4.25, -18.8);

    neonSignMat = new THREE.MeshBasicMaterial({ color: 0xff3b94 });
    const signBacking = new THREE.Mesh(
      new THREE.BoxGeometry(11.0, 1.15, 0.1),
      new THREE.MeshStandardMaterial({ color: 0x101622, roughness: 0.8 })
    );
    neonGroup.add(signBacking);

    const neonBar1 = new THREE.Mesh(new THREE.BoxGeometry(10.2, 0.12, 0.08), neonSignMat);
    neonBar1.position.y = 0.44;
    neonGroup.add(neonBar1);

    const neonBar2 = new THREE.Mesh(new THREE.BoxGeometry(10.2, 0.12, 0.08), neonSignMat);
    neonBar2.position.y = -0.44;
    neonGroup.add(neonBar2);

    // Cyan Washing Machine Ring Icon
    const neonIcon = new THREE.Mesh(
      new THREE.RingGeometry(0.34, 0.44, 16),
      new THREE.MeshBasicMaterial({ color: 0x4df0ff, side: THREE.DoubleSide })
    );
    neonIcon.position.set(-4.5, 0, 0.08);
    neonGroup.add(neonIcon);

    neonSignLight = new THREE.PointLight(0xff3b94, 2.0, 18, 2.0);
    neonSignLight.position.set(0, 0, 0.5);
    neonGroup.add(neonSignLight);
    scn.add(neonGroup);

    // 5. Commercial Front-Load Washers (Lining the Left Wall)
    const washerMat = new THREE.MeshStandardMaterial({ color: 0xf5f3ee, roughness: 0.32, metalness: 0.15 });
    chromeMat = new THREE.MeshStandardMaterial({ color: 0xd8d8d8, roughness: 0.15, metalness: 0.88 });
    brassMat = new THREE.MeshStandardMaterial({ color: 0xd4a559, roughness: 0.28, metalness: 0.85 });

    // 3 banks of 3 washers along left wall
    const washerBanks = [-15.5, -9.5, -3.5, 3.5, 9.5];
    washerBanks.forEach((wz) => {
      const wGroup = new THREE.Group();
      wGroup.position.set(-8.85, 1.15, wz);
      wGroup.rotation.y = Math.PI / 2; // Facing into aisle

      const body = new THREE.Mesh(new THREE.BoxGeometry(1.9, 2.3, 1.9), washerMat);
      body.castShadow = true;
      wGroup.add(body);

      const doorRim = new THREE.Mesh(new THREE.TorusGeometry(0.60, 0.09, 12, 24), chromeMat);
      doorRim.position.set(0, -0.05, 0.98);
      wGroup.add(doorRim);

      const glass = new THREE.Mesh(
        new THREE.CircleGeometry(0.56, 20),
        new THREE.MeshStandardMaterial({ color: 0x8bd5f5, transparent: true, opacity: 0.45, roughness: 0.1 })
      );
      glass.position.set(0, -0.05, 0.98);
      wGroup.add(glass);

      const panel = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.40, 0.08), new THREE.MeshStandardMaterial({ color: 0x223242, roughness: 0.4 }));
      panel.position.set(0, 0.85, 0.97);
      wGroup.add(panel);

      const coinSlot = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.22, 0.04), chromeMat);
      coinSlot.position.set(0.60, 0.85, 1.02);
      wGroup.add(coinSlot);

      scn.add(wGroup);
    });

    // 6. Commercial Tumble Dryers (Lining the Right Wall with Amber Glow)
    const dryerBanks = [-15.5, -9.5, -3.5, 3.5, 9.5];
    dryerBanks.forEach((dz) => {
      const dyGroup = new THREE.Group();
      dyGroup.position.set(8.85, 1.15, dz);
      dyGroup.rotation.y = -Math.PI / 2; // Facing into aisle

      const dBody = new THREE.Mesh(new THREE.BoxGeometry(1.9, 2.3, 1.9), new THREE.MeshStandardMaterial({ color: 0xecd9c6, roughness: 0.4 }));
      dBody.castShadow = true;
      dyGroup.add(dBody);

      const dDoor = new THREE.Mesh(new THREE.TorusGeometry(0.60, 0.09, 12, 20), chromeMat);
      dDoor.position.set(0, -0.05, 0.98);
      dyGroup.add(dDoor);

      const dGlow = new THREE.PointLight(0xffaa44, 0.65, 4.5);
      dGlow.position.set(0, -0.05, 1.15);
      dyGroup.add(dGlow);

      scn.add(dyGroup);
    });

    // 7. WALL-MOUNTED GALLERY ARTWORK (10 Framed Posters with Brass Picture Lights)
    const texLoader = new THREE.TextureLoader();
    POSTERS.forEach((poster) => {
      const pGroup = new THREE.Group();
      pGroup.position.set(poster.x, poster.y, poster.z);

      if (poster.wall === 'left') {
        pGroup.rotation.y = Math.PI / 2; // Facing East
      } else {
        pGroup.rotation.y = -Math.PI / 2; // Facing West
      }

      // Elegant brass picture frame
      const frameW = 2.4;
      const frameH = 3.0;
      const frameBorder = new THREE.Mesh(new THREE.BoxGeometry(frameW, frameH, 0.10), brassMat);
      frameBorder.castShadow = true;
      pGroup.add(frameBorder);

      // Artwork canvas plane
      const artTex = texLoader.load(poster.src);
      const canvasMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(frameW - 0.22, frameH - 0.22),
        new THREE.MeshBasicMaterial({ map: artTex, side: THREE.DoubleSide })
      );
      canvasMesh.position.z = 0.06;
      pGroup.add(canvasMesh);

      // Brass Picture Sconce Downlight
      const sconceArm = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.45, 8), brassMat);
      sconceArm.rotation.x = Math.PI / 2;
      sconceArm.position.set(0, frameH / 2 + 0.15, 0.22);
      pGroup.add(sconceArm);

      const sconceShade = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.12, 0.2), brassMat);
      sconceShade.position.set(0, frameH / 2 + 0.18, 0.42);
      pGroup.add(sconceShade);

      const sconceLight = new THREE.PointLight(0xfff6dc, 1.1, 4.8, 1.8);
      sconceLight.position.set(0, frameH / 2 + 0.1, 0.45);
      pGroup.add(sconceLight);

      scn.add(pGroup);
    });

    // 8. THE GIANT MASTER WASHER & SPIN DRYER #7 (Center of Far Back Wall at Z = -16.8)
    const mwGroup = new THREE.Group();
    mwGroup.position.set(masterWasher.x, 0, masterWasher.z);

    const cabinetMat = new THREE.MeshStandardMaterial({ color: 0xedf7f5, roughness: 0.28 });
    const drumInsideMat = new THREE.MeshStandardMaterial({ color: 0xa8b2bc, roughness: 0.25, metalness: 0.75, side: THREE.DoubleSide });

    // Outer Cabinet Panels
    const mwLeft = new THREE.Mesh(new THREE.BoxGeometry(0.25, 4.2, 3.6), cabinetMat);
    mwLeft.position.set(-2.275, 2.1, 0);
    mwLeft.castShadow = true;
    mwGroup.add(mwLeft);

    const mwRight = new THREE.Mesh(new THREE.BoxGeometry(0.25, 4.2, 3.6), cabinetMat);
    mwRight.position.set(2.275, 2.1, 0);
    mwRight.castShadow = true;
    mwGroup.add(mwRight);

    const mwTop = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.25, 3.6), cabinetMat);
    mwTop.position.set(0, 4.075, 0);
    mwTop.castShadow = true;
    mwGroup.add(mwTop);

    const mwBottom = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.25, 3.6), cabinetMat);
    mwBottom.position.set(0, 0.125, 0);
    mwBottom.receiveShadow = true;
    mwGroup.add(mwBottom);

    const mwBack = new THREE.Mesh(new THREE.BoxGeometry(4.8, 4.2, 0.25), cabinetMat);
    mwBack.position.set(0, 2.1, -1.675);
    mwBack.castShadow = true;
    mwGroup.add(mwBack);

    const mwFrontHeader = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.75, 0.2), cabinetMat);
    mwFrontHeader.position.set(0, 3.65, 1.7);
    mwGroup.add(mwFrontHeader);

    const mwFrontBottom = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.35, 0.2), cabinetMat);
    mwFrontBottom.position.set(0, 0.175, 1.7);
    mwGroup.add(mwFrontBottom);

    const mwFrontLeft = new THREE.Mesh(new THREE.BoxGeometry(0.75, 2.9, 0.2), cabinetMat);
    mwFrontLeft.position.set(-2.025, 1.85, 1.7);
    mwGroup.add(mwFrontLeft);

    const mwFrontRight = new THREE.Mesh(new THREE.BoxGeometry(0.75, 2.9, 0.2), cabinetMat);
    mwFrontRight.position.set(2.025, 1.85, 1.7);
    mwGroup.add(mwFrontRight);

    // Interior Drum Spotlight
    const drumInteriorLight = new THREE.PointLight(0xbdf4ff, 2.4, 6.5, 1.2);
    drumInteriorLight.position.set(0, 2.8, 0);
    mwGroup.add(drumInteriorLight);

    // Front Fascia Controls & Status LED
    const mwPanel = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.75, 0.12), new THREE.MeshStandardMaterial({ color: 0x1b2836, roughness: 0.4 }));
    mwPanel.position.set(0, 3.65, 1.82);
    mwGroup.add(mwPanel);

    const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.12, 16), chromeMat);
    dial.rotation.x = Math.PI / 2;
    dial.position.set(-1.4, 3.65, 1.9);
    mwGroup.add(dial);

    const megaCoinSlot = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.42, 0.08), chromeMat);
    megaCoinSlot.position.set(1.5, 3.65, 1.9);
    mwGroup.add(megaCoinSlot);

    masterWasher.statusLed = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0x52f29c }) // Green for Ready
    );
    masterWasher.statusLed.position.set(0, 3.65, 1.9);
    mwGroup.add(masterWasher.statusLed);

    const aperture = new THREE.Mesh(new THREE.TorusGeometry(1.68, 0.16, 16, 32), chromeMat);
    aperture.position.set(0, 1.85, 1.82);
    mwGroup.add(aperture);

    // Rotating Tumbling Drum
    const drumGroup = new THREE.Group();
    drumGroup.position.set(0, 1.85, 0);

    const drumGeo = new THREE.CylinderGeometry(1.55, 1.55, 2.8, 28, 1, true);
    const drumCyl = new THREE.Mesh(drumGeo, drumInsideMat);
    drumCyl.rotation.x = Math.PI / 2;
    drumGroup.add(drumCyl);

    const drumBack = new THREE.Mesh(new THREE.CircleGeometry(1.55, 28), drumInsideMat);
    drumBack.position.set(0, 0, -1.38);
    drumGroup.add(drumBack);

    for (let r = 0; r < 3; r++) {
      const finAng = (r * Math.PI * 2) / 3;
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.28, 2.6), chromeMat);
      fin.position.set(Math.cos(finAng) * 1.38, Math.sin(finAng) * 1.38, 0);
      fin.rotation.z = finAng;
      drumGroup.add(fin);
    }

    mwGroup.add(drumGroup);
    masterWasher.drumMesh = drumGroup;

    // Soapy Wash Water inside the drum
    const waterGeo = new THREE.CylinderGeometry(1.48, 1.48, 0.6, 24);
    const washWater = new THREE.Mesh(waterGeo, new THREE.MeshStandardMaterial({
      color: 0x82e2ff,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
      roughness: 0.15,
      metalness: 0.4
    }));
    washWater.position.set(0, -0.9, 0);
    drumGroup.add(washWater);
    masterWasher.waterMesh = washWater;

    // Porthole Door on chrome hinge
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

    doorHinge.rotation.y = masterWasher.doorOpenAngle;
    mwGroup.add(doorHinge);
    masterWasher.doorMesh = doorHinge;

    scn.add(mwGroup);

    // Laundry Suds & Bubble Particles
    const bubbleGeo = new THREE.BufferGeometry();
    const bubbleCount = 140;
    const bubblePos = new Float32Array(bubbleCount * 3);
    for (let i = 0; i < bubbleCount; i++) {
      bubblePos[i * 3] = (Math.random() - 0.5) * 2.2;
      bubblePos[i * 3 + 1] = 1.0 + Math.random() * 1.8;
      bubblePos[i * 3 + 2] = masterWasher.z + (Math.random() - 0.5) * 1.8;
    }
    bubbleGeo.setAttribute('position', new THREE.BufferAttribute(bubblePos, 3));
    bubbleParticles = new THREE.Points(
      bubbleGeo,
      new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.45,
        transparent: true,
        depthWrite: false,
        opacity: 0.0,
        blending: THREE.AdditiveBlending
      })
    );
    scn.add(bubbleParticles);

    // 9. CENTER ISLAND: FOLDING TABLES & BACK-TO-BACK RETRO SCOOP CHAIRS
    // Creates a continuous oval loop racetrack around the room!
    const tableMat = new THREE.MeshStandardMaterial({ color: 0xfbf8f2, roughness: 0.32 });
    const chairColors = [0x4ea8a0, 0xf7a24a, 0x548bb5]; // Turquoise, Vintage Orange, Ocean Blue

    function createFoldingTable(tz) {
      const tg = new THREE.Group();
      tg.position.set(0, 0, tz);

      const top = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.12, 1.8), tableMat);
      top.position.y = 1.25;
      top.castShadow = true;
      tg.add(top);

      // Chrome tubular legs
      [-1.3, 1.3].forEach((lx) => {
        [-0.7, 0.7].forEach((lz) => {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.25, 8), chromeMat);
          leg.position.set(lx, 0.625, lz);
          tg.add(leg);
        });
      });

      // Piles of folded pastel towels
      const towelCols = [0x7ec8b5, 0xf6ad55, 0x90cdf4, 0xd6bcfa];
      for (let t = 0; t < 3; t++) {
        const towelStack = new THREE.Mesh(
          new THREE.BoxGeometry(0.75, 0.32, 0.65),
          new THREE.MeshStandardMaterial({ color: towelCols[t % towelCols.length], roughness: 0.85 })
        );
        towelStack.position.set(-0.9 + t * 0.9, 1.45, (Math.random() - 0.5) * 0.2);
        tg.add(towelStack);
      }

      return tg;
    }

    function createBackToBackChairs(cz) {
      const cg = new THREE.Group();
      cg.position.set(0, 0, cz);

      // Center divider bar between the two back-to-back chair rows
      const dividerMat = new THREE.MeshStandardMaterial({ color: 0x223242, roughness: 0.5 });
      const divider = new THREE.Mesh(
        new THREE.BoxGeometry(0.10, 0.95, 2.7),
        dividerMat
      );
      divider.position.set(0, 0.72, 0);
      divider.castShadow = true;
      cg.add(divider);

      // Tandem tubular chrome support rails under each seat bank
      [-0.62, 0.62].forEach((rx) => {
        const rail = new THREE.Mesh(
          new THREE.CylinderGeometry(0.032, 0.032, 2.5, 8),
          chromeMat
        );
        rail.rotation.x = Math.PI / 2;
        rail.position.set(rx, 0.28, 0);
        cg.add(rail);
      });

      // Cross struts tying the tandem beams to the central divider
      [-0.9, 0.0, 0.9].forEach((sz) => {
        const cross = new THREE.Mesh(
          new THREE.CylinderGeometry(0.028, 0.028, 1.26, 8),
          chromeMat
        );
        cross.rotation.z = Math.PI / 2;
        cross.position.set(0, 0.28, sz);
        cg.add(cross);
      });

      function buildRetroChair(col) {
        const chair = new THREE.Group();
        const mat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.35 });

        // Molded retro scoop seat base
        const seat = new THREE.Mesh(new THREE.BoxGeometry(0.70, 0.08, 0.62), mat);
        seat.position.y = 0.58;
        seat.castShadow = true;
        chair.add(seat);

        // Reclined scoop backrest (local +Z is the back)
        const back = new THREE.Mesh(new THREE.BoxGeometry(0.70, 0.58, 0.08), mat);
        back.position.set(0, 0.86, 0.27);
        back.rotation.x = 0.10; // angled slightly back toward the divider
        back.castShadow = true;
        chair.add(back);

        // Molded contour side bolsters
        [-0.32, 0.32].forEach((sx) => {
          const rim = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.14, 0.44), mat);
          rim.position.set(sx, 0.63, 0.05);
          chair.add(rim);
        });

        // Tubular chrome pedestal & floor anchor plate
        const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.54, 8), chromeMat);
        pedestal.position.set(0, 0.27, 0);
        chair.add(pedestal);

        const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.03, 12), chromeMat);
        foot.position.set(0, 0.015, 0);
        chair.add(foot);

        return chair;
      }

      // 3 Chairs facing OUTWARD towards Left (West wall washers)
      // With local back at +Z, rotation.y = +PI/2 places back towards divider (+X) and seat facing West (-X)
      [-0.9, 0.0, 0.9].forEach((zOff, i) => {
        const chair = buildRetroChair(chairColors[i % chairColors.length]);
        chair.position.set(-0.62, 0, zOff);
        chair.rotation.y = Math.PI / 2;
        cg.add(chair);
      });

      // 3 Chairs facing OUTWARD towards Right (East wall dryers)
      // With local back at +Z, rotation.y = -PI/2 places back towards divider (-X) and seat facing East (+X)
      [-0.9, 0.0, 0.9].forEach((zOff, i) => {
        const chair = buildRetroChair(chairColors[(i + 1) % chairColors.length]);
        chair.position.set(0.62, 0, zOff);
        chair.rotation.y = -Math.PI / 2;
        cg.add(chair);
      });

      return cg;
    }

    // Spine composition: Table, Chairs, Table, Chairs, Table
    scn.add(createFoldingTable(-9.0));
    scn.add(createBackToBackChairs(-4.5));
    scn.add(createFoldingTable(0.0));
    scn.add(createBackToBackChairs(4.5));
    scn.add(createFoldingTable(9.0));

    // 10. FRONT ENTRANCE & AMENITIES (Z = +14 to +17)
    // Return Portal: Conformed to match the Volcano Trial & Island portals with brass ring & dynamic swirl shader
    const portalGroup = new THREE.Group();
    portalGroup.position.set(0, 0, 16.8);

    // Beveled Stepped Stone & Brass Plinth Base
    const plinthMat = new THREE.MeshStandardMaterial({ color: 0x223548, roughness: 0.6 });
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(1.65, 1.85, 0.28, 24), plinthMat);
    plinth.position.y = 0.14;
    plinth.receiveShadow = true;
    portalGroup.add(plinth);

    const plinthTrim = new THREE.Mesh(new THREE.TorusGeometry(1.72, 0.06, 12, 32), brassMat);
    plinthTrim.rotation.x = Math.PI / 2;
    plinthTrim.position.y = 0.28;
    portalGroup.add(plinthTrim);

    // Freestanding Ornate Brass Outer Ring
    const portalRing = new THREE.Mesh(new THREE.TorusGeometry(1.65, 0.18, 16, 44), brassMat);
    portalRing.position.y = 1.85;
    portalRing.castShadow = true;
    portalGroup.add(portalRing);

    // Ornate Runic Anchor Nodes at 3, 9, 12 o'clock
    [
      { x: -1.65, y: 1.85, z: 0 },
      { x: 1.65, y: 1.85, z: 0 },
      { x: 0, y: 3.5, z: 0 }
    ].forEach((np) => {
      const node = new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 0), brassMat);
      node.position.set(np.x, np.y, np.z);
      portalGroup.add(node);
    });

    // Inner Counter-Rotating Brass Rune Ring
    portalRuneRing = new THREE.Mesh(new THREE.TorusGeometry(1.50, 0.04, 12, 36), brassMat);
    portalRuneRing.position.y = 1.85;
    portalGroup.add(portalRuneRing);

    // Animated Dynamic GLSL Swirling Starlight Vortex (matching the Volcano Trial portal shader!)
    portalSwirlMat = new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.DoubleSide,
      uniforms: {
        uTime: { value: 0.0 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv * 2.0 - 1.0;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying vec2 vUv;
        void main() {
          float r = length(vUv);
          float a = atan(vUv.y, vUv.x);
          float s1 = sin(a * 5.0 - r * 11.0 + uTime * 3.4);
          float s2 = cos(a * 3.0 + r * 7.0 - uTime * 2.2);

          vec3 colDeep = vec3(0.08, 0.38, 0.65);
          vec3 colMid = vec3(0.32, 0.95, 0.62);
          vec3 colCore = vec3(0.96, 0.99, 1.0);

          vec3 col = mix(colDeep, colMid, 0.5 + 0.5 * s1);
          col = mix(col, vec3(0.72, 0.42, 0.98), 0.25 + 0.25 * s2);
          col = mix(colCore, col, smoothstep(0.0, 0.65, r));

          float alpha = (1.0 - smoothstep(0.82, 1.0, r)) * 0.92;
          gl_FragColor = vec4(col, alpha);
        }
      `
    });

    const portalVortex = new THREE.Mesh(new THREE.CircleGeometry(1.48, 36), portalSwirlMat);
    portalVortex.position.y = 1.85;
    portalGroup.add(portalVortex);

    portalLight = new THREE.PointLight(0x52f29c, 1.8, 8.5);
    portalLight.position.set(0, 1.85, 0.6);
    portalGroup.add(portalLight);
    scn.add(portalGroup);

    // Vintage Coin & Token Change Machine (X = -8.2, Z = +16.0)
    const tokenGroup = new THREE.Group();
    tokenGroup.position.set(-8.2, 0, 16.0);
    tokenGroup.rotation.y = Math.PI / 2; // Facing East into room

    const tcBody = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.4, 0.9), new THREE.MeshStandardMaterial({ color: 0x1d3557, roughness: 0.35 }));
    tcBody.position.y = 1.2;
    tokenGroup.add(tcBody);

    const tcMarquee = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.32), new THREE.MeshBasicMaterial({ color: 0xffd166 }));
    tcMarquee.position.set(0, 2.1, 0.46);
    tokenGroup.add(tcMarquee);

    const tcCup = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.22, 0.18), chromeMat);
    tcCup.position.set(0, 0.55, 0.48);
    tokenGroup.add(tcCup);
    scn.add(tokenGroup);

    // Snack & Lavender Soda Vending Machine (X = -8.2, Z = +12.5)
    const vmGroup = new THREE.Group();
    vmGroup.position.set(-8.2, 0, 12.5);
    vmGroup.rotation.y = Math.PI / 2;

    const vmBody = new THREE.Mesh(new THREE.BoxGeometry(1.6, 3.2, 1.2), new THREE.MeshStandardMaterial({ color: 0x223548, roughness: 0.3 }));
    vmBody.position.y = 1.6;
    vmGroup.add(vmBody);

    const vmWindow = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.6), new THREE.MeshBasicMaterial({ color: 0x9be0ff, transparent: true, opacity: 0.6 }));
    vmWindow.position.set(0, 1.8, 0.61);
    vmGroup.add(vmWindow);

    const vmMarquee = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.45), new THREE.MeshBasicMaterial({ color: 0xffe066 }));
    vmMarquee.position.set(0, 2.85, 0.61);
    vmGroup.add(vmMarquee);
    scn.add(vmGroup);

    // Community Corkboard & Notices (X = +8.2, Z = +15.5)
    const cbGroup = new THREE.Group();
    cbGroup.position.set(8.2, 2.3, 15.5);
    cbGroup.rotation.y = -Math.PI / 2;

    const cbFrame = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.6, 0.08), new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.7 }));
    cbGroup.add(cbFrame);

    const cbCork = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.4), new THREE.MeshStandardMaterial({ color: 0xc49a6c, roughness: 0.9 }));
    cbCork.position.z = 0.05;
    cbGroup.add(cbCork);
    scn.add(cbGroup);

    // 11. ROLLING WIRE LAUNDRY CARTS (Controllable Racers!)
    // Oval loop track: West aisle (X = -4.2) and East aisle (X = +4.2)
    carts.length = 0;
    occupiedCart = null;
    // Cart 1 in West aisle: facing North (rotY = Math.PI, local +Z points North -Z)
    createLaundryCart('cart-1', -4.5, 11.5, Math.PI, 0x38bdf8, 'The Turbo Fluff');
    // Cart 2 in East aisle: facing South (rotY = 0.0, local +Z points South +Z)
    createLaundryCart('cart-2', 4.5, -11.5, 0.0, 0xfb923c, 'The Centrifugal Cruiser');

    built = true;
    return scn;
  }

  // =========================================================================
  // COMMERCIAL WIRE LAUNDRY CARTS (CONTROLLABLE RACERS) - LARGE & NO LIDS
  // =========================================================================
  function createLaundryCart(id, initialX, initialZ, initialRotY, accentColor = 0x38bdf8, name = 'Laundry Cart') {
    const cg = new THREE.Group();
    cg.position.set(initialX, 0, initialZ);
    cg.rotation.y = initialRotY;

    // Spacious dimensions: comfortably accommodates the entire plush shark body inside!
    const cartWidth = 2.20;   // X
    const cartLength = 2.80;  // Z
    const basketBottomY = 0.28;
    const basketTopY = 1.35;
    const basketHeight = basketTopY - basketBottomY;

    // Helper: Hollow perimeter tube frame (NO SOLID LID!)
    function createPerimeterRim(w, l, y, tubeRadius, material) {
      const rimGroup = new THREE.Group();
      rimGroup.position.y = y;

      // Front & Back bars (along X)
      [-l * 0.5, l * 0.5].forEach((pz) => {
        const bar = new THREE.Mesh(new THREE.CylinderGeometry(tubeRadius, tubeRadius, w - tubeRadius * 2, 8), material);
        bar.rotation.z = Math.PI / 2;
        bar.position.set(0, 0, pz);
        bar.castShadow = true;
        rimGroup.add(bar);
      });

      // Left & Right bars (along Z)
      [-w * 0.5, w * 0.5].forEach((px) => {
        const bar = new THREE.Mesh(new THREE.CylinderGeometry(tubeRadius, tubeRadius, l - tubeRadius * 2, 8), material);
        bar.rotation.x = Math.PI / 2;
        bar.position.set(px, 0, 0);
        bar.castShadow = true;
        rimGroup.add(bar);
      });

      // 4 Corner spherical rounded joints
      [-w * 0.5, w * 0.5].forEach((px) => {
        [-l * 0.5, l * 0.5].forEach((pz) => {
          const sphere = new THREE.Mesh(new THREE.SphereGeometry(tubeRadius * 1.25, 8, 8), material);
          sphere.position.set(px, 0, pz);
          rimGroup.add(sphere);
        });
      });

      return rimGroup;
    }

    // 1. Lower Tubular Chrome Chassis
    const basePlate = new THREE.Mesh(
      new THREE.BoxGeometry(cartWidth - 0.20, 0.04, cartLength - 0.20),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6, metalness: 0.6 })
    );
    basePlate.position.y = 0.22;
    basePlate.castShadow = true;
    cg.add(basePlate);

    const bumperMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4, metalness: 0.4 });
    const lowerBumper = createPerimeterRim(cartWidth + 0.06, cartLength + 0.06, 0.22, 0.032, bumperMat);
    cg.add(lowerBumper);

    // 2. 4 Heavy-Duty Swivel Caster Wheels
    // Front is +Z (where shark faces!), Rear is -Z (where push handle is!)
    const casterPositions = [
      { x: -(cartWidth * 0.5 - 0.22), z:  (cartLength * 0.5 - 0.28), isFront: true },
      { x:  (cartWidth * 0.5 - 0.22), z:  (cartLength * 0.5 - 0.28), isFront: true },
      { x: -(cartWidth * 0.5 - 0.22), z: -(cartLength * 0.5 - 0.28), isFront: false },
      { x:  (cartWidth * 0.5 - 0.22), z: -(cartLength * 0.5 - 0.28), isFront: false }
    ];

    const wheelMeshes = [];
    const frontForks = [];
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.85 });

    casterPositions.forEach((cp) => {
      const forkGroup = new THREE.Group();
      forkGroup.position.set(cp.x, 0.20, cp.z);

      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.09, 8), chromeMat);
      stem.position.y = -0.02;
      forkGroup.add(stem);

      const forkLeft = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.12, 0.08), chromeMat);
      forkLeft.position.set(-0.045, -0.08, 0);
      forkGroup.add(forkLeft);

      const forkRight = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.12, 0.08), chromeMat);
      forkRight.position.set(0.045, -0.08, 0);
      forkGroup.add(forkRight);

      const wheelGroup = new THREE.Group();
      wheelGroup.position.set(0, -0.11, 0);

      const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 0.06, 14), tireMat);
      tire.rotation.z = Math.PI / 2;
      tire.castShadow = true;
      wheelGroup.add(tire);

      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.065, 12), chromeMat);
      hub.rotation.z = Math.PI / 2;
      wheelGroup.add(hub);

      forkGroup.add(wheelGroup);
      cg.add(forkGroup);

      wheelMeshes.push(wheelGroup);
      if (cp.isFront) {
        frontForks.push(forkGroup);
      }
    });

    // 3. Heavy Wire Basket - COMPLETELY OPEN TOP (NO LID!)
    // 4 Corner vertical chrome tubes
    [-0.5, 0.5].forEach((sx) => {
      [-0.5, 0.5].forEach((sz) => {
        const post = new THREE.Mesh(
          new THREE.CylinderGeometry(0.03, 0.03, basketHeight + 0.06, 8),
          chromeMat
        );
        post.position.set(sx * (cartWidth - 0.10), basketBottomY + basketHeight * 0.5, sz * (cartLength - 0.10));
        cg.add(post);
      });
    });

    // Top Perimeter Bumper Rim: Hollow tubular frame, OPEN TOP, NO LID!
    const topRimMat = new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.35, metalness: 0.5 });
    const topRim = createPerimeterRim(cartWidth, cartLength, basketTopY, 0.038, topRimMat);
    cg.add(topRim);

    // Intermediate perimeter reinforcing wire bands (Hollow frames!)
    const band1 = createPerimeterRim(cartWidth - 0.02, cartLength - 0.02, basketBottomY + 0.35, 0.016, chromeMat);
    cg.add(band1);
    const band2 = createPerimeterRim(cartWidth - 0.02, cartLength - 0.02, basketBottomY + 0.72, 0.016, chromeMat);
    cg.add(band2);

    // Wire grid slats along Long Sides (Left & Right)
    const numSideSlats = 14;
    for (let i = 0; i < numSideSlats; i++) {
      const zSlat = -(cartLength * 0.5 - 0.16) + (i / (numSideSlats - 1)) * (cartLength - 0.32);
      [-1, 1].forEach((side) => {
        const slat = new THREE.Mesh(
          new THREE.CylinderGeometry(0.010, 0.010, basketHeight - 0.04, 6),
          chromeMat
        );
        slat.position.set(side * (cartWidth * 0.5 - 0.04), basketBottomY + basketHeight * 0.5, zSlat);
        cg.add(slat);
      });
    }

    // Wire grid slats along Front & Back
    const numEndSlats = 11;
    for (let i = 0; i < numEndSlats; i++) {
      const xSlat = -(cartWidth * 0.5 - 0.16) + (i / (numEndSlats - 1)) * (cartWidth - 0.32);
      [-1, 1].forEach((end) => {
        const slat = new THREE.Mesh(
          new THREE.CylinderGeometry(0.010, 0.010, basketHeight - 0.04, 6),
          chromeMat
        );
        slat.position.set(xSlat, basketBottomY + basketHeight * 0.5, end * (cartLength * 0.5 - 0.04));
        cg.add(slat);
      });
    }

    // 4. Rear Push Handle (Mounted at local -Z, BEHIND the rider!)
    const handleGroup = new THREE.Group();
    handleGroup.position.set(0, basketTopY, -(cartLength * 0.5 - 0.04));

    [-0.55, 0.55].forEach((hx) => {
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.32, 8), chromeMat);
      arm.position.set(hx, 0.14, -0.08);
      arm.rotation.x = 0.36;
      handleGroup.add(arm);
    });

    const handleBar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.20, 10), chromeMat);
    handleBar.rotation.z = Math.PI / 2;
    handleBar.position.set(0, 0.25, -0.15);
    handleGroup.add(handleBar);

    const grip = new THREE.Mesh(
      new THREE.CylinderGeometry(0.034, 0.034, 0.60, 12),
      new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.85 })
    );
    grip.rotation.z = Math.PI / 2;
    grip.position.set(0, 0.25, -0.15);
    handleGroup.add(grip);
    cg.add(handleGroup);

    // 5. Generous, Cozy Bed of Warm Folded Blankets & Towels at bottom of basket
    const towelColors = [0x7ec8b5, 0xf6ad55, 0x90cdf4, 0xd6bcfa, 0xf687b3, 0xfde047];
    const towelPile = new THREE.Group();
    towelPile.position.set(0, basketBottomY + 0.04, 0);

    const pad = new THREE.Mesh(
      new THREE.BoxGeometry(cartWidth - 0.22, 0.14, cartLength - 0.24),
      new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.9 })
    );
    pad.position.y = 0.07;
    towelPile.add(pad);

    [
      { x: -0.50, y: 0.18, z: -0.65, c: towelColors[0], sx: 0.85, sz: 0.95 },
      { x:  0.50, y: 0.18, z: -0.65, c: towelColors[1], sx: 0.85, sz: 0.95 },
      { x: -0.50, y: 0.20, z:  0.65, c: towelColors[2], sx: 0.85, sz: 0.95 },
      { x:  0.50, y: 0.20, z:  0.65, c: towelColors[3], sx: 0.85, sz: 0.95 },
      { x:  0.00, y: 0.24, z:  0.00, c: towelColors[4], sx: 1.10, sz: 1.10 }
    ].forEach((td) => {
      const tMesh = new THREE.Mesh(
        new THREE.BoxGeometry(td.sx, 0.13, td.sz),
        new THREE.MeshStandardMaterial({ color: td.c, roughness: 0.85 })
      );
      tMesh.position.set(td.x, td.y, td.z);
      tMesh.rotation.y = (Math.random() - 0.5) * 0.1;
      towelPile.add(tMesh);
    });
    cg.add(towelPile);

    // 6. Laundry Ticket Clip on Front (Mounted at local +Z, AHEAD of rider!)
    const ticket = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.30, 0.01),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 })
    );
    ticket.position.set(0, basketTopY - 0.06, (cartLength * 0.5 + 0.02));
    cg.add(ticket);

    scn.add(cg);

    const cartObj = {
      id,
      name,
      mesh: cg,
      pos: new THREE.Vector3(initialX, 0, initialZ),
      rotY: initialRotY,
      speed: 0,
      bounceVx: 0,
      bounceVz: 0,
      bouncePitch: 0,
      bounceRoll: 0,
      bounceSpring: 0,
      steerAngle: 0,
      rollAngle: 0,
      wheelRotation: 0,
      isOccupied: false,
      cartWidth,
      cartLength,
      collisionRadius: 1.15,
      wheelMeshes,
      frontForks
    };

    carts.push(cartObj);
    return cartObj;
  }

  function updateCart(cart, dt, inputKeys) {
    if (!cart) return;

    let moveFwd = 0;
    let steer = 0;

    if (cart.isOccupied && inputKeys) {
      if (inputKeys['w'] || inputKeys['arrowup']) moveFwd += 1;
      if (inputKeys['s'] || inputKeys['arrowdown']) moveFwd -= 1;
      if (inputKeys['a'] || inputKeys['arrowleft']) steer += 1; // Steer Left
      if (inputKeys['d'] || inputKeys['arrowright']) steer -= 1; // Steer Right
    }

    const isTurbo = !!(inputKeys && (inputKeys['shift'] || inputKeys['ShiftLeft'] || inputKeys['ShiftRight']));
    const maxFwdSpeed = isTurbo ? 21.0 : 14.5;
    const maxRevSpeed = -6.5;
    const accelRate = isTurbo ? 28.0 : 18.0;
    const decelRate = 12.0;

    // Acceleration & Braking: W drives forward (+Z), S reverses (-Z)
    if (moveFwd > 0) {
      if (cart.speed < maxFwdSpeed) {
        cart.speed = Math.min(maxFwdSpeed, cart.speed + accelRate * dt);
      }
    } else if (moveFwd < 0) {
      if (cart.speed > 0) {
        cart.speed = Math.max(0, cart.speed - 32.0 * dt); // Responsive brake
      } else if (cart.speed > maxRevSpeed) {
        cart.speed = Math.max(maxRevSpeed, cart.speed - accelRate * 0.65 * dt);
      }
    } else {
      if (cart.speed > 0) {
        cart.speed = Math.max(0, cart.speed - decelRate * dt);
      } else if (cart.speed < 0) {
        cart.speed = Math.min(0, cart.speed + decelRate * dt);
      }
    }

    // Steering: Cart front is local +Z (direction shark faces!)
    const isMoving = Math.abs(cart.speed) > 0.05;
    const speedRatio = Math.abs(cart.speed) / maxFwdSpeed;
    const baseTurnSpeed = 3.3;

    if (steer !== 0) {
      const dir = cart.speed >= 0 ? 1 : -1;
      const turnEff = isMoving ? (0.65 + speedRatio * 0.55) : 1.35;
      cart.rotY += steer * baseTurnSpeed * turnEff * dir * dt;
      cart.steerAngle += (steer * 0.55 - cart.steerAngle) * Math.min(1.0, dt * 14.0);
    } else {
      cart.steerAngle *= Math.max(0, 1.0 - dt * 10.0);
    }

    // Damped decay of bounce impulses & spring tilt
    cart.bounceVx *= Math.max(0, 1.0 - dt * 6.5);
    cart.bounceVz *= Math.max(0, 1.0 - dt * 6.5);
    cart.bouncePitch *= Math.max(0, 1.0 - dt * 8.0);
    cart.bounceRoll *= Math.max(0, 1.0 - dt * 8.0);
    cart.bounceSpring *= Math.max(0, 1.0 - dt * 9.0);

    // Forward vector in world coordinates: pointing in local +Z (matching shark snout!)
    const fwdX = Math.sin(cart.rotY);
    const fwdZ = Math.cos(cart.rotY);

    const vx = fwdX * cart.speed + cart.bounceVx;
    const vz = fwdZ * cart.speed + cart.bounceVz;
    const speedMag = Math.hypot(vx, vz);

    if (speedMag > 0.05) {
      const rawNext = {
        x: cart.pos.x + vx * dt,
        z: cart.pos.z + vz * dt
      };
      // Collision radius 0.92m for wide commercial cart
      const resolved = resolveMove(cart.pos, rawNext, true, 0.92);
      if (resolved && !isNaN(resolved.x) && !isNaN(resolved.z)) {
        const blockedX = Math.abs(resolved.x - rawNext.x) > 0.005;
        const blockedZ = Math.abs(resolved.z - rawNext.z) > 0.005;

        // Bouncy environmental collision against walls, folding tables, or chairs
        if ((blockedX || blockedZ) && speedMag > 0.9) {
          if (blockedX) {
            cart.bounceVx = -Math.sign(vx) * Math.min(6.5, speedMag * 0.45);
            cart.speed *= 0.35;
            cart.bounceRoll = Math.sign(vx) * Math.min(0.20, speedMag * 0.022);
          }
          if (blockedZ) {
            cart.bounceVz = -Math.sign(vz) * Math.min(6.5, speedMag * 0.45);
            cart.speed *= 0.35;
            cart.bouncePitch = -Math.sign(vz) * Math.min(0.20, speedMag * 0.022);
          }
          cart.bounceSpring = 1.0;

          if (window.CozyAudio && typeof window.CozyAudio.cartBump === 'function') {
            window.CozyAudio.cartBump(speedMag);
          }

          const bumpX = blockedX ? resolved.x + Math.sign(vx) * 0.8 : resolved.x;
          const bumpZ = blockedZ ? resolved.z + Math.sign(vz) * 0.8 : resolved.z;
          spawnCartBumpParticles({ x: bumpX, y: 0.55, z: bumpZ }, 0x9be0ff, 12);
        }

        cart.pos.x = resolved.x;
        cart.pos.z = resolved.z;
      }
    }

    // Visual Wheel Spin & Caster Swivel
    const distTraveled = cart.speed * dt;
    cart.wheelRotation += distTraveled / 0.10;
    cart.wheelMeshes.forEach((w) => {
      w.rotation.x = cart.wheelRotation;
    });
    cart.frontForks.forEach((f) => {
      f.rotation.y = cart.steerAngle;
    });

    // Subtle drift roll sway
    const targetRoll = -cart.steerAngle * Math.min(0.08, speedRatio * 0.07);
    cart.rollAngle += (targetRoll - cart.rollAngle) * Math.min(1.0, dt * 12.0);

    // Sync 3D Mesh with bouncy vertical spring and tilt pitch/roll
    const bounceHopY = Math.abs(Math.sin(cart.bounceSpring * Math.PI)) * 0.05;
    cart.mesh.position.set(cart.pos.x, bounceHopY, cart.pos.z);
    cart.mesh.rotation.x = cart.bouncePitch;
    cart.mesh.rotation.y = cart.rotY;
    cart.mesh.rotation.z = cart.rollAngle + cart.bounceRoll;
  }

  // Particle helper for bouncy contact impacts
  function spawnCartBumpParticles(pos, color = 0x9be0ff, count = 12) {
    if (!scn) return;
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = [];
    for (let i = 0; i < count; i++) {
      positions[i * 3] = pos.x + (Math.random() - 0.5) * 0.5;
      positions[i * 3 + 1] = pos.y + (Math.random() - 0.5) * 0.35;
      positions[i * 3 + 2] = pos.z + (Math.random() - 0.5) * 0.5;
      velocities.push({
        vx: (Math.random() - 0.5) * 4.2,
        vy: 1.2 + Math.random() * 3.2,
        vz: (Math.random() - 0.5) * 4.2
      });
    }
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color,
      size: 0.18,
      transparent: true,
      opacity: 0.90,
      depthWrite: false
    });
    const points = new THREE.Points(geom, mat);
    scn.add(points);
    bumpBursts.push({ points, geom, velocities, life: 0.60 });
  }

  // Cart-vs-Cart elastic bumper collisions
  function checkCartCartCollisions(dt) {
    if (carts.length < 2) return;
    for (let i = 0; i < carts.length; i++) {
      for (let j = i + 1; j < carts.length; j++) {
        const c1 = carts[i];
        const c2 = carts[j];

        const dx = c2.pos.x - c1.pos.x;
        const dz = c2.pos.z - c1.pos.z;
        const dist = Math.hypot(dx, dz);
        const minDist = 2.30; // 2 x 1.15m collision radius

        if (dist < minDist && dist > 0.001) {
          const overlap = minDist - dist;
          const nx = dx / dist;
          const nz = dz / dist;

          // Push apart symmetrically
          const sepA = resolveMove(c1.pos, { x: c1.pos.x - nx * overlap * 0.52, z: c1.pos.z - nz * overlap * 0.52 }, true, 0.92);
          const sepB = resolveMove(c2.pos, { x: c2.pos.x + nx * overlap * 0.52, z: c2.pos.z + nz * overlap * 0.52 }, true, 0.92);
          if (sepA) { c1.pos.x = sepA.x; c1.pos.z = sepA.z; }
          if (sepB) { c2.pos.x = sepB.x; c2.pos.z = sepB.z; }

          // Total velocity of both carts
          const v1x = Math.sin(c1.rotY) * c1.speed + c1.bounceVx;
          const v1z = Math.cos(c1.rotY) * c1.speed + c1.bounceVz;
          const v2x = Math.sin(c2.rotY) * c2.speed + c2.bounceVx;
          const v2z = Math.cos(c2.rotY) * c2.speed + c2.bounceVz;

          // Relative velocity along collision normal
          const relVx = v1x - v2x;
          const relVz = v1z - v2z;
          const relSpeedAlongNormal = relVx * nx + relVz * nz;

          if (relSpeedAlongNormal > 0.08) {
            // Elastic bumper collision with restitution e = 0.65
            const e = 0.65;
            const impulse = (1.0 + e) * relSpeedAlongNormal * 0.5;

            c1.bounceVx -= nx * impulse;
            c1.bounceVz -= nz * impulse;
            c2.bounceVx += nx * impulse;
            c2.bounceVz += nz * impulse;

            c1.speed *= 0.45;
            c2.speed *= 0.45;

            // Chassis bounce pitch & roll
            c1.bouncePitch = -Math.min(0.24, impulse * 0.035);
            c2.bouncePitch = Math.min(0.24, impulse * 0.035);
            c1.bounceRoll = (Math.random() - 0.5) * 0.18;
            c2.bounceRoll = (Math.random() - 0.5) * 0.18;
            c1.bounceSpring = 1.0;
            c2.bounceSpring = 1.0;

            if (window.CozyAudio && typeof window.CozyAudio.cartBump === 'function') {
              window.CozyAudio.cartBump(relSpeedAlongNormal);
            }

            const midX = (c1.pos.x + c2.pos.x) * 0.5;
            const midZ = (c1.pos.z + c2.pos.z) * 0.5;
            spawnCartBumpParticles({ x: midX, y: 0.65, z: midZ }, 0xfbcfe8, 16);
          }
        }
      }
    }
  }

  function updateOccupiedCart(dt, inputKeys) {
    if (!occupiedCart) return;
    updateCart(occupiedCart, dt, inputKeys);
  }

  function mountCart(cartId) {
    let target = null;
    if (cartId) {
      target = carts.find((c) => c.id === cartId);
    }
    if (!target && carts.length > 0) {
      target = carts[0];
    }
    if (!target) return null;

    if (occupiedCart && occupiedCart !== target) {
      occupiedCart.isOccupied = false;
    }
    target.isOccupied = true;
    occupiedCart = target;
    return target;
  }

  function dismountCart(playerRef) {
    if (!occupiedCart) return null;
    const cart = occupiedCart;
    const rightX = Math.cos(cart.rotY);
    const rightZ = -Math.sin(cart.rotY);
    const rawLanding = {
      x: cart.pos.x + rightX * (cart.cartWidth * 0.5 + 0.85),
      z: cart.pos.z + rightZ * (cart.cartWidth * 0.5 + 0.85)
    };
    const safeLanding = resolveMove(cart.pos, rawLanding, true, 0.35);

    if (playerRef) {
      playerRef.pos.set(safeLanding.x, 0.0, safeLanding.z);
      playerRef.inCart = false;
      if (playerRef.mesh) {
        playerRef.mesh.position.copy(playerRef.pos);
      }
    }
    cart.isOccupied = false;
    cart.speed = 0;
    occupiedCart = null;
    return safeLanding;
  }

  // Mega Spin Cycle Sequence Controller
  function startSpinCycle(player, onFinished) {
    if (masterWasher.cycleActive) return;
    masterWasher.cycleActive = true;
    masterWasher.cyclePhase = 'closing';
    masterWasher.cycleTimer = 0.0;
    onCompleteHandler = onFinished;

    if (window.CozyAudio && typeof window.CozyAudio.coinDrop === 'function') {
      window.CozyAudio.coinDrop();
    }
  }

  function update(dt, elapsed, playerPos, playerMesh) {
    if (!active || !built) return;

    // Neon subtle electric hum flicker
    if (neonSignLight && neonSignMat) {
      const flicker = 1.9 + Math.sin(elapsed * 24.0) * 0.12 + (Math.random() < 0.015 ? -0.7 : 0);
      neonSignLight.intensity = Math.max(0.6, flicker);
    }

    // Portal Shader Swirl & Counter-Rotating Rune Ring
    if (portalSwirlMat) {
      portalSwirlMat.uniforms.uTime.value = elapsed;
    }
    if (portalLight) {
      portalLight.intensity = 1.6 + Math.sin(elapsed * 2.8) * 0.35;
    }
    if (portalRuneRing) {
      portalRuneRing.rotation.z = -elapsed * 0.45;
    }

    // Mega Spin Cycle Animation Engine inside Master Washer #7
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
        masterWasher.doorMesh.rotation.y = 0;
        const sloshT = t - 1.2;
        masterWasher.drumMesh.rotation.z = Math.sin(sloshT * 3.8) * 0.45;

        if (masterWasher.waterMesh) {
          masterWasher.waterMesh.material.opacity = Math.min(0.55, sloshT * 0.3);
        }
        if (bubbleParticles) {
          bubbleParticles.material.opacity = Math.min(0.85, sloshT * 0.4);
        }

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
        const targetSpeed = Math.min(22.0, 5.0 + spinT * 5.5);
        masterWasher.drumSpeed = targetSpeed;
        masterWasher.drumAngle += masterWasher.drumSpeed * dt;
        masterWasher.drumMesh.rotation.z = masterWasher.drumAngle;

        masterWasher.statusLed.material.color.setHex(0xef4444); // Red / Max Spin

        if (masterWasher.waterMesh) {
          masterWasher.waterMesh.material.opacity = Math.max(0.05, 0.55 - spinT * 0.15);
        }

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

        const openProg = Math.min(1.0, finishT / 1.0);
        masterWasher.doorMesh.rotation.y = masterWasher.doorOpenAngle * openProg;
        masterWasher.statusLed.material.color.setHex(0x52f29c); // Green / Ready

        if (finishT >= 0.1 && !masterWasher.didDing) {
          masterWasher.didDing = true;
          if (window.CozyAudio && typeof window.CozyAudio.laundromatDing === 'function') {
            window.CozyAudio.laundromatDing();
          }
        }

        if (playerMesh) {
          playerMesh.position.set(masterWasher.x, 0, masterWasher.z + 2.4);
          playerMesh.rotation.order = 'XYZ';
          playerMesh.rotation.set(0, 0, 0);
          if (playerPos) playerPos.copy(playerMesh.position);
        }
      }
      // Cycle Complete
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

    // 12. Update bump spark & bubble particle bursts
    for (let i = bumpBursts.length - 1; i >= 0; i--) {
      const b = bumpBursts[i];
      b.life -= dt;
      if (b.life <= 0) {
        scn.remove(b.points);
        b.geom.dispose();
        bumpBursts.splice(i, 1);
        continue;
      }
      const posAttr = b.geom.getAttribute('position');
      const arr = posAttr.array;
      for (let j = 0; j < b.velocities.length; j++) {
        const v = b.velocities[j];
        v.vy -= 9.8 * dt;
        arr[j * 3] += v.vx * dt;
        arr[j * 3 + 1] = Math.max(0.1, arr[j * 3 + 1] + v.vy * dt);
        arr[j * 3 + 2] += v.vz * dt;
      }
      posAttr.needsUpdate = true;
      b.points.material.opacity = Math.max(0, b.life / 0.60);
    }

    // Cart-vs-Cart bouncy bumper collisions
    checkCartCartCollisions(dt);

    // Cart physics & mesh animation for unoccupied and occupied carts
    carts.forEach((c) => {
      if (!c.isOccupied) {
        // Decay bounce recoil
        c.bounceVx *= Math.max(0, 1.0 - dt * 6.5);
        c.bounceVz *= Math.max(0, 1.0 - dt * 6.5);
        c.bouncePitch *= Math.max(0, 1.0 - dt * 8.0);
        c.bounceRoll *= Math.max(0, 1.0 - dt * 8.0);
        c.bounceSpring *= Math.max(0, 1.0 - dt * 9.0);

        const vx = Math.sin(c.rotY) * c.speed + c.bounceVx;
        const vz = Math.cos(c.rotY) * c.speed + c.bounceVz;
        const curSpeedMag = Math.hypot(vx, vz);

        if (curSpeedMag > 0.02) {
          c.speed *= Math.max(0, 1.0 - dt * 6.0);
          const rawNext = {
            x: c.pos.x + vx * dt,
            z: c.pos.z + vz * dt
          };
          const resolved = resolveMove(c.pos, rawNext, true, 0.92);
          if (resolved) {
            c.pos.x = resolved.x;
            c.pos.z = resolved.z;
          }
          c.wheelRotation += (curSpeedMag * dt) / 0.10;
          c.wheelMeshes.forEach((w) => { w.rotation.x = c.wheelRotation; });
        } else {
          c.speed = 0;
        }
        c.steerAngle *= Math.max(0, 1.0 - dt * 8.0);
        c.rollAngle *= Math.max(0, 1.0 - dt * 10.0);
        const bounceHopY = Math.abs(Math.sin(c.bounceSpring * Math.PI)) * 0.05;
        c.mesh.position.set(c.pos.x, bounceHopY, c.pos.z);
        c.mesh.rotation.x = c.bouncePitch;
        c.mesh.rotation.y = c.rotY;
        c.mesh.rotation.z = c.rollAngle + c.bounceRoll;
      }
    });

    if (occupiedCart) {
      const bounceHopY = Math.abs(Math.sin(occupiedCart.bounceSpring * Math.PI)) * 0.05;
      if (playerPos) {
        playerPos.set(occupiedCart.pos.x, 0.38 + bounceHopY, occupiedCart.pos.z);
      }
      if (playerMesh) {
        playerMesh.position.set(occupiedCart.pos.x, 0.38 + bounceHopY, occupiedCart.pos.z);
        playerMesh.rotation.order = 'XYZ';
        playerMesh.rotation.set(
          occupiedCart.bouncePitch * 0.65,
          occupiedCart.rotY,
          occupiedCart.rollAngle + occupiedCart.bounceRoll * 0.65
        );
      }
    }
  }

  // Furniture obstacles with exact bounds for smooth AABB sliding collision
  const FURNITURE_OBSTACLES = [
    // Table 1 (Back)
    { minX: -1.6, maxX: 1.6, minZ: -10.0, maxZ: -8.0, topY: 1.25 },
    // Chairs 1
    { minX: -1.2, maxX: 1.2, minZ: -5.7, maxZ: -3.3, topY: 0.95 },
    // Table 2 (Center)
    { minX: -1.6, maxX: 1.6, minZ: -1.0, maxZ: 1.0, topY: 1.25 },
    // Chairs 2
    { minX: -1.2, maxX: 1.2, minZ: 3.3, maxZ: 5.7, topY: 0.95 },
    // Table 3 (Front)
    { minX: -1.6, maxX: 1.6, minZ: 8.0, maxZ: 10.0, topY: 1.25 },
    // Master Washer Cabinet Flanking Left & Right (outside door opening)
    { minX: -2.4, maxX: -1.2, minZ: -18.6, maxZ: -15.0, topY: 4.2 },
    { minX: 1.2, maxX: 2.4, minZ: -18.6, maxZ: -15.0, topY: 4.2 }
  ];

  function getFloorHeight(x, z, y = 0) {
    // Inside giant washer drum
    if (Math.abs(x - masterWasher.x) <= 1.4 && z >= masterWasher.z - 1.4 && z <= masterWasher.z + 1.4) {
      return 0.45;
    }
    // Folding table surfaces in center spine (Z = -9, 0, +9)
    if (Math.abs(x) <= 1.6) {
      if (Math.abs(z - (-9.0)) <= 1.0 || Math.abs(z - 0.0) <= 1.0 || Math.abs(z - 9.0) <= 1.0) {
        if (y >= 0.8) return 1.25;
      }
    }
    // Chair seats in center spine (Z = -4.5, +4.5)
    if (Math.abs(x) <= 1.2) {
      if (Math.abs(z - (-4.5)) <= 1.35 || Math.abs(z - 4.5) <= 1.35) {
        if (y >= 0.38) return 0.58;
      }
    }
    // Tops of commercial washers / dryers along walls
    if ((x < -7.8 || x > 7.8) && z > -17.0 && z < 11.5) {
      if (y >= 1.8) return 2.3;
    }
    return 0.0;
  }

  function resolveMove(current, next, isGrounded, customRadius = null) {
    let nx = next.x;
    let nz = next.z;

    // Room boundaries (walkable room is X: -8.8 to +8.8, Z: -17.8 to +17.8)
    const minX = -8.8;
    const maxX = 8.8;
    const minZ = -17.8;
    const maxZ = 17.8;

    nx = Math.max(minX, Math.min(maxX, nx));
    nz = Math.max(minZ, Math.min(maxZ, nz));

    // Master Washer Door: When cycle is active or door is closed, prevent walking into drum
    if (masterWasher.cycleActive && nz < -15.0 && Math.abs(nx - masterWasher.x) < 1.4) {
      nz = Math.max(nz, -14.9);
    }

    // AABB Sliding Collision:
    // When walking on floor, resolve X and Z separately so player slides smoothly along table and chair edges!
    const curY = current.y || 0;
    const radius = (typeof customRadius === 'number') ? customRadius : 0.35;

    // 1. Resolve X movement
    let canMoveX = true;
    for (const obs of FURNITURE_OBSTACLES) {
      if (curY < obs.topY - 0.25) {
        const inX = (nx + radius > obs.minX) && (nx - radius < obs.maxX);
        const inZ = (current.z + radius > obs.minZ) && (current.z - radius < obs.maxZ);
        if (inX && inZ) {
          canMoveX = false;
          break;
        }
      }
    }
    if (!canMoveX) nx = current.x;

    // 2. Resolve Z movement
    let canMoveZ = true;
    for (const obs of FURNITURE_OBSTACLES) {
      if (curY < obs.topY - 0.25) {
        const inX = (nx + radius > obs.minX) && (nx - radius < obs.maxX);
        const inZ = (nz + radius > obs.minZ) && (nz - radius < obs.maxZ);
        if (inX && inZ) {
          canMoveZ = false;
          break;
        }
      }
    }
    if (!canMoveZ) nz = current.z;

    return { x: nx, z: nz };
  }

  function getInteractables(p) {
    const out = [];

    // 0. Active Occupied Laundry Cart Dismount
    if (occupiedCart) {
      out.push({
        kind: 'laundromat_cart_dismount',
        dist: 0,
        prompt: `Hop Off Laundry Cart (${occupiedCart.name}) [Space / E] 🛒`
      });
      return out;
    }

    // Mountable Laundry Carts along the aisles
    carts.forEach((cart) => {
      if (!cart.isOccupied) {
        const dCart = Math.hypot(p.x - cart.pos.x, p.z - cart.pos.z);
        if (dCart < 2.6) {
          out.push({
            kind: 'laundromat_cart_mount',
            cartId: cart.id,
            dist: dCart,
            prompt: `Hop in Laundry Cart (${cart.name})! [E] 🛒💨`
          });
        }
      }
    });

    // 1. Giant Master Washer #7
    const dWasher = Math.hypot(p.x - masterWasher.x, p.z - (masterWasher.z + 0.8));
    if (dWasher < 3.4) {
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

    // 2. Token & Quarter Change Machine (Front Left)
    const dTokens = Math.hypot(p.x - (-8.2), p.z - 16.0);
    if (dTokens < 2.8) {
      out.push({
        kind: 'laundromat_tokens',
        dist: dTokens,
        prompt: 'Change Machine: Insert Dollar for Shiny Laundry Tokens [E] 🪙'
      });
    }

    // 3. Vending Machine (Front Left)
    const dVending = Math.hypot(p.x - (-8.2), p.z - 12.5);
    if (dVending < 2.8) {
      out.push({
        kind: 'laundromat_vending',
        dist: dVending,
        prompt: 'Vending Machine: Buy Lavender Fluff & Scented Breb [E] 🌸'
      });
    }

    // 4. Return Portal (Front Center)
    const dPortal = Math.hypot(p.x - 0.0, p.z - 16.8);
    if (dPortal < 4.2) {
      out.push({
        kind: 'laundromat_return',
        dist: dPortal,
        prompt: 'Return through Portal to Blåhaj Island [E] 🌀'
      });
    }

    // 5. Wall-Mounted Gallery Artwork Posters
    POSTERS.forEach((poster) => {
      const dPoster = Math.hypot(p.x - poster.x, p.z - poster.z);
      if (dPoster < 3.0) {
        out.push({
          kind: 'laundromat_poster',
          dist: dPoster,
          posterId: poster.id,
          title: poster.title,
          src: poster.src,
          desc: poster.desc,
          prompt: `Examine Poster: "${poster.title}" [E] 🖼️`
        });
      }
    });

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
    getCeilingY: () => 5.2,
    getInteractables,
    startSpinCycle,
    isSpinCycleActive: () => masterWasher.cycleActive,
    getPosters: () => POSTERS,
    getCarts: () => carts,
    getOccupiedCart: () => occupiedCart,
    checkCartCartCollisions,
    spawnCartBumpParticles,
    mountCart,
    dismountCart,
    updateOccupiedCart
  };
})();
