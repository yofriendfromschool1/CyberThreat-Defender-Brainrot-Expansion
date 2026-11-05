#!/usr/bin/env bash
set -euo pipefail
GODOT="${GODOT:-godot}"
mkdir -p build
echo "== Tests =="
"$GODOT" --headless res://tests/TestRunner.tscn
echo "== Linux =="
"$GODOT" --headless --export-release "Linux/X11" build/ctd-linux.x86_64
echo "== Windows =="
"$GODOT" --headless --export-release "Windows Desktop" build/ctd-windows.exe
echo "== macOS =="
"$GODOT" --headless --export-release "macOS" build/ctd-macos.zip
echo "Done. Artifacts in ./build"
