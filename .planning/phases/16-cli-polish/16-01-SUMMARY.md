---
phase: 16-cli-polish
plan: 01
subsystem: cli
tags: [json, machine-readable, output, suggestions, dual-mode]

# Dependency graph
requires:
  - phase: 15-fix-command
    provides: CLI commands (setup, audit, fix) ready for JSON enhancement
provides:
  - JSON output envelope types (JsonOutput, JsonError, JsonSuggestion)
  - Contextual suggestion functions per command
  - Dual-mode output helpers (human vs JSON collection)
affects: [16-02, cli commands integration]

# Tech tracking
tech-stack:
  added: []
  patterns: [JSON envelope pattern, dual-mode output, suggestion logic]

key-files:
  created:
    - src/cli/json.ts
    - src/cli/suggestions.ts
  modified:
    - src/cli/output.ts

key-decisions:
  - "JSON envelope includes success, data, errors, suggestions, and meta fields"
  - "Version read from package.json with caching for performance"
  - "Suggestions are contextual - only returned when actionable next step exists"

patterns-established:
  - "JSON envelope pattern: consistent wrapper for all CLI command output"
  - "Dual-mode output: functions check jsonMode to print or collect"
  - "Error collection: errors collected in JSON mode for envelope generation"

# Metrics
duration: 4min
completed: 2026-02-02
---

# Phase 16 Plan 01: JSON Output Infrastructure Summary

**JSON output types with envelope format, contextual suggestion logic per command, and dual-mode output helpers for human vs machine-readable CLI output**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-02T14:25:09Z
- **Completed:** 2026-02-02T14:29:00Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- Created JSON output envelope types with consistent structure (success, data, errors, suggestions, meta)
- Implemented contextual suggestion functions for setup/audit/fix commands
- Enhanced output.ts with dual-mode support - prints in human mode, collects in JSON mode

## Task Commits

Each task was committed atomically:

1. **Task 1: Create JSON output module with types and formatters** - `43133f4` (feat)
2. **Task 2: Create suggestions module with command-specific logic** - `0a12d38` (feat)
3. **Task 3: Enhance output.ts for dual-mode output** - `b26ba7e` (feat)

## Files Created/Modified
- `src/cli/json.ts` - JSON output types and formatters (JsonOutput, JsonError, JsonSuggestion, createJsonOutput, outputJson, getVersion)
- `src/cli/suggestions.ts` - Result types and suggestion functions (SetupResult, AuditResult, FixResult, getSetupSuggestion, getAuditSuggestion, getFixSuggestion)
- `src/cli/output.ts` - Enhanced with dual-mode support (setJsonMode, isJsonMode, collectError, collectSuggestion, getCollectedErrors, getCollectedSuggestions)

## Decisions Made
- JSON envelope includes meta.duration_ms calculated from process.hrtime.bigint() for nanosecond precision
- Version cached after first read to avoid repeated file I/O
- Suggestions only returned when actionable (e.g., audit suggestion only after setup install, not after "already installed")

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- TypeScript type narrowing issue with cached version variable (used `undefined` instead of `null` for proper control flow analysis)

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- JSON infrastructure ready for integration into commands
- Plan 02 can add --json flag to CLI and wire up commands to use these modules
- All exports verified importable and working

---
*Phase: 16-cli-polish*
*Completed: 2026-02-02*
