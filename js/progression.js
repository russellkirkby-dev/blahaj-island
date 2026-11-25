// ============================================================================
// BLÅHAJ ISLAND — FOUR WORLDS, INITIATIC DEGREES & MENTOR CURRENTS (v19.1)
// ============================================================================
// Single-source-of-truth declarative registry for:
//   • The Four Worlds (Plushiah -> Fintzirah -> Brewiah -> Sharkziluth)
//   • The Ten Initiatic Degrees (1°=10□ -> 10°=1□) + 0°=0□ Probationer
//   • The Four Mentor Currents (Hermes, Solomon, Hiram, Nimue — never "classes")
//   • Skill Tree Nodes, Reputation Tiers & Founder Veteran Profiles (5°=6□)
//   • Extensible Trials / Instance Milestones + Kept Equipment & Relics
//     (including The Brab of Shame mythic relic hook for future quest lines)
// ============================================================================

window.BlahajProgression = (function () {
  const ORDERED_ACTION_SLOTS = ['1', '2', '3', '4', '5', '6', 'q', 'e', 'r', 'f', 'shift+1', 'shift+2'];

  // --------------------------------------------------------------------------
  // 1. THE FOUR WORLDS (4 Octaves of the 10-Degree Tree)
  // --------------------------------------------------------------------------
  const WORLDS = [
    {
      world: 1,
      id: 'plushiah',
      name: 'Plushiah',
      kabbalahRef: 'Assiah (Action)',
      element: 'Earth · Fleece & Ashlar',
      guardianId: 'hiram',
      icon: '🧶',
      lore: 'The World of Action, Stitching & Flat-Pack Form. Every shark begins here, grounded in plush, wood, and brass.'
    },
    {
      world: 2,
      id: 'fintzirah',
      name: 'Fintzirah',
      kabbalahRef: 'Yetzirah (Formation)',
      element: 'Air · Lantern & Threshold',
      guardianId: 'hermes',
      icon: '🏮',
      lore: 'The World of Formation, Breath & Thresholds. Cycling back to 1°=10□ in Fintzirah widens your Tree across Mentor Currents.'
    },
    {
      world: 3,
      id: 'brewiah',
      name: 'Brewiah',
      kabbalahRef: 'Briah (Creation)',
      element: 'Water · Cup, Tea & Loaf',
      guardianId: 'solomon',
      icon: '🫖',
      lore: 'The World of Creation, Living Tea & Warm Loaves. Deepens alchemical restoration, party resonance, and relic craft.'
    },
    {
      world: 4,
      id: 'sharkziluth',
      name: 'Sharkziluth',
      kabbalahRef: 'Atziluth (Emanation)',
      element: 'Spirit · Silver Star & Seam',
      guardianId: 'nimue',
      icon: '✨',
      lore: 'The World of Star-Emanation & the Unwet Ocean. All four Currents weave into one luminous, unfrayable Tree.'
    }
  ];

  // --------------------------------------------------------------------------
  // 2. PROBATIONER (0°=0□) + THE TEN INITIATIC DEGREES (1°=10□ -> 10°=1□)
  // --------------------------------------------------------------------------
  const PROBATIONER_DEGREE = {
    level: 0,
    cipher: '0°=0□',
    title: 'Probationer of Wire Bin #303',
    sephirah: 'Threshold',
    maxStuffingBonus: 0,
    dmgBonusPct: 0,
    lore: 'Barcode tag newly snipped; True Name freshly inscribed in the Book of Named Sharks. Two or three starter arts awaken in the fins.'
  };

  const DEGREES = [
    {
      level: 1,
      cipher: '1°=10□',
      title: 'Neophyte of the Dry Surf',
      sephirah: 'Malkuth',
      maxStuffingBonus: 4,
      dmgBonusPct: 4,
      lore: 'First steps into the Water That Doth Not Wet without losing plush loft.'
    },
    {
      level: 2,
      cipher: '2°=9□',
      title: 'Zelator of the Tidal Eddy',
      sephirah: 'Yesod',
      maxStuffingBonus: 8,
      dmgBonusPct: 8,
      lore: 'Grounded in shifting currents, steady footwork, and the tending of one’s stitches.'
    },
    {
      level: 3,
      cipher: '3°=8□',
      title: 'Practicus of the Wayfinder’s Lamp',
      sephirah: 'Hod',
      maxStuffingBonus: 12,
      dmgBonusPct: 12,
      lore: 'Schooled in crisp fin-parry, clever riddles, and the geometry of portals.'
    },
    {
      level: 4,
      cipher: '4°=7□',
      title: 'Philosophus of the Warm Loaf',
      sephirah: 'Netzach',
      maxStuffingBonus: 16,
      dmgBonusPct: 16,
      lore: 'Knows why the Birbs gather and how Star-Fire sleeps inside ordinary crust.'
    },
    {
      level: 5,
      cipher: '5°=6□',
      title: 'Adept of the Inner Atoll',
      sephirah: 'Tiphareth',
      maxStuffingBonus: 22,
      dmgBonusPct: 22,
      lore: 'Balanced at the solar heart of the Archipelago. The Sacred Four walk the island from this seasoned degree.'
    },
    {
      level: 6,
      cipher: '6°=5□',
      title: 'Adept of the Obsidian Vault',
      sephirah: 'Geburah',
      maxStuffingBonus: 28,
      dmgBonusPct: 26,
      lore: 'Unshaken beneath basalt arches, volcanic steam, and rogue root-beasts.'
    },
    {
      level: 7,
      cipher: '7°=4□',
      title: 'Exempt Swimmer of the First Whirlings',
      sephirah: 'Chesed',
      maxStuffingBonus: 34,
      dmgBonusPct: 30,
      lore: 'Spun clean in the Master Washer of the Deep Laundromat and emerged luminous.'
    },
    {
      level: 8,
      cipher: '8°=3□',
      title: 'Magister of the Great Seam',
      sephirah: 'Binah',
      maxStuffingBonus: 40,
      dmgBonusPct: 35,
      lore: 'Has crossed the Frayed Abyss without spilling a single tuft of cotton.'
    },
    {
      level: 9,
      cipher: '9°=2□',
      title: 'Magus of the Star-Saucer',
      sephirah: 'Chokmah',
      maxStuffingBonus: 48,
      dmgBonusPct: 40,
      lore: 'Speaks a single shonk across orbital void, hyperspace tunnel, and island hearth.'
    },
    {
      level: 10,
      cipher: '10°=1□',
      title: 'Sovereign of the Unwet Ocean',
      sephirah: 'Kether',
      maxStuffingBonus: 56,
      dmgBonusPct: 46,
      lore: 'Every stitch a star; ready to spiral into the next World of the Tree.'
    }
  ];

  // --------------------------------------------------------------------------
  // 3. MENTOR REPUTATION TIERS
  // --------------------------------------------------------------------------
  const REPUTATION_TIERS = [
    { id: 'initiate', minRep: 0, label: 'Probationer', badge: '🕯️ Probationer' },
    { id: 'zelator', minRep: 25, label: 'Trusted Companion', badge: '🌙 Trusted' },
    { id: 'adept', minRep: 60, label: 'Sworn of the Current', badge: '⭐ Sworn' },
    { id: 'ipsissimus', minRep: 100, label: 'Pillar of the Current', badge: '☀️ Pillar' }
  ];

  // --------------------------------------------------------------------------
  // 4. THE FOUR MENTOR CURRENTS (Never called "classes")
  // --------------------------------------------------------------------------
  const MENTOR_CURRENTS = {
    hermes: {
      id: 'hermes',
      mentorName: 'Hermes',
      mentorSubtitle: 'The Mangy One · Guide of the Between',
      currentName: 'Current of the Liminal Lantern',
      shortLabel: 'Liminal Lantern',
      worldAffinity: 'Fintzirah',
      icon: '🏮',
      accentHex: '#f59e0b',
      instrument: 'Brass Between-Lantern & Wayfinder’s Fin (Air · Thresholds)',
      maxim: '“Every threshold is home to the shark who knows the step between.”',
      summary: 'Swift threshold lunges, parry-ripostes, geyser leaps, and wayfinding across rifts and portals.',
      recommendedStarters: ['poky_fin_strike', 'single_fin_lunge', 'snoot_boop'],
      starterCandidates: ['poky_fin_strike', 'single_fin_lunge', 'snoot_boop', 'fin_deflection', 'breb_volley']
    },
    solomon: {
      id: 'solomon',
      mentorName: 'Solomon',
      mentorSubtitle: 'The Star Shark · Keeper of Cup & Loaf',
      currentName: 'Current of the Star-Cup & Loaf',
      shortLabel: 'Star-Cup & Loaf',
      worldAffinity: 'Brewiah',
      icon: '🍵',
      accentHex: '#fbbf24',
      instrument: 'Porcelain Teacup & Warm Loaves of Light (Water & Hearth · Creation)',
      maxim: '“Steep with pure will; let every warm loaf be a small sun upon the water.”',
      summary: 'Ceremonial Tea restoration, ranged Loaves of Light volleys, Star-Powder arcs, and radiant hearth wards.',
      recommendedStarters: ['poky_fin_strike', 'breb_volley', 'soothing_tea_pulse'],
      starterCandidates: ['poky_fin_strike', 'breb_volley', 'soothing_tea_pulse', 'tail_swipe', 'plush_groom']
    },
    hiram: {
      id: 'hiram',
      mentorName: 'Hiram',
      mentorSubtitle: 'The Builder · Master of the Plumb-Line',
      currentName: 'Current of the Brass Hex & Ashlar',
      shortLabel: 'Brass Hex & Ashlar',
      worldAffinity: 'Plushiah',
      icon: '🔧',
      accentHex: '#38bdf8',
      instrument: 'Sacred M10 Brass Hex Key & Architect’s Square (Earth · Action)',
      maxim: '“By six faces of brass is the rough flat-pack squared into an eternal Vault.”',
      summary: 'Heavy structural cleaves, 360° whirlpool stonework spins, unbreakable Double-Fin Aegis, and crisp deflections.',
      recommendedStarters: ['poky_fin_strike', 'tail_swipe', 'double_fin_defense'],
      starterCandidates: ['poky_fin_strike', 'tail_swipe', 'double_fin_defense', 'fin_deflection', 'single_fin_lunge']
    },
    nimue: {
      id: 'nimue',
      mentorName: 'Nimue',
      mentorSubtitle: 'An Angel · Weaver of the Silver Star',
      currentName: 'Current of the Silver Star & Seam',
      shortLabel: 'Silver Star & Seam',
      worldAffinity: 'Sharkziluth',
      icon: '✨',
      accentHex: '#c084fc',
      instrument: 'Violet Star-Crystal & Golden Seam-Needle (Spirit · Emanation)',
      maxim: '“Every shark and every stitch is a star in the Great Plush Firmament.”',
      summary: 'Graceful seam-mending lunges, soothing fleece grooming, astral deflections, and serene sanctum pulses.',
      recommendedStarters: ['poky_fin_strike', 'plush_groom', 'fin_deflection'],
      starterCandidates: ['poky_fin_strike', 'plush_groom', 'fin_deflection', 'soothing_tea_pulse', 'snoot_boop']
    }
  };

  // --------------------------------------------------------------------------
  // 5. SKILL TREE NODES (Mapped to 0°=0□ .. 10°=1□ & Mentor Currents)
  // --------------------------------------------------------------------------
  const SKILL_NODES = {
    poky_fin_strike: {
      abilityId: 'poky_fin_strike',
      mentorId: 'hiram',
      sharedStarter: true,
      tier: 1,
      minDegree: 0,
      skillPointCost: 1,
      crossMentorRepReq: 0,
      initiaticNote: 'First Point of the Fin: channels whatever Sacred Instrument rests in your Fin-Slot [H].'
    },
    snoot_boop: {
      abilityId: 'snoot_boop',
      mentorId: 'hermes',
      sharedStarter: true,
      tier: 1,
      minDegree: 0,
      skillPointCost: 1,
      crossMentorRepReq: 0,
      initiaticNote: 'The Traditional Archipelago Greeting & Banishing Boop—gentle to friends, decisive to pests.'
    },
    plush_groom: {
      abilityId: 'plush_groom',
      mentorId: 'nimue',
      sharedStarter: true,
      tier: 1,
      minDegree: 0,
      skillPointCost: 1,
      crossMentorRepReq: 0,
      initiaticNote: 'Lustration of the Pile: smooths frayed seams and restores –20% Mange capacity.'
    },
    breb_volley: {
      abilityId: 'breb_volley',
      mentorId: 'solomon',
      sharedStarter: true,
      tier: 2,
      minDegree: 1,
      skillPointCost: 1,
      crossMentorRepReq: 0,
      initiaticNote: 'Cakes & Loaves of Warmth cast forth upon the meadow to delight Birbs or scatter foes.'
    },
    single_fin_lunge: {
      abilityId: 'single_fin_lunge',
      mentorId: 'hermes',
      sharedStarter: true,
      tier: 2,
      minDegree: 1,
      skillPointCost: 1,
      crossMentorRepReq: 25,
      initiaticNote: 'Step Across the Threshold: closes gaps in a single breath and primes a Cross-Slash.'
    },
    tail_swipe: {
      abilityId: 'tail_swipe',
      mentorId: 'hiram',
      sharedStarter: true,
      tier: 2,
      minDegree: 1,
      skillPointCost: 1,
      crossMentorRepReq: 25,
      initiaticNote: 'Compasses of the Caudal Fin: traces a 180° arc that squares unruly crowds.'
    },
    fin_deflection: {
      abilityId: 'fin_deflection',
      mentorId: 'nimue',
      sharedStarter: true,
      tier: 3,
      minDegree: 2,
      skillPointCost: 1,
      crossMentorRepReq: 25,
      initiaticNote: 'Sign of Silence & Rebound: turns incoming strikes into starlit counter-momentum.'
    },
    soothing_tea_pulse: {
      abilityId: 'soothing_tea_pulse',
      mentorId: 'solomon',
      sharedStarter: true,
      tier: 3,
      minDegree: 2,
      skillPointCost: 1,
      crossMentorRepReq: 25,
      initiaticNote: 'Eucharist of Bergamot & Steam: restores Stuffing Coherence and cleanses nearby allies.'
    },
    double_fin_defense: {
      abilityId: 'double_fin_defense',
      mentorId: 'hiram',
      sharedStarter: true,
      tier: 4,
      minDegree: 3,
      skillPointCost: 1,
      crossMentorRepReq: 50,
      initiaticNote: 'Pillars of Severity & Mildness: crossed pectoral fins form an unyielding plush ashlar.'
    },
    tail_spin: {
      abilityId: 'tail_spin',
      mentorId: 'hiram',
      sharedStarter: false,
      tier: 5,
      minDegree: 4,
      skillPointCost: 1,
      crossMentorRepReq: 50,
      initiaticNote: 'The Whirling Lathe: 360° airborne caudal cyclone taught in Hiram’s deep turnery.'
    },
    hydro_tail_launch: {
      abilityId: 'hydro_tail_launch',
      mentorId: 'hermes',
      sharedStarter: false,
      tier: 5,
      minDegree: 4,
      skillPointCost: 1,
      crossMentorRepReq: 50,
      initiaticNote: 'Ascent Upon the Unwet Geyser: vaults cliffs, rifts, and broken temple bridges.'
    },
    founder_signature: {
      abilityId: 'founder_signature',
      mentorId: 'nimue',
      sharedStarter: false,
      tier: 6,
      minDegree: 5,
      skillPointCost: 1,
      crossMentorRepReq: 60,
      initiaticNote: 'Invocation of the True Motto: unleashes the Sovereign Relic Resonance of your Current.'
    }
  };

  // --------------------------------------------------------------------------
  // 6. FOUNDER VETERAN PROFILES (World I: Plushiah · 5°=6□ with 7 Specialty Arts)
  // --------------------------------------------------------------------------
  const FOUNDER_PROFILES = {
    hermes: {
      world: 1,
      level: 5,
      mentorId: 'hermes',
      skillPoints: 0,
      mentorRep: { hermes: 100, solomon: 35, hiram: 35, nimue: 40 },
      learnedAbilities: [
        'poky_fin_strike',
        'single_fin_lunge',
        'fin_deflection',
        'breb_volley',
        'hydro_tail_launch',
        'snoot_boop',
        'founder_signature'
      ],
      defaultBar: {
        '1': 'poky_fin_strike',
        '2': 'single_fin_lunge',
        '3': 'breb_volley',
        '4': 'hydro_tail_launch',
        '5': 'founder_signature',
        'e': 'fin_deflection',
        'f': 'snoot_boop'
      }
    },
    solomon: {
      world: 1,
      level: 5,
      mentorId: 'solomon',
      skillPoints: 0,
      mentorRep: { hermes: 35, solomon: 100, hiram: 35, nimue: 40 },
      learnedAbilities: [
        'poky_fin_strike',
        'tail_swipe',
        'breb_volley',
        'soothing_tea_pulse',
        'double_fin_defense',
        'plush_groom',
        'founder_signature'
      ],
      defaultBar: {
        '1': 'poky_fin_strike',
        '2': 'tail_swipe',
        '3': 'breb_volley',
        '4': 'soothing_tea_pulse',
        '5': 'founder_signature',
        'r': 'double_fin_defense',
        'q': 'plush_groom'
      }
    },
    hiram: {
      world: 1,
      level: 5,
      mentorId: 'hiram',
      skillPoints: 0,
      mentorRep: { hermes: 35, solomon: 35, hiram: 100, nimue: 35 },
      learnedAbilities: [
        'poky_fin_strike',
        'single_fin_lunge',
        'tail_swipe',
        'tail_spin',
        'fin_deflection',
        'double_fin_defense',
        'founder_signature'
      ],
      defaultBar: {
        '1': 'poky_fin_strike',
        '2': 'single_fin_lunge',
        '3': 'tail_swipe',
        '4': 'founder_signature',
        'q': 'tail_spin',
        'e': 'fin_deflection',
        'r': 'double_fin_defense'
      }
    },
    nimue: {
      world: 1,
      level: 5,
      mentorId: 'nimue',
      skillPoints: 0,
      mentorRep: { hermes: 40, solomon: 40, hiram: 35, nimue: 100 },
      learnedAbilities: [
        'poky_fin_strike',
        'single_fin_lunge',
        'fin_deflection',
        'soothing_tea_pulse',
        'plush_groom',
        'snoot_boop',
        'founder_signature'
      ],
      defaultBar: {
        '1': 'poky_fin_strike',
        '2': 'single_fin_lunge',
        '3': 'soothing_tea_pulse',
        '4': 'founder_signature',
        'q': 'plush_groom',
        'e': 'fin_deflection',
        'f': 'snoot_boop'
      }
    }
  };

  // --------------------------------------------------------------------------
  // 7. EXTENSIBLE INSTANCE / TRIAL MILESTONES REGISTRY (Pass 2 Active!)
  // Clearing a Trial grants +1 Degree (spiraling to the next World after 10°=1□),
  // +1 Skill Point, Mentor Reputation, and a kept Relic / Equipment item!
  // --------------------------------------------------------------------------
  const TRIALS = [
    {
      id: 'spawning_pits_escape',
      name: 'Awakening from Wire Bin #303',
      zone: 'spawning_pits',
      mentorAffinity: 'hermes',
      degreeGrant: 1,
      skillPointsGrant: 1,
      repGrant: 20,
      keepsakeDropId: 'retired_tag',
      desc: 'Slip past the Showroom Guards and step free of the IKEA Spawning Pits on Erf.'
    },
    {
      id: 'great_seam_first_mend',
      name: 'Vigil of the Frayed Seam',
      zone: 'island',
      mentorAffinity: 'nimue',
      degreeGrant: 1,
      skillPointsGrant: 1,
      repGrant: 20,
      keepsakeDropId: 'seam_needle',
      desc: 'Seal an active Great Seam Rift and restore astral equilibrium along the shore.'
    },
    {
      id: 'spherical_foods_banquet',
      name: 'Mystery of the Spherical Banquet',
      zone: 'spherical_foods',
      mentorAffinity: 'solomon',
      degreeGrant: 1,
      skillPointsGrant: 1,
      repGrant: 25,
      keepsakeDropId: 'celestial_boba',
      desc: 'Commune in the Hall of Spherical Foods and master the round symmetry of nourishment.'
    },
    {
      id: 'laundromat_first_whirlings',
      name: 'Ordeal of the First Whirlings',
      zone: 'laundromat',
      mentorAffinity: 'nimue',
      degreeGrant: 1,
      skillPointsGrant: 1,
      repGrant: 25,
      keepsakeDropId: 'lavender_dryer_sheet',
      desc: 'Complete a cycle in Mega Washer #7 of the Deep Laundromat and emerge clean-fluffed.'
    },
    {
      id: 'volcano_obsidian_sanctum',
      name: 'Descent into the Obsidian Vault',
      zone: 'volcano',
      mentorAffinity: 'hiram',
      degreeGrant: 1,
      skillPointsGrant: 1,
      repGrant: 30,
      keepsakeDropId: 'hex_key',
      desc: 'Conquer the Volcano Dungeon’s carrot traps and claim Hiram’s deep-stone blessing.'
    },
    {
      id: 'orbital_karman_ascent',
      name: 'Ascent Beyond the Karman Veil',
      zone: 'space',
      mentorAffinity: 'hermes',
      degreeGrant: 1,
      skillPointsGrant: 1,
      repGrant: 30,
      keepsakeDropId: 'star_saucer_compass',
      desc: 'Pilot the S.S. Shonk-Saucer Mk. VII to the 185m Karman Orbital Ceiling.'
    },
    {
      id: 'cheese_moon_expedition',
      name: 'Pilgrimage to the Gouda Crater',
      zone: 'cheese_moon',
      mentorAffinity: 'solomon',
      degreeGrant: 1,
      skillPointsGrant: 1,
      repGrant: 35,
      keepsakeDropId: 'lunar_cheese_wheel',
      desc: 'Blast into the Cheese Moon’s Interior Crater and raise Hermes’s Between-Seam Relay Dish.'
    }
  ];

  // Extensible Relic / Equipment Keepsake Registry (includes The Breb of Shame!)
  const RELIC_KEEPSAKES = {
    retired_tag: { id: 'retired_tag', name: 'Retired Spawning-Pit Tag', slot: 'trinket', icon: '🏷️', rarity: 'legendary' },
    hex_key: { id: 'hex_key', name: 'Sacred Hex Key M10', slot: 'fin', icon: '🔧', rarity: 'epic' },
    sacred_scissors: { id: 'sacred_scissors', name: 'Golden Scissors of the Order', slot: 'fin', icon: '✂️', rarity: 'epic' },
    ingvar_tape: { id: 'ingvar_tape', name: 'Ingvar’s Brass Measuring Tape', slot: 'fin', icon: '📏', rarity: 'epic' },
    seam_needle: { id: 'seam_needle', name: 'Golden Seam Needle', slot: 'relic', icon: '🪡', rarity: 'epic' },
    lavender_dryer_sheet: { id: 'lavender_dryer_sheet', name: 'Astral Lavender Dryer Sheet', slot: 'trinket', icon: '🫧', rarity: 'epic' },
    star_saucer_compass: { id: 'star_saucer_compass', name: 'Karman Aetheric Compass', slot: 'relic', icon: '🧭', rarity: 'epic' },
    lunar_cheese_wheel: { id: 'lunar_cheese_wheel', name: 'Aged Gouda Crater Wheel', slot: 'consumable', icon: '🧀', rarity: 'legendary' },
    breb_of_shame: {
      id: 'breb_of_shame',
      name: 'The Breb of Shame',
      slot: 'relic',
      icon: '🥖✨',
      rarity: 'mythic',
      minWorld: 2,
      futureQuestId: 'q_breb_of_shame',
      desc: 'An absurdly radiant, slightly over-toasted sourdough relic spoken of only in Fintzirah and Sharkziluth whispers. Reserved for a future high-initiate quest line.'
    }
  };

  // --------------------------------------------------------------------------
  // HELPERS, WORLD-SPIRAL MATH & PUBLIC EXTENSION API
  // --------------------------------------------------------------------------
  function getWorldInfo(worldNum) {
    const idx = Math.max(1, Math.min(WORLDS.length, Math.round(Number(worldNum) || 1)));
    return WORLDS.find((w) => w.world === idx) || WORLDS[0];
  }

  function getAllWorlds() {
    return WORLDS;
  }

  function getMaxDegree() {
    return 10;
  }

  function getDegreeInfo(level) {
    const num = Math.round(Number(level) ?? 0);
    if (num <= 0) return PROBATIONER_DEGREE;
    const clamped = Math.max(1, Math.min(getMaxDegree(), num));
    return DEGREES.find((d) => d.level === clamped) || DEGREES[0];
  }

  function getTotalInitiationRank(prog) {
    const w = Math.max(1, Math.min(WORLDS.length, Math.round(Number(prog?.world) || 1)));
    const lv = Math.max(0, Math.min(10, Math.round(Number(prog?.level) ?? 0)));
    if (lv === 0) return 0;
    return (w - 1) * 10 + lv;
  }

  function formatDegreeBadge(prog) {
    const wInfo = getWorldInfo(prog?.world || 1);
    const dInfo = getDegreeInfo(prog?.level ?? 0);
    if (dInfo.level === 0) return `${dInfo.cipher} · ${wInfo.name}`;
    return `${dInfo.cipher} · ${wInfo.name}`;
  }

  function getMentorCurrent(mentorId) {
    return MENTOR_CURRENTS[mentorId] || MENTOR_CURRENTS.hermes;
  }

  function getAllMentorCurrents() {
    return Object.values(MENTOR_CURRENTS);
  }

  function getSkillNode(abilityId) {
    return SKILL_NODES[abilityId] || {
      abilityId,
      mentorId: 'hermes',
      sharedStarter: false,
      tier: 3,
      minDegree: 2,
      skillPointCost: 1,
      crossMentorRepReq: 25,
      initiaticNote: 'Archipelago Fin & Tail Technique.'
    };
  }

  function getReputationTier(repPoints) {
    const val = Number(repPoints) || 0;
    let current = REPUTATION_TIERS[0];
    for (let i = 0; i < REPUTATION_TIERS.length; i++) {
      if (val >= REPUTATION_TIERS[i].minRep) current = REPUTATION_TIERS[i];
    }
    return current;
  }

  function buildEmptyActionBar() {
    const bar = {};
    ORDERED_ACTION_SLOTS.forEach((k) => { bar[k] = null; });
    return bar;
  }

  function buildActionBarFromSkills(skillIds, preferredMap = null) {
    const bar = buildEmptyActionBar();
    const validSkills = Array.isArray(skillIds) ? skillIds.filter(Boolean) : [];
    const placed = new Set();

    if (preferredMap && typeof preferredMap === 'object') {
      ORDERED_ACTION_SLOTS.forEach((slotKey) => {
        const abId = preferredMap[slotKey];
        if (abId && validSkills.includes(abId) && !placed.has(abId)) {
          bar[slotKey] = abId;
          placed.add(abId);
        }
      });
    }

    validSkills.forEach((abId) => {
      if (placed.has(abId)) return;
      const freeSlot = ORDERED_ACTION_SLOTS.find((k) => !bar[k]);
      if (freeSlot) {
        bar[freeSlot] = abId;
        placed.add(abId);
      }
    });

    return bar;
  }

  function buildDefaultProgressionForShark(sharkId, customOpts = {}) {
    if (FOUNDER_PROFILES[sharkId]) {
      const fp = FOUNDER_PROFILES[sharkId];
      const learned = [...fp.learnedAbilities];
      return {
        world: fp.world || 1,
        level: fp.level,
        skillPoints: fp.skillPoints,
        mentorId: fp.mentorId,
        mentorRep: { ...fp.mentorRep },
        clearedTrials: [],
        learnedAbilities: learned,
        actionBar: buildActionBarFromSkills(learned, fp.defaultBar)
      };
    }

    const mentorId = MENTOR_CURRENTS[customOpts.mentorId] ? customOpts.mentorId : 'hermes';
    const current = getMentorCurrent(mentorId);
    const chosenStarters = Array.isArray(customOpts.starterSkills) && customOpts.starterSkills.length > 0
      ? customOpts.starterSkills.slice(0, 3)
      : [...current.recommendedStarters];

    return {
      world: 1,
      level: 0, // 0°=0□ Probationer of Wire Bin #303
      skillPoints: 0,
      mentorId,
      mentorRep: {
        hermes: mentorId === 'hermes' ? 15 : 0,
        solomon: mentorId === 'solomon' ? 15 : 0,
        hiram: mentorId === 'hiram' ? 15 : 0,
        nimue: mentorId === 'nimue' ? 15 : 0
      },
      clearedTrials: [],
      learnedAbilities: chosenStarters,
      actionBar: buildActionBarFromSkills(chosenStarters)
    };
  }

  function getCharacterProgression(sharkId) {
    const saveSys = window.BlahajSaveSystem;
    if (saveSys && typeof saveSys.getCharacterProgressionRecord === 'function') {
      const rec = saveSys.getCharacterProgressionRecord(sharkId);
      if (rec) return rec;
    }
    return buildDefaultProgressionForShark(sharkId);
  }

  function evaluateSkillEligibility(sharkId, abilityId) {
    const prog = getCharacterProgression(sharkId);
    const node = getSkillNode(abilityId);
    const learned = Array.isArray(prog.learnedAbilities) && prog.learnedAbilities.includes(abilityId);
    if (learned) {
      return { canLearn: false, alreadyLearned: true, reason: 'Learned', node, prog };
    }

    const effectiveRank = getTotalInitiationRank(prog);
    const sp = prog.skillPoints || 0;
    const isOwnMentor = prog.mentorId === node.mentorId;
    const repWithTreeMentor = (prog.mentorRep && prog.mentorRep[node.mentorId]) || 0;
    const repNeeded = isOwnMentor ? 0 : (node.crossMentorRepReq || 0);

    if (effectiveRank < node.minDegree) {
      const deg = getDegreeInfo(node.minDegree);
      return {
        canLearn: false,
        alreadyLearned: false,
        lockedByDegree: true,
        reason: `Requires ${deg.cipher} · ${deg.title}`,
        node,
        prog
      };
    }

    if (!isOwnMentor && repWithTreeMentor < repNeeded) {
      const mCur = getMentorCurrent(node.mentorId);
      const rTier = getReputationTier(repNeeded);
      return {
        canLearn: false,
        alreadyLearned: false,
        lockedByRep: true,
        reason: `Cross-Current: Requires ${rTier.label} (${repNeeded} Rep) with ${mCur.mentorName}`,
        node,
        prog
      };
    }

    if (sp < (node.skillPointCost || 1)) {
      return {
        canLearn: false,
        alreadyLearned: false,
        lockedByPoints: true,
        reason: `Requires ${node.skillPointCost || 1} Skill Point (Clear Trials to ascend Degrees)`,
        node,
        prog
      };
    }

    return {
      canLearn: true,
      alreadyLearned: false,
      reason: `Spend ${node.skillPointCost || 1} Skill Point to Initiate`,
      node,
      prog
    };
  }

  /**
   * Advances a character's Degree by `steps` (spiraling smoothly from 10°=1□
   * into 1°=10□ of the next World: Plushiah -> Fintzirah -> Brewiah -> Sharkziluth).
   */
  function advanceDegreeInPlace(rec, steps = 1) {
    let w = Math.max(1, Math.min(WORLDS.length, Math.round(Number(rec.world) || 1)));
    let lv = Math.max(0, Math.min(10, Math.round(Number(rec.level) ?? 0)));
    let spiraledWorld = false;

    for (let i = 0; i < steps; i++) {
      if (lv < 10) {
        lv += 1;
      } else if (w < WORLDS.length) {
        w += 1;
        lv = 1;
        spiraledWorld = true;
      }
    }

    rec.world = w;
    rec.level = lv;
    return { world: w, level: lv, spiraledWorld };
  }

  /**
   * Pass 2: Complete an Instance / Trial for the active (or specified) character.
   * Grants +1 Degree (with World-Spiral after 10°=1□), +Skill Points, Mentor Rep,
   * and permanent kept Relic/Equipment drop into that character's personal Satchel!
   */
  function completeTrial(trialId, sharkId = null) {
    const trial = TRIALS.find((t) => t.id === trialId);
    if (!trial) return null;

    const g = window.BlahajGame;
    const sId = sharkId || (window.player && window.player.sharkId) || 'hermes';
    const saveSys = window.BlahajSaveSystem;
    let outcome = null;

    if (saveSys && typeof saveSys.updateCharacterProgressionRecord === 'function') {
      saveSys.updateCharacterProgressionRecord(sId, (rec) => {
        if (!Array.isArray(rec.clearedTrials)) rec.clearedTrials = [];
        if (rec.clearedTrials.includes(trialId)) {
          outcome = { alreadyCleared: true, trial };
          return;
        }
        rec.clearedTrials.push(trialId);

        const asc = advanceDegreeInPlace(rec, trial.degreeGrant || 1);
        rec.skillPoints = (rec.skillPoints || 0) + (trial.skillPointsGrant || 1);

        if (!rec.mentorRep || typeof rec.mentorRep !== 'object') {
          rec.mentorRep = { hermes: 0, solomon: 0, hiram: 0, nimue: 0 };
        }
        const repTarget = trial.mentorAffinity || rec.mentorId || 'hermes';
        rec.mentorRep[repTarget] = (rec.mentorRep[repTarget] || 0) + (trial.repGrant || 20);

        outcome = {
          alreadyCleared: false,
          trial,
          world: asc.world,
          level: asc.level,
          spiraledWorld: asc.spiraledWorld,
          skillPoints: rec.skillPoints,
          keptRelicId: trial.keepsakeDropId || null
        };
      });
    }

    if (!outcome || outcome.alreadyCleared) return outcome;

    // Grant physical kept Relic/Equipment into THIS character's personal 36-slot satchel
    if (outcome.keptRelicId && g && typeof g.getPlayerInventory === 'function') {
      const inv = g.getPlayerInventory();
      if (inv && typeof inv.addItem === 'function') {
        const isUniqueRelic = ['retired_tag', 'hex_key', 'sacred_scissors', 'ingvar_tape', 'seam_needle', 'star_saucer_compass', 'lavender_dryer_sheet', 'breb_of_shame'].includes(outcome.keptRelicId);
        if (!isUniqueRelic || !inv.hasItem(outcome.keptRelicId)) {
          inv.addItem(outcome.keptRelicId, 1);
        }
      }
    }

    const wInfo = getWorldInfo(outcome.world);
    const dInfo = getDegreeInfo(outcome.level);
    const relicInfo = outcome.keptRelicId ? RELIC_KEEPSAKES[outcome.keptRelicId] : null;
    const relicMsg = relicInfo ? ` · Kept ${relicInfo.icon} ${relicInfo.name}!` : '';

    if (window.CozyAudio && window.CozyAudio.portalChime) window.CozyAudio.portalChime();
    if (window.showToast) {
      const headline = outcome.spiraledWorld
        ? `🌟 ENTERED WORLD ${wInfo.world}: ${wInfo.name.toUpperCase()} (${dInfo.cipher})!`
        : `✨ ASCENDED TO ${dInfo.cipher} · ${dInfo.title.toUpperCase()}!`;
      window.showToast(
        headline,
        `Cleared "${trial.name}" (+${trial.skillPointsGrant || 1} Skill Point${relicMsg})`
      );
    }
    if (typeof window.addChatLog === 'function') {
      window.addChatLog(
        `🕯️ <strong>Trial Ascended (${trial.name}):</strong> Reached <strong>${dInfo.cipher} (${dInfo.title})</strong> in <strong>${wInfo.icon} ${wInfo.name}</strong> · +${trial.skillPointsGrant || 1} Skill Point${relicMsg}`,
        'lore'
      );
    }

    if (g && typeof g.refreshCharacterProgressionHUD === 'function') {
      g.refreshCharacterProgressionHUD(sId);
    }
    if (window.BlahajMMO && typeof window.BlahajMMO.renderSpellbookModal === 'function') {
      window.BlahajMMO.renderSpellbookModal();
    }
    if (saveSys && typeof saveSys.captureActiveCharacterToRoster === 'function') {
      saveSys.captureActiveCharacterToRoster(true);
    }

    return outcome;
  }

  // Runtime extension hooks so new worlds, degrees, powers, instances, and relics plug in cleanly
  function registerWorld(worldDef) {
    if (!worldDef || typeof worldDef.world !== 'number') return;
    const idx = WORLDS.findIndex((w) => w.world === worldDef.world);
    if (idx >= 0) WORLDS[idx] = Object.assign({}, WORLDS[idx], worldDef);
    else {
      WORLDS.push(worldDef);
      WORLDS.sort((a, b) => a.world - b.world);
    }
  }

  function registerDegree(degreeDef) {
    if (!degreeDef || typeof degreeDef.level !== 'number') return;
    const idx = DEGREES.findIndex((d) => d.level === degreeDef.level);
    if (idx >= 0) DEGREES[idx] = Object.assign({}, DEGREES[idx], degreeDef);
    else {
      DEGREES.push(degreeDef);
      DEGREES.sort((a, b) => a.level - b.level);
    }
  }

  function registerSkillNode(abilityId, nodeDef) {
    if (!abilityId || !nodeDef) return;
    SKILL_NODES[abilityId] = Object.assign({ abilityId }, SKILL_NODES[abilityId] || {}, nodeDef);
  }

  function registerTrial(trialDef) {
    if (!trialDef || !trialDef.id) return;
    const idx = TRIALS.findIndex((t) => t.id === trialDef.id);
    if (idx >= 0) TRIALS[idx] = Object.assign({}, TRIALS[idx], trialDef);
    else TRIALS.push(trialDef);
  }

  function registerRelic(relicDef) {
    if (!relicDef || !relicDef.id) return;
    RELIC_KEEPSAKES[relicDef.id] = Object.assign({}, RELIC_KEEPSAKES[relicDef.id] || {}, relicDef);
  }

  return {
    ORDERED_ACTION_SLOTS,
    WORLDS,
    PROBATIONER_DEGREE,
    DEGREES,
    REPUTATION_TIERS,
    MENTOR_CURRENTS,
    SKILL_NODES,
    FOUNDER_PROFILES,
    TRIALS,
    RELIC_KEEPSAKES,
    getWorldInfo,
    getAllWorlds,
    getMaxDegree,
    getDegreeInfo,
    getTotalInitiationRank,
    formatDegreeBadge,
    getMentorCurrent,
    getAllMentorCurrents,
    getSkillNode,
    getReputationTier,
    buildEmptyActionBar,
    buildActionBarFromSkills,
    buildDefaultProgressionForShark,
    getCharacterProgression,
    evaluateSkillEligibility,
    advanceDegreeInPlace,
    completeTrial,
    registerWorld,
    registerDegree,
    registerSkillNode,
    registerTrial,
    registerRelic
  };
})();
