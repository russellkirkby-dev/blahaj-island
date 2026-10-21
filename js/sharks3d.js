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

  // Exact analytical cross-section of our upright Blåhaj at vertical parameter s in [0..1]
  // s = 0 is bottom of torso (y = 0.38), s = 1 is very tip of rounded snout (y = 2.68, z = 0.75)
  // Using an explicit vertical loft guarantees zero self-intersection, a closed snout tip,
  // and exact surface coordinates for eyes, mouth, teeth, gills, dorsal fin, and scarf!
  function evalSharkRing(s, plump) {
    // Height y goes smoothly from 0.38 to 2.62
    const y = 0.38 + s * 2.24;
    let centerZ = 0;
    let widthX = 0.8;
    let depthFrontZ = 0.75;
    let depthBackZ = 0.75;

    if (s < 0.62) {
      // Lower torso through chest (s = 0..0.62, y = 0.38..1.77)
      const u = s / 0.62;
      const bellyCurve = Math.sin(u * Math.PI * 0.82);
      centerZ = -0.05 + u * 0.08;
      widthX = (0.58 + 0.32 * bellyCurve) * plump;
      depthFrontZ = (0.52 + 0.32 * bellyCurve) * plump;
      depthBackZ = (0.56 + 0.28 * bellyCurve) * plump;
    } else {
      // Neck (s=0.62, y=1.77) -> Head & Overhanging Broad Blåhaj Snout (s=1.0, y=2.62)
      const u = (s - 0.62) / 0.38; // 0 at neck, 1 at snout crown
      const dome = Math.cos(u * Math.PI * 0.5); // 1 at neck, 0 at very top crown
      const snoutProject = Math.sin(u * Math.PI * 0.85);
      // Snout projects forward (+Z) like a real shark head!
      centerZ = 0.03 + snoutProject * 0.38;
      // Blåhaj has a broad, friendly, slightly flattened wedge head (wider in X)
      widthX = (0.85 * Math.pow(dome, 0.56)) * plump;
      depthFrontZ = 0.78 * Math.pow(dome, 0.58);
      depthBackZ = 0.76 * Math.pow(dome, 0.68);
    }

    return { y, centerZ, widthX, depthFrontZ, depthBackZ };
  }

  function buildAuthenticBlahajBodyGeometry(plump, topColorHex, bellyColorHex) {
    const rings = 72;
    const segs = 56;
    const positions = [];
    const colors = [];
    const uvs = [];
    const indices = [];

    const topCol = new THREE.Color(topColorHex || 0x2278c4);
    const bellyCol = new THREE.Color(bellyColorHex || 0xf4eee1);
    const mouthCol = new THREE.Color(0x9e2b3b); // Deep plush crimson mouth interior
    const mouthRimCol = new THREE.Color(0xdccfb8);

    for (let i = 0; i <= rings; i++) {
      const s = i / rings;
      const ring = evalSharkRing(s, plump);

      for (let j = 0; j <= segs; j++) {
        const v = j / segs;
        const theta = v * Math.PI * 2; // 0 = front (+Z), PI/2 = right (+X), PI = back (-Z)
        const sinT = Math.sin(theta);
        const cosT = Math.cos(theta);

        let px = sinT * ring.widthX;
        let pz = ring.centerZ + (cosT >= 0 ? cosT * ring.depthFrontZ : cosT * ring.depthBackZ);
        let py = ring.y;

        // Subtle crimson plush Shark Grin on the front-underside of the solid snout!
        let inMouthCavity = false;
        let onMouthRim = false;
        if (s > 0.65 && s < 0.80 && cosT > 0.42) {
          const sNorm = (s - 0.725) / 0.075; // -1 to +1 vertically
          const aNorm = (cosT - 0.42) / 0.58; // 0 at corners of grin, 1 at center front
          const smileArch = sNorm + (1 - aNorm) * 0.22;
          const mouthDist = smileArch * smileArch + Math.pow(1 - aNorm, 2.2) * 0.45;
          if (mouthDist < 0.65) {
            inMouthCavity = true;
            const depthFactor = Math.max(0, 1 - mouthDist / 0.65);
            // Shallow 4cm dimple so the snout stays 100% solid and flush with the teeth!
            pz -= depthFactor * 0.045;
            if (mouthDist > 0.46) onMouthRim = true;
          }
        }

        // Bottom cap closure at s = 0 and top snout closure at s = 1
        if (i === 0) {
          px = 0;
          pz = ring.centerZ;
        } else if (i === rings) {
          px = 0;
          pz = ring.centerZ;
        }

        positions.push(px, py, pz);
        uvs.push(v * 4, s * 5);

        // Two-tone Blåhaj coloring:
        const bellyBoundary = s < 0.66 ? 0.08 : (s < 0.84 ? 0.08 + ((s - 0.66) / 0.18) * 0.92 : 1.5);
        if (inMouthCavity && !onMouthRim) {
          colors.push(mouthCol.r, mouthCol.g, mouthCol.b);
        } else if (onMouthRim) {
          colors.push(mouthRimCol.r, mouthRimCol.g, mouthRimCol.b);
        } else if (cosT > bellyBoundary) {
          colors.push(bellyCol.r, bellyCol.g, bellyCol.b);
        } else {
          colors.push(topCol.r, topCol.g, topCol.b);
        }
      }
    }

    for (let i = 0; i < rings; i++) {
      for (let j = 0; j < segs; j++) {
        const a = i * (segs + 1) + j;
        const b = a + segs + 1;
        // Outward-facing counter-clockwise triangle winding order!
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

  // Sculpted Hydrofoil Fin Geometry
  function buildSculptedFinGeometry(length, chord, thickness, sweep, curveY = 0) {
    const rings = 22;
    const segs = 22;
    const positions = [];
    const uvs = [];
    const indices = [];

    for (let i = 0; i <= rings; i++) {
      const u = i / rings;
      const span = u * length;
      const taper = Math.sin((1 - u * 0.94) * Math.PI * 0.5);
      const c = chord * Math.pow(taper, 0.82);
      const th = thickness * Math.pow(taper, 0.88);
      const offsetSweep = Math.pow(u, 1.4) * sweep;
      const bend = Math.pow(u, 1.6) * curveY;

      for (let j = 0; j <= segs; j++) {
        const v = j / segs;
        const a = v * Math.PI * 2;
        const x = span;
        const y = i === rings ? bend : Math.sin(a) * th + bend;
        const z = i === rings ? -offsetSweep : Math.cos(a) * c * 0.5 - offsetSweep;
        positions.push(x, y, z);
        uvs.push(u * 2, v * 2);
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
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }

  // ==========================================================================
  // CREATE HIGH-DETAIL 3D PLUSH SHARK (EYES, TEETH, GILLS & SCARF GUARANTEED VISIBLE!)
  // ==========================================================================
  function createPlushShark(config) {
    const group = new THREE.Group();
    const scale = config.scale || 1.0;
    const plump = config.plumpness || 1.0;

    const plushVertexMat = createPlushMaterial(config.bodyColor || 0x3b638c, true);
    const bodyMat = createPlushMaterial(config.bodyColor || 0x3b638c, false);
    const scarfMat = createPlushMaterial(config.scarfColor || 0x7c4d32, false);
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xd8aa5b,
      roughness: 0.26,
      metalness: 0.84
    });

    const rig = new THREE.Group();
    group.add(rig);

    // 1. Sculpted Blåhaj Head & Torso Mesh with Open Recessed Crimson Grin
    const bodyGeo = buildAuthenticBlahajBodyGeometry(
      plump,
      config.bodyColor || 0x3b638c,
      config.bellyColor || 0xf5ecdc
    );
    const bodyMesh = new THREE.Mesh(bodyGeo, plushVertexMat);
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    rig.add(bodyMesh);

    // 2. Prominent White Felt Teeth Rows (Upper & Lower Jaw Rim, sitting Proudly Outside the Mouth Cavity!)
    const toothMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
    const upperMouthRing = evalSharkRing(0.79, plump);
    const lowerMouthRing = evalSharkRing(0.65, plump);

    // 9 Upper Teeth pointing down from the upper lip overhang
    for (let t = -4; t <= 4; t++) {
      const theta = (t / 4) * 0.78; // Spread across front grin
      const isSolomonTooth = config.protrudingTooth && t === 2;
      const tx = Math.sin(theta) * upperMouthRing.widthX * 0.94;
      const tz = upperMouthRing.centerZ + Math.cos(theta) * upperMouthRing.depthFrontZ * 0.95;
      const ty = upperMouthRing.y - Math.abs(t) * 0.018;

      const toothGeo = new THREE.ConeGeometry(
        isSolomonTooth ? 0.068 : 0.048,
        isSolomonTooth ? 0.21 : 0.12,
        12
      );
      const tooth = new THREE.Mesh(toothGeo, toothMat);
      tooth.position.set(tx, ty - 0.04, tz + (isSolomonTooth ? 0.05 : 0.01));
      tooth.rotation.x = Math.PI + (isSolomonTooth ? 0.35 : 0.08);
      rig.add(tooth);
    }

    // 7 Lower Teeth pointing up along the lower jaw rim
    for (let t = -3; t <= 3; t++) {
      const theta = (t / 3) * 0.65;
      const tx = Math.sin(theta) * lowerMouthRing.widthX * 0.90;
      const tz = lowerMouthRing.centerZ + Math.cos(theta) * lowerMouthRing.depthFrontZ * 0.92;
      const ty = lowerMouthRing.y + 0.03 - Math.abs(t) * 0.012;

      const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.042, 0.095, 10), toothMat);
      tooth.position.set(tx, ty, tz);
      tooth.rotation.x = -0.15;
      rig.add(tooth);
    }

    // 3. Large, Expressive Glossy Black Button Eyes Placed Proudly on the Surface of the Snout!
    const eyeRing = evalSharkRing(0.84, plump);
    const eyeTheta = 0.82; // ~47 degrees to Left & Right of front nose centerline
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x05070b, roughness: 0.06, metalness: 0.3 });
    const eyeRimMat = new THREE.MeshStandardMaterial({ color: 0x1b2d42, roughness: 0.85 });
    const catchMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    [-1, 1].forEach((side) => {
      // Exact surface point at s = 0.84, theta = side * eyeTheta, pushed +0.03 outward along normal!
      const ex = side * (Math.sin(eyeTheta) * eyeRing.widthX + 0.02);
      const ey = eyeRing.y + 0.02;
      const ez = eyeRing.centerZ + Math.cos(eyeTheta) * eyeRing.depthFrontZ + 0.02;

      const eyeGroup = new THREE.Group();
      eyeGroup.position.set(ex, ey, ez);
      // Orient eye outward along the snout normal
      eyeGroup.lookAt(ex + side * 1.2, ey + 0.35, ez + 1.1);

      // Stitched plush eye border ring
      const border = new THREE.Mesh(new THREE.TorusGeometry(0.135, 0.025, 12, 24), eyeRimMat);
      eyeGroup.add(border);

      // Large glossy black dome button eye
      const dome = new THREE.Mesh(new THREE.SphereGeometry(0.13, 24, 24), eyeMat);
      dome.scale.set(1.0, 1.0, 0.78);
      eyeGroup.add(dome);

      // Bright white primary & secondary catchlights on the outer dome surface
      const glint1 = new THREE.Mesh(new THREE.SphereGeometry(0.042, 12, 12), catchMat);
      glint1.position.set(-0.035 * side, 0.042, 0.095);
      eyeGroup.add(glint1);

      const glint2 = new THREE.Mesh(new THREE.SphereGeometry(0.02, 10, 10), catchMat);
      glint2.position.set(0.038 * side, -0.032, 0.095);
      eyeGroup.add(glint2);

      rig.add(eyeGroup);
    });

    // Tatiana's canonical beauty spot on the surface of her cheek!
    if (config.beautySpot) {
      const bRing = evalSharkRing(0.77, plump);
      const bTheta = 0.72;
      const spot = new THREE.Mesh(
        new THREE.SphereGeometry(0.042, 12, 12),
        new THREE.MeshBasicMaterial({ color: 0x120a10 })
      );
      spot.position.set(
        Math.sin(bTheta) * bRing.widthX + 0.02,
        bRing.y,
        bRing.centerZ + Math.cos(bTheta) * bRing.depthFrontZ + 0.02
      );
      rig.add(spot);
    }

    // 4. 5 Stitched Gill Slits on Each Side of the Head (Sitting Proudly on the Cheek Surface!)
    const gillMat = new THREE.MeshStandardMaterial({ color: 0x16283d, roughness: 0.9 });
    [-1, 1].forEach((side) => {
      for (let g = 0; g < 5; g++) {
        const gs = 0.74 - g * 0.028;
        const gRing = evalSharkRing(gs, plump);
        const gTheta = 1.28 + g * 0.05; // Cheek side behind eye
        const gx = side * (Math.sin(gTheta) * gRing.widthX + 0.018);
        const gz = gRing.centerZ + Math.cos(gTheta) * gRing.depthFrontZ;

        const gill = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.20, 0.035), gillMat);
        gill.position.set(gx, gRing.y, gz);
        gill.rotation.z = side * 0.18;
        gill.rotation.y = side * 0.3;
        rig.add(gill);
      }
    });

    // 5. Iconic Swept Dorsal Fin on the Upper Back (Positioned on Exact Back Surface!)
    const backRing = evalSharkRing(0.48, plump);
    const dorsalGeo = buildSculptedFinGeometry(0.95, 0.72, 0.13, 0.42, 0);
    dorsalGeo.rotateZ(Math.PI / 2);
    dorsalGeo.rotateY(Math.PI);
    const dorsal = new THREE.Mesh(dorsalGeo, bodyMat);
    dorsal.position.set(0, backRing.y, backRing.centerZ - backRing.depthBackZ + 0.08);
    dorsal.rotation.x = -0.58;
    dorsal.castShadow = true;
    rig.add(dorsal);

    // 6. Swept-Back Plush Shark Tail & Crescent Caudal Flukes (Attached at Lower Back!)
    const tailGroup = new THREE.Group();
    const lowBackRing = evalSharkRing(0.16, plump);
    tailGroup.position.set(0, lowBackRing.y, lowBackRing.centerZ - lowBackRing.depthBackZ + 0.12);

    const tailConeGeo = new THREE.ConeGeometry(0.46 * plump, 1.35, 24);
    tailConeGeo.rotateX(-Math.PI * 0.44);
    const tailCone = new THREE.Mesh(tailConeGeo, bodyMat);
    tailCone.position.set(0, 0.05, -0.52);
    tailCone.castShadow = true;
    tailGroup.add(tailCone);

    const upperFlukeGeo = buildSculptedFinGeometry(0.88, 0.42, 0.09, 0.32, 0);
    upperFlukeGeo.rotateZ(Math.PI * 0.36);
    upperFlukeGeo.rotateY(Math.PI);
    const upperFluke = new THREE.Mesh(upperFlukeGeo, bodyMat);
    upperFluke.position.set(0, 0.12, -1.08);
    upperFluke.castShadow = true;
    tailGroup.add(upperFluke);

    const lowerFlukeGeo = buildSculptedFinGeometry(0.62, 0.34, 0.08, 0.24, 0);
    lowerFlukeGeo.rotateZ(-Math.PI * 0.28);
    lowerFlukeGeo.rotateY(Math.PI);
    const lowerFluke = new THREE.Mesh(lowerFlukeGeo, bodyMat);
    lowerFluke.position.set(0, 0.02, -1.05);
    lowerFluke.castShadow = true;
    tailGroup.add(lowerFluke);

    rig.add(tailGroup);

    // 7. Soft Hydrofoil Side Pectoral Fins (Attached cleanly at Shoulder Ring s = 0.50!)
    const shoulderRing = evalSharkRing(0.50, plump);
    const leftFinPivot = new THREE.Group();
    leftFinPivot.position.set(shoulderRing.widthX - 0.06, shoulderRing.y, shoulderRing.centerZ + 0.08);
    const leftFinGeo = buildSculptedFinGeometry(0.92, 0.56, 0.11, 0.26, -0.14);
    const leftFin = new THREE.Mesh(leftFinGeo, bodyMat);
    leftFin.rotation.z = -0.35;
    leftFin.rotation.y = -0.18;
    leftFin.castShadow = true;
    leftFinPivot.add(leftFin);
    rig.add(leftFinPivot);

    const rightFinPivot = new THREE.Group();
    rightFinPivot.position.set(-(shoulderRing.widthX - 0.06), shoulderRing.y, shoulderRing.centerZ + 0.08);
    const rightFinGeo = buildSculptedFinGeometry(0.92, 0.56, 0.11, 0.26, -0.14);
    rightFinGeo.scale(-1, 1, 1);
    rightFinGeo.computeVertexNormals();
    const rightFin = new THREE.Mesh(rightFinGeo, bodyMat);
    rightFin.rotation.z = 0.35;
    rightFin.rotation.y = 0.18;
    rightFin.castShadow = true;
    rightFinPivot.add(rightFin);
    rig.add(rightFinPivot);

    // 8. Properly Fitted Scarf / Shawl Collar Sitting OUTSIDE the Neck Surface (Never Clips Back!)
    const neckRing = evalSharkRing(0.58, plump);
    const scarfGroup = new THREE.Group();
    scarfGroup.position.set(0, neckRing.y, neckRing.centerZ);

    const collar = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.14, 18, 36), scarfMat);
    collar.rotation.x = Math.PI / 2 + 0.08;
    // Scale X and Z to wrap 0.06 units outside neckRing.widthX and neckRing.depthBackZ!
    collar.scale.set(neckRing.widthX + 0.07, (neckRing.depthFrontZ + neckRing.depthBackZ) * 0.5 + 0.09, 1.0);
    collar.castShadow = true;
    scarfGroup.add(collar);

    const clasp = new THREE.Mesh(new THREE.OctahedronGeometry(0.14, 1), brassMat);
    clasp.position.set(0, -0.04, neckRing.depthFrontZ + 0.12);
    scarfGroup.add(clasp);
    rig.add(scarfGroup);

    // 9. Character-Specific Hats, Goggles, Hoods & Relics (Placed at Exact Crown Surface!)
    const crownRing = evalSharkRing(0.92, plump);
    if (config.id === 'hermes') {
      // Stitched Fabric Patch on left flank
      const flankRing = evalSharkRing(0.38, plump);
      const patch = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.30, 0.30),
        createPlushMaterial(0x7596b5)
      );
      patch.position.set(-(flankRing.widthX + 0.01), flankRing.y, flankRing.centerZ + 0.1);
      rig.add(patch);

      // Ornate Brass Between Lantern on left fin
      const lanternGroup = new THREE.Group();
      lanternGroup.position.set(0.78, -0.26, 0.22);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.18, 12), brassMat);
      roof.position.y = 0.22;
      lanternGroup.add(roof);
      const bulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.13, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0xffd885 })
      );
      lanternGroup.add(bulb);
      const lanLight = new THREE.PointLight(0xffb85c, 1.1, 9);
      lanternGroup.add(lanLight);
      leftFinPivot.add(lanternGroup);
    } else if (config.id === 'solomon') {
      // Star-Chef Toque Perched Proudly on Top of Head (y = 2.58)!
      const hatBand = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.40, 0.16, 28), scarfMat);
      hatBand.position.set(0, 2.58, crownRing.centerZ - 0.05);
      hatBand.rotation.x = -0.15;
      rig.add(hatBand);

      const hatCrown = new THREE.Mesh(
        new THREE.SphereGeometry(0.42, 24, 20),
        createPlushMaterial(0xf7f1e3)
      );
      hatCrown.scale.set(1.08, 0.85, 1.05);
      hatCrown.position.set(0, 2.78, crownRing.centerZ - 0.08);
      rig.add(hatCrown);

      // Golden Teapot on Brass Saucer
      const trayGroup = new THREE.Group();
      trayGroup.position.set(0.68, -0.06, 0.26);
      const saucer = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.26, 0.04, 20), brassMat);
      saucer.position.y = -0.16;
      trayGroup.add(saucer);
      const potBody = new THREE.Mesh(new THREE.SphereGeometry(0.21, 20, 18), brassMat);
      trayGroup.add(potBody);
      leftFinPivot.add(trayGroup);
    } else if (config.id === 'hiram') {
      // Builder Goggles on Forehead (s = 0.90)
      const gRing = evalSharkRing(0.90, plump);
      const lensMat = new THREE.MeshStandardMaterial({ color: 0x7dd3fc, roughness: 0.1, metalness: 0.6 });
      [-0.22, 0.22].forEach((gx) => {
        const gFrame = new THREE.Mesh(new THREE.TorusGeometry(0.135, 0.032, 12, 24), brassMat);
        gFrame.position.set(gx, gRing.y + 0.04, gRing.centerZ + gRing.depthFrontZ * 0.92);
        gFrame.rotation.x = -0.25;
        rig.add(gFrame);
        const lens = new THREE.Mesh(new THREE.CircleGeometry(0.12, 20), lensMat);
        lens.position.copy(gFrame.position);
        lens.rotation.copy(gFrame.rotation);
        rig.add(lens);
      });

      // Sacred Allen Key on Left Fin
      const allenGroup = new THREE.Group();
      allenGroup.position.set(0.68, -0.08, 0.24);
      const hex1 = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.62, 6), brassMat);
      allenGroup.add(hex1);
      const hex2 = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.28, 6), brassMat);
      hex2.rotation.z = Math.PI / 2;
      hex2.position.set(0.12, 0.29, 0);
      allenGroup.add(hex2);
      leftFinPivot.add(allenGroup);
    } else if (config.id === 'nimue') {
      // Glowing Crystal Pendant on Chest
      const crystal = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.18, 0),
        new THREE.MeshBasicMaterial({ color: 0xd8b4fe })
      );
      crystal.position.set(0, neckRing.y - 0.18, neckRing.centerZ + neckRing.depthFrontZ + 0.16);
      rig.add(crystal);
      const cLight = new THREE.PointLight(0xc084fc, 0.85, 6);
      cLight.position.copy(crystal.position);
      rig.add(cLight);
    } else if (config.type === 'pink_shark') {
      // Plush Russian Ushanka of Vigilance Perched on Crown (y = 2.60)
      const ushMat = createPlushMaterial(0x543442, false);
      const badgeMat = new THREE.MeshBasicMaterial({ color: 0xf5cd79 });

      const ushCrown = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.48, 0.34, 24), ushMat);
      ushCrown.position.set(0, 2.62, crownRing.centerZ - 0.02);
      rig.add(ushCrown);

      const ushVisor = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.24, 0.15), ushMat);
      ushVisor.position.set(0, 2.62, crownRing.centerZ + 0.45);
      rig.add(ushVisor);

      [-0.48, 0.48].forEach((ex) => {
        const earFlap = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 14), ushMat);
        earFlap.scale.set(0.6, 1.4, 0.9);
        earFlap.position.set(ex, 2.44, crownRing.centerZ);
        rig.add(earFlap);
      });

      const starBadge = new THREE.Mesh(new THREE.OctahedronGeometry(0.09, 0), badgeMat);
      starBadge.position.set(0, 2.63, crownRing.centerZ + 0.54);
      rig.add(starBadge);

      if (config.hasClipboard) {
        const board = new THREE.Mesh(
          new THREE.BoxGeometry(0.42, 0.56, 0.04),
          new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.75 })
        );
        board.position.set(-0.62, 0.02, 0.32);
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
      walkPhase: Math.random() * Math.PI * 2
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

    if (ud.beepTimer > 0) {
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
