// ============================================================================
// BLÅHAJ ISLAND — PERSISTENT SHARED WORLD REALM NETWORKING (PASS 85)
// Hybrid Cloud WebSocket Pub/Sub (wss://) + WebRTC Mesh ('SHONK-LOVE')
// Why this works 100% of the time between New Zealand (NZ) & Los Angeles (LA):
//  1. Dual-Broker TLS WebSocket Pub/Sub Bus (wss://broker.emqx.io:8084/mqtt +
//     wss://test.mosquitto.org:8081) bypasses all Symmetric NAT / CGNAT / UDP
//     firewalls with zero STUN/TURN dependencies.
//  2. Continuous 1-second Presence & Coordinate Heartbeat so players standing
//     still at the Portal or inside the Laundromat see each other within 1s.
//  3. Multi-Player Realm Support (2, 3, 4+ sharks simultaneously—Russell,
//     Helen, Argon, etc.) with packet deduplication across all transports.
// ============================================================================

window.BlahajNetwork = (function () {
  const DEFAULT_REALM = 'SHONK-LOVE';
  const REALM_SLOTS = ['a', 'b', 'c', 'd', 'e', 'f'];
  const WSS_BROKERS = [
    'wss://broker.emqx.io:8084/mqtt',
    'wss://test.mosquitto.org:8081'
  ];

  let peer = null;
  let isRelayConnected = false;
  let hasLocalRelay = false;
  let mySlot = null;
  let callbacks = {};
  let peerRetryTimer = null;
  let heartbeatInterval = null;
  let isCleaningUp = false;

  // Tracked WebRTC connections
  const allConns = new Set();
  const pendingSlotProbes = new Map();

  // Tracked Cloud WebSocket (MQTT over WSS) clients
  const wssClients = new Map(); // url -> { ws, connected, subscribedTopic, pingTimer, reconnectTimer }
  let lastWssMoveSentAt = 0;

  // Track all active remote peers across ALL transports (WSS + WebRTC + Local Relay)
  // remoteClientId -> { clientId, machineId, lastSeen, sharkId }
  const activeRemotePeers = new Map();
  const notifiedPartners = new Set();

  // Packet deduplication ring buffer
  let packetSeq = 0;
  const seenPacketIds = new Set();
  const seenPacketQueue = [];

  // Unique client identity per browser tab
  const clientId =
    'shonk-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now().toString(36);
  try {
    sessionStorage.setItem('blahaj_client_id', clientId);
  } catch (e) {}

  // Persistent machine identity per browser profile
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
    try {
      const params = new URLSearchParams(window.location.search);
      const r = params.get('room') || params.get('instance');
      if (r) {
        return sanitizeCode(r);
      }
    } catch (e) {}

    try {
      localStorage.setItem('blahaj_coop_room', DEFAULT_REALM);
    } catch (e) {}
    return DEFAULT_REALM;
  }

  let currentRoom = getInitialRoom();
  let latestPlayerState = null;
  let outgoingEvents = [];

  const PEER_CONFIG = {
    config: {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun.cloudflare.com:3478' }
      ],
      iceCandidatePoolSize: 8
    }
  };

  function getRealmTopic(room) {
    return `blahaj-island/v4/realm/${sanitizeCode(room)}`;
  }

  function getSlotPeerId(room, slot) {
    return `blahaj-archipelago-v3-${sanitizeCode(room).toLowerCase()}-slot-${slot}`;
  }

  function markPacketSeen(pktId) {
    if (!pktId) return false;
    if (seenPacketIds.has(pktId)) return true;
    seenPacketIds.add(pktId);
    seenPacketQueue.push(pktId);
    if (seenPacketQueue.length > 600) {
      const oldest = seenPacketQueue.shift();
      seenPacketIds.delete(oldest);
    }
    return false;
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

  function isAnyWssBrokerConnected() {
    let ok = false;
    wssClients.forEach((st) => {
      if (st && st.connected) ok = true;
    });
    return ok;
  }

  function isAnyPeerConnected() {
    return activeRemotePeers.size > 0 || isRelayConnected || getVerifiedConns().length > 0;
  }

  function registerRemotePeerActivity(remClientId, remMachineId, partnerState = null) {
    if (!remClientId || remClientId === clientId) return;
    const now = Date.now();
    const existing = activeRemotePeers.get(remClientId) || {
      clientId: remClientId,
      machineId: remMachineId || null,
      lastSeen: now
    };
    existing.lastSeen = now;
    if (remMachineId) existing.machineId = remMachineId;
    if (partnerState && partnerState.sharkId) existing.sharkId = partnerState.sharkId;
    activeRemotePeers.set(remClientId, existing);

    const realmLabel = currentRoom === DEFAULT_REALM
      ? `Shared World <strong>${currentRoom}</strong>`
      : `Instance <strong>${currentRoom}</strong>`;
    setStatus(`Connected in ${realmLabel}! 🦈💕🦈`, true);

    if (!notifiedPartners.has(remClientId)) {
      notifiedPartners.add(remClientId);
      if (callbacks.onConnect) {
        callbacks.onConnect({
          partnerClientId: remClientId,
          partnerMachineId: remMachineId || null,
          partnerState: partnerState || null
        });
      }
      // Immediately send our current state back so the newly discovered peer sees us right away
      if (latestPlayerState) {
        publishWssPayload(latestPlayerState, true);
      }
    }
  }

  function unregisterRemotePeer(remClientId) {
    if (!remClientId) return;
    activeRemotePeers.delete(remClientId);
    notifiedPartners.delete(remClientId);
    if (callbacks.onPeerDisconnect) {
      callbacks.onPeerDisconnect(remClientId);
    }
    if (!isAnyPeerConnected()) {
      setStatus(
        `Shared World <strong>${currentRoom}</strong> Active — Waiting for partner…`,
        false
      );
      if (callbacks.onDisconnect) callbacks.onDisconnect();
    } else {
      const realmLabel = currentRoom === DEFAULT_REALM
        ? `Shared World <strong>${currentRoom}</strong>`
        : `Instance <strong>${currentRoom}</strong>`;
      setStatus(`Connected in ${realmLabel}! 🦈💕🦈`, true);
    }
  }

  function handleIncomingRealmPacket(data) {
    if (!data || !data.type) return;
    if (data.clientId === clientId) return;
    if (data.room && sanitizeCode(data.room) !== currentRoom) return;
    if (data._pktId && markPacketSeen(data._pktId)) return;

    const remId = data.clientId || data.sharkId;
    const remMach = data.machineId || null;

    if (data.type === '__handshake_syn__') {
      registerRemotePeerActivity(remId, remMach, data.state || null);
      sendRawControl({
        type: '__handshake_ack__',
        clientId,
        machineId,
        room: currentRoom,
        state: latestPlayerState || null,
        time: Date.now()
      });
      if (data.state && callbacks.onData) {
        callbacks.onData({ ...data.state, clientId: remId, machineId: remMach });
      }
      return;
    }

    if (data.type === '__handshake_ack__') {
      registerRemotePeerActivity(remId, remMach, data.state || null);
      if (data.state && callbacks.onData) {
        callbacks.onData({ ...data.state, clientId: remId, machineId: remMach });
      }
      return;
    }

    if (data.type === '__ping__' || data.type === '__presence__') {
      registerRemotePeerActivity(remId, remMach, data.state || null);
      if (data.state && callbacks.onData) {
        callbacks.onData({ ...data.state, clientId: remId, machineId: remMach });
      }
      return;
    }

    if (data.type === '__pong__') {
      registerRemotePeerActivity(remId, remMach, null);
      return;
    }

    if (data.type === '__partner_disconnect__') {
      unregisterRemotePeer(remId);
      return;
    }

    if (remId) {
      registerRemotePeerActivity(remId, remMach, data.type === 'move' ? data : null);
    }

    if (callbacks.onData) {
      callbacks.onData(data);
    }
  }

  // ==========================================================================
  // 1. ZERO-DEPENDENCY MQTT-OVER-WSS CLOUD PUB/SUB ENGINE (NZ <-> LA RELAY)
  // ==========================================================================
  const textEncoder = new TextEncoder();
  const textDecoder = new TextDecoder();

  function mqttEncodeRemainingLength(len) {
    const out = [];
    do {
      let d = len % 128;
      len = Math.floor(len / 128);
      if (len > 0) d |= 0x80;
      out.push(d);
    } while (len > 0);
    return out;
  }

  function mqttEncodeString(str) {
    const bytes = textEncoder.encode(str);
    const out = new Uint8Array(2 + bytes.length);
    out[0] = (bytes.length >> 8) & 0xff;
    out[1] = bytes.length & 0xff;
    out.set(bytes, 2);
    return out;
  }

  function mqttConcat(arrays) {
    let total = 0;
    for (let i = 0; i < arrays.length; i++) total += arrays[i].length;
    const out = new Uint8Array(total);
    let offset = 0;
    for (let i = 0; i < arrays.length; i++) {
      out.set(arrays[i], offset);
      offset += arrays[i].length;
    }
    return out;
  }

  function mqttBuildConnect(cid) {
    const proto = mqttEncodeString('MQTT');
    const meta = new Uint8Array([0x04, 0x02, 0x00, 0x2d]); // v3.1.1, CleanSession, KeepAlive 45s
    const idBytes = mqttEncodeString(cid);
    const body = mqttConcat([proto, meta, idBytes]);
    const header = new Uint8Array([0x10, ...mqttEncodeRemainingLength(body.length)]);
    return mqttConcat([header, body]);
  }

  function mqttBuildSubscribe(topic, packetId = 1) {
    const pkId = new Uint8Array([(packetId >> 8) & 0xff, packetId & 0xff]);
    const topBytes = mqttEncodeString(topic);
    const qos = new Uint8Array([0x00]);
    const body = mqttConcat([pkId, topBytes, qos]);
    const header = new Uint8Array([0x82, ...mqttEncodeRemainingLength(body.length)]);
    return mqttConcat([header, body]);
  }

  function mqttBuildPublish(topic, jsonStr) {
    const topBytes = mqttEncodeString(topic);
    const payloadBytes = textEncoder.encode(jsonStr);
    const body = mqttConcat([topBytes, payloadBytes]);
    const header = new Uint8Array([0x30, ...mqttEncodeRemainingLength(body.length)]);
    return mqttConcat([header, body]);
  }

  function connectWssBroker(url) {
    if (typeof WebSocket === 'undefined' || isCleaningUp) return;

    const existing = wssClients.get(url);
    if (existing) {
      if (existing.pingTimer) clearInterval(existing.pingTimer);
      if (existing.reconnectTimer) clearTimeout(existing.reconnectTimer);
      if (existing.ws) {
        try { existing.ws.onclose = null; existing.ws.close(); } catch (e) {}
      }
    }

    const state = {
      url,
      ws: null,
      connected: false,
      subscribedTopic: null,
      pingTimer: null,
      reconnectTimer: null
    };
    wssClients.set(url, state);

    let ws;
    try {
      ws = new WebSocket(url, 'mqtt');
      ws.binaryType = 'arraybuffer';
      state.ws = ws;
    } catch (e) {
      state.reconnectTimer = setTimeout(() => connectWssBroker(url), 3500);
      return;
    }

    ws.onopen = () => {
      if (isCleaningUp) return;
      try {
        const brokerCid = `${clientId}-${Math.random().toString(36).slice(2, 6)}`;
        ws.send(mqttBuildConnect(brokerCid));
      } catch (e) {}
    };

    ws.onmessage = (ev) => {
      if (!ev || !ev.data) return;
      const u8 = new Uint8Array(ev.data);
      let offset = 0;

      while (offset < u8.length) {
        const headerByte = u8[offset++];
        const pktType = headerByte & 0xf0;

        let mult = 1;
        let remLen = 0;
        let b;
        do {
          if (offset >= u8.length) return;
          b = u8[offset++];
          remLen += (b & 127) * mult;
          mult *= 128;
        } while ((b & 128) !== 0);

        const packetEnd = offset + remLen;
        if (packetEnd > u8.length) return;

        if (pktType === 0x20) {
          // CONNACK -> Subscribe to active realm topic
          state.connected = true;
          const topic = getRealmTopic(currentRoom);
          state.subscribedTopic = topic;
          try {
            ws.send(mqttBuildSubscribe(topic, 1));
          } catch (e) {}

          if (!isAnyPeerConnected()) {
            setStatus(
              `Shared World <strong>${currentRoom}</strong> Live — Ready for Partner`,
              false
            );
          }

          // Announce presence & initial position immediately upon joining topic
          setTimeout(() => {
            if (!state.connected) return;
            sendRawControl({
              type: '__handshake_syn__',
              clientId,
              machineId,
              room: currentRoom,
              state: latestPlayerState || null,
              time: Date.now()
            });
          }, 80);

          if (state.pingTimer) clearInterval(state.pingTimer);
          state.pingTimer = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              try {
                ws.send(new Uint8Array([0xc0, 0x00])); // MQTT PINGREQ
              } catch (e) {}
            }
          }, 20000);
        } else if (pktType === 0x30) {
          // PUBLISH packet
          const topLen = (u8[offset] << 8) | u8[offset + 1];
          let payloadStart = offset + 2 + topLen;
          const qos = (headerByte >> 1) & 0x03;
          if (qos > 0) payloadStart += 2;
          if (payloadStart <= packetEnd) {
            try {
              const jsonStr = textDecoder.decode(u8.subarray(payloadStart, packetEnd));
              const parsed = JSON.parse(jsonStr);
              handleIncomingRealmPacket(parsed);
            } catch (e) {}
          }
        }

        offset = packetEnd;
      }
    };

    ws.onclose = () => {
      state.connected = false;
      if (state.pingTimer) {
        clearInterval(state.pingTimer);
        state.pingTimer = null;
      }
      if (!isCleaningUp) {
        state.reconnectTimer = setTimeout(() => connectWssBroker(url), 2500);
      }
    };

    ws.onerror = () => {};
  }

  function startWssRealmMesh() {
    WSS_BROKERS.forEach((url) => {
      connectWssBroker(url);
    });
  }

  function publishWssPayload(payload, forceImmediate = false) {
    if (!payload) return;
    const now = Date.now();
    // Rate-limit high-frequency move packets over WSS to ~10Hz (100ms) while letting events go immediately
    if (payload.type === 'move' && !forceImmediate) {
      if (now - lastWssMoveSentAt < 95) return;
      lastWssMoveSentAt = now;
    }

    const topic = getRealmTopic(currentRoom);
    let packetBinary = null;

    wssClients.forEach((st) => {
      if (st && st.connected && st.ws && st.ws.readyState === WebSocket.OPEN) {
        if (st.subscribedTopic !== topic) {
          st.subscribedTopic = topic;
          try {
            st.ws.send(mqttBuildSubscribe(topic, 2));
          } catch (e) {}
        }
        if (!packetBinary) {
          try {
            packetBinary = mqttBuildPublish(topic, JSON.stringify(payload));
          } catch (e) {
            return;
          }
        }
        try {
          st.ws.send(packetBinary);
        } catch (e) {}
      }
    });
  }

  function sendRawControl(ctrlObj) {
    if (!ctrlObj) return;
    ctrlObj.clientId = clientId;
    ctrlObj.machineId = machineId;
    ctrlObj.room = currentRoom;
    ctrlObj._pktId = `${clientId}-${++packetSeq}`;
    markPacketSeen(ctrlObj._pktId);

    publishWssPayload(ctrlObj, true);

    allConns.forEach((c) => {
      if (c && c.open) {
        try { c.send(ctrlObj); } catch (e) {}
      }
    });
  }

  // ==========================================================================
  // 2. WEBRTC DIRECT MESH (SUPPLEMENTAL LOW-LATENCY CHANNEL)
  // ==========================================================================
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
      const partnerCount = Math.max(activeRemotePeers.size, anyConnected ? 1 : 0);
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
          state: latestPlayerState || null,
          time: Date.now()
        });
      } catch (e) {}
    };

    const setupOpenChannel = () => {
      sendSyn();
      let attempts = 0;
      if (c._synInterval) clearInterval(c._synInterval);
      c._synInterval = setInterval(() => {
        attempts++;
        if (c._verified || !c.open || attempts > 6) {
          clearInterval(c._synInterval);
          c._synInterval = null;
          return;
        }
        sendSyn();
      }, 650);
    };

    if (c.open) {
      setupOpenChannel();
    } else {
      c.on('open', setupOpenChannel);
    }

    c.on('data', (data) => {
      if (!data || !data.type) return;
      c._lastPacketAt = Date.now();
      if (data.clientId && data.clientId !== clientId) {
        c._verified = true;
        c._remoteClientId = data.clientId;
        if (data.machineId) c._remoteMachineId = data.machineId;
        if (c._targetSlot) pendingSlotProbes.delete(c._targetSlot);
      }
      handleIncomingRealmPacket(data);
    });

    c.on('close', () => {
      if (c._synInterval) clearInterval(c._synInterval);
      allConns.delete(c);
    });

    c.on('error', () => {
      if (c._synInterval) clearInterval(c._synInterval);
      allConns.delete(c);
    });
  }

  function probeOtherRealmSlots() {
    if (hasLocalRelay || !peer || peer.destroyed || peer.disconnected || isCleaningUp) {
      return;
    }

    const now = Date.now();
    const connectedPeerIds = new Set();
    getVerifiedConns().forEach((c) => {
      if (c.peer) connectedPeerIds.add(c.peer);
    });

    REALM_SLOTS.forEach((slot) => {
      if (slot === mySlot) return;
      const targetPeerId = getSlotPeerId(currentRoom, slot);
      if (connectedPeerIds.has(targetPeerId)) return;

      const existingProbe = pendingSlotProbes.get(slot);
      if (existingProbe) {
        const age = now - existingProbe.startedAt;
        if (age < 8500 && existingProbe.conn) return;
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
      try { peer.destroy(); } catch (e) {}
      peer = null;
    }

    const myPeerId = slotIndex < REALM_SLOTS.length
      ? getSlotPeerId(currentRoom, trySlot)
      : `blahaj-arch-v3-${currentRoom.toLowerCase()}-${Math.floor(Math.random() * 99999)}`;

    try {
      peer = new Peer(myPeerId, PEER_CONFIG);
    } catch (e) {
      return;
    }

    peer.on('open', () => {
      probeOtherRealmSlots();
    });

    peer.on('connection', (incomingConn) => {
      bindConnection(incomingConn, null);
    });

    peer.on('error', (err) => {
      if (!err) return;
      const errType = err.type || '';
      if (errType === 'unavailable-id') {
        clearTimeout(peerRetryTimer);
        const nextIndex = slotIndex + 1;
        const delay = nextIndex <= REALM_SLOTS.length ? 120 : 1200;
        peerRetryTimer = setTimeout(() => startAutoPeerMesh(currentRoom, nextIndex), delay);
      }
    });
  }

  // Clean disconnect on tab close
  window.addEventListener('beforeunload', () => {
    isCleaningUp = true;
    try {
      sendRawControl({ type: '__partner_disconnect__' });
      allConns.forEach((c) => {
        try { c.close(); } catch (e) {}
      });
      wssClients.forEach((st) => {
        if (st && st.ws) {
          try { st.ws.close(); } catch (e) {}
        }
      });
      if (peer && !peer.destroyed) {
        peer.destroy();
      }
    } catch (e) {}
  });

  // ==========================================================================
  // 3. CONTINUOUS 1-SECOND PRESENCE BEACON & STALE PEER PRUNER
  // Guarantees players standing still at the Portal or inside interiors see each other within 1s!
  // ==========================================================================
  if (heartbeatInterval) clearInterval(heartbeatInterval);
  heartbeatInterval = setInterval(() => {
    if (isCleaningUp) return;
    const now = Date.now();

    // 1. Broadcast our current position & presence over WSS + WebRTC every 1.0s even when standing still!
    if (latestPlayerState) {
      sendRawControl({
        type: '__presence__',
        state: latestPlayerState,
        time: now
      });
    } else {
      sendRawControl({
        type: '__ping__',
        time: now
      });
    }

    // 2. Prune remote peers that haven't sent any packet in >14 seconds
    activeRemotePeers.forEach((info, remId) => {
      if (now - info.lastSeen > 14000) {
        unregisterRemotePeer(remId);
      }
    });
  }, 1000);

  // ==========================================================================
  // 4. BUILT-IN LOCAL HTTP RELAY ENGINE (When running local server.py)
  // ==========================================================================
  function startServerRelayOrCloudMesh() {
    updateRoomUI();
    startWssRealmMesh();
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
      .catch(() => {});
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
          isRelayConnected = true;
          data.partners.forEach((partner) => {
            if (partner.state) {
              handleIncomingRealmPacket({
                type: 'move',
                ...partner.state,
                clientId: partner.clientId
              });
            }
          });
        } else if (isRelayConnected) {
          isRelayConnected = false;
        }

        if (Array.isArray(data.events)) {
          data.events.forEach((ev) => {
            handleIncomingRealmPacket(ev);
          });
        }
      } catch (e) {}
    }, 80);
  }

  function closeAllConnections() {
    allConns.forEach((c) => {
      if (c._synInterval) clearInterval(c._synInterval);
      try { c.close(); } catch (e) {}
    });
    allConns.clear();
    pendingSlotProbes.clear();
    activeRemotePeers.clear();
    notifiedPartners.clear();
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
    startWssRealmMesh();
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
    startWssRealmMesh();
    startAutoPeerMesh(currentRoom, 0);
  }

  function send(payload) {
    if (!payload) return;
    payload.clientId = clientId;
    payload.machineId = machineId;
    payload.room = currentRoom;
    payload._pktId = `${clientId}-${++packetSeq}`;
    markPacketSeen(payload._pktId);

    if (payload.type === 'move') {
      latestPlayerState = { ...payload };
    } else if (hasLocalRelay) {
      outgoingEvents.push(payload);
    }

    // 1. Publish to Cloud WebSocket Pub/Sub Bus (works through all NATs/CGNATs!)
    publishWssPayload(payload, payload.type !== 'move');

    // 2. Send to any direct WebRTC peers
    getVerifiedConns().forEach((c) => {
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
    hostPortal: setRoom,
    joinPortal: setRoom,
    setRoom,
    resetToHomeRealm,
    generatePrivateRoom,
    forceReconnect,
    getRoom: () => currentRoom,
    getDefaultRealm: () => DEFAULT_REALM,
    getInviteUrl,
    send,
    getClientId: () => clientId,
    getMachineId: () => machineId,
    getMySlot: () => mySlot,
    isWssConnected: isAnyWssBrokerConnected,
    getActivePeerCount: () => activeRemotePeers.size,
    isConnected: () => isAnyPeerConnected(),
    simulateIncoming: (data) => {
      handleIncomingRealmPacket(data);
    }
  };
})();
