// ============================================================================
// BLÅHAJ ISLAND — AUTHENTIC SCULPTED 3D BLÅHAJ, BIRBS, FISHES & CARROTS
// ============================================================================

window.BlahajModels = (function () {
  let plushBumpTex = null;

  // High-resolution 512x512 tactile woven plush & micro-fleece bump texture
  function getPlushTexture() {
    if (plushBumpTex) return plushBumpTex;
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, 512, 512);

    for (let i = 0; i < 34000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const v = 90 + Math.floor(Math.random() * 84);
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(x, y, 1.4, 4.5);
    }

    plushBumpTex = new THREE.CanvasTexture(canvas);
    plushBumpTex.wrapS = THREE.RepeatWrapping;
    plushBumpTex.wrapT = THREE.RepeatWrapping;
    plushBumpTex.repeat.set(7, 7);
    return plushBumpTex;
  }

  function createPlushMaterial(hexColor, useVertexColors = false) {
    const mat = new THREE.MeshStandardMaterial({
      color: useVertexColors ? 0xffffff : hexColor,
      vertexColors: useVertexColors,
      roughness: 0.86,
      metalness: 0.01,
      bumpMap: getPlushTexture(),
      bumpScale: 0.055,
      side: THREE.DoubleSide
    });

    mat.onBeforeCompile = (shader) => {
      shader.vertexShader =
        `varying vec3 vPlushObjPos;\n` +
        shader.vertexShader.replace(
          '#include <begin_vertex>',
          `
          #include <begin_vertex>
          vPlushObjPos = position;
          `
        );

      shader.fragmentShader =
        `varying vec3 vPlushObjPos;\n` +
        shader.fragmentShader.replace(
          '#include <dithering_fragment>',
          `
          vec3 viewDir = normalize(vViewPosition);
          float ndotv = clamp(abs(dot(normal, viewDir)), 0.0, 1.0);

          // High-frequency 3D plush micro-tuft fiber grain across the entire shark surface
          float tuft1 = sin(vPlushObjPos.x * 125.0 + vPlushObjPos.y * 45.0) * cos(vPlushObjPos.y * 140.0 - vPlushObjPos.z * 55.0);
          float tuft2 = sin(vPlushObjPos.z * 135.0 - vPlushObjPos.x * 60.0) * cos(vPlushObjPos.x * 110.0 + vPlushObjPos.y * 95.0);
          float fiberNoise = (tuft1 + tuft2) * 0.5;

          // Velvet grazing sheen + sparkly fuzzy silhouette rim (like real IKEA Blåhaj plush pile!)
          float velvetSheen = pow(1.0 - ndotv, 1.85);
          float sharpFuzzyRim = pow(1.0 - ndotv, 3.4);
          float fuzzyEdgeTufts = 1.0 + fiberNoise * 0.38;

          // Surface micro-fleece texture modulation
          gl_FragColor.rgb *= (0.96 + fiberNoise * 0.075);

          // Soft plush-colored velvet wrap + bright fuzzy rim halo catching the light
          vec3 plushTint = normalize(gl_FragColor.rgb + vec3(0.18, 0.28, 0.38));
          vec3 velvetColor = mix(gl_FragColor.rgb, vec3(0.84, 0.93, 1.0), 0.52);
          gl_FragColor.rgb += velvetColor * velvetSheen * 0.42 * fuzzyEdgeTufts;
          gl_FragColor.rgb += (plushTint * 0.5 + vec3(0.96, 0.94, 0.90) * 0.5) * sharpFuzzyRim * 0.58 * fuzzyEdgeTufts;
          #include <dithering_fragment>
          `
        );
    };
    return mat;
  }

  // ==========================================================================
  // AUTHENTIC PLUSH BLÅHAJ PARAMETRIC LOFT (SEAMLESS ORGANIC BODY)
  // u in [0..1] runs along longitudinal axis from tail tip (z = -1.65) to blunt snout (z = +1.40).
  // Zero flat cuts, zero holes: naturally rounded closed poles at both ends.
  // ==========================================================================
  function evalPlushSharkStation(u, plump, mange) {
    const z = -1.65 + u * 3.05;

    let rx = 0;
    let ryTop = 0;
    let ryBot = 0;
    let yCenter = 0.85;

    // Mange factor softens the stuffing: slight cozy slump in the middle belly
    const slump = (mange || 0) * 0.055;

    if (u < 0.25) {
      // 1. Caudal Peduncle & Tail Base (u = 0..0.25, z = -1.65..-0.89)
      const t = u / 0.25;
      const taper = Math.sin(t * Math.PI * 0.5);
      rx = (0.025 + taper * 0.38) * plump;
      ryTop = 0.035 + taper * 0.44;
      ryBot = 0.035 + taper * 0.40;
      yCenter = 0.86 - t * 0.16;
    } else if (u < 0.70) {
      // 2. Main Abdomen, Belly & Spine (u = 0.25..0.70, z = -0.89..+0.48)
      const t = (u - 0.25) / 0.45;
      const bellyCurve = Math.sin(t * Math.PI);
      rx = (0.40 + bellyCurve * 0.40) * plump;
      ryTop = 0.47 + Math.sin(t * Math.PI * 0.85) * 0.33;
      ryBot = 0.43 + bellyCurve * 0.36 + slump;
      yCenter = 0.70 + Math.sin(t * Math.PI * 0.5) * 0.14 - slump * 0.45;
    } else if (u < 0.90) {
      // 3. Head & Cheeks (u = 0.70..0.90, z = +0.48..+1.09)
      const t = (u - 0.70) / 0.20;
      rx = (0.80 - t * 0.22) * plump;
      ryTop = 0.80 - t * 0.24;
      ryBot = 0.79 - t * 0.26;
      yCenter = 0.84 + t * 0.08;
    } else {
      // 4. Overhanging Blåhaj Snout (u = 0.90..1.0, z = +1.09..+1.40)
      const t = (u - 0.90) / 0.10;
      const noseCurve = Math.cos(t * Math.PI * 0.5);
      rx = (0.58 * Math.pow(noseCurve, 0.65)) * plump;
      ryTop = 0.56 * Math.pow(noseCurve, 0.70);
      ryBot = 0.53 * Math.pow(noseCurve, 0.75);
      yCenter = 0.92 - t * 0.04;
    }

    return { z, yCenter, rx, ryTop, ryBot };
  }

  function buildAuthenticBlahajBodyGeometry(plump, topColorHex, bellyColorHex, mange) {
    const rings = 56;
    const segs = 48;
    const positions = [];
    const colors = [];
    const uvs = [];
    const indices = [];

    const topCol = new THREE.Color(topColorHex || 0x2278c4);
    const bellyCol = new THREE.Color(bellyColorHex || 0xf5ecdc);
    const mouthCol = new THREE.Color(0x8a2434); // Soft crimson plush mouth interior
    const seamDarkCol = topCol.clone().multiplyScalar(0.78);

    for (let i = 0; i <= rings; i++) {
      const u = i / rings;
      const station = evalPlushSharkStation(u, plump, mange);

      for (let j = 0; j <= segs; j++) {
        const v = j / segs;
        const theta = v * Math.PI * 2; // 0 = top spine (+Y), PI/2 = left (+X), PI = belly (-Y), 3PI/2 = right (-X)
        const sinT = Math.sin(theta);
        const cosT = Math.cos(theta);

        let px = sinT * station.rx;
        let py = station.yCenter + (cosT >= 0 ? cosT * station.ryTop : cosT * station.ryBot);
        let pz = station.z;

        // Bottom belly flattening: cozy plush stuffing rests slightly wider on underside
        if (cosT < -0.15) {
          px *= (1.0 + 0.12 * Math.pow(Math.abs(sinT), 1.6));
        }

        // Closed poles at u = 0 (tail tip) and u = 1 (snout tip)
        if (i === 0) {
          px = 0;
          py = station.yCenter;
        } else if (i === rings) {
          px = 0;
          py = station.yCenter;
        }

        // Mouth cavity indentation on the underside of the snout (u = 0.83..0.94, belly side)
        let inMouth = false;
        if (u > 0.83 && u < 0.95 && cosT < -0.38) {
          const uMouth = (u - 0.89) / 0.06;
          const aMouth = (cosT + 0.38) / -0.62;
          const mDist = uMouth * uMouth + (1 - aMouth) * (1 - aMouth);
          if (mDist < 0.82) {
            inMouth = true;
            const indent = (1 - mDist / 0.82) * 0.11;
            py += indent;
            pz -= indent * 0.5;
          }
        }

        positions.push(px, py, pz);
        uvs.push(v * 3, u * 4);

        // Blåhaj Two-Tone Coloring with Hand-Stitched Seam Shading
        if (inMouth) {
          colors.push(mouthCol.r, mouthCol.g, mouthCol.b);
        } else {
          // Belly seam line sits at roughly cosT = 0.10 (lower ~42% of cross section is white belly)
          const seamDist = cosT - 0.10;
          if (seamDist < -0.06) {
            colors.push(bellyCol.r, bellyCol.g, bellyCol.b);
          } else if (seamDist > 0.06) {
            colors.push(topCol.r, topCol.g, topCol.b);
          } else {
            // Subtle darkened stitch seam along the fabric joint
            colors.push(seamDarkCol.r, seamDarkCol.g, seamDarkCol.b);
          }
        }
      }
    }

    for (let i = 0; i < rings; i++) {
      for (let j = 0; j < segs; j++) {
        const a = i * (segs + 1) + j;
        const b = a + segs + 1;
        indices.push(a, a + 1, b);
        indices.push(a + 1, b + 1, b);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }

  // ==========================================================================
  // AUTHENTIC PLUSH DORSAL FIN (SEAMLESSLY INTEGRATED ON TOP SPINE)
  // Sweeps upward and backward with iconic concave trailing edge.
  // ==========================================================================
  function buildAuthenticDorsalFinGeometry(plump, mange) {
    const geo = new THREE.BufferGeometry();
    const rows = 18;
    const cols = 12;
    const positions = [];
    const uvs = [];
    const indices = [];

    // Mange slump tilts the fin backward and slightly to the side (cozy floppy plush)
    const slumpZ = (mange || 0) * 0.12;
    const slumpX = (mange || 0) * 0.06;

    for (let r = 0; r <= rows; r++) {
      const u = r / rows; // 0 at spine base, 1 at rounded apex tip
      const baseZ = -0.06 - u * (0.34 + slumpZ);
      const y = 1.50 + u * 0.84;
      const chord = (0.60 * (1 - Math.pow(u, 1.25))) + 0.04;
      const th = 0.13 * (1 - u * 0.88);

      for (let c = 0; c <= cols; c++) {
        const v = c / cols;
        const ang = v * Math.PI * 2;
        const x = Math.sin(ang) * th * 0.5 + Math.pow(u, 1.8) * slumpX;
        const z = baseZ - (Math.cos(ang) * chord * 0.5);

        positions.push(x, y, z);
        uvs.push(v, u);
      }
    }

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const a = r * (cols + 1) + c;
        const b = a + cols + 1;
        indices.push(a, a + 1, b);
        indices.push(a + 1, b + 1, b);
      }
    }

    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }

  // ==========================================================================
  // AUTHENTIC PLUSH CAUDAL FIN (AUTHENTIC DUAL-LOBED SHARK TAIL)
  // Continuous with the caudal peduncle at z = -1.65.
  // Origin (0, 0, 0) is at the tail peduncle base (z = -1.65, y = 0.82)
  // so tailGroup pivot can rotate naturally during swim/walk animations.
  // ==========================================================================
  function buildAuthenticCaudalFinGeometry(plump, mange) {
    const geo = new THREE.BufferGeometry();
    const positions = [];
    const uvs = [];
    const indices = [];

    const lobes = [
      { yTip: 0.94, zTip: -0.71, th: 0.11, span: 0.85 }, // Upper lobe reaching up & back
      { yTip: -0.56, zTip: -0.47, th: 0.09, span: 0.58 } // Lower lobe reaching down & back
    ];

    let vOffset = 0;
    lobes.forEach((lb) => {
      const rows = 16;
      const cols = 10;
      for (let r = 0; r <= rows; r++) {
        const u = r / rows;
        const y = lb.yTip * u;
        const z = lb.zTip * u;
        const chord = 0.44 * (1 - u * 0.82) + 0.03;
        const th = lb.th * (1 - u * 0.80);

        for (let c = 0; c <= cols; c++) {
          const v = c / cols;
          const a = v * Math.PI * 2;
          const x = Math.sin(a) * th * 0.5;
          const pz = z + Math.cos(a) * chord * 0.5;
          positions.push(x, y, pz);
          uvs.push(v, u);
        }
      }

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const a = vOffset + r * (cols + 1) + c;
          const b = a + cols + 1;
          indices.push(a, a + 1, b);
          indices.push(a + 1, b + 1, b);
        }
      }
      vOffset += (rows + 1) * (cols + 1);
    });

    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }

  // ==========================================================================
  // AUTHENTIC PLUSH PECTORAL FIN (CUDDLY FLIPPERS)
  // Emerges smoothly from the side chest seam, sweeping back and downward.
  // ==========================================================================
  function buildAuthenticPectoralFinGeometry(side, plump, mange) {
    const geo = new THREE.BufferGeometry();
    const rows = 16;
    const cols = 12;
    const positions = [];
    const uvs = [];
    const indices = [];

    const droop = (mange || 0) * 0.10;

    for (let r = 0; r <= rows; r++) {
      const u = r / rows; // 0 at body base, 1 at rounded flipper tip
      const spanX = side * u * 0.76;
      const sweepZ = -u * 0.58;
      const curveY = -Math.pow(u, 1.4) * (0.28 + droop);
      const chord = 0.52 * (1 - u * 0.75) + 0.04;
      const th = 0.12 * (1 - u * 0.82);

      for (let c = 0; c <= cols; c++) {
        const v = c / cols;
        const a = v * Math.PI * 2;
        const x = spanX;
        const y = curveY + Math.sin(a) * th * 0.5;
        const z = sweepZ + Math.cos(a) * chord * 0.5;
        positions.push(x, y, z);
        uvs.push(u, v);
      }
    }

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const a = r * (cols + 1) + c;
        const b = a + cols + 1;
        indices.push(a, a + 1, b);
        indices.push(a + 1, b + 1, b);
      }
    }

    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }

  // ==========================================================================
  // CREATE HIGH-DETAIL 3D PLUSH SHARK (INTACT PLUSH SILHOUETTE + DYNAMIC MANGE FACTOR)
  // ==========================================================================
  function createPlushShark(config, mangeOverride = null) {
    const group = new THREE.Group();
    const scale = config.scale || 1.0;
    const plump = config.plumpness || 1.0;
    const mange = typeof mangeOverride === 'number'
      ? mangeOverride
      : (typeof config.mangeFactor === 'number'
          ? config.mangeFactor
          : (window.__BLAHAJ_MANGE__ !== undefined ? window.__BLAHAJ_MANGE__ : 0.70));

    const plushVertexMat = createPlushMaterial(config.bodyColor || 0x2278c4, true);
    const bodyMat = createPlushMaterial(config.bodyColor || 0x2278c4, false);
    const scarfMat = createPlushMaterial(config.scarfColor || 0x7c4d32, false);
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xd8aa5b,
      roughness: 0.26,
      metalness: 0.84
    });
    const threadMat = new THREE.MeshStandardMaterial({
      color: 0xe8dfd0,
      roughness: 0.9,
      metalness: 0.05
    });

    const rig = new THREE.Group();
    group.add(rig);

    // 1. Sculpted Seamless Plush Body (Authentic Blåhaj silhouette from snout to tail tip)
    const bodyGeo = buildAuthenticBlahajBodyGeometry(
      plump,
      config.bodyColor || 0x2278c4,
      config.bellyColor || 0xf5ecdc,
      mange
    );
    const bodyMesh = new THREE.Mesh(bodyGeo, plushVertexMat);
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    rig.add(bodyMesh);

    // 2. Integrated Swept Dorsal Fin
    const dorsalGeo = buildAuthenticDorsalFinGeometry(plump, mange);
    const dorsal = new THREE.Mesh(dorsalGeo, bodyMat);
    dorsal.castShadow = true;
    rig.add(dorsal);

    // 3. Tail Group with Authentic Heterocercal Dual-Lobe Caudal Flukes
    const tailGroup = new THREE.Group();
    tailGroup.position.set(0, 0.82, -1.65);
    const caudalGeo = buildAuthenticCaudalFinGeometry(plump, mange);
    const caudal = new THREE.Mesh(caudalGeo, bodyMat);
    caudal.castShadow = true;
    tailGroup.add(caudal);
    rig.add(tailGroup);

    // 4. Side Pectoral Flippers with Animated Pivots
    const leftFinPivot = new THREE.Group();
    leftFinPivot.position.set(0.68 * plump, 0.64, 0.35);
    const leftFinGeo = buildAuthenticPectoralFinGeometry(1, plump, mange);
    const leftFin = new THREE.Mesh(leftFinGeo, bodyMat);
    leftFin.castShadow = true;
    leftFinPivot.add(leftFin);
    rig.add(leftFinPivot);

    const rightFinPivot = new THREE.Group();
    rightFinPivot.position.set(-0.68 * plump, 0.64, 0.35);
    const rightFinGeo = buildAuthenticPectoralFinGeometry(-1, plump, mange);
    const rightFin = new THREE.Mesh(rightFinGeo, bodyMat);
    rightFin.castShadow = true;
    rightFinPivot.add(rightFin);
    rig.add(rightFinPivot);

    // 5. White Felt Zig-Zag Teeth along the Underside Mouth Cavity
    const toothMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });
    for (let t = -4; t <= 4; t++) {
      const frac = t / 4;
      const angle = frac * 0.82;
      const isSolomonSnaggle = config.protrudingTooth && t === 2;
      const tx = Math.sin(angle) * 0.40 * plump;
      const tz = 1.06 + Math.cos(angle) * 0.22;
      const ty = 0.53 - Math.abs(frac) * 0.02;

      const toothGeo = new THREE.ConeGeometry(
        isSolomonSnaggle ? 0.055 : 0.038,
        isSolomonSnaggle ? 0.17 : 0.09,
        8
      );
      const tooth = new THREE.Mesh(toothGeo, toothMat);
      tooth.position.set(tx, ty - (isSolomonSnaggle ? 0.04 : 0.02), tz + (isSolomonSnaggle ? 0.04 : 0.01));
      tooth.rotation.x = Math.PI + (isSolomonSnaggle ? 0.35 : 0.16);
      rig.add(tooth);
    }
    for (let t = -3; t <= 3; t++) {
      const frac = t / 3;
      const angle = frac * 0.70;
      const tx = Math.sin(angle) * 0.34 * plump;
      const tz = 0.98 + Math.cos(angle) * 0.18;
      const ty = 0.44 + Math.abs(frac) * 0.015;

      const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.075, 8), toothMat);
      tooth.position.set(tx, ty, tz);
      tooth.rotation.x = -0.20;
      rig.add(tooth);
    }

    // 6. Large Glossy Black Button Eyes with Catchlights & Stitched Rims
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x05070a, roughness: 0.08, metalness: 0.35 });
    const eyeRimMat = new THREE.MeshStandardMaterial({ color: 0x142234, roughness: 0.85 });
    const catchMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    [-1, 1].forEach((side) => {
      const eyeGroup = new THREE.Group();
      eyeGroup.position.set(side * 0.58 * plump, 1.15, 0.98);
      eyeGroup.lookAt(side * 1.5, 1.28, 1.35);

      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.022, 12, 24), eyeRimMat);
      eyeGroup.add(rim);

      const dome = new THREE.Mesh(new THREE.SphereGeometry(0.115, 20, 20), eyeMat);
      dome.scale.set(1.0, 1.0, 0.72);
      eyeGroup.add(dome);

      const glint1 = new THREE.Mesh(new THREE.SphereGeometry(0.036, 12, 12), catchMat);
      glint1.position.set(-0.032 * side, 0.036, 0.085);
      eyeGroup.add(glint1);

      const glint2 = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 10), catchMat);
      glint2.position.set(0.032 * side, -0.026, 0.085);
      eyeGroup.add(glint2);

      rig.add(eyeGroup);
    });

    if (config.beautySpot) {
      const spot = new THREE.Mesh(
        new THREE.SphereGeometry(0.038, 12, 12),
        new THREE.MeshBasicMaterial({ color: 0x140a12 })
      );
      spot.position.set(0.62 * plump, 1.02, 0.88);
      rig.add(spot);
    }

    // 7. Five Authentic Embroidered Curved Gill Seams on each flank
    const gillMat = new THREE.MeshStandardMaterial({ color: 0x162638, roughness: 0.9 });
    [-1, 1].forEach((side) => {
      for (let g = 0; g < 5; g++) {
        const gz = 0.72 - g * 0.085;
        const gy = 0.84 - g * 0.024;
        const gx = side * (0.69 * plump + g * 0.018);

        const gillGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.22, 8);
        const gill = new THREE.Mesh(gillGeo, gillMat);
        gill.position.set(gx, gy, gz);
        gill.rotation.z = side * 0.26;
        gill.rotation.y = side * 0.28;
        rig.add(gill);
      }
    });

    // 8. Soft Traveler Scarf / Collar Fitting Snugly Around Neck
    const scarfGroup = new THREE.Group();
    scarfGroup.position.set(0, 0.82, 0.22);
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.85 * plump, 0.12, 16, 32), scarfMat);
    collar.scale.set(1.0, 0.82, 1.0);
    collar.rotation.x = Math.PI / 2 + 0.06;
    collar.castShadow = true;
    scarfGroup.add(collar);

    const clasp = new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 1), brassMat);
    clasp.position.set(0, -0.02, 0.75 * plump);
    scarfGroup.add(clasp);
    rig.add(scarfGroup);

    // 9. DYNAMIC MANGE FACTOR DETAILS (VISIBLE STITCHES, MENDING PATCHES & THREADS)
    if (mange > 0.05) {
      const stitchGroup = new THREE.Group();

      // (a) Hand-sewn running stitches along the dorsal spine seam
      const spineStitchCount = Math.floor(4 + mange * 14);
      for (let s = 0; s < spineStitchCount; s++) {
        const u = 0.28 + (s / spineStitchCount) * 0.40;
        const station = evalPlushSharkStation(u, plump, mange);
        const stitch = new THREE.Mesh(
          new THREE.BoxGeometry(0.018, 0.025, 0.045),
          threadMat
        );
        stitch.position.set((s % 2 === 0 ? 0.01 : -0.01), station.yCenter + station.ryTop + 0.006, station.z);
        stitch.rotation.y = Math.sin(s * 1.7) * 0.22;
        stitchGroup.add(stitch);
      }

      // (b) Flank Mending Patch #1 (Denim / Tweed Patch with Cross-Stitches)
      if (mange > 0.32) {
        const patchGeo = new THREE.BoxGeometry(0.04, 0.28, 0.34);
        const patchMat = createPlushMaterial(0x567798, false);
        const patch = new THREE.Mesh(patchGeo, patchMat);
        patch.position.set(0.72 * plump, 0.88, -0.22);
        patch.rotation.y = 0.15;
        patch.rotation.z = -0.12;
        stitchGroup.add(patch);

        const corners = [
          [-0.10, -0.12],
          [-0.10, 0.12],
          [0.10, -0.12],
          [0.10, 0.12]
        ];
        corners.forEach(([dy, dz]) => {
          [-1, 1].forEach((cross) => {
            const leg = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.015, 0.06), threadMat);
            leg.position.set(0.74 * plump, 0.88 + dy, -0.22 + dz);
            leg.rotation.x = cross * 0.78;
            leg.rotation.y = 0.15;
            stitchGroup.add(leg);
          });
        });
      }

      // (c) Flank Mending Patch #2 (Weathered Vintage Burlap / Canvas Patch)
      if (mange > 0.62) {
        const patch2Geo = new THREE.BoxGeometry(0.04, 0.24, 0.26);
        const patch2Mat = createPlushMaterial(0x8a735c, false);
        const patch2 = new THREE.Mesh(patch2Geo, patch2Mat);
        patch2.position.set(-0.68 * plump, 0.80, -0.55);
        patch2.rotation.y = -0.18;
        patch2.rotation.z = 0.15;
        stitchGroup.add(patch2);

        const corners2 = [
          [-0.08, -0.09],
          [-0.08, 0.09],
          [0.08, -0.09],
          [0.08, 0.09]
        ];
        corners2.forEach(([dy, dz]) => {
          [-1, 1].forEach((cross) => {
            const leg = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.015, 0.05), threadMat);
            leg.position.set(-0.70 * plump, 0.80 + dy, -0.55 + dz);
            leg.rotation.x = cross * 0.78;
            leg.rotation.y = -0.18;
            stitchGroup.add(leg);
          });
        });
      }

      // (d) Loose dangling thread strands
      if (mange > 0.48) {
        const threadCurve = new THREE.Mesh(
          new THREE.CylinderGeometry(0.008, 0.008, 0.18, 6),
          threadMat
        );
        threadCurve.position.set(0.06, 1.58, -0.32);
        threadCurve.rotation.z = 0.6;
        threadCurve.rotation.x = 0.4;
        stitchGroup.add(threadCurve);

        const threadCurve2 = new THREE.Mesh(
          new THREE.CylinderGeometry(0.007, 0.007, 0.22, 6),
          threadMat
        );
        threadCurve2.position.set(-0.64 * plump, 0.62, 0.05);
        threadCurve2.rotation.z = -0.8;
        stitchGroup.add(threadCurve2);
      }

      rig.add(stitchGroup);
    }

    // 10. Character-Specific Relics, Hats & Tools
    if (config.id === 'hermes') {
      // Ornate Brass Between Lantern on left fin
      const lanternGroup = new THREE.Group();
      lanternGroup.position.set(0.75, -0.24, 0.22);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(0.20, 0.16, 12), brassMat);
      roof.position.y = 0.20;
      lanternGroup.add(roof);
      const bulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0xffd885 })
      );
      lanternGroup.add(bulb);
      const lanLight = new THREE.PointLight(0xffb85c, 1.1, 9);
      lanternGroup.add(lanLight);
      leftFinPivot.add(lanternGroup);
    } else if (config.id === 'solomon') {
      // Star-Chef Toque perched proudly on top of head
      const hatBand = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.36, 0.14, 28), scarfMat);
      hatBand.position.set(0, 1.54, 0.88);
      hatBand.rotation.x = -0.15;
      rig.add(hatBand);

      const hatCrown = new THREE.Mesh(
        new THREE.SphereGeometry(0.38, 24, 20),
        createPlushMaterial(0xf7f1e3)
      );
      hatCrown.scale.set(1.08, 0.85, 1.05);
      hatCrown.position.set(0, 1.72, 0.85);
      rig.add(hatCrown);

      // Golden Teapot on Brass Saucer
      const trayGroup = new THREE.Group();
      trayGroup.position.set(0.68, -0.06, 0.26);
      const saucer = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.24, 0.04, 20), brassMat);
      saucer.position.y = -0.14;
      trayGroup.add(saucer);
      const potBody = new THREE.Mesh(new THREE.SphereGeometry(0.19, 20, 18), brassMat);
      trayGroup.add(potBody);
      leftFinPivot.add(trayGroup);
    } else if (config.id === 'hiram') {
      // Builder Goggles on Forehead
      const lensMat = new THREE.MeshStandardMaterial({ color: 0x7dd3fc, roughness: 0.1, metalness: 0.6 });
      [-0.22, 0.22].forEach((gx) => {
        const gFrame = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.03, 12, 24), brassMat);
        gFrame.position.set(gx, 1.34, 1.05);
        gFrame.rotation.x = -0.28;
        rig.add(gFrame);
        const lens = new THREE.Mesh(new THREE.CircleGeometry(0.115, 20), lensMat);
        lens.position.copy(gFrame.position);
        lens.rotation.copy(gFrame.rotation);
        rig.add(lens);
      });

      // Sacred Allen Key on Left Fin
      const allenGroup = new THREE.Group();
      allenGroup.position.set(0.68, -0.08, 0.24);
      const hex1 = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.58, 6), brassMat);
      allenGroup.add(hex1);
      const hex2 = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.26, 6), brassMat);
      hex2.rotation.z = Math.PI / 2;
      hex2.position.set(0.11, 0.27, 0);
      allenGroup.add(hex2);
      leftFinPivot.add(allenGroup);
    } else if (config.id === 'nimue') {
      // Glowing Crystal Pendant on Chest
      const crystal = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.17, 0),
        new THREE.MeshBasicMaterial({ color: 0xd8b4fe })
      );
      crystal.position.set(0, 0.64, 0.95);
      rig.add(crystal);
      const cLight = new THREE.PointLight(0xc084fc, 0.85, 6);
      cLight.position.copy(crystal.position);
      rig.add(cLight);
    } else if (config.type === 'pink_shark') {
      // Plush Russian Ushanka of Vigilance Perched on Crown
      const ushMat = createPlushMaterial(0x543442, false);
      const badgeMat = new THREE.MeshBasicMaterial({ color: 0xf5cd79 });

      const ushCrown = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.46, 0.32, 24), ushMat);
      ushCrown.position.set(0, 1.54, 0.88);
      rig.add(ushCrown);

      const ushVisor = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.22, 0.14), ushMat);
      ushVisor.position.set(0, 1.54, 1.25);
      rig.add(ushVisor);

      [-0.44, 0.44].forEach((ex) => {
        const earFlap = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 14), ushMat);
        earFlap.scale.set(0.6, 1.4, 0.9);
        earFlap.position.set(ex, 1.38, 0.88);
        rig.add(earFlap);
      });

      const starBadge = new THREE.Mesh(new THREE.OctahedronGeometry(0.08, 0), badgeMat);
      starBadge.position.set(0, 1.55, 1.33);
      rig.add(starBadge);

      if (config.hasClipboard) {
        const board = new THREE.Mesh(
          new THREE.BoxGeometry(0.40, 0.52, 0.04),
          new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.75 })
        );
        board.position.set(-0.60, 0.02, 0.30);
        board.rotation.y = 0.4;
        rightFinPivot.add(board);
      }
    }

    group.scale.setScalar(scale);

    group.userData = {
      rig,
      leftFinPivot,
      rightFinPivot,
      tailGroup,
      baseY: 0,
      beepTimer: 0,
      hopTimer: 0,
      walkPhase: Math.random() * Math.PI * 2,
      mangeFactor: mange
    };

    return group;
  }

  // ==========================================================================
  // THE BIRBS OF BLÅHAJ ISLAND (PLUMP ROUND BIRBS THAT EAT BREB!)
  // ==========================================================================
  function createBirb(featherColor = 0x60a5fa) {
    const group = new THREE.Group();
    const rig = new THREE.Group();
    group.add(rig);

    const bodyMat = createPlushMaterial(featherColor, false);
    const bellyMat = createPlushMaterial(0xfaf5e8, false);
    const beakMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4 });
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.1 });

    // Round Borb/Birb Plush Body
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.38, 20, 18), bodyMat);
    body.scale.set(1.0, 0.92, 1.12);
    body.position.y = 0.42;
    body.castShadow = true;
    rig.add(body);

    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.31, 16, 14), bellyMat);
    belly.position.set(0, 0.38, 0.14);
    rig.add(belly);

    // Cute Conical Beak
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.18, 10), beakMat);
    beak.rotation.x = Math.PI / 2;
    beak.position.set(0, 0.46, 0.46);
    rig.add(beak);

    // Button Eyes
    [-0.16, 0.16].forEach((ex) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 10), eyeMat);
      eye.position.set(ex, 0.52, 0.35);
      rig.add(eye);
    });

    // Flapping Side Wings
    const leftWing = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10), bodyMat);
    leftWing.scale.set(0.35, 0.75, 1.2);
    leftWing.position.set(0.36, 0.42, 0);
    rig.add(leftWing);

    const rightWing = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10), bodyMat);
    rightWing.scale.set(0.35, 0.75, 1.2);
    rightWing.position.set(-0.36, 0.42, 0);
    rig.add(rightWing);

    // Little Tuft Crest on Head
    const crest = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.18, 8), bodyMat);
    crest.position.set(0, 0.82, 0.05);
    crest.rotation.x = -0.3;
    rig.add(crest);

    group.userData = {
      rig,
      leftWing,
      rightWing,
      hopPhase: Math.random() * Math.PI * 2,
      happyTimer: 0
    };
    return group;
  }

  // ==========================================================================
  // TROPICAL FISH & STRIPED BEACH BALLS FOR "THE WATER THAT DOTH NOT WET"
  // ==========================================================================
  function createTropicalFish(colorHex = 0xff7b38) {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.35, metalness: 0.15 });
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 12), mat);
    body.scale.set(0.45, 0.75, 1.45);
    group.add(body);

    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.35, 6), mat);
    tail.rotation.x = Math.PI / 2;
    tail.scale.set(0.3, 1.0, 1.0);
    tail.position.z = -0.45;
    group.add(tail);

    return group;
  }

  function createBeachBall(radius = 0.75) {
    // 6-panel colorful striped beach ball texture
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const stripeCols = ['#ef4444', '#ffffff', '#3b82f6', '#ffffff', '#f59e0b', '#ffffff'];
    const w = 256 / stripeCols.length;
    stripeCols.forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.fillRect(i * w, 0, w + 1, 128);
    });
    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.25, metalness: 0.05 });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 24, 20), mat);
    mesh.castShadow = true;
    return mesh;
  }

  // ==========================================================================
  // PLUSH BEACH CARROT & BEETROOT WAITER
  // ==========================================================================
  function createBeachCarrot(shortsColor) {
    const group = new THREE.Group();
    const rig = new THREE.Group();
    group.add(rig);

    const carrotMat = createPlushMaterial(0xe06726, false);
    const shortsMat = createPlushMaterial(shortsColor || 0x3b82f6, false);
    const leafMat = createPlushMaterial(0x3a8c40, false);

    const bodyGeo = new THREE.LatheGeometry(
      [
        new THREE.Vector2(0.02, 0.15),
        new THREE.Vector2(0.36, 0.35),
        new THREE.Vector2(0.48, 0.95),
        new THREE.Vector2(0.52, 1.55),
        new THREE.Vector2(0.42, 1.92),
        new THREE.Vector2(0.01, 2.04)
      ],
      28
    );
    const body = new THREE.Mesh(bodyGeo, carrotMat);
    body.castShadow = true;
    rig.add(body);

    const waist = new THREE.Mesh(new THREE.CylinderGeometry(0.51, 0.52, 0.44, 24), shortsMat);
    waist.position.y = 0.68;
    rig.add(waist);
    [-0.2, 0.2].forEach((lx) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.22, 0.35, 18), shortsMat);
      leg.position.set(lx, 0.38, 0);
      rig.add(leg);
      const foot = new THREE.Mesh(new THREE.SphereGeometry(0.19, 16, 14), carrotMat);
      foot.position.set(lx, 0.16, 0.04);
      rig.add(foot);
    });

    [-0.52, 0.52].forEach((ax) => {
      const arm = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 14), carrotMat);
      arm.scale.set(0.65, 1.85, 0.65);
      arm.position.set(ax, 1.22, 0.04);
      arm.rotation.z = ax > 0 ? -0.25 : 0.25;
      rig.add(arm);
    });

    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const frond = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.62, 12), leafMat);
      frond.position.set(Math.cos(a) * 0.12, 2.24, Math.sin(a) * 0.12);
      frond.rotation.z = -Math.cos(a) * 0.38;
      frond.rotation.x = Math.sin(a) * 0.38;
      rig.add(frond);
    }

    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x0b0f18, roughness: 0.1 });
    [-0.16, 0.16].forEach((x) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.056, 14, 14), eyeMat);
      eye.position.set(x, 1.56, 0.51);
      rig.add(eye);
    });

    group.userData = { rig, walkPhase: Math.random() * 6 };
    return group;
  }

  function createBeetrootServer() {
    const group = new THREE.Group();
    const rig = new THREE.Group();
    group.add(rig);

    const beetMat = createPlushMaterial(0x6e1a39, false);
    const apronMat = createPlushMaterial(0xebe1ce, false);
    const leafMat = createPlushMaterial(0x367d3b, false);

    const beetGeo = new THREE.LatheGeometry(
      [
        new THREE.Vector2(0.05, 0.1),
        new THREE.Vector2(0.55, 0.45),
        new THREE.Vector2(1.02, 1.25),
        new THREE.Vector2(0.98, 1.95),
        new THREE.Vector2(0.65, 2.52),
        new THREE.Vector2(0.22, 2.78),
        new THREE.Vector2(0.01, 2.85)
      ],
      32
    );
    const body = new THREE.Mesh(beetGeo, beetMat);
    body.castShadow = true;
    rig.add(body);

    const apron = new THREE.Mesh(
      new THREE.CylinderGeometry(0.92, 1.03, 1.38, 28, 1, false, -1.15, 2.3),
      apronMat
    );
    apron.position.set(0, 1.22, 0.04);
    rig.add(apron);

    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      const stem = new THREE.Mesh(new THREE.ConeGeometry(0.24, 1.05, 14), leafMat);
      stem.position.set(Math.cos(a) * 0.2, 3.18, Math.sin(a) * 0.2);
      stem.rotation.z = -Math.cos(a) * 0.42;
      stem.rotation.x = Math.sin(a) * 0.42;
      rig.add(stem);
    }

    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x090b10, roughness: 0.1 });
    [-0.28, 0.28].forEach((x) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.088, 16, 16), eyeMat);
      eye.position.set(x, 1.92, 0.96);
      rig.add(eye);
    });

    group.userData = { rig, walkPhase: 0 };
    return group;
  }

  function animateShark(mesh, dt, isMoving, time) {
    if (!mesh || !mesh.userData || !mesh.userData.rig) return;
    const ud = mesh.userData;
    const rig = ud.rig;

    if (isMoving) {
      ud.walkPhase += dt * 10.5;
      rig.position.y = Math.abs(Math.sin(ud.walkPhase)) * 0.22;
      rig.rotation.z = Math.sin(ud.walkPhase) * 0.085;
      if (ud.leftFinPivot && ud.rightFinPivot) {
        ud.leftFinPivot.rotation.z = Math.sin(ud.walkPhase) * 0.32;
        ud.rightFinPivot.rotation.z = -Math.sin(ud.walkPhase) * 0.32;
      }
      if (ud.tailGroup) {
        ud.tailGroup.rotation.y = Math.sin(ud.walkPhase * 1.2) * 0.28;
      }
    } else {
      const idleWave = Math.sin(time * 2.2 + ud.walkPhase);
      rig.position.y = idleWave * 0.045;
      rig.rotation.z = idleWave * 0.022;
      if (ud.leftFinPivot && ud.rightFinPivot) {
        ud.leftFinPivot.rotation.z = idleWave * 0.08;
        ud.rightFinPivot.rotation.z = -idleWave * 0.08;
      }
      if (ud.tailGroup) {
        ud.tailGroup.rotation.y = Math.sin(time * 1.6 + ud.walkPhase) * 0.12;
      }
    }

    if (ud.flipTimer > 0) {
      ud.flipTimer = Math.max(0, ud.flipTimer - dt);
      const flipProgress = 1 - ud.flipTimer / 0.45;
      rig.rotation.x = Math.sin(flipProgress * Math.PI * 2) * 0.75;
      if (ud.tailGroup) {
        ud.tailGroup.rotation.y = Math.sin(flipProgress * Math.PI * 4) * 0.45;
      }
    } else if (ud.beepTimer > 0) {
      ud.beepTimer = Math.max(0, ud.beepTimer - dt);
      const p = Math.sin((1 - ud.beepTimer / 0.9) * Math.PI);
      if (ud.leftFinPivot && ud.rightFinPivot) {
        ud.leftFinPivot.rotation.y = p * 0.95;
        ud.leftFinPivot.rotation.z = p * 0.55;
        ud.rightFinPivot.rotation.y = -p * 0.95;
        ud.rightFinPivot.rotation.z = -p * 0.55;
      }
      rig.rotation.x = p * 0.18;
    } else {
      rig.rotation.x = 0;
      if (ud.leftFinPivot && ud.rightFinPivot) {
        ud.leftFinPivot.rotation.y = 0;
        ud.rightFinPivot.rotation.y = 0;
      }
    }
  }

  return {
    createPlushShark,
    createBirb,
    createTropicalFish,
    createBeachBall,
    createBeachCarrot,
    createBeetrootServer,
    animateShark
  };
})();
