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
  const deckChairs = [];
  window.BlahajDeckChairs = deckChairs;
  const activeBrebLoaves = [];
  const dungeonTraps = [];
  const builtStructures = [];
  const signposts = [];
  const cloudClusters = [];
  const fleetBoats = [];
  const kelpPlants = [];
  const deepJellyfish = [];
  const coralFormations = [];

  let boatMesh = null;
  let partnerBoatMesh = null;
  let lavaLight = null;
  let waterMesh = null;
  let waterUniforms = null;
  let grassUniforms = null;
  let emberSystem = null;
  let terrainBumpTex = null;

  // Celestial Day/Night & Lighting references
  let hemiLight = null;
  let dirLight = null;
  let skyMat = null;
  let skyUniforms = null;
  let starPoints = null;
  let skyMesh = null;
  let sunGroup = null;
  let moonGroup = null;
  let lastCamera = null;
  let cloudMat = null;

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

  // --------------------------------------------------------------------------
  // OCEAN WAVE CYCLE & TIDE DYNAMICS
  // Swell naturally undulates between gentle calm ripples (0.35x) and high rolling seas (2.05x)
  // --------------------------------------------------------------------------
  let currentWaveAmp = 1.0;
  let waveAutoCycle = true;
  let waveManualAmp = 1.0;

  function getWaveAmplitude(time) {
    if (!waveAutoCycle) return waveManualAmp;
    // Harmonic swell wave: ~75-80 second full swell undulation
    const primary = Math.sin(time * 0.082);
    const secondary = Math.sin(time * 0.034) * 0.22;
    const norm = Math.max(0.0, Math.min(1.0, 0.5 + 0.5 * primary + secondary));
    return 0.35 + norm * 1.70; // 0.35x (placid ripples) to 2.05x (tall ocean rollers)
  }

  function setWaveState(opts = {}) {
    if (typeof opts.auto === 'boolean') waveAutoCycle = opts.auto;
    if (typeof opts.amplitude === 'number') {
      waveManualAmp = Math.max(0.2, Math.min(2.5, opts.amplitude));
      if (!waveAutoCycle) currentWaveAmp = waveManualAmp;
    }
  }

  function getWaveState() {
    return {
      amplitude: currentWaveAmp,
      autoCycle: waveAutoCycle,
      label: currentWaveAmp < 0.65 ? 'Gentle Mirror Ripples' :
             currentWaveAmp < 1.35 ? 'Moderate Ocean Swell' :
             'High Rolling Seas & Whitecaps'
    };
  }

  // Analytical 3D Rolling Ocean Wave Height (matches GLSL vertex shader!)
  function getWaveHeight(x, z, time, ampOverride) {
    const t = (time !== undefined && time !== null) ? time : (waterUniforms ? waterUniforms.uTime.value : 0.0);
    const amp = (ampOverride !== undefined) ? ampOverride : currentWaveAmp;
    const w1 = Math.sin(x * 0.065 + t * 1.65) * Math.cos(z * 0.055 + t * 1.35) * 0.36 * amp;
    const w2 = Math.sin((x * 0.8 + z * 0.6) * 0.12 - t * 2.15) * 0.18 * amp;
    const w3 = Math.cos((x - z * 0.9) * 0.19 + t * 2.7) * 0.09 * amp;
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
    return false;
  }

  // ==========================================================================
  // DISTANCE TO NEAREST COASTLINE (MAIN ISLAND, VOLCANO & 4 OUTER SANCTUARIES)
  // ==========================================================================
  function getDistanceToNearestCoast(x, z) {
    // 1. Main Island Coastline
    const dxM = x - 0;
    const dzM = z - 12;
    const aM = Math.atan2(dzM, dxM);
    const rM = 74 + Math.cos(aM * 3 - 0.4) * 11 + Math.sin(aM * 5 + 1.1) * 6;
    let dMin = Math.sqrt(dxM * dxM + dzM * dzM) - rM;

    // 2. Volcano Peninsula & Caldera Footprint
    const dxV = x - (-28);
    const dzV = z - (-148);
    const aV = Math.atan2(dzV, dxV);
    const rV = 76 + Math.cos(aV * 4) * 5 + Math.sin(aV * 7) * 3;
    const dVolc = Math.sqrt(dxV * dxV + dzV * dzV) - rV;
    if (dVolc < dMin) dMin = dVolc;

    // Isthmus spine connecting main island to volcano (z in [-32, -105])
    if (z < -32 && z > -105) {
      const tIsth = (-z - 32) / 73;
      const spineX = -14 - Math.sin(tIsth * Math.PI * 0.65) * 10;
      const isthWidth = 14.0 - Math.sin(tIsth * Math.PI) * 3.5;
      const dIsth = Math.abs(x - spineX) - isthWidth;
      if (dIsth < dMin) dMin = dIsth;
    }

    // 3. The 4 Outer Buildable Sanctuary Islands
    for (let i = 0; i < OUTER_ISLANDS.length; i++) {
      const isl = OUTER_ISLANDS[i];
      const dxI = x - isl.x;
      const dzI = z - isl.z;
      const aI = Math.atan2(dzI, dxI);
      const rI = isl.radius + Math.cos(aI * 3 + i) * 4.5 + Math.sin(aI * 5 - i) * 2.5;
      const dIsl = Math.sqrt(dxI * dxI + dzI * dzI) - rI;
      if (dIsl < dMin) dMin = dIsl;
    }

    return dMin;
  }

  // ==========================================================================
  // CLEAN BEACH SAND BAND (TRADITIONAL TIDY WADING & SWIMMING SEABED)
  // Protected zones extending offshore from beaches: clean ripple sand,
  // free of weeds, kelp stipes, or coral clusters.
  // ==========================================================================
  function isInCleanBeachSandBand(x, z) {
    // 1. Crescent Harbour & Tea Beach (Primary resort beach and bathing basin)
    // Extends from shore (z ~ 48) out to z = 85, across the sheltered inner bay
    if (Math.abs(x) < 42 && z >= 45 && z <= 85) {
      return true;
    }

    // 2. East Cape Portal Gate Sandy Beach Cove
    if (x >= 56 && x <= 88 && z >= -28 && z <= 22) {
      const dCoast = getDistanceToNearestCoast(x, z);
      if (dCoast < 22.0) return true;
    }

    // 3. Sunny the Beach Carrot's Sandy Cove & Parasol Strand
    const dSunny = Math.hypot(x - 20, z - 62);
    if (dSunny < 24.0) return true;

    // 3b. Crescent Beach Shark Volleyball Flat Sand Terrace (x: 28, z: 52)
    const dVolleySand = Math.hypot(x - 28, z - 52);
    if (dVolleySand < 18.0) return true;

    // 4. In south crescent sector past z > 85, transition to offshore meadow & barrier reef
    if (Math.abs(x) < 45 && z > 85) return false;

    // 5. General pristine beach sand band: shallow near-shore perimeter around main & outer islands
    // Exclude rugged volcanic cliffs (z < -115) and steep western artisan rock cliffs
    if (z < -115) return false;
    if (x < -55 && z < -5 && z > -35) return false;

    const dCoast = getDistanceToNearestCoast(x, z);
    const depth = getTerrainHeight(x, z);
    return dCoast >= 0 && dCoast < 18.0 && depth > -3.0;
  }

  // ==========================================================================
  // PROCEDURAL OCEANIC SEABED BATHYMETRY & REEF DEPTH
  // Near Shelf (30-40m) -> Mid-Shelf Step -> Grand Drop-Off -> Capped Deep Shelf
  // ==========================================================================
  function getOceanSeabedDepth(x, z) {
    const dCoast = Math.max(0, getDistanceToNearestCoast(x, z));

    // Base undulating seabed dunes and geological ripple noise
    const duneNoise = Math.sin(x * 0.038 + z * 0.032) * 0.75 + Math.cos(x * 0.075 - z * 0.065) * 0.35;
    const rippleNoise = Math.sin(x * 0.16 + z * 0.14) * 0.22;

    // 1. Near Shelf (0m to 36m from coast):
    // Gentle sunlit lagoon, kelp beds, and coral gardens (-2.0m to -4.8m)
    let d = -2.2 - (dCoast / 36.0) * 2.6; // drops from -2.2m to -4.8m

    // Sheltered South Crescent Lagoon enhancement (depth -3.2m to -4.5m)
    const dLagoon = Math.hypot(x, z - 70);
    if (dLagoon < 42) {
      const fLagoon = 1 - smoothstep(10, 42, dLagoon);
      d = d * (1 - fLagoon) + (-3.4 + Math.sin(x * 0.12) * 0.35) * fLagoon;
    }

    // 2. Mid-Shelf Step-down (36m to 56m from coast):
    // First distinct terrace drop from -4.8m down to -9.2m
    if (dCoast > 36) {
      const tMid = smoothstep(36, 46, dCoast);
      // Intermediate rocky shelf plateau sitting at -9.2m (-8.5m to -9.8m with dunes)
      d = d * (1 - tMid) + (-9.2 + duneNoise * 0.5) * tMid;
    }

    // 3. The Grand Continental Drop-Off (Big Deep Step Change: 56m to 72m from coast):
    // A dramatic, steep oceanic plunge dropping from -9.2m down to -21.5m!
    if (dCoast > 56) {
      const tDrop = smoothstep(56, 70, dCoast);
      // Abyssal deep ocean shelf floor capped at -21.5m
      d = d * (1 - tDrop) + (-21.5 + duneNoise) * tDrop;
    }

    // 4. Volcanic oceanic trench plunge north of Volcano Peninsula (z < -135)
    const dVolcCenter = Math.hypot(x - -28, z - -148);
    if (dVolcCenter > 80 && z < -135) {
      const trench = smoothstep(80, 190, dVolcCenter);
      d -= trench * 2.0;
    }

    // Add ripples
    d += rippleNoise;

    // Capped strictly between -2.0m and -23.5m to avoid unbounded depth and latency!
    return Math.min(-2.0, Math.max(-23.5, d));
  }

  function getTerrainHeight(x, z) {
    // 1. Rear Volcano Wharf Dock Plank & Sea Cave Cavern (North side of Volcano Peninsula: x = -28, z = -172..-218)
    if (Math.abs(x - -28) < 5.8 && z <= -172 && z >= -218) {
      return 1.4;
    }

    // 2. Tea Docks in South Crescent Harbour (x: 0, z: 46..70)
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

    const baseSeabed = getOceanSeabedDepth(x, z);

    // 5. Main Blåhaj Island multi-contour landmass
    const dxMain = x - 0;
    const dzMain = z - 12;
    const angleMain = Math.atan2(dzMain, dxMain);
    const coastRadius =
      74 +
      Math.cos(angleMain * 3 - 0.4) * 11 +
      Math.sin(angleMain * 5 + 1.1) * 6;
    const distMain = Math.sqrt(dxMain * dxMain + dzMain * dzMain);

    let hMain = baseSeabed;
    if (distMain < coastRadius + 24) {
      const landFactor = 1 - smoothstep(coastRadius * 0.35, coastRadius + 14, distMain);
      const islandElev = -1.2 + landFactor * 7.8 + fbmNoise(x, z) * landFactor * 1.35;
      hMain = baseSeabed * (1 - landFactor) + islandElev * landFactor;
    }

    // Sheltered South Crescent Harbour Cove around (0, 66)
    const dHarbour = Math.sqrt(x * x + Math.pow(z - 70, 2));
    if (dHarbour < 28) {
      const coveFactor = 1 - smoothstep(8, 28, dHarbour);
      hMain -= coveFactor * 4.2;
    }

    // Wide, Spacious Crescent Beach Shark Volleyball Flat Sand Terrace around (28, 52)
    const dVolleyBeach = Math.hypot(x - 28, z - 52);
    if (dVolleyBeach < 15.0) {
      const fVolley = 1 - smoothstep(9.0, 15.0, dVolleyBeach);
      hMain = hMain * (1 - fVolley) + 1.65 * fVolley;
    }

    // Heartland Plaza around Sacred Tea House (0, 10)
    const dTea = Math.sqrt(x * x + Math.pow(z - 10, 2));
    if (dTea < 18) {
      const f = 1 - smoothstep(9, 18, dTea);
      hMain = hMain * (1 - f) + 4.2 * f;
    }

    // Northeast Crust Cliffs & Observatory Highlands (52, -48)
    const dObs = Math.sqrt(Math.pow(x - 52, 2) + Math.pow(z - -48, 2));
    let hObs = baseSeabed;
    if (dObs < 34) {
      const fObs = 1 - smoothstep(11, 34, dObs);
      hObs = -1.5 + fObs * 13.0 + Math.sin(x * 0.2) * 0.35 * (1 - fObs);
    }

    // East Cape Peninsula for Great Portal Gate (72, -10)
    const dPortal = Math.sqrt(Math.pow(x - 72, 2) + Math.pow(z - -10, 2));
    let hPortal = baseSeabed;
    if (dPortal < 26) {
      const fPort = 1 - smoothstep(10, 26, dPortal);
      hPortal = -1.5 + fPort * 6.4;
    }

    // Southwest Bluff for Spherical Foods Café (-52, 34)
    const dSphere = Math.sqrt(Math.pow(x - -52, 2) + Math.pow(z - 34, 2));
    let hSphere = baseSeabed;
    if (dSphere < 26) {
      const fSph = 1 - smoothstep(10, 26, dSphere);
      hSphere = -1.5 + fSph * 8.2;
    }

    // Western Artisans' Ridge for Laundry of Initiation (-64, -14)
    const dLaundry = Math.sqrt(Math.pow(x - -64, 2) + Math.pow(z - -14, 2));
    let hLaundry = baseSeabed;
    if (dLaundry < 26) {
      const fLau = 1 - smoothstep(10, 26, dLaundry);
      hLaundry = -1.5 + fLau * 8.8;
    }

    // 6. THE SACRED VOLCANO PENINSULA (Isthmus + Massive Truncated Caldera Volcano)
    let hIsthmus = baseSeabed;
    if (z < -32 && z > -105) {
      const tIsth = (-z - 32) / 73;
      const spineX = -14 - Math.sin(tIsth * Math.PI * 0.65) * 10;
      const distFromSpine = Math.abs(x - spineX);
      const isthWidth = 14.0 - Math.sin(tIsth * Math.PI) * 3.5;
      if (distFromSpine < isthWidth + 10) {
        const fIsth = 1 - smoothstep(isthWidth * 0.45, isthWidth + 8, distFromSpine);
        const targetElev = 3.2 + Math.pow(tIsth, 1.35) * 13.3;
        hIsthmus = baseSeabed * (1 - fIsth) + fIsth * targetElev;
      }
    }

    const vx = x - -28;
    const vz = z - -148;
    const dVolcano = Math.sqrt(vx * vx + vz * vz);
    const vAngle = Math.atan2(vz, vx);
    // Grand volcano footprint
    const penRadius = 76 + Math.cos(vAngle * 4) * 5 + Math.sin(vAngle * 7) * 3;

    let hVolcano = baseSeabed;
    if (dVolcano < penRadius) {
      const norm = Math.max(0, 1 - dVolcano / penRadius);
      const ribs = Math.sin(vAngle * 9 + dVolcano * 0.05) * 1.6 * norm * (1 - Math.pow(norm, 2.5));
      // Sheer, unclimbable mountain cliffs rising up to caldera rim at y ≈ 56
      let cone = -2.0 + Math.pow(norm, 1.35) * 60.0 + ribs;

      // Truncated caldera crater bowl (clean drop into caldera basin)
      if (dVolcano < 22) {
        const craterDrop = Math.cos((dVolcano / 22) * (Math.PI * 0.5)) * 26.0;
        cone -= craterDrop;
      }

      // North Wharf Sea Cove: carve deep navigable water around the Rear Wharf (z < -184)
      if (z < -184) {
        const dWharfDock = Math.abs(x - -28);
        if (dWharfDock > 4.2 || z < -218) {
          cone = baseSeabed;
        } else {
          cone = Math.min(cone, 1.4);
        }
      }

      hVolcano = cone;
    }

    // 7. THE 4 OUTER BUILDABLE SANCTUARY ISLANDS (Wide flat plateaus + sandy beaches!)
    let hOuter = baseSeabed;
    for (let i = 0; i < OUTER_ISLANDS.length; i++) {
      const isl = OUTER_ISLANDS[i];
      const dx = x - isl.x;
      const dz = z - isl.z;
      const ang = Math.atan2(dz, dx);
      const r = isl.radius + Math.cos(ang * 3 + i) * 4.5 + Math.sin(ang * 5 - i) * 2.5;
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d < r + 22) {
        const f = 1 - smoothstep(r * 0.65, r + 12, d);
        const gentleRipple = Math.sin(x * 0.08 + z * 0.08) * 0.12 * f;
        const hIsl = baseSeabed * (1 - f) + f * (isl.elev + 2.2) - 2.2 * (1 - f) + gentleRipple;
        if (hIsl > hOuter) hOuter = hIsl;
      }
    }

    return Math.max(baseSeabed, hMain, hObs, hPortal, hSphere, hLaundry, hIsthmus, hVolcano, hOuter);
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
        // Solid Conical Canopy Roof (ConeGeometry: r=4.3, h=1.8 at st.y + 4.4, base=3.5, apex=5.3)
        const rGz = Math.hypot(lx, lz);
        if (rGz <= 4.3 && refY !== null && refY >= st.y + 2.8) {
          const roofGz = st.y + 3.5 + 1.8 * (1.0 - rGz / 4.3);
          if (roofGz <= refY + 2.8 && roofGz > surfY) {
            surfY = roofGz;
          }
        }
      } else if (st.type === 'birch_cabin') {
        if (Math.abs(lx) <= 3.4 && Math.abs(lz) <= 3.8) {
          surfY = st.y + 0.32;
        }
        // Solid A-Frame Pitched Roof (ridge along z=0 at y=st.y+5.1, eaves at |lx|=2.7 at y=st.y+3.3)
        if (Math.abs(lx) <= 2.8 && Math.abs(lz) <= 3.8 && refY !== null && refY >= st.y + 2.6) {
          const roofCabin = st.y + 5.1 - (Math.abs(lx) / 2.8) * 1.8;
          if (roofCabin <= refY + 2.8 && roofCabin > surfY) {
            surfY = roofCabin;
          }
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
      } else if (st.type === 'pocket_portal') {
        if (lx * lx + lz * lz <= 7.3) {
          surfY = st.y + 0.36;
        }
      } else if (st.type === 'cushion_circle' || st.type === 'plush_cushion') {
        if (lx * lx + lz * lz <= 4.0) {
          surfY = st.y + 0.65;
        }
      } else if (st.type === 'kotatsu_table') {
        if (lx * lx + lz * lz <= 7.8) {
          if (lx * lx + lz * lz <= 2.7) surfY = st.y + 0.89; // tabletop
          else surfY = st.y + 0.23; // cushions
        }
      } else if (st.type === 'breb_oven') {
        if (Math.abs(lx) <= 1.45 && Math.abs(lz) <= 1.35) {
          if (lx * lx + lz * lz <= 1.8) surfY = st.y + 3.15; // dome top
          else surfY = st.y + 1.80; // hearth counter
        }
      } else if (st.type === 'shark_statue') {
        if (lx * lx + lz * lz <= 3.3) {
          surfY = st.y + 1.40; // pedestal top
        }
      } else if (st.type === 'allen_obelisk') {
        if (lx * lx + lz * lz <= 2.3) {
          surfY = st.y + 2.40; // obelisk pedestal top
        }
      }

      if (surfY > -900) {
        if (refY === null || (surfY <= refY + 2.8 && surfY >= refY - 1.2)) {
          if (surfY > bestY) bestY = surfY;
        }
      }
    }
    return bestY;
  }

  // Compute solid walkable surface height for all permanent Island Landmarks, Daises, Platforms & Decks!
  function getLandmarkSurfaceHeight(x, z, refY = null, forCamera = false) {
    let bestY = -999;

    // 1. The Great Portal Gate Dais on East Cape (x = 72, z = -10)
    // Basalt/stone circular dais: CylinderGeometry(8.5, 9.8, 1.4, 28) placed at (72, y0 + 0.6, -10)
    const dPortal = Math.hypot(x - 72, z - (-10));
    if (dPortal <= 9.8) {
      const y0 = getTerrainHeight(72, -10);
      const topY = y0 + 1.30;
      if (refY === null || topY <= refY + 2.8) {
        if (topY > bestY) bestY = topY;
      }
    }

    // 2. The Sacred Tea House Village (x = 0, z = 10)
    // Plaza: CylinderGeometry(12.2, 13.4, 0.6, 36) at y = y0 + 0.25 (top: y0 + 0.55, r <= 13.4)
    // Timber Floor Deck: CylinderGeometry(9.4, 9.8, 0.55, 32) at y = y0 + 0.65 (top: y0 + 0.925, r <= 9.8)
    // Central Tea Table: CylinderGeometry(3.2, 2.6, 1.25, 28) at y = y0 + 1.4 (top: y0 + 2.025, r <= 3.2)
    // Cushions: 6 tufted cushions at r = 4.4 around table (top: y0 + 1.225)
    const dTea = Math.hypot(x - 0, z - 10);
    if (dTea <= 13.4) {
      const y0 = getTerrainHeight(0, 10);
      let teaSurfY = -999;
      if (dTea <= 3.2) {
        teaSurfY = y0 + 2.025; // On top of the tea table
      } else if (dTea <= 9.8) {
        // Check if player is on one of the 6 tufted cushions around the table
        let onCushion = false;
        for (let idx = 0; idx < 6; idx++) {
          const ca = (idx / 6) * Math.PI * 2;
          const cx = Math.cos(ca) * 4.4;
          const cz = Math.sin(ca) * 4.4;
          if (Math.hypot(x - cx, (z - 10) - cz) <= 0.92) {
            onCushion = true;
            break;
          }
        }
        teaSurfY = onCushion ? (y0 + 1.225) : (y0 + 0.925); // On cushion or solid timber deck!
      } else {
        teaSurfY = y0 + 0.55;  // On stone plaza
      }
      if (refY === null || teaSurfY <= refY + 2.8) {
        if (teaSurfY > bestY) bestY = teaSurfY;
      }

      // Solid Walkable Pagoda Roof Tiers for the Sacred Tea House (Jumping / Dropping onto the roof):
      // Lower Cone Roof: Cone(11.4, 3.2) at y = y0 + 7.6 (Base: y0 + 6.0, Apex: y0 + 9.2)
      // Upper Cone Roof: Cone(7.8, 2.8) at y = y0 + 9.8 (Base: y0 + 8.4, Apex: y0 + 11.2)
      // Spire Kettle Top: Sphere(0.78) at y = y0 + 11.5 (Top: y0 + 12.28)
      if (dTea <= 11.4) {
        let roofSurfY = -999;
        if (dTea <= 0.9) {
          roofSurfY = y0 + 12.28;
        } else if (dTea <= 7.8) {
          roofSurfY = y0 + 8.4 + 2.8 * (1.0 - dTea / 7.8);
        } else {
          roofSurfY = y0 + 6.0 + 3.2 * (1.0 - dTea / 11.4);
        }
        // Only engage roof collision if shark is at or above roof level (prevents getting popped to roof from ground)
        if (refY !== null && refY >= y0 + 5.2 && roofSurfY <= refY + 2.8) {
          if (roofSurfY > bestY) bestY = roofSurfY;
        }
      }
    }

    // 3. The Quiet Library & Celestial Observatory Terrace (x = 52, z = -48)
    // Purple stone terrace: CylinderGeometry(9.2, 10.2, 0.9, 32) at y = y0 + 0.45 (top: y0 + 0.90, r <= 10.2)
    const dObs = Math.hypot(x - 52, z - (-48));
    if (dObs <= 10.2) {
      const y0 = getTerrainHeight(52, -48);
      const topY = y0 + 0.90;
      if (refY === null || topY <= refY + 2.8) {
        if (topY > bestY) bestY = topY;
      }
    }

    // 3b. Isthmus Causeway Torii Gates (4 solid jumpable basalt arches)
    // Only check arches for physical player movement/jumping, NOT for camera collision (forCamera === true),
    // so the camera sweeps cleanly through the gateway without clipping or hitching!
    if (!forCamera) {
      const causewayGateSpecs = [
        { x: -16.5, z: -44.0, beamW: 10.0, span: 8.0 },
        { x: -19.5, z: -58.0, beamW: 10.0, span: 8.0 },
        { x: -21.5, z: -72.0, beamW: 10.2, span: 8.2 },
        { x: -22.0, z: -85.2, beamW: 10.8, span: 8.6 }
      ];

      for (let g = 0; g < causewayGateSpecs.length; g++) {
        const gs = causewayGateSpecs[g];
        const gy = getTerrainHeight(gs.x, gs.z);
        const topBeamY = gy + 6.71; // Top of horizontal crossbeam (6.35 + 0.36)

        // Crossbeam surface
        const hw = gs.beamW * 0.5;
        if (Math.abs(x - gs.x) <= hw && Math.abs(z - gs.z) <= 0.65) {
          if (refY === null || topBeamY <= refY + 2.8) {
            if (topBeamY > bestY) bestY = topBeamY;
          }
        }
        // Top of side vertical columns
        const colOff = gs.span * 0.5;
        if ((Math.abs((x - gs.x) - colOff) <= 0.55 || Math.abs((x - gs.x) - (-colOff)) <= 0.55) && Math.abs(z - gs.z) <= 0.55) {
          const topColY = gy + 6.4;
          if (refY === null || topColY <= refY + 2.8) {
            if (topColY > bestY) bestY = topColY;
          }
        }
      }
    }

    // 4. The Ancient Volcano Exoteric Shrine Dais, Balcony, Steps & Altar (x = -22, z = -103)
    const shrineY = getTerrainHeight(-22, -103);
    const dShrine = Math.hypot(x - (-22), z - (-103));

    // Balcony Dais Surface: r <= 9.2, top = shrineY + 1.20
    if (dShrine <= 9.2) {
      let bTop = shrineY + 1.20;
      // Exoteric Offering Altar: width 3.4 (|dx| <= 1.7), depth 1.6 (z in [-100.2, -98.6])
      if (Math.abs(x - (-22)) <= 1.75 && z >= -100.2 && z <= -98.6) {
        bTop = shrineY + 1.84; // On top of the offering altar!
      }
      if (refY === null || bTop <= refY + 2.8) {
        if (bTop > bestY) bestY = bTop;
      }
    }

    // Grand Balcony Basalt Steps rising directly from Gate 3 (z = -85.5) up to the front lip of the dais (z = -94.5)
    // Width is 6.2m (|x - (-22)| <= 3.1)
    if (Math.abs(x - (-22)) <= 3.2 && z >= -94.8 && z <= -85.2) {
      const u = Math.max(0, Math.min(1, (z - (-85.2)) / (-9.3))); // 0 at Gate 3 threshold (z = -85.2), 1 at dais lip (z = -94.5)
      const stepSurfY = shrineY - 4.2 + u * 4.8 + 0.28;
      if (refY === null || stepSurfY <= refY + 2.8) {
        if (stepSurfY > bestY) bestY = stepSurfY;
      }
    }

    // 5. The Spherical Foods Bluff & Rotunda Building (x = -52, z = 34, rotY = 0.55)
    const dSphere = Math.hypot(x - (-52), z - 34);
    if (dSphere <= 11.5) {
      const y0 = getTerrainHeight(-52, 34);
      let sphereSurfY = -999;

      const dxS = x - (-52);
      const dzS = z - 34;
      const cosS = Math.cos(-0.55);
      const sinS = Math.sin(-0.55);
      const lxS = dxS * cosS - dzS * sinS;
      const lzS = dxS * sinS + dzS * cosS;

      // Solid Climbable & Jumpable Rooftop Dome (from y0 + 6.0 to y0 + 10.2, r <= 8.3)
      if (dSphere <= 8.3 && refY !== null && refY >= y0 + 5.5) {
        sphereSurfY = y0 + 6.0 + 3.8 * (1.0 - dSphere / 8.3);
      } else if (lxS >= 5.6 && lxS <= 7.8 && lzS >= -4.2 && lzS <= 1.2) {
        // Climbing Crates in local frame
        if (lzS < -2.6) sphereSurfY = y0 + 1.4;
        else if (lzS < -1.4) sphereSurfY = y0 + 2.8;
        else if (lzS < -0.2) sphereSurfY = y0 + 4.2;
        else sphereSurfY = y0 + 5.6; // Top crate steps onto dome cornice!
      } else if (dSphere <= 10.4) {
        // Entrance terrace & door landing
        if (lzS >= 7.6) {
          sphereSurfY = y0 + 0.70; // Front door entrance terrace landing
        } else if (dSphere <= 8.2) {
          // Solid rotunda walls: block entering the building wall at floor level
          sphereSurfY = y0 + 5.8;
        } else {
          sphereSurfY = y0 + 0.70; // Surrounding terrace
        }
      }
      if (refY === null || sphereSurfY <= refY + 2.8) {
        if (sphereSurfY > bestY) bestY = sphereSurfY;
      }
    }

    // 6. The Laundry Shrine Ridge Plinth (x = -64, z = -14, rotY = 0.7)
    // Brass Plinth: BoxGeometry(7.2, 0.8, 6.2) at y = y0 + 0.4 (top: y0 + 0.80)
    const dxL = x - (-64);
    const dzL = z - (-14);
    const cosL = Math.cos(-0.7);
    const sinL = Math.sin(-0.7);
    const lxL = dxL * cosL - dzL * sinL;
    const lzL = dxL * sinL + dzL * cosL;
    if (Math.abs(lxL) <= 3.7 && Math.abs(lzL) <= 3.2) {
      const y0 = getTerrainHeight(-64, -14);
      const topY = y0 + 0.80;
      if (refY === null || topY <= refY + 2.8) {
        if (topY > bestY) bestY = topY;
      }
    }

    // 7. Rear Volcano Wharf Dock & Sea Cave (x = -28, z in [-216, -172])
    // Dock: BoxGeometry(8.5, 0.7, 44) at y = 1.4 (top: 1.75)
    if (Math.abs(x - (-28)) <= 4.4 && z >= -216 && z <= -172) {
      const topY = 1.75;
      if (refY === null || (topY <= refY + 2.8 && topY >= refY - 1.2)) {
        if (topY > bestY) bestY = topY;
      }
    }

    // 8. Tea Docks Wharf (x = 0, z in [44, 70])
    // Dock: BoxGeometry(7.5, 0.65, 26) at y = 1.35 (top: 1.675)
    if (Math.abs(x - 0) <= 3.9 && z >= 44 && z <= 70) {
      const topY = 1.675;
      if (refY === null || (topY <= refY + 2.8 && topY >= refY - 1.2)) {
        if (topY > bestY) bestY = topY;
      }
    }

    // 9. Endless Pier to Erf (x = 48, z in [45, 79])
    // Pier: BoxGeometry(5.6, 0.6, 34) at y = 1.45 (top: 1.75)
    if (Math.abs(x - 48) <= 2.9 && z >= 45 && z <= 79) {
      const topY = 1.75;
      if (refY === null || (topY <= refY + 2.8 && topY >= refY - 1.2)) {
        if (topY > bestY) bestY = topY;
      }
    }

    // 10. Outer Sanctuary Islands Coastal Boat Docks (dockX, 1.4, dockZ)
    for (let i = 0; i < OUTER_ISLANDS.length; i++) {
      const isl = OUTER_ISLANDS[i];
      if (Math.abs(x - isl.dockX) <= 4.35 && Math.abs(z - isl.dockZ) <= 4.35) {
        const topY = 1.575;
        if (refY === null || (topY <= refY + 2.8 && topY >= refY - 1.2)) {
          if (topY > bestY) bestY = topY;
        }
      }
    }

    // 11. Moored Regatta Sailboats Decks
    const mooredBoats = [
      { x: 0, z: 73 },
      { x: -6.8, z: 60 },
      { x: 42.5, z: 66 },
      { x: -21.5, z: -204 }
    ];
    for (let i = 0; i < mooredBoats.length; i++) {
      const mb = mooredBoats[i];
      if (Math.hypot(x - mb.x, z - mb.z) <= 3.6) {
        const topY = 1.32;
        if (refY === null || (topY <= refY + 2.8 && topY >= refY - 1.2)) {
          if (topY > bestY) bestY = topY;
        }
      }
    }

    return bestY;
  }

  function getGroundAndStructureHeight(x, z, refY = null, forCamera = false) {
    const tY = getTerrainHeight(x, z);
    const sY = getStructureSurfaceHeight(x, z, refY, forCamera);
    const lmY = getLandmarkSurfaceHeight(x, z, refY, forCamera);
    return Math.max(tY, sY, lmY);
  }

  // Terrain surface height purely for the outer mountain mesh (so the volcano mountain arches cleanly over the interior dungeon!)
  function getExteriorMountainHeight(x, z) {
    if (Math.abs(x - -28) < 6.2 && z <= -172 && z >= -218) {
      return 1.4;
    }
    if (Math.abs(x - -28) < 12.5 && z < -184 && z >= -222) {
      return -2.5;
    }
    if (Math.abs(x - -28) < 14.0 && z <= -110 && z >= -172) {
      const vx = x - -28;
      const vz = z - -148;
      const dVolcano = Math.sqrt(vx * vx + vz * vz);
      const norm = Math.max(0, 1 - dVolcano / 78);
      let cone = -2.0 + Math.pow(norm, 1.25) * 58.0;
      if (dVolcano < 24) {
        cone -= Math.cos((dVolcano / 24) * (Math.PI * 0.5)) * 28.0;
      }
      return Math.max(22.0, cone);
    }
    return getTerrainHeight(x, z);
  }

  // ==========================================================================
  // BUILD WORLD
  // ==========================================================================
  function buildWorld(scene) {
    scene.background = new THREE.Color(0x161f36);
    scene.fog = new THREE.FogExp2(0x1e2842, 0.0015);

    hemiLight = new THREE.HemisphereLight(0xffd6a5, 0x283b5e, 0.8);
    scene.add(hemiLight);

    dirLight = new THREE.DirectionalLight(0xffb163, 1.28);
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
    updateDayNight(scene, true);

    // Sculpted Exterior Terrain Mesh (860x860 units covering Main Island, 4 Outer Islands, Shelves & Drop-Off!)
    const terrainGeo = new THREE.PlaneGeometry(860, 860, 360, 360);
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

      if (dVol < 24 && vy > 24) {
        c.setHex(0xff5e1a);
      } else if (dVol < 78 && vy > 5.0) {
        const lavaStream = Math.pow(Math.abs(Math.sin(vAng * 5 + dVol * 0.085)), 18);
        const dOverlook = Math.sqrt(Math.pow(vx - -28, 2) + Math.pow(vz - -127, 2));
        if (lavaStream > 0.62 && vy > 9.0 && dOverlook > 14) {
          c.setHex(0xff6a1f);
        } else if (dOverlook < 12.5) {
          c.setHex(0x3a3447);
        } else {
          const shade = 0.14 + (vy / 70) * 0.08;
          c.setRGB(shade + 0.03, shade, shade + 0.04);
        }
      } else if (isInCleanBeachSandBand(vx, vz) && vy < 3.2) {
        if (vy >= 0.0) {
          // Warm wide shoreline & clean dry golden beach sand
          c.setHex(0xf1dfba);
        } else {
          // Clean, sunlit Sand Band: smooth golden-ivory ripple sand with turquoise caustics
          const sandT = Math.max(0, Math.min(1, (vy - (-3.4)) / 3.4));
          const rippleSparkle = Math.sin(vx * 0.45 + vz * 0.4) * 0.025;
          c.setRGB(
            0.65 + 0.26 * sandT + rippleSparkle,
            0.75 + 0.12 * sandT + rippleSparkle,
            0.64 + 0.05 * sandT
          );
        }
      } else if (vy < 0.95) {
        const inSandBand = isInCleanBeachSandBand(vx, vz);
        if (vy >= 0.0) {
          // Warm shoreline & clean dry beach sand
          c.setHex(0xf1dfba);
        } else if (inSandBand || vy >= -2.8) {
          // Clean, sunlit Sand Band: smooth golden-ivory ripple sand with turquoise caustics
          const sandT = Math.max(0, Math.min(1, (vy - (-3.4)) / 3.4));
          const rippleSparkle = Math.sin(vx * 0.45 + vz * 0.4) * 0.025;
          c.setRGB(
            0.65 + 0.26 * sandT + rippleSparkle,
            0.75 + 0.12 * sandT + rippleSparkle,
            0.64 + 0.05 * sandT
          );
        } else if (vy >= -5.5) {
          // Near Shelf: vibrant coral reef gardens & golden-green kelp floor
          const shelfT = (vy - (-5.5)) / 2.7;
          c.setRGB(0.24 + 0.24 * shelfT, 0.48 + 0.18 * shelfT, 0.40 + 0.15 * shelfT);
        } else if (vy >= -10.5) {
          // Mid-Shelf Terrace: rocky ledges with coral lavender and sea fans
          const midT = (vy - (-10.5)) / 5.0;
          c.setRGB(0.15 + 0.12 * midT, 0.28 + 0.16 * midT, 0.35 + 0.10 * midT);
        } else if (vy >= -19.5) {
          // The Grand Continental Drop-Off: dark basaltic oceanic cliff wall
          const dropT = (vy - (-19.5)) / 9.0;
          c.setRGB(0.08 + 0.08 * dropT, 0.15 + 0.13 * dropT, 0.22 + 0.12 * dropT);
        } else {
          // Deep Ocean Abyss Floor: capped midnight navy silt & glowing mineral veins
          const abyssT = Math.max(0, (vy - (-23.5)) / 4.0);
          c.setRGB(0.04 + 0.04 * abyssT, 0.08 + 0.07 * abyssT, 0.14 + 0.08 * abyssT);
        }
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
    buildTeaDocksAndRegattaBoat(scene);
    buildEndlessPierToErf(scene);
    buildOuterSanctuaryIslands(scene);
    buildLushPalmsBouldersAndLanterns(scene);
    buildGreatSeamRifts(scene);
    buildTouristBinocularPedestals(scene);

    // Build Living World: Flocks of Birbs, Swimming Fishes & Bouncy Beach Balls!
    buildBirbFlocks(scene);
    buildWaterFishesAndBeachBalls(scene);
    buildKelpForests(scene);
    buildCoralReefs(scene);
    buildUnderwaterSeaFlora(scene);

    return {
      getTerrainHeight,
      getGroundAndStructureHeight,
      getStructureSurfaceHeight,
      getLandmarkSurfaceHeight,
      getDistanceToNearestCoast,
      getOceanSeabedDepth,
      isInCleanBeachSandBand: (x, z) => isInCleanBeachSandBand(x, z),
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
      getDeckChairs: () => deckChairs,
      getDungeonTraps: () => dungeonTraps,
      getBuiltStructures: () => builtStructures,
      createStructureMesh: (type, isPreview) => createStructureMesh(type, isPreview),
      placeBuiltStructure: (itemData) => placeBuiltStructure(scene, itemData),
      removeBuiltStructure: (id) => removeBuiltStructure(scene, id),
      spawnBrebLoaf: (pos) => spawnBrebLoaf(scene, pos),
      updateDayNight: (sc, force) => updateDayNight(sc || scene, force),
      getDayNightState: () => currentSkyState,
      getSkyKeyframes: () => SKY_KEYFRAMES,
      setWaveState,
      getWaveState,
      getWaveAmplitude: () => currentWaveAmp
    };
  }

  // ==========================================================================
  // 22,000 SWAYING 3D GRASS BLADES (MAIN ISLAND + 4 OUTER SANCTUARY ISLANDS!)
  // ==========================================================================
  // Helper: Road proximity calculation for astroturf border clipping
  function getDistanceToIslandRoad(x, z) {
    let minD = 999.0;
    // Isthmus Causeway to Volcano
    if (z < -34 && z > -104) {
      const spineX = -14 - Math.sin(((-z - 32) / 73) * Math.PI * 0.65) * 10;
      const d = Math.abs(x - spineX) - 3.6;
      if (d < minD) minD = d;
    }
    // Tea Plaza Ring
    const dTea = Math.hypot(x, z - 10);
    if (dTea > 5.0 && dTea < 13.0) {
      const d = Math.min(Math.abs(dTea - 6.5), Math.abs(dTea - 11.2));
      if (d < minD) minD = d;
    }
    // Main Hub Roads
    for (let i = 0; i < ROAD_SEGMENTS.length; i++) {
      const s = ROAD_SEGMENTS[i];
      const d = distToSegment(x, z, s.x1, s.z1, s.x2, s.z2) - s.w;
      if (d < minD) minD = d;
    }
    return minD;
  }

  // Astroturf Plush Felt Clump Geometry: 3 curved triangular blades forming a wide, lush tuft
  function createPlushTuftGeometry() {
    const geom = new THREE.BufferGeometry();
    const positions = [];
    const uvs = [];

    const numBlades = 3;
    const bladeW = 0.18;   // base width
    const bladeH = 0.36;   // astroturf / plush carpet height: 0.36m
    const curveOut = 0.16; // soft outward tip curve

    for (let b = 0; b < numBlades; b++) {
      const angle = (b * Math.PI * 2) / numBlades + (b === 1 ? 0.12 : 0);
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);

      // Tangent vector along base
      const tx = -sinA * bladeW * 0.5;
      const tz = cosA * bladeW * 0.5;

      const v0x = tx, v0y = 0.0, v0z = tz;
      const v1x = -tx, v1y = 0.0, v1z = -tz;

      const midOut = curveOut * 0.45;
      const midW = bladeW * 0.42;
      const mtx = -sinA * midW;
      const mtz = cosA * midW;
      const v2x = cosA * midOut + mtx, v2y = bladeH * 0.50, v2z = sinA * midOut + mtz;
      const v3x = cosA * midOut - mtx, v3y = bladeH * 0.50, v3z = sinA * midOut - mtz;

      const v4x = cosA * curveOut, v4y = bladeH, v4z = sinA * curveOut;

      const bladeVerts = [
        v0x, v0y, v0z,   v1x, v1y, v1z,   v2x, v2y, v2z,
        v1x, v1y, v1z,   v3x, v3y, v3z,   v2x, v2y, v2z,
        v2x, v2y, v2z,   v3x, v3y, v3z,   v4x, v4y, v4z
      ];

      for (let i = 0; i < bladeVerts.length; i += 3) {
        positions.push(bladeVerts[i], bladeVerts[i + 1], bladeVerts[i + 2]);
        uvs.push(0.5, bladeVerts[i + 1] / bladeH);
      }
    }

    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geom.computeVertexNormals();
    return geom;
  }

  // Authoritative helper: verify if the terrain at (x, z) is green meadow terrain
  // Strictly excludes rare earth, volcanic caldera rock, basalt, lava streams, roads, beaches and wharf
  function isUnderlyingTerrainGreen(x, z) {
    const vy = getExteriorMountainHeight(x, z);
    const dVol = Math.hypot(x - -28, z - -148);

    // 1. Shoreline, beach sand band, and ocean seabed (NOT green)
    if (vy < 1.15) return false;
    if (isInCleanBeachSandBand(x, z)) return false;

    // 2. High volcanic cone, caldera interior, lava streams, and sheer basalt cliffs (vy > 5.0 on mountain)
    // Green foothills belt (dVol < 78 && vy <= 5.0) IS green meadow and is permitted!
    if (dVol < 24 && vy > 24) return false;
    if (dVol < 78 && vy > 5.0) return false;

    // 3. Cobblestone roads and pathways (NOT green)
    if (isOnIslandRoad(x, z)) return false;

    // 4. Crust Cliffs rare earth / brown rock (0x9e7446) (NOT green)
    if (x > 28 && z < -25 && vy > 5.5) return false;

    // 5. Tea Plaza center / ring
    if (Math.hypot(x, z - 10) < 11.5) return false;

    // 6. Rear wharf and north sulfur shore
    if (z <= -168) return false;

    // 7. Far ocean
    if (Math.hypot(x, z) > 360) return false;

    return true;
  }

  // ==========================================================================
  // DENSE, PLUSH ASTROTURF & MEADOW CARPET (FULL TERRAIN COVERAGE, ZERO GAPS)
  // Strictly on green meadow terrain, with nocturnal darkening & distant fade
  // Covers Main Island Meadows, Volcano Base Foothills, Isthmus, and Outer Sanctuaries!
  // ==========================================================================
  function buildInstancedMeadowGrass(scene) {
    const tuftCount = 25000;
    const tuftGeo = createPlushTuftGeometry();

    grassUniforms = {
      uTime: { value: 0 },
      uNightFactor: { value: 0 }
    };

    const tuftMat = new THREE.MeshStandardMaterial({
      color: 0x489f64, // Soft, natural spring grass green
      roughness: 0.95, // High roughness for velvety fabric/turf texture (zero shiny specular glints)
      metalness: 0.0,
      side: THREE.DoubleSide
    });

    tuftMat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = grassUniforms.uTime;
      shader.uniforms.uNightFactor = grassUniforms.uNightFactor;

      shader.vertexShader =
        'uniform float uTime;\n' +
        'uniform float uNightFactor;\n' +
        shader.vertexShader.replace(
          '#include <begin_vertex>',
          [
            '#include <begin_vertex>',
            '#ifdef USE_INSTANCING',
            '  vec3 instWorldPos = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);',
            '  float worldX = instWorldPos.x;',
            '  float worldZ = instWorldPos.z;',
            '  float distToCam = distance(cameraPosition, instWorldPos);',
            '  float distFade = clamp(1.0 - (distToCam - 90.0) / 90.0, 0.0, 1.0);',
            '  distFade = distFade * distFade * (3.0 - 2.0 * distFade);',
            '  float swayY = position.y * distFade;',
            '  float sway = sin(uTime * 2.2 + worldX * 0.22 + worldZ * 0.18) * 0.12 * swayY;',
            '  transformed.x += sway;',
            '  transformed.z += cos(uTime * 1.8 + worldZ * 0.24) * 0.09 * swayY;',
            '  transformed.y *= distFade;',
            '  transformed.xz *= (0.50 + 0.50 * distFade);',
            '  #if defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR )',
            '    vec3 terrainMeadow = vec3(0.21, 0.44, 0.27);',
            '    vec3 nightGrass = vec3(0.04, 0.09, 0.05);',
            '    vec3 litGrass = mix(vColor.rgb, nightGrass, uNightFactor * 0.88);',
            '    vec3 litTerrain = mix(terrainMeadow, vec3(0.03, 0.06, 0.04), uNightFactor * 0.88);',
            '    vColor.rgb = mix(litTerrain, litGrass, distFade);',
            '  #endif',
            '#endif'
          ].join('\n')
        );
    };

    const instMesh = new THREE.InstancedMesh(tuftGeo, tuftMat, tuftCount);
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    let placed = 0;

    // 1. Place 15,000 Astroturf Tufts across Main Island Meadows & Highlands (Strictly Green Surfaces Only)
    for (let attempt = 0; attempt < 45000 && placed < 15000; attempt++) {
      const gx = (Math.random() - 0.5) * 165;
      const gz = (Math.random() - 0.5) * 150 + 10;

      if (!isUnderlyingTerrainGreen(gx, gz)) continue;

      const gy = getTerrainHeight(gx, gz);
      const dRoad = getDistanceToIslandRoad(gx, gz);

      dummy.position.set(gx, gy - 0.02, gz);
      dummy.rotation.set(
        (Math.random() - 0.5) * 0.15,
        Math.random() * Math.PI * 2,
        (Math.random() - 0.5) * 0.15
      );

      // Near road edges: neater, clipped astroturf border (0.24m). Out in hills/trees: fluffier (0.40m).
      const s = dRoad < 2.5
        ? (0.65 + Math.random() * 0.20)
        : (0.88 + Math.random() * 0.35);
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      instMesh.setMatrixAt(placed, dummy.matrix);

      // Warm cozy plush gradient
      color.setHSL(0.32 + (Math.random() - 0.5) * 0.04, 0.54, 0.32 + Math.random() * 0.10);
      instMesh.setColorAt(placed, color);
      placed++;
    }

    // 2. Place 3,500 Astroturf Tufts around the Volcano Base Foothills (Strictly Green Surfaces Only)
    const targetVolcano = placed + 3500;
    for (let attempt = 0; attempt < 12000 && placed < targetVolcano && placed < tuftCount; attempt++) {
      const r = 58 + Math.random() * 18; // dVol between 35 and 76
      const th = Math.random() * Math.PI * 2;
      const gx = -28 + Math.cos(th) * r;
      const gz = -148 + Math.sin(th) * r;

      if (!isUnderlyingTerrainGreen(gx, gz)) continue;

      const gy = getTerrainHeight(gx, gz);
      const dRoad = getDistanceToIslandRoad(gx, gz);

      dummy.position.set(gx, gy - 0.02, gz);
      dummy.rotation.set(
        (Math.random() - 0.5) * 0.15,
        Math.random() * Math.PI * 2,
        (Math.random() - 0.5) * 0.15
      );
      const s = dRoad < 2.5
        ? (0.68 + Math.random() * 0.18)
        : (0.90 + Math.random() * 0.35);
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      instMesh.setMatrixAt(placed, dummy.matrix);

      color.setHSL(0.33 + (Math.random() - 0.5) * 0.04, 0.56, 0.30 + Math.random() * 0.09);
      instMesh.setColorAt(placed, color);
      placed++;
    }

    // 3. Place 2,000 Astroturf Tufts on the Green Isthmus Spine Ridge (Strictly Green Surfaces Only)
    const targetIsthmus = placed + 2000;
    for (let attempt = 0; attempt < 9000 && placed < targetIsthmus && placed < tuftCount; attempt++) {
      const gz = -33 - Math.random() * 42; // gz in [-33, -75]
      const tIsth = (-gz - 32) / 73;
      const spineX = -14 - Math.sin(tIsth * Math.PI * 0.65) * 10;
      const gx = spineX + (Math.random() - 0.5) * 18.0;

      if (!isUnderlyingTerrainGreen(gx, gz)) continue;

      const gy = getTerrainHeight(gx, gz);
      const dRoad = getDistanceToIslandRoad(gx, gz);

      dummy.position.set(gx, gy - 0.02, gz);
      dummy.rotation.set(
        (Math.random() - 0.5) * 0.15,
        Math.random() * Math.PI * 2,
        (Math.random() - 0.5) * 0.15
      );
      const s = dRoad < 2.5
        ? (0.68 + Math.random() * 0.18)
        : (0.90 + Math.random() * 0.35);
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      instMesh.setMatrixAt(placed, dummy.matrix);

      color.setHSL(0.33 + (Math.random() - 0.5) * 0.04, 0.55, 0.30 + Math.random() * 0.09);
      instMesh.setColorAt(placed, color);
      placed++;
    }

    // 4. Place 4,500 Astroturf Tufts across the 4 Outer Sanctuary Islands (Strictly Green Surfaces Only)
    OUTER_ISLANDS.forEach((isl, idx) => {
      const targetForIsl = placed + 1125;
      for (let attempt = 0; attempt < 5000 && placed < targetForIsl && placed < tuftCount; attempt++) {
        const r = Math.sqrt(Math.random()) * (isl.radius * 0.84);
        const th = Math.random() * Math.PI * 2;
        const gx = isl.x + Math.cos(th) * r;
        const gz = isl.z + Math.sin(th) * r;

        if (!isUnderlyingTerrainGreen(gx, gz)) continue;

        const gy = getTerrainHeight(gx, gz);
        dummy.position.set(gx, gy - 0.02, gz);
        dummy.rotation.set(
          (Math.random() - 0.5) * 0.15,
          Math.random() * Math.PI * 2,
          (Math.random() - 0.5) * 0.15
        );
        const s = 0.80 + Math.random() * 0.35;
        dummy.scale.set(s, s, s);
        dummy.updateMatrix();
        instMesh.setMatrixAt(placed, dummy.matrix);

        color.setHSL(0.31 + idx * 0.012 + (Math.random() - 0.5) * 0.04, 0.52, 0.32 + Math.random() * 0.10);
        instMesh.setColorAt(placed, color);
        placed++;
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
    const waterGeo = new THREE.PlaneGeometry(1600, 1600, 240, 240);
    waterGeo.rotateX(-Math.PI / 2);

    const pos = waterGeo.attributes.position;
    const shoreDepth = new Float32Array(pos.count);
    for (let i = 0; i < pos.count; i++) {
      const wx = pos.getX(i);
      const wz = pos.getZ(i);
      shoreDepth[i] = getExteriorMountainHeight(wx, wz);
    }
    waterGeo.setAttribute('aTerrainH', new THREE.BufferAttribute(shoreDepth, 1));

    waterUniforms = {
      uTime: { value: 0 },
      uWaveAmp: { value: 1.0 },
      uCrestColor: { value: new THREE.Color(1.0, 0.72, 0.42) },
      uWaterDeepCol: { value: new THREE.Color(0.05, 0.17, 0.33) },
      uHorizonCol: { value: new THREE.Color(0xf68c68) }
    };

    const waterMat = new THREE.ShaderMaterial({
      uniforms: waterUniforms,
      transparent: true,
      depthWrite: true,
      side: THREE.DoubleSide,
      vertexShader: `
        uniform float uTime;
        uniform float uWaveAmp;
        attribute float aTerrainH;
        varying float vTerrainH;
        varying float vWave;
        varying vec2 vWorldXZ;

        void main() {
          vTerrainH = aTerrainH;
          vec3 p = position;
          vWorldXZ = p.xz;
          // Dynamic Rolling Ocean Swells (matches getWaveHeight in JS)
          float amp = uWaveAmp;
          float w1 = sin(p.x * 0.065 + uTime * 1.65) * cos(p.z * 0.055 + uTime * 1.35) * 0.36 * amp;
          float w2 = sin((p.x * 0.8 + p.z * 0.6) * 0.12 - uTime * 2.15) * 0.18 * amp;
          float w3 = cos((p.x - p.z * 0.9) * 0.19 + uTime * 2.7) * 0.09 * amp;
          p.x += cos(p.x * 0.065 + uTime * 1.65) * (0.14 * amp);
          p.z += sin(p.z * 0.055 + uTime * 1.35) * (0.14 * amp);
          float totWave = w1 + w2 + w3;
          p.y += totWave;
          vWave = totWave;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uWaveAmp;
        uniform vec3 uCrestColor;
        uniform vec3 uWaterDeepCol;
        uniform vec3 uHorizonCol;
        varying float vTerrainH;
        varying float vWave;
        varying vec2 vWorldXZ;

        void main() {
          float shallow = smoothstep(-4.4, 0.45, vTerrainH);
          vec3 abyssCol = uWaterDeepCol;
          vec3 reefCol = mix(abyssCol, vec3(0.11, 0.56, 0.69), 0.75);
          vec3 lagoonCol = vec3(0.28, 0.78, 0.82);
          vec3 col = mix(abyssCol, reefCol, shallow);
          col = mix(col, lagoonCol, smoothstep(-1.4, 0.25, vTerrainH) * 0.65);

          // Caustic shimmer in shallow lagoons
          float caustics = sin(vWorldXZ.x * 0.45 + uTime * 2.2) * cos(vWorldXZ.y * 0.45 - uTime * 1.8);
          col += vec3(0.18, 0.35, 0.38) * max(0.0, caustics) * shallow * 0.25;

          // Sky-reactive glint and whitecap foam on rolling wave crests (intensifies with wave amplitude)
          float crestThreshold = 0.10 * max(0.4, uWaveAmp * 0.7);
          float whitecapThreshold = 0.34 * max(0.45, uWaveAmp * 0.75);
          float crest = smoothstep(crestThreshold, 0.45 * max(0.5, uWaveAmp * 0.85), vWave);
          float whitecap = smoothstep(whitecapThreshold, 0.58 * max(0.5, uWaveAmp * 0.9), vWave);
          col += uCrestColor * crest * 0.36;
          col = mix(col, vec3(0.98, 0.96, 0.92), whitecap * 0.46);

          // Dual-band animated surf foam washing onto every island's beach
          float shoreZone = smoothstep(-1.25, 0.32, vTerrainH) * (1.0 - smoothstep(0.32, 0.95, vTerrainH));
          float surfWave1 = smoothstep(0.35, 0.85, 0.5 + 0.5 * sin(vTerrainH * 15.0 - uTime * 3.4 + sin(vWorldXZ.x * 0.15) * 1.2));
          float surfWave2 = smoothstep(0.55, 0.95, 0.5 + 0.5 * cos(vTerrainH * 24.0 - uTime * 2.6 + cos(vWorldXZ.y * 0.15) * 1.2));
          float foamMask = clamp((surfWave1 * 0.75 + surfWave2 * 0.55) * shoreZone, 0.0, 1.0);
          col = mix(col, vec3(0.98, 0.95, 0.90), foamMask * 0.88);

          // Natural atmospheric horizon fade across open ocean distances
          float distCenter = length(vWorldXZ);
          float horizonFade = smoothstep(520.0, 780.0, distCenter);
          col = mix(col, uHorizonCol, horizonFade * 0.92);
          float alpha = mix(0.90, 1.0, smoothstep(220.0, 520.0, distCenter));

          gl_FragColor = vec4(col, alpha);
        }
      `
    });

    waterMesh = new THREE.Mesh(waterGeo, waterMat);
    waterMesh.position.y = 0.22;
    scene.add(waterMesh);
  }

  function buildVolumetricCloudsAndWildflowers(scene) {
    // 1. 18 Sculpted Volumetric Sunset Cloud Clusters drifting around High Island & Volcano Peak
    cloudMat = new THREE.MeshStandardMaterial({
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
        id: 'sign-spawn',
        x: 55.0,
        z: -9.5,
        title: '🪧 East Cape Arrival & Travel Hub',
        directions: '⬅️ West: Heartland Plaza & Solomon\'s Stone Bread Oven (65m) | ⬇️ South: Crescent Beach Deck Chairs (60m) | 🌅 Here: Ocean Loungers & Binoculars',
        arrows: [-Math.PI * 0.5, Math.PI * 0.5, 0]
      },
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
        directions: '↙️ Spherical Foods Café (26m) | ↖️ Western Sunset Ridge (34m) | ➡️ Tea House',
        arrows: [Math.PI * 0.3, Math.PI * 0.75, -Math.PI * 0.5]
      },
      {
        id: 'sign-balcony',
        x: -17.0,
        z: -83.5,
        title: '🪧 Exoteric Volcano Shrine & Causeway',
        directions: '⬆️ Exoteric Shrine & Offering Altar | 🌋 Esoteric Sea Cave Wharf (Behind) | ⬇️ Return to High Island',
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

  // ==========================================================================
  // CELESTIAL DAY / NIGHT KEYFRAMES (TIED TO REAL-WORLD CLOCK 1-HR CYCLE)
  // 1 Real Hour = 24 Island Hours. Cycle progress p in [0..1).
  // p = 0.00 -> 06:00 AM (Dawn & Sunrise)
  // p = 0.25 -> 12:00 PM (High Noon / Golden Midday)
  // p = 0.50 -> 06:00 PM (Sunset & Golden Hour)
  // p = 0.75 -> 12:00 AM (Starlit Midnight & Cool Moon)
  // ==========================================================================
  const SKY_KEYFRAMES = [
    {
      p: 0.00, // 06:00 AM Dawn & Sunrise
      timeStr: '06:00 AM',
      phaseName: 'Dawn & Sunrise',
      phaseIcon: '🌅',
      horizon: new THREE.Color(0xf68c68),
      mid: new THREE.Color(0x94608c),
      zenith: new THREE.Color(0x1a2244),
      fog: new THREE.Color(0xa86e7a),
      sunColor: new THREE.Color(0xff9e58),
      sunIntensity: 0.95,
      hemiSky: new THREE.Color(0xffaf82),
      hemiGround: new THREE.Color(0x2d2232),
      hemiIntensity: 0.70,
      starOpacity: 0.15,
      cloudColor: new THREE.Color(0xffcfb2),
      cloudEmissive: new THREE.Color(0x401828),
      waterCrest: new THREE.Color(0xffaa66)
    },
    {
      p: 0.125, // 09:00 AM Morning
      timeStr: '09:00 AM',
      phaseName: 'Golden Morning',
      phaseIcon: '🌤️',
      horizon: new THREE.Color(0x8ad2ff),
      mid: new THREE.Color(0x42a0e8),
      zenith: new THREE.Color(0x1660a8),
      fog: new THREE.Color(0x72bce8),
      sunColor: new THREE.Color(0xfff0d0),
      sunIntensity: 1.25,
      hemiSky: new THREE.Color(0xafe0ff),
      hemiGround: new THREE.Color(0x355840),
      hemiIntensity: 0.82,
      starOpacity: 0.0,
      cloudColor: new THREE.Color(0xffffff),
      cloudEmissive: new THREE.Color(0x0c1e2e),
      waterCrest: new THREE.Color(0xffeedd)
    },
    {
      p: 0.25, // 12:00 PM High Noon
      timeStr: '12:00 PM',
      phaseName: 'High Noon',
      phaseIcon: '☀️',
      horizon: new THREE.Color(0x70c4ff),
      mid: new THREE.Color(0x288fe0),
      zenith: new THREE.Color(0x0c488e),
      fog: new THREE.Color(0x56aee8),
      sunColor: new THREE.Color(0xfffbf0),
      sunIntensity: 1.38,
      hemiSky: new THREE.Color(0xbde8ff),
      hemiGround: new THREE.Color(0x3b6245),
      hemiIntensity: 0.88,
      starOpacity: 0.0,
      cloudColor: new THREE.Color(0xffffff),
      cloudEmissive: new THREE.Color(0x10283c),
      waterCrest: new THREE.Color(0xffffff)
    },
    {
      p: 0.375, // 03:00 PM Afternoon
      timeStr: '03:00 PM',
      phaseName: 'Sunny Afternoon',
      phaseIcon: '☀️',
      horizon: new THREE.Color(0x7ed0fa),
      mid: new THREE.Color(0x3598e2),
      zenith: new THREE.Color(0x145296),
      fog: new THREE.Color(0x62b2e8),
      sunColor: new THREE.Color(0xfff4dc),
      sunIntensity: 1.30,
      hemiSky: new THREE.Color(0xb8e4ff),
      hemiGround: new THREE.Color(0x385c42),
      hemiIntensity: 0.85,
      starOpacity: 0.0,
      cloudColor: new THREE.Color(0xfff8f0),
      cloudEmissive: new THREE.Color(0x162438),
      waterCrest: new THREE.Color(0xfff4e6)
    },
    {
      p: 0.50, // 06:00 PM Sunset / Golden Hour
      timeStr: '06:00 PM',
      phaseName: 'Golden Sunset',
      phaseIcon: '🌇',
      horizon: new THREE.Color(0xff5e28),
      mid: new THREE.Color(0x843068),
      zenith: new THREE.Color(0x161036),
      fog: new THREE.Color(0x9a3e52),
      sunColor: new THREE.Color(0xff7424),
      sunIntensity: 1.20,
      hemiSky: new THREE.Color(0xffa872),
      hemiGround: new THREE.Color(0x321a28),
      hemiIntensity: 0.72,
      starOpacity: 0.12,
      cloudColor: new THREE.Color(0xffad82),
      cloudEmissive: new THREE.Color(0x561e32),
      waterCrest: new THREE.Color(0xff7838)
    },
    {
      p: 0.60, // 08:24 PM Twilight Dusk
      timeStr: '08:24 PM',
      phaseName: 'Twilight Dusk',
      phaseIcon: '🌆',
      horizon: new THREE.Color(0x4a2c5a),
      mid: new THREE.Color(0x1e1e44),
      zenith: new THREE.Color(0x0c0c22),
      fog: new THREE.Color(0x28203c),
      sunColor: new THREE.Color(0x7288c8),
      sunIntensity: 0.45,
      hemiSky: new THREE.Color(0x384068),
      hemiGround: new THREE.Color(0x161622),
      hemiIntensity: 0.46,
      starOpacity: 0.65,
      cloudColor: new THREE.Color(0x544062),
      cloudEmissive: new THREE.Color(0x1e1228),
      waterCrest: new THREE.Color(0x9298cc)
    },
    {
      p: 0.75, // 12:00 AM Starlit Midnight
      timeStr: '12:00 AM',
      phaseName: 'Starlit Midnight',
      phaseIcon: '🌙',
      horizon: new THREE.Color(0x0a1426),
      mid: new THREE.Color(0x060b18),
      zenith: new THREE.Color(0x02040a),
      fog: new THREE.Color(0x081020),
      sunColor: new THREE.Color(0x8ab4f8), // cool silver moonlight
      sunIntensity: 0.38,
      hemiSky: new THREE.Color(0x1a2a46),
      hemiGround: new THREE.Color(0x080e18),
      hemiIntensity: 0.34,
      starOpacity: 0.98,
      cloudColor: new THREE.Color(0x142034),
      cloudEmissive: new THREE.Color(0x060c18),
      waterCrest: new THREE.Color(0x82aae8)
    },
    {
      p: 0.90, // 03:36 AM Deep Night & Moon
      timeStr: '03:36 AM',
      phaseName: 'Deep Night & Moon',
      phaseIcon: '🌌',
      horizon: new THREE.Color(0x0e182e),
      mid: new THREE.Color(0x080f20),
      zenith: new THREE.Color(0x030610),
      fog: new THREE.Color(0x0b1424),
      sunColor: new THREE.Color(0x92bcfc),
      sunIntensity: 0.36,
      hemiSky: new THREE.Color(0x1c2e4c),
      hemiGround: new THREE.Color(0x09101c),
      hemiIntensity: 0.32,
      starOpacity: 0.95,
      cloudColor: new THREE.Color(0x18243c),
      cloudEmissive: new THREE.Color(0x070e1c),
      waterCrest: new THREE.Color(0x88b2f0)
    }
  ];

  let currentSkyState = null;

  function interpolateDayNightKeyframes(p) {
    p = ((p % 1.0) + 1.0) % 1.0;
    const n = SKY_KEYFRAMES.length;
    let idxA = 0;
    for (let i = 0; i < n; i++) {
      if (p >= SKY_KEYFRAMES[i].p) {
        idxA = i;
      }
    }
    const idxB = (idxA + 1) % n;
    const kA = SKY_KEYFRAMES[idxA];
    const kB = SKY_KEYFRAMES[idxB];

    const span = (kB.p - kA.p + 1.0) % 1.0;
    const rawT = ((p - kA.p + 1.0) % 1.0) / (span || 1.0);
    const t = Math.max(0, Math.min(1, rawT));
    const easeT = (1.0 - Math.cos(t * Math.PI)) * 0.5;

    // Calculate In-Game 24-hour time
    const totalMinutes = ((p * 24.0 * 60.0 + 6.0 * 60.0) % 1440.0 + 1440.0) % 1440.0;
    const inGameHours = Math.floor(totalMinutes / 60);
    const inGameMinutes = Math.floor(totalMinutes % 60);
    const h12 = inGameHours % 12 === 0 ? 12 : inGameHours % 12;
    const ampm = inGameHours < 12 ? 'AM' : 'PM';
    const timeStr = `${h12.toString().padStart(2, '0')}:${inGameMinutes.toString().padStart(2, '0')} ${ampm}`;

    let phaseName = kA.phaseName;
    let phaseIcon = kA.phaseIcon;
    if (inGameHours >= 5 && inGameHours < 8) {
      phaseName = 'Dawn & Sunrise'; phaseIcon = '🌅';
    } else if (inGameHours >= 8 && inGameHours < 11) {
      phaseName = 'Golden Morning'; phaseIcon = '🌤️';
    } else if (inGameHours >= 11 && inGameHours < 14) {
      phaseName = 'High Noon'; phaseIcon = '☀️';
    } else if (inGameHours >= 14 && inGameHours < 17) {
      phaseName = 'Sunny Afternoon'; phaseIcon = '☀️';
    } else if (inGameHours >= 17 && inGameHours < 19) {
      phaseName = 'Golden Sunset'; phaseIcon = '🌇';
    } else if (inGameHours >= 19 && inGameHours < 21) {
      phaseName = 'Twilight Dusk'; phaseIcon = '🌆';
    } else if (inGameHours >= 21 || inGameHours < 3) {
      phaseName = 'Starlit Midnight'; phaseIcon = '🌙';
    } else {
      phaseName = 'Deep Night & Moon'; phaseIcon = '🌌';
    }

    const state = {
      progress: p,
      inGameHours,
      inGameMinutes,
      timeStr,
      phaseName,
      phaseIcon,
      horizon: kA.horizon.clone().lerp(kB.horizon, easeT),
      mid: kA.mid.clone().lerp(kB.mid, easeT),
      zenith: kA.zenith.clone().lerp(kB.zenith, easeT),
      fog: kA.fog.clone().lerp(kB.fog, easeT),
      sunColor: kA.sunColor.clone().lerp(kB.sunColor, easeT),
      sunIntensity: THREE.MathUtils.lerp(kA.sunIntensity, kB.sunIntensity, easeT),
      hemiSky: kA.hemiSky.clone().lerp(kB.hemiSky, easeT),
      hemiGround: kA.hemiGround.clone().lerp(kB.hemiGround, easeT),
      hemiIntensity: THREE.MathUtils.lerp(kA.hemiIntensity, kB.hemiIntensity, easeT),
      starOpacity: THREE.MathUtils.lerp(kA.starOpacity, kB.starOpacity, easeT),
      cloudColor: kA.cloudColor.clone().lerp(kB.cloudColor, easeT),
      cloudEmissive: kA.cloudEmissive.clone().lerp(kB.cloudEmissive, easeT),
      waterCrest: kA.waterCrest.clone().lerp(kB.waterCrest, easeT)
    };
    currentSkyState = state;
    return state;
  }

  function updateDayNight(scene, forceUpdate = false) {
    if (!skyUniforms || !dirLight || !hemiLight) return null;

    let p = 0;
    if (window.__BLAHAJ_DAY_CYCLE__ && !window.__BLAHAJ_DAY_CYCLE__.isRealtime) {
      p = window.__BLAHAJ_DAY_CYCLE__.manualProgress;
    } else {
      // Tied to real-world clock: 1 real hour = 24 island hours
      const now = new Date();
      const sec = now.getMinutes() * 60 + now.getSeconds() + now.getMilliseconds() / 1000;
      p = (sec / 3600) % 1.0;
    }

    const state = interpolateDayNightKeyframes(p);

    // Calculate celestial positions (orbital radius R = 720)
    // Sun rises East-Northeast, arcs high South at noon, and sets in the scenic Northwest
    const alpha = p * Math.PI * 2;
    const R = 720;
    const sunX = Math.cos(alpha) * R;
    const sunY = Math.sin(alpha) * 580;
    const sunZ = Math.sin(alpha) * 160 - 110;

    const moonAngle = alpha + Math.PI;
    const moonX = Math.cos(moonAngle) * R;
    const moonY = Math.sin(moonAngle) * 580;
    const moonZ = Math.sin(moonAngle) * 160 - 110;

    const cam = lastCamera || (window.__DEBUG__ && window.__DEBUG__.getCamera && window.__DEBUG__.getCamera());
    const camX = cam ? cam.position.x : 0;
    const camY = cam ? cam.position.y : 0;
    const camZ = cam ? cam.position.z : 0;

    // Update Sun & Moon 3D Body Meshes (Flush with Horizon, Facing Camera)
    if (sunGroup) {
      sunGroup.position.set(camX + sunX, sunY, camZ + sunZ);
      if (cam) {
        sunGroup.lookAt(camX, camY, camZ);
      } else {
        sunGroup.lookAt(0, 0, 0);
      }
      sunGroup.visible = (sunY > -32);
    }
    if (moonGroup) {
      moonGroup.position.set(camX + moonX, moonY, camZ + moonZ);
      if (cam) {
        moonGroup.lookAt(camX, camY, camZ);
      } else {
        moonGroup.lookAt(0, 0, 0);
      }
      moonGroup.visible = (moonY > -25);
    }
    if (skyMesh) {
      skyMesh.position.set(camX, 0, camZ);
    }
    if (starPoints) {
      starPoints.position.set(camX, 0, camZ);
    }

    // Directional light (Sun by day, Moon by night)
    if (sunY > 0) {
      dirLight.position.set(camX + sunX * 0.45, Math.max(30, sunY * 0.45), camZ + sunZ * 0.45);
      dirLight.color.copy(state.sunColor);
      dirLight.intensity = state.sunIntensity;
    } else {
      dirLight.position.set(camX + moonX * 0.45, Math.max(30, moonY * 0.45), camZ + moonZ * 0.45);
      dirLight.color.copy(state.sunColor);
      dirLight.intensity = state.sunIntensity;
    }

    // Hemisphere Light
    hemiLight.color.copy(state.hemiSky);
    hemiLight.groundColor.copy(state.hemiGround);
    hemiLight.intensity = state.hemiIntensity;

    // Sky Dome Shader Uniforms
    skyUniforms.uHorizonCol.value.copy(state.horizon);
    skyUniforms.uMidCol.value.copy(state.mid);
    skyUniforms.uZenithCol.value.copy(state.zenith);
    skyUniforms.uSunPos.value.set(sunX, sunY, sunZ);
    skyUniforms.uSunCol.value.copy(state.sunColor);
    skyUniforms.uMoonPos.value.set(moonX, moonY, moonZ);
    skyUniforms.uSunGlow.value = sunY > 0 ? Math.min(1.4, sunY / 120 + 0.3) : 0.0;
    skyUniforms.uMoonGlow.value = moonY > 0 ? Math.min(1.0, moonY / 130 + 0.2) : 0.0;

    // Fog & Scene Background (preserves deep oceanic marine fog when underwater)
    if (scene) {
      if (scene.fog && scene.fog.density <= 0.005) {
        scene.fog.color.copy(state.fog);
      }
      if (scene.background) scene.background.copy(state.horizon);
    }

    // Twinkling Stars
    if (starPoints && starPoints.material) {
      starPoints.material.opacity = state.starOpacity;
    }

    // Volumetric Clouds
    if (cloudMat) {
      cloudMat.color.copy(state.cloudColor);
      cloudMat.emissive.copy(state.cloudEmissive);
    }

    // Water Highlights, Horizon Fade & Deep Oceanic Tint
    if (waterUniforms) {
      waterUniforms.uCrestColor.value.copy(state.waterCrest);
      if (waterUniforms.uHorizonCol) waterUniforms.uHorizonCol.value.copy(state.horizon);
      const deepNight = new THREE.Color(0x020a16);
      const deepDay = new THREE.Color(0x051b33);
      const deepBlend = sunY > 0 ? deepDay : deepNight;
      waterUniforms.uWaterDeepCol.value.copy(deepBlend);
    }

    // Update Meadow Grass Day/Night & Lighting Response
    if (grassUniforms && grassUniforms.uNightFactor) {
      // 0.0 at bright day (sunIntensity ~ 1.28), smoothly rising to 1.0 at midnight (sunIntensity ~ 0.35)
      const nf = Math.max(0.0, Math.min(1.0, (0.90 - state.sunIntensity) / 0.58));
      grassUniforms.uNightFactor.value = nf;
    }

    return state;
  }

  function buildSkyDomeAndSkySeam(scene) {
    skyUniforms = {
      uHorizonCol: { value: new THREE.Color(0xf68c68) },
      uMidCol:     { value: new THREE.Color(0x94608c) },
      uZenithCol:  { value: new THREE.Color(0x1a2244) },
      uSunPos:     { value: new THREE.Vector3(0, 100, 0) },
      uSunCol:     { value: new THREE.Color(0xffaa6a) },
      uMoonPos:    { value: new THREE.Vector3(0, -100, 0) },
      uMoonCol:    { value: new THREE.Color(0x8ab4f8) },
      uSunGlow:    { value: 1.0 },
      uMoonGlow:   { value: 0.8 }
    };

    const skyGeo = new THREE.SphereGeometry(950, 40, 28);
    skyMat = new THREE.ShaderMaterial({
      uniforms: skyUniforms,
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
        uniform vec3 uHorizonCol;
        uniform vec3 uMidCol;
        uniform vec3 uZenithCol;
        uniform vec3 uSunPos;
        uniform vec3 uSunCol;
        uniform vec3 uMoonPos;
        uniform vec3 uMoonCol;
        uniform float uSunGlow;
        uniform float uMoonGlow;
        varying vec3 vWorldPosition;

        void main() {
          vec3 ray = normalize(vWorldPosition);
          float h = ray.y;

          // Atmospheric vertical dome gradient
          vec3 col = mix(uHorizonCol, uMidCol, smoothstep(-0.04, 0.35, h));
          col = mix(col, uZenithCol, smoothstep(0.25, 0.82, h));

          // Soft warm atmospheric solar corona
          vec3 sunDir = normalize(uSunPos);
          float sunDot = max(0.0, dot(ray, sunDir));
          float sunCorona = pow(sunDot, 10.0) * uSunGlow * 0.85;
          col += uSunCol * sunCorona;

          // Soft cool lunar halo
          vec3 moonDir = normalize(uMoonPos);
          float moonDot = max(0.0, dot(ray, moonDir));
          float moonHalo = pow(moonDot, 14.0) * uMoonGlow * 0.55;
          col += uMoonCol * moonHalo;

          gl_FragColor = vec4(col, 1.0);
        }
      `
    });
    skyMesh = new THREE.Mesh(skyGeo, skyMat);
    scene.add(skyMesh);

    // Glowing Sun & Moon 3D Body Meshes (Huge, Sky-Dominating Radiant Scale)
    sunGroup = new THREE.Group();
    const sunCore = new THREE.Mesh(
      new THREE.SphereGeometry(34, 28, 28),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        blending: THREE.AdditiveBlending,
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
        fog: false
      })
    );
    sunGroup.add(sunCore);

    // Radiant Solar Corona Disc & Outer Glow (Additive Glowing Brilliance)
    const sunGlow = new THREE.Mesh(
      new THREE.CircleGeometry(85, 36),
      new THREE.MeshBasicMaterial({
        color: 0xffaa22,
        transparent: true,
        opacity: 0.60,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false,
        fog: false
      })
    );
    sunGlow.position.z = -0.2;
    sunGroup.add(sunGlow);

    const sunOuterHalo = new THREE.Mesh(
      new THREE.RingGeometry(34, 130, 36),
      new THREE.MeshBasicMaterial({
        color: 0xff7711,
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false,
        fog: false
      })
    );
    sunOuterHalo.position.z = -0.4;
    sunGroup.add(sunOuterHalo);
    scene.add(sunGroup);

    moonGroup = new THREE.Group();
    const moonCore = new THREE.Mesh(
      new THREE.SphereGeometry(25, 28, 28),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        blending: THREE.AdditiveBlending,
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
        fog: false
      })
    );
    moonGroup.add(moonCore);

    const moonGlow = new THREE.Mesh(
      new THREE.CircleGeometry(65, 36),
      new THREE.MeshBasicMaterial({
        color: 0x70a5ff,
        transparent: true,
        opacity: 0.50,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false,
        fog: false
      })
    );
    moonGlow.position.z = -0.2;
    moonGroup.add(moonGlow);
    scene.add(moonGroup);

    const starGeo = new THREE.BufferGeometry();
    const starPts = [];
    for (let i = 0; i < 2000; i++) {
      const r = 880;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.46;
      starPts.push(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.cos(phi) + 25,
        r * Math.sin(phi) * Math.sin(theta)
      );
    }
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPts, 3));
    starPoints = new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({ color: 0xfff5db, size: 1.5, transparent: true, opacity: 0.0 })
    );
    scene.add(starPoints);

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
  // ==========================================================================
  // VOLCANO PENINSULA: ISTHMUS, SEALED FRONT SHRINE & TRUNCATED CALDERA PEAK
  // ==========================================================================
  function buildVolcanoPeninsulaAndBalcony(scene) {
    const group = new THREE.Group();
    const basaltMat = new THREE.MeshStandardMaterial({
      color: 0x221d28,
      roughness: 0.85,
      bumpMap: getTerrainBumpTexture(),
      bumpScale: 0.08
    });
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xd8aa5b, roughness: 0.28, metalness: 0.84 });

    // Volcanic ambient glow radiating from within the natural caldera crater bowl
    lavaLight = new THREE.PointLight(0xff591c, 4.5, 200);
    lavaLight.position.set(-28, 36, -148);
    group.add(lavaLight);

    // Billowing Skyward Volcanic Ash & Ember Plume ascending naturally from deep within the crater
    const emberGeo = new THREE.BufferGeometry();
    const emberCount = 420;
    const emberPositions = new Float32Array(emberCount * 3);
    const emberColors = new Float32Array(emberCount * 3);

    // Rich palette of volcanic sparks, embers, and fiery ash
    const emberPalette = [
      new THREE.Color(0xff4514), // Fiery vermilion
      new THREE.Color(0xff8c26), // Intense orange
      new THREE.Color(0xffc247), // Radiant gold spark
      new THREE.Color(0xffe680), // Hot incandescent yellow
      new THREE.Color(0xd9381e)  // Deep glowing ember
    ];

    for (let i = 0; i < emberCount; i++) {
      const ang = Math.random() * Math.PI * 2;
      const rad = Math.sqrt(Math.random()) * 13.5;
      emberPositions[i * 3] = -28 + Math.cos(ang) * rad;
      emberPositions[i * 3 + 1] = 32.5 + Math.random() * 85;
      emberPositions[i * 3 + 2] = -148 + Math.sin(ang) * rad;

      const col = emberPalette[Math.floor(Math.random() * emberPalette.length)];
      emberColors[i * 3] = col.r;
      emberColors[i * 3 + 1] = col.g;
      emberColors[i * 3 + 2] = col.b;
    }
    emberGeo.setAttribute('position', new THREE.BufferAttribute(emberPositions, 3));
    emberGeo.setAttribute('color', new THREE.BufferAttribute(emberColors, 3));
    emberSystem = new THREE.Points(
      emberGeo,
      new THREE.PointsMaterial({
        size: 1.8,
        vertexColors: true,
        transparent: true,
        opacity: 0.88,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    group.add(emberSystem);

    // Isthmus Torii Gates gracefully leading along the causeway and framing the grand stairs
    const causewayGateSpecs = [
      { x: -16.5, z: -44.0, rotY: 0.18, span: 8.0, beamW: 10.0 }, // Gate 0: lower isthmus
      { x: -19.5, z: -58.0, rotY: 0.12, span: 8.0, beamW: 10.0 }, // Gate 1: mid isthmus
      { x: -21.5, z: -72.0, rotY: 0.05, span: 8.2, beamW: 10.2 }, // Gate 2: upper causeway
      { x: -22.0, z: -85.2, rotY: 0.00, span: 8.6, beamW: 10.8 }  // Gate 3: final ceremonial arch framing the grand steps!
    ];

    causewayGateSpecs.forEach((gs) => {
      const gy = getTerrainHeight(gs.x, gs.z);
      const gate = new THREE.Group();
      gate.position.set(gs.x, gy, gs.z);
      gate.rotation.y = gs.rotY;

      const colOff = gs.span * 0.5;
      [-colOff, colOff].forEach((px) => {
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.40, 0.50, 6.4, 14), basaltMat);
        col.position.set(px, 3.2, 0);
        col.castShadow = true;
        gate.add(col);
      });
      const crossBeam = new THREE.Mesh(new THREE.BoxGeometry(gs.beamW, 0.72, 0.95), basaltMat);
      crossBeam.position.y = 6.35;
      gate.add(crossBeam);
      group.add(gate);
    });

    // Ancient Sealed Obsidian Shrine & Gate at (-22, gy, -103)
    const shrineX = -22;
    const shrineZ = -103;
    const shrineY = getTerrainHeight(shrineX, shrineZ);

    const shrineGroup = new THREE.Group();
    shrineGroup.position.set(shrineX, shrineY, shrineZ);

    // Basalt foundation dais (The Front Balcony of the Exoteric Shrine)
    const dais = new THREE.Mesh(new THREE.CylinderGeometry(8.5, 9.2, 1.2, 24), basaltMat);
    dais.position.y = 0.6;
    dais.receiveShadow = true;
    shrineGroup.add(dais);

    // Colonnade of 6 heavy basalt foundation pillars supporting the balcony overhang over the slope
    for (let pIdx = 0; pIdx < 6; pIdx++) {
      const pAng = (pIdx / 5) * Math.PI * 0.85 + Math.PI * 0.08;
      const pRad = 7.6;
      const px = Math.cos(pAng) * pRad;
      const pz = Math.sin(pAng) * pRad;
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.92, 8.5, 12), basaltMat);
      pillar.position.set(px, -3.8, pz);
      pillar.castShadow = true;
      shrineGroup.add(pillar);
    }

    // Grand Carved Basalt Steps rising directly from Gate 3 (z = -85.5) up to the Balcony front lip (z = -94.5)
    // Width is 6.2m, fitting comfortably inside Gate 3's 8.6m column span with zero clipping!
    const stepsCount = 9;
    for (let s = 0; s < stepsCount; s++) {
      const stepProg = s / (stepsCount - 1);
      const stepRelZ = 17.5 - stepProg * 9.0; // from relZ = +17.5 (z = -85.5) down to relZ = +8.5 (z = -94.5)
      const stepRelY = -4.2 + stepProg * 4.8; // ascending from road level (-4.2) up to balcony lip (+0.6)
      const stepWidth = 6.2;
      const stepMesh = new THREE.Mesh(new THREE.BoxGeometry(stepWidth, 0.52, 1.45), basaltMat);
      stepMesh.position.set(0, stepRelY, stepRelZ);
      stepMesh.receiveShadow = true;
      shrineGroup.add(stepMesh);
    }

    // Exoteric Offering Altar of the Volcanic Faith (front-facing for pilgrims & offerings)
    const altar = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.25, 1.6), basaltMat);
    altar.position.set(0, 1.22, 3.6);
    altar.castShadow = true;
    shrineGroup.add(altar);

    // Glowing Golden Offering Chalice on the Altar
    const chalice = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.38, 0.72, 16), brassMat);
    chalice.position.set(0, 2.15, 3.6);
    shrineGroup.add(chalice);

    const sacredSpark = new THREE.Mesh(
      new THREE.SphereGeometry(0.26, 14, 14),
      new THREE.MeshBasicMaterial({ color: 0xff7722 })
    );
    sacredSpark.position.set(0, 2.7, 3.6);
    shrineGroup.add(sacredSpark);
    animatedObjects.push({ mesh: sacredSpark, type: 'spin_bob', baseY: 2.7 });

    // Twin Carved Basalt Pillars
    [-3.8, 3.8].forEach((px) => {
      const p = new THREE.Mesh(new THREE.BoxGeometry(1.6, 8.5, 1.8), basaltMat);
      p.position.set(px, 4.85, 0);
      p.castShadow = true;
      shrineGroup.add(p);
    });

    // Massive Inscribed Lintel
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(10.5, 2.2, 2.4), basaltMat);
    lintel.position.set(0, 9.8, 0);
    shrineGroup.add(lintel);

    // Impenetrable Sealed Obsidian Slab Door with Glowing Golden Runes
    const doorSlab = new THREE.Mesh(
      new THREE.BoxGeometry(6.4, 7.8, 0.8),
      new THREE.MeshStandardMaterial({ color: 0x141018, roughness: 0.3, metalness: 0.85 })
    );
    doorSlab.position.set(0, 4.5, -0.3);
    shrineGroup.add(doorSlab);

    const runeRings = new THREE.Mesh(
      new THREE.TorusGeometry(2.2, 0.12, 12, 32),
      new THREE.MeshBasicMaterial({ color: 0xffa338 })
    );
    runeRings.position.set(0, 4.8, 0.2);
    shrineGroup.add(runeRings);

    // Ancient Ritual Brazier
    const brazier = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.7, 1.4, 16), brassMat);
    brazier.position.set(0, 1.3, 3.2);
    shrineGroup.add(brazier);

    const eternalFlame = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.65, 1),
      new THREE.MeshBasicMaterial({ color: 0xff9924, wireframe: true })
    );
    eternalFlame.position.set(0, 2.4, 3.2);
    shrineGroup.add(eternalFlame);
    animatedObjects.push({ mesh: eternalFlame, type: 'spin_bob', baseY: 2.4 });

    group.add(shrineGroup);
    scene.add(group);

    // Sunny the Beach Carrot's Scenic Crescent Beach Vacation Lounge (Umbrella, Beach Mat & Coconut Drink)
    const sunnyLounge = new THREE.Group();
    const sunnyX = 22;
    const sunnyZ = 48;
    const sunnyY = getTerrainHeight(sunnyX, sunnyZ);
    sunnyLounge.position.set(sunnyX, sunnyY, sunnyZ);
    sunnyLounge.rotation.y = 0.15;

    // Striped sunny beach towel / mat
    const towel = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.04, 2.4),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.85 })
    );
    towel.position.set(0.4, 0.02, 0.2);
    towel.rotation.y = 0.3;
    sunnyLounge.add(towel);

    // Striped beach umbrella / parasol
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.07, 3.2, 10),
      new THREE.MeshStandardMaterial({ color: 0xdeb887, roughness: 0.6 })
    );
    pole.position.set(-1.1, 1.6, -0.6);
    pole.rotation.z = -0.15;
    sunnyLounge.add(pole);

    const canopy = new THREE.Mesh(
      new THREE.ConeGeometry(1.75, 0.8, 16),
      new THREE.MeshStandardMaterial({ color: 0xf5cd79, roughness: 0.5, side: THREE.DoubleSide })
    );
    canopy.position.set(-1.35, 3.1, -0.6);
    canopy.rotation.z = -0.15;
    sunnyLounge.add(canopy);

    // Chilled coconut drink with little straw
    const coconut = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 12, 10),
      new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.8 })
    );
    coconut.position.set(0.9, 0.2, 0.8);
    sunnyLounge.add(coconut);

        scene.add(sunnyLounge);

    // ==========================================================================
    // LUXURY CRESCENT BEACH SUN LOUNGERS & DECK CHAIRS WITH PIÑA COLADAS
    // ==========================================================================
    function createLuxuryDeckChair(options = {}) {
      const chairGroup = new THREE.Group();
      chairGroup.name = options.name || 'luxury_deck_chair';

      const teakMat = new THREE.MeshStandardMaterial({ color: 0x7c4a24, roughness: 0.65 });
      const slatMat = new THREE.MeshStandardMaterial({ color: 0x9a6136, roughness: 0.6 });
      const brassMat = new THREE.MeshStandardMaterial({ color: 0xd8aa5b, metalness: 0.85, roughness: 0.25 });
      const cushionColor = options.cushionColor || 0x0284c7;
      const stripeColor = options.stripeColor || 0xf8fafc;
      const cushionMat = new THREE.MeshStandardMaterial({ color: cushionColor, roughness: 0.85 });
      const stripeMat = new THREE.MeshStandardMaterial({ color: stripeColor, roughness: 0.85 });
      const pillowMat = new THREE.MeshStandardMaterial({ color: options.pillowColor || 0xfef08a, roughness: 0.8 });

      // 1. Lower Frame & 4 Sturdy Legs
      [-0.38, 0.38].forEach((lx) => {
        [-0.60, 0.60].forEach((lz) => {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.048, 0.35, 8), teakMat);
          leg.position.set(lx, 0.175, lz);
          chairGroup.add(leg);
          const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.049, 0.049, 0.04, 8), brassMat);
          cap.position.set(lx, 0.02, lz);
          chairGroup.add(cap);
        });
        const sideRail = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.08, 1.45), teakMat);
        sideRail.position.set(lx, 0.32, 0);
        chairGroup.add(sideRail);
      });

      // Cross slats for base bed
      for (let sz = -0.60; sz <= 0.15; sz += 0.12) {
        const slat = new THREE.Mesh(new THREE.BoxGeometry(0.80, 0.025, 0.08), slatMat);
        slat.position.set(0, 0.36, sz);
        chairGroup.add(slat);
      }

      // 2. Angled Reclining Backrest
      const backGroup = new THREE.Group();
      backGroup.position.set(0, 0.36, 0.15);
      backGroup.rotation.x = -0.52; // Reclined back ~30 degrees

      [-0.38, 0.38].forEach((bx) => {
        const bRail = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.07, 0.92), teakMat);
        bRail.position.set(bx, 0.035, 0.46);
        backGroup.add(bRail);
      });
      for (let bz = 0.06; bz <= 0.88; bz += 0.11) {
        const bSlat = new THREE.Mesh(new THREE.BoxGeometry(0.80, 0.025, 0.08), slatMat);
        bSlat.position.set(0, 0.04, bz);
        backGroup.add(bSlat);
      }

      // Brass support stays behind backrest
      [-0.28, 0.28].forEach((sx) => {
        const stay = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.65, 6), brassMat);
        stay.position.set(sx, -0.15, 0.42);
        stay.rotation.x = 0.82;
        backGroup.add(stay);
      });
      chairGroup.add(backGroup);

      // 3. Ergonomic Wooden Armrests
      [-0.43, 0.43].forEach((ax) => {
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.035, 1.15), teakMat);
        arm.position.set(ax, 0.54, 0.12);
        chairGroup.add(arm);
        [-0.40, 0.55].forEach((az) => {
          const sup = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.22, 6), teakMat);
          sup.position.set(ax, 0.43, az);
          chairGroup.add(sup);
        });
        const cupHolder = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.02, 12), brassMat);
        cupHolder.position.set(ax, 0.555, -0.38);
        chairGroup.add(cupHolder);
      });

      // 4. Padded Striped Mattress / Cushion
      const seatCushion = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.08, 0.78), cushionMat);
      seatCushion.position.set(0, 0.41, -0.22);
      chairGroup.add(seatCushion);
      [-0.20, 0, 0.20].forEach((stX) => {
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.082, 0.78), stripeMat);
        stripe.position.set(stX, 0.41, -0.22);
        chairGroup.add(stripe);
      });

      const backCushion = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.08, 0.82), cushionMat);
      backCushion.position.set(0, 0.09, 0.44);
      backGroup.add(backCushion);
      [-0.20, 0, 0.20].forEach((stX) => {
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.082, 0.82), stripeMat);
        stripe.position.set(stX, 0.09, 0.44);
        backGroup.add(stripe);
      });

      // Plush Rolled Head Pillow
      const pillow = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.65, 12), pillowMat);
      pillow.rotation.z = Math.PI / 2;
      pillow.position.set(0, 0.16, 0.80);
      backGroup.add(pillow);

      // 5. Side Cocktail Table with Piña Colada
      if (options.hasTable !== false) {
        const tableX = options.tableSide === 'left' ? -0.75 : 0.75;
        const tableGroup = new THREE.Group();
        tableGroup.position.set(tableX, 0, 0.15);

        const tableTop = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.04, 16), teakMat);
        tableTop.position.set(0, 0.44, 0);
        tableGroup.add(tableTop);
        for (let i = 0; i < 3; i++) {
          const ang = (i * Math.PI * 2) / 3;
          const tLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.45, 6), teakMat);
          tLeg.position.set(Math.cos(ang) * 0.14, 0.22, Math.sin(ang) * 0.14);
          tLeg.rotation.z = -Math.cos(ang) * 0.18;
          tLeg.rotation.x = Math.sin(ang) * 0.18;
          tableGroup.add(tLeg);
        }

        // Hand-Carved Coconut Piña Colada on Table
        const pinaGroup = new THREE.Group();
        pinaGroup.position.set(0, 0.46, 0);

        const coconutHusk = new THREE.Mesh(
          new THREE.SphereGeometry(0.12, 14, 10, 0, Math.PI * 2, 0.4, Math.PI - 0.4),
          new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.85 })
        );
        coconutHusk.position.y = 0.07;
        pinaGroup.add(coconutHusk);

        const frostCream = new THREE.Mesh(
          new THREE.CylinderGeometry(0.095, 0.09, 0.02, 14),
          new THREE.MeshStandardMaterial({ color: 0xfef9c3, roughness: 0.2 })
        );
        frostCream.position.y = 0.13;
        pinaGroup.add(frostCream);

        const miniCanopy = new THREE.Mesh(
          new THREE.ConeGeometry(0.08, 0.03, 8),
          new THREE.MeshStandardMaterial({ color: 0xf43f5e, side: THREE.DoubleSide })
        );
        miniCanopy.position.set(-0.03, 0.23, 0.02);
        miniCanopy.rotation.z = -0.35;
        pinaGroup.add(miniCanopy);

        const mStraw = new THREE.Mesh(
          new THREE.CylinderGeometry(0.008, 0.008, 0.18, 6),
          new THREE.MeshStandardMaterial({ color: 0x38bdf8 })
        );
        mStraw.position.set(0.03, 0.19, -0.02);
        mStraw.rotation.z = 0.3;
        pinaGroup.add(mStraw);

        tableGroup.add(pinaGroup);
        chairGroup.add(tableGroup);
      }

      // 6. Towering 3.4m Luxury Striped Resort Parasol / Beach Umbrella
      const umbrellaGroup = new THREE.Group();
      const umbSideX = options.tableSide === 'left' ? -0.85 : 0.85;
      umbrellaGroup.position.set(umbSideX, 0, 0.25);

      // Heavy carved sandstone / brass weighted umbrella base
      const umbBase = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.34, 0.16, 16),
        brassMat
      );
      umbBase.position.y = 0.08;
      umbrellaGroup.add(umbBase);

      // Polished Bamboo / Teak Umbrella Mast (3.4m tall)
      const umbPole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.045, 0.05, 3.4, 8),
        teakMat
      );
      umbPole.position.y = 1.70;
      umbrellaGroup.add(umbPole);

      // Parasol Canopy Hub & Ribs
      const canopyGroup = new THREE.Group();
      canopyGroup.position.y = 3.10;

      // Broad Striped Fabric Canopy (3.2m diameter)
      const canopyGeom = new THREE.ConeGeometry(1.65, 0.65, 16, 1, true);
      const canopyMesh = new THREE.Mesh(canopyGeom, cushionMat);
      canopyMesh.position.y = -0.15;
      canopyGroup.add(canopyMesh);

      // Alternating Striped Segments on Canopy
      for (let s = 0; s < 8; s++) {
        const stripeSector = new THREE.Mesh(
          new THREE.ConeGeometry(1.66, 0.65, 2, 1, true, (s * Math.PI * 2) / 8, Math.PI / 8),
          stripeMat
        );
        stripeSector.position.y = -0.15;
        canopyGroup.add(stripeSector);
      }

      // Scalloped Decorative Fabric Valance Trim
      const valance = new THREE.Mesh(
        new THREE.CylinderGeometry(1.65, 1.65, 0.18, 16, 1, true),
        cushionMat
      );
      valance.position.y = -0.48;
      canopyGroup.add(valance);

      // Golden Brass Top Cap & Finial
      const finial = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 12, 12),
        brassMat
      );
      finial.position.y = 0.28;
      canopyGroup.add(finial);

      // Warm Golden Hanging Lantern Under Canopy
      const lanternPole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012, 0.012, 0.45, 6),
        brassMat
      );
      lanternPole.position.set(0, -0.35, 0);
      canopyGroup.add(lanternPole);

      const lanternGlobe = new THREE.Mesh(
        new THREE.SphereGeometry(0.09, 10, 10),
        new THREE.MeshBasicMaterial({ color: 0xffedd5 })
      );
      lanternGlobe.position.set(0, -0.60, 0);
      canopyGroup.add(lanternGlobe);

      const lanternLight = new THREE.PointLight(0xffedd5, 1.2, 6.0, 1.5);
      lanternLight.position.set(0, -0.62, 0);
      canopyGroup.add(lanternLight);

      umbrellaGroup.add(canopyGroup);
      chairGroup.add(umbrellaGroup);

      // 7. Raised Teak Duckboard Deck Platform Base (Ensures lounger is NEVER buried or occluded by grass/sand)
      const deckPlinth = new THREE.Mesh(
        new THREE.BoxGeometry(2.3, 0.12, 2.2),
        teakMat
      );
      deckPlinth.position.set(umbSideX * 0.45, -0.06, 0.15);
      chairGroup.add(deckPlinth);

      // 8. Overhead High-Visibility Interactive 3D Marker Badge
      const markerGroup = new THREE.Group();
      markerGroup.position.set(0, 3.65, 0.15);
      const markerRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.38, 0.04, 8, 16),
        new THREE.MeshBasicMaterial({ color: cushionColor })
      );
      markerRing.rotation.x = Math.PI / 2;
      markerGroup.add(markerRing);
      const markerCore = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.18, 0),
        new THREE.MeshBasicMaterial({ color: 0xfef08a })
      );
      markerGroup.add(markerCore);
      chairGroup.add(markerGroup);

      return chairGroup;
    }

    // Overworld Crescent Beach Full Beach Volleyball Court & Spectator Lounge
    (() => {
      const courtGroup = new THREE.Group();
      const courtX = 28;
      const courtZ = 52;
      const courtY = getTerrainHeight(courtX, courtZ);
      courtGroup.position.set(courtX, courtY, courtZ);

      const courtBambooMat = new THREE.MeshStandardMaterial({ color: 0xd4a373, roughness: 0.55 });
      const courtWoodMat = new THREE.MeshStandardMaterial({ color: 0xdeb887, roughness: 0.7 });
      const courtDarkWoodMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.85 });
      const courtBrassMat = new THREE.MeshStandardMaterial({ color: 0xd8aa5b, roughness: 0.25, metalness: 0.85 });
      const courtTapeLineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.92 });
      const courtNetMeshMat = new THREE.MeshStandardMaterial({
        color: 0xf8fafc,
        wireframe: true,
        transparent: true,
        opacity: 0.82,
        side: THREE.DoubleSide
      });

      // 1. Full Court Boundary Tape Lines in the Sand (6.4m wide x 11.0m long)
      const halfW = 3.2;
      const halfL = 5.5;
      const makeTape = (w, h, x, z) => {
        const tape = new THREE.Mesh(new THREE.PlaneGeometry(w, h), courtTapeLineMat);
        tape.rotation.x = -Math.PI / 2;
        tape.position.set(x, 0.02, z);
        courtGroup.add(tape);
      };
      makeTape(halfW * 2, 0.12, 0, -halfL); // South Baseline
      makeTape(halfW * 2, 0.12, 0, halfL);  // North Baseline
      makeTape(0.12, halfL * 2, -halfW, 0); // West Sideline
      makeTape(0.12, halfL * 2, halfW, 0);  // East Sideline
      makeTape(halfW * 2, 0.08, 0, 0);      // Center Line under net

      // 2. Corner flags on flexible bamboo pegs
      const flagCols = [0xef4444, 0x06b6d4, 0xf59e0b, 0x10b981];
      [
        [-halfW, -halfL],
        [halfW, -halfL],
        [-halfW, halfL],
        [halfW, halfL]
      ].forEach(([cx, cz], i) => {
        const peg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.9, 6), courtBambooMat);
        peg.position.set(cx, 0.45, cz);
        courtGroup.add(peg);
        const fl = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.35, 4), new THREE.MeshBasicMaterial({ color: flagCols[i] }));
        fl.position.set(cx, 0.85, cz);
        fl.rotation.z = Math.PI / 2;
        courtGroup.add(fl);
      });

      // 3. Tall Sturdy Bamboo Posts & Guy-Wire Rigging
      [-3.6, 3.6].forEach((px) => {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 3.2, 10), courtBambooMat);
        post.position.set(px, 1.6, 0);
        courtGroup.add(post);

        const brassCap = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 0.12, 10), courtBrassMat);
        brassCap.position.set(px, 3.22, 0);
        courtGroup.add(brassCap);

        // Diagonal anchor rigging cables
        [-0.6, 0.6].forEach((dz) => {
          const wireMat = new THREE.MeshBasicMaterial({ color: 0x94a3b8 });
          const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.8, 4), wireMat);
          wire.position.set(px * 1.12, 1.3, dz * 0.9);
          wire.rotation.x = dz > 0 ? 0.42 : -0.42;
          wire.rotation.z = px > 0 ? -0.28 : 0.28;
          courtGroup.add(wire);
        });
      });

      // 4. Prominent Upright Volleyball Net spanning across the center
      const netMesh = new THREE.Mesh(new THREE.PlaneGeometry(7.0, 1.1, 14, 4), courtNetMeshMat);
      netMesh.position.set(0, 1.65, 0);
      courtGroup.add(netMesh);

      // Top bright yellow boundary tape band
      const topTape = new THREE.Mesh(
        new THREE.BoxGeometry(7.0, 0.09, 0.04),
        new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.35 })
      );
      topTape.position.set(0, 2.2, 0);
      courtGroup.add(topTape);

      // Bottom crisp white boundary tape band
      const bottomTape = new THREE.Mesh(
        new THREE.BoxGeometry(7.0, 0.06, 0.03),
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 })
      );
      bottomTape.position.set(0, 1.1, 0);
      courtGroup.add(bottomTape);

      // Red/White striped boundary antenna rods
      [-halfW, halfW].forEach((ax) => {
        const ant = new THREE.Mesh(
          new THREE.CylinderGeometry(0.02, 0.02, 1.6, 6),
          new THREE.MeshStandardMaterial({ color: 0xef4444 })
        );
        ant.position.set(ax, 2.1, 0);
        courtGroup.add(ant);
      });

      // Fluttering ribbons on post tops
      [
        [-3.6, 0xef4444],
        [3.6, 0x06b6d4]
      ].forEach(([rx, col]) => {
        const ribbon = new THREE.Mesh(
          new THREE.ConeGeometry(0.12, 0.4, 4),
          new THREE.MeshStandardMaterial({ color: col, side: THREE.DoubleSide })
        );
        ribbon.position.set(rx, 3.35, 0.1);
        ribbon.rotation.x = Math.PI / 2;
        courtGroup.add(ribbon);
      });

      // 5. Referee Bamboo High Chair on West Sideline (x = -4.3, z = 0)
      const refChair = new THREE.Group();
      refChair.position.set(-4.3, 0, 0);
      [
        [-0.4, -0.4],
        [0.4, -0.4],
        [-0.4, 0.4],
        [0.4, 0.4]
      ].forEach(([cx, cz]) => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 2.3, 6), courtBambooMat);
        leg.position.set(cx, 1.15, cz);
        refChair.add(leg);
      });
      // Platform seat
      const seat = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.08, 0.9), courtWoodMat);
      seat.position.set(0, 2.15, 0);
      refChair.add(seat);
      // Backrest
      const bRest = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.55, 0.06), courtWoodMat);
      bRest.position.set(0, 2.5, -0.42);
      refChair.add(bRest);
      // Draped colorful towel
      const towel = new THREE.Mesh(
        new THREE.BoxGeometry(0.65, 0.03, 0.8),
        new THREE.MeshStandardMaterial({ color: 0x38bdf8 })
      );
      towel.position.set(0, 2.18, 0.05);
      refChair.add(towel);
      courtGroup.add(refChair);

      // 6. Tropical Sideline Parasol & Cooler in Court Group
      const loungeGroup = new THREE.Group();
      loungeGroup.position.set(4.6, 0, -1.6);
      loungeGroup.rotation.y = -0.4;
      const pPole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 2.7, 8), courtBambooMat);
      pPole.position.set(0, 1.35, -1.0);
      loungeGroup.add(pPole);
      const pCanopy = new THREE.Mesh(
        new THREE.ConeGeometry(1.4, 0.6, 12),
        new THREE.MeshStandardMaterial({ color: 0xf59e0b, side: THREE.DoubleSide })
      );
      pCanopy.position.set(0, 2.7, -1.0);
      loungeGroup.add(pCanopy);

      const cooler = new THREE.Mesh(
        new THREE.BoxGeometry(0.65, 0.42, 0.42),
        new THREE.MeshStandardMaterial({ color: 0x06b6d4, roughness: 0.4 })
      );
      cooler.position.set(0, 0.21, 0.9);
      loungeGroup.add(cooler);
      courtGroup.add(loungeGroup);

      // 6b. Luxury Beach & Meadow Sun Loungers with Piña Colada Tables (Crescent Beach, Heartland Meadow & Pier)
      const DECK_CHAIRS_SPECS = [
        // East Cape Arrival Promenade (Immediately flanking player at spawn on plateau!)
        {
          id: 'deckchair_spawn_1',
          name: 'East Cape Ocean View Lounger',
          x: 57.5,
          z: -7.0,
          rotY: -Math.PI * 0.5,
          cushionColor: 0x0284c7, // Royal Ocean Blue
          stripeColor: 0xf8fafc,
          pillowColor: 0xfacc15,
          tableSide: 'right'
        },
        {
          id: 'deckchair_spawn_2',
          name: 'East Cape Sunrise Recliner',
          x: 57.5,
          z: -13.0,
          rotY: -Math.PI * 0.5,
          cushionColor: 0xf59e0b, // Warm Sunrise Gold
          stripeColor: 0xffedd5,
          pillowColor: 0x38bdf8,
          tableSide: 'left'
        },
        // Central Heartland Town Plaza
        {
          id: 'deckchair_plaza_1',
          name: 'Heartland Plaza Palm Lounger',
          x: 3.5,
          z: 21.0,
          rotY: 0.2,
          cushionColor: 0x10b981, // Emerald Palm
          stripeColor: 0xfef08a,
          pillowColor: 0xf43f5e,
          tableSide: 'right'
        },
        {
          id: 'deckchair_plaza_2',
          name: 'Heartland Town Square Recliner',
          x: -3.5,
          z: 21.0,
          rotY: -0.2,
          cushionColor: 0xec4899, // Hibiscus Pink
          stripeColor: 0xfdf2f8,
          pillowColor: 0x38bdf8,
          tableSide: 'left'
        },
        // Crescent Beach
        {
          id: 'deckchair_russell',
          name: 'Russell’s Ocean View Lounger',
          x: 33.2,
          z: 49.6,
          rotY: -0.42,
          cushionColor: 0x0284c7, // Royal Ocean Blue
          stripeColor: 0xf8fafc,
          pillowColor: 0xfef08a,
          tableSide: 'right'
        },
        {
          id: 'deckchair_helen',
          name: 'Helen’s Sunset Deck Chair',
          x: 32.2,
          z: 51.8,
          rotY: -0.42,
          cushionColor: 0xf43f5e, // Sunset Coral Pink
          stripeColor: 0xfef08a,
          pillowColor: 0xfde047,
          tableSide: 'left'
        },
        {
          id: 'deckchair_sunny',
          name: 'Sunny’s Companion Recliner',
          x: 23.8,
          z: 47.0,
          rotY: 0.28,
          cushionColor: 0xf59e0b, // Sunshine Yellow
          stripeColor: 0xfef3c7,
          pillowColor: 0x38bdf8,
          tableSide: 'left'
        },
        {
          id: 'deckchair_surf',
          name: 'Waterfront Waves Lounger',
          x: 25.2,
          z: 43.2,
          rotY: 0.12,
          cushionColor: 0x0d9488, // Teal Palm Green
          stripeColor: 0xf0fdfa,
          pillowColor: 0xfbbf24,
          tableSide: 'right'
        },
        // Heartland Meadow Sanctuary of the Birbs
        {
          id: 'deckchair_meadow_1',
          name: 'Heartland Meadow Birb-Watching Lounger',
          x: -16.0,
          z: 22.5,
          rotY: 0.85,
          cushionColor: 0x10b981, // Emerald Birb Grass
          stripeColor: 0xfef08a,
          pillowColor: 0xf43f5e,
          tableSide: 'right'
        },
        {
          id: 'deckchair_meadow_2',
          name: 'Heartland Meadow Sunset Recliner',
          x: -17.8,
          z: 24.8,
          rotY: 0.85,
          cushionColor: 0xf59e0b, // Warm Honey Breb
          stripeColor: 0xffedd5,
          pillowColor: 0x38bdf8,
          tableSide: 'left'
        },
        // Heartland Harbor & Pier Promenade
        {
          id: 'deckchair_pier_1',
          name: 'Heartland Pier Promenade Lounger',
          x: 7.2,
          z: 28.0,
          rotY: -0.65,
          cushionColor: 0x0284c7, // Harbor Blue
          stripeColor: 0xf8fafc,
          pillowColor: 0xfacc15,
          tableSide: 'right'
        },
        {
          id: 'deckchair_pier_2',
          name: 'Heartland Pier Sunset Chair',
          x: 9.0,
          z: 30.2,
          rotY: -0.65,
          cushionColor: 0xec4899, // Sunset Pink
          stripeColor: 0xfdf2f8,
          pillowColor: 0x38bdf8,
          tableSide: 'left'
        }
      ];

      DECK_CHAIRS_SPECS.forEach((spec) => {
        const chairMesh = createLuxuryDeckChair(spec);
        const th = (typeof getTerrainHeight === 'function') ? getTerrainHeight(spec.x, spec.z) : 0;
        const gh = (typeof getGroundAndStructureHeight === 'function') ? getGroundAndStructureHeight(spec.x, spec.z) : th;
        const groundY = Math.max(th, gh);
        chairMesh.position.set(spec.x, groundY + 0.04, spec.z);
        chairMesh.rotation.y = spec.rotY;

        // Glowing interactive ground beacon ring so chairs pop clearly across sand & meadow
        const beaconRing = new THREE.Mesh(
          new THREE.RingGeometry(1.35, 1.65, 24),
          new THREE.MeshBasicMaterial({ color: spec.cushionColor, transparent: true, opacity: 0.75, side: THREE.DoubleSide })
        );
        beaconRing.rotation.x = -Math.PI / 2;
        beaconRing.position.set(0, 0.04, 0);
        chairMesh.add(beaconRing);

        scene.add(chairMesh);

        deckChairs.push({
          id: spec.id,
          name: spec.name,
          x: spec.x,
          y: groundY,
          z: spec.z,
          rotY: spec.rotY,
          seatX: spec.x + Math.sin(spec.rotY) * 0.12,
          seatY: groundY + 0.42,
          seatZ: spec.z + Math.cos(spec.rotY) * 0.12,
          seatRotY: spec.rotY,
          mesh: chairMesh
        });
      });

      // 7. Multi-Colored Beach Ball resting on the golden sand
      if (window.BlahajModels && window.BlahajModels.createBeachBall) {
        const bBall = window.BlahajModels.createBeachBall(0.48);
        bBall.position.set(1.4, 0.48, -3.8);
        courtGroup.add(bBall);
      }

      // 8. Large, Clear Hand-Carved Driftwood Signpost at South Court Entrance
      const signGroup = new THREE.Group();
      signGroup.name = 'crescent_volleyball_sign';
      signGroup.position.set(0, 0, -6.6);
      [-1.2, 1.2].forEach((sx) => {
        const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 2.2, 8), courtDarkWoodMat);
        sp.position.set(sx, 1.1, 0);
        signGroup.add(sp);
      });

      const board = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.85, 0.12), courtDarkWoodMat);
      board.position.set(0, 1.7, 0);
      signGroup.add(board);

      // Carved canvas sign texture
      const signCanvas = document.createElement('canvas');
      signCanvas.width = 512;
      signCanvas.height = 160;
      const sCtx = signCanvas.getContext('2d');
      if (sCtx) {
        sCtx.fillStyle = '#fef3c7';
        sCtx.fillRect(0, 0, 512, 160);
        sCtx.strokeStyle = '#78350f';
        sCtx.lineWidth = 8;
        sCtx.strokeRect(6, 6, 500, 148);
        sCtx.fillStyle = '#78350f';
        sCtx.font = 'bold 26px sans-serif';
        sCtx.textAlign = 'center';
        sCtx.fillText('🏐 CRESCENT BEACH VOLLEYBALL 🦈', 256, 48);
        sCtx.font = 'bold 22px sans-serif';
        sCtx.fillStyle = '#0284c7';
        sCtx.fillText('PRESS [E] TO PLAY MATCH!', 256, 88);
        sCtx.font = '16px sans-serif';
        sCtx.fillStyle = '#475569';
        sCtx.fillText('Header-boop rallies with Sandy & Sunny!', 256, 126);

        const signTex = new THREE.CanvasTexture(signCanvas);
        const signFront = new THREE.Mesh(
          new THREE.PlaneGeometry(2.7, 0.78),
          new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.6 })
        );
        signFront.position.set(0, 1.7, -0.07);
        signFront.rotation.y = Math.PI;
        signGroup.add(signFront);
      }
      courtGroup.add(signGroup);

      // 9. Interactive Glowing Court Entrance Ring on the Sand
      const ringMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.65 });
      const courtRing = new THREE.Mesh(new THREE.RingGeometry(1.6, 2.0, 24), ringMat);
      courtRing.rotation.x = -Math.PI / 2;
      courtRing.position.set(0, 0.04, -5.5);
      courtGroup.add(courtRing);

      scene.add(courtGroup);
    })();
  }
  // ==========================================================================
  // MARITIME TOURIST BINOCULARS PEDESTALS (OVERLOOKS ACROSS THE ARCHIPELAGO)
  // ==========================================================================
  const binocularPedestals = [];
  window.BlahajBinocularPedestals = binocularPedestals;

  function buildTouristBinocularPedestals(scene) {
    function createTouristBinocularPedestal(x, z, rotY = 0, name = 'Tourist Maritime Binoculars') {
      const g = new THREE.Group();
      const sy = (typeof getGroundAndStructureHeight === 'function') ? getGroundAndStructureHeight(x, z) : getTerrainHeight(x, z);
      g.position.set(x, sy, z);
      g.rotation.y = rotY;

      const ironMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8, metalness: 0.5 });
      const brassMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.25, metalness: 0.85 });
      const lensMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.1, metalness: 0.9, transparent: true, opacity: 0.85 });

      // Heavy Stepped Base Plinth
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.42, 0.15, 16), ironMat);
      base.position.y = 0.075;
      g.add(base);

      // Fluted Brass Pedestal Column
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.085, 1.15, 12), brassMat);
      col.position.y = 0.72;
      g.add(col);

      // Swivel Mounting Yoke
      const yoke = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.08, 0.12), ironMat);
      yoke.position.set(0, 1.32, 0);
      g.add(yoke);

      // Dual Brass Marine Barrels
      const bLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.045, 0.45, 12), brassMat);
      bLeft.rotation.x = Math.PI / 2 - 0.15; // Angled slightly upward
      bLeft.position.set(-0.09, 1.40, 0.08);
      g.add(bLeft);

      const bRight = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.045, 0.45, 12), brassMat);
      bRight.rotation.x = Math.PI / 2 - 0.15;
      bRight.position.set(0.09, 1.40, 0.08);
      g.add(bRight);

      // Ocular Glass Lenses
      [-0.09, 0.09].forEach((lx) => {
        const lens = new THREE.Mesh(new THREE.CircleGeometry(0.05, 12), lensMat);
        lens.position.set(lx, 1.435, 0.30);
        lens.rotation.x = -0.15;
        g.add(lens);
      });

      // Glowing Ground Beacon Ring
      const bRing = new THREE.Mesh(
        new THREE.RingGeometry(0.85, 1.15, 20),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.65, side: THREE.DoubleSide })
      );
      bRing.rotation.x = -Math.PI / 2;
      bRing.position.set(0, 0.02, 0);
      g.add(bRing);

      scene.add(g);

      binocularPedestals.push({
        id: `bino_pedestal_${binocularPedestals.length + 1}`,
        name,
        x,
        y: sy,
        z,
        mesh: g
      });
    }

    createTouristBinocularPedestal(54.0, -8.0, -Math.PI * 0.5, 'East Cape Ocean Viewpoint');
    createTouristBinocularPedestal(7.0, 27.0, -Math.PI * 0.4, 'Heartland Pier Observation Point');
    createTouristBinocularPedestal(27.0, 47.0, 0.3, 'Crescent Beach Dunes Overlook');
    createTouristBinocularPedestal(-22.0, 14.0, 0.85, 'Heartland Meadow Ridge Overlook');
  }


  // ==========================================================================
  // REAR VOLCANO WHARF & SEA CAVE ENTRANCE TO THE VOLCANO TRIAL INSTANCE
  // ==========================================================================
  function buildRearVolcanoWharfAndDungeon(scene) {
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x4f3522, roughness: 0.85 });
    const basaltMat = new THREE.MeshStandardMaterial({ color: 0x241f2e, roughness: 0.85 });
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xd8aa5b, roughness: 0.28, metalness: 0.85 });

    // 1. Rear Volcano Wharf at North End of Peninsula (x = -28, z = -172..-216)
    const wharfGroup = new THREE.Group();
    const dock = new THREE.Mesh(new THREE.BoxGeometry(8.5, 0.7, 44), woodMat);
    dock.position.set(-28, 1.4, -194);
    dock.receiveShadow = true;
    wharfGroup.add(dock);

    // Torch pillars flanking the Rear Volcano Wharf
    [-3.6, 3.6].forEach((px) => {
      [-212, -198, -188].forEach((pz) => {
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

    // 2. Towering Obsidian Sea Cave Entrance Arch at (-28, 1.4, -185)
    [-5.6, 5.6].forEach((px) => {
      const gatePillar = new THREE.Mesh(new THREE.BoxGeometry(2.6, 11.5, 2.8), basaltMat);
      gatePillar.position.set(-28 + px, 6.8, -185);
      wharfGroup.add(gatePillar);
    });

    const gateHeader = new THREE.Mesh(new THREE.BoxGeometry(15.2, 3.2, 3.4), basaltMat);
    gateHeader.position.set(-28, 12.8, -185);
    wharfGroup.add(gateHeader);

    // 3. Deep Atmospheric Sea-Cave Interior Tunnel (z = -185 to -172)
    const leftCaveWall = new THREE.Mesh(new THREE.BoxGeometry(3.2, 13.0, 14.5), basaltMat);
    leftCaveWall.position.set(-33.2, 7.5, -178);
    wharfGroup.add(leftCaveWall);

    const rightCaveWall = new THREE.Mesh(new THREE.BoxGeometry(3.2, 13.0, 14.5), basaltMat);
    rightCaveWall.position.set(-22.8, 7.5, -178);
    wharfGroup.add(rightCaveWall);

    const caveCeiling = new THREE.Mesh(new THREE.BoxGeometry(13.6, 2.6, 14.5), basaltMat);
    caveCeiling.position.set(-28, 13.5, -178);
    wharfGroup.add(caveCeiling);

    const caveBack = new THREE.Mesh(new THREE.BoxGeometry(13.6, 13.0, 2.2), basaltMat);
    caveBack.position.set(-28, 7.5, -171.5);
    wharfGroup.add(caveBack);

    [-3.8, 3.8].forEach((px) => {
      const innerPost = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 4.2, 10), basaltMat);
      innerPost.position.set(-28 + px, 3.2, -177);
      wharfGroup.add(innerPost);
      const innerFlame = new THREE.Mesh(
        new THREE.SphereGeometry(0.42, 12, 12),
        new THREE.MeshBasicMaterial({ color: 0xff5514 })
      );
      innerFlame.position.set(-28 + px, 5.6, -177);
      wharfGroup.add(innerFlame);
    });

    // Ancient Shark Crest at top of the arch
    const archCrest = new THREE.Mesh(
      new THREE.OctahedronGeometry(1.2, 0),
      new THREE.MeshStandardMaterial({ color: 0xff7b29, roughness: 0.2, metalness: 0.9 })
    );
    archCrest.position.set(-28, 15.2, -185);
    wharfGroup.add(archCrest);
    animatedObjects.push({ mesh: archCrest, type: 'spin_bob', baseY: 15.2 });

    // Swirling Sea Cave Portal Volume inviting players to enter the instanced trial!
    const portalVolume = new THREE.Mesh(
      new THREE.PlaneGeometry(8.6, 9.5),
      new THREE.MeshBasicMaterial({
        color: 0xff5514,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.72
      })
    );
    portalVolume.position.set(-28, 5.8, -179);
    wharfGroup.add(portalVolume);

    // Warm welcoming lantern lights
    const caveLight = new THREE.PointLight(0xff6a14, 3.8, 55);
    caveLight.position.set(-28, 6.8, -178);
    wharfGroup.add(caveLight);

    const outerArchLight = new THREE.PointLight(0xff8833, 2.4, 35);
    outerArchLight.position.set(-28, 7.2, -187);
    wharfGroup.add(outerArchLight);

    scene.add(wharfGroup);
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
      [61, -8, 0x38bdf8], [42, 54, 0xf472b6], [45, 56, 0x60a5fa],
      // Hermes Atoll Sanctuary (Eastern Atoll)
      [168, -14, 0x38bdf8], [172, -6, 0x60a5fa], [179, -12, 0xfbbf24], [182, -8, 0xf472b6],
      // Solomon Cay Sanctuary (Northwestern Atoll)
      [-160, 90, 0xfbbf24], [-168, 98, 0xa78bfa], [-162, 102, 0x60a5fa], [-170, 92, 0x34d399],
      // Hiram Isle Sanctuary (Southwestern Isle)
      [-160, -85, 0xfbbf24], [-168, -94, 0x38bdf8], [-162, -96, 0xf472b6], [-172, -86, 0xa78bfa],
      // Nimue Sanctuary (Southeastern Isle)
      [160, -110, 0xa78bfa], [168, -118, 0x38bdf8], [162, -122, 0xf472b6], [170, -112, 0x60a5fa]
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
        satiationTimer: 0,
        isSleeping: false,
        snoozeTimer: Math.random() * 2.0,
        appetite: 0,
        isEating: false,
        eatTimer: 0,
        crumbTimer: 0,
        targetLoaf: null
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
      life: 25.0,
      claimedBy: null
    });
  }

  // ==========================================================================
  // SWIMMING TROPICAL FISHES & BOUNCY BEACH BALLS IN THE WATER
  // ==========================================================================
  function buildWaterFishesAndBeachBalls(scene) {
    const fishPalette = [0xff7828, 0xfacc15, 0xec4899, 0x38bdf8, 0x4ade80, 0xa855f7, 0x06b6d4, 0xf43f5e];
    const schoolCenters = [
      // Crescent Harbour & South Lagoon shallows (immediate swimming entry)
      [0, 66], [14, 70], [-14, 72], [22, 78], [-22, 80], [0, 92], [-14, 100],
      // East Cape Beach (immediate spawn waters) & Hermes Channel
      [68, 8], [76, -2], [84, 18], [105, 12], [125, -5],
      // West Ridge Artisans' Coast & Solomon Channel
      [-62, 5], [-74, -12], [-85, 32], [-98, 52],
      // North Volcano Sea Cove
      [-28, -205], [-16, -192], [-38, -218],
      // Outer Sanctuary Islands Shallows
      [165, -8], [178, 10], [-155, 85], [-155, -85], [155, -110],
      // Shelf Break & Deep Terraces
      [45, 120], [-45, 125], [115, -45], [-75, -130]
    ];

    schoolCenters.forEach(([cx, cz], sIdx) => {
      for (let f = 0; f < 3; f++) {
        const col = fishPalette[(sIdx + f) % fishPalette.length];
        const fMesh = window.BlahajModels.createTropicalFish(col);
        scene.add(fMesh);
        // Distribute fish across the vertical water column: surface schoolers, mid-reef roamers, deep gliders
        const baseDepth = -0.55 - (f * 1.35) - ((sIdx % 3) * 0.95);
        fishSchool.push({
          mesh: fMesh,
          centerX: cx,
          centerZ: cz,
          radius: 4.5 + f * 2.2,
          angle: (f / 3) * Math.PI * 2 + sIdx,
          speed: 0.85 + (f % 2) * 0.35,
          jumpPhase: Math.random() * Math.PI * 2,
          baseDepth,
          canLeap: (f === 0 && sIdx < 8)
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
  // SWAYING 3D KELP FORESTS & GIANT BULL KELP CATHEDRALS (450+ STALKS!)
  // ==========================================================================
  function buildKelpForests(scene) {
    const kelpMat = new THREE.MeshStandardMaterial({
      color: 0x1b4332,
      roughness: 0.55,
      metalness: 0.08,
      side: THREE.DoubleSide
    });
    const kelpGoldMat = new THREE.MeshStandardMaterial({
      color: 0x40916c,
      roughness: 0.52,
      metalness: 0.12,
      side: THREE.DoubleSide
    });
    const kelpSunMat = new THREE.MeshStandardMaterial({
      color: 0x74c69d,
      roughness: 0.48,
      metalness: 0.15,
      side: THREE.DoubleSide
    });
    const bladderMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.38,
      metalness: 0.22,
      emissive: 0x78350f,
      emissiveIntensity: 0.35
    });

    // Broad, lush, undulating kelp ribbons
    const bladeGeo = new THREE.ConeGeometry(0.85, 3.4, 5);
    bladeGeo.scale(0.32, 1.0, 1.0);
    const giantBladeGeo = new THREE.ConeGeometry(1.25, 4.8, 5);
    giantBladeGeo.scale(0.35, 1.0, 1.0);

    const bladderGeo = new THREE.SphereGeometry(0.34, 8, 8);
    const giantBladderGeo = new THREE.SphereGeometry(0.52, 8, 8);

    // Curated hero kelp groves in 3 iconic marine sanctuaries (48 hero plants total!)
    // Drastically reduces draw calls & CPU loops from 15,000+ meshes down to ~1,200!
    const kelpClusters = [
      // 1. Crescent Outer Lagoon Sanctuary (Deep clear basin past the beach swim channel)
      { count: 16, cx: 0, cz: 104, rx: 22, rz: 10, isGiant: false },
      // 2. Endless Pier & Tea Gazebo Channel
      { count: 14, cx: 62, cz: 52, rx: 14, rz: 14, isGiant: false },
      // 3. The Grand Continental Drop-Off Giant Bull Kelp Trench (-10m to -21.5m)
      { count: 18, cx: 0, cz: 138, rx: 32, rz: 10, isGiant: true }
    ];

    kelpClusters.forEach((cl) => {
      for (let i = 0; i < cl.count; i++) {
        const kx = cl.cx + (Math.random() - 0.5) * 2 * cl.rx;
        const kz = cl.cz + (Math.random() - 0.5) * 2 * cl.rz;

        // Keep clean beach sand bands completely clear!
        if (isInCleanBeachSandBand(kx, kz)) continue;

        // Clear underwater swim channel around island perimeter (keeps shore clear)
        const dCoast = getDistanceToNearestCoast(kx, kz);
        if (dCoast < 14.0) continue;

        const groundY = getTerrainHeight(kx, kz);

        // Place kelp underwater safely below wading channel (-2.2m to -23.0m)
        if (groundY < -2.2 && groundY > -23.0) {
          const group = new THREE.Group();
          group.position.set(kx, groundY, kz);

          // Height of kelp stalk: reaches up to near surface (-0.8m to -1.5m)
          const targetTopY = -0.9 - Math.random() * 0.8;
          const totalHeight = Math.max(3.8, targetTopY - groundY);

          // Stalk stipe thickness
          const rBase = cl.isGiant ? 0.32 : 0.18;
          const rTop = cl.isGiant ? 0.18 : 0.10;
          const stalkGeo = new THREE.CylinderGeometry(rTop, rBase, totalHeight, 6, 6);
          stalkGeo.translate(0, totalHeight / 2, 0);
          const stalkMesh = new THREE.Mesh(stalkGeo, kelpMat);
          group.add(stalkMesh);

          // Alternating fronds & air bladders along stalk
          const frondCount = Math.floor(totalHeight * 1.3);
          const bGeo = cl.isGiant ? giantBladeGeo : bladeGeo;
          const bldGeo = cl.isGiant ? giantBladderGeo : bladderGeo;

          for (let f = 1; f < frondCount; f++) {
            const fy = (f / frondCount) * totalHeight;
            const fang = (f * 1.8) + (i * 0.4);

            const matPick = f % 3 === 0 ? kelpSunMat : (f % 2 === 0 ? kelpGoldMat : kelpMat);
            const blade = new THREE.Mesh(bGeo, matPick);
            blade.position.set(0, fy, 0);
            blade.rotation.set(0.32 + Math.random() * 0.15, fang, 0.42);
            const scaleBlade = 0.85 + Math.random() * 0.45;
            blade.scale.set(scaleBlade, scaleBlade, scaleBlade);
            group.add(blade);

            // Large buoyant amber air bladder at base of each frond
            const bladder = new THREE.Mesh(bldGeo, bladderMat);
            const distBld = cl.isGiant ? 0.35 : 0.22;
            bladder.position.set(Math.cos(fang) * distBld, fy, Math.sin(fang) * distBld);
            group.add(bladder);
          }

          scene.add(group);
          kelpPlants.push({
            group,
            x: kx,
            z: kz,
            swayPhase: Math.random() * Math.PI * 2
          });
        }
      }
    });
  }

  // ==========================================================================
  // 3D CORAL REEFS, GIANT BRAIN CORALS & BIOLUMINESCENT DEEP JELLIES
  // ==========================================================================
  function buildCoralReefs(scene) {
    // 1. Giant Brain Coral Domes
    const brainColors = [0xf4a261, 0xe76f51, 0xffb703, 0xf43f5e, 0x2a9d8f, 0x8338ec];
    const brainDomeGeo = new THREE.SphereGeometry(2.4, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.5);

    // 2. Giant Staghorn Coral Branches
    const branchColors = [0x00f5d4, 0xf72585, 0x7209b7, 0x4ade80, 0xfbbf24, 0x38bdf8];
    const branchGeo = new THREE.CylinderGeometry(0.14, 0.28, 2.2, 5);

    // 3. Table / Shelf Coral Plates on the Drop-Off Cliff
    const plateGeo = new THREE.CylinderGeometry(2.8, 2.4, 0.28, 14);
    const plateColors = [0x9d4edd, 0xd946ef, 0x06b6d4, 0xf59e0b];

    // 4. Basking Sea Stars
    const starGeo = new THREE.ConeGeometry(0.45, 0.14, 5);
    const starMat = new THREE.MeshStandardMaterial({ color: 0xff5400, roughness: 0.6 });

    // Designated Reef Cluster Locations across offshore barrier reefs, rocky sounds, channels, and drop-offs
    const reefCenters = [
      // 1. The Crescent Barrier Reef (Offshore Breakwater Garden, past the beach sand band!)
      [-38, 92], [-22, 98], [-8, 105], [0, 108], [8, 105], [22, 98], [38, 92],
      [0, 118], [24, 115], [-24, 115],
      // 2. West Artisans' Rocky Sound & Coral Gardens
      [-68, 10], [-76, 25], [-86, 38], [-96, 50], [-72, -12], [-85, 5],
      // 3. East Headland Fringing Reef (Offshore rocky cape past Portal Gate)
      [92, -5], [105, 12], [115, 25], [98, 35], [88, -22],
      // 4. Mid-Shelf Terraces & Grand Drop-Off Ledges
      [35, 125], [-35, 128], [0, 142], [-28, 148], [28, 148],
      [110, 52], [-95, 82], [125, -45], [-75, -120],
      // 5. North Volcano Basalt Reef
      [-28, -200], [-18, -212], [-40, -215],
      // 6. Outer Sanctuary Island Drop-Offs
      [150, -15], [185, 10], [-145, 82], [-180, 110], [-145, -80], [150, -100]
    ];

    reefCenters.forEach(([cx, cz], rIdx) => {
      // Keep beach sand bands completely clear!
      if (isInCleanBeachSandBand(cx, cz)) return;

      const gy = getTerrainHeight(cx, cz);
      // Place corals at depths between -0.8m and -19.0m
      if (gy < -0.8 && gy > -19.0) {
        // Giant Brain Coral Dome
        const bCol = brainColors[rIdx % brainColors.length];
        const bMat = new THREE.MeshStandardMaterial({ color: bCol, roughness: 0.68, metalness: 0.08 });
        const dome = new THREE.Mesh(brainDomeGeo, bMat);
        const s = 1.0 + Math.random() * 0.95; // Domes are 2.4m to 4.7m wide!
        dome.scale.set(s, s * 0.85, s);
        dome.position.set(cx, gy - 0.1, cz);
        dome.rotation.y = Math.random() * Math.PI * 2;
        scene.add(dome);

        // Clustered Staghorn Coral Bush with thick branches
        const stagGroup = new THREE.Group();
        stagGroup.position.set(cx + (Math.random() - 0.5) * 4.5, gy, cz + (Math.random() - 0.5) * 4.5);
        const stCol = branchColors[(rIdx + 2) % branchColors.length];
        const stMat = new THREE.MeshStandardMaterial({ color: stCol, roughness: 0.52, metalness: 0.18 });

        for (let b = 0; b < 7; b++) {
          const br = new THREE.Mesh(branchGeo, stMat);
          const ang = (b / 7) * Math.PI * 2;
          br.position.set(Math.cos(ang) * 0.65, 1.0, Math.sin(ang) * 0.65);
          br.rotation.set(
            (Math.random() - 0.5) * 0.35 + Math.sin(ang) * 0.45,
            Math.random() * Math.PI,
            (Math.random() - 0.5) * 0.35 + Math.cos(ang) * 0.45
          );
          stagGroup.add(br);
        }
        scene.add(stagGroup);

        // Basking sea star resting on brain coral
        const star = new THREE.Mesh(starGeo, starMat);
        star.position.set(cx + 0.5, gy + s * 1.8, cz);
        star.rotation.x = Math.PI * 0.5;
        scene.add(star);

        // Table / Plate Corals stepping out along the Drop-Off Cliff (depth < -5.5m)
        if (gy < -5.5) {
          const pMat = new THREE.MeshStandardMaterial({
            color: plateColors[rIdx % plateColors.length],
            roughness: 0.6,
            metalness: 0.14
          });
          const plate = new THREE.Mesh(plateGeo, pMat);
          plate.position.set(cx, gy + 2.2, cz);
          plate.rotation.set((Math.random() - 0.5) * 0.08, Math.random() * Math.PI, (Math.random() - 0.5) * 0.08);
          scene.add(plate);
        }
      }
    });

    // 4. Bioluminescent Deep Jellyfish (28+ Jellies in both shallow lagoons and deep shelf!)
    const jellyGeo = new THREE.SphereGeometry(1.35, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.65);
    const jellyTentacleGeo = new THREE.CylinderGeometry(0.04, 0.015, 2.8, 4);
    jellyTentacleGeo.translate(0, -1.4, 0);

    const jellyMatCyan = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 1.1,
      transparent: true,
      opacity: 0.78,
      roughness: 0.2
    });
    const jellyMatViolet = new THREE.MeshStandardMaterial({
      color: 0xc084fc,
      emissive: 0x9333ea,
      emissiveIntensity: 1.1,
      transparent: true,
      opacity: 0.78,
      roughness: 0.2
    });

    const jellyLocations = [
      // Crescent Harbour & South Lagoon (depth -2.5m to -5.5m)
      [0, 75, -2.5], [18, 85, -3.2], [-18, 85, -3.2], [0, 95, -4.0],
      // East Cape Spawn Channel (immediately visible near spawn portal!)
      [72, 18, -2.8], [95, 25, -3.8], [115, 10, -4.5],
      // West Artisans' Channel
      [-65, 20, -2.8], [-85, 45, -4.0], [-105, 55, -4.8],
      // Grand Continental Drop-Off & Deep Shelf (-8m to -18m)
      [0, 125, -8.5], [-28, 135, -11.0], [28, 135, -11.0], [0, 155, -16.5],
      [110, 55, -9.5], [130, 75, -14.5], [-95, 85, -10.0], [-120, 105, -15.0],
      // Outer Island Lagoons & Volcano Cove
      [165, -5, -3.5], [-155, 95, -3.5], [-155, -75, -3.8], [155, -105, -3.8],
      [-28, -205, -5.5], [-35, -220, -12.5], [0, 175, -19.5], [-50, 160, -18.0]
    ];

    jellyLocations.forEach(([jx, jz, jy], idx) => {
      const jGroup = new THREE.Group();
      jGroup.position.set(jx, jy, jz);

      const matPick = idx % 2 === 0 ? jellyMatCyan : jellyMatViolet;
      const bell = new THREE.Mesh(jellyGeo, matPick);
      jGroup.add(bell);

      // 8 Trailing tentacles
      for (let t = 0; t < 8; t++) {
        const tent = new THREE.Mesh(jellyTentacleGeo, matPick);
        const ta = (t / 8) * Math.PI * 2;
        tent.position.set(Math.cos(ta) * 0.65, 0, Math.sin(ta) * 0.65);
        tent.rotation.z = Math.sin(ta) * 0.08;
        jGroup.add(tent);
      }

      scene.add(jGroup);
      deepJellyfish.push({
        mesh: jGroup,
        baseX: jx,
        baseY: jy,
        baseZ: jz,
        driftRadius: 2.8 + (idx % 3) * 1.6,
        driftAngle: idx * 0.7,
        driftSpeed: 0.22 + (idx % 2) * 0.12,
        pulsePhase: idx * 0.95
      });
    });
  }

  // ==========================================================================
  // 7,500 SWAYING 3D SEAGRASS & SEA ANEMONE BLADES (MOVING IN OCEAN CURRENT!)
  // ==========================================================================
  function buildUnderwaterSeaFlora(scene) {
    const bladeCount = 1800; // Curated, focused marine beds (reduces overhead, 1 draw call)
    const bladeGeo = new THREE.ConeGeometry(0.18, 1.4, 4, 1, true);
    bladeGeo.translate(0, 0.7, 0);

    const seaGrassUniforms = { uTime: { value: 0 } };
    const bladeMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      roughness: 0.65,
      metalness: 0.08,
      side: THREE.DoubleSide
    });

    bladeMat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = seaGrassUniforms.uTime;
      shader.vertexShader =
        `uniform float uTime;\n` +
        shader.vertexShader.replace(
          '#include <begin_vertex>',
          `
          #include <begin_vertex>
          float worldX = instanceMatrix[3][0];
          float worldZ = instanceMatrix[3][2];
          float sway = sin(uTime * 1.9 + worldX * 0.16 + worldZ * 0.14) * 0.35 * position.y;
          transformed.x += sway;
          transformed.z += cos(uTime * 1.5 + worldZ * 0.18) * 0.25 * position.y;
          `
        );
    };

    const instMesh = new THREE.InstancedMesh(bladeGeo, bladeMat, bladeCount);
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    let placed = 0;

    for (let attempt = 0; attempt < 18000 && placed < bladeCount; attempt++) {
      const gx = (Math.random() - 0.5) * 320;
      const gz = (Math.random() - 0.5) * 320 + 20;
      const gy = getTerrainHeight(gx, gz);

      // Must be underwater safely below shallow wading (-2.2m to -7.5m)
      if (gy >= -2.2 || gy <= -7.5) continue;

      // EXCLUDE ALL CLEAN BEACH SAND BANDS (traditional tidy swimming beaches!)
      if (isInCleanBeachSandBand(gx, gz)) continue;

      // Clear underwater channel around island coast (keeps swim path open)
      const dCoast = getDistanceToNearestCoast(gx, gz);
      if (dCoast < 14.0) continue;

      // Restrict strictly to 2 Curated Marine Sanctuary Beds:
      let inSeagrassZone = false;
      // 1. Crescent Lagoon Offshore Sanctuary Bed
      if (gz >= 92 && gz <= 118 && Math.abs(gx) <= 30) inSeagrassZone = true;
      // 2. Endless Pier Channel Bed
      else if (gx >= 48 && gx <= 76 && gz >= 36 && gz <= 68) inSeagrassZone = true;

      if (!inSeagrassZone) continue;

      dummy.position.set(gx, gy - 0.05, gz);
      dummy.rotation.set(
        (Math.random() - 0.5) * 0.25,
        Math.random() * Math.PI * 2,
        (Math.random() - 0.5) * 0.25
      );
      const s = 0.85 + Math.random() * 0.95;
      dummy.scale.set(s, s * (1.0 + Math.random() * 0.8), s);
      dummy.updateMatrix();
      instMesh.setMatrixAt(placed, dummy.matrix);

      // Palette of vibrant marine turquoise, emerald eelgrass, and coral green
      const hue = 0.42 + (Math.random() - 0.5) * 0.12;
      color.setHSL(hue, 0.72, 0.28 + Math.random() * 0.18);
      instMesh.setColorAt(placed, color);
      placed++;
    }

    instMesh.count = placed;
    instMesh.instanceMatrix.needsUpdate = true;
    if (instMesh.instanceColor) instMesh.instanceColor.needsUpdate = true;
    scene.add(instMesh);

    animatedObjects.push({
      type: 'custom_tick',
      tick: (t) => { seaGrassUniforms.uTime.value = t; }
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

    // Materials: Terracotta & Biscuit Sandstone, Aged Copper, Polished Brass
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xc87d55, roughness: 0.75 }); // Warm terracotta bistro walls
    const trimMat = new THREE.MeshStandardMaterial({ color: 0xecd9c6, roughness: 0.6 });  // Biscuit limestone pilasters
    const copperMat = new THREE.MeshStandardMaterial({ color: 0x3d7a6e, roughness: 0.55 }); // Aged verdigris copper dome
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xd8aa5b, roughness: 0.25, metalness: 0.85 }); // Polished brass
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x3b1d11, roughness: 0.5 }); // Dark mahogany doors
    const stepMat = new THREE.MeshStandardMaterial({ color: 0x5a483e, roughness: 0.8 }); // Stone terrace

    // 1. Foundation Terrace & Stepped Circular Plinth
    const terrace = new THREE.Mesh(new THREE.CylinderGeometry(9.6, 10.4, 0.7, 36), stepMat);
    terrace.position.y = 0.35;
    terrace.receiveShadow = true;
    group.add(terrace);

    const terraceTrim = new THREE.Mesh(new THREE.TorusGeometry(9.6, 0.08, 8, 36), brassMat);
    terraceTrim.rotation.x = Math.PI / 2;
    terraceTrim.position.y = 0.7;
    group.add(terraceTrim);

    // Stepped Entrance Stairs in front (local +Z)
    for (let s = 1; s <= 3; s++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(4.8 - s * 0.4, 0.22, 1.1), stepMat);
      step.position.set(0, 0.7 - s * 0.2, 9.6 + s * 0.7);
      step.receiveShadow = true;
      group.add(step);
    }

    // 2. Solid Terracotta Rotunda Building Wall (Radius 8.2m, Height 5.2m)
    const rotunda = new THREE.Mesh(new THREE.CylinderGeometry(8.2, 8.2, 5.2, 36), wallMat);
    rotunda.position.y = 3.3;
    rotunda.castShadow = true;
    rotunda.receiveShadow = true;
    group.add(rotunda);

    // Decorative Limestone Base Plinth & Cornice Frieze
    const basePlinth = new THREE.Mesh(new THREE.CylinderGeometry(8.4, 8.5, 0.45, 36), trimMat);
    basePlinth.position.y = 0.9;
    group.add(basePlinth);

    const cornice = new THREE.Mesh(new THREE.CylinderGeometry(8.6, 8.4, 0.55, 36), trimMat);
    cornice.position.y = 5.8;
    group.add(cornice);

    const corniceTrim = new THREE.Mesh(new THREE.TorusGeometry(8.6, 0.08, 8, 36), brassMat);
    corniceTrim.rotation.x = Math.PI / 2;
    corniceTrim.position.y = 6.05;
    group.add(corniceTrim);

    // 8 Classical Fluted Limestone Pilasters around the perimeter
    for (let p = 0; p < 8; p++) {
      const pa = (p / 8) * Math.PI * 2;
      // Skip the front entrance opening (p === 0 is +Z)
      if (p === 0) continue;

      const px = Math.cos(pa) * 8.25;
      const pz = Math.sin(pa) * 8.25;

      const pilaster = new THREE.Mesh(new THREE.BoxGeometry(0.55, 4.8, 0.35), trimMat);
      pilaster.position.set(px, 3.3, pz);
      pilaster.rotation.y = -pa + Math.PI / 2;
      pilaster.castShadow = true;
      group.add(pilaster);

      // Porthole Window between pilasters (Brass Torus + Glowing Glass)
      const wAngle = pa + (Math.PI / 8);
      const wx = Math.cos(wAngle) * 8.28;
      const wz = Math.sin(wAngle) * 8.28;

      const pFrame = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.08, 10, 24), brassMat);
      pFrame.position.set(wx, 3.5, wz);
      pFrame.rotation.y = -wAngle + Math.PI / 2;
      group.add(pFrame);

      const pGlass = new THREE.Mesh(
        new THREE.CircleGeometry(0.64, 20),
        new THREE.MeshBasicMaterial({ color: 0xffe6a3 }) // Warm interior amber glow
      );
      pGlass.position.set(wx, 3.5, wz);
      pGlass.rotation.y = -wAngle + Math.PI / 2;
      group.add(pGlass);
    }

    // 3. Verdigris Copper Hemispherical Dome (R = 8.3m, Height = 4.2m)
    const domeGeo = new THREE.SphereGeometry(8.3, 36, 18, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const dome = new THREE.Mesh(domeGeo, copperMat);
    dome.position.y = 6.0;
    dome.castShadow = true;
    dome.receiveShadow = true;
    group.add(dome);

    // Meridian Brass Ribs across the dome
    for (let r = 0; r < 8; r++) {
      const ra = (r / 8) * Math.PI * 2;
      const rib = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 8.5), brassMat);
      rib.position.set(0, 8.4, 0);
      rib.rotation.y = ra;
      rib.rotation.x = Math.PI * 0.24;
      group.add(rib);
    }

    // 4. Giant Beacon: The Golden Illuminated Culinary Sphere atop the Dome!
    const beaconGroup = new THREE.Group();
    beaconGroup.position.set(0, 10.6, 0);

    const goldenOrb = new THREE.Mesh(new THREE.SphereGeometry(1.35, 26, 22), brassMat);
    beaconGroup.add(goldenOrb);

    const orbRing = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.09, 12, 36), brassMat);
    orbRing.rotation.x = Math.PI * 0.38;
    beaconGroup.add(orbRing);

    const beaconLight = new THREE.PointLight(0xffd166, 2.2, 42);
    beaconLight.position.set(0, 0.2, 0);
    beaconGroup.add(beaconLight);

    group.add(beaconGroup);
    animatedObjects.push({ mesh: beaconGroup, type: 'spin_slow' });

    // 5. Grand Entrance Portico & Mahogany Double Doors (Front: local +Z)
    const porticoGroup = new THREE.Group();
    porticoGroup.position.set(0, 0, 8.2);

    // Portico frame arch
    const archMat = new THREE.MeshStandardMaterial({ color: 0x2e1a12, roughness: 0.4 });
    const arch = new THREE.Mesh(new THREE.BoxGeometry(4.2, 5.0, 0.5), archMat);
    arch.position.y = 3.2;
    porticoGroup.add(arch);

    // Double Mahogany Doors with circular portholes
    [-1.0, 1.0].forEach((dx) => {
      const doorPanel = new THREE.Mesh(new THREE.BoxGeometry(1.8, 4.4, 0.15), doorMat);
      doorPanel.position.set(dx, 2.9, 0.15);
      porticoGroup.add(doorPanel);

      const dPorthole = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.06, 12, 24), brassMat);
      dPorthole.position.set(dx, 3.6, 0.25);
      porticoGroup.add(dPorthole);

      const dGlass = new THREE.Mesh(
        new THREE.CircleGeometry(0.44, 20),
        new THREE.MeshBasicMaterial({ color: 0xffdf96 })
      );
      dGlass.position.set(dx, 3.6, 0.25);
      porticoGroup.add(dGlass);

      // Brass Handles
      const dHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.9, 10), brassMat);
      dHandle.position.set(dx + (dx > 0 ? -0.55 : 0.55), 2.9, 0.3);
      porticoGroup.add(dHandle);
    });

    // Engraved Brass Plaque above Door: "SPHERICAL FOODS · NO FLAT FOOD ALLOWED"
    const plaqueMat = new THREE.MeshStandardMaterial({ color: 0xd8aa5b, roughness: 0.25, metalness: 0.85 });
    const plaque = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.55, 0.1), plaqueMat);
    plaque.position.set(0, 5.25, 0.35);
    porticoGroup.add(plaque);

    // Warm Hanging Lantern above Portico
    const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 12), new THREE.MeshBasicMaterial({ color: 0xffe082 }));
    lantern.position.set(0, 4.6, 0.7);
    porticoGroup.add(lantern);

    const lanternLight = new THREE.PointLight(0xffbe6b, 2.0, 16, 1.2);
    lanternLight.position.set(0, 4.6, 0.8);
    porticoGroup.add(lanternLight);

    group.add(porticoGroup);

    // 6. Side Climbing Crates for Rooftop & Dome Exploration
    const crateMat = new THREE.MeshStandardMaterial({ color: 0x5a3e28, roughness: 0.85 });
    const crate1 = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.4, 1.6), crateMat);
    crate1.position.set(6.4, 0.7, -3.2);
    group.add(crate1);

    const crate2 = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.4, 1.5), crateMat);
    crate2.position.set(6.6, 2.1, -2.0);
    group.add(crate2);

    const crate3 = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.4, 1.4), crateMat);
    crate3.position.set(6.8, 3.5, -0.8);
    group.add(crate3);

    const crate4 = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.4, 1.3), crateMat);
    crate4.position.set(7.0, 4.9, 0.4);
    group.add(crate4);

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

    // 1. Ornate Brass Starlight Observatory Telescope (Pointing upward at night sky & sky seam)
    const teleGroup = new THREE.Group();
    teleGroup.position.set(0, 0.45, 5.0);
    teleGroup.rotation.y = 0.35;

    for (let i = 0; i < 3; i++) {
      const legAng = (i * Math.PI * 2) / 3;
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.04, 2.6, 8), brassMat);
      leg.position.set(Math.cos(legAng) * 0.7, 1.25, Math.sin(legAng) * 0.7);
      leg.rotation.z = Math.cos(legAng) * 0.28;
      leg.rotation.x = -Math.sin(legAng) * 0.28;
      teleGroup.add(leg);
    }

    const teleMount = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.4, 12), brassMat);
    teleMount.position.y = 2.4;
    teleGroup.add(teleMount);

    const teleBarrel = new THREE.Group();
    teleBarrel.position.set(0, 2.6, 0);
    teleBarrel.rotation.x = -0.55; // Angled upward at 32 degrees toward the sky

    const mainTube = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.16, 2.8, 16), brassMat);
    mainTube.rotation.x = Math.PI / 2;
    teleBarrel.add(mainTube);

    const sunShade = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.22, 0.6, 16), brassMat);
    sunShade.rotation.x = Math.PI / 2;
    sunShade.position.z = 1.4;
    teleBarrel.add(sunShade);

    const lens = new THREE.Mesh(
      new THREE.CircleGeometry(0.24, 16),
      new THREE.MeshBasicMaterial({ color: 0x82e2ff, side: THREE.DoubleSide })
    );
    lens.position.z = 1.7;
    teleBarrel.add(lens);

    teleGroup.add(teleBarrel);
    group.add(teleGroup);

    // 2. Stone Reading Table with Glowing Celestial Star Map
    const mapTable = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.85, 1.4), stoneMat);
    mapTable.position.set(-4.5, 0.85, 0);
    mapTable.rotation.y = 0.5;
    group.add(mapTable);

    const mapScroll = new THREE.Mesh(
      new THREE.PlaneGeometry(1.8, 1.0),
      new THREE.MeshBasicMaterial({ color: 0xfff3d1, side: THREE.DoubleSide })
    );
    mapScroll.rotation.x = -Math.PI / 2;
    mapScroll.position.set(-4.5, 1.29, 0);
    mapScroll.rotation.z = 0.5;
    group.add(mapScroll);

    const lanternLight = new THREE.PointLight(0xffdf80, 1.2, 8);
    lanternLight.position.set(-4.5, 1.6, 0);
    group.add(lanternLight);

    const moonLight = new THREE.PointLight(0xc084fc, 2.0, 32);
    moonLight.position.set(0, 6.5, 0);
    group.add(moonLight);

    scene.add(group);
  }

  // Outdoor island spin dryer removed in favor of the full indoor laundromat zone.

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
  function updateWorld(time, dt = 0.016, scene = null, activeCamera = null) {
    if (activeCamera) lastCamera = activeCamera;
    if (waterUniforms) waterUniforms.uTime.value = time;
    if (grassUniforms) grassUniforms.uTime.value = time;
    if (lavaLight) lavaLight.intensity = 3.2 + Math.sin(time * 4.5) * 0.65;
    updateDayNight(scene);

    if (emberSystem) {
      const pos = emberSystem.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        let y = pos.getY(i) + 0.18 + (i % 5) * 0.02;
        let x = pos.getX(i);
        let z = pos.getZ(i);

        // Gentle natural atmospheric swirl and drift
        x += Math.sin(time * 1.2 + i * 0.37) * 0.035;
        z += Math.cos(time * 1.1 + i * 0.41) * 0.035;

        // Reset into deep crater floor when reaching skyward apex
        if (y > 122) {
          y = 32.5 + Math.random() * 4.0;
          const ang = Math.random() * Math.PI * 2;
          const rad = Math.sqrt(Math.random()) * 13.5;
          x = -28 + Math.cos(ang) * rad;
          z = -148 + Math.sin(ang) * rad;
        }

        pos.setXYZ(i, x, y, z);
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

    // 3. Update Birbs (Flocking to thrown Breb Loaves, Pecking & Multi-Loaf Appetite!)
    for (let i = activeBrebLoaves.length - 1; i >= 0; i--) {
      activeBrebLoaves[i].life -= dt;
      if (activeBrebLoaves[i].life <= 0) {
        if (scene) scene.remove(activeBrebLoaves[i].mesh);
        activeBrebLoaves.splice(i, 1);
      }
    }

    birbFlock.forEach((b) => {
      // Birb Satiation & Breb Coma handling
      const wasSleeping = b.isSleeping;
      if (b.satiationTimer > 0) {
        b.satiationTimer = Math.max(0, b.satiationTimer - dt);
        b.isSleeping = b.satiationTimer > 0;
      } else {
        b.isSleeping = false;
      }

      // Birb woke up from food coma! Drops guano!
      if (wasSleeping && !b.isSleeping) {
        b.downGathered = false;
        if (typeof window.BlahajOnBirbWakeUp === 'function') {
          window.BlahajOnBirbWakeUp(b);
        }
      }

      if (b.isSleeping) {
        // Satiated loaf pose! Birb settles down comfortably onto the meadow grass, snoozing
        const groundY = getGroundAndStructureHeight(b.mesh.position.x, b.mesh.position.z, b.mesh.position.y);
        b.mesh.position.y = groundY + 0.04;
        b.mesh.rotation.x = 0;
        const breath = 1.0 + Math.sin(time * 2.2 + b.hopPhase) * 0.04;
        b.mesh.scale.set(1.18 * breath, 0.74 * (2.0 - breath), 1.18 * breath);
        if (b.mesh.userData.leftWing && b.mesh.userData.rightWing) {
          b.mesh.userData.leftWing.rotation.z = 0;
          b.mesh.userData.rightWing.rotation.z = 0;
        }
        b.snoozeTimer = (b.snoozeTimer || 0) + dt;
        if (b.snoozeTimer >= 2.2) {
          b.snoozeTimer = 0;
          if (window.BlahajEffects && typeof window.BlahajEffects.spawnSnoozeZzz === 'function') {
            window.BlahajEffects.spawnSnoozeZzz(b.mesh.position);
          }
        }
        return; // Stuffed and happy: ignores further breb loaves until awake!
      } else {
        b.mesh.scale.set(1, 1, 1);
      }

      // Birb is actively pecking & eating a loaf!
      if (b.isEating) {
        const loafStillExists = b.targetLoaf && activeBrebLoaves.includes(b.targetLoaf) && b.targetLoaf.life > 0;
        if (!loafStillExists) {
          b.isEating = false;
          b.targetLoaf = null;
          b.mesh.rotation.x = 0;
        } else {
          b.eatTimer -= dt;
          const groundY = getGroundAndStructureHeight(b.mesh.position.x, b.mesh.position.z, b.mesh.position.y);
          b.mesh.position.y = groundY;

          // Face the delicious bread loaf
          const ldx = b.targetLoaf.pos.x - b.mesh.position.x;
          const ldz = b.targetLoaf.pos.z - b.mesh.position.z;
          b.mesh.rotation.y = Math.atan2(ldx, ldz);

          // Animated enthusiastic pecking & head bobbing!
          b.mesh.rotation.x = Math.max(0, Math.sin(time * 22)) * 0.42;

          // Flutter wings excitedly while pecking
          if (b.mesh.userData.leftWing && b.mesh.userData.rightWing) {
            const wingPeck = Math.sin(time * 26 + b.hopPhase) * 0.35;
            b.mesh.userData.leftWing.rotation.z = wingPeck;
            b.mesh.userData.rightWing.rotation.z = -wingPeck;
          }

          // Flying breadcrumbs
          b.crumbTimer = (b.crumbTimer || 0) + dt;
          if (b.crumbTimer >= 0.4) {
            b.crumbTimer = 0;
            if (window.BlahajEffects && typeof window.BlahajEffects.spawnBreadCrumbs === 'function') {
              window.BlahajEffects.spawnBreadCrumbs(b.targetLoaf.pos);
            }
          }

          // Loaf visibly shrinks as the Birb munches it down
          const eatRatio = Math.max(0.08, b.eatTimer / 3.5);
          b.targetLoaf.mesh.scale.set(1.35 * eatRatio, 0.82 * eatRatio, 0.95 * eatRatio);

          if (b.eatTimer <= 0) {
            // Meal complete!
            b.isEating = false;
            b.mesh.rotation.x = 0;
            if (b.mesh.userData.leftWing && b.mesh.userData.rightWing) {
              b.mesh.userData.leftWing.rotation.z = 0;
              b.mesh.userData.rightWing.rotation.z = 0;
            }

            // Remove consumed loaf from world
            b.targetLoaf.life = 0;
            if (scene) scene.remove(b.targetLoaf.mesh);
            const loafIdx = activeBrebLoaves.indexOf(b.targetLoaf);
            if (loafIdx !== -1) activeBrebLoaves.splice(loafIdx, 1);
            b.targetLoaf = null;

            // Track multi-loaf appetite (takes 3 loaves to get fully stuffed into a coma)
            b.appetite = (b.appetite || 0) + 1;

            if (b.appetite >= 3) {
              b.satiationTimer = 90.0;
              b.isSleeping = true;
              b.downGathered = false;
              b.appetite = 0;
              if (typeof window.BlahajOnBirbComa === 'function') {
                window.BlahajOnBirbComa(b);
              }
            } else {
              if (typeof window.BlahajOnBirbLoafEaten === 'function') {
                window.BlahajOnBirbLoafEaten(b);
              }
            }
          }
          return;
        }
      }

      // Search for nearest unclaimed bread loaf
      let nearestBreb = null;
      let minD = 24;
      activeBrebLoaves.forEach((loaf) => {
        if (loaf.life > 0 && (!loaf.claimedBy || loaf.claimedBy === b)) {
          const d = loaf.pos.distanceTo(b.mesh.position);
          if (d < minD) {
            minD = d;
            nearestBreb = loaf;
          }
        }
      });

      if (nearestBreb) {
        const dist = nearestBreb.pos.distanceTo(b.mesh.position);
        if (dist <= 0.85) {
          // Reached loaf! Begin pecking and munching
          b.isEating = true;
          b.eatTimer = 3.5;
          b.crumbTimer = 0;
          b.targetLoaf = nearestBreb;
          nearestBreb.claimedBy = b;
          return;
        }

        // Hop eagerly towards bread loaf!
        const dir = nearestBreb.pos.clone().sub(b.mesh.position).normalize();
        b.mesh.position.x += dir.x * 5.5 * dt;
        b.mesh.position.z += dir.z * 5.5 * dt;
        b.mesh.rotation.y = Math.atan2(dir.x, dir.z);
        b.mesh.rotation.x = 0;

        const groundY = getGroundAndStructureHeight(b.mesh.position.x, b.mesh.position.z, b.mesh.position.y);
        b.mesh.position.y = groundY + Math.abs(Math.sin(time * 15 + b.hopPhase)) * 0.35;

        if (b.mesh.userData.leftWing && b.mesh.userData.rightWing) {
          const flap = Math.sin(time * 20 + b.hopPhase) * 0.65;
          b.mesh.userData.leftWing.rotation.z = flap;
          b.mesh.userData.rightWing.rotation.z = -flap;
        }
      } else {
        // No loaf: gentle idle hopping around home position
        b.mesh.rotation.x = 0;
        const dHome = b.homePos.distanceTo(b.mesh.position);
        if (dHome > 1.4) {
          const dir = b.homePos.clone().sub(b.mesh.position).normalize();
          b.mesh.position.x += dir.x * 1.8 * dt;
          b.mesh.position.z += dir.z * 1.8 * dt;
          b.mesh.rotation.y = Math.atan2(dir.x, dir.z);
        }
        const groundY = getGroundAndStructureHeight(b.mesh.position.x, b.mesh.position.z, b.mesh.position.y);
        b.mesh.position.y = groundY + Math.abs(Math.sin(time * 6 + b.hopPhase)) * 0.12;

        if (b.mesh.userData.leftWing && b.mesh.userData.rightWing) {
          const flap = Math.sin(time * 10 + b.hopPhase) * 0.2;
          b.mesh.userData.leftWing.rotation.z = flap;
          b.mesh.userData.rightWing.rotation.z = -flap;
        }
      }
    });

    // 4. Update Swimming & Leaping Tropical Fishes across the 3D Water Column
    fishSchool.forEach((f) => {
      const prevWave = Math.sin((time - dt) * 2.4 + f.jumpPhase);
      f.angle += f.speed * dt;
      const nx = f.centerX + Math.cos(f.angle) * f.radius;
      const nz = f.centerZ + Math.sin(f.angle) * f.radius;
      const leapWave = Math.sin(time * 2.4 + f.jumpPhase);

      let ny;
      if (f.canLeap && leapWave > 0.62) {
        ny = (leapWave - 0.62) * 3.6;
      } else {
        ny = f.baseDepth + Math.sin(time * 1.8 + f.jumpPhase) * 0.38;
      }

      f.mesh.position.set(nx, ny, nz);
      f.mesh.rotation.y = -f.angle;
      f.mesh.rotation.x = (f.canLeap && leapWave > 0.62)
        ? -Math.cos(time * 2.4 + f.jumpPhase) * 0.6
        : Math.sin(time * 1.8 + f.jumpPhase) * 0.14;

      // Splash sound effect on fish breaching surface
      if (f.canLeap && prevWave <= 0.62 && leapWave > 0.62 && window.CozyAudioTrigger) {
        window.CozyAudioTrigger.fishSplash(f.mesh.position);
      }
    });

    // 5. Update Ocean Wave Cycle Uniform & Beach Balls / Fleet Boats Riding the Swells!
    currentWaveAmp = getWaveAmplitude(time);
    if (waterUniforms && waterUniforms.uWaveAmp) {
      waterUniforms.uWaveAmp.value = currentWaveAmp;
    }

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
        bm.rotation.order = 'YXZ';
        const heading = bm.rotation.y;
        const cosH = Math.cos(heading);
        const sinH = Math.sin(heading);

        // Sample water height at bow (+Z local) and stern (-Z local)
        const bowDist = 2.4;
        const bowX = bm.position.x + bowDist * sinH;
        const bowZ = bm.position.z + bowDist * cosH;
        const sternX = bm.position.x - bowDist * sinH;
        const sternZ = bm.position.z - bowDist * cosH;

        // Sample water height at port (-X local) and starboard (+X local)
        const beamDist = 1.3;
        const portX = bm.position.x - beamDist * cosH;
        const portZ = bm.position.z + beamDist * sinH;
        const starX = bm.position.x + beamDist * cosH;
        const starZ = bm.position.z - beamDist * sinH;

        const hBow = getWaveHeight(bowX, bowZ, time);
        const hStern = getWaveHeight(sternX, sternZ, time);
        const hPort = getWaveHeight(portX, portZ, time);
        const hStar = getWaveHeight(starX, starZ, time);
        const hCenter = getWaveHeight(bm.position.x, bm.position.z, time);

        // Boat draft sits naturally on water surface plus buoyant lift
        const targetY = (hBow + hStern + hCenter * 2.0) / 4.0 + 0.16;
        bm.position.y += (targetY - bm.position.y) * Math.min(1.0, dt * 9.0);

        // Pitch: bow up when climbing wave, bow down when descending trough
        const targetPitch = Math.atan2(hStern - hBow, bowDist * 2.0);
        // Roll: side-to-side listing with the wave slope
        const targetRoll = Math.atan2(hStar - hPort, beamDist * 2.0);

        // Add subtle harmonic water ripple vibration
        const chopPitch = Math.sin(time * 2.8 + bm.position.x * 0.1) * 0.025 * currentWaveAmp;
        const chopRoll = Math.cos(time * 2.3 + bm.position.z * 0.1) * 0.03 * currentWaveAmp;

        bm.rotation.x += (targetPitch + chopPitch - bm.rotation.x) * Math.min(1.0, dt * 8.0);
        bm.rotation.z += (targetRoll + chopRoll - bm.rotation.z) * Math.min(1.0, dt * 8.0);
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

    // 7. Sway 3D Kelp Forest Fronds with Oceanic Currents
    kelpPlants.forEach((k) => {
      const swayZ = Math.sin(time * 1.5 + k.swayPhase) * 0.16;
      const swayX = Math.cos(time * 1.2 + k.swayPhase * 0.8) * 0.11;
      k.group.rotation.z = swayZ;
      k.group.rotation.x = swayX;
    });

    // 8. Drift & Pulsate Bioluminescent Deep Jellyfish along the Grand Drop-Off & Deep Shelf
    deepJellyfish.forEach((j) => {
      j.driftAngle += j.driftSpeed * dt;
      j.mesh.position.x = j.baseX + Math.cos(j.driftAngle) * j.driftRadius;
      j.mesh.position.z = j.baseZ + Math.sin(j.driftAngle) * j.driftRadius;
      const pulse = Math.sin(time * 2.4 + j.pulsePhase);
      j.mesh.position.y = j.baseY + Math.sin(time * 0.8 + j.pulsePhase) * 0.45;
      j.mesh.scale.set(1.0 - pulse * 0.1, 1.0 + pulse * 0.18, 1.0 - pulse * 0.1);
      if (j.mesh.children && j.mesh.children[0] && j.mesh.children[0].material) {
        j.mesh.children[0].material.emissiveIntensity = 0.55 + pulse * 0.35;
      }
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
      } else if (item.type === 'custom_tick' && typeof item.tick === 'function') {
        item.tick(time);
      }
    });
  }

  return {
    buildWorld,
    getTerrainHeight,
    getGroundAndStructureHeight,
    getLandmarkSurfaceHeight,
    getDistanceToNearestCoast,
    getOceanSeabedDepth,
    isInCleanBeachSandBand: (x, z) => isInCleanBeachSandBand(x, z),
    isInsideVolcanoDungeon,
    isOnIslandRoad,
    getWaveHeight,
    updateWorld,
    updateDayNight,
    getDayNightState: () => currentSkyState,
    getSkyKeyframes: () => SKY_KEYFRAMES,
    setWaveState,
    getWaveState,
    getWaveAmplitude: () => currentWaveAmp,
    isUnderlyingTerrainGreen: (x, z) => isUnderlyingTerrainGreen(x, z),
    getGrassUniforms: () => grassUniforms
  };
})();

