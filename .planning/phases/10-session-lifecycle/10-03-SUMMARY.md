---
phase: 10-session-lifecycle
plan: 03
subsystem: session-cleanup
tags: [cleanup, pane-management, lifecycle]

dependency-graph:
  requires: [10-02]
  provides: [dead-session-cleanup, active-session-recovery]
  affects: [11-polish]

tech-stack:
  added: []
  patterns:
    - "Previous state tracking for change detection"
    - "Silent cleanup with error swallowing"
    - "isExternal flag for selective cleanup"

key-files:
  created: []
  modified:
    - src/services/paneSessionManager.ts
    - src/hooks/useSessions.ts

decisions:
  - id: "internal-only-cleanup"
    choice: "Only clean up internal session panes"
    reason: "External sessions belong to other tmux sessions"

metrics:
  duration: "4 min"
  completed: "2026-01-26"
---

# Phase 10 Plan 03: Session Cleanup Summary

Dead session cleanup with pane removal and HUD focus recovery for internal sessions only.

## One-Liner

Automatic cleanup of dead internal sessions with pane removal and active session death handling.

## What Was Built

### 1. cleanupSessionPane Function (paneSessionManager.ts)

New exported function to clean up session panes:

```typescript
export async function cleanupSessionPane(sessionId: string): Promise<void> {
  try {
    const paneId = await getSessionPane(sessionId);
    if (!paneId) return;

    // Check if pane still exists before trying to kill
    const { stdout } = await execAsync(`tmux list-panes -a -F '#{pane_id}'`);
    if (!stdout.includes(paneId)) return;

    // Kill the pane
    await execAsync(`tmux kill-pane -t ${paneId}`);
  } catch {
    // Pane may already be gone - that's fine
  } finally {
    // Always clear the environment variable
    const envKey = sanitizeEnvKey(sessionId);
    await execAsync(`tmux set-environment -u CLAUDE_PANE_${envKey}`).catch(() => {});
  }
}
```

Handles edge cases gracefully (pane already gone, permissions errors).

### 2. Session Removal Detection (useSessions.ts)

Added tracking and detection for removed sessions:

```typescript
// Track previous sessions for removal detection
// Map of sessionId -> isExternal (to avoid cleaning up external session panes)
const previousSessionsRef = useRef<Map<string, boolean>>(new Map());

// In refresh callback:
const currentIds = new Set(sessions.map(s => s.id));
const removedIds = [...previousSessionsRef.current.keys()].filter(id => !currentIds.has(id));

// Clean up panes for removed INTERNAL sessions only
for (const id of removedIds) {
  const wasExternal = previousSessionsRef.current.get(id) ?? false;
  if (!wasExternal) {
    await cleanupSessionPane(id).catch(() => {});
  }
}
```

Key behavior: Only internal sessions have their panes cleaned up. External sessions belong to other tmux sessions - their panes are preserved.

### 3. Active Session Death Handling (useSessions.ts)

When the active session dies, focus returns to HUD:

```typescript
const activeSessionId = useAppStore.getState().activeSessionId;
if (activeSessionId && removedIds.includes(activeSessionId)) {
  useAppStore.getState().setActiveSessionId(null);

  // Focus HUD pane
  execAsync('tmux show-environment CLAUDE_TERMINAL_HUD_PANE')
    .then(({ stdout }) => {
      const hudPaneId = stdout.split('=')[1]?.trim();
      if (hudPaneId) {
        return execAsync(`tmux select-pane -t ${hudPaneId}`);
      }
    })
    .catch(() => {}); // Ignore errors
}
```

## Key Artifacts

| File | Purpose | Key Exports/Patterns |
|------|---------|---------------------|
| `src/services/paneSessionManager.ts` | Pane cleanup | `cleanupSessionPane` |
| `src/hooks/useSessions.ts` | Removal detection | `previousSessionsRef` |

## Commit History

| Commit | Description |
|--------|-------------|
| `3dd978d` | Add cleanupSessionPane function to paneSessionManager |
| `c39c0df` | Add session removal detection to useSessions hook |
| `6ec5843` | Handle active session death with HUD focus |

## Decisions Made

### 1. Internal-only cleanup

**Context:** External sessions detected via scanner belong to other tmux sessions.

**Options:**
- Clean up all session panes
- Only clean up internal session panes

**Choice:** Only clean up internal session panes.

**Rationale:** External sessions have panes in other tmux sessions. Killing those panes would be destructive - they don't belong to us.

## Deviations from Plan

None - plan executed exactly as written.

## Testing Notes

Manual verification:
1. Spawn session with `n` key
2. Switch to it with Enter (becomes active)
3. Quit Claude in that session (`/quit`)
4. HUD should auto-focus after ~2 seconds (next polling cycle)
5. Session should disappear from tab list
6. Pane should be killed (no orphan panes in scratch window)

## Next Phase Readiness

- Phase 11 (Polish) can proceed
- All session lifecycle features (spawn, classify, cleanup) are complete
