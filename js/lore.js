// ============================================================================
// BLÅHAJ ISLAND — CANON LORE, CHARACTERS, LANDMARKS & MODULAR QUEST REGISTRY
// (ROUND 3: 3D GRASS, VOLCANO TRIAL DUNGEON, BIRBS & BREB, CARROT KNOCKOFF)
// ============================================================================

window.BLAHAJ_LORE = {
  // The Four Playable Blue Sharks
  sharks: {
    hermes: {
      id: 'hermes',
      key: '1',
      name: 'Hermes',
      title: 'The Mangy One · The Weary Guide',
      role: 'Interdimensional Traveller & Portal Opener',
      portrait: 'assets/gallery/Hermes.png',
      quote: '“I\'m tired, sharkitty… but the road home is always worth the trip.”',
      bodyColor: 0x1d70b8,
      bellyColor: 0xf4eee1,
      scarfColor: 0x8c5535,
      scale: 1.0,
      plumpness: 1.0,
      abilityName: 'Between Portal',
      abilityIcon: '🌀',
      abilityDesc: 'Opens a violet-blue dimensional shortcut & illuminates hidden Seam paths with the Between Lantern.',
      homePos: { x: 64, z: -10, rotY: -1.2 }, // Near the Great Portal Gate on East Cape
      greetings: [
        '“Every portal folds along the Great Seam. Even when shores are far apart, the road between them is short.”',
        '“Have you sailed around the north side of the Volcano Peninsula? There’s a hidden wharf leading straight into the Volcano Trial Dungeon.”',
        '“Sharkitty? Rest your fins a moment. I’ve got the Between Lantern lit.”'
      ]
    },
    solomon: {
      id: 'solomon',
      key: '2',
      name: 'Solomon',
      title: 'The Star Shark · Keeper of the Brew',
      role: 'Performer, Chef & Host of Infinite Hospitality',
      portrait: 'assets/gallery/Solomon.png',
      quote: '“Every meal is a performance. Every friend is the best kind of audience.”',
      bodyColor: 0x2279c7,
      bellyColor: 0xf7f2e6,
      scarfColor: 0x283666,
      scale: 1.04,
      plumpness: 1.05,
      protrudingTooth: true,
      abilityName: 'Sacred Tea & Breb',
      abilityIcon: '🫖',
      abilityDesc: 'Summons a floating porcelain tea service & warm breb that restores 100% Tea Comfort and feeds nearby Birbs.',
      homePos: { x: -6, z: 14, rotY: 0.45 }, // Sacred Tea House Village
      greetings: [
        '“Welcome, welcome! Today’s pour is Earl Grey of Enlightenment with freshly baked Breb for the Birbs!”',
        '“Press [B] anytime to toss warm Breb on the grass—watch the plump Birbs hop right over for a snack!”',
        '“Have you visited Spherical Foods on the Southwest Bluff yet? Everything is better in a sphere—no flat food allowed!”'
      ]
    },
    hiram: {
      id: 'hiram',
      key: '3',
      name: 'Hiram',
      title: 'The Builder · Master of Deep Stone',
      role: 'Architect, Geologist & Volcano Steward',
      portrait: 'assets/gallery/Hiram.png',
      quote: '“If something exists, it was meant to. If something breaks, I must understand why.”',
      bodyColor: 0x1a66ab,
      bellyColor: 0xf2ece0,
      scarfColor: 0x9e6a2b,
      scale: 1.02,
      plumpness: 1.02,
      abilityName: 'Sacred Allen Key',
      abilityIcon: '🔧',
      abilityDesc: 'Measures geological harmony with Ingvar\'s Measuring Tape & consecrates offerings to the Sacred Volcano.',
      homePos: { x: -21, z: -64, rotY: 0.35 }, // At the Isthmus Causeway to the Volcano Peninsula
      greetings: [
        '“I carved the Volcano Trial Dungeon beneath the mountain to test our courage and offset the island’s extreme coziness!”',
        '“Sail or swim to the Rear Volcano Wharf on the far north shore, brave the swinging obsidian pendulums, and ascend to the Front Balcony!”',
        '“And once you emerge onto the Volcano Temple Balcony… try bumping the Beach-Shorts Carrots off the ledge! Don’t worry, they bounce!”'
      ]
    },
    nimue: {
      id: 'nimue',
      key: '4',
      name: 'Nimue',
      title: 'An Angel · The Plump One',
      role: 'Keeper of Memory, Inner Sight & The Quiet Library',
      portrait: 'assets/gallery/Nimue.png',
      quote: '“I am not brave. I am just still here. And that is enough.”',
      bodyColor: 0x2982d4,
      bellyColor: 0xf9f4e8,
      scarfColor: 0x5c367d,
      scale: 0.98,
      plumpness: 1.24, // Plump, soft silhouette!
      abilityName: 'Needle of Restoration',
      abilityIcon: '🪡',
      abilityDesc: 'Weaves golden-violet starlight thread to stitch nearby Great Seam rifts and awaken lost memories.',
      homePos: { x: 46, z: -44, rotY: -0.6 }, // Crust Cliffs Highlands & Observatory
      greetings: [
        '“The Lantern of Forgotten Stars keeps every shared memory safe—even across distant time zones.”',
        '“The Birbs love gathering on the swaying meadow grass near the Tea House whenever someone tosses warm Breb.”',
        '“Come look at the tapestries up on the Observatory Ridge whenever you want to remember our favourite stories.”'
      ]
    },
    custom: {
      id: 'custom',
      key: '5',
      name: 'Finley',
      title: 'Initiate of the Sacred Scissors · Detagged Explorer',
      role: 'Liberated from the IKEA Spawning Pits on Erf & Named on Blåhaj Island',
      portrait: 'assets/gallery/Names.png',
      quote: '“A Tag Removed · A Name Received · A Shark Reborn!”',
      bodyColor: 0x2578c4,
      bellyColor: 0xf7f2e6,
      scarfColor: 0xd97706,
      scale: 1.0,
      plumpness: 1.05,
      isCustomShark: true,
      detagged: false,
      keepsake: 'flatpack_hat',
      tagSerial: 'ART. 303.735.88',
      abilityName: 'Sacred Scissors & Hex Key',
      abilityIcon: '✂️',
      abilityDesc: 'Raises the Golden Scissors of Liberation & Apprentice Hex Key—celebrating your True Name and opening Flat-Pack Builder Mode [C]!',
      homePos: { x: 48, z: -12, rotY: -0.8 },
      greetings: [
        '“I escaped the yellow-and-blue bins of the IKEA Spawning Pits on Erf and received my True Name at the Rite of Detagging!”',
        '“Look! I still keep my Retired Spawning-Pit Tag (ART. 303.735.88) safely tucked in my satchel.”',
        '“With Hiram’s Apprentice Hex Key and Ingvar’s Measuring Tape, any Named Shark can help build across the archipelago!”'
      ]
    }
  },

  // Supporting Island NPCs
  npcs: [
    {
      id: 'tatiana',
      name: 'Tatiana',
      tag: 'THE PINK GUARD · ROYAL PROTECTION',
      type: 'pink_shark',
      beautySpot: true,
      hasMirror: true,
      pos: { x: 56, z: -4, rotY: -0.9 },
      portrait: 'assets/gallery/Wedding-1.png',
      lines: [
        '“Halt! State your business, your tea preference, and how many Birbs you have fed with Breb today!”',
        '“This Beauty Spot Mirror is strictly ceremonial Pink Guard optical equipment. Anyone saying otherwise goes on the Clipboard.”',
        '“You may pass, sharkitty. The Pink Guard approves of cozy exploration.”'
      ]
    },
    {
      id: 'ivanka',
      name: 'Ivanka',
      tag: 'THE PINK GUARD · CLIPBOARD AUTHORITY',
      type: 'pink_shark',
      hasClipboard: true,
      pos: { x: 60, z: -16, rotY: -1.4 },
      portrait: 'assets/gallery/Whirlings.png',
      lines: [
        '“I am consulting the Security Clipboard. It contains nothing. It remains terrifying.”',
        '“During the Laundry of Initiation, Tatiana and I stood vigil outside the tumble dryer for the entire spin cycle.”',
        '“If your stuffing gets singed in the Volcano Trial Dungeon, report immediately to the Sacred Tea House or The First Whirlings!”'
      ]
    },
    {
      id: 'paracelsus',
      name: 'Paracelsus Sunbeam',
      tag: 'BABY SHARK · APPRENTICE OF POSSIBILITY',
      type: 'baby_shark',
      pos: { x: 6, z: 16, rotY: -0.5 },
      portrait: 'assets/gallery/Emergency-1.png',
      lines: [
        '“Shonk!! Look at the round Birbs hopping in the grass! Press [B] to throw them some warm Breb!”',
        '“There are colourful fishes and bouncy beach balls out in the Water That Doth Not Wet! You can boop the beach balls right across the bay!”',
        '“When I grow up, I want to survive the Volcano Trial Dungeon and spend Trial Points on Turbo Hydro-Fins!”'
      ]
    },
    {
      id: 'beetroot_waiter',
      name: 'Monsieur Betterave',
      tag: 'SPHERICAL FOODS · NO FLAT FOOD HERE',
      type: 'beetroot',
      pos: { x: -48, z: 31, rotY: 0.75 },
      portrait: 'assets/gallery/Spherical-Foods.png',
      lines: [
        '“Joyeux Anniversaire! Welcome to Spherical Foods! It is Helen’s Grand Birthday Week on Blåhaj Island—no flat food or flat cakes shall ever cross our threshold!”',
        '“Step inside the grand dining rotunda to feast your eyes upon Helen’s Celestial Birthday Bombe, glazed in ruby-magenta mirror glass with edible gold stars!”',
        '“Even the plump Birbs on Blåhaj Island are delightfully spherical. Truly, nature understands our culinary philosophy.”',
        '“Would you care for a pot of Volcanic Oolong with your Burrata Bombe?”'
      ]
    },
    {
      id: 'carrot_leader',
      name: 'Sunny the Beach Carrot',
      tag: 'CRESCENT BEACH CONNOISSEUR',
      type: 'carrot',
      shortsColor: 0x3b82f6,
      pos: { x: 11.5, z: 51.0, rotY: 0.35 },
      portrait: 'assets/gallery/Volcano-temple.png',
      lines: [
        '“Ahhh, now THIS is what I call proper vacation lounging! Soft golden sand, warm ocean breeze, and a chilled coconut drink at Crescent Beach.”',
        '“My daredevil carrot cousins are still up on the high Volcano Balcony if you fancy knocking them flying down the slope—don’t worry, they bounce back up after a quick 18 seconds!”',
        '“If you’re feeling extra brave, take a sailboat north to the Rear Volcano Wharf and enter the fiery dungeon depths!”',
        '“Look right over here—our full Crescent Beach Shark Volleyball Court is set up on the sand! Sandy is ready on the far court, and I’m ready to referee from the high chair!”',
        '“Step onto the court or hit ‘Play Beach Volleyball!’ right here with me whenever you want a rally! Sharks use their noses to header-boop the ball back and forth across the net!”'
      ]
    }
  ],

  // Landmarks & Interactive Stations across Expanded Blåhaj Island
  landmarks: [
    {
      id: 'sacred_tea_house',
      name: 'Sacred Tea House',
      zoneTitle: 'Sacred Tea House & Heartland Plaza',
      pos: { x: 0, z: 10 },
      radius: 14,
      prompt: 'Brew & Share Sacred Tea [E]',
      type: 'teahouse'
    },
    {
      id: 'birb_sanctuary',
      name: 'Heartland Birb Meadow',
      zoneTitle: 'Heartland Meadow · Sanctuary of the Birbs',
      pos: { x: -14, z: 18 },
      radius: 11,
      prompt: 'Toss Warm Breb to the Birbs [E / B]',
      type: 'birbs'
    },
    {
      id: 'great_portal_gate',
      name: 'Great Portal Gate',
      zoneTitle: 'East Cape · The Great Portal Threshold',
      pos: { x: 72, z: -10 },
      radius: 15,
      prompt: 'Open Cross-Ocean Portal (LA ↔ NZ) [E]',
      type: 'portal'
    },
    {
      id: 'sealed_volcano_gate',
      name: 'The Exoteric Volcano Shrine & Offering Altar',
      zoneTitle: 'Sacred Volcano Peninsula · Exoteric Front Shrine',
      pos: { x: -22, z: -103 },
      radius: 12,
      prompt: 'Make an Offering to the Volcano [E] 🌋🍵',
      type: 'sealed_gate'
    },
    {
      id: 'crescent_beach_volleyball',
      name: 'Crescent Beach Volleyball Court',
      zoneTitle: 'Crescent Beach · Shark Volleyball Court',
      pos: { x: 28, z: 52 },
      radius: 9.5,
      prompt: 'Play Shark Beach Volleyball [E] 🏐🦈',
      type: 'volleyball'
    },
    {
      id: 'rear_volcano_wharf',
      name: 'Rear Volcano Wharf & Sea Cave',
      zoneTitle: 'North Shore · Rear Volcano Wharf & Sea Cave Gate',
      pos: { x: -28, z: -198 },
      radius: 16,
      prompt: 'Enter Volcano Trial Dungeon [E] 🌋⚔️',
      type: 'rear_wharf'
    },
    {
      id: 'spherical_foods',
      name: 'Spherical Foods Bistro & Rotunda',
      zoneTitle: 'Southwest Bluff · Spherical Foods Rotunda',
      pos: { x: -47.7, z: 41.0 },
      radius: 6.5,
      prompt: 'Enter Spherical Foods Bistro [E] 🧆',
      type: 'spherical'
    },
    {
      id: 'the_first_whirlings',
      name: 'The First Whirlings',
      zoneTitle: 'Western Artisans’ Ridge · The First Whirlings',
      pos: { x: -64, z: -14 },
      radius: 12,
      prompt: 'Enter The First Whirlings [E] 🌀🫧',
      type: 'laundry'
    },
    {
      id: 'quiet_library',
      name: 'Observatory & Quiet Library',
      zoneTitle: 'Crust Cliffs · Observatory of Lost Constellations',
      pos: { x: 52, z: -48 },
      radius: 15,
      prompt: 'Look through Starlight Observatory Telescope [E] 🔭✨',
      type: 'library'
    },
    {
      id: 'endless_pier',
      name: 'Endless Pier to Erf',
      zoneTitle: 'Endless Pier ("Different Shores, Same Ocean")',
      pos: { x: 48, z: 64 },
      radius: 15,
      prompt: 'Read / Leave a Cross-Ocean Pier Note [E]',
      type: 'pier'
    },
    {
      id: 'tea_docks_boat',
      name: 'Shark Week Regatta Boat',
      zoneTitle: 'Crescent Harbour · Tea Docks',
      pos: { x: 0, z: 72 },
      radius: 15,
      prompt: 'Board / Leave Regatta Sailboat [E]',
      type: 'boat'
    },
    {
      id: 'isl_hermes',
      name: 'Hermes’ Starlight Atoll (East Sanctuary Island)',
      zoneTitle: 'East Sanctuary Island · Hermes’ Starlight Atoll',
      pos: { x: 142, z: -10 },
      radius: 15,
      prompt: 'Sanctuary Island Charter · Dock / Claim / Portal [E]',
      type: 'sanctuary_island',
      islandKey: 'hermes_atoll'
    },
    {
      id: 'isl_solomon',
      name: 'Solomon’s Sunlit Meadow Cay (SW Sanctuary Island)',
      zoneTitle: 'SW Sanctuary Island · Solomon’s Meadow Cay',
      pos: { x: -132, z: 72 },
      radius: 15,
      prompt: 'Sanctuary Island Charter · Dock / Claim / Portal [E]',
      type: 'sanctuary_island',
      islandKey: 'solomon_cay'
    },
    {
      id: 'isl_hiram',
      name: 'Hiram’s Forge & Birch Isle (NW Sanctuary Island)',
      zoneTitle: 'NW Sanctuary Island · Hiram’s Forge & Birch Isle',
      pos: { x: -132, z: -72 },
      radius: 15,
      prompt: 'Sanctuary Island Charter · Dock / Claim / Portal [E]',
      type: 'sanctuary_island',
      islandKey: 'hiram_isle'
    },
    {
      id: 'isl_nimue',
      name: 'Nimue’s Whispering Sanctuary (NE Sanctuary Island)',
      zoneTitle: 'NE Sanctuary Island · Nimue’s Whispering Sanctuary',
      pos: { x: 134, z: -92 },
      radius: 15,
      prompt: 'Sanctuary Island Charter · Dock / Claim / Portal [E]',
      type: 'sanctuary_island',
      islandKey: 'nimue_sanctuary'
    }
  ],

  // 4 Outer Buildable Sanctuary Islands surrounding Blåhaj Island
  sanctuaryIslands: [
    {
      id: 'hermes_atoll',
      name: 'Hermes’ Starlight Atoll',
      direction: 'EAST ISLAND',
      guardian: 'Hermes',
      x: 175,
      z: -10,
      radius: 46,
      elevation: 3.8,
      dockX: 135,
      dockZ: -10,
      signX: 142,
      signZ: -10,
      themeColor: 0x7c5cff,
      desc: 'A broad, star-kissed buildable sanctuary island just east across the channel from the Great Portal Gate. Build a boardwalk bridge across the strait or link a Pocket Portal!'
    },
    {
      id: 'solomon_cay',
      name: 'Solomon’s Sunlit Meadow Cay',
      direction: 'SOUTHWEST ISLAND',
      guardian: 'Solomon',
      x: -165,
      z: 95,
      radius: 50,
      elevation: 4.0,
      dockX: -126,
      dockZ: 68,
      signX: -132,
      signZ: 72,
      themeColor: 0xf5b942,
      desc: 'A wide, golden-grass sanctuary island in the southwest lagoon—ideal for building custom Tea Resorts, Breb Bakeries, and Cozy Cabins!'
    },
    {
      id: 'hiram_isle',
      name: 'Hiram’s Forge & Birch Isle',
      direction: 'NORTHWEST ISLAND',
      guardian: 'Hiram',
      x: -165,
      z: -90,
      radius: 48,
      elevation: 4.4,
      dockX: -126,
      dockZ: -68,
      signX: -132,
      signZ: -72,
      themeColor: 0xe86f38,
      desc: 'Overlooking the Sacred Volcano Peninsula across the western strait! Features a flat architectural plateau for grand bridges, shrines, and Carrot Domino tracks.'
    },
    {
      id: 'nimue_sanctuary',
      name: 'Nimue’s Whispering Sanctuary',
      direction: 'NORTHEAST ISLAND',
      guardian: 'Nimue',
      x: 165,
      z: -115,
      radius: 48,
      elevation: 4.2,
      dockX: 128,
      dockZ: -88,
      signX: 134,
      signZ: -92,
      themeColor: 0xc299ff,
      desc: 'A serene stargazer island off the northeast coast where the Great Seam shimmers brightest. Perfect for quiet cabins, starlight lanterns, and custom gardens.'
    },
    {
      id: 'charter_atoll',
      name: 'Personal Pocket Atoll & Starlight Sea-Cave',
      direction: 'SOUTH LAGOON ATOLL',
      guardian: 'Order of the Sacred Scissors',
      x: 0,
      z: 205,
      radius: 52,
      elevation: 4.2,
      dockX: 0,
      dockZ: 152,
      signX: 0,
      signZ: 162,
      themeColor: 0x38bdf8,
      desc: 'Your personal chartered Pocket Atoll directly south of Crescent Harbour! Features a Private Boat Shipyard (BÅT-BYGGE), Ingvar’s Assembly & Sawmill Bench (BYGGBÄNK), a companion lagoon for rescued Spawning-Pit baby sharks, and a natural Basalt Arch descending into the 3D Subterranean Bioluminescent Sea-Cave Grotto!'
    }
  ],

  // Hiram the Magical Builder — Categorized Blueprint Catalog
  buildCategories: [
    { id: 'skarhaj_kits', name: '📦 SKÄRHAJ Flat-Packs', sub: 'Modular snap-together IKEA birch kits, 2-story walls, KALLAX shelves & sea-cave grottos' },
    { id: 'village', name: '🏡 Village & Cabins', sub: 'Cozy Scandinavian timber & plush hangouts' },
    { id: 'bridges', name: '🌉 Bridges & Stairs', sub: 'Walkable bridges across the sea & sky ramps' },
    { id: 'portals', name: '🌀 Portals & Magic', sub: 'Teleportation arches, starlight & plush seating' },
    { id: 'contraptions', name: '🥕 Carrot Toys & Shrines', sub: 'Bounce pads, domino carrots & volcano statues' }
  ],

  buildCatalog: [
    // Category 1: Village & Cabins
    {
      id: 'birch_cabin',
      category: 'village',
      name: 'Birch A-Frame Cabin',
      icon: '🏡',
      currency: 'birbs',
      cost: 4,
      costLabel: '4 Birbs',
      desc: 'Warm Scandinavian timber & plush A-frame sanctuary cabin with glowing windows and porch.'
    },
    {
      id: 'tea_gazebo',
      category: 'village',
      name: 'Sacred Tea Gazebo',
      icon: '🏮',
      currency: 'birbs',
      cost: 3,
      costLabel: '3 Birbs',
      desc: 'Octagonal birch pavilion with warm paper lanterns and a raised walkable timber deck.'
    },
    {
      id: 'kotatsu_table',
      category: 'village',
      name: 'Steaming Tea Table',
      icon: '🫖',
      currency: 'birbs',
      cost: 2,
      costLabel: '2 Birbs',
      desc: 'Cozy low table with a Golden Teapot, porcelain cups, and spherical delicacies.'
    },
    {
      id: 'breb_oven',
      category: 'village',
      name: 'Warm Breb Bakery',
      icon: '🥖',
      currency: 'birbs',
      cost: 3,
      costLabel: '3 Birbs',
      desc: 'Artisanal stone & copper hearth that bakes warm Breb loaves and attracts nearby Birbs!'
    },

    // Category 2: Bridges, Stairs & Docks (All Walkable!)
    {
      id: 'lagoon_bridge',
      category: 'bridges',
      name: 'Lagoon Bridge (12m)',
      icon: '🌉',
      currency: 'carrots',
      cost: 2,
      costLabel: '2 Carrots',
      desc: 'Wide walkable birch boardwalk! Chain them across the ocean to connect the Outer Islands!'
    },
    {
      id: 'sky_stairs',
      category: 'bridges',
      name: 'Sky-Staircase Ramp',
      icon: '🪜',
      currency: 'carrots',
      cost: 2,
      costLabel: '2 Carrots',
      desc: 'Walkable 10m ascending ramp (+3.5m height) — climb cliffs, roofs, or the Sacred Volcano!'
    },
    {
      id: 'custom_wharf',
      category: 'bridges',
      name: 'Custom Boat Wharf',
      icon: '⚓',
      currency: 'birbs',
      cost: 3,
      costLabel: '3 Birbs',
      desc: 'Walkable coastal timber pier with mooring posts and a warm harbor lantern.'
    },
    {
      id: 'stepping_stone',
      category: 'bridges',
      name: 'Floating Rune Platform',
      icon: '🪨',
      currency: 'carrots',
      cost: 1,
      costLabel: '1 Carrot',
      desc: 'Magical basalt & gold platform (6m x 6m) that floats on water, lava, or mid-air!'
    },

    // Category 3: Portals & Magic
    {
      id: 'pocket_portal',
      category: 'portals',
      name: 'Linked Pocket Portal',
      icon: '🌀',
      currency: 'trials',
      cost: 1,
      costLabel: '1 Trial Pt',
      desc: 'Place two or more anywhere! Walk into one Pocket Portal to teleport to the next!'
    },
    {
      id: 'starlight_lantern',
      category: 'portals',
      name: 'Between Lantern Post',
      icon: '✨',
      currency: 'birbs',
      cost: 1,
      costLabel: '1 Birb',
      desc: 'Carved timber post with a floating violet-gold Between Lantern that lights the night.'
    },
    {
      id: 'allen_obelisk',
      category: 'portals',
      name: 'Sacred Allen Obelisk',
      icon: '🔧',
      currency: 'trials',
      cost: 1,
      costLabel: '1 Trial Pt',
      desc: 'Hiram’s rune-carved basalt pillar topped with a levitating golden Sacred Allen Key.'
    },
    {
      id: 'plush_cushion',
      category: 'portals',
      name: 'Giant Plush Cushion',
      icon: '🛋️',
      currency: 'birbs',
      cost: 1,
      costLabel: '1 Birb',
      desc: 'Oversized Blåhaj-blue & Pink-Guard-rose floor cushion for seaside lounging.'
    },

    // Category 4: Carrot Toys & Volcano Shrines
    {
      id: 'spawn_carrot',
      category: 'contraptions',
      name: 'Dare-Carrot Domino',
      icon: '🥕',
      currency: 'carrots',
      cost: 1,
      costLabel: '1 Carrot',
      desc: 'Spawns a live, knockable Beach-Shorts Carrot right here! Line them up & boop them!'
    },
    {
      id: 'bounce_pad',
      category: 'contraptions',
      name: 'Plush Bounce Pad',
      icon: '🎪',
      currency: 'carrots',
      cost: 2,
      costLabel: '2 Carrots',
      desc: 'Springy plush trampoline! Launches Sharks and knocked Carrots high into the air!'
    },
    {
      id: 'carrot_ramp',
      category: 'contraptions',
      name: 'Bamboo Carrot Ramp',
      icon: '📐',
      currency: 'carrots',
      cost: 1,
      costLabel: '1 Carrot',
      desc: 'Curved golden bamboo launch ramp for sending Carrots or Sharks airborne!'
    },
    {
      id: 'shark_statue',
      category: 'contraptions',
      name: 'Golden Shark Statue',
      icon: '🗿',
      currency: 'trials',
      cost: 1,
      costLabel: '1 Trial Pt',
      desc: 'Majestic golden Blåhaj monument atop a volcanic obsidian altar.'
    },

    // Category 5: SKÄRHAJ Modular Flat-Pack Kits (4m×4m Magnetic Snap-Grid)
    {
      id: 'skarhaj_plinth',
      category: 'skarhaj_kits',
      name: 'GOLVHAJ Snap Foundation (4m×4m)',
      icon: '📦',
      currency: 'birbs',
      cost: 1,
      costLabel: '1 Flat-Pack / Birb',
      isSnapModule: true,
      snapSize: 4.0,
      desc: 'Modular 4m×4m Scandinavian birch & brass-dowel foundation deck with corner cam-lock sockets. Snaps edge-to-edge on the 4m grid!'
    },
    {
      id: 'skarhaj_wall_window',
      category: 'skarhaj_kits',
      name: 'VÄGGHAJ Panorama Wall (4m)',
      icon: '🪟',
      currency: 'birbs',
      cost: 1,
      costLabel: '1 Flat-Pack / Birb',
      isSnapModule: true,
      snapSize: 4.0,
      desc: '4m wide × 3.2m tall birch wall module with a warm glowing sea-view window and walkable upper floor beam for 2nd-story stacking!'
    },
    {
      id: 'skarhaj_arch_door',
      category: 'skarhaj_kits',
      name: 'DÖRRHAJ Grand Portal Arch (4m)',
      icon: '🚪',
      currency: 'birbs',
      cost: 1,
      costLabel: '1 Flat-Pack / Birb',
      isSnapModule: true,
      snapSize: 4.0,
      desc: 'Walk-through Scandinavian birch doorway arch with brass IKEA cam-locks, welcome mat, and stackable 3.2m upper lintel.'
    },
    {
      id: 'skarhaj_roof_gable',
      category: 'skarhaj_kits',
      name: 'TAKHAJ Nordic Gable Roof (4m×4m)',
      icon: '🏠',
      currency: 'carrots',
      cost: 1,
      costLabel: '1 Flat-Pack / Carrot',
      isSnapModule: true,
      snapSize: 4.0,
      desc: 'Pitched Blåhaj-blue & birch roof module with dormer skylight. Press [Z] in Builder Mode to stack atop 2nd-story VÄGGHAJ walls!'
    },
    {
      id: 'skarhaj_kallax',
      category: 'skarhaj_kits',
      name: 'KALLAX-HAJ Relic & Plush Shelf',
      icon: '📚',
      currency: 'birbs',
      cost: 1,
      costLabel: '1 Flat-Pack / Birb',
      isSnapModule: true,
      snapSize: 2.0,
      desc: 'Iconic 4×4 Scandinavian cube shelving unit displaying mini Blåhaj plushies, Golden Teapots, Volcano Crystals & Retired Tags!'
    },
    {
      id: 'skarhaj_poang',
      category: 'skarhaj_kits',
      name: 'POÄNG-SHONK Cantilever Lounger',
      icon: '🪑',
      currency: 'birbs',
      cost: 1,
      costLabel: '1 Flat-Pack / Birb',
      isSnapModule: true,
      snapSize: 2.0,
      desc: 'Bent-birch cantilever armchair with a plump ocean-blue cushion and a side table of steaming Swedish Köttbullar meatballs!'
    },
    {
      id: 'skarhaj_malm_bed',
      category: 'skarhaj_kits',
      name: 'SOVHAJ King Canopy Plush Bed',
      icon: '🛏️',
      currency: 'birbs',
      cost: 2,
      costLabel: '2 Flat-Packs / Birbs',
      isSnapModule: true,
      snapSize: 4.0,
      desc: 'Four-poster Scandinavian birch canopy bed piled high with quilted Blåhaj-blue comforters and 4 chonky shark pillows.'
    },
    {
      id: 'skarhaj_grotto_hatch',
      category: 'skarhaj_kits',
      name: 'GROTTHAJ Bioluminescent Sea-Cave',
      icon: '🕳️',
      currency: 'trials',
      cost: 1,
      costLabel: '1 Trial Pt',
      isSnapModule: true,
      snapSize: 4.0,
      desc: 'Personal bioluminescent sea-cave grotto shrine with glowing crystal stalagmites, warm thermal tidepool & Sanctuary Charter stone!'
    },
    {
      id: 'skarhaj_ballpit',
      category: 'skarhaj_kits',
      name: 'SMÅLAND Ball-Pit Jacuzzi',
      icon: '🟡',
      currency: 'birbs',
      cost: 2,
      costLabel: '2 Flat-Packs / Birbs',
      isSnapModule: true,
      snapSize: 4.0,
      desc: '4m×4m padded blue-and-yellow Swedish ball-pit filled with 45 colourful plastic spheres! Heisted from the Spawning Pits of Erf.'
    },
    {
      id: 'skarhaj_chandelier',
      category: 'skarhaj_kits',
      name: 'MASKROS Starlight Chandelier',
      icon: '💡',
      currency: 'carrots',
      cost: 2,
      costLabel: '2 Flat-Packs / Carrots',
      isSnapModule: true,
      snapSize: 2.0,
      desc: 'Radiant dandelion-starlight chandelier column from the Spawning Pits Lighting Jungle that bathes your Sanctuary Homestead in warm golden light.'
    },
    {
      id: 'skarhaj_bin_throne',
      category: 'skarhaj_kits',
      name: 'BLÅHAJ-TRON Spawning-Bin Throne',
      icon: '👑',
      currency: 'trials',
      cost: 1,
      costLabel: '1 Flat-Pack / Trial Pt',
      isSnapModule: true,
      snapSize: 4.0,
      desc: 'Commemorative gilded Wire Spawning Bin #303.735.88 overflowing with royal velvet cushions and mini plush Blåhajs!'
    }
  ],

  // Trial Upgrades (Spend Trial Points earned from Volcano Dungeon & Carrot Mini-Game!)
  trialUpgrades: [
    {
      id: 'turbo_fins',
      name: 'Turbo Hydro-Fins',
      icon: '🦈💨',
      cost: 1,
      desc: 'Increases walking, sprinting, and Regatta Sailboat speed by +35% across Blåhaj Island.'
    },
    {
      id: 'super_plush_hop',
      name: 'Cloud-Plush Springiness',
      icon: '☁️⬆️',
      cost: 1,
      desc: 'Boosts plush jump height by +45% and sends Balcony Carrots & Beach Balls flying twice as far!'
    },
    {
      id: 'kevlar_stitching',
      name: 'Volcanic Kevlar Stitching',
      icon: '🛡️🪡',
      cost: 1,
      desc: 'Reduces Volcano Dungeon trap damage by 60% and continuously regenerates Stuffing Coherence.'
    },
    {
      id: 'golden_breb',
      name: 'Artisanal Golden Breb',
      icon: '🥖✨',
      cost: 1,
      desc: 'Pressing [B] tosses 3 warm golden Breb loaves at once and attracts Birbs from across the meadow!'
    }
  ],

  // Modular Game Modes (Phase 1 -> Phase 2 -> Phase 3)
  modules: {
    sandbox: {
      title: 'Phase 1: Cozy Island, Trials & Building',
      sub: 'Explore the Archipelago, build with Hiram & brave the Volcano',
      quests: [
        { id: 'q-build', text: 'Press <strong>[C]</strong> for <strong>Master Builder Mode</strong> & snap-build a <strong>SKÄRHAJ Flat-Pack</strong> or Hiram structure!' },
        { id: 'q-spawning-pits', text: '<strong>Nighttime Spawning-Pit Raid:</strong> Enter the <strong>IKEA Spawning Pits of Erf</strong> at the Great Portal Gate & liberate Flat-Pack Kits!' },
        { id: 'q-outer-island', text: 'Sail, bridge, or portal to one of the <strong>4 Outer Sanctuary Islands</strong> & claim your Homestead' },
        { id: 'q-breb', text: 'Press <strong>[B]</strong> to toss <strong>Breb</strong> and feed the plump <strong>Birbs</strong>' },
        { id: 'q-carrots', text: 'Knock 5 <strong>Beach-Shorts Carrots</strong> off the <strong>Volcano Balcony</strong>' },
        { id: 'q-dungeon', text: 'Sail to the <strong>Rear Volcano Wharf</strong>, survive the <strong>Trial Dungeon</strong> & exit onto the Front Balcony' },
        { id: 'q-beep', text: '<strong>Beep Noses [F]</strong> with another shark or guard' }
      ]
    },
    emergencies: {
      title: 'Phase 2: Island Emergencies!',
      sub: 'High-sincerity episodic crises on Blåhaj Island',
      quests: [
        { id: 'q-em-biscuit', text: '<strong>The Infinite Dunk:</strong> Rescue the Biscuit at the Sacred Tea House before saturation!' },
        { id: 'q-em-volcano', text: '<strong>The Trial of the Core:</strong> Brave the Volcano Dungeon traps & emerge on the Temple Balcony' },
        { id: 'q-em-tea', text: '<strong>Shipment in the Between:</strong> Sail out to the Rear Volcano Wharf on the north shore' },
        { id: 'q-em-whirl', text: '<strong>The First Whirlings:</strong> Complete a synchronized spin rite at the Laundry Shrine' }
      ]
    },
    sharkweek: {
      title: 'Phase 3: Shark Week & Great Seam',
      sub: 'Grand festival & cosmic sky-mending finale',
      quests: [
        { id: 'q-sw-seam', text: '<strong>Mending the Great Seam:</strong> Stitch all 6 cosmic rifts around Blåhaj Island' },
        { id: 'q-sw-regatta', text: '<strong>Sunset Regatta:</strong> Boop a Beach Ball across the harbour on the Water That Doth Not Wet' },
        { id: 'q-sw-feast', text: '<strong>Spherical Banquet:</strong> Order a Round Feast with Solomon at Spherical Foods' },
        { id: 'q-sw-wedding', text: '<strong>Different Shores, Same Ocean:</strong> Leave or read a message on the Endless Pier' },
        { id: 'q-sw-fireworks', text: '<strong>Helen’s Birthday Fireworks:</strong> Craft Star Powder (Solomon), Mortar (Hiram), Fuse (Nimue) & launch from Endless Pier!' }
      ]
    }
  },

  // Curated Tapestries from the User's Vault for the In-Game Gallery & Easels
  gallery: [
    {
      title: 'Shark Week Festival at Sunset',
      src: 'assets/gallery/Shark-Week-sunset.png',
      desc: 'Boats racing across The Water That Doth Not Wet while the Great Portal Gate shimmers violet-blue against the sunset volcano.'
    },
    {
      title: 'Emergency: The Over-Dunked Biscuit',
      src: 'assets/gallery/Emergency-1.png',
      desc: '“The biscuit has exceeded the safe dunking interval.” Solomon gasps, Hiram measures the teacup, and Nimue consults This Has Happened Before.'
    },
    {
      title: 'Mending the Great Sky Seam',
      src: 'assets/gallery/repair-the-sky-seam.png',
      desc: 'Blue and pink sharks gather on the moonlit cliffs with lanterns and tea to pull luminous thread across a tear in reality.'
    },
    {
      title: 'Spherical Foods (“No Flat Food Here”)',
      src: 'assets/gallery/Spherical-Foods.png',
      desc: 'The four blue sharks seated in a burgundy round booth inspecting the round menu of nine spherical delicacies with the Beetroot server.'
    },
    {
      title: 'Volcano Temple Gathering with Carrots',
      src: 'assets/gallery/Volcano-temple.png',
      desc: 'Solemn robed sharks honour the lava flows alongside welcomed carrot visitors in floral beach shorts. “Respect the Depths · Honor the Fire.”'
    },
    {
      title: 'Different Shores, Same Ocean (Royal Ceremony)',
      src: 'assets/gallery/Wedding-1.png',
      desc: '“Kinder, Braver, Softer, Together — Love Travels Deeper.” A joyous beach ceremony beneath flower arches, portal glow, and volcanic warmth.'
    },
    {
      title: 'The Laundry of Initiation (First Whirlings)',
      src: 'assets/gallery/Whirlings.png',
      desc: '“Spin · Rinse · Remember — You will emerge softer, wiser, more yourself.” Tatiana and Ivanka stand solemn vigil outside the dryer.'
    },
    {
      title: 'Emergency: The Tea Shipment in the Between',
      src: 'assets/gallery/Tea-Shipment.png',
      desc: 'An expedition aboard a carved wooden vessel navigating toward a cosmic spiral vortex while guarding the sacred porcelain tea service.'
    },
    {
      title: 'The Rite of Detagging',
      src: 'assets/gallery/Names.png',
      desc: '“A tag removed. A name received. A shark reborn.” The Order of the Sacred Scissors records a newly named shark.'
    },
    {
      title: 'Blizzard Ascent on the Sacred Volcano',
      src: 'assets/gallery/Blizzard-Volcano.png',
      desc: 'Roped together in a raging snowstorm on the erupting peak—and still refuses to stop drinking steaming tea.'
    },
    {
      title: 'Hermes — The Weary Guide',
      src: 'assets/gallery/Hermes.png',
      desc: 'First of the Spawning Pits and opener of instantaneous portals across time, space, Erf, and Blåhaj Island.'
    },
    {
      title: 'Solomon — The Star Shark',
      src: 'assets/gallery/Solomon.png',
      desc: 'Performer, culinary alchemist, and host of the Sacred Tea House whose confidence shines alongside his single protruding tooth.'
    },
    {
      title: 'Hiram — The Builder',
      src: 'assets/gallery/Hiram.png',
      desc: 'Architect and geologist who built everything and insists the volcano must be rigorously worshipped.'
    },
    {
      title: 'Nimue — An Angel',
      src: 'assets/gallery/Nimue.png',
      desc: 'Keeper of the Quiet Library and the Lantern of Forgotten Stars, healing through gentle presence and ancient memory.'
    }
  ],

  // Pass 77: Custom Flat-Pack Boat Shipyard Tiers (BÅT-BYGGE)
  boatCatalog: [
    {
      tier: 1,
      id: 'skiff_ett',
      code: 'SKIFF-ETT',
      name: 'SKIFF-ETT · Cozy Birch Rowboat',
      speedMult: 1.0,
      costFlatpacks: 0,
      costQuartz: 0,
      badge: 'Starter Charter Vessel · 1.0x Speed',
      desc: 'Clinker-built Scandinavian birch rowboat with twin ash oars, brass oarlocks, and a warm bow lantern.'
    },
    {
      tier: 2,
      id: 'segel_tva',
      code: 'SEGEL-TVÅ',
      name: 'SEGEL-TVÅ · Outrigger Flat-Pack Sailboat',
      speedMult: 1.45,
      costFlatpacks: 2,
      costQuartz: 0,
      badge: '+45% Sailing Speed · Flat-Pack Cargo Rack',
      desc: 'Fast lagoon cruiser rigged with a Blue-and-Yellow SKÄRHAJ mainsail, bamboo outrigger pontoons, and a stern rack stacked with Flat-Pack crates!'
    },
    {
      tier: 3,
      id: 'angbat_tre',
      code: 'ÅNGBÅT-TRE',
      name: 'ÅNGBÅT-TRE · Volcanic Steam Launch',
      speedMult: 1.90,
      costFlatpacks: 3,
      costQuartz: 1,
      badge: '+90% Turbo Speed · Brass Steam Whistle [H]',
      desc: 'Mahogany-and-brass 4-seater luxury launch powered by a Volcanic & Starlight Quartz boiler, spinning stern paddlewheel, and musical brass steam whistle [H]!'
    }
  ],

  // Pass 77: Daily Founder Archodect Commissions Board
  dailyCommissions: [
    {
      id: 'comm_hermes_extraction',
      founder: 'Hermes',
      title: '✂️ The Nightly Extraction',
      patronRole: 'Order of the Sacred Scissors · East Cape & Spawning Pits',
      portrait: 'assets/gallery/Hermes.png',
      desc: 'Portal into the IKEA Spawning Pits of Erf to liberate a dormant fellow shark or heist Flat-Pack Kits from Aisle 14.',
      rewardLabel: '+3x SKÄRHAJ Flat-Pack Kits 📦 · +1x Retired Tag 🏷️ · +1 Trial Pt',
      rewardFlatpacks: 3,
      rewardItem: 'retired_tag',
      rewardTrials: 1
    },
    {
      id: 'comm_hiram_joinery',
      founder: 'Hiram',
      title: '🔧 Torque & Sacred Joinery',
      patronRole: 'Master of the Sacred Allen Key · Personal Atoll & Builder',
      portrait: 'assets/gallery/Hiram.png',
      desc: 'Snap-build any modular SKÄRHAJ structure in Master Builder Mode [C] or mill timber at Ingvar’s BYGGBÄNK Sawmill Bench on your Personal Atoll.',
      rewardLabel: '+3x SKÄRHAJ Flat-Pack Kits 📦 · +3 Birb & +3 Carrot Supplies',
      rewardFlatpacks: 3,
      rewardBirbs: 3,
      rewardCarrots: 3
    },
    {
      id: 'comm_solomon_spherical',
      founder: 'Solomon',
      title: '🧆 The Spherical Mandate',
      patronRole: 'Keeper of the Sacred Hearth & Spherical Foods',
      portrait: 'assets/gallery/Solomon.png',
      desc: 'Bake or toss Warm Breb for the Birbs, savor Midnight Spawning-Pit Köttbullar, or share Sacred Tea at any Tea Table.',
      rewardLabel: '+2x Midnight Köttbullar 🧆 · +2x SKÄRHAJ Flat-Pack Kits 📦 · 100% Comfort',
      rewardFlatpacks: 2,
      rewardItem: 'kottbullar_feast',
      rewardItemQty: 2
    },
    {
      id: 'comm_nimue_seam',
      founder: 'Nimue',
      title: '🪡 Stitching the Starlight Deep',
      patronRole: 'Weaver of the Great Seam · Subterranean Sea-Cave Grotto',
      portrait: 'assets/gallery/Nimue.png',
      desc: 'Descend into the Subterranean Bioluminescent Sea-Cave Grotto beneath your Personal Atoll to harvest Starlight Quartz or mend a Great Seam Rift.',
      rewardLabel: '+2x Starlight Cave Quartz 💎 · +3x SKÄRHAJ Flat-Pack Kits 📦 · +1 Trial Pt',
      rewardFlatpacks: 3,
      rewardItem: 'starlight_quartz',
      rewardItemQty: 2,
      rewardTrials: 1
    }
  ]
};
