/**
 * Validates every card's content and art reference.
 *
 * Checks:
 *  - the complete registry count and unique IDs/names
 *  - required strategy, synergy, counterplay and alt text
 *  - at least one effect (actions, defense or passive)
 *  - art paths resolve to real, non-empty files under public/
 *  - SVG/PNG signatures look correct
 *  - the generated manifest matches the registry
 *  - the required Kirkity line stays present
 *
 * Run with: npm run art:check
 */
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { ALL_CARDS } from "../src/shared/cards/index.js";
import { CARD_TYPE_LABELS, RARITY_ORDER } from "../src/shared/cards/index.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = join(ROOT, "public");
const REQUIRED_LINE = "This? State!? Hit the road dude this is private property.";
const errors: string[] = [];

function check(condition: boolean, message: string): void {
  if (!condition) errors.push(message);
}

function publicFile(assetPath: string): string {
  const cleaned = assetPath.replace(/^\/+/, "");
  const target = normalize(join(PUBLIC, cleaned));
  check(
    target === PUBLIC || target.startsWith(`${PUBLIC}${sep}`),
    `Art path escapes public/: ${assetPath}`,
  );
  return target;
}

const ids = new Set<string>();
const names = new Set<string>();
let missingArt = 0;

for (const card of ALL_CARDS) {
  check(card.id.length > 0, "A card has an empty ID.");
  check(!ids.has(card.id), `Duplicate card ID: ${card.id}`);
  ids.add(card.id);
  check(!names.has(card.name), `Duplicate card name: ${card.name}`);
  names.add(card.name);

  check(card.name.trim().length > 1, `${card.id}: missing name`);
  check(card.alt.trim().length >= 20, `${card.id}: alt text is too short`);
  check(card.alt.length <= 260, `${card.id}: alt text is too long for a card panel`);
  check(card.strategy.trim().length > 0, `${card.id}: missing strategy note`);
  check(card.counterplay.trim().length > 0, `${card.id}: missing counterplay note`);
  check(card.synergies.length > 0, `${card.id}: missing synergies`);
  check(card.actions.length + (card.defense ? 1 : 0) + (card.passive ? 1 : 0) > 0, `${card.id}: has no effects`);
  check(Object.hasOwn(CARD_TYPE_LABELS, card.type), `${card.id}: invalid type ${card.type}`);
  check(RARITY_ORDER.includes(card.rarity), `${card.id}: invalid rarity ${card.rarity}`);
  check(card.cost >= 0, `${card.id}: negative cost`);
  check(card.art.startsWith("/art/"), `${card.id}: art must live under /art/`);

  const asset = publicFile(card.art);
  if (!existsSync(asset)) {
    missingArt += 1;
    errors.push(`${card.id}: missing art file ${card.art}`);
    continue;
  }
  const stats = statSync(asset);
  check(stats.isFile() && stats.size > 100, `${card.id}: art file is empty or too small (${card.art})`);
  if (asset.endsWith(".svg")) {
    const head = readFileSync(asset, "utf8").slice(0, 300).trimStart();
    check(head.startsWith("<svg") || head.startsWith("<?xml"), `${card.id}: ${card.art} is not valid-looking SVG`);
  } else if (asset.endsWith(".png")) {
    const signature = readFileSync(asset).subarray(0, 8).toString("hex");
    check(signature === "89504e470d0a1a0a", `${card.id}: ${card.art} is not a valid PNG`);
  } else {
    errors.push(`${card.id}: unsupported art extension ${card.art}`);
  }
}

check(ALL_CARDS.length === 221, `Expected 221 cards, found ${ALL_CARDS.length}`);
for (const [size, expansion] of Object.entries(
  ALL_CARDS.reduce<Record<string, number>>((counts, card) => {
    counts[card.expansion] = (counts[card.expansion] ?? 0) + 1;
    return counts;
  }, {}),
)) {
  check(size === "classic" ? expansion === 148 : expansion > 0, `Expansion ${size} has ${expansion} cards`);
}

const kirkity = ALL_CARDS.find((card) => card.id === "kirkity");
check(Boolean(kirkity), "The Kirkity crossover card is missing.");
check(
  Boolean(kirkity && `${kirkity.flavor} ${kirkity.text} ${kirkity.voiceLine ?? ""}`.includes(REQUIRED_LINE)),
  "The required Kirkity line is missing.",
);
for (const id of ["bonzi-buddy", "verity-minecraft-mod", "darkity-minecraft-mod"]) {
  check(Boolean(ALL_CARDS.some((card) => card.id === id)), `Crossover card ${id} is missing.`);
}
check(
  ALL_CARDS.some((card) => card.expansion === "brainrot"),
  "Brainrot expansion cards are missing.",
);

const cardBack = join(PUBLIC, "art", "card-back.svg");
check(existsSync(cardBack), "The generated card back is missing. Run npm run art.");
const manifestPath = join(PUBLIC, "art", "manifest.json");
if (!existsSync(manifestPath)) {
  errors.push("The art manifest is missing. Run npm run art.");
} else {
  try {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as Array<{
      id: string;
      art: string;
      alt: string;
    }>;
    check(manifest.length === ALL_CARDS.length, "The art manifest is out of date.");
    const manifestIds = new Set(manifest.map((entry) => entry.id));
    for (const card of ALL_CARDS) {
      check(manifestIds.has(card.id), `Manifest is missing ${card.id}.`);
      const entry = manifest.find((candidate) => candidate.id === card.id);
      check(entry?.art === card.art, `Manifest art mismatch for ${card.id}.`);
      check(entry?.alt === card.alt, `Manifest alt mismatch for ${card.id}.`);
    }
  } catch (error) {
    errors.push(
      `Could not parse the art manifest: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

if (errors.length > 0) {
  console.error(`Art check failed with ${errors.length} issue${errors.length === 1 ? "" : "s"}:`);
  for (const error of errors.slice(0, 80)) console.error(`  - ${error}`);
  if (errors.length > 80) console.error(`  ...and ${errors.length - 80} more.`);
  process.exit(1);
}

const byExpansion = ALL_CARDS.reduce<Record<string, number>>((counts, card) => {
  counts[card.expansion] = (counts[card.expansion] ?? 0) + 1;
  return counts;
}, {});
console.log(
  `Art check passed: ${ALL_CARDS.length} cards, ${ids.size} unique IDs, ` +
    `${missingArt} missing files. ` +
    Object.entries(byExpansion)
      .map(([key, count]) => `${key}=${count}`)
      .join(", "),
);
