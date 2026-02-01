---
phase: 15-fix-command
plan: 01
subsystem: services
tags: [hooks, backup, json, settings, projectFixer]

# Dependency graph
requires:
  - phase: 12-foundation-services
    provides: hookMerger.ts with mergeHooks and isVibeTermInstalled
  - phase: 12-foundation-services
    provides: settingsService.ts with ClaudeSettings type
provides:
  - generateFixPreview function for dry-run preview of hook changes
  - applyFix function with backup/restore safety
  - FixMode, FixPreview, FixResult types
  - formatTimestamp exported for reuse
affects: [15-02-fix-cli, 15-03-fix-cli-ux]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Backup-before-write with auto-restore on corruption
    - Preview/Apply separation for dry-run support

key-files:
  created:
    - src/services/projectFixer.ts
  modified:
    - src/services/settingsService.ts

key-decisions:
  - "Backup path includes timestamp using formatTimestamp for consistency with settingsService backups"
  - "applyFix validates JSON after write and auto-restores from backup if corrupted"
  - "FixResult always includes backupPath even on failure so user knows where backup is"

patterns-established:
  - "Preview/Apply pattern: generateFixPreview shows what will change, applyFix executes with safety"
  - "Backup validation: read-back and parse JSON after write to catch corruption"

# Metrics
duration: 3min
completed: 2026-01-31
---

# Phase 15 Plan 01: Project Fixer Service Summary

**Core fix service with generateFixPreview for dry-run and applyFix with backup/restore safety using existing hookMerger**

## Performance

- **Duration:** 3 min
- **Started:** 2026-01-31T12:00:00Z
- **Completed:** 2026-01-31T12:03:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Exported formatTimestamp from settingsService for consistent backup naming
- Created projectFixer service with generateFixPreview and applyFix functions
- Implemented backup-before-write with auto-restore on JSON corruption
- Preview mode returns alreadyConfigured flag for already-installed detection

## Task Commits

Each task was committed atomically:

1. **Task 1: Export formatTimestamp from settingsService** - `21bbcb0` (feat)
2. **Task 2: Create projectFixer service** - `f9bfd4c` (feat)

## Files Created/Modified
- `src/services/settingsService.ts` - Added export keyword to formatTimestamp function
- `src/services/projectFixer.ts` - New service with fix preview generation and application

## Decisions Made
- Used existing formatTimestamp for backup path consistency across all backup operations
- Auto-restore validates written JSON by reading back and parsing, not just write success
- FixResult includes backupPath even on failure so users can manually restore if needed

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- projectFixer service ready for CLI integration in 15-02
- All types exported for CLI consumption
- No blockers

---
*Phase: 15-fix-command*
*Completed: 2026-01-31*
