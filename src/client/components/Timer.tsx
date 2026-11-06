import { useEffect, useState, type ReactNode } from "react";
import { Clock3 } from "lucide-react";
import { formatClock } from "../lib/format.js";

export function useTimerTick(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const interval = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(interval);
  }, [active]);
  return now;
}

export function TimerBadge({
  label,
  deadline,
  serverOffset,
  active = true,
}: {
  label: string;
  deadline: number | null;
  serverOffset: number;
  active?: boolean;
}): ReactNode {
  const now = useTimerTick(active && deadline !== null);
  if (!deadline) return null;
  const remaining = Math.max(0, (deadline - (now + serverOffset)) / 1000);
  const warning = remaining <= 15;
  return (
    <span className={`timer-badge ${warning ? "timer-badge--warning" : ""}`} aria-label={`${label}: ${formatClock(remaining)} remaining`}>
      <Clock3 size={14} aria-hidden="true" />
      <span>{label}</span>
      <strong>{formatClock(remaining)}</strong>
    </span>
  );
}
