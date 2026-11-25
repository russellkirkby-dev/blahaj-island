// ============================================================================
// BLÅHAJ ISLAND — INITIATIC PROGRESSION, MENTOR CURRENTS & DEGREE CODEX (v19.0)
// ============================================================================
// Single-source-of-truth declarative registry for:
//   • Levels / Initiatic Degrees (1–12, extensible to 13+)
//   • The Four Mentor Currents (Hermes, Solomon, Hiram, Nimue — never "classes")
//   • Skill Tree Nodes, Starter Arts, Reputation Tiers & Cross-Current Study
//   • Founder Veteran Profiles (Level 7 Adepts with 7 specialty powers)
//   • Extensible Trials & Relic Keepsakes Registry (ready for Pass 2 & Pass 3)
//
// Add new powers, trials, degrees, or relics by appending entries or calling
// BlahajProgression.registerDegree / registerSkillNode / registerTrial / registerRelic!
// ============================================================================

window.BlahajProgression = (function () {
  const ORDERED_ACTION_SLOTS = ['1', '2', '3', '4', '5', '6', 'q', 'e', 'r', 'f', 'shift+1', 'shift+2'];

  // --------------------------------------------------------------------------
  // 1. THE TWELVE INITIATIC DEGREES OF THE ARCHIPELAGO (Extensible 1 -> 12+)
  // Subtle plush-shark reflection of the Outer, Inner & Star Triads.
  // --------------------------------------------------------------------------
  const DEGREES = [
    {
      level: 1,
      cipher: '0°=0□',
      title: 'Probationer of Wire Bin #303',
      triad: 'Order of the Newly Fluffed',
      maxStuffingBonus: 0,
      dmgBonusPct: 0,
      lore: 'Tag newly snipped; True Name freshly inscribed in the Book of Named Sharks. Three chosen starter arts awaken in the fins.'
    },
    {
      level: 2,
      cipher: '1°=10□',
      title: 'Neophyte of the Dry Surf',
      triad: 'Order of the Newly Fluffed',
      maxStuffingBonus: 4,
      dmgBonusPct: 3,
      lore: 'First steps into the Water That Doth Not Wet without losing plush loft.'
    },
    {
      level: 3,
      cipher: '2°=9□',
      title: 'Zelator of the Hearth-Stone',
      triad: 'Order of the Newly Fluffed',
      maxStuffingBonus: 8,
      dmgBonusPct: 6,
      lore: 'Tempered by warm loaves, salt air, and the diligent tending of one’s stitches.'
    },
    {
      level: 4,
      cipher: '3°=8□',
      title: 'Practicus of the Boiling Eddy',
      triad: 'Order of the Newly Fluffed',
      maxStuffingBonus: 12,
      dmgBonusPct: 9,
      lore: 'Schooled in the rhythmic whirlings of tide, steam, and crisp fin-parry.'
    },
    {
      level: 5,
      cipher: '4°=7□',
      title: 'Philosophus of the Golden Loaf',
      triad: 'Order of the Newly Fluffed',
      maxStuffingBonus: 16,
      dmgBonusPct: 12,
      lore: 'Knows why the Birbs gather and how Star-Fire sleeps inside ordinary crust.'
    },
    {
      level: 6,
      cipher: 'Portal',
      title: 'Traveler of the Liminal Pier',
      triad: 'Threshold of the Between',
      maxStuffingBonus: 20,
      dmgBonusPct: 15,
      lore: 'Stands poised between shore and Seam, ready to enter the Inner Atoll.'
    },
    {
      level: 7,
      cipher: '5°=6□',
      title: 'Adept of the Inner Atoll',
      triad: 'College of the Rose-Seam',
      maxStuffingBonus: 25,
      dmgBonusPct: 20,
      lore: 'Veteran of the Archipelago’s deeper mysteries. The Sacred Four walk the island from this seasoned degree.'
    },
    {
      level: 8,
      cipher: '6°=5□',
      title: 'Adept of the Obsidian Vault',
      triad: 'College of the Rose-Seam',
      maxStuffingBonus: 30,
      dmgBonusPct: 24,
      lore: 'Unshaken beneath basalt arches, volcanic steam, and rogue root-beasts.'
    },
    {
      level: 9,
      cipher: '7°=4□',
      title: 'Exempt Swimmer of the First Whirlings',
      triad: 'College of the Rose-Seam',
      maxStuffingBonus: 35,
      dmgBonusPct: 28,
      lore: 'Spun clean in the Master Washer of the Deep Laundromat and emerged luminous.'
    },
    {
      level: 10,
      cipher: '8°=3□',
      title: 'Magister of the Great Seam',
      triad: 'Order of the Silver Star',
      maxStuffingBonus: 42,
      dmgBonusPct: 33,
      lore: 'Has crossed the Frayed Abyss without spilling a single tuft of cotton.'
    },
    {
      level: 11,
      cipher: '9°=2□',
      title: 'Magus of the Star-Saucer',
      triad: 'Order of the Silver Star',
      maxStuffingBonus: 48,
      dmgBonusPct: 38,
      lore: 'Speaks a single shonk across orbital void, hyperspace tunnel, and island hearth.'
    },
    {
      level: 12,
      cipher: '10°=1□',
      title: 'Sovereign of the Unwet Ocean',
      triad: 'Order of the Silver Star',
      maxStuffingBonus: 55,
      dmgBonusPct: 45,
      lore: 'Every stitch a star; as comfortable in a wire bin as upon a celestial throne.'
    }
  ];

  // --------------------------------------------------------------------------
  // 2. MENTOR REPUTATION TIERS (Used for Mentor Teaching & Cross-Current Study)
  // --------------------------------------------------------------------------
  const REPUTATION_TIERS = [
    { id: 'initiate', minRep: 0, label: 'Probationer', badge: '🕯️ Probationer' },
    { id: 'zelator', minRep: 25, label: 'Trusted Companion', badge: '🌙 Trusted' },
    { id: 'adept', minRep: 60, label: 'Sworn of the Current', badge: '⭐ Sworn' },
    { id: 'ipsissimus', minRep: 100, label: 'Pillar of the Current', badge: '☀️ Pillar' }
  ];

  // --------------------------------------------------------------------------
  // 3. THE FOUR MENTOR CURRENTS (Never called "classes")
  // Each Current reflects one of the Sacred Four and their Magical Instrument.
  // --------------------------------------------------------------------------
  const MENTOR_CURRENTS = {
    hermes: {
      id: 'hermes',
      mentorName: 'Hermes',
      mentorSubtitle: 'The Mangy One · Guide of the Between',
      currentName: 'Current of the Liminal Lantern',
      shortLabel: 'Liminal Lantern',
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
      icon: '🍵',
      accentHex: '#fbbf24',
      instrument: 'Porcelain Teacup & Warm Loaves of Light (Fire & Water · Alchemy)',
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
      icon: '🔧',
      accentHex: '#38bdf8',
      instrument: 'Sacred M10 Brass Hex Key & Architect’s Square (Earth · Structure)',
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
      icon: '✨',
      accentHex: '#c084fc',
      instrument: 'Violet Star-Crystal & Golden Seam-Needle (Spirit · Harmony)',
      maxim: '“Every shark and every stitch is a star in the Great Plush Firmament.”',
      summary: 'Graceful seam-mending lunges, soothing fleece grooming, astral deflections, and serene sanctum pulses.',
      recommendedStarters: ['poky_fin_strike', 'plush_groom', 'fin_deflection'],
      starterCandidates: ['poky_fin_strike', 'plush_groom', 'fin_deflection', 'soothing_tea_pulse', 'snoot_boop']
    }
  };

  // --------------------------------------------------------------------------
  // 4. SKILL TREE NODES (Maps every ability in mmoControls.ABILITIES to a
  //    Mentor Current, Initiatic Degree requirement, Reputation, and Lore)
  // --------------------------------------------------------------------------
  const SKILL_NODES = {
    poky_fin_strike: {
      abilityId: 'poky_fin_strike',
      mentorId: 'hiram',
      sharedStarter: true,
      tier: 1,
      minDegree: 1,
      skillPointCost: 1,
      crossMentorRepReq: 0,
      initiaticNote: 'First Point of the Fin: channels whatever Sacred Instrument rests in your Fin-Slot [H].'
    },
    snoot_boop: {
      abilityId: 'snoot_boop',
      mentorId: 'hermes',
      sharedStarter: true,
      tier: 1,
      minDegree: 1,
      skillPointCost: 1,
      crossMentorRepReq: 0,
      initiaticNote: 'The Traditional Archipelago Greeting & Banishing Boop—gentle to friends, decisive to pests.'
    },
    plush_groom: {
      abilityId: 'plush_groom',
      mentorId: 'nimue',
      sharedStarter: true,
      tier: 1,
      minDegree: 1,
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
      minDegree: 2,
      skillPointCost: 1,
      crossMentorRepReq: 25,
      initiaticNote: 'Step Across the Threshold: closes gaps in a single breath and primes a Cross-Slash.'
    },
    tail_swipe: {
      abilityId: 'tail_swipe',
      mentorId: 'hiram',
      sharedStarter: true,
      tier: 2,
      minDegree: 2,
      skillPointCost: 1,
      crossMentorRepReq: 25,
      initiaticNote: 'Compasses of the Caudal Fin: traces a 180° arc that squares unruly crowds.'
    },
    fin_deflection: {
      abilityId: 'fin_deflection',
      mentorId: 'nimue',
      sharedStarter: true,
      tier: 3,
      minDegree: 3,
      skillPointCost: 1,
      crossMentorRepReq: 25,
      initiaticNote: 'Sign of Silence & Rebound: turns incoming strikes into starlit counter-momentum.'
    },
    soothing_tea_pulse: {
      abilityId: 'soothing_tea_pulse',
      mentorId: 'solomon',
      sharedStarter: true,
      tier: 3,
      minDegree: 3,
      skillPointCost: 1,
      crossMentorRepReq: 25,
      initiaticNote: 'Eucharist of Bergamot & Steam: restores Stuffing Coherence and cleanses nearby allies.'
    },
    double_fin_defense: {
      abilityId: 'double_fin_defense',
      mentorId: 'hiram',
      sharedStarter: true,
      tier: 4,
      minDegree: 4,
      skillPointCost: 1,
      crossMentorRepReq: 60,
      initiaticNote: 'Pillars of Severity & Mildness: crossed pectoral fins form an unyielding plush ashlar.'
    },
    tail_spin: {
      abilityId: 'tail_spin',
      mentorId: 'hiram',
      sharedStarter: false,
      tier: 5,
      minDegree: 5,
      skillPointCost: 1,
      crossMentorRepReq: 60,
      initiaticNote: 'The Whirling Lathe: 360° airborne caudal cyclone taught in Hiram’s deep turnery.'
    },
    hydro_tail_launch: {
      abilityId: 'hydro_tail_launch',
      mentorId: 'hermes',
      sharedStarter: false,
      tier: 5,
      minDegree: 5,
      skillPointCost: 1,
      crossMentorRepReq: 60,
      initiaticNote: 'Ascent Upon the Unwet Geyser: vaults cliffs, rifts, and broken temple bridges.'
    },
    founder_signature: {
      abilityId: 'founder_signature',
      mentorId: 'nimue',
      sharedStarter: false,
      tier: 6,
      minDegree: 6,
      skillPointCost: 1,
      crossMentorRepReq: 60,
      initiaticNote: 'Invocation of the True Motto: unleashes the Sovereign Relic Resonance of your Current.'
    }
  };

  // --------------------------------------------------------------------------
  // 5. FOUNDER VETERAN PROFILES (Start at Level 7 / 5°=6□ with 7 Specialty Arts!)
  // Capable, mid-to-high-level veterans with distinct specialties—leaving 5
  // levels (8–12) and 5 cross-current arts still ahead to master!
  // --------------------------------------------------------------------------
  const FOUNDER_PROFILES = {
    hermes: {
      level: 7,
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
      level: 7,
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
      level: 7,
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
      level: 7,
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
  // 6. EXTENSIBLE INSTANCE / TRIAL MILESTONES REGISTRY (Hooks ready for Pass 2)
  // Clearing an instance grants +1 Level (up to 12), +1 Skill Point, Mentor Rep,
  // and optional permanent Relic / Equipment keepsake drops!
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
      desc: 'Slip past the Showroom Guards and cross the Portal out of the IKEA Spawning Pits on Erf.'
    },
    {
      id: 'great_seam_first_mend',
      name: 'Vigil of the Frayed Seam',
      zone: 'island',
      mentorAffinity: 'nimue',
      degreeGrant: 1,
      skillPointsGrant: 1,
      repGrant: 20,
      keepsakeDropId: 'golden_needle_charm',
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
      keepsakeDropId: 'sacred_tea',
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
      desc: 'Brave the Suds & Spin Cycle of the Deep Laundromat and emerge clean-fluffed.'
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
      desc: 'Pilot the S.S. Shonk-Saucer Mk. VII beyond 122m into deep orbital space.'
    },
    {
      id: 'cheese_moon_expedition',
      name: 'Pilgrimage to the Gouda Crater',
      zone: 'cheese_planet',
      mentorAffinity: 'solomon',
      degreeGrant: 1,
      skillPointsGrant: 1,
      repGrant: 35,
      keepsakeDropId: 'lunar_cheese_wheel',
      desc: 'Step through the Hyperspace Gate and return from the Alien Cheese World.'
    }
  ];

  // Extensible Relic / Equipment Keepsake Registry
  const RELIC_KEEPSAKES = {
    retired_tag: { id: 'retired_tag', name: 'Retired Barcode Tag (303.735.88)', slot: 'trinket', icon: '🏷️' },
    hex_key: { id: 'hex_key', name: 'Sacred Brass Hex Key M10', slot: 'fin', icon: '🔧' },
    sacred_scissors: { id: 'sacred_scissors', name: 'Sacred Scissors of Liberation', slot: 'fin', icon: '✂️' },
    ingvar_tape: { id: 'ingvar_tape', name: 'Ingvar’s Brass Measuring Tape', slot: 'fin', icon: '📏' }
  };

  // --------------------------------------------------------------------------
  // HELPERS & PUBLIC EXTENSION API
  // --------------------------------------------------------------------------
  function getMaxDegree() {
    return DEGREES.reduce((max, d) => Math.max(max, d.level), 12);
  }

  function getDegreeInfo(level) {
    const clamped = Math.max(1, Math.min(getMaxDegree(), Math.round(Number(level) || 1)));
    return DEGREES.find((d) => d.level === clamped) || DEGREES[0];
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
      level: 1,
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

  /**
   * Checks whether a character can currently unlock a given ability in the Spellbook,
   * and returns a structured status for UI research tooltips & buttons.
   */
  function evaluateSkillEligibility(sharkId, abilityId) {
    const prog = getCharacterProgression(sharkId);
    const node = getSkillNode(abilityId);
    const learned = Array.isArray(prog.learnedAbilities) && prog.learnedAbilities.includes(abilityId);
    if (learned) {
      return { canLearn: false, alreadyLearned: true, reason: 'Learned', node, prog };
    }

    const level = prog.level || 1;
    const sp = prog.skillPoints || 0;
    const isOwnMentor = prog.mentorId === node.mentorId;
    const repWithTreeMentor = (prog.mentorRep && prog.mentorRep[node.mentorId]) || 0;
    const repNeeded = isOwnMentor ? 0 : (node.crossMentorRepReq || 0);

    if (level < node.minDegree) {
      const deg = getDegreeInfo(node.minDegree);
      return {
        canLearn: false,
        alreadyLearned: false,
        lockedByDegree: true,
        reason: `Requires Lv.${node.minDegree} (${deg.cipher} · ${deg.title})`,
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

  // Runtime extension hooks so new levels, powers, instances, and relics plug in cleanly
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
    DEGREES,
    REPUTATION_TIERS,
    MENTOR_CURRENTS,
    SKILL_NODES,
    FOUNDER_PROFILES,
    TRIALS,
    RELIC_KEEPSAKES,
    getMaxDegree,
    getDegreeInfo,
    getMentorCurrent,
    getAllMentorCurrents,
    getSkillNode,
    getReputationTier,
    buildEmptyActionBar,
    buildActionBarFromSkills,
    buildDefaultProgressionForShark,
    getCharacterProgression,
    evaluateSkillEligibility,
    registerDegree,
    registerSkillNode,
    registerTrial,
    registerRelic
  };
})();
