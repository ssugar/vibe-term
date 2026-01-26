# Phase 8: HUD Strip UI - Research

**Researched:** 2026-01-26
**Domain:** Ink React terminal UI / horizontal tab layout
**Confidence:** HIGH

## Summary

This phase transforms the current v1.0 full-screen session list into a compact horizontal tab strip (1-2 lines). The research focused on three areas: (1) how to create horizontal layouts in Ink, (2) how to measure terminal width for responsive overflow handling, and (3) how to implement scrolling tabs with indicators.

The v1.0 codebase already uses Ink 6.6.0 with React 19, Zustand for state, and established patterns for session rendering via `SessionRow`. The transformation requires replacing the vertical `SessionList` with a horizontal `TabStrip` that handles overflow via scroll with arrow indicators.

Key insight: Ink's Flexbox model (via Yoga) fully supports horizontal layouts with `flexDirection="row"`. Terminal width is available via `process.stdout.columns` or Ink's `useStdout` hook. Text truncation is built into Ink's `<Text wrap="truncate">` prop. No new dependencies are needed.

**Primary recommendation:** Create a new `TabStrip` component that renders sessions horizontally, calculates visible tabs based on `stdout.columns`, maintains scroll offset state, and shows arrow indicators when overflow exists.

## Standard Stack

The established libraries/tools for this domain:

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| ink | 6.6.0 | React renderer for terminal | Already in use, provides Box/Text with Flexbox |
| react | 19.2.3 | Component model | Already in use |
| zustand | 5.0.10 | State management | Already handles selectedIndex, sessions |

### Supporting (Already Installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| figures | 6.1.0 | Unicode symbols | Arrow indicators for scroll |

### Not Needed
| Instead of | Don't Install | Reason |
|------------|---------------|--------|
| ink-use-stdout-dimensions | process.stdout | Built-in Node.js provides columns/rows |
| ink-select-input-horizontal | Custom component | Our tab format is specialized, not a standard select |
| ink-enhanced-select-input | Custom component | Same - our requirements are specific |

**Installation:**
```bash
# No new dependencies needed
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   ├── TabStrip.tsx          # NEW: Horizontal tab bar (replaces SessionList role)
│   ├── Tab.tsx               # NEW: Single tab component
│   ├── SessionRow.tsx        # KEEP: Reference for data display
│   ├── ContextMeter.tsx      # MODIFY: Compact inline version
│   └── ...
├── hooks/
│   └── useTerminalWidth.ts   # NEW: Hook for stdout.columns with resize
└── app.tsx                   # MODIFY: Replace SessionList with TabStrip
```

### Pattern 1: Terminal Width Hook
**What:** Custom hook that provides terminal width and reacts to resize
**When to use:** Any component that needs responsive width calculation
**Example:**
```typescript
// Source: Node.js process.stdout + Ink patterns
import { useState, useEffect } from 'react';

export function useTerminalWidth(): number {
  const [width, setWidth] = useState(process.stdout.columns || 80);

  useEffect(() => {
    const handleResize = () => {
      setWidth(process.stdout.columns || 80);
    };

    process.stdout.on('resize', handleResize);
    return () => {
      process.stdout.off('resize', handleResize);
    };
  }, []);

  return width;
}
```

### Pattern 2: Scroll Offset State
**What:** Track which portion of tabs is visible when overflow exists
**When to use:** Tab strip with more tabs than can fit on screen
**Example:**
```typescript
// Source: Verified pattern from windowing/virtualization
interface TabStripState {
  scrollOffset: number;  // Index of first visible tab
}

// In component:
const [scrollOffset, setScrollOffset] = useState(0);

// Ensure selected tab is visible
useEffect(() => {
  if (selectedIndex < scrollOffset) {
    setScrollOffset(selectedIndex);
  } else if (selectedIndex >= scrollOffset + visibleCount) {
    setScrollOffset(selectedIndex - visibleCount + 1);
  }
}, [selectedIndex, scrollOffset, visibleCount]);
```

### Pattern 3: Horizontal Flexbox Layout
**What:** Box with flexDirection="row" for horizontal tabs
**When to use:** The main tab strip container
**Example:**
```typescript
// Source: Ink documentation - Box is "like <div style='display: flex'>"
<Box flexDirection="row" width="100%">
  {showLeftArrow && <Text color="gray">{'<'} </Text>}
  {visibleTabs.map((session, i) => (
    <Tab
      key={session.id}
      session={session}
      isSelected={actualIndex === selectedIndex}
    />
  ))}
  {showRightArrow && <Text color="gray"> {'>'}</Text>}
</Box>
```

### Pattern 4: Blocked Session Pinning
**What:** Always show blocked sessions even when scrolled away
**When to use:** Per CONTEXT.md requirement - blocked sessions must be unmissable
**Example:**
```typescript
// Calculate visible tabs with blocked pinning
const blockedSessions = sessions.filter(s => s.status === 'blocked');
const normalSessions = sessions.filter(s => s.status !== 'blocked');

// Blocked always visible at start, then scrollable normal sessions
const visibleTabs = [
  ...blockedSessions,
  ...normalSessions.slice(scrollOffset, scrollOffset + remainingSlots)
];
```

### Anti-Patterns to Avoid
- **Absolute positioning for tabs:** Ink's Flexbox handles layout; don't fight it
- **Global width calculations:** Use hook to react to resize, not one-time calculation
- **Re-rendering entire app on width change:** Only TabStrip needs width-awareness
- **Pixel-based widths:** Think in character columns, not pixels

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Text truncation | Custom string slicing | `<Text wrap="truncate">` | Handles ellipsis, unicode-safe |
| Terminal width | Manual tty queries | `process.stdout.columns` | Standard Node.js API |
| Resize events | Custom event emitters | `process.stdout.on('resize')` | Built into Node.js |
| Colored backgrounds | ANSI codes | Ink's `backgroundColor` prop | Abstracts terminal differences |
| Inverse colors | Manual color swap | Ink's `inverse` prop | Works cross-terminal |

**Key insight:** Ink abstracts terminal escape codes. Use its props, not raw ANSI sequences.

## Common Pitfalls

### Pitfall 1: Unicode Width Calculation
**What goes wrong:** Emoji and special characters take 2 columns but JavaScript `.length` returns 1
**Why it happens:** Status emoji (hourglass, checkmark) are double-width in terminals
**How to avoid:** Account for emoji width when calculating tab widths
**Warning signs:** Tabs overflow when they shouldn't, or layout looks wrong
```typescript
// Tab format: [index:name status context%]
// Status emoji is 2 columns wide in terminal
const TAB_OVERHEAD = 2 + 1 + 1 + 2 + 1 + 4 + 1; // []:  emoji  space  %]
const EMOJI_WIDTH = 2; // Most status emoji are double-width
```

### Pitfall 2: Off-by-One in Scroll Bounds
**What goes wrong:** Selected tab scrolls off-screen or empty space appears
**Why it happens:** Fencepost errors when calculating visible range
**How to avoid:**
- Test with exactly N tabs fitting exactly
- Test with N+1 tabs (one overflow)
- Test with selection at boundaries
**Warning signs:** Tab momentarily disappears when navigating

### Pitfall 3: Stale Width After Resize
**What goes wrong:** Layout breaks after terminal resize until re-render
**Why it happens:** Width captured once at mount, not updated
**How to avoid:** Use resize listener in hook, trigger state update
**Warning signs:** Resizing terminal breaks layout until navigation

### Pitfall 4: Blocked Pinning Breaks Normal Scroll
**What goes wrong:** Scrolling behaves unexpectedly when blocked sessions exist
**Why it happens:** Blocked sessions take space but aren't in normal scroll range
**How to avoid:** Calculate remaining space after blocked sessions
**Warning signs:** Navigation skips tabs or shows wrong tabs

### Pitfall 5: Context Percentage Overlaps
**What goes wrong:** 100% context value takes 4 chars, others take 2-3
**Why it happens:** Fixed width assumption for variable-width numbers
**How to avoid:** Always allocate 4 chars for percentage (pad with spaces)
**Warning signs:** Tab widths shift as context percentage changes

## Code Examples

Verified patterns from official sources:

### Tab Component
```typescript
// Source: Ink docs + CONTEXT.md decisions
interface TabProps {
  session: Session;
  isSelected: boolean;
  maxNameWidth: number;
}

export function Tab({ session, isSelected, maxNameWidth }: TabProps): React.ReactElement {
  const STATUS_EMOJI: Record<Session['status'], string> = {
    idle: '\u2705',      // Green checkmark
    working: '\u23F3',   // Hourglass
    tool: '\u{1F527}',   // Wrench
    blocked: '\u{1F6D1}', // Stop sign
    ended: '\u274C',     // X mark
  };

  // Get last directory only from path
  const projectName = session.projectName.split('/').pop() || session.projectName;

  // Truncate name if needed (max 20 chars per CONTEXT.md)
  const truncatedName = projectName.length > maxNameWidth
    ? projectName.slice(0, maxNameWidth - 1) + '\u2026'  // ellipsis
    : projectName;

  // Format: [index:name status context%]
  const contextPct = `${Math.round(session.contextUsage ?? 0)}%`.padStart(4);
  const emoji = STATUS_EMOJI[session.status];

  // Color for context percentage
  const contextColor = session.contextUsage < 30 ? 'green'
    : session.contextUsage < 70 ? 'yellow'
    : 'red';

  const isBlocked = session.status === 'blocked';

  // Blocked: red background + bold
  // Selected: inverse colors
  // Normal: default
  if (isBlocked) {
    return (
      <Text backgroundColor="red" color="white" bold>
        [{session.id}:{truncatedName} {emoji} <Text color={contextColor}>{contextPct}</Text>]
      </Text>
    );
  }

  if (isSelected) {
    return (
      <Text inverse>
        [{session.id}:{truncatedName} {emoji} <Text color={contextColor}>{contextPct}</Text>]
      </Text>
    );
  }

  return (
    <Text>
      [{session.id}:{truncatedName} {emoji} <Text color={contextColor}>{contextPct}</Text>]
    </Text>
  );
}
```

### Tab Width Calculation
```typescript
// Source: CONTEXT.md tab format specification
function calculateTabWidth(session: Session, maxNameWidth: number): number {
  const projectName = session.projectName.split('/').pop() || session.projectName;
  const displayName = projectName.length > maxNameWidth
    ? maxNameWidth  // truncated with ellipsis
    : projectName.length;

  // Format: [index:name status context%]
  // [     = 1 char
  // index = 1 char (1-9) or 2 chars (10+)
  // :     = 1 char
  // name  = displayName chars
  // space = 1 char
  // emoji = 2 chars (double-width)
  // space = 1 char
  // pct   = 4 chars max ("100%")
  // ]     = 1 char

  const indexWidth = session.id.length;  // Or calculate from index number
  return 1 + indexWidth + 1 + displayName + 1 + 2 + 1 + 4 + 1;
}
```

### Scroll Arrow Indicators
```typescript
// Source: PatternFly tab overflow pattern + figures package
import figures from 'figures';

// In TabStrip render:
const showLeftArrow = scrollOffset > 0;
const showRightArrow = scrollOffset + visibleCount < sessions.length;

<Box flexDirection="row">
  {showLeftArrow && <Text dimColor>{figures.arrowLeft} </Text>}
  {/* tabs */}
  {showRightArrow && <Text dimColor> {figures.arrowRight}</Text>}
</Box>
```

### Adaptive Line Mode (1-2 lines)
```typescript
// Source: CONTEXT.md - adaptive line count
interface HudStripProps {
  showHelp: boolean;
  error: string | null;
}

function HudStrip({ showHelp, error }: HudStripProps): React.ReactElement {
  // Line 1: Always tabs
  // Line 2: Help text OR error OR nothing (1-line mode)
  const needsSecondLine = showHelp || error;

  return (
    <Box flexDirection="column">
      <TabStrip />
      {showHelp && (
        <Text dimColor>
          {figures.arrowLeft}/{figures.arrowRight}: scroll | Enter: jump | q: quit | ?: help
        </Text>
      )}
      {error && !showHelp && (
        <Text color="red">{error}</Text>
      )}
    </Box>
  );
}
```

## State of the Art

| Old Approach (v1.0) | Current Approach (Phase 8) | Impact |
|---------------------|---------------------------|--------|
| Vertical SessionList | Horizontal TabStrip | 15 lines -> 1-2 lines |
| Full SessionRow | Compact Tab | All info in ~30 chars |
| Fixed layout | Width-responsive | Adapts to terminal size |
| All visible | Scroll with indicators | Handles many sessions |
| Static HUD pane | Dynamic 1-2 lines | Minimal screen usage |

**Deprecated from v1.0:**
- `SessionList` component: Replaced by `TabStrip`
- `SessionRow`: Kept for reference, but not rendered
- `Header`/`Footer`: Absorbed into single-line HUD strip
- 15-line `hudHeight`: Reduced to 2-3 lines

## Open Questions

Things that couldn't be fully resolved:

1. **Exact tmux pane resize command**
   - What we know: `tmux resize-pane -y N` sets height
   - What's unclear: Should resize happen from config or component mount?
   - Recommendation: Resize at startup (configService), set hudHeight to 3 (safe for 2 lines + margin)

2. **Terminal width edge case below minimum**
   - What we know: Very narrow terminals (< 40 cols) will break any tab UI
   - What's unclear: What's the minimum graceful width?
   - Recommendation: Show warning message if width < 60, single-tab mode if < 40

3. **Double-width emoji detection**
   - What we know: Status emoji are double-width, length checks are wrong
   - What's unclear: Best library for accurate string width
   - Recommendation: Hardcode emoji widths (we control which emoji we use), or use `string-width` package if needed

## Sources

### Primary (HIGH confidence)
- Ink GitHub repository README - Box flexDirection, Text wrap prop
- Node.js process.stdout documentation - columns, resize event
- Existing v1.0 codebase - SessionRow patterns, ContextMeter colors, status emoji

### Secondary (MEDIUM confidence)
- [ink-use-stdout-dimensions npm](https://www.npmjs.com/package/ink-use-stdout-dimensions) - Pattern for resize listening
- [PatternFly tab overflow pattern](https://github.com/patternfly/patternfly-elements/issues/1013) - Scroll button UI pattern
- [Creating responsive CLI layouts](https://app.studyraid.com/en/read/11921/379932/creating-responsive-cli-layouts) - useStdoutDimensions patterns

### Tertiary (LOW confidence)
- [ink-enhanced-select-input](https://github.com/gfargo/ink-enhanced-select-input) - Horizontal orientation reference (not using, but validated pattern)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new dependencies, using existing Ink/React
- Architecture: HIGH - Patterns verified in Ink docs and v1.0 codebase
- Pitfalls: HIGH - Based on common terminal UI issues and unicode handling
- Code examples: MEDIUM - Synthesized from docs, need implementation validation

**Research date:** 2026-01-26
**Valid until:** 60 days (stable Ink 6.x, established patterns)
