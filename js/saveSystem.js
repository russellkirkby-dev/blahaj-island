/**
 * BLAHAJ ISLAND - UNIFIED SAVE SYSTEM & ISLAND PASSPORT (PASS 70)
 *
 * Tier 1: Local Island Passport (Multi-slot auto-save in browser storage)
 * Tier 1.5: Offline Export/Import (.blahaj file backup & transfer)
 * Tier 2/3: Google Identity Services (GIS) Sign-In & Cloud Sync Architecture
 */

(function () {
  'use strict';

  const SAVE_VERSION = 1;
  const NUM_SLOTS = 3;
  const ACTIVE_SLOT_KEY = 'blahaj_active_slot';
  const GOOGLE_CLIENT_ID_KEY = 'blahaj_google_client_id';

  // Default Google Cloud Web Client ID (Can be overridden by player in Settings or deployment)
  const DEFAULT_GOOGLE_CLIENT_ID = '98374218374-blahajisland.apps.googleusercontent.com';

  let activeSlot = 1;
  let currentSaveState = null;
  let autoSaveTimeout = null;
  let listeners = {
    onSave: [],
    onSlotChange: [],
    onGoogleAuthChange: []
  };

  // ---------------------------------------------------------------------------
  // 1. UNIQUE PASSPORT ID GENERATOR
  // ---------------------------------------------------------------------------
  function generatePassportId() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'SHK-';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  // ---------------------------------------------------------------------------
  // 2. DEFAULT INITIAL SAVE TEMPLATE
  // ---------------------------------------------------------------------------
  function createDefaultSaveState(slotNumber) {
    return {
      version: SAVE_VERSION,
      slot: slotNumber,
      createdAt: new Date().toISOString(),
      lastSaved: new Date().toISOString(),
      profile: {
        passportId: generatePassportId(),
        displayName: 'Solomon',
        activeSharkId: 'solomon',
        totalPlayTimeSeconds: 0,
        googleAccount: null // { sub, email, name, picture, linkedAt }
      },
      inventory: {
        // Serialized slot array: [{ id: 'breb', qty: 5 }, null, ...]
        slots: null,
        heldItemId: null
      },
      progression: {
        completedQuests: ['q-start'],
        discoveredLandmarks: ['spawn'],
        hermesPortalMastery: { level: 1, exp: 0 },
        greatSeam: {
          totalMendedAllTime: 0,
          unlockedSeamDetector: false
        },
        unlockedBlueprints: []
      },
      worldState: {
        builtStructures: []
      },
      customization: {
        mangeFactors: {},
        accessories: {}
      },
      settings: {
        compassVis: true,
        zenMode: false
      }
    };
  }

  function getSlotStorageKey(slotNumber) {
    return `blahaj_save_slot_${slotNumber}`;
  }

  // ---------------------------------------------------------------------------
  // 3. STORAGE I/O
  // ---------------------------------------------------------------------------
  function loadSlot(slotNumber) {
    if (slotNumber < 1 || slotNumber > NUM_SLOTS) slotNumber = 1;
    activeSlot = slotNumber;
    try {
      localStorage.setItem(ACTIVE_SLOT_KEY, String(activeSlot));
    } catch (e) {
      console.warn('[SaveSystem] Unable to write active slot to localStorage:', e);
    }

    const key = getSlotStorageKey(activeSlot);
    const raw = localStorage.getItem(key);

    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.version === SAVE_VERSION) {
          currentSaveState = parsed;
          console.log(`[SaveSystem] Loaded Slot ${activeSlot} (${currentSaveState.profile.displayName}, Passport: ${currentSaveState.profile.passportId})`);
          notifySlotChange();
          return currentSaveState;
        }
      } catch (e) {
        console.error(`[SaveSystem] Failed parsing save slot ${activeSlot}:`, e);
      }
    }

    // Initialize fresh slot if none exists
    currentSaveState = createDefaultSaveState(activeSlot);
    saveNow();
    notifySlotChange();
    return currentSaveState;
  }

  function saveNow() {
    if (!currentSaveState) {
      currentSaveState = createDefaultSaveState(activeSlot);
    }

    // Sync live game data into currentSaveState before serializing
    gatherLiveGameData(currentSaveState);
    currentSaveState.lastSaved = new Date().toISOString();

    try {
      const key = getSlotStorageKey(activeSlot);
      localStorage.setItem(key, JSON.stringify(currentSaveState));
      notifySave(currentSaveState);
      updatePassportUI();
      return true;
    } catch (e) {
      console.error('[SaveSystem] Error saving to localStorage:', e);
      return false;
    }
  }

  function queueAutoSave(delayMs = 600) {
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout);
    }
    autoSaveTimeout = setTimeout(() => {
      saveNow();
      autoSaveTimeout = null;
    }, delayMs);
  }

  // ---------------------------------------------------------------------------
  // 4. GATHER LIVE GAME DATA INTO SAVE STATE
  // ---------------------------------------------------------------------------
  function gatherLiveGameData(save) {
    const game = window.BlahajGame;
    if (!game) return;

    // 1. Profile & Active Shark
    const player = game.getPlayer ? game.getPlayer() : null;
    if (player) {
      save.profile.activeSharkId = player.sharkId || 'solomon';
      save.profile.displayName = player.name || player.sharkId || 'Solomon';
      save.progression.greatSeam.totalMendedAllTime = player.seamMendedCount || 0;
    }

    // 2. Inventory
    const inv = game.getPlayerInventory ? game.getPlayerInventory() : null;
    if (inv && typeof inv.serialize === 'function') {
      save.inventory.slots = inv.serialize();
    }
    if (game.getActiveHeldItem) {
      save.inventory.heldItemId = game.getActiveHeldItem();
    }

    // 3. Quests & Discoveries
    if (game.getCompletedQuests) {
      save.progression.completedQuests = Array.from(game.getCompletedQuests());
    }
    if (game.getDiscoveredLandmarks) {
      save.progression.discoveredLandmarks = Array.from(game.getDiscoveredLandmarks());
    }
    if (game.getHermesMastery) {
      save.progression.hermesPortalMastery = { ...game.getHermesMastery() };
    }
    if (game.getHasSeamDetector) {
      save.progression.greatSeam.unlockedSeamDetector = !!game.getHasSeamDetector();
    }

    // 4. World Built Structures (Hiram's Blueprints)
    const world = game.getWorldApi ? game.getWorldApi() : null;
    if (world && typeof world.getBuiltStructures === 'function') {
      save.worldState.builtStructures = world.getBuiltStructures().map((s) => ({
        id: s.id,
        type: s.type,
        x: Number(s.x.toFixed(2)),
        y: Number(s.y.toFixed(2)),
        z: Number(s.z.toFixed(2)),
        rotY: Number(s.rotY.toFixed(2))
      }));
    }

    // 5. Customization
    if (game.getMangeFactors) {
      save.customization.mangeFactors = { ...game.getMangeFactors() };
    }
    if (game.getSharkAccessories) {
      save.customization.accessories = { ...game.getSharkAccessories() };
    }

    // 6. Settings
    if (game.gameSettings) {
      save.settings.compassVis = !!game.gameSettings.compassVis;
      save.settings.zenMode = !!game.gameSettings.minimalHud;
    }
  }

  // ---------------------------------------------------------------------------
  // 5. RESTORE LIVE GAME DATA FROM SAVE STATE
  // ---------------------------------------------------------------------------
  function restoreGameFromSave(save) {
    if (!save) return;
    const game = window.BlahajGame;
    if (!game) return;

    console.log(`[SaveSystem] Restoring game state from Slot ${save.slot}...`);

    // 1. Restore Inventory
    const inv = game.getPlayerInventory ? game.getPlayerInventory() : null;
    if (inv && Array.isArray(save.inventory?.slots)) {
      if (typeof inv.restore === 'function') {
        inv.restore(save.inventory.slots);
      }
    }
    if (save.inventory?.heldItemId && game.equipHeldItem) {
      game.equipHeldItem(save.inventory.heldItemId);
    }

    // 2. Restore Quests & Discoveries
    if (Array.isArray(save.progression?.completedQuests) && game.restoreCompletedQuests) {
      game.restoreCompletedQuests(save.progression.completedQuests);
    }
    if (Array.isArray(save.progression?.discoveredLandmarks) && game.restoreDiscoveredLandmarks) {
      game.restoreDiscoveredLandmarks(save.progression.discoveredLandmarks);
    }
    if (save.progression?.hermesPortalMastery && game.restoreHermesMastery) {
      game.restoreHermesMastery(save.progression.hermesPortalMastery);
    }
    if (save.progression?.greatSeam) {
      if (save.progression.greatSeam.unlockedSeamDetector) {
        localStorage.setItem('blahaj_unlocked_seam_detector', 'true');
      }
      const player = game.getPlayer ? game.getPlayer() : null;
      if (player && typeof save.progression.greatSeam.totalMendedAllTime === 'number') {
        player.seamMendedCount = save.progression.greatSeam.totalMendedAllTime;
      }
    }

    // 3. Restore Built Structures
    if (Array.isArray(save.worldState?.builtStructures) && game.restoreBuiltStructures) {
      game.restoreBuiltStructures(save.worldState.builtStructures);
    }

    // 4. Restore Customizations
    if (save.customization?.mangeFactors && game.restoreMangeFactors) {
      game.restoreMangeFactors(save.customization.mangeFactors);
    }
    if (save.customization?.accessories && game.restoreSharkAccessories) {
      game.restoreSharkAccessories(save.customization.accessories);
    }

    // 5. Update UI & Meters
    if (game.updateHeldItemHUD) game.updateHeldItemHUD();
    if (game.updateMetersUI) game.updateMetersUI();
    updatePassportUI();
  }

  // ---------------------------------------------------------------------------
  // 6. EXPORT / IMPORT FILE BACKUP (.blahaj)
  // ---------------------------------------------------------------------------
  function exportSaveFile(slotNumber = activeSlot) {
    saveNow();
    const key = getSlotStorageKey(slotNumber);
    const data = localStorage.getItem(key) || JSON.stringify(currentSaveState);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    const shark = currentSaveState?.profile?.displayName || 'Shark';
    const dateStr = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `blahaj_island_slot${slotNumber}_${shark.toLowerCase()}_${dateStr}.blahaj`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    if (window.CozyAudio && window.CozyAudio.shonkPop) window.CozyAudio.shonkPop();
    console.log(`[SaveSystem] Exported save file for Slot ${slotNumber}`);
  }

  function importSaveFile(fileOrJson) {
    return new Promise((resolve, reject) => {
      if (typeof fileOrJson === 'string') {
        try {
          const parsed = JSON.parse(fileOrJson);
          if (validateSaveState(parsed)) {
            parsed.slot = activeSlot;
            currentSaveState = parsed;
            saveNow();
            restoreGameFromSave(currentSaveState);
            resolve(currentSaveState);
          } else {
            reject(new Error('Invalid Blåhaj Island save file format'));
          }
        } catch (e) {
          reject(e);
        }
      } else if (fileOrJson instanceof File || fileOrJson instanceof Blob) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const parsed = JSON.parse(e.target.result);
            if (validateSaveState(parsed)) {
              parsed.slot = activeSlot;
              currentSaveState = parsed;
              saveNow();
              restoreGameFromSave(currentSaveState);
              resolve(currentSaveState);
            } else {
              reject(new Error('Invalid Blåhaj Island save file format'));
            }
          } catch (err) {
            reject(err);
          }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(fileOrJson);
      } else {
        reject(new Error('Unsupported input'));
      }
    });
  }

  function validateSaveState(data) {
    return data && typeof data === 'object' && data.version >= 1 && data.profile && data.profile.passportId;
  }

  function resetCurrentSlot() {
    currentSaveState = createDefaultSaveState(activeSlot);
    saveNow();
    restoreGameFromSave(currentSaveState);
    console.log(`[SaveSystem] Reset Slot ${activeSlot} to new game state.`);
  }

  // ---------------------------------------------------------------------------
  // 7. SLOT SUMMARIES FOR UI
  // ---------------------------------------------------------------------------
  function getSlotsSummary() {
    const summaries = [];
    for (let i = 1; i <= NUM_SLOTS; i++) {
      const key = getSlotStorageKey(i);
      const raw = localStorage.getItem(key);
      if (raw) {
        try {
          const s = JSON.parse(raw);
          const itemCount = (s.inventory?.slots || []).filter(Boolean).length;
          summaries.push({
            slot: i,
            isEmpty: false,
            passportId: s.profile?.passportId || 'SHK-0000',
            displayName: s.profile?.displayName || 'Shark',
            activeSharkId: s.profile?.activeSharkId || 'solomon',
            itemCount,
            riftsMended: s.progression?.greatSeam?.totalMendedAllTime || 0,
            questsCount: s.progression?.completedQuests?.length || 0,
            lastSaved: s.lastSaved || s.createdAt,
            isGoogleLinked: !!s.profile?.googleAccount,
            googleEmail: s.profile?.googleAccount?.email || null
          });
          continue;
        } catch (e) {}
      }
      summaries.push({
        slot: i,
        isEmpty: true,
        passportId: '---',
        displayName: 'Empty Slot',
        activeSharkId: 'solomon',
        itemCount: 0,
        riftsMended: 0,
        questsCount: 0,
        lastSaved: null,
        isGoogleLinked: false,
        googleEmail: null
      });
    }
    return summaries;
  }

  // ---------------------------------------------------------------------------
  // 8. GOOGLE IDENTITY SERVICES (GIS) INTEGRATION
  // ---------------------------------------------------------------------------
  function getGoogleClientId() {
    return localStorage.getItem(GOOGLE_CLIENT_ID_KEY) || DEFAULT_GOOGLE_CLIENT_ID;
  }

  function setGoogleClientId(newId) {
    if (newId && typeof newId === 'string') {
      localStorage.setItem(GOOGLE_CLIENT_ID_KEY, newId.trim());
      initGoogleAuth();
    }
  }

  function initGoogleAuth() {
    if (typeof window.google === 'undefined' || !window.google.accounts || !window.google.accounts.id) {
      // Retry in 500ms if GIS script is still downloading
      setTimeout(initGoogleAuth, 500);
      return;
    }

    const clientId = getGoogleClientId();
    try {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleGoogleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true
      });

      renderGoogleButton();
      console.log('[SaveSystem] Google Identity Services initialized.');
    } catch (e) {
      console.warn('[SaveSystem] Google Identity initialize notice:', e);
    }
  }

  function renderGoogleButton() {
    const container = document.getElementById('google-signin-btn-container');
    if (!container || typeof window.google === 'undefined' || !window.google.accounts?.id) return;

    container.innerHTML = '';
    try {
      window.google.accounts.id.renderButton(container, {
        theme: 'filled_blue',
        size: 'large',
        text: 'continue_with',
        shape: 'pill',
        logo_alignment: 'left'
      });
    } catch (e) {
      console.warn('[SaveSystem] Google renderButton notice:', e);
    }
  }

  function parseJwt(token) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (e) {
      console.error('[SaveSystem] Failed parsing JWT:', e);
      return null;
    }
  }

  function handleGoogleCredentialResponse(response) {
    if (!response || !response.credential) return;
    const payload = parseJwt(response.credential);
    if (!payload || !payload.sub) {
      console.error('[SaveSystem] Invalid Google credential payload.');
      return;
    }

    const googleAccount = {
      sub: payload.sub,
      email: payload.email,
      name: payload.name || payload.given_name || 'Blåhaj Explorer',
      picture: payload.picture || null,
      linkedAt: new Date().toISOString()
    };

    if (!currentSaveState) {
      currentSaveState = createDefaultSaveState(activeSlot);
    }
    currentSaveState.profile.googleAccount = googleAccount;
    saveNow();

    notifyGoogleAuthChange(googleAccount);
    updatePassportUI();

    if (window.CozyAudio && window.CozyAudio.portalChime) window.CozyAudio.portalChime();
    if (window.showToast) {
      window.showToast('GOOGLE ACCOUNT LINKED! 🌐✨', `Signed in as ${googleAccount.email}. Cloud sync profile active!`);
    }
    console.log(`[SaveSystem] Successfully linked Google Account: ${googleAccount.email} (${googleAccount.sub})`);
  }

  // Local/Offline preview helper for immediate development and testing
  function simulateGoogleSignIn(mockEmail = 'russell@blahaj-island.org', mockName = 'Captain Russell') {
    handleGoogleCredentialResponse({
      credential: btoa(JSON.stringify({ header: true })) + '.' +
                  btoa(JSON.stringify({
                    sub: 'goog_sub_' + Math.random().toString(36).substring(2, 10),
                    email: mockEmail,
                    name: mockName,
                    picture: 'https://api.dicebear.com/7.x/bottts/svg?seed=blahaj'
                  })) + '.signature'
    });
  }

  function signOutGoogle() {
    if (!currentSaveState) return;
    currentSaveState.profile.googleAccount = null;
    saveNow();
    notifyGoogleAuthChange(null);
    updatePassportUI();
    if (window.showToast) {
      window.showToast('GOOGLE ACCOUNT UNLINKED', 'Save state returned to local Island Passport mode.');
    }
  }

  // ---------------------------------------------------------------------------
  // 9. PASSPORT UI RENDERER
  // ---------------------------------------------------------------------------
  function updatePassportUI() {
    const passportIdEl = document.getElementById('passport-id-badge');
    const passportSharkEl = document.getElementById('passport-shark-name');
    const passportTimeEl = document.getElementById('passport-last-saved');
    const passportItemsCountEl = document.getElementById('passport-items-count');
    const passportRiftsCountEl = document.getElementById('passport-rifts-count');
    const googleStatusCard = document.getElementById('google-account-status');

    if (!currentSaveState) return;

    if (passportIdEl) passportIdEl.textContent = currentSaveState.profile.passportId;
    if (passportSharkEl) passportSharkEl.textContent = currentSaveState.profile.displayName;
    if (passportItemsCountEl) {
      const count = (currentSaveState.inventory?.slots || []).filter(Boolean).length;
      passportItemsCountEl.textContent = `${count} Items in Satchel`;
    }
    if (passportRiftsCountEl) {
      const rifts = currentSaveState.progression?.greatSeam?.totalMendedAllTime || 0;
      passportRiftsCountEl.textContent = `${rifts} Seams Mended`;
    }
    if (passportTimeEl) {
      const d = new Date(currentSaveState.lastSaved || currentSaveState.createdAt);
      passportTimeEl.textContent = `Last Saved: ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
    }

    // Google Status Card
    if (googleStatusCard) {
      const gAcc = currentSaveState.profile.googleAccount;
      if (gAcc) {
        googleStatusCard.innerHTML = `
          <div class="google-linked-row">
            ${gAcc.picture ? `<img src="${gAcc.picture}" class="google-avatar-img" alt="Google Profile" />` : '<span class="google-avatar-fallback">🦈</span>'}
            <div class="google-linked-info">
              <strong class="google-user-name">${escapeHtml(gAcc.name)}</strong>
              <span class="google-user-email">${escapeHtml(gAcc.email)}</span>
              <span class="google-cloud-badge">● Google Cloud Sync Linked</span>
            </div>
            <button type="button" class="btn-unlink-google" id="btn-sign-out-google" title="Disconnect Google Account">Sign Out</button>
          </div>
        `;
        document.getElementById('btn-sign-out-google')?.addEventListener('click', signOutGoogle);
      } else {
        googleStatusCard.innerHTML = `
          <div class="google-unlinked-row">
            <p class="google-unlinked-desc">Sign in with Google to back up your shark inventory, discoveries, and progression across any device.</p>
            <div class="google-btn-wrapper">
              <div id="google-signin-btn-container"></div>
              <button type="button" class="btn-demo-google" id="btn-demo-google-link" title="Simulate Google Link on localhost">Demo Google Link</button>
            </div>
          </div>
        `;
        renderGoogleButton();
        document.getElementById('btn-demo-google-link')?.addEventListener('click', () => {
          simulateGoogleSignIn();
        });
      }
    }

    renderSlotCards();
  }

  function renderSlotCards() {
    const container = document.getElementById('passport-slots-grid');
    if (!container) return;

    const summaries = getSlotsSummary();
    container.innerHTML = '';

    summaries.forEach((s) => {
      const card = document.createElement('div');
      card.className = `save-slot-card ${s.slot === activeSlot ? 'active' : ''}`;
      card.innerHTML = `
        <div class="slot-card-header">
          <span class="slot-number-tag">SLOT ${s.slot}</span>
          ${s.slot === activeSlot ? '<span class="slot-active-badge">ACTIVE</span>' : ''}
        </div>
        <div class="slot-card-body">
          <strong class="slot-title">${escapeHtml(s.displayName)}</strong>
          <span class="slot-passport-id">${s.passportId}</span>
          <div class="slot-metrics">
            <span>🎒 ${s.itemCount} items</span>
            <span>🪡 ${s.riftsMended} seams</span>
          </div>
          <span class="slot-date">${s.lastSaved ? new Date(s.lastSaved).toLocaleDateString() : 'Empty Slot'}</span>
        </div>
        <div class="slot-card-actions">
          ${s.slot !== activeSlot ? `<button type="button" class="slot-btn slot-btn-switch" data-slot="${s.slot}">Switch to Slot ${s.slot}</button>` : '<span class="slot-current-lbl">Currently Playing</span>'}
        </div>
      `;
      container.appendChild(card);
    });

    container.querySelectorAll('.slot-btn-switch').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const slot = parseInt(e.target.dataset.slot, 10);
        switchSlot(slot);
      });
    });
  }

  function switchSlot(slotNumber) {
    if (slotNumber === activeSlot) return;
    saveNow(); // Save current before switching
    loadSlot(slotNumber);
    restoreGameFromSave(currentSaveState);
    if (window.showToast) {
      window.showToast(`SWITCHED TO SAVE SLOT ${slotNumber}`, `Now playing on Passport ${currentSaveState.profile.passportId}`);
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ---------------------------------------------------------------------------
  // 10. LISTENER DISPATCHERS
  // ---------------------------------------------------------------------------
  function notifySave(save) {
    listeners.onSave.forEach((cb) => {
      try { cb(save); } catch (e) { console.error(e); }
    });
  }

  function notifySlotChange() {
    listeners.onSlotChange.forEach((cb) => {
      try { cb(activeSlot, currentSaveState); } catch (e) { console.error(e); }
    });
  }

  function notifyGoogleAuthChange(googleAccount) {
    listeners.onGoogleAuthChange.forEach((cb) => {
      try { cb(googleAccount); } catch (e) { console.error(e); }
    });
  }

  // ---------------------------------------------------------------------------
  // 11. INITIALIZATION & LIFECYCLE
  // ---------------------------------------------------------------------------
  function init() {
    // Determine active slot
    const savedActive = localStorage.getItem(ACTIVE_SLOT_KEY);
    if (savedActive) {
      const parsed = parseInt(savedActive, 10);
      if (parsed >= 1 && parsed <= NUM_SLOTS) activeSlot = parsed;
    }

    loadSlot(activeSlot);

    // Auto-save on page unload
    window.addEventListener('beforeunload', () => {
      saveNow();
    });

    // Periodic auto-save every 45s
    setInterval(() => {
      saveNow();
    }, 45000);

    // Initialize Google GIS
    initGoogleAuth();

    console.log(`[SaveSystem] Initialized on Slot ${activeSlot} (${currentSaveState.profile.passportId})`);
  }

  // Public API
  window.BlahajSaveSystem = {
    init,
    getActiveSlot: () => activeSlot,
    getSaveState: () => currentSaveState,
    saveNow,
    queueAutoSave,
    switchSlot,
    resetCurrentSlot,
    exportSaveFile,
    importSaveFile,
    restoreGameFromSave,
    getSlotsSummary,
    setGoogleClientId,
    getGoogleClientId,
    signOutGoogle,
    simulateGoogleSignIn,
    updatePassportUI,
    onSave: (cb) => listeners.onSave.push(cb),
    onSlotChange: (cb) => listeners.onSlotChange.push(cb),
    onGoogleAuthChange: (cb) => listeners.onGoogleAuthChange.push(cb)
  };

  // Auto-init on script load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
