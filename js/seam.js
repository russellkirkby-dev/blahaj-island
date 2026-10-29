// ============================================================================
// BLÅHAJ ISLAND — THE GREAT SEAM & RECURRING HOURLY INCURSION MINI-GAME
// ============================================================================
// Features:
// 1. Recurring 1-Hour (3600s) Seam Maintenance Cycle.
// 2. Exactly 6 Findable Cosmic Rifts scattered across varied instances:
//    - Volcano Trial Dungeon (including the difficult Ember Ridge platform path!)
//    - The Midnight Liminal Laundromat (behind Master Washer #7, window alcove)
//    - Spherical Foods Restaurant (Helen's cake pedestal, private banquette booth)
//    - Island Overworld (Endless Pierhead, Windmill, Cliffs Lookout, Beach Dunes, etc.)
// 3. Findability Guarantee: Clean ground/floor clearance, visible starlight auras,
//    never embedded in walls or floors.
// 4. Incursion Event (if 1 hour expires with open rifts):
//    - Cosmic tear rips open!
//    - 6 Sea Animal Invaders per player present flop onto the land!
//    - Players must nose-boop them until launched into the stratosphere.
//    - On ocean splashdown, invaders return to sea patrols for at least 1 hour.
//    - Repelling all invaders restores peace and resets the 1-hour cycle.
// 5. Developer Debug Integration (opened via typing "Blahaj").
// ============================================================================

window.BlahajSeam = (function () {
  const CYCLE_DURATION = 3600; // 1 Hour in seconds
  let cycleTimer = CYCLE_DURATION;
  let cycleState = 'calm'; // 'calm' | 'incursion'

  // Master Pool of Findable, Curated Rift Locations across all game zones
  const CANDIDATE_POOL = [
    // --- VOLCANO TRIAL DUNGEON ---
    {
      id: 'volcano_ridge_pinnacle',
      zone: 'volcano',
      name: 'Volcano · Ember Ridge Pinnacle (Difficult Solo Path)',
      desc: 'High volcanic pinnacle along the cracking lava ridge.',
      pos: { x: 17.0, y: 2.2, z: -207.5 }
    },
    {
      id: 'volcano_gatehall_niche',
      zone: 'volcano',
      name: 'Volcano · Obsidian Gatehall Pillar Alcove',
      desc: 'Tucked behind the basalt corridor pillar past swinging pendulums.',
      pos: { x: -6.5, y: 1.6, z: -35.0 }
    },
    {
      id: 'volcano_causeway_shelf',
      zone: 'volcano',
      name: 'Volcano · Magma Causeway Rock Shelf',
      desc: 'Raised basalt shelf overlooking the bubbling magma sea.',
      pos: { x: 8.5, y: 1.6, z: -132.0 }
    },
    {
      id: 'volcano_overlook_balcony',
      zone: 'volcano',
      name: 'Volcano · Caldera Overlook Railing',
      desc: 'Gleaming at the edge of the sacred core overlook.',
      pos: { x: -16.0, y: 23.5, z: -356.0 }
    },

    // --- THE MIDNIGHT LIMINAL LAUNDROMAT ---
    {
      id: 'laundry_washer7_crown',
      zone: 'laundromat',
      name: 'Laundromat · Behind Master Washer #7',
      desc: 'Shimmering above the back service crown of giant washer #7.',
      pos: { x: 0.0, y: 2.6, z: -15.2 }
    },
    {
      id: 'laundry_cosmic_alcove',
      zone: 'laundromat',
      name: 'Laundromat · Cosmic Star Window Alcove',
      desc: 'Beside the starry observation window behind folding tables.',
      pos: { x: 7.0, y: 1.5, z: -5.5 }
    },
    {
      id: 'laundry_cart_loop',
      zone: 'laundromat',
      name: 'Laundromat · North Cart Track Loop',
      desc: 'Floating at the far turnaround curve of the laundry cart loop.',
      pos: { x: -8.5, y: 1.5, z: 12.0 }
    },

    // --- SPHERICAL FOODS RESTAURANT ---
    {
      id: 'bistro_cake_pedestal',
      zone: 'spherical_foods',
      name: 'Spherical Foods · Celestial Cake Rotunda',
      desc: 'Suspended beside Helen’s ruby mirror-glazed birthday cake.',
      pos: { x: 2.6, y: 1.8, z: -3.2 }
    },
    {
      id: 'bistro_booth_vip',
      zone: 'spherical_foods',
      name: 'Spherical Foods · VIP Banquette Booth #4',
      desc: 'Tucked inside the private booth corner under the velvet lamp.',
      pos: { x: 12.5, y: 1.5, z: 9.0 }
    },
    {
      id: 'bistro_buffet_arch',
      zone: 'spherical_foods',
      name: 'Spherical Foods · Welcome Buffet Arch',
      desc: 'Floating behind Monsieur Betterave’s grand greeting buffet.',
      pos: { x: -9.5, y: 1.8, z: 4.0 }
    },

    // --- ISLAND OVERWORLD ---
    {
      id: 'island_pier_head',
      zone: 'island',
      name: 'Endless Pier · Far Pierhead Stargaze',
      desc: 'At the wooden tip of Endless Pier beyond the launch mortar.',
      pos: { x: 48.0, y: 2.5, z: 82.0 }
    },
    {
      id: 'island_windmill_heartland',
      zone: 'island',
      name: 'Heartland · Windmill & Oven Overlook',
      desc: 'Behind Solomon’s stone bread oven and the turning windmill blades.',
      pos: { x: -18.5, y: 3.2, z: 22.0 }
    },
    {
      id: 'island_crust_cliffs',
      zone: 'island',
      name: 'Crust Cliffs · Nimue’s Stargazer Promontory',
      desc: 'Perched high above the azure waves on the moonlit cliff edge.',
      pos: { x: 38.0, y: 5.5, z: -46.0 }
    },
    {
      id: 'island_crescent_dunes',
      zone: 'island',
      name: 'Crescent Beach · Driftwood Cove Dunes',
      desc: 'Hidden behind weathered driftwood boulders along the clean sand.',
      pos: { x: -26.0, y: 2.2, z: 48.0 }
    },
    {
      id: 'island_volcano_wharf',
      zone: 'island',
      name: 'Rear Wharf · Basalt Sea Arch',
      desc: 'Tucked under the dark volcanic rocks behind the northern shore.',
      pos: { x: -28.0, y: 2.2, z: -185.0 }
    },
    {
      id: 'island_stargazer_isle',
      zone: 'island',
      name: 'Outer Sanctuary · Stargazer Isle Dock',
      desc: 'Beside the golden charter arch on the northeast stargazer island.',
      pos: { x: 88.0, y: 2.5, z: -78.0 }
    }
  ];

  let activeRifts = []; // 6 currently chosen rifts
  let activeInvadersNeeded = 6;
  let invadersBanishedCount = 0;
  let currentZoneName = 'island';
  let listeners = [];

  // --------------------------------------------------------------------------
  // 1. 3D RIFT MESH FACTORY
  // --------------------------------------------------------------------------
  function createRift3DGroup(riftData) {
    const group = new THREE.Group();
    group.position.set(riftData.pos.x, riftData.pos.y, riftData.pos.z);

    // Glowing core: Wireframe octahedron (purple) or solid gold when mended
    const coreMat = new THREE.MeshBasicMaterial({
      color: riftData.mended ? 0xf5cd79 : 0xa855f7,
      wireframe: !riftData.mended
    });
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(1.05, 1), coreMat);
    group.add(core);

    // Cosmic energy ring: Torus
    const ringMat = new THREE.MeshBasicMaterial({
      color: riftData.mended ? 0x52f29c : 0x38bdf8,
      side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.55, 0.08, 14, 32), ringMat);
    group.add(ring);

    // Point Light aura
    const light = new THREE.PointLight(riftData.mended ? 0x52f29c : 0xa855f7, 1.8, 12.0);
    light.position.set(0, 0, 0);
    group.add(light);

    group.userData = {
      id: riftData.id,
      locId: riftData.locId,
      zone: riftData.zone,
      name: riftData.name,
      mended: riftData.mended,
      core,
      ring,
      light
    };

    return group;
  }

  // --------------------------------------------------------------------------
  // 2. RIFT POOL SELECTION (6 RIFTS EACH CYCLE)
  // --------------------------------------------------------------------------
  function selectActiveRifts() {
    // Clear existing meshes from scenes
    activeRifts.forEach((r) => {
      if (r.mesh && r.mesh.parent) {
        r.mesh.parent.remove(r.mesh);
      }
    });

    // Pick 6 unique locations from candidate pool
    // Ensure diverse distribution: at least 1 in volcano, 1 in laundromat/restaurant, and rest in island
    const shuffled = [...CANDIDATE_POOL].sort(() => Math.random() - 0.5);
    const chosen = [];

    // Prioritize at least 1 from each sub-zone
    const volcanoCand = shuffled.find((c) => c.zone === 'volcano');
    const indoorCand = shuffled.find((c) => c.zone === 'laundromat' || c.zone === 'spherical_foods');
    const islandCand = shuffled.find((c) => c.zone === 'island');

    if (volcanoCand) chosen.push(volcanoCand);
    if (indoorCand && !chosen.includes(indoorCand)) chosen.push(indoorCand);
    if (islandCand && !chosen.includes(islandCand)) chosen.push(islandCand);

    // Fill the remainder up to 6
    for (const c of shuffled) {
      if (chosen.length >= 6) break;
      if (!chosen.includes(c)) chosen.push(c);
    }

    activeRifts = chosen.map((c, idx) => {
      const riftData = {
        id: `seam_rift_${idx + 1}`,
        locId: c.id,
        zone: c.zone,
        name: c.name,
        desc: c.desc,
        pos: { ...c.pos },
        mended: false,
        mesh: null
      };
      riftData.mesh = createRift3DGroup(riftData);
      return riftData;
    });

    attachRiftsToScene(currentZoneName);
    console.log(`[BlahajSeam] Initialized 6 Great Seam rifts:`, activeRifts.map((r) => `${r.name} (${r.zone})`));
  }

  // Attach active rifts to the appropriate 3D scene instance based on current zone
  function attachRiftsToScene(zone) {
    currentZoneName = zone;
    let targetScene = null;

    if (zone === 'volcano' && window.BlahajVolcano) {
      targetScene = window.BlahajVolcano.getScene();
    } else if (zone === 'laundromat' && window.BlahajLaundromat) {
      targetScene = window.BlahajLaundromat.getScene();
    } else if (zone === 'spherical_foods' && window.BlahajSphericalFoods) {
      targetScene = window.BlahajSphericalFoods.getScene();
    } else if (zone === 'island' || zone === 'overworld') {
      targetScene = window.__THREE_SCENE__ || (window.BlahajGame && window.BlahajGame.getScene ? window.BlahajGame.getScene() : null);
    }

    activeRifts.forEach((r) => {
      if (r.zone === zone) {
        if (targetScene && r.mesh.parent !== targetScene) {
          targetScene.add(r.mesh);
          r.mesh.visible = true;
        }
      } else {
        if (r.mesh.parent) {
          r.mesh.parent.remove(r.mesh);
        }
      }
    });
  }

  // --------------------------------------------------------------------------
  // 3. MENDING RIFTS & TRANQUILITY RESTORATION
  // --------------------------------------------------------------------------
  function mendRift(riftId) {
    const rift = activeRifts.find((r) => r.id === riftId || (r.mesh && r.mesh.userData.id === riftId));
    if (!rift || rift.mended) return false;

    rift.mended = true;
    if (rift.mesh) {
      rift.mesh.userData.mended = true;
      rift.mesh.userData.core.material.color.setHex(0xf5cd79);
      rift.mesh.userData.core.material.wireframe = false;
      rift.mesh.userData.ring.material.color.setHex(0x52f29c);
      rift.mesh.userData.light.color.setHex(0x52f29c);
    }

    const mendedCount = activeRifts.filter((r) => r.mended).length;
    notifyUpdate();

    // Check if all 6 are sealed!
    if (mendedCount >= 6) {
      onAllRiftsMended();
    }

    return true;
  }

  function onAllRiftsMended() {
    cycleState = 'calm';
    cycleTimer = CYCLE_DURATION; // Reset full 1-hour calm timer
    invadersBanishedCount = 0;

    if (window.CozyAudio && typeof window.CozyAudio.portalChime === 'function') {
      window.CozyAudio.portalChime();
    }
    if (window.showToast) {
      window.showToast('GREAT SEAM FULLY STABILIZED! 🪡✨', 'All 6 cosmic tears mended across the archipelago! The realm remains at peace.');
    }
    if (window.addChatLog) {
      window.addChatLog('🪡✨ <strong>THE GREAT SEAM IS SEALED!</strong> The ocean barrier holds firm. Blåhaj Island will remain tranquil for the next hour.', 'lore');
    }
    if (window.BlahajGame && typeof window.BlahajGame.completeQuest === 'function') {
      window.BlahajGame.completeQuest('q-sw-seam');
    }
    notifyUpdate();
  }

  // --------------------------------------------------------------------------
  // 4. INCURSION EVENT (RIPS SEAM & LAND INVADERS EMERGE)
  // --------------------------------------------------------------------------
  function triggerIncursion(forced = false) {
    if (cycleState === 'incursion' && !forced) return;

    cycleState = 'incursion';
    cycleTimer = 0;

    // 6 Invaders per player present
    const playerCount = (window.coopPartner && (window.coopPartner.connected || window.coopPartner.peerId)) ? 2 : 1;
    activeInvadersNeeded = playerCount * 6;
    invadersBanishedCount = 0;

    if (window.CozyAudio && typeof window.CozyAudio.portalChime === 'function') {
      window.CozyAudio.portalChime();
    }

    // Spawn Incursion Land Invaders via BlahajEnemies
    if (window.BlahajEnemies && typeof window.BlahajEnemies.spawnIncursionInvaders === 'function') {
      window.BlahajEnemies.spawnIncursionInvaders(activeInvadersNeeded);
    }

    if (window.showToast) {
      window.showToast(
        '🚨 THE GREAT SEAM HAS RIPPED! 🚨',
        `Cosmic breach! ${activeInvadersNeeded} Mean Sharks & sea critters have invaded the land! Boop them back to sea!`
      );
    }
    if (window.addChatLog) {
      window.addChatLog(
        `🚨⚡ <strong>COSMIC SEAM INCURSION!</strong> The Great Seam has torn open! <strong>${activeInvadersNeeded} sea invaders</strong> have washed ashore onto Crescent Beach and the Heartland. Boop them on the nose to launch them back into the ocean depths!`,
        'system'
      );
    }

    notifyUpdate();
  }

  // Called when an incursion creature is booped to 100% mange and splashes into the ocean
  function onInvaderExpelledToSea(enemy) {
    if (cycleState !== 'incursion') return;
    invadersBanishedCount++;

    if (window.showToast) {
      window.showToast(
        '🌊 INVADER EXPELLED TO SEA!',
        `${enemy ? enemy.title : 'Sea Invader'} banished to oceanic patrol! (${invadersBanishedCount} / ${activeInvadersNeeded} Repelled)`
      );
    }

    if (invadersBanishedCount >= activeInvadersNeeded) {
      onIncursionRepelled();
    } else {
      notifyUpdate();
    }
  }

  function onIncursionRepelled() {
    cycleState = 'calm';
    cycleTimer = CYCLE_DURATION; // 1 Hour peace
    invadersBanishedCount = 0;

    // Reroll 6 fresh rifts across the archipelago for the new hour
    selectActiveRifts();

    if (window.CozyAudio && typeof window.CozyAudio.birthdayHorn === 'function') {
      window.CozyAudio.birthdayHorn();
    }
    if (window.showToast) {
      window.showToast(
        '🌊 INVASION REPELLED! GREAT SEAM RESEALED! 🪡✨',
        'All invaders booped back to the ocean depths! Sea animals are pacified for at least the next hour.'
      );
    }
    if (window.addChatLog) {
      window.addChatLog(
        '🏆✨ <strong>ISLAND DEFENDED!</strong> All land invaders have been launched back into the ocean! The Great Seam has resealed. Peace is restored for the next hour.',
        'cozy'
      );
    }

    // Award Trial Points & Warmth
    if (window.BlahajGame) {
      if (typeof window.BlahajGame.completeQuest === 'function') {
        window.BlahajGame.completeQuest('q-sw-seam');
      }
      if (typeof window.BlahajGame.giveTrialPoints === 'function') {
        window.BlahajGame.giveTrialPoints(2);
      }
    }

    notifyUpdate();
  }

  // --------------------------------------------------------------------------
  // 5. UPDATE LOOP (ANIMATION, TIMER & PROXIMITY)
  // --------------------------------------------------------------------------
  function update(dt, elapsed, playerPos, playerZone) {
    if (playerZone && playerZone !== currentZoneName) {
      attachRiftsToScene(playerZone);
    }

    // 1. Timer countdown during calm phase
    if (cycleState === 'calm') {
      cycleTimer -= dt;
      if (cycleTimer <= 0) {
        cycleTimer = 0;
        // Check if any rifts remain unmended
        const unmendedCount = activeRifts.filter((r) => !r.mended).length;
        if (unmendedCount > 0) {
          triggerIncursion();
        } else {
          // If all were mended, reset for another calm hour
          onAllRiftsMended();
        }
      }
    }

    // 2. Animate rift meshes (spinning core, bobbing ring)
    activeRifts.forEach((r) => {
      if (r.mesh && r.mesh.visible) {
        const core = r.mesh.userData.core;
        const ring = r.mesh.userData.ring;
        if (core) {
          core.rotation.x += dt * 1.2;
          core.rotation.y += dt * 1.8;
        }
        if (ring) {
          ring.rotation.z += dt * 0.9;
          ring.position.y = Math.sin(elapsed * 2.8 + r.pos.x) * 0.12;
        }
      }
    });
  }

  // --------------------------------------------------------------------------
  // 6. DEVELOPER DEBUG API
  // --------------------------------------------------------------------------
  function fastForward(seconds = 900) {
    cycleTimer = Math.max(0, cycleTimer - seconds);
    notifyUpdate();
  }

  function rewind(seconds = 900) {
    cycleTimer = Math.min(CYCLE_DURATION, cycleTimer + seconds);
    notifyUpdate();
  }

  function setCountdown(seconds = 30) {
    cycleTimer = seconds;
    notifyUpdate();
  }

  function instaMendAll() {
    activeRifts.forEach((r) => mendRift(r.id));
    notifyUpdate();
  }

  function banishAllInvaders() {
    if (window.BlahajEnemies && typeof window.BlahajEnemies.banishAllInvaders === 'function') {
      window.BlahajEnemies.banishAllInvaders();
    }
  }

  function rerollRifts() {
    selectActiveRifts();
    notifyUpdate();
  }

  function notifyUpdate() {
    listeners.forEach((fn) => {
      try { fn(getState()); } catch (e) { console.error(e); }
    });
  }

  function getState() {
    const mendedCount = activeRifts.filter((r) => r.mended).length;
    return {
      state: cycleState,
      timer: Math.max(0, cycleTimer),
      totalDuration: CYCLE_DURATION,
      rifts: activeRifts.map((r) => ({
        id: r.id,
        locId: r.locId,
        name: r.name,
        desc: r.desc,
        zone: r.zone,
        pos: { ...r.pos },
        mended: r.mended
      })),
      mendedCount,
      totalRifts: activeRifts.length,
      invadersNeeded: activeInvadersNeeded,
      invadersBanished: invadersBanishedCount
    };
  }

  function getNearestRift(playerPos, currentZone = 'island') {
    const activeZone = (currentZone === 'overworld' || !currentZone) ? 'island' : currentZone;
    const zoneRifts = activeRifts.filter((r) => !r.mended && (r.zone === activeZone || (r.zone === 'island' && activeZone === 'island')));

    let nearest = null;
    let minD = Infinity;

    if (playerPos && zoneRifts.length > 0) {
      zoneRifts.forEach((r) => {
        const d = Math.hypot(r.pos.x - playerPos.x, r.pos.z - playerPos.z);
        if (d < minD) {
          minD = d;
          nearest = { ...r, dist: d };
        }
      });
    }

    const otherZoneCounts = {};
    activeRifts.forEach((r) => {
      if (!r.mended) {
        otherZoneCounts[r.zone] = (otherZoneCounts[r.zone] || 0) + 1;
      }
    });

    const mendedCount = activeRifts.filter((r) => r.mended).length;

    return {
      nearest,
      dist: nearest ? nearest.dist : null,
      hasZoneRifts: zoneRifts.length > 0,
      zoneUnmendedCount: zoneRifts.length,
      otherZoneCounts,
      mendedCount,
      totalRifts: activeRifts.length,
      cycleState
    };
  }

  function init(sceneRef) {
    if (sceneRef) {
      window.__THREE_SCENE__ = sceneRef;
    }
    selectActiveRifts();
  }

  return {
    init,
    update,
    onZoneChanged: attachRiftsToScene,
    mendRift,
    triggerIncursion,
    onInvaderExpelledToSea,
    getState,
    fastForward,
    rewind,
    setCountdown,
    instaMendAll,
    banishAllInvaders,
    rerollRifts,
    onStateChange: (fn) => listeners.push(fn),
    getActiveRiftsForZone: (zone) => activeRifts.filter((r) => r.zone === zone),
    getAllActiveRifts: () => activeRifts,
    getNearestRift,
    getSeamRifts: () => activeRifts.filter((r) => r.zone === currentZoneName).map((r) => r.mesh).filter(Boolean)
  };
})();
