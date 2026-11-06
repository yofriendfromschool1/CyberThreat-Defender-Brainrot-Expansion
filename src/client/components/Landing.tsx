import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  ArrowRight,
  BookOpen,
  Bot,
  Copy,
  Globe2,
  LoaderCircle,
  MonitorUp,
  Radio,
  RefreshCw,
  Server,
  Settings2,
  ShieldCheck,
  Swords,
  Users,
  Wifi,
  WifiOff,
} from "lucide-react";
import type { DiscoveryLobby, ClientRole } from "../../shared/types.js";
import { ALL_CARDS } from "../../shared/cards/index.js";
import { FEATURED_CARD_IDS } from "../../shared/cards/index.js";
import { currentServerAddress } from "../net.js";
import { Brand, Spinner, StatusPill } from "./ui.js";
import type { ConnectionStatus } from "../net.js";

const NAME_KEY = "ctd.lan.name";

export function Landing({
  connectionStatus,
  latency,
  hostKeyFromUrl,
  desktopHost,
  serverInfo,
  onConnect,
  onOpenSettings,
  onOpenLibrary,
}: {
  connectionStatus: ConnectionStatus;
  latency: number | null;
  hostKeyFromUrl: string;
  desktopHost: boolean;
  serverInfo: { addresses: string[]; port: number; name: string } | null;
  onConnect: (options: { server: string; name: string; role: ClientRole; hostKey?: string }) => Promise<void>;
  onOpenSettings: () => void;
  onOpenLibrary: () => void;
}): ReactNode {
  const [tab, setTab] = useState<"join" | "host">(hostKeyFromUrl ? "host" : "join");
  const [name, setName] = useState(() => localStorage.getItem(NAME_KEY) ?? "");
  const [server, setServer] = useState(() => currentServerAddress());
  const [role, setRole] = useState<ClientRole>("player");
  const [hostKey, setHostKey] = useState(hostKeyFromUrl);
  const [discovered, setDiscovered] = useState<DiscoveryLobby[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (hostKeyFromUrl) setHostKey(hostKeyFromUrl);
  }, [hostKeyFromUrl]);

  useEffect(() => {
    void scan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const featured = useMemo(
    () => FEATURED_CARD_IDS.map((id) => ALL_CARDS.find((card) => card.id === id)).filter((card): card is (typeof ALL_CARDS)[number] => Boolean(card)).slice(0, 3),
    [],
  );

  async function scan(): Promise<void> {
    setScanning(true);
    setScanError("");
    try {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 4_000);
      const response = await fetch("/api/discover", { signal: controller.signal });
      window.clearTimeout(timeout);
      if (!response.ok) throw new Error("Discovery is not available from this page.");
      const records = (await response.json()) as DiscoveryLobby[];
      setDiscovered(Array.isArray(records) ? records : []);
    } catch {
      setScanError("Could not scan the LAN from here. Enter a host address directly.");
    } finally {
      setScanning(false);
    }
  }

  async function submit(event: FormEvent, asHost: boolean): Promise<void> {
    event.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("Give your defender a name.");
      return;
    }
    if (!server.trim()) {
      setError("Enter a host address.");
      return;
    }
    if (asHost && !hostKey.trim()) {
      setError("A host key is required to control the lobby. It is printed by the host process or embedded in the desktop launch link.");
      return;
    }
    setBusy(true);
    localStorage.setItem(NAME_KEY, name.trim());
    try {
      await onConnect({
        server,
        name: name.trim(),
        role: asHost ? "player" : role,
        hostKey: asHost ? hostKey.trim() : undefined,
      });
    } catch (connectError) {
      setError(connectError instanceof Error ? connectError.message : "Could not join that host.");
    } finally {
      setBusy(false);
    }
  }

  function joinDiscovered(record: DiscoveryLobby): void {
    setServer(`${record.host}:${record.port}`);
    setRole("player");
    setTab("join");
  }

  const shareAddress = serverInfo
    ? serverInfo.addresses.find((address) => address !== "127.0.0.1") ?? serverInfo.addresses[0]
    : null;

  return (
    <main className="landing">
      <div className="landing__glow landing__glow--one" aria-hidden="true" />
      <div className="landing__glow landing__glow--two" aria-hidden="true" />
      <header className="landing__header">
        <Brand />
        <div className="landing__header-actions">
          <StatusPill status={connectionStatus} latency={latency} />
          <button className="button button--ghost button--small" type="button" onClick={onOpenLibrary}>
            <BookOpen size={15} /> Card library
          </button>
          <button className="icon-button" type="button" onClick={onOpenSettings} aria-label="Open settings">
            <Settings2 size={18} />
          </button>
        </div>
      </header>

      <section className="landing__hero">
        <div className="landing__copy">
          <span className="eyebrow"><Radio size={13} /> HOST-AUTHORITATIVE LAN CARD COMBAT</span>
          <h1>
            Defend the <span>LAN.</span>
            <br />
            Break the <span>table.</span>
          </h1>
          <p className="landing__lede">
            A full-throttle card game for the room. Draft a network, bait the counter-hold,
            and outscore everyone on the wire. No accounts, no internet, no player cap.
          </p>
          <div className="landing__stats">
            <div><strong>{ALL_CARDS.length}</strong><span>cards with art</span></div>
            <div><strong>10</strong><span>game modes</span></div>
            <div><strong>∞</strong><span>LAN players</span></div>
            <div><strong>0</strong><span>cloud servers</span></div>
          </div>
          <div className="landing__feature-line">
            <span><Swords size={15} /> FFA, teams &amp; co-op</span>
            <span><Bot size={15} /> Four bot difficulties</span>
            <span><Wifi size={15} /> mDNS + direct IP</span>
          </div>
          <div className="landing__card-fan" aria-hidden="true">
            {featured.map((card, index) => (
              <div className={`fan-card fan-card--${index}`} key={card.id}>
                <img src={card.art} alt="" />
              </div>
            ))}
            <div className="fan-card fan-card--back">
              <img src="/art/card-back.svg" alt="" />
            </div>
          </div>
        </div>

        <div className="landing__access">
          <div className="access-panel">
            <div className="access-tabs" role="tablist" aria-label="Connection mode">
              <button
                type="button"
                role="tab"
                aria-selected={tab === "join"}
                className={tab === "join" ? "is-active" : ""}
                onClick={() => setTab("join")}
              >
                <Users size={16} /> Join a table
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === "host"}
                className={tab === "host" ? "is-active" : ""}
                onClick={() => setTab("host")}
              >
                <MonitorUp size={16} /> Host a table
              </button>
            </div>

            {tab === "join" ? (
              <form className="access-form" onSubmit={(event) => void submit(event, false)}>
                <label className="field">
                  <span>Defender name</span>
                  <input value={name} maxLength={24} onChange={(event) => setName(event.target.value)} placeholder="PacketPilot" autoComplete="nickname" />
                </label>
                <label className="field">
                  <span>Host address</span>
                  <div className="input-with-icon">
                    <Globe2 size={15} />
                    <input value={server} onChange={(event) => setServer(event.target.value)} placeholder="192.168.1.20:8787" spellCheck={false} />
                  </div>
                  <small>LAN IP, host:port, or ws:// URL. Defaults to this page's host.</small>
                </label>
                <div className="field">
                  <span>Join as</span>
                  <div className="segmented">
                    <button type="button" className={role === "player" ? "is-active" : ""} onClick={() => setRole("player")}>
                      <Swords size={14} /> Player
                    </button>
                    <button type="button" className={role === "spectator" ? "is-active" : ""} onClick={() => setRole("spectator")}>
                      <BookOpen size={14} /> Spectator
                    </button>
                  </div>
                </div>
                {error ? <p className="form-error" role="alert">{error}</p> : null}
                <button className="button button--primary button--large" type="submit" disabled={busy || connectionStatus === "connecting"}>
                  {busy ? <Spinner /> : <ArrowRight size={18} />}
                  {busy ? "Connecting…" : "Enter the LAN"}
                </button>
                {shareAddress && serverInfo ? (
                  <p className="access-panel__local">
                    <Wifi size={13} /> This host: <strong>{shareAddress}:{serverInfo.port}</strong>
                  </p>
                ) : null}
                <details className="help-details">
                  <summary>Can't find the host?</summary>
                  <p>Ask the host for the printed guest address. Both devices must be on the same LAN, and the host firewall must allow TCP port {serverInfo?.port ?? 8787}.</p>
                </details>
              </form>
            ) : (
              <form className="access-form" onSubmit={(event) => void submit(event, true)}>
                {hostKeyFromUrl ? (
                  <div className="host-banner">
                    <ShieldCheck size={18} />
                    <div>
                      <strong>{desktopHost ? "Desktop host ready" : "Host key detected"}</strong>
                      <span>{desktopHost ? "This Electron window is serving a fresh LAN lobby." : "The launch link supplied host control for this server."}</span>
                    </div>
                  </div>
                ) : null}
                <label className="field">
                  <span>Host name</span>
                  <input value={name} maxLength={24} onChange={(event) => setName(event.target.value)} placeholder="The Architect" autoComplete="nickname" />
                </label>
                <label className="field">
                  <span>Host server</span>
                  <div className="input-with-icon">
                    <Server size={15} />
                    <input value={server} onChange={(event) => setServer(event.target.value)} placeholder="127.0.0.1:8787" spellCheck={false} />
                  </div>
                  <small>Run <code>npm start</code> on the host machine, or use the desktop app.</small>
                </label>
                <label className="field">
                  <span>Host key</span>
                  <div className="input-with-icon">
                    <ShieldCheck size={15} />
                    <input value={hostKey} onChange={(event) => setHostKey(event.target.value)} placeholder="Paste the host key" spellCheck={false} autoComplete="off" />
                  </div>
                  <small>The key is shown in the host console and in the desktop launch fragment. It never goes to guests.</small>
                </label>
                {error ? <p className="form-error" role="alert">{error}</p> : null}
                <button className="button button--primary button--large" type="submit" disabled={busy || connectionStatus === "connecting"}>
                  {busy ? <Spinner /> : <MonitorUp size={18} />}
                  {busy ? "Opening lobby…" : "Open host lobby"}
                </button>
                <div className="host-tips">
                  <span><Radio size={13} /> mDNS advertised</span>
                  <span><Wifi size={13} /> UDP discovery</span>
                  <span><Users size={13} /> No player cap</span>
                </div>
              </form>
            )}
          </div>

          <section className="discovery-panel" aria-label="LAN lobby browser">
            <header>
              <div>
                <span className="eyebrow">LOBBY BROWSER</span>
                <h2>Tables on your LAN</h2>
              </div>
              <button className="icon-button" type="button" onClick={() => void scan()} disabled={scanning} aria-label="Scan the LAN again">
                {scanning ? <LoaderCircle size={17} className="spin" /> : <RefreshCw size={17} />}
              </button>
            </header>
            {scanning && discovered.length === 0 ? (
              <div className="discovery-empty"><Spinner size={20} /> Scanning mDNS and UDP beacons…</div>
            ) : discovered.length === 0 ? (
              <div className="discovery-empty">
                <WifiOff size={22} />
                <strong>No tables found yet</strong>
                <span>{scanError || "Start a host on this network, or enter an address above."}</span>
              </div>
            ) : (
              <div className="discovery-list">
                {discovered.map((record) => (
                  <button className="discovery-row" key={record.id} type="button" onClick={() => joinDiscovered(record)}>
                    <span className="discovery-row__icon"><Server size={16} /></span>
                    <span className="discovery-row__body">
                      <strong>{record.name}</strong>
                      <span>{record.hostName} · {record.host}:{record.port}</span>
                    </span>
                    <span className={`phase-chip phase-chip--${record.phase}`}>{record.phase}</span>
                    <span className="discovery-row__players"><Users size={13} /> {record.players}</span>
                    <span className="discovery-row__source">{record.source}</span>
                    <ArrowRight size={16} className="discovery-row__arrow" />
                  </button>
                ))}
              </div>
            )}
            {scanError ? <p className="discovery-note">{scanError}</p> : null}
          </section>
        </div>
      </section>

      <section className="landing__pillars">
        <article><span><Swords size={18} /></span><h3>Table politics, wired</h3><p>Tag counters, armor, score engines, targeted destruction and host-tuned win formulas.</p></article>
        <article><span><Bot size={18} /></span><h3>Bots that play back</h3><p>Fill a seat at any difficulty. Draft bots build real decks, not random piles.</p></article>
        <article><span><Wifi size={18} /></span><h3>Built for the room</h3><p>Host-authoritative state, reconnect tokens, spectators, late join and zero artificial player caps.</p></article>
        <article><span><BookOpen size={18} /></span><h3>Every card, illustrated</h3><p>148 archive cards plus crossover, frontier and brainrot expansions — all with unique art and alt text.</p></article>
      </section>

      <footer className="landing__footer">
        <span><Copy size={13} /> Share the guest URL with the room. No internet required.</span>
        <span>v1.0.0 · Host-authoritative · Original parody crossover</span>
      </footer>
    </main>
  );
}
