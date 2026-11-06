import type { GameMode } from "../../shared/types.js";

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
}

export function formatClock(seconds: number): string {
  const value = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(value / 60);
  const rest = value % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

export function relativeTime(timestamp: number, now = Date.now()): string {
  const delta = Math.max(0, Math.round((now - timestamp) / 1000));
  if (delta < 5) return "just now";
  if (delta < 60) return `${delta}s ago`;
  if (delta < 3600) return `${Math.floor(delta / 60)}m ago`;
  if (delta < 86_400) return `${Math.floor(delta / 3600)}h ago`;
  return `${Math.floor(delta / 86_400)}d ago`;
}

export function teamName(teamId: string, mode: GameMode): string {
  if (mode === "coop") return teamId === "ai" ? "Hostile AI" : "Crew";
  if (teamId.startsWith("team-")) return `Team ${teamId.slice(5)}`;
  if (teamId.startsWith("solo-")) return "Solo";
  return teamId;
}

export function teamColor(teamId: string): string {
  let hash = 0;
  for (let index = 0; index < teamId.length; index += 1) {
    hash = (hash * 31 + teamId.charCodeAt(index)) % 360;
  }
  return `hsl(${hash} 72% 62%)`;
}

export function modeLabelClient(mode: GameMode): string {
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

export function shortMode(mode: GameMode): string {
  return modeLabelClient(mode).toUpperCase();
}

export function pct(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.max(0, Math.min(100, (value / max) * 100));
}

export function playerCountLabel(count: number): string {
  return `${count} player${count === 1 ? "" : "s"}`;
}

