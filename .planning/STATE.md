# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-22)

**Core value:** Never miss a blocked Claude. See everything at a glance, get to any Claude in one keypress.
**Current focus:** Phase 6 complete - All planned phases finished!

## Current Position

Phase: 6 of 6 (Terminal Integration)
Plan: 1 of 1 in phase 6 complete
Status: Project complete
Last activity: 2026-01-25 - Completed 06-01-PLAN.md (Window Focus Service)

Progress: [##########] 100% (15/15 plans)

## Performance Metrics

**Velocity:**
- Total plans completed: 15
- Average duration: ~7.3 min
- Total execution time: ~109 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 3 | 24 min | 8 min |
| 02-session-detection | 3 | 14 min | ~5 min |
| 03-status-detection | 4 | ~42 min | ~10 min |
| 04-context-window | 2 | 14 min | 7 min |
| 05-navigation | 2 | 13 min | 6.5 min |
| 06-terminal-integration | 1 | 2 min | 2 min |

**Recent Trend:**
- Last 5 plans: 04-02 (8 min), 05-01 (5 min), 05-02 (8 min), 06-01 (2 min)
- Trend: All phases complete!

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- ESM-only project (type: module) required for Ink 6.x
- .js extension in TS imports for ESM compatibility
- 2-second default refresh interval for state updates
- Custom formatRelativeTime instead of date-fns (simpler, no dependency)
- useInterval hook pattern from Dan Abramov for stale closure handling
- Selective Zustand subscriptions to prevent unnecessary re-renders
- Ctrl+C detected via key.ctrl in useInput (Ink raw mode)
- Use useAppStore.getState() in callbacks to avoid dependency issues
- Shell commands over npm packages for process detection (ps, readlink, lsof, tmux)
- Graceful degradation: return empty arrays on command failure
- Parent PID matching for tmux correlation
- Use claude-${pid} as stable session ID for correlation
- Disambiguate duplicate folder names with parent/folder format
- Stable session ordering: existing maintain position, new added at end by age
- 24-char max project name width with ellipsis truncation (SessionRow layout)
- Cyan bold index numbers to suggest hotkeys
- **PIVOTED:** Hooks over JSONL parsing (JSONL format unreliable, hooks authoritative)
- Global hooks in ~/.claude/settings.json for cross-project tracking
- mainModel preservation (only update on UserPromptSubmit to avoid subagent overwrite)
- SubagentStart/Stop tracking with count display (+N indicator)
- SessionEnd cleanup removes stale state files
- 200K context window standard for all Claude 4.x models
- JSONL format is nested: data.message.type='assistant', data.message.message.usage
- Tail-read optimization (last 50KB) and mtime caching for JSONL parsing
- Inverse colors for selection highlighting (terminal-theme agnostic)
- Context meter and tmux indicator preserve colors when row selected
- **NEW:** xdotool for Linux X11 window focus (PID-based, title fallback)
- **NEW:** osascript for macOS Terminal.app activation
- **NEW:** PowerShell SetForegroundWindow for WSL2 Windows Terminal
- **NEW:** Wayland detection with helpful error message

### Pending Todos

- Future: Display subagent model breakdown (e.g., "+1 haiku, +2 sonnet")
- Future: Return to HUD after jumping (tmux keybinding or embedded approach)
- Future: Specific tab focus for macOS/WSL2 (currently app-level only)

### Blockers/Concerns

None.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 001 | Add spacing between subagent count and context bar for alignment | 2026-01-25 | 10b8a92 | [001-add-spacing-between-subagent-count-and-c](./quick/001-add-spacing-between-subagent-count-and-c/) |
| 002 | Add fixed-width spacing between model name and subagent count | 2026-01-25 | 2ddbc5c | [002-add-fixed-width-spacing-between-model-na](./quick/002-add-fixed-width-spacing-between-model-na/) |

## Session Continuity

Last session: 2026-01-25
Stopped at: Completed 06-01-PLAN.md (Window Focus Service)
Resume file: None
