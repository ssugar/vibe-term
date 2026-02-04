---
phase: 18-session-termination
plan: 02
subsystem: ui
tags: [kill-mode, session-termination, confirmation-prompt, ink-react]

# Dependency graph
requires:
  - phase: 18-01
    provides: killSessionPane and deleteSessionState service functions
  - phase: 11-pane-session-manager
    provides: paneSessionManager service
provides:
  - Complete kill session UI with confirmation prompt
  - 'x' key handler for kill initiation
  - y/n/Escape confirmation handling
  - Full cleanup execution (pane + state file + store)
affects: [18-03, 18-04, session-lifecycle, keybindings]

# Tech tracking
tech-stack:
  added: []
  patterns: [modal-confirmation, state-machine-modes]

key-files:
  created: []
  modified:
    - src/app.tsx
    - src/components/HudStrip.tsx

key-decisions:
  - "Kill confirmation uses y/n pattern matching quit confirmation"
  - "External sessions blocked with error message - cannot kill sessions vibe-term did not spawn"
  - "Async kill with error timeout - shows error briefly then clears"

patterns-established:
  - "Modal confirmation pattern: [mode]Mode state + [mode]TargetSession for context"
  - "Priority chain for prompts: mkdir > spawn > kill > quit > exit > help > error"

# Metrics
duration: 8min
completed: 2026-02-04
---

# Phase 18 Plan 02: Kill Mode UI and Execution Summary

**Complete kill session feature with 'x' key initiation, y/n confirmation prompt, and full cleanup (tmux pane + state file + store removal)**

## Performance

- **Duration:** 8 min
- **Started:** 2026-02-04
- **Completed:** 2026-02-04
- **Tasks:** 3 (2 code + 1 human verification)
- **Files modified:** 2

## Accomplishments
- Kill mode state machine: 'none' -> 'confirming' on 'x' press
- Confirmation prompt shows session name with y/n options
- Full cleanup chain: killSessionPane -> deleteSessionState -> removeSession
- External session protection with error message
- HUD hints updated to show 'x: kill' option

## Task Commits

Each task was committed atomically:

1. **Task 1: Add killMode state and key handlers** - `27c13e0` (feat)
2. **Task 2: Add kill confirmation prompt to HudStrip** - `98c9964` (feat)
3. **Task 3: Human verification checkpoint** - USER APPROVED

**Plan metadata:** (this commit)

## Files Created/Modified
- `src/app.tsx` - Added killMode/killTargetSession state, 'x' key handler, y/n confirmation, kill execution chain
- `src/components/HudStrip.tsx` - Added showKillPrompt priority, kill confirmation JSX, updated hints

## Decisions Made
- Kill confirmation follows same y/n pattern as quit confirmation for consistency
- External sessions blocked with 3-second error message - cannot kill what vibe-term did not spawn
- Async error handling with 5-second timeout for kill failures
- Priority chain updated: kill prompt inserted after spawn, before quit

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Kill feature complete and verified via human testing
- KILL-01 through KILL-06 requirements all pass
- Ready for 18-03 (store synchronization improvements) and 18-04 (integration testing)
- All keybindings documented in hints line

---
*Phase: 18-session-termination*
*Completed: 2026-02-04*
