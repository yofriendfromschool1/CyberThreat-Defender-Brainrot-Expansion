export interface UserPrefs {
  reduceMotion: boolean;
  highContrast: boolean;
  compactHand: boolean;
  sound: boolean;
  volume: number;
  voice: boolean;
  voiceVolume: number;
  showHints: boolean;
}

export const DEFAULT_PREFS: UserPrefs = {
  reduceMotion: false,
  highContrast: false,
  compactHand: false,
  sound: true,
  volume: 0.35,
  voice: true,
  voiceVolume: 0.7,
  showHints: true,
};

const KEY = "ctd.lan.prefs.v1";

export function loadPrefs(): UserPrefs {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<UserPrefs>;
    return {
      ...DEFAULT_PREFS,
      ...parsed,
      volume: clamp(Number(parsed.volume ?? DEFAULT_PREFS.volume), 0, 1),
      voiceVolume: clamp(Number(parsed.voiceVolume ?? DEFAULT_PREFS.voiceVolume), 0, 1),
    };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function savePrefs(prefs: UserPrefs): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    // Private mode can reject storage.
  }
}

export function applyPrefsToDom(prefs: UserPrefs): void {
  const root = document.documentElement;
  root.dataset.reduceMotion = String(prefs.reduceMotion);
  root.dataset.highContrast = String(prefs.highContrast);
  root.dataset.compactHand = String(prefs.compactHand);
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : minimum));
}
