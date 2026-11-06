import { randomUUID } from "node:crypto";
import type {
  BattlefieldCard,
  CardDefinition,
  CardInstance,
  EffectAction,
  EffectTarget,
  GameMode,
  GameSettings,
  GameView,
  LogEntry,
  PlayerView,
  RevealedHand,
  SelfView,
  StatusEffect,
} from "./types.js";
import { DEFAULT_SETTINGS, GameRuleError } from "./types.js";
import { cardPoolForSettings, getCard, tryGetCard } from "./cards/index.js";
import { evaluateFormula, validateFormula } from "./formula.js";

export interface EngineParticipant {
  id: string;
  name: string;
  isBot: boolean;
  teamId?: string;
}

export interface EnginePlayer {
  id: string;
  name: string;
  isBot: boolean;
  teamId: string;
  connected: boolean;
  score: number;
  hp: number;
  maxHp: number;
  credits: number;
  lives: number;
  eliminated: boolean;
  awaitingRespawn: boolean;
  respawnAtRound: number | null;
  deck: CardInstance[];
  hand: CardInstance[];
  discard: CardInstance[];
  battlefield: BattlefieldCard[];
  statuses: StatusEffect[];
  armor: number;
  playedThisTurn: number;
  hasEndedTurn: boolean;
  skipNextTurn: boolean;
  assetBuff: number;
  assetBuffRounds: number;
  draftOffers: string[];
  draftPicks: number;
}

interface RevealRecord {
  viewerIds: string[];
  playerId: string;
  cards: string[];
  expiresRound: number;
}

export interface GameWinner {
  playerIds: string[];
  teamIds: string[];
  reason: string;
}

export interface GameState {
  id: string;
  phase: "drafting" | "playing" | "ended";
  settings: GameSettings;
  round: number;
  turn: number;
  players: EnginePlayer[];
  turnQueue: string[];
  turnPointer: number;
  activePlayerIds: string[];
  turnDeadline: number | null;
  roundDeadline: number | null;
  log: LogEntry[];
  logSeq: number;
  winner: GameWinner | null;
  suddenDeath: boolean;
  hillHolderId: string | null;
  seed: number;
  rngState: number;
  version: number;
  startedAt: number;
  updatedAt: number;
  reveals: RevealRecord[];
  draftPool: string[];
  mulliganUsed: Set<string>;
}

const BASE_CREDITS_PER_TURN = 2;
const AUTOMATIC_DRAW_PER_TURN = 1;
const MAX_LOG = 220;

function seedFrom(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0 || 1;
}

function nextRandom(state: { rngState: number }): number {
  let value = state.rngState || 1;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  state.rngState = value >>> 0 || 1;
  return state.rngState / 4294967296;
}

function pickOne<T>(state: { rngState: number }, values: readonly T[]): T {
  if (values.length === 0) throw new Error("Cannot pick from an empty list");
  return values[Math.floor(nextRandom(state) * values.length)]!;
}

function shuffle<T>(state: { rngState: number }, values: T[]): T[] {
  for (let index = values.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(nextRandom(state) * (index + 1));
    [values[index], values[swapIndex]] = [values[swapIndex]!, values[index]!];
  }
  return values;
}

function now(): number {
  return Date.now();
}

function addLog(
  game: GameState,
  kind: LogEntry["kind"],
  text: string,
  actorId?: string,
  targetId?: string,
): void {
  game.logSeq += 1;
  game.log.push({
    id: `log-${game.logSeq}`,
    at: now(),
    round: game.round,
    kind,
    text,
    actorId,
    targetId,
  });
  if (game.log.length > MAX_LOG) {
    game.log.splice(0, game.log.length - MAX_LOG);
  }
}

function touch(game: GameState): void {
  game.version += 1;
  game.updatedAt = now();
}

function hasEnded(game: GameState): boolean {
  return game.phase === "ended";
}

function makeInstance(ownerId: string, cardId: string, round: number): CardInstance {
  return {
    iid: `${ownerId}-${randomUUID()}`,
    cardId,
    ownerId,
    acquiredRound: round,
  };
}

function createPlayer(
  participant: EngineParticipant,
  settings: GameSettings,
  teamId: string,
  startingRound: number,
): EnginePlayer {
  return {
    id: participant.id,
    name: participant.name,
    isBot: participant.isBot,
    teamId,
    connected: true,
    score: settings.startingScore,
    hp: settings.startingHp,
    maxHp: settings.startingHp,
    credits: settings.startingResources,
    lives: settings.startingLives,
    eliminated: false,
    awaitingRespawn: false,
    respawnAtRound: null,
    deck: [],
    hand: [],
    discard: [],
    battlefield: [],
    statuses: [],
    armor: 0,
    playedThisTurn: 0,
    hasEndedTurn: false,
    skipNextTurn: false,
    assetBuff: 0,
    assetBuffRounds: 0,
    draftOffers: [],
    draftPicks: 0,
  };
}

export function normaliseSettings(input: Partial<GameSettings> | undefined): GameSettings {
  const merged: GameSettings = { ...DEFAULT_SETTINGS, ...(input ?? {}) };
  merged.pointsToWin = Math.max(0, Math.min(999, Math.round(merged.pointsToWin)));
  merged.scoreLimit = Math.max(0, Math.min(999, Math.round(merged.scoreLimit)));
  merged.startingScore = Math.max(-100, Math.min(500, Math.round(merged.startingScore)));
  merged.startingResources = Math.max(0, Math.min(30, Math.round(merged.startingResources)));
  merged.startingHp = Math.max(1, Math.min(999, Math.round(merged.startingHp)));
  merged.startingLives = Math.max(1, Math.min(20, Math.round(merged.startingLives)));
  merged.handSize = Math.max(1, Math.min(20, Math.round(merged.handSize)));
  merged.deckSize = Math.max(8, Math.min(200, Math.round(merged.deckSize)));
  merged.cardsPerTurn = Math.max(1, Math.min(20, Math.round(merged.cardsPerTurn)));
  merged.roundLimit = Math.max(0, Math.min(999, Math.round(merged.roundLimit)));
  merged.lossThreshold = Math.max(-999, Math.min(0, Math.round(merged.lossThreshold)));
  merged.turnTimerSec = Math.max(0, Math.min(3600, Math.round(merged.turnTimerSec)));
  merged.roundTimerSec = Math.max(0, Math.min(7200, Math.round(merged.roundTimerSec)));
  merged.teamSize = Math.max(1, Math.min(64, Math.round(merged.teamSize)));
  merged.botCount = Math.max(0, Math.min(128, Math.round(merged.botCount)));
  merged.respawnDelayRounds = Math.max(0, Math.min(20, Math.round(merged.respawnDelayRounds)));
  merged.damageMultiplier = Math.max(0, Math.min(10, Number(merged.damageMultiplier) || 1));
  merged.healingMultiplier = Math.max(0, Math.min(10, Number(merged.healingMultiplier) || 1));
  merged.suddenDeathRound = Math.max(1, Math.min(999, Math.round(merged.suddenDeathRound)));
  merged.reconnectGraceSec = Math.max(0, Math.min(3600, Math.round(merged.reconnectGraceSec)));
  merged.hillBonus = Math.max(0, Math.min(50, Math.round(merged.hillBonus)));
  merged.draftPicks = Math.max(1, Math.min(60, Math.round(merged.draftPicks)));
  merged.enabledExpansions = [...new Set(merged.enabledExpansions)].filter((id) =>
    ["classic", "crossover", "brainrot", "frontier"].includes(id),
  );
  if (merged.enabledExpansions.length === 0) merged.enabledExpansions = ["classic"];
  merged.enabledCards = [...new Set(merged.enabledCards)].filter((id) => Boolean(tryGetCard(id)));
  merged.bannedCards = [...new Set(merged.bannedCards)].filter((id) => Boolean(tryGetCard(id)));
  merged.lobbyName = String(merged.lobbyName || "LAN Lobby").slice(0, 60);
  if (!Array.isArray(merged.loseConditions) || merged.loseConditions.length === 0) {
    merged.loseConditions = [...DEFAULT_SETTINGS.loseConditions];
  }
  merged.customWinFormula = String(merged.customWinFormula || "").slice(0, 500);
  merged.customLoseFormula = String(merged.customLoseFormula || "").slice(0, 500);
  return merged;
}

export function validateGameSettings(settings: GameSettings): string | null {
  if (settings.pointsToWin === 0 && settings.scoreLimit === 0 && !settings.loseConditions.includes("lives") && !settings.loseConditions.includes("roundLimit")) {
    return "No win or loss clock is active. Set points, a score limit, lives, or a round limit.";
  }
  if (settings.deckSize < 8) return "Deck size must be at least 8.";
  const formulaError =
    validateFormula(settings.customWinFormula, formulaSampleVariables(settings)) ??
    validateFormula(settings.customLoseFormula, formulaSampleVariables(settings));
  return formulaError ? `Custom formula: ${formulaError}` : null;
}

function formulaSampleVariables(settings: GameSettings): Record<string, number | boolean> {
  return {
    score: 0,
    hp: settings.startingHp,
    round: 1,
    lives: settings.startingLives,
    assets: 2,
    hand: settings.handSize,
    deck: settings.deckSize,
    credits: settings.startingResources,
    eliminated: false,
    pointsToWin: settings.pointsToWin,
    opponents: 1,
  };
}

function teamFor(participant: EngineParticipant, index: number, settings: GameSettings): string {
  if (participant.teamId) return participant.teamId;
  if (settings.mode === "coop") return participant.isBot ? "ai" : "crew";
  if (settings.mode === "teams") return `team-${Math.floor(index / settings.teamSize) + 1}`;
  return `solo-${participant.id}`;
}

function buildDeckForPlayer(
  game: GameState,
  player: EnginePlayer,
  pool: CardDefinition[],
  targetSize: number,
): void {
  if (pool.length === 0) {
    throw new Error("The selected card pool is empty. Enable at least one expansion.");
  }
  player.deck = [];
  const byType = {
    asset: pool.filter((definition) => definition.type === "asset"),
    attack: pool.filter((definition) => definition.type === "attack"),
    defense: pool.filter((definition) => definition.type === "defense"),
    event: pool.filter((definition) => definition.type === "event"),
  };
  const buckets: CardDefinition[][] = [];
  const weights = [
    { type: "asset" as const, copies: Math.round(targetSize * 0.24) },
    { type: "defense" as const, copies: Math.round(targetSize * 0.22) },
    { type: "attack" as const, copies: Math.round(targetSize * 0.38) },
    { type: "event" as const, copies: Math.round(targetSize * 0.16) },
  ];
  for (const { type, copies } of weights) {
    const source = byType[type].length > 0 ? byType[type] : pool;
    for (let index = 0; index < copies; index += 1) {
      buckets.push([pickOne(game, source)]);
    }
  }
  while (buckets.length < targetSize) {
    buckets.push([pickOne(game, pool)]);
  }
  const chosen = shuffle(game, buckets)
    .slice(0, targetSize)
    .map((bucket) => bucket[0]!);
  player.deck = chosen.map((definition) => makeInstance(player.id, definition.id, game.round || 1));
  shuffle(game, player.deck);
}

function starterTokens(game: GameState, player: EnginePlayer, pool: CardDefinition[]): void {
  const available = new Set(pool.map((definition) => definition.id));
  const tokenIds = ["isp-connection", "desktop-computer"].filter((id) => available.has(id));
  for (const id of tokenIds) {
    const instance = makeInstance(player.id, id, game.round || 1);
    const definition = getCard(id);
    player.battlefield.push({
      ...instance,
      attachedUpgradeCount: 0,
      usesLeft: definition.defense?.uses,
    });
  }
}

function drawCards(game: GameState, player: EnginePlayer, count: number): number {
  let drawn = 0;
  const maxHand = game.settings.handSize;
  for (let index = 0; index < count; index += 1) {
    if (player.hand.length >= maxHand) break;
    const instance = player.deck.pop();
    if (!instance) {
      if (game.settings.loseConditions.includes("deckOut")) {
        eliminatePlayer(game, player, "ran out of cards", true);
      }
      break;
    }
    player.hand.push(instance);
    drawn += 1;
  }
  return drawn;
}

function playerAlive(player: EnginePlayer): boolean {
  return !player.eliminated && !player.awaitingRespawn && player.hp > 0;
}

function gameTeamMode(settings: GameSettings): boolean {
  return settings.mode === "teams" || settings.mode === "coop";
}

function enemiesOf(game: GameState, player: EnginePlayer): EnginePlayer[] {
  return game.players.filter(
    (candidate) =>
      candidate.id !== player.id && candidate.teamId !== player.teamId && playerAlive(candidate),
  );
}

function alliesOf(game: GameState, player: EnginePlayer): EnginePlayer[] {
  return game.players.filter(
    (candidate) => candidate.teamId === player.teamId && !candidate.eliminated,
  );
}

function playerById(game: GameState, id: string | undefined): EnginePlayer | undefined {
  return game.players.find((player) => player.id === id);
}

function defenseMatches(defenseTags: string[], attackTags: string[]): boolean {
  return defenseTags.includes("all") || attackTags.some((tag) => defenseTags.includes(tag));
}

function addArmorFromDeployment(player: EnginePlayer, definition: CardDefinition): void {
  if (definition.defense?.armor) {
    player.armor += definition.defense.armor;
  }
}

function sendToDiscard(player: EnginePlayer, instance: CardInstance): void {
  player.discard.push(instance);
}

function removeBattlefieldCard(
  game: GameState,
  player: EnginePlayer,
  iid: string | undefined,
): BattlefieldCard | undefined {
  if (!iid) return undefined;
  const index = player.battlefield.findIndex((card) => card.iid === iid);
  if (index < 0) return undefined;
  const [card] = player.battlefield.splice(index, 1);
  if (card) sendToDiscard(player, card);
  return card;
}

function randomHandCard(player: EnginePlayer, state: { rngState: number }): CardInstance | undefined {
  if (player.hand.length === 0) return undefined;
  const index = Math.floor(nextRandom(state) * player.hand.length);
  return player.hand[index];
}

function discardCards(game: GameState, player: EnginePlayer, count: number): number {
  let discarded = 0;
  for (let index = 0; index < count; index += 1) {
    const card = randomHandCard(player, game);
    if (!card) break;
    player.hand = player.hand.filter((candidate) => candidate.iid !== card.iid);
    sendToDiscard(player, card);
    discarded += 1;
  }
  return discarded;
}

function scoreThresholdEnabled(game: GameState): boolean {
  return game.settings.pointsToWin > 0 || game.settings.scoreLimit > 0;
}

function teamScore(game: GameState, teamId: string): number {
  return game.players
    .filter((player) => player.teamId === teamId)
    .reduce((total, player) => total + player.score, 0);
}

function liveTeamIds(game: GameState): string[] {
  return [...new Set(game.players.filter((player) => !player.eliminated).map((player) => player.teamId))];
}

function playerScoreForWin(game: GameState, player: EnginePlayer): number {
  return gameTeamMode(game.settings) ? teamScore(game, player.teamId) : player.score;
}

function highestTeamScore(game: GameState): { teamId: string; score: number } | null {
  let best: { teamId: string; score: number } | null = null;
  for (const player of game.players.filter((candidate) => !candidate.eliminated)) {
    const score = playerScoreForWin(game, player);
    if (!best || score > best.score) best = { teamId: player.teamId, score };
  }
  return best;
}

function finishGame(game: GameState, teamIds: string[], players: EnginePlayer[], reason: string): void {
  game.phase = "ended";
  game.winner = {
    playerIds: players.map((player) => player.id),
    teamIds,
    reason,
  };
  game.activePlayerIds = [];
  game.turnDeadline = null;
  game.roundDeadline = null;
  addLog(game, "system", `Game over — ${reason}`);
  touch(game);
}

function checkLastTeamStanding(game: GameState): boolean {
  if (game.phase === "ended") return false;
  const aliveTeams = new Set(
    game.players
      .filter((player) => !player.eliminated)
      .map((player) => player.teamId),
  );
  if (aliveTeams.size > 1) return false;
  const winners = game.players.filter((player) => !player.eliminated);
  if (winners.length === 0) {
    finishGame(game, [], [], "Mutual destruction");
    return true;
  }
  if (game.players.length > 1) {
    finishGame(
      game,
      [...aliveTeams],
      winners,
      `${winners.map((player) => player.name).join(", ")} ${winners.length === 1 ? "is" : "are"} the last network standing`,
    );
    return true;
  }
  return false;
}

function eliminatePlayer(game: GameState, player: EnginePlayer, reason: string, fatal = false): void {
  if (player.eliminated) return;
  player.eliminated = true;
  player.awaitingRespawn = false;
  player.respawnAtRound = null;
  player.hand.forEach((card) => player.discard.push(card));
  player.hand = [];
  player.battlefield.forEach((card) => player.discard.push(card));
  player.battlefield = [];
  player.statuses = [];
  player.armor = 0;
  game.activePlayerIds = game.activePlayerIds.filter((id) => id !== player.id);
  addLog(game, "elimination", `${player.name} is out — ${reason}.`, undefined, player.id);
  checkLastTeamStanding(game);
  touch(game);
  void fatal;
}

function handleLethal(game: GameState, player: EnginePlayer, reason: string): void {
  const hpLossEnabled =
    game.settings.loseConditions.includes("hp") || game.settings.loseConditions.includes("lives");
  if (!hpLossEnabled) {
    player.hp = 1;
    addLog(game, "damage", `${player.name} survives at 1 HP because HP loss is disabled in this ruleset.`, undefined, player.id);
    return;
  }
  if (!game.settings.respawn) {
    eliminatePlayer(game, player, reason);
    return;
  }
  player.lives -= 1;
  if (player.lives <= 0) {
    player.lives = 0;
    eliminatePlayer(game, player, reason);
    return;
  }
  player.awaitingRespawn = true;
  player.respawnAtRound = game.round + Math.max(0, game.settings.respawnDelayRounds);
  player.hp = 0;
  player.armor = 0;
  addLog(
    game,
    "damage",
    `${player.name} is knocked offline — ${reason}. Respawning round ${player.respawnAtRound}.`,
  );
  touch(game);
}

function damagePlayer(
  game: GameState,
  target: EnginePlayer,
  rawAmount: number,
  source: string,
  options: { ignoreArmor?: boolean; isSelfDamage?: boolean } = {},
): number {
  if (target.eliminated) return 0;
  let amount = Math.max(0, Math.round(rawAmount));
  const multiplier = game.settings.damageMultiplier * (game.suddenDeath ? 2 : 1);
  if (!options.isSelfDamage) amount = Math.round(amount * multiplier);
  if (!options.ignoreArmor && !options.isSelfDamage) {
    const absorbed = Math.min(target.armor, amount);
    target.armor -= absorbed;
    amount -= absorbed;
  }
  if (amount <= 0) return 0;
  target.hp = Math.max(0, target.hp - amount);
  addLog(game, "damage", `${source} deals ${amount} damage to ${target.name}.`, undefined, target.id);
  if (target.hp <= 0) handleLethal(game, target, "network integrity reached zero");
  touch(game);
  return amount;
}

function grantCredits(player: EnginePlayer, amount: number): void {
  player.credits = Math.max(0, player.credits + Math.round(amount));
}

function healPlayer(game: GameState, target: EnginePlayer, rawAmount: number): void {
  if (target.eliminated) return;
  const amount = Math.max(0, Math.round(rawAmount * game.settings.healingMultiplier));
  const before = target.hp;
  target.hp = Math.min(target.maxHp, target.hp + amount);
  if (target.hp > before) {
    addLog(game, "score", `${target.name} restores ${target.hp - before} HP.`, undefined, target.id);
  }
}

function isDisabled(instance: BattlefieldCard, round: number): boolean {
  return Boolean(instance.disabledUntilRound && instance.disabledUntilRound > round);
}

function effectiveScoringAssetPoints(player: EnginePlayer, round: number): number {
  return player.battlefield.reduce((total, instance) => {
    const definition = getCard(instance.cardId);
    if (!definition.passive?.pointsPerRound) return total;
    if (isDisabled(instance, round)) return total;
    const buff = player.assetBuffRounds > 0 ? player.assetBuff : 0;
    return total + definition.passive.pointsPerRound + buff;
  }, 0);
}

function applyAction(
  game: GameState,
  action: EffectAction,
  actor: EnginePlayer,
  targetPlayer: EnginePlayer | undefined,
  targetAsset: BattlefieldCard | undefined,
): void {
  if (action.kind === "coinFlip") {
    const heads = nextRandom(game) >= 0.5;
    addLog(game, "system", `${actor.name}'s coin flip lands ${heads ? "heads" : "tails"}.`, actor.id);
    for (const nested of heads ? action.heads : action.tails) {
      applyAction(game, nested, actor, targetPlayer, targetAsset);
      if (hasEnded(game)) return;
    }
    return;
  }
  if (action.kind === "selfDamage") {
    damagePlayer(game, actor, action.amount, "Self-inflicted", { ignoreArmor: true, isSelfDamage: true });
    return;
  }

  const resolvePlayerTargets = (selection: EffectTarget | undefined): EnginePlayer[] => {
    switch (selection ?? "chosen") {
      case "self":
        return [actor];
      case "allEnemies":
        return enemiesOf(game, actor);
      case "allAllies":
        return alliesOf(game, actor);
      case "allPlayers":
        return game.players.filter((player) => !player.eliminated);
      case "randomEnemy": {
        const enemies = enemiesOf(game, actor);
        return enemies.length ? [pickOne(game, enemies)] : [];
      }
      case "chosen":
      case "chosenAsset":
      default:
        return targetPlayer && !targetPlayer.eliminated ? [targetPlayer] : [];
    }
  };

  if (action.kind === "ongoing") {
    const victims = resolvePlayerTargets(action.target);
    for (const victim of victims) {
      victim.statuses.push({
        id: randomUUID(),
        sourceCardId: "",
        sourceName: action.label,
        kind: action.effect,
        amount: action.amount,
        roundsLeft: action.rounds,
        label: action.label,
      });
      addLog(
        game,
        "system",
        `${victim.name} is afflicted by ${action.label} (${action.effect} ${action.amount} for ${action.rounds} round${action.rounds === 1 ? "" : "s"}).`,
        actor.id,
        victim.id,
      );
    }
    return;
  }

  if (action.kind === "destroyAsset" || action.kind === "disableAsset") {
    const assetOwners = action.target === "randomEnemyAsset" ? enemiesOf(game, actor) : [];
    const chosenAsset =
      action.target === "randomEnemyAsset"
        ? assetOwners.flatMap((owner) => owner.battlefield)[
            Math.floor(nextRandom(game) * Math.max(1, assetOwners.flatMap((owner) => owner.battlefield).length))
          ]
        : targetAsset;
    const owner =
      action.target === "randomEnemyAsset"
        ? game.players.find((candidate) => candidate.battlefield.some((card) => card.iid === chosenAsset?.iid))
        : targetPlayer;
    if (!chosenAsset || !owner) return;
    const cardName = getCard(chosenAsset.cardId).name;
    if (action.kind === "destroyAsset") {
      removeBattlefieldCard(game, owner, chosenAsset.iid);
      addLog(game, "play", `${cardName} is destroyed.`, actor.id, owner.id);
    } else {
      chosenAsset.disabledUntilRound = game.round + Math.max(1, action.rounds);
      addLog(game, "play", `${cardName} is disabled until round ${chosenAsset.disabledUntilRound}.`, actor.id, owner.id);
    }
    return;
  }

  const applyToPlayer = (target: EnginePlayer) => {
    if (target.eliminated) return;
    switch (action.kind) {
      case "damage":
        damagePlayer(game, target, action.amount, "Network strike", { isSelfDamage: false });
        break;
      case "drain":
        target.score -= action.amount;
        addLog(game, "score", `${target.name} loses ${action.amount} score.`, actor.id, target.id);
        break;
      case "heal":
        healPlayer(game, target, action.amount);
        break;
      case "score":
        target.score += action.amount;
        addLog(game, "score", `${target.name} gains ${action.amount} score.`, actor.id, target.id);
        break;
      case "draw":
        drawCards(game, target, action.amount);
        addLog(game, "system", `${target.name} draws ${action.amount} card${action.amount === 1 ? "" : "s"}.`, actor.id, target.id);
        break;
      case "credits":
        grantCredits(target, action.amount);
        addLog(game, "system", `${target.name} gains ${action.amount} credits.`, actor.id, target.id);
        break;
      case "discard": {
        const count = discardCards(game, target, action.amount);
        if (count > 0) {
          addLog(game, "system", `${target.name} discards ${count} card${count === 1 ? "" : "s"}.`, actor.id, target.id);
        }
        break;
      }
      case "shield":
        target.armor += action.amount;
        addLog(game, "system", `${target.name} gains ${action.amount} armor.`, actor.id, target.id);
        break;
      case "skipTurn":
        target.skipNextTurn = true;
        addLog(game, "system", `${target.name} will skip their next turn.`, actor.id, target.id);
        break;
      case "buffAssets":
        target.assetBuff = Math.max(target.assetBuff, action.amount);
        target.assetBuffRounds = Math.max(target.assetBuffRounds, action.rounds ?? 1);
        addLog(game, "system", `${target.name}'s assets gain +${action.amount} score this round.`, actor.id, target.id);
        break;
      case "stealCredits": {
        const amount = Math.min(target.credits, action.amount);
        target.credits -= amount;
        grantCredits(actor, amount);
        addLog(game, "system", `${actor.name} steals ${amount} credits from ${target.name}.`, actor.id, target.id);
        break;
      }
      case "revealHand": {
        const viewerIds = alliesOf(game, actor).map((player) => player.id);
        game.reveals.push({
          viewerIds,
          playerId: target.id,
          cards: target.hand.map((card) => card.cardId),
          expiresRound: game.round + 1,
        });
        addLog(game, "system", `${target.name}'s hand is revealed to ${actor.name}'s team.`, actor.id, target.id);
        break;
      }
      default:
        break;
    }
  };

  const targets = resolvePlayerTargets(action.target);
  for (const target of targets) {
    applyToPlayer(target);
    if (hasEnded(game)) return;
  }
}

function availableDefenses(game: GameState, defender: EnginePlayer, card: CardDefinition): BattlefieldCard[] {
  return defender.battlefield.filter((instance) => {
    const definition = getCard(instance.cardId);
    if (!definition.defense) return false;
    if (isDisabled(instance, game.round)) return false;
    const uses = instance.usesLeft ?? definition.defense.uses;
    return uses > 0 && defenseMatches(definition.defense.blocks, card.keywords);
  });
}

function consumeDefense(game: GameState, defender: EnginePlayer, defense: BattlefieldCard): void {
  const definition = getCard(defense.cardId);
  const remaining = (defense.usesLeft ?? definition.defense?.uses ?? 1) - 1;
  defense.usesLeft = remaining;
  if (remaining <= 0) {
    removeBattlefieldCard(game, defender, defense.iid);
  }
}

function validateTargets(
  game: GameState,
  actor: EnginePlayer,
  card: CardDefinition,
  targetPlayer: EnginePlayer | undefined,
  targetAsset: BattlefieldCard | undefined,
): void {
  const destructive =
    card.type === "attack" ||
    card.actions.some((action) =>
      ["damage", "drain", "destroyAsset", "disableAsset", "discard", "skipTurn", "stealCredits"].includes(
        action.kind,
      ),
    );
  if (card.target === "none") return;
  if (card.target === "enemyPlayer") {
    if (!targetPlayer) throw new GameRuleError("invalid-target", "Select an enemy player.");
    if (targetPlayer.eliminated) throw new GameRuleError("invalid-target", "That player is already out.");
    if (targetPlayer.id === actor.id) throw new GameRuleError("invalid-target", "You cannot target yourself with this card.");
    if (targetPlayer.teamId === actor.teamId) {
      if (!game.settings.friendlyFire || game.settings.targeting !== "open") {
        throw new GameRuleError("friendly-fire", "Friendly fire is disabled in this lobby.");
      }
    }
  }
  if (card.target === "anyPlayer") {
    if (!targetPlayer) throw new GameRuleError("invalid-target", "Select a player.");
    if (targetPlayer.eliminated) throw new GameRuleError("invalid-target", "That player is already out.");
    if (
      destructive &&
      targetPlayer.teamId === actor.teamId &&
      (!game.settings.friendlyFire || game.settings.targeting !== "open")
    ) {
      throw new GameRuleError("friendly-fire", "Friendly fire is disabled in this lobby.");
    }
  }
  if (card.target === "enemyAsset" || card.target === "ownAsset" || card.target === "anyAsset") {
    if (!targetAsset || !targetPlayer) {
      throw new GameRuleError("invalid-target", "Select a target asset on the table.");
    }
    if (card.target === "enemyAsset" && targetPlayer.teamId === actor.teamId) {
      if (!game.settings.friendlyFire || game.settings.targeting !== "open") {
        throw new GameRuleError("friendly-fire", "Friendly fire is disabled in this lobby.");
      }
    }
    if (card.target === "ownAsset" && targetPlayer.id !== actor.id) {
      throw new GameRuleError("invalid-target", "Select one of your own assets.");
    }
  }
}

export function playCard(
  game: GameState,
  playerId: string,
  input: { iid: string; targetPlayerId?: string; targetIid?: string },
): { ok: true; card: CardDefinition } {
  if (game.phase !== "playing") {
    throw new GameRuleError("game-not-active", "The game is not in a playable state.");
  }
  const actor = playerById(game, playerId);
  if (!actor) throw new GameRuleError("invalid-action", "Unknown player.");
  if (!playerAlive(actor)) throw new GameRuleError("invalid-action", "Your network is offline.");
  if (!game.activePlayerIds.includes(actor.id) || actor.hasEndedTurn) {
    throw new GameRuleError("not-your-turn", "It is not your turn.");
  }
  const handCard = actor.hand.find((card) => card.iid === input.iid);
  if (!handCard) throw new GameRuleError("no-card", "That card is not in your hand.");
  const definition = getCard(handCard.cardId);
  if (definition.cost > actor.credits) {
    throw new GameRuleError("not-enough-credits", `You need ${definition.cost} credits to play ${definition.name}.`);
  }
  const limit =
    game.settings.cardsPerTurn +
    actor.battlefield.reduce(
      (bonus, instance) => bonus + (getCard(instance.cardId).passive?.playLimitBonus ?? 0),
      0,
    );
  if (actor.playedThisTurn >= limit) {
    throw new GameRuleError("play-limit", `You already played ${limit} cards this turn.`);
  }
  let targetPlayer = playerById(game, input.targetPlayerId);
  let targetAsset: BattlefieldCard | undefined;

  if (definition.target === "enemyAsset" || definition.target === "anyAsset" || definition.target === "ownAsset") {
    if (input.targetIid) {
      for (const candidate of game.players) {
        const found = candidate.battlefield.find((instance) => instance.iid === input.targetIid);
        if (found) {
          targetAsset = found;
          targetPlayer = candidate;
          break;
        }
      }
    }
    if (!targetPlayer && definition.target !== "ownAsset") {
      const candidates = game.players.filter(
        (candidate) =>
          candidate.id !== actor.id &&
          !candidate.eliminated &&
          candidate.battlefield.length > 0 &&
          candidate.teamId !== actor.teamId,
      );
      if (candidates.length === 1) {
        targetPlayer = candidates[0];
        targetAsset = targetPlayer?.battlefield[0];
      }
    }
  } else if (!targetPlayer && definition.target === "enemyPlayer") {
    const enemies = enemiesOf(game, actor);
    if (enemies.length === 1) targetPlayer = enemies[0];
  }
  validateTargets(game, actor, definition, targetPlayer, targetAsset);

  const unblockable = definition.keywords.includes("unblockable");
  if (definition.type === "attack" && !unblockable && targetPlayer) {
    const defenses = availableDefenses(game, targetPlayer, definition);
    if (defenses.length > 0) {
      const defense = defenses[0]!;
      actor.hand = actor.hand.filter((card) => card.iid !== handCard.iid);
      sendToDiscard(actor, handCard);
      actor.credits -= definition.cost;
      actor.playedThisTurn += 1;
      consumeDefense(game, targetPlayer, defense);
      addLog(
        game,
        "counter",
        `${actor.name}'s ${definition.name} is countered by ${targetPlayer.name}'s ${getCard(defense.cardId).name}.`,
        actor.id,
        targetPlayer.id,
      );
      touch(game);
      return { ok: true, card: definition };
    }
  }

  actor.hand = actor.hand.filter((card) => card.iid !== handCard.iid);
  actor.credits -= definition.cost;
  actor.playedThisTurn += 1;
  addLog(
    game,
    "play",
    `${actor.name} plays ${definition.name}${targetPlayer ? ` on ${targetPlayer.name}` : ""}.`,
    actor.id,
    targetPlayer?.id,
  );

  if (definition.type === "defense") {
    const deployed: BattlefieldCard = {
      ...handCard,
      ownerId: actor.id,
      attachedUpgradeCount: 0,
      usesLeft: definition.defense?.uses,
    };
    actor.battlefield.push(deployed);
    addArmorFromDeployment(actor, definition);
    for (const action of definition.actions) {
      applyAction(game, action, actor, targetPlayer, targetAsset);
      if (hasEnded(game)) break;
    }
  } else if (definition.type === "asset") {
    const deployed: BattlefieldCard = {
      ...handCard,
      ownerId: actor.id,
      attachedUpgradeCount: 0,
      usesLeft: undefined,
    };
    actor.battlefield.push(deployed);
    for (const action of definition.actions) {
      applyAction(game, action, actor, targetPlayer, targetAsset);
      if (hasEnded(game)) break;
    }
  } else {
    for (const action of definition.actions) {
      applyAction(game, action, actor, targetPlayer, targetAsset);
      if (hasEnded(game)) break;
    }
    sendToDiscard(actor, handCard);
  }

  if (definition.target !== "none") {
    addLog(game, "system", `${definition.name} resolves.`, actor.id, targetPlayer?.id);
  }
  if (
    game.phase === "playing" &&
    !playerAlive(actor) &&
    game.activePlayerIds.includes(actor.id)
  ) {
    actor.hasEndedTurn = true;
    if (game.settings.pacing === "simultaneous") {
      game.activePlayerIds = game.activePlayerIds.filter((id) => id !== actor.id);
      if (game.activePlayerIds.length === 0) endRound(game);
    } else {
      advanceTurn(game, actor.id);
    }
  }
  touch(game);
  return { ok: true, card: definition };
}

function grantTurnIncome(game: GameState, player: EnginePlayer): void {
  const income = player.battlefield.reduce((total, instance) => {
    if (isDisabled(instance, game.round)) return total;
    return total + (getCard(instance.cardId).passive?.creditsPerTurn ?? 0);
  }, 0);
  grantCredits(player, BASE_CREDITS_PER_TURN + income);
  drawCards(game, player, AUTOMATIC_DRAW_PER_TURN);
}

function beginPlayerTurn(game: GameState, playerId: string): void {
  const player = playerById(game, playerId);
  if (!player || !playerAlive(player)) return;
  player.playedThisTurn = 0;
  player.hasEndedTurn = false;
  game.activePlayerIds = [player.id];
  game.turn += 1;
  game.turnDeadline = game.settings.turnTimerSec > 0 ? now() + game.settings.turnTimerSec * 1000 : null;
  grantTurnIncome(game, player);
  addLog(game, "system", `${player.name}'s turn begins.`, player.id);
}

function activePlayersInOrder(game: GameState): EnginePlayer[] {
  return game.turnQueue
    .map((id) => playerById(game, id))
    .filter((player): player is EnginePlayer => Boolean(player && playerAlive(player)));
}

function advanceTurn(game: GameState, fromPlayerId: string): void {
  if (game.settings.pacing === "simultaneous") {
    const active = activePlayersInOrder(game);
    if (active.every((player) => player.hasEndedTurn)) {
      endRound(game);
    } else {
      game.activePlayerIds = active
        .filter((player) => !player.hasEndedTurn)
        .map((player) => player.id);
      game.turnDeadline = game.roundDeadline;
    }
    return;
  }
  const alive = activePlayersInOrder(game);
  const currentIndex = alive.findIndex((player) => player.id === fromPlayerId);
  const ordered = currentIndex >= 0 ? [...alive.slice(currentIndex + 1), ...alive.slice(0, currentIndex + 1)] : alive;
  const next = ordered.find((player) => player.id !== fromPlayerId || alive.length === 1);
  if (!next || game.turnPointer >= game.turnQueue.length - 1) {
    endRound(game);
    return;
  }
  const nextIndex = game.turnQueue.indexOf(next.id);
  if (nextIndex <= game.turnPointer) {
    endRound(game);
    return;
  }
  if (next.skipNextTurn) {
    next.skipNextTurn = false;
    addLog(game, "timer", `${next.name} skips their turn.`, next.id);
    game.turnPointer = nextIndex;
    game.turn += 1;
    advanceTurn(game, next.id);
    return;
  }
  game.turnPointer = nextIndex;
  beginPlayerTurn(game, next.id);
}

function beginRound(game: GameState): void {
  const alive = game.players.filter((player) => !player.eliminated);
  for (const player of game.players) {
    if (player.eliminated) continue;
    if (player.awaitingRespawn && player.respawnAtRound !== null && game.round >= player.respawnAtRound) {
      player.awaitingRespawn = false;
      player.respawnAtRound = null;
      player.hp = player.maxHp;
      player.armor = 0;
      addLog(game, "system", `${player.name} is back online.`, player.id);
    }
  }
  game.turnQueue = alive
    .filter((player) => playerAlive(player))
    .map((player) => player.id);
  if (game.round > 1) {
    const offset = (game.round - 1) % Math.max(1, game.turnQueue.length);
    game.turnQueue = [...game.turnQueue.slice(offset), ...game.turnQueue.slice(0, offset)];
  }
  game.turnPointer = 0;
  game.activePlayerIds = [];
  for (const player of game.players) {
    player.hasEndedTurn = false;
  }
  game.roundDeadline =
    game.settings.roundTimerSec > 0 ? now() + game.settings.roundTimerSec * 1000 : null;

  if (game.settings.pacing === "simultaneous") {
    const active = activePlayersInOrder(game);
    for (const player of active) {
      player.playedThisTurn = 0;
      if (player.skipNextTurn) {
        player.skipNextTurn = false;
        player.hasEndedTurn = true;
        addLog(game, "timer", `${player.name} skips their turn.`, player.id);
        continue;
      }
      grantTurnIncome(game, player);
      addLog(game, "system", `${player.name}'s turn begins.`, player.id);
    }
    game.activePlayerIds = active.filter((player) => !player.hasEndedTurn).map((player) => player.id);
    game.turnDeadline = game.roundDeadline;
    if (game.activePlayerIds.length === 0) {
      endRound(game);
      return;
    }
  } else {
    const first = activePlayersInOrder(game)[0];
    if (!first) {
      endRound(game);
      return;
    }
    game.turnPointer = Math.max(0, game.turnQueue.indexOf(first.id));
    if (first.skipNextTurn) {
      first.skipNextTurn = false;
      addLog(game, "timer", `${first.name} skips their turn.`, first.id);
      advanceTurn(game, first.id);
      return;
    }
    beginPlayerTurn(game, first.id);
  }
  touch(game);
}

export function endTurn(game: GameState, playerId: string, reason: "manual" | "timer" = "manual"): void {
  if (game.phase !== "playing") return;
  const player = playerById(game, playerId);
  if (!player) throw new GameRuleError("invalid-action", "Unknown player.");
  if (!game.activePlayerIds.includes(playerId) || player.hasEndedTurn) {
    throw new GameRuleError("not-your-turn", "You are not active.");
  }
  player.hasEndedTurn = true;
  addLog(
    game,
    "timer",
    reason === "timer" ? `${player.name}'s turn timer expires.` : `${player.name} ends their turn.`,
    player.id,
  );
  if (game.settings.pacing === "simultaneous") {
    game.activePlayerIds = activePlayersInOrder(game)
      .filter((candidate) => !candidate.hasEndedTurn)
      .map((candidate) => candidate.id);
    if (game.activePlayerIds.length === 0) {
      endRound(game);
    } else {
      touch(game);
    }
    return;
  }
  advanceTurn(game, playerId);
  touch(game);
}

function applyRoundStatuses(game: GameState, player: EnginePlayer): void {
  const remaining: StatusEffect[] = [];
  for (const status of player.statuses) {
    if (status.roundsLeft <= 0) continue;
    if (status.kind === "damage") {
      damagePlayer(game, player, status.amount, status.label, { isSelfDamage: false });
    } else {
      player.score -= status.amount;
      addLog(game, "score", `${player.name} loses ${status.amount} score to ${status.label}.`, undefined, player.id);
    }
    status.roundsLeft -= 1;
    if (status.roundsLeft > 0) remaining.push(status);
  }
  player.statuses = remaining;
}

function resolveRoundGameEnd(game: GameState): boolean {
  if (game.phase === "ended") return true;
  if (checkLastTeamStanding(game)) return true;

  const alive = game.players.filter((player) => !player.eliminated);

  // Custom loss formulas are evaluated before standard win checks.
  if (game.settings.customLoseFormula.trim()) {
    for (const player of alive) {
      const variables = customFormulaVariables(game, player);
      try {
        if (Boolean(evaluateFormula(game.settings.customLoseFormula, variables))) {
          eliminatePlayer(game, player, "custom loss formula");
        }
      } catch {
        // Invalid formulas are rejected when settings are saved.
      }
    }
    if (checkLastTeamStanding(game)) return true;
  }

  if (scoreThresholdEnabled(game)) {
    const best = highestTeamScore(game);
    if (best) {
      const teamScores = liveTeamIds(game).map((teamId) => ({
        teamId,
        score: teamScore(game, teamId),
      }));
      const sorted = teamScores.sort((a, b) => b.score - a.score);
      const top = sorted[0];
      const second = sorted[1];
      const activeThresholds = [game.settings.pointsToWin, game.settings.scoreLimit].filter(
        (value) => value > 0,
      );
      const threshold = Math.min(...activeThresholds, Number.POSITIVE_INFINITY);
      if (top && top.score >= threshold && (!second || top.score > second.score)) {
        const winners = game.players.filter((player) => player.teamId === top.teamId && !player.eliminated);
        finishGame(
          game,
          [top.teamId],
          winners,
          `${winners.map((player) => player.name).join(", ")} reached ${top.score} score`,
        );
        return true;
      }
    }
  }

  if (game.settings.customWinFormula.trim()) {
    const formulaWinners = game.players.filter((player) => !player.eliminated).filter((player) => {
      try {
        return Boolean(evaluateFormula(game.settings.customWinFormula, customFormulaVariables(game, player)));
      } catch {
        return false;
      }
    });
    if (formulaWinners.length > 0) {
      finishGame(
        game,
        [...new Set(formulaWinners.map((player) => player.teamId))],
        formulaWinners,
        "custom win formula satisfied",
      );
      return true;
    }
  }

  if (game.settings.loseConditions.includes("roundLimit") && game.settings.roundLimit > 0 && game.round >= game.settings.roundLimit) {
    const best = highestTeamScore(game);
    const teams = liveTeamIds(game);
    if (teams.length === 1) {
      const winners = game.players.filter((player) => !player.eliminated);
      finishGame(game, teams, winners, `round limit reached — ${winners[0]?.name ?? "winner"} takes the table`);
    } else if (best) {
      const winners = game.players.filter((player) => player.teamId === best.teamId && !player.eliminated);
      const tied = teams.some((teamId) => teamId !== best.teamId && teamScore(game, teamId) === best.score);
      if (tied) {
        finishGame(game, [], [], "round limit reached — the table ends in a draw");
      } else {
        finishGame(game, [best.teamId], winners, `round limit reached — highest score wins`);
      }
    } else {
      finishGame(game, [], [], "round limit reached");
    }
    return true;
  }
  return false;
}

export function endRound(game: GameState): void {
  if (game.phase !== "playing") return;
  game.activePlayerIds = [];
  game.turnDeadline = null;
  game.roundDeadline = null;
  addLog(game, "system", `Round ${game.round} ends. Assets produce score.`);

  for (const player of game.players) {
    if (player.eliminated) continue;
    if (player.awaitingRespawn) continue;
    const assetScore = effectiveScoringAssetPoints(player, game.round);
    if (assetScore > 0) {
      player.score += assetScore;
      addLog(game, "score", `${player.name} scores ${assetScore} from their network.`, player.id);
    }
    applyRoundStatuses(game, player);
    if (player.hp > 0) {
      // Respawned players require a full round of recovery; no score while offline.
      player.armor = player.armor;
    }
    player.assetBuff = 0;
    player.assetBuffRounds = 0;
    for (const instance of player.battlefield) {
      if (instance.disabledUntilRound && instance.disabledUntilRound <= game.round) {
        delete instance.disabledUntilRound;
      }
      const passive = getCard(instance.cardId).passive;
      if (passive?.drawPerRound && player.hp > 0) {
        drawCards(game, player, passive.drawPerRound);
      }
    }
    if (
      game.settings.loseConditions.includes("scoreThreshold") &&
      player.score <= game.settings.lossThreshold
    ) {
      eliminatePlayer(game, player, `score fell to ${player.score}`);
    }
  }

  if (hasEnded(game)) {
    touch(game);
    return;
  }

  if (game.settings.mode === "kingOfHill") {
    let best: EnginePlayer | null = null;
    let bestPoints = -1;
    for (const player of game.players) {
      if (!playerAlive(player)) continue;
      const points = effectiveScoringAssetPoints(player, game.round);
      if (points > bestPoints) {
        best = player;
        bestPoints = points;
      }
    }
    if (best && bestPoints > 0) {
      game.hillHolderId = best.id;
      best.score += game.settings.hillBonus;
      addLog(game, "score", `${best.name} holds the hill and gains ${game.settings.hillBonus} bonus score.`, best.id);
    }
  }

  if (game.settings.suddenDeathEnabled && !game.suddenDeath && game.round >= game.settings.suddenDeathRound) {
    game.suddenDeath = true;
    addLog(game, "system", "SUDDEN DEATH — all damage is doubled. The LAN gets loud.");
  }

  const ended = resolveRoundGameEnd(game);
  if (ended) {
    touch(game);
    return;
  }

  game.round += 1;
  beginRound(game);
  touch(game);
}

export function tickGame(game: GameState): boolean {
  if (game.phase !== "playing") return false;
  const timestamp = now();
  if (game.roundDeadline && timestamp >= game.roundDeadline) {
    addLog(game, "timer", "Round timer expired. Scoring the round.");
    endRound(game);
    return true;
  }
  if (game.turnDeadline && timestamp >= game.turnDeadline && game.settings.pacing !== "simultaneous") {
    const active = game.activePlayerIds[0];
    if (active) {
      endTurn(game, active, "timer");
      return true;
    }
  }
  if (game.settings.pacing === "simultaneous" && game.turnDeadline && timestamp >= game.turnDeadline) {
    const active = activePlayersInOrder(game).filter((player) => !player.hasEndedTurn);
    for (const player of active) {
      player.hasEndedTurn = true;
    }
    if (active.length > 0) {
      addLog(game, "timer", "The shared turn timer expired.");
      endRound(game);
      return true;
    }
  }
  return false;
}

export function canAct(game: GameState, playerId: string): boolean {
  if (game.phase !== "playing") return false;
  const player = playerById(game, playerId);
  return Boolean(
    player &&
      playerAlive(player) &&
      game.activePlayerIds.includes(player.id) &&
      !player.hasEndedTurn,
  );
}

function legalCardsFor(game: GameState, player: EnginePlayer): string[] {
  if (!canAct(game, player.id)) return [];
  const limit =
    game.settings.cardsPerTurn +
    player.battlefield.reduce(
      (bonus, instance) => bonus + (getCard(instance.cardId).passive?.playLimitBonus ?? 0),
      0,
    );
  if (player.playedThisTurn >= limit) return [];
  return player.hand
    .filter((card) => getCard(card.cardId).cost <= player.credits)
    .map((card) => card.iid);
}

function revealedHandsFor(game: GameState, viewerId: string): RevealedHand[] {
  const results: RevealedHand[] = [];
  for (const reveal of game.reveals) {
    if (!reveal.viewerIds.includes(viewerId)) continue;
    if (reveal.expiresRound < game.round) continue;
    const target = playerById(game, reveal.playerId);
    if (!target) continue;
    results.push({
      playerId: target.id,
      name: target.name,
      cards: target.hand
        .filter((instance) => reveal.cards.includes(instance.cardId))
        .map((instance) => getCard(instance.cardId)),
      expiresRound: reveal.expiresRound,
    });
  }
  return results;
}

function publicPlayer(player: EnginePlayer): PlayerView {
  return {
    id: player.id,
    name: player.name,
    isBot: player.isBot,
    teamId: player.teamId,
    connected: player.connected,
    hp: player.hp,
    maxHp: player.maxHp,
    score: player.score,
    credits: player.credits,
    lives: player.lives,
    eliminated: player.eliminated,
    hasEndedTurn: player.hasEndedTurn,
    playedThisTurn: player.playedThisTurn,
    handCount: player.hand.length,
    deckCount: player.deck.length,
    discardCount: player.discard.length,
    battlefield: player.battlefield.map((instance) => ({
      ...instance,
      attachedUpgradeCount: instance.attachedUpgradeCount ?? 0,
    })),
    statuses: player.statuses,
    armor: player.armor,
    draftPicks: player.draftPicks,
  };
}

export function makeView(game: GameState, viewerId: string, spectator = false): GameView {
  const self = playerById(game, viewerId);
  const selfView: SelfView | null =
    self && !spectator
      ? {
          ...publicPlayer(self),
          hand: self.hand,
          legalCardIds: legalCardsFor(game, self),
          draftOffers: self.draftOffers
            .map((id) => tryGetCard(id))
            .filter((definition): definition is CardDefinition => Boolean(definition)),
          revealedHands: revealedHandsFor(game, self.id),
        }
      : null;
  return {
    id: game.id,
    phase: game.phase,
    mode: game.settings.mode,
    pacing: game.settings.pacing,
    round: game.round,
    turn: game.turn,
    activePlayerIds: game.activePlayerIds,
    turnDeadline: game.turnDeadline,
    roundDeadline: game.roundDeadline,
    players: game.players.map(publicPlayer),
    self: selfView,
    spectator,
    settings: game.settings,
    log: game.log.slice(-120),
    winner: game.winner,
    suddenDeath: game.suddenDeath,
    hillHolderId: game.hillHolderId,
    serverNow: now(),
    version: game.version,
  };
}

export function customFormulaVariables(
  game: GameState,
  player: EnginePlayer,
): Record<string, number | boolean> {
  return {
    score: player.score,
    hp: player.hp,
    round: game.round,
    lives: player.lives,
    assets: player.battlefield.filter((card) => getCard(card.cardId).type === "asset").length,
    hand: player.hand.length,
    deck: player.deck.length,
    credits: player.credits,
    eliminated: player.eliminated,
    pointsToWin: game.settings.pointsToWin,
    opponents: enemiesOf(game, player).length,
  };
}

function assignDraftOffers(game: GameState, player: EnginePlayer): void {
  const available = game.draftPool.length > 0 ? game.draftPool : cardPoolForSettings(game.settings).map((card) => card.id);
  const offers: string[] = [];
  const scratchState = { rngState: game.rngState };
  while (offers.length < Math.min(5, available.length)) {
    const candidate = pickOne(scratchState, available);
    if (!offers.includes(candidate)) offers.push(candidate);
  }
  game.rngState = scratchState.rngState;
  player.draftOffers = offers;
}

function finishDraft(game: GameState): void {
  const pool = cardPoolForSettings(game.settings);
  for (const player of game.players) {
    player.draftOffers = [];
    const targetSize = Math.max(game.settings.deckSize, player.deck.length);
    while (player.deck.length < targetSize) {
      player.deck.push(makeInstance(player.id, pickOne(game, pool).id, 1));
    }
    shuffle(game, player.deck);
    player.battlefield = [];
    starterTokens(game, player, pool);
    drawCards(game, player, game.settings.handSize);
    player.credits = game.settings.startingResources;
    player.score = game.settings.startingScore;
    player.hp = game.settings.startingHp;
    player.maxHp = game.settings.startingHp;
    player.lives = game.settings.startingLives;
    player.eliminated = false;
    player.awaitingRespawn = false;
    addLog(game, "system", `${player.name} finished drafting ${player.deck.length} cards.`, player.id);
  }
  game.phase = "playing";
  game.round = 1;
  game.turn = 0;
  game.draftPool = [];
  addLog(game, "system", "Draft complete. The LAN match begins.");
  beginRound(game);
  touch(game);
}

export function draftPick(game: GameState, playerId: string, cardId: string): { ok: true } {
  if (game.phase !== "drafting") {
    throw new GameRuleError("game-not-active", "Drafting is not active.");
  }
  const player = playerById(game, playerId);
  if (!player) throw new GameRuleError("invalid-action", "Unknown player.");
  if (!player.draftOffers.includes(cardId)) {
    throw new GameRuleError("invalid-action", "That card is not in your draft offers.");
  }
  player.draftOffers = player.draftOffers.filter((id) => id !== cardId);
  player.deck.push(makeInstance(player.id, cardId, 1));
  player.draftPicks += 1;
  const picksNeeded = Math.min(game.settings.draftPicks, game.settings.deckSize);
  addLog(game, "system", `${player.name} drafts ${getCard(cardId).name}.`, player.id);
  if (player.draftPicks >= picksNeeded) {
    player.draftOffers = [];
  } else {
    assignDraftOffers(game, player);
  }
  if (game.players.every((candidate) => candidate.draftPicks >= picksNeeded)) {
    finishDraft(game);
  } else {
    touch(game);
  }
  return { ok: true };
}

export function botDraftPick(game: GameState, playerId: string): string | null {
  if (game.phase !== "drafting") return null;
  const player = playerById(game, playerId);
  if (!player || player.draftOffers.length === 0) return null;
  const ranked = [...player.draftOffers].sort((leftId, rightId) => {
    const left = getCard(leftId);
    const right = getCard(rightId);
    const value = (card: CardDefinition) =>
      (card.passive?.pointsPerRound ?? 0) * 2 +
      (card.passive?.creditsPerTurn ?? 0) +
      (card.defense?.uses ?? 0) +
      (card.type === "attack" ? 2 : 0) +
      (card.rarity === "mythic" ? 5 : card.rarity === "legendary" ? 4 : card.rarity === "epic" ? 3 : card.rarity === "rare" ? 2 : 0);
    return value(right) - value(left);
  });
  return ranked[0] ?? null;
}

export function addLatePlayer(
  game: GameState,
  participant: EngineParticipant,
  teamId: string,
): EnginePlayer {
  if (game.phase === "ended") {
    throw new GameRuleError("game-not-active", "The game has ended.");
  }
  const player = createPlayer(participant, game.settings, teamId, game.round);
  const pool = cardPoolForSettings(game.settings);
  buildDeckForPlayer(game, player, pool, game.settings.deckSize);
  starterTokens(game, player, pool);
  drawCards(game, player, game.settings.handSize);
  game.players.push(player);
  if (game.phase === "playing") {
    game.turnQueue.push(player.id);
    if (game.settings.pacing === "simultaneous") {
      player.hasEndedTurn = true;
    }
  }
  addLog(game, "join", `${player.name} joined the LAN mid-match.`);
  touch(game);
  return player;
}

export function createGame(input: {
  id: string;
  participants: EngineParticipant[];
  settings: GameSettings;
  seed?: number;
}): GameState {
  const settings = normaliseSettings(input.settings);
  const validation = validateGameSettings(settings);
  if (validation) throw new Error(validation);
  if (input.participants.length === 0) throw new Error("Cannot start a game without players.");
  const pool = cardPoolForSettings(settings);
  if (pool.length === 0) throw new Error("The selected card pool is empty.");
  const game: GameState = {
    id: input.id,
    phase: "playing",
    settings,
    round: 0,
    turn: 0,
    players: [],
    turnQueue: [],
    turnPointer: 0,
    activePlayerIds: [],
    turnDeadline: null,
    roundDeadline: null,
    log: [],
    logSeq: 0,
    winner: null,
    suddenDeath: false,
    hillHolderId: null,
    seed: input.seed ?? seedFrom(`${input.id}-${Date.now()}`),
    rngState: input.seed ?? seedFrom(`${input.id}-${Date.now()}`),
    version: 1,
    startedAt: now(),
    updatedAt: now(),
    reveals: [],
    draftPool: [],
    mulliganUsed: new Set<string>(),
  };
  input.participants.forEach((participant, index) => {
    game.players.push(createPlayer(participant, settings, teamFor(participant, index, settings), 1));
  });
  addLog(game, "system", `${settings.lobbyName} starts. Mode: ${modeLabel(settings.mode)}.`);
  if (settings.mode === "draft") {
    game.phase = "drafting";
    game.round = 0;
    game.draftPool = pool.map((card) => card.id);
    for (const player of game.players) {
      assignDraftOffers(game, player);
    }
    addLog(game, "system", `Draft phase: each player picks ${settings.draftPicks} cards.`);
    touch(game);
    return game;
  }
  for (const player of game.players) {
    buildDeckForPlayer(game, player, pool, settings.deckSize);
    starterTokens(game, player, pool);
    drawCards(game, player, settings.handSize);
  }
  game.round = 1;
  beginRound(game);
  touch(game);
  return game;
}

export function restartStats(game: GameState): void {
  for (const player of game.players) {
    player.awaitingRespawn = false;
    player.eliminated = false;
    player.respawnAtRound = null;
    player.statuses = [];
    player.hand = [];
    player.discard = [];
    player.battlefield = [];
    player.deck = [];
    player.armor = 0;
    player.score = game.settings.startingScore;
    player.hp = game.settings.startingHp;
    player.maxHp = game.settings.startingHp;
    player.credits = game.settings.startingResources;
    player.lives = game.settings.startingLives;
    player.draftPicks = 0;
    player.playedThisTurn = 0;
  }
}

export function modeLabel(mode: GameMode): string {
  const labels: Record<GameMode, string> = {
    ffa: "Free For All",
    teams: "Teams",
    coop: "Co-op vs AI",
    draft: "Draft",
    sealed: "Sealed",
    elimination: "Elimination",
    scoreAttack: "Score Attack",
    kingOfHill: "King of the Hill",
    suddenDeath: "Sudden Death",
    custom: "Custom Ruleset",
  };
  return labels[mode];
}

export function applyModePreset(input: GameSettings, mode: GameMode): GameSettings {
  const settings: GameSettings = { ...DEFAULT_SETTINGS, ...input, mode };
  if (mode === "ffa") {
    settings.pointsToWin = 30;
    settings.respawn = true;
    settings.startingLives = 2;
    settings.loseConditions = ["hp", "lives", "scoreThreshold", "roundLimit", "deckOut"];
  } else if (mode === "teams") {
    settings.pointsToWin = 35;
    settings.teamSize = Math.max(2, settings.teamSize);
    settings.friendlyFire = false;
    settings.respawn = true;
    settings.startingLives = 2;
  } else if (mode === "coop") {
    settings.pointsToWin = 40;
    settings.botCount = Math.max(2, settings.botCount);
    settings.friendlyFire = false;
    settings.respawn = true;
    settings.startingLives = 3;
  } else if (mode === "draft") {
    settings.cardPool = "all";
    settings.deckSize = Math.max(24, settings.deckSize);
    settings.draftPicks = Math.max(12, settings.draftPicks);
    settings.pointsToWin = 30;
  } else if (mode === "sealed") {
    settings.cardPool = "all";
    settings.deckSize = Math.max(30, settings.deckSize);
    settings.pointsToWin = 30;
  } else if (mode === "elimination") {
    settings.pointsToWin = 0;
    settings.scoreLimit = 0;
    settings.respawn = false;
    settings.startingLives = 1;
    settings.loseConditions = ["lives", "roundLimit"];
    settings.roundLimit = Math.max(10, settings.roundLimit);
    settings.startingHp = Math.max(15, settings.startingHp);
  } else if (mode === "scoreAttack") {
    settings.pointsToWin = 25;
    settings.scoreLimit = 30;
    settings.loseConditions = ["roundLimit", "scoreThreshold"];
    settings.startingHp = Math.max(20, settings.startingHp);
  } else if (mode === "kingOfHill") {
    settings.pointsToWin = 30;
    settings.hillBonus = Math.max(2, settings.hillBonus);
    settings.loseConditions = ["hp", "lives", "roundLimit", "scoreThreshold"];
  } else if (mode === "suddenDeath") {
    settings.suddenDeathEnabled = true;
    settings.suddenDeathRound = Math.min(settings.suddenDeathRound, 5);
    settings.pointsToWin = 20;
    settings.damageMultiplier = Math.max(1.5, settings.damageMultiplier);
  }
  return normaliseSettings(settings);
}

export function markConnection(game: GameState, playerId: string, connected: boolean): boolean {
  const player = playerById(game, playerId);
  if (!player) return false;
  if (player.connected === connected) return false;
  player.connected = connected;
  addLog(
    game,
    "join",
    `${player.name} ${connected ? "reconnected to" : "disconnected from"} the match.`,
    player.id,
  );
  touch(game);
  return true;
}

export function appendChat(game: GameState, actorId: string, name: string, text: string): void {
  addLog(game, "chat", `${name}: ${text}`, actorId);
  touch(game);
}

export function listActiveIds(game: GameState): string[] {
  return game.activePlayerIds;
}

export function getPlayer(game: GameState, playerId: string): EnginePlayer | undefined {
  return playerById(game, playerId);
}

export { validateGameSettings as validateSettings };
