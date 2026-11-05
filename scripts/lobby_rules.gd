extends RefCounted
## Pure, side-effect-free rules. Unit-testable without networking.

static func assign_team(index: int, cfg: Dictionary) -> int:
	if cfg.get("mode", "ffa") != "teams":
		return -1
	var ts: int = maxi(1, int(cfg.get("team_size", 2)))
	return index / ts

static func evaluate_join(cfg: Dictionary, player_count: int, is_spectator: bool) -> Dictionary:
	if is_spectator and not cfg.get("spectators", true):
		return {"allowed": false, "reason": "spectators_disabled"}
	if not is_spectator and player_count > 0 and not cfg.get("late_join", true):
		return {"allowed": false, "reason": "late_join_disabled"}
	return {"allowed": true, "reason": ""}

static func can_play_card(player: Dictionary, card: Dictionary, cfg: Dictionary) -> Dictionary:
	if not player.get("alive", true):
		return {"ok": false, "reason": "eliminated"}
	if card.get("id", "") in cfg.get("banned_cards", []):
		return {"ok": false, "reason": "card_banned"}
	if int(card.get("cost", 0)) > int(player.get("resources", 0)):
		return {"ok": false, "reason": "insufficient_resources"}
	return {"ok": true, "reason": ""}
