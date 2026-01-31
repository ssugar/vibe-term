---
phase: 13-cli-router-setup
plan: 01
subsystem: cli-services
tags: [hooks, settings, installation, idempotency]
requires: [phase-12]
provides: [hook-detection, hook-merging]
affects: [13-02, 13-03]
tech-stack:
  patterns: [type-safe-constants, immutable-merge]
key-files:
  created: [src/services/hookMerger.ts]
  modified: []
decisions:
  - "Use includes() for script detection (handles path variations)"
  - "Tool events get matcher: '*' to hook all tool types"
  - "Append vibe-term hooks (don't prepend) to preserve existing hook order"
metrics:
  duration: ~1 min
  completed: 2026-01-31
---

# Phase 13 Plan 01: Hook Merger Service Summary

Hook detection and intelligent merge logic for idempotent setup command.

## What Was Built

Created `src/services/hookMerger.ts` with four exports:

1. **VIBE_TERM_HOOK_SCRIPT** - Path constant (`~/.vibe-term/status-hook.sh`)
2. **HOOK_EVENTS** - All 11 Claude hook events as const array
3. **isVibeTermInstalled(settings)** - Detects if hooks already installed
4. **mergeHooks(settings)** - Merges vibe-term hooks into existing settings

### Detection Logic

`isVibeTermInstalled` iterates through all hook events, checking if any hook command contains the vibe-term script path. Returns true on first match.

### Merge Logic

`mergeHooks` creates a new settings object with vibe-term hooks appended to each event's array. Preserves all existing hooks from other tools.

Tool events (PreToolUse, PostToolUse, PostToolUseFailure) include `matcher: '*'` to catch all tool types.

## Key Implementation Details

```typescript
// Type-safe hook events with 'as const'
export const HOOK_EVENTS = [
  'SessionStart', 'UserPromptSubmit', 'PermissionRequest',
  'PreToolUse', 'PostToolUse', 'PostToolUseFailure',
  'Stop', 'SessionEnd', 'SubagentStart', 'SubagentStop', 'Notification',
] as const;

// Tool events needing matcher
const TOOL_EVENTS = new Set(['PreToolUse', 'PostToolUse', 'PostToolUseFailure']);
```

## Files Changed

| File | Change |
|------|--------|
| src/services/hookMerger.ts | Created (134 lines) |

## Commits

| Hash | Message |
|------|---------|
| 5124460 | feat(13-01): create hook merger service |

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- TypeScript compilation: PASS
- Exports available: VIBE_TERM_HOOK_SCRIPT, HOOK_EVENTS, isVibeTermInstalled, mergeHooks
- Hook events count: 11
- ESM pattern (.js imports): Verified

## Next Phase Readiness

Ready for 13-02 (CLI router setup) and 13-03 (setup command implementation).
