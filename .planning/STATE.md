# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-22)

**Core value:** Never miss a blocked Claude. See everything at a glance, get to any Claude in one keypress.
**Current focus:** Phase 2 - Session Detection

## Current Position

Phase: 2 of 6 (Session Detection)
Plan: 2 of 3 in phase 2 complete
Status: In progress
Last activity: 2026-01-22 - Completed 02-02-PLAN.md

Progress: [######....] 67%

## Performance Metrics

**Velocity:**
- Total plans completed: 5
- Average duration: 6 min
- Total execution time: 0.5 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 3 | 24 min | 8 min |
| 02-session-detection | 2 | 6 min | 3 min |

**Recent Trend:**
- Last 5 plans: 01-02 (3 min), 01-03 (15 min), 02-01 (3 min), 02-02 (3 min)
- Trend: Fast execution (02-02 straightforward service layer)

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

### Pending Todos

None yet.

### Blockers/Concerns

None yet.

## Session Continuity

Last session: 2026-01-22T23:35:44Z
Stopped at: Completed 02-02-PLAN.md
Resume file: None
