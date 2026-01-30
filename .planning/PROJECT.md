# Claude Code TUI HUD

## What This Is

A tmux-integrated terminal multiplexer for managing multiple Claude Code sessions. Features an always-visible HUD strip at the top showing all sessions as horizontal tabs with status and context usage, while the main area displays the active Claude session. One keypress switches between sessions, and the HUD is always visible while working.

## Core Value

Never miss a blocked Claude. See everything at a glance, get to any Claude in one keypress — reliably.

## Current Milestone: v3.0 Hook Management & Distribution

**Goal:** Make vibe-term easy to install and self-managing for Claude hooks

**Target features:**
- Discover all Claude projects from `~/.claude/projects/`
- Global hook setup with automatic backup
- Audit projects for conflicting hook settings
- Intelligent hook merging (preserve project hooks, add vibe-term)
- npm global install support (`npm install -g vibe-term`)

## Requirements

### Validated

*Shipped in v1.0:*

- ✓ Detect all running Claude Code instances — v1.0
- ✓ Show working vs idle vs blocked status — v1.0
- ✓ Display context window usage with stoplight colors — v1.0
- ✓ Keyboard navigation (j/k, 1-9 hotkeys) — v1.0
- ✓ Cross-platform support (Linux, macOS, WSL2) — v1.0
- ✓ Status detection via hooks — v1.0
- ✓ Project/directory identification — v1.0
- ✓ Real-time status refresh — v1.0

*Shipped in v2.0:*

- ✓ Horizontal HUD strip with session tabs — v2.0
- ✓ tmux split pane architecture — v2.0
- ✓ Reliable session switching (native tmux) — v2.0
- ✓ Return to HUD with Ctrl+h key — v2.0
- ✓ Spawn new sessions from HUD (`n` key) — v2.0
- ✓ Detect externally-created tmux sessions — v2.0
- ✓ Minimal tab format with status and context — v2.0

### Active

*v3.0 scope:*

- [ ] Discover Claude projects from ~/.claude/projects/
- [ ] ~/.vibe-term/ directory for hooks script and config
- [ ] Global hook setup command with backup
- [ ] Audit projects for conflicting settings
- [ ] Fix/merge conflicting hooks with backup
- [ ] npm global install packaging
- [ ] CLI commands for hook management (setup, audit, fix)
- [ ] Update GitHub README with installation and usage docs

### Out of Scope

- Embedded terminal (node-pty) — Using tmux splits instead, proven reliability
- Native Windows support — WSL2 is primary
- Non-tmux session management — tmux-integrated by design
- Session preview pane — Defer to v4
- Cost/token tracking — Defer to v4
- Multi-machine monitoring — Massive complexity
- GUI installer — CLI-first for developer audience

## Context

**Evolution through v2.0:**
- v1.0 standalone HUD → v2.0 tmux-integrated terminal
- Core UX is solid: HUD strip, session tabs, one-keypress switching
- Status tracking relies on hooks configured in Claude settings

**v3.0 focus — adoption friction:**
- Users must manually configure hooks for status tracking to work
- Project-level `.claude/settings.json` can conflict with global hooks
- No easy install path (`npm install -g` not supported yet)
- Hook script location tied to dev environment, not portable

**Technical approach:**
- Add CLI commands: `vibe-term setup`, `vibe-term audit`, `vibe-term fix`
- `~/.vibe-term/` as persistent home for hooks script and future config
- Project discovery via `~/.claude/projects/` directory structure
- Intelligent hook merging preserves project hooks while adding vibe-term's

## Constraints

- **Tech stack**: Ink (React TUI) — evolving existing codebase
- **Architecture**: tmux split panes — HUD top, sessions bottom
- **Platform**: Must work on Linux, macOS, WSL2 (all have tmux)
- **UX**: HUD strip must be minimal (1-2 lines) to maximize session space

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Ink (React TUI) | Proven in v1.0, familiar patterns | ✓ Good |
| Hooks over JSONL | JSONL format unreliable, hooks authoritative | ✓ Good |
| tmux splits over embedded terminal | Native reliability, less complexity | ✓ Good |
| Evolve v1.0 codebase | Reuse session detection, status parsing, context tracking | ✓ Good |
| Minimal HUD strip | Maximize space for active session | ✓ Good |
| ~/.vibe-term/ for user config | Persistent location independent of npm install path | — Pending |
| Intelligent hook merging | Preserve project hooks while adding vibe-term's | — Pending |

---
*Last updated: 2026-01-30 after v3.0 milestone initialization*
