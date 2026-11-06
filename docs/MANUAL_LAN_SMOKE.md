# Manual LAN Smoke Test

This is the physical/visual acceptance pass for **CyberThreat Defender: LAN FFA & Teams**. Run it on a real LAN with the packaged desktop app and at least two browser clients before shipping a build.

The automated companion is `npm run test:lan`. It exercises the protocol and game state with live WebSocket clients, but it does **not** replace this checklist: a human must verify discovery, the rendered table, drag targeting, focus/contrast, audio settings and the desktop window.

---

## Test environment

Record this before starting:

| Item | Value |
| --- | --- |
| Build / commit | |
| Date / tester | |
| Host OS + Node version | |
| Host device / IP | |
| Guest device 1 / browser | |
| Guest device 2 / browser | |
| Desktop app tested? | Yes / No |
| Network (SSID / VLAN) | |
| Firewall / AP isolation | |

Requirements:

- [ ] `npm install` completed
- [ ] `npm run typecheck` passes
- [ ] `npm run test:unit` passes
- [ ] `npm run art:check` passes
- [ ] `npm run build` passes
- [ ] `npm run test:lan` passes
- [ ] Host and guests are on the same LAN/VLAN
- [ ] Host firewall allows TCP 8787 and UDP 41234
- [ ] Browser clients are recent Chrome/Firefox/Safari/Edge
- [ ] At least one guest has a different screen size or input method

---

## 1. Start the host

On the host machine:

```bash
npm start
```

or launch the desktop app:

```bash
npm run desktop
```

Checks:

- [ ] Host terminal/window prints a host console URL with `#hostKey=...`
- [ ] Host terminal prints a guest URL without the host key
- [ ] `http://127.0.0.1:<port>/api/health` returns `ok: true`, `noPlayerCap: true`
- [ ] `http://127.0.0.1:<port>/api/info` lists the host name and LAN address
- [ ] `http://<host-ip>:<port>/` loads the landing screen from another device
- [ ] Browser client bundle loads with no console errors
- [ ] Desktop app window opens at a sane size and the host is reachable from a browser

**Expected:** no central server, no login, no internet requirement.

---

## 2. Discovery / lobby browser

On guest device 1, open `http://<host-ip>:<port>` and wait for the lobby browser.

- [ ] The lobby appears automatically via mDNS or UDP discovery
- [ ] The lobby card shows the host name, lobby name, player count and phase
- [ ] Refresh/scan updates the lobby list
- [ ] Starting a second host on another machine shows both lobbies (if available)
- [ ] Stopping a host removes it after the next scan/refresh (or direct-IP join fails cleanly)
- [ ] Blocking multicast (or using a VLAN that blocks it) leaves the direct-IP path usable
- [ ] Empty discovery state explains how to enter an address manually

**Direct-IP path:** enter `192.168.x.x:8787` in the address field and join. This must work even when discovery is blocked.

---

## 3. Host key and roles

- [ ] Opening the **guest** URL does not expose host controls
- [ ] Attempting to host with a wrong/missing key shows an error
- [ ] The **host console** URL grants host settings, start, bot, kick, return-to-lobby
- [ ] A guest cannot change host settings (UI is absent and server rejects direct commands)
- [ ] Guest can join as **player** or **spectator**
- [ ] Spectator badge/read-only state is visible
- [ ] Host key is not present in the guest URL or copied invite text
- [ ] When the host key is lost, restarting the host creates a new key and the old host link is rejected

---

## 4. Lobby configuration

As host, open **Host settings** and verify every group is usable:

- [ ] Lobby name, mode, pacing
- [ ] Points to win, score limit, starting score/resources/HP/lives/loss threshold
- [ ] Hand size, deck size, cards per turn, round limit
- [ ] Expansions, starter/custom/all pool, card allow-list and bans
- [ ] Turn timer, round timer, respawn and respawn delay
- [ ] Friendly fire and targeting rules
- [ ] Damage/healing multipliers, sudden-death trigger, hill bonus
- [ ] Team size, bot count/difficulty
- [ ] Spectators, late join, reconnect grace
- [ ] Draft picks and custom win/lose formulas
- [ ] Invalid formula shows a readable validation error
- [ ] Valid custom formula saves and is visible in match rules
- [ ] Settings persist while the lobby is open and lock when the match starts

Suggested first test ruleset:

```text
Mode: FFA
Points to win: 30
Starting HP: 20
Starting resources: 4
Hand size: 5
Deck size: 32
Cards/turn: 3
Turn timer: 75s
Round timer: 0
Bots: 1 normal
Spectators: on
Late join: players
```

---

## 5. FFA match: players and bots

Start with the host, at least two guest players and one bot.

- [ ] Every connected guest must be ready before start
- [ ] Host can start once ready conditions are met
- [ ] Turn indicator points at the active player
- [ ] Hand shows only the local player's cards
- [ ] Opponent hand counts stay hidden
- [ ] Asset/token starter cards appear on the table
- [ ] Hover/focus card preview shows art, alt text, type, rarity, cost, rules, strategy, synergies and counterplay
- [ ] Click-select then click a highlighted target plays a targeted card
- [ ] Drag a card onto a target plays it
- [ ] Drag a card to a non-target/table area behaves predictably and does not desync
- [ ] Escape cancels targeting
- [ ] End Turn advances to the next player/bot
- [ ] A play that is countered by a defense shows the counter in the combat log
- [ ] Damage/score/HP changes match the card text
- [ ] Chat from each player appears in the log/chat panel
- [ ] Player list shows host/connected/spectator/bot states accurately
- [ ] Turn timer visibly counts down and auto-passes
- [ ] If HP/lives reach zero, respawn or elimination follows the rules
- [ ] Round-end asset scoring updates scores for all players

**Cross-client check:** compare HP, score, credits and round across two guests after several plays. They must match.

---

## 6. Teams / co-op variants

Return to lobby and test each of these; use the host settings to set the relevant knobs.

**Teams**

- [ ] Set team size 2 with four humans or bots
- [ ] Roster shows paired team assignments
- [ ] Team score is shared/summed
- [ ] Friendly-fire disabled by default; targeting a teammate is blocked with a clear message
- [ ] Enable friendly fire + open targeting; teammate targeting becomes legal
- [ ] Change team size while in lobby; teams reassign visibly

**Co-op vs AI**

- [ ] Add at least two bots
- [ ] Human players share the crew team; bots are AI
- [ ] Bots take turns, draft and play without host errors
- [ ] Bot difficulty changes behavior/pacing enough to notice

**Other modes**

- [ ] Elimination: no respawns; elimination is permanent
- [ ] Score Attack: score/round limit ends the match
- [ ] King of the Hill: hill holder/bonus appears after a round
- [ ] Sudden Death: damage doubles at the configured round
- [ ] Sealed: larger randomized deck starts correctly
- [ ] Custom: custom win or loss formula triggers as written

---

## 7. Spectators

From guest device 2 (or another browser profile), join as a spectator while a match is running.

- [ ] Spectator joins without taking a player slot
- [ ] Table is visible but cards/end-turn/host controls are read-only
- [ ] Spectator hand is absent/empty (no hidden information)
- [ ] Spectator appears in the roster
- [ ] Spectator chat reaches the table
- [ ] Host can kick a spectator; the spectator sees a clear removed message
- [ ] Spectator reconnecting with its token returns to spectator view
- [ ] Spectators disabled in host settings rejects spectator joins

---

## 8. Late join

With `lateJoin: "players"` and a match in progress:

- [ ] A new player can join mid-match
- [ ] The late player gets a fresh hand/deck and appears in the player list
- [ ] Existing players see the new player after the next broadcast; no desync
- [ ] With `lateJoin: "spectators"`, the same join becomes a spectator
- [ ] With `lateJoin: "off"`, the join is rejected with a clear message
- [ ] Late join during draft becomes spectator (or is rejected), not a broken player

---

## 9. Disconnect / reconnect

Use browser devtools “Offline”, disable Wi-Fi/Ethernet, or kill the browser tab.

- [ ] Host marks the player disconnected within a few seconds
- [ ] The player's seat/hand is retained for the grace period
- [ ] The client shows a reconnecting overlay, not a silent freeze
- [ ] Re-enabling the network restores the same player identity, hand and seat
- [ ] Combat log shows the disconnect/reconnect events
- [ ] Refreshing the browser within the grace period restores the same identity
- [ ] After the grace period, the slot is pruned (host roster updates)
- [ ] An invalid/expired reconnect token produces a normal new join, not a duplicate seat
- [ ] Kicked players cannot reconnect with an old token

---

## 10. Draft

Return to lobby, set **Mode: Draft**, set `draft picks` to a short value for testing, start with two humans and one bot.

- [ ] Every player enters the draft phase
- [ ] Each player sees rotating offers (5 offers at a time)
- [ ] Clicking an offer picks it and reveals the next offer
- [ ] Cards picked show up in the eventual deck/hand
- [ ] Bots pick automatically without stalling the draft
- [ ] The phase transitions to playing only after all picks complete
- [ ] Each player's hand/deck are private
- [ ] Host can return to lobby after the draft/play
- [ ] A spectator can watch the draft read-only

---

## 11. Return to lobby and repeat

- [ ] Host returns everyone to the lobby after a match
- [ ] Roster is preserved; guests are unready; bots remain
- [ ] Scores/HP/draft state reset for the next match
- [ ] Changing mode/settings then starting again works
- [ ] Starting a second match does not leak old hands, logs or winner state
- [ ] Guests leaving in lobby clean up their slot after prune/kick
- [ ] Host can kick a player/bot and add a new one
- [ ] Multiple consecutive matches do not increase errors or desync

---

## 12. Responsive / accessibility / polish

Test at 1920×1080, 1366×768 and a narrow/mobile browser width.

- [ ] No horizontal overflow or clipped cards at common sizes
- [ ] Opponent row, table center, self zone, hand and sidebar remain usable
- [ ] Card preview is readable and dismissible
- [ ] Targeting arrow is visible and points at the actual target
- [ ] Keyboard: Tab reaches cards/buttons, Enter/Space selects a focused target, Escape cancels
- [ ] Focus ring is visible
- [ ] High contrast preference improves legibility
- [ ] Reduced motion removes/shortens animations
- [ ] Compact hand preference works
- [ ] Contextual hints can be turned off
- [ ] Sound effects and voice lines can be muted independently; volume sliders work
- [ ] Loading, empty, error, reconnect and winner states all render cleanly
- [ ] Alt text is present on card art and controls have accessible names
- [ ] Chat/log scroll does not break layout
- [ ] No uncaught console errors during any of the above

---

## 13. Desktop app

- [ ] `npm run desktop` opens the window and starts a host
- [ ] Window title/product name are correct
- [ ] Guests can join the embedded host from another device
- [ ] Browser devtools/network inspector show `/ws` traffic and no failed asset requests
- [ ] Reloading the Electron window preserves the host key from the launch URL
- [ ] Closing the window stops the host cleanly (no orphaned port)
- [ ] Second launch focuses the existing window instead of starting a second host
- [ ] Packaged build (`npm run package:desktop`) launches on the target OS
- [ ] Installer/app icon, app name and install flow are acceptable
- [ ] Uninstall leaves no surprising user data (host key is not persisted)

---

## 14. Final acceptance

- [ ] At least 4 humans (or 3 humans + bots) played a full match
- [ ] At least one team match and one draft match completed
- [ ] At least one spectator watched
- [ ] At least one late join occurred
- [ ] At least one disconnect/reconnect recovered the same seat
- [ ] No host crash, unhandled promise rejection or client desync
- [ ] No artificial player cap error appeared (test 5+ humans if hardware allows)
- [ ] All requested host settings were exercised once
- [ ] README commands work verbatim
- [ ] Automated suites still pass after the manual run

### Sign-off

| Check | Result | Notes |
| --- | --- | --- |
| Automated tests | | |
| Discovery | | |
| Direct IP | | |
| Desktop | | |
| FFA | | |
| Teams | | |
| Co-op | | |
| Draft | | |
| Spectator | | |
| Late join | | |
| Reconnect | | |
| Accessibility | | |
| Overall | | |

If a check fails, capture the host terminal output, browser console errors, the exact settings, and attach them to the issue. Do not include live host keys.
