// ============================================================================
// BLÅHAJ ISLAND — PERSISTENT SHARED WORLD REALM NETWORKING (PASS 84)
// Always-On Shared Realm ('SHONK-LOVE') between Russell (NZ) & Helen (LA)
// Features:
//  - Canonical Default Shared World ('SHONK-LOVE') so everyone lands together automatically
//  - Deterministic 6-Slot Realm Ring (slot-a .. slot-f) immune to ghost-tab lockouts
//  - Non-clobbering parallel connection pool (never drops in-flight NZ <-> LA TURN handshakes)
//  - Repeated SYN/ACK handshake retry on open DataChannels (eliminates listener race conditions)
//  - Cross-machine partner priority so accidental duplicate local tabs never block your partner
// ============================================================================

window.BlahajNetwork = (function () {
  const DEFAULT_REALM = 'SHONK-LOVE';
  const REALM_SLOTS = ['a', 'b', 'c', 'd', 'e', 'f'];

  let peer = null;
  let isRelayConnected = false;
  let hasLocalRelay = false;
  let mySlot = null; // 'a'..'f' or 'g' (overflow)
  let callbacks = {};
  let peerRetryTimer = null;
  let heartbeatInterval = null;
  let isCleaningUp = false;

  // All tracked DataConnections (both pending and verified)
  const allConns = new Set();
  // Outgoing pending connection attempts by slot: slot -> { conn, startedAt }
  const pendingSlotProbes = new Map();
  // Track which remote clientIds have already triggered callbacks.onConnect
  const notifiedPartners = new Set();
  // Primary active partner clientId (prefers cross-machine partner over local background tabs)
  let primaryPartnerClientId = null;

  // Unique client identity per browser tab (never reuse stale IDs across tabs)
  const clientId =
    'shonk-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now().toString(36);
  try {
    sessionStorage.setItem('blahaj_client_id', clientId);
  } catch (e) {}

  // Persistent machine identity per browser profile (distinguishes remote partner vs local duplicate tab)
  let machineId = null;
  try {
    machineId = localStorage.getItem('blahaj_machine_id');
    if (!machineId) {
      machineId = 'mach-' + Math.random().toString(36).substring(2, 10) + '-' + Date.now().toString(36);
      localStorage.setItem('blahaj_machine_id', machineId);
    }
  } catch (e) {
    machineId = 'mach-' + clientId;
  }

  function sanitizeCode(raw) {
    return (raw || DEFAULT_REALM)
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9-]/g, '') || DEFAULT_REALM;
  }

  function getInitialRoom() {
    // Only use a custom instance if explicitly requested in the current URL bar (?room=... or ?instance=...)
    try {
      const params = new URLSearchParams(window.location.search);
      const r = params.get('room') || params.get('instance');
      if (r) {
        const clean = sanitizeCode(r);
        return clean;
      }
    } catch (e) {}

    // Otherwise ALWAYS join the single Persistent Shared World ('SHONK-LOVE')!
    // Reset any stale private room codes from old sessions so Russell & Helen never drift apart.
    try {
      localStorage.setItem('blahaj_coop_room', DEFAULT_REALM);
    } catch (e) {}
    return DEFAULT_REALM;
  }

  let currentRoom = getInitialRoom();
  let latestPlayerState = null;
  let outgoingEvents = [];
  let relayPartnerId = null;

  // High-reliability global anycast STUN & TURN endpoints
  const PEER_CONFIG = {
    config: {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
        { urls: 'stun:stun.cloudflare.com:3478' },
        { urls: 'stun:global.stun.twilio.com:3478' },
        {
          urls: 'turn:openrelay.metered.ca:80',
          username: 'openrelayproject',
          credential: 'openrelayproject'
        },
        {
          urls: 'turn:openrelay.metered.ca:443',
          username: 'openrelayproject',
          credential: 'openrelayproject'
        },
        {
          urls: 'turn:openrelay.metered.ca:443?transport=tcp',
          username: 'openrelayproject',
          credential: 'openrelayproject'
        }
      ],
      iceCandidatePoolSize: 10
    }
  };

  function getSlotPeerId(room, slot) {
    return `blahaj-archipelago-v3-${sanitizeCode(room).toLowerCase()}-slot-${slot}`;
  }

  function getVerifiedConns() {
    const list = [];
    allConns.forEach((c) => {
      if (c && c.open && c._verified && c._remoteClientId && c._remoteClientId !== clientId) {
        list.push(c);
      }
    });
    return list;
  }

  function getUniquePartnersMap() {
    const map = new Map();
    const verified = getVerifiedConns();
    verified.forEach((c) => {
      const existing = map.get(c._remoteClientId);
      if (!existing || (c._lastPacketAt || 0) >= (existing._lastPacketAt || 0)) {
        map.set(c._remoteClientId, c);
      }
    });
    return map;
  }

  function selectPrimaryPartnerClientId() {
    const partners = getUniquePartnersMap();
    if (partners.size === 0) {
      primaryPartnerClientId = null;
      return null;
    }

    // 1. Always prefer a partner on a different physical machine (e.g. NZ <-> LA) over a duplicate local tab
    let bestCrossMachine = null;
    let bestAny = null;
    partners.forEach((c, remId) => {
      if (!bestAny || (c._lastPacketAt || 0) > (bestAny._lastPacketAt || 0)) {
        bestAny = c;
      }
      if (c._remoteMachineId && c._remoteMachineId !== machineId) {
        if (!bestCrossMachine || (c._lastPacketAt || 0) > (bestCrossMachine._lastPacketAt || 0)) {
          bestCrossMachine = c;
        }
      }
    });

    const chosen = bestCrossMachine || bestAny;
    primaryPartnerClientId = chosen ? chosen._remoteClientId : null;
    return primaryPartnerClientId;
  }

  function isAnyPeerConnected() {
    return isRelayConnected || getVerifiedConns().length > 0;
  }

  function getInviteUrl(room) {
    const r = room || currentRoom;
    let origin = window.location.origin;
    let pathname = window.location.pathname;
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      origin = 'https://russellkirkby-dev.github.io';
      pathname = '/blahaj-island/';
    }
    const base = (origin + pathname).replace(/\/+$/, '') + '/';
    if (sanitizeCode(r) === DEFAULT_REALM) {
      return base;
    }
    return `${base}?room=${encodeURIComponent(r)}`;
  }

  function updateRoomUI() {
    const shareBox = document.getElementById('tunnel-share-url');
    if (shareBox && !hasLocalRelay) {
      shareBox.value = getInviteUrl(currentRoom);
    }
    const hostInp = document.getElementById('host-room-code');
    const joinInp = document.getElementById('join-room-code');
    if (hostInp) hostInp.value = currentRoom;
    if (joinInp) joinInp.value = currentRoom;
  }

  function setStatus(text, connected) {
    const anyConnected = !!(connected || isAnyPeerConnected());
    const dot = document.getElementById('coop-dot');
    const title = document.getElementById('coop-status-title');
    const sub = document.getElementById('coop-status-sub');
    const modalStatus = document.getElementById('portal-modal-status');
    const tpBtn = document.getElementById('btn-party-teleport');
    const modalTpBtn = document.getElementById('btn-modal-teleport-partner');

    if (dot) {
      dot.classList.toggle('connected', anyConnected);
    }
    if (title) {
      const partnerCount = getUniquePartnersMap().size + (isRelayConnected && !getUniquePartnersMap().size ? 1 : 0);
      const totalSharks = Math.max(2, partnerCount + 1);
      title.textContent = anyConnected
        ? `Portal Linked! (${totalSharks} Sharks Online 🦈💕🦈)`
        : '24/7 Shared World · Ready for Partner';
    }
    if (sub && text) {
      sub.innerHTML = text;
    }
    if (modalStatus && text) {
      modalStatus.innerHTML = `Status: ${text}`;
    }
    if (tpBtn) {
      tpBtn.style.display = anyConnected ? '' : 'none';
    }
    if (modalTpBtn) {
      modalTpBtn.style.display = anyConnected ? '' : 'none';
    }
  }

  // ==========================================================================
  // 1. MULTI-SLOT REALM MESH WITH NON-CLOBBERING PARALLEL HANDSHAKES
  // ==========================================================================
  function promoteVerifiedConnection(c, remoteClientId, remoteMachineId) {
    if (!c || !remoteClientId || remoteClientId === clientId) return;

    c._verified = true;
    c._remoteClientId = remoteClientId;
    if (remoteMachineId) c._remoteMachineId = remoteMachineId;
    c._lastPacketAt = Date.now();

    if (c._synInterval) {
      clearInterval(c._synInterval);
      c._synInterval = null;
    }

    if (c._targetSlot) {
      pendingSlotProbes.delete(c._targetSlot);
    }

    selectPrimaryPartnerClientId();

    const realmLabel = currentRoom === DEFAULT_REALM
      ? `Shared World <strong>${currentRoom}</strong>`
      : `Instance <strong>${currentRoom}</strong>`;
    setStatus(`Connected in ${realmLabel}! 🦈💕🦈`, true);

    if (!notifiedPartners.has(remoteClientId)) {
      notifiedPartners.add(remoteClientId);
      if (callbacks.onConnect && !isRelayConnected) {
        callbacks.onConnect({
          partnerClientId: remoteClientId,
          partnerState: null
        });
      }
    }

    // Immediately sync our current player position, shark model, and zone to this connection
    if (latestPlayerState && c.open) {
      try {
        c.send(latestPlayerState);
      } catch (e) {}
    }
  }

  function cleanupClosedConnection(c) {
    if (!c) return;
    if (c._synInterval) {
      clearInterval(c._synInterval);
      c._synInterval = null;
    }
    allConns.delete(c);
    if (c._targetSlot) {
      const pending = pendingSlotProbes.get(c._targetSlot);
      if (pending && pending.conn === c) {
        pendingSlotProbes.delete(c._targetSlot);
      }
    }

    const remId = c._remoteClientId;
    selectPrimaryPartnerClientId();

    // Check if that partner still has any other open verified connection
    if (remId && !getUniquePartnersMap().has(remId)) {
      notifiedPartners.delete(remId);
    }

    if (!isAnyPeerConnected()) {
      setStatus(
        `Shared World <strong>${currentRoom}</strong> Active — Waiting for partner…`,
        false
      );
      if (callbacks.onDisconnect) callbacks.onDisconnect();
    }
  }

  function bindConnection(c, targetSlot = null) {
    if (!c || c._blahajBound) return;
    c._blahajBound = true;
    c._targetSlot = targetSlot;
    c._createdAt = Date.now();
    c._lastPacketAt = Date.now();
    c._verified = false;
    c._remoteClientId = null;
    c._remoteMachineId = null;

    allConns.add(c);

    const sendSyn = () => {
      if (!c.open || isCleaningUp) return;
      try {
        c.send({
          type: '__handshake_syn__',
          clientId,
          machineId,
          room: currentRoom,
          slot: mySlot,
          time: Date.now()
        });
      } catch (e) {}
    };

    const setupOpenChannel = () => {
      sendSyn();
      // Repeat SYN every 600ms until verified (up to 8 attempts) so early DataChannel packets are never missed
      let attempts = 0;
      if (c._synInterval) clearInterval(c._synInterval);
      c._synInterval = setInterval(() => {
        attempts++;
        if (c._verified || !c.open || attempts > 8) {
          clearInterval(c._synInterval);
          c._synInterval = null;
          return;
        }
        sendSyn();
      }, 600);
    };

    if (c.open) {
      setupOpenChannel();
    } else {
      c.on('open', setupOpenChannel);
    }

    c.on('data', (data) => {
      if (!data || !data.type) return;

      c._lastPacketAt = Date.now();

      // Handshake SYN from peer
      if (data.type === '__handshake_syn__') {
        if (data.clientId === clientId) {
          try { c.close(); } catch (e) {}
          cleanupClosedConnection(c);
          return;
        }
        if (sanitizeCode(data.room) !== currentRoom) {
          try { c.close(); } catch (e) {}
          cleanupClosedConnection(c);
          return;
        }

        try {
          c.send({
            type: '__handshake_ack__',
            clientId,
            machineId,
            room: currentRoom,
            slot: mySlot,
            time: Date.now()
          });
        } catch (e) {}

        promoteVerifiedConnection(c, data.clientId, data.machineId);
        return;
      }

      // Handshake ACK received
      if (data.type === '__handshake_ack__') {
        if (data.clientId === clientId || sanitizeCode(data.room) !== currentRoom) {
          try { c.close(); } catch (e) {}
          cleanupClosedConnection(c);
          return;
        }
        promoteVerifiedConnection(c, data.clientId, data.machineId);
        return;
      }

      // Keepalive PING / PONG
      if (data.type === '__ping__') {
        try {
          c.send({ type: '__pong__', clientId, machineId });
        } catch (e) {}
        return;
      }
      if (data.type === '__pong__') {
        if (data.clientId && !c._verified) {
          promoteVerifiedConnection(c, data.clientId, data.machineId);
        }
        return;
      }

      // Explicit Partner Disconnect packet
      if (data.type === '__partner_disconnect__') {
        try { c.close(); } catch (e) {}
        cleanupClosedConnection(c);
        return;
      }

      // Auto-verify if direct game packet arrives
      if (!c._verified) {
        const inferredId = data.clientId || data.sharkId || ('partner-' + (c.peer || 'peer'));
        promoteVerifiedConnection(c, inferredId, data.machineId);
      }

      if (isRelayConnected && data.type === 'move') return;

      // If multiple tabs are connected (e.g. a local background tab AND remote partner),
      // only allow 'move' / 'shark_swap' updates from the primary partner so a local tab never causes jitter
      selectPrimaryPartnerClientId();
      if (
        (data.type === 'move' || data.type === 'shark_swap') &&
        primaryPartnerClientId &&
        c._remoteClientId &&
        c._remoteClientId !== primaryPartnerClientId
      ) {
        return;
      }

      if (callbacks.onData) callbacks.onData(data);
    });

    c.on('close', () => {
      cleanupClosedConnection(c);
    });

    c.on('error', () => {
      cleanupClosedConnection(c);
    });
  }

  function probeOtherRealmSlots() {
    if (hasLocalRelay || !peer || peer.destroyed || peer.disconnected || isCleaningUp) {
      return;
    }

    const now = Date.now();

    // Check which slots we already have an open verified connection to
    const connectedPeerIds = new Set();
    getVerifiedConns().forEach((c) => {
      if (c.peer) connectedPeerIds.add(c.peer);
    });

    REALM_SLOTS.forEach((slot) => {
      if (slot === mySlot) return;
      const targetPeerId = getSlotPeerId(currentRoom, slot);

      // Already connected to this slot's peer ID
      if (connectedPeerIds.has(targetPeerId)) return;

      // Check if we already have an in-flight probe to this slot (give NZ <-> LA TURN 8.5s to negotiate!)
      const existingProbe = pendingSlotProbes.get(slot);
      if (existingProbe) {
        const age = now - existingProbe.startedAt;
        if (existingProbe.conn && existingProbe.conn._verified && existingProbe.conn.open) {
          pendingSlotProbes.delete(slot);
          return;
        }
        if (age < 8500 && existingProbe.conn && !existingProbe.conn._closed) {
          return; // Still negotiating ICE/TURN — do NOT clobber!
        }
        // Expired unverified probe: clean it up before starting a new one
        try { existingProbe.conn.close(); } catch (e) {}
        allConns.delete(existingProbe.conn);
        pendingSlotProbes.delete(slot);
      }

      try {
        const out = peer.connect(targetPeerId, { reliable: true });
        if (out) {
          pendingSlotProbes.set(slot, { conn: out, startedAt: now });
          bindConnection(out, slot);
        }
      } catch (e) {}
    });
  }

  function startAutoPeerMesh(roomCode, slotIndex = 0) {
    if (typeof Peer === 'undefined') return;
    currentRoom = sanitizeCode(roomCode);
    const trySlot = slotIndex < REALM_SLOTS.length ? REALM_SLOTS[slotIndex] : 'g';
    mySlot = trySlot;
    try {
      localStorage.setItem('blahaj_coop_room', currentRoom);
    } catch (e) {}
    updateRoomUI();

    if (peer) {
      try {
        peer.destroy();
      } catch (e) {}
      peer = null;
    }

    let myPeerId;
    if (slotIndex < REALM_SLOTS.length) {
      myPeerId = getSlotPeerId(currentRoom, trySlot);
    } else {
      myPeerId = `blahaj-arch-v3-${currentRoom.toLowerCase()}-${Math.floor(Math.random() * 99999)}`;
    }

    try {
      peer = new Peer(myPeerId, PEER_CONFIG);
    } catch (e) {
      console.error('[BlahajNetwork] Peer creation failed:', e);
      return;
    }

    peer.on('open', (id) => {
      console.log(`[BlahajNetwork] Joined Shared World [${currentRoom}] on slot [${trySlot}] (${id})`);
      if (!isAnyPeerConnected()) {
        setStatus(
          `Shared World <strong>${currentRoom}</strong> Open — Auto-linking with partner…`,
          false
        );
      }
      // Immediately probe all other slots in the 6-slot realm ring
      probeOtherRealmSlots();
    });

    peer.on('connection', (incomingConn) => {
      bindConnection(incomingConn, null);
    });

    peer.on('error', (err) => {
      if (!err) return;
      const errType = err.type || '';

      if (errType === 'unavailable-id') {
        // Slot is occupied by another player or ghost socket; step to next slot in 1..6 ring immediately!
        clearTimeout(peerRetryTimer);
        const nextIndex = slotIndex + 1;
        const delay = nextIndex <= REALM_SLOTS.length ? 120 : 1200;
        peerRetryTimer = setTimeout(() => startAutoPeerMesh(currentRoom, nextIndex), delay);
      } else if (errType === 'peer-unavailable') {
        // Expected when probing an empty slot in the ring; clear that pending slot so it can be re-probed later
        const msg = String(err.message || '');
        REALM_SLOTS.forEach((s) => {
          const pid = getSlotPeerId(currentRoom, s);
          if (msg.includes(pid)) {
            const p = pendingSlotProbes.get(s);
            if (p && p.conn && !p.conn._verified) {
              allConns.delete(p.conn);
              pendingSlotProbes.delete(s);
            }
          }
        });
      } else if (
        errType === 'network' ||
        errType === 'server-error' ||
        errType === 'socket-error' ||
        errType === 'socket-closed'
      ) {
        if (!isCleaningUp) {
          clearTimeout(peerRetryTimer);
          peerRetryTimer = setTimeout(() => {
            if (peer && !peer.destroyed && peer.disconnected) {
              try { peer.reconnect(); } catch (e) {}
            } else if (!isAnyPeerConnected()) {
              startAutoPeerMesh(currentRoom, 0);
            }
          }, 2500);
        }
      }
    });

    peer.on('disconnected', () => {
      if (!isCleaningUp && peer && !peer.destroyed) {
        setTimeout(() => {
          if (peer && !peer.destroyed && peer.disconnected) {
            try { peer.reconnect(); } catch (e) {}
          }
        }, 1500);
      }
    });
  }

  // Clean socket closure on tab close / reload so 0.peerjs.com frees our slot immediately
  window.addEventListener('beforeunload', () => {
    isCleaningUp = true;
    try {
      allConns.forEach((c) => {
        if (c && c.open) {
          try { c.send({ type: '__partner_disconnect__' }); } catch (e) {}
          try { c.close(); } catch (e) {}
        }
      });
      if (peer && !peer.destroyed) {
        peer.destroy();
      }
    } catch (e) {}
  });

  // Periodic heartbeat, keepalive ping, stale connection prune, and gentle slot discovery
  if (heartbeatInterval) clearInterval(heartbeatInterval);
  heartbeatInterval = setInterval(() => {
    const now = Date.now();

    // 1. Keepalive ping & dead connection pruning across all verified connections
    getVerifiedConns().forEach((c) => {
      try {
        c.send({ type: '__ping__', clientId, machineId });
      } catch (e) {}

      if (c._lastPacketAt && now - c._lastPacketAt > 10000) {
        try { c.close(); } catch (e) {}
        cleanupClosedConnection(c);
      }
    });

    // 2. Reconnect broker if disconnected
    if (!hasLocalRelay && peer && !peer.destroyed && peer.disconnected) {
      try { peer.reconnect(); } catch (e) {}
      return;
    }

    // 3. Always probe other unlinked slots if we haven't found a cross-machine partner yet
    const hasCrossMachinePartner = Array.from(getUniquePartnersMap().values()).some(
      (c) => c._remoteMachineId && c._remoteMachineId !== machineId
    );
    if (!hasCrossMachinePartner) {
      probeOtherRealmSlots();
    }
  }, 3000);

  // ==========================================================================
  // 2. BUILT-IN HTTP RELAY ENGINE (Used when running local server.py)
  // ==========================================================================
  function startServerRelayOrCloudMesh() {
    updateRoomUI();
    startAutoPeerMesh(currentRoom, 0);

    fetch('/api/coop/info')
      .then((r) => (r.ok ? r.json() : null))
      .then((info) => {
        if (!info) return;
        hasLocalRelay = true;
        const shareBox = document.getElementById('tunnel-share-url');
        if (info.tunnelUrl && shareBox) {
          shareBox.value = info.tunnelUrl;
        }
        startLocalRelayPolling();
      })
      .catch(() => {
        // Static cloud host — PeerJS Realm Mesh handles everything
      });
  }

  function startLocalRelayPolling() {
    setInterval(async () => {
      if (getVerifiedConns().length > 0) {
        return;
      }
      if (!latestPlayerState) return;
      const batch = outgoingEvents.splice(0, outgoingEvents.length);

      try {
        const res = await fetch('/api/coop/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            room: currentRoom,
            clientId,
            state: latestPlayerState,
            events: batch
          })
        });
        if (!res.ok) return;
        const data = await res.json();

        if (data.partners && data.partners.length > 0) {
          const partner = data.partners[0];
          if (!isRelayConnected) {
            isRelayConnected = true;
            relayPartnerId = partner.clientId;
            setStatus(`Connected in Shared World <strong>${currentRoom}</strong>! 🦈💕🦈`, true);
            if (callbacks.onConnect && getVerifiedConns().length === 0) {
              callbacks.onConnect({
                partnerClientId: partner.clientId,
                partnerState: partner.state
              });
            }
          }
          if (partner.state && callbacks.onData) {
            callbacks.onData({
              type: 'move',
              ...partner.state
            });
          }
        } else if (isRelayConnected) {
          isRelayConnected = false;
          relayPartnerId = null;
          if (!isAnyPeerConnected()) {
            setStatus(`Shared World <strong>${currentRoom}</strong> Open — Waiting for partner…`, false);
            if (callbacks.onDisconnect) callbacks.onDisconnect();
          }
        }

        if (Array.isArray(data.events)) {
          data.events.forEach((ev) => {
            if (callbacks.onData) callbacks.onData(ev);
          });
        }
      } catch (e) {}
    }, 65);
  }

  function closeAllConnections() {
    allConns.forEach((c) => {
      if (c._synInterval) clearInterval(c._synInterval);
      try { c.close(); } catch (e) {}
    });
    allConns.clear();
    pendingSlotProbes.clear();
    notifiedPartners.clear();
    primaryPartnerClientId = null;
  }

  function setRoom(roomCode) {
    const clean = sanitizeCode(roomCode);
    currentRoom = clean;
    try {
      localStorage.setItem('blahaj_coop_room', currentRoom);
    } catch (e) {}

    try {
      const url = new URL(window.location.href);
      if (currentRoom === DEFAULT_REALM) {
        url.searchParams.delete('room');
        url.searchParams.delete('instance');
      } else {
        url.searchParams.set('room', currentRoom);
      }
      window.history.replaceState({}, '', url.toString());
    } catch (e) {}

    closeAllConnections();
    updateRoomUI();
    startAutoPeerMesh(currentRoom, 0);
  }

  function resetToHomeRealm() {
    setRoom(DEFAULT_REALM);
    return DEFAULT_REALM;
  }

  function generatePrivateRoom() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'SHONK-';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setRoom(code);
    return code;
  }

  function forceReconnect() {
    closeAllConnections();
    if (peer) {
      try { peer.destroy(); } catch (e) {}
      peer = null;
    }
    setStatus(`Re-linking Shared World <strong>${currentRoom}</strong>…`, false);
    startAutoPeerMesh(currentRoom, 0);
  }

  function hostPortal(roomCode) {
    setRoom(roomCode);
  }

  function joinPortal(roomCode) {
    setRoom(roomCode);
  }

  function send(payload) {
    if (!payload) return;
    payload.clientId = clientId;
    payload.machineId = machineId;

    if (payload.type === 'move') {
      latestPlayerState = payload;
    } else if (hasLocalRelay && getVerifiedConns().length === 0) {
      outgoingEvents.push(payload);
    }

    // Send once to each unique connected partner in the realm mesh
    const partners = getUniquePartnersMap();
    partners.forEach((c) => {
      if (c && c.open) {
        try {
          c.send(payload);
        } catch (e) {}
      }
    });
  }

  function init(cbMap) {
    callbacks = cbMap || {};
    startServerRelayOrCloudMesh();
  }

  return {
    init,
    hostPortal,
    joinPortal,
    setRoom,
    resetToHomeRealm,
    generatePrivateRoom,
    forceReconnect,
    getRoom: () => currentRoom,
    getDefaultRealm: () => DEFAULT_REALM,
    getInviteUrl,
    send,
    getClientId: () => clientId,
    getMySlot: () => mySlot,
    isConnected: () => isAnyPeerConnected(),
    simulateIncoming: (data) => {
      if (callbacks && callbacks.onData) callbacks.onData(data);
    }
  };
})();
