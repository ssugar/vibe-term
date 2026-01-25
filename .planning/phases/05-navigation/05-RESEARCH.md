# Phase 5: Navigation - Research

**Researched:** 2026-01-25
**Domain:** Ink keyboard input handling, tmux session switching, TUI navigation patterns
**Confidence:** HIGH

## Summary

This research covers implementing keyboard navigation for the Claude Code TUI HUD. The existing codebase already has the foundational infrastructure in place: `useInput` hook usage, `selectedIndex` state in Zustand, and partial keybinding implementation (q for quit, ? for help). Phase 5 completes this infrastructure by wiring up j/k and arrow key navigation, number hotkeys for quick-jump, Enter to select/jump-to session, and enhancing the visual selection indicator.

The key finding is that **Ink's `useInput` hook provides all necessary key detection** (arrow keys via `key.upArrow`/`key.downArrow`, Enter via `key.return`, character input via the `input` parameter). The main implementation work is:
1. Adding navigation key handlers to the existing `useInput` callback
2. Creating a tmux jump service using `switch-client` (when inside tmux) or `select-window` (when targeting specific panes)
3. Enhancing `SessionRow` to show visual selection highlight
4. Handling edge cases (no sessions, index bounds, non-tmux sessions)

**Primary recommendation:** Extend the existing `useInput` handler in `app.tsx` with j/k/arrow navigation, add a `tmuxJumpService.ts` for session jumping, and modify `SessionRow` to accept an `isSelected` prop for visual highlighting.

## Standard Stack

The existing stack is complete for this phase. No new dependencies needed.

### Core (Already Installed)
| Library | Version | Purpose | Relevance to Phase 5 |
|---------|---------|---------|---------------------|
| ink | 6.6.0 | Terminal UI framework | `useInput` hook for keyboard handling |
| react | 19.2.3 | Component framework | State management, props |
| zustand | 5.0.10 | State management | `selectedIndex` already in store |

### Existing Infrastructure
| File | What Exists | What Phase 5 Uses |
|------|-------------|-------------------|
| `src/app.tsx` | `useInput` handler with q/? bindings | Extend with j/k/arrow/Enter/number handlers |
| `src/stores/appStore.ts` | `selectedIndex`, `setSelectedIndex` | Already implemented, just needs wiring |
| `src/stores/types.ts` | `Session.tmuxTarget` | For jumping to tmux sessions |
| `src/services/tmuxService.ts` | `TmuxPane`, tmux detection | Basis for jump service |
| `src/components/SessionRow.tsx` | Session display | Add `isSelected` visual indicator |
| `src/components/SessionList.tsx` | Maps sessions to rows | Pass `isSelected` prop |

### No New Dependencies Needed
The existing stack handles all requirements:
- **Keyboard input:** Ink's `useInput` hook
- **State management:** Zustand store (already has `selectedIndex`)
- **tmux interaction:** `child_process.exec` via existing `execAsync`
- **Visual highlighting:** Ink's `Text` component with `inverse` or `backgroundColor`

## Architecture Patterns

### Recommended File Structure (Additions)
```
src/
├── services/
│   └── jumpService.ts      # NEW: Jump to session (tmux or notification)
├── components/
│   └── SessionRow.tsx      # MODIFY: Add isSelected prop
├── app.tsx                 # MODIFY: Add navigation handlers
└── stores/
    └── appStore.ts         # NO CHANGE: selectedIndex exists
```

### Pattern 1: Keyboard Navigation in useInput
**What:** Centralized keyboard handling with bounds checking
**When to use:** All navigation key handling
**Example:**
```typescript
// Source: Ink docs (verified via WebFetch) + existing app.tsx pattern
import { useInput } from 'ink';

useInput((input, key) => {
  const { sessions, selectedIndex, setSelectedIndex } = useAppStore.getState();

  // Skip navigation if in overlay state
  if (isConfirmingExit || showHelp) return;

  // j/k or arrow navigation
  if (input === 'j' || key.downArrow) {
    setSelectedIndex(Math.min(selectedIndex + 1, sessions.length - 1));
    return;
  }
  if (input === 'k' || key.upArrow) {
    setSelectedIndex(Math.max(selectedIndex - 1, 0));
    return;
  }

  // Number hotkeys (1-9)
  if (/^[1-9]$/.test(input)) {
    const targetIndex = parseInt(input, 10) - 1; // 1-based to 0-based
    if (targetIndex < sessions.length) {
      setSelectedIndex(targetIndex);
      // Optionally: jump immediately instead of just selecting
    }
    return;
  }

  // Enter to jump to selected session
  if (key.return) {
    const session = sessions[selectedIndex];
    if (session) {
      jumpToSession(session);
    }
    return;
  }
});
```

### Pattern 2: Visual Selection Indicator
**What:** Highlight the currently selected row with inverse colors or background
**When to use:** SessionRow component when `isSelected` is true
**Example:**
```typescript
// Source: TUI best practices (search results) + Ink Text component
interface SessionRowProps {
  session: Session;
  index: number;
  isSelected: boolean;
}

export function SessionRow({ session, index, isSelected }: SessionRowProps): React.ReactElement {
  // Selected row: inverse colors (swap foreground/background)
  // This provides high contrast and works across terminal themes

  if (isSelected) {
    return (
      <Box flexDirection="row">
        <Text inverse bold>
          [{index}] {statusEmoji} {paddedName} {/* ... */}
        </Text>
      </Box>
    );
  }

  // Non-selected row: normal rendering (existing code)
  return (/* existing implementation */);
}
```

### Pattern 3: tmux Session Jumping
**What:** Use `switch-client` when inside tmux, show notification otherwise
**When to use:** When user presses Enter on a selected session
**Example:**
```typescript
// Source: tmux docs (search results), existing tmuxService.ts patterns
import { execAsync } from './platform.js';

interface JumpResult {
  success: boolean;
  message: string;
}

/**
 * Jump to a session's terminal.
 * - If session is in tmux and we're in tmux: switch-client
 * - If session is in tmux but we're not: attach-session (opens new terminal)
 * - If session is not in tmux: show notification with location
 */
export async function jumpToSession(session: Session): Promise<JumpResult> {
  if (!session.inTmux || !session.tmuxTarget) {
    return {
      success: false,
      message: `Session not in tmux: ${session.projectName}`,
    };
  }

  try {
    // Check if we're currently in a tmux session
    const inTmux = !!process.env.TMUX;

    if (inTmux) {
      // switch-client switches current client to target session
      await execAsync(`tmux switch-client -t "${session.tmuxTarget}"`);
    } else {
      // attach-session when not in tmux (will take over terminal)
      // Note: This exits the HUD - may want to warn user
      await execAsync(`tmux attach-session -t "${session.tmuxTarget}"`);
    }

    return { success: true, message: `Jumped to ${session.projectName}` };
  } catch (error) {
    return {
      success: false,
      message: `Failed to jump: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
```

### Pattern 4: Bounds-Safe Index Management
**What:** Keep selectedIndex in valid range when sessions change
**When to use:** After sessions refresh, in navigation handlers
**Example:**
```typescript
// In useSessions hook or wherever sessions are updated
useEffect(() => {
  const { selectedIndex, setSelectedIndex, sessions } = useAppStore.getState();

  // Clamp selectedIndex to valid range
  if (sessions.length === 0) {
    setSelectedIndex(0);
  } else if (selectedIndex >= sessions.length) {
    setSelectedIndex(sessions.length - 1);
  }
}, [sessions]);
```

### Anti-Patterns to Avoid
- **Modifying selectedIndex without bounds check:** Always clamp to 0..sessions.length-1
- **Calling tmux attach-session from inside tmux:** Use switch-client instead to avoid nested sessions
- **Ignoring overlay state in navigation:** Don't navigate while help or exit confirmation is shown
- **Using color alone for selection:** Also use inverse/bold for accessibility

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Key detection | Manual stdin parsing | Ink's `useInput` | Handles arrow keys, modifiers, cross-platform |
| Selection state | Component-local useState | Zustand `selectedIndex` | Already exists in appStore |
| tmux targeting | Parse pane output | Existing `tmuxTarget` | Session type already has this field |
| Visual selection | ANSI escape codes | Ink's `inverse` prop | Handles terminal compatibility |

**Key insight:** The existing codebase already has 90% of the infrastructure. Phase 5 is primarily wiring and integration, not new architecture.

## Common Pitfalls

### Pitfall 1: Index Out of Bounds After Session Removal
**What goes wrong:** selectedIndex points to session that no longer exists after refresh
**Why it happens:** Sessions can disappear between refreshes; index not reclamped
**How to avoid:** Clamp selectedIndex whenever sessions array changes
**Warning signs:** Empty selection, crash on Enter, index errors in console

### Pitfall 2: Nested tmux Sessions
**What goes wrong:** Error "sessions should be nested with care" when trying to jump
**Why it happens:** Using `attach-session` when already inside tmux
**How to avoid:** Check `process.env.TMUX`, use `switch-client` when inside tmux
**Warning signs:** tmux error messages, HUD freezes on Enter

### Pitfall 3: Navigation During Overlays
**What goes wrong:** j/k changes selection while help overlay is visible
**Why it happens:** useInput handler doesn't check for overlay state first
**How to avoid:** Early return in useInput when `showHelp` or `isConfirmingExit` is true
**Warning signs:** Selection changes while overlay is displayed

### Pitfall 4: Non-tmux Session Jump Failure
**What goes wrong:** Enter does nothing or shows cryptic error for non-tmux sessions
**Why it happens:** No fallback handling for sessions not in tmux
**How to avoid:** Check `session.inTmux` before attempting jump, show helpful message
**Warning signs:** Silent failure, user confusion

### Pitfall 5: Selection Invisible on Some Terminals
**What goes wrong:** Selected row looks same as unselected on certain terminal themes
**Why it happens:** Relying only on background color which may match theme
**How to avoid:** Use `inverse` prop (swaps fg/bg) or combine with bold
**Warning signs:** Users report not seeing selection highlight

### Pitfall 6: Number Hotkeys Off-By-One
**What goes wrong:** Pressing "1" selects the second session
**Why it happens:** Display is 1-indexed, array is 0-indexed
**How to avoid:** Convert: `targetIndex = parseInt(input, 10) - 1`
**Warning signs:** Users report wrong session selected

## Code Examples

Verified patterns from official sources and existing codebase:

### Complete Navigation Handler
```typescript
// Source: Ink useInput docs + existing app.tsx pattern
// Add to existing useInput callback in app.tsx

useInput((input, key) => {
  const state = useAppStore.getState();
  const { sessions, selectedIndex } = state;

  // Handle Ctrl+C (existing code)
  if ((key.ctrl && input === 'c') || input === '\x03') {
    // ... existing Ctrl+C handling
    return;
  }

  // If confirming exit, handle y/n (existing code)
  if (state.isConfirmingExit) {
    // ... existing exit confirmation handling
    return;
  }

  // If showing help, any key dismisses (existing code)
  if (state.showHelp) {
    state.setShowHelp(false);
    return;
  }

  // === NEW: Navigation handlers ===

  // No navigation if no sessions
  if (sessions.length === 0) return;

  // j/k or arrow key navigation
  if (input === 'j' || key.downArrow) {
    state.setSelectedIndex(Math.min(selectedIndex + 1, sessions.length - 1));
    return;
  }
  if (input === 'k' || key.upArrow) {
    state.setSelectedIndex(Math.max(selectedIndex - 1, 0));
    return;
  }

  // Number hotkeys 1-9
  if (/^[1-9]$/.test(input)) {
    const targetIndex = parseInt(input, 10) - 1;
    if (targetIndex < sessions.length) {
      state.setSelectedIndex(targetIndex);
    }
    return;
  }

  // Enter to jump to selected session
  if (key.return) {
    const session = sessions[selectedIndex];
    if (session) {
      jumpToSession(session).then((result) => {
        if (!result.success) {
          state.setError(result.message);
        }
      });
    }
    return;
  }

  // q to quit (existing code)
  if (input === 'q') {
    state.setConfirmingExit(true);
    return;
  }

  // ? to show help (existing code)
  if (input === '?') {
    state.setShowHelp(true);
    return;
  }
});
```

### SessionList with Selection Pass-Through
```typescript
// Source: Existing SessionList.tsx pattern
import React from 'react';
import { Box } from 'ink';
import { useAppStore } from '../stores/appStore.js';
import { EmptyState } from './EmptyState.js';
import { SessionRow } from './SessionRow.js';

export function SessionList(): React.ReactElement {
  const sessions = useAppStore((state) => state.sessions);
  const selectedIndex = useAppStore((state) => state.selectedIndex);

  if (sessions.length === 0) {
    return <EmptyState />;
  }

  return (
    <Box flexDirection="column">
      {sessions.map((session, idx) => (
        <SessionRow
          key={session.id}
          session={session}
          index={idx + 1}
          isSelected={idx === selectedIndex}
        />
      ))}
    </Box>
  );
}
```

### SessionRow with Selection Highlight
```typescript
// Source: Existing SessionRow.tsx + TUI best practices
// Key change: Add isSelected prop and inverse styling

interface SessionRowProps {
  session: Session;
  index: number;
  isSelected: boolean;
}

export function SessionRow({ session, index, isSelected }: SessionRowProps): React.ReactElement {
  // ... existing setup code ...

  // Blocked sessions get special treatment regardless of selection
  if (session.status === 'blocked') {
    return (
      <Box flexDirection="row">
        <Text bold inverse={isSelected} backgroundColor={isSelected ? undefined : "red"} color={isSelected ? undefined : "white"}>
          [{index}] {statusEmoji} {paddedName} {paddedDuration} {modelDisplay}
        </Text>
        {/* ... rest of blocked row ... */}
      </Box>
    );
  }

  // Selected row: inverse colors for clear visibility
  if (isSelected) {
    return (
      <Box flexDirection="row">
        <Text inverse bold>
          [{index}] {statusEmoji} {paddedName}
        </Text>
        <Text inverse> {paddedDuration} {modelDisplay} </Text>
        {/* Subagent and context meter may need separate handling */}
        <Text> </Text>
        <ContextMeter percent={session.contextUsage ?? 0} width={12} />
        {session.inTmux && <Text dimColor color="cyan"> [T]</Text>}
      </Box>
    );
  }

  // Non-selected row: existing implementation
  return (/* existing code */);
}
```

### Jump Service
```typescript
// src/services/jumpService.ts
import { execAsync } from './platform.js';
import type { Session } from '../stores/types.js';

export interface JumpResult {
  success: boolean;
  message: string;
}

/**
 * Jump to a Claude session's terminal.
 *
 * For tmux sessions:
 * - If HUD is inside tmux: use switch-client to switch to session's pane
 * - If HUD is not in tmux: attach-session (takes over current terminal)
 *
 * For non-tmux sessions:
 * - Show error message (can't programmatically focus arbitrary terminals)
 */
export async function jumpToSession(session: Session): Promise<JumpResult> {
  // Non-tmux sessions: can't jump programmatically
  if (!session.inTmux || !session.tmuxTarget) {
    return {
      success: false,
      message: `Cannot jump to non-tmux session: ${session.projectName}`,
    };
  }

  try {
    const isHudInTmux = !!process.env.TMUX;

    if (isHudInTmux) {
      // Parse target to get session name for switch-client
      // tmuxTarget format: "session:window.pane"
      const colonIdx = session.tmuxTarget.lastIndexOf(':');
      const sessionName = colonIdx > 0
        ? session.tmuxTarget.substring(0, colonIdx)
        : session.tmuxTarget;

      // switch-client changes current tmux client to target session
      // Then select the specific window.pane
      await execAsync(`tmux switch-client -t "${sessionName}"`);
      await execAsync(`tmux select-window -t "${session.tmuxTarget}"`);

      return { success: true, message: `Switched to ${session.projectName}` };
    } else {
      // Not in tmux: attach-session will take over this terminal
      // This effectively exits the HUD
      const colonIdx = session.tmuxTarget.lastIndexOf(':');
      const sessionName = colonIdx > 0
        ? session.tmuxTarget.substring(0, colonIdx)
        : session.tmuxTarget;

      await execAsync(`tmux attach-session -t "${sessionName}"`);
      return { success: true, message: `Attached to ${session.projectName}` };
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: `Jump failed: ${msg}`,
    };
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| focus via package | Ink built-in `useFocus` | Ink 3+ | Only needed for Tab navigation between components |
| Manual ANSI for highlight | Ink's `inverse` prop | Ink 3+ | Cross-terminal compatible |
| Global key handlers | Component-scoped `useInput` | Ink 3+ | Cleaner, no manual cleanup |
| xdotool for window focus | tmux switch-client | N/A | More reliable for tmux-based workflow |

**Current best practices:**
- Use `inverse` for selection highlight (swaps fg/bg, works in all themes)
- Use `switch-client` not `attach-session` when already in tmux
- Centralize keyboard handling in main App component
- Check overlay state before processing navigation keys

## Open Questions

Things that couldn't be fully resolved:

1. **Non-tmux session jumping**
   - What we know: Can't programmatically focus arbitrary terminal windows reliably
   - What's unclear: Should we try xdotool/wmctrl, or just show "not in tmux" message?
   - Recommendation: Show clear message for non-tmux sessions; defer xdotool to future enhancement

2. **HUD behavior when jumping from outside tmux**
   - What we know: `attach-session` will take over terminal, effectively replacing HUD
   - What's unclear: Should we warn user? Should we prevent this?
   - Recommendation: Allow it but show brief warning; user likely wants this behavior

3. **Selection persistence across refresh**
   - What we know: selectedIndex persists, but session order might change
   - What's unclear: Should selection follow the session (by ID) or stay at index?
   - Recommendation: Keep index-based (simpler); let selection move if sessions reorder

## Sources

### Primary (HIGH confidence)
- [Ink GitHub README](https://github.com/vadimdemedes/ink) - useInput hook API, key object properties
- [Ink raw README](https://raw.githubusercontent.com/vadimdemedes/ink/master/readme.md) - Complete useInput documentation
- Existing codebase files: `app.tsx`, `appStore.ts`, `tmuxService.ts` - Current implementation patterns
- npm info ink@6.6.0 - Version verification

### Secondary (MEDIUM confidence)
- [tmux documentation](https://tmuxcheatsheet.com/) - switch-client vs attach-session
- [tao-of-tmux](https://tao-of-tmux.readthedocs.io/en/latest/manuscript/05-session.html) - Session switching from inside tmux
- [Building Reactive CLIs with Ink](https://dev.to/skirianov/building-reactive-clis-with-ink-react-cli-library-4jpa) - Navigation patterns

### Tertiary (LOW confidence)
- WebSearch results on xdotool/wmctrl - General X11 window focus (not recommended for this use case)
- WebSearch results on TUI navigation best practices - Visual indicator guidelines

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using existing verified stack
- Architecture: HIGH - Extending existing patterns
- Pitfalls: HIGH - Based on code analysis and verified tmux behavior
- Code examples: HIGH - Based on Ink docs and existing codebase

**Research date:** 2026-01-25
**Valid until:** 2026-02-25 (30 days - stable, minimal external dependencies)
