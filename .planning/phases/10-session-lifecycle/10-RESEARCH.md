# Phase 10: Session Lifecycle - Research

**Researched:** 2026-01-26
**Domain:** Session spawning, external detection, lifecycle management, directory input
**Confidence:** HIGH

## Summary

Phase 10 implements the full lifecycle of Claude sessions: spawning new sessions with `n` key, detecting external tmux sessions running Claude, and automatically cleaning up dead sessions. The existing codebase already has partial spawn support in `app.tsx` (lines 110-164), the scratch window pattern in `paneSessionManager.ts`, and process detection in `processDetector.ts`.

The key technical challenges are:
1. **Directory input with tab completion** - The current spawn mode (lines 110-186 in app.tsx) handles basic input but lacks proper tab completion. Node.js fs.readdirSync with `withFileTypes` provides directory-only filtering.
2. **External session detection** - Already partially implemented via `isInternalSession` check (line 242 in app.tsx). Need to enhance display to show managed vs external sessions separately.
3. **Dead session cleanup** - The existing polling in `useSessions.ts` already detects when Claude processes exit. Need to add pane cleanup logic.

**Primary recommendation:** Enhance existing spawn mode with proper tab completion and directory validation, extend Session type for external flag, and add cleanup on session removal.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| ink | ^6.6.0 | React for CLI | Already in use, provides useInput for keyboard handling |
| Node.js fs | Built-in | Directory operations | readdirSync with withFileTypes for tab completion |
| tmux CLI | System | Session/pane management | Already established pattern via execAsync |
| zustand | ^5.0.10 | State management | Already in use for session state |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| path | Built-in | Path manipulation | join, dirname, basename for completion logic |
| os | Built-in | Home directory | homedir() for ~ expansion |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom completion | ink-text-input | Additional dependency (project rule: no new npm deps) |
| Polling for dead | tmux hooks | pane-exited hooks are unreliable per tmux issues |

**Installation:**
No new dependencies required. Uses existing stack.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── services/
│   ├── paneSessionManager.ts  # Existing - enhance for cleanup
│   ├── directoryService.ts    # NEW - tab completion logic
│   └── processDetector.ts     # Existing - already detects Claude
├── hooks/
│   └── useSessions.ts         # Existing - add cleanup trigger
├── stores/
│   └── types.ts               # Extend Session interface
└── app.tsx                    # Existing spawn mode - enhance
```

### Pattern 1: Directory Tab Completion
**What:** Provide directory completion as user types path
**When to use:** During spawn mode input (n key)
**Example:**
```typescript
// Source: Node.js fs documentation
import { readdirSync } from 'fs';
import { join, dirname, basename } from 'path';

export function getDirectoryCompletions(partial: string): string[] {
  // Expand ~ to home directory
  const expanded = partial.startsWith('~')
    ? partial.replace('~', process.env.HOME || '~')
    : partial;

  // Get the directory to search and the prefix to match
  const searchDir = dirname(expanded) || '.';
  const prefix = basename(expanded);

  try {
    const entries = readdirSync(searchDir, { withFileTypes: true });
    return entries
      .filter(e => e.isDirectory() && e.name.startsWith(prefix))
      .map(e => join(searchDir, e.name));
  } catch {
    return [];
  }
}
```

### Pattern 2: Managed vs External Session Classification
**What:** Distinguish sessions spawned by claude-terminal from externally-created
**When to use:** In sessionBuilder.ts when building session list
**Example:**
```typescript
// Source: Existing pattern in app.tsx line 242
import { TMUX_SESSION_NAME } from '../startup.js';

function classifySession(session: Session): 'managed' | 'external' {
  // Internal sessions have tmuxTarget starting with our session name
  const isManaged = session.tmuxTarget?.startsWith(`${TMUX_SESSION_NAME}:`);
  return isManaged ? 'managed' : 'external';
}
```

### Pattern 3: Dead Session Cleanup via Polling
**What:** Detect when sessions disappear from process list and cleanup panes
**When to use:** During session refresh cycle in useSessions.ts
**Example:**
```typescript
// Source: Existing polling pattern in useSessions.ts
// Track previous session IDs to detect removed sessions
const previousIdsRef = useRef<Set<string>>(new Set());

const refresh = useCallback(async () => {
  const sessions = await buildSessions(processes, panes, previousOrder);

  // Detect removed sessions (were in previous, not in current)
  const currentIds = new Set(sessions.map(s => s.id));
  const removedIds = [...previousIdsRef.current].filter(id => !currentIds.has(id));

  // Cleanup panes for removed sessions
  for (const id of removedIds) {
    const paneId = await getSessionPane(id);
    if (paneId) {
      await execAsync(`tmux kill-pane -t ${paneId}`).catch(() => {});
      // Clear the environment variable
      const envKey = sanitizeEnvKey(id);
      await execAsync(`tmux set-environment -u CLAUDE_PANE_${envKey}`).catch(() => {});
    }
  }

  previousIdsRef.current = currentIds;
}, []);
```

### Anti-Patterns to Avoid
- **tmux pane-exited hooks for cleanup:** These are unreliable (see GitHub issues #2882, #3736). Use polling instead.
- **Blocking fs operations during render:** All directory completions must be async or debounced.
- **Relying on window.pane indices:** Use stable paneId (like %10) which doesn't change on swap.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Directory completion | Custom readline | fs.readdirSync + filter | Edge cases: symlinks, permissions, hidden dirs |
| Path expansion | String replace | os.homedir() + path.resolve | Handles edge cases like ~user |
| Session classification | New detection | Check tmuxTarget prefix | Already have the data from tmuxService |
| Pane existence check | ps or /proc | tmux list-panes | tmux is source of truth for pane state |

**Key insight:** The existing codebase already has most of the building blocks. The task is composing them correctly, not building new infrastructure.

## Common Pitfalls

### Pitfall 1: Tilde Expansion Timing
**What goes wrong:** User types `~/projects` but shell doesn't expand ~ inside quotes
**Why it happens:** tmux send-keys sends literal string, bash needs unquoted ~ to expand
**How to avoid:** Expand tilde BEFORE constructing the command (already done in app.tsx line 123)
**Warning signs:** Sessions start in wrong directory or fail to start

### Pitfall 2: Tab Completion Race Conditions
**What goes wrong:** Completion results arrive after user has already typed more
**Why it happens:** Async directory reads complete at unpredictable times
**How to avoid:** Use debouncing, track input version, discard stale completions
**Warning signs:** Completions appear for wrong prefix, UI flickers

### Pitfall 3: Pane ID Stale Reference
**What goes wrong:** Trying to kill a pane that no longer exists
**Why it happens:** Session died, pane was already cleaned up elsewhere
**How to avoid:** Always wrap kill-pane in try/catch, verify pane exists first
**Warning signs:** Error messages about invalid pane target

### Pitfall 4: External Session Switching
**What goes wrong:** Using swap-pane for external sessions that are in different tmux sessions
**Why it happens:** swap-pane only works within the same tmux session
**How to avoid:** Check isInternalSession before deciding swap-pane vs select-pane (already in app.tsx)
**Warning signs:** "can't swap pane" errors when selecting external sessions

### Pitfall 5: Active Session Dies
**What goes wrong:** Main pane shows dead/ended session content
**Why it happens:** Session cleanup didn't check if it was the active session
**How to avoid:** If activeSessionId matches removed session, clear it and focus HUD
**Warning signs:** Blank or frozen main pane after Claude exits

## Code Examples

Verified patterns from official sources:

### Directory Existence Check
```typescript
// Source: Node.js fs documentation
import { existsSync, mkdirSync } from 'fs';

async function ensureDirectory(path: string): Promise<{ exists: boolean; created: boolean }> {
  const expanded = path.startsWith('~')
    ? path.replace('~', process.env.HOME || '~')
    : path;

  if (existsSync(expanded)) {
    return { exists: true, created: false };
  }

  // Directory doesn't exist - caller should prompt user
  return { exists: false, created: false };
}

function createDirectory(path: string): void {
  const expanded = path.startsWith('~')
    ? path.replace('~', process.env.HOME || '~')
    : path;
  mkdirSync(expanded, { recursive: true });
}
```

### Tab Completion State Management
```typescript
// Source: Ink useInput pattern + fs.readdirSync
import { useState, useCallback } from 'react';

interface CompletionState {
  completions: string[];
  index: number;
  prefix: string;
}

function useDirectoryCompletion() {
  const [state, setState] = useState<CompletionState>({
    completions: [],
    index: 0,
    prefix: '',
  });

  const updateCompletions = useCallback((input: string) => {
    const completions = getDirectoryCompletions(input);
    setState({ completions, index: 0, prefix: input });
  }, []);

  const cycleNext = useCallback(() => {
    setState(prev => ({
      ...prev,
      index: (prev.index + 1) % Math.max(1, prev.completions.length),
    }));
  }, []);

  return { state, updateCompletions, cycleNext };
}
```

### Session Classification in Build
```typescript
// Source: Existing pattern in sessionBuilder.ts
// Add isExternal field to Session interface

export interface Session {
  // ... existing fields ...
  isExternal: boolean;  // true if running in non-claude-terminal tmux session
}

// In buildSessions:
const isExternal = !session.tmuxTarget?.startsWith(`${TMUX_SESSION_NAME}:`);
return {
  ...session,
  isExternal,
};
```

### Cleanup on Session Removal
```typescript
// Source: Existing patterns in paneSessionManager.ts
import { execAsync } from './platform.js';

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

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| tmux hooks for cleanup | Polling-based detection | Always (hooks unreliable) | Simpler, more reliable |
| readline for completion | Custom fs-based | N/A | No dependency needed |
| Session PID tracking | tmux paneId tracking | Phase 9 | Stable across swaps |

**Deprecated/outdated:**
- Using `remain-on-exit` with `pane-died` hook: Complex and still has edge cases
- Per-pane hooks (`set-hook -p`): Don't fire when the pane closes (tmux bug)

## Open Questions

Things that couldn't be fully resolved:

1. **Optimal polling interval for dead session detection**
   - What we know: Current refresh is 2000ms, fast enough for HUD updates
   - What's unclear: Is this too slow for cleanup? Too fast for battery?
   - Recommendation: Keep 2000ms for now, make configurable if needed

2. **Tab completion: show inline vs dropdown**
   - What we know: Terminal has limited UI options
   - What's unclear: Best UX for cycling through completions
   - Recommendation: Start with inline replacement (Tab cycles), can enhance later

## Sources

### Primary (HIGH confidence)
- Node.js fs documentation - readdirSync with withFileTypes
- Existing codebase patterns - app.tsx, paneSessionManager.ts, sessionBuilder.ts
- tmux man page - pane commands, list-panes format

### Secondary (MEDIUM confidence)
- [tmux GitHub Issue #2882](https://github.com/tmux/tmux/issues/2882) - pane-exited hook issues
- [tmux GitHub Issue #3736](https://github.com/tmux/tmux/issues/3736) - per-pane hook workarounds
- [ink-text-input](https://github.com/vadimdemedes/ink-text-input) - API reference (not using, but informed approach)

### Tertiary (LOW confidence)
- WebSearch results for Node.js directory completion patterns - verified with official docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using existing dependencies only
- Architecture: HIGH - Extending established patterns from prior phases
- Pitfalls: HIGH - Derived from actual tmux issues and codebase analysis
- Tab completion: MEDIUM - Implementation details TBD during planning

**Research date:** 2026-01-26
**Valid until:** 2026-02-26 (30 days - stable domain)
