import { useMemo, useState, type ReactNode } from "react";
import {
  ArrowRight,
  BookOpen,
  Bot,
  Check,
  CheckCircle2,
  Clock3,
  Copy,
  Crown,
  Eye,
  Globe2,
  Layers3,
  Link2,
  ListChecks,
  LockKeyhole,
  Play,
  Radio,
  Settings2,
  Shield,
  ShieldCheck,
  Sparkles,
  Swords,
  Trash2,
  Trophy,
  UserMinus,
  Users,
  Wifi,
  Zap,
} from "lucide-react";
import type {
  BotDifficulty,
  ClientMessage,
  ClientRole,
  LobbyPlayer,
  LobbySnapshot,
  LogEntry,
  ServerInfo,
} from "../../shared/types.js";
import { EXPANSIONS } from "../../shared/types.js";
import { ALL_CARDS, cardPoolForSettings } from "../../shared/cards/index.js";
import { modeInfo } from "../lib/modes.js";
import { initials, teamColor, teamName } from "../lib/format.js";
import type { ConnectionStatus } from "../net.js";
import { Brand, ConfirmDialog, StatusPill } from "./ui.js";
import { HostSettings } from "./HostSettings.js";
import { ChatPanel } from "./ChatPanel.js";

export interface LobbySession {
  selfId: string;
  isHost: boolean;
  role: ClientRole;
  name: string;
}

export function Lobby({
  lobby,
  session,
  selfRole,
  serverInfo,
  connectionStatus,
  latency,
  chat,
  onSend,
  onOpenSettings,
  onOpenLibrary,
  onLeave,
}: {
  lobby: LobbySnapshot;
  session: LobbySession;
  selfRole: ClientRole;
  serverInfo: ServerInfo | null;
  connectionStatus: ConnectionStatus;
  latency: number | null;
  chat: LogEntry[];
  onSend: (message: ClientMessage) => boolean;
  onOpenSettings: () => void;
  onOpenLibrary: () => void;
  onLeave: () => void;
}): ReactNode {
  const [tab, setTab] = useState<"briefing" | "rules">(() => (session.isHost ? "rules" : "briefing"));
  const [copied, setCopied] = useState(false);
  const [kickTarget, setKickTarget] = useState<LobbyPlayer | null>(null);
  const [copiedError, setCopiedError] = useState("");
  const settings = lobby.settings;
  const info = modeInfo(settings.mode);
  const selfMember = lobby.players.find((player) => player.id === session.selfId);
  const connected = connectionStatus === "connected";
  const isHost = session.isHost;
  const bots = lobby.players.filter((player) => player.isBot);
  const humans = lobby.players.filter((player) => !player.isBot);
  const connectedHumans = humans.filter((player) => player.connected);
  const readyGuests = humans.filter((player) => !player.isHost && player.connected);
  const legalCards = useMemo(
    () =>
      cardPoolForSettings({
        enabledExpansions: settings.enabledExpansions,
        cardPool: settings.cardPool,
        enabledCards: settings.enabledCards,
        bannedCards: settings.bannedCards,
      }),
    [settings.enabledExpansions, settings.cardPool, settings.enabledCards, settings.bannedCards],
  );

  const shareAddress =
    serverInfo?.addresses.find((address) => !address.startsWith("127.") && address !== "localhost") ??
    serverInfo?.addresses[0] ??
    window.location.hostname ??
    "127.0.0.1";
  const sharePort = serverInfo?.port ?? Number(window.location.port || 8787);
  const shareUrl = serverInfo ? `http://${shareAddress}:${sharePort}` : window.location.origin;
  const seatTarget = lobby.players.length + Math.max(0, settings.botCount - bots.length);
  const allGuestsReady =
    readyGuests.length > 0 ? readyGuests.every((player) => player.ready) : true;
  const startBlockers: string[] = [];
  if (!lobby.hostConnected) startBlockers.push("The host connection is offline.");
  if (seatTarget < 2) startBlockers.push("Add another player or bot to reach two seats.");
  if (!allGuestsReady) startBlockers.push("Every connected guest must ready up.");

  async function copyInvite(): Promise<void> {
    setCopiedError("");
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2_000);
    } catch {
      setCopiedError("Clipboard access was blocked. Select the address and copy it manually.");
    }
  }

  function primaryAction(): void {
    if (!connected) return;
    if (isHost) onSend({ type: "startGame" });
    else onSend({ type: "setReady", ready: !selfMember?.ready });
  }

  const primaryLabel = isHost
    ? "Start match"
    : selfMember?.ready
      ? "Ready — waiting for host"
      : "Ready up";
  const primaryDisabled = isHost ? !lobby.canStart : !selfMember?.ready && selfRole === "spectator";

  return (
    <div className="lobby-shell">
      <header className="lobby-topbar">
        <div className="lobby-topbar__brand">
          <Brand compact />
          <div className="lobby-topbar__identity">
            <span className="eyebrow">LOBBY · {lobby.noPlayerCap ? "NO PLAYER CAP" : "CONNECTED"}</span>
            <h1>{settings.lobbyName}</h1>
            <div className="lobby-topbar__meta">
              <span className={`phase-chip phase-chip--${lobby.phase}`}>{lobby.phase}</span>
              <span><Users size={13} /> {humans.length + bots.length} seats</span>
              <span><Eye size={13} /> {lobby.spectators.length} watching</span>
              <span className="mono">{info.label}{settings.pacing !== "turnBased" ? ` · ${settings.pacing}` : ""}</span>
            </div>
          </div>
        </div>
        <div className="lobby-topbar__actions">
          <StatusPill status={connectionStatus} latency={latency} />
          <button className="button button--ghost button--small" type="button" onClick={onOpenLibrary}>
            <BookOpen size={15} /> Library
          </button>
          <button className="icon-button" type="button" onClick={onOpenSettings} aria-label="Open client settings">
            <Settings2 size={18} />
          </button>
          <button className="icon-button icon-button--danger" type="button" onClick={onLeave} aria-label="Leave lobby">
            <UserMinus size={18} />
          </button>
          <button
            className={`button ${isHost ? "button--primary" : "button--ready"} lobby-topbar__start`}
            type="button"
            disabled={primaryDisabled || !connected}
            onClick={primaryAction}
            title={isHost ? (lobby.canStart ? "Start the match" : startBlockers.join(" ")) : undefined}
          >
            {isHost ? <Play size={17} /> : selfMember?.ready ? <CheckCircle2 size={17} /> : <Check size={17} />}
            {primaryLabel}
          </button>
        </div>
      </header>

      <div className="lobby-grid">
        <aside className="lobby-side">
          <section className="invite-card">
            <header>
              <span className="eyebrow">INVITE THE ROOM</span>
              <h2><Wifi size={17} /> Guest link</h2>
            </header>
            <div className="invite-card__url">
              <code>{shareUrl}</code>
              <button className="icon-button icon-button--accent" type="button" onClick={() => void copyInvite()} aria-label="Copy guest link">
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
            {copiedError ? <p className="form-error">{copiedError}</p> : null}
            <p className="invite-card__hint">
              Same LAN required. Guests do not need the host key. If discovery fails, type this address into the join panel.
            </p>
            <div className="invite-card__foot">
              <span><Globe2 size={13} /> TCP {sharePort}</span>
              <span><Radio size={13} /> mDNS + UDP 41234</span>
            </div>
            <div className="invite-card__secure">
              <LockKeyhole size={13} />
              <span>Host key stays on this machine. Never send it to guests.</span>
            </div>
          </section>

          <section className="roster-card">
            <header>
              <div>
                <span className="eyebrow">PLAYERS</span>
                <h2><Users size={16} /> Table seats <span className="count-pill">{humans.length + bots.length}</span></h2>
              </div>
              {isHost ? (
                <button
                  className="button button--ghost button--small"
                  type="button"
                  onClick={() => onSend({ type: "addBot", difficulty: settings.botDifficulty })}
                  title="Add a bot seat"
                >
                  <Bot size={14} /> Bot
                </button>
              ) : null}
            </header>
            <div className="roster">
              {[...lobby.players]
                .sort((left, right) => {
                  if (left.isHost !== right.isHost) return left.isHost ? -1 : 1;
                  if (left.isBot !== right.isBot) return left.isBot ? 1 : -1;
                  return left.connectedAt - right.connectedAt;
                })
                .map((player) => (
                  <PlayerRow
                    key={player.id}
                    player={player}
                    mode={settings.mode}
                    isSelf={player.id === session.selfId}
                    isHost={isHost}
                    onReady={() => onSend({ type: "setReady", ready: !player.ready })}
                    onRemove={() => {
                      if (player.isBot) onSend({ type: "removeBot", playerId: player.id });
                      else setKickTarget(player);
                    }}
                  />
                ))}
            </div>
            <div className="roster__footer">
              <span><ShieldCheck size={13} /> Host-authoritative</span>
              <span><Zap size={13} /> No artificial cap</span>
            </div>
          </section>

          <section className="roster-card roster-card--spectators">
            <header>
              <div>
                <span className="eyebrow">SPECTATORS</span>
                <h2><Eye size={16} /> Watching <span className="count-pill">{lobby.spectators.length}</span></h2>
              </div>
            </header>
            {lobby.spectators.length === 0 ? (
              <p className="roster-empty">No spectators. They can join read-only while spectators are enabled.</p>
            ) : (
              <div className="spectator-list">
                {lobby.spectators.map((spectator) => (
                  <div className="spectator-row" key={spectator.id}>
                    <span className={`presence-dot ${spectator.connected ? "is-on" : ""}`} />
                    <span>{spectator.name}</span>
                    {isHost ? (
                      <button
                        className="row-action"
                        type="button"
                        onClick={() => onSend({ type: "kick", playerId: spectator.id })}
                        aria-label={`Remove spectator ${spectator.name}`}
                        title="Remove spectator"
                      >
                        <UserMinus size={13} />
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </section>
        </aside>

        <main className="lobby-main">
          <div className="lobby-tabs" role="tablist" aria-label="Lobby panels">
            <button
              type="button"
              role="tab"
              aria-selected={tab === "briefing"}
              className={tab === "briefing" ? "is-active" : ""}
              onClick={() => setTab("briefing")}
            >
              <ListChecks size={15} /> Briefing
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "rules"}
              className={tab === "rules" ? "is-active" : ""}
              onClick={() => setTab("rules")}
            >
              <Swords size={15} /> Rules {isHost ? <span className="tab-dot" title="Host editable" /> : null}
            </button>
            <div className="lobby-tabs__spacer" />
            <span className="lobby-tabs__pool"><Layers3 size={14} /> {legalCards.length} legal cards</span>
          </div>

          {tab === "briefing" ? (
            <Briefing
              lobby={lobby}
              session={session}
              selfRole={selfRole}
              info={info}
              shareUrl={shareUrl}
              legalCards={legalCards.length}
              startBlockers={startBlockers}
              allGuestsReady={allGuestsReady}
              onStart={() => onSend({ type: "startGame" })}
              onReady={() => onSend({ type: "setReady", ready: !selfMember?.ready })}
              onAddBot={(difficulty) => onSend({ type: "addBot", difficulty })}
              onOpenRules={() => setTab("rules")}
            />
          ) : isHost ? (
            <HostSettings
              settings={settings}
              onSave={(patch) => onSend({ type: "configure", settings: patch })}
              onAddBot={(difficulty: BotDifficulty) => onSend({ type: "addBot", difficulty })}
            />
          ) : (
            <RulesSummary lobby={lobby} legalCards={legalCards.length} />
          )}
        </main>

        <aside className="lobby-chat">
          <ChatPanel
            messages={chat}
            onSend={(text) => onSend({ type: "chat", text })}
            disabled={!connected}
            emptyHint="Coordinate your target calls. The host and spectators can see chat."
          />
          <section className="lobby-tip">
            <Sparkles size={15} />
            <div>
              <strong>Table note</strong>
              <p>
                Cards are played on your turn. Click a card to select it, then click a valid target, or double-click
                to play an untargeted card.
              </p>
            </div>
          </section>
        </aside>
      </div>

      <ConfirmDialog
        open={kickTarget !== null}
        title={`Remove ${kickTarget?.name ?? "player"}?`}
        body="They will be disconnected from the lobby and can rejoin with the guest address."
        confirmLabel="Remove player"
        danger
        onConfirm={() => {
          if (kickTarget) onSend({ type: "kick", playerId: kickTarget.id });
          setKickTarget(null);
        }}
        onClose={() => setKickTarget(null)}
      />
    </div>
  );
}

function PlayerRow({
  player,
  mode,
  isSelf,
  isHost,
  onReady,
  onRemove,
}: {
  player: LobbyPlayer;
  mode: LobbySnapshot["settings"]["mode"];
  isSelf: boolean;
  isHost: boolean;
  onReady: () => void;
  onRemove: () => void;
}): ReactNode {
  const canRemove = isHost && !player.isHost;
  return (
    <div className={`roster-row ${isSelf ? "is-self" : ""} ${!player.connected ? "is-offline" : ""}`}>
      <span
        className="avatar avatar--small"
        style={{ "--team-color": teamColor(player.teamId) } as React.CSSProperties}
        aria-hidden="true"
      >
        {player.isBot ? <Bot size={15} /> : initials(player.name)}
      </span>
      <span className="roster-row__body">
        <span className="roster-row__name">
          {player.name}
          {isSelf ? <em>you</em> : null}
          {player.isHost ? <Crown size={13} className="crown" aria-label="Host" /> : null}
          {player.isBot ? <span className="mini-badge">BOT</span> : null}
        </span>
        <span className="roster-row__meta">
          {mode !== "ffa" ? <span style={{ color: teamColor(player.teamId) }}>{teamName(player.teamId, mode)}</span> : null}
          <span className={player.connected ? "presence is-on" : "presence"}>
            <span className="presence-dot" /> {player.connected ? "connected" : "reconnecting"}
          </span>
        </span>
      </span>
      <span className={`ready-chip ${player.ready || player.isHost || player.isBot ? "is-ready" : ""}`}>
        {player.ready || player.isHost || player.isBot ? <Check size={12} /> : null}
        {player.isHost ? "host" : player.isBot ? "auto" : player.ready ? "ready" : "waiting"}
      </span>
      {canRemove ? (
        <button
          className="row-action row-action--danger"
          type="button"
          onClick={onRemove}
          aria-label={`${player.isBot ? "Remove bot" : "Remove player"} ${player.name}`}
          title={player.isBot ? "Remove bot" : "Remove player"}
        >
          {player.isBot ? <Trash2 size={13} /> : <UserMinus size={13} />}
        </button>
      ) : !player.isHost && !player.isBot && isSelf ? (
        <button className="row-action" type="button" onClick={onReady} aria-label="Toggle ready" title="Toggle ready">
          <CheckCircle2 size={14} />
        </button>
      ) : null}
    </div>
  );
}

function Briefing({
  lobby,
  session,
  selfRole,
  info,
  shareUrl,
  legalCards,
  startBlockers,
  allGuestsReady,
  onStart,
  onReady,
  onAddBot,
  onOpenRules,
}: {
  lobby: LobbySnapshot;
  session: LobbySession;
  selfRole: ClientRole;
  info: ReturnType<typeof modeInfo>;
  shareUrl: string;
  legalCards: number;
  startBlockers: string[];
  allGuestsReady: boolean;
  onStart: () => void;
  onReady: () => void;
  onAddBot: (difficulty: BotDifficulty) => void;
  onOpenRules: () => void;
}): ReactNode {
  const settings = lobby.settings;
  const self = lobby.players.find((player) => player.id === session.selfId);
  const ready = Boolean(self?.ready);
  const humans = lobby.players.filter((player) => !player.isBot);
  const bots = lobby.players.filter((player) => player.isBot);
  return (
    <div className="briefing">
      <section className="briefing-hero">
        <div className="briefing-hero__grid" aria-hidden="true" />
        <div className="briefing-hero__copy">
          <span className="eyebrow"><Shield size={13} /> {info.short} PROTOCOL · READY ROOM</span>
          <h2>{info.label}</h2>
          <p>{info.description}</p>
          <div className="briefing-hero__chips">
            <span><Trophy size={14} /> {settings.pointsToWin > 0 ? `${settings.pointsToWin} points to win` : "Custom win condition"}</span>
            <span><Clock3 size={14} /> {settings.roundLimit > 0 ? `${settings.roundLimit} round clock` : "No round clock"}</span>
            <span><Layers3 size={14} /> {legalCards} cards legal</span>
            <span><Users size={14} /> {settings.mode === "teams" ? `Teams of ${settings.teamSize}` : settings.mode === "coop" ? "Crew vs AI" : "Free-for-all"}</span>
          </div>
        </div>
        <div className="briefing-hero__stamp">
          <span>{settings.lobbyName}</span>
          <strong>{lobby.players.length + Math.max(0, settings.botCount - bots.length)}</strong>
          <em>seats</em>
        </div>
      </section>

      <div className="briefing-grid">
        <section className="briefing-panel">
          <header className="briefing-panel__header">
            <div>
              <span className="eyebrow">DEPLOYMENT CHECK</span>
              <h3><ListChecks size={16} /> Before the first turn</h3>
            </div>
            <span className={`phase-chip ${lobby.canStart ? "phase-chip--ready" : "phase-chip--lobby"}`}>
              {lobby.canStart ? "Ready to launch" : "Waiting"}
            </span>
          </header>
          <div className="checklist">
            <ChecklistRow done={lobby.hostConnected} title="Host online" detail={`${lobby.hostName} owns the authoritative table.`} />
            <ChecklistRow
              done={lobby.players.length + Math.max(0, settings.botCount - bots.length) >= 2}
              title="Two or more seats"
              detail={`${humans.length} human${humans.length === 1 ? "" : "s"} and ${Math.max(bots.length, settings.botCount)} bot${Math.max(bots.length, settings.botCount) === 1 ? "" : "s"} configured.`}
            />
            <ChecklistRow
              done={allGuestsReady}
              title="Guests ready"
              detail={
                humans.filter((player) => !player.isHost && player.connected).length === 0
                  ? "No connected guests are waiting."
                  : humans
                      .filter((player) => !player.isHost && player.connected)
                      .map((player) => `${player.name}${player.ready ? " ✓" : " …"}`)
                      .join("  ·  ")
              }
            />
            <ChecklistRow
              done={legalCards >= 8}
              title="Card pool legal"
              detail={`${legalCards} cards survive the expansion, allowlist and ban rules.`}
            />
          </div>
          {startBlockers.length > 0 && session.isHost ? (
            <ul className="start-blockers">
              {startBlockers.map((blocker) => <li key={blocker}>{blocker}</li>)}
            </ul>
          ) : null}
          <div className="briefing-cta">
            {session.isHost ? (
              <>
                <button className="button button--primary button--large" type="button" disabled={!lobby.canStart} onClick={onStart}>
                  <Play size={18} /> Start the match
                </button>
                <button className="button button--ghost" type="button" onClick={() => onAddBot(settings.botDifficulty)}>
                  <Bot size={16} /> Add a {settings.botDifficulty} bot
                </button>
                <button className="button button--ghost" type="button" onClick={onOpenRules}>
                  <Settings2 size={16} /> Tune the rules
                </button>
              </>
            ) : selfRole === "spectator" ? (
              <div className="spectator-callout">
                <Eye size={18} />
                <div>
                  <strong>You are spectating</strong>
                  <span>The host will start the match. You can read the table and chat.</span>
                </div>
              </div>
            ) : (
              <button className={`button button--large ${ready ? "button--ready" : "button--primary"}`} type="button" onClick={onReady}>
                {ready ? <CheckCircle2 size={18} /> : <Check size={18} />}
                {ready ? "Ready — waiting for host" : "Ready up"}
              </button>
            )}
          </div>
        </section>

        <section className="briefing-panel briefing-panel--conditions">
          <header className="briefing-panel__header">
            <div>
              <span className="eyebrow">CONDITIONS</span>
              <h3><Swords size={16} /> How this table wins</h3>
            </div>
            <button className="button button--ghost button--small" type="button" onClick={onOpenRules}>
              Full rules <ArrowRight size={14} />
            </button>
          </header>
          <div className="condition-grid">
            <Condition label="Score target" value={settings.pointsToWin > 0 ? `${settings.pointsToWin} pts` : "Custom"} />
            <Condition label="Starting HP" value={String(settings.startingHp)} />
            <Condition label="Starting credits" value={String(settings.startingResources)} />
            <Condition label="Hand / deck" value={`${settings.handSize} / ${settings.deckSize}`} />
            <Condition label="Cards per turn" value={String(settings.cardsPerTurn)} />
            <Condition label="Turn timer" value={settings.turnTimerSec > 0 ? `${settings.turnTimerSec}s` : "Off"} />
            <Condition label="Respawn" value={settings.respawn ? `${settings.respawnDelayRounds} rd delay` : "Off"} />
            <Condition label="Sudden death" value={settings.suddenDeathEnabled ? `round ${settings.suddenDeathRound}` : "Off"} />
          </div>
          <div className="lose-chips">
            <span className="eyebrow">LOSS CONDITIONS</span>
            <div>
              {settings.loseConditions.map((condition) => (
                <span className="tag" key={condition}>
                  {condition === "hp" ? "HP zero" : condition === "lives" ? "Lives" : condition === "scoreThreshold" ? "Score floor" : condition === "roundLimit" ? "Round limit" : "Deck out"}
                </span>
              ))}
            </div>
          </div>
          <div className="expansion-summary">
            {EXPANSIONS.map((expansion) => {
              const on = settings.enabledExpansions.includes(expansion.id);
              return (
                <span
                  className={`expansion-chip ${on ? "is-on" : ""}`}
                  key={expansion.id}
                  style={{ "--accent": expansion.accent } as React.CSSProperties}
                  title={`${ALL_CARDS.filter((card) => card.expansion === expansion.id).length} cards`}
                >
                  {on ? <Check size={11} /> : null}
                  {expansion.shortName}
                </span>
              );
            })}
          </div>
        </section>
      </div>

      <section className="briefing-note">
        <div className="briefing-note__icon"><Wifi size={20} /></div>
        <div>
          <strong>Share <span className="mono">{shareUrl}</span> with the room.</strong>
          <p>
            Guests join through the lobby browser or direct IP. Reconnect tokens survive refreshes, spectators are
            read-only, and late joining follows the host&apos;s rules. There is no artificial player cap.
          </p>
        </div>
        <div className="briefing-note__badges">
          <span><ShieldCheck size={13} /> Host authoritative</span>
          <span><Link2 size={13} /> Reconnect safe</span>
        </div>
      </section>
    </div>
  );
}

function ChecklistRow({ done, title, detail }: { done: boolean; title: string; detail: string }): ReactNode {
  return (
    <div className={`checklist-row ${done ? "is-done" : ""}`}>
      <span className="checklist-row__check">{done ? <Check size={14} /> : <span />}</span>
      <span>
        <strong>{title}</strong>
        <small>{detail}</small>
      </span>
    </div>
  );
}

function Condition({ label, value }: { label: string; value: string }): ReactNode {
  return (
    <div className="condition">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function RulesSummary({ lobby, legalCards }: { lobby: LobbySnapshot; legalCards: number }): ReactNode {
  const settings = lobby.settings;
  const rows: Array<{ section: string; items: Array<[string, string]> }> = [
    {
      section: "Match shape",
      items: [
        ["Mode", modeInfo(settings.mode).label],
        ["Pacing", settings.pacing],
        ["Points to win", String(settings.pointsToWin)],
        ["Score limit", settings.scoreLimit > 0 ? String(settings.scoreLimit) : "Off"],
        ["Round limit", settings.roundLimit > 0 ? String(settings.roundLimit) : "Off"],
        ["Sudden death", settings.suddenDeathEnabled ? `Round ${settings.suddenDeathRound}` : "Off"],
      ],
    },
    {
      section: "Table rules",
      items: [
        ["Starting score", String(settings.startingScore)],
        ["Starting HP", String(settings.startingHp)],
        ["Starting lives", String(settings.startingLives)],
        ["Starting credits", String(settings.startingResources)],
        ["Loss threshold", String(settings.lossThreshold)],
        ["Team size", String(settings.teamSize)],
        ["Targeting", settings.targeting === "enemies" ? "Enemies only" : "Open table"],
        ["Friendly fire", settings.friendlyFire ? "On" : "Off"],
        ["Respawn", settings.respawn ? `${settings.respawnDelayRounds} round delay` : "Off"],
        ["Hill bonus", String(settings.hillBonus)],
      ],
    },
    {
      section: "Cards & clocks",
      items: [
        ["Deck size", String(settings.deckSize)],
        ["Hand size", String(settings.handSize)],
        ["Cards per turn", String(settings.cardsPerTurn)],
        ["Draft picks", String(settings.draftPicks)],
        ["Legal pool", String(legalCards)],
        ["Banned cards", String(settings.bannedCards.length)],
        ["Turn timer", settings.turnTimerSec > 0 ? `${settings.turnTimerSec}s` : "Off"],
        ["Round timer", settings.roundTimerSec > 0 ? `${settings.roundTimerSec}s` : "Off"],
        ["Late join", settings.lateJoin],
        ["Spectators", settings.allowSpectators ? "Allowed" : "Closed"],
      ],
    },
    {
      section: "Bots",
      items: [
        ["Bot seats", String(settings.botCount)],
        ["Difficulty", settings.botDifficulty],
      ],
    },
  ];
  return (
    <div className="rules-summary">
      <header className="rules-summary__header">
        <span className="eyebrow">HOST RULESET · READ ONLY</span>
        <h2><Swords size={19} /> {modeInfo(settings.mode).label}</h2>
        <p>Only the host can change these settings. Ask them to open the Rules tab to edit any dial.</p>
      </header>
      {settings.customWinFormula || settings.customLoseFormula ? (
        <section className="rules-summary__formulas">
          <h3><Zap size={15} /> Custom formulas</h3>
          {settings.customWinFormula ? <p><strong>Win:</strong> <code>{settings.customWinFormula}</code></p> : null}
          {settings.customLoseFormula ? <p><strong>Lose:</strong> <code>{settings.customLoseFormula}</code></p> : null}
        </section>
      ) : null}
      <div className="rules-summary__grid">
        {rows.map((group) => (
          <section key={group.section}>
            <h3>{group.section}</h3>
            <dl>
              {group.items.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
      <div className="rules-summary__expansions">
        <h3>Expansions</h3>
        <div>
          {EXPANSIONS.map((expansion) => (
            <span
              key={expansion.id}
              className={`tag ${settings.enabledExpansions.includes(expansion.id) ? "tag--on" : ""}`}
              style={{ "--accent": expansion.accent } as React.CSSProperties}
            >
              {expansion.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
