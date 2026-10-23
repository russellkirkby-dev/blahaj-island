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
  const START = { x: 0.0, y: 0.0, z: 15.0, rotY: Math.PI };

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
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xd8d8d8, roughness: 0.15, metalness: 0.88 });
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xd4a559, roughness: 0.28, metalness: 0.85 });

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

      // Center divider bar
      const divider = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 1.1, 2.8),
        new THREE.MeshStandardMaterial({ color: 0x223242, roughness: 0.5 })
      );
      divider.position.set(0, 0.65, 0);
      cg.add(divider);

      // 3 Chairs facing Left (West towards washers)
      [-1.0, 0.0, 1.0].forEach((zOff, i) => {
        const chair = new THREE.Group();
        chair.position.set(-0.65, 0, zOff);
        chair.rotation.y = -Math.PI / 2;

        const col = chairColors[i % chairColors.length];
        const seat = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.09, 0.68), new THREE.MeshStandardMaterial({ color: col, roughness: 0.4 }));
        seat.position.y = 0.65;
        chair.add(seat);

        const back = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.72, 0.08), new THREE.MeshStandardMaterial({ color: col, roughness: 0.4 }));
        back.position.set(0, 1.05, 0.32);
        chair.add(back);

        cg.add(chair);
      });

      // 3 Chairs facing Right (East towards dryers)
      [-1.0, 0.0, 1.0].forEach((zOff, i) => {
        const chair = new THREE.Group();
        chair.position.set(0.65, 0, zOff);
        chair.rotation.y = Math.PI / 2;

        const col = chairColors[(i + 1) % chairColors.length];
        const seat = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.09, 0.68), new THREE.MeshStandardMaterial({ color: col, roughness: 0.4 }));
        seat.position.y = 0.65;
        chair.add(seat);

        const back = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.72, 0.08), new THREE.MeshStandardMaterial({ color: col, roughness: 0.4 }));
        back.position.set(0, 1.05, 0.32);
        chair.add(back);

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
    // Return Portal centered near the front cosmic window
    const portalGroup = new THREE.Group();
    portalGroup.position.set(0, 0, 16.8);

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

    const portalLight = new THREE.PointLight(0x52f29c, 1.5, 8.0);
    portalLight.position.set(0, 1.5, 0);
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

    // 11. ROLLING WIRE LAUNDRY CARTS (Parked along the aisles)
    [
      { x: -5.0, z: 12.0 },
      { x: 5.0, z: -11.0 }
    ].forEach((cp) => {
      const cart = new THREE.Group();
      cart.position.set(cp.x, 0, cp.z);

      const basket = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.0, 1.0), new THREE.MeshStandardMaterial({ color: 0xb0b8c0, wireframe: true }));
      basket.position.y = 0.95;
      cart.add(basket);

      const towels = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.6, 0.8), new THREE.MeshStandardMaterial({ color: 0x76b5c5, roughness: 0.8 }));
      towels.position.y = 0.8;
      cart.add(towels);
      scn.add(cart);
    });

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
  }

  function getFloorHeight(x, z, y) {
    // Inside giant washer drum
    if (Math.abs(x - masterWasher.x) <= 1.4 && z >= masterWasher.z - 1.4 && z <= masterWasher.z + 1.4) {
      return 0.45;
    }
    // Folding table surfaces in center spine (Z = -9, 0, +9)
    if (Math.abs(x) <= 1.6) {
      if (Math.abs(z - (-9.0)) <= 1.0 || Math.abs(z - 0.0) <= 1.0 || Math.abs(z - 9.0) <= 1.0) {
        if (y >= 1.0) return 1.25;
      }
    }
    // Tops of commercial washers / dryers along walls
    if ((x < -7.8 || x > 7.8) && z > -17.0 && z < 11.5) {
      if (y >= 1.8) return 2.3;
    }
    return 0.0;
  }

  function resolveMove(current, next, isGrounded) {
    let nx = next.x;
    let nz = next.z;

    // Outer Room Boundaries: 20m wide x 38m deep
    const minX = -9.2;
    const maxX = 9.2;
    const minZ = -18.2;
    const maxZ = 18.2;

    nx = Math.max(minX, Math.min(maxX, nx));
    nz = Math.max(minZ, Math.min(maxZ, nz));

    // Master Washer Front & Cabinet Collision at far back wall
    const mwXMin = masterWasher.x - 2.4;
    const mwXMax = masterWasher.x + 2.4;
    const mwZFront = masterWasher.z + 1.8;
    const mwZBack = masterWasher.z - 1.8;

    if (nx > mwXMin && nx < mwXMax && nz > mwZBack && nz < mwZFront) {
      if (masterWasher.cycleActive || Math.abs(nx - masterWasher.x) > 1.2) {
        if (current.z >= mwZFront) nz = Math.max(nz, mwZFront + 0.1);
      }
    }

    // Center Island Collision Deflection (Spine at X: -1.7 to +1.7, Z: -10.5 to +10.5)
    // When on the floor, deflecting around the central island keeps the loop track wide and clear!
    if (Math.abs(nx) < 1.65 && nz > -10.5 && nz < 10.5) {
      if (current.x <= -1.65) nx = -1.65;
      else if (current.x >= 1.65) nx = 1.65;
      else if (current.z <= -10.5) nz = -10.5;
      else if (current.z >= 10.5) nz = 10.5;
    }

    return { x: nx, z: nz };
  }

  function getInteractables(p) {
    const out = [];

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
    if (dPortal < 3.2) {
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
    getPosters: () => POSTERS
  };
})();
