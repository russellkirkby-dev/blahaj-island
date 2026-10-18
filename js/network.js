// ============================================================================
// BLÅHAJ ISLAND — 24/7 CLOUD + LOCAL DUAL-ENGINE CO-OP NETWORKING
// Automatically connects Russell (NZ) & Helen (LA) in room SHONK-LOVE
// Works 24/7 on GitHub Pages (via Dual-Slot PeerJS Auto-Mesh) AND via Local Relay!
// ============================================================================

window.BlahajNetwork = (function () {
  let peer = null;
  let conn = null;
  let isPeerConnected = false;
  let isRelayConnected = false;
  let hasLocalRelay = false;
  let mySlot = null; // 'A' or 'B'
  let callbacks = {};

  const clientId =
    sessionStorage.getItem('blahaj_client_id') ||
    'shonk-' + Math.random().toString(36).substring(2, 10) + '-' + Date.now().toString(36);
  sessionStorage.setItem('blahaj_client_id', clientId);

  let currentRoom = 'SHONK-LOVE';
  let latestPlayerState = null;
  let outgoingEvents = [];
  let relayPartnerId = null;

  const PEER_CONFIG = {
    config: {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
      ]
    }
  };

  function sanitizeCode(raw) {
    return (raw || 'SHONK-LOVE')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9-]/g, '');
  }

  function getSlotPeerId(room, slot) {
    return `blahaj-archipelago-v2-${sanitizeCode(room).toLowerCase()}-slot-${slot}`;
  }

  function setStatus(text, connected) {
    const anyConnected = !!(connected || isPeerConnected || isRelayConnected);
    const dot = document.getElementById('coop-dot');
    const title = document.getElementById('coop-status-title');
    const sub = document.getElementById('coop-status-sub');
    const modalStatus = document.getElementById('portal-modal-status');

    if (dot) {
      dot.classList.toggle('connected', anyConnected);
    }
    if (title) {
      title.textContent = anyConnected ? 'Portal Linked! (2 Sharks Online 🦈💕🦈)' : '24/7 Portal Open · Ready for Partner';
    }
    if (sub) {
      sub.innerHTML = text;
    }
    if (modalStatus) {
      modalStatus.innerHTML = `Status: ${text}`;
    }
  }

  // ==========================================================================
  // 1. 24/7 SERVERLESS PEERJS DUAL-SLOT AUTO-MESH (Works on GitHub Pages 24/7!)
  // ==========================================================================
  function bindConnection(c) {
    if (!c) return;
    // If we already have an open connection, ignore duplicate
    if (conn && isPeerConnected && conn.open && conn !== c) {
      return;
    }
    conn = c;

    conn.on('open', () => {
      isPeerConnected = true;
      setStatus(`Connected 24/7 across the Ocean in <strong>${currentRoom}</strong>! 🦈💕🦈`, true);
      if (callbacks.onConnect && !isRelayConnected) {
        callbacks.onConnect({
          partnerClientId: conn.peer || 'partner-peer',
          partnerState: null
        });
      }
      if (latestPlayerState) {
        conn.send(latestPlayerState);
      }
    });

    conn.on('data', (data) => {
      if (!data || !data.type) return;
      // Avoid double-processing if local relay is also active
      if (isRelayConnected && data.type === 'move') return;
      if (callbacks.onData) callbacks.onData(data);
    });

    conn.on('close', () => {
      isPeerConnected = false;
      conn = null;
      if (!isRelayConnected) {
        setStatus(`24/7 Room <strong>${currentRoom}</strong> Active — Solo or waiting for partner…`, false);
        if (callbacks.onDisconnect) callbacks.onDisconnect();
      }
    });

    conn.on('error', () => {
      isPeerConnected = false;
      conn = null;
    });
  }

  function startAutoPeerMesh(roomCode, trySlot = 'a') {
    if (typeof Peer === 'undefined') return;
    currentRoom = sanitizeCode(roomCode);
    mySlot = trySlot;

    if (peer) {
      try {
        peer.destroy();
      } catch (e) {}
      peer = null;
    }

    const myPeerId = getSlotPeerId(currentRoom, trySlot);
    const otherSlot = trySlot === 'a' ? 'b' : 'a';
    const otherPeerId = getSlotPeerId(currentRoom, otherSlot);

    peer = new Peer(myPeerId, PEER_CONFIG);

    peer.on('open', () => {
      if (!isRelayConnected && !isPeerConnected) {
        setStatus(
          `24/7 Cloud Portal <strong>${currentRoom}</strong> Ready! (Auto-links when partner joins)`,
          false
        );
      }
      // Immediately attempt to connect to the opposite slot in case partner is already online!
      if (!isPeerConnected) {
        const out = peer.connect(otherPeerId, { reliable: true });
        bindConnection(out);
      }
    });

    peer.on('connection', (incomingConn) => {
      bindConnection(incomingConn);
    });

    peer.on('error', (err) => {
      if (err && err.type === 'unavailable-id') {
        // Slot A is already occupied by our partner! Claim Slot B and connect to Slot A!
        if (trySlot === 'a') {
          setTimeout(() => startAutoPeerMesh(currentRoom, 'b'), 250);
        } else {
          // Fallback random ID and connect to Slot A
          peer = new Peer(undefined, PEER_CONFIG);
          peer.on('open', () => {
            const out = peer.connect(getSlotPeerId(currentRoom, 'a'), { reliable: true });
            bindConnection(out);
          });
          peer.on('connection', bindConnection);
        }
      }
    });
  }

  // Periodic gentle reconnect heartbeat for 24/7 Cloud Mode so players can come and go anytime!
  setInterval(() => {
    if (hasLocalRelay || isPeerConnected || !peer || peer.disconnected || peer.destroyed || !mySlot) {
      return;
    }
    // Only Slot B (or Slot A every other cycle) initiates a lightweight probe to the opposite slot
    const otherSlot = mySlot === 'a' ? 'b' : 'a';
    const otherPeerId = getSlotPeerId(currentRoom, otherSlot);
    try {
      const out = peer.connect(otherPeerId, { reliable: true });
      bindConnection(out);
    } catch (e) {}
  }, 4500);

  // ==========================================================================
  // 2. BUILT-IN HTTP RELAY ENGINE (Used when running local server.py)
  // ==========================================================================
  function startServerRelayOrCloudMesh() {
    const shareBox = document.getElementById('tunnel-share-url');
    if (shareBox) {
      shareBox.value = window.location.href;
    }

    // Always start the 24/7 PeerJS Auto-Mesh so P2P works everywhere
    startAutoPeerMesh(currentRoom, 'a');

    // Check if local server.py (/api/coop/info) is present
    fetch('/api/coop/info')
      .then((r) => (r.ok ? r.json() : null))
      .then((info) => {
        if (!info) return; // Running on 24/7 GitHub Pages static cloud!
        hasLocalRelay = true;
        if (info.tunnelUrl && shareBox) {
          shareBox.value = info.tunnelUrl;
        }
        startLocalRelayPolling();
      })
      .catch(() => {
        // Running on 24/7 static cloud host — PeerJS Auto-Mesh handles everything!
      });
  }

  function startLocalRelayPolling() {
    setInterval(async () => {
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
            setStatus(`Connected across the Ocean in <strong>${currentRoom}</strong>! 🦈💕🦈`, true);
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
        // Ignore transient network hiccups
      }
    }, 65);
  }

  function hostPortal(roomCode) {
    currentRoom = sanitizeCode(roomCode);
    startAutoPeerMesh(currentRoom, 'a');
  }

  function joinPortal(roomCode) {
    currentRoom = sanitizeCode(roomCode);
    startAutoPeerMesh(currentRoom, 'b');
  }

  function send(payload) {
    if (!payload) return;
    if (payload.type === 'move') {
      latestPlayerState = payload;
    } else if (hasLocalRelay) {
      outgoingEvents.push(payload);
    }

    if (conn && isPeerConnected && conn.open) {
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
    send,
    getClientId: () => clientId,
    isConnected: () => isRelayConnected || isPeerConnected
  };
})();

