# Phase 18: Session Termination - Research

**Researched:** 2026-02-04
**Domain:** Ink TUI confirmation dialogs, tmux pane termination, file cleanup
**Confidence:** HIGH

## Summary

This phase adds the ability to kill/terminate individual Claude sessions from the HUD by pressing `x` on a selected tab. The implementation requires: (1) a confirmation dialog following existing codebase patterns, (2) tmux pane termination, (3) session state file cleanup, and (4) proper handling of edge cases like killing the last remaining session.

The codebase already has well-established patterns for confirmation dialogs (quit mode, mkdir prompt, exit confirm) and session management (removeSession action, cleanupSessionPane function). This phase follows those patterns closely.

**Primary recommendation:** Add a new "kill mode" state mirroring the existing `quitMode` pattern, use `tmux kill-pane` for pane termination (not `respawn-pane`), and manually remove the session state file from `~/.claude-hud/sessions/` since the hook's SessionEnd may not fire when forcefully killed.

## Standard Stack

### Core (Already in Codebase)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Ink | ^6.6.0 | TUI framework | Already used, provides useInput for key handling |
| Zustand | ^5.0.10 | State management | Already used for session store with removeSession action |
| React | ^19.2.3 | Component framework | Already used |
| Node fs/promises | Built-in | File deletion | For session state file cleanup |

### Supporting (Already in Codebase)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| execAsync (platform.ts) | Custom | Run tmux commands | For `tmux kill-pane` |
| paneSessionManager | Custom | Pane-to-session mapping | For getting pane ID, clearing env vars |

### No New Dependencies Required

This phase requires no new npm packages. All functionality can be built using existing codebase utilities and Node.js built-ins.

## Architecture Patterns

### Recommended Project Structure

```
src/
├── app.tsx                  # Add killMode state, 'x' key handler
├── components/
│   └── HudStrip.tsx         # Add kill confirmation prompt display
├── services/
│   ├── paneSessionManager.ts # Add killSessionPane() function
│   └── hookStateService.ts   # Add deleteSessionState() function
└── stores/
    └── appStore.ts           # Already has removeSession() action
```

### Pattern 1: Modal State Machine (Existing Pattern)

**What:** Use exclusive modal states for confirmation dialogs
**When to use:** Any confirmation flow that needs to capture all keyboard input
**Example from codebase:**

```typescript
// Existing pattern in app.tsx - follow this for killMode
const [quitMode, setQuitMode] = useState<'none' | 'confirming'>('none');
const [showMkdirPrompt, setShowMkdirPrompt] = useState(false);

// Priority-based rendering in HudStrip.tsx
const showQuitPrompt = !showMkdir && !showSpawnPrompt && quitMode === 'confirming';
```

**Recommended for Phase 18:**

```typescript
// New state in app.tsx
const [killMode, setKillMode] = useState<'none' | 'confirming'>('none');
const [killTargetSession, setKillTargetSession] = useState<Session | null>(null);

// 'x' key handler
if (input === 'x' && sessions.length > 0) {
  const session = sessions[selectedIndex];
  setKillTargetSession(session);
  setKillMode('confirming');
  return;
}

// Kill confirmation handler
if (killMode === 'confirming') {
  if (input === 'y' || input === 'Y') {
    // Execute kill
    await killSession(killTargetSession);
    setKillMode('none');
    setKillTargetSession(null);
  } else if (key.escape || input === 'n') {
    setKillMode('none');
    setKillTargetSession(null);
  }
  return;
}
```

### Pattern 2: Session Cleanup (Hybrid - Existing + New)

**What:** Multi-step cleanup: pane termination, state removal, store update
**When to use:** When killing a session requires multiple coordinated actions
**Example:**

```typescript
// services/paneSessionManager.ts - new function
export async function killSessionPane(sessionId: string): Promise<void> {
  const paneId = await getSessionPane(sessionId);
  if (!paneId) return;

  // Kill the pane (process dies, pane disappears)
  await execAsync(`tmux kill-pane -t ${paneId}`);

  // Clear the environment variable mapping
  const envKey = sanitizeEnvKey(sessionId);
  await execAsync(`tmux set-environment -u CLAUDE_PANE_${envKey}`).catch(() => {});
}
```

### Pattern 3: File Cleanup (New)

**What:** Remove session state JSON file from `~/.claude-hud/sessions/`
**Why needed:** The SessionEnd hook normally cleans this up, but force-killing a pane may not trigger it
**Example:**

```typescript
// services/hookStateService.ts - new function
import { unlink } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';

const STATE_DIR = join(homedir(), '.claude-hud', 'sessions');

export async function deleteSessionStateByPath(cwd: string): Promise<void> {
  // Find state file matching this CWD
  const state = findStateByPath(cwd);
  if (!state) return;

  const statePath = join(STATE_DIR, `${state.sessionId}.json`);
  try {
    await unlink(statePath);
  } catch {
    // File may not exist or already deleted - OK
  }
}
```

### Anti-Patterns to Avoid

- **Killing without confirmation:** User could accidentally press 'x'. Always show confirmation prompt with session info.
- **Using respawn-pane instead of kill-pane:** respawn-pane reuses the pane slot with a new shell - we want to completely remove the pane.
- **Not handling empty session list:** After killing last session, HUD should show empty state without crashing.
- **Relying solely on SessionEnd hook for cleanup:** The hook may not fire if Claude process is killed abruptly.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| State management | Custom session removal logic | `useAppStore.removeSession()` | Already handles selectedIndex clamping, activeSessionId clearing |
| Pane ID lookup | Manual tmux queries | `getSessionPane()` | Handles env var lookup, sanitization |
| Modal state priority | Nested conditionals | Priority-based check in HudStrip | Matches existing pattern, maintainable |

**Key insight:** The codebase already has robust patterns for all the building blocks. Compose existing functions rather than reimplementing.

## Common Pitfalls

### Pitfall 1: Race Condition on Kill

**What goes wrong:** User kills session, but session detection poll hasn't run yet, showing "ghost" session
**Why it happens:** Session detection is polling-based (every 2 seconds)
**How to avoid:**
1. Call `removeSession()` immediately after kill (optimistic UI update)
2. The next poll will naturally not find the dead session
**Warning signs:** Session briefly reappears after kill

### Pitfall 2: Killing Active Session Without Swap

**What goes wrong:** Killing the session currently visible in main pane leaves main pane empty
**Why it happens:** Main pane now shows nothing, confusing user
**How to avoid:**
1. After killing active session, either:
   - Swap in another session if available
   - Show welcome/empty state if no sessions left
2. Clear `activeSessionId` in store (already handled by removeSession)
**Warning signs:** Blank main pane after kill

### Pitfall 3: State File Path Mismatch

**What goes wrong:** Attempting to delete from wrong directory
**Why it happens:** Documentation says `~/.vibe-term/sessions/` but actual path is `~/.claude-hud/sessions/`
**How to avoid:** Use the same `STATE_DIR` constant as `hookStateService.ts`: `~/.claude-hud/sessions/`
**Warning signs:** Orphaned JSON files accumulating

### Pitfall 4: Killing External Sessions

**What goes wrong:** Attempting to kill session in external tmux instance
**Why it happens:** External sessions have `isExternal: true`, may not have managed paneId
**How to avoid:**
1. Check `session.isExternal` before kill
2. Show error for external sessions: "Cannot kill external session"
3. Or: require confirmation of external kill with clear warning
**Warning signs:** Error on kill attempt, or killing wrong pane

### Pitfall 5: Confirmation Prompt Z-Order

**What goes wrong:** Kill confirmation appears but other prompt overrides it
**Why it happens:** HudStrip has priority-based rendering for line 2
**How to avoid:** Add `killMode` check at appropriate priority level (after mkdir/spawn, before quit)
**Warning signs:** Can't see confirmation when pressing 'x'

## Code Examples

Verified patterns from official sources and codebase:

### tmux kill-pane Command

```bash
# Source: tmux man page
tmux kill-pane -t %42    # Kill pane by ID
tmux kill-pane -t vibe-term:scratch.0  # Kill by target
```

### Key Handler Pattern (from app.tsx)

```typescript
// Source: existing app.tsx pattern
useInput((input, key) => {
  // Modal states intercept all input first (priority order)
  if (killMode === 'confirming') {
    if (input === 'y' || input === 'Y') {
      executeKill();
    } else if (key.escape || input === 'n') {
      cancelKill();
    }
    return; // Consume input
  }

  // Normal mode - 'x' to initiate kill
  if (input === 'x' && sessions.length > 0) {
    const session = sessions[selectedIndex];
    initiateKill(session);
    return;
  }
});
```

### HudStrip Prompt Priority (from HudStrip.tsx)

```typescript
// Source: existing HudStrip.tsx pattern
const showMkdir = showMkdirPrompt;
const showSpawnPrompt = !showMkdir && spawnMode;
const showKillPrompt = !showMkdir && !showSpawnPrompt && killMode === 'confirming'; // NEW
const showQuitPrompt = !showMkdir && !showSpawnPrompt && !showKillPrompt && quitMode === 'confirming';
```

### Kill Confirmation Prompt UI

```tsx
// Recommended UI for kill confirmation
{showKillPrompt && (
  <Text>
    <Text color="red">Kill session </Text>
    <Text bold>{killTargetSession?.projectName}</Text>
    <Text color="red">? </Text>
    <Text bold color="green">[y]</Text>
    <Text>es / </Text>
    <Text bold color="red">[n]</Text>
    <Text>o</Text>
  </Text>
)}
```

### Complete Kill Flow

```typescript
// Recommended implementation
async function killSession(session: Session): Promise<void> {
  // 1. Kill tmux pane (terminates Claude process)
  if (session.paneId) {
    await execAsync(`tmux kill-pane -t ${session.paneId}`);
  }

  // 2. Clean up tmux environment variable
  const envKey = session.id.replace(/[^a-zA-Z0-9]/g, '_');
  await execAsync(`tmux set-environment -u CLAUDE_PANE_${envKey}`).catch(() => {});

  // 3. Delete session state file (manual cleanup since SessionEnd may not fire)
  const state = findStateByPath(session.projectPath);
  if (state) {
    const statePath = join(homedir(), '.claude-hud', 'sessions', `${state.sessionId}.json`);
    await unlink(statePath).catch(() => {});
  }

  // 4. Update store (removes from list, clamps selectedIndex)
  useAppStore.getState().removeSession(session.id);

  // 5. Handle main pane if this was active session
  if (useAppStore.getState().activeSessionId === null) {
    // Active session was cleared by removeSession
    // Optionally swap in next session or show welcome
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| respawn-pane for cleanup | kill-pane for termination | N/A | kill-pane fully removes pane, respawn keeps it |
| Rely on SessionEnd hook | Manual file cleanup + hook | This phase | Ensures cleanup even on force-kill |

**Deprecated/outdated:**
- N/A - tmux commands are stable

## Open Questions

Things that couldn't be fully resolved:

1. **Should external sessions be killable?**
   - What we know: External sessions (`isExternal: true`) are in tmux but not managed by vibe-term
   - What's unclear: Should we allow killing them? Could kill wrong thing
   - Recommendation: Block killing external sessions with error message. Users can kill manually via tmux.

2. **What happens to main pane after killing active session?**
   - What we know: `removeSession()` clears `activeSessionId` if it matches
   - What's unclear: Should we auto-switch to another session or show empty state?
   - Recommendation: If sessions remain, auto-switch to the session now at `selectedIndex`. If no sessions, main pane will show welcome on next spawn.

3. **Should there be a "kill all sessions" option?**
   - What we know: The 'q' -> 'k' flow already kills all sessions (via kill-session)
   - What's unclear: Is per-session kill sufficient?
   - Recommendation: Per-session kill is the requirement. Bulk kill via existing 'q' -> 'k' flow.

## Sources

### Primary (HIGH confidence)

- **Codebase analysis:** `/home/ssugar/claude/vibe-term/src/app.tsx` - existing modal state patterns
- **Codebase analysis:** `/home/ssugar/claude/vibe-term/src/services/paneSessionManager.ts` - pane management functions
- **Codebase analysis:** `/home/ssugar/claude/vibe-term/src/services/hookStateService.ts` - session state file handling
- **Codebase analysis:** `/home/ssugar/claude/vibe-term/src/stores/appStore.ts` - removeSession action
- **tmux man page:** `kill-pane`, `respawn-pane` commands

### Secondary (MEDIUM confidence)

- [Ink GitHub repository](https://github.com/vadimdemedes/ink) - useInput patterns
- [Baeldung: Kill or Restart tmux Pane](https://www.baeldung.com/linux/tmux-kill-respawn-pane) - kill-pane vs respawn-pane

### Tertiary (LOW confidence)

- N/A

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all components already in codebase
- Architecture: HIGH - follows established patterns exactly
- Pitfalls: HIGH - identified from codebase analysis and tmux docs

**Research date:** 2026-02-04
**Valid until:** 90 days (stable domain, no external API changes expected)
