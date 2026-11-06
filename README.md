# CyberThreat Defender: LAN FFA & Teams

A polished, host-authoritative LAN card game for the whole room. Build a network of assets, fire attacks, arm defenses, draft ridiculous cards, and outscore everyone before the table collapses into brainrot.

The game ships the **148-card CyberThreat Defender archive** plus **73 crossover, brainrot and frontier cards** for **221 cards total**. Every card has art, alt text, a rarity, rules text, strategy notes, synergies, counterplay and a place in the table meta.

- **Cross-platform desktop:** Windows, macOS and Linux through Electron.
- **Browser clients:** any modern desktop or mobile browser on the LAN.
- **No central server:** the host process owns the match state.
- **No artificial player cap:** add as many human players as the host machine and network can comfortably carry.
- **Designed for a room:** mDNS + UDP lobby discovery, direct-IP join, spectators, late join, reconnect, chat and a live combat log.

> Crossover note: Bonzi Buddy, Verity, Darkity and the original fictional parody **Kirkity** appear as unofficial parody content. This project is not affiliated with or endorsed by any original rights holder and does not depict a real political figure. See [Content, credits and IP](#content-credits-and-ip).

---

## Contents

- [Requirements](#requirements)
- [Quick start](#quick-start)
- [Run a LAN session](#run-a-lan-session)
- [Modes and rules](#modes-and-rules)
- [Controls](#controls)
- [Testing](#testing)
- [Architecture](#architecture)
- [Troubleshooting](#troubleshooting)
- [Content, credits and IP](#content-credits-and-ip)
- [Project layout](#project-layout)

---

## Requirements

- **Node.js 22 or newer** and npm 10 or newer.
- A desktop OS for the Electron app, or any OS that can run the Node host.
- All players on the same LAN/VLAN for discovery. Direct IP also works across routed LANs.
- The host machine must allow inbound **TCP 8787** (game/client) and, if discovery is desired, **UDP 41234** (LAN broadcast discovery).

No database, account system, cloud service or internet connection is required after dependencies are installed. Card art is generated locally and served by the host.

---

## Quick start

```bash
npm install
npm run build
npm start
```

`npm start` prints two links:

```text
Host console: http://127.0.0.1:8787/#hostKey=<host-key>
Guest join:   http://127.0.0.1:8787
```

Open the **host console** link on the host machine to claim host controls. Share the **guest join** URL (replace `127.0.0.1` with the host's LAN IP) with the other players. Do **not** share the host console link unless you want someone else to control the lobby.

For the packaged desktop experience:

```bash
npm run desktop
```

The desktop app starts an embedded host, opens a window with a fresh host key, and advertises the lobby on the LAN. To build an installer for your current platform:

```bash
npm run package:desktop
```

Output goes to `release/`. Packaging targets are configured for AppImage (Linux), NSIS (Windows) and DMG (macOS); each target requires the usual platform toolchain.

### Development mode

```bash
npm run dev
```

This runs the authoritative host and Vite together. It prints a host console at `http://localhost:5173/#hostKey=...` and a guest URL. Vite proxies `/api` and `/ws` to the host on port 8787. Edit the client with hot reload; the host restarts through `tsx watch`.

### Other commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Host + Vite dev server with proxy |
| `npm run dev:client` | Vite only |
| `npm run dev:server` | Authoritative host with file watching |
| `npm run host` | Authoritative host from TypeScript |
| `npm run build` | Typecheck and build client, server and Electron bundle |
| `npm start` | Run the built host and serve the built client |
| `npm run desktop` | Build and launch the Electron app |
| `npm run package:desktop` | Build platform installers with electron-builder |
| `npm run art` | Regenerate procedural card art and the art manifest |
| `npm run art:check` | Validate all 221 card art paths, alt text and metadata |
| `npm run test:unit` | Vitest unit and integration tests |
| `npm run test:lan` | Automated multi-client LAN smoke test |
| `npm run typecheck` | TypeScript only |
| `npm run clean` | Remove `dist/` and `release/` |

---

## Run a LAN session

### 1. Start the host

On the machine that will own the match:

```bash
npm run build
npm start
# optional custom port:
npm start -- --port 9000
```

The host process is authoritative. It resolves card plays, timers, drafts, bots, team scoring and win/lose conditions. Clients only render the view the host sends them; other players' hands are never sent to a player's browser.

The host key is generated for every launch and printed only to the host terminal (and embedded in the desktop app's launch URL). It is not stored on disk by the host. If you lose it, restart the host to generate a new one.

### 2. Join from another device

Make sure both devices are on the same LAN. Then choose one of these paths:

**Lobby browser**
1. Open `http://<host-ip>:8787` in a browser.
2. Wait for the lobby browser to discover the host via mDNS or UDP.
3. Click the lobby, enter a display name, and join as a player or spectator.

**Direct IP**
1. Open `http://<host-ip>:8787` (or the `ws://<host-ip>:8787/ws` address if the client asks for a socket address).
2. Enter the host address in the join field, for example `192.168.1.20:8787`.
3. Join as a player or spectator.

The host terminal prints `LAN join: http://<your-ip>:8787` when it can determine a LAN address. Guest links deliberately omit the host key.

**Desktop host**
1. Launch the packaged app or `npm run desktop`.
2. The embedded host starts on a random port and prints/loads its own host URL.
3. Guests join at `http://<host-ip>:<port>` using the address shown in the app's lobby view.

### 3. Configure the lobby (host only)

The host controls:

- win target, score limit, starting score, starting resources, starting HP, lives and loss threshold
- hand size, deck size, cards per turn and starting cards
- enabled expansions, custom card allow-list, banned cards and the `all` / `starter` / `custom` pool
- turn timer, round timer, round limit, sudden-death trigger and damage/healing multipliers
- team size, friendly fire and targeting rules
- respawn and respawn delay
- bot count and difficulty
- spectators, late join policy and reconnect grace
- custom win/lose formulas, hill bonus and draft picks

When the host starts the match, the lobby lock applies. Return to the lobby after a match to change rules again.

### 4. Ready and start

- Hosts are always ready.
- Every connected human guest must mark ready before the host can start.
- Add a bot if you want a solo or small-table test.
- Draft mode starts with rotating card offers; bots pick automatically.
- Late join is controlled by the host. With `lateJoin: "players"` a late human can enter a live match; with `"spectators"` they watch; with `"off"` the host rejects new players after start.
- Spectators can watch during games and drafts and can use chat, but cannot play cards or change ready state.

### 5. Reconnect

Each player receives a reconnect token stored in browser `localStorage` for that endpoint. On a dropped connection, the client attempts to reconnect; the host keeps the player slot for the configured grace period. A refreshed browser or a reconnect to the same endpoint restores the same player identity, hand and seat.

The host process itself is not replicated. If the host closes, the match is gone; guests cannot promote themselves to host.

### Firewalls and network notes

- Allow **TCP 8787** (or your custom port) inbound on the host.
- Allow **UDP 41234** inbound/outbound for mDNS/UDP discovery.
- Guest isolation (AP isolation) on some routers blocks device-to-device traffic even when internet works.
- Corporate/guest Wi-Fi may block multicast; direct IP still works.
- Use a trusted LAN. The host does not terminate TLS and is not intended to be exposed directly to the public internet. Put it behind a VPN or a reverse proxy with TLS if you need remote play.

---

## Modes and rules

All modes share the same core engine. The host can use a preset then override individual settings, including custom win/lose formulas.

| Mode | Default shape | What changes |
| --- | --- | --- |
| **Free For All** | 30 points, 2 lives | Every player is their own team. First to the target or last network standing wins. |
| **Teams** | 35 points, team size 2+ | Shared team score, custom team sizes, optional friendly fire and open targeting. |
| **Co-op vs AI** | 40 points, 2+ bots | Human crew vs hostile bots. Bots are assigned to the AI team. |
| **Draft** | 12+ picks | Players choose from rotating offers, then play the deck they built. |
| **Sealed** | Larger randomized deck | Randomized sealed-style pools with a larger deck and fixed points target. |
| **Elimination** | No respawns, 1 life | HP loss removes a player permanently; last network standing wins. |
| **Score Attack** | 25/30 score clock | Pure tempo race with score and round limits. |
| **King of the Hill** | Hill bonus each round | The strongest scoring asset network each round gains bonus score. |
| **Sudden Death** | Early damage doubling | Sudden death triggers early; damage multiplier is raised. |
| **Custom Ruleset** | Host-defined | Every dial, including `customWinFormula` and `customLoseFormula`. |

### Custom formulas

Formulas are evaluated by a small, dependency-free interpreter — **not** JavaScript `eval`.

Available variables:

```text
score hp round lives assets hand deck credits eliminated pointsToWin opponents
```

Operators and functions:

```text
+ - * / % < <= > >= == != && || !
min(...) max(...) abs(...) floor(...) ceil(...)
```

Example win rule:

```text
score >= pointsToWin && opponents == 0
```

Example loss rule:

```text
hp <= 0 || (round >= 12 && score < 10)
```

The host UI validates formulas when settings are saved, and the server rejects invalid rules. Division by zero, unknown variables/functions and overlong formulas are rejected.

### Scoring and turn flow

- Each player starts with a deck, a hand and two starter assets where the pool allows them.
- At the start of a turn, the active player draws one card and gains base credits plus asset income.
- Assets produce score at the end of each round. Disabled assets do not score.
- Attacks can be answered by deployed defenses. Matching defense tags consume a charge; `unblockable` attacks bypass them.
- Damage, drain, heal, draw, discard, shield, skip-turn, ongoing effects, credit theft, hand reveal and coin flips are all resolved by the host.
- Running out of cards can eliminate a player when `deckOut` is enabled.
- Team scores are the sum of living team members. FFA wins are individual. Round-limit ties become a draw.
- Sudden death doubles damage. Damage/healing multipliers apply on top of card values.

---

## Controls

### Lobby
- **Host settings** — configure the rules, card pool, timers, teams and bots.
- **Invite** — copy the guest address for the room.
- **Ready** — guests mark ready; the host starts.
- **Chat** — lobby chat is shared with the table.
- **Card library** — inspect all 221 cards, art, rules, synergies and counterplay.

### Table
- **Click a card** in hand to select it, then click a highlighted player or asset to target.
- **Drag a card** onto a target or the table for the same result.
- **Escape** cancels targeting/selection.
- **End turn** passes to the next player.
- **Enter/Space** activates a focused opponent/target card for keyboard targeting.
- **Right-hand sidebar** switches between combat log, chat and table stats.
- **Header controls** open match rules, the card library, settings and leave table.
- **Card preview** shows art, alt text, type, rarity, cost, rules, strategy, synergies and counterplay.
- **Draft** click an offer to pick it; bots pick automatically.
- **Spectator view** is read-only and shows public state only.
- **Winner overlay** offers return-to-lobby for the host or a clean exit for guests.

Accessibility and comfort settings include reduced motion, high contrast, compact hand, contextual hints, sound effects, voice lines and volume. All interactive controls have accessible labels; card art includes alt text.

Audio is synthesized locally (no external media downloads) and can be muted independently for effects and voice lines.

---

## Testing

```bash
npm run typecheck
npm run test:unit
npm run art:check
npm run build
npm run test:lan
```

### `npm run test:unit`

Vitest covers:

- **Card registry:** 221 unique cards, all 148 classic names preserved, required crossover/brainrot content, exact required Kirkity line, rules/strategy/synergy/counterplay fields, art files and the card-pool filters.
- **Formula parser:** arithmetic precedence, comparisons, boolean logic, functions, validation errors, division by zero and length limits.
- **Game engine:** hidden hands, team/co-op assignment, settings normalisation, card damage/costs/statuses, defenses and unblockable attacks, multipliers and sudden death, friendly fire, assets and scoring, removals/respawn, turn/round flow, timers, standard and custom win/loss rules, late join, connection state and a full draft.
- **Lobby:** host key enforcement, roster broadcasts, ready gating, bots, chat, spectators, late join modes, disconnect/reconnect tokens, kicks, return-to-lobby, team reassignment and 32-player join without a cap.

### `npm run test:lan`

Starts a real host on a random port and drives multiple live WebSocket clients through:

1. HTTP health/info/cards/discovery and static client/art checks
2. Host + guest join and host settings
3. Bot add, ready gate and match start
4. A real card play, chat and spectator view
5. Late join and a disconnect/reconnect with the same identity and hand
6. Cross-client synchronization checks
7. Return to lobby and a complete multi-player draft

The manual companion checklist is in [`docs/MANUAL_LAN_SMOKE.md`](docs/MANUAL_LAN_SMOKE.md). Use it for the physical LAN, desktop-window and visual acceptance pass; the automated script covers protocol and state correctness.

---

## Architecture

```text
┌────────────────────┐        WebSocket /ws         ┌─────────────────────────┐
│ React client        │  JSON protocol (join, play,  │ Node + Express + ws      │
│ Vite / browser      │  draft, chat, configure...)  │ authoritative host        │
│ Electron wrapper    │ ◄──────────────────────────► │ Lobby + game engine       │
└────────────────────┘                              └───────────┬─────────────┘
                                                                 │
                                          mDNS + UDP broadcast   │   HTTP static client
                                          direct IP: TCP 8787    │   /api/info, /api/lobby
                                                                 ▼   /api/cards, /api/discover
                                                          other players on LAN
```

### Layers

- **`src/shared/types.ts`** — protocol, settings, card and view contracts. Changing wire shapes requires a protocol version review.
- **`src/shared/engine.ts`** — deterministic-ish authoritative rules: deck building, card resolution, defense interaction, targets, turn/round loops, scoring, elimination, drafts, formulas, bot hooks and per-view redaction. Imported only by the server and tests; it uses Node crypto.
- **`src/shared/cards/`** — the 148-card classic archive plus crossover, brainrot and frontier expansions. `index.ts` owns the registry, starter/featured lists and card-pool filtering.
- **`src/shared/formula.ts`** — safe custom formula tokenizer and parser.
- **`src/server/lobby.ts`** — players, spectators, host ownership, reconnect tokens, settings validation, team/bot management, lobby/game broadcasts and command authorization.
- **`src/server/host.ts`** — Express APIs, WebSocket upgrade, static client serving, heartbeat, discovery and lifecycle.
- **`src/server/discovery.ts`** — mDNS (`_cyberthreat._tcp`) and UDP 41234 probe/beacon discovery, with direct-IP fallback.
- **`src/server/bots.ts`** — bot turn/draft decisions and difficulty pacing.
- **`src/client/`** — React UI: landing/lobby browser, lobby, table, card previews, targeting arrows, draft, chat/log, host settings, preferences and responsive styling.
- **`src/desktop/main.ts`** — Electron main process; starts the embedded host, opens the window with `#hostKey=...`, single-instance lock and graceful shutdown.

### Authority and privacy

- Only the host resolves commands. Clients cannot mutate state locally in a way that affects the match.
- Every player receives a tailored `GameView`. `self.hand` is present only for that player; spectators get `self: null`.
- The host key is required for `configure`, `startGame`, `addBot`, `removeBot`, `kick` and `returnToLobby`.
- Reconnect tokens are random, per-player and stored in `localStorage` keyed by endpoint.
- Host commands are validated against the game phase and host identity. WebSocket payload size and message rate are bounded.

### Discovery

- mDNS service: `_cyberthreat._tcp`.
- UDP discovery port: **41234**.
- Probe string: `CTD_DISCOVER_V1`.
- `/api/discover` combines the local lobby record with mDNS/UDP results.
- Direct IP always works even when multicast/broadcast is blocked.

### No artificial cap

There is no player-count check in the lobby or host. The practical limit is host memory/CPU, WebSocket throughput and the LAN. For reference, bots can be added up to 128 per lobby by the host UI. The number of human slots is not capped by the protocol.

---

## Troubleshooting

| Symptom | Likely cause / fix |
| --- | --- |
| `npm run dev` exits immediately | Ensure dependencies are installed and port 8787 is free. Check the host log printed above the Vite log. |
| Guest cannot reach the host | Use the host's LAN IP, not `localhost`; allow TCP 8787 through the host firewall; disable AP/client isolation. |
| Lobby does not appear in the browser | mDNS/UDP multicast may be blocked. Use direct IP, or start with `npm start` and enter the address manually. |
| `Host key is incorrect` | The fragment was lost/changed. Reopen the link printed by the host terminal; do not paste a guest link into the host console. |
| `The host did not answer in time` | Wrong address/port, firewall block, or a stale tab pointed at a closed host. Confirm `/api/health` in a browser. |
| `The client bundle is not built` JSON page | Run `npm run build` (or use `npm run dev`). `npm start` serves `dist/client`. |
| Port already in use | `npm start -- --port 9000`, or set `PORT=9000`. Open the matching URL. |
| Late join rejected | Host set `lateJoin: "off"` or the match is in the draft phase (late players become spectators during draft). |
| Cannot play a card | Check credits, play limit, turn indicator, target requirement and friendly-fire rules. Hover/read the card text. |
| Reconnect gives a new player | The reconnect token expired (grace period), was cleared from browser storage, or you joined a different host/port. |
| Mixed clients behave oddly | Every player should run the same build/version. The lobby snapshot exposes the host's server version for diagnostics; stale tabs may need a refresh. |
| Electron window shows a blank page | Run `npm run build` first; `npm run desktop` builds automatically. Check the terminal for host startup errors. |
| No audio | Check the in-game audio settings and browser autoplay policy; audio starts after the first interaction. |

Logs go to the host terminal. The host logs unhandled command errors and bot failures; client WebSocket errors appear in browser devtools. No telemetry is sent anywhere.

### Security notes

- LAN-only by default; the HTTP server has no TLS and no user accounts.
- The host key grants full lobby control. Treat the host console URL as a secret.
- All game actions are validated server-side, but custom formulas are host-authored and should be reviewed like any house rule.
- Do not expose the host directly to the public internet without a VPN or authenticated TLS reverse proxy.
- Card text is rendered as text in React; user chat is trimmed and length-limited by the server.

---

## Content, credits and IP

### Card content

- **Classic archive:** the 148 catalogued CyberThreat Defender cards, preserved by name with original effect text retained as `archiveText` and adapted for LAN rules. Source data lives in `data/ctd-cards-source.json`.
- **Signal Breach Crossover:** Bonzi Buddy, Verity, Darkity and **Kirkity**, plus crossover support cards. These are original parody interpretations.
- **Brainrot Overflow:** 48 intentionally absurd but mechanically readable cards, including the exact line **“This? State!? Hit the road dude this is private property.”**
- **Frontier Protocols:** 12 original strategic cards built for LAN table politics, drafting and team play.
- Rare cards and legendaries have stronger or more unusual effects; every card lists synergies and counterplay in the library.

### Art

- 218 cards use deterministic, original procedural SVG art generated by `scripts/generate-art.ts`.
- Three crossover hero cards (Bonzi Buddy, Darkity, Kirkity) use supplied PNG source art in `assets/source-art/`, copied into `public/art/heroes/`.
- The card back, favicon, UI frames and key art are generated or supplied with the project.
- `npm run art` is reproducible and offline; `npm run art:check` verifies every path, file signature and manifest entry.
- If you replace art, keep the filename stable or update the card's `art` field and rerun the generator/check.

### Software credits

- **React**, **Vite**, **TypeScript**, **Express**, **ws**, **bonjour-service**, **Electron**, **electron-builder**, **Vitest**, **esbuild**, **tsx**, **Lucide** icons and the Space Grotesk / JetBrains Mono fonts.
- Original project code, card adaptation, UI, art generator and tests by the CyberThreat Defender LAN contributors.

### IP and licensing responsibility

This repository is a private, non-commercial fan project. It does **not** grant rights to third-party card names, characters, trademarks or supplied images. CyberThreat Defender, Bonzi Buddy, Minecraft, Verity, Darkity and any referenced meme properties remain the property of their respective owners. The crossover and brainrot content is an original parody; no real political figure is depicted or referenced.

Before distributing builds, publishing assets or running a paid event, **you are responsible for confirming that you have the necessary rights and licenses** for all names, art, audio and other content in your copy. If you do not have those rights, replace the relevant names/art with original material. The software is provided as-is without warranty; see the repository owner for any code license you intend to apply.

---

## Project layout

```text
cyberthreat-defender/
├── assets/source-art/          # supplied PNG hero/source art
├── data/ctd-cards-source.json  # catalogued classic card source data
├── docs/
│   └── MANUAL_LAN_SMOKE.md     # physical LAN + visual acceptance checklist
├── public/
│   ├── art/                    # generated card art, heroes, manifest, card back
│   └── art/ui/                 # favicon and UI art
├── scripts/
│   ├── dev.ts                  # host + Vite dev runner
│   ├── generate-art.ts         # deterministic procedural art generator
│   ├── check-art.ts            # card/art/manifest validation
│   ├── lan-smoke.ts            # multi-client protocol smoke test
│   └── build-classic-cards.py  # one-time source catalog helper
├── src/
│   ├── client/                 # React UI, networking, preferences, styles
│   ├── desktop/                # Electron main process
│   ├── server/                 # host, lobby, discovery, bots
│   └── shared/                 # types, engine, formula, card registry
├── tests/                      # Vitest suites
├── index.html                  # Vite client entry
├── vite.config.ts
├── vitest.config.ts
└── package.json
```

For development workflow, card authoring and PR expectations, see [`CONTRIBUTING.md`](CONTRIBUTING.md).
