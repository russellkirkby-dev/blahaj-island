// ============================================================================
// BLÅHAJ ISLAND — 24/7 CLOUD + LOCAL DUAL-ENGINE CO-OP NETWORKING (PASS 83)
// Cross-Ocean Co-op between Russell (NZ) & Helen (LA)
// Features: Handshake verification, anti-ghost filtering, multi-STUN/TURN fallback,
// clean socket teardown on unload, dual-probe fallback mesh, and 1-click private rooms.
// ============================================================================

window.BlahajNetwork = (function () {
  let peer = null;
  let conn = null;
  let isPeerConnected = false;
  let isRelayConnected = false;
  let hasLocalRelay = false;
  let mySlot = null; // 'a', 'b', or 'c'
  let callbacks = {};
  let handshakeVerified = false;
  let lastPartnerPacketTime = 0;
  let peerRetryTimer = null;
  let heartbeatInterval = null;
  let isCleaningUp = false;

  // Unique client identity per browser tab (never reuse stale IDs across tabs)
  const clientId =
    'shonk-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now().toString(36);
  sessionStorage.setItem('blahaj_client_id', clientId);

  function sanitizeCode(raw) {
    return (raw || 'SHONK-LOVE')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9-]/g, '') || 'SHONK-LOVE';
  }

  function getInitialRoom() {
    try {
      const params = new URLSearchParams(window.location.search);
      const r = params.get('room');
      if (r) {
        const clean = sanitizeCode(r);
        localStorage.setItem('blahaj_coop_room', clean);
        return clean;
      }
    } catch (e) {}

    const saved = localStorage.getItem('blahaj_coop_room');
    if (saved) {
      return sanitizeCode(saved);
    }
    return 'SHONK-LOVE';
  }

  let currentRoom = getInitialRoom();
  let latestPlayerState = null;
  let outgoingEvents = [];
  let relayPartnerId = null;

  // High-reliability global anycast STUN & TURN endpoints
  // Includes Google, Cloudflare, Twilio STUNs + Metered OpenRelay community TURN for Symmetric NAT
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
    return `blahaj-archipelago-v2-${sanitizeCode(room).toLowerCase()}-slot-${slot}`;
  }

  function getInviteUrl(room) {
    const r = room || currentRoom;
    let origin = window.location.origin;
    let pathname = window.location.pathname;
    // If running on a local testing server, always share the real public GitHub Pages link!
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      origin = 'https://russellkirkby-dev.github.io';
      pathname = '/blahaj-island/';
    }
    const base = (origin + pathname).replace(/\/+$/, '') + '/';
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
    const anyConnected = !!(connected || (isPeerConnected && handshakeVerified) || isRelayConnected);
    const dot = document.getElementById('coop-dot');
    const title = document.getElementById('coop-status-title');
    const sub = document.getElementById('coop-status-sub');
    const modalStatus = document.getElementById('portal-modal-status');

    if (dot) {
      dot.classList.toggle('connected', anyConnected);
    }
    if (title) {
      title.textContent = anyConnected
        ? 'Portal Linked! (2 Sharks Online 🦈💕🦈)'
        : '24/7 Portal Open · Ready for Partner';
    }
    if (sub) {
      sub.innerHTML = text;
    }
    if (modalStatus) {
      modalStatus.innerHTML = `Status: ${text}`;
    }
  }

  // ==========================================================================
  // 1. 24/7 SERVERLESS PEERJS AUTO-MESH WITH MUTUAL HANDSHAKE & ANTI-GHOST
  // ==========================================================================
  function onConnectionEstablished(c, remotePeerId) {
    isPeerConnected = true;
    handshakeVerified = true;
    lastPartnerPacketTime = Date.now();
    setStatus(`Connected across the Ocean in Room <strong>${currentRoom}</strong>! 🦈💕🦈`, true);

    if (callbacks.onConnect && !isRelayConnected) {
      callbacks.onConnect({
        partnerClientId: remotePeerId || c.peer || 'partner-peer',
        partnerState: null
      });
    }

    // Immediately sync current player position, shark model, and zone
    if (latestPlayerState) {
      try {
        c.send(latestPlayerState);
      } catch (e) {}
    }
  }

  function bindConnection(c) {
    if (!c) return;

    // If we already have an active, verified connection, do NOT overwrite it with a duplicate
    if (conn && isPeerConnected && handshakeVerified && conn.open && conn !== c) {
      console.log('[BlahajNetwork] Ignoring redundant incoming connection offer');
      try { c.close(); } catch (e) {}
      return;
    }

    conn = c;
    handshakeVerified = false;

    const setupOpenChannel = () => {
      // Send Handshake SYN with our clientId & room code
      try {
        c.send({
          type: '__handshake_syn__',
          clientId,
          room: currentRoom,
          time: Date.now()
        });
      } catch (e) {}
    };

    if (c.open) {
      setupOpenChannel();
    } else {
      c.on('open', setupOpenChannel);
    }

    c.on('data', (data) => {
      if (!data || !data.type) return;

      lastPartnerPacketTime = Date.now();

      // Handshake SYN from peer
      if (data.type === '__handshake_syn__') {
        // Anti-ghost check: Reject self-connection (e.g. from an old tab or reload)
        if (data.clientId === clientId) {
          console.warn('[BlahajNetwork] Self-connection detected (ghost tab from previous reload). Closing connection.');
          try { c.close(); } catch (e) {}
          return;
        }

        // Room mismatch check
        if (sanitizeCode(data.room) !== currentRoom) {
          console.warn('[BlahajNetwork] Room mismatch during handshake. Closing connection.');
          try { c.close(); } catch (e) {}
          return;
        }

        // Reply with Handshake ACK
        try {
          c.send({
            type: '__handshake_ack__',
            clientId,
            room: currentRoom,
            time: Date.now()
          });
        } catch (e) {}

        onConnectionEstablished(c, data.clientId);
        return;
      }

      // Handshake ACK received
      if (data.type === '__handshake_ack__') {
        if (data.clientId === clientId || sanitizeCode(data.room) !== currentRoom) {
          try { c.close(); } catch (e) {}
          return;
        }

        onConnectionEstablished(c, data.clientId);
        return;
      }

      // Keepalive PING / PONG
      if (data.type === '__ping__') {
        try { c.send({ type: '__pong__' }); } catch (e) {}
        return;
      }
      if (data.type === '__pong__') {
        return;
      }

      // Explicit Partner Disconnect packet
      if (data.type === '__partner_disconnect__') {
        console.log('[BlahajNetwork] Partner closed window/portal cleanly.');
        if (conn === c) {
          isPeerConnected = false;
          handshakeVerified = false;
          conn = null;
          if (!isRelayConnected) {
            setStatus(`24/7 Room <strong>${currentRoom}</strong> Active — Solo or waiting for partner…`, false);
            if (callbacks.onDisconnect) callbacks.onDisconnect();
          }
        }
        return;
      }

      // Normal game data: auto-verify if direct gameplay packet arrives
      if (!handshakeVerified) {
        if (data.type === 'move' || data.type === 'shark_swap') {
          console.log('[BlahajNetwork] Received direct game packet, auto-verifying connection');
          onConnectionEstablished(c, data.sharkId || 'partner');
        } else {
          return;
        }
      }
      if (isRelayConnected && data.type === 'move') return;
      if (callbacks.onData) callbacks.onData(data);
    });

    c.on('close', () => {
      if (conn === c) {
        isPeerConnected = false;
        handshakeVerified = false;
        conn = null;
        if (!isRelayConnected) {
          setStatus(`24/7 Room <strong>${currentRoom}</strong> Active — Solo or waiting for partner…`, false);
          if (callbacks.onDisconnect) callbacks.onDisconnect();
        }
      }
    });

    c.on('error', (err) => {
      console.warn('[BlahajNetwork] Connection error:', err);
      if (conn === c) {
        isPeerConnected = false;
        handshakeVerified = false;
        conn = null;
        if (!isRelayConnected && callbacks.onDisconnect) {
          callbacks.onDisconnect();
        }
      }
    });
  }

  function startAutoPeerMesh(roomCode, trySlot = 'a') {
    if (typeof Peer === 'undefined') return;
    currentRoom = sanitizeCode(roomCode);
    mySlot = trySlot;
    localStorage.setItem('blahaj_coop_room', currentRoom);
    updateRoomUI();

    if (peer) {
      try {
        peer.destroy();
      } catch (e) {}
      peer = null;
    }

    let myPeerId;
    if (trySlot === 'a' || trySlot === 'b') {
      myPeerId = getSlotPeerId(currentRoom, trySlot);
    } else {
      myPeerId = `blahaj-arch-${currentRoom.toLowerCase()}-${Math.floor(Math.random() * 99999)}`;
    }

    try {
      peer = new Peer(myPeerId, PEER_CONFIG);
    } catch (e) {
      console.error('[BlahajNetwork] Peer creation failed:', e);
      return;
    }

    peer.on('open', (id) => {
      console.log(`[BlahajNetwork] Registered on 0.peerjs.com as slot [${trySlot}] (${id})`);
      if (!isRelayConnected && !isPeerConnected) {
        setStatus(
          `24/7 Cloud Portal in Room <strong>${currentRoom}</strong> Ready! (Auto-links when partner joins)`,
          false
        );
      }

      // Probing partner:
      if (!isPeerConnected) {
        if (trySlot === 'a') {
          // Slot A probes Slot B
          try {
            const out = peer.connect(getSlotPeerId(currentRoom, 'b'), { reliable: true });
            bindConnection(out);
          } catch (e) {}
        } else if (trySlot === 'b') {
          // Slot B probes Slot A
          try {
            const out = peer.connect(getSlotPeerId(currentRoom, 'a'), { reliable: true });
            bindConnection(out);
          } catch (e) {}
        } else {
          // Fallback Slot probes BOTH Slot A and Slot B
          try {
            const outA = peer.connect(getSlotPeerId(currentRoom, 'a'), { reliable: true });
            bindConnection(outA);
          } catch (e) {}
          try {
            const outB = peer.connect(getSlotPeerId(currentRoom, 'b'), { reliable: true });
            bindConnection(outB);
          } catch (e) {}
        }
      }
    });

    peer.on('connection', (incomingConn) => {
      console.log('[BlahajNetwork] Incoming connection from peer:', incomingConn.peer);
      bindConnection(incomingConn);
    });

    peer.on('error', (err) => {
      if (!err) return;
      const errType = err.type || '';
      console.warn(`[BlahajNetwork] Peer error (${errType}):`, err);

      if (errType === 'unavailable-id') {
        // Slot collision: seamlessly cascade to next slot without locking up
        clearTimeout(peerRetryTimer);
        if (trySlot === 'a') {
          peerRetryTimer = setTimeout(() => startAutoPeerMesh(currentRoom, 'b'), 250);
        } else if (trySlot === 'b') {
          peerRetryTimer = setTimeout(() => startAutoPeerMesh(currentRoom, 'c'), 250);
        } else {
          peerRetryTimer = setTimeout(() => startAutoPeerMesh(currentRoom, 'c'), 1500);
        }
      } else if (errType === 'peer-unavailable') {
        // Partner is not online yet on that probed slot; this is expected during quiet waiting
      } else if (errType === 'network' || errType === 'server-error' || errType === 'socket-error' || errType === 'socket-closed') {
        // Broker connection hiccup; retry connecting after brief cooldown
        if (!isPeerConnected && !isCleaningUp) {
          clearTimeout(peerRetryTimer);
          peerRetryTimer = setTimeout(() => {
            if (peer && !peer.destroyed && peer.disconnected) {
              peer.reconnect();
            } else if (!isPeerConnected) {
              startAutoPeerMesh(currentRoom, trySlot);
            }
          }, 3000);
        }
      }
    });

    peer.on('disconnected', () => {
      console.log('[BlahajNetwork] Broker socket disconnected.');
      if (!isPeerConnected && !isCleaningUp && peer && !peer.destroyed) {
        setTimeout(() => {
          if (peer && !peer.destroyed && peer.disconnected) {
            peer.reconnect();
          }
        }, 2000);
      }
    });
  }

  // Clean socket closure on tab close / reload so 0.peerjs.com frees slots immediately!
  window.addEventListener('beforeunload', () => {
    isCleaningUp = true;
    try {
      if (conn && conn.open) {
        conn.send({ type: '__partner_disconnect__' });
        conn.close();
      }
      if (peer && !peer.destroyed) {
        peer.destroy();
      }
    } catch (e) {}
  });

  // Periodic heartbeat, keepalive ping & stale partner prune
  if (heartbeatInterval) clearInterval(heartbeatInterval);
  heartbeatInterval = setInterval(() => {
    const now = Date.now();

    // 1. Keepalive ping if connected
    if (conn && isPeerConnected && conn.open && handshakeVerified) {
      try {
        conn.send({ type: '__ping__' });
      } catch (e) {}

      // 2. Prune dead partner if no packets received for 7.5 seconds
      if (lastPartnerPacketTime > 0 && now - lastPartnerPacketTime > 7500) {
        console.warn('[BlahajNetwork] Partner connection timed out (no heartbeat for 7.5s). Resetting.');
        try { conn.close(); } catch (e) {}
        isPeerConnected = false;
        handshakeVerified = false;
        conn = null;
        if (!isRelayConnected) {
          setStatus(`24/7 Room <strong>${currentRoom}</strong> Active — Solo or waiting for partner…`, false);
          if (callbacks.onDisconnect) callbacks.onDisconnect();
        }
      }
      return;
    }

    // 3. Gentle reconnect & broker re-probe if waiting for partner
    if (hasLocalRelay || isPeerConnected || !peer || peer.destroyed) {
      return;
    }

    if (peer.disconnected) {
      try { peer.reconnect(); } catch (e) {}
      return;
    }

    if (mySlot === 'a') {
      try {
        const out = peer.connect(getSlotPeerId(currentRoom, 'b'), { reliable: true });
        bindConnection(out);
      } catch (e) {}
    } else if (mySlot === 'b') {
      try {
        const out = peer.connect(getSlotPeerId(currentRoom, 'a'), { reliable: true });
        bindConnection(out);
      } catch (e) {}
    } else {
      try {
        const outA = peer.connect(getSlotPeerId(currentRoom, 'a'), { reliable: true });
        bindConnection(outA);
      } catch (e) {}
      try {
        const outB = peer.connect(getSlotPeerId(currentRoom, 'b'), { reliable: true });
        bindConnection(outB);
      } catch (e) {}
    }
  }, 2500);

  // ==========================================================================
  // 2. BUILT-IN HTTP RELAY ENGINE (Used when running local server.py)
  // ==========================================================================
  function startServerRelayOrCloudMesh() {
    updateRoomUI();

    // Always start the 24/7 PeerJS Auto-Mesh so P2P works everywhere
    startAutoPeerMesh(currentRoom, 'a');

    // Check if local server.py (/api/coop/info) is present
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
        // Static cloud host — PeerJS Auto-Mesh handles everything
      });
  }

  function startLocalRelayPolling() {
    setInterval(async () => {
      // Standby when WebRTC PeerJS direct connection is active and verified!
      // Eliminates dual-transport race conditions, rubber-banding, and 15 HTTP requests/sec.
      if (isPeerConnected && handshakeVerified) {
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
            setStatus(`Connected across the Ocean in Room <strong>${currentRoom}</strong>! 🦈💕🦈`, true);
            if (callbacks.onConnect && !isPeerConnected) {
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
          if (!isPeerConnected) {
            setStatus(`Room <strong>${currentRoom}</strong> open — waiting for partner…`, false);
            if (callbacks.onDisconnect) callbacks.onDisconnect();
          }
        }

        if (Array.isArray(data.events)) {
          data.events.forEach((ev) => {
            if (callbacks.onData) callbacks.onData(ev);
          });
        }
      } catch (e) {
        // Transient network hiccups
      }
    }, 65);
  }

  function setRoom(roomCode) {
    const clean = sanitizeCode(roomCode);
    if (clean === currentRoom && (isPeerConnected || peer)) return;
    currentRoom = clean;
    localStorage.setItem('blahaj_coop_room', currentRoom);

    try {
      const url = new URL(window.location.href);
      url.searchParams.set('room', currentRoom);
      window.history.replaceState({}, '', url.toString());
    } catch (e) {}

    updateRoomUI();
    startAutoPeerMesh(currentRoom, 'a');
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
    isPeerConnected = false;
    handshakeVerified = false;
    if (conn) {
      try { conn.close(); } catch (e) {}
      conn = null;
    }
    if (peer) {
      try { peer.destroy(); } catch (e) {}
      peer = null;
    }
    setStatus(`Re-linking Portal in Room <strong>${currentRoom}</strong>…`, false);
    startAutoPeerMesh(currentRoom, 'a');
  }

  function hostPortal(roomCode) {
    setRoom(roomCode);
  }

  function joinPortal(roomCode) {
    setRoom(roomCode);
  }

  function send(payload) {
    if (!payload) return;
    if (payload.type === 'move') {
      latestPlayerState = payload;
    } else if (hasLocalRelay && (!isPeerConnected || !handshakeVerified)) {
      outgoingEvents.push(payload);
    }

    if (conn && isPeerConnected && conn.open && handshakeVerified) {
      try {
        conn.send(payload);
      } catch (e) {}
    }
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
    generatePrivateRoom,
    forceReconnect,
    getRoom: () => currentRoom,
    getInviteUrl,
    send,
    getClientId: () => clientId,
    getMySlot: () => mySlot,
    isConnected: () => isRelayConnected || (isPeerConnected && handshakeVerified),
    simulateIncoming: (data) => { if (callbacks && callbacks.onData) callbacks.onData(data); }
  };
})();
