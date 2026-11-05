# CyberThreat Defender: LAN FFA & Teams

A host-authoritative multiplayer digital card game. Godot 4 + GDScript.
Runs on **Windows, macOS, Linux**.

Inspired by CIAS Cyber Threat Defender. Includes the original core card
set plus a "brainrot" expansion (Bonzi Buddy, Verity Mod, Darkity Mod,
Kirkity, and more).

---

## Quick start

```bash
# 1. Install Godot 4.3+ (standard build, not .NET)
#    https://godotengine.org/download

# 2. From the project root:
godot --headless res://tests/TestRunner.tscn   # run tests
godot res://scenes/Main.tscn                    # launch the game
Expected test output ends with --- 57 passed, 0 failed --- and exits 0.

Playing
Host a game
Launch the game.

Host Game → the settings screen opens.

Adjust anything you want (see Host Settings).

Leave Bot Count at 1 for solo play, or 0 for LAN only.

Host with these settings.

Start Match.

Join a LAN game
Browse LAN Lobbies — auto-discovers hosts on the same subnet via
UDP broadcast (port 42420).

Direct IP — type the host's LAN IP and click Join
(game port 42421).

Host IP:

Linux: ip addr

macOS: ipconfig getifaddr en0

Windows: ipconfig

Controls
Action	Input
Play a card	Click a card in your hand
End turn	End Turn button
Card details	Hover a card (tooltip with name, text, rarity)
Card preview	The card face shows name, cost, art, type, rarity, and rules text
Cards you can't afford are dimmed and disabled. Cards you can afford
glow in their type color (red = attack, blue = defense, green = asset,
purple = event, orange = character, cyan = mod).

The turn loop
Your turn begins. Resources refresh to starting_resources.

Play any number of cards you can afford.

Click End Turn.

Over-cap cards are discarded (random, currently).

You draw draw_per_turn cards.

The next player's turn begins.

Bots play after ~0.8s, then end their turn. Repeat until someone hits
points_to_win or is the last side standing.

Official CIAS draw rule
The default draw_per_turn is 2 with a hand cap of 7, matching
the CIAS rulebook:

"Each player is required to draw two cards at the end of every turn.
Keep in mind that each player can have no more than seven cards in
their hand at the end of each turn."

Both are configurable — see Host Settings.

Host Settings
The Host Game screen exposes every option below.

Setting	Default	Range	Notes
Game Mode	ffa	see list below	
Turn Mode	turn_based	turn_based / real_time	real_time accepted in config; turn-timer loop not yet implemented — see Known limitations
Points to win	30	1–500	Score threshold for victory
Starting HP	20	1–500	
Starting Resources	5	0–50	Refreshed every turn
Hand Size	7	1–20	Opening hand
Draw per turn	2	0–10	Cards drawn at end of turn
Deck Size	40	10–120	Shuffled from card pool
Team Size	2	1–16	Only used in teams mode
Bot Count	1 (default in UI)	0–8	Bots are Player 1000+N
Turn Timer (sec)	45	5–300	stored in config; enforcement not yet implemented
Damage Multiplier	1.0	0.1–10.0	Applied to all damage effects
Friendly Fire	off	on / off	When off, allied damage is blocked
Spectators	on	on / off	stored in config; spectator role not yet implemented
Late Join	on	on / off	stored in config; mid-match join not yet implemented
Game Modes: ffa, teams, coop, draft, sealed, elimination,
score_attack, koth, sudden_death, custom.

Only ffa and teams currently affect team assignment; the others
are selectable and stored, but distinct win/round logic for them is
not yet implemented — see Known limitations.

Additional schema fields (in Settings.DEFAULTS but not shown in
the UI yet): turn_time_sec partial, round_time_sec,
round_limit, score_limit, lose_condition, targeting_rules,
respawn, sudden_death_trigger, enabled_expansions,
banned_cards, card_pool, win_formula, lose_formula.
They are validated and clamped, and can be set programmatically
from scripts/main.gd before calling Match.start_match.

Cards
28 cards total, split across two expansions:

core (14 cards) — the CIAS-inspired base set: assets, defenses,
attacks, events. Names and mechanics preserve the original game;
rules text is original wording.

brainrot (14 cards) — Bonzi Buddy, Verity Mod, Darkity Mod,
Kirkity, and friends. Includes statuses, effects, and rarities.

Each card has:

id, name, type, rarity, cost, expansion

text — rules text (original wording)

effects — array of {op, amount, target, ...} effects

alt — alt text (required by the test suite)

Optional: art (path to a PNG), flavor, voice, synergy, counterplay

Card effects
resolve_card (a pure static function in autoload/match.gd)
supports these ops:

Op	Effect
damage	Deals amount × damage_multiplier to target (respects friendly fire)
heal	Restores HP
gain_score	Adds score (triggers win check)
gain_resources	Adds resources
draw	Appends a draw event (deferred to next draw phase)
apply_status	Applies stacked status
discard	Forces target discard
Effect targets: self, chosen, enemy_player, any_player,
all_enemies, all_allies, all.

Card art
Every card resolves to a texture — guaranteed by the test suite.

If assets/cards/<card_id>.png exists, it's used.

Otherwise, CardDB generates a deterministic procedural
placeholder (seeded by card id) — dark base color per card
type, accent glows, scanlines, and a type-colored border.

Drop real PNGs (512×716 recommended) into assets/cards/ to override
placeholders. No code changes needed.

Adding a card
Add the JSON entry to data/cards/<expansion>.json.

Include all required fields, including alt.

Add effects using the ops table above.

Drop art at assets/cards/<id>.png (optional).

godot --headless res://tests/TestRunner.tscn — the card DB tests
will fail if any required field is missing.

Architecture
text
project.godot            Godot project config (autoloads, window, renderer)
autoload/
  net.gd                 ENet transport + UDP LAN discovery
  settings.gd            Host settings schema + validation (pure)
  card_db.gd             Card JSON loader + procedural art fallback
  match.gd               Authoritative match state + pure card resolution
scripts/
  lobby_rules.gd         Pure lobby/team/play rules (unit-tested)
  main.gd                UI: menu, host settings, lobby, table, bots
scenes/
  Main.tscn              Single-scene UI root
tests/
  test_runner.gd         57 assertions (headless, exit-coded)
  TestRunner.tscn
data/cards/
  core.json              14 CIAS-inspired cards
  brainrot.json          14 new cards
assets/cards/            (empty — user-supplied PNGs override placeholders)
tools/
  export.sh              Export to Linux/Windows/macOS (after editor presets)
Design rules
Rules are pure. Every rule lives in a static function that takes
(state, config, ...) and returns a Dictionary. No Node access,
no networking, no UI.

autoload/match.gd is authoritative. The host owns state;
clients never mutate it.

UI is a thin layer. It calls Match.play_from_hand(...) and
Match.end_turn(...) — it never computes outcomes itself.

That's why tests/test_runner.gd can exercise resolution, team
assignment, bans, resources, damage multipliers, friendly fire, AoE,
win conditions, and the turn loop headlessly, without a network.

Networking
Host-authoritative — one client is the server (ENet).

mDNS-style LAN discovery — UDP broadcast on port 42420; hosts
reply to probe packets with lobby metadata.

Direct IP join — bypasses discovery, always works on the same
subnet or VPN.

No artificial player cap — ENet_MAX = 4095 is the protocol limit;
real limits are host CPU and bandwidth.

Ports — 42420/udp (discovery), 42421/tcp+udp (game). Open both
on the host firewall.

Testing
bash
godot --headless res://tests/TestRunner.tscn
Exit 0 = all pass. Exit 1 = at least one failure (the printout
names each one).

57 assertions covering:

Card DB (7) — load errors, expansions, required fields, art
resolution for every card

Settings (5) — defaults, mode validation, HP/damage clamps

Lobby rules (7) — FFA vs teams, team size, late-join policy,
spectator policy, large lobbies

Card resolution (11) — damage, multiplier, unknown cards,
friendly fire on/off, AoE, elimination, bans, insufficient resources

Win conditions (3) — score threshold (FFA and teams), elimination

Match flow (10) — start, hand/deck sizes, turn order, human vs bot,
hand play, hand shrinking, discard growth, bot resources refreshed

Draw per turn (9) — default, clamps, draw 0/2/3, hand-cap
discard behavior at 7

Manual LAN smoke test
Not yet automated (requires two processes). Do this before shipping:

Host on machine A — note LAN IP.

Join from machine B via Browse or Direct IP.

Play a few cards on A; verify B's view updates.

Disconnect B, rejoin — verify state continues.

Host with Late Join off, confirm a second client is refused.

Host 6-player (3 machines × 2 instances) — confirm no cap.

Known limitations
These are honest gaps in the current build, not bugs:

Real-time turn mode — turn_mode: "real_time" is accepted and
stored, but the game still runs turn-based. No timer loop yet.

Turn timer — turn_time_sec is stored but not enforced.

Spectators / late join — validated against a policy in
LobbyRules, but the actual mid-match join and spectator UI are not
wired.

Non-FFA/teams modes — draft, sealed, elimination,
score_attack, koth, sudden_death, custom are selectable but
run with FFA rules under the hood.

Bots are random — they pick a uniformly random affordable card
each turn. No strategy, no awareness of HP, no preference for damage.

Discard choice is random — when over the hand cap, the game picks
which card to discard. The official rule says the player chooses.

LAN discovery is broadcast-only — one subnet. Works fine on a
home router or a VPN mesh (Tailscale, ZeroTier, WireGuard), does not
cross routers.

No mid-match networking — the LAN transport works, but card plays
and turn advancement are not yet synced between host and clients.
Two clients can join the same lobby and start a match, but they don't
see each other's plays yet. Single-machine (host + bots) gameplay is
fully working.

The plan for closing these is documented per-feature in
CONTRIBUTING.md.

Troubleshooting
Symptom	Likely cause	Fix
Gray screen at launch	Script parse error	Run godot --headless res://tests/TestRunner.tscn — the errors will be listed
"No lobbies found"	Different subnet, or firewall blocks UDP 42420	Try Direct IP; allow 42420/udp on the host firewall
connection_failed	Wrong IP, wrong port, or host didn't start	Confirm host clicked Host with these settings; check 42421
Port already in use	Another instance is hosting	Change DEFAULT_PORT in autoload/net.gd, or close the other instance
Card art is blank	CardDB.load_errors non-empty	Run the tests — they'll name the broken card
Blurry UI	stretch/mode reverted	Confirm project.godot has window/stretch/mode="disabled"
Only 1 card in hand	draw_per_turn is 0 or deck is empty	Set draw_per_turn ≥ 2 in Host Settings
Bot never plays	Not enough resources, or no affordable cards	Normal — bot passes; lower costs or raise resources
Building for distribution
bash
# One-time: in the Godot editor, Project → Export, create three presets
# named "Linux/X11", "Windows Desktop", "macOS". Then:

./tools/export.sh
Artifacts land in build/:

ctd-linux.x86_64

ctd-windows.exe

ctd-macos.zip

The script runs the test suite first and aborts on failure.

Asset credits
Card art — procedural placeholders are generated at runtime,
deterministic per card id. Real art is user-supplied (drop PNGs
into assets/cards/<id>.png).

Card rules text — original wording written for this project.
Legacy card names and mechanics are public CIAS material; no
copied text.

Character and mod references — Bonzi Buddy, Verity Mod, Darkity
Mod, Kirkity, and brainrot references are used at the project
owner's direction. The project owner assumes responsibility for
rights, licensing, and distribution of all supplied and generated
assets. Kirkity is a fictional parody stand-in; no real person is
depicted.

Engine — Godot Engine (MIT License).

License
Source code: see LICENSE (project owner to supply).
Assets: see Asset credits.

Contributing
See CONTRIBUTING.md for dev setup, PR process,
testing map, and the asset workflow.
