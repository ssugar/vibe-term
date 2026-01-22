# Claude Code TUI HUD

## What This Is

A terminal-based heads-up display for monitoring and managing multiple Claude Code instances. Built with Ink (React for terminals), it shows all running Claude instances at a glance — their status (working/idle/blocked), context window usage (stoplight colors), and provides instant keyboard navigation to jump to or interact with any session.

## Core Value

Never miss a blocked Claude. See everything at a glance, get to any Claude in one keypress.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Detect all running Claude Code instances (tmux sessions + terminal windows)
- [ ] Show working vs idle vs blocked status for each instance
- [ ] Display context window usage with stoplight colors (green <30%, yellow 30-70%, red >70%)
- [ ] Keyboard shortcut to focus/jump to a specific Claude's terminal
- [ ] Work across mixed tmux and separate terminal window setups
- [ ] Identify which Claude instance maps to which project/directory
- [ ] Refresh status in real-time (or near real-time)
- [ ] Cross-platform support (Linux, macOS, WSL2)

### Out of Scope

- Container/launcher mode (spawn new Claudes from HUD) — v2 feature
- Embedded terminal interaction within HUD — v2 feature
- Native Windows support — defer, WSL2 is primary
- Mobile/web interface — terminal-only for v1
- Historical metrics/logging — focus on live status

## Context

**User environment:**
- Runs 5-10 concurrent Claude Code instances
- Mix of tmux sessions and separate terminal windows
- Primary pain: alt-tabbing through windows to find blocked Claudes
- Discovers Claudes that have been waiting 20+ minutes for permission

**Technical environment:**
- WSL2 on Linux (primary development)
- Cross-platform target: Linux, macOS, WSL2
- Claude Code exposes status via ccstatusline mechanism (needs research)

**Prior art:**
- ccstatusline hooks exist in Claude Code for status reporting
- No existing TUI monitor for Claude Code instances found

## Constraints

- **Tech stack**: Ink (React TUI framework) — user preference, Claude Code uses it too
- **Platform**: Must work on Linux, macOS, and WSL2
- **Detection**: Must handle both tmux sessions and separate terminal windows
- **Data source**: Claude Code status must be obtainable (scrape output or status files)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Ink (React TUI) | User preference, proven in Claude Code itself | — Pending |
| Monitor-first MVP | Reduce complexity, validate core value before container mode | — Pending |
| Cross-platform | User works across environments | — Pending |

---
*Last updated: 2026-01-22 after initialization*
