# Blåhaj Island — Development To-Do List & Roadmap

*Current Version: `v19.11` (`main`)*

---

## Completed Foundation (`v19.0 – v19.11`)
- [x] **Four Worlds & Initiatic Progression (`js/progression.js`)**: `Plushiah → Fintzirah → Brewiah → Sharkziluth`, `0°=0□` Probationer + `1°=10□ → 10°=1□` Degrees, World-Spiral, and 4 Mentor Currents (`Hermes`, `Solomon`, `Hiram`, `Nimue`).
- [x] **Per-Character Isolation (`js/saveSystem.js`)**: Separate Degree, World, Mentor Current, Skill Points, learned arts, Action Bar bindings, 10-socket wardrobe, and 36-slot satchel per character.
- [x] **Clean Action Bar & Codex (`js/mmoControls.js`)**: Action Bar displays only known skills (no grayed-out placeholders); `[I]` Codex displays Mentor Current trees + **`🌳 Tree of the Four Worlds`** SVG visualizer and Trials Ledger.
- [x] **Living Founder Mentor NPCs (`js/main.js`, `js/progression.js`)**: Direct skill teaching, Reputation tributes, and costly **Rite of Re-Dedication**.
- [x] **10-Socket Vitruvian Shark Pentagram (`js/equipment.js`, `js/sharks3d.js`, `js/main.js`)**: Orthographic 3D-to-2D flattened blueprint, woven canvas/floppy cloth costumes, Soulbound Founder Recall, and starter robes/masks/weapons.
- [x] **Fin-Cursor & Hyperspace Fixes**: Ground Breb scoopable with the Shark Fin Cursor (`v19.10`), and reachable Hyperspace off-ramp doorways (`±27m` + tractor pull, `v19.11`).

---

## Open To-Do List (Upcoming Passes)

### 1. New Instances & Adventures
- [ ] **Pirate Adventure Instance**: Build a swashbuckling Pirate Adventure instance (pair naturally with the *Felt-Steel Corsair Cutlass*, *Regatta Sailboat*, pirate shark crew/encounters, treasure chests, and a new `BlahajProgression.TRIALS` milestone + kept pirate relic/costume drops).
- [ ] ***The Breb of Shame* Mythic Quest Line (`q_breb_of_shame`)**: Build the high-initiate quest chain and unlock flow for the mythic `breb_of_shame` relic registered in `js/progression.js` (`minWorld: 2`) and `js/inventory.js`.
- [ ] **Cheese Moon Part 2**: Build the forward **Cheese Moon Outpost** and open the sealed tunnel toward the **Heart of the Cheese Planetoid** teased in `js/cheesePlanet.js`.
- [ ] **Expand Trials & Hyperspace Branches**: Plug additional Trials into `BlahajProgression.TRIALS` (Beach Volleyball, Sea-Cave Grotto, Sanctuary Islands) and unseal more `BRANCH_DEFS` (`#4–#12`) in `js/hyperspace.js`.

### 2. Equipment, Costumes & Co-op Sync
- [ ] **Live Co-op 3D Wardrobe Sync**: Broadcast `equippedSockets` over PeerJS (`js/network.js` / `js/main.js`) so Russell & Helen see each other's robes, ninja cowls, wizard hats, and weapons in real time.
- [ ] **Weapon-Specific Combat VFX**: Hook `fin_right` / `fin_left` weapons (e.g. *Wand of the Silver Star* starlight bolts, *Felt-Steel Corsair Cutlass* blade arcs, future rayguns) into `js/mmoControls.js` attacks.
- [ ] **More 10-Socket Costumes & Weapons**: Expand `BlahajEquipment` with rayguns/blasters, pirate tricornes/coats, necklaces, and tail gear.
