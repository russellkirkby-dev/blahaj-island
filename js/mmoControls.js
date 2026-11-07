// ============================================================================
// BLAHAJ ISLAND — PASS 81 & PASS 82: TAB-TARGET MMORPG CONTROL, COMBAT & SPELLBOOK
// Implements:
//  1. Tab-Targeting, 3D Click-Targeting, Smart Auto-Target on Attack & Clickable Nameplates/Party Frame
//  2. 3D Glowing Target Ring, Top-Center HUD Target Unit Frame & Floating Combat Text (FCT)
//  3. Offensive, Defensive & Ranged Fin/Tail Martial Arts (1-6, Q, E, R, F, Shift+1..2)
//  4. Radial Clock-Wipe Cooldowns, 0.38s Spell Queueing, Range Indicators & 1-2-3 Combo Procs
//  5. Active Defensive Postures (Fin Deflection Parry & Double Fin Defense Aegis) + 3D Fin Poses
//  6. Fin-Equipped Item Modifiers & Passive Stances (Allen Key Bastion, Scissors Crit, Tape Grapnel, Diviner Ranged Stitch)
//  7. Character Base Ability Mixes & Learnable Spellbook Modal ([I] / [P])
// ============================================================================

(function () {
  'use strict';

  const STORAGE_KEY = 'blahaj_mmo_state_v1';

  // --------------------------------------------------------------------------
  // FIN-EQUIPPED ITEM MODIFIER TABLE (PASS 81 + PASS 82 PASSIVE STANCES)
  // Equipping an item in your Fin dynamically empowers Fin strikes, postures & passives!
  // --------------------------------------------------------------------------
  const FIN_ITEM_MODIFIERS = {
    hex_key: {
      tag: 'Allen-Key Torque',
      stanceName: 'Architect’s Bastion (-15% Dmg Taken)',
      icon: '🔧',
      colorHex: 0xfbbf24,
      dmgMult: 1.45,
      knockMult: 1.5,
      rangeBonus: 0.8,
      passiveArmorMult: 0.85,
      armorBreakerMult: 1.25,
      strikeName: 'Allen-Key Torque Strike',
      lungeName: 'Hex-Wrench Piercing Lunge',
      parryName: 'Iron Cam-Lock Deflection',
      desc: '+45% Fin Strike impact, +25% bonus vs Armored Raiders, and 15% Passive Damage Reduction from Hiram’s M10 Hex Key!'
    },
    sacred_scissors: {
      tag: 'Sacred Scissors',
      stanceName: 'Order of the Shears (+30% Crit & Flank)',
      icon: '✂️',
      colorHex: 0xf43f5e,
      dmgMult: 1.5,
      knockMult: 1.35,
      rangeBonus: 1.0,
      critChanceBonus: 0.30,
      flankBonusMult: 1.35,
      strikeName: 'Golden Scissor Snip',
      lungeName: 'Twin-Blade Fin Lunge',
      parryName: 'Scissor-Cross Riposte',
      desc: '+50% Fin Strike power, +30% Critical Strike chance, and +35% Flanking Backstab bonus from the Golden Scissors!'
    },
    ingvar_tape: {
      tag: 'Measuring Tape Whip',
      stanceName: 'Metric Grapnel Hook (18.5m Reel)',
      icon: '📏',
      colorHex: 0x38bdf8,
      dmgMult: 1.25,
      knockMult: 1.3,
      rangeBonus: 4.0,
      isGrapnel: true,
      strikeName: 'Brass Tape Whip-Strike',
      lungeName: 'Metric Grapnel Pull',
      parryName: 'Retractable Tape Ward',
      desc: '+4.0m extended Fin Strike reach & upgrades Single Fin Lunge [2] into an 18.5m Metric Grapnel Tether that reels you to your target!'
    },
    seam_detector: {
      tag: 'Aetheric Diviner',
      stanceName: 'Astral Weaver (14m Ranged Seam Stitch)',
      icon: '🧭',
      colorHex: 0xa855f7,
      dmgMult: 1.3,
      knockMult: 1.25,
      rangeBonus: 2.0,
      rangedSeamStitch: true,
      strikeName: 'Aetheric Resonance Jab',
      lungeName: 'Astral Compass Lunge',
      parryName: 'Harmonic Field Deflection',
      desc: 'Emits astral sonar shockwaves & allows Poky Fin Strike [1] and Ranged Breb Volley [4] to stitch Great Seam rifts from 14m away!'
    },
    breb: {
      tag: 'Warm Breb Loaf',
      stanceName: 'Baker’s Generosity (Crumbs & Comfort)',
      icon: '🥖',
      colorHex: 0xf59e0b,
      dmgMult: 1.2,
      knockMult: 1.4,
      rangeBonus: 0.5,
      healComfort: 6,
      strikeName: 'Crunchy Baguette Bash',
      lungeName: 'Artisan Loaf Charge',
      parryName: 'Crust-Shield Parry',
      desc: 'Showers golden bread crumbs on hit, restores +6% Comfort, and feeds nearby hungry Birbs!'
    },
    tea: {
      tag: 'Steaming Earl Grey',
      stanceName: 'Solomon’s Serenity (+10% Tea Comfort/Hit)',
      icon: '🍵',
      colorHex: 0x34d399,
      dmgMult: 1.2,
      knockMult: 1.15,
      rangeBonus: 0.6,
      healComfort: 10,
      strikeName: 'Steaming Tea Splash Jab',
      lungeName: 'Bergamot Surge Lunge',
      parryName: 'Porcelain Equilibrium Parry',
      desc: 'Restores +10% Tea Comfort & splashes soothing herbal steam on every Fin Strike!'
    },
    margarita: {
      tag: 'Frosted Margarita',
      stanceName: 'Lagoon Frost (+8% Comfort/Hit)',
      icon: '🍸',
      colorHex: 0x67e8f9,
      dmgMult: 1.2,
      knockMult: 1.2,
      rangeBonus: 0.6,
      healComfort: 8,
      strikeName: 'Lime-Salt Frost Jab',
      lungeName: 'Lagoon Chill Lunge',
      parryName: 'Frosted Glass Deflection',
      desc: 'Chills foes with a lime-salt splash & restores +8% Comfort on hit!'
    },
    tropical_cocktail: {
      tag: 'Sunset Cocktail',
      stanceName: 'Solar Cabana (+8% Warmth/Hit)',
      icon: '🍹',
      colorHex: 0xfb7185,
      dmgMult: 1.2,
      knockMult: 1.2,
      rangeBonus: 0.6,
      healComfort: 8,
      strikeName: 'Tropical Sunset Strike',
      lungeName: 'Pineapple Wave Lunge',
      parryName: 'Parasol Fin Deflection',
      desc: 'Radiates warm sunset glow & restores +8% Warmth on Fin Strike!'
    },
    pina_colada: {
      tag: 'Chilled Piña Colada',
      stanceName: 'Trade-Wind Breeze (+8% Comfort/Hit)',
      icon: '🍹',
      colorHex: 0xfef08a,
      dmgMult: 1.2,
      knockMult: 1.2,
      rangeBonus: 0.6,
      healComfort: 8,
      strikeName: 'Coconut Breeze Strike',
      lungeName: 'Cabana Fin Lunge',
      parryName: 'Beach-Lounge Parry',
      desc: 'Splashes sweet coconut-pineapple breeze & restores +8% Comfort!'
    },
    celestial_boba: {
      tag: 'Celestial Boba',
      stanceName: 'Starlight Pearl Surge (+10% Comfort)',
      icon: '🧋',
      colorHex: 0xc084fc,
      dmgMult: 1.25,
      knockMult: 1.25,
      rangeBonus: 1.2,
      healComfort: 10,
      strikeName: 'Tapioca Pearl Fin Jab',
      lungeName: 'Starlight Boba Lunge',
      parryName: 'Nebula Straw Deflection',
      desc: 'Pops starlight tapioca pearls on hit (+25% impact & +10% Comfort)!'
    },
    kottbullar_feast: {
      tag: 'Midnight Köttbullar',
      stanceName: 'Nordic Feast Vigour (+12% Stuffing)',
      icon: '🧆',
      colorHex: 0xd97706,
      dmgMult: 1.3,
      knockMult: 1.3,
      rangeBonus: 0.8,
      healComfort: 12,
      strikeName: 'Lingonberry Gravy Strike',
      lungeName: 'Swedish Bistro Lunge',
      parryName: 'Porcelain Plate Parry',
      desc: 'Savory Swedish meatball impact (+30% damage & +12% Comfort)!'
    },
    figurine: {
      tag: 'Carrot Figurine',
      stanceName: 'Caldera Boop Champion (+85% Knockback)',
      icon: '🥕',
      colorHex: 0xff7b1c,
      dmgMult: 1.15,
      knockMult: 1.85,
      rangeBonus: 0.5,
      strikeName: 'Elastic Carrot Fin Boop',
      lungeName: 'Balcony-Bounce Lunge',
      parryName: 'Rubber-Carrot Rebound',
      desc: '+85% elastic knockback bounce from the sacred Beach-Shorts Carrot!'
    },
    flatpack_crate: {
      tag: 'SKÄRHAJ Flat-Pack',
      stanceName: 'Corrugated Bulwark (-15% Dmg Taken)',
      icon: '📦',
      colorHex: 0xfacc15,
      dmgMult: 1.4,
      knockMult: 1.65,
      rangeBonus: 0.6,
      passiveArmorMult: 0.85,
      armorBreakerMult: 1.25,
      strikeName: 'Heavy Corrugated Slam',
      lungeName: 'Aisle-14 Flat-Pack Ram',
      parryName: 'Cardboard Box Shield',
      desc: '+40% heavy box impact, +65% knockback & 15% Passive Damage Reduction!'
    },
    binoculars: {
      tag: 'Brass Binoculars',
      stanceName: 'Horizon Spotter (+1.5m Reach & +20% Crit)',
      icon: '🔭',
      colorHex: 0xf59e0b,
      dmgMult: 1.2,
      knockMult: 1.15,
      rangeBonus: 1.5,
      critChanceBonus: 0.20,
      strikeName: 'Spotter’s Brass Strike',
      lungeName: 'Horizon-Lock Lunge',
      parryName: 'Brass-Lens Deflection',
      desc: '+1.5m precision targeting range & +20% critical strike chance!'
    }
  };

  // --------------------------------------------------------------------------
  // 12 LEARNABLE MMO ABILITIES & MARTIAL POSTURES
  // --------------------------------------------------------------------------
  const ABILITIES = {
    poky_fin_strike: {
      id: 'poky_fin_strike',
      name: 'Poky Fin Strike',
      icon: '🦈⚡',
      category: 'Offensive Fin Art',
      isOffensive: true,
      cooldown: 0.85,
      range: 5.2,
      usesFinMod: true,
      shortSub: 'Fin Jab',
      desc: 'A crisp, poky pectoral fin jab that strikes your target (or foes in front of you) for 38 impact. Procs into a guaranteed-crit Twin-Fin Cross-Slash after Single Fin Lunge!'
    },
    single_fin_lunge: {
      id: 'single_fin_lunge',
      name: 'Single Fin Lunge',
      icon: '🦈💨',
      category: 'Offensive Fin Art',
      isOffensive: true,
      cooldown: 3.2,
      range: 14.5,
      usesFinMod: true,
      shortSub: 'Gap Closer',
      desc: 'Lunges rapidly toward your target up to 14.5m away (18.5m with Measuring Tape Grapnel) dealing 55 piercing impact and triggering a Twin-Fin Cross-Slash combo proc on [1]!'
    },
    tail_swipe: {
      id: 'tail_swipe',
      name: 'Crescent Tail Swipe',
      icon: '🌊🦈',
      category: 'Offensive Tail Art',
      isOffensive: true,
      cooldown: 2.6,
      range: 6.5,
      usesFinMod: false,
      shortSub: 'Arc Cleave',
      desc: 'Sweeps your plush caudal tail in a wide 180° frontal crescent, cleaving all enemies and Volunteer Carrots within 6.5m and knocking them back.'
    },
    breb_volley: {
      id: 'breb_volley',
      name: 'Warm Breb Volley',
      icon: '🥖🎯',
      category: 'Ranged & Cozy Art',
      isOffensive: true,
      cooldown: 1.8,
      range: 28.0,
      usesFinMod: false,
      shortSub: 'Ranged Loaves',
      desc: 'Launches a ranged arc volley of 3 steaming golden Breb loaves up to 28m! Pelts Mean Sharks at range, feeds Birbs, lures Erf Guards, or stitches Rifts with Aetheric Diviner.'
    },
    soothing_tea_pulse: {
      id: 'soothing_tea_pulse',
      name: 'Sacred Tea Infusion',
      icon: '🍵✨',
      category: 'Support & Healing',
      isOffensive: false,
      cooldown: 7.5,
      range: 12.0,
      usesFinMod: false,
      shortSub: 'Heal & Cleanse',
      desc: 'Brews a warm aura of Solomon’s Earl Grey, restoring +35% Stuffing Coherence, +40% Tea Comfort, cleansing -15% Mange, and granting Steaming Spirit agility.'
    },
    founder_signature: {
      id: 'founder_signature',
      name: 'Founder Signature Art',
      icon: '👑🌀',
      category: 'Signature Relic Power',
      isOffensive: false,
      cooldown: 5.0,
      range: 18.0,
      usesFinMod: false,
      shortSub: 'Relic Art',
      desc: 'Unleashes your active shark’s revered signature art: Between Portal Illumination (Hermes), Grand Tea Banquet (Solomon), Allen-Key Bastion (Hiram), or Needle of Restoration (Nimue).'
    },
    tail_spin: {
      id: 'tail_spin',
      name: 'Whirlpool Tail Spin',
      icon: '🌪️🦈',
      category: 'Offensive Tail Art',
      isOffensive: true,
      cooldown: 4.5,
      range: 6.8,
      usesFinMod: false,
      shortSub: '360° Cyclone',
      desc: 'Pirouettes in a full 360° hydro-plush cyclone, striking all surrounding enemies within 6.8m, launching carrots, and kicking up a sparkling whirlpool ring.'
    },
    fin_deflection: {
      id: 'fin_deflection',
      name: 'Fin Deflection',
      icon: '🛡️⚡',
      category: 'Defensive Posture',
      isOffensive: false,
      cooldown: 6.0,
      range: 5.5,
      usesFinMod: true,
      shortSub: 'Parry Posture',
      desc: 'Assumes an angled pectoral Fin Deflection posture for 2.8s. Parries 100% of incoming attacks, rebounds a shockwave, and triggers a Counter-Riposte combo proc on Tail Swipe & Spin!'
    },
    double_fin_defense: {
      id: 'double_fin_defense',
      name: 'Double Fin Defense',
      icon: '🛡️🦈',
      category: 'Defensive Posture',
      isOffensive: false,
      cooldown: 8.5,
      range: 4.0,
      usesFinMod: false,
      shortSub: '80% Aegis Ward',
      desc: 'Crosses both pectoral fins in an unbreakable plush X-aegis for 5.5s. Reduces incoming damage & Mange by 80%, grants knockback immunity, and regenerates +30% Stuffing!'
    },
    snoot_boop: {
      id: 'snoot_boop',
      name: 'Snoot Boop & Launch',
      icon: '🦈💥',
      category: 'Cozy & Knockback Art',
      isOffensive: true,
      cooldown: 1.0,
      range: 5.0,
      usesFinMod: false,
      shortSub: 'Boop / Camo',
      desc: 'High-elasticity snout boop that launches Mean Sharks skyward, shares an affectionate Friendship Nose-Beep with allies, or toggles Display Plushie Camouflage in IKEA!'
    },
    plush_groom: {
      id: 'plush_groom',
      name: 'Tender Plush Groom',
      icon: '🪮✨',
      category: 'Support & Healing',
      isOffensive: false,
      cooldown: 2.5,
      range: 5.5,
      usesFinMod: false,
      shortSub: 'De-Mange -20%',
      desc: 'Gently brushes your targeted friendly shark (or yourself if no ally is targeted), smoothing out loose threads to reduce Mange by -20% and restore +20% Comfort.'
    },
    hydro_tail_launch: {
      id: 'hydro_tail_launch',
      name: 'Hydro-Tail Sky Leap',
      icon: '🚀🌊',
      category: 'Mobility & Tail Art',
      isOffensive: false,
      cooldown: 5.0,
      range: 5.5,
      usesFinMod: false,
      shortSub: 'High Vault',
      desc: 'Slams the ground with your caudal fin to launch high into the air while releasing a hydro-shockwave ring that bumps nearby carrots and foes.'
    }
  };

  // Ordered list of action bar slots
  const SLOT_KEYS = ['1', '2', '3', '4', '5', '6', 'q', 'e', 'r', 'f', 'shift+1', 'shift+2'];

  // Distinct base ability mixes per character (and all 12 can be learned!)
  const CHARACTER_BASE_MIXES = {
    hermes: {
      archetype: 'Wayfarer Skirmisher & Portal Guide',
      baseLearned: [
        'poky_fin_strike', 'single_fin_lunge', 'tail_spin', 'fin_deflection',
        'breb_volley', 'founder_signature', 'snoot_boop', 'hydro_tail_launch', 'plush_groom'
      ],
      defaultBar: {
        '1': 'poky_fin_strike',
        '2': 'single_fin_lunge',
        '3': 'tail_spin',
        '4': 'breb_volley',
        '5': 'plush_groom',
        '6': 'founder_signature',
        'q': 'hydro_tail_launch',
        'e': 'fin_deflection',
        'r': 'double_fin_defense',
        'f': 'snoot_boop',
        'shift+1': 'plush_groom',
        'shift+2': 'hydro_tail_launch'
      }
    },
    solomon: {
      archetype: 'Star-Chef Guardian & Tea Alchemist',
      baseLearned: [
        'poky_fin_strike', 'tail_swipe', 'breb_volley', 'soothing_tea_pulse',
        'double_fin_defense', 'fin_deflection', 'founder_signature', 'snoot_boop', 'plush_groom'
      ],
      defaultBar: {
        '1': 'poky_fin_strike',
        '2': 'tail_swipe',
        '3': 'breb_volley',
        '4': 'soothing_tea_pulse',
        '5': 'plush_groom',
        '6': 'founder_signature',
        'q': 'tail_spin',
        'e': 'fin_deflection',
        'r': 'double_fin_defense',
        'f': 'snoot_boop',
        'shift+1': 'plush_groom',
        'shift+2': 'hydro_tail_launch'
      }
    },
    hiram: {
      archetype: 'Master Builder Vanguard & Hex-Templar',
      baseLearned: [
        'poky_fin_strike', 'single_fin_lunge', 'tail_swipe', 'tail_spin',
        'double_fin_defense', 'fin_deflection', 'founder_signature', 'snoot_boop', 'hydro_tail_launch'
      ],
      defaultBar: {
        '1': 'poky_fin_strike',
        '2': 'single_fin_lunge',
        '3': 'tail_swipe',
        '4': 'breb_volley',
        '5': 'soothing_tea_pulse',
        '6': 'founder_signature',
        'q': 'tail_spin',
        'e': 'fin_deflection',
        'r': 'double_fin_defense',
        'f': 'snoot_boop',
        'shift+1': 'plush_groom',
        'shift+2': 'hydro_tail_launch'
      }
    },
    nimue: {
      archetype: 'Astral Seam Weaver & Duelist',
      baseLearned: [
        'poky_fin_strike', 'single_fin_lunge', 'fin_deflection', 'double_fin_defense',
        'breb_volley', 'soothing_tea_pulse', 'founder_signature', 'snoot_boop', 'plush_groom'
      ],
      defaultBar: {
        '1': 'poky_fin_strike',
        '2': 'single_fin_lunge',
        '3': 'tail_swipe',
        '4': 'breb_volley',
        '5': 'soothing_tea_pulse',
        '6': 'founder_signature',
        'q': 'tail_spin',
        'e': 'fin_deflection',
        'r': 'double_fin_defense',
        'f': 'snoot_boop',
        'shift+1': 'plush_groom',
        'shift+2': 'hydro_tail_launch'
      }
    },
    custom: {
      archetype: 'Liberated Spawning-Pit Adventurer (All-Rounder)',
      baseLearned: Object.keys(ABILITIES),
      defaultBar: {
        '1': 'poky_fin_strike',
        '2': 'single_fin_lunge',
        '3': 'tail_swipe',
        '4': 'breb_volley',
        '5': 'soothing_tea_pulse',
        '6': 'founder_signature',
        'q': 'tail_spin',
        'e': 'fin_deflection',
        'r': 'double_fin_defense',
        'f': 'snoot_boop',
        'shift+1': 'plush_groom',
        'shift+2': 'hydro_tail_launch'
      }
    }
  };

  // --------------------------------------------------------------------------
  // RUNTIME STATE
  // --------------------------------------------------------------------------
  const state = {
    learnedByShark: {},
    barsByShark: {},
    cooldowns: {},
    maxCooldowns: {},
    comboProcs: {},       // { poky_fin_strike: remainingSec, tail_swipe: remainingSec, tail_spin: remainingSec }
    queuedAbilityId: null,// 0.38s Spell Queue window
    queuedExpire: 0,
    strikeHandToggle: 1,  // Alternates 1 (Right Fin) and -1 (Left Fin) on Poky Fin Strike
    selectedTarget: null, // { id, name, subtitle, category, icon, getPos(), getHpPct(), ref, kind }
    activePosture: null,  // { id: 'fin_deflection'|'double_fin_defense', remaining: number, duration: number, name: string, icon: string }
    projectiles: [],      // Flying ranged Breb loaves
    vfxMeshes: [],        // Temporary 3D slashes, rings, grapnel lines, and shockwaves
    fctItems: [],         // 3D-projected Floating Combat Text items
    assigningAbilityId: null // For Spellbook slot assignment
  };

  let targetRingGroup = null;
  let targetRingOuter = null;
  let targetRingInner = null;
  let postureAuraGroup = null;
  let postureAuraMesh = null;
  let fctContainerEl = null;

  function loadPersistedState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          state.learnedByShark = parsed.learnedByShark || {};
          state.barsByShark = parsed.barsByShark || {};
        }
      }
    } catch (e) {
      console.warn('BlahajMMO load state warning:', e);
    }

    ['hermes', 'solomon', 'hiram', 'nimue', 'custom'].forEach((sId) => {
      const mix = CHARACTER_BASE_MIXES[sId] || CHARACTER_BASE_MIXES.custom;
      if (!Array.isArray(state.learnedByShark[sId])) {
        state.learnedByShark[sId] = [...mix.baseLearned];
      } else {
        mix.baseLearned.forEach((abId) => {
          if (!state.learnedByShark[sId].includes(abId)) {
            state.learnedByShark[sId].push(abId);
          }
        });
      }
      if (!state.barsByShark[sId] || typeof state.barsByShark[sId] !== 'object') {
        state.barsByShark[sId] = Object.assign({}, mix.defaultBar);
      } else {
        SLOT_KEYS.forEach((k) => {
          if (!state.barsByShark[sId][k]) {
            state.barsByShark[sId][k] = mix.defaultBar[k];
          }
        });
      }
    });
  }

  function savePersistedState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        learnedByShark: state.learnedByShark,
        barsByShark: state.barsByShark
      }));
    } catch (e) {}
  }

  function getActiveSharkId() {
    return (window.player && window.player.sharkId) ? window.player.sharkId : 'hermes';
  }

  function getActiveFinModifier() {
    const g = window.BlahajGame;
    const held = g && typeof g.getPlayerHeldItem === 'function' ? g.getPlayerHeldItem() : null;
    if (held && held.id && FIN_ITEM_MODIFIERS[held.id]) {
      return Object.assign({ itemId: held.id }, FIN_ITEM_MODIFIERS[held.id]);
    }
    return null;
  }

  function getPassiveDamageMultiplier() {
    const finMod = getActiveFinModifier();
    if (finMod && typeof finMod.passiveArmorMult === 'number') {
      return finMod.passiveArmorMult;
    }
    return 1.0;
  }

  function isAbilityLearned(sharkId, abilityId) {
    const list = state.learnedByShark[sharkId] || [];
    return list.includes(abilityId);
  }

  function learnAbility(sharkId, abilityId, silent = false) {
    if (!ABILITIES[abilityId]) return false;
    if (!Array.isArray(state.learnedByShark[sharkId])) {
      state.learnedByShark[sharkId] = [];
    }
    if (!state.learnedByShark[sharkId].includes(abilityId)) {
      state.learnedByShark[sharkId].push(abilityId);
      savePersistedState();
      if (!silent && window.CozyAudio) window.CozyAudio.portalChime();
      renderActionBarUI();
      renderSpellbookModal();
      return true;
    }
    return false;
  }

  function learnAllAbilitiesForActiveShark() {
    const sId = getActiveSharkId();
    Object.keys(ABILITIES).forEach((abId) => learnAbility(sId, abId, true));
    if (window.CozyAudio) window.CozyAudio.portalChime();
    renderActionBarUI();
    renderSpellbookModal();
  }

  function assignSlot(sharkId, slotKey, abilityId) {
    const normSlot = String(slotKey).toLowerCase();
    if (!SLOT_KEYS.includes(normSlot) || !ABILITIES[abilityId]) return false;
    learnAbility(sharkId, abilityId, true);
    if (!state.barsByShark[sharkId]) {
      state.barsByShark[sharkId] = Object.assign({}, CHARACTER_BASE_MIXES[sharkId]?.defaultBar || CHARACTER_BASE_MIXES.custom.defaultBar);
    }
    state.barsByShark[sharkId][normSlot] = abilityId;
    savePersistedState();
    renderActionBarUI();
    renderSpellbookModal();
    return true;
  }

  // --------------------------------------------------------------------------
  // FLOATING COMBAT TEXT (3D-PROJECTED CALLOUTS)
  // --------------------------------------------------------------------------
  function ensureFCTContainer() {
    if (fctContainerEl) return fctContainerEl;
    fctContainerEl = document.getElementById('mmo-fct-layer');
    if (!fctContainerEl) {
      fctContainerEl = document.createElement('div');
      fctContainerEl.id = 'mmo-fct-layer';
      fctContainerEl.className = 'mmo-fct-layer';
      document.body.appendChild(fctContainerEl);
    }
    return fctContainerEl;
  }

  function projectWorldToScreen(worldPos, jitterX = 0, liftY = 0, scale = 1) {
    const cam = (window.BlahajGame && typeof window.BlahajGame.getCamera === 'function')
      ? window.BlahajGame.getCamera()
      : window.camera;
    if (!cam || !worldPos) return null;
    const w = window.innerWidth || 1280;
    const h = window.innerHeight || 720;
    const proj = new THREE.Vector3(worldPos.x || 0, (worldPos.y || 0) + liftY, worldPos.z || 0);
    proj.project(cam);
    if (proj.z > 1.0) return null;
    const sx = (proj.x * 0.5 + 0.5) * w + jitterX;
    const sy = (-proj.y * 0.5 + 0.5) * h;
    return `translate3d(${sx.toFixed(1)}px, ${sy.toFixed(1)}px, 0) translate(-50%, -50%) scale(${scale.toFixed(2)})`;
  }

  function spawnFloatingCombatText(worldPos, text, kind = 'normal') {
    if (!worldPos || !text) return;
    const container = ensureFCTContainer();
    const el = document.createElement('div');
    el.className = `mmo-fct-item fct-${kind}`;
    el.textContent = text;

    const jitterX = (Math.random() - 0.5) * 28;
    const origin = new THREE.Vector3(
      worldPos.x || 0,
      (worldPos.y || 0) + 1.85,
      worldPos.z || 0
    );
    const initTransform = projectWorldToScreen(origin, jitterX, 0, 1.05);
    if (initTransform) {
      el.style.transform = initTransform;
    } else {
      el.style.transform = `translate3d(${(window.innerWidth || 1280) * 0.5}px, ${(window.innerHeight || 720) * 0.42}px, 0) translate(-50%, -50%)`;
    }
    container.appendChild(el);

    state.fctItems.push({
      el,
      origin,
      jitterX,
      age: 0,
      maxAge: kind === 'crit' || kind === 'proc' ? 1.25 : 0.95
    });
  }

  function updateFloatingCombatText(dt) {
    if (state.fctItems.length === 0) return;
    for (let i = state.fctItems.length - 1; i >= 0; i--) {
      const item = state.fctItems[i];
      item.age += dt;
      if (item.age >= item.maxAge) {
        if (item.el && item.el.parentNode) item.el.parentNode.removeChild(item.el);
        state.fctItems.splice(i, 1);
        continue;
      }

      const prog = item.age / item.maxAge;
      const scale = prog < 0.18 ? (0.88 + prog * 1.2) : 1.0;
      const tr = projectWorldToScreen(item.origin, item.jitterX, prog * 1.45, scale);
      if (!tr) {
        item.el.style.opacity = '0';
        continue;
      }
      item.el.style.transform = tr;
      item.el.style.opacity = prog > 0.65 ? ((1 - prog) / 0.35).toFixed(2) : '1';
    }
  }

  // --------------------------------------------------------------------------
  // TARGETING ENGINE (TAB-TARGET, SMART AUTO-TARGET & CLICKABLE NAMEPLATES)
  // --------------------------------------------------------------------------
  function getTargetables() {
    const list = [];
    const p = window.player;
    const g = window.BlahajGame;
    if (!p || !p.pos || !g) return list;

    const zone = typeof g.getZone === 'function' ? g.getZone() : 'island';
    const worldApi = typeof g.getWorldApi === 'function' ? g.getWorldApi() : null;

    // 1. Hostile Mean Sharks & Great Seam Land Invaders (Overworld / Island)
    if ((zone === 'island' || zone === 'overworld') && window.BlahajEnemies && typeof window.BlahajEnemies.getEnemies === 'function') {
      const enemies = window.BlahajEnemies.getEnemies();
      enemies.forEach((e) => {
        if (!e || e.isFlying || e.state === 'flying' || e.state === 'banished' || e.state === 'respawning' || (e.hp !== undefined && e.hp <= 0) || !e.mesh || !e.mesh.visible) return;
        if (e.labelEl && !e.labelEl.dataset.targetId) {
          e.labelEl.dataset.targetId = `enemy_${e.id}`;
          e.labelEl.title = `Click to Target ${e.title || 'Mean Shark'} · Right-Click to Attack`;
        }
        list.push({
          id: `enemy_${e.id}`,
          name: e.title || 'Mean Shark',
          subtitle: e.tag || (e.isLandInvader ? 'COSMIC SEAM INVADER · HOSTILE' : 'SHARK WEEK RAIDER · HOSTILE'),
          category: 'hostile',
          icon: e.isLandInvader ? '👾' : (e.type === 'urchin' ? '🦔' : (e.type === 'starfish' ? '🌟' : '🦈')),
          radius: 2.2,
          ref: e,
          kind: 'enemy',
          mesh: e.mesh,
          getPos: () => e.pos,
          getHpPct: () => (typeof e.mange === 'number')
            ? Math.max(0, Math.min(100, Math.round((1.0 - e.mange) * 100)))
            : Math.max(0, Math.min(100, Math.round(((e.hp ?? 100) / (e.maxHp || 100)) * 100))),
          getStatusLabel: () => (typeof e.mange === 'number')
            ? `Boop Resilience: ${Math.max(0, Math.round((1.0 - e.mange) * 100))}% (Mange ${Math.round(e.mange * 100)}%)`
            : `Boop Resilience: ${Math.max(0, Math.round(e.hp ?? 100))}/${e.maxHp || 100}`
        });
      });
    }

    // 2. Volcano Balcony Dare-Carrots (Island)
    if ((zone === 'island' || zone === 'overworld') && worldApi && typeof worldApi.getBalconyCarrots === 'function') {
      worldApi.getBalconyCarrots().forEach((c, idx) => {
        if (!c || c.knockedOff || !c.mesh || !c.mesh.visible) return;
        list.push({
          id: `balcony_carrot_${idx}`,
          name: `Balcony Dare-Carrot #${idx + 1}`,
          subtitle: 'VOLCANO TEMPLE LEDGE · BUMP TARGET',
          category: 'hostile',
          icon: '🥕',
          radius: 1.6,
          ref: c,
          carrotIdx: idx,
          kind: 'balcony_carrot',
          mesh: c.mesh,
          getPos: () => c.mesh.position,
          getHpPct: () => (c.knockedOff ? 0 : 100),
          getStatusLabel: () => (c.knockedOff ? 'Knocked Off!' : 'Ready to Boop / Strike!')
        });
      });
    }

    // 3. Volcano Instance Volunteer Carrots
    if (zone === 'volcano' && window.BlahajVolcano && typeof window.BlahajVolcano.getCarrots === 'function') {
      window.BlahajVolcano.getCarrots().forEach((c, idx) => {
        if (!c || c.state !== 'home') return;
        const cPos = (c.mesh && c.mesh.position) || c.pos || c.home;
        if (!cPos) return;
        list.push({
          id: `volcano_carrot_${idx}`,
          name: `Caldera Volunteer Carrot #${idx + 1}`,
          subtitle: 'CALDERA OVERLOOK · TRIAL TARGET',
          category: 'hostile',
          icon: '🥕',
          radius: 1.7,
          ref: c,
          carrotIdx: idx,
          kind: 'volcano_carrot',
          mesh: c.mesh,
          getPos: () => cPos,
          getHpPct: () => (c.state === 'home' ? 100 : 0),
          getStatusLabel: () => 'Caldera Ledge Volunteer'
        });
      });
    }

    // 4. Active Unmended Great Seam Rifts in Current Zone
    if (window.BlahajSeam && typeof window.BlahajSeam.getAllActiveRifts === 'function') {
      window.BlahajSeam.getAllActiveRifts().forEach((r) => {
        if (!r || r.mended) return;
        const sameZone = r.zone === zone || (r.zone === 'island' && (zone === 'overworld' || zone === 'island'));
        if (!sameZone) return;
        list.push({
          id: `rift_${r.id}`,
          name: `Great Seam #${r.seamNum || 1}: ${r.name}`,
          subtitle: 'COSMIC TEAR IN REALITY · STITCH TARGET',
          category: 'rift',
          icon: '🪡',
          radius: 2.5,
          ref: r,
          kind: 'rift',
          mesh: r.mesh,
          getPos: () => r.pos,
          getHpPct: () => (r.mended ? 100 : 35),
          getStatusLabel: () => (r.mended ? 'Mended ✨' : 'Unmended Tear · Approach & Stitch!')
        });
      });
    }

    // 5. Co-op Partner (if active in same zone)
    const partner = typeof g.getCoopPartner === 'function' ? g.getCoopPartner() : null;
    if (partner && partner.active && partner.mesh && partner.mesh.visible) {
      const pName = (window.LORE && window.LORE.sharks && window.LORE.sharks[partner.sharkId])
        ? window.LORE.sharks[partner.sharkId].name
        : 'Co-op Partner';
      list.push({
        id: 'coop_partner',
        name: `${pName} (Partner)`,
        subtitle: 'CROSS-OCEAN CO-OP COMPANION · FRIENDLY',
        category: 'friendly',
        icon: '🦈💕',
        radius: 2.0,
        ref: partner,
        kind: 'partner',
        mesh: partner.mesh,
        getPos: () => partner.mesh.position,
        getHpPct: () => Math.round((1.0 - (partner.mangeFactor || 0.2)) * 100),
        getStatusLabel: () => `Plush Coat: ${Math.round((1.0 - (partner.mangeFactor || 0.2)) * 100)}% Fresh`
      });
    }

    // 6. Friendly World Actors (Revered Founders & Island NPCs)
    if (zone === 'island' || zone === 'overworld') {
      const actors = typeof g.getWorldActors === 'function' ? g.getWorldActors() : [];
      actors.forEach((act) => {
        if (!act || !act.mesh || !act.mesh.visible) return;
        const mVal = typeof g.getSharkMange === 'function' && act.isBlueShark ? g.getSharkMange(act.id) : 0.15;
        list.push({
          id: `actor_${act.id}`,
          name: act.name,
          subtitle: act.tag || 'ISLAND RESIDENT · FRIENDLY',
          category: 'friendly',
          icon: act.isBlueShark ? '🦈👑' : '🏝️',
          radius: 1.9,
          ref: act,
          kind: 'actor',
          mesh: act.mesh,
          getPos: () => act.mesh.position,
          getHpPct: () => Math.round((1.0 - mVal) * 100),
          getStatusLabel: () => (act.isBlueShark ? `Coat Freshness: ${Math.round((1.0 - mVal) * 100)}% (Mange ${Math.round(mVal * 100)}%)` : 'Friendly Island Ally')
        });
      });
    }

    // 7. Spawning Pits IKEA Dungeon: Silhouetted Erf Guards & Store Manager
    if (zone === 'spawning_pits' && window.BlahajSpawningPits && typeof window.BlahajSpawningPits.getSecurityGuards === 'function') {
      window.BlahajSpawningPits.getSecurityGuards().forEach((guard) => {
        if (!guard || !guard.pos) return;
        list.push({
          id: `guard_${guard.id}`,
          name: guard.name || 'Erf Security Guard',
          subtitle: 'IKEA SPAWNING PITS PATROL · HOSTILE',
          category: 'hostile',
          icon: '🔦👮',
          radius: 2.1,
          ref: guard,
          kind: 'guard',
          mesh: guard.group,
          getPos: () => guard.pos,
          getHpPct: () => Math.max(0, Math.round((1.0 - (guard.suspicion || 0)) * 100)),
          getStatusLabel: () => (guard.distractTimer > 0 ? `Distracted (${guard.distractTimer.toFixed(1)}s)` : `Vigilance: ${Math.round((1.0 - (guard.suspicion || 0)) * 100)}%`)
        });
      });
      const boss = typeof window.BlahajSpawningPits.getStoreManagerBoss === 'function' ? window.BlahajSpawningPits.getStoreManagerBoss() : null;
      if (boss && boss.group && !boss.pacified) {
        list.push({
          id: 'boss_store_manager',
          name: 'Regional Store Manager Kamprad-9',
          subtitle: 'CHECKOUT REGISTER BOSS · HOSTILE',
          category: 'hostile',
          icon: '🧾👔',
          radius: 2.8,
          ref: boss,
          kind: 'boss',
          mesh: boss.group,
          getPos: () => boss.group.position,
          getHpPct: () => Math.max(0, Math.round(((3 - (boss.terminalsScanned || 0)) / 3) * 100)),
          getStatusLabel: () => `Checkout Locks Remaining: ${Math.max(0, 3 - (boss.terminalsScanned || 0))}/3`
        });
      }
    }

    return list;
  }

  function setTarget(targetObj, playAudio = true) {
    state.selectedTarget = targetObj || null;
    if (playAudio && targetObj && window.CozyAudio) {
      if (window.CozyAudio.pocketWatchClick) window.CozyAudio.pocketWatchClick();
      else window.CozyAudio.shonk();
    }
    updateTargetHUD();
    updateTargetRing3D(0);
    renderActionBarUI();
  }

  function selectTargetById(targetId, playAudio = true) {
    if (!targetId) return null;
    const all = getTargetables();
    const match = all.find((t) => t.id === targetId);
    if (match) {
      setTarget(match, playAudio);
      const tPos = match.getPos && match.getPos();
      if (tPos) faceWorldPoint(tPos.x, tPos.z, false);
      return match;
    }
    return null;
  }

  // Pass 82B: Click-to-Face (Point & Turn) helper!
  // Smoothly turns the shark (player.rotY) and aligns the camera behind the clicked world point or target.
  function faceWorldPoint(wx, wz, showRipple = false) {
    const p = window.player;
    if (!p || !p.pos || !Number.isFinite(wx) || !Number.isFinite(wz)) return false;
    const dx = wx - p.pos.x;
    const dz = wz - p.pos.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.25) return false;

    const targetYaw = Math.atan2(dx, dz);
    p.clickTurnYaw = targetYaw;
    p.clickTurnTimer = 0.55;
    if (window.camState) {
      window.camState.hasFreeLookOffset = false;
    }

    if (showRipple) {
      const rippleDist = Math.min(dist, 22.0);
      const rx = p.pos.x + (dx / dist) * rippleDist;
      const rz = p.pos.z + (dz / dist) * rippleDist;
      spawnRingWaveVFX({ x: rx, y: p.pos.y, z: rz }, 0x38bdf8, 1.35, 0.28);
    }
    return true;
  }

  function clearTarget() {
    if (!state.selectedTarget) return false;
    state.selectedTarget = null;
    updateTargetHUD();
    if (targetRingGroup) targetRingGroup.visible = false;
    renderActionBarUI();
    return true;
  }

  function hasTarget() {
    return !!state.selectedTarget;
  }

  // Pass 82: Smart Context Auto-Targeting on Attack!
  // Pressing an offensive move with no target (or with a friendly target selected during a martial attack)
  // automatically acquires the nearest hostile (or rift) in front of the shark!
  function ensureSmartOffensiveTarget(maxDist = 30.0, allowRift = false) {
    const p = window.player;
    if (!p || !p.pos) return null;

    if (state.selectedTarget) {
      const curCat = state.selectedTarget.category;
      const tPos = state.selectedTarget.getPos && state.selectedTarget.getPos();
      const d = tPos ? Math.hypot(tPos.x - p.pos.x, tPos.z - p.pos.z) : 999;
      if ((curCat === 'hostile' || (allowRift && curCat === 'rift')) && d <= maxDist + 8.0) {
        return state.selectedTarget;
      }
      if (state.selectedTarget.category !== 'friendly' && d <= maxDist + 8.0) {
        return state.selectedTarget;
      }
    }

    const fwdX = Math.sin(p.rotY);
    const fwdZ = Math.cos(p.rotY);
    const candidates = getTargetables().filter((t) =>
      t.category === 'hostile' || (allowRift && t.category === 'rift')
    );
    if (candidates.length === 0) return state.selectedTarget;

    let best = null;
    let bestScore = 9999;

    candidates.forEach((t) => {
      const pos = t.getPos();
      if (!pos) return;
      const dx = pos.x - p.pos.x;
      const dz = pos.z - p.pos.z;
      const dist = Math.hypot(dx, dz);
      if (dist > maxDist) return;
      const dot = dist > 0.05 ? (dx / dist) * fwdX + (dz / dist) * fwdZ : 1.0;
      // Prefer targets in frontal cone (dot >= -0.25) or very close (< 5m)
      if (dot < -0.35 && dist > 5.5) return;
      const score = dist - dot * 6.5 + (t.category === 'rift' ? 4.0 : 0.0);
      if (score < bestScore) {
        bestScore = score;
        best = t;
      }
    });

    if (best) {
      setTarget(best, false);
      return best;
    }
    return state.selectedTarget;
  }

  function cycleTarget(dir = 1) {
    const p = window.player;
    const cam = window.camState;
    if (!p || !p.pos) return null;

    const all = getTargetables();
    if (all.length === 0) {
      clearTarget();
      return null;
    }

    // Filter to within 75m of player
    const nearby = all
      .map((t) => {
        const pos = t.getPos();
        const dx = pos.x - p.pos.x;
        const dz = pos.z - p.pos.z;
        const dist = Math.hypot(dx, dz);
        // Frontal cone alignment relative to camera view direction
        const fwdX = cam ? -Math.sin(cam.yaw) : Math.sin(p.rotY);
        const fwdZ = cam ? -Math.cos(cam.yaw) : Math.cos(p.rotY);
        const dot = dist > 0.01 ? (dx / dist) * fwdX + (dz / dist) * fwdZ : 1.0;
        const priorityWeight = t.category === 'hostile' ? 0 : (t.category === 'rift' ? 12 : 25);
        const score = dist - dot * 8.0 + priorityWeight;
        return { t, dist, dot, score };
      })
      .filter((item) => item.dist <= 85.0);

    const pool = nearby.length > 0 ? nearby : all.map((t) => ({
      t,
      dist: Math.hypot(t.getPos().x - p.pos.x, t.getPos().z - p.pos.z),
      score: Math.hypot(t.getPos().x - p.pos.x, t.getPos().z - p.pos.z)
    }));

    pool.sort((a, b) => a.score - b.score);

    const curId = state.selectedTarget ? state.selectedTarget.id : null;
    let idx = pool.findIndex((x) => x.t.id === curId);
    if (idx === -1) {
      idx = dir > 0 ? 0 : pool.length - 1;
    } else {
      idx = (idx + dir + pool.length) % pool.length;
    }

    const chosen = pool[idx].t;
    setTarget(chosen, true);
    return chosen;
  }

  function handleCanvasClick(clientX, clientY, camera, isRightClick = false) {
    if (!camera || !window.player || !window.player.pos) return false;
    const p = window.player;
    const all = getTargetables();

    const ndcX = (clientX / window.innerWidth) * 2 - 1;
    const ndcY = -(clientY / window.innerHeight) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);

    let bestTarget = null;
    let bestRayDist = 999;

    const tmpCenter = new THREE.Vector3();
    all.forEach((t) => {
      const pos = t.getPos();
      if (!pos) return;
      tmpCenter.set(pos.x, (pos.y || 0) + 0.9, pos.z);
      const distToCamera = tmpCenter.distanceTo(camera.position);
      if (distToCamera > 95.0) return;

      const hitRadius = (t.radius || 1.8) * 1.15;
      const distFromRay = raycaster.ray.distanceToPoint(tmpCenter);
      if (distFromRay <= hitRadius && distToCamera < bestRayDist) {
        bestRayDist = distToCamera;
        bestTarget = t;
      }
    });

    if (bestTarget) {
      setTarget(bestTarget, true);
      const tPos = bestTarget.getPos();
      if (tPos) {
        faceWorldPoint(tPos.x, tPos.z, false);
      }
      if (isRightClick && tPos) {
        // Right-clicking a target auto-executes primary strike or friendly interaction!
        const d = Math.hypot(tPos.x - p.pos.x, tPos.z - p.pos.z);
        if (bestTarget.category === 'hostile') {
          if (d <= 6.5) executeAbility('poky_fin_strike');
          else if (d <= 28.0) executeAbility('breb_volley');
          else executeAbility('single_fin_lunge');
        } else if (bestTarget.category === 'rift') {
          if (d <= 12.0 && window.BlahajGame && typeof window.BlahajGame.triggerInteract === 'function') {
            window.BlahajGame.triggerInteract();
          } else {
            executeAbility('single_fin_lunge');
          }
        } else if (bestTarget.category === 'friendly') {
          if (d <= 5.5 && window.BlahajGame && typeof window.BlahajGame.triggerInteract === 'function') {
            window.BlahajGame.triggerInteract();
          }
        }
      }
      return true;
    }

    // Pass 82B: Click-to-Face on Open Ground / Water / Horizon!
    // Clicking anywhere in the 3D world smoothly pivots the shark model & camera to face that clicked direction.
    const ray = raycaster.ray;
    let hitX = null;
    let hitZ = null;
    if (Math.abs(ray.direction.y) > 0.035) {
      const tPlane = (p.pos.y - ray.origin.y) / ray.direction.y;
      if (tPlane > 0.5 && tPlane < 180.0) {
        hitX = ray.origin.x + ray.direction.x * tPlane;
        hitZ = ray.origin.z + ray.direction.z * tPlane;
      }
    }
    if (hitX === null || hitZ === null) {
      // Clicked near or above the horizon: project the ray's horizontal direction forward from the shark
      const horizLen = Math.hypot(ray.direction.x, ray.direction.z) || 1.0;
      hitX = p.pos.x + (ray.direction.x / horizLen) * 24.0;
      hitZ = p.pos.z + (ray.direction.z / horizLen) * 24.0;
    }

    return faceWorldPoint(hitX, hitZ, true);
  }

  // --------------------------------------------------------------------------
  // 3D TARGET SELECTION RING & DEFENSIVE POSTURE AURA MESHES
  // --------------------------------------------------------------------------
  function ensureTargetRing3D() {
    if (targetRingGroup) return;
    targetRingGroup = new THREE.Group();

    const outerGeo = new THREE.RingGeometry(1.35, 1.68, 36);
    outerGeo.rotateX(-Math.PI / 2);
    const outerMat = new THREE.MeshBasicMaterial({
      color: 0xf43f5e,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.88,
      depthWrite: false
    });
    targetRingOuter = new THREE.Mesh(outerGeo, outerMat);
    targetRingGroup.add(targetRingOuter);

    const innerGeo = new THREE.RingGeometry(0.95, 1.12, 6);
    innerGeo.rotateX(-Math.PI / 2);
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.72,
      depthWrite: false
    });
    targetRingInner = new THREE.Mesh(innerGeo, innerMat);
    targetRingInner.position.y = 0.02;
    targetRingGroup.add(targetRingInner);

    targetRingGroup.visible = false;
  }

  function updateTargetRing3D(elapsed) {
    ensureTargetRing3D();
    const activeScene = typeof window.getActiveScene === 'function' ? window.getActiveScene() : window.scene;
    if (!activeScene) return;

    if (!state.selectedTarget) {
      targetRingGroup.visible = false;
      return;
    }

    const pos = state.selectedTarget.getPos && state.selectedTarget.getPos();
    if (!pos) {
      clearTarget();
      return;
    }

    // Check if target is still valid (e.g., enemy banished or rift mended)
    if (state.selectedTarget.kind === 'enemy' && state.selectedTarget.ref) {
      const e = state.selectedTarget.ref;
      if (e.state === 'banished' || e.state === 'respawning' || e.hp <= 0) {
        clearTarget();
        return;
      }
    }
    if (state.selectedTarget.kind === 'rift' && state.selectedTarget.ref && state.selectedTarget.ref.mended) {
      clearTarget();
      return;
    }

    if (targetRingGroup.parent !== activeScene) {
      if (targetRingGroup.parent) targetRingGroup.parent.remove(targetRingGroup);
      activeScene.add(targetRingGroup);
    }

    targetRingGroup.visible = true;
    targetRingGroup.position.set(pos.x, (pos.y || 0) + 0.12, pos.z);
    targetRingOuter.rotation.z = elapsed * 1.4;
    targetRingInner.rotation.z = -elapsed * 2.2;
    const pulse = 1.0 + Math.sin(elapsed * 5.0) * 0.06;
    targetRingGroup.scale.set(pulse, 1, pulse);

    if (state.selectedTarget.category === 'hostile') {
      targetRingOuter.material.color.setHex(0xf43f5e);
      targetRingInner.material.color.setHex(0xfbbf24);
    } else if (state.selectedTarget.category === 'rift') {
      targetRingOuter.material.color.setHex(0xa855f7);
      targetRingInner.material.color.setHex(0x38bdf8);
    } else {
      targetRingOuter.material.color.setHex(0x10b981);
      targetRingInner.material.color.setHex(0x67e8f9);
    }
  }

  function ensurePostureAura3D() {
    if (postureAuraGroup) return;
    postureAuraGroup = new THREE.Group();

    const sphereGeo = new THREE.IcosahedronGeometry(1.75, 1);
    const sphereMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.45,
      depthWrite: false
    });
    postureAuraMesh = new THREE.Mesh(sphereGeo, sphereMat);
    postureAuraMesh.position.y = 0.85;
    postureAuraGroup.add(postureAuraMesh);
    postureAuraGroup.visible = false;
  }

  function updatePostureAura3D(dt, elapsed) {
    ensurePostureAura3D();
    const p = window.player;
    const activeScene = typeof window.getActiveScene === 'function' ? window.getActiveScene() : window.scene;
    if (!p || !p.pos || !activeScene) return;

    // Sync activePostureId onto 3D shark rig so fins hold their guard pose!
    if (p.mesh && p.mesh.userData) {
      p.mesh.userData.activePostureId = (state.activePosture && state.activePosture.remaining > 0)
        ? state.activePosture.id
        : null;
    }

    if (!state.activePosture || state.activePosture.remaining <= 0) {
      postureAuraGroup.visible = false;
      return;
    }

    if (postureAuraGroup.parent !== activeScene) {
      if (postureAuraGroup.parent) postureAuraGroup.parent.remove(postureAuraGroup);
      activeScene.add(postureAuraGroup);
    }

    postureAuraGroup.visible = true;
    postureAuraGroup.position.copy(p.pos);
    postureAuraMesh.rotation.y = elapsed * 2.4;
    postureAuraMesh.rotation.x = Math.sin(elapsed * 1.8) * 0.25;

    if (state.activePosture.id === 'fin_deflection') {
      postureAuraMesh.material.color.setHex(0x38bdf8);
      postureAuraMesh.scale.setScalar(1.0 + Math.sin(elapsed * 8.0) * 0.08);
    } else {
      postureAuraMesh.material.color.setHex(0x10b981);
      postureAuraMesh.scale.setScalar(1.12 + Math.sin(elapsed * 4.0) * 0.05);
    }
  }

  // --------------------------------------------------------------------------
  // 3D COMBAT SLASH RIBBONS, GRAPNEL TETHER, SHOCKWAVES & BREB PROJECTILES
  // --------------------------------------------------------------------------
  function spawnRingWaveVFX(originPos, colorHex = 0x38bdf8, maxScale = 4.5, duration = 0.42) {
    const activeScene = typeof window.getActiveScene === 'function' ? window.getActiveScene() : window.scene;
    if (!activeScene) return;
    const geo = new THREE.RingGeometry(0.4, 0.85, 28);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({
      color: colorHex,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
      depthWrite: false
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(originPos.x, (originPos.y || 0) + 0.45, originPos.z);
    activeScene.add(mesh);
    state.vfxMeshes.push({ mesh, life: duration, maxLife: duration, maxScale });
  }

  // Pass 82: 3D Crescent Slash Ribbon VFX for Fin Strikes & Tail Swipes
  function spawnSlashArcVFX(originPos, facingYaw, colorHex = 0x38bdf8, radius = 2.4, tiltZ = 0.25, duration = 0.28) {
    const activeScene = typeof window.getActiveScene === 'function' ? window.getActiveScene() : window.scene;
    if (!activeScene) return;
    const geo = new THREE.RingGeometry(radius * 0.58, radius, 22, 1, -Math.PI * 0.48, Math.PI * 0.96);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({
      color: colorHex,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95,
      depthWrite: false
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(
      originPos.x + Math.sin(facingYaw) * 0.65,
      (originPos.y || 0) + 0.92,
      originPos.z + Math.cos(facingYaw) * 0.65
    );
    mesh.rotation.y = facingYaw;
    mesh.rotation.z = tiltZ;
    activeScene.add(mesh);
    state.vfxMeshes.push({ mesh, life: duration, maxLife: duration, maxScale: 1.45, spinY: tiltZ > 0 ? 5.5 : -5.5 });
  }

  // Pass 82: 3D Brass Measuring-Tape Grapnel Tether VFX
  function spawnGrapnelTapeVFX(startPos, endPos, colorHex = 0xfacc15, duration = 0.36) {
    const activeScene = typeof window.getActiveScene === 'function' ? window.getActiveScene() : window.scene;
    if (!activeScene) return;
    const a = new THREE.Vector3(startPos.x, (startPos.y || 0) + 0.95, startPos.z);
    const b = new THREE.Vector3(endPos.x, (endPos.y || 0) + 0.95, endPos.z);
    const dist = Math.max(0.5, a.distanceTo(b));
    const geo = new THREE.CylinderGeometry(0.06, 0.06, dist, 8);
    geo.rotateX(Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.95
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(a).lerp(b, 0.5);
    mesh.lookAt(b);
    activeScene.add(mesh);
    state.vfxMeshes.push({ mesh, life: duration, maxLife: duration, maxScale: 1.0, isLine: true });
  }

  function spawnBrebVolleyProjectiles(originPos, targetPos, baseYaw, finMod = null) {
    const activeScene = typeof window.getActiveScene === 'function' ? window.getActiveScene() : window.scene;
    if (!activeScene) return;

    const spreads = [-0.14, 0.0, 0.14];
    spreads.forEach((angleOffset, i) => {
      const loafGeo = new THREE.CapsuleGeometry
        ? new THREE.CapsuleGeometry(0.16, 0.34, 6, 10)
        : new THREE.BoxGeometry(0.28, 0.22, 0.52);
      const loafMat = new THREE.MeshStandardMaterial({
        color: finMod && finMod.rangedSeamStitch ? 0xc084fc : 0xd99b4e,
        emissive: finMod && finMod.rangedSeamStitch ? 0x6b21a8 : 0x78350f,
        emissiveIntensity: 0.45,
        roughness: 0.55
      });
      const mesh = new THREE.Mesh(loafGeo, loafMat);
      mesh.rotation.x = Math.PI / 2;

      const start = new THREE.Vector3(originPos.x, originPos.y + 1.05, originPos.z);
      mesh.position.copy(start);
      activeScene.add(mesh);

      let dirX = Math.sin(baseYaw + angleOffset);
      let dirZ = Math.cos(baseYaw + angleOffset);
      let dist = 14.0;
      if (targetPos) {
        const dx = targetPos.x - originPos.x;
        const dz = targetPos.z - originPos.z;
        const baseAngle = Math.atan2(dx, dz) + angleOffset;
        dirX = Math.sin(baseAngle);
        dirZ = Math.cos(baseAngle);
        dist = Math.max(4.0, Math.min(28.0, Math.hypot(dx, dz)));
      }

      const flightSpeed = 22.0;
      const flightTime = dist / flightSpeed;
      const vel = new THREE.Vector3(
        dirX * flightSpeed,
        4.2 + (i === 1 ? 1.2 : 0.6),
        dirZ * flightSpeed
      );

      state.projectiles.push({
        mesh,
        vel,
        canStitchSeam: !!(finMod && finMod.rangedSeamStitch),
        life: Math.min(1.6, flightTime + 0.35)
      });
    });
  }

  // --------------------------------------------------------------------------
  // EXECUTING OFFENSIVE, DEFENSIVE & RANGED ABILITIES
  // --------------------------------------------------------------------------
  function trigger3DMartialPose(poseName, duration = 0.42, isComboProc = false) {
    const p = window.player;
    if (!p || !p.mesh || !p.mesh.userData) return;
    const ud = p.mesh.userData;
    ud.martialPose = poseName;
    ud.martialDuration = duration;
    ud.martialTimer = duration;
    ud.isComboProc = !!isComboProc;
    if (poseName === 'poky_strike') {
      ud.strikeHand = state.strikeHandToggle;
      state.strikeHandToggle = -state.strikeHandToggle;
    }
  }

  function faceSelectedTargetIfClose(maxTurnDist = 28.0) {
    const p = window.player;
    if (!p || !state.selectedTarget) return;
    const tPos = state.selectedTarget.getPos && state.selectedTarget.getPos();
    if (!tPos) return;
    const dx = tPos.x - p.pos.x;
    const dz = tPos.z - p.pos.z;
    const d = Math.hypot(dx, dz);
    if (d > 0.2 && d <= maxTurnDist) {
      p.rotY = Math.atan2(dx, dz);
    }
  }

  function damageEnemiesAndCarrotsInArc(centerPos, facingYaw, maxRadius, halfAngleCos, baseDamage, knockScale = 1.0, vfxColor = 0x38bdf8, opts = {}) {
    let hitCount = 0;
    const fwdX = Math.sin(facingYaw);
    const fwdZ = Math.cos(facingYaw);
    const g = window.BlahajGame;
    const worldApi = g && typeof g.getWorldApi === 'function' ? g.getWorldApi() : null;
    const zone = g && typeof g.getZone === 'function' ? g.getZone() : 'island';
    const finMod = getActiveFinModifier();

    // 1. Check Mean Sharks / Sea Invaders
    if (window.BlahajEnemies && typeof window.BlahajEnemies.getEnemies === 'function') {
      const enemies = window.BlahajEnemies.getEnemies();
      enemies.forEach((e) => {
        if (!e || e.state === 'banished' || e.state === 'respawning' || e.hp <= 0) return;
        const dx = e.pos.x - centerPos.x;
        const dz = e.pos.z - centerPos.z;
        const d = Math.hypot(dx, dz);
        if (d <= maxRadius) {
          const dot = d > 0.05 ? (dx / d) * fwdX + (dz / d) * fwdZ : 1.0;
          if (dot >= halfAngleCos || d < 2.1) {
            let finalDmg = baseDamage;
            let isCrit = !!opts.forceCrit;
            // Sacred Scissors / Binoculars Crit & Flanking Bonus
            if (!isCrit) {
              const critChance = 0.12 + (finMod && finMod.critChanceBonus ? finMod.critChanceBonus : 0);
              if (Math.random() < critChance) isCrit = true;
            }
            if (finMod && finMod.flankBonusMult && e.rotY !== undefined) {
              const enemyFwdX = Math.sin(e.rotY);
              const enemyFwdZ = Math.cos(e.rotY);
              const flankDot = fwdX * enemyFwdX + fwdZ * enemyFwdZ;
              if (flankDot > 0.25) {
                finalDmg = Math.round(finalDmg * finMod.flankBonusMult);
                isCrit = true;
              }
            }
            if (finMod && finMod.armorBreakerMult && e.isLandInvader) {
              finalDmg = Math.round(finalDmg * finMod.armorBreakerMult);
            }
            if (isCrit) {
              finalDmg = Math.round(finalDmg * (opts.critMult || 1.45));
            }

            const knockDir = new THREE.Vector3(dx, 0, dz);
            if (knockDir.lengthSq() < 0.01) knockDir.set(fwdX, 0, fwdZ);
            knockDir.normalize().multiplyScalar(knockScale);
            const boopArg = (typeof e.mange === 'number' && finalDmg > 1.5) ? (finalDmg / 100) : finalDmg;
            e.takeBoop(boopArg, knockDir);
            spawnFloatingCombatText(
              e.pos,
              opts.comboLabel ? `${opts.comboLabel} ${finalDmg}!` : (isCrit ? `⚡ ${finalDmg} CRIT!` : `${finalDmg}`),
              opts.comboLabel ? 'proc' : (isCrit ? 'crit' : 'normal')
            );
            hitCount++;
          }
        }
      });
    }

    // 2. Check Balcony Carrots
    if ((zone === 'island' || zone === 'overworld') && worldApi && typeof worldApi.getBalconyCarrots === 'function') {
      worldApi.getBalconyCarrots().forEach((c) => {
        if (!c || c.knockedOff || !c.mesh) return;
        const dx = c.mesh.position.x - centerPos.x;
        const dz = c.mesh.position.z - centerPos.z;
        const d = Math.hypot(dx, dz);
        if (d <= maxRadius) {
          const dot = d > 0.05 ? (dx / d) * fwdX + (dz / d) * fwdZ : 1.0;
          if (dot >= halfAngleCos || d < 2.2) {
            c.knockedOff = true;
            c.respawnTimer = 9.5;
            const pushDir = new THREE.Vector3(dx || fwdX, 0, dz || fwdZ).normalize();
            if (!c.structureId && pushDir.z > -0.25) pushDir.z = -0.75;
            c.vel.set(pushDir.x * 14.5 * knockScale, 10.0 * knockScale, pushDir.z * 15.5 * knockScale);
            if (window.CozyAudio && window.CozyAudio.carrotBoop) window.CozyAudio.carrotBoop();
            if (window.player) {
              window.player.carrotsKnockedCount = (window.player.carrotsKnockedCount || 0) + 1;
              if (window.player.carrotsKnockedCount % 5 === 0) window.player.trialPoints = (window.player.trialPoints || 0) + 1;
            }
            spawnFloatingCombatText(c.mesh.position, '🥕 BOOPED!', 'crit');
            hitCount++;
          }
        }
      });
    }

    // 3. Check Volcano Instance Carrots
    if (zone === 'volcano' && window.BlahajVolcano && typeof window.BlahajVolcano.getCarrots === 'function') {
      window.BlahajVolcano.getCarrots().forEach((c, idx) => {
        if (!c || c.state !== 'home') return;
        const cPos = (c.mesh && c.mesh.position) || c.pos || c.home;
        if (!cPos) return;
        const dx = cPos.x - centerPos.x;
        const dz = cPos.z - centerPos.z;
        const d = Math.hypot(dx, dz);
        if (d <= maxRadius) {
          const pushDir = new THREE.Vector3(dx || fwdX, 0, dz || fwdZ).normalize();
          if (pushDir.z > -0.25) pushDir.z = -0.75;
          if (window.BlahajVolcano.knockCarrot(idx, pushDir.x * 13.0 * knockScale, 9.0 * knockScale, pushDir.z * 15.0 * knockScale)) {
            if (window.CozyAudio && window.CozyAudio.carrotBoop) window.CozyAudio.carrotBoop();
            if (window.player) {
              window.player.carrotsKnockedCount = (window.player.carrotsKnockedCount || 0) + 1;
              if (window.player.carrotsKnockedCount % 5 === 0) window.player.trialPoints = (window.player.trialPoints || 0) + 1;
            }
            spawnFloatingCombatText(cPos, '🥕 LAUNCHED!', 'crit');
            hitCount++;
          }
        }
      });
    }

    spawnRingWaveVFX(centerPos, vfxColor, maxRadius * 0.72, 0.36);
    return hitCount;
  }

  function executeAbility(abilityId) {
    const ab = ABILITIES[abilityId];
    const p = window.player;
    const g = window.BlahajGame;
    if (!ab || !p || !p.pos || !g) return false;

    const sId = getActiveSharkId();
    if (!isAbilityLearned(sId, abilityId)) {
      learnAbility(sId, abilityId, true);
    }

    const remCd = state.cooldowns[abilityId] || 0;
    if (remCd > 0.05) {
      // Pass 82: 0.38s Spell Queue Window!
      if (remCd <= 0.38) {
        state.queuedAbilityId = abilityId;
        state.queuedExpire = 0.55;
        renderActionBarUI();
      }
      return false;
    }

    state.queuedAbilityId = null;

    const finMod = ab.usesFinMod ? getActiveFinModifier() : null;
    const anyFinMod = getActiveFinModifier();
    const dmgMult = finMod ? finMod.dmgMult : 1.0;
    const knockMult = finMod ? finMod.knockMult : 1.0;
    const rangeBonus = finMod ? finMod.rangeBonus : 0.0;
    const vfxColor = finMod ? finMod.colorHex : 0x38bdf8;

    state.cooldowns[abilityId] = ab.cooldown;
    state.maxCooldowns[abilityId] = ab.cooldown;

    // Pass 82: Smart Context Auto-Targeting on Offensive Abilities!
    if (ab.isOffensive && abilityId !== 'snoot_boop') {
      const allowRift = !!(anyFinMod && anyFinMod.rangedSeamStitch) || abilityId === 'single_fin_lunge';
      ensureSmartOffensiveTarget(Math.max(16.0, ab.range + rangeBonus + 6.0), allowRift);
    }

    if (abilityId === 'poky_fin_strike') {
      const isCrossSlashProc = (state.comboProcs.poky_fin_strike || 0) > 0;
      if (isCrossSlashProc) {
        state.comboProcs.poky_fin_strike = 0;
      }

      faceSelectedTargetIfClose(ab.range + rangeBonus + 3.0);
      trigger3DMartialPose('poky_strike', isCrossSlashProc ? 0.48 : 0.38, isCrossSlashProc);
      if (window.CozyAudio && window.CozyAudio.boopAttack) window.CozyAudio.boopAttack();

      const fwd = new THREE.Vector3(Math.sin(p.rotY), 0, Math.cos(p.rotY));
      p.pos.addScaledVector(fwd, isCrossSlashProc ? 0.65 : 0.42);

      // 3D Crescent Slash Arc VFX (Dual X-Arcs on Cross-Slash Proc!)
      spawnSlashArcVFX(p.pos, p.rotY, isCrossSlashProc ? 0xfbbf24 : vfxColor, 2.35, state.strikeHandToggle > 0 ? 0.28 : -0.28, 0.28);
      if (isCrossSlashProc) {
        spawnSlashArcVFX(p.pos, p.rotY, 0xf43f5e, 2.55, -0.32, 0.32);
      }

      const hits = damageEnemiesAndCarrotsInArc(
        p.pos,
        p.rotY,
        ab.range + rangeBonus + (isCrossSlashProc ? 0.8 : 0),
        0.15,
        Math.round(38 * dmgMult * (isCrossSlashProc ? 1.35 : 1.0)),
        1.1 * knockMult * (isCrossSlashProc ? 1.25 : 1.0),
        isCrossSlashProc ? 0xfbbf24 : vfxColor,
        {
          forceCrit: isCrossSlashProc,
          critMult: 1.35,
          comboLabel: isCrossSlashProc ? '⚔️ CROSS-SLASH' : null
        }
      );

      if (finMod && finMod.healComfort) {
        p.teaComfort = Math.min(100, (p.teaComfort || 80) + finMod.healComfort);
        p.warmth = Math.min(100, (p.warmth || 80) + finMod.healComfort);
      }
      if (anyFinMod && anyFinMod.rangedSeamStitch && window.BlahajSeam) {
        const nearRift = window.BlahajSeam.getNearestRift(p.pos, g.getZone());
        if (nearRift && nearRift.nearest && nearRift.nearest.dist < 14.0) {
          window.BlahajSeam.mendRift(nearRift.nearest.id);
          spawnFloatingCombatText(nearRift.nearest.pos || p.pos, '🪡 SEAM MENDED!', 'proc');
        }
      }
      renderActionBarUI();
      return { abilityId, hits, isCrossSlashProc, finMod: finMod ? finMod.strikeName : ab.name };
    }

    if (abilityId === 'single_fin_lunge') {
      const isGrapnel = !!(finMod && finMod.isGrapnel);
      const maxLungeRange = isGrapnel ? 18.5 : (ab.range + rangeBonus);
      faceSelectedTargetIfClose(maxLungeRange + 4.0);

      const maxDash = isGrapnel ? 15.5 : (8.5 + rangeBonus * 0.5);
      let dashDist = 6.8;
      if (state.selectedTarget && state.selectedTarget.getPos) {
        const tPos = state.selectedTarget.getPos();
        const d = Math.hypot(tPos.x - p.pos.x, tPos.z - p.pos.z);
        dashDist = Math.max(2.0, Math.min(maxDash, d - 1.4));
      }

      const fwdX = Math.sin(p.rotY);
      const fwdZ = Math.cos(p.rotY);
      const startPos = p.pos.clone();
      const targetX = p.pos.x + fwdX * dashDist;
      const targetZ = p.pos.z + fwdZ * dashDist;

      const zone = g.getZone();
      const worldApi = g.getWorldApi();
      if (zone === 'volcano' && window.BlahajVolcano) {
        const res = window.BlahajVolcano.resolveMove(p.pos, { x: targetX, z: targetZ }, p.isGrounded);
        if (res) { p.pos.x = res.x; p.pos.z = res.z; }
      } else if (zone === 'spawning_pits' && window.BlahajSpawningPits) {
        const res = window.BlahajSpawningPits.resolveMove(p.pos, { x: targetX, z: targetZ });
        if (res) { p.pos.x = res.x; p.pos.z = res.z; }
      } else {
        p.pos.x = targetX;
        p.pos.z = targetZ;
        if (worldApi && typeof worldApi.getGroundAndStructureHeight === 'function' && !p.isSwimming) {
          p.pos.y = Math.max(p.pos.y, worldApi.getGroundAndStructureHeight(p.pos.x, p.pos.z, p.pos.y));
        }
      }

      trigger3DMartialPose('fin_lunge', 0.46, false);
      if (window.CozyAudio && window.CozyAudio.boopAttack) window.CozyAudio.boopAttack();
      spawnRingWaveVFX(startPos, vfxColor, 2.8, 0.3);
      spawnSlashArcVFX(p.pos, p.rotY, vfxColor, 2.6, 0.15, 0.3);

      if (isGrapnel) {
        spawnGrapnelTapeVFX(startPos, p.pos, 0xfacc15, 0.38);
        spawnFloatingCombatText(p.pos, '📏 GRAPNEL PULL!', 'proc');
      }

      const hits = damageEnemiesAndCarrotsInArc(
        p.pos,
        p.rotY,
        5.8 + rangeBonus * 0.5,
        -0.2,
        Math.round(55 * dmgMult),
        1.45 * knockMult,
        vfxColor
      );

      // Pass 82 Combo Chain: Single Fin Lunge [2] triggers Twin-Fin Cross-Slash Proc on Poky Fin Strike [1]!
      state.comboProcs.poky_fin_strike = 6.0;
      state.cooldowns.poky_fin_strike = 0;

      renderActionBarUI();
      return { abilityId, hits, isGrapnel, finMod: finMod ? finMod.lungeName : ab.name };
    }

    if (abilityId === 'tail_swipe') {
      const isRiposteProc = (state.comboProcs.tail_swipe || 0) > 0;
      if (isRiposteProc) state.comboProcs.tail_swipe = 0;

      faceSelectedTargetIfClose(9.0);
      trigger3DMartialPose('tail_swipe', 0.45, isRiposteProc);
      if (window.CozyAudio && window.CozyAudio.waterSplash) window.CozyAudio.waterSplash(0.22, 0.28);
      if (window.CozyAudio && window.CozyAudio.boopAttack) window.CozyAudio.boopAttack();

      spawnSlashArcVFX(p.pos, p.rotY, isRiposteProc ? 0xfbbf24 : 0x38bdf8, 3.4, -0.18, 0.34);

      const hits = damageEnemiesAndCarrotsInArc(
        p.pos,
        p.rotY,
        ab.range,
        -0.15, // Wide 195-degree frontal/side arc
        Math.round(45 * (isRiposteProc ? 1.4 : 1.0)),
        1.65 * (isRiposteProc ? 1.25 : 1.0),
        isRiposteProc ? 0xfbbf24 : 0x38bdf8,
        {
          forceCrit: isRiposteProc,
          comboLabel: isRiposteProc ? '🌊 RIPOSTE CLEAVE' : null
        }
      );
      renderActionBarUI();
      return { abilityId, hits, isRiposteProc };
    }

    if (abilityId === 'tail_spin') {
      const isRiposteProc = (state.comboProcs.tail_spin || 0) > 0;
      if (isRiposteProc) state.comboProcs.tail_spin = 0;

      trigger3DMartialPose('tail_spin', 0.58, isRiposteProc);
      if (p.isGrounded && !p.inBoat) {
        p.velY = 6.2;
        p.isGrounded = false;
      }
      if (window.CozyAudio && window.CozyAudio.waterSplash) window.CozyAudio.waterSplash(0.25, 0.35);
      if (window.CozyAudio && window.CozyAudio.boopAttack) window.CozyAudio.boopAttack();

      spawnSlashArcVFX(p.pos, p.rotY, 0x2dd4bf, 3.6, 0.12, 0.38);
      spawnSlashArcVFX(p.pos, p.rotY + Math.PI, 0x38bdf8, 3.6, -0.12, 0.38);

      const hits = damageEnemiesAndCarrotsInArc(
        p.pos,
        p.rotY,
        ab.range,
        -1.0, // Full 360-degree cyclone
        Math.round(52 * (isRiposteProc ? 1.4 : 1.0)),
        1.75 * (isRiposteProc ? 1.25 : 1.0),
        isRiposteProc ? 0xfbbf24 : 0x2dd4bf,
        {
          forceCrit: isRiposteProc,
          comboLabel: isRiposteProc ? '🌪️ RIPOSTE CYCLONE' : null
        }
      );
      renderActionBarUI();
      return { abilityId, hits, isRiposteProc };
    }

    if (abilityId === 'fin_deflection') {
      const postureTitle = finMod ? finMod.parryName : 'Fin Deflection Posture';
      state.activePosture = {
        id: 'fin_deflection',
        name: postureTitle,
        icon: finMod ? `${finMod.icon}🛡️` : '🛡️⚡',
        remaining: 2.8,
        duration: 2.8,
        sub: '100% Parry & Shockwave Rebound Active'
      };
      if (p.mesh && p.mesh.userData) {
        p.mesh.userData.activePostureId = 'fin_deflection';
      }
      // Pass 82 Combo Chain: Fin Deflection [E] primes Counter-Riposte on Tail Swipe [3] & Tail Spin [Q]!
      state.comboProcs.tail_swipe = 5.0;
      state.comboProcs.tail_spin = 5.0;
      state.cooldowns.tail_swipe = 0;
      state.cooldowns.tail_spin = 0;

      if (window.CozyAudio && window.CozyAudio.portalChime) window.CozyAudio.portalChime();
      spawnRingWaveVFX(p.pos, 0x38bdf8, 3.8, 0.45);
      spawnFloatingCombatText(p.pos, '🛡️ FIN PARRY READY!', 'proc');
      updatePostureBannerUI();
      renderActionBarUI();
      return { abilityId, posture: state.activePosture.name };
    }

    if (abilityId === 'double_fin_defense') {
      state.activePosture = {
        id: 'double_fin_defense',
        name: 'Double Fin Defense Aegis',
        icon: '🛡️🦈',
        remaining: 5.5,
        duration: 5.5,
        sub: '80% Damage & Mange Reduction · Knockback Immune'
      };
      if (p.mesh && p.mesh.userData) {
        p.mesh.userData.activePostureId = 'double_fin_defense';
      }
      p.warmth = Math.min(100, (p.warmth || 80) + 20);
      p.stuffing = Math.min(100, (p.stuffing || 80) + 20);
      if (window.CozyAudio && window.CozyAudio.allenBuild) window.CozyAudio.allenBuild();
      spawnRingWaveVFX(p.pos, 0x10b981, 4.2, 0.5);
      spawnFloatingCombatText(p.pos, '🛡️🦈 DOUBLE FIN AEGIS!', 'heal');
      updatePostureBannerUI();
      renderActionBarUI();
      return { abilityId, posture: state.activePosture.name };
    }

    if (abilityId === 'breb_volley') {
      faceSelectedTargetIfClose(30.0);
      const tPos = (state.selectedTarget && state.selectedTarget.getPos) ? state.selectedTarget.getPos() : null;
      spawnBrebVolleyProjectiles(p.pos, tPos, p.rotY, anyFinMod);
      if (typeof g.triggerFeedBreb === 'function') {
        g.triggerFeedBreb();
      }
      // Pass 82: Aetheric Diviner allows Ranged Breb Volley to stitch Great Seam rifts within 14m!
      if (anyFinMod && anyFinMod.rangedSeamStitch && window.BlahajSeam) {
        const nearRift = window.BlahajSeam.getNearestRift(p.pos, g.getZone());
        if (nearRift && nearRift.nearest && nearRift.nearest.dist < 14.5) {
          window.BlahajSeam.mendRift(nearRift.nearest.id);
          spawnFloatingCombatText(nearRift.nearest.pos || p.pos, '🪡 RANGED SEAM STITCH!', 'proc');
        }
      }
      renderActionBarUI();
      return { abilityId, ranged: true };
    }

    if (abilityId === 'soothing_tea_pulse') {
      if (typeof g.applySteamingSpiritBuff === 'function') {
        g.applySteamingSpiritBuff();
      }
      if (typeof g.adjustSharkMange === 'function') {
        g.adjustSharkMange(p.sharkId, -0.15, 'Sacred Tea Infusion');
      }
      p.stuffing = 100;
      p.warmth = 100;
      p.teaComfort = 100;
      spawnRingWaveVFX(p.pos, 0x34d399, 5.5, 0.55);
      spawnFloatingCombatText(p.pos, '🍵 +100% TEA COMFORT!', 'heal');
      renderActionBarUI();
      return { abilityId, healed: true };
    }

    if (abilityId === 'founder_signature') {
      if (typeof g.triggerSignatureAbility === 'function') {
        g.triggerSignatureAbility();
      }
      spawnRingWaveVFX(p.pos, 0xc084fc, 5.2, 0.5);
      renderActionBarUI();
      return { abilityId };
    }

    if (abilityId === 'snoot_boop') {
      if (!state.selectedTarget) {
        ensureSmartOffensiveTarget(9.0, false);
      }
      faceSelectedTargetIfClose(8.0);
      if (typeof g.triggerBeepNose === 'function') {
        g.triggerBeepNose();
      }
      renderActionBarUI();
      return { abilityId };
    }

    if (abilityId === 'plush_groom') {
      if (typeof g.triggerGroomAvatar === 'function') {
        g.triggerGroomAvatar();
      }
      if (typeof g.adjustSharkMange === 'function') {
        g.adjustSharkMange(p.sharkId, -0.15, 'Self Plush Groom');
      }
      spawnRingWaveVFX(p.pos, 0x67e8f9, 3.6, 0.4);
      spawnFloatingCombatText(p.pos, '🪮 -20% MANGE GROOMED!', 'heal');
      renderActionBarUI();
      return { abilityId };
    }

    if (abilityId === 'hydro_tail_launch') {
      p.velY = 15.2;
      p.isGrounded = false;
      trigger3DMartialPose('tail_spin', 0.52, false);
      if (window.CozyAudio && window.CozyAudio.bounceBoing) window.CozyAudio.bounceBoing();
      damageEnemiesAndCarrotsInArc(p.pos, p.rotY, 5.5, -1.0, 35, 1.4, 0x38bdf8);
      renderActionBarUI();
      return { abilityId };
    }

    return false;
  }

  function triggerSlot(slotKey) {
    const normSlot = String(slotKey).toLowerCase();
    const sId = getActiveSharkId();
    const bar = state.barsByShark[sId] || CHARACTER_BASE_MIXES[sId]?.defaultBar || CHARACTER_BASE_MIXES.custom.defaultBar;
    const abilityId = bar[normSlot];
    if (!abilityId) return false;
    return executeAbility(abilityId);
  }

  // --------------------------------------------------------------------------
  // DEFENSIVE POSTURE MITIGATION HOOK (CALLED BY damagePlayer / handleVolcanoTrapHit)
  // --------------------------------------------------------------------------
  function mitigateIncomingHit(rawDamage = 16, attackerTitle = 'Enemy', knockbackDir = null) {
    if (!state.activePosture || state.activePosture.remaining <= 0) {
      return { blocked: false, damageMult: 1.0, mangeMult: 1.0, knockbackMult: 1.0 };
    }

    const p = window.player;
    if (state.activePosture.id === 'fin_deflection') {
      // 100% Parry & Shockwave Rebound + Counter-Riposte Proc!
      if (window.CozyAudio && window.CozyAudio.allenBuild) window.CozyAudio.allenBuild();
      state.comboProcs.tail_swipe = 5.0;
      state.comboProcs.tail_spin = 5.0;
      state.cooldowns.tail_swipe = 0;
      state.cooldowns.tail_spin = 0;
      if (p && p.pos) {
        damageEnemiesAndCarrotsInArc(p.pos, p.rotY, 6.8, -1.0, 48, 1.85, 0x38bdf8, {
          forceCrit: true,
          comboLabel: '🛡️ PARRY REBOUND'
        });
        p.teaComfort = Math.min(100, (p.teaComfort || 80) + 15);
        spawnFloatingCombatText(p.pos, '🛡️ PARRIED! (0 DMG)', 'proc');
      }
      renderActionBarUI();
      return {
        blocked: true,
        parried: true,
        postureName: state.activePosture.name,
        damage: 0,
        damageMult: 0.0,
        mangeMultiplier: 0.0,
        mangeMult: 0.0,
        ignoreKnockback: true,
        knockbackMult: 0.0
      };
    }

    if (state.activePosture.id === 'double_fin_defense') {
      // 80% Damage & Mange reduction + 0% Knockback
      if (window.CozyAudio && window.CozyAudio.bounceBoing) window.CozyAudio.bounceBoing();
      const reducedDmg = Math.max(1, Math.round(rawDamage * 0.2));
      if (p && p.pos) {
        spawnRingWaveVFX(p.pos, 0x10b981, 3.5, 0.3);
        spawnFloatingCombatText(p.pos, `🛡️ AEGIS (-80% → ${reducedDmg})`, 'heal');
      }
      return {
        blocked: true,
        parried: false,
        aegisReduced: true,
        postureName: state.activePosture.name,
        damage: reducedDmg,
        damageMult: 0.2,
        mangeMultiplier: 0.2,
        mangeMult: 0.2,
        ignoreKnockback: true,
        knockbackMult: 0.0
      };
    }

    return { blocked: false, damageMult: 1.0, mangeMult: 1.0, knockbackMult: 1.0 };
  }

  // --------------------------------------------------------------------------
  // HUD & SPELLBOOK UI RENDERING
  // --------------------------------------------------------------------------
  function updateTargetHUD() {
    const frameEl = document.getElementById('mmo-target-frame');
    const t = state.selectedTarget;

    // Highlight targeted 3D floating nameplate & Co-op party frame
    document.querySelectorAll('.world-label.targeted-nameplate').forEach((el) => {
      if (!t || el.dataset.targetId !== t.id) {
        el.classList.remove('targeted-nameplate');
      }
    });
    if (t && t.id) {
      const activeLabel = document.querySelector(`.world-label[data-target-id="${t.id}"]`);
      if (activeLabel) activeLabel.classList.add('targeted-nameplate');
    }
    const partyFrame = document.getElementById('coop-party-frame');
    if (partyFrame) {
      partyFrame.classList.toggle('targeted-party-frame', !!(t && t.id === 'coop_partner'));
    }

    if (!frameEl) return;
    if (!t || !t.getPos) {
      frameEl.classList.add('hidden');
      return;
    }

    const p = window.player;
    const tPos = t.getPos();
    const dist = (p && p.pos && tPos) ? Math.round(Math.hypot(tPos.x - p.pos.x, tPos.z - p.pos.z)) : 0;
    const hpPct = t.getHpPct ? t.getHpPct() : 100;

    frameEl.classList.remove('hidden');
    frameEl.setAttribute('data-cat', t.category || 'hostile');

    const iconEl = document.getElementById('mmo-target-icon');
    const nameEl = document.getElementById('mmo-target-name');
    const subEl = document.getElementById('mmo-target-sub');
    const distEl = document.getElementById('mmo-target-dist');
    const fillEl = document.getElementById('mmo-target-hp-fill');
    const statusEl = document.getElementById('mmo-target-hp-label');

    if (iconEl) iconEl.textContent = t.icon || '🎯';
    if (nameEl) nameEl.textContent = t.name;
    if (subEl) subEl.textContent = t.subtitle || '';
    if (distEl) distEl.textContent = `${dist}m`;
    if (fillEl) fillEl.style.width = `${hpPct}%`;
    if (statusEl) statusEl.textContent = t.getStatusLabel ? t.getStatusLabel() : `${hpPct}%`;
  }

  function updatePostureBannerUI() {
    const bannerEl = document.getElementById('mmo-posture-banner');
    if (!bannerEl) return;

    if (!state.activePosture || state.activePosture.remaining <= 0) {
      bannerEl.classList.add('hidden');
      return;
    }

    bannerEl.classList.remove('hidden');
    const iconEl = document.getElementById('mmo-posture-icon');
    const titleEl = document.getElementById('mmo-posture-title');
    const timerEl = document.getElementById('mmo-posture-timer');
    const fillEl = document.getElementById('mmo-posture-fill');

    if (iconEl) iconEl.textContent = state.activePosture.icon;
    if (titleEl) titleEl.textContent = state.activePosture.name;
    if (timerEl) timerEl.textContent = `${state.activePosture.remaining.toFixed(1)}s`;
    if (fillEl) {
      const pct = Math.max(0, Math.min(100, (state.activePosture.remaining / state.activePosture.duration) * 100));
      fillEl.style.width = `${pct}%`;
    }
  }

  function syncAutorunUI(isAutoRunning) {
    const pill = document.getElementById('mmo-fin-mod-pill');
    if (pill) {
      pill.classList.toggle('autorun-active', !!isAutoRunning);
    }
    renderActionBarUI();
  }

  function renderActionBarUI() {
    const sId = getActiveSharkId();
    const bar = state.barsByShark[sId] || CHARACTER_BASE_MIXES[sId]?.defaultBar || CHARACTER_BASE_MIXES.custom.defaultBar;
    const finMod = getActiveFinModifier();
    const p = window.player;
    const isAutoRunning = !!(window.camState && window.camState.isAutoRunning);

    // Update Fin Modifier & Autorun Status Pill above Action Bar
    const finPill = document.getElementById('mmo-fin-mod-pill');
    if (finPill) {
      const autoBadge = isAutoRunning ? `<span class="mmo-autorun-chip">🏃💨 AUTORUN [NumLock/~]</span>` : '';
      if (finMod) {
        finPill.classList.remove('hidden');
        finPill.innerHTML = `${autoBadge}${finMod.icon} <strong>Fin Stance: ${finMod.stanceName || finMod.tag}</strong> · <span>${finMod.strikeName}</span>`;
      } else if (isAutoRunning) {
        finPill.classList.remove('hidden');
        finPill.innerHTML = `${autoBadge}<span>Steer with Right-Click or press W/S to stop</span>`;
      } else {
        finPill.classList.add('hidden');
      }
    }

    // Distance to current target for Live Range Indicators
    let targetDist = null;
    if (state.selectedTarget && state.selectedTarget.getPos && p && p.pos) {
      const tPos = state.selectedTarget.getPos();
      if (tPos) {
        targetDist = Math.hypot(tPos.x - p.pos.x, tPos.z - p.pos.z);
      }
    }

    SLOT_KEYS.forEach((slotKey) => {
      const btn = document.querySelector(`.mmo-ability-slot[data-mmo-slot="${slotKey}"]`);
      if (!btn) return;
      const abId = bar[slotKey];
      const ab = ABILITIES[abId];
      if (!ab) return;

      const iconEl = btn.querySelector('.slot-emoji');
      const nameEl = btn.querySelector('.slot-name');
      const powerEl = btn.querySelector('.slot-power');
      const cdEl = btn.querySelector('.slot-cd-badge');

      let displayIcon = ab.icon;
      let displayName = ab.name;
      let displaySub = ab.shortSub;

      if (ab.usesFinMod && finMod) {
        displayIcon = `${finMod.icon}⚡`;
        if (ab.id === 'poky_fin_strike') displayName = finMod.strikeName;
        else if (ab.id === 'single_fin_lunge') displayName = finMod.lungeName;
        else if (ab.id === 'fin_deflection') displayName = finMod.parryName;
        displaySub = finMod.tag;
        btn.classList.add('fin-empowered');
      } else {
        btn.classList.remove('fin-empowered');
      }

      if (ab.id === 'founder_signature' && window.LORE && window.LORE.sharks && window.LORE.sharks[sId]) {
        const sCfg = window.LORE.sharks[sId];
        displayIcon = sCfg.abilityIcon || ab.icon;
        displayName = sCfg.abilityName || ab.name;
      }

      // Pass 82 Combo Proc overrides
      const procRem = state.comboProcs[abId] || 0;
      if (procRem > 0.05) {
        btn.classList.add('proc-ready');
        if (abId === 'poky_fin_strike') {
          displayIcon = '⚔️⚡';
          displayName = 'Twin-Fin Cross-Slash';
          displaySub = `PROC! (${procRem.toFixed(0)}s)`;
        } else if (abId === 'tail_swipe') {
          displayName = 'Riposte Tail Swipe';
          displaySub = `+40% PROC!`;
        } else if (abId === 'tail_spin') {
          displayName = 'Riposte Cyclone';
          displaySub = `+40% PROC!`;
        }
      } else {
        btn.classList.remove('proc-ready');
      }

      btn.classList.toggle('queued-ability', state.queuedAbilityId === abId);

      // Pass 82 Live Range Indicator on Action Bar Slots
      if (targetDist !== null && ab.isOffensive) {
        const effRange = (ab.id === 'single_fin_lunge' && finMod && finMod.isGrapnel)
          ? 18.5
          : (ab.range + (ab.usesFinMod && finMod ? finMod.rangeBonus : 0));
        const outOfRange = targetDist > effRange + 1.2;
        btn.classList.toggle('out-of-range', outOfRange);
        btn.classList.toggle('in-range', !outOfRange);
      } else {
        btn.classList.remove('out-of-range', 'in-range');
      }

      if (iconEl) iconEl.textContent = displayIcon;
      if (nameEl) nameEl.textContent = displayName;
      if (powerEl) powerEl.textContent = displaySub;
      btn.title = `[${slotKey.toUpperCase()}] ${displayName} (${ab.category}) — ${ab.desc}`;

      const rem = state.cooldowns[abId] || 0;
      const maxCd = state.maxCooldowns[abId] || ab.cooldown || 1.0;
      const onCd = rem > 0.05;
      btn.classList.toggle('on-cooldown', onCd);
      if (cdEl) {
        if (onCd) {
          const pct = Math.max(0, Math.min(100, (rem / maxCd) * 100));
          cdEl.style.setProperty('--cd-pct', `${pct.toFixed(1)}%`);
          cdEl.textContent = `${rem.toFixed(1)}s`;
        } else {
          cdEl.style.removeProperty('--cd-pct');
          cdEl.textContent = '';
        }
      }
    });

    // Sync F1-F5 Shark Switcher Portraits
    document.querySelectorAll('.shark-switcher-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.shark === sId);
    });
  }

  function renderSpellbookModal() {
    const modal = document.getElementById('spellbook-modal');
    if (!modal || modal.classList.contains('hidden')) return;

    const sId = getActiveSharkId();
    const sCfg = (window.LORE && window.LORE.sharks && window.LORE.sharks[sId]) || { name: 'Blåhaj' };
    const mix = CHARACTER_BASE_MIXES[sId] || CHARACTER_BASE_MIXES.custom;
    const finMod = getActiveFinModifier();

    const headerTitle = document.getElementById('sb-shark-header');
    if (headerTitle) {
      headerTitle.textContent = `${sCfg.name} · ${mix.archetype}`;
    }

    const finBanner = document.getElementById('sb-fin-mod-banner');
    if (finBanner) {
      if (finMod) {
        finBanner.innerHTML = `${finMod.icon} <strong>Active Fin-Slot Stance: ${finMod.stanceName || finMod.tag}</strong> — ${finMod.desc}`;
      } else {
        finBanner.innerHTML = `🐾 <strong>Active Fin-Slot Item: Empty Fin</strong> — Equip any tool, snack, or relic in your Fin <strong>[H]</strong> (e.g. Sacred Allen Key, Scissors, Measuring Tape, Warm Breb, Sacred Tea) to dynamically transform your Fin Strikes, Passive Stance &amp; Deflections!`;
      }
    }

    const grid = document.getElementById('spellbook-abilities-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const bar = state.barsByShark[sId] || mix.defaultBar;

    Object.values(ABILITIES).forEach((ab) => {
      const learned = isAbilityLearned(sId, ab.id);
      const assignedSlot = Object.keys(bar).find((k) => bar[k] === ab.id);
      const card = document.createElement('div');
      card.className = `sb-ability-card ${learned ? 'learned' : 'unlearned'} ${state.assigningAbilityId === ab.id ? 'assigning' : ''}`;

      let displayName = ab.name;
      if (ab.usesFinMod && finMod) {
        if (ab.id === 'poky_fin_strike') displayName = `${ab.name} → ${finMod.strikeName}`;
        else if (ab.id === 'single_fin_lunge') displayName = `${ab.name} → ${finMod.lungeName}`;
        else if (ab.id === 'fin_deflection') displayName = `${ab.name} → ${finMod.parryName}`;
      }

      card.innerHTML = `
        <div class="sb-card-top">
          <span class="sb-card-icon">${ab.icon}</span>
          <div class="sb-card-titles">
            <h4>${displayName}</h4>
            <span class="sb-card-cat">${ab.category} · Range: ${ab.range}m · CD: ${ab.cooldown}s</span>
          </div>
          <span class="sb-slot-pill">${assignedSlot ? `Key [${assignedSlot.toUpperCase()}]` : (learned ? 'Learned' : 'Learnable')}</span>
        </div>
        <p class="sb-card-desc">${ab.desc}</p>
        <div class="sb-card-actions">
          ${learned
            ? `<button type="button" class="btn-primary sb-btn-cast" data-ab="${ab.id}">⚡ Cast Now</button>
               <button type="button" class="btn-secondary sb-btn-bind" data-ab="${ab.id}">⌨️ Bind to Slot (1–6 / Q / E / R / F)</button>`
            : `<button type="button" class="btn-accent sb-btn-learn" data-ab="${ab.id}">📖 Learn Martial Art</button>`
          }
        </div>
        ${state.assigningAbilityId === ab.id ? `
          <div class="sb-slot-picker-row">
            <span>Choose Key:</span>
            ${['1', '2', '3', '4', '5', '6', 'q', 'e', 'r', 'f'].map((k) =>
              `<button type="button" class="sb-pick-key-btn" data-slot="${k}" data-ab="${ab.id}">${k.toUpperCase()}</button>`
            ).join('')}
          </div>
        ` : ''}
      `;

      grid.appendChild(card);
    });

    grid.querySelectorAll('.sb-btn-learn').forEach((btn) => {
      btn.addEventListener('click', () => {
        learnAbility(sId, btn.dataset.ab, false);
      });
    });

    grid.querySelectorAll('.sb-btn-cast').forEach((btn) => {
      btn.addEventListener('click', () => {
        closeSpellbookModal();
        executeAbility(btn.dataset.ab);
      });
    });

    grid.querySelectorAll('.sb-btn-bind').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.assigningAbilityId = state.assigningAbilityId === btn.dataset.ab ? null : btn.dataset.ab;
        renderSpellbookModal();
      });
    });

    grid.querySelectorAll('.sb-pick-key-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        assignSlot(sId, btn.dataset.slot, btn.dataset.ab);
        state.assigningAbilityId = null;
        renderSpellbookModal();
      });
    });
  }

  function openSpellbookModal() {
    const modal = document.getElementById('spellbook-modal');
    if (!modal) return;
    if (document.exitPointerLock) document.exitPointerLock();
    modal.classList.remove('hidden');
    renderSpellbookModal();
    if (window.CozyAudio) window.CozyAudio.shonk();
  }

  function closeSpellbookModal() {
    const modal = document.getElementById('spellbook-modal');
    if (modal) modal.classList.add('hidden');
    state.assigningAbilityId = null;
  }

  function toggleSpellbookModal() {
    const modal = document.getElementById('spellbook-modal');
    if (!modal) return;
    if (modal.classList.contains('hidden')) openSpellbookModal();
    else closeSpellbookModal();
  }

  // --------------------------------------------------------------------------
  // PER-FRAME UPDATE (COOLDOWNS, COMBO PROCS, SPELL QUEUE, BREB PROJECTILES & FCT)
  // --------------------------------------------------------------------------
  let uiCooldownTick = 0;

  function update(dt, elapsed) {
    // 1. Update ability cooldowns & radial sweep
    let anyCdChanged = false;
    Object.keys(state.cooldowns).forEach((abId) => {
      if (state.cooldowns[abId] > 0) {
        state.cooldowns[abId] = Math.max(0, state.cooldowns[abId] - dt);
        anyCdChanged = true;
      }
    });

    // 1B. Update Combo Proc windows
    Object.keys(state.comboProcs).forEach((abId) => {
      if (state.comboProcs[abId] > 0) {
        state.comboProcs[abId] = Math.max(0, state.comboProcs[abId] - dt);
        anyCdChanged = true;
      }
    });

    // 1C. Execute 0.38s Queued Ability on the exact frame its cooldown hits 0!
    if (state.queuedAbilityId) {
      state.queuedExpire -= dt;
      const qId = state.queuedAbilityId;
      if (state.queuedExpire <= 0) {
        state.queuedAbilityId = null;
        anyCdChanged = true;
      } else if ((state.cooldowns[qId] || 0) <= 0.02) {
        state.queuedAbilityId = null;
        executeAbility(qId);
      }
    }

    // 2. Update active defensive posture
    if (state.activePosture && state.activePosture.remaining > 0) {
      state.activePosture.remaining = Math.max(0, state.activePosture.remaining - dt);
      if (state.activePosture.id === 'double_fin_defense' && window.player) {
        window.player.warmth = Math.min(100, (window.player.warmth || 80) + dt * 6.0);
        window.player.stuffing = Math.min(100, (window.player.stuffing || 80) + dt * 6.0);
      }
      updatePostureBannerUI();
      if (state.activePosture.remaining <= 0) {
        state.activePosture = null;
        updatePostureBannerUI();
      }
    }
    updatePostureAura3D(dt, elapsed);

    // 3. Update flying Ranged Breb Volley projectiles
    const g = window.BlahajGame;
    const worldApi = g && typeof g.getWorldApi === 'function' ? g.getWorldApi() : null;
    for (let i = state.projectiles.length - 1; i >= 0; i--) {
      const pr = state.projectiles[i];
      pr.life -= dt;
      pr.vel.y -= 14.0 * dt; // Gravity arc
      pr.mesh.position.addScaledVector(pr.vel, dt);
      pr.mesh.rotation.z += dt * 9.0;

      let hitSomething = false;
      // Check enemy hit
      if (window.BlahajEnemies && typeof window.BlahajEnemies.getEnemies === 'function') {
        const enemies = window.BlahajEnemies.getEnemies();
        for (const e of enemies) {
          if (!e || e.state === 'banished' || e.state === 'respawning' || e.hp <= 0) continue;
          const d = Math.hypot(e.pos.x - pr.mesh.position.x, e.pos.z - pr.mesh.position.z);
          if (d < 2.2) {
            const knockDir = new THREE.Vector3(pr.vel.x, 0, pr.vel.z).normalize();
            e.takeBoop(35, knockDir);
            spawnFloatingCombatText(e.pos, '🥖 35', 'normal');
            hitSomething = true;
            break;
          }
        }
      }

      // Check Ranged Seam Stitch if projectile was fired with Aetheric Diviner
      if (!hitSomething && pr.canStitchSeam && window.BlahajSeam && g) {
        const nearRift = window.BlahajSeam.getNearestRift(pr.mesh.position, g.getZone());
        if (nearRift && nearRift.nearest && nearRift.nearest.dist < 3.5) {
          window.BlahajSeam.mendRift(nearRift.nearest.id);
          spawnFloatingCombatText(nearRift.nearest.pos || pr.mesh.position, '🪡 SEAM MENDED!', 'proc');
          hitSomething = true;
        }
      }

      // Check ground contact
      const groundY = (worldApi && typeof worldApi.getGroundAndStructureHeight === 'function')
        ? worldApi.getGroundAndStructureHeight(pr.mesh.position.x, pr.mesh.position.z, pr.mesh.position.y)
        : 0.0;

      if (hitSomething || pr.life <= 0 || pr.mesh.position.y <= groundY + 0.15) {
        if (!hitSomething && worldApi && typeof worldApi.spawnBrebLoaf === 'function' && i === 1) {
          worldApi.spawnBrebLoaf(new THREE.Vector3(pr.mesh.position.x, Math.max(0.1, groundY), pr.mesh.position.z));
        }
        if (window.BlahajEffects && window.BlahajEffects.spawnBreadCrumbs) {
          window.BlahajEffects.spawnBreadCrumbs(pr.mesh.position);
        }
        if (pr.mesh.parent) pr.mesh.parent.remove(pr.mesh);
        state.projectiles.splice(i, 1);
      }
    }

    // 4. Update 3D ring shockwave, slash arc & grapnel tether VFX
    for (let i = state.vfxMeshes.length - 1; i >= 0; i--) {
      const v = state.vfxMeshes[i];
      v.life -= dt;
      const t = 1.0 - Math.max(0, v.life / v.maxLife);
      if (v.isLine) {
        v.mesh.material.opacity = Math.max(0, (1.0 - t) * 0.95);
      } else {
        const s = 1.0 + t * (v.maxScale - 1.0);
        v.mesh.scale.set(s, 1, s);
        if (v.spinY) v.mesh.rotation.y += v.spinY * dt;
        v.mesh.material.opacity = Math.max(0, (1.0 - t) * 0.9);
      }
      if (v.life <= 0) {
        if (v.mesh.parent) v.mesh.parent.remove(v.mesh);
        state.vfxMeshes.splice(i, 1);
      }
    }

    // 5. Update 3D Floating Combat Text
    updateFloatingCombatText(dt);

    // 6. Update 3D Target Ring & HUD Target Frame
    updateTargetRing3D(elapsed);
    uiCooldownTick += dt;
    if (uiCooldownTick >= 0.06) {
      uiCooldownTick = 0;
      if (state.selectedTarget) updateTargetHUD();
      if (anyCdChanged || state.selectedTarget) renderActionBarUI();
    }
  }

  function initDOMListeners() {
    loadPersistedState();
    ensureFCTContainer();

    document.querySelectorAll('.mmo-ability-slot').forEach((btn) => {
      btn.addEventListener('click', () => {
        const slot = btn.getAttribute('data-mmo-slot');
        if (slot) triggerSlot(slot);
      });
    });

    document.querySelectorAll('.shark-switcher-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const sId = btn.dataset.shark;
        if (sId && window.BlahajGame && typeof window.BlahajGame.spawnPlayerShark === 'function') {
          window.BlahajGame.spawnPlayerShark(sId);
          renderActionBarUI();
        }
      });
    });

    // Pass 82: Clickable Floating 3D Nameplates (#world-labels .world-label[data-target-id])
    const worldLabelsRoot = document.getElementById('world-labels');
    if (worldLabelsRoot) {
      worldLabelsRoot.addEventListener('click', (e) => {
        const label = e.target.closest('.world-label[data-target-id]');
        if (!label) return;
        e.stopPropagation();
        selectTargetById(label.dataset.targetId, true);
      });
      worldLabelsRoot.addEventListener('contextmenu', (e) => {
        const label = e.target.closest('.world-label[data-target-id]');
        if (!label) return;
        e.preventDefault();
        e.stopPropagation();
        const chosen = selectTargetById(label.dataset.targetId, true);
        if (chosen && window.player && window.BlahajGame && typeof window.BlahajGame.triggerInteract === 'function') {
          const d = Math.hypot(chosen.getPos().x - window.player.pos.x, chosen.getPos().z - window.player.pos.z);
          if (d <= 6.5) window.BlahajGame.triggerInteract();
        }
      });
    }

    // Pass 82: Clickable Co-op Party Unit Frame (#coop-party-frame)
    const partyFrame = document.getElementById('coop-party-frame');
    if (partyFrame) {
      partyFrame.addEventListener('click', (e) => {
        if (e.target.closest('button')) return;
        selectTargetById('coop_partner', true);
      });
    }

    document.getElementById('mmo-target-clear-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      clearTarget();
    });

    document.getElementById('slot-spellbook')?.addEventListener('click', toggleSpellbookModal);
    document.getElementById('close-spellbook-modal')?.addEventListener('click', closeSpellbookModal);
    document.getElementById('btn-sb-done')?.addEventListener('click', closeSpellbookModal);
    document.getElementById('btn-sb-learn-all')?.addEventListener('click', learnAllAbilitiesForActiveShark);
    document.getElementById('btn-sb-open-portal')?.addEventListener('click', () => {
      closeSpellbookModal();
      const portalModal = document.getElementById('portal-modal');
      if (portalModal) portalModal.classList.remove('hidden');
    });

    renderActionBarUI();
  }

  window.BlahajMMO = {
    ABILITIES,
    FIN_ITEM_MODIFIERS,
    CHARACTER_BASE_MIXES,
    initDOMListeners,
    update,
    cycleTarget,
    setTarget,
    selectTargetById,
    ensureSmartOffensiveTarget,
    clearTarget,
    hasTarget,
    getSelectedTarget: () => state.selectedTarget,
    getCurrentTarget: () => state.selectedTarget,
    getTargetables,
    handleCanvasClick,
    faceWorldPoint,
    executeAbility,
    triggerSlot,
    learnAbility,
    learnAllAbilitiesForActiveShark,
    isAbilityLearned,
    assignSlot,
    getActiveFinModifier,
    getPassiveDamageMultiplier,
    getComboProcs: () => state.comboProcs,
    getQueuedAbilityId: () => state.queuedAbilityId,
    getActivePosture: () => state.activePosture,
    getPostureState: () => ({ active: state.activePosture, timer: state.postureTimer }),
    mitigateIncomingHit,
    spawnFloatingCombatText,
    syncAutorunUI,
    renderActionBarUI,
    openSpellbookModal,
    closeSpellbookModal,
    toggleSpellbookModal
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDOMListeners);
  } else {
    setTimeout(initDOMListeners, 0);
  }
})();
