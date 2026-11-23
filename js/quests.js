// ============================================================================
// BLÅHAJ ISLAND — MMO QUEST GIVERS, 3D GOLD MARKERS, ITEM COUNTERS & QUEST LOG
// ============================================================================

window.BlahajQuests = (function () {
  'use strict';

  const STORAGE_KEY = 'blahaj_mmo_quests_v1';

  const GIVER_META = {
    solomon: {
      id: 'solomon',
      name: 'Solomon — The Star Shark',
      role: 'Keeper of the Brew · Sacred Tea House',
      location: 'Sacred Tea House Plaza (Center Island)',
      portrait: 'assets/gallery/Solomon.png'
    },
    nimue: {
      id: 'nimue',
      name: 'Nimue — An Angel',
      role: 'Seam Weaver · Quiet Library & Observatory',
      location: 'Crust Cliffs Observatory (Northeast Cliffs)',
      portrait: 'assets/gallery/Nimue.png'
    },
    hiram: {
      id: 'hiram',
      name: 'Hiram — The Builder',
      role: 'Master of Deep Stone & Sacred Allen Key',
      location: 'Volcano Isthmus Causeway (North Road)',
      portrait: 'assets/gallery/Hiram.png'
    },
    hermes: {
      id: 'hermes',
      name: 'Hermes — The Weary Guide',
      role: 'Interdimensional Traveller · Great Portal',
      location: 'East Cape · Great Portal Gate',
      portrait: 'assets/gallery/Hermes.png'
    },
    beetroot_waiter: {
      id: 'beetroot_waiter',
      name: 'Monsieur Betterave',
      role: 'Strict Maître d’ · Spherical Foods Bistro',
      location: 'Southwest Bluff · Spherical Foods Rotunda',
      portrait: 'assets/gallery/Spherical-Foods.png'
    },
    tatiana: {
      id: 'tatiana',
      name: 'Tatiana — The Pink Guard',
      role: 'Portal Sentinel (Left) · Secret Rebel',
      location: 'East Cape · Great Portal Gate',
      portrait: 'assets/gallery/Wedding-1.png'
    },
    ivanka: {
      id: 'ivanka',
      name: 'Ivanka — The Pink Guard',
      role: 'Portal Sentinel (Right) · Clipboard Keeper',
      location: 'East Cape · Great Portal Gate',
      portrait: 'assets/gallery/Whirlings.png'
    }
  };

  const QUEST_CATALOG = [
    {
      id: 'q_solomon_guano',
      giverId: 'solomon',
      title: 'Warm Breb & Birb Guano',
      icon: '🥖',
      category: 'Cozy Gathering',
      isDaily: true,
      where: 'Heartland Birb Meadow (just west of Sacred Tea House)',
      desc: '“The meadow Birbs are famished! Toss them warm Breb with [B] and gather 2x Birb Guano deposits for tonight’s celebration Star Powder.”',
      hint: 'Press [B] near Birbs in the meadow, then pick up 2x glowing white Birb Guano deposits.',
      objectives: [
        { label: 'Birb Guano', item: 'guano', need: 2 }
      ],
      rewardLabel: '+2x Warm Breb 🥖 · +2x Flat-Pack Kits 📦 · +1x Sulfur 🟡',
      rewards: { items: [{ id: 'breb', qty: 2 }, { id: 'flatpack_crate', qty: 2 }, { id: 'sulfur', qty: 1 }] }
    },
    {
      id: 'q_solomon_fireworks',
      giverId: 'solomon',
      title: 'Helen’s Celebration Fireworks',
      icon: '🎆',
      category: 'Pyrotechnics',
      isDaily: false,
      where: 'Solomon (Tea House), Hiram (Volcano Road), Nimue (Cliffs) → Endless Pier (SE)',
      desc: '“Every ingredient for a Grand Celebration Rocket is right here on the island! Roast Star Powder with me, turn a Mortar with Hiram, braid a Fuse with Nimue, and launch it from Endless Pier!”',
      hint: 'Craft all 3 pyrotechnic parts with Solomon, Hiram & Nimue, then launch at the Endless Pier Mortar.',
      objectives: [
        { label: 'Star Powder (Solomon: 1x Guano + 1x Sulfur)', item: 'star_powder', need: 1 },
        { label: 'Launch Mortar Shell (Hiram: 2x Driftwood or 1x Obsidian)', item: 'mortar_tube', need: 1 },
        { label: 'Twisted Star Fuse (Nimue: 2x Birb Down or 2x Plush Fluff)', item: 'braided_fuse', need: 1 },
        { label: 'Launch Rocket from Endless Pier Mortar', eventType: 'firework_launched', need: 1 }
      ],
      rewardLabel: '+2x Firework Rockets 🎆 · +3x Flat-Packs 📦 · +2 Trial Pts ⚔️',
      rewards: { items: [{ id: 'firework_rocket', qty: 2 }, { id: 'flatpack_crate', qty: 3 }], trialPoints: 2 }
    },
    {
      id: 'q_nimue_volcano_cleanup',
      giverId: 'nimue',
      title: 'Volcanic Trash & Hazard Cleanup',
      icon: '🌋',
      category: 'UFO Tractor Beam',
      isDaily: true,
      where: 'Anywhere on Island → Main Volcano Caldera (North)',
      desc: '“Stray sea urchins, rogue beach balls, and runaway carrots keep drifting across the shore. Use the UFO’s Tractor Beam [T] to scoop up 2 hazards and drop them cleanly into the Volcano Caldera!”',
      hint: 'Summon UFO [U], board [E], Tractor Beam [T] over a hazard/toy, fly over the Volcano crater, and press [T] to drop it in.',
      objectives: [
        { label: 'Hazards/Toys Dropped into Volcano Caldera', eventType: 'volcano_drop', need: 2 }
      ],
      rewardLabel: '+3x Flat-Pack Kits 📦 · +1x Starlight Quartz 💎',
      rewards: { items: [{ id: 'flatpack_crate', qty: 3 }, { id: 'starlight_quartz', qty: 1 }] }
    },
    {
      id: 'q_hiram_spawning_heist',
      giverId: 'hiram',
      title: 'Nighttime Spawning-Pit Heist',
      icon: '📦',
      category: 'Instanced Hijinks',
      isDaily: true,
      where: 'Great Portal Gate (East Cape) → IKEA Spawning Pits of Erf',
      desc: '“The IKEA Spawning Pits on Erf are stacked with SKÄRHAJ Birch Flat-Packs! Portal in through the Great Gate, slip past the store lights, and liberate 2 Flat-Pack Crates (or snap-build 2 structures here).”',
      hint: 'Enter the IKEA Spawning Pits at the Great Portal Gate, or build 2 structures in Master Builder Mode [C].',
      objectives: [
        { label: 'Flat-Pack Crates Liberated / Structures Built', eventType: 'spawning_heist_or_build', need: 2 }
      ],
      rewardLabel: '+3x Flat-Pack Kits 📦 · +1 Trial Point ⚔️',
      rewards: { items: [{ id: 'flatpack_crate', qty: 3 }], trialPoints: 1 }
    },
    {
      id: 'q_hermes_between_route',
      giverId: 'hermes',
      title: 'Different Shores, Same Ocean',
      icon: '🌀',
      category: 'Exploration',
      isDaily: false,
      where: 'Endless Pier (Southeast Cape) or any Outer Sanctuary Island',
      desc: '“Walk out to the Endless Pier to read or leave a cross-ocean note, or sail out to one of our Outer Sanctuary Islands. Even across oceans, the road home is short.”',
      hint: 'Visit the Endless Pier (SE cape) to leave/read a Pier Note, or dock at any Sanctuary Island.',
      objectives: [
        { label: 'Visit Endless Pier or Outer Sanctuary Island', eventType: 'pier_or_island_visit', need: 1 }
      ],
      rewardLabel: '+2x Flat-Pack Kits 📦 · +2x Warm Breb 🥖',
      rewards: { items: [{ id: 'flatpack_crate', qty: 2 }, { id: 'breb', qty: 2 }] }
    },
    {
      id: 'q_betterave_spherical',
      giverId: 'beetroot_waiter',
      title: 'The Spherical Mandate',
      icon: '🧆',
      category: 'Contraband Enforcement',
      isDaily: true,
      where: 'Spherical Foods Bistro (Southwest Bluff at -47.7, 41.0)',
      desc: '“Flat food is STRICTLY contraband! Step inside Spherical Foods Bistro on the Southwest Bluff and inspect or savor a proper spherical delicacy to uphold culinary geometry!”',
      hint: 'Enter Spherical Foods Bistro at (-47.7, 41.0) and order/sample a dish at the rotunda.',
      objectives: [
        { label: 'Inspect Spherical Foods Bistro', eventType: 'spherical_visit_or_order', need: 1 }
      ],
      rewardLabel: '+2x Midnight Köttbullar 🧆 · +2x Flat-Pack Kits 📦',
      rewards: { items: [{ id: 'kottbullar_feast', qty: 2 }, { id: 'flatpack_crate', qty: 2 }] }
    },
    {
      id: 'q_pinkguard_inspection',
      giverId: 'tatiana',
      title: 'Pink Guard Clipboard Inspection',
      icon: '📋',
      category: 'Ceremonial Patrol',
      isDaily: true,
      where: 'Great Portal Gate (East Cape, near Tatiana & Ivanka)',
      desc: '“Halt! By order of the Security Clipboard (which is totally full of official rules and definitely not blank), perform 2 ceremonial Nose-Beeps [F] to prove your plush readiness!”',
      hint: 'Press [F] twice near Tatiana, Ivanka, or any island friend to exchange ceremonial nose-beeps.',
      objectives: [
        { label: 'Ceremonial Nose-Beeps [F]', eventType: 'nose_beep', need: 2 }
      ],
      rewardLabel: '+2x Warm Breb 🥖 · +1x Party Cracker 🎉',
      rewards: { items: [{ id: 'breb', qty: 2 }, { id: 'party_favor', qty: 1 }] }
    }
  ];

  function resolveGiverId(npcId) {
    if (npcId === 'ivanka') return 'tatiana';
    return npcId;
  }

  let state = {
    dayKey: new Date().toDateString(),
    active: {},     // questId -> { events: { eventType: count }, acceptedAt }
    completed: {},  // questId -> { count, lastCompletedAt }
    trackedId: 'q_solomon_guano'
  };

  const markerTexCache = {};
  const actorSprites = [];

  function getMarkerTexture(status) {
    if (markerTexCache[status]) return markerTexCache[status];
    if (typeof THREE === 'undefined') return null;

    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 128, 128);

    const isGold = status === 'available' || status === 'turnin';
    const symbol = status === 'available' ? '!' : '?';

    // Outer glow aura
    const grad = ctx.createRadialGradient(64, 64, 12, 64, 64, 58);
    if (isGold) {
      grad.addColorStop(0, 'rgba(253, 224, 71, 0.72)');
      grad.addColorStop(0.55, 'rgba(245, 158, 11, 0.35)');
      grad.addColorStop(1, 'rgba(245, 158, 11, 0)');
    } else {
      grad.addColorStop(0, 'rgba(148, 163, 184, 0.45)');
      grad.addColorStop(1, 'rgba(148, 163, 184, 0)');
    }
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(64, 64, 58, 0, Math.PI * 2);
    ctx.fill();

    // Bold classic MMO symbol with dark outline + bright gold fill
    ctx.font = '900 94px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 12;
    ctx.strokeStyle = '#1e1b09';
    ctx.strokeText(symbol, 64, 68);

    ctx.fillStyle = isGold ? '#fde047' : '#cbd5e1';
    ctx.fillText(symbol, 64, 68);

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    markerTexCache[status] = tex;
    return tex;
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          state = Object.assign(state, parsed);
        }
      }
    } catch (e) {}
    checkDailyReset(true);
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {}
  }

  let lastDailyCheckAt = 0;
  function checkDailyReset(force = false) {
    const nowMs = performance.now();
    if (!force && nowMs - lastDailyCheckAt < 10000) return;
    lastDailyCheckAt = nowMs;
    const today = new Date().toDateString();
    if (state.dayKey !== today) {
      state.dayKey = today;
      QUEST_CATALOG.forEach((q) => {
        if (q.isDaily) {
          delete state.completed[q.id];
          if (state.active[q.id]) {
            state.active[q.id].events = {};
          }
        }
      });
      saveState();
    }
  }

  function getInventoryCount(itemId) {
    if (window.player && window.player.inventory && typeof window.player.inventory.getItemCount === 'function') {
      return window.player.inventory.getItemCount(itemId) || 0;
    }
    return 0;
  }

  function getObjectiveCount(q, obj) {
    if (obj.item) {
      return Math.min(obj.need, getInventoryCount(obj.item));
    }
    const act = state.active[q.id];
    if (!act) return 0;
    const evMap = act.events || {};
    const val = evMap[obj.eventType] || (typeof act.progress === 'number' ? act.progress : 0);
    return Math.min(obj.need, val);
  }

  function isQuestCompleted(q) {
    return !!state.completed[q.id];
  }

  function isQuestActive(q) {
    return !!state.active[q.id];
  }

  function isQuestReadyToTurnIn(q) {
    if (!state.active[q.id]) return false;
    return q.objectives.every((obj) => getObjectiveCount(q, obj) >= obj.need);
  }

  function getQuestsForGiver(npcId) {
    const gid = resolveGiverId(npcId);
    return QUEST_CATALOG.filter((q) => q.giverId === gid);
  }

  function getGiverStatus(npcId) {
    checkDailyReset();
    const list = getQuestsForGiver(npcId);
    if (!list.length) return null;
    if (list.some((q) => isQuestReadyToTurnIn(q))) return 'turnin';
    if (list.some((q) => !isQuestActive(q) && !isQuestCompleted(q))) return 'available';
    if (list.some((q) => isQuestActive(q))) return 'progress';
    return null;
  }

  function syncActorMarker(npcId, labelEl, actorMesh = null) {
    const status = getGiverStatus(npcId);

    // 1. Update 3D Overhead Gold ! / ? Sprite (Visible from far across the island!)
    if (actorMesh && typeof THREE !== 'undefined') {
      let sprite = actorMesh.userData._questMarkerSprite;
      if (!sprite && status) {
        const mat = new THREE.SpriteMaterial({
          map: getMarkerTexture(status),
          transparent: true,
          depthWrite: false
        });
        sprite = new THREE.Sprite(mat);
        sprite.position.set(0, 3.65, 0);
        sprite.scale.set(1.45, 1.45, 1);
        actorMesh.add(sprite);
        actorMesh.userData._questMarkerSprite = sprite;
        actorSprites.push(sprite);
      }
      if (sprite && sprite.userData._lastStatus !== status) {
        sprite.userData._lastStatus = status;
        if (!status) {
          sprite.visible = false;
        } else {
          sprite.visible = true;
          sprite.material.map = getMarkerTexture(status);
          sprite.material.needsUpdate = true;
        }
      }
    }

    // 2. Keep compact nameplate badge synced only when status changes
    if (!labelEl) return;
    if (labelEl._lastQuestStatus === status) return;
    labelEl._lastQuestStatus = status;

    let badge = labelEl.querySelector('.quest-marker-badge');
    if (!status) {
      if (badge) badge.style.display = 'none';
      return;
    }
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'quest-marker-badge';
      labelEl.insertBefore(badge, labelEl.firstChild);
    }
    badge.style.display = 'inline-flex';
    badge.className = `quest-marker-badge qm-${status}`;
    badge.textContent = status === 'available' ? '!' : '?';
  }

  function update(elapsed) {
    for (let i = 0; i < actorSprites.length; i++) {
      const sp = actorSprites[i];
      if (sp && sp.visible) {
        sp.position.y = 3.65 + Math.sin(elapsed * 3.2 + i * 0.9) * 0.16;
      }
    }
  }

  function acceptQuest(questId) {
    const q = QUEST_CATALOG.find((x) => x.id === questId);
    if (!q || isQuestActive(q) || isQuestCompleted(q)) return false;
    state.active[questId] = { events: {}, acceptedAt: Date.now() };
    state.trackedId = questId;
    saveState();
    if (window.CozyAudio && window.CozyAudio.portalChime) window.CozyAudio.portalChime();
    if (window.showToast) {
      window.showToast(`📜 QUEST ACCEPTED: ${q.title}`, q.hint);
    }
    if (window.BlahajGame && typeof window.BlahajGame.addChatLog === 'function') {
      window.BlahajGame.addChatLog(`📜 <strong>Quest Accepted:</strong> ${q.icon} ${q.title}`, 'lore');
    }
    renderQuestLog();
    return true;
  }

  function completeAndClaimQuest(questId) {
    const q = QUEST_CATALOG.find((x) => x.id === questId);
    if (!q || !isQuestReadyToTurnIn(q)) return false;
    delete state.active[questId];
    const prev = state.completed[questId] || { count: 0 };
    state.completed[questId] = { count: prev.count + 1, lastCompletedAt: Date.now() };

    const p = window.player;
    if (p && p.inventory && q.rewards && Array.isArray(q.rewards.items)) {
      q.rewards.items.forEach((it) => {
        p.inventory.addItem(it.id, it.qty || 1);
      });
    }
    if (p && q.rewards && q.rewards.trialPoints) {
      p.trialPoints = (p.trialPoints || 0) + q.rewards.trialPoints;
    }
    saveState();

    if (window.CozyAudio && window.CozyAudio.bistroChime) window.CozyAudio.bistroChime();
    if (window.showToast) {
      window.showToast(`🏆 QUEST COMPLETED: ${q.title}!`, `Claimed: ${q.rewardLabel}`);
    }
    if (window.BlahajGame && typeof window.BlahajGame.addChatLog === 'function') {
      window.BlahajGame.addChatLog(`🏆 <strong>Quest Completed:</strong> ${q.icon} ${q.title} — ${q.rewardLabel}`, 'success');
    }
    if (window._blahajRenderFinBelt) window._blahajRenderFinBelt();
    if (window.BlahajGame && typeof window.BlahajGame.updateMetersUI === 'function') {
      window.BlahajGame.updateMetersUI();
    }
    renderQuestLog();
    return true;
  }

  function recordEvent(eventType, amount = 1) {
    checkDailyReset();
    let anyUpdated = false;
    QUEST_CATALOG.forEach((q) => {
      const act = state.active[q.id];
      if (!act) return;
      const obj = q.objectives.find((o) => o.eventType === eventType);
      if (!obj) return;
      if (!act.events) act.events = {};
      const cur = act.events[eventType] || 0;
      if (cur < obj.need) {
        act.events[eventType] = Math.min(obj.need, cur + amount);
        anyUpdated = true;
        if (isQuestReadyToTurnIn(q)) {
          if (window.CozyAudio && window.CozyAudio.portalChime) window.CozyAudio.portalChime();
          if (window.showToast) {
            const giver = GIVER_META[q.giverId];
            window.showToast(
              `✅ QUEST READY: ${q.title}`,
              `Return to ${giver ? giver.name.split(' — ')[0] : 'Quest Giver'} to claim ${q.rewardLabel}!`
            );
          }
        }
      }
    });
    if (anyUpdated) {
      saveState();
      renderQuestLog();
    }
  }

  function renderObjectivesHtml(q, showFull = true) {
    const done = isQuestCompleted(q);
    return q.objectives.map((obj) => {
      const have = done ? obj.need : (obj.item ? getInventoryCount(obj.item) : getObjectiveCount(q, obj));
      const clamped = Math.min(obj.need, have);
      const met = have >= obj.need;
      const needMore = Math.max(0, obj.need - have);
      const countText = met
        ? `✅ ${have} / ${obj.need}`
        : `${clamped} / ${obj.need}${showFull ? ` (Need ${needMore} more)` : ''}`;
      return `
        <div class="q-obj-row${met ? ' met' : ''}">
          <span>${met ? '✔' : '○'} ${obj.label}</span>
          <strong class="q-obj-count">${countText}</strong>
        </div>
      `;
    }).join('');
  }

  function openGiverModal(npcId) {
    checkDailyReset();
    const gid = resolveGiverId(npcId);
    const giver = GIVER_META[npcId] || GIVER_META[gid];
    const quests = getQuestsForGiver(npcId);
    const modal = document.getElementById('quest-giver-modal');
    if (!modal || !giver) return;

    const portraitEl = document.getElementById('qg-portrait');
    const nameEl = document.getElementById('qg-name');
    const roleEl = document.getElementById('qg-role');
    const listEl = document.getElementById('qg-quest-list');
    if (portraitEl) portraitEl.src = giver.portrait;
    if (nameEl) nameEl.textContent = giver.name;
    if (roleEl) roleEl.textContent = giver.role;

    if (listEl) {
      listEl.innerHTML = '';
      if (!quests.length) {
        listEl.innerHTML = '<div class="qg-empty">No quests available right now.</div>';
      } else {
        quests.forEach((q) => {
          const active = isQuestActive(q);
          const ready = isQuestReadyToTurnIn(q);
          const done = isQuestCompleted(q);

          const card = document.createElement('div');
          card.className = `qg-card${ready ? ' ready' : (active ? ' active' : (done ? ' done' : ''))}`;

          let btnHtml = '';
          if (ready) {
            btnHtml = `<button type="button" class="btn-primary qg-action-btn" data-qact="claim" data-qid="${q.id}">🏆 Turn In &amp; Claim Reward</button>`;
          } else if (active) {
            btnHtml = `<span class="qg-status-pill in-prog">⏳ In Progress</span>`;
          } else if (done) {
            btnHtml = `<span class="qg-status-pill completed">✅ Completed${q.isDaily ? ' Today' : ''}</span>`;
          } else {
            btnHtml = `<button type="button" class="btn-primary qg-action-btn" data-qact="accept" data-qid="${q.id}">📜 Accept Quest</button>`;
          }

          card.innerHTML = `
            <div class="qg-card-head">
              <span class="qg-card-title">${q.icon} ${q.title}</span>
              <span class="qg-badge">${q.isDaily ? 'Daily' : 'Story'} · ${q.category}</span>
            </div>
            <p class="qg-desc">${q.desc}</p>
            <div class="q-obj-list">${renderObjectivesHtml(q, true)}</div>
            <div class="qg-footer">
              <span class="qg-reward">🎁 ${q.rewardLabel}</span>
              ${btnHtml}
            </div>
          `;
          listEl.appendChild(card);
        });

        listEl.querySelectorAll('.qg-action-btn').forEach((btn) => {
          btn.addEventListener('click', () => {
            const act = btn.dataset.qact;
            const qid = btn.dataset.qid;
            if (act === 'accept') acceptQuest(qid);
            else if (act === 'claim') completeAndClaimQuest(qid);
            openGiverModal(npcId);
          });
        });
      }
    }

    modal.classList.remove('hidden');
    if (window._blahajSyncCaptureUI) window._blahajSyncCaptureUI();
  }

  function closeGiverModal() {
    const modal = document.getElementById('quest-giver-modal');
    if (modal) modal.classList.add('hidden');
    if (window._blahajSyncCaptureUI) window._blahajSyncCaptureUI();
  }

  function openQuestDetailModal(questId) {
    const q = QUEST_CATALOG.find((x) => x.id === questId);
    const modal = document.getElementById('quest-detail-modal');
    if (!q || !modal) return;
    const giver = GIVER_META[q.giverId];
    const active = isQuestActive(q);
    const ready = isQuestReadyToTurnIn(q);
    const done = isQuestCompleted(q);

    const portraitEl = document.getElementById('qd-portrait');
    const titleEl = document.getElementById('qd-title');
    const giverEl = document.getElementById('qd-giver');
    const whereEl = document.getElementById('qd-where');
    const descEl = document.getElementById('qd-desc');
    const objEl = document.getElementById('qd-objectives');
    const hintEl = document.getElementById('qd-hint');
    const rewEl = document.getElementById('qd-reward');
    const statusEl = document.getElementById('qd-status');

    if (portraitEl && giver) portraitEl.src = giver.portrait;
    if (titleEl) titleEl.textContent = `${q.icon} ${q.title}`;
    if (giverEl && giver) giverEl.textContent = `Quest Giver: ${giver.name} (${giver.role})`;
    if (whereEl) whereEl.textContent = `📍 Location: ${q.where || (giver && giver.location) || 'Blåhaj Island'}`;
    if (descEl) descEl.textContent = q.desc;
    if (objEl) objEl.innerHTML = renderObjectivesHtml(q, true);
    if (hintEl) hintEl.textContent = `💡 How to complete: ${q.hint}`;
    if (rewEl) rewEl.textContent = `🎁 Rewards: ${q.rewardLabel}`;
    if (statusEl) {
      statusEl.textContent = ready
        ? `✅ Ready to Turn In! Return to ${giver ? giver.name.split(' — ')[0] : 'Quest Giver'}.`
        : (active ? '⏳ Quest Active' : (done ? '🏆 Completed' : '❗ Available — Visit Quest Giver to Accept'));
    }

    modal.classList.remove('hidden');
    if (window._blahajSyncCaptureUI) window._blahajSyncCaptureUI();
  }

  function closeQuestDetailModal() {
    const modal = document.getElementById('quest-detail-modal');
    if (modal) modal.classList.add('hidden');
    if (window._blahajSyncCaptureUI) window._blahajSyncCaptureUI();
  }

  function renderQuestLog() {
    const bodyEl = document.getElementById('quest-log-body');
    if (!bodyEl) return;
    checkDailyReset();

    const seamState = window.BlahajSeam ? window.BlahajSeam.getState() : null;
    const worldHtml = seamState ? `
      <div class="ql-section">
        <h4>🌍 Daily World Events</h4>
        <div class="ql-item ${seamState.mendedCount >= seamState.totalRifts ? 'done' : ''}">
          <div class="ql-item-head">
            <span>🪡 Daily Great Seam Maintenance</span>
            <span>${seamState.mendedCount} / ${seamState.totalRifts} Rifts</span>
          </div>
          <div class="ql-item-sub">Stitch the 6 cosmic rifts across the island once per day to keep reality cozy.</div>
        </div>
        ${seamState.state === 'incursion' ? `
        <div class="ql-item alert">
          <div class="ql-item-head">
            <span>🚨 Incursion Cleanup (Active!)</span>
            <span>${seamState.invadersBanished} / ${seamState.invadersNeeded} Expelled</span>
          </div>
          <div class="ql-item-sub">Boop Sea Invaders back into the ocean OR abduct them with the UFO Tractor Beam and drop them into the Volcano!</div>
        </div>` : ''}
      </div>
    ` : '';

    const activeList = QUEST_CATALOG.filter((q) => isQuestActive(q));
    const availableList = QUEST_CATALOG.filter((q) => !isQuestActive(q) && !isQuestCompleted(q));
    const completedList = QUEST_CATALOG.filter((q) => isQuestCompleted(q));

    const renderList = (items, mode) => items.map((q) => {
      const giver = GIVER_META[q.giverId];
      const ready = mode === 'active' && isQuestReadyToTurnIn(q);
      const summaryCounts = q.objectives.map((o) => {
        const have = mode === 'done' ? o.need : (o.item ? getInventoryCount(o.item) : getObjectiveCount(q, o));
        return `${Math.min(o.need, have)}/${o.need}`;
      }).join(' · ');

      return `
        <div class="ql-item${ready ? ' ready' : (mode === 'done' ? ' done' : '')}" data-qid="${q.id}" title="Double-click for full Quest Dialogue, Location &amp; Item Checklist">
          <div class="ql-item-head">
            <span>${q.icon} ${q.title} <small>(${giver ? giver.name.split(' — ')[0] : q.giverId})</small></span>
            <span>${mode === 'done' ? '✅ Done' : (ready ? '✅ Ready!' : summaryCounts)}</span>
          </div>
          <div class="q-obj-list">${renderObjectivesHtml(q, true)}</div>
          <div class="ql-item-rew">🎁 ${q.rewardLabel} <span class="ql-dbl-hint">· Double-click for details</span></div>
        </div>
      `;
    }).join('');

    bodyEl.innerHTML = `
      ${worldHtml}
      <div class="ql-section">
        <h4>📜 Active Quests (${activeList.length})</h4>
        ${activeList.length ? renderList(activeList, 'active') : '<div class="ql-empty">No active NPC quests — look for big gold <strong>!</strong> markers floating over Solomon, Nimue, Hiram, Hermes, Betterave, or the Pink Guard!</div>'}
      </div>
      <div class="ql-section">
        <h4>❗ Available from Quest Givers (${availableList.length})</h4>
        ${availableList.length ? renderList(availableList, 'avail') : '<div class="ql-empty">All available quests accepted!</div>'}
      </div>
      <div class="ql-section">
        <h4>🏆 Completed (${completedList.length})</h4>
        ${completedList.length ? renderList(completedList, 'done') : '<div class="ql-empty">None completed yet today.</div>'}
      </div>
    `;

    bodyEl.querySelectorAll('.ql-item[data-qid]').forEach((el) => {
      el.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        openQuestDetailModal(el.dataset.qid);
      });
    });
  }

  function openQuestLogModal() {
    renderQuestLog();
    const m = document.getElementById('quest-log-modal');
    if (m) m.classList.remove('hidden');
    if (window._blahajSyncCaptureUI) window._blahajSyncCaptureUI();
  }

  function closeQuestLogModal() {
    const m = document.getElementById('quest-log-modal');
    if (m) m.classList.add('hidden');
    if (window._blahajSyncCaptureUI) window._blahajSyncCaptureUI();
  }

  function toggleQuestLogModal() {
    const m = document.getElementById('quest-log-modal');
    if (!m) return;
    if (m.classList.contains('hidden')) openQuestLogModal();
    else closeQuestLogModal();
  }

  function init() {
    loadState();
    document.getElementById('close-quest-giver-modal')?.addEventListener('click', closeGiverModal);
    document.getElementById('btn-qg-close')?.addEventListener('click', closeGiverModal);
    document.getElementById('close-quest-log-modal')?.addEventListener('click', closeQuestLogModal);
    document.getElementById('btn-ql-close')?.addEventListener('click', closeQuestLogModal);
    document.getElementById('close-quest-detail-modal')?.addEventListener('click', closeQuestDetailModal);
    document.getElementById('btn-qd-close')?.addEventListener('click', closeQuestDetailModal);
    document.getElementById('btn-open-quest-log')?.addEventListener('click', toggleQuestLogModal);
    renderQuestLog();
  }

  return {
    init,
    update,
    getGiverStatus,
    syncActorMarker,
    openGiverModal,
    closeGiverModal,
    openQuestDetailModal,
    closeQuestDetailModal,
    openQuestLogModal,
    closeQuestLogModal,
    toggleQuestLogModal,
    acceptQuest,
    completeAndClaimQuest,
    recordEvent,
    renderQuestLog
  };
})();
