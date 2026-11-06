import type { BattlefieldCard, CardDefinition, CardTarget, BotDifficulty } from "../shared/types.js";
import { GameRuleError } from "../shared/types.js";
import {
  canAct,
  draftPick,
  endTurn,
  getPlayer,
  playCard,
  botDraftPick,
  type GameState,
} from "../shared/engine.js";
import { getCard } from "../shared/cards/index.js";

interface BotMove {
  iid: string;
  targetPlayerId?: string;
  targetIid?: string;
  score: number;
}

function randomOf<T>(values: readonly T[], fallback: T): T {
  return values[Math.floor(Math.random() * values.length)] ?? fallback;
}

function opponents(game: GameState, playerId: string) {
  const bot = getPlayer(game, playerId);
  if (!bot) return [];
  return game.players.filter(
    (candidate) =>
      candidate.id !== bot.id && candidate.teamId !== bot.teamId && !candidate.eliminated,
  );
}

function ownAssets(game: GameState, playerId: string): BattlefieldCard[] {
  return getPlayer(game, playerId)?.battlefield ?? [];
}

function enemyAssets(game: GameState, playerId: string): Array<{ ownerId: string; card: BattlefieldCard }> {
  const bot = getPlayer(game, playerId);
  if (!bot) return [];
  return game.players
    .filter((candidate) => candidate.teamId !== bot.teamId && !candidate.eliminated)
    .flatMap((candidate) => candidate.battlefield.map((card) => ({ ownerId: candidate.id, card })));
}

function targetPlan(
  game: GameState,
  playerId: string,
  target: CardTarget,
  difficulty: BotDifficulty,
): { targetPlayerId?: string; targetIid?: string } | null {
  const bot = getPlayer(game, playerId);
  if (!bot) return null;
  const enemies = opponents(game, playerId).sort((left, right) => {
    if (difficulty === "easy") return Math.random() - 0.5;
    const leftLethal = left.hp <= 4 ? 1 : 0;
    const rightLethal = right.hp <= 4 ? 1 : 0;
    if (leftLethal !== rightLethal) return rightLethal - leftLethal;
    return right.score - left.score || left.hp - right.hp;
  });
  const assets = enemyAssets(game, playerId);
  const choosePlayer = () => {
    if (enemies.length === 0) return null;
    const chosen =
      difficulty === "easy" ? randomOf(enemies, enemies[0]!) : enemies[0]!;
    return { targetPlayerId: chosen.id };
  };
  switch (target) {
    case "none":
      return {};
    case "enemyPlayer":
      return choosePlayer();
    case "anyPlayer": {
      const chosen = choosePlayer();
      if (chosen) return chosen;
      return { targetPlayerId: bot.id };
    }
    case "enemyAsset": {
      if (assets.length === 0) return null;
      const sorted = [...assets].sort((left, right) => {
        const leftValue = (getCard(left.card.cardId).passive?.pointsPerRound ?? 0) * 3 +
          (getCard(left.card.cardId).passive?.creditsPerTurn ?? 0);
        const rightValue = (getCard(right.card.cardId).passive?.pointsPerRound ?? 0) * 3 +
          (getCard(right.card.cardId).passive?.creditsPerTurn ?? 0);
        return rightValue - leftValue;
      });
      const chosen = difficulty === "easy" ? randomOf(sorted, sorted[0]!) : sorted[0]!;
      return { targetPlayerId: chosen.ownerId, targetIid: chosen.card.iid };
    }
    case "ownAsset": {
      const assets = ownAssets(game, playerId);
      if (assets.length === 0) return null;
      const chosen = assets[0]!;
      return { targetPlayerId: bot.id, targetIid: chosen.iid };
    }
    case "anyAsset": {
      const pool = [...assets.map((entry) => ({ ownerId: entry.ownerId, card: entry.card })), ...ownAssets(game, playerId).map((card) => ({ ownerId: bot.id, card }))];
      if (pool.length === 0) return null;
      const chosen = difficulty === "easy" ? randomOf(pool, pool[0]!) : pool[0]!;
      return { targetPlayerId: chosen.ownerId, targetIid: chosen.card.iid };
    }
    default:
      return {};
  }
}

function cardValue(
  game: GameState,
  playerId: string,
  card: CardDefinition,
  difficulty: BotDifficulty,
): number {
  const bot = getPlayer(game, playerId);
  if (!bot) return 0;
  if (difficulty === "easy") return Math.random() * 10;
  const enemies = opponents(game, playerId);
  const minimumHp = enemies.reduce((lowest, enemy) => Math.min(lowest, enemy.hp), Number.POSITIVE_INFINITY);
  let value = 3;
  if (card.type === "asset") {
    value += 5 + (card.passive?.pointsPerRound ?? 0) * 3 + (card.passive?.creditsPerTurn ?? 0) * 1.4;
  }
  if (card.type === "defense") {
    value += bot.battlefield.length < 2 ? 4 : 1;
    value += card.defense?.uses ?? 0;
  }
  if (card.type === "attack") {
    value += 2;
    for (const action of card.actions) {
      if (action.kind === "damage" && action.amount >= minimumHp && minimumHp > 0) value += 40;
      if (action.kind === "drain" || action.kind === "score") value += action.amount * 0.5;
      if (action.kind === "destroyAsset") value += 5;
    }
  }
  if (card.type === "event") {
    const isEconomy = card.actions.some((action) => ["draw", "credits", "score", "heal", "shield"].includes(action.kind));
    value += isEconomy ? 2 : 0.5;
  }
  if (difficulty === "nightmare") {
    if (card.keywords.includes("unblockable")) value += 3;
    if (card.keywords.includes("draw")) value += 1;
    if (bot.hp <= 8 && card.type === "defense") value += 4;
  }
  value += (6 - Math.min(6, card.cost)) * 0.2;
  return value;
}

/**
 * Performs at most one bot action. Returns true when it changed the game.
 * Server ticks call this repeatedly, giving the table a readable cadence.
 */
export function takeBotAction(
  game: GameState,
  playerId: string,
  difficulty: BotDifficulty,
): boolean {
  if (game.phase !== "playing" || !canAct(game, playerId)) return false;
  const player = getPlayer(game, playerId);
  if (!player) return false;
  const limit =
    game.settings.cardsPerTurn +
    player.battlefield.reduce(
      (bonus, instance) => bonus + (getCard(instance.cardId).passive?.playLimitBonus ?? 0),
      0,
    );
  if (player.playedThisTurn >= limit || player.hand.length === 0) {
    endTurn(game, playerId);
    return true;
  }

  const moves: BotMove[] = [];
  for (const instance of player.hand) {
    const card = getCard(instance.cardId);
    if (card.cost > player.credits) continue;
    const plan = targetPlan(game, playerId, card.target, difficulty);
    if (plan === null) continue;
    moves.push({
      iid: instance.iid,
      ...plan,
      score: cardValue(game, playerId, card, difficulty),
    });
  }
  moves.sort((left, right) => right.score - left.score);

  const attempts = difficulty === "easy" ? [randomOf(moves, moves[0]!)] : moves;
  for (const move of attempts) {
    if (!move) continue;
    try {
      playCard(game, playerId, {
        iid: move.iid,
        targetPlayerId: move.targetPlayerId,
        targetIid: move.targetIid,
      });
      return true;
    } catch (error) {
      if (!(error instanceof GameRuleError)) throw error;
    }
  }

  endTurn(game, playerId);
  return true;
}

export function takeBotDraftPick(game: GameState, playerId: string): boolean {
  if (game.phase !== "drafting") return false;
  const cardId = botDraftPick(game, playerId);
  if (!cardId) return false;
  draftPick(game, playerId, cardId);
  return true;
}
