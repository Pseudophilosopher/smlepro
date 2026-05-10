# Claude Code Settings

This project uses dotclaude's lean configuration with SMLE Pro customizations.

## Hooks

| Hook | Type | What it does |
|------|------|-------------|
| `protect-files.sh` | PreToolUse (Edit/Write) | Blocks edits to .env, secrets, build artifacts |
| `warn-large-files.sh` | PreToolUse (Edit/Write) | Blocks writes to node_modules, dist, binaries |
| `scan-secrets.sh` | PreToolUse (Edit/Write) | Detects API keys, tokens, credentials in content |
| `block-dangerous-commands.sh` | PreToolUse (Bash) | Blocks push to main, force push, rm -rf, DROP TABLE |
| `format-on-save.sh` | PostToolUse (Edit/Write) | Auto-formats code (Prettier, Ruff, Black, etc.) |
| `auto-test.sh` | PostToolUse (Edit/Write) | Runs matching test file after edits |
| `session-start.sh` | SessionStart | Injects branch/file state at session start |
| `context-recovery.sh` | PostToolUse (compact) | Re-injects critical rules after context compaction |
| `notify.sh` | Notification | Desktop notification when Claude needs attention |

## Agents

| Agent | Use |
|-------|-----|
| `@code-reviewer` | Code quality, correctness, maintainability |
| `@security-reviewer` | Security vulnerabilities |
| `@frontend-designer` | UI design (glassmorphism, RTL, Tailwind) |

## Skills (Slash Commands)

| Command | Description |
|---------|------------|
| `/debug-fix` | Find and fix a bug (add `--fast` for hotfix mode) |
| `/ship` | Commit, push, create PR with confirmations |
| `/pr-review` | PR review via specialist agents |
| `/tdd` | Strict red-green-refactor TDD loop |
| `/explain` | Explain code with mental model + diagram |
| `/refactor` | Safe refactoring with test safety net |
| `/context-budget` | Estimate token cost of .claude/ + CLAUDE.md |

## Weak Laptop Optimizations

- `DISABLE_AUTOUPDATER`: 1 (prevents background updates)
- All hooks exit fast (no formatter → 0 tokens)
- auto-test.sh skips non-testable files
- session-start.sh emits ~5-10 tokens (minimal mode)
