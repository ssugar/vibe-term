# Phase 11: Navigation Integration - Research

**Researched:** 2026-01-27
**Domain:** Keyboard navigation validation in tmux-integrated architecture
**Confidence:** HIGH

## Summary

Phase 11 is a **validation phase**, not an implementation phase. The navigation code already exists and works in the codebase (implemented across Phases 5, 9, and 10). This phase verifies that all v1.0 navigation patterns work correctly in the new tmux-integrated v2.0 architecture with its HUD strip UI, pane swapping, and internal/external session distinction.

The existing navigation implementation in `app.tsx` (lines 261-408) already handles:
- j/k and arrow key navigation for session selection (lines 263-289)
- Number hotkeys 1-9 for quick-jump (lines 291-298)
- Enter to switch to selected session (lines 300-369)
- q to quit with detach/kill options (lines 402-404)
- ? to show help overlay (lines 405-406)

The key validation concerns are:
1. **Left/right arrows** work for horizontal tab strip (implemented in lines 277-289)
2. **Enter** correctly distinguishes internal vs external sessions (implemented in lines 301-369)
3. **Quit** properly cleans up the tmux session (implemented in lines 104-118)
4. **Help** displays correctly in the 2-line HUD format (implemented in HudStrip.tsx lines 103-106)

**Primary recommendation:** Create test scenarios to validate each navigation path works correctly, with particular attention to edge cases (no sessions, blocked sessions, external sessions, session death during navigation).

## Standard Stack

No new libraries required. This phase validates existing infrastructure.

### Core (Already Installed)
| Library | Version | Purpose | Relevance to Phase 11 |
|---------|---------|---------|----------------------|
| ink | ^6.6.0 | Terminal UI framework | `useInput` hook for keyboard handling |
| react | ^19.2.3 | Component framework | State management, props |
| zustand | ^5.0.10 | State management | `selectedIndex`, `activeSessionId` already in store |

### Existing Infrastructure (No Changes Needed)
| File | What Exists | Phase 11 Use |
|------|-------------|--------------|
| `src/app.tsx` | Complete navigation handler (lines 261-408) | Validate all key paths work |
| `src/stores/appStore.ts` | `selectedIndex`, `activeSessionId`, actions | State already wired |
| `src/components/HudStrip.tsx` | Help text display (line 105) | Verify help shows correctly |
| `src/components/TabStrip.tsx` | Tab selection highlight, scrolling | Verify visual feedback |
| `src/components/Tab.tsx` | Selected/active visual states | Verify all 4 states render correctly |
| `src/services/paneSessionManager.ts` | Pane swapping, cleanup | Verify cleanup on q |

## Architecture Patterns

### Already Implemented Navigation Flow

```
User presses key
    |
    v
useInput in app.tsx
    |
    +--> j/k/arrows: setSelectedIndex (bounds-checked)
    |
    +--> 1-9: setSelectedIndex (quick-jump)
    |
    +--> Enter:
    |      |
    |      +--> Internal session: swap-pane to main, set activeSessionId
    |      |
    |      +--> External session: select-pane (jump to external tmux)
    |      |
    |      +--> Non-tmux: show error
    |
    +--> q: quitMode='confirming'
    |      |
    |      +--> d: tmux detach-client
    |      |
    |      +--> k: tmux kill-session
    |      |
    |      +--> n/Esc: cancel
    |
    +--> ?: setShowHelp(true)
```

### Visual State Machine (Already Implemented in Tab.tsx)

```
Tab Visual States (priority order):
1. Blocked: red background, white bold (highest)
2. Active + Selected: inverse + underline
3. Active only: underline
4. Selected only: inverse
5. Normal: default colors
6. External: dimColor
```

### Session Type Handling (Already Implemented)

| Session Type | inTmux | isExternal | Enter Behavior | Cleanup on q |
|--------------|--------|------------|----------------|--------------|
| Internal managed | true | false | swap-pane | respawn-pane |
| External tmux | true | true | select-pane | NO cleanup |
| Non-tmux | false | true | show error | NO cleanup |

### Anti-Patterns Already Avoided

The codebase correctly avoids:
- **Using window.pane indices** - Uses stable paneId (like %10) instead
- **swap-pane for external sessions** - Uses select-pane for cross-session jumps
- **Cleaning up external panes** - Only cleans internal session panes
- **Navigation during overlays** - Checks `showHelp`, `isConfirmingExit`, `quitMode` first

## Don't Hand-Roll

Everything needed is already implemented. Phase 11 adds NO new code for navigation.

| Problem | Already Solved In | How |
|---------|-------------------|-----|
| Key detection | `app.tsx` useInput | Ink's `useInput` with full key handling |
| Selection state | Zustand store | `selectedIndex`, `setSelectedIndex` |
| Session switching | `app.tsx` lines 300-369 | Internal swap-pane, external select-pane |
| Quit options | `app.tsx` lines 104-118 | detach-client or kill-session |
| Help display | `HudStrip.tsx` line 105 | Shows in line 2 with key hints |

**Key insight:** This is a validation phase. All navigation is implemented. The work is testing and verification, not implementation.

## Common Pitfalls

### Pitfall 1: Forgetting Overlay State Checks
**What goes wrong:** Navigation keys work during help overlay or quit prompt
**Why it happens:** Missing early-return checks in useInput
**Current status:** ALREADY HANDLED in app.tsx lines 97-118
**Verification:** Press ?, then j/k - selection should not change

### Pitfall 2: External Session Cleanup
**What goes wrong:** Pressing q kills external session panes
**Why it happens:** Cleanup logic doesn't check isExternal flag
**Current status:** ALREADY HANDLED in useSessions.ts lines 55-61
**Verification:** External sessions should survive HUD quit

### Pitfall 3: Blocked Session at Wrong Position
**What goes wrong:** Blocked internal session appears on right with external sessions
**Why it happens:** isExternal check not prioritized over blocked check
**Current status:** ALREADY HANDLED in TabStrip.tsx lines 76-84
**Verification:** Blocked internal sessions should pin LEFT, blocked external RIGHT

### Pitfall 4: Index Out of Bounds on Session Death
**What goes wrong:** selectedIndex points to removed session, causing crash or empty selection
**Why it happens:** Session removed but index not clamped
**Current status:** PARTIALLY HANDLED - useSessions clears activeSessionId but doesn't clamp selectedIndex
**Verification needed:** Kill active session, verify selectedIndex stays valid

### Pitfall 5: Non-tmux Session Enter Handling
**What goes wrong:** Enter on non-tmux session causes error or silent failure
**Why it happens:** Missing inTmux check before swap-pane
**Current status:** ALREADY HANDLED in app.tsx lines 306-312
**Verification:** Non-tmux session shows "Cannot switch to non-tmux session" error

### Pitfall 6: Help Text Mismatch
**What goes wrong:** Help text shows wrong keys for new tab strip
**Why it happens:** Help text not updated for horizontal navigation
**Current status:** ALREADY UPDATED in HudStrip.tsx line 105
**Verification:** Help shows arrows + j/k + 1-9 + Enter + q + ?

## Code Examples

All code already exists. Key reference points:

### Navigation Handler (app.tsx lines 261-298)
```typescript
// Navigation key handling (only when sessions exist)
if (sessions.length > 0) {
  // j/k and arrow key navigation
  if (input === 'j' || key.downArrow) {
    useAppStore.getState().setSelectedIndex(
      Math.min(selectedIndex + 1, sessions.length - 1)
    );
    return;
  }
  if (input === 'k' || key.upArrow) {
    useAppStore.getState().setSelectedIndex(
      Math.max(selectedIndex - 1, 0)
    );
    return;
  }

  // Left/right arrow navigation for horizontal tab strip
  if (key.leftArrow) {
    useAppStore.getState().setSelectedIndex(
      Math.max(selectedIndex - 1, 0)
    );
    return;
  }
  if (key.rightArrow) {
    useAppStore.getState().setSelectedIndex(
      Math.min(selectedIndex + 1, sessions.length - 1)
    );
    return;
  }

  // Number hotkeys 1-9 for quick-jump
  if (/^[1-9]$/.test(input)) {
    const targetIndex = parseInt(input, 10) - 1;
    if (targetIndex < sessions.length) {
      useAppStore.getState().setSelectedIndex(targetIndex);
    }
    return;
  }
}
```

### Internal vs External Session Switching (app.tsx lines 315-366)
```typescript
// Check if session is internal (managed by claude-terminal) or external
if (!session.isExternal && session.paneId) {
  // Internal session: swap pane into main position using stable paneId
  execAsync('tmux show-environment CLAUDE_TERMINAL_HUD_PANE')
    .then(({ stdout }) => {
      const hudPaneId = stdout.split('=')[1]?.trim();
      return execAsync(`tmux list-panes -F '#{pane_id}'`)
        .then(({ stdout: paneList }) => {
          const panes = paneList.trim().split('\n');
          const mainPaneId = panes.find(p => p !== hudPaneId) || panes[1];
          // Swap session's pane into main position
          return execAsync(`tmux swap-pane -s ${session.paneId} -t ${mainPaneId}`)
            .then(() => execAsync(`tmux select-pane -t ${mainPaneId}`));
        });
    })
    .then(() => {
      useAppStore.getState().setActiveSessionId(session.id);
    });
} else {
  // External session or no paneId: use select-pane to focus directly
  const target = session.paneId || session.tmuxTarget;
  execAsync(`tmux select-pane -t "${target}"`)
    .then(() => {
      useAppStore.getState().setActiveSessionId(session.id);
    });
}
```

### Quit Mode Handling (app.tsx lines 104-118)
```typescript
// Handle quit confirmation keys (detach/kill prompt)
if (quitMode === 'confirming') {
  if (input === 'd') {
    // Detach: session stays alive, user returns to original terminal
    spawnSync('tmux', ['detach-client'], { stdio: 'inherit' });
    exit();
  } else if (input === 'k') {
    // Kill: cleanup completely, destroy the tmux session
    spawnSync('tmux', ['kill-session', '-t', TMUX_SESSION_NAME], { stdio: 'inherit' });
    exit();
  } else if (key.escape || input === 'n') {
    // Cancel: return to normal HUD
    setQuitMode('none');
  }
  return;
}
```

### Help Text (HudStrip.tsx line 105)
```typescript
{showHelpText && (
  <Text dimColor>
    {figures.arrowLeft}/{figures.arrowRight}: scroll | Enter: jump | j/k: nav | 1-9: quick | q: quit | ?: help
  </Text>
)}
```

## State of the Art

| Aspect | v1.0 Approach | v2.0 Approach | Impact |
|--------|---------------|---------------|--------|
| Selection visual | Full row inverse | Tab inverse/underline | Compact, 4 states |
| Session switch | switch-client | swap-pane (internal), select-pane (external) | Stays in HUD |
| Quit | Ctrl+C confirm | q with detach/kill choice | Preserves sessions |
| Help | Full overlay | Single line hint | Fits 2-line HUD |

**Already implemented:**
- Horizontal tab navigation (left/right arrows)
- Internal/external session distinction
- Pane swapping for session switching
- Detach vs kill quit options

## Open Questions

Things that need validation, not research:

1. **selectedIndex bounds after session death**
   - What we know: activeSessionId is cleared in useSessions.ts
   - What's unclear: Is selectedIndex clamped when sessions array shrinks?
   - Recommendation: Verify selectedIndex stays valid; add bounds check if needed

2. **Arrow key behavior at boundaries**
   - What we know: j/k clamp to 0..length-1
   - What's unclear: Left/right arrows have same clamping?
   - Recommendation: Test at first and last session

3. **Quick-jump to non-existent index**
   - What we know: 1-9 checks `targetIndex < sessions.length`
   - What's unclear: What if user presses 5 with only 3 sessions?
   - Recommendation: Verify no-op behavior (current code should ignore)

## Validation Test Plan

### NAV-01: j/k and arrow navigation
- [ ] j moves selection down (wraps at end? or clamps?)
- [ ] k moves selection up (wraps at start? or clamps?)
- [ ] Down arrow same as j
- [ ] Up arrow same as k
- [ ] Left arrow moves selection left (for horizontal tabs)
- [ ] Right arrow moves selection right
- [ ] Tab strip auto-scrolls to keep selection visible
- [ ] Selection highlight (inverse) is visible in all terminal themes

### NAV-02: Quick-jump with 1-9
- [ ] 1 selects first session (index 0)
- [ ] 5 selects fifth session (index 4) if exists
- [ ] 9 selects ninth session if exists
- [ ] Out-of-range number (e.g., 9 with 3 sessions) is ignored
- [ ] 0 is not a hotkey (ignored)

### NAV-03: Enter to switch session
- [ ] Enter on internal session: swap-pane works, activeSessionId updates
- [ ] Enter on external session: select-pane works, jumps to other tmux session
- [ ] Enter on non-tmux session: shows error "Cannot switch to non-tmux session"
- [ ] Enter with no sessions: no-op (guard exists at line 262)

### NAV-04: q to quit
- [ ] q shows detach/kill prompt on line 2
- [ ] d detaches (tmux session stays, user returns to shell)
- [ ] k kills (tmux session destroyed with all panes)
- [ ] n or Esc cancels prompt
- [ ] Internal session panes are cleaned up on kill
- [ ] External session panes survive kill

### NAV-05: ? for help
- [ ] ? shows help line with key hints
- [ ] Any key dismisses help
- [ ] Navigation keys during help only dismiss (don't also navigate)
- [ ] Help text matches current key bindings

### Edge Cases
- [ ] Navigation with 0 sessions: no crash, selection stays at 0
- [ ] Navigation with 1 session: selection can't go out of bounds
- [ ] Session dies during navigation: selectedIndex stays valid
- [ ] Rapid key presses: no race conditions in state updates
- [ ] Blocked session navigation: can select and Enter shows error
- [ ] External session at right after | divider: correctly selectable

## Sources

### Primary (HIGH confidence)
- Existing codebase: `app.tsx`, `HudStrip.tsx`, `TabStrip.tsx`, `Tab.tsx`, `useSessions.ts`
- Phase 5 RESEARCH.md - Original navigation implementation research
- Phase 9-10 RESEARCH.md - Pane architecture and session lifecycle
- STATE.md - Accumulated decisions and learnings

### Secondary (MEDIUM confidence)
- Ink documentation (via training data) - useInput hook behavior
- tmux man page - swap-pane, select-pane, kill-session, detach-client

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new dependencies, all existing
- Architecture: HIGH - All patterns already implemented
- Pitfalls: HIGH - Based on code analysis and prior phase learnings
- Validation plan: HIGH - Derived directly from requirements

**Research date:** 2026-01-27
**Valid until:** 2026-02-27 (30 days - validation phase, stable)
