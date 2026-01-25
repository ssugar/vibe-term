# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-22)

**Core value:** Never miss a blocked Claude. See everything at a glance, get to any Claude in one keypress.
**Current focus:** Phase 5 complete - Ready for Phase 6 (Terminal Integration)

## Current Position

Phase: 5 of 6 (Navigation)
Plan: 2 of 2 in phase 5 complete
Status: Phase complete
Last activity: 2026-01-25 - Completed quick task 001: subagent/context bar alignment

Progress: [#########░] 93% (14/15 plans)

## Performance Metrics

**Velocity:**
- Total plans completed: 14
- Average duration: ~7.6 min
- Total execution time: ~107 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 3 | 24 min | 8 min |
| 02-session-detection | 3 | 14 min | ~5 min |
| 03-status-detection | 4 | ~42 min | ~10 min |
| 04-context-window | 2 | 14 min | 7 min |
| 05-navigation | 2 | 13 min | 6.5 min |

**Recent Trend:**
- Last 5 plans: 04-01 (6 min), 04-02 (8 min), 05-01 (5 min), 05-02 (8 min)
- Trend: Phase 5 complete. Navigation fully implemented.

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
- **NEW:** Inverse colors for selection highlighting (terminal-theme agnostic)
- **NEW:** Context meter and tmux indicator preserve colors when row selected

### Pending Todos

- Future: Display subagent model breakdown (e.g., "+1 haiku, +2 sonnet")
- Future: Non-tmux session jumping (terminal container concept)
- Future: Return to HUD after jumping (tmux keybinding or embedded approach)

### Blockers/Concerns

None.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 001 | Add spacing between subagent count and context bar for alignment | 2026-01-25 | 10b8a92 | [001-add-spacing-between-subagent-count-and-c](./quick/001-add-spacing-between-subagent-count-and-c/) |

## Session Continuity

Last session: 2026-01-25
Stopped at: Completed 05-02-PLAN.md (Session jumping with Enter key)
Resume file: None
