# Claude Code Performance Tips for Weak Laptops

- Use /compact to reduce context when it gets long
- Prefer local voice transcription (e.g., superwhisper) over cloud services
- Run heavy tasks in containers: docker run --rm -v $(pwd):/workspace node:18 npm run build
- Disable auto-updates: add 'DISABLE_AUTOUPDATER': '1' to settings.json
- Use plan mode (Shift+Tab) to break down tasks instead of long conversations
- For very heavy tasks, consider Jules (jules.google) - cloud-based autonomous coding
