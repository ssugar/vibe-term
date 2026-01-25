# Claude Code TUI HUD

## What This Is

A tmux-integrated terminal multiplexer for managing multiple Claude Code sessions. Features an always-visible HUD strip at the top showing all sessions as horizontal tabs with status and context usage, while the main area displays the active Claude session. One keypress switches between sessions, and the HUD is always visible while working.

## Core Value

Never miss a blocked Claude. See everything at a glance, get to any Claude in one keypress — reliably.

## Current Milestone: v2.0 Integrated Claude Terminal

**Goal:** Transform the standalone HUD into a tmux-integrated terminal where sessions run inside managed panes with an always-visible status strip.

**Target features:**
- Horizontal HUD strip showing sessions as tabs (always visible)
- tmux split architecture (HUD top, active session bottom)
- Reliable session switching via native tmux operations
- Spawn new Claude sessions from within HUD
- Detect and integrate externally-created sessions
- Quick return to HUD view with `b` key

## Requirements

### Validated

*Shipped in v1.0 and confirmed working:*

- ✓ Detect all running Claude Code instances — v1.0
- ✓ Show working vs idle vs blocked status — v1.0
- ✓ Display context window usage with stoplight colors — v1.0
- ✓ Keyboard navigation (j/k, 1-9 hotkeys) — v1.0
- ✓ Cross-platform support (Linux, macOS, WSL2) — v1.0
- ✓ Status detection via hooks — v1.0
- ✓ Project/directory identification — v1.0
- ✓ Real-time status refresh — v1.0

### Active

*v2.0 scope:*

- [ ] Horizontal HUD strip with session tabs
- [ ] tmux split pane architecture
- [ ] Reliable session switching (native tmux)
- [ ] Return to HUD with `b` key
- [ ] Spawn new sessions from HUD (`n` key)
- [ ] Detect externally-created tmux sessions
- [ ] Minimal tab format: `[index:name status context%]`

### Out of Scope

- Embedded terminal (node-pty) — Using tmux splits instead, proven reliability
- Native Windows support — WSL2 is primary
- Non-tmux session management — v2.0 is tmux-integrated by design
- Session preview pane — Defer to v3
- Cost/token tracking — Defer to v3
- Multi-machine monitoring — Massive complexity

## Context

**Evolution from v1.0:**
- v1.0 standalone HUD works but has jumping limitations for non-tmux sessions
- User runs 5-10 concurrent Claude sessions
- Alt-tabbing to find blocked sessions is the core pain point
- tmux integration solves jumping reliability completely

**Technical approach:**
- Evolve existing v1.0 codebase (don't rewrite)
- Refactor full-screen list UI into horizontal strip component
- Add tmux session/pane management layer
- Existing session detection, status parsing, context tracking all reusable

**Key insight:**
By making tmux the container, we get reliable jumping for free. The HUD becomes a thin status layer on top of native tmux pane management.

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
| tmux splits over embedded terminal | Native reliability, less complexity | — Pending |
| Evolve v1.0 codebase | Reuse session detection, status parsing, context tracking | — Pending |
| Minimal HUD strip | Maximize space for active session | — Pending |

---
*Last updated: 2026-01-25 after v2.0 milestone initialization*
