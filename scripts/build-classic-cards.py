#!/usr/bin/env python3
"""Build the classic card module from the public CTD catalog scrape.

The source JSON is retained in data/ for auditability. This script normalizes
the handful of upstream rows with incomplete type metadata, assigns a
LAN-game effect profile, and emits src/shared/cards/classic.ts.
"""
from __future__ import annotations

import hashlib
import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "data" / "ctd-cards-source.json"
TARGET = ROOT / "src" / "shared" / "cards" / "classic.ts"

def digest(text: str) -> int:
    return int(hashlib.sha256(text.encode()).hexdigest()[:8], 16)

def rarity_for(card: dict) -> str:
    roll = digest(card["slug"]) % 100
    points = 0
    match = re.search(r"(\d+)\s*point", card["effect"], re.I)
    if match:
        points = int(match.group(1))
    if points >= 3 or "Advanced Persistent" in card["name"]:
        return "epic"
    if roll < 52:
        return "common"
    if roll < 78:
        return "uncommon"
    if roll < 92:
        return "rare"
    if roll < 98:
        return "epic"
    return "legendary"

def normalized_type(card: dict) -> tuple[str, str]:
    types = card["types"]
    primary = next((t for t in types if t.lower() in ("asset", "attack", "defense", "event")), None)
    if primary is None:
        if "Data Breach" in types:
            primary, types = "Attack", ["Attack", "Data Breach"]
        elif "Audit" in types:
            primary, types = "Defense", ["Defense", "Audit"]
        elif "Adversary" in types:
            primary, types = "Attack", ["Attack", "Adversary", *[t for t in types if t != "Adversary"]]
        else:
            primary = "Event"
    subtype = next((t for t in types if t.lower() != primary.lower()), primary)
    return primary.lower(), subtype

def attack_tag(subtype: str) -> str:
    mapping = {
        "denial": "denial",
        "malware": "malware",
        "phishing": "phishing",
        "hack": "hack",
        "code exploit": "exploit",
        "information gathering": "recon",
        "data breach": "breach",
        "personnel": "personnel",
        "mobile": "mobile",
        "adversary": "adversary",
        "social engineering": "social",
    }
    return mapping.get(subtype.lower(), "hack")

def defense_blocks(card: dict, subtype: str) -> list[str]:
    text = f"{card['effect']} {card['description']}".lower()
    sub = subtype.lower()
    blocks: list[str] = []
    if "malware" in text or "virus" in text:
        blocks += ["malware"]
    if "denial" in text or "outage" in text or "dos" in text:
        blocks += ["denial"]
    if "phishing" in text or "social" in text:
        blocks += ["phishing", "social"]
    if "hack" in text or "spoof" in text:
        blocks += ["hack"]
    if "exploit" in text or "patch" in text or "vulnerab" in text:
        blocks += ["exploit"]
    if "data breach" in text or "exfiltrat" in text or "breach" in text:
        blocks += ["breach"]
    if "personnel" in text or "employee" in text or "insider" in text:
        blocks += ["personnel"]
    if "gathering" in text or "sniff" in text or "recon" in text:
        blocks += ["recon"]
    if sub == "encryption":
        blocks += ["recon", "breach"]
    if sub == "hardware":
        blocks += ["denial", "hack"]
    if sub in ("software", "software update"):
        blocks += ["malware", "exploit"]
    if sub == "ips":
        blocks += ["denial", "exploit", "hack"]
    if sub in ("policy", "strategy"):
        blocks += ["social", "phishing"]
    if sub == "personnel":
        blocks += ["social", "personnel"]
    if sub in ("service", "audit"):
        blocks += ["recon", "breach"]
    if sub == "resource":
        blocks += ["denial"]
    if not blocks:
        blocks = ["malware"]
    deduped: list[str] = []
    for block in blocks:
        if block not in deduped:
            deduped.append(block)
    return deduped[:3]

def number_word(value: str) -> int:
    words = {"one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6}
    return words.get(value.lower(), int(value) if value.isdigit() else 1)

def point_amount(text: str) -> int:
    match = re.search(r"loses?\s+(one|two|three|four|five|\d+)\s*\(?", text, re.I)
    if not match:
        return 1
    try:
        return int(match.group(1))
    except ValueError:
        return number_word(match.group(1))

def make_card(card: dict) -> dict:
    ctype, subtype = normalized_type(card)
    name = card["name"].replace("Zues", "Zeus").replace("Tesla Crypt", "TeslaCrypt")
    name = name.replace("I Love You Virus", "“I Love You” Virus")
    effect = card["effect"].replace("**", "") or ""
    description = re.sub(r"\s+", " ", card["description"].replace("**", "")).strip()
    flavor = description
    if len(flavor) > 170:
        flavor = flavor[:167].rsplit(" ", 1)[0] + "…"
    if not flavor:
        flavor = "A fragment of the CyberThreat Defender archive."
    rarity = rarity_for(card)
    roll = digest(card["slug"])
    actions: list[dict] = []
    target = "none"
    defense = None
    passive = None
    keywords: list[str] = []

    if ctype == "asset":
        match = re.search(r"(\d+)\s*point", effect, re.I)
        points = int(match.group(1)) if match else 1
        points = max(0, min(points, 4))
        income = 1 if subtype.lower() in ("isp", "server", "service", "service provider") or roll % 7 == 0 else 0
        passive = {"pointsPerRound": points}
        if income:
            passive["creditsPerTurn"] = income
        cost = max(2, min(5, 1 + points + income))
        text = f"Deploy a {subtype} asset. Scores {points} at round end"
        text += f" and pays {income} credit each turn." if income else "."
        keywords = [subtype.lower().replace(" ", "-")]
    elif ctype == "defense":
        blocks = defense_blocks(card, subtype)
        uses = 2 if re.search(r"two \(2\)|two charges|twice", effect, re.I) else 1
        armor = 1 if uses == 1 and roll % 2 == 0 else 0
        defense = {"blocks": blocks, "uses": uses}
        if armor:
            defense["armor"] = armor
        cost = max(2, min(5, 2 + uses))
        text = f"Counter {', '.join(blocks)} attacks while armed ({uses} charge{'s' if uses != 1 else ''})."
        if armor:
            text += f" Grants {armor} armor."
        keywords = blocks
    elif ctype == "attack":
        keywords = [attack_tag(subtype)]
        asset_target = bool(re.search(r"select (?:a|an|one).{0,30}(?:asset|system|server)", effect, re.I))
        drain = point_amount(effect) if re.search(r"loses?\s+(?:one|two|three|four|five|\d+)\s*\(?", effect, re.I) else 0
        ongoing = 0
        rounds = 1
        if re.search(r"each round|per round|while this card is in play|until this card is countered", effect, re.I):
            ongoing = max(1, min(drain or 1, 3))
            drain = 0
            rounds = 2
            if re.search(r"until this card is countered", effect, re.I):
                rounds = 4
        damage = 2 + digest(card["slug"]) % 3 + (2 if rarity in ("rare", "epic", "legendary") else 0)
        if asset_target:
            target = "enemyAsset"
            rounds = max(1, rounds)
            actions = [
                {"kind": "disableAsset", "rounds": rounds, "target": "chosenAsset"},
                {"kind": "damage", "amount": max(1, damage - 1), "target": "chosen"},
            ]
            text = (
                f"Take an enemy asset offline for {rounds} round{'s' if rounds != 1 else ''}. "
                f"Its controller takes {max(1, damage - 1)} network damage."
            )
        else:
            target = "enemyPlayer"
            actions = [{"kind": "damage", "amount": damage, "target": "chosen"}]
            if drain:
                actions.append({"kind": "drain", "amount": drain, "target": "chosen"})
            if ongoing:
                actions.append(
                    {
                        "kind": "ongoing",
                        "effect": "drain",
                        "amount": ongoing,
                        "rounds": rounds,
                        "label": name,
                        "target": "chosen",
                    }
                )
            text = f"Strike an enemy for {damage} network damage"
            if drain:
                text += f" and drain {drain} score"
            text += "."
            if ongoing:
                text += f" The rival also loses {ongoing} score for {rounds} rounds."
        cost = max(2, min(6, 2 + damage // 2 + (1 if drain or ongoing else 0) + (1 if rarity == "epic" else 0)))
    else:
        target = "none"
        if re.search(r"lose their turn|skips? (?:their|the) turn", effect, re.I):
            actions = [{"kind": "skipTurn", "target": "chosen"}]
            target = "enemyPlayer"
            text = "Force an enemy to skip their next turn."
        elif re.search(r"discard from play one asset|select.{0,25}asset.{0,25}in play", effect, re.I):
            actions = [{"kind": "destroyAsset", "target": "chosenAsset"}]
            target = "enemyAsset"
            text = "Destroy one enemy asset of your choice."
        elif re.search(r"draw", effect, re.I):
            amount = 3 if "three" in effect.lower() else 2
            actions = [{"kind": "draw", "amount": amount, "target": "self"}]
            text = f"Draw {amount} cards."
        elif re.search(r"prevent|counter", effect, re.I):
            actions = [
                {"kind": "shield", "amount": 5, "target": "self"},
                {"kind": "draw", "amount": 1, "target": "self"},
            ]
            text = "Gain 5 armor and draw 1 card."
        elif re.search(r"budget|resource|credit", effect, re.I):
            actions = [{"kind": "credits", "amount": 3, "target": "self"}]
            text = "Gain 3 credits."
        elif re.search(r"point|score", effect, re.I):
            amount = point_amount(effect) if re.search(r"loses?", effect, re.I) else 2
            if re.search(r"opponent loses", effect, re.I):
                actions = [{"kind": "drain", "amount": amount, "target": "chosen"}]
                target = "enemyPlayer"
                text = f"Drain {amount} score from an enemy."
            else:
                actions = [{"kind": "score", "amount": amount, "target": "self"}]
                text = f"Gain {amount} score."
        else:
            actions = [
                {"kind": "credits", "amount": 2, "target": "self"},
                {"kind": "draw", "amount": 1, "target": "self"},
            ]
            text = "Gain 2 credits and draw 1 card."
        cost = 2 + (1 if rarity in ("rare", "epic", "legendary") else 0)
        keywords = ["event"]

    if target == "none" and any(action.get("target") == "chosen" for action in actions):
        target = "enemyPlayer"

    strategies = {
        "asset": "Build the network wide and force opponents to spend attacks on multiple scoring nodes.",
        "defense": "Hold this reactive answer for the attack type your rival has been telegraphing.",
        "attack": "Use it after baiting a counter-defense; deny the highest-value target before scoring.",
        "event": "Timing is the whole card. Hold it until it changes a round, not just a turn.",
    }
    synergy_sets = {
        "asset": ["Economy engines", "Protect the network", "Score snowball"],
        "defense": ["Prediction", "Counter-hold", "Asset protection"],
        "attack": ["Asset denial", "Score pressure", "Tempo swing"],
        "event": ["Turn control", "Card advantage", "Round math"],
    }
    counterplay = {
        "asset": "Attack it the moment it lands, before the next round-end scoring step.",
        "defense": "Bait one charge, then follow with a different attack tag or an asset strike.",
        "attack": "Layer matching defenses and keep a backup counter online.",
        "event": "Track the opponent’s credits and force an earlier commitment.",
    }

    built = {
        "id": card["slug"],
        "name": name,
        "type": ctype,
        "subtype": subtype,
        "expansion": "classic",
        "set": "CTD Core Archive",
        "rarity": rarity,
        "cost": cost,
        "target": target,
        "text": text,
        "flavor": flavor,
        "strategy": strategies[ctype],
        "synergies": synergy_sets[ctype],
        "counterplay": counterplay[ctype],
        "keywords": keywords,
        "art": f"/art/cards/{card['slug']}.svg",
        "alt": f"{name} — {ctype} card. {subtype} archetype. {text}",
        "archiveText": effect[:900],
        "actions": actions,
    }
    if defense:
        built["defense"] = defense
    if passive:
        built["passive"] = passive
    return built

def main() -> None:
    source = json.loads(SOURCE.read_text(encoding="utf-8"))
    cards: list[dict] = []
    seen: set[str] = set()
    for source_card in source:
        if source_card["slug"] in seen:
            continue
        seen.add(source_card["slug"])
        cards.append(make_card(source_card))
    lines = [
        "/**",
        " * Generated from the public CIAS CyberThreat Defender catalog (Aug 2024).",
        " * Names and archive text belong to their original rights holders. The networked",
        " * rules adaptation, strategy notes and all artwork are original to this project.",
        " * Do not edit by hand; run scripts/build-classic-cards.py to regenerate.",
        " */",
        "",
        'import type { CardDefinition } from "../types.js";',
        "",
        "export const CLASSIC_CARDS: CardDefinition[] = [",
    ]
    for card in cards:
        lines.append("  " + json.dumps(card, ensure_ascii=False, separators=(",", ":")) + ",")
    lines.append("];")
    lines.append("")
    TARGET.write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {len(cards)} classic cards to {TARGET.relative_to(ROOT)}")
    print("Types:", dict(Counter(card["type"] for card in cards)))
    duplicate_names = [name for name, count in Counter(card["name"] for card in cards).items() if count > 1]
    print("Duplicate names:", duplicate_names or "none")

if __name__ == "__main__":
    main()
