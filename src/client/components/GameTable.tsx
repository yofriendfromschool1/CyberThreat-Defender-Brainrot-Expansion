import { useEffect, useMemo, useRef, useState, type DragEvent, type KeyboardEvent, type ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Bot,
  Check,
  ChevronRight,
  CircleDot,
  Clock3,
  Crosshair,
  Eye,
  Heart,
  Layers3,
  LogOut,
  MessageSquare,
  MousePointerClick,
  Play,
  ScrollText,
  Settings2,
  Shield,
  ShieldAlert,
  Skull,
  Sparkles,
  Swords,
  Target,
  TimerReset,
  Trophy,
  Users,
  Wifi,
  X,
  Zap,
} from "lucide-react";
import type {
  BattlefieldCard,
  CardDefinition,
  CardInstance,
  ClientMessage,
  ClientRole,
  GameMode,
  GameSettings,
  GameView,
  LogEntry,
  PlayerView,
  RevealedHand,
} from "../../shared/types.js";
import { getCard } from "../../shared/cards/index.js";
import { formatClock, initials, pct, teamColor, teamName } from "../lib/format.js";
import { modeLabelClient } from "../lib/format.js";
import { playSound } from "../lib/audio.js";
import type { ConnectionStatus } from "../net.js";
import { BoardAsset, CardPreviewModal, CardView } from "./CardView.js";
import { TimerBadge, useTimerTick } from "./Timer.js";
import { Brand, EmptyState, Modal, Spinner, StatusPill } from "./ui.js";
import { ChatPanel } from "./ChatPanel.js";

interface GameSession {
  selfId: string;
  isHost: boolean;
  role: ClientRole;
  name: string;
}

const TYPE_LABEL: Record<CardDefinition["type"], string> = {
  asset: "Asset",
  attack: "Attack",
  defense: "Defense",
  event: "Event",
};

const LOG_ICONS: Record<LogEntry["kind"], typeof Activity> = {
  system: Activity,
  play: Swords,
  score: Trophy,
  damage: Zap,
  counter: Shield,
  elimination: Skull,
  join: Users,
  chat: MessageSquare,
  timer: Clock3,
};

function destructiveCard(card: CardDefinition): boolean {
  return (
    card.type === "attack" ||
    card.actions.some((action) =>
      ["damage", "drain", "destroyAsset", "disableAsset", "discard", "skipTurn", "stealCredits"].includes(action.kind),
    )
  );
}

export function GameTable({
  game,
  lobby,
  session,
  connectionStatus,
  latency,
  serverOffset,
  chat,
  onSend,
  onOpenSettings,
  onOpenLibrary,
  onLeave,
  onReturnToLobby,
}: {
  game: GameView;
  lobby: import("../../shared/types.js").LobbySnapshot | null;
  session: GameSession;
  connectionStatus: ConnectionStatus;
  latency: number | null;
  serverOffset: number;
  chat: LogEntry[];
  onSend: (message: ClientMessage) => boolean;
  onOpenSettings: () => void;
  onOpenLibrary: () => void;
  onLeave: () => void;
  onReturnToLobby: () => void;
}): ReactNode {
  const [selectedIid, setSelectedIid] = useState<string | null>(null);
  const [detailCard, setDetailCard] = useState<CardDefinition | null>(null);
  const [sidebarTab, setSidebarTab] = useState<"log" | "chat" | "table">("log");
  const [aim, setAim] = useState<{ x: number; y: number; sx: number; sy: number } | null>(null);
  const [winnerDismissed, setWinnerDismissed] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const followLogRef = useRef(true);
  const self = game.self;
  const selfPublic = game.players.find((player) => player.id === session.selfId) ?? null;
  const settings = game.settings;
  const selectedCard = self?.hand.find((card) => card.iid === selectedIid) ?? null;
  const selectedDefinition = selectedCard ? getCard(selectedCard.cardId) : null;
  const selectedNeedsTarget = Boolean(selectedDefinition && selectedDefinition.target !== "none");
  const myTurn = Boolean(
    self && game.activePlayerIds.includes(self.id) && !self.hasEndedTurn && game.phase === "playing",
  );
  const activePlayers = game.players.filter((player) => game.activePlayerIds.includes(player.id));
  const opponents = self ? game.players.filter((player) => player.id !== self.id) : game.players;
  const friendlyFire = settings.friendlyFire && settings.targeting === "open";
  const playLimit =
    settings.cardsPerTurn +
    (self?.battlefield.reduce((sum, asset) => sum + (getCard(asset.cardId).passive?.playLimitBonus ?? 0), 0) ?? 0);
  const playsLeft = self ? Math.max(0, playLimit - self.playedThisTurn) : 0;
  const requiredDraftPicks = Math.min(settings.draftPicks, settings.deckSize);
  const now = useTimerTick(game.phase === "playing");

  const combinedChat = useMemo(() => {
    const entries = [...chat];
    const seen = new Set(entries.map((entry) => `${entry.text}`));
    for (const entry of game.log) {
      if (entry.kind !== "chat") continue;
      if (seen.has(entry.text)) continue;
      seen.add(entry.text);
      entries.push(entry);
    }
    return entries.sort((left, right) => left.at - right.at).slice(-200);
  }, [chat, game.log]);

  const combatLog = useMemo(() => game.log.filter((entry) => entry.kind !== "chat"), [game.log]);

  useEffect(() => {
    if (!selectedIid) {
      setAim(null);
      return;
    }
    if (!self?.hand.some((card) => card.iid === selectedIid)) {
      setSelectedIid(null);
      setAim(null);
    }
  }, [self?.hand, selectedIid]);

  useEffect(() => {
    if (!myTurn && selectedIid) setSelectedIid(null);
  }, [myTurn, selectedIid]);

  useEffect(() => {
    if (game.phase !== "ended") setWinnerDismissed(false);
  }, [game.phase]);

  useEffect(() => {
    if (!selectedDefinition || selectedDefinition.target === "none") {
      setAim(null);
      return;
    }
    const move = (event: PointerEvent) => {
      const element = document.querySelector<HTMLElement>(`[data-card-iid="${CSS.escape(selectedIid ?? "")}"]`);
      const rect = element?.getBoundingClientRect();
      setAim({
        x: event.clientX,
        y: event.clientY,
        sx: rect ? rect.left + rect.width / 2 : window.innerWidth / 2,
        sy: rect ? rect.top + 10 : window.innerHeight * 0.74,
      });
    };
    window.addEventListener("pointermove", move);
    return () => window.removeEventListener("pointermove", move);
  }, [selectedDefinition, selectedIid]);

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedIid(null);
        setAim(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const node = logRef.current;
    if (!node || sidebarTab !== "log" || !followLogRef.current) return;
    node.scrollTop = node.scrollHeight;
  }, [combatLog.length, sidebarTab]);

  function toggleCard(iid: string): void {
    if (!myTurn) {
      const card = self?.hand.find((entry) => entry.iid === iid);
      if (card) setDetailCard(getCard(card.cardId));
      return;
    }
    const card = self?.hand.find((entry) => entry.iid === iid);
    if (!card) return;
    const definition = getCard(card.cardId);
    const playable = self?.legalCardIds.includes(iid) ?? false;
    if (!playable) {
      setDetailCard(definition);
      return;
    }
    if (selectedIid === iid && definition.target === "none") {
      playCard(iid);
      return;
    }
    if (selectedIid === iid) {
      setSelectedIid(null);
      setAim(null);
      return;
    }
    playSound("select");
    setSelectedIid(iid);
  }

  function doubleClickCard(iid: string): void {
    if (!myTurn) return;
    const card = self?.hand.find((entry) => entry.iid === iid);
    if (!card || !self?.legalCardIds.includes(iid)) return;
    const definition = getCard(card.cardId);
    if (definition.target === "none") {
      playCard(iid);
      return;
    }
    if (definition.target === "enemyPlayer") {
      const enemies = game.players.filter((player) => player.id !== self.id && !player.eliminated);
      if (enemies.length === 1) {
        playCard(iid, enemies[0]!.id);
        return;
      }
    }
    setSelectedIid(iid);
  }

  function playCard(iid: string, targetPlayerId?: string, targetIid?: string): void {
    if (!onSend({ type: "playCard", iid, targetPlayerId, targetIid })) return;
    playSound("play");
    setSelectedIid(null);
    setAim(null);
  }

  function canTargetPlayer(player: PlayerView): boolean {
    if (!selectedDefinition || !self || player.eliminated) return false;
    if (selectedDefinition.target === "enemyPlayer") {
      if (player.id === self.id) return false;
      return player.teamId !== self.teamId || friendlyFire;
    }
    if (selectedDefinition.target === "anyPlayer") {
      if (destructiveCard(selectedDefinition) && player.teamId === self.teamId && !friendlyFire) return false;
      return true;
    }
    return false;
  }

  function canTargetAsset(owner: PlayerView, asset: BattlefieldCard): boolean {
    if (!selectedDefinition || !self || owner.eliminated) return false;
    if (asset.disabledUntilRound && asset.disabledUntilRound > game.round) return false;
    if (selectedDefinition.target === "ownAsset") return owner.id === self.id;
    if (selectedDefinition.target === "anyAsset") return true;
    if (selectedDefinition.target === "enemyAsset") {
      return owner.teamId !== self.teamId || friendlyFire;
    }
    return false;
  }

  function handlePlayerTarget(player: PlayerView): void {
    if (!selectedCard || !canTargetPlayer(player)) return;
    playCard(selectedCard.iid, player.id);
  }

  function handleAssetTarget(owner: PlayerView, asset: BattlefieldCard): void {
    if (!selectedCard || !canTargetAsset(owner, asset)) {
      setDetailCard(getCard(asset.cardId));
      return;
    }
    playCard(selectedCard.iid, owner.id, asset.iid);
  }

  function handleEndTurn(): void {
    if (!myTurn) return;
    onSend({ type: "endTurn" });
    setSelectedIid(null);
    setAim(null);
  }

  function handleRootDrop(event: DragEvent<HTMLDivElement>): void {
    event.preventDefault();
    if (!selectedDefinition) return;
    if (selectedDefinition.target === "none") {
      if (selectedCard) playCard(selectedCard.iid);
      return;
    }
    setAim(null);
  }

  const currentTurnLabel =
    game.phase === "drafting"
      ? "Draft in progress"
      : activePlayers.length === 0
        ? "Round resolving"
        : myTurn
          ? "Your turn"
          : `${activePlayers.map((player) => player.name).join(", ")} acting`;

  if (game.phase === "drafting") {
    return (
      <div className="game-shell game-shell--draft">
        <GameTopBar
          game={game}
          session={session}
          connectionStatus={connectionStatus}
          latency={latency}
          serverOffset={serverOffset}
          currentTurnLabel={currentTurnLabel}
          onOpenLibrary={onOpenLibrary}
          onOpenSettings={onOpenSettings}
          onOpenRules={() => setRulesOpen(true)}
          onLeave={onLeave}
        />
        <div className="draft-layout">
          <main className="draft-main">
            <DraftScreen
              game={game}
              self={self}
              requiredPicks={requiredDraftPicks}
              onPick={(cardId) => {
                if (onSend({ type: "draftPick", cardId })) playSound("play");
              }}
              onInspect={(card) => setDetailCard(card)}
            />
          </main>
          <aside className="game-sidebar draft-sidebar">
            <GameSidebar
              game={game}
              lobby={lobby}
              session={session}
              tab={sidebarTab}
              onTab={setSidebarTab}
              combatLog={combatLog}
              combinedChat={combinedChat}
              onSendChat={(text) => onSend({ type: "chat", text })}
              connected={connectionStatus === "connected"}
              onInspectCard={(cardId) => setDetailCard(getCard(cardId))}
              logRef={logRef}
              onLogScroll={() => {
                const node = logRef.current;
                if (!node) return;
                followLogRef.current = node.scrollHeight - node.scrollTop - node.clientHeight < 100;
              }}
            />
          </aside>
        </div>
        <CardPreviewModal card={detailCard} onClose={() => setDetailCard(null)} />
        <RulesModal open={rulesOpen} onClose={() => setRulesOpen(false)} settings={settings} mode={game.mode} />
      </div>
    );
  }

  const winner = game.winner;
  const winnerNames = winner
    ? winner.playerIds
        .map((id) => game.players.find((player) => player.id === id)?.name)
        .filter((name): name is string => Boolean(name))
    : [];
  const winnerTeams = winner
    ? winner.teamIds.map((id) => teamName(id, game.mode))
    : [];
  const showWinner = game.phase === "ended" && !winnerDismissed;

  return (
    <div
      className="game-shell"
      onDragOver={(event) => {
        if (!selectedDefinition) return;
        if (selectedDefinition.target === "none") event.preventDefault();
        setAim({
          x: event.clientX,
          y: event.clientY,
          sx: aim?.sx ?? window.innerWidth / 2,
          sy: aim?.sy ?? window.innerHeight * 0.7,
        });
      }}
      onDrop={handleRootDrop}
    >
      <GameTopBar
        game={game}
        session={session}
        connectionStatus={connectionStatus}
        latency={latency}
        serverOffset={serverOffset}
        currentTurnLabel={currentTurnLabel}
        onOpenLibrary={onOpenLibrary}
        onOpenSettings={onOpenSettings}
        onOpenRules={() => setRulesOpen(true)}
        onLeave={onLeave}
      />

      {game.suddenDeath ? (
        <div className="sudden-death-banner">
          <Zap size={15} /> SUDDEN DEATH ACTIVE — damage is amplified. <Zap size={15} />
        </div>
      ) : null}

      <div className="game-layout">
        <main className={`game-board ${myTurn ? "is-my-turn" : ""}`}>
          {session.role === "spectator" ? (
            <div className="spectator-banner">
              <Eye size={15} /> Spectating — the table is read-only. Use chat to call the action.
            </div>
          ) : null}

          <section className="opponents" aria-label="Opponents">
            {opponents.length === 0 ? (
              <EmptyState
                icon={<Users size={22} />}
                title="No other defenders"
                body="The table is quiet. The host can add bots or invite another player."
              />
            ) : (
              opponents.map((player) => (
                <PlayerPod
                  key={player.id}
                  player={player}
                  mode={game.mode}
                  currentRound={game.round}
                  active={game.activePlayerIds.includes(player.id)}
                  targeting={canTargetPlayer(player)}
                  targetableAsset={(asset) => canTargetAsset(player, asset)}
                  assetsTargetable={Boolean(selectedDefinition && selectedDefinition.target.endsWith("Asset"))}
                  onTargetPlayer={() => handlePlayerTarget(player)}
                  onTargetAsset={(asset) => handleAssetTarget(player, asset)}
                  onInspectCard={(cardId) => setDetailCard(getCard(cardId))}
                  revealed={self?.revealedHands.find((reveal) => reveal.playerId === player.id)}
                />
              ))
            )}
          </section>

          <section className="board-center" aria-label="Table state">
            <div className="board-center__sigil" aria-hidden="true">
              <img src="/art/key-art.png" alt="" />
            </div>
            <div className="turn-ribbon">
              <span className={`turn-ribbon__dot ${myTurn ? "is-you" : ""}`} />
              <div>
                <strong>{currentTurnLabel}</strong>
                <span>
                  {game.phase === "playing"
                    ? myTurn
                      ? `${playsLeft} play${playsLeft === 1 ? "" : "s"} left · ${self?.credits ?? 0} credits`
                      : activePlayers.length > 1
                        ? "Simultaneous turns are resolving."
                        : activePlayers[0]?.name
                          ? `Waiting on ${activePlayers[0].name}.`
                          : "Resolving the round."
                    : "The match has ended."}
                </span>
              </div>
              {myTurn ? <span className="turn-ribbon__pulse" aria-hidden="true" /> : null}
            </div>
            {game.hillHolderId ? (
              <div className="hill-badge">
                <Trophy size={14} />
                Hill held by {game.players.find((player) => player.id === game.hillHolderId)?.name ?? "unknown"}
              </div>
            ) : null}
            {settings.mode === "kingOfHill" ? (
              <span className="center-note">Round-end hill bonus +{settings.hillBonus}</span>
            ) : null}
            {selectedDefinition && selectedDefinition.target !== "none" ? (
              <div className="targeting-callout">
                <Crosshair size={16} />
                <span>
                  Choose {selectedDefinition.target === "enemyPlayer" || selectedDefinition.target === "anyPlayer" ? "a player" : "an asset"} for <strong>{selectedDefinition.name}</strong>
                </span>
                <button type="button" className="icon-button icon-button--tiny" onClick={() => setSelectedIid(null)} aria-label="Cancel targeting">
                  <X size={14} />
                </button>
              </div>
            ) : null}
            {game.phase === "playing" && !selectedDefinition && self ? (
              <span className="center-hint">
                <MousePointerClick size={13} /> Click a hand card to select a play. Drag onto a target or double-click untargeted cards.
              </span>
            ) : null}
            {game.phase === "playing" && !selectedDefinition && !self ? (
              <span className="center-hint">
                <Eye size={13} /> Spectating read-only. Use chat to call the action; seat hands stay hidden.
              </span>
            ) : null}
          </section>

          {self ? (
            <section className="self-zone" aria-label="Your network">
              <div className={`self-hero ${myTurn ? "is-active" : ""} ${canTargetPlayer(self) ? "is-targetable" : ""}`}>
                <button
                  type="button"
                  className="self-hero__identity"
                  onClick={() => {
                    if (canTargetPlayer(self)) playCard(selectedCard!.iid, self.id);
                  }}
                  disabled={!canTargetPlayer(self)}
                  aria-label={canTargetPlayer(self) ? "Target yourself with the selected card" : "Your player summary"}
                >
                  <span className="avatar avatar--self" style={{ "--team-color": teamColor(self.teamId) } as React.CSSProperties}>
                    {initials(self.name)}
                  </span>
                  <span className="self-hero__name">
                    <strong>{self.name}</strong>
                    <small>
                      {game.mode !== "ffa" ? <span style={{ color: teamColor(self.teamId) }}>{teamName(self.teamId, game.mode)}</span> : "Solo network"}
                      <span className="presence is-on"><span className="presence-dot" /> online</span>
                    </small>
                  </span>
                </button>
                <div className="self-stats">
                  <HealthBar hp={self.hp} maxHp={self.maxHp} armor={self.armor} />
                  <div className="stat-chips">
                    <span className="stat-chip stat-chip--score"><Trophy size={12} /> {self.score}<em>score</em></span>
                    <span className="stat-chip"><Sparkles size={12} /> {self.credits}<em>credits</em></span>
                    <span className="stat-chip"><Heart size={12} /> {self.lives}<em>lives</em></span>
                    <span className="stat-chip"><Layers3 size={12} /> {self.handCount}/{self.deckCount}<em>hand / deck</em></span>
                  </div>
                  {self.statuses.length > 0 ? (
                    <div className="status-row">
                      {self.statuses.map((status) => (
                        <span className="status-chip" key={status.id} title={status.label}>
                          {status.kind === "damage" ? <Zap size={11} /> : <Activity size={11} />}
                          {status.label} · {status.amount} × {status.roundsLeft}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="self-battlefield">
                  {self.battlefield.length === 0 ? (
                    <span className="battlefield-empty">No deployed assets. Build a scoring engine.</span>
                  ) : (
                    self.battlefield.map((asset) => (
                      <div
                        className={`asset-drop ${canTargetAsset(self, asset) ? "is-targetable" : ""}`}
                        key={asset.iid}
                        onDragOver={(event) => {
                          if (canTargetAsset(self, asset)) event.preventDefault();
                        }}
                        onDrop={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          if (selectedCard && canTargetAsset(self, asset)) handleAssetTarget(self, asset);
                        }}
                      >
                        <BoardAsset
                          instance={asset}
                          currentRound={game.round}
                          targetable={canTargetAsset(self, asset)}
                          onClick={() => handleAssetTarget(self, asset)}
                        />
                      </div>
                    ))
                  )}
                </div>
                <div className="self-actions">
                  <button
                    className={`button ${myTurn ? "button--primary" : "button--ghost"}`}
                    type="button"
                    onClick={handleEndTurn}
                    disabled={!myTurn}
                  >
                    <Check size={16} /> End turn
                  </button>
                  <span className="self-actions__hint">
                    {myTurn ? "Cards you cannot afford are dimmed." : "Waiting for the table."}
                  </span>
                </div>
              </div>

              <div className="hand-bar">
                <div className="hand-bar__header">
                  <div>
                    <span className="eyebrow">YOUR HAND</span>
                    <h3><Swords size={15} /> {self.handCount} card{self.handCount === 1 ? "" : "s"} · {playsLeft} play{playsLeft === 1 ? "" : "s"} left</h3>
                  </div>
                  <div className="hand-bar__meta">
                    <span><Layers3 size={13} /> deck {self.deckCount}</span>
                    <span><Skull size={13} /> discard {self.discardCount}</span>
                    <span><Sparkles size={13} /> {self.credits} credits</span>
                  </div>
                </div>
                {selectedDefinition ? (
                  <div className="selection-tray">
                    <span className={`type-badge type-badge--${selectedDefinition.type}`}>{TYPE_LABEL[selectedDefinition.type]}</span>
                    <strong>{selectedDefinition.name}</strong>
                    <span className="selection-tray__text">{selectedDefinition.text}</span>
                    {selectedDefinition.target === "none" ? (
                      <button className="button button--primary button--small" type="button" onClick={() => selectedCard && playCard(selectedCard.iid)}>
                        <Play size={14} /> Play card
                      </button>
                    ) : (
                      <span className="selection-tray__hint"><Crosshair size={13} /> Select a highlighted target</span>
                    )}
                    <button className="icon-button icon-button--tiny" type="button" onClick={() => setSelectedIid(null)} aria-label="Cancel selection">
                      <X size={14} />
                    </button>
                  </div>
                ) : null}
                <div className="hand-scroll">
                  {self.hand.length === 0 ? (
                    <EmptyState
                      icon={<Layers3 size={24} />}
                      title="Hand empty"
                      body="You draw automatically at the start of your turn, or when a card effect refreshes your hand."
                    />
                  ) : (
                    self.hand.map((card) => {
                      const definition = getCard(card.cardId);
                      const playable = myTurn && self.legalCardIds.includes(card.iid);
                      return (
                        <CardView
                          key={card.iid}
                          card={definition}
                          iid={card.iid}
                          size="hand"
                          playable={playable}
                          disabled={!playable}
                          selected={selectedIid === card.iid}
                          onClick={() => toggleCard(card.iid)}
                          onDoubleClick={() => doubleClickCard(card.iid)}
                          onInspect={() => setDetailCard(definition)}
                          draggable={playable}
                          onDragStart={() => {
                            setSelectedIid(card.iid);
                            playSound("select");
                          }}
                          onDragEnd={() => setAim(null)}
                        />
                      );
                    })
                  )}
                </div>
              </div>
            </section>
          ) : (
            <section className="spectator-table">
              <div className="spectator-table__header">
                <span className="eyebrow">SPECTATOR VIEW</span>
                <h2><Eye size={18} /> Read-only table</h2>
                <p>Seat views are hidden. Follow the combat log or open the table tab for public stats.</p>
              </div>
            </section>
          )}
        </main>

        <aside className="game-sidebar">
          <GameSidebar
            game={game}
            lobby={lobby}
            session={session}
            tab={sidebarTab}
            onTab={setSidebarTab}
            combatLog={combatLog}
            combinedChat={combinedChat}
            onSendChat={(text) => onSend({ type: "chat", text })}
            connected={connectionStatus === "connected"}
            onInspectCard={(cardId) => setDetailCard(getCard(cardId))}
            logRef={logRef}
            onLogScroll={() => {
              const node = logRef.current;
              if (!node) return;
              followLogRef.current = node.scrollHeight - node.scrollTop - node.clientHeight < 100;
            }}
          />
        </aside>
      </div>

      {aim && selectedDefinition ? (
        <svg className="targeting-overlay" aria-hidden="true">
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="8" refX="8" refY="4" orient="auto">
              <path d="M0,0 L10,4 L0,8 z" fill="currentColor" />
            </marker>
          </defs>
          <path
            d={`M ${aim.sx} ${aim.sy} C ${aim.sx} ${aim.sy + 60}, ${aim.x} ${aim.y - 60}, ${aim.x} ${aim.y}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeDasharray="7 5"
            markerEnd="url(#arrowhead)"
          />
          <circle cx={aim.x} cy={aim.y} r="7" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
      ) : null}

      {showWinner ? (
        <div className="winner-overlay" role="dialog" aria-modal="true" aria-label="Match results">
          <div className="winner-confetti" aria-hidden="true">
            {Array.from({ length: 28 }, (_, index) => <span key={index} />)}
          </div>
          <div className="winner-panel">
            <span className="eyebrow"><Trophy size={13} /> MATCH COMPLETE · ROUND {game.round}</span>
            <h2>{winnerTeams.length > 0 ? winnerTeams.join(" & ") : winnerNames.length > 0 ? winnerNames.join(" & ") : "Table complete"}</h2>
            <p>{winner?.reason ?? "The LAN match has ended."}</p>
            <div className="winner-scoreboard">
              {[...game.players]
                .sort((left, right) => right.score - left.score)
                .slice(0, 5)
                .map((player, index) => (
                  <div className={`winner-scoreboard__row ${winner?.playerIds.includes(player.id) ? "is-winner" : ""}`} key={player.id}>
                    <span className="winner-scoreboard__rank">{index + 1}</span>
                    <span className="avatar avatar--small" style={{ "--team-color": teamColor(player.teamId) } as React.CSSProperties}>
                      {player.isBot ? <Bot size={14} /> : initials(player.name)}
                    </span>
                    <span className="winner-scoreboard__name">
                      {player.name}
                      {winner?.playerIds.includes(player.id) ? <Trophy size={12} /> : null}
                    </span>
                    <span className="mono">{player.score} pts</span>
                    <span className="mono">{player.hp} HP</span>
                  </div>
                ))}
            </div>
            <div className="winner-panel__actions">
              {session.isHost ? (
                <button className="button button--primary" type="button" onClick={onReturnToLobby}>
                  <TimerReset size={16} /> Return to lobby
                </button>
              ) : null}
              <button className="button button--ghost" type="button" onClick={() => setWinnerDismissed(true)}>
                <Eye size={16} /> Review the table
              </button>
              <button className="button button--ghost" type="button" onClick={onLeave}>
                <LogOut size={16} /> Leave table
              </button>
            </div>
            <span className="winner-panel__foot mono">
              {game.players.filter((player) => !player.isBot).length} humans · {game.players.filter((player) => player.isBot).length} bots · host-authoritative result
            </span>
          </div>
        </div>
      ) : null}

      <CardPreviewModal card={detailCard} onClose={() => setDetailCard(null)} />
      <RulesModal open={rulesOpen} onClose={() => setRulesOpen(false)} settings={settings} mode={game.mode} />
      <span className="sr-only" aria-live="polite">{game.phase === "ended" ? "Match ended" : currentTurnLabel}</span>
    </div>
  );
}

function GameTopBar({
  game,
  session,
  connectionStatus,
  latency,
  serverOffset,
  currentTurnLabel,
  onOpenLibrary,
  onOpenSettings,
  onOpenRules,
  onLeave,
}: {
  game: GameView;
  session: GameSession;
  connectionStatus: ConnectionStatus;
  latency: number | null;
  serverOffset: number;
  currentTurnLabel: string;
  onOpenLibrary: () => void;
  onOpenSettings: () => void;
  onOpenRules: () => void;
  onLeave: () => void;
}): ReactNode {
  const activeCount = game.activePlayerIds.length;
  return (
    <header className="game-topbar">
      <div className="game-topbar__brand">
        <Brand compact />
        <div className="game-topbar__mode">
          <span className="eyebrow">{game.phase === "drafting" ? "DRAFTING" : game.phase === "ended" ? "MATCH COMPLETE" : "LIVE MATCH"}</span>
          <h1>{modeLabelClient(game.mode)}</h1>
          <span className="mono">{game.settings.lobbyName} · {game.settings.pacing}</span>
        </div>
      </div>
      <div className="game-topbar__center">
        <div className="round-pill">
          <span>ROUND</span>
          <strong>{game.round}</strong>
          {game.settings.roundLimit > 0 ? <em>/{game.settings.roundLimit}</em> : null}
        </div>
        <div className={`turn-pill ${activeCount > 0 ? "is-active" : ""}`}>
          <CircleDot size={14} />
          <strong>{currentTurnLabel}</strong>
          <span>{activeCount > 1 ? `${activeCount} active` : activeCount === 1 ? "1 active" : "resolving"}</span>
        </div>
        <div className="timer-group">
          <TimerBadge label="Turn" deadline={game.turnDeadline} serverOffset={serverOffset} active={game.phase === "playing"} />
          <TimerBadge label="Round" deadline={game.roundDeadline} serverOffset={serverOffset} active={game.phase === "playing"} />
        </div>
      </div>
      <div className="game-topbar__actions">
        <StatusPill status={connectionStatus} latency={latency} />
        <button className="icon-button" type="button" onClick={onOpenRules} aria-label="View match rules" title="Match rules">
          <ScrollText size={17} />
        </button>
        <button className="icon-button" type="button" onClick={onOpenLibrary} aria-label="Open card library" title="Card library">
          <BookOpen size={17} />
        </button>
        <button className="icon-button" type="button" onClick={onOpenSettings} aria-label="Open settings" title="Settings">
          <Settings2 size={17} />
        </button>
        <button className="icon-button icon-button--danger" type="button" onClick={onLeave} aria-label="Leave table" title="Leave table">
          <LogOut size={17} />
        </button>
      </div>
    </header>
  );
}

function PlayerPod({
  player,
  mode,
  currentRound,
  active,
  targeting,
  targetableAsset,
  assetsTargetable,
  onTargetPlayer,
  onTargetAsset,
  onInspectCard,
  revealed,
}: {
  player: PlayerView;
  mode: GameMode;
  currentRound: number;
  active: boolean;
  targeting: boolean;
  targetableAsset: (asset: BattlefieldCard) => boolean;
  assetsTargetable: boolean;
  onTargetPlayer: () => void;
  onTargetAsset: (asset: BattlefieldCard) => void;
  onInspectCard: (cardId: string) => void;
  revealed?: RevealedHand;
}): ReactNode {
  function keyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (!targeting) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onTargetPlayer();
    }
  }
  return (
    <div
      className={`player-pod ${active ? "is-active" : ""} ${targeting ? "is-targetable" : ""} ${player.eliminated ? "is-eliminated" : ""} ${!player.connected ? "is-disconnected" : ""}`}
      onClick={() => {
        if (targeting) onTargetPlayer();
      }}
      onKeyDown={keyDown}
      role={targeting ? "button" : undefined}
      tabIndex={targeting ? 0 : undefined}
      aria-label={`${player.name}, ${player.hp} of ${player.maxHp} HP, ${player.score} score${targeting ? ", valid target" : ""}`}
      onDragOver={(event) => {
        if (targeting) event.preventDefault();
      }}
      onDrop={(event) => {
        if (!targeting) return;
        event.preventDefault();
        event.stopPropagation();
        onTargetPlayer();
      }}
    >
      <div className="player-pod__top">
        <span className="avatar" style={{ "--team-color": teamColor(player.teamId) } as React.CSSProperties} aria-hidden="true">
          {player.isBot ? <Bot size={19} /> : initials(player.name)}
        </span>
        <div className="player-pod__identity">
          <strong>
            {player.name}
            {active ? <span className="active-tag"><CircleDot size={10} /> active</span> : null}
            {player.eliminated ? <span className="offline-tag">offline</span> : null}
          </strong>
          <small>
            <span style={{ color: teamColor(player.teamId) }}>{teamName(player.teamId, mode)}</span>
            {player.isBot ? <span className="mini-badge">BOT</span> : null}
            {!player.connected ? <span className="mini-badge mini-badge--warn">DC</span> : null}
          </small>
        </div>
        <div className="player-pod__score">
          <strong>{player.score}</strong>
          <span>pts</span>
        </div>
      </div>
      <HealthBar hp={player.hp} maxHp={player.maxHp} armor={player.armor} compact />
      <div className="player-pod__stats">
        <span><Trophy size={11} /> {player.score}</span>
        <span><Sparkles size={11} /> {player.credits}</span>
        <span><Heart size={11} /> {player.lives}</span>
        <span><Layers3 size={11} /> {player.handCount}</span>
        <span className="player-pod__deck">deck {player.deckCount}</span>
      </div>
      {player.statuses.length > 0 ? (
        <div className="status-row status-row--compact">
          {player.statuses.slice(0, 3).map((status) => (
            <span className="status-chip" key={status.id} title={status.label}>
              {status.kind === "damage" ? <Zap size={10} /> : <Activity size={10} />}
              {status.amount} × {status.roundsLeft}
            </span>
          ))}
        </div>
      ) : null}
      <div className={`player-pod__battlefield ${assetsTargetable ? "is-targeting" : ""}`}>
        {player.battlefield.length === 0 ? (
          <span className="battlefield-empty">No assets deployed</span>
        ) : (
          player.battlefield.map((asset) => (
            <div
              className={`asset-drop ${targetableAsset(asset) ? "is-targetable" : ""}`}
              key={asset.iid}
              onDragOver={(event) => {
                if (targetableAsset(asset)) event.preventDefault();
              }}
              onDrop={(event) => {
                event.preventDefault();
                event.stopPropagation();
                if (targetableAsset(asset)) onTargetAsset(asset);
              }}
            >
              <BoardAsset
                instance={asset}
                currentRound={currentRound}
                targetable={targetableAsset(asset)}
                onClick={() => {
                  if (targetableAsset(asset)) onTargetAsset(asset);
                  else onInspectCard(asset.cardId);
                }}
              />
            </div>
          ))
        )}
      </div>
      {revealed ? (
        <div className="revealed-strip">
          <span className="revealed-strip__label"><Eye size={11} /> revealed</span>
          {revealed.cards.slice(0, 5).map((card, index) => (
            <button type="button" key={`${card.id}-${index}`} onClick={(event) => { event.stopPropagation(); onInspectCard(card.id); }} title={card.name}>
              <img src={card.art} alt="" />
            </button>
          ))}
          {revealed.cards.length > 5 ? <span className="revealed-strip__more">+{revealed.cards.length - 5}</span> : null}
        </div>
      ) : null}
      {targeting ? <span className="target-badge"><Crosshair size={11} /> target</span> : null}
    </div>
  );
}

function HealthBar({ hp, maxHp, armor, compact = false }: { hp: number; maxHp: number; armor: number; compact?: boolean }): ReactNode {
  const value = pct(hp, Math.max(1, maxHp));
  const tone = value <= 25 ? "danger" : value <= 55 ? "warn" : "healthy";
  return (
    <div className={`health ${compact ? "health--compact" : ""}`}>
      <div className="health__labels">
        <span><Heart size={compact ? 11 : 13} /> HP</span>
        <strong>{hp}<em>/{maxHp}</em>{armor > 0 ? <span className="armor-tag"><Shield size={10} /> {armor}</span> : null}</strong>
      </div>
      <div className="health__track">
        <span className={`health__fill health__fill--${tone}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function DraftScreen({
  game,
  self,
  requiredPicks,
  onPick,
  onInspect,
}: {
  game: GameView;
  self: GameView["self"];
  requiredPicks: number;
  onPick: (cardId: string) => void;
  onInspect: (card: CardDefinition) => void;
}): ReactNode {
  const waiting = game.players.filter((player) => !player.isBot && player.connected);
  const offers = self?.draftOffers ?? [];
  return (
    <div className="draft-screen">
      <header className="draft-screen__header">
        <div>
          <span className="eyebrow"><Sparkles size={13} /> SEALED VAULT · ROUND 0</span>
          <h2>Draft your network</h2>
          <p>
            Pick one card from each rotating offer. Bots draft in parallel. Your picks become your deck; filler cards
            complete the deck after drafting. Every offer is drawn from the host&apos;s legal pool.
          </p>
        </div>
        <div className="draft-progress">
          <span>PICKS</span>
          <strong>{self?.draftPicks ?? 0}<em>/{requiredPicks}</em></strong>
          <div className="draft-progress__track"><span style={{ width: `${pct(self?.draftPicks ?? 0, Math.max(1, requiredPicks))}%` }} /></div>
        </div>
      </header>

      {!self ? (
        <EmptyState
          icon={<Eye size={24} />}
          title="Spectating the draft"
          body="Players are choosing their sealed decks. The match starts automatically when every seat is finished."
        />
      ) : offers.length === 0 ? (
        <div className="draft-waiting">
          <Spinner size={26} />
          <strong>Draft complete</strong>
          <span>Building the table…</span>
        </div>
      ) : (
        <>
          <div className="draft-offers">
            {offers.map((card) => (
              <div className="draft-offer" key={card.id}>
                <span className="draft-offer__label">OFFER</span>
                <CardView
                  card={card}
                  size="draft"
                  playable
                  onClick={() => onPick(card.id)}
                  onDoubleClick={() => onPick(card.id)}
                  onInspect={() => onInspect(card)}
                />
                <button className="button button--primary draft-offer__pick" type="button" onClick={() => onPick(card.id)}>
                  <Check size={15} /> Draft {card.name}
                </button>
              </div>
            ))}
          </div>
          <div className="draft-footer">
            <span><Layers3 size={14} /> Deck so far: {self.deckCount} cards</span>
            <span><Bot size={14} /> Bots drafting: {waiting.filter((player) => player.isBot).length}</span>
            <span><Clock3 size={14} /> No draft clock — take your time</span>
          </div>
        </>
      )}
    </div>
  );
}

function GameSidebar({
  game,
  lobby,
  session,
  tab,
  onTab,
  combatLog,
  combinedChat,
  onSendChat,
  connected,
  onInspectCard,
  logRef,
  onLogScroll,
}: {
  game: GameView;
  lobby: import("../../shared/types.js").LobbySnapshot | null;
  session: GameSession;
  tab: "log" | "chat" | "table";
  onTab: (tab: "log" | "chat" | "table") => void;
  combatLog: LogEntry[];
  combinedChat: LogEntry[];
  onSendChat: (text: string) => void;
  connected: boolean;
  onInspectCard: (cardId: string) => void;
  logRef: React.RefObject<HTMLDivElement | null>;
  onLogScroll: () => void;
}): ReactNode {
  return (
    <div className="sidebar-inner">
      <div className="sidebar-tabs" role="tablist" aria-label="Table intelligence">
        <button type="button" role="tab" aria-selected={tab === "log"} className={tab === "log" ? "is-active" : ""} onClick={() => onTab("log")}>
          <ScrollText size={14} /> Log
        </button>
        <button type="button" role="tab" aria-selected={tab === "chat"} className={tab === "chat" ? "is-active" : ""} onClick={() => onTab("chat")}>
          <MessageSquare size={14} /> Chat
        </button>
        <button type="button" role="tab" aria-selected={tab === "table"} className={tab === "table" ? "is-active" : ""} onClick={() => onTab("table")}>
          <Users size={14} /> Table
        </button>
      </div>

      {tab === "log" ? (
        <div className="log-panel">
          <div className="log-panel__header">
            <span className="eyebrow">COMBAT LOG</span>
            <span className="mono">{combatLog.length} events</span>
          </div>
          <div className="log-list" ref={logRef} onScroll={onLogScroll} aria-live="polite">
            {combatLog.length === 0 ? (
              <div className="log-empty"><Activity size={18} /> The wire is quiet.</div>
            ) : (
              combatLog.map((entry) => {
                const Icon = LOG_ICONS[entry.kind] ?? Activity;
                return (
                  <div className={`log-entry log-entry--${entry.kind} ${entry.actorId === session.selfId ? "is-self" : ""}`} key={entry.id}>
                    <span className="log-entry__icon"><Icon size={12} /></span>
                    <div>
                      <p>{entry.text}</p>
                      <span className="log-entry__meta">R{entry.round} · {new Date(entry.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : null}

      {tab === "chat" ? (
        <ChatPanel messages={combinedChat} onSend={onSendChat} disabled={!connected} showHeader={false} emptyHint="Call the target. Negotiate the table. Chat is visible to everyone." />
      ) : null}

      {tab === "table" ? (
        <div className="table-panel">
          <div className="log-panel__header">
            <span className="eyebrow">PUBLIC TABLE</span>
            <span className="mono">{game.players.length} seats</span>
          </div>
          <div className="table-list">
            {[...game.players]
              .sort((left, right) => right.score - left.score)
              .map((player) => (
                <div className={`table-row ${player.id === session.selfId ? "is-self" : ""} ${player.eliminated ? "is-out" : ""}`} key={player.id}>
                  <span className="avatar avatar--small" style={{ "--team-color": teamColor(player.teamId) } as React.CSSProperties}>
                    {player.isBot ? <Bot size={13} /> : initials(player.name)}
                  </span>
                  <span className="table-row__body">
                    <strong>{player.name}{player.eliminated ? <span className="offline-tag">out</span> : null}</strong>
                    <small>{teamName(player.teamId, game.mode)} · {player.handCount} hand · {player.deckCount} deck</small>
                    <span className="table-row__assets">
                      {player.battlefield.slice(0, 6).map((asset) => (
                        <button type="button" key={asset.iid} onClick={() => onInspectCard(asset.cardId)} title={getCard(asset.cardId).name}>
                          <img src={getCard(asset.cardId).art} alt="" />
                        </button>
                      ))}
                      {player.battlefield.length === 0 ? <em>no assets</em> : null}
                    </span>
                  </span>
                  <span className="table-row__numbers">
                    <strong>{player.score}</strong>
                    <small>{player.hp}/{player.maxHp} HP</small>
                  </span>
                </div>
              ))}
          </div>
          {lobby && lobby.spectators.length > 0 ? (
            <div className="table-spectators">
              <span className="eyebrow"><Eye size={12} /> SPECTATORS</span>
              <div>
                {lobby.spectators.map((spectator) => (
                  <span className="tag" key={spectator.id}>{spectator.name}</span>
                ))}
              </div>
            </div>
          ) : null}
          <div className="table-legend">
            <span><span className="presence-dot is-on" /> connected</span>
            <span><Shield size={11} /> armor shown in HP bar</span>
            <span><Bot size={11} /> bots act on host ticks</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function RulesModal({
  open,
  onClose,
  settings,
  mode,
}: {
  open: boolean;
  onClose: () => void;
  settings: GameSettings;
  mode: GameMode;
}): ReactNode {
  return (
    <Modal open={open} onClose={onClose} title="Match rules" subtitle={`${modeLabelClient(mode)} · ${settings.lobbyName}`} wide>
      <div className="rules-modal">
        <div className="rules-modal__grid">
          <RuleItem label="Points to win" value={settings.pointsToWin > 0 ? String(settings.pointsToWin) : "Custom"} />
          <RuleItem label="Score limit" value={settings.scoreLimit > 0 ? String(settings.scoreLimit) : "Off"} />
          <RuleItem label="Round limit" value={settings.roundLimit > 0 ? String(settings.roundLimit) : "Off"} />
          <RuleItem label="Pacing" value={settings.pacing} />
          <RuleItem label="Starting HP" value={String(settings.startingHp)} />
          <RuleItem label="Starting credits" value={String(settings.startingResources)} />
          <RuleItem label="Hand size" value={String(settings.handSize)} />
          <RuleItem label="Deck size" value={String(settings.deckSize)} />
          <RuleItem label="Cards per turn" value={String(settings.cardsPerTurn)} />
          <RuleItem label="Team size" value={String(settings.teamSize)} />
          <RuleItem label="Friendly fire" value={settings.friendlyFire ? "On" : "Off"} />
          <RuleItem label="Targeting" value={settings.targeting === "open" ? "Open table" : "Enemies only"} />
          <RuleItem label="Respawn" value={settings.respawn ? `${settings.respawnDelayRounds} rd` : "Off"} />
          <RuleItem label="Sudden death" value={settings.suddenDeathEnabled ? `Round ${settings.suddenDeathRound}` : "Off"} />
          <RuleItem label="Turn timer" value={settings.turnTimerSec > 0 ? `${settings.turnTimerSec}s` : "Off"} />
          <RuleItem label="Round timer" value={settings.roundTimerSec > 0 ? `${settings.roundTimerSec}s` : "Off"} />
          <RuleItem label="Hill bonus" value={String(settings.hillBonus)} />
          <RuleItem label="Draft picks" value={String(settings.draftPicks)} />
        </div>
        <section className="rules-modal__block">
          <h3><ShieldAlert size={15} /> Loss conditions</h3>
          <div className="tag-row">
            {settings.loseConditions.map((condition) => (
              <span className="tag" key={condition}>{condition}</span>
            ))}
          </div>
        </section>
        <section className="rules-modal__block">
          <h3><AlertTriangle size={15} /> Table notes</h3>
          <ul>
            <li>Assets score at the end of each round; defenses counter matching attack tags before resolving.</li>
            <li>Damage and healing are multiplied by the host&apos;s multipliers. Sudden death doubles damage again.</li>
            <li>Click a card to select it. Valid player and asset targets glow; click one to resolve the play.</li>
            <li>Drag a card onto a target or the table for the same result. Escape cancels targeting.</li>
            <li>Host-authoritative state means every client sees the same result, even after a reconnect.</li>
          </ul>
        </section>
        {settings.customWinFormula || settings.customLoseFormula ? (
          <section className="rules-modal__block">
            <h3><Zap size={15} /> Custom formulas</h3>
            {settings.customWinFormula ? <p><strong>Win:</strong> <code>{settings.customWinFormula}</code></p> : null}
            {settings.customLoseFormula ? <p><strong>Lose:</strong> <code>{settings.customLoseFormula}</code></p> : null}
          </section>
        ) : null}
        <div className="rules-modal__footer">
          <span><Wifi size={13} /> Host authoritative</span>
          <span><TimerReset size={13} /> {settings.reconnectGraceSec}s reconnect grace</span>
          <span><Eye size={13} /> Late join: {settings.lateJoin}</span>
        </div>
      </div>
    </Modal>
  );
}

function RuleItem({ label, value }: { label: string; value: string }): ReactNode {
  return (
    <div className="rule-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
