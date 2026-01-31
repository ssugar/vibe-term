---
phase: 13-cli-router-setup
plan: 02
subsystem: cli
tags: [meow, readline, cli-routing, command-dispatch]

# Dependency graph
requires:
  - phase: 13-01
    provides: hookMerger service (isVibeTermInstalled, mergeHooks)
  - phase: 12-01
    provides: settingsService, vibeTermDirService
provides:
  - CLI command routing (setup vs TUI dispatch)
  - Setup command with full installation flow
  - Backup before modifying settings
  - Idempotent hook installation
  - Colored CLI output with file paths
affects: [13-03-audit-command, 14-installer-script]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Command router before TUI initialization
    - Dynamic import for subcommands
    - Exit codes constant for CLI commands

key-files:
  created:
    - src/cli/setup.ts
  modified:
    - src/cli.tsx

key-decisions:
  - "Use node: prefix for Node.js built-in imports (required for tsup bundler)"
  - "Router placed before ensureTmuxEnvironment() so setup doesn't require tmux"
  - "Dynamic import for setup command (code splitting)"

patterns-established:
  - "CLI subcommand pattern: check cli.input[0], dynamic import handler, call with flags"
  - "Exit codes: SUCCESS=0, ERROR=1, USER_ABORT=2"
  - "Confirmation prompt: use readline/promises with isTTY check for CI"

# Metrics
duration: 3min
completed: 2026-01-31
---

# Phase 13 Plan 02: CLI Router & Setup Command Summary

**CLI command router dispatches `vibe-term setup` to install hooks with backup, idempotency, and colored output**

## Performance

- **Duration:** 3 min
- **Started:** 2026-01-31T17:13:55Z
- **Completed:** 2026-01-31T17:17:18Z
- **Tasks:** 3
- **Files modified:** 2

## Accomplishments

- Created setup.ts with full installation flow
- Added CLI command router to dispatch setup vs TUI
- Backup created before modifying settings.json
- Idempotent installation (detects existing hooks)
- Colored output showing file paths modified
- --yes flag skips confirmation prompt
- --verbose flag shows preview of changes

## Task Commits

Each task was committed atomically:

1. **Task 1: Create setup command** - `61c8e0a` (feat)
2. **Task 2: Add CLI router to entry point** - `75b733c` (feat)
3. **Task 3: Build and functional test** - `ffd9442` (fix - node: prefix for imports)

## Files Created/Modified

- `src/cli/setup.ts` - Setup command implementation with EXIT_CODES and runSetup exports
- `src/cli.tsx` - Updated meow help text, added --yes/--verbose flags, added command router

## Decisions Made

- **node: prefix for built-ins:** tsup bundler requires `node:readline/promises` and `node:process` instead of bare specifiers
- **Router before tmux:** Placed command router before `ensureTmuxEnvironment()` so setup works without tmux
- **Dynamic import:** Used `await import('./cli/setup.js')` for code splitting

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed Node.js built-in import for bundler**
- **Found during:** Task 3 (Build and functional test)
- **Issue:** tsup bundler failed with "Could not resolve readline/promises"
- **Fix:** Changed `readline/promises` to `node:readline/promises` and `process` to `node:process`
- **Files modified:** src/cli/setup.ts
- **Verification:** npm run build succeeds
- **Committed in:** ffd9442

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary fix for build to work. No scope creep.

## Issues Encountered

None beyond the bundler fix documented above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Setup command ready for users
- Audit command (13-03) can now be added following same CLI routing pattern
- TUI still launches for `vibe-term` without arguments

---
*Phase: 13-cli-router-setup*
*Completed: 2026-01-31*
