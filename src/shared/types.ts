/**
 * Shared contracts used by the authoritative game engine, the LAN server,
 * the desktop wrapper and the React client.
 */

export const PROTOCOL_VERSION = 3;
export const CLIENT_VERSION = "1.0.0";

export type ExpansionId = "classic" | "crossover" | "brainrot" | "frontier";

export interface Expansion {
  id: ExpansionId;
  name: string;
  shortName: string;
  description: string;
  accent: string;
}

export const EXPANSIONS: Expansion[] = [
  {
    id: "classic",
    name: "CyberThreat Defender Archive",
    shortName: "Archive",
    description:
      "All 148 catalogued CyberThreat Defender cards, adapted for networked play with preserved archive text.",
    accent: "#67e8f9",
  },
  {
    id: "crossover",
    name: "Signal Breach Crossover",
    shortName: "Crossover",
    description:
      "Bonzi Buddy, Verity, Darkity and the original Kirkity parody enter the network.",
    accent: "#f0abfc",
  },
  {
    id: "brainrot",
    name: "Brainrot Overflow",
    shortName: "Brainrot",
    description:
      "A deliberately unhinged meme incursion. Readable, strategic, and deeply unserious.",
    accent: "#bef264",
  },
  {
    id: "frontier",
    name: "Frontier Protocols",
    shortName: "Frontier",
    description:
      "Original strategic cards built for LAN table politics, drafting and team play.",
    accent: "#fbbf24",
  },
];

export type CardType = "asset" | "attack" | "defense" | "event";
export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary" | "mythic";
export type GameMode =
  | "ffa"
  | "teams"
  | "coop"
  | "draft"
  | "sealed"
  | "elimination"
  | "scoreAttack"
  | "kingOfHill"
  | "suddenDeath"
  | "custom";

export type Pacing = "turnBased" | "simultaneous" | "hybrid";
export type BotDifficulty = "easy" | "normal" | "hard" | "nightmare";
export type LateJoinMode = "off" | "spectators" | "players";
export type TargetingRule = "enemies" | "open";
export type LoseCondition = "hp" | "lives" | "scoreThreshold" | "roundLimit" | "deckOut";

export type EffectTarget =
  | "chosen"
  | "chosenAsset"
  | "self"
  | "allEnemies"
  | "allAllies"
  | "allPlayers"
  | "randomEnemy"
  | "randomEnemyAsset";

export type EffectAction =
  | { kind: "damage"; amount: number; target?: EffectTarget }
  | { kind: "drain"; amount: number; target?: EffectTarget }
  | { kind: "heal"; amount: number; target?: EffectTarget }
  | { kind: "score"; amount: number; target?: EffectTarget }
  | { kind: "draw"; amount: number; target?: EffectTarget }
  | { kind: "credits"; amount: number; target?: EffectTarget }
  | { kind: "discard"; amount: number; target?: EffectTarget }
  | { kind: "shield"; amount: number; target?: EffectTarget }
  | { kind: "destroyAsset"; target?: EffectTarget }
  | { kind: "disableAsset"; rounds: number; target?: EffectTarget }
  | { kind: "skipTurn"; target?: EffectTarget }
  | {
      kind: "ongoing";
      effect: "damage" | "drain";
      amount: number;
      rounds: number;
      label: string;
      target?: EffectTarget;
    }
  | { kind: "buffAssets"; amount: number; rounds?: number; target?: EffectTarget }
  | { kind: "stealCredits"; amount: number; target?: EffectTarget }
  | { kind: "revealHand"; target?: EffectTarget }
  | { kind: "selfDamage"; amount: number }
  | { kind: "coinFlip"; heads: EffectAction[]; tails: EffectAction[] };

export type CardTarget =
  | "none"
  | "enemyPlayer"
  | "anyPlayer"
  | "enemyAsset"
  | "ownAsset"
  | "anyAsset";

export interface DefenseProfile {
  /** Attack tags this card reacts to. `all` blocks any attack. */
  blocks: string[];
  uses: number;
  /** Armor granted to the controller while this card remains in play. */
  armor?: number;
}

export interface PlayPassive {
  /** Score earned during each round-end scoring step. */
  pointsPerRound?: number;
  /** Extra credits at the start of the owner's turn. */
  creditsPerTurn?: number;
  /** Cards drawn during each round-end refresh. */
  drawPerRound?: number;
  /** Max hand size bonus. */
  handSizeBonus?: number;
  /** Play limit bonus. */
  playLimitBonus?: number;
}

export interface CardDefinition {
  id: string;
  name: string;
  type: CardType;
  subtype: string;
  expansion: ExpansionId;
  set: string;
  rarity: Rarity;
  cost: number;
  target: CardTarget;
  text: string;
  flavor: string;
  strategy: string;
  synergies: string[];
  counterplay: string;
  keywords: string[];
  art: string;
  alt: string;
  voiceLine?: string;
  archiveText?: string;
  actions: EffectAction[];
  defense?: DefenseProfile;
  passive?: PlayPassive;
}

export interface GameSettings {
  lobbyName: string;
  mode: GameMode;
  pacing: Pacing;
  pointsToWin: number;
  scoreLimit: number;
  loseConditions: LoseCondition[];
  startingScore: number;
  startingResources: number;
  startingHp: number;
  handSize: number;
  deckSize: number;
  cardsPerTurn: number;
  roundLimit: number;
  startingLives: number;
  lossThreshold: number;
  enabledExpansions: ExpansionId[];
  enabledCards: string[];
  bannedCards: string[];
  cardPool: "all" | "starter" | "custom";
  turnTimerSec: number;
  roundTimerSec: number;
  teamSize: number;
  friendlyFire: boolean;
  targeting: TargetingRule;
  respawn: boolean;
  respawnDelayRounds: number;
  suddenDeathEnabled: boolean;
  suddenDeathRound: number;
  damageMultiplier: number;
  healingMultiplier: number;
  botCount: number;
  botDifficulty: BotDifficulty;
  allowSpectators: boolean;
  lateJoin: LateJoinMode;
  reconnectGraceSec: number;
  customWinFormula: string;
  customLoseFormula: string;
  hillBonus: number;
  draftPicks: number;
}

export const DEFAULT_SETTINGS: GameSettings = {
  lobbyName: "Night Shift LAN",
  mode: "ffa",
  pacing: "turnBased",
  pointsToWin: 30,
  scoreLimit: 0,
  loseConditions: ["hp", "lives", "scoreThreshold", "roundLimit", "deckOut"],
  startingScore: 0,
  startingResources: 4,
  startingHp: 20,
  handSize: 5,
  deckSize: 32,
  cardsPerTurn: 3,
  roundLimit: 20,
  startingLives: 2,
  lossThreshold: -45,
  enabledExpansions: ["classic", "crossover", "brainrot", "frontier"],
  enabledCards: [],
  bannedCards: [],
  cardPool: "all",
  turnTimerSec: 75,
  roundTimerSec: 0,
  teamSize: 2,
  friendlyFire: false,
  targeting: "enemies",
  respawn: true,
  respawnDelayRounds: 1,
  suddenDeathEnabled: false,
  suddenDeathRound: 10,
  damageMultiplier: 1,
  healingMultiplier: 1,
  botCount: 0,
  botDifficulty: "normal",
  allowSpectators: true,
  lateJoin: "spectators",
  reconnectGraceSec: 90,
  customWinFormula: "",
  customLoseFormula: "",
  hillBonus: 3,
  draftPicks: 12,
};

export type SettingsPatch = Partial<GameSettings>;

export interface PlayerPublic {
  id: string;
  name: string;
  isBot: boolean;
  teamId: string;
  connected: boolean;
  isHost: boolean;
  connectedAt: number;
  lastSeenAt: number;
}

export interface LobbyPlayer extends PlayerPublic {
  ready: boolean;
}

export interface SpectatorPublic {
  id: string;
  name: string;
  connected: boolean;
  connectedAt: number;
}

export type LobbyPhase = "lobby" | "drafting" | "playing" | "ended";

export interface LobbySnapshot {
  id: string;
  hostName: string;
  hostConnected: boolean;
  createdAt: number;
  phase: LobbyPhase;
  settings: GameSettings;
  players: LobbyPlayer[];
  spectators: SpectatorPublic[];
  gameRound: number;
  canStart: boolean;
  serverVersion: string;
  discoveryName: string;
  noPlayerCap: true;
}

export type CardZone = "deck" | "hand" | "discard" | "battlefield";

export interface CardInstance {
  iid: string;
  cardId: string;
  ownerId: string;
  acquiredRound: number;
  attachedTo?: string;
}

export interface StatusEffect {
  id: string;
  sourceCardId: string;
  sourceName: string;
  kind: "damage" | "drain";
  amount: number;
  roundsLeft: number;
  label: string;
}

export interface BattlefieldCard extends CardInstance {
  disabledUntilRound?: number;
  attachedUpgradeCount: number;
  usesLeft?: number;
}

export interface PlayerView {
  id: string;
  name: string;
  isBot: boolean;
  teamId: string;
  connected: boolean;
  hp: number;
  maxHp: number;
  score: number;
  credits: number;
  lives: number;
  eliminated: boolean;
  hasEndedTurn: boolean;
  playedThisTurn: number;
  handCount: number;
  deckCount: number;
  discardCount: number;
  battlefield: BattlefieldCard[];
  statuses: StatusEffect[];
  armor: number;
  draftPicks: number;
}

export interface RevealedHand {
  playerId: string;
  name: string;
  cards: CardDefinition[];
  expiresRound: number;
}

export interface SelfView extends PlayerView {
  hand: CardInstance[];
  legalCardIds: string[];
  draftOffers: CardDefinition[];
  revealedHands: RevealedHand[];
}

export interface LogEntry {
  id: string;
  at: number;
  round: number;
  kind: "system" | "play" | "score" | "damage" | "counter" | "elimination" | "join" | "chat" | "timer";
  text: string;
  actorId?: string;
  targetId?: string;
}

export interface GameView {
  id: string;
  phase: "drafting" | "playing" | "ended";
  mode: GameMode;
  pacing: Pacing;
  round: number;
  turn: number;
  activePlayerIds: string[];
  turnDeadline: number | null;
  roundDeadline: number | null;
  players: PlayerView[];
  self: SelfView | null;
  spectator: boolean;
  settings: GameSettings;
  log: LogEntry[];
  winner: { playerIds: string[]; teamIds: string[]; reason: string } | null;
  suddenDeath: boolean;
  hillHolderId: string | null;
  serverNow: number;
  version: number;
}

export type ClientRole = "player" | "spectator";

export interface ClientMessageMap {
  join: {
    type: "join";
    name: string;
    role: ClientRole;
    reconnectToken?: string;
    hostKey?: string;
  };
  configure: { type: "configure"; settings: SettingsPatch };
  startGame: { type: "startGame" };
  addBot: { type: "addBot"; difficulty?: BotDifficulty };
  removeBot: { type: "removeBot"; playerId: string };
  kick: { type: "kick"; playerId: string };
  setReady: { type: "setReady"; ready: boolean };
  playCard: {
    type: "playCard";
    iid: string;
    targetPlayerId?: string;
    targetIid?: string;
  };
  endTurn: { type: "endTurn" };
  draftPick: { type: "draftPick"; cardId: string };
  chat: { type: "chat"; text: string };
  returnToLobby: { type: "returnToLobby" };
  leave: { type: "leave" };
  ping: { type: "ping"; t: number };
}

export type ClientMessage = ClientMessageMap[keyof ClientMessageMap];
export type ClientMessageType = ClientMessage["type"];

export type ServerMessage =
  | {
      type: "joined";
      selfId: string;
      isHost: boolean;
      reconnectToken: string;
      role: ClientRole;
      lobby: LobbySnapshot;
      game: GameView | null;
      serverTime: number;
    }
  | { type: "lobby"; lobby: LobbySnapshot }
  | { type: "game"; game: GameView }
  | { type: "chat"; message: LogEntry }
  | { type: "error"; code: string; message: string }
  | { type: "notice"; message: string; tone?: "info" | "warn" | "success" }
  | { type: "pong"; t: number; serverTime: number }
  | { type: "kicked"; reason: string }
  | { type: "left" };

export interface DiscoveryLobby {
  id: string;
  name: string;
  hostName: string;
  host: string;
  port: number;
  players: number;
  phase: LobbyPhase;
  version: string;
  source: "mdns" | "udp" | "local";
}

export interface ServerInfo {
  id: string;
  name: string;
  hostName: string;
  version: string;
  port: number;
  addresses: string[];
  startedAt: number;
  hostKeyRequired: true;
  noPlayerCap: true;
}

export type PlayCardResult =
  | { ok: true; message?: string }
  | { ok: false; message: string };

export type ActionErrorCode =
  | "not-your-turn"
  | "no-card"
  | "not-enough-credits"
  | "play-limit"
  | "invalid-target"
  | "friendly-fire"
  | "game-not-active"
  | "invalid-action"
  | "lobby-full"
  | "not-allowed";

export class GameRuleError extends Error {
  code: ActionErrorCode;

  constructor(code: ActionErrorCode, message: string) {
    super(message);
    this.name = "GameRuleError";
    this.code = code;
  }
}
