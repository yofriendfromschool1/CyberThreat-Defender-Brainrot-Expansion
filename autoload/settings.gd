extends Node
## Host settings schema. Single source of truth for defaults + validation.

const DEFAULTS := {
	"mode": "ffa",
	"turn_mode": "turn_based",
	"turn_time_sec": 45.0,
	"round_time_sec": 0.0,
	"points_to_win": 30,
	"starting_score": 0,
	"starting_resources": 5,
	"starting_hp": 20,
	"hand_size": 7,
	"deck_size": 40,
	"draw_per_turn": 2,
	"card_pool": "all",
	"enabled_expansions": ["core", "brainrot"],
	"banned_cards": [],
	"lose_condition": "points_or_hp",
	"score_limit": 30,
	"team_size": 2,
	"friendly_fire": false,
	"targeting_rules": "default",
	"respawn": "off",
	"sudden_death_trigger": "round_limit",
	"damage_multiplier": 1.0,
	"bot_count": 0,
	"bot_difficulty": "normal",
	"spectators": true,
	"late_join": true,
	"round_limit": 20,
	"win_formula": "",
	"lose_formula": "",
}

const MODES := ["ffa", "teams", "coop", "draft", "sealed", "elimination",
	"score_attack", "koth", "sudden_death", "custom"]

func validate(input: Dictionary) -> Dictionary:
	var out: Dictionary = DEFAULTS.duplicate(true)
	for k in input:
		out[k] = input[k]

	var errors: Array[String] = []

	if not out.mode in MODES:
		errors.append("unknown mode: %s" % out.mode)
		out.mode = "ffa"
	if not out.turn_mode in ["turn_based", "real_time"]:
		errors.append("unknown turn_mode")
		out.turn_mode = "turn_based"

	out.starting_hp = maxi(1, int(out.starting_hp))
	out.starting_resources = maxi(0, int(out.starting_resources))
	out.starting_score = maxi(0, int(out.starting_score))
	out.points_to_win = maxi(1, int(out.points_to_win))
	out.score_limit = maxi(1, int(out.score_limit))
	out.hand_size = clampi(int(out.hand_size), 1, 30)
	out.deck_size = maxi(int(out.hand_size), int(out.deck_size))
	out.draw_per_turn = clampi(int(out.draw_per_turn), 0, 10)
	out.team_size = clampi(int(out.team_size), 1, 64)
	out.round_limit = maxi(0, int(out.round_limit))
	out.bot_count = clampi(int(out.bot_count), 0, 256)
	out.damage_multiplier = clampf(float(out.damage_multiplier), 0.1, 10.0)
	out.turn_time_sec = maxf(1.0, float(out.turn_time_sec))

	if typeof(out.banned_cards) != TYPE_ARRAY:
		out.banned_cards = []
	if typeof(out.enabled_expansions) != TYPE_ARRAY:
		out.enabled_expansions = ["core"]

	return {"ok": errors.is_empty(), "settings": out, "errors": errors}
