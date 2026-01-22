# Architecture Research

**Domain:** TUI HUD for monitoring multiple Claude Code instances
**Researched:** 2026-01-22
**Confidence:** HIGH (verified with official sources and established patterns)

## Component Overview

Based on research into Ink applications, TUI dashboard patterns, and process monitoring systems, the architecture should be organized into four primary layers with clear boundaries.

### Layer 1: Data Collection Layer

**Responsibility:** Detect and monitor Claude Code instances across tmux sessions and terminal windows.

| Component | Responsibility | Platform Scope |
|-----------|---------------|----------------|
| ProcessDetector | Find running Claude Code processes via `ps` | All |
| TmuxScanner | Enumerate tmux sessions and their processes | Linux, macOS, WSL2 |
| TerminalScanner | Detect processes in standalone terminals | All |
| StatusParser | Parse Claude output for status (working/idle/blocked) | All |
| ContextWindowParser | Extract token usage for stoplight indicators | All |

**Key decisions:**
- Use Node.js `child_process.spawn` with `ps` command for cross-platform process detection
- Use `node-tmux` or direct tmux CLI for tmux session enumeration
- Polling-based detection (not event-driven) for simplicity and reliability

### Layer 2: State Management Layer

**Responsibility:** Maintain application state, coordinate updates, expose reactive state to UI.

| Component | Responsibility |
|-----------|---------------|
| InstanceStore | Track all detected Claude instances and their states |
| SelectionStore | Track currently selected/focused instance |
| ConfigStore | User preferences (refresh interval, colors, layout) |
| PollingManager | Coordinate data collection intervals |

**Key decisions:**
- Use Zustand for global application state (simpler than Redux, works outside React)
- Zustand stores can be accessed from data collection layer (non-React code)
- React components subscribe to store slices for minimal re-renders
- Polling managed at store level, not component level

### Layer 3: UI Component Layer

**Responsibility:** Render the terminal interface, handle keyboard input, manage focus.

| Component | Responsibility |
|-----------|---------------|
| App | Root component, layout orchestration |
| InstanceList | Scrollable list of Claude instances |
| InstanceRow | Single instance display (status, context window) |
| StatusIndicator | Working/idle/blocked visual indicator |
| ContextMeter | Stoplight-style token usage display |
| Header | Title, help hints, refresh indicator |
| Footer | Status bar, keyboard shortcuts |
| FocusManager | Keyboard navigation between instances |

**Key decisions:**
- Functional components with hooks (Ink standard)
- Use Ink's `useFocus` and `useFocusManager` for navigation
- Use Ink's `useInput` for keyboard handling
- Box-based flexbox layout for responsive terminal sizing

### Layer 4: Infrastructure Layer

**Responsibility:** Platform-specific integrations, external process communication.

| Component | Responsibility |
|-----------|---------------|
| ProcessSpawner | Safe child_process wrappers with timeout |
| TmuxClient | tmux CLI command execution |
| TerminalJumper | Navigate to specific terminal/tmux session |
| Logger | Debug logging (not to stdout, would corrupt TUI) |

**Key decisions:**
- Abstract platform differences behind consistent interfaces
- Terminal jumping uses platform-specific approaches (tmux attach, terminal focus)

## Data Flow

Data flows unidirectionally through the system, following React/Flux patterns.

```
                    Polling Trigger (interval)
                           |
                           v
    +------------------+   +------------------+   +------------------+
    | ProcessDetector  |   | TmuxScanner      |   | TerminalScanner  |
    +------------------+   +------------------+   +------------------+
                \                 |                 /
                 \                |                /
                  v               v               v
                  +-------------------------------+
                  |        Data Aggregator        |
                  |  (combines all instance data) |
                  +-------------------------------+
                                 |
                                 v
                  +-------------------------------+
                  |        Zustand Store          |
                  |   (InstanceStore.setAll())    |
                  +-------------------------------+
                                 |
                                 v
                  +-------------------------------+
                  |     React Components          |
                  |   (subscribe to store slices) |
                  +-------------------------------+
                                 |
                                 v
                  +-------------------------------+
                  |       Ink Renderer            |
                  |   (diff and render to TTY)    |
                  +-------------------------------+
```

### User Input Flow

```
    Keyboard Input
          |
          v
    +------------------+
    | Ink useInput()   |
    +------------------+
          |
          v
    +------------------+
    | Input Handler    |
    | (arrow keys,     |
    |  enter, q, etc.) |
    +------------------+
          |
          +---> Navigation: useFocusManager().focus(id)
          |
          +---> Selection: SelectionStore.select(instanceId)
          |
          +---> Action: TerminalJumper.jumpTo(instanceId)
          |
          +---> Exit: useApp().exit()
```

### State Update Cycle

1. **PollingManager** triggers data collection every N seconds
2. **Scanners** execute platform-specific detection
3. **Aggregator** combines results, dedupes, normalizes
4. **Zustand store** updates with new instance list
5. **React components** re-render (only changed slices)
6. **Ink** diffs virtual terminal and updates TTY

## Ink App Structure

Based on research into Ink patterns and real-world projects, here is the recommended structure.

### Directory Structure

```
src/
  cli.tsx           # Entry point, argument parsing
  app.tsx           # Root component, providers, layout

  components/       # UI components
    Header.tsx
    Footer.tsx
    InstanceList.tsx
    InstanceRow.tsx
    StatusIndicator.tsx
    ContextMeter.tsx

  hooks/            # Custom React hooks
    usePolling.ts       # Polling interval management
    useInstances.ts     # Instance store subscription
    useKeyboardNav.ts   # Navigation shortcuts
    useTerminalSize.ts  # Responsive layout

  stores/           # Zustand stores
    instanceStore.ts    # Claude instance state
    selectionStore.ts   # UI selection state
    configStore.ts      # User preferences

  services/         # Data collection (non-React)
    processDetector.ts
    tmuxScanner.ts
    terminalScanner.ts
    statusParser.ts
    contextParser.ts
    aggregator.ts

  infra/            # Platform abstractions
    processSpawner.ts
    tmuxClient.ts
    terminalJumper.ts

  types/            # TypeScript interfaces
    instance.ts
    status.ts
    config.ts
```

### Entry Point Pattern

```typescript
// cli.tsx
#!/usr/bin/env node
import { render } from 'ink';
import meow from 'meow';
import { App } from './app.js';

const cli = meow(`
  Usage: cc-hud [options]

  Options:
    --interval, -i  Polling interval in ms (default: 2000)
`, {
  flags: {
    interval: { type: 'number', shortFlag: 'i', default: 2000 }
  }
});

render(<App interval={cli.flags.interval} />);
```

### Root Component Pattern

```typescript
// app.tsx
import { Box } from 'ink';
import { Header } from './components/Header.js';
import { Footer } from './components/Footer.js';
import { InstanceList } from './components/InstanceList.js';
import { usePolling } from './hooks/usePolling.js';

export function App({ interval }: { interval: number }) {
  usePolling(interval); // Starts data collection

  return (
    <Box flexDirection="column" height="100%">
      <Header />
      <Box flexGrow={1}>
        <InstanceList />
      </Box>
      <Footer />
    </Box>
  );
}
```

## State Management

### Recommendation: Zustand

**Why Zustand over alternatives:**

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| useState/useContext | Built-in, no deps | Prop drilling, re-render issues | Not for this scale |
| Zustand | Simple, works outside React, selectors | Another dependency | **Recommended** |
| Jotai | Fine-grained atoms, minimal re-renders | Overkill for this use case | Not needed |
| Redux | Powerful, devtools | Too heavy for a TUI | Overkill |

**Key reasons for Zustand:**
1. Data collection layer runs outside React components (in `useEffect` or separate module)
2. Zustand stores can be updated from non-React code
3. Selectors prevent unnecessary re-renders when only part of state changes
4. Minimal boilerplate

### Store Design

```typescript
// stores/instanceStore.ts
import { create } from 'zustand';
import type { ClaudeInstance } from '../types/instance.js';

interface InstanceState {
  instances: ClaudeInstance[];
  lastUpdated: number | null;
  isPolling: boolean;

  setInstances: (instances: ClaudeInstance[]) => void;
  setPolling: (polling: boolean) => void;
}

export const useInstanceStore = create<InstanceState>((set) => ({
  instances: [],
  lastUpdated: null,
  isPolling: false,

  setInstances: (instances) => set({
    instances,
    lastUpdated: Date.now()
  }),
  setPolling: (isPolling) => set({ isPolling }),
}));

// Can be called from non-React code:
// useInstanceStore.getState().setInstances(newInstances);
```

### Polling Hook Pattern

```typescript
// hooks/usePolling.ts
import { useEffect, useRef } from 'react';
import { useInstanceStore } from '../stores/instanceStore.js';
import { collectInstances } from '../services/aggregator.js';

export function usePolling(intervalMs: number) {
  const setInstances = useInstanceStore((s) => s.setInstances);
  const setPolling = useInstanceStore((s) => s.setPolling);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const poll = async () => {
      setPolling(true);
      const instances = await collectInstances();
      setInstances(instances);
      setPolling(false);
    };

    // Initial poll
    poll();

    // Set up interval
    intervalRef.current = setInterval(poll, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [intervalMs, setInstances, setPolling]);
}
```

## Focus and Navigation

Ink provides built-in focus management that maps well to this use case.

### Navigation Pattern

```typescript
// components/InstanceList.tsx
import { Box, useFocusManager, useInput } from 'ink';
import { useInstanceStore } from '../stores/instanceStore.js';
import { InstanceRow } from './InstanceRow.js';

export function InstanceList() {
  const instances = useInstanceStore((s) => s.instances);
  const { focusNext, focusPrevious } = useFocusManager();

  useInput((input, key) => {
    if (key.downArrow || input === 'j') {
      focusNext();
    }
    if (key.upArrow || input === 'k') {
      focusPrevious();
    }
  });

  return (
    <Box flexDirection="column">
      {instances.map((instance) => (
        <InstanceRow key={instance.id} instance={instance} />
      ))}
    </Box>
  );
}
```

### Row Focus Pattern

```typescript
// components/InstanceRow.tsx
import { Box, Text, useFocus, useInput, useApp } from 'ink';
import type { ClaudeInstance } from '../types/instance.js';
import { jumpToInstance } from '../infra/terminalJumper.js';

export function InstanceRow({ instance }: { instance: ClaudeInstance }) {
  const { isFocused } = useFocus({ id: instance.id });
  const { exit } = useApp();

  useInput((input, key) => {
    if (!isFocused) return;

    if (key.return) {
      // Jump to this Claude instance
      exit(); // Exit HUD before jumping
      jumpToInstance(instance);
    }
  }, { isActive: isFocused });

  return (
    <Box>
      <Text inverse={isFocused}>
        {instance.name} - {instance.status}
      </Text>
    </Box>
  );
}
```

## Suggested Build Order

Build order is driven by dependencies and testability. Each phase produces a working (if minimal) artifact.

### Phase 1: Foundation (Data Collection)

**Build:**
1. `types/` - Define TypeScript interfaces first
2. `infra/processSpawner.ts` - Safe child_process wrapper
3. `services/processDetector.ts` - Basic process detection via `ps`

**Why first:**
- No UI dependencies
- Testable in isolation
- Validates cross-platform approach early
- Most likely to surface platform-specific issues

**Deliverable:** Can run `ts-node src/services/processDetector.ts` and see Claude processes.

### Phase 2: Tmux Integration

**Build:**
1. `infra/tmuxClient.ts` - tmux CLI wrapper
2. `services/tmuxScanner.ts` - Enumerate tmux sessions
3. Extend `processDetector.ts` to correlate processes with tmux sessions

**Why second:**
- Builds on Phase 1 foundation
- tmux is primary expected use case
- Adds session context to raw process data

**Deliverable:** Can enumerate Claude instances with tmux session names.

### Phase 3: Minimal UI Shell

**Build:**
1. `cli.tsx` - Entry point with argument parsing
2. `app.tsx` - Root component with basic layout
3. `components/Header.tsx` - Simple header
4. `components/Footer.tsx` - Help text

**Why third:**
- Establishes Ink project structure
- Validates rendering works
- Provides visual test harness for state management

**Deliverable:** Can run `cc-hud` and see a basic TUI frame.

### Phase 4: State Management

**Build:**
1. `stores/instanceStore.ts` - Zustand store for instances
2. `hooks/usePolling.ts` - Polling hook
3. `services/aggregator.ts` - Combine data sources

**Why fourth:**
- Connects data collection to UI
- Proves reactive update cycle works
- Enables end-to-end data flow testing

**Deliverable:** TUI shows updating list of detected processes.

### Phase 5: Instance Display

**Build:**
1. `components/InstanceList.tsx` - List container
2. `components/InstanceRow.tsx` - Single instance display
3. `components/StatusIndicator.tsx` - Working/idle/blocked
4. `services/statusParser.ts` - Parse Claude output for status

**Why fifth:**
- All infrastructure in place
- Can focus purely on UI/UX
- Status parsing may require iteration

**Deliverable:** TUI shows Claude instances with status.

### Phase 6: Context Window Meter

**Build:**
1. `components/ContextMeter.tsx` - Stoplight display
2. `services/contextParser.ts` - Extract token usage

**Why sixth:**
- Depends on status parsing patterns from Phase 5
- May require different parsing approach
- Self-contained feature

**Deliverable:** Context window usage with stoplight colors.

### Phase 7: Navigation

**Build:**
1. `hooks/useKeyboardNav.ts` - Navigation shortcuts
2. Update `InstanceList.tsx` with focus management
3. Update `InstanceRow.tsx` with `useFocus`
4. `stores/selectionStore.ts` - Track selection

**Why seventh:**
- UI must be stable first
- Focus management is a refinement
- Keyboard shortcuts are polish

**Deliverable:** Can navigate instances with arrow keys and j/k.

### Phase 8: Terminal Jumping

**Build:**
1. `infra/terminalJumper.ts` - Platform-specific jump logic
2. Wire Enter key to jump action

**Why last:**
- Requires all other pieces working
- Most platform-specific code
- Requires exiting HUD gracefully

**Deliverable:** Press Enter to jump to selected Claude instance.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Polling in Components

**What:** Putting `setInterval` directly in component `useEffect`

**Why bad:**
- Multiple components might poll independently
- Hard to coordinate pause/resume
- Cleanup issues on unmount

**Instead:** Single polling hook at app root, or store-level polling with Zustand middleware.

### Anti-Pattern 2: Synchronous Process Spawning

**What:** Using `execSync` or blocking process operations

**Why bad:**
- Blocks event loop
- TUI becomes unresponsive
- Can't handle timeouts gracefully

**Instead:** Always use async `spawn` with timeout handling.

### Anti-Pattern 3: Global Keyboard Handlers

**What:** Using raw `process.stdin` listeners outside Ink's `useInput`

**Why bad:**
- Conflicts with Ink's input handling
- Can cause focus issues
- Hard to clean up

**Instead:** Always use Ink's `useInput` hook with `isActive` for conditional handling.

### Anti-Pattern 4: Direct Store Updates in Render

**What:** Calling `store.setState()` during component render

**Why bad:**
- Causes infinite render loops
- React strict mode will catch this
- Hard to debug

**Instead:** Update stores in `useEffect`, event handlers, or external async code.

## Sources

- [Ink GitHub Repository](https://github.com/vadimdemedes/ink) - Official documentation and examples
- [OpenCode TUI Architecture](https://deepwiki.com/sst/opencode/6.2-tui-components) - Production TUI architecture patterns
- [Ratatui Elm Architecture](https://ratatui.rs/concepts/application-patterns/the-elm-architecture/) - Model-View-Update patterns for TUI
- [Node.js Child Process Documentation](https://nodejs.org/api/child_process.html) - Process spawning reference
- [Zustand vs Jotai Comparison](https://jotai.org/docs/basics/comparison) - State management decision
- [React Clean Architecture](https://alexkondov.com/full-stack-tao-clean-architecture-react/) - Layer separation patterns
- [Dan Abramov's useInterval](https://usehooks.com/useinterval) - Polling hook pattern
- [node-tmux npm](https://www.npmjs.com/package/node-tmux) - tmux Node.js integration
