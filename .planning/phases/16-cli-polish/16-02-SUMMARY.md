---
phase: 16-cli-polish
plan: 02
subsystem: cli
tags: [json, output, suggestions, meow, cli-flags]

# Dependency graph
requires:
  - phase: 16-01
    provides: JSON output types, suggestion functions, output utilities
provides:
  - --json flag support in CLI router
  - JSON output mode for setup command
  - JSON output mode for audit command
  - JSON output mode for fix command
  - Contextual suggestions in human mode
affects: [future-scripting, ci-integration, automation-tooling]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - JSON envelope pattern (success, data, errors, suggestions, meta)
    - setJsonMode/isJsonMode for dual-mode output control
    - outputJsonResult helper for consistent JSON output paths

key-files:
  modified:
    - src/cli.tsx
    - src/cli/setup.ts
    - src/cli/audit.ts
    - src/cli/fix.ts
    - src/cli/suggestions.ts

key-decisions:
  - "JSON mode requires --yes for confirmation-needed operations"
  - "Suggestions only shown when actionable (e.g., no --apply suggestion when no projects to fix)"

patterns-established:
  - "startTime = process.hrtime.bigint() at function start for duration tracking"
  - "setJsonMode(options.json) immediately after start time capture"
  - "Result object initialization at function start, populated throughout"
  - "outputJsonResult helper centralizes JSON output with suggestion generation"

# Metrics
duration: 5min
completed: 2026-02-02
---

# Phase 16 Plan 02: JSON Output Wiring Summary

**Wired --json flag to CLI router and all commands with consistent JSON envelope output and contextual human-mode suggestions**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-02T14:32:00Z
- **Completed:** 2026-02-02T14:37:00Z
- **Tasks:** 4
- **Files modified:** 5

## Accomplishments
- Added --json flag to CLI router with help text and pass-through to all commands
- Setup command outputs JSON with installed/already_installed status and paths
- Audit command outputs JSON with scanned/pass/warn/fail counts and projects array
- Fix command outputs JSON with total/fixed/skipped/failed counts and projects array
- Human-mode commands now show contextual "-> Run ..." suggestions

## Task Commits

Each task was committed atomically:

1. **Task 1: Add --json flag to CLI router** - `57cd8c3` (feat)
2. **Task 2: Update setup.ts for JSON output and suggestions** - `786ad38` (feat)
3. **Task 3: Update audit.ts for JSON output and suggestions** - `3aa2540` (feat)
4. **Task 4: Update fix.ts for JSON output and suggestions** - `6aa45d1` (feat)

## Files Created/Modified
- `src/cli.tsx` - Added --json flag and pass-through to all commands
- `src/cli/setup.ts` - JSON output mode with SetupResult tracking
- `src/cli/audit.ts` - JSON output mode with AuditResult tracking
- `src/cli/fix.ts` - JSON output mode with FixResult tracking
- `src/cli/suggestions.ts` - Fixed getFixSuggestion to require total > 0 for dry-run suggestion

## Decisions Made
- JSON mode with --apply requires --yes flag (non-interactive cannot prompt)
- getFixSuggestion only suggests --apply when there are actual projects to fix
- All commands set JSON mode immediately after capturing start time

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed getFixSuggestion showing suggestion when no projects**
- **Found during:** Task 4 (fix.ts JSON output verification)
- **Issue:** getFixSuggestion showed "use --apply" suggestion even when no projects needed fixing
- **Fix:** Added check for `result.total > 0` before returning dry-run suggestion
- **Files modified:** src/cli/suggestions.ts
- **Verification:** fix --json with no projects shows empty suggestions array
- **Committed in:** 6aa45d1 (Task 4 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor fix to suggestion logic for edge case. No scope creep.

## Issues Encountered
None - plan executed smoothly.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- CLI polish phase complete with JSON output and suggestions
- Ready for Phase 17 (final polish/release)
- All CLI commands support both human-readable and machine-readable output

---
*Phase: 16-cli-polish*
*Completed: 2026-02-02*
