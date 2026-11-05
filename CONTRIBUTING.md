
Contributing
Dev setup
Godot 4.3+ (standard)

godot --editor project.godot

godot --headless res://tests/TestRunner.tscn before every PR

Architecture rules
Rules live in pure static functions: (state, config, ...) -> Dictionary

No Node, networking, or UI access inside rules

autoload/match.gd is authoritative; clients never mutate it

UI calls Match.play(...) / RPCs only — never computes outcomes

PR process
Branch from main: feat/<name> or fix/<name>

All tests pass; new behavior ships with tests

New cards need a JSON entry with all required fields, including alt

One reviewer. Squash merge.

Testing map
Card effects → test_runner.gd::_test_resolution

Lobby / teams / join → _test_lobby_rules

Settings clamps → _test_settings

New op types require a matching test

Asset workflow
Add card JSON to data/cards/<expansion>.json

Drop art at assets/cards/<id>.png (512×716, PNG)

No art = deterministic procedural fallback (still loads)

Never commit art you lack the right to distribute

Update README.md credits
