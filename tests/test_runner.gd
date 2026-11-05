extends Node
const LobbyRules = preload("res://scripts/lobby_rules.gd")

var passed: int = 0
var failed: int = 0

func _ready() -> void:
	_test_card_db()
	_test_settings()
	_test_lobby_rules()
	_test_resolution()
	_test_win_conditions()
	_test_match_flow()
	_test_draw_per_turn()
	print("\n--- %d passed, %d failed ---" % [passed, failed])
	get_tree().quit(0 if failed == 0 else 1)

func _check(name: String, cond: bool) -> void:
	if cond: passed += 1; print("PASS  ", name)
	else:    failed += 1; print("FAIL  ", name)

func _test_card_db() -> void:
	_check("card db no errors", CardDB.load_errors.is_empty())
	_check("core >= 14", CardDB.by_expansion.get("core", []).size() >= 14)
	_check("brainrot >= 14", CardDB.by_expansion.get("brainrot", []).size() >= 14)
	_check("kirkity exists", not CardDB.get_card("kirkity").is_empty())
	_check("every card has alt", _all_have("alt"))
	_check("every card has effects", _all_have("effects"))
	_check("every card has art", _all_have_art())

func _all_have(f: String) -> bool:
	for id in CardDB.cards:
		var c: Dictionary = CardDB.cards[id]
		if not c.has(f): return false
		if typeof(c[f]) == TYPE_STRING and String(c[f]).strip_edges() == "": return false
	return true

func _all_have_art() -> bool:
	for id in CardDB.cards:
		if CardDB.get_art(id) == null: return false
	return true

func _test_settings() -> void:
	_check("defaults ok", Settings.validate({}).ok)
	_check("points default 30", Settings.validate({}).settings.points_to_win == 30)
	var bad: Dictionary = Settings.validate({"mode": "nonsense", "starting_hp": -5})
	_check("bad mode rejected", not bad.ok)
	_check("hp clamped", bad.settings.starting_hp == 1)
	_check("dmg mult clamped", Settings.validate({"damage_multiplier": 999.0}).settings.damage_multiplier <= 10.0)

func _test_lobby_rules() -> void:
	var ffa: Dictionary = Settings.validate({}).settings
	var teams: Dictionary = Settings.validate({"mode": "teams", "team_size": 2}).settings
	_check("ffa team -1", LobbyRules.assign_team(3, ffa) == -1)
	_check("team 0", LobbyRules.assign_team(0, teams) == 0 and LobbyRules.assign_team(1, teams) == 0)
	_check("team 1", LobbyRules.assign_team(2, teams) == 1)
	var no_late: Dictionary = Settings.validate({"late_join": false}).settings
	_check("late join blocked", not LobbyRules.evaluate_join(no_late, 2, false).allowed)
	_check("first join always", LobbyRules.evaluate_join(no_late, 0, false).allowed)
	_check("spec disabled", not LobbyRules.evaluate_join(Settings.validate({"spectators": false}).settings, 1, true).allowed)
	_check("large lobbies ok", LobbyRules.evaluate_join(Settings.validate({"mode": "teams", "team_size": 8}).settings, 200, false).allowed)

func _test_resolution() -> void:
	var cfg: Dictionary = Settings.validate({}).settings
	var s := _fresh(cfg, [1, 2])
	var r: Dictionary = Match.resolve_card(s, cfg, 1, "trojan_horse", 2, CardDB.cards)
	_check("trojan ok", r.ok)
	_check("trojan 4", s.players[2].hp == int(cfg.starting_hp) - 4)
	_check("unknown rejected", Match.resolve_card(s, cfg, 1, "nope", 2, CardDB.cards).reason == "unknown_card")

	var mcfg: Dictionary = Settings.validate({"starting_resources": 20, "starting_hp": 100, "damage_multiplier": 2.0}).settings
	var ms := _fresh(mcfg, [1, 2])
	Match.resolve_card(ms, mcfg, 1, "zero_day", 2, CardDB.cards)
	_check("dmg mult x2", ms.players[2].hp == 100 - 14)

	var tcfg: Dictionary = Settings.validate({"mode": "teams", "team_size": 1, "friendly_fire": false}).settings
	var ts := _fresh(tcfg, [1, 2])
	ts.players[2].team = ts.players[1].team
	var hp_before: int = ts.players[2].hp
	Match.resolve_card(ts, tcfg, 1, "trojan_horse", 2, CardDB.cards)
	_check("ff blocked", ts.players[2].hp == hp_before)
	tcfg.friendly_fire = true
	Match.resolve_card(ts, tcfg, 1, "trojan_horse", 2, CardDB.cards)
	_check("ff allowed", ts.players[2].hp == hp_before - 4)

	var aoe_state := _fresh(cfg, [1, 2, 3])
	Match.resolve_card(aoe_state, cfg, 1, "syn_flood", -1, CardDB.cards)
	var hp1: int = aoe_state.players[1].hp
	var hp2: int = aoe_state.players[2].hp
	var hp3: int = aoe_state.players[3].hp
	_check("aoe hits both", hp2 == int(cfg.starting_hp) - 3 and hp3 == int(cfg.starting_hp) - 3)
	_check("aoe self untouched", hp1 == int(cfg.starting_hp))

	var low_cfg: Dictionary = Settings.validate({"starting_hp": 3}).settings
	var es := _fresh(low_cfg, [1, 2])
	Match.resolve_card(es, low_cfg, 1, "trojan_horse", 2, CardDB.cards)
	_check("eliminate", not es.players[2].alive)

	var bcfg: Dictionary = Settings.validate({"banned_cards": ["phishing"], "starting_resources": 0}).settings
	var bs := _fresh(bcfg, [1, 2])
	_check("banned", Match.resolve_card(bs, bcfg, 1, "phishing", 2, CardDB.cards).reason == "card_banned")
	_check("no res", Match.resolve_card(bs, bcfg, 1, "trojan_horse", 2, CardDB.cards).reason == "insufficient_resources")

func _test_win_conditions() -> void:
	var cfg: Dictionary = Settings.validate({"points_to_win": 5}).settings
	var s := _fresh(cfg, [1, 2]); s.players[1].score = 5
	_check("ffa score win", Match.check_win(s, cfg) == -1)
	var tcfg: Dictionary = Settings.validate({"mode": "teams", "team_size": 1, "points_to_win": 5}).settings
	var ts := _fresh(tcfg, [1, 2]); ts.players[1].score = 5
	_check("team score win", Match.check_win(ts, tcfg) == 0)
	var e := _fresh(cfg, [1, 2]); e.players[2].alive = false
	_check("elim win", Match.check_win(e, cfg) == -1)

func _test_match_flow() -> void:
	var cfg: Dictionary = Settings.validate({
		"starting_hp": 50, "starting_resources": 5,
		"hand_size": 5, "deck_size": 20, "points_to_win": 99,
	}).settings
	Match.start_match(cfg, [1], 1)
	_check("two players", Match.state.players.size() == 2)
	_check("hand size 5", Match.state.players[1].hand.size() == 5)
	_check("deck size 15", Match.state.players[1].deck.size() == 15)
	_check("active is player 1", Match.active_player == 1)
	_check("player 1 is human", not Match.state.players[1].is_bot)
	_check("player 1000 is bot", Match.state.players[1000].is_bot)

	var playable_idx: int = -1
	for i in Match.state.players[1].hand.size():
		var cid: String = Match.state.players[1].hand[i]
		if int(CardDB.get_card(cid).cost) <= 5:
			playable_idx = i; break
	if playable_idx >= 0:
		var before_hand: int = Match.state.players[1].hand.size()
		var r: Dictionary = Match.play_from_hand(1, playable_idx, 1000)
		_check("hand play ok", r.ok)
		_check("hand shrank", Match.state.players[1].hand.size() == before_hand - 1)
		_check("discard grew", Match.state.players[1].discard.size() >= 1)

	Match.end_turn(1)
	_check("active is bot after end_turn", Match.active_player == 1000)
	_check("bot resources refreshed", int(Match.state.players[1000].resources) == 5)

func _test_draw_per_turn() -> void:
	_check("draw_per_turn default 2", int(Settings.validate({}).settings.draw_per_turn) == 2)
	_check("draw_per_turn clamped low", int(Settings.validate({"draw_per_turn": -5}).settings.draw_per_turn) == 0)
	_check("draw_per_turn clamped high", int(Settings.validate({"draw_per_turn": 999}).settings.draw_per_turn) == 10)

	# Default draw 2: start 3, end with 5
	var cfg2: Dictionary = Settings.validate({
		"starting_hp": 50, "starting_resources": 5, "hand_size": 3,
		"deck_size": 20, "points_to_win": 99, "draw_per_turn": 2,
	}).settings
	Match.start_match(cfg2, [1], 1)
	_check("start hand 3", Match.state.players[1].hand.size() == 3)
	Match.end_turn(1)
	_check("draw 2 -> hand 5", Match.state.players[1].hand.size() == 5)

	# Draw 3
	var cfg3: Dictionary = cfg2.duplicate(true); cfg3.draw_per_turn = 3
	Match.start_match(cfg3, [1], 1)
	Match.end_turn(1)
	_check("draw 3 -> hand 6", Match.state.players[1].hand.size() == 6)

	# Draw 0
	var cfg0: Dictionary = cfg2.duplicate(true); cfg0.draw_per_turn = 0
	Match.start_match(cfg0, [1], 1)
	Match.end_turn(1)
	_check("draw 0 -> hand stays 3", Match.state.players[1].hand.size() == 3)

	# Cap check: start with 7, draw 2, end with 7 (discard 2 then draw 2)
	var cfgcap: Dictionary = Settings.validate({
		"starting_hp": 50, "starting_resources": 5, "hand_size": 7,
		"deck_size": 20, "points_to_win": 99, "draw_per_turn": 2,
	}).settings
	Match.start_match(cfgcap, [1], 1)
	Match.end_turn(1)
	_check("cap 7 with draw 2", Match.state.players[1].hand.size() == 7)

	# Cap check: start with 7, draw 3, end with 7 (discard 3 then draw 3)
	var cfgcap3: Dictionary = cfgcap.duplicate(true); cfgcap3.draw_per_turn = 3
	Match.start_match(cfgcap3, [1], 1)
	Match.end_turn(1)
	_check("cap 7 with draw 3", Match.state.players[1].hand.size() == 7)

func _fresh(cfg: Dictionary, ids: Array) -> Dictionary:
	var s := {"players": {}, "turn": 1, "round": 1, "log": []}
	for i in ids.size():
		var pid: int = ids[i]
		s.players[pid] = {
			"id": pid,
			"hp": int(cfg.starting_hp),
			"score": int(cfg.starting_score),
			"resources": int(cfg.starting_resources),
			"team": LobbyRules.assign_team(i, cfg),
			"alive": true,
			"hand": [], "deck": [], "discard": [], "statuses": {},
		}
	return s
