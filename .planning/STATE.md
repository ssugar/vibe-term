# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-22)

**Core value:** Never miss a blocked Claude. See everything at a glance, get to any Claude in one keypress.
**Current focus:** Phase 4 - Context Window (next)

## Current Position

Phase: 3 of 6 (Status Detection) - COMPLETE
Plan: 4 of 4 in phase 3 complete
Status: Phase 3 complete, ready for Phase 4
Last activity: 2026-01-23 - Completed 03-04-PLAN.md

Progress: [######....] 64% (10/15 plans)

## Performance Metrics

**Velocity:**
- Total plans completed: 10
- Average duration: ~8 min
- Total execution time: ~80 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 3 | 24 min | 8 min |
| 02-session-detection | 3 | 14 min | ~5 min |
| 03-status-detection | 4 | ~42 min | ~10 min |

**Recent Trend:**
- Last 5 plans: 03-01 (2 min), 03-02 (2 min), 03-03 (5 min), 03-04 (~30 min)
- Trend: Phase 3 required iteration and debugging (JSONL→hooks pivot)

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

### Pending Todos

- Future: Display subagent model breakdown (e.g., "+1 haiku, +2 sonnet")

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-01-23
Stopped at: Completed Phase 3 (Status Detection)
Resume file: None
