# Claude Code TUI HUD

## What This Is

A tmux-integrated terminal multiplexer for managing multiple Claude Code sessions. Features an always-visible HUD strip showing all sessions as horizontal tabs with status and context usage. One keypress switches between sessions. Includes CLI commands for hook management (setup, audit, fix) and is installable via npm.

## Core Value

Never miss a blocked Claude. See everything at a glance, get to any Claude in one keypress — reliably.

## Current State

**Shipped:** v1.3.0 (npm: `npm install -g vibe-term`)
**Codebase:** 6,587 LOC TypeScript
**Package size:** 28.4 kB

**What's working:**
- TUI with HUD strip and tmux pane architecture
- Session detection, status tracking, context usage
- CLI hook management: `vibe-term setup`, `audit`, `fix`
- npm global installation

## Requirements

### Validated

*Shipped in v1.1 (Standalone HUD):*
- Detect all running Claude Code instances
- Show working vs idle vs blocked status
- Display context window usage with stoplight colors
- Keyboard navigation (j/k, 1-9 hotkeys)
- Cross-platform support (Linux, macOS, WSL2)

*Shipped in v1.2 (Integrated Terminal):*
- Horizontal HUD strip with session tabs
- tmux split pane architecture
- Reliable session switching (native tmux)
- Spawn new sessions from HUD
- External tmux session detection

*Shipped in v1.3 (Hook Management & Distribution):*
- CLI hook management commands (setup, audit, fix)
- Intelligent hook merging
- Project conflict detection
- JSON output mode for scripting
- npm global install packaging
- Comprehensive documentation

### Active

*v1.4 Session Lifecycle:*
- Kill tab functionality (terminate sessions from HUD)
  - `x` key on selected tab initiates kill
  - Confirmation prompt before terminating
  - Kills tmux pane, removes from tab strip, cleans up state

### Out of Scope

- Embedded terminal (node-pty) — Using tmux splits instead
- Native Windows support — WSL2 is primary
- Non-tmux session management — tmux-integrated by design
- Session preview pane — Defer to future
- Cost/token tracking — Defer to future
- Multi-machine monitoring — Massive complexity
- GUI installer — CLI-first for developer audience

## Constraints

- **Tech stack**: Ink (React TUI) + TypeScript
- **Architecture**: tmux split panes (HUD top, sessions bottom)
- **Platform**: Linux, macOS, WSL2 (all have tmux)
- **UX**: HUD strip must be minimal (1-2 lines)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Ink (React TUI) | Proven across 3 milestones | Good |
| Hooks over JSONL | JSONL format unreliable | Good |
| tmux splits | Native reliability | Good |
| ~/.vibe-term/ for config | Portable across installs | Good |
| Intelligent hook merging | Preserves user hooks | Good |
| Dry-run by default | Safe config modification | Good |
| JSON output mode | Enables scripting/automation | Good |

## Current Milestone: v1.4 Session Lifecycle

**Goal:** Let users terminate individual Claude sessions from the HUD

**Target features:**
- Kill tab with `x` key and confirmation prompt
- tmux pane termination
- Session state cleanup

---
*Last updated: 2026-02-02 after v1.4 milestone start*
