extends Node

const CARD_DIR := "res://data/cards/"
const REQUIRED := ["id", "name", "type", "rarity", "cost", "expansion", "text", "effects", "alt"]

var cards: Dictionary = {}
var by_expansion: Dictionary = {}
var load_errors: Array[String] = []
var _art_cache: Dictionary = {}

func _ready() -> void:
	load_all()

func load_all() -> void:
	cards.clear(); by_expansion.clear(); _art_cache.clear(); load_errors.clear()
	var dir := DirAccess.open(CARD_DIR)
	if dir == null:
		load_errors.append("cannot open %s" % CARD_DIR)
		return
	for f in dir.get_files():
		if f.ends_with(".json"):
			_load_file(CARD_DIR + f)

func _load_file(path: String) -> void:
	var parsed: Variant = JSON.parse_string(FileAccess.get_file_as_string(path))
	if typeof(parsed) != TYPE_ARRAY:
		load_errors.append("%s: root must be an array" % path); return
	for raw in parsed:
		if typeof(raw) != TYPE_DICTIONARY:
			load_errors.append("%s: entry not object" % path); continue
		var c: Dictionary = raw
		var missing: Array[String] = []
		for f in REQUIRED:
			if not c.has(f): missing.append(f)
		if not missing.is_empty():
			load_errors.append("%s: missing [%s]" % [c.get("id", "?"), ", ".join(missing)]); continue
		if cards.has(c.id):
			load_errors.append("dup id %s" % c.id); continue
		cards[c.id] = c
		var exp: String = c.expansion
		if not by_expansion.has(exp): by_expansion[exp] = []
		by_expansion[exp].append(c.id)

func get_card(id: String) -> Dictionary: return cards.get(id, {})

func pool(cfg: Dictionary) -> Array:
	var enabled: Array = cfg.get("enabled_expansions", ["core"])
	var banned: Array = cfg.get("banned_cards", [])
	var out: Array = []
	for id in cards:
		if cards[id].expansion in enabled and not id in banned:
			out.append(id)
	return out

func get_art(id: String) -> Texture2D:
	if _art_cache.has(id): return _art_cache[id]
	var card: Dictionary = cards.get(id, {})
	var path: String = card.get("art", "res://assets/cards/%s.png" % id)
	if ResourceLoader.exists(path):
		var tex: Resource = load(path)
		if tex is Texture2D:
			_art_cache[id] = tex; return tex
	var gen := _generate_placeholder(id)
	_art_cache[id] = gen
	return gen

func _type_color(t: String) -> Color:
	match t:
		"attack": return Color("#ff5566")
		"defense": return Color("#44aaff")
		"asset": return Color("#44dd88")
		"event": return Color("#bb66ff")
		"character": return Color("#ffaa44")
		"mod": return Color("#44eedd")
		_: return Color("#cccccc")

func _type_base_color(t: String) -> Color:
	match t:
		"attack": return Color("#2a1116")
		"defense": return Color("#0e1a2a")
		"asset": return Color("#0e2015")
		"event": return Color("#1f0e2a")
		"character": return Color("#2a1a0e")
		"mod": return Color("#0e2a2a")
		_: return Color("#141820")

func _generate_placeholder(id: String) -> Texture2D:
	var card: Dictionary = cards.get(id, {})
	var card_type: String = card.get("type", "asset")
	var w := 320
	var h := 400
	var img := Image.create(w, h, false, Image.FORMAT_RGBA8)

	var base := _type_base_color(card_type)
	var accent := _type_color(card_type)
	img.fill(base)

	var rng := RandomNumberGenerator.new()
	rng.seed = hash(id)
	for i in 16:
		var cx := rng.randi_range(0, w)
		var cy := rng.randi_range(0, h)
		var r := rng.randi_range(30, 110)
		var col := accent
		col.a = 0.10
		var r2 := r * r
		for y in range(maxi(0, cy - r), mini(h, cy + r + 1)):
			for x in range(maxi(0, cx - r), mini(w, cx + r + 1)):
				var dx := x - cx
				var dy := y - cy
				if dx * dx + dy * dy <= r2:
					img.set_pixel(x, y, img.get_pixel(x, y).lerp(col, 0.4))

	for y in range(0, h, 3):
		for x in w:
			var c := img.get_pixel(x, y)
			c = c.darkened(0.15)
			img.set_pixel(x, y, c)

	for i in 4:
		for x in w:
			img.set_pixel(x, i, accent)
			img.set_pixel(x, h - 1 - i, accent)
		for y in h:
			img.set_pixel(i, y, accent)
			img.set_pixel(w - 1 - i, y, accent)

	return ImageTexture.create_from_image(img)
