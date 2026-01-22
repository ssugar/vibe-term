# Phase 1: Foundation - Research

**Researched:** 2026-01-22
**Domain:** TypeScript + Ink (React TUI) + Zustand state management
**Confidence:** HIGH

## Summary

This research establishes the standard stack for building a cross-platform terminal UI application using Ink (React for CLIs) and Zustand for state management. The stack is well-established: Ink is used by Claude Code itself, Gemini CLI, GitHub Copilot CLI, and Cloudflare Wrangler. Zustand is the most popular lightweight React state manager with excellent TypeScript support.

The key finding is that **Ink 6.6.0 now requires React 19+ and Node.js 20+**, which is the latest and recommended configuration. This is a recent change - previous versions (5.x) supported React 18. All libraries in the recommended stack are ESM-first, which aligns with 2026 JavaScript best practices.

**Primary recommendation:** Use Ink 6.6.0 with React 19, Zustand 5.x, Node.js 20+, and TypeScript 5.x with strict mode. Use meow for CLI argument parsing, which integrates naturally with Ink's create-ink-app scaffold.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| ink | 6.6.0 | React renderer for terminal | Used by Claude Code, Gemini CLI, Wrangler; flexbox layouts, component model |
| react | 19.2.3 | Component framework | Required peer dependency for Ink 6.6.0 |
| zustand | 5.0.10 | State management | <1KB, hooks-based, excellent TypeScript, no boilerplate |
| typescript | 5.x | Type safety | Required for strict mode, excellent IDE support |
| meow | 14.0.0 | CLI argument parsing | Default in create-ink-app, declarative flags, strong TypeScript inference |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @inkjs/ui | 2.0.0 | Pre-built components | Spinner, TextInput, Select, Badge, ProgressBar |
| figures | 6.1.0 | Cross-platform Unicode symbols | Checkmarks, arrows, spinners with Windows fallbacks |
| cli-boxes | 4.0.1 | Box drawing characters | If custom border styles needed beyond Ink's built-in |
| chalk | (via Ink) | Terminal colors | Built into Ink's Text component |

### Build/Runtime
| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| tsx | latest | TypeScript execution | Run .ts files directly, ESM support, fast (esbuild) |
| tsup | latest | Build/bundle | Zero-config TS bundling, ESM+CJS output if needed |
| Node.js | 20+ | Runtime | Required by Ink 6.6.0 |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Zustand | Jotai | Atomic vs store model; Zustand simpler for this use case |
| meow | commander | Commander more powerful but more complex; meow matches Ink ecosystem |
| tsx | ts-node | tsx faster, better ESM support |
| tsup | tsdown | tsdown newer/faster but less proven |

**Installation:**
```bash
# Using create-ink-app for scaffold
npx create-ink-app --typescript cc-tui-hud

# Or manual setup
npm install ink react zustand meow @inkjs/ui figures
npm install -D typescript @types/react tsx tsup
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── cli.tsx              # Entry point, meow argument parsing
├── app.tsx              # Main App component
├── components/          # UI components
│   ├── Header.tsx       # Title + status summary
│   ├── Footer.tsx       # Key hints + refresh indicator
│   ├── SessionList.tsx  # List area (empty in Phase 1)
│   └── EmptyState.tsx   # ASCII art + message
├── stores/              # Zustand stores
│   ├── appStore.ts      # Global app state
│   └── types.ts         # Store type definitions
├── hooks/               # Custom hooks
│   └── useInterval.ts   # Polling interval hook
└── utils/               # Utilities
    └── time.ts          # Relative time formatting
```

### Pattern 1: Zustand Store with TypeScript
**What:** Type-safe store definition with actions
**When to use:** All application state
**Example:**
```typescript
// Source: https://github.com/pmndrs/zustand - verified via npm info
import { create } from 'zustand';

interface AppState {
  isConfirmingExit: boolean;
  lastRefresh: Date | null;
  error: string | null;

  // Actions
  setConfirmingExit: (value: boolean) => void;
  setLastRefresh: (date: Date) => void;
  setError: (error: string | null) => void;
}

export const useAppStore = create<AppState>()((set) => ({
  isConfirmingExit: false,
  lastRefresh: null,
  error: null,

  setConfirmingExit: (value) => set({ isConfirmingExit: value }),
  setLastRefresh: (date) => set({ lastRefresh: date }),
  setError: (error) => set({ error }),
}));
```

### Pattern 2: Selective State Subscription
**What:** Subscribe only to needed state slices
**When to use:** Always - prevents unnecessary re-renders
**Example:**
```typescript
// Source: Zustand docs - verified performance pattern

// Good - selective subscription
const isConfirmingExit = useAppStore((state) => state.isConfirmingExit);

// Avoid - subscribes to entire store
const { isConfirmingExit, error } = useAppStore();

// For multiple values, use useShallow
import { useShallow } from 'zustand/react/shallow';
const { error, lastRefresh } = useAppStore(
  useShallow((state) => ({ error: state.error, lastRefresh: state.lastRefresh }))
);
```

### Pattern 3: Ink Box with Borders
**What:** Create bordered containers using Ink's built-in borderStyle
**When to use:** Header, footer, main content areas
**Example:**
```typescript
// Source: https://github.com/vadimdemedes/ink - verified
import { Box, Text } from 'ink';

// Available border styles: single, double, round, bold, singleDouble, doubleSingle, classic
<Box borderStyle="round" borderColor="blue" padding={1}>
  <Text>Content inside rounded border</Text>
</Box>

// Custom border characters
<Box borderStyle={{
  topLeft: '╭', top: '─', topRight: '╮',
  left: '│', right: '│',
  bottomLeft: '╰', bottom: '─', bottomRight: '╯'
}}>
  <Text>Custom rounded corners</Text>
</Box>
```

### Pattern 4: useInput for Keyboard Handling
**What:** Handle keyboard input with vim-style navigation
**When to use:** All keyboard interaction
**Example:**
```typescript
// Source: https://github.com/vadimdemedes/ink - verified
import { useInput, useApp } from 'ink';

const MyComponent = () => {
  const { exit } = useApp();

  useInput((input, key) => {
    // vim-style navigation
    if (input === 'j' || key.downArrow) {
      // Move down
    }
    if (input === 'k' || key.upArrow) {
      // Move up
    }
    if (input === 'q') {
      // Show quit confirmation (don't exit directly)
    }
    if (key.return) {
      // Select/confirm
    }
    if (input === '?') {
      // Show help
    }
  });

  return /* ... */;
};
```

### Pattern 5: Graceful Shutdown
**What:** Clean exit handling with unmount and signal handlers
**When to use:** Application entry point
**Example:**
```typescript
// Source: https://blog.openreplay.com/building-terminal-interfaces-nodejs/
import { render } from 'ink';
import App from './app.js';

const { unmount, waitUntilExit } = render(<App />);

const shutdown = () => {
  unmount();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

await waitUntilExit();
```

### Pattern 6: useInterval for Polling
**What:** Declarative interval that handles cleanup and stale closures
**When to use:** Refresh/polling functionality
**Example:**
```typescript
// Source: https://overreacted.io/making-setinterval-declarative-with-react-hooks/
import { useEffect, useRef } from 'react';

function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) return;

    const id = setInterval(() => savedCallback.current(), delay);
    return () => clearInterval(id);
  }, [delay]);
}

// Usage: pass null to pause
useInterval(() => {
  refreshData();
}, isActive ? 2000 : null);
```

### Anti-Patterns to Avoid
- **Subscribing to entire Zustand store:** Causes unnecessary re-renders
- **Using setInterval directly:** Stale closure bugs, missing cleanup
- **Forgetting unmount on exit:** Terminal state not restored properly
- **console.log in Ink apps:** Interferes with rendering (Ink intercepts it, but be aware)
- **Mixing TUI libraries:** Don't combine Ink with blessed/neo-blessed

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Box borders | String concatenation of Unicode | Ink's `borderStyle` prop | Handles corners, colors, responsive sizing |
| Cross-platform symbols | Hardcoded Unicode | `figures` package | Windows fallbacks, tested across terminals |
| CLI argument parsing | Manual process.argv | `meow` | Type inference, help generation, validation |
| Polling intervals | Raw setInterval | `useInterval` hook | Handles cleanup, stale closures, pause |
| Relative time | Custom date math | date-fns `formatDistanceToNow` | Localization, edge cases |
| State management | useState/useContext | Zustand | No provider needed, selective subscriptions |
| Terminal colors | ANSI escape codes | Ink's `color` prop / chalk | Automatic color support detection |

**Key insight:** The Ink ecosystem (from sindresorhus and vadimdemedes) provides battle-tested solutions for terminal UI problems. Using these libraries avoids edge cases around terminal compatibility, Unicode support, and cross-platform differences.

## Common Pitfalls

### Pitfall 1: React 19 Version Mismatch
**What goes wrong:** Installing React 18 with Ink 6.6.0 causes peer dependency errors
**Why it happens:** Ink 6.6.0 explicitly requires React 19.0.0+
**How to avoid:** Always install React 19: `npm install react@19`
**Warning signs:** npm WARN about peer dependencies during install

### Pitfall 2: Node.js Version Too Old
**What goes wrong:** Ink fails to run or has mysterious errors
**Why it happens:** Ink 6.6.0 requires Node.js 20+
**How to avoid:** Verify with `node --version`, use nvm if needed
**Warning signs:** Syntax errors, missing APIs

### Pitfall 3: Ctrl+C Handling Confusion
**What goes wrong:** App doesn't exit, or exits without cleanup
**Why it happens:** Ink's `exitOnCtrlC` option and raw mode interaction
**How to avoid:** Use render's `exitOnCtrlC: false` and handle SIGINT manually for two-stage exit
**Warning signs:** Terminal left in bad state after exit

### Pitfall 4: Stale State in Intervals
**What goes wrong:** Polling callback sees old state values
**Why it happens:** Closure captures initial state reference
**How to avoid:** Use `useInterval` hook with ref pattern
**Warning signs:** Displayed data doesn't match actual state

### Pitfall 5: Flexbox Assumption Mismatch
**What goes wrong:** Layout doesn't behave like CSS flexbox
**Why it happens:** Every Ink element is `display: flex` by default
**How to avoid:** Remember `<Box>` is a flex container, use `flexDirection`, `justifyContent`, `alignItems`
**Warning signs:** Elements not positioned as expected

### Pitfall 6: Text Outside Text Component
**What goes wrong:** Runtime error about text content
**Why it happens:** All text must be wrapped in `<Text>` component
**How to avoid:** Never put raw strings directly in `<Box>`
**Warning signs:** "Text string must be rendered inside Text component" error

### Pitfall 7: ESM Import Issues
**What goes wrong:** "Cannot use import statement" or module not found
**Why it happens:** Mixing CJS and ESM, or incorrect package.json type
**How to avoid:** Use `"type": "module"` in package.json, use .js extensions in imports
**Warning signs:** Module resolution errors at runtime

## Code Examples

Verified patterns from official sources:

### Entry Point with meow
```typescript
// Source: create-ink-app scaffold, meow documentation
#!/usr/bin/env node
import meow from 'meow';
import { render } from 'ink';
import App from './app.js';

const cli = meow(`
  Usage
    $ cc-tui-hud

  Options
    --refresh, -r  Refresh interval in seconds (default: 2)

  Examples
    $ cc-tui-hud
    $ cc-tui-hud --refresh 5
`, {
  importMeta: import.meta,
  flags: {
    refresh: {
      type: 'number',
      shortFlag: 'r',
      default: 2,
    },
  },
});

const { unmount, waitUntilExit } = render(
  <App refreshInterval={cli.flags.refresh * 1000} />,
  { exitOnCtrlC: false }
);

// Graceful shutdown
process.on('SIGINT', () => unmount());
process.on('SIGTERM', () => unmount());

await waitUntilExit();
```

### Main App Component
```typescript
// Source: Ink documentation patterns
import React, { useState } from 'react';
import { Box, Text, useInput, useApp } from 'ink';

interface AppProps {
  refreshInterval: number;
}

export default function App({ refreshInterval }: AppProps) {
  const { exit } = useApp();
  const [isConfirmingExit, setIsConfirmingExit] = useState(false);

  useInput((input, key) => {
    if (isConfirmingExit) {
      if (input === 'y' || input === 'Y') {
        exit();
      } else {
        setIsConfirmingExit(false);
      }
      return;
    }

    if (input === 'q') {
      setIsConfirmingExit(true);
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Header />
      <SessionList />
      <Footer refreshInterval={refreshInterval} />
      {isConfirmingExit && <ExitConfirmation />}
    </Box>
  );
}
```

### Header Component with Border
```typescript
// Source: Ink Box borderStyle documentation
import React from 'react';
import { Box, Text } from 'ink';

export function Header() {
  return (
    <Box
      borderStyle="round"
      borderColor="blue"
      paddingX={1}
    >
      <Text bold>Claude Code HUD</Text>
      <Text> - </Text>
      <Text color="gray">No sessions</Text>
    </Box>
  );
}
```

### Footer with Key Hints
```typescript
// Source: Ink patterns, figures for symbols
import React from 'react';
import { Box, Text } from 'ink';
import figures from 'figures';

interface FooterProps {
  lastRefresh: Date | null;
}

export function Footer({ lastRefresh }: FooterProps) {
  const timeAgo = lastRefresh
    ? formatRelativeTime(lastRefresh)
    : 'never';

  return (
    <Box
      borderStyle="round"
      borderColor="gray"
      paddingX={1}
      justifyContent="space-between"
    >
      <Text>
        <Text dimColor>j/k:</Text> navigate {figures.bullet}
        <Text dimColor>enter:</Text> select {figures.bullet}
        <Text dimColor>q:</Text> quit {figures.bullet}
        <Text dimColor>?:</Text> help
      </Text>
      <Text dimColor>Updated {timeAgo}</Text>
    </Box>
  );
}
```

### Exit Confirmation Overlay
```typescript
// Source: Custom pattern based on Ink components
import React from 'react';
import { Box, Text } from 'ink';

export function ExitConfirmation() {
  return (
    <Box
      position="absolute"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
    >
      <Box
        borderStyle="round"
        borderColor="yellow"
        padding={1}
      >
        <Text>Quit HUD? </Text>
        <Text bold color="green">y</Text>
        <Text>/</Text>
        <Text bold color="red">n</Text>
      </Box>
    </Box>
  );
}
```

### Empty State with ASCII Art
```typescript
// Source: Custom pattern
import React from 'react';
import { Box, Text } from 'ink';

export function EmptyState() {
  return (
    <Box
      flexDirection="column"
      alignItems="center"
      padding={2}
    >
      <Text>
{`
    ╭──────────────────╮
    │  No Claude Code  │
    │    sessions      │
    ╰──────────────────╯
`}
      </Text>
      <Text dimColor>
        Start a Claude session to see it here
      </Text>
    </Box>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Ink 5.x + React 18 | Ink 6.6.0 + React 19 | Dec 2025 | Must use React 19 |
| Node.js 18 minimum | Node.js 20 minimum | Ink 6.x | Use latest LTS |
| CommonJS | ESM-first | 2024-2025 | `"type": "module"` in package.json |
| ts-node | tsx | 2024 | Better ESM support, faster |
| Redux/MobX | Zustand/Jotai | 2023+ | Simpler, smaller, hooks-native |
| ink-box package | Ink built-in borderStyle | Ink 3+ | No separate package needed |

**Deprecated/outdated:**
- `ink-box`: Deprecated, use Ink's built-in `Box` with `borderStyle`
- `ink@4.x`: Works but older, use 6.x for latest features
- `React@18` with `ink@6.x`: Incompatible, causes peer dependency errors
- `--loader` flag in Node.js: Replaced by `--import` in Node 20+

## Open Questions

Things that couldn't be fully resolved:

1. **Optimal redraw strategy**
   - What we know: Ink re-renders on state change, has incrementalRendering option
   - What's unclear: Best approach for 2-second polling (redraw always vs. diff)
   - Recommendation: Start with default (redraw on change), optimize if needed

2. **Error banner dismiss mechanism**
   - What we know: User wants persistent error banner
   - What's unclear: Best UX for dismissal (key press? timeout? both?)
   - Recommendation: Use 'x' key to dismiss, keep until dismissed

3. **WSL2-specific edge cases**
   - What we know: Node.js runs same on WSL2 as Linux
   - What's unclear: Any terminal rendering differences
   - Recommendation: Test on WSL2 early, document any issues

## Sources

### Primary (HIGH confidence)
- npm info `ink@6.6.0` - Version, peerDependencies, engines verified
- npm info `zustand@5.0.10` - Version, peerDependencies verified
- npm info `meow@14.0.0`, `figures@6.1.0`, `cli-boxes@4.0.1` - Versions verified
- [GitHub - vadimdemedes/ink](https://github.com/vadimdemedes/ink) - README, examples, release notes
- [GitHub - pmndrs/zustand](https://github.com/pmndrs/zustand) - TypeScript patterns

### Secondary (MEDIUM confidence)
- [Ink v6.5.0 release notes](https://github.com/vadimdemedes/ink/releases/tag/v6.5.0) - Feature additions
- [Zustand migration guide](https://zustand.docs.pmnd.rs/migrations/migrating-to-v5) - v5 changes
- [Building Terminal Interfaces with Node.js](https://blog.openreplay.com/building-terminal-interfaces-nodejs/) - Patterns
- [Making setInterval Declarative](https://overreacted.io/making-setinterval-declarative-with-react-hooks/) - useInterval pattern

### Tertiary (LOW confidence)
- WebSearch results on cross-platform patterns - General ecosystem information
- WebSearch results on Ink pitfalls - Community experiences

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Verified with npm info, official docs
- Architecture: HIGH - Based on official examples and established patterns
- Pitfalls: MEDIUM - Mix of official docs and community reports

**Research date:** 2026-01-22
**Valid until:** 2026-02-22 (30 days - stable ecosystem)
