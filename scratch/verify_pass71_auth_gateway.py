import os
import sys
import time
import json
import urllib.request
import subprocess

sys.stdout.reconfigure(encoding='utf-8')
sys.path.append(r"C:\Users\Russell\.gemini\antigravity\scratch\blahaj-island\scratch")
from verify_mouse_and_grass import SimpleCDP

PORT = 9360
EDGE_PATH = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
GAME_URL = "http://localhost:8080/index.html?v=5.6"
ARTIFACT_DIR = r"C:\Users\Russell\.gemini\antigravity\brain\7f34ffd7-be93-466a-942f-2e3d6aecb7a2"

def main():
    user_data = os.path.join(os.environ.get("TEMP", r"C:\Temp"), f"edge_auth_{int(time.time())}")
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

        # Wait for loading to reach 100%
        print("\n--- 1. Waiting for Game Assets to Load ---")
        for i in range(50):
            pct = cdp.eval("(() => document.getElementById('game-loading-pct')?.textContent || '0%')()")
            if pct == "100%":
                break
            time.sleep(0.2)

        time.sleep(1.0)

        # 2. Check Launch Gateway Visibility & Initial Guest Mode
        print("\n--- 2. Checking Pre-Game Launch Gateway ---")
        gateway_state = cdp.eval("""
            (() => {
                const panel = document.getElementById('launch-gateway-panel');
                const accountStrip = document.getElementById('launch-account-strip');
                const slotBadge = document.getElementById('launch-slot-badge');
                const embarkBtn = document.getElementById('btn-enter-game');
                const embarkText = document.getElementById('launch-embark-text');
                return {
                    gatewayVisible: panel && !panel.classList.contains('hidden'),
                    accountText: accountStrip?.textContent?.trim() || '',
                    slotText: slotBadge?.textContent?.trim() || '',
                    embarkBtnVisible: embarkBtn && !embarkBtn.classList.contains('hidden'),
                    embarkMainText: embarkText?.textContent?.trim() || ''
                };
            })()
        """)
        print("Launch Gateway Initial State:", json.dumps(gateway_state, indent=2))
        assert gateway_state['gatewayVisible'], "Launch gateway panel must be visible at 100% loading"
        assert "Guest Explorer" in gateway_state['accountText'], "Default mode must be Guest Explorer"
        assert "Slot 1" in gateway_state['slotText'], "Active slot must show Slot 1"
        assert "EMBARK AS GUEST" in gateway_state['embarkMainText'], "Button must indicate loading browser save as guest"

        # 3. Test Opening Google Connect Modal
        print("\n--- 3. Testing Google Connect & Account Setup Modal ---")
        pre_click = cdp.eval("""
            (() => {
                const btn = document.getElementById('launch-btn-quick-sync');
                const modal = document.getElementById('modal-google-connect');
                return {
                    btnExists: !!btn,
                    modalExists: !!modal,
                    modalClasses: modal?.className || '',
                    hasSaveSystem: !!window.BlahajSaveSystem
                };
            })()
        """)
        print("Pre-click state:", json.dumps(pre_click, indent=2))

        # Click the Launch Gateway Quick Link button to open the modal
        cdp.eval("(() => document.getElementById('launch-btn-quick-sync')?.click())()")
        time.sleep(0.5)

        modal_check = cdp.eval("""
            (() => {
                const modal = document.getElementById('modal-google-connect');
                const nameInput = document.getElementById('quick-connect-name');
                const emailInput = document.getElementById('quick-connect-email');
                return {
                    modalVisible: modal && !modal.classList.contains('hidden'),
                    modalClasses: modal?.className || '',
                    nameVal: nameInput?.value || '',
                    emailVal: emailInput?.value || ''
                };
            })()
        """)
        print("Modal Check:", json.dumps(modal_check, indent=2))
        assert modal_check['modalVisible'], "Google Connect modal must be visible after clicking Quick Link"
        assert "Russell" in modal_check['nameVal'], "Pre-filled name should be Russell Kirkby"
        assert "russellkirkby@gmail.com" in modal_check['emailVal'], "Pre-filled email should be russellkirkby@gmail.com"

        # 4. Link Russell's Account via Quick Connect
        print("\n--- 4. Linking Account as Russell Kirkby ---")
        cdp.eval("(() => document.getElementById('btn-quick-connect-submit')?.click())()")
        time.sleep(0.6)

        linked_state = cdp.eval("""
            (() => {
                const modal = document.getElementById('modal-google-connect');
                const accountStrip = document.getElementById('launch-account-strip');
                const embarkText = document.getElementById('launch-embark-text');
                const saveState = window.BlahajSaveSystem.getSaveState();
                return {
                    modalClosed: modal && modal.classList.contains('hidden'),
                    accountText: accountStrip?.textContent?.trim() || '',
                    embarkMainText: embarkText?.textContent?.trim() || '',
                    googleLinked: !!saveState?.profile?.googleAccount,
                    email: saveState?.profile?.googleAccount?.email || ''
                };
            })()
        """)
        print("Linked Gateway State:", json.dumps(linked_state, indent=2))
        assert linked_state['modalClosed'], "Modal must close upon account link"
        assert "Russell Kirkby" in linked_state['accountText'], "Account strip must show Russell Kirkby"
        assert "Google Cloud Sync" in linked_state['accountText'], "Account strip must show Google Cloud Sync Linked"
        assert "CONTINUE AS RUSSELL" in linked_state['embarkMainText'], "Embark button must personalize to Continue as Russell"
        assert linked_state['googleLinked'], "Save state must store Google account info"

        # Capture Screenshot of the Pre-Game Launch Gateway with Russell Linked
        screenshot_path = cdp.screenshot("pass71_pregame_launch_gateway.jpg")
        print(f"Captured screenshot: {screenshot_path}")

        # 5. Test Embark into 3D Game World
        print("\n--- 5. Testing Game Embark ---")
        cdp.eval("(() => document.getElementById('btn-enter-game')?.click())()")
        time.sleep(1.5)

        game_active = cdp.eval("""
            (() => {
                const overlay = document.getElementById('game-loading-screen');
                const p = window.BlahajGame.getPlayer();
                const inv = window.BlahajGame.getPlayerInventory();
                return {
                    overlayFaded: overlay && (overlay.classList.contains('fade-out') || overlay.style.display === 'none'),
                    playerLoaded: !!p,
                    invLoaded: !!inv
                };
            })()
        """)
        print("Game Active Check:", json.dumps(game_active, indent=2))
        assert game_active['playerLoaded'], "Player entity must be active in 3D scene"
        assert game_active['invLoaded'], "Player satchel inventory must be active"

        print("\n=== PASS 71 PRE-GAME LAUNCH GATEWAY & GOOGLE CONNECT VERIFICATION SUCCESSFUL! ===")

    finally:
        try:
            edge.terminate()
            edge.wait(timeout=3)
        except Exception:
            pass

if __name__ == '__main__':
    main()
