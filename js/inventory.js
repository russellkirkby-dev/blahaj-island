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
      canHold: true,
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
      canHold: true,
      useAction: 'sip_tea',
      usePrompt: 'Sip Sacred Tea (+5m Steaming Spirit) 🍵'
    },
    margarita: {
      id: 'margarita',
      name: 'Frosted Lagoon Margarita',
      icon: '🍸',
      rarity: 'rare',
      category: 'beverage',
      maxStack: 10,
      type: 'Tropical Cocktail · Salted Rim',
      desc: 'Chilled seafoam lime margarita served in a salt-rimmed frosted glass with a fresh lime wheel and turquoise paper umbrella. Refreshingly tart and undeniably stylish!',
      stats: '+15% Agility · Tropical Toast · Hold in Fin',
      canUse: true,
      canHold: true,
      useAction: 'sip_margarita',
      usePrompt: 'Enjoy Frosted Margarita (45s Savoring) 🍸'
    },
    tropical_cocktail: {
      id: 'tropical_cocktail',
      name: 'Caldera Sunset Cocktail',
      icon: '🍹',
      rarity: 'rare',
      category: 'beverage',
      maxStack: 10,
      type: 'Layered Cocktail · Starlight Garnish',
      desc: 'A glowing sunset cocktail blending passionfruit, blood orange liqueur, and sparkling starlight in a tall hurricane glass with a cherry and swirled straw.',
      stats: '+100% Warmth · Island Radiance · Hold in Fin',
      canUse: true,
      canHold: true,
      useAction: 'sip_cocktail',
      usePrompt: 'Sip Sunset Cocktail (45s Savoring) 🍹'
    },
    celestial_boba: {
      id: 'celestial_boba',
      name: 'Celestial Starlight Boba',
      icon: '🧋',
      rarity: 'epic',
      category: 'beverage',
      maxStack: 10,
      type: 'Café Specialty · Chewy Pearls',
      desc: 'Golden roasted milk tea brimming with bouncy spherical starlight pearls and served with a chunky pastel straw from the Spherical Foods Café.',
      stats: '+20% Comfort · Bouncy Step · Hold in Fin',
      canUse: true,
      canHold: true,
      useAction: 'sip_boba',
      usePrompt: 'Drink Starlight Boba (45s Savoring) 🧋'
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
      canUse: false,
      canHold: true
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
      canUse: false,
      canHold: true
    },
    retired_tag: {
      id: 'retired_tag',
      name: 'Retired Spawning-Pit Tag',
      icon: '🏷️',
      rarity: 'legendary',
      category: 'relic',
      maxStack: 1,
      type: 'Sacred Liberation Souvenir · Art. 303.735.88',
      desc: 'Your original white IKEA factory barcode tag snipped by the Order of the Sacred Scissors during the Rite of Detagging. Proof that you are no longer a numbered commodity from Erf, but a Named Shark of Blåhaj Island.',
      stats: '+100% Identity Coherence · Unlocks Custom Builder Privileges',
      canUse: false,
      canHold: true
    },
    ingvar_tape: {
      id: 'ingvar_tape',
      name: 'Ingvar\'s Brass Measuring Tape',
      icon: '📏',
      rarity: 'epic',
      category: 'tools',
      maxStack: 1,
      type: 'Sacred Architectural Ribbon · Spawning Pits of Erf',
      desc: 'Sacred paper-and-brass measuring ribbon recovered from the IKEA Spawning Pits on Erf. Used by Hiram and Detagged Builders to measure geological harmony and snap flat-pack modular structures.',
      stats: '+25% Snap Precision · Flat-Pack Alignment',
      canUse: false,
      canHold: true
    },
    sacred_scissors: {
      id: 'sacred_scissors',
      name: 'Golden Scissors of the Order',
      icon: '✂️',
      rarity: 'epic',
      category: 'relic',
      maxStack: 1,
      type: 'Ceremonial Relic · Order of the Sacred Scissors',
      desc: 'Gleaming ceremonial shears blessed by the Order of the Sacred Scissors: "A Tag Removed · A Name Received · A Shark Reborn."',
      stats: 'Rite of Detagging Emblem · +15% Plush Pride',
      canUse: false,
      canHold: true
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
      canUse: false,
      canHold: true
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
      canHold: true,
      useAction: 'pop_cracker',
      usePrompt: 'Pop Party Cracker 🎉'
    },
    birb_down: {
      id: 'birb_down',
      name: 'Soft Birb Down',
      icon: '🪶',
      rarity: 'cozy',
      category: 'material',
      maxStack: 30,
      type: 'Fiber · Birb Fluff',
      desc: 'Fluffy cloud-soft down gently gathered from a sleeping island birb resting in a food coma. Nimue weaves this into slow-burning fuses and festive ribbons.',
      stats: 'Feather-Light Fiber · Nimue Crafting',
      canUse: false
    },
    plush_fluff: {
      id: 'plush_fluff',
      name: 'Plush Coat Fluff',
      icon: '🧶',
      rarity: 'cozy',
      category: 'material',
      maxStack: 30,
      type: 'Fiber · Groomed Plush',
      desc: 'Soft felt fibers gently combed from a shark\'s coat during grooming. Used by Nimue for cozy felt accessories, ribbons, and star fuses.',
      stats: 'Felt Fiber · Nimue Weaving',
      canUse: false
    },
    driftwood: {
      id: 'driftwood',
      name: 'Beach Driftwood Log',
      icon: '🪵',
      rarity: 'cozy',
      category: 'material',
      maxStack: 20,
      type: 'Hardwood Timber · Hiram Crafting',
      desc: 'Dense, salt-cured ocean driftwood washed ashore on the outer beaches. Hiram can lathe and carve this into pyrotechnic mortars and furniture.',
      stats: 'Ocean-Toughened Wood · Hiram Crafting',
      canUse: false
    },
    blueprints: {
      id: 'blueprints',
      name: 'Master Mortar Blueprints',
      icon: '📐',
      rarity: 'epic',
      category: 'schematic',
      maxStack: 1,
      type: 'Architectural Blueprint · Hiram',
      desc: 'Hand-drafted isometric schematics drawn by Hiram detailing the heavy brass-ringed launch tube needed for aerial fireworks.',
      stats: 'Unlocks Mortar Crafting at Hiram',
      canUse: false
    },
    binoculars: {
      id: 'binoculars',
      name: 'Brass Marine Binoculars',
      icon: '🔭',
      rarity: 'rare',
      category: 'tools',
      maxStack: 1,
      type: 'Nautical Scope · 4.5x Zoom',
      desc: 'Heavy dual-barrel maritime binoculars with polished brass and navy casing. Press [T] or [F] to scan the horizon through first-person lenses with live compass & landmark rangefinder.',
      stats: '4.5x Optical Zoom · Dynamic Landmark Rangefinder',
      canUse: true,
      canHold: true
    },
    ancient_pages: {
      id: 'ancient_pages',
      name: 'Tattered Portal Log',
      icon: '📜',
      rarity: 'rare',
      category: 'lore',
      maxStack: 10,
      type: 'Abstract Relic · Hermes Lore',
      desc: 'Faded parchment pages recording coordinates across the Between Realm and ancient tide tables. Hermes cherishes these historical records.',
      stats: 'Ancient Cartography · Hermes Memory',
      canUse: false
    },
    memory_crystal: {
      id: 'memory_crystal',
      name: 'Crystallized Memory',
      icon: '🔮',
      rarity: 'epic',
      category: 'memory',
      maxStack: 10,
      type: 'Abstract Relic · Starlit Thought',
      desc: 'A softly glowing violet-blue prism containing shared memories between distant shores. Hermes keeps these safe.',
      stats: 'Starlit Resonator · Clears Interdimensional Fog',
      canUse: false
    },
    brimstone_core: {
      id: 'brimstone_core',
      name: 'Prismatic Brimstone Heart',
      icon: '💎',
      rarity: 'legendary',
      category: 'rare_mineral',
      maxStack: 10,
      type: 'Trial Reward · Caldera Heart',
      desc: 'High-energy crystalline brimstone harvested deep within the Sacred Volcano Gatehall trial. Produces dazzling multi-tiered firework bursts.',
      stats: 'High Pyrotechnic Yield · Extreme Thermal Charge',
      canUse: false
    },
    pure_obsidian: {
      id: 'pure_obsidian',
      name: 'Pure Obsidian Shard',
      icon: '🗡️',
      rarity: 'epic',
      category: 'mineral',
      maxStack: 20,
      type: 'Caldera Razor Glass',
      desc: 'Flawless black volcanic glass mined near the lava falls. Hiram uses its razor edge to carve precision woodwork and mortars.',
      stats: 'Vitreous Cutting Edge · Trial Resilience',
      canUse: false
    },
    star_powder: {
      id: 'star_powder',
      name: 'Pyrotechnic Star Powder',
      icon: '🎆',
      rarity: 'rare',
      category: 'pyrotechnic',
      maxStack: 20,
      type: 'Refined Alchemy · Solomon Roasted',
      desc: 'Precision blend of Birb Guano saltpeter and Volcanic Sulfur roasted in Solomon\'s bread oven. The beating reactive heart of fireworks.',
      stats: 'Rapid Deflagration · Rainbow Color Formulation',
      canUse: false
    },
    mortar_tube: {
      id: 'mortar_tube',
      name: 'Turned Launch Mortar Shell',
      icon: '🪵',
      rarity: 'rare',
      category: 'hardware',
      maxStack: 5,
      type: 'Carved Hardware · Hiram Turnery',
      desc: 'Sturdy hollowed hardwood mortar casing turned and banded with brass rings by Hiram. Directs rockets high into the night sky.',
      stats: 'Reinforced Bore · 500ft Aerial Ascent',
      canUse: false
    },
    braided_fuse: {
      id: 'braided_fuse',
      name: 'Twisted Star Fuse',
      icon: '🧵',
      rarity: 'rare',
      category: 'pyrotechnic',
      maxStack: 20,
      type: 'Woven Fiber · Nimue Weave',
      desc: 'Waxed ribbon braided from soft Birb Down and plush coat threads by Nimue. Burns with a steady golden hiss and festive sparks.',
      stats: 'Reliable 4-Second Delayed Ignition',
      canUse: false
    },
    firework_rocket: {
      id: 'firework_rocket',
      name: 'Helen\'s Birthday Star Rocket',
      icon: '🚀',
      rarity: 'legendary',
      category: 'firework',
      maxStack: 10,
      type: 'Grand Pyrotechnic · Birthday Edition',
      desc: 'Lavish celebration rocket combining Solomon\'s star powder, Hiram\'s mortar shell, and Nimue\'s braided fuse. Detonates in radiant heart constellations and golden willows!',
      stats: 'Epic Island Spectacle · Helen\'s Birthday Week',
      canUse: true,
      useAction: 'launch_firework',
      usePrompt: 'Launch Helen\'s Birthday Rocket! 🎆'
    },
    flatpack_crate: {
      id: 'flatpack_crate',
      name: 'SKÄRHAJ Flat-Pack Kit (ART. 904.112.77)',
      icon: '📦',
      rarity: 'epic',
      category: 'architectural',
      maxStack: 20,
      type: 'Erf Spawning-Pit Heist Loot · Snap-Build Kit',
      desc: 'Sealed corrugated flat-pack furniture carton liberated from Aisle 14 of the IKEA Spawning Pits on Erf. Packed with Scandinavian birch panels, brass cam-lock dowels, and wordless shark assembly diagrams!',
      stats: 'Unlocks SKÄRHAJ Modular Snap-Building [C] · Unpacks into +3 Builder Supplies',
      canUse: true,
      canHold: true
    },
    kottbullar_feast: {
      id: 'kottbullar_feast',
      name: 'Midnight Spawning-Pit Köttbullar',
      icon: '🧆',
      rarity: 'rare',
      category: 'food',
      maxStack: 10,
      type: 'Spherical Erf Bistro Delicacy · Restores Comfort',
      desc: 'Piping-hot spherical Swedish meatballs glazed with tart lingonberries and velvety cream sauce, smuggled out of the Midnight Erf Food Court during a Spawning-Pit Raid.',
      stats: '+100% Stuffing Coherence & Tea Comfort · Approved by Spherical Foods',
      canUse: true,
      canHold: true
    }
  };

  // 2. PLAYER INVENTORY ENGINE (16-SLOT LIVE SATCHEL)
  function createPlayerInventory() {
    const NUM_SLOTS = 24;
    const slots = new Array(NUM_SLOTS).fill(null);

    // Initial default satchel contents
    const defaultContents = [
      { id: 'breb', qty: 5 },
      { id: 'tea', qty: 3 },
      { id: 'margarita', qty: 2 },
      { id: 'tropical_cocktail', qty: 2 },
      { id: 'celestial_boba', qty: 2 },
      { id: 'carrot_toy', qty: 1 },
      { id: 'hex_key', qty: 1 },
      { id: 'seam_needle', qty: 1 },
      { id: 'star_lantern', qty: 1 },
      { id: 'beach_ball', qty: 2 },
      { id: 'obsidian', qty: 4 },
      { id: 'binoculars', qty: 1 }
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

    function getSlots() {
      const list = [];
      for (let i = 0; i < NUM_SLOTS; i++) {
        list.push(getSlot(i));
      }
      return list;
    }

    function serialize() {
      return slots.map((s) => (s && s.id && s.qty > 0 ? { id: s.id, qty: s.qty } : null));
    }

    function restore(savedSlots) {
      if (!Array.isArray(savedSlots)) return false;
      for (let i = 0; i < NUM_SLOTS; i++) {
        const item = savedSlots[i];
        if (item && item.id && ITEMS[item.id] && item.qty > 0) {
          slots[i] = { id: item.id, qty: Math.min(item.qty, ITEMS[item.id].maxStack || 99) };
        } else {
          slots[i] = null;
        }
      }
      return true;
    }

    return {
      slots,
      numSlots: NUM_SLOTS,
      addItem,
      removeItem,
      getItemCount,
      getCount: getItemCount,
      hasItem,
      getSlot,
      getSlots,
      getUsedSlotCount,
      serialize,
      restore
    };
  }

  // 3. SOLOMON'S STONE BREAD OVEN (3D MESH & INTERACTION)
  // Location: Heartland Meadow Sanctuary of the Birbs (x: -12.5, z: 16.0)
  function createSolomonBreadOven() {
    const ovenGroup = new THREE.Group();
    const ovenX = -12.5;
    const ovenZ = 16.0;
    const thCenter = (window.BlahajWorld && typeof window.BlahajWorld.getGroundAndStructureHeight === 'function')
      ? window.BlahajWorld.getGroundAndStructureHeight(ovenX, ovenZ)
      : 5.64;
    const thRear = (window.BlahajWorld && typeof window.BlahajWorld.getGroundAndStructureHeight === 'function')
      ? window.BlahajWorld.getGroundAndStructureHeight(ovenX, ovenZ + 2.4)
      : 6.25;
    const ovenY = Math.max(thCenter, thRear) + 0.25;
    ovenGroup.position.set(ovenX, ovenY, ovenZ);
    ovenGroup.rotation.y = -Math.PI * 0.75; // Faces openly towards the meadow arrival clearing & path!
    ovenGroup.scale.set(1.22, 1.22, 1.22); // Grand 1.22x scale

    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.88 });
    const darkStoneMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.92 });
    const brickMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.75 });
    const clayMat = new THREE.MeshStandardMaterial({ color: 0xc2410c, roughness: 0.65 });
    const timberMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.55 });
    const darkWoodMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.6 });
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.45, metalness: 0.75 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.3, metalness: 0.6 });
    const breadMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.85 });
    const flourMat = new THREE.MeshStandardMaterial({ color: 0xfef9c3, roughness: 0.95 });

    // 1. Broad Cobblestone Foundation Terrace (5.2m wide x 4.6m deep x 1.8m deep foundation)
    // Deep skirt geometry anchors deeply into the meadow hillside so it never looks sunken
    const basePlinth = new THREE.Mesh(new THREE.BoxGeometry(5.2, 1.8, 4.6), stoneMat);
    basePlinth.position.set(0, 0.45, 0);
    ovenGroup.add(basePlinth);

    // Front stone terrace step
    const frontStep = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.45, 1.0), darkStoneMat);
    frontStep.position.set(0, 0.225, 2.3);
    ovenGroup.add(frontStep);

    // 4 Corner Masonry Pillars
    [-2.25, 2.25].forEach((px) => {
      [-1.85, 1.85].forEach((pz) => {
        const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.2, 0.55), darkStoneMat);
        pillar.position.set(px, 0.6, pz);
        ovenGroup.add(pillar);
      });
    });

    // 2. Terracotta Clay Dome Oven (Wide 3.3m diameter dome)
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(1.65, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.5),
      clayMat
    );
    dome.position.set(0, 0.9, -0.2);
    dome.scale.set(1.15, 0.95, 1.1);
    ovenGroup.add(dome);

    // Lower brick course collar around dome base
    const domeBaseCollar = new THREE.Mesh(
      new THREE.CylinderGeometry(1.9, 1.95, 0.45, 24),
      brickMat
    );
    domeBaseCollar.position.set(0, 1.1, -0.2);
    ovenGroup.add(domeBaseCollar);

    // 3. Arched Brick Firebox Mouth
    const mouthArch = new THREE.Mesh(
      new THREE.TorusGeometry(0.68, 0.16, 12, 24, Math.PI),
      brickMat
    );
    mouthArch.position.set(0, 1.35, 1.15);
    ovenGroup.add(mouthArch);

    const mouthLining = new THREE.Mesh(
      new THREE.CylinderGeometry(0.62, 0.62, 0.75, 18, 1, true),
      brickMat
    );
    mouthLining.rotation.x = Math.PI / 2;
    mouthLining.position.set(0, 1.35, 0.85);
    ovenGroup.add(mouthLining);

    // Roaring Embers & Inner Hearth Flames
    const emberBed = new THREE.Mesh(
      new THREE.BoxGeometry(0.95, 0.18, 0.95),
      new THREE.MeshBasicMaterial({ color: 0xffedd5 })
    );
    emberBed.position.set(0, 0.98, 0.55);
    ovenGroup.add(emberBed);

    // Animated / glowing flame cones inside the mouth
    [-0.22, 0, 0.22].forEach((fx, fi) => {
      const flame = new THREE.Mesh(
        new THREE.ConeGeometry(0.18, 0.45 + fi * 0.08, 8),
        new THREE.MeshBasicMaterial({ color: fi === 1 ? 0xffaa00 : 0xff4400 })
      );
      flame.position.set(fx, 1.18, 0.55);
      ovenGroup.add(flame);
    });

    // Powerful warm hearth light illuminating the meadow
    const ovenLight = new THREE.PointLight(0xff7700, 3.8, 15.0, 1.2);
    ovenLight.position.set(0, 1.45, 1.1);
    ovenGroup.add(ovenLight);

    // 4. Majestic Tall Stone Masonry Chimney (5.2m tall)
    const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.85, 3.8, 0.85), stoneMat);
    chimney.position.set(0, 3.2, -0.75);
    ovenGroup.add(chimney);

    const chimneyCorbel = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.25, 1.05), darkStoneMat);
    chimneyCorbel.position.set(0, 5.0, -0.75);
    ovenGroup.add(chimneyCorbel);

    const chimneyPot = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.32, 0.65, 16), clayMat);
    chimneyPot.position.set(0, 5.4, -0.75);
    ovenGroup.add(chimneyPot);

    // 5. Rustic Timber Pergola Roof Pavilion (Cedar Beams + Roof Rafters)
    [-2.1, 2.1].forEach((px) => {
      [-1.7, 1.7].forEach((pz) => {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.10, 3.8, 8), timberMat);
        post.position.set(px, 1.9, pz);
        ovenGroup.add(post);
      });
      // Side longitudinal beams
      const sideBeam = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.22, 3.9), timberMat);
      sideBeam.position.set(px, 3.75, 0);
      ovenGroup.add(sideBeam);
    });

    // Cross rafters across the top
    for (let rz = -1.6; rz <= 1.6; rz += 0.55) {
      const rafter = new THREE.Mesh(new THREE.BoxGeometry(4.7, 0.12, 0.12), timberMat);
      rafter.position.set(0, 3.88, rz);
      ovenGroup.add(rafter);
    }

    // 2 Warm Hanging Iron Lanterns dangling from pergola
    [-1.6, 1.6].forEach((lx) => {
      const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.65, 6), ironMat);
      chain.position.set(lx, 3.45, 1.4);
      ovenGroup.add(chain);

      const lanternBody = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.32, 0.24), ironMat);
      lanternBody.position.set(lx, 3.0, 1.4);
      ovenGroup.add(lanternBody);

      const lanternCore = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.24, 0.18), new THREE.MeshBasicMaterial({ color: 0xffedd5 }));
      lanternCore.position.set(lx, 3.0, 1.4);
      ovenGroup.add(lanternCore);

      const lanternLight = new THREE.PointLight(0xffedd5, 1.4, 8.0, 1.5);
      lanternLight.position.set(lx, 3.0, 1.4);
      ovenGroup.add(lanternLight);
    });

    // 6. Prominent Carved Front Wooden Signboard (Mounted across front pergola rafters)
    const signBoard = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.62, 0.10), darkWoodMat);
    signBoard.position.set(0, 3.42, 1.75);
    ovenGroup.add(signBoard);

    const signTrim = new THREE.Mesh(new THREE.BoxGeometry(3.72, 0.72, 0.08), goldMat);
    signTrim.position.set(0, 3.42, 1.74);
    ovenGroup.add(signTrim);

    // Signboard bread loaf emblem
    const signBread = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), breadMat);
    signBread.scale.set(1.4, 0.8, 0.9);
    signBread.position.set(0, 3.42, 1.83);
    ovenGroup.add(signBread);

    // 7. Prep Benches Loaded with Breb Loaves, Flour Sacks & Baker's Peels
    // Left Prep Table (Golden Loaves)
    const leftBench = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.85, 0.75), timberMat);
    leftBench.position.set(1.85, 0.9 + 0.425, 0.5);
    ovenGroup.add(leftBench);

    // 4 Fresh Golden Breb Loaves on Left Bench
    [-0.5, -0.15, 0.2, 0.5].forEach((bx, bi) => {
      const loaf = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 10), breadMat);
      loaf.scale.set(1.35, 0.82, 0.95);
      loaf.position.set(1.85 + bx * 0.7, 0.9 + 0.85 + 0.10, 0.5 + (bi % 2 ? 0.08 : -0.08));
      loaf.rotation.y = bi * 0.45;
      ovenGroup.add(loaf);
    });

    // Right Prep Table (Flour Barrels & Dough Bowls)
    const rightBench = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.85, 0.75), timberMat);
    rightBench.position.set(-1.85, 0.9 + 0.425, 0.5);
    ovenGroup.add(rightBench);

    // Rustic Flour Barrel on Right Bench
    const flourBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.22, 0.55, 14), darkWoodMat);
    flourBarrel.position.set(-1.85, 0.9 + 0.85 + 0.275, 0.5);
    ovenGroup.add(flourBarrel);

    const flourTop = new THREE.Mesh(new THREE.CircleGeometry(0.22, 14), flourMat);
    flourTop.rotation.x = -Math.PI / 2;
    flourTop.position.set(-1.85, 0.9 + 0.85 + 0.555, 0.5);
    ovenGroup.add(flourTop);

    // Long Wooden Baker's Peel resting against hearth
    const peelHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 2.6, 8), timberMat);
    peelHandle.rotation.x = Math.PI * 0.22;
    peelHandle.rotation.z = Math.PI * 0.08;
    peelHandle.position.set(-1.15, 1.5, 1.4);
    ovenGroup.add(peelHandle);

    const peelBlade = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.03, 0.48), timberMat);
    peelBlade.position.set(-1.3, 0.45, 2.2);
    peelBlade.rotation.x = Math.PI * 0.22;
    ovenGroup.add(peelBlade);

    // 8. Glowing Golden Ground Hearth Beacon Ring (High-contrast beacon visible across the meadow)
    const hearthRing = new THREE.Mesh(
      new THREE.RingGeometry(2.4, 2.9, 32),
      new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.75, side: THREE.DoubleSide })
    );
    hearthRing.rotation.x = -Math.PI / 2;
    hearthRing.position.set(0, 0.04, 0);
    ovenGroup.add(hearthRing);

    // 9. Majestic Billowing Smoke Plume (12 rising puffs drifting up to 18m)
    const smokeParticles = [];
    for (let p = 0; p < 12; p++) {
      const radius = 0.26 + p * 0.12;
      const sMesh = new THREE.Mesh(
        new THREE.SphereGeometry(radius, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xffedd5, transparent: true, opacity: Math.max(0.12, 0.48 - p * 0.03) })
      );
      const py = 5.6 + p * 1.15;
      sMesh.position.set(0, py, -0.75);
      ovenGroup.add(sMesh);
      smokeParticles.push({
        mesh: sMesh,
        baseY: py,
        phase: p * 0.85
      });
    }

    return {
      group: ovenGroup,
      ovenLight,
      smokeParticles,
      worldPos: { x: ovenX, y: ovenY, z: ovenZ }
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
      { id: 'sulfur_4', type: 'sulfur', pos: { x: -34.0, y: 0.2, z: -208.0 } },

      // Beach Driftwood Logs (Crescent Harbour & Artisans' Shore)
      { id: 'driftwood_1', type: 'driftwood', pos: { x: -14.0, y: 0.22, z: 56.0 } },
      { id: 'driftwood_2', type: 'driftwood', pos: { x: 26.0, y: 0.22, z: 52.0 } },
      { id: 'driftwood_3', type: 'driftwood', pos: { x: -58.0, y: 0.22, z: 12.0 } },

      // Volcano Trial Instance Rare Drops (Gatehall Dungeon)
      { id: 'brimstone_1', type: 'brimstone_core', pos: { x: -2.0, y: 0.45, z: -202.0 } },
      { id: 'obsidian_rare_1', type: 'pure_obsidian', pos: { x: 5.5, y: 0.45, z: -214.0 } },
      // Soft Birb Down fallen tufts in Heartland Birb Meadow
      { id: 'down_meadow_1', type: 'birb_down', pos: { x: -12.0, y: 0.15, z: 22.0 } },
      { id: 'down_meadow_2', type: 'birb_down', pos: { x: -16.5, y: 0.15, z: 14.5 } },
      { id: 'down_meadow_3', type: 'birb_down', pos: { x: -8.0, y: 0.15, z: 34.0 } }
    ];

    function createGuanoMesh() {
      const g = new THREE.Group();

      // White mineral splash on ground
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
      const featherMat = new THREE.MeshStandardMaterial({ color: 0x60a5fa, roughness: 0.4 });
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

    function createDriftwoodMesh() {
      const g = new THREE.Group();
      const woodMat = new THREE.MeshStandardMaterial({ color: 0x854d0e, roughness: 0.85 });
      const barkMat = new THREE.MeshStandardMaterial({ color: 0x582a0a, roughness: 0.9 });

      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.95, 8), woodMat);
      log.rotation.z = Math.PI * 0.5;
      log.rotation.y = Math.PI * 0.25;
      log.position.y = 0.12;
      g.add(log);

      // Branch knob
      const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.35, 6), barkMat);
      branch.position.set(0.15, 0.22, 0.05);
      branch.rotation.x = 0.6;
      g.add(branch);

      // Beacon icon
      const spark = new THREE.Mesh(new THREE.OctahedronGeometry(0.07, 0), new THREE.MeshBasicMaterial({ color: 0xfde047 }));
      spark.position.y = 0.55;
      g.add(spark);

      return g;
    }

    function createBrimstoneCoreMesh() {
      const g = new THREE.Group();
      const crystalMat = new THREE.MeshStandardMaterial({
        color: 0xec4899,
        emissive: 0xf43f5e,
        emissiveIntensity: 0.65,
        roughness: 0.15,
        metalness: 0.3
      });

      const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.26, 0), crystalMat);
      core.position.y = 0.32;
      g.add(core);

      const light = new THREE.PointLight(0xf43f5e, 1.4, 4.0, 1.8);
      light.position.y = 0.35;
      g.add(light);

      return g;
    }

    function createPureObsidianMesh() {
      const g = new THREE.Group();
      const glassMat = new THREE.MeshStandardMaterial({
        color: 0x09090b,
        roughness: 0.1,
        metalness: 0.9,
        emissive: 0x38bdf8,
        emissiveIntensity: 0.25
      });

      const shard = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.65, 4), glassMat);
      shard.position.y = 0.32;
      shard.rotation.z = 0.15;
      g.add(shard);

      const light = new THREE.PointLight(0x38bdf8, 0.8, 3.0, 1.5);
      light.position.y = 0.45;
      g.add(light);

      return g;
    }

    function createGenericItemMesh(itemKey) {
      const g = new THREE.Group();
      const def = ITEMS[itemKey] || { name: 'Parcel', icon: '📦' };

      // Soft parcel box with golden ribbon
      const boxMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.7 });
      const ribbonMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.3, emissive: 0xca8a04, emissiveIntensity: 0.3 });

      const box = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.32, 0.36), boxMat);
      box.position.y = 0.18;
      g.add(box);

      const ribV = new THREE.Mesh(new THREE.BoxGeometry(0.37, 0.33, 0.08), ribbonMat);
      ribV.position.y = 0.18;
      g.add(ribV);

      const ribH = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.33, 0.37), ribbonMat);
      ribH.position.y = 0.18;
      g.add(ribH);

      // Star beacon
      const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.08, 0), new THREE.MeshBasicMaterial({ color: 0xfef08a }));
      star.position.y = 0.52;
      g.add(star);

      return g;
    }

    function createBirbDownMesh() {
      const g = new THREE.Group();
      const downMat = new THREE.MeshStandardMaterial({
        color: 0xf8fafc,
        emissive: 0x93c5fd,
        emissiveIntensity: 0.35,
        roughness: 0.9,
        metalness: 0.05
      });
      const c1 = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 6), downMat);
      c1.scale.set(1.1, 0.7, 0.9);
      c1.position.y = 0.12;
      g.add(c1);

      const c2 = new THREE.Mesh(new THREE.SphereGeometry(0.12, 5, 5), downMat);
      c2.position.set(0.1, 0.14, 0.08);
      g.add(c2);

      const c3 = new THREE.Mesh(new THREE.SphereGeometry(0.13, 5, 5), downMat);
      c3.position.set(-0.09, 0.13, -0.07);
      g.add(c3);

      const pLight = new THREE.PointLight(0xbfdbfe, 1.2, 3.5);
      pLight.position.set(0, 0.25, 0);
      g.add(pLight);
      return g;
    }

    function createMeshForType(type) {
      if (type === 'birb_down') return createBirbDownMesh();
      if (type === 'guano') return createGuanoMesh();
      if (type === 'sulfur') return createSulfurMesh();
      if (type === 'driftwood') return createDriftwoodMesh();
      if (type === 'brimstone_core') return createBrimstoneCoreMesh();
      if (type === 'pure_obsidian') return createPureObsidianMesh();
      return createGenericItemMesh(type);
    }

    function spawnPickup(type, pos, id = null, count = 1) {
      if (!scene) return null;
      const mesh = createMeshForType(type);
      mesh.position.set(pos.x, pos.y, pos.z);
      scene.add(mesh);

      const pickupObj = {
        id: id || `${type}_dyn_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        type,
        count: count || 1,
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
          const def = ITEMS[p.type] || { name: p.type, icon: '📦' };
          result.push({
            pickup: p,
            dist,
            kind: `pickup_${p.type}`,
            prompt: `Pick Up ${def.name} ${def.icon} [E]`
          });
        }
      });
      return result.sort((a, b) => a.dist - b.dist);
    }

    function collect(pickup) {
      if (!pickup || pickup.collected) return false;
      pickup.collected = true;
      pickup.mesh.visible = false;
      if (!pickup.isStatic) {
        if (pickup.mesh.parent) pickup.mesh.parent.remove(pickup.mesh);
        const idx = activePickups.indexOf(pickup);
        if (idx !== -1) activePickups.splice(idx, 1);
      } else {
        pickup.respawnTimer = 40.0; // 40-second respawn for static nodes
      }
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

  // 5. THE ARCHIPELAGO COMMUNITY TRUNK (3D SHARED ISLAND STASH)
  // Location: Heartland Plaza crossroads (x: -3.2, z: 10.0)
  function createCommunityTrunk() {
    const trunkGroup = new THREE.Group();
    trunkGroup.position.set(-3.2, 0, 10.0);
    trunkGroup.rotation.y = Math.PI * 0.15;

    const oakMat = new THREE.MeshStandardMaterial({ color: 0x5c3317, roughness: 0.75 });
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.35, metalness: 0.7 });
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.5, metalness: 0.6 });

    // Chest Body Box
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.62, 0.76), oakMat);
    body.position.y = 0.31;
    body.castShadow = true;
    trunkGroup.add(body);

    // Brass corner straps
    const cornerOffsets = [
      [-0.61, 0.31, -0.36], [0.61, 0.31, -0.36],
      [-0.61, 0.31, 0.36], [0.61, 0.31, 0.36]
    ];
    cornerOffsets.forEach(([cx, cy, cz]) => {
      const strap = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.63, 0.08), brassMat);
      strap.position.set(cx, cy, cz);
      trunkGroup.add(strap);
    });

    // Front Brass Latch & Keyhole
    const latch = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.06), brassMat);
    latch.position.set(0, 0.44, 0.40);
    trunkGroup.add(latch);

    // Hinged Lid Group
    const lidGroup = new THREE.Group();
    lidGroup.position.set(0, 0.62, -0.38);

    const lidMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.39, 0.39, 1.27, 16, 1, false, 0, Math.PI), oakMat);
    lidMesh.rotation.z = Math.PI * 0.5;
    lidMesh.position.set(0, 0, 0.38);
    lidGroup.add(lidMesh);

    // Brass lid ribs
    for (let r = -0.55; r <= 0.55; r += 0.55) {
      const rib = new THREE.Mesh(new THREE.CylinderGeometry(0.40, 0.40, 0.06, 16, 1, false, 0, Math.PI), brassMat);
      rib.rotation.z = Math.PI * 0.5;
      rib.position.set(r, 0, 0.38);
      lidGroup.add(rib);
    }
    trunkGroup.add(lidGroup);

    // Warm Beacon Light
    const beacon = new THREE.PointLight(0xfef08a, 0.5, 3.5, 1.4);
    beacon.position.y = 0.9;
    trunkGroup.add(beacon);

    // 16 Shared Storage Slots
    const NUM_SLOTS = 24;
    const slots = new Array(NUM_SLOTS).fill(null);

    // Pre-populate with initial shared island supplies
    const initialTrunkItems = [
      { id: 'breb', qty: 3 },
      { id: 'ancient_pages', qty: 1 },
      { id: 'blueprints', qty: 1 },
      { id: 'driftwood', qty: 2 }
    ];
    initialTrunkItems.forEach((it, idx) => {
      if (idx < NUM_SLOTS && ITEMS[it.id]) {
        slots[idx] = { id: it.id, qty: it.qty };
      }
    });

    let lidTargetRot = 0;

    function openLid(isOpen) {
      lidTargetRot = isOpen ? -Math.PI * 0.42 : 0;
    }

    function update(dt) {
      lidGroup.rotation.x += (lidTargetRot - lidGroup.rotation.x) * 10 * dt;
    }

    function deposit(itemKey, count = 1, playerInventory = null) {
      if (!ITEMS[itemKey] || count <= 0) return 0;
      if (playerInventory && !playerInventory.hasItem(itemKey, count)) return 0;
      const def = ITEMS[itemKey];
      let remaining = count;

      // 1. Stack into existing slot
      for (let i = 0; i < NUM_SLOTS; i++) {
        if (slots[i] && slots[i].id === itemKey) {
          const space = def.maxStack - slots[i].qty;
          if (space > 0) {
            const add = Math.min(space, remaining);
            slots[i].qty += add;
            remaining -= add;
            if (remaining <= 0) break;
          }
        }
      }

      // 2. Fill empty slot
      if (remaining > 0) {
        for (let i = 0; i < NUM_SLOTS; i++) {
          if (!slots[i]) {
            const add = Math.min(def.maxStack, remaining);
            slots[i] = { id: itemKey, qty: add };
            remaining -= add;
            if (remaining <= 0) break;
          }
        }
      }

      const deposited = count - remaining;
      if (deposited > 0 && playerInventory) {
        playerInventory.removeItem(itemKey, deposited);
      }
      return deposited;
    }

    function withdraw(slotIdx, count = 1, playerInventory = null) {
      if (slotIdx < 0 || slotIdx >= NUM_SLOTS || !slots[slotIdx]) return 0;
      const slotItem = slots[slotIdx];
      const takeCount = Math.min(count, slotItem.qty);
      if (playerInventory) {
        const added = playerInventory.addItem(slotItem.id, takeCount);
        if (added <= 0) return 0;
        slotItem.qty -= added;
        if (slotItem.qty <= 0) slots[slotIdx] = null;
        return added;
      }
      slotItem.qty -= takeCount;
      if (slotItem.qty <= 0) slots[slotIdx] = null;
      return takeCount;
    }

    function getSlots() {
      return slots.map((s, idx) => {
        if (!s) return null;
        const def = ITEMS[s.id];
        return { slot: idx, id: s.id, qty: s.qty, ...def };
      });
    }

    function setSlots(newSlots) {
      if (!Array.isArray(newSlots)) return;
      for (let i = 0; i < NUM_SLOTS; i++) {
        if (newSlots[i] && newSlots[i].id && ITEMS[newSlots[i].id]) {
          slots[i] = { id: newSlots[i].id, qty: Math.max(1, newSlots[i].qty || 1) };
        } else {
          slots[i] = null;
        }
      }
    }

    return {
      group: trunkGroup,
      slots,
      openLid,
      update,
      deposit,
      withdraw,
      getSlots,
      setSlots,
      worldPos: { x: -3.2, y: 0.35, z: 10.0 }
    };
  }

  // 6. HEARTLAND PIER LAUNCH MORTAR (3D LAUNCH TUBE & PYROTECHNICS)
  // Location: Endless Pier Tip (x: 48.0, y: 1.45, z: 76.0)
  function createLaunchMortarStation() {
    const stationGroup = new THREE.Group();
    stationGroup.position.set(48.0, 1.45, 76.0);
    stationGroup.rotation.y = Math.PI * 0.95; // Pointing out toward the ocean and bistro bluff

    const teakMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.75 });
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.3, metalness: 0.75 });
    const darkBrassMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.45, metalness: 0.65 });
    const ribbonMat = new THREE.MeshStandardMaterial({ color: 0xf43f5e, roughness: 0.35 });

    // 1. Heavy Turntable Plinth
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.95, 0.35, 16), teakMat);
    plinth.position.y = 0.175;
    stationGroup.add(plinth);

    // 2. Brass Mortar Trunnion Stand
    const trunnionL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.75, 0.35), darkBrassMat);
    trunnionL.position.set(-0.42, 0.6, 0);
    stationGroup.add(trunnionL);

    const trunnionR = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.75, 0.35), darkBrassMat);
    trunnionR.position.set(0.42, 0.6, 0);
    stationGroup.add(trunnionR);

    // 3. Heavy Heavy Mortar Tube (Angled upward towards the sea sky)
    const tubeGroup = new THREE.Group();
    tubeGroup.position.set(0, 0.65, 0);
    tubeGroup.rotation.x = -Math.PI * 0.15; // 70-degree high launch angle

    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.34, 1.4, 16), brassMat);
    tube.position.y = 0.6;
    tubeGroup.add(tube);

    // Brass reinforcing bands
    const band1 = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.1, 16), darkBrassMat);
    band1.position.y = 0.3;
    tubeGroup.add(band1);

    const band2 = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.1, 16), darkBrassMat);
    band2.position.y = 1.15;
    tubeGroup.add(band2);

    // Decorative Silk Ribbon Bow
    const ribbon = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.05, 8, 20), ribbonMat);
    ribbon.rotation.x = Math.PI * 0.5;
    ribbon.position.y = 0.75;
    tubeGroup.add(ribbon);

    stationGroup.add(tubeGroup);

    // Sparkle Beacon
    const beacon = new THREE.PointLight(0xf43f5e, 1.1, 4.5, 1.6);
    beacon.position.set(0, 1.8, 0);
    stationGroup.add(beacon);

    // 4. RETRO/CYBERPUNK NEON LAUNCHPAD GANTRY ARCH & SIGN
    const pylonGeo = new THREE.CylinderGeometry(0.08, 0.11, 3.6, 12);
    const pylonL = new THREE.Mesh(pylonGeo, darkBrassMat);
    pylonL.position.set(-1.9, 1.8, -0.15);
    stationGroup.add(pylonL);

    const pylonR = new THREE.Mesh(pylonGeo, darkBrassMat);
    pylonR.position.set(1.9, 1.8, -0.15);
    stationGroup.add(pylonR);

    [-1.9, 1.9].forEach(px => {
      const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.35, 12), brassMat);
      foot.position.set(px, 0.175, -0.15);
      stationGroup.add(foot);

      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 10), brassMat);
      cap.position.set(px, 3.65, -0.15);
      stationGroup.add(cap);
    });

    const archBeam = new THREE.Mesh(new THREE.BoxGeometry(3.9, 0.14, 0.14), darkBrassMat);
    archBeam.position.set(0, 3.5, -0.15);
    stationGroup.add(archBeam);

    // Canvas Marquee Signboard Texture
    const signCanvas = document.createElement('canvas');
    signCanvas.width = 1024;
    signCanvas.height = 340;
    const sctx = signCanvas.getContext('2d');

    sctx.fillStyle = '#080612';
    sctx.fillRect(0, 0, 1024, 340);

    sctx.lineWidth = 10;
    sctx.strokeStyle = '#ff007f';
    sctx.shadowColor = '#ff007f';
    sctx.shadowBlur = 24;
    sctx.strokeRect(18, 18, 988, 304);

    sctx.lineWidth = 4;
    sctx.strokeStyle = '#00f0ff';
    sctx.shadowColor = '#00f0ff';
    sctx.shadowBlur = 18;
    sctx.strokeRect(30, 30, 964, 280);

    sctx.textAlign = 'center';
    sctx.textBaseline = 'middle';
    sctx.font = '900 64px sans-serif';
    sctx.shadowColor = '#ff0088';
    sctx.shadowBlur = 32;
    sctx.fillStyle = '#ff3399';
    sctx.fillText('PYRO LAUNCHPAD', 512, 115);

    sctx.font = '700 32px sans-serif';
    sctx.shadowColor = '#00f0ff';
    sctx.shadowBlur = 22;
    sctx.fillStyle = '#00f0ff';
    sctx.fillText('BLAST OFF · CELEBRATION 24/7', 512, 215);

    sctx.font = '28px sans-serif';
    sctx.fillStyle = '#fde047';
    sctx.shadowColor = '#fde047';
    sctx.shadowBlur = 16;
    sctx.fillText('✦', 64, 64);
    sctx.fillText('✦', 960, 64);
    sctx.fillText('✦', 64, 276);
    sctx.fillText('✦', 960, 276);

    const signTex = new THREE.CanvasTexture(signCanvas);
    signTex.minFilter = THREE.LinearFilter;
    signTex.magFilter = THREE.LinearFilter;

    const signMat = new THREE.MeshStandardMaterial({
      map: signTex,
      roughness: 0.35,
      metalness: 0.2,
      emissive: 0x221122,
      emissiveIntensity: 0.6
    });
    const signboard = new THREE.Mesh(new THREE.BoxGeometry(3.3, 1.1, 0.1), signMat);
    signboard.position.set(0, 3.3, -0.05);
    stationGroup.add(signboard);

    // 3D Bent Neon Tubes
    const neonPinkMat = new THREE.MeshBasicMaterial({ color: 0xff007f });
    const neonCyanMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const neonYellowMat = new THREE.MeshBasicMaterial({ color: 0xffe600 });

    const topTube = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 3.32, 12), neonPinkMat);
    topTube.rotation.z = Math.PI / 2;
    topTube.position.set(0, 3.86, 0.02);
    stationGroup.add(topTube);

    const btmTube = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 3.32, 12), neonCyanMat);
    btmTube.rotation.z = Math.PI / 2;
    btmTube.position.set(0, 2.74, 0.02);
    stationGroup.add(btmTube);

    // Upward-pointing Neon Chevron Arrow atop sign
    const chevronGroup = new THREE.Group();
    chevronGroup.position.set(0, 4.15, 0.02);
    const chevL = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.55, 8), neonCyanMat);
    chevL.position.set(-0.18, 0, 0);
    chevL.rotation.z = Math.PI * 0.25;
    chevronGroup.add(chevL);

    const chevR = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.55, 8), neonCyanMat);
    chevR.position.set(0.18, 0, 0);
    chevR.rotation.z = -Math.PI * 0.25;
    chevronGroup.add(chevR);

    const chevTip = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.16, 8), neonYellowMat);
    chevTip.position.set(0, 0.25, 0);
    chevronGroup.add(chevTip);

    stationGroup.add(chevronGroup);

    // Dynamic Neon Glow Lights
    const neonPinkLight = new THREE.PointLight(0xff007f, 2.2, 10.0, 1.8);
    neonPinkLight.position.set(0, 3.4, 0.45);
    stationGroup.add(neonPinkLight);

    const neonCyanLight = new THREE.PointLight(0x00f0ff, 1.6, 7.5, 1.8);
    neonCyanLight.position.set(0, 1.2, 0.35);
    stationGroup.add(neonCyanLight);

    return {
      group: stationGroup,
      tubeGroup,
      beacon,
      neonPinkLight,
      neonCyanLight,
      chevronGroup,
      update(elapsed, dt) {
        if (beacon) {
          beacon.intensity = 0.8 + Math.sin(elapsed * 5.0) * 0.4;
        }
        if (neonPinkLight) {
          const flicker = Math.sin(elapsed * 11.0) * 0.25 + (Math.random() < 0.02 ? -0.45 : 0.0);
          neonPinkLight.intensity = Math.max(1.0, 2.2 + flicker);
        }
        if (neonCyanLight) {
          neonCyanLight.intensity = 1.6 + Math.cos(elapsed * 8.5) * 0.2;
        }
        if (chevronGroup) {
          chevronGroup.position.y = 4.15 + Math.sin(elapsed * 4.0) * 0.04;
        }
      },
      worldPos: { x: 48.0, y: 1.45, z: 76.0 }
    };
  }

  return {
    ITEMS,
    createPlayerInventory,
    createSolomonBreadOven,
    createWorldPickupManager,
    createCommunityTrunk,
    createLaunchMortarStation
  };
})();
