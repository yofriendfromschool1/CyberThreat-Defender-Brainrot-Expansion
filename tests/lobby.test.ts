import { describe, expect, it } from "vitest";
import { Lobby, type LobbySocket } from "../src/server/lobby.js";
import {
  GameRuleError,
  type ClientMessageMap,
  type GameSettings,
  type ServerMessage,
} from "../src/shared/types.js";

class TestSocket implements LobbySocket {
  readonly messages: ServerMessage[] = [];
  closedReason: string | null = null;

  constructor(readonly id: string) {}

  send(message: ServerMessage): void {
    this.messages.push(message);
  }

  close(reason: string): void {
    this.closedReason = reason;
  }

  last<T extends ServerMessage["type"]>(type: T): Extract<ServerMessage, { type: T }> | undefined {
    return this.messages
      .slice()
      .reverse()
      .find((message): message is Extract<ServerMessage, { type: T }> => message.type === type);
  }

  all<T extends ServerMessage["type"]>(type: T): Extract<ServerMessage, { type: T }>[] {
    return this.messages.filter(
      (message): message is Extract<ServerMessage, { type: T }> => message.type === type,
    );
  }
}

let socketSeq = 0;
function socket(): TestSocket {
  socketSeq += 1;
  return new TestSocket(`socket-${socketSeq}`);
}

function join(
  lobby: Lobby,
  target: TestSocket,
  options: Partial<ClientMessageMap["join"]> & { name: string },
): void {
  lobby.join(target, {
    type: "join",
    role: "player",
    ...options,
  });
}

function baseSettings(overrides: Partial<GameSettings> = {}): Partial<GameSettings> {
  return {
    turnTimerSec: 0,
    roundTimerSec: 0,
    lateJoin: "players",
    allowSpectators: true,
    pointsToWin: 30,
    roundLimit: 20,
    ...overrides,
  };
}

describe("lobby lifecycle", () => {
  it("assigns the host, broadcasts roster changes, and starts a bot match", () => {
    const lobby = new Lobby({ hostKey: "host-secret", settings: baseSettings() });
    const host = socket();
    join(lobby, host, { name: "Host", hostKey: "host-secret" });

    const hostJoined = host.last("joined")!;
    expect(hostJoined.isHost).toBe(true);
    expect(hostJoined.role).toBe("player");
    expect(hostJoined.reconnectToken.length).toBeGreaterThan(20);
    expect(host.last("lobby")!.lobby.hostName).toBe("Host");
    expect(host.last("lobby")!.lobby.noPlayerCap).toBe(true);

    const guest = socket();
    join(lobby, guest, { name: "Guest" });
    const guestJoined = guest.last("joined")!;
    expect(guestJoined.isHost).toBe(false);
    expect(guestJoined.lobby.players).toHaveLength(2);
    expect(host.last("lobby")!.lobby.players).toHaveLength(2);
    expect(lobby.snapshot().canStart).toBe(false);

    expect(() =>
      lobby.handle(host.id, { type: "startGame" }),
    ).toThrow(/ready/);

    expect(() =>
      lobby.handle(guest.id, { type: "configure", settings: { lobbyName: "Hacked" } }),
    ).toThrow(/Only the host/);

    lobby.handle(host.id, { type: "configure", settings: { lobbyName: "Test LAN" } });
    expect(lobby.snapshot().settings.lobbyName).toBe("Test LAN");

    lobby.handle(host.id, { type: "addBot", difficulty: "hard" });
    expect(lobby.snapshot().players.filter((player) => player.isBot)).toHaveLength(1);
    expect(lobby.snapshot().settings.botDifficulty).toBe("hard");

    lobby.handle(guest.id, { type: "setReady", ready: true });
    expect(lobby.snapshot().canStart).toBe(true);
    lobby.handle(host.id, { type: "startGame" });

    expect(lobby.phase).toBe("playing");
    expect(lobby.game).not.toBeNull();
    expect(lobby.game!.players).toHaveLength(3);
    expect(lobby.game!.players.filter((player) => player.isBot)).toHaveLength(1);
    expect(host.last("game")!.game.phase).toBe("playing");
    expect(host.last("game")!.game.self).not.toBeNull();
    expect(guest.last("game")!.game.self!.hand.length).toBeGreaterThan(0);
    expect(host.last("notice")!.message).toMatch(/Match started/);
  });

  it("rejects a wrong host key without mutating the lobby", () => {
    const lobby = new Lobby({ hostKey: "right-key", settings: baseSettings() });
    const intruder = socket();
    let error: GameRuleError | null = null;
    try {
      join(lobby, intruder, { name: "Intruder", hostKey: "wrong-key" });
    } catch (caught) {
      error = caught as GameRuleError;
    }
    expect(error).toBeInstanceOf(GameRuleError);
    expect(error!.code).toBe("not-allowed");
    expect(lobby.snapshot().players).toHaveLength(0);
  });

  it("supports spectators, chat, reconnect and late joining", () => {
    const lobby = new Lobby({ hostKey: "key", settings: baseSettings() });
    const host = socket();
    const guest = socket();
    join(lobby, host, { name: "Host", hostKey: "key" });
    join(lobby, guest, { name: "Guest" });
    const guestId = guest.last("joined")!.selfId;
    const guestToken = guest.last("joined")!.reconnectToken;

    lobby.handle(guest.id, { type: "setReady", ready: true });
    lobby.handle(host.id, { type: "startGame" });
    expect(lobby.phase).toBe("playing");

    lobby.handle(guest.id, { type: "chat", text: "gl hf" });
    const chat = host.last("chat");
    expect(chat?.message.text).toBe("Guest: gl hf");
    expect(host.last("game")!.game.log.some((entry) => entry.kind === "chat")).toBe(true);

    lobby.disconnect(guest.id);
    expect(lobby.snapshot().players.find((player) => player.id === guestId)!.connected).toBe(false);
    expect(lobby.game!.players.find((player) => player.id === guestId)!.connected).toBe(false);

    const reconnect = socket();
    join(lobby, reconnect, { name: "Guest", reconnectToken: guestToken });
    const rejoined = reconnect.last("joined")!;
    expect(rejoined.selfId).toBe(guestId);
    expect(rejoined.role).toBe("player");
    expect(rejoined.game!.self).not.toBeNull();
    expect(lobby.snapshot().players.find((player) => player.id === guestId)!.connected).toBe(true);

    const spectator = socket();
    join(lobby, spectator, { name: "Watcher", role: "spectator" });
    const spectatorJoined = spectator.last("joined")!;
    expect(spectatorJoined.role).toBe("spectator");
    expect(spectatorJoined.game!.spectator).toBe(true);
    expect(spectatorJoined.game!.self).toBeNull();
    expect(lobby.snapshot().spectators).toHaveLength(1);

    expect(() =>
      lobby.handle(spectator.id, { type: "endTurn" }),
    ).toThrow(/Spectators cannot/);

    const late = socket();
    join(lobby, late, { name: "Late" });
    const lateJoined = late.last("joined")!;
    expect(lateJoined.role).toBe("player");
    expect(lateJoined.game!.players.some((player) => player.name === "Late")).toBe(true);
    expect(lateJoined.game!.self).not.toBeNull();

    lobby.handle(host.id, { type: "returnToLobby" });
    expect(lobby.phase).toBe("lobby");
    expect(lobby.game).toBeNull();
    expect(host.last("lobby")!.lobby.phase).toBe("lobby");
  });

  it("enforces spectator and late-join host settings", () => {
    const lobby = new Lobby({
      hostKey: "key",
      settings: baseSettings({ allowSpectators: false, lateJoin: "off" }),
    });
    const host = socket();
    const guest = socket();
    join(lobby, host, { name: "Host", hostKey: "key" });
    join(lobby, guest, { name: "Guest" });

    const spectator = socket();
    expect(() => join(lobby, spectator, { name: "Watcher", role: "spectator" })).toThrow(
      /Spectators are disabled/,
    );

    lobby.handle(guest.id, { type: "setReady", ready: true });
    lobby.handle(host.id, { type: "startGame" });
    expect(lobby.phase).toBe("playing");

    const late = socket();
    expect(() => join(lobby, late, { name: "Late" })).toThrow(/late joining is disabled/);

    const forcedSpectatorLobby = new Lobby({
      hostKey: "key",
      settings: baseSettings({ lateJoin: "spectators" }),
    });
    const hostTwo = socket();
    const guestTwo = socket();
    join(forcedSpectatorLobby, hostTwo, { name: "Host", hostKey: "key" });
    join(forcedSpectatorLobby, guestTwo, { name: "Guest" });
    forcedSpectatorLobby.handle(guestTwo.id, { type: "setReady", ready: true });
    forcedSpectatorLobby.handle(hostTwo.id, { type: "startGame" });
    const forced = socket();
    join(forcedSpectatorLobby, forced, { name: "Late" });
    expect(forced.last("joined")!.role).toBe("spectator");
  });

  it("supports kicking, removing bots and returning after a finished match", () => {
    const lobby = new Lobby({ hostKey: "key", settings: baseSettings() });
    const host = socket();
    const guest = socket();
    join(lobby, host, { name: "Host", hostKey: "key" });
    join(lobby, guest, { name: "Guest" });
    const guestId = guest.last("joined")!.selfId;

    lobby.handle(host.id, { type: "addBot" });
    const bot = lobby.snapshot().players.find((player) => player.isBot)!;
    lobby.handle(host.id, { type: "removeBot", playerId: bot.id });
    expect(lobby.snapshot().players.some((player) => player.id === bot.id)).toBe(false);

    lobby.handle(host.id, { type: "kick", playerId: guestId });
    expect(guest.last("kicked")?.reason).toMatch(/removed/);
    expect(guest.closedReason).toBe("kicked");
    expect(lobby.snapshot().players.some((player) => player.id === guestId)).toBe(false);
    expect(() => lobby.handle(host.id, { type: "kick", playerId: guestId })).toThrow(/no longer/);

    const guestTwo = socket();
    join(lobby, guestTwo, { name: "Guest 2" });
    lobby.handle(guestTwo.id, { type: "setReady", ready: true });
    lobby.handle(host.id, { type: "startGame" });
    expect(lobby.phase).toBe("playing");
    lobby.handle(host.id, { type: "returnToLobby" });
    expect(lobby.phase).toBe("lobby");
    expect(lobby.snapshot().players.find((player) => player.id === guestTwo.last("joined")!.selfId)!.ready).toBe(false);
  });

  it("assigns custom team sizes and reassigns on reconfiguration", () => {
    const lobby = new Lobby({
      hostKey: "key",
      settings: baseSettings({ mode: "teams", teamSize: 2 }),
    });
    const sockets = [socket(), socket(), socket(), socket()];
    join(lobby, sockets[0]!, { name: "P1", hostKey: "key" });
    join(lobby, sockets[1]!, { name: "P2" });
    join(lobby, sockets[2]!, { name: "P3" });
    join(lobby, sockets[3]!, { name: "P4" });
    const teams = lobby.snapshot().players.map((player) => player.teamId);
    expect(teams.filter((team) => team === "team-1")).toHaveLength(2);
    expect(teams.filter((team) => team === "team-2")).toHaveLength(2);

    lobby.handle(sockets[0]!.id, { type: "configure", settings: { teamSize: 3 } });
    const resized = lobby.snapshot().players.map((player) => player.teamId);
    expect(resized.filter((team) => team === "team-1")).toHaveLength(3);
    expect(resized.filter((team) => team === "team-2")).toHaveLength(1);

    lobby.handle(sockets[0]!.id, { type: "configure", settings: { mode: "ffa" } });
    expect(new Set(lobby.snapshot().players.map((player) => player.teamId)).size).toBe(4);
  });

  it("accepts more than the usual four-player party without a cap", () => {
    const lobby = new Lobby({ hostKey: "key", settings: baseSettings() });
    const host = socket();
    join(lobby, host, { name: "Host", hostKey: "key" });
    const guests = Array.from({ length: 31 }, () => socket());
    guests.forEach((guest, index) => join(lobby, guest, { name: `Guest ${index + 1}` }));
    expect(lobby.snapshot().players).toHaveLength(32);
    expect(lobby.snapshot().noPlayerCap).toBe(true);
    expect([...lobby.snapshot().players].every((player) => player.connected)).toBe(true);
  });

  it("protects lobby-only commands and unknown actions", () => {
    const lobby = new Lobby({ hostKey: "key", settings: baseSettings() });
    const host = socket();
    join(lobby, host, { name: "Host", hostKey: "key" });
    expect(() => lobby.handle(host.id, { type: "addBot" })).not.toThrow();
    expect(() => lobby.handle("not-a-connection", { type: "addBot" })).toThrow(/Join the lobby/);
    expect(() => lobby.handle(host.id, { type: "warp" })).toThrow(/Unknown command/);
  });
});
