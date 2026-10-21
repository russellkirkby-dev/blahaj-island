// ============================================================================
// BLÅHAJ ISLAND — ARCHIPELAGO (4 OUTER ISLANDS), HIRAM BUILDER, 3D GRASS & DUNGEON
// ============================================================================

window.BlahajWorld = (function () {
  const animatedObjects = [];
  const seamRifts = [];
  const balconyCarrots = [];
  const birbFlock = [];
  const fishSchool = [];
  const beachBalls = [];
  const activeBrebLoaves = [];
  const dungeonTraps = [];
  const builtStructures = [];
  const signposts = [];
  const cloudClusters = [];
  const fleetBoats = [];

  let boatMesh = null;
  let partnerBoatMesh = null;
  let lavaLight = null;
  let waterMesh = null;
  let waterUniforms = null;
  let grassUniforms = null;
  let emberSystem = null;
  let terrainBumpTex = null;

  // Road spline segments radiating from Sacred Tea House Hub (0, 10) to all High Island landmarks
  const ROAD_SEGMENTS = [
    { x1: 0, z1: 48, x2: 0, z2: 10, w: 3.1 },      // South Harbour Road
    { x1: 0, z1: 10, x2: 68, z2: -10, w: 2.7 },    // East Portal Way
    { x1: 0, z1: 10, x2: 49, z2: -45, w: 2.6 },    // Northeast Library Trail
    { x1: 0, z1: 10, x2: -48, z2: 32, w: 2.6 },    // Southwest Spherical Foods Boulevard
    { x1: 0, z1: 10, x2: -60, z2: -14, w: 2.6 },   // West Laundry Lane
    { x1: 0, z1: 10, x2: -14, z2: -36, w: 2.9 }    // North Volcano Approach
  ];

  function distToSegment(px, pz, x1, z1, x2, z2) {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const l2 = dx * dx + dz * dz;
    if (l2 === 0) return Math.hypot(px - x1, pz - z1);
    const t = Math.max(0, Math.min(1, ((px - x1) * dx + (pz - z1) * dz) / l2));
    return Math.hypot(px - (x1 + t * dx), pz - (z1 + t * dz));
  }

  function isOnIslandRoad(x, z) {
    // Isthmus Causeway to Volcano
    if (z < -34 && z > -104) {
      const spineX = -14 - Math.sin(((-z - 32) / 73) * Math.PI * 0.65) * 10;
      if (Math.abs(x - spineX) < 3.6) return true;
    }
    // Tea Plaza Ring
    const dTea = Math.hypot(x, z - 10);
    if (dTea > 6.5 && dTea < 11.2) return true;
    // Main Hub Roads
    for (let i = 0; i < ROAD_SEGMENTS.length; i++) {
      const s = ROAD_SEGMENTS[i];
      if (distToSegment(x, z, s.x1, s.z1, s.x2, s.z2) < s.w) return true;
    }
    return false;
  }

  // Analytical 3D Rolling Ocean Wave Height (matches GLSL vertex shader!)
  function getWaveHeight(x, z, time) {
    const w1 = Math.sin(x * 0.065 + time * 1.65) * Math.cos(z * 0.055 + time * 1.35) * 0.34;
    const w2 = Math.sin((x * 0.8 + z * 0.6) * 0.12 - time * 2.15) * 0.16;
    const w3 = Math.cos((x - z * 0.9) * 0.19 + time * 2.7) * 0.07;
    return 0.22 + w1 + w2 + w3;
  }

  // Definition of the 4 Outer Buildable Sanctuary Islands
  const OUTER_ISLANDS = [
    { id: 'hermes_atoll', x: 175, z: -10, radius: 46, elev: 3.8, dockX: 135, dockZ: -10, dockDir: 'x' },
    { id: 'solomon_cay', x: -165, z: 95, radius: 50, elev: 4.0, dockX: -126, dockZ: 68, dockDir: 'diag_ne' },
    { id: 'hiram_isle', x: -165, z: -90, radius: 48, elev: 4.4, dockX: -126, dockZ: -68, dockDir: 'diag_se' },
    { id: 'nimue_sanctuary', x: 165, z: -115, radius: 48, elev: 4.2, dockX: 128, dockZ: -88, dockDir: 'diag_sw' }
  ];

  function getTerrainBumpTexture() {
    if (terrainBumpTex) return terrainBumpTex;
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, 512, 512);

    for (let i = 0; i < 18000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const r = 1 + Math.random() * 3.5;
      const v = 90 + Math.floor(Math.random() * 80);
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    terrainBumpTex = new THREE.CanvasTexture(canvas);
    terrainBumpTex.wrapS = THREE.RepeatWrapping;
    terrainBumpTex.wrapT = THREE.RepeatWrapping;
    terrainBumpTex.repeat.set(34, 34);
    return terrainBumpTex;
  }

  function fbmNoise(x, z) {
    let v = 0;
    v += Math.sin(x * 0.035 + z * 0.025) * 1.8;
    v += Math.cos(x * 0.06 - z * 0.05) * 1.1;
    v += Math.sin(x * 0.13 + z * 0.11) * 0.45;
    v += Math.cos(x * 0.27 - z * 0.23) * 0.16;
    return v;
  }

  function smoothstep(edge0, edge1, x) {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  }

  // ==========================================================================
  // HEIGHTMAP: MAIN ISLAND, PENINSULA, 4 OUTER SANCTUARY ISLANDS & DUNGEON
  // ==========================================================================
  function isInsideVolcanoDungeon(x, z) {
    return Math.abs(x - -28) < 9.5 && z < -111 && z > -191;
  }

  function getTerrainHeight(x, z) {
    // 1. Rear Volcano Wharf (North side of Volcano Peninsula: x = -28, z = -185..-218)
    if (Math.abs(x - -28) < 8.5 && z <= -185 && z >= -218) {
      return 1.4;
    }

    // 2. Interior Volcano Trial Dungeon Bridge (x = -28, z = -185..-111)
    if (Math.abs(x - -28) < 7.8 && z <= -111 && z > -185) {
      const u = Math.max(0, Math.min(1, (z - -185) / (-113 - -185)));
      return 1.4 + u * 7.2;
    }

    // 3. Tea Docks in South Crescent Harbour (x: 0, z: 46..70)
    if (Math.abs(x) < 5.5 && z > 46 && z < 70) {
      return 1.35;
    }
    // 4. Endless Pier to Erf on Southeast Headland (x: 48, z: 46..78)
    if (Math.abs(x - 48) < 4.2 && z > 46 && z < 78) {
      return 1.45;
    }

    // 4b. Sanctuary Island Wooden Docks
    for (let i = 0; i < OUTER_ISLANDS.length; i++) {
      const isl = OUTER_ISLANDS[i];
      if (Math.abs(x - isl.dockX) < 5.2 && Math.abs(z - isl.dockZ) < 5.2) {
        return 1.4;
      }
    }

    // 5. Main Blåhaj Island multi-contour landmass
    const dxMain = x - 0;
    const dzMain = z - 12;
    const angleMain = Math.atan2(dzMain, dxMain);
    const coastRadius =
      74 +
      Math.cos(angleMain * 3 - 0.4) * 11 +
      Math.sin(angleMain * 5 + 1.1) * 6;
    const distMain = Math.sqrt(dxMain * dxMain + dzMain * dzMain);

    let hMain = -4.5;
    if (distMain < coastRadius + 16) {
      const landFactor = 1 - smoothstep(coastRadius * 0.35, coastRadius + 8, distMain);
      hMain = -2.2 + landFactor * 7.8 + fbmNoise(x, z) * landFactor * 1.35;
    }

    // Sheltered South Crescent Harbour Cove around (0, 66)
    const dHarbour = Math.sqrt(x * x + Math.pow(z - 70, 2));
    if (dHarbour < 28) {
      const coveFactor = 1 - smoothstep(8, 28, dHarbour);
      hMain -= coveFactor * 5.2;
    }

    // Heartland Plaza around Sacred Tea House (0, 10)
    const dTea = Math.sqrt(x * x + Math.pow(z - 10, 2));
    if (dTea < 18) {
      const f = 1 - smoothstep(9, 18, dTea);
      hMain = hMain * (1 - f) + 4.2 * f;
    }

    // Northeast Crust Cliffs & Observatory Highlands (52, -48)
    const dObs = Math.sqrt(Math.pow(x - 52, 2) + Math.pow(z - -48, 2));
    let hObs = -4.5;
    if (dObs < 34) {
      const fObs = 1 - smoothstep(11, 34, dObs);
      hObs = -1.5 + fObs * 13.0 + Math.sin(x * 0.2) * 0.35 * (1 - fObs);
    }

    // East Cape Peninsula for Great Portal Gate (72, -10)
    const dPortal = Math.sqrt(Math.pow(x - 72, 2) + Math.pow(z - -10, 2));
    let hPortal = -4.5;
    if (dPortal < 26) {
      const fPort = 1 - smoothstep(10, 26, dPortal);
      hPortal = -1.5 + fPort * 6.4;
    }

    // Southwest Bluff for Spherical Foods Café (-52, 34)
    const dSphere = Math.sqrt(Math.pow(x - -52, 2) + Math.pow(z - 34, 2));
    let hSphere = -4.5;
    if (dSphere < 26) {
      const fSph = 1 - smoothstep(10, 26, dSphere);
      hSphere = -1.5 + fSph * 8.2;
    }

    // Western Artisans' Ridge for Laundry of Initiation (-64, -14)
    const dLaundry = Math.sqrt(Math.pow(x - -64, 2) + Math.pow(z - -14, 2));
    let hLaundry = -4.5;
    if (dLaundry < 26) {
      const fLau = 1 - smoothstep(10, 26, dLaundry);
      hLaundry = -1.5 + fLau * 8.8;
    }

    // 6. THE SACRED VOLCANO PENINSULA (Isthmus + Volcano Cone + Front Temple Balcony)
    let hIsthmus = -4.5;
    if (z < -32 && z > -105) {
      const tIsth = (-z - 32) / 73;
      const spineX = -14 - Math.sin(tIsth * Math.PI * 0.65) * 10;
      const distFromSpine = Math.abs(x - spineX);
      const isthWidth = 13.5 - Math.sin(tIsth * Math.PI) * 3.5;
      if (distFromSpine < isthWidth + 10) {
        const fIsth = 1 - smoothstep(isthWidth * 0.45, isthWidth + 8, distFromSpine);
        const targetElev = 3.2 + Math.pow(tIsth, 1.35) * 13.3;
        hIsthmus = -2.5 + fIsth * (targetElev + 2.5);
      }
    }

    const vx = x - -28;
    const vz = z - -148;
    const dVolcano = Math.sqrt(vx * vx + vz * vz);
    const vAngle = Math.atan2(vz, vx);
    const penRadius = 64 + Math.cos(vAngle * 4) * 5 + Math.sin(vAngle * 7) * 3;

    let hVolcano = -4.5;
    if (dVolcano < penRadius) {
      const norm = 1 - dVolcano / penRadius;
      const ribs = Math.sin(vAngle * 9 + dVolcano * 0.05) * 1.8 * norm * (1 - Math.pow(norm, 3));
      let cone = -2.0 + Math.pow(norm, 1.5) * 66.0 + ribs;

      if (dVolcano < 11) {
        const craterDepth = Math.cos((dVolcano / 11) * (Math.PI * 0.5)) * 8.0;
        cone -= craterDepth;
      }

      const dTemple = Math.sqrt(Math.pow(x - -22, 2) + Math.pow(z - -103, 2));
      if (dTemple < 16) {
        const fTemp = 1 - smoothstep(9.0, 16, dTemple);
        cone = cone * (1 - fTemp) + 16.5 * fTemp;
      }

      hVolcano = cone;
    }

    // 7. THE 4 OUTER BUILDABLE SANCTUARY ISLANDS (Wide flat plateaus + sandy beaches!)
    let hOuter = -4.5;
    for (let i = 0; i < OUTER_ISLANDS.length; i++) {
      const isl = OUTER_ISLANDS[i];
      const dx = x - isl.x;
      const dz = z - isl.z;
      const ang = Math.atan2(dz, dx);
      const r = isl.radius + Math.cos(ang * 3 + i) * 4.5 + Math.sin(ang * 5 - i) * 2.5;
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d < r + 12) {
        // Flat, build-friendly top plateau inside 68% radius, smooth sandy beach outside!
        const f = 1 - smoothstep(r * 0.65, r + 6, d);
        const gentleRipple = Math.sin(x * 0.08 + z * 0.08) * 0.12 * f;
        const hIsl = -2.2 + f * (isl.elev + 2.2) + gentleRipple;
        if (hIsl > hOuter) hOuter = hIsl;
      }
    }

    return Math.max(hMain, hObs, hPortal, hSphere, hLaundry, hIsthmus, hVolcano, hOuter);
  }

  // Compute walkable surface height including Hiram's player-built Bridges, Stairs, Docks & Platforms!
  function getStructureSurfaceHeight(x, z, refY = null) {
    let bestY = -999;
    for (let i = 0; i < builtStructures.length; i++) {
      const st = builtStructures[i];
      const dx = x - st.x;
      const dz = z - st.z;
      // Rotate world delta into structure's local frame (-rotY)
      const cosR = Math.cos(-st.rotY);
      const sinR = Math.sin(-st.rotY);
      const lx = dx * cosR - dz * sinR;
      const lz = dx * sinR + dz * cosR;

      let surfY = -999;
      if (st.type === 'lagoon_bridge') {
        if (Math.abs(lx) <= 2.45 && Math.abs(lz) <= 6.3) {
          // Gentle bridge arch
          const arch = Math.cos((lz / 6.3) * (Math.PI * 0.5)) * 0.45;
          surfY = st.y + 0.35 + arch;
        }
      } else if (st.type === 'sky_stairs') {
        if (Math.abs(lx) <= 2.25 && Math.abs(lz) <= 5.3) {
          const u = Math.max(0, Math.min(1, (lz + 5.0) / 10.0));
          surfY = st.y + u * 3.5;
        }
      } else if (st.type === 'custom_wharf') {
        if (Math.abs(lx) <= 2.35 && Math.abs(lz) <= 5.2) {
          surfY = st.y + 0.45;
        }
      } else if (st.type === 'stepping_stone') {
        if (lx * lx + lz * lz <= 10.5) {
          surfY = st.y + 0.45;
        }
      } else if (st.type === 'tea_gazebo') {
        if (lx * lx + lz * lz <= 13.0) {
          surfY = st.y + 0.38;
        }
      } else if (st.type === 'birch_cabin') {
        if (Math.abs(lx) <= 3.4 && Math.abs(lz) <= 3.8) {
          surfY = st.y + 0.32;
        }
      } else if (st.type === 'bounce_pad') {
        if (lx * lx + lz * lz <= 5.5) {
          surfY = st.y + 0.45;
        }
      } else if (st.type === 'carrot_ramp') {
        if (Math.abs(lx) <= 1.8 && Math.abs(lz) <= 3.2) {
          const u = Math.max(0, Math.min(1, (lz + 3.0) / 6.0));
          surfY = st.y + u * 1.9;
        }
      }

      if (surfY > -900) {
        if (refY === null || surfY <= refY + 2.8) {
          if (surfY > bestY) bestY = surfY;
        }
      }
    }
    return bestY;
  }

  function getGroundAndStructureHeight(x, z, refY = null) {
    const tY = getTerrainHeight(x, z);
    const sY = getStructureSurfaceHeight(x, z, refY);
    return Math.max(tY, sY);
  }

  // Terrain surface height purely for the outer mountain mesh (so the volcano mountain arches cleanly over the interior dungeon!)
  function getExteriorMountainHeight(x, z) {
    if (Math.abs(x - -28) < 12.5 && z < -184 && z >= -222) {
      return -2.5;
    }
    if (Math.abs(x - -28) < 14.0 && z <= -110 && z >= -184) {
      const vx = x - -28;
      const vz = z - -148;
      const dVolcano = Math.sqrt(vx * vx + vz * vz);
      const norm = Math.max(0, 1 - dVolcano / 64);
      return Math.max(20.0, -2.0 + Math.pow(norm, 1.5) * 66.0);
    }
    return getTerrainHeight(x, z);
  }

  // ==========================================================================
  // BUILD WORLD
  // ==========================================================================
  function buildWorld(scene) {
    scene.background = new THREE.Color(0x161f36);
    scene.fog = new THREE.FogExp2(0x1e2842, 0.0015);

    const hemiLight = new THREE.HemisphereLight(0xffd6a5, 0x283b5e, 0.8);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffb163, 1.28);
    dirLight.position.set(-90, 140, 80);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 10;
    dirLight.shadow.camera.far = 520;
    const d = 240;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    dirLight.shadow.bias = -0.0005;
    scene.add(dirLight);

    buildSkyDomeAndSkySeam(scene);

    // Sculpted Exterior Terrain Mesh (560x560 units covering Main Island + 4 Outer Sanctuary Islands!)
    const terrainGeo = new THREE.PlaneGeometry(560, 560, 280, 280);
    terrainGeo.rotateX(-Math.PI / 2);
    const posAttr = terrainGeo.attributes.position;
    const colors = [];

    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      const vz = posAttr.getZ(i);
      const vy = getExteriorMountainHeight(vx, vz);
      posAttr.setY(i, vy);

      const dVol = Math.sqrt(Math.pow(vx - -28, 2) + Math.pow(vz - -148, 2));
      const vAng = Math.atan2(vz - -148, vx - -28);
      const c = new THREE.Color();

      const onRoad = isOnIslandRoad(vx, vz);

      if (dVol < 10.5 && vy > 46) {
        c.setHex(0xff5e1a);
      } else if (dVol < 64 && vy > 5.0) {
        const lavaStream = Math.pow(Math.abs(Math.sin(vAng * 5 + dVol * 0.085)), 18);
        const dTemple = Math.sqrt(Math.pow(vx - -22, 2) + Math.pow(vz - -103, 2));
        if (lavaStream > 0.62 && vy > 9.0 && dTemple > 12) {
          c.setHex(0xff6a1f);
        } else if (dTemple < 11.5) {
          c.setHex(0x3a3447);
        } else {
          const shade = 0.14 + (vy / 70) * 0.08;
          c.setRGB(shade + 0.03, shade, shade + 0.04);
        }
      } else if (vy < 0.95) {
        c.setHex(0xdec59b);
      } else if (onRoad) {
        const cobbleNoise = Math.sin(vx * 1.4) * Math.cos(vz * 1.4) * 0.035;
        c.setRGB(0.62 + cobbleNoise, 0.54 + cobbleNoise, 0.45 + cobbleNoise);
      } else if (vx > 28 && vz < -25 && vy > 5.5) {
        c.setHex(0x9e7446);
      } else {
        const n = Math.sin(vx * 0.09) * Math.cos(vz * 0.09) * 0.04;
        c.setRGB(0.21 + n, 0.42 + n * 1.2, 0.27 + n);
      }
      colors.push(c.r, c.g, c.b);
    }

    terrainGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    terrainGeo.computeVertexNormals();

    const terrainMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.86,
      metalness: 0.05,
      bumpMap: getTerrainBumpTexture(),
      bumpScale: 0.14
    });
    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    terrainMesh.receiveShadow = true;
    scene.add(terrainMesh);

    // Build Swaying 3D Instanced Grass Blades across the Main Island & 4 Outer Sanctuary Islands!
    buildInstancedMeadowGrass(scene);

    // Build Custom GLSL Rolling 3D Ocean Wave Shader
    buildShaderWater(scene);

    // Build Volumetric Sunset Clouds, Wildflowers, Cobblestone Flagstones & Crossroads Signposts!
    buildVolumetricCloudsAndWildflowers(scene);
    buildRoadsAndSignposts(scene);

    // Build Landmarks, Volcano Peninsula, Rear Wharf, Dungeon & 4 Outer Sanctuary Islands
    buildVolcanoPeninsulaAndBalcony(scene);
    buildRearVolcanoWharfAndDungeon(scene);
    buildSacredTeaHouseVillage(scene);
    buildGreatPortalGateHeadland(scene);
    buildSphericalFoodsBluff(scene);
    buildQuietLibraryAndCrustCliffs(scene);
    buildLaundryShrineRidge(scene);
    buildTeaDocksAndRegattaBoat(scene);
    buildEndlessPierToErf(scene);
    buildOuterSanctuaryIslands(scene);
    buildLushPalmsBouldersAndLanterns(scene);
    buildGreatSeamRifts(scene);

    // Build Living World: Flocks of Birbs, Swimming Fishes & Bouncy Beach Balls!
    buildBirbFlocks(scene);
    buildWaterFishesAndBeachBalls(scene);

    return {
      getTerrainHeight,
      getGroundAndStructureHeight,
      getStructureSurfaceHeight,
      isInsideVolcanoDungeon,
      isOnIslandRoad,
      getWaveHeight,
      getSignposts: () => signposts,
      getBoatMesh: () => boatMesh,
      getFleetBoats: () => fleetBoats,
      setActiveBoat: (b) => {
        if (b) boatMesh = b;
      },
      getPartnerBoatMesh: () => partnerBoatMesh,
      getSeamRifts: () => seamRifts,
      getBalconyCarrots: () => balconyCarrots,
      getBirbFlock: () => birbFlock,
      getBeachBalls: () => beachBalls,
      getDungeonTraps: () => dungeonTraps,
      getBuiltStructures: () => builtStructures,
      createStructureMesh: (type, isPreview) => createStructureMesh(type, isPreview),
      placeBuiltStructure: (itemData) => placeBuiltStructure(scene, itemData),
      removeBuiltStructure: (id) => removeBuiltStructure(scene, id),
      spawnBrebLoaf: (pos) => spawnBrebLoaf(scene, pos)
    };
  }

  // ==========================================================================
  // 22,000 SWAYING 3D GRASS BLADES (MAIN ISLAND + 4 OUTER SANCTUARY ISLANDS!)
  // ==========================================================================
  function buildInstancedMeadowGrass(scene) {
    const bladeCount = 22000;
    const bladeGeo = new THREE.ConeGeometry(0.11, 0.85, 4, 1, true);
    bladeGeo.translate(0, 0.42, 0);

    grassUniforms = { uTime: { value: 0 } };
    const bladeMat = new THREE.MeshStandardMaterial({
      color: 0x438a4e,
      roughness: 0.78,
      metalness: 0.02,
      side: THREE.DoubleSide
    });

    bladeMat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = grassUniforms.uTime;
      shader.vertexShader =
        `uniform float uTime;\n` +
        shader.vertexShader.replace(
          '#include <begin_vertex>',
          `
          #include <begin_vertex>
          float worldX = instanceMatrix[3][0];
          float worldZ = instanceMatrix[3][2];
          float sway = sin(uTime * 2.4 + worldX * 0.18 + worldZ * 0.15) * 0.22 * position.y;
          transformed.x += sway;
          transformed.z += cos(uTime * 1.9 + worldZ * 0.2) * 0.14 * position.y;
          `
        );
    };

    const instMesh = new THREE.InstancedMesh(bladeGeo, bladeMat, bladeCount);
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    let placed = 0;

    // 1. Place 15,000 blades on the Main Island
    for (let attempt = 0; attempt < 38000 && placed < 15000; attempt++) {
      const gx = (Math.random() - 0.5) * 170;
      const gz = (Math.random() - 0.5) * 155 + 10;
      const gy = getTerrainHeight(gx, gz);

      const dTea = Math.sqrt(gx * gx + Math.pow(gz - 10, 2));
      const dVol = Math.sqrt(Math.pow(gx - -28, 2) + Math.pow(gz - -148, 2));
      if (gy > 1.45 && gy < 10.5 && dTea > 12.5 && dVol > 68 && gz > -38 && !isOnIslandRoad(gx, gz)) {
        dummy.position.set(gx, gy - 0.05, gz);
        dummy.rotation.set(
          (Math.random() - 0.5) * 0.2,
          Math.random() * Math.PI * 2,
          (Math.random() - 0.5) * 0.2
        );
        const s = 0.65 + Math.random() * 0.85;
        dummy.scale.set(s, s * (0.8 + Math.random() * 0.6), s);
        dummy.updateMatrix();
        instMesh.setMatrixAt(placed, dummy.matrix);

        color.setHSL(0.31 + (Math.random() - 0.5) * 0.06, 0.48, 0.32 + Math.random() * 0.14);
        instMesh.setColorAt(placed, color);
        placed++;
      }
    }

    // 2. Place 7,000 blades across the 4 Outer Buildable Sanctuary Islands!
    OUTER_ISLANDS.forEach((isl, idx) => {
      const targetForIsl = placed + 1750;
      for (let attempt = 0; attempt < 6000 && placed < targetForIsl && placed < bladeCount; attempt++) {
        const r = Math.sqrt(Math.random()) * (isl.radius * 0.82);
        const th = Math.random() * Math.PI * 2;
        const gx = isl.x + Math.cos(th) * r;
        const gz = isl.z + Math.sin(th) * r;
        const gy = getTerrainHeight(gx, gz);
        if (gy > 1.65) {
          dummy.position.set(gx, gy - 0.05, gz);
          dummy.rotation.set(
            (Math.random() - 0.5) * 0.2,
            Math.random() * Math.PI * 2,
            (Math.random() - 0.5) * 0.2
          );
          const s = 0.65 + Math.random() * 0.85;
          dummy.scale.set(s, s * (0.8 + Math.random() * 0.6), s);
          dummy.updateMatrix();
          instMesh.setMatrixAt(placed, dummy.matrix);

          color.setHSL(0.3 + idx * 0.012 + (Math.random() - 0.5) * 0.05, 0.5, 0.33 + Math.random() * 0.14);
          instMesh.setColorAt(placed, color);
          placed++;
        }
      }
    });

    instMesh.count = placed;
    instMesh.instanceMatrix.needsUpdate = true;
    if (instMesh.instanceColor) instMesh.instanceColor.needsUpdate = true;
    scene.add(instMesh);
  }

  // ==========================================================================
  // ROLLING 3D OCEAN WAVES, SURF FOAM, VOLUMETRIC CLOUDS, ROADS & SIGNPOSTS
  // ==========================================================================
  function buildShaderWater(scene) {
    const waterGeo = new THREE.PlaneGeometry(820, 820, 220, 220);
    waterGeo.rotateX(-Math.PI / 2);

    const pos = waterGeo.attributes.position;
    const shoreDepth = new Float32Array(pos.count);
    for (let i = 0; i < pos.count; i++) {
      const wx = pos.getX(i);
      const wz = pos.getZ(i);
      shoreDepth[i] = getExteriorMountainHeight(wx, wz);
    }
    waterGeo.setAttribute('aTerrainH', new THREE.BufferAttribute(shoreDepth, 1));

    waterUniforms = { uTime: { value: 0 } };

    const waterMat = new THREE.ShaderMaterial({
      uniforms: waterUniforms,
      transparent: true,
      vertexShader: `
        uniform float uTime;
        attribute float aTerrainH;
        varying float vTerrainH;
        varying float vWave;
        varying vec2 vWorldXZ;

        void main() {
          vTerrainH = aTerrainH;
          vec3 p = position;
          vWorldXZ = p.xz;
          // 3-Layer Rolling Ocean Swells (matches getWaveHeight in JS)
          float w1 = sin(p.x * 0.065 + uTime * 1.65) * cos(p.z * 0.055 + uTime * 1.35) * 0.34;
          float w2 = sin((p.x * 0.8 + p.z * 0.6) * 0.12 - uTime * 2.15) * 0.16;
          float w3 = cos((p.x - p.z * 0.9) * 0.19 + uTime * 2.7) * 0.07;
          p.x += cos(p.x * 0.065 + uTime * 1.65) * 0.14;
          p.z += sin(p.z * 0.055 + uTime * 1.35) * 0.14;
          p.y += w1 + w2 + w3;
          vWave = w1 + w2 + w3;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying float vTerrainH;
        varying float vWave;
        varying vec2 vWorldXZ;

        void main() {
          float shallow = smoothstep(-4.4, 0.45, vTerrainH);
          vec3 abyssCol = vec3(0.05, 0.17, 0.33);
          vec3 reefCol = vec3(0.11, 0.56, 0.69);
          vec3 lagoonCol = vec3(0.28, 0.78, 0.82);
          vec3 col = mix(abyssCol, reefCol, shallow);
          col = mix(col, lagoonCol, smoothstep(-1.4, 0.25, vTerrainH) * 0.65);

          // Caustic shimmer in shallow lagoons
          float caustics = sin(vWorldXZ.x * 0.45 + uTime * 2.2) * cos(vWorldXZ.y * 0.45 - uTime * 1.8);
          col += vec3(0.18, 0.35, 0.38) * max(0.0, caustics) * shallow * 0.25;

          // Golden sunset glint on rolling wave crests
          float crest = smoothstep(0.10, 0.48, vWave);
          float whitecap = smoothstep(0.36, 0.55, vWave);
          col += vec3(1.0, 0.72, 0.42) * crest * 0.28;
          col = mix(col, vec3(0.98, 0.96, 0.92), whitecap * 0.42);

          // Dual-band animated surf foam washing onto every island's beach
          float shoreZone = smoothstep(-1.25, 0.32, vTerrainH) * (1.0 - smoothstep(0.32, 0.95, vTerrainH));
          float surfWave1 = smoothstep(0.35, 0.85, 0.5 + 0.5 * sin(vTerrainH * 15.0 - uTime * 3.4 + sin(vWorldXZ.x * 0.15) * 1.2));
          float surfWave2 = smoothstep(0.55, 0.95, 0.5 + 0.5 * cos(vTerrainH * 24.0 - uTime * 2.6 + cos(vWorldXZ.y * 0.15) * 1.2));
          float foamMask = clamp((surfWave1 * 0.75 + surfWave2 * 0.55) * shoreZone, 0.0, 1.0);
          col = mix(col, vec3(0.98, 0.95, 0.90), foamMask * 0.88);

          gl_FragColor = vec4(col, 0.90);
        }
      `
    });

    waterMesh = new THREE.Mesh(waterGeo, waterMat);
    waterMesh.position.y = 0.22;
    scene.add(waterMesh);
  }

  function buildVolumetricCloudsAndWildflowers(scene) {
    // 1. 18 Sculpted Volumetric Sunset Cloud Clusters drifting around High Island & Volcano Peak
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xffe8d6,
      emissive: 0x4a2538,
      emissiveIntensity: 0.28,
      roughness: 0.92,
      metalness: 0.0
    });

    for (let i = 0; i < 18; i++) {
      const cluster = new THREE.Group();
      const angle = (i / 18) * Math.PI * 2;
      const radius = 145 + (i % 3) * 48;
      const height = 58 + (i % 4) * 12;
      const puffCount = 5 + (i % 3);

      for (let p = 0; p < puffCount; p++) {
        const pr = 5.5 + ((i + p) % 3) * 2.4;
        const puff = new THREE.Mesh(new THREE.DodecahedronGeometry(pr, 1), cloudMat);
        puff.position.set((p - puffCount * 0.5) * 5.2, Math.sin(p * 1.5) * 1.8, (p % 2 === 0 ? 1 : -1) * 2.4);
        puff.scale.set(1.35, 0.68, 1.05);
        cluster.add(puff);
      }

      cluster.position.set(Math.cos(angle) * radius, height, Math.sin(angle) * radius - 25);
      cluster.rotation.y = -angle + Math.PI * 0.5;
      scene.add(cluster);
      cloudClusters.push({ mesh: cluster, angle, radius, height, speed: 0.012 + (i % 4) * 0.004 });
    }

    // 2. 2,200 Instanced Meadow Wildflowers (Golden Buttercups, Lavender Asters & Coral Blossoms)
    const flowerCount = 2200;
    const flowerGeo = new THREE.OctahedronGeometry(0.18, 0);
    flowerGeo.scale(1.2, 0.55, 1.2);
    flowerGeo.translate(0, 0.52, 0);
    const flowerMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const flowerInst = new THREE.InstancedMesh(flowerGeo, flowerMat, flowerCount);
    const dummy = new THREE.Object3D();
    const fCol = new THREE.Color();
    const palette = [0xffd166, 0xff7eb6, 0xc084fc, 0x7ce8ff, 0xfff3b0];
    let fPlaced = 0;

    for (let attempt = 0; attempt < 6500 && fPlaced < flowerCount; attempt++) {
      const fx = (Math.random() - 0.5) * 155;
      const fz = (Math.random() - 0.5) * 145 + 10;
      const fy = getTerrainHeight(fx, fz);
      if (fy > 1.65 && fy < 9.5 && fz > -35 && !isOnIslandRoad(fx, fz)) {
        dummy.position.set(fx, fy, fz);
        dummy.rotation.y = Math.random() * Math.PI * 2;
        const s = 0.75 + Math.random() * 0.65;
        dummy.scale.setScalar(s);
        dummy.updateMatrix();
        flowerInst.setMatrixAt(fPlaced, dummy.matrix);
        fCol.setHex(palette[fPlaced % palette.length]);
        flowerInst.setColorAt(fPlaced, fCol);
        fPlaced++;
      }
    }
    flowerInst.count = fPlaced;
    flowerInst.instanceMatrix.needsUpdate = true;
    if (flowerInst.instanceColor) flowerInst.instanceColor.needsUpdate = true;
    scene.add(flowerInst);
  }

  function buildRoadsAndSignposts(scene) {
    // 1. Raised Cobblestone Stepping Flagstones along all 6 High Island Roads
    const stoneGeo = new THREE.CylinderGeometry(0.95, 1.05, 0.14, 7);
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x9c8c7a, roughness: 0.88 });
    const stoneInst = new THREE.InstancedMesh(stoneGeo, stoneMat, 320);
    const dummy = new THREE.Object3D();
    let sCount = 0;

    ROAD_SEGMENTS.forEach((seg, rIdx) => {
      const dist = Math.hypot(seg.x2 - seg.x1, seg.z2 - seg.z1);
      const steps = Math.floor(dist / 2.2);
      for (let s = 1; s < steps && sCount < 320; s++) {
        const t = s / steps;
        const jitter = ((s % 2 === 0 ? 1 : -1) * 0.45);
        const sx = seg.x1 + (seg.x2 - seg.x1) * t + jitter;
        const sz = seg.z1 + (seg.z2 - seg.z1) * t - jitter * 0.5;
        const sy = getTerrainHeight(sx, sz);
        if (sy > 0.8) {
          dummy.position.set(sx, sy + 0.02, sz);
          dummy.rotation.set(0, (s * 1.1 + rIdx), 0);
          dummy.scale.set(0.85 + (s % 3) * 0.2, 1, 0.8 + ((s + 1) % 3) * 0.2);
          dummy.updateMatrix();
          stoneInst.setMatrixAt(sCount++, dummy.matrix);
        }
      }
    });
    stoneInst.count = sCount;
    stoneInst.instanceMatrix.needsUpdate = true;
    stoneInst.receiveShadow = true;
    scene.add(stoneInst);

    // 2. Six Sculpted 3D Crossroads Signposts with Painted Arrow Boards & Hanging Lanterns
    const postWoodMat = new THREE.MeshStandardMaterial({ color: 0x543822, roughness: 0.85 });
    const boardWoodMat = new THREE.MeshStandardMaterial({ color: 0xc89d66, roughness: 0.78 });
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xf5cd79, metalness: 0.7, roughness: 0.25 });
    const lanternMat = new THREE.MeshBasicMaterial({ color: 0xffe299 });

    const signpostSpecs = [
      {
        id: 'sign-hub',
        x: 5.5,
        z: 18.5,
        title: '🪧 Central Plaza Crossroads',
        directions: '⬆️ Volcano Causeway | ➡️ Portal Gate & Library | ⬅️ Café & Laundry | ⬇️ Harbour Docks',
        arrows: [0, Math.PI * 0.5, -Math.PI * 0.5, Math.PI]
      },
      {
        id: 'sign-harbour',
        x: 4.2,
        z: 44.0,
        title: '🪧 South Crescent Harbour',
        directions: '⬆️ Sacred Tea House (35m) | ⛵ Regatta Sailboats & Endless Pier ➡️',
        arrows: [Math.PI, -Math.PI * 0.5]
      },
      {
        id: 'sign-volcano',
        x: -11.5,
        z: -33.0,
        title: '🪧 Volcano Isthmus Pass',
        directions: '⬆️ Volcano Balcony & Carrots (70m) | ⬇️ Tea House Village (45m)',
        arrows: [Math.PI, 0]
      },
      {
        id: 'sign-east',
        x: 44.0,
        z: -4.0,
        title: '🪧 East Headland Fork',
        directions: '➡️ Great Portal Gate (28m) | ↗️ Quiet Library Cliffs (42m) | ⬅️ Tea House',
        arrows: [-Math.PI * 0.4, -Math.PI * 0.8, Math.PI * 0.5]
      },
      {
        id: 'sign-west',
        x: -36.0,
        z: 12.0,
        title: '🪧 Artisans & Café Junction',
        directions: '↙️ Spherical Foods Café (26m) | ↖️ Spin-Dryer Laundry Ridge (34m) | ➡️ Tea House',
        arrows: [Math.PI * 0.3, Math.PI * 0.75, -Math.PI * 0.5]
      },
      {
        id: 'sign-balcony',
        x: -16.5,
        z: -98.0,
        title: '🪧 Volcano Temple Overlook',
        directions: '🥕 Dare-Carrot Ledge | 🌋 Trial Dungeon Exit | ⬇️ Return to High Island',
        arrows: [Math.PI * 0.5, 0]
      }
    ];

    signpostSpecs.forEach((sp) => {
      const sy = getTerrainHeight(sp.x, sp.z);
      const g = new THREE.Group();
      g.position.set(sp.x, sy, sp.z);

      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 3.6, 10), postWoodMat);
      post.position.y = 1.8;
      post.castShadow = true;
      g.add(post);

      const finial = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 12), brassMat);
      finial.position.y = 3.7;
      g.add(finial);

      sp.arrows.forEach((ang, idx) => {
        const arrowGroup = new THREE.Group();
        arrowGroup.position.y = 3.25 - idx * 0.42;
        arrowGroup.rotation.y = ang;

        const plank = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.28, 0.10), boardWoodMat);
        plank.position.x = 0.72;
        plank.castShadow = true;
        arrowGroup.add(plank);

        const tip = new THREE.Mesh(new THREE.ConeGeometry(0.20, 0.35, 4), brassMat);
        tip.rotation.z = -Math.PI / 2;
        tip.position.x = 1.68;
        arrowGroup.add(tip);

        g.add(arrowGroup);
      });

      const lanternArm = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.1, 0.1), brassMat);
      lanternArm.position.set(-0.32, 3.4, 0);
      g.add(lanternArm);

      const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 10), lanternMat);
      lantern.position.set(-0.62, 3.12, 0);
      g.add(lantern);

      scene.add(g);
      signposts.push({
        id: sp.id,
        title: sp.title,
        directions: sp.directions,
        pos: new THREE.Vector3(sp.x, sy + 4.1, sp.z),
        mesh: g
      });
    });
  }

  function buildSkyDomeAndSkySeam(scene) {
    const skyGeo = new THREE.SphereGeometry(380, 40, 28);
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition).y;
          vec3 horizonCol = vec3(0.88, 0.46, 0.28);
          vec3 midCol = vec3(0.32, 0.22, 0.44);
          vec3 zenithCol = vec3(0.06, 0.09, 0.18);
          vec3 col = mix(horizonCol, midCol, smoothstep(-0.05, 0.28, h));
          col = mix(col, zenithCol, smoothstep(0.22, 0.75, h));
          gl_FragColor = vec4(col, 1.0);
        }
      `
    });
    scene.add(new THREE.Mesh(skyGeo, skyMat));

    const starGeo = new THREE.BufferGeometry();
    const starPts = [];
    for (let i = 0; i < 2000; i++) {
      const r = 340;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.46;
      starPts.push(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.cos(phi) + 18,
        r * Math.sin(phi) * Math.sin(theta)
      );
    }
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPts, 3));
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xfff5db, size: 1.1 })));

    const seamPts = [];
    for (let i = -10; i <= 10; i++) {
      seamPts.push(new THREE.Vector3(i * 22, 118 - Math.abs(i) * 2.1, -60 + Math.sin(i * 0.5) * 26));
    }
    const curve = new THREE.CatmullRomCurve3(seamPts);
    scene.add(
      new THREE.Mesh(
        new THREE.TubeGeometry(curve, 80, 1.1, 12, false),
        new THREE.MeshBasicMaterial({ color: 0xa855f7, transparent: true, opacity: 0.78 })
      )
    );
    scene.add(
      new THREE.Mesh(
        new THREE.TubeGeometry(curve, 80, 0.42, 8, false),
        new THREE.MeshBasicMaterial({ color: 0xfde047 })
      )
    );
  }

  // ==========================================================================
  // VOLCANO PENINSULA SANCTUARY BALCONY & KNOCK-OFF-THE-CARROTS MINI-GAME!
  // ==========================================================================
  function buildVolcanoPeninsulaAndBalcony(scene) {
    const group = new THREE.Group();
    const basaltMat = new THREE.MeshStandardMaterial({
      color: 0x2c2836,
      roughness: 0.82,
      bumpMap: getTerrainBumpTexture(),
      bumpScale: 0.08
    });
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xd8aa5b, roughness: 0.28, metalness: 0.84 });
    const lavaMat = new THREE.MeshBasicMaterial({ color: 0xff621a });

    const calderaPool = new THREE.Mesh(new THREE.CylinderGeometry(9.8, 8.2, 2.2, 32), lavaMat);
    calderaPool.position.set(-28, 57.5, -148);
    group.add(calderaPool);

    lavaLight = new THREE.PointLight(0xff591c, 3.2, 165);
    lavaLight.position.set(-28, 66, -144);
    group.add(lavaLight);

    // Rising Ember Plume
    const emberGeo = new THREE.BufferGeometry();
    const emberCount = 260;
    const emberPositions = new Float32Array(emberCount * 3);
    for (let i = 0; i < emberCount; i++) {
      emberPositions[i * 3] = -28 + (Math.random() - 0.5) * 22;
      emberPositions[i * 3 + 1] = 56 + Math.random() * 55;
      emberPositions[i * 3 + 2] = -148 + (Math.random() - 0.5) * 22;
    }
    emberGeo.setAttribute('position', new THREE.BufferAttribute(emberPositions, 3));
    emberSystem = new THREE.Points(
      emberGeo,
      new THREE.PointsMaterial({ color: 0xff9436, size: 1.35, transparent: true, opacity: 0.85 })
    );
    group.add(emberSystem);

    // Isthmus Torii Gates
    for (let g = 0; g < 4; g++) {
      const gz = -44 - g * 14;
      const tIsth = (-gz - 32) / 73;
      const gx = -14 - Math.sin(tIsth * Math.PI * 0.65) * 10;
      const gy = getTerrainHeight(gx, gz);

      const gate = new THREE.Group();
      gate.position.set(gx, gy, gz);
      [-3.8, 3.8].forEach((px) => {
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.48, 6.2, 14), basaltMat);
        col.position.set(px, 3.1, 0);
        col.castShadow = true;
        gate.add(col);
      });
      const crossBeam = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.65, 0.85), basaltMat);
      crossBeam.position.y = 6.1;
      gate.add(crossBeam);
      group.add(gate);
    }

    // High Volcano Temple Balcony at (-22, 16.5, -103)
    const tx = -22;
    const tz = -103;
    const ty = 16.5;

    const templeGroup = new THREE.Group();
    templeGroup.position.set(tx, ty, tz);

    // Dramatic Overhanging Balcony Platform jutting out over the steep slope!
    const balconySlab = new THREE.Mesh(new THREE.CylinderGeometry(13.5, 11.2, 2.2, 32), basaltMat);
    balconySlab.position.y = -0.8;
    balconySlab.receiveShadow = true;
    templeGroup.add(balconySlab);

    // Ornate Exit Archway from the Interior Volcano Dungeon onto the Balcony!
    [-4.2, 4.2].forEach((px) => {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.72, 7.6, 16), basaltMat);
      col.position.set(px, 3.8, -6.5);
      templeGroup.add(col);
    });
    const frieze = new THREE.Mesh(new THREE.BoxGeometry(11.4, 1.8, 2.2), basaltMat);
    frieze.position.set(0, 8.0, -6.5);
    templeGroup.add(frieze);

    // Glowing Dungeon Exit Portal Arch in back of Balcony
    const exitGlow = new THREE.Mesh(
      new THREE.PlaneGeometry(6.8, 6.4),
      new THREE.MeshBasicMaterial({ color: 0xff7b29, side: THREE.DoubleSide, transparent: true, opacity: 0.55 })
    );
    exitGlow.position.set(0, 3.4, -6.4);
    templeGroup.add(exitGlow);

    // Central Lava Brazier Altar
    const altarBase = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.5, 2.4), basaltMat);
    altarBase.position.set(0, 0.9, -2.2);
    templeGroup.add(altarBase);

    const sacredFlame = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.95, 2),
      new THREE.MeshBasicMaterial({ color: 0xff8c38, wireframe: true })
    );
    sacredFlame.position.set(0, 2.8, -2.2);
    templeGroup.add(sacredFlame);
    animatedObjects.push({ mesh: sacredFlame, type: 'spin_bob', baseY: 2.8 });

    group.add(templeGroup);
    scene.add(group);

    // Spawn 8 Knockable Physics Beach-Shorts Carrots along the edge of the Volcano Balcony!
    const carrotColors = [0xef4444, 0x10b981, 0xf59e0b, 0x8b5cf6, 0x3b82f6, 0xec4899, 0x14b8a6, 0xf97316];
    carrotColors.forEach((col, idx) => {
      const angle = -0.95 + (idx / 7) * 1.9; // Spread along the front cliff edge of the balcony
      const homeX = tx + Math.sin(angle) * 10.2;
      const homeZ = tz + Math.cos(angle) * 10.2;
      const homeY = ty + 0.3;

      const cMesh = window.BlahajModels.createBeachCarrot(col);
      cMesh.position.set(homeX, homeY, homeZ);
      cMesh.rotation.y = angle + Math.PI;
      scene.add(cMesh);

      balconyCarrots.push({
        id: `carrot-${idx}`,
        mesh: cMesh,
        homePos: new THREE.Vector3(homeX, homeY, homeZ),
        vel: new THREE.Vector3(0, 0, 0),
        knockedOff: false,
        respawnTimer: 0
      });
    });
  }

  // ==========================================================================
  // REAR VOLCANO WHARF & INTERIOR VOLCANO TRIAL DUNGEON (WITH TRAPS!)
  // ==========================================================================
  function buildRearVolcanoWharfAndDungeon(scene) {
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x4f3522, roughness: 0.85 });
    const basaltMat = new THREE.MeshStandardMaterial({ color: 0x241f2e, roughness: 0.85 });
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xd8aa5b, roughness: 0.28, metalness: 0.85 });
    const lavaMat = new THREE.MeshBasicMaterial({ color: 0xff4d12 });
    const bladeMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.2, metalness: 0.9 });

    // 1. Rear Volcano Wharf at North End of Peninsula (x = -28, z = -188..-216)
    const wharfGroup = new THREE.Group();
    const dock = new THREE.Mesh(new THREE.BoxGeometry(8.5, 0.7, 28), woodMat);
    dock.position.set(-28, 1.4, -202);
    dock.receiveShadow = true;
    wharfGroup.add(dock);

    // Torch pillars flanking the Rear Volcano Wharf
    [-3.6, 3.6].forEach((px) => {
      [-212, -198, -187].forEach((pz) => {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 4.2, 10), woodMat);
        post.position.set(-28 + px, 3.2, pz);
        wharfGroup.add(post);
        const flame = new THREE.Mesh(
          new THREE.SphereGeometry(0.32, 12, 12),
          new THREE.MeshBasicMaterial({ color: 0xff7724 })
        );
        flame.position.set(-28 + px, 5.4, pz);
        wharfGroup.add(flame);
      });
    });

    // Towering Obsidian Skull/Shark Gate Entrance at (-28, 1.4, -185)
    [-5.2, 5.2].forEach((px) => {
      const gatePillar = new THREE.Mesh(new THREE.BoxGeometry(2.2, 9.5, 2.4), basaltMat);
      gatePillar.position.set(-28 + px, 5.8, -185);
      wharfGroup.add(gatePillar);
    });
    const gateHeader = new THREE.Mesh(new THREE.BoxGeometry(13.5, 2.4, 2.8), basaltMat);
    gateHeader.position.set(-28, 10.8, -185);
    wharfGroup.add(gateHeader);

    scene.add(wharfGroup);

    // 2. The Subterranean Volcano Trial Dungeon Corridor (x = -28, z = -185..-113)
    const dungeonGroup = new THREE.Group();

    // Bubbling Molten Lava Pit beneath the entire Dungeon Bridge
    const lavaFloor = new THREE.Mesh(new THREE.PlaneGeometry(18, 76), lavaMat);
    lavaFloor.rotation.x = -Math.PI / 2;
    lavaFloor.position.set(-28, 0.35, -149);
    dungeonGroup.add(lavaFloor);

    // Basalt Trial Walkway Bridge sloping from (y=1.4, z=-185) to (y=8.6, z=-113)
    const bridgeGeo = new THREE.BoxGeometry(8.4, 0.8, 74);
    const bridgeMesh = new THREE.Mesh(bridgeGeo, basaltMat);
    bridgeMesh.position.set(-28, 4.6, -149);
    bridgeMesh.rotation.x = -Math.atan2(7.2, 72);
    dungeonGroup.add(bridgeMesh);

    // Cavern Walls & Vaulted Obsidian Ceiling enclosing the Trial Gauntlet
    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(2.5, 16, 74), basaltMat);
    leftWall.position.set(-35.5, 8, -149);
    dungeonGroup.add(leftWall);

    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(2.5, 16, 74), basaltMat);
    rightWall.position.set(-20.5, 8, -149);
    dungeonGroup.add(rightWall);

    const ceiling = new THREE.Mesh(new THREE.BoxGeometry(18, 2.5, 74), basaltMat);
    ceiling.position.set(-28, 16.5, -149);
    dungeonGroup.add(ceiling);

    // Interior Lava Glow Lights inside the Dungeon
    [-175, -150, -125].forEach((lz) => {
      const pLight = new THREE.PointLight(0xff5514, 2.2, 32);
      pLight.position.set(-28, 9.5, lz);
      dungeonGroup.add(pLight);
    });

    // 3. DUNGEON TRAPS! (3 Swinging Obsidian Pendulum Axes + 3 Erupting Lava Geysers)
    const pendulumZ = [-170, -152, -134];
    pendulumZ.forEach((pz, idx) => {
      const py = getTerrainHeight(-28, pz);
      const pivot = new THREE.Group();
      pivot.position.set(-28, py + 9.2, pz);

      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 7.6, 10), brassMat);
      rod.position.y = -3.8;
      pivot.add(rod);

      // Double-sided glowing obsidian battle axe blade
      const axeBlade = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.28, 16), bladeMat);
      axeBlade.rotation.x = Math.PI / 2;
      axeBlade.position.y = -7.4;
      pivot.add(axeBlade);

      const rimGlow = new THREE.Mesh(
        new THREE.TorusGeometry(1.62, 0.08, 10, 24),
        new THREE.MeshBasicMaterial({ color: 0xff4500 })
      );
      rimGlow.position.y = -7.4;
      pivot.add(rimGlow);

      dungeonGroup.add(pivot);
      dungeonTraps.push({
        type: 'pendulum',
        pivot,
        z: pz,
        baseY: py,
        phase: idx * 1.35,
        speed: 2.3 + idx * 0.25,
        hitPos: new THREE.Vector3(-28, py + 1.8, pz)
      });
    });

    // 3 Timed Erupting Lava Geyser Pillars
    const geyserZ = [-161, -143, -125];
    geyserZ.forEach((gz, idx) => {
      const gy = getTerrainHeight(-28, gz);
      const gx = -28 + (idx % 2 === 0 ? -1.4 : 1.4);

      const vent = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.2, 0.4, 16), brassMat);
      vent.position.set(gx, gy + 0.15, gz);
      dungeonGroup.add(vent);

      const plume = new THREE.Mesh(
        new THREE.CylinderGeometry(0.85, 0.45, 6.5, 16),
        new THREE.MeshBasicMaterial({ color: 0xff6a00, transparent: true, opacity: 0.88 })
      );
      plume.position.set(gx, gy + 3.2, gz);
      dungeonGroup.add(plume);

      dungeonTraps.push({
        type: 'geyser',
        plume,
        x: gx,
        z: gz,
        baseY: gy,
        phase: idx * 2.1,
        active: false,
        hitPos: new THREE.Vector3(gx, gy + 1.5, gz)
      });
    });

    // Trial Core Ascent Portal at the end of the Dungeon (-28, 8.6, -115) -> Exits onto the Front Volcano Balcony!
    const coreRing = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.3, 14, 32), brassMat);
    coreRing.position.set(-28, 11.2, -114);
    dungeonGroup.add(coreRing);

    const coreDisc = new THREE.Mesh(
      new THREE.CircleGeometry(2.4, 28),
      new THREE.MeshBasicMaterial({ color: 0xff9d3b, side: THREE.DoubleSide, transparent: true, opacity: 0.85 })
    );
    coreDisc.position.set(-28, 11.2, -114);
    dungeonGroup.add(coreDisc);

    scene.add(dungeonGroup);
  }

  // ==========================================================================
  // THE BIRBS OF BLÅHAJ ISLAND & BREB FEEDING SYSTEM
  // ==========================================================================
  function buildBirbFlocks(scene) {
    const birbSpots = [
      // Birb Sanctuary & Sacred Tea House Lawn
      [-14, 16, 0x60a5fa], [-16, 19, 0xfbbf24], [-12, 20, 0xf472b6],
      [-18, 15, 0xa78bfa], [-10, 14, 0x38bdf8], [12, 15, 0xfbbf24],
      [14, 18, 0x60a5fa], [11, 21, 0xf472b6], [-6, 26, 0x34d399],
      // Tea Docks & Crescent Harbour Beach
      [-8, 48, 0x60a5fa], [8, 49, 0xfbbf24], [14, 52, 0xf472b6],
      // Spherical Foods & East Cape
      [-44, 28, 0xa78bfa], [-46, 31, 0x60a5fa], [58, -6, 0xfbbf24],
      [61, -8, 0x38bdf8], [42, 54, 0xf472b6], [45, 56, 0x60a5fa]
    ];

    birbSpots.forEach(([bx, bz, col], idx) => {
      const by = getTerrainHeight(bx, bz);
      const birbMesh = window.BlahajModels.createBirb(col);
      birbMesh.position.set(bx, by, bz);
      birbMesh.rotation.y = Math.random() * Math.PI * 2;
      scene.add(birbMesh);

      birbFlock.push({
        id: `birb-${idx}`,
        mesh: birbMesh,
        homePos: new THREE.Vector3(bx, by, bz),
        targetPos: new THREE.Vector3(bx, by, bz),
        hopPhase: Math.random() * Math.PI * 2,
        fedTimer: 0
      });
    });
  }

  function spawnBrebLoaf(scene, originPos) {
    const brebMat = new THREE.MeshStandardMaterial({ color: 0xd99b4e, roughness: 0.75 });
    const loaf = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 14), brebMat);
    loaf.scale.set(1.35, 0.82, 0.95);
    const groundY = Math.max(0.2, getTerrainHeight(originPos.x, originPos.z));
    loaf.position.set(originPos.x, groundY + 0.2, originPos.z);
    loaf.castShadow = true;
    scene.add(loaf);

    activeBrebLoaves.push({
      mesh: loaf,
      pos: loaf.position.clone(),
      life: 10.0
    });
  }

  // ==========================================================================
  // SWIMMING TROPICAL FISHES & BOUNCY BEACH BALLS IN THE WATER
  // ==========================================================================
  function buildWaterFishesAndBeachBalls(scene) {
    const fishPalette = [0xff7828, 0xfacc15, 0xec4899, 0x38bdf8, 0x4ade80];
    const schoolCenters = [
      [18, 76], [-20, 78], [0, 92], [68, 34],
      [-72, 16], [-48, -75], [22, -68], [-28, -224]
    ];

    schoolCenters.forEach(([cx, cz], sIdx) => {
      for (let f = 0; f < 3; f++) {
        const col = fishPalette[(sIdx + f) % fishPalette.length];
        const fMesh = window.BlahajModels.createTropicalFish(col);
        scene.add(fMesh);
        fishSchool.push({
          mesh: fMesh,
          centerX: cx,
          centerZ: cz,
          radius: 4.5 + f * 2.2,
          angle: (f / 3) * Math.PI * 2 + sIdx,
          speed: 0.85 + (f % 2) * 0.35,
          jumpPhase: Math.random() * Math.PI * 2
        });
      }
    });

    // 10 Bouncy Striped Beach Balls along the Shores & Harbour Water
    const ballCoords = [
      [-10, 62], [11, 64], [0, 82], [28, 56],
      [-26, 54], [62, 18], [-38, -58], [16, -48],
      [-16, -196], [36, 70]
    ];
    ballCoords.forEach(([bx, bz]) => {
      const bMesh = window.BlahajModels.createBeachBall(0.85);
      const by = Math.max(0.55, getTerrainHeight(bx, bz) + 0.75);
      bMesh.position.set(bx, by, bz);
      scene.add(bMesh);
      beachBalls.push({
        mesh: bMesh,
        vel: new THREE.Vector3(0, 0, 0)
      });
    });
  }

  // ==========================================================================
  // OTHER ISLAND LANDMARKS (TEA HOUSE, PORTAL GATE, SPHERICAL FOODS, ETC.)
  // ==========================================================================
  function buildSacredTeaHouseVillage(scene) {
    const group = new THREE.Group();
    const y0 = getTerrainHeight(0, 10);
    group.position.set(0, y0, 10);

    const woodMat = new THREE.MeshStandardMaterial({ color: 0x573a24, roughness: 0.78 });
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x454152, roughness: 0.85 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x22385c, roughness: 0.65 });
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xd8aa5b, roughness: 0.28, metalness: 0.84 });
    const porcelainMat = new THREE.MeshStandardMaterial({ color: 0xfaf6ed, roughness: 0.15 });

    const plaza = new THREE.Mesh(new THREE.CylinderGeometry(12.2, 13.4, 0.6, 36), stoneMat);
    plaza.position.y = 0.25;
    plaza.receiveShadow = true;
    group.add(plaza);

    const timberDeck = new THREE.Mesh(new THREE.CylinderGeometry(9.4, 9.8, 0.55, 32), woodMat);
    timberDeck.position.y = 0.65;
    timberDeck.receiveShadow = true;
    group.add(timberDeck);

    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const px = Math.cos(a) * 8.0;
      const pz = Math.sin(a) * 8.0;
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.42, 6.2, 16), woodMat);
      col.position.set(px, 3.6, pz);
      col.castShadow = true;
      group.add(col);

      const lan = new THREE.Mesh(
        new THREE.SphereGeometry(0.26, 14, 14),
        new THREE.MeshBasicMaterial({ color: 0xffd27d })
      );
      lan.position.set(px * 0.88, 5.4, pz * 0.88);
      group.add(lan);
    }

    const roof1 = new THREE.Mesh(new THREE.ConeGeometry(11.4, 3.2, 24), roofMat);
    roof1.position.y = 7.6;
    roof1.castShadow = true;
    group.add(roof1);
    const trim1 = new THREE.Mesh(new THREE.TorusGeometry(11.2, 0.14, 12, 36), brassMat);
    trim1.rotation.x = Math.PI / 2;
    trim1.position.y = 6.1;
    group.add(trim1);

    const roof2 = new THREE.Mesh(new THREE.ConeGeometry(7.8, 2.8, 24), roofMat);
    roof2.position.y = 9.8;
    roof2.castShadow = true;
    group.add(roof2);
    const trim2 = new THREE.Mesh(new THREE.TorusGeometry(7.6, 0.12, 12, 36), brassMat);
    trim2.rotation.x = Math.PI / 2;
    trim2.position.y = 8.5;
    group.add(trim2);

    const spireKettle = new THREE.Mesh(new THREE.SphereGeometry(0.78, 20, 18), brassMat);
    spireKettle.position.y = 11.5;
    group.add(spireKettle);

    const table = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 2.6, 1.25, 28), woodMat);
    table.position.y = 1.4;
    table.castShadow = true;
    group.add(table);

    const cushionColors = [0x3b638c, 0x6b2d5c, 0x9c5530, 0x2d5a4c, 0xd97b96, 0x4b437a];
    cushionColors.forEach((cc, idx) => {
      const ca = (idx / 6) * Math.PI * 2;
      const cush = new THREE.Mesh(
        new THREE.CylinderGeometry(0.85, 0.92, 0.35, 20),
        new THREE.MeshStandardMaterial({ color: cc, roughness: 0.88 })
      );
      cush.position.set(Math.cos(ca) * 4.4, 1.05, Math.sin(ca) * 4.4);
      group.add(cush);
    });

    const teapot = new THREE.Mesh(new THREE.SphereGeometry(0.55, 22, 20), brassMat);
    teapot.position.y = 2.45;
    group.add(teapot);

    for (let c = 0; c < 6; c++) {
      const ca = (c / 6) * Math.PI * 2;
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.18, 0.3, 16), porcelainMat);
      cup.position.set(Math.cos(ca) * 1.8, 2.18, Math.sin(ca) * 1.8);
      group.add(cup);
    }

    const teaLight = new THREE.PointLight(0xffb85c, 2.1, 36);
    teaLight.position.set(0, 5.5, 0);
    group.add(teaLight);

    scene.add(group);
  }

  function buildGreatPortalGateHeadland(scene) {
    const group = new THREE.Group();
    const y0 = getTerrainHeight(72, -10);
    group.position.set(72, y0, -10);
    group.rotation.y = -Math.PI * 0.38;

    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x2e2a3d, roughness: 0.8 });
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xd8aa5b, roughness: 0.25, metalness: 0.85 });

    const dais = new THREE.Mesh(new THREE.CylinderGeometry(8.5, 9.8, 1.4, 28), stoneMat);
    dais.position.y = 0.6;
    group.add(dais);

    const outerRing = new THREE.Mesh(new THREE.TorusGeometry(5.6, 0.82, 20, 48), stoneMat);
    outerRing.position.y = 6.5;
    outerRing.castShadow = true;
    group.add(outerRing);

    const brassRuneRing = new THREE.Mesh(new THREE.TorusGeometry(4.85, 0.18, 14, 48), brassMat);
    brassRuneRing.position.y = 6.5;
    group.add(brassRuneRing);

    const portalMat = new THREE.ShaderMaterial({
      uniforms: waterUniforms,
      side: THREE.DoubleSide,
      transparent: true,
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
          if (r > 1.0) discard;
          float a = atan(vUv.y, vUv.x);
          float spiral = sin(a * 5.0 - r * 12.0 + uTime * 3.5);
          vec3 violet = vec3(0.58, 0.28, 0.98);
          vec3 cyan = vec3(0.32, 0.78, 1.0);
          vec3 core = vec3(0.98, 0.92, 1.0);
          vec3 col = mix(violet, cyan, 0.5 + 0.5 * spiral);
          col = mix(core, col, smoothstep(0.0, 0.65, r));
          float alpha = (1.0 - smoothstep(0.82, 1.0, r)) * 0.88;
          gl_FragColor = vec4(col, alpha);
        }
      `
    });
    const vortexDisc = new THREE.Mesh(new THREE.CircleGeometry(4.8, 40), portalMat);
    vortexDisc.position.y = 6.5;
    group.add(vortexDisc);

    const portalLight = new THREE.PointLight(0x9b6dff, 2.8, 44);
    portalLight.position.set(0, 6.5, 2.0);
    group.add(portalLight);

    scene.add(group);
  }

  function buildSphericalFoodsBluff(scene) {
    const group = new THREE.Group();
    const y0 = getTerrainHeight(-52, 34);
    group.position.set(-52, y0, 34);
    group.rotation.y = 0.55;

    const boothMat = new THREE.MeshStandardMaterial({ color: 0x731d2c, roughness: 0.72 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x4d321e, roughness: 0.78 });
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xd8aa5b, roughness: 0.28, metalness: 0.85 });

    const deck = new THREE.Mesh(new THREE.CylinderGeometry(8.5, 9.2, 0.65, 32), woodMat);
    deck.position.y = 0.3;
    group.add(deck);

    const booth = new THREE.Mesh(
      new THREE.CylinderGeometry(6.0, 6.0, 2.5, 32, 1, true, 0.75, Math.PI * 1.5),
      boothMat
    );
    booth.position.y = 1.5;
    booth.material.side = THREE.DoubleSide;
    group.add(booth);

    const table = new THREE.Mesh(new THREE.CylinderGeometry(3.1, 2.5, 1.2, 28), woodMat);
    table.position.y = 1.15;
    group.add(table);

    const sphereColors = [0xa84224, 0xf2e8d5, 0xd9385a, 0xdba84b, 0x7a1c38, 0xe8b923, 0x4a7c36, 0xf5d77f, 0x3b2219];
    sphereColors.forEach((sc, i) => {
      const a = (i / sphereColors.length) * Math.PI * 2;
      const dish = new THREE.Mesh(
        new THREE.SphereGeometry(0.32, 20, 18),
        new THREE.MeshStandardMaterial({ color: sc, roughness: 0.3 })
      );
      dish.position.set(Math.cos(a) * 1.85, 1.98, Math.sin(a) * 1.85);
      group.add(dish);
    });

    const orbGroup = new THREE.Group();
    orbGroup.position.set(0, 5.8, -4.2);
    const orb = new THREE.Mesh(new THREE.SphereGeometry(1.15, 24, 22), brassMat);
    const orbRing = new THREE.Mesh(new THREE.TorusGeometry(1.75, 0.08, 12, 32), brassMat);
    orbRing.rotation.x = Math.PI * 0.38;
    orbGroup.add(orb);
    orbGroup.add(orbRing);
    group.add(orbGroup);
    animatedObjects.push({ mesh: orbGroup, type: 'spin_slow' });

    const light = new THREE.PointLight(0xffbe6b, 1.8, 28);
    light.position.set(0, 4.8, 0);
    group.add(light);

    scene.add(group);
  }

  function buildQuietLibraryAndCrustCliffs(scene) {
    const group = new THREE.Group();
    const y0 = getTerrainHeight(52, -48);
    group.position.set(52, y0, -48);

    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x34304b, roughness: 0.8 });
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xd8aa5b, roughness: 0.25, metalness: 0.85 });

    const terrace = new THREE.Mesh(new THREE.CylinderGeometry(9.2, 10.2, 0.9, 32), stoneMat);
    terrace.position.y = 0.45;
    group.add(terrace);

    const astroGroup = new THREE.Group();
    astroGroup.position.set(0, 5.8, 0);
    [2.8, 2.2, 1.6].forEach((rad, i) => {
      const rMesh = new THREE.Mesh(new THREE.TorusGeometry(rad, 0.1, 14, 40), brassMat);
      rMesh.rotation.x = i * 0.9;
      rMesh.rotation.y = i * 0.6;
      astroGroup.add(rMesh);
    });
    const coreStar = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.55, 0),
      new THREE.MeshBasicMaterial({ color: 0xe9d5ff })
    );
    astroGroup.add(coreStar);
    group.add(astroGroup);
    animatedObjects.push({ mesh: astroGroup, type: 'spin_slow' });

    const loader = new THREE.TextureLoader();
    const featuredTapestries = [
      'assets/gallery/Shark-Week-sunset.png',
      'assets/gallery/Emergency-1.png',
      'assets/gallery/repair-the-sky-seam.png',
      'assets/gallery/Wedding-1.png',
      'assets/gallery/Volcano-temple.png',
      'assets/gallery/Spherical-Foods.png'
    ];
    featuredTapestries.forEach((imgUrl, idx) => {
      const angle = (idx / featuredTapestries.length) * Math.PI * 2 + 0.3;
      const frameGroup = new THREE.Group();
      frameGroup.position.set(Math.cos(angle) * 6.8, 2.5, Math.sin(angle) * 6.8);
      frameGroup.lookAt(52, y0 + 2.5, -48);

      const border = new THREE.Mesh(new THREE.BoxGeometry(2.7, 3.3, 0.18), brassMat);
      frameGroup.add(border);

      const tex = loader.load(imgUrl);
      const canvasMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(2.4, 2.95),
        new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide })
      );
      canvasMesh.position.z = 0.11;
      frameGroup.add(canvasMesh);

      group.add(frameGroup);
    });

    const moonLight = new THREE.PointLight(0xc084fc, 2.0, 32);
    moonLight.position.set(0, 6.5, 0);
    group.add(moonLight);

    scene.add(group);
  }

  function buildLaundryShrineRidge(scene) {
    const group = new THREE.Group();
    const y0 = getTerrainHeight(-64, -14);
    group.position.set(-64, y0, -14);
    group.rotation.y = 0.7;

    const metalMat = new THREE.MeshStandardMaterial({ color: 0x6e7785, roughness: 0.35, metalness: 0.7 });
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xd8aa5b, roughness: 0.3, metalness: 0.82 });

    const plinth = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.8, 6.2), brassMat);
    plinth.position.y = 0.4;
    group.add(plinth);

    const machine = new THREE.Mesh(new THREE.BoxGeometry(4.8, 5.8, 3.6), metalMat);
    machine.position.y = 3.3;
    machine.castShadow = true;
    group.add(machine);

    const doorRing = new THREE.Mesh(new THREE.TorusGeometry(1.65, 0.25, 16, 36), brassMat);
    doorRing.position.set(0, 3.1, 1.85);
    group.add(doorRing);

    const whirlGroup = new THREE.Group();
    whirlGroup.position.set(0, 3.1, 1.82);
    const swirlDisc = new THREE.Mesh(
      new THREE.CircleGeometry(1.55, 28),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    whirlGroup.add(swirlDisc);
    const spiralBar = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 0.28, 0.08),
      new THREE.MeshBasicMaterial({ color: 0xfff5d6 })
    );
    whirlGroup.add(spiralBar);
    group.add(whirlGroup);
    animatedObjects.push({ mesh: whirlGroup, type: 'portal_spin' });

    scene.add(group);
  }

  function createRegattaSailboatMesh(woodMat, sailColorHex, lanternColorHex) {
    const sailMat = new THREE.MeshStandardMaterial({
      color: sailColorHex,
      roughness: 0.75,
      side: THREE.DoubleSide
    });
    const hullMat = woodMat.clone();
    hullMat.side = THREE.DoubleSide;
    const deckMat = new THREE.MeshStandardMaterial({ color: 0x8c6239, roughness: 0.8 });
    const bGroup = new THREE.Group();

    // Curved boat hull pointing DOWN into the water (so the top deck is flat and open!)
    const hullGeo = new THREE.CylinderGeometry(2.2, 1.5, 7.8, 20, 1, false, Math.PI, Math.PI);
    hullGeo.rotateZ(Math.PI / 2);
    hullGeo.rotateY(Math.PI / 2);
    const hull = new THREE.Mesh(hullGeo, hullMat);
    hull.scale.set(1.12, 0.65, 1.0);
    hull.position.y = 0.78;
    hull.castShadow = true;
    bGroup.add(hull);

    // Wide flat planked wooden deck for sharks to stand proudly on top of!
    const deck = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.22, 7.0), deckMat);
    deck.position.y = 0.76;
    deck.receiveShadow = true;
    bGroup.add(deck);

    // Low wooden gunwale rails along left & right edges of the deck
    [-1.82, 1.82].forEach((rx) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.28, 6.8), woodMat);
      rail.position.set(rx, 0.98, 0);
      bGroup.add(rail);
    });

    // Forward-mounted mast & raised sail so the center deck has a clear view and zero clipping
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.21, 7.8, 14), woodMat);
    mast.position.set(0, 4.5, 1.65);
    bGroup.add(mast);

    const sailGeo = new THREE.PlaneGeometry(4.2, 4.6, 12, 12);
    const sPos = sailGeo.attributes.position;
    for (let i = 0; i < sPos.count; i++) {
      const sx = sPos.getX(i);
      const sy = sPos.getY(i);
      const belly = Math.cos((sx / 2.1) * (Math.PI * 0.5)) * Math.cos((sy / 2.3) * (Math.PI * 0.5)) * 0.65;
      sPos.setZ(i, belly);
    }
    sailGeo.computeVertexNormals();
    const sail = new THREE.Mesh(sailGeo, sailMat);
    sail.position.set(0, 5.2, 1.8);
    bGroup.add(sail);

    const prowLantern = new THREE.Mesh(
      new THREE.SphereGeometry(0.32, 14, 14),
      new THREE.MeshBasicMaterial({ color: lanternColorHex })
    );
    prowLantern.position.set(0, 1.65, 3.7);
    bGroup.add(prowLantern);
    const boatLight = new THREE.PointLight(lanternColorHex, 1.5, 22);
    boatLight.position.set(0, 1.95, 3.7);
    bGroup.add(boatLight);

    return bGroup;
  }

  function buildTeaDocksAndRegattaBoat(scene) {
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c3e26, roughness: 0.82 });

    const dock = new THREE.Mesh(new THREE.BoxGeometry(7.5, 0.65, 26), woodMat);
    dock.position.set(0, 1.35, 57);
    dock.receiveShadow = true;
    scene.add(dock);

    // Fleet of 4 Regatta Sailboats moored at the Island Wharfs!
    const boatSpecs = [
      { x: 0, z: 73, rotY: 0, sail: 0xf7efe0, lantern: 0xffd27d, name: 'Sunlit Cream Regatta Boat' },
      { x: -6.8, z: 60, rotY: -0.25, sail: 0x38bdf8, lantern: 0x7ce8ff, name: 'Blåhaj Azure Regatta Boat' },
      { x: 42.5, z: 66, rotY: 0.15, sail: 0xff8a75, lantern: 0xffbe6b, name: 'Endless Pier Coral Sailboat' },
      { x: -21.5, z: -204, rotY: Math.PI, sail: 0xc084fc, lantern: 0xe9d5ff, name: 'Rear Volcano Wharf Sailboat' }
    ];

    boatSpecs.forEach((bs, idx) => {
      const b = createRegattaSailboatMesh(woodMat, bs.sail, bs.lantern);
      b.position.set(bs.x, 0.45, bs.z);
      b.rotation.y = bs.rotY;
      b.userData.boatName = bs.name;
      scene.add(b);
      fleetBoats.push(b);
      if (idx === 0) boatMesh = b;
    });

    // Dedicated Regatta Boat for Co-op Partner when sailing side-by-side!
    partnerBoatMesh = createRegattaSailboatMesh(woodMat, 0xe9d8fd, 0xc084fc);
    partnerBoatMesh.position.set(6.5, 0.45, 73);
    partnerBoatMesh.visible = false;
    scene.add(partnerBoatMesh);
  }

  function buildEndlessPierToErf(scene) {
    const group = new THREE.Group();
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x593c28, roughness: 0.82 });
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xd8aa5b, roughness: 0.3, metalness: 0.85 });

    const pier = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.6, 34), woodMat);
    pier.position.set(48, 1.45, 62);
    group.add(pier);

    const arch = new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.28, 16, 36, Math.PI), brassMat);
    arch.position.set(48, 1.7, 72);
    group.add(arch);

    const bottleStand = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.8, 1.5, 18), brassMat);
    bottleStand.position.set(48, 2.2, 66);
    group.add(bottleStand);

    const bottleGlow = new THREE.Mesh(
      new THREE.SphereGeometry(0.46, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0x7ce8ff })
    );
    bottleGlow.position.set(48, 3.3, 66);
    group.add(bottleGlow);
    animatedObjects.push({ mesh: bottleGlow, type: 'spin_bob', baseY: 3.3 });

    scene.add(group);
  }

  function createPalmTree(height = 7.5) {
    const tree = new THREE.Group();
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x664428, roughness: 0.9 });
    const frondMat = new THREE.MeshStandardMaterial({
      color: 0x2f754e,
      roughness: 0.75,
      side: THREE.DoubleSide
    });

    const segments = 7;
    for (let s = 0; s < segments; s++) {
      const u = s / segments;
      const seg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.38 * (1 - u * 0.45), 0.44 * (1 - u * 0.4), height / segments + 0.15, 10),
        trunkMat
      );
      seg.position.set(Math.pow(u, 1.6) * 1.1, (s + 0.5) * (height / segments), 0);
      seg.rotation.z = -u * 0.28;
      seg.castShadow = true;
      tree.add(seg);
    }

    const crownX = 1.1;
    const crownY = height + 0.1;
    for (let f = 0; f < 7; f++) {
      const a = (f / 7) * Math.PI * 2;
      const frondGroup = new THREE.Group();
      frondGroup.position.set(crownX, crownY, 0);
      frondGroup.rotation.y = a;

      const bladeGeo = new THREE.PlaneGeometry(0.95, 3.8, 4, 10);
      const bPos = bladeGeo.attributes.position;
      for (let k = 0; k < bPos.count; k++) {
        const by = bPos.getY(k) + 1.9;
        const u = by / 3.8;
        bPos.setY(k, by);
        bPos.setZ(k, -Math.pow(u, 1.8) * 1.45);
        bPos.setX(k, bPos.getX(k) * Math.sin(u * Math.PI));
      }
      bladeGeo.computeVertexNormals();
      const blade = new THREE.Mesh(bladeGeo, frondMat);
      blade.rotation.x = Math.PI * 0.34;
      blade.castShadow = true;
      frondGroup.add(blade);
      tree.add(frondGroup);
    }

    return tree;
  }

  function buildLushPalmsBouldersAndLanterns(scene) {
    const palmLocations = [
      [-18, 22], [20, 18], [-28, -4], [28, -8],
      [-16, 44], [18, 42], [-38, 18], [40, 15],
      [56, 26], [-45, -24], [32, -32], [-10, -28],
      [62, -26], [-62, 12], [24, 52], [-22, 54],
      [42, -16], [-36, 48]
    ];

    palmLocations.forEach(([px, pz], idx) => {
      const py = getTerrainHeight(px, pz);
      if (py > 0.6) {
        const palm = createPalmTree(6.8 + (idx % 3) * 1.2);
        palm.position.set(px, py - 0.2, pz);
        palm.rotation.y = idx * 1.1;
        scene.add(palm);
      }
    });
  }

  function buildGreatSeamRifts(scene) {
    const riftCoords = [
      { id: 'rift-1', x: 24, z: 6, mended: true },
      { id: 'rift-2', x: -24, z: 24, mended: true },
      { id: 'rift-3', x: 20, z: -26, mended: true },
      { id: 'rift-4', x: -18, z: -56, mended: false },
      { id: 'rift-5', x: 46, z: 18, mended: false },
      { id: 'rift-6', x: -42, z: -6, mended: false }
    ];

    riftCoords.forEach((rc) => {
      const ry = getTerrainHeight(rc.x, rc.z) + 2.6;
      const riftGroup = new THREE.Group();
      riftGroup.position.set(rc.x, ry, rc.z);

      const coreMat = new THREE.MeshBasicMaterial({
        color: rc.mended ? 0xf5cd79 : 0xa855f7,
        wireframe: !rc.mended
      });
      const core = new THREE.Mesh(new THREE.OctahedronGeometry(1.05, 1), coreMat);
      riftGroup.add(core);

      const ringMat = new THREE.MeshBasicMaterial({
        color: rc.mended ? 0x52f29c : 0x56c2ff,
        side: THREE.DoubleSide
      });
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.55, 0.08, 14, 32), ringMat);
      riftGroup.add(ring);

      riftGroup.userData = { id: rc.id, mended: rc.mended, core, ring };
      seamRifts.push(riftGroup);
      animatedObjects.push({ mesh: riftGroup, type: 'spin_bob', baseY: ry });
      scene.add(riftGroup);
    });
  }

  // ==========================================================================
  // 4 OUTER BUILDABLE SANCTUARY ISLANDS (DOCKS, CHARTER ARCHES & PALMS)
  // ==========================================================================
  function buildOuterSanctuaryIslands(scene) {
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x6b472b, roughness: 0.85 });
    const postMat = new THREE.MeshStandardMaterial({ color: 0x452b17, roughness: 0.9 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xf5cd79, metalness: 0.65, roughness: 0.25 });

    const islandSpecs = (window.BLAHAJ_LORE && window.BLAHAJ_LORE.sanctuaryIslands) || OUTER_ISLANDS;

    islandSpecs.forEach((isl, idx) => {
      const group = new THREE.Group();

      // 1. Coastal Boat Dock at (isl.dockX, 1.4, isl.dockZ)
      const dockPlank = new THREE.Mesh(new THREE.BoxGeometry(8.5, 0.35, 8.5), woodMat);
      dockPlank.position.set(isl.dockX, 1.4, isl.dockZ);
      dockPlank.receiveShadow = true;
      group.add(dockPlank);

      [[-3.8, -3.8], [3.8, -3.8], [-3.8, 3.8], [3.8, 3.8]].forEach(([ox, oz]) => {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 4.2, 10), postMat);
        post.position.set(isl.dockX + ox, 0.4, isl.dockZ + oz);
        group.add(post);
      });

      // Glowing Dock Beacon Lantern
      const beaconOrb = new THREE.Mesh(
        new THREE.SphereGeometry(0.45, 14, 14),
        new THREE.MeshBasicMaterial({ color: isl.themeColor || 0xf5cd79 })
      );
      beaconOrb.position.set(isl.dockX + 3.8, 2.8, isl.dockZ - 3.8);
      group.add(beaconOrb);

      // 2. Sanctuary Island Charter Arch & Signpost at (isl.signX, gy, isl.signZ)
      const sx = isl.signX || (isl.x + isl.dockX) * 0.5;
      const sz = isl.signZ || (isl.z + isl.dockZ) * 0.5;
      const sy = getTerrainHeight(sx, sz);

      const archGroup = new THREE.Group();
      archGroup.position.set(sx, sy, sz);
      archGroup.rotation.y = Math.atan2(isl.dockX - sx, isl.dockZ - sz);

      [-2.2, 2.2].forEach((px) => {
        const p = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 4.2, 12), woodMat);
        p.position.set(px, 2.1, 0);
        archGroup.add(p);
      });
      const beam = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.45, 0.5), goldMat);
      beam.position.set(0, 4.1, 0);
      archGroup.add(beam);

      const crest = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.55, 0),
        new THREE.MeshBasicMaterial({ color: isl.themeColor || 0x7ce8ff })
      );
      crest.position.set(0, 4.9, 0);
      archGroup.add(crest);
      animatedObjects.push({ mesh: crest, type: 'spin_bob', baseY: 4.9 });

      group.add(archGroup);

      // 3. Perimeter Palm Trees around the outer rim (leaving the central plateau wide open for building!)
      for (let p = 0; p < 6; p++) {
        const ang = (p / 6) * Math.PI * 2 + idx * 0.5;
        const px = isl.x + Math.cos(ang) * (isl.radius * 0.72);
        const pz = isl.z + Math.sin(ang) * (isl.radius * 0.72);
        const py = getTerrainHeight(px, pz);
        if (py > 1.2) {
          const palm = createPalmTree(6.5 + (p % 3));
          palm.position.set(px, py - 0.15, pz);
          palm.rotation.y = ang + 1.2;
          group.add(palm);
        }
      }

      scene.add(group);
    });
  }

  // ==========================================================================
  // HIRAM THE MAGICAL BUILDER — SACRED ALLEN KEY & 16 3D BLUEPRINT MESHES
  // ==========================================================================
  function createGoldenAllenKey(scale = 1.0) {
    const group = new THREE.Group();
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xffd166,
      metalness: 0.78,
      roughness: 0.2,
      emissive: 0x5c3d00,
      emissiveIntensity: 0.35
    });
    // Long hexagonal shaft
    const longShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 2.2, 6), goldMat);
    longShaft.position.set(0, 1.1, 0);
    group.add(longShaft);

    // Corner elbow
    const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 10), goldMat);
    elbow.position.set(0, 2.2, 0);
    group.add(elbow);

    // Short hexagonal L-handle
    const shortArm = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.95, 6), goldMat);
    shortArm.rotation.z = Math.PI / 2;
    shortArm.position.set(0.46, 2.2, 0);
    group.add(shortArm);

    group.scale.setScalar(scale);
    return group;
  }

  function applyHologramMaterial(rootGroup) {
    const holoMat = new THREE.MeshBasicMaterial({
      color: 0x56e0ff,
      transparent: true,
      opacity: 0.52,
      side: THREE.DoubleSide
    });
    rootGroup.traverse((child) => {
      if (child.isMesh) {
        child.material = holoMat;
        child.castShadow = false;
        child.receiveShadow = false;
      }
    });
    // Add glowing golden footprint ring so placement is super clear
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(2.1, 2.35, 32),
      new THREE.MeshBasicMaterial({ color: 0xffd166, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.08;
    rootGroup.add(ring);
  }

  function createStructureMesh(type, isPreview = false) {
    const group = new THREE.Group();
    const birchMat = new THREE.MeshStandardMaterial({ color: 0xd9b382, roughness: 0.78 });
    const darkWoodMat = new THREE.MeshStandardMaterial({ color: 0x6b4426, roughness: 0.85 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x2f5378, roughness: 0.72, side: THREE.DoubleSide });
    const plushBlueMat = new THREE.MeshStandardMaterial({ color: 0x3b6998, roughness: 0.85 });
    const plushRoseMat = new THREE.MeshStandardMaterial({ color: 0xd97b96, roughness: 0.85 });
    const creamMat = new THREE.MeshStandardMaterial({ color: 0xf5ecdc, roughness: 0.82 });
    const basaltMat = new THREE.MeshStandardMaterial({ color: 0x2b2638, roughness: 0.82 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xf5cd79, metalness: 0.65, roughness: 0.25 });
    const warmGlowMat = new THREE.MeshBasicMaterial({ color: 0xffe099 });
    const portalGlowMat = new THREE.MeshBasicMaterial({ color: 0xa864ff, side: THREE.DoubleSide });

    if (type === 'birch_cabin') {
      // Cozy Scandinavian A-Frame Timber & Plush Cabin
      const deck = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.35, 7.6), darkWoodMat);
      deck.position.y = 0.17;
      group.add(deck);

      const cabinBody = new THREE.Mesh(new THREE.BoxGeometry(5.2, 3.0, 5.4), birchMat);
      cabinBody.position.set(0, 1.8, -0.4);
      cabinBody.castShadow = true;
      group.add(cabinBody);

      // A-Frame Pitched Roof
      const roofLeft = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.28, 6.6), roofMat);
      roofLeft.position.set(-1.35, 4.1, -0.4);
      roofLeft.rotation.z = Math.PI * 0.24;
      group.add(roofLeft);

      const roofRight = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.28, 6.6), roofMat);
      roofRight.position.set(1.35, 4.1, -0.4);
      roofRight.rotation.z = -Math.PI * 0.24;
      group.add(roofRight);

      // Glowing Warm Windows & Door
      const door = new THREE.Mesh(new THREE.BoxGeometry(1.3, 2.2, 0.15), darkWoodMat);
      door.position.set(0, 1.4, 2.32);
      group.add(door);

      [-1.6, 1.6].forEach((wx) => {
        const win = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.95, 0.16), warmGlowMat);
        win.position.set(wx, 2.0, 2.32);
        group.add(win);
      });
    } else if (type === 'tea_gazebo') {
      // Sacred Tea Gazebo with 6 Birch Columns & Paper Lanterns
      const base = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.8, 0.38, 8), darkWoodMat);
      base.position.y = 0.19;
      group.add(base);

      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 3.4, 10), birchMat);
        col.position.set(Math.cos(a) * 3.0, 1.9, Math.sin(a) * 3.0);
        group.add(col);

        const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 12), warmGlowMat);
        lantern.position.set(Math.cos(a) * 2.5, 3.1, Math.sin(a) * 2.5);
        group.add(lantern);
      }

      const canopy = new THREE.Mesh(new THREE.ConeGeometry(4.3, 1.8, 8), roofMat);
      canopy.position.y = 4.4;
      group.add(canopy);
    } else if (type === 'kotatsu_table') {
      // Steaming Kotatsu Tea Table with Golden Teapot & Cushions
      const quilt = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.85, 0.75, 16), plushBlueMat);
      quilt.position.y = 0.38;
      group.add(quilt);

      const tabletop = new THREE.Mesh(new THREE.CylinderGeometry(1.65, 1.65, 0.14, 16), birchMat);
      tabletop.position.y = 0.82;
      group.add(tabletop);

      const teapot = new THREE.Mesh(new THREE.SphereGeometry(0.35, 14, 14), goldMat);
      teapot.position.y = 1.18;
      group.add(teapot);

      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        const cushion = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.6, 0.22, 12), i % 2 === 0 ? plushRoseMat : creamMat);
        cushion.position.set(Math.cos(a) * 2.2, 0.12, Math.sin(a) * 2.2);
        group.add(cushion);
      }
    } else if (type === 'breb_oven') {
      // Warm Breb Bakery Hearth Oven
      const base = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.8, 2.6), basaltMat);
      base.position.y = 0.9;
      group.add(base);

      const dome = new THREE.Mesh(new THREE.SphereGeometry(1.35, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), roofMat);
      dome.position.y = 1.8;
      group.add(dome);

      const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 1.8, 12), goldMat);
      chimney.position.set(0, 3.1, -0.6);
      group.add(chimney);

      const fireMouth = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.2, 12), warmGlowMat);
      fireMouth.rotation.x = Math.PI / 2;
      fireMouth.position.set(0, 1.2, 1.25);
      group.add(fireMouth);

      // Fresh golden Breb loaves on the counter
      const breadMat = new THREE.MeshStandardMaterial({ color: 0xd98a3c, roughness: 0.7 });
      [-0.5, 0.5].forEach((bx) => {
        const loaf = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), breadMat);
        loaf.scale.set(1.4, 0.85, 0.95);
        loaf.position.set(bx, 1.92, 0.9);
        group.add(loaf);
      });
    } else if (type === 'lagoon_bridge') {
      // Walkable 12m Birch & Rope Lagoon Bridge
      const plankDeck = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.35, 12.4), birchMat);
      plankDeck.position.y = 0.45;
      group.add(plankDeck);

      [-2.15, 2.15].forEach((rx) => {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 12.4), goldMat);
        rail.position.set(rx, 1.35, 0);
        group.add(rail);

        [-5.6, -2.8, 0, 2.8, 5.6].forEach((rz) => {
          const post = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 2.2, 8), darkWoodMat);
          post.position.set(rx, 0.5, rz);
          group.add(post);
        });
      });
    } else if (type === 'sky_stairs') {
      // Walkable 10m Ascending Sky-Staircase Ramp (+3.5m rise from z=-5 to z=+5)
      const rampGroup = new THREE.Group();
      const steps = 12;
      for (let s = 0; s < steps; s++) {
        const u = s / (steps - 1);
        const stepMesh = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.32, 0.95), s % 2 === 0 ? birchMat : goldMat);
        stepMesh.position.set(0, u * 3.5, -5.0 + u * 10.0);
        rampGroup.add(stepMesh);
      }
      [-2.0, 2.0].forEach((rx) => {
        const stringer = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.35, 10.8), darkWoodMat);
        stringer.position.set(rx, 1.75, 0);
        stringer.rotation.x = -Math.atan2(3.5, 10.0);
        rampGroup.add(stringer);
      });
      group.add(rampGroup);
    } else if (type === 'custom_wharf') {
      // Walkable 10m Custom Boat Wharf
      const deck = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.35, 10.2), darkWoodMat);
      deck.position.y = 0.45;
      group.add(deck);

      [[-2.0, -4.5], [2.0, -4.5], [-2.0, 0], [2.0, 0], [-2.0, 4.5], [2.0, 4.5]].forEach(([px, pz]) => {
        const piling = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 3.2, 10), birchMat);
        piling.position.set(px, 0.1, pz);
        group.add(piling);
      });

      const lanternOrb = new THREE.Mesh(new THREE.SphereGeometry(0.36, 12, 12), warmGlowMat);
      lanternOrb.position.set(2.0, 2.0, 4.5);
      group.add(lanternOrb);
    } else if (type === 'stepping_stone') {
      // Floating Rune Platform (6m diameter)
      const stone = new THREE.Mesh(new THREE.CylinderGeometry(3.1, 2.6, 0.55, 8), basaltMat);
      stone.position.y = 0.22;
      group.add(stone);

      const runeRing = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.09, 10, 24), goldMat);
      runeRing.rotation.x = Math.PI / 2;
      runeRing.position.y = 0.51;
      group.add(runeRing);
    } else if (type === 'pocket_portal') {
      // Hermes-Linked Pocket Portal Arch
      const base = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.7, 0.36, 16), basaltMat);
      base.position.y = 0.18;
      group.add(base);

      const arch = new THREE.Mesh(new THREE.TorusGeometry(1.9, 0.26, 12, 28, Math.PI), goldMat);
      arch.position.y = 1.9;
      group.add(arch);

      const vortex = new THREE.Mesh(new THREE.CircleGeometry(1.75, 24), portalGlowMat);
      vortex.position.y = 1.9;
      group.add(vortex);
    } else if (type === 'starlight_lantern') {
      // Between Starlight Lantern Post
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 3.4, 10), darkWoodMat);
      post.position.y = 1.7;
      group.add(post);

      const arm = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.14, 0.14), goldMat);
      arm.position.set(0.4, 3.3, 0);
      group.add(arm);

      const orb = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 1), portalGlowMat);
      orb.position.set(0.85, 2.85, 0);
      group.add(orb);
    } else if (type === 'allen_obelisk') {
      // Sacred Allen Key Obelisk
      const ped = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.5, 2.4, 8), basaltMat);
      ped.position.y = 1.2;
      group.add(ped);

      const keyMesh = createGoldenAllenKey(1.15);
      keyMesh.position.y = 2.6;
      keyMesh.userData.isSpinningAllen = true;
      group.add(keyMesh);
    } else if (type === 'plush_cushion') {
      // Giant Plush Shark Cushion
      const cushion = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.9, 0.65, 20), plushBlueMat);
      cushion.position.y = 0.32;
      group.add(cushion);

      const inner = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, 0.7, 16), plushRoseMat);
      inner.position.y = 0.34;
      group.add(inner);
    } else if (type === 'spawn_carrot') {
      // Beach-Shorts Dare-Carrot Domino
      const carrot = window.BlahajModels.createBeachCarrot(0x2d9cdb);
      group.add(carrot);
    } else if (type === 'bounce_pad') {
      // Springy Plush Carrot Bounce Pad / Trampoline
      const rim = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.35, 12, 24), goldMat);
      rim.rotation.x = Math.PI / 2;
      rim.position.y = 0.35;
      group.add(rim);

      const pad = new THREE.Mesh(new THREE.CylinderGeometry(1.95, 1.95, 0.25, 24), plushRoseMat);
      pad.position.y = 0.32;
      group.add(pad);
    } else if (type === 'carrot_ramp') {
      // Bamboo Carrot Launch Ramp
      const ramp = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.28, 6.0), goldMat);
      ramp.position.set(0, 0.95, 0);
      ramp.rotation.x = -Math.atan2(1.9, 6.0);
      group.add(ramp);
    } else if (type === 'shark_statue') {
      // Golden Blåhaj Guardian Statue
      const ped = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.8, 1.4, 12), basaltMat);
      ped.position.y = 0.7;
      group.add(ped);

      const statueShark = window.BlahajModels.createPlushShark({
        bodyColor: 0xf5cd79,
        bellyColor: 0xfff3d1,
        scarfColor: 0x9b6dff,
        scale: 1.05
      });
      statueShark.position.y = 1.4;
      group.add(statueShark);
    }

    if (isPreview) {
      applyHologramMaterial(group);
    }

    return group;
  }

  function placeBuiltStructure(scene, itemData) {
    // Avoid duplicate IDs when syncing across Co-op
    if (builtStructures.some((s) => s.id === itemData.id)) {
      return null;
    }

    // Special case: 'spawn_carrot' spawns a live knockable Dare-Carrot into balconyCarrots AND records the structure!
    const mesh = createStructureMesh(itemData.type, false);
    mesh.position.set(itemData.x, itemData.y, itemData.z);
    mesh.rotation.y = itemData.rotY || 0;

    // Attach Hiram's spinning Golden Sacred Allen Key self-assembly animation!
    const allenWrench = createGoldenAllenKey(1.1);
    allenWrench.position.set(0, 3.8, 0);
    mesh.add(allenWrench);

    scene.add(mesh);

    if (itemData.type === 'spawn_carrot') {
      const shortsColors = [0xff5964, 0x35a7ff, 0x2ec4b6, 0xffbe0b, 0x9b5de5];
      const carrotMesh = window.BlahajModels.createBeachCarrot(
        shortsColors[balconyCarrots.length % shortsColors.length]
      );
      carrotMesh.position.set(itemData.x, itemData.y, itemData.z);
      carrotMesh.rotation.y = itemData.rotY || 0;
      scene.add(carrotMesh);
      balconyCarrots.push({
        mesh: carrotMesh,
        homePos: new THREE.Vector3(itemData.x, itemData.y, itemData.z),
        vel: new THREE.Vector3(0, 0, 0),
        knockedOff: false,
        respawnTimer: 0,
        structureId: itemData.id
      });
      mesh.visible = false; // The live physics carrot mesh represents this item!
    }

    const record = {
      id: itemData.id,
      type: itemData.type,
      x: itemData.x,
      y: itemData.y,
      z: itemData.z,
      rotY: itemData.rotY || 0,
      builder: itemData.builder || 'Hiram',
      mesh,
      allenWrench,
      assembleTimer: 1.15,
      ovenTimer: 2.0
    };
    builtStructures.push(record);
    return record;
  }

  function removeBuiltStructure(scene, id) {
    const idx = builtStructures.findIndex((s) => s.id === id);
    if (idx === -1) return null;
    const st = builtStructures[idx];
    if (st.mesh) scene.remove(st.mesh);

    // Also remove any associated spawned carrot
    for (let i = balconyCarrots.length - 1; i >= 0; i--) {
      if (balconyCarrots[i].structureId === id) {
        scene.remove(balconyCarrots[i].mesh);
        balconyCarrots.splice(i, 1);
      }
    }

    builtStructures.splice(idx, 1);
    return st;
  }

  // ==========================================================================
  // UPDATE WORLD (GRASS, WATER, TRAPS, CARROTS, BIRBS, STRUCTURES & BALLS)
  // ==========================================================================
  function updateWorld(time, dt = 0.016, scene = null) {
    if (waterUniforms) waterUniforms.uTime.value = time;
    if (grassUniforms) grassUniforms.uTime.value = time;
    if (lavaLight) lavaLight.intensity = 2.9 + Math.sin(time * 4.5) * 0.55;

    if (emberSystem) {
      const pos = emberSystem.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        let y = pos.getY(i) + 0.14;
        if (y > 115) y = 56;
        pos.setY(i, y);
      }
      pos.needsUpdate = true;
    }

    // 0. Update Hiram's Built Structures (Sacred Allen Key Assembly, Obelisks & Breb Ovens!)
    builtStructures.forEach((st) => {
      if (st.assembleTimer > 0) {
        st.assembleTimer = Math.max(0, st.assembleTimer - dt);
        const prog = 1 - st.assembleTimer / 1.15;
        const bounceScale = prog < 0.8 ? (prog / 0.8) * 1.08 : 1.08 - ((prog - 0.8) / 0.2) * 0.08;
        st.mesh.scale.setScalar(Math.max(0.05, bounceScale));
        if (st.allenWrench) {
          st.allenWrench.rotation.y = time * 10.0;
          st.allenWrench.position.y = 3.2 + Math.sin(prog * Math.PI) * 1.2;
          if (st.assembleTimer <= 0) {
            st.mesh.remove(st.allenWrench);
            st.allenWrench = null;
            st.mesh.scale.setScalar(1.0);
          }
        }
      }
      if (st.type === 'allen_obelisk' && st.mesh) {
        st.mesh.children.forEach((ch) => {
          if (ch.userData && ch.userData.isSpinningAllen) {
            ch.rotation.y = time * 1.8;
            ch.position.y = 2.6 + Math.sin(time * 2.5) * 0.22;
          }
        });
      } else if (st.type === 'breb_oven' && scene) {
        st.ovenTimer -= dt;
        if (st.ovenTimer <= 0) {
          st.ovenTimer = 11.0;
          if (activeBrebLoaves.length < 10) {
            spawnBrebLoaf(scene, new THREE.Vector3(st.x + Math.sin(st.rotY) * 1.8, st.y, st.z + Math.cos(st.rotY) * 1.8));
          }
        }
      }
    });

    // 1. Update Volcano Trial Dungeon Traps (Pendulums & Lava Geysers)
    dungeonTraps.forEach((tr) => {
      if (tr.type === 'pendulum') {
        const swingAngle = Math.sin(time * tr.speed + tr.phase) * 0.85;
        tr.pivot.rotation.z = swingAngle;
        tr.hitPos.x = -28 + Math.sin(swingAngle) * 7.4;
        tr.hitPos.y = tr.baseY + 9.2 - Math.cos(swingAngle) * 7.4;
      } else if (tr.type === 'geyser') {
        const cycle = Math.sin(time * 1.8 + tr.phase);
        tr.active = cycle > 0.25;
        tr.plume.visible = tr.active;
        if (tr.active) {
          const scaleY = (cycle - 0.25) / 0.75;
          tr.plume.scale.set(1, scaleY, 1);
          tr.plume.position.y = tr.baseY + scaleY * 3.2;
        }
      }
    });

    // 2. Update Knockable Balcony & Domino Carrots Physics (Including Bounce Pads & Domino Collisions!)
    balconyCarrots.forEach((c, idx) => {
      if (c.vel.lengthSq() > 0.01 || c.knockedOff) {
        c.vel.y -= 19.5 * dt;
        c.mesh.position.addScaledVector(c.vel, dt);
        c.mesh.rotation.x += c.vel.z * dt * 0.4;
        c.mesh.rotation.z -= c.vel.x * dt * 0.4;

        const groundY = getGroundAndStructureHeight(c.mesh.position.x, c.mesh.position.z, c.mesh.position.y);
        if (c.mesh.position.y < groundY) {
          c.mesh.position.y = groundY;
          c.vel.y = Math.abs(c.vel.y) * 0.45;
          c.vel.x *= 0.78;
          c.vel.z *= 0.78;

          // Check if Carrot landed on a Plush Bounce Pad!
          builtStructures.forEach((st) => {
            if (st.type === 'bounce_pad') {
              const dx = c.mesh.position.x - st.x;
              const dz = c.mesh.position.z - st.z;
              if (dx * dx + dz * dz < 6.0) {
                c.vel.y = 17.5;
                c.vel.x += Math.sin(st.rotY) * 8.0;
                c.vel.z += Math.cos(st.rotY) * 8.0;
              }
            }
          });
        }

        // Carrot-to-Carrot Domino Chain Reaction!
        balconyCarrots.forEach((other, oIdx) => {
          if (oIdx !== idx && !other.knockedOff) {
            const d = c.mesh.position.distanceTo(other.mesh.position);
            if (d < 1.85) {
              other.knockedOff = true;
              other.respawnTimer = 9.5;
              const push = other.mesh.position.clone().sub(c.mesh.position).normalize();
              other.vel.set(push.x * 12.0, 8.5, push.z * 12.0);
            }
          }
        });

        if (c.knockedOff) {
          c.respawnTimer -= dt;
          if (c.respawnTimer <= 0) {
            c.knockedOff = false;
            c.vel.set(0, 0, 0);
            c.mesh.position.copy(c.homePos);
            c.mesh.rotation.set(0, Math.PI, 0);
          }
        }
      }
    });

    // 3. Update Birbs (Flocking to thrown Breb Loaves!)
    for (let i = activeBrebLoaves.length - 1; i >= 0; i--) {
      activeBrebLoaves[i].life -= dt;
      if (activeBrebLoaves[i].life <= 0) {
        if (scene) scene.remove(activeBrebLoaves[i].mesh);
        activeBrebLoaves.splice(i, 1);
      }
    }

    birbFlock.forEach((b) => {
      let nearestBreb = null;
      let minD = 22;
      activeBrebLoaves.forEach((loaf) => {
        const d = loaf.pos.distanceTo(b.mesh.position);
        if (d < minD) {
          minD = d;
          nearestBreb = loaf;
        }
      });

      const dest = nearestBreb ? nearestBreb.pos : b.homePos;
      const dist = dest.distanceTo(b.mesh.position);
      if (dist > 0.75) {
        const dir = dest.clone().sub(b.mesh.position).normalize();
        const spd = nearestBreb ? 5.5 : 1.8;
        b.mesh.position.x += dir.x * spd * dt;
        b.mesh.position.z += dir.z * spd * dt;
        b.mesh.rotation.y = Math.atan2(dir.x, dir.z);
      }
      const groundY = getGroundAndStructureHeight(b.mesh.position.x, b.mesh.position.z, b.mesh.position.y);
      const hopSpeed = nearestBreb ? 14 : 6;
      b.mesh.position.y = groundY + Math.abs(Math.sin(time * hopSpeed + b.hopPhase)) * (nearestBreb ? 0.35 : 0.14);

      if (b.mesh.userData.leftWing && b.mesh.userData.rightWing) {
        const flap = Math.sin(time * 18 + b.hopPhase) * (nearestBreb ? 0.65 : 0.2);
        b.mesh.userData.leftWing.rotation.z = flap;
        b.mesh.userData.rightWing.rotation.z = -flap;
      }
    });

    // 4. Update Swimming & Leaping Tropical Fishes
    fishSchool.forEach((f) => {
      const prevWave = Math.sin((time - dt) * 2.4 + f.jumpPhase);
      f.angle += f.speed * dt;
      const nx = f.centerX + Math.cos(f.angle) * f.radius;
      const nz = f.centerZ + Math.sin(f.angle) * f.radius;
      const leapWave = Math.sin(time * 2.4 + f.jumpPhase);
      const ny = leapWave > 0.6 ? (leapWave - 0.6) * 3.8 : -0.15 + leapWave * 0.15;

      f.mesh.position.set(nx, ny, nz);
      f.mesh.rotation.y = -f.angle;
      f.mesh.rotation.x = leapWave > 0.6 ? -Math.cos(time * 2.4 + f.jumpPhase) * 0.6 : 0;

      // Splash sound effect on fish breaching surface
      if (prevWave <= 0.6 && leapWave > 0.6 && window.CozyAudioTrigger) {
        window.CozyAudioTrigger.fishSplash(f.mesh.position);
      }
    });

    // 5. Update Bouncy Beach Balls & Boats on the Rolling 3D Ocean Waves!
    beachBalls.forEach((bb) => {
      bb.mesh.position.x += bb.vel.x * dt;
      bb.mesh.position.z += bb.vel.z * dt;
      bb.mesh.rotation.x += bb.vel.z * dt;
      bb.mesh.rotation.z -= bb.vel.x * dt;
      bb.vel.multiplyScalar(0.96);

      const gy = getTerrainHeight(bb.mesh.position.x, bb.mesh.position.z);
      const waterLevel = getWaveHeight(bb.mesh.position.x, bb.mesh.position.z, time) + 0.42;
      bb.mesh.position.y = Math.max(gy + 0.8, waterLevel);
    });

    [...fleetBoats, partnerBoatMesh].forEach((bm) => {
      if (bm && bm.visible) {
        const wH = getWaveHeight(bm.position.x, bm.position.z, time);
        bm.position.y = wH + 0.25;
        bm.rotation.x = Math.sin(time * 1.9 + bm.position.x * 0.08) * 0.055;
        bm.rotation.z = Math.cos(time * 1.6 + bm.position.z * 0.08) * 0.065;
      }
    });

    // 6. Drift Volumetric Sunset Clouds around High Island
    cloudClusters.forEach((cl) => {
      cl.angle += cl.speed * dt;
      cl.mesh.position.x = Math.cos(cl.angle) * cl.radius;
      cl.mesh.position.z = Math.sin(cl.angle) * cl.radius - 25;
      cl.mesh.position.y = cl.height + Math.sin(time * 0.6 + cl.angle * 3.0) * 1.1;
      cl.mesh.rotation.y = -cl.angle + Math.PI * 0.5;
    });

    animatedObjects.forEach((item) => {
      if (item.type === 'portal_spin') {
        item.mesh.rotation.z = time * 1.25;
      } else if (item.type === 'spin_slow') {
        item.mesh.rotation.y = time * 0.45;
        item.mesh.rotation.z = Math.sin(time * 0.5) * 0.25;
      } else if (item.type === 'spin_bob') {
        item.mesh.rotation.y = time * 1.1;
        item.mesh.position.y = item.baseY + Math.sin(time * 2.2) * 0.25;
      }
    });
  }

  return {
    buildWorld,
    getTerrainHeight,
    getGroundAndStructureHeight,
    isInsideVolcanoDungeon,
    isOnIslandRoad,
    getWaveHeight,
    updateWorld
  };
})();

