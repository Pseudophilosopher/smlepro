#!/bin/bash
# Re-injects critical project rules after context compaction.
# Restores non-negotiable rules so Cline stays aligned after /compact.

find_project_root() {
  local dir="$PWD"
  while [ "$dir" != "/" ]; do
    if [ -f "$dir/package.json" ] || [ -f "$dir/pyproject.toml" ] || [ -f "$dir/Cargo.toml" ] || [ -f "$dir/go.mod" ] || [ -d "$dir/.git" ]; then
      echo "$dir"
      return
    fi
    dir=$(dirname "$dir")
  done
  echo "$PWD"
}

ROOT=$(find_project_root)

CONTEXT=""
BRANCH=$(git branch --show-current 2>/dev/null)
[ -n "$BRANCH" ] && CONTEXT="Branch: $BRANCH"
LAST_COMMIT=$(git log --oneline -1 2>/dev/null)
[ -n "$LAST_COMMIT" ] && CONTEXT="$CONTEXT | Last commit: $LAST_COMMIT"
CHANGES=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
[ "$CHANGES" -gt 0 ] 2>/dev/null && CONTEXT="$CONTEXT | Uncommitted changes: $CHANGES files"

cat <<'RULES'
=== CONTEXT RECOVERED ===

NON-NEGOTIABLE RULES:
1. Use `/compact` at 70K tokens (not 80K) — weak laptop needs headroom.
2. Vanilla JS only — no React, Vue, or frameworks.
3. Firebase v10 modular syntax. Cloud Functions = CommonJS, client = ES modules.
4. Tailwind CSS with glassmorphism (backdrop-blur, border-white/20).
5. Arabic/RTL: logical properties (ms-, pe-), Tajawal font.
6. Content generation: "SCFHS medical exam expert" prompt always.
7. No tests exist — skip test-related hooks.
8. Never exceed 4096 maxTokens except for generation tasks.
RULES

if [ -n "$CONTEXT" ]; then
  echo ""
  echo "Current state: $CONTEXT"
fi

if [ -f "$ROOT/CLAUDE.md" ]; then
  echo ""
  echo "=== CLAUDE.md ==="
  cat "$ROOT/CLAUDE.md"
fi

echo ""
echo "=== END CONTEXT RECOVERY ==="
exit 0
