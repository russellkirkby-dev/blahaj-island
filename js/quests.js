// ============================================================================
// BLÅHAJ ISLAND — MMO QUEST GIVERS, QUEST PANEL & QUEST LOG ENGINE ([J])
// Cozy, low-pressure quests centered around the 4 Blue Shark Founders,
// Monsieur Betterave, and Tatiana & Ivanka (The Pink Guard).
// ============================================================================

window.BlahajQuests = (function () {
  'use strict';

  const STORAGE_KEY = 'blahaj_mmo_quests_v1';

  const GIVER_META = {
    solomon: {
      id: 'solomon',
      name: 'Solomon — The Star Shark',
      role: 'Keeper of the Brew · Sacred Tea House',
      portrait: 'assets/gallery/Solomon.png'
    },
    nimue: {
      id: 'nimue',
      name: 'Nimue — An Angel',
      role: 'Seam Weaver · Quiet Library & Observatory',
      portrait: 'assets/gallery/Nimue.png'
    },
    hiram: {
      id: 'hiram',
      name: 'Hiram — The Builder',
      role: 'Master of Deep Stone & Sacred Allen Key',
      portrait: 'assets/gallery/Hiram.png'
    },
    hermes: {
      id: 'hermes',
      name: 'Hermes — The Weary Guide',
      role: 'Interdimensional Traveller · Great Portal',
      portrait: 'assets/gallery/Hermes.png'
    },
    beetroot_waiter: {
      id: 'beetroot_waiter',
      name: 'Monsieur Betterave',
      role: 'Strict Maître d’ · Spherical Foods Bistro',
      portrait: 'assets/gallery/Spherical-Foods.png'
    },
    tatiana: {
      id: 'tatiana',
      name: 'Tatiana — The Pink Guard',
      role: 'Portal Sentinel (Left) · Secret Rebel',
      portrait: 'assets/gallery/Wedding-1.png'
    },
    ivanka: {
      id: 'ivanka',
      name: 'Ivanka — The Pink Guard',
      role: 'Portal Sentinel (Right) · Clipboard Keeper',
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
      desc: '“The meadow Birbs are famished! Toss them warm Breb with [B] and gather 2x Birb Guano deposits for tonight’s celebration Star Powder.”',
      hint: 'Press [B] near Birbs in the meadow, or collect glowing white Birb Guano around Heartland Meadow.',
      goal: 2,
      eventType: 'pickup_guano',
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
      desc: '“Every ingredient for a Grand Celebration Rocket is right here on the island! Roast Star Powder with me, turn a Mortar with Hiram, braid a Fuse with Nimue, and launch it from Endless Pier!”',
      hint: 'Speak with Solomon, Hiram & Nimue to craft the 3 parts, then interact with the Launch Mortar at Endless Pier.',
      goal: 1,
      eventType: 'firework_launched',
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
      desc: '“Stray sea urchins, rogue beach balls, and runaway carrots keep drifting across the shore. Use the UFO’s Tractor Beam [T] to scoop up 2 hazards and drop them cleanly into the Volcano Caldera!”',
      hint: 'Summon the UFO [U], board [E], activate Tractor Beam [T] over an enemy/toy, fly over the Volcano crater, and press [T] to disgorge.',
      goal: 2,
      eventType: 'volcano_drop',
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
      desc: '“The IKEA Spawning Pits on Erf are stacked with SKÄRHAJ Birch Flat-Packs! Portal in through the Great Gate, slip past the store lights, and liberate 2 Flat-Pack Crates (or snap-build 2 structures here).”',
      hint: 'Enter the IKEA Spawning Pits at the Great Portal Gate, or build 2 structures in Master Builder Mode [C].',
      goal: 2,
      eventType: 'spawning_heist_or_build',
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
      desc: '“Walk out to the Endless Pier to read or leave a cross-ocean note, or sail out to one of our Outer Sanctuary Islands. Even across oceans, the road home is short.”',
      hint: 'Visit the Endless Pier (SE cape) to leave/read a Pier Note, or dock at any Sanctuary Island.',
      goal: 1,
      eventType: 'pier_or_island_visit',
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
      desc: '“Flat food is STRICTLY contraband! Step inside Spherical Foods Bistro on the Southwest Bluff and inspect or savor a proper spherical delicacy to uphold culinary geometry!”',
      hint: 'Enter Spherical Foods Bistro at (-47.7, 41.0) and order/sample a dish at the rotunda.',
      goal: 1,
      eventType: 'spherical_visit_or_order',
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
      desc: '“Halt! By order of the Security Clipboard (which is totally full of official rules and definitely not blank), perform 2 ceremonial Nose-Beeps [F] to prove your plush readiness!”',
      hint: 'Press [F] twice near Tatiana, Ivanka, or any island friend to exchange ceremonial nose-beeps.',
      goal: 2,
      eventType: 'nose_beep',
      rewardLabel: '+2x Warm Breb 🥖 · +1x Party Cracker 🎉',
      rewards: { items: [{ id: 'breb', qty: 2 }, { id: 'party_favor', qty: 1 }] }
    }
  ];

  // Shared alias so both Tatiana & Ivanka can manage the Pink Guard quest
  function resolveGiverId(npcId) {
    if (npcId === 'ivanka') return 'tatiana';
    return npcId;
  }

  let state = {
    dayKey: new Date().toDateString(),
    active: {},     // questId -> { progress, acceptedAt }
    completed: {},  // questId -> { count, lastCompletedAt }
    trackedId: 'q_solomon_guano'
  };

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
    checkDailyReset();
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {}
  }

  function checkDailyReset() {
    const today = new Date().toDateString();
    if (state.dayKey !== today) {
      state.dayKey = today;
      QUEST_CATALOG.forEach((q) => {
        if (q.isDaily) {
          delete state.completed[q.id];
          if (state.active[q.id]) {
            state.active[q.id].progress = 0;
          }
        }
      });
      saveState();
    }
  }

  function isQuestCompleted(q) {
    return !!state.completed[q.id];
  }

  function isQuestActive(q) {
    return !!state.active[q.id];
  }

  function isQuestReadyToTurnIn(q) {
    const act = state.active[q.id];
    return !!(act && act.progress >= q.goal);
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

  function syncActorMarker(npcId, labelEl) {
    if (!labelEl) return;
    let badge = labelEl.querySelector('.quest-marker-badge');
    const status = getGiverStatus(npcId);
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

  function acceptQuest(questId) {
    const q = QUEST_CATALOG.find((x) => x.id === questId);
    if (!q || isQuestActive(q) || isQuestCompleted(q)) return false;
    state.active[questId] = { progress: 0, acceptedAt: Date.now() };
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

    // Grant Rewards
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
      if (q.eventType !== eventType) return;
      const act = state.active[q.id];
      if (!act) return;
      if (act.progress < q.goal) {
        act.progress = Math.min(q.goal, act.progress + amount);
        anyUpdated = true;
        if (act.progress >= q.goal) {
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
          const prog = active ? state.active[q.id].progress : (done ? q.goal : 0);

          const card = document.createElement('div');
          card.className = `qg-card${ready ? ' ready' : (active ? ' active' : (done ? ' done' : ''))}`;

          let btnHtml = '';
          if (ready) {
            btnHtml = `<button type="button" class="btn-primary qg-action-btn" data-qact="claim" data-qid="${q.id}">🏆 Turn In &amp; Claim Reward</button>`;
          } else if (active) {
            btnHtml = `<span class="qg-status-pill in-prog">⏳ In Progress (${prog}/${q.goal})</span>`;
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
            <div class="qg-hint">💡 <strong>Objective (${prog}/${q.goal}):</strong> ${q.hint}</div>
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
      const prog = mode === 'active' ? state.active[q.id].progress : (mode === 'done' ? q.goal : 0);
      const ready = mode === 'active' && prog >= q.goal;
      return `
        <div class="ql-item${ready ? ' ready' : (mode === 'done' ? ' done' : '')}">
          <div class="ql-item-head">
            <span>${q.icon} ${q.title} <small>(${giver ? giver.name.split(' — ')[0] : q.giverId})</small></span>
            <span>${mode === 'done' ? '✅ Done' : `${prog} / ${q.goal}`}</span>
          </div>
          <div class="ql-item-sub">${ready ? `✅ Ready! Return to ${giver ? giver.name.split(' — ')[0] : 'Quest Giver'} to claim ${q.rewardLabel}` : q.hint}</div>
          <div class="ql-item-rew">🎁 ${q.rewardLabel}</div>
        </div>
      `;
    }).join('');

    bodyEl.innerHTML = `
      ${worldHtml}
      <div class="ql-section">
        <h4>📜 Active Quests (${activeList.length})</h4>
        ${activeList.length ? renderList(activeList, 'active') : '<div class="ql-empty">No active NPC quests — look for gold <strong>!</strong> markers over Solomon, Nimue, Hiram, Hermes, Betterave, or the Pink Guard!</div>'}
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
    document.getElementById('btn-open-quest-log')?.addEventListener('click', toggleQuestLogModal);
    renderQuestLog();
  }

  return {
    init,
    getGiverStatus,
    syncActorMarker,
    openGiverModal,
    closeGiverModal,
    openQuestLogModal,
    closeQuestLogModal,
    toggleQuestLogModal,
    acceptQuest,
    completeAndClaimQuest,
    recordEvent,
    renderQuestLog
  };
})();
