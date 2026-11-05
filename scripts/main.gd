extends Control

const PORT := 42421

var _root: VBoxContainer
var _log_lines: Array[String] = []
var _players: Array[int] = []
var local_player_id: int = 1
var host_cfg: Dictionary = {}
var _bot_busy: bool = false
var _match_epoch: int = 0

func _ready() -> void:
	host_cfg = Settings.validate(Settings.DEFAULTS).settings
	host_cfg.bot_count = 1  # solo play works out of the box
	Net.lobby_found.connect(_on_lobby_found)
	Net.peer_joined.connect(_on_peer_joined)
	Net.peer_left.connect(_on_peer_left)
	Net.connection_failed.connect(func(r: String) -> void: _push_log("Connection failed: " + r))
	_build_shell()
	_show_menu()
	Match.logged.connect(_push_log)
	Match.match_ended.connect(_on_match_ended)

func _build_shell() -> void:
	var bg := ColorRect.new()
	bg.color = Color("#0b0f14")
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(bg)
	var margin := MarginContainer.new()
	margin.set_anchors_preset(Control.PRESET_FULL_RECT)
	margin.add_theme_constant_override("margin_left", 24)
	margin.add_theme_constant_override("margin_right", 24)
	margin.add_theme_constant_override("margin_top", 20)
	margin.add_theme_constant_override("margin_bottom", 20)
	add_child(margin)
	_root = VBoxContainer.new()
	_root.add_theme_constant_override("separation", 12)
	margin.add_child(_root)

func _clear_root() -> void:
	for c in _root.get_children(): c.queue_free()

func _header(text: String) -> void:
	var l := Label.new(); l.text = text
	l.add_theme_font_size_override("font_size", 28)
	_root.add_child(l)

func _button(text: String, cb: Callable) -> Button:
	var b := Button.new(); b.text = text
	b.custom_minimum_size = Vector2(0, 40)
	b.pressed.connect(cb)
	_root.add_child(b)
	return b

# ---------------------------------------------------------------- Menu

func _show_menu() -> void:
	_clear_root()
	_header("CyberThreat Defender — LAN FFA & Teams")
	_button("Host Game", _show_settings)
	_button("Browse LAN Lobbies", func() -> void:
		_clear_root(); _header("LAN Lobbies"); Net.start_browse()
		_button("Back", _show_menu)
	)
	var row := HBoxContainer.new(); _root.add_child(row)
	var ip := LineEdit.new()
	ip.placeholder_text = "Direct IP (e.g. 192.168.1.20)"
	ip.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_child(ip)
	var j := Button.new(); j.text = "Join"
	j.pressed.connect(func() -> void:
		var err := Net.join(ip.text.strip_edges(), PORT)
		if err != OK: _push_log("Join failed: %s" % err); return
		_show_lobby(false)
	)
	row.add_child(j)

# ---------------------------------------------------------------- Settings

func _show_settings() -> void:
	_clear_root()
	_header("Host Settings")

	var tip := Label.new()
	tip.text = "Tip: set Bot Count to 1+ for solo play."
	tip.add_theme_color_override("font_color", Color("#8899aa"))
	_root.add_child(tip)

	var scroll := ScrollContainer.new()
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	_root.add_child(scroll)
	var form := VBoxContainer.new()
	form.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	form.add_theme_constant_override("separation", 8)
	scroll.add_child(form)

	_add_option(form, "Game Mode", Settings.MODES, host_cfg.mode, func(v): host_cfg.mode = v)
	_add_option(form, "Turn Mode", ["turn_based", "real_time"], host_cfg.turn_mode, func(v): host_cfg.turn_mode = v)
	_add_spin(form, "Points to win", host_cfg.points_to_win, 1, 500, 1, func(v): host_cfg.points_to_win = int(v))
	_add_spin(form, "Starting HP", host_cfg.starting_hp, 1, 500, 1, func(v): host_cfg.starting_hp = int(v))
	_add_spin(form, "Starting Resources", host_cfg.starting_resources, 0, 50, 1, func(v): host_cfg.starting_resources = int(v))
	_add_spin(form, "Hand Size", host_cfg.hand_size, 1, 20, 1, func(v): host_cfg.hand_size = int(v))
	_add_spin(form, "Draw per turn", host_cfg.draw_per_turn, 0, 10, 1, func(v): host_cfg.draw_per_turn = int(v))
	_add_spin(form, "Deck Size", host_cfg.deck_size, 10, 120, 5, func(v): host_cfg.deck_size = int(v))
	_add_spin(form, "Team Size", host_cfg.team_size, 1, 16, 1, func(v): host_cfg.team_size = int(v))
	_add_spin(form, "Bot Count", host_cfg.bot_count, 0, 8, 1, func(v): host_cfg.bot_count = int(v))
	_add_spin(form, "Turn Timer (sec)", int(host_cfg.turn_time_sec), 5, 300, 5, func(v): host_cfg.turn_time_sec = float(v))
	_add_spin(form, "Damage Multiplier", float(host_cfg.damage_multiplier), 0.1, 10.0, 0.1, func(v): host_cfg.damage_multiplier = float(v))
	_add_check(form, "Friendly Fire", host_cfg.friendly_fire, func(v): host_cfg.friendly_fire = v)
	_add_check(form, "Spectators", host_cfg.spectators, func(v): host_cfg.spectators = v)
	_add_check(form, "Late Join", host_cfg.late_join, func(v): host_cfg.late_join = v)

	_button("Host with these settings", func() -> void:
		var v: Dictionary = Settings.validate(host_cfg)
		if not v.ok:
			_push_log("Invalid settings: " + ", ".join(v.errors)); return
		var err := Net.host(PORT, {"name": "LAN Lobby", "port": PORT, "settings": v.settings})
		if err != OK:
			_push_log("Host failed: %s" % err); return
		host_cfg = v.settings
		_players = [1]
		local_player_id = 1
		_show_lobby(true)
	)
	_button("Back", _show_menu)

func _add_option(parent: VBoxContainer, label_text: String, options: Array, current: Variant, setter: Callable) -> void:
	var row := HBoxContainer.new()
	var l := Label.new(); l.text = label_text
	l.custom_minimum_size = Vector2(240, 0)
	row.add_child(l)
	var opt := OptionButton.new()
	opt.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	for o in options: opt.add_item(str(o))
	var idx: int = options.find(current)
	if idx >= 0: opt.selected = idx
	opt.item_selected.connect(func(i: int) -> void: setter.call(options[i]))
	row.add_child(opt)
	parent.add_child(row)

func _add_spin(parent: VBoxContainer, label_text: String, value: Variant, min_v: float, max_v: float, step: float, setter: Callable) -> void:
	var row := HBoxContainer.new()
	var l := Label.new(); l.text = label_text
	l.custom_minimum_size = Vector2(240, 0)
	row.add_child(l)
	var sp := SpinBox.new()
	sp.min_value = min_v
	sp.max_value = max_v
	sp.step = step
	sp.value = float(value)
	sp.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	sp.value_changed.connect(func(v: float) -> void:
		setter.call(int(v) if step >= 1.0 else float(v))
	)
	row.add_child(sp)
	parent.add_child(row)

func _add_check(parent: VBoxContainer, label_text: String, value: bool, setter: Callable) -> void:
	var row := HBoxContainer.new()
	var l := Label.new(); l.text = label_text
	l.custom_minimum_size = Vector2(240, 0)
	row.add_child(l)
	var cb := CheckBox.new()
	cb.button_pressed = value
	cb.toggled.connect(func(v: bool) -> void: setter.call(v))
	row.add_child(cb)
	parent.add_child(row)

# ---------------------------------------------------------------- Lobby

func _show_lobby(hosting: bool) -> void:
	_clear_root()
	_header("Lobby" if hosting else "Waiting for host…")
	var list := ItemList.new()
	list.custom_minimum_size = Vector2(0, 200)
	for pid in _players: list.add_item("Player %d" % pid)
	_root.add_child(list)

	if hosting:
		var s := Label.new()
		s.text = "Mode: %s · Turn: %s · Points: %d · HP: %d · Bots: %d · Hand: %d · Deck: %d" % [
			host_cfg.mode, host_cfg.turn_mode, host_cfg.points_to_win, host_cfg.starting_hp,
			host_cfg.bot_count, host_cfg.hand_size, host_cfg.deck_size
		]
		s.add_theme_font_size_override("font_size", 13)
		s.add_theme_color_override("font_color", Color("#8899aa"))
		_root.add_child(s)
		_button("Start Match", func() -> void:
			_match_epoch += 1
			_bot_busy = false
			Match.start_match(host_cfg, _players, int(host_cfg.bot_count))
			_refresh_table()
		)
		_button("Back to Settings", _show_settings)
	else:
		_button("Start Match (host only)", func() -> void: _push_log("Only host can start."))

	_button("Leave", func() -> void:
		Net.disconnect_all(); _players.clear(); _show_menu()
	)

# ---------------------------------------------------------------- Table

func _show_table() -> void:
	_clear_root()

	var active: int = Match.active_player
	var me_active: bool = (active == local_player_id)
	var title := "Table — YOUR TURN" if me_active else "Table — waiting…"
	_header(title)

	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 12)
	_root.add_child(row)
	for pid in Match.state.players:
		var p: Dictionary = Match.state.players[pid]
		var panel := PanelContainer.new()
		var sb := StyleBoxFlat.new()
		sb.bg_color = Color("#2a4050") if pid == active else Color("#1a2028")
		sb.set_corner_radius_all(6)
		sb.set_content_margin_all(10)
		panel.add_theme_stylebox_override("panel", sb)
		row.add_child(panel)
		var v := VBoxContainer.new()
		panel.add_child(v)

		var name_l := Label.new()
		name_l.text = ("Bot %d" % (pid - 1000 + 1)) if p.is_bot else ("YOU" if pid == local_player_id else "Player %d" % pid)
		name_l.add_theme_font_size_override("font_size", 14)
		v.add_child(name_l)

		var stats := Label.new()
		stats.text = "HP %d · Score %d · Res %d" % [p.hp, p.score, p.resources]
		v.add_child(stats)

		var piles := Label.new()
		piles.text = "Hand %d · Deck %d · Disc %d" % [p.hand.size(), p.deck.size(), p.discard.size()]
		piles.add_theme_font_size_override("font_size", 11)
		piles.add_theme_color_override("font_color", Color("#8899aa"))
		v.add_child(piles)

	var hint := Label.new()
	hint.text = "Your hand — click a card to play it." if me_active else "Waiting for opponent…"
	hint.add_theme_color_override("font_color", Color("#8899aa"))
	_root.add_child(hint)

	var hand := HBoxContainer.new()
	hand.add_theme_constant_override("separation", 8)
	_root.add_child(hand)

	if Match.state.players.has(local_player_id):
		var my_hand: Array = Match.state.players[local_player_id].hand
		if my_hand.is_empty():
			var empty := Label.new()
			empty.text = "Empty hand — end turn to draw."
			empty.add_theme_color_override("font_color", Color("#666"))
			hand.add_child(empty)
		else:
			for i in my_hand.size():
				hand.add_child(_make_card_button(i, my_hand[i], me_active))

	var end_btn := Button.new()
	end_btn.text = "End Turn"
	end_btn.disabled = not me_active
	end_btn.custom_minimum_size = Vector2(0, 40)
	end_btn.pressed.connect(func() -> void:
		var r: Dictionary = Match.end_turn(local_player_id)
		_push_log("end_turn -> " + ("OK" if r.ok else "FAIL: " + str(r.reason)))
		_refresh_table()
	)
	_root.add_child(end_btn)

	var log_label := Label.new()
	var tail: Array = _log_lines.slice(max(0, _log_lines.size() - 8))
	log_label.text = "\n".join(tail)
	log_label.add_theme_font_size_override("font_size", 11)
	log_label.add_theme_color_override("font_color", Color("#8899aa"))
	_root.add_child(log_label)

func _make_card_button(hand_index: int, card_id: String, can_play: bool) -> Button:
	var card := CardDB.get_card(card_id)
	var my_res: int = int(Match.state.players[local_player_id].resources) if Match.state.players.has(local_player_id) else 0
	var affordable := int(card.cost) <= my_res
	var enabled := can_play and affordable
	var type_col := _type_color(card.type)

	var b := Button.new()
	b.custom_minimum_size = Vector2(170, 260)
	b.disabled = not enabled
	b.focus_mode = Control.FOCUS_NONE
	b.tooltip_text = "%s\n\n%s\n\nRarity: %s" % [card.name, card.text, card.rarity]
	b.pressed.connect(func() -> void: _try_play(hand_index))
	b.add_theme_stylebox_override("normal", _card_style(Color("#1a2030"), type_col))
	b.add_theme_stylebox_override("hover", _card_style(Color("#2a3040"), type_col))
	b.add_theme_stylebox_override("pressed", _card_style(Color("#0f1520"), type_col))
	b.add_theme_stylebox_override("disabled", _card_style(Color("#12161c"), type_col.darkened(0.6)))

	var v := VBoxContainer.new()
	v.set_anchors_preset(Control.PRESET_FULL_RECT)
	v.offset_left = 6; v.offset_top = 6; v.offset_right = -6; v.offset_bottom = -6
	v.add_theme_constant_override("separation", 3)
	v.mouse_filter = Control.MOUSE_FILTER_IGNORE
	b.add_child(v)

	var top := HBoxContainer.new()
	top.mouse_filter = Control.MOUSE_FILTER_IGNORE
	v.add_child(top)
	var name_l := Label.new()
	name_l.text = card.name
	name_l.add_theme_font_size_override("font_size", 13)
	name_l.add_theme_color_override("font_color", Color("#f0f0f0"))
	name_l.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	name_l.clip_text = true
	name_l.mouse_filter = Control.MOUSE_FILTER_IGNORE
	top.add_child(name_l)
	var cost_l := Label.new()
	cost_l.text = str(int(card.cost))
	cost_l.add_theme_font_size_override("font_size", 18)
	cost_l.add_theme_color_override("font_color", Color("#ffd54a"))
	cost_l.mouse_filter = Control.MOUSE_FILTER_IGNORE
	top.add_child(cost_l)

	var art := TextureRect.new()
	art.texture = CardDB.get_art(card_id)
	art.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	art.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
	art.custom_minimum_size = Vector2(0, 110)
	art.mouse_filter = Control.MOUSE_FILTER_IGNORE
	v.add_child(art)

	var type_l := Label.new()
	type_l.text = card.type.to_upper() + " · " + card.rarity
	type_l.add_theme_font_size_override("font_size", 10)
	type_l.add_theme_color_override("font_color", type_col)
	type_l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	type_l.mouse_filter = Control.MOUSE_FILTER_IGNORE
	v.add_child(type_l)

	var text_l := Label.new()
	text_l.text = card.text
	text_l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	text_l.add_theme_font_size_override("font_size", 11)
	text_l.add_theme_color_override("font_color", Color("#d0d0d0"))
	text_l.size_flags_vertical = Control.SIZE_EXPAND_FILL
	text_l.mouse_filter = Control.MOUSE_FILTER_IGNORE
	v.add_child(text_l)

	return b

func _card_style(bg: Color, border: Color) -> StyleBoxFlat:
	var s := StyleBoxFlat.new()
	s.bg_color = bg
	s.border_color = border
	s.set_border_width_all(2)
	s.set_corner_radius_all(8)
	s.set_content_margin_all(4)
	return s

func _type_color(t: String) -> Color:
	match t:
		"attack": return Color("#ff5566")
		"defense": return Color("#44aaff")
		"asset": return Color("#44dd88")
		"event": return Color("#bb66ff")
		"character": return Color("#ffaa44")
		"mod": return Color("#44eedd")
		_: return Color("#cccccc")

func _refresh_table() -> void:
	_show_table()
	_maybe_trigger_bot()

func _try_play(hand_index: int) -> void:
	if Match.active_player != local_player_id: return
	var target := -1
	for pid in Match.state.players:
		if pid != local_player_id: target = pid; break
	var r: Dictionary = Match.play_from_hand(local_player_id, hand_index, target)
	var status: String = "OK" if r.ok else "FAIL: " + str(r.reason)
	_push_log("play hand[%d] -> %s" % [hand_index, status])
	_refresh_table()

# ---------------------------------------------------------------- Bots

func _maybe_trigger_bot() -> void:
	if _bot_busy: return
	if not Match.state.has("players"): return
	if not Match.state.players.has(Match.active_player): return
	if not Match.state.players[Match.active_player].is_bot: return
	_bot_busy = true
	_run_bot_turn()

func _run_bot_turn() -> void:
	var epoch: int = _match_epoch
	await get_tree().create_timer(0.8).timeout
	if _match_epoch != epoch: _bot_busy = false; return
	if not Match.state.players.has(Match.active_player): _bot_busy = false; return
	var bot_id: int = Match.active_player
	var bot: Dictionary = Match.state.players[bot_id]
	if not bot.is_bot: _bot_busy = false; return

	var playable: Array = []
	for i in bot.hand.size():
		var c: Dictionary = CardDB.get_card(bot.hand[i])
		if int(c.cost) <= int(bot.resources):
			playable.append(i)
	if not playable.is_empty():
		var idx: int = playable[randi() % playable.size()]
		var target := -1
		for pid in Match.state.players:
			if pid != bot_id: target = pid; break
		Match.play_from_hand(bot_id, idx, target)
		_show_table()
		await get_tree().create_timer(0.8).timeout
		if _match_epoch != epoch: _bot_busy = false; return

	if Match.state.players.has(bot_id):
		Match.end_turn(bot_id)
		_show_table()

	_bot_busy = false
	_maybe_trigger_bot()

# ---------------------------------------------------------------- Events

func _on_match_ended(winner_team: int, winner_players: Array) -> void:
	_bot_busy = false
	_clear_root()
	_header("Match Ended")
	var l := Label.new()
	var who: String = "Team %d" % winner_team if winner_team != -1 else "Player %s" % str(winner_players)
	l.text = "Winner: " + who
	l.add_theme_font_size_override("font_size", 20)
	_root.add_child(l)
	_button("Back to Menu", _show_menu)

func _on_lobby_found(info: Dictionary) -> void:
	_push_log("Found lobby at %s" % info.get("ip", "?"))
func _on_peer_joined(id: int) -> void:
	_players.append(id); _push_log("Peer joined: %d" % id)
func _on_peer_left(id: int) -> void:
	_players.erase(id); _push_log("Peer left: %d" % id)
func _push_log(line: String) -> void:
	_log_lines.append(line); print("[CTD] ", line)
