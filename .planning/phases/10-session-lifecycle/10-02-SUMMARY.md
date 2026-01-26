---
phase: 10-session-lifecycle
plan: 02
subsystem: external-sessions
tags: [detection, display, tmux, external]

dependency-graph:
  requires: [10-01]
  provides: [external-session-detection, divided-tab-display]
  affects: [10-03, 11-polish]

tech-stack:
  added: []
  patterns:
    - "Session classification based on tmux session name"
    - "Three-group tab display (blocked/managed/external)"
    - "Divider separator for visual distinction"

key-files:
  created: []
  modified:
    - src/stores/types.ts
    - src/services/sessionBuilder.ts
    - src/components/TabStrip.tsx

decisions:
  - id: "external-classification"
    choice: "Classify by tmux session name prefix"
    reason: "Sessions in claude-terminal: are managed, others are external"
  - id: "external-pinned-right"
    choice: "Pin external sessions to right side with divider"
    reason: "Visual separation keeps managed sessions primary, external as reference"

metrics:
  duration: "4 min"
  completed: "2026-01-26"
---

# Phase 10 Plan 02: External Session Detection Summary

External session detection and display with visual distinction from managed sessions.

## One-Liner

isExternal field on Session type with classification in sessionBuilder and divided TabStrip display.

## What Was Built

### 1. Session Type Extension (types.ts)

Added `isExternal` boolean field to Session interface:

```typescript
export interface Session {
  // ... existing fields ...
  isExternal: boolean;   // true if running in non-claude-terminal tmux session
}
```

External sessions:
- Are detected via same process detection as managed sessions
- Have tmuxTarget pointing to a different tmux session
- Cannot use swap-pane (must use select-pane to switch)
- Are displayed separately with visual distinction

### 2. Session Classification (sessionBuilder.ts)

Added classification logic based on tmux session name:

```typescript
import { TMUX_SESSION_NAME } from '../startup.js';

// In buildSessions:
const isExternal = tmuxInfo.inTmux &&
  (!tmuxInfo.tmuxTarget?.startsWith(`${TMUX_SESSION_NAME}:`));
```

Classification rules:
- Session is external if it IS in tmux but NOT in claude-terminal session
- Sessions not in tmux are not external (standalone terminal sessions)

### 3. Divided Tab Display (TabStrip.tsx)

Updated TabStrip to show three groups with visual separation:

```typescript
const { blockedWithIndices, managedWithIndices, externalWithIndices } = useMemo(() => {
  // Categorize into blocked, managed (internal non-blocked), external
});

// Layout: [arrow] [blocked] [managed (scrollable)] [arrow] [ | ] [external]
```

Key changes:
- Three categories: blocked (pinned left), managed (scrollable middle), external (pinned right)
- Layout metrics account for divider width (3 chars: " | ")
- Scroll logic only applies to managed sessions
- External sessions always visible (pinned right with divider)

## Key Artifacts

| File | Purpose | Key Addition |
|------|---------|-------------|
| `src/stores/types.ts` | Session interface | `isExternal: boolean` |
| `src/services/sessionBuilder.ts` | Classification logic | TMUX_SESSION_NAME comparison |
| `src/components/TabStrip.tsx` | Divided display | `externalWithIndices`, divider |

## Commit History

| Commit | Description |
|--------|-------------|
| `9c3a36f` | Add isExternal field to Session type |
| `695616b` | Classify sessions as managed vs external |
| `2c10830` | Display managed and external sessions separately |

## Decisions Made

### 1. Classification by tmux session name prefix

**Context:** Need to distinguish sessions spawned by claude-terminal from Claude running elsewhere.

**Options:**
- Track spawned sessions explicitly
- Classify based on tmux session name

**Choice:** Classify based on tmux session name.

**Rationale:** Simple and reliable - if tmuxTarget starts with "claude-terminal:", it's managed. This works even across HUD restarts without needing persistent state.

### 2. External sessions pinned right with divider

**Context:** Need visual distinction between managed and external sessions.

**Options:**
- Different colors/styling only
- Separate sections with divider
- Different tab shapes

**Choice:** Separate sections with " | " divider.

**Rationale:** Clear visual separation. Managed sessions (primary focus) stay on left, external sessions (reference/monitoring) on right. Blocked sessions remain highest priority (pinned left).

## Deviations from Plan

None - plan executed exactly as written.

## Testing Notes

Manual verification:
1. Run Claude in a different tmux session (e.g., `tmux new -s test`)
2. Start claude-terminal
3. External Claude should appear on right side with divider
4. Managed sessions (spawned with `n` key) should appear in middle
5. Enter on external session uses select-pane (existing behavior in app.tsx)

## Next Phase Readiness

- 10-03 (Session Cleanup) can now use isExternal to avoid cleaning up external panes
- External sessions are detected but belong to other tmux sessions
