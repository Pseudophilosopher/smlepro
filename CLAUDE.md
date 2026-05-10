# SMLE Pro - Medical Education Platform

> This is the **Cursor IDE** CLAUDE.md. For Claude Code (terminal) instructions, see [.claude/CLAUDE.md](.claude/CLAUDE.md).

## Core Stack
- Vanilla JavaScript (ES6+ modules)
- Tailwind CSS (v3+)
- Firebase v10 (Auth, Firestore, Cloud Functions, Hosting)
- Vite (dev server only, no build step for production)

## Project Structure
```
/src          # JS modules (app.js, quiz.js, etc.)
/public       # Static assets, HTML pages
/functions    # Firebase Cloud Functions
/scripts      # Deployment and maintenance scripts
/docs         # Documentation
.claude/      # Claude Code configuration (hooks, rules, agents, skills)
```

## Key Principles
1. **Problem-first** - Frame the user problem before coding
2. **Minimum viable change** - Smallest version that tests the hypothesis
3. **Named tradeoffs** - Document value, cost, risk, alternatives
4. **Done = outcome, not output** - Ship instrumentation with every feature
5. **Medical content accuracy** - Every answer must be clinically correct

## Performance (Weak Laptop Tips)
- Use `/compact` when context gets long to free tokens
- Prefer local voice transcription (superwhisper, MacWhisper) over cloud
- For heavy tasks: `docker run --rm -v $(pwd):/workspace node:18 npm run build`
- Consider [Jules](https://jules.google/) for cloud-based autonomous coding on heavy work
- Use `npx` only when needed (cached locally after first use)
- Run `npm run dev` with Vite (fast HMR, even on low-end hardware)

## Quick Commands
```bash
npm run dev        # Start Vite dev server
npm run build      # Build for production
npm run deploy     # Deploy to Firebase
npm run preview    # Preview production build
```

## RTL / Arabic Support
- Use logical properties (ms-, pe-, start, end) over physical (ml-, pr-, left, right)
- Font stack: 'Tajawal', 'Noto Sans Arabic', sans-serif
- Set `dir="auto"` or explicit `dir` attributes on text containers

## Agents & Skills (dotclaude)
This project uses the **dotclaude** configuration system. Available via `@agent-name`:
- `@code-reviewer` - Code quality & correctness review
- `@security-reviewer` - Security vulnerability scanning
- `@frontend-designer` - UI design with glassmorphism / Tailwind
- `@doc-reviewer` - Documentation accuracy checks
- `@performance-reviewer` - Performance bottleneck detection

Slash commands: `/debug-fix`, `/ship`, `/pr-review`, `/tdd`, `/explain`, `/refactor`, `/context-budget`
