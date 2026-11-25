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
        displayName: 'Finley',
        activeSharkId: 'custom',
        totalPlayTimeSeconds: 0,
        googleAccount: null, // { sub, email, name, picture, linkedAt }
        founderPasscodeVerified: false,
        customShark: {
          name: 'Untagged Blåhaj #303',
          title: 'Initiate of the Sacred Scissors',
          bodyColor: 0x2578c4,
          bellyColor: 0xf7f2e6,
          scarfColor: 0xd97706,
          plumpness: 1.05,
          keepsake: 'flatpack_hat',
          detagged: false,
          detaggedAt: null,
          tagSerial: 'ART. 303.735.88'
        },
        bookOfNamedSharks: [
          { name: 'Hermes', title: 'The Mangy One · The Weary Guide', date: 'Founding Era' },
          { name: 'Solomon', title: 'The Star Shark · Keeper of the Brew', date: 'Founding Era' },
          { name: 'Hiram', title: 'The Builder · Master of Deep Stone', date: 'Founding Era' },
          { name: 'Nimue', title: 'An Angel · The Plump One', date: 'Founding Era' }
        ]
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
      if (!isInLobbyState) {
        captureActiveCharacterToRoster(false);
      }
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
  function hasCustomGoogleClientId() {
    const custom = localStorage.getItem(GOOGLE_CLIENT_ID_KEY);
    return !!(custom && custom.trim() && custom.trim() !== DEFAULT_GOOGLE_CLIENT_ID);
  }

  function getGoogleClientId() {
    return localStorage.getItem(GOOGLE_CLIENT_ID_KEY) || DEFAULT_GOOGLE_CLIENT_ID;
  }

  function setGoogleClientId(newId) {
    if (newId && typeof newId === 'string' && newId.trim()) {
      localStorage.setItem(GOOGLE_CLIENT_ID_KEY, newId.trim());
      initGoogleAuth();
    } else {
      localStorage.removeItem(GOOGLE_CLIENT_ID_KEY);
    }
    updatePassportUI();
    updateLaunchGatewayUI();
  }

  function openGoogleConnectModal() {
    const modal = document.getElementById('modal-google-connect');
    if (modal) {
      modal.classList.remove('hidden');
      const inputId = document.getElementById('input-google-client-id');
      if (inputId) {
        inputId.value = hasCustomGoogleClientId() ? getGoogleClientId() : '';
      }
    }
  }

  function closeGoogleConnectModal() {
    const modal = document.getElementById('modal-google-connect');
    if (modal) {
      modal.classList.add('hidden');
    }
  }

  function initGoogleAuth() {
    if (!hasCustomGoogleClientId()) {
      // Do not pass placeholder ID to GIS to prevent Error 401 invalid_client
      renderGoogleButton();
      return;
    }

    if (typeof window.google === 'undefined' || !window.google.accounts || !window.google.accounts.id) {
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
      console.log('[SaveSystem] Google Identity Services initialized with custom Client ID.');
    } catch (e) {
      console.warn('[SaveSystem] Google Identity initialize notice:', e);
    }
  }

  function renderGoogleButton() {
    const container = document.getElementById('google-signin-btn-container');
    if (!container) return;

    container.innerHTML = '';

    if (hasCustomGoogleClientId() && typeof window.google !== 'undefined' && window.google.accounts?.id) {
      try {
        window.google.accounts.id.renderButton(container, {
          theme: 'filled_blue',
          size: 'large',
          text: 'continue_with',
          shape: 'pill',
          logo_alignment: 'left'
        });
        return;
      } catch (e) {
        console.warn('[SaveSystem] Google renderButton notice:', e);
      }
    }

    // Friendly connect button when custom Google Cloud client ID is not configured
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn-launch-google';
    btn.style.width = '100%';
    btn.innerHTML = `
      <svg class="google-icon-svg" viewBox="0 0 24 24" width="16" height="16">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
      </svg>
      <span>Connect Google Account</span>
    `;
    btn.addEventListener('click', openGoogleConnectModal);
    container.appendChild(btn);
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
    updateLaunchGatewayUI();
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

    setupModalEventListeners();
    updateLaunchGatewayUI();
    console.log(`[SaveSystem] Initialized on Slot ${activeSlot} (${currentSaveState.profile.passportId})`);
  }

  // ---------------------------------------------------------------------------
  function formatTimeAgo(date) {
    if (!date || isNaN(date.getTime())) return 'Just now';
    const sec = Math.floor((Date.now() - date.getTime()) / 1000);
    if (sec < 60) return 'Just now';
    const min = Math.floor(sec / 60);
    if (min < 60) return min + 'm ago';
    const hr = Math.floor(min / 60);
    if (hr < 24) return hr + 'h ago';
    return Math.floor(hr / 24) + 'd ago';
  }

  // ---------------------------------------------------------------------------
  // 10. FULL-SCREEN MMO CHARACTER SELECT LOBBY & PER-CHARACTER ROSTER VAULT
  // ---------------------------------------------------------------------------
  const ROSTER_STORAGE_KEY = 'blahaj_character_roster_v1';
  const FOUNDER_SHARK_IDS = ['hermes', 'solomon', 'hiram', 'nimue'];
  const ALL_ROSTER_IDS = ['hermes', 'solomon', 'hiram', 'nimue', 'custom'];

  const DEFAULT_SHARK_SPAWNS = {
    hermes:  { x: 58.0,  y: 2.8, z: -10.0, rotY: -Math.PI / 2, zone: 'island' },
    solomon: { x: -4.0,  y: 5.5, z: 10.0,  rotY: 0.4,          zone: 'island' },
    hiram:   { x: -34.0, y: 4.5, z: -18.0, rotY: 1.2,          zone: 'island' },
    nimue:   { x: 18.0,  y: 3.2, z: 42.0,  rotY: -2.4,         zone: 'island' },
    custom:  { x: 52.0,  y: 2.8, z: -6.0,  rotY: -Math.PI / 2, zone: 'island' }
  };

  let selectedLobbySharkId = null;
  let isInLobbyState = true;
  // Map of sharkId -> { clientId, playerName, updatedAt } for remote players currently in-world
  const remoteCharacterLocks = {};

  function getMyAccountDisplayName() {
    const gAcc = currentSaveState?.profile?.googleAccount;
    if (gAcc && gAcc.name) return gAcc.name.split(' ')[0];
    if (gAcc && gAcc.email) {
      const em = gAcc.email.toLowerCase();
      if (em.includes('russell')) return 'Russell';
      if (em.includes('helen')) return 'Helen';
    }
    if (isFounderArchodect()) return 'Founder';
    const cs = currentSaveState?.profile?.customShark;
    return (cs && cs.detagged && cs.name) ? cs.name : 'Explorer';
  }

  const DEFAULT_SHARK_INVENTORIES = {
    hermes: [
      { id: 'breb', qty: 5 },
      { id: 'tea', qty: 3 },
      { id: 'binoculars', qty: 1 },
      { id: 'star_lantern', qty: 1 },
      { id: 'seam_needle', qty: 1 },
      { id: 'carrot_toy', qty: 1 },
      { id: 'ancient_pages', qty: 2 },
      { id: 'memory_crystal', qty: 1 }
    ],
    solomon: [
      { id: 'breb', qty: 8 },
      { id: 'tea', qty: 5 },
      { id: 'binoculars', qty: 1 },
      { id: 'margarita', qty: 2 },
      { id: 'tropical_cocktail', qty: 2 },
      { id: 'celestial_boba', qty: 2 },
      { id: 'guano', qty: 4 },
      { id: 'sulfur', qty: 3 },
      { id: 'star_powder', qty: 2 }
    ],
    hiram: [
      { id: 'breb', qty: 4 },
      { id: 'tea', qty: 2 },
      { id: 'binoculars', qty: 1 },
      { id: 'hex_key', qty: 1 },
      { id: 'blueprints', qty: 1 },
      { id: 'pure_obsidian', qty: 4 },
      { id: 'mortar_tube', qty: 1 }
    ],
    nimue: [
      { id: 'breb', qty: 4 },
      { id: 'tea', qty: 4 },
      { id: 'binoculars', qty: 1 },
      { id: 'seam_needle', qty: 1 },
      { id: 'seam_detector', qty: 1 },
      { id: 'starlight_quartz', qty: 3 },
      { id: 'beach_ball', qty: 2 }
    ],
    custom: [
      { id: 'breb', qty: 4 },
      { id: 'tea', qty: 2 },
      { id: 'binoculars', qty: 1 },
      { id: 'beach_ball', qty: 1 }
    ]
  };

  function buildStarterSlotsForShark(sharkId) {
    const template = DEFAULT_SHARK_INVENTORIES[sharkId] || DEFAULT_SHARK_INVENTORIES.custom;
    if (window.BlahajInventory && typeof window.BlahajInventory.createPlayerInventory === 'function') {
      const tmpInv = window.BlahajInventory.createPlayerInventory();
      tmpInv.restore([]);
      template.forEach((entry) => {
        tmpInv.addItem(entry.id, entry.qty);
      });
      return tmpInv.serialize();
    }
    return template.map((e) => ({ id: e.id, qty: e.qty }));
  }

  function ensureCharacterRoster() {
    if (!currentSaveState) currentSaveState = createDefaultSaveState(activeSlot);
    if (!currentSaveState.characterRoster || typeof currentSaveState.characterRoster !== 'object') {
      let cached = null;
      try {
        const raw = localStorage.getItem(ROSTER_STORAGE_KEY);
        if (raw) cached = JSON.parse(raw);
      } catch (e) {}
      currentSaveState.characterRoster = (cached && typeof cached === 'object') ? cached : {};
    }
    const roster = currentSaveState.characterRoster;

    // One-time migration to v2 strict per-character inventories (so each shark has its own distinct bag & skills!)
    if (!roster._perCharacterIsolatedV2) {
      roster._perCharacterIsolatedV2 = true;
      delete roster.founderSharedPool;
      ALL_ROSTER_IDS.forEach((id) => {
        const existing = roster[id];
        const sp = DEFAULT_SHARK_SPAWNS[id] || DEFAULT_SHARK_SPAWNS.hermes;
        roster[id] = {
          sharkId: id,
          updatedAt: existing?.updatedAt || 0,
          inventorySlots: buildStarterSlotsForShark(id),
          heldItemId: null,
          unlockedUpgrades: Array.isArray(existing?.unlockedUpgrades) ? [...existing.unlockedUpgrades] : [],
          birbsFedCount: existing?.birbsFedCount ?? (id === 'solomon' ? 10 : 6),
          carrotsKnockedCount: existing?.carrotsKnockedCount ?? (id === 'hermes' ? 6 : 4),
          trialPoints: existing?.trialPoints ?? (id === 'hiram' ? 4 : 2),
          seamMendedCount: existing?.seamMendedCount ?? (id === 'nimue' ? 2 : 0),
          mange: typeof existing?.mange === 'number'
            ? existing.mange
            : (id === 'hermes' ? 0.85 : (id === 'solomon' ? 0.45 : (id === 'hiram' ? 0.65 : (id === 'nimue' ? 0.25 : 0.10)))),
          accessories: existing?.accessories || { showRelic: true, showHeadgear: true },
          pos: existing?.pos || { ...sp }
        };
      });
      try {
        localStorage.setItem(ROSTER_STORAGE_KEY, JSON.stringify(roster));
      } catch (e) {}
    }

    ALL_ROSTER_IDS.forEach((id) => {
      if (!roster[id] || typeof roster[id] !== 'object') {
        const sp = DEFAULT_SHARK_SPAWNS[id] || DEFAULT_SHARK_SPAWNS.hermes;
        roster[id] = {
          sharkId: id,
          updatedAt: 0,
          inventorySlots: buildStarterSlotsForShark(id),
          heldItemId: null,
          unlockedUpgrades: [],
          birbsFedCount: id === 'solomon' ? 10 : 6,
          carrotsKnockedCount: id === 'hermes' ? 6 : 4,
          trialPoints: id === 'hiram' ? 4 : 2,
          seamMendedCount: id === 'nimue' ? 2 : 0,
          mange: id === 'hermes' ? 0.85 : (id === 'solomon' ? 0.45 : (id === 'hiram' ? 0.65 : (id === 'nimue' ? 0.25 : 0.10))),
          accessories: { showRelic: true, showHeadgear: true },
          pos: { ...sp }
        };
      }
    });

    // v19.1 Four Worlds (Plushiah -> Fintzirah -> Brewiah -> Sharkziluth) & 0°=0□..10°=1□ Migration
    const progApi = window.BlahajProgression;
    if (progApi && !roster._fourWorldsProgressionV191) {
      roster._fourWorldsProgressionV191 = true;
      const cs = currentSaveState?.profile?.customShark || {};
      ALL_ROSTER_IDS.forEach((id) => {
        const defProg = progApi.buildDefaultProgressionForShark(id, {
          mentorId: cs.mentorId || 'hermes',
          starterSkills: cs.starterSkills
        });
        const rec = roster[id];
        rec.world = defProg.world;
        rec.level = defProg.level;
        rec.skillPoints = defProg.skillPoints;
        rec.mentorId = defProg.mentorId;
        rec.mentorRep = { ...defProg.mentorRep };
        rec.clearedTrials = Array.isArray(rec.clearedTrials) ? rec.clearedTrials : [];
        rec.learnedAbilities = [...defProg.learnedAbilities];
        rec.actionBar = { ...defProg.actionBar };
      });
      try {
        localStorage.setItem(ROSTER_STORAGE_KEY, JSON.stringify(roster));
      } catch (e) {}
    } else if (progApi) {
      const cs = currentSaveState?.profile?.customShark || {};
      ALL_ROSTER_IDS.forEach((id) => {
        const rec = roster[id];
        if (!Array.isArray(rec.learnedAbilities) || typeof rec.level !== 'number' || typeof rec.world !== 'number') {
          const defProg = progApi.buildDefaultProgressionForShark(id, {
            mentorId: cs.mentorId || 'hermes',
            starterSkills: cs.starterSkills
          });
          if (typeof rec.world !== 'number') rec.world = defProg.world;
          if (typeof rec.level !== 'number') rec.level = defProg.level;
          if (typeof rec.skillPoints !== 'number') rec.skillPoints = defProg.skillPoints;
          if (!rec.mentorId) rec.mentorId = defProg.mentorId;
          if (!rec.mentorRep || typeof rec.mentorRep !== 'object') rec.mentorRep = { ...defProg.mentorRep };
          if (!Array.isArray(rec.clearedTrials)) rec.clearedTrials = [];
          if (!Array.isArray(rec.learnedAbilities)) rec.learnedAbilities = [...defProg.learnedAbilities];
          if (!rec.actionBar || typeof rec.actionBar !== 'object') rec.actionBar = { ...defProg.actionBar };
        }
      });
    }
    return roster;
  }

  function getCharacterProgressionRecord(sharkId) {
    const id = ALL_ROSTER_IDS.includes(sharkId) ? sharkId : 'hermes';
    const roster = ensureCharacterRoster();
    return roster[id] || null;
  }

  function updateCharacterProgressionRecord(sharkId, mutator) {
    const id = ALL_ROSTER_IDS.includes(sharkId) ? sharkId : 'hermes';
    const roster = ensureCharacterRoster();
    const rec = roster[id];
    if (!rec) return null;
    if (typeof mutator === 'function') {
      mutator(rec);
    } else if (mutator && typeof mutator === 'object') {
      Object.assign(rec, mutator);
    }
    rec.updatedAt = Date.now();
    persistRosterToStorage();
    return rec;
  }

  function persistRosterToStorage() {
    const roster = ensureCharacterRoster();
    try {
      localStorage.setItem(ROSTER_STORAGE_KEY, JSON.stringify(roster));
    } catch (e) {}
  }

  function mergeInventorySlotArrays(slotsA, slotsB) {
    if (!Array.isArray(slotsA) && !Array.isArray(slotsB)) return null;
    if (!Array.isArray(slotsA)) return JSON.parse(JSON.stringify(slotsB));
    if (!Array.isArray(slotsB)) return JSON.parse(JSON.stringify(slotsA));
    // Take maximum quantity of each item ID across both arrays, preserving slot order of the newer array (slotsA)
    const totalsA = {};
    const totalsB = {};
    slotsA.forEach((s) => { if (s && s.id && s.qty > 0) totalsA[s.id] = (totalsA[s.id] || 0) + s.qty; });
    slotsB.forEach((s) => { if (s && s.id && s.qty > 0) totalsB[s.id] = (totalsB[s.id] || 0) + s.qty; });
    const out = JSON.parse(JSON.stringify(slotsA));
    Object.keys(totalsB).forEach((itemId) => {
      const diff = (totalsB[itemId] || 0) - (totalsA[itemId] || 0);
      if (diff > 0) {
        // Add extra count into existing stack or first empty slot
        let rem = diff;
        for (let i = 0; i < out.length && rem > 0; i++) {
          if (out[i] && out[i].id === itemId) {
            out[i].qty += rem;
            rem = 0;
          }
        }
        for (let i = 0; i < out.length && rem > 0; i++) {
          if (!out[i]) {
            out[i] = { id: itemId, qty: rem };
            rem = 0;
          }
        }
      }
    });
    return out;
  }

  function captureActiveCharacterToRoster(broadcastToPartner = false) {
    const game = window.BlahajGame;
    if (!game || typeof game.getPlayer !== 'function') return null;
    const player = game.getPlayer();
    if (!player || !player.sharkId) return null;

    const sharkId = player.sharkId;
    const roster = ensureCharacterRoster();
    const rec = roster[sharkId] || (roster[sharkId] = { sharkId });
    const now = Date.now();
    rec.updatedAt = now;

    const inv = game.getPlayerInventory ? game.getPlayerInventory() : player.inventory;
    if (inv && typeof inv.serialize === 'function') {
      rec.inventorySlots = inv.serialize();
    }
    if (game.getActiveHeldItem) {
      rec.heldItemId = game.getActiveHeldItem() || null;
    }
    if (player.unlockedUpgrades instanceof Set) {
      rec.unlockedUpgrades = Array.from(player.unlockedUpgrades);
    }
    rec.birbsFedCount = player.birbsFedCount ?? 6;
    rec.carrotsKnockedCount = player.carrotsKnockedCount ?? 4;
    rec.trialPoints = player.trialPoints ?? 2;
    rec.seamMendedCount = player.seamMendedCount ?? 0;

    if (game.getSharkMange) {
      rec.mange = game.getSharkMange(sharkId);
    }
    if (game.getSharkAccessories) {
      rec.accessories = game.getSharkAccessories(sharkId);
    }
    if (window.BlahajMMO && typeof window.BlahajMMO.exportSharkLoadout === 'function') {
      const loadout = window.BlahajMMO.exportSharkLoadout(sharkId);
      if (loadout) {
        rec.learnedAbilities = loadout.learnedAbilities;
        rec.actionBar = loadout.actionBar;
      }
    }
    const zoneNow = (game.getZone && game.getZone()) || 'island';
    if (zoneNow === 'island' && player.pos && Number.isFinite(player.pos.x) && Number.isFinite(player.pos.z)) {
      rec.pos = {
        x: Number(player.pos.x.toFixed(2)),
        y: Number(player.pos.y.toFixed(2)),
        z: Number(player.pos.z.toFixed(2)),
        rotY: Number((player.rotY || 0).toFixed(3)),
        zone: 'island'
      };
    }

    persistRosterToStorage();

    // Sync THIS specific character's record over the network so if Russell collects items on Solomon
    // and later Helen plays Solomon, Solomon has all of Solomon's items and skills (while Hermes, Hiram & Nimue keep their own separate bags!)
    if (broadcastToPartner && window.BlahajNetwork && typeof window.BlahajNetwork.send === 'function') {
      window.BlahajNetwork.send({
        type: 'roster_sync',
        sharkId,
        record: rec
      });
    }
    return rec;
  }

  function applyCharacterFromRoster(sharkId) {
    const game = window.BlahajGame;
    if (!game || typeof game.getPlayer !== 'function') return;
    const player = game.getPlayer();
    if (!player) return;

    const roster = ensureCharacterRoster();
    const rec = roster[sharkId] || roster.hermes;

    // 1. Restore THIS character's own personal Inventory
    const inv = game.getPlayerInventory ? game.getPlayerInventory() : player.inventory;
    if (inv && typeof inv.restore === 'function') {
      if (Array.isArray(rec.inventorySlots)) {
        inv.restore(rec.inventorySlots);
      } else {
        inv.restore(buildStarterSlotsForShark(sharkId));
      }
    }

    // 2. Restore THIS character's own Skills / Upgrades & Currencies
    const targetUpgrades = Array.isArray(rec.unlockedUpgrades) ? rec.unlockedUpgrades : [];
    if (player.unlockedUpgrades instanceof Set) {
      player.unlockedUpgrades.clear();
      targetUpgrades.forEach((u) => player.unlockedUpgrades.add(u));
    }
    player.birbsFedCount = rec.birbsFedCount ?? 6;
    player.carrotsKnockedCount = rec.carrotsKnockedCount ?? 4;
    player.trialPoints = rec.trialPoints ?? 2;
    player.seamMendedCount = rec.seamMendedCount ?? 0;

    // 3. Restore Mange & Accessories
    if (typeof rec.mange === 'number' && game.setSharkMange) {
      game.setSharkMange(sharkId, rec.mange);
    }
    if (rec.accessories && game.restoreSharkAccessories) {
      game.restoreSharkAccessories({ [sharkId]: rec.accessories });
    }

    // 4. Restore Held Item
    if (rec.heldItemId && inv && typeof inv.hasItem === 'function' && inv.hasItem(rec.heldItemId)) {
      if (game.equipHeldItem) game.equipHeldItem(rec.heldItemId, false);
    } else if (game.stowHeldItem) {
      game.stowHeldItem();
    }

    // 5. Restore Character's Saved World Position
    if (rec.pos && Number.isFinite(rec.pos.x) && Number.isFinite(rec.pos.z)) {
      const world = game.getWorldApi ? game.getWorldApi() : null;
      const gy = (world && typeof world.getGroundAndStructureHeight === 'function')
        ? world.getGroundAndStructureHeight(rec.pos.x, rec.pos.z)
        : (rec.pos.y || 2.8);
      player.pos.set(rec.pos.x, Math.max(gy, rec.pos.y || gy), rec.pos.z);
      if (typeof rec.pos.rotY === 'number') {
        player.rotY = rec.pos.rotY;
        const camState = game.getCamState ? game.getCamState() : window.camState;
        if (camState) {
          camState.yaw = Math.atan2(-Math.sin(player.rotY), -Math.cos(player.rotY));
        }
      }
      if (player.mesh) {
        player.mesh.position.copy(player.pos);
        player.mesh.rotation.y = player.rotY;
      }
    }

    if (typeof window._blahajRenderFinBelt === 'function') window._blahajRenderFinBelt();
    if (window.BlahajMMO && typeof window.BlahajMMO.syncSharkFromProgression === 'function') {
      window.BlahajMMO.syncSharkFromProgression(sharkId, rec);
    }
    if (game.refreshCharacterProgressionHUD) game.refreshCharacterProgressionHUD(sharkId);
    if (game.updateMetersUI) game.updateMetersUI();
  }

  function handleIncomingRosterSync(data) {
    if (!data) return;
    const roster = ensureCharacterRoster();
    let changed = false;

    const mergeOneRecord = (sId, inc) => {
      if (!sId || !inc || !roster[sId]) return;
      const localRec = roster[sId];
      const mergedSlots = mergeInventorySlotArrays(inc.inventorySlots, localRec.inventorySlots);
      const mergedUpgrades = Array.from(new Set([...(localRec.unlockedUpgrades || []), ...(inc.unlockedUpgrades || [])]));
      const mergedLearned = Array.from(new Set([...(localRec.learnedAbilities || []), ...(inc.learnedAbilities || [])]));
      const mergedTrials = Array.from(new Set([...(localRec.clearedTrials || []), ...(inc.clearedTrials || [])]));
      const mergedRep = { ...(localRec.mentorRep || {}) };
      if (inc.mentorRep && typeof inc.mentorRep === 'object') {
        Object.keys(inc.mentorRep).forEach((mKey) => {
          mergedRep[mKey] = Math.max(mergedRep[mKey] || 0, inc.mentorRep[mKey] || 0);
        });
      }
      const mergedBar = (window.BlahajProgression && typeof window.BlahajProgression.buildActionBarFromSkills === 'function')
        ? window.BlahajProgression.buildActionBarFromSkills(mergedLearned, inc.actionBar || localRec.actionBar)
        : (inc.actionBar || localRec.actionBar);

      roster[sId] = {
        ...localRec,
        ...inc,
        level: Math.max(localRec.level || 1, inc.level || 1),
        skillPoints: Math.max(localRec.skillPoints || 0, inc.skillPoints || 0),
        mentorId: inc.mentorId || localRec.mentorId || (sId === 'custom' ? 'hermes' : sId),
        mentorRep: mergedRep,
        clearedTrials: mergedTrials,
        learnedAbilities: mergedLearned,
        actionBar: mergedBar,
        inventorySlots: mergedSlots,
        unlockedUpgrades: mergedUpgrades,
        birbsFedCount: Math.max(localRec.birbsFedCount || 0, inc.birbsFedCount || 0),
        carrotsKnockedCount: Math.max(localRec.carrotsKnockedCount || 0, inc.carrotsKnockedCount || 0),
        trialPoints: Math.max(localRec.trialPoints || 0, inc.trialPoints || 0),
        seamMendedCount: Math.max(localRec.seamMendedCount || 0, inc.seamMendedCount || 0)
      };
      changed = true;
    };

    if (data.record && data.sharkId) {
      mergeOneRecord(data.sharkId, data.record);
    }
    if (data.allRecords && typeof data.allRecords === 'object') {
      FOUNDER_SHARK_IDS.forEach((fId) => {
        if (data.allRecords[fId]) mergeOneRecord(fId, data.allRecords[fId]);
      });
    }

    if (changed) {
      persistRosterToStorage();
      if (isInLobbyState) updateLaunchGatewayUI();
    }
  }

  function updateRemoteCharacterLock(sharkId, clientId, playerName, isReleased = false) {
    const myId = (window.BlahajNetwork && typeof window.BlahajNetwork.getClientId === 'function')
      ? window.BlahajNetwork.getClientId()
      : null;
    if (clientId && myId && clientId === myId) return;

    // First clear any previous lock held by this same remote clientId
    if (clientId) {
      Object.keys(remoteCharacterLocks).forEach((k) => {
        if (remoteCharacterLocks[k] && remoteCharacterLocks[k].clientId === clientId) {
          delete remoteCharacterLocks[k];
        }
      });
    }

    if (!isReleased && sharkId && FOUNDER_SHARK_IDS.includes(sharkId)) {
      remoteCharacterLocks[sharkId] = {
        clientId: clientId || 'coop-partner',
        playerName: playerName || 'Partner',
        updatedAt: Date.now()
      };
    } else if (isReleased && sharkId) {
      delete remoteCharacterLocks[sharkId];
    }

    if (isInLobbyState) {
      updateLaunchGatewayUI();
    }
  }

  function getActiveLockForShark(sharkId) {
    if (!FOUNDER_SHARK_IDS.includes(sharkId)) return null;
    const lock = remoteCharacterLocks[sharkId];
    if (!lock) return null;
    // Expire stale lock if no packet from partner in >15s
    if (Date.now() - (lock.updatedAt || 0) > 15000) {
      delete remoteCharacterLocks[sharkId];
      return null;
    }
    return lock;
  }

  function getSelectedLobbySharkId() {
    const isFounder = isFounderArchodect();
    if (!isFounder) {
      selectedLobbySharkId = 'custom';
      return 'custom';
    }
    if (!selectedLobbySharkId || !ALL_ROSTER_IDS.includes(selectedLobbySharkId)) {
      const savedId = currentSaveState?.profile?.activeSharkId;
      selectedLobbySharkId = (savedId && ALL_ROSTER_IDS.includes(savedId)) ? savedId : 'hermes';
    }
    // If selected shark is currently locked by partner in-world, auto-pick first available Founder shark
    if (getActiveLockForShark(selectedLobbySharkId)) {
      const avail = FOUNDER_SHARK_IDS.find((id) => !getActiveLockForShark(id)) || 'custom';
      selectedLobbySharkId = avail;
    }
    return selectedLobbySharkId;
  }

  function selectLobbyShark(sharkId) {
    const isFounder = isFounderArchodect();
    if (FOUNDER_SHARK_IDS.includes(sharkId) && !isFounder) {
      if (window.CozyAudio && window.CozyAudio.shonk) window.CozyAudio.shonk();
      openGoogleConnectModal();
      return false;
    }
    const lock = getActiveLockForShark(sharkId);
    if (lock) {
      if (window.CozyAudio && window.CozyAudio.shonk) window.CozyAudio.shonk();
      if (window.showToast) {
        const sName = window.BLAHAJ_LORE?.sharks?.[sharkId]?.name || sharkId;
        window.showToast(
          `🔒 ${sName.toUpperCase()} IS CURRENTLY IN-WORLD`,
          `${sName} is currently being played by ${lock.playerName}! Select another character.`
        );
      }
      return false;
    }
    selectedLobbySharkId = sharkId;
    if (currentSaveState?.profile) {
      currentSaveState.profile.activeSharkId = sharkId;
    }
    if (window.CozyAudio && window.CozyAudio.pocketWatchClick) window.CozyAudio.pocketWatchClick();
    updateLaunchGatewayUI();
    return true;
  }

  function renderCharacterSelectRosterGrid() {
    const grid = document.getElementById('lobby-character-roster-grid');
    if (!grid) return;

    const isFounder = isFounderArchodect();
    const roster = ensureCharacterRoster();
    const cs = ensureCustomSharkDefaults();
    const activePick = getSelectedLobbySharkId();
    const loreSharks = window.BLAHAJ_LORE?.sharks || {};

    const cardsMeta = [
      {
        id: 'hermes',
        name: 'Hermes',
        title: 'The Mangy One · Weary Guide',
        portrait: 'assets/gallery/Hermes.png',
        roleBadge: '🧭 Portal Wayfinder',
        spec: 'Between-Realm Portals & Seam Divining',
        isFounderOnly: true
      },
      {
        id: 'solomon',
        name: 'Solomon',
        title: 'The Star Shark · Keeper of the Brew',
        portrait: 'assets/gallery/Solomon.png',
        roleBadge: '🍵 Tea & Pyrotechnics',
        spec: 'Sacred Tea Brewing, Baking & Star Powder',
        isFounderOnly: true
      },
      {
        id: 'hiram',
        name: 'Hiram',
        title: 'The Builder · Master of Deep Stone',
        portrait: 'assets/gallery/Hiram.png',
        roleBadge: '🔧 Master Architect',
        spec: 'Sacred Allen Key Construction & Turnery',
        isFounderOnly: true
      },
      {
        id: 'nimue',
        name: 'Nimue',
        title: 'An Angel · The Plump One',
        portrait: 'assets/gallery/Nimue.png',
        roleBadge: '✨ Astral Weaver',
        spec: 'Starlight Resonance, Braided Fuse & Grace',
        isFounderOnly: true
      },
      {
        id: 'custom',
        name: cs.detagged ? cs.name : 'Create New Blåhaj',
        title: cs.detagged ? (cs.title || 'Liberated Shark of Blåhaj Island') : 'Fresh from the IKEA Spawning Pits',
        portrait: 'assets/gallery/Names.png',
        roleBadge: cs.detagged ? '✂️ Custom Blåhaj' : '🏷️ New Character',
        spec: cs.detagged ? `Serial ${cs.tagSerial || 'ART. 303.735.88'} · Detagged` : 'Customize Fleece, Scarf & True Name',
        isFounderOnly: false
      }
    ];

    grid.innerHTML = cardsMeta.map((c) => {
      const rec = roster[c.id] || {};
      const slots = Array.isArray(rec.inventorySlots) ? rec.inventorySlots : [];
      const itemCount = slots.filter(Boolean).reduce((acc, s) => acc + (s.qty || 1), 0);
      const progApi = window.BlahajProgression;
      const charWorld = rec.world || 1;
      const charLevel = (typeof rec.level === 'number') ? rec.level : (c.id === 'custom' ? 0 : 5);
      const worldInfo = progApi ? progApi.getWorldInfo(charWorld) : { name: 'Plushiah', icon: '🧶' };
      const degInfo = progApi ? progApi.getDegreeInfo(charLevel) : { level: charLevel, cipher: charLevel >= 5 ? '5°=6□' : '0°=0□', title: 'Initiate' };
      const mentorCur = progApi ? progApi.getMentorCurrent(rec.mentorId || (c.id === 'custom' ? (cs.mentorId || 'hermes') : c.id)) : null;
      const knownArtsCount = Array.isArray(rec.learnedAbilities)
        ? rec.learnedAbilities.length
        : (c.id === 'custom' ? (Array.isArray(cs.starterSkills) ? cs.starterSkills.length : 3) : 7);
      const mangePct = Math.round(((typeof rec.mange === 'number' ? rec.mange : (loreSharks[c.id]?.mange ?? 0.45))) * 100);

      const lock = getActiveLockForShark(c.id);
      const lockedByFounderGate = c.isFounderOnly && !isFounder;
      const lockedByPartner = !!lock;
      const isSelected = activePick === c.id && !lockedByFounderGate && !lockedByPartner;

      let statusPillHtml = '';
      if (lockedByPartner) {
        statusPillHtml = `<span class="char-card-status status-inworld">🔒 IN WORLD · Played by ${escapeHtml(lock.playerName)}</span>`;
      } else if (lockedByFounderGate) {
        statusPillHtml = `<span class="char-card-status status-founder-locked">👑 Founder Mentor NPC</span>`;
      } else if (c.id === 'custom' && !cs.detagged) {
        statusPillHtml = `<span class="char-card-status status-create">✂️ Click to Create Character</span>`;
      } else if (isSelected) {
        statusPillHtml = `<span class="char-card-status status-selected">★ SELECTED TO EMBARK</span>`;
      } else {
        statusPillHtml = `<span class="char-card-status status-ready">🟢 Available</span>`;
      }

      const currentSubtitle = mentorCur
        ? `${mentorCur.icon} ${c.isFounderOnly ? mentorCur.currentName : `Mentor: ${mentorCur.mentorName} (${mentorCur.shortLabel})`}`
        : c.spec;

      return `
        <div class="lobby-char-card ${isSelected ? 'selected' : ''} ${lockedByPartner ? 'locked-inworld' : ''} ${lockedByFounderGate ? 'locked-founder' : ''}"
             data-shark-card="${c.id}" role="button" tabindex="0">
          <div class="char-card-top">
            <span class="char-degree-pill" title="${escapeHtml(worldInfo.name)} · ${escapeHtml(degInfo.title)}">${worldInfo.icon} ${escapeHtml(degInfo.cipher)} · ${escapeHtml(worldInfo.name)}</span>
            ${statusPillHtml}
          </div>
          <div class="char-card-hero">
            <div class="char-portrait-wrap">
              <img src="${c.portrait}" alt="${escapeHtml(c.name)}" class="char-card-portrait" />
              ${lockedByPartner ? '<div class="char-lock-overlay">🔒</div>' : ''}
            </div>
            <div class="char-card-identity">
              <h3 class="char-card-name">${escapeHtml(c.name)}</h3>
              <div class="char-card-title">${escapeHtml(c.title)}</div>
              <div class="char-card-spec">${escapeHtml(currentSubtitle)}</div>
            </div>
          </div>
          <div class="char-card-stats">
            <span title="This Character's Personal 36-Slot Satchel">🎒 Bag: <strong>${itemCount}</strong></span>
            <span title="Known Fin &amp; Tail Martial Arts (of 12)">⚡ Arts: <strong>${knownArtsCount}/12</strong></span>
            <span title="Plush Coat Mange Factor">🧵 Coat: <strong>${mangePct}%</strong></span>
          </div>
          ${c.id === 'custom' ? `
            <button type="button" class="btn-char-card-customize" data-customize-custom="true" title="Choose Mentor Current, Starter Arts, Name & Plush Dye">
              ✂️ ${cs.detagged ? 'Edit Name, Mentor & Appearance' : 'Create & Name Your Blåhaj'}
            </button>
          ` : ''}
        </div>
      `;
    }).join('');

    grid.querySelectorAll('.lobby-char-card').forEach((card) => {
      card.addEventListener('click', (e) => {
        if (e.target && e.target.closest('[data-customize-custom]')) {
          e.stopPropagation();
          selectedLobbySharkId = 'custom';
          openRiteOfDetaggingModal();
          updateLaunchGatewayUI();
          return;
        }
        const sId = card.dataset.sharkCard;
        if (sId === 'custom' && !cs.detagged) {
          selectedLobbySharkId = 'custom';
          openRiteOfDetaggingModal();
          updateLaunchGatewayUI();
          return;
        }
        selectLobbyShark(sId);
      });
    });
  }

  function updateLaunchGatewayUI() {
    const gatewayPanel = document.getElementById('launch-gateway-panel');
    if (!gatewayPanel) return;

    const accountStrip = document.getElementById('launch-account-strip');
    const slotBadge = document.getElementById('launch-slot-badge');
    const slotStats = document.getElementById('launch-slot-stats');
    const embarkText = document.getElementById('launch-embark-text');
    const embarkSub = document.getElementById('embark-audio-sub');
    const authRow = document.getElementById('launch-actions-row');
    const netStatusPill = document.getElementById('lobby-net-buffer-pill');

    const summaries = getSlotsSummary();
    const curSlotSummary = summaries.find((s) => s.slot === activeSlot) || summaries[0];
    const gAcc = currentSaveState?.profile?.googleAccount;
    const isFounder = isFounderArchodect();
    const cs = ensureCustomSharkDefaults();
    const activePick = getSelectedLobbySharkId();

    // 0. Network & 360° Camera Buffer Readiness Pill
    const overlayEl = document.getElementById('game-loading-screen');
    if (overlayEl && !gatewayPanel.classList.contains('hidden')) {
      overlayEl.classList.add('lobby-3d-live');
    }
    if (netStatusPill) {
      const activeLockNames = Object.keys(remoteCharacterLocks)
        .map((k) => {
          const l = getActiveLockForShark(k);
          const sName = window.BLAHAJ_LORE?.sharks?.[k]?.name || k;
          return l ? `${l.playerName} (${sName})` : null;
        })
        .filter(Boolean);

      if (activeLockNames.length > 0) {
        netStatusPill.innerHTML = `🟢 <strong>360° Camera Warmed · Co-op Linked:</strong> ${escapeHtml(activeLockNames.join(', '))} in-world`;
        netStatusPill.className = 'lobby-net-pill online';
      } else {
        netStatusPill.innerHTML = `🟢 <strong>360° Camera Sweeping Live &amp; Unblocked</strong> · Ready for Instant Mouse Look`;
        netStatusPill.className = 'lobby-net-pill ready';
      }
    }

    // 1. Render Character Select Roster Cards
    renderCharacterSelectRosterGrid();

    // 2. Account Strip
    if (accountStrip) {
      if (gAcc) {
        accountStrip.innerHTML = `
          <div class="launch-account-pill">
            ${gAcc.picture ? `<img src="${gAcc.picture}" class="launch-avatar-img" alt="Google Profile" />` : '<span class="launch-pill-icon">👑🦈</span>'}
            <div class="launch-account-text">
              <span class="launch-user-name">${escapeHtml(gAcc.name)} ${isFounder ? '<span class="badge-synced">· 👑 Founder Archodect</span>' : ''}</span>
              <span class="launch-user-sub">${escapeHtml(gAcc.email)} · <strong class="badge-synced">● Shared Roster &amp; Cloud Sync Active</strong></span>
            </div>
            <button type="button" class="launch-btn-subtle" id="launch-btn-switch-founder" title="Switch Account or Manage Google Profile">Account 🔑</button>
          </div>
        `;
        document.getElementById('launch-btn-switch-founder')?.addEventListener('click', openGoogleConnectModal);
      } else if (isFounder) {
        accountStrip.innerHTML = `
          <div class="launch-account-pill">
            <span class="launch-pill-icon">👑🦈</span>
            <div class="launch-account-text">
              <span class="launch-user-name">Founder Archodect (Russell &amp; Helen Roster Unlocked)</span>
              <span class="launch-user-sub">All 4 Sacred Founders &amp; Shared Inventory Vault Active · <strong class="badge-synced">● Founder Verified</strong></span>
            </div>
            <button type="button" class="launch-btn-subtle" id="launch-btn-link-google-founder" title="Link Russell or Helen Google Profile">Link Google 🌐</button>
          </div>
        `;
        document.getElementById('launch-btn-link-google-founder')?.addEventListener('click', openGoogleConnectModal);
      } else {
        const passportId = currentSaveState?.profile?.passportId || 'SHK-0000';
        accountStrip.innerHTML = `
          <div class="launch-account-pill">
            <span class="launch-pill-icon">🏷️🦈</span>
            <div class="launch-account-text">
              <span class="launch-user-name">New Island Explorer · Passport ${passportId}</span>
              <span class="launch-user-sub">Create your Blåhaj to awaken in the <strong>IKEA Spawning Pits</strong> · Russell &amp; Helen: Sign In to unlock the Sacred Four</span>
            </div>
            <button type="button" class="launch-btn-subtle" id="launch-btn-founder-signin" title="Russell & Helen Founder Sign-In">Founder Sign-In 👑</button>
          </div>
        `;
        document.getElementById('launch-btn-founder-signin')?.addEventListener('click', openGoogleConnectModal);
      }
    }

    // 3. Slot Stats
    if (slotBadge) {
      slotBadge.textContent = `● Roster Slot ${activeSlot}`;
    }
    if (slotStats && curSlotSummary) {
      const quests = curSlotSummary.questsCount || 0;
      const timeStr = curSlotSummary.lastSaved ? formatTimeAgo(new Date(curSlotSummary.lastSaved)) : 'Ready';
      slotStats.textContent = `${quests} Quests Completed · Last Saved ${timeStr}`;
    }

    // 4. Primary Embark Button Text (Reflects Selected Character!)
    if (embarkText) {
      if (activePick === 'custom') {
        if (!cs.detagged) {
          embarkText.textContent = `✂️ CREATE YOUR BLÅHAJ & ENTER SPAWNING PITS`;
          if (embarkSub) embarkSub.textContent = `Lv. 1 Probationer (0°=0□) · Choose Guiding Mentor & 3 Starter Arts · Spawns in Wire Bin #303 🦈✨`;
        } else {
          const customRec = roster.custom || {};
          const customLv = customRec.level || 1;
          const mCur = window.BlahajProgression?.getMentorCurrent(customRec.mentorId || cs.mentorId || 'hermes');
          embarkText.textContent = `🦈 ENTER WORLD AS ${cs.name.toUpperCase()}`;
          if (embarkSub) embarkSub.textContent = `Lv.${customLv} · ${mCur ? `Mentor: ${mCur.mentorName} (${mCur.shortLabel})` : (cs.title || 'Custom Blåhaj')} · Personal Bag & Skills`;
        }
      } else {
        const sCfg = window.BLAHAJ_LORE?.sharks?.[activePick];
        const fRec = roster[activePick] || {};
        const fLv = fRec.level || 7;
        const deg = window.BlahajProgression?.getDegreeInfo(fLv);
        const sName = sCfg ? sCfg.name.toUpperCase() : activePick.toUpperCase();
        const sTitle = sCfg ? sCfg.title : 'Sacred Founder of Blåhaj Island';
        embarkText.textContent = `🦈 ENTER WORLD AS ${sName}`;
        if (embarkSub) embarkSub.textContent = `Lv.${fLv} (${deg ? deg.cipher : '5°=6□'}) · ${sTitle} · ${sCfg ? sCfg.name : activePick}’s Personal Bag & 7 Specialty Arts`;
      }
    }

    // 5. Secondary Action Row
    if (authRow) {
      authRow.innerHTML = `
        <button type="button" class="btn-launch-quick" style="flex: 1;" id="launch-btn-open-creator">
          ✂️ ${cs.detagged ? `Customize ${escapeHtml(cs.name)}` : 'Create New Custom Shark'}
        </button>
        <button type="button" class="btn-launch-quick" style="flex: 1;" id="launch-btn-manage-passport">
          📁 Save Slots &amp; Backup
        </button>
        <button type="button" class="btn-launch-quick" style="flex: 1;" id="launch-btn-google-account">
          🔑 ${gAcc ? 'Switch Account' : 'Russell / Helen Sign-In'}
        </button>
      `;
      document.getElementById('launch-btn-open-creator')?.addEventListener('click', openRiteOfDetaggingModal);
      document.getElementById('launch-btn-manage-passport')?.addEventListener('click', () => {
        if (window.BlahajGame?.openSettingsModal) {
          window.BlahajGame.openSettingsModal();
          const tab = document.querySelector('#settings-tabs button[data-tab="passport"]');
          if (tab) tab.click();
        }
      });
      document.getElementById('launch-btn-google-account')?.addEventListener('click', openGoogleConnectModal);
    }

    // Attach slot change handler
    const slotChangeBtn = document.getElementById('launch-btn-change-slot');
    if (slotChangeBtn && !slotChangeBtn.dataset.bound) {
      slotChangeBtn.dataset.bound = 'true';
      slotChangeBtn.addEventListener('click', () => {
        if (window.BlahajGame?.openSettingsModal) {
          window.BlahajGame.openSettingsModal();
          const tab = document.querySelector('#settings-tabs button[data-tab="passport"]');
          if (tab) tab.click();
        }
      });
    }
  }

  // ---------------------------------------------------------------------------
  // 11. FOUNDER ARCHODECT PRIVILEGE & RECOVERABLE PASSCODE SYSTEM
  //     Reserved for Creators Russell (russellkirkby@gmail.com) & Helen (helennhieu@gmail.com)
  // ---------------------------------------------------------------------------
  const FOUNDER_EMAILS = [
    'russellkirkby@gmail.com',
    'helennhieu@gmail.com',
    'russell@blahaj-island.org',
    'helen@blahaj-island.org'
  ];
  const FOUNDER_PASSCODE_NORMALIZED = 'DIFFERENTSHORESSAMEOCEAN';
  const FOUNDER_STORAGE_KEY = 'blahaj_founder_archodect_unlocked';

  function isFounderArchodect() {
    if (localStorage.getItem(FOUNDER_STORAGE_KEY) === 'true') return true;
    if (currentSaveState?.profile?.founderPasscodeVerified === true) return true;
    const email = (currentSaveState?.profile?.googleAccount?.email || '').trim().toLowerCase();
    if (email && FOUNDER_EMAILS.includes(email)) return true;
    return false;
  }

  function verifyFounderPasscode(rawCode) {
    if (!rawCode || typeof rawCode !== 'string') return false;
    const normalized = rawCode.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (normalized === FOUNDER_PASSCODE_NORMALIZED || normalized === 'SHARKITTYFOREVER') {
      if (!currentSaveState) currentSaveState = createDefaultSaveState(activeSlot);
      currentSaveState.profile.founderPasscodeVerified = true;
      try {
        localStorage.setItem(FOUNDER_STORAGE_KEY, 'true');
      } catch (e) {}
      saveNow();
      syncFounderAndCustomSharkUI();
      if (window.CozyAudio && window.CozyAudio.portalChime) window.CozyAudio.portalChime();
      if (window.showToast) {
        window.showToast(
          '👑 FOUNDER ARCHODECT UNLOCKED!',
          'Welcome home, Russell & Helen! The Sacred Four (Hermes, Solomon, Hiram & Nimue) and Archodect Powers are unlocked!'
        );
      }
      return true;
    }
    return false;
  }

  function lockFounderArchodect() {
    if (currentSaveState?.profile) {
      currentSaveState.profile.founderPasscodeVerified = false;
      if (currentSaveState.profile.googleAccount) {
        const em = (currentSaveState.profile.googleAccount.email || '').toLowerCase();
        if (FOUNDER_EMAILS.includes(em)) {
          currentSaveState.profile.googleAccount = null;
        }
      }
    }
    try {
      localStorage.removeItem(FOUNDER_STORAGE_KEY);
    } catch (e) {}
    saveNow();
    syncFounderAndCustomSharkUI();
    if (window.BlahajGame && typeof window.BlahajGame.spawnPlayerShark === 'function') {
      window.BlahajGame.spawnPlayerShark('custom');
    }
    if (window.showToast) {
      window.showToast('NEW PLAYER PILGRIM MODE ✂️🦈', 'Switched to Custom Detagged Shark mode. The Sacred Four now stand as Revered NPCs!');
    }
  }

  // ---------------------------------------------------------------------------
  // 12. CUSTOM SHARK & "THE RITE OF DETAGGING" (ORDER OF THE SACRED SCISSORS)
  // ---------------------------------------------------------------------------
  function ensureCustomSharkDefaults() {
    if (!currentSaveState) currentSaveState = createDefaultSaveState(activeSlot);
    if (!currentSaveState.profile) currentSaveState.profile = {};
    if (!currentSaveState.profile.customShark) {
      currentSaveState.profile.customShark = {
        name: 'Untagged Blåhaj #303',
        title: 'Initiate of the Sacred Scissors',
        bodyColor: 0x2578c4,
        bellyColor: 0xf7f2e6,
        scarfColor: 0xd97706,
        plumpness: 1.05,
        keepsake: 'flatpack_hat',
        mentorId: 'hermes',
        starterSkills: ['poky_fin_strike', 'single_fin_lunge', 'snoot_boop'],
        detagged: false,
        detaggedAt: null,
        tagSerial: 'ART. 303.735.88'
      };
    } else {
      const csRef = currentSaveState.profile.customShark;
      if (!csRef.mentorId) csRef.mentorId = 'hermes';
      if (!Array.isArray(csRef.starterSkills) || csRef.starterSkills.length === 0) {
        const defCur = window.BlahajProgression?.getMentorCurrent(csRef.mentorId);
        csRef.starterSkills = defCur ? [...defCur.recommendedStarters] : ['poky_fin_strike', 'single_fin_lunge', 'snoot_boop'];
      }
    }
    if (!Array.isArray(currentSaveState.profile.bookOfNamedSharks)) {
      currentSaveState.profile.bookOfNamedSharks = [
        { name: 'Hermes', title: 'The Mangy One · The Weary Guide', date: 'Founding Era' },
        { name: 'Solomon', title: 'The Star Shark · Keeper of the Brew', date: 'Founding Era' },
        { name: 'Hiram', title: 'The Builder · Master of Deep Stone', date: 'Founding Era' },
        { name: 'Nimue', title: 'An Angel · The Plump One', date: 'Founding Era' }
      ];
    }
    syncCustomSharkToLore();
    return currentSaveState.profile.customShark;
  }

  function syncCustomSharkToLore() {
    if (!window.BLAHAJ_LORE || !window.BLAHAJ_LORE.sharks || !window.BLAHAJ_LORE.sharks.custom) return;
    const cs = currentSaveState?.profile?.customShark;
    if (!cs) return;
    const target = window.BLAHAJ_LORE.sharks.custom;
    target.name = cs.name || (cs.detagged ? 'Finley' : 'Untagged Blåhaj #303');
    target.title = cs.title || (cs.detagged ? 'Named Shark of Blåhaj Island' : 'Fresh from the Spawning Pits of Erf');
    target.bodyColor = typeof cs.bodyColor === 'number' ? cs.bodyColor : 0x2578c4;
    target.bellyColor = typeof cs.bellyColor === 'number' ? cs.bellyColor : 0xf7f2e6;
    target.scarfColor = typeof cs.scarfColor === 'number' ? cs.scarfColor : 0xd97706;
    target.plumpness = typeof cs.plumpness === 'number' ? cs.plumpness : 1.05;
    target.keepsake = cs.keepsake || 'flatpack_hat';
    target.detagged = !!cs.detagged;
    target.tagSerial = cs.tagSerial || 'ART. 303.735.88';
    target.quote = cs.detagged
      ? `“I am ${target.name}—liberated by the Sacred Scissors from the Spawning Pits of Erf!”`
      : '“Still wearing factory barcode tag ART. 303.735.88 from the IKEA Spawning Pits on Erf…”';
  }

  function getCustomSharkConfig() {
    return ensureCustomSharkDefaults();
  }

  function saveCustomSharkConfig(partialCfg = {}) {
    const cs = ensureCustomSharkDefaults();
    Object.assign(cs, partialCfg);
    syncCustomSharkToLore();
    saveNow();
    syncFounderAndCustomSharkUI();

    if (window.BlahajGame) {
      const player = window.BlahajGame.getPlayer ? window.BlahajGame.getPlayer() : null;
      if (player && player.sharkId === 'custom' && typeof window.BlahajGame.spawnPlayerShark === 'function') {
        window.BlahajGame.spawnPlayerShark('custom');
      }
    }
    return cs;
  }

  function completeRiteOfDetagging(customCfg = {}) {
    const cs = ensureCustomSharkDefaults();
    Object.assign(cs, customCfg);
    if (!cs.name || cs.name.trim() === '' || cs.name === 'Untagged Blåhaj #303') {
      cs.name = 'Finley';
    } else {
      cs.name = cs.name.trim();
    }
    if (!cs.title || cs.title === 'Fresh from the Spawning Pits of Erf') {
      cs.title = 'Initiate of the Sacred Scissors';
    }
    cs.detagged = true;
    cs.detaggedAt = new Date().toISOString();

    // Inscribe into the Book of Newly Named Sharks
    const book = currentSaveState.profile.bookOfNamedSharks;
    const existingIdx = book.findIndex((entry) => entry.isCustomPlayer);
    const entryObj = {
      name: cs.name,
      title: cs.title,
      date: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
      tagSerial: cs.tagSerial || 'ART. 303.735.88',
      isCustomPlayer: true
    };
    if (existingIdx >= 0) {
      book[existingIdx] = entryObj;
    } else {
      book.push(entryObj);
    }

    currentSaveState.profile.displayName = cs.name;
    syncCustomSharkToLore();

    // Sync Custom Shark's Initiatic Progression Record (Mentor Current & Chosen Starter Arts)
    const roster = ensureCharacterRoster();
    const progApi = window.BlahajProgression;
    if (roster.custom && progApi) {
      const chosenMentor = cs.mentorId || 'hermes';
      const chosenStarters = (Array.isArray(cs.starterSkills) && cs.starterSkills.length >= 1)
        ? cs.starterSkills.slice(0, 3)
        : [...progApi.getMentorCurrent(chosenMentor).recommendedStarters];
      cs.mentorId = chosenMentor;
      cs.starterSkills = chosenStarters;

      // Apply fresh Level 1 starter loadout if newly created or still at Level 1 Probationer
      if ((roster.custom.level || 1) <= 1) {
        const freshProg = progApi.buildDefaultProgressionForShark('custom', {
          mentorId: chosenMentor,
          starterSkills: chosenStarters
        });
        roster.custom.level = 1;
        roster.custom.mentorId = chosenMentor;
        roster.custom.mentorRep = { ...freshProg.mentorRep };
        roster.custom.learnedAbilities = [...freshProg.learnedAbilities];
        roster.custom.actionBar = { ...freshProg.actionBar };
      }
      persistRosterToStorage();
      if (window.BlahajMMO && typeof window.BlahajMMO.syncSharkFromProgression === 'function') {
        window.BlahajMMO.syncSharkFromProgression('custom', roster.custom);
      }
    }

    // Grant Retired Spawning-Pit Tag, Apprentice Hex Key & Ingvar's Measuring Tape into player satchel
    const game = window.BlahajGame;
    if (game && typeof game.getPlayerInventory === 'function') {
      const inv = game.getPlayerInventory();
      if (inv && typeof inv.addItem === 'function') {
        if (!inv.hasItem('retired_tag')) inv.addItem('retired_tag', 1);
        if (!inv.hasItem('hex_key')) inv.addItem('hex_key', 1);
        if (!inv.hasItem('ingvar_tape')) inv.addItem('ingvar_tape', 1);
        if (!inv.hasItem('sacred_scissors')) inv.addItem('sacred_scissors', 1);
      }
    }

    saveNow();
    syncFounderAndCustomSharkUI();
    renderRiteOfDetaggingModalState();

    if (game && typeof game.spawnPlayerShark === 'function') {
      game.spawnPlayerShark('custom');
      if (typeof game.renderCharacterSheet === 'function') {
        const csModal = document.getElementById('character-sheet-modal');
        if (csModal && !csModal.classList.contains('hidden')) {
          game.renderCharacterSheet('custom');
        }
      }
    }
    if (window.CozyAudio && window.CozyAudio.portalChime) {
      window.CozyAudio.portalChime();
    }
    if (window.showToast) {
      window.showToast(
        `✂️ RITE OF DETAGGING COMPLETE: WELCOME, ${cs.name.toUpperCase()}!`,
        `A Tag Removed · A Name Received · A Shark Reborn! Retired Barcode Tag (🏷️) added to your satchel!`
      );
    }
    return cs;
  }

  function returnSharkToSpawningPitsForRebirth(sendInto3DBin = false) {
    ensureCustomSharkDefaults();
    const cs = currentSaveState.profile.customShark;
    const prevName = (cs && cs.name && cs.name !== 'Untagged Blåhaj #303') ? cs.name : 'Little Blåhaj';

    // Gently reset custom shark to a fresh, newly-fluffed Spawning-Pit Blåhaj
    currentSaveState.profile.customShark = {
      name: 'Untagged Blåhaj #303',
      title: 'Initiate of the Sacred Scissors',
      bodyColor: 0x2578c4,
      bellyColor: 0xf7f2e6,
      scarfColor: 0xd97706,
      plumpness: 1.05,
      keepsake: 'tag_unclipped',
      mentorId: 'hermes',
      starterSkills: ['poky_fin_strike', 'single_fin_lunge', 'snoot_boop'],
      detagged: false,
      detaggedAt: null,
      tagSerial: 'ART. 303.735.88'
    };

    // Reset Custom Shark's progression back to Level 1 Probationer on Rebirth
    const roster = ensureCharacterRoster();
    if (roster.custom && window.BlahajProgression) {
      const freshProg = window.BlahajProgression.buildDefaultProgressionForShark('custom', {
        mentorId: 'hermes',
        starterSkills: ['poky_fin_strike', 'single_fin_lunge', 'snoot_boop']
      });
      Object.assign(roster.custom, freshProg, {
        inventorySlots: buildStarterSlotsForShark('custom'),
        heldItemId: null
      });
      persistRosterToStorage();
      if (window.BlahajMMO && typeof window.BlahajMMO.syncSharkFromProgression === 'function') {
        window.BlahajMMO.syncSharkFromProgression('custom', roster.custom);
      }
    }

    // Clear the active custom-player inscription in the Book of Newly Named Sharks so their reborn name can be freshly written
    if (Array.isArray(currentSaveState.profile.bookOfNamedSharks)) {
      currentSaveState.profile.bookOfNamedSharks = currentSaveState.profile.bookOfNamedSharks.filter(
        (entry) => !entry.isCustomPlayer
      );
    }

    // Reset origin escape flag so they can experience the Spawning Pits awakening afresh
    localStorage.removeItem('blahaj_escaped_spawning_pits_v1');

    syncCustomSharkToLore();
    saveNow();
    syncFounderAndCustomSharkUI();
    renderRiteOfDetaggingModalState();

    const nameInput = document.getElementById('detag-shark-name');
    if (nameInput) nameInput.value = 'Finley';

    const g = window.BlahajGame;
    if (g && typeof g.spawnPlayerShark === 'function') {
      g.spawnPlayerShark('custom');
    }
    if (window.CozyAudio && window.CozyAudio.portalChime) {
      window.CozyAudio.portalChime();
    }
    if (window.showToast) {
      window.showToast(
        `🧸💤 ${prevName.toUpperCase()} TUCKED COZILY BACK INTO WIRE BIN #303!`,
        `Re-tied with a soft silk barcode ribbon, fluffed with warm chamomile tea, and ready to be reborn!`
      );
    }

    if (sendInto3DBin) {
      closeRiteOfDetaggingModal();
      if (g && typeof g.embarkIntoGame === 'function') {
        g.embarkIntoGame();
      }
      if (g && typeof g.enterSpawningPits === 'function') {
        setTimeout(() => g.enterSpawningPits(true), 220);
      }
    }
    return currentSaveState.profile.customShark;
  }

  function openRiteOfDetaggingModal() {
    ensureCustomSharkDefaults();
    renderRiteOfDetaggingModalState();
    const modal = document.getElementById('modal-rite-of-detagging');
    if (modal) {
      modal.classList.remove('hidden');
    }
  }

  function closeRiteOfDetaggingModal() {
    const modal = document.getElementById('modal-rite-of-detagging');
    if (modal) {
      modal.classList.add('hidden');
    }
  }

  function renderRiteOfDetaggingModalState() {
    const cs = ensureCustomSharkDefaults();
    const nameInput = document.getElementById('detag-shark-name');
    const titleSelect = document.getElementById('detag-shark-title');
    const plumpSlider = document.getElementById('detag-plumpness-slider');
    const plumpVal = document.getElementById('detag-plumpness-val');
    const keepsakeSelect = document.getElementById('detag-keepsake-select');
    const tagCard = document.getElementById('detag-barcode-card');
    const tagStatusBadge = document.getElementById('detag-tag-status-badge');
    const btnSnip = document.getElementById('btn-detag-snip-now');
    const bookList = document.getElementById('detag-book-of-names-list');

    if (nameInput && document.activeElement !== nameInput) {
      nameInput.value = cs.name === 'Untagged Blåhaj #303' ? 'Finley' : cs.name;
    }
    if (titleSelect) {
      titleSelect.value = cs.title || 'Initiate of the Sacred Scissors';
    }
    if (plumpSlider) {
      plumpSlider.value = Math.round((cs.plumpness || 1.05) * 100);
    }
    if (plumpVal) {
      plumpVal.textContent = `${Math.round((cs.plumpness || 1.05) * 100)}% Plush Chonk`;
    }
    if (keepsakeSelect) {
      keepsakeSelect.value = cs.keepsake || 'flatpack_hat';
    }

    // Highlight active color swatches
    document.querySelectorAll('.detag-swatch-body').forEach((btn) => {
      btn.classList.toggle('active', parseInt(btn.dataset.color, 16) === cs.bodyColor);
    });
    document.querySelectorAll('.detag-swatch-belly').forEach((btn) => {
      btn.classList.toggle('active', parseInt(btn.dataset.color, 16) === cs.bellyColor);
    });
    document.querySelectorAll('.detag-swatch-scarf').forEach((btn) => {
      btn.classList.toggle('active', parseInt(btn.dataset.color, 16) === cs.scarfColor);
    });

    if (tagCard) {
      tagCard.classList.toggle('snipped', !!cs.detagged);
    }
    if (tagStatusBadge) {
      tagStatusBadge.textContent = cs.detagged
        ? `✂️ SNIPPED & LIBERATED · INSCRIBED AS "${cs.name.toUpperCase()}"`
        : '🏷️ FACTORY TAG ATTACHED · AWAITING SACRED SCISSORS';
      tagStatusBadge.className = `detag-status-pill ${cs.detagged ? 'snipped' : 'unclipped'}`;
    }
    if (btnSnip) {
      btnSnip.innerHTML = cs.detagged
        ? `✨ Update True Name &amp; Plush Form (${escapeHtml(cs.name)})`
        : `✂️ Snip Factory Tag &amp; Inscribe True Name!`;
    }

    // Render Guiding Mentor Current cards & Starter Skill Picker (v19.0)
    const progApi = window.BlahajProgression;
    const mentorGrid = document.getElementById('detag-mentor-grid');
    const mentorSummary = document.getElementById('detag-mentor-summary');
    const starterGrid = document.getElementById('detag-starter-skills-grid');
    const starterCountPill = document.getElementById('detag-starter-count-pill');
    const customRec = ensureCharacterRoster().custom || { level: 1 };
    const isHigherDegree = (customRec.level || 1) > 1;

    if (progApi && mentorGrid) {
      const activeMentorId = cs.mentorId || 'hermes';
      const activeCur = progApi.getMentorCurrent(activeMentorId);
      mentorGrid.innerHTML = progApi.getAllMentorCurrents().map((mc) => `
        <button type="button" class="detag-mentor-card ${mc.id === activeMentorId ? 'active' : ''}" data-mentor-pick="${mc.id}" ${isHigherDegree && mc.id !== activeMentorId ? 'title="Already ascended past Lv.1 — Mentor Re-Dedication unlocked via Mentor NPC Rite"' : ''}>
          <div class="detag-mentor-card-head">
            <span>${mc.icon}</span>
            <span>${escapeHtml(mc.mentorName)}</span>
          </div>
          <div class="detag-mentor-card-sub">${escapeHtml(mc.shortLabel)}</div>
        </button>
      `).join('');

      if (mentorSummary && activeCur) {
        mentorSummary.innerHTML = `
          <div><strong>${activeCur.icon} ${escapeHtml(activeCur.currentName)}</strong> · <span style="color:#fde68a;">${escapeHtml(activeCur.instrument)}</span></div>
          <div style="margin-top:3px;">${escapeHtml(activeCur.summary)}</div>
          <div style="margin-top:4px; font-style:italic; color:#93c5fd;">${escapeHtml(activeCur.maxim)}</div>
        `;
      }

      mentorGrid.querySelectorAll('[data-mentor-pick]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const picked = btn.dataset.mentorPick;
          if (isHigherDegree && picked !== cs.mentorId) {
            if (window.showToast) {
              window.showToast('🕯️ MENTOR OATH SWORN', 'Once past Lv.1, changing Currents requires performing a Rite of Re-Dedication with a Founder Mentor NPC!');
            }
            return;
          }
          const nextCur = progApi.getMentorCurrent(picked);
          cs.mentorId = picked;
          cs.starterSkills = [...nextCur.recommendedStarters];
          saveCustomSharkConfig({ mentorId: cs.mentorId, starterSkills: cs.starterSkills });
          if ((customRec.level || 1) <= 1) {
            const fresh = progApi.buildDefaultProgressionForShark('custom', {
              mentorId: cs.mentorId,
              starterSkills: cs.starterSkills
            });
            Object.assign(customRec, fresh);
            persistRosterToStorage();
            if (window.BlahajMMO && typeof window.BlahajMMO.syncSharkFromProgression === 'function') {
              window.BlahajMMO.syncSharkFromProgression('custom', customRec);
            }
          }
          if (window.CozyAudio && window.CozyAudio.pocketWatchClick) window.CozyAudio.pocketWatchClick();
          renderRiteOfDetaggingModalState();
          updateLaunchGatewayUI();
        });
      });
    }

    if (progApi && starterGrid) {
      const mmoAbs = window.BlahajMMO?.ABILITIES || {};
      const selectedStarters = Array.isArray(cs.starterSkills) ? cs.starterSkills : ['poky_fin_strike', 'single_fin_lunge', 'snoot_boop'];
      if (starterCountPill) {
        starterCountPill.textContent = isHigherDegree
          ? `Lv.${customRec.level} · ${(customRec.learnedAbilities || []).length} Arts Known`
          : `${selectedStarters.length} / 3 Chosen`;
      }

      const starterPoolIds = Object.keys(progApi.SKILL_NODES).filter((abId) => progApi.SKILL_NODES[abId].sharedStarter && mmoAbs[abId]);
      starterGrid.innerHTML = starterPoolIds.map((abId) => {
        const ab = mmoAbs[abId];
        const node = progApi.getSkillNode(abId);
        const mCur = progApi.getMentorCurrent(node.mentorId);
        const isPicked = selectedStarters.includes(abId);
        return `
          <button type="button" class="detag-starter-chip ${isPicked ? 'selected' : ''}" data-starter-ab="${abId}" title="${escapeHtml(ab.desc)}">
            <span class="chip-icon">${ab.icon}</span>
            <span class="chip-text">
              <span class="chip-name">${isPicked ? '✓ ' : ''}${escapeHtml(ab.name)}</span>
              <span class="chip-sub">${mCur.icon} ${escapeHtml(mCur.mentorName)} · ${escapeHtml(ab.shortSub)}</span>
            </span>
          </button>
        `;
      }).join('');

      starterGrid.querySelectorAll('[data-starter-ab]').forEach((chip) => {
        chip.addEventListener('click', () => {
          if (isHigherDegree) {
            if (window.showToast) {
              window.showToast('📖 OPEN SPELLBOOK [I]', 'Starter arts are locked in after ascending past Lv.1—study new arts in your Spellbook [I]!');
            }
            return;
          }
          const abId = chip.dataset.starterAb;
          let nextList = [...selectedStarters];
          if (nextList.includes(abId)) {
            if (nextList.length <= 2) {
              if (window.showToast) {
                window.showToast('⚡ CHOOSE 2 OR 3 STARTER ARTS', 'Select at least 2 starter arts so your new Blåhaj is ready for the Spawning Pits!');
              }
              return;
            }
            nextList = nextList.filter((x) => x !== abId);
          } else {
            if (nextList.length >= 3) {
              // Smoothly swap the oldest non-locked choice (keep poky_fin_strike if first, replace last)
              nextList.pop();
            }
            nextList.push(abId);
          }
          cs.starterSkills = nextList;
          saveCustomSharkConfig({ starterSkills: nextList });
          const fresh = progApi.buildDefaultProgressionForShark('custom', {
            mentorId: cs.mentorId || 'hermes',
            starterSkills: nextList
          });
          Object.assign(customRec, fresh);
          persistRosterToStorage();
          if (window.BlahajMMO && typeof window.BlahajMMO.syncSharkFromProgression === 'function') {
            window.BlahajMMO.syncSharkFromProgression('custom', customRec);
          }
          if (window.CozyAudio && window.CozyAudio.pocketWatchClick) window.CozyAudio.pocketWatchClick();
          renderRiteOfDetaggingModalState();
          updateLaunchGatewayUI();
        });
      });
    }

    // Render Book of Newly Named Sharks
    if (bookList && Array.isArray(currentSaveState?.profile?.bookOfNamedSharks)) {
      bookList.innerHTML = currentSaveState.profile.bookOfNamedSharks
        .map(
          (entry) => `
          <div class="book-name-entry ${entry.isCustomPlayer ? 'custom-highlight' : ''}">
            <span class="book-shark-icon">${entry.isCustomPlayer ? '✂️🦈' : '👑🦈'}</span>
            <div class="book-shark-info">
              <strong>${escapeHtml(entry.name)}</strong>
              <span>${escapeHtml(entry.title)}</span>
            </div>
            <span class="book-shark-date">${escapeHtml(entry.date || 'Inscribed')}</span>
          </div>
        `
        )
        .join('');
    }
  }

  function syncFounderAndCustomSharkUI() {
    ensureCustomSharkDefaults();
    const isFounder = isFounderArchodect();
    const cs = currentSaveState.profile.customShark;

    // 1. Update Action Bar Slot 5 (Custom Shark) & Slots 1-4 (Sacred Four Founder Lock)
    const slot5 = document.getElementById('slot-5');
    if (slot5) {
      const nameEl = slot5.querySelector('.slot-name');
      const powerEl = slot5.querySelector('.slot-power');
      if (nameEl) nameEl.textContent = cs.detagged ? cs.name : 'New Shark';
      if (powerEl) powerEl.textContent = cs.detagged ? 'Detagged [5]' : 'Detag [5]';
    }

    ['1', '2', '3', '4'].forEach((num) => {
      const btn = document.getElementById(`slot-${num}`);
      if (btn) {
        btn.classList.toggle('founder-locked', !isFounder);
        let badge = btn.querySelector('.founder-lock-badge');
        if (!isFounder) {
          if (!badge) {
            badge = document.createElement('span');
            badge.className = 'founder-lock-badge';
            badge.title = 'Reserved for Founders Russell & Helen (NPC in World)';
            badge.textContent = '👑';
            btn.appendChild(badge);
          }
        } else if (badge) {
          badge.remove();
        }
      }
    });

    // 2. Update Character Sheet 5th Tab
    const csTabCustom = document.querySelector('.cs-tab[data-shark="custom"]');
    if (csTabCustom) {
      const tName = csTabCustom.querySelector('.cs-tab-name');
      const tSub = csTabCustom.querySelector('.cs-tab-sub');
      if (tName) tName.textContent = cs.detagged ? cs.name : 'Custom Shark';
      if (tSub) tSub.textContent = cs.detagged ? 'Detagged Builder' : 'Rite of Detagging';
    }

    // 3. Update Founder Archodect Status Banner in Google Modal, Passport & HUD
    const founderBadges = document.querySelectorAll('.founder-archodect-status-text');
    founderBadges.forEach((el) => {
      if (isFounder) {
        el.innerHTML = '👑 <strong>FOUNDER ARCHODECT ACTIVE</strong> (Russell &amp; Helen Creator Privileges Unlocked)';
        el.classList.add('unlocked');
      } else {
        el.innerHTML = '🔒 <strong>Pilgrim Explorer Mode</strong> — Sacred Four are Revered NPCs (Enter Founder Key or Russell/Helen Email to unlock)';
        el.classList.remove('unlocked');
      }
    });

    const hudArchodectPill = document.getElementById('hud-archodect-pill');
    if (hudArchodectPill) {
      hudArchodectPill.classList.toggle('hidden', !isFounder);
    }
  }

  function setupModalEventListeners() {
    document.getElementById('close-google-connect-modal')?.addEventListener('click', closeGoogleConnectModal);
    document.getElementById('btn-google-modal-guest')?.addEventListener('click', closeGoogleConnectModal);

    document.getElementById('btn-quick-connect-submit')?.addEventListener('click', () => {
      const nameInput = document.getElementById('quick-connect-name');
      const emailInput = document.getElementById('quick-connect-email');
      const name = nameInput?.value.trim() || 'Russell Kirkby';
      const email = emailInput?.value.trim() || 'russellkirkby@gmail.com';
      simulateGoogleSignIn(email, name);
      syncFounderAndCustomSharkUI();
      closeGoogleConnectModal();
      updateLaunchGatewayUI();
    });

    // Quick-preset buttons for Russell, Helen, or New Guest Explorer
    document.getElementById('btn-preset-russell')?.addEventListener('click', () => {
      const nameInput = document.getElementById('quick-connect-name');
      const emailInput = document.getElementById('quick-connect-email');
      if (nameInput) nameInput.value = 'Russell Kirkby';
      if (emailInput) emailInput.value = 'russellkirkby@gmail.com';
      simulateGoogleSignIn('russellkirkby@gmail.com', 'Russell Kirkby');
      syncFounderAndCustomSharkUI();
      closeGoogleConnectModal();
      updateLaunchGatewayUI();
    });

    document.getElementById('btn-preset-helen')?.addEventListener('click', () => {
      const nameInput = document.getElementById('quick-connect-name');
      const emailInput = document.getElementById('quick-connect-email');
      if (nameInput) nameInput.value = 'Helen Nhieu';
      if (emailInput) emailInput.value = 'helennhieu@gmail.com';
      simulateGoogleSignIn('helennhieu@gmail.com', 'Helen Nhieu');
      syncFounderAndCustomSharkUI();
      closeGoogleConnectModal();
      updateLaunchGatewayUI();
    });

    // Founder Passcode Verification Buttons
    const handlePasscodeSubmit = (inputId, feedbackId) => {
      const input = document.getElementById(inputId);
      const fb = document.getElementById(feedbackId);
      const val = input ? input.value.trim() : '';
      if (verifyFounderPasscode(val)) {
        if (fb) {
          fb.textContent = '👑 Founder Archodect Unlocked! Hermes, Solomon, Hiram & Nimue are now playable!';
          fb.style.color = '#fde047';
        }
        updatePassportUI();
        updateLaunchGatewayUI();
      } else {
        if (fb) {
          fb.textContent = '❌ Passcode not recognized. Hint: DIFFERENT-SHORES-SAME-OCEAN';
          fb.style.color = '#fb7185';
        }
      }
    };

    document.getElementById('btn-verify-founder-passcode')?.addEventListener('click', () => {
      handlePasscodeSubmit('input-founder-passcode', 'founder-passcode-feedback');
    });
    document.getElementById('btn-passport-verify-founder')?.addEventListener('click', () => {
      handlePasscodeSubmit('input-passport-founder-passcode', 'passport-founder-feedback');
    });

    // Rite of Detagging Modal Listeners
    document.getElementById('close-rite-of-detagging')?.addEventListener('click', closeRiteOfDetaggingModal);
    document.getElementById('btn-open-detagging-gateway')?.addEventListener('click', openRiteOfDetaggingModal);
    document.getElementById('btn-open-detagging-charsheet')?.addEventListener('click', openRiteOfDetaggingModal);
    document.getElementById('btn-open-detagging-passport')?.addEventListener('click', openRiteOfDetaggingModal);

    document.querySelectorAll('.detag-swatch-body').forEach((btn) => {
      btn.addEventListener('click', () => {
        const col = parseInt(btn.dataset.color, 16);
        saveCustomSharkConfig({ bodyColor: col });
        renderRiteOfDetaggingModalState();
      });
    });

    document.querySelectorAll('.detag-swatch-belly').forEach((btn) => {
      btn.addEventListener('click', () => {
        const col = parseInt(btn.dataset.color, 16);
        saveCustomSharkConfig({ bellyColor: col });
        renderRiteOfDetaggingModalState();
      });
    });

    document.querySelectorAll('.detag-swatch-scarf').forEach((btn) => {
      btn.addEventListener('click', () => {
        const col = parseInt(btn.dataset.color, 16);
        saveCustomSharkConfig({ scarfColor: col });
        renderRiteOfDetaggingModalState();
      });
    });

    document.getElementById('detag-plumpness-slider')?.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10) / 100;
      const lbl = document.getElementById('detag-plumpness-val');
      if (lbl) lbl.textContent = `${Math.round(val * 100)}% Plush Chonk`;
      saveCustomSharkConfig({ plumpness: val });
    });

    document.getElementById('detag-keepsake-select')?.addEventListener('change', (e) => {
      saveCustomSharkConfig({ keepsake: e.target.value });
      renderRiteOfDetaggingModalState();
    });

    document.getElementById('btn-detag-snip-now')?.addEventListener('click', () => {
      const nameVal = document.getElementById('detag-shark-name')?.value.trim() || 'Finley';
      const titleVal = document.getElementById('detag-shark-title')?.value || 'Initiate of the Sacred Scissors';
      const keepsakeVal = document.getElementById('detag-keepsake-select')?.value || 'flatpack_hat';
      const plumpVal = (parseInt(document.getElementById('detag-plumpness-slider')?.value || '105', 10)) / 100;
      completeRiteOfDetagging({
        name: nameVal,
        title: titleVal,
        keepsake: keepsakeVal,
        plumpness: plumpVal
      });
    });

    document.getElementById('btn-detag-gentle-reset')?.addEventListener('click', () => {
      returnSharkToSpawningPitsForRebirth(false);
    });

    document.getElementById('btn-detag-return-spawning-bin')?.addEventListener('click', () => {
      returnSharkToSpawningPitsForRebirth(true);
    });

    document.getElementById('detag-shark-name')?.addEventListener('change', (e) => {
      const val = e.target.value.trim();
      if (val) {
        saveCustomSharkConfig({ name: val });
        updateLaunchGatewayUI();
      }
    });

    document.getElementById('btn-detag-enter-island')?.addEventListener('click', () => {
      const cs = ensureCustomSharkDefaults();
      const nameVal = document.getElementById('detag-shark-name')?.value.trim();
      const titleVal = document.getElementById('detag-shark-title')?.value || cs.title || 'Initiate of the Sacred Scissors';
      if (!cs.detagged) {
        completeRiteOfDetagging({ name: nameVal || 'Finley', title: titleVal });
      } else if (nameVal && (nameVal !== cs.name || titleVal !== cs.title)) {
        completeRiteOfDetagging({ name: nameVal, title: titleVal });
      }
      closeRiteOfDetaggingModal();
      const g = window.BlahajGame;
      if (g && typeof g.embarkIntoGame === 'function') {
        g.embarkIntoGame();
      }
      if (g && typeof g.enterSpawningPits === 'function' && g.getZone && g.getZone() !== 'spawning_pits') {
        if (localStorage.getItem('blahaj_escaped_spawning_pits_v1') !== 'true') {
          setTimeout(() => g.enterSpawningPits(true), 250);
        }
      }
    });

    document.getElementById('btn-save-google-client-id')?.addEventListener('click', () => {
      const input = document.getElementById('input-google-client-id');
      const val = input?.value.trim();
      if (val) {
        setGoogleClientId(val);
        closeGoogleConnectModal();
        if (window.showToast) {
          window.showToast('GOOGLE CLIENT ID SAVED! 🔑', 'Saved OAuth 2.0 Web Client ID. Real Google Sign-In ready.');
        }
      } else {
        localStorage.removeItem(GOOGLE_CLIENT_ID_KEY);
        if (window.showToast) {
          window.showToast('GOOGLE CLIENT RESET', 'Reset to local simulated / guest authentication.');
        }
      }
      updatePassportUI();
      updateLaunchGatewayUI();
    });

    syncFounderAndCustomSharkUI();
  }

  // Hook into updatePassportUI to keep launch gateway synchronized

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
    updateLaunchGatewayUI,
    openGoogleConnectModal,
    closeGoogleConnectModal,
    isFounderArchodect,
    verifyFounderPasscode,
    lockFounderArchodect,
    getCustomSharkConfig,
    saveCustomSharkConfig,
    completeRiteOfDetagging,
    returnSharkToSpawningPitsForRebirth,
    openRiteOfDetaggingModal,
    closeRiteOfDetaggingModal,
    syncFounderAndCustomSharkUI,
    getMyAccountDisplayName,
    ensureCharacterRoster,
    getCharacterProgressionRecord,
    updateCharacterProgressionRecord,
    captureActiveCharacterToRoster,
    applyCharacterFromRoster,
    handleIncomingRosterSync,
    updateRemoteCharacterLock,
    getActiveLockForShark,
    getSelectedLobbySharkId,
    selectLobbyShark,
    isInLobby: () => isInLobbyState,
    setInLobby: (val) => {
      isInLobbyState = !!val;
      if (isInLobbyState) updateLaunchGatewayUI();
    },
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
