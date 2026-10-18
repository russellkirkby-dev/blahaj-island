#!/usr/bin/env python3
"""
Blåhaj Island — Multi-Threaded HTTP + Real-Time Co-op Relay Server (NZ <-> LA)
Serves static game files on port 8080 AND provides a zero-config /api/coop/sync
endpoint so two players opening the game (via localhost or Cloudflare Tunnel)
automatically see each other and play together in real time!
"""

import json
import os
import time
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

PORT = 8080
LOCK = threading.Lock()

# Room state: { room_code: { client_id: { state_dict, last_seen, inbox: [] } } }
ROOMS = {}
PUBLIC_TUNNEL_URL = None
SAVE_FILE = "world_save.json"
WORLD_SAVE = {"structures": {}, "islandClaims": {}, "pierNotes": []}


def load_world_save():
    global WORLD_SAVE
    if os.path.exists(SAVE_FILE):
        try:
            with open(SAVE_FILE, "r", encoding="utf-8") as f:
                loaded = json.load(f)
                if isinstance(loaded, dict):
                    WORLD_SAVE["structures"] = loaded.get("structures", {})
                    WORLD_SAVE["islandClaims"] = loaded.get("islandClaims", {})
                    WORLD_SAVE["pierNotes"] = loaded.get("pierNotes", [])
        except Exception:
            pass


def persist_world_save():
    try:
        with open(SAVE_FILE, "w", encoding="utf-8") as f:
            json.dump(WORLD_SAVE, f)
    except Exception:
        pass


def prune_stale_clients(room_dict, now):
    stale = [cid for cid, info in room_dict.items() if now - info.get("last_seen", 0) > 8.0]
    for cid in stale:
        del room_dict[cid]


class BlahajRequestHandler(SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        # Keep logs quiet for high-frequency /api/coop/sync polling
        if "/api/coop/" in (args[0] if args else ""):
            return
        super().log_message(format, *args)

    def end_headers(self):
        # Prevent stale JS/HTML caching during live development
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        if self.path.endswith((".js", ".html", ".css")) or self.path == "/":
            self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/coop/info":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            url_file = os.path.join(os.getcwd(), "tunnel_url.txt")
            tunnel_url = None
            if os.path.exists(url_file):
                try:
                    with open(url_file, "r", encoding="utf-8") as f:
                        tunnel_url = f.read().strip()
                except Exception:
                    pass
            self.wfile.write(json.dumps({"tunnelUrl": tunnel_url}).encode("utf-8"))
            return
        super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/coop/sync":
            length = int(self.headers.get("Content-Length", 0))
            raw = self.rfile.read(length) if length > 0 else b"{}"
            try:
                data = json.loads(raw.decode("utf-8"))
            except Exception:
                data = {}

            room_code = str(data.get("room", "SHONK-LOVE")).upper().strip() or "SHONK-LOVE"
            client_id = str(data.get("clientId", "")).strip()
            now = time.time()

            if not client_id:
                self.send_response(400)
                self.end_headers()
                return

            with LOCK:
                room = ROOMS.setdefault(room_code, {})
                prune_stale_clients(room, now)

                is_new_client = client_id not in room
                me = room.setdefault(
                    client_id,
                    {
                        "clientId": client_id,
                        "joinedAt": now,
                        "last_seen": now,
                        "state": {},
                        "inbox": [],
                    },
                )
                me["last_seen"] = now
                if "state" in data and isinstance(data["state"], dict):
                    me["state"] = data["state"]

                # When a client first connects/reconnects, send them the persistent world structures & island claims!
                if is_new_client:
                    if WORLD_SAVE["structures"]:
                        me["inbox"].append(
                            {
                                "type": "build_sync",
                                "items": list(WORLD_SAVE["structures"].values()),
                            }
                        )
                    for isl_id, claimer in WORLD_SAVE["islandClaims"].items():
                        me["inbox"].append(
                            {
                                "type": "island_claim",
                                "islandId": isl_id,
                                "claimer": claimer,
                            }
                        )

                # Persist world changes & broadcast outgoing events from this client to all other clients in the room
                out_events = data.get("events", [])
                if isinstance(out_events, list) and out_events:
                    dirty_save = False
                    for ev in out_events:
                        if not isinstance(ev, dict):
                            continue
                        etype = ev.get("type")
                        if etype == "build_place" and isinstance(ev.get("item"), dict):
                            item = ev["item"]
                            if item.get("id"):
                                WORLD_SAVE["structures"][item["id"]] = item
                                dirty_save = True
                        elif etype == "build_remove" and ev.get("id"):
                            if ev["id"] in WORLD_SAVE["structures"]:
                                del WORLD_SAVE["structures"][ev["id"]]
                                dirty_save = True
                        elif etype == "build_sync" and isinstance(ev.get("items"), list):
                            for item in ev["items"]:
                                if isinstance(item, dict) and item.get("id"):
                                    WORLD_SAVE["structures"][item["id"]] = item
                                    dirty_save = True
                        elif etype == "island_claim" and ev.get("islandId"):
                            WORLD_SAVE["islandClaims"][ev["islandId"]] = ev.get("claimer", "Shark")
                            dirty_save = True
                    if dirty_save:
                        persist_world_save()

                    for other_id, other_info in room.items():
                        if other_id != client_id:
                            other_info["inbox"].extend(out_events)
                            if len(other_info["inbox"]) > 80:
                                other_info["inbox"] = other_info["inbox"][-80:]

                # Gather partner states & pop my inbox events
                partners = []
                for other_id, other_info in room.items():
                    if other_id != client_id and other_info.get("state"):
                        partners.append(
                            {
                                "clientId": other_id,
                                "joinedAt": other_info.get("joinedAt", 0),
                                "state": other_info["state"],
                            }
                        )

                my_events = list(me["inbox"])
                me["inbox"].clear()

            resp = {
                "ok": True,
                "room": room_code,
                "partners": partners,
                "events": my_events,
                "onlineCount": len(partners) + 1,
            }

            body = json.dumps(resp).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return

        self.send_response(404)
        self.end_headers()


if __name__ == "__main__":
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    load_world_save()
    server = ThreadingHTTPServer(("0.0.0.0", PORT), BlahajRequestHandler)
    print(f"Blahaj Island Co-op Server running on http://localhost:{PORT}", flush=True)
    server.serve_forever()
