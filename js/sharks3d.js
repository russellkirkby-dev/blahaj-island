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

  function createPlushMaterial(hexColor, useVertexColors = false, mange = 0) {
    const mangeVal = typeof mange === 'number' ? Math.max(0, Math.min(1.0, mange)) : 0;
    // Base roughness increases slightly with mange as plush pile wears out
    const baseRoughness = 0.85 + mangeVal * 0.10;
    const mat = new THREE.MeshStandardMaterial({
      color: useVertexColors ? 0xffffff : hexColor,
      vertexColors: useVertexColors,
      roughness: baseRoughness,
      metalness: 0.01,
      bumpMap: getPlushTexture(),
      bumpScale: 0.055 * (1.0 - mangeVal * 0.35), // Bump flattens where plush pile is worn down
      side: THREE.DoubleSide
    });

    // Uniform holder shared across JS and GLSL (never triggers shader recompilation!)
    mat.userData.uMange = { value: mangeVal };

    // Static program cache key so Three.js compiles this shader ONCE and reuses it for all mange levels!
    mat.customProgramCacheKey = () => `plush_mat_${useVertexColors ? 'vtx' : hexColor}`;

    mat.onBeforeCompile = (shader) => {
      // Connect uniform to material's uniform holder
      shader.uniforms.uMange = mat.userData.uMange;

      shader.vertexShader =
        `varying vec3 vPlushObjPos;
` +
        shader.vertexShader.replace(
          '#include <begin_vertex>',
          `
          #include <begin_vertex>
          vPlushObjPos = position;
          `
        );

      shader.fragmentShader =
        `varying vec3 vPlushObjPos;
` +
        `uniform float uMange;
` +
        shader.fragmentShader.replace(
          '#include <dithering_fragment>',
          `
          vec3 viewDir = normalize(vViewPosition);
          float ndotv = clamp(abs(dot(normal, viewDir)), 0.0, 1.0);

          // High-frequency 3D plush micro-tuft fiber grain across the entire shark surface
          float tuft1 = sin(vPlushObjPos.x * 125.0 + vPlushObjPos.y * 45.0) * cos(vPlushObjPos.y * 140.0 - vPlushObjPos.z * 55.0);
          float tuft2 = sin(vPlushObjPos.z * 135.0 - vPlushObjPos.x * 60.0) * cos(vPlushObjPos.x * 110.0 + vPlushObjPos.y * 95.0);
          float fiberNoise = (tuft1 + tuft2) * 0.5;

          // Velvet grazing sheen + sparkly fuzzy silhouette rim (real plush pile)
          // Matted down and weathered as mange increases
          float sheenDamp = 1.0 - uMange * 0.68;
          float velvetSheen = pow(1.0 - ndotv, 1.85) * sheenDamp;
          float sharpFuzzyRim = pow(1.0 - ndotv, 3.4) * sheenDamp;
          float fuzzyEdgeTufts = 1.0 + fiberNoise * 0.38;

          // Surface micro-fleece texture modulation
          gl_FragColor.rgb *= (0.96 + fiberNoise * 0.075);

          // Soft plush-colored velvet wrap + bright fuzzy rim halo catching the light
          vec3 plushTint = normalize(gl_FragColor.rgb + vec3(0.18, 0.28, 0.38));
          vec3 velvetColor = mix(gl_FragColor.rgb, vec3(0.84, 0.93, 1.0), 0.52);
          gl_FragColor.rgb += velvetColor * velvetSheen * 0.42 * fuzzyEdgeTufts;
          gl_FragColor.rgb += (plushTint * 0.5 + vec3(0.96, 0.94, 0.90) * 0.5) * sharpFuzzyRim * 0.58 * fuzzyEdgeTufts;

          // --- PROCEDURAL DIRT, TEA STAINS, SOOT & GROUND PATINA ---
          // 1. Ground contact mud / floor dust (rising smoothly from base cushion)
          float groundHeight = clamp((vPlushObjPos.y - 0.14) / 0.95, 0.0, 1.0);
          float groundTurb = sin(vPlushObjPos.x * 2.8 + vPlushObjPos.z * 2.4) * 0.08 + cos(vPlushObjPos.z * 3.5) * 0.06;
          float groundMud = clamp(pow(1.0 - groundHeight, 1.4) + groundTurb, 0.0, 1.0);

          // 2. Large organic tea / juice spill on the chest/belly (broad, non-periodic)
          vec3 spillCenter = vec3(0.14, 1.05, 0.48);
          float distSpill = length(vPlushObjPos - spillCenter);
          float spillWarp = sin(vPlushObjPos.y * 6.0 + vPlushObjPos.x * 5.0) * 0.08;
          float teaSpill = smoothstep(0.48 + spillWarp, 0.15, distSpill);

          // 3. Lower belly love-worn smudge
          vec3 smudgeCenter = vec3(-0.16, 0.68, 0.44);
          float distSmudge = length(vPlushObjPos - smudgeCenter);
          float bellySmudge = smoothstep(0.42, 0.10, distSmudge);

          // 4. Snout tip rubbing & floor scuff
          float snoutDist = smoothstep(1.95, 2.50, vPlushObjPos.y) * smoothstep(0.30, 0.85, vPlushObjPos.z);
          float snoutWarp = cos(vPlushObjPos.x * 5.0 + vPlushObjPos.y * 4.0) * 0.05;
          float snoutGrime = clamp(snoutDist * 1.3 + snoutWarp, 0.0, 1.2);

          // 5. Soot / ash smudge across dorsal spine
          float spineDist = smoothstep(1.0, 2.2, vPlushObjPos.y) * smoothstep(0.1, -0.4, vPlushObjPos.z);
          float spineNoise = clamp(sin(vPlushObjPos.y * 4.2 + vPlushObjPos.x * 3.0), 0.0, 1.0);
          float sootSmudge = spineDist * spineNoise * 0.65;

          // Color grading for grime
          vec3 mudColor  = vec3(0.20, 0.15, 0.10); // Rich dark earthy floor mud
          vec3 teaColor  = vec3(0.50, 0.35, 0.20); // Warm dried tea / coffee spill
          vec3 sootColor = vec3(0.10, 0.09, 0.09); // Charcoal soot / ash
          vec3 noseColor = vec3(0.25, 0.20, 0.15); // Rubbed snout grime

          // Composite grime intensity driven by uMange
          float totalDirt = clamp((groundMud * 1.45 + teaSpill * 1.25 + bellySmudge * 0.95 + snoutGrime * 1.30 + sootSmudge * 1.05) * uMange, 0.0, 0.95);

          vec3 grimeCol = mix(mudColor, teaColor, clamp(teaSpill * 1.6, 0.0, 1.0));
          grimeCol = mix(grimeCol, noseColor, clamp(snoutGrime * 1.4, 0.0, 1.0));
          grimeCol = mix(grimeCol, sootColor, clamp(sootSmudge * 1.5, 0.0, 1.0));

          // Darken and tint fabric with grime
          gl_FragColor.rgb = mix(gl_FragColor.rgb, gl_FragColor.rgb * grimeCol * 2.1, totalDirt * 0.75);
          gl_FragColor.rgb = mix(gl_FragColor.rgb, grimeCol, totalDirt * 0.55);

          // Loved, sun-bleached plush desaturation
          float lum = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114));
          gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(lum), uMange * 0.32);

          #include <dithering_fragment>
          `
        );
    };
    return mat;
  }

  // ==========================================================================
  // AUTHENTIC UPRIGHT ANTHROPOMORPHIC PLUSH BLÅHAJ (SMOOTH & SEAMLESS)
  // s in [0..1] runs vertically from the rounded cushion base (y = 0.14) to the snout crown (y = 2.58).
  // Zero flat cuts, zero holes, zero piecewise derivative kinks: smooth cuddly plush silhouette!
  // ==========================================================================
  function evalUprightSharkStation(s, plump, mange) {
    const mangeVal = typeof mange === 'number' ? Math.max(0, Math.min(1.0, mange)) : 0;
    const slump = mangeVal * 0.06;

    // Smooth continuous base and top envelopes
    const tBot = Math.min(1.0, s / 0.18);
    const sinBot = Math.sin(tBot * Math.PI * 0.5);
    const tTop = Math.max(0.0, (s - 0.72) / 0.28);
    const cosTop = Math.cos(tTop * Math.PI * 0.5);

    // Height with soft rounded bottom hemisphere (s=0..0.18) and gentle top dome
    const y = 0.14 + (1.0 - Math.cos(s * Math.PI * 0.5)) * 0.24 + s * 2.18;

    const rBot = Math.sqrt(sinBot);
    const rTop = Math.pow(cosTop, 0.58);
    const envelope = rBot * rTop;

    // Width X: cuddly plush belly at s=0.35..0.50
    const bellyFat = Math.sin(s * Math.PI * 0.85) * 0.26;
    const widthX = (0.54 + bellyFat) * envelope * plump;

    // Snout forward overhang in Z (+Z): smooth protrusion for the iconic shark head
    const snoutT = Math.max(0.0, (s - 0.48) / 0.52);
    const snoutCurve = Math.sin(snoutT * Math.PI * 0.85);
    const centerZ = -0.04 + s * 0.06 + snoutCurve * 0.38;

    // Depth front (+Z) and back (-Z)
    const frontBelly = Math.sin(Math.min(1.0, s / 0.62) * Math.PI * 0.85) * 0.28;
    const depthFrontZ = (0.50 + frontBelly + slump) * envelope * plump;
    const depthBackZ = (0.52 + Math.sin(s * Math.PI * 0.75) * 0.18) * envelope * plump;

  


  return { y, centerZ, widthX, depthFrontZ, depthBackZ };
  }

  function buildAuthenticBlahajBodyGeometry(plump, topColorHex, bellyColorHex, mange) {
    const rings = 64;
    const segs = 48;
    const positions = [];
    const colors = [];
    const uvs = [];
    const indices = [];

    const mangeVal = typeof mange === 'number' ? Math.max(0, Math.min(1.0, mange)) : 0;

    // Base colors transition dynamically with mange:
    // Pristine: vibrant ocean blue (0x2278c4) and clean warm cream (0xfbf8f2)
    // High Mange: weathered dusty slate navy (0x354e68) and tea-stained aged linen (0xb29f84)
    const pristineTop = new THREE.Color(topColorHex || 0x2278c4);
    const weatheredTop = new THREE.Color(0x354e68);
    const topCol = pristineTop.clone().lerp(weatheredTop, mangeVal * 0.65);

    const pristineBelly = new THREE.Color(bellyColorHex || 0xfbf8f2);
    const weatheredBelly = new THREE.Color(0xb29f84);
    const bellyCol = pristineBelly.clone().lerp(weatheredBelly, mangeVal * 0.85);

    const mouthCol = new THREE.Color(0x8a2434); // Soft crimson plush mouth interior
    const cleanSeam = topCol.clone().multiplyScalar(0.78);
    const grimySeam = new THREE.Color(0x241d18);
    const seamDarkCol = cleanSeam.clone().lerp(grimySeam, mangeVal * 0.82);

    const groundMudCol = new THREE.Color(0x382c20); // Earthy ground dirt for bottom cushion

    for (let i = 0; i <= rings; i++) {
      const s = i / rings;
      const station = evalUprightSharkStation(s, plump, mange);

      for (let j = 0; j <= segs; j++) {
        const v = j / segs;
        const theta = v * Math.PI * 2; // 0 = front (+Z), PI/2 = right (+X), PI = back (-Z), 3PI/2 = left (-X)
        const sinT = Math.sin(theta);
        const cosT = Math.cos(theta);

        let px = sinT * station.widthX;
        let pz = station.centerZ + (cosT >= 0 ? cosT * station.depthFrontZ : cosT * station.depthBackZ);
        let py = station.y;

        // Closed poles at s = 0 (bottom cushion center) and s = 1 (top snout crown)
        if (i === 0) {
          px = 0;
          pz = station.centerZ;
        } else if (i === rings) {
          px = 0;
          pz = station.centerZ;
        }

        // Underside mouth smile cavity indentation under the snout overhang
        let inMouth = false;
        if (s > 0.68 && s < 0.76 && cosT > 0.65) {
          const sNorm = (s - 0.72) / 0.04;
          const aNorm = (cosT - 0.65) / 0.35;
          const mDist = sNorm * sNorm + Math.pow(1.0 - aNorm, 2.0) * 0.75;
          if (mDist < 0.75) {
            inMouth = true;
            const indent = (1.0 - mDist / 0.75) * 0.05;
            pz -= indent;
            py += indent * 0.25;
          }
        }

        positions.push(px, py, pz);
        uvs.push(v * 4, s * 5);

        // Blåhaj Two-Tone Coloring with Hand-Stitched Seam Shading & Grime Accumulation
        if (inMouth) {
          colors.push(mouthCol.r, mouthCol.g, mouthCol.b);
        } else {
          // White belly covers the front (+Z), oceanic blue covers the flanks and back (-Z)
          const bellyCutoff = s < 0.65 ? -0.05 : -0.05 + Math.pow((s - 0.65) / 0.35, 1.2) * 1.35;
          const seamDist = cosT - bellyCutoff;
          let vCol;
          if (seamDist > 0.06) {
            vCol = bellyCol.clone();
          } else if (seamDist < -0.06) {
            vCol = topCol.clone();
          } else {
            // Subtle darkened stitch seam along the fabric boundary
            vCol = seamDarkCol.clone();
          }

          // Ground contact grime discoloration on the bottom seating area (s < 0.30)
          if (s < 0.30 && mangeVal > 0.04) {
            const gFactor = Math.pow(1.0 - s / 0.30, 1.3) * mangeVal * 0.85;
            vCol.lerp(groundMudCol, gFactor);
          }

          colors.push(vCol.r, vCol.g, vCol.b);
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
  // AUTHENTIC UPRIGHT DORSAL FIN (SWEEPING UP & BACK FROM UPPER SPINE)
  // Seamlessly integrated on the upright plush shark's back.
  // ==========================================================================
  function buildUprightDorsalFinGeometry(plump, mange) {
    const geo = new THREE.BufferGeometry();
    const rows = 18;
    const cols = 12;
    const positions = [];
    const uvs = [];
    const indices = [];

    const mangeVal = typeof mange === 'number' ? Math.max(0, Math.min(1.0, mange)) : 0;
    const slumpY = mangeVal * 0.14;
    const slumpZ = mangeVal * 0.16;
    const slumpX = mangeVal * 0.085; // Lovable sideways plush flop

    for (let r = 0; r <= rows; r++) {
      const u = r / rows; // 0 at spine base, 1 at rounded apex tip
      const spineY = 1.25 + u * (0.85 - slumpY);
      const spineZ = -0.62 - u * (0.58 + slumpZ);
      const chord = (0.54 * (1.0 - Math.pow(u, 1.25))) + 0.035;
      const th = 0.12 * (1.0 - u * 0.85);

      for (let c = 0; c <= cols; c++) {
        const v = c / cols;
        const ang = v * Math.PI * 2;
        const x = Math.sin(ang) * th * 0.5 + Math.pow(u, 1.8) * slumpX;
        const py = spineY - Math.sin(ang) * chord * 0.25;
        const pz = spineZ - Math.cos(ang) * chord * 0.5;

        positions.push(x, py, pz);
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
  // AUTHENTIC UPRIGHT CAUDAL TAIL (SWAYS WHEN WALKING / IDLING)
  // Origin (0, 0, 0) is at caudal peduncle base (y = 0.48, z = -0.55).
  // ==========================================================================
  function buildUprightCaudalFinGeometry(plump, mange) {
    const geo = new THREE.BufferGeometry();
    const positions = [];
    const uvs = [];
    const indices = [];

    // Peduncle tail cone + dual caudal flukes
    const stemRows = 12;
    const stemCols = 12;
    for (let r = 0; r <= stemRows; r++) {
      const u = r / stemRows;
      const z = -u * 0.52;
      const y = u * 0.05;
      const rx = (0.22 - u * 0.12) * plump;
      const ry = 0.28 - u * 0.14;
      for (let c = 0; c <= stemCols; c++) {
        const v = c / stemCols;
        const a = v * Math.PI * 2;
        const x = Math.sin(a) * rx;
        const py = y + Math.cos(a) * ry;
        positions.push(x, py, z);
        uvs.push(v, u);
      }
    }
    for (let r = 0; r < stemRows; r++) {
      for (let c = 0; c < stemCols; c++) {
        const a = r * (stemCols + 1) + c;
        const b = a + stemCols + 1;
        indices.push(a, a + 1, b);
        indices.push(a + 1, b + 1, b);
      }
    }

    let vOffset = (stemRows + 1) * (stemCols + 1);

    // Caudal Lobes (Upper lobe curving up & back, lower lobe curving down & back)
    const lobes = [
      { yTip: 0.54, zTip: -0.98, th: 0.09, chord: 0.36 }, // Upper lobe
      { yTip: -0.24, zTip: -0.88, th: 0.08, chord: 0.28 } // Lower lobe
    ];

    lobes.forEach((lb) => {
      const rows = 14;
      const cols = 10;
      for (let r = 0; r <= rows; r++) {
        const u = r / rows;
        const y = 0.05 + lb.yTip * u;
        const z = -0.52 + (lb.zTip - -0.52) * u;
        const chord = lb.chord * (1.0 - u * 0.82) + 0.025;
        const th = lb.th * (1.0 - u * 0.80);

        for (let c = 0; c <= cols; c++) {
          const v = c / cols;
          const a = v * Math.PI * 2;
          const x = Math.sin(a) * th * 0.5;
          const py = y - Math.sin(a) * chord * 0.15;
          const pz = z + Math.cos(a) * chord * 0.5;
          positions.push(x, py, pz);
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
  // AUTHENTIC UPRIGHT PECTORAL FLIPPERS (CUDDLY FLAPPING PLUSH ARMS)
  // Attached at shoulders (y = 1.34, x = +/-0.72, z = 0.08).
  // ==========================================================================
  function buildUprightPectoralFinGeometry(side, plump, mange) {
    const geo = new THREE.BufferGeometry();
    const rows = 16;
    const cols = 12;
    const positions = [];
    const uvs = [];
    const indices = [];

    const droop = (mange || 0) * 0.08;

    for (let r = 0; r <= rows; r++) {
      const u = r / rows; // 0 at shoulder, 1 at flipper tip
      const spanX = side * u * 0.62;
      const sweepY = -u * (0.42 + droop);
      const sweepZ = -u * 0.18 + Math.pow(u, 1.4) * 0.08;
      const chord = 0.44 * (1.0 - u * 0.72) + 0.035;
      const th = 0.11 * (1.0 - u * 0.82);

      for (let c = 0; c <= cols; c++) {
        const v = c / cols;
        const a = v * Math.PI * 2;
        const x = spanX + Math.sin(a) * th * 0.5;
        const y = sweepY - Math.sin(a) * chord * 0.2;
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
  function createPlushShark(config, mangeOverride = null, accessorySettings = {}) {
    const group = new THREE.Group();
    group.userData.config = config;
    group.userData.accessorySettings = Object.assign({ showRelic: true, showHeadgear: true }, accessorySettings);
    const scale = config.scale || 1.0;
    const plump = config.plumpness || 1.0;
    const mange = typeof mangeOverride === 'number'
      ? mangeOverride
      : (typeof config.mangeFactor === 'number'
          ? config.mangeFactor
          : (window.__BLAHAJ_MANGE__ !== undefined ? window.__BLAHAJ_MANGE__ : 0.70));

    const plushVertexMat = createPlushMaterial(config.bodyColor || 0x2278c4, true, mange);
    const bodyMat = createPlushMaterial(config.bodyColor || 0x2278c4, false, mange);
    const scarfMat = createPlushMaterial(config.scarfColor || 0x7c4d32, false, mange * 0.6);
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

    // 2. Swept Plush Dorsal Fin (Smoothly attached to upper spine)
    const dorsalGeo = buildUprightDorsalFinGeometry(plump, mange);
    const dorsal = new THREE.Mesh(dorsalGeo, bodyMat);
    dorsal.castShadow = true;
    rig.add(dorsal);

    // 3. Upright Caudal Tail Group (Sways when walking / idling)
    const tailGroup = new THREE.Group();
    tailGroup.position.set(0, 0.48, -0.55);
    const caudalGeo = buildUprightCaudalFinGeometry(plump, mange);
    const caudal = new THREE.Mesh(caudalGeo, bodyMat);
    caudal.castShadow = true;
    tailGroup.add(caudal);
    rig.add(tailGroup);

    // 4. Pectoral Flippers with Animated Pivots
    const leftFinPivot = new THREE.Group();
    leftFinPivot.position.set(0.72 * plump, 1.34, 0.08);
    const leftFinGeo = buildUprightPectoralFinGeometry(1, plump, mange);
    const leftFin = new THREE.Mesh(leftFinGeo, bodyMat);
    leftFin.castShadow = true;
    leftFinPivot.add(leftFin);
    rig.add(leftFinPivot);

    const rightFinPivot = new THREE.Group();
    rightFinPivot.position.set(-0.72 * plump, 1.34, 0.08);
    const rightFinGeo = buildUprightPectoralFinGeometry(-1, plump, mange);
    const rightFin = new THREE.Mesh(rightFinGeo, bodyMat);
    rightFin.castShadow = true;
    rightFinPivot.add(rightFin);
    rig.add(rightFinPivot);

    // Dedicated Held Item Socket on the tip/grasp of the right pectoral fin!
    const heldItemSlot = new THREE.Group();
    heldItemSlot.name = 'heldItemSlot';
    heldItemSlot.position.set(-0.48, -0.04, 0.28);
    rightFinPivot.add(heldItemSlot);

    // 5. White Felt Teeth Rows along the Underside Grin of the Snout Overhang
    const toothBaseCol = (new THREE.Color(0xffffff)).lerp(new THREE.Color(0xded4bc), mange * 0.75);
    const toothMat = new THREE.MeshStandardMaterial({
      color: toothBaseCol,
      roughness: 0.6 + mange * 0.25
    });
    const stUpper = evalUprightSharkStation(0.74, plump, mange);
    const stLower = evalUprightSharkStation(0.69, plump, mange);

    for (let t = -4; t <= 4; t++) {
      const frac = t / 4;
      const angle = frac * 0.74;
      const isSolomonSnaggle = config.protrudingTooth && t === 2;
      const tx = Math.sin(angle) * stUpper.widthX * 0.76;
      const tz = stUpper.centerZ + Math.cos(angle) * stUpper.depthFrontZ * 0.96;
      const ty = stUpper.y - 0.04 - Math.abs(frac) * 0.015;

      const toothGeo = new THREE.ConeGeometry(
        isSolomonSnaggle ? 0.055 : 0.038,
        isSolomonSnaggle ? 0.17 : 0.095,
        8
      );
      const tooth = new THREE.Mesh(toothGeo, toothMat);
      tooth.position.set(tx, ty - (isSolomonSnaggle ? 0.04 : 0.02), tz + (isSolomonSnaggle ? 0.04 : 0.015));
      tooth.rotation.x = Math.PI + (isSolomonSnaggle ? 0.35 : 0.18);
      rig.add(tooth);
    }
    for (let t = -3; t <= 3; t++) {
      const frac = t / 3;
      const angle = frac * 0.62;
      const tx = Math.sin(angle) * stLower.widthX * 0.68;
      const tz = stLower.centerZ + Math.cos(angle) * stLower.depthFrontZ * 0.94;
      const ty = stLower.y + 0.02 + Math.abs(frac) * 0.015;

      const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.08, 8), toothMat);
      tooth.position.set(tx, ty, tz);
      tooth.rotation.x = -0.18;
      rig.add(tooth);
    }

    // 6. Large Glossy Black Button Eyes with Catchlights & Stitched Rims
    const eyeRimMat = new THREE.MeshStandardMaterial({ color: 0x142234, roughness: 0.85 });
    const catchMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    [-1, 1].forEach((side) => {
      const eyeGroup = new THREE.Group();
      eyeGroup.position.set(side * 0.51 * plump, 2.12, 0.74);
      eyeGroup.lookAt(side * 1.3, 2.22, 1.35);

      // Wobbly / loose left eye at higher mange (crooked vintage plush character)
      const isWobblyLeft = (side === 1 && mange > 0.35);
      if (isWobblyLeft) {
        const wobble = (mange - 0.35) / 0.65;
        eyeGroup.rotation.z += wobble * 0.35;
        eyeGroup.rotation.x += wobble * 0.18;
        eyeGroup.position.y -= wobble * 0.035;
      }

      // Scratched / weathered button eye roughness increases with mange
      const eyeRoughness = isWobblyLeft ? (0.08 + mange * 0.58) : (0.08 + mange * 0.25);
      const thisEyeMat = new THREE.MeshStandardMaterial({
        color: 0x05070a,
        roughness: eyeRoughness,
        metalness: Math.max(0.04, 0.35 - mange * 0.26)
      });

      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.022, 12, 24), eyeRimMat);
      eyeGroup.add(rim);

      const dome = new THREE.Mesh(new THREE.SphereGeometry(0.115, 20, 20), thisEyeMat);
      dome.scale.set(1.0, 1.0, 0.72);
      eyeGroup.add(dome);

      // Catchlights dim and shrink slightly as button eye scuffs
      const catchScale = Math.max(0.25, 1.0 - mange * 0.65);
      const glint1 = new THREE.Mesh(new THREE.SphereGeometry(0.036 * catchScale, 12, 12), catchMat);
      glint1.position.set(-0.032 * side, 0.036, 0.085);
      eyeGroup.add(glint1);

      const glint2 = new THREE.Mesh(new THREE.SphereGeometry(0.018 * catchScale, 10, 10), catchMat);
      glint2.position.set(0.032 * side, -0.026, 0.085);
      eyeGroup.add(glint2);

      rig.add(eyeGroup);
    });

    if (config.beautySpot) {
      const spot = new THREE.Mesh(
        new THREE.SphereGeometry(0.038, 12, 12),
        new THREE.MeshBasicMaterial({ color: 0x140a12 })
      );
      spot.position.set(0.58 * plump, 1.90, 0.68);
      rig.add(spot);
    }

    // 7. Five Embroidered Curved Gill Seams on each flank
    const gillMat = new THREE.MeshStandardMaterial({ color: 0x162638, roughness: 0.9 });
    [-1, 1].forEach((side) => {
      for (let g = 0; g < 5; g++) {
        const gs = 0.60 + g * 0.028;
        const st = evalUprightSharkStation(gs, plump, mange);
        const gx = side * (st.widthX + 0.015);
        const gy = st.y;
        const gz = st.centerZ + 0.08 - g * 0.06;

        const gillGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.20, 8);
        const gill = new THREE.Mesh(gillGeo, gillMat);
        gill.position.set(gx, gy, gz);
        gill.rotation.z = side * 0.24;
        gill.rotation.y = side * 0.28;
        rig.add(gill);
      }
    });

    // 8. Fitted Scarf / Collar around Neck
    const scarfGroup = new THREE.Group();
    scarfGroup.position.set(0, 1.48, 0.08);
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.78 * plump, 0.12, 16, 32), scarfMat);
    collar.scale.set(1.0, 0.88, 1.0);
    collar.rotation.x = Math.PI / 2 + 0.06;
    collar.castShadow = true;
    scarfGroup.add(collar);

    const clasp = new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 1), brassMat);
    clasp.position.set(0, -0.02, 0.70 * plump);
    scarfGroup.add(clasp);
    rig.add(scarfGroup);

    // 9. DYNAMIC MANGE FACTOR DETAILS (STITCHES, PATCHES, COTTON PUFFS & THREADS)
    if (mange > 0.04) {
      const wearGroup = new THREE.Group();

      // (a) Hand-sewn running stitches along the dorsal spine seam
      const spineStitchCount = Math.floor(4 + mange * 18);
      for (let s = 0; s < spineStitchCount; s++) {
        const u = 0.22 + (s / spineStitchCount) * 0.52;
        const station = evalUprightSharkStation(u, plump, mange);
        const stitch = new THREE.Mesh(
          new THREE.BoxGeometry(0.018, 0.046, 0.025),
          threadMat
        );
        stitch.position.set((s % 2 === 0 ? 0.012 : -0.012), station.y, station.centerZ - station.depthBackZ - 0.006);
        stitch.rotation.z = Math.sin(s * 1.7) * 0.22;
        wearGroup.add(stitch);
      }

      // (b) Escaping Fluffy Cotton Stuffing Puffs peeking through strained seams!
      if (mange > 0.25) {
        const cottonMat = new THREE.MeshStandardMaterial({
          color: 0xf6f6f6,
          roughness: 0.98,
          metalness: 0.01
        });

        // 1. Right flank seam burst (right under the denim patch)
        const pScale1 = Math.min(1.0, (mange - 0.25) / 0.50);
        const burst1 = new THREE.Group();
        burst1.position.set(0.72 * plump, 0.84, 0.12);
        burst1.scale.setScalar(pScale1);

        const cb1 = new THREE.Mesh(new THREE.SphereGeometry(0.065, 10, 10), cottonMat);
        cb1.scale.set(1.15, 0.85, 1.25);
        burst1.add(cb1);
        const cb2 = new THREE.Mesh(new THREE.SphereGeometry(0.048, 8, 8), cottonMat);
        cb2.position.set(0.035, 0.045, -0.04);
        burst1.add(cb2);
        const cb3 = new THREE.Mesh(new THREE.SphereGeometry(0.042, 8, 8), cottonMat);
        cb3.position.set(-0.02, -0.035, 0.045);
        burst1.add(cb3);
        wearGroup.add(burst1);

        // 2. Left flank seam burst (under the burlap patch)
        if (mange > 0.35) {
          const pScaleL = Math.min(1.0, (mange - 0.35) / 0.50);
          const burstL = new THREE.Group();
          burstL.position.set(-0.72 * plump, 0.68, 0.04);
          burstL.scale.setScalar(pScaleL);

          const cl1 = new THREE.Mesh(new THREE.SphereGeometry(0.058, 8, 8), cottonMat);
          cl1.scale.set(1.1, 0.9, 1.2);
          burstL.add(cl1);
          const cl2 = new THREE.Mesh(new THREE.SphereGeometry(0.042, 8, 8), cottonMat);
          cl2.position.set(-0.025, 0.035, -0.03);
          burstL.add(cl2);
          wearGroup.add(burstL);
        }

        // 3. Caudal peduncle / lower tail seam burst
        if (mange > 0.50) {
          const pScale2 = Math.min(1.0, (mange - 0.50) / 0.40);
          const burst2 = new THREE.Group();
          burst2.position.set(-0.16 * plump, 0.46, -0.64);
          burst2.scale.setScalar(pScale2);

          const ct1 = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), cottonMat);
          burst2.add(ct1);
          const ct2 = new THREE.Mesh(new THREE.SphereGeometry(0.040, 8, 8), cottonMat);
          ct2.position.set(0.025, 0.035, -0.025);
          burst2.add(ct2);
          wearGroup.add(burst2);
        }

        // 4. Dorsal fin root seam burst
        if (mange > 0.72) {
          const pScale3 = Math.min(1.0, (mange - 0.72) / 0.28);
          const burst3 = new THREE.Group();
          burst3.position.set(0.045, 1.28, -0.66);
          burst3.scale.setScalar(pScale3);
          const cd1 = new THREE.Mesh(new THREE.SphereGeometry(0.046, 8, 8), cottonMat);
          burst3.add(cd1);
          wearGroup.add(burst3);
        }
      }

      // (c) Flank Mending Patch #1 (Faded Denim with Cross & Edge Stitches)
      if (mange > 0.16) {
        const patchGeo = new THREE.BoxGeometry(0.04, 0.34, 0.30);
        const patchMat = createPlushMaterial(0x4a6c8e, false, mange);
        const patch = new THREE.Mesh(patchGeo, patchMat);
        patch.position.set(0.76 * plump, 0.96, -0.04);
        patch.rotation.y = 0.12;
        patch.rotation.z = -0.08;
        wearGroup.add(patch);

        // Cross stitches on the 4 corners
        const corners = [
          [-0.13, -0.11],
          [-0.13, 0.11],
          [0.13, -0.11],
          [0.13, 0.11]
        ];
        corners.forEach(([dy, dz]) => {
          [-1, 1].forEach((cross) => {
            const leg = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.015, 0.06), threadMat);
            leg.position.set(0.78 * plump, 0.96 + dy, -0.04 + dz);
            leg.rotation.x = cross * 0.78;
            leg.rotation.y = 0.12;
            wearGroup.add(leg);
          });
        });
      }

      // (d) Flank Mending Patch #2 (Weathered Vintage Burlap / Corduroy)
      if (mange > 0.38) {
        const patch2Geo = new THREE.BoxGeometry(0.04, 0.28, 0.26);
        const patch2Mat = createPlushMaterial(0x7c5d42, false, mange);
        const patch2 = new THREE.Mesh(patch2Geo, patch2Mat);
        patch2.position.set(-0.73 * plump, 0.78, -0.20);
        patch2.rotation.y = -0.15;
        patch2.rotation.z = 0.12;
        wearGroup.add(patch2);

        const corners2 = [
          [-0.10, -0.09],
          [-0.10, 0.09],
          [0.10, -0.09],
          [0.10, 0.09]
        ];
        corners2.forEach(([dy, dz]) => {
          [-1, 1].forEach((cross) => {
            const leg = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.015, 0.05), threadMat);
            leg.position.set(-0.75 * plump, 0.78 + dy, -0.20 + dz);
            leg.rotation.x = cross * 0.78;
            leg.rotation.y = -0.15;
            wearGroup.add(leg);
          });
        });
      }

      // (e) Tail Peduncle Bandage / Canvas Wrap Patch
      if (mange > 0.58) {
        const bandageGeo = new THREE.CylinderGeometry(0.24, 0.22, 0.26, 16, 1, true);
        const bandageMat = createPlushMaterial(0x92836e, false, mange);
        const bandage = new THREE.Mesh(bandageGeo, bandageMat);
        bandage.position.set(0, 0.46, -0.72);
        bandage.rotation.x = Math.PI / 2;
        wearGroup.add(bandage);

        // Bandage criss-cross stitches
        [-0.08, 0.08].forEach((bx) => {
          [-1, 1].forEach((ang) => {
            const bStitch = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.07, 0.03), threadMat);
            bStitch.position.set(bx, 0.46, -0.84);
            bStitch.rotation.z = ang * 0.65;
            wearGroup.add(bStitch);
          });
        });
      }

      // (f) Snout Bridge Emergency Mending Patch
      if (mange > 0.78) {
        const nosePatchGeo = new THREE.BoxGeometry(0.24, 0.03, 0.18);
        const nosePatchMat = createPlushMaterial(0x564234, false, mange);
        const nosePatch = new THREE.Mesh(nosePatchGeo, nosePatchMat);
        nosePatch.position.set(0.02, 2.45, 0.76);
        nosePatch.rotation.x = -0.32;
        wearGroup.add(nosePatch);

        // Nose cross stitches
        [-1, 1].forEach((cross) => {
          const leg = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.035, 0.09), threadMat);
          leg.position.set(0.02, 2.46, 0.76);
          leg.rotation.y = cross * 0.78;
          wearGroup.add(leg);
        });
      }

      // (g) Chin / Under-Throat Emergency Mending Stitches
      if (mange > 0.28) {
        const chinStitches = Math.floor(4 + mange * 5);
        for (let c = 0; c < chinStitches; c++) {
          const u = (c / (chinStitches - 1)) - 0.5;
          const stitch = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.045, 0.025), threadMat);
          stitch.position.set(u * 0.28, 1.64, 0.52 - Math.abs(u) * 0.08);
          stitch.rotation.y = u * 0.5;
          stitch.rotation.z = (c % 2 === 0 ? 0.35 : -0.35);
          wearGroup.add(stitch);
        }
      }

      // (h) Shoulder Flipper Reinforcement Stitches
      if (mange > 0.45) {
        [-1, 1].forEach((side) => {
          const sStitch = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.018, 0.06), threadMat);
          sStitch.position.set(side * 0.73 * plump, 1.40, 0.08);
          sStitch.rotation.x = 0.5;
          wearGroup.add(sStitch);
        });
      }

      // (i) Loose trailing and frayed thread strands
      if (mange > 0.40) {
        // Thread trailing from dorsal fin tip
        const threadCurve = new THREE.Mesh(
          new THREE.CylinderGeometry(0.007, 0.007, 0.24, 6),
          threadMat
        );
        threadCurve.position.set(0.06, 1.35, -0.72);
        threadCurve.rotation.z = 0.6;
        threadCurve.rotation.x = 0.4;
        wearGroup.add(threadCurve);

        // Thread dangling from flank patch
        const threadCurve2 = new THREE.Mesh(
          new THREE.CylinderGeometry(0.006, 0.006, 0.22, 6),
          threadMat
        );
        threadCurve2.position.set(-0.70 * plump, 0.66, 0.06);
        threadCurve2.rotation.z = -0.8;
        wearGroup.add(threadCurve2);

        // Thread trailing from tail
        if (mange > 0.65) {
          const threadCurve3 = new THREE.Mesh(
            new THREE.CylinderGeometry(0.006, 0.006, 0.26, 6),
            threadMat
          );
          threadCurve3.position.set(0.02, 0.35, -1.18);
          threadCurve3.rotation.x = 0.85;
          wearGroup.add(threadCurve3);
        }
      }

      rig.add(wearGroup);
    }

    // 10. Character-Specific Relics, Hats & Tools
    const showRelic = accessorySettings.showRelic !== false;
    const showHeadgear = accessorySettings.showHeadgear !== false;

    if (config.id === 'hermes') {
      // Ornate Brass Between Lantern on left fin
      const lanternGroup = new THREE.Group();
      lanternGroup.userData.accessoryType = 'relic';
      lanternGroup.visible = showRelic;
      lanternGroup.position.set(0.68, -0.28, 0.22);
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
      // Star-Chef Toque perched on head crown
      const hatBand = new THREE.Mesh(new THREE.CylinderGeometry(0.40, 0.38, 0.14, 28), scarfMat);
      hatBand.position.set(0, 2.56, 0.16);
      hatBand.rotation.x = -0.12;
      hatBand.userData.accessoryType = 'headgear';
      hatBand.visible = showHeadgear;
      rig.add(hatBand);

      const hatCrown = new THREE.Mesh(
        new THREE.SphereGeometry(0.40, 24, 20),
        createPlushMaterial(0xf7f1e3)
      );
      hatCrown.scale.set(1.08, 0.85, 1.05);
      hatCrown.position.set(0, 2.74, 0.14);
      hatCrown.userData.accessoryType = 'headgear';
      hatCrown.visible = showHeadgear;
      rig.add(hatCrown);

      // Golden Teapot on Brass Saucer
      const trayGroup = new THREE.Group();
      trayGroup.userData.accessoryType = 'relic';
      trayGroup.visible = showRelic;
      trayGroup.position.set(0.62, -0.06, 0.24);
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
        gFrame.position.set(gx, 2.22, 0.78);
        gFrame.rotation.x = -0.25;
        gFrame.userData.accessoryType = 'headgear';
        gFrame.visible = showHeadgear;
        rig.add(gFrame);
        const lens = new THREE.Mesh(new THREE.CircleGeometry(0.115, 20), lensMat);
        lens.position.copy(gFrame.position);
        lens.rotation.copy(gFrame.rotation);
        lens.userData.accessoryType = 'headgear';
        lens.visible = showHeadgear;
        rig.add(lens);
      });

      // Sacred Allen Key on Left Fin
      const allenGroup = new THREE.Group();
      allenGroup.userData.accessoryType = 'relic';
      allenGroup.visible = showRelic;
      allenGroup.position.set(0.62, -0.08, 0.22);
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
      crystal.position.set(0, 1.34, 0.72);
      crystal.userData.accessoryType = 'relic';
      crystal.visible = showRelic;
      rig.add(crystal);
      const cLight = new THREE.PointLight(0xc084fc, 0.85, 6);
      cLight.position.copy(crystal.position);
      cLight.userData.accessoryType = 'relic';
      cLight.visible = showRelic;
      rig.add(cLight);
    } else if (config.type === 'pink_shark') {
      // Russian Ushanka on head crown
      const ushMat = createPlushMaterial(0x543442, false);
      const badgeMat = new THREE.MeshBasicMaterial({ color: 0xf5cd79 });

      const ushCrown = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.46, 0.32, 24), ushMat);
      ushCrown.position.set(0, 2.58, 0.16);
      rig.add(ushCrown);

      const ushVisor = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.22, 0.14), ushMat);
      ushVisor.position.set(0, 2.58, 0.55);
      rig.add(ushVisor);

      [-0.44, 0.44].forEach((ex) => {
        const earFlap = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 14), ushMat);
        earFlap.scale.set(0.6, 1.4, 0.9);
        earFlap.position.set(ex, 2.40, 0.16);
        rig.add(earFlap);
      });

      const starBadge = new THREE.Mesh(new THREE.OctahedronGeometry(0.08, 0), badgeMat);
      starBadge.position.set(0, 2.59, 0.63);
      rig.add(starBadge);

      if (config.hasClipboard) {
        const board = new THREE.Mesh(
          new THREE.BoxGeometry(0.40, 0.52, 0.04),
          new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.75 })
        );
        board.position.set(-0.58, 0.02, 0.28);
        board.rotation.y = 0.4;
        rightFinPivot.add(board);
      }
    } else if (config.id === 'custom' || config.isCustomShark) {
      const keepsake = config.keepsake || 'flatpack_hat';

      // 1. If not yet detagged (or wearing the unclipped tag keepsake), attach 3D IKEA Factory Barcode Tag on fin!
      if (!config.detagged || keepsake === 'tag_unclipped') {
        const tagGroup = new THREE.Group();
        tagGroup.userData.accessoryType = 'barcode_tag';
        tagGroup.position.set(-0.58, -0.14, -0.12);
        tagGroup.rotation.set(0.18, 0.35, -0.45);

        const tagRibbon = new THREE.Mesh(
          new THREE.BoxGeometry(0.22, 0.46, 0.015),
          new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.65 })
        );
        tagRibbon.position.y = -0.18;
        tagGroup.add(tagRibbon);

        // Iconic Blue & Yellow Spawning-Pit Header Bar
        const blueHeader = new THREE.Mesh(
          new THREE.BoxGeometry(0.20, 0.07, 0.018),
          new THREE.MeshStandardMaterial({ color: 0x0058a3, roughness: 0.4 })
        );
        blueHeader.position.set(0, -0.02, 0);
        tagGroup.add(blueHeader);

        const yellowSub = new THREE.Mesh(
          new THREE.BoxGeometry(0.16, 0.035, 0.020),
          new THREE.MeshBasicMaterial({ color: 0xffda1a })
        );
        yellowSub.position.set(0, -0.02, 0);
        tagGroup.add(yellowSub);

        // Barcode stripes
        const stripeMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
        [-0.06, -0.03, -0.01, 0.02, 0.045, 0.07].forEach((sx, idx) => {
          const w = (idx % 2 === 0) ? 0.014 : 0.008;
          const bar = new THREE.Mesh(new THREE.BoxGeometry(w, 0.14, 0.018), stripeMat);
          bar.position.set(sx, -0.26, 0);
          tagGroup.add(bar);
        });

        rightFinPivot.add(tagGroup);
      }

      // 2. Custom Shark Headgear & Relic based on chosen Keepsake
      if (keepsake === 'flatpack_hat') {
        // Yellow & Blue Flat-Pack Builder Cap on head crown
        const capCrown = new THREE.Mesh(
          new THREE.SphereGeometry(0.39, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.55),
          createPlushMaterial(0x0058a3, false)
        );
        capCrown.position.set(0, 2.52, 0.16);
        capCrown.userData.accessoryType = 'headgear';
        capCrown.visible = showHeadgear;
        rig.add(capCrown);

        const capBrim = new THREE.Mesh(
          new THREE.CylinderGeometry(0.36, 0.36, 0.04, 20, 1, false, -Math.PI * 0.45, Math.PI * 0.9),
          createPlushMaterial(0xffda1a, false)
        );
        capBrim.position.set(0, 2.53, 0.34);
        capBrim.rotation.x = 0.18;
        capBrim.userData.accessoryType = 'headgear';
        capBrim.visible = showHeadgear;
        rig.add(capBrim);

        // Apprentice Brass Hex Key on left fin
        const allenGroup = new THREE.Group();
        allenGroup.userData.accessoryType = 'relic';
        allenGroup.visible = showRelic;
        allenGroup.position.set(0.60, -0.08, 0.22);
        const hex1 = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.50, 6), brassMat);
        allenGroup.add(hex1);
        const hex2 = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.22, 6), brassMat);
        hex2.rotation.z = Math.PI / 2;
        hex2.position.set(0.09, 0.23, 0);
        allenGroup.add(hex2);
        leftFinPivot.add(allenGroup);
      } else if (keepsake === 'scissors_mitre') {
        // Order of the Sacred Scissors Purple-and-Gold Coronet
        const band = new THREE.Mesh(
          new THREE.CylinderGeometry(0.41, 0.39, 0.14, 24),
          createPlushMaterial(0x581c87, false)
        );
        band.position.set(0, 2.56, 0.16);
        band.rotation.x = -0.10;
        band.userData.accessoryType = 'headgear';
        band.visible = showHeadgear;
        rig.add(band);

        const goldCrest = new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 0), brassMat);
        goldCrest.position.set(0, 2.72, 0.38);
        goldCrest.userData.accessoryType = 'headgear';
        goldCrest.visible = showHeadgear;
        rig.add(goldCrest);

        // Golden Scissors of Liberation on left fin
        const scisGroup = new THREE.Group();
        scisGroup.userData.accessoryType = 'relic';
        scisGroup.visible = showRelic;
        scisGroup.position.set(0.62, -0.06, 0.24);
        [-0.22, 0.22].forEach((ang) => {
          const blade = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.44, 0.015), brassMat);
          blade.rotation.z = ang;
          scisGroup.add(blade);
          const loop = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.016, 8, 16), brassMat);
          loop.position.set(Math.sin(ang) * 0.22, -0.22, 0);
          scisGroup.add(loop);
        });
        leftFinPivot.add(scisGroup);
      } else if (keepsake === 'grotto_goggles') {
        // Sea-Cave Diver Goggles on forehead
        const lensMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.1, metalness: 0.6 });
        [-0.22, 0.22].forEach((gx) => {
          const gFrame = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.03, 12, 24), brassMat);
          gFrame.position.set(gx, 2.22, 0.78);
          gFrame.rotation.x = -0.25;
          gFrame.userData.accessoryType = 'headgear';
          gFrame.visible = showHeadgear;
          rig.add(gFrame);
          const lens = new THREE.Mesh(new THREE.CircleGeometry(0.115, 20), lensMat);
          lens.position.copy(gFrame.position);
          lens.rotation.copy(gFrame.rotation);
          lens.userData.accessoryType = 'headgear';
          lens.visible = showHeadgear;
          rig.add(lens);
        });

        // Glowing Pearl Lantern on left fin
        const pearlGroup = new THREE.Group();
        pearlGroup.userData.accessoryType = 'relic';
        pearlGroup.visible = showRelic;
        pearlGroup.position.set(0.64, -0.18, 0.22);
        const orb = new THREE.Mesh(
          new THREE.SphereGeometry(0.13, 16, 16),
          new THREE.MeshBasicMaterial({ color: 0x67e8f9 })
        );
        pearlGroup.add(orb);
        leftFinPivot.add(pearlGroup);
      } else if (keepsake === 'chef_beret') {
        // Spherical Bistro Beret on head
        const beret = new THREE.Mesh(
          new THREE.SphereGeometry(0.42, 20, 16),
          createPlushMaterial(0x9f1239, false)
        );
        beret.scale.set(1.12, 0.42, 1.08);
        beret.position.set(0.06, 2.62, 0.14);
        beret.rotation.z = -0.15;
        beret.userData.accessoryType = 'headgear';
        beret.visible = showHeadgear;
        rig.add(beret);
      }
    }

    group.scale.setScalar(scale);

    group.userData = {
      rig,
      leftFinPivot,
      rightFinPivot,
      heldItemSlot,
      heldItemId: null,
      hasHeldItem: false,
      tailGroup,
      baseY: 0,
      boopTimer: 0,
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

  // ==========================================================================
  // HELD ITEMS & ACTIVE FIN ACCESSORIES (COCKTAILS, FOOD, TOOLS & TOYS)
  // ==========================================================================
  function createHeldItemMesh(itemId) {
    const g = new THREE.Group();

    if (itemId === 'margarita') {
      // Frosted Salt-Rimmed Lagoon Margarita in Coupe Glass
      const glassMat = new THREE.MeshStandardMaterial({
        color: 0xccfbf1,
        transparent: true,
        opacity: 0.75,
        roughness: 0.1,
        metalness: 0.1
      });
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.13, 0.015, 16), glassMat);
      base.position.y = 0.008;
      g.add(base);

      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.16, 12), glassMat);
      stem.position.y = 0.09;
      g.add(stem);

      const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.04, 0.12, 20), glassMat);
      bowl.position.y = 0.22;
      g.add(bowl);

      // White Salt Rim
      const saltRim = new THREE.Mesh(
        new THREE.TorusGeometry(0.182, 0.012, 8, 24),
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, metalness: 0.1 })
      );
      saltRim.rotation.x = Math.PI / 2;
      saltRim.position.y = 0.28;
      g.add(saltRim);

      // Seafoam Lime Beverage
      const liquidMat = new THREE.MeshStandardMaterial({
        color: 0x84cc16,
        emissive: 0x4d7c0f,
        emissiveIntensity: 0.25,
        roughness: 0.2,
        transparent: true,
        opacity: 0.9
      });
      const liquid = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.05, 0.09, 20), liquidMat);
      liquid.position.y = 0.22;
      g.add(liquid);

      // Fresh Green Lime Wheel Wedge
      const limeGroup = new THREE.Group();
      const rind = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.012, 8, 16), new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.6 }));
      limeGroup.add(rind);
      const pulp = new THREE.Mesh(new THREE.CylinderGeometry(0.063, 0.063, 0.01, 16), new THREE.MeshStandardMaterial({ color: 0xa3e635, roughness: 0.3 }));
      pulp.rotation.x = Math.PI / 2;
      limeGroup.add(pulp);
      limeGroup.position.set(0.15, 0.29, 0.0);
      limeGroup.rotation.z = 0.55;
      g.add(limeGroup);

      // Turquoise Paper Cocktail Umbrella with toothpick!
      const umbrella = new THREE.Group();
      const pick = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.22, 6), new THREE.MeshStandardMaterial({ color: 0xd4a373, roughness: 0.7 }));
      pick.position.y = 0.11;
      umbrella.add(pick);
      const canopy = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.05, 12, 1, true), new THREE.MeshStandardMaterial({ color: 0x06b6d4, roughness: 0.5, side: THREE.DoubleSide }));
      canopy.position.y = 0.21;
      umbrella.add(canopy);
      umbrella.position.set(-0.06, 0.20, 0.06);
      umbrella.rotation.set(0.35, 0.2, -0.45);
      g.add(umbrella);

      g.scale.setScalar(0.9);

    } else if (itemId === 'tropical_cocktail') {
      // Layered Sunset Hurricane Cocktail with Maraschino Cherry & Swirled Straw
      const glassMat = new THREE.MeshStandardMaterial({
        color: 0xfef08a,
        transparent: true,
        opacity: 0.7,
        roughness: 0.1,
        metalness: 0.1
      });
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.11, 0.015, 16), glassMat);
      base.position.y = 0.008;
      g.add(base);

      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.06, 12), glassMat);
      stem.position.y = 0.045;
      g.add(stem);

      const lowerBody = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.06, 0.16, 16), glassMat);
      lowerBody.position.y = 0.15;
      g.add(lowerBody);

      const upperBody = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.10, 0.16, 16), glassMat);
      upperBody.position.y = 0.31;
      g.add(upperBody);

      // Sunset gradient layers: Sunrise gold to blood orange
      const lowerLiq = new THREE.Mesh(
        new THREE.CylinderGeometry(0.09, 0.055, 0.14, 16),
        new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.2, transparent: true, opacity: 0.92 })
      );
      lowerLiq.position.y = 0.15;
      g.add(lowerLiq);

      const upperLiq = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.09, 0.14, 16),
        new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.2, transparent: true, opacity: 0.92 })
      );
      upperLiq.position.y = 0.29;
      g.add(upperLiq);

      // Maraschino Cherry
      const cherry = new THREE.Mesh(
        new THREE.SphereGeometry(0.04, 12, 10),
        new THREE.MeshStandardMaterial({ color: 0xbe123c, roughness: 0.15, metalness: 0.3 })
      );
      cherry.position.set(0.06, 0.39, 0.04);
      g.add(cherry);

      // Bendy Straw
      const straw = new THREE.Mesh(
        new THREE.CylinderGeometry(0.008, 0.008, 0.38, 8),
        new THREE.MeshStandardMaterial({ color: 0xec4899, roughness: 0.3 })
      );
      straw.position.set(-0.04, 0.32, -0.03);
      straw.rotation.set(-0.25, 0.1, 0.32);
      g.add(straw);

      // Orange Slice
      const orangeSlice = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, 0.012, 12),
        new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.4 })
      );
      orangeSlice.rotation.x = Math.PI / 2;
      orangeSlice.position.set(0.11, 0.38, -0.03);
      orangeSlice.rotation.z = -0.4;
      g.add(orangeSlice);

      g.scale.setScalar(0.85);

    } else if (itemId === 'celestial_boba') {
      // Celestial Starlight Boba in sealed domed cup
      const cupMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.65,
        roughness: 0.15
      });
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.08, 0.28, 16), cupMat);
      cup.position.y = 0.14;
      g.add(cup);

      const lid = new THREE.Mesh(new THREE.SphereGeometry(0.112, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), cupMat);
      lid.position.y = 0.28;
      g.add(lid);

      const teaMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.4 });
      const teaLiq = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.075, 0.24, 16), teaMat);
      teaLiq.position.y = 0.13;
      g.add(teaLiq);

      const pearlMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.2, metalness: 0.2 });
      for (let p = 0; p < 12; p++) {
        const pearl = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 8), pearlMat);
        const pa = Math.random() * Math.PI * 2;
        const pr = Math.random() * 0.06;
        pearl.position.set(Math.cos(pa) * pr, 0.03 + Math.random() * 0.05, Math.sin(pa) * pr);
        g.add(pearl);
      }

      const straw = new THREE.Mesh(
        new THREE.CylinderGeometry(0.014, 0.014, 0.38, 10),
        new THREE.MeshStandardMaterial({ color: 0xa855f7, roughness: 0.3 })
      );
      straw.position.set(0.01, 0.22, 0.01);
      straw.rotation.set(0.12, 0, -0.15);
      g.add(straw);

      g.scale.setScalar(0.9);

    } else if (itemId === 'tea') {
      // Steaming Earl Grey Infusion in Fine China Cup & Saucer
      const chinaMat = new THREE.MeshStandardMaterial({ color: 0xfdfbf7, roughness: 0.25 });
      const goldMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.8, roughness: 0.2 });

      const saucer = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.12, 0.018, 16), chinaMat);
      saucer.position.y = 0.009;
      g.add(saucer);

      const saucerRim = new THREE.Mesh(new THREE.TorusGeometry(0.155, 0.006, 6, 20), goldMat);
      saucerRim.rotation.x = Math.PI / 2;
      saucerRim.position.y = 0.018;
      g.add(saucerRim);

      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.07, 0.12, 16), chinaMat);
      cup.position.y = 0.07;
      g.add(cup);

      const handle = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.01, 6, 12, Math.PI * 1.3), chinaMat);
      handle.position.set(0.11, 0.07, 0);
      handle.rotation.z = -Math.PI / 2;
      g.add(handle);

      const teaLiq = new THREE.Mesh(
        new THREE.CylinderGeometry(0.092, 0.092, 0.01, 16),
        new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.1 })
      );
      teaLiq.position.y = 0.115;
      g.add(teaLiq);

      const steamMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.45 });
      [-0.02, 0.02].forEach((sx, idx) => {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(0.022 + idx * 0.008, 6, 6), steamMat);
        puff.position.set(sx, 0.17 + idx * 0.04, idx * 0.01);
        g.add(puff);
      });

      g.scale.setScalar(0.95);

    } else if (itemId === 'pina_colada') {
      // Chilled Coconut Pina Colada with Paper Parasol & Striped Straw
      const coconutMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.85 });
      const creamMat = new THREE.MeshStandardMaterial({ color: 0xfef9c3, roughness: 0.25 });
      const pineappleMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4 });
      const cherryMat = new THREE.MeshStandardMaterial({ color: 0xe11d48, roughness: 0.2 });
      const strawMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.3 });
      const umbrellaMat = new THREE.MeshStandardMaterial({ color: 0xf43f5e, roughness: 0.4, side: THREE.DoubleSide });

      // Carved coconut shell
      const husk = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 10, 0, Math.PI * 2, 0.4, Math.PI - 0.4), coconutMat);
      husk.position.y = 0.08;
      g.add(husk);

      // Creamy frosty drink filling with crushed ice
      const cream = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.09, 0.02, 14), creamMat);
      cream.position.y = 0.14;
      g.add(cream);

      // Fresh pineapple wedge on glass rim
      const wedge = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.06, 0.08), pineappleMat);
      wedge.position.set(0.08, 0.17, 0.04);
      wedge.rotation.z = -0.4;
      g.add(wedge);

      // Maraschino cocktail cherry
      const cherry = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), cherryMat);
      cherry.position.set(0.04, 0.16, -0.04);
      g.add(cherry);

      // Striped bendy straw
      const straw = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.22, 8), strawMat);
      straw.position.set(-0.03, 0.20, 0.02);
      straw.rotation.z = 0.28;
      g.add(straw);

      // Paper cocktail parasol / umbrella
      const umbPole = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.18, 6), new THREE.MeshStandardMaterial({ color: 0xd4a373 }));
      umbPole.position.set(0.02, 0.20, -0.05);
      umbPole.rotation.x = -0.35;
      g.add(umbPole);
      const canopy = new THREE.Mesh(new THREE.ConeGeometry(0.085, 0.03, 8), umbrellaMat);
      canopy.position.set(0.02, 0.28, -0.08);
      canopy.rotation.x = -0.35;
      g.add(canopy);

      g.scale.setScalar(0.95);

    } else if (itemId === 'binoculars') {
      // Nautical Brass & Navy Dual-Barrel Marine Binoculars
      const brassMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.85, roughness: 0.25 });
      const navyMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.65 });
      const lensMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.95, roughness: 0.08, transparent: true, opacity: 0.85 });

      // Left & Right Barrels
      [-0.07, 0.07].forEach((bx) => {
        // Main barrel
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.052, 0.22, 16), navyMat);
        barrel.rotation.x = Math.PI / 2;
        barrel.position.set(bx, 0.12, 0);
        g.add(barrel);

        // Brass objective ring
        const objRing = new THREE.Mesh(new THREE.CylinderGeometry(0.054, 0.054, 0.03, 16), brassMat);
        objRing.rotation.x = Math.PI / 2;
        objRing.position.set(bx, 0.12, 0.12);
        g.add(objRing);

        // Front lens glass
        const objLens = new THREE.Mesh(new THREE.CircleGeometry(0.048, 16), lensMat);
        objLens.position.set(bx, 0.12, 0.136);
        g.add(objLens);

        // Ocular eyepiece
        const ocular = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.042, 0.06, 14), navyMat);
        ocular.rotation.x = Math.PI / 2;
        ocular.position.set(bx, 0.12, -0.13);
        g.add(ocular);

        // Eyepiece lens glass
        const eyeLens = new THREE.Mesh(new THREE.CircleGeometry(0.028, 14), lensMat);
        eyeLens.rotation.y = Math.PI;
        eyeLens.position.set(bx, 0.12, -0.161);
        g.add(eyeLens);
      });

      // Center hinge bridge
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.025, 0.12), brassMat);
      bridge.position.set(0, 0.12, 0.01);
      g.add(bridge);

      // Knurled focus wheel
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.035, 12), brassMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(0, 0.145, -0.02);
      g.add(wheel);

      // Leather neck strap
      const strapMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
      const strap = new THREE.Mesh(new THREE.TorusGeometry(0.10, 0.008, 6, 16, Math.PI), strapMat);
      strap.position.set(0, 0.08, -0.14);
      strap.rotation.x = Math.PI * 0.45;
      g.add(strap);

      g.scale.setScalar(0.95);

    } else if (itemId === 'breb') {
      // Warm Breb Loaf with scored diagonal slits
      const crustMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.85 });
      const flourMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.95 });
      const loaf = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.22, 12), crustMat);
      loaf.rotation.z = Math.PI / 2;
      loaf.scale.set(1.0, 0.8, 1.3);
      loaf.position.y = 0.09;
      g.add(loaf);

      [-0.06, 0.0, 0.06].forEach((x) => {
        const slash = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.012, 0.16), flourMat);
        slash.position.set(x, 0.16, 0);
        slash.rotation.y = 0.35;
        g.add(slash);
      });

      g.scale.setScalar(0.95);

    } else if (itemId === 'carrot_toy') {
      // Beach-Shorts Carrot Figurine
      const carrotMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.6 });
      const shortsMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.7 });
      const leafMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.5 });

      const body = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.32, 12), carrotMat);
      body.rotation.x = Math.PI;
      body.position.y = 0.16;
      g.add(body);

      const shorts = new THREE.Mesh(new THREE.CylinderGeometry(0.092, 0.075, 0.10, 12), shortsMat);
      shorts.position.y = 0.22;
      g.add(shorts);

      [-0.02, 0.02].forEach((lx) => {
        const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.12, 6), leafMat);
        leaf.position.set(lx, 0.36, 0);
        leaf.rotation.z = lx * 4;
        g.add(leaf);
      });

      g.scale.setScalar(0.9);

    } else if (itemId === 'hex_key') {
      // Hiram's Brass Hex Key M10
      const brassMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.88, roughness: 0.22 });
      const leg1 = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.35, 6), brassMat);
      leg1.position.y = 0.17;
      g.add(leg1);
      const leg2 = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.14, 6), brassMat);
      leg2.rotation.z = Math.PI / 2;
      leg2.position.set(-0.06, 0.34, 0);
      g.add(leg2);
      g.scale.setScalar(1.0);

    } else if (itemId === 'star_lantern') {
      // Between Star Lantern (Glowing amber-violet beacon)
      const metalMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.85, roughness: 0.3 });
      const glassMat = new THREE.MeshStandardMaterial({
        color: 0xa855f7,
        emissive: 0xc084fc,
        emissiveIntensity: 0.85,
        roughness: 0.1,
        transparent: true,
        opacity: 0.85
      });
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.03, 6), metalMat);
      base.position.y = 0.015;
      g.add(base);
      const core = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.16, 6), glassMat);
      core.position.y = 0.11;
      g.add(core);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(0.10, 0.06, 6), metalMat);
      cap.position.y = 0.22;
      g.add(cap);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.008, 6, 12), metalMat);
      ring.position.y = 0.27;
      g.add(ring);
      const light = new THREE.PointLight(0xa855f7, 0.9, 4.5, 1.2);
      light.position.y = 0.12;
      g.add(light);
      g.scale.setScalar(0.9);

    } else if (itemId === 'party_favor') {
      // Birthday Party Cracker
      const foilGoldMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.85, roughness: 0.25 });
      const foilRubyMat = new THREE.MeshStandardMaterial({ color: 0xec4899, metalness: 0.6, roughness: 0.3 });
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.16, 12), foilGoldMat);
      body.rotation.z = Math.PI / 2;
      g.add(body);
      [-1, 1].forEach((dir) => {
        const twist = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.06, 10), foilRubyMat);
        twist.rotation.z = -dir * Math.PI / 2;
        twist.position.x = dir * 0.11;
        g.add(twist);
        const bow = new THREE.Mesh(new THREE.TorusGeometry(0.028, 0.008, 6, 12), foilRubyMat);
        bow.position.x = dir * 0.085;
        g.add(bow);
      });
      g.scale.setScalar(1.1);

    } else if (itemId === 'seam_detector') {
      // Aetheric Seam Diviner (Handheld Steampunk Celestial Resonator)
      const brassMat = new THREE.MeshStandardMaterial({ color: 0xd8aa5b, metalness: 0.88, roughness: 0.22 });
      const darkMetalMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.75, roughness: 0.35 });
      const crystalMat = new THREE.MeshStandardMaterial({
        color: 0xa855f7,
        emissive: 0xc084fc,
        emissiveIntensity: 0.85,
        roughness: 0.1,
        transparent: true,
        opacity: 0.88
      });
      const needleMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });

      // Brass Handle with grip
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.042, 0.24, 12), brassMat);
      handle.position.y = 0.10;
      g.add(handle);

      // Pommel ring
      const pommel = new THREE.Mesh(new THREE.TorusGeometry(0.032, 0.008, 6, 14), brassMat);
      pommel.position.y = -0.02;
      g.add(pommel);

      // Flared dial collar
      const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.042, 0.05, 16), darkMetalMat);
      collar.position.y = 0.22;
      g.add(collar);

      // Circular Gauge Dish
      const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.035, 18), brassMat);
      dish.position.y = 0.26;
      g.add(dish);

      // Glass lens
      const lens = new THREE.Mesh(
        new THREE.CylinderGeometry(0.105, 0.105, 0.008, 18),
        new THREE.MeshStandardMaterial({ color: 0xe0f2fe, roughness: 0.05, transparent: true, opacity: 0.6 })
      );
      lens.position.y = 0.28;
      g.add(lens);

      // Glowing Aetheric Resonator Core (Octahedron crystal)
      const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.055, 0), crystalMat);
      crystal.position.y = 0.32;
      g.add(crystal);

      // Miniature meter needle
      const miniNeedle = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.004, 0.07), needleMat);
      miniNeedle.position.set(0, 0.282, 0.025);
      g.add(miniNeedle);

      // Twin Sensor Prongs (Aether Antennas)
      [-1, 1].forEach((dir) => {
        const prong = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.012, 0.15, 8), brassMat);
        prong.position.set(dir * 0.095, 0.32, 0);
        prong.rotation.z = -dir * 0.22;
        g.add(prong);

        const tip = new THREE.Mesh(new THREE.SphereGeometry(0.015, 8, 8), crystalMat);
        tip.position.set(dir * 0.115, 0.40, 0);
        g.add(tip);
      });

      // Point Light Aura
      const light = new THREE.PointLight(0xa855f7, 1.2, 5.0, 1.5);
      light.position.set(0, 0.32, 0);
      g.add(light);

      g.userData = {
        crystal,
        light,
        miniNeedle
      };

      g.scale.setScalar(0.95);

    } else if (itemId === 'retired_tag') {
      // Retired IKEA Spawning-Pit Barcode Tag (Art. 303.735.88)
      const tagMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.55 });
      const blueMat = new THREE.MeshStandardMaterial({ color: 0x0058a3, roughness: 0.35 });
      const yellowMat = new THREE.MeshBasicMaterial({ color: 0xffda1a });
      const barMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });

      const card = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.32, 0.012), tagMat);
      card.position.y = 0.14;
      g.add(card);

      const header = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.055, 0.015), blueMat);
      header.position.set(0, 0.25, 0);
      g.add(header);

      const oval = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.028, 0.017), yellowMat);
      oval.position.set(0, 0.25, 0);
      g.add(oval);

      [-0.045, -0.02, 0.0, 0.022, 0.045].forEach((bx, idx) => {
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(idx % 2 === 0 ? 0.011 : 0.006, 0.10, 0.015), barMat);
        stripe.position.set(bx, 0.07, 0);
        g.add(stripe);
      });
      g.scale.setScalar(1.05);

    } else if (itemId === 'ingvar_tape') {
      // Ingvar's Brass & Paper Measuring Tape
      const brassMat = new THREE.MeshStandardMaterial({ color: 0xd8aa5b, metalness: 0.85, roughness: 0.25 });
      const ribbonMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.5 });
      const reel = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.06, 20), brassMat);
      reel.rotation.z = Math.PI / 2;
      reel.position.y = 0.11;
      g.add(reel);
      const tapeStrip = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.22, 0.008), ribbonMat);
      tapeStrip.position.set(0, 0.22, 0.06);
      tapeStrip.rotation.x = 0.25;
      g.add(tapeStrip);

    } else if (itemId === 'sacred_scissors') {
      // Golden Scissors of the Order
      const goldMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.88, roughness: 0.2 });
      [-0.24, 0.24].forEach((ang) => {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.28, 0.01), goldMat);
        blade.position.y = 0.15;
        blade.rotation.z = ang;
        g.add(blade);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.042, 0.01, 8, 16), goldMat);
        ring.position.set(Math.sin(ang) * 0.12, 0.02, 0);
        g.add(ring);
      });
      g.scale.setScalar(1.1);

    } else if (itemId === 'helen_cake' || itemId === 'cake_slice') {
      // Miniature Celestial Birthday Bombe Slice
      const chinaMat = new THREE.MeshStandardMaterial({ color: 0xfdfbf7, roughness: 0.2 });
      const brassMat = new THREE.MeshStandardMaterial({ color: 0xd8aa5b, metalness: 0.85, roughness: 0.22 });
      const glazeMat = new THREE.MeshStandardMaterial({ color: 0x9f1239, roughness: 0.08, metalness: 0.35 });
      const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.10, 0.015, 16), chinaMat);
      plate.position.y = 0.008;
      g.add(plate);
      const cake = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), glazeMat);
      cake.position.y = 0.016;
      g.add(cake);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.095, 0.006, 6, 16), brassMat);
      ring.rotation.x = Math.PI * 0.35;
      ring.position.y = 0.06;
      g.add(ring);
      const spark = new THREE.Mesh(new THREE.OctahedronGeometry(0.018, 0), new THREE.MeshBasicMaterial({ color: 0xfde047 }));
      spark.position.y = 0.15;
      g.add(spark);
      g.scale.setScalar(0.9);

    } else {
      // Default cute parcel box
      const boxMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.7 });
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.18), boxMat);
      box.position.y = 0.09;
      g.add(box);
    }

    return g;
  }

  function attachHeldItem(sharkGroup, itemId) {
    if (!sharkGroup || !sharkGroup.userData) return;
    const slot = sharkGroup.userData.heldItemSlot;
    if (!slot) return;

    while (slot.children.length > 0) {
      slot.remove(slot.children[0]);
    }

    if (!itemId) {
      sharkGroup.userData.heldItemId = null;
      sharkGroup.userData.hasHeldItem = false;
      return;
    }

    const mesh = createHeldItemMesh(itemId);
    if (mesh) {
      slot.add(mesh);
      sharkGroup.userData.heldItemId = itemId;
      sharkGroup.userData.hasHeldItem = true;
    }
  }

  function animateShark(mesh, dt, isMoving, time, isSwimming = false, swimVelY = 0) {
    if (!mesh || !mesh.userData || !mesh.userData.rig) return;
    const ud = mesh.userData;
    const rig = ud.rig;

    if (isSwimming) {
      // Sinuous, hydrodynamic 3D plush shark swimming animation!
      ud.walkPhase += dt * (isMoving ? 11.5 : 4.8);
      // Gentle buoyant hovering bob
      rig.position.y = Math.sin(ud.walkPhase * 0.75) * 0.12;
      // Body banking roll
      rig.rotation.z = Math.sin(ud.walkPhase * 0.6) * 0.09;

      if (ud.leftFinPivot && ud.rightFinPivot) {
        ud.leftFinPivot.rotation.z = Math.sin(ud.walkPhase) * 0.28 - 0.16;
        ud.rightFinPivot.rotation.z = -Math.sin(ud.walkPhase) * 0.28 + 0.16;
      }
      if (ud.tailGroup) {
        ud.tailGroup.rotation.y = Math.sin(ud.walkPhase * 1.25) * 0.42;
      }
    } else if (isMoving) {
      ud.walkPhase += dt * 10.5;
      rig.position.y = Math.abs(Math.sin(ud.walkPhase)) * 0.22;
      rig.rotation.z = Math.sin(ud.walkPhase) * 0.085;
      if (ud.leftFinPivot && ud.rightFinPivot) {
        ud.leftFinPivot.rotation.z = Math.sin(ud.walkPhase) * 0.32;
        if (ud.hasHeldItem) {
          ud.rightFinPivot.rotation.x = -0.36;
          ud.rightFinPivot.rotation.y = -0.20;
          ud.rightFinPivot.rotation.z = -0.15 + Math.sin(ud.walkPhase) * 0.06;
        } else {
          ud.rightFinPivot.rotation.x = 0;
          ud.rightFinPivot.rotation.y = 0;
          ud.rightFinPivot.rotation.z = -Math.sin(ud.walkPhase) * 0.32;
        }
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
        if (ud.hasHeldItem) {
          const sipCycle = (time * 0.45 + (ud.walkPhase || 0)) % (Math.PI * 2);
          const isSip = sipCycle > Math.PI * 1.65;
          const sipProgress = isSip ? Math.sin((sipCycle - Math.PI * 1.65) / (Math.PI * 0.35) * Math.PI) : 0;
          ud.rightFinPivot.rotation.x = -0.38 - sipProgress * 0.45;
          ud.rightFinPivot.rotation.y = -0.22 - sipProgress * 0.18;
          ud.rightFinPivot.rotation.z = -0.15;
        } else {
          ud.rightFinPivot.rotation.x = 0;
          ud.rightFinPivot.rotation.y = 0;
          ud.rightFinPivot.rotation.z = -idleWave * 0.08;
        }
      }
      if (ud.tailGroup) {
        ud.tailGroup.rotation.y = Math.sin(time * 1.6 + ud.walkPhase) * 0.12;
      }
    }

    if (ud.flipTimer > 0) {
      ud.flipTimer = Math.max(0, ud.flipTimer - dt);
      const flipProgress = 1 - ud.flipTimer / 0.45;
      rig.rotation.x = Math.sin(flipProgress * Math.PI * 2) * 0.75;
      rig.position.z = 0;
      if (ud.tailGroup) {
        ud.tailGroup.rotation.y = Math.sin(flipProgress * Math.PI * 4) * 0.45;
      }
    } else if (ud.boopTimer > 0) {
      ud.boopTimer = Math.max(0, ud.boopTimer - dt);
      const boopProgress = 1 - ud.boopTimer / 0.42;
      const surge = Math.sin(boopProgress * Math.PI);

      // Punchy forward snout tackle surge & attack hop
      rig.position.z = surge * 0.58;
      rig.position.y += surge * 0.24;
      rig.rotation.x = -surge * 0.38;

      // Dynamic forward fin thrust / clap
      if (ud.leftFinPivot && ud.rightFinPivot) {
        ud.leftFinPivot.rotation.y = surge * 1.35;
        ud.leftFinPivot.rotation.z = surge * 0.45;
        ud.rightFinPivot.rotation.y = -surge * 1.35;
        ud.rightFinPivot.rotation.z = -surge * 0.45;
      }
      if (ud.tailGroup) {
        ud.tailGroup.rotation.y = Math.sin(boopProgress * Math.PI * 3.5) * 0.38;
      }
    } else if (ud.beepTimer > 0) {
      rig.position.z = 0;
      ud.beepTimer = Math.max(0, ud.beepTimer - dt);
      const p = Math.sin((1 - ud.beepTimer / 0.9) * Math.PI);
      if (ud.leftFinPivot && ud.rightFinPivot) {
        ud.leftFinPivot.rotation.y = p * 0.95;
        ud.leftFinPivot.rotation.z = p * 0.55;
        ud.rightFinPivot.rotation.y = -p * 0.95;
        ud.rightFinPivot.rotation.z = -p * 0.55;
      }
      rig.rotation.x = p * 0.18;
    } else if (ud.groomTimer > 0) {
      rig.position.z = 0;
      ud.groomTimer = Math.max(0, ud.groomTimer - dt);
      const p = 1.0 - (ud.groomTimer / 1.1);
      const sweep = Math.sin(p * Math.PI * 6.0);
      // Caring gentle forward lean
      rig.rotation.x = -0.16 + Math.sin(p * Math.PI) * 0.08;
      rig.position.y += Math.sin(p * Math.PI) * 0.06;
      // Right fin performs gentle rhythmic grooming strokes
      if (ud.rightFinPivot) {
        ud.rightFinPivot.rotation.x = -0.65 + sweep * 0.32;
        ud.rightFinPivot.rotation.y = -0.28 + sweep * 0.18;
        ud.rightFinPivot.rotation.z = -0.25;
      }
      if (ud.leftFinPivot) {
        ud.leftFinPivot.rotation.y = 0.20;
        ud.leftFinPivot.rotation.z = 0.25;
      }
      if (ud.tailGroup) {
        ud.tailGroup.rotation.y = Math.sin(p * Math.PI * 5.0) * 0.22;
      }
    } else if (ud.groomTargetTimer > 0) {
      rig.position.z = 0;
      ud.groomTargetTimer = Math.max(0, ud.groomTargetTimer - dt);
      const p = 1.0 - (ud.groomTargetTimer / 1.1);
      // Happy cozy wiggle while being groomed
      rig.rotation.z = Math.sin(p * Math.PI * 6.0) * 0.06;
      rig.position.y += Math.sin(p * Math.PI * 4.0) * 0.04;
      if (ud.tailGroup) {
        ud.tailGroup.rotation.y = Math.sin(p * Math.PI * 7.0) * 0.35;
      }
      if (ud.leftFinPivot && ud.rightFinPivot) {
        ud.leftFinPivot.rotation.z = 0.15 + Math.sin(p * Math.PI * 6.0) * 0.12;
        ud.rightFinPivot.rotation.z = -0.15 - Math.sin(p * Math.PI * 6.0) * 0.12;
      }
    } else if (isSwimming) {
      rig.position.z = 0;
      // Tilt body pitch along climb/dive swim trajectory
      const targetPitch = Math.max(-0.65, Math.min(0.65, -swimVelY * 0.08));
      rig.rotation.x += (targetPitch - rig.rotation.x) * Math.min(1.0, dt * 7.5);
      if (ud.leftFinPivot && ud.rightFinPivot) {
        ud.leftFinPivot.rotation.y = 0;
        ud.rightFinPivot.rotation.y = 0;
      }
    } else {
      rig.position.z = 0;
      rig.rotation.x = 0;
      if (ud.leftFinPivot && ud.rightFinPivot) {
        ud.leftFinPivot.rotation.y = 0;
        ud.rightFinPivot.rotation.y = 0;
      }
    }
  }

  function updateSharkAccessories(sharkGroup, settings = {}) {
    if (!sharkGroup) return;
    sharkGroup.traverse((child) => {
      if (child.userData && child.userData.accessoryType) {
        if (child.userData.accessoryType === 'relic' && typeof settings.showRelic === 'boolean') {
          child.visible = settings.showRelic;
        } else if (child.userData.accessoryType === 'headgear' && typeof settings.showHeadgear === 'boolean') {
          child.visible = settings.showHeadgear;
        }
      }
    });
  }


  function updateSharkMange(sharkMesh, mangeVal) {
    if (!sharkMesh) return;
    const mVal = typeof mangeVal === 'number' ? Math.max(0.0, Math.min(1.0, mangeVal)) : 0.0;
    sharkMesh.traverse((child) => {
      if (child.isMesh && child.material) {
        const mat = child.material;
        if (mat.userData && mat.userData.uMange) {
          mat.userData.uMange.value = mVal;
          mat.roughness = 0.85 + mVal * 0.10;
          mat.bumpScale = 0.055 * (1.0 - mVal * 0.35);
        }
      }
    });
  }

  return {
    createPlushShark,
    updateSharkMange,
    updateSharkAccessories,
    createBirb,
    createTropicalFish,
    createBeachBall,
    createBeachCarrot,
    createBeetrootServer,
    animateShark,
    createHeldItemMesh,
    attachHeldItem
  };
})();
window.BlahajSharks3D = window.BlahajModels;
