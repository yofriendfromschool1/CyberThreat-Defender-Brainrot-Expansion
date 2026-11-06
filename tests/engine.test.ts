import { describe, expect, it } from "vitest";
import { GameRuleError, type GameSettings } from "../src/shared/types.js";
import {
  addLatePlayer,
  createGame,
  draftPick,
  endRound,
  endTurn,
  makeView,
  markConnection,
  normaliseSettings,
  playCard,
  tickGame,
  validateGameSettings,
  type EngineParticipant,
  type GameState,
} from "../src/shared/engine.js";
import { getCard } from "../src/shared/cards/index.js";

const BASE_SETTINGS: Partial<GameSettings> = {
  turnTimerSec: 0,
  roundTimerSec: 0,
  deckSize: 16,
  handSize: 5,
  startingResources: 20,
  pointsToWin: 999,
  roundLimit: 99,
  loseConditions: ["hp", "lives", "roundLimit"],
};

let iidCounter = 0;

function participants(count = 2): EngineParticipant[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `p${index + 1}`,
    name: `Player ${index + 1}`,
    isBot: false,
  }));
}

function gameWith(
  overrides: Partial<GameSettings> = {},
  people: EngineParticipant[] = participants(),
): GameState {
  return createGame({
    id: `test-${iidCounter}`,
    participants: people,
    settings: normaliseSettings({ ...BASE_SETTINGS, ...overrides }),
    seed: 12345,
  });
}

function give(player: GameState["players"][number], cardId: string): string {
  iidCounter += 1;
  const iid = `iid-${iidCounter}`;
  player.hand.push({
    iid,
    cardId,
    ownerId: player.id,
    acquiredRound: 1,
  });
  return iid;
}

function preparedGame(
  overrides: Partial<GameSettings> = {},
  people: EngineParticipant[] = participants(),
) {
  const game = gameWith(overrides, people);
  const actor = game.players[0]!;
  const target = game.players[1]!;
  actor.credits = 30;
  actor.hand = [];
  target.armor = 0;
  return { game, actor, target };
}

describe("game setup and views", () => {
  it("deals identical, hidden starting hands and starter assets", () => {
    const game = gameWith();
    expect(game.phase).toBe("playing");
    expect(game.round).toBe(1);
    expect(game.players).toHaveLength(2);
    expect(game.activePlayerIds).toHaveLength(1);
    for (const player of game.players) {
      expect(player.hp).toBe(20);
      expect(player.maxHp).toBe(20);
      expect(player.hand).toHaveLength(5);
      expect(player.deck.length).toBeGreaterThanOrEqual(10);
      expect(player.battlefield.map((card) => card.cardId)).toEqual(
        expect.arrayContaining(["desktop-computer", "isp-connection"]),
      );
      expect(new Set(player.deck.map((card) => card.iid)).size).toBe(player.deck.length);
    }

    const first = makeView(game, "p1");
    expect(first.self).not.toBeNull();
    expect(first.self!.hand).toHaveLength(5);
    expect(first.self!.legalCardIds.length).toBeGreaterThan(0);
    const opponent = first.players.find((player) => player.id === "p2")!;
    expect("hand" in opponent).toBe(false);
    expect(opponent.handCount).toBe(5);

    const spectator = makeView(game, "watcher", true);
    expect(spectator.self).toBeNull();
    expect(spectator.spectator).toBe(true);
  });

  it("does not leak a hand when a player joins as a spectator view", () => {
    const game = gameWith();
    const view = makeView(game, "p2", true);
    expect(view.self).toBeNull();
    expect(JSON.stringify(view.players)).not.toContain('"hand":');
  });

  it("assigns teams by team size and keeps co-op bots separate", () => {
    const teams = gameWith(
      { mode: "teams", teamSize: 2 },
      participants(4),
    );
    const teamOne = teams.players.filter((player) => player.teamId === "team-1");
    const teamTwo = teams.players.filter((player) => player.teamId === "team-2");
    expect(teamOne).toHaveLength(2);
    expect(teamTwo).toHaveLength(2);

    const coop = gameWith(
      { mode: "coop" },
      [
        { id: "human", name: "Human", isBot: false },
        { id: "bot", name: "Bot", isBot: true },
      ],
    );
    expect(coop.players.find((player) => player.id === "human")!.teamId).toBe("crew");
    expect(coop.players.find((player) => player.id === "bot")!.teamId).toBe("ai");
  });

  it("normalises unsafe settings and validates custom formulas", () => {
    const settings = normaliseSettings({
      ...BASE_SETTINGS,
      startingHp: -20,
      startingResources: 999,
      handSize: 999,
      deckSize: 2,
      teamSize: 999,
      damageMultiplier: -4,
      enabledExpansions: ["classic", "not-real"] as GameSettings["enabledExpansions"],
      enabledCards: ["phishing", "not-real"],
    });
    expect(settings.startingHp).toBe(1);
    expect(settings.startingResources).toBe(30);
    expect(settings.handSize).toBe(20);
    expect(settings.deckSize).toBe(8);
    expect(settings.teamSize).toBe(64);
    expect(settings.damageMultiplier).toBe(0);
    expect(settings.enabledExpansions).toEqual(["classic"]);
    expect(settings.enabledCards).toEqual(["phishing"]);
    expect(validateGameSettings(settings)).toBeNull();

    const badFormula = normaliseSettings({ ...settings, customWinFormula: "score >" });
    expect(validateGameSettings(badFormula)).toMatch(/^Custom formula:/);
  });
});

describe("card resolution", () => {
  it("resolves attack damage, costs and status effects", () => {
    const { game, actor, target } = preparedGame();
    const iid = give(actor, "password-cracked");
    const before = target.hp;
    const result = playCard(game, actor.id, { iid, targetPlayerId: target.id });

    expect(result.card.id).toBe("password-cracked");
    expect(target.hp).toBe(before - 2);
    expect(target.statuses).toHaveLength(1);
    expect(target.statuses[0]!.sourceName).toBe("Password Cracked");
    expect(actor.credits).toBe(26);
    expect(actor.playedThisTurn).toBe(1);
    expect(actor.hand).toHaveLength(0);
    expect(actor.discard.map((card) => card.cardId)).toContain("password-cracked");
    expect(game.log.some((entry) => entry.kind === "play" && entry.text.includes("Password Cracked"))).toBe(
      true,
    );
  });

  it("lets a matching defense counter an attack and consume a charge", () => {
    const { game, actor, target } = preparedGame();
    target.battlefield.push({
      iid: "wall-1",
      cardId: "host-based-firewall",
      ownerId: target.id,
      acquiredRound: 1,
      attachedUpgradeCount: 0,
      usesLeft: 1,
    });
    const iid = give(actor, "trojan-horse");
    const hpBefore = target.hp;

    playCard(game, actor.id, { iid, targetPlayerId: target.id });

    expect(target.hp).toBe(hpBefore);
    expect(target.statuses).toHaveLength(0);
    expect(target.battlefield.some((card) => card.iid === "wall-1")).toBe(false);
    expect(actor.discard.map((card) => card.cardId)).toContain("trojan-horse");
    expect(game.log.some((entry) => entry.kind === "counter")).toBe(true);
    expect(game.log.at(-1)?.text).toContain("countered");
  });

  it("honours unblockable attacks", () => {
    const { game, actor, target } = preparedGame();
    target.battlefield.push({
      iid: "wall-2",
      cardId: "host-based-firewall",
      ownerId: target.id,
      acquiredRound: 1,
      attachedUpgradeCount: 0,
      usesLeft: 1,
    });
    const iid = give(actor, "darkity-minecraft-mod");
    const hpBefore = target.hp;

    playCard(game, actor.id, { iid, targetPlayerId: target.id });

    expect(target.hp).toBe(hpBefore - 7);
    expect(target.statuses[0]!.sourceName).toBe("Darkity's static");
    expect(target.battlefield.some((card) => card.iid === "wall-2")).toBe(true);
  });

  it("applies damage multipliers and sudden death", () => {
    const { game, actor, target } = preparedGame({ damageMultiplier: 2 });
    const first = give(actor, "password-cracked");
    playCard(game, actor.id, { iid: first, targetPlayerId: target.id });
    expect(target.hp).toBe(16);

    game.suddenDeath = true;
    const second = give(actor, "password-cracked");
    playCard(game, actor.id, { iid: second, targetPlayerId: target.id });
    expect(target.hp).toBe(8);
  });

  it("resolves score, deploy and passive scoring effects", () => {
    const { game, actor } = preparedGame();
    const event = give(actor, "budget-increased");
    playCard(game, actor.id, { iid: event });
    expect(actor.score).toBe(2);
    expect(actor.discard.map((card) => card.cardId)).toContain("budget-increased");

    const asset = give(actor, "bonzi-buddy");
    playCard(game, actor.id, { iid: asset });
    expect(actor.battlefield.map((card) => card.cardId)).toContain("bonzi-buddy");

    endRound(game);
    expect(actor.score).toBe(6);
    expect(game.round).toBe(2);
  });

  it("rejects friendly fire unless the host opens it up", () => {
    const people: EngineParticipant[] = [
      { id: "a", name: "A", isBot: false, teamId: "blue" },
      { id: "b", name: "B", isBot: false, teamId: "blue" },
      { id: "c", name: "C", isBot: false, teamId: "red" },
      { id: "d", name: "D", isBot: false, teamId: "red" },
    ];
    const { game, actor, target } = preparedGame({ mode: "teams", teamSize: 2 }, people);
    const iid = give(actor, "password-cracked");
    let caught: GameRuleError | null = null;
    try {
      playCard(game, actor.id, { iid, targetPlayerId: target.id });
    } catch (error) {
      caught = error as GameRuleError;
    }
    expect(caught).toBeInstanceOf(GameRuleError);
    expect(caught!.code).toBe("friendly-fire");

    game.settings.friendlyFire = true;
    game.settings.targeting = "open";
    const hpBefore = target.hp;
    playCard(game, actor.id, { iid, targetPlayerId: target.id });
    expect(target.hp).toBe(hpBefore - 2);
  });

  it("requires an explicit target when several enemies exist and enough credits", () => {
    const { game, actor } = preparedGame({}, participants(3));
    const iid = give(actor, "phishing");
    expect(() => playCard(game, actor.id, { iid })).toThrow(/Select an enemy/);
    actor.credits = 0;
    expect(() => playCard(game, actor.id, { iid, targetPlayerId: "p2" })).toThrow(
      /need 6 credits/,
    );
  });

  it("rejects cards that are not in hand or not affordable", () => {
    const { game, actor } = preparedGame();
    expect(() => playCard(game, actor.id, { iid: "missing" })).toThrow(/not in your hand/);
    expect(getCard("phishing").cost).toBe(6);
  });

  it("knocks a player offline and respawns them after the delay", () => {
    const { game, actor, target } = preparedGame({
      startingLives: 2,
      respawn: true,
      respawnDelayRounds: 1,
    });
    target.hp = 2;
    const iid = give(actor, "password-cracked");
    playCard(game, actor.id, { iid, targetPlayerId: target.id });

    expect(target.lives).toBe(1);
    expect(target.hp).toBe(0);
    expect(target.awaitingRespawn).toBe(true);
    expect(target.respawnAtRound).toBe(game.round + 1);

    endRound(game);
    expect(game.round).toBe(2);
    expect(target.awaitingRespawn).toBe(false);
    expect(target.hp).toBe(target.maxHp);
  });
});

describe("turn, round and win flow", () => {
  it("advances turns and rounds in order", () => {
    const game = gameWith();
    const first = game.players[0]!;
    const second = game.players[1]!;
    expect(game.activePlayerIds).toEqual([first.id]);

    endTurn(game, first.id);
    expect(first.hasEndedTurn).toBe(true);
    expect(game.activePlayerIds).toEqual([second.id]);

    endTurn(game, second.id);
    expect(game.round).toBe(2);
    expect(game.activePlayerIds).toEqual([second.id]);
  });

  it("handles turn and round timer expiry", () => {
    const game = gameWith({ turnTimerSec: 1, roundTimerSec: 1 });
    const first = game.players[0]!;
    game.turnDeadline = Date.now() - 1;
    expect(tickGame(game)).toBe(true);
    expect(first.hasEndedTurn).toBe(true);
    expect(game.activePlayerIds).toEqual([game.players[1]!.id]);

    game.roundDeadline = Date.now() - 1;
    game.turnDeadline = null;
    expect(tickGame(game)).toBe(true);
    expect(game.round).toBe(2);
  });

  it("declares a score winner at round end", () => {
    const game = gameWith({ pointsToWin: 5 });
    game.players[0]!.score = 10;
    endRound(game);
    expect(game.phase).toBe("ended");
    expect(game.winner?.playerIds).toEqual(["p1"]);
    expect(game.winner?.reason).toMatch(/reached/);
  });

  it("supports custom win and loss formulas", () => {
    const win = gameWith({ customWinFormula: "score >= 3" });
    win.players[0]!.score = 3;
    endRound(win);
    expect(win.phase).toBe("ended");
    expect(win.winner?.playerIds).toEqual(["p1"]);
    expect(win.winner?.reason).toMatch(/custom win formula/);

    const loss = gameWith({ customLoseFormula: "hp <= 2" });
    loss.players[1]!.hp = 2;
    endRound(loss);
    expect(loss.players[1]!.eliminated).toBe(true);
    expect(loss.winner?.playerIds).toEqual(["p1"]);
  });

  it("lets the host add a late player during a live match", () => {
    const game = gameWith();
    const late = addLatePlayer(
      game,
      { id: "late", name: "Late Joiner", isBot: false },
      "solo-late",
    );
    expect(game.players).toHaveLength(3);
    expect(game.turnQueue).toContain(late.id);
    expect(late.hand.length).toBeGreaterThan(0);
    expect(late.battlefield.length).toBeGreaterThanOrEqual(2);
    expect(makeView(game, "late").self).not.toBeNull();
    expect(makeView(game, "p1").players.some((player) => player.id === "late")).toBe(true);
  });

  it("tracks connection state on the engine and view", () => {
    const game = gameWith();
    expect(markConnection(game, "p1", false)).toBe(true);
    expect(makeView(game, "p1").players.find((player) => player.id === "p1")!.connected).toBe(
      false,
    );
    expect(markConnection(game, "p1", true)).toBe(true);
  });
});

describe("draft mode", () => {
  it("offers picks, advances offers, and transitions to a playable deck", () => {
    const game = gameWith(
      { mode: "draft", draftPicks: 2, deckSize: 8, handSize: 3 },
      participants(2),
    );
    expect(game.phase).toBe("drafting");
    expect(game.round).toBe(0);
    for (const player of game.players) {
      expect(player.draftOffers.length).toBe(5);
      expect(player.deck).toHaveLength(0);
    }

    expect(() => draftPick(game, "p1", "not-an-offer")).toThrow(/not in your draft offers/);

    let guard = 0;
    while (game.phase === "drafting" && guard < 40) {
      for (const player of game.players) {
        if (game.phase !== "drafting") break;
        if (player.draftPicks >= 2) continue;
        const pick = player.draftOffers[0]!;
        draftPick(game, player.id, pick);
        expect(getCard(pick)).toBeDefined();
      }
      guard += 1;
    }

    expect(game.phase).toBe("playing");
    expect(game.round).toBe(1);
    expect(game.players.every((player) => player.draftPicks === 2)).toBe(true);
    expect(game.players.every((player) => player.deck.length + player.hand.length === 8)).toBe(true);
    expect(game.players.every((player) => player.deck.length === 5)).toBe(true);
    expect(game.players.every((player) => player.hand.length === 3)).toBe(true);
    expect(game.players.every((player) => player.draftOffers.length === 0)).toBe(true);
    expect(game.activePlayerIds.length).toBe(1);
  });
});
