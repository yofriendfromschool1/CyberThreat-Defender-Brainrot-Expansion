extends Node
## Authoritative match state. Host owns this.

signal state_changed
signal logged(line: String)
signal turn_changed(active_id: int)
signal match_ended(winner_team: int, winner_players: Array)

const LobbyRules = preload("res://scripts/lobby_rules.gd")

var cfg: Dictionary = {}
var state: Dictionary = {}
var active_player: int = 0
var _rng: RandomNumberGenerator = RandomNumberGenerator.new()
var _ended: bool = false

func start_match(p_cfg: Dictionary, player_ids: Array, bots: int = 0) -> void:
	cfg = p_cfg.duplicate(true)
	_ended = false
	_rng = RandomNumberGenerator.new()
	_rng.seed = randi()

	var pool: Array = CardDB.pool(cfg)
	if pool.is_empty():
		push_error("card pool empty"); return

	var all_ids: Array = player_ids.duplicate()
	for i in bots:
		all_ids.append(1000 + i)

	state = {"players": {}, "log": [], "turn": 1, "round": 1, "active": all_ids[0]}

	var hand_size: int = int(cfg.hand_size)
	var deck_size: int = int(cfg.deck_size)
	var bot_start_idx: int = player_ids.size()

	for i in all_ids.size():
		var pid: int = all_ids[i]
		var deck: Array = []
		for _j in deck_size:
			deck.append(pool[_rng.randi() % pool.size()])
		_shuffle(deck)

		var hand: Array = []
		for _j in hand_size:
			if deck.is_empty(): break
			hand.append(deck.pop_back())

		state.players[pid] = {
			"id": pid,
			"hp": int(cfg.starting_hp),
			"score": int(cfg.starting_score),
			"resources": int(cfg.starting_resources),
			"team": LobbyRules.assign_team(i, cfg),
			"alive": true,
			"hand": hand,
			"deck": deck,
			"discard": [],
			"statuses": {},
			"is_bot": i >= bot_start_idx,
		}

	active_player = all_ids[0]
	state.active = active_player
	state_changed.emit()

func _shuffle(arr: Array) -> void:
	for i in range(arr.size() - 1, 0, -1):
		var j: int = _rng.randi() % (i + 1)
		var tmp: Variant = arr[i]
		arr[i] = arr[j]
		arr[j] = tmp

func play_from_hand(actor_id: int, hand_index: int, target_id: int) -> Dictionary:
	if _ended: return {"ok": false, "reason": "match_ended"}
	if actor_id != active_player: return {"ok": false, "reason": "not_your_turn"}
	if not state.players.has(actor_id): return {"ok": false, "reason": "unknown_actor"}
	var p: Dictionary = state.players[actor_id]
	if hand_index < 0 or hand_index >= p.hand.size(): return {"ok": false, "reason": "bad_index"}

	var card_id: String = p.hand[hand_index]
	var r: Dictionary = resolve_card(state, cfg, actor_id, card_id, target_id, CardDB.cards)
	if r.ok:
		p.resources -= int(CardDB.get_card(card_id).cost)
		p.hand.remove_at(hand_index)
		p.discard.append(card_id)
		var line: String = "%s played %s" % [actor_id, card_id]
		state.log.append(line)
		logged.emit(line)
		state_changed.emit()
		_check_end()
	return r

func end_turn(actor_id: int) -> Dictionary:
	if _ended: return {"ok": false, "reason": "match_ended"}
	if actor_id != active_player: return {"ok": false, "reason": "not_your_turn"}
	var line: String = "Player %d ends turn" % actor_id
	logged.emit(line)

	# Draw a host-configurable number of cards at end of turn; hand cap 7.
	var draw_n: int = max(0, int(cfg.get("draw_per_turn", 2)))
	var keep_cap: int = max(0, 7 - draw_n)
	var p_end: Dictionary = state.players[actor_id]
	while p_end.hand.size() > keep_cap:
		# discard a random card (real game: player chooses; bot/AI simplification)
		var di: int = _rng.randi() % p_end.hand.size()
		p_end.discard.append(p_end.hand[di])
		p_end.hand.remove_at(di)
	_draw(actor_id, draw_n)

	_advance_turn()
	return {"ok": true, "reason": ""}

func _advance_turn() -> void:
	var ids: Array = state.players.keys()
	ids.sort()
	var idx: int = ids.find(active_player)
	if idx == -1: return

	var next_idx: int = (idx + 1) % ids.size()
	var loops: int = 0
	while loops < ids.size() and not state.players[ids[next_idx]].alive:
		next_idx = (next_idx + 1) % ids.size()
		loops += 1
	if loops >= ids.size(): return

	if next_idx <= idx:
		state.turn += 1
		state.round += 1

	active_player = ids[next_idx]
	state.active = active_player

	var p: Dictionary = state.players[active_player]
	p.resources = int(cfg.starting_resources)
	# Official CIAS rule: draw happens at END of turn, not start.
	# (draw call moved to end_turn)

	turn_changed.emit(active_player)
	state_changed.emit()
	_check_end()

func _draw(pid: int, count: int) -> void:
	var p: Dictionary = state.players[pid]
	for _i in count:
		if p.hand.size() >= 7:
			return
		if p.deck.is_empty():
			if p.discard.is_empty(): return
			p.deck = p.discard.duplicate()
			p.discard.clear()
			_shuffle(p.deck)
		p.hand.append(p.deck.pop_back())

func _check_end() -> void:
	if _ended: return

	for pid in state.players:
		var p: Dictionary = state.players[pid]
		if int(p.score) >= int(cfg.points_to_win):
			_ended = true
			var team: int = int(p.team)
			var winners: Array = []
			if team == -1:
				winners.append(pid)
			else:
				for q in state.players:
					if int(state.players[q].team) == team and state.players[q].alive:
						winners.append(q)
			logged.emit("MATCH ENDED — score threshold reached")
			match_ended.emit(team, winners)
			return

	var alive_groups := {}
	for pid in state.players:
		if state.players[pid].alive:
			var t: int = int(state.players[pid].team)
			var key: String = "team_%d" % t if t != -1 else "player_%d" % pid
			if not alive_groups.has(key): alive_groups[key] = []
			alive_groups[key].append(pid)
	if alive_groups.size() == 1:
		_ended = true
		var winners2: Array = alive_groups.values()[0]
		var team2: int = int(state.players[winners2[0]].team)
		logged.emit("MATCH ENDED — last side standing")
		match_ended.emit(team2, winners2)
		return

# ---------------------------------------------------------------- Pure rules

static func resolve_card(s: Dictionary, c: Dictionary, actor_id: int,
		card_id: String, chosen_id: int, db: Dictionary) -> Dictionary:
	var result := {"ok": false, "reason": "", "events": []}
	if not db.has(card_id): result.reason = "unknown_card"; return result
	if not s.players.has(actor_id): result.reason = "unknown_actor"; return result
	var actor: Dictionary = s.players[actor_id]
	var card: Dictionary = db[card_id]
	var playability := LobbyRules.can_play_card(actor, card, c)
	if not playability.ok: result.reason = playability.reason; return result

	for eff in card.effects:
		var op: String = eff.get("op", "no_op")
		var amount: int = int(eff.get("amount", 0))
		var targets: Array = _effect_targets(s, actor_id, chosen_id, eff.get("target", "chosen"))
		for tid in targets:
			if not s.players.has(tid): continue
			var tgt: Dictionary = s.players[tid]
			match op:
				"damage":
					var friendly: bool = (tid != actor_id and tgt.team == actor.team and tgt.team != -1)
					if friendly and not c.get("friendly_fire", false):
						result.events.append({"type":"blocked","reason":"friendly_fire","target":tid}); continue
					var dmg: int = int(round(amount * float(c.get("damage_multiplier", 1.0))))
					tgt.hp = int(tgt.hp) - dmg
					result.events.append({"type":"damage","target":tid,"amount":dmg})
					if int(tgt.hp) <= 0:
						tgt.alive = false
						result.events.append({"type":"eliminated","target":tid})
				"heal":
					tgt.hp = int(tgt.hp) + amount
					result.events.append({"type":"heal","target":tid,"amount":amount})
				"gain_score":
					tgt.score = int(tgt.score) + amount
					result.events.append({"type":"score","target":tid,"amount":amount})
				"gain_resources":
					tgt.resources = int(tgt.resources) + amount
					result.events.append({"type":"resources","target":tid,"amount":amount})
				"draw":
					result.events.append({"type":"draw","target":tid,"amount":amount})
				"apply_status":
					var st: String = eff.get("status", "generic")
					tgt.statuses[st] = int(tgt.statuses.get(st, 0)) + int(eff.get("stacks", 1))
					result.events.append({"type":"status","target":tid,"status":st})
				"discard":
					result.events.append({"type":"discard","target":tid,"amount":amount})
				"no_op":
					pass
	result.ok = true
	return result

static func _effect_targets(s: Dictionary, actor_id: int, chosen_id: int, t: String) -> Array:
	var out: Array = []
	match t:
		"self": out.append(actor_id)
		"chosen", "enemy_player", "any_player":
			if chosen_id != -1: out.append(chosen_id)
		"all_enemies":
			var team: int = s.players[actor_id].team
			for pid in s.players:
				if pid != actor_id and (team == -1 or s.players[pid].team != team):
					out.append(pid)
		"all_allies":
			var team2: int = s.players[actor_id].team
			for pid in s.players:
				if pid != actor_id and team2 != -1 and s.players[pid].team == team2:
					out.append(pid)
		"all": out = s.players.keys()
	return out

static func check_win(s: Dictionary, c: Dictionary) -> int:
	for pid in s.players:
		if int(s.players[pid].score) >= int(c.get("points_to_win", 30)):
			return int(s.players[pid].team)
	var alive_teams := {}
	for pid in s.players:
		if s.players[pid].alive: alive_teams[int(s.players[pid].team)] = true
	if alive_teams.size() == 1: return alive_teams.keys()[0]
	return -1
