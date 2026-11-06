import { useEffect, useState, type ReactNode } from "react";
import {
  Accessibility,
  BookOpen,
  Check,
  Eye,
  Gauge,
  Globe2,
  Headphones,
  Info,
  Keyboard,
  LogOut,
  MonitorSmartphone,
  RotateCcw,
  Server,
  ShieldCheck,
  Sparkles,
  Volume2,
  Wifi,
} from "lucide-react";
import type { ServerInfo } from "../../shared/types.js";
import { ALL_CARDS } from "../../shared/cards/index.js";
import { CLIENT_VERSION, PROTOCOL_VERSION } from "../../shared/types.js";
import { DEFAULT_PREFS, type UserPrefs } from "../lib/prefs.js";
import { playSound, speak } from "../lib/audio.js";
import type { ConnectionStatus } from "../net.js";
import { Modal, StatusPill } from "./ui.js";

type SettingsTab = "audio" | "accessibility" | "connection" | "about";

export function SettingsMenu({
  open,
  onClose,
  prefs,
  onChange,
  session,
  latency,
  connectionStatus,
  serverInfo,
  onOpenLibrary,
  onLeave,
}: {
  open: boolean;
  onClose: () => void;
  prefs: UserPrefs;
  onChange: (prefs: UserPrefs) => void;
  session: { selfId: string; isHost: boolean; role: "player" | "spectator"; name: string } | null;
  latency: number | null;
  connectionStatus: ConnectionStatus;
  serverInfo: ServerInfo | null;
  onOpenLibrary: () => void;
  onLeave: () => void;
}): ReactNode {
  const [tab, setTab] = useState<SettingsTab>("audio");

  useEffect(() => {
    if (open) playSound("click");
  }, [open]);

  function update<K extends keyof UserPrefs>(key: K, value: UserPrefs[K]): void {
    onChange({ ...prefs, [key]: value });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Client settings"
      subtitle="Preferences are stored on this device. The host controls the match rules."
      wide
    >
      <div className="settings-menu">
        <nav className="settings-menu__nav" aria-label="Settings sections">
          <button type="button" className={tab === "audio" ? "is-active" : ""} onClick={() => setTab("audio")}>
            <Headphones size={16} /> Audio &amp; voice
          </button>
          <button type="button" className={tab === "accessibility" ? "is-active" : ""} onClick={() => setTab("accessibility")}>
            <Accessibility size={16} /> Accessibility
          </button>
          <button type="button" className={tab === "connection" ? "is-active" : ""} onClick={() => setTab("connection")}>
            <Server size={16} /> Connection
          </button>
          <button type="button" className={tab === "about" ? "is-active" : ""} onClick={() => setTab("about")}>
            <Info size={16} /> About
          </button>
        </nav>

        <div className="settings-menu__panel">
          {tab === "audio" ? (
            <>
              <header className="settings-menu__header">
                <span className="eyebrow">SOUND DESIGN</span>
                <h3><Volume2 size={18} /> Audio &amp; voice</h3>
                <p>Table cues, card sounds and optional spoken voice lines. Audio only starts after your first click.</p>
              </header>
              <div className="settings-list">
                <TogglePreference
                  label="Sound effects"
                  hint="Turns, plays, score ticks and UI clicks."
                  checked={prefs.sound}
                  onChange={(sound) => update("sound", sound)}
                />
                <SliderPreference
                  label="Effects volume"
                  value={prefs.volume}
                  disabled={!prefs.sound}
                  onChange={(volume) => update("volume", volume)}
                  onRelease={() => playSound("select")}
                />
                <TogglePreference
                  label="Card voice lines"
                  hint="Uses the operating system speech synthesizer. Nothing leaves the device."
                  checked={prefs.voice}
                  onChange={(voice) => update("voice", voice)}
                />
                <SliderPreference
                  label="Voice volume"
                  value={prefs.voiceVolume}
                  disabled={!prefs.voice}
                  onChange={(voiceVolume) => update("voiceVolume", voiceVolume)}
                />
                <div className="settings-inline">
                  <button
                    className="button button--ghost button--small"
                    type="button"
                    onClick={() => {
                      playSound("play");
                      speak("CyberThreat Defender. This LAN is now under new management.");
                    }}
                  >
                    <Volume2 size={14} /> Test voice line
                  </button>
                  <span className="settings-hint">Speech availability depends on installed system voices.</span>
                </div>
              </div>
            </>
          ) : null}

          {tab === "accessibility" ? (
            <>
              <header className="settings-menu__header">
                <span className="eyebrow">COMFORT &amp; READABILITY</span>
                <h3><Accessibility size={18} /> Accessibility</h3>
                <p>These options apply immediately and are saved for the next session.</p>
              </header>
              <div className="settings-list">
                <TogglePreference
                  label="Reduce motion"
                  hint="Disables ambient drift, card lifts, targeting pulses and confetti animation."
                  checked={prefs.reduceMotion}
                  onChange={(reduceMotion) => update("reduceMotion", reduceMotion)}
                />
                <TogglePreference
                  label="High contrast"
                  hint="Strengthens borders, text contrast and target highlights."
                  checked={prefs.highContrast}
                  onChange={(highContrast) => update("highContrast", highContrast)}
                />
                <TogglePreference
                  label="Compact hand"
                  hint="Fits more cards in the hand tray on smaller screens."
                  checked={prefs.compactHand}
                  onChange={(compactHand) => update("compactHand", compactHand)}
                />
                <TogglePreference
                  label="Show contextual hints"
                  hint="Target prompts, play hints and onboarding copy at the table."
                  checked={prefs.showHints}
                  onChange={(showHints) => update("showHints", showHints)}
                />
                <div className="accessibility-notes">
                  <span><Keyboard size={14} /> <strong>Keyboard</strong> Tab moves focus; Enter inspects or selects; Escape cancels targeting.</span>
                  <span><Eye size={14} /> <strong>Screen readers</strong> Card names, costs, targets and the combat log are announced through live regions.</span>
                  <span><MonitorSmartphone size={14} /> <strong>Responsive</strong> The table stacks for tablets and reflows the hand into a scrollable rail.</span>
                </div>
              </div>
            </>
          ) : null}

          {tab === "connection" ? (
            <>
              <header className="settings-menu__header">
                <span className="eyebrow">NETWORK</span>
                <h3><Gauge size={18} /> Connection</h3>
                <p>Host-authoritative session details. Reconnect tokens are scoped to this server address.</p>
              </header>
              <div className="connection-cards">
                <div className="connection-card">
                  <span className="eyebrow">SESSION</span>
                  <strong>{session ? session.name : "Not connected"}</strong>
                  <span>{session ? `${session.role}${session.isHost ? " · host" : " · guest"}` : "Join or host a LAN table."}</span>
                </div>
                <div className="connection-card">
                  <span className="eyebrow">STATUS</span>
                  <StatusPill status={connectionStatus} latency={latency} />
                  <span>{latency != null ? `${latency} ms round trip` : "Latency measured after join"}</span>
                </div>
                <div className="connection-card">
                  <span className="eyebrow">HOST</span>
                  <strong>{serverInfo ? serverInfo.name : "Unknown lobby"}</strong>
                  <span>{serverInfo ? `${serverInfo.addresses[0] ?? "127.0.0.1"}:${serverInfo.port}` : window.location.host || "Local page"}</span>
                </div>
                <div className="connection-card">
                  <span className="eyebrow">PROTOCOL</span>
                  <strong className="mono">v{CLIENT_VERSION} / p{PROTOCOL_VERSION}</strong>
                  <span>{serverInfo?.noPlayerCap ? "No artificial player cap" : "Host-authoritative WebSocket"}</span>
                </div>
              </div>
              <div className="settings-list">
                <div className="connection-details">
                  <span><Wifi size={14} /> Discovery: mDNS + UDP broadcast on port 41234</span>
                  <span><ShieldCheck size={14} /> Reconnect grace is set by the host in lobby settings</span>
                  <span><Globe2 size={14} /> Direct IP join works even when discovery is blocked by a firewall</span>
                </div>
                <div className="settings-inline">
                  <button className="button button--ghost button--small" type="button" onClick={onOpenLibrary}>
                    <BookOpen size={14} /> Open card library
                  </button>
                  {session ? (
                    <button className="button button--danger button--small" type="button" onClick={onLeave}>
                      <LogOut size={14} /> Leave this table
                    </button>
                  ) : null}
                </div>
              </div>
            </>
          ) : null}

          {tab === "about" ? (
            <>
              <header className="settings-menu__header">
                <span className="eyebrow">FILES &amp; CREDITS</span>
                <h3><Sparkles size={18} /> About this build</h3>
                <p>A local-first card game. No accounts, no telemetry, no central game server.</p>
              </header>
              <div className="about-block">
                <div className="about-badges">
                  <span><ShieldCheck size={14} /> Host authoritative</span>
                  <span><Wifi size={14} /> LAN first</span>
                  <span><Check size={14} /> {ALL_CARDS.length} cards</span>
                  <span><Check size={14} /> 10 modes</span>
                </div>
                <p>
                  CyberThreat Defender: LAN FFA &amp; Teams ships the complete 148-card CyberThreat Defender archive
                  adapted for networked play, plus original crossover and brainrot expansions. Every card has
                  procedural or hand-prepared art, alt text, strategy, synergies and counterplay.
                </p>
                <p>
                  The Bonzi Buddy, Verity, Darkity and Kirkity appearances are an original fictional parody crossover.
                  No real political figure is depicted. The project is not affiliated with any rights holder. The
                  distributor of this build is responsible for clearing third-party character and trademark rights
                  before public distribution.
                </p>
                <div className="about-grid">
                  <div><span>Client</span><strong>TypeScript · React · Vite</strong></div>
                  <div><span>Host</span><strong>Express · ws · Node</strong></div>
                  <div><span>Desktop</span><strong>Electron</strong></div>
                  <div><span>Discovery</span><strong>bonjour-service · UDP</strong></div>
                  <div><span>Art</span><strong>Procedural SVG + PNG heroes</strong></div>
                  <div><span>Version</span><strong className="mono">{CLIENT_VERSION}</strong></div>
                </div>
                <div className="about-license">
                  <ShieldCheck size={15} />
                  <span>
                    See <code>README.md</code> and <code>CONTRIBUTING.md</code> for LAN setup, controls, architecture,
                    asset workflow and the licensing responsibility statement.
                  </span>
                </div>
              </div>
            </>
          ) : null}
        </div>

        <footer className="settings-menu__footer">
          <button
            className="button button--ghost button--small"
            type="button"
            onClick={() => onChange({ ...DEFAULT_PREFS })}
          >
            <RotateCcw size={14} /> Reset defaults
          </button>
          <span className="settings-hint">Preferences saved to this browser.</span>
          <button className="button button--primary button--small" type="button" onClick={onClose}>
            <Check size={14} /> Done
          </button>
        </footer>
      </div>
    </Modal>
  );
}

function TogglePreference({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}): ReactNode {
  return (
    <label className="toggle-row toggle-row--panel">
      <span>
        <strong>{label}</strong>
        <small>{hint}</small>
      </span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span className="toggle-track" aria-hidden="true"><span /></span>
    </label>
  );
}

function SliderPreference({
  label,
  value,
  disabled,
  onChange,
  onRelease,
}: {
  label: string;
  value: number;
  disabled?: boolean;
  onChange: (value: number) => void;
  onRelease?: () => void;
}): ReactNode {
  return (
    <label className={`slider-row ${disabled ? "is-disabled" : ""}`}>
      <span>{label}</span>
      <input
        type="range"
        min={0}
        max={100}
        value={Math.round(value * 100)}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value) / 100)}
        onPointerUp={onRelease}
        onKeyUp={onRelease}
      />
      <strong>{Math.round(value * 100)}%</strong>
    </label>
  );
}
