/**
 * Generates deterministic, original procedural art for every card that does
 * not have a hand-painted hero image. The art is intentionally dependency-free
 * so builds remain reproducible offline.
 *
 * Run with: npm run art
 */
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ALL_CARDS } from "../src/shared/cards/index.js";
import type { CardDefinition, CardType, ExpansionId, Rarity } from "../src/shared/types.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = join(ROOT, "public");
const SOURCE_ART = join(ROOT, "assets", "source-art");

const PALETTES: Record<ExpansionId, { a: string; b: string; c: string; ink: string; glow: string }> = {
  classic: { a: "#04151d", b: "#073747", c: "#0b6b7a", ink: "#d7fbff", glow: "#67e8f9" },
  crossover: { a: "#160822", b: "#3b0d52", c: "#8b2bb8", ink: "#ffe8ff", glow: "#f0abfc" },
  brainrot: { a: "#111603", b: "#2b3a06", c: "#728f0a", ink: "#f7ffd6", glow: "#bef264" },
  frontier: { a: "#1b1004", b: "#422604", c: "#8f5406", ink: "#fff3d6", glow: "#fbbf24" },
};

const RARITY_COLOR: Record<Rarity, string> = {
  common: "#94a3b8",
  uncommon: "#5eead4",
  rare: "#60a5fa",
  epic: "#c084fc",
  legendary: "#fbbf24",
  mythic: "#fb7185",
};

function mulberry32(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(value: string): number {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function range(random: () => number, min: number, max: number): number {
  return min + random() * (max - min);
}

function pick<T>(random: () => number, values: readonly T[]): T {
  return values[Math.floor(random() * values.length)]!;
}

function hexPoints(cx: number, cy: number, radius: number, rotation = 0): string {
  const points: string[] = [];
  for (let index = 0; index < 6; index += 1) {
    const angle = rotation + (Math.PI / 3) * index;
    points.push(`${(cx + Math.cos(angle) * radius).toFixed(1)},${(cy + Math.sin(angle) * radius).toFixed(1)}`);
  }
  return points.join(" ");
}

function circuitTraces(random: () => number, count: number): string {
  const lines: string[] = [];
  for (let index = 0; index < count; index += 1) {
    let x = range(random, 18, 622);
    let y = range(random, 80, 820);
    let path = `M ${x.toFixed(0)} ${y.toFixed(0)}`;
    const steps = Math.floor(range(random, 2, 6));
    for (let step = 0; step < steps; step += 1) {
      const horizontal = step % 2 === 0;
      const distance = range(random, 24, 110) * (random() > 0.5 ? 1 : -1);
      if (horizontal) x += distance;
      else y += distance;
      path += ` L ${x.toFixed(0)} ${y.toFixed(0)}`;
    }
    const opacity = range(random, 0.12, 0.34).toFixed(2);
    lines.push(`<path d="${path}" fill="none" stroke="currentColor" stroke-width="${range(random, 0.5, 1.6).toFixed(1)}" opacity="${opacity}"/>`);
    lines.push(`<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${range(random, 1.2, 4).toFixed(1)}" fill="currentColor" opacity="0.5"/>`);
  }
  return lines.join("");
}

function glyphRing(random: () => number, type: CardType): string {
  const cx = 320;
  const cy = 420;
  const parts: string[] = [];
  if (type === "asset") {
    const stack = pick(random, [3, 4]);
    for (let index = 0; index < stack; index += 1) {
      const offset = index * 34;
      parts.push(
        `<path d="M ${cx - 150} ${cy + 90 - offset} L ${cx} ${cy + 168 - offset} L ${cx + 150} ${cy + 90 - offset} L ${cx} ${cy + 12 - offset} Z" fill="none" stroke="currentColor" stroke-width="2.2" opacity="${0.9 - index * 0.14}"/>`,
      );
      parts.push(
        `<path d="M ${cx - 150} ${cy + 90 - offset} L ${cx - 150} ${cy + 120 - offset} L ${cx} ${cy + 198 - offset} L ${cx + 150} ${cy + 120 - offset} L ${cx + 150} ${cy + 90 - offset}" fill="none" stroke="currentColor" stroke-width="1.1" opacity="${0.5 - index * 0.08}"/>`,
      );
    }
    parts.push(`<circle cx="${cx}" cy="${cy + 60}" r="220" fill="none" stroke="currentColor" stroke-width="0.7" opacity="0.16" stroke-dasharray="3 9"/>`);
  } else if (type === "defense") {
    const radius = pick(random, [190, 210, 230]);
    parts.push(`<path d="M ${cx} ${cy - radius} C ${cx + 150} ${cy - radius + 24} ${cx + 185} ${cy - radius + 40} ${cx + 185} ${cy - radius + 40} L ${cx + 162} ${cy + 112} C ${cx + 120} ${cy + 212} ${cx} ${cy + 264} ${cx} ${cy + 264} C ${cx} ${cy + 264} ${cx - 120} ${cy + 212} ${cx - 162} ${cy + 112} L ${cx - 185} ${cy - radius + 40} C ${cx - 185} ${cy - radius + 40} ${cx - 150} ${cy - radius + 24} ${cx} ${cy - radius} Z" fill="none" stroke="currentColor" stroke-width="3.2"/>`);
    parts.push(`<path d="M ${cx} ${cy - radius + 42} L ${cx + 148} ${cy - radius + 78} L ${cx + 126} ${cy + 96} C ${cx + 92} ${cy + 168} ${cx} ${cy + 216} ${cx} ${cy + 216} C ${cx} ${cy + 216} ${cx - 92} ${cy + 168} ${cx - 126} ${cy + 96} L ${cx - 148} ${cy - radius + 78} Z" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>`);
    for (let index = 0; index < 3; index += 1) {
      parts.push(`<path d="M ${cx - 130 - index * 16} ${cy + 20 + index * 38} L ${cx} ${cy + 100 + index * 38} L ${cx + 130 + index * 16} ${cy + 20 + index * 38}" fill="none" stroke="currentColor" stroke-width="1.4" opacity="${0.42 - index * 0.1}"/>`);
    }
    parts.push(`<circle cx="${cx}" cy="${cy + 70}" r="76" fill="none" stroke="currentColor" stroke-width="2" opacity="0.9"/>`);
    parts.push(`<path d="M ${cx - 34} ${cy + 72} L ${cx - 8} ${cy + 98} L ${cx + 42} ${cy + 42}" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`);
  } else if (type === "attack") {
    const shards = pick(random, [5, 6, 7]);
    for (let index = 0; index < shards; index += 1) {
      const angle = (Math.PI * 2 * index) / shards + range(random, -0.2, 0.2);
      const inner = range(random, 54, 90);
      const outer = range(random, 175, 276);
      const spread = range(random, 22, 46);
      const x1 = cx + Math.cos(angle) * inner;
      const y1 = cy + Math.cos(angle) * 0;
      const x2 = cx + Math.cos(angle) * outer - Math.sin(angle) * spread;
      const y2 = cy + Math.sin(angle) * outer + Math.cos(angle) * spread;
      const x3 = cx + Math.cos(angle) * outer + Math.sin(angle) * spread;
      const y3 = cy + Math.sin(angle) * outer - Math.cos(angle) * spread;
      parts.push(`<path d="M ${x1.toFixed(0)} ${y1.toFixed(0)} L ${x2.toFixed(0)} ${y2.toFixed(0)} L ${x3.toFixed(0)} ${y3.toFixed(0)} Z" fill="currentColor" opacity="${range(random, 0.08, 0.2).toFixed(2)}"/>`);
      parts.push(`<path d="M ${x1.toFixed(0)} ${y1.toFixed(0)} L ${x2.toFixed(0)} ${y2.toFixed(0)}" stroke="currentColor" stroke-width="1.8" opacity="0.75"/>`);
    }
    parts.push(`<circle cx="${cx}" cy="${cy}" r="56" fill="none" stroke="currentColor" stroke-width="2.4"/>`);
    parts.push(`<path d="M ${cx - 42} ${cy + 14} L ${cx - 8} ${cy - 34} L ${cx + 4} ${cy + 2} L ${cx + 38} ${cy - 50}" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`);
  } else {
    const rings = pick(random, [3, 4, 5]);
    for (let index = 0; index < rings; index += 1) {
      const radius = 60 + index * 46;
      const dash = pick(random, ["", "14 18", "3 12", "28 20"]);
      parts.push(`<ellipse cx="${cx}" cy="${cy}" rx="${radius}" ry="${(radius * range(random, 0.42, 0.9)).toFixed(0)}" fill="none" stroke="currentColor" stroke-width="${range(random, 0.8, 2.2).toFixed(1)}" opacity="${range(random, 0.28, 0.7).toFixed(2)}" ${dash ? `stroke-dasharray="${dash}"` : ""} transform="rotate(${range(random, -24, 24).toFixed(0)} ${cx} ${cy})"/>`);
    }
    parts.push(`<circle cx="${cx}" cy="${cy}" r="34" fill="currentColor" opacity="0.14"/>`);
    parts.push(`<circle cx="${cx}" cy="${cy}" r="34" fill="none" stroke="currentColor" stroke-width="2.4"/>`);
    parts.push(`<path d="M ${cx - 18} ${cy} L ${cx + 18} ${cy} M ${cx} ${cy - 18} L ${cx} ${cy + 18}" stroke="currentColor" stroke-width="2" opacity="0.8"/>`);
  }
  return parts.join("");
}

function artSvg(card: CardDefinition, sequence: number): string {
  const random = mulberry32(hash(card.id) ^ 0x9e3779b9);
  const palette = PALETTES[card.expansion];
  const rarity = RARITY_COLOR[card.rarity];
  const cx = 320;
  const cy = 420;
  const gridRotation = range(random, -8, 8).toFixed(1);
  const monogram = card.subtype
    .replace(/[^a-zA-Z ]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("") || card.name.slice(0, 2).toUpperCase();
  const serial = `CTD-${String(sequence + 1).padStart(3, "0")}`;
  const bars = Array.from({ length: 22 }, (_, index) => {
    const x = 34 + index * 26;
    const height = range(random, 8, 96);
    return `<rect x="${x}" y="${(range(random, 720, 830)).toFixed(0)}" width="${range(random, 3, 12).toFixed(0)}" height="${height.toFixed(0)}" fill="currentColor" opacity="${range(random, 0.04, 0.16).toFixed(2)}"/>`;
  }).join("");
  const stars = Array.from({ length: 34 }, () => {
    const x = range(random, 20, 620).toFixed(0);
    const y = range(random, 20, 880).toFixed(0);
    const radius = range(random, 0.6, 2.3).toFixed(1);
    return `<circle cx="${x}" cy="${y}" r="${radius}" fill="${random() > 0.6 ? rarity : palette.ink}" opacity="${range(random, 0.15, 0.6).toFixed(2)}"/>`;
  }).join("");
  const accentShape = `<path d="M ${range(random, 0, 200).toFixed(0)} -40 L ${range(random, 420, 680).toFixed(0)} 940" stroke="${rarity}" stroke-width="${range(random, 40, 100).toFixed(0)}" opacity="0.05"/>`;
  const emblem = glyphRing(random, card.type);
  const clippedSubtype = escapeXml(card.subtype.toUpperCase().slice(0, 30));
  const clippedSet = escapeXml((card.set || "Signal Breach").toUpperCase().slice(0, 26));
  const typeLabel = card.type.toUpperCase();
  const rarityLabel = card.rarity.toUpperCase();

  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="900" viewBox="0 0 640 900" role="img" aria-label="${escapeXml(card.alt)}">
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${palette.a}"/>
    <stop offset="0.52" stop-color="${palette.b}"/>
    <stop offset="1" stop-color="${palette.a}"/>
  </linearGradient>
  <radialGradient id="halo" cx="50%" cy="43%" r="58%">
    <stop offset="0" stop-color="${palette.glow}" stop-opacity="0.4"/>
    <stop offset="0.5" stop-color="${palette.c}" stop-opacity="0.12"/>
    <stop offset="1" stop-color="${palette.a}" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="accent" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${palette.glow}"/>
    <stop offset="1" stop-color="${rarity}"/>
  </linearGradient>
  <pattern id="scan" width="6" height="6" patternUnits="userSpaceOnUse">
    <rect width="6" height="1" fill="${palette.ink}" opacity="0.035"/>
  </pattern>
  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse" patternTransform="rotate(${gridRotation})">
    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="${palette.glow}" stroke-width="0.5" opacity="0.12"/>
  </pattern>
  <filter id="grain">
    <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="${sequence % 31}"/>
    <feColorMatrix type="saturate" values="0"/>
    <feComponentTransfer><feFuncA type="linear" slope="0.07"/></feComponentTransfer>
  </filter>
  <filter id="glow"><feGaussianBlur stdDeviation="7" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <clipPath id="frame"><path d="M 26 0 H 614 L 640 26 V 874 L 614 900 H 26 L 0 874 V 26 Z"/></clipPath>
</defs>
<g clip-path="url(#frame)">
  <rect width="640" height="900" fill="url(#bg)"/>
  ${accentShape}
  <rect width="640" height="900" fill="url(#grid)"/>
  <circle cx="${cx}" cy="${cy}" r="300" fill="url(#halo)"/>
  <g color="${palette.glow}">${circuitTraces(random, 9)}</g>
  ${bars}
  ${stars}
  <g opacity="0.95" filter="url(#glow)" color="url(#accent)">${emblem}</g>
  <g color="${rarity}" opacity="0.35" transform="translate(5 -4)">${emblem}</g>
  <text x="566" y="238" text-anchor="end" font-family="'Courier New', monospace" font-size="176" font-weight="700" fill="${palette.ink}" opacity="0.055">${escapeXml(monogram)}</text>
  <g font-family="'Courier New', monospace" fill="${palette.ink}">
    <text x="38" y="58" font-size="12" letter-spacing="4" opacity="0.62">${serial}</text>
    <text x="602" y="58" text-anchor="end" font-size="11" letter-spacing="3" opacity="0.5">${escapeXml(card.expansion.toUpperCase())}</text>
    <text x="38" y="792" font-size="13" letter-spacing="2.2" opacity="0.88">${clippedSubtype}</text>
    <text x="38" y="818" font-size="10" letter-spacing="1.8" opacity="0.4">${clippedSet}</text>
    <text x="602" y="792" text-anchor="end" font-size="10" letter-spacing="2" fill="${rarity}" opacity="0.95">${rarityLabel}</text>
    <text x="602" y="818" text-anchor="end" font-size="10" letter-spacing="2" opacity="0.5">${typeLabel}</text>
  </g>
  <path d="M 0 846 H 640" stroke="${palette.ink}" stroke-width="0.7" opacity="0.15"/>
  <g transform="translate(38 862)" opacity="0.5">
    <circle cx="0" cy="0" r="3" fill="${rarity}"/>
    <circle cx="14" cy="0" r="3" fill="${rarity}" opacity="0.7"/>
    <circle cx="28" cy="0" r="3" fill="${rarity}" opacity="0.4"/>
  </g>
  <text x="602" y="866" text-anchor="end" font-family="'Courier New', monospace" font-size="9" letter-spacing="3" fill="${palette.ink}" opacity="0.38">CYBERTHREAT DEFENDER // LAN</text>
</g>
<rect width="640" height="900" fill="url(#scan)"/>
<rect width="640" height="900" filter="url(#grain)" opacity="0.55"/>
<path d="M 26 0.5 H 614 L 639.5 26 V 874 L 614 899.5 H 26 L 0.5 874 V 26 Z" fill="none" stroke="${palette.glow}" stroke-width="1" opacity="0.28"/>
<path d="M 26 8 H 606 L 632 34" fill="none" stroke="${rarity}" stroke-width="1.2" opacity="0.5"/>
<path d="M 26 892 H 606 L 632 866" fill="none" stroke="${rarity}" stroke-width="1.2" opacity="0.28"/>
</svg>`;
}

function cardBack(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="900" viewBox="0 0 640 900">
<defs>
<linearGradient id="b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#031016"/><stop offset=".5" stop-color="#07313d"/><stop offset="1" stop-color="#020a0e"/></linearGradient>
<pattern id="g" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M32 0H0V32" fill="none" stroke="#67e8f9" stroke-width=".7" opacity=".2"/></pattern>
<filter id="blur"><feGaussianBlur stdDeviation="16"/></filter>
<clipPath id="c"><rect x="16" y="16" width="608" height="868" rx="26"/></clipPath>
</defs>
<rect width="640" height="900" fill="url(#b)"/>
<rect x="16" y="16" width="608" height="868" rx="26" fill="url(#g)"/>
<circle cx="320" cy="450" r="210" fill="#0e7490" opacity=".35" filter="url(#blur)"/>
<g fill="none" stroke="#67e8f9">
<path d="M320 250 L462 332 V496 L320 578 L178 496 V332 Z" stroke-width="2.2" opacity=".9"/>
<path d="M320 292 L426 353 V475 L320 536 L214 475 V353 Z" stroke-width="1" opacity=".5"/>
<path d="M320 344 L375 376 V440 L320 472 L265 440 V376 Z" fill="#67e8f9" fill-opacity=".1" stroke-width="1.4"/>
<circle cx="320" cy="408" r="62" stroke-width=".8" stroke-dasharray="3 8" opacity=".5"/>
<path d="M320 330 V486 M242 408 H398" stroke-width=".8" opacity=".35"/>
<path d="M250 610 H390 M280 630 H360 M300 650 H340" stroke-width="2" opacity=".4"/>
</g>
<g font-family="'Courier New', monospace" fill="#d7fbff" text-anchor="middle" opacity=".75">
<text x="320" y="690" font-size="13" letter-spacing="6">CYBERTHREAT</text>
<text x="320" y="712" font-size="13" letter-spacing="6">DEFENDER</text>
<text x="320" y="742" font-size="9" letter-spacing="4" opacity=".6">LAN EDITION</text>
</g>
<circle cx="54" cy="54" r="5" fill="#fb7185"/><circle cx="72" cy="54" r="5" fill="#fbbf24" opacity=".7"/>
<text x="586" y="850" text-anchor="end" font-family="'Courier New', monospace" font-size="9" letter-spacing="3" fill="#67e8f9" opacity=".5">NO PLAYER CAP</text>
</svg>`;
}

let generated = 0;
for (const [index, card] of ALL_CARDS.entries()) {
  if (!card.art.startsWith("/art/cards/")) continue;
  const target = join(PUBLIC, card.art);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, artSvg(card, index), "utf8");
  generated += 1;
}

const heroDir = join(PUBLIC, "art", "heroes");
mkdirSync(heroDir, { recursive: true });
for (const file of ["bonzi.png", "darkity.png", "kirkity.png"]) {
  const source = join(SOURCE_ART, file);
  if (existsSync(source)) copyFileSync(source, join(heroDir, file));
}
const keyArt = join(SOURCE_ART, "key-art.png");
if (existsSync(keyArt)) copyFileSync(keyArt, join(PUBLIC, "art", "key-art.png"));

mkdirSync(join(PUBLIC, "art"), { recursive: true });
writeFileSync(join(PUBLIC, "art", "card-back.svg"), cardBack(), "utf8");
writeFileSync(
  join(PUBLIC, "art", "manifest.json"),
  JSON.stringify(
    ALL_CARDS.map((card) => ({
      id: card.id,
      name: card.name,
      type: card.type,
      expansion: card.expansion,
      rarity: card.rarity,
      art: card.art,
      alt: card.alt,
    })),
    null,
    2,
  ),
  "utf8",
);

console.log(`Generated ${generated} procedural card illustrations and copied hero art.`);
