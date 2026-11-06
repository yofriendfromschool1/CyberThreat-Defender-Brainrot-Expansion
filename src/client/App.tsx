import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type {
  ClientMessage,
  ClientRole,
  GameView,
  LobbySnapshot,
  LogEntry,
  ServerInfo,
} from "../shared/types.js";
import { CLIENT_VERSION } from "../shared/types.js";
import { LanClient, type ConnectionStatus, type NetHandlers } from "./net.js";
import { Landing } from "./components/Landing.js";
import { Lobby } from "./components/Lobby.js";
import { GameTable } from "./components/GameTable.js";
import { SettingsMenu } from "./components/SettingsMenu.js";
import { CardLibrary } from "./components/CardLibrary.js";
import { ConfirmDialog, Toasts, type ToastItem, type ToastTone } from "./components/ui.js";
import { applyPrefsToDom, loadPrefs, savePrefs, type UserPrefs } from "./lib/prefs.js";
import { configureAudio, playSound, unlockAudio } from "./lib/audio.js";

interface Session {
  selfId: string;
  isHost: boolean;
  role: ClientRole;
  name: string;
}

interface UrlLaunch {
  hostKey: string;
  desktopHost: boolean;
}

function readLaunchFragment(): UrlLaunch {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return {
    hostKey: params.get("hostKey") ?? "",
    desktopHost: params.get("desktop") === "1",
  };
}

let toastSequence = 0;

export default function App(): ReactNode {
  const launch = useMemo(readLaunchFragment, []);
  const [session, setSession] = useState<Session | null>(null);
  const [lobby, setLobby] = useState<LobbySnapshot | null>(null);
  const [game, setGame] = useState<GameView | null>(null);
  const [chat, setChat] = useState<LogEntry[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("idle");
  const [latency, setLatency] = useState<number | null>(null);
  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);
  const [prefs, setPrefs] = useState<UserPrefs>(() => loadPrefs());
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [serverOffset, setServerOffset] = useState(0);
  const previousGame = useRef<{ version: number; selfActive: boolean; phase: string; lastLogId: string | null } | null>(null);

  const pushToast = useCallback((message: string, tone: ToastTone = "info") => {
    toastSequence += 1;
    const id = `toast-${toastSequence}-${Date.now()}`;
    setToasts((current) => [...current.slice(-4), { id, message, tone }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, tone === "error" ? 7_000 : 4_500);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const handlers = useMemo<NetHandlers>(
    () => ({
      onJoined: (message) => {
        setSession({
          selfId: message.selfId,
          isHost: message.isHost,
          role: message.role,
          name:
            message.lobby.players.find((player) => player.id === message.selfId)?.name ??
            message.lobby.spectators.find((spectator) => spectator.id === message.selfId)?.name ??
            "Player",
        });
        setLobby(message.lobby);
        setGame(message.game);
        setChat([]);
        setServerOffset(message.serverTime - Date.now());
        playSound("join");
      },
      onLobby: (nextLobby) => {
        setLobby(nextLobby);
      },
      onGame: (message) => {
        setGame(message.game);
        setServerOffset(message.game.serverNow - Date.now());
      },
      onChat: (message) => {
        setChat((current) => [...current.slice(-199), message]);
      },
      onError: (code, message) => {
        if (code === "rate-limit" || code === "internal" || code === "not-allowed" || code === "invalid-action") {
          playSound("error");
        }
        pushToast(message, "error");
      },
      onNotice: (message, tone) => {
        pushToast(message, tone === "success" ? "success" : tone === "warn" ? "warn" : "info");
        if (tone === "success") playSound("score");
      },
      onKicked: (reason) => {
        setSession(null);
        setLobby(null);
        setGame(null);
        setChat([]);
        setConnectionStatus("disconnected");
        pushToast(reason || "You were removed from the lobby.", "warn");
      },
      onLeft: () => {
        setSession(null);
        setLobby(null);
        setGame(null);
        setChat([]);
        setConnectionStatus("disconnected");
      },
      onStatus: (status) => {
        setConnectionStatus(status);
        if (status === "reconnecting") pushToast("Connection lost. Trying to reconnect…", "warn");
        if (status === "error") pushToast("The host is unreachable. Retry or rejoin with the address.", "error");
      },
      onLatency: (milliseconds) => setLatency(milliseconds),
    }),
    [pushToast],
  );

  const client = useMemo(() => new LanClient(handlers), [handlers]);

  useEffect(() => {
    savePrefs(prefs);
    applyPrefsToDom(prefs);
    configureAudio(prefs);
  }, [prefs]);

  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => window.removeEventListener("pointerdown", unlock);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/info", { signal: AbortSignal.timeout(3_500) });
        if (!response.ok) return;
        const info = (await response.json()) as ServerInfo;
        if (!cancelled) setServerInfo(info);
      } catch {
        // The page may be served statically or from a remote Vite dev server.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    document.title = lobby
      ? `${lobby.phase === "lobby" ? "Lobby" : "Match"} · ${lobby.settings.lobbyName} · CyberThreat Defender LAN`
      : "CyberThreat Defender: LAN FFA & Teams";
  }, [lobby]);

  useEffect(() => {
    if (lobby?.phase === "lobby") setGame(null);
  }, [lobby?.phase]);

  useEffect(() => {
    if (!game) {
      previousGame.current = null;
      return;
    }
    const selfActive = Boolean(
      session && game.activePlayerIds.includes(session.selfId) && game.self && !game.self.hasEndedTurn,
    );
    const lastLogId = game.log.length > 0 ? game.log[game.log.length - 1]!.id : null;
    const previous = previousGame.current;
    if (previous) {
      if (!previous.selfActive && selfActive) playSound("turn");
      if (previous.lastLogId !== lastLogId) {
        const latest = game.log[game.log.length - 1];
        if (latest?.kind === "score") playSound("score");
        if (latest?.kind === "counter") playSound("error");
      }
      if (previous.phase !== "ended" && game.phase === "ended") playSound("win");
    }
    previousGame.current = { version: game.version, selfActive, phase: game.phase, lastLogId };
  }, [game, session]);

  useEffect(() => () => client.disconnect(), [client]);

  const send = useCallback(
    (message: ClientMessage): boolean => {
      const sent = client.send(message);
      if (!sent) pushToast("Not connected to the host. Wait for the reconnect and try again.", "warn");
      return sent;
    },
    [client, pushToast],
  );

  async function connect(options: {
    server: string;
    name: string;
    role: ClientRole;
    hostKey?: string;
  }): Promise<void> {
    setChat([]);
    await client.connect(options);
  }

  function leave(): void {
    client.leave();
    setSession(null);
    setLobby(null);
    setGame(null);
    setChat([]);
    setLeaveOpen(false);
  }

  function disconnectToLanding(): void {
    client.disconnect();
    setSession(null);
    setLobby(null);
    setGame(null);
    setChat([]);
  }

  const selfPlayer = session
    ? lobby?.players.find((player) => player.id === session.selfId) ?? null
    : null;
  const selfRole: ClientRole = session?.role ?? (selfPlayer ? "player" : "spectator");

  const showReconnect =
    Boolean(session) &&
    (connectionStatus === "reconnecting" ||
      connectionStatus === "disconnected" ||
      connectionStatus === "error");

  return (
    <>
      {!session ? (
        <Landing
          connectionStatus={connectionStatus}
          latency={latency}
          hostKeyFromUrl={launch.hostKey}
          desktopHost={launch.desktopHost}
          serverInfo={serverInfo}
          onConnect={connect}
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenLibrary={() => setLibraryOpen(true)}
        />
      ) : game ? (
        <GameTable
          game={game}
          lobby={lobby}
          session={session}
          connectionStatus={connectionStatus}
          latency={latency}
          serverOffset={serverOffset}
          chat={chat}
          onSend={send}
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenLibrary={() => setLibraryOpen(true)}
          onLeave={() => setLeaveOpen(true)}
          onReturnToLobby={() => send({ type: "returnToLobby" })}
        />
      ) : lobby ? (
        <Lobby
          lobby={lobby}
          session={session}
          selfRole={selfRole}
          serverInfo={serverInfo}
          connectionStatus={connectionStatus}
          latency={latency}
          chat={chat}
          onSend={send}
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenLibrary={() => setLibraryOpen(true)}
          onLeave={() => setLeaveOpen(true)}
        />
      ) : (
        <div className="boot-screen">
          <div className="boot-screen__pulse" aria-hidden="true" />
          <strong>Syncing table state…</strong>
          <span>The host is preparing your view.</span>
        </div>
      )}

      <SettingsMenu
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        prefs={prefs}
        onChange={setPrefs}
        session={session}
        latency={latency}
        connectionStatus={connectionStatus}
        serverInfo={serverInfo}
        onOpenLibrary={() => {
          setSettingsOpen(false);
          setLibraryOpen(true);
        }}
        onLeave={() => {
          setSettingsOpen(false);
          setLeaveOpen(true);
        }}
      />

      <CardLibrary open={libraryOpen} onClose={() => setLibraryOpen(false)} mode="browse" />

      <ConfirmDialog
        open={leaveOpen}
        title="Leave this table?"
        body={
          session?.isHost
            ? "You are the host. Leaving hands control of the lobby to nobody, and guests will not be able to start a new match without your host key."
            : "You can rejoin with the same host address. A reconnect token is kept in this browser for this server."
        }
        confirmLabel="Leave table"
        danger
        onConfirm={leave}
        onClose={() => setLeaveOpen(false)}
      />

      <Toasts toasts={toasts} onDismiss={dismissToast} />

      {showReconnect ? (
        <div className="reconnect-overlay" role="alertdialog" aria-modal="true" aria-label="Connection lost">
          <div className="reconnect-panel">
            <span className="reconnect-panel__beacon" aria-hidden="true" />
            <span className="eyebrow">CONNECTION INTERRUPTED</span>
            <h2>{connectionStatus === "reconnecting" ? "Reacquiring the host…" : "The host is offline"}</h2>
            <p>
              {connectionStatus === "reconnecting"
                ? "Your seat is reserved. The table will resume as soon as the host answers."
                : "The host may have closed the match or the network dropped. Retry, or leave and rejoin with the host address."}
            </p>
            <div className="reconnect-panel__actions">
              <button className="button button--primary" type="button" onClick={() => client.retry()}>
                Retry now
              </button>
              <button className="button button--ghost" type="button" onClick={disconnectToLanding}>
                Back to landing
              </button>
            </div>
            <span className="reconnect-panel__foot mono">Protocol {CLIENT_VERSION} · seat held by reconnect token</span>
          </div>
        </div>
      ) : null}
    </>
  );
}
