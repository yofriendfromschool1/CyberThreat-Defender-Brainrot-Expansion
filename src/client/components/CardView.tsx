import type { BattlefieldCard, CardDefinition } from "../../shared/types.js";
import { RARITY_ORDER, getCard } from "../../shared/cards/index.js";
import { Eye, Gem, Play, Volume2 } from "lucide-react";
import { useState, type DragEvent, type KeyboardEvent, type ReactNode } from "react";
import { speak } from "../lib/audio.js";
import { Modal } from "./ui.js";

const TYPE_LABEL: Record<CardDefinition["type"], string> = {
  asset: "Asset",
  attack: "Attack",
  defense: "Defense",
  event: "Event",
};

export function CardView({
  card,
  iid,
  size = "hand",
  disabled = false,
  playable = false,
  selected = false,
  onClick,
  onDoubleClick,
  onInspect,
  draggable = false,
  onDragStart,
  onDragEnd,
  className = "",
}: {
  card: CardDefinition;
  iid?: string;
  size?: "hand" | "grid" | "draft" | "tiny";
  disabled?: boolean;
  playable?: boolean;
  selected?: boolean;
  onClick?: () => void;
  onDoubleClick?: () => void;
  onInspect?: () => void;
  draggable?: boolean;
  onDragStart?: (event: DragEvent<HTMLDivElement>) => void;
  onDragEnd?: () => void;
  className?: string;
}): ReactNode {
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (event.key === "Enter" && onDoubleClick) onDoubleClick();
      else onClick?.();
    }
  };
  return (
    <div
      className={`card card--${size} card--${card.type} ${selected ? "is-selected" : ""} ${disabled ? "is-disabled" : ""} ${playable ? "is-playable" : ""} ${className}`}
      data-card-iid={iid}
      data-rarity={card.rarity}
      role="button"
      tabIndex={0}
      aria-label={`${card.name}, ${TYPE_LABEL[card.type]} card, cost ${card.cost}. ${card.text}`}
      aria-pressed={selected}
      draggable={draggable && !disabled}
      onDragStart={(event) => {
        if (!draggable || disabled) {
          event.preventDefault();
          return;
        }
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", iid ?? card.id);
        onDragStart?.(event);
      }}
      onDragEnd={onDragEnd}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onKeyDown={handleKeyDown}
    >
      <img className="card__art" src={card.art} alt={card.alt} loading={size === "tiny" ? "lazy" : "eager"} draggable={false} />
      <span className="card__shade" aria-hidden="true" />
      <span className="card__top">
        <span className="card__cost" title={`Cost: ${card.cost}`}>{card.cost}</span>
        <span className="card__type">{TYPE_LABEL[card.type]}</span>
        <span className="card__rarity" title={card.rarity}>
          <Gem size={11} />
          {card.rarity.slice(0, 3)}
        </span>
      </span>
      <span className="card__bottom">
        <span className="card__name">{card.name}</span>
        <span className="card__subtype">{card.subtype}</span>
        {size !== "tiny" ? <span className="card__text">{card.text}</span> : null}
      </span>
      {playable ? <span className="card__playable-dot" title="Playable now" /> : null}
      {onInspect ? (
        <button
          type="button"
          className="card__inspect"
          aria-label={`Inspect ${card.name}`}
          onClick={(event) => {
            event.stopPropagation();
            onInspect();
          }}
        >
          <Eye size={14} />
        </button>
      ) : null}
      {disabled ? <span className="card__disabled-label">Locked</span> : null}
    </div>
  );
}

export function BoardAsset({
  instance,
  currentRound,
  targetable = false,
  selected = false,
  onClick,
}: {
  instance: BattlefieldCard;
  currentRound: number;
  targetable?: boolean;
  selected?: boolean;
  onClick?: () => void;
}): ReactNode {
  const card = getCard(instance.cardId);
  const disabled = Boolean(instance.disabledUntilRound && instance.disabledUntilRound > currentRound);
  const points = card.passive?.pointsPerRound ?? 0;
  const uses = instance.usesLeft ?? card.defense?.uses;
  return (
    <button
      type="button"
      className={`board-asset ${targetable ? "is-targetable" : ""} ${selected ? "is-selected" : ""} ${disabled ? "is-offline" : ""}`}
      data-target-asset={instance.iid}
      onClick={(event) => {
        event.stopPropagation();
        onClick?.();
      }}
      aria-label={`${card.name}${points ? `, scores ${points} per round` : ""}${uses ? `, ${uses} uses left` : ""}${disabled ? ", disabled" : ""}`}
    >
      <img src={card.art} alt="" loading="lazy" />
      <span className="board-asset__info">
        <span className="board-asset__name">{card.name}</span>
        <span className="board-asset__meta">
          {points > 0 ? <span className="chip chip--score">+{points} score</span> : null}
          {card.passive?.creditsPerTurn ? <span className="chip">+{card.passive.creditsPerTurn} cr</span> : null}
          {uses != null ? <span className="chip">{uses} use{uses === 1 ? "" : "s"}</span> : null}
          {disabled ? <span className="chip chip--danger">offline</span> : null}
        </span>
      </span>
    </button>
  );
}

export function CardDetail({ card, onClose }: { card: CardDefinition; onClose?: () => void }): ReactNode {
  const rarityIndex = RARITY_ORDER.indexOf(card.rarity);
  return (
    <article className="card-detail">
      <div className="card-detail__art">
        <img src={card.art} alt={card.alt} />
        <div className="card-detail__art-shade" />
        <div className="card-detail__title">
          <span className="card-detail__subtype">{card.subtype}</span>
          <h3>{card.name}</h3>
          <div className="card-detail__badges">
            <span className={`type-badge type-badge--${card.type}`}>{TYPE_LABEL[card.type]}</span>
            <span className="rarity-badge" data-rarity={card.rarity}>
              <Gem size={12} /> {card.rarity}
            </span>
            <span className="cost-badge">{card.cost} credits</span>
          </div>
        </div>
      </div>
      <div className="card-detail__body">
        <p className="card-detail__rules">{card.text}</p>
        <p className="card-detail__flavor">&ldquo;{card.flavor}&rdquo;</p>
        <div className="card-detail__grid">
          <section>
            <h4>Strategy</h4>
            <p>{card.strategy}</p>
          </section>
          <section>
            <h4>Counterplay</h4>
            <p>{card.counterplay}</p>
          </section>
        </div>
        <section>
          <h4>Synergies</h4>
          <div className="tag-row">
            {card.synergies.map((synergy) => (
              <span className="tag" key={synergy}>{synergy}</span>
            ))}
          </div>
        </section>
        <section>
          <h4>Keywords</h4>
          <div className="tag-row">
            {card.keywords.map((keyword) => (
              <span className="tag tag--mono" key={keyword}>{keyword}</span>
            ))}
          </div>
        </section>
        {card.defense ? (
          <section className="detail-block">
            <h4>Defense profile</h4>
            <p>Blocks {card.defense.blocks.join(", ")} · {card.defense.uses} use{card.defense.uses === 1 ? "" : "s"}{card.defense.armor ? ` · ${card.defense.armor} armor` : ""}.</p>
          </section>
        ) : null}
        {card.passive ? (
          <section className="detail-block">
            <h4>Passive</h4>
            <p>
              {card.passive.pointsPerRound ? `+${card.passive.pointsPerRound} score each round. ` : ""}
              {card.passive.creditsPerTurn ? `+${card.passive.creditsPerTurn} credits each turn. ` : ""}
              {card.passive.drawPerRound ? `Draw ${card.passive.drawPerRound} each round. ` : ""}
              {card.passive.handSizeBonus ? `+${card.passive.handSizeBonus} hand size. ` : ""}
              {card.passive.playLimitBonus ? `+${card.passive.playLimitBonus} plays per turn.` : ""}
            </p>
          </section>
        ) : null}
        {card.archiveText ? (
          <section className="detail-block">
            <h4>Original archive text</h4>
            <p className="archive-text">{card.archiveText}</p>
          </section>
        ) : null}
        <div className="card-detail__footer">
          <span className="mono">{card.set} · {String(rarityIndex + 1).padStart(2, "0")}/{RARITY_ORDER.length}</span>
          {card.voiceLine ? (
            <button className="button button--small button--ghost" type="button" onClick={() => speak(card.voiceLine)}>
              <Volume2 size={14} /> Voice line
            </button>
          ) : null}
          {onClose ? (
            <button className="button button--small button--primary" type="button" onClick={onClose}>
              <Play size={14} /> Back to the table
            </button>
          ) : null}
        </div>
        {card.voiceLine ? <p className="voice-line">&ldquo;{card.voiceLine}&rdquo;</p> : null}
      </div>
    </article>
  );
}

export function CardPreviewModal({ card, onClose }: { card: CardDefinition | null; onClose: () => void }): ReactNode {
  return (
    <Modal open={Boolean(card)} onClose={onClose} title={card?.name ?? "Card"} subtitle={card ? `${card.set} · ${card.rarity}` : undefined} wide>
      {card ? <CardDetail card={card} /> : null}
    </Modal>
  );
}

export function CardBackPreview({ label = "Hidden card" }: { label?: string }): ReactNode {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="card-back" aria-label={label}>
      {!loaded ? <span className="card-back__placeholder" /> : null}
      <img src="/art/card-back.svg" alt="" onLoad={() => setLoaded(true)} />
    </div>
  );
}
