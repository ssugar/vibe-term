# Milestones

## Archived Milestones

### v1.3: Hook Management & Distribution (2026-01-30 — 2026-02-02)

**Goal:** Make vibe-term easy to install and self-managing for Claude hooks

**What shipped:**
- `vibe-term setup` command — install global hooks with automatic backup
- `vibe-term audit` command — scan projects for hook conflicts
- `vibe-term fix` command — intelligently merge hooks preserving project configs
- JSON output mode (`--json`) for all commands enabling scripting
- npm global install (`npm install -g vibe-term`) with 28.4 kB package
- Comprehensive README with installation, commands, and troubleshooting

**Phases completed:** 6 (11 plans total)
**npm package:** v1.3.0

**Key decisions:**
- ~/.vibe-term/ for persistent hooks script storage
- Preview/Apply pattern with dry-run by default
- Intelligent hook merging (add alongside existing, don't clobber)

**Archived:** 2026-02-02

---

### v1.2: Integrated Claude Terminal (2026-01-25 — 2026-01-30)

**Goal:** Transform standalone HUD into tmux-integrated terminal

**What shipped:**
- Horizontal HUD strip with session tabs (1-2 lines)
- tmux split pane architecture (HUD top, sessions bottom)
- Native tmux session switching with Enter key
- Return to HUD with Ctrl+h from any pane
- Spawn new sessions with `n` key and directory picker
- External tmux session detection
- Dead session cleanup

**Phases completed:** 5 (13 plans total)

**Key decisions:**
- tmux splits over embedded terminal (native reliability)
- Minimal HUD strip to maximize session space

**Archived:** 2026-01-30

---

### v1.1: Standalone HUD (2026-01-22 — 2026-01-25)

**Goal:** Terminal-based HUD for monitoring multiple Claude Code instances (Initial release)

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

*Last updated: 2026-02-02*
