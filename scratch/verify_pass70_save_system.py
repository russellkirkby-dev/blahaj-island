import os
import sys
import time
import json
import urllib.request
import subprocess

sys.stdout.reconfigure(encoding='utf-8')
sys.path.append(r"C:\Users\Russell\.gemini\antigravity\scratch\blahaj-island\scratch")
from verify_mouse_and_grass import SimpleCDP

PORT = 9350
EDGE_PATH = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
GAME_URL = "http://localhost:8080/index.html?v=5.5"
ARTIFACT_DIR = r"C:\Users\Russell\.gemini\antigravity\brain\7f34ffd7-be93-466a-942f-2e3d6aecb7a2"

def main():
    user_data = os.path.join(os.environ.get("TEMP", r"C:\Temp"), f"edge_saves_{int(time.time())}")
    edge = subprocess.Popen([
        EDGE_PATH,
        f"--remote-debugging-port={PORT}",
        f"--user-data-dir={user_data}",
        "--headless=new",
        "--disable-gpu",
        "--window-size=1280,720",
        GAME_URL
    ])
    time.sleep(2.5)

    try:
        req = urllib.request.urlopen(f"http://localhost:{PORT}/json")
        tabs = json.loads(req.read().decode())
        ws_url = next(t for t in tabs if t.get("type") == "page")["webSocketDebuggerUrl"]
        cdp = SimpleCDP(ws_url)
        cdp.sock.settimeout(30)

        # Wait for loading screen
        for i in range(50):
            pct = cdp.eval("(() => document.getElementById('game-loading-pct')?.textContent || '0%')()")
            if pct == "100%":
                break
            time.sleep(0.2)

        cdp.eval("(() => document.getElementById('btn-enter-game')?.click())()")
        time.sleep(1.5)

        # 1. Verify BlahajSaveSystem is initialized
        save_init = cdp.eval("""
            (() => {
                const sys = window.BlahajSaveSystem;
                if (!sys) return null;
                const state = sys.getSaveState();
                return {
                    activeSlot: sys.getActiveSlot(),
                    passportId: state?.profile?.passportId || null,
                    displayName: state?.profile?.displayName || null,
                    version: state?.version || 0
                };
            })()
        """)
        print("SaveSystem initialized:", json.dumps(save_init, indent=2))
        assert save_init is not None, "window.BlahajSaveSystem must be initialized"
        assert save_init['version'] == 1, "Save state version must be 1"
        assert save_init['passportId'] and save_init['passportId'].startswith('SHK-'), "Valid passport ID required"

        # 2. Modify player inventory & equip held item
        print("\n--- Modifying Player Inventory & State ---")
        cdp.eval("""
            (() => {
                const p = window.BlahajGame.getPlayer();
                const inv = window.BlahajGame.getPlayerInventory();
                if (inv) {
                    inv.addItem('obsidian', 3);
                    inv.addItem('sulfur', 5);
                }
                window.BlahajGame.equipHeldItem('seam_detector');
                window.BlahajSaveSystem.saveNow();
            })()
        """)
        time.sleep(0.5)

        # Check saved state in storage
        stored_check = cdp.eval("""
            (() => {
                const state = window.BlahajSaveSystem.getSaveState();
                const inv = window.BlahajGame.getPlayerInventory();
                return {
                    heldItem: state.inventory.heldItemId,
                    hasObsidian: inv.hasItem('obsidian', 3),
                    hasSulfur: inv.hasItem('sulfur', 5),
                    slot1Raw: !!localStorage.getItem('blahaj_save_slot_1')
                };
            })()
        """)
        print("Storage check after modification:", json.dumps(stored_check, indent=2))
        assert stored_check['heldItem'] == 'seam_detector', "Held item should be seam_detector in save"
        assert stored_check['hasObsidian'], "Inventory must contain 3 obsidian"
        assert stored_check['slot1Raw'], "localStorage must have blahaj_save_slot_1"

        # 3. Open Settings Modal and switch to Passport tab
        print("\n--- Testing Settings Passport & Google Account Tab ---")
        cdp.eval("""
            (() => {
                window.BlahajGame.openSettingsModal();
                const tab = document.querySelector('#settings-tabs button[data-tab="passport"]');
                if (tab) tab.click();
            })()
        """)
        time.sleep(0.5)

        passport_ui = cdp.eval("""
            (() => {
                const panel = document.getElementById('panel-passport');
                const idEl = document.getElementById('passport-id-badge');
                const sharkEl = document.getElementById('passport-shark-name');
                const slots = document.querySelectorAll('#passport-slots-grid .save-slot-card');
                return {
                    panelVisible: panel && !panel.classList.contains('hidden'),
                    passportIdText: idEl?.textContent || '',
                    sharkNameText: sharkEl?.textContent || '',
                    slotsCount: slots.length
                };
            })()
        """)
        print("Passport UI check:", json.dumps(passport_ui, indent=2))
        assert passport_ui['panelVisible'], "Passport panel must be active and visible"
        assert passport_ui['slotsCount'] == 3, f"Expected 3 save slot cards, got {passport_ui['slotsCount']}"

        # 4. Test Google Sign-in linking
        print("\n--- Testing Google Sign-in Integration ---")
        cdp.eval("""
            (() => {
                window.BlahajSaveSystem.simulateGoogleSignIn('russell.explorer@gmail.com', 'Russell Kirkby');
            })()
        """)
        time.sleep(0.6)

        google_check = cdp.eval("""
            (() => {
                const state = window.BlahajSaveSystem.getSaveState();
                const gAcc = state?.profile?.googleAccount;
                const statusCard = document.getElementById('google-account-status');
                return {
                    linked: !!gAcc,
                    email: gAcc?.email || '',
                    name: gAcc?.name || '',
                    statusCardText: statusCard?.textContent || ''
                };
            })()
        """)
        print("Google account link check:", json.dumps(google_check, indent=2))
        assert google_check['linked'], "Google account should be linked in save state"
        assert google_check['email'] == 'russell.explorer@gmail.com', "Expected linked email"
        assert "Google Cloud Sync Linked" in google_check['statusCardText'], "UI status card must show cloud sync badge"

        # Capture screenshot of Passport & Google Account card
        screenshot_path = cdp.screenshot("pass70_island_passport_and_google_account.jpg")
        print(f"Captured screenshot: {screenshot_path}")

        # 5. Verify Persistence: Restore from save
        print("\n--- Testing Save Restoration (Re-entry simulation) ---")
        restore_check = cdp.eval("""
            (() => {
                // Clear sulfur in memory to simulate fresh start without saved item
                const inv = window.BlahajGame.getPlayerInventory();
                inv.removeItem('sulfur', 5);
                const beforeRestoreSulfur = inv.getItemCount('sulfur');

                // Now restore from the active save state
                const save = window.BlahajSaveSystem.getSaveState();
                window.BlahajSaveSystem.restoreGameFromSave(save);

                return {
                    clearedBefore: beforeRestoreSulfur === 0,
                    restoredObsidianCount: inv.getItemCount('obsidian'),
                    restoredSulfurCount: inv.getItemCount('sulfur'),
                    activeHeldItem: window.BlahajGame.getActiveHeldItem()
                };
            })()
        """)
        print("Restoration check:", json.dumps(restore_check, indent=2))
        assert restore_check['clearedBefore'], "Sulfur should have been cleared prior to restore"
        assert restore_check['restoredObsidianCount'] >= 7, f"Obsidian count should be at least 7, got {restore_check['restoredObsidianCount']}"
        assert restore_check['restoredSulfurCount'] == 5, f"Sulfur count should be 5, got {restore_check['restoredSulfurCount']}"
        assert restore_check['activeHeldItem'] == 'seam_detector', "Held item must be restored"

        print("\n=== PASS 70 SAVE SYSTEM & GOOGLE ACCOUNT VERIFICATION SUCCESSFUL! ===")

    finally:
        try:
            edge.terminate()
            edge.wait(timeout=3)
        except Exception:
            pass

if __name__ == '__main__':
    main()
