// =============================================================================
// BLÅHAJ ISLAND - MODULAR INVENTORY, GATHERING & PICKUPS (PHASE 1)
// Dynamic 16-slot satchel, World Pickups (Guano & Sulfur), & Solomon's Bread Oven
// =============================================================================

window.BlahajInventory = (function () {
  'use strict';

  // 1. UNIFIED ITEM REGISTRY
  const ITEMS = {
    breb: {
      id: 'breb',
      name: 'Warm Breb Loaf',
      icon: '🥖',
      rarity: 'cozy',
      category: 'consumable',
      maxStack: 20,
      type: 'Consumable · Summons Birbs',
      desc: 'Golden freshly-baked loaves from Solomon\'s stone oven. Toss onto meadow grass with [B] to feed and gather plump round island Birbs.',
      stats: '+100% Birb Gathering Radius · Steaming Warmth',
      canUse: true,
      useAction: 'toss_breb',
      usePrompt: 'Toss Warm Breb [B] 🥖'
    },
    guano: {
      id: 'guano',
      name: 'Birb Guano',
      icon: '🪶',
      rarity: 'cozy',
      category: 'material',
      maxStack: 30,
      type: 'Alchemy Material · Explosive Nitrate',
      desc: 'White mineral-rich saltpeter deposits left behind by plump island Birbs after a satisfying loaf meal. Essential reactive base for Solomon\'s fireworks.',
      stats: 'High Nitrate Purity · Pyrotechnic Base',
      canUse: false
    },
    sulfur: {
      id: 'sulfur',
      name: 'Volcanic Sulfur Crystal',
      icon: '🟡',
      rarity: 'rare',
      category: 'material',
      maxStack: 20,
      type: 'Pyrotechnic Mineral · Caldera Deposit',
      desc: 'Vibrant yellow mineral crystals gathered from the steaming volcanic vents and black sand beaches. Provides explosive spark, crackle, and brilliant color.',
      stats: 'Caldera Thermal Charge · Pyrotechnic Fuel',
      canUse: false
    },
    tea: {
      id: 'tea',
      name: 'Earl Grey Infusion',
      icon: '🫖',
      rarity: 'rare',
      category: 'consumable',
      maxStack: 10,
      type: 'Sacred Brew · Restores Tea Comfort',
      desc: 'Solomon\'s sacred ceremonial tea steeped with sweet orange blossom and bergamot. Instantly fills the Tea Comfort meter to 100%.',
      stats: '+100% Tea Comfort · Grants Warmth Buff',
      canUse: true,
      useAction: 'sip_tea',
      usePrompt: 'Sip Sacred Tea (+5m Steaming Spirit) 🍵'
    },
    carrot_toy: {
      id: 'carrot_toy',
      name: 'Beach-Shorts Carrot Figurine',
      icon: '🥕',
      rarity: 'legendary',
      category: 'souvenir',
      maxStack: 1,
      type: 'Sacred Balcony Souvenir',
      desc: 'A rubber-clad carrot in floral boardshorts that tumbled off the high Volcano Balcony and bounced unharmed into the sea.',
      stats: '+15% Plush Bounce Height · Lucky Charm',
      canUse: false
    },
    hex_key: {
      id: 'hex_key',
      name: 'Sacred Hex Key M10',
      icon: '🔧',
      rarity: 'epic',
      category: 'relic',
      maxStack: 1,
      type: 'Architectural Instrument',
      desc: 'Hiram\'s indestructible brass hex key. Unlocks bridges, ramps, observation docks, and pocket portals across the archipelago.',
      stats: 'Unlocks Master Builder Mode [C] · Zero Decay',
      canUse: false
    },
    seam_needle: {
      id: 'seam_needle',
      name: 'Golden Seam Needle',
      icon: '🪡',
      rarity: 'epic',
      category: 'relic',
      maxStack: 1,
      type: 'Cosmic Relic · Seam Weaving',
      desc: 'Nimue\'s luminous silver-gold needle that knits reality back together. Glows brightly whenever a Great Seam rift is near.',
      stats: '+40% Seam Mend Radius · Night Illumination',
      canUse: false
    },
    star_lantern: {
      id: 'star_lantern',
      name: 'Between Star Lantern',
      icon: '🏮',
      rarity: 'epic',
      category: 'relic',
      maxStack: 1,
      type: 'Dimensional Beacon',
      desc: 'Hermes\'s eternal lantern. Burns with violet-amber starlight, revealing paths between Los Angeles and New Zealand shores.',
      stats: 'Portal Guide Beacon · Clears Interdimensional Fog',
      canUse: false
    },
    beach_ball: {
      id: 'beach_ball',
      name: 'Striped Beach Ball',
      icon: '🏐',
      rarity: 'cozy',
      category: 'toy',
      maxStack: 5,
      type: 'Physics Toy · Ocean Floater',
      desc: 'Buoyant inflatable beach ball. Bump it with your shark nose or boat bow to watch it launch over rolling swells!',
      stats: 'Elastic Collision Rating: 0.96 · Waterproof',
      canUse: false
    },
    obsidian: {
      id: 'obsidian',
      name: 'Volcanic Obsidian Pebble',
      icon: '🪨',
      rarity: 'rare',
      category: 'material',
      maxStack: 20,
      type: 'Trial Token & Mineral',
      desc: 'Smooth polished volcanic stone collected from the Rear Wharf caldera entrance. Radiates comforting thermal heat.',
      stats: '+20% Trap Resilience in Volcano Dungeons',
      canUse: false
    },
    party_favor: {
      id: 'party_favor',
      name: 'Birthday Party Cracker',
      icon: '🎉',
      rarity: 'cozy',
      category: 'consumable',
      maxStack: 10,
      type: 'Celebration Favor · Party Popper',
      desc: 'A festive golden foil cracker tied with ruby ribbon bows. Pop it to shower the area in colorful confetti, party horns, and cheer!',
      stats: '+20% Comfort · Rainbow Confetti Burst',
      canUse: true,
      useAction: 'pop_cracker',
      usePrompt: 'Pop Party Cracker 🎉'
    }
  };

  // 2. PLAYER INVENTORY ENGINE (16-SLOT LIVE SATCHEL)
  function createPlayerInventory() {
    const NUM_SLOTS = 16;
    const slots = new Array(NUM_SLOTS).fill(null);

    // Initial default satchel contents
    const defaultContents = [
      { id: 'breb', qty: 5 },
      { id: 'tea', qty: 3 },
      { id: 'carrot_toy', qty: 1 },
      { id: 'hex_key', qty: 1 },
      { id: 'seam_needle', qty: 1 },
      { id: 'star_lantern', qty: 1 },
      { id: 'beach_ball', qty: 2 },
      { id: 'obsidian', qty: 4 }
    ];

    defaultContents.forEach((item, idx) => {
      if (idx < NUM_SLOTS && ITEMS[item.id]) {
        slots[idx] = { id: item.id, qty: item.qty };
      }
    });

    function addItem(itemId, count = 1) {
      if (!ITEMS[itemId] || count <= 0) return 0;
      const def = ITEMS[itemId];
      let remaining = count;

      // 1. Try to merge into existing non-full stacks
      for (let i = 0; i < NUM_SLOTS; i++) {
        if (slots[i] && slots[i].id === itemId) {
          const space = def.maxStack - slots[i].qty;
          if (space > 0) {
            const toAdd = Math.min(space, remaining);
            slots[i].qty += toAdd;
            remaining -= toAdd;
            if (remaining <= 0) return count;
          }
        }
      }

      // 2. Fill empty slots
      for (let i = 0; i < NUM_SLOTS; i++) {
        if (!slots[i]) {
          const toAdd = Math.min(def.maxStack, remaining);
          slots[i] = { id: itemId, qty: toAdd };
          remaining -= toAdd;
          if (remaining <= 0) return count;
        }
      }

      return count - remaining; // Number of items successfully added
    }

    function removeItem(itemId, count = 1) {
      if (!hasItem(itemId, count)) return false;
      let remaining = count;

      // Remove from last slots first
      for (let i = NUM_SLOTS - 1; i >= 0; i--) {
        if (slots[i] && slots[i].id === itemId) {
          if (slots[i].qty > remaining) {
            slots[i].qty -= remaining;
            remaining = 0;
            break;
          } else {
            remaining -= slots[i].qty;
            slots[i] = null;
            if (remaining <= 0) break;
          }
        }
      }
      return true;
    }

    function getItemCount(itemId) {
      let total = 0;
      for (let i = 0; i < NUM_SLOTS; i++) {
        if (slots[i] && slots[i].id === itemId) {
          total += slots[i].qty;
        }
      }
      return total;
    }

    function hasItem(itemId, count = 1) {
      return getItemCount(itemId) >= count;
    }

    function getSlot(idx) {
      if (idx < 0 || idx >= NUM_SLOTS || !slots[idx]) return null;
      const def = ITEMS[slots[idx].id];
      if (!def) return null;
      return {
        slot: idx,
        id: slots[idx].id,
        qty: slots[idx].qty,
        ...def
      };
    }

    function getUsedSlotCount() {
      return slots.filter(Boolean).length;
    }

    return {
      slots,
      numSlots: NUM_SLOTS,
      addItem,
      removeItem,
      getItemCount,
      hasItem,
      getSlot,
      getUsedSlotCount
    };
  }

  // 3. SOLOMON'S STONE BREAD OVEN (3D MESH & INTERACTION)
  // Location: Heartland Plaza near the Sacred Tea House (x: -8.5, z: 14.5)
  function createSolomonBreadOven() {
    const ovenGroup = new THREE.Group();
    ovenGroup.position.set(-8.5, 0, 14.5);
    ovenGroup.rotation.y = Math.PI * 0.25; // Angles warmly towards the plaza path

    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.85 });
    const clayMat = new THREE.MeshStandardMaterial({ color: 0x9a3412, roughness: 0.65 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.45 });
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5, metalness: 0.6 });
    const emberMat = new THREE.MeshBasicMaterial({ color: 0xffedd5 });

    // 1. Cobblestone Base Plinth
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.75, 2.4), stoneMat);
    plinth.position.y = 0.375;
    ovenGroup.add(plinth);

    // 2. Terracotta Clay Dome Oven
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(1.05, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.5),
      clayMat
    );
    dome.position.y = 0.75;
    dome.scale.set(1.0, 0.9, 1.0);
    ovenGroup.add(dome);

    // 3. Arched Firebox Mouth
    const mouthFrame = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.08, 8, 16, Math.PI), stoneMat);
    mouthFrame.position.set(0, 1.05, 0.95);
    ovenGroup.add(mouthFrame);

    const mouthLining = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.35, 16, 1, true), clayMat);
    mouthLining.rotation.x = Math.PI / 2;
    mouthLining.position.set(0, 1.05, 0.80);
    ovenGroup.add(mouthLining);

    // Glowing Embers inside firebox
    const embers = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.08, 0.55), emberMat);
    embers.position.set(0, 0.80, 0.45);
    ovenGroup.add(embers);

    const ovenLight = new THREE.PointLight(0xff6600, 1.4, 5.5, 1.5);
    ovenLight.position.set(0, 1.05, 0.65);
    ovenGroup.add(ovenLight);

    // 4. Stone Chimney with Chimney Pot
    const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.4, 0.45), stoneMat);
    chimney.position.set(0, 2.05, -0.45);
    ovenGroup.add(chimney);

    const chimneyCap = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.22, 0.25, 12), clayMat);
    chimneyCap.position.set(0, 2.85, -0.45);
    ovenGroup.add(chimneyCap);

    // 5. Wooden Prep Table & Fresh Bread Loaves
    const prepBench = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.65, 0.65), woodMat);
    prepBench.position.set(1.5, 0.325, 0.3);
    ovenGroup.add(prepBench);

    // 3 Golden Loaves resting on prep bench
    const breadMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.85 });
    [-0.32, 0.0, 0.32].forEach((bx) => {
      const loaf = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), breadMat);
      loaf.scale.set(1.4, 0.85, 0.95);
      loaf.position.set(1.5 + bx, 0.72, 0.3);
      ovenGroup.add(loaf);
    });

    // 6. Wooden Baker's Peel
    const peelHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.8, 8), woodMat);
    peelHandle.rotation.x = Math.PI * 0.18;
    peelHandle.position.set(-1.25, 0.95, 0.5);
    ovenGroup.add(peelHandle);

    const peelBlade = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.02, 0.35), woodMat);
    peelBlade.position.set(-1.25, 0.20, 1.25);
    ovenGroup.add(peelBlade);

    // Smoke particles array
    const smokeParticles = [];
    for (let p = 0; p < 4; p++) {
      const sMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.15, 6, 6),
        new THREE.MeshBasicMaterial({ color: 0xf1f5f9, transparent: true, opacity: 0.3 })
      );
      sMesh.position.set(0, 2.95 + p * 0.35, -0.45);
      ovenGroup.add(sMesh);
      smokeParticles.push({
        mesh: sMesh,
        baseY: 2.95 + p * 0.35,
        phase: p * 1.2
      });
    }

    return {
      group: ovenGroup,
      ovenLight,
      smokeParticles,
      worldPos: { x: -8.5, y: 0.5, z: 14.5 }
    };
  }

  // 4. WORLD PICKUP SYSTEM (GUANO & SULFUR CRYSTALS)
  function createWorldPickupManager(scene) {
    const activePickups = [];

    // Predefined spawn nodes across the archipelago
    const STATIC_NODES = [
      // Birb Guano around Heartland Meadow & Roosts
      { id: 'guano_1', type: 'guano', pos: { x: -6.5, y: 0.15, z: 28.0 } },
      { id: 'guano_2', type: 'guano', pos: { x: 14.0, y: 0.15, z: 32.5 } },
      { id: 'guano_3', type: 'guano', pos: { x: -18.5, y: 0.15, z: 22.0 } },
      { id: 'guano_4', type: 'guano', pos: { x: 9.5, y: 0.15, z: 42.0 } },
      { id: 'guano_5', type: 'guano', pos: { x: 38.0, y: 0.25, z: -46.0 } }, // Lighthouse cliff ledge

      // Volcanic Sulfur Crystals on Rear Volcano Wharf & Caldera Beach
      { id: 'sulfur_1', type: 'sulfur', pos: { x: -26.0, y: 0.2, z: -178.0 } },
      { id: 'sulfur_2', type: 'sulfur', pos: { x: -32.5, y: 0.2, z: -188.0 } },
      { id: 'sulfur_3', type: 'sulfur', pos: { x: -21.0, y: 0.2, z: -198.0 } },
      { id: 'sulfur_4', type: 'sulfur', pos: { x: -34.0, y: 0.2, z: -208.0 } }
    ];

    function createGuanoMesh() {
      const g = new THREE.Group();

      // White mineral splash splash on ground
      const splashMat = new THREE.MeshStandardMaterial({
        color: 0xf8fafc,
        roughness: 0.7,
        metalness: 0.1
      });
      const splash = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.44, 0.04, 12), splashMat);
      splash.position.y = 0.02;
      g.add(splash);

      // Central mineral crust
      const crust = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), splashMat);
      crust.scale.set(1.3, 0.45, 1.3);
      crust.position.y = 0.06;
      g.add(crust);

      // Floating feather beacon indicator
      const featherMat = new THREE.MeshStandardMaterial({
        color: 0x60a5fa,
        roughness: 0.4
      });
      const feather = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.38, 6), featherMat);
      feather.rotation.z = Math.PI * 0.15;
      feather.position.y = 0.48;
      g.add(feather);

      // Beacon sparkle glow
      const spark = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.06, 0),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
      );
      spark.position.y = 0.72;
      g.add(spark);

      return g;
    }

    function createSulfurMesh() {
      const g = new THREE.Group();

      // Rock base
      const rockMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.9 });
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.24, 0), rockMat);
      rock.position.y = 0.12;
      rock.scale.set(1.4, 0.6, 1.2);
      g.add(rock);

      // Crystalline Sulfur Spikes (Bright Yellow, Faceted)
      const sulfurMat = new THREE.MeshStandardMaterial({
        color: 0xfacc15,
        emissive: 0xca8a04,
        emissiveIntensity: 0.35,
        roughness: 0.25,
        metalness: 0.2
      });

      const spikePositions = [
        { x: -0.08, z: -0.06, h: 0.45, r: 0.12, rotX: 0.15, rotZ: -0.2 },
        { x: 0.09, z: -0.04, h: 0.52, r: 0.11, rotX: -0.1, rotZ: 0.25 },
        { x: 0.0, z: 0.10, h: 0.38, r: 0.10, rotX: 0.2, rotZ: 0.0 }
      ];

      spikePositions.forEach((sp) => {
        const spike = new THREE.Mesh(new THREE.ConeGeometry(sp.r, sp.h, 5), sulfurMat);
        spike.position.set(sp.x, sp.h * 0.5 + 0.08, sp.z);
        spike.rotation.set(sp.rotX, 0, sp.rotZ);
        g.add(spike);
      });

      // Faint thermal glow point light
      const glow = new THREE.PointLight(0xfef08a, 0.75, 2.5, 1.5);
      glow.position.y = 0.45;
      g.add(glow);

      return g;
    }

    function spawnPickup(type, pos, id = null) {
      if (!scene) return null;
      const mesh = (type === 'guano') ? createGuanoMesh() : createSulfurMesh();
      mesh.position.set(pos.x, pos.y, pos.z);
      scene.add(mesh);

      const pickupObj = {
        id: id || `${type}_dyn_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        type,
        mesh,
        pos: { ...pos },
        collected: false,
        respawnTimer: 0,
        isStatic: Boolean(id)
      };

      activePickups.push(pickupObj);
      return pickupObj;
    }

    function initStaticNodes() {
      STATIC_NODES.forEach((node) => {
        spawnPickup(node.type, node.pos, node.id);
      });
    }

    function update(dt, elapsed) {
      activePickups.forEach((p) => {
        if (p.collected) {
          if (p.isStatic) {
            p.respawnTimer -= dt;
            if (p.respawnTimer <= 0) {
              p.collected = false;
              p.mesh.visible = true;
              p.mesh.scale.set(1, 1, 1);
            }
          }
          return;
        }

        // Gentle hover bobbing and rotation for indicators
        p.mesh.rotation.y = elapsed * 0.85;
      });
    }

    function getNearbyPickups(playerPos, maxDist = 2.8) {
      const result = [];
      activePickups.forEach((p) => {
        if (p.collected || !p.mesh.visible) return;
        const dist = Math.hypot(playerPos.x - p.pos.x, playerPos.z - p.pos.z);
        if (dist <= maxDist) {
          result.push({
            pickup: p,
            dist,
            kind: p.type === 'guano' ? 'pickup_guano' : 'pickup_sulfur',
            prompt: p.type === 'guano'
              ? 'Gather Birb Guano [E] 🪶'
              : 'Mine Volcanic Sulfur Crystal [E] 🟡'
          });
        }
      });
      return result.sort((a, b) => a.dist - b.dist);
    }

    function collect(pickup) {
      if (!pickup || pickup.collected) return false;
      pickup.collected = true;
      pickup.mesh.visible = false;
      pickup.respawnTimer = 40.0; // 40-second respawn for static nodes
      return true;
    }

    return {
      initStaticNodes,
      spawnPickup,
      update,
      getNearbyPickups,
      collect,
      getPickups: () => activePickups
    };
  }

  return {
    ITEMS,
    createPlayerInventory,
    createSolomonBreadOven,
    createWorldPickupManager
  };
})();
