import { randomUUID } from "node:crypto";
import type {
  BotDifficulty,
  ClientMessageMap,
  ClientRole,
  GameSettings,
  GameView,
  LobbyPlayer,
  LobbyPhase,
  LobbySnapshot,
  LogEntry,
  ServerMessage,
  SpectatorPublic,
} from "../shared/types.js";
import { CLIENT_VERSION, GameRuleError } from "../shared/types.js";
import {
  addLatePlayer,
  appendChat,
  createGame,
  draftPick,
  endTurn,
  makeView,
  markConnection,
  normaliseSettings,
  playCard,
  tickGame,
  validateGameSettings,
  type EngineParticipant,
  type GameState,
} from "../shared/engine.js";
import { takeBotAction, takeBotDraftPick } from "./bots.js";

export interface LobbySocket {
  id: string;
  send(message: ServerMessage): void;
  close(reason: string): void;
}

export interface LobbyOptions {
  id?: string;
  hostKey: string;
  serverVersion?: string;
  settings?: Partial<GameSettings>;
  now?: () => number;
}

interface LobbyMember extends LobbyPlayer {
  token: string;
  connectionId: string | null;
  disconnectedAt: number | null;
}

interface LobbySpectator extends SpectatorPublic {
  token: string;
  connectionId: string | null;
  disconnectedAt: number | null;
}

interface Connection {
  socket: LobbySocket;
  selfId: string;
  role: ClientRole;
}

const BOT_NAMES = [
  "Packet Goblin",
  "Null Pointer",
  "Kernel Panic",
  "Proxy Prowler",
  "Rootworm",
  "Cache Wolf",
  "Loopback",
  "Segfault",
  "Bit Rot",
  "Stack Smasher",
  "Ping Phantom",
  "Daemon",
  "Cipher Rat",
  "Dead Drop",
  "Fork Bomb",
  "Socket Viper",
];

function cleanName(raw: unknown, fallback = "Player"): string {
  const value = typeof raw === "string" ? raw : "";
  const cleaned = value
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 24);
  return cleaned || fallback;
}

function cleanChat(raw: unknown): string {
  return (typeof raw === "string" ? raw : "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 400);
}

function cloneSettings(settings: GameSettings): GameSettings {
  return {
    ...settings,
    loseConditions: [...settings.loseConditions],
    enabledExpansions: [...settings.enabledExpansions],
    enabledCards: [...settings.enabledCards],
    bannedCards: [...settings.bannedCards],
  };
}

function generateToken(): string {
  return `${randomUUID()}${randomUUID()}`.replaceAll("-", "");
}

export class Lobby {
  readonly id: string;
  readonly hostKey: string;
  readonly serverVersion: string;
  private readonly now: () => number;
  private settings: GameSettings;
  private players = new Map<string, LobbyMember>();
  private spectators = new Map<string, LobbySpectator>();
  private playerTokens = new Map<string, string>();
  private spectatorTokens = new Map<string, string>();
  private connections = new Map<string, Connection>();
  private hostId: string | null = null;
  private gameState: GameState | null = null;
  private createdAt: number;

  constructor(options: LobbyOptions) {
    this.id = options.id ?? randomUUID();
    this.hostKey = options.hostKey;
    this.serverVersion = options.serverVersion ?? CLIENT_VERSION;
    this.now = options.now ?? Date.now;
    this.settings = normaliseSettings(options.settings);
    this.createdAt = this.now();
  }

  get game(): GameState | null {
    return this.gameState;
  }

  get phase(): LobbyPhase {
    return this.gameState?.phase ?? "lobby";
  }

  get settingsSnapshot(): GameSettings {
    return cloneSettings(this.settings);
  }

  get hostConnected(): boolean {
    if (!this.hostId) return false;
    return Boolean(this.players.get(this.hostId)?.connected);
  }

  get hostName(): string {
    if (!this.hostId) return "Unclaimed";
    return this.players.get(this.hostId)?.name ?? "Unclaimed";
  }

  get playerCount(): number {
    return this.players.size;
  }

  get spectatorCount(): number {
    return this.spectators.size;
  }

  snapshot(): LobbySnapshot {
    return {
      id: this.id,
      hostName: this.hostName,
      hostConnected: this.hostConnected,
      createdAt: this.createdAt,
      phase: this.phase,
      settings: this.settingsSnapshot,
      players: [...this.players.values()].map((member) => this.publicPlayer(member)),
      spectators: [...this.spectators.values()].map((spectator) => this.publicSpectator(spectator)),
      gameRound: this.gameState?.round ?? 0,
      canStart: this.computeCanStart(),
      serverVersion: this.serverVersion,
      discoveryName: this.settings.lobbyName,
      noPlayerCap: true,
    };
  }

  join(socket: LobbySocket, message: ClientMessageMap["join"]): void {
    const existingConnection = [...this.connections.values()].find(
      (connection) => connection.socket.id === socket.id,
    );
    if (existingConnection) {
      throw new GameRuleError("not-allowed", "This connection has already joined.");
    }

    const reconnectToken = typeof message.reconnectToken === "string" ? message.reconnectToken.trim() : "";
    if (reconnectToken) {
      const playerId = this.playerTokens.get(reconnectToken);
      const member = playerId ? this.players.get(playerId) : undefined;
      if (member) {
        this.reconnectPlayer(socket, member);
        return;
      }
      const spectatorId = this.spectatorTokens.get(reconnectToken);
      const spectator = spectatorId ? this.spectators.get(spectatorId) : undefined;
      if (spectator) {
        this.reconnectSpectator(socket, spectator);
        return;
      }
    }

    const name = cleanName(message.name);
    let role: ClientRole = message.role === "spectator" ? "spectator" : "player";
    const wantsHost = typeof message.hostKey === "string" && message.hostKey.length > 0;
    if (wantsHost && message.hostKey !== this.hostKey) {
      throw new GameRuleError("not-allowed", "The host key is incorrect.");
    }

    const activeGame = this.gameState && (this.gameState.phase === "drafting" || this.gameState.phase === "playing");
    if (role === "player" && activeGame) {
      if (this.gameState!.phase === "drafting") {
        role = "spectator";
      } else if (this.settings.lateJoin === "off") {
        throw new GameRuleError("not-allowed", "This match has started and late joining is disabled.");
      } else if (this.settings.lateJoin === "spectators") {
        role = "spectator";
      }
    }
    if (role === "player" && this.gameState?.phase === "ended") {
      role = "spectator";
    }
    if (role === "spectator" && !this.settings.allowSpectators) {
      throw new GameRuleError("not-allowed", "Spectators are disabled in this lobby.");
    }
    if (wantsHost && role !== "player") {
      throw new GameRuleError("not-allowed", "Hosts must join as a player before the match starts.");
    }

    const id = randomUUID();
    const token = generateToken();
    const timestamp = this.now();
    if (role === "player") {
      const member: LobbyMember = {
        id,
        name,
        isBot: false,
        teamId: "",
        connected: true,
        isHost: false,
        connectedAt: timestamp,
        lastSeenAt: timestamp,
        ready: false,
        token,
        connectionId: socket.id,
        disconnectedAt: null,
      };
      this.players.set(id, member);
      this.playerTokens.set(token, id);
      member.teamId = this.assignTeamId(false);
      let hostAssigned = false;
      if (wantsHost) hostAssigned = this.claimHost(member);
      if (!hostAssigned && wantsHost) {
        this.send(socket, {
          type: "notice",
          message: "Host key accepted, but this lobby already has an active host. You joined as a player.",
          tone: "warn",
        });
      }
      this.connections.set(socket.id, { socket, selfId: id, role: "player" });
      if (this.gameState?.phase === "playing") {
        try {
          addLatePlayer(this.gameState, this.participantFor(member), member.teamId);
        } catch {
          // The engine may have ended between validation and insertion.
        }
      }
      this.sendJoined(socket, id, "player");
      this.broadcastLobby();
      this.broadcastGame();
      return;
    }

    const spectator: LobbySpectator = {
      id,
      name,
      connected: true,
      connectedAt: timestamp,
      token,
      connectionId: socket.id,
      disconnectedAt: null,
    };
    this.spectators.set(id, spectator);
    this.spectatorTokens.set(token, id);
    this.connections.set(socket.id, { socket, selfId: id, role: "spectator" });
    this.sendJoined(socket, id, "spectator");
    if (role === "spectator") {
      this.send(socket, {
        type: "notice",
        message: wantsHost
          ? "Host key accepted, but hosts must join as a player before the match starts."
          : "Spectating. The table is read-only.",
        tone: wantsHost ? "warn" : "info",
      });
    }
    this.broadcastLobby();
    this.broadcastGame();
  }

  handle(connectionId: string, message: { type: string; [key: string]: unknown }): void {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new GameRuleError("not-allowed", "Join the lobby before sending commands.");
    }

    switch (message.type) {
      case "ping": {
        this.send(connection.socket, {
          type: "pong",
          t: typeof message.t === "number" ? message.t : 0,
          serverTime: this.now(),
        });
        return;
      }
      case "configure": {
        this.requireHost(connection);
        this.configure(message.settings);
        return;
      }
      case "startGame": {
        this.requireHost(connection);
        this.startGame();
        return;
      }
      case "addBot": {
        this.requireHost(connection);
        this.addBot(message.difficulty as BotDifficulty | undefined);
        return;
      }
      case "removeBot": {
        this.requireHost(connection);
        this.removeBot(String(message.playerId ?? ""));
        return;
      }
      case "kick": {
        this.requireHost(connection);
        this.kick(String(message.playerId ?? ""));
        return;
      }
      case "setReady": {
        const member = this.requirePlayer(connection);
        if (this.phase !== "lobby") {
          throw new GameRuleError("not-allowed", "Ready state is only used in the lobby.");
        }
        member.ready = Boolean(message.ready);
        this.broadcastLobby();
        return;
      }
      case "playCard": {
        const member = this.requirePlayer(connection);
        if (!this.gameState || this.gameState.phase !== "playing") {
          throw new GameRuleError("game-not-active", "The match is not in play.");
        }
        playCard(this.gameState, member.id, {
          iid: String(message.iid ?? ""),
          targetPlayerId: typeof message.targetPlayerId === "string" ? message.targetPlayerId : undefined,
          targetIid: typeof message.targetIid === "string" ? message.targetIid : undefined,
        });
        this.afterGameMutation();
        return;
      }
      case "endTurn": {
        const member = this.requirePlayer(connection);
        if (!this.gameState) {
          throw new GameRuleError("game-not-active", "There is no active match.");
        }
        endTurn(this.gameState, member.id, "manual");
        this.afterGameMutation();
        return;
      }
      case "draftPick": {
        const member = this.requirePlayer(connection);
        if (!this.gameState) {
          throw new GameRuleError("game-not-active", "There is no active draft.");
        }
        draftPick(this.gameState, member.id, String(message.cardId ?? ""));
        this.afterGameMutation();
        return;
      }
      case "chat": {
        const text = cleanChat(message.text);
        if (!text) return;
        const actor = this.memberForConnection(connection);
        const name = actor?.name ?? "Spectator";
        const entry: LogEntry = {
          id: `chat-${randomUUID()}`,
          at: this.now(),
          round: this.gameState?.round ?? 0,
          kind: "chat",
          text: `${name}: ${text}`,
          actorId: actor?.id,
        };
        if (this.gameState) {
          appendChat(this.gameState, actor?.id ?? "", name, text);
          this.broadcastGame();
        }
        for (const target of this.connections.values()) {
          this.send(target.socket, { type: "chat", message: entry });
        }
        return;
      }
      case "returnToLobby": {
        this.requireHost(connection);
        this.returnToLobby();
        return;
      }
      case "leave": {
        this.leave(connectionId);
        return;
      }
      default:
        throw new GameRuleError("invalid-action", `Unknown command "${message.type}".`);
    }
  }

  disconnect(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;
    this.connections.delete(connectionId);
    const timestamp = this.now();
    if (connection.role === "player") {
      const member = this.players.get(connection.selfId);
      if (member) {
        member.connectionId = null;
        member.connected = false;
        member.lastSeenAt = timestamp;
        member.disconnectedAt = timestamp;
        if (this.gameState) {
          markConnection(this.gameState, member.id, false);
        }
      }
    } else {
      const spectator = this.spectators.get(connection.selfId);
      if (spectator) {
        spectator.connectionId = null;
        spectator.connected = false;
        spectator.disconnectedAt = timestamp;
      }
    }
    this.broadcastLobby();
    this.broadcastGame();
  }

  tick(): void {
    if (!this.gameState) {
      if (this.pruneDisconnected()) this.broadcastLobby();
      return;
    }
    const phaseBefore = this.gameState.phase;
    const versionBefore = this.gameState.version;
    try {
      if (this.gameState.phase === "drafting") {
        for (const bot of this.gameState.players.filter((player) => player.isBot)) {
          if (this.gameState.phase !== "drafting") break;
          takeBotDraftPick(this.gameState, bot.id);
        }
      }
      if (this.gameState?.phase === "playing") {
        tickGame(this.gameState);
      }
      if (this.gameState?.phase === "playing") {
        for (const bot of this.gameState.players.filter((player) => player.isBot)) {
          if (this.gameState.phase !== "playing") break;
          if (!bot.connected) continue;
          takeBotAction(this.gameState, bot.id, this.settings.botDifficulty);
        }
      }
    } catch (error) {
      console.error("[bot] action failed", error);
    }
    if (this.gameState && this.gameState.version !== versionBefore) {
      this.broadcastGame();
    }
    if (this.gameState && this.gameState.phase !== phaseBefore) {
      this.broadcastLobby();
    }
    if (this.pruneDisconnected()) this.broadcastLobby();
  }

  private participantFor(member: LobbyMember): EngineParticipant {
    return {
      id: member.id,
      name: member.name,
      isBot: member.isBot,
      teamId: member.teamId,
    };
  }

  private publicPlayer(member: LobbyMember): LobbyPlayer {
    return {
      id: member.id,
      name: member.name,
      isBot: member.isBot,
      teamId: member.teamId,
      connected: member.connected,
      isHost: member.id === this.hostId,
      connectedAt: member.connectedAt,
      lastSeenAt: member.lastSeenAt,
      ready: member.isBot ? true : member.id === this.hostId ? true : member.ready,
    };
  }

  private publicSpectator(spectator: LobbySpectator): SpectatorPublic {
    return {
      id: spectator.id,
      name: spectator.name,
      connected: spectator.connected,
      connectedAt: spectator.connectedAt,
    };
  }

  private computeCanStart(): boolean {
    if (this.phase !== "lobby" || !this.hostId) return false;
    if (!this.hostConnected) return false;
    const botGap = Math.max(0, this.settings.botCount - this.countBots());
    if (this.players.size + botGap < 2) return false;
    return [...this.players.values()].every(
      (member) =>
        member.isBot ||
        member.id === this.hostId ||
        !member.connected ||
        member.ready,
    );
  }

  private countBots(): number {
    return [...this.players.values()].filter((member) => member.isBot).length;
  }

  private assignTeamId(isBot: boolean): string {
    if (this.settings.mode === "coop") return isBot ? "ai" : "crew";
    if (this.settings.mode !== "teams") return `solo-${randomUUID()}`;
    const counts = new Map<string, number>();
    for (const member of this.players.values()) {
      if (!member.teamId) continue;
      counts.set(member.teamId, (counts.get(member.teamId) ?? 0) + 1);
    }
    const teamSize = Math.max(1, this.settings.teamSize);
    let best: string | null = null;
    let bestCount = Number.POSITIVE_INFINITY;
    for (const [teamId, count] of counts) {
      if (count >= teamSize) continue;
      if (count < bestCount) {
        best = teamId;
        bestCount = count;
      }
    }
    if (best) return best;
    return `team-${counts.size + 1}`;
  }

  private reassignTeams(): void {
    if (this.settings.mode === "coop") {
      for (const member of this.players.values()) member.teamId = member.isBot ? "ai" : "crew";
      return;
    }
    if (this.settings.mode !== "teams") {
      for (const member of this.players.values()) {
        if (!member.teamId.startsWith("solo-")) member.teamId = `solo-${randomUUID()}`;
      }
      return;
    }
    const teamSize = Math.max(1, this.settings.teamSize);
    let index = 0;
    let team = 1;
    for (const member of this.players.values()) {
      member.teamId = `team-${team}`;
      index += 1;
      if (index >= teamSize) {
        index = 0;
        team += 1;
      }
    }
  }

  private claimHost(member: LobbyMember): boolean {
    const current = this.hostId ? this.players.get(this.hostId) : undefined;
    if (current && current.id !== member.id && current.connected) {
      return false;
    }
    if (current && current.id !== member.id) current.isHost = false;
    this.hostId = member.id;
    member.isHost = true;
    return true;
  }

  private reconnectPlayer(socket: LobbySocket, member: LobbyMember): void {
    member.connectionId = socket.id;
    member.connected = true;
    member.lastSeenAt = this.now();
    member.disconnectedAt = null;
    if (this.gameState) markConnection(this.gameState, member.id, true);
    this.connections.set(socket.id, { socket, selfId: member.id, role: "player" });
    this.sendJoined(socket, member.id, "player");
    this.broadcastLobby();
    this.broadcastGame();
  }

  private reconnectSpectator(socket: LobbySocket, spectator: LobbySpectator): void {
    if (!this.settings.allowSpectators) {
      throw new GameRuleError("not-allowed", "Spectators are disabled in this lobby.");
    }
    spectator.connectionId = socket.id;
    spectator.connected = true;
    spectator.disconnectedAt = null;
    this.connections.set(socket.id, { socket, selfId: spectator.id, role: "spectator" });
    this.sendJoined(socket, spectator.id, "spectator");
    this.broadcastLobby();
    this.broadcastGame();
  }

  private sendJoined(socket: LobbySocket, selfId: string, role: ClientRole): void {
    const token =
      role === "player"
        ? this.players.get(selfId)?.token ?? ""
        : this.spectators.get(selfId)?.token ?? "";
    const game = this.gameState;
    const view: GameView | null = game ? makeView(game, selfId, role === "spectator") : null;
    this.send(socket, {
      type: "joined",
      selfId,
      isHost: this.hostId === selfId,
      reconnectToken: token,
      role,
      lobby: this.snapshot(),
      game: view,
      serverTime: this.now(),
    });
  }

  private requireHost(connection: Connection): void {
    if (this.hostId !== connection.selfId) {
      throw new GameRuleError("not-allowed", "Only the host can do that.");
    }
  }

  private requirePlayer(connection: Connection): LobbyMember {
    if (connection.role !== "player") {
      throw new GameRuleError("not-allowed", "Spectators cannot perform that action.");
    }
    const member = this.players.get(connection.selfId);
    if (!member) throw new GameRuleError("not-allowed", "Player slot not found.");
    return member;
  }

  private memberForConnection(connection: Connection): LobbyMember | undefined {
    return connection.role === "player" ? this.players.get(connection.selfId) : undefined;
  }

  private configure(patch: unknown): void {
    if (this.phase !== "lobby") {
      throw new GameRuleError("not-allowed", "Settings are locked after the match starts.");
    }
    if (!patch || typeof patch !== "object") {
      throw new GameRuleError("invalid-action", "Settings payload is invalid.");
    }
    const next = normaliseSettings({ ...this.settings, ...(patch as Partial<GameSettings>) });
    const error = validateGameSettings(next);
    if (error) throw new GameRuleError("invalid-action", error);
    const previous = this.settings;
    this.settings = next;
    if (
      previous.mode !== next.mode ||
      previous.teamSize !== next.teamSize
    ) {
      this.reassignTeams();
    }
    if (previous.botCount !== next.botCount) {
      this.syncBotsToTarget();
    }
    this.broadcastLobby();
  }

  private startGame(): void {
    if (this.phase !== "lobby") {
      throw new GameRuleError("not-allowed", "The match has already started.");
    }
    this.syncBotsToTarget();
    if (this.players.size < 2) {
      throw new GameRuleError("not-allowed", "Add another player or a bot before starting.");
    }
    if (!this.computeCanStart()) {
      throw new GameRuleError("not-allowed", "Every connected guest must be ready before the host starts.");
    }
    const participants = [...this.players.values()].map((member) => this.participantFor(member));
    try {
      this.gameState = createGame({
        id: randomUUID(),
        participants,
        settings: this.settings,
      });
    } catch (error) {
      throw new GameRuleError(
        "invalid-action",
        error instanceof Error ? error.message : "Could not start the match.",
      );
    }
    for (const member of this.players.values()) {
      member.ready = member.isBot;
    }
    this.hostId = this.hostId ?? [...this.players.values()].find((member) => member.connected)?.id ?? null;
    this.broadcastLobby();
    this.broadcastGame();
    this.notice("Match started. Good luck, defenders.", "success");
  }

  private addBot(difficulty?: BotDifficulty): void {
    if (this.phase !== "lobby") {
      throw new GameRuleError("not-allowed", "Bots can only be added in the lobby.");
    }
    if (this.countBots() >= 128) {
      throw new GameRuleError("not-allowed", "Bot limit reached for this host.");
    }
    this.settings.botCount = Math.max(this.settings.botCount, this.countBots()) + 1;
    if (difficulty) this.settings.botDifficulty = difficulty;
    this.syncBotsToTarget();
    this.broadcastLobby();
  }

  private addBotInternal(difficulty?: BotDifficulty): LobbyMember {
    const usedNames = new Set([...this.players.values()].map((member) => member.name));
    const name = BOT_NAMES.find((candidate) => !usedNames.has(candidate)) ?? `Bot ${this.countBots() + 1}`;
    const id = randomUUID();
    const timestamp = this.now();
    const member: LobbyMember = {
      id,
      name,
      isBot: true,
      teamId: "",
      connected: true,
      isHost: false,
      connectedAt: timestamp,
      lastSeenAt: timestamp,
      ready: true,
      token: "",
      connectionId: null,
      disconnectedAt: null,
    };
    if (difficulty) this.settings.botDifficulty = difficulty;
    this.players.set(id, member);
    member.teamId = this.assignTeamId(true);
    return member;
  }

  private syncBotsToTarget(): void {
    const target = Math.max(0, Math.min(128, Math.round(this.settings.botCount)));
    let guard = 0;
    while (this.countBots() < target && guard < 128) {
      this.addBotInternal();
      guard += 1;
    }
    if (this.countBots() > target) {
      const bots = [...this.players.values()].filter((member) => member.isBot);
      for (const bot of bots.slice(0, bots.length - target)) {
        this.players.delete(bot.id);
      }
      this.reassignTeams();
    }
    this.settings.botCount = this.countBots();
  }

  private removeBot(playerId: string): void {
    if (this.phase !== "lobby") {
      throw new GameRuleError("not-allowed", "Bots can only be removed in the lobby.");
    }
    const member = this.players.get(playerId);
    if (!member || !member.isBot) {
      throw new GameRuleError("invalid-action", "That player is not a bot.");
    }
    this.players.delete(playerId);
    this.settings.botCount = Math.max(0, this.countBots());
    this.syncBotsToTarget();
    this.broadcastLobby();
  }

  private kick(playerId: string): void {
    if (this.phase === "playing" || this.phase === "drafting") {
      throw new GameRuleError("not-allowed", "Players cannot be kicked during an active match.");
    }
    if (playerId === this.hostId) {
      throw new GameRuleError("not-allowed", "The host cannot kick themselves.");
    }
    const player = this.players.get(playerId);
    if (player && player.isBot) {
      this.removeBot(playerId);
      return;
    }
    if (player) {
      const connection = player.connectionId ? this.connections.get(player.connectionId) : undefined;
      if (connection) {
        this.send(connection.socket, { type: "kicked", reason: "The host removed you from the lobby." });
        this.connections.delete(connection.socket.id);
        this.close(connection.socket, "kicked");
      }
      this.players.delete(playerId);
      this.playerTokens.delete(player.token);
      this.broadcastLobby();
      return;
    }
    const spectator = this.spectators.get(playerId);
    if (spectator) {
      const connection = spectator.connectionId ? this.connections.get(spectator.connectionId) : undefined;
      if (connection) {
        this.send(connection.socket, { type: "kicked", reason: "The host removed you from the lobby." });
        this.connections.delete(connection.socket.id);
        this.close(connection.socket, "kicked");
      }
      this.spectators.delete(playerId);
      this.spectatorTokens.delete(spectator.token);
      this.broadcastLobby();
      return;
    }
    throw new GameRuleError("invalid-action", "That player is no longer in the lobby.");
  }

  private returnToLobby(): void {
    if (!this.gameState) {
      throw new GameRuleError("game-not-active", "The lobby is already open.");
    }
    this.gameState = null;
    for (const member of this.players.values()) member.ready = member.isBot;
    this.reassignTeams();
    this.notice("The host returned everyone to the lobby.", "info");
    this.broadcastLobby();
  }

  private leave(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;
    this.connections.delete(connectionId);
    if (connection.role === "spectator") {
      const spectator = this.spectators.get(connection.selfId);
      if (spectator) {
        this.spectators.delete(spectator.id);
        this.spectatorTokens.delete(spectator.token);
      }
      this.send(connection.socket, { type: "left" });
      this.close(connection.socket, "left");
      this.broadcastLobby();
      return;
    }
    const member = this.players.get(connection.selfId);
    if (!member) return;
    if (this.gameState && this.gameState.phase !== "ended") {
      member.connectionId = null;
      member.connected = false;
      member.disconnectedAt = this.now();
      markConnection(this.gameState, member.id, false);
      this.send(connection.socket, { type: "left" });
      this.close(connection.socket, "left");
      this.broadcastLobby();
      this.broadcastGame();
      return;
    }
    this.players.delete(member.id);
    this.playerTokens.delete(member.token);
    if (this.hostId === member.id) this.hostId = null;
    this.send(connection.socket, { type: "left" });
    this.close(connection.socket, "left");
    this.broadcastLobby();
  }

  private pruneDisconnected(): boolean {
    const timestamp = this.now();
    const grace = Math.max(0, this.settings.reconnectGraceSec) * 1000;
    let removed = false;
    if (!this.gameState || this.gameState.phase === "ended") {
      for (const member of [...this.players.values()]) {
        if (member.connected || member.isBot || member.id === this.hostId) continue;
        if (member.disconnectedAt !== null && timestamp - member.disconnectedAt >= grace) {
          this.players.delete(member.id);
          this.playerTokens.delete(member.token);
          removed = true;
        }
      }
    }
    for (const spectator of [...this.spectators.values()]) {
      if (spectator.connected) continue;
      if (spectator.disconnectedAt !== null && timestamp - spectator.disconnectedAt >= grace) {
        this.spectators.delete(spectator.id);
        this.spectatorTokens.delete(spectator.token);
        removed = true;
      }
    }
    return removed;
  }

  private afterGameMutation(): void {
    this.broadcastGame();
    if (this.gameState?.phase === "ended") {
      this.broadcastLobby();
    }
    this.pruneDisconnected();
  }

  private broadcastLobby(): void {
    const lobby = this.snapshot();
    for (const connection of this.connections.values()) {
      this.send(connection.socket, { type: "lobby", lobby });
    }
  }

  private broadcastGame(): void {
    if (!this.gameState) return;
    for (const [connectionId, connection] of this.connections) {
      const view = makeView(this.gameState, connection.selfId, connection.role === "spectator");
      this.send(connection.socket, { type: "game", game: view });
      if (!this.connections.has(connectionId)) break;
    }
  }

  private notice(message: string, tone: "info" | "warn" | "success"): void {
    for (const connection of this.connections.values()) {
      this.send(connection.socket, { type: "notice", message, tone });
    }
  }

  private send(socket: LobbySocket, message: ServerMessage): void {
    try {
      socket.send(message);
    } catch {
      // A closed socket is cleaned up by its owning transport.
    }
  }

  private close(socket: LobbySocket, reason: string): void {
    try {
      socket.close(reason);
    } catch {
      // Ignore transport close failures.
    }
  }
}
