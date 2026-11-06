import type { UserPrefs } from "./prefs.js";

type SoundName = "click" | "select" | "play" | "turn" | "score" | "win" | "error" | "join";

let prefs: Pick<UserPrefs, "sound" | "volume" | "voice" | "voiceVolume"> = {
  sound: true,
  volume: 0.35,
  voice: true,
  voiceVolume: 0.7,
};

let context: AudioContext | null = null;

export function configureAudio(next: Pick<UserPrefs, "sound" | "volume" | "voice" | "voiceVolume">): void {
  prefs = next;
}

function audioContext(): AudioContext | null {
  if (!prefs.sound) return null;
  try {
    context ??= new AudioContext();
    if (context.state === "suspended") void context.resume();
    return context;
  } catch {
    return null;
  }
}

function tone(
  frequency: number,
  duration: number,
  options: { type?: OscillatorType; gain?: number; delay?: number; slide?: number } = {},
): void {
  const ctx = audioContext();
  if (!ctx) return;
  const start = ctx.currentTime + (options.delay ?? 0);
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = options.type ?? "sine";
  oscillator.frequency.setValueAtTime(frequency, start);
  if (options.slide) oscillator.frequency.exponentialRampToValueAtTime(options.slide, start + duration);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, (options.gain ?? 0.12) * prefs.volume), start + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.03);
}

export function playSound(name: SoundName): void {
  switch (name) {
    case "click":
      tone(520, 0.06, { type: "triangle", gain: 0.06 });
      break;
    case "select":
      tone(660, 0.08, { type: "triangle", gain: 0.08, slide: 880 });
      break;
    case "play":
      tone(220, 0.16, { type: "sawtooth", gain: 0.05, slide: 110 });
      tone(880, 0.12, { type: "sine", gain: 0.08, delay: 0.03, slide: 1320 });
      break;
    case "turn":
      tone(440, 0.12, { type: "sine", gain: 0.1 });
      tone(660, 0.16, { type: "sine", gain: 0.09, delay: 0.1 });
      break;
    case "score":
      tone(740, 0.08, { type: "triangle", gain: 0.08 });
      tone(990, 0.12, { type: "triangle", gain: 0.06, delay: 0.06 });
      break;
    case "win":
      [523, 659, 784, 1046].forEach((frequency, index) => {
        tone(frequency, 0.28, { type: "triangle", gain: 0.09, delay: index * 0.12 });
      });
      break;
    case "error":
      tone(180, 0.18, { type: "square", gain: 0.06, slide: 110 });
      break;
    case "join":
      tone(330, 0.1, { type: "sine", gain: 0.07 });
      tone(494, 0.14, { type: "sine", gain: 0.07, delay: 0.08 });
      break;
    default:
      break;
  }
}

export function speak(text: string | undefined): void {
  if (!text || !prefs.voice) return;
  try {
    const synth = window.speechSynthesis;
    if (!synth) return;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.volume = Math.min(1, Math.max(0, prefs.voiceVolume));
    utterance.rate = 0.96;
    utterance.pitch = 0.92;
    const voices = synth.getVoices();
    const preferred =
      voices.find((voice) => /en[-_](GB|US)/i.test(voice.lang) && /male|daniel|alex|google uk english male/i.test(voice.name)) ??
      voices.find((voice) => /^en/i.test(voice.lang));
    if (preferred) utterance.voice = preferred;
    synth.speak(utterance);
  } catch {
    // Speech is optional.
  }
}

export function unlockAudio(): void {
  audioContext();
}
