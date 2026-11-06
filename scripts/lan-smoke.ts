/**
 * Automated LAN smoke test.
 *
 * Starts a real authoritative host on an ephemeral port, then exercises it as
 * several WebSocket clients would: host + guest join, lobby settings, bot match,
 * card play, chat, spectator, late join, disconnect/reconnect, return to lobby
 * and a complete draft. It also checks the HTTP API and built client.
 *
 * Build first for the static-client check: npm run build
 * Run with: npm run test:lan
 */
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import WebSocket from "ws";
import { startHost, type HostHandle } from "../src/server/host.js";
import type {
  ClientMessage,
  DiscoveryLobby,
  GameView,
  LobbySnapshot,
  ServerInfo,
  ServerMessage,
} from "../src/shared/types.js";
import { getCard } from "../src/shared/cards/index.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const delay = (ms: number) => new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
let checks = 0;

function ok(condition: boolean, label: string): void {
  if (!condition) throw new Error(`CHECK FAILED: ${label}`);
  checks += 1;
  console.log(`  ✓ ${label}`);
}

function step(label: string): void {
  console.log(`\n[smoke] ${label}`);
}

async function waitFor<T>(
  probe: () => T | null | undefined | false,
  label: string,
  timeoutMs = 8_000,
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const value = probe();
    if (value) return value;
    await delay(30);
  }
  throw new Error(`Timed out waiting for ${label}`);
}

class SmokeClient {
  readonly messages: ServerMessage[] = [];
  readonly errors: Array<{ code: string; message: string }> = [];
  private closeCode: number | null = null;

  private constructor(private readonly ws: WebSocket) {
    ws.on("message", (raw) => {
      try {
        const message = JSON.parse(raw.toString()) as ServerMessage;
        this.messages.push(message);
        if (message.type === "error") {
          this.errors.push({ code: message.code, message: message.message });
        }
      } catch {
        // Ignore malformed frames; the host should never emit them.
      }
    });
    ws.on("close", (code) => {
      this.closeCode = code;
    });
  }

  static connect(url: string): Promise<SmokeClient> {
    return new Promise((resolveClient, rejectClient) => {
      const ws = new WebSocket(url);
      const client = new SmokeClient(ws);
      ws.once("open", () => resolveClient(client));
      ws.once("error", rejectClient);
    });
  }

  send(message: ClientMessage): void {
    this.ws.send(JSON.stringify(message));
  }

  last<T extends ServerMessage["type"]>(
    type: T,
  ): Extract<ServerMessage, { type: T }> | undefined {
    return this.messages
      .slice()
      .reverse()
      .find((message): message is Extract<ServerMessage, { type: T }> => message.type === type);
  }

  game(): GameView | undefined {
    return this.last("game")?.game;
  }

  lobby(): LobbySnapshot | undefined {
    return this.last("lobby")?.lobby;
  }

  terminate(): void {
    this.ws.terminate();
  }

  close(): void {
    if (this.closeCode === null) this.ws.close(1000, "smoke complete");
  }
}

async function api<T>(base: string, path: string): Promise<{ response: Response; body: T }> {
  const response = await fetch(`${base}${path}`);
  if (!response.ok) throw new Error(`GET ${path} returned ${response.status}`);
  return { response, body: (await response.json()) as T };
}

async function joinClient(
  base: string,
  name: string,
  options: {
    role?: "player" | "spectator";
    hostKey?: string;
    reconnectToken?: string;
  } = {},
): Promise<{ client: SmokeClient; joined: Extract<ServerMessage, { type: "joined" }> }> {
  const client = await SmokeClient.connect(`${base.replace(/^http/, "ws")}/ws`);
  client.send({
    type: "join",
    name,
    role: options.role ?? "player",
    hostKey: options.hostKey,
    reconnectToken: options.reconnectToken,
  });
  const joined = await waitFor(
    () => client.last("joined"),
    `join response for ${name}`,
  );
  return { client, joined };
}

function targetForCard(game: GameView, activeId: string, iid: string) {
  const self = game.self;
  if (!self || self.id !== activeId) return null;
  const instance = self.hand.find((card) => card.iid === iid);
  if (!instance) return null;
  const definition = getCard(instance.cardId);
  const me = game.players.find((player) => player.id === activeId);
  if (!me) return null;
  const enemies = game.players.filter(
    (player) => player.id !== activeId && player.teamId !== me.teamId && !player.eliminated,
  );
  const enemy = enemies[0];
  const enemyAsset = enemy?.battlefield[0];
  const ownAsset = me.battlefield[0];

  if (definition.target === "enemyPlayer" || definition.target === "anyPlayer") {
    if (!enemy) return null;
    return { iid, targetPlayerId: enemy.id };
  }
  if (definition.target === "enemyAsset") {
    if (!enemy || !enemyAsset) return null;
    return { iid, targetPlayerId: enemy.id, targetIid: enemyAsset.iid };
  }
  if (definition.target === "anyAsset") {
    const asset = enemyAsset ?? ownAsset;
    const owner = enemyAsset ? enemy : me;
    if (!asset || !owner) return null;
    return { iid, targetPlayerId: owner.id, targetIid: asset.iid };
  }
  if (definition.target === "ownAsset") {
    if (!ownAsset) return null;
    return { iid, targetPlayerId: me.id, targetIid: ownAsset.iid };
  }
  return { iid };
}

async function waitForGame(
  client: SmokeClient,
  phase: GameView["phase"],
  label: string,
  timeoutMs = 8_000,
): Promise<GameView> {
  return waitFor(
    () => {
      const game = client.game();
      return game?.phase === phase ? game : null;
    },
    label,
    timeoutMs,
  );
}

async function waitForSynchronized(
  clients: SmokeClient[],
  label: string,
): Promise<GameView[]> {
  return waitFor(
    () => {
      const games = clients.map((client) => client.game());
      const first = games[0];
      if (!first || games.some((game) => !game || game.version !== first.version)) return null;
      return games as GameView[];
    },
    label,
    6_000,
  );
}

const host: HostHandle = await startHost({
  port: 0,
  hostKey: "smoke-host-key",
  enableMdns: false,
  enableUdp: false,
  quiet: true,
});

const clients: SmokeClient[] = [];

try {
  step("HTTP API and built client");
  const health = await api<{ ok: boolean; version: string; noPlayerCap: boolean }>(
    host.url,
    "/api/health",
  );
  ok(health.body.ok === true, "health endpoint is live");
  ok(health.body.noPlayerCap === true, "host advertises no player cap");
  ok(health.body.version === "1.0.0", "protocol version is 1.0.0");

  const info = (await api<ServerInfo>(host.url, "/api/info")).body;
  ok(info.id === host.serverId, "info endpoint identifies this host");
  ok(info.port === host.port, "info endpoint reports the real port");
  ok(info.addresses.includes("127.0.0.1"), "loopback address is advertised");
  ok(info.hostKeyRequired === true, "host key is required for host controls");

  const cards = (await api<{ cards: unknown[] }>(host.url, "/api/cards")).body;
  ok(cards.cards.length === 221, "card API serves all 221 cards");

  const discovered = (await api<DiscoveryLobby[]>(host.url, "/api/discover")).body;
  ok(
    Array.isArray(discovered) && discovered.some((entry) => entry.id === host.serverId),
    "discovery endpoint lists the local lobby",
  );

  if (existsSync(join(ROOT, "dist", "client", "index.html"))) {
    const page = await fetch(`${host.url}/`);
    const html = await page.text();
    ok(page.ok && html.includes('id="root"'), "built client shell is served");
    ok(
      page.headers.get("content-type")?.includes("text/html") === true,
      "client route returns HTML",
    );
    const art = await fetch(`${host.url}/art/card-back.svg`);
    ok(art.ok && (await art.text()).includes("<svg"), "card art is served statically");
  } else {
    console.log("  · dist/client not built; skipping static client shell checks");
  }

  step("Host and guest join; host configures the table");
  const hostJoin = await joinClient(host.url, "Smoke Host", { hostKey: host.hostKey });
  clients.push(hostJoin.client);
  const hostId = hostJoin.joined.selfId;
  ok(hostJoin.joined.isHost === true, "host key grants host controls");
  ok(hostJoin.joined.lobby.noPlayerCap === true, "lobby snapshot advertises no cap");

  const guestName = "Smoke Guest";
  const guestJoin = await joinClient(host.url, guestName);
  clients.push(guestJoin.client);
  const guestId = guestJoin.joined.selfId;
  ok(guestJoin.joined.isHost === false, "guest does not receive host controls");
  ok(guestJoin.joined.role === "player", "guest joins as a player");
  await waitFor(
    () => (hostJoin.client.lobby()?.players.length === 2 ? true : null),
    "host roster to include the guest",
  );
  ok(true, "host sees both players in the lobby");

  hostJoin.client.send({
    type: "configure",
    settings: {
      lobbyName: "LAN Smoke Table",
      mode: "ffa",
      pacing: "turnBased",
      turnTimerSec: 0,
      roundTimerSec: 0,
      lateJoin: "players",
      allowSpectators: true,
      pointsToWin: 99,
      scoreLimit: 0,
      startingResources: 30,
      startingHp: 40,
      handSize: 6,
      deckSize: 24,
      cardsPerTurn: 5,
      roundLimit: 20,
      loseConditions: ["hp", "lives", "roundLimit"],
    },
  });
  await waitFor(
    () => (hostJoin.client.lobby()?.settings.lobbyName === "LAN Smoke Table" ? true : null),
    "host settings to apply",
  );
  ok(hostJoin.client.lobby()?.settings.handSize === 6, "host controls hand size");
  ok(hostJoin.client.lobby()?.settings.startingHp === 40, "host controls starting HP");

  hostJoin.client.send({ type: "addBot", difficulty: "hard" });
  await waitFor(
    () => (hostJoin.client.lobby()?.players.some((player) => player.isBot) ? true : null),
    "bot to appear",
  );
  ok(hostJoin.client.lobby()?.settings.botDifficulty === "hard", "host controls bot difficulty");

  guestJoin.client.send({ type: "setReady", ready: true });
  await waitFor(
    () => (hostJoin.client.lobby()?.canStart === true ? true : null),
    "lobby to become ready",
  );
  ok(true, "guest ready state unlocks start");

  hostJoin.client.send({ type: "startGame" });
  const initialHostGame = await waitForGame(hostJoin.client, "playing", "host game start");
  const initialGuestGame = await waitForGame(guestJoin.client, "playing", "guest game start");
  ok(initialHostGame.players.length === 3, "match starts with two humans and one bot");
  ok(initialGuestGame.self !== null, "guest receives a private hand");
  await waitForSynchronized([hostJoin.client, guestJoin.client], "initial views to synchronize");
  ok(true, "host and guest views agree on the initial state");
  ok(initialHostGame.settings.lobbyName === "LAN Smoke Table", "configured rules reach the match");

  step("Card play, chat and spectator view");
  const activeId = initialHostGame.activePlayerIds[0] ?? "";
  const activeClient =
    activeId === hostId ? hostJoin.client : activeId === guestId ? guestJoin.client : null;
  ok(activeClient !== null, "a human player owns the opening turn");
  const activeGame = activeClient!.game()!;
  const beforePlayIds = new Set(activeGame.log.map((entry) => entry.id));
  let payload: ReturnType<typeof targetForCard> = null;
  for (const iid of activeGame.self?.legalCardIds ?? []) {
    payload = targetForCard(activeGame, activeId, iid);
    if (payload) break;
  }
  ok(payload !== null, "the opening hand has a legal card with a resolvable target");
  const playedCardId = activeGame.self!.hand.find((card) => card.iid === payload!.iid)!.cardId;
  const playedCard = getCard(playedCardId);

  activeClient!.send({ type: "playCard", ...payload! });
  const afterPlay = await waitFor(
    () => {
      const game = activeClient!.game();
      if (!game) return null;
      const resolved = game.log.some(
        (entry) =>
          !beforePlayIds.has(entry.id) &&
          entry.actorId === activeId &&
          (entry.kind === "play" || entry.kind === "counter"),
      );
      return resolved ? game : null;
    },
    "card resolution",
  );
  ok(
    afterPlay.log.some((entry) => !beforePlayIds.has(entry.id) && entry.text.includes(playedCard.name)),
    `${playedCard.name} resolved on the authoritative table`,
  );

  guestJoin.client.send({ type: "chat", text: "smoke test" });
  const chat = await waitFor(
    () => hostJoin.client.last("chat")?.message,
    "chat broadcast",
  );
  ok(chat.text === `${guestName}: smoke test`, "chat reaches the host");
  ok(
    hostJoin.client.game()!.log.some((entry) => entry.kind === "chat" && entry.text.includes("smoke test")),
    "chat is stored in the combat log",
  );

  const spectator = await joinClient(host.url, "Smoke Watcher", { role: "spectator" });
  clients.push(spectator.client);
  ok(spectator.joined.role === "spectator", "spectator joins in read-only mode");
  ok(spectator.joined.game?.spectator === true, "spectator view is marked as spectator");
  ok(spectator.joined.game?.self === null, "spectator receives no private hand");
  ok(
    (hostJoin.client.lobby()?.spectators.length ?? 0) === 1,
    "host roster lists the spectator",
  );

  step("Late join and reconnect");
  const late = await joinClient(host.url, "Smoke Late");
  clients.push(late.client);
  ok(late.joined.role === "player", "late join enters the live match as a player");
  ok(late.joined.game?.self !== null, "late joiner receives a fresh hand");
  await waitFor(
    () => (hostJoin.client.lobby()?.players.length === 4 ? true : null),
    "late joiner in host roster",
  );
  ok(true, "host sees the late joiner alongside the bot");

  const guestToken = guestJoin.joined.reconnectToken;
  guestJoin.client.terminate();
  await waitFor(
    () =>
      hostJoin.client
        .lobby()
        ?.players.find((player) => player.id === guestId)?.connected === false
        ? true
        : null,
    "disconnect to be observed",
  );
  ok(true, "host marks a dropped guest as reconnecting");
  const reconnect = await joinClient(host.url, guestName, { reconnectToken: guestToken });
  clients.push(reconnect.client);
  ok(reconnect.joined.selfId === guestId, "reconnect restores the same player identity");
  ok(reconnect.joined.game?.self !== null, "reconnect restores the private hand");
  await waitFor(
    () =>
      hostJoin.client
        .lobby()
        ?.players.find((player) => player.id === guestId)?.connected === true
        ? true
        : null,
    "reconnect to show on host roster",
  );
  ok(true, "host sees the reconnected guest");

  const syncedViews = await waitForSynchronized(
    [hostJoin.client, reconnect.client, late.client],
    "views to synchronize after reconnect",
  );
  const hostView = syncedViews[0]!;
  const guestView = syncedViews[1]!;
  const lateView = syncedViews[2]!;
  ok(
    hostView.players.map((player) => player.id).join(",") ===
      guestView.players.map((player) => player.id).join(","),
    "host and guest see the same player order",
  );
  ok(hostView.round === guestView.round, "host and guest agree on the round");
  ok(
    hostView.players.map((player) => `${player.id}:${player.hp}:${player.score}`).join("|") ===
      lateView.players.map((player) => `${player.id}:${player.hp}:${player.score}`).join("|"),
    "stats stay synchronized across clients",
  );

  step("Return to lobby and complete a draft");
  hostJoin.client.send({ type: "returnToLobby" });
  await waitFor(
    () => (hostJoin.client.lobby()?.phase === "lobby" ? true : null),
    "return to lobby",
  );
  ok(hostJoin.client.lobby()?.gameRound === 0, "match state is closed and resets the round");
  ok((hostJoin.client.lobby()?.players.length ?? 0) >= 4, "lobby roster is preserved");

  hostJoin.client.send({
    type: "configure",
    settings: {
      mode: "draft",
      draftPicks: 2,
      deckSize: 8,
      handSize: 5,
      startingResources: 20,
      startingHp: 40,
      pointsToWin: 99,
      roundLimit: 20,
      lateJoin: "players",
    },
  });
  await waitFor(
    () => (hostJoin.client.lobby()?.settings.mode === "draft" ? true : null),
    "draft mode to apply",
  );
  reconnect.client.send({ type: "setReady", ready: true });
  late.client.send({ type: "setReady", ready: true });
  await waitFor(
    () => (hostJoin.client.lobby()?.canStart === true ? true : null),
    "draft lobby to become ready",
  );
  hostJoin.client.send({ type: "startGame" });
  await waitForGame(hostJoin.client, "drafting", "draft phase");
  await waitForGame(reconnect.client, "drafting", "guest draft phase");
  ok(true, "draft phase starts for every player");

  const draftClients: Array<{ client: SmokeClient; name: string }> = [
    { client: hostJoin.client, name: "host" },
    { client: reconnect.client, name: "guest" },
    { client: late.client, name: "late joiner" },
  ];
  const sentPicks = new Set<string>();
  let guard = 0;
  while (guard < 200) {
    const hostDraft = hostJoin.client.game();
    if (!hostDraft || hostDraft.phase !== "drafting") break;
    for (const entry of draftClients) {
      const draft = entry.client.game();
      if (!draft || draft.phase !== "drafting" || !draft.self) continue;
      if (draft.self.draftPicks >= 2) continue;
      const offer = draft.self.draftOffers[0];
      if (!offer) continue;
      const key = `${draft.self.id}:${draft.self.draftPicks}`;
      if (sentPicks.has(key)) continue;
      sentPicks.add(key);
      entry.client.send({ type: "draftPick", cardId: offer.id });
    }
    await delay(80);
    guard += 1;
  }
  const drafted = await waitForGame(hostJoin.client, "playing", "draft completion", 15_000);
  ok(drafted.players.every((player) => player.draftPicks === 2), "every player completed two picks");
  ok(
    drafted.players.every((player) => player.handCount > 0 && player.deckCount > 0),
    "completed drafts produce playable decks and hands",
  );
  await waitForSynchronized(
    [hostJoin.client, reconnect.client, late.client],
    "post-draft synchronization",
  );
  ok(true, "all clients agree after the draft");

  for (const client of clients) {
    ok(client.errors.length === 0, "no host errors were emitted to clients");
  }

  step(`PASS — ${checks} checks`);
} finally {
  for (const client of clients) {
    try {
      client.close();
    } catch {
      // Best effort during teardown.
    }
  }
  await host.close();
}
