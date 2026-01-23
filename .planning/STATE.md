# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-22)

**Core value:** Never miss a blocked Claude. See everything at a glance, get to any Claude in one keypress.
**Current focus:** Phase 3 - Status Detection (in progress)

## Current Position

Phase: 3 of 6 (Status Detection)
Plan: 2 of 3 in phase 3 complete
Status: In progress
Last activity: 2026-01-23 - Completed 03-02-PLAN.md

Progress: [#####.....] 57% (8/14 plans)

## Performance Metrics

**Velocity:**
- Total plans completed: 8
- Average duration: 6 min
- Total execution time: ~46 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 3 | 24 min | 8 min |
| 02-session-detection | 3 | 14 min | ~5 min |
| 03-status-detection | 2 | 4 min | 2 min |

**Recent Trend:**
- Last 5 plans: 02-02 (3 min), 02-03 (~8 min), 03-01 (2 min), 03-02 (2 min)
- Trend: Fast execution for service-only plans

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
- Return null for unknown models (allows UI to show 'unknown')
- 5-second threshold before declaring tool_use as blocked
- Try last 3 lines on parse failure (handles race conditions)
- Default to 'sonnet' model when unknown (null handling for type compatibility)
- Oldest blocked sessions appear first (most urgent prioritization)

### Pending Todos

None yet.

### Blockers/Concerns

None yet.

## Session Continuity

Last session: 2026-01-23T01:11:21Z
Stopped at: Completed 03-02-PLAN.md
Resume file: None
