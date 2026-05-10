#!/bin/bash
# Minimal format-on-save — checks only for Biome (Rust-based, fast).
# All other formatters removed — they don't exist in this project and wasted CPU.
# PostToolUse hook for Edit|Write. Silent on success. Zero tokens on common path.

if ! command -v jq >/dev/null 2>&1; then exit 0; fi

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')
[ -z "$FILE_PATH" ] || [ ! -f "$FILE_PATH" ] && exit 0

EXTENSION="${FILE_PATH##*.}"

# Fast path: only run if biome binary exists
[ -f "$PWD/node_modules/.bin/biome" ] || exit 0

case "$EXTENSION" in
  js|jsx|ts|tsx|json|css)
    npx biome format --write "$FILE_PATH" >/dev/null 2>&1
    ;;
esac

exit 0
