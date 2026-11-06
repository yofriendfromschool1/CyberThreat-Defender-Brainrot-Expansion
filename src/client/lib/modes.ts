import { DEFAULT_SETTINGS, type GameMode, type GameSettings } from "../../shared/types.js";

export interface ModeInfo {
  id: GameMode;
  label: string;
  short: string;
  description: string;
}

export const MODE_INFO: ModeInfo[] = [
  { id: "ffa", label: "Free For All", short: "FFA", description: "Everyone for themselves. First network to the points target wins." },
  { id: "teams", label: "Teams", short: "Teams", description: "Custom team sizes, shared score, optional friendly fire." },
  { id: "coop", label: "Co-op vs AI", short: "Co-op", description: "Human crew versus a table of hostile bots." },
  { id: "draft", label: "Draft", short: "Draft", description: "Pick from rotating offers, then play the deck you built." },
  { id: "sealed", label: "Sealed", short: "Sealed", description: "Randomized sealed decks with a tighter card pool." },
  { id: "elimination", label: "Elimination", short: "Elim", description: "No respawns. Last network standing takes the table." },
  { id: "scoreAttack", label: "Score Attack", short: "Score", description: "Pure tempo race. Score limit and round clock decide it." },
  { id: "kingOfHill", label: "King of the Hill", short: "Hill", description: "Strongest scoring network each round earns the hill bonus." },
  { id: "suddenDeath", label: "Sudden Death", short: "Sudden", description: "Damage doubles early. Every play is a threat." },
  { id: "custom", label: "Custom Ruleset", short: "Custom", description: "Set every dial, including custom win and loss formulas." },
];

export function modeInfo(mode: GameMode): ModeInfo {
  return MODE_INFO.find((entry) => entry.id === mode) ?? MODE_INFO[0]!;
}

export function applyModePreset(current: GameSettings, mode: GameMode): GameSettings {
  const next: GameSettings = {
    ...DEFAULT_SETTINGS,
    ...current,
    mode,
    loseConditions: [...current.loseConditions],
    enabledExpansions: [...current.enabledExpansions],
    enabledCards: [...current.enabledCards],
    bannedCards: [...current.bannedCards],
  };
  if (mode === "ffa") {
    next.pointsToWin = 30;
    next.scoreLimit = 0;
    next.respawn = true;
    next.startingLives = 2;
    next.loseConditions = ["hp", "lives", "scoreThreshold", "roundLimit", "deckOut"];
  } else if (mode === "teams") {
    next.pointsToWin = 35;
    next.teamSize = Math.max(2, next.teamSize);
    next.friendlyFire = false;
    next.respawn = true;
    next.startingLives = 2;
  } else if (mode === "coop") {
    next.pointsToWin = 40;
    next.botCount = Math.max(2, next.botCount);
    next.friendlyFire = false;
    next.respawn = true;
    next.startingLives = 3;
  } else if (mode === "draft") {
    next.cardPool = "all";
    next.deckSize = Math.max(24, next.deckSize);
    next.draftPicks = Math.max(12, next.draftPicks);
    next.pointsToWin = 30;
  } else if (mode === "sealed") {
    next.cardPool = "all";
    next.deckSize = Math.max(30, next.deckSize);
    next.pointsToWin = 30;
  } else if (mode === "elimination") {
    next.pointsToWin = 0;
    next.scoreLimit = 0;
    next.respawn = false;
    next.startingLives = 1;
    next.loseConditions = ["lives", "roundLimit"];
    next.roundLimit = Math.max(10, next.roundLimit);
    next.startingHp = Math.max(15, next.startingHp);
  } else if (mode === "scoreAttack") {
    next.pointsToWin = 25;
    next.scoreLimit = 30;
    next.loseConditions = ["roundLimit", "scoreThreshold"];
    next.startingHp = Math.max(20, next.startingHp);
  } else if (mode === "kingOfHill") {
    next.pointsToWin = 30;
    next.hillBonus = Math.max(2, next.hillBonus);
    next.loseConditions = ["hp", "lives", "roundLimit", "scoreThreshold"];
  } else if (mode === "suddenDeath") {
    next.suddenDeathEnabled = true;
    next.suddenDeathRound = Math.min(next.suddenDeathRound, 5);
    next.pointsToWin = 20;
    next.damageMultiplier = Math.max(1.5, next.damageMultiplier);
  }
  return next;
}

export const LOSE_CONDITION_LABELS = [
  { id: "hp", label: "HP reaches zero", hint: "Damage knocks a network offline." },
  { id: "lives", label: "Lives exhausted", hint: "Respawn consumes a life." },
  { id: "scoreThreshold", label: "Score floor", hint: "Fall below the loss threshold." },
  { id: "roundLimit", label: "Round limit", hint: "Highest score wins when the clock ends." },
  { id: "deckOut", label: "Deck empty", hint: "Running out of cards eliminates you." },
] as const;
