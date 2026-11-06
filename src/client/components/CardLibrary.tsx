import { useMemo, useState, type ReactNode } from "react";
import { Ban, Check, Filter, Search, Sparkles, X } from "lucide-react";
import { ALL_CARDS, FEATURED_CARD_IDS } from "../../shared/cards/index.js";
import { EXPANSIONS, type CardType, type ExpansionId, type Rarity } from "../../shared/types.js";
import { CardDetail, CardView } from "./CardView.js";
import { EmptyState, Modal } from "./ui.js";

export type LibraryMode = "browse" | "allow" | "ban";

export function CardLibrary({
  open,
  onClose,
  mode = "browse",
  selectedIds = [],
  onToggle,
}: {
  open: boolean;
  onClose: () => void;
  mode?: LibraryMode;
  selectedIds?: string[];
  onToggle?: (cardId: string) => void;
}): ReactNode {
  const [search, setSearch] = useState("");
  const [expansion, setExpansion] = useState<"all" | ExpansionId>("all");
  const [type, setType] = useState<"all" | CardType>("all");
  const [rarity, setRarity] = useState<"all" | Rarity>("all");
  const [sort, setSort] = useState<"name" | "cost" | "rarity">("name");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const rarityRank = ["common", "uncommon", "rare", "epic", "legendary", "mythic"];
    const cards = ALL_CARDS.filter((card) => {
      if (expansion !== "all" && card.expansion !== expansion) return false;
      if (type !== "all" && card.type !== type) return false;
      if (rarity !== "all" && card.rarity !== rarity) return false;
      if (!needle) return true;
      return (
        card.name.toLowerCase().includes(needle) ||
        card.text.toLowerCase().includes(needle) ||
        card.subtype.toLowerCase().includes(needle) ||
        card.keywords.some((keyword) => keyword.includes(needle)) ||
        card.synergies.some((synergy) => synergy.toLowerCase().includes(needle))
      );
    });
    return cards.sort((left, right) => {
      if (sort === "cost") return left.cost - right.cost || left.name.localeCompare(right.name);
      if (sort === "rarity") return rarityRank.indexOf(right.rarity) - rarityRank.indexOf(left.rarity) || left.name.localeCompare(right.name);
      return left.name.localeCompare(right.name);
    });
  }, [search, expansion, type, rarity, sort]);

  const detail = detailId ? ALL_CARDS.find((card) => card.id === detailId) ?? null : null;
  const selection = new Set(selectedIds);
  const title = mode === "allow" ? "Custom card allowlist" : mode === "ban" ? "Banned cards" : "Card library";
  const subtitle =
    mode === "allow"
      ? "Custom pool: only selected cards appear. An empty allowlist means every enabled card can appear."
      : mode === "ban"
        ? "Banned cards never appear in generated decks, drafts or sealed pools."
        : `${ALL_CARDS.length} cards across four expansions. Every card has art, alt text, strategy, synergies and counterplay.`;

  return (
    <Modal open={open} onClose={onClose} title={title} subtitle={subtitle} wide full>
      <div className="library">
        <div className="library__toolbar">
          <label className="search-field">
            <Search size={16} aria-hidden="true" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search cards, text, keywords…"
              aria-label="Search cards"
            />
            {search ? (
              <button type="button" onClick={() => setSearch("")} aria-label="Clear search">
                <X size={14} />
              </button>
            ) : null}
          </label>
          <button className={`button button--ghost button--small ${filtersOpen ? "is-active" : ""}`} type="button" onClick={() => setFiltersOpen((value) => !value)}>
            <Filter size={15} /> Filters
          </button>
          <span className="library__count">{filtered.length} shown</span>
        </div>
        {filtersOpen ? (
          <div className="library__filters">
            <label>
              Expansion
              <select value={expansion} onChange={(event) => setExpansion(event.target.value as "all" | ExpansionId)}>
                <option value="all">All expansions</option>
                {EXPANSIONS.map((entry) => (
                  <option key={entry.id} value={entry.id}>{entry.name}</option>
                ))}
              </select>
            </label>
            <label>
              Type
              <select value={type} onChange={(event) => setType(event.target.value as "all" | CardType)}>
                <option value="all">All types</option>
                <option value="asset">Asset</option>
                <option value="attack">Attack</option>
                <option value="defense">Defense</option>
                <option value="event">Event</option>
              </select>
            </label>
            <label>
              Rarity
              <select value={rarity} onChange={(event) => setRarity(event.target.value as "all" | Rarity)}>
                <option value="all">All rarities</option>
                {["common", "uncommon", "rare", "epic", "legendary", "mythic"].map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            </label>
            <label>
              Sort
              <select value={sort} onChange={(event) => setSort(event.target.value as "name" | "cost" | "rarity")}>
                <option value="name">Name</option>
                <option value="cost">Cost</option>
                <option value="rarity">Rarity</option>
              </select>
            </label>
            <button className="button button--ghost button--small" type="button" onClick={() => {
              setExpansion("all");
              setType("all");
              setRarity("all");
              setSort("name");
            }}>
              Reset filters
            </button>
          </div>
        ) : null}

        {mode !== "browse" ? (
          <div className="library__selection-bar">
            <span>
              {mode === "allow" ? <Sparkles size={15} /> : <Ban size={15} />}
              {selectedIds.length === 0
                ? mode === "allow" ? "No allowlist — all enabled cards are legal." : "No cards banned."
                : `${selectedIds.length} card${selectedIds.length === 1 ? "" : "s"} ${mode === "allow" ? "allowed" : "banned"}.`}
            </span>
            <div>
              <button className="button button--ghost button--small" type="button" onClick={() => {
                for (const card of filtered) {
                  if (!selection.has(card.id)) onToggle?.(card.id);
                }
              }}>
                <Check size={14} /> Add all shown
              </button>
              <button className="button button--ghost button--small" type="button" onClick={() => {
                for (const card of filtered) {
                  if (selection.has(card.id)) onToggle?.(card.id);
                }
              }}>
                <X size={14} /> Clear shown
              </button>
            </div>
          </div>
        ) : null}

        <div className={`library__content ${detail ? "has-detail" : ""}`}>
          <div className="library__grid">
            {filtered.length === 0 ? (
              <EmptyState
                icon={<Search size={24} />}
                title="No cards match"
                body="Try a different search or reset the filters."
                action={<button className="button button--ghost" type="button" onClick={() => { setSearch(""); setExpansion("all"); setType("all"); setRarity("all"); }}>Clear everything</button>}
              />
            ) : (
              filtered.map((card) => (
                <div className={`library__card ${selection.has(card.id) ? "is-picked" : ""}`} key={card.id}>
                  <CardView
                    card={card}
                    size="grid"
                    selected={selection.has(card.id)}
                    onClick={() => {
                      if (mode === "browse") setDetailId(card.id);
                      else onToggle?.(card.id);
                    }}
                    onDoubleClick={() => setDetailId(card.id)}
                    onInspect={() => setDetailId(card.id)}
                  />
                  {mode !== "browse" ? (
                    <span className={`library__pick ${selection.has(card.id) ? "is-on" : ""}`} aria-hidden="true">
                      {selection.has(card.id) ? <Check size={13} /> : <span />}
                    </span>
                  ) : null}
                  {FEATURED_CARD_IDS.includes(card.id) ? <span className="library__featured">Featured</span> : null}
                </div>
              ))
            )}
          </div>
          {detail ? (
            <aside className="library__detail">
              <button className="icon-button library__detail-close" type="button" onClick={() => setDetailId(null)} aria-label="Close card detail">
                <X size={17} />
              </button>
              <CardDetail card={detail} />
            </aside>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}
