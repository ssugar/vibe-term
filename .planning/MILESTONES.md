# Milestones

## Archived Milestones

### v1.0: Standalone HUD (2026-01-22 — 2026-01-25)

**Goal:** Terminal-based HUD for monitoring multiple Claude Code instances

**What shipped:**
- Session detection (tmux + non-tmux processes)
- Status indicators (Working/Idle/Blocked via hooks)
- Context window usage with stoplight colors
- Keyboard navigation (j/k, arrow keys, 1-9 hotkeys)
- Jump to tmux sessions with Enter key
- Cross-platform support (Linux, macOS, WSL2)
- Window focus for non-tmux sessions (best-effort)

**Phases completed:** 6 (15 plans total)

**Known limitations:**
- Non-tmux session jumping only focuses app, not specific tab
- No reliable "return to HUD" after jumping
- Full-screen HUD obscures Claude sessions while monitoring

**Archived:** 2026-01-25

---

*Last updated: 2026-01-25*
