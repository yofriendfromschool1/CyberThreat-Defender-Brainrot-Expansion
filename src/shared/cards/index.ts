import type { CardDefinition, CardType, ExpansionId } from "../types.js";
import { CLASSIC_CARDS } from "./classic.js";
import { EXPANSION_CARDS } from "./expansions.js";

export const ALL_CARDS: CardDefinition[] = [...CLASSIC_CARDS, ...EXPANSION_CARDS];

const byId = new Map<string, CardDefinition>();
for (const definition of ALL_CARDS) {
  if (byId.has(definition.id)) {
    throw new Error(`Duplicate card id: ${definition.id}`);
  }
  byId.set(definition.id, definition);
}

export function getCard(id: string): CardDefinition {
  const definition = byId.get(id);
  if (!definition) {
    throw new Error(`Unknown card id: ${id}`);
  }
  return definition;
}

export function tryGetCard(id: string): CardDefinition | undefined {
  return byId.get(id);
}

export const CARD_IDS = ALL_CARDS.map((card) => card.id);

export const STARTER_CARD_IDS = [
  "desktop-computer",
  "isp-connection",
  "laptop-computer",
  "wireless-router",
  "host-based-firewall",
  "anti-malware-virus",
  "os-update-patch",
  "encryption",
  "security-training",
  "phishing",
  "denial-of-service-dos",
  "password-cracked",
  "trojan-horse",
  "power-outage",
  "budget-increased",
  "hardware-failure",
];

export const FEATURED_CARD_IDS = [
  "bonzi-buddy",
  "verity-minecraft-mod",
  "darkity-minecraft-mod",
  "kirkity",
  "skibidi-toilet",
  "final-boss-fanum",
  "zero-trust-overhaul",
  "brainrot-singularity",
];

export function cardsByExpansion(expansion: ExpansionId): CardDefinition[] {
  return ALL_CARDS.filter((card) => card.expansion === expansion);
}

export function countCardsByType(): Record<CardType, number> {
  const counts: Record<CardType, number> = { asset: 0, attack: 0, defense: 0, event: 0 };
  for (const card of ALL_CARDS) {
    counts[card.type] += 1;
  }
  return counts;
}

export function cardPoolForSettings(input: {
  enabledExpansions: ExpansionId[];
  cardPool: "all" | "starter" | "custom";
  enabledCards: string[];
  bannedCards: string[];
}): CardDefinition[] {
  const enabledSet = new Set(input.enabledCards);
  const bannedSet = new Set(input.bannedCards);
  return ALL_CARDS.filter((card) => {
    if (bannedSet.has(card.id)) return false;
    if (input.cardPool === "starter" && !STARTER_CARD_IDS.includes(card.id)) return false;
    if (input.cardPool === "custom" && enabledSet.size > 0 && !enabledSet.has(card.id)) return false;
    if (!input.enabledExpansions.includes(card.expansion)) return false;
    return true;
  });
}

export const CARD_TYPE_LABELS: Record<CardType, string> = {
  asset: "Asset",
  attack: "Attack",
  defense: "Defense",
  event: "Event",
};

export const RARITY_ORDER = ["common", "uncommon", "rare", "epic", "legendary", "mythic"] as const;

export { CLASSIC_CARDS, EXPANSION_CARDS };
