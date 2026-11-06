import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Ban,
  Bot,
  Check,
  ChevronDown,
  CircleHelp,
  Dices,
  Layers3,
  RotateCcw,
  Save,
  ShieldAlert,
  Sparkles,
  Timer,
  Users,
  Wand2,
} from "lucide-react";
import {
  DEFAULT_SETTINGS,
  EXPANSIONS,
  type BotDifficulty,
  type GameMode,
  type GameSettings,
  type LoseCondition,
  type Pacing,
  type LateJoinMode,
  type TargetingRule,
} from "../../shared/types.js";
import { ALL_CARDS, cardPoolForSettings } from "../../shared/cards/index.js";
import { LOSE_CONDITION_LABELS, MODE_INFO, applyModePreset, modeInfo } from "../lib/modes.js";
import { CardLibrary, type LibraryMode } from "./CardLibrary.js";

function NumberField({
  label,
  hint,
  value,
  min,
  max,
  step = 1,
  suffix,
  onChange,
}: {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (value: number) => void;
}): ReactNode {
  return (
    <label className="setting-field">
      <span>{label}</span>
      <div className="number-input">
        <input
          type="number"
          value={Number.isFinite(value) ? value : 0}
          min={min}
          max={max}
          step={step}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        {suffix ? <em>{suffix}</em> : null}
      </div>
      {hint ? <small>{hint}</small> : null}
    </label>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}): ReactNode {
  return (
    <label className="toggle-row">
      <span>
        <strong>{label}</strong>
        {hint ? <small>{hint}</small> : null}
      </span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span className="toggle-track" aria-hidden="true"><span /></span>
    </label>
  );
}

function SelectField<T extends string>({
  label,
  hint,
  value,
  options,
  onChange,
}: {
  label: string;
  hint?: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}): ReactNode {
  return (
    <label className="setting-field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value as T)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      {hint ? <small>{hint}</small> : null}
    </label>
  );
}

export function HostSettings({
  settings,
  onSave,
  onAddBot,
}: {
  settings: GameSettings;
  onSave: (patch: GameSettings) => boolean;
  onAddBot: (difficulty: BotDifficulty) => void;
}): ReactNode {
  const [draft, setDraft] = useState<GameSettings>(settings);
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const [library, setLibrary] = useState<LibraryMode | null>(null);
  const settingsKey = JSON.stringify(settings);
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;

  useEffect(() => {
    if (dirtyRef.current) return;
    setDraft(settings);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsKey]);

  useEffect(() => {
    if (!saved) return;
    const timer = window.setTimeout(() => setSaved(false), 2_500);
    return () => window.clearTimeout(timer);
  }, [saved]);

  const update = (patch: Partial<GameSettings>): void => {
    setDraft((current) => ({ ...current, ...patch }));
    setDirty(true);
    setSaved(false);
  };

  const info = modeInfo(draft.mode);
  const legalCount = useMemo(
    () =>
      cardPoolForSettings({
        enabledExpansions: draft.enabledExpansions,
        cardPool: draft.cardPool,
        enabledCards: draft.enabledCards,
        bannedCards: draft.bannedCards,
      }).length,
    [draft.enabledExpansions, draft.cardPool, draft.enabledCards, draft.bannedCards],
  );

  const toggleArray = (key: "loseConditions" | "enabledExpansions", value: string): void => {
    const values = draft[key] as string[];
    const next = values.includes(value) ? values.filter((entry) => entry !== value) : [...values, value];
    update({ [key]: next } as Partial<GameSettings>);
  };

  const toggleCard = (id: string): void => {
    setDraft((current) => {
      const key = library === "allow" ? "enabledCards" : "bannedCards";
      const values = current[key];
      const next = values.includes(id) ? values.filter((entry) => entry !== id) : [...values, id];
      return { ...current, [key]: next };
    });
    setDirty(true);
    setSaved(false);
  };

  return (
    <div className="host-settings">
      <div className="host-settings__top">
        <div>
          <span className="eyebrow">HOST CONTROL</span>
          <h2>Rules of engagement</h2>
          <p>{info.description}</p>
        </div>
        <span className="pool-count"><Layers3 size={14} /> {legalCount} legal cards</span>
      </div>

      <div className="host-settings__scroller">
        <details className="settings-section" open>
          <summary><span><Dices size={16} /> Match shape</span><ChevronDown size={16} /></summary>
          <div className="settings-section__body">
            <div className="settings-row settings-row--wide">
              <SelectField
                label="Game mode"
                hint="Presets load a starting point; every value below remains editable."
                value={draft.mode}
                options={MODE_INFO.map((entry) => ({ value: entry.id, label: entry.label }))}
                onChange={(mode) => update({ mode })}
              />
              <button className="button button--ghost button--small" type="button" onClick={() => update(applyModePreset(draft, draft.mode))}>
                <Wand2 size={14} /> Load {info.short} preset
              </button>
            </div>
            <div className="settings-row">
              <SelectField
                label="Pacing"
                value={draft.pacing}
                options={[
                  { value: "turnBased", label: "Turn based" },
                  { value: "simultaneous", label: "Simultaneous" },
                  { value: "hybrid", label: "Hybrid" },
                ]}
                onChange={(pacing: Pacing) => update({ pacing })}
              />
              <NumberField label="Points to win" value={draft.pointsToWin} min={0} max={999} suffix="pts" onChange={(pointsToWin) => update({ pointsToWin })} />
              <NumberField label="Score limit" hint="0 disables this clock." value={draft.scoreLimit} min={0} max={999} onChange={(scoreLimit) => update({ scoreLimit })} />
              <NumberField label="Round limit" hint="0 disables this clock." value={draft.roundLimit} min={0} max={999} onChange={(roundLimit) => update({ roundLimit })} />
            </div>
            <div className="settings-row">
              <NumberField label="Starting score" value={draft.startingScore} min={-100} max={500} onChange={(startingScore) => update({ startingScore })} />
              <NumberField label="Starting credits" value={draft.startingResources} min={0} max={30} onChange={(startingResources) => update({ startingResources })} />
              <NumberField label="Starting HP" value={draft.startingHp} min={1} max={999} onChange={(startingHp) => update({ startingHp })} />
              <NumberField label="Starting lives" value={draft.startingLives} min={1} max={20} onChange={(startingLives) => update({ startingLives })} />
            </div>
            <div className="settings-row">
              <NumberField label="Loss threshold" hint="Score floor when that loss condition is on." value={draft.lossThreshold} min={-999} max={0} onChange={(lossThreshold) => update({ lossThreshold })} />
              <NumberField label="Hill bonus" value={draft.hillBonus} min={0} max={50} onChange={(hillBonus) => update({ hillBonus })} />
              <NumberField label="Draft picks" value={draft.draftPicks} min={1} max={60} onChange={(draftPicks) => update({ draftPicks })} />
            </div>
            <div className="settings-block">
              <div className="settings-block__title"><ShieldAlert size={15} /> Lose conditions</div>
              <div className="checkbox-grid">
                {LOSE_CONDITION_LABELS.map((condition) => (
                  <label className="check-row" key={condition.id}>
                    <input
                      type="checkbox"
                      checked={draft.loseConditions.includes(condition.id as LoseCondition)}
                      onChange={() => toggleArray("loseConditions", condition.id)}
                    />
                    <span><strong>{condition.label}</strong><small>{condition.hint}</small></span>
                  </label>
                ))}
              </div>
            </div>
            <div className="settings-row">
              <Toggle label="Sudden death" hint="Damage doubles from the chosen round." checked={draft.suddenDeathEnabled} onChange={(suddenDeathEnabled) => update({ suddenDeathEnabled })} />
              <NumberField label="Sudden death round" value={draft.suddenDeathRound} min={1} max={999} onChange={(suddenDeathRound) => update({ suddenDeathRound })} />
            </div>
          </div>
        </details>

        <details className="settings-section" open>
          <summary><span><Layers3 size={16} /> Cards &amp; deck</span><ChevronDown size={16} /></summary>
          <div className="settings-section__body">
            <div className="settings-row">
              <NumberField label="Deck size" value={draft.deckSize} min={8} max={200} onChange={(deckSize) => update({ deckSize })} />
              <NumberField label="Hand size" value={draft.handSize} min={1} max={20} onChange={(handSize) => update({ handSize })} />
              <NumberField label="Cards per turn" value={draft.cardsPerTurn} min={1} max={20} onChange={(cardsPerTurn) => update({ cardsPerTurn })} />
              <SelectField
                label="Card pool"
                value={draft.cardPool}
                options={[
                  { value: "all", label: "All enabled cards" },
                  { value: "starter", label: "Starter pool" },
                  { value: "custom", label: "Custom allowlist" },
                ]}
                onChange={(cardPool) => update({ cardPool })}
              />
            </div>
            <div className="settings-block">
              <div className="settings-block__title"><Sparkles size={15} /> Enabled expansions</div>
              <div className="expansion-picks">
                {EXPANSIONS.map((expansion) => {
                  const selected = draft.enabledExpansions.includes(expansion.id);
                  return (
                    <button
                      key={expansion.id}
                      type="button"
                      className={`expansion-pick ${selected ? "is-on" : ""}`}
                      style={{ "--accent": expansion.accent } as React.CSSProperties}
                      onClick={() => toggleArray("enabledExpansions", expansion.id)}
                    >
                      <span className="expansion-pick__check">{selected ? <Check size={13} /> : null}</span>
                      <span><strong>{expansion.shortName}</strong><small>{ALL_CARDS.filter((card) => card.expansion === expansion.id).length} cards</small></span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="settings-row settings-row--actions">
              <button className="button button--ghost" type="button" onClick={() => setLibrary("allow")}>
                <Sparkles size={15} /> Custom allowlist <span className="count-pill">{draft.enabledCards.length}</span>
              </button>
              <button className="button button--ghost" type="button" onClick={() => setLibrary("ban")}>
                <Ban size={15} /> Banned cards <span className="count-pill">{draft.bannedCards.length}</span>
              </button>
              <p className="settings-note">Banning always wins. An empty custom allowlist means every enabled card is legal.</p>
            </div>
          </div>
        </details>

        <details className="settings-section" open>
          <summary><span><Users size={16} /> Teams &amp; table</span><ChevronDown size={16} /></summary>
          <div className="settings-section__body">
            <div className="settings-row">
              <NumberField label="Team size" value={draft.teamSize} min={1} max={64} onChange={(teamSize) => update({ teamSize })} />
              <SelectField
                label="Targeting"
                value={draft.targeting}
                options={[
                  { value: "enemies", label: "Enemies only" },
                  { value: "open", label: "Open table" },
                ]}
                onChange={(targeting: TargetingRule) => update({ targeting })}
              />
              <NumberField label="Damage multiplier" value={draft.damageMultiplier} min={0} max={10} step={0.1} suffix="×" onChange={(damageMultiplier) => update({ damageMultiplier })} />
              <NumberField label="Healing multiplier" value={draft.healingMultiplier} min={0} max={10} step={0.1} suffix="×" onChange={(healingMultiplier) => update({ healingMultiplier })} />
            </div>
            <div className="settings-row">
              <Toggle label="Friendly fire" hint="Allows destructive cards to target allies when targeting is open." checked={draft.friendlyFire} onChange={(friendlyFire) => update({ friendlyFire })} />
              <Toggle label="Respawn" hint="Knocked-out defenders return after a delay." checked={draft.respawn} onChange={(respawn) => update({ respawn })} />
              <NumberField label="Respawn delay" value={draft.respawnDelayRounds} min={0} max={20} suffix="rd" onChange={(respawnDelayRounds) => update({ respawnDelayRounds })} />
            </div>
          </div>
        </details>

        <details className="settings-section" open>
          <summary><span><Timer size={16} /> Clocks &amp; access</span><ChevronDown size={16} /></summary>
          <div className="settings-section__body">
            <div className="settings-row">
              <NumberField label="Turn timer" hint="0 turns the timer off." value={draft.turnTimerSec} min={0} max={3600} suffix="sec" onChange={(turnTimerSec) => update({ turnTimerSec })} />
              <NumberField label="Round timer" value={draft.roundTimerSec} min={0} max={7200} suffix="sec" onChange={(roundTimerSec) => update({ roundTimerSec })} />
              <NumberField label="Reconnect grace" value={draft.reconnectGraceSec} min={0} max={3600} suffix="sec" onChange={(reconnectGraceSec) => update({ reconnectGraceSec })} />
              <SelectField
                label="Late join"
                value={draft.lateJoin}
                options={[
                  { value: "off", label: "Closed after start" },
                  { value: "spectators", label: "Spectators only" },
                  { value: "players", label: "Players may join" },
                ]}
                onChange={(lateJoin: LateJoinMode) => update({ lateJoin })}
              />
            </div>
            <div className="settings-row">
              <Toggle label="Allow spectators" checked={draft.allowSpectators} onChange={(allowSpectators) => update({ allowSpectators })} />
            </div>
          </div>
        </details>

        <details className="settings-section" open>
          <summary><span><Bot size={16} /> Bots</span><ChevronDown size={16} /></summary>
          <div className="settings-section__body">
            <div className="settings-row">
              <NumberField label="Bot target" value={draft.botCount} min={0} max={128} hint="Filled automatically when the match starts." onChange={(botCount) => update({ botCount })} />
              <SelectField
                label="Bot difficulty"
                value={draft.botDifficulty}
                options={[
                  { value: "easy", label: "Easy" },
                  { value: "normal", label: "Normal" },
                  { value: "hard", label: "Hard" },
                  { value: "nightmare", label: "Nightmare" },
                ]}
                onChange={(botDifficulty: BotDifficulty) => update({ botDifficulty })}
              />
              <button className="button button--ghost control-button" type="button" onClick={() => onAddBot(draft.botDifficulty)}>
                <Bot size={15} /> Add one now
              </button>
            </div>
          </div>
        </details>

        <details className="settings-section">
          <summary><span><CircleHelp size={16} /> Custom win &amp; loss formulas</span><ChevronDown size={16} /></summary>
          <div className="settings-section__body">
            <p className="settings-note">
              Variables: <code>score hp round lives assets hand deck credits eliminated pointsToWin opponents</code>.
              Operators: <code>+ - * / % &lt; &lt;= &gt; &gt;= == != &amp;&amp; || !</code>. Functions: <code>min max abs floor ceil</code>.
            </p>
            <label className="setting-field">
              <span>Custom win formula</span>
              <textarea
                value={draft.customWinFormula}
                onChange={(event) => update({ customWinFormula: event.target.value })}
                placeholder="score >= pointsToWin && opponents == 0"
                spellCheck={false}
                rows={3}
              />
              <small>Checked at round end. Players satisfying it win immediately.</small>
            </label>
            <label className="setting-field">
              <span>Custom loss formula</span>
              <textarea
                value={draft.customLoseFormula}
                onChange={(event) => update({ customLoseFormula: event.target.value })}
                placeholder="hp <= 0 && credits == 0"
                spellCheck={false}
                rows={3}
              />
              <small>Checked before standard win conditions. Eliminates the players it matches.</small>
            </label>
          </div>
        </details>
      </div>

      <div className={`settings-save-bar ${dirty ? "is-dirty" : ""}`}>
        <span>
          {saved ? <><Check size={15} /> Settings applied</> : dirty ? <>Unsaved changes</> : <>All changes applied</>}
        </span>
        <div>
          <button className="button button--ghost button--small" type="button" onClick={() => { update({ ...DEFAULT_SETTINGS, lobbyName: draft.lobbyName }); }}>
            <RotateCcw size={14} /> Reset
          </button>
          <button
            className="button button--primary button--small"
            type="button"
            onClick={() => {
              if (onSave(draft)) {
                setDirty(false);
                setSaved(true);
              }
            }}
          >
            <Save size={15} /> Apply settings
          </button>
        </div>
      </div>

      <CardLibrary
        open={library !== null}
        mode={library ?? "browse"}
        selectedIds={library === "ban" ? draft.bannedCards : draft.enabledCards}
        onToggle={toggleCard}
        onClose={() => setLibrary(null)}
      />
    </div>
  );
}
