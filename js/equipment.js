// ============================================================================
// BLÅHAJ ISLAND — 10-SOCKET VITRUVIAN SHARK EQUIPMENT REGISTRY (v19.5)
// ============================================================================
// Declarative, mod-friendly registry for all equippable costumes, headgear,
// weapons, wands, fin-bands, tail wraps, and magical relics.
//
// Add new items anytime via BlahajEquipment.registerEquipment({ ... }).
// ============================================================================

window.BlahajEquipment = (function () {
  const SOCKET_ORDER = [
    'head',
    'face',
    'neck',
    'torso',
    'fin_right',
    'fin_left',
    'fin_bands',
    'tail',
    'relic',
    'trinket'
  ];

  // 10 Sockets mapped to the Vitruvian Shark Pentagram (percentage coords for UI overlay)
  const SOCKETS = {
    head:      { id: 'head',      label: 'CROWN',     emptyIcon: '👑', title: 'Head / Crown / Hoods',         x: 50, y: 10 },
    face:      { id: 'face',      label: 'FACE',      emptyIcon: '🥽', title: 'Face / Goggles / Masks',       x: 70, y: 20 },
    neck:      { id: 'neck',      label: 'NECK',      emptyIcon: '🧣', title: 'Neck / Scarves / Collars',     x: 30, y: 20 },
    fin_right: { id: 'fin_right', label: 'R. FIN',    emptyIcon: '⚔️', title: 'Right Fin (Main-Hand)',      x: 12, y: 39 },
    fin_left:  { id: 'fin_left',  label: 'L. FIN',    emptyIcon: '🏮', title: 'Left Fin (Off-Hand)',        x: 88, y: 39 },
    torso:     { id: 'torso',     label: 'TORSO',     emptyIcon: '👘', title: 'Upper Body / Robes / Costumes', x: 50, y: 45 },
    fin_bands: { id: 'fin_bands', label: 'BANDS',     emptyIcon: '🧿', title: 'Paired Shark-Fin Bands',       x: 16, y: 61 },
    relic:     { id: 'relic',     label: 'RELIC',     emptyIcon: '💎', title: 'Primary Magical Relic',        x: 84, y: 61 },
    tail:      { id: 'tail',      label: 'TAIL',      emptyIcon: '🎀', title: 'Tail / Lower Body Wraps',      x: 26, y: 84 },
    trinket:   { id: 'trinket',   label: 'CHARM',     emptyIcon: '🏷️', title: 'Secondary Trinket / Charm',    x: 74, y: 84 }
  };

  const RECALL_COOLDOWN_MS = 60 * 1000;

  // Declarative Equippable Items Registry
  const EQUIPMENT = {
    // --- FOUNDER SOULBOUND SIGNATURE GEAR (Swappable + Recallable on 60s CD) ---
    hermes_hood: {
      id: 'hermes_hood', name: 'Wayfarer’s Hood', icon: '🧢', socket: 'head',
      soulboundFounder: 'hermes', hidesDefault: 'head',
      stats: { speedPct: 6, stuffing: 6 },
      visual: { kind: 'cap', color: 0x334155, trim: 0xd97706 }
    },
    hermes_scarf: {
      id: 'hermes_scarf', name: 'Rust Wool Scarf', icon: '🧣', socket: 'neck',
      soulboundFounder: 'hermes', hidesDefault: 'neck',
      stats: { stuffing: 8, mangeResistPct: 5 },
      visual: { kind: 'scarf', color: 0x7c4d32 }
    },
    star_lantern: {
      id: 'star_lantern', name: 'Between Star Lantern', icon: '🏮', socket: 'fin_left',
      soulboundFounder: 'hermes', hidesDefault: 'fin_left',
      stats: { finPowerPct: 8, speedPct: 4 },
      visual: { kind: 'lantern', color: 0xffd885 }
    },

    solomon_toque: {
      id: 'solomon_toque', name: 'Star-Chef Toque', icon: '👨‍🍳', socket: 'head',
      soulboundFounder: 'solomon', hidesDefault: 'head',
      stats: { stuffing: 10 },
      visual: { kind: 'toque', color: 0xf7f1e3, band: 0x1e3a8a }
    },
    solomon_ribbon: {
      id: 'solomon_ribbon', name: 'Navy Silk Ribbon', icon: '🧣', socket: 'neck',
      soulboundFounder: 'solomon', hidesDefault: 'neck',
      stats: { stuffing: 6, finPowerPct: 4 },
      visual: { kind: 'scarf', color: 0x1e3a8a }
    },
    solomon_teapot: {
      id: 'solomon_teapot', name: 'Porcelain Star-Teapot', icon: '🫖', socket: 'fin_left',
      soulboundFounder: 'solomon', hidesDefault: 'fin_left',
      stats: { stuffing: 12, finPowerPct: 6 },
      visual: { kind: 'teapot' }
    },

    hiram_goggles: {
      id: 'hiram_goggles', name: 'Builder Brass Goggles', icon: '🥽', socket: 'face',
      soulboundFounder: 'hiram', hidesDefault: 'face',
      stats: { finPowerPct: 8, stuffing: 6 },
      visual: { kind: 'goggles', lensColor: 0x7dd3fc }
    },
    hiram_scarf: {
      id: 'hiram_scarf', name: 'Ochre Work Scarf', icon: '🧣', socket: 'neck',
      soulboundFounder: 'hiram', hidesDefault: 'neck',
      stats: { stuffing: 10 },
      visual: { kind: 'scarf', color: 0xb45309 }
    },
    hex_key: {
      id: 'hex_key', name: 'Sacred Hex Key M10', icon: '🔧', socket: 'fin_left',
      soulboundFounder: 'hiram', hidesDefault: 'fin_left',
      stats: { finPowerPct: 12 },
      visual: { kind: 'hex_key' }
    },

    nimue_coronet: {
      id: 'nimue_coronet', name: 'Starlit Coronet', icon: '👑', socket: 'head',
      soulboundFounder: 'nimue', hidesDefault: 'head',
      stats: { finPowerPct: 8, stuffing: 8 },
      visual: { kind: 'coronet', bandColor: 0x581c87, gemColor: 0xd8b4fe }
    },
    nimue_band: {
      id: 'nimue_band', name: 'Violet Silk Band', icon: '🪡', socket: 'neck',
      soulboundFounder: 'nimue', hidesDefault: 'neck',
      stats: { stuffing: 8, speedPct: 4 },
      visual: { kind: 'scarf', color: 0x6d28d9 }
    },
    nimue_crystal: {
      id: 'nimue_crystal', name: 'Star-Crystal Pendant', icon: '💎', socket: 'relic',
      soulboundFounder: 'nimue', hidesDefault: 'relic',
      stats: { finPowerPct: 10, mangeResistPct: 8 },
      visual: { kind: 'crystal', color: 0xd8b4fe }
    },

    // --- TRIAL KEEPSAKES & RELICS ---
    retired_tag: {
      id: 'retired_tag', name: 'Retired Spawning-Pit Tag', icon: '🏷️', socket: 'trinket',
      stats: { stuffing: 8, speedPct: 4 },
      visual: { kind: 'tag_charm' }
    },
    sacred_scissors: {
      id: 'sacred_scissors', name: 'Golden Scissors of the Order', icon: '✂️', socket: 'fin_right',
      stats: { finPowerPct: 12 },
      visual: { kind: 'scissors' }
    },
    ingvar_tape: {
      id: 'ingvar_tape', name: 'Ingvar’s Brass Measuring Tape', icon: '📏', socket: 'fin_left',
      stats: { finPowerPct: 8, speedPct: 5 },
      visual: { kind: 'tape_coil' }
    },
    seam_needle: {
      id: 'seam_needle', name: 'Golden Seam Needle', icon: '🪡', socket: 'relic',
      stats: { finPowerPct: 10, stuffing: 10 },
      visual: { kind: 'crystal', color: 0xfde047 }
    },
    lavender_dryer_sheet: {
      id: 'lavender_dryer_sheet', name: 'Astral Lavender Dryer Sheet', icon: '🫧', socket: 'trinket',
      stats: { mangeResistPct: 15, speedPct: 5 },
      visual: { kind: 'lavender_charm' }
    },
    star_saucer_compass: {
      id: 'star_saucer_compass', name: 'Karman Aetheric Compass', icon: '🧭', socket: 'relic',
      stats: { speedPct: 10, finPowerPct: 8 },
      visual: { kind: 'compass' }
    },
    carrot_toy: {
      id: 'carrot_toy', name: 'Beach-Shorts Carrot Figurine', icon: '🥕', socket: 'trinket',
      stats: { speedPct: 6, stuffing: 6 },
      visual: { kind: 'carrot_charm' }
    },
    breb_of_shame: {
      id: 'breb_of_shame', name: 'The Breb of Shame', icon: '🥖✨', socket: 'relic',
      stats: { finPowerPct: 20, stuffing: 20, speedPct: 8 },
      visual: { kind: 'glowing_breb' }
    },

    // --- PROTOTYPE COSTUMES, ROBES, NINJA GEAR & WEAPONS ---
    wizard_robe: {
      id: 'wizard_robe', name: 'Archipelago Star-Robe', icon: '👘', socket: 'torso',
      stats: { stuffing: 14, finPowerPct: 10 },
      visual: { kind: 'robe', color: 0x1e1b4b, trim: 0xfbbf24 }
    },
    probationer_robe: {
      id: 'probationer_robe', name: 'White & Gold Probationer Robe', icon: '🥋', socket: 'torso',
      stats: { stuffing: 12, mangeResistPct: 10 },
      visual: { kind: 'robe', color: 0xf8fafc, trim: 0xf59e0b }
    },
    wizard_hood: {
      id: 'wizard_hood', name: 'Pointed Star-Mage Hat', icon: '🧙', socket: 'head',
      hidesDefault: 'head',
      stats: { finPowerPct: 10, stuffing: 6 },
      visual: { kind: 'wizard_hat', color: 0x312e81, trim: 0xfbbf24 }
    },
    ninja_mask: {
      id: 'ninja_mask', name: 'Shadow-Fin Ninja Cowl', icon: '🥷', socket: 'face',
      hidesDefault: 'face',
      stats: { speedPct: 12, finPowerPct: 8 },
      visual: { kind: 'ninja_mask', color: 0x0f172a, band: 0xdc2626 }
    },
    ninja_fin_bands: {
      id: 'ninja_fin_bands', name: 'Crimson Shinobi Fin-Bands', icon: '🧿', socket: 'fin_bands',
      stats: { speedPct: 8, finPowerPct: 8 },
      visual: { kind: 'fin_bands', color: 0xdc2626, trim: 0xfbbf24 }
    },
    starlight_wand: {
      id: 'starlight_wand', name: 'Wand of the Silver Star', icon: '🪄', socket: 'fin_right',
      stats: { finPowerPct: 16 },
      visual: { kind: 'wand', shaftColor: 0x4c1d95, starColor: 0x7dd3fc }
    },
    plush_cutlass: {
      id: 'plush_cutlass', name: 'Felt-Steel Corsair Cutlass', icon: '🗡️', socket: 'fin_right',
      stats: { finPowerPct: 18 },
      visual: { kind: 'sword', bladeColor: 0xe2e8f0, guardColor: 0xd8aa5b }
    },
    caudal_ribbon: {
      id: 'caudal_ribbon', name: 'Twin-Fluke Crimson Tail Ribbon', icon: '🎀', socket: 'tail',
      stats: { speedPct: 8, mangeResistPct: 6 },
      visual: { kind: 'tail_ribbon', color: 0xe11d48 }
    }
  };

  // Default Soulbound Equipped Loadouts for the 4 Founders
  const FOUNDER_SOULBOUND_DEFAULTS = {
    hermes:  { head: 'hermes_hood',   neck: 'hermes_scarf',   fin_left: 'star_lantern' },
    solomon: { head: 'solomon_toque', neck: 'solomon_ribbon', fin_left: 'solomon_teapot' },
    hiram:   { face: 'hiram_goggles', neck: 'hiram_scarf',    fin_left: 'hex_key' },
    nimue:   { head: 'nimue_coronet', neck: 'nimue_band',     relic: 'nimue_crystal' }
  };

  function buildEmptySockets() {
    const out = {};
    SOCKET_ORDER.forEach((s) => { out[s] = null; });
    return out;
  }

  function buildDefaultSocketsForShark(sharkId) {
    const base = buildEmptySockets();
    const def = FOUNDER_SOULBOUND_DEFAULTS[sharkId];
    if (def) Object.assign(base, def);
    return base;
  }

  function getEquipmentDef(itemId) {
    return EQUIPMENT[itemId] || null;
  }

  function getSocketDef(socketId) {
    return SOCKETS[socketId] || null;
  }

  function getEquippableForSocket(socketId) {
    return Object.values(EQUIPMENT).filter((eq) => eq.socket === socketId);
  }

  function getTotalSocketBonuses(equippedSockets) {
    const totals = { stuffing: 0, finPowerPct: 0, speedPct: 0, mangeResistPct: 0 };
    if (!equippedSockets || typeof equippedSockets !== 'object') return totals;
    SOCKET_ORDER.forEach((sock) => {
      const itemId = equippedSockets[sock];
      const def = itemId ? EQUIPMENT[itemId] : null;
      if (!def || !def.stats) return;
      totals.stuffing += def.stats.stuffing || 0;
      totals.finPowerPct += def.stats.finPowerPct || 0;
      totals.speedPct += def.stats.speedPct || 0;
      totals.mangeResistPct += def.stats.mangeResistPct || 0;
    });
    return totals;
  }

  function getMissingSoulboundItems(sharkId, equippedSockets, inventory) {
    const def = FOUNDER_SOULBOUND_DEFAULTS[sharkId];
    if (!def) return [];
    const missing = [];
    Object.values(def).forEach((itemId) => {
      const isEquipped = equippedSockets && Object.values(equippedSockets).includes(itemId);
      const inBag = inventory && typeof inventory.hasItem === 'function' && inventory.hasItem(itemId);
      if (!isEquipped && !inBag) missing.push(itemId);
    });
    return missing;
  }

  function registerEquipment(eqDef) {
    if (!eqDef || !eqDef.id || !SOCKETS[eqDef.socket]) return;
    EQUIPMENT[eqDef.id] = Object.assign({}, EQUIPMENT[eqDef.id] || {}, eqDef);
  }

  return {
    SOCKET_ORDER,
    SOCKETS,
    EQUIPMENT,
    FOUNDER_SOULBOUND_DEFAULTS,
    RECALL_COOLDOWN_MS,
    buildEmptySockets,
    buildDefaultSocketsForShark,
    getEquipmentDef,
    getSocketDef,
    getEquippableForSocket,
    getTotalSocketBonuses,
    getMissingSoulboundItems,
    registerEquipment
  };
})();
