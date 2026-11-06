# Contributing to CyberThreat Defender: LAN FFA & Teams

Thanks for helping improve the table. This project values small, reviewable changes that keep the host authoritative, the UI accessible and the card content consistent.

---

## Development setup

### Prerequisites

- Node.js 22+ and npm 10+
- Git
- A modern browser for client work
- Optional: a second device on the same LAN for discovery/reconnect testing
- Optional: Electron runtime (installed by `npm install`) for desktop work

### First run

```bash
git clone <repository-url>
cd cyberthreat-defender
npm install
npm run dev
```

`npm run dev` starts:

- the authoritative host on port **8787**
- Vite on port **5173** with `/api` and `/ws` proxies
- a printed host console URL with a session host key
- a printed guest URL

Open the host console URL to control the lobby. Open the guest URL in a second browser or incognito window to join as another player. For the full production path:

```bash
npm run build
npm start
```

The `npm start` host serves `dist/client` on port **8787**. Use `npm start -- --port 9000` for a different port.

### Useful commands

| Command | Use |
| --- | --- |
| `npm run dev` | Main development loop |
| `npm run dev:client` | Vite only (host must run separately) |
| `npm run dev:server` | Host only with `tsx watch` |
| `npm run typecheck` | Strict TypeScript check |
| `npm run test:unit` | Fast Vitest suite |
| `npm run test:lan` | Real host + multi-client smoke |
| `npm run art:check` | Validate every card art path/metadata |
| `npm run art` | Regenerate procedural art + manifest |
| `npm run build` | Typecheck + client + server + Electron build |
| `npm run desktop` | Build and launch Electron |
| `npm run package:desktop` | Platform installer build |

---

## Repository map

| Path | Responsibility |
| --- | --- |
| `src/shared/types.ts` | Wire protocol, settings, card definitions, view contracts |
| `src/shared/engine.ts` | Authoritative rules; **server/tests only** |
| `src/shared/formula.ts` | Safe custom rule parser |
| `src/shared/cards/` | Card registry and expansions |
| `src/server/lobby.ts` | Membership, host auth, reconnect, teams, bots, broadcasts |
| `src/server/host.ts` | HTTP/WebSocket/static/discovery composition |
| `src/server/discovery.ts` | mDNS and UDP discovery |
| `src/server/bots.ts` | Bot turns and draft picks |
| `src/client/` | React app, networking, table, lobby, preferences, styles |
| `src/desktop/main.ts` | Electron host + window |
| `scripts/` | Art, validation, dev runner and LAN smoke tooling |
| `tests/` | Vitest suites |

### Architecture rules

1. **The host is authoritative.** Never add a client-side rule that can change match state without server validation.
2. **Do not leak hidden information.** Any new player-facing view must go through `makeView`; only `self.hand` may contain card instances. Spectators get `self: null`.
3. **Keep `engine.ts` server-only.** It imports `node:crypto`; importing it into the client bundle will break the browser build. Use types/helpers from `shared/types.ts`, card metadata from `shared/cards/`, and client-safe helpers from `src/client/lib/`.
4. **Respect phase guards.** Lobby-only commands must reject during `drafting`/`playing`; in-game commands must reject outside play. Use `GameRuleError` with a stable error code.
5. **Host controls need `requireHost`.** Any new host-only command must be checked in `lobby.handle` and tested.
6. **Protocol changes need care.** `src/shared/types.ts` is shared across host, browser and Electron. Bump `PROTOCOL_VERSION` for incompatible wire changes and update client handling, tests and README.
7. **No artificial player cap.** Do not add a hard human-player limit. Validate resource usage through limits on payload size, message rate and bots.
8. **No unbounded user text.** Trim and length-limit chat/names; render as text, never HTML.
9. **Keep art local.** No runtime calls to external art services. Procedural generation must remain deterministic and offline.
10. **Respect content boundaries.** Crossover characters are parody. Do not add real political figures or content that violates the project's IP/credits policy.

---

## Testing expectations

Before opening a PR, run:

```bash
npm run typecheck
npm run test:unit
npm run art:check
npm run build
npm run test:lan
```

For UI or networking changes, also perform the manual LAN checklist in [`docs/MANUAL_LAN_SMOKE.md`](docs/MANUAL_LAN_SMOKE.md).

### What to test where

- **Card mechanics:** add a focused test in `tests/engine.test.ts` covering the card's effect, target validation and edge cases. Use a deterministic seed or construct the hand directly; do not depend on random draws.
- **Card metadata/art:** extend `tests/cards.test.ts` or `scripts/check-art.ts` if you introduce a new invariant.
- **Lobby/protocol:** add cases to `tests/lobby.test.ts` using `TestSocket`; cover host rejection, reconnect, phase guards and roster broadcasts.
- **Formulas:** add parser/evaluator cases to `tests/formula.test.ts`.
- **Multi-client behavior:** extend `scripts/lan-smoke.ts` with a real end-to-end step; it runs against an ephemeral host and does not depend on external services.
- **UI:** verify keyboard targeting, focus states, reduced motion/high contrast, empty/loading/error states, small viewport layout and spectator read-only behavior.

Tests must not require mDNS, UDP broadcast or internet access. Automated LAN tests should start the host with `enableMdns: false` and `enableUdp: false` unless they are specifically testing discovery.

---

## Card authoring workflow

The registry lives in `src/shared/cards/`:

- `classic.ts` — the 148-card archive.
- `expansions.ts` — crossover, brainrot and frontier cards.
- `index.ts` — registry, starter/featured lists, pool filtering.

### Add a card

1. Add a `CardDefinition` with a unique kebab-case `id` and unique display `name`.
2. Fill every field:
   - `type`, `subtype`, `expansion`, `set`, `rarity`, `cost`, `target`
   - `text` (readable rules summary), `flavor`
   - `strategy`, `synergies[]`, `counterplay`, `keywords[]`
   - `alt` (screen-reader description, at least one full sentence)
   - `actions[]` and/or `defense` and/or `passive`
3. Use existing `EffectAction` kinds where possible. Do not add bespoke client-side effect handling.
4. Add the card to `STARTER_CARD_IDS` or `FEATURED_CARD_IDS` only when it belongs there.
5. Add at least one engine test.
6. Run `npm run art` to generate procedural art, then `npm run art:check`.
7. Update the card count in README/tests if the total changes (currently **221**).
8. If the card needs a hero image, add the source PNG under `assets/source-art/` and a stable copy step in `scripts/generate-art.ts`; do not hotlink remote assets.

### Card balance principles

- Costs should match tempo: cheap cards shape early turns, expensive cards create visible threats.
- Every attack should have counterplay; every passive should have a way to be removed or played around.
- Avoid "win the game instantly" effects unless they are intentionally mythic and have a clear setup/counter.
- Team and co-op cards should not accidentally punish allies unless friendly fire is explicitly enabled.
- Keep text readable at card size; put detailed rules in `text` and long-form advice in `strategy`.
- Include the exact required Kirkity line on `kirkity` and its support card where applicable:
  **“This? State!? Hit the road dude this is private property.”**
- Never add the flagged term that was explicitly excluded from this project.

### Art workflow

- Procedural art is generated by `scripts/generate-art.ts` from card ID/type/expansion/rarity. It is deterministic and checked into `public/art/cards/`.
- The generator writes `public/art/manifest.json`; keep it in sync.
- Hero cards use PNG source art from `assets/source-art/`; the generator copies it to `public/art/heroes/`.
- `npm run art:check` validates:
  - every card has an art path under `public/`
  - files exist and are non-empty
  - SVG/PNG signatures look correct
  - alt text, strategy, synergies, counterplay and effects exist
  - the manifest matches the registry
  - the required Kirkity line is present
- Do not commit downloaded third-party art without documented rights. See the IP section of the README.

---

## Code style

- TypeScript strict mode; no `any` in new code unless isolating an external boundary.
- Prefer `type` imports and the existing formatter style (2 spaces, double quotes, semicolons).
- Keep server commands typed through `ClientMessageMap`; validate untrusted values before use.
- Use `GameRuleError` for user-facing rule violations and `{ type: "error", code, message }` propagation.
- Keep React components focused. Shared presentational primitives live in `src/client/components/ui.tsx`; formatting helpers in `src/client/lib/`.
- Prefer CSS custom properties and the existing responsive design system over one-off inline styles.
- Add accessible names (`aria-label`, `aria-selected`, etc.) to every new control.
- Respect `prefers-reduced-motion`, high-contrast and compact-hand preferences.
- Keep log/chat lists virtualized or bounded if you add high-volume events.

---

## Pull request checklist

- [ ] Change is focused and explained in the PR description.
- [ ] `npm run typecheck` passes.
- [ ] `npm run test:unit` passes.
- [ ] `npm run art:check` passes if any card/art changed.
- [ ] `npm run build` passes.
- [ ] `npm run test:lan` passes for protocol/server changes.
- [ ] New cards have tests, art, alt text, strategy, synergies and counterplay.
- [ ] No hidden hand information is exposed to other players or spectators.
- [ ] Host-only actions still require the host key.
- [ ] Phase guards, reconnect and late-join behavior considered.
- [ ] Loading, empty, error and spectator states checked for UI changes.
- [ ] README/CONTRIBUTING updated for new commands, modes or protocol behavior.
- [ ] No third-party assets added without a documented rights note.

### Suggested commit style

Use short imperative subjects, for example:

```text
Add frontier card tests and art checks
Fix reconnect token handling after kick
Polish draft offer focus states
```

---

## Reporting bugs

Include:

- host OS and Node version
- client browser/Electron version
- exact commands used to start the host and client
- whether the host and guest were on the same LAN
- host terminal output and browser console errors
- steps to reproduce, including lobby settings, mode and player count
- whether the issue reproduces with `npm run test:lan`

Do not include host keys from a live event or private network addresses in public reports.

---

## Content and licensing

By contributing card names, text, art or audio, you confirm you have the right to submit that material and that it can be distributed with the project. Parody crossover content must remain clearly fictional and must not depict real political figures. The maintainers may reject or replace content with unclear rights. See the README's [Content, credits and IP](README.md#content-credits-and-ip) section.
