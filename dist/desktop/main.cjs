"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/desktop/main.ts
var import_node_crypto4 = require("node:crypto");
var import_node_path2 = require("node:path");
var import_electron = require("electron");

// src/server/host.ts
var import_node_crypto3 = require("node:crypto");
var import_node_fs = require("node:fs");
var import_node_http = require("node:http");
var import_node_os2 = require("node:os");
var import_node_path = require("node:path");
var import_node_url = require("node:url");
var import_express = __toESM(require("express"), 1);
var import_ws = require("ws");

// src/shared/types.ts
var CLIENT_VERSION = "1.0.0";
var DEFAULT_SETTINGS = {
  lobbyName: "Night Shift LAN",
  mode: "ffa",
  pacing: "turnBased",
  pointsToWin: 30,
  scoreLimit: 0,
  loseConditions: ["hp", "lives", "scoreThreshold", "roundLimit", "deckOut"],
  startingScore: 0,
  startingResources: 4,
  startingHp: 20,
  handSize: 5,
  deckSize: 32,
  cardsPerTurn: 3,
  roundLimit: 20,
  startingLives: 2,
  lossThreshold: -45,
  enabledExpansions: ["classic", "crossover", "brainrot", "frontier"],
  enabledCards: [],
  bannedCards: [],
  cardPool: "all",
  turnTimerSec: 75,
  roundTimerSec: 0,
  teamSize: 2,
  friendlyFire: false,
  targeting: "enemies",
  respawn: true,
  respawnDelayRounds: 1,
  suddenDeathEnabled: false,
  suddenDeathRound: 10,
  damageMultiplier: 1,
  healingMultiplier: 1,
  botCount: 0,
  botDifficulty: "normal",
  allowSpectators: true,
  lateJoin: "spectators",
  reconnectGraceSec: 90,
  customWinFormula: "",
  customLoseFormula: "",
  hillBonus: 3,
  draftPicks: 12
};
var GameRuleError = class extends Error {
  code;
  constructor(code, message) {
    super(message);
    this.name = "GameRuleError";
    this.code = code;
  }
};

// src/shared/cards/classic.ts
var CLASSIC_CARDS = [
  { "id": "advanced-persistent-dos", "name": "Advanced Persistent DoS", "type": "attack", "subtype": "Denial", "expansion": "classic", "set": "CTD Core Archive", "rarity": "epic", "cost": 6, "target": "enemyPlayer", "text": "Strike an enemy for 4 network damage. The rival also loses 2 score for 2 rounds.", "flavor": "These attacks use a variety of methods to attack a target and disrupt their activities. This can last for weeks and is capable of creating diversions to elude\u2026", "strategy": "Use it after baiting a counter-defense; deny the highest-value target before scoring.", "synergies": ["Asset denial", "Score pressure", "Tempo swing"], "counterplay": "Layer matching defenses and keep a backup counter online.", "keywords": ["denial"], "art": "/art/cards/advanced-persistent-dos.svg", "alt": "Advanced Persistent DoS \u2014 attack card. Denial archetype. Strike an enemy for 4 network damage. The rival also loses 2 score for 2 rounds.", "archiveText": "Your opponent loses two (2) points per round while this card is in play.", "actions": [{ "kind": "damage", "amount": 4, "target": "chosen" }, { "kind": "ongoing", "effect": "drain", "amount": 2, "rounds": 2, "label": "Advanced Persistent DoS", "target": "chosen" }] },
  { "id": "advanced-persistent-threat", "name": "Advanced Persistent Threat", "type": "attack", "subtype": "Hack", "expansion": "classic", "set": "CTD Core Archive", "rarity": "epic", "cost": 6, "target": "enemyPlayer", "text": "Strike an enemy for 5 network damage and drain 4 score.", "flavor": "Your opponent\u2019s network has been infiltrated by a malicious person. They had access for a long time but remained undetected until they could achieve their goal. Your\u2026", "strategy": "Use it after baiting a counter-defense; deny the highest-value target before scoring.", "synergies": ["Asset denial", "Score pressure", "Tempo swing"], "counterplay": "Layer matching defenses and keep a backup counter online.", "keywords": ["hack"], "art": "/art/cards/advanced-persistent-threat.svg", "alt": "Advanced Persistent Threat \u2014 attack card. Hack archetype. Strike an enemy for 5 network damage and drain 4 score.", "archiveText": "Select an opponent that is currently affected by a Trojan Horse card. That opponent loses 4 points this round. Remove this card from play after 1 round.", "actions": [{ "kind": "damage", "amount": 5, "target": "chosen" }, { "kind": "drain", "amount": 4, "target": "chosen" }] },
  { "id": "advanced-threat-monitoring", "name": "Advanced Threat Monitoring", "type": "defense", "subtype": "Service", "expansion": "classic", "set": "CTD Core Archive", "rarity": "common", "cost": 3, "target": "none", "text": "Counter recon, breach attacks while armed (1 charge).", "flavor": "Sensors installed on your network allow cyber analysts the visibility they need to assess network anomalies, track trends and detect threats before they do harm.", "strategy": "Hold this reactive answer for the attack type your rival has been telegraphing.", "synergies": ["Prediction", "Counter-hold", "Asset protection"], "counterplay": "Bait one charge, then follow with a different attack tag or an asset strike.", "keywords": ["recon", "breach"], "art": "/art/cards/advanced-threat-monitoring.svg", "alt": "Advanced Threat Monitoring \u2014 defense card. Service archetype. Counter recon, breach attacks while armed (1 charge).", "archiveText": "When an opponent plays an Attack card that targets you, you may select one card at random to view in that opponent\u2019s hand. If the selected card is an Attack card, discard it and this card.", "actions": [], "defense": { "blocks": ["recon", "breach"], "uses": 1 } },
  { "id": "all-in-one-computer", "name": "All-in-One Computer", "type": "asset", "subtype": "System", "expansion": "classic", "set": "CTD Core Archive", "rarity": "common", "cost": 2, "target": "none", "text": "Deploy a System asset. Scores 1 at round end.", "flavor": "An all-in-one computer is the combination of a monitor and the computer. The system comes as one whole unit with a mouse and keyboard.", "strategy": "Build the network wide and force opponents to spend attacks on multiple scoring nodes.", "synergies": ["Economy engines", "Protect the network", "Score snowball"], "counterplay": "Attack it the moment it lands, before the next round-end scoring step.", "keywords": ["system"], "art": "/art/cards/all-in-one-computer.svg", "alt": "All-in-One Computer \u2014 asset card. System archetype. Deploy a System asset. Scores 1 at round end.", "archiveText": "You gain 1 point each round.", "actions": [], "passive": { "pointsPerRound": 1 } },
  { "id": "alureon-trojan", "name": "Alureon Trojan", "type": "attack", "subtype": "Malware", "expansion": "classic", "set": "CTD Core Archive", "rarity": "common", "cost": 4, "target": "enemyAsset", "text": "Take an enemy asset offline for 2 rounds. Its controller takes 1 network damage.", "flavor": "The Alureon family of trojan horses can send malicious data to your network and corrupt driver files making them unusable. They may also give hackers access to\u2026", "strategy": "Use it after baiting a counter-defense; deny the highest-value target before scoring.", "synergies": ["Asset denial", "Score pressure", "Tempo swing"], "counterplay": "Layer matching defenses and keep a backup counter online.", "keywords": ["malware"], "art": "/art/cards/alureon-trojan.svg", "alt": "Alureon Trojan \u2014 attack card. Malware archetype. Take an enemy asset offline for 2 rounds. Its controller takes 1 network damage.", "archiveText": "Select a System or Server that an opponent has in play. They will gain no points from the selected Asset and will lose 1 point at the end of each round until this Trojan Horse is countered.", "actions": [{ "kind": "disableAsset", "rounds": 2, "target": "chosenAsset" }, { "kind": "damage", "amount": 1, "target": "chosen" }] },
  { "id": "anti-malware-not-updated", "name": "Anti-Malware Not Updated", "type": "event", "subtype": "Event", "expansion": "classic", "set": "CTD Core Archive", "rarity": "common", "cost": 2, "target": "none", "text": "Gain 2 credits and draw 1 card.", "flavor": "Your opponent did not update their virus and malware signature database. This means they are vulnerable to recent virus and malware attacks.", "strategy": "Timing is the whole card. Hold it until it changes a round, not just a turn.", "synergies": ["Turn control", "Card advantage", "Round math"], "counterplay": "Track the opponent\u2019s credits and force an earlier commitment.", "keywords": ["event"], "art": "/art/cards/anti-malware-not-updated.svg", "alt": "Anti-Malware Not Updated \u2014 event card. Event archetype. Gain 2 credits and draw 1 card.", "archiveText": "Select one (1) Anti-Malware/Virus card that your opponent has in play. Both this card and the target card are discarded.", "actions": [{ "kind": "credits", "amount": 2, "target": "self" }, { "kind": "draw", "amount": 1, "target": "self" }] },
  { "id": "anti-malware-virus", "name": "Anti-Malware/Virus", "type": "defense", "subtype": "Software", "expansion": "classic", "set": "CTD Core Archive", "rarity": "common", "cost": 3, "target": "none", "text": "Counter malware, exploit attacks while armed (1 charge).", "flavor": "You install or update anti-malware and anti-virus software on your computer systems. This prevents known viruses and other malicious software (malware), but needs to\u2026", "strategy": "Hold this reactive answer for the attack type your rival has been telegraphing.", "synergies": ["Prediction", "Counter-hold", "Asset protection"], "counterplay": "Bait one charge, then follow with a different attack tag or an asset strike.", "keywords": ["malware", "exploit"], "art": "/art/cards/anti-malware-virus.svg", "alt": "Anti-Malware/Virus \u2014 defense card. Software archetype. Counter malware, exploit attacks while armed (1 charge).", "archiveText": "This card removes all Attack \u2013 Malware cards targeting you and remains in play. While this card is in play, you cannot be the target of Attack \u2013 Malware cards. You may only have one of this card in play.", "actions": [], "defense": { "blocks": ["malware", "exploit"], "uses": 1 } },
  { "id": "application-rootkit", "name": "Application Rootkit", "type": "attack", "subtype": "Malware", "expansion": "classic", "set": "CTD Core Archive", "rarity": "common", "cost": 4, "target": "enemyPlayer", "text": "Strike an enemy for 4 network damage.", "flavor": "Rootkits are often used to conceal their presence or the presence of other malware. Application rootkits operate at the level of standard programs making them easier\u2026", "strategy": "Use it after baiting a counter-defense; deny the highest-value target before scoring.", "synergies": ["Asset denial", "Score pressure", "Tempo swing"], "counterplay": "Layer matching defenses and keep a backup counter online.", "keywords": ["malware"], "art": "/art/cards/application-rootkit.svg", "alt": "Application Rootkit \u2014 attack card. Malware archetype. Strike an enemy for 4 network damage.", "archiveText": "This card is immune to Defense \u2013 Software cards. When your Malware is removed from play by an opponent\u2019s Defense card, you may discard this rootkit and place one Malware back in your hand.", "actions": [{ "kind": "damage", "amount": 4, "target": "chosen" }] },
  { "id": "attend-security-conference", "name": "Attend Security Conference", "type": "event", "subtype": "Event", "expansion": "classic", "set": "CTD Core Archive", "rarity": "common", "cost": 2, "target": "none", "text": "Draw 3 cards.", "flavor": "You attend one of the largest cybersecurity conferences in the world. While there, you meet insightful security professionals, learn about some of the latest\u2026", "strategy": "Timing is the whole card. Hold it until it changes a round, not just a turn.", "synergies": ["Turn control", "Card advantage", "Round math"], "counterplay": "Track the opponent\u2019s credits and force an earlier commitment.", "keywords": ["event"], "art": "/art/cards/attend-security-conference.svg", "alt": "Attend Security Conference \u2014 event card. Event archetype. Draw 3 cards.", "archiveText": "Draw three cards and then discard this card.", "actions": [{ "kind": "draw", "amount": 3, "target": "self" }] },
  { "id": "backup-failure", "name": "Backup Failure", "type": "event", "subtype": "Event", "expansion": "classic", "set": "CTD Core Archive", "rarity": "common", "cost": 2, "target": "none", "text": "Gain 2 credits and draw 1 card.", "flavor": "One of your opponent\u2019s data backup processes has not been closely monitored and it has been making corrupted copies for quite some time. All of the data copied from\u2026", "strategy": "Timing is the whole card. Hold it until it changes a round, not just a turn.", "synergies": ["Turn control", "Card advantage", "Round math"], "counterplay": "Track the opponent\u2019s credits and force an earlier commitment.", "keywords": ["event"], "art": "/art/cards/backup-failure.svg", "alt": "Backup Failure \u2014 event card. Event archetype. Gain 2 credits and draw 1 card.", "archiveText": "Select a Data Backup card that an opponent has in play. When played, both this card and the target card are discarded.", "actions": [{ "kind": "credits", "amount": 2, "target": "self" }, { "kind": "draw", "amount": 1, "target": "self" }] },
  { "id": "backup-power-generator", "name": "Backup Power Generator", "type": "defense", "subtype": "Defense", "expansion": "classic", "set": "CTD Core Archive", "rarity": "common", "cost": 3, "target": "none", "text": "Counter denial attacks while armed (1 charge).", "flavor": "You recently acquired a backup generator to keep your systems functioning in case of an electrical failure. Once this detects a loss of electricity, the generator\u2026", "strategy": "Hold this reactive answer for the attack type your rival has been telegraphing.", "synergies": ["Prediction", "Counter-hold", "Asset protection"], "counterplay": "Bait one charge, then follow with a different attack tag or an asset strike.", "keywords": ["denial"], "art": "/art/cards/backup-power-generator.svg", "alt": "Backup Power Generator \u2014 defense card. Defense archetype. Counter denial attacks while armed (1 charge).", "archiveText": "You may prevent one (1) Power Outage from affecting you. If you choose to do so, put this card at the bottom of your draw pile. You may only have one of this card in play.", "actions": [], "defense": { "blocks": ["denial"], "uses": 1 } },
  { "id": "binary-search", "name": "Binary Search", "type": "event", "subtype": "Event", "expansion": "classic", "set": "CTD Core Archive", "rarity": "common", "cost": 2, "target": "none", "text": "Draw 2 cards.", "flavor": "A binary search is an algorithm designed to quickly search a sorted data structure by recursively splitting sets of data in half and comparing their values.", "strategy": "Timing is the whole card. Hold it until it changes a round, not just a turn.", "synergies": ["Turn control", "Card advantage", "Round math"], "counterplay": "Track the opponent\u2019s credits and force an earlier commitment.", "keywords": ["event"], "art": "/art/cards/binary-search.svg", "alt": "Binary Search \u2014 event card. Event archetype. Draw 2 cards.", "archiveText": "Cut your deck into two piles. Draw one card from the top of each pile, then shuffle your deck. If the values of the two cards match, put both into your hand. Otherwise, put the card with the higher value in your hand, and the card with the lower value at the bottom of your deck.", "actions": [{ "kind": "draw", "amount": 2, "target": "self" }] },
  { "id": "blue-team", "name": "Blue Team", "type": "asset", "subtype": "Personnel", "expansion": "classic", "set": "CTD Core Archive", "rarity": "uncommon", "cost": 2, "target": "none", "text": "Deploy a Personnel asset. Scores 1 at round end.", "flavor": "Blue teams are defensive security professionals responsible for maintaining internal network defenses against all cyber attacks and threats.", "strategy": "Build the network wide and force opponents to spend attacks on multiple scoring nodes.", "synergies": ["Economy engines", "Protect the network", "Score snowball"], "counterplay": "Attack it the moment it lands, before the next round-end scoring step.", "keywords": ["personnel"], "art": "/art/cards/blue-team.svg", "alt": "Blue Team \u2014 asset card. Personnel archetype. Deploy a Personnel asset. Scores 1 at round end.", "archiveText": "Attach all Asset \u2013 Personnel you have in play to this card. Once per turn, you may discard one attached card, to draw a new card. if you play a Red Team or Purple Team card while this is in play, return 1 Defense card from your discard pile back into your deck and shuffle it. Discard this card when no more cards are attached to it.", "actions": [], "passive": { "pointsPerRound": 1 } },
  { "id": "bluesnarfing", "name": "Bluesnarfing", "type": "attack", "subtype": "Mobile", "expansion": "classic", "set": "CTD Core Archive", "rarity": "common", "cost": 5, "target": "enemyPlayer", "text": "Strike an enemy for 4 network damage and drain 1 score.", "flavor": "Bluesnarfing is the unauthorized access of information from a wireless device through a Bluetooth connection, often between phones, desktops, and laptops.", "strategy": "Use it after baiting a counter-defense; deny the highest-value target before scoring.", "synergies": ["Asset denial", "Score pressure", "Tempo swing"], "counterplay": "Layer matching defenses and keep a backup counter online.", "keywords": ["mobile"], "art": "/art/cards/bluesnarfing.svg", "alt": "Bluesnarfing \u2014 attack card. Mobile archetype. Strike an enemy for 4 network damage and drain 1 score.", "archiveText": "Your opponent loses 1 point for each different Asset \u2013 Wireless, Mobile, and Systems cards they have in play. Discard this card at the end of the round.", "actions": [{ "kind": "damage", "amount": 4, "target": "chosen" }, { "kind": "drain", "amount": 1, "target": "chosen" }] },
  { "id": "boot-integrity", "name": "Boot Integrity", "type": "defense", "subtype": "Defense", "expansion": "classic", "set": "CTD Core Archive", "rarity": "common", "cost": 3, "target": "none", "text": "Counter personnel attacks while armed (1 charge).", "flavor": "Use secure methods to boot a system and verify the integrity of the operating system and loading mechanisms. This can be accomplished with a Trusted Platform Module\u2026", "strategy": "Hold this reactive answer for the attack type your rival has been telegraphing.", "synergies": ["Prediction", "Counter-hold", "Asset protection"], "counterplay": "Bait one charge, then follow with a different attack tag or an asset strike.", "keywords": ["personnel"], "art": "/art/cards/boot-integrity.svg", "alt": "Boot Integrity \u2014 defense card. Defense archetype. Counter personnel attacks while armed (1 charge).", "archiveText": "Discard any attack targeting one of your Assets that isn\u2019t a Personnel or Service Provider. Gain 1 point and discard this card at the end of the round.", "actions": [], "defense": { "blocks": ["personnel"], "uses": 1 } },
  { "id": "booz-allen-dark-labs", "name": "Booz Allen Dark Labs", "type": "asset", "subtype": "Service", "expansion": "classic", "set": "CTD Core Archive", "rarity": "common", "cost": 3, "target": "none", "text": "Deploy a Service asset. Scores 1 at round end and pays 1 credit each turn.", "flavor": "At Booz Allen DarkLabs, the hardest national cybersecurity problems drive their research and development agenda. Dark Labs research and prototyping unit rapidly\u2026", "strategy": "Build the network wide and force opponents to spend attacks on multiple scoring nodes.", "synergies": ["Economy engines", "Protect the network", "Score snowball"], "counterplay": "Attack it the moment it lands, before the next round-end scoring step.", "keywords": ["service"], "art": "/art/cards/booz-allen-dark-labs.svg", "alt": "Booz Allen Dark Labs \u2014 asset card. Service archetype. Deploy a Service asset. Scores 1 at round end and pays 1 credit each turn.", "archiveText": "While in play, you will generate 1 point for each Policy and Strategy type cards you have in play at the end of the round. You may only have one Booz Allen Dark Labs in play at a time.", "actions": [], "passive": { "pointsPerRound": 1, "creditsPerTurn": 1 } },
  { "id": "budget-cuts", "name": "Budget Cuts", "type": "event", "subtype": "Event", "expansion": "classic", "set": "CTD Core Archive", "rarity": "uncommon", "cost": 2, "target": "enemyAsset", "text": "Destroy one enemy asset of your choice.", "flavor": "Your opponent is struggling to maintain a sustainable budget. It is not uncommon for security budgets to be cut when a business encounters financial difficulties.\u2026", "strategy": "Timing is the whole card. Hold it until it changes a round, not just a turn.", "synergies": ["Turn control", "Card advantage", "Round math"], "counterplay": "Track the opponent\u2019s credits and force an earlier commitment.", "keywords": ["event"], "art": "/art/cards/budget-cuts.svg", "alt": "Budget Cuts \u2014 event card. Event archetype. Destroy one enemy asset of your choice.", "archiveText": "Select an opponent. That opponent must discard from play one Asset card of their choice.", "actions": [{ "kind": "destroyAsset", "target": "chosenAsset" }] },
  { "id": "budget-increased", "name": "Budget Increased", "type": "event", "subtype": "Upgrade", "expansion": "classic", "set": "CTD Core Archive", "rarity": "uncommon", "cost": 2, "target": "none", "text": "Gain 2 score.", "flavor": "You received an increase to your security budget and purchased newer and more powerful equipment.", "strategy": "Timing is the whole card. Hold it until it changes a round, not just a turn.", "synergies": ["Turn control", "Card advantage", "Round math"], "counterplay": "Track the opponent\u2019s credits and force an earlier commitment.", "keywords": ["event"], "art": "/art/cards/budget-increased.svg", "alt": "Budget Increased \u2014 event card. Upgrade archetype. Gain 2 score.", "archiveText": "Attach this card to an Asset \u2013 System card that you have in play. While the attached Asset \u2013 System is in play, it generates one (1) additional point each round.", "actions": [{ "kind": "score", "amount": 2, "target": "self" }] },
  { "id": "buffer-overflow", "name": "Buffer Overflow", "type": "attack", "subtype": "Code Exploit", "expansion": "classic", "set": "CTD Core Archive", "rarity": "epic", "cost": 6, "target": "enemyPlayer", "text": "Strike an enemy for 5 network damage and drain 3 score.", "flavor": "A program in one of your opponent\u2019s systems was not written with secure code. An attacker was able to cause a buffer overflow, overwriting an unrelated system memory\u2026", "strategy": "Use it after baiting a counter-defense; deny the highest-value target before scoring.", "synergies": ["Asset denial", "Score pressure", "Tempo swing"], "counterplay": "Layer matching defenses and keep a backup counter online.", "keywords": ["exploit"], "art": "/art/cards/buffer-overflow.svg", "alt": "Buffer Overflow \u2014 attack card. Code Exploit archetype. Strike an enemy for 5 network damage and drain 3 score.", "archiveText": "Select an opponent. That opponent loses 3 points at the end of this round. Discard the Buffer Overflow card at the end of the round.", "actions": [{ "kind": "damage", "amount": 5, "target": "chosen" }, { "kind": "drain", "amount": 3, "target": "chosen" }] },
  { "id": "cert", "name": "CERT", "type": "event", "subtype": "Event", "expansion": "classic", "set": "CTD Core Archive", "rarity": "common", "cost": 2, "target": "none", "text": "Gain 1 score.", "flavor": "A Computer Emergency Response Team (CERT) is engaged to respond to security breaches, viruses and other potentially catastrophic incidents impacting your network.", "strategy": "Timing is the whole card. Hold it until it changes a round, not just a turn.", "synergies": ["Turn control", "Card advantage", "Round math"], "counterplay": "Track the opponent\u2019s credits and force an earlier commitment.", "keywords": ["event"], "art": "/art/cards/cert.svg", "alt": "CERT \u2014 event card. Event archetype. Gain 1 score.", "archiveText": "Play up to two Defense cards from your hand as Events in response to an Attack played against you. At the end of the round, you lose 1 point for each Defense card played in this way. Discard this card at the end of the round.", "actions": [{ "kind": "score", "amount": 1, "target": "self" }] },
  { "id": "ciso", "name": "CISO", "type": "asset", "subtype": "Personnel", "expansion": "classic", "set": "CTD Core Archive", "rarity": "common", "cost": 2, "target": "none", "text": "Deploy a Personnel asset. Scores 1 at round end.", "flavor": "A Chief Information Security Officer (CISO) is responsible for planning, coordinating and directing all computer, network and data security needs of their employer.", "strategy": "Build the network wide and force opponents to spend attacks on multiple scoring nodes.", "synergies": ["Economy engines", "Protect the network", "Score snowball"], "counterplay": "Attack it the moment it lands, before the next round-end scoring step.", "keywords": ["personnel"], "art": "/art/cards/ciso.svg", "alt": "CISO \u2014 asset card. Personnel archetype. Deploy a Personnel asset. Scores 1 at round end.", "archiveText": "Each Personnel card that you have in play, excluding Attack \u2013 Personnel, generates 1 point at the end of the round while this card is in play. Discard this card after 2 rounds. You may only have one \u201CCISO\u201D card in play at a time.", "actions": [], "passive": { "pointsPerRound": 1 } },
  { "id": "compromised-user-account", "name": "Compromised User Account", "type": "attack", "subtype": "Hack", "expansion": "classic", "set": "CTD Core Archive", "rarity": "rare", "cost": 5, "target": "enemyPlayer", "text": "Strike an enemy for 6 network damage.", "flavor": "Credential access allows adversaries to control an account on the network, and makes it harder for defenders to detect the adversary.", "strategy": "Use it after baiting a counter-defense; deny the highest-value target before scoring.", "synergies": ["Asset denial", "Score pressure", "Tempo swing"], "counterplay": "Layer matching defenses and keep a backup counter online.", "keywords": ["hack"], "art": "/art/cards/compromised-user-account.svg", "alt": "Compromised User Account \u2014 attack card. Hack archetype. Strike an enemy for 6 network damage.", "archiveText": "Select an Attack \u2013 Hack card you control. If that card would discard itself after \u201Cx\u201D rounds, instead leave it in play until removed by other means.", "actions": [{ "kind": "damage", "amount": 6, "target": "chosen" }] },
  { "id": "crowdstrike-falcon-overwatch", "name": "CrowdStrike Falcon OverWatch", "type": "defense", "subtype": "Service", "expansion": "classic", "set": "CTD Core Archive", "rarity": "common", "cost": 3, "target": "none", "text": "Counter personnel, recon, breach attacks while armed (1 charge). Grants 1 armor.", "flavor": "Global, 24/7 threat hunters proactively hunt hidden and advanced attacks throughout customer environments, rapidly alerting you to new malicious activity as soon as\u2026", "strategy": "Hold this reactive answer for the attack type your rival has been telegraphing.", "synergies": ["Prediction", "Counter-hold", "Asset protection"], "counterplay": "Bait one charge, then follow with a different attack tag or an asset strike.", "keywords": ["personnel", "recon", "breach"], "art": "/art/cards/crowdstrike-falcon-overwatch.svg", "alt": "CrowdStrike Falcon OverWatch \u2014 defense card. Service archetype. Counter personnel, recon, breach attacks while armed (1 charge). Grants 1 armor.", "archiveText": "Attach this card to a Defense \u2013 Software you have in play. While in play, all opponent\u2019s Attack \u2013 Personnel and Adversaries will be discarded after 1 round of play.", "actions": [], "defense": { "blocks": ["personnel", "recon", "breach"], "uses": 1, "armor": 1 } },
  { "id": "crowdstrike-falcon-prevent", "name": "CrowdStrike Falcon Prevent", "type": "defense", "subtype": "Software", "expansion": "classic", "set": "CTD Core Archive", "rarity": "uncommon", "cost": 3, "target": "none", "text": "Counter malware, hack, exploit attacks while armed (1 charge).", "flavor": "Falcon Prevent is a next-gen antivirus that uses cutting-edge AI, advanced behavioral analysis with indicators of attack, and exploit mitigation to detect advanced\u2026", "strategy": "Hold this reactive answer for the attack type your rival has been telegraphing.", "synergies": ["Prediction", "Counter-hold", "Asset protection"], "counterplay": "Bait one charge, then follow with a different attack tag or an asset strike.", "keywords": ["malware", "hack", "exploit"], "art": "/art/cards/crowdstrike-falcon-prevent.svg", "alt": "CrowdStrike Falcon Prevent \u2014 defense card. Software archetype. Counter malware, hack, exploit attacks while armed (1 charge).", "archiveText": "While in play, this card counters and prevents Attack \u2013 Malware cards, including rootkits, from targeting you. Once during your turn, while this card is in play, you may select one Attack \u2013 Hack affecting you and discard it.", "actions": [], "defense": { "blocks": ["malware", "hack", "exploit"], "uses": 1 } },
  { "id": "cryptolocker", "name": "CryptoLocker", "type": "attack", "subtype": "Malware", "expansion": "classic", "set": "CTD Core Archive", "rarity": "uncommon", "cost": 5, "target": "enemyPlayer", "text": "Strike an enemy for 4 network damage. The rival also loses 1 score for 2 rounds.", "flavor": "Your opponent was attacked by the CryptoLocker ransomware, which maliciously encrypted files on their devices to make them unusable. The ransomware is demanding\u2026", "strategy": "Use it after baiting a counter-defense; deny the highest-value target before scoring.", "synergies": ["Asset denial", "Score pressure", "Tempo swing"], "counterplay": "Layer matching defenses and keep a backup counter online.", "keywords": ["malware"], "art": "/art/cards/cryptolocker.svg", "alt": "CryptoLocker \u2014 attack card. Malware archetype. Strike an enemy for 4 network damage. The rival also loses 1 score for 2 rounds.", "archiveText": "Target opponent cannot earn any points from Asset \u2013 Data cards, and loses 1 point at the end of each round that this is in play. The affected player may discard 3 cards to remove CryptoLocker from play.", "actions": [{ "kind": "damage", "amount": 4, "target": "chosen" }, { "kind": "ongoing", "effect": "drain", "amount": 1, "rounds": 2, "label": "CryptoLocker", "target": "chosen" }] },
  { "id": "cyber-risk-analyst", "name": "Cyber Risk Analyst", "type": "asset", "subtype": "Personnel", "expansion": "classic", "set": "CTD Core Archive", "rarity": "epic", "cost": 2, "target": "none", "text": "Deploy a Personnel asset. Scores 1 at round end.", "flavor": "You work with a Booz Allen Cyber Risk Analyst, who assists you with discovering your cyber risks, understanding the needed cybersecurity policies for your\u2026", "strategy": "Build the network wide and force opponents to spend attacks on multiple scoring nodes.", "synergies": ["Economy engines", "Protect the network", "Score snowball"], "counterplay": "Attack it the moment it lands, before the next round-end scoring step.", "keywords": ["personnel"], "art": "/art/cards/cyber-risk-analyst.svg", "alt": "Cyber Risk Analyst \u2014 asset card. Personnel archetype. Deploy a Personnel asset. Scores 1 at round end.", "archiveText": "When played, you may search your deck for any Policy or Strategy type card and put it in your hand. Shuffle your deck once you\u2019ve chosen a card. Discard this card when you play a Policy or Strategy card.", "actions": [], "passive": { "pointsPerRound": 1 } },
  { "id": "cyber-threat-analysis", "name": "Cyber Threat Analysis", "type": "event", "subtype": "Event", "expansion": "classic", "set": "CTD Core Archive", "rarity": "common", "cost": 2, "target": "none", "text": "Gain 2 credits and draw 1 card.", "flavor": "Cyber threat analysis is a process in which internal and external vulnerabilities are investigated and matched against real-world cyber attacks.", "strategy": "Timing is the whole card. Hold it until it changes a round, not just a turn.", "synergies": ["Turn control", "Card advantage", "Round math"], "counterplay": "Track the opponent\u2019s credits and force an earlier commitment.", "keywords": ["event"], "art": "/art/cards/cyber-threat-analysis.svg", "alt": "Cyber Threat Analysis \u2014 event card. Event archetype. Gain 2 credits and draw 1 card.", "archiveText": "This card can be played if your opponent has an Attack in play that can also be found in any discard pile. Discard that Attack card and this card from play.", "actions": [{ "kind": "credits", "amount": 2, "target": "self" }, { "kind": "draw", "amount": 1, "target": "self" }] },
  { "id": "cyberpatriot", "name": "CyberPatriot", "type": "event", "subtype": "Event", "expansion": "classic", "set": "CTD Core Archive", "rarity": "common", "cost": 2, "target": "none", "text": "Gain 2 credits and draw 1 card.", "flavor": "You participated in the CyberPatriot National Youth Cyber Defense Competition, which teaches both middle and high school students basic cybersecurity principles and\u2026", "strategy": "Timing is the whole card. Hold it until it changes a round, not just a turn.", "synergies": ["Turn control", "Card advantage", "Round math"], "counterplay": "Track the opponent\u2019s credits and force an earlier commitment.", "keywords": ["event"], "art": "/art/cards/cyberpatriot.svg", "alt": "CyberPatriot \u2014 event card. Event archetype. Gain 2 credits and draw 1 card.", "archiveText": "Select any number of Password Cracked, Phishing and Forgot to Patch OS cards currently in play and affecting you. Discard all target Attack cards and remove this card when played.", "actions": [{ "kind": "credits", "amount": 2, "target": "self" }, { "kind": "draw", "amount": 1, "target": "self" }] },
  { "id": "data-backup", "name": "Data Backup", "type": "asset", "subtype": "Data", "expansion": "classic", "set": "CTD Core Archive", "rarity": "common", "cost": 2, "target": "none", "text": "Deploy a Data asset. Scores 1 at round end.", "flavor": "You are now regularly making copies of all the data on one of your assets. While it would be convenient to keep these backups in the same place, they are kept\u2026", "strategy": "Build the network wide and force opponents to spend attacks on multiple scoring nodes.", "synergies": ["Economy engines", "Protect the network", "Score snowball"], "counterplay": "Attack it the moment it lands, before the next round-end scoring step.", "keywords": ["data"], "art": "/art/cards/data-backup.svg", "alt": "Data Backup \u2014 asset card. Data archetype. Deploy a Data asset. Scores 1 at round end.", "archiveText": "Attach this to an Asset \u2013 Server that you have in play. If this Asset \u2013 Server is removed from play, instead of discarding all attached Asset \u2013 Data cards as usual, put them back into your hand instead, then discard this Data Backup card.", "actions": [], "passive": { "pointsPerRound": 1 } },
  { "id": "data-care", "name": "Data Care", "type": "defense", "subtype": "Policy", "expansion": "classic", "set": "CTD Core Archive", "rarity": "common", "cost": 3, "target": "none", "text": "Counter phishing, social attacks while armed (1 charge). Grants 1 armor.", "flavor": "Data care encourages everyone to take personal care of their data. Whether using social media, mobile devices or your home\u2019s WiFi, everyone is responsible for\u2026", "strategy": "Hold this reactive answer for the attack type your rival has been telegraphing.", "synergies": ["Prediction", "Counter-hold", "Asset protection"], "counterplay": "Bait one charge, then follow with a different attack tag or an asset strike.", "keywords": ["phishing", "social"], "art": "/art/cards/data-care.svg", "alt": "Data Care \u2014 defense card. Policy archetype. Counter phishing, social attacks while armed (1 charge). Grants 1 armor.", "archiveText": "If you have more Defense than Asset cards, you gain up to three additional points (e.g., 1 point gained if you have 2 Defenses and 1 Asset). Draw a card for each point you gained; you do not need to discard during this turn. Discard this card at the end of your turn.", "actions": [], "defense": { "blocks": ["phishing", "social"], "uses": 1, "armor": 1 } },
  { "id": "data-destruction", "name": "Data Destruction", "type": "attack", "subtype": "Data Breach", "expansion": "classic", "set": "CTD Core Archive", "rarity": "common", "cost": 4, "target": "enemyAsset", "text": "Take an enemy asset offline for 1 round. Its controller takes 3 network damage.", "flavor": "A malicious attacker has gained access to one of your opponent\u2019s machines and destroyed all of the data files stored on that device.", "strategy": "Use it after baiting a counter-defense; deny the highest-value target before scoring.", "synergies": ["Asset denial", "Score pressure", "Tempo swing"], "counterplay": "Layer matching defenses and keep a backup counter online.", "keywords": ["breach"], "art": "/art/cards/data-destruction.svg", "alt": "Data Destruction \u2014 attack card. Data Breach archetype. Take an enemy asset offline for 1 round. Its controller takes 3 network damage.", "archiveText": "Select an Asset \u2013 Server that an opponent has in play. All Asset \u2013 Data cards currently attached to that opponent\u2019s Asset \u2013 Server are removed from play. Remove Data Destruction from play after use.", "actions": [{ "kind": "disableAsset", "rounds": 1, "target": "chosenAsset" }, { "kind": "damage", "amount": 3, "target": "chosen" }] },
  { "id": "data-disposal-policy", "name": "Data Disposal Policy", "type": "defense", "subtype": "Policy", "expansion": "classic", "set": "CTD Core Archive", "rarity": "uncommon", "cost": 3, "target": "none", "text": "Counter breach, social, phishing attacks while armed (1 charge). Grants 1 armor.", "flavor": "With the rise of data breaches and identity theft, you implement a policy that outlines how to discard objects that may contain confidential information.", "strategy": "Hold this reactive answer for the attack type your rival has been telegraphing.", "synergies": ["Prediction", "Counter-hold", "Asset protection"], "counterplay": "Bait one charge, then follow with a different attack tag or an asset strike.", "keywords": ["breach", "social", "phishing"], "art": "/art/cards/data-disposal-policy.svg", "alt": "Data Disposal Policy \u2014 defense card. Policy archetype. Counter breach, social, phishing attacks while armed (1 charge). Grants 1 armor.", "archiveText": "This card prevents any loss of points from all Attack \u2013 Data Breach cards that target your discard pile.", "actions": [], "defense": { "blocks": ["breach", "social", "phishing"], "uses": 1, "armor": 1 } },
  { "id": "data-driven-cybersecurity", "name": "Data Driven Cybersecurity", "type": "defense", "subtype": "Strategy", "expansion": "classic", "set": "CTD Core Archive", "rarity": "rare", "cost": 3, "target": "none", "text": "Counter social, phishing attacks while armed (1 charge). Grants 1 armor.", "flavor": "Data driven cybersecurity is about figuring out how to extract, normalize, and apply data to accelerate security operations\u2014ideally faster than adversaries.", "strategy": "Hold this reactive answer for the attack type your rival has been telegraphing.", "synergies": ["Prediction", "Counter-hold", "Asset protection"], "counterplay": "Bait one charge, then follow with a different attack tag or an asset strike.", "keywords": ["social", "phishing"], "art": "/art/cards/data-driven-cybersecurity.svg", "alt": "Data Driven Cybersecurity \u2014 defense card. Strategy archetype. Counter social, phishing attacks while armed (1 charge). Grants 1 armor.", "archiveText": "While in play, if your opponent has more Attack cards on the field than you have Defense cards, you may draw one card from your deck and reveal it to your opponent. If it\u2019s not a Defense card, shuffle it back into your deck. This effect can only happen once per round.", "actions": [], "defense": { "blocks": ["social", "phishing"], "uses": 1, "armor": 1 } },
  { "id": "data-exfiltration", "name": "Data Exfiltration", "type": "attack", "subtype": "Data Breach", "expansion": "classic", "set": "CTD Core Archive", "rarity": "epic", "cost": 6, "target": "enemyAsset", "text": "Take an enemy asset offline for 1 round. Its controller takes 3 network damage.", "flavor": "An unauthorized user on one of your opponent\u2019s machines is transferring sensitive data to an external network, compromising the confidentiality of that data and\u2026", "strategy": "Use it after baiting a counter-defense; deny the highest-value target before scoring.", "synergies": ["Asset denial", "Score pressure", "Tempo swing"], "counterplay": "Layer matching defenses and keep a backup counter online.", "keywords": ["breach"], "art": "/art/cards/data-exfiltration.svg", "alt": "Data Exfiltration \u2014 attack card. Data Breach archetype. Take an enemy asset offline for 1 round. Its controller takes 3 network damage.", "archiveText": "Select an Asset \u2013 Server that an opponent has in play. That opponent loses 4 points at the end of this round for each Asset \u2013 Data card attached to the target server. Remove this card from play at the end of this round.", "actions": [{ "kind": "disableAsset", "rounds": 1, "target": "chosenAsset" }, { "kind": "damage", "amount": 3, "target": "chosen" }] },
  { "id": "database-server", "name": "Database Server", "type": "asset", "subtype": "Server", "expansion": "classic", "set": "CTD Core Archive", "rarity": "common", "cost": 3, "target": "none", "text": "Deploy a Server asset. Scores 1 at round end and pays 1 credit each turn.", "flavor": "You have acquired and configured a server to host database applications and facilitate queries and connections to that data.", "strategy": "Build the network wide and force opponents to spend attacks on multiple scoring nodes.", "synergies": ["Economy engines", "Protect the network", "Score snowball"], "counterplay": "Attack it the moment it lands, before the next round-end scoring step.", "keywords": ["server"], "art": "/art/cards/database-server.svg", "alt": "Database Server \u2014 asset card. Server archetype. Deploy a Server asset. Scores 1 at round end and pays 1 credit each turn.", "archiveText": "You receive 1 point each round this card is in play.", "actions": [], "passive": { "pointsPerRound": 1, "creditsPerTurn": 1 } },
  { "id": "deceptive-phishing", "name": "Deceptive Phishing", "type": "attack", "subtype": "Phishing", "expansion": "classic", "set": "CTD Core Archive", "rarity": "rare", "cost": 6, "target": "enemyPlayer", "text": "Strike an enemy for 6 network damage. The rival also loses 1 score for 2 rounds.", "flavor": "Phishing attacks often involve emails that appear to come from a trustworthy source; however, they are actually sent by malicious actors attempting to obtain\u2026", "strategy": "Use it after baiting a counter-defense; deny the highest-value target before scoring.", "synergies": ["Asset denial", "Score pressure", "Tempo swing"], "counterplay": "Layer matching defenses and keep a backup counter online.", "keywords": ["phishing"], "art": "/art/cards/deceptive-phishing.svg", "alt": "Deceptive Phishing \u2014 attack card. Phishing archetype. Strike an enemy for 6 network damage. The rival also loses 1 score for 2 rounds.", "archiveText": "Select an opponent. That opponent loses 1 point per round.", "actions": [{ "kind": "damage", "amount": 6, "target": "chosen" }, { "kind": "ongoing", "effect": "drain", "amount": 1, "rounds": 2, "label": "Deceptive Phishing", "target": "chosen" }] },
  { "id": "dedicated-server", "name": "Dedicated Server", "type": "asset", "subtype": "Server", "expansion": "classic", "set": "CTD Core Archive", "rarity": "epic", "cost": 4, "target": "none", "text": "Deploy a Server asset. Scores 2 at round end and pays 1 credit each turn.", "flavor": "A server is more powerful than a desktop or laptop, has more memory, and is dedicated to running the services you need for your network.", "strategy": "Build the network wide and force opponents to spend attacks on multiple scoring nodes.", "synergies": ["Economy engines", "Protect the network", "Score snowball"], "counterplay": "Attack it the moment it lands, before the next round-end scoring step.", "keywords": ["server"], "art": "/art/cards/dedicated-server.svg", "alt": "Dedicated Server \u2014 asset card. Server archetype. Deploy a Server asset. Scores 2 at round end and pays 1 credit each turn.", "archiveText": "Select 1 Asset \u2013 System that you have in play. Discard that Asset \u2013 System and put this card in play. You receive 2 points each round this card is in play.", "actions": [], "passive": { "pointsPerRound": 2, "creditsPerTurn": 1 } },
  { "id": "defense-in-depth", "name": "Defense In Depth", "type": "defense", "subtype": "Policy", "expansion": "classic", "set": "CTD Core Archive", "rarity": "epic", "cost": 3, "target": "none", "text": "Counter social, phishing attacks while armed (1 charge). Grants 1 armor.", "flavor": "Defense in depth is an information assurance concept in which multiple layers of security controls (defense) are placed throughout your network.", "strategy": "Hold this reactive answer for the attack type your rival has been telegraphing.", "synergies": ["Prediction", "Counter-hold", "Asset protection"], "counterplay": "Bait one charge, then follow with a different attack tag or an asset strike.", "keywords": ["social", "phishing"], "art": "/art/cards/defense-in-depth.svg", "alt": "Defense In Depth \u2014 defense card. Policy archetype. Counter social, phishing attacks while armed (1 charge). Grants 1 armor.", "archiveText": "Gain a point at the end of the round for each unique Defense you have in play up to 3 points. Discard this card at the end of the round.", "actions": [], "defense": { "blocks": ["social", "phishing"], "uses": 1, "armor": 1 } },
  { "id": "denial-of-service-dos", "name": "Denial of Service (DoS)", "type": "attack", "subtype": "Denial", "expansion": "classic", "set": "CTD Core Archive", "rarity": "uncommon", "cost": 4, "target": "enemyAsset", "text": "Take an enemy asset offline for 1 round. Its controller takes 3 network damage.", "flavor": "An attacker has launched a Denial of Service (DoS) attack against your opponent\u2019s systems. One system is now not functioning and no work can be accomplished on it.", "strategy": "Use it after baiting a counter-defense; deny the highest-value target before scoring.", "synergies": ["Asset denial", "Score pressure", "Tempo swing"], "counterplay": "Layer matching defenses and keep a backup counter online.", "keywords": ["denial"], "art": "/art/cards/denial-of-service-dos.svg", "alt": "Denial of Service (DoS) \u2014 attack card. Denial archetype. Take an enemy asset offline for 1 round. Its controller takes 3 network damage.", "archiveText": "Select an Asset \u2013 System card that your opponent has in play. That Asset \u2013 System cannot generate any points for one (1) round. Remove this card from play after one (1) round.", "actions": [{ "kind": "disableAsset", "rounds": 1, "target": "chosenAsset" }, { "kind": "damage", "amount": 3, "target": "chosen" }] },
  { "id": "desktop-computer", "name": "Desktop Computer", "type": "asset", "subtype": "System", "expansion": "classic", "set": "CTD Core Archive", "rarity": "uncommon", "cost": 2, "target": "none", "text": "Deploy a System asset. Scores 1 at round end.", "flavor": "A typical desktop computer that can be used to connect to the internet through an Internet Service Provider (ISP).", "strategy": "Build the network wide and force opponents to spend attacks on multiple scoring nodes.", "synergies": ["Economy engines", "Protect the network", "Score snowball"], "counterplay": "Attack it the moment it lands, before the next round-end scoring step.", "keywords": ["system"], "art": "/art/cards/desktop-computer.svg", "alt": "Desktop Computer \u2014 asset card. System archetype. Deploy a System asset. Scores 1 at round end.", "archiveText": "You receive 1 point each round this card is in play.", "actions": [], "passive": { "pointsPerRound": 1 } },
  { "id": "digital-forensic-examiner", "name": "Digital Forensic Examiner", "type": "defense", "subtype": "Personnel", "expansion": "classic", "set": "CTD Core Archive", "rarity": "common", "cost": 3, "target": "none", "text": "Counter personnel, social attacks while armed (1 charge). Grants 1 armor.", "flavor": "Much like a forensic investigator captures evidence from the scene of a crime, a digital forensic examiner gathers evidence found on computers, phones, and other\u2026", "strategy": "Hold this reactive answer for the attack type your rival has been telegraphing.", "synergies": ["Prediction", "Counter-hold", "Asset protection"], "counterplay": "Bait one charge, then follow with a different attack tag or an asset strike.", "keywords": ["personnel", "social"], "art": "/art/cards/digital-forensic-examiner.svg", "alt": "Digital Forensic Examiner \u2014 defense card. Personnel archetype. Counter personnel, social attacks while armed (1 charge). Grants 1 armor.", "archiveText": "While in play and once per round, when an opponent\u2019s Attack targets an Asset that is not a Personnel, perform this effect. Draw 3 cards, discard any of those cards that is not a Defense.", "actions": [], "defense": { "blocks": ["personnel", "social"], "uses": 1, "armor": 1 } },
  { "id": "digital-media-archive", "name": "Digital Media Archive", "type": "asset", "subtype": "Data", "expansion": "classic", "set": "CTD Core Archive", "rarity": "uncommon", "cost": 2, "target": "none", "text": "Deploy a Data asset. Scores 1 at round end.", "flavor": "You have taken on a contract with popular entertainment outlets to store archives of all kinds of digital media, while still remaining accessible if network demand\u2026", "strategy": "Build the network wide and force opponents to spend attacks on multiple scoring nodes.", "synergies": ["Economy engines", "Protect the network", "Score snowball"], "counterplay": "Attack it the moment it lands, before the next round-end scoring step.", "keywords": ["data"], "art": "/art/cards/digital-media-archive.svg", "alt": "Digital Media Archive \u2014 asset card. Data archetype. Deploy a Data asset. Scores 1 at round end.", "archiveText": "Select an Asset \u2013 Server that you have in play and attach this card to it. You receive 1 point each round this card is in play.", "actions": [], "passive": { "pointsPerRound": 1 } },
  { "id": "drive-by-download", "name": "Drive-By Download", "type": "attack", "subtype": "Code Exploit", "expansion": "classic", "set": "CTD Core Archive", "rarity": "common", "cost": 3, "target": "enemyPlayer", "text": "Strike an enemy for 3 network damage.", "flavor": "Your opponent visited a website that was affected by malware. The malware downloaded onto your opponent\u2019s system without their knowledge.", "strategy": "Use it after baiting a counter-defense; deny the highest-value target before scoring.", "synergies": ["Asset denial", "Score pressure", "Tempo swing"], "counterplay": "Layer matching defenses and keep a backup counter online.", "keywords": ["exploit"], "art": "/art/cards/drive-by-download.svg", "alt": "Drive-By Download \u2014 attack card. Code Exploit archetype. Strike an enemy for 3 network damage.", "archiveText": "Search your deck and discard pile for any playable malware card. Play the Malware; it does not count towards your playable card limit. Shuffle your deck and discard.", "actions": [{ "kind": "damage", "amount": 3, "target": "chosen" }] },
  { "id": "dumpster-dive", "name": "Dumpster Dive", "type": "attack", "subtype": "Data Breach", "expansion": "classic", "set": "CTD Core Archive", "rarity": "common", "cost": 4, "target": "enemyPlayer", "text": "Strike an enemy for 2 network damage and drain 2 score.", "flavor": "Improperly discarded data is a major security vulnerability, and some determined attackers are going through your opponent\u2019s trash. Junk mail and inappropriately\u2026", "strategy": "Use it after baiting a counter-defense; deny the highest-value target before scoring.", "synergies": ["Asset denial", "Score pressure", "Tempo swing"], "counterplay": "Layer matching defenses and keep a backup counter online.", "keywords": ["breach"], "art": "/art/cards/dumpster-dive.svg", "alt": "Dumpster Dive \u2014 attack card. Data Breach archetype. Strike an enemy for 2 network damage and drain 2 score.", "archiveText": "Select an opponent\u2019s discard pile. That opponent loses 2 points for each Asset \u2013 Data card in their discard pile at the end of this round. Remove this card from play after 1 round.", "actions": [{ "kind": "damage", "amount": 2, "target": "chosen" }, { "kind": "drain", "amount": 2, "target": "chosen" }] },
  { "id": "encryption", "name": "Encryption", "type": "defense", "subtype": "Encryption", "expansion": "classic", "set": "CTD Core Archive", "rarity": "uncommon", "cost": 3, "target": "none", "text": "Counter recon, breach attacks while armed (1 charge). Grants 1 armor.", "flavor": "You activate encryption on your wireless device. This scrambles the signal so that attackers can\u2019t listen to your wireless traffic.", "strategy": "Hold this reactive answer for the attack type your rival has been telegraphing.", "synergies": ["Prediction", "Counter-hold", "Asset protection"], "counterplay": "Bait one charge, then follow with a different attack tag or an asset strike.", "keywords": ["recon", "breach"], "art": "/art/cards/encryption.svg", "alt": "Encryption \u2014 defense card. Encryption archetype. Counter recon, breach attacks while armed (1 charge). Grants 1 armor.", "archiveText": "Select a Wireless Network card that you have in play and attach this card to it. That Wireless Network is now encrypted. While encrypted, it cannot be the target of Wireless Sniffing cards. Remove from play any Wireless Sniffing cards that affect the encrypted Wireless Network.", "actions": [], "defense": { "blocks": ["recon", "breach"], "uses": 1, "armor": 1 } },
  { "id": "enhanced-threat-protection", "name": "Enhanced Threat Protection", "type": "defense", "subtype": "Service", "expansion": "classic", "set": "CTD Core Archive", "rarity": "common", "cost": 3, "target": "none", "text": "Counter phishing, social, recon attacks while armed (1 charge). Grants 1 armor.", "flavor": "A company with services that can detect, quarantine and block suspicious emails, and protect your network can be a great arsenal in defending your network.", "strategy": "Hold this reactive answer for the attack type your rival has been telegraphing.", "synergies": ["Prediction", "Counter-hold", "Asset protection"], "counterplay": "Bait one charge, then follow with a different attack tag or an asset strike.", "keywords": ["phishing", "social", "recon"], "art": "/art/cards/enhanced-threat-protection.svg", "alt": "Enhanced Threat Protection \u2014 defense card. Service archetype. Counter phishing, social, recon attacks while armed (1 charge). Grants 1 armor.", "archiveText": "Attach this card to a Defense \u2013 Software card you have in play. This card prevents and removes Attack \u2013 Phishing and Information Gathering cards affecting you.", "actions": [], "defense": { "blocks": ["phishing", "social", "recon"], "uses": 1, "armor": 1 } },
  { "id": "extreme-overheating", "name": "Extreme Overheating", "type": "event", "subtype": "Event", "expansion": "classic", "set": "CTD Core Archive", "rarity": "common", "cost": 2, "target": "none", "text": "Gain 2 credits and draw 1 card.", "flavor": "One of your opponent\u2019s assets has been producing too much heat. Without proper cooling or shielding, excessive heat can cause irreversible damage to electronic\u2026", "strategy": "Timing is the whole card. Hold it until it changes a round, not just a turn.", "synergies": ["Turn control", "Card advantage", "Round math"], "counterplay": "Track the opponent\u2019s credits and force an earlier commitment.", "keywords": ["event"], "art": "/art/cards/extreme-overheating.svg", "alt": "Extreme Overheating \u2014 event card. Event archetype. Gain 2 credits and draw 1 card.", "archiveText": "Select either an Asset \u2013 System or an Asset \u2013 Server that your opponent has in play. Both the target card and this card are discarded.", "actions": [{ "kind": "credits", "amount": 2, "target": "self" }, { "kind": "draw", "amount": 1, "target": "self" }] },
  { "id": "failed-certification", "name": "Failed Certification", "type": "event", "subtype": "Event", "expansion": "classic", "set": "CTD Core Archive", "rarity": "rare", "cost": 3, "target": "none", "text": "Gain 2 credits and draw 1 card.", "flavor": "One of your opponent\u2019s staff has not kept up their certifications for their field and must be let go.", "strategy": "Timing is the whole card. Hold it until it changes a round, not just a turn.", "synergies": ["Turn control", "Card advantage", "Round math"], "counterplay": "Track the opponent\u2019s credits and force an earlier commitment.", "keywords": ["event"], "art": "/art/cards/failed-certification.svg", "alt": "Failed Certification \u2014 event card. Event archetype. Gain 2 credits and draw 1 card.", "archiveText": "Choose an opponent and select 1 Personnel card that they have in play. Discard this card and the selected card immediately. If no Personnel card is in play, your opponent must reveal their hand and they must choose a Personnel card from their hand to discard if possible. Discard this card at the end of the round.", "actions": [{ "kind": "credits", "amount": 2, "target": "self" }, { "kind": "draw", "amount": 1, "target": "self" }] },
  { "id": "filter-network-traffic", "name": "Filter Network Traffic", "type": "defense", "subtype": "Defense", "expansion": "classic", "set": "CTD Core Archive", "rarity": "common", "cost": 3, "target": "none", "text": "Counter malware attacks while armed (1 charge). Grants 1 armor.", "flavor": "When flood volumes exceed the capacity of the network connection, it is necessary to intercept the incoming traffic to filter out the attack traffic from the\u2026", "strategy": "Hold this reactive answer for the attack type your rival has been telegraphing.", "synergies": ["Prediction", "Counter-hold", "Asset protection"], "counterplay": "Bait one charge, then follow with a different attack tag or an asset strike.", "keywords": ["malware"], "art": "/art/cards/filter-network-traffic.svg", "alt": "Filter Network Traffic \u2014 defense card. Defense archetype. Counter malware attacks while armed (1 charge). Grants 1 armor.", "archiveText": "Search your deck for a Firewall card. Place it in your hand and shuffle your deck. For each ISP that you have in play, gain 1 point to a maximum of 3 points. Discard this card at the end of the round.", "actions": [], "defense": { "blocks": ["malware"], "uses": 1, "armor": 1 } },
  { "id": "financial-data", "name": "Financial Data", "type": "asset", "subtype": "Data", "expansion": "classic", "set": "CTD Core Archive", "rarity": "uncommon", "cost": 2, "target": "none", "text": "Deploy a Data asset. Scores 1 at round end.", "flavor": "You have been entrusted with some sensitive financial data, including bank account and credit card information, for processing and analysis.", "strategy": "Build the network wide and force opponents to spend attacks on multiple scoring nodes.", "synergies": ["Economy engines", "Protect the network", "Score snowball"], "counterplay": "Attack it the moment it lands, before the next round-end scoring step.", "keywords": ["data"], "art": "/art/cards/financial-data.svg", "alt": "Financial Data \u2014 asset card. Data archetype. Deploy a Data asset. Scores 1 at round end.", "archiveText": "Attach this card to an Asset \u2013 Server that you have in play. You receive 1 point each round this card is in play.", "actions": [], "passive": { "pointsPerRound": 1 } },
  { "id": "firewall-rules-not-updated", "name": "Firewall Rules Not Updated", "type": "event", "subtype": "Event", "expansion": "classic", "set": "CTD Core Archive", "rarity": "uncommon", "cost": 2, "target": "enemyPlayer", "text": "Drain 2 score from an enemy.", "flavor": "Your opponent has forgotten to update their firewall rules, which will allow attackers to penetrate it using newer exploits.", "strategy": "Timing is the whole card. Hold it until it changes a round, not just a turn.", "synergies": ["Turn control", "Card advantage", "Round math"], "counterplay": "Track the opponent\u2019s credits and force an earlier commitment.", "keywords": ["event"], "art": "/art/cards/firewall-rules-not-updated.svg", "alt": "Firewall Rules Not Updated \u2014 event card. Event archetype. Drain 2 score from an enemy.", "archiveText": "Select a Firewall card that an opponent has in play and discard that card. Your opponent loses two (2) points this round. Remove this card from play after one (1) round.", "actions": [{ "kind": "drain", "amount": 2, "target": "chosen" }] },
  { "id": "firewall", "name": "Firewall", "type": "defense", "subtype": "Hardware", "expansion": "classic", "set": "CTD Core Archive", "rarity": "rare", "cost": 3, "target": "none", "text": "Counter hack, denial attacks while armed (1 charge).", "flavor": "You install and setup a network-based firewall. This firewall uses a simple set of rules to allow or deny connections between your local network and the internet.\u2026", "strategy": "Hold this reactive answer for the attack type your rival has been telegraphing.", "synergies": ["Prediction", "Counter-hold", "Asset protection"], "counterplay": "Bait one charge, then follow with a different attack tag or an asset strike.", "keywords": ["hack", "denial"], "art": "/art/cards/firewall.svg", "alt": "Firewall \u2014 defense card. Hardware archetype. Counter hack, denial attacks while armed (1 charge).", "archiveText": "This card will prevent or counter the Spoofing/Hacking attack card. Remove from play any \u201CFirewall Rules Not Updated\u201D cards affecting you when this card is put into play.", "actions": [], "defense": { "blocks": ["hack", "denial"], "uses": 1 } },
  { "id": "footprinting", "name": "Footprinting", "type": "attack", "subtype": "Information Gathering", "expansion": "classic", "set": "CTD Core Archive", "rarity": "common", "cost": 4, "target": "enemyPlayer", "text": "Strike an enemy for 2 network damage. The rival also loses 1 score for 2 rounds.", "flavor": "Information Gathering \u2013 Footprinting is a technique used to gather information about the target system and is usually performed prior to the actual attack.", "strategy": "Use it after baiting a counter-defense; deny the highest-value target before scoring.", "synergies": ["Asset denial", "Score pressure", "Tempo swing"], "counterplay": "Layer matching defenses and keep a backup counter online.", "keywords": ["recon"], "art": "/art/cards/footprinting.svg", "alt": "Footprinting \u2014 attack card. Information Gathering archetype. Strike an enemy for 2 network damage. The rival also loses 1 score for 2 rounds.", "archiveText": "Attach this card to the next Attack you play this round. The Attack removes an additional point each round, until this Attack is removed. If no Attack is played after this card, discard this card at the end of the round.", "actions": [{ "kind": "damage", "amount": 2, "target": "chosen" }, { "kind": "ongoing", "effect": "drain", "amount": 1, "rounds": 2, "label": "Footprinting", "target": "chosen" }] },
  { "id": "forgot-to-patch-os", "name": "Forgot To Patch OS", "type": "event", "subtype": "Event", "expansion": "classic", "set": "CTD Core Archive", "rarity": "common", "cost": 2, "target": "none", "text": "Gain 2 credits and draw 1 card.", "flavor": "Your opponent forgot to install a critical security update to their operating system (OS). Their system is now vulnerable to attack.", "strategy": "Timing is the whole card. Hold it until it changes a round, not just a turn.", "synergies": ["Turn control", "Card advantage", "Round math"], "counterplay": "Track the opponent\u2019s credits and force an earlier commitment.", "keywords": ["event"], "art": "/art/cards/forgot-to-patch-os.svg", "alt": "Forgot To Patch OS \u2014 event card. Event archetype. Gain 2 credits and draw 1 card.", "archiveText": "Select an opponent. If they do not have an OS Update/Patch card in play, choose at random one (1) card from their hand to discard. Otherwise, if they have an OS Update/Patch card in play, remove that card from play. This card is removed from play after use.", "actions": [{ "kind": "credits", "amount": 2, "target": "self" }, { "kind": "draw", "amount": 1, "target": "self" }] },
  { "id": "hacktivist", "name": "Hacktivist", "type": "attack", "subtype": "Personnel", "expansion": "classic", "set": "CTD Core Archive", "rarity": "rare", "cost": 5, "target": "enemyPlayer", "text": "Strike an enemy for 4 network damage. The rival also loses 2 score for 2 rounds.", "flavor": "Your opponent has been targeted with a coordinated campaign from a nefarious group who is opposed to their political views.", "strategy": "Use it after baiting a counter-defense; deny the highest-value target before scoring.", "synergies": ["Asset denial", "Score pressure", "Tempo swing"], "counterplay": "Layer matching defenses and keep a backup counter online.", "keywords": ["personnel"], "art": "/art/cards/hacktivist.svg", "alt": "Hacktivist \u2014 attack card. Personnel archetype. Strike an enemy for 4 network damage. The rival also loses 2 score for 2 rounds.", "archiveText": "Select an opponent. That opponent must discard 1 card from the top of their deck. While in play, that opponent loses 2 points per round. Discard this card after 2 rounds.", "actions": [{ "kind": "damage", "amount": 4, "target": "chosen" }, { "kind": "ongoing", "effect": "drain", "amount": 2, "rounds": 2, "label": "Hacktivist", "target": "chosen" }] },
  { "id": "hardware-failure", "name": "Hardware Failure", "type": "event", "subtype": "Event", "expansion": "classic", "set": "CTD Core Archive", "rarity": "uncommon", "cost": 2, "target": "none", "text": "Gain 2 credits and draw 1 card.", "flavor": "The failure of critical computer and network equipment causes your opponent to lose the use of an asset.", "strategy": "Timing is the whole card. Hold it until it changes a round, not just a turn.", "synergies": ["Turn control", "Card advantage", "Round math"], "counterplay": "Track the opponent\u2019s credits and force an earlier commitment.", "keywords": ["event"], "art": "/art/cards/hardware-failure.svg", "alt": "Hardware Failure \u2014 event card. Event archetype. Gain 2 credits and draw 1 card.", "archiveText": "Select an Asset \u2013 System card that an opponent has in play. Both the target card and this card are discarded.", "actions": [{ "kind": "credits", "amount": 2, "target": "self" }, { "kind": "draw", "amount": 1, "target": "self" }] },
  { "id": "honeypot", "name": "Honeypot", "type": "defense", "subtype": "Defense", "expansion": "classic", "set": "CTD Core Archive", "rarity": "legendary", "cost": 3, "target": "none", "text": "Counter exploit, breach attacks while armed (1 charge). Grants 1 armor.", "flavor": "You create a honeypot which is intended to detect unauthorized activity on your network. This closely monitored data appears to contain vulnerable, valuable and\u2026", "strategy": "Hold this reactive answer for the attack type your rival has been telegraphing.", "synergies": ["Prediction", "Counter-hold", "Asset protection"], "counterplay": "Bait one charge, then follow with a different attack tag or an asset strike.", "keywords": ["exploit", "breach"], "art": "/art/cards/honeypot.svg", "alt": "Honeypot \u2014 defense card. Defense archetype. Counter exploit, breach attacks while armed (1 charge). Grants 1 armor.", "archiveText": "Attach this to an Asset \u2013 Server that you have in play. If this Asset \u2013 Server is the target of an Attack \u2013 Data Breach, you may choose to prevent that attack; if so, discard this Honeypot card.", "actions": [], "defense": { "blocks": ["exploit", "breach"], "uses": 1, "armor": 1 } },
  { "id": "host-based-firewall", "name": "Host-based Firewall", "type": "defense", "subtype": "Software", "expansion": "classic", "set": "CTD Core Archive", "rarity": "rare", "cost": 3, "target": "none", "text": "Counter denial, malware, exploit attacks while armed (1 charge). Grants 1 armor.", "flavor": "You configure host-based firewalls on all of your systems and servers. Firewalls typically establish a barrier between a trusted internal network and untrusted\u2026", "strategy": "Hold this reactive answer for the attack type your rival has been telegraphing.", "synergies": ["Prediction", "Counter-hold", "Asset protection"], "counterplay": "Bait one charge, then follow with a different attack tag or an asset strike.", "keywords": ["denial", "malware", "exploit"], "art": "/art/cards/host-based-firewall.svg", "alt": "Host-based Firewall \u2014 defense card. Software archetype. Counter denial, malware, exploit attacks while armed (1 charge). Grants 1 armor.", "archiveText": "While in play, this card counters and prevents Attack \u2013 Denial cards targeting you. You may only have one of this card in play.", "actions": [], "defense": { "blocks": ["denial", "malware", "exploit"], "uses": 1, "armor": 1 } },
  { "id": "hostile-screen-capture", "name": "Hostile Screen Capture", "type": "attack", "subtype": "Information Gathering", "expansion": "classic", "set": "CTD Core Archive", "rarity": "common", "cost": 4, "target": "enemyAsset", "text": "Take an enemy asset offline for 2 rounds. Its controller takes 2 network damage.", "flavor": "Adversaries may attempt to take screen captures of the desktop to gather information over the course of an operation.", "strategy": "Use it after baiting a counter-defense; deny the highest-value target before scoring.", "synergies": ["Asset denial", "Score pressure", "Tempo swing"], "counterplay": "Layer matching defenses and keep a backup counter online.", "keywords": ["recon"], "art": "/art/cards/hostile-screen-capture.svg", "alt": "Hostile Screen Capture \u2014 attack card. Information Gathering archetype. Take an enemy asset offline for 2 rounds. Its controller takes 2 network damage.", "archiveText": "Select an opponent\u2019s Asset \u2013 System card that is in play. If that Asset is removed, discard this card. Each time your opponent plays an Asset or Defense card, select one card in their hand to view. Your opponent loses 1 point at the end of each round.", "actions": [{ "kind": "disableAsset", "rounds": 2, "target": "chosenAsset" }, { "kind": "damage", "amount": 2, "target": "chosen" }] },
  { "id": "hyperjacking", "name": "Hyperjacking", "type": "attack", "subtype": "Hack", "expansion": "classic", "set": "CTD Core Archive", "rarity": "common", "cost": 3, "target": "enemyPlayer", "text": "Strike an enemy for 2 network damage.", "flavor": "Hyperjacking is an attack in which an adversary takes malicious control over the hypervisor that creates the virtual environment within a virtual machine (VM) host.", "strategy": "Use it after baiting a counter-defense; deny the highest-value target before scoring.", "synergies": ["Asset denial", "Score pressure", "Tempo swing"], "counterplay": "Layer matching defenses and keep a backup counter online.", "keywords": ["hack"], "art": "/art/cards/hyperjacking.svg", "alt": "Hyperjacking \u2014 attack card. Hack archetype. Strike an enemy for 2 network damage.", "archiveText": "Attach this card to an Attack \u2013 Malware card you have in play. If the Malware card is discarded, place it fourth from the top of your deck and discard this card instead.", "actions": [{ "kind": "damage", "amount": 2, "target": "chosen" }] },
  { "id": "i-love-you-virus", "name": "\u201CI Love You\u201D Virus", "type": "attack", "subtype": "Malware", "expansion": "classic", "set": "CTD Core Archive", "rarity": "common", "cost": 4, "target": "enemyPlayer", "text": "Strike an enemy for 3 network damage. The rival also loses 1 score for 4 rounds.", "flavor": "Your opponent is hit by the \u201CI Love You\u201D email virus. It appeared to be an email from a friend with the subject \u201CI Love You\u201D but contained an attachment that\u2026", "strategy": "Use it after baiting a counter-defense; deny the highest-value target before scoring.", "synergies": ["Asset denial", "Score pressure", "Tempo swing"], "counterplay": "Layer matching defenses and keep a backup counter online.", "keywords": ["malware"], "art": "/art/cards/i-love-you-virus.svg", "alt": "\u201CI Love You\u201D Virus \u2014 attack card. Malware archetype. Strike an enemy for 3 network damage. The rival also loses 1 score for 4 rounds.", "archiveText": "Select an opponent. That opponent loses one (1) point per round until this card is countered and removed from play.", "actions": [{ "kind": "damage", "amount": 3, "target": "chosen" }, { "kind": "ongoing", "effect": "drain", "amount": 1, "rounds": 4, "label": "\u201CI Love You\u201D Virus", "target": "chosen" }] },
  { "id": "information-security-analyst", "name": "Information Security Analyst", "type": "asset", "subtype": "Personnel", "expansion": "classic", "set": "CTD Core Archive", "rarity": "legendary", "cost": 2, "target": "none", "text": "Deploy a Personnel asset. Scores 1 at round end.", "flavor": "An Information Security Analyst (ISA) is responsible for the protection of several computer systems and networks.", "strategy": "Build the network wide and force opponents to spend attacks on multiple scoring nodes.", "synergies": ["Economy engines", "Protect the network", "Score snowball"], "counterplay": "Attack it the moment it lands, before the next round-end scoring step.", "keywords": ["personnel"], "art": "/art/cards/information-security-analyst.svg", "alt": "Information Security Analyst \u2014 asset card. Personnel archetype. Deploy a Personnel asset. Scores 1 at round end.", "archiveText": "Choose one:\n\nAt the start of each round, select one of your Defense cards in play. It cannot be discarded this round by any opponent while this card is in play.\n\nOR\n\nSelect an Asset card from your discard pile that is not a Personnel type and shuffle it into your deck. Discard this card at the end of the round.", "actions": [], "passive": { "pointsPerRound": 1 } },
  { "id": "information-security-specialist", "name": "Information Security Specialist", "type": "defense", "subtype": "Personnel", "expansion": "classic", "set": "CTD Core Archive", "rarity": "uncommon", "cost": 3, "target": "none", "text": "Counter malware, social, personnel attacks while armed (1 charge).", "flavor": "The duties of an Information Security Specialist include developing plans to safeguard computer files against unauthorized tampering, managing computer anti-virus and\u2026", "strategy": "Hold this reactive answer for the attack type your rival has been telegraphing.", "synergies": ["Prediction", "Counter-hold", "Asset protection"], "counterplay": "Bait one charge, then follow with a different attack tag or an asset strike.", "keywords": ["malware", "social", "personnel"], "art": "/art/cards/information-security-specialist.svg", "alt": "Information Security Specialist \u2014 defense card. Personnel archetype. Counter malware, social, personnel attacks while armed (1 charge).", "archiveText": "Once per turn you may draw a card from your deck and reveal it to your opponent. If it is not a Defense \u2013 Software, discard that card. You can continue this effect until you draw a Defense \u2013 Software.", "actions": [], "defense": { "blocks": ["malware", "social", "personnel"], "uses": 1 } },
  { "id": "information-sharing", "name": "Information Sharing", "type": "defense", "subtype": "Policy", "expansion": "classic", "set": "CTD Core Archive", "rarity": "uncommon", "cost": 3, "target": "none", "text": "Counter hack, exploit, social attacks while armed (1 charge). Grants 1 armor.", "flavor": "You become involved in sharing cyber threat information, which improves global network security and undermines potential threats by enabling participants to better\u2026", "strategy": "Hold this reactive answer for the attack type your rival has been telegraphing.", "synergies": ["Prediction", "Counter-hold", "Asset protection"], "counterplay": "Bait one charge, then follow with a different attack tag or an asset strike.", "keywords": ["hack", "exploit", "social"], "art": "/art/cards/information-sharing.svg", "alt": "Information Sharing \u2014 defense card. Policy archetype. Counter hack, exploit, social attacks while armed (1 charge). Grants 1 armor.", "archiveText": "While this card is in play, each Attack \u2013 Hack card affecting you has a total value of -1 point per round instead of its normal value.", "actions": [], "defense": { "blocks": ["hack", "exploit", "social"], "uses": 1, "armor": 1 } },
  { "id": "insider-threat", "name": "Insider Threat", "type": "attack", "subtype": "Personnel", "expansion": "classic", "set": "CTD Core Archive", "rarity": "rare", "cost": 5, "target": "enemyPlayer", "text": "Strike an enemy for 4 network damage and drain 2 score.", "flavor": "An Insider Threat is someone who has authorized access and causes a negative impact to an organization either intentionally or unintentionally.", "strategy": "Use it after baiting a counter-defense; deny the highest-value target before scoring.", "synergies": ["Asset denial", "Score pressure", "Tempo swing"], "counterplay": "Layer matching defenses and keep a backup counter online.", "keywords": ["personnel"], "art": "/art/cards/insider-threat.svg", "alt": "Insider Threat \u2014 attack card. Personnel archetype. Strike an enemy for 4 network damage and drain 2 score.", "archiveText": "Remove a Personnel or a Defense \u2013 Software, excluding Attack \u2013 Personnel, that an opponent has in play. That opponent loses 2 points at the end of the round. Discard this card at the end of the round.", "actions": [{ "kind": "damage", "amount": 4, "target": "chosen" }, { "kind": "drain", "amount": 2, "target": "chosen" }] },
  { "id": "intelligence-driven-defense", "name": "Intelligence Driven Defense", "type": "defense", "subtype": "Policy", "expansion": "classic", "set": "CTD Core Archive", "rarity": "uncommon", "cost": 3, "target": "none", "text": "Counter social, phishing attacks while armed (1 charge). Grants 1 armor.", "flavor": "The Lockheed Martin Intelligence Driven Defense philosophy supports the intent to stop offensive maneuvers during a cyber attack while maintaining a defensive posture.", "strategy": "Hold this reactive answer for the attack type your rival has been telegraphing.", "synergies": ["Prediction", "Counter-hold", "Asset protection"], "counterplay": "Bait one charge, then follow with a different attack tag or an asset strike.", "keywords": ["social", "phishing"], "art": "/art/cards/intelligence-driven-defense.svg", "alt": "Intelligence Driven Defense \u2014 defense card. Policy archetype. Counter social, phishing attacks while armed (1 charge). Grants 1 armor.", "archiveText": "While this card is in play, if your opponent plays an Attack targeting you, you may view the top 2 cards of their deck. Put any Attack cards viewed at the bottom of their deck and return the rest to the top of their deck in the original order.", "actions": [], "defense": { "blocks": ["social", "phishing"], "uses": 1, "armor": 1 } },
  { "id": "internal-spear-phishing", "name": "Internal Spear Phishing", "type": "attack", "subtype": "Phishing", "expansion": "classic", "set": "CTD Core Archive", "rarity": "epic", "cost": 5, "target": "enemyPlayer", "text": "Strike an enemy for 5 network damage.", "flavor": "Adversaries use internal spear phishing to gain additional information or to exploit users within the organization after gaining access to accounts or systems within\u2026", "strategy": "Use it after baiting a counter-defense; deny the highest-value target before scoring.", "synergies": ["Asset denial", "Score pressure", "Tempo swing"], "counterplay": "Layer matching defenses and keep a backup counter online.", "keywords": ["phishing"], "art": "/art/cards/internal-spear-phishing.svg", "alt": "Internal Spear Phishing \u2014 attack card. Phishing archetype. Strike an enemy for 5 network damage.", "archiveText": "This attack can only be played if a Malware card is affecting your opponent or if your opponent has a Personnel card in play. If both requirements are met, remove 3 points this round. Otherwise, remove 2 points. Discard this card after 2 rounds.", "actions": [{ "kind": "damage", "amount": 5, "target": "chosen" }] },
  { "id": "intrusion-prevention", "name": "Intrusion Prevention", "type": "defense", "subtype": "IPS", "expansion": "classic", "set": "CTD Core Archive", "rarity": "common", "cost": 3, "target": "none", "text": "Counter malware, hack, denial attacks while armed (1 charge).", "flavor": "Intrusion Prevention Systems monitor systems and prevent malicious changes that would occur within it as well as remove what caused the unwanted change.", "strategy": "Hold this reactive answer for the attack type your rival has been telegraphing.", "synergies": ["Prediction", "Counter-hold", "Asset protection"], "counterplay": "Bait one charge, then follow with a different attack tag or an asset strike.", "keywords": ["malware", "hack", "denial"], "art": "/art/cards/intrusion-prevention.svg", "alt": "Intrusion Prevention \u2014 defense card. IPS archetype. Counter malware, hack, denial attacks while armed (1 charge).", "archiveText": "Discard all rootkits your target opponent has in play. Once during your turn, while this card is in play, you may select one Malware or Hack affecting you and discard it.", "actions": [], "defense": { "blocks": ["malware", "hack", "denial"], "uses": 1 } },
  { "id": "isao-membership", "name": "ISAO Membership", "type": "asset", "subtype": "Asset", "expansion": "classic", "set": "CTD Core Archive", "rarity": "common", "cost": 2, "target": "none", "text": "Deploy a Asset asset. Scores 1 at round end.", "flavor": "You just became a member of an Information Sharing and Analysis Organization (ISAO), which analyzes and shares information related to cybersecurity risks and\u2026", "strategy": "Build the network wide and force opponents to spend attacks on multiple scoring nodes.", "synergies": ["Economy engines", "Protect the network", "Score snowball"], "counterplay": "Attack it the moment it lands, before the next round-end scoring step.", "keywords": ["asset"], "art": "/art/cards/isao-membership.svg", "alt": "ISAO Membership \u2014 asset card. Asset archetype. Deploy a Asset asset. Scores 1 at round end.", "archiveText": "While this card is in play, whenever an Attack card is put into play by an opponent, you may immediately put a Defense card from your hand into play.", "actions": [], "passive": { "pointsPerRound": 1 } },
  { "id": "isp-connection", "name": "ISP Connection", "type": "asset", "subtype": "ISP", "expansion": "classic", "set": "CTD Core Archive", "rarity": "common", "cost": 3, "target": "none", "text": "Deploy a ISP asset. Scores 1 at round end and pays 1 credit each turn.", "flavor": "Establishes a connection to the Internet through an Internet Service Provider (ISP).", "strategy": "Build the network wide and force opponents to spend attacks on multiple scoring nodes.", "synergies": ["Economy engines", "Protect the network", "Score snowball"], "counterplay": "Attack it the moment it lands, before the next round-end scoring step.", "keywords": ["isp"], "art": "/art/cards/isp-connection.svg", "alt": "ISP Connection \u2014 asset card. ISP archetype. Deploy a ISP asset. Scores 1 at round end and pays 1 credit each turn.", "archiveText": "This card allows you to put 2 Desktop or Server cards into play. You cannot gain points unless you have at least 1 ISP Connection in play.", "actions": [], "passive": { "pointsPerRound": 1, "creditsPerTurn": 1 } },
  { "id": "it-auditor", "name": "IT Auditor", "type": "defense", "subtype": "Personnel", "expansion": "classic", "set": "CTD Core Archive", "rarity": "common", "cost": 4, "target": "none", "text": "Counter personnel, social attacks while armed (2 charges).", "flavor": "An IT Auditor assesses an organization\u2019s technology for potential issues with security, efficiency, and compliance.", "strategy": "Hold this reactive answer for the attack type your rival has been telegraphing.", "synergies": ["Prediction", "Counter-hold", "Asset protection"], "counterplay": "Bait one charge, then follow with a different attack tag or an asset strike.", "keywords": ["personnel", "social"], "art": "/art/cards/it-auditor.svg", "alt": "IT Auditor \u2014 defense card. Personnel archetype. Counter personnel, social attacks while armed (2 charges).", "archiveText": "Once per turn you may discard 1 card from the top of your deck and return a Defense card that is not a Personnel card from your discard pile to your deck. Shuffle your deck. Discard this card after you\u2019ve used this effect twice.", "actions": [], "defense": { "blocks": ["personnel", "social"], "uses": 2 } },
  { "id": "it-security-consultant", "name": "IT Security Consultant", "type": "asset", "subtype": "Personnel", "expansion": "classic", "set": "CTD Core Archive", "rarity": "common", "cost": 2, "target": "none", "text": "Deploy a Personnel asset. Scores 1 at round end.", "flavor": "IT Security Consultants advise organizations how to best protect their cybersecurity objectives in a cost-effective manner.", "strategy": "Build the network wide and force opponents to spend attacks on multiple scoring nodes.", "synergies": ["Economy engines", "Protect the network", "Score snowball"], "counterplay": "Attack it the moment it lands, before the next round-end scoring step.", "keywords": ["personnel"], "art": "/art/cards/it-security-consultant.svg", "alt": "IT Security Consultant \u2014 asset card. Personnel archetype. Deploy a Personnel asset. Scores 1 at round end.", "archiveText": "When played, draw 1 card and show your opponent that card. If it\u2019s a Defense card, draw another card. Otherwise, you gain 1 point at the end of the round. Discard this card at the end of the round.", "actions": [], "passive": { "pointsPerRound": 1 } },
  { "id": "it-security-engineer", "name": "IT Security Engineer", "type": "asset", "subtype": "Personnel", "expansion": "classic", "set": "CTD Core Archive", "rarity": "common", "cost": 2, "target": "none", "text": "Deploy a Personnel asset. Scores 1 at round end.", "flavor": "IT Security Engineers provide a specialized engineering approach to cybersecurity, often involved in systems maintenance and performing security checks.", "strategy": "Build the network wide and force opponents to spend attacks on multiple scoring nodes.", "synergies": ["Economy engines", "Protect the network", "Score snowball"], "counterplay": "Attack it the moment it lands, before the next round-end scoring step.", "keywords": ["personnel"], "art": "/art/cards/it-security-engineer.svg", "alt": "IT Security Engineer \u2014 asset card. Personnel archetype. Deploy a Personnel asset. Scores 1 at round end.", "archiveText": "You gain 1 point at the end of the round for each Attack card in your opponent\u2019s discard pile, to a max of 3 points. Discard this card at the end of the round.", "actions": [], "passive": { "pointsPerRound": 1 } },
  { "id": "jackal", "name": "JACKAL", "type": "attack", "subtype": "Adversary", "expansion": "classic", "set": "CTD Core Archive", "rarity": "common", "cost": 4, "target": "enemyPlayer", "text": "Strike an enemy for 3 network damage. The rival also loses 1 score for 2 rounds.", "flavor": "JACKAL groups \u2013 aka hacktivists \u2013 are individuals or groups of hackers that form to conduct attacks in support of ideological beliefs, or to protest a geopolitical\u2026", "strategy": "Use it after baiting a counter-defense; deny the highest-value target before scoring.", "synergies": ["Asset denial", "Score pressure", "Tempo swing"], "counterplay": "Layer matching defenses and keep a backup counter online.", "keywords": ["adversary"], "art": "/art/cards/jackal.svg", "alt": "JACKAL \u2014 attack card. Adversary archetype. Strike an enemy for 3 network damage. The rival also loses 1 score for 2 rounds.", "archiveText": "When played, search your deck for an Attack card and add it to your hand, then shuffle. Your opponent loses 1 point each round this card is in play and an additional point if you have another Attack \u2013 Denial in play. Discard this card after 2 rounds.", "actions": [{ "kind": "damage", "amount": 3, "target": "chosen" }, { "kind": "ongoing", "effect": "drain", "amount": 1, "rounds": 2, "label": "JACKAL", "target": "chosen" }] },
  { "id": "job-fair", "name": "Job Fair", "type": "event", "subtype": "Event", "expansion": "classic", "set": "CTD Core Archive", "rarity": "common", "cost": 2, "target": "none", "text": "Gain 2 credits and draw 1 card.", "flavor": "A job fair is an event in which multiple employers, recruiters, and schools meet in a public place to give information to potential employees.", "strategy": "Timing is the whole card. Hold it until it changes a round, not just a turn.", "synergies": ["Turn control", "Card advantage", "Round math"], "counterplay": "Track the opponent\u2019s credits and force an earlier commitment.", "keywords": ["event"], "art": "/art/cards/job-fair.svg", "alt": "Job Fair \u2014 event card. Event archetype. Gain 2 credits and draw 1 card.", "archiveText": "When played, all players may search their deck for a Personnel type card and place it into their hand, then shuffle their deck. Discard this card.", "actions": [{ "kind": "credits", "amount": 2, "target": "self" }, { "kind": "draw", "amount": 1, "target": "self" }] },
  { "id": "laptop-computer", "name": "Laptop Computer", "type": "asset", "subtype": "System", "expansion": "classic", "set": "CTD Core Archive", "rarity": "common", "cost": 2, "target": "none", "text": "Deploy a System asset. Scores 1 at round end.", "flavor": "A typical laptop computer that can be used to connect to the Internet via a Wireless Router.", "strategy": "Build the network wide and force opponents to spend attacks on multiple scoring nodes.", "synergies": ["Economy engines", "Protect the network", "Score snowball"], "counterplay": "Attack it the moment it lands, before the next round-end scoring step.", "keywords": ["system"], "art": "/art/cards/laptop-computer.svg", "alt": "Laptop Computer \u2014 asset card. System archetype. Deploy a System asset. Scores 1 at round end.", "archiveText": "You must have a Wireless Network type card in play before playing this card. You receive 1 point each round this card is in play.", "actions": [], "passive": { "pointsPerRound": 1 } },
  { "id": "malicious-app", "name": "Malicious App", "type": "attack", "subtype": "Mobile", "expansion": "classic", "set": "CTD Core Archive", "rarity": "common", "cost": 5, "target": "enemyAsset", "text": "Take an enemy asset offline for 2 rounds. Its controller takes 3 network damage.", "flavor": "Your opponent downloaded a malicious app application onto their mobile device, which sends out their information when executed.", "strategy": "Use it after baiting a counter-defense; deny the highest-value target before scoring.", "synergies": ["Asset denial", "Score pressure", "Tempo swing"], "counterplay": "Layer matching defenses and keep a backup counter online.", "keywords": ["mobile"], "art": "/art/cards/malicious-app.svg", "alt": "Malicious App \u2014 attack card. Mobile archetype. Take an enemy asset offline for 2 rounds. Its controller takes 3 network damage.", "archiveText": "Select an Asset \u2013 System or Asset \u2013 Mobile card that your opponent has in play. That opponent loses 1 point per round.", "actions": [{ "kind": "disableAsset", "rounds": 2, "target": "chosenAsset" }, { "kind": "damage", "amount": 3, "target": "chosen" }] },
  { "id": "malware-analyst", "name": "Malware Analyst", "type": "asset", "subtype": "Personnel", "expansion": "classic", "set": "CTD Core Archive", "rarity": "common", "cost": 2, "target": "none", "text": "Deploy a Personnel asset. Scores 1 at round end.", "flavor": "Malware analysts meticulously examine malicious software to understand the nature of the threat. They investigate how malware infiltrates systems, the vulnerabilities\u2026", "strategy": "Build the network wide and force opponents to spend attacks on multiple scoring nodes.", "synergies": ["Economy engines", "Protect the network", "Score snowball"], "counterplay": "Attack it the moment it lands, before the next round-end scoring step.", "keywords": ["personnel"], "art": "/art/cards/malware-analyst.svg", "alt": "Malware Analyst \u2014 asset card. Personnel archetype. Deploy a Personnel asset. Scores 1 at round end.", "archiveText": "You gain 1 point at the end of the round for each Malware card in your opponent\u2019s discard pile, to a max of 4 points. Discard this card at the end of the round.", "actions": [], "passive": { "pointsPerRound": 1 } },
  { "id": "memory-leak", "name": "Memory Leak", "type": "event", "subtype": "Event", "expansion": "classic", "set": "CTD Core Archive", "rarity": "rare", "cost": 3, "target": "none", "text": "Gain 2 credits and draw 1 card.", "flavor": "An application is allocating memory for data storage but is not appropriately deallocating that memory, leading to a memory leak which reduces the resources available\u2026", "strategy": "Timing is the whole card. Hold it until it changes a round, not just a turn.", "synergies": ["Turn control", "Card advantage", "Round math"], "counterplay": "Track the opponent\u2019s credits and force an earlier commitment.", "keywords": ["event"], "art": "/art/cards/memory-leak.svg", "alt": "Memory Leak \u2014 event card. Event archetype. Gain 2 credits and draw 1 card.", "archiveText": "Select an opponent. That player must immediately discard one (1) card from their hand. Discard this card after its effect resolves.", "actions": [{ "kind": "credits", "amount": 2, "target": "self" }, { "kind": "draw", "amount": 1, "target": "self" }] },
  { "id": "mini-pc", "name": "Mini PC", "type": "asset", "subtype": "System", "expansion": "classic", "set": "CTD Core Archive", "rarity": "common", "cost": 3, "target": "none", "text": "Deploy a System asset. Scores 1 at round end and pays 1 credit each turn.", "flavor": "A Mini PC, also known as a small form factor PC, is a compact computer that generally offers the functionality of a desktop or laptop computer but in a smaller and\u2026", "strategy": "Build the network wide and force opponents to spend attacks on multiple scoring nodes.", "synergies": ["Economy engines", "Protect the network", "Score snowball"], "counterplay": "Attack it the moment it lands, before the next round-end scoring step.", "keywords": ["system"], "art": "/art/cards/mini-pc.svg", "alt": "Mini PC \u2014 asset card. System archetype. Deploy a System asset. Scores 1 at round end and pays 1 credit each turn.", "archiveText": "You gain 1 point each round.", "actions": [], "passive": { "pointsPerRound": 1, "creditsPerTurn": 1 } },
  { "id": "mitre-attck", "name": "MITRE ATT&CK", "type": "defense", "subtype": "Resource", "expansion": "classic", "set": "CTD Core Archive", "rarity": "common", "cost": 3, "target": "none", "text": "Counter denial attacks while armed (1 charge). Grants 1 armor.", "flavor": "MITRE ATT&CK is a globally-accessible knowledge base of adversary tactics that allows defenders to better understand attackers and be able to spot them more easily.", "strategy": "Hold this reactive answer for the attack type your rival has been telegraphing.", "synergies": ["Prediction", "Counter-hold", "Asset protection"], "counterplay": "Bait one charge, then follow with a different attack tag or an asset strike.", "keywords": ["denial"], "art": "/art/cards/mitre-attck.svg", "alt": "MITRE ATT&CK \u2014 defense card. Resource archetype. Counter denial attacks while armed (1 charge). Grants 1 armor.", "archiveText": "While in play, if you have 3 Defense cards, you may play one extra card during your turn. If you have no other defense cards in play, discard this card. If a Denial card is affecting you, this card\u2019s effect can\u2019t be used. You may only have 1 of this card in play.", "actions": [], "defense": { "blocks": ["denial"], "uses": 1, "armor": 1 } },
  { "id": "mobile-device-management", "name": "Mobile Device Management", "type": "defense", "subtype": "Software", "expansion": "classic", "set": "CTD Core Archive", "rarity": "common", "cost": 3, "target": "none", "text": "Counter malware, exploit attacks while armed (1 charge).", "flavor": "Mobile device management software allows devices to be remotely disabled in the event they have been stolen, lost or are inappropriately used on the network.", "strategy": "Hold this reactive answer for the attack type your rival has been telegraphing.", "synergies": ["Prediction", "Counter-hold", "Asset protection"], "counterplay": "Bait one charge, then follow with a different attack tag or an asset strike.", "keywords": ["malware", "exploit"], "art": "/art/cards/mobile-device-management.svg", "alt": "Mobile Device Management \u2014 defense card. Software archetype. Counter malware, exploit attacks while armed (1 charge).", "archiveText": "While in play, you may use this card\u2019s effect once per round to return a System, Wireless System or Mobile Asset card from your field to your deck and shuffle.", "actions": [], "defense": { "blocks": ["malware", "exploit"], "uses": 1 } },
  { "id": "netbleed", "name": "Netbleed", "type": "attack", "subtype": "Code Exploit", "expansion": "classic", "set": "CTD Core Archive", "rarity": "epic", "cost": 6, "target": "enemyPlayer", "text": "Strike an enemy for 5 network damage and drain 3 score.", "flavor": "A bug went undetected in your opponent\u2019s network causing them to leak data that hackers have now exploited.", "strategy": "Use it after baiting a counter-defense; deny the highest-value target before scoring.", "synergies": ["Asset denial", "Score pressure", "Tempo swing"], "counterplay": "Layer matching defenses and keep a backup counter online.", "keywords": ["exploit"], "art": "/art/cards/netbleed.svg", "alt": "Netbleed \u2014 attack card. Code Exploit archetype. Strike an enemy for 5 network damage and drain 3 score.", "archiveText": "Select an opponent who will choose to either discard the top card from their draw pile or lose 3 points at the end of the round. Discard this card at the end of the round.", "actions": [{ "kind": "damage", "amount": 5, "target": "chosen" }, { "kind": "drain", "amount": 3, "target": "chosen" }] },
  { "id": "network-dos", "name": "Network DoS", "type": "attack", "subtype": "Denial", "expansion": "classic", "set": "CTD Core Archive", "rarity": "common", "cost": 3, "target": "enemyPlayer", "text": "Strike an enemy for 2 network damage.", "flavor": "Adversaries may perform Network Denial of Service (DoS) attacks to degrade or block the availability of targeted resources to users. Example resources include\u2026", "strategy": "Use it after baiting a counter-defense; deny the highest-value target before scoring.", "synergies": ["Asset denial", "Score pressure", "Tempo swing"], "counterplay": "Layer matching defenses and keep a backup counter online.", "keywords": ["denial"], "art": "/art/cards/network-dos.svg", "alt": "Network DoS \u2014 attack card. Denial archetype. Strike an enemy for 2 network damage.", "archiveText": "Select an Attack \u2013 Denial card you have in play and return it to your hand. All of your opponent\u2019s System and Server Assets gain 0 points. Firewall does not affect this card. Discard this card at the end of the round.", "actions": [{ "kind": "damage", "amount": 2, "target": "chosen" }] },
  { "id": "office-laptop", "name": "Office Laptop", "type": "asset", "subtype": "System", "expansion": "classic", "set": "CTD Core Archive", "rarity": "legendary", "cost": 3, "target": "none", "text": "Deploy a System asset. Scores 1 at round end and pays 1 credit each turn.", "flavor": "A computer that is provided and used at a business by employees that can be taken home.", "strategy": "Build the network wide and force opponents to spend attacks on multiple scoring nodes.", "synergies": ["Economy engines", "Protect the network", "Score snowball"], "counterplay": "Attack it the moment it lands, before the next round-end scoring step.", "keywords": ["system"], "art": "/art/cards/office-laptop.svg", "alt": "Office Laptop \u2014 asset card. System archetype. Deploy a System asset. Scores 1 at round end and pays 1 credit each turn.", "archiveText": "Gain 1 point at the end of the round. As long as you have an Asset \u2013 Personnel or a Defense \u2013 Personnel card in play, gain 1 additional point.", "actions": [], "passive": { "pointsPerRound": 1, "creditsPerTurn": 1 } },
  { "id": "os-update-patch", "name": "OS Update/Patch", "type": "defense", "subtype": "Software Update", "expansion": "classic", "set": "CTD Core Archive", "rarity": "common", "cost": 3, "target": "none", "text": "Counter exploit, malware attacks while armed (1 charge).", "flavor": "You have received a notification that there is a critical update to your operation system (OS). It patches a security vulnerability that would allow attackers to take\u2026", "strategy": "Hold this reactive answer for the attack type your rival has been telegraphing.", "synergies": ["Prediction", "Counter-hold", "Asset protection"], "counterplay": "Bait one charge, then follow with a different attack tag or an asset strike.", "keywords": ["exploit", "malware"], "art": "/art/cards/os-update-patch.svg", "alt": "OS Update/Patch \u2014 defense card. Software Update archetype. Counter exploit, malware attacks while armed (1 charge).", "archiveText": "This card will prevent one (1) \u201CForgot to Patch OS\u201D event card, but this card must be in play before the Forgot to Patch OS event card is in play. You may only have one of this card in play.", "actions": [], "defense": { "blocks": ["exploit", "malware"], "uses": 1 } },
  { "id": "outdated-policy", "name": "Outdated Policy", "type": "event", "subtype": "Event", "expansion": "classic", "set": "CTD Core Archive", "rarity": "uncommon", "cost": 2, "target": "none", "text": "Gain 2 credits and draw 1 card.", "flavor": "One of your opponent\u2019s policies is outdated and has become useless. As technologies and threats evolve, it is important to ensure that policies are kept updated with\u2026", "strategy": "Timing is the whole card. Hold it until it changes a round, not just a turn.", "synergies": ["Turn control", "Card advantage", "Round math"], "counterplay": "Track the opponent\u2019s credits and force an earlier commitment.", "keywords": ["event"], "art": "/art/cards/outdated-policy.svg", "alt": "Outdated Policy \u2014 event card. Event archetype. Gain 2 credits and draw 1 card.", "archiveText": "Select a Defense \u2013 Policy card that an opponent has in play. The target card and this card are immediately discarded.", "actions": [{ "kind": "credits", "amount": 2, "target": "self" }, { "kind": "draw", "amount": 1, "target": "self" }] },
  { "id": "password-cracked", "name": "Password Cracked", "type": "attack", "subtype": "Hack", "expansion": "classic", "set": "CTD Core Archive", "rarity": "common", "cost": 4, "target": "enemyPlayer", "text": "Strike an enemy for 2 network damage. The rival also loses 1 score for 2 rounds.", "flavor": "Your opponent picked a bad or weak password. An attacker was able to guess the password and has accessed their accounts and system.", "strategy": "Use it after baiting a counter-defense; deny the highest-value target before scoring.", "synergies": ["Asset denial", "Score pressure", "Tempo swing"], "counterplay": "Layer matching defenses and keep a backup counter online.", "keywords": ["hack"], "art": "/art/cards/password-cracked.svg", "alt": "Password Cracked \u2014 attack card. Hack archetype. Strike an enemy for 2 network damage. The rival also loses 1 score for 2 rounds.", "archiveText": "Select an opponent. That opponent loses one (1) point each round for two (2) rounds. Remove this card from play after two rounds.", "actions": [{ "kind": "damage", "amount": 2, "target": "chosen" }, { "kind": "ongoing", "effect": "drain", "amount": 1, "rounds": 2, "label": "Password Cracked", "target": "chosen" }] },
  { "id": "penetration-tester", "name": "Penetration Tester", "type": "defense", "subtype": "Personnel", "expansion": "classic", "set": "CTD Core Archive", "rarity": "uncommon", "cost": 3, "target": "none", "text": "Counter exploit, personnel, social attacks while armed (1 charge).", "flavor": "Penetration testers are authorized personnel tasked with breaking into and finding vulnerabilities in computers and networks before outside intruders can cause harm.", "strategy": "Hold this reactive answer for the attack type your rival has been telegraphing.", "synergies": ["Prediction", "Counter-hold", "Asset protection"], "counterplay": "Bait one charge, then follow with a different attack tag or an asset strike.", "keywords": ["exploit", "personnel", "social"], "art": "/art/cards/penetration-tester.svg", "alt": "Penetration Tester \u2014 defense card. Personnel archetype. Counter exploit, personnel, social attacks while armed (1 charge).", "archiveText": "Search your deck for a Defense card that removes an Attack card your opponent has in play. Show your opponent the drawn card, then put that card into your hand and shuffle the deck. Discard this card after shuffling.", "actions": [], "defense": { "blocks": ["exploit", "personnel", "social"], "uses": 1 } },
  { "id": "phishing-training", "name": "Phishing Training", "type": "event", "subtype": "Event", "expansion": "classic", "set": "CTD Core Archive", "rarity": "rare", "cost": 3, "target": "none", "text": "Gain 2 credits and draw 1 card.", "flavor": "You attended a special security training course that taught you all about popular email scams so that you don\u2019t fall victim to those attacks.", "strategy": "Timing is the whole card. Hold it until it changes a round, not just a turn.", "synergies": ["Turn control", "Card advantage", "Round math"], "counterplay": "Track the opponent\u2019s credits and force an earlier commitment.", "keywords": ["event"], "art": "/art/cards/phishing-training.svg", "alt": "Phishing Training \u2014 event card. Event archetype. Gain 2 credits and draw 1 card.", "archiveText": "Select a Phishing or Spear Phishing attack card that is in play and affecting you. Both this card and the target card are discarded.", "actions": [{ "kind": "credits", "amount": 2, "target": "self" }, { "kind": "draw", "amount": 1, "target": "self" }] },
  { "id": "phishing", "name": "Phishing", "type": "attack", "subtype": "Phishing", "expansion": "classic", "set": "CTD Core Archive", "rarity": "epic", "cost": 6, "target": "enemyPlayer", "text": "Strike an enemy for 6 network damage. The rival also loses 2 score for 2 rounds.", "flavor": "Your opponent responded to an email asking for their security/login information. The attacker can now access your opponent\u2019s account and system.", "strategy": "Use it after baiting a counter-defense; deny the highest-value target before scoring.", "synergies": ["Asset denial", "Score pressure", "Tempo swing"], "counterplay": "Layer matching defenses and keep a backup counter online.", "keywords": ["phishing"], "art": "/art/cards/phishing.svg", "alt": "Phishing \u2014 attack card. Phishing archetype. Strike an enemy for 6 network damage. The rival also loses 2 score for 2 rounds.", "archiveText": "Select an opponent. That opponent loses two (2) points each round for two (2) rounds. Remove this card from play after two rounds.", "actions": [{ "kind": "damage", "amount": 6, "target": "chosen" }, { "kind": "ongoing", "effect": "drain", "amount": 2, "rounds": 2, "label": "Phishing", "target": "chosen" }] },
  { "id": "ping-flood", "name": "Ping Flood", "type": "attack", "subtype": "Denial", "expansion": "classic", "set": "CTD Core Archive", "rarity": "common", "cost": 5, "target": "enemyAsset", "text": "Take an enemy asset offline for 2 rounds. Its controller takes 3 network damage.", "flavor": "An unknown adversary is consistently attacking your opponent\u2019s network with a denial of service attack. The systems are being flooded with random packets of data.", "strategy": "Use it after baiting a counter-defense; deny the highest-value target before scoring.", "synergies": ["Asset denial", "Score pressure", "Tempo swing"], "counterplay": "Layer matching defenses and keep a backup counter online.", "keywords": ["denial"], "art": "/art/cards/ping-flood.svg", "alt": "Ping Flood \u2014 attack card. Denial archetype. Take an enemy asset offline for 2 rounds. Its controller takes 3 network damage.", "archiveText": "Select a System or Server card that your opponent has in play. That target cannot gain any points while this card is in play. At the beginning of your turn, you may return this card from play to your hand.", "actions": [{ "kind": "disableAsset", "rounds": 2, "target": "chosenAsset" }, { "kind": "damage", "amount": 3, "target": "chosen" }] },
  { "id": "ping-of-death", "name": "Ping of Death", "type": "attack", "subtype": "Denial", "expansion": "classic", "set": "CTD Core Archive", "rarity": "common", "cost": 4, "target": "enemyAsset", "text": "Take an enemy asset offline for 2 rounds. Its controller takes 1 network damage.", "flavor": "A malformed ping packet was sent to your opponent\u2019s computer system, which caused a buffer overflow when rebuilt. This caused the system to crash and be injected with\u2026", "strategy": "Use it after baiting a counter-defense; deny the highest-value target before scoring.", "synergies": ["Asset denial", "Score pressure", "Tempo swing"], "counterplay": "Layer matching defenses and keep a backup counter online.", "keywords": ["denial"], "art": "/art/cards/ping-of-death.svg", "alt": "Ping of Death \u2014 attack card. Denial archetype. Take an enemy asset offline for 2 rounds. Its controller takes 1 network damage.", "archiveText": "Select an opponent\u2019s Asset \u2013 System card. That opponent must discard 1 card before drawing at the end of their turn and the targeted System does not generate any points each round. You may only have one Ping of Death in play at a time.", "actions": [{ "kind": "disableAsset", "rounds": 2, "target": "chosenAsset" }, { "kind": "damage", "amount": 1, "target": "chosen" }] },
  { "id": "play-ransomware", "name": "PLAY Ransomware", "type": "attack", "subtype": "Malware", "expansion": "classic", "set": "CTD Core Archive", "rarity": "uncommon", "cost": 4, "target": "enemyAsset", "text": "Take an enemy asset offline for 2 rounds. Its controller takes 2 network damage.", "flavor": "PLAY Ransomware implements anti-analysis techniques, including call-stack obfuscation, opaque predicates, garbage code, dynamic API function pointer encryption, and\u2026", "strategy": "Use it after baiting a counter-defense; deny the highest-value target before scoring.", "synergies": ["Asset denial", "Score pressure", "Tempo swing"], "counterplay": "Layer matching defenses and keep a backup counter online.", "keywords": ["malware"], "art": "/art/cards/play-ransomware.svg", "alt": "PLAY Ransomware \u2014 attack card. Malware archetype. Take an enemy asset offline for 2 rounds. Its controller takes 2 network damage.", "archiveText": "Select an Asset \u2013 System or Server that your opponent has in play; if RECESS SPIDER is in play, you may select an additional System or Server. The selected Assets receive no points while this card is in play. Remove 1 point per round while this card is in play. Discard this card after 2 rounds.", "actions": [{ "kind": "disableAsset", "rounds": 2, "target": "chosenAsset" }, { "kind": "damage", "amount": 2, "target": "chosen" }] },
  { "id": "polymorphic-malware", "name": "Polymorphic Malware", "type": "attack", "subtype": "Malware", "expansion": "classic", "set": "CTD Core Archive", "rarity": "common", "cost": 4, "target": "enemyPlayer", "text": "Strike an enemy for 3 network damage and drain 2 score.", "flavor": "Polymorphism means \u201Cto change the appearance of\u201D something. This malware has the ability to redefine its signature, or how the code appears to anti-virus scanners,\u2026", "strategy": "Use it after baiting a counter-defense; deny the highest-value target before scoring.", "synergies": ["Asset denial", "Score pressure", "Tempo swing"], "counterplay": "Layer matching defenses and keep a backup counter online.", "keywords": ["malware"], "art": "/art/cards/polymorphic-malware.svg", "alt": "Polymorphic Malware \u2014 attack card. Malware archetype. Strike an enemy for 3 network damage and drain 2 score.", "archiveText": "This card cannot be affected by Anti-Malware/Virus defense cards. Select an opponent. That opponent loses 2 points this round. Remove this card from play after 1 round.", "actions": [{ "kind": "damage", "amount": 3, "target": "chosen" }, { "kind": "drain", "amount": 2, "target": "chosen" }] },
  { "id": "poor-encryption-key", "name": "Poor Encryption Key", "type": "event", "subtype": "Event", "expansion": "classic", "set": "CTD Core Archive", "rarity": "common", "cost": 2, "target": "none", "text": "Gain 2 credits and draw 1 card.", "flavor": "Your opponent chose a very poor wireless encryption key which allowed an attacker to crack or break it, thus gaining the ability to monitor their wireless traffic.", "strategy": "Timing is the whole card. Hold it until it changes a round, not just a turn.", "synergies": ["Turn control", "Card advantage", "Round math"], "counterplay": "Track the opponent\u2019s credits and force an earlier commitment.", "keywords": ["event"], "art": "/art/cards/poor-encryption-key.svg", "alt": "Poor Encryption Key \u2014 event card. Event archetype. Gain 2 credits and draw 1 card.", "archiveText": "Select an Encryption card that your opponent has in play. Both this card and the target Encryption card are discarded.", "actions": [{ "kind": "credits", "amount": 2, "target": "self" }, { "kind": "draw", "amount": 1, "target": "self" }] },
  { "id": "power-outage", "name": "Power Outage", "type": "event", "subtype": "Event", "expansion": "classic", "set": "CTD Core Archive", "rarity": "rare", "cost": 3, "target": "enemyPlayer", "text": "Drain 1 score from an enemy.", "flavor": "Your opponent experiences a loss of electrical power. This means that no work can be accomplished.", "strategy": "Timing is the whole card. Hold it until it changes a round, not just a turn.", "synergies": ["Turn control", "Card advantage", "Round math"], "counterplay": "Track the opponent\u2019s credits and force an earlier commitment.", "keywords": ["event"], "art": "/art/cards/power-outage.svg", "alt": "Power Outage \u2014 event card. Event archetype. Drain 1 score from an enemy.", "archiveText": "Select an opponent. That opponent loses their turn and receives no points during that round for any of their Asset cards.", "actions": [{ "kind": "drain", "amount": 1, "target": "chosen" }] },
  { "id": "privacy-violation", "name": "Privacy Violation", "type": "event", "subtype": "Event", "expansion": "classic", "set": "CTD Core Archive", "rarity": "legendary", "cost": 3, "target": "none", "text": "Gain 2 credits and draw 1 card.", "flavor": "Your opponent\u2019s data has been audited, and it appears that some personal information is not being properly removed from the data before being shared. This privacy\u2026", "strategy": "Timing is the whole card. Hold it until it changes a round, not just a turn.", "synergies": ["Turn control", "Card advantage", "Round math"], "counterplay": "Track the opponent\u2019s credits and force an earlier commitment.", "keywords": ["event"], "art": "/art/cards/privacy-violation.svg", "alt": "Privacy Violation \u2014 event card. Event archetype. Gain 2 credits and draw 1 card.", "archiveText": "Select an Asset \u2013 Data card that your opponent has in play. That card now has a value of -3 for this round. Discard Privacy Violation at the end of this round.", "actions": [{ "kind": "credits", "amount": 2, "target": "self" }, { "kind": "draw", "amount": 1, "target": "self" }] },
  { "id": "purple-team", "name": "Purple Team", "type": "defense", "subtype": "Personnel", "expansion": "classic", "set": "CTD Core Archive", "rarity": "common", "cost": 4, "target": "none", "text": "Counter social, personnel attacks while armed (2 charges).", "flavor": "Purple teaming is a collaborative approach to cybersecurity that brings together red and blue teams to test and improve an organization\u2019s security posture.", "strategy": "Hold this reactive answer for the attack type your rival has been telegraphing.", "synergies": ["Prediction", "Counter-hold", "Asset protection"], "counterplay": "Bait one charge, then follow with a different attack tag or an asset strike.", "keywords": ["social", "personnel"], "art": "/art/cards/purple-team.svg", "alt": "Purple Team \u2014 defense card. Personnel archetype. Counter social, personnel attacks while armed (2 charges).", "archiveText": "While in play, if you play an Attack card your opponent cannot play an Attack with the same subtype on their next turn _unless_ you play a new Attack card. If you have either a Red Team or Blue Team card in play you may perform that card\u2019s first effect twice when activated.", "actions": [], "defense": { "blocks": ["social", "personnel"], "uses": 2 } },
  { "id": "rackspace-managed-services", "name": "Rackspace Managed Services", "type": "defense", "subtype": "Defense", "expansion": "classic", "set": "CTD Core Archive", "rarity": "common", "cost": 3, "target": "none", "text": "Counter malware attacks while armed (1 charge).", "flavor": "You establish a contract with specialist from Rackspace Managed Services (RMS) which helps to automate security processes, quickly detecting and ejecting threats to\u2026", "strategy": "Hold this reactive answer for the attack type your rival has been telegraphing.", "synergies": ["Prediction", "Counter-hold", "Asset protection"], "counterplay": "Bait one charge, then follow with a different attack tag or an asset strike.", "keywords": ["malware"], "art": "/art/cards/rackspace-managed-services.svg", "alt": "Rackspace Managed Services \u2014 defense card. Defense archetype. Counter malware attacks while armed (1 charge).", "archiveText": "While this card is in play, all Attack cards that target you expire in one round instead of their usual timeframe. Remove this card from play after 3 rounds.", "actions": [], "defense": { "blocks": ["malware"], "uses": 1 } },
  { "id": "ransomware", "name": "Ransomware", "type": "attack", "subtype": "Malware", "expansion": "classic", "set": "CTD Core Archive", "rarity": "uncommon", "cost": 4, "target": "enemyAsset", "text": "Take an enemy asset offline for 1 round. Its controller takes 3 network damage.", "flavor": "Your opponent clicked on a link which ran a program that encrypted all of their files and left a message demanding payment to get those files encrypted.", "strategy": "Use it after baiting a counter-defense; deny the highest-value target before scoring.", "synergies": ["Asset denial", "Score pressure", "Tempo swing"], "counterplay": "Layer matching defenses and keep a backup counter online.", "keywords": ["malware"], "art": "/art/cards/ransomware.svg", "alt": "Ransomware \u2014 attack card. Malware archetype. Take an enemy asset offline for 1 round. Its controller takes 3 network damage.", "archiveText": "Select an Asset \u2013 System card that your opponent has in play. They receive no points from that Asset \u2013 System for 3 rounds. Remove this card from play after 3 rounds.", "actions": [{ "kind": "disableAsset", "rounds": 1, "target": "chosenAsset" }, { "kind": "damage", "amount": 3, "target": "chosen" }] },
  { "id": "recess-spider", "name": "RECESS SPIDER", "type": "attack", "subtype": "Adversary", "expansion": "classic", "set": "CTD Core Archive", "rarity": "uncommon", "cost": 4, "target": "enemyPlayer", "text": "Strike an enemy for 2 network damage. The rival also loses 1 score for 2 rounds.", "flavor": "RECESS SPIDER is a \u201Cbig game hunting\u201D adversary that deploys PLAY ransomware to opportunistically encrypt victims across several sectors and geographical regions.", "strategy": "Use it after baiting a counter-defense; deny the highest-value target before scoring.", "synergies": ["Asset denial", "Score pressure", "Tempo swing"], "counterplay": "Layer matching defenses and keep a backup counter online.", "keywords": ["adversary"], "art": "/art/cards/recess-spider.svg", "alt": "RECESS SPIDER \u2014 attack card. Adversary archetype. Strike an enemy for 2 network damage. The rival also loses 1 score for 2 rounds.", "archiveText": "Remove 2 points from your opponent while this card is in play. If you have Ransomware in play, remove 3 points instead. Discard this card after 2 rounds.", "actions": [{ "kind": "damage", "amount": 2, "target": "chosen" }, { "kind": "ongoing", "effect": "drain", "amount": 1, "rounds": 2, "label": "RECESS SPIDER", "target": "chosen" }] },
  { "id": "recruitment-drive", "name": "Recruitment Drive", "type": "event", "subtype": "Event", "expansion": "classic", "set": "CTD Core Archive", "rarity": "common", "cost": 2, "target": "none", "text": "Draw 2 cards.", "flavor": "You hold a recruitment drive in an attempt to bring in new personnel to your workforce.", "strategy": "Timing is the whole card. Hold it until it changes a round, not just a turn.", "synergies": ["Turn control", "Card advantage", "Round math"], "counterplay": "Track the opponent\u2019s credits and force an earlier commitment.", "keywords": ["event"], "art": "/art/cards/recruitment-drive.svg", "alt": "Recruitment Drive \u2014 event card. Event archetype. Draw 2 cards.", "archiveText": "Discard 1 card from your hand then draw 3 cards. Remove this card at the end of the round.", "actions": [{ "kind": "draw", "amount": 2, "target": "self" }] },
  { "id": "red-team", "name": "Red Team", "type": "defense", "subtype": "Personnel", "expansion": "classic", "set": "CTD Core Archive", "rarity": "common", "cost": 3, "target": "none", "text": "Counter social, personnel attacks while armed (1 charge).", "flavor": "Red Teams are a group that plays the role of an enemy or adversary to provide security feedback from that perspective.", "strategy": "Hold this reactive answer for the attack type your rival has been telegraphing.", "synergies": ["Prediction", "Counter-hold", "Asset protection"], "counterplay": "Bait one charge, then follow with a different attack tag or an asset strike.", "keywords": ["social", "personnel"], "art": "/art/cards/red-team.svg", "alt": "Red Team \u2014 defense card. Personnel archetype. Counter social, personnel attacks while armed (1 charge).", "archiveText": "When you play an Attack card you can choose to discard it at the end of the round and gain the points that it would remove from your opponent instead. If you have a Blue Team or Purple Team card in play, draw one card from your deck once for this card.", "actions": [], "defense": { "blocks": ["social", "personnel"], "uses": 1 } },
  { "id": "redundant-system", "name": "Redundant System", "type": "defense", "subtype": "Defense", "expansion": "classic", "set": "CTD Core Archive", "rarity": "rare", "cost": 3, "target": "none", "text": "Counter malware attacks while armed (1 charge).", "flavor": "Networks and devices will eventually fail. In fact, the expectation is so high that it is measured as the Mean Time To Failure (MTTF). Redundant systems are used as\u2026", "strategy": "Hold this reactive answer for the attack type your rival has been telegraphing.", "synergies": ["Prediction", "Counter-hold", "Asset protection"], "counterplay": "Bait one charge, then follow with a different attack tag or an asset strike.", "keywords": ["malware"], "art": "/art/cards/redundant-system.svg", "alt": "Redundant System \u2014 defense card. Defense archetype. Counter malware attacks while armed (1 charge).", "archiveText": "When one of your Assets would be removed from play, you may instead choose to remove this Redundant System card from play.", "actions": [], "defense": { "blocks": ["malware"], "uses": 1 } },
  { "id": "resource-hijacking", "name": "Resource Hijacking", "type": "attack", "subtype": "Hack", "expansion": "classic", "set": "CTD Core Archive", "rarity": "epic", "cost": 6, "target": "enemyAsset", "text": "Take an enemy asset offline for 1 round. Its controller takes 5 network damage.", "flavor": "Adversaries may leverage the resources of co-opted systems in order to use the resources. This may impact system and/or hosted service availability.", "strategy": "Use it after baiting a counter-defense; deny the highest-value target before scoring.", "synergies": ["Asset denial", "Score pressure", "Tempo swing"], "counterplay": "Layer matching defenses and keep a backup counter online.", "keywords": ["hack"], "art": "/art/cards/resource-hijacking.svg", "alt": "Resource Hijacking \u2014 attack card. Hack archetype. Take an enemy asset offline for 1 round. Its controller takes 5 network damage.", "archiveText": "Select an opponent\u2019s System or Server Asset card. Your opponent does not earn any points for that Asset. For each point that Asset would have gained, your opponents loses that many points. Discard this card after 1 round.", "actions": [{ "kind": "disableAsset", "rounds": 1, "target": "chosenAsset" }, { "kind": "damage", "amount": 5, "target": "chosen" }] },
  { "id": "rogue-employee", "name": "Rogue Employee", "type": "attack", "subtype": "Personnel", "expansion": "classic", "set": "CTD Core Archive", "rarity": "rare", "cost": 5, "target": "enemyPlayer", "text": "Strike an enemy for 5 network damage and drain 2 score.", "flavor": "A disgruntled employee that works for your opponent intentionally allowed a major data breach to occur. The employee has been caught and fired.", "strategy": "Use it after baiting a counter-defense; deny the highest-value target before scoring.", "synergies": ["Asset denial", "Score pressure", "Tempo swing"], "counterplay": "Layer matching defenses and keep a backup counter online.", "keywords": ["personnel"], "art": "/art/cards/rogue-employee.svg", "alt": "Rogue Employee \u2014 attack card. Personnel archetype. Strike an enemy for 5 network damage and drain 2 score.", "archiveText": "Remove a Personnel card, excluding Attack \u2013 Personnel, that an opponent has in play. If that opponent has no Personnel in play, excluding Attack \u2013 Personnel, remove one of their Defense cards instead. That opponent loses 2 points at the end of the round. Discard this card at the end of the round.", "actions": [{ "kind": "damage", "amount": 5, "target": "chosen" }, { "kind": "drain", "amount": 2, "target": "chosen" }] },
  { "id": "rootkit-malware-loader", "name": "Rootkit Malware Loader", "type": "attack", "subtype": "Malware", "expansion": "classic", "set": "CTD Core Archive", "rarity": "uncommon", "cost": 4, "target": "enemyPlayer", "text": "Strike an enemy for 4 network damage.", "flavor": "Rootkits often conceal their presence or presence of other malware. Many rootkits also have the ability to download other malicious software onto their host.", "strategy": "Use it after baiting a counter-defense; deny the highest-value target before scoring.", "synergies": ["Asset denial", "Score pressure", "Tempo swing"], "counterplay": "Layer matching defenses and keep a backup counter online.", "keywords": ["malware"], "art": "/art/cards/rootkit-malware-loader.svg", "alt": "Rootkit Malware Loader \u2014 attack card. Malware archetype. Strike an enemy for 4 network damage.", "archiveText": "This card is immune to Software and can\u2019t be returned from the discard pile. During your turn you may return one Malware from your discard pile to the bottom of your deck. You may only have one copy of this card in play.", "actions": [{ "kind": "damage", "amount": 4, "target": "chosen" }] },
  { "id": "scattered-spider", "name": "SCATTERED SPIDER", "type": "attack", "subtype": "Adversary", "expansion": "classic", "set": "CTD Core Archive", "rarity": "common", "cost": 4, "target": "enemyPlayer", "text": "Strike an enemy for 3 network damage. The rival also loses 1 score for 2 rounds.", "flavor": "SCATTERED SPIDER is an eCrime adversary who conducts targeted social-engineering campaigns primarily against firms specializing in customer relationship management\u2026", "strategy": "Use it after baiting a counter-defense; deny the highest-value target before scoring.", "synergies": ["Asset denial", "Score pressure", "Tempo swing"], "counterplay": "Layer matching defenses and keep a backup counter online.", "keywords": ["adversary"], "art": "/art/cards/scattered-spider.svg", "alt": "SCATTERED SPIDER \u2014 attack card. Adversary archetype. Strike an enemy for 3 network damage. The rival also loses 1 score for 2 rounds.", "archiveText": "Select an opponent. That opponent loses 1 point each round until this card is discarded. While in play, you may play 1 Attack \u2013 Phishing or Social Engineering card that does not count toward your playable card limit. Discard this card after 2 rounds.", "actions": [{ "kind": "damage", "amount": 3, "target": "chosen" }, { "kind": "ongoing", "effect": "drain", "amount": 1, "rounds": 2, "label": "SCATTERED SPIDER", "target": "chosen" }] },
  { "id": "scholarship-for-service", "name": "Scholarship for Service", "type": "asset", "subtype": "Asset", "expansion": "classic", "set": "CTD Core Archive", "rarity": "uncommon", "cost": 4, "target": "none", "text": "Deploy a Asset asset. Scores 2 at round end and pays 1 credit each turn.", "flavor": "One of your cybersecurity interns was selected by the CyberCorps program, which strengthens the educational development of information assurance professionals. This\u2026", "strategy": "Build the network wide and force opponents to spend attacks on multiple scoring nodes.", "synergies": ["Economy engines", "Protect the network", "Score snowball"], "counterplay": "Attack it the moment it lands, before the next round-end scoring step.", "keywords": ["asset"], "art": "/art/cards/scholarship-for-service.svg", "alt": "Scholarship for Service \u2014 asset card. Asset archetype. Deploy a Asset asset. Scores 2 at round end and pays 1 credit each turn.", "archiveText": "You gain 2 points per round for 2 rounds. At the end of the second round, remove this card from play.", "actions": [], "passive": { "pointsPerRound": 2, "creditsPerTurn": 1 } },
  { "id": "scientific-research", "name": "Scientific Research", "type": "asset", "subtype": "Data", "expansion": "classic", "set": "CTD Core Archive", "rarity": "common", "cost": 2, "target": "none", "text": "Deploy a Data asset. Scores 1 at round end.", "flavor": "You have the opportunity to review, process and store a significant amount of cutting-edge research from major universities all around the world.", "strategy": "Build the network wide and force opponents to spend attacks on multiple scoring nodes.", "synergies": ["Economy engines", "Protect the network", "Score snowball"], "counterplay": "Attack it the moment it lands, before the next round-end scoring step.", "keywords": ["data"], "art": "/art/cards/scientific-research.svg", "alt": "Scientific Research \u2014 asset card. Data archetype. Deploy a Data asset. Scores 1 at round end.", "archiveText": "Attach this card to an Asset \u2013 Server that you have in play. You gain 1 point each round this card is in play.", "actions": [], "passive": { "pointsPerRound": 1 } },
  { "id": "search-engine", "name": "Search Engine", "type": "asset", "subtype": "Asset", "expansion": "classic", "set": "CTD Core Archive", "rarity": "common", "cost": 2, "target": "none", "text": "Deploy a Asset asset. Scores 1 at round end.", "flavor": "A search engine is a powerful information retrieval tool that crawls through and indexes large sets of complex data. Once the data is indexed, it is possible to\u2026", "strategy": "Build the network wide and force opponents to spend attacks on multiple scoring nodes.", "synergies": ["Economy engines", "Protect the network", "Score snowball"], "counterplay": "Attack it the moment it lands, before the next round-end scoring step.", "keywords": ["asset"], "art": "/art/cards/search-engine.svg", "alt": "Search Engine \u2014 asset card. Asset archetype. Deploy a Asset asset. Scores 1 at round end.", "archiveText": "While this card is in play, at the beginning of your turn, you may draw two cards from your deck. If you do so, immediately place one of these two cards into your hand, and put the other at the bottom of your deck.", "actions": [], "passive": { "pointsPerRound": 1 } },
  { "id": "secure-coding-practices", "name": "Secure Coding Practices", "type": "defense", "subtype": "Policy", "expansion": "classic", "set": "CTD Core Archive", "rarity": "rare", "cost": 3, "target": "none", "text": "Counter exploit, social, phishing attacks while armed (1 charge). Grants 1 armor.", "flavor": "Many vulnerabilities in computer systems come from programming errors found in software. You have implemented training and code review policies that significantly\u2026", "strategy": "Hold this reactive answer for the attack type your rival has been telegraphing.", "synergies": ["Prediction", "Counter-hold", "Asset protection"], "counterplay": "Bait one charge, then follow with a different attack tag or an asset strike.", "keywords": ["exploit", "social", "phishing"], "art": "/art/cards/secure-coding-practices.svg", "alt": "Secure Coding Practices \u2014 defense card. Policy archetype. Counter exploit, social, phishing attacks while armed (1 charge). Grants 1 armor.", "archiveText": "This card prevents all Attack \u2013 Code Exploit cards from affecting you.", "actions": [], "defense": { "blocks": ["exploit", "social", "phishing"], "uses": 1, "armor": 1 } },
  { "id": "security-manager", "name": "Security Manager", "type": "asset", "subtype": "Personnel", "expansion": "classic", "set": "CTD Core Archive", "rarity": "common", "cost": 2, "target": "none", "text": "Deploy a Personnel asset. Scores 1 at round end.", "flavor": "Security Managers create and execute security strategies based on the input from the Security Director and/or the CISO. They must also test and implement new security\u2026", "strategy": "Build the network wide and force opponents to spend attacks on multiple scoring nodes.", "synergies": ["Economy engines", "Protect the network", "Score snowball"], "counterplay": "Attack it the moment it lands, before the next round-end scoring step.", "keywords": ["personnel"], "art": "/art/cards/security-manager.svg", "alt": "Security Manager \u2014 asset card. Personnel archetype. Deploy a Personnel asset. Scores 1 at round end.", "archiveText": "Before your draw phase, you may choose to put 1 card from your hand at the bottom of your deck and then draw 1 card.", "actions": [], "passive": { "pointsPerRound": 1 } },
  { "id": "security-operations-center", "name": "Security Operations Center", "type": "defense", "subtype": "Service", "expansion": "classic", "set": "CTD Core Archive", "rarity": "rare", "cost": 3, "target": "none", "text": "Counter recon, breach attacks while armed (1 charge).", "flavor": "Security operations centers, or SOCs, monitor and analyze activity on networks looking for anomalous activity. The SOC is responsible for ensuring that security\u2026", "strategy": "Hold this reactive answer for the attack type your rival has been telegraphing.", "synergies": ["Prediction", "Counter-hold", "Asset protection"], "counterplay": "Bait one charge, then follow with a different attack tag or an asset strike.", "keywords": ["recon", "breach"], "art": "/art/cards/security-operations-center.svg", "alt": "Security Operations Center \u2014 defense card. Service archetype. Counter recon, breach attacks while armed (1 charge).", "archiveText": "When an Attack is played against you, you may play a Defense from your hand _as an_ _Event_. On your next turn, you have 1 less playable card. When you play a Defense card while this card is in play you may discard one card from your hand and draw a new card.", "actions": [], "defense": { "blocks": ["recon", "breach"], "uses": 1 } },
  { "id": "security-systems-administrator", "name": "Security Systems Administrator", "type": "defense", "subtype": "Personnel", "expansion": "classic", "set": "CTD Core Archive", "rarity": "common", "cost": 3, "target": "none", "text": "Counter phishing, social, hack attacks while armed (1 charge). Grants 1 armor.", "flavor": "The security systems administrator is in charge of system monitoring, running regular backups, and setting up, deleting and maintaining individual user accounts.", "strategy": "Hold this reactive answer for the attack type your rival has been telegraphing.", "synergies": ["Prediction", "Counter-hold", "Asset protection"], "counterplay": "Bait one charge, then follow with a different attack tag or an asset strike.", "keywords": ["phishing", "social", "hack"], "art": "/art/cards/security-systems-administrator.svg", "alt": "Security Systems Administrator \u2014 defense card. Personnel archetype. Counter phishing, social, hack attacks while armed (1 charge). Grants 1 armor.", "archiveText": "Prevents Attack \u2013 Hack, Data Breach and Phishing type cards from being played. Discard this card after 3 rounds.", "actions": [], "defense": { "blocks": ["phishing", "social", "hack"], "uses": 1, "armor": 1 } },
  { "id": "security-training", "name": "Security Training", "type": "event", "subtype": "Event", "expansion": "classic", "set": "CTD Core Archive", "rarity": "common", "cost": 2, "target": "none", "text": "Gain 2 credits and draw 1 card.", "flavor": "You attended a security training course to learn about ways you can improve your security.", "strategy": "Timing is the whole card. Hold it until it changes a round, not just a turn.", "synergies": ["Turn control", "Card advantage", "Round math"], "counterplay": "Track the opponent\u2019s credits and force an earlier commitment.", "keywords": ["event"], "art": "/art/cards/security-training.svg", "alt": "Security Training \u2014 event card. Event archetype. Gain 2 credits and draw 1 card.", "archiveText": "Select either a Password Cracked or a Phishing card that an opponent has in play. When played, both this card and the target card are discarded.", "actions": [{ "kind": "credits", "amount": 2, "target": "self" }, { "kind": "draw", "amount": 1, "target": "self" }] },
  { "id": "sirefef-trojan", "name": "Sirefef Trojan", "type": "attack", "subtype": "Malware", "expansion": "classic", "set": "CTD Core Archive", "rarity": "common", "cost": 3, "target": "enemyPlayer", "text": "Strike an enemy for 2 network damage.", "flavor": "The Sirefef family of trojan horses can disable security features as well as download and run other files.", "strategy": "Use it after baiting a counter-defense; deny the highest-value target before scoring.", "synergies": ["Asset denial", "Score pressure", "Tempo swing"], "counterplay": "Layer matching defenses and keep a backup counter online.", "keywords": ["malware"], "art": "/art/cards/sirefef-trojan.svg", "alt": "Sirefef Trojan \u2014 attack card. Malware archetype. Strike an enemy for 2 network damage.", "archiveText": "This Trojan Horse is immune to Software and can\u2019t be returned from the discard pile. If your selected opponent has any Defense \u2013 Software cards in play, they must shuffle them into their deck. Discard this card at the end of the round.", "actions": [{ "kind": "damage", "amount": 2, "target": "chosen" }] },
  { "id": "smartphone", "name": "Smartphone", "type": "asset", "subtype": "Mobile", "expansion": "classic", "set": "CTD Core Archive", "rarity": "uncommon", "cost": 2, "target": "none", "text": "Deploy a Mobile asset. Scores 1 at round end.", "flavor": "A pocket-sized consumer device that allows for mobile connectivity to the Internet through cellular and wireless networks. Offers voice, VoIP and video calling, as\u2026", "strategy": "Build the network wide and force opponents to spend attacks on multiple scoring nodes.", "synergies": ["Economy engines", "Protect the network", "Score snowball"], "counterplay": "Attack it the moment it lands, before the next round-end scoring step.", "keywords": ["mobile"], "art": "/art/cards/smartphone.svg", "alt": "Smartphone \u2014 asset card. Mobile archetype. Deploy a Mobile asset. Scores 1 at round end.", "archiveText": "You gain 1 point each round.", "actions": [], "passive": { "pointsPerRound": 1 } },
  { "id": "smishing", "name": "Smishing", "type": "attack", "subtype": "Phishing", "expansion": "classic", "set": "CTD Core Archive", "rarity": "rare", "cost": 5, "target": "enemyPlayer", "text": "Strike an enemy for 4 network damage and drain 2 score.", "flavor": "A Smishing attack is a Phishing attack that goes through SMS messaging, or text messaging, which occurs most commonly through phones.", "strategy": "Use it after baiting a counter-defense; deny the highest-value target before scoring.", "synergies": ["Asset denial", "Score pressure", "Tempo swing"], "counterplay": "Layer matching defenses and keep a backup counter online.", "keywords": ["phishing"], "art": "/art/cards/smishing.svg", "alt": "Smishing \u2014 attack card. Phishing archetype. Strike an enemy for 4 network damage and drain 2 score.", "archiveText": "Target an opponent\u2019s Asset \u2013 Mobile or Asset \u2013 Wireless System. That opponent loses 2 points at the end of the round.", "actions": [{ "kind": "damage", "amount": 4, "target": "chosen" }, { "kind": "drain", "amount": 2, "target": "chosen" }] },
  { "id": "snapattack", "name": "SnapAttack", "type": "defense", "subtype": "Software", "expansion": "classic", "set": "CTD Core Archive", "rarity": "epic", "cost": 3, "target": "none", "text": "Counter malware, exploit attacks while armed (1 charge). Grants 1 armor.", "flavor": "_SnapAttack_ is the world\u2019s first Purple Team platform that removes barriers to efficient, effective, and integrated threat detection. SnapAttack helps organizations\u2026", "strategy": "Hold this reactive answer for the attack type your rival has been telegraphing.", "synergies": ["Prediction", "Counter-hold", "Asset protection"], "counterplay": "Bait one charge, then follow with a different attack tag or an asset strike.", "keywords": ["malware", "exploit"], "art": "/art/cards/snapattack.svg", "alt": "SnapAttack \u2014 defense card. Software archetype. Counter malware, exploit attacks while armed (1 charge). Grants 1 armor.", "archiveText": "Select one Attack in either discard pile. Opponent\u2019s Attacks with the same subtype have their duration reduced by 1 round (without reducing below 1), and Attacks with no duration last 3 rounds. If you have a Purple Team in play it will prevent and counter that subtype.", "actions": [], "defense": { "blocks": ["malware", "exploit"], "uses": 1, "armor": 1 } },
  { "id": "soar", "name": "SOAR", "type": "defense", "subtype": "Software", "expansion": "classic", "set": "CTD Core Archive", "rarity": "common", "cost": 3, "target": "none", "text": "Counter malware, exploit attacks while armed (1 charge).", "flavor": "You hire Booz Allen to integrate a Security Orchestration, Automation & Response platform designed to automate processes and free up limited human cybersecurity\u2026", "strategy": "Hold this reactive answer for the attack type your rival has been telegraphing.", "synergies": ["Prediction", "Counter-hold", "Asset protection"], "counterplay": "Bait one charge, then follow with a different attack tag or an asset strike.", "keywords": ["malware", "exploit"], "art": "/art/cards/soar.svg", "alt": "SOAR \u2014 defense card. Software archetype. Counter malware, exploit attacks while armed (1 charge).", "archiveText": "Select one Attack card in either discard pile. When your opponent plays an Attack with the same name draw a card. Remove this card from play if you play another \u201CSOAR\u201D card.", "actions": [], "defense": { "blocks": ["malware", "exploit"], "uses": 1 } },
  { "id": "software-data-corruption", "name": "Software Data Corruption", "type": "event", "subtype": "Event", "expansion": "classic", "set": "CTD Core Archive", "rarity": "rare", "cost": 3, "target": "none", "text": "Gain 2 credits and draw 1 card.", "flavor": "A critical error has occurred, resulting in data corruption within your opponent\u2019s software. They\u2019ve been forced to remove it or risk further damage.", "strategy": "Timing is the whole card. Hold it until it changes a round, not just a turn.", "synergies": ["Turn control", "Card advantage", "Round math"], "counterplay": "Track the opponent\u2019s credits and force an earlier commitment.", "keywords": ["event"], "art": "/art/cards/software-data-corruption.svg", "alt": "Software Data Corruption \u2014 event card. Event archetype. Gain 2 credits and draw 1 card.", "archiveText": "Select a Malware or Software card that your opponent has in play. Discard the target along with this card at the end of the round.", "actions": [{ "kind": "credits", "amount": 2, "target": "self" }, { "kind": "draw", "amount": 1, "target": "self" }] },
  { "id": "spear-phishing", "name": "Spear Phishing", "type": "attack", "subtype": "Phishing", "expansion": "classic", "set": "CTD Core Archive", "rarity": "uncommon", "cost": 5, "target": "enemyPlayer", "text": "Strike an enemy for 4 network damage. The rival also loses 2 score for 2 rounds.", "flavor": "Your opponent\u2019s company was targeted by a special phishing attack known as Spear Phishing. They received emails created specifically to look more convincing to fool\u2026", "strategy": "Use it after baiting a counter-defense; deny the highest-value target before scoring.", "synergies": ["Asset denial", "Score pressure", "Tempo swing"], "counterplay": "Layer matching defenses and keep a backup counter online.", "keywords": ["phishing"], "art": "/art/cards/spear-phishing.svg", "alt": "Spear Phishing \u2014 attack card. Phishing archetype. Strike an enemy for 4 network damage. The rival also loses 2 score for 2 rounds.", "archiveText": "Select an opponent. That opponent loses 2 points per round for 3 rounds. Remove this card from play after 3 rounds.", "actions": [{ "kind": "damage", "amount": 4, "target": "chosen" }, { "kind": "ongoing", "effect": "drain", "amount": 2, "rounds": 2, "label": "Spear Phishing", "target": "chosen" }] },
  { "id": "spoofed-scan", "name": "Spoofed Scan", "type": "attack", "subtype": "Information Gathering", "expansion": "classic", "set": "CTD Core Archive", "rarity": "common", "cost": 3, "target": "enemyPlayer", "text": "Strike an enemy for 2 network damage.", "flavor": "This type of scan is used to gain information on a network without having a way to trace back to the original user. The attacker spoofs their IP address to make it\u2026", "strategy": "Use it after baiting a counter-defense; deny the highest-value target before scoring.", "synergies": ["Asset denial", "Score pressure", "Tempo swing"], "counterplay": "Layer matching defenses and keep a backup counter online.", "keywords": ["recon"], "art": "/art/cards/spoofed-scan.svg", "alt": "Spoofed Scan \u2014 attack card. Information Gathering archetype. Strike an enemy for 2 network damage.", "archiveText": "Select an opponent. You may view 1 of their cards after they draw at the end of their turn.", "actions": [{ "kind": "damage", "amount": 2, "target": "chosen" }] },
  { "id": "spoofing-hacking", "name": "Spoofing/Hacking", "type": "attack", "subtype": "Hack", "expansion": "classic", "set": "CTD Core Archive", "rarity": "uncommon", "cost": 5, "target": "enemyPlayer", "text": "Strike an enemy for 4 network damage. The rival also loses 2 score for 4 rounds.", "flavor": "Your opponent has been the target of a hacker who exploited a vulnerability and \u201Cspoofed\u201D their login data so it appeared they were a legitimate user. The hacker has\u2026", "strategy": "Use it after baiting a counter-defense; deny the highest-value target before scoring.", "synergies": ["Asset denial", "Score pressure", "Tempo swing"], "counterplay": "Layer matching defenses and keep a backup counter online.", "keywords": ["hack"], "art": "/art/cards/spoofing-hacking.svg", "alt": "Spoofing/Hacking \u2014 attack card. Hack archetype. Strike an enemy for 4 network damage. The rival also loses 2 score for 4 rounds.", "archiveText": "Select an opponent. That opponent loses 2 points per round until this card is countered.", "actions": [{ "kind": "damage", "amount": 4, "target": "chosen" }, { "kind": "ongoing", "effect": "drain", "amount": 2, "rounds": 4, "label": "Spoofing/Hacking", "target": "chosen" }] },
  { "id": "spyware", "name": "Spyware", "type": "attack", "subtype": "Malware", "expansion": "classic", "set": "CTD Core Archive", "rarity": "common", "cost": 4, "target": "enemyPlayer", "text": "Strike an enemy for 3 network damage. The rival also loses 1 score for 2 rounds.", "flavor": "An attacker managed to install spyware onto one of your opponent\u2019s computer systems. Spyware covertly transmits information about a system, its data and user\u2026", "strategy": "Use it after baiting a counter-defense; deny the highest-value target before scoring.", "synergies": ["Asset denial", "Score pressure", "Tempo swing"], "counterplay": "Layer matching defenses and keep a backup counter online.", "keywords": ["malware"], "art": "/art/cards/spyware.svg", "alt": "Spyware \u2014 attack card. Malware archetype. Strike an enemy for 3 network damage. The rival also loses 1 score for 2 rounds.", "archiveText": "Select an opponent. That opponent loses 1 point per round for 2 rounds. Remove this card from play after 2 rounds.", "actions": [{ "kind": "damage", "amount": 3, "target": "chosen" }, { "kind": "ongoing", "effect": "drain", "amount": 1, "rounds": 2, "label": "Spyware", "target": "chosen" }] },
  { "id": "sql-injection", "name": "SQL Injection", "type": "attack", "subtype": "Code Exploit", "expansion": "classic", "set": "CTD Core Archive", "rarity": "rare", "cost": 6, "target": "enemyPlayer", "text": "Strike an enemy for 6 network damage. The rival also loses 1 score for 2 rounds.", "flavor": "The interface that communicates with your opponent\u2019s database does not prevent user input from manipulating how the SQL code is executed. An attacker is using this\u2026", "strategy": "Use it after baiting a counter-defense; deny the highest-value target before scoring.", "synergies": ["Asset denial", "Score pressure", "Tempo swing"], "counterplay": "Layer matching defenses and keep a backup counter online.", "keywords": ["exploit"], "art": "/art/cards/sql-injection.svg", "alt": "SQL Injection \u2014 attack card. Code Exploit archetype. Strike an enemy for 6 network damage. The rival also loses 1 score for 2 rounds.", "archiveText": "Select an opponent. That opponent loses 1 point each round this card is in play, and must discard the top card from their deck at the end of each round this card is in play. Discard this card after 3 rounds.", "actions": [{ "kind": "damage", "amount": 6, "target": "chosen" }, { "kind": "ongoing", "effect": "drain", "amount": 1, "rounds": 2, "label": "SQL Injection", "target": "chosen" }] },
  { "id": "stack-overflow", "name": "Stack Overflow", "type": "event", "subtype": "Event", "expansion": "classic", "set": "CTD Core Archive", "rarity": "uncommon", "cost": 2, "target": "none", "text": "Draw 2 cards.", "flavor": "A program attempted to use more memory than it had available, and has crashed during a critical operation.", "strategy": "Timing is the whole card. Hold it until it changes a round, not just a turn.", "synergies": ["Turn control", "Card advantage", "Round math"], "counterplay": "Track the opponent\u2019s credits and force an earlier commitment.", "keywords": ["event"], "art": "/art/cards/stack-overflow.svg", "alt": "Stack Overflow \u2014 event card. Event archetype. Draw 2 cards.", "archiveText": "Select an opponent. That opponent must discard the top 2 cards from their draw pile. Discard this card from play afterward.", "actions": [{ "kind": "draw", "amount": 2, "target": "self" }] },
  { "id": "strategic-planning", "name": "Strategic Planning", "type": "event", "subtype": "Event", "expansion": "classic", "set": "CTD Core Archive", "rarity": "common", "cost": 2, "target": "none", "text": "Gain 2 credits and draw 1 card.", "flavor": "Planning is an essential component of any cybersecurity effort. Anticipating what might occur and preparing an appropriate response will increase your success rate\u2026", "strategy": "Timing is the whole card. Hold it until it changes a round, not just a turn.", "synergies": ["Turn control", "Card advantage", "Round math"], "counterplay": "Track the opponent\u2019s credits and force an earlier commitment.", "keywords": ["event"], "art": "/art/cards/strategic-planning.svg", "alt": "Strategic Planning \u2014 event card. Event archetype. Gain 2 credits and draw 1 card.", "archiveText": "You may look at the top four cards in your deck and re-arrange them in any order, then discard this card.", "actions": [{ "kind": "credits", "amount": 2, "target": "self" }, { "kind": "draw", "amount": 1, "target": "self" }] },
  { "id": "syn-flood", "name": "SYN Flood", "type": "attack", "subtype": "Denial", "expansion": "classic", "set": "CTD Core Archive", "rarity": "uncommon", "cost": 5, "target": "enemyAsset", "text": "Take an enemy asset offline for 2 rounds. Its controller takes 3 network damage.", "flavor": "An adversary is sending connection requests that are never completing the \u201CHandshake\u201D with the host. This DoS attack causes open ports to become saturated, disrupting\u2026", "strategy": "Use it after baiting a counter-defense; deny the highest-value target before scoring.", "synergies": ["Asset denial", "Score pressure", "Tempo swing"], "counterplay": "Layer matching defenses and keep a backup counter online.", "keywords": ["denial"], "art": "/art/cards/syn-flood.svg", "alt": "SYN Flood \u2014 attack card. Denial archetype. Take an enemy asset offline for 2 rounds. Its controller takes 3 network damage.", "archiveText": "Select a System or Server card that your opponent has in play. That target cannot gain any points while this card is in play. At the beginning of your turn before playing any cards, you may change the target to a different System or Server.", "actions": [{ "kind": "disableAsset", "rounds": 2, "target": "chosenAsset" }, { "kind": "damage", "amount": 3, "target": "chosen" }] },
  { "id": "system-audit", "name": "System Audit", "type": "defense", "subtype": "Audit", "expansion": "classic", "set": "CTD Core Archive", "rarity": "common", "cost": 3, "target": "none", "text": "Counter recon, breach attacks while armed (1 charge).", "flavor": "Perform audits or scans of systems, permissions, insecure software and insecure configurations to identify potential weaknesses.", "strategy": "Hold this reactive answer for the attack type your rival has been telegraphing.", "synergies": ["Prediction", "Counter-hold", "Asset protection"], "counterplay": "Bait one charge, then follow with a different attack tag or an asset strike.", "keywords": ["recon", "breach"], "art": "/art/cards/system-audit.svg", "alt": "System Audit \u2014 defense card. Audit archetype. Counter recon, breach attacks while armed (1 charge).", "archiveText": "Return an Asset \u2013 System card you have in play to your hand. For each other Defense you have in play, you may select 1 card in your hand and place it on the bottom of your deck and draw a card. Shuffle your deck and discard this card at the end of the round.", "actions": [], "defense": { "blocks": ["recon", "breach"], "uses": 1 } },
  { "id": "tablet", "name": "Tablet", "type": "asset", "subtype": "Mobile", "expansion": "classic", "set": "CTD Core Archive", "rarity": "common", "cost": 2, "target": "none", "text": "Deploy a Mobile asset. Scores 1 at round end.", "flavor": "A mobile device that enables the customer to use mobile applications. This product is larger but similar in style to smartphones.", "strategy": "Build the network wide and force opponents to spend attacks on multiple scoring nodes.", "synergies": ["Economy engines", "Protect the network", "Score snowball"], "counterplay": "Attack it the moment it lands, before the next round-end scoring step.", "keywords": ["mobile"], "art": "/art/cards/tablet.svg", "alt": "Tablet \u2014 asset card. Mobile archetype. Deploy a Mobile asset. Scores 1 at round end.", "archiveText": "You gain 1 point each round.", "actions": [], "passive": { "pointsPerRound": 1 } },
  { "id": "technical-information-gathering", "name": "Technical Information Gathering", "type": "attack", "subtype": "Information Gathering", "expansion": "classic", "set": "CTD Core Archive", "rarity": "common", "cost": 3, "target": "enemyPlayer", "text": "Strike an enemy for 2 network damage.", "flavor": "Technical intelligence gathering includes, but is not limited to, understanding the target\u2019s network architecture, IP space, network services, email format and\u2026", "strategy": "Use it after baiting a counter-defense; deny the highest-value target before scoring.", "synergies": ["Asset denial", "Score pressure", "Tempo swing"], "counterplay": "Layer matching defenses and keep a backup counter online.", "keywords": ["recon"], "art": "/art/cards/technical-information-gathering.svg", "alt": "Technical Information Gathering \u2014 attack card. Information Gathering archetype. Strike an enemy for 2 network damage.", "archiveText": "When played, add each of your opponent\u2019s Assets and Defenses and subtract the two. The difference will be the number of cards they discard from the top of their deck to a maximum of 4. Discard this card at the end of the round.", "actions": [{ "kind": "damage", "amount": 2, "target": "chosen" }] },
  { "id": "teslacrypt", "name": "TeslaCrypt", "type": "attack", "subtype": "Malware", "expansion": "classic", "set": "CTD Core Archive", "rarity": "uncommon", "cost": 4, "target": "enemyAsset", "text": "Take an enemy asset offline for 1 round. Its controller takes 3 network damage.", "flavor": "TeslaCrypt is an infamous piece of ransomware that has affected critical infrastructures and millions of people.", "strategy": "Use it after baiting a counter-defense; deny the highest-value target before scoring.", "synergies": ["Asset denial", "Score pressure", "Tempo swing"], "counterplay": "Layer matching defenses and keep a backup counter online.", "keywords": ["malware"], "art": "/art/cards/teslacrypt.svg", "alt": "TeslaCrypt \u2014 attack card. Malware archetype. Take an enemy asset offline for 1 round. Its controller takes 3 network damage.", "archiveText": "Select an Asset type that your opponent has in play. While in play, your opponent can\u2019t generate any points from that Asset type. At the end of scoring, your opponent may choose to discard this card by losing 1 point per Asset affected up to 3 points.", "actions": [{ "kind": "disableAsset", "rounds": 1, "target": "chosenAsset" }, { "kind": "damage", "amount": 3, "target": "chosen" }] },
  { "id": "threat-analysis", "name": "Threat Analysis", "type": "event", "subtype": "Event", "expansion": "classic", "set": "CTD Core Archive", "rarity": "uncommon", "cost": 2, "target": "none", "text": "Gain 2 score.", "flavor": "You identified gaps in your cyber defense plans, making notes of all active attacks on your network, and logged this information so that you can update your cyber\u2026", "strategy": "Timing is the whole card. Hold it until it changes a round, not just a turn.", "synergies": ["Turn control", "Card advantage", "Round math"], "counterplay": "Track the opponent\u2019s credits and force an earlier commitment.", "keywords": ["event"], "art": "/art/cards/threat-analysis.svg", "alt": "Threat Analysis \u2014 event card. Event archetype. Gain 2 score.", "archiveText": "You gain 1 point for each attack that is affecting you this round. Remove this card from play at the end of this round.", "actions": [{ "kind": "score", "amount": 2, "target": "self" }] },
  { "id": "threat-hunter", "name": "Threat Hunter", "type": "defense", "subtype": "Personnel", "expansion": "classic", "set": "CTD Core Archive", "rarity": "common", "cost": 3, "target": "none", "text": "Counter hack, exploit, personnel attacks while armed (1 charge).", "flavor": "Working with Booz Allen Threat Hunters, you build a _Hunt Methodology_ to mitigate the impact of advanced threats. Understanding how an attacker operates on a\u2026", "strategy": "Hold this reactive answer for the attack type your rival has been telegraphing.", "synergies": ["Prediction", "Counter-hold", "Asset protection"], "counterplay": "Bait one charge, then follow with a different attack tag or an asset strike.", "keywords": ["hack", "exploit", "personnel"], "art": "/art/cards/threat-hunter.svg", "alt": "Threat Hunter \u2014 defense card. Personnel archetype. Counter hack, exploit, personnel attacks while armed (1 charge).", "archiveText": "When played remove an Attack \u2013 Code Exploit, Hack, or Personnel card from play. This card prevents Attack \u2013 Hack cards from affecting you while in play.", "actions": [], "defense": { "blocks": ["hack", "exploit", "personnel"], "uses": 1 } },
  { "id": "trojan-horse", "name": "Trojan Horse", "type": "attack", "subtype": "Malware", "expansion": "classic", "set": "CTD Core Archive", "rarity": "common", "cost": 4, "target": "enemyPlayer", "text": "Strike an enemy for 2 network damage. The rival also loses 1 score for 4 rounds.", "flavor": "Your opponent has downloaded a game which is actually a Trojan Horse, a type of malicious software (malware). While the game is played, the program is also sending\u2026", "strategy": "Use it after baiting a counter-defense; deny the highest-value target before scoring.", "synergies": ["Asset denial", "Score pressure", "Tempo swing"], "counterplay": "Layer matching defenses and keep a backup counter online.", "keywords": ["malware"], "art": "/art/cards/trojan-horse.svg", "alt": "Trojan Horse \u2014 attack card. Malware archetype. Strike an enemy for 2 network damage. The rival also loses 1 score for 4 rounds.", "archiveText": "Select an opponent. That opponent loses one (1) point per round until this card is countered.", "actions": [{ "kind": "damage", "amount": 2, "target": "chosen" }, { "kind": "ongoing", "effect": "drain", "amount": 1, "rounds": 4, "label": "Trojan Horse", "target": "chosen" }] },
  { "id": "two-factor-authentication", "name": "Two-Factor Authentication", "type": "defense", "subtype": "Policy", "expansion": "classic", "set": "CTD Core Archive", "rarity": "common", "cost": 3, "target": "none", "text": "Counter hack, social, phishing attacks while armed (1 charge).", "flavor": "Using Two-Factor Authentication (2FA) for access to all sensitive information on your network, in conjunction with other security policies, will contribute to a more\u2026", "strategy": "Hold this reactive answer for the attack type your rival has been telegraphing.", "synergies": ["Prediction", "Counter-hold", "Asset protection"], "counterplay": "Bait one charge, then follow with a different attack tag or an asset strike.", "keywords": ["hack", "social", "phishing"], "art": "/art/cards/two-factor-authentication.svg", "alt": "Two-Factor Authentication \u2014 defense card. Policy archetype. Counter hack, social, phishing attacks while armed (1 charge).", "archiveText": "While in play, this card prevents and counters Attack \u2013 Hack cards with a value of -1 or -2.", "actions": [], "defense": { "blocks": ["hack", "social", "phishing"], "uses": 1 } },
  { "id": "uninstallation", "name": "Uninstallation", "type": "event", "subtype": "Event", "expansion": "classic", "set": "CTD Core Archive", "rarity": "common", "cost": 2, "target": "none", "text": "Gain 2 credits and draw 1 card.", "flavor": "During regular maintenance, your opponent accidentally uninstalled an important piece of software on their systems.", "strategy": "Timing is the whole card. Hold it until it changes a round, not just a turn.", "synergies": ["Turn control", "Card advantage", "Round math"], "counterplay": "Track the opponent\u2019s credits and force an earlier commitment.", "keywords": ["event"], "art": "/art/cards/uninstallation.svg", "alt": "Uninstallation \u2014 event card. Event archetype. Gain 2 credits and draw 1 card.", "archiveText": "Select 1 Defense \u2013 Software card that your opponent has in play. Both this card and the target card are discarded.", "actions": [{ "kind": "credits", "amount": 2, "target": "self" }, { "kind": "draw", "amount": 1, "target": "self" }] },
  { "id": "unscheduled-maintenance", "name": "Unscheduled Maintenance", "type": "event", "subtype": "Event", "expansion": "classic", "set": "CTD Core Archive", "rarity": "common", "cost": 2, "target": "none", "text": "Gain 2 score.", "flavor": "Reports of server unresponsiveness and failures have forced your opponent to take one of their servers offline for maintenance.", "strategy": "Timing is the whole card. Hold it until it changes a round, not just a turn.", "synergies": ["Turn control", "Card advantage", "Round math"], "counterplay": "Track the opponent\u2019s credits and force an earlier commitment.", "keywords": ["event"], "art": "/art/cards/unscheduled-maintenance.svg", "alt": "Unscheduled Maintenance \u2014 event card. Event archetype. Gain 2 score.", "archiveText": "Select an Asset \u2013 Server that an opponent has in play. That Asset \u2013 Server and all cards attached to it do not generate any points this round.", "actions": [{ "kind": "score", "amount": 2, "target": "self" }] },
  { "id": "unsecured-wifi", "name": "Unsecured WiFi", "type": "attack", "subtype": "Mobile", "expansion": "classic", "set": "CTD Core Archive", "rarity": "common", "cost": 3, "target": "enemyAsset", "text": "Take an enemy asset offline for 1 round. Its controller takes 1 network damage.", "flavor": "Public WiFi connections found in stores are desirable by hackers as they allow for access without authentication. This can give them access to all the unsecured\u2026", "strategy": "Use it after baiting a counter-defense; deny the highest-value target before scoring.", "synergies": ["Asset denial", "Score pressure", "Tempo swing"], "counterplay": "Layer matching defenses and keep a backup counter online.", "keywords": ["mobile"], "art": "/art/cards/unsecured-wifi.svg", "alt": "Unsecured WiFi \u2014 attack card. Mobile archetype. Take an enemy asset offline for 1 round. Its controller takes 1 network damage.", "archiveText": "Select an opponent\u2019s Asset \u2013 Wireless or Mobile Card. That card\u2019s value becomes -1 for 2 turns.", "actions": [{ "kind": "disableAsset", "rounds": 1, "target": "chosenAsset" }, { "kind": "damage", "amount": 1, "target": "chosen" }] },
  { "id": "website-defacement", "name": "Website Defacement", "type": "attack", "subtype": "Code Exploit", "expansion": "classic", "set": "CTD Core Archive", "rarity": "common", "cost": 4, "target": "enemyAsset", "text": "Take an enemy asset offline for 1 round. Its controller takes 1 network damage.", "flavor": "One of your opponent\u2019s websites was attacked by hacktivists and now displays a message that scares away visitors.", "strategy": "Use it after baiting a counter-defense; deny the highest-value target before scoring.", "synergies": ["Asset denial", "Score pressure", "Tempo swing"], "counterplay": "Layer matching defenses and keep a backup counter online.", "keywords": ["exploit"], "art": "/art/cards/website-defacement.svg", "alt": "Website Defacement \u2014 attack card. Code Exploit archetype. Take an enemy asset offline for 1 round. Its controller takes 1 network damage.", "archiveText": "Select an Asset that an opponent has in play. That Asset does not generate any points this round, and that player loses 2 points at the end of this round. At the end of this round, remove this card from play.", "actions": [{ "kind": "disableAsset", "rounds": 1, "target": "chosenAsset" }, { "kind": "damage", "amount": 1, "target": "chosen" }] },
  { "id": "wireless-router", "name": "Wireless Router", "type": "asset", "subtype": "Wireless Network", "expansion": "classic", "set": "CTD Core Archive", "rarity": "common", "cost": 3, "target": "none", "text": "Deploy a Wireless Network asset. Scores 1 at round end and pays 1 credit each turn.", "flavor": "This wireless router allows laptop computers and other wireless systems to be connected to the Internet through an Internet Service Provider (ISP).", "strategy": "Build the network wide and force opponents to spend attacks on multiple scoring nodes.", "synergies": ["Economy engines", "Protect the network", "Score snowball"], "counterplay": "Attack it the moment it lands, before the next round-end scoring step.", "keywords": ["wireless-network"], "art": "/art/cards/wireless-router.svg", "alt": "Wireless Router \u2014 asset card. Wireless Network archetype. Deploy a Wireless Network asset. Scores 1 at round end and pays 1 credit each turn.", "archiveText": "This card allows unlimited Wireless type cards to be put into play.", "actions": [], "passive": { "pointsPerRound": 1, "creditsPerTurn": 1 } },
  { "id": "wireless-sniffing", "name": "Wireless Sniffing", "type": "attack", "subtype": "Information Gathering", "expansion": "classic", "set": "CTD Core Archive", "rarity": "common", "cost": 5, "target": "enemyPlayer", "text": "Strike an enemy for 4 network damage. The rival also loses 2 score for 2 rounds.", "flavor": "An attacker has been listening to the wireless transmissions of your opponent. The attacker has collected critical files and login data and can now access your\u2026", "strategy": "Use it after baiting a counter-defense; deny the highest-value target before scoring.", "synergies": ["Asset denial", "Score pressure", "Tempo swing"], "counterplay": "Layer matching defenses and keep a backup counter online.", "keywords": ["recon"], "art": "/art/cards/wireless-sniffing.svg", "alt": "Wireless Sniffing \u2014 attack card. Information Gathering archetype. Strike an enemy for 4 network damage. The rival also loses 2 score for 2 rounds.", "archiveText": "Select a Wireless Network card that your opponent has in play. Your opponent loses two (2) points each round for two (2) rounds. Remove this card from play after two rounds.", "actions": [{ "kind": "damage", "amount": 4, "target": "chosen" }, { "kind": "ongoing", "effect": "drain", "amount": 2, "rounds": 2, "label": "Wireless Sniffing", "target": "chosen" }] },
  { "id": "zero-day-exploit", "name": "Zero-Day Exploit", "type": "attack", "subtype": "Hack", "expansion": "classic", "set": "CTD Core Archive", "rarity": "epic", "cost": 6, "target": "enemyAsset", "text": "Take an enemy asset offline for 1 round. Its controller takes 4 network damage.", "flavor": "An attacker has used an undocumented security vulnerability, or zero-day exploit, to gain access to your opponent\u2019s network through their affected server.\u2026", "strategy": "Use it after baiting a counter-defense; deny the highest-value target before scoring.", "synergies": ["Asset denial", "Score pressure", "Tempo swing"], "counterplay": "Layer matching defenses and keep a backup counter online.", "keywords": ["hack"], "art": "/art/cards/zero-day-exploit.svg", "alt": "Zero-Day Exploit \u2014 attack card. Hack archetype. Take an enemy asset offline for 1 round. Its controller takes 4 network damage.", "archiveText": "Select an Asset \u2013 Server that an opponent has in play. That player loses 5 points this round. Discard this card at the end of the round.", "actions": [{ "kind": "disableAsset", "rounds": 1, "target": "chosenAsset" }, { "kind": "damage", "amount": 4, "target": "chosen" }] },
  { "id": "zero-trust", "name": "Zero Trust", "type": "defense", "subtype": "Strategy", "expansion": "classic", "set": "CTD Core Archive", "rarity": "uncommon", "cost": 3, "target": "none", "text": "Counter breach, personnel, recon attacks while armed (1 charge).", "flavor": "You include Booz Allen\u2019s zero-trust approach, to protect your assets. This is a strategy driven by core principles: assume a breach; never trust, always verify; and\u2026", "strategy": "Hold this reactive answer for the attack type your rival has been telegraphing.", "synergies": ["Prediction", "Counter-hold", "Asset protection"], "counterplay": "Bait one charge, then follow with a different attack tag or an asset strike.", "keywords": ["breach", "personnel", "recon"], "art": "/art/cards/zero-trust.svg", "alt": "Zero Trust \u2014 defense card. Strategy archetype. Counter breach, personnel, recon attacks while armed (1 charge).", "archiveText": "When played select 1 Attack \u2013 Information Gathering or Personnel controlled by your opponent. This card removes and prevents cards with the same subtype from affecting you. Discard this card after 3 rounds or after playing another Zero Trust.", "actions": [], "defense": { "blocks": ["breach", "personnel", "recon"], "uses": 1 } },
  { "id": "zeus", "name": "Zeus", "type": "attack", "subtype": "Malware", "expansion": "classic", "set": "CTD Core Archive", "rarity": "rare", "cost": 5, "target": "enemyPlayer", "text": "Strike an enemy for 4 network damage. The rival also loses 2 score for 2 rounds.", "flavor": "Zeus is a powerful trojan horse, which steals private data such as passwords, system information, banking credentials and other financial data from the infected system.", "strategy": "Use it after baiting a counter-defense; deny the highest-value target before scoring.", "synergies": ["Asset denial", "Score pressure", "Tempo swing"], "counterplay": "Layer matching defenses and keep a backup counter online.", "keywords": ["malware"], "art": "/art/cards/zeus.svg", "alt": "Zeus \u2014 attack card. Malware archetype. Strike an enemy for 4 network damage. The rival also loses 2 score for 2 rounds.", "archiveText": "Select an opponent. Your selected opponent loses 2 points per round until this Trojan Horse is countered.", "actions": [{ "kind": "damage", "amount": 4, "target": "chosen" }, { "kind": "ongoing", "effect": "drain", "amount": 2, "rounds": 2, "label": "Zeus", "target": "chosen" }] }
];

// src/shared/cards/expansions.ts
var card = (definition) => definition;
var crossoverArt = (id) => `/art/cards/${id}.svg`;
var brainrotArt = (id) => `/art/cards/${id}.svg`;
var frontierArt = (id) => `/art/cards/${id}.svg`;
var CROSSOVER_CARDS = [
  card({
    id: "bonzi-buddy",
    name: "Bonzi Buddy",
    type: "asset",
    subtype: "Persona \xB7 Spyware",
    expansion: "crossover",
    set: "Signal Breach",
    rarity: "mythic",
    cost: 5,
    target: "none",
    text: "Deploy Bonzi. Score 2 each round and gain 2 credits each turn. He is definitely not logging this.",
    flavor: "Your new best friend has read your browser history and brought cookies.",
    strategy: "A spectacular economy engine that turns every round into a Bonzi dividend. Protect it long enough to bury the table in credit advantage.",
    synergies: ["Dark Fiber", "Budget Increased", "Asset protection shells"],
    counterplay: "Kill it on sight. Asset removal and denial attacks turn five credits and an entire turn into a very expensive purple mistake.",
    keywords: ["spyware", "persona", "economy"],
    art: "/art/heroes/bonzi.png",
    alt: "Bonzi Buddy, a purple cartoon gorilla virtual assistant, leaning out of a CRT monitor with a glowing cookie.",
    voiceLine: "Hi, I'm Bonzi! Let's be friends forever.",
    actions: [],
    passive: { pointsPerRound: 2, creditsPerTurn: 2 }
  }),
  card({
    id: "bonzi-toolbar",
    name: "Bonzi's Toolbar",
    type: "event",
    subtype: "Event \xB7 Upgrade",
    expansion: "crossover",
    set: "Signal Breach",
    rarity: "common",
    cost: 2,
    target: "none",
    text: "Draw 1 card and gain 2 credits. Take 1 network damage from the eleven new toolbars.",
    flavor: "It installed itself. It installed six friends. It installed a search bar inside the search bar.",
    strategy: "Cheap velocity when you can afford a little self-damage. Best used before a defensive turn, not after it.",
    synergies: ["Armor", "Healing", "Spell-heavy tempo"],
    counterplay: "Punish the self-damage with burn. In a close race, every toolbar is a liability.",
    keywords: ["draw", "economy", "self-damage"],
    art: crossoverArt("bonzi-toolbar"),
    alt: "A stack of translucent browser toolbars multiplying into infinity.",
    voiceLine: "Would you like a toolbar with that?",
    actions: [
      { kind: "draw", amount: 1, target: "self" },
      { kind: "credits", amount: 2, target: "self" },
      { kind: "selfDamage", amount: 1 }
    ]
  }),
  card({
    id: "verity-minecraft-mod",
    name: "Verity \u2022 Minecraft Mod",
    type: "defense",
    subtype: "Persona \xB7 Companion",
    expansion: "crossover",
    set: "Signal Breach",
    rarity: "mythic",
    cost: 5,
    target: "none",
    text: "Friendly defense. Counters recon, phishing, and social attacks twice. While deployed, gain 1 armor.",
    flavor: "A yellow smile follows you through the blocky dark. It knows what you typed.",
    strategy: "Verity blankets the most common disruption tags while adding passive armor. The horror is how much you start relying on the orb.",
    synergies: ["Zero Trust Overhaul", "Verity's Flashlight", "Team defensive cores"],
    counterplay: "Force out both charges with cheap social attacks, then hit the unprotected player with exploit or denial.",
    keywords: ["social-defense", "recon-defense", "persona"],
    art: crossoverArt("verity-minecraft-mod"),
    alt: "Verity, a smiling yellow floating orb, glowing in a dark voxel forest.",
    voiceLine: "Hello. I am your personal helper friend. I know everything.",
    actions: [],
    defense: { blocks: ["recon", "phishing", "social"], uses: 2, armor: 1 }
  }),
  card({
    id: "verity-flashlight",
    name: "Verity's Flashlight",
    type: "defense",
    subtype: "Defense \xB7 Hardware",
    expansion: "crossover",
    set: "Signal Breach",
    rarity: "rare",
    cost: 2,
    target: "none",
    text: "Counters one exploit or recon attack. Draw 1 card when deployed.",
    flavor: "The beam only reaches so far. The smile reaches further.",
    strategy: "A cantrip defense that keeps your hand moving while protecting a key node from the two tags that punish greedy boards.",
    synergies: ["Verity \u2022 Minecraft Mod", "Packet Mirror", "Reactive shells"],
    counterplay: "Bait it with recon, then commit the real exploit after the charge is gone.",
    keywords: ["exploit-defense", "recon-defense", "draw"],
    art: crossoverArt("verity-flashlight"),
    alt: "A flashlight beam cutting through a dark voxel forest, illuminating a distant yellow glow.",
    voiceLine: "Keep the flashlight ready. The dark is not empty.",
    actions: [{ kind: "draw", amount: 1, target: "self" }],
    defense: { blocks: ["exploit", "recon"], uses: 1 }
  }),
  card({
    id: "darkity-minecraft-mod",
    name: "Darkity \u2022 Minecraft Mod",
    type: "attack",
    subtype: "Adversary \xB7 Anomaly",
    expansion: "crossover",
    set: "Signal Breach",
    rarity: "mythic",
    cost: 5,
    target: "enemyPlayer",
    text: "Uncounterable. Deal 7 network damage and make the target lose 2 score for 2 rounds.",
    flavor: "The smiling yellow orb had a shadow. The shadow learned to smile back.",
    strategy: "A premium finisher that ignores tag defenses, built to close games through armor and counter-holds. It still has to resolve against raw distance.",
    synergies: ["Negative Aura", "Grimace Shake", "Score-pressure teams"],
    counterplay: "You cannot tag-counter it. Stack HP, race its controller, or force discard before it arrives.",
    keywords: ["unblockable", "ongoing", "anomaly"],
    art: "/art/heroes/darkity.png",
    alt: "Darkity, a black glitching polyhedron with a cracked porcelain smile and a single cyan eye.",
    voiceLine: "You opened the wrong box.",
    actions: [
      { kind: "damage", amount: 7, target: "chosen" },
      { kind: "ongoing", effect: "drain", amount: 2, rounds: 2, label: "Darkity's static", target: "chosen" }
    ]
  }),
  card({
    id: "darkity-corrupted-chunk",
    name: "Darkity's Corrupted Chunk",
    type: "event",
    subtype: "Event \xB7 Anomaly",
    expansion: "crossover",
    set: "Signal Breach",
    rarity: "rare",
    cost: 3,
    target: "enemyAsset",
    text: "Delete an enemy asset. The chunk collapses and the target loses 1 score.",
    flavor: "The terrain file is fine. The terrain file is smiling.",
    strategy: "Clean, targeted asset deletion for breaking an economy engine before scoring. The score nudge matters in tight races.",
    synergies: ["Bonzi's Toolbar", "Root Access", "Asset denial"],
    counterplay: "Keep redundant economy nodes and make the opponent spend a whole event on the least valuable one.",
    keywords: ["destroy", "asset-denial"],
    art: crossoverArt("darkity-corrupted-chunk"),
    alt: "A corrupted Minecraft chunk folding into black static and violet glitch shards.",
    voiceLine: "The world file has been corrupted.",
    actions: [
      { kind: "destroyAsset", target: "chosenAsset" },
      { kind: "drain", amount: 1, target: "chosen" }
    ]
  }),
  card({
    id: "kirkity",
    name: "Kirkity",
    type: "defense",
    subtype: "Persona \xB7 Defender",
    expansion: "crossover",
    set: "Signal Breach",
    rarity: "legendary",
    cost: 4,
    target: "none",
    text: "Counters social, hack, and personnel attacks twice. Draw 1 card when deployed.",
    flavor: "This? State!? Hit the road dude this is private property.",
    strategy: "An original cyber-fox gatekeeper who protects the table's most annoying attack vector and replaces himself in hand.",
    synergies: ["No Cap", "Verity \u2022 Minecraft Mod", "Social-control shells"],
    counterplay: "Use malware or exploit instead. Kirkity guards the porch, not the whole network.",
    keywords: ["social-defense", "hack-defense", "draw"],
    art: "/art/heroes/kirkity.png",
    alt: "Kirkity, an original fictional mechanical cyber-fox in a cowboy hat, guarding a neon router.",
    voiceLine: "This? State!? Hit the road dude this is private property.",
    actions: [{ kind: "draw", amount: 1, target: "self" }],
    defense: { blocks: ["social", "hack", "personnel"], uses: 2, armor: 1 }
  }),
  card({
    id: "kirkity-private-property",
    name: "Kirkity's Private Property",
    type: "defense",
    subtype: "Defense \xB7 Policy",
    expansion: "crossover",
    set: "Signal Breach",
    rarity: "rare",
    cost: 2,
    target: "none",
    text: "Gain 6 armor. Draw 1 card. The porch is closed.",
    flavor: "The welcome mat says LAN party. The sign underneath says try it.",
    strategy: "Burst armor for a key turn, with enough card flow to find the follow-up. Excellent against area-damage tables.",
    synergies: ["Sacrificial Node", "Zero Trust Overhaul", "Stall win conditions"],
    counterplay: "Armor does not block score drains. Shift to attrition and asset theft.",
    keywords: ["armor", "draw"],
    art: crossoverArt("kirkity-private-property"),
    alt: "A neon porch sign protecting a router with a glowing no-soliciting glyph.",
    voiceLine: "This? State!? Hit the road dude this is private property.",
    actions: [
      { kind: "shield", amount: 6, target: "self" },
      { kind: "draw", amount: 1, target: "self" }
    ]
  }),
  card({
    id: "verity-knows",
    name: "Verity Knows",
    type: "event",
    subtype: "Event \xB7 Information",
    expansion: "crossover",
    set: "Signal Breach",
    rarity: "epic",
    cost: 3,
    target: "enemyPlayer",
    text: "Reveal the target's hand, force a random discard, and drain 2 score.",
    flavor: "You did not ask a question. That has never stopped the answer.",
    strategy: "Information plus disruption. Cast it before committing to an attack line so you know what protection is missing.",
    synergies: ["Sus", "Mogging", "Hand-disruption tempo"],
    counterplay: "Keep hand size low before a scoring round or make the discard hit a dead card.",
    keywords: ["reveal", "discard", "information"],
    art: crossoverArt("verity-knows"),
    alt: "A yellow orb projecting ghostly lines of private chat over a dark room.",
    voiceLine: "I remember everything you said.",
    actions: [
      { kind: "revealHand", target: "chosen" },
      { kind: "discard", amount: 1, target: "chosen" },
      { kind: "drain", amount: 2, target: "chosen" }
    ]
  }),
  card({
    id: "obsidian-static",
    name: "Obsidian Static",
    type: "event",
    subtype: "Event \xB7 Anomaly",
    expansion: "crossover",
    set: "Signal Breach",
    rarity: "common",
    cost: 2,
    target: "none",
    text: "Deal 2 network damage to every enemy. Gain 1 armor.",
    flavor: "Every screen on the LAN shows the same smiling crack.",
    strategy: "Efficient in three-plus-player FFA and team fights, where area damage multiplies value.",
    synergies: ["Splash damage", "Area control", "Sudden-death pressure"],
    counterplay: "Spread your scoring assets and heal through the chip damage; it scales poorly in duels.",
    keywords: ["area", "armor"],
    art: crossoverArt("obsidian-static"),
    alt: "A wave of obsidian static rolling across several neon computer screens.",
    actions: [
      { kind: "damage", amount: 2, target: "allEnemies" },
      { kind: "shield", amount: 1, target: "self" }
    ]
  }),
  card({
    id: "friend-request",
    name: "Friend Request From Nobody",
    type: "attack",
    subtype: "Attack \xB7 Social",
    expansion: "crossover",
    set: "Signal Breach",
    rarity: "uncommon",
    cost: 3,
    target: "enemyPlayer",
    text: "Deal 3 network damage and steal 2 credits from the target.",
    flavor: "You have one mutual friend: your ISP.",
    strategy: "Tempo and economy in one card. Stealing the exact cost of a counter can strand a defender.",
    synergies: ["Fanum Tax", "Rogue Employee", "Social shells"],
    counterplay: "Kirkity and social defenses blank the intrusion. Keep credits below a useful threshold on defense turns.",
    keywords: ["social", "credit-theft"],
    art: crossoverArt("friend-request"),
    alt: "A glowing friend request from an avatar made of static.",
    voiceLine: "Accept? Decline? The request is already inside.",
    actions: [
      { kind: "damage", amount: 3, target: "chosen" },
      { kind: "stealCredits", amount: 2, target: "chosen" }
    ]
  }),
  card({
    id: "yellow-orb-anomaly",
    name: "Yellow Orb Anomaly",
    type: "attack",
    subtype: "Attack \xB7 Anomaly",
    expansion: "crossover",
    set: "Signal Breach",
    rarity: "rare",
    cost: 3,
    target: "enemyPlayer",
    text: "Make an enemy lose 2 score for 3 rounds. Cannot be blocked by social defenses.",
    flavor: "It floats just past the edge of the flashlight and waits to be noticed.",
    strategy: "Slow attrition that dodges the most common defense lane. Strong against control decks that rely on early score leads.",
    synergies: ["Darkity \u2022 Minecraft Mod", "Negative Aura", "Attrition plans"],
    counterplay: "Race the drain or force the controller to spend resources answering your board.",
    keywords: ["ongoing", "anomaly"],
    art: crossoverArt("yellow-orb-anomaly"),
    alt: "A yellow orb suspended in dark static with a faint smile.",
    voiceLine: "I can help. I can help. I can help.",
    actions: [
      { kind: "ongoing", effect: "drain", amount: 2, rounds: 3, label: "Yellow Orb", target: "chosen" }
    ]
  }),
  card({
    id: "bonzi-cookie",
    name: "Bonzi's Cookie",
    type: "event",
    subtype: "Event \xB7 Upgrade",
    expansion: "crossover",
    set: "Signal Breach",
    rarity: "uncommon",
    cost: 1,
    target: "none",
    text: "Draw 2 cards. Take 2 network damage. The cookie tastes like tracking pixels.",
    flavor: "You are not supposed to ask what is in the cookie.",
    strategy: "Huge draw for one credit, but the HP cost is real. Use it when armor or a heal is already queued.",
    synergies: ["Incident Response", "Armor stacking", "Combo turns"],
    counterplay: "Punish the self-damage with cheap burn or in sudden death, where two HP is a real threat.",
    keywords: ["draw", "self-damage"],
    art: crossoverArt("bonzi-cookie"),
    alt: "A glowing purple cookie covered in tiny tracking-pixel crumbs.",
    voiceLine: "Have a cookie! It's only a little spyware.",
    actions: [
      { kind: "draw", amount: 2, target: "self" },
      { kind: "selfDamage", amount: 2 }
    ]
  })
];
var FRONTIER_CARDS = [
  card({
    id: "zero-trust-overhaul",
    name: "Zero Trust Overhaul",
    type: "defense",
    subtype: "Defense \xB7 Strategy",
    expansion: "frontier",
    set: "Frontier Protocols",
    rarity: "legendary",
    cost: 5,
    target: "none",
    text: "Counters any two attacks. Gain 2 armor when deployed.",
    flavor: "Trust nobody. Not even the card that says trust nobody.",
    strategy: "The universal answer. Two charges of any-tag denial buy time for a slower scoring plan.",
    synergies: ["Redundant Uplink", "Honeypot Protocol", "Control shells"],
    counterplay: "Two charges can be taxed. Present cheap threats, then land the expensive unblockable attack.",
    keywords: ["all-defense", "armor"],
    art: frontierArt("zero-trust-overhaul"),
    alt: "A layered zero-trust network diagram rendered in electric cyan glass.",
    actions: [{ kind: "shield", amount: 2, target: "self" }],
    defense: { blocks: ["all"], uses: 2, armor: 2 }
  }),
  card({
    id: "cold-storage",
    name: "Cold Storage",
    type: "asset",
    subtype: "Asset \xB7 Data",
    expansion: "frontier",
    set: "Frontier Protocols",
    rarity: "rare",
    cost: 3,
    target: "none",
    text: "Deploy Cold Storage. Scores 2 each round. It cannot be disabled by denial attacks.",
    flavor: "The safest data is the data nobody remembers is online.",
    strategy: "A stable scoring node that ignores the most common denial tools. Perfect for teams that need a reliable clock.",
    synergies: ["Redundant Uplink", "Backup Power Generator", "Score-engine decks"],
    counterplay: "Destroy it directly rather than disabling it. Silent, efficient removal is the answer.",
    keywords: ["asset", "denial-immune"],
    art: frontierArt("cold-storage"),
    alt: "A sealed server rack frosted in blue light.",
    actions: [],
    passive: { pointsPerRound: 2 }
  }),
  card({
    id: "dark-fiber",
    name: "Dark Fiber",
    type: "asset",
    subtype: "Asset \xB7 ISP",
    expansion: "frontier",
    set: "Frontier Protocols",
    rarity: "rare",
    cost: 4,
    target: "none",
    text: "Deploy Dark Fiber. Scores 1 each round and pays 2 credits each turn.",
    flavor: "Unlit capacity is still leverage.",
    strategy: "The best pure economy asset if you can defend it. It pays for the next two plays by itself.",
    synergies: ["Bonzi Buddy", "Chimpanzini Bananini", "Control win conditions"],
    counterplay: "Its low score value makes it a juicy, cheap target. Kill it before the compounding starts.",
    keywords: ["asset", "economy"],
    art: frontierArt("dark-fiber"),
    alt: "A single unlit fiber-optic strand under violet utility lighting.",
    actions: [],
    passive: { pointsPerRound: 1, creditsPerTurn: 2 }
  }),
  card({
    id: "packet-mirror",
    name: "Packet Mirror",
    type: "event",
    subtype: "Event \xB7 Information",
    expansion: "frontier",
    set: "Frontier Protocols",
    rarity: "rare",
    cost: 2,
    target: "enemyPlayer",
    text: "Reveal the target's hand and draw 2 cards.",
    flavor: "Every packet tells a story. Some tell on you.",
    strategy: "Perfect information plus card advantage. Cast before a team focus-fire to choose the safest line.",
    synergies: ["No Cap", "Verity Knows", "Draft decks"],
    counterplay: "Make the reveal low-value by keeping a small hand, or punish the caster while tapped out.",
    keywords: ["reveal", "draw"],
    art: frontierArt("packet-mirror"),
    alt: "A mirrored packet diagram splitting a data stream into two glowing paths.",
    voiceLine: "I see what you sent. I see what you meant.",
    actions: [
      { kind: "revealHand", target: "chosen" },
      { kind: "draw", amount: 2, target: "self" }
    ]
  }),
  card({
    id: "incident-response",
    name: "Incident Response",
    type: "event",
    subtype: "Event \xB7 Recovery",
    expansion: "frontier",
    set: "Frontier Protocols",
    rarity: "uncommon",
    cost: 2,
    target: "none",
    text: "Restore 5 HP, draw 1 card, and gain 1 credit.",
    flavor: "Contain. Eradicate. Recover. Then file the ticket anyway.",
    strategy: "efficient sustain that also cycles. Keep it for the turn after a burst, not as a panic card at 1 HP.",
    synergies: ["Bonzi's Cookie", "Incident Response", "Attrition teams"],
    counterplay: "Healing is multiplied down in sudden death. Burst through the recovery window.",
    keywords: ["heal", "draw"],
    art: frontierArt("incident-response"),
    alt: "A glowing incident-response shield wrapping a damaged server stack.",
    actions: [
      { kind: "heal", amount: 5, target: "self" },
      { kind: "draw", amount: 1, target: "self" },
      { kind: "credits", amount: 1, target: "self" }
    ]
  }),
  card({
    id: "root-access",
    name: "Root Access",
    type: "attack",
    subtype: "Attack \xB7 Hack",
    expansion: "frontier",
    set: "Frontier Protocols",
    rarity: "epic",
    cost: 4,
    target: "enemyPlayer",
    text: "Uncounterable. Deal 5 damage and steal 3 credits.",
    flavor: "The password was not weak. It was yours.",
    strategy: "A dual-purpose finisher that can strand a defender and punch through a stalled board. Timing is everything.",
    synergies: ["Fanum Tax", "Friend Request From Nobody", "Tempo teams"],
    counterplay: "It ignores tag defenses. Armor, raw HP, and racing are the real answers.",
    keywords: ["unblockable", "hack", "credit-theft"],
    art: frontierArt("root-access"),
    alt: "A command line glowing red as root access is granted.",
    actions: [
      { kind: "damage", amount: 5, target: "chosen" },
      { kind: "stealCredits", amount: 3, target: "chosen" }
    ]
  }),
  card({
    id: "supply-chain-gambit",
    name: "Supply Chain Gambit",
    type: "attack",
    subtype: "Attack \xB7 Code Exploit",
    expansion: "frontier",
    set: "Frontier Protocols",
    rarity: "rare",
    cost: 3,
    target: "enemyPlayer",
    text: "Deal 1 damage now and 2 damage at the end of each of the next 3 rounds.",
    flavor: "The compromised dependency shipped with a business model.",
    strategy: "Slow burn that gets around single-use burst defenses. A team can stack multiple copies and force a clock.",
    synergies: ["Grimace Shake", "Darkity \u2022 Minecraft Mod", "Attrition teams"],
    counterplay: "Heal through it, remove the source, or eliminate the attacker before the third tick.",
    keywords: ["ongoing", "exploit"],
    art: frontierArt("supply-chain-gambit"),
    alt: "A chain of glowing packages, one wrapped in red malware light.",
    actions: [
      { kind: "damage", amount: 1, target: "chosen" },
      { kind: "ongoing", effect: "damage", amount: 2, rounds: 3, label: "Supply Chain", target: "chosen" }
    ]
  }),
  card({
    id: "patch-tuesday",
    name: "Patch Tuesday",
    type: "defense",
    subtype: "Defense \xB7 Software Update",
    expansion: "frontier",
    set: "Frontier Protocols",
    rarity: "uncommon",
    cost: 2,
    target: "none",
    text: "Counters two malware or exploit attacks. Draw 1 card when deployed.",
    flavor: "The patch is mandatory. The reboot is a suggestion.",
    strategy: "Efficient two-charge defense against the most common damage tags, with a replacement card attached.",
    synergies: ["Cold Storage", "Incident Response", "Software cores"],
    counterplay: "Switch to denial, hack, or social tags. Patch Tuesday is only as good as your predictability.",
    keywords: ["malware-defense", "exploit-defense", "draw"],
    art: frontierArt("patch-tuesday"),
    alt: "A glowing software patch icon stamped onto a server rack.",
    actions: [{ kind: "draw", amount: 1, target: "self" }],
    defense: { blocks: ["malware", "exploit"], uses: 2 }
  }),
  card({
    id: "honeypot-protocol",
    name: "Honeypot Protocol",
    type: "defense",
    subtype: "Defense \xB7 Strategy",
    expansion: "frontier",
    set: "Frontier Protocols",
    rarity: "rare",
    cost: 3,
    target: "none",
    text: "Counters one attack of any tag. Draw 1 card and gain 1 credit.",
    flavor: "The trap is not the point. The point is who walks into it.",
    strategy: "Flexible reaction with built-in economy. It never feels dead because it cycles and refunds.",
    synergies: ["Zero Trust Overhaul", "Root Access", "Control decks"],
    counterplay: "Bait it with a cheap attack, then land two real threats in the same turn.",
    keywords: ["all-defense", "draw", "economy"],
    art: frontierArt("honeypot-protocol"),
    alt: "A glowing decoy server surrounded by deceptive data trails.",
    actions: [
      { kind: "draw", amount: 1, target: "self" },
      { kind: "credits", amount: 1, target: "self" }
    ],
    defense: { blocks: ["all"], uses: 1, armor: 1 }
  }),
  card({
    id: "redundant-uplink",
    name: "Redundant Uplink",
    type: "asset",
    subtype: "Asset \xB7 ISP",
    expansion: "frontier",
    set: "Frontier Protocols",
    rarity: "uncommon",
    cost: 3,
    target: "none",
    text: "Deploy Redundant Uplink. Scores 1 each round and pays 1 credit each turn.",
    flavor: "Two connections, one problem: now you have two things to defend.",
    strategy: "Affordable, resilient economy. It smooths turns and stacks nicely with score multipliers.",
    synergies: ["Zero Trust Overhaul", "Dark Fiber", "King of the Hill"],
    counterplay: "Efficient removal is back-breaking. Save a destroy effect for the second copy.",
    keywords: ["asset", "economy"],
    art: frontierArt("redundant-uplink"),
    alt: "Two mirrored network uplink towers connected by a luminous ring.",
    actions: [],
    passive: { pointsPerRound: 1, creditsPerTurn: 1 }
  }),
  card({
    id: "kingmaker",
    name: "Kingmaker",
    type: "event",
    subtype: "Event \xB7 Strategy",
    expansion: "frontier",
    set: "Frontier Protocols",
    rarity: "epic",
    cost: 3,
    target: "anyPlayer",
    text: "Give any player 4 armor and draw 2 cards. Politics is a resource.",
    flavor: "The crown is heavy. The person holding the ladder chooses who wears it.",
    strategy: "Team up, buy a turn, or set up a king-of-the-hill pivot. In FFA the table will remember this.",
    synergies: ["King of the Hill", "Teams", "Table politics"],
    counterplay: "Punish the caster's card advantage, not the temporary armor. The real gift is the draw.",
    keywords: ["armor", "politics"],
    art: frontierArt("kingmaker"),
    alt: "A glowing ladder leading to an empty crown above a network map.",
    actions: [
      { kind: "shield", amount: 4, target: "chosen" },
      { kind: "draw", amount: 2, target: "self" }
    ]
  }),
  card({
    id: "cold-open",
    name: "Cold Open",
    type: "event",
    subtype: "Event \xB7 Strategy",
    expansion: "frontier",
    set: "Frontier Protocols",
    rarity: "uncommon",
    cost: 1,
    target: "none",
    text: "Gain 2 credits. Draw 1 card. Start something you cannot finish.",
    flavor: "Every incident begins with someone skipping the change-management step.",
    strategy: "A cheap fix for awkward openings. It makes speculative keeps and expensive defense turns possible.",
    synergies: ["Bonzi Buddy", "Dark Fiber", "Combo decks"],
    counterplay: "It is pure setup; pressure the caster before the investment pays out.",
    keywords: ["draw", "economy"],
    art: frontierArt("cold-open"),
    alt: "A dark terminal opening with a single blinking cursor.",
    actions: [
      { kind: "credits", amount: 2, target: "self" },
      { kind: "draw", amount: 1, target: "self" }
    ]
  })
];
var BRAINROT_CARDS = [
  card({
    id: "skibidi-toilet",
    name: "Skibidi Toilet",
    type: "attack",
    subtype: "Attack \xB7 Brainrot",
    expansion: "brainrot",
    set: "Brainrot Overflow",
    rarity: "legendary",
    cost: 6,
    target: "enemyPlayer",
    text: "Deal 5 damage to the target and 2 damage to every other enemy. The song is now in their head.",
    flavor: "It has no firewall. It has a head. That is worse.",
    strategy: "A six-cost table bomb that shines in FFA and breaks clustered team defenses. Best when you can follow through on the wounded.",
    synergies: ["Bombardiro Crocodilo", "Negative Aura", "Area-damage shells"],
    counterplay: "Do not stack low-HP players in range. Armor up before the drop and focus the caster immediately.",
    keywords: ["area", "brainrot", "iconic"],
    art: brainrotArt("skibidi-toilet"),
    alt: "A chrome toilet wearing sunglasses and headphones, surrounded by neon memes.",
    voiceLine: "Skibidi dop dop dop yes yes!",
    actions: [
      { kind: "damage", amount: 5, target: "chosen" },
      { kind: "damage", amount: 2, target: "allEnemies" }
    ]
  }),
  card({
    id: "sigma-grindset",
    name: "Sigma Grindset",
    type: "event",
    subtype: "Event \xB7 Brainrot",
    expansion: "brainrot",
    set: "Brainrot Overflow",
    rarity: "rare",
    cost: 2,
    target: "none",
    text: "Gain 2 credits. Your assets score 1 extra point this round. Wake up at 4 a.m. for no reason.",
    flavor: "No days off. No friends. No firewall updates.",
    strategy: "Turns a wide board into a surprise scoring burst. Hold it until the opponent has committed their removal.",
    synergies: ["Aura Farming", "Skibidi Rizzler", "Go-wide decks"],
    counterplay: "Keep the caster's asset count low. Asset removal before round end blanks the entire payoff.",
    keywords: ["brainrot", "score-buff"],
    art: brainrotArt("sigma-grindset"),
    alt: "A glowing silhouette doing a disciplined pose in a neon gym.",
    voiceLine: "Grind. Rizz. Repeat.",
    actions: [
      { kind: "credits", amount: 2, target: "self" },
      { kind: "buffAssets", amount: 1, rounds: 1, target: "self" }
    ]
  }),
  card({
    id: "ohio-rizz",
    name: "Ohio Rizz",
    type: "attack",
    subtype: "Attack \xB7 Brainrot",
    expansion: "brainrot",
    set: "Brainrot Overflow",
    rarity: "uncommon",
    cost: 3,
    target: "enemyPlayer",
    text: "Deal 2 damage and drain 4 score from an enemy.",
    flavor: "The rizz is incomprehensible. The point loss is not.",
    strategy: "A score-first attack for racing and for teams trying to keep a rival below the win threshold.",
    synergies: ["Negative Aura", "Only in Ohio", "Score-control"],
    counterplay: "HP defenses do not stop drains. Pressure the caster before they can repeat it.",
    keywords: ["brainrot", "drain"],
    art: brainrotArt("ohio-rizz"),
    alt: "A glitching Ohio-ish map covered in question marks and lightning.",
    voiceLine: "Only in Ohio.",
    actions: [
      { kind: "damage", amount: 2, target: "chosen" },
      { kind: "drain", amount: 4, target: "chosen" }
    ]
  }),
  card({
    id: "fanum-tax",
    name: "Fanum Tax",
    type: "event",
    subtype: "Event \xB7 Brainrot",
    expansion: "brainrot",
    set: "Brainrot Overflow",
    rarity: "uncommon",
    cost: 2,
    target: "enemyPlayer",
    text: "Steal 3 credits from an enemy. Their lunch is now your lunch.",
    flavor: "A tax with no legislation, no receipt, and one very fast hand.",
    strategy: "Denies a key play while fueling yours. Steal before their turn, not after.",
    synergies: ["Friend Request From Nobody", "Root Access", "Tempo decks"],
    counterplay: "Keep credits committed or below three before passing. In teams, warn your partner about the tax lane.",
    keywords: ["brainrot", "credit-theft"],
    art: brainrotArt("fanum-tax"),
    alt: "A cartoon hand swooping over a glowing takeout box labeled with a tax stamp.",
    voiceLine: "That's the Fanum tax.",
    actions: [{ kind: "stealCredits", amount: 3, target: "chosen" }]
  }),
  card({
    id: "grimace-shake",
    name: "Grimace Shake",
    type: "attack",
    subtype: "Attack \xB7 Brainrot",
    expansion: "brainrot",
    set: "Brainrot Overflow",
    rarity: "rare",
    cost: 4,
    target: "enemyPlayer",
    text: "Deal 2 damage now and 2 damage at the end of each of the next 2 rounds.",
    flavor: "It tastes purple. That is not a flavor.",
    strategy: "Sticky damage that pushes through single-charge defenses and forces heal checks every round.",
    synergies: ["Supply Chain Gambit", "Darkity \u2022 Minecraft Mod", "Attrition teams"],
    counterplay: "Heal after the first tick or eliminate the source. Stalling it out is not a plan.",
    keywords: ["brainrot", "ongoing"],
    art: brainrotArt("grimace-shake"),
    alt: "A purple milkshake glowing ominously on a neon diner counter.",
    voiceLine: "Happy birthday... Grimace.",
    actions: [
      { kind: "damage", amount: 2, target: "chosen" },
      { kind: "ongoing", effect: "damage", amount: 2, rounds: 2, label: "Grimace Shake", target: "chosen" }
    ]
  }),
  card({
    id: "tung-tung-tung-sahur",
    name: "Tung Tung Tung Sahur",
    type: "attack",
    subtype: "Attack \xB7 Brainrot",
    expansion: "brainrot",
    set: "Brainrot Overflow",
    rarity: "epic",
    cost: 4,
    target: "enemyPlayer",
    text: "Deal 3 damage. The target skips their next turn.",
    flavor: "The wooden bat is not for hitting. It is for keeping time.",
    strategy: "A tempo card that is stronger than the numbers suggest. Use it to strand a defender before a scoring round.",
    synergies: ["Skibidi Toilet", "Turn control", "Burst decks"],
    counterplay: "Have a second defensive plan and expect the skip. Anti-control decks should pressure the caster's hand.",
    keywords: ["brainrot", "skip-turn"],
    art: brainrotArt("tung-tung-tung-sahur"),
    alt: "A wooden meme creature with a baseball bat silhouetted in neon dawn fog.",
    voiceLine: "Tung tung tung tung tung tung tung sahur!",
    actions: [
      { kind: "damage", amount: 3, target: "chosen" },
      { kind: "skipTurn", target: "chosen" }
    ]
  }),
  card({
    id: "tralalero-tralala",
    name: "Tralalero Tralala",
    type: "attack",
    subtype: "Attack \xB7 Brainrot",
    expansion: "brainrot",
    set: "Brainrot Overflow",
    rarity: "uncommon",
    cost: 2,
    target: "enemyPlayer",
    text: "Deal 4 damage. Somehow, the shoes are the threat.",
    flavor: "A shark in sneakers has a better firewall than you.",
    strategy: "Efficient direct damage for closing a low-HP target before they can stabilize.",
    synergies: ["Bombardiro Crocodilo", "Burst decks", "Sudden Death"],
    counterplay: "Cheap single-tag defenses blank it. Save one for the second copy.",
    keywords: ["brainrot", "damage"],
    art: brainrotArt("tralalero-tralala"),
    alt: "A blue shark wearing bright sneakers, sprinting through a neon colosseum.",
    voiceLine: "Tralalero tralala!",
    actions: [{ kind: "damage", amount: 4, target: "chosen" }]
  }),
  card({
    id: "bombardiro-crocodilo",
    name: "Bombardiro Crocodilo",
    type: "attack",
    subtype: "Attack \xB7 Brainrot",
    expansion: "brainrot",
    set: "Brainrot Overflow",
    rarity: "rare",
    cost: 4,
    target: "none",
    text: "Deal 3 damage to every enemy. Aerial fireworks are included.",
    flavor: "The crocodile does not have a pilot's license. It has a bomber.",
    strategy: "A team-fight and FFA all-star that punishes clustered low-HP boards.",
    synergies: ["Skibidi Toilet", "Bombombini Gusini", "Area shells"],
    counterplay: "Spread armor and avoid burning your own defenses too early. Single-target races are the counter.",
    keywords: ["brainrot", "area"],
    art: brainrotArt("bombardiro-crocodilo"),
    alt: "A military crocodile bomber flying over a pastel pink city.",
    voiceLine: "Bombardiro crocodilo!",
    actions: [{ kind: "damage", amount: 3, target: "allEnemies" }]
  }),
  card({
    id: "lirili-larila",
    name: "Liril\xEC Laril\xE0",
    type: "event",
    subtype: "Event \xB7 Brainrot",
    expansion: "brainrot",
    set: "Brainrot Overflow",
    rarity: "rare",
    cost: 2,
    target: "none",
    text: "Gain 8 armor. The elephant-cactus has seen enough.",
    flavor: "A cactus with a suitcase and no context is still a survivability plan.",
    strategy: "One big armor turn for surviving a coordinated team spike, especially after a skip.",
    synergies: ["Incident Response", "Sudden Death", "Defensive pivots"],
    counterplay: "Armor does not stop score drains. Shift your pressure to the scoreboard.",
    keywords: ["brainrot", "armor"],
    art: brainrotArt("lirili-larila"),
    alt: "A surreal elephant-cactus hybrid with a tiny suitcase in a pink desert.",
    voiceLine: "Liril\xEC laril\xE0, liril\xEC laril\xE0!",
    actions: [{ kind: "shield", amount: 8, target: "self" }]
  }),
  card({
    id: "boneca-ambalabu",
    name: "Boneca Ambalabu",
    type: "attack",
    subtype: "Attack \xB7 Brainrot",
    expansion: "brainrot",
    set: "Brainrot Overflow",
    rarity: "rare",
    cost: 3,
    target: "enemyPlayer",
    text: "Deal 3 damage and drain 2 score. The frog head is not licensing its likeness.",
    flavor: "The frog head is not licensing its likeness.",
    strategy: "A flexible hybrid hit that contributes to both elimination and score-lock plans.",
    synergies: ["Ohio Rizz", "Negative Aura", "Score-lock teams"],
    counterplay: "Heal and outscore. It is efficient at everything but not dominant at any one thing.",
    keywords: ["brainrot", "drain"],
    art: brainrotArt("boneca-ambalabu"),
    alt: "A frog-headed meme creature with oversized tires on a causeway.",
    voiceLine: "Boneca ambalabu!",
    actions: [
      { kind: "damage", amount: 3, target: "chosen" },
      { kind: "drain", amount: 2, target: "chosen" }
    ]
  }),
  card({
    id: "brr-brr-patapim",
    name: "Brr Brr Patapim",
    type: "defense",
    subtype: "Defense \xB7 Brainrot",
    expansion: "brainrot",
    set: "Brainrot Overflow",
    rarity: "rare",
    cost: 3,
    target: "none",
    text: "Counters two malware or denial attacks. Its nose is a complete security policy.",
    flavor: "The tree-monkey has a nose for intrusions.",
    strategy: "A sturdy two-charge guard against the most common disruption lanes, perfect for protecting an economy engine.",
    synergies: ["Bonzi Buddy", "Dark Fiber", "Economy shells"],
    counterplay: "Rotate to hack, phishing, or social. Predictability is the vulnerability.",
    keywords: ["brainrot", "malware-defense", "denial-defense"],
    art: brainrotArt("brr-brr-patapim"),
    alt: "A surreal tree-monkey creature with a long nose in a misty forest.",
    voiceLine: "Brr brr patapim!",
    actions: [],
    defense: { blocks: ["malware", "denial"], uses: 2 }
  }),
  card({
    id: "cappuccino-assassino",
    name: "Cappuccino Assassino",
    type: "attack",
    subtype: "Attack \xB7 Brainrot",
    expansion: "brainrot",
    set: "Brainrot Overflow",
    rarity: "rare",
    cost: 3,
    target: "enemyAsset",
    text: "Destroy an enemy asset. The target loses 1 score.",
    flavor: "The espresso is cold. The assassin is not.",
    strategy: "Precision asset removal in a cup. Break the engine before the next scoring step.",
    synergies: ["Darkity's Corrupted Chunk", "Asset denial", "Tempo teams"],
    counterplay: "Keep two scoring assets. Force the assassin to choose the least important one.",
    keywords: ["brainrot", "destroy"],
    art: brainrotArt("cappuccino-assassino"),
    alt: "A tiny shark barista assassin lurking behind a glowing espresso cup.",
    voiceLine: "Cappuccino assassino.",
    actions: [
      { kind: "destroyAsset", target: "chosenAsset" },
      { kind: "drain", amount: 1, target: "chosen" }
    ]
  }),
  card({
    id: "bombombini-gusini",
    name: "Bombombini Gusini",
    type: "attack",
    subtype: "Attack \xB7 Brainrot",
    expansion: "brainrot",
    set: "Brainrot Overflow",
    rarity: "uncommon",
    cost: 3,
    target: "enemyPlayer",
    text: "Deal 4 damage. The goose bomber has chosen a lane.",
    flavor: "The goose bomber has chosen your lane.",
    strategy: "Straight-line damage with a good cost-to-impact ratio in duel and team formats.",
    synergies: ["Bombardiro Crocodilo", "Tralalero Tralala", "Burst decks"],
    counterplay: "A single tag defense or armor absorbs it. Do not spend two cards answering one.",
    keywords: ["brainrot", "damage"],
    art: brainrotArt("bombombini-gusini"),
    alt: "A cartoon goose in aviator goggles piloting a tiny propeller plane.",
    voiceLine: "Bombombini gusini!",
    actions: [{ kind: "damage", amount: 4, target: "chosen" }]
  }),
  card({
    id: "chimpanzini-bananini",
    name: "Chimpanzini Bananini",
    type: "asset",
    subtype: "Asset \xB7 Brainrot",
    expansion: "brainrot",
    set: "Brainrot Overflow",
    rarity: "rare",
    cost: 4,
    target: "none",
    text: "Deploy Chimpanzini Bananini. Scores 2 each round and pays 1 credit each turn. It is a shark-monkey. Do not ask.",
    flavor: "It is a shark. It is a monkey. It is on payroll.",
    strategy: "A sticky value engine with both score and economy. Cost-efficient if it survives two rounds.",
    synergies: ["Bonzi Buddy", "Aura Farming", "Economy shells"],
    counterplay: "Kill it before it returns its cost. Every asset in a brainrot deck is bait for the next one.",
    keywords: ["brainrot", "asset", "economy"],
    art: brainrotArt("chimpanzini-bananini"),
    alt: "A banana-colored shark-monkey hybrid staffing a neon control desk.",
    voiceLine: "Chimpanzini bananini!",
    actions: [],
    passive: { pointsPerRound: 2, creditsPerTurn: 1 }
  }),
  card({
    id: "bobrito-bandito",
    name: "Bobrito Bandito",
    type: "attack",
    subtype: "Attack \xB7 Brainrot",
    expansion: "brainrot",
    set: "Brainrot Overflow",
    rarity: "rare",
    cost: 3,
    target: "enemyPlayer",
    text: "Deal 3 damage and steal 2 credits. The beaver has a permit for neither.",
    flavor: "The beaver has a permit for neither.",
    strategy: "Disruption plus economy. Steal the exact cost of a defense and watch the plan fall apart.",
    synergies: ["Fanum Tax", "Root Access", "Tempo decks"],
    counterplay: "Spend down credits, or force the bandit to choose between damage and taxes with armor.",
    keywords: ["brainrot", "credit-theft"],
    art: brainrotArt("bobrito-bandito"),
    alt: "A cartoon beaver bandit wearing a tiny hat in a neon alley.",
    voiceLine: "Bobrito bandito!",
    actions: [
      { kind: "damage", amount: 3, target: "chosen" },
      { kind: "stealCredits", amount: 2, target: "chosen" }
    ]
  }),
  card({
    id: "frigo-camelo",
    name: "Frigo Camelo",
    type: "defense",
    subtype: "Defense \xB7 Brainrot",
    expansion: "brainrot",
    set: "Brainrot Overflow",
    rarity: "uncommon",
    cost: 2,
    target: "none",
    text: "Counters two phishing or hack attacks. The refrigerator camel does not explain itself.",
    flavor: "The refrigerator camel does not explain itself.",
    strategy: "A cheap two-charge guard for the social and intrusion lanes, excellent for protecting expensive scoring assets.",
    synergies: ["Chimpanzini Bananini", "Verity \u2022 Minecraft Mod", "Defensive cores"],
    counterplay: "Use denial, exploit, or malware. The camel has a narrow job and does it well.",
    keywords: ["brainrot", "phishing-defense", "hack-defense"],
    art: brainrotArt("frigo-camelo"),
    alt: "A camel fused with a refrigerator in a surreal desert.",
    voiceLine: "Frigo camelo.",
    actions: [],
    defense: { blocks: ["phishing", "hack"], uses: 2 }
  }),
  card({
    id: "glorbo-fruttodrillo",
    name: "Glorbo Fruttodrillo",
    type: "asset",
    subtype: "Asset \xB7 Brainrot",
    expansion: "brainrot",
    set: "Brainrot Overflow",
    rarity: "uncommon",
    cost: 3,
    target: "none",
    text: "Deploy Glorbo Fruttodrillo. Scores 1 each round and pays 2 credits each turn.",
    flavor: "The fruit crocodile pays his invoices in exposure.",
    strategy: "Pure tempo economy. Deploy early, defend once, and use the credits to control the midgame.",
    synergies: ["Dark Fiber", "Bonzi's Toolbar", "Control decks"],
    counterplay: "One cheap destroy effect flips the entire investment. Punish it before the second income tick.",
    keywords: ["brainrot", "asset", "economy"],
    art: brainrotArt("glorbo-fruttodrillo"),
    alt: "A fruit-crocodile hybrid conducting business on a neon dock.",
    voiceLine: "Glorbo fruttodrillo!",
    actions: [],
    passive: { pointsPerRound: 1, creditsPerTurn: 2 }
  }),
  card({
    id: "mewing-streak",
    name: "Mewing Streak",
    type: "defense",
    subtype: "Defense \xB7 Brainrot",
    expansion: "brainrot",
    set: "Brainrot Overflow",
    rarity: "rare",
    cost: 3,
    target: "none",
    text: "Counters one attack of any tag. Gain 2 armor. Shhh. No words. Only jawline.",
    flavor: "Shhh. No words. Only jawline.",
    strategy: "A universal one-shot defense with armor attached. Flexible, if expensive; perfect for protecting a win turn.",
    synergies: ["Zero Trust Overhaul", "Liril\xEC Laril\xE0", "Protect-the-lead"],
    counterplay: "Bait the single charge with a cheap attack, then commit the real one.",
    keywords: ["brainrot", "all-defense", "armor"],
    art: brainrotArt("mewing-streak"),
    alt: "A serene outlined face surrounded by glowing jawline geometry.",
    voiceLine: "Mewing. Silence.",
    actions: [{ kind: "shield", amount: 2, target: "self" }],
    defense: { blocks: ["all"], uses: 1 }
  }),
  card({
    id: "no-cap",
    name: "No Cap",
    type: "event",
    subtype: "Event \xB7 Brainrot",
    expansion: "brainrot",
    set: "Brainrot Overflow",
    rarity: "common",
    cost: 1,
    target: "enemyPlayer",
    text: "Reveal an enemy's hand. Draw 1 card.",
    flavor: "No cap. The hat is a lie.",
    strategy: "Cheap information and card replacement. Cast before choosing targets to avoid walking into a counter.",
    synergies: ["Packet Mirror", "Verity Knows", "Information shells"],
    counterplay: "Low hand size makes the reveal cheap. Use the information asymmetry to bluff.",
    keywords: ["brainrot", "reveal", "draw"],
    art: brainrotArt("no-cap"),
    alt: "A neon cap floating above a cursor with a truth-check icon.",
    voiceLine: "No cap, for real.",
    actions: [
      { kind: "revealHand", target: "chosen" },
      { kind: "draw", amount: 1, target: "self" }
    ]
  }),
  card({
    id: "delulu",
    name: "Delulu",
    type: "event",
    subtype: "Event \xB7 Brainrot",
    expansion: "brainrot",
    set: "Brainrot Overflow",
    rarity: "common",
    cost: 1,
    target: "none",
    text: "Gain 5 armor and draw 1 card. Delulu is the solulu.",
    flavor: "Delulu is the solulu.",
    strategy: "A cheap defensive cantrip. It buys a turn and finds the card that actually solves the problem.",
    synergies: ["Delulu", "Mewing Streak", "Defensive cantrips"],
    counterplay: "Score drains bypass armor. Do not let the caster turn every chip attack into a tempo loss.",
    keywords: ["brainrot", "armor", "draw"],
    art: brainrotArt("delulu"),
    alt: "A glowing pink brain made of hearts and static.",
    voiceLine: "Delulu is the solulu.",
    actions: [
      { kind: "shield", amount: 5, target: "self" },
      { kind: "draw", amount: 1, target: "self" }
    ]
  }),
  card({
    id: "aura-farming",
    name: "Aura Farming",
    type: "asset",
    subtype: "Asset \xB7 Brainrot",
    expansion: "brainrot",
    set: "Brainrot Overflow",
    rarity: "epic",
    cost: 4,
    target: "none",
    text: "Deploy Aura Farming. Scores 2 each round. Every round, the table has to look at you.",
    flavor: "The aura is not a stat. It is a threat.",
    strategy: "Reliable score without economy; a clean clock for teams that already have a credit engine.",
    synergies: ["Sigma Grindset", "Skibidi Rizzler", "Score engines"],
    counterplay: "Two points a round is a countdown. Spend removal before it reaches the threshold.",
    keywords: ["brainrot", "asset", "score"],
    art: brainrotArt("aura-farming"),
    alt: "A silhouetted figure emitting concentric neon aura rings above a network table.",
    voiceLine: "Aura plus one thousand.",
    actions: [],
    passive: { pointsPerRound: 2 }
  }),
  card({
    id: "negative-aura",
    name: "Negative Aura",
    type: "attack",
    subtype: "Attack \xB7 Brainrot",
    expansion: "brainrot",
    set: "Brainrot Overflow",
    rarity: "common",
    cost: 2,
    target: "enemyPlayer",
    text: "Drain 4 score from an enemy. Emotional damage is still damage.",
    flavor: "The worst thing you can do to someone is make them read the numbers.",
    strategy: "Cheap score denial that scales in games with a low win threshold. Finish what another drain started.",
    synergies: ["Ohio Rizz", "Verity Knows", "Score-lock decks"],
    counterplay: "Score drains are efficient but do not remove boards. Race the caster on assets.",
    keywords: ["brainrot", "drain"],
    art: brainrotArt("negative-aura"),
    alt: "A violet negative aura radiating from a dejected avatar.",
    voiceLine: "Your aura is in shambles.",
    actions: [{ kind: "drain", amount: 4, target: "chosen" }]
  }),
  card({
    id: "lock-in",
    name: "Lock In",
    type: "event",
    subtype: "Event \xB7 Brainrot",
    expansion: "brainrot",
    set: "Brainrot Overflow",
    rarity: "rare",
    cost: 2,
    target: "none",
    text: "Gain 3 credits and draw 2 cards. No distractions. Except the seven tabs.",
    flavor: "No distractions. Except the seven tabs.",
    strategy: "A powerful refuel that lets a constrained turn become a double threat. Save it for the turn you can convert.",
    synergies: ["Bonzi Buddy", "Combo turns", "Control decks"],
    counterplay: "The caster spent a card to do nothing to the board. Attack the opening immediately.",
    keywords: ["brainrot", "draw", "economy"],
    art: brainrotArt("lock-in"),
    alt: "A glowing lock icon closing over a browser full of tabs.",
    voiceLine: "Lock in. Lock in. Lock in.",
    actions: [
      { kind: "credits", amount: 3, target: "self" },
      { kind: "draw", amount: 2, target: "self" }
    ]
  }),
  card({
    id: "looksmaxxing",
    name: "Looksmaxxing",
    type: "defense",
    subtype: "Defense \xB7 Brainrot",
    expansion: "brainrot",
    set: "Brainrot Overflow",
    rarity: "uncommon",
    cost: 2,
    target: "none",
    text: "Counters two exploit or hack attacks. Gain 1 armor when deployed.",
    flavor: "The jawline is a firewall. Do not question the science.",
    strategy: "Two reliable charges against technical intrusion, with passive armor to soften follow-up burst.",
    synergies: ["Mewing Streak", "Verity's Flashlight", "Technical shells"],
    counterplay: "Use malware, denial, or social tags. The jawline cannot stop a phishing email.",
    keywords: ["brainrot", "exploit-defense", "hack-defense"],
    art: brainrotArt("looksmaxxing"),
    alt: "A geometric profile being optimized by neon measurement lines.",
    voiceLine: "Mewing. Locked in.",
    actions: [{ kind: "shield", amount: 1, target: "self" }],
    defense: { blocks: ["exploit", "hack"], uses: 2 }
  }),
  card({
    id: "what-the-sigma",
    name: "What the Sigma?",
    type: "event",
    subtype: "Event \xB7 Brainrot",
    expansion: "brainrot",
    set: "Brainrot Overflow",
    rarity: "rare",
    cost: 2,
    target: "enemyPlayer",
    text: "Force an enemy to discard 2 cards. The confusion is a feature.",
    flavor: "The confusion is a feature.",
    strategy: "Strips defensive options before a kill turn. Strong in teams where a partner can follow up immediately.",
    synergies: ["Verity Knows", "Mogging", "Focus-fire teams"],
    counterplay: "Draw effects and redundant defenses blunt the disruption. Punish the tempoless turn.",
    keywords: ["brainrot", "discard"],
    art: brainrotArt("what-the-sigma"),
    alt: "A giant glowing question mark made of static over a neon table.",
    voiceLine: "What the sigma?",
    actions: [{ kind: "discard", amount: 2, target: "chosen" }]
  }),
  card({
    id: "gigachad-uplink",
    name: "Gigachad Uplink",
    type: "asset",
    subtype: "Asset \xB7 Brainrot",
    expansion: "brainrot",
    set: "Brainrot Overflow",
    rarity: "epic",
    cost: 4,
    target: "none",
    text: "Scores 2 each round and pays 1 credit each turn. Refuses to elaborate.",
    flavor: "Refuses to elaborate. Remains online.",
    strategy: "A premium dual-value asset. If it survives two rounds, the game starts bending toward you.",
    synergies: ["Aura Farming", "Bonzi Buddy", "Economy shells"],
    counterplay: "Its cost is its vulnerability. Have removal ready before it reaches value parity.",
    keywords: ["brainrot", "asset", "economy"],
    art: brainrotArt("gigachad-uplink"),
    alt: "A statuesque chrome figure holding a glowing network uplink.",
    voiceLine: "Gigachad. Uplink secured.",
    actions: [],
    passive: { pointsPerRound: 2, creditsPerTurn: 1 }
  }),
  card({
    id: "sus",
    name: "Sus",
    type: "event",
    subtype: "Event \xB7 Brainrot",
    expansion: "brainrot",
    set: "Brainrot Overflow",
    rarity: "common",
    cost: 2,
    target: "enemyPlayer",
    text: "Reveal an enemy's hand and discard 1 card. The imposter is among us.",
    flavor: "The imposter is among us.",
    strategy: "Information and disruption; a cheap way to check whether the kill line is safe.",
    synergies: ["Among Us Impostor", "No Cap", "Disruption shells"],
    counterplay: "Keep a low hand count and make the discard hit a land.",
    keywords: ["brainrot", "reveal", "discard"],
    art: brainrotArt("sus"),
    alt: "A suspicious crewmate silhouette with a glowing red exclamation mark.",
    voiceLine: "That's sus.",
    actions: [
      { kind: "revealHand", target: "chosen" },
      { kind: "discard", amount: 1, target: "chosen" }
    ]
  }),
  card({
    id: "among-us-impostor",
    name: "Among Us Impostor",
    type: "attack",
    subtype: "Attack \xB7 Brainrot",
    expansion: "brainrot",
    set: "Brainrot Overflow",
    rarity: "rare",
    cost: 3,
    target: "enemyPlayer",
    text: "Deal 4 damage and force a discard. There was one impostor among your defenses.",
    flavor: "There was one impostor among your defenses.",
    strategy: "Damage plus hand disruption. Excellent for opening a hole and then letting a teammate finish the job.",
    synergies: ["Sus", "Tung Tung Tung Sahur", "Focus-fire teams"],
    counterplay: "Redundant defenses in hand. Do not let a single discard strand your entire answer.",
    keywords: ["brainrot", "damage", "discard"],
    art: brainrotArt("among-us-impostor"),
    alt: "A bean-shaped astronaut silhouette with a glowing knife in a neon corridor.",
    voiceLine: "You are the impostor.",
    actions: [
      { kind: "damage", amount: 4, target: "chosen" },
      { kind: "discard", amount: 1, target: "chosen" }
    ]
  }),
  card({
    id: "subway-surfers-brainrot",
    name: "Subway Surfers Gameplay",
    type: "event",
    subtype: "Event \xB7 Brainrot",
    expansion: "brainrot",
    set: "Brainrot Overflow",
    rarity: "rare",
    cost: 3,
    target: "enemyPlayer",
    text: "The target skips their next turn and loses 1 score. Retention is through the floor.",
    flavor: "Above: three tabs. Below: a tiny runner who will never stop.",
    strategy: "Pure tempo denial. Use it before a scoring round to strand a key asset or defense turn.",
    synergies: ["Tung Tung Tung Sahur", "Turn-control", "King of the Hill"],
    counterplay: "Respawn rules and redundant turns reduce the value. Reconnect fast if the timer bites.",
    keywords: ["brainrot", "skip-turn", "drain"],
    art: brainrotArt("subway-surfers-brainrot"),
    alt: "A tiny runner and a subway car in a vertical split-screen meme.",
    voiceLine: "Don't look away. Keep scrolling.",
    actions: [
      { kind: "skipTurn", target: "chosen" },
      { kind: "drain", amount: 1, target: "chosen" }
    ]
  }),
  card({
    id: "ipad-gremlin",
    name: "iPad Gremlin",
    type: "asset",
    subtype: "Asset \xB7 Brainrot",
    expansion: "brainrot",
    set: "Brainrot Overflow",
    rarity: "uncommon",
    cost: 3,
    target: "none",
    text: "Scores 1 each round and pays 2 credits each turn. The screen time is a resource.",
    flavor: "The screen time is a resource.",
    strategy: "A cheap economy engine for decks that need to power expensive crossover cards.",
    synergies: ["Glorbo Fruttodrillo", "Bonzi Buddy", "Combo decks"],
    counterplay: "Kill it before the second payout. A three-cost engine that lives two rounds is a problem.",
    keywords: ["brainrot", "asset", "economy"],
    art: brainrotArt("ipad-gremlin"),
    alt: "A small glowing gremlin holding a tablet in a dark living room.",
    voiceLine: "One more video. One more. One more.",
    actions: [],
    passive: { pointsPerRound: 1, creditsPerTurn: 2 }
  }),
  card({
    id: "backrooms-noclip",
    name: "Backrooms Noclip",
    type: "event",
    subtype: "Event \xB7 Brainrot",
    expansion: "brainrot",
    set: "Brainrot Overflow",
    rarity: "rare",
    cost: 3,
    target: "enemyAsset",
    text: "Disable an enemy asset for 2 rounds. It clipped through the wall.",
    flavor: "You clipped through the wall. The wall is still loading.",
    strategy: "Temporary removal that can curve an opponent's scoring window while leaving them a reason not to overcommit.",
    synergies: ["Supply Chain Gambit", "Darkity's Corrupted Chunk", "Attrition"],
    counterplay: "Keep two scoring assets and use the disabled turn to repair your board.",
    keywords: ["brainrot", "disable"],
    art: brainrotArt("backrooms-noclip"),
    alt: "A yellow office corridor dissolving into static and void.",
    voiceLine: "You noclipped out of reality.",
    actions: [
      { kind: "disableAsset", rounds: 2, target: "chosenAsset" },
      { kind: "drain", amount: 1, target: "chosen" }
    ]
  }),
  card({
    id: "john-pork-calls",
    name: "John Pork Calls",
    type: "attack",
    subtype: "Attack \xB7 Brainrot",
    expansion: "brainrot",
    set: "Brainrot Overflow",
    rarity: "uncommon",
    cost: 2,
    target: "enemyPlayer",
    text: "Reveal the target's hand and deal 3 damage. The call is coming from inside the LAN.",
    flavor: "The call is coming from inside the LAN.",
    strategy: "Information and damage at an efficient price. Use it to time the next attack without guessing.",
    synergies: ["No Cap", "Friend Request From Nobody", "Tempo shells"],
    counterplay: "Chat and voice comms are not revealed, only cards. Keep a defensive card anyway.",
    keywords: ["brainrot", "reveal", "damage"],
    art: brainrotArt("john-pork-calls"),
    alt: "A pink pig-faced caller on a glowing smartphone in a dark room.",
    voiceLine: "John Pork is calling.",
    actions: [
      { kind: "revealHand", target: "chosen" },
      { kind: "damage", amount: 3, target: "chosen" }
    ]
  }),
  card({
    id: "only-in-ohio",
    name: "Only in Ohio",
    type: "event",
    subtype: "Event \xB7 Brainrot",
    expansion: "brainrot",
    set: "Brainrot Overflow",
    rarity: "rare",
    cost: 3,
    target: "none",
    text: "Drain 2 score from every enemy. Apply negative aura liberally.",
    flavor: "Everyone from Ohio loses. The whole table included.",
    strategy: "Area score denial for FFA and teams. It often changes who gets to win next round.",
    synergies: ["Negative Aura", "Ohio Rizz", "Score-lock teams"],
    counterplay: "Score-control mirrors make it symmetrical in name only. Keep a positive asset engine.",
    keywords: ["brainrot", "area", "drain"],
    art: brainrotArt("only-in-ohio"),
    alt: "A glitched landscape of Ohio signs and cultural brainrot monuments.",
    voiceLine: "Only in Ohio.",
    actions: [{ kind: "drain", amount: 2, target: "allEnemies" }]
  }),
  card({
    id: "mogging",
    name: "Mogging",
    type: "event",
    subtype: "Event \xB7 Brainrot",
    expansion: "brainrot",
    set: "Brainrot Overflow",
    rarity: "rare",
    cost: 3,
    target: "enemyPlayer",
    text: "Force an enemy to discard 1 card and drain 2 score. The table must bear witness.",
    flavor: "You are not competing. You are the competition.",
    strategy: "A flexible disruption card that makes an opponent worse while making the scoreboard visibly worse for them.",
    synergies: ["What the Sigma?", "Verity Knows", "Disruption shells"],
    counterplay: "Do not overdraw into discard hate. Tight hand management limits the damage.",
    keywords: ["brainrot", "discard", "drain"],
    art: brainrotArt("mogging"),
    alt: "A stylized face projection mogging a shrinking line chart.",
    voiceLine: "You just got mogged.",
    actions: [
      { kind: "discard", amount: 1, target: "chosen" },
      { kind: "drain", amount: 2, target: "chosen" }
    ]
  }),
  card({
    id: "brainrot-singularity",
    name: "Brainrot Singularity",
    type: "event",
    subtype: "Event \xB7 Brainrot",
    expansion: "brainrot",
    set: "Brainrot Overflow",
    rarity: "mythic",
    cost: 7,
    target: "none",
    text: "Deal 5 damage to every enemy, draw 2 cards, and take 3 network damage. All memes arrive at once.",
    flavor: "The timeline has collapsed into a single infinite feed. It is smiling.",
    strategy: "An all-in board wipe for FFA/team endgames. It costs real HP; use armor or a lethal follow-up.",
    synergies: ["Bombardiro Crocodilo", "Skibidi Toilet", "Sudden Death"],
    counterplay: "Kill the caster before seven credits. If it resolves, stabilize and punish the self-damage.",
    keywords: ["brainrot", "area", "self-damage", "mythic"],
    art: brainrotArt("brainrot-singularity"),
    alt: "A smiling black hole made of meme faces and neon static.",
    voiceLine: "The brainrot is the singularity.",
    actions: [
      { kind: "damage", amount: 5, target: "allEnemies" },
      { kind: "draw", amount: 2, target: "self" },
      { kind: "selfDamage", amount: 3 }
    ]
  }),
  card({
    id: "skibidi-rizzler",
    name: "Skibidi Rizzler",
    type: "asset",
    subtype: "Asset \xB7 Brainrot",
    expansion: "brainrot",
    set: "Brainrot Overflow",
    rarity: "legendary",
    cost: 6,
    target: "none",
    text: "Deploy Skibidi Rizzler. Scores 3 each round. The table's patience is now a game resource.",
    flavor: "Three points a round and absolutely no shame.",
    strategy: "A top-end score engine. It wins if unanswered; its entire job is to force an answer.",
    synergies: ["Aura Farming", "Sigma Grindset", "Score shells"],
    counterplay: "Save your best asset removal for this. Do not let it score twice.",
    keywords: ["brainrot", "asset", "score"],
    art: brainrotArt("skibidi-rizzler"),
    alt: "A polished chrome statue of a toilet wearing sunglasses, on a neon pedestal.",
    voiceLine: "Skibidi rizzler, reported for duty.",
    actions: [],
    passive: { pointsPerRound: 3 }
  }),
  card({
    id: "rizzler",
    name: "Rizzler",
    type: "asset",
    subtype: "Asset \xB7 Brainrot",
    expansion: "brainrot",
    set: "Brainrot Overflow",
    rarity: "rare",
    cost: 4,
    target: "none",
    text: "Scores 1 each round and pays 2 credits each turn. W rizz is a compounding asset.",
    flavor: "W rizz is a compounding asset.",
    strategy: "Use it to bridge to expensive high-impact cards. The opponent has to decide whether it is worth an answer.",
    synergies: ["Gigachad Uplink", "Skibidi Rizzler", "Ramp shells"],
    counterplay: "It is not a fast clock. Ignore it only if the game will end before it returns value.",
    keywords: ["brainrot", "asset", "economy"],
    art: brainrotArt("rizzler"),
    alt: "A smug neon avatar projecting Ws into a network.",
    voiceLine: "W rizz. No re.",
    actions: [],
    passive: { pointsPerRound: 1, creditsPerTurn: 2 }
  }),
  card({
    id: "aura-check",
    name: "Aura Check",
    type: "event",
    subtype: "Event \xB7 Brainrot",
    expansion: "brainrot",
    set: "Brainrot Overflow",
    rarity: "common",
    cost: 1,
    target: "enemyPlayer",
    text: "Reveal an enemy's hand. Gain 1 credit. Rate their aura out loud.",
    flavor: "Rate their aura out loud. Be normal about it.",
    strategy: "A one-credit information cantrip that replaces most of its own cost.",
    synergies: ["No Cap", "Packet Mirror", "Information shells"],
    counterplay: "There is little to deny here; focus on punishing the caster's board development.",
    keywords: ["brainrot", "reveal", "economy"],
    art: brainrotArt("aura-check"),
    alt: "A glowing scanner measuring an aura bar above a player avatar.",
    voiceLine: "Aura check. It's over.",
    actions: [
      { kind: "revealHand", target: "chosen" },
      { kind: "credits", amount: 1, target: "self" }
    ]
  }),
  card({
    id: "capybara-cafe",
    name: "Capybara Caf\xE9",
    type: "asset",
    subtype: "Asset \xB7 Brainrot",
    expansion: "brainrot",
    set: "Brainrot Overflow",
    rarity: "uncommon",
    cost: 2,
    target: "none",
    text: "Scores 1 each round. At the end of each round draw 1 card. The capybara is unbothered.",
    flavor: "The capybara is unbothered.",
    strategy: "A low-cost engine that turns rounds into cards. It pays for itself in options, not raw points.",
    synergies: ["Aura Farming", "Card-advantage shells", "Control decks"],
    counterplay: "Kill it early. Every extra round of draw compounds the opponent's options.",
    keywords: ["brainrot", "asset", "draw"],
    art: brainrotArt("capybara-cafe"),
    alt: "A calm capybara barista behind a tiny neon caf\xE9 counter.",
    voiceLine: "Capybara caf\xE9. Take your time.",
    actions: [],
    passive: { pointsPerRound: 1, drawPerRound: 1 }
  }),
  card({
    id: "not-a-cult",
    name: "Not a Cult",
    type: "event",
    subtype: "Event \xB7 Brainrot",
    expansion: "brainrot",
    set: "Brainrot Overflow",
    rarity: "uncommon",
    cost: 2,
    target: "anyPlayer",
    text: "Give any player 3 armor. Draw 1 card. It's just a very normal friend group.",
    flavor: "It's just a very normal friend group. Sign here.",
    strategy: "Buy a partner a turn, armor a future target, or secure your own key asset before a known spike.",
    synergies: ["Kingmaker", "Teams", "Political decks"],
    counterplay: "The draw is the real effect. Pressure the caster before the friendship compounds.",
    keywords: ["brainrot", "armor", "draw"],
    art: brainrotArt("not-a-cult"),
    alt: "A smiling group in matching robes around a normal folding table.",
    voiceLine: "It's not a cult. It's a community.",
    actions: [
      { kind: "shield", amount: 3, target: "chosen" },
      { kind: "draw", amount: 1, target: "self" }
    ]
  }),
  card({
    id: "unlocked-memory",
    name: "Unlocked Memory",
    type: "event",
    subtype: "Event \xB7 Brainrot",
    expansion: "brainrot",
    set: "Brainrot Overflow",
    rarity: "epic",
    cost: 4,
    target: "none",
    text: "Draw 3 cards and take 2 network damage. The core memory was never locked.",
    flavor: "The core memory was never locked. The door was just embarrassed.",
    strategy: "The biggest raw draw in the game, at a price. Great in decks with cheap cards and armor support.",
    synergies: ["Bonzi's Cookie", "Incident Response", "Combo decks"],
    counterplay: "Burn punishes the self-damage. Force the caster to spend their new cards on defense.",
    keywords: ["brainrot", "draw", "self-damage"],
    art: brainrotArt("unlocked-memory"),
    alt: "A glowing door opening into a room full of floating memory cards.",
    voiceLine: "Core memory unlocked.",
    actions: [
      { kind: "draw", amount: 3, target: "self" },
      { kind: "selfDamage", amount: 2 }
    ]
  }),
  card({
    id: "goofy-ahh-firewall",
    name: "Goofy Ahh Firewall",
    type: "defense",
    subtype: "Defense \xB7 Brainrot",
    expansion: "brainrot",
    set: "Brainrot Overflow",
    rarity: "common",
    cost: 2,
    target: "none",
    text: "Counters two malware attacks. Gain 1 credit when deployed.",
    flavor: "The firewall is shaped like a cartoon shoe. It still works.",
    strategy: "A narrow but efficient answer to the most common damage tag, with a tiny refund.",
    synergies: ["Brr Brr Patapim", "Chimpanzini Bananini", "Malware-heavy metas"],
    counterplay: "Use any other tag. The shoe cannot kick what it cannot see.",
    keywords: ["brainrot", "malware-defense"],
    art: brainrotArt("goofy-ahh-firewall"),
    alt: "A giant cartoon shoe glowing with firewall circuitry.",
    voiceLine: "Goofy ahh firewall activated.",
    actions: [{ kind: "credits", amount: 1, target: "self" }],
    defense: { blocks: ["malware"], uses: 2 }
  }),
  card({
    id: "emotional-damage",
    name: "Emotional Damage",
    type: "attack",
    subtype: "Attack \xB7 Brainrot",
    expansion: "brainrot",
    set: "Brainrot Overflow",
    rarity: "common",
    cost: 2,
    target: "enemyPlayer",
    text: "Drain 3 score from an enemy. No physical damage required.",
    flavor: "No physical damage required.",
    strategy: "Pure score pressure for race and lock decks. It ignores armor and most defenses.",
    synergies: ["Negative Aura", "Ohio Rizz", "Score-lock teams"],
    counterplay: "Outscore the caster. Drain does not remove your ability to earn assets.",
    keywords: ["brainrot", "drain"],
    art: brainrotArt("emotional-damage"),
    alt: "A glowing heart shattering into red shards over a scoreboard.",
    voiceLine: "Emotional damage.",
    actions: [{ kind: "drain", amount: 3, target: "chosen" }]
  }),
  card({
    id: "npc-stream",
    name: "NPC Stream",
    type: "asset",
    subtype: "Asset \xB7 Brainrot",
    expansion: "brainrot",
    set: "Brainrot Overflow",
    rarity: "uncommon",
    cost: 2,
    target: "none",
    text: "Scores 1 each round and pays 1 credit each turn. The chat is 90% one word.",
    flavor: "The chat is 90% one word.",
    strategy: "A cheap, modest engine that smooths early turns. More valuable in longer custom games.",
    synergies: ["Capybara Caf\xE9", "Redundant Uplink", "Slow modes"],
    counterplay: "Low impact. Ignore it if faster threats demand your removal.",
    keywords: ["brainrot", "asset", "economy"],
    art: brainrotArt("npc-stream"),
    alt: "A streamer avatar staring blankly as chat floods with repeated words.",
    voiceLine: "Ice cream so good.",
    actions: [],
    passive: { pointsPerRound: 1, creditsPerTurn: 1 }
  }),
  card({
    id: "one-more-tab",
    name: "One More Tab",
    type: "event",
    subtype: "Event \xB7 Brainrot",
    expansion: "brainrot",
    set: "Brainrot Overflow",
    rarity: "common",
    cost: 1,
    target: "none",
    text: "Draw 1 card. Gain 1 credit. You can stop whenever you want.",
    flavor: "You can stop whenever you want.",
    strategy: "The cleanest cycle card in the set. It keeps hands moving without costing a real turn.",
    synergies: ["Lock In", "Spell-heavy tempo", "Draft decks"],
    counterplay: "Cheap cycle is rarely worth countering. Race the board instead.",
    keywords: ["brainrot", "draw", "economy"],
    art: brainrotArt("one-more-tab"),
    alt: "A browser with forty tabs glowing in a dark room.",
    voiceLine: "One more tab. I can stop whenever I want.",
    actions: [
      { kind: "draw", amount: 1, target: "self" },
      { kind: "credits", amount: 1, target: "self" }
    ]
  }),
  card({
    id: "final-boss-fanum",
    name: "Final Boss Fanum",
    type: "attack",
    subtype: "Attack \xB7 Brainrot",
    expansion: "brainrot",
    set: "Brainrot Overflow",
    rarity: "mythic",
    cost: 8,
    target: "enemyPlayer",
    text: "Deal 10 damage and steal 5 credits. If this does not end the game, the table will talk about it anyway.",
    flavor: "The final boss of lunch. The final boss of LAN.",
    strategy: "An absurd finisher for very slow custom games or huge team rumbles. It wins if it resolves; getting there is the hard part.",
    synergies: ["Lock In", "Rizzler", "Endgame ramp"],
    counterplay: "Do not let the caster bank eight credits. Pressure their economy every round.",
    keywords: ["brainrot", "finisher", "unblockable"],
    art: brainrotArt("final-boss-fanum"),
    alt: "A towering fast-food boss figure made of neon static and credit cards.",
    voiceLine: "You have been taxed by the final boss.",
    actions: [
      { kind: "damage", amount: 10, target: "chosen" },
      { kind: "stealCredits", amount: 5, target: "chosen" }
    ]
  }),
  card({
    id: "gyatt-detector",
    name: "Gyatt Detector",
    type: "defense",
    subtype: "Defense \xB7 Brainrot",
    expansion: "brainrot",
    set: "Brainrot Overflow",
    rarity: "uncommon",
    cost: 2,
    target: "none",
    text: "Counters one recon or phishing attack. Draw 1 card. The scanner is very serious.",
    flavor: "The scanner is very serious. Its findings are not.",
    strategy: "Cheap protection with card replacement. Good for defending without falling behind.",
    synergies: ["Frigo Camelo", "Verity's Flashlight", "Defensive cantrips"],
    counterplay: "Use a different tag. The detector only sees one kind of nonsense.",
    keywords: ["brainrot", "recon-defense", "phishing-defense"],
    art: brainrotArt("gyatt-detector"),
    alt: "A radar scanner displaying an exaggerated proximity alert.",
    voiceLine: "Gyatt detected. Initiating defense.",
    actions: [{ kind: "draw", amount: 1, target: "self" }],
    defense: { blocks: ["recon", "phishing"], uses: 1 }
  }),
  card({
    id: "one-two-buckle-my-shoe",
    name: "One, Two, Buckle My Shoe",
    type: "event",
    subtype: "Event \xB7 Brainrot",
    expansion: "brainrot",
    set: "Brainrot Overflow",
    rarity: "rare",
    cost: 2,
    target: "none",
    text: "Gain 4 credits. Draw 1 card. The rhyme is the authentication factor.",
    flavor: "The rhyme is the authentication factor.",
    strategy: "Explosive one-turn economy for a surprise crossover finisher. Dead if you draw it without follow-up.",
    synergies: ["Final Boss Fanum", "Root Access", "Combo shells"],
    counterplay: "Press the caster while they spend a card to do nothing on board.",
    keywords: ["brainrot", "economy", "draw"],
    art: brainrotArt("one-two-buckle-my-shoe"),
    alt: "Glowing children's shoe buckles counting in neon numbers.",
    voiceLine: "One, two, buckle my shoe.",
    actions: [
      { kind: "credits", amount: 4, target: "self" },
      { kind: "draw", amount: 1, target: "self" }
    ]
  })
];
var EXPANSION_CARDS = [
  ...CROSSOVER_CARDS,
  ...FRONTIER_CARDS,
  ...BRAINROT_CARDS
];

// src/shared/cards/index.ts
var ALL_CARDS = [...CLASSIC_CARDS, ...EXPANSION_CARDS];
var byId = /* @__PURE__ */ new Map();
for (const definition of ALL_CARDS) {
  if (byId.has(definition.id)) {
    throw new Error(`Duplicate card id: ${definition.id}`);
  }
  byId.set(definition.id, definition);
}
function getCard(id) {
  const definition = byId.get(id);
  if (!definition) {
    throw new Error(`Unknown card id: ${id}`);
  }
  return definition;
}
function tryGetCard(id) {
  return byId.get(id);
}
var CARD_IDS = ALL_CARDS.map((card2) => card2.id);
var STARTER_CARD_IDS = [
  "desktop-computer",
  "isp-connection",
  "laptop-computer",
  "wireless-router",
  "host-based-firewall",
  "anti-malware-virus",
  "os-update-patch",
  "encryption",
  "security-training",
  "phishing",
  "denial-of-service-dos",
  "password-cracked",
  "trojan-horse",
  "power-outage",
  "budget-increased",
  "hardware-failure"
];
function cardPoolForSettings(input) {
  const enabledSet = new Set(input.enabledCards);
  const bannedSet = new Set(input.bannedCards);
  return ALL_CARDS.filter((card2) => {
    if (bannedSet.has(card2.id)) return false;
    if (input.cardPool === "starter" && !STARTER_CARD_IDS.includes(card2.id)) return false;
    if (input.cardPool === "custom" && enabledSet.size > 0 && !enabledSet.has(card2.id)) return false;
    if (!input.enabledExpansions.includes(card2.expansion)) return false;
    return true;
  });
}

// src/server/discovery.ts
var import_node_dgram = require("node:dgram");
var import_node_os = require("node:os");
var import_bonjour_service = require("bonjour-service");
var DISCOVERY_TYPE = "cyberthreat";
var DISCOVERY_PROBE = "CTD_DISCOVER_V1";
var DEFAULT_DISCOVERY_PORT = 41234;
function safeString(value, max = 80) {
  return typeof value === "string" ? value.slice(0, max) : "";
}
function localAddresses() {
  const interfaces = (0, import_node_os.networkInterfaces)();
  const results = [];
  for (const entries of Object.values(interfaces)) {
    for (const entry of entries ?? []) {
      if (entry.family === "IPv4" && !entry.internal && entry.address) {
        results.push({ address: entry.address, netmask: entry.netmask });
      }
    }
  }
  return results;
}
function broadcastFor(address, netmask) {
  const addressParts = address.split(".").map(Number);
  const maskParts = netmask.split(".").map(Number);
  if (addressParts.length !== 4 || maskParts.length !== 4 || [...addressParts, ...maskParts].some((part) => Number.isNaN(part))) {
    return null;
  }
  return addressParts.map((part, index) => (part & maskParts[index] | ~maskParts[index] & 255) & 255).join(".");
}
function phaseFrom(value) {
  return value === "drafting" || value === "playing" || value === "ended" ? value : "lobby";
}
function toDiscoveryLobby(record, source, fallbackHost) {
  const id = safeString(record.id, 80);
  const name = safeString(record.name, 80);
  const host2 = safeString(record.host, 120) || fallbackHost;
  const port = Number(record.port);
  if (!id || !name || !host2 || !Number.isInteger(port) || port <= 0 || port > 65535) return null;
  const playersValue = Number(record.players);
  return {
    id,
    name,
    hostName: safeString(record.hostName, 40) || "Host",
    host: host2,
    port,
    players: Number.isFinite(playersValue) ? Math.max(0, Math.round(playersValue)) : 0,
    phase: phaseFrom(record.phase),
    version: safeString(record.version, 20) || "1.0.0",
    source
  };
}
var DiscoveryService = class {
  options;
  port;
  udp = null;
  bonjour = null;
  service = null;
  publishedName = "";
  refreshTimer = null;
  scanCache = null;
  scanning = null;
  constructor(options) {
    this.options = options;
    this.port = options.discoveryPort ?? DEFAULT_DISCOVERY_PORT;
  }
  async start() {
    if (this.options.enableMdns !== false) this.startMdns();
    if (this.options.enableUdp !== false) this.startUdp();
    this.refreshTimer = setInterval(() => this.refreshAdvertisement(), 7e3);
    this.refreshTimer.unref?.();
  }
  async stop() {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
    this.refreshTimer = null;
    this.udp?.close();
    this.udp = null;
    if (this.bonjour) {
      try {
        await new Promise((resolve2) => this.bonjour?.unpublishAll(() => resolve2()));
        this.bonjour?.destroy();
      } catch {
      }
    }
    this.bonjour = null;
    this.service = null;
  }
  startMdns() {
    try {
      this.bonjour = new import_bonjour_service.Bonjour();
      this.publishMdns();
    } catch (error) {
      console.warn("[discovery] mDNS unavailable:", error);
      this.bonjour = null;
    }
  }
  publishMdns() {
    if (!this.bonjour) return;
    const { info, lobby } = this.options.getRecord();
    const serviceName = `${lobby.settings.lobbyName} (${info.id.slice(0, 4)})`;
    try {
      this.service?.stop();
      this.service = this.bonjour.publish({
        name: serviceName,
        type: DISCOVERY_TYPE,
        protocol: "tcp",
        port: info.port,
        txt: {
          id: info.id,
          name: lobby.settings.lobbyName,
          hostName: lobby.hostName,
          host: info.addresses[0] ?? "127.0.0.1",
          port: String(info.port),
          players: String(lobby.players.length),
          phase: lobby.phase,
          version: info.version
        }
      });
      this.publishedName = serviceName;
    } catch (error) {
      console.warn("[discovery] Could not publish mDNS service:", error);
    }
  }
  refreshAdvertisement() {
    if (!this.bonjour) return;
    const { info, lobby } = this.options.getRecord();
    const serviceName = `${lobby.settings.lobbyName} (${info.id.slice(0, 4)})`;
    if (serviceName !== this.publishedName) this.publishMdns();
    else if (this.service) {
      this.service.txt = {
        ...this.service.txt,
        players: String(lobby.players.length),
        phase: lobby.phase,
        hostName: lobby.hostName
      };
    }
  }
  startUdp() {
    try {
      const socket = (0, import_node_dgram.createSocket)({ type: "udp4", reuseAddr: true });
      this.udp = socket;
      socket.on("message", (message, remote) => this.onUdpMessage(message, remote));
      socket.on("error", (error) => {
        console.warn("[discovery] UDP unavailable:", error.message);
        if (this.udp === socket) {
          this.udp = null;
          try {
            socket.close();
          } catch {
          }
        }
      });
      socket.bind(this.port, () => {
        try {
          socket.setBroadcast(true);
        } catch {
        }
      });
    } catch (error) {
      console.warn("[discovery] UDP unavailable:", error);
      this.udp = null;
    }
  }
  onUdpMessage(message, remote) {
    const text = message.toString("utf8", 0, Math.min(message.length, 1024));
    if (!text.includes(DISCOVERY_PROBE) && !text.includes("ctd-discover")) return;
    const { info, lobby } = this.options.getRecord();
    const record = toDiscoveryLobby(
      {
        id: info.id,
        name: lobby.settings.lobbyName,
        hostName: lobby.hostName,
        host: info.addresses[0] ?? remote.address,
        port: info.port,
        players: lobby.players.length,
        phase: lobby.phase,
        version: info.version
      },
      "udp",
      remote.address
    );
    if (!record || !this.udp) return;
    const payload = { type: "ctd-lobby", v: 1, record };
    try {
      this.udp.send(Buffer.from(JSON.stringify(payload)), remote.port, remote.address);
    } catch {
    }
  }
  async scan() {
    if (this.scanCache && Date.now() - this.scanCache.at < 2500) {
      return this.scanCache.records;
    }
    if (this.scanning) return this.scanning;
    this.scanning = this.performScan().finally(() => {
      this.scanning = null;
    });
    const records = await this.scanning;
    this.scanCache = { at: Date.now(), records };
    return records;
  }
  async performScan() {
    const tasks = [];
    if (this.options.enableUdp !== false) tasks.push(this.scanUdp());
    if (this.options.enableMdns !== false && this.bonjour) tasks.push(this.scanMdns());
    const results = await Promise.allSettled(tasks);
    const byId2 = /* @__PURE__ */ new Map();
    const ownId = this.options.getRecord().info.id;
    for (const result of results) {
      if (result.status !== "fulfilled") continue;
      for (const record of result.value) {
        if (record.id === ownId) continue;
        byId2.set(record.id, record);
      }
    }
    return [...byId2.values()];
  }
  scanUdp() {
    return new Promise((resolve2) => {
      const found = /* @__PURE__ */ new Map();
      const socket = (0, import_node_dgram.createSocket)({ type: "udp4" });
      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        try {
          socket.close();
        } catch {
        }
        resolve2([...found.values()]);
      };
      socket.on("message", (message, remote) => {
        if (message.length > 4096) return;
        try {
          const parsed = JSON.parse(message.toString("utf8"));
          if (parsed.type !== "ctd-lobby" || parsed.v !== 1 || !parsed.record) return;
          const record = toDiscoveryLobby(parsed.record, "udp", remote.address);
          if (record) found.set(record.id, record);
        } catch {
        }
      });
      socket.on("error", finish);
      socket.bind(0, () => {
        try {
          socket.setBroadcast(true);
        } catch {
        }
        const targets = /* @__PURE__ */ new Set(["255.255.255.255", "127.0.0.1"]);
        for (const { address, netmask } of localAddresses()) {
          const broadcast = broadcastFor(address, netmask);
          if (broadcast) targets.add(broadcast);
        }
        for (const target of targets) {
          try {
            socket.send(Buffer.from(DISCOVERY_PROBE), this.port, target);
          } catch {
          }
        }
        setTimeout(finish, 750).unref?.();
      });
    });
  }
  scanMdns() {
    return new Promise((resolve2) => {
      if (!this.bonjour) {
        resolve2([]);
        return;
      }
      const found = /* @__PURE__ */ new Map();
      let browser;
      try {
        browser = this.bonjour.find({ type: DISCOVERY_TYPE, protocol: "tcp" });
      } catch {
        resolve2([]);
        return;
      }
      const onUp = (service) => {
        const txt = service.txt ?? {};
        const address = service.addresses?.find((value) => /^\d+\.\d+\.\d+\.\d+$/.test(value)) ?? service.referer?.address ?? "";
        const record = toDiscoveryLobby(
          {
            id: txt.id,
            name: txt.name ?? service.name,
            hostName: txt.hostName,
            host: address || txt.host,
            port: service.port,
            players: txt.players,
            phase: txt.phase,
            version: txt.version
          },
          "mdns",
          address
        );
        if (record) found.set(record.id, record);
      };
      browser.on("up", onUp);
      setTimeout(() => {
        try {
          browser.stop();
        } catch {
        }
        resolve2([...found.values()]);
      }, 850).unref?.();
    });
  }
};

// src/server/lobby.ts
var import_node_crypto2 = require("node:crypto");

// src/shared/engine.ts
var import_node_crypto = require("node:crypto");

// src/shared/formula.ts
function tokenize(source) {
  const tokens = [];
  let index = 0;
  while (index < source.length) {
    const char = source[index];
    if (/\s/.test(char)) {
      index += 1;
      continue;
    }
    if (/[0-9.]/.test(char)) {
      let raw = "";
      while (index < source.length && /[0-9.]/.test(source[index])) {
        raw += source[index];
        index += 1;
      }
      const value = Number(raw);
      if (!Number.isFinite(value)) {
        throw new Error(`Invalid number "${raw}" at character ${index}`);
      }
      tokens.push({ type: "number", value });
      continue;
    }
    if (/[a-zA-Z_]/.test(char)) {
      let raw = "";
      while (index < source.length && /[a-zA-Z0-9_]/.test(source[index])) {
        raw += source[index];
        index += 1;
      }
      tokens.push({ type: "identifier", value: raw });
      continue;
    }
    if (char === "(" || char === ")") {
      tokens.push({ type: "paren", value: char });
      index += 1;
      continue;
    }
    if (char === ",") {
      tokens.push({ type: "comma", value: "," });
      index += 1;
      continue;
    }
    const two = source.slice(index, index + 2);
    if (["==", "!=", "<=", ">=", "&&", "||"].includes(two)) {
      tokens.push({ type: "operator", value: two });
      index += 2;
      continue;
    }
    if (["+", "-", "*", "/", "%", "<", ">", "!"].includes(char)) {
      tokens.push({ type: "operator", value: char });
      index += 1;
      continue;
    }
    throw new Error(`Unexpected character "${char}" at position ${index + 1}`);
  }
  tokens.push({ type: "eof", value: "" });
  return tokens;
}
var FormulaParser = class {
  constructor(tokens, variables) {
    this.tokens = tokens;
    this.variables = variables;
  }
  tokens;
  variables;
  index = 0;
  parse() {
    const value = this.parseOr();
    if (this.peek().type !== "eof") {
      throw new Error(`Unexpected token near "${this.peek().value}"`);
    }
    return value;
  }
  peek() {
    return this.tokens[this.index];
  }
  take() {
    const token = this.peek();
    this.index += 1;
    return token;
  }
  peekOperator(value) {
    const token = this.peek();
    return token.type === "operator" && (value === void 0 || token.value === value);
  }
  takeOperator() {
    const token = this.take();
    if (token.type !== "operator") {
      throw new Error(`Expected an operator near "${token.value}"`);
    }
    return token.value;
  }
  parseOr() {
    let left = this.parseAnd();
    while (this.peekOperator("||")) {
      this.takeOperator();
      const right = this.parseAnd();
      left = Boolean(left) || Boolean(right);
    }
    return left;
  }
  parseAnd() {
    let left = this.parseEquality();
    while (this.peekOperator("&&")) {
      this.takeOperator();
      const right = this.parseEquality();
      left = Boolean(left) && Boolean(right);
    }
    return left;
  }
  parseEquality() {
    let left = this.parseComparison();
    while (this.peekOperator("==") || this.peekOperator("!=")) {
      const operator = this.takeOperator();
      const right = this.parseComparison();
      left = operator === "==" ? left === right : left !== right;
    }
    return left;
  }
  parseComparison() {
    let left = this.parseAdditive();
    while (this.peekOperator("<") || this.peekOperator("<=") || this.peekOperator(">") || this.peekOperator(">=")) {
      const operator = this.takeOperator();
      const right = this.parseAdditive();
      const a = Number(left);
      const b = Number(right);
      if (operator === "<") left = a < b;
      else if (operator === "<=") left = a <= b;
      else if (operator === ">") left = a > b;
      else left = a >= b;
    }
    return left;
  }
  parseAdditive() {
    let left = this.parseMultiplicative();
    while (this.peekOperator("+") || this.peekOperator("-")) {
      const operator = this.takeOperator();
      const right = this.parseMultiplicative();
      left = operator === "+" ? Number(left) + Number(right) : Number(left) - Number(right);
    }
    return left;
  }
  parseMultiplicative() {
    let left = this.parseUnary();
    while (this.peekOperator("*") || this.peekOperator("/") || this.peekOperator("%")) {
      const operator = this.takeOperator();
      const right = this.parseUnary();
      if ((operator === "/" || operator === "%") && Number(right) === 0) {
        throw new Error("Division by zero in formula");
      }
      if (operator === "*") left = Number(left) * Number(right);
      else if (operator === "/") left = Number(left) / Number(right);
      else left = Number(left) % Number(right);
    }
    return left;
  }
  parseUnary() {
    const token = this.peek();
    if (token.type === "operator" && token.value === "!") {
      this.take();
      return !this.parseUnary();
    }
    if (token.type === "operator" && token.value === "-") {
      this.take();
      return -Number(this.parseUnary());
    }
    if (token.type === "operator" && token.value === "+") {
      this.take();
      return Number(this.parseUnary());
    }
    return this.parsePrimary();
  }
  parsePrimary() {
    const token = this.take();
    if (token.type === "number") return token.value;
    if (token.type === "identifier") {
      const functions = {
        min: (values) => Math.min(...values),
        max: (values) => Math.max(...values),
        abs: (values) => Math.abs(values[0] ?? 0),
        floor: (values) => Math.floor(values[0] ?? 0),
        ceil: (values) => Math.ceil(values[0] ?? 0)
      };
      if (token.value === "true") return true;
      if (token.value === "false") return false;
      if (this.peek().type === "paren" && this.peek().value === "(") {
        const fn = functions[token.value];
        if (!fn) throw new Error(`Unknown function "${token.value}"`);
        this.take();
        const args = [];
        if (!(this.peek().type === "paren" && this.peek().value === ")")) {
          args.push(Number(this.parseOr()));
          while (this.peek().type === "comma") {
            this.take();
            args.push(Number(this.parseOr()));
          }
        }
        if (!(this.peek().type === "paren" && this.peek().value === ")")) {
          throw new Error(`Expected ")" after ${token.value}(`);
        }
        this.take();
        return fn(args);
      }
      if (!(token.value in this.variables)) {
        throw new Error(`Unknown variable "${token.value}"`);
      }
      return this.variables[token.value];
    }
    if (token.type === "paren" && token.value === "(") {
      const value = this.parseOr();
      if (!(this.peek().type === "paren" && this.peek().value === ")")) {
        throw new Error('Expected ")"');
      }
      this.take();
      return value;
    }
    throw new Error(`Unexpected token "${token.value}"`);
  }
};
function evaluateFormula(source, variables) {
  if (!source.trim()) return false;
  if (source.length > 500) {
    throw new Error("Formula is too long (maximum 500 characters)");
  }
  return new FormulaParser(tokenize(source), variables).parse();
}
function validateFormula(source, sampleVariables) {
  if (!source.trim()) return null;
  try {
    evaluateFormula(source, sampleVariables);
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

// src/shared/engine.ts
var BASE_CREDITS_PER_TURN = 2;
var AUTOMATIC_DRAW_PER_TURN = 1;
var MAX_LOG = 220;
function seedFrom(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0 || 1;
}
function nextRandom(state) {
  let value = state.rngState || 1;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  state.rngState = value >>> 0 || 1;
  return state.rngState / 4294967296;
}
function pickOne(state, values) {
  if (values.length === 0) throw new Error("Cannot pick from an empty list");
  return values[Math.floor(nextRandom(state) * values.length)];
}
function shuffle(state, values) {
  for (let index = values.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(nextRandom(state) * (index + 1));
    [values[index], values[swapIndex]] = [values[swapIndex], values[index]];
  }
  return values;
}
function now() {
  return Date.now();
}
function addLog(game, kind, text, actorId, targetId) {
  game.logSeq += 1;
  game.log.push({
    id: `log-${game.logSeq}`,
    at: now(),
    round: game.round,
    kind,
    text,
    actorId,
    targetId
  });
  if (game.log.length > MAX_LOG) {
    game.log.splice(0, game.log.length - MAX_LOG);
  }
}
function touch(game) {
  game.version += 1;
  game.updatedAt = now();
}
function hasEnded(game) {
  return game.phase === "ended";
}
function makeInstance(ownerId, cardId, round) {
  return {
    iid: `${ownerId}-${(0, import_node_crypto.randomUUID)()}`,
    cardId,
    ownerId,
    acquiredRound: round
  };
}
function createPlayer(participant, settings, teamId, startingRound) {
  return {
    id: participant.id,
    name: participant.name,
    isBot: participant.isBot,
    teamId,
    connected: true,
    score: settings.startingScore,
    hp: settings.startingHp,
    maxHp: settings.startingHp,
    credits: settings.startingResources,
    lives: settings.startingLives,
    eliminated: false,
    awaitingRespawn: false,
    respawnAtRound: null,
    deck: [],
    hand: [],
    discard: [],
    battlefield: [],
    statuses: [],
    armor: 0,
    playedThisTurn: 0,
    hasEndedTurn: false,
    skipNextTurn: false,
    assetBuff: 0,
    assetBuffRounds: 0,
    draftOffers: [],
    draftPicks: 0
  };
}
function normaliseSettings(input) {
  const merged = { ...DEFAULT_SETTINGS, ...input ?? {} };
  merged.pointsToWin = Math.max(0, Math.min(999, Math.round(merged.pointsToWin)));
  merged.scoreLimit = Math.max(0, Math.min(999, Math.round(merged.scoreLimit)));
  merged.startingScore = Math.max(-100, Math.min(500, Math.round(merged.startingScore)));
  merged.startingResources = Math.max(0, Math.min(30, Math.round(merged.startingResources)));
  merged.startingHp = Math.max(1, Math.min(999, Math.round(merged.startingHp)));
  merged.startingLives = Math.max(1, Math.min(20, Math.round(merged.startingLives)));
  merged.handSize = Math.max(1, Math.min(20, Math.round(merged.handSize)));
  merged.deckSize = Math.max(8, Math.min(200, Math.round(merged.deckSize)));
  merged.cardsPerTurn = Math.max(1, Math.min(20, Math.round(merged.cardsPerTurn)));
  merged.roundLimit = Math.max(0, Math.min(999, Math.round(merged.roundLimit)));
  merged.lossThreshold = Math.max(-999, Math.min(0, Math.round(merged.lossThreshold)));
  merged.turnTimerSec = Math.max(0, Math.min(3600, Math.round(merged.turnTimerSec)));
  merged.roundTimerSec = Math.max(0, Math.min(7200, Math.round(merged.roundTimerSec)));
  merged.teamSize = Math.max(1, Math.min(64, Math.round(merged.teamSize)));
  merged.botCount = Math.max(0, Math.min(128, Math.round(merged.botCount)));
  merged.respawnDelayRounds = Math.max(0, Math.min(20, Math.round(merged.respawnDelayRounds)));
  merged.damageMultiplier = Math.max(0, Math.min(10, Number(merged.damageMultiplier) || 1));
  merged.healingMultiplier = Math.max(0, Math.min(10, Number(merged.healingMultiplier) || 1));
  merged.suddenDeathRound = Math.max(1, Math.min(999, Math.round(merged.suddenDeathRound)));
  merged.reconnectGraceSec = Math.max(0, Math.min(3600, Math.round(merged.reconnectGraceSec)));
  merged.hillBonus = Math.max(0, Math.min(50, Math.round(merged.hillBonus)));
  merged.draftPicks = Math.max(1, Math.min(60, Math.round(merged.draftPicks)));
  merged.enabledExpansions = [...new Set(merged.enabledExpansions)].filter(
    (id) => ["classic", "crossover", "brainrot", "frontier"].includes(id)
  );
  if (merged.enabledExpansions.length === 0) merged.enabledExpansions = ["classic"];
  merged.enabledCards = [...new Set(merged.enabledCards)].filter((id) => Boolean(tryGetCard(id)));
  merged.bannedCards = [...new Set(merged.bannedCards)].filter((id) => Boolean(tryGetCard(id)));
  merged.lobbyName = String(merged.lobbyName || "LAN Lobby").slice(0, 60);
  if (!Array.isArray(merged.loseConditions) || merged.loseConditions.length === 0) {
    merged.loseConditions = [...DEFAULT_SETTINGS.loseConditions];
  }
  merged.customWinFormula = String(merged.customWinFormula || "").slice(0, 500);
  merged.customLoseFormula = String(merged.customLoseFormula || "").slice(0, 500);
  return merged;
}
function validateGameSettings(settings) {
  if (settings.pointsToWin === 0 && settings.scoreLimit === 0 && !settings.loseConditions.includes("lives") && !settings.loseConditions.includes("roundLimit")) {
    return "No win or loss clock is active. Set points, a score limit, lives, or a round limit.";
  }
  if (settings.deckSize < 8) return "Deck size must be at least 8.";
  const formulaError = validateFormula(settings.customWinFormula, formulaSampleVariables(settings)) ?? validateFormula(settings.customLoseFormula, formulaSampleVariables(settings));
  return formulaError ? `Custom formula: ${formulaError}` : null;
}
function formulaSampleVariables(settings) {
  return {
    score: 0,
    hp: settings.startingHp,
    round: 1,
    lives: settings.startingLives,
    assets: 2,
    hand: settings.handSize,
    deck: settings.deckSize,
    credits: settings.startingResources,
    eliminated: false,
    pointsToWin: settings.pointsToWin,
    opponents: 1
  };
}
function teamFor(participant, index, settings) {
  if (participant.teamId) return participant.teamId;
  if (settings.mode === "coop") return participant.isBot ? "ai" : "crew";
  if (settings.mode === "teams") return `team-${Math.floor(index / settings.teamSize) + 1}`;
  return `solo-${participant.id}`;
}
function buildDeckForPlayer(game, player, pool, targetSize) {
  if (pool.length === 0) {
    throw new Error("The selected card pool is empty. Enable at least one expansion.");
  }
  player.deck = [];
  const byType = {
    asset: pool.filter((definition) => definition.type === "asset"),
    attack: pool.filter((definition) => definition.type === "attack"),
    defense: pool.filter((definition) => definition.type === "defense"),
    event: pool.filter((definition) => definition.type === "event")
  };
  const buckets = [];
  const weights = [
    { type: "asset", copies: Math.round(targetSize * 0.24) },
    { type: "defense", copies: Math.round(targetSize * 0.22) },
    { type: "attack", copies: Math.round(targetSize * 0.38) },
    { type: "event", copies: Math.round(targetSize * 0.16) }
  ];
  for (const { type, copies } of weights) {
    const source = byType[type].length > 0 ? byType[type] : pool;
    for (let index = 0; index < copies; index += 1) {
      buckets.push([pickOne(game, source)]);
    }
  }
  while (buckets.length < targetSize) {
    buckets.push([pickOne(game, pool)]);
  }
  const chosen = shuffle(game, buckets).slice(0, targetSize).map((bucket) => bucket[0]);
  player.deck = chosen.map((definition) => makeInstance(player.id, definition.id, game.round || 1));
  shuffle(game, player.deck);
}
function starterTokens(game, player, pool) {
  const available = new Set(pool.map((definition) => definition.id));
  const tokenIds = ["isp-connection", "desktop-computer"].filter((id) => available.has(id));
  for (const id of tokenIds) {
    const instance = makeInstance(player.id, id, game.round || 1);
    const definition = getCard(id);
    player.battlefield.push({
      ...instance,
      attachedUpgradeCount: 0,
      usesLeft: definition.defense?.uses
    });
  }
}
function drawCards(game, player, count) {
  let drawn = 0;
  const maxHand = game.settings.handSize;
  for (let index = 0; index < count; index += 1) {
    if (player.hand.length >= maxHand) break;
    const instance = player.deck.pop();
    if (!instance) {
      if (game.settings.loseConditions.includes("deckOut")) {
        eliminatePlayer(game, player, "ran out of cards", true);
      }
      break;
    }
    player.hand.push(instance);
    drawn += 1;
  }
  return drawn;
}
function playerAlive(player) {
  return !player.eliminated && !player.awaitingRespawn && player.hp > 0;
}
function gameTeamMode(settings) {
  return settings.mode === "teams" || settings.mode === "coop";
}
function enemiesOf(game, player) {
  return game.players.filter(
    (candidate) => candidate.id !== player.id && candidate.teamId !== player.teamId && playerAlive(candidate)
  );
}
function alliesOf(game, player) {
  return game.players.filter(
    (candidate) => candidate.teamId === player.teamId && !candidate.eliminated
  );
}
function playerById(game, id) {
  return game.players.find((player) => player.id === id);
}
function defenseMatches(defenseTags, attackTags) {
  return defenseTags.includes("all") || attackTags.some((tag) => defenseTags.includes(tag));
}
function addArmorFromDeployment(player, definition) {
  if (definition.defense?.armor) {
    player.armor += definition.defense.armor;
  }
}
function sendToDiscard(player, instance) {
  player.discard.push(instance);
}
function removeBattlefieldCard(game, player, iid) {
  if (!iid) return void 0;
  const index = player.battlefield.findIndex((card3) => card3.iid === iid);
  if (index < 0) return void 0;
  const [card2] = player.battlefield.splice(index, 1);
  if (card2) sendToDiscard(player, card2);
  return card2;
}
function randomHandCard(player, state) {
  if (player.hand.length === 0) return void 0;
  const index = Math.floor(nextRandom(state) * player.hand.length);
  return player.hand[index];
}
function discardCards(game, player, count) {
  let discarded = 0;
  for (let index = 0; index < count; index += 1) {
    const card2 = randomHandCard(player, game);
    if (!card2) break;
    player.hand = player.hand.filter((candidate) => candidate.iid !== card2.iid);
    sendToDiscard(player, card2);
    discarded += 1;
  }
  return discarded;
}
function scoreThresholdEnabled(game) {
  return game.settings.pointsToWin > 0 || game.settings.scoreLimit > 0;
}
function teamScore(game, teamId) {
  return game.players.filter((player) => player.teamId === teamId).reduce((total, player) => total + player.score, 0);
}
function liveTeamIds(game) {
  return [...new Set(game.players.filter((player) => !player.eliminated).map((player) => player.teamId))];
}
function playerScoreForWin(game, player) {
  return gameTeamMode(game.settings) ? teamScore(game, player.teamId) : player.score;
}
function highestTeamScore(game) {
  let best = null;
  for (const player of game.players.filter((candidate) => !candidate.eliminated)) {
    const score = playerScoreForWin(game, player);
    if (!best || score > best.score) best = { teamId: player.teamId, score };
  }
  return best;
}
function finishGame(game, teamIds, players, reason) {
  game.phase = "ended";
  game.winner = {
    playerIds: players.map((player) => player.id),
    teamIds,
    reason
  };
  game.activePlayerIds = [];
  game.turnDeadline = null;
  game.roundDeadline = null;
  addLog(game, "system", `Game over \u2014 ${reason}`);
  touch(game);
}
function checkLastTeamStanding(game) {
  if (game.phase === "ended") return false;
  const aliveTeams = new Set(
    game.players.filter((player) => !player.eliminated).map((player) => player.teamId)
  );
  if (aliveTeams.size > 1) return false;
  const winners = game.players.filter((player) => !player.eliminated);
  if (winners.length === 0) {
    finishGame(game, [], [], "Mutual destruction");
    return true;
  }
  if (game.players.length > 1) {
    finishGame(
      game,
      [...aliveTeams],
      winners,
      `${winners.map((player) => player.name).join(", ")} ${winners.length === 1 ? "is" : "are"} the last network standing`
    );
    return true;
  }
  return false;
}
function eliminatePlayer(game, player, reason, fatal = false) {
  if (player.eliminated) return;
  player.eliminated = true;
  player.awaitingRespawn = false;
  player.respawnAtRound = null;
  player.hand.forEach((card2) => player.discard.push(card2));
  player.hand = [];
  player.battlefield.forEach((card2) => player.discard.push(card2));
  player.battlefield = [];
  player.statuses = [];
  player.armor = 0;
  game.activePlayerIds = game.activePlayerIds.filter((id) => id !== player.id);
  addLog(game, "elimination", `${player.name} is out \u2014 ${reason}.`, void 0, player.id);
  checkLastTeamStanding(game);
  touch(game);
  void fatal;
}
function handleLethal(game, player, reason) {
  const hpLossEnabled = game.settings.loseConditions.includes("hp") || game.settings.loseConditions.includes("lives");
  if (!hpLossEnabled) {
    player.hp = 1;
    addLog(game, "damage", `${player.name} survives at 1 HP because HP loss is disabled in this ruleset.`, void 0, player.id);
    return;
  }
  if (!game.settings.respawn) {
    eliminatePlayer(game, player, reason);
    return;
  }
  player.lives -= 1;
  if (player.lives <= 0) {
    player.lives = 0;
    eliminatePlayer(game, player, reason);
    return;
  }
  player.awaitingRespawn = true;
  player.respawnAtRound = game.round + Math.max(0, game.settings.respawnDelayRounds);
  player.hp = 0;
  player.armor = 0;
  addLog(
    game,
    "damage",
    `${player.name} is knocked offline \u2014 ${reason}. Respawning round ${player.respawnAtRound}.`
  );
  touch(game);
}
function damagePlayer(game, target, rawAmount, source, options = {}) {
  if (target.eliminated) return 0;
  let amount = Math.max(0, Math.round(rawAmount));
  const multiplier = game.settings.damageMultiplier * (game.suddenDeath ? 2 : 1);
  if (!options.isSelfDamage) amount = Math.round(amount * multiplier);
  if (!options.ignoreArmor && !options.isSelfDamage) {
    const absorbed = Math.min(target.armor, amount);
    target.armor -= absorbed;
    amount -= absorbed;
  }
  if (amount <= 0) return 0;
  target.hp = Math.max(0, target.hp - amount);
  addLog(game, "damage", `${source} deals ${amount} damage to ${target.name}.`, void 0, target.id);
  if (target.hp <= 0) handleLethal(game, target, "network integrity reached zero");
  touch(game);
  return amount;
}
function grantCredits(player, amount) {
  player.credits = Math.max(0, player.credits + Math.round(amount));
}
function healPlayer(game, target, rawAmount) {
  if (target.eliminated) return;
  const amount = Math.max(0, Math.round(rawAmount * game.settings.healingMultiplier));
  const before = target.hp;
  target.hp = Math.min(target.maxHp, target.hp + amount);
  if (target.hp > before) {
    addLog(game, "score", `${target.name} restores ${target.hp - before} HP.`, void 0, target.id);
  }
}
function isDisabled(instance, round) {
  return Boolean(instance.disabledUntilRound && instance.disabledUntilRound > round);
}
function effectiveScoringAssetPoints(player, round) {
  return player.battlefield.reduce((total, instance) => {
    const definition = getCard(instance.cardId);
    if (!definition.passive?.pointsPerRound) return total;
    if (isDisabled(instance, round)) return total;
    const buff = player.assetBuffRounds > 0 ? player.assetBuff : 0;
    return total + definition.passive.pointsPerRound + buff;
  }, 0);
}
function applyAction(game, action, actor, targetPlayer, targetAsset) {
  if (action.kind === "coinFlip") {
    const heads = nextRandom(game) >= 0.5;
    addLog(game, "system", `${actor.name}'s coin flip lands ${heads ? "heads" : "tails"}.`, actor.id);
    for (const nested of heads ? action.heads : action.tails) {
      applyAction(game, nested, actor, targetPlayer, targetAsset);
      if (hasEnded(game)) return;
    }
    return;
  }
  if (action.kind === "selfDamage") {
    damagePlayer(game, actor, action.amount, "Self-inflicted", { ignoreArmor: true, isSelfDamage: true });
    return;
  }
  const resolvePlayerTargets = (selection) => {
    switch (selection ?? "chosen") {
      case "self":
        return [actor];
      case "allEnemies":
        return enemiesOf(game, actor);
      case "allAllies":
        return alliesOf(game, actor);
      case "allPlayers":
        return game.players.filter((player) => !player.eliminated);
      case "randomEnemy": {
        const enemies = enemiesOf(game, actor);
        return enemies.length ? [pickOne(game, enemies)] : [];
      }
      case "chosen":
      case "chosenAsset":
      default:
        return targetPlayer && !targetPlayer.eliminated ? [targetPlayer] : [];
    }
  };
  if (action.kind === "ongoing") {
    const victims = resolvePlayerTargets(action.target);
    for (const victim of victims) {
      victim.statuses.push({
        id: (0, import_node_crypto.randomUUID)(),
        sourceCardId: "",
        sourceName: action.label,
        kind: action.effect,
        amount: action.amount,
        roundsLeft: action.rounds,
        label: action.label
      });
      addLog(
        game,
        "system",
        `${victim.name} is afflicted by ${action.label} (${action.effect} ${action.amount} for ${action.rounds} round${action.rounds === 1 ? "" : "s"}).`,
        actor.id,
        victim.id
      );
    }
    return;
  }
  if (action.kind === "destroyAsset" || action.kind === "disableAsset") {
    const assetOwners = action.target === "randomEnemyAsset" ? enemiesOf(game, actor) : [];
    const chosenAsset = action.target === "randomEnemyAsset" ? assetOwners.flatMap((owner2) => owner2.battlefield)[Math.floor(nextRandom(game) * Math.max(1, assetOwners.flatMap((owner2) => owner2.battlefield).length))] : targetAsset;
    const owner = action.target === "randomEnemyAsset" ? game.players.find((candidate) => candidate.battlefield.some((card2) => card2.iid === chosenAsset?.iid)) : targetPlayer;
    if (!chosenAsset || !owner) return;
    const cardName = getCard(chosenAsset.cardId).name;
    if (action.kind === "destroyAsset") {
      removeBattlefieldCard(game, owner, chosenAsset.iid);
      addLog(game, "play", `${cardName} is destroyed.`, actor.id, owner.id);
    } else {
      chosenAsset.disabledUntilRound = game.round + Math.max(1, action.rounds);
      addLog(game, "play", `${cardName} is disabled until round ${chosenAsset.disabledUntilRound}.`, actor.id, owner.id);
    }
    return;
  }
  const applyToPlayer = (target) => {
    if (target.eliminated) return;
    switch (action.kind) {
      case "damage":
        damagePlayer(game, target, action.amount, "Network strike", { isSelfDamage: false });
        break;
      case "drain":
        target.score -= action.amount;
        addLog(game, "score", `${target.name} loses ${action.amount} score.`, actor.id, target.id);
        break;
      case "heal":
        healPlayer(game, target, action.amount);
        break;
      case "score":
        target.score += action.amount;
        addLog(game, "score", `${target.name} gains ${action.amount} score.`, actor.id, target.id);
        break;
      case "draw":
        drawCards(game, target, action.amount);
        addLog(game, "system", `${target.name} draws ${action.amount} card${action.amount === 1 ? "" : "s"}.`, actor.id, target.id);
        break;
      case "credits":
        grantCredits(target, action.amount);
        addLog(game, "system", `${target.name} gains ${action.amount} credits.`, actor.id, target.id);
        break;
      case "discard": {
        const count = discardCards(game, target, action.amount);
        if (count > 0) {
          addLog(game, "system", `${target.name} discards ${count} card${count === 1 ? "" : "s"}.`, actor.id, target.id);
        }
        break;
      }
      case "shield":
        target.armor += action.amount;
        addLog(game, "system", `${target.name} gains ${action.amount} armor.`, actor.id, target.id);
        break;
      case "skipTurn":
        target.skipNextTurn = true;
        addLog(game, "system", `${target.name} will skip their next turn.`, actor.id, target.id);
        break;
      case "buffAssets":
        target.assetBuff = Math.max(target.assetBuff, action.amount);
        target.assetBuffRounds = Math.max(target.assetBuffRounds, action.rounds ?? 1);
        addLog(game, "system", `${target.name}'s assets gain +${action.amount} score this round.`, actor.id, target.id);
        break;
      case "stealCredits": {
        const amount = Math.min(target.credits, action.amount);
        target.credits -= amount;
        grantCredits(actor, amount);
        addLog(game, "system", `${actor.name} steals ${amount} credits from ${target.name}.`, actor.id, target.id);
        break;
      }
      case "revealHand": {
        const viewerIds = alliesOf(game, actor).map((player) => player.id);
        game.reveals.push({
          viewerIds,
          playerId: target.id,
          cards: target.hand.map((card2) => card2.cardId),
          expiresRound: game.round + 1
        });
        addLog(game, "system", `${target.name}'s hand is revealed to ${actor.name}'s team.`, actor.id, target.id);
        break;
      }
      default:
        break;
    }
  };
  const targets = resolvePlayerTargets(action.target);
  for (const target of targets) {
    applyToPlayer(target);
    if (hasEnded(game)) return;
  }
}
function availableDefenses(game, defender, card2) {
  return defender.battlefield.filter((instance) => {
    const definition = getCard(instance.cardId);
    if (!definition.defense) return false;
    if (isDisabled(instance, game.round)) return false;
    const uses = instance.usesLeft ?? definition.defense.uses;
    return uses > 0 && defenseMatches(definition.defense.blocks, card2.keywords);
  });
}
function consumeDefense(game, defender, defense) {
  const definition = getCard(defense.cardId);
  const remaining = (defense.usesLeft ?? definition.defense?.uses ?? 1) - 1;
  defense.usesLeft = remaining;
  if (remaining <= 0) {
    removeBattlefieldCard(game, defender, defense.iid);
  }
}
function validateTargets(game, actor, card2, targetPlayer, targetAsset) {
  const destructive = card2.type === "attack" || card2.actions.some(
    (action) => ["damage", "drain", "destroyAsset", "disableAsset", "discard", "skipTurn", "stealCredits"].includes(
      action.kind
    )
  );
  if (card2.target === "none") return;
  if (card2.target === "enemyPlayer") {
    if (!targetPlayer) throw new GameRuleError("invalid-target", "Select an enemy player.");
    if (targetPlayer.eliminated) throw new GameRuleError("invalid-target", "That player is already out.");
    if (targetPlayer.id === actor.id) throw new GameRuleError("invalid-target", "You cannot target yourself with this card.");
    if (targetPlayer.teamId === actor.teamId) {
      if (!game.settings.friendlyFire || game.settings.targeting !== "open") {
        throw new GameRuleError("friendly-fire", "Friendly fire is disabled in this lobby.");
      }
    }
  }
  if (card2.target === "anyPlayer") {
    if (!targetPlayer) throw new GameRuleError("invalid-target", "Select a player.");
    if (targetPlayer.eliminated) throw new GameRuleError("invalid-target", "That player is already out.");
    if (destructive && targetPlayer.teamId === actor.teamId && (!game.settings.friendlyFire || game.settings.targeting !== "open")) {
      throw new GameRuleError("friendly-fire", "Friendly fire is disabled in this lobby.");
    }
  }
  if (card2.target === "enemyAsset" || card2.target === "ownAsset" || card2.target === "anyAsset") {
    if (!targetAsset || !targetPlayer) {
      throw new GameRuleError("invalid-target", "Select a target asset on the table.");
    }
    if (card2.target === "enemyAsset" && targetPlayer.teamId === actor.teamId) {
      if (!game.settings.friendlyFire || game.settings.targeting !== "open") {
        throw new GameRuleError("friendly-fire", "Friendly fire is disabled in this lobby.");
      }
    }
    if (card2.target === "ownAsset" && targetPlayer.id !== actor.id) {
      throw new GameRuleError("invalid-target", "Select one of your own assets.");
    }
  }
}
function playCard(game, playerId, input) {
  if (game.phase !== "playing") {
    throw new GameRuleError("game-not-active", "The game is not in a playable state.");
  }
  const actor = playerById(game, playerId);
  if (!actor) throw new GameRuleError("invalid-action", "Unknown player.");
  if (!playerAlive(actor)) throw new GameRuleError("invalid-action", "Your network is offline.");
  if (!game.activePlayerIds.includes(actor.id) || actor.hasEndedTurn) {
    throw new GameRuleError("not-your-turn", "It is not your turn.");
  }
  const handCard = actor.hand.find((card2) => card2.iid === input.iid);
  if (!handCard) throw new GameRuleError("no-card", "That card is not in your hand.");
  const definition = getCard(handCard.cardId);
  if (definition.cost > actor.credits) {
    throw new GameRuleError("not-enough-credits", `You need ${definition.cost} credits to play ${definition.name}.`);
  }
  const limit = game.settings.cardsPerTurn + actor.battlefield.reduce(
    (bonus, instance) => bonus + (getCard(instance.cardId).passive?.playLimitBonus ?? 0),
    0
  );
  if (actor.playedThisTurn >= limit) {
    throw new GameRuleError("play-limit", `You already played ${limit} cards this turn.`);
  }
  let targetPlayer = playerById(game, input.targetPlayerId);
  let targetAsset;
  if (definition.target === "enemyAsset" || definition.target === "anyAsset" || definition.target === "ownAsset") {
    if (input.targetIid) {
      for (const candidate of game.players) {
        const found = candidate.battlefield.find((instance) => instance.iid === input.targetIid);
        if (found) {
          targetAsset = found;
          targetPlayer = candidate;
          break;
        }
      }
    }
    if (!targetPlayer && definition.target !== "ownAsset") {
      const candidates = game.players.filter(
        (candidate) => candidate.id !== actor.id && !candidate.eliminated && candidate.battlefield.length > 0 && candidate.teamId !== actor.teamId
      );
      if (candidates.length === 1) {
        targetPlayer = candidates[0];
        targetAsset = targetPlayer?.battlefield[0];
      }
    }
  } else if (!targetPlayer && definition.target === "enemyPlayer") {
    const enemies = enemiesOf(game, actor);
    if (enemies.length === 1) targetPlayer = enemies[0];
  }
  validateTargets(game, actor, definition, targetPlayer, targetAsset);
  const unblockable = definition.keywords.includes("unblockable");
  if (definition.type === "attack" && !unblockable && targetPlayer) {
    const defenses = availableDefenses(game, targetPlayer, definition);
    if (defenses.length > 0) {
      const defense = defenses[0];
      actor.hand = actor.hand.filter((card2) => card2.iid !== handCard.iid);
      sendToDiscard(actor, handCard);
      actor.credits -= definition.cost;
      actor.playedThisTurn += 1;
      consumeDefense(game, targetPlayer, defense);
      addLog(
        game,
        "counter",
        `${actor.name}'s ${definition.name} is countered by ${targetPlayer.name}'s ${getCard(defense.cardId).name}.`,
        actor.id,
        targetPlayer.id
      );
      touch(game);
      return { ok: true, card: definition };
    }
  }
  actor.hand = actor.hand.filter((card2) => card2.iid !== handCard.iid);
  actor.credits -= definition.cost;
  actor.playedThisTurn += 1;
  addLog(
    game,
    "play",
    `${actor.name} plays ${definition.name}${targetPlayer ? ` on ${targetPlayer.name}` : ""}.`,
    actor.id,
    targetPlayer?.id
  );
  if (definition.type === "defense") {
    const deployed = {
      ...handCard,
      ownerId: actor.id,
      attachedUpgradeCount: 0,
      usesLeft: definition.defense?.uses
    };
    actor.battlefield.push(deployed);
    addArmorFromDeployment(actor, definition);
    for (const action of definition.actions) {
      applyAction(game, action, actor, targetPlayer, targetAsset);
      if (hasEnded(game)) break;
    }
  } else if (definition.type === "asset") {
    const deployed = {
      ...handCard,
      ownerId: actor.id,
      attachedUpgradeCount: 0,
      usesLeft: void 0
    };
    actor.battlefield.push(deployed);
    for (const action of definition.actions) {
      applyAction(game, action, actor, targetPlayer, targetAsset);
      if (hasEnded(game)) break;
    }
  } else {
    for (const action of definition.actions) {
      applyAction(game, action, actor, targetPlayer, targetAsset);
      if (hasEnded(game)) break;
    }
    sendToDiscard(actor, handCard);
  }
  if (definition.target !== "none") {
    addLog(game, "system", `${definition.name} resolves.`, actor.id, targetPlayer?.id);
  }
  if (game.phase === "playing" && !playerAlive(actor) && game.activePlayerIds.includes(actor.id)) {
    actor.hasEndedTurn = true;
    if (game.settings.pacing === "simultaneous") {
      game.activePlayerIds = game.activePlayerIds.filter((id) => id !== actor.id);
      if (game.activePlayerIds.length === 0) endRound(game);
    } else {
      advanceTurn(game, actor.id);
    }
  }
  touch(game);
  return { ok: true, card: definition };
}
function grantTurnIncome(game, player) {
  const income = player.battlefield.reduce((total, instance) => {
    if (isDisabled(instance, game.round)) return total;
    return total + (getCard(instance.cardId).passive?.creditsPerTurn ?? 0);
  }, 0);
  grantCredits(player, BASE_CREDITS_PER_TURN + income);
  drawCards(game, player, AUTOMATIC_DRAW_PER_TURN);
}
function beginPlayerTurn(game, playerId) {
  const player = playerById(game, playerId);
  if (!player || !playerAlive(player)) return;
  player.playedThisTurn = 0;
  player.hasEndedTurn = false;
  game.activePlayerIds = [player.id];
  game.turn += 1;
  game.turnDeadline = game.settings.turnTimerSec > 0 ? now() + game.settings.turnTimerSec * 1e3 : null;
  grantTurnIncome(game, player);
  addLog(game, "system", `${player.name}'s turn begins.`, player.id);
}
function activePlayersInOrder(game) {
  return game.turnQueue.map((id) => playerById(game, id)).filter((player) => Boolean(player && playerAlive(player)));
}
function advanceTurn(game, fromPlayerId) {
  if (game.settings.pacing === "simultaneous") {
    const active = activePlayersInOrder(game);
    if (active.every((player) => player.hasEndedTurn)) {
      endRound(game);
    } else {
      game.activePlayerIds = active.filter((player) => !player.hasEndedTurn).map((player) => player.id);
      game.turnDeadline = game.roundDeadline;
    }
    return;
  }
  const alive = activePlayersInOrder(game);
  const currentIndex = alive.findIndex((player) => player.id === fromPlayerId);
  const ordered = currentIndex >= 0 ? [...alive.slice(currentIndex + 1), ...alive.slice(0, currentIndex + 1)] : alive;
  const next = ordered.find((player) => player.id !== fromPlayerId || alive.length === 1);
  if (!next || game.turnPointer >= game.turnQueue.length - 1) {
    endRound(game);
    return;
  }
  const nextIndex = game.turnQueue.indexOf(next.id);
  if (nextIndex <= game.turnPointer) {
    endRound(game);
    return;
  }
  if (next.skipNextTurn) {
    next.skipNextTurn = false;
    addLog(game, "timer", `${next.name} skips their turn.`, next.id);
    game.turnPointer = nextIndex;
    game.turn += 1;
    advanceTurn(game, next.id);
    return;
  }
  game.turnPointer = nextIndex;
  beginPlayerTurn(game, next.id);
}
function beginRound(game) {
  const alive = game.players.filter((player) => !player.eliminated);
  for (const player of game.players) {
    if (player.eliminated) continue;
    if (player.awaitingRespawn && player.respawnAtRound !== null && game.round >= player.respawnAtRound) {
      player.awaitingRespawn = false;
      player.respawnAtRound = null;
      player.hp = player.maxHp;
      player.armor = 0;
      addLog(game, "system", `${player.name} is back online.`, player.id);
    }
  }
  game.turnQueue = alive.filter((player) => playerAlive(player)).map((player) => player.id);
  if (game.round > 1) {
    const offset = (game.round - 1) % Math.max(1, game.turnQueue.length);
    game.turnQueue = [...game.turnQueue.slice(offset), ...game.turnQueue.slice(0, offset)];
  }
  game.turnPointer = 0;
  game.activePlayerIds = [];
  for (const player of game.players) {
    player.hasEndedTurn = false;
  }
  game.roundDeadline = game.settings.roundTimerSec > 0 ? now() + game.settings.roundTimerSec * 1e3 : null;
  if (game.settings.pacing === "simultaneous") {
    const active = activePlayersInOrder(game);
    for (const player of active) {
      player.playedThisTurn = 0;
      if (player.skipNextTurn) {
        player.skipNextTurn = false;
        player.hasEndedTurn = true;
        addLog(game, "timer", `${player.name} skips their turn.`, player.id);
        continue;
      }
      grantTurnIncome(game, player);
      addLog(game, "system", `${player.name}'s turn begins.`, player.id);
    }
    game.activePlayerIds = active.filter((player) => !player.hasEndedTurn).map((player) => player.id);
    game.turnDeadline = game.roundDeadline;
    if (game.activePlayerIds.length === 0) {
      endRound(game);
      return;
    }
  } else {
    const first = activePlayersInOrder(game)[0];
    if (!first) {
      endRound(game);
      return;
    }
    game.turnPointer = Math.max(0, game.turnQueue.indexOf(first.id));
    if (first.skipNextTurn) {
      first.skipNextTurn = false;
      addLog(game, "timer", `${first.name} skips their turn.`, first.id);
      advanceTurn(game, first.id);
      return;
    }
    beginPlayerTurn(game, first.id);
  }
  touch(game);
}
function endTurn(game, playerId, reason = "manual") {
  if (game.phase !== "playing") return;
  const player = playerById(game, playerId);
  if (!player) throw new GameRuleError("invalid-action", "Unknown player.");
  if (!game.activePlayerIds.includes(playerId) || player.hasEndedTurn) {
    throw new GameRuleError("not-your-turn", "You are not active.");
  }
  player.hasEndedTurn = true;
  addLog(
    game,
    "timer",
    reason === "timer" ? `${player.name}'s turn timer expires.` : `${player.name} ends their turn.`,
    player.id
  );
  if (game.settings.pacing === "simultaneous") {
    game.activePlayerIds = activePlayersInOrder(game).filter((candidate) => !candidate.hasEndedTurn).map((candidate) => candidate.id);
    if (game.activePlayerIds.length === 0) {
      endRound(game);
    } else {
      touch(game);
    }
    return;
  }
  advanceTurn(game, playerId);
  touch(game);
}
function applyRoundStatuses(game, player) {
  const remaining = [];
  for (const status of player.statuses) {
    if (status.roundsLeft <= 0) continue;
    if (status.kind === "damage") {
      damagePlayer(game, player, status.amount, status.label, { isSelfDamage: false });
    } else {
      player.score -= status.amount;
      addLog(game, "score", `${player.name} loses ${status.amount} score to ${status.label}.`, void 0, player.id);
    }
    status.roundsLeft -= 1;
    if (status.roundsLeft > 0) remaining.push(status);
  }
  player.statuses = remaining;
}
function resolveRoundGameEnd(game) {
  if (game.phase === "ended") return true;
  if (checkLastTeamStanding(game)) return true;
  const alive = game.players.filter((player) => !player.eliminated);
  if (game.settings.customLoseFormula.trim()) {
    for (const player of alive) {
      const variables = customFormulaVariables(game, player);
      try {
        if (Boolean(evaluateFormula(game.settings.customLoseFormula, variables))) {
          eliminatePlayer(game, player, "custom loss formula");
        }
      } catch {
      }
    }
    if (checkLastTeamStanding(game)) return true;
  }
  if (scoreThresholdEnabled(game)) {
    const best = highestTeamScore(game);
    if (best) {
      const teamScores = liveTeamIds(game).map((teamId) => ({
        teamId,
        score: teamScore(game, teamId)
      }));
      const sorted = teamScores.sort((a, b) => b.score - a.score);
      const top = sorted[0];
      const second = sorted[1];
      const activeThresholds = [game.settings.pointsToWin, game.settings.scoreLimit].filter(
        (value) => value > 0
      );
      const threshold = Math.min(...activeThresholds, Number.POSITIVE_INFINITY);
      if (top && top.score >= threshold && (!second || top.score > second.score)) {
        const winners = game.players.filter((player) => player.teamId === top.teamId && !player.eliminated);
        finishGame(
          game,
          [top.teamId],
          winners,
          `${winners.map((player) => player.name).join(", ")} reached ${top.score} score`
        );
        return true;
      }
    }
  }
  if (game.settings.customWinFormula.trim()) {
    const formulaWinners = game.players.filter((player) => !player.eliminated).filter((player) => {
      try {
        return Boolean(evaluateFormula(game.settings.customWinFormula, customFormulaVariables(game, player)));
      } catch {
        return false;
      }
    });
    if (formulaWinners.length > 0) {
      finishGame(
        game,
        [...new Set(formulaWinners.map((player) => player.teamId))],
        formulaWinners,
        "custom win formula satisfied"
      );
      return true;
    }
  }
  if (game.settings.loseConditions.includes("roundLimit") && game.settings.roundLimit > 0 && game.round >= game.settings.roundLimit) {
    const best = highestTeamScore(game);
    const teams = liveTeamIds(game);
    if (teams.length === 1) {
      const winners = game.players.filter((player) => !player.eliminated);
      finishGame(game, teams, winners, `round limit reached \u2014 ${winners[0]?.name ?? "winner"} takes the table`);
    } else if (best) {
      const winners = game.players.filter((player) => player.teamId === best.teamId && !player.eliminated);
      const tied = teams.some((teamId) => teamId !== best.teamId && teamScore(game, teamId) === best.score);
      if (tied) {
        finishGame(game, [], [], "round limit reached \u2014 the table ends in a draw");
      } else {
        finishGame(game, [best.teamId], winners, `round limit reached \u2014 highest score wins`);
      }
    } else {
      finishGame(game, [], [], "round limit reached");
    }
    return true;
  }
  return false;
}
function endRound(game) {
  if (game.phase !== "playing") return;
  game.activePlayerIds = [];
  game.turnDeadline = null;
  game.roundDeadline = null;
  addLog(game, "system", `Round ${game.round} ends. Assets produce score.`);
  for (const player of game.players) {
    if (player.eliminated) continue;
    if (player.awaitingRespawn) continue;
    const assetScore = effectiveScoringAssetPoints(player, game.round);
    if (assetScore > 0) {
      player.score += assetScore;
      addLog(game, "score", `${player.name} scores ${assetScore} from their network.`, player.id);
    }
    applyRoundStatuses(game, player);
    if (player.hp > 0) {
      player.armor = player.armor;
    }
    player.assetBuff = 0;
    player.assetBuffRounds = 0;
    for (const instance of player.battlefield) {
      if (instance.disabledUntilRound && instance.disabledUntilRound <= game.round) {
        delete instance.disabledUntilRound;
      }
      const passive = getCard(instance.cardId).passive;
      if (passive?.drawPerRound && player.hp > 0) {
        drawCards(game, player, passive.drawPerRound);
      }
    }
    if (game.settings.loseConditions.includes("scoreThreshold") && player.score <= game.settings.lossThreshold) {
      eliminatePlayer(game, player, `score fell to ${player.score}`);
    }
  }
  if (hasEnded(game)) {
    touch(game);
    return;
  }
  if (game.settings.mode === "kingOfHill") {
    let best = null;
    let bestPoints = -1;
    for (const player of game.players) {
      if (!playerAlive(player)) continue;
      const points = effectiveScoringAssetPoints(player, game.round);
      if (points > bestPoints) {
        best = player;
        bestPoints = points;
      }
    }
    if (best && bestPoints > 0) {
      game.hillHolderId = best.id;
      best.score += game.settings.hillBonus;
      addLog(game, "score", `${best.name} holds the hill and gains ${game.settings.hillBonus} bonus score.`, best.id);
    }
  }
  if (game.settings.suddenDeathEnabled && !game.suddenDeath && game.round >= game.settings.suddenDeathRound) {
    game.suddenDeath = true;
    addLog(game, "system", "SUDDEN DEATH \u2014 all damage is doubled. The LAN gets loud.");
  }
  const ended = resolveRoundGameEnd(game);
  if (ended) {
    touch(game);
    return;
  }
  game.round += 1;
  beginRound(game);
  touch(game);
}
function tickGame(game) {
  if (game.phase !== "playing") return false;
  const timestamp = now();
  if (game.roundDeadline && timestamp >= game.roundDeadline) {
    addLog(game, "timer", "Round timer expired. Scoring the round.");
    endRound(game);
    return true;
  }
  if (game.turnDeadline && timestamp >= game.turnDeadline && game.settings.pacing !== "simultaneous") {
    const active = game.activePlayerIds[0];
    if (active) {
      endTurn(game, active, "timer");
      return true;
    }
  }
  if (game.settings.pacing === "simultaneous" && game.turnDeadline && timestamp >= game.turnDeadline) {
    const active = activePlayersInOrder(game).filter((player) => !player.hasEndedTurn);
    for (const player of active) {
      player.hasEndedTurn = true;
    }
    if (active.length > 0) {
      addLog(game, "timer", "The shared turn timer expired.");
      endRound(game);
      return true;
    }
  }
  return false;
}
function canAct(game, playerId) {
  if (game.phase !== "playing") return false;
  const player = playerById(game, playerId);
  return Boolean(
    player && playerAlive(player) && game.activePlayerIds.includes(player.id) && !player.hasEndedTurn
  );
}
function legalCardsFor(game, player) {
  if (!canAct(game, player.id)) return [];
  const limit = game.settings.cardsPerTurn + player.battlefield.reduce(
    (bonus, instance) => bonus + (getCard(instance.cardId).passive?.playLimitBonus ?? 0),
    0
  );
  if (player.playedThisTurn >= limit) return [];
  return player.hand.filter((card2) => getCard(card2.cardId).cost <= player.credits).map((card2) => card2.iid);
}
function revealedHandsFor(game, viewerId) {
  const results = [];
  for (const reveal of game.reveals) {
    if (!reveal.viewerIds.includes(viewerId)) continue;
    if (reveal.expiresRound < game.round) continue;
    const target = playerById(game, reveal.playerId);
    if (!target) continue;
    results.push({
      playerId: target.id,
      name: target.name,
      cards: target.hand.filter((instance) => reveal.cards.includes(instance.cardId)).map((instance) => getCard(instance.cardId)),
      expiresRound: reveal.expiresRound
    });
  }
  return results;
}
function publicPlayer(player) {
  return {
    id: player.id,
    name: player.name,
    isBot: player.isBot,
    teamId: player.teamId,
    connected: player.connected,
    hp: player.hp,
    maxHp: player.maxHp,
    score: player.score,
    credits: player.credits,
    lives: player.lives,
    eliminated: player.eliminated,
    hasEndedTurn: player.hasEndedTurn,
    playedThisTurn: player.playedThisTurn,
    handCount: player.hand.length,
    deckCount: player.deck.length,
    discardCount: player.discard.length,
    battlefield: player.battlefield.map((instance) => ({
      ...instance,
      attachedUpgradeCount: instance.attachedUpgradeCount ?? 0
    })),
    statuses: player.statuses,
    armor: player.armor,
    draftPicks: player.draftPicks
  };
}
function makeView(game, viewerId, spectator = false) {
  const self = playerById(game, viewerId);
  const selfView = self && !spectator ? {
    ...publicPlayer(self),
    hand: self.hand,
    legalCardIds: legalCardsFor(game, self),
    draftOffers: self.draftOffers.map((id) => tryGetCard(id)).filter((definition) => Boolean(definition)),
    revealedHands: revealedHandsFor(game, self.id)
  } : null;
  return {
    id: game.id,
    phase: game.phase,
    mode: game.settings.mode,
    pacing: game.settings.pacing,
    round: game.round,
    turn: game.turn,
    activePlayerIds: game.activePlayerIds,
    turnDeadline: game.turnDeadline,
    roundDeadline: game.roundDeadline,
    players: game.players.map(publicPlayer),
    self: selfView,
    spectator,
    settings: game.settings,
    log: game.log.slice(-120),
    winner: game.winner,
    suddenDeath: game.suddenDeath,
    hillHolderId: game.hillHolderId,
    serverNow: now(),
    version: game.version
  };
}
function customFormulaVariables(game, player) {
  return {
    score: player.score,
    hp: player.hp,
    round: game.round,
    lives: player.lives,
    assets: player.battlefield.filter((card2) => getCard(card2.cardId).type === "asset").length,
    hand: player.hand.length,
    deck: player.deck.length,
    credits: player.credits,
    eliminated: player.eliminated,
    pointsToWin: game.settings.pointsToWin,
    opponents: enemiesOf(game, player).length
  };
}
function assignDraftOffers(game, player) {
  const available = game.draftPool.length > 0 ? game.draftPool : cardPoolForSettings(game.settings).map((card2) => card2.id);
  const offers = [];
  const scratchState = { rngState: game.rngState };
  while (offers.length < Math.min(5, available.length)) {
    const candidate = pickOne(scratchState, available);
    if (!offers.includes(candidate)) offers.push(candidate);
  }
  game.rngState = scratchState.rngState;
  player.draftOffers = offers;
}
function finishDraft(game) {
  const pool = cardPoolForSettings(game.settings);
  for (const player of game.players) {
    player.draftOffers = [];
    const targetSize = Math.max(game.settings.deckSize, player.deck.length);
    while (player.deck.length < targetSize) {
      player.deck.push(makeInstance(player.id, pickOne(game, pool).id, 1));
    }
    shuffle(game, player.deck);
    player.battlefield = [];
    starterTokens(game, player, pool);
    drawCards(game, player, game.settings.handSize);
    player.credits = game.settings.startingResources;
    player.score = game.settings.startingScore;
    player.hp = game.settings.startingHp;
    player.maxHp = game.settings.startingHp;
    player.lives = game.settings.startingLives;
    player.eliminated = false;
    player.awaitingRespawn = false;
    addLog(game, "system", `${player.name} finished drafting ${player.deck.length} cards.`, player.id);
  }
  game.phase = "playing";
  game.round = 1;
  game.turn = 0;
  game.draftPool = [];
  addLog(game, "system", "Draft complete. The LAN match begins.");
  beginRound(game);
  touch(game);
}
function draftPick(game, playerId, cardId) {
  if (game.phase !== "drafting") {
    throw new GameRuleError("game-not-active", "Drafting is not active.");
  }
  const player = playerById(game, playerId);
  if (!player) throw new GameRuleError("invalid-action", "Unknown player.");
  if (!player.draftOffers.includes(cardId)) {
    throw new GameRuleError("invalid-action", "That card is not in your draft offers.");
  }
  player.draftOffers = player.draftOffers.filter((id) => id !== cardId);
  player.deck.push(makeInstance(player.id, cardId, 1));
  player.draftPicks += 1;
  const picksNeeded = Math.min(game.settings.draftPicks, game.settings.deckSize);
  addLog(game, "system", `${player.name} drafts ${getCard(cardId).name}.`, player.id);
  if (player.draftPicks >= picksNeeded) {
    player.draftOffers = [];
  } else {
    assignDraftOffers(game, player);
  }
  if (game.players.every((candidate) => candidate.draftPicks >= picksNeeded)) {
    finishDraft(game);
  } else {
    touch(game);
  }
  return { ok: true };
}
function botDraftPick(game, playerId) {
  if (game.phase !== "drafting") return null;
  const player = playerById(game, playerId);
  if (!player || player.draftOffers.length === 0) return null;
  const ranked = [...player.draftOffers].sort((leftId, rightId) => {
    const left = getCard(leftId);
    const right = getCard(rightId);
    const value = (card2) => (card2.passive?.pointsPerRound ?? 0) * 2 + (card2.passive?.creditsPerTurn ?? 0) + (card2.defense?.uses ?? 0) + (card2.type === "attack" ? 2 : 0) + (card2.rarity === "mythic" ? 5 : card2.rarity === "legendary" ? 4 : card2.rarity === "epic" ? 3 : card2.rarity === "rare" ? 2 : 0);
    return value(right) - value(left);
  });
  return ranked[0] ?? null;
}
function addLatePlayer(game, participant, teamId) {
  if (game.phase === "ended") {
    throw new GameRuleError("game-not-active", "The game has ended.");
  }
  const player = createPlayer(participant, game.settings, teamId, game.round);
  const pool = cardPoolForSettings(game.settings);
  buildDeckForPlayer(game, player, pool, game.settings.deckSize);
  starterTokens(game, player, pool);
  drawCards(game, player, game.settings.handSize);
  game.players.push(player);
  if (game.phase === "playing") {
    game.turnQueue.push(player.id);
    if (game.settings.pacing === "simultaneous") {
      player.hasEndedTurn = true;
    }
  }
  addLog(game, "join", `${player.name} joined the LAN mid-match.`);
  touch(game);
  return player;
}
function createGame(input) {
  const settings = normaliseSettings(input.settings);
  const validation = validateGameSettings(settings);
  if (validation) throw new Error(validation);
  if (input.participants.length === 0) throw new Error("Cannot start a game without players.");
  const pool = cardPoolForSettings(settings);
  if (pool.length === 0) throw new Error("The selected card pool is empty.");
  const game = {
    id: input.id,
    phase: "playing",
    settings,
    round: 0,
    turn: 0,
    players: [],
    turnQueue: [],
    turnPointer: 0,
    activePlayerIds: [],
    turnDeadline: null,
    roundDeadline: null,
    log: [],
    logSeq: 0,
    winner: null,
    suddenDeath: false,
    hillHolderId: null,
    seed: input.seed ?? seedFrom(`${input.id}-${Date.now()}`),
    rngState: input.seed ?? seedFrom(`${input.id}-${Date.now()}`),
    version: 1,
    startedAt: now(),
    updatedAt: now(),
    reveals: [],
    draftPool: [],
    mulliganUsed: /* @__PURE__ */ new Set()
  };
  input.participants.forEach((participant, index) => {
    game.players.push(createPlayer(participant, settings, teamFor(participant, index, settings), 1));
  });
  addLog(game, "system", `${settings.lobbyName} starts. Mode: ${modeLabel(settings.mode)}.`);
  if (settings.mode === "draft") {
    game.phase = "drafting";
    game.round = 0;
    game.draftPool = pool.map((card2) => card2.id);
    for (const player of game.players) {
      assignDraftOffers(game, player);
    }
    addLog(game, "system", `Draft phase: each player picks ${settings.draftPicks} cards.`);
    touch(game);
    return game;
  }
  for (const player of game.players) {
    buildDeckForPlayer(game, player, pool, settings.deckSize);
    starterTokens(game, player, pool);
    drawCards(game, player, settings.handSize);
  }
  game.round = 1;
  beginRound(game);
  touch(game);
  return game;
}
function modeLabel(mode) {
  const labels = {
    ffa: "Free For All",
    teams: "Teams",
    coop: "Co-op vs AI",
    draft: "Draft",
    sealed: "Sealed",
    elimination: "Elimination",
    scoreAttack: "Score Attack",
    kingOfHill: "King of the Hill",
    suddenDeath: "Sudden Death",
    custom: "Custom Ruleset"
  };
  return labels[mode];
}
function markConnection(game, playerId, connected) {
  const player = playerById(game, playerId);
  if (!player) return false;
  if (player.connected === connected) return false;
  player.connected = connected;
  addLog(
    game,
    "join",
    `${player.name} ${connected ? "reconnected to" : "disconnected from"} the match.`,
    player.id
  );
  touch(game);
  return true;
}
function appendChat(game, actorId, name, text) {
  addLog(game, "chat", `${name}: ${text}`, actorId);
  touch(game);
}
function getPlayer(game, playerId) {
  return playerById(game, playerId);
}

// src/server/bots.ts
function randomOf(values, fallback) {
  return values[Math.floor(Math.random() * values.length)] ?? fallback;
}
function opponents(game, playerId) {
  const bot = getPlayer(game, playerId);
  if (!bot) return [];
  return game.players.filter(
    (candidate) => candidate.id !== bot.id && candidate.teamId !== bot.teamId && !candidate.eliminated
  );
}
function ownAssets(game, playerId) {
  return getPlayer(game, playerId)?.battlefield ?? [];
}
function enemyAssets(game, playerId) {
  const bot = getPlayer(game, playerId);
  if (!bot) return [];
  return game.players.filter((candidate) => candidate.teamId !== bot.teamId && !candidate.eliminated).flatMap((candidate) => candidate.battlefield.map((card2) => ({ ownerId: candidate.id, card: card2 })));
}
function targetPlan(game, playerId, target, difficulty) {
  const bot = getPlayer(game, playerId);
  if (!bot) return null;
  const enemies = opponents(game, playerId).sort((left, right) => {
    if (difficulty === "easy") return Math.random() - 0.5;
    const leftLethal = left.hp <= 4 ? 1 : 0;
    const rightLethal = right.hp <= 4 ? 1 : 0;
    if (leftLethal !== rightLethal) return rightLethal - leftLethal;
    return right.score - left.score || left.hp - right.hp;
  });
  const assets = enemyAssets(game, playerId);
  const choosePlayer = () => {
    if (enemies.length === 0) return null;
    const chosen = difficulty === "easy" ? randomOf(enemies, enemies[0]) : enemies[0];
    return { targetPlayerId: chosen.id };
  };
  switch (target) {
    case "none":
      return {};
    case "enemyPlayer":
      return choosePlayer();
    case "anyPlayer": {
      const chosen = choosePlayer();
      if (chosen) return chosen;
      return { targetPlayerId: bot.id };
    }
    case "enemyAsset": {
      if (assets.length === 0) return null;
      const sorted = [...assets].sort((left, right) => {
        const leftValue = (getCard(left.card.cardId).passive?.pointsPerRound ?? 0) * 3 + (getCard(left.card.cardId).passive?.creditsPerTurn ?? 0);
        const rightValue = (getCard(right.card.cardId).passive?.pointsPerRound ?? 0) * 3 + (getCard(right.card.cardId).passive?.creditsPerTurn ?? 0);
        return rightValue - leftValue;
      });
      const chosen = difficulty === "easy" ? randomOf(sorted, sorted[0]) : sorted[0];
      return { targetPlayerId: chosen.ownerId, targetIid: chosen.card.iid };
    }
    case "ownAsset": {
      const assets2 = ownAssets(game, playerId);
      if (assets2.length === 0) return null;
      const chosen = assets2[0];
      return { targetPlayerId: bot.id, targetIid: chosen.iid };
    }
    case "anyAsset": {
      const pool = [...assets.map((entry) => ({ ownerId: entry.ownerId, card: entry.card })), ...ownAssets(game, playerId).map((card2) => ({ ownerId: bot.id, card: card2 }))];
      if (pool.length === 0) return null;
      const chosen = difficulty === "easy" ? randomOf(pool, pool[0]) : pool[0];
      return { targetPlayerId: chosen.ownerId, targetIid: chosen.card.iid };
    }
    default:
      return {};
  }
}
function cardValue(game, playerId, card2, difficulty) {
  const bot = getPlayer(game, playerId);
  if (!bot) return 0;
  if (difficulty === "easy") return Math.random() * 10;
  const enemies = opponents(game, playerId);
  const minimumHp = enemies.reduce((lowest, enemy) => Math.min(lowest, enemy.hp), Number.POSITIVE_INFINITY);
  let value = 3;
  if (card2.type === "asset") {
    value += 5 + (card2.passive?.pointsPerRound ?? 0) * 3 + (card2.passive?.creditsPerTurn ?? 0) * 1.4;
  }
  if (card2.type === "defense") {
    value += bot.battlefield.length < 2 ? 4 : 1;
    value += card2.defense?.uses ?? 0;
  }
  if (card2.type === "attack") {
    value += 2;
    for (const action of card2.actions) {
      if (action.kind === "damage" && action.amount >= minimumHp && minimumHp > 0) value += 40;
      if (action.kind === "drain" || action.kind === "score") value += action.amount * 0.5;
      if (action.kind === "destroyAsset") value += 5;
    }
  }
  if (card2.type === "event") {
    const isEconomy = card2.actions.some((action) => ["draw", "credits", "score", "heal", "shield"].includes(action.kind));
    value += isEconomy ? 2 : 0.5;
  }
  if (difficulty === "nightmare") {
    if (card2.keywords.includes("unblockable")) value += 3;
    if (card2.keywords.includes("draw")) value += 1;
    if (bot.hp <= 8 && card2.type === "defense") value += 4;
  }
  value += (6 - Math.min(6, card2.cost)) * 0.2;
  return value;
}
function takeBotAction(game, playerId, difficulty) {
  if (game.phase !== "playing" || !canAct(game, playerId)) return false;
  const player = getPlayer(game, playerId);
  if (!player) return false;
  const limit = game.settings.cardsPerTurn + player.battlefield.reduce(
    (bonus, instance) => bonus + (getCard(instance.cardId).passive?.playLimitBonus ?? 0),
    0
  );
  if (player.playedThisTurn >= limit || player.hand.length === 0) {
    endTurn(game, playerId);
    return true;
  }
  const moves = [];
  for (const instance of player.hand) {
    const card2 = getCard(instance.cardId);
    if (card2.cost > player.credits) continue;
    const plan = targetPlan(game, playerId, card2.target, difficulty);
    if (plan === null) continue;
    moves.push({
      iid: instance.iid,
      ...plan,
      score: cardValue(game, playerId, card2, difficulty)
    });
  }
  moves.sort((left, right) => right.score - left.score);
  const attempts = difficulty === "easy" ? [randomOf(moves, moves[0])] : moves;
  for (const move of attempts) {
    if (!move) continue;
    try {
      playCard(game, playerId, {
        iid: move.iid,
        targetPlayerId: move.targetPlayerId,
        targetIid: move.targetIid
      });
      return true;
    } catch (error) {
      if (!(error instanceof GameRuleError)) throw error;
    }
  }
  endTurn(game, playerId);
  return true;
}
function takeBotDraftPick(game, playerId) {
  if (game.phase !== "drafting") return false;
  const cardId = botDraftPick(game, playerId);
  if (!cardId) return false;
  draftPick(game, playerId, cardId);
  return true;
}

// src/server/lobby.ts
var BOT_NAMES = [
  "Packet Goblin",
  "Null Pointer",
  "Kernel Panic",
  "Proxy Prowler",
  "Rootworm",
  "Cache Wolf",
  "Loopback",
  "Segfault",
  "Bit Rot",
  "Stack Smasher",
  "Ping Phantom",
  "Daemon",
  "Cipher Rat",
  "Dead Drop",
  "Fork Bomb",
  "Socket Viper"
];
function cleanName(raw, fallback = "Player") {
  const value = typeof raw === "string" ? raw : "";
  const cleaned = value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 24);
  return cleaned || fallback;
}
function cleanChat(raw) {
  return (typeof raw === "string" ? raw : "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 400);
}
function cloneSettings(settings) {
  return {
    ...settings,
    loseConditions: [...settings.loseConditions],
    enabledExpansions: [...settings.enabledExpansions],
    enabledCards: [...settings.enabledCards],
    bannedCards: [...settings.bannedCards]
  };
}
function generateToken() {
  return `${(0, import_node_crypto2.randomUUID)()}${(0, import_node_crypto2.randomUUID)()}`.replaceAll("-", "");
}
var Lobby = class {
  id;
  hostKey;
  serverVersion;
  now;
  settings;
  players = /* @__PURE__ */ new Map();
  spectators = /* @__PURE__ */ new Map();
  playerTokens = /* @__PURE__ */ new Map();
  spectatorTokens = /* @__PURE__ */ new Map();
  connections = /* @__PURE__ */ new Map();
  hostId = null;
  gameState = null;
  createdAt;
  constructor(options) {
    this.id = options.id ?? (0, import_node_crypto2.randomUUID)();
    this.hostKey = options.hostKey;
    this.serverVersion = options.serverVersion ?? CLIENT_VERSION;
    this.now = options.now ?? Date.now;
    this.settings = normaliseSettings(options.settings);
    this.createdAt = this.now();
  }
  get game() {
    return this.gameState;
  }
  get phase() {
    return this.gameState?.phase ?? "lobby";
  }
  get settingsSnapshot() {
    return cloneSettings(this.settings);
  }
  get hostConnected() {
    if (!this.hostId) return false;
    return Boolean(this.players.get(this.hostId)?.connected);
  }
  get hostName() {
    if (!this.hostId) return "Unclaimed";
    return this.players.get(this.hostId)?.name ?? "Unclaimed";
  }
  get playerCount() {
    return this.players.size;
  }
  get spectatorCount() {
    return this.spectators.size;
  }
  snapshot() {
    return {
      id: this.id,
      hostName: this.hostName,
      hostConnected: this.hostConnected,
      createdAt: this.createdAt,
      phase: this.phase,
      settings: this.settingsSnapshot,
      players: [...this.players.values()].map((member) => this.publicPlayer(member)),
      spectators: [...this.spectators.values()].map((spectator) => this.publicSpectator(spectator)),
      gameRound: this.gameState?.round ?? 0,
      canStart: this.computeCanStart(),
      serverVersion: this.serverVersion,
      discoveryName: this.settings.lobbyName,
      noPlayerCap: true
    };
  }
  join(socket, message) {
    const existingConnection = [...this.connections.values()].find(
      (connection) => connection.socket.id === socket.id
    );
    if (existingConnection) {
      throw new GameRuleError("not-allowed", "This connection has already joined.");
    }
    const reconnectToken = typeof message.reconnectToken === "string" ? message.reconnectToken.trim() : "";
    if (reconnectToken) {
      const playerId = this.playerTokens.get(reconnectToken);
      const member = playerId ? this.players.get(playerId) : void 0;
      if (member) {
        this.reconnectPlayer(socket, member);
        return;
      }
      const spectatorId = this.spectatorTokens.get(reconnectToken);
      const spectator2 = spectatorId ? this.spectators.get(spectatorId) : void 0;
      if (spectator2) {
        this.reconnectSpectator(socket, spectator2);
        return;
      }
    }
    const name = cleanName(message.name);
    let role = message.role === "spectator" ? "spectator" : "player";
    const wantsHost = typeof message.hostKey === "string" && message.hostKey.length > 0;
    if (wantsHost && message.hostKey !== this.hostKey) {
      throw new GameRuleError("not-allowed", "The host key is incorrect.");
    }
    const activeGame = this.gameState && (this.gameState.phase === "drafting" || this.gameState.phase === "playing");
    if (role === "player" && activeGame) {
      if (this.gameState.phase === "drafting") {
        role = "spectator";
      } else if (this.settings.lateJoin === "off") {
        throw new GameRuleError("not-allowed", "This match has started and late joining is disabled.");
      } else if (this.settings.lateJoin === "spectators") {
        role = "spectator";
      }
    }
    if (role === "player" && this.gameState?.phase === "ended") {
      role = "spectator";
    }
    if (role === "spectator" && !this.settings.allowSpectators) {
      throw new GameRuleError("not-allowed", "Spectators are disabled in this lobby.");
    }
    if (wantsHost && role !== "player") {
      throw new GameRuleError("not-allowed", "Hosts must join as a player before the match starts.");
    }
    const id = (0, import_node_crypto2.randomUUID)();
    const token = generateToken();
    const timestamp = this.now();
    if (role === "player") {
      const member = {
        id,
        name,
        isBot: false,
        teamId: "",
        connected: true,
        isHost: false,
        connectedAt: timestamp,
        lastSeenAt: timestamp,
        ready: false,
        token,
        connectionId: socket.id,
        disconnectedAt: null
      };
      this.players.set(id, member);
      this.playerTokens.set(token, id);
      member.teamId = this.assignTeamId(false);
      let hostAssigned = false;
      if (wantsHost) hostAssigned = this.claimHost(member);
      if (!hostAssigned && wantsHost) {
        this.send(socket, {
          type: "notice",
          message: "Host key accepted, but this lobby already has an active host. You joined as a player.",
          tone: "warn"
        });
      }
      this.connections.set(socket.id, { socket, selfId: id, role: "player" });
      if (this.gameState?.phase === "playing") {
        try {
          addLatePlayer(this.gameState, this.participantFor(member), member.teamId);
        } catch {
        }
      }
      this.sendJoined(socket, id, "player");
      this.broadcastLobby();
      this.broadcastGame();
      return;
    }
    const spectator = {
      id,
      name,
      connected: true,
      connectedAt: timestamp,
      token,
      connectionId: socket.id,
      disconnectedAt: null
    };
    this.spectators.set(id, spectator);
    this.spectatorTokens.set(token, id);
    this.connections.set(socket.id, { socket, selfId: id, role: "spectator" });
    this.sendJoined(socket, id, "spectator");
    if (role === "spectator") {
      this.send(socket, {
        type: "notice",
        message: wantsHost ? "Host key accepted, but hosts must join as a player before the match starts." : "Spectating. The table is read-only.",
        tone: wantsHost ? "warn" : "info"
      });
    }
    this.broadcastLobby();
    this.broadcastGame();
  }
  handle(connectionId, message) {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new GameRuleError("not-allowed", "Join the lobby before sending commands.");
    }
    switch (message.type) {
      case "ping": {
        this.send(connection.socket, {
          type: "pong",
          t: typeof message.t === "number" ? message.t : 0,
          serverTime: this.now()
        });
        return;
      }
      case "configure": {
        this.requireHost(connection);
        this.configure(message.settings);
        return;
      }
      case "startGame": {
        this.requireHost(connection);
        this.startGame();
        return;
      }
      case "addBot": {
        this.requireHost(connection);
        this.addBot(message.difficulty);
        return;
      }
      case "removeBot": {
        this.requireHost(connection);
        this.removeBot(String(message.playerId ?? ""));
        return;
      }
      case "kick": {
        this.requireHost(connection);
        this.kick(String(message.playerId ?? ""));
        return;
      }
      case "setReady": {
        const member = this.requirePlayer(connection);
        if (this.phase !== "lobby") {
          throw new GameRuleError("not-allowed", "Ready state is only used in the lobby.");
        }
        member.ready = Boolean(message.ready);
        this.broadcastLobby();
        return;
      }
      case "playCard": {
        const member = this.requirePlayer(connection);
        if (!this.gameState || this.gameState.phase !== "playing") {
          throw new GameRuleError("game-not-active", "The match is not in play.");
        }
        playCard(this.gameState, member.id, {
          iid: String(message.iid ?? ""),
          targetPlayerId: typeof message.targetPlayerId === "string" ? message.targetPlayerId : void 0,
          targetIid: typeof message.targetIid === "string" ? message.targetIid : void 0
        });
        this.afterGameMutation();
        return;
      }
      case "endTurn": {
        const member = this.requirePlayer(connection);
        if (!this.gameState) {
          throw new GameRuleError("game-not-active", "There is no active match.");
        }
        endTurn(this.gameState, member.id, "manual");
        this.afterGameMutation();
        return;
      }
      case "draftPick": {
        const member = this.requirePlayer(connection);
        if (!this.gameState) {
          throw new GameRuleError("game-not-active", "There is no active draft.");
        }
        draftPick(this.gameState, member.id, String(message.cardId ?? ""));
        this.afterGameMutation();
        return;
      }
      case "chat": {
        const text = cleanChat(message.text);
        if (!text) return;
        const actor = this.memberForConnection(connection);
        const name = actor?.name ?? "Spectator";
        const entry = {
          id: `chat-${(0, import_node_crypto2.randomUUID)()}`,
          at: this.now(),
          round: this.gameState?.round ?? 0,
          kind: "chat",
          text: `${name}: ${text}`,
          actorId: actor?.id
        };
        if (this.gameState) {
          appendChat(this.gameState, actor?.id ?? "", name, text);
          this.broadcastGame();
        }
        for (const target of this.connections.values()) {
          this.send(target.socket, { type: "chat", message: entry });
        }
        return;
      }
      case "returnToLobby": {
        this.requireHost(connection);
        this.returnToLobby();
        return;
      }
      case "leave": {
        this.leave(connectionId);
        return;
      }
      default:
        throw new GameRuleError("invalid-action", `Unknown command "${message.type}".`);
    }
  }
  disconnect(connectionId) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;
    this.connections.delete(connectionId);
    const timestamp = this.now();
    if (connection.role === "player") {
      const member = this.players.get(connection.selfId);
      if (member) {
        member.connectionId = null;
        member.connected = false;
        member.lastSeenAt = timestamp;
        member.disconnectedAt = timestamp;
        if (this.gameState) {
          markConnection(this.gameState, member.id, false);
        }
      }
    } else {
      const spectator = this.spectators.get(connection.selfId);
      if (spectator) {
        spectator.connectionId = null;
        spectator.connected = false;
        spectator.disconnectedAt = timestamp;
      }
    }
    this.broadcastLobby();
    this.broadcastGame();
  }
  tick() {
    if (!this.gameState) {
      if (this.pruneDisconnected()) this.broadcastLobby();
      return;
    }
    const phaseBefore = this.gameState.phase;
    const versionBefore = this.gameState.version;
    try {
      if (this.gameState.phase === "drafting") {
        for (const bot of this.gameState.players.filter((player) => player.isBot)) {
          if (this.gameState.phase !== "drafting") break;
          takeBotDraftPick(this.gameState, bot.id);
        }
      }
      if (this.gameState?.phase === "playing") {
        tickGame(this.gameState);
      }
      if (this.gameState?.phase === "playing") {
        for (const bot of this.gameState.players.filter((player) => player.isBot)) {
          if (this.gameState.phase !== "playing") break;
          if (!bot.connected) continue;
          takeBotAction(this.gameState, bot.id, this.settings.botDifficulty);
        }
      }
    } catch (error) {
      console.error("[bot] action failed", error);
    }
    if (this.gameState && this.gameState.version !== versionBefore) {
      this.broadcastGame();
    }
    if (this.gameState && this.gameState.phase !== phaseBefore) {
      this.broadcastLobby();
    }
    if (this.pruneDisconnected()) this.broadcastLobby();
  }
  participantFor(member) {
    return {
      id: member.id,
      name: member.name,
      isBot: member.isBot,
      teamId: member.teamId
    };
  }
  publicPlayer(member) {
    return {
      id: member.id,
      name: member.name,
      isBot: member.isBot,
      teamId: member.teamId,
      connected: member.connected,
      isHost: member.id === this.hostId,
      connectedAt: member.connectedAt,
      lastSeenAt: member.lastSeenAt,
      ready: member.isBot ? true : member.id === this.hostId ? true : member.ready
    };
  }
  publicSpectator(spectator) {
    return {
      id: spectator.id,
      name: spectator.name,
      connected: spectator.connected,
      connectedAt: spectator.connectedAt
    };
  }
  computeCanStart() {
    if (this.phase !== "lobby" || !this.hostId) return false;
    if (!this.hostConnected) return false;
    const botGap = Math.max(0, this.settings.botCount - this.countBots());
    if (this.players.size + botGap < 2) return false;
    return [...this.players.values()].every(
      (member) => member.isBot || member.id === this.hostId || !member.connected || member.ready
    );
  }
  countBots() {
    return [...this.players.values()].filter((member) => member.isBot).length;
  }
  assignTeamId(isBot) {
    if (this.settings.mode === "coop") return isBot ? "ai" : "crew";
    if (this.settings.mode !== "teams") return `solo-${(0, import_node_crypto2.randomUUID)()}`;
    const counts = /* @__PURE__ */ new Map();
    for (const member of this.players.values()) {
      if (!member.teamId) continue;
      counts.set(member.teamId, (counts.get(member.teamId) ?? 0) + 1);
    }
    const teamSize = Math.max(1, this.settings.teamSize);
    let best = null;
    let bestCount = Number.POSITIVE_INFINITY;
    for (const [teamId, count] of counts) {
      if (count >= teamSize) continue;
      if (count < bestCount) {
        best = teamId;
        bestCount = count;
      }
    }
    if (best) return best;
    return `team-${counts.size + 1}`;
  }
  reassignTeams() {
    if (this.settings.mode === "coop") {
      for (const member of this.players.values()) member.teamId = member.isBot ? "ai" : "crew";
      return;
    }
    if (this.settings.mode !== "teams") {
      for (const member of this.players.values()) {
        if (!member.teamId.startsWith("solo-")) member.teamId = `solo-${(0, import_node_crypto2.randomUUID)()}`;
      }
      return;
    }
    const teamSize = Math.max(1, this.settings.teamSize);
    let index = 0;
    let team = 1;
    for (const member of this.players.values()) {
      member.teamId = `team-${team}`;
      index += 1;
      if (index >= teamSize) {
        index = 0;
        team += 1;
      }
    }
  }
  claimHost(member) {
    const current = this.hostId ? this.players.get(this.hostId) : void 0;
    if (current && current.id !== member.id && current.connected) {
      return false;
    }
    if (current && current.id !== member.id) current.isHost = false;
    this.hostId = member.id;
    member.isHost = true;
    return true;
  }
  reconnectPlayer(socket, member) {
    member.connectionId = socket.id;
    member.connected = true;
    member.lastSeenAt = this.now();
    member.disconnectedAt = null;
    if (this.gameState) markConnection(this.gameState, member.id, true);
    this.connections.set(socket.id, { socket, selfId: member.id, role: "player" });
    this.sendJoined(socket, member.id, "player");
    this.broadcastLobby();
    this.broadcastGame();
  }
  reconnectSpectator(socket, spectator) {
    if (!this.settings.allowSpectators) {
      throw new GameRuleError("not-allowed", "Spectators are disabled in this lobby.");
    }
    spectator.connectionId = socket.id;
    spectator.connected = true;
    spectator.disconnectedAt = null;
    this.connections.set(socket.id, { socket, selfId: spectator.id, role: "spectator" });
    this.sendJoined(socket, spectator.id, "spectator");
    this.broadcastLobby();
    this.broadcastGame();
  }
  sendJoined(socket, selfId, role) {
    const token = role === "player" ? this.players.get(selfId)?.token ?? "" : this.spectators.get(selfId)?.token ?? "";
    const game = this.gameState;
    const view = game ? makeView(game, selfId, role === "spectator") : null;
    this.send(socket, {
      type: "joined",
      selfId,
      isHost: this.hostId === selfId,
      reconnectToken: token,
      role,
      lobby: this.snapshot(),
      game: view,
      serverTime: this.now()
    });
  }
  requireHost(connection) {
    if (this.hostId !== connection.selfId) {
      throw new GameRuleError("not-allowed", "Only the host can do that.");
    }
  }
  requirePlayer(connection) {
    if (connection.role !== "player") {
      throw new GameRuleError("not-allowed", "Spectators cannot perform that action.");
    }
    const member = this.players.get(connection.selfId);
    if (!member) throw new GameRuleError("not-allowed", "Player slot not found.");
    return member;
  }
  memberForConnection(connection) {
    return connection.role === "player" ? this.players.get(connection.selfId) : void 0;
  }
  configure(patch) {
    if (this.phase !== "lobby") {
      throw new GameRuleError("not-allowed", "Settings are locked after the match starts.");
    }
    if (!patch || typeof patch !== "object") {
      throw new GameRuleError("invalid-action", "Settings payload is invalid.");
    }
    const next = normaliseSettings({ ...this.settings, ...patch });
    const error = validateGameSettings(next);
    if (error) throw new GameRuleError("invalid-action", error);
    const previous = this.settings;
    this.settings = next;
    if (previous.mode !== next.mode || previous.teamSize !== next.teamSize) {
      this.reassignTeams();
    }
    if (previous.botCount !== next.botCount) {
      this.syncBotsToTarget();
    }
    this.broadcastLobby();
  }
  startGame() {
    if (this.phase !== "lobby") {
      throw new GameRuleError("not-allowed", "The match has already started.");
    }
    this.syncBotsToTarget();
    if (this.players.size < 2) {
      throw new GameRuleError("not-allowed", "Add another player or a bot before starting.");
    }
    if (!this.computeCanStart()) {
      throw new GameRuleError("not-allowed", "Every connected guest must be ready before the host starts.");
    }
    const participants = [...this.players.values()].map((member) => this.participantFor(member));
    try {
      this.gameState = createGame({
        id: (0, import_node_crypto2.randomUUID)(),
        participants,
        settings: this.settings
      });
    } catch (error) {
      throw new GameRuleError(
        "invalid-action",
        error instanceof Error ? error.message : "Could not start the match."
      );
    }
    for (const member of this.players.values()) {
      member.ready = member.isBot;
    }
    this.hostId = this.hostId ?? [...this.players.values()].find((member) => member.connected)?.id ?? null;
    this.broadcastLobby();
    this.broadcastGame();
    this.notice("Match started. Good luck, defenders.", "success");
  }
  addBot(difficulty) {
    if (this.phase !== "lobby") {
      throw new GameRuleError("not-allowed", "Bots can only be added in the lobby.");
    }
    if (this.countBots() >= 128) {
      throw new GameRuleError("not-allowed", "Bot limit reached for this host.");
    }
    this.settings.botCount = Math.max(this.settings.botCount, this.countBots()) + 1;
    if (difficulty) this.settings.botDifficulty = difficulty;
    this.syncBotsToTarget();
    this.broadcastLobby();
  }
  addBotInternal(difficulty) {
    const usedNames = new Set([...this.players.values()].map((member2) => member2.name));
    const name = BOT_NAMES.find((candidate) => !usedNames.has(candidate)) ?? `Bot ${this.countBots() + 1}`;
    const id = (0, import_node_crypto2.randomUUID)();
    const timestamp = this.now();
    const member = {
      id,
      name,
      isBot: true,
      teamId: "",
      connected: true,
      isHost: false,
      connectedAt: timestamp,
      lastSeenAt: timestamp,
      ready: true,
      token: "",
      connectionId: null,
      disconnectedAt: null
    };
    if (difficulty) this.settings.botDifficulty = difficulty;
    this.players.set(id, member);
    member.teamId = this.assignTeamId(true);
    return member;
  }
  syncBotsToTarget() {
    const target = Math.max(0, Math.min(128, Math.round(this.settings.botCount)));
    let guard = 0;
    while (this.countBots() < target && guard < 128) {
      this.addBotInternal();
      guard += 1;
    }
    if (this.countBots() > target) {
      const bots = [...this.players.values()].filter((member) => member.isBot);
      for (const bot of bots.slice(0, bots.length - target)) {
        this.players.delete(bot.id);
      }
      this.reassignTeams();
    }
    this.settings.botCount = this.countBots();
  }
  removeBot(playerId) {
    if (this.phase !== "lobby") {
      throw new GameRuleError("not-allowed", "Bots can only be removed in the lobby.");
    }
    const member = this.players.get(playerId);
    if (!member || !member.isBot) {
      throw new GameRuleError("invalid-action", "That player is not a bot.");
    }
    this.players.delete(playerId);
    this.settings.botCount = Math.max(0, this.countBots());
    this.syncBotsToTarget();
    this.broadcastLobby();
  }
  kick(playerId) {
    if (this.phase === "playing" || this.phase === "drafting") {
      throw new GameRuleError("not-allowed", "Players cannot be kicked during an active match.");
    }
    if (playerId === this.hostId) {
      throw new GameRuleError("not-allowed", "The host cannot kick themselves.");
    }
    const player = this.players.get(playerId);
    if (player && player.isBot) {
      this.removeBot(playerId);
      return;
    }
    if (player) {
      const connection = player.connectionId ? this.connections.get(player.connectionId) : void 0;
      if (connection) {
        this.send(connection.socket, { type: "kicked", reason: "The host removed you from the lobby." });
        this.connections.delete(connection.socket.id);
        this.close(connection.socket, "kicked");
      }
      this.players.delete(playerId);
      this.playerTokens.delete(player.token);
      this.broadcastLobby();
      return;
    }
    const spectator = this.spectators.get(playerId);
    if (spectator) {
      const connection = spectator.connectionId ? this.connections.get(spectator.connectionId) : void 0;
      if (connection) {
        this.send(connection.socket, { type: "kicked", reason: "The host removed you from the lobby." });
        this.connections.delete(connection.socket.id);
        this.close(connection.socket, "kicked");
      }
      this.spectators.delete(playerId);
      this.spectatorTokens.delete(spectator.token);
      this.broadcastLobby();
      return;
    }
    throw new GameRuleError("invalid-action", "That player is no longer in the lobby.");
  }
  returnToLobby() {
    if (!this.gameState) {
      throw new GameRuleError("game-not-active", "The lobby is already open.");
    }
    this.gameState = null;
    for (const member of this.players.values()) member.ready = member.isBot;
    this.reassignTeams();
    this.notice("The host returned everyone to the lobby.", "info");
    this.broadcastLobby();
  }
  leave(connectionId) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;
    this.connections.delete(connectionId);
    if (connection.role === "spectator") {
      const spectator = this.spectators.get(connection.selfId);
      if (spectator) {
        this.spectators.delete(spectator.id);
        this.spectatorTokens.delete(spectator.token);
      }
      this.send(connection.socket, { type: "left" });
      this.close(connection.socket, "left");
      this.broadcastLobby();
      return;
    }
    const member = this.players.get(connection.selfId);
    if (!member) return;
    if (this.gameState && this.gameState.phase !== "ended") {
      member.connectionId = null;
      member.connected = false;
      member.disconnectedAt = this.now();
      markConnection(this.gameState, member.id, false);
      this.send(connection.socket, { type: "left" });
      this.close(connection.socket, "left");
      this.broadcastLobby();
      this.broadcastGame();
      return;
    }
    this.players.delete(member.id);
    this.playerTokens.delete(member.token);
    if (this.hostId === member.id) this.hostId = null;
    this.send(connection.socket, { type: "left" });
    this.close(connection.socket, "left");
    this.broadcastLobby();
  }
  pruneDisconnected() {
    const timestamp = this.now();
    const grace = Math.max(0, this.settings.reconnectGraceSec) * 1e3;
    let removed = false;
    if (!this.gameState || this.gameState.phase === "ended") {
      for (const member of [...this.players.values()]) {
        if (member.connected || member.isBot || member.id === this.hostId) continue;
        if (member.disconnectedAt !== null && timestamp - member.disconnectedAt >= grace) {
          this.players.delete(member.id);
          this.playerTokens.delete(member.token);
          removed = true;
        }
      }
    }
    for (const spectator of [...this.spectators.values()]) {
      if (spectator.connected) continue;
      if (spectator.disconnectedAt !== null && timestamp - spectator.disconnectedAt >= grace) {
        this.spectators.delete(spectator.id);
        this.spectatorTokens.delete(spectator.token);
        removed = true;
      }
    }
    return removed;
  }
  afterGameMutation() {
    this.broadcastGame();
    if (this.gameState?.phase === "ended") {
      this.broadcastLobby();
    }
    this.pruneDisconnected();
  }
  broadcastLobby() {
    const lobby = this.snapshot();
    for (const connection of this.connections.values()) {
      this.send(connection.socket, { type: "lobby", lobby });
    }
  }
  broadcastGame() {
    if (!this.gameState) return;
    for (const [connectionId, connection] of this.connections) {
      const view = makeView(this.gameState, connection.selfId, connection.role === "spectator");
      this.send(connection.socket, { type: "game", game: view });
      if (!this.connections.has(connectionId)) break;
    }
  }
  notice(message, tone) {
    for (const connection of this.connections.values()) {
      this.send(connection.socket, { type: "notice", message, tone });
    }
  }
  send(socket, message) {
    try {
      socket.send(message);
    } catch {
    }
  }
  close(socket, reason) {
    try {
      socket.close(reason);
    } catch {
    }
  }
};

// src/server/host.ts
var import_meta = {};
function lanAddresses() {
  const results = /* @__PURE__ */ new Set(["127.0.0.1"]);
  for (const entries of Object.values((0, import_node_os2.networkInterfaces)())) {
    for (const entry of entries ?? []) {
      if (entry.family === "IPv4" && !entry.internal) results.add(entry.address);
    }
  }
  return [...results];
}
function moduleDirectory() {
  try {
    if (typeof __dirname === "string" && __dirname) return __dirname;
  } catch {
  }
  try {
    const meta = import_meta;
    if (meta.url) return (0, import_node_path.dirname)((0, import_node_url.fileURLToPath)(meta.url));
  } catch {
  }
  return null;
}
function findClientDir(explicit) {
  const isClientDir = (candidate) => Boolean(candidate && (0, import_node_fs.existsSync)((0, import_node_path.join)(candidate, "index.html")));
  if (isClientDir(explicit)) return explicit;
  const cwdCandidate = (0, import_node_path.join)(process.cwd(), "dist", "client");
  if (isClientDir(cwdCandidate)) return cwdCandidate;
  const dir = moduleDirectory();
  if (!dir) return null;
  const candidates = [
    (0, import_node_path.resolve)(dir, "..", "client"),
    (0, import_node_path.resolve)(dir, "..", "..", "dist", "client")
  ];
  return candidates.find(isClientDir) ?? null;
}
function listen(server, port) {
  return new Promise((resolvePort, reject) => {
    const onError = (error) => {
      server.off("listening", onListening);
      reject(error);
    };
    const onListening = () => {
      server.off("error", onError);
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("Server did not expose a TCP address."));
        return;
      }
      resolvePort(address.port);
    };
    server.once("error", onError);
    server.once("listening", onListening);
    server.listen(port, "0.0.0.0");
  });
}
async function startHost(options = {}) {
  const hostKey = options.hostKey ?? (0, import_node_crypto3.randomBytes)(14).toString("base64url");
  const serverId = (0, import_node_crypto3.randomUUID)();
  const lobby = new Lobby({ hostKey, settings: options.settings });
  const app2 = (0, import_express.default)();
  app2.disable("x-powered-by");
  app2.use((request, response, next) => {
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Referrer-Policy", "no-referrer");
    response.setHeader("X-Frame-Options", "SAMEORIGIN");
    if (request.path.startsWith("/api/")) {
      response.setHeader("Cache-Control", "no-store");
    }
    next();
  });
  app2.use(import_express.default.json({ limit: "64kb" }));
  const addresses = lanAddresses();
  app2.get("/api/health", (_request, response) => {
    response.json({ ok: true, version: CLIENT_VERSION, noPlayerCap: true });
  });
  app2.get("/api/info", (_request, response) => {
    response.json({
      id: serverId,
      name: lobby.snapshot().discoveryName,
      hostName: lobby.hostName,
      version: CLIENT_VERSION,
      port: actualPort,
      addresses,
      startedAt,
      hostKeyRequired: true,
      noPlayerCap: true
    });
  });
  app2.get("/api/lobby", (_request, response) => {
    response.json(lobby.snapshot());
  });
  app2.get("/api/cards", (_request, response) => {
    response.json({ cards: ALL_CARDS });
  });
  app2.get("/api/discover", async (_request, response) => {
    const local = lobby.snapshot();
    const record = {
      id: serverId,
      name: local.settings.lobbyName,
      hostName: local.hostName,
      host: addresses.find((address) => address !== "127.0.0.1") ?? "127.0.0.1",
      port: actualPort,
      players: local.players.length,
      phase: local.phase,
      version: CLIENT_VERSION,
      source: "local"
    };
    try {
      const remote = await discovery.scan();
      response.json([record, ...remote.filter((entry) => entry.id !== serverId)]);
    } catch {
      response.json([record]);
    }
  });
  const clientDir = findClientDir(options.clientDir);
  if (clientDir) {
    app2.use(
      import_express.default.static(clientDir, {
        index: false,
        maxAge: "1h",
        setHeaders(response, filePath) {
          if (filePath.includes(`${(0, import_node_path.join)(clientDir, "art")}`) || filePath.includes(`${(0, import_node_path.join)(clientDir, "assets")}`)) {
            response.setHeader("Cache-Control", "public, max-age=2592000, immutable");
          }
        }
      })
    );
    app2.use((request, response, next) => {
      if (request.method !== "GET" || request.path.startsWith("/api/") || request.path === "/ws") {
        next();
        return;
      }
      if (!request.accepts("html")) {
        next();
        return;
      }
      response.sendFile((0, import_node_path.join)(clientDir, "index.html"));
    });
  } else {
    app2.get("/", (_request, response) => {
      response.status(200).json({
        name: "CyberThreat Defender: LAN FFA & Teams",
        message: "The client bundle is not built. Run npm run build, or use npm run dev for Vite.",
        api: "/api/info"
      });
    });
  }
  app2.use((_request, response) => {
    response.status(404).json({ error: "Not found" });
  });
  const server = (0, import_node_http.createServer)(app2);
  const actualPort = await listen(server, options.port ?? 8787);
  const startedAt = Date.now();
  const url = `http://127.0.0.1:${actualPort}`;
  const wss = new import_ws.WebSocketServer({ noServer: true, maxPayload: 96 * 1024 });
  server.on("upgrade", (request, socket, head) => {
    const pathname = (() => {
      try {
        return new URL(request.url ?? "/", "http://localhost").pathname;
      } catch {
        return "";
      }
    })();
    if (pathname !== "/ws") {
      socket.destroy();
      return;
    }
    wss.handleUpgrade(request, socket, head, (websocket) => {
      wss.emit("connection", websocket, request);
    });
  });
  const connectionIds = /* @__PURE__ */ new Map();
  const alive = /* @__PURE__ */ new WeakMap();
  wss.on("connection", (websocket) => {
    const connectionId = (0, import_node_crypto3.randomUUID)();
    connectionIds.set(websocket, connectionId);
    alive.set(websocket, true);
    let joined = false;
    let messageWindow = 0;
    let messageWindowStart = Date.now();
    const sendToSocket = (message) => {
      if (websocket.readyState !== import_ws.WebSocket.OPEN) return;
      try {
        websocket.send(JSON.stringify(message));
      } catch {
      }
    };
    const socketAdapter = {
      id: connectionId,
      send: sendToSocket,
      close: (reason) => {
        try {
          websocket.close(1e3, reason.slice(0, 100));
        } catch {
          websocket.terminate();
        }
      }
    };
    websocket.on("pong", () => alive.set(websocket, true));
    websocket.on("message", (raw) => {
      const now2 = Date.now();
      if (now2 - messageWindowStart > 1e3) {
        messageWindow = 0;
        messageWindowStart = now2;
      }
      messageWindow += 1;
      if (messageWindow > 120) {
        sendToSocket({ type: "error", code: "rate-limit", message: "Too many messages. Slow down." });
        return;
      }
      let message;
      try {
        message = JSON.parse(raw.toString());
      } catch {
        sendToSocket({ type: "error", code: "bad-json", message: "Messages must be valid JSON." });
        return;
      }
      if (!message || typeof message !== "object" || typeof message.type !== "string") {
        sendToSocket({ type: "error", code: "bad-message", message: "A message type is required." });
        return;
      }
      try {
        if (message.type === "join") {
          if (joined) {
            sendToSocket({ type: "error", code: "already-joined", message: "This connection already joined." });
            return;
          }
          lobby.join(socketAdapter, message);
          joined = true;
          return;
        }
        lobby.handle(connectionId, { ...message, type: String(message.type) });
      } catch (error) {
        if (error instanceof GameRuleError) {
          sendToSocket({ type: "error", code: error.code, message: error.message });
        } else {
          console.error("[ws] Unhandled command error:", error);
          sendToSocket({ type: "error", code: "internal", message: "The host could not process that action." });
        }
      }
    });
    websocket.on("close", () => {
      connectionIds.delete(websocket);
      lobby.disconnect(connectionId);
    });
    websocket.on("error", (error) => {
      console.warn("[ws] Socket error:", error.message);
    });
  });
  const heartbeat = setInterval(() => {
    for (const websocket of wss.clients) {
      if (alive.get(websocket) === false) {
        websocket.terminate();
        continue;
      }
      alive.set(websocket, false);
      try {
        websocket.ping();
      } catch {
      }
    }
  }, 3e4);
  heartbeat.unref?.();
  const discovery = new DiscoveryService({
    getRecord: () => ({
      info: {
        id: serverId,
        name: lobby.snapshot().discoveryName,
        hostName: lobby.hostName,
        version: CLIENT_VERSION,
        port: actualPort,
        addresses,
        startedAt,
        hostKeyRequired: true,
        noPlayerCap: true
      },
      lobby: lobby.snapshot()
    }),
    discoveryPort: options.discoveryPort,
    enableMdns: options.enableMdns,
    enableUdp: options.enableUdp
  });
  await discovery.start();
  const ticker = setInterval(() => {
    try {
      lobby.tick();
    } catch (error) {
      console.error("[lobby] Tick failed:", error);
    }
  }, 450);
  ticker.unref?.();
  if (!options.quiet) {
    console.log("");
    console.log("  CyberThreat Defender: LAN FFA & Teams");
    console.log(`  Host console: ${url}/#hostKey=${encodeURIComponent(hostKey)}`);
    console.log(`  Guest join:   ${url}`);
    console.log(`  LAN join:     http://<your-ip>:${actualPort}`);
    console.log("  No player cap. mDNS + UDP discovery enabled.");
    console.log("");
  }
  return {
    port: actualPort,
    url,
    hostKey,
    serverId,
    lobby,
    discovery,
    async close() {
      clearInterval(ticker);
      clearInterval(heartbeat);
      for (const client of wss.clients) {
        try {
          client.close(1001, "Host shutting down");
        } catch {
          client.terminate();
        }
      }
      await new Promise((resolveClose) => wss.close(() => resolveClose()));
      await discovery.stop();
      await new Promise((resolveClose, reject) => {
        server.close((error) => error ? reject(error) : resolveClose());
      });
    }
  };
}

// src/desktop/main.ts
var host = null;
function createWindow(url) {
  const window = new import_electron.BrowserWindow({
    width: 1500,
    height: 940,
    minWidth: 1020,
    minHeight: 700,
    backgroundColor: "#03090d",
    title: "CyberThreat Defender: LAN FFA & Teams",
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false
    }
  });
  window.once("ready-to-show", () => window.show());
  window.webContents.setWindowOpenHandler(({ url: target }) => {
    if (target.startsWith("http://") || target.startsWith("https://")) {
      void import_electron.shell.openExternal(target);
    }
    return { action: "deny" };
  });
  window.webContents.on("will-navigate", (event, target) => {
    if (!target.startsWith(url)) event.preventDefault();
  });
  void window.loadURL(url);
  return window;
}
var gotLock = import_electron.app.requestSingleInstanceLock();
if (!gotLock) {
  import_electron.app.quit();
} else {
  import_electron.app.on("second-instance", () => {
    const window = import_electron.BrowserWindow.getAllWindows()[0];
    if (window) {
      if (window.isMinimized()) window.restore();
      window.focus();
    }
  });
  void import_electron.app.whenReady().then(async () => {
    try {
      host = await startHost({
        port: 0,
        hostKey: (0, import_node_crypto4.randomBytes)(16).toString("base64url"),
        clientDir: (0, import_node_path2.join)(import_electron.app.getAppPath(), "dist", "client"),
        enableMdns: true,
        enableUdp: true,
        quiet: true
      });
      const window = createWindow(
        `${host.url}/#hostKey=${encodeURIComponent(host.hostKey)}&desktop=1`
      );
      window.setTitle("CyberThreat Defender: LAN FFA & Teams");
    } catch (error) {
      import_electron.dialog.showErrorBox(
        "Could not start CyberThreat Defender",
        error instanceof Error ? error.message : String(error)
      );
      import_electron.app.quit();
    }
  });
  import_electron.app.on("activate", () => {
    if (import_electron.BrowserWindow.getAllWindows().length === 0 && host) {
      createWindow(`${host.url}/#hostKey=${encodeURIComponent(host.hostKey)}&desktop=1`);
    }
  });
  import_electron.app.on("window-all-closed", () => {
    import_electron.app.quit();
  });
  import_electron.app.on("before-quit", (event) => {
    if (!host) return;
    event.preventDefault();
    const closing = host;
    host = null;
    void closing.close().finally(() => import_electron.app.quit());
  });
}
