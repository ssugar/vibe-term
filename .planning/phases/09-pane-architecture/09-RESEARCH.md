# Phase 9: Pane Architecture - Research

**Researched:** 2026-01-26
**Domain:** tmux pane manipulation / multi-session switching
**Confidence:** HIGH

## Summary

This phase implements session switching via native tmux pane operations. The goal is to allow users to switch between multiple Claude sessions in the main pane area while the HUD strip stays fixed at top, with one-keypress return to HUD (Ctrl+h).

The research investigated three primary areas: (1) tmux pane manipulation commands for creating and switching between session panes, (2) techniques for showing/hiding panes or switching pane content, and (3) keybinding patterns that work reliably without conflicts.

The key insight is that tmux supports multiple architectural approaches: we can use **multiple panes with visibility swapping** (swap-pane), **break-pane/join-pane** for hiding panes in background windows, or **respawn-pane** to change what runs in the main pane. Given the CONTEXT.md decision that "each session gets its own tmux pane," the recommended approach is to use swap-pane to exchange the visible main pane content with hidden session panes stored in a scratch window.

**Primary recommendation:** Use a scratch window to hold inactive session panes, and swap-pane to exchange the active session pane with the main visible pane. Store pane IDs in tmux environment variables for reliable targeting.

## Standard Stack

The established tools for this domain:

### Core (Already Used)
| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| tmux | 3.3+ | Pane/window management | Already in use, native reliability |
| execAsync | -- | Shell command execution | Existing pattern from Phase 7/8 |
| tmux environment vars | -- | Store pane IDs | Persist across pane operations |

### Supporting (Already Used)
| Tool | Purpose | When to Use |
|------|---------|-------------|
| tmux list-panes | Query pane state | Finding pane IDs and counts |
| tmux display-message | Get current pane info | Retrieving #{pane_id} |
| spawnSync | Synchronous tmux ops | Startup-time operations |

### Not Needed
| Instead of | Don't Use | Reason |
|------------|-----------|--------|
| display-popup | swap-pane | Popups close on escape, not persistent sessions |
| node-pty | tmux panes | Already decided against embedded terminal |
| External tmux plugins | Native commands | No new dependencies per prior decisions |

**Installation:**
```bash
# No new dependencies needed
# tmux 3.3+ already available
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── services/
│   ├── tmuxService.ts         # EXTEND: Add pane swap/session management
│   └── paneSessionManager.ts  # NEW: Coordinate session-pane mapping
├── stores/
│   └── appStore.ts            # EXTEND: Add activeSessionId
└── app.tsx                    # MODIFY: Handle Enter key for session switch
```

### Pattern 1: Scratch Window for Hidden Panes
**What:** Store inactive session panes in a hidden "scratch" window
**When to use:** When sessions need to persist but not be visible
**Why:** tmux doesn't have native "hidden pane" support; using a separate window is the standard workaround

```typescript
// Source: tmux/tmux Wiki, hidden pane workaround
// Create scratch window for storing inactive session panes
async function ensureScratchWindow(): Promise<string> {
  const sessionName = 'claude-terminal';
  const scratchWindow = 'scratch';

  // Check if scratch window exists
  const { stdout } = await execAsync(
    `tmux list-windows -t ${sessionName} -F '#{window_name}'`
  );

  if (!stdout.includes(scratchWindow)) {
    // Create scratch window (detached, won't switch to it)
    await execAsync(
      `tmux new-window -d -t ${sessionName} -n ${scratchWindow}`
    );
  }

  return `${sessionName}:${scratchWindow}`;
}
```

### Pattern 2: Swap-Pane for Session Switching
**What:** Exchange visible main pane with a hidden session pane
**When to use:** User presses Enter on a session tab
**Example:**
```typescript
// Source: tmux man page - swap-pane command
// Swap current main pane content with target session pane
async function switchToSession(
  mainPaneId: string,
  targetSessionPaneId: string
): Promise<void> {
  // swap-pane -s source -t target
  // After swap, targetSessionPaneId content is now in main pane location
  await execAsync(
    `tmux swap-pane -s ${targetSessionPaneId} -t ${mainPaneId}`
  );

  // Focus the main pane (now showing target session)
  await execAsync(`tmux select-pane -t ${mainPaneId}`);
}
```

### Pattern 3: Pane ID Storage in tmux Environment
**What:** Store pane IDs in tmux environment for persistence across operations
**When to use:** Track which pane belongs to which session
**Example:**
```typescript
// Source: tmux man page - set-environment command
// Store session-to-pane mapping in tmux environment
async function registerSessionPane(sessionId: string, paneId: string): Promise<void> {
  // Use session-scoped environment (not global)
  await execAsync(
    `tmux set-environment CLAUDE_PANE_${sessionId} ${paneId}`
  );
}

async function getSessionPane(sessionId: string): Promise<string | null> {
  try {
    const { stdout } = await execAsync(
      `tmux show-environment CLAUDE_PANE_${sessionId}`
    );
    // Output format: "CLAUDE_PANE_123=%45"
    const match = stdout.match(/=(.+)/);
    return match ? match[1].trim() : null;
  } catch {
    return null; // Variable not set
  }
}
```

### Pattern 4: Keybinding with -n Flag (No Prefix)
**What:** Bind Ctrl+h directly without requiring tmux prefix
**When to use:** Return-to-HUD from any pane
**Warning:** Ctrl+h conflicts with backspace in some terminals
**Example:**
```typescript
// Source: tmux man page - bind-key -n
// WARNING: C-h may conflict with Backspace on some terminals
// Alternative: Use tmux prefix + h, or consider C-b h
async function setupHudBinding(hudPaneId: string): Promise<void> {
  // -n means "no prefix needed"
  await execAsync(
    `tmux bind-key -n C-h select-pane -t ${hudPaneId}`
  );
}
```

### Pattern 5: Respawn-Pane for Starting Sessions
**What:** Start or restart a command in an existing pane
**When to use:** Creating a new session in the main pane or scratch pane
**Example:**
```typescript
// Source: tmux Wiki Advanced Use
// Start Claude session in a specific pane
async function spawnSessionInPane(
  paneId: string,
  projectPath: string
): Promise<void> {
  // -k kills existing process if any
  // -c sets working directory
  await execAsync(
    `tmux respawn-pane -k -t ${paneId} -c "${projectPath}" "claude"`
  );
}
```

### Anti-Patterns to Avoid
- **Creating new panes per session switch:** Use swap-pane instead; panes are expensive
- **Using display-popup for sessions:** Popups close on Escape, not suitable for persistent sessions
- **Global tmux config changes:** Keep all options scoped to session (-t flag)
- **Relying on pane index:** Use pane IDs (%N format) which are stable; indices can change

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Pane visibility toggle | Custom show/hide state | swap-pane + scratch window | tmux native, reliable |
| Pane content switching | respawn per switch | swap-pane | Preserves session state |
| Pane ID tracking | JavaScript object | tmux environment vars | Survives process restart |
| Session-in-pane | node-pty embedding | tmux respawn-pane | Already decided tmux-native |
| Prefix-less keybindings | Multiple key combos | bind-key -n | Single key works anywhere |

**Key insight:** tmux's pane manipulation commands (swap-pane, join-pane, break-pane) handle the hard work. Don't try to recreate pane management in JavaScript.

## Common Pitfalls

### Pitfall 1: Ctrl+h Backspace Conflict
**What goes wrong:** Binding Ctrl+h breaks backspace in terminals that map backspace to ^H
**Why it happens:** Historical terminal convention: Backspace sends ^H (Ctrl+H) in some configurations
**How to avoid:** Test on target terminals; provide fallback binding (prefix+h); document the conflict
**Warning signs:** Backspace stops working in vim/emacs/readline after setting up HUD binding
**Mitigation:**
```typescript
// Consider extended keys or alternative binding
// Test: stty -a | grep erase
// If output shows "erase = ^H", Ctrl+h binding will conflict
```

### Pitfall 2: Pane Index vs Pane ID Confusion
**What goes wrong:** Targeting pane by index (0, 1, 2) instead of ID (%0, %1) leads to wrong pane
**Why it happens:** Pane indices change when panes are swapped/killed; IDs are stable
**How to avoid:** Always use %N format for pane IDs; store in environment variables
**Warning signs:** Session switch targets wrong session intermittently

### Pitfall 3: Lost Panes After Swap
**What goes wrong:** After swap-pane, can't find the pane that was swapped out
**Why it happens:** Not tracking which pane went where
**How to avoid:** Store mapping of session ID to pane ID; update mapping after swaps
**Warning signs:** Session "disappears" after switching away and back

### Pitfall 4: Scratch Window Visible to User
**What goes wrong:** User can switch to scratch window and see all hidden session panes
**Why it happens:** Scratch window is a real window that shows in tmux window list
**How to avoid:**
- Could kill scratch window when detaching (recreate on attach)
- Or accept it as implementation detail
- Or use last-window keybinding carefully
**Warning signs:** User confused by extra window with multiple panes

### Pitfall 5: Race Conditions in Async Pane Operations
**What goes wrong:** Swap completes before previous command finishes
**Why it happens:** Multiple execAsync calls not properly sequenced
**How to avoid:** Await each tmux command; use && chaining for atomic operations
**Warning signs:** Intermittent "pane not found" errors

### Pitfall 6: Session Exits While Hidden
**What goes wrong:** Session in scratch window exits; pane becomes "dead"
**Why it happens:** Claude process ends while user working in different session
**How to avoid:**
- Set `remain-on-exit on` for session panes
- Detect dead panes and clean up
- Re-run session detection to update HUD
**Warning signs:** Swap brings up blank/dead pane

## Code Examples

Verified patterns from official sources:

### Complete Session Switch Flow
```typescript
// Source: Synthesized from tmux man page patterns
interface SwitchResult {
  success: boolean;
  error?: string;
}

async function switchSession(
  sessionId: string,
  mainPaneId: string,
  scratchWindow: string
): Promise<SwitchResult> {
  // Get current active session's pane (if any)
  const currentActivePaneId = await getEnvironment('CLAUDE_ACTIVE_PANE');

  // Get target session's pane
  const targetPaneId = await getEnvironment(`CLAUDE_PANE_${sessionId}`);

  if (!targetPaneId) {
    return { success: false, error: 'Session pane not found' };
  }

  try {
    if (currentActivePaneId) {
      // Swap current active to scratch, target to main
      // First: swap current active with target (puts current in scratch area)
      await execAsync(`tmux swap-pane -s ${mainPaneId} -t ${targetPaneId}`);
    } else {
      // No active session yet, just swap target to main
      await execAsync(`tmux swap-pane -s ${targetPaneId} -t ${mainPaneId}`);
    }

    // Update active pane tracking
    await execAsync(`tmux set-environment CLAUDE_ACTIVE_PANE ${targetPaneId}`);
    await execAsync(`tmux set-environment CLAUDE_ACTIVE_SESSION ${sessionId}`);

    // Focus main pane
    await execAsync(`tmux select-pane -t ${mainPaneId}`);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
```

### Creating Session Pane in Scratch Window
```typescript
// Source: tmux man page - split-window, respawn-pane
async function createSessionPane(
  scratchWindow: string,
  sessionId: string,
  projectPath: string
): Promise<string> {
  // Create new pane in scratch window
  const { stdout } = await execAsync(
    `tmux split-window -t ${scratchWindow} -P -F '#{pane_id}' -c "${projectPath}"`
  );
  const paneId = stdout.trim();

  // Register this pane for this session
  await execAsync(
    `tmux set-environment CLAUDE_PANE_${sessionId} ${paneId}`
  );

  // Start Claude in the pane
  await execAsync(
    `tmux send-keys -t ${paneId} 'claude' Enter`
  );

  return paneId;
}
```

### Active Marker Tracking
```typescript
// Source: CONTEXT.md requirement - distinct active marker
interface SessionDisplayState {
  selectedIndex: number;      // Where user is highlighting (cursor)
  activeSessionId: string | null;  // What's actually in main pane
}

// In Tab component, apply different styling:
// - isSelected: inverse colors (user's cursor)
// - isActive: underline or bold (what's in main pane)
// - isBlocked: red background (always)
```

### Cleanup on Session Exit
```typescript
// Source: tmux remain-on-exit pattern
async function handleSessionExit(sessionId: string): Promise<void> {
  const paneId = await getEnvironment(`CLAUDE_PANE_${sessionId}`);
  if (!paneId) return;

  // Kill the dead pane
  try {
    await execAsync(`tmux kill-pane -t ${paneId}`);
  } catch {
    // Pane may already be gone
  }

  // Clean up environment
  await execAsync(`tmux set-environment -u CLAUDE_PANE_${sessionId}`);

  // If this was the active session, clear active tracking
  const activeSessionId = await getEnvironment('CLAUDE_ACTIVE_SESSION');
  if (activeSessionId === sessionId) {
    await execAsync(`tmux set-environment -u CLAUDE_ACTIVE_PANE`);
    await execAsync(`tmux set-environment -u CLAUDE_ACTIVE_SESSION`);
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| display-popup for scratch | swap-pane + scratch window | tmux 3.2+ | Popups weren't persistent |
| Pane index targeting | Pane ID (%N) targeting | Always | IDs are stable, indices shift |
| Global keybindings | Session-scoped (-t flag) | Best practice | Doesn't affect other sessions |
| break-pane/join-pane | swap-pane | For quick toggle | swap is simpler for toggle pattern |

**Deprecated/outdated:**
- **display-popup for sessions:** Popups close on Escape; not suitable for persistent sessions
- **Pane index references:** Always use pane IDs for stability

## Open Questions

Things that couldn't be fully resolved:

1. **Ctrl+h Backspace Conflict Severity**
   - What we know: Some terminals send ^H for backspace, conflicting with C-h binding
   - What's unclear: How many users' terminals are affected; which emulators
   - Recommendation: Test on WSL2 (Windows Terminal), verify behavior; have fallback plan
   - **Resolution approach:** If conflict, use Ctrl+g (current binding) or prefix+h

2. **External Sessions Pane Management**
   - What we know: External Claude sessions show in HUD; they have their own tmux targets
   - What's unclear: Should we create scratch panes for externals, or switch windows?
   - Recommendation: For external sessions, use switch-client to their session rather than swap-pane
   - **Decision needed:** Clarify behavior for external vs internal sessions

3. **Scratch Window Housekeeping**
   - What we know: Scratch window accumulates dead panes as sessions exit
   - What's unclear: Best cleanup strategy - periodic scan, on-exit hook, or accept drift
   - Recommendation: Clean up on session exit detection (during refresh cycle)

4. **Empty Main Pane Initial State**
   - What we know: CONTEXT.md says "show empty state with instructions" when no session selected
   - What's unclear: Should main pane run a process showing instructions, or be literally empty?
   - Recommendation: Create instruction pane on startup; swap it out when first session activates

## Sources

### Primary (HIGH confidence)
- [tmux man page](https://man7.org/linux/man-pages/man1/tmux.1.html) - swap-pane, select-pane, bind-key, respawn-pane, set-environment
- [tmux Wiki Advanced Use](https://github.com/tmux/tmux/wiki/Advanced-Use) - respawn-pane, remain-on-exit patterns
- Existing codebase (tmuxService.ts, startup.ts) - established patterns for tmux interaction

### Secondary (MEDIUM confidence)
- [Hidden pane GitHub issue #2888](https://github.com/tmux/tmux/issues/2888) - scratch window workaround confirmed as standard
- [tmuxai.dev](https://tmuxai.dev/tmux-join-pane/) - join-pane syntax and examples
- [tmux send-keys patterns](https://blog.damonkelley.me/2016/09/07/tmux-send-keys) - pane targeting with % prefix

### Tertiary (LOW confidence)
- [Ctrl+h backspace conflict](https://github.com/tmux/tmux/issues/321) - documents the issue but unclear how common
- Various tmux cheatsheets - general reference, cross-verified with man page

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using existing tmux commands, well-documented
- Architecture: HIGH - swap-pane pattern is established workaround for hidden panes
- Pitfalls: MEDIUM - Ctrl+h conflict needs testing; cleanup strategy needs validation
- Code examples: MEDIUM - Synthesized from docs, not production-tested yet

**Research date:** 2026-01-26
**Valid until:** 90 days (tmux 3.x is stable, patterns are established)
