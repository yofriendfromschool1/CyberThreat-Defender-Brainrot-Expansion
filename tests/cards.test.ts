import { existsSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  ALL_CARDS,
  CARD_IDS,
  FEATURED_CARD_IDS,
  STARTER_CARD_IDS,
  cardPoolForSettings,
  cardsByExpansion,
  getCard,
  tryGetCard,
} from "../src/shared/cards/index.js";
import sourceCards from "../data/ctd-cards-source.json";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const REQUIRED_LINE = "This? State!? Hit the road dude this is private property.";

interface SourceCard {
  slug: string;
  name: string;
}

describe("card registry", () => {
  it("contains every card exactly once", () => {
    expect(ALL_CARDS).toHaveLength(221);
    expect(new Set(ALL_CARDS.map((card) => card.id)).size).toBe(221);
    expect(new Set(ALL_CARDS.map((card) => card.name)).size).toBe(221);
    expect(CARD_IDS).toHaveLength(221);
  });

  it("preserves all 148 catalogued CyberThreat Defender card names", () => {
    const source = sourceCards as SourceCard[];
    expect(source).toHaveLength(148);
    const classic = cardsByExpansion("classic");
    expect(classic).toHaveLength(148);
    expect(new Set(classic.map((card) => card.name))).toEqual(
      new Set(source.map((card) => card.name)),
    );
    for (const card of classic) {
      expect(card.id, `${card.name} should keep a slug-based ID`).toBeTruthy();
      expect(card.archiveText, `${card.name} should preserve its archive text`).toBeTruthy();
    }
  });

  it("ships the crossover, brainrot and frontier content", () => {
    expect(cardsByExpansion("crossover").length).toBeGreaterThanOrEqual(13);
    expect(cardsByExpansion("brainrot").length).toBeGreaterThanOrEqual(40);
    expect(cardsByExpansion("frontier").length).toBeGreaterThanOrEqual(12);

    for (const id of ["bonzi-buddy", "verity-minecraft-mod", "darkity-minecraft-mod", "kirkity"]) {
      expect(getCard(id).expansion).toBe("crossover");
    }
    expect(ALL_CARDS.some((card) => card.expansion === "brainrot")).toBe(true);
    expect(ALL_CARDS.some((card) => card.id === "skibidi-toilet")).toBe(true);
  });

  it("contains the exact required Kirkity line", () => {
    const kirkity = getCard("kirkity");
    expect(
      `${kirkity.flavor} ${kirkity.text} ${kirkity.voiceLine ?? ""}`.includes(REQUIRED_LINE),
    ).toBe(true);
    expect(ALL_CARDS.filter((card) => JSON.stringify(card).includes(REQUIRED_LINE))).toHaveLength(2);
  });

  it("gives every card usable rules and tabletop context", () => {
    for (const card of ALL_CARDS) {
      expect(card.name, card.id).toBeTruthy();
      expect(card.text.length, card.id).toBeGreaterThan(0);
      expect(card.strategy.length, card.id).toBeGreaterThan(0);
      expect(card.counterplay.length, card.id).toBeGreaterThan(0);
      expect(card.synergies.length, card.id).toBeGreaterThan(0);
      expect(card.alt.length, card.id).toBeGreaterThanOrEqual(20);
      expect(card.cost, card.id).toBeGreaterThanOrEqual(0);
      expect(["common", "uncommon", "rare", "epic", "legendary", "mythic"], card.id).toContain(
        card.rarity,
      );
      expect(["asset", "attack", "defense", "event"], card.id).toContain(card.type);
      expect(
        card.actions.length + (card.defense ? 1 : 0) + (card.passive ? 1 : 0),
        `${card.id} needs an effect`,
      ).toBeGreaterThan(0);
    }
  });

  it("resolves every card illustration and alt text", () => {
    for (const card of ALL_CARDS) {
      expect(card.art, card.id).toMatch(/^\/art\//);
      const file = join(ROOT, "public", card.art);
      expect(existsSync(file), `${card.id}: missing ${card.art}`).toBe(true);
      expect(statSync(file).size, `${card.id}: empty art`).toBeGreaterThan(100);
    }
  });

  it("exposes starter and featured cards that exist", () => {
    expect(STARTER_CARD_IDS.length).toBeGreaterThanOrEqual(12);
    expect(FEATURED_CARD_IDS.length).toBeGreaterThanOrEqual(8);
    for (const id of [...STARTER_CARD_IDS, ...FEATURED_CARD_IDS]) {
      expect(tryGetCard(id), id).toBeDefined();
    }
  });

  it("filters card pools by expansion, starter pool, custom list and bans", () => {
    const classicOnly = cardPoolForSettings({
      enabledExpansions: ["classic"],
      cardPool: "all",
      enabledCards: [],
      bannedCards: [],
    });
    expect(classicOnly.length).toBe(148);
    expect(classicOnly.every((card) => card.expansion === "classic")).toBe(true);

    const starter = cardPoolForSettings({
      enabledExpansions: ["classic"],
      cardPool: "starter",
      enabledCards: [],
      bannedCards: [],
    });
    expect(starter.length).toBe(STARTER_CARD_IDS.length);
    expect(starter.every((card) => STARTER_CARD_IDS.includes(card.id))).toBe(true);

    const custom = cardPoolForSettings({
      enabledExpansions: ["classic", "crossover", "brainrot", "frontier"],
      cardPool: "custom",
      enabledCards: ["phishing", "bonzi-buddy", "kirkity"],
      bannedCards: [],
    });
    expect(custom.map((card) => card.id).sort()).toEqual(["bonzi-buddy", "kirkity", "phishing"]);

    const banned = cardPoolForSettings({
      enabledExpansions: ["classic", "crossover", "brainrot", "frontier"],
      cardPool: "all",
      enabledCards: [],
      bannedCards: ["phishing", "skibidi-toilet"],
    });
    expect(banned.some((card) => card.id === "phishing")).toBe(false);
    expect(banned.some((card) => card.id === "skibidi-toilet")).toBe(false);
    expect(banned.length).toBe(219);
  });

  it("throws for an unknown card and does not throw for a missing optional lookup", () => {
    expect(() => getCard("does-not-exist")).toThrow(/Unknown card/);
    expect(tryGetCard("does-not-exist")).toBeUndefined();
  });
});
